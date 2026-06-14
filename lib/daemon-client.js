import net from 'net';
import { readLines } from './line-reader.js';
import { serializeRequest } from './protocol.js';
import { getSocketPath } from './paths.js';

export function isDaemonRunning() {
  return probeDaemon(getSocketPath());
}

function probeDaemon(endpoint) {
  return new Promise((resolve) => {
    const socket = net.connect(endpoint);
    const finish = (active) => {
      socket.destroy();
      resolve(active);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

export function sendRequest(
  request,
  {
    onStdout = (data) => process.stdout.write(data),
    onStderr = (data) => process.stderr.write(data),
  } = {},
) {
  const endpoint = getSocketPath();

  return new Promise((resolve, reject) => {
    const socket = net.connect(endpoint);
    let result = null;
    let failed = false;

    const fail = (error) => {
      if (failed) {
        return;
      }
      failed = true;
      socket.destroy();
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    socket.setEncoding('utf8');

    socket.on('error', fail);

    socket.on('connect', () => {
      socket.write(serializeRequest(request));
    });

    readLines(socket, (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        fail(error);
        return;
      }

      switch (message.type) {
        case 'stdout':
          onStdout(message.data);
          break;
        case 'stderr':
          onStderr(message.data);
          break;
        case 'result':
          result = message.data;
          break;
        case 'complete':
          socket.end();
          resolve(result);
          break;
        case 'error':
          fail(new Error(message.message));
          break;
        default:
          break;
      }
    });

    socket.on('close', () => {
      if (!failed) {
        resolve(result);
      }
    });
  });
}

export function createRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
