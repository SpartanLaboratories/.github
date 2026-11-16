#!/usr/bin/env node
// The command: reads the files given as the baseline's "What the commit scan reads" says and prints each
// find with the wording to say instead. Usage: its --help. It writes nothing and reads no network.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { load } = require("./lists.js");
const { finds } = require("./match.js");
const { readFor, position, norm } = require("./files.js");

const USAGE = `usage: node scan.js [--root <dir>] [--repo <owner/name>] [--list <name> ...] [--json]
                    [--pass <file>:<line>:<text> ...] [--files-from <file> | -] [<file> ...]

Reads each file given as the baseline's "What the commit scan reads" says (a document or a board
whole, a source file's comments, nothing of another file) and prints every word the lists bar.

  --root <dir>         the checkout the files are in (default: the current folder); a file is a
                       path relative to it, or an absolute path inside it
  --repo <owner/name>  the repository, which decides the rows of the baseline that name one
                       (default: read from the checkout's origin; a checkout with none needs it)
  --list <name>        a list to find, repeatable: internal-names (the default), vocabulary,
                       boards, ui
  --files-from <file>  the files, one to a line, from a file, or "-" for standard input; files may
                       also follow as arguments. Give the files added or changed, never a deleted one.
  --pass <file>:<line>:<text>
                       a find passed for this request: the find on that file and line whose text
                       the pass holds, the pass's text standing in the line. Printed as passed and
                       not counted.
  --json               one JSON array of { file, line, column, text, hit, list, entry, sayInstead,
                       passed } on standard output
  --help               this text

Each find is one line on standard output:
  <file>:<line>:<column>  "<the line's text>"  <hit> (<list>: <entry>)  say instead: "<wording>"
with "no wording" where the list has none. Standard error lists each file skipped and why, then
the count of files read and skipped, finds and passes.

Exit codes: 0 no find (passes do not count); 1 one find or more; 2 the scan could not run (a bad
argument, a list or the baseline that cannot be read or parsed, a file given that does not exist or
cannot be read): its message names the cause, and nothing it found is to be trusted.`;

