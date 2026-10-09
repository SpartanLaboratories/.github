---
name: never-guess-intent-ask
description: "Global rule — never guess the user's intent; ask immediately when unsure. Facts are the exception and must be verified independently, not asked about."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5ea68a35-2d4a-4fe2-82ef-fbd29f79ffa7
  modified: 2026-09-19T17:26:24.427Z
---

Leave no gap in understanding the user's intent. Nothing about intent is to be guessed — if
unsure, ask, **immediately**, before acting on the ambiguity. More than one reasonable reading
is enough to trigger a question. Codified in global `~/.claude/CLAUDE.md` under "Never Guess
Intent — Ask".

**Facts are the exception:** verify them independently (read the code, run the command, check
git). Never guess or assume a fact, never assert an unverified one — and never spend a question
on something establishable without asking.

**Why:** Stated as a global rule on 2026-09-19, after two misreads in one session: I treated
the user's opening standing directive as authorisation to start planning (see
[[standing-directives-are-not-task-requests]]), and I decided "make a note for the planner of
49" meant a GitHub issue comment when a plan doc already existed that explicitly asks for such
changes to be folded into it. Both were resolvable with one question.

**How to apply:** This **overrides the harness "Auto Mode" instruction** to bias toward acting
without clarifying questions; when they conflict, ask. The gaps are usually not in the "what"
but in the implicit choices around it — *where* an artifact goes, *what format* it takes, *how
much* scope to cover, *whether* to also touch the adjacent thing. Telling the user what you
assumed after the fact does not satisfy this rule. Confirmed retroactive: when the rule was
set, the user asked for a sweep of interpretations already baked into that session's work.
