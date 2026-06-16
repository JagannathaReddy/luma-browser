import type { ExecuteRequest, SessionRunRequest } from '@jagannathamv/protocol';
import type { BuildExecutePayloadInput } from '../types.js';
export declare const FLAG_ARGS: Set<string>;
export declare function parseCaptureFlags(argv: any): {
    trace: boolean;
    video: boolean;
    har: boolean;
    console: boolean;
    stepScreenshot: boolean;
} | undefined;
export declare function parseOptions(argv: any): {
    browser: string;
    connect: undefined;
    headless: boolean;
    ignoreHTTPSErrors: boolean;
    timeoutMs: undefined;
    verbose: boolean;
    sessionId: undefined;
    step: undefined;
    name: undefined;
    port: undefined;
    renderReport: boolean;
    noReport: boolean;
    stopDaemon: boolean;
    openViewer: boolean;
    capture: {
        trace: boolean;
        video: boolean;
        har: boolean;
        console: boolean;
        stepScreenshot: boolean;
    } | undefined;
};
export declare function resolveRenderReport(options: any): boolean;
export declare function filterFlags(argv: any): string[];
export declare function buildExecutePayload({ id, source, options, sessionId, step, }: BuildExecutePayloadInput): ExecuteRequest | SessionRunRequest;
//# sourceMappingURL=parse-options.d.ts.map