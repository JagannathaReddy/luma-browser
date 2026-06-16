export declare function enrichSessionResults(sessionDir: any, results: any): Promise<{
    browser: string | null;
    name: string | null;
    id: string;
    status: "aborted" | "open" | "closed";
    capture: {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    };
    startedAt: string;
    endedAt: string | null;
    steps: {
        name: string;
        dir: string;
        error: string | null;
        index: number;
        startedAt: string;
        endedAt: string | null;
        success: boolean | null;
        artifacts: Record<string, string>;
        actionCount?: number | undefined;
        exportedScript?: string | undefined;
    }[];
}>;
export declare function renderSessionReportFile(sessionDir: any, results: any): Promise<{
    reportPath: string;
    results: {
        browser: string | null;
        name: string | null;
        id: string;
        status: "aborted" | "open" | "closed";
        capture: {
            trace: boolean;
            video: boolean;
            har: boolean;
            console: boolean;
            stepScreenshot: boolean;
        };
        startedAt: string;
        endedAt: string | null;
        steps: {
            name: string;
            dir: string;
            error: string | null;
            index: number;
            startedAt: string;
            endedAt: string | null;
            success: boolean | null;
            artifacts: Record<string, string>;
            actionCount?: number | undefined;
            exportedScript?: string | undefined;
        }[];
    };
}>;
//# sourceMappingURL=render-session-report.d.ts.map