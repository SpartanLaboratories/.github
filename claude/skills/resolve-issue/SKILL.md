---
name: resolve-issue
description: >-
  Work the oldest open GitHub issue in the current repo toward resolution, or
  pass a specific issue number to work that one. Runs planner -> rookie-dev ->
  qa in order, with the manager agent handling version control (branch, commits,
  PR, merge, upstream issue, resolution comment) autonomously and stopping only
  at its two gates - a Maven publish, which needs your explicit go-ahead, and
  any downstream-consumer coordination, which it reports rather than files. Use
  to make steady, reviewed progress through the issue backlog one issue at a
  time.
argument-hint: "[issue-number]"
disable-model-invocation: true
allowed-tools: Bash(gh issue list *), Bash(gh issue view *), Bash(gh pr list *), Bash(gh repo view *), Bash(git status *), Bash(git log *), Bash(git branch *)
---

Work **one** GitHub issue toward resolution using the project's agents. Follow
the steps in order. Wait for each spawned agent to finish before starting the
next. All version control runs through the `manager` agent, which acts
autonomously except at its two gates: a **Maven publish** happens only if the
user explicitly asked this run, and a **downstream-consumer issue** is never
filed (reported instead). You yourself never commit, push, merge, tag, publish,
or file/​comment on an issue outside of `manager`.

## 1. Pick the issue

- Repo: `gh repo view --json nameWithOwner -q .nameWithOwner`.
- **Target:** if `$ARGUMENTS` is an issue number, that is the issue. Otherwise
  list open issues oldest-first —
  `gh issue list --repo <repo> --state open --json number,title,createdAt,labels,url --limit 200 --jq 'sort_by(.createdAt)'`
  — and take the earliest one that is **not** labelled `blocked`, `wontfix`,
  `duplicate`, or `question` and, as far as the issue timeline shows, has no
  open PR already addressing it. If you skip the oldest for one of those
  reasons, say which and why, then take the next.
- If there are no open issues, say so and stop.
- Read the chosen issue in full: `gh issue view <n> --repo <repo> --comments`.
  An issue that is only partly done (an earlier tier/stage landed, more is
  open) still counts — this run's goal is the **next step**, not necessarily
  the whole issue.
- Tell the user the issue number, title, and a one-line statement of what you
  intend to do this run, and **confirm before proceeding** — this run creates
  branches and commits and posts a comment.
- Check `git status` is clean. If it is not, stop and ask the user to settle
  the working tree first.

## 2. Plan — `planner`

Spawn `planner` with the repo-qualified issue reference (`<owner>/<repo>#<n>`)
and the issue text. It runs a staged pipeline — interview, research,
architecture, plan drafting — and writes an architecture document plus one
implementation plan per system under `docs/`.

**`planner` halts and hands work back to you.** Its report leads with one of
three shapes; route on it:

- **`HALT — interview`** — it has questions about the user's intent that must
  be answered before any design happens. Relay the question list to the user
  **verbatim**, with the recommendations attached, and wait. Never answer on
  the user's behalf, and never pick the recommended option to keep things
  moving. Once the user answers, **resume the same planner** with
  `SendMessage` (its context is intact) carrying the answers — do not spawn a
  fresh `planner`, which would lose the interview and the research.
- **`HALT — architecture`** — the grand design decomposes into more than one
  system and needs sign-off before N plan documents get written. Relay the
  architecture document path, the decomposition, and any open decisions; wait
  for the user to approve or ask for changes; then resume the same planner
  with `SendMessage`.
- **`COMPLETE`** — the plans are drafted and cross-checked. Continue to step 3.

A halt is not a failure and not a reason to fill in the gap yourself. Stage 5
(review) is deliberately not yet defined; `planner` will say it was not run.

Always run this step for the issue at hand, even when a **broader/epic plan**
already exists that covers it as one item among several (e.g. a phase/epic
plan listing issues #46–#50). That parent plan is input for `planner`, not a
substitute for an issue-specific plan — pass it along as context, but still
have `planner` produce a full plan document for this issue's own scope.

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

- If the returned **Open decisions** list is non-empty, **stop**: relay it to
  the user and wait. Do not guess a design.
- Otherwise keep the architecture document path and **every** plan document
  path, in the landing order `planner` gave, plus the recommended approach.

## 3. Branch — `manager`

Spawn `manager` with the plan document, the issue reference, and the note
"about to implement stage one — set up the branch only, no commits yet".
`manager` creates the topic branch itself. Carry forward the branch name and
base it reports.

## 4. Implement — `rookie-dev`

Spawn `rookie-dev` with the plan document path and "implement it on the current
branch; commit nothing". If `planner` produced **several** plan documents, work
them in the landing order it gave — one `rookie-dev` per plan, each waiting for
the previous to finish — and pass the architecture document path alongside for
context.

- If its report has a **Not done / blocked** list, **stop**: relay it and offer
  the user either one `planner` re-pass to resolve the gap or to hand back as
  is. Do not fill in the missing design yourself.

## 5. Check — `qa`

Spawn `qa` over the change set (`git diff <base-branch>...HEAD` plus untracked
files). Keep its gate verdict, the test-inspector **Test run** block, and the
path to the visual test report.

- **PASS** -> step 6.
- **CHANGES REQUESTED** -> do **one** remediation pass: `rookie-dev` for a
  code or test gap; `planner` then `rookie-dev` if the plan itself is wrong.
  Re-run `qa` once. If it still fails, stop and hand the user the findings, the
  report path, and the branch as it stands. Never loop more than once.

## 6. Land it — `manager`

Spawn `manager` with the QA'd change set, the `qa` verdict, the plan document,
every `.md` file created or updated this run, this session's commit trailers
and PR footer, and **whether the user asked for a publish this run**. `manager`
carries out the commits, any version bump, the PR, the merge, an upstream issue
if the work exposed one, and the **issue-resolution comment** (steps taken +
links to the plan/design docs) — autonomously.

- Relay `manager`'s **Done** list as-is.
- Surface its **Stopped — needs you** items to the user: a Maven publish (only
  if a release was intended — give them the exact command) and any
  downstream-consumer coordination `manager` flagged rather than filed.
- Do not re-run or second-guess `manager`'s completed steps.

## 7. Report

- The issue, and whether it is now **resolved** or a **step taken** — with what
  remains in the latter case.
- The plan document and any other `.md` files, with their merged links.
- The `qa` verdict and the visual test-report path.
- The commits / PR / merge / issue comment that landed, by reference, and any
  upstream issue `manager` filed.
- Anything handed back to the user: `rookie-dev` blockers, unresolved planner
  open decisions, and `manager`'s **Stopped — needs you** items (a pending
  Maven publish, downstream-consumer coordination).
- If the work exposed a defect in a repo the project *consumes* (downstream),
  report it as coordination — do not file it. `manager` files upstream-only.

Do not start a second issue. One issue per `/resolve-issue`.
