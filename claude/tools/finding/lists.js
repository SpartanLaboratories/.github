// The lists a scan reads, found and parsed where they stand each time they are loaded: the internal
// names (its four tables and the markers of its fourth section, each read by its header), the term lines
// of the three vocabularies, and the baseline's tables. Nothing here holds a copy of any list.
//   load(opts)  every list, cached for the process; opts.fresh reads again; opts.dirs, opts.env,
//               opts.home and opts.readStored replace where each file is looked for (the tests).
// A list that cannot be read or parsed is a ListError naming its file and line, never an empty list.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");

class ListError extends Error {
  constructor(file, line, message) {
    super(`${file}${line ? `:${line}` : ""}: ${message}`);
    this.file = file; this.line = line || null; this.name = "ListError";
  }
}

const readText = file => {
  let t;
  try { t = fs.readFileSync(file, "utf8"); } catch (e) { throw new ListError(file, null, `cannot be read (${e.code || e.message})`); }
  return t.replace(/^﻿/, "").replace(/\r\n/g, "\n");
};

/* ---- where the files are ---------------------------------------------------------------------- */

/* The internal names, the vocabulary and the baseline: beside the tool (as in the configuration folder
   and in its public copy), else in the home folder's configuration. A folder given is the only place. */
function nomenclatureDir(opts) {
  if (opts.dirs && opts.dirs.nomenclature) return path.resolve(opts.dirs.nomenclature);
  const beside = path.resolve(__dirname, "..", "..", "nomenclature");
  if (fs.existsSync(path.join(beside, "internal-names.md"))) return beside;
  return path.join(opts.home || os.homedir(), ".claude", "nomenclature");
}

/* The two glossaries, each found on its own, the first place that holds it as a glossary:
     boards.md: <the organization repository's checkout>/policy/nomenclature/boards.md, the checkout
                SPARTAN_ORG_POLICIES names;
     ui.md:     <the UI library's checkout>/docs/nomenclature/ui.md, the checkout SPARTAN_CHECKOUT_SPARTANUI
                names, else the folder SpartanUI beside the organization repository's checkout;
     then, for each apart, its old homes: beside the tool, else the home folder's configuration. A folder
     given is looked in first, for both. A variable is read from the process environment first, then from
     the stored user value (on Windows, the user's environment in the registry; elsewhere none). A file
     with no bold term row, such as a pointer left at an old home, is no glossary and is not taken. */
