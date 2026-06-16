import type { DaemonOptions } from './types.js';
export declare function createDaemon({ manager, sessions, paths, version, log, }?: DaemonOptions): {
    start: () => Promise<void>;
    registerSignalHandlers: () => void;
    requestShutdown: (code: any) => Promise<void>;
};
//# sourceMappingURL=index.d.ts.map