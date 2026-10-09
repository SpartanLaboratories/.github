---
name: resolve-issue-always-plans-per-issue
description: "/resolve-issue must always run planner for the specific issue, even when a broader parent plan document already covers it"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7fc48b44-60ce-4018-a58f-52f44851b31d
  modified: 2026-09-16T15:43:16.020Z
---

`/resolve-issue` (and equivalent manual issue-resolution workflows) must always spawn
`planner` for the specific issue when only a **broader/epic plan** already exists that covers
it as one item among several (e.g. a phase/epic plan like `docs/phase-1-map-and-space-plan.md`
that lists issues #46–#50). Treat that parent plan as *input context* handed to `planner`, not
a substitute for the per-issue plan — `planner` still produces its own plan document scoped to
the issue at hand.

**Refinement (2026-09-16):** this does NOT mean re-planning from scratch whenever *any* plan
exists. If an **issue-specific plan document already exists** for the exact issue (its own doc,
not a multi-issue epic plan) — e.g. `docs/issue-47-zones-plan.md` for issue #47 — don't have
`planner` redesign it from zero. Instead have `planner` *verify* the existing draft (re-check
its factual/codebase claims against current `master`, sanity-check its design decisions) and
report a verdict plus concrete additions/modifications, only falling back to a full replan if
the draft turns out unsound or badly stale.

**Why:** the user said this explicitly after `/resolve-issue 46` was about to run against an
issue already designed in depth by `docs/phase-1-map-and-space-plan.md` §2.2 — the existence of
that parent plan is not a reason to skip the per-issue planning step. Then during `/resolve-issue
47`, the user clarified that this rule targets broader/epic plans specifically — when an
issue-specific plan already exists, verify-and-report-deltas is the right weight, not a full
rewrite.

**How to apply:** distinguish "a parent plan mentions this issue" (full `planner` pass, plan as
input context) from "this issue already has its own plan doc" (verification pass, deltas only).
This has been baked into `~/.claude/skills/resolve-issue/SKILL.md` step 2.
