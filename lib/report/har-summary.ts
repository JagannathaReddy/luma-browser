export function parseHarText(text) {
  if (!text.trim()) {
    return [];
  }

  try {
    const har = JSON.parse(text);
    return har?.log?.entries ?? [];
  } catch {
    return [];
  }
}

export function harEntrySummary(entry) {
  const response = entry.response ?? {};
  const request = entry.request ?? {};
  const content = response.content ?? {};
  const timings = entry.timings ?? {};
  const durationMs =
    (timings.blocked ?? 0) +
    (timings.dns ?? 0) +
    (timings.connect ?? 0) +
    (timings.send ?? 0) +
    (timings.wait ?? 0) +
    (timings.receive ?? 0) +
    (timings.ssl ?? 0);

  return {
    method: request.method ?? 'GET',
    url: request.url ?? '',
    status: response.status ?? 0,
    statusText: response.statusText ?? '',
    mimeType: content.mimeType ?? '—',
    size: content.size ?? 0,
    durationMs,
    request,
    response,
    startedDateTime: entry.startedDateTime ?? null,
  };
}

export function summarizeHar(text) {
  const entries = parseHarText(text).map(harEntrySummary);

  return {
    entries,
    total: entries.length,
    failed: entries.filter((entry) => entry.status >= 400 || entry.status === 0).length,
  };
}

export function harStatusClass(status) {
  if (status === 0) {
    return 'status-fail';
  }
  if (status >= 500) {
    return 'status-5xx';
  }
  if (status >= 400) {
    return 'status-4xx';
  }
  if (status >= 300) {
    return 'status-3xx';
  }
  return 'status-2xx';
}

export { formatBytes } from '../html/helpers.js';
