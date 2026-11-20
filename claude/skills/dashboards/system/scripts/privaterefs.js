// The organizations' private repositories, which no board, no Whiteboard's generated part, no published copy and no ideas file names
// (plan/RULES.md §1, "Private repositories"; §10). Not a command: every board writer, both checkers and the companions' scripts take it.
//   privatesOf([owners])        the private repositories of the organizations (owner/name, a Set), read from GitHub (`gh repo list` for each
//                               owner, the organizations of plan/template/org-board.repositories.json by default; DASHBOARDS_GH names another gh
//                               command, as org-board.js reads it) and cached on this machine only, outside every mirrored path, in
//                               ~/.claude/cache/dashboards/private-repositories.json (DASHBOARDS_PRIVATES_CACHE names another file). A cache read
//                               less than FRESH_MS ago is used as it stands; an older one, or none, is read again from GitHub and written back. Where
//                               GitHub cannot be read, an older cache is used and said on stderr; with none, it throws, and the writer writes nothing.
//                               DASHBOARDS_PRIVATES names a fixture list instead (a JSON list of owner/name, or { "private": [...] }), read alone:
//                               the verification uses it, and with DASHBOARDS_VERIFY=1 and neither a fixture nor a stand-in gh nothing is read from
//                               GitHub or from this machine's cache: it throws, saying why.
//   remember(set, owners)       writes the cache from a reading made elsewhere (org-board.js lists every repository at each generation)
//   elidePrivate(text, set)     a quoted text with each private repository's name cut to "…": { text, n }
//   privateRefs(text, set)      the private repositories a text names: [owner/name]
//   elideAll(value, set, seen)  every string of a value elided (the org work board, whose sources are other repositories' data)
//   isQuoted(kind, at)          a path a board quotes: an issue's title (levelrefs.js TITLE_PATHS) or a statement's excerpt
//   guardData(data, kind, set, skip)   a board's data: each quoted text elided in place, every other text that names one listed
//   refsIn(data, set)           every text of a board's data that names one: [{ at, keys }]
//   guardBoard(data, kind, where)      guardData() with privatesOf(): throws, nothing to be written, where a text other than a quotation names one;
//                               returns the lines of what it elided. While a sweep of this rule is in its warning stage (sweeplib.js; GUIDANCE.md §11,
//                               "A rule that can fail boards"), a text the sweep lists as already on a board is warned, a line returned, and only a
//                               text newly written throws
//   keptLine(where, list)       the warning's line for texts a sweep keeps
//   pageRefs(text, set)         each line of a page's own text (its data blocks emptied, sweeplib.js stripBlocks()) that names one: [{ line, keys, h }]
//   sweepFind / sweepFix / sweepPage   this rule's finder for a sweep (sweeplib.js RULES, "private-repositories"): every text of a board's data that
//                               names one, a quotation marked quoted (the writers cut it to "…"); the quotations cut in place; the page's own lines
// What names a repository: its owner/name and its name#n wherever they stand, a JSON value that is its name under a repo, repository or name
// key, and on its own a name in CamelCase (a CamelCase name with a suffix, such as SomeTool-old, counts as well) or a name in lower case with
// hyphens (some-tool, some-tool-old; the user's decision q-412, 2a). A name that is a plain word (a repository named after an ordinary word,
// with no hyphen) names the repository only beside one of those forms in the same text: alone it reads as the word, and is left. Case matters:
// a plain-word name in lower case is never the name, and a lower-case name with hyphens is found only as it is written.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const SKILL = path.resolve(__dirname, "..", "..");
const SCHEMA = "private-repositories/1";
/* how long a reading stands before GitHub is read again */
const FRESH_MS = 6 * 60 * 60 * 1000;
const DEFAULT_CACHE = path.join(os.homedir(), ".claude", "cache", "dashboards", "private-repositories.json");
const verifying = () => process.env.DASHBOARDS_VERIFY === "1";
/* the cache's file: DASHBOARDS_PRIVATES_CACHE, else this machine's; under the verification only the one a case names */
const cacheFile = () => process.env.DASHBOARDS_PRIVATES_CACHE ? path.resolve(process.env.DASHBOARDS_PRIVATES_CACHE) : verifying() ? null : DEFAULT_CACHE;

