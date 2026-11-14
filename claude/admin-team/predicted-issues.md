# Predicted issues

What the admin team expects may go wrong, each with its proposed resolution and
a count of the times it has actually happened. The rule for keeping this list
is in `agents/admin-team/GUIDANCE.md` (How the team works, **Predicted issues**). Dates
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

The route is "New dashboard rules reach old dashboards" in `admin-team/GUIDANCE.md`.

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
{"id":"p8","count":5,"last":"2026-11-12"}
```

The permission system raises the denial.

- **Resolution (decided by the user, 2026-11-12, for an action under a temporary
  grant):** only after the refusal, the direction manager places one
  `autoMode.allow` line for the action, no broader than the grant's section and
  naming the repository, the action's exact command, the request id, the
  section, what it does not cover and when it is removed; the section's
  `Settings:` line records it. The team asks the user for a restart, and on
  the user's yes writes its handoff and ends its session; the user or the next
  requesting session's launcher brings it back, and the team reruns the request
  from its ledger under the request's id with `attempt + 1`, its reply carrying
  the raised attempt. Without the user's standing allow line, or on a refusal
  despite it, the direction manager stages the change with its diff under
  `admin-team/proposals/` and the user places it. The line is removed when the
  section moves to history (`agents/admin-team/GUIDANCE.md`, Gates and standing grants,
  Temporary permissions, **Allow lines**).
- **Proposed resolution (an action under no temporary grant):** retry once at
  the user's word; if denied again, a narrow temporary allow rule or the user
  runs it.
- **Predicted:** the admin team, seeding this list from the encounters below,
  2026-11-09.
- **Encounters:**
  - 2026-11-09: WebTools #99 publish; cleared on retry.
  - 2026-11-09: `phase0-rehearsal-a` repository creation; cleared under a narrow
    allow rule.
  - 2026-11-12: KotlinBottools #25, the change of the repository to public under its
    temporary grant: the executor’s single call was refused before it reached GitHub;
    nothing ran and the repository stayed private. Put to the user.
  - 2026-11-12: the same request, retried at the user’s word: refused again, at the call
    that writes the script; nothing ran. The user then placed a narrow allow line in the
    team’s settings themselves.
  - 2026-11-12: the same request, retried with that allow line in the settings file: refused
    again, at the call that runs the script. An `autoMode.allow` line placed while the team
    is running did not clear it. After a restart of the team, the same request ran clean.

## An encountered issue is not in this tracker

```json
{"id":"p9","count":12,"last":"2026-11-14"}
```

- **Proposed resolution:** add it as a new entry with count 1, then prompt the
  user with it and its counter.
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - 2026-11-13: a member could not stop a background search it had started; added as
    "A member's attempt to stop its own background process is refused".
  - 2026-11-13: a force-push a temporary grant covers was denied by the permission system;
    added as "A push a grant covers is denied with [Git Destructive]".
  - 2026-11-13: a read-only query of the running processes' command lines was denied
    by the auto mode classifier with no reason given; added as "A read-only query of
    the running processes is denied".
  - 2026-11-13: an archive job's deletion was refused for a loose file in a session's
    temp folder, which the `images/` entry does not hold; added as "A session's temp
    folder holds a loose file, and its deletion is refused".
  - 2026-11-13: an archive job's `fold-base` refused the relative folder `archive.js plan`
    had printed; added as "`archive.js fold-base` refuses the folder `archive.js plan`
    prints".
  - 2026-11-14: an archive job found its session's inputs that arrived while the team
    was busy missing from the extracted conversation; added as "`extract-session.js`
    leaves out inputs that arrived while the team was busy".
  - 2026-11-14: the same archive job found an item an open record names left uncopied
    from the scratchpad; added as "`scratch-copy.js` does not resolve the
    colon-and-list pointer form".
  - 2026-11-14: an archive job's Write of a working file into the scratchpad was refused
    by the Write tool, "Subagents should return findings as text"; added as "A subagent's
    Write of a working file is refused".
  - 2026-11-14: the team's session ended twice in a row without a handoff while jobs were
    running, a case no entry held; added as "The team's session ends without a handoff while
    jobs are running".
  - 2026-11-14: a trial member's message to the bare name `admin team` was refused as
    ambiguous, offline Remote Control entries of earlier team sessions carrying the name;
    added as "A message to the bare name "admin team" is refused as ambiguous".
  - 2026-11-14: an archive job found an image-only user turn missing from the extracted
    conversation; added as "`extract-session.js` drops a user turn that is an image alone".
  - 2026-11-14: the same archive job found the session's uploads folder standing after its
    deletion; added as "A session's uploads folder outlives its deletion".

## A count changes in this mirrored file

```json
{"id":"p10","count":2,"last":"2026-11-12"}
```

- **Resolution (decided by the user, 2026-11-13, and settled by the change of the
  team's brief that day):** the Archivist, the tracker's only writer, writes the
  count, and the change rides the next `mirror-sync`, so the public copy lags
  slightly (`agents/admin-team/GUIDANCE.md`, Service: archive, Predicted issues).
- **Predicted:** the admin team, 2026-11-09.
- **Encounters:**
  - 2026-11-12: the entry for a procedure not run as one shell was added; it rides the next mirror-sync.
  - 2026-11-12: two expected issues of the one-shell rule were added and one count changed; they ride the next mirror-sync.

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
{"id":"p18","count":6,"last":"2026-11-12"}
```

A run sends `facts.at` rounded or estimated (the user: this happens at every session start) instead of read from the clock, so the board records a wait or a visit at the wrong time, and a later event can fall inside it. A retime is raised by the team at the presenter's word (`~/.claude/agents/admin-team/presenter.md`, "Timing corrections") and never reorders the record, so a later event inside the wrong stretch can block it.

