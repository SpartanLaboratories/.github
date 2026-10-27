---
name: resolve-issue
description: >-
  Work the oldest open GitHub issue in the current repo toward resolution, or
  pass a specific issue number to work that one. Sizes the issue to a work
  level (its level as the admin team records it, re-checked against the issue and the code) and
  scales the pipeline to it: a level-1 doc/comment change skips planning, a
  level-2 small fix gets a short test-first plan, a level-3 small feature gets
  the interview-research-plan pipeline, and level-4 multi-system work is
  planned to the architecture only and split into sub-issues, with nothing
  built. After QA, a Document step reconciles the documentation, the plan's
  as-built record, the README and the CHANGELOG, and has the repository's
  state boards (docs/dashboards/) built to show what was built, or what is
  planned, as such. The admin team handles version control autonomously, releases every
  version-bumping landing to Maven Central within its monthly budget, stops only
  at its gates - a history rewrite, deleting what it did not create - and reports
  downstream-consumer coordination rather than filing it. Use to
  make steady, reviewed progress through the issue backlog one issue at a time.
  Named on a planned tracking issue (a roadmap or other `type: tracking` issue
  with sub-issues), it works that issue's sub-issues: the next unblocked one by
  default, all of them in landing order with `consecutive`, or every unblocked
  one at once with `concurrent`.
argument-hint: "[issue-number] [consecutive|concurrent]"
disable-model-invocation: true
allowed-tools: Bash(gh issue list *), Bash(gh issue view *), Bash(gh pr list *), Bash(gh repo view *), Bash(git status *), Bash(git log *), Bash(git branch *), Bash(git diff *)
---

Work **one** GitHub issue toward resolution using the project's agents — or,
named on a planned tracking issue, its sub-issues (see "Tracking issues and run
modes"). Follow the steps in order. Within a run, wait for each spawned agent to
finish before starting the next. All version control runs through the
**`admin team` session**: load the `admin-team` skill and send it requests
(it launches the team if it is not running). The team's executor acts
autonomously except at the team's gates — a history rewrite, deleting what
it did not create — which the user confirms at the team's console; a **Maven
publish** is the team's own decision within its monthly budget, never yours
to ask for; a **downstream-consumer issue** is never filed (reported
instead), and **sub-issues** are filed only from a list the user approved. You
yourself never commit, push, merge, tag, publish, label, or file/comment on an
issue, and never spawn `version-control-manager`.

The work levels are defined in "Work levels" in the global `CLAUDE.md`. This
skill runs a different pipeline per level:

| Step | Level 1 — no impact | Level 2 — small fix | Level 3 — small feature | Level 4 — multi-system |
|------|---------------------|---------------------|-------------------------|------------------------|
| 2. Plan | skipped | `planner` (level 2, Sonnet) | `planner` (level 3) | `planner` (level 4) |
| 3. Branch | `admin team`: `setup-branch` | `admin team`: `setup-branch` | `admin team`: `setup-branch` | `admin team`: `setup-branch` |
| 4. Implement | `rookie-dev` from the issue text | `rookie-dev`, test-first | `rookie-dev` | **skipped** |
| 5. QA | `qa level:1` | `qa level:2` | `qa level:3` | **skipped** |
| 6. Document | `admin team`: `prepare-landing` (sync, no bump); documentation review and reconcile; Dokka check; README only; `admin team`: `state-boards` | `admin team`: `prepare-landing` (sync, fix bump); documentation review and reconcile; Dokka check; `planner` reconciles the plan; README and CHANGELOG; `admin team`: `state-boards` | `admin team`: `prepare-landing` (sync, feature bump only with a downstream effect); documentation review and reconcile; Dokka check; `planner` reconciles the plan; README and CHANGELOG; `admin team`: `state-boards` | `admin team`: `prepare-landing` (sync, no bump); architecture and `consequences.md` confirmed final; `admin team`: `state-boards` draws the planned systems |
| 7. Land | `admin team`: `land` | `admin team`: `land` | `admin team`: `land` | `admin team`: `land` (docs PR with `Refs`) then `file-sub-issues` |

**No internal names in committed content.** Every document and board this run commits (plans,
research, architecture, `consequences.md`, `final-implementation.md`, the issue board) never names
the pipeline's agents, sessions or roles (admin team, planner, plan-writer, architect,
researcher, verifier, interviewer, presenter, publisher, rookie-dev, version-control-manager or
executor, qa, code-reviewer, documentation-reviewer, test-inspector), never refers to the
approval flow ("the user's call", "the user chose", "user answers"), and never states a work
level ("level 3", "a level-4 tracking issue"). That covers the text you send in `plan-board`
facts (`detail`, `open`, `questions`, `reason`), which lands on the committed issue board. The
project's own test levels (Level 2 component, 4a, …), "the implementer" (whoever builds the
change) and a library's name that only coincides (OkHttp's `RoutePlanner`) are fine. Carry the
rule in every brief to an agent that writes a document. A `commit` whose content breaks it
(the document-landing commit of step 6 included) is blocked: the team commits nothing and
replies `needs-rework` with `result.finds` (`file:line`); reword each find and resend the same
`id` with `attempt + 1`.

