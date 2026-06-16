import net from 'node:net';
import { getSocketPath } from '@jagannathamv/config/paths';
import { PROTOCOL_VERSION, serializeRequest, } from '@jagannathamv/protocol';
import { readLines } from './line-reader.js';
export { readLines } from './line-reader.js';
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
export function sendRequest(request, options = {}) {
    const { onStdout = (data) => process.stdout.write(data), onStderr = (data) => process.stderr.write(data), } = options;
    const endpoint = getSocketPath();
    return new Promise((resolve, reject) => {
        const socket = net.connect(endpoint);
        let result = null;
        let settled = false;
        const settle = (fn) => {
            if (settled)
                return;
            settled = true;
            fn();
        };
        const fail = (error) => {
            settle(() => {
                socket.destroy();
                reject(error instanceof Error ? error : new Error(String(error)));
            });
        };
        socket.setEncoding('utf8');
        socket.on('error', fail);
        socket.on('connect', () => {
            socket.write(serializeRequest(request));
        });
        let versionChecked = false;
        readLines(socket, (line) => {
            let message;
            try {
                message = JSON.parse(line);
            }
            catch (error) {
                fail(error);
                return;
            }
            if (!versionChecked) {
                versionChecked = true;
                if (typeof message.protocolVersion === 'number' &&
                    message.protocolVersion !== PROTOCOL_VERSION) {
                    fail(new Error(`Daemon protocol version ${message.protocolVersion} is incompatible with CLI ${PROTOCOL_VERSION}. Run "luma-browser stop" and retry.`));
                    return;
                }
            }
            // Ignore messages that belong to a different request (should not happen
            // on a single-request-per-connection protocol, but guards against bugs).
            if (message.id !== undefined && message.id !== request.id) {
                return;
            }
            switch (message.type) {
                case 'stdout':
                    onStdout(String(message.data ?? ''));
                    break;
                case 'stderr':
                    onStderr(String(message.data ?? ''));
                    break;
                case 'result':
                    result = (message.data ?? null);
                    break;
                case 'complete':
                    socket.end();
                    settle(() => resolve(result));
                    break;
                case 'error':
                    fail(new Error(String(message.message ?? 'Unknown daemon error')));
                    break;
                default:
                    break;
            }
        });
        socket.on('close', () => {
            settle(() => resolve(result));
        });
    });
}
export function createRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
//# sourceMappingURL=index.js.map