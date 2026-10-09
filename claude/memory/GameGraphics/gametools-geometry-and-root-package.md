---
name: gametools-geometry-and-root-package
description: Where GameTools geometry / MouseAction / snapshot types live; STATE wire format (polymorphic DrawableSnapshot as of 1.6.0; CombinedStatSnapshot health 1.7.0; ModularStat-backed speed + 4 new AliveSnapshot combat fields 1.8.0; 2.0.0 = new namespace io.github.spartanlabsgaming + WebTools handshake API change; 3.0.0 = WebTools 2.0.0c drops dedicated port pairs for a shared-socket REGISTERED/KA protocol; 3.1.0 = every DrawableSnapshot gains a leading `id: Long` ctor param; 5.0.0 = artifact split into gametools/gametools-core/gametools-net (lowercase), `id` becomes an `EntityId` value class serialized as bare Long, `DrawableSnapshot.UNIDENTIFIED` removed for `EntityId.UNASSIGNED`, new `networking/command` ClientCommand protocol)
metadata:
  node_type: memory
  type: reference
  originSessionId: f5d5fbb4-7a96-4091-bdeb-1f772376173c
  modified: 2026-09-07T17:57:03.014Z
---

Non-obvious facts about the GameTools deps (project is on **gametools 5.0.0**, groupId
`io.github.spartanlabsgaming` as of 2.0.0 — was `io.github.spartanlaboratories` through 1.8.0;
artifactId lowercased `GameTools` → `gametools` at 5.0.0; see [[namespace-migration-spartanlabsgaming]].
Transitive: WebTools 2.0.0c, GeneralTools 2.0.1 — unchanged 3.1.0 → 5.0.0):

1. **`com.spartanlabs.geometry.{Point, Dimensions, Square, TwoDoubles}` are NOT in the
   `GameTools` jar.** They come from `GeneralTools` (`GameTools -> GeneralTools`, pinned to
   `2.0.1`, which also excludes the copy WebTools would drag in). If a geometry type stops
   resolving, check `GeneralTools` is still on the classpath.

2. **`MouseAction` / `MouseActionType` are in `com.spartanlabs.gaming.networking`** (they
   were in the root/no-package source file in 1.1.0 and earlier — the 1.1.0→1.2.0 upgrade
   moved them). Import them explicitly.

3. **`VisibleObjectSnapshot` (1.3.0) constructor order:** `gameObject`, `dimensions`,
   `color: ColorSnapshot(r,g,b,a)`, `texture: String`, `angle: Int`, `turns: Boolean`,
   `subObjects: List<VisibleObjectSnapshot>`. `turns` was added in 1.3.0 (between `angle` and
   `subObjects`) — false means `angle` is not meaningful, the renderer draws the object
   upright. `Window.drawActor` and `Picking.contains` apply `angle` only when `turns`.
   `subObjects` locations are absolute world coords. `DimensionsSnapshot` fields are
   `width`/`height` (were `x`/`y` in 1.1.0); `TwoDoublesSnapshot` is `first`/`second`;
   `PointSnapshot` stayed `x`/`y`. `VisibleObject.color` default is opaque **white** since 1.3.0
   (was black).

4. The GameServer command protocol (`SET_DEST`/`STATE`/`PONG`/handshake) our `ProtocolParsing`
   speaks is application-level, not library — unchanged by the GameTools version. 1.2.0's
   library only newly recognises `INPUT <MouseAction json>` server-side.

5. **GameTools 1.6.0 changed the `STATE` payload** from a bare `List<VisibleObjectSnapshot>`
   to a **polymorphic `List<DrawableSnapshot>`** (`@Serializable sealed interface` in
   `com.spartanlabs.gaming.gameobjects`, class discriminator `"type"`): `VisibleObjectSnapshot`
   (`"visibleObject"`), `ActorSnapshot` (`"actor"`: wraps a `VisibleObjectSnapshot` + `speed`,
   `destination: PointSnapshot`), `AliveSnapshot` (`"alive"`: wraps an `ActorSnapshot` + `health:
   StatGroupSnapshot`, `faction`, `ownerName: String?`, `damage`). `VisibleObjectSnapshot.subObjects`
   is now `List<DrawableSnapshot>` too. The server picks the most specific kind per object.
   Client handles this in `networking/DrawableSnapshots.kt` — `internal fun DrawableSnapshot.drawableCore()`
   recursively unwraps any kind to its plain `VisibleObjectSnapshot`; `NetworkClient` maps every
   decoded entry through it so the rest of the client (Window/Picking/Portrait/Main) is unchanged.
   Also new in 1.6.0: `Alive` is `open`, has `DeathResponse` enum + `die()`/`onDeath()`; `World.add()`
   / `World.removeList`. All server-side, unused by this client.

