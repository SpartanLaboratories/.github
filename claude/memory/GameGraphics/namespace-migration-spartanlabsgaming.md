---
name: namespace-migration-spartanlabsgaming
description: GameGraphics moved to io.github.spartanlabsgaming:GameTools:2.0.0; new-namespace + major-version bump done 2026-09-04
metadata: 
  node_type: memory
  type: project
  originSessionId: 912f3950-abd6-4034-963f-5ddaed0d2bfa
  modified: 2026-09-04T04:35:22.720Z
---

The Maven namespace `io.github.spartanlabsgaming` was created to match the GitHub org
`SpartanLabsGaming` (the org name did not change; the repo is still `SpartanLabsGaming/GameGraphics`,
`origin` unchanged). GameTools was republished there.

**Done 2026-09-04** on branch `feature/selection-inspector-and-buttons` (not yet committed):
`build.gradle.kts` dependency `io.github.spartanlaboratories:GameTools:1.8.0`
-> `io.github.spartanlabsgaming:GameTools:2.0.0`. GameTools 2.0.0 also stays published under the
old `io.github.spartanlaboratories` namespace.

GameTools 2.0.0 API changes that touched this client (all in the WebTools transitive dep,
`2.0.0` -> `2.0.0b`; the gameobjects/snapshot types the client uses were unchanged):

- `MultiConnectionUDPServer.COMMON_SEND_PORT` removed. The server now replies to the handshake
  datagram's UDP source instead of a fixed port, so the client sends `Iam <name>` from an
  **ephemeral** `DatagramSocket()` (was bound to `COMMON_SEND_PORT`).
- Handshake line simplified `Iam <name> <address>` -> `Iam <name>` (trailing address token still
  accepted but ignored by the server).
- `TXRXON` reply lost its echoed `<address>` prefix: now `TXRXON <sendPort> <receivePort>`
  (verb at token 0). `ProtocolParsing.parseTxrxonReply` / `buildHandshakeMessage` updated,
  `ProtocolParsingTest` updated.
- Also in WebTools 2.0.0b but not used here: `UDPConnection` -> `Connection` rename;
  new `Buff`/`Capability`/`Moddable` on the server gameobjects; `GameObjectSnapshot` gained a
  defaulted `buffs: List<BuffSnapshot>` field (backward-compatible, no client change).

`resolveLocalAddress` (still in WebTools) is no longer imported by the client.
Build + all 111 tests green after the change. README protocol section + Central link updated.

Still open: this repo has no `maven-publish` config (published once as
`io.github.spartanlaboratories:GameGraphics:1.0.0`). The user confirmed (2026-09-04) that when
they ask to publish GameGraphics it will be under the **new** namespace, i.e.
`io.github.spartanlabsgaming:GameGraphics` — which means adding a `maven-publish` + signing setup
to `build.gradle.kts` at that time. Do NOT publish/release to Maven without an explicit instruction.
See [[gametools-geometry-and-root-package]].
