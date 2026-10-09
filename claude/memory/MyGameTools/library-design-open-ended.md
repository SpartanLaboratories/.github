---
name: library-design-open-ended
description: "For library projects, user prefers open-ended systems — core mechanism shipped, policy left extensible by downstream consumers; codified in global ~/.claude/CLAUDE.md"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5ea68a35-2d4a-4fe2-82ef-fbd29f79ffa7
  modified: 2026-09-19T17:42:16.418Z
---

When the project is a **library**, design open-ended systems: provide the core functionality
and keep it open to expansion by downstream consumers. Interface + supplied default over a
single concrete class; open hierarchies over `sealed`/`final` at real extension points;
policy parameterised rather than hardcoded; hooks exposed; everything additive and opt-in.
Applies globally unless a specific project says otherwise. Does not apply to applications.

**Why:** Stated by the user as a global preference on 2026-09-19: *"if the project is a
library then I prefer building open-ended systems that provide core functionality but remain
open to expansion by downstream consumers."* It fits how these repos are actually consumed —
GameTools is published to Maven Central and used by MyGameServer / GameGraphics, which cannot
patch it (see [[no-downstream-consumer-issues]], [[maven-central-namespace]]).

Three follow-up rulings the user gave on 2026-09-19 when asked how to apply it:

- **Mechanism is split by layer.** Domain/entity types (Actor, Alive, Buff, Projectile,
  Player) extend by inheritance — the established idiom here. Systems and infrastructure
  (movement, spatial index, physics, event bus) extend by interface + supplied default impl.
- **Stability is three-tier** (the user's own design): **Stable Core** → **Supported
  Extension** (`@SupportedExtension`; likely-but-non-core needs, *same* semver guarantee as
  core — the tier marks purpose, not a weaker promise — and its shipped impls double as the
  worked examples) → **Experimental** (`@RequiresOptIn`, may change in a minor). Placement
  rule: confident, make the call; not confident, ask.
- **Scope is every Spartan Labs repo.** MyGameServer and GameGraphics currently hold concrete
  implementation serving as real tests of MyGameTools, but are growing toward being libraries
  for game implementations — design their public shape accordingly.

**How to apply:** The full standard is codified in global `~/.claude/CLAUDE.md` under
"Library Design — Open-Ended by Default", so it reaches every session and every subagent that
reads it — do not restate it in prompts, point at it. The section also carries the limit: a
seam must answer real variation, not a hypothetical one, and a genuinely unclear case is a
fork to raise rather than decide silently. Retroactive openings are never done
opportunistically mid-phase — they are weighed per surface and batched into the next major.
For MyGameTools those rulings are already made and written up in
`docs/api-openness-decisions-6.0.0.md` (Movement/Player/EventBus open, World/SimulationLoop
stay closed). Relevant to [[framework-target-state]], since the roadmap's module split and
public-API surface are where this bites hardest.
