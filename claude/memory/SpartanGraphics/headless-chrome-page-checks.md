---
name: headless-chrome-page-checks
description: "How to render and probe a local HTML page (dashboards, reports) with the headless Chrome on this machine, capturing console errors and screenshots"
metadata:
  node_type: memory
  type: reference
  originSessionId: 254b48ac-3287-41b2-a5bc-7b97a826666c
  modified: 2026-10-21T22:23:33.444Z
---

Chrome is at `C:/Program Files/Google/Chrome/Application/chrome.exe` (Edge at
`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`). To verify a generated HTML page
without a browser tool:

```
"<chrome>" --headless=new --disable-gpu --no-first-run --enable-logging=stderr --v=0 \
  --virtual-time-budget=6000 --window-size=1400,1500 --screenshot=<out.png> "file:///<page>"
```

- Console output and uncaught errors arrive on stderr as `CONSOLE(...)` lines; append a probe
  `<script>` that clicks controls and `console.log`s results to test interactivity.
- The PNG can be viewed with the Read tool.
- Parse inline scripts as *classic* scripts with `new (require("vm").Script)(code)`; `node --check`
  wraps files as CommonJS and can miss early errors.

**Why:** the dashboard drafts for the presenter agent (2026-10-21) shipped with a broken artifact copy
that only a real browser run caught. See [[presenter-agent-dashboards]].
