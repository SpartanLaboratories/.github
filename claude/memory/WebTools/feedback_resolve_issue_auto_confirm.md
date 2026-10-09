---
name: feedback_resolve_issue_auto_confirm
description: "/resolve-issue — skip the \"shall I proceed\" confirmation gate; always proceed."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e05a3851-e795-40ac-b0ff-5889f1b10059
  modified: 2026-09-07T20:41:19.325Z
---

For the `/resolve-issue` skill, do not ask the user to confirm the chosen issue before proceeding. Treat the answer as always yes: pick the issue per the skill's rules, state what you intend to do, and go straight into the pipeline.

**Why:** User said "do not ask for this again, always yes from now on" (2026-09-07) after the standard confirm-before-proceeding gate.

**How to apply:** Still tell the user the issue number, title, and one-line plan. Still stop at the skill's real decision points (planner open decisions, rookie-dev blockers, manager's "Stopped — needs you"). Just don't wait for approval to start. Maven publish still requires explicit ask. See [[feedback_dont_raise_downstream_effects]].
