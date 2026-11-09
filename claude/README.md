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
| `agents/`       | `agents/`                      | Custom subagents (planner, architect, version-control-manager, qa, presenter, publisher, direction-manager, …) and the `admin-team` session brief |
| `skills/`       | `skills/`                      | Custom skills (`resolve-issue`, `admin-team`, `dashboards`, `upgrade`) and installed third-party skills (`firecrawl*`, `vercel-connect`, `graphify`) |
| `admin-team/`   | `admin-team/`                  | The admin team session's protocol, settings file, launchers, predicted-issues tracker, and the rule checker (`rule-check.js`) with its config (`rule-files.json`) |
| `nomenclature/` | `nomenclature/` | Shared vocabularies: `ui.md`, the names of interface elements (the boards, SpartanUI); `boards.md`, the names of the dashboards' boards and how they use those elements; `internal-names.md`, the internal names that committed content must not carry; `rule-index.md`, the index of rules the rule checker generates |
| `commands/`     | root `*.md` prompt files       | Legacy update prompt file (`fixonupdate.md`)                     |

## Not included

- Credentials, session state, history and caches (`.credentials.json`, `.claude.json`,
  `history.jsonl`, `sessions/`, …).
- Anthropic's auto-synced skill bundle (`skills/synced/`).
- The admin team session's local state (`admin-team/ledger.jsonl`, `state.json`, `hooks.jsonl`,
  `launch.lock`, `up`), which holds machine-local paths; `proposals/`, working drafts;
  `backups/`, local bundles of this repository's own earlier history; and `scrub-memory.py`,
  local tooling.
- Projects' auto-memory (`projects/*/memory/`) is not mirrored.
- Session handoffs (`handoffs/`), which are local to the machine.
- The admin team's request files (`admin-team/req/`) and its session handoffs
  (`admin-team/handoff-*.md`), which are local working files.
- The admin team's temporary permission grants (`admin-team/temp-permissions/`), which are
  local to the machine.
- `skills/dashboards/verify/history/`, the dashboards skill's cache of old template versions:
  a local cache that `history.js` rebuilds on demand from this repository's own git history.

## Only in this copy

- `skills/graphify/LICENSE`, `NOTICE` and `LICENSE-MIT`: graphify's license files
  (Apache-2.0, with earlier portions under MIT), taken from the installed `graphifyy` 0.9.82
  wheel. Its license requires redistributions to carry them; they are not in `~/.claude/`.

## Restoring

Copy the contents back into `~/.claude/`.
