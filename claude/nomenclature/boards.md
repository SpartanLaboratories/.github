# Boards — the names of the dashboards and their parts

The names of the dashboards every Spartan Labs repository keeps: the boards, their groups, and how
the boards use the interface elements named in [`ui.md`](ui.md). The rules for making and keeping
the boards are the dashboards skill's ([`GUIDANCE.md`](../skills/dashboards/GUIDANCE.md) and its
two rulesets); a section reference below (§1) is to `GUIDANCE.md`.

## Dashboards and boards

"Dashboard" is the umbrella for two groups, and every member of either is a **board**, never a
"page" (GitHub Pages is something else):

| Group | Shows | Its boards |
|-------|-------|------------|
| **State boards** (`docs/dashboards/`, [`system/RULES.md`](../skills/dashboards/system/RULES.md)) | what the code is and does at a named commit | the **system board**, the **supersystem board**, the **repository state board**; planned: the **org project board**, the **intra-org dependency board** |
| **Work boards** (`docs/plans/`, [`plan/RULES.md`](../skills/dashboards/plan/RULES.md)) | how the work is going | the **issue board**, the **tracking board** (a tracking issue's issue board), the **repository work board**; planned: the **org work board** |

A board's own word for itself, in its text and its labels, is "board"; the file names and the
scripts follow (`check-board.js`). The kind ids the scripts and the data use are identifiers and
keep their spelling: `plan-board`, an issue or a tracking board (its `<meta name="dashboard">`,
`plan.json`'s `schema: "plan-board/1"` and the `plan-board` request that updates it), and
`work-board`.

## Board UI

Every visible element on a board takes its name from [`ui.md`](ui.md) and does what `ui.md`
defines; the look follows the boards' colour coding and legends (§1, §2). This section holds every
board-specific use of a `ui.md` element.

A board's compound names follow `ui.md`'s rule, subject first and type last: a Guarantees sub-area
is a **guarantee card**, a tracking board's unit block in the WIP strip is a **unit card**, a step
in the step panel is a **step cell**, and so on (`verdict pill`, `issue chip`, `KPI tile`).

Where a template's CSS class names an element's kind it carries the type word, so a reader can tell
the kind from the markup without the board: `.card`, `.chip`, `.badge`, `.cell`, `.ring`, `.glow`,
`.arrow`, `.guarantee-card`, `.dep-pill`, and `.kpi-tile` (a KPI tile), `.verdict-pill` (a verdict
pill) and `.legend` (a legend).

| Term | On the boards |
|------|---------------|
| **Panel** | a tab's body (its tab the heading), the Guarantees area, the Context section, the WIP strip, the step panel, a system panel on the Systems tab (its own card the heading; a subsystem's inside its supersystem's) |
| **Card** | a guarantee card, a Consequences entry, an As-built entry, a unit card |
| **Tile** | the KPI tiles, the Timeline tile, the repository work board's Runs and Landed tiles |
| **Cell** | a Gap, Considered, Verdict or As built cell; a step cell |
| **Row** | an issue board's design point, a tracking board's unit |
| **Pill** | a verdict pill, an as-built pill, a dependency pill, the research-state pill |
| **Chip** | an issue chip, the "part of" chip, a branch chip, the chain chip |
| **Badge** | the effect, need and API-change badges |
| **Tag** | `Planned`, `UP NEXT`, `Context` |
| **ShareBar** | the tiles' bars, but the Quality Reviews tile's (a SlotBar) and the Timeline tile's (a Timeline) |
| **Timeline** | the Timeline tile's bar: one part per timed step visit |
| **SlotBar** | the Quality Reviews tile's bar: one slot per review allowed, filled in order by each review's result |
| **StepBar** | the issue board's progress strip and the tracking board's WIP strip, their chevrons labelled with the step names; a tracking issue's chain on the state boards' roadmap and on the repository work board's rows, one chevron per unit labelled with the unit's name, on a line of its own like the strips |
| **Ring** | the research scale on a Considered cell (§1) |
| **Glow** | whatever is being worked on (§1) |
| **Arrow** | the charging connector into a Verdict cell (§1); the connectors of a tracking board's units chain |
| **Tracer** | from a KPI tile up to the part of the Timeline tile it belongs to (the steps that made the tile's figure), in their kind of work's colour, labelled with how long that part took; under 760 px its label alone, on the tile (§1, "Steps"; `plan/RULES.md` §2, "The Timeline tab") |
| **Legend** | one per tab or per tile (§2); an issue board's Timeline tile carries two, its kinds of work (one entry per family, with its steps' shades) and its step visits (one entry per visit, with its times) |
| **Switch** | the theme switch (☀ light, ☾ night, §1, Themes) and the inspector switch (§6), in the header, drawn in the neutrals (never the accent or a status colour), a real toggle (`role="switch"`, `aria-checked`, the focus ring), its knob jumping rather than sliding under reduced motion (§1) |
