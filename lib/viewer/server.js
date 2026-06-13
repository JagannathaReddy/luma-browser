import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { URL } from 'url';
import { renderIndexHtml } from './index-page.js';
import { contentTypeForPath } from './mime.js';
import { fileExists, isSessionId, resolveSessionFile } from './paths.js';
import { renderSessionDetailHtml } from './session-page.js';
import { listViewerSessions, loadSessionDetail } from './sessions.js';

export function createViewerServer({ sessionsRoot, host = '127.0.0.1', port = 4173 }) {
  const server = createServer(async (request, response) => {
    try {
      await handleRequest(request, response, { sessionsRoot });
    } catch (error) {
      sendText(response, 500, error instanceof Error ? error.message : 'Internal server error');
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const resolvedPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        server,
        host,
        port: resolvedPort,
        url: `http://${host}:${resolvedPort}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }
              closeResolve();
            });
          }),
      });
    });
  });
}

async function handleRequest(request, response, { sessionsRoot }) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, 'Method not allowed');
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    const sessions = await listViewerSessions(sessionsRoot);
    sendHtml(response, renderIndexHtml(sessions, { sessionsDir: sessionsRoot }));
    return;
  }

  const sessionMatch = pathname.match(/^\/session\/([^/]+)(?:\/(.*))?$/);
  if (!sessionMatch) {
    sendText(response, 404, 'Not found');
    return;
  }

  const sessionId = sessionMatch[1];
  const remainder = sessionMatch[2] ?? '';

  if (!isSessionId(sessionId)) {
    sendText(response, 400, 'Invalid session id');
    return;
  }

  if (!remainder) {
    try {
      const detail = await loadSessionDetail(sessionsRoot, sessionId);
      sendHtml(response, renderSessionDetailHtml(detail, { sessionsDir: sessionsRoot }));
    } catch {
      sendText(response, 404, 'Session not found');
    }
    return;
  }

  let filePath;
  try {
    filePath = resolveSessionFile(sessionsRoot, sessionId, remainder);
  } catch {
    sendText(response, 400, 'Invalid path');
    return;
  }

  if (!(await fileExists(filePath))) {
    sendText(response, 404, 'Not found');
    return;
  }

  const body = await readFile(filePath);
  response.writeHead(200, {
    'Content-Type': contentTypeForPath(filePath),
    'Cache-Control': 'no-store',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  response.end(body);
}

function sendHtml(response, html) {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(html);
}

function sendText(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(message);
}
