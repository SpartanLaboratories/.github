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
├── systems.json               the registry — every system, its slug, function, paths, status, stamps
├── workspace.dsl              the repository-level C4 model, embedded in index.html
├── <supersystem-slug>/        a group of systems, when a repository has more than one group
│   ├── index.html
│   └── workspace.dsl
├── <system-slug>/
│   ├── index.html             the system page
│   └── workspace.dsl          the system's C4 model, embedded verbatim in index.html
└── _template/                 optional: the repository's own copies of the templates below
```

This set ships, under `skills/dashboards/system/`:

| Path | What it is |
|---|---|
| `template/system.html` | The system page: renderer CSS/JS plus documented placeholders for one system — the six core tabs with their legends, the Guarantees bubbles, the Context cards. Copy it; never fill it in place. |
| `template/supersystem.html` | The supersystem / repository page: the Systems tab from the registry, the six core tabs as repository-level scaffolds in per-system colours, the C4 views from the DSL, Guarantees with one row per system, Context. |
| `template/systems.json` | The registry's shape, with built and planned examples. |
| `examples/webtools-udp/` | A complete system page and DSL for WebTools' `webtools-udp` — read it to see every panel, legend and Guarantees bubble filled with real facts. |
| `scripts/embed.js` | Embeds `workspace.dsl` (block `dsl`) or `systems.json` (block `systems`) verbatim into a page; `--check` verifies. |
| `scripts/check-page.js` | The browser checker for **every** dashboard page, system and plan alike (§9); `--auto` checks only what a page adds to its template. |
| `scripts/deviation.js` | How far a page deviates from its template (used by `--auto`; not a command). |
| `../verify/verify-templates.js` | Verifies every template once with the fixtures in `../verify/fixtures/` and records its hash in `../verify/verified.json`; run it after any template change. |

## 2. The two sources of a system page

A system page is driven by two sources that the presenter keeps in step (`GUIDANCE.md` §3).
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
   `Standalone` is dotted, `Internal` solid.

2. **The page's `MODEL` — behaviour.** A JS object in the page with:
   - `sides`: the names of the page's colour groups — the three hue slots `server`, `client` and
     `wire` (blue, orange, aqua) plus `consumer` and `external` — which the inspector and the
     generated legends print;
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

Hand-written panels (threads list, send-paths matrix, lifecycles cards, the Guarantees bubbles,
the Context cards) and the header (function sentence, version, as-is stamp, last amended)
complete the page. The template marks every placeholder with a `<!-- presenter: … -->` comment.
The header names the branch and short SHA the page reflects and the issue that last amended the
system; every count on the page is counted.

## 3. Tabs

**Order on the page:** function first (the tabs), then the Guarantees area, then Context.

**Core tabs.** Every page carries six — Structure, C4 model, Threads, Decision path, Sequence,
Lifecycles — each adapted to the page's level and named for what it shows (the example's
Decision path is its "Datagram path"). Repository and supersystem pages put a **Systems** tab
first and adapt the six: Structure shows how the systems compose and depend on each other;
Threads the threads and processes across systems; Decision path a cross-system decision, such as
which module a consumer picks; Sequence a cross-system interaction; Lifecycles the lifecycles
that span systems, such as source to release.

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
- On a system page the groups are the hue slots `--server`, `--client` and `--wire`; name them in
  `MODEL.sides` and the Structure legend.
- On a supersystem or repository page each top-level system takes a slot `--sys-1` … `--sys-6`
  in registry order (`sysColour(slug)`: a top-level system is one whose parent is not itself a
  system on the page; a child takes its top-level ancestor's slot; a seventh folds into
  neutral), and every hand-written element about a system carries `data-sys="<slug>"` so
  `paintSystems()` colours it. The plan boards use the same slots (`plan/RULES.md`), so a system
  has one colour on both sets.
- Further tokens on `:root`: the ordinal phase ramp `--ph-1` … `--ph-3` (classes `.ph1` …
  `.ph3`), used by Lifecycles. A single series (the test-class bars) is neutral ink, not a hue.
- Nothing built is drawn with a dashed outline: standalone is dotted, a lazily started thread an
  outlined pill, the DSL's `Internal` style solid. The other dashes are diagram conventions the
  legend names: sequence lifelines and return messages, the C4 boundary frame.
- A planned system appears on supersystem and repository pages only, dashed and faded, naming
  the issue that plans it, never with a page of its own; it gets a page when its implementing
  issue lands.

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
established is said in the bubble as a gap (`.gap`). On repository and supersystem pages each
bubble covers every system, one row each (`.gtbl`, the system's swatch first); a planned system's
row is dashed and says only that nothing is built yet.

## 6. Context on a system page

`GUIDANCE.md` §5 sets the section (headed exactly **Context**). On system boards its cards are:

- **Roadmap** — each roadmap item with the issues mapped to it, each issue with its number,
  title and state, never its work level (`GUIDANCE.md` §4); the number opens the GitHub issue and
  the title the issue's plan board where one exists (`GUIDANCE.md` §5). A roadmap item is a tracking issue with its sub-issues,
  or an entry in a roadmap document the repository keeps, with the issues it names. On a system
  page, list the items that claim an issue touching the system, those issues under them, and how
  many of the item's issues touch other systems.
- **Unscheduled issues** — only the open issues that no roadmap item claims (on a system page,
  those touching the system).
- **Plans and documents** — the plans that shaped the system and its reference documents. The
  plan boards (`docs/plans/<issue>-<slug>/dashboard.html`) that amended the system are linked
  here; the repository page also links the work board, `docs/plans/index.html`.

Date both issue lists.

## 7. The registry

`systems.json` lists every system and supersystem: `slug`, `name`, `kind`
(`system` | `supersystem` | `repo`), `parent`, `status` (`built` | `planned`), `function`, `paths`,
`version`, `asIs {ref, sha, date}`, `lastAmended {issue, sha}`, `page`, `dsl`, and for a planned
system `plannedBy {issue, architecture}`. The supersystem and repository pages embed a verbatim
copy (`node scripts/embed.js systems.json index.html systems`). Its order sets the colour slots
for both sets of pages: reordering it recolours every system page and every plan board, so
append rather than reorder.

## 8. Workflow

1. Identify the system from the plan or architecture and the diff; add it to the registry if new.
   When the system is genuinely unclear, stop: `BLOCKED — system unresolved`, with the
   candidates.
2. Copy `template/system.html` to `docs/dashboards/<slug>/index.html` (or start from the
   repository's `_template/`, or the existing page on an update) and write `workspace.dsl`.
   **Go off the template** (`GUIDANCE.md` §3): change only what the facts require — the DSL, the
   `MODEL`, the hand-written panels, the header — and leave the template's CSS, tab set and
   renderer script as they are. Anything beyond that (an optional tab, a removed core tab, a
   change to the renderer or CSS) is a divergence: declare it in the head with
   `<meta name="template-divergence" content="what and why">` and in the footer comment.
3. Fill the DSL, then the `MODEL`, then the hand-written panels and header, from the code and the
   architecture documents. Re-embed the DSL.
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
   item claims are the unscheduled ones. Link the plan boards that amended the system.
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
node scripts/check-page.js docs/dashboards/<slug>/index.html [--tab t-c4] [--out <dir>] [--theme dark] [--width 520] [--frame 390]
```

**`--auto` is the usual mode** (`GUIDANCE.md` §8). The template is verified once, in the skill,
by `verify/verify-templates.js`; `--auto` compares the page with it (`scripts/deviation.js`): its
`<style>` blocks, its tab ids in order, its script before `MODEL` (from the main `<script>` to
`const MODEL = {`: the helpers, and on a supersystem or repository page the Systems renderer),
and its renderer script (everything after `MODEL`'s closing `};`, less the `DEFAULT_INSPECT`
line, which is the page's own text). The script before `MODEL` is compared less its
**page-filled lines**: the `REPO` and `SRC` constants, and any other `const` whose line in the
template carries a `// presenter:` comment, which is how a template marks a line filled per
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
exactly "Context", a dead `href="#"` link, a horizontal page scroll, or a **git-ignored system
folder**.

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
