import { handleExecute } from './handlers/execute.js';
import { handleInstall } from './handlers/install.js';
import { handleSessionAbort, handleSessionEnd, handleSessionList, handleSessionStart, } from './handlers/session.js';
import { handleBrowsers, handleBrowserStop, handleStatus, handleStop } from './handlers/admin.js';
const ROUTES = {
    execute: handleExecute,
    'session-run': handleExecute,
    'session-start': handleSessionStart,
    'session-end': handleSessionEnd,
    'session-abort': handleSessionAbort,
    'session-list': handleSessionList,
    install: handleInstall,
    browsers: handleBrowsers,
    'browser-stop': handleBrowserStop,
    status: handleStatus,
    stop: handleStop,
};
// Lock policy: execute / session-run / session-start / browser-stop take the
// per-browser lock. Read-only admin ops (status / browsers / session-list)
// and stop never take it, so a long-running script doesn't block diagnostics.
export function createRouter(deps) {
    return async function route(request, output) {
        deps.logger.debug('daemon request', { type: request.type, id: request.id });
        deps.metrics.requests.total += 1;
        deps.metrics.requests.by_type[request.type] =
            (deps.metrics.requests.by_type[request.type] ?? 0) + 1;
        const handler = ROUTES[request.type];
        if (!handler) {
            deps.metrics.requests.errors += 1;
            await output.writeError(`Unhandled request type: ${request.type}`);
            return;
        }
        try {
            await handler(deps, request, output);
        }
        catch (error) {
            deps.metrics.requests.errors += 1;
            throw error;
        }
    };
}
//# sourceMappingURL=router.js.map