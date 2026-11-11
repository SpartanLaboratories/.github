# Boards — the names of the dashboards and their parts

The names of the dashboards every Spartan Labs repository keeps: the boards, their groups, and how
the boards use the interface elements named in [`ui.md`](ui.md). The rules for making and keeping
the boards are the dashboards skill's ([`GUIDANCE.md`](../skills/dashboards/GUIDANCE.md) and its
two rulesets); a section reference below (§1) is to `GUIDANCE.md`.

## Dashboards and boards

"Dashboard" is the umbrella for two groups, and every member of either is a **board**:

| Group | Shows | Its boards |
|-------|-------|------------|
| **State boards** (`docs/dashboards/`, [`system/RULES.md`](../skills/dashboards/system/RULES.md)) | what the code is and does at a named commit | the **system board**, the **supersystem board**, the **repository state board**; planned: the **org project board**, the **intra-org dependency board** |
| **Work boards** (`docs/plans/`, [`plan/RULES.md`](../skills/dashboards/plan/RULES.md)) | how the work is going | the **issue board**, the **tracking board** (a tracking issue's issue board), the **repository work board**, the **org work board** (one board for the organization, in `OrganizationPage`) |

```jsonl
{"term":"board","not":["Page"],"allow":["GitHub Pages"]}
```

What each board shows:

| Board | Shows |
|-------|-------|
| **system board** | one system as built: its function first, in its Tabs, then what a consumer can rely on in the Guarantees Panel, then the Context Panel (the roadmap, the unscheduled issues, the plans) |
| **supersystem board** | a group of systems and how they interact, its planned systems drawn dashed |
| **repository state board** | the repository's systems and how they interact, its planned systems drawn dashed |
| **issue board** | one issue: its gap, the options considered, the verdict and the as-built state, and, while its run is alive, the work in progress |
| **tracking board** | a tracking issue's issue board, its Rows the tracking issue's units, each with its progress |
| **repository work board** | every run in the repository at once, and the landed issues |
| **org work board** | every repository of the organization at once: each one's runs, landed issues and tracking chains, linking to that repository's boards ([`plan/RULES.md`](../skills/dashboards/plan/RULES.md) §10) |

A board's own word for itself, in its text and its labels, is "board"; the file names and the
scripts follow (`check-board.js`). The kind ids the scripts and the data use are identifiers and
keep their spelling: `plan-board`, an issue or a tracking board (its `<meta name="dashboard">`,
`plan.json`'s `schema: "plan-board/1"` and the `plan-board` request that updates it), `work-board`,
and `org-work-board` (its `<meta name="dashboard">` and its `board.json`'s `schema: "org-work-board/1"`).

"Page" is retired: it never names a board (GitHub Pages is something else).

## Board UI

Every visible element on a board takes its name from [`ui.md`](ui.md) and does what `ui.md`
defines; the look follows the boards' colour coding and Legends (§1, §2). This section holds every
board-specific use of a `ui.md` element.

A board's compound names follow `ui.md`'s rule, subject first and type last: a Card in the Guarantees
Panel is a **guarantee Card**, the Panel that holds the WIP strip is the **WIP Panel** and a tracking
board's unit block in it a **unit Card**, a step in the step Panel is a **step Cell**, the reference
that ends a Verdict statement ("§4.2", opening the section's excerpt) is its **section Chip**, a
landed unit's pull request and merge commit on its As built Cell ("PR #89", "merge 8122af7", each
opening what it names) are its **PR Chip** and **merge Chip**, a figure and its noun in a Cell's head
or foot (the Gap Cell's "· 2 evidence", the Verdict Cell's "1 step · 0 tests · 2 risks", the figure
muted at zero) is a **count Label**, the Chip headed "Now" that holds the run's latest report in the
step Panel is the **Now Chip**, and so on (a verdict Pill, an issue Chip, the KPI Tile).

Where a template's CSS class names an element's kind it carries the type word, so a reader can tell
the kind from the markup without the board: `.card`, `.chip`, `.badge`, `.cell`, `.ring`, `.arrow`,
`.guarantee-card`, and `.kpi-tile` (a KPI Tile), `.verdict-pill` (a verdict Pill), `.dep-pill` (a
DualStatePill), `.legend` (a Legend), `.stepbar` (a StepBar),
`.fullpulse` (a FullPulse: whatever is being worked on),
`.col-fullpulse` (a whole column's FullPulse), `.colcell-fullpulse` (a Cell carrying its column's
FullPulse at phone width), `.upnext-ring` (the up-next Ring) and `.fillpulse` (the live dot's
FillPulse).

A row exists only for a specific use of a `ui.md` term on the boards, such as a compound name built
on it, or for a deviation from `ui.md`, and never restates `ui.md` (R-17 (Single source),
[`Structure-Policy.md`](../Structure-Policy.md)). Each row says what its term is for on the boards.
The rows stand in three groups, each in `ui.md`'s family order: **deviated**, where the boards depart
from `ui.md` (a row that also names subtypes of its term stands here and names them); **subtyped**,
where the boards name subtypes of the term; and **as-is**, where the boards use the term as `ui.md`
defines it.

### Deviated

| Term | Its purpose on the boards |
|------|---------------------------|
| **Tag** | a header fact with its label (the branch, the systems, a system board's visibility); "UP NEXT" on the unit up next; "⊟ archived" on a system no longer developed; "blocked by #n" on the unit up next while a blocker has not landed, drawn in a status colour, the waiting colour (yellow) |
| **CodeLabel** | every inline code: a `code` span in the data, a path, a sha, a branch, a class; plain inside a Chip, a Pill or a Tile |
| **Tracer** | from a KPI Tile up to the part of the Timeline Tile it belongs to (the steps that made the Tile's figure), in their kind of work's colour, labelled with how long that part took; under 760 px its label alone, on the Tile (§1, "Steps"; `plan/RULES.md` §2, "The Timeline tab") |

### Subtyped

| Term | Its purpose on the boards |
|------|---------------------------|
| **Panel** | the Guarantees Panel (headed "Guarantees"), the Context Panel (headed "Context"), the WIP Panel (the Panel that holds the WIP strip), the step Panel, a system Panel on the Systems Tab (its own Card the heading; a subsystem's inside its supersystem's), the org work board's repository Panel and organization Panel (a sub-organization's repository Panels inside its organization Panel), the inspector (§6): the side Panel that shows the selected item, a Hide Button right of its heading |
| **Card** | a guarantee Card, one guarantee a consumer can rely on; a Consequences Card, one consequence of the change as it now stands; an As built Card, one Row as built: its state, its statements and every change from the verdict; a unit Card, a tracking board's unit in progress, with its own run |
| **Cell** | a Gap, Considered, Verdict or As built Cell; a step Cell |
| **Tab** | each of a board's views, its heading in the board's row of Tab headings: a state board's six core Tabs, its optional ones and a supersystem or repository state board's Systems Tab; a work board's Tabs |
| **Tile** | the KPI Tiles, an issue board's counts, each with the Bar of what it counts; the Timeline Tile, the time the run took, step visit by step visit; the repository work board's Runs Tile, every run by its state, and its Landed Tile, the runs that have landed |
| **Pill** | a verdict Pill, the verdict on an option weighed or on a quality review; an as-built Pill, a Row's as-built state; the research-state Pill, the state of a Row's research, in the head of its Considered Cell |
| **Chip** | an issue Chip, an issue by its number, opening its board, or the GitHub issue while it has none; the "part of" Chip, the parent issue, in the header; a branch Chip, the run's branch, in the header; the chain Chip, a tracking board's chain in its header: how many units have landed, which are in progress and which is up next; the org work board's unlinked Chip, saying a board is not linked yet |
| **Badge** | on a Consequences Card, the effect Badge, how a downstream party is affected; the need Badge, whether a consumer must change to adopt it; the API-change Badge, whether a public surface was added, changed, deprecated or removed |
| **DualStatePill** | the dependency DualStatePill (§1, "Dependencies"): the build state on the status scale and the locality on a neutral ramp |
| **Ring** | the research Ring, the research scale on a Considered Cell (§1); the up-next Ring, a still outer Ring on the unit up next (§1); whatever is being worked on, while its run waits on the user (§1) |
| **Arrow** | the charging Arrow, the connector into a Verdict Cell (§1); the connectors of a tracking board's units chain |
| **Switch** | the theme Switch (☀ light, ☾ night, §1, Themes) and the inspector Switch (§6), in the header, drawn in the neutrals (never the accent or a status colour), a real toggle (`role="switch"`, `aria-checked`, the focus ring), its knob jumping rather than sliding under reduced motion (§1) |
| **Button** | the inspector's Hide Button, hiding the inspector as the inspector Switch does; the option Button, an option in a Considered Cell, opening it in the inspector; the "back to now" Button, returning the step Panel from a finished step to the current one |

### As-is

| Term | Its purpose on the boards |
|------|---------------------------|
| **Row** | an issue board's design point, a tracking board's unit |
| **Disclosure** | a stage of the step Panel, a remediation's sub-step, a Document task, a finished step's visit, a finished Implementation view (`plan/RULES.md` §3, "Collapsing") |
| **CodeBlock** | an option's signature, beneath its name |
| **ShareBar** | the Tiles' Bars, but the Quality Reviews Tile's (a SlotBar) and the Timeline Tile's (a Timeline) |
| **SlotBar** | the Quality Reviews Tile's Bar: one slot per review allowed, filled in order by each review's result |
| **StepBar** | the WIP strip of an issue board (its progress strip) and of a tracking board, its chevrons labelled with the step names; the research indicator (planning, research, verification) and the plan step's StepBar (plan writing, plan accepted) in the step Panel, their chevrons labelled with those names; a tracking board's own chain on the phase's Card, one chevron per unit labelled with the unit's name, and in the header's chain Chip under its sentence, one chevron per unit labelled with the unit's issue number; a tracking issue's chain on the state boards' roadmap and on the repository work board's Rows, one chevron per unit labelled with the unit's name, on a line of its own like the WIP strip |
| **Timeline** | the Timeline Tile's Bar: one part per timed step visit |
| **Legend** | one per Tab or per Tile (§2), and one per repository Panel on the org work board; an issue board's Timeline Tile carries two, its kinds of work (one entry per family, with its steps' shades) and its step visits (one entry per visit, with its times) |
| **FillPulse** | the live indicator's dot while the view is live and changing (§1, §6) |
| **FullPulse** | whatever is being worked on (§1); while its run waits on the user, a Ring alone |
