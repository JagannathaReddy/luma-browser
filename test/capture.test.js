import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, it } from 'node:test';
import {
  ConsoleRecorder,
  NetworkHarRecorder,
  resolveCaptureOptions,
  writeSessionResults,
  writeStepArtifacts,
} from '../lib/session/capture.js';

function createMockEmitter() {
  const handlers = new Map();

  return {
    on(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event).add(handler);
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler);
    },
    emit(event, ...args) {
      for (const handler of handlers.get(event) ?? []) {
        handler(...args);
      }
    },
  };
}

describe('resolveCaptureOptions', () => {
  it('merges session defaults with per-run overrides', () => {
    const resolved = resolveCaptureOptions(
      { trace: true, video: true, har: true, console: true, stepScreenshot: true },
      { video: false, har: false },
    );

    assert.equal(resolved.trace, true);
    assert.equal(resolved.video, false);
    assert.equal(resolved.har, false);
    assert.equal(resolved.console, true);
  });
});

describe('writeStepArtifacts', () => {
  it('writes script, streams, and step metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'luma-step-'));
    try {
      const meta = await writeStepArtifacts(root, {
        script: "console.log('hi');",
        stdout: 'hi\n',
        stderr: '',
        artifacts: { trace: 'trace.zip' },
        stepMeta: {
          name: 'open',
          sessionId: 'sess-1',
          stepIndex: 0,
          success: true,
        },
      });

      assert.equal(meta.artifacts.trace, 'trace.zip');
      assert.equal(meta.artifacts.script, 'script.js');

      const script = await readFile(join(root, 'script.js'), 'utf8');
      assert.match(script, /console\.log\('hi'\)/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('writeSessionResults', () => {
  it('writes results.json for a closed session', async () => {
    const root = await mkdtemp(join(tmpdir(), 'luma-results-'));
    try {
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const meta = {
        id: sessionId,
        name: 'demo',
        status: 'closed',
        browser: 'default',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: '2026-01-01T00:01:00.000Z',
        capture: { trace: true, video: false, har: true, console: true, stepScreenshot: true },
        steps: [
          {
            name: 'open',
            startedAt: '2026-01-01T00:00:10.000Z',
            endedAt: '2026-01-01T00:00:20.000Z',
            success: true,
            artifacts: { trace: 'trace.zip' },
          },
        ],
      };

      const { path, results } = await writeSessionResults(root, meta);
      assert.equal(path, join(root, 'results.json'));
      assert.equal(results.steps.length, 1);
      assert.equal(results.steps[0].artifacts.trace, 'trace.zip');

      const raw = JSON.parse(await readFile(path, 'utf8'));
      assert.equal(raw.id, sessionId);
      assert.equal(raw.steps[0].dir, 'steps/000');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('ConsoleRecorder', () => {
  it('records console and pageerror events', async () => {
    const root = await mkdtemp(join(tmpdir(), 'luma-console-'));
    const page = createMockEmitter();
    page.url = () => 'https://example.com';

    const recorder = new ConsoleRecorder();
    recorder.attachToPage(page);

    page.emit('console', {
      type: () => 'log',
      text: () => 'hello',
      location: () => ({ url: 'https://example.com', lineNumber: 1, columnNumber: 1 }),
    });
    page.emit('pageerror', new Error('boom'));

    try {
      const path = join(root, 'console.jsonl');
      await recorder.write(path);
      const lines = (await readFile(path, 'utf8')).trim().split('\n');
      assert.equal(lines.length, 2);
      assert.match(lines[0], /"type":"log"/);
      assert.match(lines[1], /"type":"pageerror"/);
    } finally {
      recorder.dispose();
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('NetworkHarRecorder', () => {
  it('writes a HAR file from request/response events', async () => {
    const root = await mkdtemp(join(tmpdir(), 'luma-har-'));
    const page = createMockEmitter();

    const request = {
      method: () => 'GET',
      url: () => 'https://example.com/',
      headers: () => ({ accept: 'text/html' }),
    };

    const recorder = new NetworkHarRecorder();
    recorder.attachToPage(page);
    page.emit('request', request);
    page.emit('response', {
      request: () => request,
      status: () => 200,
      statusText: () => 'OK',
      headers: () => ({ 'content-type': 'text/html' }),
      body: async () => Buffer.from('<html></html>'),
    });

    try {
      const path = join(root, 'network.har');
      await recorder.write(path);
      const har = JSON.parse(await readFile(path, 'utf8'));
      assert.equal(har.log.version, '1.2');
      assert.equal(har.log.entries.length, 1);
      assert.equal(har.log.entries[0].response.status, 200);
    } finally {
      recorder.dispose();
      await rm(root, { recursive: true, force: true });
    }
  });
});
