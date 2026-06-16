export function parseConsoleJsonl(text) {
  const entries: unknown[] = [];

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip malformed lines.
    }
  }

  return entries;
}

export function summarizeConsole(entries) {
  const counts = {};

  for (const entry of entries) {
    const type = entry.type ?? 'log';
    counts[type] = (counts[type] ?? 0) + 1;
  }

  return {
    entries,
    total: entries.length,
    counts,
  };
}

export function consoleLevelClass(type) {
  switch (type) {
    case 'error':
    case 'pageerror':
      return 'level-error';
    case 'warning':
      return 'level-warn';
    case 'info':
      return 'level-info';
    case 'debug':
      return 'level-debug';
    default:
      return 'level-log';
  }
}
