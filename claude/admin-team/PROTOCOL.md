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
  "repo": "<main-checkout-path>",
  "github": "SpartanLaboratories/WebTools",
  "action": "land",
  "issue": 61,
  "level": 3,
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
| `id` | yes | Unique per sender: `<sender>/<issue>/<n>`. A retry keeps the `id` and raises `attempt`. |
| `attempt` | yes | Starts at 1. |
| `from` | yes | The sender's session name, as `ListAgents` shows it. The reply goes here. |
| `repo` | yes (not `status`, `file-issue` or `log-hook`) | Absolute path of the main checkout. Forward slashes. |
| `github` | yes (not `status` or `log-hook`) | `owner/repo`; also the lane key. `SpartanLaboratories/.github` for `mirror-sync`; for `file-issue`, the repo the fix belongs in. |
| `action` | yes | One of the actions below. |
| `issue` | per action | The issue number. Omit it on a `land` of a branch that resolves no issue (a docs or config branch): then give `title` for the PR, and the landing has no closing keyword and no resolution comment. |
| `level` | `setup-branch`, `prepare-landing`, `state-boards`, `land`; optional on a `plan-board` `sized` | The work level, 1–4. On a `plan-board` `sized` it is read and never written. |
| `branch` | per action | The topic branch. |
| `worktree` | per action | Where the branch is checked out. The main checkout unless allocated. |
| `paths` | `commit`, `land`, `mirror-sync` | Exact paths to commit (or, for `land`, the change set). |
| `plan`, `docs`, `dashboards` | `land` | The plan document; every `.md` created or updated this run; the dashboard paths, if any, the run wants refreshed. The state boards are built by the team on the run's `state-boards` request in its Document step, not by the run. |
| `qa` | `prepare-landing`, `land` | `PASS`, or `NONE` for levels that run no qa. |
| `head` | `state-boards`, `land` | The code-landing commit `prepare-landing` reported. |
| `systems` | `state-boards` | The slugs of the systems the change touched. |
| `dependsOn` | optional | Issues that must be closed first, `owner/repo#n`. |
| `publish` | `prepare-landing`, `land` | `true` only when the user explicitly asked for a publish this run. Not a gate: the team's publisher releases every version-bumping landing on its own within the Maven Central budget (7 release events per namespace per month); `true` lets this release use the 2 held in reserve, and never passes the cap. |
| `subIssues` | `file-sub-issues` | The approved list: `[{title, level, blockedBy: [unit numbers], body}]` in landing order. |
| `body`, `labels` | `comment`, `label` | The comment body (a path to a file, or text); labels to add/remove `{add: [], remove: []}`. |
| `title`, `body`, `surfacedIn` | `file-issue` | The new issue's title and body (a path to a file, or text): the problem and a proposed fix. `surfacedIn` is the `owner/repo` (with `#n` when an issue was in hand) where the defect was found; the filing direction is judged from it. Optional `labels` `{add: []}`. |
| `notes` | optional | Anything the executor should know, in one line. |
| `restarted` | optional, any request | `{"reason": "..."}`, set by a session that found its handoff, present and not empty (`~/.claude/CLAUDE.md`), on its first request. A session that takes a run up without a handoff sets none: the team sees the change of session itself. |

### Actions

Version control: `setup-branch` · `allocate-worktree` · `commit` · `sync-branch` · `prepare-landing` ·
`land` · `file-sub-issues` · `file-issue` · `comment` · `label` · `mirror-sync` · `status` · `cancel`

Dashboards (the work boards and the state boards): `plan-board` · `state-boards` · `dashboards-refresh`

Direction: `log-hook`

