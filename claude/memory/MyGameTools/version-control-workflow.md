---
name: version-control-workflow
description: The Git/PR/release workflow to apply across ALL SpartanLaboratories repos
metadata: 
  node_type: memory
  type: project
  originSessionId: b72fbb73-1795-411a-ace1-42865931cc55
  modified: 2026-09-03T23:50:41.326Z
---

Adopted 2026-09-03, applies to **every** Spartan Labs repo — `SpartanLabsGaming/*`
(MyGameTools, MyGameServer, GameGraphics) and `SpartanLaboratories/*` (WebTools, GeneralTools);
see [[project-repos-and-orgs]]. Written up in each repo's `CONTRIBUTING.md`; this is the summary.

Fully rolled out on **MyGameTools** as of 2026-09-03 (PR #4): branch protection (PR required,
0 approvals, 4 required CI checks, no force-push), merge-commit-only merge button, label
taxonomy, `ci.yml` + `release.yml`, `CONTRIBUTING.md`/`CHANGELOG.md`/`LICENSE`/etc., `v1.9.0`
tagged + GitHub Release. Still pending there: ktlint/detekt + git hooks (Phase 2), then
issues #1–#3 (Phase 3), then the other repos (Phase 4).

**Trunk-based.** `master` is always releasable. No direct commits — branch protection blocks
them. Every change: branch → PR → CI green → merge.

**Branches:** `feature/<issue#>-<slug>`, `fix/<issue#>-<slug>`, `chore/<slug>`,
`docs/<slug>`, short-lived `release/<version>`, `hotfix/<version>` (off the release tag).
No `develop`, no environment branches.

**Semi-linear merge strategy:**
- Rebase your *own* feature branch onto latest `master` before merge (never rebase shared history).
- Feature branch merges UP to `master` via a **merge commit** (`--no-ff`).
- On GitHub: "Squash" and "Rebase" merge buttons are **disabled**; only "Create a merge
  commit" is allowed. Branch must be up to date before merge. Default merge commit
  message = PR title + body.
- `git lg` alias = `log --first-parent --oneline --graph`.

**Commits:** Conventional Commits (`feat`, `fix`, `perf`, `refactor`, `docs`, `test`,
`build`, `ci`, `chore`; `!`/`BREAKING CHANGE:` for breaks). PR title must itself be a valid
Conventional Commit (it becomes the merge commit subject). Keep the `Co-Authored-By` /
`Claude-Session` trailers.

**Version bump mapping** (nomenclature in `.aiassistant/rules/CLAUDE.md` §6,
`Major.Feature.MinorChange`+letter): `feat` → Feature bump (1.9.0→1.10.0); `fix`/`perf` →
MinorChange/letter; `!` → Major. Docs/chore/ci/test/build/refactor → no bump.

**Releases:** `release/x.y.z` branch bumps `coordinates(...)` version + updates
`CHANGELOG.md` (Keep a Changelog) → PR → merge → annotated tag `vX.Y.Z` on `master` →
GitHub Release → **`./gradlew publishAndReleaseToMavenCentral` run manually** (irreversible;
stays a deliberate human step). [[release-process]]

**Deployment stages** (dev/staging/production) = **GitHub Environments**, never branches.
Promote one immutable tagged artifact; only config differs per environment. User plans to
add a production environment for MyGameServer.

**CI:** GitHub Actions. Uses the per-level Gradle test tasks (`componentTest`,
`deterministicTest` — fast/no ports; `integrationTest`, `e2eTest`, `nonfunctionalTest` —
serialized by `GameServerPortsLock`, run on their own job). [[testing-5-level-hierarchy]]

**Pushing workflow files** needs the `workflow` token scope:
`gh auth refresh -h github.com -s workflow`.
