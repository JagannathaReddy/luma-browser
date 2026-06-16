import type { WriteStream } from 'node:fs';

const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
} as const;

type LogLevel = keyof typeof LEVELS;

function resolveLevel(): number {
  const raw = process.env.LUMA_BROWSER_LOG_LEVEL ?? process.env.LUMA_LOG_LEVEL ?? 'info';
  return LEVELS[raw as LogLevel] ?? LEVELS.info;
}

let currentLevel = resolveLevel();
let verbose = false;
let logFileStream: WriteStream | null = null;

export function setLogFile(stream: WriteStream | null): void {
  logFileStream = stream;
}

export function setVerbose(enabled: boolean): void {
  verbose = enabled;
  if (enabled && currentLevel > LEVELS.debug) {
    currentLevel = LEVELS.debug;
  }
}

function write(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
  const numeric = LEVELS[level] ?? LEVELS.info;
  if (numeric < currentLevel) {
    return;
  }

  const payload = {
    time: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };

  process.stderr.write(`${JSON.stringify(payload)}\n`);
  if (logFileStream && !logFileStream.destroyed) {
    logFileStream.write(`${JSON.stringify(payload)}\n`);
  }
}

export const logger = {
  trace: (message: string, fields?: Record<string, unknown>) => write('trace', message, fields),
  debug: (message: string, fields?: Record<string, unknown>) => write('debug', message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write('error', message, fields),
  isVerbose: () => verbose,
};
