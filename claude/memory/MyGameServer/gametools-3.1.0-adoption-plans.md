---
name: gametools-3-1-0-adoption-plans
description: "Two written plans for adopting GameTools 3.1.0 features in MyGameServer: entity-id command addressing and SimulationLoop"
metadata: 
  node_type: memory
  type: project
  originSessionId: f4bc73ff-1424-46d8-9402-399505e4e452
  modified: 2026-09-07T16:58:28.129Z
---

After the GameTools `3.0.0 -> 3.1.0` bump (see [[gametools-dependency]]), two plan docs were
written to `MyGameServer/docs/` on 2026-09-05 (uncommitted, no implementation yet):

- **`docs/plan-snapshot-id-addressing.md`** — switch client commands (`SET_DEST`, `ATTACK`,
  `SET_SPEED`, `STOP`) from broadcast-list-position indices to stable `EntityId`s, using
  3.1.0's `DrawableSnapshot.id: Long` + `World.byId(EntityId)`. Downstream fix for
  MyGameTools#3. Folds in the MyGameTools#1 follow-up (call `Alive.cancelAttack()` before a
  new move/stop order). **Requires a matching GameGraphics PR released in lockstep** (wire
  semantics change, token counts don't). Recommended version bump: MyGameServer 1.0.0 -> 1.1.0.
- **`docs/plan-simulation-loop-adoption.md`** — replace the hand-rolled 60 Hz loop in
  `Main.kt` `main()` with GameTools `SimulationLoop(world, LoopSettings(tickRateHz = 60.0),
  onTick = { serverFrame(...) })`. Extract `reconcilePlayers` + `serverFrame` as
  internal testable fns (player reconciliation is inline + untested today). No wire change.
  Only hook is post-tick `onTick`; plan argues command latency is unchanged. Do this AFTER
  the id plan (both edit `Main.kt`).

User asked for both plans 2026-09-05, id plan first. Order to implement: plain 3.1.0 bump PR
-> id-addressing (MyGameServer + GameGraphics lockstep) -> SimulationLoop refactor.

**Progress (2026-09-05, session_018K1MuT8kamTRpC9umdFoFW):**
- Issues opened: MyGameServer#6 (id addressing), MyGameServer#7 (SimulationLoop),
  GameGraphics#1 (client id addressing), MyGameTools#31 (typed ClientCommand protocol).

**INTERIM SHIPPED (2026-09-07, session_01HnikbxqhyJfaCnZHJXX2z3):**
- **Wire direction: ids-on-the-wire (option A) chosen.** MyGameServer#8 squash-merged to
  `master` (commit ee579e1), deployed. Server resolved `SET_DEST`/`ATTACK`/`STOP` operands via
  `world.byId(EntityId)`, STATE entries carry `id` (bare long). `SET_SPEED` **deleted**.
  GameTools bumped `3.0.0 -> 5.0.0` (see [[gametools-dependency]]).

**MyGameServer#6 CLOSED (2026-09-07, session_01XaHxPbiTFBvp88anB5AeFo):**
- **`ClientCommand` protocol adopted.** MyGameServer#10 squash-merged to `master` (commit
  1ec4427), version `1.0.0 -> 2.0.0`. `Main.kt` now: shared `ClientCommandCodec()`,
  `commandCodec` + `onCommand` passed to `GameServer`; new `handleCommand()` authorizes
  (`resolveOwnedAlive` / `authorizeAttack`, both now take `EntityId`) then calls
  `ClientCommand.applyTo(world)`. Text-verb parser deleted; `handleClientMessage` ->
  `handlePlainMessage` (PING only). `Stop` is now ownership+Alive-restricted (was: any Actor).
  `MoveTo`/`Stop` keep an explicit `cancelAttack()` (local policy until MyGameTools#39).
  Tests: new `ClientCommandDispatchTest`, `SetDestCommandTest` -> `MoveCommandTest`,
  `AttackCommandTest` retargeted at `authorizeAttack`. 34 green.
- **Merged server-first per open decision 4** (user's call): degrades to no-op only. `master`
  has no working client until GameGraphics#1 lands — that is the release gate.
- **MyGameTools#39 filed:** `applyTo` should call off a pending attack on a movement command.
- **GameGraphics still NOT migrated + has a CONFLICTING WIP.** Branch
  `feature/selection-inspector-and-buttons` (namespace move, 1.8.0 -> 3.1.0, new
  `EntityLookup.kt`) keeps the **wire as list indices** (`indexOfEntityId` at send time) —
  incompatible with what shipped. GameGraphics needs its client redone against
  ids-on-the-wire, ideally straight onto the 5.0.0 `ClientCommandCodec` (`COMMAND <json>`).
  Until it ships, prod commands from the current client degrade to no-op (never wrong-target).
