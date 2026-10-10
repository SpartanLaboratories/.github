---
name: project-repos-and-orgs
description: Which GitHub org each Spartan Labs project lives in (game projects vs shared libs), plus repo moves/renames
metadata: 
  node_type: memory
  type: reference
  originSessionId: b72fbb73-1795-411a-ace1-42865931cc55
  modified: 2026-10-10T01:44:42.406Z
---

Two GitHub orgs, split by domain (mirrors the `com.spartanlabs.gaming.*` vs `com.spartanlabs.*`
package split in `.aiassistant/rules/CLAUDE.md` §6):

- **`github.com/SpartanLabsGaming`**: the game projects **MyGameTools**, **MyGameServer** and
  **MyGameClient**.
- **`github.com/SpartanLaboratories`**: the shared libraries **WebTools** and **GeneralTools**,
  plus `.github` (org guide and the `claude/` config mirror), `OrganizationPage` and unrelated
  bot repos.

**GameGraphics was renamed to MyGameClient** (`SpartanLabsGaming/GameGraphics` →
`SpartanLabsGaming/MyGameClient`, verified 2026-10-09; the old URL redirects). The local folder
is still `D:\Documents\Programming\GameGraphics`, and its auto-memory still lives under
`projects/D--Documents-Programming-GameGraphics/` (mirrored as `claude/memory/GameGraphics/`).
Its `origin` was repointed to `MyGameClient.git` on 2026-10-09. Older notes saying
"GameGraphics" mean this repo.

**MyGameTools moved** `SpartanLaboratories/MyGameTools` → `SpartanLabsGaming/MyGameTools` on
2026-09-03 (GitHub redirect in place). For its Maven coordinates see [[maven-central-namespace]].
The repo-wide URL sweep is done, except for `.github/ISSUE_TEMPLATE/config.yml` (two links,
which redirect) and historical release links in old `CHANGELOG.md` entries (left as history).

[[github-issue-workflow]] [[version-control-workflow]]