/* ---------- What names a private repository ---------- */
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const camel = n => /[a-z][A-Z]/.test(n);
/* a name in lower case with hyphens (letters and digits, a hyphen between each two parts): found on its own, as a CamelCase name is */
const hyphened = n => /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(n);
/* a name that names the repository on its own, wherever it stands */
const distinct = n => camel(n) || hyphened(n);
/* a name standing on its own: no name character before it, and none after it but a full stop that ends the sentence ("… owner/name.") */
const alone = n => `(?<![\\w.-])${esc(n)}(?![\\w-]|\\.[\\w-])`;
const pairs = privates => [...(privates || [])].map(k => String(k).split("/")).filter(p => p.length === 2 && p[0] && p[1]);
const strongForms = ([o, n]) => [`(?<![\\w.-])${esc(o)}/${esc(n)}#\\d+`, `(?<![\\w.-])${esc(o)}/${esc(n)}(?![\\w-]|\\.[\\w-])`, `(?<![\\w.-])${esc(n)}#\\d+`, ...(distinct(n) ? [alone(n)] : [])];
/* A quoted text (an issue's title, an excerpt) with each private repository's name elided with "…", as a quotation elides a name it cannot
   show: owner/name#n, owner/name, name#n and a CamelCase name or a lower-case name with hyphens wherever they stand, and with them in the same text a name that is a plain
   word, which alone reads as the word and is left ("GitHub <word>", GitHub's own, is left beside them too). Longer names first, so a name that begins another (a name and the same name with a suffix) never leaves a piece. */
function elidePrivate(text, privates) {
  if (typeof text !== "string" || !text) return { text, n: 0 };
  const names = pairs(privates).sort((a, b) => b[1].length - a[1].length || b[0].length - a[0].length);
  const strong = names.flatMap(p => strongForms(p).map(f => new RegExp(f, "g")));
  if (!strong.some(re => { re.lastIndex = 0; return re.test(text); })) return { text, n: 0 };
  let s = text, n = 0;
  strong.forEach(re => { re.lastIndex = 0; s = s.replace(re, () => { n++; return "…"; }); });
  names.filter(([, nm]) => !distinct(nm)).forEach(([, nm]) => { s = s.replace(new RegExp(`(?<!\\bGitHub )${alone(nm)}`, "g"), () => { n++; return "…"; }); });
  return { text: s, n };
}
/* The private repositories a text names: its owner/name, its name#n, a JSON value that is its name under a repo, repository or name key, or
   a CamelCase name or a lower-case name with hyphens on its own; a plain-word name is a word of its own, and its forms above are what identify the repository. */
function privateRefs(text, privates) {
  const out = [], t = String(text == null ? "" : text);
  pairs(privates).forEach(([o, n]) => {
    const forms = [...strongForms([o, n]), `"(?:repo|repository|name)":\\s*"${esc(n)}"`];
    if (new RegExp(forms.join("|")).test(t)) out.push(`${o}/${n}`);
  });
  return out;
}
function elideAll(v, privates, seen) {
  if (typeof v === "string") { const r = elidePrivate(v, privates); seen.n += r.n; return r.text; }
  if (Array.isArray(v)) return v.map(x => elideAll(x, privates, seen));
  if (v && typeof v === "object") { Object.keys(v).forEach(k => { v[k] = elideAll(v[k], privates, seen); }); return v; }
  return v;
}

/* ---------- A board's data ---------- */
const EXCERPT = /(?:^|\.)excerpt\.(?:heading|paragraph)$/;
/* a path a board quotes: an issue's title (verbatim, levelrefs.js TITLE_PATHS, by the data's kind) or a statement's excerpt (a quotation of
   the documents, lib.js sectionOf()) */
