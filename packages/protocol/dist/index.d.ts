import { z } from 'zod';
import type { ParseRequestResult, Request, Response } from './types.js';
export declare const PROTOCOL_VERSION = 1;
export declare const CaptureOptionsSchema: z.ZodObject<{
    trace: z.ZodOptional<z.ZodBoolean>;
    video: z.ZodOptional<z.ZodBoolean>;
    har: z.ZodOptional<z.ZodBoolean>;
    console: z.ZodOptional<z.ZodBoolean>;
    stepScreenshot: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    trace?: boolean | undefined;
    video?: boolean | undefined;
    har?: boolean | undefined;
    console?: boolean | undefined;
    stepScreenshot?: boolean | undefined;
}, {
    trace?: boolean | undefined;
    video?: boolean | undefined;
    har?: boolean | undefined;
    console?: boolean | undefined;
    stepScreenshot?: boolean | undefined;
}>;
export declare function parseRequest(line: string): ParseRequestResult;
export declare function serializeResponse(message: Response): string;
export declare function serializeRequest(request: Request): string;
/** @deprecated Use serializeResponse */
export declare function serialize(message: Response): string;
export * from './types.js';
//# sourceMappingURL=index.d.ts.map