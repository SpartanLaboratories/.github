---
name: no-downstream-consumer-issues
description: Never file GitHub issues against downstream consumer repos; they track their own matching changes
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c6f27906-98bb-4d71-98ba-b746bed97ed3
  modified: 2026-09-05T23:42:23.886Z
---

When a change in an upstream repo (e.g. GameTools) requires a matching change in a downstream
consumer (e.g. MyGameServer, GameGraphics), do **not** file a "matching change needed" issue
against the consumer repo, and do not ask about doing so.

**Why:** Spartak's instruction on 2026-09-05, verbatim: *"Do not file downstream issues, the
downstream projects will handle that themselves. Don't ask me about this again."*

**How to apply:** Document the change in the upstream repo's CHANGELOG / release notes so it is
discoverable, and stop there. This narrows [[github-issue-workflow]] and the global
"surface issues" rule: those still apply for filing against the repo where the *defect or gap
lives* (including upstream dependencies like WebTools), just never against a repo that merely
*consumes* the project. Filing tracking issues within the project's own repo is still fine.