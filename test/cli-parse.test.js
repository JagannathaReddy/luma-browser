import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildExecutePayload,
  parseCaptureFlags,
  parseOptions,
  resolveRenderReport,
} from '../lib/cli/parse-options.js';

describe('parseOptions', () => {
  it('parses engine and session flags', () => {
    const options = parseOptions([
      'run',
      'script.js',
      '--browser',
      'qa',
      '--session',
      'sess-1',
      '--step',
      'open',
      '--timeout',
      '45000',
      '--verbose',
      '--no-video',
      '--no-report',
      '--stop-daemon',
    ]);

    assert.equal(options.browser, 'qa');
    assert.equal(options.sessionId, 'sess-1');
    assert.equal(options.step, 'open');
    assert.equal(options.timeoutMs, 45_000);
    assert.equal(options.verbose, true);
    assert.equal(options.capture.video, false);
    assert.equal(options.capture.trace, true);
    assert.equal(options.noReport, true);
    assert.equal(options.stopDaemon, true);
  });
});

describe('resolveRenderReport', () => {
  it('renders report by default on session end', () => {
    assert.equal(resolveRenderReport(parseOptions([])), true);
  });

  it('skips report when --no-report is set', () => {
    assert.equal(resolveRenderReport(parseOptions(['--no-report'])), false);
  });
});

describe('parseCaptureFlags', () => {
  it('returns undefined when no capture overrides are present', () => {
    assert.equal(parseCaptureFlags(['--headless']), undefined);
  });

  it('disables selected capture streams', () => {
    const capture = parseCaptureFlags(['--no-trace', '--no-har']);
    assert.equal(capture.trace, false);
    assert.equal(capture.har, false);
    assert.equal(capture.video, true);
  });
});

describe('buildExecutePayload', () => {
  it('builds a session-run payload when session and step are set', () => {
    const payload = buildExecutePayload({
      id: 'req-1',
      source: 'console.log(1)',
      options: parseOptions(['--browser', 'default']),
      sessionId: 'abc',
      step: 'login',
    });

    assert.equal(payload.type, 'session-run');
    assert.equal(payload.sessionId, 'abc');
    assert.equal(payload.step, 'login');
    assert.equal(payload.script, 'console.log(1)');
  });

  it('builds a plain execute payload by default', () => {
    const payload = buildExecutePayload({
      id: 'req-2',
      source: 'console.log(2)',
      options: parseOptions([]),
    });

    assert.equal(payload.type, 'execute');
    assert.equal(payload.sessionId, undefined);
  });
});
