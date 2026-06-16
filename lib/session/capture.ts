import { createReadStream, createWriteStream } from 'fs';
import { mkdir, readdir, rename, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import type { BrowserContext, Page } from 'playwright';
import type { CaptureOptions } from '@jagannathamv/protocol';
import { HAR_BINARY_MIME_PREFIXES, LIMITS } from '../limits.js';
import { logger } from '../logger.js';
import { parseSessionResults } from './results-schema.js';
import type { StepArtifacts, StepCapturePipelineOptions } from './types.js';
import { getPackageVersion } from '../version.js';

export const ARTIFACT_NAMES = {
  trace: 'trace.zip',
  video: 'video.webm',
  har: 'network.har',
  console: 'console.jsonl',
  screenshot: 'screenshot.png',
  script: 'script.js',
  stdout: 'stdout.txt',
  stderr: 'stderr.txt',
  stepMeta: 'step.json',
};

function timestamp() {
  return new Date().toISOString();
}

function appendListener(target, event, handler) {
  target.on(event, handler);
  return () => target.off(event, handler);
}

interface HarEntry {
  startedDateTime: string;
  request: { method: string; url: string; headers: Record<string, string> };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    content: {
      size: number;
      mimeType: string;
      omitted?: string;
      text?: string;
      encoding?: string;
    };
  } | null;
  timings: { wait: number; receive: number };
}

interface ConsoleLine {
  type: string;
  text: string;
  timestamp: string;
  pageUrl: string;
  location?: unknown;
}

export class NetworkHarRecorder {
  #entries: Map<string, HarEntry> = new Map();
  #requestIds: WeakMap<object, string> = new WeakMap();
  #cleanups: Array<() => void> = [];

  attachToPage(page) {
    const onRequest = (request) => {
      const id = `${Date.now()}-${Math.random()}`;
      this.#requestIds.set(request, id);
      this.#entries.set(id, {
        startedDateTime: timestamp(),
        request: {
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
        },
        response: null,
        timings: { wait: 0, receive: 0 },
      });
    };

    const onResponse = async (response) => {
      const request = response.request();
      const id = this.#requestIds.get(request);
      if (!id) {
        return;
      }
      const entry = this.#entries.get(id);
      if (!entry) {
        return;
      }
      const mimeType = response.headers()['content-type'] ?? 'application/octet-stream';
      entry.response = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        content: { size: 0, mimeType },
      };

      if (HAR_BINARY_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
        entry.response.content.omitted = 'binary';
        return;
      }

      const declared = Number(response.headers()['content-length']);
      if (Number.isFinite(declared) && declared > LIMITS.harBodyBytes) {
        entry.response.content.size = declared;
        entry.response.content.omitted = 'too-large';
        return;
      }

      try {
        const body = await response.body();
        if (body.length > LIMITS.harBodyBytes) {
          entry.response.content.size = body.length;
          entry.response.content.omitted = 'too-large';
          return;
        }
        entry.response.content.size = body.length;
        entry.response.content.text = body.toString('base64');
        entry.response.content.encoding = 'base64';
      } catch {
        entry.response.content.omitted = 'unavailable';
      }
    };

    this.#cleanups.push(appendListener(page, 'request', onRequest));
    this.#cleanups.push(appendListener(page, 'response', onResponse));
  }

  attachToContext(context) {
    const attachPage = (page) => this.attachToPage(page);
    for (const page of context.pages()) {
      attachPage(page);
    }
    this.#cleanups.push(appendListener(context, 'page', attachPage));
  }

  async write(path) {
    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'luma-browser',
          version: getPackageVersion(),
        },
        entries: [...this.#entries.values()],
      },
    };

    await writeFile(path, `${JSON.stringify(har, null, 2)}\n`);
  }

  dispose() {
    for (const cleanup of this.#cleanups) {
      cleanup();
    }
    this.#cleanups.length = 0;
    this.#entries.clear();
  }
}

export class ConsoleRecorder {
  #lines: ConsoleLine[] = [];
  #cleanups: Array<() => void> = [];

