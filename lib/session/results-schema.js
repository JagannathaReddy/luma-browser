import { z } from 'zod';

export const CaptureOptionsResultSchema = z.object({
  trace: z.boolean(),
  video: z.boolean(),
  har: z.boolean(),
  console: z.boolean(),
  stepScreenshot: z.boolean(),
});

export const StepArtifactsSchema = z.record(z.string());

export const SessionStepResultSchema = z.object({
  index: z.number().int().nonnegative(),
  name: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  success: z.boolean().nullable(),
  error: z.string().nullable(),
  dir: z.string(),
  artifacts: StepArtifactsSchema,
  actionCount: z.number().int().nonnegative().optional(),
  exportedScript: z.string().optional(),
});

export const SessionResultsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  status: z.enum(['open', 'closed', 'aborted']),
  browser: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  capture: CaptureOptionsResultSchema,
  steps: z.array(SessionStepResultSchema),
});

export function parseSessionResults(value) {
  return SessionResultsSchema.parse(value);
}

export function validateSessionResults(value) {
  return SessionResultsSchema.safeParse(value);
}
