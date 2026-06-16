import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENGINE_HELP, HELP, ORCHESTRATOR_HELP } from '../lib/cli/help.js';

test('HELP documents dual binaries and workflows', () => {
  assert.match(HELP, /luma-browser/);
  assert.match(HELP, /\bluma\b/);
  assert.match(HELP, /Choose a workflow/);
});

test('ORCHESTRATOR_HELP documents sessions and viewer', () => {
  assert.match(ORCHESTRATOR_HELP, /luma session start/);
  assert.match(ORCHESTRATOR_HELP, /luma viewer/);
  assert.match(ORCHESTRATOR_HELP, /luma-scripting/);
  assert.match(ORCHESTRATOR_HELP, /\/luma:verify/);
});

test('ENGINE_HELP documents sandbox API for LLMs', () => {
  assert.match(ENGINE_HELP, /snapshotForAI/);
  assert.match(ENGINE_HELP, /NOT Node\.js/);
  assert.match(ENGINE_HELP, /page\.on/);
  assert.match(ENGINE_HELP, /NOT supported/);
  assert.match(ENGINE_HELP, /--session/);
});