function isQuoted(kind, at) {
  if (EXCERPT.test(String(at || ""))) return true;
  const L = require("./levelrefs.js");
  return !!kind && L.isTitlePath(kind, at);
}
const kindOf = data => require("./levelrefs.js").dataKind(data);
/* the private repositories one string of a board's data names, its key read with it (a value that is a name under repo, repository or name) */
function stringRefs(v, key, privates) {
  const hits = new Set(privateRefs(v, privates));
  if (["repo", "repository", "name"].includes(key)) privateRefs(`"${key}": ${JSON.stringify(v)}`, privates).forEach(h => hits.add(h));
  return [...hits];
}
function walk(v, at, key, fn) {
  if (typeof v === "string") return fn(v, at, key);
  if (Array.isArray(v)) { v.forEach((x, i) => { const r = walk(x, `${at}[${i}]`, key, fn); if (r !== undefined) v[i] = r; }); return undefined; }
  if (v && typeof v === "object") { Object.keys(v).forEach(k => { const r = walk(v[k], at ? `${at}.${k}` : k, k, fn); if (r !== undefined) v[k] = r; }); return undefined; }
  return undefined;
}
/* A board's data on its way to be written: each quoted text that names a private repository elided in place; every other text that names
   one listed, for the writer to refuse. skip(at) leaves a path alone (a fill's identifiers, which find an item by the text it holds).
   Returns { elided: [{ at, n }], named: [{ at, keys }] }. */
function guardData(data, kind, privates, skip) {
  const k = kind === undefined ? kindOf(data) : kind, elided = [], named = [];
  if (!privates || !privates.size || data == null || typeof data !== "object") return { elided, named };
  walk(data, "", null, (s, at, key) => {
    if (skip && skip(at)) return undefined;
    if (isQuoted(k, at)) { const r = elidePrivate(s, privates); if (r.n) { elided.push({ at, n: r.n }); return r.text; } return undefined; }
    const keys = stringRefs(s, key, privates); if (keys.length) named.push({ at, keys, h: SW().textHash(s) });
    return undefined;
  });
  return { elided, named };
}
/* Every text of a board's data that names a private repository, a quotation included (a writer elides one): [{ at, keys, h }], h the text's mark
   (sweeplib.js textHash()), by which a sweep's warning stage knows a text already on a board */
function refsIn(data, privates) {
  const out = [];
  if (!privates || !privates.size || data == null || typeof data !== "object") return out;
  walk(JSON.parse(JSON.stringify(data)), "", null, (s, at, key) => { const keys = stringRefs(s, key, privates); if (keys.length) out.push({ at, keys, h: SW().textHash(s) }); return undefined; });
  return out;
}
/* Each line of a page's own text that names a private repository (the page with its data blocks emptied, sweeplib.js stripBlocks(); a state board's
   hand-written panels, its DSL and registry copies, its links): [{ line, keys, h }] */
function pageRefs(text, privates) {
  const out = [];
  if (!privates || !privates.size) return out;
  String(text == null ? "" : text).split(/\r?\n/).forEach((l, i) => { const keys = privateRefs(l, privates); if (keys.length) out.push({ line: i + 1, at: "its page", keys, h: SW().lineHash(l) }); });
  return out;
}
const SW = () => require("./sweeplib.js");
const atsOf = list => `${[...new Set(list.map(x => x.at))].slice(0, 4).join(", ")}${list.length > 4 ? ", …" : ""}`;
const keysOf = list => [...new Set(list.flatMap(x => x.keys))].join(", ");
/* the checkers' line for a board that still names one */
const privateLine = (where, list) => `PRIVATE REPOSITORY: ${where} names a private repository (${keysOf(list)}) at ${atsOf(list)}: a board names none (plan/RULES.md §1, "Private repositories"); a quoted title or excerpt is elided with "…", any other text is reworded where the board stores it, an issue or tracking board's through fill.js`;
/* the warning's line for texts a sweep of this rule keeps in its warning stage (sweeplib.js; GUIDANCE.md §11, "A rule that can fail boards") */
const keptLine = (where, list) => `${privateLine(where, list).replace(/^PRIVATE REPOSITORY: /, "PRIVATE REPOSITORY, KEPT BY A SWEEP: ")}; ${SW().keptWords(list[0].sweep)}`;
/* guardData() with the organizations' private repositories: throws where a text other than a quotation names one (nothing is to be written),
   else returns the lines of what it elided. While a sweep of this rule is in its warning stage, a text it lists as already on a board is warned,
   its line returned with the rest, and only a text newly written throws (sweeplib.js split()). */
