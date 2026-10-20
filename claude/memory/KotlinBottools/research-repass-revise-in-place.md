---
name: research-repass-revise-in-place
description: Re-passed research findings files are rewritten in place at their existing paths; nothing goes to superseded/ for a research re-pass
metadata:
  node_type: memory
  type: feedback
  originSessionId: 1db7fc88-7270-4d18-b608-e2895c322605
  modified: 2026-10-20T15:17:20.799Z
---

When a planner re-pass rewrites a `research/<question-slug>.md` findings file, revise it in
place at its existing path. Do not copy the earlier version to `superseded/<name>-<date>.md`.
Claim numbers stay stable so the verifier report's IDs keep resolving.

**Why:** The user decided this on 2026-10-20 for KotlinBottools#1 ("Revise"). Git history
already holds every earlier version, and research is committed file by file, so a
`superseded/` copy would duplicate what `git log` gives. The global folder-layout rule's
`superseded/` entry still applies to the design documents (`draft.md`, `architecture.md`,
plans), not to research re-passes.

**How to apply:** Brief the researcher to rewrite its own file in place, keep claim numbers
stable, and replace unverified claims with source-read ones. Have the manager commit the
rewrite as its own `docs(plans): …` commit ending `Refs #<issue>`. Related:
[[legacy-repos-referenced-not-cloned]].
