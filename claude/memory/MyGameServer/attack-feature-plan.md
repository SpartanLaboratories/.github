---
name: attack-feature-plan
description: Design decision + plan for client-driven Alive attacks (right-click to attack) across GameGraphics + MyGameServer
metadata: 
  node_type: memory
  type: project
  originSessionId: 43afdf75-db1d-4246-b9cc-031c96d1c691
  modified: 2026-09-06T03:23:59.929Z
---

Feature: let a GameGraphics player use an owned Alive to attack another Alive — left-click
selects (exists), right-click on an enemy Alive attacks.

**Status: server side implemented + committed (2026-09-03); client side implemented,
uncommitted.** Server (MyGameServer, committed): `issuePlayerAttack` helper + `"ATTACK"`
branch in `handleClientMessage` (commit ca88327), `AttackCommandTest` (7 tests); landed
alongside the GameTools 1.6.0->1.8.0 bump (a73fa44) and the Visibility.kt removal (0c4d32a).
Client (GameGraphics, NOT yet committed): `NetworkClient.attack`, `GameView.attack`,
`Main.gameView().attack`, `Viewport.commandSelectedActor`, `ViewportTest` (+3). Both repos
`./gradlew test` green. Attack sound reuses the move beep (`ATTACK_COMMAND_SOUND` alias).

**Decision (2026-09-03): Option B — client decides intent.** The client picks the target
under the right-click and sends an explicit `ATTACK <attackerIndex> <targetIndex>` command
(indices into the STATE broadcast list, same space as `SET_DEST`); if the pixel isn't over
an attackable Alive it falls back to the existing move path. Server re-validates ownership
before `attacker.issueAttack(target)`, mirroring the `SET_DEST` authorization check.

**Why:** matches the established movement architecture (Viewport decides intent → GameView
translates → NetworkClient sends → server authorizes), keeps the wire protocol minimal,
gives responsive local feedback. Server-side hit-testing of a raw click point was rejected
because the server has no knowledge of the client camera/zoom/window that `Picking` needs.

**How to apply:** client — add `NetworkClient.attack`, `GameView.attack(attackerIndex, xPx,
yPx): Boolean`, implement it in `Main.gameView()` (pick → classify as unowned AliveSnapshot
→ send), branch in `Viewport.onMouseAction` RIGHT_BUTTON. Server — add an `"ATTACK"` branch
in `handleClientMessage` in `Main.kt`.

**Known limitations (Path 2 ship) — filed as issues, ALL NOW CLOSED by GameTools 3.1.0
(2026-09-06 release):**
- MyGameTools#1 — `Alive.cancelAttack()` + `onAttackCancelled`/`onAttackEnded` hooks now
  exist. **MyGameServer downstream follow-up not yet done:** wire `SET_DEST`/`STOP` to call
  `cancelAttack()` first (folded into the snapshot-id plan below).
- MyGameTools#2 — `Alive.considerAttack()` now ends the attack itself on TARGET_DIED /
  TARGET_REMOVED. No MyGameServer work needed.
- MyGameTools#3 — every `DrawableSnapshot` now carries `id: Long`; `World.byId(EntityId)`
  resolves it. **MyGameServer + GameGraphics downstream adoption not yet done.**
- MyGameServer#1 — **fixed 2026-09-04** (PR #4, commit be0a8a5): client commands are now
  queued off GameServer's listener threads via `pendingCommands`/`drainPendingCommands` in
  Main.kt and drained on the loop thread before `world.tick()`.

**Adoption plans written 2026-09-05** (`docs/` in MyGameServer, uncommitted): see
[[gametools-3.1.0-adoption-plans]].

See [[gametools-dependency]].
