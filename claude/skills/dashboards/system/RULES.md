# System boards — the ruleset

A system page shows a system **as it is**: what it does and how it is built, drawn from the code
at a named commit. Under that comes what a consumer can rely on (the Guarantees), and under that
the Context. The supersystem and repository pages bind systems together and show how they
interact. `GUIDANCE.md` applies throughout — colour coding, legends, dashed means planned, themes,
self-contained pages, facts, Context, divergence, checks, defects and hygiene are stated there
and not repeated here. This file holds what is specific to system boards.

## 1. Files

```
docs/dashboards/
├── index.html                 the repository page (all systems, their interactions)
├── state.json                 the repository page's stamp, embedded in index.html (§2)
├── systems.json               the registry — every system, its slug, function, paths, status, stamps
├── workspace.dsl              the repository-level C4 model, embedded in index.html
├── <supersystem-slug>/        a group of systems, when a repository has more than one group
│   ├── index.html
│   ├── state.json
│   └── workspace.dsl
├── <system-slug>/
│   ├── index.html             the system page
│   ├── state.json             the page's stamp: as-is commit, version, last amendment (§2)
│   └── workspace.dsl          the system's C4 model, embedded verbatim in index.html
└── _template/                 optional: the repository's own copies of the templates below
```

This set ships, under `skills/dashboards/system/`:

| Path | What it is |
|---|---|
| `template/system.html` | The system page: renderer CSS/JS plus documented placeholders for one system — the six core tabs with their legends, the Guarantees bubbles, the Context cards. Copy it; never fill it in place. |
| `template/supersystem.html` | The supersystem / repository page: the Systems tab from the registry, the six core tabs as repository-level scaffolds in per-system colours, the C4 views from the DSL, Guarantees with one row per system, Context. |
| `template/systems.json` | The registry's shape, with built and planned examples. |
| `template/state.json` | A page's state: the stamp, version and last amendment its header draws (§2). |
| `examples/webtools-udp/` | A complete system page and DSL for WebTools' `webtools-udp` — read it to see every panel, legend and Guarantees bubble filled with real facts. |
| `scripts/embed.js` | Embeds `workspace.dsl` (block `dsl`), `systems.json` (block `systems`) or `state.json` (block `state`) verbatim into a page; `--check` verifies. |
| `scripts/apply-state.js` | The data-only path of a state page (§10): restamps the pages a branch touches, marks parts built or planned in the DSL and the registry, re-embeds, checks without a browser; the admin team runs it. |
| `scripts/statelib.js` | The state, DSL and registry reading and editing `apply-state.js` writes through and `check-page.js` checks with (not a command). |
| `scripts/check-page.js` | The browser checker for **every** dashboard page, system and plan alike (§9); `--auto` checks only what a page adds to its template; `--auto --no-browser` runs every check that needs no browser and names the pass it defers. |
| `scripts/deviation.js` | How far a page deviates from its template (used by `--auto`; not a command). |
| `scripts/features.js` | The per-page feature probes: one detector per template feature, its skill step and the page types it fits (`GUIDANCE.md` §8, "Features"; not a command). |
| `scripts/splice.js` | Brings a state page onto its current template: the template's CSS, script before MODEL and renderer carried onto the page, three ways for a declared divergence, the page-filled lines and the page's own content kept, old chips relabelled, a missing state block added (§8). The landing refresh runs it; `--verified` splices onto the template's recorded verified version instead of the file on disk, for a template being edited. Its merge bases come through `scripts/history.js`, which rebuilds a recorded version missing from the local `verify/history/` cache from the `.github` mirror's git history (`--history-repo <clone>`, else `gh api`) and warns on one it cannot find (§8). |
| `scripts/palette.js` | The shared system palette (six slots, light and dark) and the status-hue rule that `check.js` and `check-page.js` apply (`GUIDANCE.md` §1; not a command). |
| `../verify/verify-templates.js` | Verifies every template once with the fixtures in `../verify/fixtures/` and records its hash in `../verify/verified.json`; run it after any template change. |

## 2. The sources of a system page

A system page is driven by three sources that the presenter keeps in step (`GUIDANCE.md` §3): its structure, its behaviour and
its stamp.
Everything else on the page is either rendered from them or is a hand-written panel of verified
facts.

1. **`workspace.dsl` — structure.** A Structurizr workspace with hierarchical identifiers: the
   consumer as a `person`, the repository as the `softwareSystem`, each system as a `container`,
   the system's types grouped as `component`s with tags `Public`, `Internal`, `Standalone` or
   `Planned`, relationships with a short description, the four views (`systemContext`,
   `container`, `component`, one `dynamic` view for the defining interaction) and the `styles`
   block. The page parses it at load and renders the C4 tab from it: edit the file, then
   `node scripts/embed.js workspace.dsl index.html dsl`. Identifiers are stable across runs; new
   elements get new identifiers. The parser covers this subset only — stay inside it (no
   `!include`, no `properties`, no `deployment` views, one element per line, relationships as
   `a -> b "description"`). In the `styles` block only `Planned` has a dashed border;
   `Standalone` is dotted, `Internal` solid; `check-page.js` fails a dashed style on any other tag.

