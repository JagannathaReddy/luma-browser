---
name: luma-session
description: Record a verifiable QA session with luma-browser — explore a flow step by step against one persistent browser, each script a recorded step capturing trace/HAR/console/screenshot, then render report.html. Use when the user wants to verify a flow, produce evidence, or capture a trace. Trigger phrases — "record a session", "QA this flow", "verify checkout", "give me a report".
license: MIT
metadata:
  author: luma-browser
  version: 0.2.2
  category: workflow
  tags:
    - luma-browser
    - qa
    - testing
    - report
---

# luma-browser session (recorded QA)

Work the flow like a tester — observe, act, adapt. Every script runs as a **step** against one persistent browser; luma-browser records trace / HAR / console / screenshot and renders `report.html`. Use **luma-scripting** for the API.

## When to use

- Verifying a user flow with shareable evidence
- Capturing trace, network, or console of a run
- Any run where "what happened?" needs a report (for a quick one-off, use **luma-automate**)

## Workflow

1. `luma-browser install` (one-time).
2. `id=$(luma-browser session start --name "checkout" | jq -r .sessionId)`
3. **LOOK** — observe step:
   ```sh
   luma-browser --session "$id" --step observe-home --headless <<'EOF'
   const page = await browser.getPage("main");
   await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
   console.log(page.url(), await page.title());
   console.log((await page.snapshotForAI()).full);
   EOF
   ```
4. **ACT** — one small intent-named step at a time; reuse the same named page.
5. **READ** stdout + exit code. Failed? Observe again, retry as a new step.
6. Finish with assertion step(s) logging `PASS`/`FAIL`.
7. `luma-browser session end "$id"` → `~/.luma-browser/sessions/<id>/report.html`
8. Offer **luma-review** / `luma-browser viewer --session "$id" --open`.

## Hard rules

- Unknown page? Snapshot first (`snapshotForAI`), then act.
- One primary named page per step (report screenshot rule).
- Name steps by intent (`observe-cart`, `submit-login`), not `step-3`.
- `session end` renders report.html by default; use `--no-report` to skip.
- Use `session abort` to cancel without a report.
- Never `luma-browser stop` mid-session.
