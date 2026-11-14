// Grade references (GUIDANCE.md §4, "No grades"): the dashboards never show an issue's grade (the size of its work, grade 1 to 4:
// ~/.claude/nomenclature/vocabulary.md, CLAUDE.md "Work grades"), in any form: GRADE_PATTERNS below. A board keeps no grade as data: an
// older closed board's plan.json "level", unit.level and wip.proposedLevel are numbers, not text, and nothing renders them
// (plan/scripts/levels.js).
// The forms are those of the word "grade" alone, so no other kind of level is taken for one: an old test level a landed plan document
// keeps and a board quotes ("Level 2 — the class and the claim", "L1 gating"), a documentation level ("level-1 KDoc") and a C4 level
// ("Level 1 · System Context") are left as they are. Tests are called by their set, never by a number (vocabulary.md, "set"):
// nameTestLevels() below writes a test set written by its old number by its set's name (dashboards-skill/35).
// Used by plan/scripts/check.js (every string of plan.json and board.json) and by check-board.js (the rendered text of every tab).
// scrubLevels() rewords a pipeline fact that names a grade so that it names none (admin-team/dashboards-skill/23): the scope phrase becomes
// the unit's or the issue's scope, the grade before a noun is elided ("a grade-3 re-pass" → "a re-pass"), the label ("Label grade: 3") is
// dropped with its punctuation; apply-event.js and apply-state.js write the reworded text, never the grade.
// A quotation (a plan excerpt, lib.js sectionOf()) keeps its "…" elision instead: a quote is never reworded. An issue's title is quoted
// verbatim and never reworded or elided either: one that names a grade is a defect in the issue, flagged ISSUE TITLE NAMES A GRADE: #n
// (issueTitleRefs(), titleDefect(); admin-team/dashboards-skill/28), never a failure of the board. A slug made from the title (a plan folder's
// name, where a path puts it) is left out of the scan as the title is, and flagged nowhere (maskSlugs(); the user's decision of 2026-11-14,
// batch-8/q-54).
"use strict";
/* The test sets' names, matched in any case (a table head may set them in capitals: "L1 GATING") while the "L" itself stays
   case-sensitive: each letter becomes a class of both its cases. */
