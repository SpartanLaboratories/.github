#!/usr/bin/env bash
# SessionStart hook: when the working directory is a Spartan Labs repo
# (SpartanLabsGaming = the game projects, SpartanLaboratories = the shared libs),
# print its open GitHub issues so they land in session context.
# Registered in ~/.claude/settings.json. Always exits 0 - never blocks startup.
set -uo pipefail

# Drain the session JSON on stdin; this hook does not need it.
cat >/dev/null 2>&1 || true

# gh is not on PATH on this machine.
GH="/c/Program Files/GitHub CLI/gh.exe"
[ -x "$GH" ] || GH="$(command -v gh 2>/dev/null || true)"
[ -n "$GH" ] || exit 0

remote="$(git config --get remote.origin.url 2>/dev/null || true)"
case "$remote" in
  *SpartanLabsGaming/*|*SpartanLaboratories/*) ;;
  *) exit 0 ;;
esac

# Pull "<org>/<repo>" out of an ssh or https remote URL.
repo="$(printf '%s' "$remote" | sed -E 's#.*[/:]((SpartanLabsGaming|SpartanLaboratories)/[^/[:space:]]+).*#\1#; s#\.git$##')"
[ -n "$repo" ] || exit 0

# Oldest first, so the front of the list is the next issue to work.
issues="$("$GH" issue list --repo "$repo" --state open --limit 50 --search "sort:created-asc" 2>/dev/null || true)"
[ -n "$issues" ] || exit 0

printf '== Open GitHub issues for %s (oldest first) ==\n%s\n\nBefore starting other work: propose a resolution plan for the oldest unresolved issue above (the first row) - the one to prioritise, whether or not it is new. Skip it only if it is labelled blocked/wontfix/duplicate/question or already has an open PR, and if so say why and move to the next. Also call out any issue that is new since the last session.\n' "$repo" "$issues"
