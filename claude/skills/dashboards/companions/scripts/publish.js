#!/usr/bin/env node
// The published copies' preparation (GUIDANCE.md §13, "The published copies"): which committed boards a publish takes, each read as
// committed at the commit and checked with its --auto checker, ready for the presenter to publish unchanged with Artifact.
//   node publish.js --root <checkout> --sha <commit> (--all | --changed <from>..<to> | --board <path>...) --out <dir>
// --all: every board committed at the commit (a repository's first publish, at the user's word): the state boards under docs/dashboards/
// (never _template/), every issue and tracking board (docs/plans/**/dashboard.html, closed ones included), the repository work board
// (docs/plans/index.html) and, in OrganizationPage, the org work board (docs/plans/org-work-board/index.html). --changed: the boards
// the range added or changed (after a landing: <the base before the merge>..<the merge commit>). --board: the named ones, each of
// which must be committed at the commit. Never a live view, a view copy or anything under docs/plans/.live/: none is committed, and
// a path that names one is refused.
// It reads the commit's docs/ folder from git (git archive into <out>; nothing in the checkout is read or written), runs each board's
// --auto checker there (plan/scripts/check.js for a work board, system/scripts/check-board.js for a state board), and prints (JSON) each
// board with the file to publish, the title it carries, the title the publish names it by, and its check; a board that fails is not
// publishable. Exit 0 when every board is publishable, 1 when one is not or the commit cannot be read, 2 usage.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const W = require("./wblib.js"), SKILL = W.SKILL;

