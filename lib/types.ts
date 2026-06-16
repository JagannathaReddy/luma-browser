import type { SendRequestOptions } from '@jagannathamv/daemon-client';
import type { CaptureOptions } from '@jagannathamv/protocol';

export interface BrowserEnsureOptions {
  headless?: boolean;
  ignoreHTTPSErrors?: boolean;
  recordVideoDir?: string | null;
  sessionScoped?: boolean;
}

export interface SandboxScriptOptions extends SendRequestOptions {
  browser?: string;
  timeoutMs?: number;
  memoryLimitBytes?: number;
}

export interface ViewerStartOptions {
  sessionsRoot?: string;
  sessionId?: string;
  port?: number;
  host?: string;
  open?: boolean;
}

export interface ScriptExportOptions {
  stepName?: string;
}

export interface CLIMainOptions {
  mode?: 'engine' | 'orchestrator';
}

export interface WaitForStopOptions {
  timeoutMs?: number;
  sleepMs?: number;
}

export interface AttachPageOptions {
  allowReplace?: boolean;
}

export interface ExecuteCliOptions {
  browser?: string;
  connect?: string;
  headless?: boolean;
  ignoreHTTPSErrors?: boolean;
  timeoutMs?: number;
  capture?: CaptureOptions;
}

export interface BuildExecutePayloadInput {
  id: string;
  source: string;
  options: ExecuteCliOptions;
  sessionId?: string;
  step?: string;
}
