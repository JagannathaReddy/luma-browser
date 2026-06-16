export declare function listViewerSessions(sessionsRoot: any): Promise<{
    reportReady: boolean;
    resultsReady: boolean;
    reportPath: string;
    resultsPath: string;
    id: string;
    name: string | null;
    status: string;
    startedAt: string;
    endedAt: string | null;
    stepCount: number;
    dir: string;
}[]>;
export declare function loadSessionDetail(sessionsRoot: any, sessionId: any): Promise<{
    id: any;
    name: any;
    status: any;
    browser: any;
    startedAt: any;
    endedAt: any;
    capture: any;
    dir: string;
    reportReady: boolean;
    resultsReady: boolean;
    steps: any;
}>;
//# sourceMappingURL=sessions.d.ts.map