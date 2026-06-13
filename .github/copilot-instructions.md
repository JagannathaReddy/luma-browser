# luma-browser — Copilot instructions

This repository ships **luma-browser**: a Node.js CLI for browser automation and recorded QA sessions.

## When to use luma-browser

| Goal | Approach |
|------|----------|
| One-off scrape / navigate / check | `luma-browser run script.js` or stdin heredoc |
| Record a QA session with report | `session start` → step scripts → `session end` |
| Review past runs | `luma-browser viewer` |

## Custom agents

Pick a specialized agent from the agent picker (`.github/agents/`):

- **luma-automate** — one-off browser tasks
- **luma-session** — recorded QA sessions with `report.html`
- **luma-verify** — diff → prioritized QA plan → optional sessions
- **luma-review** — triage recorded sessions in the viewer

## Scripting rules

Scripts run in a **QuickJS sandbox**, not Node.js. Use top-level `await`.

- `browser.getPage("main")` — persistent named page across session steps
- `page.snapshotForAI()` — observe unknown pages before acting
- `console.log` — stdout observation channel for agents

Full API: `skills/luma-scripting/references/REFERENCE.md`

## Session lifecycle

<!-- STITCH:session-rules:start -->
- Always `luma-browser session end <id>` before `luma-browser stop` — stop aborts open sessions without a report
- `session end` renders report.html by default; use `--no-report` to skip
- Use `session abort <id>` to cancel an open session without a report
<!-- STITCH:session-rules:end -->

## Install

```bash
npm install -g luma-browser
luma-browser install
luma-browser --help
```
