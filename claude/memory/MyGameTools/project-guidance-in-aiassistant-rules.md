---
name: project-guidance-in-aiassistant-rules
description: Coding rules for this repo live in .aiassistant/rules/CLAUDE.md (apply:always)
metadata: 
  node_type: memory
  type: project
  originSessionId: 148cecdf-355f-4477-8275-43abb9c481f5
  modified: 2026-08-30T21:38:29.161Z
---

This repo's code-generation rules are in `.aiassistant/rules/CLAUDE.md` (front-matter
`apply: always`), not a root `CLAUDE.md`. `.aiassistant/rules/Manifesto.md` is an older
subset; CLAUDE.md is the authority.

Summary: Kotlin idioms + OOP-blended-with-FP (`val`, pure functions, `map`/`flatMap`/`filter`);
never throw raw exceptions for expected failures - use `Result` and functional recovery;
structured slf4j logging for lifecycle/data-flow/failure events (logback only in tests);
KDoc on every public class/interface/function; one test class per file (JUnit 5 via
`kotlin.test`, backtick test names).

**Import grouping (CLAUDE.md section 5):** every .kt file wraps each *top-level* group in
`//region N. Title` / `//endregion`; subgroups are plain `// N.M Title` lines; groups in
numeric order; alphabetical by fully-qualified path within the deepest subgroup; make a
subgroup even for one member; omit absent groups. Groups: **1** Organization Internal - 1.1
Spartan Laboratories (`com.spartanlabs.*`), 1.2 Spartan Gaming (ONLY `com.spartanlabs.gaming.*`
- `com.spartanlabs.geometry.*` is 1.1). **2** Intended Function - imports backing the core
algorithm or owned vals/vars; here `kotlinx.serialization.*`, `java.net.*` sockets,
`java.util.concurrent.*` collections. **3** Utility / Catch-all - 3.1 Java std, 3.2 Kotlin
(3.2.1 std e.g. `kotlin.math`, 3.2.2 kotlinx), 3.3 third party. **4** Programming
Infrastructure - 4.1 Logging (`org.slf4j`), 4.2 Error Handling, 4.3 Testing (`kotlin.test`,
JUnit), 4.4 Profiling. Multi-group tie-break priority: 1, 4, then 2/3.

**Why:** The user periodically asks for a "guidance pass" against these rules and expects
new code to already follow them; they pushed back specifically when import comments used the
old freeform `// Organizational` banners instead of the numbered region format.

**How to apply:** Match the existing house style - package-level `internal val log`,
`infix fun from(...)` snapshot factories, `Result`-returning accessors that `.map` rather
than `.getOrThrow()`, and the numbered import regions above.
[[gameserver-is-library-no-loop]]
