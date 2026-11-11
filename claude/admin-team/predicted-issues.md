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

## A run stamps a board event with a time it did not happen at

```json
{"id":"p18","count":4,"last":"2026-11-11"}
```

A run sends `facts.at` rounded or estimated (the user: this happens at every session start) instead of read from the clock, so the board records a wait or a visit at the wrong time, and a later event can fall inside it. A retime needs the user's direction and never reorders the record, so a later event inside the wrong stretch can block it.

- **Resolution (decided by the user, 2026-11-10):** a run reads every event's `facts.at` from the clock (`date -u +%FT%TZ`), never rounding or estimating it; when an event's `facts.at` is missing or more than 2 minutes from its arrival, the team stamps the arrival time (`apply-event.js --arrived`) and tells the run.
- **Extended (the user, 2026-11-10):** the same 2-minute arrival check covers the `raised` and `resolved` times of the open points an event newly raises or resolves.
- **Predicted:** the admin team, on encountering it, 2026-11-10.
- **Encounters:**
  - 2026-11-10: KotlinBottools #23, `halted` sent as 02:00:00Z (arrived 01:52:22Z) and `resumed` as 02:30:00Z (arrived 02:01:54Z); `research-planning` at 02:04:54Z falls inside the recorded wait.
  - Follow-on of that encounter, not counted (the user, 2026-11-10): the 02:30:00Z stamp, left on the board, later blocked `run-restarted` for #23's session change (02:28:05Z to 19:27:15Z); the arrival check held for that day's new events.
  - 2026-11-10: KotlinBottools #23 (new session): an open point's `resolved` sent as 20:05:00Z, an estimate (the grant was 20:08:36Z); the run corrected it itself. The arrival check covers `facts.at` only, not the times inside `open`.
  - 2026-11-10: KotlinBottools #23: two open points sent as `resolved` at 21:31:54Z, the report time; they were resolved earlier, at the plan amendment, with no clock reading kept. The run flagged it itself; the board keeps the report time with a correction note.
  - 2026-11-11: KotlinBottools #23, after the run was told to read the clock when a point is resolved: an open point sent as `resolved` at 02:04:06Z, the report time; it was resolved before the push into the fresh repository began (01:43:09Z in the ledger), with no clock reading kept. The run flagged it itself; the board's live view records 01:43:09Z as the latest it can have been, with a correction note. The arrival check could not catch it: the report arrived 33 seconds after its own time.

## The arrival check replaces an open-point time that was read at the moment

```json
{"id":"p19","count":1,"last":"2026-11-11"}
```

The two rules the user set for p18 on 2026-11-10 meet head on. A run reads an open point's `raised` or `resolved` time from the clock at the moment (PROTOCOL.md, the `open` entry) and reports it in its next event, which can be many minutes later. The team's arrival check (`apply-event.js --arrived`) then takes any newly raised or resolved time more than 2 minutes from the event's arrival for a guess and replaces it with the arrival time. So the better a run follows the first rule, the more often the second overwrites a true reading.

- **Resolution (decided by the user, 2026-11-11):** for open-point times, check bounds instead of closeness: a time is kept when it is not after the event's arrival (plus the tolerance) and not before the last event in which the point was still reported open (for a newly raised point, not before the board's first record of the run); only a time outside those bounds, or a missing one, is replaced. `facts.at` keeps the 2-minute check.
- **Follow-up (decided by the user, 2026-11-11):** the script's lower bound for a newly resolved point was stricter than the one decided (the board's last run-raised event), because the board stored no time for it. The board now stores that time on each open point, as the presenter proposed, so the script can apply the bound as decided.
- **Predicted:** the admin team, on encountering it, 2026-11-11.
- **Encounters:**
  - 2026-11-11: KotlinBottools #23, event 23/20 (arrived 04:08:06Z): the open point on the settings check was sent `resolved` at 03:57:44Z, a reading taken when the corrected check passed; the arrival check replaced it with 04:08:06Z. The team restored 03:57:44Z through the correction path, with a correction note on the board's live view.

## The live work board cannot be regenerated while a repository's issues are being moved

```json
{"id":"p20","count":1,"last":"2026-11-11"}
```

`board.js --live` reads every issue that has a board from GitHub. During a Phase 0 walk the old repository loses its issues one by one (they are transferred to the fresh repository under another name), so the read fails (`gh: Could not resolve to an Issue with the number of 2`). `apply-event.js` runs that step for every event and fails the whole event, applying nothing, when it fails.

- **Proposed resolution (not decided):** until the renames put every number back under the repository's name, raise that repository's events with `--no-live`; the live repository work board stays as it was and is regenerated once after the renames. For the skill, the presenter proposed one of: `board.js` keeps the previous `board.json`'s tracker facts when the read fails, or `apply-event.js` treats a failed live-board step as a warning.
- **Predicted:** the admin team, on encountering it, 2026-11-11.
- **Encounters:**
  - 2026-11-11: KotlinBottools #23, the fill for event 23/21: the live repository work board could not be regenerated (issues 1 to 5 had been transferred). The fill itself landed on the view copy. Events from then on are raised with `--no-live`.

## A restart's not-running stretch, taken from the ledger, misses what the run did between requests

```json
{"id":"p21","count":1,"last":"2026-11-11"}
```

`run-restarted` takes its bounds from the ledger alone: `since` is the run's last request and `ended` is the request that came from the new session (the brief, "A run not running"; `plan/RULES.md` §4). A run that keeps working after its last request (a qa agent still running) and resumes some time before its next request shows a stretch that is too wide at both ends. `retime` refuses a `run-restarted`, and a second `run-restarted` that overlaps a recorded stretch is refused too, so once the stretch is recorded nothing can correct it.

- **Resolution (decided by the user, 2026-11-11: change the rule and correct #23's board):** have a run that resumes send `restarted` with its own clock readings (last activity, resume), and have the team use them when they fall between the ledger's bounds. (The alternative, letting `retime` correct a stretch's bounds, was not chosen.)
- **Predicted:** the admin team, on encountering it, 2026-11-11.
- **Encounters:**
  - 2026-11-11: KotlinBottools #23, event 26: recorded 06:48:43Z to 14:08:08Z; the run reports its last qa progress note at 06:59:11Z and its resume at 13:54:02Z.

## A land after a qa pass whose findings were all minor and fixed on the spot

```json
{"id":"p22","count":1,"last":"2026-11-11"}
```

The `resolve-issue` skill (step 5) lets a run go on to the Document step and land, with no further qa pass, when every finding of a `CHANGES REQUESTED` verdict is minor and fixed on the spot. The protocol (`qa`: `PASS`, or `NONE` for levels that run no qa) and the brief (Lanes: a `land` is ready when its `qa` is `PASS`, or its level needs none) know no such verdict, so such a land is not ready by the letter.

- **Resolution (decided by the user, 2026-11-11):** the protocol's `qa` and the brief's readiness rule also accept the skill's last verdict, `CHANGES REQUESTED` with every fix minor and fixed on the spot. (A closing qa pass in the skill was not chosen.)
- **Predicted:** the admin team, on encountering it, 2026-11-11.
- **Encounters:**
  - 2026-11-11: KotlinBottools #23, its `land` (qa pass 1 CHANGES REQUESTED, five minor findings fixed on the spot).