const POLICIES_VARIABLE = "SPARTAN_ORG_POLICIES", SPARTANUI_FOLDER = "SpartanUI";
const overrideVariable = folder => `SPARTAN_CHECKOUT_${folder.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
const stored = new Map();
function readStoredUserValue(name) {
  if (stored.has(name)) return stored.get(name);
  let v = null;
  if (process.platform === "win32") try {
    const out = cp.execFileSync("reg", ["query", "HKCU\\Environment", "/v", name], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
    const m = new RegExp(`^\\s*${name}\\s+(REG_SZ|REG_EXPAND_SZ)\\s+(.*)$`, "mi").exec(out);
    if (m) v = m[1] === "REG_EXPAND_SZ" ? m[2].trim().replace(/%([^%]+)%/g, (all, k) => process.env[k] || all) : m[2].trim();
  } catch (e) { v = null; }
  stored.set(name, v || null); return v || null;
}
const readVariable = (name, deps) => (deps.env || process.env)[name] || (deps.readStored || readStoredUserValue)(name) || null;
/* Every place each glossary is looked for, in order: { ui: [path], boards: [path] } */
function glossaryPlaces(given, deps) {
  deps = deps || {};
  const policies = readVariable(POLICIES_VARIABLE, deps), override = readVariable(overrideVariable(SPARTANUI_FOLDER), deps);
  const spartanUI = override || (policies ? path.join(path.dirname(path.resolve(policies)), SPARTANUI_FOLDER) : null);
  const old = [path.resolve(__dirname, "..", "..", "nomenclature"), path.join(deps.home || os.homedir(), ".claude", "nomenclature")];
  const at = (dir, ...p) => dir ? path.join(dir, ...p) : null;
  return {
    ui: [at(given, "ui.md"), at(spartanUI, "docs", "nomenclature", "ui.md"), ...old.map(d => at(d, "ui.md"))].filter(Boolean),
    boards: [at(given, "boards.md"), at(policies, "policy", "nomenclature", "boards.md"), ...old.map(d => at(d, "boards.md"))].filter(Boolean),
  };
}
const isGlossary = f => { try { return fs.statSync(f).isFile() && /^\s*\|\s*\*\*[^*\n]+\*\*/m.test(fs.readFileSync(f, "utf8")); } catch (e) { return false; } };
/* The two glossaries found: { ui: path|null, boards: path|null } */
function glossaryFiles(given, deps) {
  const P = glossaryPlaces(given, deps);
  return { ui: P.ui.find(isGlossary) || null, boards: P.boards.find(isGlossary) || null };
}

/* ---- tables ----------------------------------------------------------------------------------- */

const cellsOf = line => line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
/* Every table of a text: [{ line, header: [name], rows: [{ cells, line }] }], line numbers counted from
   first (the line the text starts at in its file). A table is a run of lines that start with "|", its
   second line the separator. */
function tablesIn(text, first) {
  const lines = text.split("\n"), out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1] || "")) continue;
    const t = { line: first + i, header: cellsOf(lines[i]), rows: [] };
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) t.rows.push({ cells: cellsOf(lines[j]), line: first + j });
    out.push(t); i = j - 1;
  }
  return out;
}
/* A table's columns by their header names: { key: index }; a required name missing is an error */
function columns(table, file, wanted, optional) {
  const at = {}, low = table.header.map(h => h.toLowerCase());
  for (const [key, name] of Object.entries(wanted)) {
    const i = low.indexOf(name.toLowerCase());
    if (i < 0) throw new ListError(file, table.line, `the table has no "${name}" column (its header: ${table.header.join(" | ")})`);
    at[key] = i;
  }
  for (const [key, name] of Object.entries(optional || {})) { const i = low.indexOf(name.toLowerCase()); at[key] = i < 0 ? null : i; }
  return at;
}
const bold = cell => [...String(cell || "").matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1].replace(/^["“]|["”]$/g, "").trim());
const quoted = s => [...String(s || "").matchAll(/["“]([^"”]+)["”]/g)].map(m => m[1].trim());
const cellOrNull = (cells, i) => i == null ? null : ((cells[i] || "").trim() || null);

/* ---- the internal names ----------------------------------------------------------------------- */

/* An approval-flow row's form, from its "What it is": { words, anchor, after, between }, or null for a
   row that names none. The examples in parentheses are dropped first; the quoted words on one side of
   "followed by" ("followed directly by") are the form's words, the one quote on the other side that holds
   "user" as a whole word is its anchor, after true where the words come first; between, whether the row
   allows one word between. */
function formOf(what) {
  const t = String(what || "").replace(/\([^()]*\)/g, " ");
  const m = /^([\s\S]*?)\bfollowed\s+(?:directly\s+)?by\b([\s\S]*)$/i.exec(t); if (!m) return null;
  const pre = quoted(m[1]), post = quoted(m[2]), isAnchor = side => side.length === 1 && /\buser\b/i.test(side[0]);
  const after = isAnchor(post) && !isAnchor(pre), words = after ? pre : post, anchor = (after ? post : pre)[0];
  if (!words.length || !anchor || !/\buser\b/i.test(anchor)) return null;
  return { words, anchor, after, between: !after && /\bone word\b[^.]*\bbetween\b/i.test(t) };
}
/* A row's strength, from its "Allowed when" and "What it is": never (barred wherever it stands, save
   where the markers of section 4 clear it), agent (barred as an agent's name only), other (anything
   else, which bars nothing here: an exception is not the tool's to read) */
function strengthOf(what, allowed) {
  if (/agent's name only/i.test(`${what} ${allowed}`)) return "agent";
  if (/^(?:never|as section 4's markers say)\.?$/i.test(String(allowed || "").trim())) return "never";
  return "other";
}
/* The markers of section 4, from its table headed "Word", "Markers" and "In code form", or none when the
   section has no such table: [{ word, markers: [marker], codeForm, line }], codeForm true where the
   row reads the word in code form as no find. A word that is no word of the first three sections is an
   error, and so is a row with no marker or an "In code form" cell other than "no find" or "a find". */
function markersOf(tables, file, barred) {
  const t = tables.find(x => { const h = x.header.map(c => c.toLowerCase()); return h.includes("word") && h.includes("markers"); });
  if (!t) return [];
  const c = columns(t, file, { word: "Word", markers: "Markers", code: "In code form" });
  const known = new Set(barred.map(w => w.toLowerCase())), seen = new Set();
  return t.rows.map(r => {
    const word = bold(r.cells[c.word])[0], markers = ticks(r.cells[c.markers]), code = String(r.cells[c.code] || "").trim().toLowerCase().replace(/\.$/, "");
    if (!word) throw new ListError(file, r.line, "a row of the markers has no bold word");
    if (!known.has(word.toLowerCase())) throw new ListError(file, r.line, `"${word}" is no name, phrase or word of sections 1 to 3`);
    if (seen.has(word.toLowerCase())) throw new ListError(file, r.line, `"${word}" has a second row of markers`);
    seen.add(word.toLowerCase());
    if (!markers.length) throw new ListError(file, r.line, `"${word}" has no marker in backticks`);
    if (code !== "no find" && code !== "a find") throw new ListError(file, r.line, `"${r.cells[c.code]}" is neither "no find" nor "a find"`);
    return { word, markers, codeForm: code === "no find", line: r.line };
  });
}
/* The list's four sections, each by its "## <n>." heading and its first table, read by header names;
   section 4's markers by their own table. */
function parseInternalNames(text, file) {
  const lines = text.split("\n"), heads = [];
  lines.forEach((l, i) => { const m = /^## (\d+)\./.exec(l); if (m) heads.push({ n: Number(m[1]), line: i }); });
  const sectionTables = n => {
    const h = heads.find(x => x.n === n); if (!h) throw new ListError(file, null, `section ${n} ("## ${n}.") is missing`);
    const next = heads.find(x => x.line > h.line), body = lines.slice(h.line + 1, next ? next.line : lines.length).join("\n");
    const ts = tablesIn(body, h.line + 2); if (!ts.length) throw new ListError(file, h.line + 1, `section ${n} has no table`);
    return ts;
  };
  const section = n => sectionTables(n)[0];
  const say = { sayInstead: "Say instead" };
  const t1 = section(1), c1 = columns(t1, file, { name: "Name", aliases: "Aliases", what: "What it is", allowed: "Allowed when" }, say);
  const roles = t1.rows.map(r => {
    const name = bold(r.cells[c1.name])[0], aliases = bold(r.cells[c1.aliases]);
    if (!name || !aliases.length) throw new ListError(file, r.line, "a row of section 1 has no bold name or no bold alias");
    return { name, aliases, strength: strengthOf(r.cells[c1.what], r.cells[c1.allowed]), sayInstead: cellOrNull(r.cells, c1.sayInstead), line: r.line };
  });
  const t2 = section(2), c2 = columns(t2, file, { term: "Term", what: "What it is", allowed: "Allowed when" }, say);
  const approval = t2.rows.map(r => {
    const phrase = bold(r.cells[c2.term])[0]; if (!phrase) throw new ListError(file, r.line, "a row of section 2 has no bold phrase");
    return { phrase, form: formOf(r.cells[c2.what]), strength: strengthOf(r.cells[c2.what], r.cells[c2.allowed]), sayInstead: cellOrNull(r.cells, c2.sayInstead), line: r.line };
  });
  const t3 = section(3), c3 = columns(t3, file, { term: "Term", what: "What it is", allowed: "Allowed when" }, say);
  const grades = t3.rows.map(r => {
    const term = bold(r.cells[c3.term])[0]; if (!term) throw new ListError(file, r.line, "a row of section 3 has no bold term");
    let what = String(r.cells[c3.what] || ""), was;
    do { was = what; what = what.replace(/\([^()]*\)/g, " "); } while (what !== was);
    const words = [term, ...quoted(what)];
    return { term, words: [...new Set(words)], strength: strengthOf(r.cells[c3.what], r.cells[c3.allowed]), sayInstead: cellOrNull(r.cells, c3.sayInstead), line: r.line };
  });
  const s4 = sectionTables(4), t4 = s4[0]; columns(t4, file, { term: "Term", what: "What it is" });
  const allowed = t4.rows.map(r => r.cells.join(" · "));
  const markers = markersOf(s4.slice(1), file, [...roles.flatMap(r => r.aliases), ...approval.map(r => r.phrase), ...grades.flatMap(r => r.words)]);
  return { file, roles, approval, grades, allowed, markers };
}

/* ---- the term lines of a vocabulary ----------------------------------------------------------- */

/* A file's rows and term lines, wherever they stand: { rows: [{ term, cells, line }], lines: [{ term,
   not, allow, case, line }], problems: [] }. A fenced line that opens with "{" is read as JSON; a rule
   line ({"name":…}) stands beside the term lines and is left alone. */
function readFile(text, name) {
  const rows = [], lines = [], problems = []; let fence = false;
  String(text).replace(/\r\n/g, "\n").split("\n").forEach((line, i) => {
    if (/^\s*```/.test(line)) { fence = !fence; return; }
    if (fence) {
      const t = line.trim(); if (!t.startsWith("{")) return;
      let o; try { o = JSON.parse(t); } catch (e) { problems.push(`${name}:${i + 1}: a fenced line is not JSON: ${t.slice(0, 80)}`); return; }
      if (!o || typeof o.term !== "string") return;
      const list = k => { if (o[k] === undefined) return []; if (Array.isArray(o[k]) && o[k].every(x => typeof x === "string" && x.trim())) return o[k]; problems.push(`${name}:${i + 1}: "${k}" of ${o.term} is not a list of words`); return []; };
      let cs = null; if (o.case === "any") cs = "any"; else if (o.case !== undefined) problems.push(`${name}:${i + 1}: "case" of ${o.term} is not "any": ${JSON.stringify(o.case)}`);
      lines.push({ term: o.term, not: list("not"), allow: list("allow"), case: cs, line: i + 1 }); return;
    }
    if (!/^\s*\|/.test(line)) return;
    const cells = cellsOf(line), m = /^\*\*([^*]+?)\*\*/.exec(cells[0]);
    if (m) rows.push({ term: m[1].trim(), cells, line: i + 1 });
  });
  if (fence) problems.push(`${name}: a code fence is left open`);
  return { rows, lines, problems };
}
/* A vocabulary read: its term lines; a problem is an error with its file and line */
function parseTerms(text, file) {
  const r = readFile(text, path.basename(file));
  if (r.problems.length) {
    const m = /^[^:]+:(\d+):\s*(.*)$/.exec(r.problems[0]);
    throw new ListError(file, m ? Number(m[1]) : null, m ? m[2] : r.problems[0].replace(/^[^:]+:\s*/, ""));
  }
  return { file, lines: r.lines, rows: r.rows };
}

