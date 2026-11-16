#!/usr/bin/env node
// Tests for lists.js: the tables read by their headers, the wording column present, absent and empty,
// the forms of the second section, the term lines, every unreadable case, and the live lists.
//   node lists.test.js --dir <an empty scratch folder>
// It writes only under --dir.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

const i = process.argv.indexOf("--dir");
if (i < 0 || !process.argv[i + 1]) { console.error("usage: lists.test.js --dir <scratch folder>"); process.exit(2); }
const dir = path.resolve(process.argv[i + 1]);
fs.mkdirSync(dir, { recursive: true });
const L = require(path.join(__dirname, "..", "lists.js"));
const live = path.resolve(__dirname, "..", "..", "..", "nomenclature");

let pass = 0, fail = 0;
function ok(cond, name, detail) { if (cond) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); } }
function throwsList(fn, name, want) {
  try { fn(); ok(false, name, "no error"); }
  catch (e) { ok(e instanceof L.ListError && want.test(e.message), name, e.message); }
}
let n = 0;
/* a fixture folder with the live baseline and a fixture list of the internal names */
function fixture(internal, extra) {
  const d = path.join(dir, `f${++n}`); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "internal-names.md"), internal);
  fs.writeFileSync(path.join(d, "finding.md"), (extra && extra.finding) || fs.readFileSync(path.join(live, "finding.md"), "utf8"));
  if (extra && extra.vocabulary != null) fs.writeFileSync(path.join(d, "vocabulary.md"), extra.vocabulary);
  return d;
}
const opts = d => ({ dirs: { nomenclature: d, glossary: d }, env: {}, readStored: () => null, home: path.join(dir, "nohome") });

/* a list in the live file's shape, with the columns and cells the cases ask for */
function list({ s1Header, s1Rows, s2Rows, s2Header, s3Rows, s4 } = {}) {
  return [
    "# A fixture", "", "## 1. The first", "",
    s1Header || "| Name | Aliases | What it is | Allowed when |", "|---|---|---|---|",
    ...(s1Rows || ["| **Widgeteer** | **widgeteer**, **widget maker** | A role. | never |",
      "| **Qx** | **qx** | A role. Barred as an agent's name only. | its step |",
      "| **Other** | **otherone** | A role. | when the user says so |"]),
    "", "## 2. The second", "",
    s2Header || "| Term | What it is | Allowed when |", "|---|---|---|",
    ...(s2Rows || [
      "| **\"the user's nod\"** | \"user's\" followed by \"nod\" or \"wink\", directly or with one word of letters between (\"the user's slow nod\"). | never |",
      "| **\"the user nodded\"** | \"user\" followed directly by \"nodded\" or \"winked\". | never |",
      "| **\"user nods\"** | The user's nods. | never |",
      "| **\"nodded by the user\"** | \"nodded\" or \"winked\" followed by \"by the user\". | never |"]),
    "", "## 3. The third", "",
    "| Term | What it is | Allowed when |", "|---|---|---|",
    ...(s3Rows || ["| **\"size 3\"** | A size by its number ([`X`](x), \"Sizes\"). | never |",
      "| **\"the size\"** | The word: \"size\", \"sizes\", \"sized\", \"re-size\". | never |"]),
    "", "## 4. Allowed", "",
    ...(s4 || ["| Term | What it is |", "|---|---|", "| **\"fine\"** | A fine word. |"]), ""
  ].join("\n");
}

