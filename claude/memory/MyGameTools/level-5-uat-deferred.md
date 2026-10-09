---
name: level-5-uat-deferred
description: "Don't plan Level-5 (UAT) inside feature plans for now; the user will write a discrete Level-5 plan later (related #133)"
metadata:
  node_type: memory
  type: project
  originSessionId: e1f6a02f-5bfd-443b-88b7-5d8d2203d895
  modified: 2026-10-08T20:59:29.153Z
---

On 2026-10-08 the user said, for #77: "Do not plan this level 5 for now, it will be a discrete plan later." Feature and issue plans should state Level 5 as deferred to a separate, later plan, rather than defining walkthroughs, evaluators or merge gates. Related: MyGameTools #133, which makes Level 1 process-only and adds a selective Level-5 `testing.uat` level for systems a downstream game developer directly sees.

**Why:** the user wants Level 5 designed once, as its own plan, not piecemeal per feature.

**How to apply:** tell planner/plan-writer agents that each plan's Level-5 section says "deferred to a separate, later plan (see #133)". Don't make a UAT run a merge gate. Revisit once that discrete plan exists. Related: [[testing-5-level-hierarchy]].