- **Resolution (decided by the user, 2026-11-10):** a run reads every event's `facts.at` from the clock (`date -u +%FT%TZ`), never rounding or estimating it; when an event's `facts.at` is missing or more than 2 minutes from its arrival, the team stamps the arrival time (`apply-event.js --arrived`) and tells the run.
- **Extended (the user, 2026-11-10):** the same 2-minute arrival check covers the `raised` and `resolved` times of the open points an event newly raises or resolves.
- **Further resolution (decided by the user, 2026-11-13):** a run may correct its own events' recorded times itself, sending `retime` until its `land` is sent, and a run whose reading the arrival check replaced sends one with its own clock reading and the reason; the arrival check stays as it is. A retime still never reorders the record, so a correction a later event blocks stays refused, and a time the run never read from the clock has no reading to restore.
- **Predicted:** the admin team, on encountering it, 2026-11-10.
- **Encounters:**
  - 2026-11-10: KotlinBottools #23, `halted` sent as 02:00:00Z (arrived 01:52:22Z) and `resumed` as 02:30:00Z (arrived 02:01:54Z); `research-planning` at 02:04:54Z falls inside the recorded wait.
  - Follow-on of that encounter, not counted (the user, 2026-11-10): the 02:30:00Z stamp, left on the board, later blocked `run-restarted` for #23's session change (02:28:05Z to 19:27:15Z); the arrival check held for that day's new events.
  - 2026-11-10: KotlinBottools #23 (new session): an open point's `resolved` sent as 20:05:00Z, an estimate (the grant was 20:08:36Z); the run corrected it itself. The arrival check covers `facts.at` only, not the times inside `open`.
  - 2026-11-10: KotlinBottools #23: two open points sent as `resolved` at 21:31:54Z, the report time; they were resolved earlier, at the plan amendment, with no clock reading kept. The run flagged it itself; the board keeps the report time with a correction note.
  - 2026-11-11: KotlinBottools #23, after the run was told to read the clock when a point is resolved: an open point sent as `resolved` at 02:04:06Z, the report time; it was resolved before the push into the fresh repository began (01:43:09Z in the ledger), with no clock reading kept. The run flagged it itself; the board's live view records 01:43:09Z as the latest it can have been, with a correction note. The arrival check could not catch it: the report arrived 33 seconds after its own time.
  - 2026-11-12: the admin team itself, in its ledger: after its restart it wrote its own entries’ `ts` by hand from 17:48Z on, and the stamps ran up to 23 minutes ahead of the clock (19:00Z written at 18:37Z); the scheme’s working copies cited two of those stamps as decision times. Requests’ arrival stamps, taken from the transcript, were right. Corrected by a `ledger-correction` event with the true times from the session transcript; from then on every `ts` is read from `date -u`.
  - 2026-11-12: KotlinBottools #25: the stage event closing the second stage carried `at` 21:45:14Z, the clock at the report; the run’s own report in the same event says the stage ended at 21:44:16Z. The arrival check kept it (28 seconds before arrival), so the board records the stage’s end 58 seconds late. The run kept the true reading and named it; corrected by retime the same day, under the user's standing rule for the presenter.

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

## A history rewrite leaves a tracking board's recorded merge outside the branch's history

```json
{"id":"p23","count":1,"last":"2026-11-11"}
```

At a `sized`, `apply-event.js` seeds a board from its view copy only when the merge the board records is in the branch's history. After a history rewrite a tracking board still records its plan's merge commit from before the rewrite, so its copy is not seeded. The standing-rule move then written to the tracked board makes it as fresh as the copy, and `board.js --live` removes the copy as stale, with the copy's record of the last landing (the landed unit's as-built summary and its impact).

- **Resolution (decided by the user, 2026-11-11):** two changes to the seeding in `apply-event.js`, proposed by the presenter after reading the code. First, a tracking board's copy is gated on its plan's merge only while its units are being filed; after that it is seeded with a seeded unit copy inside it, which is what the rule text (`plan/RULES.md` §4, "Seeding at sized") already says. Second, where the standing rule marks a unit landed on the tracked tracking board, it also takes from the fresher copy what that landing owns (the row as built, its impact entries, its trail), as `reseed` does, so nothing is lost whatever refuses a copy. Correcting the recorded merge on the board was weighed and not recommended: it needs a new writing route and fixes only the boards someone remembers.
- **Predicted:** the admin team, on encountering it, 2026-11-11.
- **Encounters:**
  - 2026-11-11: KotlinBottools #24's `sized`: the tracking board's view copy was not seeded and was removed; the presenter restored its facts onto the tracked board from a backup it had taken.

## The arrival check replaces the true time of an event the run can only send late

```json
{"id":"p24","count":3,"last":"2026-11-12"}
```

A run learns that research has ended only when its planning agent returns, which is after the plan is written. It sends `researched` then, with the time the research ended. That time is more than 2 minutes before the event's arrival, so the arrival check (`apply-event.js --arrived`) replaces it with the arrival time. The next event, `plan-accepted`, sent in the same moment and holding a time a few seconds earlier, then falls before it: the board shows research running through the whole of the plan's writing, and the plan's visit takes bounds that match no event.

