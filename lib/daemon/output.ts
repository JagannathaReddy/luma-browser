import { serializeResponse } from '../protocol.js';

export function createSocketOutput(socket, requestId) {
  let queue = Promise.resolve();

  const write = (message) => {
    queue = queue
      .then(
        () =>
          new Promise<void>((resolve, reject) => {
            if (socket.destroyed) {
              resolve();
              return;
            }
            socket.write(serializeResponse({ id: requestId, ...message }), (error) => {
              if (error) {
                reject(error);
                return;
              }
              resolve();
            });
          }),
      )
      .catch(() => undefined);
    return queue;
  };

  return {
    writeResult(data) {
      return write({ type: 'result', data });
    },
    writeStdout(data) {
      return write({ type: 'stdout', data });
    },
    writeStderr(data) {
      return write({ type: 'stderr', data });
    },
    writeError(message) {
      return write({ type: 'error', message });
    },
    writeComplete() {
      return write({ type: 'complete', success: true });
    },
    drain() {
      return queue;
    },
  };
}

export function writeFatalError(socket, requestId, error) {
  if (socket.destroyed) {
    return Promise.resolve();
  }
  const message = error instanceof Error ? error.message : String(error);
  return new Promise<void>((resolve) => {
    socket.write(serializeResponse({ id: requestId, type: 'error', message }), () => resolve());
  });
}
