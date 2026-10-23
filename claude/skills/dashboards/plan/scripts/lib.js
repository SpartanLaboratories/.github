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

/* The repository root of the tree that holds a folder: the first ancestor with docs/plans, or null. */
function treeRoot(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, "docs", "plans"))) return d; if (path.dirname(d) === d) return null; }
}
/* Every issue folder under docs/plans/ of a tree that holds a board: { issue, dir } for each <issue>-<slug>/ with a dashboard.html,
   in name order, parents before their children. */
function boardFolders(root) {
  const base = path.join(root, "docs", "plans"), found = [];
  const walk = dir => {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    ents.sort((a, b) => a.name.localeCompare(b.name)).forEach(d => {
      if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".") || d.name === "research" || d.name === "superseded") return;
      const p = path.join(dir, d.name), m = d.name.match(/^(\d+)-/);
      if (m && fs.existsSync(path.join(p, "dashboard.html"))) found.push({ issue: parseInt(m[1], 10), dir: p });
      walk(p);
    });
  };
  if (fs.existsSync(base)) walk(base);
  return found;
}
const boardLink = (from, toDir) => path.relative(path.resolve(from), path.join(toDir, "dashboard.html")).split(path.sep).join("/");

/* The parent tracking issue's board, seen from a sub-issue's board in `dir` (plan/RULES.md §1, "Links to an issue's board"): the
   enclosing folder, when it is the parent's <issue>-<slug>/ and holds dashboard.html. Returns { board: "../dashboard.html" } or
   null, so the parent is linked to its board only when that file exists. */
function parentBoard(dir, parent) {
  if (!parent || !Number.isInteger(parent.issue) || parent.issue <= 0) return null;
  const up = path.dirname(path.resolve(dir));
  return path.basename(up).startsWith(parent.issue + "-") && fs.existsSync(path.join(up, "dashboard.html")) ? { board: "../dashboard.html" } : null;
}

/* Every issue a plan board names, where the page names it (plan/RULES.md §1): one entry per place, { n, repo, at, how, place,
   since }. how is "field" (a number the page links: the parent, a unit, a roadmap item, a follow-up, a blocker, a deferred part's
   issue, an ancestor folder in the breadcrumb), "text" (a #n or an owner/repo#n of its own repo outside `code` spans, in a field
   the page renders as linked text) or "url" (a GitHub URL of the issue written in the data, which the page links to GitHub
   whatever the rule). since is the template rule that first linked the place to a board: "sub" for the sub-issue rule (the
   SUB_BOARDS map: a unit's row, chain, inspector and roadmap entry, and every #n the page links), "issue" for the widened rule
   (the ISSUE_BOARDS map: the parent, the breadcrumb, the roadmap of an issue board, and the WIP strip's unit lines and "blocked
   by" tags and the deferred badge, which were plain text before). Names, ids, paths, states, dates and titles are written
   without links and skipped; "PR #n" is a pull request, never an issue. Approximate by design: it names the places a reader
   clicks. */
