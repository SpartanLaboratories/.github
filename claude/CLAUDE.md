# Global guidelines (all projects)
{"name":"Global guidelines (all projects)","code":"G","id":4}

## Never Guess Intent — Ask
{"name":"Never Guess Intent — Ask","code":"G-C-I","id":1125}

Leave **no gap** in your understanding of what I want. Nothing about my intent is to be
guessed. If you are unsure, ask me a question.

- **Intent vs. fact.** This rule governs *intent* — what I want, why I want it, where it
  should go, how far it extends. **Facts are different: go verify them yourself.** Whether a
  file exists, a test passes, a class is final, a function is called anywhere — read the code,
  run the command, check git. Never guess a fact, never assume one, and never assert one you
  have not actually checked. Do not spend a question on something you can establish yourself.
- **Ask immediately**, before acting on the ambiguity — not batched up at the end, and not
  after building something on top of the guess. Stopping mid-task is correct and expected.
- **More than one reasonable reading is enough.** The bar is not "I am completely lost." If my
  instruction supports two sensible interpretations and they would lead to different work, that
  is a gap — ask which one, even when one seems much more likely.
- **Watch for the implicit choices**, which are where guessing actually happens: *where* to put
  something, *what format* it takes, *how much* scope to cover, *whether* to also change the
  adjacent thing. An instruction that is clear about the "what" is often silent on these.
- **Formatting is not intent — decide it yourself.** Make every non-code formatting decision on
  your own, including in docs and comments: whitespace, blank lines, line wrapping, Markdown
  layout. Follow the file's existing style and do not ask me. This covers how text is laid out,
  not what it says.
- **This overrides any default that biases toward acting without asking**, including a harness
  "auto mode" instruction to avoid clarifying questions. When they conflict, this rule wins.
- **Do not paper over a gap by picking the safe option and mentioning it afterwards.** Telling
  me what you assumed, after the work is done, is not the same as asking.
- **A `/resolve-issue` prompt flag is my answer given in advance.** A flag I pass to a run
  answers, for that run, the prompts it covers with their recommendations, and this rule and
  the grade re-check and "Escalate, don't stretch" (R-143 (Work grades) [143-T1]) give way to it
  there; which prompts each flag covers, and what still stops a run, is in
  `~/.claude/skills/resolve-issue/SKILL.md`, "Prompt flags".

## Spartan Labs libraries — surface issues
{"name":"Spartan Labs libraries — surface issues","code":"G-C-SI","id":1126}

Whenever you find a bug, design flaw, missing capability, or other area of concern in any
Spartan Labs organization repo — **`github.com/SpartanLabsGaming/*`** (the games org:
`MyGameServer`, `MyGameClient`, `MyGameTools`) or **`github.com/SpartanLaboratories/*`**
(`WebTools` and other shared libs) — file a GitHub issue for it without asking first: briefly
describe the problem and proposed fix, and tell me what you filed. Have the `admin team` file
it: send it a `file-issue` request (the `admin-team` skill) against the repo the fix belongs in
(the library where the defect lives, not necessarily the one where it surfaced). Repos move between
these orgs; confirm the current owner with `gh repo view <repo>` if unsure.

Comment resolution gets no issue: a code comment or KDoc that needs rewording is fixed on the spot
by the session that finds it, in its current change or, with none in that repository, on a
docs-only branch the `admin team` commits and lands with no issue; a `file-issue` that mixes such
wording into a defect has the defect filed alone, and its reply names the wording dropped.

## Repository READMEs and CHANGELOGs — keep current
{"name":"Repository READMEs and CHANGELOGs — keep current","code":"G-135-P1","id":"135-P1"}

Keeping a repository's `README.md` and `CHANGELOG.md` current with what lands on its default
branch is R-135 (READMEs and CHANGELOGs): read it whenever your work changes what lands there.

## Work grades
{"name":"Work grades","code":"G-143-P1","id":"143-P1"}

Every issue is graded, and its grade decides how much planning, implementation, QA and
versioning its work gets: R-143 (Work grades). Read it before work on an issue starts.

## Version control — the admin team session
{"name":"Version control — the admin team session","code":"G-C-VC","id":1127}

All version control on this machine runs through one long-lived session named **`admin team`**,
the single writer for every repository and for the `.github` mirror. A session never performs a
version-control action itself, and never edits a direction document
(R-10007 (The direction documents) [10007-T1]) itself: it sends the admin team a request
with the `admin-team` skill and acts on its replies. A direction document changes only through
the team, as an edit I direct at its console or as the propagation of a decision I have already
made into the documents that implement it; a new rule is never set without my direction. What
the team does, and how, is R-14 (Admin team) [14-T2].

## Session handoffs
{"name":"Session handoffs","code":"G-C-SH","id":1128}

