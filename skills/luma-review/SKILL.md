---
name: luma-review
description: Open and triage recorded luma-browser sessions in the local viewer. Use when the user wants to review a run, open the report, or see what failed. Trigger phrases — "open the viewer", "show the last session", "what failed", "review the recording".
license: MIT
metadata:
  author: luma-browser
  version: 0.2.2
  category: workflow
  tags:
    - luma-browser
    - viewer
    - triage
---

# luma-browser review (triage)

Open recorded sessions in the local viewer and summarize what happened. Sessions live in `~/.luma-browser/sessions/<id>/`.

## When to use

- Browsing or replaying recorded sessions
- Triaging pass/fail, console errors, network issues
- Opening `report.html` or artifacts for a session

## Workflow

1. **Browse:** `luma-browser viewer` or `luma-browser viewer --session <id> --open`
2. **Search:** filter sessions on the index by name, id, status, or date
3. **Detail:** `/session/<id>/` shows step list, artifact links, embedded report, and `npx playwright show-trace …` commands
4. **Summarize:** read `results.json` — steps, success, artifacts; cite `report.html` path.
5. Review is **read-only** — don't modify session files.

## Artifacts per step

`steps/000/` contains `trace.zip`, `network.har`, `console.jsonl`, `screenshot.png`, `script.js`, `stdout.txt`, `exported.spec.js` (after `--render-report`).