/* ---- the baseline ----------------------------------------------------------------------------- */

/* A rule's body, by its id: { text, line } (line: the body's first line in the file) */
function ruleBody(lines, id, file) {
  const at = lines.findIndex(l => new RegExp(`^\\{"name":.*"id":${id}\\}\\s*$`).test(l.trim()));
  if (at < 0) throw new ListError(file, null, `the rule ${id} is missing`);
  let end = at + 1; while (end < lines.length && !/^#{1,6}\s/.test(lines[end])) end++;
  return { text: lines.slice(at + 1, end).join("\n"), line: at + 2 };
}
const ticks = cell => [...String(cell || "").matchAll(/`([^`]+)`/g)].map(m => m[1].trim());
/* A path pattern as a regular expression: "**" any number of folders, "*" any characters within a name */
function globRe(glob) {
  let s = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") { if (glob[i + 2] === "/") { s += "(?:.*/)?"; i += 2; } else { s += ".*"; i += 1; } }
    else if (c === "*") s += "[^/]*";
    else s += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${s}$`, "i");
}
const FORMS = ["c-nested", "c", "css", "html", "markup", "hash", "hash-line", "properties", "ini", "http", "batch", "dash", "none"];
function parseFinding(text, file) {
  const lines = text.split("\n");
  const docs = ruleBody(lines, 10049, file), t1 = tablesIn(docs.text, docs.line)[0];
  if (!t1) throw new ListError(file, docs.line, "the rule 10049 has no table");
  const c1 = columns(t1, file, { repo: "Repository", path: "Path", read: "Read" });
  const places = t1.rows.map(r => {
    const repo = ticks(r.cells[c1.repo])[0] || r.cells[c1.repo].trim(), glob = ticks(r.cells[c1.path])[0], read = r.cells[c1.read].trim().toLowerCase();
    if (!glob) throw new ListError(file, r.line, "a row has no path in backticks");
    if (read !== "whole" && read !== "not read") throw new ListError(file, r.line, `"${r.cells[c1.read]}" is neither "whole" nor "not read"`);
    return { repo: repo.toLowerCase() === "any" ? null : repo, glob, re: globRe(glob), read: read === "whole" ? "whole" : "no", line: r.line };
  });
  const src = ruleBody(lines, 10050, file), t2 = tablesIn(src.text, src.line)[0];
  if (!t2) throw new ListError(file, src.line, "the rule 10050 has no table");
  const c2 = columns(t2, file, { form: "Form", files: "Files", comments: "Comments read" });
  const kinds = t2.rows.map(r => {
    const form = ticks(r.cells[c2.form])[0], names = ticks(r.cells[c2.files]);
    if (!FORMS.includes(form)) throw new ListError(file, r.line, `"${r.cells[c2.form]}" is no form the tool reads (${FORMS.join(", ")})`);
    if (!names.length) throw new ListError(file, r.line, "a row names no file in backticks");
    return { form, names, line: r.line };
  });
  const board = ruleBody(lines, 10047, file), shortened = quoted(board.text);
  if (!shortened.length) throw new ListError(file, board.line, "the rule 10047 quotes no shortened name");
  return { file, places, kinds, shortened };
}

