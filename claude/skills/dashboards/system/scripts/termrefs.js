// The element names of a board (GUIDANCE.md §12, "The names, checked"): the glossary is the only home of the names, ui.md and boards.md,
// and this file holds none of them. What it keeps is the board's part only. Finding the glossary and reading its term lines, and finding a
// word a term rules out, are the finding tool's, ../../../../tools/finding/ (lists.js and match.js; the same path in ~/.claude and in the
// .github mirror's claude/), as the baseline, ~/.claude/nomenclature/finding.md, says ("A board term's ruled-out words"): each file found as
// glossaryFiles() says, re-exported here, and a ruled-out word found by the tool's termRefs() over the two glossaries alone, never
// vocabulary.md. What it keeps for boards, on what the tool reads:
//   - the terms: the first Cell of every "| **Term** | … |" row of either file, and the term lines of the JSON-lines blocks after the tables
//     ({"term":"Card","not":["Bubble"],"allow":["…"]}, with "case":"any"), read by the tool's readFile() and merged by term here.
//   - the compound names: boards.md's compound-names paragraph ("A board's compound names …"), with the capitalised compounds of the rows' Cells.
//   - the classes: boards.md's CSS class list ("Where a template's CSS class …").
// The scan, warnings only (it never fails a board; check.js and check-board.js print its lines):
//   TERM BANNED WORD   a word a term rules out, used: the tool's finds, as { banned } here.
//   TERM UNKNOWN NAME  a capitalised element name in neither list: a CamelCase word or a Capitalised compound ending in a type word of ui.md's section 2.
//   TERM CLASS         a CSS class that names an element's kind without its type word: a listed compound's subject, a listed class's subject, or a retired word of a
//                      ui.md term, unless it always stands beside a class that carries a type word (class="chip now", class="cell verdict").
// What it scans is the text a board shows and its generated data: every string value of the data (keys, $comment, a quoted issue title, an option's signature and a
// statement's plan excerpt, its heading and its paragraph, left out: a quotation held to its source is that document's text, as the baseline says)
// and the static text of its HTML (scripts, styles, comments, <code>, <pre> and a quoted title left out); code in a text is masked as the tool masks it, and a string that
// is all identifier is left alone. Text a script draws in the browser is not read: the data it draws from is.
// Used by plan/scripts/check.js, by check-board.js and by verify/cases-termrefs.js.
"use strict";
const fs = require("fs"), path = require("path");
const TOOL = path.resolve(__dirname, "..", "..", "..", "..", "tools", "finding");
const { glossaryPlaces, glossaryFiles, readFile } = require(path.join(TOOL, "lists.js")), F = require(path.join(TOOL, "match.js"));
const { titleSkip } = require("./levelrefs.js");

