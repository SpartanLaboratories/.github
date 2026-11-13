// Work levels and the boards (admin-team/dashboards-skill/option-d-and-decisions): a work level is never kept in plan.json. Not a command.
// A board's kind and its wip.steps answer what a script asks (tracking or not; a line with an interview or not); where a script needs the level at
// the moment of an event it comes from the request (its level, facts.level), else from the team's local state
// (~/.claude/admin-team/state.json, levels["owner/repo#n"]), never from the board. A board written before this may still carry the fields:
// plan.level, rows[].unit.level, wip.proposedLevel and a unit's mirror's proposedLevel. They are read without failing. A closed work board (landed
// or cancelled) keeps them as data, never shown, whatever rewrites it, and nothing re-adds them; an open board drops them at any rewrite, and check.js fails one that holds them. A
// tracking board with units in flight is open.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* landed: the run (on a tracking board, its last unit) has landed. A cancelled board is not landed: it stopped. */
const boardLanded = plan => !!plan && (plan.status === "built" || (!!plan.wip && plan.wip.step === "landed"));
/* closed: the run has ended, landed or cancelled, and the board is kept as it closed (GUIDANCE.md §11). What holds a work level asks this; what needs an actual landing asks boardLanded. */
const boardClosed = plan => !!plan && (["built", "abandoned"].includes(plan.status) || (!!plan.wip && ["landed", "cancelled"].includes(plan.wip.step)));
const unitRows = plan => (Array.isArray(plan && plan.rows) ? plan.rows : []).filter(r => r && r.unit && typeof r.unit === "object");
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/* where a board holds a work level: the paths, for check.js */
function workLevelFields(plan) {
  if (!plan || typeof plan !== "object") return [];
  const out = [];
  /* a grade (the user's decision of 2026-11-13, vocabulary/choice-1-live-keys (a): grade and proposedGrade beside level and proposedLevel)
     is a work level under its new name: never kept either */
  ["level", "grade"].forEach(k => { if (own(plan, k)) out.push(k); });
  ["proposedLevel", "proposedGrade"].forEach(k => { if (plan.wip && typeof plan.wip === "object" && own(plan.wip, k)) out.push(`wip.${k}`); });
  unitRows(plan).forEach(r => {
    ["level", "grade"].forEach(k => { if (own(r.unit, k)) out.push(`rows (${r.id}).unit.${k}`); });
    ["proposedLevel", "proposedGrade"].forEach(k => { if (r.unit.live && typeof r.unit.live === "object" && own(r.unit.live, k)) out.push(`rows (${r.id}).unit.live.${k}`); });
  });
  return out;
}
/* An open board loses them, in place; a closed one is left as it is. Returns one line when it changed the board (embed.js and apply-event.js rewrite on it). */
function dropWorkLevels(plan) {
  if (!plan || boardClosed(plan)) return [];
  const had = workLevelFields(plan); if (!had.length) return [];
  delete plan.level; delete plan.grade;
  if (plan.wip && typeof plan.wip === "object") { delete plan.wip.proposedLevel; delete plan.wip.proposedGrade; }
  unitRows(plan).forEach(r => { delete r.unit.level; delete r.unit.grade; if (r.unit.live && typeof r.unit.live === "object") { delete r.unit.live.proposedLevel; delete r.unit.live.proposedGrade; } });
  return [`the work level dropped (${had.join(", ")}): a board keeps none`];
}
/* The team's local record of an issue's level, or null: no file, no entry, or a machine without the team. DASHBOARDS_ADMIN_STATE points elsewhere (the verify cases). */
function localLevel(repo, issue) {
  const file = process.env.DASHBOARDS_ADMIN_STATE || path.join(os.homedir(), ".claude", "admin-team", "state.json");
  /* the state's grades first, then its levels (the user's decision of 2026-11-13, vocabulary/choice-1-live-keys (a); the levels read until the rule rework's L12) */
  try { const st = JSON.parse(fs.readFileSync(file, "utf8")), k = `${repo}#${issue}`, v = [(st.grades || {})[k], (st.levels || {})[k]].find(x => [1, 2, 3, 4].includes(x)); return v != null ? v : null; } catch (e) { return null; }
}
/* a board's run, as its steps line tells it: a small feature's line has an interview, a small fix's has none; a tracking issue is its kind */
const featureRun = plan => !!plan && plan.kind !== "tracking" && Array.isArray((plan.wip || {}).steps) && plan.wip.steps.includes("interview");

module.exports = { boardLanded, boardClosed, workLevelFields, dropWorkLevels, localLevel, featureRun };
