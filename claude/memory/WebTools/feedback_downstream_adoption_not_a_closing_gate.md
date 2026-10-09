---
name: feedback-downstream-adoption-not-a-closing-gate
description: Downstream-consumer adoption never blocks closing a WebTools/library issue whose own fix has landed.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 47e29a20-6542-4ea1-99b1-6549813bb466
  modified: 2026-09-07T03:59:38.942Z
---

When a library-side (e.g. WebTools) issue's actual fix has merged and released, close the
issue even if downstream consumers (e.g. MyGameTools, MyGameServer, GameGraphics) haven't
yet adopted the new version/protocol. Track that adoption as separate coordination, not as
a condition on the upstream issue's closure.

**Why:** user, after WebTools issue #1 had both its tiers merged/released (2.0.0b, 2.0.0c)
but was being kept open pending "MyGameTools/MyGameServer adopt the matching client
change" and a manual UAT: "First close issue #1. From now on never let downstream adoption
hold up closing an issue."

**How to apply:** applies repo-wide (any Spartan Labs library repo) and to the
`resolve-issue`/`manager` workflow's issue-resolution step. A manual acceptance step (e.g.
a cross-NAT UAT) that's still pending is fine to *mention* in the closing comment as a
recommended follow-up, but is likewise not a closing gate — only decide otherwise if the
user says so for that specific issue. See [[no-ide-files]] for the sibling "don't ask, just
handle it" pattern this same session established.
