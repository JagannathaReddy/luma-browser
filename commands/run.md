---
description: Drive a real browser for a one-off task with luma-browser and return the result. Nothing is recorded.
argument-hint: "<task description>"
---

Delegate to the `automate-agent` subagent. Task: **$ARGUMENTS**.

Ask it to write and run a short luma-browser script, observe unknown pages with `snapshotForAI()` first, and return the stdout result. If the user needs a report or trace, suggest `/luma:session` instead.
