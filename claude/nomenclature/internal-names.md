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
flow) and [`levelrefs.js`](../skills/dashboards/system/scripts/levelrefs.js) (the grades),
which keep them off the boards.

Only the user approves adding or changing a term in this file; the admin team's direction manager
may make the edit. A case for an exception to anything the list bars is brought to the user first:
how the case is put, and how an exception the user grants is recorded, is in the admin team's
brief ([`admin-team.md`](../agents/admin-team.md), "Internal names block a commit").

A barred name in backticks counts in a document or a comment as it does anywhere else. A longer
word that contains one, such as `RoutePlanner` or `ExecutorService`, is not a find.

The list has four sections:

1. **The pipeline's agents, sessions and roles.**
2. **The approval flow.**
3. **Work grades.**
4. **Allowed**, the words that only resemble an entry above, and the exceptions the user has made
   a rule.

## 1. The pipeline's agents, sessions and roles

Each row is headed by its name, a proper noun written as one CamelCase word, and lists the name's
known aliases. The aliases are what the scan matches.

| Name | Aliases | What it is | Allowed when |
|------|---------|------------|--------------|
| **AdminTeam** | **admin team** | The long-lived session every other session sends requests to: version control, the boards, publishing and direction. | never |
| **Planner** | **planner** | The agent that designs a feature or a fix, scaled to its grade. | never |
| **PlanWriter** | **plan-writer** | The agent that turns one system of a settled architecture into an implementation plan. | never |
| **Architect** | **architect** | The agent that produces the grand design for a piece of work. | never |
| **Researcher** | **researcher** | The agent that answers one research question and writes its findings file. | never |
| **Verifier** | **verifier** | The agent that fact-checks the researchers' load-bearing claims. | never |
| **Interviewer** | **interviewer** | The agent that returns the questions about intent that remain. | never |
| **Presenter** | **presenter** | The admin team's agent that builds and keeps the boards. | never |
| **Publisher** | **publisher** | The admin team's agent that releases to Maven Central. | never |
| **RookieDev** | **rookie-dev** | The agent that implements code from a plan. | never |
| **VersionControlManager** | **version-control-manager**, **executor** | The admin team's agent that executes each version-control request. | never |
| **DirectionManager** | **direction-manager** | The admin team's agent that keeps the direction documents. | never |
| **Archivist** | **archivist** | The admin team's agent that keeps the team's records, the idea hooks among them. | never |
| **QA** | **qa** | The agent that runs the quality gate. Barred as an agent's name only. | the qa step, its passes and its data keys (section 4) |
| **CodeReviewer** | **code-reviewer** | The agent that reviews a change set for correctness. | never |
| **DocumentationReviewer** | **documentation-reviewer** | The agent that reviews code against the documentation standard. | never |
| **TestInspector** | **test-inspector** | The agent that audits a change set against the test sets. | never |

## 2. The approval flow

| Term | What it is | Allowed when |
|------|------------|--------------|
| **"the user's call"** | A decision left to the user. | never |
| **"the user chose"** | A decision the user made. | never |
| **"user answers"** | The user's answers to the pipeline's questions. | never |

## 3. Work grades

| Term | What it is | Allowed when |
|------|------------|--------------|
| **"grade 3"** | A grade stated by its number ([`CLAUDE.md`](../CLAUDE.md), "Work grades"). | never |
| **"a grade-4 tracking issue"** | A grade stated of an issue or a unit. | never |
| **"the recorded grade"** | The word in any other form: "grade", "grades", "graded", "re-grade", "work grade", and a hyphenated compound such as "carrier-grade". | never |
| **"work level"**, **"level: 3"**, **"re-level"**, **"a level-3 change"** (or fix, issue, unit, run, feature) | Temporary, until the rule rework's step L12: the old name of a grade. "Level" in a compound such as "top-level" is not one. | never |

## 4. Allowed

| Term | What it is |
|------|------------|
| **"the implementer"** | Whoever builds the change. |
| **The qa step, its passes and its data keys** | "Quality Review 2", the Quality Reviews tile. |