const anyCase = w => w.replace(/[a-z]/gi, c => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const TEST_LEVEL_NAMES = ["gating", "component", "integration", "deterministic", "e2e", "non-?functional", "uat"].map(n => n.includes("?") ? n.split("-?").map(anyCase).join("-?") : anyCase(n)).join("|");
/* A test word beside a bare "Ln" (admin-team/dashboards-skill/35): "L2 test", "L1 regression tests", "tests (L3)", "regression test (L2)"
   is a test set written by its old number, which nameTestLevels() writes by its set's name ("component test", "tests (integration)"; "L4
   tests", the three project-wide sets together, "project-wide tests"). A test word follows the level (after up to two qualifying words) or
   stands right before it, with at most a bracket, a colon or a dash between. */
const TEST_WORD = `${anyCase("tests")}|${anyCase("test")}`;
const AFTER_TEST = `\\s*(?:[·:—–-]\\s*)?(?:[\\w-]+\\s+){0,2}(?:${TEST_WORD})\\b`;
const BEFORE_TEST = `\\b(?:${TEST_WORD})\\s*[(:·—–-]?\\s*`;
/* each old short form's set (vocabulary.md, "set"; CLAUDE.md, "Testing — Named Test Sets"): L4 alone is the three project-wide sets */
const TEST_LEVEL_SHORT = { 1: "gating", 2: "component", 3: "integration", 4: "project-wide", "4a": "deterministic", "4b": "e2e", "4c": "nonfunctional", 5: "uat" };
const SCOPE_WORDS = "inside|within|outside|beyond";
/* Grades (the user's decisions of 2026-11-13: vocabulary/decided-set (1), choice-2-grade-reach (a)): the size of an issue's work is its
   grade, and the word in every form is barred from what a board shows, numbered or not, in any case, a hyphenated compound included:
   "grade 3", "grade: 2", "a grade-4 issue", "graded", "grading", "re-grade", "regraded", "the recorded grade", "work grade",
   "carrier-grade". No other sense of the word is let through, so no heuristic stands beside it. A match is the word with the hyphenated
   compound it stands in and the number after it; a longer word that only holds the letters ("upgrade", "degrade", "centigrade", "Gradle",
   "gradient") and an identifier ("proposedGrade") are not the word. */
const GRADE_WORD = "(?:re-?)?grad(?:e|es|ed|ing)";
const GRADE_PATTERNS = [
  [`(?<![\\w-])(?:[a-z0-9]+-)*${GRADE_WORD}(?:-[a-z0-9]+)*(?![\\w-])(?:[ \\t]*:?[ \\t]*[1-4]\\b)?`, "i"],   // "grade 3", "a grade-4 issue", "re-graded", "carrier-grade"
];
/* A pipeline fact's grade reworded: the scope phrase ("inside grade 3") becomes the unit's or the issue's scope, "escalated to grade 4" reads "escalated", "at its own grade" "on its own", "re-graded" "re-sized", "graded" "sized",
   "grading" "sizing", "the work grade" "the sizing", "the recorded grade: 3" "the recorded sizing", the label ("grade: 3", "(grade 3)",
   "(#61, grade 3)") is dropped with its punctuation, a numbered grade before a noun is elided ("a grade-3 re-pass" → "a re-pass", "a grade 3
   issue" → "an issue"), and the word left unnumbered reads "sizing" ("the grade re-check" → "the sizing re-check"). A hyphenated compound
   ("carrier-grade") and a numbered grade no rule above takes have no rewording: they stay, scrubLevels() returns null, and the caller
   leaves the text out and tells the presenter. Its elision marks the article to mend, and scrubLevels() mends it. */
function scrubGrades(s, scope) {
  const NB = "(?<![\\w-])", NA = "(?![\\w-])";
  const elide = re => { s = s.replace(re, (m, ...a) => { const off = a[a.length - 2], src = a[a.length - 1], before = src.slice(0, off), after = src.slice(off + m.length);
    const art = /\b(an?)\s+$/i.exec(before); if (!art) return "";
    const want = /^\s*[aeiou]/i.test(after) && !/^\s*(?:u[nb]i|use|eu|one)/i.test(after) ? "an" : "a";
    return art[1].toLowerCase() === want ? "" : `\u0000${want}\u0000`; }); };
  const caseOf = (m, w) => m === m.toUpperCase() && /[A-Z]/.test(m) ? w.toUpperCase() : /^[A-Z]/.test(m) ? w[0].toUpperCase() + w.slice(1) : w;
  s = s.replace(new RegExp(`${NB}(${SCOPE_WORDS})\\s+(?:the\\s+)?grade[- ][1-4]\\b(?:\\s+(?:scope|bounds|limits|work)${NA})?`, "gi"), (m, w) => `${w} ${scope}`);
  s = s.replace(new RegExp(`${NB}(escalat\\w*|re-?sized?|sized|labelled|labeled)\\s+(?:to|as|at)\\s+grade\\s+[1-4]\\b`, "gi"), "$1");
  s = s.replace(new RegExp(`${NB}at (its|their|his|her) own grade${NA}`, "gi"), "on $1 own");
  s = s.replace(new RegExp(`${NB}(re-?)grad(e|es|ed|ing)(?:\\s+(?:to|as|at)\\s+(?:grade\\s+)?[1-4]\\b)?${NA}`, "gi"), (m, r, e) => caseOf(m, `re-siz${e.toLowerCase()}`));
  s = s.replace(new RegExp(`${NB}grad(ed|ing)(?:\\s+(?:to|as|at)\\s+(?:grade\\s+)?[1-4]\\b)?${NA}`, "gi"), (m, e) => caseOf(m, `siz${e.toLowerCase()}`));
  s = s.replace(new RegExp(`${NB}(?:work|issue|tracking)[- ](grades?)${NA}`, "gi"), (m, g) => caseOf(m, /s$/i.test(g) ? "sizings" : "sizing"));
  s = s.replace(new RegExp(`${NB}(recorded|proposed|assigned|sized)\\s+(?:work\\s+)?(grades?)(?:[:\\s]+[1-4]\\b)?${NA}`, "gi"), (m, w, g) => `${w} ${/s$/i.test(g) ? "sizings" : "sizing"}`);
  s = s.replace(/\(\s*(?:the\s+)?(?:label(?:led|ed)?\s+)?grade:?\s*[1-4]\s*\)/gi, "");
  s = s.replace(/\s*[,;]\s*grade:?\s*[1-4]\s*(?=[),;:])/gi, "");
  s = s.replace(new RegExp(`${NB}(?:the\\s+)?(?:label(?:led|ed)?\\s+)?grade:\\s*[1-4]\\b`, "gi"), "");
  elide(new RegExp(`${NB}grade-[1-4][- ](?=[a-z])`, "gi"));
  elide(new RegExp(`(?<=\\b(?:an?|another|later|next|the|this|that|each|every|its|their)\\s+)grade [1-4] (?=[a-z])`, "gi"));
  /* the word left unnumbered, out of a compound: "the grade", "grades" */
  s = s.replace(new RegExp(`${NB}(grades?)${NA}(?![ \\t]*:?[ \\t]*[1-4]\\b)`, "gi"), (m, g) => caseOf(m, /s$/i.test(g) ? "sizings" : "sizing"));
  return s;
}
const REGEXES = GRADE_PATTERNS.map(([s, f]) => new RegExp(s, f + "g"));
/* Slugs (the user's decision of 2026-11-14, batch-8/q-54 (a)): a plan folder's name, <number>-<slug> (CLAUDE.md, "Planning documents"), is
   made from its issue's title, so the grade check skips it as it skips the title (below), wherever it stands as a folder or a slug: the
   board's slug, the plan folder, a board's path, a link to a board or into a folder, a report's copy, a path a text cites. It counts where
   a path puts it: a folder, ended by a "/" ("55-slug/62-slug/dashboard.html", "see 62-slug/plan.md"); the last folder of a path under
   docs/plans/ ("docs/plans/55-slug/62-slug"); a slug standing alone, the whole string or in quotation marks as a Source view prints one.
   The same token in prose with no path around it, a file's name ("62-slug.md"), an anchor after a "#" and a branch ("fix/62-slug",
   "feat/issue-62-slug": an identifier, read whole, plan/RULES.md §4) are no slug: a grade there is still found. The title itself stays
   flagged (issueTitleRefs(), which reads the title whole, titleRefs()); a slug made from it is not. SLUG_PATTERNS are the forms
   (check-board.js's browser pass takes them too); maskSlugs() blanks them before a scan. */
