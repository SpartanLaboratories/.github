---
name: ui-increment-backlog
description: "Pending client-side UI plans for GameGraphics; the command protocol is now settled on GameTools 5.0.0's ClientCommand API"
metadata: 
  node_type: memory
  type: project
  originSessionId: ee9aea06-20be-443b-a035-dc2b940db080
  modified: 2026-09-07T17:56:59.179Z
---

**Command protocol is settled** (2026-09-07). GameTools issue #31 resolved as the
`ClientCommand` / `ClientCommandCodec` API shipped in **gametools 5.0.0**. GameGraphics
now sends `COMMAND <json>` datagrams (`networking/ClientCommands.kt` → `MoveTo` / `Follow` /
`Stop` / `Attack`, ids on the wire), in lockstep with **MyGameServer#6** (server → v2.0.0). The old
`SET_DEST`/`SET_SPEED`/`STOP`/`ATTACK` text verbs and the id→index translation
(`indexOfEntityId`) are **removed**. `PING`/`PONG` stays a raw token. GameGraphics issue #1
is effectively done pending merge/release. See [[gametools-geometry-and-root-package]].

**ClickState landed** (2026-09-07, same WIP branch). `Viewport` has a `ClickState`
(`DEFAULT` / `MOVE` / `ATTACK`), armed one-shot by `M` / `A` keys (`Viewport.onKeyAction`,
raw GLFW codes 77/65 in its companion), reset after the order or a right-click cancel.
`DEFAULT` = old behaviour. `MOVE` left-click → `Follow` if on an actor else `MoveTo`.
`ATTACK` left-click → attack target under cursor, else `EntityLookup.nearestEnemy` (closest
`AliveSnapshot` with `ownerName != playerName`, by world distance) → `Attack`. New `GameView`
methods `follow(follower,target)` + `attackNearestEnemy(attacker): Boolean`; `NetworkClient.follow`;
`ClientCommands.follow`. `S` is a keyless action (not a click state) → `game.stop(selection)`
→ `Stop` command, leaves `clickState` untouched. `MoveDir`/`StopAttack` still unemitted; the
Q/W inspector buttons remain beep placeholders (not wired to click states).

Plan docs under `docs/plans/`:
- `phase-1-select-by-entity-id.md` — **superseded** by the 5.0.0 adoption (header note added).
  Selection-by-id + `EntityLookup.byEntityId`/`attackTarget` survive; the wire-translation half is gone.
- `in-world-selection-highlight.md` — **planned**, not yet implemented. Thin outline around
  the selected unit in the world view. (`SelectionOutline.kt` already exists in the WIP tree.)
- `camera-follow-selection.md` — **planned**, not yet implemented. `F` toggles a camera that
  eases onto / tracks the selected unit; suppresses edge-pan while active.

Both unimplemented plans add `Window.onSelection(() -> Long?)` wired in `Main` from
`viewport::selectedEntityId` — already present in the WIP tree (used by the selection outline).

Open working-tree state: the `feature/selection-inspector-and-buttons` branch carries a large
uncommitted pile (5.0.0 bump, shared-channel NetworkClient, EntityLookup, SelectionOutline,
the generaltools.Color migration, the ClientCommand adoption). Needs sorting into commits.

Next: user's call on which of the two remaining plans to implement (or reprioritize).