  attachToPage(page) {
    const onConsole = (message) => {
      this.#lines.push({
        type: message.type(),
        text: message.text(),
        timestamp: timestamp(),
        pageUrl: page.url(),
        location: message.location(),
      });
    };

    const onPageError = (error) => {
      this.#lines.push({
        type: 'pageerror',
        text: error.message,
        timestamp: timestamp(),
        pageUrl: page.url(),
      });
    };

    this.#cleanups.push(appendListener(page, 'console', onConsole));
    this.#cleanups.push(appendListener(page, 'pageerror', onPageError));
  }

  attachToContext(context) {
    const attachPage = (page) => this.attachToPage(page);
    for (const page of context.pages()) {
      attachPage(page);
    }
    this.#cleanups.push(appendListener(context, 'page', attachPage));
  }

  async write(path) {
    if (this.#lines.length === 0) {
      await writeFile(path, '');
      return;
    }

    await writeFile(path, `${this.#lines.map((line) => JSON.stringify(line)).join('\n')}\n`);
  }

  dispose() {
    for (const cleanup of this.#cleanups) {
      cleanup();
    }
    this.#cleanups.length = 0;
    this.#lines.length = 0;
  }
}

export class StepCapturePipeline {
  #context: BrowserContext;
  #stepDir: string;
  #capture: Required<CaptureOptions> | CaptureOptions;
  #primaryPage: Page | null;
  #harRecorder: NetworkHarRecorder | undefined;
  #consoleRecorder: ConsoleRecorder | undefined;
  #tracingActive = false;
  #videoDir: string | null;
  #videoBefore: Set<string> = new Set();

  constructor({ context, stepDir, capture, primaryPage, videoDir }: StepCapturePipelineOptions) {
    this.#context = context;
    this.#stepDir = stepDir;
    this.#capture = capture ?? ({} as Required<CaptureOptions>);
    this.#primaryPage = primaryPage ?? null;
    this.#videoDir = videoDir ?? null;
  }

  setPrimaryPage(page: Page | null) {
    this.#primaryPage = page ?? null;
  }

