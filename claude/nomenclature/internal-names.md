# Internal names — what committed content never names
{"name":"Internal names — what committed content never names","code":"G-N-IN","id":126}

The names, phrases and words that committed content never contains: what the commit scan reads, as
R-1122 (What the commit scan reads) [1122-T6] says, every committed document and board (plans, research,
architecture, `consequences.md`, `final-implementation.md`, every board, and the board-event fact
texts that land on one) and the comments in source code among it, and what a board hands out of
its repository (a board's published copy, a Whiteboard's generated part). The list does not reach
the mirror's copies of the direction documents, the files under `claude/` in
`SpartanLaboratories/.github`: the briefs, skills and rules there name the pipeline by design. Committed
content describes the work in the project's own terms; the process lives in the briefs and in the
reports.

The list is read by the admin team's internal-names scan and by the dashboards skill's
[`namerefs.js`](../skills/dashboards/system/scripts/namerefs.js) (the names and the approval
flow) and [`levelrefs.js`](../skills/dashboards/system/scripts/levelrefs.js) (the grades),
which keep them off the boards. A find of the scan blocks the `commit`, `prepare-landing` or
`land` that carries it: the admin team commits nothing and names each `file:line` with the list's
wording to say instead, or that it has none, and the requester rewords the find, by hand where
there is no wording, and resends, or resends asking for an exception (below); a find in a board
the admin team generates is the team's to fix. What the commit scan reads, how each scan finds a
term, and what only resembles one, is in [`finding.md`](finding.md).

Only the user decides adding, changing or removing a term in this file; the admin team's
Communication Clarity Officer makes the edit, and brings to the user the terms it proposes. A case
for an exception to anything the list bars is brought to the user first, save a marker of section
4, which the Communication Clarity Officer adds and writes itself:
how the case is put, and how an exception the user grants is recorded, is in the admin team's
brief ([`admin-team/GUIDANCE.md`](../agents/admin-team/GUIDANCE.md), "Internal names block a commit").

The list has four sections:

1. **The pipeline's agents, sessions and roles.**
2. **The approval flow.**
3. **Work grades.**
4. **Allowed**, the words that only resemble an entry above, the exceptions the user has made a
   rule, and the markers that clear a word's technical sense.

## 1. The pipeline's agents, sessions and roles

Each row is headed by its name, a proper noun written as one CamelCase word, and lists the name's
known aliases. The aliases are what the scan matches, as [`finding.md`](finding.md) says.

| Name | Aliases | What it is | Allowed when |
|------|---------|------------|--------------|
| **AdminTeam** | **admin team** | The long-lived session every other session sends requests to: version control, the boards, publishing and direction. | never |
| **Planner** | **planner** | The agent that designs a feature or a fix, scaled to its grade. | as section 4's markers say |
| **PlanWriter** | **plan-writer** | The agent that turns one system of a settled architecture into an implementation plan. | never |
| **Architect** | **architect** | The agent that produces the grand design for a piece of work. | never |
| **Researcher** | **researcher** | The agent that answers one research question and writes its findings file. | never |
| **Verifier** | **verifier** | The agent that fact-checks the researchers' load-bearing claims. | never |
| **Interviewer** | **interviewer** | The agent that returns the questions about intent that remain. | never |
| **Presenter** | **presenter** | The admin team's agent that builds and keeps the boards. | never |
| **Publisher** | **publisher** | The admin team's agent that releases to Maven Central. | as section 4's markers say |
| **RookieDev** | **rookie-dev** | The agent that implements code from a plan. | never |
| **VersionControlManager** | **version-control-manager**, **executor** | The admin team's agent that executes each version-control request. | as section 4's markers say |
| **DirectionManager** | **direction-manager** | The admin team's agent that keeps the direction documents. | never |
| **CommunicationClarityOfficer** | **communication clarity officer**, **communication-clarity-officer**, **clarity officer**, **CCO** | The admin team's agent that keeps the vocabularies and how a scan finds their words. | never |
| **Archivist** | **archivist** | The admin team's agent that keeps the team's records, the idea hooks among them. | never |
| **QA** | **qa** | The agent that runs the quality gate. Barred as an agent's name only. | the qa step, its passes and its data keys (section 4) |
| **CodeReviewer** | **code-reviewer** | The agent that reviews a change set for correctness. | never |
| **DocumentationReviewer** | **documentation-reviewer** | The agent that reviews code against the documentation standard. | never |
| **TestInspector** | **test-inspector** | The agent that audits a change set against the test sets. | never |

## 2. The approval flow

Each row is headed by a phrase, and a row that names a form lists every word the form takes. The
phrases and the forms are what the scan matches, as [`finding.md`](finding.md) says. A product's
own user is matched as well, so a sentence about one names it in the product's own terms ("the
player", "the caller").

| Term | What it is | Allowed when |
|------|------------|--------------|
| **"the user's call"** | A decision left to the user, or one the user made, named as the user's: "user's" followed by "call", "answer", "answers", "approval", "decision", "choice", "sign-off", "signoff" or "go-ahead", directly or with one word of letters between ("the user's final call", "the user's two answers"). | never |
| **"the user chose"** | A decision the user made or makes: "user" followed directly by "chose", "chooses", "choose", "decided", "decides", "approved", "approves", "confirmed", "confirms", "okayed", "answered", "answers" or "signed off". | never |
| **"user answers"** | The user's answers to the pipeline's questions. | never |
| **"signed off by the user"** | A decision stated in the passive: "signed off", "approved", "decided", "chosen" or "answered", followed by "by the user". | never |

## 3. Work grades

| Term | What it is | Allowed when |
|------|------------|--------------|
| **"grade 3"** | A grade stated by its number (R-143 (Work grades) [143-T10]). | never |
| **"a grade-4 tracking issue"** | A grade stated of an issue or a unit. | never |
| **"the recorded grade"** | The word in any other form: "grade", "grades", "graded", "re-grade", "work grade", and a hyphenated compound that holds it. | as section 4's markers say |

## 4. Allowed

| Term | What it is |
|------|------------|
| **"the implementer"** | Whoever builds the change. |
| **The qa step, its passes and its data keys** | "Quality Review 2", the Quality Reviews tile. |

### Markers

A word below is no find where one of its markers stands directly before it or joins it in a
compound ("dispatch executor", "carrier-grade"), where one of its markers after follows it
("publisher key"), and, where its row says "no find", where the word itself stands in code. How a
scan reads each is in [`finding.md`](finding.md).

The markers are the Communication Clarity Officer's to manage, for any word the list bars: it adds
and removes them, writes them here and points the word's row at them, each a technical modifier or
a compound part, and none that would let through a use of what the word's row bars. Whether a word
is read in code form stays the user's, as does every term, wording and other exception.

| Word | Markers | Markers after | In code form |
|------|---------|---------------|--------------|
| **executor** | `backed`, `Caffeine`, `common-pool`, `daemon`, `dispatch`, `dispatcher`, `keepalive`, `library-created`, `liveness`, `maintenance`, `probe`, `retransmit`, `same-thread`, `shut-down`, `shutdown`, `single-thread`, `single-threaded`, `sweep`, `tick` | none | no find |
| **planner** | `build` | none | a find |
| **publisher** | `API`, `key` | `API`, `key`, `Pro` | no find |
| **grade** | `carrier` | none | a find |