## 1. Pick and size the issue

- Repo: `gh repo view --json nameWithOwner -q .nameWithOwner`.
- **Target:** `$ARGUMENTS` is an optional issue number and an optional mode
  word, `consecutive` or `concurrent`. If the number names a **planned
  tracking issue**, or a mode word is given, see "Tracking issues and run
  modes" below. If `$ARGUMENTS` is any other issue number, that is the issue.
  Otherwise list open issues oldest-first —
  `gh issue list --repo <repo> --state open --json number,title,createdAt,labels,url --limit 200 --jq 'sort_by(.createdAt)'`
  — and take the earliest one that is **not** labelled `blocked`, `wontfix`,
  `duplicate`, `question`, or `type: tracking` and, as far as the issue timeline
  shows, has no open PR already addressing it. If you skip the oldest for one of
  those reasons, say which and why, then take the next.
- If there are no open issues, say so and stop.
- Read the chosen issue in full: `gh issue view <n> --repo <repo> --comments`.
  An issue that is only partly done (an earlier tier/stage landed, more is
  open) still counts — this run's goal is the **next step**, not necessarily
  the whole issue.
- **Size it.** Ask the admin team for the issue's recorded level (a `status`
  request naming the issue; levels are kept in its local state, never on GitHub),
  then re-check it yourself
  against the issue text and the code it names: which files and systems it
  touches, whether it changes executable code at all, public API, persisted or
  shared state, or a wire format, and whether it spans more than one system.
  Settle on a level with that evidence, one line per point.
- Tell the user the issue number, title, the **level** (label and your check),
  and a one-line statement of what you intend to do this run, and **confirm
  before proceeding** — this run creates branches and commits and posts a
  comment. If the label is **missing** or your check **disagrees** with it, say
  so plainly with the evidence and ask which level to use; never pick for the
  user. The confirmed level is the run's level.
- Check `git status` is clean. If it is not, stop and ask the user to settle
  the working tree first.

## Tracking issues and run modes

A **planned tracking issue** is an open issue labelled `type: tracking` (a
roadmap or a level-4 plan) that has open sub-issues. A tracking issue with no
sub-issues yet is not planned: work it as an ordinary issue, at its level.

- **Order.** The landing order comes from the sub-issues' *blocked by* links;
  ties keep the order of the tracking issue's sub-issue list. A sub-issue is
  **unblocked** when every issue blocking it is closed. Read both with
  `gh issue view <n> --json subIssues,blockedBy` (the GraphQL `subIssues` and
  `blockedBy` connections).
