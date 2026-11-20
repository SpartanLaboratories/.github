# Boards — the names of the dashboards and their parts
<!-- {"name":"Boards — the names of the dashboards and their parts","code":"P-N-B","id":140} -->

The names of the dashboards every Spartan Labs repository keeps: the boards, their groups, and how
the boards use the interface elements named in
[R-139 (UI elements — one name per element)](https://github.com/SpartanLaboratories/SpartanUI/blob/main/docs/nomenclature/ui.md "139-T2").

## Dashboards and boards
<!-- {"name":"Dashboards and boards","code":"P-N-B-DB","id":1117} -->

"Dashboard" is the umbrella for two groups, and every member of either is a **board**:

| Group | Shows | Its boards |
|-------|-------|------------|
| **State boards** (`docs/dashboards/`) | what the code is and does at a named commit | the **system board**, the **supersystem board**, the **repository state board**; planned: the **org project board**, the **intra-org dependency board** |
| **Work boards** (`docs/plans/`) | how the work is going | the **issue board**, the **tracking board** (a tracking issue's issue board), the **repository work board**, the **org work board** (one board for the organization, in `OrganizationPage`) |

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
| **org work board** | every repository of the organization at once: each one's runs, landed issues and tracking chains, linking to that repository's boards |

A board's own word for itself, in its text and its labels, is "board"; the file names and the
scripts follow (`check-board.js`). The kind ids the scripts and the data use are identifiers and
keep their spelling: `plan-board`, an issue or a tracking board (its `<meta name="dashboard">`
and `plan.json`'s `schema: "plan-board/1"`), `work-board`,
and `org-work-board` (its `<meta name="dashboard">` and its `board.json`'s `schema: "org-work-board/1"`).

"Page" is retired: it never names a board (GitHub Pages is something else).

## Companions of the boards
<!-- {"name":"Companions of the boards","code":"P-N-B-CB","id":1118} -->

Beside the boards stand their companions, which are not boards: none is held to a board's template or checks, and no committed board links one.

| Companion | What it is |
|-----------|------------|
| **system Whiteboard** | a private Claude Whiteboard beside a system board: the system's as-built structure, generated, with its open issues, follow-ups and ideas as notes, and room around it for the user's own thinking |
| **supersystem Whiteboard** | the same beside a supersystem board: its systems as sections and how they interact |
| **repository Whiteboard** | the same for a repository: its supersystems and systems as sections and how they interact |
| **org Whiteboard** | one for the organization, drawn from the org work board, with a free area for the ideas that span repositories |
| **ideas file** | a repository's committed ideas, `docs/plans/ideas.json`, and the organization's, `docs/plans/org-work-board/ideas.json`: each idea's kind, its text and the parts it concerns |
| **published copy** | a committed board also published as a private claude.ai page: still that board, the page only where the copy is read |

Together they are "the Whiteboards" ("Whiteboard" capitalised, the product's name), "the ideas files" and "the published copies". A
Whiteboard's **generated part** is what is written on it from its sources, a run's section in progress included; everything else on it is the
**user's part**. A Whiteboard is never called a board, and a board never a Whiteboard.

## Board UI
<!-- {"name":"Board UI","code":"P-N-B-BU","id":1119} -->

Every visible element on a board takes its name from
[R-139 (UI elements — one name per element)](https://github.com/SpartanLaboratories/SpartanUI/blob/main/docs/nomenclature/ui.md "139-T3");
the look follows the boards' colour coding and Legends.

A board's compound names follow
[R-1114 (Naming)](https://github.com/SpartanLaboratories/SpartanUI/blob/main/docs/nomenclature/ui.md#naming "1114-T1"):
the reference that ends a Verdict statement ("§4.2", opening the section's excerpt) is its
**section Chip**, a landed unit's pull request and merge commit on its As built Cell ("PR #89",
"merge 8122af7", each opening what it names) are its **PR Chip** and **merge Chip**, a figure and
its noun in a Cell's head or foot (the Gap Cell's "· 2 evidence", the Verdict Cell's "1 step · 0
tests · 2 risks", a stage's step with steps of its own in the step Panel, "11 of 19 done · at
2-3-12", the figure muted at zero) is a **count Label**, and the Chip headed "Now" that holds the
run's latest report in the step Panel is the **Now Chip**.

Where a template's CSS class names an element's kind it carries the type word, so a reader can tell
the kind from the markup without the board: `.card`, `.chip`, `.badge`, `.cell`, `.ring`, `.arrow`,
`.guarantee-card`, and `.kpi-tile` (a KPI Tile), `.verdict-pill` (a verdict Pill), `.dep-pill` (a
DualStatePill), `.legend` (a Legend), `.stepbar` (a StepBar), `.wip-panel` (the WIP Panel), `.unit-card` (a unit Card in a tracking board's chain),
`.fullpulse` (a FullPulse),
`.col-fullpulse` (a whole column's FullPulse), `.colcell-fullpulse` (a Cell carrying its column's
FullPulse at phone width), `.upnext-ring` (the up-next Ring) and `.fillpulse` (the live dot's
FillPulse).

A row exists only for a specific use of a `ui.md` term on the boards, such as a compound name built
on it, or for a deviation from `ui.md`, and never restates `ui.md`
([R-1000 (Single source)](../../Structure.md#single-source "1000-T1")). Each row says what its term is for on
the boards.
The rows stand in three groups, each in `ui.md`'s family order: **deviated**, where the boards depart
from `ui.md` (a row that also names subtypes of its term stands here and names them); **subtyped**,
where the boards name subtypes of the term; and **as-is**, where the boards use the term as `ui.md`
defines it.

### Deviated
<!-- {"name":"Deviated","code":"P-N-B-BU-1","id":10039} -->

| Term | Its purpose on the boards |
|------|---------------------------|
| **CodeLabel** | a `code` span in the data, a path, a sha, a branch, a class; plain inside a Chip, a Pill, a Tile, a Badge or a Tag |
| **Tracer** | from a KPI Tile up to the part of the Timeline Tile it belongs to (the steps that made the Tile's figure), in their kind of work's colour, labelled with how long that part took; under 760 px its label alone, on the Tile |

### Subtyped
<!-- {"name":"Subtyped","code":"P-N-B-BU-2","id":10040} -->

| Term | Its purpose on the boards |
|------|---------------------------|
| **Panel** | the Guarantees Panel (headed "Guarantees"), the Context Panel (headed "Context"), the WIP Panel (the Panel that holds the WIP strip), the step Panel, a system Panel on the Systems Tab (its own Card the heading; a subsystem's inside its supersystem's), the org work board's repository Panel and organization Panel (a sub-organization's repository Panels inside its organization Panel) and its Ideas Panel (headed "Ideas", after the organization Panels on its Repositories Tab: the organization's ideas file, one idea Card per idea), the inspector: the side Panel that shows the selected item, a Hide Button right of its heading |
| **Card** | a guarantee Card, one guarantee a consumer can rely on; a Consequences Card, one consequence of the change as it now stands; an As built Card, one Row as built: its state, its statements and every change from the verdict; a unit Card, a tracking board's unit in progress, with its own run; the Ideas Card, in an issue or a tracking board's Context, the ideas of the repository's ideas file that name its issue; an idea Card, one idea of the organization's ideas file, on the org work board's Ideas Panel |
| **Cell** | a Gap, Considered, Verdict or As built Cell; a step Cell |
| **Tab** | each of a board's views: a state board's six core Tabs, its optional ones and a supersystem or repository state board's Systems Tab; a work board's Tabs |
| **Tile** | the KPI Tiles, an issue board's counts, each with the Bar of what it counts; the Timeline Tile, the time the run took, step visit by step visit; the repository work board's Runs Tile, every run by its state, and its Landed Tile, the runs that have landed |
| **Pill** | a verdict Pill, the verdict on an option weighed or on a quality review; an as-built Pill, a Row's as-built state; the research-state Pill, the state of a Row's research, in the head of its Considered Cell; the blocked Pill, "⊘ blocked by #n" on the unit up next while a blocker has not landed, in the waiting colour (yellow), drawn by the templates from the unit's blockers alone |
| **Chip** | an issue Chip, an issue by its number, opening its board, or the GitHub issue while it has none; the "part of" Chip, the parent issue, in the header; a branch Chip, the run's branch, in the header; the chain Chip, a tracking board's chain in its header: how many units have landed, which are in progress and which is up next; the org work board's unlinked Chip, saying a board is not linked yet |
| **Badge** | on a Consequences Card, the effect Badge, how a downstream party is affected; the need Badge, whether a consumer must change to adopt it; the API-change Badge, whether a public surface was added, changed, deprecated or removed |
| **Tag** | a header fact with its label (the branch, the systems, a system board's visibility); "UP NEXT" on the unit up next; "⊟ archived" on a system no longer developed; the kind Tag, an idea's kind (fix, improvement, feature, exploration or future, shown in capitals), on the Ideas Card and on an idea Card |
| **DualStatePill** | the dependency DualStatePill: the build state on the status scale and the locality on a neutral ramp |
| **Ring** | the research Ring, the research scale on a Considered Cell; the up-next Ring, a still outer Ring on the unit up next; whatever is being worked on, while its run waits on the user |
| **Arrow** | the charging Arrow, the connector into a Verdict Cell; the connectors of a tracking board's units chain |
| **Switch** | the theme Switch (☀ light, ☾ night) and the inspector Switch, in the header, drawn in the neutrals (never the accent or a status colour) |
| **Button** | the inspector's Hide Button, hiding the inspector as the inspector Switch does; the option Button, an option in a Considered Cell, opening it in the inspector; the "back to now" Button, returning the step Panel from a finished step to the current one |

### As-is
<!-- {"name":"As-is","code":"P-N-B-BU-3","id":10041} -->

| Term | Its purpose on the boards |
|------|---------------------------|
| **Row** | an issue board's design point, a tracking board's unit |
| **Disclosure** | a stage of the step Panel (an implementation stage, a plan stage, or a tracking board's architecture stage), a stage's step that has steps of its own, a remediation's sub-step, a Document task, a finished step's visit, a finished Implementation view, a folder line of a step's file list |
| **CodeBlock** | an option's signature, beneath its name |
| **ShareBar** | the Tiles' Bars, but the Quality Reviews Tile's (a SlotBar) and the Timeline Tile's (a Timeline) |
| **SlotBar** | the Quality Reviews Tile's Bar: one slot per review allowed, filled in order by each review's result |
| **StepBar** | the WIP strip of an issue board (its progress strip) and of a tracking board, its chevrons labelled with the step names; the research indicator (planning, research, verification) and the plan step's StepBar (plan writing, plan accepted) in the step Panel, their chevrons labelled with those names; a tracking board's own chain on the phase's Card, one chevron per unit labelled with the unit's name, and in the header's chain Chip under its sentence, one chevron per unit labelled with the unit's issue number; a tracking issue's chain on the state boards' roadmap and on the repository work board's Rows, one chevron per unit labelled with the unit's name, on a line of its own like the WIP strip |
| **Timeline** | the Timeline Tile's Bar: one part per timed step visit |
| **Legend** | one per Tab or per Tile, and one per repository Panel and one for the Ideas Panel on the org work board; an issue board's Timeline Tile carries two, its kinds of work (one entry per family, with its steps' shades) and its step visits (one entry per visit, with its times) |
| **FillPulse** | the live indicator's dot while the view is live and changing |
| **FullPulse** | whatever is being worked on, but not while its run waits on the user (the Ring row) |
