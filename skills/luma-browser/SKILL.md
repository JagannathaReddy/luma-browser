---
name: luma-browser
description: Umbrella entry for luma-browser agent plugins. Ships focused skills (luma-scripting, luma-session, luma-verify, luma-automate, luma-review), subagents, and /luma slash commands for browser automation and recorded QA sessions.
license: MIT
metadata:
  author: luma-browser
  version: 0.2.2
  category: meta
  tags:
    - luma-browser
    - browser-automation
    - qa
---

# luma-browser agent plugin

Install this plugin to give coding agents browser automation and recorded QA workflows.

## Skills

| Skill | Use when |
|---|---|
| **luma-scripting** | Writing or debugging sandbox scripts — full API in `references/REFERENCE.md` |
| **luma-automate** | One-off browser task, no recording |
| **luma-session** | Record a QA session with trace/HAR/console → `report.html` |
| **luma-verify** | Code change → prioritized QA plan, optionally record |
| **luma-review** | Open viewer, triage recorded sessions |

## Commands

- `/luma:run` — one-off automation
- `/luma:session` — record a verifiable session
- `/luma:verify` — diff → QA plan → optional recording
- `/luma:review` — browse and triage sessions

## Quick reference

```bash
luma-browser install
luma-browser --headless <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
console.log(await page.title());
EOF

id=$(luma-browser session start --name demo | jq -r .sessionId)
luma-browser --session "$id" --step open --headless <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
console.log(await page.title());
EOF
luma-browser session end "$id" --render-report
luma-browser viewer --session "$id" --open
```

Data directory: `~/.luma-browser/`. After upgrading, run `luma-browser stop` so the daemon reloads.
