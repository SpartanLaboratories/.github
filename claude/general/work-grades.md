# Work grades
{"name":"Work grades","code":"G-G-WG","id":143,"pointerMark":1}

Every issue is graded (the word is defined in R-10023 (grade) [10023-T1]): its grade is
recorded by the admin team in its local state, never on GitHub, and never stated in a committed
board or document. The grade decides how much planning, implementation, QA and versioning the
work gets; `/resolve-issue` and its agents scale to it.

## The four grades
{"name":"The four grades","code":"G-G-WG-FG","id":1131}

| Grade | What it is | Planning | Built this run? | Kind of change |
|-------|------------|----------|-----------------|--------------|
| 1 | **No impact** — comments, KDoc, Markdown docs only. No executable line changes. | none; no plan folder | yes | `docs:` |
| 2 | **Small fix** — a bug fix that changes no public API, persisted or shared state, or wire format, and stays local to one component. | short `plan.md` (root cause, fix, regression test) | yes, test-first | `fix:` |
| 3 | **Small feature** — new or changed behaviour inside **one** system: additive public API, a new class or option. | interview, targeted research, one `plan.md` | yes | `feat:` |
| 4 | **Large feature / roadmap** — anything that spans **more than one** system. | full pipeline up to the architecture; **plan only** | **no** — each system becomes a sub-issue, resolved later at its own grade | `docs:` (planning documents only) |

- A breaking change is never grade 1 or 2.
- **The version follows the kind of change.** The table gives the kind each grade's change
  takes; R-25 (Versioning) [25-T3] says whether the change moves a version, which part, and which
  commit type a change that moves none takes.

## The grade is re-checked when work starts
{"name":"The grade is re-checked when work starts","code":"G-G-WG-RC","id":1132}

If the issue, or the code it touches, says the recorded grade is wrong, or none is recorded,
propose a grade with the evidence and ask me. Never re-grade silently.

## Escalate, don't stretch
{"name":"Escalate, don't stretch","code":"G-G-WG-ES","id":1133}

When work turns out bigger than its grade (a grade-1 change needs code, a grade-2 fix changes
public API or state, a grade-3 feature needs a second system), stop and ask me to re-grade it.
Never quietly do bigger work under a smaller grade.
