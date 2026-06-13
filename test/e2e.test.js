import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(projectRoot, 'bin', 'luma-browser.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCli(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: projectRoot,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

describe(
  'cli e2e',
  {
    skip: process.env.LUMA_BROWSER_SKIP_E2E === '1' ? 'skipped by env' : false,
    concurrency: false,
  },
  () => {
    it('runs a headless script against example.com', async () => {
      await runCli(['stop']);
      await sleep(500);

      const result = await runCli(
        ['--headless'],
        `const page = await browser.getPage('main');
await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
console.log(await page.title());
`,
      );

      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /Example Domain/);

      await runCli(['stop']);
    });
  },
);
