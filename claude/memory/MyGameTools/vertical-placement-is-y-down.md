---
name: vertical-placement-is-y-down
description: "In MyGameTools a smaller y is higher on screen — \"above\" an object means -y"
metadata: 
  node_type: memory
  type: project
  originSessionId: 39b5a082-13a1-4bbe-b7f1-281d2a868dbf
  modified: 2026-08-31T03:52:35.830Z
---

When placing something visually **above** an object in MyGameTools, subtract from `y`.
`Alive` positions its health bar at `location.y - healthBarYOffset` (both in the constructor
and in `onUpdate`) and its KDoc calls that "above the actor". `AliveTest`'s
"health bar follows the actor" expects `location.y - offset`.

**Why:** On 2026-08-30 the user reverted the health-bar offset from `+` back to `-`, saying
"it was wrong before, - is above the actor." This overturns an earlier note that claimed the
world was y-up with "above" = +y (that note has been deleted).

**How to apply:** vertical screen placement is y-down — "above" = `-y`, "below" = `+y`.
This sits in tension with `Actor.angle` (`atan2(dy, dx)`, counter-clockwise from +x) and
`Quadtree`'s "north = +y" comment, which are math-oriented and were left unchanged. If a new
feature needs a vertical offset and the direction isn't obvious from nearby code, ask.
See [[project-guidance-in-aiassistant-rules]].
