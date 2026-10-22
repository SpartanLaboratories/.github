# Dashboard guidance — the rules both sets share

These rules apply to every dashboard page the presenter makes: a system page, a
supersystem or repository page, an issue's plan board, the work board. A
ruleset (`system/RULES.md`, `plan/RULES.md`) adds to them and never loosens
them.

## 1. Colour coding

Colour means one thing per page, and the same thing on every page of a repo.

**Categorical: one colour per system.** Every system in `docs/dashboards/systems.json` owns
one colour slot, assigned in registry order (six slots; a system's parts inherit its parent's
colour; a seventh top-level system is never silently grey — re-parent, or add a slot and record
it). A system keeps that colour on **every page of the repository**: its card and rows on the
system pages, and its rows on every plan board. A reader who learns the colour once can
follow the system everywhere.

**Status: green, yellow, red, with a glyph and a label.** The status tokens (`--good`,
`--warning`, `--serious`, `--critical`) are reserved for outcomes, and never carry meaning
alone: every status colour sits beside a glyph and a word. What each set colours is fixed in
its ruleset; the shared scale is:

| Colour | Meaning | Examples |
|--------|---------|----------|
| **green** (`--good`) | accepted, done as decided, passing | an accepted option; an `as-planned` part; a passing qa gate |
| **yellow** (`--warning`) | in between: partly adopted, amended, waiting | a `partial` option; an `amended` part; an option left `deferred` at plan time; a halt waiting on the user |
| **red** (`--critical`) | declined, dropped, failing | a `declined` option; a `dropped` part; a failing gate |
| **orange** (`--serious`) | changed course | a `deviated` part (the decision itself changed) |
| **neutral** (ink/grey) | no outcome yet, or not applicable | a `pending` part; a `deferred` part (with its issue); counts and facts |

**Work in progress: the accent, pulsing.** The one thing currently being worked on carries a
soft glow in the accent colour that fades in and out (a slow CSS animation, ~2 s, respecting
`prefers-reduced-motion` by falling back to a steady outline). Nothing else animates. At most a
handful of elements glow at once; if everything glows, nothing is current.

**Line and fill encodings.** Solid = built, done, decided. **Dashed = planned or pending**, on
every tab of every page, and dashed means nothing else. Dotted = standalone or conditional
where a ruleset uses it. Filled vs outlined only where the legend says what it means.

**Themes.** Every colour is a token on `:root`, redefined for dark mode; status and system
colours are validated for contrast in both themes (the `dataviz` skill's validator). Dark mode
is selected, never computed by flipping.

## 2. Legends

Every tab, panel or board shows a visible legend (`class="key"`) listing exactly the encodings
it uses — the system swatches present, each status colour with its glyph and word, dashed,
dotted, the glow — and nothing it doesn't. A legend that promises an encoding the panel never
draws is a defect; so is an encoding with no legend entry.

## 3. A page is a template plus data

A page is never hand-edited. Its content lives in a data file beside it (`workspace.dsl` and
`systems.json` for system pages; `plan.json` for a plan board; `board.json` for the work
board), embedded **verbatim** into the page by the set's `embed.js`. To change a page, change
the data and re-embed; to change the look, change the template and re-embed every page that
uses it. The set's checker fails a page whose embedded copy differs from its data file.

## 4. Facts

A dashboard tells the truth about a named commit. Facts come from the code, the documents in
the repo, the issue tracker and the pipeline's own reports — never from memory of what a
system "usually" does, and never invented to fill a panel. An empty cell that says "not yet
documented" is correct; a plausible guess is not. A system page shows the code as built;
anything planned is drawn dashed and tagged, and never as built. A plan board's first three
columns are written once and never rewritten to match what happened; the fourth records every
difference.

## 5. Context, roadmap, work

Below the main content, a section headed **Context** (never "secondary") holds the roadmap
with each item's issues mapped under it, the unscheduled issues no roadmap item claims, and
the plans and documents. System pages and plan boards link each other both ways: a system
page's Context lists the plan boards that amended it; a plan board names its systems and
links their pages; the repository page links the work board.

## 6. Pages are self-contained

Inline CSS, JS and SVG; no external resources; light and dark; no horizontal page scroll at
phone width (diagrams scroll inside their own frame); every control reachable by keyboard;
under 16 MB. Checked in a headless browser before landing, in light and dark and at a narrow
width (520 px is the narrowest headless Chrome lays out; the real phone width is verified
through the checker's iframe harness).

## 7. Divergence

The global template is the general one; a repository may keep its own under
`docs/dashboards/_template/` or `docs/plans/_template/`, and a page may diverge from a template
when its subject is better shown another way. A divergence should primarily **add**. Removing
content — a core tab, a standard bubble, a column, a legend — needs a strong argument, such as
no data for it existing, and the argument goes with it, in the page's footer comment and in the
presenter's report. When a divergence would serve every page in the repo, it goes in the repo
template instead.

## 8. Checks

Every page passes its set's checker (`system/scripts/check-page.js`,
`plan/scripts/check.js`) with no console error, a legend on every tab, the embedded copy
matching its data, and no dead `href="#"`, in light and dark, before it is committed. Then the
presenter looks at the screenshots once for what a script cannot see: a legend that doesn't
match its panel, clipped labels, overlaps, a card off the frame. Fix what you see; don't loop
past a second look.

## 9. Defects and conventions

The presenter fixes dashboard **defects** at its own discretion — on any page, and in this
skill's templates, examples and scripts — where they live, and reports each skill fix so the
`.github` mirror is synced. The **conventions** (this file and the rulesets) are the user's: a
rule that seems wrong is proposed in the report, not changed.

## 10. Hygiene

Nothing committed carries a credential, a machine-local path, a user name or personal data.
Dashboards live in public repositories.
