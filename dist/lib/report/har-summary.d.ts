export declare function parseHarText(text: any): any;
export declare function harEntrySummary(entry: any): {
    method: any;
    url: any;
    status: any;
    statusText: any;
    mimeType: any;
    size: any;
    durationMs: any;
    request: any;
    response: any;
    startedDateTime: any;
};
export declare function summarizeHar(text: any): {
    entries: any;
    total: any;
    failed: any;
};
export declare function harStatusClass(status: any): "status-fail" | "status-5xx" | "status-4xx" | "status-3xx" | "status-2xx";
export { formatBytes } from '../html/helpers.js';
//# sourceMappingURL=har-summary.d.ts.map