import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { runSandboxedScript } from './sandbox/quickjs-sandbox.js';
export async function runScript(options) {
    return runSandboxedScript(options.script ?? options.source, options);
}
export function readScriptSource({ filePath, useStdin }) {
    if (filePath) {
        return readFileSync(filePath, 'utf8');
    }
    if (useStdin) {
        return readFileSync(0, 'utf8');
    }
    throw new Error('No script provided. Pass a file or pipe script code to stdin.');
}
export function resolveScriptPath(arg, cwd = process.cwd()) {
    if (!arg) {
        return null;
    }
    if (arg.startsWith('file://')) {
        return fileURLToPath(arg);
    }
    return join(cwd, arg);
}
//# sourceMappingURL=executor.js.map