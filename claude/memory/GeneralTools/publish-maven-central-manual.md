---
name: publish-maven-central-manual
description: "How SpartanLaboratories libraries in this folder are released to Maven Central (manual, no CI)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 09146918-7c59-4909-82ae-460c852bb358
  modified: 2026-09-09T02:57:13.663Z
---

`SpartanLaboratories/*` Kotlin libraries in `D:\Documents\Programming\*`
(GeneralTools, WebTools, …) publish to Maven Central **manually** — there is no
working CI publish. `GeneralTools/.github/workflows/publish.yml` was removed
2026-09-08 (PR #6) because it never succeeded (ran `./gradlew publish` with only
`GRADLE_GITHUB_TOKEN`, no Sonatype creds / signing key).

**Release process** (maintainer, from the repo root):
1. Bump the version in `build.gradle.kts` → `coordinates("io.github.spartanlaboratories", "<Artifact>", "X.Y.Z")`.
2. `./gradlew publishAndReleaseToMavenCentral --no-configuration-cache` — uploads to the Central Portal and auto-releases (vanniktech `com.vanniktech.maven.publish` plugin, `publishToMavenCentral()` + `signAllPublications()`).
3. Tag the released commit `X.Y.Z` (plain, no `v` prefix) and `gh release create X.Y.Z --latest`.

**Credentials** are already configured in `C:\Users\spart\.gradle\gradle.properties`
(`mavenCentralUsername` / `mavenCentralPassword`, `signing.keyId` /
`signing.password` / `signing.secretKeyRingFile` → `~/.gnupg/secring.gpg`, GPG
key `9DA01705771ABA0EF4FCB6EBD189C2CBE6A22BF6`). Same creds work for every
library in this folder. `./gradlew publishToMavenLocal` is a safe pre-flight
(exercises signing without uploading).

Maven Central CDN (`repo1.maven.org`) sync lags the publish by ~15–30 min;
search indexing longer. A 404 right after publishing is normal.

Note: `gh issue create` is blocked by the permission classifier in this setup —
the user files issues themselves or via a granted rule. See [[manager-ide-files-untrack]].
