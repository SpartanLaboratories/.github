# Dashboard guidance — the rules both sets share

These rules apply to every dashboard page the presenter makes: a system page, a
supersystem or repository page, an issue's plan board, the work board. A
ruleset (`system/RULES.md`, `plan/RULES.md`) adds to them and never loosens
them. A change to any of them is weighed for every dashboard type (§11).

## 1. Colour coding

Colour means one thing per page, and the same thing on every page of a repo.

**Categorical: one colour per system.** Every system in `docs/dashboards/systems.json` owns
one colour slot, assigned in registry order (six slots; a system's parts inherit its parent's
colour; a seventh top-level system is never silently grey — re-parent, or add a slot and record
it). A system keeps that colour on **every tab of every page**: its card and rows on the system,
supersystem and repository pages, its rows on every plan board and on the work board. A reader who
learns the colour once can follow the system everywhere. On a system page the three sides
(`--server`, `--client`, `--wire`) are slots 1 to 3.

**Status spectra are reserved.** Wherever a view needs two colour schemes and a yellow–orange–red
or green–yellow–red spectrum fits a status, that spectrum carries the status, and every other
colour indicator on the view avoids it. The plan boards colour an option's status green, yellow
and red, and the Impact tab colours compatibility yellow and red (orange where useful), so the
system palette leaves out green, yellow, orange, amber, red and pink: its six slots are blues, a
teal, an indigo and purples, the same on every page and in both themes
(`system/scripts/palette.js` holds them; hex per slot, light / dark):

| Slot | Name | Light | Dark |
|------|------|-------|------|
| 1 | blue | `#2a78d6` | `#3987e5` |
| 2 | purple | `#653184` | `#8a44d8` |
| 3 | teal | `#0d7680` | `#1f8089` |
| 4 | indigo | `#1d2660` | `#b4bef5` |
| 5 | orchid | `#9656aa` | `#a86fb8` |
| 6 | sky | `#1a9ec7` | `#31b5f4` |

Every slot is at least 3:1 against its theme's card surface, and the slots were chosen for their
distance from each other in normal vision and under protanopia, deuteranopia and tritanopia, and
from the accent and the neutrals. A system colour is in a status spectrum when it is chromatic
(HSL saturation 0.15 or more) and its hue is outside 175°–295°; `check.js` and `check-page.js` fail
such a slot, and warn on a slot that is not the shared palette's.

**Status: green, yellow, red, with a glyph and a label.** The status tokens (`--good`,
`--warning`, `--serious`, `--critical`) are reserved for outcomes, and never carry meaning
alone: every status colour sits beside a glyph and a word. What each set colours is fixed in
its ruleset; the shared scale is:

| Colour | Meaning | Examples |
|--------|---------|----------|
| **green** (`--good`) | accepted, done as decided, passing | an accepted option; an `as-planned` part; a passing qa gate; a `complete` unit (qa passed, drawn outlined: not merged yet) and a `landed` one (merged); an impact reconciled as built |
| **yellow** (`--warning`) | in between: partly adopted, amended, waiting | a `partial` option; an `amended` part; an option left `deferred` at plan time; a halt waiting on the user; an impact partly reconciled |
| **red** (`--critical`) | declined, dropped, failing | a `declined` option; a `dropped` part; a failing gate |
| **orange** (`--serious`) | changed course | a `deviated` part (the decision itself changed) |
| **accent** (`--accent`) | being worked on: the in-progress mark | an `in-progress` part (a current stage builds it; a unit whose run is under way), solid, beside the glow |
| **strong neutral** (`--ink-2`, solid) | partly done, no outcome yet | a `partially-built` part: a finished stage built part of it, a later stage builds the rest |
| **neutral** (ink/grey) | no outcome yet, or not applicable | a `pending` part; a `deferred` part (with its issue); an impact still planned (dashed); an issue closed as not planned or as a duplicate ("closed · not planned", "closed · duplicate": never landed; plan boards and the work board only, §7); a `bug` label ("▲ bug": a label, not an outcome); counts and facts |

**The exception: compatibility on the Impact tab.** On a plan board's Impact tab, red and
yellow mean **compatibility**, not outcomes, because what a reader needs from that tab first is
whether the change breaks them. **Red** (`--critical`) is a breaking change: a `breaking`
downstream effect, a `removed` surface, a required adaptation that breaks a consumer that does
not make it. **Yellow** (`--warning`) is a deprecation or another non-breaking change worth
noting: a `deprecated` or `changed` surface, a `behaviour` change, a required adaptation that
does not break, a lettered or strict-version requirement and the like. Every other entry keeps
**its system's colour slot**. The cards and their effect, need and API-change badges take these
colours, always with a glyph and a word. Nothing else on that tab is red or yellow. Everywhere
else the scale above holds.

