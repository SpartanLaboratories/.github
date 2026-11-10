---
name: dashboards
description: >-
  The presenter's rules, templates, scripts and checks for a repository's
  dashboards: the state boards under docs/dashboards/ and the work boards under
  docs/plans/, named in nomenclature/boards.md. GUIDANCE.md holds the rules both
  sets share (colour coding first); system/RULES.md and plan/RULES.md hold each
  set's own. Load it whenever you create, update, review or check any board, its
  data file or its registry. The presenter agent uses it as a service of the
  admin team session.
---

# Dashboards

Two sets of boards, one presenter, one shared rulebook. The board terms (the umbrella "dashboard", the state boards and
the work boards, each board's name, "board" and never "page") are in `../../nomenclature/boards.md`; the state boards follow
`system/RULES.md`, the work boards `plan/RULES.md`.

Nothing a board shows or its data carries names the pipeline's agents, sessions or roles, the approval flow or a work level
(`GUIDANCE.md` §4); its elements take their names from the UI vocabulary, `../../nomenclature/ui.md` (`GUIDANCE.md` §12).

## Files

| Path | What |
|------|------|
| `GUIDANCE.md` | The rules shared by both sets: the boards' names, colour coding, Legends, planned/pending drawn dashed, themes, self-contained boards, facts (no work levels, no internal names), Context, divergence, checks, the landing flow (§11), how the boards use the element vocabulary of `../../nomenclature/ui.md` (§12, pointing at `../../nomenclature/boards.md`). Read it first, every time. |
| `system/RULES.md` | The state-board ruleset. `system/template/` (the system board, the supersystem and repository state board, the registry, a board's `state.json`), `system/scripts/` (`check-board.js`, the browser checker for every board, `embed.js`, `deviation.js`, `levelrefs.js` (the work-level forms, numbered and not, and `scrubLevels()`, which rewords a pipeline fact that names one), `termrefs.js` (the element names checked: it parses `../../nomenclature/ui.md` and `boards.md`, which stay the only home of the names, and warns on a banned word, a capitalised element name in neither list and a class that names an element's kind without its type word, `GUIDANCE.md` §12), `namerefs.js` (the internal names a board never carries, its copy of `../../nomenclature/internal-names.md` §1 and §2, held equal to the list by `verify/cases-internal-names.js`; `scrubNames()`, which rewords a pipeline fact that names one, and the `INTERNAL NAME` warnings), `palette.js` (the shared system palette and the status-hue rule), `apply-state.js`, the data-only path of a state board, below, with `statelib.js`, `features.js` (the per-board feature probes every check runs, `GUIDANCE.md` §8), `splice.js` (brings a state board, or a board with a declared divergence, onto its current template, three ways, migrating the names a board owns, `GUIDANCE.md` §11; the Document step's state-boards task runs it; `--verified` splices onto the template's recorded verified version instead, so a board can be brought up while the template is being edited, and a `--template` that is a cached version in `verify/history/` keeps its template's history as the merge bases), `history.js` (the template versions the splice merges from, read from `verify/history/` or rebuilt on demand, below), and `cliargs.js`, the strict option parser every script uses: an unknown option exits 2 with the usage, `--help` prints it), `system/examples/webtools-udp/`. |
| `verify/` | `verify-templates.js`, which verifies every template once (the checks that need no browser, over the fixtures in `verify/fixtures/`: the case groups, `cases-26.js`, `cases-22.js`, `cases-23.js`, `cases-24.js`, `cases-27.js`, `cases-28.js`, `cases-29.js`, `cases-30.js`, `cases-31.js`, `cases-32.js`, `cases-33.js`, `cases-34.js`, `cases-35.js`, `cases-explicit-step.js`, `cases-timeline-fast-path.js`, `cases-timeline-waits.js`, `cases-timeline-outages.js` and `cases-foundation.js`, `cases-option-d.js`, `cases-fill.js`, `cases-work-levels.js`, `cases-archived-colours.js`, `cases-doc-landing.js`, `cases-switches.js`, `cases-quality-review.js`, `cases-code-label.js`, `cases-file-tree.js`, `cases-gap-marks.js`, `cases-design-tab-proposals.js`, `cases-halt-questions.js`, `cases-halt-fix-step.js`, `cases-findings-line.js`, `cases-internal-names.js`, `cases-inspector-hide.js`, `cases-dsl-keyword-id.js`, `cases-mark-classes.js`, `cases-stepbar.js` (the StepBar of dashboards-skill/54 on every dashboard type, and its fixture boards for a browser check), `cases-wip-stages.js` (the stage list, the plan's stage table, the record of a stage, the Disclosures, the Now Chip and Internal Tooling), `cases-termrefs.js` (the element names, read from the glossary and warned on, `GUIDANCE.md` §12), `cases-seed.js`, `cases-unit-landed.js`, `cases-tracking-plan-events.js`, `cases-retime.js` and `cases-arrival.js` (the event's time held to its arrival, `--arrived`), which also run on their own, among them) and records its hash in `verified.json` when they pass, with each verified version kept in `verify/history/` for the splice. `verify/history/` is a local cache, kept out of the `.github` mirror: `system/scripts/history.js` rebuilds a recorded version whose file is missing from the mirror's git history (`SpartanLaboratories/.github`, `claude/skills/dashboards/<template path>`; from a local clone given with `--history-repo <path>` to `splice.js` or `verify-templates.js`, else through `gh api`), matched by its recorded LF-normalised sha256, and writes it back; a version nothing matches is warned on, and with none left the splice is two-way (`cases-27.js`). Boards made from a verified template are checked only where they deviate (`GUIDANCE.md` §8). Run it after every template change; a skill or template change gets no browser pass from the presenter, and the user checks it in a browser from what the presenter's report lists (`GUIDANCE.md` §8). `verify/fixtures/mark-classes/` is a static browser fixture of every mark class (`.fullpulse`, `.col-fullpulse`, `.colcell-fullpulse`, `.upnext-ring`, `.fillpulse`; the progress strip's StepBar with its current step's marks among them), drawn by the work-board templates' own styles and rewritten from them by `node verify/cases-mark-classes.js --fixture`; a case fails it once it no longer matches the templates. `browser-view-follow.js`, the tracked board's follow of its view copy in headless Chrome, runs only when a person asks for it. |
| `plan/RULES.md` | The work-board ruleset: the data model, the events that update a board, the WIP Panel and its step Panel (its finished steps clickable, each shown from its snapshot in `wip.history` or reconstructed), the Timeline's step visits (the time a run waited on the user or was not running drops out of them, unmentioned), the live updates, the repository work board, the org work board (§10, its generator and template in this skill too). `plan/template/` (the issue board, its `plan.json` skeleton, the repository work board, the org work board's `org-board.html` and its list of repositories `org-board.repositories.json`), `plan/scripts/` (`new.js`, the presenter's fallback for a foundation, `embed.js` (which also writes each board's live sidecar, `plan.js` or `board.js`), `check.js`, `board.js`, `org-board.js` (the org work board's generator: its committed board `docs/plans/org-work-board/` and its live view `docs/plans/.live/org-work-board/`), `mdcopy.js` (the rendered copies of the Markdown a board links, under the git-ignored `docs/plans/.live/docs/`), and `apply-event.js`, the fast path of a plan-board event, below; `timeline.js` (a landed board's Timeline step lines, and `--from-git` to record the merge's time and the branch's step commits on a board that landed before them; the fast path records both itself, `plan/RULES.md` §4, "The fast path owns the Timeline"); `testslib.js` (not a command), the Tests Tab's data rules that `apply-event.js`, `embed.js` and `check.js` share; `fill.js`, how a fill writes: the presenter's fields merged onto the latest `plan.json` while events keep applying; `levels.js` (not a command), what a board holds of a work level; `passnames.js` (not a command), the names a board shows for the run's steps and its Quality Reviews ("Quality Review N", "Correction", "Resolution", "Document commit"; its checks' labels "documentation check", "code check", "test check"): the names the scripts and the templates compose, an older wording reworded at every rewrite of a board, and check.js's BOARD WORDING), `plan/examples/38-handshake-empty-name/`. |

