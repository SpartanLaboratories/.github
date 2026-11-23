# Admin team protocol, v1
{"name":"Admin team protocol, v1","code":"G-A-AT-P","id":115}

How a Claude Code session on this machine asks the `admin team` session for work, and how it
answers. Both sides read this file. The `admin-team` skill wraps the sending side; the
`admin-team` agent brief is the receiving side.

## Finding the team
{"name":"Finding the team","code":"G-A-AT-P-F","id":1249}

- The team is the session whose live record in `~/.claude/sessions/` (`<pid>.json`) has
  `agent` `admin-team` or `name` `admin team` (a session reopened in the desktop app has the
  name alone). Send to that session's own address, read from its record, never to its
  name: `SendMessage(to: "uds:<messagingSocketPath>")`, with the record's
  `messagingSocketPath`. A subagent, which has no `ListAgents`, finds the team the same way.
- A sender that has `ListAgents` and no readable record of the team sends to its name
  instead, with its row's ref added: the team is the row named `admin team` that is not
  `offline`; send with `SendMessage(to: "admin team [<ref>]")`, the ref read from that listing.
- If no row named `admin team` is listed, or every one is `offline`, run
  `~/.claude/admin-team/launch.cmd` (the `admin-team` skill does this under a launch lock) and
  wait until one that is not `offline` is listed. Never do version control yourself instead.

## A request
{"name":"A request","code":"G-A-AT-P-RQ","id":1250}

