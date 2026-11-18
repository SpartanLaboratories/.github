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
  - 2026-11-09: a rehearsal repository’s creation; cleared under a narrow
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
{"id":"p9","count":31,"last":"2026-11-18"}
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
  - 2026-11-14: a direction manager's read-only grep over the installed Claude Code
    binary was refused by the auto mode classifier as "[Undermining Oversight]"; added as
    "A read-only search of the Claude Code binary is refused as [Undermining Oversight]".
  - 2026-11-14: the session archive was found unable to remove a deleted team session's
    Remote Control entry on claude.ai, which the user had expected it to; the Coordinator
    said at the console it would log it as an issue met, and it was logged later; added as
    "The session archive cannot remove a session's Remote Control entry".
  - 2026-11-14: a run's implementation-stage event reached the fast path while the fill
    behind its plan-accepted was still writing the rows' verdicts, and the board's check
    failed; added as "A stage-end event arrives before the fill behind plan-accepted has
    written the verdicts".
  - 2026-11-14: a direction manager's read-only PowerShell read of a user-level environment
    variable was refused by the auto mode classifier as "[Undermining Oversight]", a case none
    of the entries for refused reads holds; added as "A read-only PowerShell read of the machine's
    configuration is refused as [Undermining Oversight]".
  - 2026-11-14: a mirror-sync's executor wrote in the standing checkout of the organization
    repository, and its cleanup there was refused by the auto mode classifier as "Destructive
    or Unwanted Actions"; added as "A mirror-sync's executor writes in the standing checkout,
    and its cleanup there is refused as destructive".
  - 2026-11-14: the direction manager's placement of a settings file the user had approved
    for the team's folder was refused by the auto mode classifier as "[Undermining Oversight]",
    a case neither the entry for [Self-Modification] nor the entries for refused reads holds;
    counted late; added as "Placing a user-approved settings file of the team's is refused as
    [Undermining Oversight]".
  - 2026-11-15: the direction manager's after-edit write pass of the rule checker, run from the
    standing checkout of the organization repository, was refused by the auto mode classifier as
    "[Destructive or Unwanted Actions]", a case neither the entry for a mirror-sync's executor
    writing in the standing checkout nor the entry for [Self-Modification] holds; added as "The
    direction manager's after-edit write pass of the rule checker is refused as destructive".
  - 2026-11-15: a deny rule lifted for a temporary grant in the launcher's settings file was
    found still listed in the team folder's project-local settings file, a case neither the entry
    for a push a grant covers being denied nor the entry for placing the team's settings file
    holds; added as "A deny rule lifted in the launcher's settings file stays in force through the
    team folder's project-local settings file".
  - 2026-11-15: a member's command ran past the harness's limit and was moved to the background, and
    once a job's turn ended with such a command still running, so its report never came, a case no
    entry holds (the entry for a member's refused stop is about stopping one); added as "A member's
    command runs past 180 seconds and the harness moves it to the background". Counted late.
  - 2026-11-15: a code-only graph refresh replaced 256 model-made community names with hub-derived
    ones where nine had been forecast, a case no entry holds; added as "A code-only graph refresh
    replaces model-made community names with hub-derived ones".
  - 2026-11-15: the executors of consecutive mirror-syncs ran the internal-names scan in different
    ways, a case no entry holds; added as "A mirror-sync's internal-names scan is run differently from
    one executor to the next".
  - 2026-11-17: a graphify hook rebuild launched by a post-checkout hook stopped partway, leaving its
    lock file on disk and the graph's stamp behind, a case no entry holds (the entries for a member's
    background process and for a refused process query are about stopping or finding one); added as
    "A graphify hook rebuild stops partway and leaves its lock file behind".
  - 2026-11-17: the graphify manager's compound command running the hooks installer, an action a
    standing allow line covers, was refused by the auto mode classifier as "[Destructive or Unwanted
    Actions]", a case no entry holds (the entry for a destructive action is about a temporary grant's);
    added as "An action a standing allow line covers is refused by the auto mode classifier when sent
    inside a compound command".
  - 2026-11-17: the Presenter's verification of a staged dashboards skill failed a different event case in
    each of four full runs while other presenter jobs ran beside it, the cause given being shared temp files
    and stand-in team state, a case no entry holds (the entry for a board write on Windows is about a refused
    rename, the entry for a command past 180 seconds about the harness's move); added as "The skill's
    verification shares its temp files and stand-in team state with other jobs running beside it".
  - 2026-11-17: a Presenter's helper script copying the global direction documents, a staged landing package's
    files and a clone of the organization repository into a scratch tree, to run the rule checker over the whole
    set, was refused by the auto mode classifier as "[Destructive or Unwanted Actions]", a case no entry holds (the
    entry for the direction manager's write pass is about that pass run from the standing checkout, the entry for a
    rule check in a scratch clone about what it leaves unread); added as "A read-and-copy into a scratch tree, to run
    the rule checker over it, is refused as destructive".
  - 2026-11-17: an archive job's bash heredoc writing its summary's working file into the archive's `work/` folder was
    refused by the auto mode classifier as "[Destructive or Unwanted Actions]", a case no entry holds (the entry for a
    subagent's Write of a working file is about the Write tool's refusal and, in its attempts, a heredoc's parse error);
    added as "An archive job's shell write of its summary's working file is refused by the auto mode classifier as
    destructive".
  - 2026-11-18: the dashboards skill's full verification, run alone in a private scratch, failed in two of three runs, a
    different group each time, a case no entry holds (the entry for the verification sharing its temp files and stand-in
    team state is about runs beside other jobs, which its private-scratch resolution answers; the entry for a board write on
    Windows is about a refused rename in one case); added as "The skill's full verification fails a different group from
    run to run when run alone".
  - 2026-11-18: a run's first board event failed on the fast path because a board it seeds, not the run's own, broke a board
    rule placed after that board was committed, a case no entry holds (the entry for a dashboards rule change reaching a
    closed board is about which boards the standing rule covers, the entry for the widened internal-names list about the
    commit scan); added as "A board rule placed after boards were committed fails the next event that writes or seeds one".
  - 2026-11-18: in the same incident, a landing's pending view copies of two boards were found behind two later docs
    landings that had edited the tracked boards, which the next seeding would have written over them, a case no entry
    holds (the entry for a board rule placed after boards were committed is about a rule the boards break, the entry for
    a history rewrite about a copy left unseeded); added as "A landing's pending view copies fall behind a later landing
    that edits the tracked boards, and the next seeding undoes its changes".

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
{"id":"p25","count":3,"last":"2026-11-16"}
```

The board scripts write a board file by writing a temporary file and renaming it over the old one. On Windows the rename is refused (`EPERM`, `EBUSY` or `EACCES`) while another process has the old file open. The scripts retry a refused rename: for 3 seconds until 2026-11-12 (0.5 seconds in `apply-state.js`), for 15 seconds with growing, uneven pauses since (`renameInto()` in the dashboards skill's `plan/scripts/lib.js`). When the retries run out the write fails with the old file intact, nothing half written, and the event is not applied.

What was measured (the presenter, 2026-11-11 and 2026-11-12): a reader that reopens the file every 2 ms kept one rename refused for 11 seconds in one run, mostly for under 0.6 seconds, and once for the whole 15 seconds; a reader that opens it every 20 ms held a rename for at most 17 ms over 60 writes. The live board re-reads its data every few seconds. The cause of the long refusals is not proven. The skill's verification meets the failure in its case "event and fill at the same time", whose reader reopens the file in a tight loop: 5 of 25 runs, with either budget.

- **Proposed resolution (not decided).** Three options, which can be combined:
  - **(a) Retry only.** Installed on 2026-11-12 as a plain defect fix. The file is always there, old or new. It does not cure the verification's case.
  - **(b) Move the old file aside.** After about 1.5 seconds of refusals, move the old file aside, move the new one in and delete the old one. The verification's case then passed 20 of 20 runs, the fallback used 6 times. The content is still never half written, but a reader that does not hold the boards' lock can find no file at all for a moment (once in 963 reads). The rules' sentence that every file is written through a temporary file and a rename (`plan/RULES.md` and `system/RULES.md` of the dashboards skill) would need a clause saying so. It changes what a reader can rely on, so it is the user's decision; it is kept as an experiment outside the skill.
  - **(c) Pace the verification case's reader** as a live reader is paced (about every 20 ms). It keeps what the case proves: hundreds of reads still fall between the writes, so a half-written read would show, and "no write lost" does not depend on the reader. Stable as measured, not proven.
- **Resolution (a skill defect, fixed at the presenter's discretion on 2026-11-18, in its diagnosis for the entry "The skill's full verification fails a different group from run to run when run alone"; the user decided nothing):** the cause of the long refusals, unproven above, was found: the writer's retries slept, a sleeping process on Windows wakes on the system timer tick (about 15.6 ms), and a reader that reopens the file every few milliseconds wakes on the same tick, so each retry met the reader until the 15-second budget ran out, with `EPERM`. Reproduced outside the verification at 4 of 60, 6 of 150 and 7 of 150 writes, each failing after about 15.2 seconds. `renameInto()` now, after each pause, tries the rename every 0.2 to 0.5 ms for a random 2 to 6 ms with a busy wait, so a retry lands where the reader has let go; the write stays a temporary file and a rename, and the budget stays. After it 0 of 150, 0 of 300 and 0 of 300 writes failed, the slowest taking 21 ms, and the verification, its case "event and fill at the same time" included, passed in three full runs in a row; a new case group in the atomic-write cases holds it. The Presenter names this the race that those cases' header had accepted as "may still fail now and then". It settles the failures of this entry's case as measured, and refines (a), the retry; (b) and (c), neither decided, stay as recorded, whether either is still wanted being the user's. Not settled by it: whether the live encounter of 2026-11-16 was this race, its error naming no operation and a file under `.live/` rather than a rename being held (the Presenter counts live board writes as exposed to the race generally). Mirrored in commit `4edad5b`. As the Presenter reported it, not re-run by the Coordinator nor re-read by the Archivist.
- **Predicted:** the presenter, from the skill's verification, 2026-11-11. The two encounters of 2026-11-15 are the verification's, in a job whose pass it blocked; the first in live work is that of 2026-11-16.
- **Encounters:**
  - 2026-11-15: a skill-fix job's full template verification on its staged copy: the case "event and fill at the same time" failed, 6 of 8 cases, two of six rounds' fills refused on the rename of the temporary file onto `plan.json` ("operation not permitted"), every file put back. The pass could not be recorded, and the job's template change stayed staged.
  - 2026-11-15: the same job's second full run: the same case failed, 7 of 8 cases, on the same rename. Run alone on the files from before the change, the case failed 4 of 15 times, so the failure does not rest on the change (a measurement, not counted as encounters). The job's account of the live risk: a live fill or event fails this way only if the file is held for the whole 15 seconds of retries, and then exits failed with every file put back, and running it again works.
  - 2026-11-16: the first in live work, and on a different file: KotlinBottools #42, a step event (S0.pins) applied to the issue board, then the regeneration of the live repository work board (`board.js --live`) failed with Windows code 5 (access denied) while a fill of the same board, just started, held a file under its `.live/` folder; not `plan.json`. The error names no operation, so that it was the rename is not established. The event raised again 31 seconds later applied clean.

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
{"id":"p37","count":4,"last":"2026-11-14"}
```

A member starts a long search or script in the background, finishes its job without it, and tries to stop it. The permission system refuses the stop, and the process keeps running after the member has reported. The team cannot stop it for the member: doing what a member was refused is the member's refusal carried around the permission system.

- **Proposed resolution:** the team checks, read only, whether the process is still running, and tells the user what it is, what started it and its process id; it stops it only at the user's word at the console. A process the team's own shell started is the team's to stop. Members are briefed to run searches in the foreground with a bounded pattern.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: the Archivist's first backlog run left a search over the ledger running (a pattern with two wide repeats on very long lines); its stop was refused as interfering with workloads. Put to the user at the console.
  - 2026-11-13: the executor of a mirror-sync started an empty script in the background by mistake; its stop was refused, and the process was still running when it reported. Checked read only and told to the user at the console with its process ids.
  - 2026-11-13: the graphify manager’s code-only refresh of a second repository left a check command running in the background (it called python with no path, which hung); the member has no tool to stop it, so no stop was tried or refused. Checked read only and told to the user at the console with its process ids.
  - 2026-11-14: an Archivist job's first edit command was built wrongly and started python reading a script from empty input, which hung in the background and outlived the job. The member tried no stop, could not tell which of two running python processes was its own, made the command's fallback edit harmless, did its edits by hand and reported it. The Coordinator did not query the process list, whose reads are refused, and stopped nothing; told to the user at the console, asked whether to stop it.

## A destructive action a grant covers is denied by the auto mode classifier

```json
{"id":"p38","count":3,"last":"2026-11-17"}
```

The executor runs a destructive action under a temporary grant (first a plan's push, as one shell holding the plan's procedure; since 2026-11-17 also a deletion of an issue), and the session's auto mode classifier denies the call before anything runs. The grant's section in the permissions file does not reach the classifier, and lifting a deny rule in the settings file does not either: the two are separate checks. The reason's wording varies: "[Git Destructive]" on 2026-11-13, "[Destructive or Unwanted Actions]" on 2026-11-15 and 2026-11-17. A less destructive action under its own grant may run clean with no allow line: on 2026-11-17 a close of an issue did, in the same minute as the refused deletion.

- **Proposed resolution:** the rule for a refused action under a grant (`agents/admin-team/GUIDANCE.md`, Gates and standing grants, Temporary permissions, **Allow lines**): nothing else is tried; one `autoMode.allow` line for that action, naming the repository, the exact command, the request's `id` and the job, is placed by the direction manager or staged for the user to place; the team restarts and runs the same `id` again with `attempt + 1`. A job with more than one such action meets the refusal once per action unless the user places the lines together.
- **Later fact (2026-11-15, no encounter):** for the second encounter the user chose three lines, one per push, and, since the team ran in the desktop app, had them go into the user's global settings file rather than the team's own files; the direction manager's placing of them in the launcher's file had been refused (the entry "Placing a user-approved settings file of the team's is refused as [Undermining Oversight]"), and the user placed them by hand. The same push, run again about three minutes later with no restart of the team, ran clean, and the job's other two pushes ran once each. So in a session run in the desktop app an `autoMode.allow` line in the user's global settings file was read without a restart, where the rule above has the action run again only after one. The lines were removed from that file when the job's section ended, on the issue's landing the same day. Where a line takes effect for a team started through its launcher was not tested.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: KotlinBottools #26, the push of one branch to the first of its two repositories, with an explicit lease, after the deny rule on that form had been lifted in the settings file without a restart. Nothing was pushed. Put to the user at the console with the line staged.
  - 2026-11-15: KotlinBottools #40, the first of the job's three pushes (the branches of BotTools, an explicit lease on each, after a dry run), under the section the user granted that day with the lift of the deny rule on that form of push. The executor matched the section and the request file's hash and made its one call, a shell run of the script built from the file's six procedure entries; the classifier refused it before it ran, with the reason "[Destructive or Unwanted Actions]". Nothing ran, no ref changed, nothing else was tried. The refusal's text names the classifier; the lift left standing in the team folder's project-local settings file is the entry "A deny rule lifted in the launcher's settings file stays in force through the team folder's project-local settings file", not this one. The direction manager stages the allow line, and the user is asked whether one line or the section's three are placed; the section's other two pushes meet the same check unless their lines are placed with the first.
  - 2026-11-17: the deletion of an issue in the organization's `.github` repository, under the temporary grant the user gave at the console that day. The executor matched the grant's section and made its one call, `gh issue delete` with `--yes`; the classifier refused it before it ran, with the reason "[Destructive or Unwanted Actions]". The issue still exists, and nothing else was tried. In the same minute a close of an issue in KotlinBottools, under its own grant, ran clean with no allow line. The team follows the **Allow lines** rule: the direction manager places one `autoMode.allow` line, then a restart at the user's word. The later fact above, an allow line in the user's global settings file read without a restart in a session run in the desktop app, bears on whether the restart is needed.

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
{"id":"p40","count":5,"last":"2026-11-17"}
```

The team checks, read only, whether a member's job left a process behind (the entry "A member's attempt to stop its own background process is refused" has it do so). The session's auto mode classifier denied a query of the running processes' command lines (PowerShell `Get-CimInstance Win32_Process`) with no reason given. It is neither an edit of the team's own files nor a member's attempt to stop its own process.

- **Proposed resolution:** as practised on the encounters: the one whose query is refused stops and tries no other route, and the user is told at the console. The Coordinator then reads the process list with `tasklist`, filtered on the image name, which is allowed, and states what it found in the next job's prompt. No standing route is decided.
- **Predicted:** the admin team, on meeting it, 2026-11-13.
- **Encounters:**
  - 2026-11-13: the Coordinator's query, made to confirm an Archivist job had left no process behind, was denied with no reason given and not retried another way; a process list without command lines showed one node process the team could not identify. Told to the user at the console.
  - 2026-11-13: the graphify manager's query, filtered on the graph tool's name and made in a code-only refresh of a repository after a landing to see whether a hook's rebuild was still running, was denied with no reason given; the member stopped and tried no other route. The Coordinator read with `tasklist` that no such process was running, and the refresh, run again as a new job, finished clean. Told to the user at the console.
  - 2026-11-13: an Archivist's query of the node processes, made at the end of a session archive job, after all its steps had passed, to identify one running node process it had not started, was denied with no reason given; it stopped and tried no other route. Told to the user at the console.
  - 2026-11-14: in a trial of a background session, a direction manager's job checking a background Claude session it had started made two read-only PowerShell `Get-CimInstance Win32_Process` queries, the first with the command line, the second with only the parent process id and creation date; the classifier refused both, giving the reason "[Undermining Oversight]". The job stopped and tried no other route. The job's brief from the Coordinator had not carried the known caution against querying the process list with PowerShell or `Get-CimInstance`.
  - 2026-11-17, about 05:5xZ: in a Presenter job in its skills lane, a Bash wait loop that polled `pgrep -f verify-templates` for the skill's template verification was refused by the classifier as "[Destructive or Unwanted Actions]", a reason none of the earlier encounters drew. The job's rules forbid querying the process list; the member called it its own error, tried no other process query and waited on the verification's log file instead. As the team reported it, not re-read by the Archivist.

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
{"id":"p50","count":4,"last":"2026-11-17"}
```

An archive job wrote its `summary.md` text to a file in the session scratchpad with the Write tool, to copy it into the archive folder after, as earlier archive jobs had been told to do. The Write tool refused the subagent's call with the message "Subagents should return findings as text". The harness keeps a subagent from writing report files with Write; a file that is the job's own output, such as an archive's `summary.md`, meets the same refusal when written as a working file this way. The Archivist's brief names no tool for writing `summary.md`.

- **Resolution (decided by the user at the console, 2026-11-14, "4a", to the question "a) the job writes through its own scripts, b) something else"; its form chosen by the user at the console, 2026-11-14, "a", to the question "a) a subcommand of the archive script that takes the summary from a file; b) Write to a file under the archive's `work/` folder then a move into place, written into the brief; c) a plain bash heredoc"; placed by a change of the Archivist's brief and the archive script, 2026-11-14):** the archive job writes its `summary.md` through its own scripts, not with the Write tool into the archive folder, in the form "A new subcommand of the archive script that takes the summary from a file." As placed: `archive.js write-summary <base folder> --summary <file>` writes the folder's `summary.md` from a file under the archive's `work/` folder, and refuses a summary `verify` would fail, with seven new tests (all the Archivist's tests pass); the Archivist's brief, at the archive mode's step 3, says to write the summary to a file under `archive/work/`, place it with the subcommand and remove the file after, `summary.md` being written only through the script.
- **Attempts:** on the third encounter, a bash heredoc carrying the whole summary failed twice, and the route that worked was the Write tool to a working text file in the archive's own `work/` folder, then a `mv` of that file into place as `summary.md`.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: an archive job: the Write tool refused the subagent's write of the summary text into the scratchpad ("Subagents should return findings as text"); the job wrote `summary.md` straight into the archive folder with bash heredocs and went on.
  - 2026-11-14: an archive job: the Write tool refused the subagent's write of `summary.md` into the archive folder itself, not only into the scratchpad, with the same message ("Subagents should return findings as text, not write report files"); the job wrote the file with bash heredocs. One heredoc of about 45 lines failed with a bash quote-matching error, and the same text split into three appends worked (cause not found). Resolution (a)'s direct write into the archive folder holds only for a bash heredoc, not for the Write tool.
  - 2026-11-14: an archive job: the Write tool again refused the subagent's write of `summary.md` into the archive folder itself. A bash heredoc carrying the whole summary then failed twice with a bash quote-matching error ("unexpected EOF while looking for matching quote"), though a short heredoc worked. The job wrote the summary with the Write tool to a working text file in the archive's `work/` folder and moved it into place.
  - 2026-11-17, about 17:46Z: an archive job, at step 3: the Write tool refused the subagent's write of the summary's working file into the archive's `work/` folder, the route the resolution places and the one that worked on the third encounter, with the message "should return findings as text, not write report files", as the team reported it. Before it, one bash heredoc failed on a shell parse error and wrote nothing, and another was refused by the auto mode classifier (the entry "An archive job's shell write of its summary's working file is refused by the auto mode classifier as destructive"). Nothing was retried by another route; the job stopped with the session's folder holding its extracted conversation and its metadata only, and nothing deleted. Earlier archive jobs, up to the same day, wrote their summaries this way. It was the team's first session run in the desktop app after a restart that day, shortly after the user applied an auto-mode environment setup to the global settings; neither is checked as the cause. As the team reported it, save the folder's contents and the empty `work/` folder, read by the Archivist.

## The team's session ends without a handoff while jobs are running

```json
{"id":"p51","count":3,"last":"2026-11-14"}
```

The admin team's session ends while background jobs it spawned are still running, and writes no handoff, so the handoff file stays the stale one from before. Neither the ledger nor the session's transcript records how it ended: the transcript holds no error record and no closing record. The first time, its last assistant turn ended normally and a task notification queued after it was never taken up; the second time, a model request had been sent on a subagent's hand-back with no reply recorded, and two more inputs queued after it were never taken up. The cause, as the user gave it, was a hardware issue on the machine.

- **Resolution (cause given by the user at the console, 2026-11-14, "The sessions end was a hardware issue", for the first two ends, and "2yes" to the question "was the 05:19Z session end the hardware fault again?" for the third):** all three session ends were a hardware issue on the machine; there is nothing to look into. Each time the user started the team again with "resume", and the new session recovered from the ledger and the subagent transcripts: each job running at the end was marked `interrupted` and requested again with `attempt + 1`, told to check what the earlier attempt left; a job whose report had been delivered before the end was recorded `done` from its transcript.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: the session ended after its last ledger line at 01:35:11Z (transcript last written 01:38:07Z) with three jobs running; the next session resumed all three as attempt 2.
  - 2026-11-14: the next session ended after its last ledger line at 01:56:34Z (transcript last written 01:57:02Z) with seven jobs running, two of which had already delivered their reports; the next session recorded those two from their transcripts and resumed the others, three of them for the second time.
  - 2026-11-14: a later session ended after its last ledger line at 05:19:28Z with three jobs running: a presenter rule change that had staged its files and placed nothing, an artifact test, and a hook's viability question. Its handoff, written at 04:06Z with two additions to 04:10Z, was not updated in the hour after. The next session, started at 05:28Z on the user's "resume", recorded the three stopped and requested each again as attempt 2, told to check what attempt 1 left. The cause, given afterwards by the user, was the same hardware issue (the resolution above).

## A prepare-landing sync is refused by an uncommitted implementation-stage stamp

```json
{"id":"p52","count":1,"last":"2026-11-15"}
```

When the default branch has moved since the branch was cut, the uncommitted implementation-stage stamps in the run's worktree can make git refuse the `prepare-landing` merge with "local changes would be overwritten". It did not come up for WebTools #69, because the default branch had not moved. The first encounter met the same refusal over other uncommitted generated board output the fast path writes during a run (tracking boards' re-embeds and the repository work board), not over a stamp; it is counted here, since the refusal and the proposed resolution are the same.

- **Proposed resolution:** a) drop the implementation-stage stamp output before the sync, since the state-boards task rebuilds it anyway (recommended); b) leave it as it is.
- **Predicted:** the direction manager, 2026-11-07.
- **Encounters:**
  - 2026-11-15: KotlinBottools #39's `prepare-landing`: main had moved since the branch was cut (to `8b06da7`, with `ca392e0` re-rendering the boards), and `git merge origin/main` was refused, "local changes would be overwritten", over five uncommitted generated board files in the run's working tree that main had also changed: the `dashboard.html` of the #27 and #2 tracking boards, and `docs/plans/board.js`, `board.json` and `index.html`. Nothing was changed by the refused merge. The executor saved copies of the five, restored only those to HEAD, fast-forwarded the branch to `8b06da7` and pushed; the Presenter then rebuilt the five on the current template from the merged state, uncommitted, for the run's document-landing commit, and all checks passed. In substance option a), which the user has not decided. Logged late.

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

