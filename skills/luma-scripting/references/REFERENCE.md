# luma-browser scripting API — full reference

Scripts run in a QuickJS sandbox. The body is top-level JavaScript with `await`.

## Globals

- `browser` — pre-connected browser handle
- `console` — `log` / `info` / `warn` / `error`, captured per run
- `setTimeout` / `clearTimeout` — basic timers (bounded by `--timeout`)
- `saveScreenshot(buffer, name)` — save screenshot bytes (async)
- `writeFile(name, data)` / `readFile(name)` — small-file persistence under `~/.luma-browser/tmp/` (async)

## `browser`

- `browser.getPage(nameOrTargetId?)` — get-or-create a named page, or attach to an existing tab by CDP target id from `listPages()`. Named pages persist across session steps.
- `browser.newPage()` — anonymous page, auto-closed when the script ends.
- `browser.listPages()` — `[{ id, url, title, name }]`
- `browser.closePage(name)` — close a named page.

## Top-level file helpers

All file I/O is sandboxed to `~/.luma-browser/tmp/`:

- `saveScreenshot(buffer, name)` — buffer first: `await saveScreenshot(await page.screenshot(), "home.png")`
- `writeFile(name, data)` — e.g. `await writeFile("state.json", JSON.stringify(x))`
- `readFile(name)` — returns string contents

## Console

- Top-level `console.log` → stdout (your observation channel).
- `console.log` inside `page.evaluate(() => …)` is captured into the session console artifact.

## Playwright passthrough

Pages and locators are **remote proxies** for the full Playwright API (`Page`, `Locator`, `Frame`, `BrowserContext`, `Keyboard`, `Mouse`, etc.). Common methods:

- `page.goto(url, { waitUntil })` — prefer `"domcontentloaded"` on dev servers
- `page.title()` / `page.url()`
- `page.snapshotForAI(options?)` — `{ full, incremental? }` aria outline for agents
- `page.getByRole(role, { name })` / `page.getByText(text)` / `page.locator(sel)`
- `page.fill(sel, value)` / `page.click(sel)` / `page.press(sel, key)`
- `page.waitForSelector(sel, { state, timeout })` / `page.waitForLoadState(state)`
- `page.screenshot({ fullPage })` — returns Buffer; save with `saveScreenshot`
- `page.evaluate(fn[, arg])` / `page.$eval` / `page.$$eval` — function bodies compiled on the host

Full Playwright docs: https://playwright.dev/docs/api/class-page

## Deferred locators

`page.locator('h1').textContent()` works synchronously in the sandbox — the chain is deferred until a terminal call. Always `await` Playwright promises at the top level.

## The per-step screenshot rule (sessions)

After each recorded step, the daemon captures one screenshot of the primary page. Keep **one primary named page per step**. Extra `saveScreenshot` files land in `~/.luma-browser/tmp/` and are not in the report.

## Passing state between steps

- Reuse the same named page across steps — cookies and navigation persist.
- Pass JSON between steps: `writeFile("state.json", …)` in one step, `readFile` in the next.

## Sandbox limits

<!-- STITCH:sandbox-limits:start -->
This is not Node.js:

- No import / require / fetch / process / Node fs
- No callback APIs: page.on, page.route, exposeFunction, waitForEvent — sandbox functions cannot cross the boundary
- CPU and wall-clock time are bounded (--timeout, default 30s)
- Values crossing evaluate must be JSON-serializable
<!-- STITCH:sandbox-limits:end -->

## Resilience

- Log the state you need for the next decision — stdout is your observation channel.
- Use short timeouts so steps fail fast: `luma-browser --timeout 10000 …`
- In assertion steps, log `WARN`/`FAIL` instead of crashing so evidence is still captured.
<!-- STITCH:session-rules:start -->
- Always `luma-browser session end <id>` before `luma-browser stop` — stop aborts open sessions without a report
- `session end` renders report.html by default; use `--no-report` to skip
- Use `session abort <id>` to cancel an open session without a report
<!-- STITCH:session-rules:end -->

## Example: safe extraction

```js
const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };

const page = await browser.getPage("main");
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
const title = await safe(() => page.title(), "");
console.log(title || "WARN: no title");
```
