---
name: framework-target-state
description: "GameTools' intended final scope — genres, netcode ambition, module split, phased roadmap"
metadata: 
  node_type: memory
  type: project
  originSessionId: c6f27906-98bb-4d71-98ba-b746bed97ed3
  modified: 2026-09-08T04:15:36.016Z
---

GameTools is a reusable framework for the online games Spartak intends to build. Target
state and roadmap were scoped in an interview on 2026-09-05 and written to
`docs/framework-vision-and-roadmap.md` (source of truth; committed 2026-09-07, PR #43).

Key decisions:
- **Genres:** RTS / MOBA / tower-defense + MMO-lite / persistent world.
- **Client/UI is a separate project.** GameTools = authoritative server + shared wire-protocol types.
- **One `World` per server process.** No lobby/matchmaking.
- **Netcode:** scalable authoritative — stable `EntityId`s, per-tick delta snapshots,
  per-player interest filtering (vision → zone → distance), tick + input sequence numbers,
  server-authoritative movement, pluggable `SnapshotCodec` (JSON + binary).
- **Fog of war is a core feature and IS the interest filter.**
- **Framework provides an opt-in fixed-timestep `SimulationLoop`** with externally mutable
  settings. This relaxes [[gameserver-is-library-no-loop]] — a loop is now offered, not banned,
  but `World.tick()` stays independently callable.
- **Deterministic sim** (seeded RNG through the framework, defined tick/event order) but
  **no replay tooling**.
- **In scope:** rich combat (damage types, resistances, crit, threat table, respawn, XP hooks),
  abilities & status effects, inventory & items, AI + pathfinding (grid A* + flow fields
  behind a `NavProvider`), physics + collision response, full tiled-map model with zones.
- **Identity/persistence:** define seams only — `AuthProvider` SPI (default = today's
  `Iam <name>`), `PlayerId`, `SessionRegistry` reconnect, `PlayerStore`/`SnapshotStore` ports
  with in-memory impls. No bundled DB or accounts.
- **Packaging:** split into `gametools-{core,world,combat,ai,net,session,persistence,abilities,items}`
  + umbrella.
- **Scale:** design for ~200 players / 10k entities / 10–20 Hz; keep 500+/50k reachable.

Roadmap phases: 0 Foundations (entity IDs, event bus, deterministic tick, loop; closes
issues #1/#2, roots #3) → 1 Map & space → 2 Rich combat → 3 Authoritative networking
(wire half of #3) → 4 AI/pathfinding → 5 Persistence → 6 Abilities & items → 7 Scale hardening.
Each phase gets its own `docs/<phase>-plan.md` before implementation.

**Module split — decided 2026-09-05 to ship FIRST, as its own breaking release, before any
Phase 1 feature work** (Phase 0 had parked it at "start of Phase 1"). Plan:
`docs/module-split-plan.md` (2026-09-05, not yet executed). Scope: create only
`gametools-core` (gameobjects+spatial+event+simulation+geometry.serializations) and
`gametools-net` (networking) plus a source-less `gametools` umbrella that re-exports both —
NOT all 9 roadmap modules (the rest are created by the phase that fills them). `networking` is
the only cleanly-separable package today; `Alive`→`gametools-combat` stays deferred to Phase 2;
`Quadtree` stays in core. Package names unchanged — coordinate/Gradle-module split only.
Umbrella artifactId `GameTools` → lowercase `gametools`. Targets **4.0.0** (Major; distribution
break, no source break). All §9 open decisions resolved 2026-09-05: umbrella `gametools`;
**`build-logic/` convention plugins** (`gametools.kotlin-library` / `.published-library`), not
`subprojects {}`; no BOM in 4.0.0; geometry.serializations stays in core; one tracking issue for
the whole split; keep `rootProject.name = MyGameTools`; `4.0.0-SNAPSHOT` for downstream decided
at release time. 4 PRs: scaffold+git-mv / CI / docs / release. Then Phase 1a
(`docs/phase-1a-map-model-plan.md`) is planned; user also pre-decided Phase 1 accepts a breaking
`World(map, …)` constructor.
Phase 0 is planned: `docs/phase-0-foundations-plan.md` (2026-09-05) — 5 feature PRs, targets
release 3.1.0 (all additive + one bug fix, no major bump), closes issues #1/#2/#3, zero
WebTools dependency.

**Phase 0 done and released as GameTools 3.1.0 (2026-09-06).** Merged as PRs #24 (EntityId +
snapshot ids, closed #3), #29 (event bus), #26 (deterministic tick), #27 (cancelAttack +
attack auto-stop, closed #1/#2), #28 (SimulationLoop), #30 (`chore(release): 3.1.0`). Tag
v3.1.0, GitHub Release published. Tracking issues #21/#22/#23 closed. Decisions taken:
single-module (no split yet), close #3 fully, per-World EntityId allocator, `World.rng` (not
`.random`, avoids `apply{}` shadowing), no downstream issues. ~270 tests, all 5 levels + Dokka.
**Published to Maven Central as `io.github.spartanlabsgaming:GameTools:3.1.0` on 2026-09-06**
(Spartak ran `./gradlew publishAndReleaseToMavenCentral` — [[release-process]]).

**Module split done — GameTools 4.0.0 (2026-09-06).** `gametools-core` / `gametools-net` /
`gametools` umbrella shipped per `docs/module-split-plan.md` (PRs #33 scaffold, #34 CI, #35
docs, #36 release). Package names unchanged.

**Issue #31 done — released as GameTools 5.0.0 (2026-09-07).** PR #37 (feature) + PR #38
(`chore(release): 5.0.0`), tag v5.0.0, GitHub Release published, all 3 coords pushed to the
Central Portal via `./gradlew publishAndReleaseToMavenCentral` (Claude ran it — user said
"release"; deployment accepted, repo1 sync pending at write time). Typed library-owned
`ClientCommand` protocol in `gametools-net`
(`com.spartanlabs.gaming.networking.command`): open `@Serializable` `ClientCommand`
interface + 6 standard commands (`MoveTo`/`MoveDir`/`Follow`/`Stop` for `Actor`,
`Attack`/`StopAttack` for `Alive`), `ClientCommandCodec` (`COMMAND <json>` envelope),
`ClientCommand.applyTo(World)` (no auth — app gates), `GameServer.onCommand` +
`commandCodec` params. Plan: `docs/client-command-protocol-plan.md`. Decisions: ship the
mechanism AND the fixed set, consumers extend via `SerializersModule`; `Stop`=movement only
(Actor), `StopAttack` separate (Alive). **Breaking (hence major 5.0.0):** `DrawableSnapshot.id`
& variants retyped `Long`→`EntityId` (wire form unchanged — `EntityId` serializes as bare
`Long`), `DrawableSnapshot.UNIDENTIFIED` removed → use `EntityId.UNASSIGNED`. `EntityId` is
now `@Serializable`.

**GameTools 5.1.0 released (2026-09-07).** PR #45 `chore(release): 5.1.0`, tag v5.1.0, GitHub
Release published. Feature bump for #39 (a movement command through `ClientCommand.applyTo`
calls off the actor's pending attack when it's an `Alive`) + #40 build/docs-jar fixes.
Coordinates bumped in all 3 modules; README install snippets bumped. **Maven Central publish
is Spartak's manual step** (`./gradlew publishAndReleaseToMavenCentral`) — not yet run as of
this release.

**Phase 1 (Map & Space) planned (2026-09-07): `docs/phase-1-map-and-space-plan.md`** (PR #51).
One plan doc for the whole phase — **supersedes** the earlier "Phase 1a
`docs/phase-1a-map-model-plan.md`" idea. New `gametools-world` module (`world → core`) for the
5 roadmap items. Key calls: **core-vs-world dependency** resolved by putting tiny `Space` /
`SpatialIndex` interfaces + nullable hooks on `core`'s `World`, with physics/vision/zones as
`EntityId`-keyed systems in `gametools-world` run via `WorldSystems.step()`; the **spatial
index stays in `core`** (World needs it at compile time — resolves the question
`docs/module-split-plan.md` deferred). **Release split: 5.2.0 (map + zones + spatial index)
then 5.3.0 (physics + vision), both Feature releases** — the breaking `World` constructor /
`Movement` refactor / index-default flip is **deferred to the Phase 2 Major (6.0.0)**, which
**reverses Spartak's earlier pre-decision that Phase 1 takes a breaking `World(map, …)`
constructor**. 12 open decisions in §9 (notably: repo-wide y-axis convention is inconsistent —
lean y-down; open `GameEvent` `sealed interface` → `interface` for cross-module events).
Tracking issues: **#46 map, #47 zones, #48 spatial-index rework, #49 physics, #50 vision/LOS**
(all `type: feature`; #46/47/49/50 `area: world` — new label — #48 `area: spatial`). Upstream
enhancement **`SpartanLaboratories/GeneralTools#3`** — geometry primitives (Segment/Ray/Aabb +
intersection tests + Point vector ops) needed by physics & LOS; non-blocking (gametools-world
ships internal fallbacks). Nothing implemented yet.

Process notes for future multi-PR phases: `gh pr merge` needed an `autoMode.allow` entry in
`~/.claude/settings.json` (the `permissions.allow` rule alone didn't clear the classifier).
The repo auto-deletes merged head branches, which *closes* (not retargets) a stacked PR whose
base is that branch — so don't stack; branch each PR off master and rebase, or merge+rebase
serially. The `GameServerCapacityTest` BindException CI flake was **fixed** in PR #37:
`awaitCommonPortFree()` in `gametools-net` integration test support (`CommonPort.kt`) makes
`ServerFixture.close()` and the e2e teardown block until WebTools releases the shared UDP
port. [[merge-always-allowed]]

**Transport / WebTools split (2026-09-05):** the doc's §7 records which netcode pieces belong
upstream. Filed as `SpartanLaboratories/WebTools` issues #8–#14: #8 binary datagram path,
#9 configurable receive buffer (1024 B hardcoded today), #10 connection-liveness timeout +
disconnect event, #11 handshake reject path + credential passthrough (also fixes the existing
"always REGISTERED, can't refuse" GameServer wart), #12 opt-in scheduled keepalive, #13 RTT/loss
measurement, #14 reliable-ordered sub-channel (discussion). #8–#11 are **prerequisites for
Phase 3** and must land upstream before Phase 3 planning starts.