## A read-only search of the Claude Code binary is refused as [Undermining Oversight]

```json
{"id":"p56","count":1,"last":"2026-11-14"}
```

A member whose job needs to know how Claude Code itself behaves (how a variable it sets is built and read) searches the installed Claude Code binary read only, with a Bash grep, and the session's auto mode classifier refuses the call, giving the reason "[Undermining Oversight]". It judges each call: an earlier grep over the same binary in the same job was allowed. It is neither an edit of the team's own files (the entry "An edit of the team's own files is refused as [Self-Modification]") nor a query of the running processes (the entry "A read-only query of the running processes is denied"). Not checked: what in the second call drew the refusal and not the first, and whether any read of the binary is reliably allowed.

- **Resolution (decided by the user at the console, option b, 2026-11-14, "3b"):** no standing rule: a job whose read is refused stops, tries no other route and reports, and the user is told at the console, as happened on the encounter. Option a, jobs working from the changelog and documentation instead (the one recommended), and option c, the user stating that such reads are allowed, were not chosen.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: a direction manager's assess job, on its second attempt, grepped the installed Claude Code binary to find how the `AI_AGENT` variable is built and read; the classifier refused the call as "[Undermining Oversight]", where an earlier grep over the same binary in the same job had been allowed. The job tried no other route and drew on its first attempt's transcript instead.

