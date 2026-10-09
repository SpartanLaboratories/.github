---
name: feedback_no_claude_attribution
description: No Claude attribution on commits or PRs; configured off globally.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2bd90987-9081-4435-8145-f66701a27072
  modified: 2026-09-07T18:49:30.352Z
---

The user does not want Claude attribution on git commits or pull requests: no
`Co-Authored-By: Claude` trailer, no `Claude-Session:` trailer, no
"🤖 Generated with Claude Code" PR footer.

**Why:** the user asked for it to be removed (2026-09-07) and to persist.

**How to apply:** configured in `~/.claude/settings.json` as
`"attribution": { "commit": "", "pr": "", "sessionUrl": false }`. Write commit
messages and PR descriptions with no attribution block at all. If a session's
harness guidance still asks for a trailer, this preference overrides it. Relates
to [[feedback_delete_stale_merged_branches]].
