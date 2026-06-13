import { homedir, platform, userInfo } from 'os';
import { basename, join } from 'path';

export const dataDir = join(homedir(), '.luma-browser');
export const tempDir = join(dataDir, 'tmp');
export const browsersDir = join(dataDir, 'browsers');
export const sessionsDir = join(dataDir, 'sessions');
export const pidPath = join(dataDir, 'daemon.pid');
export const daemonLogPath = join(dataDir, 'daemon.log');

export function sessionDir(sessionId) {
  return join(sessionsDir, sessionId);
}

export function getSocketPath() {
  if (platform() === 'win32') {
    const username = sanitizePipeSegment(
      process.env.USERNAME || process.env.USER || basename(homedir()) || 'user',
    );
    return `\\\\.\\pipe\\luma-browser-daemon-${username}`;
  }

  return join(dataDir, 'daemon.sock');
}

export function requiresSocketCleanup() {
  return platform() !== 'win32';
}

function sanitizePipeSegment(value) {
  const sanitized = value
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return sanitized.length > 0 ? sanitized : 'user';
}

export function getDefaultUsername() {
  const fromEnv = process.env.USERNAME || process.env.USER;
  if (fromEnv?.trim()) {
    return fromEnv;
  }

  try {
    const username = userInfo().username;
    if (username?.trim()) {
      return username;
    }
  } catch {
    // Fall through.
  }

  return basename(homedir()) || 'user';
}
