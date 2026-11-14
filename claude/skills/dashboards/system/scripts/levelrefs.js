// Grade references (GUIDANCE.md §4, "No grades"): the dashboards never show an issue's grade (the size of its work, grade 1 to 4:
// ~/.claude/nomenclature/vocabulary.md, CLAUDE.md "Work grades"), in any form: GRADE_PATTERNS below. Until the rule rework's L12 they
// also find the grade's old name, the work level ("L3", "level: 2", a "level-3 change", "work level"), in the forms LEVEL_PATTERNS
// holds. A board keeps no grade as data: an older landed board's plan.json "level", unit.level and wip.proposedLevel are numbers, not
// text, and nothing renders them (plan/scripts/levels.js).
// The old work-level forms are told from the other levels by the heuristics below, which stand as long as those forms are matched and
// go with them at L12. Tests are called by their set, never by a number (vocabulary.md, "set"), and documentation level 1 holds KDoc;
// but landed plan documents keep their old test levels and boards quote them, so the old test levels ("Level 2 — the class and the
// claim", "tests at levels 1 to 4c", "the Level-4c suite", "L1 gating", "L4a deterministic"), the old ring name "Level-2 KDoc" (now
// level-1 KDoc), the documentation levels' own "level-1 KDoc" and the C4 model's levels ("Level 1 · System Context") are never taken
// for a work level. An old test level is never followed by a word naming work (change, fix, issue, run, plan, re-pass …) and never
// written "level: n"; "L1".."L4" count as a work level only when no set's name follows ("L3" alone, never "L1 gating") and no test
// word stands beside it ("L2 test", "tests (L3)": a test set written by number, which nameTestLevels() writes by its set's name,
// dashboards-skill/35), and "Level 3" alone never counts, nor does "Level 4a tests".
// A scope phrase names a work level too ("inside level 3", "within level 2", "outside level 3": the bounds of a sizing), unless a
// set's name or "test" follows it ("inside level 3 integration tests").
// An unnumbered mention names a work level too (dashboards-skill/33): the sizing's own words, "Recorded level confirmed", "the proposed
// level", "the level re-check", "the issue's level" — never an old test level's, a log level's or a C4 level's ("the test level is
// recorded", "log level kept", "Level 1 · System Context").
// A numbered level written as a modifier of a change names a work level too (LEVEL_MODIFIER, WORK_PHRASE below): a work level sized a
// change, an old test level placed a test ("a later level-1 documentation change", "A level-1 rewording of the comment", "a level-2 bug
// fix"; never "Level-2 KDoc", "level-1 KDoc", "the Level-1 gate", "a Level 2 regression test", "at Level 3 the fix holds").
// Used by plan/scripts/check.js (every string of plan.json and board.json) and by check-board.js (the rendered text of every tab).
// scrubLevels() rewords a pipeline fact that names a grade, or a work level, so that it names none (admin-team/dashboards-skill/23):
// the scope phrase becomes the unit's or the issue's scope, the grade before a noun is elided ("a grade-3 re-pass" → "a re-pass"), the
// label ("Label grade: 3") is dropped with its punctuation; apply-event.js and apply-state.js write the reworded text, never the grade.
// A quotation (a plan excerpt, lib.js sectionOf()) keeps its "…" elision instead: a quote is never reworded. An issue's title is quoted
// verbatim and never reworded or elided either: one that names a grade is a defect in the issue, flagged ISSUE TITLE NAMES A GRADE: #n
// (issueTitleRefs(), titleDefect(); admin-team/dashboards-skill/28), never a failure of the board.
"use strict";
/* The test sets' names, matched in any case (a table head may set them in capitals: "L1 GATING") while the "L" itself stays
   case-sensitive: each letter becomes a class of both its cases. */
