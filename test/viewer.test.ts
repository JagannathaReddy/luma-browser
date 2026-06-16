import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { test } from 'node:test';
import { randomUUID } from 'crypto';
import { renderIndexHtml } from '../lib/viewer/index-page.js';
import { contentTypeForPath } from '../lib/viewer/mime.js';
import { isSessionId, resolveSessionFile } from '../lib/viewer/paths.js';
import { renderSessionDetailHtml } from '../lib/viewer/session-page.js';
import { createViewerServer } from '../lib/viewer/server.js';
import { loadSessionDetail } from '../lib/viewer/sessions.js';

test('isSessionId accepts uuid values', () => {
  assert.equal(isSessionId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isSessionId('../etc/passwd'), false);
});

test('resolveSessionFile blocks path traversal', () => {
  const root = '/tmp/sessions';
  const sessionId = '550e8400-e29b-41d4-a716-446655440000';
  const resolved = resolveSessionFile(root, sessionId, 'steps/000/screenshot.png');
  assert.equal(resolved, join(root, sessionId, 'steps/000/screenshot.png'));
  assert.throws(() => resolveSessionFile(root, sessionId, '../../secret.txt'));
});

test('renderIndexHtml lists sessions with report links', async () => {
  const html = await renderIndexHtml(
    [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'checkout',
        status: 'closed',
        stepCount: 2,
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: '2026-01-01T00:05:00.000Z',
        reportReady: true,
      },
    ],
    { sessionsDir: '/tmp/sessions' },
  );

  assert.match(html, /checkout/);
  assert.match(html, /View session/);
  assert.match(html, /Open report/);
  assert.match(html, /session-search/);
  assert.match(html, /550e8400-e29b-41d4-a716-446655440000/);
});

test('renderSessionDetailHtml shows steps, report embed, and trace helper', async () => {
  const sessionId = '550e8400-e29b-41d4-a716-446655440000';
  const html = await renderSessionDetailHtml(
    {
      id: sessionId,
      name: 'checkout',
      status: 'closed',
      browser: 'default',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:05:00.000Z',
      dir: `/tmp/sessions/${sessionId}`,
      reportReady: true,
      resultsReady: true,
      steps: [
        {
          index: 0,
          name: 'open',
          startedAt: '2026-01-01T00:00:10.000Z',
          endedAt: '2026-01-01T00:00:20.000Z',
          success: true,
          error: null,
          dir: 'steps/000',
          artifacts: { trace: 'trace.zip', har: 'network.har' },
          actionCount: 3,
        },
      ],
    },
    { sessionsDir: '/tmp/sessions' },
  );

  assert.match(html, /checkout/);
  assert.match(html, /report-frame/);
  assert.match(html, /playwright show-trace/);
  assert.match(html, /trace\.zip/);
  assert.match(html, /network\.har/);
  assert.match(html, /PASS/);
});

test('contentTypeForPath maps common artifact extensions', () => {
  assert.equal(contentTypeForPath('report.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeForPath('shot.png'), 'image/png');
  assert.equal(contentTypeForPath('trace.zip'), 'application/zip');
});

test('viewer server serves index and session artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-viewer-'));
  const sessionId = randomUUID();
  const sessionDir = join(root, sessionId);
  const stepDir = join(sessionDir, 'steps', '000');

  try {
    await mkdir(stepDir, { recursive: true });
    await writeFile(join(sessionDir, 'report.html'), '<html><body>report</body></html>');
    await writeFile(join(stepDir, 'stdout.txt'), 'Example Domain');
    await writeFile(
      join(sessionDir, 'meta.json'),
      `${JSON.stringify({
        id: sessionId,
        name: 'viewer-test',
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
      })}\n`,
    );
    await writeFile(
      join(sessionDir, 'results.json'),
      `${JSON.stringify({
        id: sessionId,
        name: 'viewer-test',
        status: 'closed',
        browser: 'default',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: '2026-01-01T00:01:00.000Z',
        capture: { trace: true, video: false, har: true, console: true, stepScreenshot: true },
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
      })}\n`,
    );

    const token = 'test-token-abc123';
    const viewer = await createViewerServer({ sessionsRoot: root, port: 0, token });
    try {
      const unauth = await fetch(`${viewer.url}/`);
      assert.equal(unauth.status, 401);

      const indexResponse = await fetch(`${viewer.url}/?t=${token}`);
      assert.equal(indexResponse.status, 200);
      const setCookie = indexResponse.headers.get('set-cookie') ?? '';
      assert.match(setCookie, /luma_t=test-token-abc123/);
      const indexHtml = await indexResponse.text();
      assert.match(indexHtml, /viewer-test/);
      assert.match(indexHtml, /session-search/);

      const cookieHeader = { cookie: `luma_t=${token}` };
      const detailResponse = await fetch(`${viewer.url}/session/${sessionId}/`, {
        headers: cookieHeader,
      });
      assert.equal(detailResponse.status, 200);
      const detailHtml = await detailResponse.text();
      assert.match(detailHtml, /viewer-test/);
      assert.match(detailHtml, /playwright show-trace/);
      assert.match(detailHtml, /report-frame/);

      const detail = await loadSessionDetail(root, sessionId);
      assert.equal(detail.name, 'viewer-test');
      assert.equal(detail.steps.length, 1);
      assert.equal(detail.steps[0].artifacts.trace, 'trace.zip');

      const reportResponse = await fetch(`${viewer.url}/session/${sessionId}/report.html`, {
        headers: cookieHeader,
      });
      assert.equal(reportResponse.status, 200);
      assert.match(await reportResponse.text(), /report/);

      const artifactResponse = await fetch(
        `${viewer.url}/session/${sessionId}/steps/000/stdout.txt`,
        { headers: cookieHeader },
      );
      assert.equal(artifactResponse.status, 200);
      assert.equal(await artifactResponse.text(), 'Example Domain');
    } finally {
      await viewer.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
