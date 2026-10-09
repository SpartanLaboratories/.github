---
name: gametools-dependency
description: "Where the GameTools library MyGameServer depends on comes from, and how to inspect version changes"
metadata: 
  node_type: memory
  type: project
  originSessionId: 26e3eca0-5ed9-462b-b9ff-acf213f61e13
  modified: 2026-09-07T05:12:44.921Z
---

MyGameServer depends on `io.github.spartanlabsgaming:GameTools` (Maven Central). Its source
is the sibling project `D:\Documents\Programming\MyGameTools`.

**Namespace move (2026-09-04):** MyGameServer and GameTools both moved from the old
`io.github.spartanlaboratories` namespace to `io.github.spartanlabsgaming` (matching the
`github.com/SpartanLabsGaming` org). MyGameServer's own coordinates (`group`,
`mavenPublishing.coordinates`) and the GameTools dependency line were repointed, and the
dependency bumped `1.8.0 -> 2.0.0` in the same change. `io.github.spartanlabsgaming:GameTools:2.0.0`
went live on Central shortly after; its transitive deps still resolve on the old namespace
(WebTools `2.0.0b`, GeneralTools `2.0.1`) — that's fine, they exist there. A duplicate
`io.github.spartanlaboratories:GameTools:2.0.0` also exists on the old namespace (identical
sources; ignore it).

**How to diff a version bump:** the sources jars are cached at
`C:\Users\spart\.gradle\caches\modules-2\files-2.1\io.github.spartanlabsgaming\GameTools\<version>\*\GameTools-<version>-sources.jar`
(old versions under the `io.github.spartanlaboratories` path).
Unzip old vs new and `diff -ru` to see API changes; check the sibling `.pom` for dependency changes.

**1.1.0 -> 1.2.0 gotcha:** `GameServer` gained a 3rd constructor param
`onPlayerInput: (String, MouseAction) -> Unit`, so a trailing-lambda `GameServer(n) { name, msg -> }`
silently rebinds to `onPlayerInput` (msg inferred as `MouseAction`). Pass `onPlayerMessage =` by name.
`Actor`/`VisibleObject` also became `open` (were `abstract`; `draw()` removed).

**1.2.0 -> 1.3.0:** no source breakage. `VisibleObject` gained `var turns: Boolean = false`
(is `angle` meaningful to a renderer) and its default `color` flipped black -> opaque white.
`VisibleObjectSnapshot` gained a `turns` field, so the `broadcast()` wire format changed.
MyGameServer opts its actors into `turns = true`.

**1.3.0 -> 1.4.0:** no source breakage for MyGameServer (bumped 2026-08-30; `./gradlew build`
clean, Main.kt unchanged). Big internal reshape, mostly additive:
- `GameObject.tick()` is now `final` and only runs `onUpdate()` while the new `open var active`
  is true; `onUpdate()` went `abstract` -> `protected open fun onUpdate() {}`. Subclasses that
  overrode `tick()` (`Actor`, `Alive`) now override `onUpdate()`. MyGameServer only *calls*
  `tick()` (still public), so unaffected - but any future subclass here must override
  `onUpdate()`, not `tick()`.
- `VisibleObject` gained `var visible` (kept in step with `active`), `open collidesWith(other)`.
  `broadcast()` / `VisibleObjectSnapshot.from` now skip objects (and sub-objects) with
  `visible = false`; snapshot field list unchanged, so wire format is unchanged for visible
  objects.
- `Alive` gained `var damage = 10.0`; its health-bar Y offset sign flipped (bar now on the
  opposite side of the actor) - a renderer-visible behavior change, not a compile break.
- `StatGroup` gained `additiveMods` / `multiplicativeMods` maps (+ `total*` accessors).
- `Actor` gained `var movement: Movement` (Targeting default) + `nearby(quadtree, range)`;
  old destination-step logic moved from `move()` to `stepTowardsDestination()` (both `internal`).
- New API: `Movement`, `Projectile`/`DirectionalProjectile`/`HomingProjectile`,
  `com.spartanlabs.gaming.spatial.Quadtree`.