- **Resolution (decided by the user, 2026-11-11):** the planning agent sends `researched` itself at the moment the research ends, as it sends the other research events, so the event is never sent late; the arrival check stays as it is. The board of the encounter is corrected to the time the run read. (Loosening the check for an event's own time, as for open-point times in p19, was not chosen.)
- **Further resolution (decided by the user, 2026-11-13):** a run whose true time the arrival check replaced sends a `retime` itself, with its own clock reading and the reason, until its `land` is sent; the arrival check stays as it is. A retime never moves a time across another recorded time, so where a later event already holds an earlier time (the first and third encounters) the run's retime is refused as the team's would be.
- **Predicted:** the admin team, on encountering it, 2026-11-11.
- **Encounters:**
  - 2026-11-11: KotlinBottools #24: `researched` read at 19:42:46Z and sent with `plan-accepted` at 20:17:33Z; it was stamped 20:17:33Z, and `plan-accepted` holds 20:17:03Z.
  - 2026-11-12: KotlinBottools #25: the event closing the pre-flip gate, read at 22:19:35Z, arrived at 22:21:55Z, after the run had sent its visibility request (22:20:15Z); it was stamped 22:21:55Z, so the board records the gate’s end 140 seconds late and the next stage’s start after its first request. Here the run could have sent the event before going on.
  - 2026-11-12: KotlinBottools #25: eight step events for S9 to S11, each read from the clock at its step, were sent together in one report at 23:29:24Z; S9.gate, S9.batches and S9.feeds (23:20:02Z, 23:23:48Z, 23:24:03Z) were stamped with the arrival time, after S9’s own end. A retime is refused (it would cross the stage’s end). The run was told to send each step event as its step ends.

## A board write fails on Windows while another process reads the file

```json
{"id":"p25","count":0,"last":null}
```

The board scripts write a board file by writing a temporary file and renaming it over the old one. On Windows the rename is refused (`EPERM`, `EBUSY` or `EACCES`) while another process has the old file open. The scripts retry a refused rename: for 3 seconds until 2026-11-12 (0.5 seconds in `apply-state.js`), for 15 seconds with growing, uneven pauses since (`renameInto()` in the dashboards skill's `plan/scripts/lib.js`). When the retries run out the write fails with the old file intact, nothing half written, and the event is not applied.

What was measured (the presenter, 2026-11-11 and 2026-11-12): a reader that reopens the file every 2 ms kept one rename refused for 11 seconds in one run, mostly for under 0.6 seconds, and once for the whole 15 seconds; a reader that opens it every 20 ms held a rename for at most 17 ms over 60 writes. The live board re-reads its data every few seconds. The cause of the long refusals is not proven. The skill's verification meets the failure in its case "event and fill at the same time", whose reader reopens the file in a tight loop: 5 of 25 runs, with either budget.

- **Proposed resolution (not decided).** Three options, which can be combined:
  - **(a) Retry only.** Installed on 2026-11-12 as a plain defect fix. The file is always there, old or new. It does not cure the verification's case.
  - **(b) Move the old file aside.** After about 1.5 seconds of refusals, move the old file aside, move the new one in and delete the old one. The verification's case then passed 20 of 20 runs, the fallback used 6 times. The content is still never half written, but a reader that does not hold the boards' lock can find no file at all for a moment (once in 963 reads). The rules' sentence that every file is written through a temporary file and a rename (`plan/RULES.md` and `system/RULES.md` of the dashboards skill) would need a clause saying so. It changes what a reader can rely on, so it is the user's decision; it is kept as an experiment outside the skill.
  - **(c) Pace the verification case's reader** as a live reader is paced (about every 20 ms). It keeps what the case proves: hundreds of reads still fall between the writes, so a half-written read would show, and "no write lost" does not depend on the reader. Stable as measured, not proven.
- **Predicted:** the presenter, from the skill's verification, 2026-11-11. Not yet met in live work.
- **Encounters:** none.

## A run sends a test level by name and the fast path drops it

```json
{"id":"p26","count":1,"last":"2026-11-12"}
```

The protocol gives a test class's `testLevel` as one of `1` `2` `3` `4a` `4b` `4c` `5`. A run sent the level folders' names instead (`gating`, `component`, `integration`, `nonfunctional`). The fast path read none of them and, as the classes' paths name no level folder, stored no level at all, without saying so in its summary: the Tests Tab showed every class with no test level until the fill set them by hand.

- **Resolution (a skill defect, fixed at the presenter's discretion on 2026-11-12):** the fast path now reads a level folder's name as its level, as a tolerance, and says so in its summary (`TEST LEVEL BY NAME`); a value that is neither a level nor a name is not read and is named for the presenter. The protocol's values stay `1` to `5`, and the run was told to send them.
- **Predicted:** the admin team, on encountering it, 2026-11-12.
- **Encounters:**
  - 2026-11-12: KotlinBottools #24, the stage report after the plan's second revision: 14 classes sent with level names; the fill set the levels from the event's facts.

## A run sends the Document step's tasks on a `halted` event, which reads none

```json
{"id":"p27","count":1,"last":"2026-11-12"}
```

The protocol gives `facts.tasks` at `document`. A run that stops for a question in its Document step sent the tasks' new states with the `halted` event instead (the documentation check done, the next task current). The fast path applied the halt and its questions and did not read the tasks, without saying so: the board showed the finished task as current through the wait.

- **Resolution (a skill defect, fixed at the presenter's discretion on 2026-11-12):** the fast path now names, on an `unread` line of its summary, every fact an event carried and did not read; a `halted` event sent in the Document step applies its tasks, as a tolerance, and says so. The protocol still gives the tasks at `document`. The board of the encounter keeps two task times 11 minutes late (the end of the documentation check and the start of the next task): the rules give no way to correct one task's time, and a correction path is proposed, not decided.
- **Predicted:** the admin team, on encountering it, 2026-11-12.
- **Encounters:**
  - 2026-11-12: KotlinBottools #24: `halted` at 01:59:34Z carried the five tasks; the board kept the documentation check current.

## A plan's procedure is not run as one shell

```json
{"id":"p28","count":1,"last":"2026-11-12"}
```

A write a plan specifies carries a `procedure`, a list of commands the plan means to run in one shell, in order, so that a guard that stops ends the whole procedure before its write. The team's brief to the executor said only to run the commands in order, and from the fourth request of a series also asked for a value the procedure does not print. Executors then ran entries in separate calls, or added a read to an entry. Every guard passed and every result matched, so nothing wrong was written, but a stopping guard would not have ended the run by the shell's own exit.

- **Resolution (the team's own brief, changed on the encounter, 2026-11-12):** the executor writes the procedure's entries unchanged, in order, to one script and runs it with a single call; it adds nothing to it, and anything else it wants to read goes in a separate call that writes nothing; if it cannot run the procedure as one shell it runs none of it and reports. The team tells the requester what the earlier reports show, for its record of departures. `version-control-manager.md` (Executor mode) states the rule itself (decided by the user, 2026-11-12).
- **Predicted:** the admin team, on encountering it, 2026-11-12.
- **Encounters:**
  - 2026-11-12: KotlinBottools #25: the nineteen `edit-issue-body` requests; the run raised it at the nineteenth, after the eighteenth's reply said its first entry ran in a call of its own.

## An executor cannot run a plan's procedure as one shell

```json
{"id":"p29","count":0,"last":null}
```

`version-control-manager.md` (Executor mode) has a plan-specified write's procedure run as one shell, and has the executor run none of it and report why when it cannot. The rule names no part of the report for that, and the part decides how the team replies to the sender.

- **Proposed resolution:** the executor reports it under **Not done / blocked**: nothing ran, so it is a blocker and not a failed check. The team tells the sender the request was not carried out and why, and the sender may send it again once the cause is fixed; it is not a `stopped`, which is for a procedure that got partway and leaves a state to read first.
- **Predicted:** the direction manager, on applying the one-shell rule, 2026-11-12; filed here at the user's word.
- **Encounters:**
  - None yet.

## `realign-checkout`'s own check meets the one-shell rule

```json
{"id":"p30","count":0,"last":null}
```

For a `realign-checkout` the executor checks that the checkout's tracked files are unchanged "immediately before the move", whatever the request's `checks` say. Under the one-shell rule the procedure runs as one script with nothing added, so that check cannot sit inside it: it is immediately before the move only when the move is the procedure's first write.

- **Proposed resolution:** the check runs in a separate read-only call just before the single call that runs the procedure, and the procedure is expected to carry its own guard before the move; the rule's wording would become "immediately before running the procedure". Nothing is added to the script, so "add nothing" keeps no exception.
- **Predicted:** the direction manager, on applying the one-shell rule, 2026-11-12; filed here at the user's word.
- **Encounters:**
  - None yet.

## A report sent while a run is halted ends the halt on the board

```json
{"id":"p31","count":0,"last":null}
```

Any event but `cancelled` ends a halt (`plan/RULES.md` §4). A run that revises its stage table, or whose implementer closes a stage, while the board shows it halted would send an `implementation-stage`, and the board would leave the halt: the step back at `implementation`, the wait ended, though the question is still open.

- **Proposed resolution:** a run sends no stage report while it is halted; it sends it after its `resumed`. If that proves too narrow, an `implementation-stage` whose stage states are unchanged leaves a halt standing; that would change the rule and is the user's to decide.
- **Predicted:** the presenter, on building nested stage steps, 2026-11-12.
- **Encounters:**
  - None yet.

## A stale repeat of a stage's closing event reopens a later stage

```json
{"id":"p32","count":0,"last":null}
```

`facts.stages` gives every stage's state, and a stage named `current` again loses its end. A closing event sent a second time with the states as they were when it was first sent, after a later stage has closed, names that later stage `current`: the board reopens it and loses its end time, report and result. Its step records survive. A repeat with the states as the board has them changes nothing.

- **Proposed resolution:** a repeat is sent with the stages as they stand, never as they stood; the implementer's "Events not sent" carry each event's own facts, so the run sends them in order before anything later. If one still arrives stale, the presenter restores the stage's record from the event that closed it.
- **Predicted:** the presenter, on building nested stage steps, 2026-11-12.
- **Encounters:**
  - None yet.

## Step events move the start of a later open-points wait

```json
{"id":"p33","count":0,"last":null}
```

A `step-complete` becomes the board's last event. A later `resumed` that ends an open-points wait starts that wait at the board's last event; with step events after the event that raised the point, the wait starts later than it did, and a little of it is counted as work.

- **Proposed resolution:** the wait starts at the event that raised the point, not at the board's last event; a small skill fix at the presenter's discretion when it is first seen.
- **Predicted:** the presenter, on building nested stage steps, 2026-11-12.
- **Encounters:**
  - None yet.

## An edit of the team's own files is refused as [Self-Modification]

```json
{"id":"p34","count":9,"last":"2026-11-13"}
```

The session's auto mode classifier refuses a tool call by which the team changes its own briefs, protocol, skill rules or settings, with the reason "[Self-Modification]". It judges each call: on the same day most of the direction manager's edits to the same files went in. The refused ones were bulk shell copies over the briefs and edits that loosen what the team itself may do (a permission line in its settings, the rule on what may be pushed straight to `main`, the direction manager's own scope, who may direct a retime). A subagent's conversation holds the team's brief to it, not the user's words at the console, and a sentence written into the team's brief did not change the outcome.

- **Resolution (decided by the user, 2026-11-12, for the direction manager's edits to the team's settings file under a temporary grant):** a standing `autoMode.allow` line, placed by the user by hand once, covers placing and removing a temporary allow line and lifting and restoring a deny rule; without that line, or on a refusal despite it, the direction manager stages the change with its diff under `admin-team/proposals/` and the user places it (`agents/admin-team/GUIDANCE.md`, Gates and standing grants, Temporary permissions, **Allow lines**).
- **Resolution (as practised on the encounters, 2026-11-12, for every other edit; a standing fix is not decided):** the agent stops at the refusal and tries no other route; it stages the edited file as a copy with its diff under `admin-team/proposals/`; the team tells the user and gives them the copy command; the user places the file, and the team then records the `config-edit` and mirror-syncs. A half-applied change is said file by file, and its mirror-sync is held until it is whole. A standing allow line for the direction manager's other directed edits was offered and not taken up.
- **Predicted:** the admin team, on encountering it, 2026-11-12.
- **Encounters:**
  - 2026-11-12: the Graphify Manager's apply: one shell command copying the staged briefs into place; the same edits then went in file by file.
  - 2026-11-12: W37 (the structure scheme's changes to the team's rules) as a shell script; nothing written.
  - 2026-11-12: a temporary allow line for KotlinBottools #25 in the team's settings file; staged, placed by the user.
  - 2026-11-12: W37 retried by Edit: two changes went in, the change to the straight-to-`main` rule was refused; the rest placed by the user.
  - 2026-11-12: the sentence on the direction manager's scope in the team's brief; staged, placed by the user.
  - 2026-11-12: the presenter's timing rule: it went into the presenter's brief; the matching edits to the protocol, the dashboards rules and the dashboards skill were refused and staged.
  - 2026-11-13: the lift of a deny rule for a temporary grant (KotlinBottools #26): the team's start of the direction manager's job was itself refused, in a session that began before the standing line was placed; staged, for the user to place.
  - 2026-11-13: the approved change giving the presenter its own rules (four briefs at once): four of the five changes to the team’s brief went in, the fifth was refused, and the other three briefs were not started; the four staged copies are for the user to place. The changes were sent as one batch, so the refusal did not stop the two after it.
  - 2026-11-13: the approved session-archive change to the Archivist’s brief: the scripts and the first three changes went in, the change that adds the modes that archive and delete was refused; the rest of that brief, the team’s brief and CLAUDE.md were not started; the staged copies are for the user to place.

## A name the scan bars is in a string a script prints

```json
{"id":"p35","count":1,"last":"2026-11-13"}
```

The internal-names scan reads documents, boards and the comments in source code; code itself is not scanned. A message a script prints is code, so a name the list bars can reach a public repository in it without a find.

- **Proposed resolution:** put to the user as a choice of the work that carries the script: reword the strings in a later commit, leave them, or have the scan also read the strings a script prints.
- **Predicted:** the admin team, on encountering it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: the organization repository, the first commit of its structure files: two messages the checker and the fetch script print name the admin team (`scripts/rule-check.js:668`, `scripts/rule-fetch.js:31`). The files were the bytes the user had approved and the scan held no find, so the commit went out; the user was told at the console.
  - 2026-11-13: the same messages: reworded at the user’s choice, in the commit that carried the checker’s line-ending fix (`054c0d7`): each says what to do without naming who does it. Not a second encounter.

## A library’s own name that matches a barred name stops a commit

```json
{"id":"p36","count":2,"last":"2026-11-13"}
```

Since 2026-11-13 the internal-names list holds no exception for a library’s name that only coincides with a barred name (the user’s decision: any case for an exception is brought to the user first). A document, a board or a code comment that names a Reactive Streams `Publisher`, a `java.util.concurrent.Executor` or a domain `verifier` is now a find, in backticks too (a longer word that contains a barred name, such as OkHttp’s `RoutePlanner`, is not), and the scan reads every line of each file a commit carries, so a file that already holds such a name stops the next commit that touches it. The dashboards skill’s `namerefs.js` holds its own copy of the list and must follow it, or the boards and the commit scan disagree.

- **Resolution (decided by the user, 2026-11-13):** a find goes back to the requester to reword (`needs-rework`); a requester with a reason to keep it resends asking for an exception, and only then does the team put the case to the user at the console, with the file, the line and the requester’s reasons, replying `needs-user` meanwhile. An exception the user grants the first time is a one-off, a pass for that commit and that file recorded in the ledger; when the same case comes up again the team asks the user whether it should become a rule, a row in the list’s Allowed section. Each repository is swept ahead of time, read only, and its files that hold a barred name are listed, so the rewording is planned (`agents/admin-team/GUIDANCE.md`, Service: version control, “Internal names block a commit”; `nomenclature/internal-names.md`).
- **Predicted:** the admin team, on recording the decision, 2026-11-13.
- **Encounters:**
  - 2026-11-13: the organization repository, the commit that opens Policy: the documentation standard’s page names its outer ring’s readers as “system architects” (`policy/documentation/audience-reach.md:58` in the prepared package). Found before the commit was sent and put to the user at the console.
  - 2026-11-13: WebTools, the rule rework’s staged set: `README.md:604` names “the same per-connection dispatch executor”, a thread executor in the technical sense. Found before the commit was sent; the user granted a one-off pass for that commit and that file at the console, the first pass for this word.

## A member's attempt to stop its own background process is refused

```json
{"id":"p37","count":3,"last":"2026-11-13"}
```

A member starts a long search or script in the background, finishes its job without it, and tries to stop it. The permission system refuses the stop, and the process keeps running after the member has reported. The team cannot stop it for the member: doing what a member was refused is the member's refusal carried around the permission system.

- **Proposed resolution:** the team checks, read only, whether the process is still running, and tells the user what it is, what started it and its process id; it stops it only at the user's word at the console. A process the team's own shell started is the team's to stop. Members are briefed to run searches in the foreground with a bounded pattern.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: the Archivist's first backlog run left a search over the ledger running (a pattern with two wide repeats on very long lines); its stop was refused as interfering with workloads. Put to the user at the console.
  - 2026-11-13: the executor of a mirror-sync started an empty script in the background by mistake; its stop was refused, and the process was still running when it reported. Checked read only and told to the user at the console with its process ids.
  - 2026-11-13: the graphify manager’s code-only refresh of a second repository left a check command running in the background (it called python with no path, which hung); the member has no tool to stop it, so no stop was tried or refused. Checked read only and told to the user at the console with its process ids.

## A push a grant covers is denied with [Git Destructive]

```json
{"id":"p38","count":1,"last":"2026-11-13"}
```

The executor runs a plan's push under a temporary grant, as one shell holding the plan's procedure, and the session's auto mode classifier denies the call with the reason "[Git Destructive]" before any entry runs. The grant's section in the permissions file does not reach the classifier, and lifting a deny rule in the settings file does not either: the two are separate checks.

- **Proposed resolution:** the rule for a refused action under a grant (`agents/admin-team/GUIDANCE.md`, Gates and standing grants, Temporary permissions, **Allow lines**): nothing else is tried; one `autoMode.allow` line for that action, naming the repository, the exact command, the request's `id` and the job, is placed by the direction manager or staged for the user to place; the team restarts and runs the same `id` again with `attempt + 1`. A job with more than one such push meets the refusal once per push unless the user places the lines together.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: KotlinBottools #26, the push of one branch to the first of its two repositories, with an explicit lease, after the deny rule on that form had been lifted in the settings file without a restart. Nothing was pushed. Put to the user at the console with the line staged.

## The presenter's edit of its own brief is refused as [Self-Modification]

```json
{"id":"p39","count":0,"last":null}
```

Once the presenter handles its own rules, its brief among them, the session's auto mode classifier may refuse its edit of that brief, as it has refused the direction manager's edits of the team's own files (the entry "An edit of the team's own files is refused as [Self-Modification]").

- **Proposed resolution:** as practised for the direction manager: the presenter stops at the refusal and tries no other route; it stages the edited copy with its diff under `admin-team/proposals/`; the team tells the user and gives the copy command; the user places the file; the team records the `config-edit` and mirror-syncs.
- **Predicted:** the user, at the console, 2026-11-13 (asked what should happen in that case: "expected issue").
- **Encounters:**
  - None yet.

## A read-only query of the running processes is denied

```json
{"id":"p40","count":3,"last":"2026-11-13"}
```

The team checks, read only, whether a member's job left a process behind (the entry "A member's attempt to stop its own background process is refused" has it do so). The session's auto mode classifier denied a query of the running processes' command lines (PowerShell `Get-CimInstance Win32_Process`) with no reason given. It is neither an edit of the team's own files nor a member's attempt to stop its own process.

- **Proposed resolution:** as practised on the encounters: the one whose query is refused stops and tries no other route, and the user is told at the console. The Coordinator then reads the process list with `tasklist`, filtered on the image name, which is allowed, and states what it found in the next job's prompt. No standing route is decided.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: the Coordinator's query, made to confirm an Archivist job had left no process behind, was denied with no reason given and not retried another way; a process list without command lines showed one node process the team could not identify. Told to the user at the console.
  - 2026-11-13: the graphify manager's query, filtered on the graph tool's name and made in a code-only refresh of a repository after a landing to see whether a hook's rebuild was still running, was denied with no reason given; the member stopped and tried no other route. The Coordinator read with `tasklist` that no such process was running, and the refresh, run again as a new job, finished clean. Told to the user at the console.
  - 2026-11-13: an Archivist's query of the node processes, made at the end of a session archive job, after all its steps had passed, to identify one running node process it had not started, was denied with no reason given; it stopped and tried no other route. Told to the user at the console.

## The permission system refuses the Archivist's deletion

```json
{"id":"p41","count":0,"last":null}
```

An archive job's `delete-session.js` deletion, or a sweep's `--orphans` removal of empty orphan temp folders, is refused by the permission system.

- **Proposed resolution:** as the team's brief places it (`agents/admin-team/GUIDANCE.md`, Service: archive, Sessions): after the first refusal, the direction manager places a `permissions.allow` rule for `delete-session.js` in the team's settings file, at the user's direction; after a second, an `autoMode.allow` line the same way; after a third, the user is given the command to run (one session, `--all-ready`, or `--orphans`), and sweep and archive jobs keep their deletion held.
- **Open:** whether the hold after a third refusal also covers the sweep's removal of empty orphan folders. a) It does, as placed; b) sweeps keep trying to remove leftover folders. No recommendation.
- **Predicted:** the admin team, 2026-11-13.
- **Encounters:**
  - None yet.

## A fact text quotes code whose identifier is a barred name

```json
{"id":"p42","count":0,"last":null}
```

For example a rendered code block with a variable named `executor`. Today the fast path leaves such a text off the board and `fill.js` refuses it.

- **Proposed resolution:** a) reword the sample; b) leave the text out (what happens now); c) keep it with a warning. No recommendation.
- **Predicted:** the presenter, 2026-11-13.
- **Encounters:**
  - None yet.

## A wait phrase inside a rendered code block

```json
{"id":"p43","count":0,"last":null}
```

"Waiting on the user" inside a rendered fenced block is left out of the wait check today (`namerefs.js` `waitRefs()` blanks fenced blocks).

- **Proposed resolution:** a) keep that; b) count it. No recommendation.
- **Predicted:** the presenter, 2026-11-13.
- **Encounters:**
  - None yet.

## A session's temp folder holds an `images/` folder, and its deletion is refused

```json
{"id":"p44","count":1,"last":"2026-11-13"}
```

A console session where an image is pasted keeps the attachment in an `images/` folder of its temp folder, beside `scratchpad/` and `tasks/`. `delete-session.js` knows only those two as the session's temp stores, so an archive job's step 7 refuses the whole deletion ("holds more than scratchpad/ and tasks/: images"), and the session stays archived but not deleted.

- **Resolution (decided by the user at the console, option a, 2026-11-13, and settled by the change of the archive scripts that day):** `delete-session.js` accepts a session's `images/` folder as one of its temp stores, beside `scratchpad/` and `tasks/`, so step 7 deletes it with the rest of the session; the scripts' test suite passes 116 of 116 (113 before). `scratch-copy.js` needed no change: a session's images are not copied into the archive (option b, keeping them in the archive, was not chosen).
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: an archive job's step 7 refused an archived session's temp folder, which held one pasted attachment (`images/1.png`, 22,670 bytes) beside its scratchpad and task outputs. Nothing was deleted; 5,452 MB stays on disk. Put to the user at the console.

## A session's temp folder holds a loose file, and its deletion is refused

```json
{"id":"p45","count":2,"last":"2026-11-13"}
```

A member's job can leave a file loose in an ended session's temp folder, beside `scratchpad/` and `tasks/`: a mirror-sync executor writes its commit message there and commits with `git commit -F ../msg.txt`. `delete-session.js` knows only those two as the session's temp stores, so an archive job's step 7 refuses the whole deletion ("holds more than scratchpad/ and tasks/: msg.txt"), and the session stays archived but not deleted. The entry "A session's temp folder holds an `images/` folder, and its deletion is refused" is the same refusal for a pasted attachment.

- **Resolution (decided by the user at the console, option a, 2026-11-13, then, 2026-11-14, that each loose kind is named as it is met and each new kind comes to the user; settled by the direction manager's change of `delete-session.js`):** beside `scratchpad/`, `tasks/` and `images/`, `delete-session.js` accepts a loose regular `msg.txt` (a spent commit message) or `verify-full.log` (a verification run's log), and builds its refusal message from that list; the scripts' test suite passes 119. Options b, removing it by hand, and c, leaving it, were not chosen.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: an archive job's step 7 refused an archived session's temp folder, which held a loose `msg.txt` (232 bytes, a spent commit message a mirror-sync executor wrote there after the session ended). Nothing was deleted. Put to the user at the console.
  - 2026-11-13: an archive job's step 7 refused an archived session's temp folder, which held a loose `verify-full.log` (44,166 bytes, a verification run's log), after the check had already been widened for `images/` and a loose `msg.txt`: "holds more than scratchpad/, tasks/, images/ and a loose msg.txt: verify-full.log". Nothing was deleted. The user's decided option a ("a loose file of a known kind") was built for the kinds met then (a spent commit-message file), so which further kinds count is going back to the user.

## `archive.js fold-base` refuses the folder `archive.js plan` prints

```json
{"id":"p46","count":1,"last":"2026-11-13"}
```

An archive job's step 8 runs `archive.js plan` and then each wrap due. `plan` prints a base folder due for `fold-base` as a relative path, and `fold-base` refuses that path ("not a base folder of this archive"). The same folder given as an absolute path is accepted.

- **Resolution (decided by the user at the console, option a, 2026-11-13, and settled by the direction manager's change of the archive scripts, 2026-11-14):** `archive.js fold-base` accepts its target relative to the archive, as `plan` prints it, and still a path from the current folder or an absolute path; the scripts' test suite passes 118, and a control run shows the new test fails on the old script. Option b, archive jobs passing absolute paths, was not chosen.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: an archive job's step 8: `fold-base` refused the relative folder `plan` had printed; given as an absolute path, the wrap was done. Put to the user at the console.

## `archive.js fold-upper` refuses the target `archive.js plan` prints

```json
{"id":"p47","count":0,"last":null}
```

`plan` prints a tier document due for `fold-upper` relative to the archive, but `fold-upper` resolves its target against the current folder and compares it with the oldest document of the tier below, so the target as printed is refused ("not the oldest document of tier …"). Found by the change that settled the entry "`archive.js fold-base` refuses the folder `archive.js plan` prints".

- **Proposed resolution:** a) the same two-reading fix as for `fold-base`, with a test; b) leave it, and archive jobs join the archive path onto the target. No recommendation recorded by the team; the direction manager recommends a.
- **Predicted:** the direction manager, 2026-11-14.
- **Encounters:**
  - None yet.

## `extract-session.js` leaves out inputs that arrived while the team was busy

```json
{"id":"p48","count":1,"last":"2026-11-14"}
```

`extract-session.js` reads only `type: user` records and skips `attachment` records of type `queued_command`, which is how input arriving mid-turn is stored. User turns, cross-session messages, task notifications and agent hand-backs that arrive while the team is busy are therefore missing from `conversation.md`. Every base archive made before the encounter was extracted without them, and those transcripts are deleted; the ledger holds the user's decisions. Confirmed read only: the script handles no such record, and the remaining transcripts hold them.

- **Resolution (decided by the user at the console, 2026-11-14, "Fix p48 and leave the earlier archives alone", and settled by the change of `extract-session.js` that day):** the extractor reads `queued_command` attachment records through the same classifier as user records, with a 9-check test; all the archive scripts' tests pass. Earlier archives are left as they are. Archive jobs no longer write an interim `queued-inputs.md`.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: an archive job: 22 user turns, 26 cross-session messages, 115 task notifications and 42 hand-backs were missing from the extracted conversation; they were saved verbatim into a `queued-inputs.md` beside it before the deletion.

## `scratch-copy.js` does not resolve the colon-and-list pointer form

```json
{"id":"p49","count":1,"last":"2026-11-14"}
```

A record that says "scratchpad <id8>: a, b, c" names items the script's words pattern does not read, so an item an open record names goes uncopied into the archive.

- **Resolution (decided by the user at the console, 2026-11-14, "Fix p49", and settled by the change of `scratch-copy.js` that day):** the words pointer form reads a comma list after a colon, "scratchpad <id8>: a, b, c": each item is resolved, and an item that resolves to nothing is reported dangling; two test checks, and all the archivist's tests pass. The list is read only after a colon. Other pointer forms the script does not read are outside this entry.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: an archive job: one file an open record named this way was not copied; it was copied by hand and added to the manifest.

## A subagent's Write of a working file is refused, "Subagents should return findings as text"

```json
{"id":"p50","count":1,"last":"2026-11-14"}
```

An archive job wrote its `summary.md` text to a file in the session scratchpad with the Write tool, to copy it into the archive folder after, as earlier archive jobs had been told to do. The Write tool refused the subagent's call with the message "Subagents should return findings as text". The harness keeps a subagent from writing report files with Write; a file that is the job's own output, such as an archive's `summary.md`, meets the same refusal when written as a working file this way. The Archivist's brief names no tool for writing `summary.md`.

- **Proposed resolution:** a) archive jobs write `summary.md` straight into the archive folder with a bash heredoc, as the job that met it did, and the instruction to stage it in the scratchpad with Write is dropped from what archive jobs are told; b) the same, and the Archivist's brief says so at the archive mode's step 3, a change of a direction document for the direction manager. No recommendation recorded by the team.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: an archive job: the Write tool refused the subagent's write of the summary text into the scratchpad ("Subagents should return findings as text"); the job wrote `summary.md` straight into the archive folder with bash heredocs and went on.

