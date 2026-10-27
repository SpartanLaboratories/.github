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
(`WebTools` and other shared libs) — file a GitHub issue for it without asking first: briefly
describe the problem and proposed fix, and tell me what you filed. Have the `admin team` file
it: send it a `file-issue` request (the `admin-team` skill) against the repo the fix belongs in
(the library where the defect lives, not necessarily the one where it surfaced). Repos move between
these orgs; confirm the current owner with `gh repo view <repo>` if unsure.

## Repository READMEs and CHANGELOGs — keep current

Whenever your work changes what lands on a repository's `master` / `main` branch — a new
command, endpoint, module, dependency, build or run step, protocol change, or architectural
shift — update that repository's `README.md` as part of the same change so it keeps
accurately describing the project. Create a `README.md` if the repo has none. Keep the edit
proportional: a bug fix or internal refactor that doesn't change the project's external
shape needs no README change.

Every repository also keeps a `CHANGELOG.md` in the Keep a Changelog layout. A change that
lands adds its entry (Added, Changed, Fixed, Removed, …) in the same change: under
`## [X.Y.Z] - <date>` when the landing bumps a version, since the version is known by then,
else under `## [Unreleased]`; a repository without one gets one. A comment- or doc-only change
adds no entry. The publisher reads a version's section as its GitHub release notes, and the
notes of a version that ships name any superseded version it includes. In a `/resolve-issue`
run, the Document step writes both the README delta and the entry.

## Work levels

Every issue is sized to one of four **work levels**, recorded by the admin team in its local
state, never on GitHub, and never stated in a committed board or document. The level decides how much planning, implementation, QA and
versioning the work gets; `/resolve-issue` and its agents scale to it.

| Level | What it is | Planning | Built this run? | Version bump |
|-------|------------|----------|-----------------|--------------|
| 1 | **No impact** — comments, KDoc, Markdown docs only. No executable line changes. | none; no plan folder | yes | none |
| 2 | **Small fix** — a bug fix that changes no public API, persisted or shared state, or wire format, and stays local to one component. | short `plan.md` (root cause, fix, regression test) | yes, test-first | `fix:` — MinorChange or trailing letter |
| 3 | **Small feature** — new or changed behaviour inside **one** system: additive public API, a new class or option. | interview, targeted research, one `plan.md` | yes | `feat:` — Feature release, **only with a downstream effect**; otherwise none |
| 4 | **Large feature / roadmap** — anything that spans **more than one** system. | full pipeline up to the architecture; **plan only** | **no** — each system becomes a sub-issue, resolved later at its own level | none (docs only) |

- **The level is re-checked when work starts.** If the issue, or the code it touches, says
  the recorded level is wrong, or none is recorded, propose a level with the evidence and ask
  me. Never re-level silently.
- **Escalate, don't stretch.** When work turns out bigger than its level (a level-1 change
  needs code, a level-2 fix changes public API or state, a level-3 feature needs a second
  system), stop and ask me to re-level it. Never quietly do bigger work under a smaller level.
- A breaking change is never level 1 or 2.
- **A level-3 bump needs a downstream effect.** A level-3 change bumps the version only when a
  consumer of a published artifact would see a difference: its API, behaviour, dependencies, or
  the artifact itself. One with no downstream effect, such as a build, CI or tooling change
  whose published output is identical, moves no version and takes the commit type that fits its
  content (e.g. `build:`).

## Version control — the admin team session

All version control on this machine runs through one long-lived session named **`admin team`**
(brief: `~/.claude/agents/admin-team.md`; protocol: `~/.claude/admin-team/PROTOCOL.md`). It is
the single writer for every repository and for the `.github` mirror: commits, branches, pushes,
PRs, merges, labels, comments, issues, worktrees, the state boards a run asks for in its
Document step, and mirror syncs. Any other session — a `/resolve-issue` run or anything else — sends it requests
with the `admin-team` skill and acts on its replies; it never commits, pushes, merges, labels,
comments or files itself, and never spawns `version-control-manager` directly.