## The fast path of a plan-board event

At every `plan-board` request the admin team runs, itself:

    node ~/.claude/skills/dashboards/plan/scripts/apply-event.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--arrived <UTC ISO time>]

It applies, deterministically and in a second or two, everything the event's facts alone decide (the board's foundation at a `sized` with no board, so it opens when the run starts, `plan/RULES.md` §4, "The foundation"; the step, the FullPulse, the research
questions, the stages (the plan's stage table copied onto them at `branch-cut`, each one's start, finish and end report recorded) and the derived as-built states, the halt and the questions it puts in any step with their options, answered when it ends, the qa passes (each named "Quality Review N"), the remediation (a Correction or a Resolution, by its route), every step by its name (an older wording in a fact, "qa pass N", "qa next", "the remediation loop", "Document-landing commit" and the like, reworded), the open points (at every event), the
detail, the trail entry, the branch, a sub-issue's move on its tracking board, the statements' excerpts, the Tests Tab from `facts.tests`, the
Document step's `document` event and its tasks (its `state-boards` and `document-landing` tasks raised by the team), the team-raised `landing` and `merge`, the
seeding at `sized` from the live view's copies of the previous landing (and alone, for a level-1 branch that has no board, at the team-raised `seed`, its unit marked `complete` on its tracking board, and `landed` after its merge at the team-raised `unit-landed`, with `--view`; at a tracking issue's last unit, the tracking board's own landing once its impact is reconciled), the team-raised `reseed` that ends a post-merge refresh, the team-raised `retime` that corrects one event's recorded time on the user's direction (every place the record holds it moved, refused where the old time is not on record or the new one crosses a neighbouring bound, one `notes.corrections` entry), the copies of an open point's report and a qa pass's test report for
the live view, a bare test level written as its named one, and every Timeline input: the merge's time from the facts, git or the pull request, recorded at the next run's seeding where none could tell it, never an enrichment), re-renders each board it writes onto the current template where
the board is not the verified template plus its data, embeds, checks (no browser pass) and regenerates the live repository work board; nothing
changes on a failure (exit 1). Every fact text it writes names no work level and no internal name (reworded, or left out and named
for the presenter). Its summary ends the job when it says `enrich: no`; with `enrich: yes` (and `why`) the presenter
enriches the board from the folder's documents, writing through `fill.js`, so events keep applying meanwhile (`plan/RULES.md` §4, "The fast path"): the columns (the Verdict and As built Cells as lists of statements, each with its
reference into the plan, `plan/RULES.md` §2), the outcomes, the consequences (`consequences.md`, `impact.md` in an older folder), what
the foundation at `sized` reads as being written (the function, the Rows with their Gap, a sub-issue's Considered column).
A run's event is raised with `--arrived`, its arrival time: a `facts.at` that is missing or more than 2 minutes from it is replaced by the
arrival time, and the summary's `arrival` line says so; team-raised events and backfills go without it and keep their given times
(`plan/RULES.md` §4, "The event's time").
What the script decides and what the presenter adds is in `plan/RULES.md` §4, "The fast path". The presenter may move more onto it at its
own call (the standing rule there), changing the rules and the scripts to match and reporting it as a skill fix.

## The data-only path of a state board

At the Document step's state-boards task (`facts.document`), the presenter runs, in its `state-boards` mode:

    node ~/.claude/skills/dashboards/system/scripts/apply-state.js --event <request.json> --worktree <path> [--repo <owner/repo>]

It stamps the boards of the systems the branch touches and the shared boards (their supersystems, the repository state board,
`systems.json`) "as-is at <branch> @ <sha>" at the code-landing sha the request gives, the branch's last code commit after the sync and
the bump, as they land with the merge (`facts.premerge`, the older pre-merge refresh, read alike), marks the
parts the request names built or planned in the DSL and the registry (every board draws a part planned from that data), re-embeds,
and checks every board it wrote without a browser pass (`check-board.js --auto --no-browser`), in well under a second on a repository
like WebTools; nothing changes on a failure (exit 1). Its summary tells the presenter what is left to write: with `enrich: yes` (and
`why`) what only the code decides, the prose and figures at the new commit, what the boards say of a part now
built, a board brought onto the template. Built or planned is the code's: a system (or a part with its own code paths) is built while one of its
registry paths is present at the stamped commit, a supersystem once every core subsystem is; the facts decide only what has no code paths.
A board that lags its template is not refused: the summary asks the presenter to splice it. What the script decides and what the presenter adds is in `system/RULES.md` §10.

## The landing flow

The run's last steps are `document`, `landing` and `merge` (`GUIDANCE.md` §11, "The landing flow"; admin-team/dashboards-skill/35). The
**Document step** brings the documents up on the branch and, in its `state-boards` task (the presenter's `state-boards` mode), the state
boards as built, spliced onto the template and stamped at the code-landing sha, the tracking board re-embedded and the repository work board
regenerated, committed on the branch; nothing is restamped at the land, save a rebuild a re-sync needs (`system/RULES.md` §10). `landing` and `merge` go into the view copies (`apply-event.js --view`, before
the merge from the run's worktree, after it from the main checkout), so a committed board's worktree stays clean. After the merge, the **post-merge refresh** shows the issue landed in
the live view only (`docs/plans/.live/`, git-ignored; view copies under `docs/plans/.live/view/`, `apply-event.js --view`). That landed state
is **seeded at the next run's `sized`** (or a level-1 run's `seed`), into its branch (`plan/RULES.md` §4, "Seeding at sized"). A level-1 unit of a tracking issue,
which has no board, is marked landed on its tracking board's view copy after its merge by the team-raised `unit-landed` (`--view`; "The live view of a landing"). The **org work board** is regenerated and committed at every landing in a repository on the board
(`plan/RULES.md` §10).

## Reading order for a job

1. `GUIDANCE.md`.
2. The ruleset of the set you are working in.
3. The repo's own `docs/dashboards/_template/` or `docs/plans/_template/`, if it keeps one.
4. The board or data file you are changing.

A rule in a ruleset never loosens a rule in `GUIDANCE.md`; where they seem to
conflict, `GUIDANCE.md` wins and the ruleset is wrong — report it.
