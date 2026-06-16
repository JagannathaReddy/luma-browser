import type { ViewerStartOptions } from '../types.js';
export declare function startViewer({ sessionsRoot, sessionId, port, host, open, }?: ViewerStartOptions): Promise<{
    url: string;
    openUrl: string;
    host: string;
    port: number;
    sessionsDir: string;
    sessions: {
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
    }[];
    session: {
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
    } | null | undefined;
    reportPath: string | null;
    viewerReady: boolean;
}>;
//# sourceMappingURL=start-viewer.d.ts.map