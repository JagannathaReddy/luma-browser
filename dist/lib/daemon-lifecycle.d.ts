export declare function shouldRestartDaemon(cliVersion: any, daemonVersion: any): boolean;
export declare function fetchDaemonStatus(sendRequest: any, createRequestId: any, isDaemonRunning: any): Promise<any>;
export declare function stopDaemon(sendRequest: any, createRequestId: any): Promise<void>;
import type { WaitForStopOptions } from './types.js';
export declare function waitForDaemonStop(isDaemonRunning: any, { timeoutMs, sleepMs }?: WaitForStopOptions): Promise<void>;
//# sourceMappingURL=daemon-lifecycle.d.ts.map