- It schedules by lane (one per repository, plus the mirror), orders by dependency, brings a
  branch up to date with its base when the run's Document step opens (`prepare-landing`, which
  also commits the version bump and reports the code-landing commit), and hands a base that
  moved under a branch's files back to the pipeline to re-verify. It spawns
  `version-control-manager` as the executor of each request.
- **Its one gate** — removing a worktree with uncommitted changes — is confirmed by me at its
  console or in the Remote Control app, never by a relayed approval. Its executor holds every
  GitHub permission as my standing grant: force-pushing, rewriting history and deleting what the
  team did not create need no gate. Filing sub-issues and upstream issues needs no gate either,
  and neither does deleting a stale branch (fully merged into the default branch) with its clean
  worktree, nor writing the team's own state files.
- **Publishing is its own call, not a gate.** Every landing that moves a published module's
  version is a release candidate; the team's `publisher` agent releases it to Maven Central on
  its own (automatic release, then the repo's tag and a GitHub release) within the Central
  budget: 7 release events per namespace per calendar month (one Sonatype organization per
  GitHub organization: `io.github.spartanlaboratories`, `io.github.spartanlabsgaming`), 2 of
  them held for level-2 fixes and `publish: true` landings except in the month's last 3 days.
  What does not fit is deferred and re-evaluated at the next consideration point; a deferred
  version a later landing superseded collapses into the latest. Backlog older than the service
  is mine to publish by hand.
- **Direction is its service too.** Through its `direction-manager` agent (brief:
  `~/.claude/agents/direction-manager.md`) it keeps the direction of the work straight: the
  workflow structure, the organization policies, the direction documents that state them
  (this file, the agent briefs, the skills, the protocol, the root prompt files) and my idea
  hooks. Any session may send it a `log-hook` request for an idea I should revisit; a hook
  changes nothing until I decide it. A direction document changes only through the team, as
  an edit I direct at its console or as the propagation of a decision I have already made
  into the documents that implement it; a new rule is never set without my direction.
- If it is not running, the requesting session launches it with `~/.claude/admin-team/launch.cmd`
  under the launch lock (the skill does this): a minimized, Remote Control-enabled session started
  with `--agent admin-team`. Resume after a restart with `claude --resume "admin team"`.
- Its ledger, state and hooks log (`~/.claude/admin-team/ledger.jsonl`, `state.json`,
  `hooks.jsonl`) are local only and never mirrored.

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

**A fix to an earlier plan's work.** When a level-2 fix corrects code an earlier issue's plan
built, the fix's folder goes inside that issue's folder, as a folded-in issue's would, unless the
fix is a GitHub sub-issue, whose folder follows its own sub-issue chain. Either way, the earlier
issue's `consequences.md` takes the fix's follow-ups and known gaps, each naming the fix; notes
what the fix made no longer current, with a link to the fix; and marks closed, with a link, any
follow-up or known gap the fix closes. These are the only edits a landed document takes.
Otherwise a level-2 fix writes a `consequences.md` only when it leaves a follow-up or known gap.

**An issue folder holds only that issue's resolution:**
- `draft.md`: the draft plan.
- `architecture.md`: the grand design, when the work has one.
- `plan.md`, or one `plan-<unit-slug>.md` per unit when the design decomposes into several.
- `consequences.md`: what the change does to its surroundings and leaves behind: published
  artifacts, blast radius, adoption, sibling units, neighbouring issues, follow-ups, and the
  known gaps the build leaves open, with the outcome of the plan's assumptions and follow-ups
  (each assumption that failed, each follow-up still open) linked back to the plan. Known gaps
  live only here: a plan or architecture has no Known gaps section; what it could not
  establish is an Assumption, and work it leaves undone a Non-goal or follow-up. The planner
  writes it while planning and reconciles it once implementation ends. Issue folders from
  before this convention keep their `impact.md`, read the same.
- `final-implementation.md`: the final as-built record: what was actually built, acceptance,
  measurements, and every deviation from the plan in one section. Each deviation cites the plan
  section it departs from, gives its reasoning, and links secondarily to what that part of the
  plan was based on: the research finding, or the parent architecture section (which gets a
  dated callout when the build changes what it describes). The implementer appends each
  deviation, with its reasoning, the moment it makes it; the planner reconciles the file into
  the final as-built once implementation ends. A research claim the build disproved appears as
  the deviation it caused; one that caused none gets a "did not hold in the build" note in
  `research/README.md`'s verification results.
- **One home per fact.** `final-implementation.md` and `consequences.md` never restate each
  other; one links to the other. No open point is committed open, whatever raised it: before
  the landing each is resolved (by remediation, for a qa finding), or settled as a deviation in
  `final-implementation.md` or as a follow-up or known gap in `consequences.md`.
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

**No internal names in committed content.** Committed documents and boards (plans, research,
architecture, consequences, final-implementation, every board, and the board-event fact texts that
land on them) never name the pipeline's agents, sessions or roles (admin team, planner,
plan-writer, architect, researcher, verifier, interviewer, presenter, publisher, rookie-dev,
version-control-manager or executor, qa, code-reviewer, documentation-reviewer,
test-inspector), never refer to the approval flow ("the user's call", "the user chose", "user
answers"), and never state a work level ("level 3", "a level-4 tracking issue"). The project's
own test levels (Level 2 component, 4a, …) are fine, and so are "the implementer" (whoever
builds the change) and a library's name that only coincides (OkHttp's `RoutePlanner`). The admin
team scans documents, boards and source-code comments, every line of each file a commit
carries (code itself is not scanned). A find blocks the `commit` or `land` that carries it: the admin team commits nothing, names each
`file:line`, and the requester rewords and resends; a find in a board the admin team generates
is the team's to fix.

