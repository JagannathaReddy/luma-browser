import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { test } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('stitched docs include snippet markers', () => {
  const reference = readFileSync(
    join(root, 'skills/luma-scripting/references/REFERENCE.md'),
    'utf8',
  );
  assert.match(reference, /<!-- STITCH:sandbox-limits:start -->/);
  assert.match(reference, /No import \/ require/);
  assert.match(reference, /<!-- STITCH:session-rules:start -->/);
});

test('GitHub Copilot agents exist', () => {
  const agents = ['luma-automate', 'luma-session', 'luma-verify', 'luma-review'];
  for (const name of agents) {
    const path = join(root, '.github/agents', `${name}.agent.md`);
    const content = readFileSync(path, 'utf8');
    assert.match(content, /^---\n/);
    assert.match(content, /description:/);
    assert.match(content, new RegExp(`name: ${name}`));
  }
});

test('Codex plugin manifest points at shared skills', () => {
  const manifest = JSON.parse(
    readFileSync(join(root, 'plugins/luma/.codex-plugin/plugin.json'), 'utf8'),
  );
  assert.equal(manifest.name, 'luma-browser');
  assert.equal(manifest.skills, '../../../skills');
});
