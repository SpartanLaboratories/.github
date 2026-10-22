// Shared helpers for the plan-set scripts (new.js, embed.js, check.js, board.js). Not a command.
"use strict";
const fs = require("fs"), path = require("path");

/* The repository root: --root <dir>, else the current directory. It must hold docs/ (a plan set lives under docs/plans/). */
function repoRoot(args) {
  const i = args.indexOf("--root");
  const root = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : process.cwd());
  if (!fs.existsSync(path.join(root, "docs"))) throw new Error(`${root} has no docs/ folder: run from the repository root or pass --root <repo>`);
  return root;
}
const opt = (args, name, dflt) => { const i = args.indexOf("--" + name); return i >= 0 && args[i + 1] != null && !args[i + 1].startsWith("--") ? args[i + 1] : dflt; };
const flag = (args, name) => args.includes("--" + name);

/* The registry's colour slots, computed exactly as the system pages compute them (system/template/supersystem.html, sysColour):
   the systems in registry order without the repo entry; a top-level system is one whose parent is not itself such a system;
   tops take slots 1..6 in order, a seventh and later get 0 (neutral); a child takes its top-level ancestor's slot. The repo
   entry itself, when a row names it, is neutral (slot 0). */
function registry(root) {
  const p = path.join(root, "docs", "dashboards", "systems.json");
  if (!fs.existsSync(p)) return null;
  const reg = JSON.parse(fs.readFileSync(p, "utf8"));
  const all = reg.systems || [], systems = all.filter(s => s.kind !== "repo");
  const by = slug => systems.find(s => s.slug === slug);
  const top = slug => { let s = by(slug); while (s && by(s.parent)) s = by(s.parent); return s; };
  const tops = systems.filter(s => !by(s.parent));
  const pageOf = s => s.page ? "docs/dashboards/" + s.page : null;
  const info = slug => {
    const s = by(slug);
    if (!s) { const r = all.find(x => x.slug === slug); return r ? { slug, name: r.name, slot: 0, top: r.name, status: r.status || "built", page: pageOf(r) } : null; }
    const t = top(slug), i = tops.indexOf(t);
    return { slug, name: s.name, slot: i >= 0 && i < 6 ? i + 1 : 0, top: t ? t.name : s.name, status: s.status, page: pageOf(s) };
  };
  return { reg, info };
}

/* GitHub's heading anchors (github-slugger): lower case, punctuation dropped, spaces to hyphens, duplicates numbered. */
function headingSlugs(md) {
  const seen = {}, out = new Set(); let fence = false;
  md.split(/\r?\n/).forEach(l => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (fence) return;
    const m = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/); if (!m) return;
    let s = m[2].replace(/<[^>]+>/g, "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
    const base = s; if (seen[base] != null) { seen[base]++; s = base + "-" + seen[base]; } else seen[base] = 0;
    out.add(s);
  });
  return out;
}

/* The embedded block of a page: <script type="application/json" id="<id>"> … </script>. */
const openTag = id => `<script type="application/json" id="${id}">`;
function readBlock(html, id) {
  const OPEN = openTag(id), a = html.indexOf(OPEN), b = a < 0 ? -1 : html.indexOf("</script>", a + OPEN.length);
  if (a < 0 || b < 0) return null;
  return html.slice(a + OPEN.length, b);
}
function writeBlock(html, id, json) {
  const OPEN = openTag(id), a = html.indexOf(OPEN);
  if (a < 0) throw new Error(`no <script type="application/json" id="${id}"> block`);
  const b = html.indexOf("</script>", a + OPEN.length);
  if (b < 0) throw new Error(`unterminated ${id} block`);
  // "</script" inside a JSON string would end the block early; "<\/script" is the same string once parsed.
  const body = "\n" + json.replace(/<\/script/gi, "<\\/script").replace(/\s*$/, "") + "\n";
  return html.slice(0, a + OPEN.length) + body + html.slice(b);
}

/* Every plan.json under docs/plans/, with its folder relative to the repository root. */
function findPlans(root) {
  const base = path.join(root, "docs", "plans"), found = [];
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".") || d.name === "research" || d.name === "superseded") return;
    const p = path.join(dir, d.name);
    if (fs.existsSync(path.join(p, "plan.json"))) found.push({ dir: p, folder: path.relative(root, p).split(path.sep).join("/") });
    walk(p);
  });
  if (fs.existsSync(base)) walk(base);
  return found;
}

/* A sub-issue's own board, seen from its tracking board's folder `dir` (plan/RULES.md §1, "Links to a sub-issue"): the unit's
   folder when it is a relative folder holding dashboard.html, else the folder directly inside the tracking folder named
   <issue>-<slug> that holds one. Returns { board, folder } as paths relative to `dir` ("61-build-logic/dashboard.html",
   "61-build-logic/"), or null when no board exists in this tree, so a board link is made only to a file that exists. */
function subIssueBoard(dir, unit) {
  if (!unit || !Number.isInteger(unit.issue) || unit.issue <= 0) return null;
  const f = typeof unit.folder === "string" && unit.folder.trim() && !/^[a-z][a-z0-9+.-]*:/i.test(unit.folder)
    ? unit.folder.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/?$/, "/") : null;
  if (f && fs.existsSync(path.join(dir, f, "dashboard.html"))) return { board: f + "dashboard.html", folder: f };
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith(unit.issue + "-")).map(d => d.name).sort(); } catch (e) { /* no folder */ }
  const hit = names.find(n => fs.existsSync(path.join(dir, n, "dashboard.html")));
  return hit ? { board: hit + "/dashboard.html", folder: hit + "/" } : null;
}

/* Link every unit of a tracking board to its sub-issue's board, from the folders on disk (embed.js runs it before embedding, so
   nobody writes these links by hand): unit.board becomes the board's relative path when it exists in this tree, and null when
   it does not (a link to a file that is not there would be dead); unit.folder is filled in when it was unset. Returns one line
   per change; an issue board, or a tracking board whose links are already right, returns []. */
function linkSubIssueBoards(plan, dir) {
  const changes = [];
  if (!plan || plan.kind !== "tracking") return changes;
  (plan.rows || []).forEach(r => {
    const u = r.unit; if (!u || !Number.isInteger(u.issue)) return;
    const hit = subIssueBoard(dir, u), want = hit ? hit.board : null;
    if ((u.board || null) !== want && (want || "board" in u)) {
      changes.push(`#${u.issue}: unit.board ${u.board ? JSON.stringify(u.board) : "unset"} → ${want ? JSON.stringify(want) : "null (no board in this tree)"}`);
      u.board = want;
    }
    if (hit && !u.folder) { u.folder = hit.folder; changes.push(`#${u.issue}: unit.folder unset → "${hit.folder}"`); }
  });
  return changes;
}

/* The marker of a template that routes a sub-issue's links to its board (plan/RULES.md §1): the plan board and the work board
   both declare this map. A page without it links every #n to GitHub. */
const SUB_BOARD_MARKER = "const SUB_BOARDS=";

const skillDir = path.resolve(__dirname, "..");
module.exports = { repoRoot, opt, flag, registry, headingSlugs, openTag, readBlock, writeBlock, findPlans, subIssueBoard, linkSubIssueBoards, SUB_BOARD_MARKER, skillDir };
