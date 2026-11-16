// Sizing references on a board (GUIDANCE.md §4, its rule against them): the dashboards never show an issue's sizing (the size of its
// work, 1 to 4: ~/.claude/nomenclature/vocabulary.md and CLAUDE.md define it), in any form. What this file keeps is the board's part
// only. The finding is the finding tool's, ../../../../tools/finding/match.js (the same path in ~/.claude and in the .github mirror's
// claude/): it reads the forms from the list, ~/.claude/nomenclature/internal-names.md §3, where it stands, and finds them as the
// baseline, ~/.claude/nomenclature/finding.md, says. This file holds no form of the word and no rule of how one is found.
// A board keeps no sizing as data: an older closed board's plan.json "level", unit.level and wip.proposedLevel are numbers, not text,
// and nothing renders them (plan/scripts/levels.js).
// What it keeps for boards, each on the tool's finds:
//   titleRefs(), levelRefs()  the finds, each as the extent a board quotes and elides: the find with the hyphenated compound it stands
//                             in and a number after it ("production-<word>", "<word>-3", "<word>: 2"); titleRefs() reads a text whole (an
//                             issue's title), levelRefs() leaves its slugs out (below). A word in its technical sense, a marker of the
//                             list's before it or joined to it ("carrier-<word>"), is no find of the tool's, and so none here
//   levelSpans(), elideSpans() the same finds as spans, and a quote's elision of each where it stands (lib.js sectionOf(), apply-event.js)
//   GRADE_PATTERNS            the tool's patterns of the section as regular expressions with that extent, for check-board.js's
//                             browser pass, which runs where the tool cannot be loaded
//   the slugs (SLUG_PATTERNS, maskSlugs()), the issue titles (TITLE_PATHS, issueTitleRefs(), titleDefect()), the rewording of a
//   pipeline fact (scrubLevels()) and the test sets written by their old numbers (nameTestLevels())
// The forms are those of the sizing word alone (internal-names.md §3), so no other kind of level is taken for one: an old test level a
// landed plan document keeps and a board quotes ("Level 2 — the class and the claim", "L1 gating"), a documentation level ("level-1
// KDoc") and a C4 level ("Level 1 · System Context") are left as they are. Tests are called by their set, never by a number
// (vocabulary.md, "set"): nameTestLevels() below writes a test set written by its old number by its set's name (dashboards-skill/35).
// Used by plan/scripts/check.js (every string of plan.json and board.json) and by check-board.js (the rendered text of every tab).
// scrubLevels() rewords a pipeline fact that names a sizing so that it names none (dashboards-skill/23): the scope phrase becomes
// the unit's or the issue's scope, a numbered sizing before a noun is elided, a sizing label is
// dropped with its punctuation; apply-event.js and apply-state.js write the reworded text, never the sizing.
// A quotation (a plan excerpt, lib.js sectionOf()) keeps its "…" elision instead: a quote is never reworded. An issue's title is quoted
// verbatim and never reworded or elided either: one that names a sizing is a defect in the issue, flagged by the issue-title flag
// (issueTitleRefs(), titleDefect(); dashboards-skill/28), never a failure of the board. A slug made from the title (a plan folder's
// name, where a path puts it) is left out of the scan as the title is, and flagged nowhere (maskSlugs()), and so is the slug inside a
// branch's name.
// The wordings scrubLevels() writes are this file's own until the list carries a wording to say instead for each form; from then on a
// find that carries one is written as that wording first (withWordings()), and this file's rewordings mend the text around it.
"use strict";
const path = require("path");
const F = require(path.resolve(__dirname, "..", "..", "..", "..", "tools", "finding", "match.js"));
const GRADES = ["internal-names §3"];
/* The test sets' names, matched in any case (a table head may set them in capitals: "L1 GATING") while the "L" itself stays
   case-sensitive: each letter becomes a class of both its cases. */
