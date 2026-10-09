---
name: planner-blast-radius-adoption
description: "planner must evaluate whether existing classes should adopt a new interface/system it introduces, not just check they aren't broken by it"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 799202ae-485d-4bcd-8e93-6953e41a096a
  modified: 2026-09-13T05:41:02.852Z
---

When `planner` designs a plan that introduces a new interface/abstraction/system meant to
replace or sit alongside an existing mechanism, it must not stop at confirming existing
call sites/classes aren't *broken* by the change — it must separately evaluate, for every
such class/file, whether it *should be refactored to adopt the new system*, and put that
answer in the plan (in scope now, or an explicit named follow-up with the file list).

**Why:** During issue #48 (spatial-index rework, introducing `SpatialIndex<E>` alongside the
existing `Quadtree`), `planner`'s blast-radius survey found `Actor.nearby`,
`DirectionalProjectile`, and `HomingProjectile` all still hard-coded to the concrete
`Quadtree` type, confirmed via grep that they weren't *broken* by the change, and reported
them as a non-blocking "unaffected" note. But the real gap — these three call sites get no
benefit from a `World` opting into `UniformGrid`, defeating part of the point of the new
system — wasn't surfaced as a planning gap until [[manager-no-confirmation-needed|the user
caught it after the fact]] and had it filed as a separate issue (#63) and fixed in a follow-up
PR. The user's direct correction: "planner failed to account for the projectile type tree
needing to adjust to the new spatialindex interface... from now on always consider how the
plan might affect each existing class/file and how each class/file might need to be
refactored in order to adjust to the new systems/content in the plan."

**How to apply:** This is now baked into `~/.claude/agents/planner.md` step 4 ("Survey the
blast radius") directly — the agent definition itself was edited, so this should already
apply on the agent's next invocation. This memory exists as the durable record of *why*, in
case the agent file is ever regenerated or the instruction is questioned. When reviewing or
commissioning a `planner` run for any change that adds a new interface/system, check that its
report addresses adoption by existing consumers of the old mechanism, not just non-breakage.