## Dashboards — state boards and work boards

"Dashboard" is the umbrella for two groups of **boards** (never "pages"): every repository
keeps both, made and maintained by the `presenter` agent as a service of the `admin team`
session (never by a pipeline step — `/resolve-issue` only sends it events and, in its Document
step, the `state-boards` request):

- **State boards** (`docs/dashboards/`): what the code is and does, the current state of each
  system as it is at a named commit; planning is secondary context. The system board, the
  supersystem board and the repository state board, and later the org project board and the
  intra-org dependency board (planned). Built by the admin team on the run's request in its
  Document step, on the branch, stamped at the code-landing commit (the synced, bumped code;
  only documents change after it): the changed system's board, the repository and supersystem
  state boards, `systems.json`, the README pointer, and at level 4 the planned systems drawn
  dashed. The run's document-landing commit carries them, so they land in the same merge; the
  stamp is never written into the merge commit.
- **Work boards** (`docs/plans/`): how the work is going. The issue board
  (`docs/plans/<issue>-<slug>/dashboard.html`), the tracking board (a tracking issue's issue
  board), the repository work board (`docs/plans/index.html`), and later the org work board
  (planned). An issue board's foundation is created
  at the start of a level 2–4 `/resolve-issue` run and kept up at every step transition to show
  the current work in progress; it records the gap, the options considered (accepted green,
  declined red, partial yellow), the verdict and the as-built state, with the cell being worked
  on glowing. It is a general representation with little code; `plan.md` and
  `final-implementation.md` keep the details beside it. Board updates run in real time in the
  admin team's own board lanes and commit nothing; an issue board is committed by its
  landing. After the merge the admin team shows the landed state for viewing only, in the
  git-ignored live view; nothing is left uncommitted. The next run in that repository carries
  that landed state (the issue board's `landed` with its merge commit, the tracking board's
  unit landed and next up, the repository work board) onto its branch when it is sized, and
  it lands with it; there is never a follow-up docs PR. The repository work board on the
  default branch changes only at landings; between them its live view is a local, git-ignored
  copy in `docs/plans/.live/`.

