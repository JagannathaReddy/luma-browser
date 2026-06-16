import { readZipEntryText } from './zip-read.js';
import { normalizeTraceAction } from './locator-export.js';
const EXPORTABLE_CLASSES = new Set([
    'Frame',
    'Page',
    'Locator',
    'ElementHandle',
    'Keyboard',
    'Mouse',
]);
const SKIP_METHODS = new Set([
    'body',
    'newPage',
    'newContext',
    'close',
    'content',
    'setContent',
    'evaluateExpression',
    'evaluateHandle',
]);
export async function decodeTraceZip(traceZipPath) {
    const traceText = await readZipEntryText(traceZipPath, 'trace.trace');
    return decodeTraceText(traceText);
}
export function decodeTraceText(traceText) {
    const pending = new Map();
    const actions = [];
    for (const line of traceText.split('\n')) {
        if (!line.trim()) {
            continue;
        }
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            continue;
        }
        if (event.type === 'before') {
            pending.set(event.callId, event);
            continue;
        }
        if (event.type !== 'after') {
            continue;
        }
        const before = pending.get(event.callId);
        if (!before) {
            continue;
        }
        pending.delete(event.callId);
        if (!EXPORTABLE_CLASSES.has(before.class)) {
            continue;
        }
        if (SKIP_METHODS.has(before.method)) {
            continue;
        }
        actions.push(normalizeTraceAction(before, {
            callId: event.callId,
            result: event.result ?? null,
            error: event.error ?? null,
            endTime: event.endTime,
        }));
    }
    return actions.sort((left, right) => left.startTime - right.startTime);
}
//# sourceMappingURL=trace-decode.js.map