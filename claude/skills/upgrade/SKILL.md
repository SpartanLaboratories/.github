---
name: upgrade
description: >-
  Bring one named dependency of the current repo to its latest available
  version through the issue backlog: find the pinned and the latest version,
  what changed between them (breaking changes called out) and where the repo
  uses the library, file an upgrade issue with those facts through the admin
  team, then work that issue with /resolve-issue, which sizes, plans, builds,
  checks and lands it. Use to bring one dependency current in a reviewed,
  tested step instead of a blind version bump.
argument-hint: "<library-name>"
disable-model-invocation: true
allowed-tools: Bash(gh issue list *), Bash(gh issue view *), Bash(gh pr list *), Bash(gh repo view *), Bash(gh api *), Bash(git status *), Bash(git log *), Bash(git branch *), Bash(git diff *), Bash(curl *), Bash(npm view *), Bash(npm info *), Bash(pip index *), Bash(cargo search *), Bash(go list *)
---

Bring **one** named dependency to its latest available version. An upgrade is
ordinary backlog work: this skill gathers the facts, files an issue for the
upgrade, then works that issue with `/resolve-issue`. You never commit, push,
branch, merge, label, comment or file yourself: the issue is filed, and
everything after it lands, through the `admin team` session (the `admin-team`
skill).

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
  API, so the issue carries real call sites to plan against, not just the
  version string.
- Tell the user: the library, current -> latest version, and a one-line
  summary of what changed, calling out any breaking change found.

## 2. File the upgrade issue

Load the `admin-team` skill and send it a `file-issue` request:

- `github` and `surfacedIn`: this repo's `owner/repo`.
- `title`: `Upgrade <library> from <current> to <latest>`.
- `body`, in the project's own terms — the issue is on GitHub, so it names no
  work level, agent, pipeline or session:
  - where the library is pinned (the manifest paths) and the current and
    target versions;
  - what changed between them, each point with its source (release notes,
    changelog, tag diff or commit list, by URL), every breaking change called
    out;
  - the call sites in this repo (files, and the API each uses);
  - the proposed fix: bump the pin and adapt the call sites to any breaking
    change, with tests.

Wait for the reply:

- `done`, `result.filed: true` — the issue is new. Tell the user its number
  and link.
- `done`, `result.filed: false` — an open issue already covers the upgrade.
  Tell the user, and work that issue.
- `rejected` — tell the user the reason and stop.

## 3. Work it — `/resolve-issue`

`/resolve-issue` cannot be invoked by the model, so read
`~/.claude/skills/resolve-issue/SKILL.md` and follow it as if it had been run
as `/resolve-issue <number>`, from its first step to its report. It sizes the
issue, plans the bump and the call-site changes from the issue's body,
implements, runs `qa` and lands the change through the admin team. Every rule
in it applies unchanged; this skill adds nothing to it.

## 4. Report

Lead with the library and its old and new version, then give `/resolve-issue`'s
report as it stands.

Do not start a second upgrade. One dependency per `/upgrade`.
