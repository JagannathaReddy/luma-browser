import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve, sep } from 'path';
import { newAsyncContext, shouldInterruptAfterDeadline } from 'quickjs-emscripten';
import { logger } from '../logger.js';
import { tempDir } from '../paths.js';

const RESOLVED_TEMP_DIR = resolve(tempDir);

function resolveTempPath(name) {
  if (typeof name !== 'string' || name.length === 0 || name.includes('\0')) {
    throw new Error('Invalid path');
  }

  const absolute = resolve(RESOLVED_TEMP_DIR, name);
  if (absolute !== RESOLVED_TEMP_DIR && !absolute.startsWith(`${RESOLVED_TEMP_DIR}${sep}`)) {
    throw new Error('Path escapes sandbox temp directory');
  }

  return absolute;
}
import { buildSandboxBootstrap } from './bootstrap.js';
import { wrapScript } from './prepare-script.js';
import {
  encodeHostResponse,
  formatRpcError,
  HandleRegistry,
  invokeHostPathCall,
  invokeHostPathFlush,
} from './playwright-rpc.js';
import { decodeSandboxBuffer } from './values.js';

const DEFAULT_MEMORY_LIMIT_BYTES = 512 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

export async function runSandboxedScript(
  source,
  {
    browser,
    onStdout = (data) => process.stdout.write(data),
    onStderr = (data) => process.stderr.write(data),
    timeoutMs = DEFAULT_TIMEOUT_MS,
    memoryLimitBytes = DEFAULT_MEMORY_LIMIT_BYTES,
  } = {},
) {
  mkdirSync(tempDir, { recursive: true });

  const context = await newAsyncContext();
  const registry = new HandleRegistry();

  const deadline = Date.now() + timeoutMs;
  const interrupt = shouldInterruptAfterDeadline(deadline);

  try {
    context.runtime.setMemoryLimit(memoryLimitBytes);
    context.runtime.setInterruptHandler(interrupt);

    installHostFunctions(context, {
      browser,
      registry,
      onStdout,
      onStderr,
    });

    await evaluate(context, buildSandboxBootstrap(), '<bootstrap>', deadline);
    await runUserScript(context, wrapScript(source), '<script>', deadline);
    drainPendingJobs(context, deadline);
  } finally {
    registry.clear();
    context.dispose();
  }
}

