import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chromium } from 'playwright';
import {
  encodeHostResponse,
  HandleRegistry,
  invokeHostPathCall,
  invokeHostPathFlush,
  isPlaywrightChannel,
} from '../lib/sandbox/playwright-rpc.js';

describe('playwright rpc', () => {
  it('detects Playwright channel objects', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    assert.equal(isPlaywrightChannel(page), true);
    assert.equal(isPlaywrightChannel(page.locator('body')), true);
    assert.equal(isPlaywrightChannel(page.keyboard), true);
    assert.equal(isPlaywrightChannel({ _type: 'Page', _guid: 'page@test' }), true);
    assert.equal(isPlaywrightChannel({ goto: () => {} }), false);

    await browser.close();
  });

  it('encodes remote handles and invokes path calls', async () => {
    const registry = new HandleRegistry();
    const page = {
      _type: 'Page',
      _guid: 'page@test',
      keyboard: {
        _type: 'Keyboard',
        _guid: 'keyboard@test',
        press: (key) => key,
      },
      title: () => 'Example',
    };

    const handle = encodeHostResponse(page, registry);
    assert.equal(handle.type, 'remote');

    const title = await invokeHostPathCall(registry, handle.handle, [], 'title', []);
    assert.equal(title, 'Example');

    const key = await invokeHostPathCall(registry, handle.handle, ['keyboard'], 'press', ['Enter']);
    assert.equal(key, 'Enter');
  });

  it('rejects callback methods before Playwright is invoked', async () => {
    const registry = new HandleRegistry();
    const page = {
      _type: 'Page',
      _guid: 'page@test',
      route: () => {
        throw new Error('route should not be called');
      },
    };

    const handle = encodeHostResponse(page, registry);

    await assert.rejects(
      () => invokeHostPathCall(registry, handle.handle, [], 'route', ['**/*', {}]),
      /route.*not supported.*sandbox boundary/i,
    );
  });

  it('maps snapshotForAI to the internal Playwright method', async () => {
    const registry = new HandleRegistry();
    const page = {
      _type: 'Page',
      _guid: 'page@test',
      _snapshotForAI: () => ({ full: 'snapshot-text' }),
    };

    const handle = encodeHostResponse(page, registry);
    const snapshot = await invokeHostPathCall(registry, handle.handle, [], 'snapshotForAI', []);
    assert.equal(snapshot.full, 'snapshot-text');
  });

  it('compiles sandbox function bodies for evaluate', async () => {
    const registry = new HandleRegistry();
    const page = {
      _type: 'Page',
      _guid: 'page@test',
      evaluate(fn, arg) {
        return fn(arg);
      },
    };

    const handle = encodeHostResponse(page, registry);
    const result = await invokeHostPathCall(registry, handle.handle, [], 'evaluate', [
      { __kind: 'function', source: '(value) => value + "-ok"' },
      'test',
    ]);
    assert.equal(result, 'test-ok');
  });

  it('flushes deferred factory steps before terminal calls', async () => {
    const registry = new HandleRegistry();
    const page = {
      _type: 'Page',
      _guid: 'page@test',
      locator(selector) {
        return {
          _type: 'Locator',
          _guid: `locator@${selector}`,
          textContent: () => `text:${selector}`,
        };
      },
    };

    const handle = encodeHostResponse(page, registry);
    const text = await invokeHostPathFlush(
      registry,
      handle.handle,
      [{ objectPath: [], method: 'locator', args: ['h1'] }],
      [],
      'textContent',
      [],
    );
    assert.equal(text, 'text:h1');
  });
});
