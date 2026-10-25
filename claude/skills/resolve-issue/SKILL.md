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
  built. Before landing, the presenter agent updates the repository's system
  dashboards (docs/dashboards/) to show what was built, or what is planned,
  as such. The admin team handles version control autonomously, releases every
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
issue, and never spawn `manager`.

The work levels are defined in "Work levels" in the global `CLAUDE.md`. This
skill runs a different pipeline per level:

| Step | Level 1 — no impact | Level 2 — small fix | Level 3 — small feature | Level 4 — multi-system |
|------|---------------------|---------------------|-------------------------|------------------------|
| 2. Plan | skipped | `planner` (level 2, Sonnet) | `planner` (level 3) | `planner` (level 4) |
| 3. Branch | `admin team`: `setup-branch` | `admin team`: `setup-branch` | `admin team`: `setup-branch` | `admin team`: `setup-branch` |
| 4. Implement | `rookie-dev` from the issue text | `rookie-dev`, test-first | `rookie-dev` | **skipped** |
| 5. Check | `qa level:1` | `qa level:2` | `qa level:3` | **skipped** |
| 5b. Present | **skipped** | **skipped** — the admin team's landing refresh | **skipped** — the admin team's landing refresh | **skipped** — the landing refresh draws the planned systems |
| 6. Land | `admin team`: `land`, no bump | `admin team`: `land`, fix bump | `admin team`: `land`, feature bump only with a downstream effect | `admin team`: `land` (docs PR with `Refs`) then `file-sub-issues` |

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
- **`/resolve-issue <n>`** on a planned tracking issue: run steps 1–7 on its
  **next** unblocked sub-issue in landing order — one sub-issue, one run.
- **`/resolve-issue <n> consecutive`**: run steps 1–7 on every open sub-issue in
  landing order, one after another. Each lands before the next one starts.
- **`/resolve-issue <n> concurrent`**: start steps 1–7 at once on every open,
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
  change set at a time, brings each branch up to date with `master` first, and
  refreshes the shared dashboards and README after each merge. A
  `needs-rework` reply means the base moved under the run's files: re-verify
  per the skill and resend.
- **Halts.** When one run stops for the user — a planner halt, an escalation,
  a `qa` failure, a `manager` "needs you" item — only what depends on it waits.
  `consecutive` waits at that sub-issue; `concurrent` keeps running every
  sub-issue that does not depend on it and starts nothing it blocks until it
  lands. Ask the user's questions one at a time, each saying which sub-issue
  it is for.
- **Per sub-issue,** steps 1–7 apply unchanged, including the level re-check:
  a label the check disagrees with is still the user's call. Invoking a mode
  is the user's go-ahead for every run in the chain, so no per-issue
  "shall I proceed".
- **Report** each sub-issue's step 7 as it lands. When the chain ends or
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
siblings that have landed, and writes a full implementation plan; steps 3–6
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

**Level 4:** go straight to step 6; the landing refresh draws the planned
systems.

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

## 5. Check — `qa`  (levels 1–3)

Spawn `qa` with `level:<N>` over the change set (`git diff <base-branch>...HEAD`
plus untracked files), the plan document path (or, for level 1, the issue text)
and, for level 2, `rookie-dev`'s recorded fail-before/pass-after test run. Keep
its gate verdict, the test-inspector **Test run** block, the code review, and
the path to the visual test report.

- **PASS** -> step 5b.
- **CHANGES REQUESTED, every fix minor** — each is easily made and has no
  fallout: doc or comment wording, a missing KDoc, a misplaced or misnamed
  test, a small mechanical code fix that changes no behaviour, public API or
  design. Fix them on the spot (a short `rookie-dev` pass for code or tests;
  doc and comment wording directly), record what was fixed for step 7, and go
  on to step 5b **without another `qa` pass**.
- **CHANGES REQUESTED, otherwise** -> do a remediation pass: `rookie-dev` for a
  code or test gap; `planner` then `rookie-dev` if the plan itself is wrong.
  Then re-run `qa`, without asking the user. **At most three `qa` passes** in
  all, so at most two remediation loops; a pass whose fixes are all minor ends
  the loop as above. If the third pass still fails, stop and hand the user the
  findings, the report path, and the branch as it stands.

