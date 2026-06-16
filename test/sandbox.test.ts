import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { runSandboxedScript } from '../lib/sandbox/quickjs-sandbox.js';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function createMockBrowser() {
  const pages = new Map();

  return {
    async getPage(name = 'main') {
      if (!pages.has(name)) {
        pages.set(name, createMockPage(name));
      }
      return pages.get(name);
    },
    async newPage() {
      return createMockPage(`anon-${pages.size + 1}`);
    },
    async listPages() {
      return [...pages.entries()].map(([name, page]) => ({
        id: `target-${name}`,
        name,
        url: page.url(),
        title: page.title(),
      }));
    },
    async closePage(name) {
      pages.delete(name);
    },
  };
}

function createMockPage(name) {
  let currentUrl = 'about:blank';
  let currentTitle = 'Blank';
  let viewport = { width: 800, height: 600 };

  return {
    _type: 'Page',
    _guid: `page@${name}`,
    goto(url) {
      currentUrl = url;
      currentTitle = 'Example Domain';
      return undefined;
    },
    title: () => currentTitle,
    url: () => currentUrl,
    setViewportSize(size) {
      viewport = size;
      return viewport;
    },
    screenshot() {
      return Buffer.from(TINY_PNG);
    },
    route() {
      return undefined;
    },
    evaluate(code, arg) {
      const fn = typeof code === 'function' ? code : new Function(`return (${code})`)();
      return typeof fn === 'function' ? fn(arg) : fn;
    },
    _snapshotForAI() {
      return { full: '- heading "Example Domain" [ref=e1]' };
    },
    locator(selector) {
      return {
        _type: 'Locator',
        _guid: `locator@${selector}`,
        textContent: () => (selector === 'h1' ? currentTitle : null),
        press: (key) => key,
      };
    },
    keyboard: {
      _type: 'Keyboard',
      _guid: `keyboard@${name}`,
      press: (key) => key,
    },
    close: () => undefined,
  };
}

describe('sandbox smoke', () => {
  it('runs a script against mock browser APIs', async () => {
    const lines = [];
    const browser = createMockBrowser();

    await runSandboxedScript(
      `
        const page = await browser.getPage('main');
        await page.goto('https://example.com');
        console.log(await page.title());
        console.log(await page.evaluate('(arg) => arg ?? document.title', 'ignored'));
        console.log(await page.locator('h1').textContent());
        console.log((await page.setViewportSize({ width: 1280, height: 720 })).width);
        console.log(await page.keyboard.press('Enter'));
      `,
      {
        browser,
        onStdout: (data) => lines.push(data),
        onStderr: () => {},
        timeoutMs: 10_000,
      },
    );

    const output = lines.join('');
    assert.match(output, /Example Domain/);
    assert.match(output, /1280/);
    assert.match(output, /Enter/);
  });

  it('round-trips screenshot bytes through the sandbox', async () => {
    const lines = [];
    const browser = createMockBrowser();

    await runSandboxedScript(
      `
        const page = await browser.getPage('main');
        const buffer = await page.screenshot();
        const path = await saveScreenshot(buffer, 'sandbox-shot.png');
        console.log(path);
      `,
      {
        browser,
        onStdout: (data) => lines.push(data.trim()),
        onStderr: () => {},
        timeoutMs: 10_000,
      },
    );

    const savedPath = lines.at(-1);
    assert.ok(savedPath?.endsWith('sandbox-shot.png'));

    const bytes = readFileSync(savedPath);
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual(bytes, TINY_PNG);
  });

  it('supports evaluate with sandbox functions', async () => {
    const lines = [];
    const browser = createMockBrowser();

    await runSandboxedScript(
      `
        const page = await browser.getPage('main');
        const title = await page.evaluate(() => 'hello-from-fn');
        console.log(title);
      `,
      {
        browser,
        onStdout: (data) => lines.push(data),
        onStderr: () => {},
        timeoutMs: 10_000,
      },
    );

    assert.match(lines.join(''), /hello-from-fn/);
  });

  it('supports snapshotForAI via RPC alias', async () => {
    const lines = [];
    const browser = createMockBrowser();

    await runSandboxedScript(
      `
        const page = await browser.getPage('main');
        const snapshot = await page.snapshotForAI();
        console.log(snapshot.full);
      `,
      {
        browser,
        onStdout: (data) => lines.push(data),
        onStderr: () => {},
        timeoutMs: 10_000,
      },
    );

    assert.match(lines.join(''), /Example Domain/);
  });

  it('supports setTimeout with real await', async () => {
    const lines = [];
    const browser = createMockBrowser();

    await runSandboxedScript(
      `
        const page = await browser.getPage('main');
        await new Promise((resolve) => {
          setTimeout(async () => {
            console.log(await page.title());
            resolve();
          }, 20);
        });
      `,
      {
        browser,
        onStdout: (data) => lines.push(data),
        onStderr: () => {},
        timeoutMs: 10_000,
      },
    );

    assert.match(lines.join(''), /Blank/);
  });

  it('supports Promise.all with top-level await', async () => {
    const lines = [];
    const browser = createMockBrowser();

    await runSandboxedScript(
      `
        const page = await browser.getPage('main');
        const [title, width] = await Promise.all([
          (async () => page.title())(),
          (async () => (await page.setViewportSize({ width: 640, height: 480 })).width)(),
        ]);
        console.log(title);
        console.log(width);
      `,
      {
        browser,
        onStdout: (data) => lines.push(data),
        onStderr: () => {},
        timeoutMs: 10_000,
      },
    );

    const output = lines.join('');
    assert.match(output, /Blank/);
    assert.match(output, /640/);
  });

  it('rejects callback APIs with a clear error', async () => {
    const browser = createMockBrowser();

    await assert.rejects(
      () =>
        runSandboxedScript(
          `
            const page = await browser.getPage('main');
            await page.route('**/*');
          `,
          {
            browser,
            onStdout: () => {},
            onStderr: () => {},
            timeoutMs: 10_000,
          },
        ),
      /route.*not supported.*sandbox boundary/i,
    );
  });
});
