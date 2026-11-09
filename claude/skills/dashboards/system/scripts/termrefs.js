// The element names of a board (GUIDANCE.md §12, "The names, checked"; the user's decision of 2026-11-09, reading A): the glossary is the only home of the names,
// ~/.claude/nomenclature/ui.md and boards.md, and this file holds none of them. It parses them where they stand and scans a board with what it parsed:
//   - the terms: the first Cell of every "| **Term** | … |" row of either file. It keys on the row, never on what follows a heading, so the rule lines
//     ({"name":…}) those headings will carry change nothing.
//   - what a table does not say: the lines of the JSON-lines blocks after the tables, {"term":"Card","not":["Bubble"],"allow":["…"]}, a line for a term with something to say:
//     "not" the words that term rules out, "allow" a longer name that holds a ruled-out word and is something else. A fenced line that is no term line is left alone.
//   - the compound names: boards.md's compound-names paragraph ("A board's compound names …"), with the capitalised compounds of the rows' Cells.
//   - the classes: boards.md's CSS class list ("Where a template's CSS class …").
// The scan, warnings only (it never fails a board; check.js and check-board.js print its lines):
//   TERM BANNED WORD   a word a term rules out, used. As written, capitalised (a plural too): a term is a proper noun, and the everyday word stays lower case (ui.md, Naming).
//   TERM UNKNOWN NAME  a capitalised element name in neither list: a CamelCase word or a Capitalised compound ending in a type word of ui.md's section 2.
//   TERM CLASS         a CSS class that names an element's kind without its type word: a listed compound's subject, a listed class's subject, or a retired word of a
//                      ui.md term, unless it always stands beside a class that carries a type word (class="chip now", class="cell verdict").
// What it scans is the text a board shows and its generated data: every string value of the data (keys, $comment, a quoted issue title and an option's signature left out)
// and the static text of its HTML (scripts, styles, comments, <code>, <pre> and a quoted title left out). Backtick spans, Markdown link targets, URLs and paths are code,
// never prose, and a string that is all identifier is left alone. Text a script draws in the browser is not read: the data it draws from is.
// Used by plan/scripts/check.js, by check-board.js and by verify/cases-termrefs.js.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { titleSkip } = require("./levelrefs.js");

