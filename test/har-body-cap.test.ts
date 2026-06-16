import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { test } from 'node:test';
import { NetworkHarRecorder } from '../lib/session/capture.js';

function createMockEmitter() {
  const listeners = {};
  return {
    on(event, handler) {
      (listeners[event] ??= []).push(handler);
    },
    off(event, handler) {
      listeners[event] = (listeners[event] ?? []).filter((h) => h !== handler);
    },
    emit(event, payload) {
      for (const handler of listeners[event] ?? []) {
        handler(payload);
      }
    },
  };
}

function fakeRequest({ url = 'https://example.com/large', method = 'GET' } = {}) {
  return {
    method: () => method,
    url: () => url,
    headers: () => ({}),
  };
}

function fakeResponse({
  request,
  headers = {},
  status = 200,
  bodyFn = () => Buffer.from('small'),
} = {}) {
  return {
    request: () => request,
    status: () => status,
    statusText: () => 'OK',
    headers: () => headers,
    body: bodyFn,
  };
}

async function emitRequestResponse(recorder, page, response) {
  page.emit('request', response.request());
  await Promise.resolve();
  // onResponse is async; await a tick after invoking
  const handlers = [];
  for (const handler of page._responseHandlers ?? []) handlers.push(handler);
  if (page._responseHandlers) {
    await Promise.all(page._responseHandlers.map((h) => h(response)));
  }
}

test('omits HAR body for binary mime types without reading body', async (t) => {
  const recorder = new NetworkHarRecorder();
  const page = createMockEmitter();
  recorder.attachToPage(page);

  let bodyCalled = false;
  const req = fakeRequest();
  page.emit('request', req);
  await Promise.resolve();

  const responseHandlers = [];
  const originalOn = page.on;
  // Already attached — replay 'response' through real emit.
  const response = fakeResponse({
    request: req,
    headers: { 'content-type': 'video/mp4' },
    bodyFn: () => {
      bodyCalled = true;
      return Buffer.alloc(0);
    },
  });
  // Wait for the response handler chain to complete.
  for (const handler of page.on === originalOn ? [] : []) responseHandlers.push(handler);
  page.emit('response', response);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const root = await mkdtemp(join(tmpdir(), 'luma-har-'));
  try {
    const path = join(root, 'network.har');
    await recorder.write(path);
    const har = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(har.log.entries.length, 1);
    assert.equal(har.log.entries[0].response.content.omitted, 'binary');
    assert.equal(har.log.entries[0].response.content.text, undefined);
    assert.equal(bodyCalled, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('omits HAR body when content-length exceeds cap', async () => {
  const recorder = new NetworkHarRecorder();
  const page = createMockEmitter();
  recorder.attachToPage(page);

  let bodyCalled = false;
  const req = fakeRequest({ url: 'https://example.com/big.json' });
  page.emit('request', req);

  const response = fakeResponse({
    request: req,
    headers: { 'content-type': 'application/json', 'content-length': '50000000' },
    bodyFn: () => {
      bodyCalled = true;
      return Buffer.alloc(0);
    },
  });
  page.emit('response', response);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const root = await mkdtemp(join(tmpdir(), 'luma-har-'));
  try {
    const path = join(root, 'network.har');
    await recorder.write(path);
    const har = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(har.log.entries[0].response.content.omitted, 'too-large');
    assert.equal(har.log.entries[0].response.content.size, 50000000);
    assert.equal(bodyCalled, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('captures small text bodies normally', async () => {
  const recorder = new NetworkHarRecorder();
  const page = createMockEmitter();
  recorder.attachToPage(page);

  const req = fakeRequest({ url: 'https://example.com/small.txt' });
  page.emit('request', req);

  const response = fakeResponse({
    request: req,
    headers: { 'content-type': 'text/plain' },
    bodyFn: () => Buffer.from('hello world'),
  });
  page.emit('response', response);
  await new Promise((resolve) => setTimeout(resolve, 10));

  const root = await mkdtemp(join(tmpdir(), 'luma-har-'));
  try {
    const path = join(root, 'network.har');
    await recorder.write(path);
    const har = JSON.parse(await readFile(path, 'utf8'));
    const entry = har.log.entries[0];
    assert.equal(entry.response.content.size, 11);
    assert.equal(entry.response.content.encoding, 'base64');
    assert.equal(
      Buffer.from(entry.response.content.text, 'base64').toString('utf8'),
      'hello world',
    );
    assert.equal(entry.response.content.omitted, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
