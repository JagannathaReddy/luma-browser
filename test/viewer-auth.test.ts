import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { test } from 'node:test';
import { createViewerServer } from '../lib/viewer/server.js';

test('viewer rejects requests without token', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-auth-'));
  const viewer = await createViewerServer({
    sessionsRoot: root,
    port: 0,
    token: 'secret-token-xyz',
  });
  try {
    const unauth = await fetch(`${viewer.url}/`);
    assert.equal(unauth.status, 401);

    const badToken = await fetch(`${viewer.url}/?t=wrong`);
    assert.equal(badToken.status, 401);
  } finally {
    await viewer.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('viewer accepts valid query token and sets cookie', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-auth-'));
  const viewer = await createViewerServer({
    sessionsRoot: root,
    port: 0,
    token: 'secret-token-xyz',
  });
  try {
    const ok = await fetch(`${viewer.url}/?t=secret-token-xyz`);
    assert.equal(ok.status, 200);
    const setCookie = ok.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /luma_t=secret-token-xyz/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
  } finally {
    await viewer.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('viewer accepts cookie-only on subsequent requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'luma-auth-'));
  const viewer = await createViewerServer({
    sessionsRoot: root,
    port: 0,
    token: 'secret-token-xyz',
  });
  try {
    const cookieOnly = await fetch(`${viewer.url}/`, {
      headers: { cookie: 'luma_t=secret-token-xyz' },
    });
    assert.equal(cookieOnly.status, 200);
  } finally {
    await viewer.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('viewer constructor rejects empty token', () => {
  assert.throws(
    () => createViewerServer({ sessionsRoot: '/tmp', port: 0, token: '' }),
    /non-empty token/,
  );
});
