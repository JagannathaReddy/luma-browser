import { PROTOCOL_VERSION } from '../../protocol.js';
import { snapshotMetrics } from '../metrics.js';

export async function handleStatus(deps, _request, output) {
  const { manager, paths, version, startedAt, metrics } = deps;
  await output.writeResult({
    pid: process.pid,
    version: version(),
    protocolVersion: PROTOCOL_VERSION,
    uptimeMs: Date.now() - startedAt,
    browserCount: manager.browserCount(),
    browsers: manager.listBrowsers(),
    socketPath: paths.socketPath,
    sessionsDir: paths.sessionsDir,
    metrics: snapshotMetrics(metrics),
  });
  await output.writeComplete();
}

export async function handleBrowsers(deps, _request, output) {
  await output.writeResult(deps.manager.listBrowsers());
  await output.writeComplete();
}

export async function handleBrowserStop(deps, request, output) {
  await deps.locks.browser(request.browser, () => deps.manager.stopBrowser(request.browser));
  await output.writeResult({ browser: request.browser, stopped: true });
  await output.writeComplete();
}

export async function handleStop(deps, _request, output) {
  await output.writeResult({ stopping: true });
  await output.writeComplete();
  deps.requestShutdown();
}