const isLive = p => /(^|\/)docs\/plans\/\.live\//.test(p);
/* a committed board's kind, from its path; null where the path is no board */
function kindOf(p) {
  if (isLive(p) || /\/_template\//.test(p)) return null;
  if (p === "docs/plans/org-work-board/index.html") return "org-work-board";
  if (p === "docs/plans/index.html") return "work-board";
  if (/^docs\/plans\/.+\/dashboard\.html$/.test(p)) return "plan-board";
  if (/^docs\/dashboards\/(?:.+\/)?index\.html$/.test(p)) return "state-board";
  return null;
}
function boardsAt(root, sha) { return W.tree(root, sha, "docs").filter(p => kindOf(p)); }
function changedBoards(root, range) {
  const [a, b] = String(range).split(".."); if (!a || !b) throw new Error(`--changed ${range} is not <from>..<to>`);
  const r = W.git(root, ["diff", "--name-only", "--diff-filter=ACMR", a, b, "--", "docs"]); if (r.status !== 0) throw new Error(`git diff ${range}: ${(r.stderr || "").trim()}`);
  return r.stdout.split(/\r?\n/).filter(Boolean).filter(p => kindOf(p));
}
/* the docs/ folder at the commit, unpacked under <out>/<sha>/ (git archive writes the archive there; the checkout is untouched) */
function unpack(root, sha, out) {
  const dir = path.join(out, sha); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const tar = path.join(out, `${sha}.tar`);
  const a = W.git(root, ["archive", "--format=tar", "-o", tar, sha, "docs"]); if (a.status !== 0) throw new Error(`git archive ${sha}: ${(a.stderr || "").trim()}`);
  /* relative names, run from the folder: a drive letter reads to some tar builds as a remote host */
  const x = cp.spawnSync("tar", ["-xf", `../${sha}.tar`], { cwd: dir, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  fs.rmSync(tar, { force: true });
  if (x.status !== 0) throw new Error(`unpacking ${sha}: ${(x.stderr || "").trim()}`);
  /* every other path of the commit as an empty file, so a state board's check reads the code's presence as committed (statelib.js
     codePresence() reads the files on disk where the folder is no git work tree); no content of the code is copied */
  W.tree(root, sha, ".").filter(p => !p.startsWith("docs/")).forEach(p => { const f = path.join(dir, ...p.split("/")); fs.mkdirSync(path.dirname(f), { recursive: true }); if (!fs.existsSync(f)) fs.writeFileSync(f, ""); });
  return dir;
}
function checkOne(dir, p, kind) {
  const abs = path.join(dir, ...p.split("/"));
  const r = kind === "state-board" ? cp.spawnSync(process.execPath, [path.join(SKILL, "system", "scripts", "check-board.js"), abs, "--auto"], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })
    : cp.spawnSync(process.execPath, [path.join(SKILL, "plan", "scripts", "check.js"), path.dirname(abs), "--auto", "--root", dir], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const lines = (r.stdout || "").split(/\r?\n/);
  return { status: r.status, fail: lines.filter(l => /^FAIL/.test(l)).slice(0, 8) };
}

function main() {
  const a = process.argv.slice(2), opt = n => { const i = a.indexOf("--" + n); return i >= 0 ? a[i + 1] : undefined; };
  const usage = "usage: node publish.js --root <checkout> --sha <commit> (--all | --changed <from>..<to> | --board <path>...) --out <dir>";
  require(path.join(SKILL, "system", "scripts", "cliargs.js")).strict(a.filter((x, i) => !(x === "--board" || a[i - 1] === "--board")), { usage, valued: ["root", "sha", "changed", "out"], flags: ["all"], max: 0 });
  const root = path.resolve(opt("root") || "."), sha0 = opt("sha"), out = opt("out"), named = a.map((x, i) => x === "--board" ? a[i + 1] : null).filter(Boolean);
  if (!sha0 || !out || [a.includes("--all"), !!opt("changed"), named.length > 0].filter(Boolean).length !== 1) { console.error(usage); process.exit(2); }
  try {
    const sha = W.shortSha(root, sha0); if (!sha) throw new Error(`${sha0} is not a commit in ${root}`);
    const reg = W.readJson(W.show(root, sha, "docs/dashboards/systems.json")), repo = reg && reg.repo ? reg.repo : null, repoName = repo ? repo.split("/").pop() : path.basename(root);
    const committed = new Set(boardsAt(root, sha));
    let boards;
    if (a.includes("--all")) boards = [...committed];
    else if (opt("changed")) boards = changedBoards(root, opt("changed")).filter(p => committed.has(p));
    else {
      const bad = named.filter(p => isLive(p.replace(/\\/g, "/"))); if (bad.length) throw new Error(`${bad.join(", ")}: a live view or a view copy is never published, only a committed board`);
      const missing = named.filter(p => !committed.has(p.replace(/\\/g, "/"))); if (missing.length) throw new Error(`${missing.join(", ")}: not a board committed at ${sha}`);
      boards = named.map(p => p.replace(/\\/g, "/"));
    }
    const dir = boards.length ? unpack(root, sha, path.resolve(out)) : null;
    const res = boards.sort().map(p => {
      const kind = kindOf(p), file = path.join(dir, ...p.split("/")), html = fs.readFileSync(file, "utf8");
      const own = (/<title>([^<]*)<\/title>/.exec(html.slice(0, 8192)) || [])[1] || null, c = checkOne(dir, p, kind);
      const want = `${repoName} · ${own || p}`;
      return { board: p, kind, file, sha, title: { carried: own, intended: want, applies: !own }, check: c.status === 0 ? "pass" : c.fail.length ? c.fail : [`exit ${c.status}`], publishable: c.status === 0 };
    });
    console.log(JSON.stringify({ repo, sha, out: dir, boards: res, note: res.some(r => !r.title.applies) ? "a board carries its own <title>, which names its published page (the publish tool's title applies only to a page with none); it is published unchanged" : null }, null, 2));
    process.exit(res.every(r => r.publishable) ? 0 : 1);
  } catch (e) { console.error(`publish: ${e.message}`); process.exit(1); }
}
if (require.main === module) main();
module.exports = { kindOf, boardsAt, changedBoards };
