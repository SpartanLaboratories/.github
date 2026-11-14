# READMEs and CHANGELOGs
<!-- {"name":"READMEs and CHANGELOGs","code":"P-D-RC","id":135} -->

## The README
<!-- {"name":"The README","code":"P-D-RC-RM","id":1099} -->

A change that alters what lands on a repository's default branch (`master` or `main`), such as a
new command, endpoint, module, dependency, build or run step, a protocol change or an
architectural shift, updates that repository's `README.md` in the same change, so that the README
keeps describing the project accurately. A change that would update a `README.md` the repository
does not have creates it. The update is proportional to the change: a bug fix or an internal
refactor that leaves the project's external shape as it was needs no README change.

## The CHANGELOG
<!-- {"name":"The CHANGELOG","code":"P-D-RC-CL","id":1100} -->

Every repository keeps a `CHANGELOG.md` in the Keep a Changelog layout, and a repository without
one gets one. A change that lands adds its entry (Added, Changed, Fixed, Removed, …) in the same
change: under `## [X.Y.Z] - <date>` when the landing bumps a version, which is known by then, and
otherwise under `## [Unreleased]`. A comment- or doc-only change adds no entry.