const SLUG = "\\d+-[a-z0-9]+(?:-[a-z0-9]+)*";
const SLUG_PATTERNS = [
  `(?<![\\w.-])${SLUG}(?=/)`,                                  // a folder in a path, ended by its "/" ("55-slug/62-slug/", "see 62-slug/plan.md")
  `(?<=(?:^|[^\\w.-])docs/plans/(?:[^\\s/"'\`]+/)*)${SLUG}(?![\\w.-])`,   // the last folder of a path under docs/plans/ (a board's folder)
  `(?<=^|")${SLUG}(?=$|")`,                                    // a slug alone: the whole string, or in quotation marks (a Source view)
];
const SLUG_RES = SLUG_PATTERNS.map(s => new RegExp(s, "g"));
const maskSlugs = text => typeof text === "string" ? SLUG_RES.reduce((s, re) => s.replace(re, "\u0001"), text) : text;
/* Every grade reference in a text, as the matched strings, the text read whole (an issue's title: titleRefs()) */
function titleRefs(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  REGEXES.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(text))) out.push(m[0]); });
  return out;
}
/* Every grade reference in a text, as the matched strings, its slugs left out (above). */
const levelRefs = text => titleRefs(maskSlugs(text));
/* Every grade reference in the strings of a data file: [{ at, hit }]. Keys are not text and are skipped; so are numbers. skip(at),
   when given, leaves out the strings at the paths it accepts (the issue titles, below). */