function guardBoard(data, kind, where, opts) {
  const privates = (opts && opts.privates) || privatesOf();
  const r = guardData(data, kind, privates, opts && opts.skip);
  const { kept, fresh } = SW().split(RULE, r.named);
  if (fresh.length) { const e = new Error(`${privateLine(where, fresh)}; nothing written`); e.privateRepository = fresh; throw e; }
  return [...(kept.length ? [keptLine(where, kept)] : []), ...(r.elided.length ? [`private repositories: ${r.elided.reduce((a, x) => a + x.n, 0)} name${r.elided.length === 1 && r.elided[0].n === 1 ? "" : "s"} elided in ${where} (${atsOf(r.elided)})`] : [])];
}
/* ---------- This rule's finder for a sweep (sweeplib.js RULES, "private-repositories") ---------- */
const RULE = "private-repositories";
/* every text of a board's data that names one, a quotation marked quoted: the board's own writers cut it to "…" (a fix), any other is listed */
function sweepFind(data, kind) {
  const P = privatesOf(), k = kind === undefined ? kindOf(data) : kind;
  return refsIn(data, P).map(x => ({ ...x, quoted: isQuoted(k, x.at) }));
}
/* the fixes the board's own writers make, in place: each quotation that names one cut to "…"; returns how many texts changed */
function sweepFix(data, kind) { return guardData(data, kind === undefined ? kindOf(data) : kind, privatesOf()).elided.length; }
const sweepPage = text => pageRefs(text, privatesOf());

