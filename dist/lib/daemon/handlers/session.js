export async function handleSessionStart(deps, request, output) {
    const { manager, sessions, locks, metrics } = deps;
    await locks.browser(request.browser, async () => {
        try {
            const startedMeta = await sessions.startSession({
                name: request.name,
                browser: request.browser,
                capture: request.capture,
            });
            metrics.sessions.started += 1;
            const recordVideoDir = startedMeta.capture.video
                ? sessions.videoDir(startedMeta.sessionId)
                : null;
            if (request.connect) {
                await manager.connectBrowser(request.browser, request.connect);
            }
            else {
                await manager.ensureBrowser(request.browser, {
                    headless: request.headless,
                    ignoreHTTPSErrors: request.ignoreHTTPSErrors,
                    recordVideoDir,
                });
            }
            await output.writeResult(startedMeta);
            await output.writeComplete();
        }
        catch (error) {
            await output.writeError(error instanceof Error ? error.message : String(error));
        }
    });
}
export async function handleSessionEnd(deps, request, output) {
    const { sessions, metrics, requestShutdown } = deps;
    const result = await sessions.endSession(request.sessionId, {
        renderReport: request.renderReport !== false,
    });
    metrics.sessions.ended += 1;
    await output.writeResult(result);
    await output.writeComplete();
    if (request.stopDaemon === true) {
        requestShutdown();
    }
}
export async function handleSessionAbort(deps, request, output) {
    const { sessions, metrics, requestShutdown } = deps;
    const result = await sessions.abortSession(request.sessionId, {
        renderReport: request.renderReport === true,
    });
    metrics.sessions.aborted += 1;
    await output.writeResult(result);
    await output.writeComplete();
    if (request.stopDaemon === true) {
        requestShutdown();
    }
}
export async function handleSessionList(deps, _request, output) {
    const listed = await deps.sessions.listSessions();
    await output.writeResult(listed);
    await output.writeComplete();
}
//# sourceMappingURL=session.js.map