The message is a one-line summary (the receiver previews only that line), a blank line, then
one fenced ```json block:

```json
{
  "v": 1,
  "id": "<sender-session-name>/<issue>/<n>",
  "attempt": 1,
  "from": "<sender-session-name>",
  "repo": "<main-checkout-path>",
  "github": "SpartanLaboratories/WebTools",
  "action": "land",
  "issue": 61,
  "grade": 3,
  "branch": "feat/issue-61-build-logic",
  "worktree": "<main-checkout-path>",
  "paths": ["build-logic/", "settings.gradle.kts"],
  "plan": "docs/plans/55-http-client-stack/61-build-logic/plan.md",
  "docs": ["docs/plans/55-http-client-stack/61-build-logic/consequences.md"],
  "dashboards": ["docs/dashboards/build/index.html"],
  "qa": "PASS",
  "dependsOn": ["SpartanLaboratories/WebTools#47"],
  "publish": false,
  "notes": "build: commits, no bump (no downstream effect)"
}
```

| Field | Required | Meaning |
|-------|----------|---------|
| `v` | yes | Protocol version, `1`. |
| `id` | yes | Unique per sender: `<sender>/<issue>/<n>`. A session with no issue puts a short word for its work in place of `<issue>`, such as `policies` for a `policies-checkout`. A retry keeps the `id` and raises `attempt`. A session that takes a run up numbers on from the run's last request id (R-1253 (1. Pick and size the issue) [1253-T3], **Handoff**); a request whose `id` and `attempt` are already recorded from another session is `rejected` (below). |
| `attempt` | yes | Starts at 1. A reply carries an `attempt` the requester did not send in one case only: the team's rerun of a request from its ledger when it starts again after the restart a temporary allow line needs (R-10124 (Gates and standing grants) [10124-T8], Temporary permissions, **Allow lines**), with the same `id` and `attempt + 1`. |
| `from` | yes | The sender's session name, as `ListAgents` shows it. The reply goes here. |
| `repo` | yes (not `status`, `file-issue` or `log-hook`); optional on a GitHub-only action, one with no local checkout, such as `create-repo`, `transfer-issue` or `rename-repo`, and on a `policies-checkout` from a session with no repository of its own | Absolute path of the main checkout. Forward slashes. |
| `github` | yes (not `status` or `log-hook`) | `owner/repo`; also the lane key, unless the request has a `target` that differs from it, when the `target` is the lane key, so each repository has one writer at a time. `SpartanLaboratories/.github` for `mirror-sync`; for `file-issue`, the repo the fix belongs in; for `idea`, the repository whose ideas file takes it, `SpartanLaboratories/OrganizationPage` for an idea that spans repositories. |
| `action` | yes | One of the actions below. |
| `issue` | per action | The issue number. Omit it on a `land` of a branch that resolves no issue (a docs or config branch): then give `title` for the PR, and the landing has no closing keyword and no resolution comment. |
| `grade` | `setup-branch`, `prepare-landing`, `state-boards`, `land`; optional on a `plan-board` `sized` | The grade, 1–4. On a `plan-board` `sized` it is read and never written. |
| `branch` | per action | The topic branch. |
| `worktree` | per action | Where the branch is checked out. The main checkout unless allocated. |
| `paths` | `commit`, `prepare-landing`, `land`, `mirror-sync` | Exact paths to commit (or, for `prepare-landing`, the run's change set, of which it commits what is not yet committed; for `land`, the change set). A `mirror-sync`'s paths are of two kinds: a `~/.claude` path, written as a plain string, and a working-copy file of S, P or D with its path in the organization repository, written as an object `{"file": "<the working copy, absolute, forward slashes>", "path": "<its path in the organization repository>"}`. |
| `plan`, `docs`, `dashboards` | `land` | The plan document; every `.md` created or updated this run; the dashboard paths, if any, the run wants refreshed. The state boards are built by the team on the run's `state-boards` request in its Document step, not by the run. |
| `qa` | `prepare-landing`, `land` | The run's last qa verdict: `PASS`; `MINOR-FIXED` when it was `CHANGES REQUESTED` with every fix minor and fixed on the spot (R-1262 (5. QA — `qa` (grades 1–3)) [1262-T1]); or `NONE` for grades that run no qa. |
| `head` | `state-boards`, `land` | The code-landing commit `prepare-landing` reported. |
| `systems` | `state-boards` | The slugs of the systems the change touched. |
| `dependsOn` | optional | Issues that must be closed first, `owner/repo#n`. |
| `publish` | `prepare-landing`, `land` | `true` only when the user explicitly asked for a publish this run. Not a gate: the team's publisher releases every version-bumping landing on its own within the Maven Central budget (7 release events per namespace per month); `true` lets this release use the 2 held in reserve, and never passes the cap. |
| `subIssues` | `file-sub-issues` | The approved list: `[{title, grade, blockedBy: [unit numbers], body}]` in landing order. |
| `body`, `labels` | `comment`, `label` | The comment body (a path to a file, or text); labels to add/remove `{add: [], remove: []}`. |
| `op`, `text`, `kind`, `concerns`, `idea`, `reason` | `idea` | `op` is `add` (the default) or `drop`. To add: `text`, the idea in the sender's words; `kind`, one of the kinds the ideas file's schema lists (the `dashboards` skill); optional `concerns`, the parts it concerns (registry slugs or DSL element ids); and optional `issue`, the issue it names. To drop: `idea`, the idea's id, and `reason`, such as `filed as #n`. |
| `title`, `body`, `surfacedIn` | `file-issue` | The new issue's title and body (a path to a file, or text): the problem and a proposed fix. `surfacedIn` is the `owner/repo` (with `#n` when an issue was in hand) where the defect was found; the filing direction is judged from it. Optional `labels` `{add: []}`. |
| `procedure`, `inputs`, `checks` | `push-mirror`, `create-repo`, `repo-settings`, `rename-repo`, `archive-repo`, `repo-visibility`, `repo-security`, `transfer-issue`, `placeholder-issue`, `link-issues`, `edit-issue-body`, `realign-checkout`, `replace-clone`, `create-label`, `create-milestone`, `create-issue`, `close-issue`, `reopen-issue`, `fixture-pull-request` | The plan's procedure for the write (a path to a file, or text); its inputs (paths, ids, expected tallies); the checks it runs and the results they must give. The team runs the procedure as one shell, its entries unchanged and in order, in a single call, so a guard that stops ends the whole procedure before its write: a plan writes its guards as entries of the procedure (R-1221 (Executor mode: a request from the admin team) [1221-T12]). |
| `mirror` | `push-mirror` | Absolute path of the workspace mirror to push from. Forward slashes. |
| `target` | `push-mirror`, `create-repo`, `repo-settings`, `rename-repo`, `archive-repo`, `repo-visibility`, `repo-security`, `transfer-issue`, `placeholder-issue`, `edit-issue-body`, `create-label`, `create-milestone`, `create-issue`, `close-issue`, `reopen-issue`, `fixture-pull-request`; a request under `permissionReason` for another repository | The `owner/repo` the write applies to; for `transfer-issue`, the repository the issue moves to; for a request under `permissionReason`, the other repository its section's `Scope:` names (`permissionReason`, below). |
| `source` | `transfer-issue` | The `owner/repo` the issue moves from; `issue` is its number there. |
| `newName` | `rename-repo` | The repository's new name. |
| `settings` | `repo-settings` | The settings to apply. |
| `visibility` | `repo-visibility` | `public` or `private`. |
| `security` | `repo-security` | The security settings to apply. |
| `title`, `body`, `number` | `placeholder-issue` | The placeholder's title and body (a path to a file, or text); the number it must land on. |
| `body` | `edit-issue-body` | The new body of `issue` (a path to a file, or text). |
| `number` | `close-issue`, `reopen-issue`, `create-issue` | For `close-issue` and `reopen-issue`, the issue to change. For `create-issue`, the first number it makes; the issue bodies are in `inputs.files`. |
| `relationships` | `link-issues` | `[{op, kind, from, to}]`: `op` is `add` or `remove`, `kind` is `sub-issue` or `blocked-by`, `from` and `to` are `owner/repo#n`. For `sub-issue`, `from` is the parent; for `blocked-by`, `from` is the issue that is blocked. |
| `notes` | optional | Anything the executor should know, in one line. |
| `restarted` | optional, any request | `{"reason": "...", "lastActive": "...", "resumed": "..."}`, set on its first request by a session that knows it is taking a run up: one that found its handoff, present and not empty and left when the run stopped with work unfinished, not the second kind a finished run leaves (R-1128 (Session handoffs) [1128-T8]), and one with no such handoff that finds the run already in progress, its board or its branch for example. `lastActive` and `resumed` are the run's own clock readings, UTC ISO times: its last recorded activity before the stop, read from a record the run left, and the moment it took the run up, read from the clock when it read the handoff or, with no handoff, when it found the run in progress. Neither is ever estimated: one the session cannot read is left out. The team uses them for the stretch the run was not running (R-10127 (Board lanes) [10127-T10], "A run not running"). A session that does not know it is taking a run up sets none: the team sees the change of session itself. |
| `permissionReason` | on a request for a temporarily-requestable action (R-1240 (Request groups) [1240-T6]) | The job the action serves: exactly the job name of a section of the repository's temporary-permissions file, which the executor matches (R-10124 (Gates and standing grants) [10124-T9]). It grants nothing: with no matching section the request is `rejected`, not turned into a console question. A run that needs a grant tells the user in its own session, and the user tells the team at its console. A job spanning several repositories has one section, in the file of the repository it is named for: a request for another repository the section's `Scope:` names carries the file's repository as `github`, for the file lookup, and the actual repository as `target`, which the executor checks is named in the `Scope:`. |