**1.4.0 -> 1.5.0:** no source breakage for MyGameServer (bumped 2026-08-31; `./gradlew build`
clean). Additive + a couple of signature widenings:
- New `com.spartanlabs.gaming.gameobjects.World` (owns `gameObjects: ArrayList<GameObject>` +
  a `quadtree: Quadtree<Double, VisibleObject>` it rebuilds at the start of every `tick()`,
  then ticks all objects over a snapshot) and `Player` (name + `ownedAlives` roster; unrelated
  to `GameServer`'s connection-level players).
- `Alive` gained `var visionRange` (default `Alive.DEFAULT_VISION_RANGE = 100.0`, rejects
  negatives) + `canSee(other): Result<Boolean>`.
- `Actor.nearby`, `DirectionalProjectile`, `HomingProjectile` widened their quadtree param
  from `Quadtree<Double, Actor>` to `Quadtree<Double, VisibleObject>` (`nearby` now also
  returns `List<VisibleObject>`). Source-compatible unless you held one of those as a typed
  local - MyGameServer doesn't.

**1.5.0 -> 1.5.1:** no source breakage (bumped 2026-08-31; `./gradlew build` clean). Additive:
- `Alive` gained `var faction: String` (default `Alive.DEFAULT_FACTION = "neutral"`),
  `var owner: Player?` (default null) and `val hasOwner`. **`owner` is a bare back-reference:
  `Player.own`/`disown` do NOT set it** - the caller must set both sides. MyGameServer's
  `connectPlayer`/`disconnectPlayer` now do (`alive.owner = player` / `= null`).
- `Alive.DEFAULT_VISION_RANGE` changed `100.0 -> 900.0` (behavior, not a break).

**1.5.1 -> 1.5.2:** `Player`/`Alive` ownership is now a maintained two-way invariant.
- **Breaking:** `Player.ownedAlives` went `ArrayList<Alive>` -> `List<Alive>` (a `get()` over a
  private `roster`). Code that mutated it directly (`.add`/`.remove`/`.clear`) no longer
  compiles.
- `Alive.owner`'s setter now pulls the actor off the old owner's roster and adds it to the
  new one; `Player.own`/`disown` just drive `Alive.owner`. Setting `owner` while iterating
  `ownedAlives` throws CME (it *is* the live roster) - snapshot with `.toList()` first.
- MyGameServer: `connectPlayer` dropped its redundant `alive.owner = player` (own() does it);
  `disconnectPlayer` snapshots the roster before clearing owners. Added
  `src/test/kotlin/PlayerRosterTest.kt` (3 tests) and made the two helpers + `ALIVES_PER_PLAYER`
  `internal` for it.

**1.5.2 -> 1.5.2a:** letter-suffixed patch (non-semver version string; Gradle resolves it as a
literal, and MyGameServer pins exact versions so ordering doesn't matter). Only change: the
`private Alive.healthBarYOffset` formula now adds half the bar's own height so it rests just
above the actor. Renderer-visible only; no API/source impact. Straight version bump.

**1.5.2a -> 1.6.0:** no dependency changes; MyGameServer compiles clean (bumped 2026-08-31).
- **Wire format changed (breaks clients):** `STATE` JSON is now a *polymorphic* list. Each
  entry is the most specific of `AliveSnapshot` (`type":"alive"`), `ActorSnapshot`
  (`"actor"`), or `VisibleObjectSnapshot` (`"visibleObject"`), via a new
  `sealed interface DrawableSnapshot`. `AliveSnapshot` carries health/faction/ownerName/damage
  (+ `StatGroupSnapshot`); `ActorSnapshot` carries speed/destination. A client parsing a flat
  `List<VisibleObjectSnapshot>` (GameGraphics did) must switch to the sealed type.
- `broadcast(List<VisibleObjectSnapshot>)` overload became `broadcast(List<DrawableSnapshot>)`.
  The `broadcast(Iterable<VisibleObject>)` overload MyGameServer uses is unchanged.
- `World.add(gameObject)` new: `gameObjects.add` + sets `Alive.world`. `World.removeList` +
  `tick()` now drains it after the pass. MyGameServer switched its Alive adds to `world.add`.
- `Alive` became `open`; gained `deathResponse` (default `REMOVAL`), `respawn`, `world`,
  `die()`/`onDeath()`, `enum DeathResponse{REMOVAL,RESPAWN}`. `onUpdate` calls `die()` at 0 HP;
  `REMOVAL` without `Alive.world` set just logs a warning and the actor stays.
- `Alive` health-bar Y offset sign flipped again (`location.y - healthBarYOffset`).

**1.6.0 -> 1.7.0:** no dependency changes; MyGameServer compiles clean, `./gradlew build`
green (bumped 2026-09-02). No source changes needed here — MyGameServer never touches the
reworked stat/combat APIs, and the `broadcast(Iterable<VisibleObject>)` overload it uses is
untouched. Library changes:
- **Stat model replaced (breaks any client/code reading `Alive.health`):** `StatGroup` ->
  `CombinedStat` (`gameobjects/CombinedStat.kt`); `StatGroupSnapshot` -> `CombinedStatSnapshot`.
  `Alive.health` is now `CombinedStat` — read/write `health.current` (was `health.value`),
  `health.max.value` (was `health.maxValue`), `health.fractionOfMax` unchanged. New
  `ModularStat` (+ `StatMod.kt`) replaces `StatGroup`'s additive/multiplicative mods.
  `Alive.damage` is now `ModularStat` (was `Double`) — use `damage.value`.
  `AliveSnapshot.damage` stays a plain `Double` (`alive.damage.value`), but `AliveSnapshot.health`
  is now `CombinedStatSnapshot` — **STATE wire format changed for `alive` entries.**
  `Projectile.dealDamageTo` now writes `target.health.current`.
- **Removed:** `Alive.visionRange`, `Alive.canSee(other)`, `Alive.DEFAULT_VISION_RANGE`
  (was 900.0). Not used by MyGameServer.
- New `Alive` combat system: `issueAttack(target)` drives a NONE/ISSUED/INPROGRESS cycle in
  `onUpdate()` (walks to `attackRange`, accrues swing progress at `attackSpeed/10000` per tick
  to `attackTime`, rolls target `evasion`, deals `damage`). New `ModularStat` fields:
  `attackTime` (1.7), `attackSpeed` (100.0), `attackRange` (750.0), `evasion` (0.0). Many
  `protected open` hooks: `onAttackIssued`, `onTargetedByAttack`, `onAttack`/`onAttacked`,
  `onHitting`/`onHitBy`, `onDamaging`/`onDamaged`.
- New `GameObject.distanceFrom(other): Result<Double>` (infix).
- `Alive` internals reorganised into `//region` blocks; `die()`/`DeathResponse`/`onDeath()`
  unchanged in behavior, just moved.

**1.7.0 -> 1.8.0:** no dependency changes. **Source break for MyGameServer** (fixed, build green
2026-09-02):
- **`Actor.baseSpeed` and `Actor.speedModifier` removed; `Actor.speed` is now a `ModularStat`**
  (was a computed `val = baseSpeed * speedModifier`). Base `10.0`. Negative values no longer
  rejected. `ActorSnapshot.speed` stays a plain `Double` (`actor.speed.value`).
  **Gotcha:** `ModularStat.value` has an `internal` setter and `calc()` is private, so setting
  `speed.base = x` from outside the library does NOT recompute `value` (stays at old value /
  10.0). To change effective speed from MyGameServer you must replace the whole stat:
  `actor.speed = ModularStat(base = x)` (the constructor seeds `value = base`). This drops any
  applied `StatMod`s — fine here, MyGameServer applies none. MyGameServer: `Main.kt` now imports
  `ModularStat`; the 3 demo actors + per-player Alives set `speed = ModularStat(base = N)`, and
  the `SET_SPEED` handler does `actors[index].speed = ModularStat(base = speed)`.
- `AliveSnapshot` gained `attackTime`, `attackSpeed`, `attackRange`, `evasion` (all `Double`,
  the `ModularStat.value` of the 1.7.0 combat fields) — **STATE wire format grew for `alive`
  entries.** MyGameServer doesn't build snapshots, so no code change; clients decoding `alive`
  must add the 4 fields.

**1.8.0 -> 2.0.0:** bumped 2026-09-04 with the namespace move. **No source changes for
MyGameServer** — `./gradlew build` green, all 10 tests pass (AttackCommandTest 7,
PlayerRosterTest 3), Main.kt untouched. No meaningful POM/transitive-dep changes (WebTools
`2.0.0` -> `2.0.0b`, everything else identical). Library changes:
- **New buff / capability system.** `GameObject` gained `capabilities: Set<Capability>`,
  `can(Capability): Boolean`, `stats: Map<String, Moddable>`, `buffs: List<Buff>`,
  `applyBuff`/`removeBuff`/`dispel`. `tick()` now ages active buffs *before* `onUpdate()` and
  prunes expired ones *after* (a buff with `durationTicks = n` lasts exactly n ticks; negative
  = indefinite). New types: `Capability` + `enum CoreCapability { MOVE, ATTACK }`, `Buff`
  (open, `onApplied`/`onTick`/`onExpired` hooks) + `BuffSnapshot`, `interface Moddable`.
- `Actor` declares `CoreCapability.MOVE`, exposes stat `"speed"`; `onUpdate()` only calls
  `move()` while `can(MOVE)`. `Alive` declares `CoreCapability.ATTACK`, exposes stats
  `"health"`/`"damage"`/`"attackTime"`/`"attackSpeed"`/`"attackRange"`/`"evasion"`;
  `onUpdate()` only runs `considerAttack()` while `can(ATTACK)`. Default caps are present and
  MyGameServer applies no buffs, so behavior is unchanged.
- `ModularStat` and `CombinedStat` now implement `Moddable`; their `applyMod`/`removeMod` are
  now `override` and return `Unit` (were chainable-ish). Behavior identical. MyGameServer only
  reads `.value` / `.current`, so no impact.
- **Wire format grew (breaks strict clients):** `GameObjectSnapshot` gained
  `buffs: List<BuffSnapshot> = emptyList()`, so *every* STATE entry now carries a `buffs`
  array (`{name, durationTicks, suppressedCapabilities}`). Default means old payloads still
  decode, but MyGameServer's broadcasts now always include it — GameGraphics' STATE decoder
  must tolerate the field. README protocol table updated.
- Internal only: WebTools `UDPConnection` -> `Connection` (GameServer.kt updated inside the
  library; its public API — ctor, `playerNames`, `broadcast(Iterable<VisibleObject>)`,
  `push`/`pushToAllPlayers`/`disconnect`/`shutDown` — is unchanged).

**2.0.0 -> 3.0.0:** bumped 2026-09-04 via `/fixonupdate`. **No source changes for
MyGameServer** — `./gradlew build` green, all 12 tests pass (AttackCommandTest 7,
PlayerRosterTest 3, CommandQueueTest 2), Main.kt untouched. Only file changed in the sources
jar was `GameServer.kt`, and every changed line was KDoc — no executable-code diff, so
`GameServer`'s Kotlin API (ctor, `playerNames`, `push`/`pushToAllPlayers`/`disconnect`/
`shutDown`, `broadcast(Iterable<VisibleObject>)`) is unchanged. POM: only dependency bump is
WebTools `2.0.0b -> 2.0.0c` (GeneralTools stays `2.0.1`).
- **Wire/transport protocol changed underneath (WebTools 2.0.0c) — breaks any client still
  expecting the old handshake, transparent to MyGameServer's own code:** the per-player
  dedicated port pair is gone. Handshake reply is now a bare `REGISTERED` token (was
  `TXRXON <sendPort> <receivePort>`), and every player's traffic - commands, `STATE`
  broadcasts, keepalives - is multiplexed over the one shared common socket. A client must
  now send a bare `KA` datagram on an idle interval (WebTools recommends ~20s) from its
  handshake socket to keep its NAT mapping warm; the server consumes `KA` silently, never
  routing it to `onPlayerMessage`/`onPlayerInput`. README's Handshake/Protocol sections
  updated to match. Tracked upstream as MyGameTools#18 "Upgrade to WebTools 2.0.0c
  (single-socket NAT-traversable data path)" (closed) and #14 (2.0.0b, the prior handshake
  rework). **Checked GameGraphics: already implements `Iam`/`REGISTERED`/`KA` (NetworkClient.kt,
  ProtocolParsing.kt) since its initial netcode commit — no client-side gap, nothing to fix
  or file there.**
