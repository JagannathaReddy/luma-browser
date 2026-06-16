import net from 'net';
import { readLines } from '../line-reader.js';
import { parseRequest, serializeResponse } from '../protocol.js';
import { createSocketOutput, writeFatalError } from './output.js';
export function createServer({ router, logger, paths, lifecycle }) {
    const clients = new Set();
    const server = net.createServer((socket) => {
        if (lifecycle.shuttingDown) {
            socket.setEncoding('utf8');
            socket.write(serializeResponse({ id: 'unknown', type: 'error', message: 'Daemon is shutting down' }), () => socket.end());
            return;
        }
        clients.add(socket);
        socket.setEncoding('utf8');
        let queue = Promise.resolve();
        readLines(socket, (line) => {
            queue = queue
                .then(() => dispatchLine(socket, line, { router, logger, lifecycle }))
                .catch(async (error) => {
                if (!socket.destroyed) {
                    await writeFatalError(socket, 'unknown', error);
                }
            });
        });
        socket.on('close', () => clients.delete(socket));
        socket.on('error', () => clients.delete(socket));
    });
    return {
        server,
        clients,
        listen: () => bindEndpoint(server, paths),
    };
}
async function dispatchLine(socket, line, { router, logger, lifecycle }) {
    const parsed = parseRequest(line);
    if (parsed.success === false) {
        await writeFatalError(socket, parsed.id ?? 'unknown', new Error(parsed.error));
        return;
    }
    const { request } = parsed;
    if (lifecycle.shuttingDown && request.type !== 'stop') {
        await writeFatalError(socket, request.id, new Error('Daemon is shutting down'));
        return;
    }
    const output = createSocketOutput(socket, request.id);
    try {
        await router(request, output);
    }
    catch (error) {
        logger.warn('handler threw', {
            type: request.type,
            error: error instanceof Error ? error.message : String(error),
        });
        await output.writeError(error instanceof Error ? error.message : String(error));
    }
}
async function isEndpointActive(endpoint) {
    return new Promise((resolve) => {
        const probe = net.connect(endpoint);
        const finish = (active) => {
            probe.destroy();
            resolve(active);
        };
        probe.once('connect', () => finish(true));
        probe.once('error', () => finish(false));
    });
}
function listen(serverInstance, socketPath) {
    return new Promise((resolve, reject) => {
        serverInstance.once('error', reject);
        serverInstance.listen(socketPath, () => {
            serverInstance.off('error', reject);
            resolve();
        });
    });
}
async function bindEndpoint(serverInstance, paths) {
    try {
        await listen(serverInstance, paths.socketPath);
        return;
    }
    catch (error) {
        if (error.code !== 'EADDRINUSE' || !paths.requiresSocketCleanup()) {
            throw error;
        }
    }
    if (await isEndpointActive(paths.socketPath)) {
        process.stderr.write('daemon already running\n');
        process.exit(0);
    }
    await paths.unlinkIfExists(paths.socketPath);
    await listen(serverInstance, paths.socketPath);
}
//# sourceMappingURL=server.js.map