const anyCase = w => w.replace(/[a-z]/gi, c => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const TEST_LEVEL_NAMES = ["gating", "component", "integration", "deterministic", "e2e", "non-?functional", "uat"].map(n => n.includes("?") ? n.split("-?").map(anyCase).join("-?") : anyCase(n)).join("|");
/* what may follow an old test level: its set's name (after up to two qualifying words, "L1 per-type gating"), or "test(s)" itself */
const NOT_TEST = `(?!\\s*(?:[·:—–-]\\s*)?(?:[\\w-]+\\s+){0,2}(?:${TEST_LEVEL_NAMES})\\b)`;
const NOT_TEST_OR_TESTS = `(?!\\s*(?:[·:—–-]\\s*)?(?:[\\w-]+\\s+){0,2}(?:${TEST_LEVEL_NAMES}|${anyCase("tests")}|${anyCase("test")})\\b)`;
/* A bare "Ln" next to a test word (admin-team/dashboards-skill/35): "L2 test", "L1 regression tests", "tests (L3)", "regression test (L2)"
   is a test set written by its old number, never a work level: the checks leave it to the warning on a set written by number, and the
   fast path writes it by its set's name (nameTestLevels(): "component test", "tests (integration)"; "L4 tests", the three project-wide
   sets together, "project-wide tests"). A test word follows the level (after up to two qualifying words) or stands right before it, with
   at most a bracket, a colon or a dash between. Elsewhere a bare "Ln" is a work level: scrubLevels() elides it and reports the elision
   (opts.elided), so the fast path warns. */
const TEST_WORD = `${anyCase("tests")}|${anyCase("test")}`;
const AFTER_TEST = `\\s*(?:[·:—–-]\\s*)?(?:[\\w-]+\\s+){0,2}(?:${TEST_WORD})\\b`;
const BEFORE_TEST = `\\b(?:${TEST_WORD})\\s*[(:·—–-]?\\s*`;
const NOT_NEAR_TEST = `(?<!${BEFORE_TEST})`, NOT_TEST_AFTER = `(?!${AFTER_TEST})`;
/* each old short form's set (vocabulary.md, "set"; CLAUDE.md, "Testing — Named Test Sets"): L4 alone is the three project-wide sets */
const TEST_LEVEL_SHORT = { 1: "gating", 2: "component", 3: "integration", 4: "project-wide", "4a": "deterministic", "4b": "e2e", "4c": "nonfunctional", 5: "uat" };
/* the nouns that make "level-3 <noun>" a work level: work, its run and its sizing, never a test's ("pass", "unit" and "review" stay out:
   "the Level 3 pass", "Level 2 unit tests" are old test levels) */
const WORK_NOUNS = "change|changes|fix|fixes|feature|features|issue|issues|run|runs|work|plan|plans|planner|planners|planning|bump|label|labels|sub-issue|sub-issues|tracking|initiative|roadmap|re-pass|re-passes|repass|repasses|scope|sizing|pipeline|budget|qa";
const SCOPE_WORDS = "inside|within|outside|beyond";
/* A test entry headed by its old test level (2026-11-05): a capitalised "Level n:" that a test word follows in the same entry is the
   project's old name of a test set, never a work level, so the listed form "(#61, level 3)" / "#55, level 2: a bug fix" skips it where a list or a rendered tab
   puts it after a comma (", Level 3: the reader against the real transport over loopback"). The test words are the vocabulary of the
   boards' test entries: test and its forms, a test thing (suite, case, assertion, fixture, harness, mock, stub, fake), a set's name
   (and "end-to-end"), and the real-boundary words of an integration entry ("real", "loopback": "Level 3: one real request for many
   callers"). The word follows the colon within the entry: before the next "level", a ";", a ")", a sentence's end or a line break, within
   160 characters. A lowercase "level n:" and a "Level n:" with no test word after it stay work levels ("(#55, Level 2: a bug fix)"). */
const TEST_ENTRY_WORDS = `${anyCase("tests?|testing|tested|suites?|cases?|assertions?|fixtures?|harness(?:es)?|mocks?|mocked|stubs?|stubbed|fakes?|real|loopback|end-to-end")}|${TEST_LEVEL_NAMES}`;
const TEST_ENTRY = `(?!Level [1-4]\\s*:(?=(?:(?!${anyCase("level")}\\b|\\.(?:\\s|$))[^;)\\n]){0,160}?\\b(?:${TEST_ENTRY_WORDS})\\b))`;
/* the words before "level" that make it another kind of level, never a work level */
const OTHER_LEVEL = "test|testing|gating|component|integration|deterministic|e2e|non-functional|nonfunctional|uat|unit|log|logging|trace|debug|info|warn|error|c4|zoom|isolation|api|access|compression|nesting|indent|indentation|heading|top|sea|noise|power|signal|battery|volume|risk|severity|confidence|service|stability|support|maturity|privilege|security|trust|quality";
const NOT_OTHER = `(?<!\\b(?:${OTHER_LEVEL})[- ])`;
/* What a work level is: the size of a piece of work, so its phrase is headed by a change being made, whatever the change is about. The level
   is written as a modifier, hyphenated or classifying a thing right after "a", "an", "another", "later" or "next" ("level-1 documentation
   change", "a level 1 doc change", "a later level 1 edit"; never "at Level 3 the fix holds"), and the head is a change or an act of changing:
   a noun ("change", "edit") or any "-ing of" ("rewording of"). Up to two free qualifiers may stand before the head, so the subject of the
   change needs no list. A qualifier is never a function word ("Level-2 KDoc on the change") or a thing of an old test level or of the
   documentation levels ("Level-2 KDoc change", its old ring name, "level-1 KDoc change", "the Level-3 suite fix"); a test's own doing is
   no act of changing ("Level-3 testing of"), and a test word after the head makes the whole a test ("Level-2 feature tests"). The heads
   stay a short lexicon: the other way round, any noun but the test vocabulary, fails each time an old test level modifies something new
   ("the Level 1 consumer", "the level-3 row"). A level directly
   before one of WORK_NOUNS is the pattern above this one's in LEVEL_PATTERNS, so a phrase counts once. */
const LEVEL_MODIFIER = `${NOT_OTHER}(?:\\blevel-[1-4]\\b|(?<=\\b(?:an?|another|later|next)\\s+)\\blevel\\s+[1-4]\\b)`;
const FUNCTION_WORD = "a|an|the|this|that|these|those|each|every|any|all|both|some|no|its|their|our|and|or|but|nor|of|on|in|at|to|for|from|by|with|without|as|is|are|was|were|be|not|never|only|then|than|so|if|when|while|once|after|before|via|per|through|against|under|over|into|can|may|must|will|would|should|could|does|do|did|has|have|had";
const TEST_THING = `[\\w-]*test[\\w-]*|[\\w-]*kdoc[\\w-]*|${TEST_LEVEL_NAMES}|unit|suites?|class(?:es)?|cases?|rows?|fixtures?|harness(?:es)?|coverage|gates?|pass(?:es)?|consumers?|assertions?|scenarios?|checks?|fakes?|mocks?|stubs?|tasks?`;
const QUALIFIER = `(?!(?:${FUNCTION_WORD}|${TEST_THING})(?![\\w-]))[\\w-]+\\s+`;
const CHANGE_NOUNS = "changes?|fix(?:es)?|features?|edits?|rewrites?|rewords?|corrections?|revisions?|updates?|tweaks?|patch(?:es)?|cleanups?|refactors?|prs?|commits?";
const NOT_TEST_ACT = "(?!(?:test|check|gat|mock|stubb|fak|run|assert|cover|verify|validat|prob|wir|handl|exercis)ing\\b)";
const NOT_TEST_NEXT = `(?!\\s+(?:${TEST_WORD})\\b)`;
const WORK_PHRASE = `(?:${QUALIFIER}){0,2}?(?:(?:${CHANGE_NOUNS})(?![\\w-])${NOT_TEST_NEXT}|${NOT_TEST_ACT}[a-z]+ing\\s+of\\b)`;
const LEVEL_PATTERNS = [
  ["\\blevel:\\s*[1-4]\\b", "i"],                                                         // the label: "level: 2", "Label level: 3"
  // the short form "L3", unless a set's name follows ("L1 gating", "L3 · integration"); "L4c" never matches
  // (up to two qualifying words may come between: "L1 per-type gating", "L2 value-type component")
  // and never next to a test word ("L2 test", "tests (L3)": a test set written by number, dashboards-skill/35)
  [`${NOT_NEAR_TEST}\\bL[1-4]\\b${NOT_TEST}${NOT_TEST_AFTER}`, ""],
  ["\\b(?:work|issue|tracking)[- ]levels?\\b", "i"],                                       // "work level", "work-level labels"
  [`\\blevel[- ][1-4]\\b[- ](?:${WORK_NOUNS})\\b${NOT_TEST_NEXT}`, "i"],                    // "a level-3 change", "level-3 re-pass"; never "Level-2 feature tests"
  [`${LEVEL_MODIFIER}\\s+(?!(?:${WORK_NOUNS})\\b)${WORK_PHRASE}`, "i"],                      // "a later level-1 documentation change", "A level-1 rewording of"
  ["\\bre-?level(?:led|ed|ing|s)?\\b", "i"],                                               // "re-level", "relevelled"
  ["\\b(?:escalat\\w*|re-?sized?|sized|labelled|labeled) (?:to|as|at) level [1-4]\\b", "i"],  // "escalated to level 3"
  ["\\bat (?:its|their|his|her) own level\\b", "i"],                                       // "planned at its own level"
  [`[(,;]\\s*${TEST_ENTRY}${anyCase("level")} [1-4]\\s*[),;:]`, ""],                        // "(#61, level 3)", "#55, level 2: a bug fix"; never a test entry (", Level 3: the reader against the real transport")
  [`\\b(?:${SCOPE_WORDS})\\s+(?:the\\s+)?level[- ][1-4]\\b${NOT_TEST_OR_TESTS}`, "i"],     // "inside level 3", "within the level-2 bounds"
  /* unnumbered (dashboards-skill/33) */
  [`\\b(?:recorded|proposed|assigned|sized)\\s+(?:work\\s+)?levels?\\b${NOT_TEST_OR_TESTS}`, "i"],                  // "Recorded level confirmed"
  [`${NOT_OTHER}\\blevels?\\s+(?:was\\s+|is\\s+|were\\s+|are\\s+)?(?:confirmed|re-?checked|unchanged|agreed)\\b`, "i"],   // "the level was confirmed"
  [`${NOT_OTHER}\\blevel[ \\t]+(?:re-?checks?|checks?|confirmation|proposal)\\b(?![ \\t]*:)`, "i"],                 // "the level re-check"; on one line, never a "check:" label ("test: every level" beside "check: …")
  ["\\b(?:issue|unit|run|sub-issue)['’]s\\s+level\\b", "i"],                                                           // "the issue's level"
];
/* Grades (the user's decisions of 2026-11-13: vocabulary/decided-set (1), choice-2-grade-reach (a)): the size of an issue's work is its
   grade, and the word in every form is barred from what a board shows, numbered or not, in any case, a hyphenated compound included:
   "grade 3", "grade: 2", "a grade-4 issue", "graded", "grading", "re-grade", "regraded", "the recorded grade", "work grade",
   "carrier-grade". No other sense of the word is let through, so no heuristic stands beside it as the test, C4 and KDoc heuristics stand
   beside "level" above. A match is the word with the hyphenated compound it stands in and the number after it; a longer word that only
   holds the letters ("upgrade", "degrade", "centigrade", "Gradle", "gradient") and an identifier ("proposedGrade") are not the word. The
   work-level forms above stay matched beside it, until the rule rework's L12. */
const GRADE_WORD = "(?:re-?)?grad(?:e|es|ed|ing)";
const GRADE_PATTERNS = [
  [`(?<![\\w-])(?:[a-z0-9]+-)*${GRADE_WORD}(?:-[a-z0-9]+)*(?![\\w-])(?:[ \\t]*:?[ \\t]*[1-4]\\b)?`, "i"],   // "grade 3", "a grade-4 issue", "re-graded", "carrier-grade"
];
LEVEL_PATTERNS.push(...GRADE_PATTERNS);
/* A pipeline fact's grade reworded as scrubLevels() rewords a work level, before it: the scope phrase ("inside grade 3") becomes the unit's or
   the issue's scope, "escalated to grade 4" reads "escalated", "at its own grade" "on its own", "re-graded" "re-sized", "graded" "sized",
   "grading" "sizing", "the work grade" "the sizing", "the recorded grade: 3" "the recorded sizing", the label ("grade: 3", "(grade 3)",
   "(#61, grade 3)") is dropped with its punctuation, a numbered grade before a noun is elided ("a grade-3 re-pass" → "a re-pass", "a grade 3
   issue" → "an issue"), and the word left unnumbered reads "sizing" ("the grade re-check" → "the sizing re-check"). A hyphenated compound
   ("carrier-grade") and a numbered grade no rule above takes have no rewording: they stay, scrubLevels() returns null, and the caller
   leaves the text out and tells the presenter. Its elision marks the article to mend as scrubLevels()'s does, and scrubLevels() mends it. */
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
   Grades are internal to the pipeline and never part of an issue, so a title that names one (or its old name, a work level) is a defect
   in the issue, not in the board: the checks flag it, ISSUE TITLE NAMES A GRADE: #n (until L12 the older ISSUE TITLE NAMES A WORK
   LEVEL: #n is read beside it, TITLE_DEFECT), without failing the board (the admin team brings it to the user to retitle on GitHub),
   and the grade rule above leaves the title's text alone. The fields that quote an issue's title, by data file
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
/* the flag's line: the issue first, then where the title is quoted and the words that name a grade */
const titleDefect = x => `ISSUE TITLE NAMES A GRADE: #${x.issue != null ? x.issue : "?"} (${x.at}: ${JSON.stringify(x.title)} names ${x.hits.map(h => JSON.stringify(h)).join(", ")}): a defect in the issue, quoted verbatim on the board; the issue is retitled on GitHub`;
/* the flag as a reader finds it in a check's output, its issue captured: the line titleDefect() writes, and until the rule rework's L12
   the older ISSUE TITLE NAMES A WORK LEVEL: #n a check from before the rename printed */
const TITLE_DEFECT = /ISSUE TITLE NAMES A (?:GRADE|WORK LEVEL): #([\d?]+)/;

/* A pipeline fact reworded so that it names no grade, nor its old name, a work level (GUIDANCE.md §4; plan/RULES.md §4, "The fast
   path"): a grade is reworded first (scrubGrades(), above), then a work level's forms: the scope phrase
   ("inside level 3") becomes "inside the unit's scope" (opts.scope: "unit" on a sub-issue's board, else "issue"), the level before a
   noun is elided ("a level-3 re-pass" → "a re-pass", the article mended: "a level-3 issue" → "an issue"), the label ("Label level: 3",
   "(level: 2)") is dropped with the punctuation it leaves, "escalated to level 4" reads "escalated", "re-levelled" "re-sized", "the work
   level" "the sizing", "at its own level" "on its own", "(#61, level 3)" "(#61)", an "L3" before a noun is elided. An old test level's
   phrases are left as they are. Returns the reworded text, or null when a grade or a work level is still named after the rewording (the
   caller drops the text and tells the presenter), or the text itself when it names none. */
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
  /* a grade first (scrubGrades(), above); the work level's forms then as before */
  s = scrubGrades(s, scope);
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
  s = s.replace(new RegExp(`\\s*[,;]\\s*${TEST_ENTRY}${anyCase("level")} [1-4]\\s*(?=[),;:])`, "g"), "");   // a test entry's "Level 3:" stays
  s = s.replace(/\(\s*level [1-4]\s*\)/gi, "");
  s = s.replace(/\b(?:the\s+)?(?:label(?:led|ed)?\s+)?level:\s*[1-4]\b/gi, "");
  elide(new RegExp(`\\blevel[- ][1-4][- ](?=(?:${WORK_NOUNS})\\b${NOT_TEST_NEXT})`, "gi"));
  elide(new RegExp(`${LEVEL_MODIFIER}\\s+(?=${WORK_PHRASE})`, "gi"));
  /* a bare "Ln" that no test word stands beside is a work level: elided, and reported (opts.elided), so the fast path warns and the
     elision is visible (dashboards-skill/35) */
  const bare = new RegExp(`${NOT_NEAR_TEST}\\bL[1-4]\\b${NOT_TEST}${NOT_TEST_AFTER}`, "g");
  if (opts && Array.isArray(opts.elided)) (s.match(bare) || []).forEach(h => opts.elided.push(h));
  elide(new RegExp(`${NOT_NEAR_TEST}\\bL[1-4]\\b${NOT_TEST}${NOT_TEST_AFTER}\\s*`, "g"));
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
   test word beside it is left to the scrub (a work level). Returns { text, named: [the short forms rewritten], as: [the set's name each
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
module.exports = { LEVEL_PATTERNS, GRADE_PATTERNS, levelRefs, levelRefsIn, scrubLevels, nameTestLevels, bareTestLevels, TITLE_PATHS, dataKind, isTitlePath, titleSkip, issueTitleRefs, quotedTitles, titleDefect, TITLE_DEFECT, TEST_LEVEL_SHORT };
