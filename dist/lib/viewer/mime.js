const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jsonl': 'application/x-ndjson; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.zip': 'application/zip',
    '.har': 'application/json; charset=utf-8',
};
export function contentTypeForPath(filePath) {
    const dot = filePath.lastIndexOf('.');
    if (dot === -1) {
        return 'application/octet-stream';
    }
    return MIME_TYPES[filePath.slice(dot).toLowerCase()] ?? 'application/octet-stream';
}
//# sourceMappingURL=mime.js.map