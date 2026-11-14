# Planning documents
<!-- {"name":"Planning documents","code":"P-D-PD","id":138} -->

Every plan lives under `docs/plans/`, in a folder hierarchy that mirrors the repository's GitHub
issue hierarchy. Documents that are not plans (roadmaps, protocol specs, decision records, asset
folders such as `docs/brand/`) stay where they are. The issue hierarchy is
[R-1063 (Planning large work)](../../CONTRIBUTING.md#planning-large-work).

## Hierarchy
<!-- {"name":"Hierarchy","code":"P-D-PD-HI","id":1106} -->

Each issue gets one folder, `<number>-<slug>/`, with a short kebab-case slug taken from the issue
title (e.g. `49-physics/`). It sits inside its parent tracking issue's folder, following the
sub-issue chain root-first, e.g. `docs/plans/86-phase-1-map-and-space/49-physics/`. An issue with no
parent sits directly under `docs/plans/`. The parent is found with `gh api graphql -f
query='query{repository(owner:"<org>", name:"<repo>"){issue(number:<n>){parent{number title}}}}'`.
An issue that is re-parented has its folder moved.

## Folded-in issues
<!-- {"name":"Folded-in issues","code":"P-D-PD-FI","id":1107} -->

When one issue is resolved as part of another issue's work, the folded-in issue gets its own
`<number>-<slug>/` subfolder inside the host issue's folder, as a sub-issue would, and its documents
go there.

## A fix to an earlier plan's work
<!-- {"name":"A fix to an earlier plan's work","code":"P-D-PD-FE","id":1108} -->

When a bug fix that changes no public API, persisted or shared state or wire format, and stays local
to one component, corrects code an earlier issue's plan built, the fix's folder goes inside that
issue's folder, as a folded-in issue's would, unless the fix is a GitHub sub-issue, whose folder
follows its own sub-issue chain. Either way, the earlier issue's `consequences.md` takes the fix's
follow-ups and known gaps, each naming the fix; notes what the fix made no longer current, with a
link to the fix; and marks closed, with a link, any follow-up or known gap the fix closes. These are
the only edits a landed document takes. Otherwise such a fix has a `consequences.md` only when it
leaves a follow-up or known gap.

## What an issue folder holds
<!-- {"name":"What an issue folder holds","code":"P-D-PD-IF","id":1109} -->

An issue folder holds only that issue's resolution:
- `draft.md`: the draft plan.
- `architecture.md`: the grand design, when the work has one.
- `plan.md`, or one `plan-<unit-slug>.md` per unit when the design decomposes into several.
- `consequences.md`: what the change does to its surroundings and leaves behind: published
  artifacts, blast radius, adoption, sibling units, neighbouring issues, follow-ups, and the known
  gaps the build leaves open, with the outcome of the plan's assumptions and follow-ups (each
  assumption that failed, each follow-up still open) linked back to the plan. Known gaps live only
  here: a plan or architecture has no Known gaps section; what it could not establish is an
  Assumption, and work it leaves undone a Non-goal or follow-up. It is written with the plan and
  reconciled with the build once implementation ends. Issue folders from before this convention keep
  their `impact.md`, read the same.
- `final-implementation.md`: the final as-built record: what was actually built, acceptance,
  measurements, and every deviation from the plan in one section. Each deviation cites the plan
  section it departs from, gives its reasoning, and links secondarily to what that part of the plan
  was based on: the research finding, or the parent architecture section (which gets a dated callout
  when the build changes what it describes). Each deviation is appended, with its reasoning, when it
  is made, and the file is reconciled into the final as-built record once implementation ends. A
  research claim the build disproved appears as the deviation it caused; one that caused none gets a
  "did not hold in the build" note in `research/README.md`'s verification results. The file
  describes the state of the build, not the process that produced it: a change a review caused is
  recorded as the as-built state, and as a deviation where it departs from the plan, without saying
  a review caused it. A review's findings get no record of their own: a finding fixed shows only as
  the as-built state (and as a deviation where it departs from the plan); one that calls for a plan
  re-pass lives in the re-passed plan, with the replaced version under `superseded/`, and building
  to it is no deviation; one accepted rather than fixed is a known gap or follow-up in
  `consequences.md`.
- **One home per fact.** `final-implementation.md` and `consequences.md` never restate each other;
  one links to the other. Neither writes a PR placeholder: the issue's resolution comment links the
  PR. No open point is committed open, whatever raised it: before the landing each is resolved, or
  settled as a deviation in `final-implementation.md` or as a follow-up or known gap in
  `consequences.md`.
- `research/README.md`: the research questions (one topic-led question per open point the design
  depends on) and, below them, the verification results and a summary of the findings.
- `research/<question-slug>.md`: the findings on one research question, one file per question.
- `superseded/<name>-<YYYY-MM-DD>.md`: a replaced version of any of the above, with a "superseded
  by" note at its top and its relative links rewritten, when it is made, to resolve from
  `superseded/`.
- Anything else specific to that one issue's resolution, e.g. a UAT record.

## A tracking issue's folder
<!-- {"name":"A tracking issue's folder","code":"P-D-PD-TF","id":1110} -->

A tracking issue's folder holds its own documents (a phase plan, an initiative draft, a design
spanning several of its sub-issues) loose beside its sub-issue folders.

## Comment- and doc-only changes
<!-- {"name":"Comment- and doc-only changes","code":"P-D-PD-CD","id":1111} -->

A comment- or doc-only change has no folder: it is recorded by its pull request and the issue's
resolution comment alone.

## Plans need an issue
<!-- {"name":"Plans need an issue","code":"P-D-PD-NI","id":1112} -->

A plan needs an issue: new work with none has one filed before it is planned. An existing plan with
no issue sits loose in the tracking folder it belongs to, or directly under `docs/plans/` if none.

## Committed
<!-- {"name":"Committed","code":"P-D-PD-CO","id":1113} -->

Everything under `docs/plans/` is committed. Research is committed as it is written, findings
written at the same time landing in one commit once the last of them is written; everything else is
committed with the work it plans.
