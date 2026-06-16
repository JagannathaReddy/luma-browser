import type { WriteStream } from 'node:fs';
export declare function setLogFile(stream: WriteStream | null): void;
export declare function setVerbose(enabled: boolean): void;
export declare const logger: {
    trace: (message: string, fields?: Record<string, unknown>) => void;
    debug: (message: string, fields?: Record<string, unknown>) => void;
    info: (message: string, fields?: Record<string, unknown>) => void;
    warn: (message: string, fields?: Record<string, unknown>) => void;
    error: (message: string, fields?: Record<string, unknown>) => void;
    isVerbose: () => boolean;
};
//# sourceMappingURL=index.d.ts.map