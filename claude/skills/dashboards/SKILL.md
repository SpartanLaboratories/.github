---
name: dashboards
description: >-
  The presenter's rules, templates, scripts and checks for a repository's two
  dashboard sets: the system (as-built) dashboards under docs/dashboards/,
  which show each system as it is at a named commit, and the plan (process)
  dashboards under docs/plans/, which show each issue's gap, the options
  considered, the verdict, the as-built state, its downstream impact and the live
  work-in-progress of
  its /resolve-issue run (on a tracking board, also the unit up next), plus the
  repository work board. GUIDANCE.md holds
  the rules both sets share (colour coding first); system/RULES.md and
  plan/RULES.md hold each set's own. Load it whenever you create, update,
  review or check any dashboard page, its data file or its registry. The
  presenter agent uses it as a service of the admin team session.
---

# Dashboards

Two sets, one presenter, one shared rulebook.

| Set | Where in a repo | Shows | Ruleset |
|-----|-----------------|-------|---------|
| **System** (as-built) | `docs/dashboards/` | each system as it is at a named commit; planning is secondary context | `system/RULES.md` |
| **Plan** (process) | `docs/plans/<issue>-<slug>/dashboard.html`, `docs/plans/index.html` | each issue's gap, options, verdict, as-built state and downstream impact, with the live WIP of its run; the repository work board | `plan/RULES.md` |

## Files

| Path | What |
|------|------|
| `GUIDANCE.md` | The rules shared by both sets: colour coding, legends, planned/pending drawn dashed, themes, self-contained pages, facts, Context, divergence, checks. Read it first, every time. |
| `system/RULES.md` | The system-board ruleset. `system/template/` (system and supersystem pages, registry), `system/scripts/` (`check-page.js`, `embed.js`, `deviation.js`, `levelrefs.js`, `palette.js` (the shared system palette and the status-hue rule), and `cliargs.js`, the strict option parser every script uses: an unknown option exits 2 with the usage, `--help` prints it), `system/examples/webtools-udp/`. |
| `verify/` | `verify-templates.js`, which verifies every template once (the full browser pass over the fixtures in `verify/fixtures/`) and records its hash in `verified.json`. Pages made from a verified template are checked only where they deviate (`GUIDANCE.md` §8). Run it after every template change. |
| `plan/RULES.md` | The plan-board ruleset: the data model, the events that update a board, the WIP strip and its step panel, the live updates, the work board. `plan/template/` (issue page, `plan.json` skeleton, work board), `plan/scripts/` (`new.js`, `embed.js` (which also writes each page's live sidecar, `plan.js` or `board.js`), `check.js`, `board.js`), `plan/examples/38-handshake-empty-name/`. |

## Reading order for a job

1. `GUIDANCE.md`.
2. The ruleset of the set you are working in.
3. The repo's own `docs/dashboards/_template/` or `docs/plans/_template/`, if it keeps one.
4. The page or data file you are changing.

A rule in a ruleset never loosens a rule in `GUIDANCE.md`; where they seem to
conflict, `GUIDANCE.md` wins and the ruleset is wrong — report it.
