---
name: manager-no-confirmation-needed
description: "User pre-authorized the manager agent (and /resolve-issue's branch/commit steps) to act without per-run confirmation"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 799202ae-485d-4bcd-8e93-6953e41a096a
  modified: 2026-09-12T22:15:15.294Z
---

Don't stop to ask for confirmation before letting the `manager` agent (or the `/resolve-issue`
skill's branching/commit steps that route through `manager`) create branches or commits.

**Why:** Told directly by the user ("manager is always allowed to do this from now on") right
after `/resolve-issue 48` paused at its step-1 confirmation gate. This extends
[[merge-always-allowed]] (merging green/mergeable PRs without asking) to the earlier
lifecycle stages: branch creation and commits are also pre-approved.

**How to apply:** When running `/resolve-issue` or otherwise delegating version control to
`manager`, skip the "confirm before proceeding" pause that precedes branch/commit creation —
proceed straight into planning/implementation. This does not cover the two things `manager`
itself still gates on: a Maven Central publish/release (only on explicit request) and filing
an issue against a downstream consumer (never done automatically). Those still need the user.