- **`/resolve-issue <n>`** on a planned tracking issue: run steps 1–8 on its
  **next** unblocked sub-issue in landing order — one sub-issue, one run.
- **`/resolve-issue <n> consecutive`**: run steps 1–8 on every open sub-issue in
  landing order, one after another. Each lands before the next one starts.
- **`/resolve-issue <n> concurrent`**: start steps 1–8 at once on every open,
  unblocked sub-issue. Whenever one lands, start every sub-issue it unblocked.
  Keep going until every sub-issue is done.
- **A mode word with no number** takes the oldest open planned tracking issue.
- **Nested plans.** A sub-issue that is itself a planned tracking issue is
  expanded into its own sub-issues, in the same mode. A sub-issue that turns
  out to be level 4 is planned as usual; once the user approves its sub-issues
  and they are filed, they take its place in the chain.
- **Isolation.** `consecutive` works in the main checkout, one sub-issue at a
  time. `concurrent` gives each in-flight sub-issue its own git worktree: an
  `allocate-worktree` request to the admin team, whose reply carries the path
  (a short one — Windows' 260-character path limit breaks deep repos under
  long paths), passed as the repo to every agent of that run. The team removes
  the worktree once the run lands.
- **Landing one at a time** is the admin team's job: its lane lands one
  change set at a time, brings each branch up to date with `master` when the
  run's Document step opens (`prepare-landing`), and checks the base has not
  moved again before each merge. The state boards and README are brought up to
  date on the branch in the Document step, not inside the land. A
  `needs-rework` reply means the base moved under the run's files, or its
  content names the pipeline or a work level: re-verify or reword per the
  skill and resend.
- **Halts.** When one run stops for the user — a planner halt, an escalation,
  a `qa` failure, a `version-control-manager` "needs you" item — only what depends on it waits.
  `consecutive` waits at that sub-issue; `concurrent` keeps running every
  sub-issue that does not depend on it and starts nothing it blocks until it
  lands. Ask the user's questions one at a time, each saying which sub-issue
  it is for.
- **Per sub-issue,** steps 1–8 apply unchanged, including the level re-check:
  a label the check disagrees with is still the user's call. Invoking a mode
  is the user's go-ahead for every run in the chain, so no per-issue
  "shall I proceed".
- **Report** each sub-issue's step 8 as it lands. When the chain ends or
  everything left is waiting on the user, add a chain summary: what landed,
  what is in flight, what waits and on what, and what remains.

## Escalation — at any step

Any agent may report `ESCALATE — level`: the work is bigger than its level (a
level-1 change needs code, a level-2 fix changes public API or state, a level-3
feature needs a second system). When one does, **stop**, relay the evidence and
the level it proposes, and ask the user. On a new level, resume from step 2 at
that level, carrying forward whatever is still valid (the branch, any plan).
Never finish bigger work under a smaller level, and never re-level without the
user. The same applies to the **diff check** in step 4.

## 2. Plan — `planner`  (levels 2–4)

**Level 1 skips this step.** The issue text is the spec.

Spawn `planner` with the repo-qualified issue reference (`<owner>/<repo>#<n>`),
the issue text, and the confirmed **work level**. For level 2, pass
`model: "sonnet"`; levels 3 and 4 use the planner's own model. The planner
scales its pipeline to the level (see `planner.md`, "Work levels") and writes
into the issue's folder under `docs/plans/` (see "Planning documents — folder
layout" in the global `CLAUDE.md`).

A **level-3 sub-issue of a level-4 plan** gets the planner's detailed re-pass:
pass the parent issue reference and the path to its `architecture.md`. The
planner re-validates the unit's slice against the code as it is now, including
siblings that have landed, and writes a full implementation plan; steps 3–7
then implement it in the same run as for any level-3 issue. A re-pass that
finds the parent architecture no longer fits halts with a proposed amendment —
relay it to the user and wait.

**`planner` halts and hands work back to you.** Its report leads with one of
these shapes; route on it:

- **`HALT — interview`** — it has questions about the user's intent that must
  be answered before any design happens. Relay the question list to the user
  **verbatim**, with the recommendations attached, and wait. Never answer on
  the user's behalf, and never pick the recommended option to keep things
  moving. Once the user answers, **resume the same planner** with
  `SendMessage` (its context is intact) carrying the answers — do not spawn a
  fresh `planner`, which would lose the interview and the research.
- **`HALT — research`** — research overturned an answer or raised a new
  decision. Relay it as for the interview and resume the same planner.
- **`HALT — architecture`** (level 4) — the grand design needs sign-off. Relay
  the architecture document path, the decomposition, the proposed sub-issues,
  and any open decisions; wait for the user to approve or ask for changes; then
  resume the same planner with `SendMessage`.
- **`ESCALATE — level`** — see "Escalation" above.
- **`COMPLETE`** — the plan is drafted (levels 2–3), or the architecture is
  signed off and the sub-issue list is final (level 4). Continue to step 3.

A halt is not a failure and not a reason to fill in the gap yourself.

Always run this step for the issue at hand, even when a **broader/epic plan**
already exists that covers it as one item among several (e.g. a phase/epic
plan listing issues #46–#50). That parent plan is input for `planner`, not a
substitute for an issue-specific plan — pass it along as context, but still
have `planner` produce a plan for this issue's own scope at this issue's level.

If instead an **issue-specific plan document already exists** for this exact
issue (its own doc, scoped to just this issue, not a multi-issue epic plan),
do not have `planner` redo the design from scratch. Spawn `planner` to
**verify** the existing draft instead: re-check its factual/codebase claims
against current `master` and sanity-check its design decisions, then report a
verdict plus any concrete additions or modifications — not a rewritten plan
document. Only fall back to a full replan if verification turns up the draft
being unsound or badly stale.

When this verification pass comes back with recommended additions or
modifications, **relay them to the user and wait for a decision before**
**having anything applied to the plan document.** Do not have `planner` (or
anyone) edit the plan file on the strength of its own recommendation alone —
the user may accept a delta, reject it in favor of an existing convention, or
want it applied differently. Only after the user decides, resume `planner`
to make the agreed edit.

- If the returned **Considerations** list is non-empty, **stop**: relay it to
  the user and wait. Do not guess a design.
- Otherwise keep the plan document path (levels 2–3), or the architecture
  document path and the approved sub-issue list (level 4), plus the recommended
  approach.

## 3. Branch — `admin team`: `setup-branch`

Send the admin team a `setup-branch` request (the `admin-team` skill) with the
issue reference, the **work level**, the plan document (if any), the note "set
up the branch only, and record the confirmed
level if it differs", and — for levels 3–4 — the research commit SHAs
`planner` reported, which are the only commits so far. The team's executor
creates the topic branch. Carry forward the branch name and base its `done`
reply reports.

**Level 4:** go straight to step 6 (Document): its `prepare-landing` sync (no
bump), the confirmation that the architecture and `consequences.md` are final,
and its `state-boards` task, which draws the planned systems dashed.

## 4. Implement — `rookie-dev`  (levels 1–3)

- **Level 1:** spawn `rookie-dev` with the issue text as its spec, the work
  level, and "comment and documentation changes only — no executable line may
  change; if the issue needs one, stop and report `ESCALATE — level`; commit
  nothing".
- **Level 2:** spawn `rookie-dev` with the plan document path, the work level,
  and "implement it on the current branch, **test-first**: write the regression
  test, run it and record it failing, then fix; commit nothing".
- **Level 3:** spawn `rookie-dev` with the plan document path, the work level,
  and "implement it on the current branch; commit nothing".

Then:

- If its report has a **Not done / blocked** list, **stop**: relay it and offer
  the user either one `planner` re-pass to resolve the gap or to hand back as
  is. Do not fill in the missing design yourself.
- If it reports `ESCALATE — level`, see "Escalation".
- **Diff check.** Run `git diff <base-branch> --stat` and read the diff against
  the level: level 1 touches only comments, KDoc and Markdown; level 2 changes
  no public signature, persisted or shared state, or wire format, and stays in
  one component; level 3 stays inside one system. If the diff crosses its
  level, **stop and ask the user** with the evidence, as for an escalation.

## 5. QA — `qa`  (levels 1–3)

Spawn `qa` with `level:<N>` over the change set (`git diff <base-branch>...HEAD`
plus untracked files), the plan document path (or, for level 1, the issue text)
and, for level 2, `rookie-dev`'s recorded fail-before/pass-after test run. QA
gates the **tests and the code** only — the test-inspector and the code-reviewer
(level 1: the code-reviewer alone, checking that the diff is comments and
documentation only and matches the issue); documentation is reviewed in step 6.
Keep its gate verdict, the test-inspector **Test run** block, the code review,
and the path to the visual test report.

- **PASS** -> step 6.
- **CHANGES REQUESTED, every fix minor** — each is easily made and has no
  fallout: a misplaced or misnamed test, a small mechanical code fix that
  changes no behaviour, public API or design. Fix them on the spot (a short
  `rookie-dev` pass), record what was fixed for step 8, and go on to step 6
  **without another `qa` pass**.
- **CHANGES REQUESTED, otherwise** -> do a remediation pass: `rookie-dev` for a
  code or test gap; `planner` then `rookie-dev` if the plan itself is wrong.
  When the plan re-pass gates only part of the fixes, split them: the fixes
  the re-pass could change wait for it, and the rest go to `rookie-dev` at
  once, beside the re-pass (the board shows both sub-steps current). Judge
  the split each time; when in doubt, a fix waits.
  Then re-run `qa`, without asking the user. **At most three `qa` passes** in
  all, so at most two remediation loops; a pass whose fixes are all minor ends
  the loop as above. If the third pass still fails, stop and hand the user the
  findings, the report path, and the branch as it stands.

## 6. Document  (every level)

Runs after the last `qa` verdict — `PASS`, or `CHANGES REQUESTED` with every
fix minor and fixed on the spot — and at level 4 straight after step 3. From
its first task on, only documents change on the branch. Report it on the issue
board with the `document` event (see "Plan-board events" below): send it when
the step starts and at every task change, with `tasks` listing every task's id,
name and state. The tasks, in this order (the levels that skip one are named
on it):

0. **Open — `admin team`: `prepare-landing`.** Send a `prepare-landing` request
   (the `admin-team` skill) with the fields a `land` carries: the issue, the
   **work level**, the branch and worktree, the change set (`paths`), the `qa`
   verdict (`NONE` for level 4), `publish` (true only if the user asked for a
   publish this run) and the versions. The team's executor commits the change
   set, syncs the branch with its base (a merge, the repository's way), decides
   and commits the version bump the level calls for (none at levels 1 and 4),
   and replies `done` with the head sha — the **code-landing commit** — and the
   version it bumped to, if any. Carry both forward: every state board is
   stamped at the sha, and task 5 files the CHANGELOG entry under the version.
   A `needs-rework` reply means the base moved under the branch's files
   (`result.overlap`): re-verify with the change's own tests (the
   test-inspector's run), and `qa` if the overlap touches code the change
   altered, fix what breaks, then resend the same `id` with `attempt + 1` and
   the fresh `qa` verdict.
1. **Documentation review** (levels 1–3). Spawn `documentation-reviewer` over
   the change set (`git diff <base-branch>...HEAD`). It reports findings only;
   keep its report.
2. **Reconcile documentation** (levels 1–3). Spawn `rookie-dev` for a short
   pass that applies the findings to the inline documentation (KDoc, line
   comments) and to any document the findings name, changing **no behaviour,
   API or test**. Then spawn `documentation-reviewer` once more. Findings left
   after that second review are fixed on the spot (a short `rookie-dev` pass,
   or wording directly) with no further review.
3. **Dokka check** (levels 1–3, only where the repository applies the
   `org.jetbrains.dokka` plugin in a build file or convention plugin — today
   MyGameTools does, with Dokka 2 in its V2 plugin mode; WebTools, GeneralTools
   and MyGameServer do not). Run the repository's Dokka task — `dokkaGenerate`
   (or the `dokkaGeneratePublicationHtml` the repository's CI runs) under
   Dokka 2, `dokkaHtml` under Dokka 1. It must complete cleanly: no warnings,
   none about undocumented public API or unresolved KDoc links among them.
   Nothing from it is committed; its output is build output. A failure goes
   back to task 2, then the check runs again.
4. **Reconcile plan** (levels 2–4). Resume the **same `planner`** with
   `SendMessage` (its context is intact) to reconcile the plan with the build,
   per its "When resumed in the Document step's reconcile-plan task"
   paragraph: `final-implementation.md` (every deviation from the plan, with its
   secondary links), `consequences.md` (the known gaps the build leaves open,
   the outcome of the plan's assumptions and follow-ups, the sibling units), the
   earlier plan's `consequences.md` for a fix to earlier work, the parent's link
   line for a sub-issue, the "did not hold in the build" notes in
   `research/README.md`, and every open point this run raised settled — as a
   deviation in `final-implementation.md`, or as a follow-up or known gap in
   `consequences.md`. **No open point is committed open**, whatever raised it.
   At **level 4** the planner wrote `consequences.md` at sign-off; the task only
   confirms the architecture and `consequences.md` are final.
5. **README and CHANGELOG** (levels 1–3). Spawn `rookie-dev` for a short pass
   from the plan's **Documentation impact** section and the as-built record
   (`final-implementation.md`): the README delta the global "Repository READMEs
   — keep current" rule calls for, proportional (none when the change leaves
   the project's external shape as it was), and a CHANGELOG entry in the Keep a
   Changelog layout (`### Added` / `### Changed` / `### Fixed` / `### Removed`
   / `### Deprecated` / `### Security`) — under `## [X.Y.Z] - <date>` when
   `prepare-landing` bumped a version (pass `rookie-dev` the version from its
   `done` reply), else under `## [Unreleased]` — creating `CHANGELOG.md` if the
   repository has none. **Level 1** updates the README only, no CHANGELOG
   entry.
6. **State boards — `admin team`: `state-boards`.** Send a `state-boards`
   request with the issue, the **work level**, the branch and worktree, the
   systems the change touched and the code-landing sha. The team's presenter
   builds, on the branch: the changed systems' state boards as built, the
   supersystem and repository state boards, `systems.json`, the README's
   dashboard pointer, the template splice, the tracking board re-embed and the
   repository work board, all stamped "as-is at `<branch>` @ `<code-landing
   sha>`"; at level 4 the planned systems drawn dashed. The team raises the
   issue board's `state-boards` step itself and replies `done` with the paths.
   A reply reporting `BLOCKED — system unresolved`: **stop** and ask the user
   which system the work belongs to; resend the same `id` with `attempt + 1`
   and the answer.

Then the **document-landing commit**: send a `commit` request carrying every
document the step wrote or changed (the reconciled plan documents, the README
and CHANGELOG), the issue's board files, its tracking board's, the repository
work board and the state-board files; the executor splits them per its
guidelines, `docs:` type. Its `done` reply's sha is the **document-landing
commit**. A `needs-rework` with `result.finds` means a file names the pipeline
or a work level: reword each `file:line` (or have the agent that wrote it
reword it) and resend the same `id` with `attempt + 1`. Then step 7.

The presenter is not a pipeline step: it runs as a service of the `admin team`
session, building the state boards on the run's `state-boards` request (task 6)
and keeping the **issue board** true from the `plan-board` events you send at
each step transition (see "Plan-board events" below).

## Plan-board events  (levels 2–4, every run)

At each of these moments send the admin team a `plan-board` request (the
`admin-team` skill; fire-and-forget) with the `event` and the facts you have.
The presenter keeps the issue's board — `docs/plans/<…>/<issue>-<slug>/dashboard.html`
— and the repository work board true from it. Level 1 has no plan folder and
sends none.

| Moment | `event` | Facts |
|--------|---------|-------|
| Step 1 sized (the run's first action after sizing) | `sized` | level, baseline sha, the issue's systems if known, the next step |
| A planner halt, a `needs-user` reply, a qa stop | `halted` | what waits on the user; for interview questions, `questions`: each question's text (and its options, if any); then `resumed` with the answer's gist |
| Research questions being drafted (sent by the planner itself) | `research-planning` | `drafted`: questions drafted so far |
| A research batch spawned (sent by the planner itself) | `research-started` | `researching`: per question, its slug and the board row ids it bears on (`[]` for none) |
| A researcher returned (sent by the planner itself) | `research-returned` | `returned`: the question slug and its findings path |
| Verification of the findings starts (sent by the planner itself) | `verification-started` | — |
| Research verified | `researched` | the research README path |
| Level-4 sign-off | `architecture-signed-off` | the architecture path, the approved unit list |
| Planner COMPLETE | `plan-accepted` | the plan path, consequences path |
| Step 3 done | `branch-cut` | branch, worktree |
| Each rookie-dev report | `implementation-stage` | the stage, `stages`: every stage's id and name with its state (`done`, `current`, `todo`), `final-implementation.md` path, deviations; during a remediation loop also `remediation`: the qa pass it answers, the route (`on-the-spot` / `remediation` / `re-plan-then-remediation`) and its sub-steps with their state; `tests`: the test classes the stage added or amended (`added`/`amended`: class, module, testLevel, path, tests, rows) |
| Each qa verdict | `qa-pass` | pass number, verdict, finding counts by kind (test, code) and by `severity` (`minor` — easily made, no fallout — and `other`), the route step 5 takes from them, `rows`: the board row ids the findings touch, report path; `tests`: what the qa run ran (`ran`: class, module, passed, failed, skipped) and the counts of the untouched modules' tests (`other.byModule`) from the test-inspector report |
| Step 6 starts, and each task change in it | `document` | `tasks`: every task's id and name with its state (`done`, `current`, `todo`), like `implementation-stage`'s `stages` — ids `documentation-review`, `reconcile-documentation`, `dokka-check`, `reconcile-plan`, `readme-changelog`, `state-boards`; once `prepare-landing` replied, the code-landing sha |
| An escalation | `escalated` | the proposed level and evidence |
| The run is abandoned | `cancelled` | the reason |

**Progress reviews.** Every agent in this run's tree writes a progress note every 10 minutes
it runs (its agent file, "Progress review every 10 minutes"):
`docs/plans/.live/progress/<issue>/<name>.js` in the checkout, git-ignored, deleted when the
agent finishes. The board's step panel shows the notes live; they need no event. When you
brief a subagent, give it the issue number so it can name the file.

On **every** event also send `at` (the ISO time the moment happened, so a queued
event keeps its true time), and `open` whenever an open point is raised or
resolved: `[{text, raised, ref?, resolved?}]` — e.g. a plan inconsistency the
implementer raises for the planner, or an item left to the maintainer. During a
remediation loop, `implementation-stage` also carries `rows`: the board row ids
the fixes touch.

The team raises the issue board's `state-boards` step itself inside the
`state-boards` request of step 6, and `landed` itself inside `land`; the
board's landing steps are `landing → merge → landed`. When the presenter fixes
a defect in the `dashboards` skill during any of this, the team syncs those
files to the `.github` mirror itself; step 8 mentions them if the `done`
reply lists them.

**Boards at the start of a run.** When a run is sized, the team seeds its
boards with the previous landing's landed state — the parent tracking board
(its unit landed, the next one up) and the previously landed sibling's issue
board as `landed` — from the main checkout's live view, so the run's branch
carries them and they ride its document-landing commit. There is no separate
corrections work in any landing.

## 7. Land it — `admin team`: `land`

The change set is already committed: the code-landing commit (step 6, task 0)
and the document-landing commit (end of step 6). Send the admin team a `land`
request with the **work level**, the branch and worktree, the code-landing and
document-landing shas, the `qa` verdict (`NONE` for level 4), the plan or
architecture document, every `.md` file created or updated this run (for the
resolution comment's links), and `publish: true` only if **the user asked for a
publish this run** (it lets the release use the budget's reserve; every
version-bumping landing is considered for release regardless). The team:
checks the base has not moved since the `prepare-landing` sync (if it has, it
re-syncs; `needs-rework` on overlap; when the new changes touch a system the
boards cover, the `state-boards` task of step 6 runs again and its files are
committed before the merge); opens the PR; merges; posts the
**issue-resolution comment** (steps taken + links to any plan/design docs); files
an upstream issue if the work exposed one; deletes the branch and any worktree
it allocated; considers the release — its publisher releases a moved
published-module version to Maven Central when the monthly budget allows
(`result.release` in the reply: `published`, `deferred`, `failed` or `none`);
and shows the landed state in the live view. No board commit and no version
bump happen in the land any more. Wait for the reply: a `needs-rework` means
the base moved under the run's files — re-verify and resend the same `id` with
`attempt + 1`; a `needs-user` means a gate is waiting on the user at the
team's console.

**Level 4** lands the planning documents only: a `docs:` PR that says
`Refs #<n>` — never `Closes` — and no version bump. After the `done` reply,
send a `file-sub-issues` request with the **user-approved** list: the team
files each as a sub-issue of this issue, records its proposed level in its own state (never on GitHub), and
its landing-order dependencies as *blocked by* links, and labels this issue
`type: tracking`. The issue stays open. If the user has not approved the list,
send nothing and the list goes back to the user.

- Relay the `done` reply's **result** as-is.
- Surface a `needs-user` reply to the user: a gate waits at the team's
  console. A failed publish is put to the user there too (`result.release`).
  Any downstream-consumer coordination the executor flagged rather than filed
  is in the result.
- Do not re-run or second-guess the team's completed steps.

## 8. Report

- The issue, its **work level**, and whether it is now **resolved**, a **step
  taken** (with what remains), or — level 4 — **planned**, with the sub-issues
  filed and their levels.
- The plan or architecture document and any other `.md` files, with their
  merged links.
- The `qa` verdict, the code review's verdict, and the visual test-report path.
- The documentation review's final verdict, the Dokka check's result where it
  ran, and the README and CHANGELOG changes (or that none was needed).
- The code-landing and document-landing commits, by sha.
- The dashboards `presenter` created or updated, with their merged links, and
  anything it reported as not shown.
- The commits / PR / merge / issue comment that landed, by reference, and any
  upstream issue `version-control-manager` filed.
- The release outcome from `result.release`: published (coordinates, tags,
  release URLs), deferred (reason and the month's usage), failed, or none.
- Anything handed back to the user: `rookie-dev` blockers, escalations,
  unresolved planner open decisions, and `version-control-manager`'s **Stopped — needs you**
  items (a failed publish, downstream-consumer coordination).
- If the work exposed a defect in a repo the project *consumes* (downstream),
  report it as coordination — do not file it. `version-control-manager` files upstream-only.

Do not start a second issue. One issue per `/resolve-issue` — except in the
`consecutive` and `concurrent` modes above, which work every sub-issue of one
planned tracking issue.
