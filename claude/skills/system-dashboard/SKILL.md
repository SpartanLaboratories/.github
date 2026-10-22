---
name: system-dashboard
description: >-
  Conventions, page templates, DSL rules and checks for a repository's system
  dashboards under docs/dashboards/ — one self-contained HTML page per system
  showing it as built (six core tabs: structure, C4 model, threads, decision
  path, sequence, lifecycles; a Guarantees area; then Context) with its
  Structurizr C4 model embedded and rendered, plus the supersystem and
  repository pages that bind systems together. Used by the presenter agent at
  the end of a /resolve-issue run; load it whenever you create, update, review
  or check a dashboard page, its workspace.dsl, or the systems.json registry.
---

# System dashboards

A dashboard shows a system **as it is**: what it does and how it is built, drawn from the code at
a named commit. Under that comes what a consumer can rely on (the Guarantees), and under that the
Context — the roadmap, the unscheduled issues, the plans — in a section headed **Context**. Nothing
planned is ever drawn as built. The global `CLAUDE.md` ("System dashboards") states the rule; this
skill holds the mechanics.

## Files

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

This skill ships:

| Path | What it is |
|---|---|
| `template/system.html` | The system page: renderer CSS/JS plus documented placeholders for one system — the six core tabs with their legends, the Guarantees bubbles, the Context cards. Copy it; never fill it in place. |
| `template/supersystem.html` | The supersystem / repository page: the Systems tab from the registry, the six core tabs as repository-level scaffolds in per-system colours, the C4 views from the DSL, Guarantees with one row per system, Context. |
| `template/systems.json` | The registry's shape, with built and planned examples. |
| `examples/webtools-udp/` | A complete system page and DSL for WebTools' `webtools-udp` — read it to see every panel, legend and Guarantees bubble filled with real facts. |
| `scripts/embed.js` | Embeds `workspace.dsl` (block `dsl`) or `systems.json` (block `systems`) verbatim into a page; `--check` verifies. |
| `scripts/check-page.js` | Opens a page in headless Chrome/Edge, clicks every tab, fails on a script error, an unrendered panel, a tab without a legend, a missing Guarantees area or a Context section not headed "Context"; writes a screenshot. |

## The two sources of a system page

A system page is driven by two sources that the presenter keeps in step. Everything else on the
page is either rendered from them or is a hand-written panel of verified facts.

1. **`workspace.dsl` — structure.** A Structurizr workspace with hierarchical identifiers: the
   consumer as a `person`, the repository as the `softwareSystem`, each system as a `container`,
   the system's types grouped as `component`s with tags `Public`, `Internal`, `Standalone` or
   `Planned`, relationships with a short description, the four views (`systemContext`,
   `container`, `component`, one `dynamic` view for the defining interaction) and the `styles`
   block. The page parses it at load and renders the C4 tab from it, so **the file and the
   embedded copy must be identical**: edit the file, then `node scripts/embed.js workspace.dsl
   index.html dsl`. Identifiers are stable across runs; new elements get new identifiers.
   The parser covers this subset only — stay inside it (no `!include`, no `properties`, no
   `deployment` views, one element per line, relationships as `a -> b "description"`). In the
   `styles` block only `Planned` has a dashed border; `Standalone` is dotted, `Internal` solid.

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

## Rules for a page

- **As-is.** The header names the branch and short SHA the page reflects and the issue that last
  amended the system. Every count is counted (files, lines, test classes per level, open issues).
  A fact that cannot be verified is left out or stated as a gap, never guessed.
- **Function first, then guarantees, then context.** The tabs are the page. Under them sits the
  Guarantees area, and under that the section headed **Context** — never labelled "secondary".
- **Core tabs.** Every page carries six core tabs — Structure, C4 model, Threads, Decision path,
  Sequence, Lifecycles — each adapted to the page's level and named for what it shows (the
  example's Decision path is its "Datagram path"). Repository and supersystem pages put a
  **Systems** tab first and adapt the six: Structure shows how the systems compose and depend on
  each other; Threads the threads and processes across systems; Decision path a cross-system
  decision, such as which module a consumer picks; Sequence a cross-system interaction;
  Lifecycles the lifecycles that span systems, such as source to release.
- **Optional tabs.** Add one after the core tabs wherever content for it exists, on any page.
  Candidates:
  - **Dependencies** — the module and artifact graph, `api` vs `implementation`, coordinates
    and versions, third-party libraries.
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
  core tabs' renderers and CSS — and each carries a colour plan and a legend like any other tab.
