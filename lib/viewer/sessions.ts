import { access, readFile } from 'fs/promises';
import { join } from 'path';
import { SessionManager } from '../session/session-manager.js';
import { validateSessionResults } from '../session/results-schema.js';
import { fileExists } from './paths.js';

function buildStepsFromMeta(meta) {
  return (meta.steps ?? []).map((step, index) => ({
    index,
    name: step.name,
    startedAt: step.startedAt,
    endedAt: step.endedAt ?? null,
    success: step.success ?? null,
    error: step.error ?? null,
    dir: join('steps', String(index).padStart(3, '0')),
    artifacts: step.artifacts ?? {},
  }));
}

export async function listViewerSessions(sessionsRoot) {
  const manager = new SessionManager({ sessionsRoot });
  const sessions = await manager.listSessions();

  return Promise.all(
    sessions.map(async (session) => {
      const reportPath = join(session.dir, 'report.html');
      const resultsPath = join(session.dir, 'results.json');
      let reportReady = false;
      let resultsReady = false;

      try {
        await access(reportPath);
        reportReady = true;
      } catch {
        reportReady = false;
      }

      try {
        await access(resultsPath);
        resultsReady = true;
      } catch {
        resultsReady = false;
      }

      return {
        ...session,
        reportReady,
        resultsReady,
        reportPath,
        resultsPath,
      };
    }),
  );
}

export async function loadSessionDetail(sessionsRoot, sessionId) {
  const manager = new SessionManager({ sessionsRoot });
  const meta = await manager.getSessionMeta(sessionId);
  const dir = join(sessionsRoot, sessionId);
  const reportReady = await fileExists(join(dir, 'report.html'));
  const resultsReady = await fileExists(join(dir, 'results.json'));

  let steps = buildStepsFromMeta(meta);

  if (resultsReady) {
    try {
      const parsed = validateSessionResults(
        JSON.parse(await readFile(join(dir, 'results.json'), 'utf8')),
      );
      if (parsed.success) {
        steps = parsed.data.steps;
      }
    } catch {
      // Fall back to meta-derived steps.
    }
  }

  return {
    id: meta.id,
    name: meta.name,
    status: meta.status,
    browser: meta.browser ?? null,
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
    capture: meta.capture,
    dir,
    reportReady,
    resultsReady,
    steps,
  };
}