**No planning information on the Impact tab.** The tab shows only the current best-known impact:
no pill for its standing (planned, as built, amended), no list of changes from the planned impact,
and one solid card style for every entry, whether the impact is still the plan's or reconciled.
Nothing on that tab is dashed. The plan-versus-build story stays on the As built tab, and that
includes the impact's: the As built tab shows how the impact differed from the plan
(`impact.changes`, and on a tracking board each unit's own), each change a solid card in its
system's colour linking the Impact card it changed, never in the Impact tab's compatibility red or
yellow. Those changes accumulate as the work lands, on a tracking board as each unit lands, while the
impact is partly reconciled; it is reconciled whole at the landing, a tracking board's at its last
unit's. Every landed unit records its effect on the initiative's impact — the changes it made, or an
explicit "no change" — so "None so far" is said from a record, never from an absence. The data keeps
only the impact's basis (`plan` or `as-built`); the **reconciliation state** — planned, partly
reconciled, as built — is derived from the data, never stored, by one rule in each runtime, and shows
as a chip on the As built tab and on the work board, never on the Impact tab: planned neutral and
dashed, partly reconciled yellow, as built green, each with its glyph and word (`plan/RULES.md` §2,
Impact).

**Test levels: a neutral ramp.** On a plan board's Tests tab (`plan/RULES.md` §2) a test class is coloured by its test level, the
five-level testing hierarchy's L1 gating to L5 UAT, as a ramp of neutrals from the faintest (L1) to the full ink (L5), in either theme, each with its level label:
the levels are an order, not systems or outcomes, so they take neither a system slot nor a status colour, and the class's latest result
keeps the status scale (passed green, failed red, each with its glyph and word).

**Dependencies: a status pill and a neutral ramp** (admin-team/dashboards-skill/30). A dependency on the work board ("Depends on"),
on a plan board's WIP strip ("depends on") and in a tracking board's unit inspector carries one small bubble of two states. Its **build
state** takes the status scale, with its glyph and word: `blocking` yellow (⊘: part of the plan, still open — waiting), `clear` green (✓:
part of the plan, landed or closed — done), `pre-built` neutral (◼: not part of the tracking issue, built before its plan started — the
plan's outcome does not apply to it). Its **locality** is an order, near to far, so it takes a **neutral ramp**, faintest to full ink, never
a system slot or a status colour, each with its glyph and word: `local-repository` (⌂ repo), `local-organization` (◇ org),
`local-parent-org` (△ parent org), `external-<name>` (↗ external · name). What an issue holds up ("Blocks · enables") takes the status
scale: `blocks` yellow (⊘: still open), `enables` green (→: done). A state no rule fits is not drawn (`plan/RULES.md` §5).

**The decision not to run another qa pass: a neutral mark** (admin-team/dashboards-skill/31). A qa pass whose findings were fixed in
place, with no further pass (its `on-the-spot` route), carries a small neutral mark beside its verdict pill, with its glyph and words:
"✎ fixed in place · no 2nd pass" ("fixing" while the fixes are being made). It is a decision, not an outcome: it takes no status colour,
and the pass keeps its own verdict pill (`plan/RULES.md` §5, "QA").

**Steps: a neutral ramp.** A landed board's Timeline tile (`plan/RULES.md` §2, "The KPI tiles") draws the time of each visit of a run
step (sizing, research, plan, …, qa, remediation, landing; a tracking board's own steps) in neutral ink shades, one shade per step, faintest
for the first step drawn to the full ink for the last, a step's repeats sharing its shade, each visit an entry of the tile's legend with
its start → end and its duration (admin-team/dashboards-skill/32, in place of dashboards-skill/23's four phases): steps are an order, not
systems or outcomes, so they take neither a system slot nor a status colour. A time not in the record is drawn "—", never guessed; a
visit without both times is not drawn. The tile's figure is the sum of the visits its bar draws, never baseline to built: a visit left out
of the bar is left out of the sum (admin-team/dashboards-skill/28).

**Work in progress and the next one up: two accent marks.** The accent colour marks two things
and nothing else, each with its own look and its own legend entry (the charging arrow, below, is
the in-progress mark of a connector):

- **In progress** — the thing currently being worked on (a plan board's `wip.current`, an active
  run on the work board; on a plan board its as-built pill reads `▶ in progress` in the accent, solid) carries an **interior glow**: a solid accent ring inside its edge, a faint
  accent wash, and an inner glow that breathes in and out (a slow CSS animation, ~2 s). Under
  `prefers-reduced-motion` the inner glow holds still at its middle strength, so the mark stays as
  distinct without moving. While the run waits on the user it stops to the ring alone. A
  tracking board's unit in progress carries its own run's live state, mirrored from its board
  (`plan/RULES.md` §3), and its mark stops to the ring alone while that unit's run waits on the
  user, even when the rest of the board works on.
- **Up next** — the next unit of a tracking issue (`wip.next`), named but not started, carries the
  **mild outer glow** the in-progress mark used to have, held still, plus a static **UP NEXT**
  tag. It never animates and never reads as building or active; a blocker that has not landed
  adds a yellow "blocked by #n" tag.

Two more marks belong to the work in progress on a plan board, and to nothing else
(`plan/RULES.md` §3): the **charging arrow**, the connector into a Verdict cell whose verdict the plan
step is writing, a battery of accent segments filling left to right (held still, filled, while the
run waits on the user and under `prefers-reduced-motion`); and the **live indicator**'s dot in the
header of a plan board or the live work board, ink, never a status or accent colour, which pulses
while the view is live and changing and holds still after a quiet spell, while the run waits on the
user, when its data cannot be read and under `prefers-reduced-motion`. Nothing else animates. The
in-progress mark is exact: it marks every cell being worked on, however many, and nothing else; a whole column glows
only while the rows being worked on are unknown, or while the work touches no row (an implementation stage that builds no row
glows the whole As built column, `plan/RULES.md` §3). No check limits how many glow. While a tracking board files its units as
sub-issues, then creates their boards, each unit row's label glows on its own while its issue (then its board) is being made, and stops
when that one is done (`plan/RULES.md` §3; admin-team/dashboards-skill/28). **A column at work is one glow on the
column itself** — its band and head on a board's Timeline, round the cards on its As built tab — never each of its cells lit; held
still as the ring alone while the run waits on the user, static under `prefers-reduced-motion`, with its own legend entry. A
layout that draws no column (a board's Timeline at phone width stacks its rows) puts the mark on each of that column's cells.

**Research state: the research scale.** On a plan board, a row the run's research questions name
carries a **ring** (its Considered cell's border, never a fill) in a status spectrum of its own, from
red to green: **red** planning (the question is being drafted), **orange** researching, **orange
with a check** returned (awaiting verification), **yellow** verifying, **green** complete (kept until
the plan is accepted). A pill in the cell's head says the state with its glyph and word, and the
Timeline's legend names each state it drew. The ring and the in-progress glow coexist: the glow is
the activity, the ring the research's progress (`plan/RULES.md` §3).

**Line and fill encodings.** Solid = built, done, decided. **Dashed = planned or pending**, on
every tab of every page but one, and dashed means nothing else. The exception is a plan board's
Impact tab, which draws nothing dashed (above). No ruleset may use a dash for anything else:
diagram furniture is solid — sequence lifelines and boundary frames faint and solid, a return message
a thin solid line told by its open arrowhead — and only a planned lifeline, message, element or
relationship is dashed. `check-page.js` fails a dashed element that marks nothing planned or pending,
on every tab of every kind of page, every C4 view included, and a `workspace.dsl` style that dashes
a tag other than `Planned`. Dotted = standalone or conditional where a ruleset uses it. Filled vs
outlined only where the legend says what it means.

**Themes.** Every colour is a token on `:root`, redefined for dark mode; status and system
colours are validated for contrast in both themes (the `dataviz` skill's validator). Dark mode
is selected, never computed by flipping. Every dashboard type — system, supersystem and repository
pages, plan boards, tracking boards, the work board — carries a **theme switch** in its header, a
light/night toggle right of the breadcrumb: until it is clicked the page follows the system setting
(`prefers-color-scheme`); a click picks the other palette and remembers the choice across pages and
reloads (`localStorage` key `dashboards-theme`, shared by every dashboard of the same origin, applied
in the page's head before its first paint). It only selects one of the two palettes the page already
defines (`:root[data-theme]`); it adds no colour.

The elements these colours apply to are named in §12, one name per function.

## 2. Legends

Every tab, panel or board shows a visible legend (`class="key"`) listing exactly the encodings
it uses — the system swatches present, each status colour with its glyph and word, dashed,
dotted, the in-progress glow, the up-next mark — and nothing it doesn't. A legend that promises
an encoding the panel never draws is a defect; so is an encoding with no legend entry.

**Figures.** A tile that counts states carries a segmented bar of them, wherever it stands: a plan board's row of KPI tiles (an issue board's, a tracking board's) is a panel too, and every tile carries a
segmented bar of what its figure counts (by group, verdict, state or qa pass, `plan/RULES.md` §2, "The KPI tiles"), in the colour coding of §1 (a system's colour, a status
colour, a neutral; dashed for what is pending), and **each tile carries the legend of its own bar, inside the tile**, naming exactly the
segments that bar drew: no legend row is shared under the tiles, so every tile keeps its full share of the row. The
work board's Runs tile (every run by its state) and its Landed tile (landed, merged, complete, and the closed ones it does not count) carry one
too, each with its legend inside the tile. A landed board's Timeline tile carries the time per step visit (§1, "Steps"), its legend
one entry per visit with its start → end and its duration, a visit without both times left out of the bar and named in its
sub-line; its figure is the sum of the visits the bar draws. A tile that counts one state (the work board's Active, Waiting, Up next, Not started) has
nothing to segment and carries none, and so do the system pages' hand-written tiles: they are counted facts written by hand (files,
types, threads, tests), not states, so there is nothing a bar would divide.

**Sections.** The Guarantees and the Context are panels too: each carries a legend under its bubbles or cards, generated from what
they draw (the system swatches, a planned row dashed, a gap, the test-level bars' one neutral series, the badges and their meaning, a
tracking issue's chain bar, a board's unit states), and none where they draw no encoding.

**Ledes.** The legend says what the encodings mean, so a tab's lede does not: it is at most one
short line, and only for what the graphic and its legend do not show (what to click, a fact the
picture cannot carry), or nothing. This holds on every page: the plan boards' tabs, the system,
supersystem and repository pages' tabs, the work board's.

## 3. A page is a template plus data

A page is never hand-edited. Its content lives in a data file beside it (`workspace.dsl`,
`systems.json` and `state.json` for system pages; `plan.json` for a plan board; `board.json` for the work
board), embedded **verbatim** into the page by the set's `embed.js`. To change a page, change
the data and re-embed; to change the look, change the template and re-embed every page that
uses it. The set's checker fails a page whose embedded copy differs from its data file.

**Go off the template.** A new page or board starts as a copy of its template (the repository's
`_template/` if it keeps one, else this skill's) and changes only what its facts require: the
data file, and on a system page the `MODEL`, the hand-written panels and the header. Anything
else it changes is a divergence (§7). A plan board or the work board is its template plus its
data, byte for byte (`new.js`, `board.js`, or a copy and `embed.js`). A system page keeps the
template's CSS, tab set and renderer script.

**The footer.** Every page ends with one line: "Corresponds to `<source>`." and the authority sentence,
and nothing more. The source is the data file the page renders from: a plan board's
`<folder>/plan.json`, the work board's `docs/plans/board.json` (`docs/plans/.live/board.json` for the
live view), a system page's `workspace.dsl`, a supersystem or repository page's
`docs/dashboards/systems.json` and `workspace.dsl`. The authority sentence is "Code and the Markdown
beside this page are authoritative on any conflict." on a plan board and the work board, and "Code is
authoritative on any conflict." on a system, supersystem or repository page. A plan or tracking board
adds "Columns 1 to 3 are written once; column 4 records every difference."; no other page has columns.
No baseline, landed-state or "maintained by" clause: the header and the WIP strip carry the stamps. A
system page's divergence list stays in the footer's comment (§7). `check-page.js` fails a footer that
is not in this form.

## 4. Facts

A dashboard tells the truth about a named commit. Facts come from the code, the documents in
the repo, the issue tracker and the pipeline's own reports — never from memory of what a
system "usually" does, and never invented to fill a panel. An empty cell that says "not yet
documented" is correct; a plausible guess is not. A system page shows the code as built at the commit it names — the
default branch's, or while a feature branch's work is shown on that branch, the branch's, stamped "not yet landed"
(`system/RULES.md` §10); anything planned is drawn dashed and tagged, and never as built. A plan board's first three
columns are written once and never rewritten to match what happened; the fourth records every
difference.

**No work levels.** The rule covers only the **work levels** of the `/resolve-issue` pipeline (level 1
to 4, the `level: N` label), and nothing else. A dashboard never shows an issue's work level: no "level 3", "L3",
"level: 2", "a level-3 change" or "escalated to level 4", in a chip, a badge, a column, a chain
node, a legend, a lede or any text the presenter writes. Say what the work is instead: one
system, a bug fix, docs only, a tracking issue. The work levels stay in force everywhere else;
a plan keeps its level as data where a script needs it (`plan.json` `level`, `unit.level`,
`wip.proposedLevel`), and no page renders those fields, the Source tab included. A pipeline fact that names one ("inside level 3",
"a level-3 re-pass", "Label level: 3") is reworded before it is written — the scope phrase becomes the unit's or the issue's scope, the
level is elided before its noun, the label dropped — and left out only where a work level would remain (`system/scripts/levelrefs.js`
`scrubLevels()`, which `apply-event.js` and `apply-state.js` run); a quotation (a plan excerpt) elides it with "…" instead, as a quote
is never reworded.

**An issue's title is quoted verbatim** (admin-team/dashboards-skill/28). Wherever a page shows an issue's title — a plan board's issue
line, a roadmap item, a follow-up, a work-board row, group, roadmap item or unscheduled issue, a state page's Context and its "last amended
by" note — it is the issue's own, never reworded and never elided. Work levels are internal to the pipeline and never part of an issue, so
a title that names one is a **defect in the issue**, not in the page: `plan/scripts/check.js` (on `plan.json` and `board.json`) and
`system/scripts/check-page.js` (a state page's Context titles and `lastAmended.title`, and in its browser pass every title the page marks
`data-issue-title`) flag it, `ISSUE TITLE NAMES A WORK LEVEL: #n`, as a warning and never fail the page for it, and `apply-event.js` and
`apply-state.js` name it in their summary's `issue defects`; the admin team brings it to the user to retitle on GitHub. The rule above
holds for everything else on the page, the quoted titles' text aside (`levelrefs.js` `issueTitleRefs()`, `titleSkip()`). The test
levels of the five-level testing hierarchy and the C4 model's levels are not work levels: the rule
does not touch them, and they keep their level labels — "L1 gating", "L2 component", "L4a
deterministic", "L5 UAT", "Level 2 — component", "Level 1 · System Context". `plan/scripts/check.js`
fails a board whose text names a work level, and the browser pass fails a page that shows one
(`system/scripts/levelrefs.js` holds the forms; it matches work-level forms only, never a test
level's or a C4 level's label, and never "Level 3" alone).

## 5. Context, roadmap, work

Below the main content, a section headed **Context** (never "secondary") holds the roadmap
with each item's issues mapped under it, the unscheduled issues no roadmap item claims, and
the plans and documents. System pages and plan boards link each other both ways: a system
page's Context lists the plan boards that amended it; a plan board names its systems and
links their pages; the repository page links the work board.

**An issue's number and its title.** Where an issue's number and its title appear together — a
unit row, a roadmap item, a work-board row or group heading, the WIP strip's unit lines, the
inspector's unit entry — they are **two links**: the number opens the GitHub issue, and the
title opens the issue's own board, or stays plain text while it has none. An issue's title is quoted verbatim (§4); a unit's name, the
presenter's, is not a quotation. A tracking board's
unit row is the example: `1. #61 Shared build logic`, where `#61` opens issue 61 on GitHub and
"Shared build logic" opens its board. Where **only one link fits** — a bare `#n` in text, a
chain node, a "blocked by #n" tag, a deferred badge, the "part of #n" chip — the `#n` opens the
issue's board when one exists and the GitHub issue while none does. A small "GitHub ↗" link
sits beside such a lone `#n` only where the page offers no other way to reach the issue, on a plan board (a system page has none, §7). A link
never points at a file that is not there (`plan/RULES.md` §1).

**Links to the shared pages, and the live views first.** The template-fixed links of every page — the work board, the repository page
`docs/dashboards/index.html`, a system's page, `docs/plans/README.md` — point only at files that exist: a plan board and the work board
take them from their data (`plan.json` `links`, `board.json` `links`, which `embed.js` and `board.js` set from the files on disk), a state
page from its hand-written HTML and its `WORK_BOARD` line, and the words stay plain text while the file is not there; `check.js` and
`check-page.js` fail a dead one (`DEAD LINK`). Every link to the work board opens the **live view first**: the live work board on this
machine (`docs/plans/.live/index.html`, named by the marker `docs/plans/.live/index.js` that `board.js --live` writes in each checkout of the
repository), else the committed `docs/plans/index.html` (on GitHub or another clone), else plain text. Every Markdown document a board
links opens its **rendered copy** when one is on disk (`docs/plans/.live/docs/`, `plan/RULES.md` §1), else the `.md`; a "(§n)" reference
opens the copy at that section.

**A state page is as-is.** The part of a system, supersystem or repository page above its Context — the header, the tabs, the Guarantees —
shows the code at a named commit and names no issue: no "#n", no "last amended by" chip, no "planned by #n"; a planned part links its
plan board by name ("its plan") where one exists. The issues are in the Context section: its roadmap and issue lists, and the last
amendment, said there ("last amended by #n title").

The rule holds on every page. The plan boards and the work board take their board links from their
data (`embed.js`, `board.js`); a system, supersystem or repository page takes them from its `BOARDS`
map, filled when the page is written, and its hand-written HTML marks a title link
`<a data-board="N">` and a lone `#n` `<a data-issue="N">`, which the page resolves at load
(`system/RULES.md` §6). Where the page's Context lists an issue's number and its title — the roadmap,
the unscheduled issues, the "last amended by" note — they are the two links of this section.

## 6. Pages are self-contained

Inline CSS, JS and SVG; no external resources (a plan board's or the live work board's own
sidecar, `plan.js` or `board.js` beside the page, is its data, not a resource: the page renders
without it and re-reads it only while its run is live, `plan/RULES.md` §1); light and dark; no horizontal page scroll at
phone width (diagrams scroll inside their own frame); every control reachable by keyboard (every tablist: Left and Right, Home and End, one
tab in the Tab order, a roving tabindex);
under 16 MB. On a wide desktop screen (over 1500 px) every page — system, supersystem and repository
pages, plan and tracking boards, the work board — uses most of the window rather than a fixed measure,
so the plan boards' timeline columns, the cards, the Guarantees, the C4 canvas and the tables get room;
prose keeps its own line length, and a diagram drawn to a fixed aspect grows to at most 1280 px wide,
so it is never smaller than in the 1280 px layout and never outgrows the screen.
**The header.** Every dashboard type — system, supersystem and repository pages, plan and tracking
boards, the work board — lays its header out the same way. The topbar runs across the top: the
breadcrumb, and right of it the live indicator (plan boards and the work board: the live work board follows the runs, the committed one
reads "not live · as of" its generation; a state page has none) and the
theme switch. From 940 px wide the rest is two halves: the **intro** — the title (on a plan board `#n · title`, its `#n` the link
to the GitHub issue), on a plan board the issue line (the issue's title on GitHub, and nothing else), and the
function paragraph — fills the **left half**, the function stretched across it rather than held to a
prose measure; the **tags** stand in the **right half** beside it, each a small card with its label
over its value, growing to fill its line, a long one (a tracking board's chain, three systems or
more) across the half. Under 940 px the two stack, intro first, and the tags wrap as chips with the
label before the value. A tag is a fact with its label (`<span class="ck">label</span> value`); one
fact is one tag (the board's systems are one tag, each system with its swatch), and no tag repeats what the KPI tiles count or what
the footer names (a plan board and the work board carry no "board" tag: their source is in the footer and the Source tab); a page's
hand-written header keeps the same form (`system/RULES.md` §2).

**Sidecars.** A plan board's `plan.js` (and the work board's `board.js`) is committed with its page: a clone opened from disk then polls it
while the run is live, as the board on this machine does; the committed work board, which is not live, reads it but never polls.

Each template is checked for this once, in a headless browser, in light and dark, at a narrow
width (520 px is the narrowest headless Chrome lays out; the real phone width is verified
through the checker's iframe harness) and on a 1920 x 1080 desktop; a page inherits it from its
template, and is checked again only where it diverges (§8).

**Times.** The data keeps every time as a UTC ISO stamp (`2026-10-23T01:55:00Z`), as now. A page
shows each one in the viewer's own time zone, with the zone's abbreviation ("23 Oct 2026, 03:55
CEST", or the locale's equivalent), as a `<time>` whose `datetime` and `title` hold the exact UTC
value. This covers every time a page shows: the WIP strip's since and updated, the units' run
mirrors, the trail, milestones, the work board's generated stamp, and an as-is stamp where it
carries a time. A date alone stays a date. Hand-written HTML (a system page's header or panels)
writes a time as `<time datetime="…Z">…</time>` and the page localises it. The checks never depend
on the machine's time zone: they compare against the UTC source, and the browser pass fails a
zoned ISO stamp left as plain text outside code and the Source view.

## 7. Divergence

The global template is the general one; a repository may keep its own under
`docs/dashboards/_template/` or `docs/plans/_template/`, and a page may diverge from a template
when its subject is better shown another way. A divergence should primarily **add**. Removing
content — a core tab, a standard bubble, a column, a legend — needs a strong argument, such as
no data for it existing, and the argument goes with it, in the page's footer comment and in the
presenter's report. A page **declares** each divergence in its head, as
`<meta name="template-divergence" content="what and why">`, so the checker knows what to check.
When a divergence would serve every page in the repo, it goes in the repo template instead.

**Type divergences** are the rules' own, declared here for a whole page type rather than on a page: on **system, supersystem and
repository pages** an issue's state reads open or closed and never the tracker's reason ("closed · not planned", "closed · duplicate" are
the plan boards' and the work board's), there is no "GitHub ↗" beside a lone `#n` (the number opens the board, or GitHub while there is
none), and nothing above the Context section names an issue (§5, "A state page is as-is"): a state page is as-is, not as planned or created.

## 8. Checks

**The template is verified once, in the skill; a page is checked only where it deviates.** A
template's own structure, tabs, legends, themes and responsive layout are verified by
`verify/verify-templates.js`, which renders it with fixtures covering its states, runs the full
browser pass on each (light, dark, 520 px, a 390 px frame, a 1920 x 1080 desktop) and records the template's hash in
`verify/verified.json` (a repository's `_template/` records its own beside it). Run it after
every template change; until it has run, a changed template counts as a divergence on every
page made from it.

Every page, before it is committed, passes its set's checker in `--auto` mode
(`plan/scripts/check.js <folder> --auto`; `system/scripts/check-page.js <page> --auto`):

| The page | Checked |
|---|---|
| any page | its data and its rules (`check.js`), the embedded copy matching its data file (on a plan board and the work board, its live sidecar too), no dead `href="#"`, no external resource, no work level in its text (§4), no system colour in a status spectrum (§1) |
| a plan board or the work board that is a verified template plus its data | nothing more: no browser pass |
| a system, supersystem or repository page whose CSS, tabs and script — before `MODEL` (less its page-filled lines, such as `REPO` and `SRC`) and after it — are the verified template's | one light pass, for the facts it fills in: no script error, every tab drawn with its legend, the Guarantees, Context, no git-ignored registry file |
| a page that diverges — declared, undeclared, made from an older template — or whose template changed since it was verified | the full pass: light, dark, 520 px, a 390 px frame, a 1920 x 1080 desktop |

A difference nobody declared is a warning: re-render the page from the template, or declare it
(§7). `--browser` (plan) and a plain `check-page.js` run still force a pass when wanted.

**Features.** A page is also held to every feature its template has, whatever its pass: `system/scripts/features.js` keeps one detector per
template feature, tagged with the skill step that added it and the page types it applies to (and, for each type it does not fit, why).
`check-page.js` (`--auto`, `--auto --no-browser` and its plain passes) and `check.js --auto` run the static ones on every page — the theme
switch and its script before the first paint, the dark palette, the labelled tags, the 1500 px layout, the `BOARDS` map, the live
indicator present or absent by type, one-line ledes, reduced motion wherever anything animates, a tabindex on every role=button, the
tablist's keys, the state block, the as-is header, the legends of Guarantees and Context, the work-board link, the links from the data,
the Markdown copies, the progress notes, a tracking board's steps, the KPI bars, the neutral bug badge, the chain, core subsystems, the tiles'
legends inside each tile, no "board" tag, the title's `#n`, "since" said once by the step panel, the larger charging arrow, the landing
step, the Tests tab, the Timeline tile's legend of step visits, a reference's section number before its excerpt, no work level in the page's data, a
plan board's finished steps clickable, each unit row's label glowing on its own while it is filed, the Timeline tile's figure the sum of
its visits, an issue's title quoted and marked, every qa pass and the one running as ordinals, the dependency bubbles — and
the browser pass the layout ones (the header's halves, the wide page, the legends shown). A missing feature fails, as `FEATURE MISSING:
<feature> (template since dashboards-skill/N)`, **through a declared divergence too**: a divergence adds or argues a removal; it never
excuses a page that lags its template. A landed or cancelled issue board is the exception: it is kept as it landed and never
re-rendered (§11), so its newer features are reported, not failed. `verify/verify-templates.js` holds every template to every detector that applies to it. The fix is
the splice (§11). On the data-only path (`apply-state.js`) the misses are notes and `enrich: yes`, never a refused stamp.

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

## 11. One change, every dashboard type

Every convention change or improvement made for one dashboard type is considered for every other
type — system pages, supersystem and repository pages, plan boards, tracking boards and the work
board — and applied wherever it fits: in this file when it is shared, in each ruleset, template,
script and check it touches, with `verify/verify-templates.js` run after the template changes. Where
it does not fit a type, the reason is stated. The presenter's report names, for each change, the
types it was applied to and the types it was judged not to fit, with the reason, and the pages
already in repositories that the change would re-render.

**Re-rendering: who brings which page onto the template, and when.** A template change reaches the pages at these moments, and no
other:

| Page | Brought onto the current template |
|---|---|
| system, supersystem and repository pages; the committed work board | at a **landing refresh** only (`system/scripts/splice.js` for a state page: the template's CSS, script before MODEL and renderer carried onto the page, three ways for a declared divergence; `board.js --refresh-template` for the work board) |
| the live work board | at **every event** (`board.js --live --refresh-template`: it is the template plus its data, never committed) |
| an issue's board that is in flight, and its tracking board | at **its own events** (`apply-event.js` re-renders a board that is not the verified template plus its data) |
| a landed issue board | **never**: it is the record of a finished run, kept as it landed |

**Finished steps, clickable** (admin-team/dashboards-skill/24): applied to plan boards and tracking boards (a tracking board for its
own steps and for each unit in progress through its mirror), where the progress strip is (`plan/RULES.md` §3, "Finished steps"). Not to
the work board, which has no progress strip — one row per run, its step as text, the run's steps on its own board — and not to system,
supersystem and repository pages, which show the code at a commit and no run's steps. The highlight of the step shown is an ink ring,
never the accent (§1).

**The decisions of admin-team/dashboards-skill/28**, each weighed for every type:

- **The Timeline tile's figure is the sum of the phases its bar draws** (§1, "Steps"; `plan/RULES.md` §2; since dashboards-skill/32 the visits its bar draws): applied to plan boards and
  tracking boards (one tile, one rule: `lib.js` `timelineTotal()`, the template's `timelineTotal()`). Not to the work board, which has no
  Timeline tile (one row per run), nor to system, supersystem and repository pages, whose tiles are hand-written counted facts and show no
  run's phases.
- **An issue's title is quoted verbatim; one that names a work level is flagged as the issue's defect** (§4): applied to every type — plan
  and tracking boards (the issue line, the roadmap, the follow-ups), the work board (its rows, groups, roadmap and unscheduled issues), and
  system, supersystem and repository pages (the Context's titles and the "last amended by" note), each title marked `data-issue-title`.
- **A board at research with no rows is a defect** (`NO ROWS AT RESEARCH`, `plan/RULES.md` §3, §8): applied to issue boards and sub-issues'
  boards. Not to a tracking board, whose rows are its units, written from its architecture at the sign-off, after its research (it has no
  rows at research by design); not to the work board or the state pages, which have no research step.
- **Each unit row's label glows on its own while it is filed, then while its board is created** (`plan/RULES.md` §3, §4): applied to
  tracking boards, the only type with those steps. Not to the work board, which marks runs and shows filing as the tracking issue's own
  step on its row (a unit's row there glows only once its run is under way), nor to the state pages, which show no run.

**The decisions of admin-team/dashboards-skill/30**, each weighed for every type:

- **The work board drops its board-link and branch columns** (the title is the link to the board; the branch shows in the state column
  while there is one): the work board only. Not to plan or tracking boards, which have no such columns (the branch is a header tag, and a
  unit's title links its board already), nor to the state pages, which list no runs.
- **Every qa pass is shown, the pass running included** (the defect: a pass in progress was recorded nowhere `board.js` or the page read):
  applied to the work board (`lib.js` `qaShown()`, a unit's from its own run, not the tracking board's `wip`), to plan boards (the QA tile,
  the WIP strip's qa pills) and to tracking boards (each unit's run mirror). Not to the state pages, which show no run.
- **QA pass numbers as ordinals** (1st, 2nd, 3rd): applied to the work board's QA cell and to plan and tracking boards' qa pills and QA
  tile. The step panel's prose ("Answering qa pass 1", a remediation sub-step "qa pass 2") keeps the pipeline's own words. Not to the
  state pages: no qa passes.
- **Depends on, with a build state and a locality; Blocks · enables** (§1, "Dependencies"): applied to the work board (two columns), to
  plan boards (the WIP strip's `wip.blockers`) and to tracking boards (each unit's dependencies and the units it holds up, in its
  inspector). Not to system, supersystem and repository pages: a state page is as-is and names no issue above its Context, and its Context
  lists issues open or closed, not their dependencies.

**The decisions of admin-team/dashboards-skill/31**, each weighed for every type:

- **The decision not to run another qa pass, shown** (§1; `plan/RULES.md` §5, "QA"): applied to the work board's QA column, plan
  boards (the QA tile's sub-line, the WIP strip's qa pills) and tracking boards (each unit's run line, bubble and inspector), all from
  one rule (`lib.js` `qaShown()`, `qaInPlace()`, and the templates' copies). Not to the state pages: they show no run. A landed board is
  never re-rendered (§11, above), so a landed plan board shows the mark only if it is re-rendered for another reason; the work board shows
  it for every row whose pass records the route.
- **The Runs tab's content larger, but Now** (`plan/RULES.md` §5, "Its columns"): the work board only, the one dashboard with a runs
  table. Not to plan or tracking boards: their rows are a timeline grid whose sizes the board's own rules set, and a tracking board's
  units already read at the grid's size; not to the state pages, which list no runs.

**The decisions of admin-team/dashboards-skill/32**, each weighed for every type:

- **The Timeline tile: one line per visit of a run step, from the record only** (§1, "Steps"; `plan/RULES.md` §2, "The Timeline tile's
  legend"): its start → end and its duration in minutes, hours and minutes, or days and hours, never "same day"; a time from the
  board's snapshots, its sizing stamp and qa passes, the merge's time and the branch's step commits from git, a neighbour's bound, else
  "—"; the bar one segment per timed visit, its legend one entry per visit; a landed board's Timeline across the KPI row. Applied to plan boards
  and tracking boards (a tracking board's own steps: sizing to its plan's landing, then its units' runs as `implementation`), one rule in
  `lib.js` `timelineSteps()` and the template. Not to the work board: its Landed tile counts runs and says no time, so it has no "same
  day" to replace, and each run's steps are on its own board. Not to system, supersystem and repository pages: their tiles are counted
  facts written by hand and show no run. A landed board is re-rendered for it only where the user asks (§11, above: WebTools #63's board
  was).

A **planning-docs landing** — a docs pull request that resolves no issue (a plan folder, a roadmap document) — triggers a small landing
refresh: the committed work board, and the repository page where the repository has one.

## 12. Elements — one name per function

Every visible element has one name, chosen by what it does, never by its look; the look follows
§1 and §2. A compound name puts the subject first and the type last (`guarantee card`, `unit
card`, `verdict pill`, `issue chip`, `step cell`, `KPI tile`), so the type vocabulary stays small.
The templates' CSS classes and the data keys carry the type word (`.card`, `.pill`, `.chip`, …),
so a reader can tell an element's kind from the markup without the page. "Bubble" names
nothing: a Guarantees sub-area is a **guarantee card**, a tracking board's unit block in the WIP
strip is a **unit card**, and a step in the step panel is a **step cell**.

**Containers, by how much they hold**

| Term | Function | Examples |
|------|----------|----------|
| **Panel** | A top-level region of a page with its own heading. | a tab's body, the Guarantees area, the Context section, the WIP strip, the step panel, the KPI row |
| **Card** | A self-contained statement inside a panel, with a title and a body, readable alone. | a guarantee card, an Impact entry, an As-built entry, a unit card |
| **Tile** | A card whose body is one figure with its segmented bar and legend. | the KPI tiles, the work board's Runs and Landed tiles |
| **Cell** | The intersection of a row and a column on a board table. | a Gap, Considered, Verdict or As built cell; a step cell |
| **Row** | One subject across a board's columns. | an issue board's design point, a tracking board's unit |

**Labels, by what they say**

| Term | Function | Examples |
|------|----------|----------|
| **Pill** | A state word with its glyph, in a status colour. | a verdict pill, an as-built pill, a dependency pill, the research-state pill |
| **Chip** | A reference that names or opens something, neutral. | an issue chip, the "part of" chip, a branch chip, the chain chip |
| **Badge** | A count or classification fixed to a card's corner. | the effect, need and API-change badges |
| **Tag** | Plain text over an element that classifies it without a status colour. | `Planned`, `UP NEXT`, `Context` |

**Marks, by what they overlay**

| Term | Function |
|------|----------|
| **Ring** | A border-only state on a cell (the research scale, §1). |
| **Glow** | The interior in-progress accent on whatever is being worked on (§1). |
| **Arrow** | The charging connector into a Verdict cell (§1). |
| **Legend** | The key for a colour grouping, one per tab or per tile (§2); a landed board's Timeline tile's legend has one entry per step visit, with its times (`plan/RULES.md` §2). |

A ruleset that needs an element none of these names describes adds the term here first, with its
function, and uses it everywhere; it never reuses a term for a second function.
