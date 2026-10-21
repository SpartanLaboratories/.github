---
name: presenter-agent-dashboards
description: "Decisions behind the presenter agent and the system-dashboard skill (2026-10-21) — format chosen, why, and the drafts that led to it"
metadata:
  node_type: memory
  type: project
  originSessionId: 254b48ac-3287-41b2-a5bc-7b97a826666c
  modified: 2026-10-21T22:51:54.376Z
---

On 2026-10-21 the `presenter` agent was added as step 5b of `/resolve-issue` (levels 2–4, before
`manager` lands, no user gate) with the `system-dashboard` skill holding templates, scripts and
conventions. The user chose the format after seeing four drafts of a `webtools-udp` dashboard:
A (interactive HTML + inline SVG), B (Structurizr DSL hand-rendered), C (Mermaid in Markdown)
and A2 (A with the C4 tab rendered at load from the embedded DSL). A2 won; the user then asked
for a stronger, more distinctive C4 tab (level ladder, typed cards, lane-routed relationships,
sequence rendering for dynamic views, fit/1:1 zoom), and that version is the skill's example.

**Why:** the user wants dashboards that show a system's *function as built* first, with planning,
roadmap and issues as secondary metadata; model-as-code (Ring 4 in CLAUDE.md) kept in step with
the visual page; and Opus (effort high) running the presenter because the work is design-heavy.

**How to apply:** when a dashboard is touched, follow the skill: structure in `workspace.dsl`
(re-embedded verbatim with `scripts/embed.js`), behaviour in the page's `MODEL`, every page
checked with `scripts/check-page.js` (see [[headless-chrome-page-checks]]). Draft artifacts:
A https://claude.ai/artifact/53PYALpcskKQZsTsj1Q7zS · B https://claude.ai/artifact/3KRQBF7ShnAbbiWVFGXBFE ·
C https://claude.ai/artifact/KPRPVbVyS6EWRAq6aaCXii · A2 https://claude.ai/artifact/UUZQp5P8zcqNuYpUXpESeY
