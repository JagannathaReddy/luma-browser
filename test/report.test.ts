import assert from 'node:assert/strict';
import { deflateRaw } from 'zlib';
import { promisify } from 'util';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { test } from 'node:test';
import { decodeTraceText, decodeTraceZip } from '../lib/report/trace-decode.js';
import { actionToStatement, exportPlaywrightScript } from '../lib/report/export-script.js';
import { renderSessionReport } from '../lib/report/render-report.js';
import { renderSessionReportFile } from '../lib/report/render-session-report.js';
import { parseConsoleJsonl, summarizeConsole } from '../lib/report/console-summary.js';
import { parseHarText, summarizeHar } from '../lib/report/har-summary.js';
import { parseSessionResults, validateSessionResults } from '../lib/session/results-schema.js';

const deflateRawAsync = promisify(deflateRaw);

async function writeMinimalDeflateZip(zipPath, entries) {
  const parts = [];

  for (const [name, content] of Object.entries(entries)) {
    const raw = Buffer.from(content, 'utf8');
    const compressed = await deflateRawAsync(raw);
    const nameBuf = Buffer.from(name, 'utf8');
    const header = Buffer.alloc(30 + nameBuf.length);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(raw.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);
    nameBuf.copy(header, 30);
    parts.push(header, compressed);
  }

  await writeFile(zipPath, Buffer.concat(parts));
}

const sampleTraceLines = [
  {
    type: 'before',
    callId: 'call@1',
    class: 'Frame',
    method: 'goto',
    params: { url: 'https://example.com', waitUntil: 'domcontentloaded' },
    startTime: 100,
    pageId: 'page@1',
  },
  {
    type: 'after',
    callId: 'call@1',
    endTime: 500,
    result: { value: null },
  },
  {
    type: 'before',
    callId: 'call@2',
    class: 'Frame',
    method: 'title',
    params: {},
    startTime: 600,
    pageId: 'page@1',
  },
  {
    type: 'after',
    callId: 'call@2',
    endTime: 650,
    result: { value: 'Example Domain' },
  },
  {
    type: 'before',
    callId: 'call@3',
    class: 'Browser',
    method: 'newPage',
    params: {},
    startTime: 700,
  },
  {
    type: 'after',
    callId: 'call@3',
    endTime: 800,
    result: { value: null },
  },
];

test('decodeTraceText pairs before/after events and skips internal calls', () => {
  const text = sampleTraceLines.map((line) => JSON.stringify(line)).join('\n');
  const actions = decodeTraceText(text);

  assert.equal(actions.length, 2);
  assert.equal(actions[0].method, 'goto');
  assert.equal(actions[0].params.url, 'https://example.com');
  assert.equal(actions[1].method, 'title');
  assert.equal(actions[1].result.value, 'Example Domain');
});

