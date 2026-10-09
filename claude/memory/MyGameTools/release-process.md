---
name: release-process
description: "how GameTools versions are cut, published to Maven Central, and tagged"
metadata: 
  node_type: memory
  type: project
  originSessionId: 39b5a082-13a1-4bbe-b7f1-281d2a868dbf
  modified: 2026-08-31T01:57:03.185Z
---

The `/feature` flow (`~/.claude/feature.md`): compliance-check all changed files against
[[project-guidance-in-aiassistant-rules]], bump the version feature release per the
nomenclature in `.aiassistant/rules/CLAUDE.md` §6 (e.g. 1.3.0 → 1.4.0), commit to master,
then publish + release to Maven Central.

- Version lives in one place: `coordinates(...)` in `build.gradle.kts`.
- Publishing uses the `com.vanniktech.maven.publish` plugin. `./gradlew publishAndReleaseToMavenCentral`
  uploads to the Central Portal and auto-triggers release; `publishToMavenCentral` stages only.
  Credentials are in `~/.gradle/gradle.properties` (`mavenCentralUsername/Password`, `signing.*`).
- As of 2026-08-31 the user added `Bash(./gradlew publishAndReleaseToMavenCentral:*)` and
  `Bash(git push:*)` allow rules to `~/.claude/settings.json`, so Claude can run the publish
  and push directly — the auto-mode classifier no longer blocks them. (Before that it did.)
  Still confirm before publishing since it is irreversible.
- Release commits are titled `Release <version>`. Tags are annotated and `v`-prefixed
  (`v1.4.0`) — convention started at 1.4.0; earlier releases were untagged. Push with
  `git push origin master --follow-tags`.
- Networking tests bind fixed UDP ports; a running game-server process (`MainKt`) makes them
  fail with `BindException`. Not a code failure — see [[gameserver-is-library-no-loop]].
