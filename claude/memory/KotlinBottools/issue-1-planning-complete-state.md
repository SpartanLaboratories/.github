---
name: issue-1-planning-complete-state
description: "Planning for KotlinBottools#1 finished 2026-10-20; where the plan of record, the sub-issues, the MagicBot repository and the owner follow-ups stand"
metadata:
  node_type: memory
  type: project
  originSessionId: 1db7fc88-7270-4d18-b608-e2895c322605
  modified: 2026-10-20T23:59:26.901Z
---

The planner pipeline for SpartanLaboratories/KotlinBottools#1 (BotTools consolidation and
MagicBot) completed all four defined stages on 2026-10-20. The plan of record is
`docs/plans/1-bottools-consolidation/` on branch `docs/issue-1-bottools-consolidation`
(architecture.md, roadmap.md, impact.md; the pre-pipeline draft is in `superseded/`). No pull
request is opened from that branch until Phase 0, the history rewrite, has run.

Filed from the roadmap on 2026-10-20:
- Library phases as sub-issues of #1: #2 (Phase 0) to #19 (Phase 23); milestone `1.0.0` on
  Phases 1–12 and 17; "blocked by" links between them and from WebTools#55 on #9 and #16.
- `SpartanLaboratories/MagicBot` created public (README, Apache-2.0 LICENSE, `.gitleaks.toml`;
  secret scanning and push protection on). MagicBot#1 is its tracking issue; #2–#8 are
  Phases 13, 14, 15, 16, 20, 21, 22. MagicBot owns its issues; they are not sub-issues of
  KotlinBottools#1.
- WebTools#55 (HTTP stack BotTools consumes), WebTools#58 (CI, contributing guide, changelog,
  tags, foojay 1.0.0); the organisation `CONTRIBUTING.md` gained "Lettered versions in
  dependency graphs" (commit 2a77d35).

Decisions the user made that the documents now carry: HTTP comes from WebTools inside
`bottools-http` only, consumers code against bottools alone; `strictly` pins on the umbrella
and the WebTools edge; MagicBot 1.0.0 ships on bottools 1.0.0, later games one feature release
each; test fixtures (C1) decided after 1.0.0.

**Why:** the hand-off file that carried this state was deleted when the roadmap was committed,
so a later session needs this pointer to resume without re-deriving it.

**How to apply:** start from `impact.md` §3.1 ("For the maintainer") for the owner actions still
open: the Phase 0 purge, GitHub Support tickets and making KotlinBottools public; "Enable
SNAPSHOTs" on the Central namespace before Phase 1 ends; the WebTools release before Phase 17;
Discord applications; MagicBot's contact e-mail by Phase 16; hosting. Per-unit plans are
written one per sub-issue, in `docs/plans/1-bottools-consolidation/<phase>-<slug>/` for the
library and under MagicBot's `docs/plans/` for its phases. Related:
[[research-repass-revise-in-place]], [[legacy-repos-referenced-not-cloned]].