function installHostFunctions(context, { browser, registry, onStdout, onStderr }) {
  installPromiseHostFunction(context, '__browserGetPage', async (nameHandle) => {
    const name = context.getString(nameHandle);
    const page = await browser.getPage(name);
    return jsonResponse(context, encodeHostResponse(page, registry));
  });

  installPromiseHostFunction(context, '__browserNewPage', async () => {
    const page = await browser.newPage();
    return jsonResponse(context, encodeHostResponse(page, registry));
  });

  installPromiseHostFunction(context, '__browserListPages', async () => {
    const pages = await browser.listPages();
    return jsonResponse(context, encodeHostResponse(pages, registry));
  });

  installPromiseHostFunction(context, '__browserClosePage', async (nameHandle) => {
    const name = context.getString(nameHandle);
    await browser.closePage(name);
    return jsonResponse(context, encodeHostResponse(null, registry));
  });

  installPromiseHostFunction(
    context,
    '__hostPathCall',
    async (handleHandle, pathHandle, methodHandle, argsHandle) => {
      const handleId = context.getString(handleHandle);
      const path = JSON.parse(context.getString(pathHandle));
      const method = context.getString(methodHandle);
      const args = JSON.parse(context.getString(argsHandle));
      const value = await invokeHostPathCall(registry, handleId, path, method, args);
      return jsonResponse(context, encodeHostResponse(value, registry));
    },
  );

  installPromiseHostFunction(
    context,
    '__hostPathFlush',
    async (handleHandle, stepsHandle, pathHandle, methodHandle, argsHandle) => {
      const handleId = context.getString(handleHandle);
      const steps = JSON.parse(context.getString(stepsHandle));
      const path = JSON.parse(context.getString(pathHandle));
      const method = context.getString(methodHandle);
      const args = JSON.parse(context.getString(argsHandle));
      const value = await invokeHostPathFlush(registry, handleId, steps, path, method, args);
      return jsonResponse(context, encodeHostResponse(value, registry));
    },
  );

  installPromiseHostFunction(context, '__consoleWrite', async (levelHandle, messageHandle) => {
    const level = context.getString(levelHandle);
    const message = context.getString(messageHandle);
    const payload = message.endsWith('\n') ? message : `${message}\n`;

    if (level === 'warn' || level === 'error') {
      onStderr(payload);
    } else {
      onStdout(payload);
    }

    return context.undefined;
  });

  installPromiseHostFunction(context, '__saveScreenshot', async (nameHandle, dataHandle) => {
    const name = context.getString(nameHandle);
    const encoded = context.getString(dataHandle);
    const path = resolveTempPath(name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, decodeSandboxBuffer(encoded));
    return jsonResponse(context, encodeHostResponse(path, registry));
  });

  installPromiseHostFunction(context, '__writeFile', async (nameHandle, dataHandle) => {
    const name = context.getString(nameHandle);
    const data = context.getString(dataHandle);
    const path = resolveTempPath(name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
    return jsonResponse(context, encodeHostResponse(path, registry));
  });

  installPromiseHostFunction(context, '__readFile', async (nameHandle) => {
    const name = context.getString(nameHandle);
    const data = readFileSync(resolveTempPath(name), 'utf8');
    return jsonResponse(context, encodeHostResponse(data, registry));
  });

  installPromiseHostFunction(context, '__sleep', async (msHandle) => {
    const ms = Math.max(0, context.getNumber(msHandle));
    await new Promise((resolve) => setTimeout(resolve, ms));
    return context.undefined;
  });
}

function jsonResponse(context, payload) {
  return context.newString(JSON.stringify(payload));
}

function installPromiseHostFunction(context, name, implementation) {
  const handle = context.newFunction(name, (...args) => {
    const deferred = context.newPromise();

    implementation(...args)
      .then((result) => {
        deferred.resolve(result ?? context.undefined);
        context.runtime.executePendingJobs();
      })
      .catch((error) => {
        deferred.reject(context.newString(formatRpcError(error)));
        context.runtime.executePendingJobs();
      });

    return deferred.handle;
  });

  handle.consume((fn) => context.setProp(context.global, name, fn));
}

async function evaluate(context, code, filename, deadline) {
  const result = await context.evalCodeAsync(code, filename, {
    shouldInterrupt: shouldInterruptAfterDeadline(deadline),
  });
  const handle = unwrapHandle(context, result);
  handle.dispose();
}

async function runUserScript(context, code, filename, deadline) {
  const result = await context.evalCodeAsync(code, filename, {
    shouldInterrupt: shouldInterruptAfterDeadline(deadline),
  });
  const promiseHandle = unwrapHandle(context, result);

  try {
    const resolved = await context.resolvePromise(promiseHandle);
    const valueHandle = unwrapHandle(context, resolved);
    valueHandle.dispose();
  } finally {
    promiseHandle.dispose();
  }
}

function drainPendingJobs(context, deadline) {
  for (let index = 0; index < 100; index += 1) {
    const ran = context.runtime.executePendingJobs(100);
    if (ran === 0) {
      return;
    }
    if (Date.now() > deadline) {
      logger.warn('sandbox microtask queue did not drain before deadline', {
        iterations: index + 1,
      });
      return;
    }
  }
  logger.warn('sandbox microtask queue did not drain within iteration cap');
}

function unwrapHandle(context, result) {
  if (result.error) {
    const message = context.dump(result.error);
    result.error.dispose();
    const text =
      typeof message === 'string'
        ? message
        : message instanceof Error
          ? message.message
          : JSON.stringify(message);
    throw new Error(text);
  }

  return result.value;
}