6. **GameTools 1.7.0 replaced the stat classes.** `StatGroup`/`StatGroupSnapshot` are gone;
   `Alive.health` is now a `CombinedStat` and `AliveSnapshot.health` a **`CombinedStatSnapshot`**
   (also in `com.spartanlabs.gaming.gameobjects`). The snapshot keeps the same two fields the
   client reads — `value: Double`, `maxValue: Double` — but drops `cap`, so its ctor is
   `CombinedStatSnapshot(value, maxValue)` (2 args, was 3). New `ModularStat` (base value +
   `StatMod`s) backs `Alive.damage`/`attackTime`/`attackSpeed`/`attackRange`/`evasion`, but
   `AliveSnapshot.damage` stays a plain `Double`. Also removed in 1.7.0: `Alive.visionRange` /
   `Alive.canSee()` / `DEFAULT_VISION_RANGE`; added: `GameObject.distanceFrom(other)` and a full
   server-side attack loop (`issueAttack`/`onAttack`/`onHit*`/`onDamag*` hooks). Client touch
   points were just the `StatGroupSnapshot`→`CombinedStatSnapshot` rename in `Main.kt`
   (`selectedHealth`, `bottomInfoPanel`) and `DrawableSnapshotsTest.kt`.

7. **GameTools 1.8.0**: `Actor.speed` is now a `ModularStat` (was a computed `Double` from
   `baseSpeed * speedModifier`, both of which are gone). `ActorSnapshot.speed` stays `Double`
   (`actor.speed.value`). `AliveSnapshot` gained **four new required `Double` ctor params** after
   `damage`: `attackTime`, `attackSpeed`, `attackRange`, `evasion` (each an `Alive` `ModularStat`'s
   `.value`). Only client touch point was the `AliveSnapshot(...)` builder in
   `DrawableSnapshotsTest.kt` (added the 4 args). No dependency changes. Client reads none of the
   new fields.

8. **GameTools 2.0.0**: new groupId `io.github.spartanlabsgaming` (also still published under the
   old one). The gameobjects/snapshot types the client uses are **unchanged**; the breaking change
   is all in WebTools `2.0.0b`'s handshake:
   - `MultiConnectionUDPServer.COMMON_SEND_PORT` **removed** — the server replies to the handshake
     datagram's UDP source, not a fixed port. Client now uses an ephemeral `DatagramSocket()`.
   - handshake line `Iam <name> <address>` → `Iam <name>` (trailing address ignored by the server).
   - `TXRXON` reply lost its `<address>` prefix → `TXRXON <sendPort> <receivePort>` (verb at token 0).
   Client touch points: `NetworkClient.handshake()`, `ProtocolParsing.buildHandshakeMessage`/
   `parseTxrxonReply` (+ `ProtocolParsingTest`), `build.gradle.kts`, README. `resolveLocalAddress`
   no longer imported. Also in WebTools 2.0.0b but unused here: `UDPConnection`→`Connection` rename,
   `HandshakeCoordinator`/`HandshakeProtocol`/`Registrations`. Also in GameTools 2.0.0 but unused
   here: `Buff`/`Capability`/`Moddable` on server gameobjects, `GameObjectSnapshot.buffs`
   (defaulted list, backward-compatible), `CombinedStat`/`ModularStat` now implement `Moddable`
   with `Unit`-returning `applyMod`/`removeMod`.

9. **GameTools 3.0.0**: gameobjects/snapshot types unchanged again; the breaking change is all in
   WebTools `2.0.0c`'s handshake, which drops per-connection dedicated port pairs entirely:
   - Handshake reply is now the bare token `REGISTERED` (was `TXRXON <sendPort> <receivePort>`).
     No ports to parse — the client just validates the token.
   - **No more dedicated channel.** Every datagram after the handshake (STATE broadcasts, PONG,
     outgoing commands) is multiplexed over the *same* socket/port the client handshook on
     (`MultiConnectionUDPServer.COMMON_LISTEN_PORT`), addressed to the client's observed
     post-NAT source. One socket for the whole connection lifetime, not two.
   - New requirement: client must send a bare `KA` datagram on an idle interval (~20s
     recommended by WebTools docs) to keep its NAT mapping open; the server silently drops
     inbound `KA` without dispatching it.
   Client touch points: `NetworkClient` — removed `dedicatedSocket`/`serverDedicatedPort`,
   collapsed to one `socket` field, added a daemon `keepaliveLoop` thread (15s interval, under
   the ~20s recommendation) sending `ProtocolParsing.KEEPALIVE_MESSAGE`. `ProtocolParsing` —
   `TXRXON_VERB`/`parseTxrxonReply`/`DedicatedChannelPorts` replaced by `REGISTERED_VERB`/
   `parseRegisteredReply` (returns `Result<Unit>`, no ports) + new `KEEPALIVE_MESSAGE = "KA"`.
   `ProtocolParsingTest`, `build.gradle.kts` version comment, and README's "Server protocol"
   section updated to match.

