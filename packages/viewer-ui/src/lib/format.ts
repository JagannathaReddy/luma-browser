export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function formatDuration(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): string {
  if (!startedAt || !endedAt) {
    return '—';
  }
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

export function sessionSearchText(session: {
  name?: string | null;
  id: string;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
}): string {
  return [session.name, session.id, session.status, session.startedAt, session.endedAt]
    .filter(Boolean)
    .join(' ');
}
