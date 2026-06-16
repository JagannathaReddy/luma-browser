import type { LifecycleOptions, LifecycleState } from './types.js';
export declare function unlinkIfExists(path: any): Promise<void>;
export declare function createLifecycle({ manager, paths, logger }: LifecycleOptions): {
    state: LifecycleState;
    requestShutdown: (exitCode?: number) => Promise<void>;
    writePidFile: () => Promise<void>;
    registerSignalHandlers: () => void;
    setBeforeShutdown: (fn: any) => void;
    readonly shuttingDown: Promise<void> | null;
};
export declare function closeSocket(socket: any): Promise<void>;
//# sourceMappingURL=lifecycle.d.ts.map