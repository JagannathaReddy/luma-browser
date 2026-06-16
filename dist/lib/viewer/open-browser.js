import { spawn } from 'child_process';
import { platform } from 'os';
export function openBrowser(url) {
    const command = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'cmd' : 'xdg-open';
    const args = platform() === 'win32' ? ['/c', 'start', '', url] : platform() === 'darwin' ? [url] : [url];
    const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
}
//# sourceMappingURL=open-browser.js.map