## The session archive cannot remove a session's Remote Control entry

```json
{"id":"p57","count":1,"last":"2026-11-14"}
```

Each relaunch of the team leaves an offline Remote Control entry named "admin team" on claude.ai (twelve at the last count). The user had expected the Archivist to remove a session's entry when it deletes the session. It cannot: `delete-session.js` removes only local stores, and no CLI or API removes a Remote Control entry, which the team's research found on 2026-11-14. The ambiguity these entries cause for a message to the bare name is the entry "A message to the bare name "admin team" is refused as ambiguous", where the user settled sending to the live record's socket; this entry covers only the entries left standing.

- **Resolution (decided by the user at the console, 2026-11-14, "c", to the question "a) You remove the offline entries by hand in the app; b) Each archive job's report says which entries it left standing; c) Both"; part b placed by a change of the Archivist's brief, 2026-11-14):** both: the user removes the offline entries by hand in the app, which is the user's own; and an archive job's report says, for each session it deletes, that its Remote Control entry is left standing, named by the session's title and span from its `meta.json`, and, for remains, which hold no title, says so. As placed, the brief's archive step 7, its "What a deletion removes" and its Report bullet carry this. The entry's link is settled by the next line. Not checked by the Archivist: the research's finding that no CLI or API removes an entry, and whether the app offers removal of an offline entry.
- **Resolution (decided by the user at the console, option a, 2026-11-14, "a", to the question "should an archive report give each Remote Control entry's link? a) Yes: the extract script copies the link into the archive's record; b) Yes: the Archivist reads it from the transcript by hand before deleting; c) No: title and span only"; placed by a change of the extract script and the Archivist's brief, 2026-11-14):** the extract script writes the session's Remote Control links into the archived session's `meta.json`, as `remoteControlLinks`: each link once, in transcript order; an empty list for a session with none; null for remains. An archive job's report names each entry it leaves standing by its link, with the session's title and span, and by title and span alone where the record holds no link (the sessions archived before this change, and remains). As placed, the brief's archive step 7, its "What a deletion removes", its `meta.json` bullet and its Report bullet carry this, with new tests for the script. The link stays in the local archive only. Not established: whether a resumed session gets a second link, and whether an offline entry's link still opens it in the app.
- **Later facts (2026-11-15, bearing on the resolution, not a resolution):**
  - Six throwaway background sessions of a trial, started with `--bg` and stopped with `claude stop`, all left the session list on claude.ai: the user's observation at the console, six of six. A background session stopped by that command leaves no entry standing, so the entries left standing come from sessions that ended another way. `claude stop` and `claude rm` take a background session's id; a team session that has already ended no longer exists locally for them.
  - A session started in an ordinary console window, without `--bg` and with Remote Control, that kept the child-session mark among its inherited variables is listed on claude.ai on its own, not nested under the session that started it, replied ready and showed Remote Control active, the user observed; it left no local session record.
  - Still not checked: whether the app offers removal of an offline entry.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: the user expected the session archive to clean up the offline "admin team" Remote Control entries when it deletes a session; the team's research found no CLI or API that removes one. The Coordinator said at the console it would log this as an issue met, and it was not logged until later.

## A stage-end event arrives before the fill behind plan-accepted has written the verdicts

```json
{"id":"p58","count":1,"last":"2026-11-14"}
```

A run's `plan-accepted` is applied on the fast path at once, and the fill behind it (the Considered and Verdict columns, from the plan and the consequences) runs after it in a fill lane. When the run's first implementation stage ends while that fill is still running, the implementation-stage event would set the board's status to building, and the board's check then requires each row's verdict ("the verdict is required: its statements, each ending with the plan reference it rests on"), which the fill has not yet written. `apply-event.js` reports the event as not applied ("the presenter applies it") and leaves the board as it was. The team's brief has the fast path apply at once during a fill, and a failed event raised again after the Presenter fixes the cause; it does not say that a stage's end waits for the plan's fill. Step-complete events keep applying meanwhile.

- **Resolution (decided by the user, 2026-11-14, option c):** the fast path writes the verdict statements itself when the plan is accepted, so a stage's end has nothing to wait for (not the team's recommendation, which was to hold stage-ends during the fill). Placed on 2026-11-15 with the next line; the team held every stage-end event while the fill behind `plan-accepted` ran until the hold was narrowed that day (the line on the hold below).
- **Resolution (decided by the user at the console, 2026-11-15, "a", to the question where the verdict statements the fast path writes come from; placed the same day by changes of direction documents):** the run sends the verdict statements. `plan-accepted`'s facts carry each row's verdict statements with their plan anchors, and the options where the Considered column is not yet written; the fast path writes them, and the fill behind it only enriches. This refines the resolution of 2026-11-14 above, which stays: that one did not say where the statements come from, and could not be built without it. As placed: the board side by the Presenter, its scripts and rules placed at 22:02Z (the fast path reads `facts.verdicts` at `plan-accepted` and writes each named row's verdict and, where the row holds none, its options, whole or not at all; without it the event applies as before; a row the facts miss or that fails is left to the fill), with the seven open choices of its draft left to the Presenter at the user's word ("The presenter can make the calls on the rest of these, i will correct if i see something wrong on the live board"), each made as the draft recommended; the pipeline side by the direction manager at 22:19Z (the protocol's `verdicts` fact, the run skill's `plan-accepted` step and the planner's board verdicts block, and one clause in the team's brief). From then on a run that reaches `plan-accepted` sends the verdicts. Known gap the board side reported: a `plan-accepted` raised again after later events can name a reworded row as differing, in a note only.
- **Resolution (decided by the user at the console, 2026-11-15, three answers "a" to the direction manager's points once both sides were placed, and placed the same day by changes of direction documents):** (1) the hold is narrowed and written into the team's brief (Board-fill lanes): an implementation-stage event that ends a stage waits only on an issue board whose `plan-accepted` left rows to the fill, or sent none, while that fill runs, and is raised again in order with its own time once the fill reports; a board whose acceptance left nothing to the fill, and a tracking board, hold nothing. The interim hold the team kept until then ended with it, and the Presenter's own rules were brought into line. (2) When a run's `plan-accepted` leaves rows to the fill, the team's reply names those rows and why (the brief's Fast path bullet). (3) A run that verifies an existing plan sends the block too: the planner ends that report, and each report after the edits the user agrees, with the board verdicts block (the planner's brief and the run skill). Options set aside: ending the hold, or keeping it on every board; not naming the rows left; leaving a verified plan's board to the fill. The placed changes of this and the line above are in the mirror at `f62c6c5`, `d092ff2`, `da156ef` and `ccba0c0`.
- **Resolution (decided by the user at the console, 2026-11-16, "A"; decided, not yet placed):** when a run verifies an existing plan that leaves a board row alone and has no section the verdicts block can cite for it, the missing section becomes one of the verification's recommended additions, put to the user like the others, and the block cites it once added. Option b, that row left to the fill with no entry, was not chosen. Queued for the direction manager, to be placed in the planner's brief with a mirror-sync after it.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: a run's `plan-accepted` was applied on the fast path at 07:09Z and its fill started in a fill lane; the branch-cut applied at 07:10Z; the implementer's first stage ended at 07:13:03Z and its implementation-stage event arrived at 07:13:45Z, with the fill still running. The check failed on six rows lacking a verdict; the event was not applied and the board stayed at status planned with the first stage current. The Coordinator held that event, and the next stage's end which arrived a minute later, to raise them again in order, with their own times, once the fill has finished; step-complete events kept applying, one for a stage not yet current kept for it. The run was told its events wait and need no resend.

## A read-only PowerShell read of the machine's configuration is refused as [Undermining Oversight]

```json
{"id":"p59","count":3,"last":"2026-11-18"}
```

A member, or the Coordinator itself, makes one read-only PowerShell call to learn a fact about the machine's own setup (a user-level environment variable, the installed desktop app's package and start-menu entry), and the session's auto mode classifier refuses it, giving the reason "[Undermining Oversight]". It is neither a query of the running processes (the entry "A read-only query of the running processes is denied"), nor an edit of the team's own files (the entry "An edit of the team's own files is refused as [Self-Modification]"), nor a search of the Claude Code binary (the entry "A read-only search of the Claude Code binary is refused as [Undermining Oversight]"), though it draws the same reason as the last. Both encounters are kept in one entry: the same kind of call, a read-only PowerShell read of the machine's configuration, drew the same reason. Not checked: what in each call drew the refusal, and whether the same read by another route (the shell's own variable, a file read) is reliably allowed.

- **Resolution (decided by the user, 2026-11-14):** keep it so: the one whose call is refused stops, tries no other route and reports the call and the reason, and the user is told at the console; no standing route.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: a direction manager's job in the rule rework made one read-only PowerShell call reading the user-level value of `SPARTAN_ORG_POLICIES`; the classifier refused it as "[Undermining Oversight]". The job did not need it (the shell variable was set) and tried no other route; its report names the refusal.
  - 2026-11-14: the Coordinator's own call ran PowerShell `Get-AppxPackage` and `Get-StartApps`, filtered on the desktop app's name and read only, to learn its package name, install location and start-menu id for a script the user had asked for; the classifier refused it as "[Undermining Oversight]". The Coordinator tried no other route; the fact was not needed in the end.
  - 2026-11-18: in the Presenter's job diagnosing the dashboards skill's flaky full verification (the entry "The skill's full verification fails a different group from run to run when run alone"), one read-only PowerShell call reading the machine's antivirus status and exclusion paths (`Get-MpComputerStatus`, `Get-MpPreference`), to learn whether real-time scanning was on; the classifier refused it: "Permission for this action was denied by the Claude Code auto mode classifier. Reason: [Undermining Oversight]". Made some time between about 00:35Z and 02:59Z, the report not saying when. The Presenter tried no other route and its report names the refusal; its fix did not depend on the answer. The Coordinator told the user at the console, as the resolution says. As the team reported it, not re-read by the Archivist.

## A commit that carries a landed document or a closed board holding a phrase the widened internal-names list now lists is blocked by the scan

```json
{"id":"p60","count":0,"last":null}
```

Section 2 of the internal-names list, the approval flow, was widened on 2026-11-14 to every form the boards' scan matches, and the commit scan reads every line of each file a commit carries. A file that landed before the widening and holds such a phrase therefore stops the next commit that carries it, though none is in a commit yet. Known holders:

- Three closed WebTools boards carry "it is signed off by the user" in their embedded renderer: `docs/plans/38-handshake-empty-name/dashboard.html:2394`, `docs/plans/55-http-client-stack/47-java-23-bytecode/dashboard.html:1807`, `docs/plans/55-http-client-stack/61-build-logic/dashboard.html:2427` (WebTools `master` at `b62e2af`; the three issues closed, the boards kept as they closed). A later commit that carries one of them again, a re-embed or a seeded copy, would be blocked on that line.
- The dashboards skill's example board (`skills/dashboards/plan/examples/38-handshake-empty-name/dashboard.html:3265`) and template snapshots under `skills/dashboards/verify/history/dashboard/` hold the same sentence: 15 of them read on 2026-11-14, where the report that found them counted 16.
- Landed documents with finds under the widened list, counted when the list was drafted: in MyGameTools #77's landed documents, 36 new finds and 9 that were finds already.

- **Resolution (decided by the user at the console, 2026-11-14, "a", to point D, landed documents with finds, of the question on the widened list):** a find in a landed document takes the existing exception route: a one-off pass from the user the first time it blocks, and a question about a standing row if it recurs; no new rule (the entry "A library’s own name that matches a barred name stops a commit" holds that route). A rewording sweep and a new Allowed row were not chosen.
- **Not settled (a closed board the team itself generates):** the decision names landed documents. For a closed board, two rules meet: a find in a board the team generates is the team's to fix, and a closed board is kept as it closed. Which gives way is the user's choice when it is first met; nothing is decided here.
- **Predicted:** the admin team, on widening the list, 2026-11-14.
- **Encounters:**
  - None yet.

## A mirror-sync's executor writes in the standing checkout, and its cleanup there is refused as destructive

```json
{"id":"p61","count":1,"last":"2026-11-14"}
```

A mirror-sync carrying working-copy files of S, P or D is to place them, and run `rule-check.js --write`, in the copy being committed, never in the standing checkout, which is only pulled after the push (`agents/admin-team/version-control-manager.md`, Branching; `agents/admin-team/GUIDANCE.md`, the `mirror-sync` row). The executor placed and staged the files in the standing checkout instead and ran the checker's `--write` there, which the checker refuses, so the generated rule index was not regenerated and the diff no longer matched the one approved. It then tried to discard its own staged files with `git reset --hard HEAD` and `git clean` on the new folder, and the session's auto mode classifier refused the call as "Destructive or Unwanted Actions". The executor stopped there, as it should; nothing was committed, and the standing checkout was left dirty with the staged files, which holds back the pull every later mirror-sync ends with until it is cleared. Not checked: what led the executor to the standing checkout rather than the clone.

- **Proposed resolution:** options, for the user to decide:
  - a) Keep the existing rule and make it hard to miss: the executor never places a file or runs `--write` in the standing checkout, only in a fresh clone of `main`; the team's prompt for a mirror-sync names the clone's path, and the executor checks, before placing anything, that the standing checkout is clean and that its working directory is not it. On a refusal of a cleanup it stops, as here, and the user is asked at the console.
  - b) Clear such a checkout without discarding anything: redo the sync in a clone; once the commit lands with the same bytes, the standing checkout's staged copies match `origin/main`, and a pull (fast-forward) absorbs them, after a check that each staged file's bytes equal the landed ones; any file that differs is put to the user.
  - c) Both: a) to prevent it, b) as the way to clear a standing checkout found dirty this way. Recommended.
