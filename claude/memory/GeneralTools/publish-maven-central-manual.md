---
name: publish-maven-central-manual
description: "How SpartanLaboratories libraries in this folder are released to Maven Central (manual, no CI); GeneralTools 3.0.0+ uses a staged upload-then-Publish flow"
metadata:
  node_type: memory
  type: project
  originSessionId: 09146918-7c59-4909-82ae-460c852bb358
  modified: 2026-10-20T18:51:42.264Z
---

`SpartanLaboratories/*` Kotlin libraries in `D:\Documents\Programming\*`
(GeneralTools, WebTools, …) publish to Maven Central **manually**. There is no
working CI publish. `GeneralTools/.github/workflows/publish.yml` was removed
2026-09-08 (PR #6) because it never succeeded: it ran `./gradlew publish` with only
`GRADLE_GITHUB_TOKEN`, and no Sonatype creds or signing key.

**GeneralTools from 3.0.0 on** (its README "Releasing" section, committed 2026-10-20
in `5b7ffe7` on the issue-#7 branch, is the source of truth):

1. Set `version` in `build.gradle.kts`; `coordinates` derive from it. Merge to `master`, then run `./gradlew check`.
2. `./gradlew publishToMavenCentral` uploads one bundle and stops. **Never use
   `publishAndReleaseToMavenCentral`**: it auto-releases, and a Central release can't be undone.
3. Wait for `VALIDATED` in the Central Portal, then test a throwaway consumer against the staged bundle.
4. Press Publish in the Portal, or drop the bundle with `./gradlew dropMavenCentralDeployment --deployment-id=<id>`.
5. Tag the merge commit `X.Y.Z` (no `v` prefix) and create the GitHub release with the migration notes.

The 3.0.0 release also has a planned pre-publish sequence
(`docs/plans/7-kotlin-multiplatform/plan-release.md`). The user approved it on 2026-10-19:
1. a scratch MyGameTools migration;
2. a smoke publish to a scratch file repository;
3. the staged upload with checks;
4. Publish;
5. the tag and release.

**Older flow** (GeneralTools ≤ 2.2.0, and other libraries until they adopt the staged flow):
1. Bump the version.
2. Run `./gradlew publishAndReleaseToMavenCentral --no-configuration-cache`. It auto-releases.
3. Tag `X.Y.Z` and run `gh release create X.Y.Z --latest`.

**Credentials** are already in `C:\Users\spart\.gradle\gradle.properties`
(`mavenCentralUsername` / `mavenCentralPassword`, `signing.keyId` /
`signing.password` / `signing.secretKeyRingFile` → `~/.gnupg/secring.gpg`, GPG
key `9DA01705771ABA0EF4FCB6EBD189C2CBE6A22BF6`). The same creds work for every
library in this folder.

**Pre-flight caution:** prefer a smoke publish to a scratch file repository over
`publishToMavenLocal`. A local artifact under an already-published version, such as a
rebuilt `2.2.0`, can shadow the real one for local consumers like MyGameTools.

The Maven Central CDN (`repo1.maven.org`) syncs 10–30 min after Publish, and search
indexing takes longer. A 404 right after publishing is normal.

`gh issue create` works in this setup: issues #11–#18 were filed with it on
2026-10-19/20. See [[manager-ide-files-untrack]].
