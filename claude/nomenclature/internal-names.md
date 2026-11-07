# Internal names — what committed content never names

The names, phrases and words that committed content never contains: every committed document and
board (plans, research, architecture, `consequences.md`, `final-implementation.md`, every board,
and the board-event fact texts that land on one) and the comments in source code. The rule that
applies the list, what is scanned and what a find blocks, is in [`CLAUDE.md`](../CLAUDE.md), "No
internal names in committed content". Committed content describes the work in the project's own
terms; the process lives in the briefs and in the reports.

The list is read by the admin team's internal-names scan, which blocks a commit that carries a
find, and by the dashboards skill's
[`namerefs.js`](../skills/dashboards/system/scripts/namerefs.js) (the names and the approval
flow) and [`levelrefs.js`](../skills/dashboards/system/scripts/levelrefs.js) (the work levels),
which keep them off the boards.

Only the user adds or changes a term in this file.

The list has four sections:

1. **The pipeline's agents, sessions and roles.**
2. **The approval flow.**
3. **Work levels.**
4. **Allowed**, the words that only resemble an entry above.

## 1. The pipeline's agents, sessions and roles

| Term | What it is | Allowed when |
|------|------------|--------------|
| **admin team** | The long-lived session every other session sends requests to: version control, the boards, publishing and direction. | never |
| **planner** | The agent that designs a feature or a fix, scaled to its work level. | a library's name that only coincides (OkHttp's `RoutePlanner`) |
| **plan-writer** | The agent that turns one system of a settled architecture into an implementation plan. | never |
| **architect** | The agent that produces the grand design for a piece of work. | a library's name that only coincides |
| **researcher** | The agent that answers one research question and writes its findings file. | never |
| **verifier** | The agent that fact-checks the researchers' load-bearing claims. | a library's name that only coincides (a domain `verifier` in the code) |
| **interviewer** | The agent that returns the questions about intent that remain. | never |
| **presenter** | The admin team's agent that builds and keeps the boards. | a library's name that only coincides |
| **publisher** | The admin team's agent that releases to Maven Central. | a library's name that only coincides (a Reactive Streams `Publisher`) |
| **rookie-dev** | The agent that implements code from a plan. | never |
| **version-control-manager** or **executor** | The admin team's agent that executes each version-control request. | a library's name that only coincides (a `java.util.concurrent.Executor`) |
| **direction-manager** | The admin team's agent that keeps the direction documents and the idea hooks. | never |
| **qa** | The agent that runs the quality gate. Barred as an agent's name only. | the qa step, its passes and its data keys (section 4) |
| **code-reviewer** | The agent that reviews a change set for correctness. | never |
| **documentation-reviewer** | The agent that reviews code against the documentation standard. | never |
| **test-inspector** | The agent that audits a change set against the testing hierarchy. | never |

## 2. The approval flow

| Term | What it is | Allowed when |
|------|------------|--------------|
| **"the user's call"** | A decision left to the user. | never |
| **"the user chose"** | A decision the user made. | never |
| **"user answers"** | The user's answers to the pipeline's questions. | never |

## 3. Work levels

| Term | What it is | Allowed when |
|------|------------|--------------|
| **"level 3"** | A work level stated by its number ([`CLAUDE.md`](../CLAUDE.md), "Work levels"). | the project's own test levels (section 4) |
| **"a level-4 tracking issue"** | A work level stated of an issue or a unit. | never |

## 4. Allowed

| Term | What it is |
|------|------------|
| **The project's own test levels** | Level 2 component, 4a, …: the testing hierarchy's levels, never a work level. |
| **"the implementer"** | Whoever builds the change. |
| **A library's name that only coincides** | OkHttp's `RoutePlanner`, a Reactive Streams `Publisher`, a `java.util.concurrent.Executor`, a domain `verifier` in the code. |
| **The qa step, its passes and its data keys** | "Quality Review 2", the Quality Reviews tile. |