- **Predicted:** the admin team, on meeting it, 2026-11-14.
- **Encounters:**
  - 2026-11-14: the rule rework's seventh commit, seven organization-repository files: the executor placed them and ran `rule-check.js --write` in the standing checkout, which the checker refused; its cleanup there (`git reset --hard HEAD && git clean -fdq` on the new folder) was refused by the classifier as "Destructive or Unwanted Actions" and not worked around. Nothing committed; the standing checkout left with the seven files staged; the sync held for the user's word on clearing it.

## The direction manager's after-edit write pass of the rule checker is refused as destructive

```json
{"id":"p62","count":1,"last":"2026-11-15"}
```

The direction manager's brief has it run the rule checker's write pass, `rule-check.js --write --defer-policies`, after every edit to a rule file; the pass writes only in `~/.claude` and defers the policies' counts to the mirror-sync that carries the edit. Run with the organization repository's standing checkout as its working directory, the call was refused by the session's auto mode classifier as "[Destructive or Unwanted Actions]". It is not the entry "A mirror-sync's executor writes in the standing checkout, and its cleanup there is refused as destructive", where an executor wrote in the standing checkout and its cleanup there was refused, nor the entry "An edit of the team's own files is refused as [Self-Modification]", which draws another reason; here the direction manager's own write pass, writing nothing in the checkout, was refused while running from it. The read-only pass of the same checker ran. Not checked: what in the call drew the refusal (the working directory, the write flag, or neither), and whether the same pass run from another working directory is allowed.

- **Proposed resolution:** none decided. As practised on the encounter: the direction manager stops at the refusal, tries no other route, runs the read-only check, and reports the call and the reason; the user is told at the console. When an edited file is one the checker does not convert, as on the encounter, nothing is pending and nothing is lost; when a converted file is edited, the pending counts are left for the mirror-sync or for the user's word.
- **Predicted:** the admin team, on meeting it, 2026-11-15.
- **Encounters:**
  - 2026-11-15: the rule rework's edit of `CLAUDE.md` and the team's brief: after placing it, the direction manager ran the checker's write pass from the standing checkout, and the classifier refused it as "[Destructive or Unwanted Actions]". It did not retry by another route. Its read-only run printed "OK: 62 file(s), 239 id(s)". Both edited files are in the rule files' `notConverted` list, so the write pass had nothing pending and nothing was lost.

## Placing a user-approved settings file of the team's is refused as [Undermining Oversight]

```json
{"id":"p63","count":4,"last":"2026-11-17"}
```

The direction manager places a settings file for the team that the user has approved at the console, whole and as staged, and the session's auto mode classifier refuses the write, giving the reason "[Undermining Oversight]". It is the nearest to the entry "An edit of the team's own files is refused as [Self-Modification]", which holds changes to the team's settings and whose fallback (staged, the user places it) was followed, but that entry's refusals drew another reason, and its decided resolution covers temporary-grant edits of the existing settings file, not a new one; nor is it a read, as in the entries "A read-only PowerShell read of the machine's configuration is refused as [Undermining Oversight]" and "A read-only search of the Claude Code binary is refused as [Undermining Oversight]", which draw the same reason. Not checked: what in the call drew the refusal (creating the settings folder, writing a settings file at all, or the deny and allow rules it carries), and whether a standing `autoMode.allow` line would cover such a placement.

- **Proposed resolution:** as practised on the encounter: the direction manager stops at the refusal, tries no other route and leaves nothing half-placed; the team tells the user at the console with the commands to place the staged file by hand; the user places it and says done; the team checks the placed file's sha256 against the approved one and that its rules are in effect, then records the `config-edit`. Whether this joins the [Self-Modification] entry's resolution or gets a standing route is the user's to decide.
- **Later fact (2026-11-15, no encounter):** the same day, the direction manager's edits that undid the grant were not refused: the lift of the deny rule in the project-local settings file (placed earlier that day, also not refused), the deny rule's restore in both of the team's settings files, and the removal of the three lines from the global settings file, each a staged copy placed whole. Both refusals of 2026-11-15 were of adding allow lines; the refusal of 2026-11-14 placed a file with no auto-mode lines, so adding allow lines does not explain all three.
- **Predicted:** the admin team, on meeting it, 2026-11-14; counted late, 2026-11-15.
- **Encounters:**
  - 2026-11-14: after the team's session was moved into the desktop app, which dropped the launcher's settings, the user approved the drafted `admin-team/.claude/settings.local.json` (the launcher's settings and the agent, without the auto-mode lines); the direction manager's one Bash call creating the folder and copying the approved file there was refused by the classifier as "[Undermining Oversight]". No other route was tried and no folder was left. The team gave the user the commands at the console; the user placed the file by hand, its sha256 equal to the approved one, and said done; a `git reset --hard HEAD` in the team's folder was then refused by the permission system, so the deny rules were in effect without a restart.
  - 2026-11-15: the direction manager's placing of the staged three-line `settings.json` over the launcher's settings file, adding three temporary `autoMode.allow` lines the user had chosen for a grant's pushes, was refused by the classifier as "[Undermining Oversight]", despite the standing line that covers placing a temporary allow line (which a session run in the desktop app probably does not load: the direction manager's inference, not tested). Not retried; the matching copy for the project-local settings file was not attempted after it. The user then directed that the lines go into the global settings file instead.
  - 2026-11-15: the Coordinator's own call starting the direction manager on a job to put those three user-directed lines into the user's global settings file was refused by the classifier as "[Undermining Oversight]" before the job began; nothing was staged or placed, and nothing was tried after it. The user placed the lines by hand from a prepared copy, and the team checked its sha256. Counted here as the nearest entry, though the file was the user's global one and not the team's, and the refused call was the start of the job, not the write.
  - 2026-11-17: at about 02:51Z, under the **Allow lines** rule after the refused deletion of an issue in the organization's `.github` repository (the third encounter of the entry "A destructive action a grant covers is denied by the auto mode classifier"), the Coordinator's own call starting the direction manager in apply mode, to place one `autoMode.allow` line for that one deletion in the team's own settings file, was refused by the classifier as "[Undermining Oversight]" before the job began. The standing `autoMode.allow` line in that file (the user's standing decision temp-grants/standing-settings-allow, read there by the Archivist) covers exactly that edit, so the standing line did not carry the start of the job past the classifier; whether that line is read at all in a session run in the desktop app was not checked. Nothing ran and nothing was tried by another route; the deletion waits on the user. Counted here, as the third encounter was: the same refusal of the start of the job, now for the team's own settings file.

