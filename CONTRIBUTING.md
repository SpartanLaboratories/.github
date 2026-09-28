# Contributing to Spartan Labs Projects

This is the working agreement for every Spartan Labs repository, in both the
[`SpartanLabsGaming`](https://github.com/SpartanLabsGaming) and
[`SpartanLaboratories`](https://github.com/SpartanLaboratories) organizations. It is written for
a team even while the team is one person — the point is that the process is already in place
when the second contributor arrives.

A repository may add its own `CONTRIBUTING.md` for technology-specific rules: coding rules,
module layout, build and test commands, where its version lives, and how it publishes. That file
**supplements** this baseline and links back to it; it does not restate or override it.

- [Before you start](#before-you-start)
- [Planning large work](#planning-large-work)
- [Branching model](#branching-model)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Merge strategy](#merge-strategy)
- [Code, tests, and documentation](#code-tests-and-documentation)
- [Versioning](#versioning)
- [Releasing](#releasing)
- [Deployment environments](#deployment-environments)
- [Security](#security)

## Before you start

- Search existing issues and discussions before opening new work.
- Use the repository's issue templates and describe the problem, expected outcome, and relevant
  context.

## Planning large work

Every unit of work starts as an issue. When one design spans **more than one PR** (a roadmap
phase, or a system of systems), it also gets a **tracking issue** above those issues. GitHub
offers three tools here, each with one job:

| Tool | Job | Rule |
| --- | --- | --- |
| **Tracking issue + sub-issues** | Structure: what the work is and how it breaks down | One tracking issue per initiative (label `type: tracking`, template *Tracking issue*). Each stage is a sub-issue of it. A stage that grows its own stages becomes a tracking issue in turn. |
| **Milestones** | When: which release ships it | Set a milestone on a sub-issue once it is scheduled for a release. Tracking issues can span releases and carry none. |
| **A roadmap Project** | Status: one board across every initiative | One Project per product roadmap, not one per system. Its fields group items, with one saved view per initiative. |

**Rules**

1. **Planning and doc PRs use `Refs #N`, never `Closes #N`.** Only the PR that implements an
   issue closes it. A merged plan is not a delivered feature.
2. **Record dependencies as links, not prose.** Use the sub-issue hierarchy and GitHub's
   *blocked by* relationship. Write "Depends on #N" in a body only in addition to the link,
   and never leave a placeholder such as `#-tbd` once the issue exists.
3. **An issue has one parent.** When a stage belongs to two initiatives, put it under the one
   that owns its delivery and cross-reference it from the other tracking issue's
   *Cross-initiative dependencies* section.
4. **The tracking issue is the source of truth for scope and order.** Reorder, add or drop
   stages there, with a comment saying why, before the change lands in a plan doc.
5. **Branches stay per issue.** Name a branch after the sub-issue being implemented, never
   after the tracking issue.

**Roadmap Project fields**

Use **single-select** fields, so a view can group, slice or make board columns by any of them.

| Field | Answers | Values | Replaces |
| --- | --- | --- | --- |
| `Status` | Where is the item? | Todo · Planned · In progress · Blocked · Done | a `status: blocked` label |
| `Initiative` | Which tracking issue owns it? | One per tracking issue, named after the work | — |
| `Phase` | Which roadmap phase does it deliver? | The repository's roadmap phases | — |

`Initiative` and `Phase` are independent: stages of one initiative can deliver different
phases. Leave `Phase` empty on work outside the roadmap, such as bug fixes.

Enable the Project's built-in workflows: *auto-add* for new issues in the repository, *item
closed → Done*, and *PR merged → Done*. A Project may include issues from other repositories
when an initiative depends on them.

## Branching model

Trunk-based development. The default branch is always releasable and never receives direct
commits — branch protection enforces this.

| Prefix | For | Example |
| --- | --- | --- |
| `feature/<issue#>-<slug>` | new functionality | `feature/1-alive-cancel-attack` |
| `fix/<issue#>-<slug>` | bug fixes | `fix/2-attack-dead-target` |
| `chore/<slug>` | tooling, deps, CI — no product change | `chore/bump-kotlin` |
| `docs/<slug>` | documentation only | `docs/quadtree-readme` |
| `release/<version>` | release preparation (short-lived) | `release/1.10.0` |
| `hotfix/<version>` | patch a released version (branch off its tag) | `hotfix/1.10.1` |

Branch off the latest default branch. Keep branches short-lived — hours to a couple of days.
There is no `develop` branch and there are no per-environment branches.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body — why, not what; wrap ~72 cols>

<footers>
```

- **Types:** `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`
- **Scopes:** the repository's areas or modules (listed in its own `CONTRIBUTING.md`)
- **Breaking changes:** `feat(x)!:` in the subject **and** a `BREAKING CHANGE:` footer
- Reference issues in the body (`Refs #2`); the PR that implements an issue closes it
  (`Closes #2`). Planning and doc PRs only reference it — see
  [Planning large work](#planning-large-work)

Commits on your own branch may be rough — tidy them with an interactive rebase before the PR
is ready for review.

## Pull requests

Every change reaches the default branch through a PR. Even solo.

1. `git switch -c fix/2-attack-dead-target`
2. Commit, `git push -u origin HEAD`
3. `gh pr create` — fill in the template; title **must be a valid Conventional Commit**
   (it becomes the merge-commit subject)
4. CI must be green
5. Branch must be up to date with the default branch — use **Update with rebase**, never a
   merge from the default branch into your branch
6. Merge, then delete the branch

Keep pull requests narrowly scoped. Explain what changed and why, link the issue, report how it
was validated, and call out breaking changes, migrations, and follow-up work. A second
approving review becomes required once a second person is on the repository.

## Merge strategy

**Semi-linear history.** Rebase locally, merge publicly.

- You rebase your **own** feature branch onto the default branch. You never rebase anything
  that is shared (the default branch, a release branch someone else is on).
- The feature branch merges **up** as a **merge commit** (`--no-ff`). That merge commit is the
  record that a unit of work landed, and where.
- On GitHub only **“Create a merge commit”** is enabled — “Squash” and “Rebase and merge” are
  turned off, so the strategy is not a per-PR decision.
- Read history at the feature level with:

  ```
  git config --global alias.lg "log --first-parent --oneline --graph"
  ```

## Code, tests, and documentation

Follow the conventions established by the target repository. Add or update tests at the
appropriate levels. Preserve compatibility unless a breaking change is intentional and
documented. Update user-facing documentation — including the `README.md` — whenever the public
behavior, API, build, or operational workflow changes.

## Versioning

`Major.Feature.MinorChange`, optionally a trailing letter for a bug fix (e.g. `1.5.2a`). Each
repository's `CONTRIBUTING.md` says where its version lives and which artifacts share it.

| Change | Bump | Example |
| --- | --- | --- |
| `feat:` | Feature release | `1.9.0` → `1.10.0` |
| `fix:` / `perf:` | MinorChange, or a trailing letter | `1.9.0` → `1.9.1` / `1.9.0a` |
| `feat!:` / `BREAKING CHANGE:` | Major release | `1.9.0` → `2.0.0` |
| `docs` / `chore` / `ci` / `test` / `build` / `refactor` | none — rides the next release | |

## Releasing

1. All target changes are merged to the default branch and CI is green.
2. `git switch -c release/1.10.0` — bump the version wherever the repository keeps it, move the
   `CHANGELOG.md` `[Unreleased]` entries under a new `[1.10.0]` heading with today's date, and
   update the link references.
3. PR → merge. The merge commit is `chore(release): 1.10.0`.
4. Tag the merge with a `v`-prefixed annotated tag — `git tag -a v1.10.0 -m "Release 1.10.0"` —
   then `git push origin <default-branch> --follow-tags`.
5. A release workflow creates the GitHub Release from the tag.
6. **Publishing to a package registry (e.g. Maven Central) is manual.** It is irreversible and
   stays a deliberate human action — no registry credentials live in CI. The repository's
   `CONTRIBUTING.md` gives the exact command.

## Deployment environments

Environments (dev / staging / production) are **GitHub Environments**, never branches. A
release is one immutable tagged artifact promoted from one environment to the next; only
configuration differs between them. Library releases have no environments — the package
registry is production, and a `-SNAPSHOT` publish from the default branch is the staging
analogue for downstream projects.

## Security

Do not report vulnerabilities in public issues. Follow the repository's `SECURITY.md` policy or
contact <spartaksingh95@gmail.com>.
