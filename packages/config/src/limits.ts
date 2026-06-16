function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export interface Limits {
  sandboxMemoryBytes: number;
  sandboxTimeoutMs: number;
  harBodyBytes: number;
  artifactBytes: number;
  viewerPort: number;
  daemonStartupMs: number;
}

export const LIMITS: Limits = {
  sandboxMemoryBytes: envInt('LUMA_SANDBOX_MEMORY', 512 * 1024 * 1024),
  sandboxTimeoutMs: envInt('LUMA_SANDBOX_TIMEOUT', 30_000),
  harBodyBytes: envInt('LUMA_MAX_HAR_BODY_BYTES', 1_000_000),
  artifactBytes: envInt('LUMA_MAX_ARTIFACT_BYTES', 200 * 1024 * 1024),
  viewerPort: envInt('LUMA_VIEWER_PORT', 4173),
  daemonStartupMs: envInt('LUMA_DAEMON_STARTUP_MS', 5_000),
};

export const HAR_BINARY_MIME_PREFIXES = ['video/', 'audio/', 'image/'];