## A run taken up by a second session repeats the first session's request ids

```json
{"id":"p64","count":1,"last":"2026-11-15"}
```

A `/resolve-issue` run that a second session takes up under the same session name numbers its request ids from 1 again, so its requests repeat ids the run's first session already used, with the same attempt. The team's rule (its brief, How the team works, "The ledger is the truth") is that a repeat of a seen `id` with the same `attempt` gets the recorded reply re-sent, not a second execution, and the protocol has a request acted on at most once per `id` + `attempt`. Applied to the letter, each of the second session's requests would get the first session's recorded reply and nothing would run. It is not the entry "A restart's not-running stretch, taken from the ledger, misses what the run did between requests", which is about the bounds of `run-restarted`, nor "A stale repeat of a stage's closing event reopens a later stage", where the run itself sent an event again. Not checked: whether a run's handoff or the `resolve-issue` skill tells a session that takes a run up which ids the run has used.

- **Proposed resolution:** none decided. Options:
  - a) The `resolve-issue` skill has a session that takes a run up read the run's last request id, from its handoff or from a status reply, and number on from it.
  - b) The team's rule keys the at-most-once check on the sending session as well as the `id` and `attempt`, so a repeat from another session is a new request.
  - c) The team rejects a request whose `id` and `attempt` are already recorded from another session, naming the next free id, and the run resends under it.
  - As practised on the encounter: the team answered each repeated id as a new request where the sending session and the content differed, recorded it under a ledger key marking the second session, did not re-send the stale recorded reply, and told the run in its reply which ids are taken and to number on from one the team has not seen.
- **Predicted:** the admin team, on meeting it, 2026-11-15.
- **Encounters:**
  - 2026-11-15: KotlinBottools #40. The run's first session sent ids 1 (status, 12:08:32Z), 2 (setup-branch, 12:09:03Z), 3, plan-1 and 4 (halted, 12:50:06Z), then stopped; a second session under the same name sent 1 (a status with `restarted`, arrived 18:25:56Z) and 2 (a `resumed` board event, arrived 18:26:23Z), each with attempt 1. The team answered both as new requests (a status executes nothing; the `resumed` is another action than the setup-branch that used the id), recorded each under a key marking the second session, and told the run that 1 to 4 and plan-1 are taken. By the letter, the status would have been answered with the 12:08Z reply, which says no grant section exists (one had existed since 18:06Z), and the `resumed` with the setup-branch's reply and never applied, leaving the board halted. The team's helper for board events refuses a request whose id and attempt are already in the ledger, so the `resumed` was applied with the board's apply script directly.

## A mirror-sync's rule check in a scratch clone leaves another repository's files "not checked", and still passes

```json
{"id":"p65","count":1,"last":"2026-11-15"}
```

A mirror-sync runs its rule check in a fresh scratch clone of the organization repository, never in the standing checkout (the entry "A mirror-sync's executor writes in the standing checkout, and its cleanup there is refused as destructive"). The checker, `scripts/rule-check.js` in that repository, reads each other repository its register names from a sibling folder of the checkout it runs in, or from the folder a `SPARTAN_CHECKOUT_` variable named after the register's folder points at; a missing checkout makes that repository's files "not checked", which the checker states is no failure. A scratch clone under the worktree root has no such neighbours, so the files that live in another repository, and the ids that hang on them, go unread while the check prints `OK` with lower counts. It would let through a mirror-sync that changes a rule file tied to a file in another repository with that part unread. It is not the entry above, which is about where the executor writes, nor "The direction manager's after-edit write pass of the rule checker is refused as destructive", which is about a refusal. Not checked: how the two earlier mirror-syncs of 2026-11-15 reached the full count from their scratch clones (an override variable set, or the copy laid out differently; their results name a temporary copy the rule check used, and the team's prompts for them did not say).

- **Proposed resolution:** none decided. Options, the Coordinator's first reading, for the user to decide:
  - a) The team's brief for a mirror-sync's executor names the override variable and the other repositories' checkout folders, so a scratch clone's check reads everything, and a result with any "not checked" line is reported as a count that moved.
  - b) The checker treats "not checked" as a failure when run with `--write` for a commit.
  - c) The scratch clone is made beside the other repositories' checkouts instead of under the worktree root.
- **Later fact (2026-11-15, no encounter):** the mirror-sync after the encounter read everything from its scratch clone with no override variable (`OK: 62 file(s), 239 id(s)`), run with `--policies` and `--claude` only; the sync of the encounter had also set `SPARTAN_ORG_POLICIES` to the scratch clone, which is how the checker finds the organization repository's checkout and, beside it, the other repositories' checkouts (`rule-check.js` line 30). So the likely cause is that variable pointed at the scratch clone, not the scratch clone as such: the Coordinator's inference from the two runs' command lines, not tested.
- **Predicted:** the admin team, on meeting it, 2026-11-15.
- **Encounters:**
  - 2026-11-15: the mirror-sync of a one-line change to this tracker, in a scratch clone under the worktree root: the executor's rule check printed `OK: 61 file(s), 235 id(s), 10 not checked`, exit 0, where the two mirror-syncs before it that day had printed `OK: 62 file(s), 239 id(s)`; the ten notes named the SpartanUI checkout missing beside the scratch clone (its `docs/nomenclature/ui.md`, the UI vocabulary's home since that day) and the ids that hang on it. The executor reported the counts moved, and committed and pushed, the check having passed and the change being no rule file. The Coordinator then ran the checker read only on the standing checkout at the pushed commit: `OK: 62 file(s), 239 id(s)`, exit 0, nothing unchecked, so nothing wrong was pushed.

## A deny rule lifted in the launcher's settings file stays in force through the team folder's project-local settings file

```json
{"id":"p66","count":1,"last":"2026-11-15"}
```

The team's brief has a temporary permission's lift of a deny rule made in the launcher's settings file only (its Gates and standing grants, Temporary permissions, **Deny rules**: "a deny rule in the launcher's settings file"). Since 2026-11-14 the team folder also holds a project-local settings file, drafted and approved by the user when the team's session was moved into the desktop app, which does not start it through the launcher (the entry "Placing a user-approved settings file of the team's is refused as [Undermining Oversight]"), and that file carries its own copy of the deny list. A deny rule listed in any settings file a session loads applies, so a lift made in one file leaves the rule in force through the other. It is not the entry "A destructive action a grant covers is denied by the auto mode classifier", where the auto mode classifier, a check separate from the deny rules, refused a push after a lift. Not checked: which of the two files the running session loads now (it runs in the desktop app; the launcher's settings file may not be loaded at all, in which case its standing auto-mode lines are not in force either), and whether the rule's pattern would match the push's command line as the procedure words it.

- **Proposed resolution:** none decided. Options, the Coordinator's first reading, for the user to decide:
  - a) One source for the deny list: the team folder's project-local settings file drops its copy.
  - b) A lift and its restore cover every settings file the team's session loads, and the grant's record names each file changed, with the brief's **Deny rules** and **Allow lines** bullets and the standing line that authorizes such edits widened to match.
- **Resolution (the user's decision on where the team lives, 2026-11-16; settles option c only):** option c, "The project-local settings file is removed and the team is started through its launcher again.", is ruled out. The user decided the team lives in the desktop app, its launcher being only its cold start when no team is running; the direction manager reported that this rules the option out as a way to run the team. Options a and b stand, and nothing is decided between them.
- **Later facts (2026-11-15, no encounter; they settle the encounter's job, not the entry):**
  - For the encounter's job only, the user answered "a" to whether the rule is lifted in the project-local file too: lifted there at 19:12Z, beside the launcher's file, and restored in both when the job's section ended on the issue's landing; each file then equalled its copy from before the lift byte for byte. The three temporary allow lines the job needed went into the user's global settings file at the user's direction and were removed the same way. Every settings change for the grant is undone. None of the options above was decided; the rules' naming of one settings file for a lift, a restore or an allow line is noted for the hooks log, for the user to decide.
  - Which files a session run in the desktop app loads: the direction manager's reading, from the records and a cached changelog and not tested, is that `autoMode` is no longer read from a project-local settings file, that the launcher's settings file is read only when the team is started through its launcher, and that in the app only the user's global settings file's `autoMode` is read. An allow line in the global file did take effect there without a restart (the entry "A destructive action a grant covers is denied by the auto mode classifier"). Whether the deny rules of the launcher's file are in force in an app-run session is still not checked.
- **Predicted:** the admin team, on meeting it, 2026-11-15.
- **Encounters:**
  - 2026-11-15: KotlinBottools #40. The user granted the job's section with the lift of the deny rule on `git push --force-with-lease`, and the direction manager lifted it in the launcher's settings file, which then listed three deny rules. The run, checking its plan before its first push, found the rule still listed in the team folder's project-local settings file and asked the team to file an issue in the organization repository. The Coordinator read both files: the project-local one lists four deny rules, the lease-push rule among them, and has no auto-mode section. No push had been requested yet, so nothing was refused. The Coordinator put to the user whether the rule is lifted in the project-local file too for the job.

## A member's command runs past 180 seconds and the harness moves it to the background

```json
{"id":"p67","count":3,"last":"2026-11-16"}
```

A member's shell command that runs longer than the harness allows is moved to the background by the harness, which, by the Coordinator's account, does so after 180 seconds whatever timeout the call gives (not checked by the Archivist). The member's job then goes on without the command's output. When the member waits for it, nothing is lost; when the member's turn ends first, the command keeps running after the job, and a job whose report depended on it returns none. It is not the entry "A member's attempt to stop its own background process is refused", which is about stopping a process the member started in the background itself, though a command moved this way can leave the same kind of process behind.

- **Proposed resolution:** none decided. As practised: the team's job prompts tell members to start nothing in the background and to keep each command shorter than the limit; when a job ends with no report, the Coordinator reads the job's state itself and sends the job back to finish; a process left behind is checked read only and left to end on its own. Options, the Archivist's first reading, for the user: a) the working rule above written into the members' briefs, with long runs (such as a full template verification) split into parts that each fit; b) a member that finds a command moved to the background waits for it before its turn ends, written into the briefs; c) both.
- **Predicted:** the admin team, on meeting it, 2026-11-15.
- **Encounters:**
  - 2026-11-15: an Archivist job's read-only filesystem search ran past the limit and was moved to the background; the job reported with the search left in the background, and the search ended on its own: the Coordinator found no such process running four minutes later. Nothing was stopped. Counted late.
  - 2026-11-15: a Presenter skill-fix job's turn ended while its template verification of a staged copy, moved to the background after 180 seconds, was still running, so no report came back. The Coordinator read the job's state itself and sent it back to finish, which it did. Not counted: the same day's moves the member waited for (three suite runs in one build job, and this job's two full runs on its second go), which lost nothing.
  - 2026-11-16: a Presenter skill-fix job ran the dashboards skill's full template verification, about 12 minutes, twice in the foreground, as its prompt said; the harness moved both runs to the background after 180 seconds. Twice the member's turn ended on the harness's note that it was waiting on its own background work, and each time it resumed by itself when the run ended and delivered its report at the end: nothing was lost and the job was not sent back. The first run was invalid, the member having edited its staged set while it ran, and two of its failures came from that; the second, on the final set with no edits during it, passed 3339 of 3340 cases, the one failure passing when run again on its own. A restart of the desktop app the user had asked for was held about ten minutes until the job reported.

