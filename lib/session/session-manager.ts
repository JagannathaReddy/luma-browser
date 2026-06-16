import { randomUUID } from 'crypto';
import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { CaptureOptions, SessionListEntry } from '@jagannathamv/protocol';
import { logger } from '../logger.js';
import { sessionsDir } from '../paths.js';
import { writeSessionResults } from './capture.js';
import { renderSessionReportFile } from '../report/render-session-report.js';
import type {
  SessionFinalizeOptions,
  SessionManagerOptions,
  SessionStartOptions,
  StepFinishOptions,
} from './types.js';

const META_FILE = 'meta.json';

export function defaultCaptureOptions(overrides: CaptureOptions = {}): Required<CaptureOptions> {
  return {
    trace: overrides.trace !== false,
    video: overrides.video !== false,
    har: overrides.har !== false,
    console: overrides.console !== false,
    stepScreenshot: overrides.stepScreenshot !== false,
  };
}

export class SessionManager {
  #sessionsRoot;

  constructor({ sessionsRoot = sessionsDir }: SessionManagerOptions = {}) {
    this.#sessionsRoot = sessionsRoot;
  }

  #dir(sessionId) {
    return join(this.#sessionsRoot, sessionId);
  }

  async #readMeta(sessionId) {
    const raw = await readFile(join(this.#dir(sessionId), META_FILE), 'utf8');
    return JSON.parse(raw);
  }

  async #writeMeta(sessionId, meta) {
    await writeFile(join(this.#dir(sessionId), META_FILE), `${JSON.stringify(meta, null, 2)}\n`);
  }

  async startSession({ name, browser, capture }: SessionStartOptions = {}) {
    await mkdir(this.#sessionsRoot, { recursive: true });

    const sessionId = randomUUID();
    const dir = this.#dir(sessionId);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, 'steps'), { recursive: true });
    await mkdir(join(dir, 'videos'), { recursive: true });

    const meta = {
      id: sessionId,
      name: name ?? null,
      browser: browser ?? 'default',
      status: 'open',
      startedAt: new Date().toISOString(),
      endedAt: null,
      capture: defaultCaptureOptions(capture ?? {}),
      steps: [],
    };

    await this.#writeMeta(sessionId, meta);
    return { sessionId, dir, browser: meta.browser, capture: meta.capture };
  }

  async getSessionMeta(sessionId) {
    return this.#readMeta(sessionId);
  }

  videoDir(sessionId) {
    return join(this.#dir(sessionId), 'videos');
  }

  async recoverOrphanedSteps() {
    await mkdir(this.#sessionsRoot, { recursive: true });
    let entries;
    try {
      entries = await readdir(this.#sessionsRoot, { withFileTypes: true });
    } catch {
      return { recoveredSteps: 0, affectedSessions: 0 };
    }

    let recoveredSteps = 0;
    let affectedSessions = 0;

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      let meta;
      try {
        meta = await this.#readMeta(entry.name);
      } catch {
        continue;
      }

      if (meta.status !== 'open') {
        continue;
      }

      let changed = false;
      const recoveredAt = new Date().toISOString();
      for (const step of meta.steps ?? []) {
        if (step.endedAt == null) {
          step.endedAt = recoveredAt;
          step.success = null;
          step.error = 'daemon restarted mid-step';
          step.recovered = true;
          changed = true;
          recoveredSteps += 1;
        }
      }

      if (changed) {
        await this.#writeMeta(entry.name, meta);
        affectedSessions += 1;
      }
    }

    if (recoveredSteps > 0) {
      logger.info('recovered orphaned steps', { recoveredSteps, affectedSessions });
    }

    return { recoveredSteps, affectedSessions };
  }

  async listSessions(): Promise<SessionListEntry[]> {
    await mkdir(this.#sessionsRoot, { recursive: true });
    const entries = await readdir(this.#sessionsRoot, { withFileTypes: true });
    const sessions: SessionListEntry[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      try {
        const meta = await this.#readMeta(entry.name);
        sessions.push({
          id: meta.id,
          name: meta.name,
          status: meta.status,
          startedAt: meta.startedAt,
          endedAt: meta.endedAt,
          stepCount: meta.steps?.length ?? 0,
          dir: this.#dir(entry.name),
        });
      } catch {
        // Skip invalid session directories.
      }
    }

    return sessions.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  async endSession(sessionId, { renderReport = true }: SessionFinalizeOptions = {}) {
    return this.#finalizeSession(sessionId, 'closed', { renderReport });
  }

  async abortSession(sessionId, { renderReport = false }: SessionFinalizeOptions = {}) {
    const meta = await this.#readMeta(sessionId);
    if (meta.status !== 'open') {
      throw new Error(`Session "${sessionId}" is not open`);
    }

    return this.#finalizeSession(sessionId, 'aborted', { renderReport });
  }

  async #finalizeSession(sessionId, status, { renderReport = false }: SessionFinalizeOptions = {}) {
    const meta = await this.#readMeta(sessionId);
    meta.status = status;
    meta.endedAt = new Date().toISOString();
    await this.#writeMeta(sessionId, meta);

    const dir = this.#dir(sessionId);
    const { path: resultsPath, results } = await writeSessionResults(dir, meta);

    let reportPath: string | null = null;
    if (renderReport) {
      const rendered = await renderSessionReportFile(dir, results);
      reportPath = rendered.reportPath;
    }

    return {
      sessionId,
      dir,
      status: meta.status,
      renderReport,
      reportPath,
      resultsPath,
      reportReady: Boolean(reportPath),
    };
  }

  async beginStep(sessionId, stepName) {
    const meta = await this.#readMeta(sessionId);
    if (meta.status !== 'open') {
      throw new Error(`Session "${sessionId}" is not open`);
    }

    const step = {
      name: stepName,
      startedAt: new Date().toISOString(),
      endedAt: null,
      success: null,
      artifacts: {},
    };

    meta.steps.push(step);
    await this.#writeMeta(sessionId, meta);

    const stepIndex = meta.steps.length - 1;
    const stepDir = join(this.#dir(sessionId), 'steps', String(stepIndex).padStart(3, '0'));
    await mkdir(stepDir, { recursive: true });

    return { stepIndex, stepDir, capture: meta.capture };
  }

  async finishStep(sessionId, stepIndex, { success, error, artifacts }: StepFinishOptions) {
    const meta = await this.#readMeta(sessionId);
    const step = meta.steps[stepIndex];
    if (!step) {
      throw new Error(`Step index ${stepIndex} not found in session "${sessionId}"`);
    }

    step.endedAt = new Date().toISOString();
    step.success = success ?? true;
    if (error) {
      step.error = error;
    }
    if (artifacts) {
      step.artifacts = artifacts;
    }

    await this.#writeMeta(sessionId, meta);
  }
}
