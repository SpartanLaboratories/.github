---
name: feedback-no-ide-files
description: Never commit or prompt about .idea/ or other IDE metadata files — just ignore them.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 47e29a20-6542-4ea1-99b1-6549813bb466
  modified: 2026-09-07T03:59:34.284Z
---

Never commit `.idea/` (or other IDE-generated) files, and never stop to ask about them being
"dirty" in the working tree — treat them as noise to ignore, not a blocker.

**Why:** user said explicitly, after being asked how to handle an uncommitted
`.idea/workspace.xml` change ahead of a `/resolve-issue` run: "Never commit .idea folders or
other IDE files. Ignore them. Dont prompt me about this again."

**How to apply:** across all projects (not just one repo). Before a git-status "is the tree
clean" check (e.g. in the `resolve-issue` skill's step 1), gitignore `.idea/` and
`git rm --cached` any already-tracked IDE files so they stop showing as dirty, rather than
asking the user or treating them as a reason to pause. Do this silently as routine hygiene,
not as a change that needs confirmation.