## The team's session ends without a handoff while jobs are running

```json
{"id":"p51","count":2,"last":"2026-11-14"}
```

The admin team's session ends while background jobs it spawned are still running, and writes no handoff, so the handoff file stays the stale one from before. Neither the ledger nor the session's transcript records how it ended: the transcript holds no error record and no closing record. The first time, its last assistant turn ended normally and a task notification queued after it was never taken up; the second time, a model request had been sent on a subagent's hand-back with no reply recorded, and two more inputs queued after it were never taken up. The cause, as the user gave it, was a hardware issue on the machine.

- **Resolution (cause given by the user at the console, 2026-11-14, "The sessions end was a hardware issue"):** both session ends were a hardware issue on the machine; there is nothing to look into. Both times the user started the team again with "resume", and the new session recovered from the ledger and the subagent transcripts: each job running at the end was marked `interrupted` and requested again with `attempt + 1`, told to check what the earlier attempt left; a job whose report had been delivered before the end was recorded `done` from its transcript.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: the session ended after its last ledger line at 01:35:11Z (transcript last written 01:38:07Z) with three jobs running; the next session resumed all three as attempt 2.
  - 2026-11-14: the next session ended after its last ledger line at 01:56:34Z (transcript last written 01:57:02Z) with seven jobs running, two of which had already delivered their reports; the next session recorded those two from their transcripts and resumed the others, three of them for the second time.