/* ---- load ------------------------------------------------------------------------------------- */

let cache = null;
/* Every list: { internalNames, finding, terms: { vocabulary, boards, ui } }, each term list either its
   parse or { error } (a vocabulary is needed only when a scan asks for it). The internal names and the
   baseline are needed by every scan: either failing throws. */
function load(opts) {
  opts = opts || {};
  const custom = !!(opts.dirs || opts.env || opts.home || opts.readStored);
  if (!custom && !opts.fresh && cache) return cache;
  const dir = nomenclatureDir(opts);
  const inFile = path.join(dir, "internal-names.md"), fFile = path.join(dir, "finding.md");
  const out = { internalNames: parseInternalNames(readText(inFile), inFile), finding: parseFinding(readText(fFile), fFile), terms: {} };
  const term = (key, file, missing) => {
    if (!file) { out.terms[key] = { error: new ListError(missing, null, "is not found") }; return; }
    try { out.terms[key] = parseTerms(readText(file), file); } catch (e) { out.terms[key] = { error: e }; }
  };
  term("vocabulary", path.join(dir, "vocabulary.md"));
  const g = glossaryFiles(opts.dirs && opts.dirs.glossary, { env: opts.env, home: opts.home, readStored: opts.readStored });
  term("boards", g.boards, "boards.md (the organization repository's policy/nomenclature/, beside the tool or in the home configuration)");
  term("ui", g.ui, "ui.md (the UI library's docs/nomenclature/, beside the tool or in the home configuration)");
  if (!custom) cache = out;
  return out;
}
/* A vocabulary's term lines, or its error thrown */
function termList(loaded, key) {
  const t = loaded.terms[key];
  if (!t) throw new ListError(key, null, "is no vocabulary (vocabulary, boards, ui)");
  if (t.error) throw t.error;
  return t;
}

module.exports = { load, termList, ListError, glossaryPlaces, glossaryFiles, isGlossary, readFile, cellsOf, tablesIn, formOf, strengthOf, markersOf, parseInternalNames, parseTerms, parseFinding, globRe, FORMS };
