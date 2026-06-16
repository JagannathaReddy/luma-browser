export interface CaptureOptions {
  trace?: boolean;
  video?: boolean;
  har?: boolean;
  console?: boolean;
  stepScreenshot?: boolean;
}

export interface BaseRequest {
  id: string;
}

export interface ExecuteRequest extends BaseRequest {
  type: 'execute';
  browser?: string;
  script: string;
  headless?: boolean;
  ignoreHTTPSErrors?: boolean;
  connect?: string;
  timeoutMs?: number;
  sessionId?: string;
  step?: string;
  capture?: CaptureOptions;
}

export interface SessionRunRequest extends BaseRequest {
  type: 'session-run';
  browser?: string;
  script: string;
  sessionId: string;
  step: string;
  headless?: boolean;
  ignoreHTTPSErrors?: boolean;
  connect?: string;
  timeoutMs?: number;
  capture?: CaptureOptions;
}

export interface SessionStartRequest extends BaseRequest {
  type: 'session-start';
  name?: string;
  browser?: string;
  headless?: boolean;
  ignoreHTTPSErrors?: boolean;
  connect?: string;
  capture?: CaptureOptions;
}

export interface SessionEndRequest extends BaseRequest {
  type: 'session-end';
  sessionId: string;
  renderReport?: boolean;
  stopDaemon?: boolean;
}

export interface SessionAbortRequest extends BaseRequest {
  type: 'session-abort';
  sessionId: string;
  renderReport?: boolean;
  stopDaemon?: boolean;
}

export interface SimpleRequest<T extends string> extends BaseRequest {
  type: T;
}

export interface BrowserStopRequest extends BaseRequest {
  type: 'browser-stop';
  browser: string;
}

export type Request =
  | ExecuteRequest
  | SessionRunRequest
  | SessionStartRequest
  | SessionEndRequest
  | SessionAbortRequest
  | SimpleRequest<'session-list'>
  | SimpleRequest<'browsers'>
  | BrowserStopRequest
  | SimpleRequest<'status'>
  | SimpleRequest<'install'>
  | SimpleRequest<'stop'>;

export type RequestType = Request['type'];

export interface BaseResponse {
  id: string;
  protocolVersion?: number;
}

export type Response =
  | (BaseResponse & { type: 'stdout'; data: string })
  | (BaseResponse & { type: 'stderr'; data: string })
  | (BaseResponse & { type: 'complete'; success: true })
  | (BaseResponse & { type: 'error'; message: string })
  | (BaseResponse & { type: 'result'; data: unknown });

export type ParseRequestResult =
  | { success: true; request: Request }
  | { success: false; error: string; id?: string };

export interface BrowserInfo {
  name: string;
  type: 'launched' | 'connected';
  status: string;
  pages: string[];
  endpoint: string | null;
  headless: boolean;
}

export interface DaemonStatusResult {
  pid: number;
  version: string;
  protocolVersion: number;
  uptimeMs: number;
  browserCount: number;
  browsers: BrowserInfo[];
  socketPath: string;
  sessionsDir: string;
  metrics?: unknown;
}

export interface SessionStartResult {
  sessionId: string;
  dir: string;
  browser: string;
  capture: Required<CaptureOptions>;
}

export interface SessionListEntry {
  id: string;
  name: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  stepCount: number;
  dir: string;
}

export interface SessionFinalizeResult {
  sessionId: string;
  dir: string;
  status: string;
  renderReport: boolean;
  reportPath: string | null;
  resultsPath: string;
  reportReady: boolean;
}

export interface BrowserStopResult {
  browser: string;
  stopped: true;
}

export interface StopResult {
  stopping: true;
}

/** Maps each request `type` to the daemon `result` payload shape. */
export interface RequestResultMap {
  execute: null;
  'session-run': null;
  'session-start': SessionStartResult;
  'session-end': SessionFinalizeResult;
  'session-abort': SessionFinalizeResult;
  'session-list': SessionListEntry[];
  browsers: BrowserInfo[];
  'browser-stop': BrowserStopResult;
  status: DaemonStatusResult;
  install: null;
  stop: StopResult;
}

export type RequestResult<T extends RequestType> = RequestResultMap[T];

export type TypedRequest<T extends RequestType> = Extract<Request, { type: T }>;
