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
| **green** (`--good`) | accepted, done as decided, passing | an accepted option; an `as-planned` part; a passing qa gate; a `complete` unit (qa passed, drawn outlined: not merged yet) and a `landed` one (merged) |
| **yellow** (`--warning`) | in between: partly adopted, amended, waiting | a `partial` option; an `amended` part; an option left `deferred` at plan time; a halt waiting on the user |
| **red** (`--critical`) | declined, dropped, failing | a `declined` option; a `dropped` part; a failing gate |
| **orange** (`--serious`) | changed course | a `deviated` part (the decision itself changed) |
| **neutral** (ink/grey) | no outcome yet, or not applicable | a `pending` part; a `deferred` part (with its issue); counts and facts |

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
yellow. The data keeps the impact's basis for the checks (`plan/RULES.md` §2, Impact).

**Work in progress and the next one up: two accent marks.** The accent colour marks two things
and nothing else, each with its own look and its own legend entry:

- **In progress** — the thing currently being worked on (a plan board's `wip.current`, an active
  run on the work board) carries an **interior glow**: a solid accent ring inside its edge, a faint
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

Nothing else animates. At most a handful of elements are in progress at once; if everything
glows, nothing is current.

**Line and fill encodings.** Solid = built, done, decided. **Dashed = planned or pending**, on
every tab of every page but one, and dashed means nothing else. The exception is a plan board's
Impact tab, which draws nothing dashed (above). Dotted = standalone or conditional where a
ruleset uses it. Filled vs outlined only where the legend says what it means.

**Themes.** Every colour is a token on `:root`, redefined for dark mode; status and system
colours are validated for contrast in both themes (the `dataviz` skill's validator). Dark mode
is selected, never computed by flipping.

## 2. Legends

Every tab, panel or board shows a visible legend (`class="key"`) listing exactly the encodings
it uses — the system swatches present, each status colour with its glyph and word, dashed,
dotted, the in-progress glow, the up-next mark — and nothing it doesn't. A legend that promises
an encoding the panel never draws is a defect; so is an encoding with no legend entry.

**Ledes.** The legend says what the encodings mean, so a tab's lede does not: it is at most one
short line, and only for what the graphic and its legend do not show (what to click, a fact the
picture cannot carry), or nothing. This holds on every page: the plan boards' tabs, the system,
supersystem and repository pages' tabs, the work board's.

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

**No work levels.** The rule covers only the **work levels** of the `/resolve-issue` pipeline (level 1
to 4, the `level: N` label), and nothing else. A dashboard never shows an issue's work level: no "level 3", "L3",
"level: 2", "a level-3 change" or "escalated to level 4", in a chip, a badge, a column, a chain
node, a legend, a lede or any text the presenter writes. Say what the work is instead: one
system, a bug fix, docs only, a tracking issue. The work levels stay in force everywhere else;
a plan keeps its level as data where a script needs it (`plan.json` `level`, `unit.level`,
`wip.proposedLevel`), and no page renders those fields, the Source tab included. The test
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
title opens the issue's own board, or stays plain text while it has none. A tracking board's
unit row is the example: `1. #61 Shared build logic`, where `#61` opens issue 61 on GitHub and
"Shared build logic" opens its board. Where **only one link fits** — a bare `#n` in text, a
chain node, a "blocked by #n" tag, a deferred badge, the "part of #n" chip — the `#n` opens the
issue's board when one exists and the GitHub issue while none does. A small "GitHub ↗" link
sits beside such a lone `#n` only where the page offers no other way to reach the issue. A link
never points at a file that is not there (`plan/RULES.md` §1).

The rule holds on every page. The plan boards and the work board take their board links from their
data (`embed.js`, `board.js`); a system, supersystem or repository page takes them from its `BOARDS`
map, filled when the page is written, and its hand-written HTML marks a title link
`<a data-board="N">` and a lone `#n` `<a data-issue="N">`, which the page resolves at load
(`system/RULES.md` §6). Where the page's Context lists an issue's number and its title — the roadmap,
the unscheduled issues, the header's "last amended by" — they are the two links of this section.

## 6. Pages are self-contained

Inline CSS, JS and SVG; no external resources; light and dark; no horizontal page scroll at
phone width (diagrams scroll inside their own frame); every control reachable by keyboard;
under 16 MB. On a wide desktop screen (over 1500 px) every page — system, supersystem and repository
pages, plan and tracking boards, the work board — uses most of the window rather than a fixed measure,
so the plan boards' timeline columns, the cards, the Guarantees, the C4 canvas and the tables get room;
prose keeps its own line length, and a diagram drawn to a fixed aspect grows to at most 1280 px wide,
so it is never smaller than in the 1280 px layout and never outgrows the screen.
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
| any page | its data and its rules (`check.js`), the embedded copy matching its data file, no dead `href="#"`, no external resource, no work level in its text (§4), no system colour in a status spectrum (§1) |
| a plan board or the work board that is a verified template plus its data | nothing more: no browser pass |
| a system, supersystem or repository page whose CSS, tabs and script — before `MODEL` (less its page-filled lines, such as `REPO` and `SRC`) and after it — are the verified template's | one light pass, for the facts it fills in: no script error, every tab drawn with its legend, the Guarantees, Context, no git-ignored registry file |
| a page that diverges — declared, undeclared, made from an older template — or whose template changed since it was verified | the full pass: light, dark, 520 px, a 390 px frame, a 1920 x 1080 desktop |

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

## 11. One change, every dashboard type

Every convention change or improvement made for one dashboard type is considered for every other
type — system pages, supersystem and repository pages, plan boards, tracking boards and the work
board — and applied wherever it fits: in this file when it is shared, in each ruleset, template,
script and check it touches, with `verify/verify-templates.js` run after the template changes. Where
it does not fit a type, the reason is stated. The presenter's report names, for each change, the
types it was applied to and the types it was judged not to fit, with the reason, and the pages
already in repositories that the change would re-render.
