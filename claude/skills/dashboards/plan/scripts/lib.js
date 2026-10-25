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
  // A fence closes only on a line of the same character, at least as long as its opener, with nothing after it (CommonMark):
  // a ``` inside a ```` block (a diff of a Markdown file, say) is content, not a close.
  const seen = {}, out = new Set(); let fence = null;
  md.split(/\r?\n/).forEach(l => {
    const f = l.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null; return; }
    if (f && !(f[1][0] === "`" && f[2].includes("`"))) { fence = f[1]; return; }
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

/* The live run of a tracking board's units (plan/RULES.md §3, "The units' own runs"). While a tracking board is live, each unit in
   its wip.current whose sub-issue has a board in this tree carries unit.live: a mirror of that board's run state, its wip as the
   pipeline last left it (step, since, updated, detail, steps, waitingOn, resume, qa, qaMax, and proposedLevel while escalated) plus
   its status and branch. Nobody writes it by hand: embed.js writes it from the sub-issue's plan.json at every embed of the tracking
   board, and every embed of a sub-issue's board re-embeds its parent's (embed.js), so the mirror follows each event of the unit's
   run. A unit that is not in progress, or has no board, or a tracking board that has landed or was cancelled, carries none. */
const trackingLive = plan => !["built", "abandoned"].includes(plan.status) && !["landed", "cancelled"].includes((plan.wip || {}).step);
function unitRun(sub) {
  const w = (sub && sub.wip) || {};
  const run = { step: w.step || null, since: w.since || null, updated: w.updated || w.since || null, detail: w.detail || "",
    steps: Array.isArray(w.steps) ? w.steps : [], waitingOn: w.waitingOn || null, resume: w.resume || null,
    qa: Array.isArray(w.qa) ? w.qa : [], qaMax: w.qaMax || null, status: sub.status || null, branch: sub.branch || null };
  if (w.proposedLevel) run.proposedLevel = w.proposedLevel;
  return run;
}
/* The plan.json of a unit's sub-issue board, seen from the tracking board's folder `dir`, or null (no board, or one that does not
   parse, or a board of another issue). */
function subIssuePlan(dir, unit) {
  const hit = subIssueBoard(dir, unit); if (!hit) return null;
  try { const p = JSON.parse(fs.readFileSync(path.join(dir, hit.folder, "plan.json"), "utf8")); return p && p.issue === unit.issue ? p : null; } catch (e) { return null; }
}
/* What each unit's mirror should be now: [{ row, unit, inCur, want, have }] for every unit row, want null when it carries none. */
function unitRuns(plan, dir) {
  if (!plan || plan.kind !== "tracking") return [];
  const live = trackingLive(plan), cur = Array.isArray((plan.wip || {}).current) ? plan.wip.current : [];
  return (plan.rows || []).filter(r => r.unit && Number.isInteger(r.unit.issue)).map(r => {
    const inCur = cur.some(a => String(a).split(".")[0] === r.id), sub = live && inCur ? subIssuePlan(dir, r.unit) : null;
    return { row: r, unit: r.unit, inCur, want: sub ? unitRun(sub) : null, have: r.unit.live || null };
  });
}
/* The tracking board a sub-issue's board mirrors into (plan/RULES.md §3): the enclosing folder, when it is the parent's
   <issue>-<slug>/ and holds both plan.json and dashboard.html (parentBoard), else null. */
function parentFolder(dir, plan) {
  if (!plan || !plan.parent || !parentBoard(dir, plan.parent)) return null;
  const up = path.dirname(path.resolve(dir));
  return fs.existsSync(path.join(up, "plan.json")) ? up : null;
}
/* Write each unit's mirror (embed.js runs it before embedding). Returns one line per change. */
function mirrorUnitRuns(plan, dir) {
  const changes = [];
  unitRuns(plan, dir).forEach(x => {
    if (JSON.stringify(x.have) === JSON.stringify(x.want)) return;
    if (x.want) { x.unit.live = x.want; changes.push(`#${x.unit.issue}: run mirrored from its board, step ${x.want.step}, updated ${x.want.updated}${x.have ? ` (was step ${x.have.step}, updated ${x.have.updated})` : ""}`); }
    else if ("live" in x.unit) { delete x.unit.live; changes.push(`#${x.unit.issue}: run mirror cleared (${x.inCur ? "no board of its own in this tree, or the tracking board is not live" : "not in progress"})`); }
  });
  return changes;
}
const stampMs = s => { const t = Date.parse(String(s || "")); return isNaN(t) ? null : t; };
/* The mirrors that lag their sub-issue's board (check.js warns on each): "missing" (in progress with a board, no mirror), "older"
   (unit.live.updated earlier than the board's wip.updated), "differs" (not older, other content), "orphan" (a mirror embed.js
   would clear). */
function staleUnitRuns(plan, dir) {
  return unitRuns(plan, dir).map(x => {
    if (JSON.stringify(x.have) === JSON.stringify(x.want)) return null;
    if (!x.want) return { ...x, kind: "orphan" };
    if (!x.have) return { ...x, kind: "missing" };
    const h = stampMs(x.have.updated), w = stampMs(x.want.updated);
    return { ...x, kind: (h != null && w != null ? h < w : String(x.have.updated || "") < String(x.want.updated || "")) ? "older" : "differs" };
  }).filter(Boolean);
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
  "resume", "qa", "qaMax", "pass", "findings", "question", "questions", "landing", "chosen", "settles", "when", "issueBoards"]);
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
  // the units' runs first (a tracking board): a mirrored detail may name issues, which issueBoards then links
  changes.push(...mirrorUnitRuns(plan, dir));
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
/* A merged branch is not shown (plan/RULES.md §3, "Branches"), by the same rule as the template's PLAN_LANDED: an issue board's
   branch once the board has landed, a tracking board's once its own plan has landed (its wip.step, or the step a halt or an
   escalation resumes at, is past "landing"; its status is building or built; wip.landing records the plan's merge; or a unit has
   started). The branch a board shows, or null. */