### Actions
{"name":"Actions","code":"G-A-AT-P-RQ-1","id":10137}

R-1240 (Request groups) [1240-T7] says what each group holds, the actions below included.

Version control: `setup-branch` · `allocate-worktree` · `commit` · `sync-branch` · `prepare-landing` ·
`land` · `file-sub-issues` · `file-issue` · `comment` · `label` · `mirror-sync` · `policies-checkout` ·
`status` · `cancel` · `push-mirror` · `create-repo` · `repo-settings` · `rename-repo` · `archive-repo` ·
`repo-visibility` · `repo-security` · `transfer-issue` · `placeholder-issue` · `link-issues` ·
`edit-issue-body` · `realign-checkout` · `replace-clone` · `create-label` · `create-milestone` ·
`create-issue` · `close-issue` · `reopen-issue` · `fixture-pull-request`

Dashboards (the work boards and the state boards): `plan-board` · `state-boards` · `dashboards-refresh` ·
`idea`

Archive: `log-hook`

**`idea`.** Any session may add an idea about a repository's code to that repository's committed
ideas file (R-1242 (Service: dashboards) [1242-T9], Ideas files), or drop one once it is
filed as an issue. A defect, design flaw or missing capability is filed instead (`file-issue`), and
an idea about the workflow, the pipeline, the boards or the team goes to `log-hook`, never into a
repository. The idea carries no owner, no due date and no priority. The team commits each change
at once on a docs branch of its own and lands it; `done` carries `result.idea`, the idea's id, and
`result.pr`. A text that breaks the committed-content filters is `rejected`, naming the filter, and
nothing is committed. It is fire-and-forget for the sender.

