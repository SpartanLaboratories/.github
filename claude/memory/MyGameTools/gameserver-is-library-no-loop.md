---
name: gameserver-is-library-no-loop
description: "GameServer/GameTools is a library; the game loop belongs to the implementer, not this repo"
metadata: 
  node_type: memory
  type: project
  originSessionId: 148cecdf-355f-4477-8275-43abb9c481f5
  modified: 2026-09-05T22:36:45.500Z
---

`MyGameTools` (published as `io.github.spartanlaboratories:GameTools`) is a library. `GameServer`
and the `GameObject`/`Actor`/`VisibleObject` hierarchy are meant to be driven by a separate
implementation (e.g. the `MyGameServer` project at `D:\Documents\Programming\MyGameServer`,
whose `MainKt` runs the actual server) that writes its own game loop / tick scheduler.

**Why:** When asked to "update GameServer", the user rejected adding a tick/world-loop to it,
stating the loop is the consumer's responsibility.

**How to apply:** `tick()` is a hook the consumer calls; keep it callable independently.
[[project-guidance-in-aiassistant-rules]]

**Update 2026-09-05 ([[framework-target-state]]):** this is now relaxed, not absolute. The
roadmap adds an *opt-in* fixed-timestep `SimulationLoop` in `gametools-core` with externally
mutable settings. A loop may be *offered*; it must never be the only way to advance the world.
Don't add mandatory loops/schedulers; an opt-in driver alongside manual `tick()` is fine.