/* ---------- The list: a fixture, this machine's cache, GitHub ---------- */
function ownersOf() {
  const cfg = JSON.parse(fs.readFileSync(path.join(SKILL, "plan", "template", "org-board.repositories.json"), "utf8"));
  return [cfg.owner, ...(cfg.organizations || []).map(o => o.owner)];
}
const sameOwners = (a, b) => Array.isArray(a) && Array.isArray(b) && a.slice().sort().join(",") === b.slice().sort().join(",");
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+$/;
function readFixture(file) {
  let d; try { d = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { throw new Error(`DASHBOARDS_PRIVATES names ${file}, which cannot be read as a list of private repositories (${e.message}): nothing written`); }
  const list = Array.isArray(d) ? d : d && Array.isArray(d.private) ? d.private : null;
  if (!list || list.some(x => typeof x !== "string" || !NAME_RE.test(x))) throw new Error(`DASHBOARDS_PRIVATES names ${file}, which is not a list of owner/name (a JSON list, or { "private": [...] }): nothing written`);
  return list;
}
function readCache(file) {
  try { const d = JSON.parse(fs.readFileSync(file, "utf8")); return d && d.schema === SCHEMA && Array.isArray(d.private) && Array.isArray(d.owners) && !isNaN(Date.parse(d.read)) ? d : null; } catch (e) { return null; }
}
function writeCache(file, owners, list) {
  if (!file) return false;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ schema: SCHEMA, read: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), owners: owners.slice(), private: [...new Set(list)].sort() }, null, 2) + "\n");
    fs.renameSync(tmp, file); return true;
  } catch (e) { return false; }   // a cache this machine cannot write is read again next time; nothing fails for it
}
const ghBin = () => process.env.DASHBOARDS_GH || "gh";
function readGitHub(owners) {
  const bin = ghBin(), via = /\.js$/i.test(bin), out = [];
  owners.forEach(o => {
    const a = ["repo", "list", o, "--json", "nameWithOwner,visibility", "-L", "1000"];
    const r = cp.spawnSync(via ? process.execPath : bin, via ? [bin, ...a] : a, { encoding: "utf8", windowsHide: true, timeout: 120000, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0) throw new Error(`gh repo list ${o}: ${((r.stderr || "") + (r.error ? " " + r.error.message : "")).trim() || "failed"}`);
    let d; try { d = JSON.parse(r.stdout); } catch (e) { throw new Error(`gh repo list ${o}: not JSON (${e.message})`); }
    if (!Array.isArray(d)) throw new Error(`gh repo list ${o}: not a list`);
    d.filter(x => x && x.visibility !== "PUBLIC" && typeof x.nameWithOwner === "string").forEach(x => out.push(x.nameWithOwner));
  });
  return out;
}
const memo = new Map();
let lastSource = null;
/* The organizations' private repositories (a Set of owner/name), read once per process for each list of owners */
function privatesOf(owners) {
  const own = owners && owners.length ? owners : ownersOf(), key = own.slice().sort().join(",");
  if (memo.has(key)) return new Set(memo.get(key));
  let list;
  if (process.env.DASHBOARDS_PRIVATES) { list = readFixture(path.resolve(process.env.DASHBOARDS_PRIVATES)); lastSource = { source: "fixture", file: path.resolve(process.env.DASHBOARDS_PRIVATES) }; }
  else {
    const file = cacheFile(), cached = file ? readCache(file) : null, usable = cached && sameOwners(cached.owners, own);
    if (usable && Date.now() - Date.parse(cached.read) < FRESH_MS) { list = cached.private; lastSource = { source: "cache", file, read: cached.read }; }
    else {
      if (verifying() && !process.env.DASHBOARDS_GH) throw new Error("the verification reads no live GitHub and not this machine's cache of the private repositories: set DASHBOARDS_PRIVATES to a fixture list (verify/fixtures/private-repositories.json), or DASHBOARDS_GH to a stand-in gh");
      try { list = readGitHub(own); writeCache(file, own, list); lastSource = { source: "github", file }; }
      catch (e) {
        if (!usable) throw new Error(`the private repositories could not be read from GitHub (${e.message}), and none are cached on this machine${file ? ` (${file})` : ""}: nothing written, as no board, Whiteboard, published copy or idea may name a private repository`);
        list = cached.private; lastSource = { source: "stale cache", file, read: cached.read };
        process.stderr.write(`private repositories: GitHub could not be read (${e.message}); the list cached at ${cached.read} is used\n`);
      }
    }
  }
  memo.set(key, list.slice());
  return new Set(list);
}
/* the cache written from a reading made elsewhere: the private repositories of these owners, as just read from GitHub */
function remember(privates, owners) {
  if (process.env.DASHBOARDS_PRIVATES) return false;   // a fixture stands alone
  const own = owners && owners.length ? owners : ownersOf(), list = [...privates];
  memo.set(own.slice().sort().join(","), list);
  return writeCache(cacheFile(), own, list);
}
/* for the verification: forget what this process has read */
const forget = () => { memo.clear(); lastSource = null; };
const source = () => lastSource;

module.exports = { SCHEMA, FRESH_MS, DEFAULT_CACHE, RULE, cacheFile, ownersOf, privatesOf, remember, forget, source, elidePrivate, privateRefs, elideAll, isQuoted, guardData, refsIn, pageRefs, guardBoard, privateLine, keptLine, sweepFind, sweepFix, sweepPage };
