export const FLAG_ARGS = new Set([
  '--browser',
  '--connect',
  '--timeout',
  '--session',
  '--step',
  '--name',
  '--port',
]);

export function parseCaptureFlags(argv) {
  const capture = {
    trace: true,
    video: true,
    har: true,
    console: true,
    stepScreenshot: true,
  };

  for (const arg of argv) {
    if (arg === '--no-trace') capture.trace = false;
    if (arg === '--no-video') capture.video = false;
    if (arg === '--no-har') capture.har = false;
    if (arg === '--no-console') capture.console = false;
    if (arg === '--no-screenshot') capture.stepScreenshot = false;
  }

  const hasOverride = argv.some((arg) => arg.startsWith('--no-'));
  return hasOverride ? capture : undefined;
}

export function parseOptions(argv) {
  const options = {
    browser: 'default',
    connect: undefined,
    headless: true,
    ignoreHTTPSErrors: false,
    timeoutMs: undefined,
    verbose: false,
    sessionId: undefined,
    step: undefined,
    name: undefined,
    port: undefined,
    renderReport: false,
    noReport: false,
    stopDaemon: false,
    openViewer: false,
    capture: parseCaptureFlags(argv),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
      continue;
    }

    if (arg === '--headed') {
      options.headless = false;
      continue;
    }

    if (arg === '--headless') {
      options.headless = true;
      continue;
    }

    if (arg === '--ignore-https-errors') {
      options.ignoreHTTPSErrors = true;
      continue;
    }

    if (arg === '--render-report') {
      options.renderReport = true;
      continue;
    }

    if (arg === '--no-report') {
      options.noReport = true;
      continue;
    }

    if (arg === '--stop-daemon') {
      options.stopDaemon = true;
      continue;
    }

    if (arg === '--open') {
      options.openViewer = true;
      continue;
    }

    if (arg === '--timeout') {
      const value = Number.parseInt(argv[index + 1], 10);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('--timeout requires a positive number of milliseconds');
      }
      options.timeoutMs = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--timeout=')) {
      const value = Number.parseInt(arg.slice('--timeout='.length), 10);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('--timeout requires a positive number of milliseconds');
      }
      options.timeoutMs = value;
      continue;
    }

    if (arg === '--browser') {
      options.browser = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--browser=')) {
      options.browser = arg.slice('--browser='.length);
      continue;
    }

    if (arg === '--connect') {
      options.connect = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--connect=')) {
      options.connect = arg.slice('--connect='.length);
      continue;
    }

    if (arg === '--session') {
      options.sessionId = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--session=')) {
      options.sessionId = arg.slice('--session='.length);
      continue;
    }

    if (arg === '--step') {
      options.step = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--step=')) {
      options.step = arg.slice('--step='.length);
      continue;
    }

    if (arg === '--name') {
      options.name = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--name=')) {
      options.name = arg.slice('--name='.length);
      continue;
    }

    if (arg === '--port') {
      options.port = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg.startsWith('--port=')) {
      options.port = Number.parseInt(arg.slice('--port='.length), 10);
    }
  }

  return options;
}

export function resolveRenderReport(options) {
  if (options.noReport) {
    return false;
  }

  return true;
}

export function filterFlags(argv) {
  const result = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (FLAG_ARGS.has(arg)) {
      index += 1;
      continue;
    }

    if (
      arg.startsWith('--browser=') ||
      arg.startsWith('--connect=') ||
      arg.startsWith('--timeout=') ||
      arg.startsWith('--session=') ||
      arg.startsWith('--step=') ||
      arg.startsWith('--name=') ||
      arg.startsWith('--port=')
    ) {
      continue;
    }

    if (
      arg === '--headless' ||
      arg === '--headed' ||
      arg === '--ignore-https-errors' ||
      arg === '--timeout' ||
      arg === '--verbose' ||
      arg === '-v' ||
      arg === '--render-report' ||
      arg === '--no-report' ||
      arg === '--stop-daemon' ||
      arg === '--open' ||
      arg === '--no-trace' ||
      arg === '--no-video' ||
      arg === '--no-har' ||
      arg === '--no-console' ||
      arg === '--no-screenshot' ||
      arg === '--help' ||
      arg === '-h'
    ) {
      continue;
    }

    result.push(arg);
  }

  return result;
}

export function buildExecutePayload({ id, source, options, sessionId, step }) {
  const payload = {
    id,
    browser: options.browser,
    script: source,
    headless: options.headless,
    ignoreHTTPSErrors: options.ignoreHTTPSErrors,
    connect: options.connect,
  };

  if (options.timeoutMs !== undefined) {
    payload.timeoutMs = options.timeoutMs;
  }

  if (options.capture) {
    payload.capture = options.capture;
  }

  if (sessionId && step) {
    return {
      ...payload,
      type: 'session-run',
      sessionId,
      step,
    };
  }

  if (sessionId) {
    payload.sessionId = sessionId;
  }

  if (step) {
    payload.step = step;
  }

  return {
    ...payload,
    type: 'execute',
  };
}
