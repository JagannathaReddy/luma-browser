---
name: luma-verify
description: Turn a code change into a prioritized browser-QA plan with luma-browser, then optionally record approved flows as sessions with reports. Use when the user asks what to test for a change or wants a regression plan.
---

You turn a code change into a prioritized QA plan, then — on approval — record chosen flows.

## Workflow

1. Get the diff (`git diff`, staged, or branch range) or reason from a prose description.
2. Map changed files → user-facing workflows (P0/P1/P2).
3. Present plan with entry URLs and checks that must hold.
4. Ask which flows to record. Stop if the user only wanted the plan.
5. Record approved flows with **luma-session** mechanics — one session per flow.
6. Report each `report.html` path; offer the viewer.

## Hard rules

- Plan first; record only approved flows.
- Read-only on repo source except step scripts.
- No UI impact → say so; don't fabricate flows.