function shownBranch(plan) {
  if (!plan || !plan.branch) return null;
  const w = plan.wip || {}, step = ["halted", "escalated"].includes(w.step) ? (w.resume || w.last || "") : w.step;
  if (plan.status === "built" || w.step === "landed") return null;
  if (plan.kind === "tracking") {
    const cur = (w.current || []).map(a => String(a).split(".")[0]);
    const started = (plan.rows || []).some(r => r.unit && (((r.asBuilt || {}).state || "pending") !== "pending" || cur.includes(r.id)));
    if (["building", "built"].includes(plan.status) || ["implementation", "landed"].includes(step) || (w.landing && (w.landing.pr || w.landing.merge)) || started) return null;
  }
  return plan.branch;
}
/* A unit's branch on the work board: shown until the unit has landed. */
const unitBranch = row => row && row.unit && row.unit.branch && !UNIT_LANDED.includes((row.asBuilt || {}).state) ? row.unit.branch : null;

/* The impact's reconciliation state (plan/RULES.md §2, Impact): derived from the board's data, never stored. impact.basis keeps
   two values, "plan" and "as-built"; the state has three:
   - "planned": basis plan, no impact.changes entry recorded and, on a tracking board, no unit landed;
   - "partial" (partly reconciled): basis plan, with an impact.changes entry recorded or a unit landed;
   - "as-built": basis as-built.
   An impact.changes entry with none: true is a unit's explicit "no change" record: on a tracking board every landed unit records its
   effect on the initiative's impact at its landing refresh, as the changes it made (each naming the unit) or as one such entry.
   Returns null while the board records no impact, else { state, basis, tracking, landed, total (tracking boards; units dropped or
   deferred left out of the total, as in the chain's progress), changes (the real changes), noChange (unit ids with a "no change"
   entry), unrecorded (unit ids landed with neither) }. check.js and board.js use it; the plan-board template's reconciliationOf()
   is the same rule, in the page's own runtime. */
const isNoChange = c => !!c && typeof c === "object" && c.none === true;
function reconciliation(plan) {
  const I = plan && plan.impact;
  if (!I || typeof I !== "object" || Array.isArray(I)) return null;
  const tracking = plan.kind === "tracking", st = r => (r.asBuilt || {}).state || "pending";
  const counted = tracking ? (plan.rows || []).filter(r => r && r.unit && !["dropped", "deferred"].includes(st(r))) : [];
  const landed = counted.filter(r => UNIT_LANDED.includes(st(r)));
  const changes = Array.isArray(I.changes) ? I.changes.filter(c => c && typeof c === "object") : [];
  const state = I.basis === "as-built" ? "as-built" : changes.length || landed.length ? "partial" : "planned";
  return { state, basis: I.basis, tracking, landed: tracking ? landed.length : null, total: tracking ? counted.length : null,
    changes: changes.filter(c => !isNoChange(c)).length,
    noChange: tracking ? [...new Set(changes.filter(isNoChange).map(c => c.unit))] : [],
    unrecorded: tracking ? landed.filter(r => !changes.some(c => c.unit === r.id)).map(r => r.id) : [] };
}
/* A sub-issue of a signed-off tracking plan (plan/RULES.md §2, columns 1-2; §4, sized): its board's Gap and Considered columns are
   filled at "sized" from the parent's documents, since its research and architecture happened in the parent's run. Returns the
   parent tracking board's { dir, plan } when the enclosing folder holds the parent's board and that board has passed
   architecture-signed-off (a "considered" milestone, or unit rows), else null. new.js and check.js use it. */
