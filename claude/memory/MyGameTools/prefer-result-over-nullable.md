---
name: prefer-result-over-nullable
description: "API design rule — keyed lookups / fallible reads return Result<T>, never a nullable T?"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e1f6a02f-5bfd-443b-88b7-5d8d2203d895
  modified: 2026-10-05T00:42:52.409Z
---

Always prefer `Result<T>` over a nullable return (`T?`) for lookups and other reads that can miss. The user stated this on 2026-10-04 while deciding #131 (TiledMap.spawnPoint / terrainAt → Result), after #77 had already moved `World.systemOf` and `ZoneIndex.zoneOf` to `Result` with dedicated stackless miss exceptions (`MissingWorldSystemException`, `UnzonedEntityException`).

**Why:** The user considers this a settled convention, not a decision to re-open per API. They called filing an issue for it unnecessary ("a small decision, rather than an issue worth filing").

**How to apply:** When designing or planning new public API, give misses a `Result` shape and don't propose a nullable alternative as a candidate. Still ask about intent-level details the rule doesn't settle, such as the miss exception type. This governs new work. It doesn't authorise sweeping already-shipped nullable APIs (e.g. `World.byId`); see [[standing-directives-are-not-task-requests]].
