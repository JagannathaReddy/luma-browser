---
description: Turn a code change into a prioritized browser-QA plan, then optionally record the flows.
argument-hint: "[ref range | description — blank = working-tree diff]"
---

Delegate to the `verify-agent` subagent. Scope: **$ARGUMENTS**.

If blank, verify the working-tree diff. If a ref/range, diff that. Present a prioritized QA plan (P0/P1/P2), then ask which flows to record. For approved flows, record sessions and report each `report.html`. Offer `/luma:review`. Already know the flow? Use `/luma:session`. Quick one-off? Use `/luma:run`.
