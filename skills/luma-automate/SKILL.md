---
name: luma-automate
description: Drive a real browser for a one-off task with luma-browser — navigate, click, fill, scrape, screenshot — and return the result. Nothing is recorded. Use when the user asks to automate a browser task without needing a report. Trigger phrases — "go to X and get Y", "scrape this page", "check something on a site".
license: MIT
metadata:
  author: luma-browser
  version: 0.2.0
  category: workflow
  tags:
    - luma-browser
    - browser-automation
    - scraping
---

# luma-browser automate (one-off)

Run a script against a real browser and return the result — ephemeral, nothing recorded. Use **luma-scripting** for the API.

## When to use

- Quick one-shot: navigate, extract, fill, screenshot
- Scraping without trace/video/report
- For recorded evidence, use **luma-session** instead

## Workflow

1. `luma-browser install` if Chromium is missing.
2. Write a focused script; `console.log` the result.
3. Run: `luma-browser run ./script.js` or pipe via stdin.
4. If a selector missed, re-observe with `snapshotForAI()` and retry — named pages persist.
5. Report stdout. Optional: `luma-browser stop` to shut down the daemon.

## Hard rules

- Unknown page? Snapshot first, then act.
- One-off only — no session. For reports, hand off to **luma-session**.
