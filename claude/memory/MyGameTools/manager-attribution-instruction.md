---
name: manager-attribution-instruction
description: "When delegating commits/PRs to the manager agent, state the attribution rule explicitly — it otherwise copies the repo's old Co-Authored-By/Claude-Session/\"Generated with\" convention"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0f977f2c-e22c-4ebc-a513-31ed0edbcc1b
  modified: 2026-09-28T23:09:43.099Z
---

When handing a commit/PR job to the `manager` subagent, always state the session's attribution
rule in the prompt (e.g. "no attribution lines — no Co-Authored-By, Claude-Session, or
'Generated with Claude Code' in commits or PR bodies" when attribution is disabled).

**Why:** on 2026-09-28 the manager merged PR #130 (#76) with Co-Authored-By/Claude-Session
trailers on six commits and a "Generated with Claude Code" line in the PR body and merge commit,
because it followed the repo's older commit convention. Stripping them needed a user-approved
rewrite and force-push of master.

**How to apply:** include the rule in every manager prompt that commits, opens a PR, merges
(merge-commit messages copy the PR body), or comments on issues. Related: [[release-process]],
[[version-control-workflow]], [[manager-no-confirmation-needed]].
