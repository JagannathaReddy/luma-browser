export declare function createMetrics(): {
    requests: {
        total: number;
        by_type: {};
        errors: number;
    };
    executions: {
        total: number;
        failed: number;
        timeouts: number;
    };
    sessions: {
        started: number;
        ended: number;
        aborted: number;
    };
    capturePipelines: {
        failed: number;
    };
};
export declare function snapshotMetrics(metrics: any): {
    requests: any;
    executions: any;
    sessions: any;
    capturePipelines: any;
};
//# sourceMappingURL=metrics.d.ts.map