import { homedir, platform } from 'node:os';
import { basename, join } from 'node:path';

export const dataDir = join(homedir(), '.luma-browser');
export const tempDir = join(dataDir, 'tmp');
export const browsersDir = join(dataDir, 'browsers');
export const sessionsDir = join(dataDir, 'sessions');
export const pidPath = join(dataDir, 'daemon.pid');
export const daemonLogPath = join(dataDir, 'daemon.log');

export function sessionDir(sessionId: string): string {
  return join(sessionsDir, sessionId);
}

export function getSocketPath(): string {
  if (platform() === 'win32') {
    const username = sanitizePipeSegment(
      process.env.USERNAME || process.env.USER || basename(homedir()) || 'user',
    );
    return `\\\\.\\pipe\\luma-browser-daemon-${username}`;
  }

  return join(dataDir, 'daemon.sock');
}

export function requiresSocketCleanup(): boolean {
  return platform() !== 'win32';
}

function sanitizePipeSegment(value: string): string {
  const sanitized = value
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return sanitized.length > 0 ? sanitized : 'user';
}