- Gradle's dependency resolution also picked up `kotlin-stdlib`/`kotlin-reflect` `2.4.0`
  transitively (project's own Kotlin Gradle plugin is still pinned `1.9.24`) — build and
  tests are green under that resolution, but worth knowing if a future bump introduces a
  real stdlib-version conflict.

**3.0.0 -> 3.1.0:** bumped 2026-09-05 via `/fixonupdate`. **No source changes for
MyGameServer** — `./gradlew build` green, all 12 tests pass (AttackCommandTest 7,
PlayerRosterTest 3, CommandQueueTest 2), Main.kt untouched. POM: **no dependency changes at
all** (WebTools/GeneralTools unchanged; only the version string moved). Purely additive
release:
- **Stable entity ids.** New `@JvmInline value class EntityId(raw: Long)` (`EntityId.UNASSIGNED
  = 0`). `GameObject.entityId` (`internal set`) is assigned exactly once by the owning `World`
  — via `World.add` (eager) or by finding the object in `gameObjects` at the top of `tick()`.
  `World` gained `byId(EntityId): GameObject?`, a `seed` ctor param (`World(seed: Long =
  Random.nextLong())`, logged on construction), `val rng: RandomSource`, `var tickCount`.
- **Wire format grew (tolerant clients unaffected):** every `DrawableSnapshot` now carries
  `val id: Long` (defaulted to `DrawableSnapshot.UNIDENTIFIED = 0L`) as the first field —
  `VisibleObjectSnapshot`/`ActorSnapshot`/`AliveSnapshot` all gained `override val id`.
  Default keeps old payloads decoding; MyGameServer's broadcasts now always include it.
  **Checked GameGraphics: `NetworkClient` + `DrawableSnapshotsTest` both decode with
  `ignoreUnknownKeys = true` and keep their own client-side snapshot copies — new field is
  silently ignored, no client break, nothing to fix/file there.** README STATE row updated.
- **New `EventBus` on `World.events`** (`com.spartanlabs.gaming.event`): `subscribe(Listener):
  Subscription`, `publish(GameEvent)` — synchronous, re-entrant-safe (queues while
  delivering), listener exceptions swallowed with a warn. `sealed interface GameEvent`:
  `EntitySpawned`/`EntityRemoved` (fired by `World` in `tick()`), `AttackIssued`/`AttackLanded`/
  `DamageDealt`/`EntityDied`/`AttackCancelled`/`AttackEnded` (fired by `Alive`). MyGameServer
  subscribes to none, so no behavior change.
- **New `Alive.cancelAttack()`** + `onAttackCancelled()`/`onAttackEnded(reason)` hooks +
  `enum AttackEndReason { TARGET_DIED, TARGET_REMOVED }`. `considerAttack()` now ends an
  attack on its own when the target dies or leaves the world (was: kept swinging). Evasion
  rolls now go through `World.rng` (seeded) instead of `Math.random()` — combat is
  reproducible given a fixed `seed`. Private `takeDamage` gained a `source: Alive?` param and
  records `lastDamagedBy` for `EntityDied.killer`.
- **New `com.spartanlabs.gaming.simulation`:** `interface RandomSource` + `SeededRandom`;
  `SimulationLoop(world, LoopSettings, onTick)` — a daemon-thread fixed-timestep loop
  (`LoopSettings`: `tickRateHz` default 20.0, `maxCatchUpTicks` default 5) with `start()`/
  `stop()`/`advance(nanos)`. **Opportunity, not adopted:** `Main.kt` still hand-rolls its own
  60 Hz loop; could switch to `SimulationLoop`. Also `EntityId` could replace the fragile
  broadcast-list-position indices in `SET_DEST`/`ATTACK`.

**3.1.0 -> 5.0.0:** bumped 2026-09-06 via `/fixonupdate`; merged to `master` + deployed to
prod 2026-09-07 in PR #8 (commit ee579e1), bundled with the MyGameServer#6 interim entity-id
command work and the `SET_SPEED` deletion. **Artifact split + rename, no version 4.x.** The single `io.github.spartanlabsgaming:GameTools` (capital G) is replaced by
three lowercase artifacts, same group:
- `gametools-core` — object model, stats, buffs, event bus, seeded tick, `SimulationLoop`.
- `gametools-net` — `GameServer` + `MouseAction` (depends on core).
- `gametools` — umbrella, just re-exports core + net.
MyGameServer now depends on the **`gametools` umbrella** (`build.gradle.kts`), a drop-in for
the old coord. Monitor must watch `gametools`/`gametools-core`/`gametools-net` metadata paths.
**No source changes for MyGameServer** — `./gradlew build` green, all 21 tests pass
(AttackCommandTest 9, SetDestCommandTest 7, PlayerRosterTest 3, CommandQueueTest 2), Main.kt
untouched. **No transitive dep changes** — `gametools-core` POM == old `GameTools` 3.1.0 POM
exactly (WebTools 2.0.0c, GeneralTools 2.0.1, kotlinx-serialization-json-jvm 1.7.3,
slf4j-api 2.0.16, kotlin-stdlib 2.2.0). README coord references updated. Package names
unchanged (`com.spartanlabs.gaming.*`). Library changes:
- **`DrawableSnapshot.id`: `Long` -> `EntityId`** (`VisibleObjectSnapshot`/`ActorSnapshot`/
  `AliveSnapshot` all changed). `EntityId` is now `@Serializable(with = EntityIdSerializer)`
  — serializes as a **bare `Long`**, so the STATE wire form is byte-for-byte unchanged; only
  source-level readers of `snapshot.id` need `.raw`. **`DrawableSnapshot.UNIDENTIFIED` const
  removed** — use `EntityId.UNASSIGNED`. MyGameServer never reads snapshots (uses
  `broadcast(Iterable<VisibleObject>)`), so unaffected.
- **New `com.spartanlabs.gaming.networking.command` package (in core):** `interface
  ClientCommand` + 6 standard commands (`MoveTo`/`MoveDir`/`Follow`/`Stop`/`Attack`/
  `StopAttack`, all `@Serializable @SerialName("gametools.*")` with `EntityId` operands);
  `ClientCommandCodec` (polymorphic JSON, `COMMAND <json>` envelope, `type` discriminator);
  `ClientCommand.applyTo(world): ApplyResult` in `StandardCommandApplier.kt` (resolves
  operands via `World.byId`, type-checks Actor/Alive, does NOT authorize).
- **`GameServer` gained 2 ctor params** (`@JvmOverloads`, both default no-op/null):
  `commandCodec: ClientCommandCodec?` and `onCommand: (playerName, ClientCommand) -> Unit`.
  Adds `COMMAND <json>` verb routing; with no codec, `COMMAND` falls through to
  `onPlayerMessage` unchanged. **MyGameServer still hand-rolls its own command parsing in
  `Main.kt` + a raw `onPlayerMessage` string protocol — the 5.0.0 `ClientCommand`/`applyTo`
  API is exactly what issue #6 reinvents by hand and could replace (needs a lockstep
  GameGraphics change). Not adopted in this bump.**

