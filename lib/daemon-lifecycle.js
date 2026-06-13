export function shouldRestartDaemon(cliVersion, daemonVersion) {
  if (!daemonVersion) {
    return false;
  }

  return cliVersion !== daemonVersion;
}

export async function fetchDaemonStatus(sendRequest, createRequestId, isDaemonRunning) {
  if (!(await isDaemonRunning())) {
    return null;
  }

  return sendRequest(
    { id: createRequestId(), type: 'status' },
    {
      onStdout() {},
      onStderr() {},
    },
  );
}

export async function stopDaemon(sendRequest, createRequestId) {
  await sendRequest(
    { id: createRequestId(), type: 'stop' },
    {
      onStdout() {},
      onStderr() {},
    },
  );
}

export async function waitForDaemonStop(
  isDaemonRunning,
  { timeoutMs = 5_000, sleepMs = 100 } = {},
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await isDaemonRunning())) {
      return;
    }
    await sleep(sleepMs);
  }

  throw new Error('Daemon failed to stop within timeout');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
