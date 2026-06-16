export declare function createSocketOutput(socket: any, requestId: any): {
    writeResult(data: any): Promise<void>;
    writeStdout(data: any): Promise<void>;
    writeStderr(data: any): Promise<void>;
    writeError(message: any): Promise<void>;
    writeComplete(): Promise<void>;
    drain(): Promise<void>;
};
export declare function writeFatalError(socket: any, requestId: any, error: any): Promise<void>;
//# sourceMappingURL=output.d.ts.map