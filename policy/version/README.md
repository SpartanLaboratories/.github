# Versioning
<!-- {"name":"Versioning","code":"P-V","id":25,"pointerMark":1} -->

## The scheme
<!-- {"name":"The scheme","code":"P-V-SC","id":1071} -->

`Major.Feature.MinorChange`, optionally a trailing letter for a bug fix (e.g. `1.5.2a`). Each
repository's `CONTRIBUTING.md` says where its version lives and which artifacts share it.

| Change | Bump | Example |
| --- | --- | --- |
| `feat:` | Feature release | `1.9.0` → `1.10.0` |
| `fix:` / `perf:` | MinorChange, or a trailing letter | `1.9.0` → `1.9.1` / `1.9.0a` |
| `feat!:` / `BREAKING CHANGE:` | Major release | `1.9.0` → `2.0.0` |
| `docs` / `chore` / `ci` / `test` / `build` / `refactor` | none — rides the next release | |

## Lettered versions in dependency graphs
<!-- {"name":"Lettered versions in dependency graphs","code":"P-V-LV","id":1072} -->

Gradle orders a version with an extra non-numeric part *below* the same version without it:
`1.5.2a` < `1.5.2` (Gradle's "Version ordering" rules). So when a dependency graph asks for both,
Gradle's conflict resolution picks the plain release and silently drops the bug fix. Three rules
keep lettered fixes effective:

1. **A library pins a lettered version with `strictly`.** When a Spartan Labs library depends
   on a lettered version of another Spartan Labs artifact, including a multi-module library's
   umbrella on its own modules, it declares the pin with Gradle's `strictly`
   (`version { strictly("1.5.2a") }`). The pin is then carried in the published Gradle Module
   Metadata, cannot be out-ranked by a plain version elsewhere in a consumer's graph, and a
   conflict fails the consumer's build instead of downgrading.
2. **A consumer requests a lettered version with `strictly`** on its side, for the same reason.
3. **Keep strict pins current.** Gradle warns that `strictly` in a library affects downstream
   consumers: a graph that asks for a newer version of a strictly pinned module fails to resolve
   until the library bumps its pin. Bump the pin in the next release after the pinned artifact
   moves.

A Maven POM carries no `strictly`; a Maven consumer gets the version its own declaration names
and must request a lettered version explicitly.