const anyCase = w => w.replace(/[a-z]/gi, c => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const TEST_LEVEL_NAMES = ["gating", "component", "integration", "deterministic", "e2e", "non-?functional", "uat"].map(n => n.includes("?") ? n.split("-?").map(anyCase).join("-?") : anyCase(n)).join("|");
/* A test word beside a bare "Ln" (dashboards-skill/35): "L2 test", "L1 regression tests", "tests (L3)", "regression test (L2)"
   is a test set written by its old number, which nameTestLevels() writes by its set's name ("component test", "tests (integration)"; "L4
   tests", the three project-wide sets together, "project-wide tests"). A test word follows the level (after up to two qualifying words) or
   stands right before it, with at most a bracket, a colon or a dash between. */
const TEST_WORD = `${anyCase("tests")}|${anyCase("test")}`;
const AFTER_TEST = `\\s*(?:[·:—–-]\\s*)?(?:[\\w-]+\\s+){0,2}(?:${TEST_WORD})\\b`;
const BEFORE_TEST = `\\b(?:${TEST_WORD})\\s*[(:·—–-]?\\s*`;
/* each old short form's set (vocabulary.md, "set"; CLAUDE.md, "Testing — Named Test Sets"): L4 alone is the three project-wide sets */
const TEST_LEVEL_SHORT = { 1: "gating", 2: "component", 3: "integration", 4: "project-wide", "4a": "deterministic", "4b": "e2e", "4c": "nonfunctional", 5: "uat" };
const SCOPE_WORDS = "inside|within|outside|beyond";
/* A pipeline fact's sizing reworded: the scope phrase ("inside <word> 3") becomes the unit's or the issue's scope, "escalated to <word> 4" reads "escalated", "at its own <word>" "on its own", "re-<word>d" "re-sized", "<word>d" "sized",
   its -ing form "sizing", "the work <word>" "the sizing", "the recorded <word>: 3" "the recorded sizing", the label ("<word>: 3", "(<word> 3)",
   "(#61, <word> 3)") is dropped with its punctuation, a numbered sizing before a noun is elided ("a <word>-3 re-pass" → "a re-pass", "a <word> 3
   issue" → "an issue"), and the word left unnumbered reads "sizing" ("the <word> re-check" → "the sizing re-check"). A hyphenated compound
   ("production-<word>") and a numbered sizing no rule above takes have no rewording: they stay, scrubLevels() returns null, and the caller
   leaves the text out and asks for enrichment. A compound with one of the list's markers ("carrier-<word>") is no find, and scrubLevels()
   returns its text as it is. Its elision marks the article to mend, and scrubLevels() mends it. */
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
  /* the word left unnumbered, out of a compound: "the <word>", its plural */
  s = s.replace(new RegExp(`${NB}(grades?)${NA}(?![ \\t]*:?[ \\t]*[1-4]\\b)`, "gi"), (m, g) => caseOf(m, /s$/i.test(g) ? "sizings" : "sizing"));
  return s;
}
/* Slugs: a plan folder's name, <number>-<slug> (CLAUDE.md, "Planning documents"), is
   made from its issue's title, so the sizing check skips it as it skips the title (below), wherever it stands as a folder or a slug: the
   board's slug, the plan folder, a board's path, a link to a board or into a folder, a report's copy, a path a text cites. It counts where
   a path puts it: a folder, ended by a "/" ("55-slug/62-slug/dashboard.html", "see 62-slug/plan.md"); the last folder of a path under
   docs/plans/ ("docs/plans/55-slug/62-slug"); a slug standing alone, the whole string or in quotation marks as a Source view prints one.
   The slug inside a branch's name is left out too: the <number>-<slug> a
   branch carries after its issue ("feat/issue-62-slug", the convention's <type>/issue-<n>-<slug>; "issue-62-slug", a repository's
   pattern with no type) or after its type ("fix/62-slug"; the types fix, feat, refactor, test, docs, build, chore), wherever the branch
   stands (a board's branch, a tracker's, a state board's as-is stamp, a fact that names it), the branch ending there (a space, a
   punctuation mark, a sentence's full stop). The rest of the branch is read as any text is: its type, and a sizing beside it. A branch
   that carries no issue number ("docs/some-change") holds no slug made from a title, and a sizing in it is still found. The same token in
   prose with no path around it, a file's name ("62-slug.md") and an anchor after a "#" are no slug: a sizing there is still found. The
   title itself stays flagged (issueTitleRefs(), which reads the title whole, titleRefs()); a slug made from it is not. SLUG_PATTERNS are
   the forms (check-board.js's browser pass takes them too); maskSlugs() blanks them before a scan. */
