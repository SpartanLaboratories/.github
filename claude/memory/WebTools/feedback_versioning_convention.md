---
name: feedback-versioning-convention
description: Spartan Labs libraries — letter suffix is for bugfixes only; a new (non-breaking) addition bumps the third number instead.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 47e29a20-6542-4ea1-99b1-6549813bb466
  modified: 2026-09-04T22:55:57.428Z
---

Version scheme for Spartan Labs library releases (WebTools, GameTools, etc.), `Major.Feature.MinorChange` with an optional trailing bugfix letter:

- A trailing letter (`2.0.0a`, `2.0.0b`, `2.0.0c`, ...) is reserved for **bug-fix** releases
  only — it doesn't apply to new, additive functionality.
- A release that **adds something new** but isn't a full feature release bumps the **third
  number** instead (e.g. `2.0.0` → `2.0.1`), even if the previous release line had letter
  suffixes in progress.

**Why:** user, when asked whether WebTools issue #3's fix (publishing a wire-format object +
a new public client type — additive, not a bugfix) should release as `2.0.0d` or promote to
bare `2.0.0`, corrected: "2.0.1. The letter at the end is for bugfixes only. This is an
addition of something new but is not a full feature release therefore changing the third
number makes sense."

**How to apply:** whenever proposing or picking a release version for one of these repos —
in planning docs, in `manager`'s version-bump step, or when asked directly — classify the
change first (bugfix vs. addition vs. full feature) and pick the version segment to bump
accordingly, rather than defaulting to the letter-suffix pattern seen in recent history.
See [[api-evolution-clean-break]] for the sibling rule on breaking-change handling.
