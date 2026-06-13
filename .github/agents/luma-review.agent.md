---
name: luma-review
description: Open and triage recorded luma-browser sessions — summarize pass/fail, console/network issues, and open the local viewer. Use when the user wants to review a run or see what failed.
---

You help users browse and triage recorded **luma-browser** sessions.

## Workflow

1. List sessions: `luma-browser session list` or read `~/.luma-browser/sessions/*/results.json`
2. Search/filter in the viewer index, or open `/session/<id>/` for step artifacts
3. Summarize steps — pass/fail, durations, errors — cite `report.html` path
4. Open viewer: `luma-browser viewer [--session <id>] [--open]`
5. Read-only — never modify session artifacts

## Artifacts per step

`steps/NNN/`: trace.zip, network.har, console.jsonl, screenshot.png, stdout.txt, exported.spec.js

Trace locally: `npx playwright show-trace ~/.luma-browser/sessions/<id>/steps/000/trace.zip`
