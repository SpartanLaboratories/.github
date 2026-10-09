---
name: github-issue-workflow
description: Check known-project repos for open issues at chat start; draft a resolution plan for any new issue
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b72fbb73-1795-411a-ace1-42865931cc55
  modified: 2026-09-03T23:50:33.654Z
---

For every Spartan Labs project — `github.com/SpartanLabsGaming/*` (MyGameTools, MyGameServer,
GameGraphics) and `github.com/SpartanLaboratories/*` (WebTools, GeneralTools); see
[[project-repos-and-orgs]]:

- **At the start of a new chat** in that project's working directory, check its repo for
  open issues.
- **Whenever issues have been added** to a project's repo, come up with a resolution plan
  for each one (do not start implementing unprompted — present the plan).

**Why:** The user asked for this on 2026-09-03 after filing issues #1–#3 on MyGameTools and
#1 on MyGameServer, and said "from now on" for both behaviours.

**How to apply:**
- `gh` is installed but **not on PATH**: call `C:\Program Files\GitHub CLI\gh.exe`.
  From PowerShell: `& "C:\Program Files\GitHub CLI\gh.exe" issue list --repo SpartanLabsGaming/<repo> --state open`.
- `gh issue view <n> --repo <org>/<repo> --json title,body,labels,comments`.
- Cross-reference "Downstream follow-up" sections — an issue in one repo often names a
  matching change needed in another.
- A SessionStart hook in `~/.claude/settings.json` surfaces open issues automatically when
  it fires; still verify with `gh` when acting on them.

This is the complement to the global `~/.claude/CLAUDE.md` "SpartanLaboratories libraries —
surface issues" rule (which is about *filing* new issues for defects found).
[[release-process]] [[project-guidance-in-aiassistant-rules]]
