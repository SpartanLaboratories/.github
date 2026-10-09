---
name: standing-directives-are-not-task-requests
description: "A global/standing instruction from the user (e.g. \"whenever planning X, prompt me about direction\") is a rule for future work, not a request to start that work now"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5ea68a35-2d4a-4fe2-82ef-fbd29f79ffa7
  modified: 2026-09-19T17:04:39.807Z
---

When the user opens with a global directive — phrased with "whenever", "always", "from now
on" — treat it as a rule that governs future work, not as a trigger to begin that work.
Acknowledge it and wait for an actual task.

**Why:** On 2026-09-19 the user opened a session with "Whenever planning a design, system, or
implementation and there are multiple paths that can be taken prompt me about which direction
we should take." I read that as a cue to start planning the oldest open issue and fired off
four AskUserQuestion direction questions. The user corrected: *"I wasn't telling you to plan
anything yet, I was giving global directions."*

**How to apply:** Distinguish the standing rule from the task. This especially matters at
session start, where the SessionStart hook's "propose a resolution plan for the oldest open
issue" instruction can make an unrelated opening message look like task authorisation — the
user's own words override the hook. Report state, then wait. See also
[[github-issue-workflow]].