World wiring (MyGameServer): `main()` builds a GameTools `World`, adds actors via `world.add`,
and each frame calls `world.tick()` then broadcasts
`world.gameObjects.filterIsInstance<VisibleObject>()`. `SET_DEST` resolves its index against
that same expression because the client addresses objects by position in the `STATE` array,
not by `gameObjects` index (they coincide only while every game object is a `VisibleObject`).
The `src/main/kotlin/Visibility.kt` extensions (`World.visibleObjects` / `World.broadcastObjects`,
the latter also filtering per-object `VisibleObject.visible`) were **deleted on user request**
(2026-09-03) as cleanup - both call sites inlined the `filterIsInstance` instead. `VisibleObject`
and its per-object `visible` flag still exist in the library; the deletion was NOT because of
any library removal. (The user's phrase "visibility was removed" meant *vision range* -
`Alive.visionRange` / `canSee` / `DEFAULT_VISION_RANGE`, gone in library 1.7.0 - but MyGameServer
never referenced those, so nothing there to change.) Range-based interest-management culling
(`cullToArea` / `VIEW_RADIUS`) was added on the 1.4.0 quadtree then removed on user request even earlier.
Earlier still, `World` was a hand-rolled default-package class, dropped in the 1.5.0 bump
once the library shipped its own.
