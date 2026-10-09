---
name: manager-ide-files-untrack
description: Manager must untrack already-committed IDE files and always gitignore IDE patterns
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ff5a2768-c13b-4622-91a7-00eb8b948684
  modified: 2026-09-08T23:38:42.418Z
---

Standing addition to the `manager` agent's directions (also written into
`~/.claude/agents/manager.md`): the existing "never commit IDE files" rail is
extended with two actions the manager DOES carry out and report:

1. If any IDE file/folder is already tracked (e.g. `.idea/` files committed in a
   repo), untrack it with `git rm --cached` in its own `chore: stop tracking IDE
   files` commit.
2. Always ensure every IDE file/folder pattern is covered by `.gitignore`, adding
   missing ones in that same commit; create `.gitignore` if absent.

**Why:** IDE files (`.idea/`, `.vscode/`, `*.iml`, etc.) don't belong in version
control; several are already committed in `SpartanLaboratories/GeneralTools`.

**How to apply:** When spawning `manager` for a run in a repo with tracked IDE
files, expect (and relay) an extra `chore:` commit that untracks them and updates
`.gitignore`. This is no longer "silent housekeeping" — it is reported.
