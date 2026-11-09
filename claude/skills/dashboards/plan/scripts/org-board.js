#!/usr/bin/env node
// Regenerate the org work board (plan/RULES.md, the org work board): every run in every repository of the organization at once.
//   node org-board.js [--root <checkout>] [--checkouts <folder>] [--config <repositories.json>] [--live-only]
// The root, where it writes, is the organization's page checkout (OrganizationPage) or a worktree of it, --root else the current directory. --checkouts names the folder that holds the
// repositories' checkouts, and is needed where the root has none of them beside it (a worktree under another folder); by default they are the root's sibling folders. One command:
// run it after every landing in a repository on the board. It reads each repository's work-board data (its docs/plans/.live/board.json where it exists, else its committed docs/plans/board.json) and
// writes, from that one reading, the two forms of the board, each the template plan/template/org-board.html plus its board.json embedded verbatim:
//   docs/plans/org-work-board/{board.json,index.html}          the committed snapshot, regenerated at every landing in a repository on the board; "not live · snapshot"; no sidecar.
//   docs/plans/.live/org-work-board/{board.json,index.html,index.js}   the live view of this machine, git-ignored (docs/plans/.live/, the checkout's .git/info/exclude, the line
//                                                              added if it is missing); opened from disk it re-reads each sibling checkout's live data as it changes
//                                                              (template, readSiblings()), so nothing has to regenerate it to follow a run.
// --live-only writes the live view alone, for looking at the board in a checkout whose tracked files must stay as they are (the committed snapshot left untouched).
// GitHub is read, never written (gh: each repository's visibility, default branch and files, and any run branch a board's file is on); the source repositories are read and
// nothing else: no git command that changes a checkout runs. Exit 0 with the summary (JSON) on stdout, 1 when a repository cannot be read or the board fails its checks.
// A private repository is dropped from the board and its data, by its visibility on GitHub, and the output is held to naming none. A repository's own colours stay
// its registry's (a Panel's Legend names them). A row's board links to its default branch's copy when the file is there, else its run's branch's copy when that branch and the file
// are on GitHub, else it is listed under "unlinked" and not linked (the Panel's head Chip counts them). The links' form follows where the board is opened (the template).
// Its text is cleaned on the writers' one path (namerefs.js cleanWorkBoard()), as board.js cleans a repository work board.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const lib = require("./lib.js"), N = require("../../system/scripts/namerefs.js");
const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: "usage: node org-board.js [--root <checkout>] [--checkouts <folder>] [--config <repositories.json>] [--live-only]\nRegenerates the org work board's committed snapshot and its live view; --live-only, the live view alone.", valued: ["root", "checkouts", "config"], flags: ["live-only"], max: 0 });
let root; try { root = lib.repoRoot(args); } catch (e) { console.error(e.message); process.exit(2); }
const LIVE_ONLY = args.includes("--live-only");
const SNAP_DIR = path.join(root, "docs", "plans", "org-work-board"), LIVE_DIR = path.join(root, "docs", "plans", ".live", "org-work-board");
const named = lib.opt(args, "checkouts", null), SIBLINGS = named ? path.resolve(named) : path.dirname(root);
if (named && !fs.statSync(SIBLINGS, { throwIfNoEntry: false })?.isDirectory()) { console.error(`--checkouts: ${SIBLINGS} is not a folder`); process.exit(2); }
/* where the live view finds the checkouts, relative to it (a file URL across drives), only when they are not the root's siblings: never in the committed data */
const siblingsHref = () => { if (!named || path.relative(path.dirname(root), SIBLINGS) === "") return null; const rel = path.relative(LIVE_DIR, SIBLINGS);
  return (path.isAbsolute(rel) ? require("url").pathToFileURL(SIBLINGS).href : rel.split(path.sep).join("/")).replace(/\/?$/, "/"); };
const CONFIG = lib.opt(args, "config", path.resolve(__dirname, "..", "template", "org-board.repositories.json"));
const TEMPLATE = path.resolve(__dirname, "..", "template", "org-board.html");
const SCHEMA = "org-work-board/1";

