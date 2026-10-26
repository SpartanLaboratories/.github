// Work-level references (GUIDANCE.md §4, "No work levels"): the dashboards never show an issue's work level (level 1 to 4, "L3",
// "level: 2", a "level-3 change"). Plans keep their level as data where a script needs it (plan.json "level", unit.level,
// wip.proposedLevel), and nothing renders it.
// These patterns find the unambiguous forms in rendered text and in the data a board renders. They leave the five-level test
// hierarchy alone ("Level 2 — the class and the claim", "tests at levels 1 to 4c", "the Level-4c suite"), which a dashboard
// shows freely with its level label ("L1 gating", "L2 component", "L4a deterministic", "L5 UAT"), and the C4 model's levels
// ("Level 1 · System Context"): the rule covers the /resolve-issue pipeline's work levels only. A test level is never followed by
// a word naming work (change, fix, issue, run, plan, re-pass …) and never written "level: n"; "L1".."L4" count as a work level only
// when no test level's name follows ("L3" alone, never "L1 gating"), and "Level 3" alone never counts, nor does "Level 4a tests".
// A scope phrase names a work level too ("inside level 3", "within level 2", "outside level 3": the bounds of a sizing), unless a
// test level's name or "test" follows it ("inside level 3 integration tests").
// An unnumbered mention names a work level too (dashboards-skill/33): the sizing's own words, "Recorded level confirmed", "the proposed
// level", "the level re-check", "the issue's level" — never a test level's, a log level's or a C4 level's ("the test level is
// recorded", "log level kept", "Level 1 · System Context").
// Used by plan/scripts/check.js (every string of plan.json and board.json) and by check-board.js (the rendered text of every tab).
// scrubLevels() rewords a pipeline fact that names a work level so that it names none (admin-team/dashboards-skill/23): the scope
// phrase becomes the unit's or the issue's scope, the level before a noun is elided ("a level-3 re-pass" → "a re-pass"), the label
// ("Label level: 3") is dropped with its punctuation; apply-event.js and apply-state.js write the reworded text, never the level.
// A quotation (a plan excerpt, lib.js sectionOf()) keeps its "…" elision instead: a quote is never reworded. An issue's title is quoted
// verbatim and never reworded or elided either: one that names a work level is a defect in the issue, flagged ISSUE TITLE NAMES A WORK
// LEVEL: #n (issueTitleRefs(), titleDefect(); admin-team/dashboards-skill/28), never a failure of the board.
"use strict";
/* The test levels' names, matched in any case (a table head may set them in capitals: "L1 GATING") while the "L" itself stays
   case-sensitive: each letter becomes a class of both its cases. */
