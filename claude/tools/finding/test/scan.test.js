#!/usr/bin/env node
// Tests for scan.js, the command, on a fixture checkout it builds itself: exit 0, 1 and 2; the line form
// and the JSON form; a pass; the file list on standard input and from a file; the wording, null without
// the list's column and the row's wording with it; the repository read from the checkout's origin.
//   node scan.test.js --dir <an empty scratch folder>
// It writes only under --dir.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

const i = process.argv.indexOf("--dir");
if (i < 0 || !process.argv[i + 1]) { console.error("usage: scan.test.js --dir <scratch folder>"); process.exit(2); }
const dir = path.resolve(process.argv[i + 1]);
fs.mkdirSync(dir, { recursive: true });
const tool = path.join(__dirname, ".."), script = path.join(tool, "scan.js");
const live = path.resolve(tool, "..", "..", "nomenclature");
const { load } = require(path.join(tool, "lists.js"));

let pass = 0, fail = 0;
function ok(cond, name, detail) { if (cond) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); } }
function run(args, input, at) {
  const r = cp.spawnSync(process.execPath, [at || script, ...args], { encoding: "utf8", input: input == null ? "" : input, windowsHide: true });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

/* the names the fixtures use, taken from the live list as read */
const L = load({ fresh: true });
const role = L.internalNames.roles.find(r => r.strength === "never" && r.aliases.some(a => /^[a-z]+$/.test(a)));
const name = role.aliases.find(a => /^[a-z]+$/.test(a));

/* a fixture checkout */
const co = path.join(dir, "checkout");
const put = (rel, text) => { const p = path.join(co, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
put("docs/clean.md", "# Clean\n\nNothing here.\n");
put("docs/find.md", `# A page\n\nThe ${name} wrote this line.\n`);
put("src/A.kt", `package a\n\n// a comment that names the ${name}\nval x = "${name}"\n`);
put("src/B.kt", "package a\n// a plain comment\nval y = 1\n");
put("logo.png", "\u0089PNG\u0000\u0001");
put("odd.qqq", "anything\n");
const REPO = ["--root", co, "--repo", "SomeOwner/some-repo"];

/* ---- exit codes ------------------------------------------------------------------------------------ */
{
  const r = run([...REPO, "docs/clean.md", "src/B.kt"]);
  ok(r.code === 0 && r.out === "" && /read 2 files, skipped 0, 0 finds, 0 passed/.test(r.err), "exit 0: no find", JSON.stringify(r));
  const s = run([...REPO, "docs/find.md", "src/A.kt", "docs/clean.md"]);
  ok(s.code === 1, "exit 1: a find", JSON.stringify(s));
  const lines = s.out.trim().split("\n");
  ok(lines.length === 2, "one line per find, a string in code not read", s.out);
  const re = new RegExp(`^docs/find\\.md:3:5  "The ${name} wrote this line\\."  ${name} \\(internal-names §1: ${role.name}\\)  no wording$`);
  ok(re.test(lines[0]), "the line form: file, line, column, the line's text, the hit, list and entry, no wording", lines[0]);
  ok(/^src\/A\.kt:3:/.test(lines[1]), "finds sorted by file and line", s.out);
  ok(/read 3 files, skipped 0, 2 finds, 0 passed/.test(s.err), "the counts on standard error", s.err);
  ok(run([...REPO, "docs/find.md"]).out === run([...REPO, "docs/find.md"]).out, "the same files and lists give the same output");
  put("docs/ctl.md", `a control \u0001 character and the ${name}\n`);
  const c = run([...REPO, "docs/ctl.md"]);
  ok(c.code === 1 && c.out.includes("a control \\u0001 character") && !c.out.includes("\u0001"), "a control character in the line's text printed as its code", JSON.stringify(c.out));
}
{
  const r = run([...REPO, "logo.png", "odd.qqq", "docs/clean.md"]);
  ok(r.code === 0 && /skipped logo\.png: binary/.test(r.err) && /skipped odd\.qqq: a file of no kind/.test(r.err) && /read 1 file, skipped 2/.test(r.err), "a binary file and a file of no kind: skipped, listed with why", r.err);
}
const two = (args, why, re, input) => { const r = run(args, input); ok(r.code === 2 && r.out === "" && re.test(r.err), `exit 2: ${why}`, JSON.stringify(r)); };
two([...REPO, "docs/missing.md"], "a file given that does not exist", /docs\/missing\.md cannot be read \(it does not exist\)/);
two([...REPO, "--bogus"], "an unknown option", /unknown option --bogus/);
two([...REPO, "--list", "nonsense", "docs/clean.md"], "an unknown list", /--list is/);
two([...REPO, "--pass", "nothing", "docs/clean.md"], "a pass that is not file:line:text", /--pass is/);
two([...REPO], "no file given", /no file given/);
two([...REPO, path.join(dir, "elsewhere.md")], "a file outside the root", /is not inside the root/);
two(["--root", co, "docs/clean.md"], "no repository: no origin and no --repo", /give --repo/);
two(["--root", path.join(dir, "nofolder"), "--repo", "a/b", "x.md"], "a root that is no folder", /is not a folder/);

/* ---- the JSON form, a pass ------------------------------------------------------------------------- */
{
  const r = run([...REPO, "--json", "docs/find.md"]);
  const a = JSON.parse(r.out);
  ok(r.code === 1 && a.length === 1 && ["file", "line", "column", "text", "hit", "list", "entry", "sayInstead", "passed"].every(k => k in a[0]), "--json: one array, each find with its fields", r.out);
  ok(a[0].sayInstead === null && a[0].passed === false && a[0].file === "docs/find.md" && a[0].line === 3, "--json: no wording is null", JSON.stringify(a[0]));
  const p = run([...REPO, "--pass", `docs/find.md:3:The ${name} wrote this line.`, "docs/find.md"]);
  ok(p.code === 0 && /passed$/.test(p.out.trim()) && /0 finds, 1 passed/.test(p.err), "--pass by the line's text: printed as passed, not counted", JSON.stringify(p));
  const q = run([...REPO, "--pass", `docs/find.md:3:${name}`, "docs/find.md", "src/A.kt"]);
  ok(q.code === 1 && /1 find, 1 passed/.test(q.err), "--pass by the hit: that find passed, another still counted", q.err);
  const w = run([...REPO, "--pass", `docs/find.md:2:${name}`, "docs/find.md"]);
  ok(w.code === 1, "--pass on another line passes nothing");
  const j = JSON.parse(run([...REPO, "--json", "--pass", `docs/find.md:3:${name}`, "docs/find.md"]).out);
  ok(j[0].passed === true, "--json: a passed find marked");
}

/* ---- the file list --------------------------------------------------------------------------------- */
{
  const r = run([...REPO, "--files-from", "-"], "docs/find.md\nsrc/B.kt\n\n");
  ok(r.code === 1 && /read 2 files/.test(r.err), "--files-from -: the files on standard input", JSON.stringify(r));
  const e = run([...REPO, "--files-from", "-"], "");
  ok(e.code === 0 && /read 0 files/.test(e.err), "--files-from - with no file: nothing to read, exit 0");
  const lf = path.join(dir, "list.txt"); fs.writeFileSync(lf, "docs/clean.md\r\nsrc/A.kt\r\n");
  const f = run([...REPO, "--files-from", lf, "docs/find.md"]);
  ok(f.code === 1 && /read 3 files/.test(f.err), "--files-from a file, and files as arguments beside it", f.err);
  const a = run([...REPO, path.join(co, "docs", "find.md"), "docs\\find.md", "./docs/find.md"]);
  ok(a.code === 1 && /read 1 file,/.test(a.err) && /^docs\/find\.md:3:/.test(a.out), "an absolute path inside the root, a backslash and ./ read as one file", JSON.stringify(a));
}

/* ---- the repository from the checkout's origin ----------------------------------------------------- */
{
  const g = path.join(dir, "org");
  fs.mkdirSync(path.join(g, "claude"), { recursive: true });
  fs.writeFileSync(path.join(g, "claude", "x.md"), `the ${name}\n`);
  fs.writeFileSync(path.join(g, "README.md"), `the ${name}\n`);
  cp.execFileSync("git", ["init", "-q", g], { stdio: "ignore" });
  cp.execFileSync("git", ["-C", g, "config", "remote.origin.url", "https://github.com/SpartanLaboratories/.github.git"], { stdio: "ignore" });
  const r = run(["--root", g, "claude/x.md", "README.md"]);
  ok(r.code === 1 && /skipped claude\/x\.md: not read/.test(r.err) && /^README\.md:1:/.test(r.out), "the repository read from origin: the organization repository's rows applied", JSON.stringify(r));
}

/* ---- the lists: unreadable, and a wording from the list's column ------------------------------------ */
function toolCopy(tag, internal) {
  const base = path.join(dir, tag), t = path.join(base, "tools", "finding"), n = path.join(base, "nomenclature");
  fs.mkdirSync(t, { recursive: true }); fs.mkdirSync(n, { recursive: true });
  ["lists.js", "match.js", "files.js", "scan.js"].forEach(f => fs.copyFileSync(path.join(tool, f), path.join(t, f)));
  fs.writeFileSync(path.join(n, "internal-names.md"), internal);
  fs.writeFileSync(path.join(n, "finding.md"), fs.readFileSync(path.join(live, "finding.md"), "utf8"));
  return path.join(t, "scan.js");
}
{
  const liveText = fs.readFileSync(path.join(live, "internal-names.md"), "utf8").replace(/\r\n/g, "\n");
  const broken = toolCopy("broken", liveText.replace("| Name | Aliases |", "| Name | Nicknames |"));
  const r = run([...REPO, "docs/clean.md"], "", broken);
  ok(r.code === 2 && /a list cannot be read: .*internal-names\.md:\d+: the table has no "Aliases" column/.test(r.err), "exit 2: a list that cannot be parsed, naming its file and line", JSON.stringify(r));
  const withSay = toolCopy("say", liveText
    .replace("| Name | Aliases | What it is | Allowed when |\n|------|---------|------------|--------------|", "| Name | Aliases | What it is | Allowed when | Say instead |\n|---|---|---|---|---|")
    .replace(new RegExp(`(\\| \\*\\*${role.name}\\*\\* \\|[^\\n]*\\| never \\|)`), "$1 the fixture wording |"));
  const s = run([...REPO, "docs/find.md"], "", withSay);
  ok(s.code === 1 && /say instead: "the fixture wording"$/.test(s.out.trim()), "the row's wording printed when the list has its column", JSON.stringify(s));
  const j = JSON.parse(run([...REPO, "--json", "docs/find.md"], "", withSay).out);
  ok(j[0].sayInstead === "the fixture wording", "--json: the row's wording");
}

/* ---- usage ----------------------------------------------------------------------------------------- */
{
  const r = run(["--help"]);
  ok(r.code === 0 && /^usage: node scan\.js/.test(r.out) && /Exit codes/.test(r.out), "--help: the usage, exit 0");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
