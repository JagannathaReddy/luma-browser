import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('typed IPC exports', () => {
  it('exports discriminated result types from protocol package', async () => {
    const protocol = await import('@jagannathamv/protocol');
    assert.equal(typeof protocol.PROTOCOL_VERSION, 'number');
    assert.equal(typeof protocol.parseRequest, 'function');

    /** @type {import('@jagannathamv/protocol').SessionStartResult} */
    const result = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      dir: '/tmp/sessions/550e8400-e29b-41d4-a716-446655440000',
      browser: 'default',
      capture: {
        trace: true,
        video: true,
        har: true,
        console: true,
        stepScreenshot: true,
      },
    };

    assert.equal(result.capture.trace, true);
  });

  it('daemon-client sendRequest is exported with types', async () => {
    const client = await import('@jagannathamv/daemon-client');
    assert.equal(typeof client.sendRequest, 'function');
    assert.equal(typeof client.createRequestId, 'function');
  });
});
