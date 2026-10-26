---
name: dashboards
description: >-
  The presenter's rules, templates, scripts and checks for a repository's two
  sets of boards ("dashboard" is the umbrella; every member is a board): the
  state boards under docs/dashboards/ (system, supersystem and repository state
  boards), which show each system as it is at a named commit, and the work
  boards under docs/plans/ (issue and tracking boards, the repository work
  board), which show each issue's gap, the options considered, the verdict, the
  as-built state, its downstream impact and the live work in progress of its
  /resolve-issue run (on a tracking board, also the unit up next). GUIDANCE.md holds
  the rules both sets share (colour coding first); system/RULES.md and
  plan/RULES.md hold each set's own. Load it whenever you create, update,
  review or check any board, its data file or its registry. The
  presenter agent uses it as a service of the admin team session.
---

# Dashboards

Two sets of boards, one presenter, one shared rulebook. "Dashboard" is the umbrella; every member of either set is a **board**,
never a "page" (`GUIDANCE.md`, "Dashboards and boards").

| Set | Where in a repo | Its boards | Shows | Ruleset |
|-----|-----------------|------------|-------|---------|
| **State boards** | `docs/dashboards/` | the system board, the supersystem board, the repository state board; planned: the org project board, the intra-org dependency board | each system as it is at a named commit; planning is secondary context | `system/RULES.md` |
| **Work boards** | `docs/plans/<issue>-<slug>/dashboard.html`, `docs/plans/index.html` | the issue board, the tracking board, the repository work board; planned: the org work board | each issue's gap, options, verdict, as-built state and downstream impact, with the live work in progress of its run; every run at once | `plan/RULES.md` |

Nothing a board shows or its data carries names the pipeline's agents, sessions or roles, the approval flow or a work level
(`GUIDANCE.md` §4); its elements are named by function (`GUIDANCE.md` §12: panel, card, tile, cell, row; pill, chip, badge, tag;
ring, glow, arrow, legend).

## Files

| Path | What |
|------|------|
| `GUIDANCE.md` | The rules shared by both sets: the boards' names, colour coding, legends, planned/pending drawn dashed, themes, self-contained boards, facts (no work levels, no internal names), Context, divergence, checks, the landing flow (§11), the element vocabulary (§12). Read it first, every time. |
| `system/RULES.md` | The state-board ruleset. `system/template/` (the system board, the supersystem and repository state board, the registry, a board's `state.json`), `system/scripts/` (`check-board.js`, the browser checker for every board, `embed.js`, `deviation.js`, `levelrefs.js` (the work-level forms, numbered and not, and `scrubLevels()`, which rewords a pipeline fact that names one), `namerefs.js` (the internal names a board never carries, `scrubNames()`, which rewords a pipeline fact that names one, and the `INTERNAL NAME` warnings), `palette.js` (the shared system palette and the status-hue rule), `apply-state.js`, the data-only path of a state board, below, with `statelib.js`, `features.js` (the per-board feature probes every check runs, `GUIDANCE.md` §8), `splice.js` (brings a state board, or a board with a declared divergence, onto its current template, three ways, migrating the names a board owns, `GUIDANCE.md` §11; the pre-merge refresh runs it; `--verified` splices onto the template's recorded verified version instead, so a board can be brought up while the template is being edited, and a `--template` that is a cached version in `verify/history/` keeps its template's history as the merge bases), `history.js` (the template versions the splice merges from, read from `verify/history/` or rebuilt on demand, below), and `cliargs.js`, the strict option parser every script uses: an unknown option exits 2 with the usage, `--help` prints it), `system/examples/webtools-udp/`. |
| `verify/` | `verify-templates.js`, which verifies every template once (the full browser pass over the fixtures in `verify/fixtures/`, and the case groups, `cases-26.js`, `cases-22.js`, `cases-23.js`, `cases-24.js`, `cases-27.js`, `cases-28.js`, `cases-29.js`, `cases-30.js`, `cases-31.js`, `cases-32.js` and `cases-33.js` among them) and records its hash in `verified.json`, with each verified version kept in `verify/history/` for the splice. `verify/history/` is a local cache, kept out of the `.github` mirror: `system/scripts/history.js` rebuilds a recorded version whose file is missing from the mirror's git history (`SpartanLaboratories/.github`, `claude/skills/dashboards/<template path>`; from a local clone given with `--history-repo <path>` to `splice.js` or `verify-templates.js`, else through `gh api`), matched by its recorded LF-normalised sha256, and writes it back; a version nothing matches is warned on, and with none left the splice is two-way (`cases-27.js`). Boards made from a verified template are checked only where they deviate (`GUIDANCE.md` §8). Run it after every template change. |
| `plan/RULES.md` | The work-board ruleset: the data model, the events that update a board, the WIP strip and its step panel (its finished steps clickable, each shown from its snapshot in `wip.history` or reconstructed), the live updates, the repository work board. `plan/template/` (the issue board, its `plan.json` skeleton, the repository work board), `plan/scripts/` (`new.js`, `embed.js` (which also writes each board's live sidecar, `plan.js` or `board.js`), `check.js`, `board.js`, `mdcopy.js` (the rendered copies of the Markdown a board links, under the git-ignored `docs/plans/.live/docs/`), and `apply-event.js`, the fast path of a plan-board event, below; `timeline.js` (a landed board's Timeline step lines, and `--from-git` to record the merge's time and the branch's step commits on a board that landed before them); `testslib.js` (not a command), the Tests tab's data rules that `apply-event.js`, `embed.js` and `check.js` share; `new.js --batch` lays a tracking issue's unit boards), `plan/examples/38-handshake-empty-name/`. |

## The fast path of a plan-board event

At every `plan-board` request the admin team runs, itself:

    node ~/.claude/skills/dashboards/plan/scripts/apply-event.js --event <request.json> --worktree <path> [--repo <owner/repo>]

It applies, deterministically and in a second or two, everything the event's facts alone decide (the step, the glow, the research
questions, the stages and the derived as-built states, the halt, the qa passes, the remediation, the open points (at every event), the
detail, the trail entry, the branch, a sub-issue's move on its tracking board, the statements' excerpts, the Tests tab from `facts.tests`, the team-raised `landing`), re-renders each board it writes onto the current template where
the board is not the verified template plus its data, embeds, checks (no browser pass) and regenerates the live repository work board; nothing
changes on a failure (exit 1). Every fact text it writes names no work level and no internal name (reworded, or left out and named
for the presenter). Its summary ends the job when it says `enrich: no`; with `enrich: yes` (and `why`) the presenter
enriches the board from the folder's documents: the columns (the Verdict and As built cells as lists of statements, each with its
reference into the plan, `plan/RULES.md` §2), the outcomes, the impact, the foundation at `sized`.
What the script decides and what the presenter adds is in `plan/RULES.md` §4, "The fast path". The presenter may move more onto it at its
own call (the standing rule there), changing the rules and the scripts to match and reporting it as a skill fix.

