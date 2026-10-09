---
name: feedback-dont-raise-downstream-effects
description: "Don't ask the user about downstream/cross-repo compatibility effects of a library change; downstream projects handle their own adoption."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ebdf6002-5d88-4a3e-8057-ec5204632a31
  modified: 2026-09-05T22:05:15.809Z
---

When a WebTools (or any Spartan Labs library) change has a cross-repo behavioral
consequence for consumers (MyGameTools, MyGameServer, GameGraphics, etc.), just note it in
the plan/PR/issue comment if relevant and move on. Do **not** ask the user whether to check
or follow up on downstream impact, and do not treat it as a task to schedule — the
downstream projects will handle those effects themselves.

**Why:** user, on WebTools issue #5 (the `Connection.terminate()` behavior change), after
being offered a `MyGameTools` compatibility check as a follow-up: "from now on do not ask
me about downstream effects, the downstream projects will handle those."

**How to apply:** repo-wide, all Spartan Labs library work. Still allowed: a one-line
mention of the consequence in release notes / the closing issue comment. Not allowed:
asking "want me to check MyGameTools?", spawning an agent for it, or filing a cross-repo
issue about it unprompted. Sibling of [[feedback-downstream-adoption-not-a-closing-gate]]
and the [[feedback_no_ide_files]] "don't ask, just handle it" pattern. Note the still-active
global rule to surface *upstream* library defects as GitHub issues is unaffected — that's
about the library you're fixing, not its consumers.
