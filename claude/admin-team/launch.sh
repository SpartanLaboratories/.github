#!/usr/bin/env bash
# Starts the "admin team" session from Git Bash, the way that has worked in practice:
#   launch.sh                      a fresh session via launch.cmd (the team rebuilds its state from the ledger)
#   launch.sh --teleport <id>      pull an existing admin team session back by its id (session_01...), then
#                                  rename it to "admin team" at its console: a teleported session keeps its
#                                  old name and the pipeline addresses the team by name
# Either way the launch lock is taken first, the window opens minimized with Remote Control, the team's
# brief (--agent admin-team) and its settings file, and the script waits for the team's startup marker.
#
# Does not work: `claude --resume "admin team"` (resumes nothing when the session was renamed or teleported)
# and `--resume` combined with `-n` (the two flags conflict).
set -euo pipefail

home_dir="${USERPROFILE:-$HOME}/.claude/admin-team"
lock="$home_dir/launch.lock"
up="$home_dir/up"
settings="$home_dir/settings.json"
deadline_s=180

mode="fresh"
session_id=""
case "${1:-}" in
  "") ;;
  --teleport) mode="teleport"; session_id="${2:?usage: launch.sh [--teleport <session_id>]}" ;;
  *) echo "usage: launch.sh [--teleport <session_id>]" >&2; exit 2 ;;
esac

# The launch lock: a directory, created atomically. A lock older than 10 minutes is stale.
if [ -d "$lock" ] && [ -n "$(find "$lock" -maxdepth 0 -mmin +10)" ]; then
  echo "removing a stale launch lock"
  rmdir "$lock"
fi
if ! mkdir "$lock" 2>/dev/null; then
  echo "another session holds the launch lock; wait for it or remove $lock" >&2
  exit 1
fi
trap 'rmdir "$lock" 2>/dev/null || true' EXIT

[ -f "$home_dir/ledger.jsonl" ] || : > "$home_dir/ledger.jsonl"

# Start the window through PowerShell: `start "admin team" /min` gives it the title and minimizes it.
win_settings="$(cygpath -w "$settings")"
if [ "$mode" = "fresh" ]; then
  args="'-n','\"admin team\"'"
else
  args="'--teleport','$session_id'"
fi
powershell -NoProfile -Command "
  Set-Location '$(cygpath -w "$home_dir")'
  Start-Process -FilePath cmd.exe -WindowStyle Hidden -ArgumentList '/c','start','\"admin team\"','/min','claude',$args,'--remote-control','--agent','admin-team','--settings','\"$win_settings\"'
"
echo "launched ($mode) at $(date -u +%H:%M:%SZ); waiting for the startup marker"

# The team touches `up` when it has started; wait for it to be newer than the lock.
waited=0
until [ "$up" -nt "$lock" ]; do
  sleep 2
  waited=$((waited + 2))
  if [ "$waited" -ge "$deadline_s" ]; then
    echo "no startup marker after ${deadline_s}s: look at the admin team window (a trust prompt or an error)" >&2
    exit 1
  fi
done
echo "admin team is up (${waited}s)"
if [ "$mode" = "teleport" ]; then
  echo "now rename the session to \"admin team\" at its console (/rename admin team)"
fi
