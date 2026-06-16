import { helpForMode } from '@jagannathamv/cli-kit';
import { isatty } from 'tty';
import { createRequestId, isDaemonRunning, sendRequest } from './daemon-client.js';
import { waitForDaemonStop } from './daemon-lifecycle.js';
import { ensureDaemon } from './daemon-spawn.js';
import {
  buildExecutePayload,
  filterFlags,
  parseOptions,
  resolveRenderReport,
} from './cli/parse-options.js';
import { readScriptSource, resolveScriptPath } from './executor.js';
import { installBrowsersSync } from './install.js';
import { logger, setVerbose } from './logger.js';
import { PROTOCOL_VERSION } from './protocol.js';
import type { CLIMainOptions } from './types.js';
import { getPackageVersion } from './version.js';

function checkDaemonCompatibility(status) {
  if (typeof status?.protocolVersion === 'number' && status.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error(
      `Daemon protocol version ${status.protocolVersion} is incompatible with CLI ${PROTOCOL_VERSION}. Run "luma-browser stop" and retry.`,
    );
  }

  const cliVersion = getPackageVersion();
  if (status?.version && status.version !== cliVersion) {
    logger.warn('daemon version differs from CLI; restart with luma-browser stop', {
      cliVersion,
      daemonVersion: status.version,
    });
  }
}

function wrongBinaryError(mode, command) {
  if (mode === 'orchestrator') {
    throw new Error(
      `"${command}" is an engine command — use luma-browser instead (e.g. luma-browser run script.js).`,
    );
  }
  throw new Error(
    `"${command}" is an orchestrator command — use luma instead (e.g. luma ${command}).`,
  );
}

export async function main(argv = process.argv.slice(2), { mode = 'engine' }: CLIMainOptions = {}) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(helpForMode(mode).trimEnd());
    return;
  }

  const globalOptions = parseOptions(argv);
  if (globalOptions.verbose) {
    setVerbose(true);
  }

  const command = argv[0];

  // The engine binary (`luma-browser`) accepts all commands for backward
  // compatibility. The orchestrator binary (`luma`) refuses script paths and
  // the explicit `run` command — those belong to the engine. Other commands
  // (session, viewer, status, browsers, …) work from either binary.
  if (mode === 'orchestrator' && (argv[0] === 'run' || command?.endsWith('.js'))) {
    wrongBinaryError(mode, command ?? 'run');
  }

  if (command === 'install') {
    installBrowsersSync();
    return;
  }

  if (command === 'viewer') {
    const options = parseOptions(argv.slice(1));
    const { startViewer } = await import('./viewer/start-viewer.js');
    await startViewer({
      sessionId: options.sessionId ?? globalOptions.sessionId,
      port: options.port ?? 4173,
      open: options.openViewer,
    });
    return;
  }

  if (command === 'stop') {
    if (!(await isDaemonRunning())) {
      console.log(JSON.stringify({ stopping: false, reason: 'daemon not running' }, null, 2));
      return;
    }
    const startedAt = Date.now();
    await sendRequest({ id: createRequestId(), type: 'stop' });
    await waitForDaemonStop(isDaemonRunning);
    console.log(JSON.stringify({ stopped: true, durationMs: Date.now() - startedAt }, null, 2));
    return;
  }

  await ensureDaemon();

  if (command === 'status') {
    const data = await sendRequest({ id: createRequestId(), type: 'status' });
    checkDaemonCompatibility(data);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === 'browsers') {
    const data = await sendRequest({ id: createRequestId(), type: 'browsers' });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === 'browser-stop') {
    const browser = argv[1];
    if (!browser) {
      throw new Error(
        `Usage: ${mode === 'orchestrator' ? 'luma' : 'luma-browser'} browser-stop <name>`,
      );
    }

    const data = await sendRequest({
      id: createRequestId(),
      type: 'browser-stop',
      browser,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (command === 'session') {
    await handleSessionCommand(argv.slice(1), globalOptions);
    return;
  }

  if (mode === 'orchestrator') {
    console.log(helpForMode('orchestrator').trimEnd());
    process.exitCode = 1;
    return;
  }

  await runScriptCommand(argv, globalOptions);
}

async function handleSessionCommand(argv, globalOptions) {
  const subcommand = argv[0];

  if (subcommand === 'start') {
    const options = parseOptions(argv.slice(1));
    const data = await sendRequest({
      id: createRequestId(),
      type: 'session-start',
      browser: options.browser,
      headless: options.headless,
      ignoreHTTPSErrors: options.ignoreHTTPSErrors,
      connect: options.connect,
      ...(options.name ? { name: options.name } : {}),
      ...(options.capture ? { capture: options.capture } : {}),
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (subcommand === 'list') {
    const data = await sendRequest({ id: createRequestId(), type: 'session-list' });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (subcommand === 'end') {
    const sessionId = argv[1] ?? globalOptions.sessionId;
    if (!sessionId) {
      throw new Error('Usage: luma session end <sessionId>');
    }

    const options = parseOptions(argv.slice(2));
    const data = await sendRequest({
      id: createRequestId(),
      type: 'session-end',
      sessionId,
      renderReport: resolveRenderReport({ ...globalOptions, ...options }),
      stopDaemon: options.stopDaemon || globalOptions.stopDaemon,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (subcommand === 'abort') {
    const sessionId = argv[1] ?? globalOptions.sessionId;
    if (!sessionId) {
      throw new Error('Usage: luma session abort <sessionId>');
    }

    const options = parseOptions(argv.slice(2));
    const data = await sendRequest({
      id: createRequestId(),
      type: 'session-abort',
      sessionId,
      renderReport: options.renderReport || globalOptions.renderReport,
      stopDaemon: options.stopDaemon || globalOptions.stopDaemon,
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error(`Unknown session subcommand "${subcommand}". Use start, list, end, or abort.`);
}

async function runScriptCommand(argv, globalOptions) {
  const options = parseOptions(argv);
  const positional = filterFlags(argv);
  const scriptPath = resolveScriptPath(positional[0] === 'run' ? positional[1] : positional[0]);
  const useStdin = !scriptPath && !isatty(0);

  if (!scriptPath && !useStdin) {
    console.log(helpForMode('engine').trimEnd());
    process.exitCode = 1;
    return;
  }

  const source = readScriptSource({ filePath: scriptPath, useStdin });
  const sessionId = options.sessionId ?? globalOptions.sessionId;
  const step = options.step ?? globalOptions.step;

  if (sessionId && !step) {
    throw new Error('--step is required when --session is set');
  }

  const payload = buildExecutePayload({
    id: createRequestId(),
    source,
    options,
    sessionId,
    step,
  });

  logger.debug('execute request', {
    type: payload.type,
    browser: payload.browser,
    sessionId: payload.sessionId ?? null,
    step: payload.step ?? null,
  });

  await sendRequest(payload);
}