10. **GameTools 3.1.0**: adds a stable per-entity identity. `DrawableSnapshot` gained a
    `val id: Long` and **every implementor now takes `id: Long = DrawableSnapshot.UNIDENTIFIED`
    (== `0L`) as its FIRST ctor param**, before `visibleObject`/`gameObject`/`actor`. Positional
    `VisibleObjectSnapshot(...)` / `ActorSnapshot(...)` / `AliveSnapshot(...)` construction breaks
    → use named args. JSON is backward-compatible (defaulted field). Client reads none of it
    (`drawableCore()` `when` is still exhaustive; `copy()` preserves `id`). Also new server-side,
    unused here: `GameObject.entityId: EntityId`, `World(seed)` + `World.rng`/`events`/`byId()`/
    `tickCount`, `com.spartanlabs.gaming.event` (`EventBus`, `GameEvent`),
    `com.spartanlabs.gaming.simulation` (`RandomSource`, `SeededRandom`, `SimulationLoop`),
    `Alive.cancelAttack()`/`onAttackEnded`/`AttackEndReason`. No dependency changes. Client touch
    points: named args in `TestSnapshots.kt` (+ new defaulted `id` param) and
    `DrawableSnapshotsTest.kt`; `build.gradle.kts` dep version + comment.

11. **GameTools 5.0.0** (from 3.1.0 — 4.0.0 skipped): three changes.
    - **Artifact split.** `io.github.spartanlabsgaming:GameTools` → lowercase `gametools`
      (umbrella, empty jar, re-exports the two below), `gametools-core` (object model, stats,
      events, sim loop), `gametools-net` (GameServer, MouseAction, the new command protocol).
      Drop-in: `api("io.github.spartanlabsgaming:gametools:5.0.0")`. Transitive deps unchanged.
    - **`DrawableSnapshot.id: Long` → `id: EntityId`** (`@JvmInline value class EntityId(val raw: Long)`,
      `@Serializable(with = EntityIdSerializer::class)` → serializes as a **bare Long**, so the STATE
      wire form is byte-identical; only source readers break). **`DrawableSnapshot.UNIDENTIFIED`
      constant is GONE** — use `EntityId.UNASSIGNED` (whose `.raw` is `0L`). Client fix kept the
      app-internal boundary as `Long`: `EntityLookup` compares `it.id.raw == id` / checks
      `EntityId.UNASSIGNED.raw`; `Window.pick` returns `lastSnapshots[i].id.raw`, checks
      `id == EntityId.UNASSIGNED`; tests wrap `id = EntityId(id)` in `TestSnapshots`/`EntityLookupTest`.
    - **New `com.spartanlabs.gaming.networking.command` package** (id-addressed client→server
      orders): `ClientCommand` interface + 6 standard `@Serializable` commands (`MoveTo`, `MoveDir`,
      `Follow`, `Stop`, `Attack`, `StopAttack`, all with `EntityId` operands), `ClientCommandCodec`
      (`COMMAND <json>` datagram, polymorphic `type` discriminator), `StandardCommandApplier`
      (`ClientCommand.applyTo(world): ApplyResult`). `GameServer` gained `@JvmOverloads` +
      `commandCodec`/`onCommand` params — `COMMAND` falls through to `onPlayerMessage` when no codec.
      Client **adopted it 2026-09-07** (`networking/ClientCommands.kt`): emits `MoveTo` /
      `Follow` / `Stop` (`S` key) / `Attack`; `MoveDir` / `StopAttack` unused. See [[ui-increment-backlog]].

    Unrelated gotcha found during this bump: the working tree had a half-finished migration from a
    local `com.spartanlabs.graphics.ui.Color` to `com.spartanlabs.generaltools.Color` (GeneralTools
    2.0.1 has `Color`, but no `lightened()` — that's now a repo extension in `ui/UI.kt`). Not a
    GameTools issue; several files still needed import fixes to compile.
