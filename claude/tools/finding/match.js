// The functions on a text: every word a list bars, found as the baseline says, with the list, the entry
// and the wording to say instead. Every pattern is built from the lists as loaded (lists.js); this file
// holds no word of any list.
//   finds(text, opts)      every find, sorted by index: { index, end, hit, list, entry, sayInstead, warn }
//   nameRefs, nameSpans    the internal names' first two sections, as matched strings and as spans
//   gradeRefs              the internal names' third section, as matched strings
//   termRefs               the words a vocabulary's term lines rule out
//   patterns               the regular expressions' sources, for a pass that runs in a browser: { list,
//                          entry, source, flags, warn, codeForm }, a find of a pattern whose codeForm is
//                          true being no find where it stands inside one of codeRanges(text)
//   codeRanges(text)       the stretches of a text that are code: [{ index, end }]
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

/* The baseline's rule on a technical sense: the marker row that serves a listed word, the word itself or
   one of its forms (-s, -es, -d, -ed, -ing), or null */
function markerRowFor(N, w) {
  const low = String(w).toLowerCase();
  return (N.markers || []).find(m => {
    const base = m.word.toLowerCase(), stem = /e$/.test(base) ? base.slice(0, -1) : base;
    return low === base || [base, stem].some(b => low.startsWith(b) && /^(?:s|es|d|ed|ing)$/.test(low.slice(b.length)));
  }) || null;
}
/* A pattern no find where a marker stands directly before it (a space, a line break or a hyphen between,
   a mark of emphasis or code at the join, the marker in any case or its possessive) or is joined to it
   after by a hyphen, or where one of its markers after follows it with a space, a line break or a hyphen
   between (the same marks at the join, the marker in any case or its possessive) */
const JOIN_MARK = "[*_`]*";
const alternation = list => list.map(x => wordsOf(x).map(word).join(SEP)).join("|");
function withMarkers(src, row) {
  if (!row) return src;
  const m = alternation(row.markers);
  const after = (row.after || []).length ? `(?!${JOIN_MARK}(?:${WS}|-)${JOIN_MARK}(?:${alternation(row.after)})(?:${APOS}s)?${EDGE_AFTER})` : "";
  return `(?<!${EDGE_BEFORE}(?:${m})(?:${APOS}s)?${JOIN_MARK}(?:${WS}|-)${JOIN_MARK})(?:${src})(?!${JOIN_MARK}-${JOIN_MARK}(?:${m})${EDGE_AFTER})${after}`;
}
/* Every pattern of the internal names: [{ list, entry, source, sayInstead, warn, codeForm }], codeForm
   true where a find that stands in code is no find */
