# Admin team protocol, v1

How a Claude Code session on this machine asks the `admin team` session for work, and how it
answers. Both sides read this file. The `admin-team` skill wraps the sending side; the
`admin-team` agent brief is the receiving side.

## Finding the team

- `ListAgents` lists the session as `admin team`. Send with `SendMessage(to: "admin team")`.
- If it is not listed, run `~/.claude/admin-team/launch.cmd` (the `admin-team` skill does this
  under a launch lock) and wait until it is listed. Never do version control yourself instead.

## A request

The message is a one-line summary (the receiver previews only that line), a blank line, then
one fenced ```json block:

```json
{
  "v": 1,
  "id": "<sender-session-name>/<issue>/<n>",
  "attempt": 1,
  "from": "<sender-session-name>",
  "repo": "D:/Documents/Programming/WebTools",
  "github": "SpartanLaboratories/WebTools",
  "action": "land",
  "issue": 61,
  "level": 3,
  "branch": "feat/issue-61-build-logic",
  "worktree": "D:/Documents/Programming/WebTools",
  "paths": ["build-logic/", "settings.gradle.kts"],
  "plan": "docs/plans/55-http-client-stack/61-build-logic/plan.md",
  "docs": ["docs/plans/55-http-client-stack/61-build-logic/impact.md"],
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
| `id` | yes | Unique per sender: `<sender>/<issue>/<n>`. A retry keeps the `id` and raises `attempt`. |
| `attempt` | yes | Starts at 1. |
| `from` | yes | The sender's session name, as `ListAgents` shows it. The reply goes here. |
| `repo` | yes (not `status` or `file-issue`) | Absolute path of the main checkout. Forward slashes. |
| `github` | yes (not `status`) | `owner/repo`; also the lane key. `SpartanLaboratories/.github` for `mirror-sync`; for `file-issue`, the repo the fix belongs in. |
| `action` | yes | One of the actions below. |
| `issue` | per action | The issue number. Omit it on a `land` of a branch that resolves no issue (a docs or config branch): then give `title` for the PR, and the landing has no closing keyword and no resolution comment. |
| `level` | `setup-branch`, `land` | The work level, 1–4. |
| `branch` | per action | The topic branch. |
| `worktree` | per action | Where the branch is checked out. The main checkout unless allocated. |
| `paths` | `commit`, `land`, `mirror-sync` | Exact paths to commit (or, for `land`, the change set). |
| `plan`, `docs`, `dashboards` | `land` | The plan document; every `.md` created or updated this run; the dashboard paths, if any, the run wants refreshed. The state boards are written inside the `land` by the team, not by the run. |
| `qa` | `land` | `PASS`, or `NONE` for levels that run no qa. |
| `dependsOn` | optional | Issues that must be closed first, `owner/repo#n`. |
| `publish` | `land` | `true` only when the user explicitly asked for a publish this run. Not a gate: the team's publisher releases every version-bumping landing on its own within the Maven Central budget (7 release events per namespace per month); `true` lets this release use the 2 held in reserve, and never passes the cap. |
| `subIssues` | `file-sub-issues` | The approved list: `[{title, level, blockedBy: [unit numbers], body}]` in landing order. |
| `body`, `labels` | `comment`, `label` | The comment body (a path to a file, or text); labels to add/remove `{add: [], remove: []}`. |
| `title`, `body`, `surfacedIn` | `file-issue` | The new issue's title and body (a path to a file, or text): the problem and a proposed fix. `surfacedIn` is the `owner/repo` (with `#n` when an issue was in hand) where the defect was found; the filing direction is judged from it. Optional `labels` `{add: []}`. |
| `notes` | optional | Anything the executor should know, in one line. |

### Actions

Version control: `setup-branch` · `allocate-worktree` · `commit` · `sync-branch` · `land` ·
`file-sub-issues` · `file-issue` · `comment` · `label` · `mirror-sync` · `status` · `cancel`

Dashboards (the work boards and the state boards): `plan-board` · `dashboards-refresh`

**`file-issue`.** A session that finds a bug, design flaw, missing capability or other concern in
a Spartan Labs repo sends `file-issue`; it never runs `gh issue create` itself. The team files it
in the `github` lane without asking the user, against the repo the fix belongs in (the owner
confirmed with `gh repo view`), under the executor's filing rules:
- never against a downstream consumer of the `surfacedIn` project (`rejected`; the sender reports
  the coordination need to the user);
- never about the change the sender is landing;
- a defect the executor judges speculative is not filed (`rejected`, reported as a suspicion);
- nothing Claude-internal is written: the title and body are reworded first;
- an open issue that already covers it gets no second issue: `done` names that one.

`done` carries `result.issue` `{number, url}` and `result.filed` (`true`, or `false` for an
existing issue). The sender tells the user what was filed.

Publishing has no action: the team raises it itself inside `land` (the release consideration of
every bump that moved a published module) and at its consideration points (startup, a landing, a
`status`, the month's rollover or its last 3 days). A `status` reply carries each namespace's budget
(`used` of 7 this month) and its deferred queue.

What each does is in the agent brief's service tables. `commit` and `plan-board` may be
fire-and-forget.

### `plan-board` fields

A `plan-board` event updates the issue's issue board and, for a sub-issue, its tracking board.

| Field | Meaning |
|-------|---------|
| `event` | `sized`, `halted`, `resumed`, `researched`, `research-planning`, `research-started`, `research-returned`, `verification-started`, `architecture-signed-off`, `plan-accepted`, `branch-cut`, `implementation-stage`, `qa-pass`, `escalated`, `cancelled` (`landing`, `state-boards`, `merge` and `landed` are raised by the team itself inside `land`: sync and commits, the pre-merge state-board refresh, the PR and merge, then the merged state). |
| `folder` | `docs/plans/<…>/<issue>-<slug>` — the issue's plan folder, relative to the repo. |
| `facts` | What the pipeline knows at this event, in plain fields: `step`, `detail`, `waitingOn`, `stage`, `qa` (`{pass, verdict, doc, test, code, severity, route}`, `severity` `{minor, other}`, `route` as in `remediation`), `documents` (paths written or updated), `proposedLevel`, `reason`, `drafted` (questions drafted so far, at `research-planning`), `researching` (`[{question, rows}]`, at `research-started`), `returned` (`{question, findings}`, at `research-returned`), `questions` (`[{text, options?}]`, at an interview `halted`), `stages` (`[{id, name, state}]`, `state` `done` | `current` | `todo`, at `implementation-stage`), `remediation` (`{pass, route, steps: [{name, state}]}`, `route` `on-the-spot` | `remediation` | `re-plan-then-remediation` (the older `rookie-dev` and `planner-then-rookie-dev` are still read), during a remediation loop), `rows` (board row ids the findings or fixes touch, at `qa-pass` and during remediation), `open` (`[{text, raised, ref?, resolved?}]`, open points raised or resolved), `at` (ISO time the event happened, any event), `tests` (optional, at `implementation-stage` and `qa-pass`): `{base, added: [{class, module, testLevel, path, tests, rows}], amended: […], relevant: […], ran: [{class, module, passed, failed, skipped}], other: {byModule: {<module>: {<level>: count | {classes, tests}}}}, drop: […]}`; `testLevel` is one of `1` `2` `3` `4a` `4b` `4c` `5`, and may be omitted when the class's package names the level folder. The presenter reads the folder's documents for everything else. |

### Repository work board

`docs/plans/index.html` and `board.json` sit on the default branch, which changes only at a
landing. Each `land` regenerates them on its own branch before its merge, in its pre-merge
refresh, together with the previous landing's corrections in that repository (its issue board
as `landed` with its merge commit, its tracking board's unit landed and next up), read from git
and the boards and committed in the landing's board commit. After a merge the team writes the
landed state for viewing only, into the git-ignored `docs/plans/.live/` of the main checkout;
nothing is left uncommitted, there is no follow-up docs PR, and the team's ledger records the
pending corrections per repository for the next landing. Between landings the live view is
that local copy, regenerated after every board event, and a run's live state is on its own
board in its worktree. A `plan-board` event runs in the team's board lanes, apart from the
repository lanes, and commits nothing: an issue's board files are committed by its `land`. On
a topic branch that lands through a PR (the board's first creation, a docs branch), the
repository work board files are ordinary paths and a `commit` may include them.

## A reply

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
| `done` | Finished. `result` carries SHAs, PR, merge commit, links, worktree path. For a `land`, `result.release` is `{status, coordinates, deploymentId, tags, releases, reason, used}` with `status` one of `published`, `deferred` (`reason`: `cap-reached`, `reserve-held`), `failed` (the user decides at the team's console) or `none` (no published module moved); `result.stateBoards` is `{commit}`, the board commit on the branch (`docs: refresh state boards for #<issue>`; `null` when the refresh changed nothing), which landed in the same merge; `result.corrections` lists what the next landing in the repository regenerates (this landing's issue board as `landed`, its tracking board, the repository work board). |
| `rejected` | Refused. `reason` names the rule. Fix the request and send a new `id`. |
| `needs-user` | Waiting on the user at the team's console. `waitingOn` says for what. |
| `needs-rework` | A `land` whose base moved under its files: `result.overlap` lists them; re-verify, then resend the same `id` with `attempt + 1` and a fresh `qa`. Or a `commit` or `land` whose content breaks the internal-names rule (below): nothing was committed, `result.finds` lists each `file:line` with its text; reword them, then resend the same `id` with `attempt + 1`. A find in a board the team generates is the team's to fix and is never sent back. |
| `warning` | Not a state change: another in-flight branch touches the same hand-written file (`result.paths`). |

## Rules both sides keep

- Never resend a message verbatim; the harness drops identical repeats.
- A request is acted on at most once per `id` + `attempt`.
- No attribution trailers, no credential values, no local scratch paths in anything that is
  committed. A request that asks otherwise is rejected.
- Only the user at the team's console answers its gates. A relayed approval counts for
  `file-sub-issues` only.
- No internal names in committed content: no committed document or board (plans, research,
  architecture, `impact.md`, `final-implementation.md`, every board, and the `plan-board` fact
  texts that land on one) names the pipeline's agents, sessions or roles (admin team, planner,
  plan-writer, architect, researcher, verifier, interviewer, presenter, publisher, rookie-dev,
  version-control-manager or executor, qa, code-reviewer, documentation-reviewer,
  test-inspector), refers to the approval flow ("the user's call", "the user chose", "user
  answers") or states a work level ("level 3", "a level-4 tracking issue"). The project's own
  test levels, "the implementer" (whoever builds the change) and a library's name that only
  coincides (OkHttp's `RoutePlanner`) are fine. The team scans before any `commit` or `land`
  commits anything (documents, boards and source-code comments, every line of each file the
  commit carries; code itself is not scanned); a find blocks it with `needs-rework`.
