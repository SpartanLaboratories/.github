---
name: project-webtools-split-into-three-artifacts
description: WebTools is now three Maven artifacts (webtools-udp / -scraping / -browser); the combined WebTools artifact is retired at 2.0.1a.
metadata: 
  node_type: memory
  type: project
  originSessionId: ebdf6002-5d88-4a3e-8057-ec5204632a31
  modified: 2026-09-05T23:44:38.167Z
---

As of 2026-09-05 (issue #15, PR #16), the WebTools repo is a Gradle multi-module build
publishing three independent artifacts under `io.github.spartanlaboratories`, all starting
at `1.0.0`:

- `webtools-udp` — package `com.spartanlabs.webtools.udp`; runtime dep slf4j-api only.
  The UDP connection layer + handshake. Issues #1/#3/#5 all live here.
- `webtools-scraping` — package `com.spartanlabs.webtools.scraping`; `Connector` + skrapeit/jsoup/unirest.
- `webtools-browser` — package `com.spartanlabs.webtools.browser`; `WebViewer` + selenium-java 4.48.
  Driver via Selenium Manager, no bundled binaries.

The combined `io.github.spartanlaboratories:WebTools` artifact is **retired at its final
`2.0.1a`** — never publish another `WebTools` version. Each module versions independently
going forward; the [[feedback_versioning_convention]] (letter suffix = bugfix) still applies
per module.

Modules share no code; the one-line internal `Result.flatMap` is deliberately duplicated in
webtools-udp and webtools-scraping. Root `build.gradle.kts` holds shared config (Kotlin/JVM,
the 5-level test tasks, the publishing POM skeleton) in a `subprojects {}` block. Test
packages are `com.spartanlabs.testing.<level>.webtools.<module>`. Full record:
`docs/split-into-three-modules-plan.md`. Relates to [[api-evolution-clean-break]].
