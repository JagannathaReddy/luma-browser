export interface ViewerSessionSummary {
  id: string;
  name?: string | null;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
  stepCount: number;
  reportReady?: boolean;
}

export interface ViewerStep {
  name: string;
  dir: string;
  success?: boolean | null;
  startedAt?: string | null;
  endedAt?: string | null;
  actionCount?: number | null;
  error?: string | null;
  artifacts?: Record<string, string | null | undefined>;
}

export interface ViewerSessionDetail {
  id: string;
  name?: string | null;
  status: string;
  browser?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  dir: string;
  reportReady?: boolean;
  steps: ViewerStep[];
}

export interface RenderIndexOptions {
  sessionsDir: string;
  version: string;
}

export interface RenderSessionOptions {
  sessionsDir: string;
  version: string;
}
