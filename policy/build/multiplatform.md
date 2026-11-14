# Multiplatform libraries
<!-- {"name":"Multiplatform libraries","code":"P-B-MP","id":133} -->

## Targets
<!-- {"name":"Targets","code":"P-B-MP-TA","id":1088} -->

Every multiplatform library compiles its shared code for at least one non-JVM target, so that a
JVM-only API in shared code fails to compile. Whether that target is a real published target or
a module that only checks compilation is the repository's choice, and a repository may add real
targets.

## Modules
<!-- {"name":"Modules","code":"P-B-MP-MO","id":1089} -->

Every multiplatform library is a shared core module plus a separate module and artifact for each
device family.

## Module names
<!-- {"name":"Module names","code":"P-B-MP-MN","id":1090} -->

Every multiplatform library names its shared core module `<library>-core` and the module of each
device family `<library>-<family>`, such as `-desktop`, `-android` and `-web`. Each artifact takes
its module's name.

## Convention plugins
<!-- {"name":"Convention plugins","code":"P-B-MP-CP","id":1091} -->

Every multiplatform library keeps its shared build configuration in convention plugins, in a
`build-logic` build that the repository's settings include.

## Gradle wrapper
<!-- {"name":"Gradle wrapper","code":"P-B-MP-GW","id":1092} -->

Every multiplatform library builds with the Gradle wrapper, at Gradle 9 or later.

## Version catalog
<!-- {"name":"Version catalog","code":"P-B-MP-VC","id":1093} -->

Every multiplatform library keeps the versions of its dependencies and plugins in a version
catalog, `gradle/libs.versions.toml`.

## Publishing
<!-- {"name":"Publishing","code":"P-B-MP-PU","id":1094} -->

Every multiplatform library publishes through the `com.vanniktech.maven.publish` plugin to Maven
Central, and signs every publication.

## Tests
<!-- {"name":"Tests","code":"P-B-MP-TE","id":1095} -->

Every multiplatform library's shared tests use `kotlin.test`, and its tests on the JVM run on
JUnit 5.

## Logging
<!-- {"name":"Logging","code":"P-B-MP-30-P1","id":"30-P1"} -->

A multiplatform library logs as every library does: [R-30 (Logging)](../logging/README.md).
