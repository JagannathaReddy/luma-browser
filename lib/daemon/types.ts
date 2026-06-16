import type { BrowserManager } from '../browser-manager.js';
import type { logger as defaultLogger } from '../logger.js';
import type { SessionManager } from '../session/session-manager.js';

export interface DaemonPaths {
  socketPath: string;
  pidPath: string;
  sessionsDir: string;
  requiresSocketCleanup: () => boolean;
  unlinkIfExists: (path: string) => Promise<void>;
}

export interface DaemonOptions {
  manager?: BrowserManager;
  sessions?: SessionManager;
  paths?: DaemonPaths;
  version?: () => string;
  log?: typeof defaultLogger;
}

export interface LifecycleOptions {
  manager: BrowserManager;
  paths: DaemonPaths;
  logger: typeof defaultLogger;
}

export interface LifecycleState {
  shuttingDown: Promise<void> | null;
  ownsEndpoint: boolean;
  beforeShutdown?: () => Promise<void> | void;
}
