/**
 * Convert Playwright internal selector strings to exported Playwright API chains.
 */
export declare function internalSelectorToExpression(selector: any): any;
export declare function frameMethodUsesSelector(method: any): boolean;
export declare function normalizeTraceAction(before: any, after: any): {
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
};
//# sourceMappingURL=locator-export.d.ts.map