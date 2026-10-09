---
name: references-by-section
description: "Cross-references in docs/plans cite sections (§4.9, \"§6's X row\"), never line numbers, which drift"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e1f6a02f-5bfd-443b-88b7-5d8d2203d895
  modified: 2026-10-05T01:11:47.901Z
---

Always write references by section, not by line number. Cite a doc as `§4.9`, "§6's `ZoneIndex` row" or "§12 decision 1", never as `:618` or `:785-788`. The user set this rule on 2026-10-04.

The rule covers source code too (confirmed the same day). Cite code by symbol or region, e.g. `ZoneIndex.refresh` or "`World`'s registry `//region`", never `ZoneIndex.kt:38-62`.

**Why:** Line numbers drift as soon as anything is inserted above them. In #77, the callout inserted into `docs/issue-49-physics-architecture.md` invalidated its own `:NNN` citations, because the callout itself pushed every cited line down by 19.

**How to apply:** In every new or edited doc, plan, callout or KDoc pointer, cite the section heading or the named row/item/decision. Pass this rule to planner, plan-writer, architect and implementer agents in their prompts. It governs new work; don't sweep existing docs unless asked ([[standing-directives-are-not-task-requests]]).
