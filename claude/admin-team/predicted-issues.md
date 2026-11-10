# Predicted issues

What the admin team expects may go wrong, each with its proposed resolution and
a count of the times it has actually happened. The rule for keeping this list
is in `agents/admin-team.md` (How the team works, **Predicted issues**). Dates
are UTC.

## A confirm-only setup-branch at step 3 finds the branch missing

```json
{"id":"p1","count":0,"last":null}
```

- **Proposed resolution:** the run stops and tells the user; a branch gone after
  step 1 may mean lost research commits.
- **Predicted:** the user, at the admin team's console, 2026-11-09.
- **Encounters:**
  - None yet.

## A sync meets a conflict with a code file, which has no defined resolution

```json
{"id":"p2","count":0,"last":null}
```

- **Proposed resolution:** treat it as the README case: leave the merge open,
  return `result.conflicts`, the run fixes the markers in its worktree,
  re-verifies, and resends with a fresh qa.
- **Predicted:** the admin team, seeding this list, 2026-11-09.
- **Encounters:**
  - None yet.

## A conflict mixes a README or CHANGELOG with a code file

```json
{"id":"p3","count":0,"last":null}
```

- **Proposed resolution:** the merge stays open only when every conflicted file
  is `README.md` or `CHANGELOG.md`, otherwise as for a code conflict.
- **Predicted:** the admin team, seeding this list, 2026-11-09.
- **Encounters:**
  - None yet.

## A run needs to see which files merged over cleanly

```json
{"id":"p4","count":0,"last":null}
```

- **Proposed resolution:** leave it in the executor's Overlap report; add
  `result.overlap` to `done` only if something needs it.
- **Predicted:** the admin team, seeding this list, 2026-11-09.
- **Encounters:**
  - None yet.

## A closed board needs an approximate-bounds backfill

```json
{"id":"p5","count":0,"last":null}
```

The wording in `GUIDANCE` and `RULES` defines `asBuilt.approx`.

- **Proposed resolution:** leave the text as the field's definition.
- **Predicted:** the admin team, seeding this list, 2026-11-09.
- **Encounters:**
  - None yet.

## A dashboards rule change would reach a closed board

```json
{"id":"p6","count":0,"last":null}
```

The route is "New dashboard rules reach old dashboards" in `admin-team.md`.

- **Proposed resolution:** that standing rule covers open boards only; say so
  with one word.
- **Predicted:** the admin team, seeding this list, 2026-11-09.
- **Encounters:**
  - None yet.

## A presenter job regenerates work-board files at a sync

```json
{"id":"p7","count":0,"last":null}
```

`presenter.md` doesn't describe this.

- **Proposed resolution:** one sentence naming the regeneration beside its
  state-board text.
- **Predicted:** the admin team, seeding this list, 2026-11-09.
- **Encounters:**
  - None yet.

## A publish, or a repository creation, is denied with [Create Public Surface]

```json
{"id":"p8","count":2,"last":"2026-11-09"}
```

The permission system raises the denial.

- **Proposed resolution:** retry once at the user's word; if denied again, a
  narrow temporary allow rule or the user runs it.
- **Predicted:** the admin team, seeding this list from the encounters below,
  2026-11-09.
- **Encounters:**
  - 2026-11-09: WebTools #99 publish; cleared on retry.
  - 2026-11-09: `phase0-rehearsal-a` repository creation; cleared under a narrow
    allow rule.

## An encountered issue is not in this tracker

```json
{"id":"p9","count":0,"last":null}
```

- **Proposed resolution:** add it as a new entry with count 1, then prompt the
  user with it and its counter.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## A count changes in this mirrored file

```json
{"id":"p10","count":0,"last":null}
```

- **Proposed resolution:** the coordinator writes the count and the change rides
  the next `mirror-sync`, so the public copy lags slightly.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## A board write lands in a checkout during `realign-checkout`

```json
{"id":"p11","count":0,"last":null}
```

Board lanes write into the main checkout, which could break the check that the
untracked and ignored set is unchanged during a realignment.

- **Proposed resolution:** hold that checkout's board writes during
  `realign-checkout`.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## A history rewrite needs an issue edit beyond the body

```json
{"id":"p12","count":0,"last":null}
```

The rewrite's design allows more than `edit-issue-body` covers.

- **Proposed resolution:** define the edit as a plan-specified write when a unit actually needs it, under that job's section.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## `realign-checkout` meets changed tracked files

```json
{"id":"p13","count":0,"last":null}
```

The move is safe only while tracked files are unchanged.

- **Resolution (decided by the user, 2026-11-10):** the executor checks that the checkout's tracked files are unchanged immediately before the move; on any change it moves nothing and the team replies `stopped`; other preconditions travel in the request's `procedure` and `checks`.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## A `stopped` reply reaches a run

```json
{"id":"p14","count":0,"last":null}
```

The decision doesn't say whether it halts a `/resolve-issue` run.

- **Proposed resolution:** treat it as a halt, as `needs-user` is.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## A transfer in the real Phase 0 rewrite needs restoring, or its `done` needs ids

```json
{"id":"p15","count":0,"last":null}
```

`ref-map` maps git refs only, and the counts-only rule covers the report and ledger.

- **Proposed resolution:** name the job's run records as the restore record for transfers; counts-only starts at the real rewrite, not the rehearsal; a transfer's `done` keeps its new number and id out of the ledger entry only.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## A transfer holds only its target's lane

```json
{"id":"p16","count":0,"last":null}
```

The source repository, which a transfer also writes to, isn't protected by that lane.

- **Proposed resolution:** accept it until two writes actually race; then have a transfer also hold the source's lane.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - None yet.

## A build fails on an npm registry timeout (504)

```json
{"id":"p17","count":2,"last":"2026-11-09"}
```

OrganizationPage's Kotlin/JS install step depends on the package registry, and `kotlin-js-store/yarn.lock` isn't committed (#12).

- **Proposed resolution:** rerun the failed job and let this count.
- **Potential resolution:** cache the Yarn packages in CI, so a build rarely needs the registry. Committing the lock file (#12) would not stop these failures.
- **Resolution attempts:**
  - 2026-11-09, staging #7: one rerun; cleared.
  - 2026-11-09, push CI on PR #16: two reruns; cleared.
- **Predicted:** the admin team, on encountering it, 2026-11-09.
- **Encounters:**
  - 2026-11-09: staging OrganizationPage#7 at 16faca3; cleared on one retry.
  - 2026-11-09: push CI on PR #16; cleared on the third attempt.