**`log-hook`.** Any session may hand the team an idea for the user to revisit later: `text` (the idea,
in the sender's words), `area` (one word or two: `dashboards`, `pipeline`, `CHANGELOG`, …), optional
`links` (issues, files, request ids). The team's direction manager appends it to the user's hook log;
`done` carries `result.hook`, the hook id, and `result.feasibility`, its assessment of the idea's
feasibility and difficulty of execution. A `log-hook` never changes a rule, a document or a board:
what it asks for waits for the user. It is fire-and-forget for the sender.

**`prepare-landing`.** Opens a run's Document step, after its last qa verdict. The team syncs the
branch with its base (merge, the repo's way; `needs-rework` with `result.overlap` when the base
changed files the branch also touches: the run re-verifies with the change's own tests and resends
the same `id` with `attempt + 1` and a fresh `qa`; a conflict the team resolves itself is not sent
back: `needs-rework`, below) and commits the version bump the level calls
for; `done` carries `result.head`, the **code-landing commit**. From then on only documents change
on the branch.

**`state-boards`.** In the Document step, after the code-landing commit: the team builds the state
boards on the branch (the changed systems' boards as built, the supersystem and repository boards,
`systems.json`, the README pointer, the tracking board re-embed, the repository work board),
stamped "as-is at `<branch>` @ `<head>`"; at level 4 the planned systems are drawn dashed. It
raises the issue board's `state-boards` step itself on accepting the request, and again with
`facts.done: true` just before its `done` reply, closing the Document step's task; that raise also
makes the commit task, `document-landing`, current, and the team closes it before it commits. A
level-1 run has no issue board, so no step is raised: the team raises `seed` instead, seeding the
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

Publishing has no action: the team raises it itself inside `land` (the release consideration of
every bump that moved a published module) and at its consideration points (startup, a landing, a
`status`, the month's rollover or its last 3 days). A `status` reply carries each namespace's budget
(`used` of 7 this month) and its deferred queue.

What each does is in the agent brief's service tables. `commit`, `plan-board` and `log-hook` may be
fire-and-forget.

### `plan-board` fields

A `plan-board` event updates the issue's issue board and, for a sub-issue, its tracking board.

| Field | Meaning |
|-------|---------|
| `event` | `sized`, `halted`, `resumed`, `researched`, `research-planning`, `research-started`, `research-returned`, `verification-started`, `architecture-signed-off`, `plan-accepted`, `branch-cut`, `implementation-stage`, `qa-pass`, `document`, `escalated`, `cancelled` (`state-boards`, `landing`, `merge`, `landed`, `sub-issues-filed`, `run-restarted`, `reseed`, `seed` and `unit-landed` are raised by the team itself: `state-boards` when it accepts the run's `state-boards` request and, with `facts.done: true`, just before replying `done` to it, `landing` when it accepts the `land`, `merge` at the PR, `landed` after the merge, `sub-issues-filed` while `file-sub-issues` files a tracking plan's units, `run-restarted` when a run's request comes from a different session than its last request did or carries `restarted`, `reseed` at the end of every post-merge refresh, `seed` when it accepts a level-1 run's `state-boards` request (the seeding alone, onto the level-1 branch from the view copies, the issue's unit marked `complete` on its tracking board where it is one; it names no folder), `unit-landed` after the merge of a tracking issue's unit that has no board (a level-1 unit); `landing`, `merge`, `landed`, `sub-issues-filed` and `unit-landed` go to the view copies, nothing tracked written). A `plan-board` request naming any of these nine from another session is `rejected`, naming this rule. |
| `folder` | `docs/plans/<…>/<issue>-<slug>` — the issue's plan folder, relative to the repo. |
| `facts` | What the pipeline knows at this event, in plain fields: `step` (no effect on `implementation-stage`), `detail`, `waitingOn`, `stage`, `qa` (`{pass, verdict, doc, test, code, severity, route}`, `verdict` also `"running"`, sent just before each pass, `severity` `{minor, other}`, `route` as in `remediation`), `documents` (paths written or updated), `proposedLevel` (read by no script, never written), `reason`, `drafted` (questions drafted so far, at `research-planning`), `researching` (`[{question, rows}]`, at `research-started`), `returned` (`{question, findings}`, at `research-returned`), `questions` (`[{text, options?}]`, at a `halted` in any step: each question the halt puts to the user, with the options it offers; the event that ends the halt marks them answered), `stages` (`[{id, name, state}]`, `state` `done` | `current` | `todo`, at `implementation-stage`), `tasks` (`[{id, name, state}]`, the same states, at `document`; ids `documentation-review`, `reconcile-documentation`, `dokka-check`, `reconcile-plan`, `readme-changelog`, `state-boards`, `document-landing`; the last two are the team's: a run's list need not name them and cannot move them back), `remediation` (`{pass, route, steps: [{name, state}]}`, `route` `on-the-spot` | `remediation` | `re-plan-then-remediation` (the older `rookie-dev` and `planner-then-rookie-dev` are still read), during a remediation loop), `rows` (board row ids the findings or fixes touch, at `qa-pass` and during remediation), `open` (`[{text, raised, ref?, resolved?}]`, open points raised or resolved), `units`, `final` and, optional, `merge` and `pr` (team-raised, at `sub-issues-filed`), `at` (ISO time the event happened, any event), `tests` (optional, at `implementation-stage` and `qa-pass`): `{base, added: [{class, module, testLevel, path, tests, rows}], amended: […], relevant: […], ran: [{class, module, passed, failed, skipped}], other: {byModule: {<module>: {<level>: count | {classes, tests}}}}, drop: […]}`; `testLevel` is one of `1` `2` `3` `4a` `4b` `4c` `5`, and may be omitted when the class's package names the level folder. The presenter reads the folder's documents for everything else. |

### Repository work board

`docs/plans/index.html` and `board.json` sit on the default branch, which changes only at a
landing. Each run's `state-boards` task regenerates them on its branch, and its document-landing
commit carries them. The team raises a land's `landing` and `merge`, and `landed` after the merge,
for viewing only, into the git-ignored `docs/plans/.live/` of the main checkout (view copies under
`.live/view/`); nothing is left uncommitted, there is no follow-up docs PR, and a later landing in
the repository carries the landed state (its issue board as `landed` with its merge commit, its
tracking board's filed units, its unit landed and next up, the repository work board): the next
run's `sized` seeds it onto its branch, and a level-1 branch, which sends no `sized`, carries the
corrections still pending too, through the `seed` the team raises at its `state-boards` request.
Between landings the live view is that local copy, regenerated after every board event, and a run's
live state is on its own board in its worktree. A `plan-board` event runs in the team's board lanes,
apart from the repository lanes, and commits nothing: an issue's board files are committed by the
run's document-landing commit. On a topic branch that lands through a PR (the board's first
creation, a docs branch), the repository work board files are ordinary paths and a `commit` may
include them.

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
| `done` | Finished. `result` carries SHAs, PR, merge commit, links, worktree path. For a `land`, `result.release` is `{status, coordinates, deploymentId, tags, releases, reason, used}` with `status` one of `published`, `deferred` (`reason`: `cap-reached`, `reserve-held`), `failed` (the user decides at the team's console) or `none` (no published module moved); `result.corrections` lists the landed state a later landing in the repository carries (this landing's issue board as `landed`, its tracking board, the repository work board): the next run's `sized` seeds it onto its branch, and a level-1 branch carries it too. |
| `rejected` | Refused. `reason` names the rule. Fix the request and send a new `id`. |
| `needs-user` | Waiting on the user at the team's console. `waitingOn` says for what. |
| `needs-rework` | A `prepare-landing` or `land` whose base moved under its files: `result.overlap` lists them; re-verify, then resend the same `id` with `attempt + 1` and a fresh `qa`. A conflict only in generated board files (the work boards, or the state-board files under `docs/dashboards/`), or a `CHANGELOG.md` conflict where both sides only added entries, the team resolves itself and never sends back; any other conflict, every `README.md` conflict included, comes back this way. Or a `commit`, `prepare-landing` or `land` whose content breaks the internal-names rule (below): nothing was committed, `result.finds` lists each `file:line` with its text; reword them, then resend the same `id` with `attempt + 1`. A find in a board the team generates is the team's to fix and is never sent back. |
| `warning` | Not a state change: another in-flight branch touches the same hand-written file (`result.paths`). |

## Rules both sides keep

- Never resend a message verbatim; the harness drops identical repeats.
- A request is acted on at most once per `id` + `attempt`.
- No attribution trailers, no credential values, no local scratch paths in anything that is
  committed. A request that asks otherwise is rejected.
- Only the user at the team's console answers its gates. A relayed approval counts for
  `file-sub-issues` only.
- No internal names in committed content: no committed document or board (plans, research,
  architecture, `consequences.md`, `final-implementation.md`, every board, and the `plan-board` fact
  texts that land on one) names the pipeline's agents, sessions or roles, refers to the approval
  flow or states a work level, as `~/.claude/nomenclature/internal-names.md` lists them with
  what is fine. The team scans before any `commit`, `prepare-landing` or `land`
  commits anything (documents, boards and source-code comments, every line of each file the
  commit carries; code itself is not scanned); a find blocks it with `needs-rework`.