/* ---- the live lists ------------------------------------------------------------------------------ */
{
  const X = L.load({ fresh: true });
  const text = fs.readFileSync(path.join(live, "internal-names.md"), "utf8").replace(/\r\n/g, "\n");
  const rowsOf = n => { const m = new RegExp(`^## ${n}\\.[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(text); return m[1].split("\n").filter(l => /^\|\s*\*\*/.test(l)); };
  ok(X.internalNames.roles.length === rowsOf(1).length && rowsOf(1).length > 0, `live: every row of section 1 read (${rowsOf(1).length})`);
  ok(X.internalNames.approval.length === rowsOf(2).length && rowsOf(2).length > 0, `live: every row of section 2 read (${rowsOf(2).length})`);
  ok(X.internalNames.grades.length === rowsOf(3).length && rowsOf(3).length > 0, `live: every row of section 3 read (${rowsOf(3).length})`);
  rowsOf(1).forEach(raw => {
    const cells = L.cellsOf(raw), name = /\*\*(.+?)\*\*/.exec(cells[0])[1], r = X.internalNames.roles.find(x => x.name === name);
    const want = /agent's name only/i.test(raw) ? "agent" : /\|\s*(?:never|as section 4's markers say)\s*\|?\s*$/.test(raw) ? "never" : "other";
    ok(r && r.strength === want && r.aliases.length === (cells[1].match(/\*\*/g) || []).length / 2, `live: section 1 row ${name} read with its aliases, strength ${want}`, JSON.stringify(r));
  });
  X.internalNames.approval.forEach(r => ok(r.strength === "never", `live: section 2 row ${r.phrase} read, strength never${r.form ? `, a form after "${r.form.anchor}"` : ", no form"}`));
  X.internalNames.grades.forEach(r => ok(r.strength === "never" && r.words.length >= 1, `live: section 3 row ${r.term} read, strength never, ${r.words.length} words`));
  ok(X.internalNames.allowed.length > 0, "live: section 4 read as text");
  const markerRows = (/^### Markers[\s\S]*$/m.exec(rowsOf(4).length ? text : "") || [""])[0].split("\n").filter(l => /^\|\s*\*\*/.test(l));
  ok(X.internalNames.markers.length === markerRows.length, `live: every row of the markers read (${markerRows.length})`, JSON.stringify(X.internalNames.markers));
  X.internalNames.markers.forEach(m => ok(m.markers.length > 0 && typeof m.codeForm === "boolean", `live: the markers of ${JSON.stringify(m.word)} read (${m.markers.length}), in code form ${m.codeForm ? "no find" : "a find"}`));
  ok(X.finding.places.length > 0 && X.finding.kinds.length > 0, `live: the baseline's two tables read (${X.finding.places.length} places, ${X.finding.kinds.length} kinds)`);
  ok(X.finding.shortened.length === 2, `live: the baseline's shortened names read (${X.finding.shortened.length})`);
  ok(!X.terms.vocabulary.error && X.terms.vocabulary.lines.length > 0, "live: the vocabulary's term lines read");
  ok(L.load() === L.load(), "load() is cached for the process");
  const before = L.load();
  ok(L.load({ fresh: true }) !== before, "load({ fresh: true }) reads again");
}

/* ---- tables read by their headers ---------------------------------------------------------------- */
{
  const d = fixture(list({ s1Header: "| Aliases | Allowed when | Name | What it is |",
    s1Rows: ["| **widgeteer** | never | **Widgeteer** | A role. |", "| **qx** | its step | **Qx** | Barred as an agent's name only. |"] }));
  const X = L.load(opts(d));
  ok(X.internalNames.roles[0].name === "Widgeteer" && X.internalNames.roles[0].aliases[0] === "widgeteer" && X.internalNames.roles[0].strength === "never", "section 1 read by its header names, the columns in another order");
  ok(X.internalNames.roles[1].strength === "agent", "an agent's-name-only row read as agent");
}
{
  const X = L.load(opts(fixture(list())));
  ok(X.internalNames.roles[2].strength === "other", "a row allowed in any other case bars nothing (strength other)");
  ok(X.internalNames.roles.every(r => r.sayInstead === null), "no wording column: every wording null");
  const f = X.internalNames.approval.map(r => r.form);
  ok(f[0] && f[0].anchor === "user's" && f[0].between === true && !f[0].after && f[0].words.join() === "nod,wink", "a form after \"user's\", one word between allowed", JSON.stringify(f[0]));
  ok(f[1] && f[1].anchor === "user" && f[1].between === false && !f[1].after && f[1].words.join() === "nodded,winked", "a form directly after \"user\"", JSON.stringify(f[1]));
  ok(f[2] === null, "a row that names no form has none");
  ok(f[3] && f[3].anchor === "by the user" && f[3].after === true && f[3].words.join() === "nodded,winked", "a form before \"by the user\"", JSON.stringify(f[3]));
  ok(X.internalNames.grades[0].words.join("|") === "size 3", "section 3: a quote inside parentheses is no word of the row", JSON.stringify(X.internalNames.grades[0].words));
  ok(X.internalNames.grades[1].words.join("|") === "the size|size|sizes|sized|re-size", "section 3: the term and the quoted words of the row", JSON.stringify(X.internalNames.grades[1].words));
}
{
  const d = fixture(list({ s1Header: "| Name | Aliases | What it is | Allowed when | Say instead |",
    s1Rows: ["| **Widgeteer** | **widgeteer** | A role. | never | the builder |", "| **Qx** | **qx** | Barred as an agent's name only. | its step | |"],
    s2Header: "| Term | What it is | Allowed when | Say instead |",
    s2Rows: ["| **\"user nods\"** | The user's nods. | never | the replies |"] }));
  const X = L.load(opts(d));
  ok(X.internalNames.roles[0].sayInstead === "the builder", "the wording column: a row's wording read");
  ok(X.internalNames.roles[1].sayInstead === null, "the wording column: an empty cell read as null");
  ok(X.internalNames.approval[0].sayInstead === "the replies", "the wording column in section 2");
  ok(X.internalNames.grades.every(r => r.sayInstead === null), "a section without the column: null");
}

/* ---- the markers of section 4 ------------------------------------------------------------------- */
const allowedTable = ["| Term | What it is |", "|---|---|", "| **\"fine\"** | A fine word. |"];
const withMarkers = rows => list({ s1Rows: ["| **Widgeteer** | **widgeteer**, **widget maker** | A role. | as section 4's markers say |",
  "| **Qx** | **qx** | A role. Barred as an agent's name only. | its step |"],
  s4: [...allowedTable, "", "### Markers", "", "| Word | Markers | In code form |", "|---|---|---|", ...rows] });
{
  const X = L.load(opts(fixture(withMarkers(["| **widgeteer** | `gear`, `two-part` | no find |", "| **size** | `shoe` | a find |"]))));
  const m = X.internalNames.markers;
  ok(m.length === 2 && m[0].word === "widgeteer" && m[0].markers.join() === "gear,two-part" && m[0].codeForm === true, "markers: a row's word, its markers in backticks, no find in code form", JSON.stringify(m[0]));
  ok(m[1].word === "size" && m[1].codeForm === false, "markers: a third-section word, a find in code form", JSON.stringify(m[1]));
  ok(X.internalNames.roles[0].strength === "never", "a row that points at the markers is barred (strength never)");
  ok(X.internalNames.allowed.length === 1, "section 4's first table is still the allowed words");
}
ok(L.load(opts(fixture(list()))).internalNames.markers.length === 0, "markers: a section 4 with no markers' table has none");
throwsList(() => L.load(opts(fixture(withMarkers(["| **gadget** | `gear` | no find |"])))), "markers: a word the list does not bar is an error with its line", /internal-names\.md:\d+: "gadget" is no name, phrase or word of sections 1 to 3/);
throwsList(() => L.load(opts(fixture(withMarkers(["| **widgeteer** | gear | no find |"])))), "markers: a row with no marker in backticks is an error", /"widgeteer" has no marker in backticks/);
throwsList(() => L.load(opts(fixture(withMarkers(["| **widgeteer** | `gear` | sometimes |"])))), "markers: an \"In code form\" cell of another kind is an error", /"sometimes" is neither "no find" nor "a find"/);
throwsList(() => L.load(opts(fixture(withMarkers(["| **widgeteer** | `gear` | no find |", "| **Widgeteer** | `cog` | a find |"])))), "markers: a word with two rows is an error", /"Widgeteer" has a second row of markers/);
throwsList(() => L.load(opts(fixture(withMarkers(["| widgeteer | `gear` | no find |"])))), "markers: a row with no bold word is an error", /a row of the markers has no bold word/);

/* ---- the term lines ------------------------------------------------------------------------------ */
{
  const t = L.parseTerms(["# V", "", "| Term | Meaning |", "|---|---|", "| **Card** | A card. |", "", "```", '{"name":"a rule line","code":"X","id":1}',
    '{"term":"Card","not":["Bubble","Blob"],"allow":["Bubble Chart"],"case":"any"}', '{"term":"Tile","not":["Box"]}', "```", ""].join("\n"), "v.md");
  ok(t.lines.length === 2 && t.lines[0].not.join() === "Bubble,Blob" && t.lines[0].allow.join() === "Bubble Chart" && t.lines[0].case === "any", "a term line with not, allow and case any");
  ok(t.lines[1].case === null && t.lines[1].allow.length === 0, "a term line with not only");
  ok(t.rows.length === 1 && t.rows[0].term === "Card", "a bold term row read");
}

/* ---- every unreadable case an error with its file and line --------------------------------------- */
throwsList(() => L.load(opts(path.join(dir, "missing"))), "a list that is missing: an error naming the file", /internal-names\.md: cannot be read/);
{
  const d = fixture(list({ s1Header: "| Name | Nicknames | What it is | Allowed when |" }));
  throwsList(() => L.load(opts(d)), "a table without its header's column: an error with the file and the header's line", /internal-names\.md:5: the table has no "Aliases" column/);
}
{
  const d = fixture(list().replace(/## 3\. The third[\s\S]*?(?=## 4\.)/, ""));
  throwsList(() => L.load(opts(d)), "a section missing: an error naming it", /section 3 \("## 3\."\) is missing/);
}
{
  const d = fixture(list().replace("| **Widgeteer** | **widgeteer**, **widget maker** |", "| Widgeteer | widgeteer |"));
  throwsList(() => L.load(opts(d)), "a row without its bold name: an error with its line", /internal-names\.md:7: a row of section 1/);
}
throwsList(() => L.parseTerms("```\n{\"term\":\"Card\",\"not\":[\"Bubble\"]}\n{not json\n```\n", path.join(dir, "v.md")), "a fenced line that is not JSON: an error with the file and line", /v\.md:3: a fenced line is not JSON/);
throwsList(() => L.parseTerms("```\n{\"term\":\"Card\",\"not\":[\"Bubble\"],\"case\":\"some\"}\n```\n", "v.md"), "a case that is not \"any\": an error", /v\.md:2: "case" of Card/);
{
  const base = fs.readFileSync(path.join(live, "finding.md"), "utf8");
  throwsList(() => L.parseFinding(base.replace(/\| Repository \| Path \| Read \|/, "| Repository | Where | Read |").replace(/\r\n/g, "\n"), "finding.md"), "the baseline's place table without its header: an error with its line", /finding\.md:\d+: the table has no "Path" column/);
  throwsList(() => L.parseFinding(base.replace("| `css` |", "| `cee-ess-ess` |").replace(/\r\n/g, "\n"), "finding.md"), "a form the tool does not read: an error with its line", /finding\.md:\d+: "`cee-ess-ess`" is no form/);
  throwsList(() => L.parseFinding(base.replace("| `docs/**` | whole |", "| `docs/**` | some |").replace(/\r\n/g, "\n"), "finding.md"), "a Read cell that is neither: an error with its line", /finding\.md:\d+: "some" is neither/);
  throwsList(() => L.parseFinding(base.replace(/"id":10050\}/, '"id":19999}').replace(/\r\n/g, "\n"), "finding.md"), "a rule of the baseline missing: an error", /finding\.md: the rule 10050 is missing/);
  const d = fixture(list(), { vocabulary: "```\n{bad\n```\n" });
  const X = L.load(opts(d));
  throwsList(() => L.termList(X, "vocabulary"), "a vocabulary that cannot be parsed: its error, thrown when the list is asked for", /vocabulary\.md:2: a fenced line is not JSON/);
  throwsList(() => L.termList(X, "boards"), "a glossary not found: an error, thrown when the list is asked for", /boards\.md .* is not found/);
}

/* ---- where the glossaries are found -------------------------------------------------------------- */
{
  const g = path.join(dir, "gloss"), pol = path.join(dir, "org", ".github"), ui = path.join(dir, "org", "SpartanUI", "docs", "nomenclature");
  fs.mkdirSync(g, { recursive: true }); fs.mkdirSync(path.join(pol, "policy", "nomenclature"), { recursive: true }); fs.mkdirSync(ui, { recursive: true });
  fs.writeFileSync(path.join(pol, "policy", "nomenclature", "boards.md"), "| Term | X |\n|---|---|\n| **Board** | b |\n");
  fs.writeFileSync(path.join(ui, "ui.md"), "| Term | X |\n|---|---|\n| **Card** | c |\n");
  fs.writeFileSync(path.join(g, "ui.md"), "a pointer, no term row\n");
  const deps = { env: { SPARTAN_ORG_POLICIES: pol }, readStored: () => null, home: path.join(dir, "nohome") };
  const P = L.glossaryPlaces(g, deps), F = L.glossaryFiles(g, deps);
  ok(P.ui[0] === path.join(g, "ui.md") && P.boards[1] === path.join(pol, "policy", "nomenclature", "boards.md"), "the given folder first, then the checkout the variable names");
  ok(F.ui === path.join(ui, "ui.md"), "a file with no term row is no glossary: the next place taken");
  ok(F.boards === path.join(pol, "policy", "nomenclature", "boards.md"), "boards.md found in the organization checkout");
  const F2 = L.glossaryFiles(null, { env: {}, readStored: k => k === "SPARTAN_ORG_POLICIES" ? pol : null, home: path.join(dir, "nohome") });
  ok(F2.boards === path.join(pol, "policy", "nomenclature", "boards.md"), "the stored user value read when the environment has none");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
