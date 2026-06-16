import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HandleRegistry, invokeHostPathCall } from '../lib/sandbox/playwright-rpc.js';

function makeTarget() {
  return {
    safeProp: { method: () => 42 },
    method: () => 'ok',
  };
}

test('refuses constructor path segment', async () => {
  const registry = new HandleRegistry();
  const handle = registry.register(makeTarget());
  await assert.rejects(
    () => invokeHostPathCall(registry, handle, ['constructor'], 'name', []),
    /not accessible from sandbox/,
  );
});

test('refuses __proto__ path segment', async () => {
  const registry = new HandleRegistry();
  const handle = registry.register(makeTarget());
  await assert.rejects(
    () => invokeHostPathCall(registry, handle, ['__proto__'], 'hasOwnProperty', []),
    /not accessible from sandbox/,
  );
});

test('refuses double-underscore prefix', async () => {
  const registry = new HandleRegistry();
  const handle = registry.register(makeTarget());
  await assert.rejects(
    () => invokeHostPathCall(registry, handle, ['__internal'], 'method', []),
    /not accessible from sandbox/,
  );
});

test('refuses double-underscore method names', async () => {
  const registry = new HandleRegistry();
  const handle = registry.register(makeTarget());
  await assert.rejects(
    () => invokeHostPathCall(registry, handle, [], '__proto__', []),
    /not accessible from sandbox/,
  );
});

test('allows normal property + method paths', async () => {
  const registry = new HandleRegistry();
  const handle = registry.register(makeTarget());
  const result = await invokeHostPathCall(registry, handle, ['safeProp'], 'method', []);
  assert.equal(result, 42);
});
