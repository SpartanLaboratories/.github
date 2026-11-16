#!/usr/bin/env node
// Tests for files.js: each rule of what the commit scan reads with a file it reads and one it does not,
// in an ordinary repository and in the organization repository; each comment form with its lines kept;
// a string and an identifier in code not read; a binary file and a file of no kind skipped; a term
// wrapped across two lines found.
//   node files.test.js --dir <an empty scratch folder>
// It writes only under --dir.
"use strict";
const fs = require("fs"), path = require("path");

const i = process.argv.indexOf("--dir");
if (i < 0 || !process.argv[i + 1]) { console.error("usage: files.test.js --dir <scratch folder>"); process.exit(2); }
const dir = path.resolve(process.argv[i + 1]);
fs.mkdirSync(dir, { recursive: true });
const { load } = require(path.join(__dirname, "..", "lists.js"));
const F = require(path.join(__dirname, "..", "files.js"));
const M = require(path.join(__dirname, "..", "match.js"));

let pass = 0, fail = 0;
function ok(cond, name, detail) { if (cond) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); } }
const LIVE = load({ fresh: true });
const ORG = "SpartanLaboratories/.github", PLAIN = "SomeOwner/some-repo";
const kind = (p, r) => F.kindOf(p, r || PLAIN, LIVE);
const isText = (p, r) => kind(p, r) === "text";
const form = (p, r) => { const k = kind(p, r); return k && k.comments || null; };
const skipped = (p, r) => { const k = kind(p, r); return !!(k && k.skip); };

/* ---- what is read, by repository and path ------------------------------------------------------- */
ok(isText("docs/plans/12-x/board.json") && isText("docs/dashboards/index.html") && isText("docs/a.txt"), "everything under docs/ read whole, a board's data and page among it");
ok(isText("README.md") && isText("server/README.md") && isText("CHANGELOG.md") && isText("CONTRIBUTING.md"), "every Markdown file read whole, at any depth");
ok(isText(".github/ISSUE_TEMPLATE/bug_report.yml") && isText(".github/pull_request_template.md"), "the issue templates and the community health files read whole");
ok(form(".github/workflows/ci.yml") === "hash", "a workflow is no issue template: its comments only");
ok(skipped("src/main/resources/data.json") && skipped("notes.txt"), "a data file outside docs/ not read");
ok(skipped("claude/agents/x.md", ORG) && isText("claude/agents/x.md", PLAIN), "Markdown under claude/ not read in the organization repository only");
["claude/skills/a/b.js", "claude/admin-team/launch.cmd", "claude/x/run.sh", "claude/hooks/h.py", "claude/skills/d/plan/examples/1-x/dashboard.html", "claude/a.css",
  "claude/settings.json", "claude/x/notes.txt", "claude/x/odd.qqq", "claude/docs/a.txt", "claude/x/.github/ISSUE_TEMPLATE/b.yml", "CLAUDE/X/Y.JS"]
  .forEach(p => ok(/^not read \(claude\/\*\*\)$/.test((kind(p, ORG) || {}).skip || ""), `the organization repository: ${p} not read, whatever its kind`, JSON.stringify(kind(p, ORG))));
ok(form("claude/skills/a/b.js") === "c" && form("claude/admin-team/launch.cmd") === "batch" && form("claude/x/run.sh") === "hash" && isText("claude/x/README.md") && isText("x/claude/y.md", ORG),
  "a claude/ folder of another repository, or one below the organization repository's root: read by its kind");
ok(form("scripts/rule-check.js", ORG) === "c" && form("x/claude/y.js", ORG) === "c" && form(".github/workflows/ci.yml", ORG) === "hash" && skipped("claudex/y.js", ORG) === false,
  "the organization repository outside claude/: code files' comments read as before");
ok(isText("policy/build/rules.json", ORG) && isText("design/x/y.txt", ORG), "every file of the Policy and Design folders read whole in the organization repository");
ok(skipped("policy/build/rules.json", PLAIN) && skipped("design/x/y.txt", PLAIN), "a policy or design folder of another repository: by its kind");
ok(isText("Structure.md", ORG) && isText("scripts/INDEX.md", ORG) && isText("profile/README.md", ORG) && isText("rule-index.md", ORG), "the organization repository's Markdown outside claude/ read whole");
ok(form("scripts/rule-check.js", ORG) === "c" && skipped("rule-files.json", ORG), "the organization repository's scripts: comments; its JSON: not read");
ok(isText("DOCS/X.MD"), "a path matched in any case");

