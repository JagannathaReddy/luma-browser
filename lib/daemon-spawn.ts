import { fileURLToPath } from 'url';
import { createRequestId, isDaemonRunning, sendRequest } from './daemon-client.js';
import {
  fetchDaemonStatus,
  shouldRestartDaemon,
  stopDaemon,
  waitForDaemonStop,
} from './daemon-lifecycle.js';
import { LIMITS } from './limits.js';
import { logger } from './logger.js';
import { getPackageVersion } from './version.js';

const DAEMON_PATH = fileURLToPath(new URL('./daemon.js', import.meta.url));

export async function ensureDaemon() {
  if (await isDaemonRunning()) {
    await restartDaemonIfVersionMismatch();
    if (await isDaemonRunning()) {
      return;
    }
  }

  await spawnDaemon();
  await waitForDaemonReady();
}

export async function restartDaemonIfVersionMismatch() {
  const status = await fetchDaemonStatus(sendRequest, createRequestId, isDaemonRunning);
  const cliVersion = getPackageVersion();

  if (!shouldRestartDaemon(cliVersion, status?.version)) {
    return false;
  }

  logger.info('restarting daemon for version upgrade', {
    cliVersion,
    daemonVersion: status.version,
  });

  await stopDaemon(sendRequest, createRequestId);
  await waitForDaemonStop(isDaemonRunning);
  return true;
}

async function spawnDaemon() {
  const { spawn } = await import('child_process');
  const child = spawn(process.execPath, [DAEMON_PATH], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function waitForDaemonReady() {
  const deadline = Date.now() + LIMITS.daemonStartupMs;
  while (Date.now() < deadline) {
    if (await isDaemonRunning()) {
      return;
    }
    await sleep(100);
  }

  throw new Error(`Daemon failed to start within ${LIMITS.daemonStartupMs}ms`);
}

function sleep(ms) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