const anyCase = w => w.replace(/[a-z]/gi, c => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const TEST_LEVEL_NAMES = ["gating", "component", "integration", "deterministic", "e2e", "non-?functional", "uat"].map(n => n.includes("?") ? n.split("-?").map(anyCase).join("-?") : anyCase(n)).join("|");
/* what may follow a test level: its name (after up to two qualifying words, "L1 per-type gating"), or "test(s)" itself */
const NOT_TEST = `(?!\\s*(?:[·:—–-]\\s*)?(?:[\\w-]+\\s+){0,2}(?:${TEST_LEVEL_NAMES})\\b)`;
const NOT_TEST_OR_TESTS = `(?!\\s*(?:[·:—–-]\\s*)?(?:[\\w-]+\\s+){0,2}(?:${TEST_LEVEL_NAMES}|${anyCase("tests")}|${anyCase("test")})\\b)`;
/* the nouns that make "level-3 <noun>" a work level: work, its run and its sizing, never a test's ("pass", "unit" and "review" stay out:
   "the Level 3 pass", "Level 2 unit tests" are test levels) */
const WORK_NOUNS = "change|changes|fix|fixes|feature|features|issue|issues|run|runs|work|plan|plans|planner|planners|planning|bump|label|labels|sub-issue|sub-issues|tracking|initiative|roadmap|re-pass|re-passes|repass|repasses|scope|sizing|pipeline|budget|qa";
const SCOPE_WORDS = "inside|within|outside|beyond";
/* the words before "level" that make it another kind of level, never a work level */
const OTHER_LEVEL = "test|testing|gating|component|integration|deterministic|e2e|non-functional|nonfunctional|uat|unit|log|logging|trace|debug|info|warn|error|c4|zoom|isolation|api|access|compression|nesting|indent|indentation|heading|top|sea|noise|power|signal|battery|volume|risk|severity|confidence|service|stability|support|maturity|privilege|security|trust|quality";
const NOT_OTHER = `(?<!\\b(?:${OTHER_LEVEL})[- ])`;
const LEVEL_PATTERNS = [
  ["\\blevel:\\s*[1-4]\\b", "i"],                                                         // the label: "level: 2", "Label level: 3"
  // the short form "L3", unless a test level's name follows ("L1 gating", "L3 · integration"); "L4c" never matches
  // (up to two qualifying words may come between: "L1 per-type gating", "L2 value-type component")
  [`\\bL[1-4]\\b${NOT_TEST}`, ""],
  ["\\b(?:work|issue|tracking)[- ]levels?\\b", "i"],                                       // "work level", "work-level labels"
  [`\\blevel[- ][1-4]\\b[- ](?:${WORK_NOUNS})\\b`, "i"],                                    // "a level-3 change", "level-3 re-pass"
  ["\\bre-?level(?:led|ed|ing|s)?\\b", "i"],                                               // "re-level", "relevelled"
  ["\\b(?:escalat\\w*|re-?sized?|sized|labelled|labeled) (?:to|as|at) level [1-4]\\b", "i"],  // "escalated to level 3"
  ["\\bat (?:its|their|his|her) own level\\b", "i"],                                       // "planned at its own level"
  ["[(,;]\\s*level [1-4]\\s*[),;:]", "i"],                                                // "(#61, level 3)", "#55, level 2: a bug fix"
  [`\\b(?:${SCOPE_WORDS})\\s+(?:the\\s+)?level[- ][1-4]\\b${NOT_TEST_OR_TESTS}`, "i"],     // "inside level 3", "within the level-2 bounds"
  /* unnumbered (dashboards-skill/33) */
  [`\\b(?:recorded|proposed|assigned|sized)\\s+(?:work\\s+)?levels?\\b${NOT_TEST_OR_TESTS}`, "i"],                  // "Recorded level confirmed"
  [`${NOT_OTHER}\\blevels?\\s+(?:was\\s+|is\\s+|were\\s+|are\\s+)?(?:confirmed|re-?checked|unchanged|agreed)\\b`, "i"],   // "the level was confirmed"
  [`${NOT_OTHER}\\blevel[ \\t]+(?:re-?checks?|checks?|confirmation|proposal)\\b(?![ \\t]*:)`, "i"],                 // "the level re-check"; on one line, never a "check:" label ("test: every level" beside "check: …")
  ["\\b(?:issue|unit|run|sub-issue)['’]s\\s+level\\b", "i"],                                                           // "the issue's level"
];
const REGEXES = LEVEL_PATTERNS.map(([s, f]) => new RegExp(s, f + "g"));
/* Every work-level reference in a text, as the matched strings. */
function levelRefs(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  REGEXES.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(text))) out.push(m[0]); });
  return out;
}
/* Every work-level reference in the strings of a data file: [{ at, hit }]. Keys are not text and are skipped; so are numbers. skip(at),
   when given, leaves out the strings at the paths it accepts (the issue titles, below). */
