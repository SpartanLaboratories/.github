# graphify-track.sh: the reminder half of the temporary graphify usage tracker.
#
# Sourced, not run, by the two graphify PreToolUse hooks in settings.json, right after
# `graphify hook-guard` printed a reminder, so it starts no process. It reads the hook's
# variables: $i, the hook input; $o, the reminder printed; $s and $e, $EPOCHREALTIME before
# and after the guard ran; and its one argument, search or read. It appends one JSON line to
# the local log ~/.claude/admin-team/graphify-usage.jsonl (GRAPHIFY_TRACK_LOG overrides the
# path), in the shape graphify-track.js writes. Builtins only; it prints nothing.

gt_reminder() {
  local LC_ALL=C head sess=null aid=null agent=null tool=null ts us repo gm=null f
  # The input's own fields come before tool_input; match only there.
  head=${i%%\"tool_input\"*}
  for f in session_id:sess agent_id:aid agent_type:agent tool_name:tool; do
    # The field's JSON string, still escaped, so it is quoted back as it stands.
    [[ $head =~ \"${f%%:*}\"[[:space:]]*:[[:space:]]*\"(([^\"\\]|\\.)*)\" ]] &&
      printf -v "${f#*:}" '"%s"' "${BASH_REMATCH[1]}"
  done
  [[ $s =~ ^[0-9]+[.,][0-9]+$ && $e =~ ^[0-9]+[.,][0-9]+$ ]] &&
    gm=$(( (${e//[.,]/} - ${s//[.,]/}) / 1000 ))
  us=${EPOCHREALTIME//[.,]/}
  TZ=UTC0 printf -v ts '%(%Y-%m-%dT%H:%M:%S)T' "${us:0:-6}"
  repo=${PWD##*/}; repo=${repo//\\/\\\\}; repo=${repo//\"/\\\"}
  printf '{"ts":"%s.%sZ","session":%s,"agent_id":%s,"agent":%s,"repo":"%s","tool":%s,"kind":"reminder","guard":"%s","bytes":%d,"guard_ms":%s}\n' \
    "$ts" "${us: -6:3}" "$sess" "$aid" "$agent" "$repo" "$tool" "$1" "${#o}" "$gm" \
    >>"${GRAPHIFY_TRACK_LOG:-$HOME/.claude/admin-team/graphify-usage.jsonl}"
}
gt_reminder "$1" 2>/dev/null
unset -f gt_reminder