  async start() {
    await mkdir(this.#stepDir, { recursive: true });

    if (this.#capture.har) {
      this.#harRecorder = new NetworkHarRecorder();
      this.#harRecorder.attachToContext(this.#context);
    }

    if (this.#capture.console) {
      this.#consoleRecorder = new ConsoleRecorder();
      this.#consoleRecorder.attachToContext(this.#context);
    }

    if (this.#capture.trace) {
      await this.#context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
      this.#tracingActive = true;
    }

    if (this.#capture.video && this.#videoDir) {
      this.#videoBefore = new Set(await listVideoFiles(this.#videoDir));
    }
  }

  async stop() {
    const artifacts: StepArtifacts = {};

    if (this.#tracingActive) {
      const tracePath = join(this.#stepDir, ARTIFACT_NAMES.trace);
      await this.#context.tracing.stop({ path: tracePath });
      artifacts.trace = ARTIFACT_NAMES.trace;
      this.#tracingActive = false;
    }

    if (this.#capture.stepScreenshot && this.#primaryPage) {
      const screenshotPath = join(this.#stepDir, ARTIFACT_NAMES.screenshot);
      await this.#primaryPage
        .screenshot({ path: screenshotPath, fullPage: false })
        .catch(() => undefined);
      artifacts.screenshot = ARTIFACT_NAMES.screenshot;
    }

    if (this.#harRecorder) {
      const harPath = join(this.#stepDir, ARTIFACT_NAMES.har);
      await this.#harRecorder.write(harPath);
      artifacts.har = ARTIFACT_NAMES.har;
      this.#harRecorder.dispose();
      this.#harRecorder = undefined;
    }

    if (this.#consoleRecorder) {
      const consolePath = join(this.#stepDir, ARTIFACT_NAMES.console);
      await this.#consoleRecorder.write(consolePath);
      artifacts.console = ARTIFACT_NAMES.console;
      this.#consoleRecorder.dispose();
      this.#consoleRecorder = undefined;
    }

    if (this.#capture.video && this.#videoDir) {
      const videoPath = await collectNewVideo(this.#videoDir, this.#videoBefore, this.#stepDir);
      if (videoPath) {
        artifacts.video = ARTIFACT_NAMES.video;
      }
    }

    return artifacts;
  }

  async abort() {
    if (this.#tracingActive) {
      await this.#context.tracing.stop().catch(() => undefined);
      this.#tracingActive = false;
    }

    this.#harRecorder?.dispose();
    this.#harRecorder = undefined;
    this.#consoleRecorder?.dispose();
    this.#consoleRecorder = undefined;
  }
}

async function listVideoFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.webm'))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function collectNewVideo(videoDir, before, stepDir) {
  const after = await listVideoFiles(videoDir);
  const created = after.filter((name) => !before.has(name));
  if (created.length === 0) {
    return null;
  }

  const source = join(videoDir, created[created.length - 1]);
  const destination = join(stepDir, ARTIFACT_NAMES.video);
  await rename(source, destination).catch(async () => {
    await copyFile(source, destination);
  });
  return destination;
}

function copyFile(source, destination) {
  return new Promise<void>((resolve, reject) => {
    createReadStream(source)
      .pipe(createWriteStream(destination))
      .on('finish', resolve)
      .on('error', reject);
  });
}

export async function writeStepArtifacts(stepDir, { script, stdout, stderr, artifacts, stepMeta }) {
  await mkdir(stepDir, { recursive: true });

  if (script != null) {
    await writeFile(join(stepDir, ARTIFACT_NAMES.script), script);
  }

  if (stdout != null) {
    await writeFile(join(stepDir, ARTIFACT_NAMES.stdout), stdout);
  }

  if (stderr != null) {
    await writeFile(join(stepDir, ARTIFACT_NAMES.stderr), stderr);
  }

  const totalBytes = await measureDirBytes(stepDir);
  const oversized = totalBytes > LIMITS.artifactBytes;
  if (oversized) {
    logger.warn('step artifacts exceed configured cap', {
      stepDir,
      totalBytes,
      capBytes: LIMITS.artifactBytes,
    });
  }

  const meta = {
    ...stepMeta,
    artifacts: {
      ...(stepMeta?.artifacts ?? {}),
      ...(artifacts ?? {}),
      script: ARTIFACT_NAMES.script,
      stdout: ARTIFACT_NAMES.stdout,
      stderr: ARTIFACT_NAMES.stderr,
    },
    artifactBytes: totalBytes,
    ...(oversized ? { oversized: true } : {}),
  };

  await writeFile(join(stepDir, ARTIFACT_NAMES.stepMeta), `${JSON.stringify(meta, null, 2)}\n`);
  return meta;
}

async function measureDirBytes(dir) {
  let total = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.isFile()) {
      try {
        const info = await stat(join(dir, entry.name));
        total += info.size;
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return total;
}

export function resolveCaptureOptions(sessionCapture, requestCapture) {
  const merged = {
    ...(sessionCapture ?? {}),
    ...(requestCapture ?? {}),
  };

  return {
    trace: merged.trace !== false,
    video: merged.video !== false,
    har: merged.har !== false,
    console: merged.console !== false,
    stepScreenshot: merged.stepScreenshot !== false,
  };
}

export async function writeSessionResults(sessionDir, meta) {
  const results = parseSessionResults({
    id: meta.id,
    name: meta.name,
    status: meta.status,
    browser: meta.browser ?? null,
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
    capture: meta.capture,
    steps: meta.steps.map((step, index) => ({
      index,
      name: step.name,
      startedAt: step.startedAt,
      endedAt: step.endedAt,
      success: step.success,
      error: step.error ?? null,
      dir: join('steps', String(index).padStart(3, '0')),
      artifacts: step.artifacts ?? {},
    })),
  });

  const path = join(sessionDir, 'results.json');
  await writeFile(path, `${JSON.stringify(results, null, 2)}\n`);
  return { path, results };
}