function levelRefsIn(v, at, found, skip) {
  found = found || [];
  if (typeof v === "string") { if (!(skip && skip(at || ""))) levelRefs(v).forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => levelRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") levelRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}

/* Issue titles (GUIDANCE.md §4, §5; admin-team/dashboards-skill/28). An issue's title is quoted verbatim: never reworded, never elided.
   Work levels are internal to the pipeline and never part of an issue, so a title that names one is a defect in the issue, not in the
   board: the checks flag it, ISSUE TITLE NAMES A WORK LEVEL: #n, without failing the board (the admin team brings it to the user to
   retitle on GitHub), and the work-level rule above leaves the title's text alone. The fields that quote an issue's title, by data file
   (a path with its indices written []): an issue board's plan.json, the repository work board's board.json, a state board's state.json. */
const TITLE_PATHS = {
  "plan-board": ["issueTitle", "parent.title", "followUps[].title", "roadmap.title", "roadmap.items[].title", "rows[].unit.title"],
  "work-board": ["rows[].title", "groups[].title", "roadmap[].title", "roadmap[].items[].title", "unscheduled[].title"],
  state: ["lastAmended.title"] };
/* the kind of a data file, as TITLE_PATHS names it, or null */
function dataKind(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  if (d.schema === "plan-board/1") return "plan-board";
  if (d.schema === "work-board/1") return "work-board";
  return d.lastAmended && typeof d.lastAmended === "object" && typeof d.slug === "string" ? "state" : null;
}
const isTitlePath = (kind, at) => !!kind && (TITLE_PATHS[kind] || []).includes(String(at || "").replace(/\[\d+\]/g, "[]"));
/* the skip() of levelRefsIn() for a data file: its issue titles */
const titleSkip = (data, kind) => { const k = kind || dataKind(data); return at => isTitlePath(k, at); };
/* Every quoted issue title of a data file that names a work level: [{ at, issue, title, hits }], issue the number of the issue it quotes
   (the issue field beside it; for an issue board's issueTitle, the board's own issue), or null where none is recorded. */
function issueTitleRefs(data, kind) {
  const k = kind || dataKind(data), out = [];
  if (!k) return out;
  const walk = (v, at, holder) => {
    if (typeof v === "string") { if (isTitlePath(k, at)) { const hits = levelRefs(v); if (hits.length) out.push({ at, issue: holder && Number.isInteger(holder.issue) ? holder.issue : null, title: v, hits }); } }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`, holder));
    else if (v && typeof v === "object") Object.keys(v).forEach(key => { if (key !== "$comment") walk(v[key], at ? `${at}.${key}` : key, v); });
  };
  walk(data, "", data);
  return out;
}
/* Every title a data file quotes (whatever it says): the browser pass leaves each, JSON-quoted as a Source view prints it, out of its
   work-level scan, as it leaves out the titles a board marks data-issue-title (check-board.js) */
function quotedTitles(data, kind) {
  const k = kind || dataKind(data), out = [];
  if (!k) return out;
  const walk = (v, at) => {
    if (typeof v === "string") { if (isTitlePath(k, at)) out.push(v); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`));
    else if (v && typeof v === "object") Object.keys(v).forEach(key => { if (key !== "$comment") walk(v[key], at ? `${at}.${key}` : key); });
  };
  walk(data, "");
  return [...new Set(out)];
}
/* the flag's line: the issue first, then where the title is quoted and the words that name a work level */
const titleDefect = x => `ISSUE TITLE NAMES A WORK LEVEL: #${x.issue != null ? x.issue : "?"} (${x.at}: ${JSON.stringify(x.title)} names ${x.hits.map(h => JSON.stringify(h)).join(", ")}): a defect in the issue, quoted verbatim on the board; the issue is retitled on GitHub`;

/* A pipeline fact reworded so that it names no work level (GUIDANCE.md §4; plan/RULES.md §4, "The fast path"): the scope phrase
   ("inside level 3") becomes "inside the unit's scope" (opts.scope: "unit" on a sub-issue's board, else "issue"), the level before a
   noun is elided ("a level-3 re-pass" → "a re-pass", the article mended: "a level-3 issue" → "an issue"), the label ("Label level: 3",
   "(level: 2)") is dropped with the punctuation it leaves, "escalated to level 4" reads "escalated", "re-levelled" "re-sized", "the work
   level" "the sizing", "at its own level" "on its own", "(#61, level 3)" "(#61)", an "L3" before a noun is elided. Test-level phrases are
   left as they are. Returns the reworded text, or null when a work level is still named after the rewording (the caller drops the text
   and tells the presenter), or the text itself when it names none. */
