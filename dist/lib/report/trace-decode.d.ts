export declare function decodeTraceZip(traceZipPath: any): Promise<{
    callId: any;
    class: any;
    method: any;
    apiName: string;
    params: any;
    result: any;
    error: any;
    startTime: any;
    endTime: any;
    durationMs: number;
    pageId: any;
    frameId: any;
}[]>;
export declare function decodeTraceText(traceText: any): {
    callId: any;
    class: any;
    method: any;
    apiName: string;
    params: any;
    result: any;
    error: any;
    startTime: any;
    endTime: any;
    durationMs: number;
    pageId: any;
    frameId: any;
}[];
//# sourceMappingURL=trace-decode.d.ts.map