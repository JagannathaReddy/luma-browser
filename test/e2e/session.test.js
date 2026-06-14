import assert from 'node:assert/strict';
import { access, readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { describe, it } from 'node:test';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cli = join(projectRoot, 'bin/luma-browser.js');
const skip = process.env.LUMA_BROWSER_SKIP_E2E === '1';

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
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

describe('session e2e', { skip: skip ? 'skipped by env' : false, concurrency: false }, () => {
  it('records step artifacts for a two-step session', async () => {
    await runCli(['stop']);
    await sleep(500);

    const startResult = await runCli([
      'session',
      'start',
      '--name',
      'phase3-e2e',
      '--browser',
      'phase3-e2e',
      '--no-video',
      '--headless',
    ]);
    assert.equal(startResult.code, 0, startResult.stderr);

    const started = JSON.parse(startResult.stdout.trim());

    const sessionId = started.sessionId;
    assert.ok(sessionId);
    assert.ok(started.dir);

    const openStep = await runCli(
      [
        '--browser',
        'phase3-e2e',
        '--session',
        sessionId,
        '--step',
        'open',
        '--headless',
        '--no-video',
      ],
      `const page = await browser.getPage('main');
await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
console.log(await page.title());`,
    );
    assert.equal(openStep.code, 0, openStep.stderr);
    assert.match(openStep.stdout, /Example Domain/i);

    const verifyStep = await runCli(
      [
        '--browser',
        'phase3-e2e',
        '--session',
        sessionId,
        '--step',
        'verify',
        '--headless',
        '--no-video',
      ],
      `const page = await browser.getPage('main');
console.log(await page.title());`,
    );
    assert.equal(verifyStep.code, 0, verifyStep.stderr);

    const ended = JSON.parse((await runCli(['session', 'end', sessionId])).stdout.trim());
    assert.equal(ended.status, 'closed');
    assert.ok(ended.resultsPath);
    assert.ok(ended.reportPath);
    assert.equal(ended.reportReady, true);

    const results = JSON.parse(await readFile(ended.resultsPath, 'utf8'));
    assert.equal(results.steps.length, 2);
    assert.equal(results.steps[0].success, true);
    assert.equal(results.steps[1].success, true);

    const stepDir = join(started.dir, 'steps', '000');
    await access(join(stepDir, 'script.js'));
    await access(join(stepDir, 'stdout.txt'));
    await access(join(stepDir, 'step.json'));
    await access(join(stepDir, 'trace.zip'));
    await access(join(stepDir, 'network.har'));
    await access(join(stepDir, 'console.jsonl'));
    await access(ended.reportPath);

    const reportHtml = await readFile(ended.reportPath, 'utf8');
    assert.match(reportHtml, /phase3-e2e|open/i);

    if (results.steps[0].exportedScript) {
      await access(join(stepDir, results.steps[0].exportedScript));
    }

    await runCli(['stop']);
  });
});
