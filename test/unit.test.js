import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isTargetId } from '../lib/cdp.js';
import { parseRequest, serializeResponse } from '../lib/protocol.js';
import { prepareScript, wrapScript } from '../lib/sandbox/prepare-script.js';

describe('wrapScript', () => {
  it('wraps user source in an async IIFE', () => {
    const source = `const page = await browser.getPage('main');`;
    const wrapped = wrapScript(source);
    assert.match(wrapped, /^\(async \(\) => \{/);
    assert.match(wrapped, /const page = await browser\.getPage\('main'\);/);
    assert.match(wrapped, /\}\)\(\)$/);
  });
});

describe('prepareScript (legacy)', () => {
  it('strips await before sandbox API calls', () => {
    const source = `
      const page = await browser.getPage('main');
      await page.goto('https://example.com');
      console.log(await page.title());
    `;

    const prepared = prepareScript(source);
    assert.match(prepared, /const page = browser.getPage\('main'\);/);
    assert.doesNotMatch(prepared, /\bawait\b/);
  });
});

describe('cdp helpers', () => {
  it('detects target ids', () => {
    assert.equal(isTargetId('FE0123456789ABCD'), true);
    assert.equal(isTargetId('main'), false);
  });
});

describe('protocol', () => {
  it('parses execute requests', () => {
    const parsed = parseRequest(
      JSON.stringify({
        id: 'req-1',
        type: 'execute',
        browser: 'default',
        script: 'console.log(1)',
        headless: true,
        ignoreHTTPSErrors: true,
        timeoutMs: 15_000,
      }),
    );

    assert.equal(parsed.success, true);
    assert.equal(parsed.request.type, 'execute');
    assert.equal(parsed.request.ignoreHTTPSErrors, true);
    assert.equal(parsed.request.timeoutMs, 15_000);
  });

  it('rejects invalid requests', () => {
    const parsed = parseRequest(JSON.stringify({ id: 'req-1', type: 'execute' }));
    assert.equal(parsed.success, false);
  });

  it('serializes responses', () => {
    const line = serializeResponse({ id: 'req-1', type: 'complete', success: true });
    assert.equal(line, '{"id":"req-1","type":"complete","success":true}\n');
  });

  it('parses session requests', () => {
    const parsed = parseRequest(
      JSON.stringify({
        id: 'req-2',
        type: 'session-start',
        name: 'checkout',
        capture: { video: false },
      }),
    );

    assert.equal(parsed.success, true);
    assert.equal(parsed.request.type, 'session-start');
    assert.equal(parsed.request.name, 'checkout');
    assert.equal(parsed.request.capture.video, false);
  });

  it('parses session-run requests', () => {
    const parsed = parseRequest(
      JSON.stringify({
        id: 'req-3',
        type: 'session-run',
        browser: 'default',
        script: 'console.log(1)',
        sessionId: 'sess-1',
        step: 'open',
      }),
    );

    assert.equal(parsed.success, true);
    assert.equal(parsed.request.type, 'session-run');
    assert.equal(parsed.request.timeoutMs, 30_000);
  });

  it('parses session-end and session-abort requests', () => {
    const ended = parseRequest(
      JSON.stringify({
        id: 'req-4',
        type: 'session-end',
        sessionId: 'sess-1',
        stopDaemon: true,
      }),
    );
    assert.equal(ended.success, true);
    assert.equal(ended.request.type, 'session-end');
    assert.equal(ended.request.stopDaemon, true);

    const aborted = parseRequest(
      JSON.stringify({
        id: 'req-5',
        type: 'session-abort',
        sessionId: 'sess-1',
        renderReport: true,
      }),
    );
    assert.equal(aborted.success, true);
    assert.equal(aborted.request.type, 'session-abort');
    assert.equal(aborted.request.renderReport, true);
  });
});
