import { unlink, writeFile } from 'fs/promises';
import type { LifecycleOptions, LifecycleState } from './types.js';

export async function unlinkIfExists(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export function createLifecycle({ manager, paths, logger }: LifecycleOptions) {
  const state: LifecycleState = {
    shuttingDown: null,
    ownsEndpoint: false,
  };

  function requestShutdown(exitCode = 0) {
    if (state.shuttingDown) {
      return state.shuttingDown;
    }
    state.shuttingDown = (async () => {
      await state.beforeShutdown?.();
      await manager.stopAll();
      if (state.ownsEndpoint) {
        await unlinkIfExists(paths.pidPath);
        if (paths.requiresSocketCleanup()) {
          await unlinkIfExists(paths.socketPath);
        }
      }
      process.exit(exitCode);
    })();
    return state.shuttingDown;
  }

  async function writePidFile() {
    await writeFile(paths.pidPath, `${process.pid}\n`);
    state.ownsEndpoint = true;
  }

  function registerSignalHandlers() {
    const handleSignal = () => {
      void requestShutdown(0);
    };
    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);
    process.on('uncaughtException', (error) => {
      logger.error('fatal daemon error', { error: error.message });
      void requestShutdown(1);
    });
    process.on('unhandledRejection', (error) => {
      logger.error('fatal daemon error', {
        error: error instanceof Error ? error.message : String(error),
      });
      void requestShutdown(1);
    });
  }

  function setBeforeShutdown(fn) {
    state.beforeShutdown = fn;
  }

  return {
    state,
    requestShutdown,
    writePidFile,
    registerSignalHandlers,
    setBeforeShutdown,
    get shuttingDown() {
      return state.shuttingDown;
    },
  };
}

export function closeSocket(socket) {
  if (socket.destroyed) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    socket.once('close', resolve);
    socket.end();
    setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
      }
      resolve();
    }, 500).unref();
  });
}
