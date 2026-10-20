---
name: legacy-repos-referenced-not-cloned
description: "GKB2 and the other legacy bot repositories are read from GitHub via gh api, never cloned; the org .github repo is a mirror of ~/.claude that may be referenced for anything including the health files"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1db7fc88-7270-4d18-b608-e2895c322605
  modified: 2026-10-20T15:17:28.183Z
---

For the BotTools consolidation work (KotlinBottools#1), GKB2, GKB, BotTools, TrumpBot and
Support are referenced from GitHub (`gh api repos/<owner>/<repo>/contents/<path>?ref=<ref>`
or raw.githubusercontent.com), never cloned to `D:/Documents/Programming/`. The briefs write
such references as `github:<owner>/<repo>@<ref>`. `SpartanLaboratories/.github` is the public
mirror of `C:/Users/spart/.claude/`; it may be referenced for anything, including
`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` and `SECURITY.md`.

**Why:** The user said on 2026-10-20 that "gkb should only need referencing" and that the
`.github` repo "is just there for the copy of global agents and skills", then allowed
referencing "anything you need from the Organization's .github including the health files".
The legacy repositories also still hold token and data files by path; not cloning them keeps
those off this machine.

**How to apply:** Point researchers, verifiers and the architect at the `github:` notation
and forbid cloning in their briefs. Never print the contents of the legacy token or data
files, and never quote member names, guild names or ids from any legacy data file. Related:
[[research-repass-revise-in-place]].
