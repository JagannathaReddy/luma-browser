import type { CaptureOptions, SessionListEntry } from '@jagannathamv/protocol';
import type { SessionFinalizeOptions, SessionManagerOptions, SessionStartOptions, StepFinishOptions } from './types.js';
export declare function defaultCaptureOptions(overrides?: CaptureOptions): Required<CaptureOptions>;
export declare class SessionManager {
    #private;
    constructor({ sessionsRoot }?: SessionManagerOptions);
    startSession({ name, browser, capture }?: SessionStartOptions): Promise<{
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        dir: string;
        browser: string;
        capture: Required<CaptureOptions>;
    }>;
    getSessionMeta(sessionId: any): Promise<any>;
    videoDir(sessionId: any): string;
    recoverOrphanedSteps(): Promise<{
        recoveredSteps: number;
        affectedSessions: number;
    }>;
    listSessions(): Promise<SessionListEntry[]>;
    endSession(sessionId: any, { renderReport }?: SessionFinalizeOptions): Promise<{
        sessionId: any;
        dir: string;
        status: any;
        renderReport: boolean;
        reportPath: string | null;
        resultsPath: string;
        reportReady: boolean;
    }>;
    abortSession(sessionId: any, { renderReport }?: SessionFinalizeOptions): Promise<{
        sessionId: any;
        dir: string;
        status: any;
        renderReport: boolean;
        reportPath: string | null;
        resultsPath: string;
        reportReady: boolean;
    }>;
    beginStep(sessionId: any, stepName: any): Promise<{
        stepIndex: number;
        stepDir: string;
        capture: any;
    }>;
    finishStep(sessionId: any, stepIndex: any, { success, error, artifacts }: StepFinishOptions): Promise<void>;
}
//# sourceMappingURL=session-manager.d.ts.map