---
name: project_webtools_dashboard_pages
description: "Which WebTools systems get their own dashboard page and when — udp and the Gradle build in #61's run, webtools-http when #62 lands, scraping/browser only on request."
metadata:
  node_type: memory
  type: project
  originSessionId: 9a9fc9fe-8bca-480c-926f-a58a6b8a71c7
  modified: 2026-10-22T02:24:33.022Z
---

WebTools system pages under `docs/dashboards/` (decided 2026-10-21):

- **webtools-udp** — page created in #61's `/resolve-issue` run, built from the
  system-dashboard skill's `examples/webtools-udp` page.
- **Gradle build** (slug `build`) — one built system covering `settings.gradle.kts`, the root
  build file, the wrapper, `gradle.properties` and `build-logic` (convention plugins, level
  tasks). Page created in #61's run; the separate planned `build-logic` card folds into it.
- **webtools-http** — page in #62's run, when its first code lands. No planned page before
  that: the as-is rule stands.
- **webtools-scraping, webtools-browser** — no page unless the user asks for one. They stay
  registered in `systems.json` as built, page `null`.

**Why:** the user judged the root Gradle build too small for its own page and wanted it in an
overall build/Gradle dashboard; the legacy modules aren't worth pages until requested.

**How to apply:** when a presenter step runs in WebTools, pass these choices along. Never
create scraping/browser pages on a run's own initiative. The global dashboard rules live in
`~/.claude/CLAUDE.md` and the `system-dashboard` skill; see also
[[api-evolution-clean-break]] for the legacy status of scraping/browser.
