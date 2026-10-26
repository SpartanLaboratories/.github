# Claude Code configuration

A snapshot of the Claude Code setup used across Spartan Labs repositories
(`SpartanLaboratories/*` and `SpartanLabsGaming/*`). It is a copy of the global
`~/.claude/` directory, kept here for reference and to restore on a new machine. It is
updated whenever `~/.claude/` changes, so the two match (see the "Global Claude config"
section of `CLAUDE.md`).

| Path            | Source in `~/.claude/`         | Contents                                                        |
|-----------------|--------------------------------|-----------------------------------------------------------------|
| `CLAUDE.md`     | `CLAUDE.md`                    | Global instructions applied to every project                    |
| `settings.json` | `settings.json`                | Global settings: permissions, hooks, auto-mode rules            |
| `hooks/`        | `hooks/`                       | Hook scripts referenced by `settings.json`                      |
| `agents/`       | `agents/`                      | Custom subagents (planner, architect, version-control-manager, qa, presenter, publisher, …) and the `admin-team` session brief |
| `skills/`       | `skills/`                      | Custom skills (`resolve-issue`, `admin-team`, `dashboards`, `upgrade`) and installed third-party skills (`firecrawl*`, `vercel-connect`, `graphify`) |
| `admin-team/`   | `admin-team/`                  | The admin team session's protocol, settings file and launchers  |
| `commands/`     | root `*.md` prompt files       | Legacy release / update prompt files                            |

## Not included

- Credentials, session state, history and caches (`.credentials.json`, `.claude.json`,
  `history.jsonl`, `sessions/`, …).
- Anthropic's auto-synced skill bundle (`skills/synced/`).
- The admin team session's local state (`admin-team/ledger.jsonl`, `state.json`, `launch.lock`,
  `up`), which holds machine-local paths, and `proposals/`, working drafts.
- Projects' auto-memory (`projects/*/memory/`) is not mirrored.
- `skills/dashboards/verify/history/`, the dashboards skill's cache of old template versions:
  a local cache that `history.js` rebuilds on demand from this repository's own git history.

## Only in this copy

- `skills/graphify/LICENSE`, `NOTICE` and `LICENSE-MIT`: graphify's license files
  (Apache-2.0, with earlier portions under MIT), taken from the installed `graphifyy` 0.9.82
  wheel. Its license requires redistributions to carry them; they are not in `~/.claude/`.

## Restoring

Copy the contents back into `~/.claude/`.
