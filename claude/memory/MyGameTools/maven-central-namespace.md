---
name: maven-central-namespace
description: MyGameTools publishes to io.github.spartanlabsgaming; single GameTools artifact through 3.1.0, then 3 coordinates (gametools/-core/-net) from 4.0.0
metadata: 
  node_type: memory
  type: project
  originSessionId: ed183933-3d98-4c48-8dbe-5c91ff134ceb
  modified: 2026-09-07T04:33:58.503Z
---

MyGameTools is published to Maven Central under the group **`io.github.spartanlabsgaming`**.

**As of 4.0.0 (module split, #32, merged 2026-09-06)** it ships as **three coordinates**, each
with its own `coordinates(...)` in its module `build.gradle.kts` — all bump together on a
release:
- `io.github.spartanlabsgaming:gametools` — umbrella, no source, `api`-re-exports the others
  (drop-in successor to the old single artifact). Note the **lowercase** id.
- `io.github.spartanlabsgaming:gametools-core` — object model, stats, spatial, event bus,
  simulation, geometry DTOs. No networking.
- `io.github.spartanlabsgaming:gametools-net` — `GameServer` + `MouseAction`; depends on core.

Latest release is **5.0.0** (2026-09-07, issue #31 — typed `ClientCommand` protocol +
`DrawableSnapshot.id` retyped `Long`→`EntityId`). 4.0.0 was the module-split distribution
break; 5.0.0 is the first source-breaking release since.

Through **3.1.0** it was a single artifact **`io.github.spartanlabsgaming:GameTools`**
(capital G, artifact id `GameTools` not `MyGameTools`), single Gradle module. That coordinate
gets no further releases; consumers move the one dependency line, no imports change.

History: through 1.8.0 it published as `io.github.spartanlaboratories:GameTools`. 1.9.0 and a
first 2.0.0 were tagged/GitHub-released but 1.9.0 never reached Central; `2.0.0` was published
once under the old `io.github.spartanlaboratories` group (immutable, now a frozen dead-end),
then the group was relocated to match the SpartanLabsGaming GitHub org and its verified
Central namespace (PR #17, merge 9b4422c, 2026-09-04). Version stayed 2.0.0 across the move.

`WebTools` and `GeneralTools` are separate libs and still resolve from
`io.github.spartanlaboratories` — only this library's publish group changed.

Downstream (MyGameServer / GameGraphics) switching their dependency coordinates is handled by
their own maintainers (the 2026-09-04 move to `io.github.spartanlabsgaming:GameTools` was
confirmed then). For the 4.0.0 split, no `4.0.0-SNAPSHOT` was pre-published — both were
dormant and MyGameServer was still on 3.0.0, so `v4.0.0` was tagged directly; they resolve
3.1.0 until they choose to move. Never file issues against them ([[no-downstream-consumer-issues]]).

See [[release-process]], [[project-repos-and-orgs]].
