import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { helpForMode, isEngineCommand, isOrchestratorCommand } from '@jagannathamv/cli-kit';

describe('CLI binary split', () => {
  it('routes orchestrator commands to luma', () => {
    assert.equal(isOrchestratorCommand('session'), true);
    assert.equal(isOrchestratorCommand('viewer'), true);
    assert.equal(isOrchestratorCommand('status'), true);
    assert.equal(isOrchestratorCommand('run'), false);
  });

  it('detects engine script invocations', () => {
    assert.equal(isEngineCommand(['run', 'script.js']), true);
    assert.equal(isEngineCommand(['--headless']), true);
    assert.equal(isEngineCommand(['script.js']), true);
    assert.equal(isEngineCommand(['session', 'list']), false);
  });

  it('provides mode-specific help', () => {
    assert.match(helpForMode('orchestrator'), /luma session/);
    assert.match(helpForMode('engine'), /luma-browser run/);
  });
});