const ISSUE_UNLINKED = new Set(["$comment", "schema", "repo", "slug", "folder", "kind", "status", "id", "where", "title", "system", "slot", "top", "page", "board",
  "branch", "step", "steps", "since", "updated", "state", "verdict", "column", "date", "sha", "merge", "version", "pr", "files", "n", "level", "current", "next",
  "resume", "qa", "qaMax", "pass", "findings", "landing", "chosen", "settles", "when", "issueBoards"]);
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const UNIT_LANDED = ["landed", "as-planned", "amended", "deviated"];
function issueRefs(plan) {
  const out = [];
  if (!plan || typeof plan !== "object") return out;
  const repo = plan.repo || "", tracking = plan.kind === "tracking";
  // plain: the place was plain text, not a link at all, before the widened rule (the WIP strip's unit lines, the "blocked by"
  // tags, the deferred badge); crumb: the breadcrumb, which linked every ancestor's board whether or not it existed
  const add = (n, at, place, since, how, r, flags) => { if (Number.isInteger(n) && n > 0 && (!r || r === repo)) out.push({ n, repo: r || null, at, how: how || "field", place, since: since || "issue", ...(flags || {}) }); };
  /* fields */
  String(plan.folder || "").split("/").filter(Boolean).slice(2, -1).forEach(s => { const m = s.match(/^(\d+)-/); if (m) add(parseInt(m[1], 10), "folder", "the breadcrumb", "issue", "field", null, { crumb: true }); });
  if (plan.parent) add(plan.parent.issue, "parent.issue", 'the header\'s "part of" chip', "issue");
  const rm = plan.roadmap;
  if (!tracking && rm) { add(rm.issue, "roadmap.issue", "the Context roadmap", "issue"); (rm.items || []).forEach((x, i) => add(x.issue, `roadmap.items[${i}]`, "the Context roadmap", "issue")); }
  (plan.followUps || []).forEach((f, i) => add(f.issue, `followUps[${i}]`, `followUps[${i}] in Context`, "sub", "field", f.repo));
  const w = plan.wip || {}, bl = w.blockers || {};
  ["waitsOn", "blocks"].forEach(k => (bl[k] || []).forEach((x, i) => add(x.issue, `wip.blockers.${k}[${i}]`, `the WIP strip's ${k === "waitsOn" ? "waits on" : "blocks"}`, "sub", "field", x.repo)));
  const rows = Array.isArray(plan.rows) ? plan.rows : [], units = rows.filter(r => r.unit && Number.isInteger(r.unit.issue));
  rows.forEach(r => { const b = r.asBuilt || {}; if (!Number.isInteger(b.issue)) return;
    add(b.issue, `rows(${r.id}).asBuilt.issue`, `the inspector's "moved to" of ${r.id}`, "sub");
    if (b.state === "deferred") add(b.issue, `rows(${r.id}).asBuilt.issue`, `the "deferred → #${b.issue}" badge of ${r.id}`, "issue", "field", null, { plain: true }); });
  if (tracking) {
    const live = !["built", "abandoned"].includes(plan.status) && !["landed", "cancelled"].includes(w.step);
    const cur = Array.isArray(w.current) ? w.current : [], inCur = r => cur.some(a => String(a).split(".")[0] === r.id);
    const stateOf = r => (r.asBuilt || {}).state || "pending";
    units.forEach(r => {
      const n = r.unit.issue;
      add(n, `rows(${r.id}).unit.issue`, `the unit row's label (${r.id})`, "sub");
      add(n, `rows(${r.id}).unit.issue`, "the Context roadmap", "sub");
      add(n, `rows(${r.id}).unit.issue`, `the inspector's unit entry (${r.id})`, "sub");
      (r.unit.blockedBy || []).forEach((m, j) => add(m, `rows(${r.id}).unit.blockedBy[${j}]`, `the inspector's "blocked by" of ${r.id}`, "sub"));
      if (live && inCur(r)) add(n, `rows(${r.id}).unit.issue`, `the WIP strip's "In progress" line`, "issue", "field", null, { plain: true });
    });
    const nx = live && w.next ? units.find(r => r.id === w.next && !inCur(r) && stateOf(r) === "pending") : null;
    if (nx) {
      add(nx.unit.issue, `rows(${nx.id}).unit.issue`, `the WIP strip's "Up next" line`, "issue", "field", null, { plain: true });
      (nx.unit.blockedBy || []).filter(m => { const b = units.find(x => x.unit.issue === m); return !(b && UNIT_LANDED.includes(stateOf(b))); })
        .forEach(m => add(m, `rows(${nx.id}).unit.blockedBy`, `the "blocked by" tags of the unit up next (${nx.id})`, "issue", "field", null, { plain: true }));
    }
  }
  /* text: a tracking board does not render plan.roadmap (it draws its own from the units) */
  const skipTop = new Set(["asBuilt", "baseline", "parent", "systems", ...(tracking ? ["roadmap"] : [])]);
  const scan = (v, at, ctx) => {
    if (typeof v === "string") {
      if (/\.ref$/.test(at) && /^PR #?\d+$/i.test(v.trim())) return;
      v.split("`").forEach((x, i) => { if (i % 2) return;
        const re = /(^|[\s(>;,])(?:(PR )#\d+|([\w.-]+\/[\w.-]+)#(\d+)|#(\d+))\b/g; let m;
        while ((m = re.exec(x))) { if (m[2]) continue; const n = parseInt(m[4] || m[5], 10); add(n, at, `#${n} in ${at}`, "sub", "text", m[3] || null); } });
      const ure = new RegExp(`github\\.com/${reEsc(repo)}/issues/(\\d+)\\b`, "g"); let u;
      while ((u = ure.exec(v))) add(parseInt(u[1], 10), at, `${at} (a GitHub URL written in the data)`, "sub", "url");
    } else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${at}[${i}]`, ctx));
    else if (v && typeof v === "object") Object.keys(v).forEach(k => {
      if (ISSUE_UNLINKED.has(k) || (at === "" && skipTop.has(k))) return;
      if (k === "name" && ctx !== "options") return;   // a row's name is plain text; an option's is linked text in the decision log
      if (k === "label" && ctx !== "trail") return;    // a milestone's or document's label is plain; a trail entry's is linked text
      scan(v[k], at ? `${at}.${k}` : k, k);
    });
  };
  scan(plan, "", null);
  return out;
}

/* The boards of the other issues a plan board names (plan/RULES.md §1): every issue in issueRefs (fields and text) that is neither
   this issue, nor its parent (parent.board), nor a unit of this tracking board (unit.board), and whose board's dashboard.html is
   in this tree, anywhere under docs/plans/. Returns { "<n>": "<path relative to dir>" } in issue order; {} outside a tree. */
function otherBoards(plan, dir) {
  const root = treeRoot(dir), want = {};
  if (!root || !plan) return want;
  const self = path.resolve(dir), par = plan.parent && plan.parent.issue;
  const units = new Set(plan.kind === "tracking" ? (plan.rows || []).filter(r => r.unit).map(r => r.unit.issue) : []);
  const named = [...new Set(issueRefs(plan).filter(r => r.how !== "url").map(r => r.n))].sort((a, b) => a - b);
  if (!named.length) return want;
  const all = boardFolders(root);
  named.forEach(n => {
    if (n === plan.issue || n === par || units.has(n)) return;
    const hit = all.find(b => b.issue === n && path.resolve(b.dir) !== self);
    if (hit) want[String(n)] = boardLink(dir, hit.dir);
  });
  return want;
}

/* Link every issue a plan board names to that issue's board, from the folders on disk (embed.js runs it before embedding, so
   nobody writes these links by hand; plan/RULES.md §1): a tracking board's units (unit.board, linkSubIssueBoards), the parent
   (parent.board: "../dashboard.html" when the enclosing folder is the parent's and holds its board, else null), and every other
   issue it names (issueBoards: { "<n>": path }, present only while one is linked). A link is made only to a file that exists, and
   cleared when the file is gone. Returns one line per change. */
function linkIssueBoards(plan, dir) {
  const changes = linkSubIssueBoards(plan, dir);
  if (!plan) return changes;
  if (plan.parent && Number.isInteger(plan.parent.issue)) {
    const hit = parentBoard(dir, plan.parent), want = hit ? hit.board : null;
    if ((plan.parent.board || null) !== want) {
      changes.push(`parent #${plan.parent.issue}: parent.board ${plan.parent.board ? JSON.stringify(plan.parent.board) : "unset"} → ${want ? JSON.stringify(want) : "null (the enclosing folder holds no board of #" + plan.parent.issue + ")"}`);
      plan.parent.board = want;
    }
  }
  const want = otherBoards(plan, dir), have = plan.issueBoards && typeof plan.issueBoards === "object" ? plan.issueBoards : {};
  if (JSON.stringify(have) !== JSON.stringify(want) || ("issueBoards" in plan && !Object.keys(want).length)) {
    new Set([...Object.keys(have), ...Object.keys(want)]).forEach(n => { if (have[n] !== want[n]) changes.push(`#${n}: issueBoards ${have[n] ? JSON.stringify(have[n]) : "unset"} → ${want[n] ? JSON.stringify(want[n]) : "removed (no board in this tree)"}`); });
    if (Object.keys(want).length) plan.issueBoards = want; else delete plan.issueBoards;
    if (!changes.length) changes.push(Object.keys(want).length ? "issueBoards: put in issue order" : "issueBoards: empty, removed");
  }
  return changes;
}

/* The markers of the templates that route an issue's links to its board (plan/RULES.md §1). SUB_BOARDS: the sub-issue rule (a
   tracking board's units; on the work board, every sub-issue with a board). ISSUE_BOARDS: the widened rule (every issue the page
   names that has a board: the parent, the units, every other issue; the WIP strip's unit lines and "blocked by" tags linked). A
   page with neither links every #n to GitHub. */
const SUB_BOARD_MARKER = "const SUB_BOARDS=";
const ISSUE_BOARD_MARKER = "const ISSUE_BOARDS=";
/* The link rule a page's template implements: 2 the widened rule, 1 the sub-issue rule, 0 neither. */
const linkRule = html => html.includes(ISSUE_BOARD_MARKER) ? 2 : html.includes(SUB_BOARD_MARKER) ? 1 : 0;

const skillDir = path.resolve(__dirname, "..");
module.exports = { repoRoot, opt, flag, registry, headingSlugs, openTag, readBlock, writeBlock, findPlans, subIssueBoard, linkSubIssueBoards,
  treeRoot, boardFolders, boardLink, parentBoard, issueRefs, otherBoards, linkIssueBoards, SUB_BOARD_MARKER, ISSUE_BOARD_MARKER, linkRule, skillDir };