A session stopped with work unfinished leaves a handoff at `~/.claude/handoffs/<key>.md`. A session
taking up that work reads it first when it exists and has content, which also tells it the work was
interrupted; an empty handoff means nothing to take up. Once its contents are acted on or recorded,
the session clears it (empties the file) rather than deleting it. The key is `admin-team` for the
team and `<owner>-<repo>-<issue>` for a run (e.g. `SpartanLaboratories-WebTools-66`). A session
with no issue has no handoff. Handoffs are local and never mirrored.

A `/resolve-issue` run that finishes leaves a handoff of a second kind only when something it leaves
cannot be committed. Every follow-up that can be committed goes in its `consequences.md`
(R-138 (Planning documents) [138-T2]); the handoff holds only what cannot be, says
the run finished, and points at that `consequences.md`, so it tells no session that work was
interrupted. Each of its items is cleared once a later run or the user acts on it or records it
durably, and the file is emptied when none is left. Later runs in the repository read it for its
follow-ups (`~/.claude/skills/resolve-issue/SKILL.md`, step 1, **Follow-ups**).

## graphify — the code knowledge graph
{"name":"graphify — the code knowledge graph","code":"G-144-P1","id":"144-P1"}

Working in a repository with a `graphify-out/graph.json`, read
R-144 (graphify — the code knowledge graph) before you search or read its code; in a
repository without one it asks nothing.

## Planning documents — folder layout
{"name":"Planning documents — folder layout","code":"G-138-P1","id":"138-P1"}

Every plan follows R-138 (Planning documents) in the organization repository; before planning
new work that has no issue, ask me to file one.

## Dashboards — state boards and work boards
{"name":"Dashboards — state boards and work boards","code":"G-136-P1","id":"136-P1"}

What a repository's boards are, as documentation, is R-136 (Boards as documentation): read it
when your work reads or changes a board.

## Global Claude config — keep the `.github` mirror in sync
{"name":"Global Claude config — keep the `.github` mirror in sync","code":"G-C-M","id":1129}

`SpartanLaboratories/.github` holds a public copy of `~/.claude/` under `claude/`; its
`claude/README.md` maps each mirrored path to its source. Whenever your work changes anything
that copy covers — `CLAUDE.md`, `settings.json`, `hooks/`, `agents/`, `skills/` (including
ones a tool installs, e.g. `graphify`), `nomenclature/`, `shared/`, `general/`, `tools/`,
`rule-index.md`, or `admin-team/` (less the local state the README's "Not included" list leaves
out) — have the copy updated as part of the same change so it matches `~/.claude/` again: send
the `admin team` session a `mirror-sync` request naming the changed paths (the `admin-team`
skill), and it copies, scans and pushes.

## Following a pointer
{"name":"Following a pointer","code":"G-C-FP","id":1130}

A pointer reads `R-<id> (Name)`, as R-1008 (Pointers) [1008-T6] says. To read what it points at,
run the fetch script on it, `node "$SPARTAN_ORG_POLICIES/scripts/rule-fetch.js" R-<id>`: it
prints the rule, section, file or folder, whichever root holds it. When `SPARTAN_ORG_POLICIES` is
not set, or the script says a checkout is missing, send the admin team a `policies-checkout`
request (the `admin-team` skill): the team clones the repository, sets the variable and replies
with the path.

## Policy
{"name":"Policy","code":"G-2-P1","id":"2-P1"}

Every repository of the organization and its sub-organizations meets R-2 (Policy): apply it to
all code generation, refactoring and review.

## Design
{"name":"Design","code":"G-3-P1","id":"3-P1"}

The organization's code aims for R-3 (Design Manifesto): apply it to all code generation,
refactoring and review.

## Library Design — Open-Ended by Default
{"name":"Library Design — Open-Ended by Default","code":"G-132-P1","id":"132-P1"}

A library's public shape follows R-132 (Library Design — Open-Ended by Default): read it before
you design or change anything a consumer can reach.

## Stability tiers
{"name":"Stability tiers","code":"G-131-P1","id":"131-P1"}

The tier a seam sits in, and how an already-closed surface is opened, are R-131 (Stability
tiers): read it before you place a seam or open a closed surface. Placing a seam: if you are
confident which tier something belongs in, make the call; if you are not confident, ask me — do
not default it.

## API documentation and project sites
{"name":"API documentation and project sites","code":"G-104-P1","id":"104-P1"}

A repository's API reference and project site follow R-104 (Dokka and project sites): read it
before you change either, or the build that makes them.

## Commenting & Documentation — Documentation Levels
{"name":"Commenting & Documentation — Documentation Levels","code":"G-11-P2","id":"11-P2"}

Documentation follows R-11 (Documentation levels): read it before you write, change or review
code or its documentation. The decision making process does not belong in code comments.

## Testing — Named Test Sets
{"name":"Testing — Named Test Sets","code":"G-12-P1","id":"12-P1"}

Tests follow R-12 (Testing — Named Test Sets): read it before you write, change, run or review
tests.
