import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import net from 'net';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { BrowserManager } from './browser-manager.js';
import { installBrowsers } from './install.js';
import { logger, setLogFile } from './logger.js';
import { createKeyedLock, createMutex } from './lock.js';
import {
  dataDir,
  daemonLogPath,
  getSocketPath,
  pidPath,
  requiresSocketCleanup,
  sessionsDir,
  tempDir,
} from './paths.js';
import { parseRequest, serializeResponse } from './protocol.js';
import { runScript } from './executor.js';
import { SessionManager } from './session/session-manager.js';
import {
  resolveCaptureOptions,
  StepCapturePipeline,
  writeStepArtifacts,
} from './session/capture.js';
import { getPackageVersion } from './version.js';

const SOCKET_PATH = getSocketPath();
const withBrowserLock = createKeyedLock();
const withInstallLock = createMutex();
const manager = new BrowserManager();
const sessions = new SessionManager();

let server = null;
let shuttingDown = null;
let ownsEndpoint = false;
const clients = new Set();
const startedAt = Date.now();

async function writeMessage(socket, message) {
  if (socket.destroyed) {
    return;
  }

  await new Promise((resolve, reject) => {
    socket.write(serializeResponse(message), (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function createMessageQueue(socket) {
  let queue = Promise.resolve();

  return {
    push(message) {
      queue = queue.then(() => writeMessage(socket, message)).catch(() => undefined);
      return queue;
    },
    drain() {
      return queue;
    },
  };
}

async function handleExecute(socket, request) {
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
  const capture = resolveCaptureOptions(
    sessionMeta?.capture,
    request.capture ?? stepContext?.capture,
  );
  const stdoutChunks = [];
  const stderrChunks = [];

  await withBrowserLock(request.browser, async () => {
    const recordVideoDir =
      capture.video && request.sessionId ? sessions.videoDir(request.sessionId) : null;

    if (request.connect) {
      await manager.connectBrowser(request.browser, request.connect);
    } else {
      await manager.ensureBrowser(request.browser, {
        headless: request.headless,
        ignoreHTTPSErrors: request.ignoreHTTPSErrors,
        recordVideoDir,
      });
    }

    const output = createMessageQueue(socket);
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
          output.push({ id: request.id, type: 'stdout', data });
        },
        onStderr: (data) => {
          stderrChunks.push(data);
          output.push({ id: request.id, type: 'stderr', data });
        },
      });

      await output.drain();
      await manager.cleanupAfterScript(request.browser);
      await writeMessage(socket, { id: request.id, type: 'complete', success: true });
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      await output.drain().catch(() => undefined);
      await manager.cleanupAfterScript(request.browser).catch(() => undefined);
      await writeMessage(socket, {
        id: request.id,
        type: 'error',
        message: errorMessage,
      });
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

async function handleSessionStart(socket, request) {
  await withBrowserLock(request.browser, async () => {
    const startedMeta = await sessions.startSession({
      name: request.name,
      browser: request.browser,
      capture: request.capture,
    });

    const recordVideoDir = startedMeta.capture.video
      ? sessions.videoDir(startedMeta.sessionId)
      : null;

    if (request.connect) {
      await manager.connectBrowser(request.browser, request.connect);
    } else {
      await manager.ensureBrowser(request.browser, {
        headless: request.headless,
        ignoreHTTPSErrors: request.ignoreHTTPSErrors,
        recordVideoDir,
      });
    }

    await writeMessage(socket, { id: request.id, type: 'result', data: startedMeta });
    await writeMessage(socket, { id: request.id, type: 'complete', success: true });
  });
}

async function handleInstall(socket, request) {
  await withInstallLock(async () => {
    const output = createMessageQueue(socket);

    try {
      await installBrowsers({
        onStdout: (data) => output.push({ id: request.id, type: 'stdout', data }),
        onStderr: (data) => output.push({ id: request.id, type: 'stderr', data }),
      });
      await output.drain();
      await writeMessage(socket, { id: request.id, type: 'complete', success: true });
    } catch (error) {
      await output.drain().catch(() => undefined);
      await writeMessage(socket, {
        id: request.id,
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

async function handleRequest(socket, line) {
  const parsed = parseRequest(line);
  if (!parsed.success) {
    await writeMessage(socket, {
      id: parsed.id ?? 'unknown',
      type: 'error',
      message: parsed.error,
    });
    return;
  }

  const { request } = parsed;

  if (shuttingDown && request.type !== 'stop') {
    await writeMessage(socket, {
      id: request.id,
      type: 'error',
      message: 'Daemon is shutting down',
    });
    return;
  }

  logger.debug('daemon request', { type: request.type, id: request.id });

  switch (request.type) {
    case 'execute':
    case 'session-run':
      await handleExecute(socket, request);
      return;
    case 'session-start':
      await handleSessionStart(socket, request);
      return;
    case 'session-end': {
      await handleSessionClose(socket, request, async () =>
        sessions.endSession(request.sessionId, {
          renderReport: request.renderReport !== false,
        }),
      );
      return;
    }
    case 'session-abort': {
      await handleSessionClose(socket, request, async () =>
        sessions.abortSession(request.sessionId, {
          renderReport: request.renderReport === true,
        }),
      );
      return;
    }
    case 'session-list': {
      const listed = await sessions.listSessions();
      await writeMessage(socket, { id: request.id, type: 'result', data: listed });
      await writeMessage(socket, { id: request.id, type: 'complete', success: true });
      return;
    }
    case 'install':
      await handleInstall(socket, request);
      return;
    case 'browsers':
      await writeMessage(socket, { id: request.id, type: 'result', data: manager.listBrowsers() });
      await writeMessage(socket, { id: request.id, type: 'complete', success: true });
      return;
    case 'browser-stop':
      await withBrowserLock(request.browser, () => manager.stopBrowser(request.browser));
      await writeMessage(socket, {
        id: request.id,
        type: 'result',
        data: { browser: request.browser, stopped: true },
      });
      await writeMessage(socket, { id: request.id, type: 'complete', success: true });
      return;
    case 'status':
      await writeMessage(socket, {
        id: request.id,
        type: 'result',
        data: {
          pid: process.pid,
          version: getPackageVersion(),
          uptimeMs: Date.now() - startedAt,
          browserCount: manager.browserCount(),
          browsers: manager.listBrowsers(),
          socketPath: SOCKET_PATH,
          sessionsDir,
        },
      });
      await writeMessage(socket, { id: request.id, type: 'complete', success: true });
      return;
    case 'stop':
      await writeMessage(socket, { id: request.id, type: 'result', data: { stopping: true } });
      await writeMessage(socket, { id: request.id, type: 'complete', success: true });
      void shutdown(0);
      return;
    default:
      await writeMessage(socket, {
        id: request.id,
        type: 'error',
        message: `Unhandled request type: ${request.type}`,
      });
  }
}

async function handleSessionClose(socket, request, closeSession) {
  const result = await closeSession();
  await writeMessage(socket, { id: request.id, type: 'result', data: result });
  await writeMessage(socket, { id: request.id, type: 'complete', success: true });

  if (request.stopDaemon === true) {
    void shutdown(0);
  }
}

async function unlinkIfExists(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return shuttingDown;
  }

  shuttingDown = (async () => {
    const activeServer = server;
    server = null;

    await manager.stopAll();
    await Promise.allSettled([...clients].map((socket) => closeSocket(socket)));

    if (activeServer) {
      await new Promise((resolve) => activeServer.close(resolve));
    }

    if (ownsEndpoint) {
      await unlinkIfExists(pidPath);
      if (requiresSocketCleanup()) {
        await unlinkIfExists(SOCKET_PATH);
      }
    }

    clients.clear();
    process.exit(exitCode);
  })();

  return shuttingDown;
}

function closeSocket(socket) {
  if (socket.destroyed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    socket.once('close', resolve);
    socket.end();
    setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
      }
      resolve();
    }, 500).unref();
  });
}

async function isEndpointActive(endpoint) {
  return new Promise((resolve) => {
    const probe = net.connect(endpoint);
    const finish = (active) => {
      probe.destroy();
      resolve(active);
    };
    probe.once('connect', () => finish(true));
    probe.once('error', () => finish(false));
  });
}

function listen(serverInstance) {
  return new Promise((resolve, reject) => {
    serverInstance.once('error', reject);
    serverInstance.listen(SOCKET_PATH, () => {
      serverInstance.off('error', reject);
      resolve();
    });
  });
}

async function bindEndpoint(serverInstance) {
  try {
    await listen(serverInstance);
    return;
  } catch (error) {
    if (error.code !== 'EADDRINUSE' || !requiresSocketCleanup()) {
      throw error;
    }
  }

  if (await isEndpointActive(SOCKET_PATH)) {
    process.stderr.write('daemon already running\n');
    process.exit(0);
  }

  await unlinkIfExists(SOCKET_PATH);
  await listen(serverInstance);
}

async function start() {
  await mkdir(dataDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });
  await mkdir(sessionsDir, { recursive: true });
  setLogFile(createWriteStream(daemonLogPath, { flags: 'a' }));

  server = net.createServer((socket) => {
    if (shuttingDown) {
      socket.end();
      return;
    }

    clients.add(socket);
    socket.setEncoding('utf8');

    let buffer = '';
    let queue = Promise.resolve();

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }

        queue = queue
          .then(() => handleRequest(socket, line))
          .catch(async (error) => {
            if (!socket.destroyed) {
              await writeMessage(socket, {
                id: 'unknown',
                type: 'error',
                message: error instanceof Error ? error.message : String(error),
              });
            }
          });
      }
    });

    socket.on('close', () => clients.delete(socket));
    socket.on('error', () => clients.delete(socket));
  });

  await bindEndpoint(server);
  ownsEndpoint = true;
  await writeFile(pidPath, `${process.pid}\n`);
  logger.info('daemon ready', {
    version: getPackageVersion(),
    socketPath: SOCKET_PATH,
    logPath: daemonLogPath,
  });
  process.stderr.write('daemon ready\n');
}

function registerSignalHandlers() {
  const handleSignal = () => {
    void shutdown(0);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);
  process.on('uncaughtException', (error) => {
    logger.error('fatal daemon error', { error: error.message });
    void shutdown(1);
  });
  process.on('unhandledRejection', (error) => {
    logger.error('fatal daemon error', {
      error: error instanceof Error ? error.message : String(error),
    });
    void shutdown(1);
  });
}

export function getDaemonEntryPath() {
  return fileURLToPath(new URL('./daemon.js', import.meta.url));
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  registerSignalHandlers();

  start().catch((error) => {
    logger.error('failed to start daemon', { error: error.message });
    void shutdown(1);
  });
}
