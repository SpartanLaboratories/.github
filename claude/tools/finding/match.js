// The functions on a text: every word a list bars, found as the baseline says, with the list, the entry
// and the wording to say instead. Every pattern is built from the lists as loaded (lists.js); this file
// holds no word of any list.
//   finds(text, opts)      every find, sorted by index: { index, end, hit, list, entry, sayInstead, warn }
//   nameRefs, nameSpans    the internal names' first two sections, as matched strings and as spans
//   gradeRefs              the internal names' third section, as matched strings
//   termRefs               the words a vocabulary's term lines rule out
//   patterns               the regular expressions' sources, for a pass that runs in a browser
// opts.loaded: the lists (load() when left out); opts.lists: which lists finds() reads ("internal-names"
// by default; "vocabulary", "boards", "ui"); opts.board: the board-only warnings as well.
"use strict";
const { load, termList } = require("./lists.js");

/* ---- the pieces every pattern is built of ------------------------------------------------------ */

const EDGE_BEFORE = "(?<![\\p{L}\\p{N}_])", EDGE_AFTER = "(?![\\p{L}\\p{N}_])";
/* white space with at most one line break: a line break inside a paragraph is a space, a blank line is not */
const WS = "(?:[ \\t]*\\r?\\n[ \\t]*|[ \\t]+)";
/* between a term's words: a space or a hyphen, read alike */
const SEP = `(?:${WS}|-)`;
const APOS = "['’]";
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const word = w => esc(w).replace(/['’]/g, APOS);
const wordsOf = term => String(term).trim().split(/[\s-]+/).filter(Boolean);
/* a term as written: its words joined by a space or a hyphen; plural optional on the last */
const termSource = (term, plural) => wordsOf(term).map(word).join(SEP) + (plural ? "s?" : "");
const edged = src => `${EDGE_BEFORE}(?:${src})${EDGE_AFTER}`;

/* A verb's forms (the baseline's rule on them): from the single words a section gives, the words given
   in a past form whose base the section gives too; each such base matched as base, -s, -ed and -ing, and
   a word given after "re-" matched with "re-" or "re" before each form. Returns Map(word → source). */
function wordSources(allWords) {
  const single = new Set(allWords.map(w => w.toLowerCase()).filter(w => !/\s/.test(w)));
  const verbs = new Set();
  single.forEach(w => { if (!/ed$/.test(w)) return; [w.slice(0, -1), w.slice(0, -2)].forEach(b => { if (b.length > 1 && single.has(b)) verbs.add(b); }); });
  const forms = b => { const stem = /e$/.test(b) ? b.slice(0, -1) : b; return [...new Set([b, `${b}s`, /e$/.test(b) ? `${b}d` : `${b}ed`, `${stem}ing`])]; };
  const out = new Map();
  allWords.forEach(w => {
    const low = w.toLowerCase();
    const re = /^re-(.+)$/.exec(low);
    if (re && verbs.has(re[1])) out.set(w, `re-?(?:${forms(re[1]).map(word).join("|")})`);
    else if (verbs.has(low)) out.set(w, `(?:${forms(low).map(word).join("|")})`);
    else out.set(w, termSource(w, true));
  });
  return out;
}

/* What an agent does, after a name barred as an agent's name only; and the verbs of a pipeline step,
   after a shortened role name on a board. */
const AGENT_WORDS = ["agent", "agents", "found", "finds", "flagged", "flags", "raised", "raises", "reported", "reports", "said", "says", "asked", "asks",
  "approved", "approves", "rejected", "rejects", "returned", "returns", "requested", "requests", "reviewer", "team",
  "has approved", "had approved", "has found", "had found"];
const PIPELINE_VERBS = "commits?|committed|pushe[sd]|push|merges?|merged|lands?|landed|files?|filed|releases?|released|publishe[sd]|defers?|deferred|tags?|tagged|confirms?|confirmed";

/* ---- the internal names' patterns -------------------------------------------------------------- */

/* Every pattern of the internal names: [{ list, entry, source, sayInstead, warn }] */
function internalPatterns(L, board) {
  const N = L.internalNames, out = [];
  const add = (list, entry, source, sayInstead, warn) => out.push({ list, entry, source, sayInstead: sayInstead || null, warn: !!warn });
  /* section 1: a name barred wherever it stands, or as an agent only */
  const roleWords = wordSources(N.roles.filter(r => r.strength === "never").flatMap(r => r.aliases));
  N.roles.forEach(r => r.aliases.forEach(a => {
    if (r.strength === "never") add("internal-names §1", r.name, edged(roleWords.get(a)), r.sayInstead);
    else if (r.strength === "agent") {
      const n = termSource(a, false), what = AGENT_WORDS.map(w => w.split(" ").map(word).join(WS)).join("|");
      add("internal-names §1", r.name, `${EDGE_BEFORE}${n}${WS}(?:${what})${EDGE_AFTER}`, r.sayInstead);
      add("internal-names §1", r.name, `${EDGE_BEFORE}(?:by|from)${WS}${n}${EDGE_AFTER}(?!${WS}pass)`, r.sayInstead);
      add("internal-names §1", r.name, `${EDGE_BEFORE}${n}${APOS}s${EDGE_AFTER}`, r.sayInstead);
    }
  }));
  /* section 2: the approval flow, in its forms; a row that names no form, by its phrase. Every word of a
     form joins the next with a space or a hyphen, read alike, as a term's words do */
  N.approval.filter(r => r.strength === "never").forEach(r => {
    if (!r.form) { add("internal-names §2", r.phrase, edged(termSource(r.phrase, true)), r.sayInstead); return; }
    const f = r.form, words = f.words.map(w => wordsOf(w).map(word).join(SEP)).join("|");
    const anchor = wordsOf(f.anchor).map(word).join(SEP);
    const src = f.after ? `${EDGE_BEFORE}(?:${words})${SEP}${anchor}${EDGE_AFTER}`
      : `${EDGE_BEFORE}${anchor}${SEP}${f.between ? `(?:\\p{L}+${SEP})?` : ""}(?:${words})${EDGE_AFTER}`;
    add("internal-names §2", r.phrase, src, r.sayInstead);
  });
  /* section 3: every word of every row, a verb's forms included */
  const gradeRows = N.grades.filter(r => r.strength === "never"), gradeWords = wordSources(gradeRows.flatMap(r => r.words));
  gradeRows.forEach(r => r.words.forEach(w => add("internal-names §3", r.term, edged(gradeWords.get(w)), r.sayInstead)));
  /* on a board: a shortened role name with a possessive or a pipeline verb, a warning */
  if (board) L.finding.shortened.forEach(p =>
    add("internal-names §1", p, `${EDGE_BEFORE}${wordsOf(p).map(word).join(WS)}(?:${APOS}s${EDGE_AFTER}|${WS}(?:${PIPELINE_VERBS})${EDGE_AFTER})`, null, true));
  return out;
}

/* ---- the vocabularies' term lines -------------------------------------------------------------- */

const VOCABULARIES = { vocabulary: "vocabulary.md", boards: "boards.md", ui: "ui.md" };
/* code and quoted machine text are never prose: each blanked with spaces, its line breaks kept, so an
   index stays the index of the text as given */
const blank = s => s.replace(/[^\n]/g, " ");
const maskCode = t => String(t).replace(/```[\s\S]*?```/g, blank).replace(/`[^`\n]*`/g, blank).replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, blank)
  .replace(/\]\([^)]*\)/g, m => "]" + blank(m.slice(1))).replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, blank).replace(/(?:[\w.-]+\/)+[\w.-]*/g, blank);
const isIdentifier = t => /^[\w.:/#@-]+$/.test(t) && !/^[A-Z][a-z]/.test(t);
/* Every term pattern of the vocabularies asked for: [{ list, entry, word, re, allow }] */
function termPatterns(L, which) {
  const out = [];
  which.forEach(key => termList(L, key).lines.forEach(t => {
    const fl = t.case === "any" ? "gi" : "g";
    t.not.forEach(w => out.push({ list: VOCABULARIES[key], entry: t.term, word: w, sayInstead: t.term, source: `\\b${esc(w)}s?\\b`, flags: fl,
      re: new RegExp(`\\b${esc(w)}s?\\b`, fl), allow: t.allow.map(a => new RegExp(esc(a), fl)) }));
  }));
  return out;
}
/* Every word a term line rules out, in a text: finds, list the vocabulary's file name and entry the term */
function termRefs(text, opts) {
  opts = opts || {};
  const out = [];
  if (typeof text !== "string" || !text.trim() || isIdentifier(text.trim())) return out;
  const L = opts.loaded || load(), which = (opts.lists || Object.keys(VOCABULARIES)).filter(k => VOCABULARIES[k]);
  const t = maskCode(text);
  termPatterns(L, which).forEach(p => {
    let s = t; p.allow.forEach(a => { s = s.replace(a, blank); });
    p.re.lastIndex = 0; let m;
    while ((m = p.re.exec(s))) out.push({ index: m.index, end: m.index + m[0].length, hit: m[0], list: p.list, entry: p.entry, word: p.word, sayInstead: p.sayInstead, warn: false });
  });
  return out.sort((a, b) => a.index - b.index || b.end - a.end);
}

/* ---- the finds of a text ----------------------------------------------------------------------- */

const compiled = new WeakMap();
function internalCompiled(L, board) {
  let c = compiled.get(L); if (!c) { c = {}; compiled.set(L, c); }
  const k = board ? "board" : "plain";
  if (!c[k]) c[k] = internalPatterns(L, board).map(p => Object.assign({ re: new RegExp(p.source, "giu") }, p));
  return c[k];
}
function run(text, pats) {
  const out = [];
  pats.forEach(p => { p.re.lastIndex = 0; let m;
    while ((m = p.re.exec(text))) { out.push({ index: m.index, end: m.index + m[0].length, hit: m[0], list: p.list, entry: p.entry, sayInstead: p.sayInstead, warn: p.warn }); if (!m[0]) p.re.lastIndex++; } });
  return out;
}
/* One find per stretch of text: a find inside a longer one (a two-word alias inside a three-word alias
   that ends with it) is the longer one's */
function merge(list) {
  list.sort((a, b) => a.index - b.index || b.end - a.end || (a.warn ? 1 : 0) - (b.warn ? 1 : 0));
  const out = [];
  list.forEach(f => { if (!out.some(k => k.index <= f.index && f.end <= k.end)) out.push(f); });
  return out;
}
const sectionOf = l => l.replace(/^internal-names /, "");
/* Every find of a text, of the lists asked for */
function finds(text, opts) {
  opts = opts || {};
  if (typeof text !== "string" || !text) return [];
  const L = opts.loaded || load(), lists = opts.lists || ["internal-names"];
  let all = [];
  const internal = lists.filter(l => /^internal-names/.test(l));
  if (internal.length) {
    const want = internal.includes("internal-names") ? null : new Set(internal.map(l => l.replace(/^internal-names\s*/, "")));
    all = all.concat(run(text, internalCompiled(L, opts.board).filter(p => !want || want.has(sectionOf(p.list)))));
  }
  const vocab = lists.filter(l => VOCABULARIES[l]);
  if (vocab.length) all = all.concat(termRefs(text, { loaded: L, lists: vocab }));
  return merge(all);
}
/* The internal names' first two sections in a text, as the matched strings (and, with opts.board, the
   shortened role names) */
const nameFinds = (text, opts) => finds(text, Object.assign({}, opts, { lists: ["internal-names §1", "internal-names §2"] }));
const nameRefs = (text, opts) => nameFinds(text, opts).map(f => f.hit);
const nameSpans = (text, opts) => nameFinds(text, opts).map(f => ({ index: f.index, end: f.end }));
/* The internal names' third section in a text, as the matched strings, the text read whole */
const gradeRefs = (text, opts) => finds(text, Object.assign({}, opts, { lists: ["internal-names §3"] })).map(f => f.hit);
/* The regular expressions' sources: [{ list, entry, source, flags, warn }] */
function patterns(opts) {
  opts = opts || {};
  const L = opts.loaded || load(), lists = opts.lists || ["internal-names"], out = [];
  const internal = lists.filter(l => /^internal-names/.test(l));
  if (internal.length) {
    const want = internal.includes("internal-names") ? null : new Set(internal.map(l => l.replace(/^internal-names\s*/, "")));
    internalPatterns(L, opts.board).filter(p => !want || want.has(sectionOf(p.list))).forEach(p => out.push({ list: p.list, entry: p.entry, source: p.source, flags: "giu", warn: p.warn }));
  }
  const vocab = lists.filter(l => VOCABULARIES[l]);
  if (vocab.length) termPatterns(L, vocab).forEach(p => out.push({ list: p.list, entry: p.entry, source: p.source, flags: p.flags, warn: false }));
  return out;
}

module.exports = { finds, nameRefs, nameSpans, gradeRefs, termRefs, patterns, maskCode, isIdentifier, VOCABULARIES, internals: { WS, SEP, wordSources, termSource } };
