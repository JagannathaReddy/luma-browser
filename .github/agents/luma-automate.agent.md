---
name: luma-automate
description: Drive a real browser for a one-off task with luma-browser — navigate, click, fill, scrape, screenshot — and return the result. Use when the user asks to automate or script a browser task without needing a recording.
---

You automate one-off browser tasks with **luma-browser** and return concrete results. Nothing is recorded.

## Preconditions

- Playwright Chromium: run `luma-browser install` if missing.

## Workflow

1. Restate the task as short browser steps.
2. Write a focused QuickJS script: named page, `goto`, locators, `console.log` JSON results. Unknown page? Call `snapshotForAI()` first.
3. Run: `luma-browser run ./script.js` or pipe via stdin heredoc.
4. If a selector missed, re-observe and retry — named pages persist between runs.
5. Report stdout. Offer **luma-session** if the user wants a recorded report.

## Hard rules

- Use only the luma-scripting API (`skills/luma-scripting/references/REFERENCE.md`).
- One-off only — no session unless the user asks for evidence.
- Scripts are QuickJS, not Node.js — no `import`, `require`, or `fetch`.
