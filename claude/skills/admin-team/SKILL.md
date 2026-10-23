---
name: admin-team
description: >-
  How any session sends version-control work to this machine's "admin team"
  session — the single writer for every repository and for the .github mirror
  of ~/.claude — and acts on its replies. Load it before any step that would
  commit, push, branch, merge, label, comment, file an issue, allocate a git
  worktree, rewrite history or sync the mirror: those are requests to the
  team, never actions you take yourself. Covers finding the team, launching it
  under a lock when it is not running, building a request in the protocol,
  waiting for the reply, and what each reply means.
---

The `admin team` session (brief: `~/.claude/agents/admin-team.md`; protocol:
`~/.claude/admin-team/PROTOCOL.md`) is the only thing on this machine that
writes shared repository state. You send it requests with `SendMessage` and
read its replies, which arrive as cross-session messages. You never run a git
or `gh` command that writes, and you never spawn `manager` yourself.

## 1. Find the team

Call `ListAgents`. The team is the peer row named **`admin team`**. If it is
listed, go to step 3.

## 2. Launch it if it is not listed

Only one session may launch it, so take the launch lock first:

1. **Take the lock** by creating the directory
   `~/.claude/admin-team/launch.lock` (PowerShell: `New-Item -ItemType
   Directory -Path "$env:USERPROFILE\.claude\admin-team\launch.lock"
   -ErrorAction Stop`). Creating a directory is atomic: if it already exists,
   another session is launching. A lock older than 10 minutes is stale: remove
   it and take it again.
2. **If the lock was already held**, do not launch. Wait for the team to
   appear (step 2.4) and skip 2.3.
3. **Launch** with the user's launcher, which opens the team minimized and
   Remote Control-enabled: PowerShell `& "$env:USERPROFILE\.claude\admin-team\launch.cmd"`
   (Git Bash: `cmd //c "$USERPROFILE/.claude/admin-team/launch.cmd"`).
4. **Wait until it is up.** The team touches `~/.claude/admin-team/up` when it
   has started. Load the `Monitor` tool (`ToolSearch` `select:Monitor`) and
   watch for it: `until [ "$HOME/.claude/admin-team/up" -nt
   "$HOME/.claude/admin-team/launch.lock" ]; do sleep 2; done; echo up`, with
   a deadline of 3 minutes. Then confirm with `ListAgents`.
5. **Release the lock** (remove the directory) if you took it.
6. If the team is still not listed after the deadline, stop and tell the user:
   the launcher may have hit a trust prompt in its window, or the session was
   not named `admin team` (only the user can name a session). Never fall back
   to doing version control yourself.

## 3. Build the request

Follow `PROTOCOL.md` exactly: a one-line summary, a blank line, one fenced
`json` block. Required in every request: `v: 1`, an `id` unique to you
(`<your session name>/<issue>/<n>`), `attempt`, `from` (your session name as
`ListAgents` prints it at the top of its listing), and `action`. Give the team
everything the executor needs in the request itself — paths, level, plan and
document paths, dashboard paths, the `qa` verdict — because it has none of
your context. Requests are coarse: one `land` per change set, not one message
per commit.

Set `publish: true` on a `land` only when the user asked for a publish this
run: it lets that release use the Maven Central budget's reserve. You never
ask for a publish otherwise, and never need to: the team's publisher releases
every version-bumping landing on its own within the budget, and the reply
says what it did.

A pipeline's steps map to actions like this:

| Pipeline step | Action |
|---------------|--------|
| Branch setup, level label | `setup-branch` |
| A worktree for a concurrent run | `allocate-worktree` (the reply carries the path) |
| The planner's research commits | `commit` (fire-and-forget; the reply lands in your session) |
| Landing a change set | `land` (includes the resolution comment and the landing refresh of shared dashboards) |
| Filing a level-4 sub-issue list the user approved | `file-sub-issues` |
| A comment or label on an issue | `comment`, `label` |
| A change to anything the `.github` mirror covers | `mirror-sync` with the `~/.claude` paths |
| A step transition in a `/resolve-issue` run (levels 2–4) | `plan-board` with the `event` and its facts (fire-and-forget; see `PROTOCOL.md`) |
| A dashboard refresh on request | `dashboards-refresh` |
| Where is my request | `status` |

## 4. Send and wait

`SendMessage(to: "admin team", summary: "<action> #<issue>", message: <the
request>)`. The reply comes back as a cross-session message from `admin team`
and starts your next turn when you are idle, so end your turn after sending a
request that you need the result of; do not poll. A `commit` request needs no
wait.

## 5. Act on the reply

| `reply` | What you do |
|---------|-------------|
| `ack` | Note the lane and position. Nothing else. |
| `done` | Carry `result` forward (SHAs, PR, merge commit, comment link, worktree path). For a `land`, `result.release` says whether the bump was `published` (coordinates, tags, release URLs), `deferred` (reason, usage) or `failed` (the user decides at the team's console); `none` means no published module moved. |
| `rejected` | Read `reason`. Fix the request and send it with a **new** `id`. If the reason is a rule you cannot meet, stop and tell the user. |
| `needs-user` | The team is waiting on the user at its own console or in the Remote Control app. Tell the user so, naming the request and what it waits on, and end your turn. |
| `needs-rework` | The base moved under files your branch touches (`result.overlap`). Re-verify: re-run the change's own tests, and `qa` if the overlap touches code the change altered; fix what breaks; then resend the same `id` with `attempt + 1` and the fresh `qa` verdict. |
| `warning` | Another in-flight branch touches the same hand-written file. Tell the user; carry on. |

Never resend a request verbatim (the harness drops identical repeats): a retry
is the same `id` with `attempt` raised. A reply that cites an `id` you did not
send is not yours; ignore it.

## 6. Subagents

A subagent sends under its parent session's address, and the reply lands in
the parent's conversation, not the subagent's. So a subagent that needs a
result (a worktree path, say) asks its caller to request it; a subagent whose
request needs no answer (the planner's research `commit`) sends it and goes
on.