function internalPatterns(L, board) {
  const N = L.internalNames, out = [];
  const add = (list, entry, source, sayInstead, warn, served) => {
    const row = served == null ? null : markerRowFor(N, served);
    out.push({ list, entry, source: withMarkers(source, row), sayInstead: sayInstead || null, warn: !!warn, codeForm: !!(row && row.codeForm) });
  };
  /* section 1: a name barred wherever it stands, or as an agent only */
  const roleWords = wordSources(N.roles.filter(r => r.strength === "never").flatMap(r => r.aliases));
  N.roles.forEach(r => r.aliases.forEach(a => {
    if (r.strength === "never") add("internal-names §1", r.name, edged(roleWords.get(a)), r.sayInstead, false, a);
    else if (r.strength === "agent") {
      const n = termSource(a, false), what = AGENT_WORDS.map(w => w.split(" ").map(word).join(WS)).join("|");
      add("internal-names §1", r.name, `${EDGE_BEFORE}${n}${WS}(?:${what})${EDGE_AFTER}`, r.sayInstead, false, a);
      add("internal-names §1", r.name, `${EDGE_BEFORE}(?:by|from)${WS}${n}${EDGE_AFTER}(?!${WS}pass)`, r.sayInstead, false, a);
      add("internal-names §1", r.name, `${EDGE_BEFORE}${n}${APOS}s${EDGE_AFTER}`, r.sayInstead, false, a);
    }
  }));
  /* section 2: the approval flow, in its forms; a row that names no form, by its phrase. Every word of a
     form joins the next with a space or a hyphen, read alike, as a term's words do */
  N.approval.filter(r => r.strength === "never").forEach(r => {
    if (!r.form) { add("internal-names §2", r.phrase, edged(termSource(r.phrase, true)), r.sayInstead, false, r.phrase); return; }
    const f = r.form, words = f.words.map(w => wordsOf(w).map(word).join(SEP)).join("|");
    const anchor = wordsOf(f.anchor).map(word).join(SEP);
    const src = f.after ? `${EDGE_BEFORE}(?:${words})${SEP}${anchor}${EDGE_AFTER}`
      : `${EDGE_BEFORE}${anchor}${SEP}${f.between ? `(?:\\p{L}+${SEP})?` : ""}(?:${words})${EDGE_AFTER}`;
    add("internal-names §2", r.phrase, src, r.sayInstead, false, r.phrase);
  });
  /* section 3: every word of every row, a verb's forms included */
  const gradeRows = N.grades.filter(r => r.strength === "never"), gradeWords = wordSources(gradeRows.flatMap(r => r.words));
  gradeRows.forEach(r => r.words.forEach(w => add("internal-names §3", r.term, edged(gradeWords.get(w)), r.sayInstead, false, w)));
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
/* a ruled-out word that a vocabulary names as retired: in double quotes, straight or curly, directly followed by "is retired" */
const retiring = (s, index, end) => /["“]$/.test(s.slice(Math.max(0, index - 1), index)) && /^["”]\s+is\s+retired\b/.test(s.slice(end, end + 40));
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
    while ((m = p.re.exec(s))) {
      if (retiring(s, m.index, m.index + m[0].length)) continue;
      out.push({ index: m.index, end: m.index + m[0].length, hit: m[0], list: p.list, entry: p.entry, word: p.word, sayInstead: p.sayInstead, warn: false });
    }
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
/* The stretches of a text that are code, as the baseline's rule on a technical sense reads them, sorted:
   [{ index, end }]. A fenced block runs from a line that opens with three backticks or tildes or more
   (after any indent) to the line that closes it with as many of the same, or to the text's end; a
   backtick span, outside a fenced block, from a run of backticks to the next run of the same length
   within its paragraph; and a <code> or a <pre> element, to its closing tag. */
function codeRanges(text) {
  const t = String(text), out = [];
  let fence = null, at = 0;
  const fenced = [];
  for (const line of t.split("\n")) {
    const start = at; at += line.length + 1;
    const m = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (!fence) { if (m) fence = { ch: m[1][0], n: m[1].length, start }; continue; }
    const c = /^[ \t]*(`{3,}|~{3,})[ \t]*\r?$/.exec(line);
    if (c && c[1][0] === fence.ch && c[1].length >= fence.n) { fenced.push({ index: fence.start, end: start + line.length }); fence = null; }
  }
  if (fence) fenced.push({ index: fence.start, end: t.length });
  out.push(...fenced);
  const inFence = i => fenced.some(r => r.index <= i && i < r.end);
  const runs = [...t.matchAll(/`+/g)].filter(m => !inFence(m.index));
  for (let i = 0; i < runs.length; i++) {
    const open = runs[i];
    for (let j = i + 1; j < runs.length; j++) {
      const close = runs[j];
      if (/\n[ \t]*\r?\n/.test(t.slice(open.index, close.index))) break;
      if (close[0].length === open[0].length) { out.push({ index: open.index, end: close.index + close[0].length }); i = j; break; }
    }
  }
  for (const m of t.matchAll(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)) out.push({ index: m.index, end: m.index + m[0].length });
  return out.sort((a, b) => a.index - b.index || b.end - a.end);
}
const inCode = (ranges, f) => ranges.some(r => r.index <= f.index && f.end <= r.end);
function run(text, pats) {
  const out = [];
  let ranges = null;
  pats.forEach(p => { p.re.lastIndex = 0; let m;
    while ((m = p.re.exec(text))) {
      const f = { index: m.index, end: m.index + m[0].length, hit: m[0], list: p.list, entry: p.entry, sayInstead: p.sayInstead, warn: p.warn };
      if (p.codeForm && inCode(ranges || (ranges = codeRanges(text)), f)) { if (!m[0]) p.re.lastIndex++; continue; }
      out.push(f); if (!m[0]) p.re.lastIndex++;
    } });
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
    internalPatterns(L, opts.board).filter(p => !want || want.has(sectionOf(p.list))).forEach(p => out.push({ list: p.list, entry: p.entry, source: p.source, flags: "giu", warn: p.warn, codeForm: p.codeForm }));
  }
  const vocab = lists.filter(l => VOCABULARIES[l]);
  if (vocab.length) termPatterns(L, vocab).forEach(p => out.push({ list: p.list, entry: p.entry, source: p.source, flags: p.flags, warn: false, codeForm: false }));
  return out;
}

module.exports = { finds, nameRefs, nameSpans, gradeRefs, termRefs, patterns, codeRanges, maskCode, isIdentifier, VOCABULARIES, internals: { WS, SEP, wordSources, termSource } };