/* ---- the source kinds --------------------------------------------------------------------------- */
const want = { "a/B.kt": "c-nested", "build.gradle.kts": "c-nested", "A.java": "c", "x.js": "c", "x.mjs": "c", "w.dsl": "c", "s.css": "css",
  "website/index.html": "html", "pom.xml": "markup", "icon.svg": "markup", "Writerside/c.list": "markup", "Writerside/writerside.cfg": "markup",
  "run.py": "hash", "deploy.sh": "hash", "a.yml": "hash", "a.yaml": "hash", "libs.versions.toml": "hash", "gradlew": "hash",
  ".gitignore": "hash-line", "sub/.gitignore": "hash-line", ".gitattributes": "hash-line", ".dockerignore": "hash-line", "Dockerfile": "hash-line", "CODEOWNERS": "hash-line", "deploy/x.service": "hash-line",
  "gradle.properties": "properties", ".settings/org.eclipse.jdt.core.prefs": "properties", ".editorconfig": "ini", "api.http": "http",
  "gradlew.bat": "batch", "launch.cmd": "batch", "q.sql": "dash" };
Object.entries(want).forEach(([p, f]) => ok(form(p) === f, `${p}: the form ${f}`, JSON.stringify(kind(p))));
ok(skipped("LICENSE") && skipped("NOTICE") && skipped("a.api") && skipped("key.pem"), "a licence, a generated API dump and a key: not read");
ok(/no kind/.test((kind("odd.qqq") || {}).skip || "") && /no kind/.test((kind("Makefile2") || {}).skip || ""), "a file of no kind the baseline names: skipped, saying so");

