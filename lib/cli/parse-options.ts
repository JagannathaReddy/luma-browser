import type { ExecuteRequest, SessionRunRequest } from '@jagannathamv/protocol';
import type { BuildExecutePayloadInput } from '../types.js';

const asString = (value) => value;

function asPositiveInt(name) {
  return (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${name} requires a positive number`);
    }
    return parsed;
  };
}

function asPort(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error('--port requires an integer between 0 and 65535');
  }
  return parsed;
}

const VALUE_FLAGS = [
  { flag: '--browser', target: 'browser', parse: asString },
  { flag: '--connect', target: 'connect', parse: asString },
  { flag: '--timeout', target: 'timeoutMs', parse: asPositiveInt('--timeout (ms)') },
  { flag: '--session', target: 'sessionId', parse: asString },
  { flag: '--step', target: 'step', parse: asString },
  { flag: '--name', target: 'name', parse: asString },
  { flag: '--port', target: 'port', parse: asPort },
];

const BOOLEAN_FLAGS = [
  { flag: '--verbose', target: 'verbose', value: true },
  { flag: '-v', target: 'verbose', value: true },
  { flag: '--headed', target: 'headless', value: false },
  { flag: '--headless', target: 'headless', value: true },
  { flag: '--ignore-https-errors', target: 'ignoreHTTPSErrors', value: true },
  { flag: '--render-report', target: 'renderReport', value: true },
  { flag: '--no-report', target: 'noReport', value: true },
  { flag: '--stop-daemon', target: 'stopDaemon', value: true },
  { flag: '--open', target: 'openViewer', value: true },
];

const NO_FLAGS = ['--no-trace', '--no-video', '--no-har', '--no-console', '--no-screenshot'];
const HELP_FLAGS = ['--help', '-h'];

const VALUE_FLAG_NAMES = new Set(VALUE_FLAGS.map((spec) => spec.flag));
const VALUE_FLAG_PREFIXES = VALUE_FLAGS.map((spec) => `${spec.flag}=`);
const BOOLEAN_FLAG_NAMES = new Set(BOOLEAN_FLAGS.map((spec) => spec.flag));

export const FLAG_ARGS = VALUE_FLAG_NAMES;

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

    const booleanSpec = BOOLEAN_FLAGS.find((spec) => spec.flag === arg);
    if (booleanSpec) {
      options[booleanSpec.target] = booleanSpec.value;
      continue;
    }

    const valueSpec = VALUE_FLAGS.find((spec) => spec.flag === arg);
    if (valueSpec) {
      options[valueSpec.target] = valueSpec.parse(argv[index + 1]);
      index += 1;
      continue;
    }

    const equalsSpec = VALUE_FLAGS.find((spec) => arg.startsWith(`${spec.flag}=`));
    if (equalsSpec) {
      options[equalsSpec.target] = equalsSpec.parse(arg.slice(equalsSpec.flag.length + 1));
    }
  }

  return options;
}

export function resolveRenderReport(options) {
  return !options.noReport;
}

export function filterFlags(argv) {
  const result: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (VALUE_FLAG_NAMES.has(arg)) {
      index += 1;
      continue;
    }

    if (VALUE_FLAG_PREFIXES.some((prefix) => arg.startsWith(prefix))) {
      continue;
    }

    if (BOOLEAN_FLAG_NAMES.has(arg) || NO_FLAGS.includes(arg) || HELP_FLAGS.includes(arg)) {
      continue;
    }

    result.push(arg);
  }

  return result;
}

export function buildExecutePayload({
  id,
  source,
  options,
  sessionId,
  step,
}: BuildExecutePayloadInput): ExecuteRequest | SessionRunRequest {
  const payload: Omit<ExecuteRequest, 'type'> = {
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
