import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../lib/session/session-manager.js';

test('SessionManager start/list/end lifecycle', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-sessions-'));
  try {
    const manager = new SessionManager({ sessionsRoot: root });
    const started = await manager.startSession({ name: 'demo' });
    assert.ok(started.sessionId);
    assert.equal(started.capture.trace, true);

    const { stepIndex, stepDir } = await manager.beginStep(started.sessionId, 'open');
    assert.equal(stepIndex, 0);
    assert.match(stepDir, /steps[/\\]000$/);

    await manager.finishStep(started.sessionId, stepIndex, { success: true });

    const sessions = await manager.listSessions();
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].name, 'demo');
    assert.equal(sessions[0].stepCount, 1);

    const ended = await manager.endSession(started.sessionId);
    assert.equal(ended.status, 'closed');
    assert.ok(ended.resultsPath);
    assert.ok(ended.reportPath);
    assert.equal(ended.reportReady, true);

    const withoutReport = await manager.startSession({ name: 'skip-report' });
    await manager.beginStep(withoutReport.sessionId, 'open');
    await manager.finishStep(withoutReport.sessionId, 0, { success: true });
    const endedNoReport = await manager.endSession(withoutReport.sessionId, {
      renderReport: false,
    });
    assert.equal(endedNoReport.reportPath, null);
    assert.equal(endedNoReport.reportReady, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('SessionManager abortSession marks session aborted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-sessions-'));
  try {
    const manager = new SessionManager({ sessionsRoot: root });
    const started = await manager.startSession({ name: 'cancelled' });
    await manager.beginStep(started.sessionId, 'open');
    await manager.finishStep(started.sessionId, 0, { success: true });

    const aborted = await manager.abortSession(started.sessionId);
    assert.equal(aborted.status, 'aborted');
    assert.ok(aborted.resultsPath);
    assert.equal(aborted.reportPath, null);

    await assert.rejects(() => manager.abortSession(started.sessionId), /not open/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