## The data-only path of a state board

At every `implementation-stage` request on a branch, and at the pre-merge refresh inside a landing, the admin team runs, itself:

    node ~/.claude/skills/dashboards/system/scripts/apply-state.js --event <request.json> --worktree <path> [--repo <owner/repo>]

It stamps the boards of the systems the branch touches and the shared boards (their supersystems, the repository state board,
`systems.json`) "as-is at <branch> @ <sha> · not yet landed" (at the pre-merge refresh, `facts.premerge`, "as-is at <branch> @ <sha>" at
the head the team names, the last commit before the board commit, as they land with the merge), marks the
parts the request names built or planned in the DSL and the registry (every board draws a part planned from that data), re-embeds,
and checks every board it wrote without a browser pass (`check-board.js --auto --no-browser`), in well under a second on a repository
like WebTools; nothing changes on a failure (exit 1). Its summary ends the job when it says `enrich: no`; with `enrich: yes` (and
`why`) the presenter writes what only the code decides: the prose and figures at the new commit, what the boards say of a part now
built, a board brought onto the template. Built or planned is the code's: a system (or a part with its own code paths) is built while one of its
registry paths is present at the stamped commit, a supersystem once every core subsystem is; the facts decide only what has no code paths.
What it writes on a feature branch rides the branch's next commit in that lane, not held for the landing. A board that lags its template is
not refused: the summary asks the presenter to splice it. What the script decides and what the presenter adds is in `system/RULES.md` §10.

## The landing flow

A landing refreshes the boards twice and commits them once (`GUIDANCE.md` §11, "The landing flow"): the **pre-merge refresh**, on the
issue's branch after the code, the bump and the reconciled documents are committed — the previous landing's corrections first (its
issue board `landed` with its merge commit, its tracking board's unit landed and the next one up, the repository work board), then
the state boards as built, spliced and stamped at the head — committed as one `docs:` commit that lands in the merge; and the
**post-merge refresh**, the live view only (`docs/plans/.live/`, git-ignored), showing the issue landed. The landing's own committed
corrections ride the next landing's pre-merge refresh.

## Reading order for a job

1. `GUIDANCE.md`.
2. The ruleset of the set you are working in.
3. The repo's own `docs/dashboards/_template/` or `docs/plans/_template/`, if it keeps one.
4. The board or data file you are changing.

A rule in a ruleset never loosens a rule in `GUIDANCE.md`; where they seem to
conflict, `GUIDANCE.md` wins and the ruleset is wrong — report it.
