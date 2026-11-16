// Internal names on a board (GUIDANCE.md §4, "No internal names"; dashboards-skill/33): a board never names the pipeline's agents,
// sessions or roles, never refers to the approval flow, and never states a sizing (levelrefs.js). What this file keeps is the board's
// part only. The finding is the finding tool's, ../../../../tools/finding/ (match.js, files.js, lists.js; the same path in ~/.claude
// and in the .github mirror's claude/): it reads the list, ~/.claude/nomenclature/internal-names.md, where it stands, and finds its
// words as the baseline, ~/.claude/nomenclature/finding.md, says ("Matching a term"; "On a board" for the shortened role names a board
// warns of and never blocks). This file holds no word of the list and no rule of how one is found.
// What it keeps for boards, each on the tool's finds:
//   nameRefs(), nameSpans()   the list's first two sections in a text, with a board's warnings ({ board: true }); nameSpans() is what
//                             lib.js sectionOf() elides from a plan excerpt, the clause around each find
//   nameRefsIn()              a board's data walked: its keys, $comment and the paths skip(at) accepts (an issue's title, quoted verbatim:
//                             levelrefs.js titleSkip()) left out
//   commentRefs()             a board's comments, read as the commit scan reads an HTML file's (the tool's files.js, the html form)
//   waitRefs(), scrubWaits()  a wait on the user, in a fact or a comment, written "waiting on you" (§4's wording for a halt); it is no
//                             word of the list, and nameRefs() leaves it alone, as it is the fixed text of the templates' status labels
//   scrubNames(), unambiguous(), cleanWritten(), cleanWorkBoard()   the writers' one rule: a fact reworded where a safe rewording
//                             exists, left out where a name would remain
//   nameWarning()             the warning's line
// The wordings a rewording writes are this file's own until the list carries a wording to say instead for each word; then
// scrubNames() takes each find's sayInstead from the tool where it has one, and keeps its own where it has none.
// Used by plan/scripts/check.js (every string of plan.json and board.json, warned), by check-board.js (a board's data blocks, its comments
// and its rendered text, warned), by plan/scripts/apply-event.js (a fact text reworded through scrubNames() before it is written, left
// out, asking for enrichment, where a name would remain), by fill.js (cleanWritten()), by board.js and org-board.js (cleanWorkBoard(),
// the text a work board copies from a board's data) and by lib.js (nameSpans()).
"use strict";
const path = require("path");
const TOOL = path.resolve(__dirname, "..", "..", "..", "..", "tools", "finding");
const F = require(path.join(TOOL, "match.js")), { load } = require(path.join(TOOL, "lists.js")), { segments } = require(path.join(TOOL, "files.js"));
const { withWordings } = require("./levelrefs.js");
const NAMES = ["internal-names §1", "internal-names §2"], BOARD = { board: true };
/* Every internal name in a text, as the matched strings, the board's warnings among them; sorted by where each stands */
const nameRefs = text => F.nameRefs(text, BOARD);
/* Every internal name in a text as its span, { index, end }, in the text as given: the same finds as nameRefs() */
const nameSpans = text => F.nameSpans(text, BOARD);
/* a hit no rewording lets through: a find of the list itself, the board's warnings aside */
const unambiguous = hit => typeof hit === "string" && F.finds(hit, { lists: NAMES }).length > 0;
/* the list's names, as the tool reads a term (a space and a hyphen alike, a plural), for the rewording below: every name the list
   bars, wherever it stands or as an agent's name only */
let roleSource = null;
const ROLE = () => roleSource || (roleSource = `(?:${load().internalNames.roles.filter(r => r.strength === "never" || r.strength === "agent")
  .flatMap(r => r.aliases).sort((a, b) => b.length - a.length).map(a => F.internals.termSource(a, true)).join("|")})`);
