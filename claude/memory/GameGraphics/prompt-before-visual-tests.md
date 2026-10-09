---
name: prompt-before-visual-tests
description: Ask the user before running the app for a visual/screenshot check
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1cc0052c-7b78-4f95-968a-3b25a1caae35
  modified: 2026-09-03T01:28:07.163Z
---

Before launching the LWJGL client to eyeball a change or take screenshots (the
run/screenshot loop used to confirm UI work), **ask the user first** — don't do
it automatically as part of finishing a task.

**Why:** the user said "Prompt me before doing any more visual tests" after a
stretch of build→run→screenshot iterations. Compiling and the test suite
(`./gradlew build`) are fine to run unprompted; spinning up the actual window is
what needs a heads-up.

**How to apply:** finish the code + `./gradlew build`/tests, then offer the
visual check ("want me to run it and screenshot the buttons?") rather than
launching straight away. See [[gametools-geometry-and-root-package]] for the
project context.
