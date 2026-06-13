---
name: luma-scripting
description: The luma-browser sandbox scripting API for browser automation. Use when writing or debugging a luma-browser script — open a page, click, fill, extract text, observe an unknown page with snapshotForAI, evaluate in the page, take a screenshot, persist data between steps, or understand sandbox limits. Trigger phrases — "how do I click in luma-browser", "luma page API", "what's on this page", "snapshotForAI", "saveScreenshot", "why is my script timing out".
license: MIT
metadata:
  author: luma-browser
  version: 0.2.0
  category: reference
  tags:
    - luma-browser
    - browser-automation
    - playwright
    - scripting
---

# luma-browser scripting API

Scripts are plain **async JavaScript** in a QuickJS sandbox with a Playwright-like API.
Both stdin/`luma-browser run` (one-off) and `luma-browser --session --step` (recorded step) execute the same way: top-level `await`, with `browser`, `console`, and file helpers as globals.

## When to use

- Writing a script to drive a browser with luma-browser
- Looking up page/locator methods (`goto`, `locator`, `evaluate`, `waitForSelector`, `screenshot`)
- Persisting a page or file between session steps
- Debugging timeouts, missing globals, or callback errors

## Quick start

```js
const page = await browser.getPage("main");
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
console.log(await page.title());

const headings = await page.evaluate(() =>
  [...document.querySelectorAll("h1, h2")].map((h) => h.textContent.trim())
);
console.log(JSON.stringify(headings));

await page.locator("a").first().click();
const buf = await page.screenshot({ fullPage: false });
await saveScreenshot(buf, "page.png");
```

## Observing the page

```js
const page = await browser.getPage("main");
const snap = await page.snapshotForAI();
console.log(page.url(), await page.title());
console.log(snap.full); // aria outline — pick getByRole/getByText from this
```

- Unknown page? Snapshot first, then act. Never guess selectors blind.
- Known selectors? Skip the snapshot — faster and more reliable.

For the **complete API** — every method, sandbox limits, and the per-step screenshot rule — see [`references/REFERENCE.md`](references/REFERENCE.md).
