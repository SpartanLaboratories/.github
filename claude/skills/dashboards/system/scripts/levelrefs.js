// Work-level references (GUIDANCE.md §4, "No work levels"): the dashboards never show an issue's work level (level 1 to 4, "L3",
// "level: 2", a "level-3 change"). Plans keep their level as data where a script needs it (plan.json "level", unit.level,
// wip.proposedLevel), and nothing renders it.
// These patterns find the unambiguous forms in rendered text and in the data a page renders. They leave the five-level test
// hierarchy alone ("Level 2 — the class and the claim", "tests at levels 1 to 4c", "the Level-4c suite"), which a dashboard
// shows freely, and the C4 model's levels ("Level 1 · System Context"): a test level is never followed by a word naming work
// (change, fix, issue, run, plan …), never written "L1".."L4" alone, and never "level: n".
// Used by plan/scripts/check.js (every string of plan.json and board.json) and by check-page.js (the rendered text of every tab).
"use strict";
const LEVEL_PATTERNS = [
  ["\\blevel:\\s*[1-4]\\b", "i"],                                                         // the label: "level: 2"
  ["\\bL[1-4]\\b", ""],                                                                    // the short form: "L3" (not "L4c")
  ["\\b(?:work|issue|tracking)[- ]levels?\\b", "i"],                                       // "work level", "work-level labels"
  ["\\blevel[- ][1-4]\\b[- ](?:change|changes|fix|fixes|feature|features|issue|issues|run|runs|work|plan|plans|bump|label|labels|sub-issue|sub-issues|tracking|initiative|roadmap)\\b", "i"],
  ["\\bre-?level(?:led|ed|ing|s)?\\b", "i"],                                               // "re-level", "relevelled"
  ["\\b(?:escalat\\w*|re-?sized?|sized|labelled|labeled) (?:to|as|at) level [1-4]\\b", "i"],  // "escalated to level 3"
  ["\\bat (?:its|their|his|her) own level\\b", "i"],                                       // "planned at its own level"
  ["[(,;]\\s*level [1-4]\\s*[),;]", "i"],                                                 // "(#61, level 3)"
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
