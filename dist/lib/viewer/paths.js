import { access } from 'fs/promises';
import { join, resolve, sep } from 'path';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isSessionId(value) {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}
export function sessionRoot(sessionsRoot, sessionId) {
    if (!isSessionId(sessionId)) {
        throw new Error(`Invalid session id "${sessionId}"`);
    }
    return join(sessionsRoot, sessionId);
}
export function resolveSessionFile(sessionsRoot, sessionId, relativePath = '') {
    const root = resolve(sessionRoot(sessionsRoot, sessionId));
    if (relativePath.includes('\0')) {
        throw new Error('Invalid path');
    }
    const absolute = resolve(root, relativePath);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
        throw new Error('Path escapes session directory');
    }
    return absolute;
}
export async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=paths.js.map