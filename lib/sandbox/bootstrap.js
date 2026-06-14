import { FACTORY_METHODS } from './playwright-rpc.js';

export function buildSandboxBootstrap() {
  const factoryMethodsJson = JSON.stringify([...FACTORY_METHODS]);

  return String.raw`
const __LUMA_HANDLE = Symbol('lumaHandle');
const __LUMA_STEPS = Symbol('lumaSteps');
const __FACTORY_METHODS = new Set(${factoryMethodsJson});

// QuickJS does not expose btoa/atob, so screenshot buffers use these hand-rolled
// codecs to cross the host boundary as base64 strings.
const __BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function __btoa(binary) {
  let output = '';
  for (let index = 0; index < binary.length; index += 3) {
    const byte1 = binary.charCodeAt(index);
    const byte2 = index + 1 < binary.length ? binary.charCodeAt(index + 1) : 0;
    const byte3 = index + 2 < binary.length ? binary.charCodeAt(index + 2) : 0;
    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;
    output += __BASE64_CHARS[(chunk >> 18) & 63];
    output += __BASE64_CHARS[(chunk >> 12) & 63];
    output += index + 1 < binary.length ? __BASE64_CHARS[(chunk >> 6) & 63] : '=';
    output += index + 2 < binary.length ? __BASE64_CHARS[chunk & 63] : '=';
  }
  return output;
}

function __atob(encoded) {
  const normalized = String(encoded).replace(/[^A-Za-z0-9+/=]/g, '');
  let output = '';
  for (let index = 0; index < normalized.length; index += 4) {
    const enc1 = normalized[index];
    const enc2 = normalized[index + 1];
    const enc3 = normalized[index + 2];
    const enc4 = normalized[index + 3];
    const chunk =
      (__BASE64_CHARS.indexOf(enc1) << 18) |
      (__BASE64_CHARS.indexOf(enc2) << 12) |
      ((enc3 === '=' ? 0 : __BASE64_CHARS.indexOf(enc3)) << 6) |
      (enc4 === '=' ? 0 : __BASE64_CHARS.indexOf(enc4));
    output += String.fromCharCode((chunk >> 16) & 255);
    if (enc3 !== '=') {
      output += String.fromCharCode((chunk >> 8) & 255);
    }
    if (enc4 !== '=') {
      output += String.fromCharCode(chunk & 255);
    }
  }
  return output;
}

function __decodeBuffer(encoded) {
  const binary = __atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function __unwrapWireValue(value) {
  if (value && typeof value === 'object' && value.type === 'remote') {
    return __remoteRoot(value.handle);
  }
  if (value && typeof value === 'object' && value.type === 'buffer') {
    return __decodeBuffer(value.value);
  }
  if (Array.isArray(value)) {
    return value.map(__unwrapWireValue);
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const decoded = {};
    for (const [key, entry] of Object.entries(value)) {
      decoded[key] = __unwrapWireValue(entry);
    }
    return decoded;
  }
  return value;
}

function __unwrap(payload) {
  const parsed = JSON.parse(payload);
  if (parsed.error) {
    const message =
      typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
    throw new Error(message);
  }
  if (parsed.type === 'remote') {
    return __remoteRoot(parsed.handle);
  }
  if (parsed.type === 'buffer') {
    return __decodeBuffer(parsed.value);
  }
  return __unwrapWireValue(parsed.value);
}

async function __awaitHost(fn, ...args) {
  return __unwrap(await fn(...args));
}

function __encodeArg(value) {
  if (value && typeof value === 'function' && value[__LUMA_HANDLE]) {
    return { __kind: 'remote', handle: value[__LUMA_HANDLE] };
  }
  if (typeof value === 'function') {
    return { __kind: 'function', source: value.toString() };
  }
  if (Array.isArray(value)) {
    return value.map(__encodeArg);
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const encoded = {};
    for (const [key, entry] of Object.entries(value)) {
      encoded[key] = __encodeArg(entry);
    }
    return encoded;
  }
  return value;
}

function __encodeArgs(args) {
  return JSON.stringify((args ?? []).map(__encodeArg));
}

function __remoteRoot(handleId, steps = []) {
  function buildProxy(path) {
    const target = function lumaRemote() {};
    target[__LUMA_HANDLE] = handleId;
    target[__LUMA_STEPS] = steps;

    return new Proxy(target, {
      get(_object, prop) {
        const name = String(prop);
        if (name === 'then') {
          return undefined;
        }
        return buildProxy(path.concat(name));
      },
      apply(_object, _this, args) {
        const method = path[path.length - 1];
        const objectPath = path.slice(0, -1);
        const inheritedSteps = target[__LUMA_STEPS];

        if (__FACTORY_METHODS.has(method)) {
          return __remoteRoot(handleId, inheritedSteps.concat({
            objectPath,
            method,
            args: args ?? [],
          }));
        }

        return __awaitHost(
          __hostPathFlush,
          handleId,
          JSON.stringify(inheritedSteps),
          JSON.stringify(objectPath),
          method,
          __encodeArgs(args),
        );
      },
    });
  }

  return buildProxy([]);
}

globalThis.browser = {
  getPage: (name) => __awaitHost(__browserGetPage, name ?? 'main'),
  newPage: () => __awaitHost(__browserNewPage),
  listPages: () => __awaitHost(__browserListPages),
  closePage: (name) => __awaitHost(__browserClosePage, name),
};

globalThis.console = {
  log: (...args) => __consoleWrite('log', args.join(' ')),
  info: (...args) => __consoleWrite('info', args.join(' ')),
  warn: (...args) => __consoleWrite('warn', args.join(' ')),
  error: (...args) => __consoleWrite('error', args.join(' ')),
};

globalThis.saveScreenshot = async (buffer, name) => {
  let encoded;
  if (typeof buffer === 'string') {
    encoded = buffer;
  } else {
    let binary = '';
    for (let index = 0; index < buffer.length; index += 1) {
      binary += String.fromCharCode(buffer[index]);
    }
    encoded = __btoa(binary);
  }
  return __awaitHost(__saveScreenshot, name, encoded);
};

globalThis.writeFile = async (name, data) => __awaitHost(__writeFile, name, String(data));
globalThis.readFile = async (name) => __awaitHost(__readFile, name);

let __nextTimerId = 1;
const __activeTimers = new Set();

globalThis.setTimeout = (callback, delay = 0) => {
  const id = __nextTimerId++;
  __activeTimers.add(id);
  (async () => {
    await __sleep(Math.max(0, Number(delay) || 0));
    if (!__activeTimers.has(id)) {
      return;
    }
    __activeTimers.delete(id);
    await callback();
  })();
  return id;
};

globalThis.clearTimeout = (id) => {
  __activeTimers.delete(id);
};
`;
}

export const SANDBOX_BOOTSTRAP = buildSandboxBootstrap();
