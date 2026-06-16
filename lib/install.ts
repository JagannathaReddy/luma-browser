import { spawn, spawnSync } from 'child_process';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import type { SendRequestOptions } from '@jagannathamv/daemon-client';

const require = createRequire(import.meta.url);

function getPlaywrightCliPath() {
  return join(dirname(require.resolve('playwright/package.json')), 'cli.js');
}

export function installBrowsersSync() {
  const result = spawnSync(process.execPath, [getPlaywrightCliPath(), 'install', 'chromium'], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function installBrowsers({ onStdout, onStderr }: SendRequestOptions = {}) {
  if (!onStdout && !onStderr) {
    installBrowsersSync();
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [getPlaywrightCliPath(), 'install', 'chromium'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => onStdout?.(chunk.toString()));
    child.stderr.on('data', (chunk) => onStderr?.(chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Playwright install failed with exit code ${code ?? 'unknown'}`));
    });
  });
}