/* a rendered fenced block, left out of a wait's reading */
const FENCED = /(<pre\b[^>]*>\s*)<code\b[^>]*>[\s\S]*?<\/code>/gi;
const prose = t => String(t).replace(FENCED, "$1 ");
/* A wait on the user in a fact or a comment: its wording is "waiting on you" (GUIDANCE.md §4). */
const WAIT_ON_USER = /\b(wait(?:s|ing)?)(\s+on\s+)the\s+user\b(?!['’])/gi;
function waitRefs(text) { return typeof text === "string" && text ? (prose(text).match(WAIT_ON_USER) || []) : []; }
function scrubWaits(text) { return typeof text === "string" ? text.replace(WAIT_ON_USER, "$1$2you") : text; }
/* Every internal name in the strings of a data file: [{ at, hit }]; keys, numbers and $comment are skipped, and so are the paths skip(at)
   accepts (an issue's title, quoted verbatim: levelrefs.js titleSkip()). */
function nameRefsIn(v, at, found, skip) {
  found = found || [];
  if (typeof v === "string") { if (!(skip && skip(at || ""))) [...nameRefs(v), ...waitRefs(v)].forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => nameRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") nameRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}
/* The comments of a board's HTML, as the commit scan reads an HTML file's (the baseline's comment forms, through the tool's files.js):
   <!-- … --> outside its scripts and styles, a script's // lines and /* … *\/ blocks where the script holds JavaScript, a style's
   /* … *\/ blocks; a script's code and strings and its data blocks are left alone. Comments on lines one after another are read as one
   text, so a name wrapped across two lines is found. A wait on the user in a comment is warned as well. A comment that opens with the
   template's old placeholder mark, named for a role, is warned of by the mark, with the // before it where it stands after one. */
const MARK = /^\s*presenter:/i;
function commentRefs(html) {
  const out = [], src = String(html || ""), lines = src.split("\n");
  segments("board.html", src, { comments: "html" }).forEach(s => {
    let t = s.text; const m = MARK.exec(t);
    if (m) { out.push(/\/\/$/.test((lines[s.line - 1] || "").slice(0, s.column - 1)) ? "// presenter:" : "presenter:"); t = " ".repeat(m[0].length) + t.slice(m[0].length); }
    nameRefs(t).forEach(h => out.push(h)); waitRefs(t).forEach(h => out.push(h)); });
  return out;
}
/* A fact text reworded so that it names no internal name, where a safe rewrite exists (plan/RULES.md §4, "The fast path"): the agent
   phrase is dropped ("accepted by the <role>" → "accepted"), a possessive becomes the article ("the <role>'s re-pass" → "the
   re-pass"), a role before its work becomes the work ("a <role> re-pass" → "a plan re-pass", "<role>'s fixes" → "the fixes",
   the code role → "code check", the documentation role → "documentation check", the test role after the review's possessive → "the
   review's test check": a Quality Review's checks by their progress notes' labels, plan/scripts/passnames.js NOTE_WORK,
   dashboards-skill/52), and an aside on the approval flow is dropped. A name's words are read with a space or a hyphen between them,
   as the tool reads them. A find that carries the list's wording to say instead is written as that wording first (levelrefs.js
   withWordings()), and the rewordings here mend the rest. Returns { text, left }: the reworded text, and the names still in it (none
   when it names none). The caller writes text when left is empty, leaves it out where a barred name remains, and asks for enrichment
   (enrich) either way. opts.loaded: the lists the wordings are read from (the tool's load() when left out). */
function scrubNames(text, opts) {
  if (typeof text === "string") text = scrubWaits(text);
  if (typeof text !== "string" || !nameRefs(text).length) return { text, left: [] };
  const cap = /^[A-Z]/.test(text.trim()), R = ROLE(), H = "[- ]", loaded = opts && opts.loaded;
  /* a rewording of a name, made only where the match holds one of the tool's finds: a word in its technical sense (a marker directly
     before it or joined to it, or in code where the list reads it so; finding.md, "A technical sense by its marker") is no find and is
     left as written. Each rewording's pattern has no lookbehind, so the match alone takes its replacement. */
  const onFinds = (t, re, to) => { const fs = F.finds(t, { lists: NAMES, loaded });
    return t.replace(re, (...a) => { const m = a[0], off = a[a.length - 2];
      return fs.some(f => f.index < off + m.length && f.end > off) ? m.replace(new RegExp(re.source, re.flags.replace("g", "")), to) : m; }); };
  let s = withWordings(text, F.finds(text, { lists: NAMES, loaded }));
  /* an aside on the approval flow */
  s = s.replace(/\s*\(\s*(?:the\s+)?user['’]s[- ](?:call|choice|decision|approval|sign-?off|go-ahead)\s*\)/gi, "");
  s = s.replace(/\s*[,;]?\s*\b(?:at|on|per|by|after)\s+the\s+user['’]s[- ](?:call|choice|decision|approval|sign-?off|go-ahead)\b/gi, "");
  /* the role as a label ("<role>: the fixes" → "the fixes") */
  s = onFinds(s, new RegExp(`(^|[;,(]\\s*)${R}\\s*:\\s*`, "gi"), "$1");
  /* the agent phrase */
  s = onFinds(s, new RegExp(`\\s+by\\s+(?:the\\s+)?${R}\\b(?!['’]s)`, "gi"), "");
  /* a role's work */
  [[new RegExp(`\\bplanner\\s+(re-?pass(?:es)?|leg)\\b`, "gi"), "plan $1"], [new RegExp(`\\brookie${H}dev\\s+(fix(?:es)?|pass(?:es)?|stage|stages)\\b`, "gi"), "$1"],
    [new RegExp(`\\bqa['’]s\\s+test${H}inspector\\b`, "gi"), "the review's test check"], [new RegExp(`\\btest${H}inspector\\b`, "gi"), "test check"],
    [new RegExp(`\\bcode${H}reviewer\\b`, "gi"), "code check"], [new RegExp(`\\bdocumentation${H}reviewer\\b`, "gi"), "documentation check"],
    [/\bqa\s+(has|had)\s+approved\b/gi, "the review $1 approved"], [/\bqa\s+approved\b/gi, "the review approved"]].forEach(([re, to]) => { s = onFinds(s, re, to); });
  /* a possessive: "the <role>'s re-pass" → "the re-pass", "<role>'s fixes" → "the fixes" */
  s = onFinds(s, new RegExp(`\\b(?:the\\s+)?${R}['’]s\\s+`, "gi"), "the ");
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([,;:.)])/g, "$1").replace(/\(\s*\)/g, "").trim();
  if (cap && /^[a-z]/.test(s)) s = s[0].toUpperCase() + s.slice(1);
  return { text: s, left: nameRefs(s) };
}
/* The one rule of a writer (plan/RULES.md §4; GUIDANCE.md §4): a text a board will show, reworded where a safe rewording exists, a wait on
   the user written "waiting on you", left out where a barred name would remain. Returns { text, left, out }: text is what to write
   (null when out), left the names still in it, out true where it must not be written. apply-event.js's txt() and cleanText() are this rule. */
function cleanWritten(text) {
  if (typeof text !== "string" || !text.trim()) return { text, left: [], out: false };
  const n = scrubNames(text), out = n.left.some(unambiguous);
  return { text: out ? null : n.text, left: n.left, out };
}
/* The repository work board's own text (GUIDANCE.md §4): every row's detail, each pass's note and each chain unit's name, the prose board.js and
   org-board.js copy from a board's data, whatever wrote it and however long ago: a text written before the names were kept out, or by a writer that
   let one through, is reworded here and never reaches a work board. A title is an issue's own, quoted verbatim, and no path, branch or id is prose.
   A text that cannot be reworded gives way: "Waiting on you." on a halted row, nothing elsewhere. Returns what it reworded or left out: [{ at, was, now }]. */
function cleanWorkBoard(board) {
  const changed = [], one = (holder, key, at) => {
    const v = holder[key]; if (typeof v !== "string" || !v) return;
    const r = cleanWritten(v); let now = r.out ? (/^waiting on you\b/i.test(scrubWaits(v)) ? "Waiting on you." : "") : r.text;
    if (now !== v) { holder[key] = now; changed.push({ at, was: v, now }); } };
  (Array.isArray(board && board.rows) ? board.rows : []).forEach((r, i) => { if (!r || typeof r !== "object") return;
    one(r, "detail", `rows[${i}].detail`);
    (Array.isArray(r.qa) ? r.qa : []).forEach((p, j) => { if (p && typeof p === "object") one(p, "note", `rows[${i}].qa[${j}].note`); });
    const units = r.chain && Array.isArray(r.chain.units) ? r.chain.units : [];
    units.forEach((u, j) => { if (u && typeof u === "object") one(u, "name", `rows[${i}].chain.units[${j}].name`); }); });
  return changed;
}
/* the warning's line */
const nameWarning = (where, hits) => `INTERNAL NAME: ${where} names ${[...new Set(hits)].slice(0, 6).map(h => JSON.stringify(h)).join(", ")}: a board never names the pipeline's agents, sessions or roles, nor the approval flow (GUIDANCE.md §4); correct the text where the board stores it, an issue or tracking board's through fill.js`;
module.exports = { nameRefs, nameSpans, nameRefsIn, commentRefs, scrubNames, waitRefs, scrubWaits, unambiguous, nameWarning, cleanWritten, cleanWorkBoard };
