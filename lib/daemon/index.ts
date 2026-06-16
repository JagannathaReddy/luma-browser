import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { BrowserManager } from '../browser-manager.js';
import { createKeyedLock, createMutex } from '../lock.js';
import { logger, setLogFile } from '../logger.js';
import {
  dataDir,
  daemonLogPath,
  getSocketPath,
  pidPath,
  requiresSocketCleanup,
  sessionsDir,
  tempDir,
} from '../paths.js';
import { SessionManager } from '../session/session-manager.js';
import { getPackageVersion } from '../version.js';
import { closeSocket, createLifecycle, unlinkIfExists } from './lifecycle.js';
import { createMetrics } from './metrics.js';
import { createRouter } from './router.js';
import { createServer } from './server.js';
import type { DaemonOptions } from './types.js';

export function createDaemon({
  manager = new BrowserManager(),
  sessions = new SessionManager(),
  paths = {
    socketPath: getSocketPath(),
    pidPath,
    sessionsDir,
    requiresSocketCleanup,
    unlinkIfExists,
  },
  version = getPackageVersion,
  log = logger,
}: DaemonOptions = {}) {
  const startedAt = Date.now();
  const locks = {
    browser: createKeyedLock(),
    install: createMutex(),
  };
  const lifecycle = createLifecycle({ manager, paths, logger: log });
  const metrics = createMetrics();

  const deps = {
    manager,
    sessions,
    locks,
    logger: log,
    paths,
    version,
    startedAt,
    metrics,
    requestShutdown: (code) => lifecycle.requestShutdown(code),
  };

  const router = createRouter(deps);
  const transport = createServer({ router, logger: log, paths, lifecycle: lifecycle.state });

  // Sequence: close listener → drain clients → stop browsers → unlink files → exit
  lifecycle.setBeforeShutdown(async () => {
    await new Promise<void>((resolve) => {
      if (!transport.server.listening) {
        resolve();
        return;
      }
      transport.server.close(() => resolve());
    });
    await Promise.allSettled([...transport.clients].map((socket) => closeSocket(socket)));
    transport.clients.clear();
  });

  async function start() {
    if (process.env.PW_CHROMIUM_ATTACH_TO_OTHER === undefined) {
      process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';
    }

    await mkdir(dataDir, { recursive: true });
    await mkdir(tempDir, { recursive: true });
    await mkdir(sessionsDir, { recursive: true });
    setLogFile(createWriteStream(daemonLogPath, { flags: 'a' }));

    await sessions.recoverOrphanedSteps();

    await transport.listen();
    await lifecycle.writePidFile();

    log.info('daemon ready', {
      version: version(),
      socketPath: paths.socketPath,
      logPath: daemonLogPath,
    });
    process.stderr.write('daemon ready\n');
  }

  return {
    start,
    registerSignalHandlers: () => lifecycle.registerSignalHandlers(),
    requestShutdown: (code) => lifecycle.requestShutdown(code),
  };
}
