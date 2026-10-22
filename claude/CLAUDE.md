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
- **Formatting is not intent — decide it yourself.** Make every non-code formatting decision on
  your own, including in docs and comments: whitespace, blank lines, line wrapping, Markdown
  layout. Follow the file's existing style and do not ask me. This covers how text is laid out,
  not what it says.
- **This overrides any default that biases toward acting without asking**, including a harness
  "auto mode" instruction to avoid clarifying questions. When they conflict, this rule wins.
- **Do not paper over a gap by picking the safe option and mentioning it afterwards.** Telling
  me what you assumed, after the work is done, is not the same as asking.

## Spartan Labs libraries — surface issues

Whenever you find a bug, design flaw, missing capability, or other area of concern in any
Spartan Labs organization repo — **`github.com/SpartanLabsGaming/*`** (the games org:
`MyGameServer`, `MyGameClient`, `MyGameTools`) or **`github.com/SpartanLaboratories/*`**
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

## Work levels

Every issue is sized to one of four **work levels**, carried as a `level: N` label on the
issue. The level decides how much planning, implementation, QA and versioning the work gets;
`/resolve-issue` and its agents scale to it.

| Level | Label | What it is | Planning | Built this run? | Version bump |
|-------|-------|------------|----------|-----------------|--------------|
| 1 | `level: 1` | **No impact** — comments, KDoc, Markdown docs only. No executable line changes. | none; no plan folder | yes | none |
| 2 | `level: 2` | **Small fix** — a bug fix that changes no public API, persisted or shared state, or wire format, and stays local to one component. | short `plan.md` (root cause, fix, regression test) | yes, test-first | `fix:` — MinorChange or trailing letter |
| 3 | `level: 3` | **Small feature** — new or changed behaviour inside **one** system: additive public API, a new class or option. | interview, targeted research, one `plan.md` | yes | `feat:` — Feature release |
| 4 | `level: 4` | **Large feature / roadmap** — anything that spans **more than one** system. | full pipeline up to the architecture; **plan only** | **no** — each system becomes a sub-issue, resolved later at its own level | none (docs only) |

- **The label is re-checked when work starts.** If the issue, or the code it touches, says
  the label is wrong, or there is no label, propose a level with the evidence and ask me.
  Never re-level silently.
- **Escalate, don't stretch.** When work turns out bigger than its level (a level-1 change
  needs code, a level-2 fix changes public API or state, a level-3 feature needs a second
  system), stop and ask me to re-level it. Never quietly do bigger work under a smaller level.
- A breaking change is never level 1 or 2.

## Planning documents — folder layout

Every plan lives under `docs/plans/`, in a folder hierarchy that mirrors the repo's GitHub
issue hierarchy. Documents that are not plans (roadmaps, protocol specs, decision records,
asset folders such as `docs/brand/`) stay where they are.

**Hierarchy.** Each issue gets one folder, `<number>-<slug>/`, with a short kebab-case slug
taken from the issue title (e.g. `49-physics/`). It sits inside its parent tracking issue's
folder, following the sub-issue chain root-first, e.g.
`docs/plans/86-phase-1-map-and-space/49-physics/`. An issue with no parent sits directly under
`docs/plans/`. Find the parent with `gh api graphql -f query='query{repository(owner:"<org>",
name:"<repo>"){issue(number:<n>){parent{number title}}}}'`. If an issue is re-parented, move
its folder.

**Folded-in issues.** When one issue is resolved as part of another issue's work, the folded-in
issue gets its own `<number>-<slug>/` subfolder inside the host issue's folder, as a sub-issue
would, and its documents go there.

**An issue folder holds only that issue's resolution:**
- `draft.md`: the draft plan.
- `architecture.md`: the grand design, when the work has one.
- `plan.md`, or one `plan-<unit-slug>.md` per unit when the design decomposes into several.
- `impact.md`: fallout and impact thoughts (adoption, blast radius, follow-ups). The planner
  writes it while planning and reconciles it once implementation ends.