The `dashboards` skill holds the shared guidance (`GUIDANCE.md`, colour coding first), one
ruleset per set, the templates and the checks.

- **One system board per system**, `docs/dashboards/<system-slug>/index.html`: its function first, in
  six core tabs (structure, C4 model, threads, decision path, sequence, lifecycles), then a
  section headed **Context** (never labelled "secondary"): the roadmap, each item listing the
  issues mapped to it; the unscheduled issues no roadmap item claims; and the plans. Beside it,
  `workspace.dsl` — the Structurizr C4 model of the system, embedded verbatim in the board, which
  renders its C4 views from it.
- **Supersystem boards and the repository state board** bind systems together and show how they interact:
  `docs/dashboards/<supersystem-slug>/index.html` for a group of systems, and
  `docs/dashboards/index.html` for the repository. They carry a Systems tab and the same six
  core tabs, adapted to their level, and are refreshed on every run.
- **Tabs.** Optional tabs (the skill lists candidates; others at the presenter's discretion) are
  added wherever content for them exists. Every tab colours its content by a grouping that suits
  it and shows a legend for it; Planned is dashed on every tab.
- **Guarantees.** Every state board carries a Guarantees area below the tabs and above Context, made of
  named guarantee cards: failure model, extension points, test levels, compatibility & versioning,
  thread safety, resources to close, and what lands on a consumer's classpath — plus any other
  that fits. On supersystem and repository state boards each guarantee card covers every system.
- **`docs/dashboards/systems.json`** is the registry: every system, its slug, function, code
  paths, parent, status (`built` | `planned`), version and as-is stamp.
- **As-is, never as planned.** A state board shows the code at the commit it names. Planned systems
  appear only on supersystem boards, dashed and tagged `Planned` (a level-4 run adds them); a
  system gets its own board when its implementing issue lands.
- Boards are self-contained HTML (inline CSS/JS/SVG, no external resources, light and dark),
  verified in a headless browser before landing. A repository may keep its own template under
  `docs/dashboards/_template/`, and a board may diverge from a template when the system is better
  shown another way. A divergence should primarily add; removing content, a core tab included,
  needs a strong argument, such as no data for it existing. Either is recorded on the board and
  in the presenter's report.
- Dashboards are committed with the work they describe; the README points at `docs/dashboards/`.
- **The presenter fixes dashboard defects at its own discretion**, without asking — on any board
  and in the `dashboards` skill's templates, examples and scripts — and reports each skill fix
  so the `.github` mirror is synced. Changing the conventions themselves stays my call. When a
  convention changes, existing dashboards may be brought up to it; the update needs no commit or
  PR of its own and rides the repository's next commit.

## Global Claude config — keep the `.github` mirror in sync

`SpartanLaboratories/.github` holds a public copy of `~/.claude/` under `claude/`; its
`claude/README.md` maps each mirrored path to its source. Whenever your work changes anything
that copy covers — `CLAUDE.md`, `settings.json`, `hooks/`, `agents/`, `skills/` (including
ones a tool installs, e.g. `graphify`), or the root `*.md` prompt files (`commands/`) — have the
copy updated as part of the same change so it matches `~/.claude/` again: send the `admin team`
session a `mirror-sync` request naming the changed paths (the `admin-team` skill), and it
copies, scans and pushes.

- Commit straight to `main`; no branch or PR.
- Never sync project auto-memory (`projects/*/memory/`): it is not mirrored.
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

**Run only the tests that exercise the change.** Never run a test suite that belongs only to a
module the change leaves untouched — not to check a change, not to take a baseline, not in a
QA gate. A module whose code is untouched (say, only its build file moved onto shared build
logic) is proven unaffected by other means, such as identical published output; the tests of a
module that depends on the changed code do exercise it and still run.

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