function scrubLevels(text, opts) {
  if (typeof text !== "string" || !levelRefs(text).length) return text;
  const scope = `the ${opts && opts.scope === "unit" ? "unit" : opts && typeof opts.scope === "string" && opts.scope.trim() ? opts.scope.trim() : "issue"}'s scope`;
  let s = text;
  const cap = /^[A-Z]/.test(s.trim());
  /* an elision: the article before it mended to the word after it */
  const elide = (re) => { s = s.replace(re, (m, ...a) => { const off = a[a.length - 2], src = a[a.length - 1], before = src.slice(0, off), after = src.slice(off + m.length);
    const art = /\b(an?)\s+$/i.exec(before); if (!art) return "";
    const want = /^\s*[aeiou]/i.test(after) && !/^\s*(?:u[nb]i|use|eu|one)/i.test(after) ? "an" : "a";
    return art[1].toLowerCase() === want ? "" : `\u0000${want}\u0000`; }); };
  s = s.replace(new RegExp(`\\b(${SCOPE_WORDS})\\s+(?:the\\s+)?level[- ][1-4]\\b(?:\\s+(?:scope|bounds|limits|work))?${NOT_TEST_OR_TESTS}`, "gi"), (m, w) => `${w} ${scope}`);
  s = s.replace(/\b(escalat\w*|re-?sized?|sized|labelled|labeled)\s+(?:to|as|at)\s+level\s+[1-4]\b/gi, "$1");
  s = s.replace(/\bat (its|their|his|her) own level\b/gi, "on $1 own");
  const resize = (m, e) => `re-siz${!e ? "e" : /^(led|ed)$/i.test(e) ? "ed" : /ing/i.test(e) ? "ing" : "es"}`;
  s = s.replace(/\bre-?level(led|ed|ing|s)?\s+(?:to|as|at)\s+(?:level\s+)?[1-4]\b/gi, resize);
  s = s.replace(/\bre-?level(led|ed|ing|s)?\b/gi, resize);
  s = s.replace(/\b(work|issue|tracking)[- ](levels?)\b/gi, (m, w, l) => /s$/i.test(l) ? "sizings" : "sizing");
  /* an unnumbered mention: the level becomes the sizing ("Recorded level confirmed" → "Recorded sizing confirmed") */
  s = s.replace(new RegExp(`\\b(recorded|proposed|assigned|sized)\\s+(?:work\\s+)?(levels?)(?:[:\\s]+[1-4]\\b)?${NOT_TEST_OR_TESTS}`, "gi"), (m, w, l) => `${w} ${/s$/i.test(l) ? "sizings" : "sizing"}`);
  s = s.replace(new RegExp(`${NOT_OTHER}\\b(levels?)(\\s+(?:was\\s+|is\\s+|were\\s+|are\\s+)?(?:confirmed|re-?checked|unchanged|agreed)\\b)`, "gi"), (m, l, rest) => (/^L/.test(l) ? "Sizing" : "sizing") + rest);
  s = s.replace(new RegExp(`${NOT_OTHER}\\b(level)([ \\t]+(?:re-?checks?|checks?|confirmation|proposal)\\b(?![ \\t]*:))`, "gi"), (m, l, rest) => (/^L/.test(l) ? "Sizing" : "sizing") + rest);
  s = s.replace(/\b(issue|unit|run|sub-issue)(['’]s)\s+level\b/gi, "$1$2 sizing");
  s = s.replace(/\(\s*(?:the\s+)?(?:label(?:led|ed)?\s+)?level:?\s*[1-4]\s*\)/gi, "");
  s = s.replace(/\s*[,;]\s*level [1-4]\s*(?=[),;:])/gi, "");
  s = s.replace(/\(\s*level [1-4]\s*\)/gi, "");
  s = s.replace(/\b(?:the\s+)?(?:label(?:led|ed)?\s+)?level:\s*[1-4]\b/gi, "");
  elide(new RegExp(`\\blevel[- ][1-4][- ](?=(?:${WORK_NOUNS})\\b)`, "gi"));
  elide(new RegExp(`\\bL[1-4]\\b${NOT_TEST}\\s*`, "g"));
  /* the article markers, then the punctuation and spaces an elision leaves */
  s = s.replace(/\b(an?)\s+\u0000(an?)\u0000/gi, (m, a, w) => (a[0] === "A" ? w[0].toUpperCase() + w.slice(1) : w) + " ").replace(/\u0000/g, "");
  s = s.replace(/\(\s*\)/g, "").replace(/\(\s*[,;:]\s*/g, "(").replace(/\s*[,;:]\s*\)/g, ")")
    .replace(/([.?!])\s+\.(?=\s|$)/g, "$1").replace(/\s*[,;:]\s+(?=[.?!](?:\s|$))/g, "")
    .replace(/\s+([,;:.)])/g, "$1").replace(/([,;:])(?:\s*[,;:])+/g, "$1").replace(/^\s*[,;:.]\s*/, "").replace(/[,;:]\s*$/, "").replace(/\s{2,}/g, " ").trim();
  if (cap && /^[a-z]/.test(s)) s = s[0].toUpperCase() + s.slice(1);
  return s && !levelRefs(s).length ? s : null;
}
module.exports = { LEVEL_PATTERNS, levelRefs, levelRefsIn, scrubLevels, TITLE_PATHS, dataKind, isTitlePath, titleSkip, issueTitleRefs, quotedTitles, titleDefect };
