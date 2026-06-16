import { serializeHostValue } from './values.js';
const METHOD_ALIASES = {
    snapshotForAI: '_snapshotForAI',
};
export const FACTORY_METHODS = new Set([
    'locator',
    'frameLocator',
    'getByRole',
    'getByText',
    'getByLabel',
    'getByPlaceholder',
    'getByAltText',
    'getByTitle',
    'getByTestId',
    'nth',
    'first',
    'last',
    'filter',
    'contentFrame',
    'owner',
    'frame',
    'elementHandle',
    'elementHandles',
    'mainFrame',
    'waitForFrame',
    'opener',
]);
const CALLBACK_METHODS = new Set([
    'on',
    'once',
    'addListener',
    'removeListener',
    'prependListener',
    'exposeFunction',
    'waitForEvent',
    'waitForRequest',
    'waitForResponse',
    'route',
    'unroute',
]);
export class HandleRegistry {
    #objects = new Map();
    #nextId = 1;
    register(value) {
        const handle = `obj-${this.#nextId++}`;
        this.#objects.set(handle, value);
        return handle;
    }
    get(handle) {
        const value = this.#objects.get(handle);
        if (!value) {
            throw new Error(`Unknown remote handle "${handle}"`);
        }
        return value;
    }
    delete(handle) {
        this.#objects.delete(handle);
    }
    clear() {
        this.#objects.clear();
    }
}
const PLAYWRIGHT_REMOTE_TYPES = new Set([
    'Browser',
    'BrowserContext',
    'Page',
    'Frame',
    'FrameLocator',
    'Locator',
    'ElementHandle',
    'JSHandle',
    'Keyboard',
    'Mouse',
    'Touchscreen',
    'Worker',
    'CDPSession',
    'Route',
    'Request',
    'Response',
    'WebSocket',
    'Dialog',
    'Download',
    'FileChooser',
    'Video',
    'Stream',
    'ConsoleMessage',
    'Accessibility',
    'Tracing',
    'Coverage',
    'Clock',
    'APIRequestContext',
    'APIResponse',
]);
export function isPlaywrightChannel(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    if (typeof value._type === 'string' && value._guid != null) {
        return true;
    }
    const name = value.constructor?.name;
    return Boolean(name && PLAYWRIGHT_REMOTE_TYPES.has(name));
}
function remoteTypeOf(value) {
    if (typeof value._type === 'string') {
        return value._type;
    }
    return value.constructor?.name ?? 'Remote';
}
export function encodeWireValue(value, registry) {
    if (isPlaywrightChannel(value)) {
        return {
            type: 'remote',
            handle: registry.register(value),
            remoteType: remoteTypeOf(value),
        };
    }
    if (value === undefined) {
        return null;
    }
    if (value === null) {
        return null;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
        return {
            type: 'buffer',
            value: Buffer.from(value).toString('base64'),
        };
    }
    if (Array.isArray(value)) {
        return value.map((entry) => encodeWireValue(entry, registry));
    }
    if (typeof value === 'object' && value.constructor === Object) {
        const encoded = {};
        for (const [key, entry] of Object.entries(value)) {
            encoded[key] = encodeWireValue(entry, registry);
        }
        return encoded;
    }
    return String(value);
}
export function encodeHostResponse(value, registry) {
    const encoded = encodeWireValue(value, registry);
    if (encoded && typeof encoded === 'object' && encoded.type === 'remote') {
        return encoded;
    }
    if (encoded && typeof encoded === 'object' && encoded.type === 'buffer') {
        return encoded;
    }
    return serializeHostValue(value);
}
export function decodeWireArgs(args, registry) {
    return args.map((arg) => decodeWireArg(arg, registry));
}
function decodeWireArg(arg, registry) {
    if (arg === null || arg === undefined) {
        return arg;
    }
    if (typeof arg === 'object' && arg.__kind === 'remote') {
        return registry.get(arg.handle);
    }
    if (typeof arg === 'object' && arg.__kind === 'function') {
        return compileEvalString(arg.source);
    }
    if (Array.isArray(arg)) {
        return arg.map((entry) => decodeWireArg(entry, registry));
    }
    if (typeof arg === 'object') {
        const decoded = {};
        for (const [key, entry] of Object.entries(arg)) {
            decoded[key] = decodeWireArg(entry, registry);
        }
        return decoded;
    }
    return arg;
}
function compileEvalString(source) {
    return new Function(`return (${source})`)();
}
const FORBIDDEN_PATH_SEGMENTS = new Set(['constructor', 'prototype', '__proto__']);
function assertSafeSegment(segment) {
    if (typeof segment !== 'string') {
        throw new Error('Property paths must be strings');
    }
    if (FORBIDDEN_PATH_SEGMENTS.has(segment) || segment.startsWith('__')) {
        throw new Error(`Property "${segment}" is not accessible from sandbox`);
    }
}
function resolvePathTarget(registry, handleId, path) {
    let target = registry.get(handleId);
    for (const segment of path) {
        assertSafeSegment(segment);
        const value = target[segment];
        if (typeof value === 'function') {
            throw new Error(`"${segment}" is a method — call it with parentheses`);
        }
        if (value === undefined) {
            throw new Error(`Property "${segment}" is undefined`);
        }
        target = value;
    }
    return target;
}
export async function invokeHostPathCall(registry, handleId, path, method, args) {
    const target = path.length === 0 ? registry.get(handleId) : resolvePathTarget(registry, handleId, path);
    return invokeHostCallOnTarget(registry, handleId, target, method, args);
}
export async function invokeHostPathFlush(registry, handleId, steps, path, method, args) {
    let target = registry.get(handleId);
    let activeHandleId = handleId;
    for (const step of steps) {
        const stepTarget = step.objectPath.length === 0
            ? target
            : resolvePathTarget(registry, activeHandleId, step.objectPath);
        const value = await invokeHostCallOnTarget(registry, activeHandleId, stepTarget, step.method, step.args);
        if (isPlaywrightChannel(value)) {
            activeHandleId = registry.register(value);
            target = value;
        }
        else {
            target = value;
        }
    }
    const finalTarget = path.length === 0 ? target : resolvePathTarget(registry, activeHandleId, path);
    return invokeHostCallOnTarget(registry, activeHandleId, finalTarget, method, args);
}
export async function invokeHostCall(registry, handleId, method, args) {
    return invokeHostCallOnTarget(registry, handleId, registry.get(handleId), method, args);
}
async function invokeHostCallOnTarget(registry, handleId, target, method, args) {
    assertSafeSegment(method);
    const resolvedMethod = METHOD_ALIASES[method] ?? method;
    assertSafeSegment(resolvedMethod);
    if (CALLBACK_METHODS.has(resolvedMethod)) {
        throw new Error(`"${method}" is not supported from sandbox scripts (callbacks cannot cross the sandbox boundary)`);
    }
    const fn = target[resolvedMethod];
    if (typeof fn !== 'function') {
        throw new Error(`"${method}" is not a function`);
    }
    const deserialized = decodeWireArgs(args, registry);
    let result = fn.apply(target, deserialized);
    if (result && typeof result.then === 'function') {
        result = await result;
    }
    if (resolvedMethod === 'close' && isPlaywrightChannel(target)) {
        registry.delete(handleId);
    }
    return result;
}
export function formatRpcError(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=playwright-rpc.js.map