/* ---- the comment forms, their lines kept -------------------------------------------------------- */
const segs = (p, text) => F.segments(p, text, kind(p));
const texts = (p, text) => segs(p, text).map(s => s.text);
const at = (p, text, needle) => { for (const s of segs(p, text)) { const k = s.text.indexOf(needle); if (k >= 0) return F.position(s, k); } return null; };
{
  const kt = [
    "package a",                                  // 1
    "// first line comment",                      // 2
    "// second line comment",                     // 3
    "val s = \"in a // string\" // trailing one",   // 4
    "/**",                                         // 5
    " * KDoc body word",                           // 6
    " */",                                         // 7
    "val c = '\"'",                                // 8
    "/* outer /* inner */ still outer */",         // 9
    "val t = \"${f(\"// not\")} after\" // real",  // 10
    "val r = \"\"\"",                              // 11
    "  raw // text",                               // 12
    "\"\"\" // after raw",                         // 13
  ].join("\n");
  const T = texts("a/B.kt", kt);
  ok(T[0] === " first line comment\n second line comment\n trailing one", "kt: line comments on lines one after another are one text, a trailing one among them", JSON.stringify(T));
  ok(!T.some(t => /in a/.test(t)), "kt: a // inside a string is code; the comment after it read");
  ok(T.some(t => /^ ?KDoc body word/m.test(t)) && !T.some(t => /\* KDoc/.test(t)), "kt: KDoc read, its leading * no text", JSON.stringify(T));
  ok(T.some(t => /still outer/.test(t)), "kt: a block inside a block nests");
  ok(!T.some(t => /not"/.test(t) || /^\/\/ not/.test(t)) && T.some(t => t === " real"), "kt: a template's string is code", JSON.stringify(T));
  ok(!T.some(t => /raw \/\/ text|raw/.test(t) && !/after raw/.test(t)) && T.some(t => /after raw/.test(t)), "kt: a raw string is code", JSON.stringify(T));
  const p = at("a/B.kt", kt, "KDoc body");
  ok(p && p.line === 6 && p.column === 4, "kt: a KDoc word's line and column kept", JSON.stringify(p));
  const q = at("a/B.kt", kt, "second");
  ok(q && q.line === 3 && q.column === 4, "kt: a joined line comment's line and column kept", JSON.stringify(q));
  ok(!texts("a/B.kt", "val planner = Planner()\nfun call(executor: X) {}\n").length, "kt: identifiers are not read");
}
{
  const js = ["const re = /\\/\\*/g; // after regex", "const d = a / b / c; // division", "const t = `x // ${y /* in expr */} z`;", "/* block */"].join("\n");
  const T = texts("x.js", js);
  ok(T.some(t => / after regex/.test(t)), "js: a regular expression is code, the comment after it read", JSON.stringify(T));
  ok(T.some(t => / division/.test(t)), "js: a division is no regular expression");
  ok(!T.some(t => /^ ?z/.test(t) || /x \/\//.test(t)) && T.some(t => / in expr /.test(t)), "js: a template is code, a comment in its expression read", JSON.stringify(T));
  ok(T.some(t => / block /.test(t)), "js: a block comment read");
  const J = texts("A.java", "String s = \"/* no */\"; /* yes */\n// line\n");
  ok(J.length === 2 && / yes /.test(J[0]), "java: a block marker inside a string is code", JSON.stringify(J));
}
{
  ok(texts("s.css", "a { content: \"/* no */\"; } /* yes */").join() === " yes ", "css: a block comment read, one inside a string not");
  const html = ["<!-- page note -->", "<p>shown text</p>", "<script>", "// script note", "var s = '<!-- no -->';", "</script>",
    '<script type="application/json">{"a":"// no"}</script>', "<style>/* style note */ p{}</style>"].join("\n");
  const T = texts("website/index.html", html);
  ok(T.some(t => / page note /.test(t)) && T.some(t => / script note/.test(t)) && T.some(t => / style note /.test(t)), "html: its comments, a script's and a style's", JSON.stringify(T));
  ok(!T.some(t => /shown text|"\/\/ no|<!-- no/.test(t)) && !T.some(t => / no /.test(t)), "html: its text, a script's string and a data script not read", JSON.stringify(T));
  const p = at("website/index.html", html, "script note");
  ok(p && p.line === 4 && p.column === 4, "html: a script comment's line kept", JSON.stringify(p));
  const X = texts("pom.xml", "<a>text</a>\n<!-- one\n two -->\n");
  ok(X.length === 1 && X[0] === " one\n two ", "xml: a comment over two lines is one text", JSON.stringify(X));
}
{
  const y = ["name: \"a # not\" # yes one", "url: http://x.example/#frag", "say: don't # yes two", "# yes three", "  key: 'q # no'"].join("\n");
  const T = texts("a.yml", y).join("\n");
  ok(/yes one/.test(T) && /yes two/.test(T) && /yes three/.test(T), "hash: comments after a space, at a line's start, past an apostrophe in a word", T);
  ok(!/not|frag|no'/.test(T), "hash: a # in a quoted string or a URL is no comment", T);
  ok(texts(".gitignore", "# yes\nbuild/ # no\n").join() === " yes", "hash-line: a whole line only");
  ok(texts("gradle.properties", "# one\n! two\nkey=v#no\n").join("|") === " one\n two", "properties: # and !");
  ok(texts(".editorconfig", "; one\n# two\n[*]\n").join("|") === " one\n two", "ini: ; and #");
  ok(texts("api.http", "### Name\n// two\nGET http://x/#a\n").join("|") === "## Name\n two", "http: # and //");
  const B = texts("launch.cmd", "@echo off\nrem one\n@REM two\n:: three\necho rem no\nremark no\n");
  ok(B.join("|") === " one\n two\n three", "batch: REM, @REM and ::, and no word that starts with rem", JSON.stringify(B));
  ok(texts("q.sql", "select '--no' from t -- yes\n").join() === " yes", "dash: -- outside a quoted string");
}

/* ---- a binary file, a whole text, every line, a wrapped term -------------------------------------- */
{
  const root = path.join(dir, "repo"); fs.mkdirSync(path.join(root, "docs"), { recursive: true }); fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "img.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]));
  ok(F.isBinary(Buffer.from([1, 0, 2])) && !F.isBinary(Buffer.from("text")), "a NUL byte in the first 8 KB is binary");
  const r = F.readFor(root, "docs/img.png", PLAIN, LIVE);
  ok(r.skip === "binary", "a binary file is not read, under docs/ too", JSON.stringify(r));
  const multi = LIVE.internalNames.roles.filter(x => x.strength === "never").flatMap(x => x.aliases).find(a => / /.test(a));
  const [w1, ...rest] = multi.split(" ");
  const lines = Array.from({ length: 300 }, (_, k) => `line ${k + 1} of plain text`);
  lines.push(`the last line names ${w1}`, `${rest.join(" ")} across the break`);
  fs.writeFileSync(path.join(root, "docs", "long.md"), lines.join("\n") + "\n");
  const d = F.readFor(root, "docs/long.md", PLAIN, LIVE), f = M.finds(d.segments[0].text, { loaded: LIVE });
  ok(d.kind === "text" && f.length === 1 && F.position(d.segments[0], f[0].index).line === 301, "every line of a document read, a term wrapped across two lines found on its first line", JSON.stringify(f));
  fs.writeFileSync(path.join(root, "src", "A.kt"), `// a comment that ends with ${w1}\n// ${rest.join(" ")} on the next line\nval x = 1\n`);
  const k = F.readFor(root, "src/A.kt", PLAIN, LIVE), g = M.finds(k.segments[0].text, { loaded: LIVE });
  ok(g.length === 1 && F.position(k.segments[0], g[0].index).line === 1, "a term wrapped across two comment lines found", JSON.stringify(g));
  fs.writeFileSync(path.join(root, "src", "B.kt"), `val s = "${multi}"\nval ${w1}Thing = 1\n`);
  ok(F.readFor(root, "src/B.kt", PLAIN, LIVE).segments.length === 0, "a string and an identifier in code are not read");
  fs.writeFileSync(path.join(root, "x.qqq"), "anything");
  ok(/no kind/.test(F.readFor(root, "x.qqq", PLAIN, LIVE).skip), "a file of no kind: skipped with why");
  fs.writeFileSync(path.join(root, "bom.md"), "﻿text\r\nmore\r\n");
  const b = F.readFor(root, "bom.md", PLAIN, LIVE);
  ok(b.segments[0].text.startsWith("text") && F.position(b.segments[0], b.segments[0].text.indexOf("more")).line === 2, "a byte-order mark and CRLF line ends: lines kept");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