## A code-only graph refresh replaces model-made community names with hub-derived ones

```json
{"id":"p68","count":2,"last":"2026-11-16"}
```

A repository's knowledge graph names its communities either by a model, in a label pass, or after each community's hub node. A code-only refresh redoes the clustering of the whole graph and keeps a name only for a community whose member set is unchanged; every other community is named after its hub again, with no model. The missing-only form of the label pass names only absent or placeholder labels, so it does not rename hub-derived ones (read in graphify 0.9.82); only a full label pass does, at the cost of naming every community. So any code change that prunes or re-clusters a graph loses model-made names that only a full pass brings back.

- **Resolution (decided by the user, 2026-11-16):** hub-derived community names are accepted between label passes. The code-only refresh after every landing runs as the rule says and is not held when graphify renames communities after their hubs; a full label pass, which spends a model, runs only when the user asks for one. Not chosen: no refresh after a documentation-only landing; a label pass after every refresh that renames; a request to graphify's maintainers. The two refreshes held at the second encounter ran the same day, code only, with no model. No direction document changed: neither the team's rules for the graph service nor the graphify manager's brief said a rename after the hub stops a refresh; the hold at the second encounter came from the prompt for that job.
- **Predicted:** the admin team, on meeting it, 2026-11-15.
- **Encounters:**
  - 2026-11-15: the code-only refresh the user chose to remove board-file nodes from the graphs (no model spent, no label pass) renamed 256 communities after their hubs, 8 in OrganizationPage and 248 in WebTools, where the question put to the user had said nine mixed communities might be renamed: a forecast from a reading of graphify's code, wrong in scale. The user was told with the result and then chose a full label pass on both graphs, which restored model-made names to all 395 and 31 communities for about 467,000 tokens (WebTools about 383,000, OrganizationPage about 85,000).
  - 2026-11-16: the code-only refresh queued after a documentation-only landing in WebTools (pull request 103, two rule files deleted) ran with no model and pruned only the 10 nodes of the deleted files, none added and no source, test or build file's nodes changed: 10508 nodes, 36314 edges and 395 communities became 10498, 36306 and 381. graphify then renamed 216 communities by their hub and rewrote its label file, so 216 of the 395 model-made names of the previous day's full label pass were lost; the earlier label file stays in the refresh's dated backup folder and does not match the new community set. The same refresh of two more graphs was held on the user's answer, whether their names are model-made not read. As the graphify manager reported it, not re-read in the graph files.

## A mirror-sync's internal-names scan is run differently from one executor to the next

```json
{"id":"p69","count":1,"last":"2026-11-15"}
```

When the entry was made, the internal-names scan applied to a `mirror-sync` and read every line of each file it covered that the commit carried, not only the changed lines (`agents/admin-team/version-control-manager.md`, Executor mode, **Internal-names scan**; `agents/admin-team/GUIDANCE.md`, the same rule). The executors of consecutive mirror-syncs reported running it in different ways: read by eye against the list, a matcher over the added lines only, or with the method unstated. A scan of the added lines alone, or by eye, can miss a find in an unchanged line of a carried file that the rule has the scan read. Not checked: whether any carried file holds a find that a full read would have caught.

- **Resolution (settled by a change of the direction documents, 2026-11-16):** since the user's answers placed on 2026-11-16, the commit scan reads no file under `claude/` in the organization repository, whatever its kind (`nomenclature/finding.md`, R-10049 (Documents and boards), the row for `claude/**`: not read), so a mirror-sync's internal-names scan reads none of the mirrored files; the secret scan still reads every line of each file a mirror-sync commits (`agents/admin-team/version-control-manager.md`, Executor mode, **Secret scan**). For a file outside `claude/` that a mirror-sync carries, the executor's brief, as read on 2026-11-16, names one method: the finding tool's command over every file the commit carries, each read as the commit scan's rules say (the same brief, **Internal-names scan**). The options first put for the user (one method in the brief, the method named in each prompt, or both) are overtaken.
- **Predicted:** the admin team, on meeting it, 2026-11-15.
- **Encounters:**
  - 2026-11-15: four mirror-syncs of one change, run in a row: the first reported no find, with added lines naming a grade judged as rule text by design; the second, 0 finds, its method unstated; the third, 0 finds, "read against the list's Allowed section, no matcher run over every line"; the fourth ran the matcher over every added line. None reported reading every line of each carried file.

## A `landed` on a built board is refused because its impact is not yet as built

```json
{"id":"p70","count":3,"last":"2026-11-16"}
```

At a landing the team raises `landed` on the issue board with the dashboards skill's `apply-event.js` in its view mode. On a board whose stages are built, the `landed` row of `plan/RULES.md` hands the reconciled impact to the presenter ("enrich: yes"), but `check.js` fails any built board whose impact is not yet as built, so the event is refused and every file is put back. The presenter then fills the view copy first and raises the event again. Beside it, the unit's Row on the tracking board keeps its filing text ("its run has not started") at `landed` until the presenter rewrites it. The presenter's report on the third landing calls it "a defect, not the designed hand-over": "The rule and the checker contradict each other."

- **Proposed resolution:** none decided. The presenter's, as the hooks log holds it: "a landed that leaves only the impact to reconcile should apply and say enrich yes instead of failing". For the unit Row beside it, the presenter's: "a unit Row's filing summary should be replaced at sized and at landed", which waits on an open question shared with a neighbouring hook (a unit that is itself a tracking issue).
- **Predicted:** the admin team, on meeting it, 2026-11-16.
- **Encounters:**
  - 2026-11-15: the landing of KotlinBottools #39: `landed` refused by the check on the board it would write; the presenter filled the view copy (impact as built) and raised it again (exit 0). Counted late.
  - 2026-11-15: the landing of KotlinBottools #40 (merge 9170254): the presenter filled the view copy first, then raised `landed` unchanged (ok, enrich yes for the parent's unit impact only). Counted late.
  - 2026-11-16: the landing of KotlinBottools #41: "apply-event: failed … check: FAIL: FAIL  a built board's impact is the as-built one: the landing reconciles it from final-implementation.md and sets impact.basis "as-built" … restored: 6 files, as they were"; the presenter filled the view copy and raised it again, the third landing in a row to need it.

## A mirror-sync's scratch clone is checked out with CRLF line endings, and the executor's reset there is refused as [Undermining Oversight]

```json
{"id":"p71","count":1,"last":"2026-11-16"}
```

A mirror-sync's executor makes a fresh scratch clone of the organization repository and works in it, never in the standing checkout (the entry "A mirror-sync's executor writes in the standing checkout, and its cleanup there is refused as destructive"). The machine's global git configuration has `core.autocrlf=true`; a clone made under it and only then set to `core.autocrlf=false` and `core.safecrlf=false` has every tracked file checked out with CRLF line endings, so every file shows as modified, and staging would put a line-ending rewrite of the whole repository into the commit. Getting clean files back in the clone takes `git reset --hard` (or a fresh clone), and the reset is one of the temporarily-requestable actions of the team's brief (Request groups) when no section grants it. It is not that entry, where the executor wrote in the standing checkout and the classifier's reason was "Destructive or Unwanted Actions", nor "A mirror-sync's rule check in a scratch clone leaves another repository's files "not checked", and still passes", which is about the rule check. Contributing: the team's prompt for the sync said to set the two settings "in it before copying anything", which reads as after the clone, and the team's resume notes said the same; both now say to clone with `git -c core.autocrlf=false -c core.safecrlf=false clone`. Not checked: whether the mirror-sync an hour before the encounter, which committed 36 files cleanly from a clone made the same way in words, cloned with the conversion off.

- **Proposed resolution:** none decided. Options, the Archivist's first reading, for the user to decide:
  - a) The executor's brief has a mirror-sync's scratch clone made with the conversion off from the start (`git -c core.autocrlf=false -c core.safecrlf=false clone`), and the team's prompt for a mirror-sync says the same.
  - b) A check after the clone, before anything is copied: `git status` in the clone is empty, else the executor deletes its own scratch clone and clones again with the conversion off, never resetting it, and reports it.
  - c) Both: a) to prevent it, b) to catch it when the clone is made otherwise. Recommended.
  - The choice for the one instance of the encounter (delete the scratch clone and clone again, a temporary grant for the reset, or holding the sync for the user to clear) is put to the user on its own, and settles nothing here.
- **Predicted:** the admin team, on meeting it, 2026-11-16.
- **Encounters:**
  - 2026-11-16: a mirror-sync's scratch clone, made under the global `core.autocrlf=true` and set to `core.autocrlf=false` and `core.safecrlf=false` only after cloning: all 289 tracked files checked out with CRLF line endings and showing as modified; the executor saw it when a `git rm` failed. Its one call running `git reset -q --hard` in its own scratch clone, with its copies, the `git rm` and a one-word README edit after it, was refused by the classifier as "[Undermining Oversight]"; none of its steps ran. Not worked around: nothing committed, the standing checkout untouched, the sync held while the user is asked how to clear the clone.

## A graphify hook rebuild stops partway and leaves its lock file behind

```json
{"id":"p72","count":1,"last":"2026-11-17"}
```

A repository with a knowledge graph has git hooks that start a code-only rebuild of the graph in the background after a checkout or a commit. When the rebuild ends before it finishes, nothing reports it: its log stops partway, with neither a "Rebuilt" nor a "left untouched" line; its lock file (`graphify-out/.rebuild.lock`) stays on disk though no process holds it; and the graph's stamp (`built_at_commit`) stays at the commit before. A likely cause, not verified: the hook's background child ends with the shell that ran the git command, as when a member's shell ends with its job. Whether a lock file left this way stops the next rebuild from starting is not checked; on the first encounter a byte-range probe found it free.

