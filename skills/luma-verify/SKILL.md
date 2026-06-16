---
name: luma-verify
description: Turn a code change into a prioritized browser-QA plan with luma-browser — read the git diff, infer affected user-facing workflows, suggest flows and checks, then optionally record them as a session. Use when the user asks what to test for a change or wants a regression plan. Trigger phrases — "what should I test", "QA my diff", "verify this PR", "regression plan".
license: MIT
metadata:
  author: luma-browser
  version: 0.2.2
  category: workflow
  tags:
    - luma-browser
    - qa
    - regression
    - planning
---

# luma-browser verify (change → QA plan)

Read a code change, infer **user-facing workflows** at risk, and suggest a **prioritized QA plan**. Optionally hand off to **luma-session** to record flows and produce `report.html`.

## When to use

- User changed code and asks what to test
- QA-ing a diff, branch, or PR before merge
- Building a focused regression plan (not a full re-test)

## Workflow

1. **Get the diff** — `git diff`, `git diff --staged`, or `git diff main...HEAD`.
2. **Infer workflows** — group by user-facing flow, not file. Heuristics in [`references/REFERENCE.md`](references/REFERENCE.md).
3. **Suggest plan** — P0/P1/P2 flows with entry URL, checks that must hold, and at-risk files.
4. **Confirm, then record** — only record flows the user approves via **luma-session**.

## Hard rules

- Suggest first, record second.
- Read-only on the repo — never stage or commit.
- No UI impact? Say so — don't fabricate flows.
