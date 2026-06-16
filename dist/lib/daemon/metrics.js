export function createMetrics() {
    return {
        requests: { total: 0, by_type: {}, errors: 0 },
        executions: { total: 0, failed: 0, timeouts: 0 },
        sessions: { started: 0, ended: 0, aborted: 0 },
        capturePipelines: { failed: 0 },
    };
}
export function snapshotMetrics(metrics) {
    return {
        requests: { ...metrics.requests, by_type: { ...metrics.requests.by_type } },
        executions: { ...metrics.executions },
        sessions: { ...metrics.sessions },
        capturePipelines: { ...metrics.capturePipelines },
    };
}
//# sourceMappingURL=metrics.js.map