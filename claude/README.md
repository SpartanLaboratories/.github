# Claude Code configuration

A snapshot of the Claude Code setup used across Spartan Labs repositories
(`SpartanLaboratories/*` and `SpartanLabsGaming/*`). It is a copy of the global
`~/.claude/` directory, kept here for reference and to restore on a new machine.

| Path            | Source in `~/.claude/`         | Contents                                                        |
|-----------------|--------------------------------|-----------------------------------------------------------------|
| `CLAUDE.md`     | `CLAUDE.md`                    | Global instructions applied to every project                    |
| `settings.json` | `settings.json`                | Global settings: permissions, hooks, auto-mode rules            |
| `hooks/`        | `hooks/`                       | Hook scripts referenced by `settings.json`                      |
| `agents/`       | `agents/`                      | Custom subagents (planner, architect, manager, qa, …)           |
| `skills/`       | `skills/`                      | Custom skills (`resolve-issue`, `upgrade`) and installed third-party skills (`firecrawl*`, `vercel-connect`) |
| `commands/`     | root `*.md` prompt files       | Legacy release / update prompt files                            |
| `memory/<repo>/`| `projects/<path>/memory/`      | Per-project auto-memory, one folder per repository              |

## Not included

- Credentials, session state, history and caches (`.credentials.json`, `.claude.json`,
  `history.jsonl`, `sessions/`, …).
- Anthropic's auto-synced skill bundle (`skills/synced/`).
- `memory/MyGameServer/deployment-setup.md`, which describes deployment infrastructure.

## Restoring

Copy the contents back into `~/.claude/`. Memory folders go back under
`~/.claude/projects/<path-encoded project dir>/memory/`, e.g.
`memory/GameGraphics/` → `projects/D--Documents-Programming-GameGraphics/memory/`.
