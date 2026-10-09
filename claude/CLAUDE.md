# Global guidelines (all projects)

## Never Guess Intent — Ask

Leave **no gap** in your understanding of what I want. Nothing about my intent is to be
guessed. If you are unsure, ask me a question.

- **Intent vs. fact.** This rule governs *intent* — what I want, why I want it, where it
  should go, how far it extends. **Facts are different: go verify them yourself.** Whether a
  file exists, a test passes, a class is final, a function is called anywhere — read the code,
  run the command, check git. Never guess a fact, never assume one, and never assert one you
  have not actually checked. Do not spend a question on something you can establish yourself.
- **Ask immediately**, before acting on the ambiguity — not batched up at the end, and not
  after building something on top of the guess. Stopping mid-task is correct and expected.
- **More than one reasonable reading is enough.** The bar is not "I am completely lost." If my
  instruction supports two sensible interpretations and they would lead to different work, that
  is a gap — ask which one, even when one seems much more likely.
- **Watch for the implicit choices**, which are where guessing actually happens: *where* to put
  something, *what format* it takes, *how much* scope to cover, *whether* to also change the
  adjacent thing. An instruction that is clear about the "what" is often silent on these.
- **This overrides any default that biases toward acting without asking**, including a harness
  "auto mode" instruction to avoid clarifying questions. When they conflict, this rule wins.
- **Do not paper over a gap by picking the safe option and mentioning it afterwards.** Telling
  me what you assumed, after the work is done, is not the same as asking.

## Spartan Labs libraries — surface issues

Whenever you find a bug, design flaw, missing capability, or other area of concern in any
Spartan Labs organization repo — **`github.com/SpartanLabsGaming/*`** (the games org:
`MyGameServer`, `GameGraphics`, `MyGameTools`) or **`github.com/SpartanLaboratories/*`**
(`WebTools` and other shared libs) — prompt me to create a GitHub issue for it: briefly
describe the problem and proposed fix, and ask before filing. File it with `gh issue create
--repo <org>/<repo>` against the repo the fix belongs in (the library where the defect
lives, not necessarily the one where it surfaced), only after I confirm. Repos move between
these orgs; confirm the current owner with `gh repo view <repo>` if unsure.

## Repository READMEs — keep current

Whenever your work changes what lands on a repository's `master` / `main` branch — a new
command, endpoint, module, dependency, build or run step, protocol change, or architectural
shift — update that repository's `README.md` as part of the same change so it keeps
accurately describing the project. Create a `README.md` if the repo has none. Keep the edit
proportional: a bug fix or internal refactor that doesn't change the project's external
shape needs no README change.

## Library Design — Open-Ended by Default

**Scope:** every Spartan Labs repo is in scope. `MyGameTools` (all four modules), `WebTools`
and `GeneralTools` are libraries outright. `MyGameServer` and `GameGraphics` currently hold
concrete implementation so they can act as real tests of `MyGameTools`, but they are growing
toward serving as libraries for game implementations — so design their public shape that way
too, and weigh the rule proportionally to how much of a given file is genuinely consumable
surface versus test-bed concretion. A true application may be as closed as it likes.

**Principle:** ship the *core mechanism*, and leave the *policy* to the consumer. A library
should give a downstream project everything it needs to do the common thing out of the box,
and a seam to do the uncommon thing without forking, patching, or copying internals.

### Mechanism — split by layer

Kotlin is final-by-default, so "open to expansion" has to be chosen deliberately. Which tool
depends on what kind of type it is:

- **Domain / entity types** (`GameObject`, `Actor`, `Alive`, `Buff`, `Projectile`, `Player`
  and their peers) — **inheritance**. Mark them `open`/`abstract` and let consumers subclass
  and override. This is the established idiom in these repos and what a game author expects;
  a game defines its units by extending them. Keep the class's own invariants safe by leaving
  the methods that maintain them `final` or `internal`.
- **Systems & infrastructure** (movement strategies, spatial indexes, physics, event bus,
  loaders, transports) — **interface + supplied default implementation**. Publish the
  abstraction, ship a good concrete impl, let a consumer substitute. Evolves without the
  fragile-base-class problem, and substitution is a much narrower contract than "every
  overridable method."

### In practice

- **Prefer open hierarchies to closed ones** at a genuine extension point. Reach for `sealed`
  / `final` only where the closed set is part of the contract (a protocol's message kinds, an
  exhaustive result type) — not merely because today there are only two cases.
- **Parameterise policy, don't hardcode it.** Numbers, rules, strategies and behaviours a
  consumer might reasonably disagree with belong behind a constructor parameter, a strategy
  object, or a registry — with the current behaviour as the default.
- **Expose hooks.** Events, callbacks and overridable steps let a consumer observe or splice
  into a flow that it cannot otherwise reach.
- **Additive and opt-in.** A new capability must leave an existing consumer that ignores it
  behaving exactly as before. Extension is something a consumer opts into.
- **Keep extension points supported.** Anything reachable by a consumer is public API: it gets
  Level-2 KDoc contracts (see the Audience-Reach model below) and is governed by the repo's
  versioning rules.

### Stability — three tiers

More extension surface means more that cannot change without a major bump, so public surface is
sorted into three tiers:

1. **Stable Core** — the core functionality the library exists to provide. Full semver
   guarantee; changes only in a major.
