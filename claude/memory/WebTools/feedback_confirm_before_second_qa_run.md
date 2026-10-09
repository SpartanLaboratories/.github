---
name: feedback_confirm_before_second_qa_run
description: "Always ask the user before running qa a second time in /resolve-issue, even within the skill's normal single-retry allowance"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 862fd9a5-1c70-4274-8858-aa6842fd2dad
  modified: 2026-09-26T12:12:00.689Z
---

The `/resolve-issue` skill's own rule is "one remediation pass, then re-run `qa`
once; never loop more than once" — but that single automatic retry still needs
the user's go-ahead, not just the skill's permission. During the webtools-udp
2.0.0 release run (2026-09-26), the user said "prompt me before running qa a
second time" after the first CHANGES REQUESTED verdict on Issue #40's fix.

**Why:** QA remediation cycles are cheap to run but not free, and the user wants
visibility/control over whether a second pass happens at all, rather than it
being an automatic consequence of the skill's own retry allowance.

**How to apply:** in any `/resolve-issue` (or similar QA-gated) run, when `qa`
comes back CHANGES REQUESTED and a remediation pass is about to lead into a
second `qa` invocation, stop and ask the user first — present the findings and
let them choose (fix + re-run, fix but skip re-run and land as-is, or land as-is
with a follow-up issue) rather than auto-looping once per the skill's default.
This applies per QA-gated stage of a run (a fresh instance of the same run, e.g.
a second implementation within the same `/resolve-issue`, resets the question —
it doesn't mean "never re-run qa in this run again").
