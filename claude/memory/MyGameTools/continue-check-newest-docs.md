---
name: continue-check-newest-docs
description: "On \"continue\", find where the last session actually stopped — newest untracked/modified docs/ files may supersede the plan the working tree implements"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 842ff068-cf8d-4379-8724-8eac1b9dd6d7
  modified: 2026-09-30T21:45:10.540Z
---

When the user says "continue" on a feature branch, read the most recently modified docs/ files (especially untracked ones) before acting. The last session may have produced a later design that supersedes the plan the working-tree code implements.

**Why:** 2026-09-30, #77. I treated the working-tree `ZoneWorldSystem` implementation as the thing to finish, and ran gating and QA toward a PR. But `docs/world-system-binding-architecture.md` (newer) had superseded it and was waiting on the user's open decisions. Only QA caught it.

**How to apply:** compare mtimes of docs/ against source, grep new docs for "supersed", and resume from the newest artifact's pending step (often open decisions for the user). See [[planner-verification-deltas-need-approval]].