## 5b. Present — no pipeline step

The presenter is not a pipeline step. It runs as a service of the `admin
team` session: every landing (step 6) ends with its **landing refresh** of the
system dashboards (the changed system's page, the shared pages, the registry,
the README pointer; at level 4 the planned systems), and the issue's **plan
board** is kept up by the `plan-board` events you send at each step transition
(see "Plan-board events" below). Send nothing here; go on to step 6.

- If it reports `BLOCKED — system unresolved`, **stop** and ask the user
  which system the work belongs to; resume the same `presenter` with the
  answer.
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
| Planner COMPLETE | `plan-accepted` | the plan path, impact path |
| Step 3 done | `branch-cut` | branch, worktree |
| Each rookie-dev report | `implementation-stage` | the stage, `stages`: every stage's id and name with its state (`done`, `current`, `todo`), `final-implementation.md` path, deviations; during a remediation loop also `remediation`: the qa pass it answers, the route (`on-the-spot` / `rookie-dev` / `planner-then-rookie-dev`) and its sub-steps with their state; `tests`: the test classes the stage added or amended (`added`/`amended`: class, module, testLevel, path, tests, rows) |
| Each qa verdict | `qa-pass` | pass number, verdict, finding counts by kind (doc, test, code) and by `severity` (`minor` — easily made, no fallout — and `other`), the route step 5 takes from them, `rows`: the board row ids the findings touch, report path; `tests`: what the qa run ran (`ran`: class, module, passed, failed, skipped) and the counts of the untouched modules' tests (`other.byModule`) from the test-inspector report |
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

The team raises `landed` itself inside `land`. When the presenter fixes a
defect in the `dashboards` skill during any of this, the team syncs those
files to the `.github` mirror itself; step 7 mentions them if the `done`
reply lists them.

## 6. Land it — `admin team`: `land`

Send the admin team a `land` request with the **work level**, the change set
(`paths`), the branch and worktree, the `qa` verdict (`NONE` for level 4), the
plan or architecture document, every `.md` file created or updated this run,
and `publish: true` only if **the user asked for a publish this run** (it lets
the release use the budget's reserve; every version-bumping landing is
considered for release regardless). The
team's executor carries out the commits, the version bump the level calls for,
the PR, the merge, an upstream issue if the work exposed one, and the
**issue-resolution comment** (steps taken + links to any plan/design docs);
then its publisher releases a moved published-module version to Maven Central
when the monthly budget allows (`result.release` in the reply: `published`,
`deferred`, `failed` or `none`); then the team runs the presenter's landing
refresh (the system dashboards, the
issue's plan board as `landed`, the work board) and removes the branch and any
worktree it allocated. Wait for the reply: a
`needs-rework` means the base moved under the run's files — re-verify and
resend the same `id` with `attempt + 1`; a `needs-user` means a gate is
waiting on the user at the team's console.

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

## 7. Report

- The issue, its **work level**, and whether it is now **resolved**, a **step
  taken** (with what remains), or — level 4 — **planned**, with the sub-issues
  filed and their levels.
- The plan or architecture document and any other `.md` files, with their
  merged links.
- The `qa` verdict, the code review's verdict, and the visual test-report path.
- The dashboards `presenter` created or updated, with their merged links, and
  anything it reported as not shown.
- The commits / PR / merge / issue comment that landed, by reference, and any
  upstream issue `manager` filed.
- The release outcome from `result.release`: published (coordinates, tags,
  release URLs), deferred (reason and the month's usage), failed, or none.
- Anything handed back to the user: `rookie-dev` blockers, escalations,
  unresolved planner open decisions, and `manager`'s **Stopped — needs you**
  items (a failed publish, downstream-consumer coordination).
- If the work exposed a defect in a repo the project *consumes* (downstream),
  report it as coordination — do not file it. `manager` files upstream-only.

Do not start a second issue. One issue per `/resolve-issue` — except in the
`consecutive` and `concurrent` modes above, which work every sub-issue of one
planned tracking issue.