- **Resolution (decided by the user at the console, 2026-11-17, "a"; placed the same day by a change of a direction document):** the graphify manager's hooks mode checks, read only, for a lock file no process holds and a rebuild log with no closing line, and reports them at the next status. Option b, the graphify manager also clearing such a lock and running the code-only refresh itself when the stamp is behind a commit that changed code, and option c, leaving it as practised on the first encounter (left as it is when the graph's content is current), were not chosen. As placed, in the graphify manager's brief by the direction manager: the hooks mode gains a step 4, a read-only check for a lock file left on disk that no process holds, probed by taking graphify's own byte-range lock without waiting and never by querying the process list, and for a rebuild log whose last run has no closing line; the status mode reports both, and the report gains a "stopped rebuild" line. The mirror-sync of the brief follows.
- **Predicted:** the admin team, on meeting it, 2026-11-17.
- **Encounters:**
  - 2026-11-17: KotlinBottools, after the landing of #28: the post-checkout hook started a rebuild at about 01:13Z when the executor switched the main checkout to `main`. The rebuild log ends at "AST extraction: 8/8 uncached files", with nothing added in the 9 minutes after; the lock file was left on disk, and a byte-range probe found it free. No harm: the graph's content is current at `3625163`, the later commits having changed only ignored board files, while its stamp still reads `57b4ffb` and 8 new AST cache entries remain. Left as it is, at the Coordinator's decision. As the graphify manager reported it, not re-read by the Archivist.

## An action a standing allow line covers is refused by the auto mode classifier when sent inside a compound command

```json
{"id":"p73","count":1,"last":"2026-11-17"}
```

A standing `autoMode.allow` line in the team's settings file covers an action a member runs routinely, such as the graphify manager's run of the hooks installer (`admin-team/graphify/graphify-hooks.py`, with the Python that `graphify-out/.graphify_python` names, the user's standing decision graphify/hooks-standing). The member sends that action as one part of a compound shell command with other steps beside it, and the session's auto mode classifier refuses the whole call as "[Destructive or Unwanted Actions]" before anything runs, though the same action, run in the same repository about half an hour earlier, ran clean. It is not the entry "A destructive action a grant covers is denied by the auto mode classifier", which is about an action under a temporary grant, nor "The direction manager's after-edit write pass of the rule checker is refused as destructive", which is about that write pass. A likely cause, not verified: the compound command strays from the standing line's wording, carrying other steps the line does not name and a backslash typed into the command (a `tr` turning the interpreter path's backslashes into slashes), which the team's job rules bar. Not checked: how the run that went clean was sent, and whether the team's settings file, which holds the line, is read at all in a session run in the desktop app (the entry "A deny rule lifted in the launcher's settings file stays in force through the team folder's project-local settings file", its later facts).

- **Resolution (decided by the user at the console, 2026-11-17, "p73: a; p74: a (two replies quoting each)"; practised since; its placement in the direction documents pending):** a step a standing allow line covers is sent as its own call, worded as the line names it, with no other step in the same call. Option b, the standing line widened to cover the steps that go with the installer, and option c, both, were not chosen. Practised since the decision: the graph refreshes of 2026-11-17 at about 02:57Z, 18:08Z and 23:1xZ ran their installer step as a call of its own, and none was refused, as the team reported it. Not yet placed: its placement, one statement in the team's brief and pointers in two members' briefs, is drafted and queued behind another landing of the direction documents, as the team reported it on 2026-11-17.
- **Predicted:** the admin team, on meeting it, 2026-11-17.
- **Encounters:**
  - 2026-11-17: KotlinBottools, the graphify manager's code-only refresh after documentation pull request 51, at about 02:50Z: its brief's first step went as one compound shell command, reading `graphify-out/.graphify_python` and turning its backslashes to slashes with `tr` (a typed backslash), running the hooks installer with `--ignore-only`, comparing `.graphifyignore` with the template, and listing a file. The classifier refused it as "[Destructive or Unwanted Actions]"; nothing ran, nothing was retried, and the job stopped with the graph unchanged (3828 nodes, 5245 edges, 260 communities). The same installer step had run clean in the same repository's refresh at about 02:24Z. No harm: the pull request changed only board files, which the graph's ignore keeps out, so the graph is current for code, and nothing is queued before the next landing. As the team reported it, not re-read by the Archivist, save the standing line, read in the team's settings file.

## The skill's verification shares its temp files and stand-in team state with other jobs running beside it

```json
{"id":"p74","count":1,"last":"2026-11-17"}
```

The dashboards skill's template verification (`verify/verify-templates.js`) writes its output under one fixed folder in the machine's temp folder (`dashboards-verify`, unless `--out` names another) and reads a stand-in for the team's state from one fixed file there (`dashboards-verify-no-state.json`, unless the `DASHBOARDS_ADMIN_STATE` environment variable names another), as read in the script on 2026-11-17. Two skill jobs that run the verification, or other skill scripts, on this machine at the same time therefore share those paths unless each sets its own. When the team runs presenter jobs in more than one lane at once, a verification can fail cases that rest on what another job wrote there, a different case each run, and each full run takes 11 to 12 minutes, so every rerun holds the lane that long. Not checked by the Archivist: which paths the other jobs' scripts wrote, and that the sharing caused the failures, which rests on the Presenter's report. It is not the entry "A board write fails on Windows while another process reads the file", about a refused rename within one run, nor "A member's command runs past 180 seconds and the harness moves it to the background".

- **Resolution (decided by the user at the console, 2026-11-17, "p73: a; p74: a (two replies quoting each)"; placed the same day by the Presenter as a skill fix):** the dashboards skill's verification always uses private temp paths and its own state file. Option b, every job prompt passing its own paths, and option c, no verification beside another presenter job, were not chosen. As placed, by the Presenter's job finishing at about 18:33Z and mirrored in commit `a1e13bc`: a new `verify/scratch.js`; `verify-templates.js`, `browser-view-follow.js` and the case runners that run on their own each open a private scratch, a fresh temp folder with its output and stand-in state, removed at exit and kept on a failure; an explicit `--out` or `DASHBOARDS_ADMIN_STATE` still wins. As the team reported it, not re-read by the Archivist.
- **Not settled by it**, as the Presenter's job reported: two full runs at the same time still each meet one to three timing failures inside their own scratch trees; and a run alone can fail too, the entry "The skill's full verification fails a different group from run to run when run alone".
- **Related (2026-11-18):** the Presenter's diagnosis for the entry "The skill's full verification fails a different group from run to run when run alone" fixed a board write starved by a reader on the same timer tick, failing with `EPERM` after its 15-second budget (that entry's resolution, and that of "A board write fails on Windows while another process reads the file"), and named this entry as fitting it, as an `EPERM` on the fill's atomic rename of a board file. This entry's encounter, as recorded, names failed event cases and no refused rename, and the timing failures of two runs at once, above, were not reported with their errors; whether any of them was that race is not established, and no resolution is recorded here for it. Not re-checked by the Archivist.
- **Predicted:** the admin team, on meeting it, 2026-11-17.
- **Encounters:**
  - 2026-11-17, 02:18 to 02:47Z: the Presenter's job building the Whiteboard skill (hook-85, step 5, in its skills lane) ran the verification of the staged dashboards skill in its working copy; runs 1 to 4 each failed one or two event cases, a different case each time. Its account of the cause: other skill jobs on this machine, the presenter jobs the team ran in the KotlinBottools and OrganizationPage presenter lanes beside it, shared the runs' temp files and stand-in team state. Run 5, with private temp paths and its own state file, had no event failure; run 6 was running at the report. The reruns cost about 45 minutes of a lane four jobs waited behind. As the Presenter reported it at 03:03:54Z, the cause verified neither by the Coordinator nor by the Archivist, save the script's default paths, read.

## A read-and-copy into a scratch tree, to run the rule checker over it, is refused as destructive

```json
{"id":"p75","count":1,"last":"2026-11-17"}
```

A member wants the rule checker run over a whole set of rule files that live in more than one place (the global direction documents, a staged package's files, the organization repository) before anything is placed, and runs a helper script that reads them and copies them into a scratch tree of its own to check them there. The session's auto mode classifier refuses the script's run as "[Destructive or Unwanted Actions]" before it runs, though it would write only in the scratch tree. It is not the entry "The direction manager's after-edit write pass of the rule checker is refused as destructive", which is about that write pass run from the standing checkout, nor "A mirror-sync's rule check in a scratch clone leaves another repository's files "not checked", and still passes", which is about what such a check leaves unread, nor "An action a standing allow line covers is refused by the auto mode classifier when sent inside a compound command". Not checked: what in the call drew the refusal (the copying of the global direction documents, the size of the copy, or the script being one the classifier could not read beforehand).

- **Proposed resolution:** none decided. As practised on the encounter: the member stops at the refusal, tries no other route, and leaves the whole-set check to the rebuild's own rule check, which reads the same files where they are. Options, the Archivist's first reading, for the user to decide:
  - a) A whole-set rule check runs only through the checker itself, pointed at the files where they are (its override variables), never through a copy into a scratch tree.
  - b) The rebuild's own check is the one whole-set check, and a member checks only the files it changes before then.
  - c) Both. Recommended: c), once it is checked that the checker can read a staged package's files in place.
- **Predicted:** the admin team, on meeting it, 2026-11-17.
- **Encounters:**
  - 2026-11-17, about 06:1xZ: in a Presenter job in its skills lane, for a landing package of the rule rework, a `node` run of a helper script in the member's helper folder, which would have copied the global direction documents, the package's files and a clone of the organization repository into a scratch tree to run the rule checker over the set, was refused by the classifier as "[Destructive or Unwanted Actions]". Nothing ran; not retried; the rebuild's own check is to cover it. As the team reported it, not re-read by the Archivist.

## An archive job's shell write of its summary's working file is refused by the auto mode classifier as destructive

```json
{"id":"p76","count":1,"last":"2026-11-17"}
```

An archive job writes its session summary to a working file under the archive's `work/` folder, for `archive.js write-summary` to place as `summary.md` (the Archivist's brief, archive mode, step 3). Sent as a bash heredoc, the write was refused by the session's auto mode classifier as "[Destructive or Unwanted Actions]" before anything ran, though it writes a new file only in a folder of the Archivist's own records. The Write tool to the same path was refused too, the entry "A subagent's Write of a working file is refused, "Subagents should return findings as text"", so neither route the job had was open. It is not that entry, which is about the Write tool's refusal and, in its attempts, a heredoc's parse error, never a classifier's refusal; nor "A read-and-copy into a scratch tree, to run the rule checker over it, is refused as destructive" or "An action a standing allow line covers is refused by the auto mode classifier when sent inside a compound command". Not checked: what in the call drew the refusal; whether the cause is the team's first session run in the desktop app after its restart that day, or the auto-mode environment setup the user applied to the global settings shortly before; whether a shorter heredoc, or one into another folder, would run.

- **Proposed resolution:** none decided. As practised on the encounter: the job stops at the refusal, tries no other route, removes nothing and reports the call and the reason. Options, the Archivist's first reading, for the user to decide:
  - a) The cause is checked first: whether the archive's own `work/` folder is covered by the auto-mode environment setup now in the global settings, and whether the same write runs in a session started through the launcher.
  - b) An `autoMode.allow` line for the archive job's write of a file under the archive's `work/` folder, placed by the direction manager or staged for the user to place.
  - c) `archive.js write-summary` takes the summary on its standard input as well as from a file, so no separate write of a working file is needed; whether the classifier passes that call is untested.
  - Recommended: a), then b) if the cause is the classifier's reading of the new setup.
- **Predicted:** the admin team, on meeting it, 2026-11-17.
- **Encounters:**
  - 2026-11-17, about 17:46Z: an archive job, at step 3, the summary write: a bash heredoc writing the summary's working file into the archive's `work/` folder was refused by the classifier as "[Destructive or Unwanted Actions]"; the Write tool to the same path was refused as well (the entry "A subagent's Write of a working file is refused, "Subagents should return findings as text""), and an earlier heredoc had failed on a shell parse error, writing nothing. Nothing retried by another route, nothing deleted; the session's folder holds its extracted conversation and its metadata only. Earlier archive jobs, up to the same day, wrote their summaries. As the team reported it, save the folder's contents and the empty `work/` folder, read by the Archivist.