const SLUG = "\\d+-[a-z0-9]+(?:-[a-z0-9]+)*";
const BRANCH_TYPES = "fix|feat|refactor|test|docs|build|chore";
const SLUG_PATTERNS = [
  `(?<![\\w.-])${SLUG}(?=/)`,                                  // a folder in a path, ended by its "/" ("55-slug/62-slug/", "see 62-slug/plan.md")
  `(?<=(?:^|[^\\w.-])docs/plans/(?:[^\\s/"'\`]+/)*)${SLUG}(?![\\w.-])`,   // the last folder of a path under docs/plans/ (a board's folder)
  `(?<=^|")${SLUG}(?=$|")`,                                    // a slug alone: the whole string, or in quotation marks (a Source view)
  `(?<=(?:^|[^\\w.-])(?:(?:${BRANCH_TYPES})/|issue-))${SLUG}(?=$|[^\\w./-]|\\.(?!\\w))`,   // the slug inside a branch's name ("feat/issue-62-slug", "fix/62-slug")
];
const SLUG_RES = SLUG_PATTERNS.map(s => new RegExp(s, "g"));
const maskSlugs = text => typeof text === "string" ? SLUG_RES.reduce((s, re) => s.replace(re, "\u0001"), text) : text;
/* A slug's text blanked with as many marks as it has characters, so an index into the masked text is one into the text as given */
const keepSlugs = text => SLUG_RES.reduce((s, re) => s.replace(re, m => "\u0001".repeat(m.length)), text);
/* The tool's finds of the list's third section, each as the extent a board quotes and elides: the hyphenated compound the find stands
   in and a number after it, so "a <word>-4 issue" elides "<word>-4" and leaves no "-4" behind. Extents that meet are one.
   Returns [{ index, end, hit, sayInstead }]. loaded: the lists (the tool's load() when left out). */
const BEFORE = /(?:[a-z0-9]+-)+$/i, AFTER = /^(?:-[a-z0-9]+)*(?:[ \t]*:?[ \t]*[1-4]\b)?/i;
function gradeFinds(text, loaded) {
  if (typeof text !== "string" || !text) return [];
  const out = [];
  F.finds(text, { lists: GRADES, loaded }).forEach(f => {
    const b = BEFORE.exec(text.slice(0, f.index)), a = AFTER.exec(text.slice(f.end));
    const x = { index: f.index - (b ? b[0].length : 0), end: f.end + (a ? a[0].length : 0), sayInstead: f.sayInstead };
    const last = out[out.length - 1];
    if (last && x.index <= last.end) { last.end = Math.max(last.end, x.end); last.sayInstead = last.sayInstead || x.sayInstead; } else out.push(x);
  });
  return out.map(x => Object.assign(x, { hit: text.slice(x.index, x.end) }));
}
/* Every sizing reference in a text, as the matched strings, the text read whole (an issue's title) */
const titleRefs = text => gradeFinds(text).map(f => f.hit);
/* Every sizing reference in a text, as the matched strings, its slugs left out (above). */
const levelRefs = text => typeof text === "string" && text ? gradeFinds(keepSlugs(text)).map(f => text.slice(f.index, f.end)) : [];
/* The same finds as their spans, { index, end }, in the text as given: a quote elides each where it stands (elideSpans()), never the same
   letters elsewhere, which may be no find (a slug, a word in its technical sense: finding.md, "A technical sense by its marker") */
