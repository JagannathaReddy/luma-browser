import type { SandboxScriptOptions } from '../types.js';
export declare function runSandboxedScript(source: any, { browser, onStdout, onStderr, timeoutMs, memoryLimitBytes, }?: SandboxScriptOptions & {
    browser?: unknown;
}): Promise<void>;
//# sourceMappingURL=quickjs-sandbox.d.ts.map