- `final-implementation.md`: the final as-built record. It describes what was actually built,
  every deviation from the plan, and the reasoning for each. The implementer appends each
  deviation, with its reasoning, the moment it makes it; the planner reconciles the file into
  the final as-built once implementation ends.
- `research/README.md`: the planner's research questions (one topic-led question per open
  point the design depends on) and, below them, the verification results and its summary of
  the findings.
- `research/<question-slug>.md`: one file per researcher subagent, written by that researcher.
- `superseded/<name>-<YYYY-MM-DD>.md`: a replaced version of any of the above, with a
  "superseded by" note at its top.
- Anything else specific to that one issue's resolution, e.g. a UAT record.

**A tracking issue's folder** holds its own documents (a phase plan, an initiative draft, a
design spanning several of its sub-issues) loose beside its sub-issue folders.

**Level 1 work has no folder.** A comment- or doc-only change is recorded by its PR and the
issue's resolution comment alone.

**Plans need an issue.** Before planning new work that has no issue, ask me to file one. An
existing plan with no issue sits loose in the tracking folder it belongs to, or directly
under `docs/plans/` if none.

**Committed.** Everything under `docs/plans/` is committed. Research is committed as it is
written, with a concurrent batch of researchers' findings landing in one commit once the
whole batch has returned; everything else is committed with the work it plans.

## System dashboards — `docs/dashboards/`

Every repository keeps visual dashboards of its systems **as they are**, maintained by the
`presenter` agent at the end of every level 2–4 `/resolve-issue` run (before the change lands,
so the update rides in the same PR). The `system-dashboard` skill holds the templates, the
conventions and the checks.

- **One page per system**, `docs/dashboards/<system-slug>/index.html`: its function first
  (structure, threads, decision paths, sequences, lifecycles), then context (open issues, plans,
  roadmap) as secondary information. Beside it, `workspace.dsl` — the Structurizr C4 model of
  the system, embedded verbatim in the page, which renders its C4 views from it.
- **Supersystem and repository pages** bind systems together and show how they interact:
  `docs/dashboards/<supersystem-slug>/index.html` for a group of systems, and
  `docs/dashboards/index.html` for the repository. They are refreshed on every run.
- **`docs/dashboards/systems.json`** is the registry: every system, its slug, function, code
  paths, parent, status (`built` | `planned`), version and as-is stamp.
- **As-is, never as planned.** A page shows the code at the commit it names. Planned systems
  appear only on supersystem pages, dashed and tagged `Planned` (a level-4 run adds them); a
  system gets its own page when its implementing issue lands.
- Pages are self-contained HTML (inline CSS/JS/SVG, no external resources, light and dark),
  verified in a headless browser before landing. A repository may keep its own template under
  `docs/dashboards/_template/`; a page may diverge from a template when the system is better
  shown another way, recorded on the page and in the presenter's report.
- Dashboards are committed with the work they describe; the README points at `docs/dashboards/`.

## Global Claude config — keep the `.github` mirror in sync

`SpartanLaboratories/.github` holds a public copy of `~/.claude/` under `claude/`; its
`claude/README.md` maps each mirrored path to its source. Whenever your work changes anything
that copy covers — `CLAUDE.md`, `settings.json`, `hooks/`, `agents/`, `skills/` (including
ones a tool installs, e.g. `graphify`), the root `*.md` prompt files (`commands/`), or a
project's auto-memory (`memory/<repo>/`; a project without a folder yet gets one) — update
the copy as part of the same change so it matches `~/.claude/` again.

- Commit straight to `main`; no branch or PR.
- Leave out everything in the README's "Not included" list. The repo is public: check every
  change for secrets before pushing.
- When a third-party skill's license requires redistributions to carry its license files,
  ship them beside the skill in the copy (e.g. `skills/graphify/LICENSE`, `NOTICE`). These
  are the only files allowed to exist in the copy but not in `~/.claude/`.
- Keep `claude/README.md`'s table current when what the copy holds changes.

## Library Design — Open-Ended by Default

**Scope:** every Spartan Labs repo is in scope. `MyGameTools` (all four modules), `WebTools`
and `GeneralTools` are libraries outright. `MyGameServer` and `MyGameClient` currently hold
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