const levelSpans = text => typeof text === "string" && text ? gradeFinds(keepSlugs(text)).map(f => ({ index: f.index, end: f.end })) : [];
/* A text with each span cut to "…", from the last; a span that runs into the one after it stops where that one starts.
   spans: [{ index, end }] (levelSpans(), namerefs.js nameSpans()). */
function elideSpans(text, spans) {
  if (typeof text !== "string") return text;
  let s = text, floor = Infinity;
  [...(spans || [])].sort((a, b) => b.index - a.index).forEach(x => { const end = Math.min(x.end, floor); if (end <= x.index) return; s = s.slice(0, x.index) + "…" + s.slice(end); floor = x.index; });
  return s;
}
/* The tool's patterns of the third section as regular expressions with the board's extent, [[source, flags, codeForm]], for the browser
   pass (check-board.js), which applies each to a board's rendered text with its own flags: one for the patterns a find in code still
   counts for, and one, codeForm true, for those of a word the list reads in code form (finding.md, "A technical sense by its marker"),
   whose match the pass drops where it stands in code (a <code> or a <pre>, a backtick span or a fenced block of the text). A word's
   markers ride in its pattern's source, as the tool writes them. The longest first, so a phrase of the list wins over the word it holds.
   Read from the lists when first asked for. */
let gradePatterns = null;
function GRADE_PATTERNS() {
  if (gradePatterns) return gradePatterns;
  const P = F.patterns({ lists: GRADES }), flags = (P[0] && P[0].flags) || "giu";
  const one = (ps, codeForm) => { const srcs = ps.map(p => p.source).sort((a, b) => b.length - a.length);
    return [`(?:[a-z0-9]+-)*(?:${srcs.join("|")})(?:-[a-z0-9]+)*(?:[ \\t]*:?[ \\t]*[1-4]\\b)?`, flags, codeForm]; };
  return (gradePatterns = [false, true].map(cf => P.filter(p => !!p.codeForm === cf)).map((ps, i) => ps.length ? one(ps, i === 1) : null).filter(Boolean));
}
/* A text with each find that carries the list's wording to say instead written as that wording (internal-names.md's Say instead
   column, which the tool returns with each find as sayInstead), its first letter in the case of the find's; a find with none is left
   as it is. finds: [{ index, end, hit, sayInstead }], none overlapping. scrubLevels() and namerefs.js scrubNames() run it first. */
function withWordings(text, finds) {
  let s = text;
  (finds || []).filter(f => f.sayInstead && !f.warn).sort((a, b) => b.index - a.index).forEach(f => {
    const w = /^[A-Z]/.test(f.hit || "") && /^[a-z]/.test(f.sayInstead) ? f.sayInstead[0].toUpperCase() + f.sayInstead.slice(1) : f.sayInstead;
    s = s.slice(0, f.index) + w + s.slice(f.end); });
  return s;
}
/* Every sizing reference in the strings of a data file: [{ at, hit }]. Keys are not text and are skipped; so are numbers. skip(at),
   when given, leaves out the strings at the paths it accepts (the issue titles, below). */
