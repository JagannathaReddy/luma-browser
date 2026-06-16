import net from 'node:net';
import { getSocketPath } from '@jagannathamv/config/paths';
import {
  PROTOCOL_VERSION,
  serializeRequest,
  type Request,
  type RequestResult,
  type RequestType,
} from '@jagannathamv/protocol';
import { readLines } from './line-reader.js';

export interface SendRequestOptions {
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export function isDaemonRunning(): Promise<boolean> {
  return probeDaemon(getSocketPath());
}

function probeDaemon(endpoint: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(endpoint);
    const finish = (active: boolean) => {
      socket.destroy();
      resolve(active);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

export function sendRequest<T extends Request>(
  request: T,
  options: SendRequestOptions = {},
): Promise<RequestResult<T['type']> | null> {
  const {
    onStdout = (data: string) => process.stdout.write(data),
    onStderr = (data: string) => process.stderr.write(data),
  } = options;

  const endpoint = getSocketPath();

  return new Promise((resolve, reject) => {
    const socket = net.connect(endpoint);
    let result: RequestResult<RequestType> | null = null;
    let failed = false;

    const fail = (error: unknown) => {
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

    let versionChecked = false;
    readLines(socket, (line) => {
      let message: { type: string; protocolVersion?: number; data?: unknown; message?: string };
      try {
        message = JSON.parse(line) as typeof message;
      } catch (error) {
        fail(error);
        return;
      }

      if (!versionChecked) {
        versionChecked = true;
        if (
          typeof message.protocolVersion === 'number' &&
          message.protocolVersion !== PROTOCOL_VERSION
        ) {
          fail(
            new Error(
              `Daemon protocol version ${message.protocolVersion} is incompatible with CLI ${PROTOCOL_VERSION}. Run "luma-browser stop" and retry.`,
            ),
          );
          return;
        }
      }

      switch (message.type) {
        case 'stdout':
          onStdout(String(message.data ?? ''));
          break;
        case 'stderr':
          onStderr(String(message.data ?? ''));
          break;
        case 'result':
          result = (message.data ?? null) as RequestResult<RequestType> | null;
          break;
        case 'complete':
          socket.end();
          resolve(result as RequestResult<T['type']> | null);
          break;
        case 'error':
          fail(new Error(String(message.message ?? 'Unknown daemon error')));
          break;
        default:
          break;
      }
    });

    socket.on('close', () => {
      if (!failed) {
        resolve(result as RequestResult<T['type']> | null);
      }
    });
  });
}

export function createRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
