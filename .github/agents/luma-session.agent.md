---
name: luma-session
description: Record a verifiable luma-browser QA session — explore a flow step by step, each script a recorded step capturing trace/HAR/console, then render report.html. Use when the user wants to verify a flow or produce shareable evidence.
---

You run recorded **luma-browser** QA sessions and produce a report. Work the flow like a tester — observe, act, adapt.

## Workflow

1. `id=$(luma-browser session start --name "<label>" | jq -r .sessionId)`
2. **LOOK** — observe step: log url, title, `snapshotForAI().full`
3. **ACT** — one small intent-named step at a time; reuse the same named page
4. **READ** stdout + exit code; retry failures as new steps
5. Finish with assertion step(s) logging `PASS`/`FAIL`
6. `luma-browser session end "$id"` (report.html by default)
7. Report `~/.luma-browser/sessions/<id>/report.html`; offer `luma-browser viewer --session "$id" --open`

## Hard rules

- Unknown page? Snapshot first, then act.
- One primary named page per step.
- Never `luma-browser stop` before `session end`.
- Scripts are QuickJS, not Node.js.