function levelRefsIn(v, at, found, skip) {
  found = found || [];
  if (typeof v === "string") { if (!(skip && skip(at || ""))) levelRefs(v).forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => levelRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") levelRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}

/* Issue titles (GUIDANCE.md §4, §5; dashboards-skill/28). An issue's title is quoted verbatim: never reworded, never elided.
   A sizing is internal to the pipeline and never part of an issue, so a title that names one is a defect in the issue, not in the board:
   the checks flag it with the issue-title flag (TITLE_DEFECT), without failing the board (the team brings it to the user to
   retitle on GitHub), and the sizing rule above leaves the title's text alone. The fields that quote an issue's title, by data file
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
/* Every quoted issue title of a data file that names a sizing: [{ at, issue, title, hits }], issue the number of the issue it quotes
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
   sizing scan, as it leaves out the titles a board marks data-issue-title (check-board.js) */
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
/* the flag's line: the issue first, then where the title is quoted and the words that name a sizing */
const titleDefect = x => `ISSUE TITLE NAMES A GRADE: #${x.issue != null ? x.issue : "?"} (${x.at}: ${JSON.stringify(x.title)} names ${x.hits.map(h => JSON.stringify(h)).join(", ")}): a defect in the issue, quoted verbatim on the board; the issue is retitled on GitHub`;
/* the flag as a reader finds it in a check's output, its issue captured: the line titleDefect() writes */
const TITLE_DEFECT = /ISSUE TITLE NAMES A GRADE: #([\d?]+)/;

/* A pipeline fact reworded so that it names no sizing (GUIDANCE.md §4; plan/RULES.md §4, "The fast path"; scrubGrades(), above): the
   scope phrase ("inside <word> 3") becomes "inside the unit's scope" (opts.scope: "unit" on a sub-issue's board, else "issue"), the sizing
   before a noun is elided ("a <word>-3 re-pass" → "a re-pass", the article mended: "a <word>-3 issue" → "an issue"), the label ("Label
   <word>: 3", "(<word>: 2)") is dropped with the punctuation it leaves, "escalated to <word> 4" reads "escalated", "re-<word>d" "re-sized",
   "the work <word>" "the sizing", "at its own <word>" "on its own", "(#61, <word> 3)" "(#61)". A find that carries the list's wording to
   say instead is written as that wording first (withWordings(); a slug is never touched), and the rewordings here mend the rest.
   Returns the reworded text, or null when a sizing is still named after the rewording (the caller drops the text and asks for
   enrichment), or the text itself when it names none. opts.loaded: the lists the wordings are read from (the tool's load() when left out). */
function scrubLevels(text, opts) {
  if (typeof text !== "string" || !levelRefs(text).length) return text;
  const scope = `the ${opts && opts.scope === "unit" ? "unit" : opts && typeof opts.scope === "string" && opts.scope.trim() ? opts.scope.trim() : "issue"}'s scope`;
  let s = withWordings(text, gradeFinds(keepSlugs(text), opts && opts.loaded));
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
/* A test set written by its old number, written by its set's name (dashboards-skill/35; vocabulary.md, "set": a set is
   called by its name, never by a number). A short form its set's name follows drops the number ("L2 component test" → "component test",
   "L3 · integration" → "integration", "L4a deterministic" → "deterministic", "L1 per-type gating" → "per-type gating"); a bare one next to
   a test word takes its set's name ("L2 test" → "component test", "regression test (L2)" → "regression test (component)", "L1 tests" →
   "gating tests", "L5 test" → "uat test", "L4 tests", the three project-wide sets together, → "project-wide tests"). A bare "Ln" with no
   test word beside it is left as it is. Returns { text, named: [the short forms rewritten], as: [the set's name each
   reads now] }. apply-event.js runs it on every fact text before the sizing scrub; check.js warns on one a board still carries
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
module.exports = { SLUG_PATTERNS, maskSlugs, titleRefs, levelRefs, levelSpans, elideSpans, gradeFinds, withWordings, levelRefsIn, scrubLevels, nameTestLevels, bareTestLevels, TITLE_PATHS, dataKind, isTitlePath, titleSkip, issueTitleRefs, quotedTitles, titleDefect, TITLE_DEFECT, TEST_LEVEL_SHORT };
/* the tool's codeRanges(), whose source the browser pass carries, to drop a code-form match that stands in code (GRADE_PATTERNS) */
module.exports.codeRanges = F.codeRanges;
/* read from the lists when first asked for, so a script that never runs the browser pass never needs them */
Object.defineProperty(module.exports, "GRADE_PATTERNS", { enumerable: true, get: GRADE_PATTERNS });
