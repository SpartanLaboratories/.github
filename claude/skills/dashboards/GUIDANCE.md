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
| **green** (`--good`) | accepted, done as decided, passing | an accepted option; an `as-planned` part; a passing qa gate; a `complete` unit (qa passed, drawn outlined: not merged yet) and a `landed` one (merged) |
| **yellow** (`--warning`) | in between: partly adopted, amended, waiting | a `partial` option; an `amended` part; an option left `deferred` at plan time; a halt waiting on the user |
| **red** (`--critical`) | declined, dropped, failing | a `declined` option; a `dropped` part; a failing gate |
| **orange** (`--serious`) | changed course | a `deviated` part (the decision itself changed) |
| **neutral** (ink/grey) | no outcome yet, or not applicable | a `pending` part; a `deferred` part (with its issue); counts and facts |

**Work in progress and the next one up: two accent marks.** The accent colour marks two things
and nothing else, each with its own look and its own legend entry:

- **In progress** — the thing currently being worked on (a plan board's `wip.current`, an active
  run on the work board) carries an **interior glow**: a solid accent ring inside its edge, a faint
  accent wash, and an inner glow that breathes in and out (a slow CSS animation, ~2 s). Under
  `prefers-reduced-motion` the inner glow holds still at its middle strength, so the mark stays as
  distinct without moving. While the run waits on the user it stops to the ring alone.
- **Up next** — the next unit of a tracking issue (`wip.next`), named but not started, carries the
  **mild outer glow** the in-progress mark used to have, held still, plus a static **UP NEXT**
  tag. It never animates and never reads as building or active; a blocker that has not landed
  adds a yellow "blocked by #n" tag.

Nothing else animates. At most a handful of elements are in progress at once; if everything
glows, nothing is current.

**Line and fill encodings.** Solid = built, done, decided. **Dashed = planned or pending**, on
every tab of every page, and dashed means nothing else. Dotted = standalone or conditional
where a ruleset uses it. Filled vs outlined only where the legend says what it means.

**Themes.** Every colour is a token on `:root`, redefined for dark mode; status and system
colours are validated for contrast in both themes (the `dataviz` skill's validator). Dark mode
is selected, never computed by flipping.

## 2. Legends

Every tab, panel or board shows a visible legend (`class="key"`) listing exactly the encodings
it uses — the system swatches present, each status colour with its glyph and word, dashed,
dotted, the in-progress glow, the up-next mark — and nothing it doesn't. A legend that promises
an encoding the panel never draws is a defect; so is an encoding with no legend entry.

## 3. A page is a template plus data

A page is never hand-edited. Its content lives in a data file beside it (`workspace.dsl` and
`systems.json` for system pages; `plan.json` for a plan board; `board.json` for the work
board), embedded **verbatim** into the page by the set's `embed.js`. To change a page, change
the data and re-embed; to change the look, change the template and re-embed every page that
uses it. The set's checker fails a page whose embedded copy differs from its data file.

**Go off the template.** A new page or board starts as a copy of its template (the repository's
`_template/` if it keeps one, else this skill's) and changes only what its facts require: the
data file, and on a system page the `MODEL`, the hand-written panels and the header. Anything
else it changes is a divergence (§7). A plan board or the work board is its template plus its
data, byte for byte (`new.js`, `board.js`, or a copy and `embed.js`). A system page keeps the
template's CSS, tab set and renderer script.

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
under 16 MB. Each template is checked for this once, in a headless browser, in light and dark
and at a narrow width (520 px is the narrowest headless Chrome lays out; the real phone width is
verified through the checker's iframe harness); a page inherits it from its template, and is
checked again only where it diverges (§8).

## 7. Divergence

The global template is the general one; a repository may keep its own under
`docs/dashboards/_template/` or `docs/plans/_template/`, and a page may diverge from a template
when its subject is better shown another way. A divergence should primarily **add**. Removing
content — a core tab, a standard bubble, a column, a legend — needs a strong argument, such as
no data for it existing, and the argument goes with it, in the page's footer comment and in the
presenter's report. A page **declares** each divergence in its head, as
`<meta name="template-divergence" content="what and why">`, so the checker knows what to check.
When a divergence would serve every page in the repo, it goes in the repo template instead.

## 8. Checks

**The template is verified once, in the skill; a page is checked only where it deviates.** A
template's own structure, tabs, legends, themes and responsive layout are verified by
`verify/verify-templates.js`, which renders it with fixtures covering its states, runs the full
browser pass on each (light, dark, 520 px, a 390 px frame) and records the template's hash in
`verify/verified.json` (a repository's `_template/` records its own beside it). Run it after
every template change; until it has run, a changed template counts as a divergence on every
page made from it.

Every page, before it is committed, passes its set's checker in `--auto` mode
(`plan/scripts/check.js <folder> --auto`; `system/scripts/check-page.js <page> --auto`):

| The page | Checked |
|---|---|
| any page | its data and its rules (`check.js`), the embedded copy matching its data file, no dead `href="#"`, no external resource |
| a plan board or the work board that is a verified template plus its data | nothing more: no browser pass |
| a system, supersystem or repository page whose CSS, tabs and renderer are the verified template's | one light pass, for the facts it fills in: no script error, every tab drawn with its legend, the Guarantees, Context, no git-ignored registry file |
| a page that diverges — declared, undeclared, made from an older template — or whose template changed since it was verified | the full pass: light, dark, 520 px, a 390 px frame |

A difference nobody declared is a warning: re-render the page from the template, or declare it
(§7). `--browser` (plan) and a plain `check-page.js` run still force a pass when wanted.

Then the presenter looks once at the screenshots of the pages that had a browser pass, for what
a script cannot see: a legend that doesn't match its panel, clipped labels, overlaps, a card off
the frame — on a diverging page, where it diverges. No per-tab screenshot sweep unless the
divergence is in that tab. Fix what you see; don't loop past a second look.

## 9. Defects and conventions

The presenter fixes dashboard **defects** at its own discretion — on any page, and in this
skill's templates, examples and scripts — where they live, and reports each skill fix so the
`.github` mirror is synced. The **conventions** (this file and the rulesets) are the user's: a
rule that seems wrong is proposed in the report, not changed.

## 10. Hygiene

Nothing committed carries a credential, a machine-local path, a user name or personal data.
Dashboards live in public repositories.
