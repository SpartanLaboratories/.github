---
name: system-dashboard
description: >-
  Conventions, page templates, DSL rules and checks for a repository's system
  dashboards under docs/dashboards/ — one self-contained HTML page per system
  showing it as built (structure, threads, decision paths, sequences,
  lifecycles) with its Structurizr C4 model embedded and rendered, plus the
  supersystem and repository pages that bind systems together. Used by the
  presenter agent at the end of a /resolve-issue run; load it whenever you
  create, update, review or check a dashboard page, its workspace.dsl, or the
  systems.json registry.
---

# System dashboards

A dashboard shows a system **as it is**: what it does and how it is built, drawn from the code at
a named commit. Context (issues, plans, roadmap) is secondary and sits below the fold. Nothing
planned is ever drawn as built. The global `CLAUDE.md` ("System dashboards") states the rule;
this skill holds the mechanics.

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
| `template/system.html` | The system page: renderer CSS/JS plus documented placeholders for one system. Copy it; never fill it in place. |
| `template/supersystem.html` | The supersystem / repository page: system cards from the registry, the C4 views from the DSL. |
| `template/systems.json` | The registry's shape, with built and planned examples. |
| `examples/webtools-udp/` | A complete system page and DSL for WebTools' `webtools-udp` — read it to see every panel filled with real facts. |
| `scripts/embed.js` | Embeds `workspace.dsl` (block `dsl`) or `systems.json` (block `systems`) verbatim into a page; `--check` verifies. |
| `scripts/check-page.js` | Opens a page in headless Chrome/Edge, clicks every tab, fails on a script error or an unrendered panel, writes a screenshot. |

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
   `deployment` views, one element per line, relationships as `a -> b "description"`).

2. **The page's `MODEL` — behaviour.** A JS object in the page with:
   - `structure`: the hand-placed component map (lanes, notes, nodes with positions on a
     1000×612 canvas; nesting is ownership; `pub`/`int` and `server`/`client`/`wire` are the
     visual encodings; each node's `d` block is what the inspector shows);
   - `threads`: every thread by name, when it is created, what runs on it, what it sends;
   - `flows`: one or more decision-path variants, each with its controls, a node grid, edges
     and a `rules(state)` function returning the lit path, the outcome and the controls that do
     not matter for it (the example's two variants are the server and client datagram paths);
   - `sequence`: the lifelines, phases and steps of the defining interaction;
   - `c4`: the map from map-node ids to DSL element ids, which cross-links the two views.

Hand-written panels (threads list, send-paths matrix, lifecycles cards, context cards) and the
header (function sentence, version, as-is stamp, last amended) complete the page. The template
marks every placeholder with a `<!-- presenter: … -->` comment.

## Rules for a page

- **As-is.** The header names the branch and short SHA the page reflects and the issue that last
  amended the system. Every count is counted (files, lines, test classes per level, open issues).
  A fact that cannot be verified is left out or stated as a gap, never guessed.
- **Function first.** The structure, threads, decision paths, sequence and lifecycles tabs are the
  page; the context section is below them and labelled secondary.
- **Planned is dashed.** A `Planned` element has the dashed, faded style from the DSL's `styles`
  block and names the issue that plans it; a planned system appears on the supersystem page only.
- **Self-contained and offline.** Inline CSS, JS and SVG; no external scripts, fonts or images;
  light and dark through the `:root` tokens; a 16px side gutter; no horizontal page scroll (the C4
  canvas scrolls inside its own frame at 1:1); every control reachable by keyboard.
- **Stable renderers.** Keep the renderer code as the template ships it so pages across repositories
  behave the same and the check script applies. A **divergence** (a different map layout, an extra
  view, a changed decision-path shape) is allowed when it shows the system better; record it in the
  page's footer comment and in the presenter's report. A divergence every system in the repository
  would want goes into `docs/dashboards/_template/` instead.
- **Registry.** `systems.json` lists every system and supersystem: `slug`, `name`, `kind`
  (`system` | `supersystem` | `repo`), `parent`, `status` (`built` | `planned`), `function`,
  `paths`, `version`, `asIs {ref, sha, date}`, `lastAmended {issue, sha}`, `page`, `dsl`, and for a
  planned system `plannedBy {issue, architecture}`. The supersystem and repository pages embed a
  verbatim copy (`node scripts/embed.js systems.json index.html systems`).

## Workflow for one run

1. Identify the system from the plan or architecture and the diff; add it to the registry if new.
2. Copy `template/system.html` to `docs/dashboards/<slug>/index.html` (or start from the repository's
   `_template/`, or the existing page on an update) and write `workspace.dsl`.
3. Fill the DSL, then the `MODEL`, then the hand-written panels and header, from the code and the
   architecture documents. Re-embed the DSL.
4. Update the parents: the system's row and card in the supersystem/repository pages and their
   registry copies; the supersystem DSL if an inter-system relationship changed.
5. `node scripts/check-page.js <page>` for every page touched; fix until `PASS`; look at the
   screenshot once and fix what the script cannot see.
6. Report the paths, the as-is stamp, divergences and gaps; the manager commits the files with
   the change set.

## Checks

```
node scripts/check-page.js docs/dashboards/<slug>/index.html [--tab t-c4] [--out <dir>]
node scripts/embed.js docs/dashboards/<slug>/workspace.dsl docs/dashboards/<slug>/index.html dsl --check
node scripts/embed.js docs/dashboards/systems.json docs/dashboards/index.html systems --check
```

`check-page.js` needs a local Chrome or Edge (it searches the usual install paths; set `CHROME=`
to point at another). It never modifies the page: it writes a wrapper copy and a screenshot into
the output directory and exits non-zero on any script error or unrendered tab.