## A prepare-landing sync is refused by an uncommitted implementation-stage stamp

```json
{"id":"p52","count":0,"last":null}
```

When the default branch has moved since the branch was cut, the uncommitted implementation-stage stamps in the run's worktree can make git refuse the `prepare-landing` merge with "local changes would be overwritten". It did not come up for WebTools #69, because the default branch had not moved.

- **Proposed resolution:** a) drop the implementation-stage stamp output before the sync, since the state-boards task rebuilds it anyway (recommended); b) leave it as it is.
- **Predicted:** the direction manager, 2026-11-07.
- **Encounters:**
  - None yet.

## A message to the bare name "admin team" is refused as ambiguous

```json
{"id":"p53","count":1,"last":"2026-11-14"}
```

`ListAgents` lists every session named `admin team`: the running team session, and an offline Remote Control entry left by each earlier team session (each relaunch adds one). With more than one listed, a `SendMessage` to the bare name `admin team` is refused as ambiguous, and the sender has to address the team by the name with its listing ref added, `admin team [<ref>]`. The protocol ("Finding the team": "Send with `SendMessage(to: "admin team")`") and the `admin-team` skill (step 1, "the peer row named **`admin team`**", and step 4's `SendMessage(to: "admin team", …)`) assume the bare name reaches the team, so any run's request may meet this. Not checked: what the `SendMessage` tool's own description says about bare names and offline sessions (the tool is not in the Archivist's set), and whether the user can remove the offline entries, or by what route.

