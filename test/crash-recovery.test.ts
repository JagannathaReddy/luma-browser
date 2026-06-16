import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { test } from 'node:test';
import { SessionManager } from '../lib/session/session-manager.js';

test('recoverOrphanedSteps marks open steps with endedAt=null', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-crash-'));
  try {
    const sessionId = 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa';
    await mkdir(join(root, sessionId), { recursive: true });
    await writeFile(
      join(root, sessionId, 'meta.json'),
      JSON.stringify({
        id: sessionId,
        name: 'crashtest',
        browser: 'default',
        status: 'open',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
        capture: { trace: true, video: false, har: true, console: true, stepScreenshot: true },
        steps: [
          {
            name: 'in-flight',
            startedAt: '2026-01-01T00:00:01.000Z',
            endedAt: null,
            success: null,
            artifacts: {},
          },
          {
            name: 'already-done',
            startedAt: '2026-01-01T00:00:02.000Z',
            endedAt: '2026-01-01T00:00:03.000Z',
            success: true,
            artifacts: {},
          },
        ],
      }),
    );

    const manager = new SessionManager({ sessionsRoot: root });
    const result = await manager.recoverOrphanedSteps();
    assert.equal(result.recoveredSteps, 1);
    assert.equal(result.affectedSessions, 1);

    const meta = JSON.parse(await readFile(join(root, sessionId, 'meta.json'), 'utf8'));
    assert.equal(meta.steps[0].recovered, true);
    assert.equal(meta.steps[0].success, null);
    assert.equal(meta.steps[0].error, 'daemon restarted mid-step');
    assert.ok(meta.steps[0].endedAt);
    assert.equal(meta.steps[1].success, true);
    assert.equal(meta.steps[1].recovered, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('recoverOrphanedSteps skips closed sessions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-crash-'));
  try {
    const sessionId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
    await mkdir(join(root, sessionId), { recursive: true });
    await writeFile(
      join(root, sessionId, 'meta.json'),
      JSON.stringify({
        id: sessionId,
        name: 'done',
        browser: 'default',
        status: 'closed',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: '2026-01-01T00:00:01.000Z',
        capture: { trace: true, video: false, har: true, console: true, stepScreenshot: true },
        steps: [
          {
            name: 'leftover',
            startedAt: '2026-01-01T00:00:01.000Z',
            endedAt: null,
            success: null,
            artifacts: {},
          },
        ],
      }),
    );

    const manager = new SessionManager({ sessionsRoot: root });
    const result = await manager.recoverOrphanedSteps();
    assert.equal(result.recoveredSteps, 0);
    assert.equal(result.affectedSessions, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
