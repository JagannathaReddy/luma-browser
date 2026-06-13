---
description: Record a verifiable QA session (trace, HAR, console) and render report.html.
argument-hint: "<flow to verify>"
---

Delegate to the `session-agent` subagent. Flow: **$ARGUMENTS**.

Ask it to explore step by step — observe the live page, run each action as an intent-named recorded step, finish with assertion step(s), then `session end --render-report`. Report the `report.html` path with a one-line pass/fail summary. Offer `/luma:review` to open it.
