# Handoff: direction-document review findings

For the agent that picks up fixing them. Read all of this before you edit anything.

## What this is

On 2026-10-29 the direction documents in `SpartanLaboratories/.github` (the public mirror of the
user's `~/.claude/`, under `claude/`) were reviewed for stale, contradictory, redundant and
low-quality directions. This file is that review's findings, sorted by what you may do with each.

- **Baseline:** `main` at `97a583d`. It had not moved as of 2026-11-01. All line numbers refer to it.
  Re-read every cited line before you edit, and treat a moved line as a reason to re-check, not to
  guess.
- **Paths** are relative to `claude/` unless they start with `.github/` or name the repo root
  (`CONTRIBUTING.md`).
- **Scope reviewed:**
  - `CLAUDE.md` and all 16 `agents/*.md`
  - `admin-team/PROTOCOL.md`, both `settings.json` files, `hooks/` and the launchers
  - `commands/`
  - `skills/admin-team`, `skills/resolve-issue`, `skills/upgrade` and `skills/dashboards`
    (`SKILL.md`, `GUIDANCE.md`, `plan/RULES.md`, `system/RULES.md`, checked against their scripts)
  - The org `CONTRIBUTING.md`, as a cross-check

  **Not reviewed:** the third-party skills (`firecrawl*`, `graphify`, `vercel-connect`).
- **Not seen:** `~/.claude/admin-team/ledger.jsonl` and `hooks.jsonl` (local, never mirrored). Before
  acting, check them for a `user-decision` or an open hook that already covers a finding.
- **Confidence:**
  - Everything outside the dashboards rulebooks was read and checked directly.
  - The dashboards findings (IDs prefixed `D`) come from two sub-reviews that quoted each item. About
    12 of them were re-checked against the files and all held; the rest are unverified, so confirm
    each before editing.
  - Two facts come from the Claude Code docs, not from a test: under `claude --agent`, the main thread
    takes on the agent's tool restrictions; and `claude --resume` does not restore `--settings`.

## Rules you work under

These come from `agents/direction-manager.md` and `CLAUDE.md` ("Version control — the admin team
session").

1. **Edit `~/.claude/`, not the mirror.** `claude/` is a copy, updated only by the admin team's
   `mirror-sync`. On the user's machine, changes go through the admin team's `direction-manager`
   (modes `apply` / `propose`), then a `mirror-sync`.
   - If you are a cloud agent with only this repo, prepare the changes as a diff or a branch for the
     user to apply.
   - Never push edits to `claude/` on `main`: that silently desyncs the mirror.
2. **Never set policy.** Section A lists *propagations*: decisions the user already made that a
   document doesn't yet carry. You may apply those and report the diff. Section C lists open
   decisions: present them to the user as options with a recommendation, and apply nothing there
   until the user directs it. If a propagation turns out to force a choice, stop and list the choice.
3. **Never edit `settings.json`** (either file): it is the user's alone. Settings findings are in C.
4. **Write the rule, not its history.** No "previously", "as before", "used to", and no ledger-id
   citations in a direction document.
5. **One home per rule.** When a rule appears twice, keep the better copy and replace the other with a
   pointer. A subagent sees only its own brief, though, so a rule it must follow needs either its own
   copy or an instruction to read a named shared file (see E1).
6. **Nothing private in a mirrored file.** No credentials, session ids, machine-local paths or
   personal data.
7. **Match each file's wording, layout, wrapping and line endings** (LF).

**Report per the direction-manager's shape:**
- the mode and outcome
- a `diff -u` per file
- the finding IDs you closed
- any hooks you filed or touched
- the paths to mirror-sync
- the open choices, each with a recommendation

---

## A. Propagations — decided; apply and report the diff

**A1. `/resolve-issue` names gates that no longer exist.**
- Where: `skills/resolve-issue/SKILL.md:15-16` ("stops only at its gates - a history rewrite,
  deleting what it did not create") and `:34-35`.
- The decision: the one gate is removing a worktree with uncommitted changes (`CLAUDE.md:99-104`,
  `agents/admin-team.md:222-231`).
- Fix: name that gate only.

**A2. The work level is still called a label.**
- Where: `skills/resolve-issue/SKILL.md:94-99` ("the level (label and your check)", "If the label is
  missing…") and `:146-147` ("a label the check disagrees with").
- The decision: levels live in the team's state, never on GitHub (`CLAUDE.md:60-61`). Step 1 already
  asks for the recorded level through `status`.
- Fix: say "the recorded level".

**A3. Upstream and downstream inverted.**
- Where: `skills/resolve-issue/SKILL.md:507-508`: "a defect in a repo the project *consumes*
  (downstream), report it as coordination — do not file it".
- The problem: a repo the project consumes is *upstream*, and upstream defects are filed.
- Fix: "a repo that consumes the project (downstream)".

**A4. Issue filing goes through `file-issue`.**
- Where: `skills/resolve-issue/SKILL.md:461-462` ("files an upstream issue if the work exposed one",
  inside the `land`), `:500-501` ("any upstream issue `version-control-manager` filed") and
  `:507-508`.
- The decision: `CLAUDE.md:36-38`, where any session sends the admin team a `file-issue` request.
- Fix: describe that path. The `land` doesn't file issues.

**A5. Test scope.**
- The decision: `CLAUDE.md:419-423`, run only the tests that exercise the change.
- Outliers:
  - `agents/version-control-manager.md:281` ("with the full suite green")
  - `agents/rookie-dev.md:77` ("then the build and the rest of the suite")
  - `agents/test-inspector.md:47`, `:84` and `:294` ("full-suite run"; its own §5.1 is already
    change-scoped)
- Fix: reword each to "the change's tests".

**A6. Board events during research name the wrong levels.**
- Where: `agents/planner.md:484`, "Board events during research (levels 2–4)".
- The problem: level 2 has no research (`planner.md:53`).
- Fix: say levels 3–4.

**A7. The research commit SHAs have no source.**
- Where: `agents/planner.md:741` and `:757` ("the research commits `version-control-manager` made, by
  SHA") and `skills/resolve-issue/SKILL.md:239-240` ("the research commit SHAs `planner` reported").
- The problem: the planner's research commits are fire-and-forget, and the replies land in the
  caller's conversation (`planner.md:307-311`).
- Fix: the planner reports request ids, and the caller takes the SHAs from the team's `done` replies.

**A8. Plan-writer assumes an architecture document exists.**
- Where: `agents/plan-writer.md:4-9` ("from a settled architecture"), `:20-23` ("openness and their
  stability tiers are already decided"), `:132-144` and `:166-167` (`Architecture:` required in the
  header).
- The decision: at plain level 3 there is no architecture, and the plan-writer designs the system's
  shape in the plan's **Design** section (`planner.md:109-111`).
- Fix: make the architecture conditional (a sub-issue of a level-4 plan) and give the plain level-3
  case its own instructions.

**A9. Progress notes vs. read-only boundaries.**
- The decision: every agent in a `/resolve-issue` run writes a progress note
  (`skills/resolve-issue/SKILL.md:420-424`).
- Outliers:
  - `agents/verifier.md:58` ("You create and change no file")
  - `agents/interviewer.md:108` ("create no file")
  - `agents/test-inspector.md:288-290` ("The only file you may write")
- Fix: add the progress-note exception to those boundaries.

**A10. The internal-names scan: trigger, scope and list.**
- Trigger:
  - `CLAUDE.md:211`, `agents/admin-team.md:142` and `admin-team/PROTOCOL.md:182` say "a `commit` or
    `land`".
  - `agents/version-control-manager.md:151` says "a `commit` or a `prepare-landing`".
  - Every request that commits must be scanned (`CLAUDE.md:211`: "a find blocks the `commit` or
    `land` that carries it"), and `prepare-landing` commits the code and the bump.
  - Fix: say "every request that commits: `commit`, `prepare-landing`, and the `land`'s re-sync
    merge".
- Scope:
  - `version-control-manager.md:158` (and `admin-team.md:143-144`) cover `docs/`, `README.md`,
    boards and comments.
  - `CHANGELOG.md`, a committed document under `CLAUDE.md:201-213`, is not covered. Add it.
- List: `direction-manager` is an agent of the pipeline but is missing from every copy of the
  names list. Add it.
  - The script side is D-B5.

**A11. Mirror-sync vs. "never commit on the default branch".**
- The conflict:
  - `agents/version-control-manager.md:193` says "Never commit on the default branch", with no
    exception.
  - `agents/admin-team.md:374` says "never commit anything to a default branch outside a landing".
  - But the same executor runs `mirror-sync`, which commits straight to `main` (`CLAUDE.md:297`,
    `admin-team.md:164`).
- Fix: state the mirror lane's exception in both places.

**A12. `needs-rework` names only the `land`.**
- Where: `admin-team/PROTOCOL.md:163`: "A `land` whose base moved under its files".
- The problem: the sync runs at `prepare-landing` now (`PROTOCOL.md:83-88`, `admin-team.md:169-178`).
- Fix: name `prepare-landing` (and `land` for the re-check).

**A13. CLAUDE.md's list of mirrored paths is incomplete.**
- Where: `CLAUDE.md:291-292`.
- The problem: it omits `admin-team/` (the protocol, its settings and the launchers), which
  `README.md:18` mirrors. So a protocol change has no rule sending it to `mirror-sync`.
- Fix: add it.

**A14. Who retitles an issue.**
- Where: `skills/dashboards/GUIDANCE.md:336` and `skills/dashboards/system/RULES.md:432` and `:491`,
  which say "the admin team brings it to the user to retitle".
- The decision: `agents/admin-team.md:304-308`, where the team queues the retitle itself under the
  executor's standing permission.
- Fix: align the dashboards text (or point to admin-team.md).

**A15. A missing level is guessed.**
- Where: `agents/qa.md:11` and `:26` default a missing level to 3.
- The decision: CLAUDE.md "Never Guess Intent" (`:3-28`), and the planner halts and asks
  (`planner.md:46-47`).
- Fix: qa stops and asks for the level.

**A16. The default branch is hard-coded as `master`.**
- Where: `skills/resolve-issue/SKILL.md:134` and `:215`, `agents/planner.md:131` and
  `agents/rookie-dev.md:129`.
- The problem: some repos use `main` (this one does).
- Fix: say "the default branch".

**A17. History wording.**
- Where:
  - `agents/version-control-manager.md:72` ("the two that used to wait for the user")
  - `skills/resolve-issue/SKILL.md:467` ("any more")
  - `agents/planner.md:505` ("as before")
  - `agents/test-inspector.md:93` ("as before")
- Fix: drop each history clause.

**A18. The Dokka repo list is a dated fact.**
- Where: `skills/resolve-issue/SKILL.md:334-337` ("today MyGameTools does…; WebTools, GeneralTools
  and MyGameServer do not").
- The problem: the rule already says to check for the plugin.
- Fix: drop the repo list.

**A19. A machine-local path in a mirrored file.**
- Where: `admin-team/PROTOCOL.md:24` and `:30`, example `<main-checkout-path>`.
- Fix: use a neutral placeholder such as `<main checkout>`.

**A20. Redundant grant.**
- Where: `agents/admin-team.md:241-244` ("Stale branches") is already covered by the all-GitHub
  standing grant at `:224-226`.
- Fix: fold it in, keeping the "remove its clean worktree" clause.

**A21. `launch.sh` is undocumented.**
- Where: `admin-team/PROTOCOL.md:10` and `skills/admin-team/SKILL.md:37-39` know only
  `launch.cmd`.
- Fix: mention `launch.sh` (Git Bash, and `--teleport`), or decide it is user-only. If the latter,
  move it to C.

**A22. The admin team's tools omit `AskUserQuestion`.**
- Where: `agents/admin-team.md:20` lists `tools: Agent, Read, Grep, Glob, Bash, Write, Edit,
  SendMessage, ListAgents`.
- The problem: the brief asks through `AskUserQuestion` (`:84`, `:228`, `:447`; the one gate and
  failed publishes depend on it). Per the docs, a `--agent` session takes the agent's tool
  restrictions.
- First, have the user confirm on the machine whether the team can call `AskUserQuestion`.
- Fix: if it can't, add `AskUserQuestion` (and `ToolSearch` / `Monitor` if the team needs them) to
  the frontmatter. This makes the brief work as written; it sets no new rule.

**A23. Dashboards text that still describes the old flows.** These are propagations of the Document
step (`CLAUDE.md:222-230`, `admin-team.md:194-198`: boards built in the Document step and stamped at
the code-landing commit, nothing restamped at the land, the landed state seeded at the next `sized`)
and of "the document-landing commit carries the boards":
- **D-A1** `plan/RULES.md:948-951`: "the team commits the folder on the issue's branch" at every
  event. It contradicts `CLAUDE.md:239-240`, `admin-team.md:317-322` and `PROTOCOL.md:140-141`.
- **D-A2** `plan/RULES.md` names three commit moments (`:1006`, `:1308`, `:1310`), none of them the
  document-landing commit (`resolve-issue/SKILL.md:380-387`). State the one rule once (§6) and point
  to it.
- **D-A3** `system/RULES.md:502-503`: "the landing restamps it to the merge". Say instead that the
  Document step's state-boards task stamps at the code-landing sha.
- **D-A4** `system/RULES.md:487`, `:488`, `:494`, `:505-507`: working instructions for a post-merge
  `landed` restamp. Delete them, or reduce them to one "older requests, read alike" line.
- **D-A5** `GUIDANCE.md:602-606` ("The landing in three steps: landing, state boards, merge") and
  `:684`, `:699-701` (the pre-merge flow as current). Reduce them to the read-compat note at
  `:623-624`.
- **D-A6** `system/RULES.md:96-97`, `:309-310` and `GUIDANCE.md:286-287`: `asIs` and `landed`
  semantics from before the Document step. Restate: `landed: false` at implementation stages, absent
  from the Document stamp on, and `ref` = the branch.
- **D-A7** `plan/RULES.md:728` and `:992`: the remediation wording uses the old route ids
  (`planner-then-rookie-dev`), agent names, and "then landing". Use `on-the-spot` / `remediation` /
  `re-plan-then-remediation` and "then the Document step", matching `plan/template/dashboard.html`.
- **D-A8** small stale items in `plan/RULES.md`:
  - `:506` "**Impact**": the tab is Consequences
  - `:1047` `facts.premerge` → `facts.document`
  - `:997` "the state boards' visit frozen" → "the landing's visit"
  - `:321` "The As built tile in the header": per `:212` there is no header KPI row; it is on the
    Timeline tab
  - `:1297` "regenerated only at landings": on the default branch only; on a branch, also at the
    state-boards task and at a seeding `sized`
- **D-A9** `state-boards` is called a "step" in `admin-team.md:182-183` and `:357`,
  `PROTOCOL.md:94`, and `resolve-issue/SKILL.md:375` and `:433`, but the rules make it a
  Document-step *task* (`plan/RULES.md:993`, `:996`).
- **D-A10** `PROTOCOL.md:126` lists the team-raised events as `state-boards`, `landing`, `merge` and
  `landed` only. `sub-issues-filed` and `boards-created` are team-raised too (`plan/RULES.md:987-988`,
  `admin-team.md:297-303`). Add them, but after C3 settles their order.
- **D-A11** "One home per rule" violations inside the dashboards skill. These change no meaning, but
  they are large, so do them as `propose` first.
  - The landing and seeding story is told about 6 times across the files and about 9 times in
    `plan/RULES.md`. The occurrences are at `:242-243`, `:296-299`, `:934-935`, `:998`, `:1061`,
    `:1111-1113`, `:1118-1160` and `:1308`, plus `GUIDANCE.md:622-649` and `SKILL.md:81-88`.
    Undefined variants such as "landing refresh" (`plan/RULES.md:455-456`) have crept in.
  - `plan/RULES.md` restates `GUIDANCE.md`:
    - issue links: `:73-92` vs `GUIDANCE.md:353-363`
    - titles quoted verbatim: `:94-98` and `:1081-1084` vs `GUIDANCE.md:330-337`
    - level and name rewording: `:1067-1084` and `:1317-1320` vs `GUIDANCE.md:292-326`
  - The verify-cache procedure is written out three times: `SKILL.md:38`, `system/RULES.md:45` and
    `:338-343`.
  - The built-or-planned rule is written out four times: `SKILL.md:76-77`, `system/RULES.md:116-118`,
    `:317-322` and `:497-500`.
- **D-A12** History in the rules:
  - About 75 citations of local ledger ids (`admin-team/dashboards-skill/NN` and bare
    `dashboards-skill/NN`) across `GUIDANCE.md` (about 21–29), `plan/RULES.md` (about 40–52),
    `system/RULES.md` (about 11–16) and `SKILL.md:83`. No script depends on them: `features.js` keys
    on its own `since:` numbers, and `history.js` on `verified.json`.
  - `GUIDANCE.md:534-701` is a decision changelog organised by request ("The decisions of
    admin-team/dashboards-skill/28…"). It is also where most of D-A5 lives.
  - `plan/RULES.md:1044-1049`, "Moved so far", is a changelog that ends in a fragment.
  - Strip all of it. Keep any per-board-type exception as a rule in the section it belongs to.
- **D-A13** Lists that drifted:
  - `SKILL.md:38` omits `verify/cases-live-view.js`.
  - The "ships" table in `system/RULES.md:30-48` omits `levelrefs.js`, `cliargs.js` and `history.js`.
  - The example `plan/examples/38-handshake-empty-name/` still has `impact.md`. Label it as an older
    folder, or the presenter updates it.
- **D-A14** Typos and layout:
  - `GUIDANCE.md:262` ("A new board or board")
  - `:482-483` ("a\nissue board's")
  - `:398-399` (a run-in heading)
  - `system/RULES.md:454-458` (flag text in an unrelated paragraph; also "about 512 px" vs 520 in
    GUIDANCE §6)

## B. Dashboards defects the presenter fixes on its own

`CLAUDE.md:281-283`: "The presenter fixes dashboard defects at its own discretion … in the
`dashboards` skill's templates, examples and scripts — and reports each skill fix so the `.github`
mirror is synced." The direction-manager doesn't edit scripts. Hand these to the presenter through
the admin team, or flag them.

- **D-B1** `skills/dashboards/plan/scripts/board.js:175` (`levelOf`) and `:280` build repository
  work-board rows from GitHub `level: N` labels, which no longer exist (`CLAUDE.md:60-61`). Rows for
  sized issues without a board drop off silently. The matching rule text is `plan/RULES.md:1166` and
  `:1247-1248`. Take the level from the team's recorded sizing (passed in the event or request)
  instead.
- **D-B2** The `state-boards` request vs. `apply-state.js`.
  - `PROTOCOL.md:58-59` and `:90-93` give the request a top-level `head` and no `facts`.
  - `system/scripts/apply-state.js:141-148` reads only `facts.document` and `facts.sha` / `req.sha`,
    and never `head`. Run on the request as documented (`SKILL.md:64-66`, `system/RULES.md:477`,
    `:487`, `:492`), it stamps the worktree HEAD "· not yet landed".
  - Either the script treats `action: "state-boards"` + `head` as the Document stamp, or the docs say
    who sets `facts.document: true` and `facts.sha`.
  - Also name one runner for that stamp: `SKILL.md:64` says the team, and `agents/presenter.md:136-139`
    says the presenter.
- **D-B3** The level-4 `branch-cut`.
  - `plan/RULES.md:990` and `apply-event.js:391` set `wip.step = implementation` on a tracking board,
    which has no `branch` step (`:873-878`). `resolve-issue/SKILL.md:413` sends `branch-cut` at
    level 4 too.
  - Fix: give the tracking board its own `branch-cut` line (record the branch, keep the step).
- **D-B4** The final `boards-created`, and the non-tracking sign-off, move to `landing` and skip
  `document` (`plan/RULES.md:986`, `:988`; `apply-event.js:338`, `:374`), against the steps line at
  `:874-876` / `new.js:30`. Move them to `document`.
- **D-B5** `system/scripts/namerefs.js:21` (`UNAMBIGUOUS`) lacks `direction-manager` / "direction
  manager". This is the script side of A10.
- **D-B6** The research-planning glow.
  - `plan/RULES.md:666-668`, `:979` and `:981` make it the whole Considered column.
  - `:644` and `:672-675`, and the code (`lib.js:1149-1151` `researchGlow`, `new.js:116`), glow
    nothing on a board without rows.
  - Fix: say "`considered` on a board with rows, nothing on one without".
- **D-B7** A tracking plan's own `landed` is unspecified (`plan/RULES.md:998`; `:876-878`). Add the
  tracking case.
- **D-B8** `wip.landing` is used at `plan/RULES.md:864-865` and read in `lib.js:890`, but §3
  (`:533-628`) never defines it and no script writes it. Define it or drop it.
- **D-B9** The `enrich` trigger list (`plan/RULES.md:1086-1093`) includes "an `implementation-stage`
  that reports … a qa verdict", which never happens. Turn it into an event → condition table.
- **D-B10** Sub-issue Gap and Considered timing: `plan/RULES.md:154-155`, `:673` and `:1440` say "at
  `sized`", while `:1004-1006` fills them when the board is laid. Say "when its board is laid, else
  at `sized`".

## C. Open decisions — present them to the user; apply only on direction

Each comes with the options and a recommendation. Before presenting one, check the ledger for an
existing `user-decision` or hook. If you can't reach the user, file a hook (`log-hook`) for each.

**C1. The force-push grant is blocked by settings.**
- Where: `admin-team/settings.json:48-53` denies `git push --force`, `-f`, `--force-with-lease` and
  `git reset --hard`.
- Against: `CLAUDE.md:100-102`, `admin-team.md:224-226` and `version-control-manager.md:70-78`
  ("prefer `--force-with-lease`") grant force-pushing.
- Also: `admin-team.md:47-49` rejects any request that asks for a force-push. Reword it to "a
  request cannot widen policy", without naming force-push.
- Recommendation: drop the three force-push denies and keep `reset --hard` denied (it matches VCM's
  safety rail at `:81`).
- Settings are the user's to edit.

**C2. Global `settings.json` (the user's).**
- Leftovers from before the single writer:
  - the allow rules `git push`, `gh pr create`, `gh pr merge`, `gh issue comment`,
    `git push origin --delete`, `git branch -D` and the two Maven publish tasks (`:13-20`)
  - the `autoMode.allow` entries for merging and branch deletion (`:50-51`)
- An out-of-date `autoMode.environment`: "Trusted repo" is MyGameTools only (`:76`), "master
  (default)" (`:60`), and "Java game tooling — javac" (`:75`; the repos are Kotlin).
- `modelSettings` names `claude-sonnet-5` (`:40`).
- Recommendation: remove the allow rules (the admin team has its own settings file), and update the
  environment to both orgs, per-repo default branches and Kotlin/Gradle.

**C3. `admin-team/settings.json:46`.**
- What it is: a one-off allow rule for
  `bash C:/Users/<user>/.claude/admin-team/backups/rewrite-mirror-history.sh`.
- The problem: `backups/` isn't mirrored, the rewrite looks done, and the rule puts a Windows user
  path in a public repo.
- Recommendation: remove it.

**C4. Resuming the admin team.**
- `CLAUDE.md:124` and `admin-team/launch.cmd:5` say "Resume after a restart with `claude --resume
  "admin team"`".
- `admin-team/launch.sh:10` says that "does not work" for a renamed or teleported session.
- Per the docs, `--resume` doesn't restore `--settings`, so a resumed team runs without
  `admin-team/settings.json`.
- Recommendation: document the launcher as the restart path (the team rebuilds from its ledger), or
  a resume that re-passes `--settings` and `--remote-control`.

**C5. Same-repo issue filing.**
- `agents/version-control-manager.md` Gate 2 (`:51-68`, `:291-297`, and the description at `:9-13`)
  files only against an upstream dependency. Sub-issues are "the one same-repo exception".
- `CLAUDE.md:30-39` files any defect in a Spartan Labs repo against "the repo the fix belongs in".
- `admin-team.md:162` applies VCM's rules to `file-issue`.
- `skills/upgrade/SKILL.md:65-68` files its upgrade issue in the same repo (`github` = `surfacedIn`),
  which Gate 2 forbids.
- Recommendation: widen Gate 2 to CLAUDE.md's rule. Keep "never against a downstream consumer" and
  "never about the change being landed".

**C6. The order of a tracking (level-4) plan.**
- After the land: `resolve-issue/SKILL.md:472-478` and `version-control-manager.md:260-266` file the
  sub-issues after the docs PR merges.
- Before the land:
  - `admin-team.md:297-303` and `plan/RULES.md:874-876`, `:986` and `:1001-1006` file them and lay
    the unit boards before the land, "committed with the tracking plan's land".
  - The scripts follow that order: `new.js:30`, `apply-event.js:338`, `GUIDANCE.md:143`.
- Option a: file the sub-issues in the Document step, before the document-landing commit, so the
  unit boards land with the plan. Two documents change, and the scripts already fit.
- Option b: keep after-land filing and move the board steps (and the unit boards' commit, via the
  first unit's seeding) to match.
- Recommendation: a. Risk: a land that then fails leaves filed sub-issues pointing at an unmerged
  plan.

**C7. Work levels in committed data.**
- `plan/template/plan.json:9` (and `:341`) carry `"level": 3`. `GUIDANCE.md:297-298` allows
  `level`, `unit.level` and `wip.proposedLevel` as data.
- `plan.json` is committed and embedded in the board, while `CLAUDE.md:61` says a level is "never
  stated in a committed board or document".
- Recommendation: remove the level from committed data and have the scripts take it from the event
  or request. Otherwise, write the exception into CLAUDE.md.

**C8. VCM's standalone mode.**
- Nothing spawns `version-control-manager` except the admin team (`CLAUDE.md:90-92`).
- Its brief still describes a general-purpose mode:
  - the description (`:3-18`)
  - "You are **Manager**" (`:22`)
  - tagging outside executor mode (`:33-34`)
  - Gate 1, "publish only on the user's explicit instruction" (`:40-49`, `:279-282`, `:373-377`),
    which contradicts the publisher's automatic releases.
- Recommendation: make it executor-only, delete Gate 1 and the standalone report blocks, and rename
  the persona.

**C9. `commands/*.md`.**
- `bugfixrelease.md`, `feature.md` and `minor.md` say "Commit to master", run
  `./gradlew publishAndReleaseToMavenCentral` and `git push origin master --follow-tags`.
- `fixonupdate.md` polls every 2 minutes for a MyGameTools release. None ends with a newline.
- All of it contradicts the single writer and the publisher.
- Recommendation: delete them and update `README.md`'s table and `CLAUDE.md:291-292`. Otherwise,
  rewrite them as admin-team requests.

**C10. The dead multi-plan Stage 4.**
- `agents/planner.md:608-664` (several plan-writers in parallel, the cross-plan alignment pass) and
  `plan-<unit-slug>.md` (`CLAUDE.md:157`, `plan-writer.md:121`, `rookie-dev.md:122`) never run:
  level 3 has one unit, and level 4 has no stage 4.
- Recommendation: reduce Stage 4 to the single-plan case and drop `plan-<unit-slug>.md`.

**C11. Planner Stage 5, "Not yet specified".**
- Where: `agents/planner.md:38`, `:668-675` and `:759`. It is the user's own placeholder.
- Options: specify it, or keep it but stop requiring every report to repeat it.

**C12. `Commit: TBD` / `PR: TBD` have no owner.**
- `plan-writer.md:139-144` leaves them "for the executor", and `rookie-dev.md:40-41` "for the human
  or the `version-control-manager` agent". The executor never edits documents
  (`version-control-manager.md:167-168`, `:228`), so they are committed as TBD.
- Recommendation: the planner fills `Commit:` with the code-landing sha at reconcile-plan, and the
  `PR:` line is dropped (the resolution comment binds the PR).

**C13. Edits to landed documents.**
- `CLAUDE.md:151`: "These are the only edits a landed document takes."
- Other landed-document edits:
  - a sub-issue's reconcile adds a link line to the parent's `consequences.md`
    (`planner.md:157-161`)
  - and a dated callout to the landed parent architecture (`CLAUDE.md:170`, `planner.md:349-351`)
- `planner.md:215-216` allows dated callouts only "once the user has approved them".
- Recommendation: scope `CLAUDE.md:151` to the fix case, list the sub-issue edits as allowed, and
  settle whether callouts need approval (CLAUDE.md:170 says they don't).

**C14. Bringing old boards up to a new convention.** Three different statements:
- `CLAUDE.md:283-285`: "needs no commit or PR of its own and rides the repository's next commit".
- `admin-team.md:390-396`: "a `docs:` commit in the same push".
- `GUIDANCE.md:518-526`: only at the state-boards task, "and no other". Also see
  `plan/RULES.md:1494-1496` and `:1126` (re-render at a seeding `sized`), and dashboards-refresh.

Recommendation: CLAUDE.md's version, with GUIDANCE's table listing every real moment.

**C15. `dashboards-refresh` has no way to land.**
- It runs "at the current default branch" (`admin-team.md:356`, `presenter.md:164-168`), but a
  default branch changes only at a landing, and no path commits its output.
- Recommendation: run it on a docs branch and land it with an issue-less `land`.

**C16. Level 1 and `state-boards`.**
- `resolve-issue/SKILL.md:51` sends `state-boards` at level 1. The action raises the issue board's
  step (`admin-team.md:357`), but level 1 has no board (`admin-team.md:381`).
- Recommendation: serve it without the board step when there is no plan folder.

**C17. The org `CONTRIBUTING.md` vs. the pipeline.** CONTRIBUTING is human-facing org policy; the
user decides which side wins on each point.
- **Releasing** (`CONTRIBUTING.md:188-201`): a `release/X` branch; `[Unreleased]` moved into the
  version at release; a `v` tag; "a release workflow creates the GitHub Release"; and "Publishing to
  a package registry… is manual… a deliberate human action".

  The pipeline does the opposite: it bumps the version at every landing, writes `## [X.Y.Z]` in the
  Document step, auto-publishes through `publisher.md`, creates the releases itself, and tags in each
  repo's own style.
- **Branch names**: `feature/<n>-<slug>` and `fix/<n>-<slug>` (`:82-83`) vs.
  `<type>/issue-<n>-<slug>` (`version-control-manager.md:196-198`, `PROTOCOL.md:29`).
- **Updating a branch**: "Update with rebase, never a merge from the default branch into your
  branch" (`:123-124`) vs. the merge sync at `prepare-landing`.
- **Direct commits**: "never receives direct commits — branch protection enforces this" (`:77-78`)
  and "Every change reaches the default branch through a PR" (`:116`), vs. `mirror-sync` straight to
  `main`. This repo's `main` has 50 commits and 0 merges, with "claude: …" subjects that aren't
  Conventional Commits.
- **Blocked**: a Project Status field replaces the `status: blocked` label (`:64`), but
  `resolve-issue/SKILL.md:78` and `hooks/spartanlabs-open-issues.sh:30` skip a label named `blocked`.
- **Version terms**: "MinorChange" and "Feature release" (`CLAUDE.md:67-68`,
  `version-control-manager.md:246-247`) are defined only in `CONTRIBUTING.md`'s Versioning section.
  VCM reads only the *target repo's* `CONTRIBUTING*` (`:182`). Whatever wins, point VCM at the
  definition.

**C18. The SessionStart hook.**
- `hooks/spartanlabs-open-issues.sh:30` says "scaled to its work level (its level: N label…)", which
  is stale per A2.
- It also restates `/resolve-issue`'s rules for picking an issue, and "call out any issue that is new
  since the last session" has no stored state to compare against.
- `hooks/` is mirrored config but not in the direction-manager's listed documents, so confirm who
  edits it.
- Recommendation: point it at `/resolve-issue` step 1 and fix the label wording.

**C19. Small items.**
- The publisher's `usage` mode (`publisher.md:45-46`) has no caller. Wire it into `status`, or drop
  it.
- The `dashboards` field on `land` (`PROTOCOL.md:56`) looks vestigial now that `state-boards` builds
  the boards. Verify against the presenter and executor, then drop it.
- The fields of `cancel` and `dashboards-refresh` are undocumented in the protocol.
- `architect.md:12` declares `model: sonnet`, but the planner always passes `fable` or `opus`
  (`planner.md:193-203`). Set it to match, or note that it is overridden.

## D. Size and readability (do as `propose` first)

- The dashboards rules are about 308 KB, and the presenter reads them on every job: `GUIDANCE.md`
  71 KB, `plan/RULES.md` 174 KB, `system/RULES.md` 51 KB.
- Overpacked text:
  - lines of 900–2,192 characters (`plan/RULES.md:224`, `:979`, `:991`, `:993`, `:995`, `:998`,
    `:1308`)
  - table cells of 1,000–1,500 characters (`SKILL.md:37-39`)
  - a registry field list of about 2,100 characters (`system/RULES.md:299-315`)
  - about 50 detectors hand-copied into one paragraph (`GUIDANCE.md:471-489`); point at
    `system/scripts/features.js` instead
- Fix: split each into per-case bullets or tables. Removing D-A11 and D-A12 alone should cut a large
  share.
- Gather the backward-compatibility "read alike" rules (old route ids, `impact.md`, `repoPage`,
  `#timeline`, `premerge`) into one "Older boards" section per ruleset.

## E. Duplication across agents (needs a design choice; propose first)

**E1. The internal-names rule has about 12 copies, and they have drifted.**
- The copies:
  - `CLAUDE.md:201-213`
  - `agents/admin-team.md:131-151`
  - `admin-team/PROTOCOL.md:174-184`
  - `agents/version-control-manager.md:151-168` and `:209-222`
  - `agents/presenter.md:258-268`
  - `agents/planner.md:256-265`
  - `skills/resolve-issue/SKILL.md:54-67`
  - `agents/architect.md:106-115`
  - `agents/plan-writer.md:154-162`
  - `agents/researcher.md:88-94`
  - `agents/rookie-dev.md:47-55`
  - `skills/dashboards/GUIDANCE.md:310-318`
- The drift:
  - "a library's name" vs. "a library's or third party's name" / "a domain `verifier`"
  - bare "qa" vs. "qa as an agent"
  - none lists `direction-manager`
- Recommendation: make CLAUDE.md the one home, including the qa-step and library exemptions. Each
  agent keeps one line ("Committed content follows 'No internal names' in `~/.claude/CLAUDE.md`;
  read it before writing") or a short pointer. Subagents can read the file.

**E2. The 19-line "Progress review every 10 minutes" block appears in 11 agents.**
- It is byte-identical in `architect`, `code-reviewer`, `documentation-reviewer`, `interviewer`,
  `plan-writer`, `planner`, `qa`, `researcher`, `rookie-dev`, `test-inspector` and `verifier`.
- Recommendation: keep it (each subagent needs it) or move it to a shared file each brief tells the
  agent to read. Either way, add the boundary exception (A9).

**E3. The publishing budget is stated in five places.**
- Where: `CLAUDE.md:105-113`, `agents/admin-team.md:405-415`, `admin-team/PROTOCOL.md:61`,
  `agents/publisher.md:5-9` and `:92-104`, and `skills/admin-team/SKILL.md:62-66`.
- Recommendation: the rule lives in `publisher.md`, and the others summarise it in a clause and
  point to it.

## Suggested order

1. Ask the user to test A22 and to decide C1–C4. They decide whether the admin team can work as
   written at all.
2. Apply the Section A propagations; each is a small edit. Then mirror-sync.
3. Hand Section B to the presenter (D-B1 and D-B2 first).
4. Present C5–C19 to the user. Start with C6 and C7, which block parts of B and A.
5. Draft D and E as `propose` diffs once A has landed, so the consolidation starts from consistent
   text.
