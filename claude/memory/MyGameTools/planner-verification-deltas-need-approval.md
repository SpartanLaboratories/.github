---
name: planner-verification-deltas-need-approval
description: "When planner verifies an existing issue-specific plan and recommends deltas, surface them to the user before applying — don't auto-apply"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1d7eb4a9-1adf-45ed-9981-711cea6e422b
  modified: 2026-09-16T15:51:25.283Z
---

When `planner` verifies an existing issue-specific plan document (see [[resolve-issue-always-plans-per-issue]])
and comes back with recommended additions/modifications, relay them to the user and wait for a
decision before having anything applied to the plan document. Do not have `planner` apply its
own recommended deltas on the strength of its own judgment alone.

**Why:** during `/resolve-issue 47`, the assistant had `planner` verify the existing
`docs/issue-47-zones-plan.md` draft, then immediately had `planner` apply all three of its
recommended deltas to the doc without asking first. One delta (switching `ZoneGrid.zoneAt` from
`Result<Zone>` to nullable `Zone?`) turned out to be something the user wanted reverted — they
preferred keeping the `Result`-style return since it's the project-wide convention. That required
a second round-trip to undo. The user then said explicitly: "from now on when reviewing an
existing issue plan prompt me before making changes."

**How to apply:** after a `planner` verification pass returns deltas, stop and present them to
the user (a short list is fine — verdict + bullet deltas). Only resume `planner` to apply an edit
once the user has said which deltas to accept, reject, or adjust. This is now baked into
`~/.claude/skills/resolve-issue/SKILL.md` step 2. Does not apply to a full from-scratch `planner`
plan (step 2's other branch, for broader/epic-plan cases) — that already goes through the normal
"Open decisions" gate.
