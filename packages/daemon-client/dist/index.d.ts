import { type Request, type RequestResult } from '@jagannathamv/protocol';
export { readLines } from './line-reader.js';
export interface SendRequestOptions {
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
}
export declare function isDaemonRunning(): Promise<boolean>;
export declare function sendRequest<T extends Request>(request: T, options?: SendRequestOptions): Promise<RequestResult<T['type']> | null>;
export declare function createRequestId(): string;
//# sourceMappingURL=index.d.ts.map