2. **The page's `MODEL` — behaviour.** A JS object in the page with:
   - `sides`: the names of the page's colour groups — the three hue slots `server`, `client` and
     `wire` (blue, purple, teal: slots 1 to 3 of the shared palette, `GUIDANCE.md` §1) plus
     `consumer` and `external` — which the inspector and the generated legends print;
   - `structure`: the hand-placed component map (lanes, notes, nodes with positions on a
     1000×612 canvas; nesting is ownership; `pub`/`int` and the side are the visual encodings;
     `kind` `standalone` draws a dotted box, `planned` a dashed, faded one; each node's `d` block
     is what the inspector shows);
   - `threads`: every thread by name, its owning side, when it is created, what runs on it, what
     it sends;
   - `flows`: one or more decision-path variants, each with its controls, a node grid, edges
     and a `rules(state)` function returning the lit path, the outcome and the controls that do
     not matter for it (the example's two variants are the server and client datagram paths);
     an end's level picks its status colour, `planned: true` dashes a node;
   - `sequence`: the lifelines (a name, or `{n, side}` to give the header its side's hue), phases
     and steps of the defining interaction;
   - `c4`: the map from map-node ids to DSL element ids, which cross-links the two views.

   The supersystem page's `MODEL` has the same shapes with a registry slug (`sys`) where a system
   page has a side, plus `structure.deps` for the dependency arrows.

3. **`state.json` — the stamp.** `{slug, version, asIs {ref, sha, date, landed}, lastAmended {issue, title, sha}, written {sha}}`,
   beside the page and embedded verbatim (`node scripts/embed.js state.json index.html state`; `template/state.json` is its shape).
   The header's version, as-is and "written at" chips are drawn from it, and the last amendment's note in the Context section (the part
   of the page above Context names no issue, `GUIDANCE.md` §5): the presenter writes those facts here and never in the HTML. `asIs` is the commit the page shows — the default branch's after a landing, or a feature branch's while that
   branch's work is shown on it, `landed: false`, which the chip reads "as-is at <branch> @ <sha> · not yet landed" (§10); the date
   is a date, or a UTC time the page shows in the viewer's zone. `lastAmended.title` is the issue's title, quoted verbatim (its slug while
   none is given), the link to its plan board (`GUIDANCE.md` §5).
   `written.sha` is the commit at which the presenter last wrote the page's prose and figures (the function sentence, the KPI tiles,
   the panels, the Guarantees, the Context); the presenter sets it to `asIs.sha` whenever it writes them, and while the two differ the
   header shows "written at <sha>", so a restamp never claims prose nobody read again. The state agrees with the page's registry entry
   (§7) on `asIs`, the last amendment's issue and, on a system page, the version; `check-page.js` fails a difference. A supersystem or
   repository page keeps the same file, its version `null`.

**Planned parts** are drawn from the data, never from a hand-written mark, so the data-only path (§10) can mark one built:

- On a system page, a structure node mapped to a DSL element through `MODEL.c4` (or carrying its own `part`), and a thread, flow
  node, lifeline or sequence step carrying `part: "<element id>"`, are planned while that element carries the `Planned` tag.
- On a supersystem or repository page, an item with `sys` (a structure box, a thread, a flow's end, a lifeline) is planned while the
  registry's entry for that system is `planned`, and one with `part` while its DSL element is; a dependency arrow while either end is.
- A hand-written element about a planned part — a thread, a lifecycle step, a Guarantees row — carries `data-part="<element id>"`, or
  on a supersystem or repository page `data-part="sys:<slug>"`, and the renderer gives it the class `planned` while the data says so.
- A planned DSL element names, before `Planned`, the tag it takes once built (`"Internal,Planned"`): marking it built removes
  `Planned`.
- **Built or planned is the code's** (§7, §10): a system with code paths in the registry is built while one of them is present at the
  stamped commit; a part with code paths of its own (its entry's `partPaths`) likewise; a supersystem once every core subsystem is.
  `apply-state.js` writes what the code says, and `check-page.js` fails a page whose drawn status disagrees with it.
- A literal `kind: "planned"` or `planned: true` still draws an item that no data stands for. `check-page.js` fails a `part` or
  `data-part` that names no element of the page's DSL and no system of its registry (`PART UNKNOWN`).

Hand-written panels (threads list, send-paths matrix, lifecycles cards, the Guarantees bubbles,
the Context cards) and the header (function sentence, version, as-is stamp, last amended)
complete the page. The template marks every placeholder with a `<!-- presenter: … -->` comment.

**Board links** (`GUIDANCE.md` §5). The script's `BOARDS` constant maps an issue's number to its plan
board, relative to the page (`{"38":"../../plans/38-handshake-empty-name/dashboard.html"}` on a system page,
`../plans/…` on the repository page), for every issue the page names whose board is in the repository. The
presenter fills it from the folders on disk when it writes the page, as plain JSON on its one line (a
page-filled line, §9). The renderer links through it (`ilink(n)`: a lone `#n` opens the board when one
exists, else the GitHub issue; `pair(n, title)`: the number opens the GitHub issue, the title the
board). Hand-written HTML writes the number of a pair as a plain GitHub link and its title as
`<a data-board="N">title</a>`, and a lone `#n` as `<a data-issue="N">#N</a>`; `linkIssues()` resolves both
at load and leaves a title plain text while its issue has no board. Nobody writes a board's path
anywhere else on the page.
**The work board** (`GUIDANCE.md` §5): the script's `WORK_BOARD` line, a page-filled line like `BOARDS`, names the committed work board
relative to the page (`"committed"`, or `null` while `docs/plans/index.html` is not there; `check-page.js` fails a dead one) and the live
view's marker (`"live"`, `docs/plans/.live/index.js`). A hand-written `<a data-workboard>` opens the live view when its marker loads, else
the committed board, else stays plain text; the renderer adds a line for it to the Plans and documents card when the page has none.
The header names the ref and short SHA the page reflects, drawn from `state.json` (above), and no issue: the last amendment is said in the
Context section; every count on the page is counted. Each chip is a tag, its label then its value,
`<span class="chip"><span class="ck">version</span> <b>2.0.0a</b></span>` (a bare value such as the platform gets its label,
"platform"); the template's CSS shows the intro (crumbs, title, function) on the left half of a wide screen and the tags as cards in
the right half beside it, and stacks them under 940 px (`GUIDANCE.md` §6, "The header"). A page written before the labels keeps its
chips, which the same CSS lays out alike, until the splice (§8) relabels them where their content says what they are (a version, the
as-is stamp, the C4 model, the systems count), removes an old "last amended by" chip and reports any other for the presenter to label. The header also carries the **theme switch**
(`GUIDANCE.md` §1, Themes), a light/night toggle the template's renderer adds right of the
breadcrumb; the presenter writes nothing for it. A system, supersystem or repository page has **no
live indicator**: it shows the code at a named commit and has no run to follow (`plan/RULES.md` §3,
"Live updates").

## 3. Tabs

**Order on the page:** function first (the tabs), then the Guarantees area, then Context.

**Core tabs.** Every page carries six — Structure, C4 model, Threads, Decision path, Sequence,
Lifecycles — each adapted to the page's level and named for what it shows (the example's
Decision path is its "Datagram path"). Repository and supersystem pages put a **Systems** tab
first and adapt the six: Structure shows how the systems compose and depend on each other;
Threads the threads and processes across systems; Decision path a cross-system decision, such as
which module a consumer picks; Sequence a cross-system interaction; Lifecycles the lifecycles
that span systems, such as source to release.

The tablist takes Left and Right, Home and End, with one tab in the Tab order (a roving tabindex). A tab's lede is one short line, and only for what its graphic and legend do not show (`GUIDANCE.md` §2):
what to click, a fact the picture cannot carry. On a wide desktop the page uses most of the window
(`GUIDANCE.md` §6): the inspector widens to 360 px, the Guarantees run five to a row, and a diagram
drawn to a fixed aspect (Structure, the decision path, the sequence) grows to at most 1280 px wide; the
C4 canvas, the thread columns, the lifecycle cards and the Context take the rest. The inspector stays
beside every tab and scrolls inside itself when its entry is taller than the window.

**Optional tabs.** Add one after the core tabs wherever content for it exists, on any page.
Candidates:

- **Dependencies** — the module and artifact graph, `api` vs `implementation`, coordinates and
  versions, third-party libraries.
- **Runtime** — threads, child processes, sockets and ports, and who opens and closes each.
- **Build & release** — source → build → level tests → sign and publish → Maven Central, with
  each module's version.
- **Choose-a-module path** — the consumer's decision tree for which artifact to depend on.
- **Trust boundaries** — where untrusted input enters and what checks it.
- **Failure model** — how failures reach a consumer, and what retries.
- **Extension points** — the public seams with their stability tier and opt-in marker.
- **Test levels** — test classes per module per level of the 5-level hierarchy.
- **Wire & stored formats** — what crosses a boundary or persists, and its layout.
- **Environment** — what the host must provide: the JDK floor, browsers, ports, network.

Others at the presenter's discretion. Failure model, Extension points and Test levels are also
Guarantees bubbles: the bubble is the summary and always stays; the tab is for content that
needs a diagram the summary cannot hold. Optional tabs have no scaffold — build them from the
core tabs' renderers and CSS.

## 4. Each tab's colour plan

`GUIDANCE.md` §1–§2 set the rule (one colour per system, status colours with glyph and word,
dashed = planned, a legend on every tab). The groupings the system templates use:

| Tab | System page | Repository / supersystem page |
|---|---|---|
| Systems | — | the system; built solid, planned dashed |
| Structure | side (hue) × public / internal (fill) | the system; nesting is composition |
| C4 model | element kind from the DSL `styles`, incl. External and Planned | the same |
| Threads | the owning side | the owning system |
| Decision path | the outcome level an end lands on | the system an end lands on, or the level |
| Sequence | the lifeline's owner: a side, the consumer, outside | the owning system, the consumer, outside |
| Lifecycles | phase: start · run · stop | phase, named for the lifecycle (build · verify · release) |

- The C4 tab's legend is `.c4key`; every other tab's is `.key`.
- On a system page the groups are the hue slots `--server`, `--client` and `--wire` (slots 1 to 3
  of the shared palette); name them in `MODEL.sides` and the Structure legend.
- On a supersystem or repository page each top-level system takes a slot `--sys-1` … `--sys-6`
  in registry order (`sysColour(slug)`: a top-level system is one whose parent is not itself a
  system on the page; a child takes its top-level ancestor's slot; a seventh folds into
  neutral), and every hand-written element about a system carries `data-sys="<slug>"` so
  `paintSystems()` colours it. The plan boards use the same slots (`plan/RULES.md`), so a system
  has one colour on both sets.
- The slots' values are the shared palette's (`GUIDANCE.md` §1, `scripts/palette.js`), and no
  system colour falls in a status spectrum: no green, yellow, orange, amber, red or pink, since the
  status tokens carry outcomes (the Decision path's ends) and compatibility. A page never redefines
  a slot.
- Further tokens on `:root`: the ordinal phase ramp `--ph-1` … `--ph-3` (classes `.ph1` …
  `.ph3`), used by Lifecycles. A single series (the test-class bars) is neutral ink, not a hue.
- Nothing built is drawn dashed, and a dash means planned and nothing else (`GUIDANCE.md` §1):
  standalone is dotted, a lazily started thread an outlined pill, the DSL's `Internal` style solid,
  and the diagram furniture solid — the sequence's and the C4 dynamic view's lifelines faint and
  solid, a return message a thin solid line told by its open arrowhead, the C4 boundary frame a
  faint solid outline. A planned lifeline, message, relationship or element is dashed on every view,
  the C4 dynamic view's included. `check-page.js` fails any other dash (§9).
- A planned system appears on supersystem and repository pages only, dashed and faded, never with a page of its own; it names no issue
  above the Context section: its Systems card links its plan board by name ("its plan") where one exists, and the issue that plans it is
  on the Context's roadmap. It gets a page when its implementing issue lands.
- A supersystem's subsystems are marked **core** (the greater system cannot exist without it) or **optional** on the Systems tab, with
  their legend entries, as the registry's `core` says (§7); one not classified yet says so.

## 5. Guarantees

Every page carries a Guarantees area (`.guarantees`) below the tab stage and above Context. It is
always visible, whatever tab is open, and is never a tab. It holds named sub-bubbles, each a
compact titled panel (`.bubble`) of three to five short lines read from the code, its KDoc and
its build. The seven standard ones:

- **Failure model** — how failures reach a consumer (e.g. `kotlin.Result`), what the system
  retries itself and what it surfaces.
- **Extension points** — the public seams with their stability tier (Stable Core / Supported
  Extension / Experimental) and opt-in marker.
- **Test levels** — test classes per level of the 5-level hierarchy, read from the package
  layout and labelled by the test level and its name ("L1 gating", "L2 component", "L3
  integration", "L4a deterministic", "L4b e2e", "L4c non-functional", "L5 UAT"); test levels are
  not work levels and keep their level labels (`GUIDANCE.md` §4); link the test-inspector report
  if one exists.
- **Compatibility & versioning** — the current version; how versions move (a trailing letter for
  a bug fix, the third number for an addition); what is checked (an ABI dump where one exists);
  the deprecation policy (deprecate, don't break — or "legacy: may break freely" where that
  applies).
- **Thread safety** — which public types are safe to share across threads or coroutines, and
  which are confined.
- **Resources to close** — what a consumer must close or stop, and what leaks if they don't.
- **On your classpath** — the `api` dependencies a consumer inherits.

Add a bubble where the system has another guarantee worth stating. A fact that cannot be
established is said in the bubble as a gap (`.gap`). Under the bubbles stands the Guarantees' legend, generated from what they draw (the
system swatches, a planned row dashed, a gap, the test-level bars' one neutral series, a tier badge): nothing hand-written. On repository and supersystem pages each
bubble covers every system, one row each (`.gtbl`, the system's swatch first); a planned system's
row is tied to it (`data-part="sys:<slug>"`), dashed while the registry says planned, and says only that nothing is built yet.

## 6. Context on a system page

`GUIDANCE.md` §5 sets the section (headed exactly **Context**). On system boards its cards are:

- **Roadmap** — each roadmap item with the issues mapped to it, each issue with its number,
  title, quoted verbatim, and state, open or closed (the tracker's reason for a closed issue is the plan boards' and the work board's: a type divergence,
  `GUIDANCE.md` §7), never its work level (`GUIDANCE.md` §4: a title that names one is a defect in the issue, quoted as it stands and
  flagged by `check-page.js`, `ISSUE TITLE NAMES A WORK LEVEL: #n`, never reworded or elided); the number opens the GitHub issue and
  the title the issue's plan board where one exists (`GUIDANCE.md` §5; the title written
  `<a data-board="N">`, §2 "Board links"); no GitHub ↗. A tracking issue shows its chain, written `<span class="chainprog"
  data-landed="n" data-total="m"></span>` (the renderer draws "chain n of m landed" and its bar), from its tracking board. The last
  amendment, drawn from `state.json`, opens the section as the same pair ("last amended by #n title"). A roadmap item is a tracking issue with its sub-issues,
  or an entry in a roadmap document the repository keeps, with the issues it names. On a system
  page, list the items that claim an issue touching the system, those issues under them, and how
  many of the item's issues touch other systems.
- **Unscheduled issues** — only the open issues that no roadmap item claims (on a system page,
  those touching the system).
- **Plans and documents** — the plans that shaped the system and its reference documents. The
  plan boards (`docs/plans/<issue>-<slug>/dashboard.html`) that amended the system are linked
  here, and the work board (`<a data-workboard>`, live first, §2).

Date both issue lists. A bug badge is neutral, told by its ▲ and its word. Under the cards stands the Context's legend, generated
from what they draw (the system badges, the issue's state, the bug badge, a planned badge, the chain bar).

## 7. The registry

`systems.json` lists every system and supersystem: `slug`, `name`, `kind`
(`system` | `supersystem` | `repo`), `parent`, `status` (`built` | `planned`), `function`, `paths`,
`version`, `core` (on a subsystem of a supersystem: `true` where the greater system cannot exist without it, `false` where it is
optional or additive; from the parent's architecture, its decomposition, recorded by the presenter at `architecture-signed-off` or the
landing refresh; never guessed), `partPaths` (`{"<element id>": ["<code path>", …]}`: a part of the system's page with code paths of its
own), `asIs {ref, sha, date, landed}` (`landed: false` while the stamp is a feature branch's, §10; absent once it is the default
branch's), `lastAmended {issue, sha}`, `page`, `dsl`, and for a planned system `plannedBy {issue, architecture}` (and `units`, each
with its `subIssue`) and `c4`, a map from each DSL that draws it (its path under `docs/dashboards/`) to its element there,
`{"workspace.dsl": "repo.gamma"}`, which `apply-state.js` marks with it. The supersystem and repository pages embed a verbatim
copy (`node scripts/embed.js systems.json index.html systems`).

**Status is the code's.** A system's `status` is derived from the system itself: built while one of its `paths` (relative to the
repository root) is present in the tree at the stamped commit, planned while none is; a system with no `paths` keeps the status it has
(a planned system's paths are recorded when its architecture names them). A `partPaths` element is built, and loses its `Planned` tag,
the same way. A **supersystem** is built when every one of its **core** subsystems is built, planned otherwise; its optional ones do not
count; while a subsystem is not classified (`core` unset), or none is core, the code decides nothing for it and `apply-state.js` asks the
presenter (`enrich: yes`). There is no partly built state: its page draws each subsystem solid or dashed by that subsystem's own status. Its order sets the colour slots
for both sets of pages: reordering it recolours every system page and every plan board, so
append rather than reorder.

## 8. Workflow

1. Identify the system from the plan or architecture and the diff; add it to the registry if new.
   When the system is genuinely unclear, stop: `BLOCKED — system unresolved`, with the
   candidates.
2. Copy `template/system.html` to `docs/dashboards/<slug>/index.html` (or start from the
   repository's `_template/`, or the existing page on an update) and write `workspace.dsl`. An existing page is first brought onto the
   current template with `node scripts/splice.js <page>` (the landing refresh does it for every state page it touches, and the
   repository and supersystem pages): read its report, settle any conflict it names, fill any new page-filled line it names.
   The splice merges from the template versions `verify/verified.json` records; their text is cached in `verify/history/`, which
   is local and kept out of the `.github` mirror. A version missing from the cache is rebuilt on demand (`scripts/history.js`)
   from the mirror's git history at `claude/skills/dashboards/<template path>`, from a local clone given with
   `--history-repo <path>`, else through `gh api`, matched by its recorded LF-normalised sha256 and written back into the cache.
   A version nothing matches is a `WARNING` in the report (say so in yours); with none left to read, the splice is two-way, the
   page against the current template alone, so check the parts it replaced.
   **Go off the template** (`GUIDANCE.md` §3): change only what the facts require — the DSL, the
   `MODEL`, the hand-written panels, the header — and leave the template's CSS, tab set and
   renderer script as they are. Anything beyond that (an optional tab, a removed core tab, a
   change to the renderer or CSS) is a divergence: declare it in the head with
   `<meta name="template-divergence" content="what and why">` and in the footer comment.
3. Fill the DSL, then the `MODEL`, then the hand-written panels and header, from the code and the
   architecture documents, and `state.json` with the stamp (`written.sha` the commit you read). Tie every planned part to its data
   (§2, "Planned parts"). Re-embed the DSL and the state.
   The footer stays the template's one line, "Corresponds to `workspace.dsl`. Code is
   authoritative on any conflict." (a supersystem or repository page: `docs/dashboards/systems.json`
   and `workspace.dsl`); no baseline, stamp or "maintained by" clause (`GUIDANCE.md` §3).
4. Set each tab's colour plan and legend (§4).
5. Fill the Guarantees bubbles from the code: the `Result` and exception types and what retries;
   the public open and abstract types and interfaces, with their tier and opt-in markers; the
   test classes per `testing.<level>` package and `build/reports/test-inspector/index.html` if
   present; the version, what the build checks and the deprecation policy; the KDoc's thread
   contracts; the `stop` / `close` members and what they free; the `api` dependencies from the
   build file or the published POM.
6. Map the Context: the open issues (`gh issue list --state open`); for each tracking issue its
   sub-issues (`gh issue view <n> --json subIssues,parent`); the repository's roadmap document,
   if it keeps one. Each issue a roadmap item claims goes under that item; the open issues no
   item claims are the unscheduled ones. Link the plan boards that amended the system. Fill `BOARDS`
   with every issue the page names whose `docs/plans/…/dashboard.html` exists in the tree (§2, "Board
   links").
7. Add an optional tab wherever content for one exists (a declared divergence, step 2).
8. Update the parents: the system's card and its place on every tab of the supersystem and
   repository pages, their Guarantees rows and registry copies; the supersystem DSL if an
   inter-system relationship changed.
9. Check (§9) with `--auto`, look once at the screenshots it took, fix.
10. Report the paths, the as-is stamp, the divergences (with the argument for any removal) and
    the gaps; the admin team commits the files.

## 9. Checks

```
node scripts/check-page.js docs/dashboards/<slug>/index.html --auto [--out <dir>]
node scripts/embed.js docs/dashboards/<slug>/workspace.dsl docs/dashboards/<slug>/index.html dsl --check
node scripts/embed.js docs/dashboards/systems.json docs/dashboards/index.html systems --check
node scripts/embed.js docs/dashboards/<slug>/state.json docs/dashboards/<slug>/index.html state --check
node scripts/check-page.js docs/dashboards/<slug>/index.html --auto --no-browser
node scripts/check-page.js docs/dashboards/<slug>/index.html [--tab t-c4] [--out <dir>] [--theme dark] [--width 520] [--frame 390]
```

**`--auto` is the usual mode** (`GUIDANCE.md` §8). The template is verified once, in the skill,
by `verify/verify-templates.js`; `--auto` compares the page with it (`scripts/deviation.js`): its
`<style>` blocks, its tab ids in order, its script before `MODEL` (from the main `<script>` to
`const MODEL = {`: the helpers, and on a supersystem or repository page the Systems renderer),
and its renderer script (everything after `MODEL`'s closing `};`, less the `DEFAULT_INSPECT`
line, which is the page's own text). The script before `MODEL` is compared less its
**page-filled lines**: the `REPO` and `SRC` constants, and any other `const` whose line in the
template carries a `// presenter:` comment (the `BOARDS` map), which is how a template marks a line filled per
page; those lines are left out by name on both sides, so a page's own value there is never a
difference. A page whose four are the verified template's gets **one light pass**, which checks
the facts it fills in. A page that differs in any of them — declared with
`<meta name="template-divergence">` or not, or made from an older template — or whose template
changed since it was verified gets the **full pass**: light, dark, 520 px, a 390 px frame and a
1920 x 1080 desktop. An
undeclared difference is reported as one to declare or undo. `verify/verify-templates.js` tests
this comparison on each system template before its browser passes. The plain form below the
embeds runs one pass of the named mode, for looking at a single tab.

`check-page.js` needs a local Chrome or Edge (it searches the usual install paths; set `CHROME=`
to point at another). It clicks every tab and exits non-zero on a script error, a panel that does
not render, a tab without a visible legend (`.key`, or `.c4key` on the C4 tab), a page without a
visible Guarantees area holding at least one bubble, a Context section whose heading is not
exactly "Context", a dead `href="#"` link, a horizontal page scroll, a **dash that marks nothing
planned** (`DASHED NOT PLANNED`: a dashed border, outline or SVG stroke, a dash of 3 px or more, on an
element that is not, and is not inside, one classed `planned`, `dashed` or `pln`, on every tab and every
C4 view; and, without a browser, a `workspace.dsl` element style with `border dashed` on a tag other than
`Planned`; plan boards and the work board are held to the same rule with their own pending classes), a **system colour in a status
spectrum** (`scripts/palette.js`: a `--sys-N`, `--server`, `--client` or `--wire` token, or its
`-soft` fill, chromatic with a hue outside 175°–295°, read from the page's CSS on every run,
`--auto` included, and as the browser computes it in the theme of the pass), or a **git-ignored
system folder**. A slot that is not the shared palette's value is a warning.

**The page's data.** Without a browser, on every pass (`--auto` and `--auto --no-browser` included), `check-page.js` fails a state
block that is not JSON or not in its form (`STATE UNREADABLE`, `STATE INVALID`), one that is not the `state.json` beside the page
(`STATE EMBED DIFFERS`), a state naming a system the registry does not list or disagreeing with its registry entry on the stamp, the
last amendment or the version (`STATE UNKNOWN SYSTEM`, `STATE DISAGREES WITH REGISTRY`), an embedded `workspace.dsl` or `systems.json`
that is not its file (`DSL EMBED DIFFERS`, `REGISTRY EMBED DIFFERS`), and a part reference naming nothing (`PART UNKNOWN`, §2). A page
with no state block, on a template older than it, gets a note. `--auto --no-browser` runs these, the palette, the DSL's dashes, the
board links and the git-ignore check, and names the browser pass the page would get, which it leaves to the presenter's next look.

**Issue titles, quoted verbatim** (`GUIDANCE.md` §4, §5; admin-team/dashboards-skill/28). A title the page quotes — the Context's
`<a data-board="N">title</a>` and the state's `lastAmended.title` — is the issue's own and is never reworded or elided. Work levels are never
part of an issue, so one that names a work level is a defect in the issue, not in the page: on every pass, without a browser and in it,
`check-page.js` flags it, `ISSUE TITLE NAMES A WORK LEVEL: #n`, as a warning (the browser pass reads a title by its `data-issue-title`
mark, which `linkIssues()` keeps on the resolved link or plain text, and leaves its text out of the work-level scan), and never fails the
page for it; the admin team brings it to the user to retitle on GitHub.

**No dead board link.** On a system, supersystem or repository page, `check-page.js` reads the `BOARDS`
map and fails (`DEAD BOARD LINK`) an entry whose file does not exist relative to the page, and
(`BOARDS UNREADABLE`) a map that is not plain JSON. The same holds for `WORK_BOARD`'s committed board and for every relative `href` of the
page's HTML, when the page sits in a repository's `docs/` (`DEAD LINK`).

**Features and the code.** Every pass, `--auto --no-browser` included, fails a template feature the page lacks (`FEATURE MISSING`,
`GUIDANCE.md` §8; `--features-as-notes`, which `apply-state.js` passes, prints them as notes instead) and a status the code contradicts
(`STATUS DISAGREES WITH CODE`: a system or a `partPaths` part against its code paths at the page's stamped commit, a supersystem against
its core subsystems), and warns on a supersystem's subsystem not classified core or optional (`SUBSYSTEM UNCLASSIFIED`). A page with no `BOARDS` line (a template older than
the rule) gets a note; re-render it from the template.

**No git-ignored system folder.** On a system, supersystem or repository page, `check-page.js`
finds the `docs/dashboards/systems.json` the page belongs to and runs `git check-ignore
--no-index` on the registry itself and on every entry's `page` and `dsl`; it fails (`GIT-IGNORED`,
with the `.gitignore` rule that matched) when any of them is ignored in its repository, since the
file would never be committed. A repository `.gitignore` written for build output is the usual
cause: `build/` swallows `docs/dashboards/build/`. Give the system a slug, and so a folder, that no rule
ignores (WebTools' `build` became `gradle-build`), or add a negation for the folder. Files are
tested, not folders, because git reports every path ending in `/` as matched; `--no-index` tests
the rules alone, so a tracked file under an ignored folder still fails. Outside a git work tree
the check is skipped with a note. `--theme dark` sets
`data-theme="dark"`; `--width` sets the window (headless Chrome lays nothing out narrower than
about 512 px); `--frame <px>` loads the page inside an iframe of that width, the harness for
real phone widths. It never modifies the page: it writes a wrapper copy and a screenshot, named
for the tab, theme and width, into the output directory.

The same script checks plan boards and the work board: a page that declares
`<meta name="dashboard" content="plan-board">` or `content="work-board"` is held to those sets'
rules instead of the Guarantees rule (`plan/RULES.md`).

## 10. State pages on a branch: the data-only path

A state page — a system, supersystem or repository page — may show a feature branch's work while it happens, at the implementation
stages, before it lands: the pages of the systems the branch touches, and the shared pages (the supersystems above them, the
repository page, `systems.json`) as far as those systems appear on them. Each of their stamps reads "as-is at <branch> @ <sha> · not
yet landed" (`asIs.landed: false`, §2, §7); the landing restamps them to the merge commit on the default branch. Nothing else
changes: the page shows the code at the commit it names, built solid and planned dashed.

The admin team keeps them current with data alone. At every `implementation-stage` request (the plan-board request it gives
`plan/scripts/apply-event.js`, or a `state-pages` request of its own), and at the landing (`landed`), it runs:

    node ~/.claude/skills/dashboards/system/scripts/apply-state.js --event <request.json> --worktree <path> [--repo <owner/repo>]

`--event` is the request (its JSON, or the message with its fenced json block), `--worktree` the worktree the branch is checked out
in. It reads `issue`, `branch` and `folder` from the request and these facts, every one optional:

| Fact | What |
|---|---|
| `systems` | the registry slugs the branch touches; by default the issue board's `systems` (`<folder>/plan.json`). A slug the registry does not list stops it: `BLOCKED — system unresolved`, nothing written |
| `sha` | the commit the pages now show (default: the worktree's HEAD); at a landing `merge` (or `sha`), the merge commit |
| `ref` | at a landing, the default branch the merge is on (required there) |
| `built`, `planned` | only for what has no code paths recorded (the code decides the rest, below): what the stage built (or, rarely, set back to planned): a registry slug; `"#<issue>"`, every system that issue alone plans (`plannedBy.issue`, or every unit's `subIssue`); `"<dsl path>:<element id>"` (paths under `docs/dashboards/`), or `{dsl, id, tag}` to give a component its built tag. A system marked takes its `c4` elements with it (§7) |
| `version` | `{"<slug>": "<version>"}`, a version a system's build moved to |
| `title` | the issue's title for the "last amended by" note (in the Context section), quoted verbatim (without it, the verbatim title already on record for the same issue, the page's `state.json` first, else another page's in scope; only with none of these the folder's name less its number, which the summary notes as not the issue's own); a title that names a work level is a defect in the issue (`GUIDANCE.md` §4): written as it stands, never reworded or elided, and flagged `ISSUE TITLE NAMES A WORK LEVEL: #n` in the summary's `issue defects` and notes, for the admin team to bring to the user to retitle on GitHub |
| `landed` | `true` on a `state-pages` request that restamps a landing, as the `landed` event does |
| `enrich` | reasons the team already knows need the presenter, passed through |

**Built or planned, from the code.** At every request it reads the registry's code paths at the stamped commit (git's tree at that commit,
or the files on disk outside a git work tree): a system with a path present is built, with none present planned, whatever the facts say
(a fact the code contradicts is noted); a `partPaths` part likewise; then each supersystem, built once every core subsystem is. A system
whose status changes is touched and stamped. An unclassified subsystem leaves its supersystem's status and asks the presenter.

**Branch state pages ride the next commit** in that lane: what `apply-state.js` writes on a feature branch is committed with the
branch's next commit (the pipeline's or the board's), not held for the landing; the landing restamps it to the merge.

At a landing it restamps every entry the branch stamped (`asIs.ref` the branch, `landed: false`) and every page of them. An event
that moves no code (any plan-board event but `implementation-stage` and `landed`) is skipped, and a repository with no
`docs/dashboards/systems.json` has nothing to stamp. It reads git (HEAD, the commit's time) and never writes it; it writes only under
`docs/dashboards/`, every file through a temporary file and a rename, and on any failure puts every file back (exit 1). The same
request twice changes nothing (`duplicate`). Its summary names the stamp, the systems, what it applied, the files it wrote, the
check, the time, and `enrich: yes|no` with `why`. Committing what it wrote is the admin team's.

| The script decides (from the request) | The presenter adds (from the code and documents), when `enrich: yes` |
|---|---|
| the stamp of each touched system, its supersystems and the repository: the registry's `asIs` and `lastAmended`, each page's `state.json` (`asIs`, `lastAmended`, `version`; `written` kept), the DSL's as-is line and its views' "as built at" commit | the prose and figures at the new commit — the function sentence, the KPI tiles, the panels, the Guarantees, the Context — and `written.sha` once it has read them again; until then the header says "written at <sha>" |
| a part marked built or planned: its DSL element's `Planned` tag (and its built tag), a system's registry `status`; every page draws it from that data (§2, "Planned parts") | what the pages say of the part: its descriptions and labels, its threads, lifecycle and Guarantees text, its code paths in the registry; a part no element draws yet; a page for a newly built system, when the repository gives it one |
| a system's `version` (`facts.version`) | the Compatibility & versioning bubble's wording |
| the embedded copies (state, DSL, registry) of every page that carries them; `check-page.js --auto --no-browser` on each page it wrote | the browser pass the check names as deferred, at the presenter's next look (the landing refresh) |
| — | a page on a template older than the state block, brought onto the template (its CSS, its script before `MODEL` and its renderer, the stamp chips, the state block); the script leaves such a page alone but for its embedded registry copy, and stamps only its registry entry |

`enrich: yes` whenever a part's status changes (its prose is the presenter's), a version moves, a part named is not in its DSL, a built component has no
`Public`, `Internal` or `Standalone` tag, a built part sits inside a parent still planned (a DSL element or a registry entry), a page
in scope is on a template older than the state block or missing from disk, at a landing a page's panels were written before the
branch's last stamp, or the request passes reasons of its own; `no` otherwise — a stage that only moves the stamp. A failed run
leaves the whole request to the presenter.