- **A colour plan and a legend on every tab.** Every tab colours its content by a grouping that
  suits what it shows, and shows a visible legend (`.key`; the C4 tab's is `.c4key`) naming that
  grouping and every line or shape encoding the tab uses, ending with planned. The templates'
  groupings:

  | Tab | System page | Repository / supersystem page |
  |---|---|---|
  | Systems | — | the system; built solid, planned dashed |
  | Structure | side (hue) × public / internal (fill) | the system; nesting is composition |
  | C4 model | element kind from the DSL `styles`, incl. External and Planned | the same |
  | Threads | the owning side | the owning system |
  | Decision path | the outcome level an end lands on | the system an end lands on, or the level |
  | Sequence | the lifeline's owner: a side, the consumer, outside | the owning system, the consumer, outside |
  | Lifecycles | phase: start · run · stop | phase, named for the lifecycle (build · verify · release) |

  - **Planned is dashed** on every tab — dashed and faded, naming the issue that plans it; a
    planned system appears on supersystem pages only, never with a page of its own. Nothing
    built is drawn with a dashed outline: standalone is dotted, a lazily started thread an
    outlined pill, the DSL's `Internal` style solid. The other dashes are diagram conventions the
    legend names: sequence lifelines and return messages, the C4 boundary frame.
  - **A system keeps its colour on every tab.** On a system page the groups are the hue slots
    `--server`, `--client` and `--wire`; name them in `MODEL.sides` and the Structure legend. On a
    supersystem page each top-level system takes a slot `--sys-1` … `--sys-6` in registry order
    (`sysColour(slug)`; a child takes its ancestor's slot, a seventh folds into neutral), and every
    hand-written element about a system carries `data-sys="<slug>"` so `paintSystems()` colours it.
  - **Colours come from the `:root` tokens**, each defined for light and dark: the hue slots,
    `--sys-*`, the ordinal phase ramp `--ph-1` … `--ph-3` (classes `.ph1` … `.ph3`), and the status
    colours `--good`, `--warning`, `--serious`, `--critical`, kept for outcomes and always beside
    their label. A single series (the test-class bars) is neutral ink, not a hue.
- **Guarantees.** Every page carries a Guarantees area below the tab stage and above Context.
  It is always visible, whatever tab is open, and is never a tab. It holds named sub-bubbles,
  each a compact titled panel (`.bubble`) of three to five short lines read from the code, its
  KDoc and its build. The seven standard ones:
  - **Failure model** — how failures reach a consumer (e.g. `kotlin.Result`), what the system
    retries itself and what it surfaces.
  - **Extension points** — the public seams with their stability tier (Stable Core / Supported
    Extension / Experimental) and opt-in marker.
  - **Test levels** — test classes per level of the 5-level hierarchy, read from the package
    layout; link the test-inspector report if one exists.
  - **Compatibility & versioning** — the current version; how versions move (a trailing letter
    for a bug fix, the third number for an addition); what is checked (an ABI dump where one
    exists); the deprecation policy (deprecate, don't break — or "legacy: may break freely"
    where that applies).
  - **Thread safety** — which public types are safe to share across threads or coroutines, and
    which are confined.
  - **Resources to close** — what a consumer must close or stop, and what leaks if they don't.
  - **On your classpath** — the `api` dependencies a consumer inherits.

  Add a bubble where the system has another guarantee worth stating. A fact that cannot be
  established is said in the bubble as a gap (`.gap`), never guessed. On repository and
  supersystem pages each bubble covers every system, one row each (`.gtbl`, the system's swatch
  first); a planned system's row is dashed and says only that nothing is built yet. A bubble
  that colours anything follows the colour and legend rule.
- **Context.** Below the Guarantees, under the heading **Context**:
  - **Roadmap** — each roadmap item with the issues mapped to it, each issue with its number,
    title, state and, where known, level. A roadmap item is a tracking issue with its
    sub-issues, or an entry in a roadmap document the repository keeps, with the issues it
    names. On a system page, list the items that claim an issue touching the system, those
    issues under them, and how many of the item's issues touch other systems.
  - **Unscheduled issues** — only the open issues that no roadmap item claims (on a system page,
    those touching the system).
  - **Plans and documents** — the plans that shaped the system and its reference documents.

  Date both issue lists.
- **Self-contained and offline.** Inline CSS, JS and SVG; no external scripts, fonts or images;
  light and dark through the `:root` tokens; a 16px side gutter; no horizontal page scroll (the C4
  canvas scrolls inside its own frame at 1:1); every control reachable by keyboard.
- **Stable renderers; a divergence adds.** Keep the renderer code as the template ships it so
  pages across repositories behave the same and the check script applies. A page, or a
  repository's own `docs/dashboards/_template/`, may **diverge** from the global template when
  that shows the system better. A divergence should primarily add — a tab, a view, a bubble, a
  card. Removing content — a core tab, a standard Guarantees bubble, a legend — needs a strong
  argument, such as no data for it existing (a cross-system Sequence tab when no system calls
  another). Record each divergence, with the argument for a removal, in the page's footer
  comment and in the presenter's report. A divergence every system in the repository would want
  goes into `docs/dashboards/_template/` instead.
- **Registry.** `systems.json` lists every system and supersystem: `slug`, `name`, `kind`
  (`system` | `supersystem` | `repo`), `parent`, `status` (`built` | `planned`), `function`,
  `paths`, `version`, `asIs {ref, sha, date}`, `lastAmended {issue, sha}`, `page`, `dsl`, and for a
  planned system `plannedBy {issue, architecture}`. The supersystem and repository pages embed a
  verbatim copy (`node scripts/embed.js systems.json index.html systems`); its order sets the
  system colours.

## Workflow for one run

1. Identify the system from the plan or architecture and the diff; add it to the registry if new.
2. Copy `template/system.html` to `docs/dashboards/<slug>/index.html` (or start from the repository's
   `_template/`, or the existing page on an update) and write `workspace.dsl`.
3. Fill the DSL, then the `MODEL`, then the hand-written panels and header, from the code and the
   architecture documents. Re-embed the DSL.
4. Set the colour plan: each tab's grouping, the names of the colour groups (`MODEL.sides`, the
   Structure legend), each legend listing what its tab draws; anything planned dashed.
5. Fill the Guarantees bubbles from the code: the `Result` and exception types and what retries;
   the public open and abstract types and interfaces, with their tier and opt-in markers; the test
   classes per `testing.<level>` package and `build/reports/test-inspector/index.html` if present;
   the version, what the build checks and the deprecation policy; the KDoc's thread contracts;
   the `stop` / `close` members and what they free; the `api` dependencies from the build file or
   the published POM. Write a gap where a fact cannot be established.
6. Map the Context: the open issues (`gh issue list --state open`); for each tracking issue its
   sub-issues (`gh issue view <n> --json subIssues,parent`); the repository's roadmap document,
   if it keeps one. Each issue a roadmap item claims goes under that item; the open issues no
   item claims are the unscheduled ones.
7. Add an optional tab wherever content for one exists.
8. Update the parents: the system's card and its place on every tab of the supersystem and
   repository pages, their Guarantees rows and registry copies; the supersystem DSL if an
   inter-system relationship changed.
9. `node scripts/check-page.js <page> --tab <id>` for every tab of every page touched; fix until
   `PASS`. Look at the screenshots once — a legend on every tab, nothing overlapping or clipped —
   and fix what the script cannot see. Look at the dark theme (`--theme dark`) and a narrow
   window (`--width 520`; headless Chrome lays nothing out narrower than about 512 px) at least
   once per page.
10. Report the paths, the as-is stamp, the divergences (with the argument for any removal) and the
    gaps; the manager commits the files with the change set.

## Checks

```
node scripts/check-page.js docs/dashboards/<slug>/index.html [--tab t-c4] [--out <dir>] [--theme dark] [--width 520]
node scripts/embed.js docs/dashboards/<slug>/workspace.dsl docs/dashboards/<slug>/index.html dsl --check
node scripts/embed.js docs/dashboards/systems.json docs/dashboards/index.html systems --check
```

`check-page.js` needs a local Chrome or Edge (it searches the usual install paths; set `CHROME=`
to point at another). It clicks every tab and exits non-zero on a script error, a panel that does
not render, a tab without a visible legend (`.key`, or `.c4key` on the C4 tab), a page without a
visible Guarantees area holding at least one bubble, or a Context section whose heading is not
exactly "Context". `--theme dark` sets `data-theme="dark"` so the dark tokens can be looked at.
It never modifies the page: it writes a wrapper copy and a screenshot, named for the tab, theme
and width, into the output directory.
