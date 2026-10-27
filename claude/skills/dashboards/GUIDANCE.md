# Dashboard guidance — the rules both sets share

These rules apply to every board the presenter makes: a system board, a supersystem or
repository state board, an issue board, a tracking board, the repository work board. A
ruleset (`system/RULES.md`, `plan/RULES.md`) adds to them and never loosens
them. A change to any of them is weighed for every dashboard type (§11).

**Dashboards and boards.** "Dashboard" is the umbrella for two groups, and every member of either is a
**board**, never a "page" (GitHub Pages is something else):

| Group | Shows | Its boards |
|-------|-------|------------|
| **State boards** (`docs/dashboards/`, `system/RULES.md`) | what the code is and does at a named commit | the **system board**, the **supersystem board**, the **repository state board**; planned: the **org project board**, the **intra-org dependency board** |
| **Work boards** (`docs/plans/`, `plan/RULES.md`) | how the work is going | the **issue board**, the **tracking board** (a tracking issue's issue board), the **repository work board**; planned: the **org work board** |

A board's own word for itself, in its text and its labels, is "board"; the file names and the scripts follow
(`system/scripts/check-board.js`). The kind ids the scripts and the data use — `plan-board` (an issue or a tracking
board: the `<meta name="dashboard">`, `plan.json`'s `schema: "plan-board/1"` and the protocol's `plan-board` request)
and `work-board` — are identifiers and keep their spelling.

## 1. Colour coding

Colour means one thing per board, and the same thing on every board of a repo.

**Categorical: one colour per system.** Every system in `docs/dashboards/systems.json` owns
one colour slot, assigned in registry order (six slots; a system's parts inherit its parent's
colour; a seventh top-level system is never silently grey — re-parent, or add a slot and record
it). A system keeps that colour on **every tab of every board**: its card and rows on the system,
supersystem and repository state boards, its rows on every issue board and on the repository work board. A reader who
learns the colour once can follow the system everywhere. On a system board the three sides
(`--server`, `--client`, `--wire`) are slots 1 to 3.

**Status spectra are reserved.** Wherever a view needs two colour schemes and a yellow–orange–red
or green–yellow–red spectrum fits a status, that spectrum carries the status, and every other
colour indicator on the view avoids it. The issue boards colour an option's status green, yellow
and red, and the Consequences tab colours compatibility yellow and red (orange where useful), so the
system palette leaves out green, yellow, orange, amber, red and pink: its six slots are blues, a
teal, an indigo and purples, the same on every board and in both themes
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
(HSL saturation 0.15 or more) and its hue is outside 175°–295°; `check.js` and `check-board.js` fail
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
| **neutral** (ink/grey) | no outcome yet, or not applicable | a `pending` part; a `deferred` part (with its issue); an impact still planned (dashed); an issue closed as not planned or as a duplicate ("closed · not planned", "closed · duplicate": never landed; issue boards and the repository work board only, §7); a `bug` label ("▲ bug": a label, not an outcome); counts and facts |

**The exception: compatibility on the Consequences tab** (named the Impact tab before admin-team/dashboards-skill/35; its ids, its
`#impact.<entry>` deep links and its data key `impact` are kept, the document it reads is `consequences.md`, `impact.md` in an older folder).
On an issue board's Consequences tab, red and
yellow mean **compatibility**, not outcomes, because what a reader needs from that tab first is
whether the change breaks them. **Red** (`--critical`) is a breaking change: a `breaking`
downstream effect, a `removed` surface, a required adaptation that breaks a consumer that does
not make it. **Yellow** (`--warning`) is a deprecation or another non-breaking change worth
noting: a `deprecated` or `changed` surface, a `behaviour` change, a required adaptation that
does not break, a lettered or strict-version requirement and the like. Every other entry keeps
**its system's colour slot**. The cards and their effect, need and API-change badges take these
colours, always with a glyph and a word. Nothing else on that tab is red or yellow. Everywhere
else the scale above holds.

**No planning information on the Consequences tab.** The tab shows only the current best-known impact:
no pill for its standing (planned, as built, amended), no list of changes from the planned impact,
and one solid card style for every entry, whether the impact is still the plan's or reconciled.
Nothing on that tab is dashed. The plan-versus-build story stays on the As built tab, and that
includes the impact's: the As built tab shows how the impact differed from the plan
(`impact.changes`, and on a tracking board each unit's own), each change a solid card in its
system's colour linking the Consequences card it changed, never in the Consequences tab's compatibility red or
yellow. Those changes accumulate as the work lands, on a tracking board as each unit lands, while the
impact is partly reconciled; it is reconciled whole at the landing, a tracking board's at its last
unit's. Every landed unit records its effect on the initiative's impact — the changes it made, or an
explicit "no change" — so "None so far" is said from a record, never from an absence. The data keeps
only the impact's basis (`plan` or `as-built`); the **reconciliation state** — planned, partly
reconciled, as built — is derived from the data, never stored, by one rule in each runtime, and shows
as a chip on the As built tab and on the repository work board, never on the Consequences tab: planned neutral and
dashed, partly reconciled yellow, as built green, each with its glyph and word (`plan/RULES.md` §2,
Consequences).

**Test levels: a neutral ramp.** On an issue board's Tests tab (`plan/RULES.md` §2) a test class is coloured by its test level, the
five-level testing hierarchy's L1 gating to L5 UAT, as a ramp of neutrals from the faintest (L1) to the full ink (L5), in either theme, each with its level label:
the levels are an order, not systems or outcomes, so they take neither a system slot nor a status colour, and the class's latest result
keeps the status scale (passed green, failed red, each with its glyph and word).

**Dependencies: a status pill and a neutral ramp** (admin-team/dashboards-skill/30; the build state redefined by dashboards-skill/35). A
dependency on the repository work board ("Depends on"), on an issue board's WIP strip ("depends on") and in a tracking board's unit inspector
carries one dependency pill of two states. Its **build state** says whether the dependency's **code** is there — the code is the blocker,
never the GitHub issue — and takes the status scale, with its glyph and word: `blocking` yellow (⊘: its code is not merged yet), `clear`
green (✓: its code is merged, in a plan or not; an issue still open whose pull request has merged reads clear), `pre-built` neutral (◼:
outside the plan and merged before the plan started — the plan's outcome does not apply to it; it takes precedence where clear fits too),
`dropped` red (✕: closed as not planned — the dependent waits on code that will never arrive, and its plan needs another look). A
dependency closed as a duplicate takes the state of the issue it duplicates. Its **locality** is an order, near to far, so it takes a **neutral ramp**, faintest to full ink, never
a system slot or a status colour, each with its glyph and word: `local-repository` (⌂ repo), `local-organization` (◇ org),
`local-parent-org` (△ parent org), `external-<name>` (↗ external · name). What an issue holds up ("Blocks · enables") takes the status
scale: `blocks` yellow (⊘: still open), `enables` green (→: done). A state no rule fits is not drawn (`plan/RULES.md` §5).

**Visibility: a neutral ramp** (admin-team/dashboards-skill/35). A system's visibility (`systems.json` `visibility`, `system/RULES.md` §7) —
who consumes it — is an order, near to far, so it takes a neutral ramp, as a dependency's locality does, each with its glyph and word:
`internal-repo` (⌂ internal · repo, the faintest), `internal-org` (◇ internal · org), `public` (↗ public, the full ink), and `unset`
(? visibility not set, dashed edge: no record yet). It groups the repository and supersystem state boards' Systems tab, one group per
visibility with its chip as the heading and its legend entry, and is a candidate grouping on another tab where it fits; a system board
names its own in a header tag. Never a system slot or a status colour: a card keeps its system's colour inside its group.

**Archived: solid, faded, tagged** (admin-team/dashboards-skill/35). A system no longer developed (`status` `archived`) is drawn solid
(never dashed: dashed is planned), faded and desaturated, with a neutral tag "⊟ archived" and its legend entry; on the Systems tab it
leaves the visibility grouping for an Archived group of its own, last. Its Guarantees rows and its rows on the repository work board carry
the same tag; its own board's header says it ("status ⊟ archived").

**The decision not to run another qa pass: a neutral mark** (admin-team/dashboards-skill/31). A qa pass whose findings were fixed in
place, with no further pass (its `on-the-spot` route), carries a small neutral mark beside its verdict pill, with its glyph and words:
"✎ fixed in place · no 2nd pass" ("fixing" while the fixes are being made). It is a decision, not an outcome: it takes no status colour,
and the pass keeps its own verdict pill (`plan/RULES.md` §5, "QA").

**Steps: four kinds of work** (admin-team/dashboards-skill/34, in place of dashboards-skill/32's neutral ramp). An issue board's Timeline
tile (`plan/RULES.md` §2, "The Timeline tab"; every issue board's since dashboards-skill/34, a board in flight its steps so far) draws the time
of each visit of a run step (sizing, research, plan, …, qa, remediation, document, landing, merge; a tracking board's own steps), each visit an entry of the tile's legend with its start → end and its duration (admin-team/dashboards-skill/32),
coloured by the **kind of work** its step is, four hue families, each named in the tile's own legend of families with the steps it drew:

| Family | Its steps | Hue | Light: first → last | Dark: first → last |
|--------|-----------|-----|---------------------|--------------------|
| **planning** | sizing, interview, research, architecture, plan; a tracking board's sub-issues and boards (its last planning, before its plan lands) | blue | `#5596de` → `#1d5cab` | `#3a7fd0` → `#80b6f0` |
| **build** | branch, implementation (a tracking board's: its units' runs) | teal | `#1f9294` → `#0c5c61` | `#1a8a8c` → `#4cc4c2` |
| **checking** | qa, remediation | purple | `#b67ad0` → `#84409f` | `#a35cbd` → `#d095e6` |
| **landing** | document, landing, merge (the Document step, the land's preparation on the branch, and the land's two steps, admin-team/dashboards-skill/35; an older board's landing, state-boards and merge, or its landing alone) | deep indigo (light) · pale indigo (dark) | `#2e3d99` → `#1d2870` | `#b8c4fa` → `#d4dcfd` |

The steps of a family take **distinct shades of it**, lighter to darker in the steps line's order on a light surface (darker to lighter on a
dark one: the first step nearest the surface, the last the strongest), mixed between its two ends (`--wk-<family>-a`, `-b`); a family of one
step takes the middle of its two ends; a step's repeats (qa · 2nd pass, remediation · loop 2) share its shade. The colour is the bar's
segment and the **mark in front of each step line**: filled for a visit the bar draws, outlined for one it does not (a bound not recorded),
and the tile's legend says so. The families stay clear of the status colours and the research scale (no green, yellow, orange, red or pink:
every shade is in the system palette's hues, 175°–295°) and of the accent (the in-progress glow), and every shade is at least 3:1 against its
theme's card surface. They share that hue band with the system slots, as nothing else is left once the statuses and the accent are reserved;
the tile's legend of families says what they mean there, and a system's colour is never read off the Timeline tile. A step outside the four
(none today) keeps the neutral ink, as "other". A time not in the record is drawn "—", never guessed; a visit without both times is not drawn.
An **approximate** time — on a board backfilled at the user's request only, the time a step's update reached the team (`asBuilt.approx`) — is
drawn "≈", never as a recorded one, and never crosses a recorded time (`plan/RULES.md` §2). The running step of a board in flight runs to
"now", its time and the figure "so far". The same colours draw each KPI tile's **tracer** (§12): from the tile up to the part of the Timeline
tile it belongs to, in its steps' kind of work, labelled with their time.
The tile's figure is the sum of the visits its bar draws, never baseline to built: a visit left out of the bar is left out of the sum
(admin-team/dashboards-skill/28).

**Work in progress and the next one up: two accent marks.** The accent colour marks two things
and nothing else, each with its own look and its own legend entry (the charging arrow, below, is
the in-progress mark of a connector):

- **In progress** — the thing currently being worked on (an issue board's `wip.current`, an active
  run on the repository work board; on an issue board its as-built pill reads `▶ in progress` in the accent, solid) carries an **interior glow**: a solid accent ring inside its edge, a faint
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

Two more marks belong to the work in progress on an issue board, and to nothing else
(`plan/RULES.md` §3): the **charging arrow**, the connector into a Verdict cell whose verdict the plan
step is writing, a battery of accent segments filling left to right (held still, filled, while the
run waits on the user and under `prefers-reduced-motion`); and the **live indicator**'s dot in the
header of an issue board or the live repository work board, ink, never a status or accent colour, which pulses
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

**Research state: the research scale.** On an issue board, a row the run's research questions name
carries a **ring** (its Considered cell's border, never a fill) in a status spectrum of its own, from
red to green: **red** planning (the question is being drafted), **orange** researching, **orange
with a check** returned (awaiting verification), **yellow** verifying, **green** complete (kept until
the plan is accepted). A pill in the cell's head says the state with its glyph and word, and the
Design tab's legend names each state it drew. The ring and the in-progress glow coexist: the glow is
the activity, the ring the research's progress (`plan/RULES.md` §3).

**Line and fill encodings.** Solid = built, done, decided. **Dashed = planned or pending**, on
every tab of every board but one, and dashed means nothing else. The exception is an issue board's
Consequences tab, which draws nothing dashed (above). No ruleset may use a dash for anything else:
diagram furniture is solid — sequence lifelines and boundary frames faint and solid, a return message
a thin solid line told by its open arrowhead — and only a planned lifeline, message, element or
relationship is dashed. `check-board.js` fails a dashed element that marks nothing planned or pending,
on every tab of every kind of board, every C4 view included, and a `workspace.dsl` style that dashes
a tag other than `Planned`. Dotted = standalone or conditional where a ruleset uses it. Filled vs
outlined only where the legend says what it means.

**Themes.** Every colour is a token on `:root`, redefined for dark mode; status and system
colours are validated for contrast in both themes (the `dataviz` skill's validator). Dark mode
is selected, never computed by flipping. Every dashboard type — system, supersystem and repository
boards, issue boards, tracking boards, the repository work board — carries a **theme switch** in its header, a
light/night toggle right of the breadcrumb: until it is clicked the board follows the system setting
(`prefers-color-scheme`); a click picks the other palette and remembers the choice across boards and
reloads (`localStorage` key `dashboards-theme`, shared by every dashboard of the same origin, applied
in the board's head before its first paint). It only selects one of the two palettes the board already
defines (`:root[data-theme]`); it adds no colour.

The elements these colours apply to are named in §12, one name per function.

## 2. Legends

Every tab, panel or board shows a visible legend (`class="key"`) listing exactly the encodings
it uses — the system swatches present, each status colour with its glyph and word, dashed,
dotted, the in-progress glow, the up-next mark — and nothing it doesn't. A legend that promises
an encoding the panel never draws is a defect; so is an encoding with no legend entry.

**Figures.** A tile that counts states carries a segmented bar of them, wherever it stands: an issue board's row of KPI tiles (a tracking board's as much) is a panel too, and every tile carries a
segmented bar of what its figure counts (by group, verdict, state or qa pass, `plan/RULES.md` §2, "The KPI tiles"), in the colour coding of §1 (a system's colour, a status
colour, a neutral; dashed for what is pending), and **each tile carries the legend of its own bar, inside the tile**, naming exactly the
segments that bar drew: no legend row is shared under the tiles, so every tile keeps its full share of the row. The
repository work board's Runs tile (every run by its state) and its Landed tile (landed, merged, complete, and the closed ones it does not count) carry one
too, each with its legend inside the tile. An issue board's Timeline tile, at the top of its Timeline tab with the KPI tiles below it, carries
the time per step visit (§1, "Steps"), coloured by its kind of work, and two legends: the families it drew, each with its steps' shades, then one entry per visit with its step's mark, its start →
end and its duration, a visit without both times left out of the bar, its mark outlined, and named in its sub-line; its figure is the sum of
the visits the bar draws. A tile that counts one state (the repository work board's Active, Waiting, Up next, Not started) has
nothing to segment and carries none, and so do the system boards' hand-written tiles: they are counted facts written by hand (files,
types, threads, tests), not states, so there is nothing a bar would divide.

**Sections.** The Guarantees and the Context are panels too: each carries a legend under its guarantee cards or its cards, generated from what
they draw (the system swatches, a planned row dashed, a gap, the test-level bars' one neutral series, the badges and their meaning, a
tracking issue's chain bar, a board's unit states), and none where they draw no encoding.

**Ledes.** The legend says what the encodings mean, so a tab's lede does not: it is at most one
short line, and only for what the graphic and its legend do not show (what to click, a fact the
picture cannot carry), or nothing. This holds on every board: the issue boards' tabs, the system,
supersystem and repository state boards' tabs, the repository work board's.

## 3. A board is a template plus data

A board is never hand-edited. Its content lives in a data file beside it (`workspace.dsl`,
`systems.json` and `state.json` for system boards; `plan.json` for an issue board; `board.json` for the work
board), embedded **verbatim** into the board by the set's `embed.js`. To change a board, change
the data and re-embed; to change the look, change the template and re-embed every board that
uses it. The set's checker fails a board whose embedded copy differs from its data file.

**Go off the template.** A new board or board starts as a copy of its template (the repository's
`_template/` if it keeps one, else this skill's) and changes only what its facts require: the
data file, and on a system board the `MODEL`, the hand-written panels and the header. Anything
else it changes is a divergence (§7). An issue board or the repository work board is its template plus its
data, byte for byte (`new.js`, `board.js`, or a copy and `embed.js`). A system board keeps the
template's CSS, tab set and renderer script.

**The footer.** Every board ends with one line: "Corresponds to `<source>`." and the authority sentence,
and nothing more. The source is the data file the board renders from: an issue board's
`<folder>/plan.json`, the repository work board's `docs/plans/board.json` (`docs/plans/.live/board.json` for the
live view), a system board's `workspace.dsl`, a supersystem or repository state board's
`docs/dashboards/systems.json` and `workspace.dsl`. The authority sentence is "Code and the Markdown
beside this board are authoritative on any conflict." on an issue board and the repository work board, and "Code is
authoritative on any conflict." on a system, supersystem or repository state board. A plan or tracking board
adds "Columns 1 to 3 are written once; column 4 records every difference."; no other board has columns.
No baseline, landed-state or "maintained by" clause: the header and the WIP strip carry the stamps. A
system board's divergence list stays in the footer's comment (§7). `check-board.js` fails a footer that
is not in this form.

## 4. Facts

A dashboard tells the truth about a named commit. Facts come from the code, the documents in
the repo, the issue tracker and the pipeline's own reports — never from memory of what a
system "usually" does, and never invented to fill a panel. An empty cell that says "not yet
documented" is correct; a plausible guess is not. A system board shows the code as built at the commit it names — the
default branch's, or while a feature branch's work is shown on that branch, the branch's, stamped "not yet landed"
(`system/RULES.md` §10); anything planned is drawn dashed and tagged, and never as built. An issue board's first three
columns are written once and never rewritten to match what happened; the fourth records every
difference.

**No work levels.** The rule covers only the **work levels** of the `/resolve-issue` pipeline (level 1
to 4, the `level: N` label), and nothing else. A dashboard never shows an issue's work level: no "level 3", "L3",
"level: 2", "a level-3 change" or "escalated to level 4", in a chip, a badge, a column, a chain
node, a legend, a lede or any text the presenter writes. Say what the work is instead: one
system, a bug fix, docs only, a tracking issue. The work levels stay in force everywhere else;
a plan keeps its level as data where a script needs it (`plan.json` `level`, `unit.level`,
`wip.proposedLevel`), and no board renders those fields, the Source tab included. A pipeline fact that names one ("inside level 3",
"a level-3 re-pass", "Label level: 3") is reworded before it is written — the scope phrase becomes the unit's or the issue's scope, the
level is elided before its noun, the label dropped — and left out only where a work level would remain (`system/scripts/levelrefs.js`
`scrubLevels()`, which `apply-event.js` and `apply-state.js` run); a quotation (a plan excerpt) elides it with "…" instead, as a quote
is never reworded. An unnumbered mention is a work level too: "Recorded level confirmed", "the proposed level", "the level
re-check", "the issue's level" read "Recorded sizing confirmed" and the like (dashboards-skill/33); a test level's, a log level's and a
C4 level's words are not touched. **A bare "Ln"** (admin-team/dashboards-skill/35): beside a test word ("L2 test", "tests (L3)", "regression
test (L2)") it is a test level written short, never a work level, and the fast path writes it as its named test level ("L2 component test",
"tests (L3 integration)"; L4 has no single name and stands as written; `levelrefs.js` `nameTestLevels()`), and `check.js` warns on one a
board still carries (`BARE TEST LEVEL`); anywhere else a bare "Ln" is a work level, elided by the rewording, and the fast path warns
(`LEVEL ELIDED`, its summary's `warnings`) so the elision is visible.

**No internal names** (dashboards-skill/33). Nothing a board shows or its data carries — its text, its labels, its data blocks, its
comments, the fixed text of its template — names the pipeline's agents, sessions or roles (admin team, planner, plan-writer, architect,
researcher, verifier, interviewer, presenter, publisher, rookie-dev, version-control-manager or executor, qa as an agent,
code-reviewer, documentation-reviewer, test-inspector), refers to the approval flow ("the user's call", "the user chose", "user
answers") or states a work level (above). Say what happened instead: "accepted", "a plan re-pass", "the fixes", "the land is accepted and
being merged". Fine are "the implementer" (whoever builds the change), the qa step and its passes ("qa pass 2", the QA tile), the steps'
own names (research, architecture, plan), a halt's "waiting on you", and a library's name that only coincides (OkHttp's `RoutePlanner`,
a Reactive Streams `Publisher`, a `java.util.concurrent.Executor`: executor and publisher count only with the pipeline's verbs,
"the executor commits", "the publisher released"). The data follows: the remediation routes' ids are `on-the-spot`,
`remediation` and `re-plan-then-remediation` (the older `rookie-dev` and `planner-then-rookie-dev` are read alike), the template's
placeholder mark is `fill:` (a `presenter:` mark is migrated by the splice), a progress note is labelled by the work it reports ("research
· <slug>", "code review"). `apply-event.js` rewords a pipeline fact through `system/scripts/namerefs.js` `scrubNames()` before it
writes it — the agent phrase dropped ("accepted by the admin team" → "accepted"), a possessive made the article ("the planner's re-pass"
→ "the re-pass"), a role's work named as the work ("a planner re-pass" → "a plan re-pass", "code-reviewer" → "code review"), an aside
on the approval flow dropped — and leaves the text out, telling the presenter (`enrich: yes`), where a name no library uses would remain;
a word a library may use as well (the planner, the verifier) is written and named for the presenter to look at. `check.js` and
`check-board.js` warn on any name left in a board (`INTERNAL NAME`), never failing it: the board is reworded at its next refresh. An
issue's title is quoted verbatim and left out of the scan. The pipeline's names stay in force everywhere else: in these rules, the
scripts' summaries and the template's code (the progress notes' file names are the agents' own).

**An issue's title is quoted verbatim** (admin-team/dashboards-skill/28). Wherever a board shows an issue's title — an issue board's issue
line, a roadmap item, a follow-up, a work-board row, group, roadmap item or unscheduled issue, a state board's Context and its "last amended
by" note — it is the issue's own, never reworded and never elided. Work levels are internal to the pipeline and never part of an issue, so
a title that names one is a **defect in the issue**, not in the board: `plan/scripts/check.js` (on `plan.json` and `board.json`) and
`system/scripts/check-board.js` (a state board's Context titles and `lastAmended.title`, and in its browser pass every title the board marks
`data-issue-title`) flag it, `ISSUE TITLE NAMES A WORK LEVEL: #n`, as a warning and never fail the board for it, and `apply-event.js` and
`apply-state.js` name it in their summary's `issue defects`; the admin team brings it to the user to retitle on GitHub. The rule above
holds for everything else on the board, the quoted titles' text aside (`levelrefs.js` `issueTitleRefs()`, `titleSkip()`). The test
levels of the five-level testing hierarchy and the C4 model's levels are not work levels: the rule
does not touch them, and they keep their level labels — "L1 gating", "L2 component", "L4a
deterministic", "L5 UAT", "Level 2 — component", "Level 1 · System Context". `plan/scripts/check.js`
fails a board whose text names a work level, and the browser pass fails a board that shows one
(`system/scripts/levelrefs.js` holds the forms; it matches work-level forms only, never a test
level's or a C4 level's label, and never "Level 3" alone).

## 5. Context, roadmap, work

Below the main content, a section headed **Context** (never "secondary") holds the roadmap
with each item's issues mapped under it, the unscheduled issues no roadmap item claims, and
the plans and documents. System boards and issue boards link each other both ways: a system
board's Context lists the issue boards that amended it; an issue board names its systems and
links their boards; the repository state board links the repository work board.

**An issue's number and its title.** Where an issue's number and its title appear together — a
unit row, a roadmap item, a work-board row or group heading, the WIP strip's unit lines, the
inspector's unit entry — they are **two links**: the number opens the GitHub issue, and the
title opens the issue's own board, or stays plain text while it has none. An issue's title is quoted verbatim (§4); a unit's name, the
presenter's, is not a quotation. A tracking board's
unit row is the example: `1. #61 Shared build logic`, where `#61` opens issue 61 on GitHub and
"Shared build logic" opens its board. Where **only one link fits** — a bare `#n` in text, a
chain node, a "blocked by #n" tag, a deferred badge, the "part of #n" chip — the `#n` opens the
issue's board when one exists and the GitHub issue while none does. A small "GitHub ↗" link
sits beside such a lone `#n` only where the board offers no other way to reach the issue, on an issue board (a system board has none, §7). A link
never points at a file that is not there (`plan/RULES.md` §1).

**Links to the shared boards, and the live views first.** The template-fixed links of every board — the repository work board, the repository state board
`docs/dashboards/index.html`, a system's board, `docs/plans/README.md` — point only at files that exist: an issue board and the repository work board
take them from their data (`plan.json` `links`, `board.json` `links`, which `embed.js` and `board.js` set from the files on disk), a state
board from its hand-written HTML and its `WORK_BOARD` line, and the words stay plain text while the file is not there; `check.js` and
`check-board.js` fail a dead one (`DEAD LINK`). Every link to the repository work board opens the **live view first**: the live repository work board on this
machine (`docs/plans/.live/index.html`, named by the marker `docs/plans/.live/index.js` that `board.js --live` writes in each checkout of the
repository), else the committed `docs/plans/index.html` (on GitHub or another clone), else plain text. Every Markdown document a board
links opens its **rendered copy** when one is on disk (`docs/plans/.live/docs/`, `plan/RULES.md` §1), else the `.md`; a "(§n)" reference
opens the copy at that section.

**A state board is as-is.** The part of a system, supersystem or repository state board above its Context — the header, the tabs, the Guarantees —
shows the code at a named commit and names no issue: no "#n", no "last amended by" chip, no "planned by #n"; a planned part links its
issue board by name ("its plan") where one exists. The issues are in the Context section: its roadmap and issue lists, and the last
amendment, said there ("last amended by #n title").

The rule holds on every board. The issue boards and the repository work board take their board links from their
data (`embed.js`, `board.js`); a system, supersystem or repository state board takes them from its `BOARDS`
map, filled when the board is written, and its hand-written HTML marks a title link
`<a data-board="N">` and a lone `#n` `<a data-issue="N">`, which the board resolves at load
(`system/RULES.md` §6). Where the board's Context lists an issue's number and its title — the roadmap,
the unscheduled issues, the "last amended by" note — they are the two links of this section.

## 6. Boards are self-contained

Inline CSS, JS and SVG; no external resources (an issue board's or the live repository work board's own
sidecar, `plan.js` or `board.js` beside the board, is its data, not a resource: the board renders
without it and re-reads it only while its run is live, `plan/RULES.md` §1); light and dark; no horizontal scroll at
phone width (diagrams scroll inside their own frame); every control reachable by keyboard (every tablist: Left and Right, Home and End, one
tab in the Tab order, a roving tabindex);
under 16 MB. On a wide desktop screen (over 1500 px) every board — system, supersystem and repository
state boards, issue and tracking boards, the repository work board — uses most of the window rather than a fixed measure,
so the issue boards' timeline columns, the cards, the Guarantees, the C4 canvas and the tables get room;
prose keeps its own line length, and a diagram drawn to a fixed aspect grows to at most 1280 px wide,
so it is never smaller than in the 1280 px layout and never outgrows the screen.
**The header.** Every dashboard type — system, supersystem and repository state boards, issue and tracking
boards, the repository work board — lays its header out the same way. The topbar runs across the top: the
breadcrumb, and right of it the live indicator (issue boards and the repository work board: the live repository work board follows the runs, the committed one
reads "not live · as of" its generation; a state board has none) and the
theme switch. From 940 px wide the rest is two halves: the **intro** — the title (on an issue board `#n · title`, its `#n` the link
to the GitHub issue), on an issue board the issue line (the issue's title on GitHub, and nothing else), and the
function paragraph — fills the **left half**, the function stretched across it rather than held to a
prose measure; the **tags** stand in the **right half** beside it, each a small card with its label
over its value, growing to fill its line, a long one (a tracking board's chain, three systems or
more) across the half. Under 940 px the two stack, intro first, and the tags wrap as chips with the
label before the value. A tag is a fact with its label (`<span class="ck">label</span> value`); one
fact is one tag (the board's systems are one tag, each system with its swatch), and no tag repeats what the KPI tiles count or what
the footer names (an issue board and the repository work board carry no "board" tag: their source is in the footer and the Source tab); a board's
hand-written header keeps the same form (`system/RULES.md` §2).

**Sidecars.** An issue board's `plan.js` (and the repository work board's `board.js`) is committed with its board: a clone opened from disk then polls it
while the run is live, as the board on this machine does; the committed repository work board, which is not live, reads it but never polls.

Each template is checked for this once, in a headless browser, in light and dark, at a narrow
width (520 px is the narrowest headless Chrome lays out; the real phone width is verified
through the checker's iframe harness) and on a 1920 x 1080 desktop; a board inherits it from its
template, and is checked again only where it diverges (§8).

**Times.** The data keeps every time as a UTC ISO stamp (`2026-10-23T01:55:00Z`), as now. A board
shows each one in the viewer's own time zone, with the zone's abbreviation ("23 Oct 2026, 03:55
CEST", or the locale's equivalent), as a `<time>` whose `datetime` and `title` hold the exact UTC
value. This covers every time a board shows: the WIP strip's since and updated, the units' run
mirrors, the trail, milestones, the repository work board's generated stamp, and an as-is stamp where it
carries a time. A date alone stays a date. Hand-written HTML (a system board's header or panels)
writes a time as `<time datetime="…Z">…</time>` and the board localises it. The checks never depend
on the machine's time zone: they compare against the UTC source, and the browser pass fails a
zoned ISO stamp left as plain text outside code and the Source view.

## 7. Divergence

The global template is the general one; a repository may keep its own under
`docs/dashboards/_template/` or `docs/plans/_template/`, and a board may diverge from a template
when its subject is better shown another way. A divergence should primarily **add**. Removing
content — a core tab, a standard guarantee card, a column, a legend — needs a strong argument, such as
no data for it existing, and the argument goes with it, in the board's footer comment and in the
presenter's report. A board **declares** each divergence in its head, as
`<meta name="template-divergence" content="what and why">`, so the checker knows what to check.
When a divergence would serve every board in the repo, it goes in the repo template instead.

**Type divergences** are the rules' own, declared here for a whole board type rather than on a board: on **system, supersystem and
repository state boards** an issue's state reads open or closed and never the tracker's reason ("closed · not planned", "closed · duplicate" are
the issue boards' and the repository work board's), there is no "GitHub ↗" beside a lone `#n` (the number opens the board, or GitHub while there is
none), and nothing above the Context section names an issue (§5, "A state board is as-is"): a state board is as-is, not as planned or created.

## 8. Checks

**The template is verified once, in the skill; a board is checked only where it deviates.** A
template's own structure, tabs, legends, themes and responsive layout are verified by
`verify/verify-templates.js`, which renders it with fixtures covering its states, runs the full
browser pass on each (light, dark, 520 px, a 390 px frame, a 1920 x 1080 desktop) and records the template's hash in
`verify/verified.json` (a repository's `_template/` records its own beside it). Run it after
every template change; until it has run, a changed template counts as a divergence on every
board made from it.

Every board, before it is committed, passes its set's checker in `--auto` mode
(`plan/scripts/check.js <folder> --auto`; `system/scripts/check-board.js <board> --auto`):

| The board | Checked |
|---|---|
| any board | its data and its rules (`check.js`), the embedded copy matching its data file (on an issue board and the repository work board, its live sidecar too), no dead `href="#"`, no external resource, no work level in its text (§4), no system colour in a status spectrum (§1); a warning, never a failure, on an internal name left in its data, its comments or its text (§4, `INTERNAL NAME`) |
| an issue board or the repository work board that is a verified template plus its data | nothing more: no browser pass |
| a system, supersystem or repository state board whose CSS, tabs and script — before `MODEL` (less its board-filled lines, such as `REPO` and `SRC`) and after it — are the verified template's | one light pass, for the facts it fills in: no script error, every tab drawn with its legend, the Guarantees, Context, no git-ignored registry file |
| a board that diverges — declared, undeclared, made from an older template — or whose template changed since it was verified | the full pass: light, dark, 520 px, a 390 px frame, a 1920 x 1080 desktop |

A difference nobody declared is a warning: re-render the board from the template, or declare it
(§7). `--browser` (plan) and a plain `check-board.js` run still force a pass when wanted.

**Features.** A board is also held to every feature its template has, whatever its pass: `system/scripts/features.js` keeps one detector per
template feature, tagged with the skill step that added it and the board types it applies to (and, for each type it does not fit, why).
`check-board.js` (`--auto`, `--auto --no-browser` and its plain passes) and `check.js --auto` run the static ones on every board — the theme
switch and its script before the first paint, the dark palette, the labelled tags, the 1500 px layout, the `BOARDS` map, the live
indicator present or absent by type, one-line ledes, reduced motion wherever anything animates, a tabindex on every role=button, the
tablist's keys, the state block, the as-is header, the legends of Guarantees and Context, the work-board link, the links from the data,
the Markdown copies, the progress notes, a tracking board's steps, the KPI bars, the neutral bug badge, the chain, core subsystems, the tiles'
legends inside each tile, no "board" tag, the title's `#n`, "since" said once by the step panel, the larger charging arrow, the landing
step, the Tests tab, the Timeline tile's legend of step visits and its kinds of work, approximate bounds, the Timeline tab and its tracers, the landing's
steps, the Design tab, a sub-issue's roadmap naming its parent, a reference's section number before its excerpt, no work level in the board's data, the
Document step, the dependency's build state from its code (dropped included), the Consequences tab, the build outputs' live copies, a fix's "fix
to #n", the structure map's recorded height, a
issue board's finished steps clickable, each unit row's label glowing on its own while it is filed, the Timeline tile's figure the sum of
its visits, an issue's title quoted and marked, every qa pass and the one running as ordinals, the dependency pills — and
the browser pass the layout ones (the header's halves, the wide board, the legends shown). A missing feature fails, as `FEATURE MISSING:
<feature> (template since dashboards-skill/N)`, **through a declared divergence too**: a divergence adds or argues a removal; it never
excuses a board that lags its template. A landed or cancelled issue board is the exception: it is kept as it landed and never
re-rendered (§11), so its newer features are reported, not failed. `verify/verify-templates.js` holds every template to every detector that applies to it. The fix is
the splice (§11). On the data-only path (`apply-state.js`) the misses are notes and `enrich: yes`, never a refused stamp.

Then the presenter looks once at the screenshots of the boards that had a browser pass, for what
a script cannot see: a legend that doesn't match its panel, clipped labels, overlaps, a card off
the frame — on a diverging board, where it diverges. No per-tab screenshot sweep unless the
divergence is in that tab. Fix what you see; don't loop past a second look.

## 9. Defects and conventions

The presenter fixes dashboard **defects** at its own discretion — on any board, and in this
skill's templates, examples and scripts — where they live, and reports each skill fix so the
`.github` mirror is synced. The **conventions** (this file and the rulesets) are the user's: a
rule that seems wrong is proposed in the report, not changed.

## 10. Hygiene

Nothing committed carries a credential, a machine-local path, a user name or personal data.
Dashboards live in public repositories.

## 11. One change, every dashboard type

Every convention change or improvement made for one dashboard type is considered for every other
type — system boards, supersystem and repository state boards, issue boards, tracking boards and the repository
work board — and applied wherever it fits: in this file when it is shared, in each ruleset, template,
script and check it touches, with `verify/verify-templates.js` run after the template changes. Where
it does not fit a type, the reason is stated. The presenter's report names, for each change, the
types it was applied to and the types it was judged not to fit, with the reason, and the boards
already in repositories that the change would re-render.

**Re-rendering: who brings which board onto the template, and when.** A template change reaches the boards at these moments, and no
other:

| Board | Brought onto the current template |
|---|---|
| system, supersystem and repository state boards; the committed repository work board | at the **Document step's state-boards task** only, on the issue's branch before its land (`system/scripts/splice.js` for a state board: the template's CSS, script before MODEL and renderer carried onto the board, three ways for a declared divergence; `board.js --refresh-template` for the repository work board); before admin-team/dashboards-skill/35, at the pre-merge refresh inside the land |
| the live repository work board | at **every event** (`board.js --live --refresh-template`: it is the template plus its data, never committed) |
| an issue's board that is in flight, and its tracking board | at **its own events** (`apply-event.js` re-renders a board that is not the verified template plus its data) |
| a landed issue board | **never**: it is the record of a finished run, kept as it landed |

**Finished steps, clickable** (admin-team/dashboards-skill/24): applied to issue boards and tracking boards (a tracking board for its
own steps and for each unit in progress through its mirror), where the progress strip is (`plan/RULES.md` §3, "Finished steps"). Not to
the repository work board, which has no progress strip — one row per run, its step as text, the run's steps on its own board — and not to system,
supersystem and repository state boards, which show the code at a commit and no run's steps. The highlight of the step shown is an ink ring,
never the accent (§1).

**The decisions of admin-team/dashboards-skill/28**, each weighed for every type:

- **The Timeline tile's figure is the sum of the phases its bar draws** (§1, "Steps"; `plan/RULES.md` §2; since dashboards-skill/32 the visits its bar draws): applied to issue boards and
  tracking boards (one tile, one rule: `lib.js` `timelineTotal()`, the template's `timelineTotal()`). Not to the repository work board, which has no
  Timeline tile (one row per run), nor to system, supersystem and repository state boards, whose tiles are hand-written counted facts and show no
  run's phases.
- **An issue's title is quoted verbatim; one that names a work level is flagged as the issue's defect** (§4): applied to every type — plan
  and tracking boards (the issue line, the roadmap, the follow-ups), the repository work board (its rows, groups, roadmap and unscheduled issues), and
  system, supersystem and repository state boards (the Context's titles and the "last amended by" note), each title marked `data-issue-title`.
- **A board at research with no rows is a defect** (`NO ROWS AT RESEARCH`, `plan/RULES.md` §3, §8): applied to issue boards and sub-issues'
  boards. Not to a tracking board, whose rows are its units, written from its architecture at the sign-off, after its research (it has no
  rows at research by design); not to the repository work board or the state boards, which have no research step.
- **Each unit row's label glows on its own while it is filed, then while its board is created** (`plan/RULES.md` §3, §4): applied to
  tracking boards, the only type with those steps. Not to the repository work board, which marks runs and shows filing as the tracking issue's own
  step on its row (a unit's row there glows only once its run is under way), nor to the state boards, which show no run.

**The decisions of admin-team/dashboards-skill/30**, each weighed for every type:

- **The repository work board drops its board-link and branch columns** (the title is the link to the board; the branch shows in the state column
  while there is one): the repository work board only. Not to issue or tracking boards, which have no such columns (the branch is a header tag, and a
  unit's title links its board already), nor to the state boards, which list no runs.
- **Every qa pass is shown, the pass running included** (the defect: a pass in progress was recorded nowhere `board.js` or the board read):
  applied to the repository work board (`lib.js` `qaShown()`, a unit's from its own run, not the tracking board's `wip`), to issue boards (the QA tile,
  the WIP strip's qa pills) and to tracking boards (each unit's run mirror). Not to the state boards, which show no run.
- **QA pass numbers as ordinals** (1st, 2nd, 3rd): applied to the repository work board's QA cell and to issue and tracking boards' qa pills and QA
  tile. The step panel's prose ("Answering qa pass 1", a remediation sub-step "qa pass 2") keeps the pipeline's own words. Not to the
  state boards: no qa passes.
- **Depends on, with a build state and a locality; Blocks · enables** (§1, "Dependencies"): applied to the repository work board (two columns), to
  issue boards (the WIP strip's `wip.blockers`) and to tracking boards (each unit's dependencies and the units it holds up, in its
  inspector). Not to system, supersystem and repository state boards: a state board is as-is and names no issue above its Context, and its Context
  lists issues open or closed, not their dependencies.

**The decisions of admin-team/dashboards-skill/31**, each weighed for every type:

- **The decision not to run another qa pass, shown** (§1; `plan/RULES.md` §5, "QA"): applied to the repository work board's QA column, plan
  boards (the QA tile's sub-line, the WIP strip's qa pills) and tracking boards (each unit's run line, unit card and inspector), all from
  one rule (`lib.js` `qaShown()`, `qaInPlace()`, and the templates' copies). Not to the state boards: they show no run. A landed board is
  never re-rendered (§11, above), so a landed issue board shows the mark only if it is re-rendered for another reason; the repository work board shows
  it for every row whose pass records the route.
- **The Runs tab's content larger, but Now** (`plan/RULES.md` §5, "Its columns"): the repository work board only, the one dashboard with a runs
  table. Not to issue or tracking boards: their rows are a timeline grid whose sizes the board's own rules set, and a tracking board's
  units already read at the grid's size; not to the state boards, which list no runs.

**The decisions of admin-team/dashboards-skill/32**, each weighed for every type:

- **The Timeline tile: one line per visit of a run step, from the record only** (§1, "Steps"; `plan/RULES.md` §2, "The Timeline tile's
  legend"): its start → end and its duration in minutes, hours and minutes, or days and hours, never "same day"; a time from the
  board's snapshots, its sizing stamp and qa passes, the merge's time and the branch's step commits from git, a neighbour's bound, else
  "—"; the bar one segment per timed visit, its legend one entry per visit; a landed board's Timeline across the KPI row. Applied to issue boards
  and tracking boards (a tracking board's own steps: sizing to its plan's landing, then its units' runs as `implementation`), one rule in
  `lib.js` `timelineSteps()` and the template. Not to the repository work board: its Landed tile counts runs and says no time, so it has no "same
  day" to replace, and each run's steps are on its own board. Not to system, supersystem and repository state boards: their tiles are counted
  facts written by hand and show no run. A landed board is re-rendered for it only where the user asks (§11, above: WebTools #63's board
  was).

**The decisions of admin-team/dashboards-skill/34**, each weighed for every type:

- **The Timeline tile coloured by kind of work** (§1, "Steps"; `plan/RULES.md` §2, "The KPI tiles"): planning, build, checking and landing,
  four hue families, a shade per step, on the bar and on a mark in front of each step line, with a legend of the families. Applied to issue
  boards and to tracking boards, whose own steps take the family of their work (sizing, interview, research, architecture, sub-issues and boards
  planning; its plan's landing landing; implementation, its units' runs, build; a tracking board runs no qa of its own, so it draws no checking),
  one rule in `lib.js` `TL_FAMILIES`, `tlFamily()`, `tlShade()` and the template. Not to the repository work board: it has no Timeline tile
  (one row per run, its step as text; its Landed tile counts runs). Not to system, supersystem and repository state boards: their tiles are
  counted facts written by hand and show no run's steps. A landed board is re-rendered for it only where the user asks (WebTools #63's board
  was).
- **Approximate bounds** (§1; `plan/RULES.md` §2, rule 5): applied to issue and tracking boards, the boards with a Timeline tile, and used only
  where the user asks for a board to be backfilled (WebTools #63's was, from the times its updates reached the team). Not to the repository
  work board or the state boards: no Timeline tile.
- **The landing in three steps: landing, state boards, merge** (`plan/RULES.md` §3, §4): applied to issue boards and to tracking boards, whose
  plan's own landing is a planning-docs landing with its small pre-merge refresh (§11, "The landing flow"), so it takes the same three steps
  before `implementation`. The repository work board shows each run's step as its board records it (its state column), and counts
  `state-boards` and `merge` as active steps; nothing else changes there. Not to the state boards: no run steps. A board that landed before
  keeps its line, its landing spanning to the merge.
- **A sub-issue's roadmap named, never "no tracking parent"** (the defect: every unit board under a tracking issue kept `roadmap` null):
  applied to issue boards (`lib.js` `fillRoadmap()` at every embed, from the repository work board's data, else the parent tracking board;
  the card naming the parent while unset). A tracking board draws its roadmap from its own units and has no such gap. The repository work
  board had its own: without the tracker (`board.js --no-gh`) a tracking issue's roadmap item listed no units; it now lists the tracking
  board's units. The state boards list the repository roadmap from the tracker and have no parent to miss.
- **The four columns' tab named Design** (`plan/RULES.md` §2, "The tabs"), so it does not clash with the Timeline tile: applied to issue
  and tracking boards, the boards with that tab; `#timeline` and `#p-timeline` still open it. The repository work board and the state boards
  have no such tab.
- **The Timeline tab** (`plan/RULES.md` §2, "The Timeline tab"): right after Design, the Timeline tile at its top and the KPI tiles below it
  (the KPI row leaves the board's head), each tile's tracer (§12) up to its steps, on every issue board, a board in flight showing its steps
  so far, the running one to now. Applied to tracking boards with their own steps and tiles: Units sizing and research, Options research and
  the architecture, Verdicts the architecture, As built implementation (its units' runs), and QA passes no tracer (a tracking board runs no
  qa of its own). Not to the repository work board: one row per run, its tiles count runs and no step's time, each run's steps on its own
  board. Not to the state boards: hand-written counted tiles and no run.

**The landing flow** (dashboards-skill/33; the Document step of admin-team/dashboards-skill/35). The run's last steps are `document`, then the land in
two steps, `landing` and `merge`, then `landed` (dashboards-skill/34's three landing steps, `landing`, `state-boards`, `merge`, stay on a board that
reached its landing before the change):

1. **The Document step**, on the issue's branch, between qa (or remediation) and the land: its tasks — `documentation-review`,
   `reconcile-documentation`, `dokka-check`, `reconcile-plan` (the reconciled `final-implementation.md` and `consequences.md`),
   `readme-changelog` and `state-boards` — each done, current or to do, several at once where they run in parallel (the `document` event,
   `plan/RULES.md` §4). The **state boards are built in it**: when the team accepts the run's `state-boards` request it raises that task
   itself, and the presenter's `state-boards` mode writes the changed systems' state boards as built, the supersystem and repository state
   boards, `systems.json`, the README's pointer, the splice onto the current template, the tracking board's re-embed, the committed
   repository work board (`board.js --refresh-template`) and, for a tracking issue, its planned systems drawn dashed — every state board
   stamped "as-is at `<branch>` @ `<code-landing sha>`", the sha the request gives: the branch's last code commit, after the sync and the
   bump (`apply-state.js` `facts.document`). Only documents change after it, so nothing is restamped at the land; the boards land in the
   same merge.
2. **The land**: `landing` (the land accepted; every open point resolved by then, as none is committed open, `plan/RULES.md` §3) and
   `merge`, then `landed`.
3. **The post-merge refresh**, after the merge, in the main checkout at the merge commit, for viewing only: the live view under the
   git-ignored `docs/plans/.live/` (`board.js --live`) shows the issue landed and, for a sub-issue, its unit landed and the next one up, in
   view copies of the boards under `docs/plans/.live/view/` (`apply-event.js --view`; `plan/RULES.md` §4, "The live view of a landing"). It
   writes no tracked file, so nothing is left uncommitted.
4. That landed state — the issue board `landed` at its merge, the tracking board's unit landed and next up, the repository work board — is
   **seeded at the next run's `sized`**: a run sized in a worktree branched after the landing starts those boards from the main checkout's
   view copies (`apply-event.js`, `plan/RULES.md` §4, "Seeding at sized"), so its branch carries the landed state from its first commit.
   A merge that marks an issue landed on its own board does so for its parent too: both are seeded together. There is never a follow-up
   docs pull request.

A **planning-docs landing** — a docs pull request that resolves no issue (a plan folder, a roadmap document) — takes a small state-boards
refresh on its branch: the committed repository work board, and the repository state board where the repository has one.

**The decisions of admin-team/dashboards-skill/35**, each weighed for every type:

- **A dependency's build state from its code** (§1, "Dependencies"): blocking until the dependency's code is merged, clear once it is (an open
  issue whose pull request merged included), pre-built outside the plan and merged before it, dropped when closed as not planned, a duplicate
  taking its canonical issue's state. Applied to the repository work board (`board.js`, `lib.js` `depBuild()`, the tracker's merged pull
  requests and duplicates), to issue boards (the WIP strip's `wip.blockers`, as recorded) and to tracking boards (a unit's dependency on a
  unit: blocking, clear once it lands, dropped where the board dropped it). Not to the state boards: they name no issue's dependencies.
- **Remediation sub-steps in parallel** (`plan/RULES.md` §3): issue and tracking boards (a unit's run mirror); the implementation stages keep
  at most one current. Not to the repository work board or the state boards: no step panel.
- **Open points: a build output linked live, none committed open** (`plan/RULES.md` §3, `wip.open`): issue and tracking boards (a unit's
  mirror carries its points). The repository work board shows no open point; the state boards no run.
- **A bare "Ln"** (§4): every type, as the work-level rule is (the fast path's facts on issue and tracking boards; the checks on every board).
- **Consequences** (§1; `plan/RULES.md` §2): the issue and tracking boards' tab and the documents they read; the repository work board's
  reconciliation chip keeps its words (it names the impact, the data the tab draws). Not to the state boards: no such tab.
- **A fix to an earlier plan's work** (`plan/RULES.md` §1): issue boards ("fix to #n") and the repository work board (its row's "fix to #n");
  a tracking board lists it as any issue its board names. A landed board it fixes is kept as it landed (§11, "Re-rendering"): the link runs
  from the fix. Not to the state boards: they name no issue above their Context.
- **The Document step** (`plan/RULES.md` §3, §4): issue boards and tracking boards (whose plan's land takes it before its landing); the
  repository work board shows it as a run's step and counts it active. Not to the state boards: no run steps.
- **State boards built in the Document step; seeding at sized**: the state boards and the committed repository work board are written in the
  Document step; the issue and tracking boards' landed state is seeded at the next run's sized.
- **The test report's neutral path** (`build/reports/tests/index.html`): issue boards (a qa pass's test report, plain text, linked to its copy
  in the live view) and the state boards' Test levels guarantee card (plain text: a build output, never committed, and a state board has no
  live view). Not to the repository work board: it shows no qa report.
- **The structure map's height recorded** (`system/RULES.md` §2): system boards only, the type with a hand-placed structure map.
- **The Systems tab by visibility; archived** (§1, "Visibility", "Archived"; `system/RULES.md` §3, §7): the repository and supersystem
  state boards' Systems tab (grouped by visibility, a system's parts inside its panel, an Archived group apart: the WebTools repository
  board's renderer, promoted to the template, so no board diverges for it), their Guarantees rows (an archived row faded and tagged), the
  registry (`visibility`, `status` `archived`, checked by `check-board.js`); a system board's header (its visibility tag, an archived
  status chip) and its On your classpath card (who consumes it); the repository work board (a row whose system is archived carries the
  tag; visibility does not group runs, so it is not shown there); an issue board's systems tag ("· archived"). Visibility is not drawn on
  the issue boards: they show a run, not who consumes a system.

**The decisions of dashboards-skill/33** (the global conventions: boards never pages, no internal names in committed content, the pre-merge landing flow), each weighed for every type:

- **The element vocabulary of §12** ("bubble" retired): applied to every type. On the state boards the Guarantees' sub-areas are
  **guarantee cards** (`.guarantee-cards`, `.guarantee-card`; the splice migrates a board's `bubble` classes); on the issue and tracking
  boards the WIP strip's blocks are **cards** (`.wipcards`, `.wipcard`: the phase card, the unit card, the up-next card, the "waiting on
  you" card), the Landing Order inspector's sections **cards** (`.icards`, `.icard`), a dependency's two-part mark a **dependency pill**
  (`.dep-pill`, `depPill()`), the step panel's facts **info cards**; on the repository work board the dependency pill too. Wording and
  class names only: no layout or behaviour changed.
- **Boards, never pages** (above): applied to every type, in the text, the labels ("Repository work board", "Board" in a supersystem
  board's inspector), the scripts (`check-board.js`) and the data keys — `systems[].board` (the registry's, `plan.json`'s and
  `board.json`'s; `page` read alike), `links.repoBoard` and `links.boards` (`repoPage` and `pages` written only for a board whose
  template reads no other, `lib.js` `linkKeys()`). The `.page` wrapper class is the browser's page, not a board's name, and keeps its
  name; so do the kind ids (above).
- **No internal names** (§4): applied to every type — the issue and tracking boards' step panels, legends and progress notes, the
  repository work board's labels, the state boards' fixed text and comments, and every board's data through the warnings.
- **The landing flow** (above): the state boards and the committed repository work board are written at the pre-merge refresh, the
  issue and tracking boards' landed state at the next landing's; the live repository work board at the post-merge refresh. Not to an
  issue board in flight, which keeps its own events.

## 12. Elements — one name per function

Every visible element has one name, chosen by what it does, never by its look; the look follows
§1 and §2. A compound name puts the subject first and the type last (`guarantee card`, `unit
card`, `verdict pill`, `issue chip`, `step cell`, `KPI tile`), so the type vocabulary stays small.
The templates' CSS classes and the data keys carry the type word (`.card`, `.pill`, `.chip`, …),
so a reader can tell an element's kind from the markup without the board. "Bubble" names
nothing: a Guarantees sub-area is a **guarantee card**, a tracking board's unit block in the WIP
strip is a **unit card**, and a step in the step panel is a **step cell**.

**Containers, by how much they hold**

| Term | Function | Examples |
|------|----------|----------|
| **Panel** | A top-level region of a board with its own heading. | a tab's body, the Guarantees area, the Context section, the WIP strip, the step panel, the KPI row (an issue board's, in its Timeline tab) |
| **Card** | A self-contained statement inside a panel, with a title and a body, readable alone. | a guarantee card, a Consequences entry, an As-built entry, a unit card |
| **Tile** | A card whose body is one figure with its segmented bar and legend. | the KPI tiles, the repository work board's Runs and Landed tiles |
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
| **Tracer** | A line from a KPI tile up to the part of the Timeline tile it belongs to (the steps that made the tile's figure), in their kind of work's colour, labelled with how long that part took; under 760 px its label alone, on the tile (§1, "Steps"; `plan/RULES.md` §2, "The Timeline tab"; dashboards-skill/34). |
| **Legend** | The key for a colour grouping, one per tab or per tile (§2); an issue board's Timeline tile carries two, its kinds of work (one entry per family, with its steps' shades) and its step visits (one entry per visit, with its times, `plan/RULES.md` §2). |

A ruleset that needs an element none of these names describes adds the term here first, with its
function, and uses it everywhere; it never reuses a term for a second function.
