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
{"id":"p8","count":3,"last":"2026-11-12"}
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
  - 2026-11-12: KotlinBottools #25, the change of the repository to public under its
    temporary grant: the executor’s single call was refused before it reached GitHub;
    nothing ran and the repository stayed private. Put to the user.

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
{"id":"p10","count":2,"last":"2026-11-12"}
```

- **Proposed resolution:** the coordinator writes the count and the change rides
  the next `mirror-sync`, so the public copy lags slightly.
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
  - 2026-11-12: the admin team itself, in its ledger: after its restart it wrote its own entries’ `ts` by hand from 17:48Z on, and the stamps ran up to 23 minutes ahead of the clock (19:00Z written at 18:37Z); the scheme’s working copies cited two of those stamps as decision times. Requests’ arrival stamps, taken from the transcript, were right. Corrected by a `ledger-correction` event with the true times from the session transcript; from then on every `ts` is read from `date -u`.
  - 2026-11-12: KotlinBottools #25: the stage event closing the second stage carried `at` 21:45:14Z, the clock at the report; the run’s own report in the same event says the stage ended at 21:44:16Z. The arrival check kept it (28 seconds before arrival), so the board records the stage’s end 58 seconds late. The run kept the true reading and named it; a retime waits on the user.

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
{"id":"p24","count":2,"last":"2026-11-12"}
```

A run learns that research has ended only when its planning agent returns, which is after the plan is written. It sends `researched` then, with the time the research ended. That time is more than 2 minutes before the event's arrival, so the arrival check (`apply-event.js --arrived`) replaces it with the arrival time. The next event, `plan-accepted`, sent in the same moment and holding a time a few seconds earlier, then falls before it: the board shows research running through the whole of the plan's writing, and the plan's visit takes bounds that match no event.

- **Resolution (decided by the user, 2026-11-11):** the planning agent sends `researched` itself at the moment the research ends, as it sends the other research events, so the event is never sent late; the arrival check stays as it is. The board of the encounter is corrected to the time the run read. (Loosening the check for an event's own time, as for open-point times in p19, was not chosen.)
- **Predicted:** the admin team, on encountering it, 2026-11-11.
- **Encounters:**
  - 2026-11-11: KotlinBottools #24: `researched` read at 19:42:46Z and sent with `plan-accepted` at 20:17:33Z; it was stamped 20:17:33Z, and `plan-accepted` holds 20:17:03Z.
  - 2026-11-12: KotlinBottools #25: the event closing the pre-flip gate, read at 22:19:35Z, arrived at 22:21:55Z, after the run had sent its visibility request (22:20:15Z); it was stamped 22:21:55Z, so the board records the gate’s end 140 seconds late and the next stage’s start after its first request. Here the run could have sent the event before going on.

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
