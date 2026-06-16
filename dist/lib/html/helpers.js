export function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
export function formatWhen(value) {
    if (!value) {
        return '—';
    }
    try {
        return new Date(value).toLocaleString();
    }
    catch {
        return value;
    }
}
export function formatDuration(startedAt, endedAt) {
    if (!startedAt || !endedAt) {
        return '—';
    }
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    if (ms < 1000) {
        return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}
export function formatMs(ms) {
    if (!ms || ms <= 0) {
        return '—';
    }
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}
export function formatBytes(size) {
    if (!size || size <= 0) {
        return '—';
    }
    if (size < 1024) {
        return `${size} B`;
    }
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
export function shortenUrl(url, maxLength = 72) {
    if (url.length <= maxLength) {
        return url;
    }
    return `${url.slice(0, maxLength - 1)}…`;
}
//# sourceMappingURL=helpers.js.map