/* a paragraph of a file, by how it starts */
function paragraph(text, starts) {
  return String(text).replace(/\r\n/g, "\n").split(/\n\s*\n/).find(p => p.trimStart().startsWith(starts)) || null;
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const kebab = s => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/* ui.md's section 1, read only to tell the basic elements from the rest: a "Docker Image" or a "Command Line" is no element name */
function basicTerms(uiText) {
  const m = /^## 1\.[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(String(uiText).replace(/\r\n/g, "\n"));
  return new Set(m ? readFile(m[1], "ui.md").rows.map(r => r.term) : []);
}
/* The glossary, parsed from the two files' texts: every name it holds comes from them; lines, each file's term lines as read, for the tool's scan. */
function parseGlossary(uiText, boardsText) {
  const ui = readFile(uiText, "ui.md"), boards = readFile(boardsText, "boards.md"), problems = [...ui.problems, ...boards.problems];
  const terms = new Map(), get = t => { if (!terms.has(t)) terms.set(t, { term: t, files: [], not: [], allow: [], case: null }); return terms.get(t); };
  [[ui, "ui.md"], [boards, "boards.md"]].forEach(([f, name]) => {
    f.rows.forEach(r => { const x = get(r.term); if (!x.files.includes(name)) x.files.push(name); });
    f.lines.forEach(l => { const x = get(l.term); if (!x.files.includes(name)) x.files.push(name); if (l.case) x.case = l.case; l.not.forEach(w => { if (!x.not.includes(w)) x.not.push(w); }); l.allow.forEach(w => { if (!x.allow.includes(w)) x.allow.push(w); }); });
  });
  /* the type words: ui.md's one-word terms, section 2 only, the longest first */
  const basic = basicTerms(uiText), uiTerms = ui.rows.map(r => r.term).filter(t => /^[A-Z][A-Za-z]*$/.test(t)), typeWords = uiTerms.filter(t => !basic.has(t)).sort((a, b) => b.length - a.length);
  const typeRe = typeWords.map(escRe).join("|"), names = new Set(), subjects = new Map(), compounds = [];
  const note = (subject, type) => { const k = kebab(subject); if (k && !subjects.has(k)) subjects.set(k, type); };
  /* the compound-names paragraph: its bold names and the examples after "and so on" */
  const para = paragraph(boardsText, "A board's compound names");
  if (!para) problems.push("boards.md: the compound-names paragraph is missing");
  else {
    const bold = [...para.matchAll(/\*\*([^*]+?)\*\*/g)].map(m => m[1].trim());
    const eg = (para.match(/and so on\s*\(([^)]*)\)/) || ["", ""])[1].split(",").map(s => s.trim().replace(/^(?:a|an|the)\s+/i, ""));
    [...bold, ...eg].forEach(n => { const m = new RegExp(`^(.+?)\\s+(${typeRe})$`).exec(n); if (!m) return; compounds.push({ name: n, subject: m[1], type: m[2] }); note(m[1], m[2]); if (/^[A-Z]/.test(m[1])) names.add(n); });
  }
  /* the capitalised compounds of the rows' Cells: "the Guarantees Panel", "the KPI Tiles", "Runs and Landed Tiles", "a Gap, Considered, Verdict or As built Cell" */
  const TYPE_USE = new RegExp(`\\b(${typeRe})s?\\b`, "g"), typeSet = new Set(typeWords);
  boards.rows.forEach(r => { const cell = r.cells.join(" . ").replace(/\*\*/g, " ").replace(/`[^`]*`/g, " ").replace(/"[^"]*"/g, " ");
    for (const m of cell.matchAll(TYPE_USE)) { const pieces = cell.slice(0, m.index).split(/[;:().]/).pop().split(/,|\s+or\s+|\s+and\s+/);
      pieces.forEach((piece, i) => { const p = piece.trim().replace(/^(?:a|an|the|its)\s+/i, ""), last = i === pieces.length - 1;
        const name = (last ? /^[A-Z][\w-]*(?: [a-z]+)?$/ : /^[A-Z][\w-]*$/).test(p) ? p : (p.match(/\b([A-Z][\w-]*(?: [A-Z][\w-]*)*)$/) || [])[1];
        if (name && !name.split(/[ -]/).some(w => typeSet.has(w.replace(/s$/, "")) && name !== "Timeline")) names.add(`${name} ${m[1]}`); }); }
  });
  /* the CSS class list */
  const cssPara = paragraph(boardsText, "Where a template's CSS class"), classes = [];
  if (!cssPara) problems.push("boards.md: the CSS class list is missing");
  else [...cssPara.matchAll(/`\.([\w-]+)`(?:\s*\((?:a|an|the)\s+([^:)]+?)\s*[:)])?/g)].forEach(m => {
    const cls = m[1], segs = cls.split("-"), last = segs[segs.length - 1], type = typeWords.find(t => t.toLowerCase() === last) || null;
    const subject = segs.length > 1 && type ? segs.slice(0, -1).join("-") : null;
    classes.push({ cls, element: m[2] || null, subject, type });
    if (subject) note(subject, type);
  });
  /* a retired word of a ui.md term names its element in a class as well (.glow, .bubble); boards.md's "Page" names no element */
  const retired = new Map();
  ui.lines.forEach(l => l.not.forEach(w => retired.set(w.toLowerCase(), l.term)));
  return { terms, uiTerms: new Set(uiTerms), typeWords, names, compounds, classes, subjects, retired, problems, lines: { ui: ui.lines, boards: boards.lines } };
}
/* The glossary parsed, with the two files it was read from ({ files: { ui, boards } }); null when either is not found */
function loadGlossary(dir, deps) {
  const f = glossaryFiles(dir, deps); if (!f.ui || !f.boards) return null;
  return Object.assign(parseGlossary(fs.readFileSync(f.ui, "utf8"), fs.readFileSync(f.boards, "utf8")), { files: f });
}
/* The warning when a file is not found, naming where it was looked for */
function notFound(f) {
  return [!f.ui && "nomenclature/ui.md is not found in SpartanUI's checkout (docs/nomenclature/), beside the skill or in ~/.claude/nomenclature/",
    !f.boards && "nomenclature/boards.md is not found in the organization repository's checkout (policy/nomenclature/), beside the skill or in ~/.claude/nomenclature/"]
    .filter(Boolean).map(s => `TERM GLOSSARY: ${s}: the element names are not checked`);
}

/* a capitalised English word that opens a sentence is no subject of a name */
const FUNCTION_WORDS = new Set("The A An This That These Those Each Every Its No One Our In On At For From To By With When While If And Or But As".split(" "));

/* the glossary as the tool's lists: the two files' term lines, so the tool finds a ruled-out word over them and over nothing else */
const listsOf = G => G.__lists || (G.__lists = { terms: { ui: { lines: (G.lines && G.lines.ui) || [] }, boards: { lines: (G.lines && G.lines.boards) || [] } } });
function matchers(G) {
  if (G.__m) return G.__m;
  const typeRe = G.typeWords.map(escRe).join("|");
  const known = new Set([...G.names].map(n => n.toLowerCase())); G.terms.forEach(t => known.add(t.term.toLowerCase()));
  return (G.__m = { known,
    compound: new RegExp(`\\b([A-Z][\\w-]*(?: [A-Z][\\w-]*)*) (${typeRe})s?\\b`, "g"),
    camel: new RegExp(`\\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*(?:${typeRe})s?\\b`, "g") });
}
/* Every term hit of a text: { banned: [{ word, term, hit }], unknown: [name] }; banned the tool's finds, in the order they stand */
function termRefs(text, G) {
  const out = { banned: [], unknown: [] };
  if (typeof text !== "string" || !text.trim() || F.isIdentifier(text.trim())) return out;
  F.termRefs(text, { loaded: listsOf(G), lists: ["boards", "ui"] }).forEach(f => out.banned.push({ word: f.word, term: f.entry, hit: f.hit }));
  const t = F.maskCode(text), M = matchers(G), seen = new Set();
  const one = name => { const n = name.replace(/\s+/g, " ").trim(), k = n.toLowerCase().replace(/s$/, ""); if (seen.has(k) || M.known.has(k) || M.known.has(n.toLowerCase())) return; seen.add(k); out.unknown.push(n); };
  M.compound.lastIndex = 0; let m;
  while ((m = M.compound.exec(t))) { const subj = m[1].split(" "); while (subj.length && FUNCTION_WORDS.has(subj[0])) subj.shift(); if (subj.length) one(`${subj.join(" ")} ${m[2]}`); }
  M.camel.lastIndex = 0; while ((m = M.camel.exec(t))) one(m[0]);
  return out;
}
/* Every term hit in the strings of a data file: [{ at, kind, hit, term }]; keys and $comment skipped, and the paths skip(at) names */
function termRefsIn(v, at, found, skip, G) {
  found = found || []; at = at || "";
  if (typeof v === "string") { if (!(skip && skip(at))) { const r = termRefs(v, G); r.banned.forEach(b => found.push({ at: at || "(root)", kind: "banned", hit: b.hit, term: b.term })); r.unknown.forEach(u => found.push({ at: at || "(root)", kind: "unknown", hit: u })); } }
  else if (Array.isArray(v)) v.forEach((x, i) => termRefsIn(x, `${at}[${i}]`, found, skip, G));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") termRefsIn(v[k], at ? `${at}.${k}` : k, found, skip, G); });
  return found;
}
/* The text a board's HTML shows without a browser: its scripts, styles, comments, code and quoted titles out; a tag is a line break, so two neighbouring Labels are no compound;
   a quotation mark written as an entity is read as the mark it shows, so the tool sees a word quoted as retired as the reader does */
function shownText(html) {
  return String(html || "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\b[^>]*\bdata-board="\d+"[^>]*>[\s\S]*?<\/a>/gi, " ").replace(/<([a-z0-9]+)\b[^>]*\bdata-issue-title\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, "\n").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&#34;/g, '"').replace(/&ldquo;|&#8220;/g, "“").replace(/&rdquo;|&#8221;/g, "”").replace(/&[a-z]+;|&#\d+;/gi, " ").replace(/[ \t]+/g, " ");
}
/* The classes a board's markup and styles use: Map(class → the class lists it stands in): class="…" attributes (a generated one too, its ${…} parts left out) and the selectors of its <style> blocks */
function classesOf(html) {
  const out = new Map(), seen = cs => cs.forEach(c => { if (!out.has(c)) out.set(c, []); out.get(c).push(cs); });
  let h = String(html || ""); for (let i = 0; i < 4; i++) h = h.replace(/\$\{[^{}]*\}/g, " ");
  h.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => { css.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/([^{}]*)\{/g, (x, sel) => { if (!/^\s*@/.test(sel)) sel.split(",").forEach(s => s.split(/[\s>+~]+/).forEach(chunk => { const cs = [...chunk.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(y => y[1]); if (cs.length) seen(cs); })); return x; }); return m; });
  h.replace(/\bclass(?:Name)?\s*=\s*(?:\\?["'])([^"'<>]*?)(?:\\?["'])/g, (m, v) => { const cs = v.split(/\s+/).filter(c => /^-?[_a-zA-Z][\w-]*$/.test(c)); if (cs.length) seen(cs); return m; });
  return out;
}
/* Every class that names an element's kind without its type word: [{ cls, type, why }] */
function classRefs(html, G) {
  const out = [];
  classesOf(html).forEach((occ, c) => { const k = c.toLowerCase();
    if (G.retired.has(k)) { out.push({ cls: c, type: G.retired.get(k), why: "retired" }); return; }
    if (!G.subjects.has(k)) return;
    const types = G.typeWords.map(t => t.toLowerCase());
    if (occ.some(cs => !cs.some(x => x.toLowerCase() !== k && types.some(t => x.toLowerCase().endsWith(t))))) out.push({ cls: c, type: G.subjects.get(k), why: "subject" }); });
  return out.sort((a, b) => a.cls < b.cls ? -1 : 1);
}
/* Every hit of a board, each kind apart: { banned, unknown, classes } */
function boardTerms(data, html, skip, G) {
  const inData = termRefsIn(data || {}, "", [], skip, G), shown = termRefs(shownText(html), G);
  return {
    banned: [...inData.filter(h => h.kind === "banned").map(h => ({ at: h.at, hit: h.hit, term: h.term })), ...shown.banned.map(h => ({ at: "text", hit: h.hit, term: h.term }))],
    unknown: [...inData.filter(h => h.kind === "unknown").map(h => ({ at: h.at, hit: h.hit })), ...shown.unknown.map(h => ({ at: "text", hit: h }))],
    classes: classRefs(html, G),
  };
}
const quote = xs => xs.map(x => JSON.stringify(x)).join(", ");
const sites = hits => { const at = [...new Set(hits.map(h => h.at))]; return `${at.slice(0, 3).join(", ")}${at.length > 3 ? ", …" : ""}`; };
const words = (hits, f) => { const w = [...new Set(hits.map(f))]; return `${quote(w.slice(0, 6))}${w.length > 6 ? ` and ${w.length - 6} more` : ""}`; };
/* The warning lines of a board, one per kind */
function termWarnings(where, T) {
  const out = [];
  if (T.banned.length) out.push(`TERM BANNED WORD: ${where} (${sites(T.banned)}) uses ${words(T.banned, h => `${h.hit} (${h.term})`)}: the glossary rules the word out for that term (docs/nomenclature/ui.md in SpartanUI, policy/nomenclature/boards.md in .github)`);
  if (T.unknown.length) out.push(`TERM UNKNOWN NAME: ${where} (${sites(T.unknown)}) names ${words(T.unknown, h => h.hit)}: a capitalised element name in neither glossary list (docs/nomenclature/ui.md in SpartanUI, policy/nomenclature/boards.md in .github); use a term of the lists, or have the term added first`);
  if (T.classes.length) out.push(`TERM CLASS: ${where} has the class${T.classes.length === 1 ? "" : "es"} ${words(T.classes, h => `.${h.cls} (${h.type})`)}: a class that names an element's kind carries its type word (policy/nomenclature/boards.md in .github, "Board UI")`);
  return out;
}
let cached;
/* The paths of a board's data the scan leaves out: its quoted issue titles (levelrefs.js titleSkip()), an option's signature, and each statement's plan excerpt,
   the heading and paragraph lib.js copyExcerpts() copies from the section its reference names (a Verdict or As built statement's; its ref and hash are identifiers),
   as the baseline says (~/.claude/nomenclature/finding.md, "A board term's ruled-out words": a verbatim quotation held to its source is not read) */
const EXCERPT_PATH = /^rows\[\d+\]\.(?:verdict|asBuilt)\.statements\[\d+\]\.excerpt\.(?:heading|paragraph)$/;
const skipOf = d => { const t = titleSkip(d); return at => t(at) || /^rows\[\d+\]\.options\[\d+\]\.signature$/.test(at) || EXCERPT_PATH.test(at); };
/* The one call of a checker: the warning lines of a board, its data and its HTML. What skipOf() names is left out, on the org work board each
   repository's own; a glossary that cannot be read or parsed is said, and fails nothing. */
function boardWarnings(where, data, html, G) {
  const g = G || (cached === undefined ? (cached = loadGlossary()) : cached);
  if (!g) return notFound(glossaryFiles());
  const problems = g.problems.map(p => `TERM GLOSSARY: ${p}`);
  if (data && /^org-work-board\/[12]$/.test(String(data.schema))) {
    const { repositories, organizations, ...top } = data, T = boardTerms(top, html, skipOf(top), g);
    [...(repositories || []), ...(organizations || []).flatMap(o => o.repositories || [])].forEach(r => { if (!r.board) return; const R = boardTerms(r.board, "", skipOf(r.board), g);
      T.banned.push(...R.banned.map(h => ({ ...h, at: `${r.name}: ${h.at}` }))); T.unknown.push(...R.unknown.map(h => ({ ...h, at: `${r.name}: ${h.at}` }))); });
    return [...problems, ...termWarnings(where, T)];
  }
  return [...problems, ...termWarnings(where, boardTerms(data, html, skipOf(data || {}), g))];
}
module.exports = { glossaryPlaces, glossaryFiles, parseGlossary, loadGlossary, notFound, termRefs, termRefsIn, shownText, classesOf, classRefs, boardTerms, termWarnings, boardWarnings, skipOf, EXCERPT_PATH, readFile };
