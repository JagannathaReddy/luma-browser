import type { Page } from 'playwright';
import type { StepCapturePipelineOptions } from './types.js';
export declare const ARTIFACT_NAMES: {
    trace: string;
    video: string;
    har: string;
    console: string;
    screenshot: string;
    script: string;
    stdout: string;
    stderr: string;
    stepMeta: string;
};
export declare class NetworkHarRecorder {
    #private;
    attachToPage(page: any): void;
    attachToContext(context: any): void;
    write(path: any): Promise<void>;
    dispose(): void;
}
export declare class ConsoleRecorder {
    #private;
    attachToPage(page: any): void;
    attachToContext(context: any): void;
    write(path: any): Promise<void>;
    dispose(): void;
}
export declare class StepCapturePipeline {
    #private;
    constructor({ context, stepDir, capture, primaryPage, videoDir }: StepCapturePipelineOptions);
    setPrimaryPage(page: Page | null): void;
    start(): Promise<void>;
    stop(): Promise<Partial<Record<import("./types.js").StepArtifactKind, string>>>;
    abort(): Promise<void>;
}
export declare function writeStepArtifacts(stepDir: any, { script, stdout, stderr, artifacts, stepMeta }: {
    script: any;
    stdout: any;
    stderr: any;
    artifacts: any;
    stepMeta: any;
}): Promise<any>;
export declare function resolveCaptureOptions(sessionCapture: any, requestCapture: any): {
    trace: boolean;
    video: boolean;
    har: boolean;
    console: boolean;
    stepScreenshot: boolean;
};
export declare function writeSessionResults(sessionDir: any, meta: any): Promise<{
    path: string;
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
//# sourceMappingURL=capture.d.ts.map