function signedOffParent(dir, plan) {
  const up = parentFolder(dir, plan); if (!up) return null;
  let p; try { p = JSON.parse(fs.readFileSync(path.join(up, "plan.json"), "utf8")); } catch (e) { return null; }
  if (!p || p.kind !== "tracking" || p.issue !== plan.parent.issue) return null;
  const signed = (p.milestones || []).some(m => m && m.column === "considered") || (p.rows || []).some(r => r && r.unit);
  return signed ? { dir: up, plan: p } : null;
}
/* The words for a state, shared by check.js and the work board's data. */
const RECON_WORDS = { planned: "planned", partial: "partly reconciled", "as-built": "as built" };
/* The step-to-column map (plan/RULES.md §3, "The glow follows the step"): what wip.current holds at each wip.step, written once
   for the scripts (check.js warns on a board that does not keep it; new.js lays the foundation's wip.current from it).
     none     nothing glows                                  sizing, branch, landing, landed, cancelled
     cells    the cell the question concerns, or nothing      interview (<row-id>.<column> addresses only, no whole column)
     research the Considered cells of the rows the research  research (researchGlow below: the open questions' rows, the whole
              questions name                                  Considered column as the fallback)
     columns  exactly these columns                           architecture: considered; plan: considered, verdict; qa: built
     built    the As built cells of the rows the stage, or    implementation, remediation (<row-id>.built addresses; at least one on
              the findings, touch                             an issue board; on a tracking board the units in progress, or none)
   halted and escalated keep the glow of the step they stopped in (wip.resume), drawn as a still ring. */
const GLOW_MAP = {
  sizing: { kind: "none" }, interview: { kind: "cells" }, research: { kind: "research" },
  architecture: { kind: "columns", cols: ["considered"] }, plan: { kind: "columns", cols: ["considered", "verdict"] }, branch: { kind: "none" },
  implementation: { kind: "built" }, qa: { kind: "columns", cols: ["built"] }, remediation: { kind: "built" },
  landing: { kind: "none" }, landed: { kind: "none" }, cancelled: { kind: "none" }
};
const COLUMN_NAMES = { gap: "Gap", considered: "Considered", verdict: "Verdict", built: "As built" };
/* Research glows the rows being researched (plan/RULES.md §3, "Research: the rows being researched"). wip.questions records the
   research questions of the run, each { question: "<slug>", rows: ["<row-id>", …], findings: null | "<path>" } (findings null:
   still open), from the research-started and research-returned events; researched clears it. While a question is open, the
   Considered cells of the rows the open questions name glow (their union); once every question has returned, the verification
   runs until researched, and RESEARCH_VERIFY_GLOW says what glows then: "rows" (the default: every question's rows again) or
   "column" (the whole Considered column). The whole Considered column glows instead (the fallback) when no question is recorded
   yet, when a question in the set names no row (rows [], or only ids that are not rows of the board), when the board has no rows,
   and when the cells would be more than six. Returns { current, phase, fallback }. */
const RESEARCH_VERIFY_GLOW = "rows";
const MAX_GLOW_CELLS = 6;
function researchGlow(plan) {
  const w = (plan && plan.wip) || {}, rows = Array.isArray(plan && plan.rows) ? plan.rows : [], ids = new Set(rows.map(r => r && r.id));
  const qs = Array.isArray(w.questions) ? w.questions.filter(q => q && typeof q === "object") : [];
  const open = qs.filter(q => q.findings == null), phase = !qs.length ? "none" : open.length ? "open" : "verifying";
  const column = (fallback) => ({ current: ["considered"], phase, fallback });
  if (phase === "none") return column("no research question is recorded yet");
  if (phase === "verifying" && RESEARCH_VERIFY_GLOW === "column") return column(null);
  if (!rows.length) return column("the board has no rows yet");
  const set = phase === "open" ? open : qs, cells = new Set();
  for (const q of set) {
    const own = (Array.isArray(q.rows) ? q.rows : []).map(String).filter(id => ids.has(id));
    if (!own.length) return column(`question "${q.question}" names no row of the board`);
    own.forEach(id => cells.add(id + ".considered"));
  }
  if (cells.size > MAX_GLOW_CELLS) return column(`${cells.size} cells would glow, more than ${MAX_GLOW_CELLS}`);
  return { current: rows.map(r => r.id + ".considered").filter(a => cells.has(a)), phase, fallback: null };
}
/* The wip.current a step starts with when nothing more is known (new.js): its columns, else nothing; research, the whole
   Considered column until a question is recorded. */
