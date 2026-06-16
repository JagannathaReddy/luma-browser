import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import IndexTemplate from './templates/Index.astro';
import SessionTemplate from './templates/Session.astro';
import type {
  RenderIndexOptions,
  RenderSessionOptions,
  ViewerSessionDetail,
  ViewerSessionSummary,
} from './lib/types.js';

type Container = Awaited<ReturnType<typeof AstroContainer.create>>;

let containerPromise: Promise<Container> | null = null;

function getContainer(): Promise<Container> {
  if (!containerPromise) {
    containerPromise = AstroContainer.create();
  }
  return containerPromise;
}

export async function renderIndexHtml(
  sessions: ViewerSessionSummary[],
  options: RenderIndexOptions,
): Promise<string> {
  const container = await getContainer();
  return container.renderToString(IndexTemplate, {
    props: { sessions, ...options },
  });
}

export async function renderSessionDetailHtml(
  detail: ViewerSessionDetail,
  options: RenderSessionOptions,
): Promise<string> {
  const container = await getContainer();
  return container.renderToString(SessionTemplate, {
    props: { detail, ...options },
  });
}

export type {
  RenderIndexOptions,
  RenderSessionOptions,
  ViewerSessionDetail,
  ViewerSessionSummary,
  ViewerStep,
} from './lib/types.js';
