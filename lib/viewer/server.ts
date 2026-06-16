import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { URL } from 'url';
import { renderIndexHtml } from './index-page.js';
import { contentTypeForPath } from './mime.js';
import { fileExists, isSessionId, resolveSessionFile } from './paths.js';
import { renderSessionDetailHtml } from './session-page.js';
import { listViewerSessions, loadSessionDetail } from './sessions.js';
import type { ViewerServerHandle } from './types.js';

const COOKIE_NAME = 'luma_t';
const SECURITY_HEADERS = {
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const HTML_CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; media-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'";

export function createViewerServer({ sessionsRoot, host = '127.0.0.1', port = 4173, token }) {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('createViewerServer requires a non-empty token');
  }

  const server = createServer(async (request, response) => {
    try {
      await handleRequest(request, response, { sessionsRoot, token });
    } catch (error) {
      sendText(response, 500, error instanceof Error ? error.message : 'Internal server error');
    }
  });

  return new Promise<ViewerServerHandle>((resolve, reject) => {
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
          new Promise<void>((closeResolve, closeReject) => {
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

function timingSafeEquals(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

function readCookie(request, name) {
  const header = request.headers.cookie;
  if (typeof header !== 'string') {
    return null;
  }
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    if (rawKey?.trim() === name) {
      return rest.join('=').trim();
    }
  }
  return null;
}

function checkToken(request, url, token) {
  const cookieToken = readCookie(request, COOKIE_NAME);
  if (cookieToken && timingSafeEquals(cookieToken, token)) {
    return { ok: true, setCookie: false };
  }
  const queryToken = url.searchParams.get('t');
  if (queryToken && timingSafeEquals(queryToken, token)) {
    return { ok: true, setCookie: true };
  }
  return { ok: false, setCookie: false };
}

function buildCookieHeader(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict`;
}

async function handleRequest(request, response, { sessionsRoot, token }) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, 'Method not allowed');
    return;
  }

  const auth = checkToken(request, url, token);
  if (!auth.ok) {
    sendText(response, 401, 'Unauthorized — viewer requires the token printed at startup');
    return;
  }
  const extraHeaders = auth.setCookie ? { 'Set-Cookie': buildCookieHeader(token) } : {};

  if (pathname === '/' || pathname === '/index.html') {
    const sessions = await listViewerSessions(sessionsRoot);
    sendHtml(
      response,
      await renderIndexHtml(sessions, { sessionsDir: sessionsRoot }),
      extraHeaders,
    );
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
      sendHtml(
        response,
        await renderSessionDetailHtml(detail, { sessionsDir: sessionsRoot }),
        extraHeaders,
      );
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
    ...SECURITY_HEADERS,
    ...extraHeaders,
    'Content-Type': contentTypeForPath(filePath),
    'Cache-Control': 'no-store',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  response.end(body);
}

function sendHtml(response, html, extraHeaders = {}) {
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    ...extraHeaders,
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': HTML_CSP,
    'Cache-Control': 'no-store',
  });
  response.end(html);
}

function sendText(response, status, message) {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(message);
}
