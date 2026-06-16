import { z } from 'zod';
import type { ParseRequestResult, Request, Response } from './types.js';

export const PROTOCOL_VERSION = 1;

const RequestBaseSchema = z.object({
  id: z.string().min(1),
});

export const CaptureOptionsSchema = z.object({
  trace: z.boolean().optional(),
  video: z.boolean().optional(),
  har: z.boolean().optional(),
  console: z.boolean().optional(),
  stepScreenshot: z.boolean().optional(),
});

const ExecuteRequestSchema = RequestBaseSchema.extend({
  type: z.literal('execute'),
  browser: z.string().min(1).default('default'),
  script: z.string(),
  headless: z.boolean().optional(),
  ignoreHTTPSErrors: z.boolean().optional(),
  connect: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
  sessionId: z.string().min(1).optional(),
  step: z.string().min(1).optional(),
  capture: CaptureOptionsSchema.optional(),
});

const SessionRunRequestSchema = RequestBaseSchema.extend({
  type: z.literal('session-run'),
  browser: z.string().min(1).default('default'),
  script: z.string(),
  sessionId: z.string().min(1),
  step: z.string().min(1),
  headless: z.boolean().optional(),
  ignoreHTTPSErrors: z.boolean().optional(),
  connect: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional(),
  capture: CaptureOptionsSchema.optional(),
});

const SessionStartRequestSchema = RequestBaseSchema.extend({
  type: z.literal('session-start'),
  name: z.string().min(1).optional(),
  browser: z.string().min(1).default('default'),
  headless: z.boolean().optional(),
  ignoreHTTPSErrors: z.boolean().optional(),
  connect: z.string().min(1).optional(),
  capture: CaptureOptionsSchema.optional(),
});

const SessionEndRequestSchema = RequestBaseSchema.extend({
  type: z.literal('session-end'),
  sessionId: z.string().min(1),
  renderReport: z.boolean().optional(),
  stopDaemon: z.boolean().optional(),
});

const SessionAbortRequestSchema = RequestBaseSchema.extend({
  type: z.literal('session-abort'),
  sessionId: z.string().min(1),
  renderReport: z.boolean().optional(),
  stopDaemon: z.boolean().optional(),
});

const SessionListRequestSchema = RequestBaseSchema.extend({
  type: z.literal('session-list'),
});

const BrowsersRequestSchema = RequestBaseSchema.extend({
  type: z.literal('browsers'),
});

const BrowserStopRequestSchema = RequestBaseSchema.extend({
  type: z.literal('browser-stop'),
  browser: z.string().min(1),
});

const StatusRequestSchema = RequestBaseSchema.extend({
  type: z.literal('status'),
});

const InstallRequestSchema = RequestBaseSchema.extend({
  type: z.literal('install'),
});

const StopRequestSchema = RequestBaseSchema.extend({
  type: z.literal('stop'),
});

const RequestSchema = z.discriminatedUnion('type', [
  ExecuteRequestSchema,
  SessionRunRequestSchema,
  SessionStartRequestSchema,
  SessionEndRequestSchema,
  SessionAbortRequestSchema,
  SessionListRequestSchema,
  BrowsersRequestSchema,
  BrowserStopRequestSchema,
  StatusRequestSchema,
  InstallRequestSchema,
  StopRequestSchema,
]);

const ResponseBaseSchema = z.object({
  id: z.string().min(1),
  protocolVersion: z.number().int().positive().optional(),
});

const ResponseSchema = z.discriminatedUnion('type', [
  ResponseBaseSchema.extend({ type: z.literal('stdout'), data: z.string() }),
  ResponseBaseSchema.extend({ type: z.literal('stderr'), data: z.string() }),
  ResponseBaseSchema.extend({ type: z.literal('complete'), success: z.literal(true) }),
  ResponseBaseSchema.extend({ type: z.literal('error'), message: z.string() }),
  ResponseBaseSchema.extend({ type: z.literal('result'), data: z.unknown() }),
]);

function describeZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'request';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

function extractId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const maybeId = (value as { id?: unknown }).id;
  return typeof maybeId === 'string' && maybeId.length > 0 ? maybeId : undefined;
}

function normalizeExecuteRequest<T extends Request & { type: 'execute' | 'session-run' }>(
  request: T,
): T {
  return {
    ...request,
    headless: request.headless !== false,
    ignoreHTTPSErrors: request.ignoreHTTPSErrors === true,
    timeoutMs: request.timeoutMs ?? 30_000,
  };
}

export function parseRequest(line: string): ParseRequestResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(line);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON request',
    };
  }

  const result = RequestSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: describeZodError(result.error),
      id: extractId(parsed),
    };
  }

  const request = result.data as Request;
  if (request.type === 'execute' || request.type === 'session-run') {
    return {
      success: true,
      request: normalizeExecuteRequest(request),
    };
  }

  if (request.type === 'session-start') {
    return {
      success: true,
      request: {
        ...request,
        headless: request.headless !== false,
        ignoreHTTPSErrors: request.ignoreHTTPSErrors === true,
      },
    };
  }

  return {
    success: true,
    request,
  };
}

export function serializeResponse(message: Response): string {
  const stamped = message.protocolVersion
    ? message
    : { ...message, protocolVersion: PROTOCOL_VERSION };
  return `${JSON.stringify(ResponseSchema.parse(stamped))}\n`;
}

export function serializeRequest(request: Request): string {
  return `${JSON.stringify(RequestSchema.parse(request))}\n`;
}

/** @deprecated Use serializeResponse */
export function serialize(message: Response): string {
  return serializeResponse(message);
}

export * from './types.js';
