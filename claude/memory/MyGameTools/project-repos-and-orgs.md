---
name: project-repos-and-orgs
description: Which GitHub org each Spartan Labs project lives in (game projects vs shared libs)
metadata: 
  node_type: memory
  type: reference
  originSessionId: b72fbb73-1795-411a-ace1-42865931cc55
  modified: 2026-09-03T23:50:18.523Z
---

Two GitHub orgs, split by domain (mirrors the `com.spartanlabs.gaming.*` vs `com.spartanlabs.*`
package split in `.aiassistant/rules/CLAUDE.md` §6):

- **`github.com/SpartanLabsGaming`** — the game projects: **MyGameTools**, **MyGameServer**,
  **GameGraphics**.
- **`github.com/SpartanLaboratories`** — the shared libraries **WebTools** and **GeneralTools**
  (plus unrelated bot repos).

**MyGameTools moved** `SpartanLaboratories/MyGameTools` → `SpartanLabsGaming/MyGameTools` on
2026-09-03 (GitHub redirect is in place; local `origin` updated). It is a **public** repo,
published to Maven Central as `io.github.spartanlaboratories:GameTools` (the Maven group
keeps the `spartanlaboratories` name — only the GitHub home changed).

`GameTools` depends on `io.github.spartanlaboratories:WebTools:2.0.0` and
`:GeneralTools:2.0.1` — a cross-org dependency now.

**Still pending** (do when resuming the version-control plan, as a PR): sweep
`SpartanLaboratories/MyGameTools` → `SpartanLabsGaming/MyGameTools` in `README.md`,
`CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `.github/**`, and `build.gradle.kts`
(pom `url`/`scm`, Dokka `remoteUrl`). The global `~/.claude/CLAUDE.md` "surface issues" rule
still lists the game repos under `SpartanLaboratories/*` — flag for the user to fix.

[[github-issue-workflow]] [[version-control-workflow]]
