---
name: upgrade
description: >-
  Bump one named dependency of the current repo to its latest available
  version and adapt the codebase to any breaking change, using the same
  planner -> rookie-dev -> qa pipeline as resolve-issue, with the manager
  agent handling version control (branch, commits, PR, merge, resolution
  comment) autonomously and stopping only at its two gates - a Maven
  publish, which needs your explicit go-ahead, and any downstream-consumer
  coordination, which it reports rather than files. Use to bring one
  dependency current in a reviewed, tested step instead of a blind version
  bump.
argument-hint: "<library-name>"
disable-model-invocation: true
allowed-tools: Bash(gh issue list *), Bash(gh issue view *), Bash(gh pr list *), Bash(gh repo view *), Bash(gh api *), Bash(git status *), Bash(git log *), Bash(git branch *), Bash(curl *), Bash(npm view *), Bash(npm info *), Bash(pip index *), Bash(cargo search *), Bash(go list *)
---

Bring **one** named dependency to its latest available version using the
project's agents. Follow the steps in order. Wait for each spawned agent to
finish before starting the next. All version control runs through the
`manager` agent, which acts autonomously except at its two gates: a **Maven
publish** happens only if the user explicitly asked this run, and a
**downstream-consumer issue** is never filed (reported instead). You
yourself never commit, push, merge, tag, publish, or file/comment on an
issue outside of `manager`.

## 1. Pick the library

- `$ARGUMENTS` names the library. If empty, ask the user which one — do not
  guess.
- Find where it's pinned: search the manifest(s) for this ecosystem —
  Gradle (`build.gradle.kts` / `build.gradle` / `gradle/libs.versions.toml`),
  npm (`package.json`), Python (`pyproject.toml` / `requirements*.txt`),
  Cargo (`Cargo.toml`), Go (`go.mod`), etc. — for the current pinned
  version. If it isn't a dependency of this repo, say so and stop.
- Find the latest published version from the matching registry:
  - Maven/Gradle: `<repo-base>/<group-path>/<artifact>/maven-metadata.xml`
    on the group's repo (Maven Central at `repo1.maven.org/maven2/...` for
    most; check `search.maven.org` too but treat its solr index as
    lagging — the raw `maven-metadata.xml` is authoritative). Use `<latest>`
    / `<release>`, not just the newest-looking string in `<versions>`.
  - npm: `npm view <pkg> version` (latest dist-tag) and `npm view <pkg>
    versions --json` for the full list.
  - Python: PyPI JSON API (`curl https://pypi.org/pypi/<pkg>/json`) or `pip
    index versions <pkg>`.
  - Cargo: `cargo search <crate>` or the crates.io API.
  - Go: `go list -m -versions <module>`.
  - If the library is one of the project's own upstream repos (its org is
    known from prior context, e.g. a `SpartanLab*` GitHub org), also check
    `gh release list` / `gh api repos/<owner>/<repo>/tags` and read recent
    commit messages (`gh api repos/<owner>/<repo>/commits`) — release notes
    on the registry itself are usually absent, so the source repo's commits
    are the real changelog.
- If the pinned version already matches the latest, say so and stop — there
  is nothing to upgrade.
- Collect what changed between the pinned and latest version: changelog /
  release notes if published, otherwise the source repo's commit messages
  or diff between the two version tags. Note explicitly any **breaking
  change** the notes call out (API removals/renames, protocol/behavior
  changes, minimum-version bumps).
- Grep this repo's source (not just the manifest) for uses of the library's
  API, so the plan step has real call sites to reason about, not just the
  version string.
- Tell the user: the library, current -> latest version, and a one-line
  summary of what changed, calling out any breaking change found — and
  **confirm before proceeding** — this run creates branches and commits.
- Check `git status` is clean. If it is not, stop and ask the user to settle
  the working tree first.

## 2. Plan — `planner`

Spawn `planner` with: the library name, current and target version, the
collected changelog / breaking-change notes, and the call sites found in
step 1. Ask it to plan the dependency bump itself, any required call-site
changes, test impact, and whether the README needs updating (per the repo's
README-currency rule).

**`planner` halts and hands work back to you.** Its report leads with one of
three shapes; route on it:

- **`HALT — interview`** — it has questions about the user's intent. Relay
  them **verbatim**, with the recommendations attached, and wait. Never answer
  on the user's behalf. Once the user answers, **resume the same planner**
  with `SendMessage` (its context is intact) carrying the answers — do not
  spawn a fresh `planner`.
- **`HALT — architecture`** — the work decomposes into more than one system
  and needs sign-off before the plans get written. Relay the architecture
  document path and the decomposition, wait for approval or changes, then
  resume the same planner with `SendMessage`.
- **`COMPLETE`** — continue below.

- If the returned **Considerations** list is non-empty, **stop**: relay it
  to the user and wait. Do not guess a design — this is exactly where a
  breaking change's ambiguity (e.g. "does the old behavior need a shim?")
  belongs.
- Otherwise keep the architecture document path and **every** plan document
  path, in the landing order `planner` gave, plus the recommended approach.

## 3. Branch — `manager`

Spawn `manager` with the plan document, the library name and target
version, and the note "about to implement the upgrade — set up the branch
only, no commits yet". `manager` creates the topic branch itself. Carry
forward the branch name and base it reports.

## 4. Implement — `rookie-dev`

Spawn `rookie-dev` with the plan document path and "implement it on the
current branch; commit nothing". If `planner` produced **several** plan
documents, work them in the landing order it gave — one `rookie-dev` per
plan, each waiting for the previous — passing the architecture document
path alongside for context.

- If its report has a **Not done / blocked** list, **stop**: relay it and
  offer the user either one `planner` re-pass to resolve the gap or to hand
  back as is. Do not fill in the missing design yourself.

## 5. Check — `qa`

Spawn `qa` over the change set (`git diff <base-branch>...HEAD` plus
untracked files). Keep its gate verdict, the test-inspector **Test run**
block, and the path to the visual test report.

- **PASS** -> step 6.
- **CHANGES REQUESTED** -> do **one** remediation pass: `rookie-dev` for a
  code or test gap; `planner` then `rookie-dev` if the plan itself is
  wrong. Re-run `qa` once. If it still fails, stop and hand the user the
  findings, the report path, and the branch as it stands. Never loop more
  than once.

## 6. Land it — `manager`

Spawn `manager` with the QA'd change set, the `qa` verdict, the plan
document, every `.md` file created or updated this run, this session's
commit trailers and PR footer, and **whether the user asked for a publish
this run**. `manager` carries out the commits, the version bump, the PR,
the merge, and — if an open issue in this repo tracked the upgrade — the
resolution comment on it. If no such issue exists, it merges with an
ordinary PR description; there is nothing to close.

- Relay `manager`'s **Done** list as-is.
- Surface its **Stopped — needs you** items to the user: a Maven publish
  (only if a release was intended — give them the exact command) and any
  downstream-consumer coordination `manager` flagged rather than filed.
- Do not re-run or second-guess `manager`'s completed steps.

## 7. Report

- The library, old and new version, and whether the upgrade landed clean or
  needed call-site changes — summarize what changed in the codebase.
- The plan document and any other `.md` files, with their merged links.
- The `qa` verdict and the visual test-report path.
- The commits / PR / merge that landed, by reference, and any issue comment
  or upstream issue `manager` filed or flagged.
- Anything handed back to the user: `rookie-dev` blockers, unresolved
  planner open decisions, and `manager`'s **Stopped — needs you** items (a
  pending Maven publish, downstream-consumer coordination).

Do not start a second upgrade. One dependency per `/upgrade`.
