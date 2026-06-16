import { accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
export const LUMA_NPM_PACKAGE = '@jagannathamv/luma-browser';
export function run(command, args, { label, optional = false } = {}) {
    if (label) {
        console.log(`\n→ ${label}`);
    }
    const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.status !== 0 && !optional) {
        process.exit(result.status ?? 1);
    }
    return result.status === 0;
}
export function commandExists(name) {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    return spawnSync(checker, [name], { encoding: 'utf8' }).status === 0;
}
export function npmGlobalPrefix() {
    const result = spawnSync('npm', ['config', 'get', 'prefix'], { encoding: 'utf8' });
    const raw = result.stdout?.trim() || '/usr/local';
    return raw.startsWith('~') ? join(homedir(), raw.slice(1)) : raw;
}
export function canInstallGlobal() {
    const prefix = npmGlobalPrefix();
    try {
        accessSync(prefix, constants.W_OK);
        return true;
    }
    catch {
        return false;
    }
}
export function printGlobalInstallHint() {
    console.log(`
 Global npm install needs a writable prefix (default /usr/local often requires sudo).

 Fix once — user-owned global packages:
   mkdir -p ~/.npm-global
   npm config set prefix ~/.npm-global
   echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc

 Or skip global install and use npx:
   npx ${LUMA_NPM_PACKAGE} install
   npx ${LUMA_NPM_PACKAGE} --help
`);
}
export function lumaOnPath() {
    return (commandExists('luma-browser') &&
        spawnSync('luma-browser', ['--help'], { encoding: 'utf8' }).status === 0);
}
export function npxLuma(argv, { optional = false } = {}) {
    return run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [LUMA_NPM_PACKAGE, ...argv], {
        label: `npx ${LUMA_NPM_PACKAGE} ${argv.join(' ')}`,
        optional,
    });
}
export function installGlobalPackage() {
    return run('npm', ['install', '-g', LUMA_NPM_PACKAGE], {
        label: `npm install -g ${LUMA_NPM_PACKAGE}`,
        optional: true,
    });
}
export function installChromium({ useGlobalCli }) {
    if (useGlobalCli && lumaOnPath()) {
        return run('luma-browser', ['install'], {
            label: 'luma-browser install (Chromium)',
            optional: true,
        });
    }
    return npxLuma(['install']);
}
//# sourceMappingURL=setup.js.map