function levelRefsIn(v, at, found, skip) {
  found = found || [];
  if (typeof v === "string") { if (!(skip && skip(at || ""))) levelRefs(v).forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => levelRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") levelRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}

/* Issue titles (GUIDANCE.md §4, §5; admin-team/dashboards-skill/28). An issue's title is quoted verbatim: never reworded, never elided.
   Grades are internal to the pipeline and never part of an issue, so a title that names one is a defect in the issue, not in the board:
   the checks flag it, ISSUE TITLE NAMES A GRADE: #n (TITLE_DEFECT), without failing the board (the admin team brings it to the user to
   retitle on GitHub), and the grade rule above leaves the title's text alone. The fields that quote an issue's title, by data file
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
/* Every quoted issue title of a data file that names a grade: [{ at, issue, title, hits }], issue the number of the issue it quotes
   (the issue field beside it; for an issue board's issueTitle, the board's own issue), or null where none is recorded. */
function issueTitleRefs(data, kind) {
  const k = kind || dataKind(data), out = [];
  if (!k) return out;
  const walk = (v, at, holder) => {
    if (typeof v === "string") { if (isTitlePath(k, at)) { const hits = titleRefs(v); if (hits.length) out.push({ at, issue: holder && Number.isInteger(holder.issue) ? holder.issue : null, title: v, hits }); } }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`, holder));
    else if (v && typeof v === "object") Object.keys(v).forEach(key => { if (key !== "$comment") walk(v[key], at ? `${at}.${key}` : key, v); });
  };
  walk(data, "", data);
  return out;
}
/* Every title a data file quotes (whatever it says): the browser pass leaves each, JSON-quoted as a Source view prints it, out of its
   grade scan, as it leaves out the titles a board marks data-issue-title (check-board.js) */
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
/* the flag's line: the issue first, then where the title is quoted and the words that name a grade */
const titleDefect = x => `ISSUE TITLE NAMES A GRADE: #${x.issue != null ? x.issue : "?"} (${x.at}: ${JSON.stringify(x.title)} names ${x.hits.map(h => JSON.stringify(h)).join(", ")}): a defect in the issue, quoted verbatim on the board; the issue is retitled on GitHub`;
/* the flag as a reader finds it in a check's output, its issue captured: the line titleDefect() writes */
const TITLE_DEFECT = /ISSUE TITLE NAMES A GRADE: #([\d?]+)/;

/* A pipeline fact reworded so that it names no grade (GUIDANCE.md §4; plan/RULES.md §4, "The fast path"; scrubGrades(), above): the
   scope phrase ("inside grade 3") becomes "inside the unit's scope" (opts.scope: "unit" on a sub-issue's board, else "issue"), the grade
   before a noun is elided ("a grade-3 re-pass" → "a re-pass", the article mended: "a grade-3 issue" → "an issue"), the label ("Label
   grade: 3", "(grade: 2)") is dropped with the punctuation it leaves, "escalated to grade 4" reads "escalated", "re-graded" "re-sized",
   "the work grade" "the sizing", "at its own grade" "on its own", "(#61, grade 3)" "(#61)". Returns the reworded text, or null when a
   grade is still named after the rewording (the caller drops the text and tells the presenter), or the text itself when it names none. */
function scrubLevels(text, opts) {
  if (typeof text !== "string" || !levelRefs(text).length) return text;
  const scope = `the ${opts && opts.scope === "unit" ? "unit" : opts && typeof opts.scope === "string" && opts.scope.trim() ? opts.scope.trim() : "issue"}'s scope`;
  let s = text;
  const cap = /^[A-Z]/.test(s.trim());
  s = scrubGrades(s, scope);
  /* the article markers, then the punctuation and spaces an elision leaves */
  s = s.replace(/\b(an?)\s+\u0000(an?)\u0000/gi, (m, a, w) => (a[0] === "A" ? w[0].toUpperCase() + w.slice(1) : w) + " ").replace(/\u0000/g, "");
  s = s.replace(/\(\s*\)/g, "").replace(/\(\s*[,;:]\s*/g, "(").replace(/\s*[,;:]\s*\)/g, ")")
    .replace(/([.?!])\s+\.(?=\s|$)/g, "$1").replace(/\s*[,;:]\s+(?=[.?!](?:\s|$))/g, "")
    .replace(/\s+([,;:.)])/g, "$1").replace(/([,;:])(?:\s*[,;:])+/g, "$1").replace(/^\s*[,;:.]\s*/, "").replace(/[,;:]\s*$/, "").replace(/\s{2,}/g, " ").trim();
  if (cap && /^[a-z]/.test(s)) s = s[0].toUpperCase() + s.slice(1);
  return s && !levelRefs(s).length ? s : null;
}
/* A test set written by its old number, written by its set's name (admin-team/dashboards-skill/35; vocabulary.md, "set": a set is
   called by its name, never by a number). A short form its set's name follows drops the number ("L2 component test" → "component test",
   "L3 · integration" → "integration", "L4a deterministic" → "deterministic", "L1 per-type gating" → "per-type gating"); a bare one next to
   a test word takes its set's name ("L2 test" → "component test", "regression test (L2)" → "regression test (component)", "L1 tests" →
   "gating tests", "L5 test" → "uat test", "L4 tests", the three project-wide sets together, → "project-wide tests"). A bare "Ln" with no
   test word beside it is left as it is. Returns { text, named: [the short forms rewritten], as: [the set's name each
   reads now] }. apply-event.js runs it on every fact text before the grade scrub; check.js warns on one a board still carries
   (bareTestLevels(): TEST SET BY NUMBER). */
const SHORT_FORM = "L(1|2|3|4[abc]?|5)";
const SET_NAMES = `${TEST_LEVEL_NAMES}|${anyCase("end-to-end")}`;
function nameTestLevels(text) {
  if (typeof text !== "string" || !text) return { text, named: [], as: [] };
  const named = [], as = [];
  let s = text.replace(new RegExp(`\\b${SHORT_FORM}\\b\\s*(?:[·:—–-]\\s*)?(?=((?:[\\w-]+\\s+){0,2}(?:${SET_NAMES}))\\b)`, "g"), (m, n, name) => { named.push(`L${n}`); as.push(name); return ""; });
  s = s.replace(new RegExp(`\\b${SHORT_FORM}\\b(?=${AFTER_TEST})`, "g"), (m, n) => { named.push(m); as.push(TEST_LEVEL_SHORT[n]); return TEST_LEVEL_SHORT[n]; });
  s = s.replace(new RegExp(`(?<=${BEFORE_TEST})\\b${SHORT_FORM}\\b`, "g"), (m, n) => { named.push(m); as.push(TEST_LEVEL_SHORT[n]); return TEST_LEVEL_SHORT[n]; });
  return { text: s, named, as };
}
/* the test sets a text still writes by number ("L2 test", "L2 component"): check.js warns (TEST SET BY NUMBER), naming the set's name to write */
const bareTestLevels = text => nameTestLevels(text).named;
module.exports = { GRADE_PATTERNS, SLUG_PATTERNS, maskSlugs, titleRefs, levelRefs, levelRefsIn, scrubLevels, nameTestLevels, bareTestLevels, TITLE_PATHS, dataKind, isTitlePath, titleSkip, issueTitleRefs, quotedTitles, titleDefect, TITLE_DEFECT, TEST_LEVEL_SHORT };