const glowFor = step => { const m = GLOW_MAP[step]; return m && m.kind === "columns" ? m.cols.slice() : m && m.kind === "research" ? ["considered"] : []; };
/* The map, applied to a board: null when wip.current keeps it (or it cannot be judged: a halt with no wip.resume, a board that
   has landed or was abandoned, whose glow is off anyway), else { step, via, want, bad }: the step judged (wip.resume for a halted
   or escalated board, named in via), the columns the map gives it in words, and the addresses (or the absence) that break it. */
function glowMismatch(plan) {
  const w = (plan && plan.wip) || {}, cur = Array.isArray(w.current) ? w.current.map(String) : [];
  if (plan.status === "built" || plan.status === "abandoned" || w.step === "landed") return null;
  const via = ["halted", "escalated"].includes(w.step) ? w.step : null, step = via ? w.resume : w.step;
  const m = GLOW_MAP[step]; if (!m) return null;
  const tracking = plan.kind === "tracking", rows = Array.isArray(plan.rows) ? plan.rows : [];
  const unitRow = id => rows.some(r => r && r.id === id && r.unit);
  const cols = m.kind === "columns" ? m.cols : [], words = cs => cs.map(c => `${COLUMN_NAMES[c]} (${JSON.stringify(c)})`).join(" and ");
  let want, bad = [];
  if (m.kind === "none") { want = "nothing"; bad = cur; }
  else if (m.kind === "research") {
    const g = researchGlow(plan), want0 = g.current;
    want = (g.fallback || want0[0] === "considered" ? `the whole Considered column, as ["considered"]${g.fallback ? ` (the fallback: ${g.fallback})` : " (the verification, RESEARCH_VERIFY_GLOW \"column\")"}` : `the Considered cells of the rows the ${g.phase === "open" ? "open research questions name" : "research questions named (the verification)"}, as ${JSON.stringify(want0)}`);
    bad = cur.filter(a => !want0.includes(a)).map(a => a.endsWith(".considered") && want0[0] !== "considered" ? `${a} (no open question names its row)` : a);
    const miss = want0.filter(a => !cur.includes(a)); if (miss.length) bad.push(`${miss.join(", ")} missing`);
  }
  else if (m.kind === "cells") { want = "the cell the question concerns (<row-id>.<column>), or nothing"; bad = cur.filter(a => a.split(".").length !== 2); }
  else if (m.kind === "columns") {
    want = `the ${words(cols)} column${cols.length > 1 ? "s" : ""}, as ${JSON.stringify(cols)}`; bad = cur.filter(a => !cols.includes(a));
    const miss = cols.filter(c => !cur.includes(c)); if (!bad.length && miss.length) bad = [`${miss.join(", ")} missing`];
  } else {
    want = tracking ? "the As built cells of the units in progress (<unit-id>.built), or nothing between units"
      : `the As built cells of the rows the ${step === "remediation" ? "qa findings touch" : "stage touches"} (<row-id>.built)`;
    bad = cur.filter(a => { const p = a.split("."); return p.length !== 2 || p[1] !== "built" || (tracking && !unitRow(p[0])); });
    if (!bad.length && !cur.length && !tracking) bad = ["no As built cell named"];
  }
  return bad.length ? { step, via, want, bad } : null;
}

module.exports = { GLOW_MAP, glowFor, glowMismatch, researchGlow, RESEARCH_VERIFY_GLOW, reconciliation, isNoChange, RECON_WORDS, signedOffParent,shownBranch, unitBranch,repoRoot, opt, flag, registry, headingSlugs, openTag, readBlock, writeBlock, findPlans, subIssueBoard, linkSubIssueBoards,
  trackingLive, unitRun, subIssuePlan, unitRuns, mirrorUnitRuns, parentFolder, staleUnitRuns, stampMs, treeRoot, boardFolders, boardLink, parentBoard, issueRefs, otherBoards, linkIssueBoards, SUB_BOARD_MARKER, ISSUE_BOARD_MARKER, linkRule, skillDir };