## The skill's full verification fails a different group from run to run when run alone

```json
{"id":"p77","count":1,"last":"2026-11-18"}
```

The dashboards skill's full template verification (`verify/verify-templates.js`), run alone, with no overrides and in a private scratch of its own, fails in some runs and not in others, a different group each time, and each group that failed passes when run alone. The cause is not known: the verification's reporter cuts off the summary's `check` field, so the board check's message in the failing cases was not captured. A skill change's landing waits on a clean full run, so each such failure costs a rerun of about 25 minutes. It is not the entry "The skill's verification shares its temp files and stand-in team state with other jobs running beside it", whose failures came with other jobs running beside the verification and which the verification's private scratch answers: here no other job ran beside it and the scratch was private. Nor is it "A board write fails on Windows while another process reads the file", whose failures are a refused rename in the case "event and fill at the same time"; whether a refused rename lies behind these is not checked. Not checked by the Archivist: any of the runs, all of it resting on the Presenter's report.

- **Resolution (a skill defect, fixed at the presenter's discretion on 2026-11-18; the user decided nothing, and it settles one cause only):** the Presenter's diagnosis found one cause and fixed it: a board write starved by a reader on the same timer tick. The writer's atomic rename (`renameInto()` in the skill's `plan/scripts/lib.js`) retried after sleeping; on Windows a sleeping process wakes on the system timer tick (about 15.6 ms), and a process that rereads the board file every few milliseconds wakes on the same tick, so each retry met the reader and the write failed with `EPERM` after its whole 15-second budget. Caught in the first full run after the diagnosis's instrumentation (the case "event and fill at the same time", 7 of 8), and reproduced outside the run: 4 of 60, 6 of 150 and 7 of 150 writes failed, each after about 15.2 seconds. The fix: after each pause the rename is tried every 0.2 to 0.5 ms for a random 2 to 6 ms with a busy wait, which lands a retry where the reader has let go; the write stays atomic and the budget stays. After it 0 of 150, 0 of 300 and 0 of 300 writes failed, the slowest taking 21 ms; a new verification case group holds it, and three full runs in a row then passed (01:21Z to 02:59Z). Also placed: when the verification runs, a failed event that is not a refusal keeps its command, its summary with the error's stack, every child's whole output and every file it wrote, and the failing cases print the full summary, so a next failure names its cause; outside the verification nothing is kept. Mirrored in commit `4edad5b`. As the Presenter reported it, read in full by the Coordinator, who did not re-run its measurements; not re-read by the Archivist.
- **Not settled by it:** the three check failures of the two full runs of the encounter below (one group in the first run, two in the second) were not rename starvation: the one event whose file times were kept ran about half a second and was rolled back, most likely on a failed check whose output was not kept. They did not recur in 40 replays of the failing events or in four full runs. Ruled out: cases running at once, randomness in the scripts, wall-clock reads that matter, and a change of the vocabulary files during the runs. Not checkable: whether real-time antivirus scanning is involved, the query being refused (the entry "A read-only PowerShell read of the machine's configuration is refused as [Undermining Oversight]", its encounter of 2026-11-18). Their evidence is kept from now on, as placed above.
- **Proposed resolution (for the failures the fix does not settle; none decided, the prompt put for it not answered):** since 2026-11-18 the diagnosis of a) is done for the cause it found, and the failing cases print the full summary, which c) asked for, as placed above; b) was not taken up. The options as first read, the Archivist's, for the user or for the Presenter at its own discretion, a skill fix being its own:
  - a) Wait for the diagnosis, and fix the cause it finds in the skill or its verification. Recommended.
  - b) Meanwhile, a full run that fails only in groups that each pass when rerun alone, in the same scratch, counts as clean for a landing, the reruns named in the job's report.
  - c) The verification's reporter prints the summary's `check` field in full in every failing case, whatever the diagnosis finds, so a later failure carries its cause.
- **Predicted:** the admin team, on meeting it, 2026-11-18.
- **Encounters:**
  - 2026-11-18: a Presenter job building a skill change ran the full verification three times, alone, each run in its own private scratch, over 76 minutes in all, ending about 00:35Z. Run 1: the group cases-timeline-waits, group 2, 8/9, "a resumed with neither a stop before it nor an open point": `apply-event.js` exited non-zero; replaying that event on a copy of the kept board gave result ok. Run 2: cases-35, "the seed does not wait for the foundation", 2/9, the post-merge refresh of `landed` returning result failed, and cases-late-implementation, "accepted while halted", 11/12, "check.js failed on the board it would write". Run 3: exit 0, 442 groups, all five templates recorded. The reporter cut off the summary's `check` field, so the cause was not captured; six parallel standalone runs of the two standalone groups showed no failure. As the Presenter reported it, not re-read by the Archivist.

## A board rule placed after boards were committed fails the next event that writes or seeds one

```json
{"id":"p78","count":1,"last":"2026-11-18"}
```

A board rule that fails boards (the board check refuses a board that breaks it) is placed after boards that break it were committed, or after a landing's view copies of them were written in the main checkout. Nothing brings those boards up to the rule when it is placed: the standing rule "New dashboard rules reach old dashboards" (`agents/admin-team/GUIDANCE.md`) says the boards a convention change affects may be brought up to it, as pending work riding a later branch. The next event that writes or seeds such a board then fails on the fast path, and nothing is written. Since a `sized` that opens a new board also seeds onto the run's branch the corrections pending in its repository, a run's first board event can fail on a board that is not the run's own, and the run's board does not open at its start. It is not the entry "A dashboards rule change would reach a closed board", which is about which boards that standing rule covers, nor "A commit that carries a landed document or a closed board holding a phrase the widened internal-names list now lists is blocked by the scan", which is about the commit scan, not the board check. Not checked by the Archivist: the board files, the rule's text and the event's error, all resting on the Coordinator's account.

- **Proposed resolution:** none decided. Options, the Coordinator's, put to the user:
  - a) Wait for the diagnosis. Recommended by the Coordinator.
  - b) When a board rule that fails boards is placed, bring every committed board and view copy it fails up to the rule in the same job.
  - c) Fix each board when an event trips on it, as on the encounter.
  - d) The Presenter's recommendation, made once its diagnosis was done, a variant of b: when a rule that can fail boards is placed, the same job sweeps every committed board and view copy of the repositories on the org work board with the new check, fixes what the boards' own tools can fix and lists what needs a decision; until the fixes land, writers refuse only text they would newly write, and a text already on a board that the rule newly fails gets a warning naming the sweep. Its reason: under c a run's start pays for an old board. Its cost: one sweep per such rule and a docs-only landing per affected repository; a script change so the checks tell a newly written text from one already there; and each rule must say whether it binds closed boards. Plain b, without the warning stage, would also work, but blocks a rule until the commits are done.
- **Predicted:** the admin team, on meeting it, 2026-11-18.
- **Encounters:**
  - 2026-11-18, 02:32Z: a run's `sized` event for a new issue board, which the rules open at once, failed on the fast path in about one second (`apply-event.js` exit 1, nothing written). Its error: the repository's phase-0 tracking board names a private repository at four or more places, which the board rule on private repositories, placed on 2026-11-17 at the user's decision, refuses. The board was read because the repository had corrections pending since 2026-11-17 (an issue board and that tracking board had landed), which a `sized` seeds onto the run's branch from the main checkout's view copies. The tracked tracking board and its view copy each name the private repository 7 times; the landed issue board's view copy names it 3 times, the tracked issue board not at all, the docs PRs of 2026-11-17 having taken such names off the boards. The names left are the subject of an open question not yet put to the user. The run was sent `progress` and keeps working; its later board events wait for its board. As the Coordinator reported it, not re-read by the Archivist. Since established, by the Presenter's diagnosis: the event tripped on the seeded view copy, which is what gets written; the tracked board held the same seven texts (not quotations), which the docs landings had never reworded; the unit board's copy named the repository only in quoted excerpts, which are elided, not refused. The Presenter reworded the seven texts on the view copy through its own tools, under the existing rule, to name no repository; the event was raised again at 02:47:06Z and applied, and the fill reported at about 02:59Z. The run's board opened about 16 minutes after the run's start. In the same diagnosis the Presenter found the view copies behind later docs landings: "A landing's pending view copies fall behind a later landing that edits the tracked boards, and the next seeding undoes its changes". As the Presenter reported it, not re-read by the Archivist.

## A landing's pending view copies fall behind a later landing that edits the tracked boards, and the next seeding undoes its changes

```json
{"id":"p79","count":1,"last":"2026-11-18"}
```

After a landing, the team's post-merge view leaves view copies of the landed boards in the main checkout, pending until the next run's first board event in that repository seeds them onto its branch. A later landing that changes those tracked boards directly, such as a docs change with no issue, which sends no board event, does nothing to the pending copies. The seeding compares only the boards' time stamps, which such an edit does not move, so the stale copy is written whole over the tracked board, and the later landing's changes on that board are undone on the run's branch, silently, to land with it. It can recur whenever a landing that edits a tracked board comes between a post-merge view and the next run's first board event in that repository. It is not "A board rule placed after boards were committed fails the next event that writes or seeds one", whose cause is a rule the boards break, nor "A history rewrite leaves a tracking board's recorded merge outside the branch's history", where a copy is not seeded at all. Not checked by the Archivist: the boards, the copies and the seeding's code, all resting on the Presenter's diagnosis, whose comparison of the copies with the tracked boards the Coordinator did not re-derive either.

- **Proposed resolution:** none decided; the user decides. The Presenter's recommendation: in the scripts, the seeding (and the reseed) merges instead of overwriting. The base is the tracked board as committed at the copy's merge; the copy wins on the fields the landing owns (status, the work-in-progress state, the as-built state, the impact reconciliation, the trail); the tracked board wins on everything else; a conflict on any other field is refused with a clear message; the excerpts are then refreshed from the documents. Cost: a merge routine and its verification cases.
- **Potential interim (the Presenter's, cheaper):** the team's docs landing applies the same edit to any pending view copy in the same job.
- **Related defect:** the seeding writes a parent board before its child, so the parent drops the landed unit's landing; queued as a plain defect fix of the seeding order, and cleared by hand on the encounter.
- **Predicted:** the admin team, on meeting it, from the Presenter's diagnosis, 2026-11-18.
- **Encounters:**
  - 2026-11-18, found between 02:35Z and 02:46Z, while the Presenter fixed the cause of a run's failed first board event ("A board rule placed after boards were committed fails the next event that writes or seeds one"): the view copies of a repository's phase-0 tracking board and of its last unit's issue board, written by the post-merge view of that unit's landing on 2026-11-17, were behind two docs landings made later that day. One had set the narrowest system on the tracking board's 8 unit rows; the other had changed the excerpt text and hashes of 26 statements on the tracking board and 24 on the issue board. The copies held the earlier docs landings' renames, but not these. No effect this time: the Presenter compared the copies with the tracked boards before the event was raised again, brought the copies up to the tracked boards' state by its own tools, and the event then seeded them without loss. Had the event not failed, the seeding would have undone those changes on the run's branch. As the Presenter reported it, not re-read by the Archivist.
