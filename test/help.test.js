import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HELP } from '../lib/cli/help.js';

test('HELP documents agent workflows and sandbox API for LLMs', () => {
  assert.match(HELP, /luma-scripting/);
  assert.match(HELP, /luma-session/);
  assert.match(HELP, /\/luma:verify/);
  assert.match(HELP, /snapshotForAI/);
  assert.match(HELP, /session end.*--no-report/s);
  assert.match(HELP, /session abort/s);
  assert.match(HELP, /NOT Node\.js/);
  assert.match(HELP, /page\.on/);
  assert.match(HELP, /NOT supported/);
  assert.match(HELP, /Choose a workflow/);
});