/* GitHub, read only. DASHBOARDS_GH names another gh command (a .js file is run with node; verify/ uses it to stand in for GitHub). */
const ghBin = process.env.DASHBOARDS_GH || "gh", ghVia = /\.js$/i.test(ghBin);
function ghRaw(a) { return cp.spawnSync(ghVia ? process.execPath : ghBin, ghVia ? [ghBin, ...a] : a, { encoding: "utf8", timeout: 120000, maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], windowsHide: true }); }
function gh(a) { const r = ghRaw(a); if (r.status !== 0) throw new Error(`gh ${a.join(" ")}: ${(r.stderr || r.stdout || r.error || "failed").toString().trim()}`); return r.stdout; }
const ghJson = a => JSON.parse(gh(a));
/* a tree of a ref as a set of paths, or null where the ref is not on GitHub */
const treeOf = (r, ref) => { const res = ghRaw(["api", `repos/${r.owner}/${r.name}/git/trees/${encodeURIComponent(ref)}?recursive=1`, "--jq", ".tree[].path"]); return res.status === 0 ? new Set(res.stdout.split(/\r?\n/).filter(Boolean)) : null; };
const headOf = (r, ref) => gh(["api", `repos/${r.owner}/${r.name}/branches/${encodeURIComponent(ref)}`, "--jq", ".commit.sha"]).trim();
/* the board.json a checkout keeps, the live view first */
function sourceOf(name) {
  const dir = path.join(SIBLINGS, name);
  if (!fs.existsSync(dir)) return null;
  const live = path.join(dir, "docs/plans/.live/board.json"), committed = path.join(dir, "docs/plans/board.json");
  return fs.existsSync(live) ? { abs: live, file: "docs/plans/.live/board.json", view: "live" } : fs.existsSync(committed) ? { abs: committed, file: "docs/plans/board.json", view: "committed" } : null;
}
/* A board path (relative to the source file's folder, absolute or a file URL) as a path in the repository, or null. A view copy stands for the board it copies. */
function repoPath(srcDir, rel) {
  if (typeof rel !== "string" || !rel) return null;
  const at = rel.replace(/\\/g, "/").indexOf("docs/plans/"), abs = /^[a-z][a-z0-9+.-]*:/i.test(rel) || rel.startsWith("/");
  let p = !abs && !/\.\.\/\.\.\/\.\.\//.test(rel) ? path.posix.normalize(path.posix.join(srcDir, rel)) : at >= 0 ? rel.replace(/\\/g, "/").slice(at) : null;
  if (p && /^\.\.?\//.test(p) && at >= 0) p = rel.replace(/\\/g, "/").slice(at);
  if (!p || /^\.\.?\//.test(p)) return null;
  return p.replace(/^docs\/plans\/\.live\/view\//, "docs/plans/");
}
/* a link that points outside the repository holds a machine's paths: the committed data keeps none (GUIDANCE.md §10) */
const localPath = (srcDir, rel) => typeof rel !== "string" || !rel ? false : /^[a-z][a-z0-9+.-]*:/i.test(rel) || rel.startsWith("/") || /^\.\.\//.test(path.posix.normalize(path.posix.join(srcDir, rel)));

function buildRepo(owner, name, privates, branchTrees) {
  const meta = ghJson(["repo", "view", `${owner}/${name}`, "--json", "nameWithOwner,defaultBranchRef,isPrivate,isArchived,url"]);
  if (meta.nameWithOwner !== `${owner}/${name}`) throw new Error(`${owner}/${name} resolves to ${meta.nameWithOwner}: update the repositories' list`);
  if (meta.isPrivate) { privates.add(`${owner}/${name}`); return null; }
  if (meta.isArchived) return null;
  const defaultBranch = meta.defaultBranchRef.name, cfg = { owner, name };
  const tree = treeOf(cfg, defaultBranch); if (!tree) throw new Error(`${owner}/${name}: its default branch ${defaultBranch} cannot be read`);
  const r = { owner, name, url: meta.url, defaultBranch, head: headOf(cfg, defaultBranch), source: null, links: {}, boards: {}, unlinked: [], board: null };
  [["workBoard", "docs/plans/index.html"], ["repoBoard", "docs/dashboards/index.html"], ["readme", "docs/plans/README.md"]].forEach(([k, p]) => { if (tree.has(p)) r.links[k] = p; });
  const src = sourceOf(name); if (!src) return r;
  const raw = JSON.parse(fs.readFileSync(src.abs, "utf8"));
  if (raw.schema !== "work-board/1") throw new Error(`${name}: ${src.file} has schema ${raw.schema}`);
  if (raw.repo !== `${owner}/${name}`) throw new Error(`${name}: ${src.file} names ${raw.repo}`);
  const srcDir = path.posix.dirname(src.file), issuesWith = new Map();
  /* every board the data names, by issue: the row's branch names the run the board lives on */
  const note = (x, why) => { if (!x || !x.board) return; const p = repoPath(srcDir, x.board); if (p && !issuesWith.has(x.issue)) issuesWith.set(x.issue, { path: p, branch: x.branch || null, why }); };
  (raw.rows || []).forEach(x => note(x)); (raw.groups || []).forEach(g => note({ ...g, branch: ((raw.rows || []).find(x => x.issue === g.issue) || {}).branch })); (raw.roadmap || []).forEach(m => note({ ...m, branch: ((raw.rows || []).find(x => x.issue === m.issue) || {}).branch }));
  N.cleanWorkBoard(raw).forEach(c => process.stderr.write(`internal names: ${name} ${c.at} ${c.now ? "reworded" : "left out"}\n`));
  /* the machine's paths stay out of the committed data: this view's links open the live files through the sidecars it reads (template) */
  delete raw.live; delete raw.tree;
  const scrub = (x) => { ["board", "folder"].forEach(k => { if (localPath(srcDir, x && x[k])) x[k] = null; }); };
  (raw.rows || []).forEach(scrub); (raw.groups || []).forEach(scrub); (raw.roadmap || []).forEach(scrub);
  /* a private repository named by a dependency is dropped with it */
  const privateDep = x => x && x.repo && privates.has(x.repo);
  (raw.rows || []).forEach(x => { x.waitsOn = (x.waitsOn || []).filter(d => !privateDep(d)); x.blocks = (x.blocks || []).filter(d => !privateDep(d)); });
  /* a private repository's name in a public repository's text is elided (decision 5): a quoted title gives way to it on this board */
  { const seen = { n: 0 }; elideAll(raw, privates, seen); if (seen.n) process.stderr.write(`private repositories: ${seen.n} name${seen.n === 1 ? "" : "s"} elided in ${name}\n`); }
  r.source = { file: src.file, view: src.view, generated: raw.generated || null, asOf: raw.asOf || null };
  r.board = raw;
  issuesWith.forEach((b, issue) => {
    if (tree.has(b.path)) { r.boards[String(issue)] = { path: b.path, ref: defaultBranch }; return; }
    if (b.branch) {
      const key = `${owner}/${name}@${b.branch}`; if (!branchTrees.has(key)) branchTrees.set(key, treeOf(cfg, b.branch));
      const bt = branchTrees.get(key);
      if (bt && bt.has(b.path)) { r.boards[String(issue)] = { path: b.path, ref: b.branch }; return; }
      r.unlinked.push({ issue, path: b.path, branch: b.branch, why: bt ? `on ${b.branch}, whose copy of the board is not on GitHub yet` : `on ${b.branch}, not on GitHub yet` });
      return; }
    r.unlinked.push({ issue, path: b.path, branch: null, why: `not on ${defaultBranch}, and on no branch recorded for it` });
  });
  return r;
}
/* Every repository of the organizations, by visibility: a private one is on no list at all (the board and its data never name one) */
function listRepos(cfg) {
  return [cfg.owner, ...(cfg.organizations || []).map(o => o.owner)].flatMap(o => ghJson(["repo", "list", o, "--json", "nameWithOwner,isArchived,url,visibility", "-L", "400"]));
}
/* A private repository is dropped from the board and its data entirely: where a public repository's text still names one (an issue's title, a unit's name), the name is
   elided with "…", as a quotation elides a name it cannot show (GUIDANCE.md §4): owner/name, name#n and a CamelCase name wherever they stand, and with them in the same text a name
   that is a plain word (a repository named Support), which alone reads as the word and is left. Returns the text as written and how many it elided. */
function elidePrivate(text, privates) {
  const names = [...privates].map(k => k.split("/")), e = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const strong = names.flatMap(([o, n]) => [new RegExp(`(?<![\\w.-])${e(o)}/${e(n)}(?![\\w.-])`, "g"), new RegExp(`(?<![\\w.-])${e(n)}#\\d+`, "g"), ...(/[a-z][A-Z]/.test(n) ? [new RegExp(`\\b${e(n)}\\b`, "g")] : [])]);
  if (!strong.some(re => { re.lastIndex = 0; return re.test(text); })) return { text, n: 0 };
  let s = text, n = 0;
  strong.forEach(re => { s = s.replace(re, () => { n++; return "…"; }); });
  names.filter(([, nm]) => !/[a-z][A-Z]/.test(nm)).forEach(([, nm]) => { s = s.replace(new RegExp(`\\b${e(nm)}\\b`, "g"), () => { n++; return "…"; }); });
  return { text: s, n };
}
function elideAll(v, privates, seen) {
  if (typeof v === "string") { const r = elidePrivate(v, privates); seen.n += r.n; return r.text; }
  if (Array.isArray(v)) return v.map(x => elideAll(x, privates, seen));
  if (v && typeof v === "object") { Object.keys(v).forEach(k => { v[k] = elideAll(v[k], privates, seen); }); return v; }
  return v;
}
/* The output never names a private repository: its owner/name, its name#n, or a value that is its name; a name in CamelCase bare as well (a plain word such as a repository
   named Support is a word of its own, and its forms above are what identifies the repository). */
function privateRefs(text, privates) {
  const out = [];
  privates.forEach(key => { const [owner, name] = key.split("/"), e = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const forms = [`(?<![\\w.-])${e(owner)}/${e(name)}(?![\\w.-])`, `(?<![\\w.-])${e(name)}#\\d`, `"(?:repo|repository|name)":\\s*"${e(name)}"`];
    if (/[a-z][A-Z]/.test(name)) forms.push(`\\b${e(name)}\\b`);
    if (new RegExp(forms.join("|")).test(text)) out.push(key); });
  return out;
}
/* docs/plans/.live/ is git-ignored through the checkout's .git/info/exclude (the line added if it is missing): a file edit, not a git command */
function ensureExcluded() {
  const q = a => cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  if (q(["rev-parse", "--is-inside-work-tree"]).status !== 0) return;
  if (q(["check-ignore", "-q", "--no-index", "docs/plans/.live/org-work-board/index.html"]).status === 0) return;
  const f = q(["rev-parse", "--git-path", "info/exclude"]).stdout.trim(), file = path.isAbsolute(f) ? f : path.join(root, f);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const had = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  fs.writeFileSync(file, had + (had && !/\n$/.test(had) ? "\n" : "") + "docs/plans/.live/\n");
}
function writeBoard(dir, data) {
  fs.mkdirSync(dir, { recursive: true });
  const json = JSON.stringify(data, null, 2) + "\n";
  lib.atomicWrite(path.join(dir, "board.json"), json);
  const html = lib.writeBlock(fs.readFileSync(TEMPLATE, "utf8"), "board", json);
  lib.atomicWrite(path.join(dir, "index.html"), html);
  return { dir, json, html };
}

function main() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8")), generated = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  /* who is on GitHub first, so a private repository is known before any board is read */
  const listed = listRepos(cfg), privates = new Set(listed.filter(x => x.visibility !== "PUBLIC").map(x => x.nameWithOwner));
  const branchTrees = new Map(), keep = (o, names) => names.map(n => buildRepo(o, n, privates, branchTrees)).filter(Boolean);
  const repositories = keep(cfg.owner, cfg.repositories || []);
  const organizations = (cfg.organizations || []).map(o => ({ owner: o.owner, url: o.url, parent: o.parent, repositories: keep(o.owner, o.repositories || []) }));
  const all = [...repositories, ...organizations.flatMap(o => o.repositories)], shown = new Set(all.map(r => `${r.owner}/${r.name}`));
  const refOnly = new Set(cfg.referenceOnly || []), pub = listed.filter(x => x.visibility === "PUBLIC"), entry = (x, why) => ({ repository: x.nameWithOwner, url: x.url, why }), notShown = [];
  pub.filter(x => x.nameWithOwner.endsWith("/.github")).forEach(x => notShown.push(entry(x, "the organization's .github repository")));
  pub.filter(x => x.isArchived).forEach(x => notShown.push(entry(x, "archived")));
  pub.filter(x => !x.isArchived && refOnly.has(x.nameWithOwner.split("/")[1])).forEach(x => notShown.push(entry(x, "reference only")));
  const unaccounted = pub.filter(x => !shown.has(x.nameWithOwner) && !notShown.some(e => e.repository === x.nameWithOwner)).map(x => x.nameWithOwner);
  const board = { schema: SCHEMA, organization: cfg.owner, url: cfg.url, generated, repositories, organizations, notShown };
  /* nothing is written until the whole board reads clean of the private repositories */
  const sib = siblingsHref(), liveBoard = { ...board, live: true, ...(sib ? { siblings: sib } : {}) }, hits = privateRefs(JSON.stringify(liveBoard), privates);
  if (hits.length) throw new Error(`the board would name a private repository (${hits.length}): nothing written; find where the data names it`);
  const wrote = LIVE_ONLY ? {} : { snapshot: writeBoard(SNAP_DIR, board) };
  ensureExcluded();
  wrote.live = writeBoard(LIVE_DIR, liveBoard);
  fs.writeFileSync(path.join(LIVE_DIR, "index.js"), "/* docs/plans/.live/org-work-board/index.js: the live org work board on this machine (plan/scripts/org-board.js). Never committed. */\n(window.DASHBOARDS_LIVE=window.DASHBOARDS_LIVE||{}).orgBoard=\"index.html\";\n");
  /* the checks on both forms; the committed snapshot in --auto, as every board before its commit (GUIDANCE.md §8) */
  const checked = (LIVE_ONLY ? [LIVE_DIR] : [SNAP_DIR, LIVE_DIR]).map(d => { const c = cp.spawnSync(process.execPath, [path.join(__dirname, "check.js"), d, ...(d === SNAP_DIR ? ["--auto"] : [])], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); const lines = (c.stdout || "").split(/\r?\n/); return { path: path.relative(root, d).split(path.sep).join("/"), status: c.status, fail: lines.filter(l => /^FAIL/.test(l)), warn: lines.filter(l => /^warn/.test(l)) }; });
  console.log(JSON.stringify({ generated, snapshot: LIVE_ONLY ? null : SNAP_DIR, live: LIVE_DIR, bytes: { json: (wrote.snapshot || wrote.live).json.length, html: (wrote.snapshot || wrote.live).html.length },
    repositories: all.map(r => ({ repo: `${r.owner}/${r.name}`, branch: r.defaultBranch, head: r.head.slice(0, 7), source: r.source && r.source.file, rows: r.board ? (r.board.rows || []).length : 0, boards: Object.keys(r.boards).length, unlinked: r.unlinked, links: Object.keys(r.links) })),
    notShown: notShown.map(x => x.repository), unaccounted, check: checked }, null, 2));
  process.exit(checked.some(c => c.status !== 0) ? 1 : 0);
}
if (require.main === module) { try { main(); } catch (e) { console.error(`org-board: ${e.message}`); process.exit(1); } }
module.exports = { repoPath, localPath, privateRefs, elidePrivate };
