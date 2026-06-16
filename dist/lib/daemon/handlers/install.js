import { installBrowsers } from '../../install.js';
export async function handleInstall(deps, _request, output) {
    await deps.locks.install(async () => {
        try {
            await installBrowsers({
                onStdout: (data) => output.writeStdout(data),
                onStderr: (data) => output.writeStderr(data),
            });
            await output.drain();
            await output.writeComplete();
        }
        catch (error) {
            await output.drain().catch(() => undefined);
            await output.writeError(error instanceof Error ? error.message : String(error));
        }
    });
}
//# sourceMappingURL=install.js.map