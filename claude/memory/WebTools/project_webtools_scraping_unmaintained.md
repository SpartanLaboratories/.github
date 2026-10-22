---
name: project_webtools_scraping_unmaintained
description: "webtools-scraping (Connector) is not currently maintained — don't propose issues or fixes for its defects; the Unirest global-state/leak and similar findings stay unfiled."
metadata:
  node_type: memory
  type: project
  originSessionId: 9a9fc9fe-8bca-480c-926f-a58a6b8a71c7
  modified: 2026-10-22T03:47:43.162Z
---

`webtools-scraping` (`Connector`) is **not currently maintained** (user, 2026-10-21).

Known defects stay unfiled, e.g. every `Connector()` calls `Unirest.setTimeouts(0, 0)`
(infinite process-wide timeouts, and with Unirest 1.4.9 a leaked monitor thread and
connection pool per `Connector`), and `http.agent` is set process-wide.

**Why:** asked twice whether to file the Connector global-state issue — once when it was
found during #55's planning, again when the per-`Connector` leak surfaced in the dashboard
refresh — the user declined both times, the second with "The scrape module is not currently
maintained".

**How to apply:** do not prompt to file issues for webtools-scraping defects, despite the
global "surface issues" rule; at most note a finding as fact (dashboards may still show it
as-is). Its replacement path is #55's `webtools-http` and the named
`connector-*` follow-ups. See [[api-evolution-clean-break]] for its legacy API status and
[[project_webtools_dashboard_pages]] (no scraping page unless requested).
