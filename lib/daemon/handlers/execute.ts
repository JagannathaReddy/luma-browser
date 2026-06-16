import { runScript } from '../../executor.js';
import {
  resolveCaptureOptions,
  StepCapturePipeline,
  writeStepArtifacts,
} from '../../session/capture.js';

export async function handleExecute(deps, request, output) {
  const { manager, sessions, locks, logger, metrics } = deps;
  metrics.executions.total += 1;
  let stepContext;
  let capturePipeline;

  if (request.sessionId && request.step) {
    stepContext = await sessions.beginStep(request.sessionId, request.step);
    logger.debug('session step started', {
      sessionId: request.sessionId,
      step: request.step,
      stepIndex: stepContext.stepIndex,
    });
  }

  const sessionMeta = request.sessionId ? await sessions.getSessionMeta(request.sessionId) : null;
  if (sessionMeta?.capture && request.capture) {
    logger.debug('capture override ignored — pinned at session-start', {
      sessionId: request.sessionId,
      step: request.step,
    });
  }
  const capture = sessionMeta?.capture
    ? resolveCaptureOptions(sessionMeta.capture, undefined)
    : resolveCaptureOptions(undefined, request.capture ?? stepContext?.capture);

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  await locks.browser(request.browser, async () => {
    const recordVideoDir =
      capture.video && request.sessionId ? sessions.videoDir(request.sessionId) : null;

    if (request.connect) {
      await manager.connectBrowser(request.browser, request.connect);
    } else {
      await manager.ensureBrowser(request.browser, {
        headless: request.headless,
        ignoreHTTPSErrors: request.ignoreHTTPSErrors,
        recordVideoDir,
        sessionScoped: Boolean(request.sessionId),
      });
    }

    let success = true;
    let errorMessage;
    let stepArtifacts = {};

    const context = manager.getContext(request.browser);
    const primaryPage = manager.getPrimaryPage(request.browser);

    if (stepContext && context) {
      capturePipeline = new StepCapturePipeline({
        context,
        stepDir: stepContext.stepDir,
        capture,
        primaryPage,
        videoDir: recordVideoDir,
      });
      await capturePipeline.start();
    }

    try {
      const browser = manager.getBrowserApi(request.browser);
      await runScript({
        script: request.script,
        browser,
        timeoutMs: request.timeoutMs,
        onStdout: (data) => {
          stdoutChunks.push(data);
          output.writeStdout(data);
        },
        onStderr: (data) => {
          stderrChunks.push(data);
          output.writeStderr(data);
        },
      });

      await output.drain();
      await manager.cleanupAfterScript(request.browser);
      await output.writeComplete();
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      metrics.executions.failed += 1;
      if (/deadline exceeded|interrupted/i.test(errorMessage)) {
        metrics.executions.timeouts += 1;
      }
      await output.drain().catch(() => undefined);
      await manager.cleanupAfterScript(request.browser).catch(() => undefined);
      await output.writeError(errorMessage);
    } finally {
      if (capturePipeline) {
        try {
          capturePipeline.setPrimaryPage(manager.getPrimaryPage(request.browser));
          if (success) {
            stepArtifacts = await capturePipeline.stop();
          } else {
            await capturePipeline.abort();
          }
        } catch (captureError) {
          metrics.capturePipelines.failed += 1;
          logger.warn('capture pipeline failed', {
            sessionId: request.sessionId,
            step: request.step,
            error: captureError instanceof Error ? captureError.message : String(captureError),
          });
        }
      }

      if (stepContext) {
        const stepMeta = await writeStepArtifacts(stepContext.stepDir, {
          script: request.script,
          stdout: stdoutChunks.join(''),
          stderr: stderrChunks.join(''),
          artifacts: stepArtifacts,
          stepMeta: {
            name: request.step,
            sessionId: request.sessionId,
            stepIndex: stepContext.stepIndex,
            success,
            error: errorMessage ?? null,
          },
        });

        await sessions.finishStep(request.sessionId, stepContext.stepIndex, {
          success,
          error: errorMessage,
          artifacts: stepMeta.artifacts,
        });
      }
    }
  });
}
