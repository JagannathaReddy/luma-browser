import type {
  RenderIndexOptions,
  RenderSessionOptions,
  ViewerSessionDetail,
  ViewerSessionSummary,
} from './lib/types.js';

export function renderIndexHtml(
  sessions: ViewerSessionSummary[],
  options: RenderIndexOptions,
): Promise<string>;

export function renderSessionDetailHtml(
  detail: ViewerSessionDetail,
  options: RenderSessionOptions,
): Promise<string>;

export type {
  RenderIndexOptions,
  RenderSessionOptions,
  ViewerSessionDetail,
  ViewerSessionSummary,
  ViewerStep,
} from './lib/types.js';