test('decodeTraceZip reads trace.trace from a deflate zip', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-report-'));
  try {
    const zipPath = join(root, 'trace.zip');
    const traceText = sampleTraceLines.map((line) => JSON.stringify(line)).join('\n');
    await writeMinimalDeflateZip(zipPath, { 'trace.trace': traceText });

    const actions = await decodeTraceZip(zipPath);
    assert.equal(actions.length, 2);
    assert.equal(actions[0].apiName, 'page.goto');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('exportPlaywrightScript emits goto and title comment', () => {
  const actions = decodeTraceText(sampleTraceLines.map((line) => JSON.stringify(line)).join('\n'));
  const script = exportPlaywrightScript(actions, { stepName: 'open' });

  assert.match(script, /Exported from luma-browser session step "open"/);
  assert.match(script, /await page\.goto\("https:\/\/example.com"/);
  assert.match(script, /page\.title\(\)/);
  assert.match(script, /await browser\.close\(\)/);
});

test('actionToStatement formats locator clicks', () => {
  const statement = actionToStatement({
    class: 'Locator',
    method: 'click',
    params: { selector: 'button.submit' },
    apiName: 'locator.click',
  });

  assert.match(statement, /page\.locator\("button\.submit"\)\.click\(\)/);
});

test('actionToStatement uses locatorExpression from normalized trace actions', () => {
  const statement = actionToStatement({
    class: 'Locator',
    method: 'click',
    params: {
      locatorExpression: 'page.getByRole("heading")',
      strict: true,
    },
    apiName: 'getByRole("heading").click',
  });

  assert.match(statement, /await page\.getByRole\("heading"\)\.click\(\{"strict":true\}\)/);
});

test('parseSessionResults validates session shape', () => {
  const value = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'demo',
    status: 'closed',
    browser: 'main',
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:01:00.000Z',
    capture: {
      trace: true,
      video: false,
      har: true,
      console: true,
      stepScreenshot: true,
    },
    steps: [
      {
        index: 0,
        name: 'open',
        startedAt: '2026-01-01T00:00:10.000Z',
        endedAt: '2026-01-01T00:00:20.000Z',
        success: true,
        error: null,
        dir: 'steps/000',
        artifacts: { trace: 'trace.zip' },
        actionCount: 2,
        exportedScript: 'exported.spec.js',
      },
    ],
  };

  assert.doesNotThrow(() => parseSessionResults(value));
  assert.equal(validateSessionResults({ ...value, id: 'not-a-uuid' }).success, false);
});

test('parseConsoleJsonl and summarizeConsole group levels', () => {
  const text = [
    '{"type":"log","text":"hello"}',
    '{"type":"error","text":"boom"}',
    '{"type":"pageerror","text":"uncaught"}',
    '{"type":"warning","text":"careful"}',
  ].join('\n');

  const summary = summarizeConsole(parseConsoleJsonl(text));
  assert.equal(summary.total, 4);
  assert.equal(summary.counts.error, 1);
  assert.equal(summary.counts.pageerror, 1);
  assert.equal(summary.counts.warning, 1);
});

test('summarizeHar extracts request rows', () => {
  const har = {
    log: {
      version: '1.2',
      entries: [
        {
          startedDateTime: '2026-01-01T00:00:00.000Z',
          request: { method: 'GET', url: 'https://example.com/' },
          response: {
            status: 200,
            statusText: 'OK',
            content: { size: 1256, mimeType: 'text/html' },
          },
          timings: { wait: 120, receive: 30 },
        },
        {
          request: { method: 'GET', url: 'https://example.com/missing' },
          response: { status: 404, content: { size: 0, mimeType: 'text/plain' } },
          timings: { wait: 50 },
        },
      ],
    },
  };

  const summary = summarizeHar(JSON.stringify(har));
  assert.equal(summary.total, 2);
  assert.equal(summary.failed, 1);
  assert.equal(summary.entries[0].method, 'GET');
  assert.equal(summary.entries[0].size, 1256);
  assert.equal(summary.entries[1].status, 404);
});

test('renderSessionReport produces self-contained html', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-report-'));
  try {
    const stepDir = join(root, 'steps', '000');
    await mkdir(stepDir, { recursive: true });
    await writeFile(join(stepDir, 'stdout.txt'), 'Example Domain\n');
    await writeFile(join(stepDir, 'stderr.txt'), '');
    await writeFile(join(stepDir, 'script.js'), 'await page.goto("https://example.com");');
    await writeFile(
      join(stepDir, 'console.jsonl'),
      '{"type":"log","text":"hi"}\n{"type":"error","text":"bad"}\n',
    );
    await writeFile(
      join(stepDir, 'network.har'),
      `${JSON.stringify({
        log: {
          version: '1.2',
          entries: [
            {
              request: { method: 'GET', url: 'https://example.com/' },
              response: { status: 200, content: { size: 100, mimeType: 'text/html' } },
              timings: { wait: 10 },
            },
          ],
        },
      })}\n`,
    );

    const results = parseSessionResults({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'render-test',
      status: 'closed',
      browser: null,
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:01:00.000Z',
      capture: {
        trace: true,
        video: false,
        har: true,
        console: true,
        stepScreenshot: true,
      },
      steps: [
        {
          index: 0,
          name: 'open',
          startedAt: '2026-01-01T00:00:10.000Z',
          endedAt: '2026-01-01T00:00:20.000Z',
          success: true,
          error: null,
          dir: 'steps/000',
          artifacts: { trace: 'trace.zip', screenshot: 'screenshot.png' },
        },
      ],
    });

    const html = await renderSessionReport(root, results);
    assert.match(html, /<html/i);
    assert.match(html, /render-test/);
    assert.match(html, /Example Domain/);
    assert.match(html, /PASS/);
    assert.match(html, /filmstrip/);
    assert.match(html, /Console \(2\)/);
    assert.match(html, /Network \(1\)/);
    assert.match(html, /data-level="error"/);
    assert.match(html, /har-entry/);
    assert.match(html, /step-tabs/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('renderSessionReportFile writes report.html and enriches results.json', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-report-'));
  try {
    const stepDir = join(root, 'steps', '000');
    await mkdir(stepDir, { recursive: true });
    const traceText = sampleTraceLines.map((line) => JSON.stringify(line)).join('\n');
    await writeFile(join(stepDir, 'stdout.txt'), 'ok\n');
    await writeFile(join(stepDir, 'stderr.txt'), '');
    await writeFile(join(stepDir, 'script.js'), 'await page.goto("https://example.com");');
    await writeFile(join(stepDir, 'console.jsonl'), '');
    await writeMinimalDeflateZip(join(stepDir, 'trace.zip'), { 'trace.trace': traceText });

    const results = parseSessionResults({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'full-report',
      status: 'closed',
      browser: null,
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:01:00.000Z',
      capture: {
        trace: true,
        video: false,
        har: true,
        console: true,
        stepScreenshot: true,
      },
      steps: [
        {
          index: 0,
          name: 'open',
          startedAt: '2026-01-01T00:00:10.000Z',
          endedAt: '2026-01-01T00:00:20.000Z',
          success: true,
          error: null,
          dir: 'steps/000',
          artifacts: { trace: 'trace.zip' },
        },
      ],
    });

    const { reportPath, results: enriched } = await renderSessionReportFile(root, results);
    assert.equal(reportPath, join(root, 'report.html'));
    assert.match(await readFile(reportPath, 'utf8'), /full-report/);
    assert.equal(enriched.steps[0].actionCount, 2);
    assert.equal(enriched.steps[0].exportedScript, 'exported.spec.js');
    await readFile(join(stepDir, 'exported.spec.js'), 'utf8');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