/* The two files: the folder given, beside the skill (../../../nomenclature, as in ~/.claude and the .github mirror's claude/), else ~/.claude/nomenclature/. */
function glossaryDir(given) {
  return [given, path.resolve(__dirname, "..", "..", "..", "nomenclature"), path.join(os.homedir(), ".claude", "nomenclature")].filter(Boolean)
    .find(d => fs.existsSync(path.join(d, "ui.md")) && fs.existsSync(path.join(d, "boards.md"))) || null;
}
const cellsOf = line => line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
/* A file's rows and term lines, wherever they stand: { rows: [{ term, cells, line }], lines: [{ term, not, allow, line }], problems: [] } */
function readFile(text, name) {
  const rows = [], lines = [], problems = []; let fence = false;
  String(text).replace(/\r\n/g, "\n").split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) { fence = !fence; return; }
    if (fence) {
      const t = line.trim(); if (!t.startsWith("{")) return;
      let o; try { o = JSON.parse(t); } catch (e) { problems.push(`${name}:${i + 1}: a fenced line is not JSON: ${t.slice(0, 80)}`); return; }
      if (!o || typeof o.term !== "string") return;   // a rule line, {"name":…}, stands beside the term lines
      const list = k => { if (o[k] === undefined) return []; if (Array.isArray(o[k]) && o[k].every(x => typeof x === "string" && x.trim())) return o[k]; problems.push(`${name}:${i + 1}: "${k}" of ${o.term} is not a list of words`); return []; };
      lines.push({ term: o.term, not: list("not"), allow: list("allow"), line: i + 1 }); return;
    }
    if (!/^\s*\|/.test(line)) return;
    const cells = cellsOf(line), m = /^\*\*([^*]+?)\*\*/.exec(cells[0]);
    if (m) rows.push({ term: m[1].trim(), cells, line: i + 1 });
  });
  if (fence) problems.push(`${name}: a code fence is left open`);
  return { rows, lines, problems };
}
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
/* The glossary, parsed from the two files' texts: every name it holds comes from them. */
function parseGlossary(uiText, boardsText) {
  const ui = readFile(uiText, "ui.md"), boards = readFile(boardsText, "boards.md"), problems = [...ui.problems, ...boards.problems];
  const terms = new Map(), get = t => { if (!terms.has(t)) terms.set(t, { term: t, files: [], not: [], allow: [] }); return terms.get(t); };
  [[ui, "ui.md"], [boards, "boards.md"]].forEach(([f, name]) => {
    f.rows.forEach(r => { const x = get(r.term); if (!x.files.includes(name)) x.files.push(name); });
    f.lines.forEach(l => { const x = get(l.term); if (!x.files.includes(name)) x.files.push(name); l.not.forEach(w => { if (!x.not.includes(w)) x.not.push(w); }); l.allow.forEach(w => { if (!x.allow.includes(w)) x.allow.push(w); }); });
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
  return { terms, uiTerms: new Set(uiTerms), typeWords, names, compounds, classes, subjects, retired, problems };
}
function loadGlossary(dir) {
  const d = glossaryDir(dir); if (!d) return null;
  return Object.assign(parseGlossary(fs.readFileSync(path.join(d, "ui.md"), "utf8"), fs.readFileSync(path.join(d, "boards.md"), "utf8")), { dir: d });
}

/* code and quoted machine text are never prose */
const maskCode = t => String(t).replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ").replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/\]\([^)]*\)/g, "] ").replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, " ").replace(/(?:[\w.-]+\/)+[\w.-]*/g, " ");
const isIdentifier = t => /^[\w.:/#@-]+$/.test(t) && !/^[A-Z][a-z]/.test(t);
/* a capitalised English word that opens a sentence is no subject of a name */
const FUNCTION_WORDS = new Set("The A An This That These Those Each Every Its No One Our In On At For From To By With When While If And Or But As".split(" "));

function matchers(G) {
  if (G.__m) return G.__m;
  const typeRe = G.typeWords.map(escRe).join("|"), banned = [];
  G.terms.forEach(t => t.not.forEach(w => banned.push({ word: w, term: t.term, re: new RegExp(`\\b${escRe(w)}s?\\b`, "g"), allow: t.allow.map(a => new RegExp(escRe(a), "g")) })));
  const known = new Set([...G.names].map(n => n.toLowerCase())); G.terms.forEach(t => known.add(t.term.toLowerCase()));
  return (G.__m = { banned, known,
    compound: new RegExp(`\\b([A-Z][\\w-]*(?: [A-Z][\\w-]*)*) (${typeRe})s?\\b`, "g"),
    camel: new RegExp(`\\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*(?:${typeRe})s?\\b`, "g") });
}
/* Every term hit of a text: { banned: [{ word, term, hit }], unknown: [name] } */
function termRefs(text, G) {
  const out = { banned: [], unknown: [] };
  if (typeof text !== "string" || !text.trim() || isIdentifier(text.trim())) return out;
  const t = maskCode(text), M = matchers(G), seen = new Set();
  M.banned.forEach(b => { let s = t; b.allow.forEach(a => { s = s.replace(a, " "); }); b.re.lastIndex = 0; let m; while ((m = b.re.exec(s))) out.banned.push({ word: b.word, term: b.term, hit: m[0] }); });
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
/* The text a board's HTML shows without a browser: its scripts, styles, comments, code and quoted titles out; a tag is a line break, so two neighbouring Labels are no compound */
function shownText(html) {
  return String(html || "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\b[^>]*\bdata-board="\d+"[^>]*>[\s\S]*?<\/a>/gi, " ").replace(/<([a-z0-9]+)\b[^>]*\bdata-issue-title\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, "\n").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&[a-z]+;|&#\d+;/gi, " ").replace(/[ \t]+/g, " ");
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
  if (T.banned.length) out.push(`TERM BANNED WORD: ${where} (${sites(T.banned)}) uses ${words(T.banned, h => `${h.hit} (${h.term})`)}: the glossary rules the word out for that term (nomenclature/ui.md, boards.md)`);
  if (T.unknown.length) out.push(`TERM UNKNOWN NAME: ${where} (${sites(T.unknown)}) names ${words(T.unknown, h => h.hit)}: a capitalised element name in neither glossary list (nomenclature/ui.md, boards.md); use a term of the lists, or have the term added first`);
  if (T.classes.length) out.push(`TERM CLASS: ${where} has the class${T.classes.length === 1 ? "" : "es"} ${words(T.classes, h => `.${h.cls} (${h.type})`)}: a class that names an element's kind carries its type word (nomenclature/boards.md, "Board UI")`);
  return out;
}
let cached;
/* The one call of a checker: the warning lines of a board, its data and its HTML. An issue's title and an option's signature are left out, on the org work board each
   repository's own; a glossary that cannot be read or parsed is said, and fails nothing. */
function boardWarnings(where, data, html, G) {
  const g = G || (cached === undefined ? (cached = loadGlossary()) : cached);
  if (!g) return ["TERM GLOSSARY: nomenclature/ui.md and boards.md are not found beside the skill or in ~/.claude: the element names are not checked"];
  const skipOf = d => { const t = titleSkip(d); return at => t(at) || /^rows\[\d+\]\.options\[\d+\]\.signature$/.test(at); };
  const problems = g.problems.map(p => `TERM GLOSSARY: ${p}`);
  if (data && data.schema === "org-work-board/1") {
    const { repositories, organizations, ...top } = data, T = boardTerms(top, html, skipOf(top), g);
    [...(repositories || []), ...(organizations || []).flatMap(o => o.repositories || [])].forEach(r => { if (!r.board) return; const R = boardTerms(r.board, "", skipOf(r.board), g);
      T.banned.push(...R.banned.map(h => ({ ...h, at: `${r.name}: ${h.at}` }))); T.unknown.push(...R.unknown.map(h => ({ ...h, at: `${r.name}: ${h.at}` }))); });
    return [...problems, ...termWarnings(where, T)];
  }
  return [...problems, ...termWarnings(where, boardTerms(data, html, skipOf(data || {}), g))];
}
module.exports = { glossaryDir, parseGlossary, loadGlossary, termRefs, termRefsIn, shownText, classesOf, classRefs, boardTerms, termWarnings, boardWarnings, readFile };
