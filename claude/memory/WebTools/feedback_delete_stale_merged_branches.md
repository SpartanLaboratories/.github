---
name: feedback_delete_stale_merged_branches
description: Delete every branch once it is merged and stale; standing instruction for the manager agent.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2bd90987-9081-4435-8145-f66701a27072
  modified: 2026-09-07T16:57:19.352Z
---

From now on, whenever a branch is merged and becomes stale, delete it (local and
remote). Standing instruction, applies to the `manager` agent and any manual
version-control work.

**Why:** the user does not want merged feature branches lingering.

**How to apply:** after a PR merges, delete the feature branch as part of the
same wrap-up — `git branch -d <branch>` and `git push origin --delete <branch>`
(or `gh pr merge --delete-branch`). Also sweep any already-merged stale branches
when you notice them. Matches the per-issue plan convention ("branch ... deleted
after merge"). Relates to [[feedback_downstream_adoption_not_a_closing_gate]].