**`log-hook`.** Any session may hand the team an idea for the user to revisit later: `text` (the idea,
in the sender's words), `area` (one word or two: `dashboards`, `pipeline`, `CHANGELOG`, …), optional
`links` (issues, files, request ids). The team's archivist appends it to the user's hook log,
tagged with who would carry the idea out; `done` carries `result.hook`, the hook id, and
`result.executor`, the list of its tags. The assessment of the idea's feasibility and difficulty
of execution comes later, to the user at the team's console; the sender gets none. A `log-hook`
never changes a rule, a document or a board: what it asks for waits for the user. It is
fire-and-forget for the sender.

**`policies-checkout`.** A session with no checkout of the organization repository (`SPARTAN_ORG_POLICIES`
unset, or the fetch script exiting 2 to say a checkout is missing) asks for one, naming the repository in
`github`: `SpartanLaboratories/.github`, or another repository that holds a rule file, and in `repo` the
main checkout of its own repository; a session with no repository of its own sends no `repo`. It has no
gate. The team clones the repository when this machine has no checkout of it, sets `SPARTAN_ORG_POLICIES`
for the organization repository's, and replies `done` with `result.path`, the checkout's path.

**`setup-branch`.** A run sends it when it is sized, at every grade, to create its topic branch and
record its grade, and once more at its Branch step as a confirm-only request: `branch` names the
branch and `notes` says "confirm only". The team checks the branch exists, reports its name, base
and head (`result.branch`, `result.base`, `result.head`), records the grade when it changed and
never creates the branch; a missing branch comes back `needs-rework`.

**`prepare-landing`.** Opens a run's Document step, after its last qa verdict. The team syncs the
branch with its base (merge, the repo's way; a clean merge proceeds, whatever files the base and
the branch both touch; a conflict the team cannot resolve itself comes back `needs-rework`, below,
with `result.overlap`: the run re-verifies with the change's own tests and resends
the same `id` with `attempt + 1` and a fresh `qa`) and commits the version bump the grade calls
for; `done` carries `result.head`, the **code-landing commit**, and `result.versions`, the reply's
only account of the bump: one `<module>:<version>` entry per module the bump moved, the module
named by its artifactId where it is published and by its Gradle project name otherwise, and an
empty list when no version moved. From then on only documents change on the branch, and the Dokka
configuration a level-2 documentation finding needs.

**`state-boards`.** In the Document step, after the code-landing commit: the team builds the state
boards on the branch (the changed systems' boards as built, the supersystem and repository boards,
`systems.json`, the README pointer, the tracking board re-embed, the repository work board),
stamped "as-is at `<branch>` @ `<head>`"; at grade 4 the planned systems are drawn dashed. It
raises the issue board's `state-boards` step itself on accepting the request, and again with
`facts.done: true` just before its `done` reply, closing the Document step's task; that raise also
makes the commit task, `document-landing`, current, and the team closes it before it commits, which
it cannot do while another Document task on the board is not done (`needs-rework`, below). A
grade-1 run has no issue board, so no step is raised: the team raises `seed` instead, seeding the
repository's pending corrections onto the branch. `done` carries `result.paths`, the seeded paths
included. Nothing is committed: the run's `commit` of its documents (the document-landing commit)
carries them, then its `land`. The team builds them in its presenter lane for the repository, apart
from the repository's lane, so no version-control request waits behind the build; the same holds for
a `dashboards-refresh`, whose files the team commits with requests of its own.

**`file-issue`.** A session that finds a bug, design flaw, missing capability or other concern in
a Spartan Labs repo sends `file-issue`; it never runs `gh issue create` itself. The team files it
in the `github` lane without asking the user, against the repo the fix belongs in (the owner
confirmed with `gh repo view`), under the executor's filing rules:
- never against a downstream consumer of the `surfacedIn` project (`rejected`; the sender reports
  the coordination need to the user);
- never about the change the sender is landing;
- never for comment resolution, a code comment or KDoc that needs rewording (`rejected`, naming
  the rule; the sender fixes it on the spot, in its current change, or, with no change in hand
  in that repository, sends a `commit` of the fix on a new docs branch, then a `land` with no
  `issue` and a `title` for the PR);
- a request that mixes a defect with such wording gets the defect filed alone: `done` names the
  wording dropped, which the sender fixes as above;
- a defect the executor judges speculative is not filed (`rejected`, reported as a suspicion);
- nothing Claude-internal is written: the title and body are reworded first;
- an open issue that already covers it gets no second issue: `done` names that one.

`done` carries `result.issue` `{number, url}` and `result.filed` (`true`, or `false` for an
existing issue). The sender tells the user what was filed.

**`push-mirror`, `create-repo`, `repo-settings`, `rename-repo`, `archive-repo`, `repo-visibility`,
`repo-security`, `transfer-issue`, `placeholder-issue`, `link-issues`, `edit-issue-body`,
`realign-checkout`, `replace-clone`, `create-label`, `create-milestone`, `create-issue`,
`close-issue`, `reopen-issue`, `fixture-pull-request`.** Writes a plan specifies step by step. The
request carries the plan's `procedure`, `inputs` and `checks`; the team carries them out with the
organisation administrator's GitHub permissions, and the sender verifies each write by reading
GitHub or the checkout before its next step. A `fixture-pull-request` is a branch, a commit, the
pull request and its merge, in the job's own scope. Immediately before a `realign-checkout` moves the
checkout, the team checks that its tracked files are unchanged, whatever the `checks` say; on any
change it moves nothing and replies `stopped`.

Publishing has no action: the team raises it itself inside `land` (the release consideration of
every bump that moved a published module) and at its consideration points (startup, a landing, a
`status`, the month's rollover or its last 3 days). A `status` reply carries each namespace's budget
(`used` of 7 this month) and its deferred queue.

What each does is in the agent brief's service tables. `commit`, `plan-board`, `idea` and `log-hook`
may be fire-and-forget.

### `plan-board` fields
{"name":"`plan-board` fields","code":"G-A-AT-P-RQ-2","id":10138}

A `plan-board` event updates the issue's issue board and, for a sub-issue, its tracking board.

| Field | Meaning |
|-------|---------|
| `event` | `sized`, `halted`, `resumed`, `researched`, `research-planning`, `research-started`, `research-returned`, `verification-started`, `architecture-signed-off`, `plan-stage`, `late-update`, `plan-accepted`, `branch-cut`, `implementation-stage`, `step-complete`, `qa-pass`, `document`, `escalated`, `cancelled`, `retime`, `reword` (`state-boards`, `landing`, `merge`, `landed`, `sub-issues-filed`, `run-restarted`, `reseed`, `seed`, `unit-landed` and `backfill-start` are raised by the team itself: `state-boards` when it accepts the run's `state-boards` request and, with `facts.done: true`, just before replying `done` to it, `landing` when it accepts the `land`, `merge` at the PR, `landed` after the merge, `sub-issues-filed` while `file-sub-issues` files a tracking plan's units, `run-restarted` when a run's request comes from a different session than its last request did or carries `restarted`, `reseed` at the end of every post-merge refresh, `seed` when it accepts a grade-1 run's `state-boards` request (the seeding alone, onto the grade-1 branch from the view copies, the issue's unit marked `complete` on its tracking board where it is one; it names no folder), `unit-landed` after the merge of a tracking issue's unit that has no board (a grade-1 unit), `backfill-start` on a tracking board laid after its units' runs started, once for each unit already started, in the order they started; `landing`, `merge`, `landed`, `sub-issues-filed` and `unit-landed` go to the view copies, as `retime` and `reword` do where the board's latest state is a view copy, nothing tracked written). A `plan-board` request naming any of these ten from another session is `rejected`, naming this rule. The team also raises `retime` and `reword` itself, at the presenter's word (R-1179 (Diverging, checking, fixing) [1179-T13], "Timing corrections" and "Wording corrections"); a run sends them only for its own record (`facts`, below). |
| `folder` | `docs/plans/<…>/<issue>-<slug>` — the issue's plan folder, relative to the repo. |
| `facts` | What the pipeline knows at this event, in plain fields: `step` (no effect on `implementation-stage`, `plan-stage` or `late-update`), `detail`, `waitingOn`, `stage` (at `plan-stage`, the plan stage it opens: `write`, `check`, `consequences` or `report`, or the pass's first stage to go back to it, `re-pass` on a sub-issue; on a tracking board the architecture stage it opens, `write`, `check` or `report`; sent by the planner, and `report` by the run at its relay of the planner's report where that report lists it as not sent; its `detail` is one plain sentence giving the result of the stage it closes; at `late-update`, the plan or architecture stage it records, passed over, with `event` `plan-stage`, or an implementation stage built while the run was halted for its implementation (R-1261 (4. Implement — `rookie-dev` (grades 1–3)) [1261-T1], "Built by the user"), with `event` `implementation-stage` and `stages`, and its result in `detail`; R-1197 (3. Work in progress) [1197-T28], "The plan stages", "The late update" and "A multi-system run's architecture step"), `qa` (`{pass, verdict, doc, test, code, severity, route}`, `verdict` also `"running"`, sent just before each pass, `severity` `{minor, other}`, `route` as in `remediation`), `documents` (paths written or updated), `proposedGrade` (read by no script, never written), `reason`, `drafted` (questions drafted so far, at `research-planning`), `researching` (`[{question, rows}]`, at `research-started`), `returned` (`{question, findings}`, at `research-returned`), `questions` (`[{text, options?}]`, at a `halted` in any step: each question the halt puts to the user, with the options it offers; the event that ends the halt marks them answered), `stages` (`[{id, name, state, result?, steps?, rows?}]`, `state` `done` | `current` | `todo`, at `implementation-stage` and at a `late-update` of an implementation stage, and at `branch-cut` with `id` and `name` alone; a closing check stage's entry also carries `result` (`passed` or `failed`), and the stage's report goes in `detail`, as its end report; `steps` is the stage's steps, each an id or `{id, name, steps?}`, nested to any depth as the plan's stage table nests them, with no state of their own (a step's completion is its `step-complete`), read only for a stage the table does not name (R-1197 (3. Work in progress) [1197-T29], "The stage table"); `rows` is the board Row ids the stage touches), `stepId` (at `step-complete`, with `stage` and `at`: the id of the step of that stage that completed, at any depth; one event per step, with no `detail`), `tasks` (`[{id, name, state}]`, the same states, at `document`; ids `documentation-review`, `reconcile-documentation`, `dokka-check`, `reconcile-plan`, `readme-changelog`, `state-boards`, `document-landing`; the last two are the team's: a run's list need not name them and cannot move them back; a task the grade or repository does not apply to, such as `dokka-check` where Dokka is not used, is left out), `remediation` (`{pass, route, steps: [{name, state}]}`, `route` `on-the-spot` | `remediation` | `re-plan-then-remediation` (the older `rookie-dev` and `planner-then-rookie-dev` are still read), during a remediation loop), `rows` (board Row ids the findings or fixes touch, at `qa-pass` and during remediation), `open` (`[{text, raised, ref?, resolved?}]`, open points raised or resolved; a point's `raised` and `resolved` times are read from the clock with `date -u +%FT%TZ` at the moment the point is raised or resolved, never rounded or estimated; the `raised` or `resolved` time of a point the event newly raises or resolves is kept when it is not after the event's arrival (plus the 2-minute tolerance) and not before the last event that still showed the point open, and only a time outside those bounds, or a missing one, is replaced by the arrival time, which the team says in its reply; a point still open may be listed again in a later event, and that event then bounds the time of its resolution), `units`, `final` and, optional, `merge` and `pr` (team-raised, at `sub-issues-filed`), `at` (ISO time the event happened, any event but `late-update`, which carries none and is given none, read from the clock with `date -u +%FT%TZ` at that moment, never rounded or estimated; when it is missing or more than 2 minutes from the event's arrival, the team uses the arrival time and says so in its reply, and a run whose reading it replaced sends a `retime` with that reading; at the team-raised `backfill-start`, with `unit`, the unit's issue number, it is the unit's start as its own board records it, `plan.sized`, kept as given), `event`, `recordedAt`, `from`, `to` (at `retime` and `reword`, with `reason` in plain words, all required: `event` is one of the run's own events on its own board, never one of the team's; at `retime`, `from` is the time the record holds for it and `to` the time it should hold, the run's own clock reading, sent until the run's `land` is sent; at `reword`, `recordedAt` is the time the record holds for the event, `from` the passage as the record holds it and `to` what it should read, an empty string taking it out, sent until the run's document-landing commit; what each refuses, and how far a run's `to` may move a time, is in R-1198 (4. Events: what updates a board) [1198-T15], their rows, and a refusal comes back `rejected`, its `reason` the script's refusal), `tests` (optional, at `implementation-stage` and `qa-pass`): `{base, added: [{class, module, testSet, path, tests, rows}], amended: […], relevant: […], ran: [{class, module, testSet, passed, failed, skipped}], other: {byModule: {<module>: {<set>: count | {classes, tests}}}}, drop: […]}`; `testSet` is one of `gating` `component` `integration` `deterministic` `e2e` `nonfunctional` `uat`, and may be omitted when the class's package names the set's folder. A class's entry may carry its own `stage`, which the class keeps when one report says several stages finished at once. `verdicts` (optional, at `plan-accepted`): one entry per Row of the board, `{row, kind, list?, statements: [{text, ref}], options?}`, `row` a Row id of the board's `plan.json`, `kind` `build` or `leave`, each statement one decision with its `ref` into the plan section it rests on, `options` only for a Row whose Considered Cell holds none; what each field holds, what the board writes from it and what it leaves to the fill: R-10100 (The verdicts at plan acceptance) [10100-T7]. The presenter reads the folder's documents for everything else. |

### Repository work board
{"name":"Repository work board","code":"G-A-AT-P-RQ-3","id":10139}

`docs/plans/index.html` and `board.json` sit on the default branch, which changes only at a
landing. Each run's `state-boards` task regenerates them on its branch, and its document-landing
commit carries them. The team raises a land's `landing` and `merge`, and `landed` after the merge,
for viewing only, into the git-ignored `docs/plans/.live/` of the main checkout (view copies under
`.live/view/`); nothing is left uncommitted, there is no follow-up docs PR, and a later landing in
the repository carries the landed state (its issue board as `landed` with its merge commit, its
tracking board's filed units, its unit landed and next up, the repository work board): the next
run's `sized` seeds it onto its branch, and a grade-1 branch, which sends no `sized`, carries the
corrections still pending too, through the `seed` the team raises at its `state-boards` request.
Between landings the live view is that local copy, regenerated after every board event, and a run's
live state is on its own board in its worktree. A `plan-board` event runs in the team's board lanes,
apart from the repository lanes, and commits nothing: an issue's board files are committed by the
run's document-landing commit. On a topic branch that lands through a PR (the board's first
creation, a docs branch), the repository work board files are ordinary paths and a `commit` may
include them.

## A reply
{"name":"A reply","code":"G-A-AT-P-RP","id":1251}

Same shape: one line, then a ```json block.

```json
{ "v": 1, "id": "...", "attempt": 1, "reply": "done",
  "lane": "SpartanLaboratories/WebTools", "position": 0,
  "result": { "commits": ["b022d3a"], "pr": 60, "merge": "834ce4a", "comment": "https://..." },
  "reason": null, "waitingOn": null }
```

| `reply` | Meaning |
|---------|---------|
| `ack` | Queued. `lane` and `position` (0 = running). |
| `progress` | Only for long actions; what step it is on. |
| `done` | Finished. `result` carries SHAs, PR, merge commit, links, worktree path. For a `land`, `result.release` is `{status, coordinates, deploymentId, tags, releases, reason, used}` with `status` one of `published`, `deferred` (`reason`: `cap-reached`, `reserve-held`), `failed` (the user decides at the team's console) or `none` (no published module moved); `result.corrections` lists the landed state a later landing in the repository carries (this landing's issue board as `landed`, its tracking board, the repository work board): the next run's `sized` seeds it onto its branch, and a grade-1 branch carries it too. For a `land` of an issue at grades 1 to 3, `result.tracking` is `{closed, leftOpen, reopened}`: `closed`, the tracking issues the PR's closing keywords closed at the merge, innermost first (R-10123 (Landing) [10123-T9], **A tracking issue closes with its last sub-issue**); `leftOpen`, the first parent left open, `{issue, reason, open}`, `reason` one of `open-sub-issues` (`open` naming them), `not-tracking` or `other-repository`, or `null` when there is none; `reopened`, each issue of `closed` with a sub-issue open again after the merge (reopened between the PR and the merge), `{issue, open}`, for the user, and empty when there is none. |
| `rejected` | Refused. `reason` names the rule and, for a request outside its group (R-1240 (Request groups) [1240-T8]), the group. Fix the request and send a new `id`. A request whose `id` and `attempt` are already recorded from another session is refused with `reason` naming the next free id: resend it under that `id`. |
| `needs-user` | Waiting on the user at the team's console. `waitingOn` says for what. |
| `needs-rework` | A `prepare-landing` or `land` whose sync met a conflict: `result.overlap` lists the files; re-verify, then resend the same `id` with `attempt + 1` and a fresh `qa`. A merge that came out clean never comes back, whatever files the base and the branch both touch. A conflict where every conflicted file is a generated board file (the work boards, or the state-board files under `docs/dashboards/`) or a `CHANGELOG.md` where both sides only added entries the team resolves itself and never sends back; any other conflict, every `README.md` conflict included, comes back this way, a `README.md` or other `CHANGELOG.md` conflict with the merge left open and `result.conflicts` naming the files: fix the markers in those files in the worktree, then resend the same `id` with `attempt + 1`, and the executor finishes the merge. Or a `commit`, `prepare-landing`, `land` or `mirror-sync` whose content breaks the internal-names rule (below): nothing was committed, `result.finds` lists each find as `{file, line, text, sayInstead}`, `sayInstead` the internal-names list's wording for what was found, or `null` where the list has none; reword each, with its wording where it fits and by hand where there is none (for a `mirror-sync`, in the source: in `~/.claude` or in a working-copy file of S, P or D), then resend the same `id` with `attempt + 1`, or, with a reason to keep a find, resend it unchanged asking for an exception (below). A find in a board the team generates is the team's to fix and is never sent back. Or a run's document-landing `commit` while another Document task on its issue board is not done: nothing was committed, `result.unfinished` names the unfinished tasks (a task the grade or repository does not apply to is absent from the board's list and does not count; a grade-1 run has no issue board, so the check does not apply to it); send a `document` event with their true states, then resend the same `id` with `attempt + 1`. Or a confirm-only `setup-branch` whose branch does not exist: nothing was created, `reason` names the branch. Or a `mirror-sync` whose files fail the secret scan (R-116 (Version-control manager) [116-T5]): nothing was committed, `result.finds` lists each `file:line` with its text; fix the source, in `~/.claude` or in a working-copy file of S, P or D, then resend the same `id` with `attempt + 1`. |
| `stopped` | A write a plan specifies (`procedure`, `inputs`, `checks`) whose check failed: no further step ran. `result.step` names the step reached and `result.state` the state left. It is not retried without looking: the sender reads that state on GitHub or in the checkout before it resends the request or goes on. |
| `warning` | Not a state change: another in-flight branch touches the same hand-written file (`result.paths`). |

## Rules both sides keep
{"name":"Rules both sides keep","code":"G-A-AT-P-RU","id":1252}

- Never resend a message verbatim; the harness drops identical repeats.
- A request is acted on at most once per `id` + `attempt`: a repeat from the same session gets
  the recorded reply, and one from another session is `rejected`, naming the next free id.
- No attribution trailers, no credential values, no local scratch paths in anything that is
  committed. A request that asks otherwise is `rejected`, naming its group
  (R-1240 (Request groups) [1240-T9]).
- Only the user at the team's console answers its gates. A relayed approval counts for
  `file-sub-issues` only.
- No internal names in committed content: no committed document or board (plans, research,
  architecture, `consequences.md`, `final-implementation.md`, every board, and the `plan-board` fact
  texts that land on one) names the pipeline's agents, sessions or roles, refers to the approval
  flow or states a grade, as
  R-126 (Internal names — what committed content never names) [126-T22] lists them with what is fine. The team scans what R-1122 (What the commit scan reads) [1122-T3] lists before any
  `commit`, `prepare-landing` or `land` commits anything; a find blocks it with
  `needs-rework`, each find carrying the list's wording to say instead or `null`. The same
  scan runs before a `mirror-sync` commits anything
  (R-1221 (Executor mode: a request from the admin team) [1221-T13], **Internal-names scan**);
  of the files a `mirror-sync` carries it reads none under
  `claude/`, as R-10049 (Documents and boards) [10049-T2] says: those are the mirror's copies of the
  direction documents, which R-126 (Internal names — what committed content never names) [126-T7] says the
  list does not reach. A scan that could not run commits nothing
  either: the team holds the request, sending `progress`, until the scan is corrected, then runs it
  again. A resend that asks for an exception says so in `notes`, naming each `file:line` it asks
  for and the reason to keep it; it comes back `needs-user` while the team puts the case to the user
  (R-1241 (Service: version control) [1241-T3], "Internal names block a commit").