class Usage extends Error {}
function parseArgs(argv) {
  const a = { root: null, repo: null, lists: [], json: false, pass: [], filesFrom: null, files: [], help: false };
  const need = (i, flag) => { if (i + 1 >= argv.length || /^--/.test(argv[i + 1]) && argv[i + 1] !== "-") throw new Usage(`${flag} needs a value`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--help" || x === "-h") a.help = true;
    else if (x === "--root") { a.root = need(i, x); i++; }
    else if (x === "--repo") { a.repo = need(i, x); i++; if (!/^[\w.-]+\/[\w.-]+$/.test(a.repo)) throw new Usage(`--repo is <owner/name>: ${a.repo}`); }
    else if (x === "--list") { const v = need(i, x); i++; if (!["internal-names", "vocabulary", "boards", "ui"].includes(v)) throw new Usage(`--list is internal-names, vocabulary, boards or ui: ${v}`); a.lists.push(v); }
    else if (x === "--json") a.json = true;
    else if (x === "--pass") { const v = need(i, x); i++; const m = /^(.+?):(\d+):([\s\S]+)$/.exec(v); if (!m) throw new Usage(`--pass is <file>:<line>:<text>: ${v}`); a.pass.push({ file: norm(m[1]), line: Number(m[2]), text: m[3] }); }
    else if (x === "--files-from") { a.filesFrom = need(i, x); i++; }
    else if (/^--/.test(x)) throw new Usage(`unknown option ${x}`);
    else a.files.push(x);
  }
  if (!a.lists.length) a.lists = ["internal-names"];
  return a;
}
/* owner/name from the checkout's origin, or null */
function originRepo(root) {
  try {
    const url = cp.execFileSync("git", ["-C", root, "config", "--get", "remote.origin.url"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true }).trim();
    const m = /github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(url);
    return m ? `${m[1]}/${m[2]}` : null;
  } catch (e) { return null; }
}
/* a file given, as a path relative to the root with forward slashes; one outside the root is an error */
function relative(root, f) {
  const abs = path.resolve(root, f.trim()), rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Usage(`${f} is not inside the root ${root}`);
  return norm(rel);
}
/* the line's text as printed: trimmed, up to 160 characters, a control character written as its \u code */
const clip = s => { const t = s.trim(); return (t.length > 160 ? t.slice(0, 160) : t).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`); };

function main(argv, io) {
  let a;
  try { a = parseArgs(argv); } catch (e) { io.err(`scan: ${e.message}\n${USAGE.split("\n")[0]}`); return 2; }
  if (a.help) { io.out(USAGE); return 0; }
  const root = path.resolve(a.root || process.cwd());
  try { if (!fs.statSync(root).isDirectory()) throw new Error(); } catch (e) { io.err(`scan: the root ${root} is not a folder`); return 2; }
  const repo = a.repo || originRepo(root);
  if (!repo) { io.err(`scan: the repository is not known (the checkout has no origin on GitHub): give --repo <owner/name>`); return 2; }
  let given = a.files.slice();
  if (a.filesFrom) {
    let t;
    try { t = a.filesFrom === "-" ? io.stdin() : fs.readFileSync(path.resolve(a.filesFrom), "utf8"); }
    catch (e) { io.err(`scan: the file list ${a.filesFrom} cannot be read (${e.code || e.message})`); return 2; }
    given = given.concat(t.split(/\r?\n/).filter(l => l.trim()));
  } else if (!given.length) { io.err(`scan: no file given: name the files, or --files-from <file> | -\n${USAGE.split("\n")[0]}`); return 2; }
  let files;
  try { files = [...new Set(given.map(f => relative(root, f)))].sort(); } catch (e) { io.err(`scan: ${e.message}`); return 2; }
  let L;
  try { L = load(); } catch (e) { io.err(`scan: a list cannot be read: ${e.message}`); return 2; }
  if (a.lists.some(l => l !== "internal-names")) {
    for (const l of a.lists.filter(x => x !== "internal-names")) { const t = L.terms[l]; if (t && t.error) { io.err(`scan: a list cannot be read: ${t.error.message}`); return 2; } }
  }
  const found = [], skipped = []; let read = 0;
  for (const f of files) {
    let r;
    try { r = readFor(root, f, repo, L); } catch (e) { io.err(`scan: ${f} cannot be read (${e.code === "ENOENT" ? "it does not exist" : e.code || e.message})`); return 2; }
    if (r.skip) { skipped.push([f, r.skip]); continue; }
    read++;
    let lines = null;
    const lineText = n => { if (!lines) lines = fs.readFileSync(path.join(root, f), "utf8").replace(/^﻿/, "").split(/\r?\n/); return lines[n - 1] || ""; };
    for (const seg of r.segments) {
      let fs_;
      try { fs_ = finds(seg.text, { loaded: L, lists: a.lists }); } catch (e) { io.err(`scan: a list cannot be read: ${e.message}`); return 2; }
      for (const x of fs_) {
        const at = position(seg, x.index), text = lineText(at.line);
        const passed = a.pass.some(p => p.file === f && p.line === at.line && text.includes(p.text) && p.text.toLowerCase().includes(x.hit.replace(/\s+/g, " ").toLowerCase()));
        found.push({ file: f, line: at.line, column: at.column, text: clip(text), hit: x.hit.replace(/\s+/g, " "), list: x.list, entry: x.entry, sayInstead: x.sayInstead == null ? null : x.sayInstead, passed });
      }
    }
  }
  found.sort((p, q) => (p.file < q.file ? -1 : p.file > q.file ? 1 : 0) || p.line - q.line || p.column - q.column);
  skipped.forEach(([f, why]) => io.err(`skipped ${f}: ${why}`));
  const passes = found.filter(x => x.passed).length, count = found.length - passes;
  if (a.json) io.out(JSON.stringify(found, null, 2));
  else found.forEach(x => io.out(`${x.file}:${x.line}:${x.column}  "${x.text}"  ${x.hit} (${x.list}: ${x.entry})  ${x.sayInstead == null ? "no wording" : `say instead: "${x.sayInstead}"`}${x.passed ? "  passed" : ""}`));
  io.err(`read ${read} file${read === 1 ? "" : "s"}, skipped ${skipped.length}, ${count} find${count === 1 ? "" : "s"}, ${passes} passed`);
  return count ? 1 : 0;
}

if (require.main === module) {
  const out = [], err = [];
  const code = main(process.argv.slice(2), { out: s => out.push(s), err: s => err.push(s), stdin: () => fs.readFileSync(0, "utf8") });
  if (out.length) process.stdout.write(out.join("\n") + "\n");
  if (err.length) process.stderr.write(err.join("\n") + "\n");
  process.exitCode = code;
}
module.exports = { main, parseArgs, USAGE };