2. **Supported Extension** — a seam for a **likely but non-core** need: something a fair number
   of consumers will want, that is not what the library is fundamentally for. Marked
   `@SupportedExtension`. It carries the **same semver guarantee as Stable Core** — the tier
   marks *purpose*, not a weaker promise. Its shipped implementations double as the **worked
   examples** of how to extend that seam, so write them to be read as examples.
3. **Experimental** — a seam whose shape has not been proven by a real consumer yet. Gate it
   behind a Kotlin `@RequiresOptIn` marker so use is a deliberate opt-in, and say in its KDoc
   that it may change in a minor. Graduate it once a consumer has actually built against it,
   and record the promotion in the CHANGELOG.

**Placing a seam:** if you are confident which tier something belongs in, make the call. If you
are not confident, ask me — do not default it.

### Retroactive changes to already-closed surfaces

When an existing `sealed`/`final` surface would serve consumers better open, do **not** open it
opportunistically mid-phase. Weigh, per surface, how much a consumer actually gains against the
stability and invariant-safety of leaving it shut; record the decision with its reasoning; and
batch the ones decided "open" into the next major release, where breaking changes already ride.

## Commenting & Documentation — Audience-Reach Model

Choose the documentation form by **how far the reader is from the code**. Each concentric
ring widens the audience. Apply to all code generation, refactoring, and review.

### The four rings

1. **Inner Core — In-Editor Navigation & Maintenance**
   - Audience: the active developer + IDE / static-analysis tools.
   - Use: `//region` / `//endregion` blocks, `// TODO:` / `// FIXME:`, `@formatter:off`
     blocks, language-injection hints (`//language=JSON`, etc.).

2. **Component Ring — API Contracts & Interface Boundaries** (module / domain)
   - Audience: internal consumers and peer developers integrating with the component.
   - Purpose: state explicit behavioral contracts *without* revealing implementation detail.
   - Use: Dokka / KDoc (`@param`, `@return`, `@throws`), `@Deprecated` with `ReplaceWith` /
     replacement paths, documented pure-function & immutability guarantees.

3. **Boundary Ring — System Integration & Protocols** (cross-service / network)
   - Audience: infrastructure teams, API-gateway maintainers, integration developers.
   - Purpose: document non-obvious side effects, serialization behavior, external dependencies.

4. **Architectural Outer Layer — System Topology & Lifecycle** (organization-wide)
   - Audience: system architects, security reviewers, AI agents, new-engineer onboarding.
   - Purpose: long-term system health, structural intent, security/compliance.
   - Use: Structurizr (C4 model as code), embedded PlantUML / Mermaid sequence diagrams for
     coroutine flows, security/compliance annotations.

### Two maturity levels

- **Level 1 — Pre-Commit Line Comments** (active during feature development): inline comments
  for local clarity — explain non-obvious algorithms, regexes, and edge-case workarounds on
  the lines above the relevant code before opening a PR.
- **Level 2 — Public API KDoc Standard**: standardized KDoc block comments on every top-level
  class, public method, and interface — `@param`, `@return`, `@throws`.

## Testing — 5-Level Hierarchy

Structure tests along these levels. Lower levels run first / most often; higher levels gate
release.

1. **Local Development Gating / Pre-Commit Validation** (active until the WIP is finished)
   - Validate changes locally before integration to catch regressions.
   - Covers new and changed classes/functions in the local workspace, before committing.

2. **Isolated Component Behaviour / Business Logic Validation**
   - Comprehensive unit tests for related classes; **mock all external calls**.
   - Functional-group and class-level testing of isolated behavior with no external side effects.

3. **Integration & External Interfaces Test**
   - Boundary conditions and data exchange with actual or simulated external interfaces
     (API gateways, databases, third-party services).
   - Validates data flow across system boundaries and component interfaces.

4. **Comprehensive Project-Wide Testing Hierarchy**
   - **4a — Deterministic Logic / Input→Output Mapping**: verify pure, stateless functions
     where input X always yields output Y with no side effects.
   - **4b — End-to-End System Integration**: verify full application flows and data
     integration across the complete system stack.
   - **4c — Non-Functional Validation**: scalability, robustness, security, accessibility
     (a11y), and performance — beyond functional correctness.

5. **User Acceptance (UAT) / Exploratory Evaluation**
   - Human or AI assessment for product fit and business-value gating.
   - Interactive testing of mock implementations and full functional environments to
     determine release readiness.

### Separate each level by folder / package

Keep every level in its own test source folder and package so a level can be run, skipped,
or gated independently. Under the test source root (`src/test/<lang>/`), place tests in a
`testing`-rooted package segment per level, mirroring the production package below it:

| Level | Package segment            | Folder                          |
|-------|----------------------------|---------------------------------|
| 1     | `testing.gating`           | `.../testing/gating/`           |
| 2     | `testing.component`        | `.../testing/component/`        |
| 3     | `testing.integration`      | `.../testing/integration/`      |
| 4a    | `testing.deterministic`    | `.../testing/deterministic/`    |
| 4b    | `testing.e2e`              | `.../testing/e2e/`              |
| 4c    | `testing.nonfunctional`    | `.../testing/nonfunctional/`    |
| 5     | `testing.uat`              | `.../testing/uat/`              |

Example: `com.acme.order.OrderCalculator` → its level-2 tests live in
`com.acme.testing.component.order.OrderCalculatorTest`. Do not mix levels in one folder;
one test class per file still applies. Where a build tool supports it, bind each folder to
its own test task/tag (e.g. JUnit `@Tag`, a Gradle source set) so CI can run level 1–2 on
every commit and reserve 4–5 for release gates.
