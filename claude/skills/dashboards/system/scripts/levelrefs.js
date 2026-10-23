// Work-level references (GUIDANCE.md §4, "No work levels"): the dashboards never show an issue's work level (level 1 to 4, "L3",
// "level: 2", a "level-3 change"). Plans keep their level as data where a script needs it (plan.json "level", unit.level,
// wip.proposedLevel), and nothing renders it.
// These patterns find the unambiguous forms in rendered text and in the data a page renders. They leave the five-level test
// hierarchy alone ("Level 2 — the class and the claim", "tests at levels 1 to 4c", "the Level-4c suite"), which a dashboard
// shows freely with its level label ("L1 gating", "L2 component", "L4a deterministic", "L5 UAT"), and the C4 model's levels
// ("Level 1 · System Context"): the rule covers the /resolve-issue pipeline's work levels only. A test level is never followed by
// a word naming work (change, fix, issue, run, plan …) and never written "level: n"; "L1".."L4" count as a work level only when no
// test level's name follows ("L3" alone, never "L1 gating"), and "Level 3" alone never counts.
// Used by plan/scripts/check.js (every string of plan.json and board.json) and by check-page.js (the rendered text of every tab).
"use strict";
/* The test levels' names, matched in any case (a table head may set them in capitals: "L1 GATING") while the "L" itself stays
   case-sensitive: each letter becomes a class of both its cases. */
const anyCase = w => w.replace(/[a-z]/gi, c => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const TEST_LEVEL_NAMES = ["gating", "component", "integration", "deterministic", "e2e", "non-?functional", "uat"].map(n => n.includes("?") ? n.split("-?").map(anyCase).join("-?") : anyCase(n)).join("|");
const LEVEL_PATTERNS = [
  ["\\blevel:\\s*[1-4]\\b", "i"],                                                         // the label: "level: 2"
  // the short form "L3", unless a test level's name follows ("L1 gating", "L3 · integration"); "L4c" never matches
  [`\\bL[1-4]\\b(?!\\s*(?:[·:—–-]\\s*)?(?:${TEST_LEVEL_NAMES})\\b)`, ""],
  ["\\b(?:work|issue|tracking)[- ]levels?\\b", "i"],                                       // "work level", "work-level labels"
  ["\\blevel[- ][1-4]\\b[- ](?:change|changes|fix|fixes|feature|features|issue|issues|run|runs|work|plan|plans|planner|planners|planning|bump|label|labels|sub-issue|sub-issues|tracking|initiative|roadmap)\\b", "i"],
  ["\\bre-?level(?:led|ed|ing|s)?\\b", "i"],                                               // "re-level", "relevelled"
  ["\\b(?:escalat\\w*|re-?sized?|sized|labelled|labeled) (?:to|as|at) level [1-4]\\b", "i"],  // "escalated to level 3"
  ["\\bat (?:its|their|his|her) own level\\b", "i"],                                       // "planned at its own level"
  ["[(,;]\\s*level [1-4]\\s*[),;:]", "i"],                                                // "(#61, level 3)", "#55, level 2: a bug fix"
];
const REGEXES = LEVEL_PATTERNS.map(([s, f]) => new RegExp(s, f + "g"));
/* Every work-level reference in a text, as the matched strings. */
function levelRefs(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  REGEXES.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(text))) out.push(m[0]); });
  return out;
}
/* Every work-level reference in the strings of a data file: [{ at, hit }]. Keys are not text and are skipped; so are numbers. */
function levelRefsIn(v, at, found) {
  found = found || [];
  if (typeof v === "string") levelRefs(v).forEach(hit => found.push({ at: at || "(root)", hit }));
  else if (Array.isArray(v)) v.forEach((x, i) => levelRefsIn(x, `${at}[${i}]`, found));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") levelRefsIn(v[k], at ? `${at}.${k}` : k, found); });
  return found;
}
module.exports = { LEVEL_PATTERNS, levelRefs, levelRefsIn };
