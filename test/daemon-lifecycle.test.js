import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldRestartDaemon } from '../lib/daemon-lifecycle.js';

test('shouldRestartDaemon returns false when versions match', () => {
  assert.equal(shouldRestartDaemon('0.1.0', '0.1.0'), false);
});

test('shouldRestartDaemon returns true when versions differ', () => {
  assert.equal(shouldRestartDaemon('0.2.0', '0.1.0'), true);
});

test('shouldRestartDaemon returns false when daemon version is missing', () => {
  assert.equal(shouldRestartDaemon('0.1.0', null), false);
  assert.equal(shouldRestartDaemon('0.1.0', undefined), false);
});