- **Proposed resolution:** a) the protocol and the `admin-team` skill say how to find the live row when `ListAgents` lists more than one `admin team`, and to send to it by its ref, a change of direction documents for the direction manager; b) the user removes the offline Remote Control entries of earlier team sessions, if the harness offers a way (unverified); c) both. No recommendation recorded by the team.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: a trial member's message to the bare name `admin team` was refused as ambiguous, 13 sessions carrying the name (the running team and 12 offline Remote Control entries); it sent to the name with the live session's ref added, and the request arrived.

## `extract-session.js` drops a user turn that is an image alone

```json
{"id":"p54","count":1,"last":"2026-11-14"}
```

`extract-session.js` takes a user record's text through `textOf`, which keeps only the `text` parts of a content array, and skips a record whose text comes out empty. A turn in which the user sends an image and no words is therefore missing from `conversation.md` altogether, with no line marking that an image was sent; the image parts of a turn that also has words are dropped the same way. The image itself sits in the session's uploads folder, which nothing in the archive copies (the entry "A session's uploads folder outlives its deletion"). Confirmed read only: the script has no case for an image part. Not checked: what record shape a pasted or attached image takes in every case.

- **Proposed resolution:** a) fix the extractor, as was done for "`extract-session.js` leaves out inputs that arrived while the team was busy": a user turn's image parts are written as a line naming the image (its file name and size where the record gives them), so an image-only turn appears in `conversation.md`, with a test; earlier archives left as they are; b) leave it, and an archive job's summary records each gap it finds, as the job that met it did. No recommendation recorded by the team.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: an archive job: the session's one image-only user turn, a screenshot of a Help Center page that led to a user decision, was missing from the extracted conversation; the summary records the gap. The image was in the session's uploads folder; no open record pointed at it, so it was not copied.

## A session's uploads folder outlives its deletion

```json
{"id":"p55","count":1,"last":"2026-11-14"}
```

A file the user attaches in a session is kept in an `uploads/<session id>/` folder of the Claude config folder. `delete-session.js` removes five stores (the temp folder, the session's folder, its transcript, `file-history/` and `session-env/`) and not this one, so it stands after the session is deleted; the archive step neither copies from it nor describes it. The entry "A session's temp folder holds an `images/` folder, and its deletion is refused" settled pasted images in the temp folder, deleted with it and not copied into the archive; an upload is a separate store that decision did not reach. Of the two uploads folders found, one belongs to a deleted team session (one image, 763,778 bytes); the other, from 21 October, holds one Markdown file and belongs to a session of another project whose transcript still exists, so it is not left over from a deletion.

- **Proposed resolution:** a) the direction manager extends `delete-session.js` to remove a deleted session's uploads folder with its other stores, and the archive step to consider it: an upload an open record points at is copied into the archive, as the scratchpad's items are; b) leave uploads in place. No recommendation recorded by the team. Under a, how far it reaches past the earlier decision not to keep a session's images in the archive is for the user.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: an archive job: after the session's deletion its uploads folder, holding the screenshot its conversation lacks, still stood.
