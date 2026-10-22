#!/usr/bin/env node
// Regenerate the repository work board (plan/RULES.md §5): docs/plans/board.json from every plan.json under docs/plans/ plus the
// tracker (gh: issues, sub-issues, parents, blocked-by), then docs/plans/index.html from template/board.html with board.json
// embedded verbatim.
//   node board.js [--root <repo>] [--ref <branch>] [--refresh-template] [--no-gh] [--live]
// The root is --root, else the current directory. A row's "system" for an issue with no board, and an unscheduled issue's
// "system", are the presenter's: board.js keeps them from the previous board.json. --refresh-template copies the template over
// an existing index.html. --no-gh builds from the boards alone (no tracker rows, roadmap or unscheduled issues).
// --ref names the branch the board reflects (default: the checked-out branch). In a landing refresh the tree is a docs branch cut
// at the merged commit, so pass the default branch (e.g. --ref master): the board then names the commit it shows, not the branch
// it was written on. Unit states and the next unit are read as plan/RULES.md §2-§3 set them: a unit row that is complete reads
// "complete", one that is landed (or as-planned, amended or deviated, on a board written before those states) reads "landed", and
// the unit a tracking board names in wip.next reads "next", never active, with the blockers that have not landed.
// --live builds the live work board (presenter brief, plan-board mode): run it on the repository's main checkout. It reads the
// boards of every worktree of the repository (git worktree list; the root first), keeps for each issue the freshest board (the
// latest wip.updated, else wip.since, else asBuilt.date; the root's on a tie), and writes docs/plans/.live/board.json and
// index.html, never the committed docs/plans/board.json and index.html. Its links reach each board where it lives: relative
// when they can, a file URL into a worktree on another drive otherwise; the folder is local only (.git/info/exclude).
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), url = require("url");
const { repoRoot, flag, opt, registry, findPlans } = require("./lib.js");
const { embed } = require("./embed.js");

const args = process.argv.slice(2);
let root; try { root = repoRoot(args); } catch (e) { console.error(e.message); process.exit(2); }
const live = flag(args, "live");
const plansDir = path.join(root, "docs", "plans"), outDir = live ? path.join(plansDir, ".live") : plansDir;
const jsonPath = path.join(outDir, "board.json"), htmlPath = path.join(outDir, "index.html");
const reg = registry(root);
const sh = (cmd, a) => cp.execFileSync(cmd, a, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const prevPath = fs.existsSync(jsonPath) ? jsonPath : path.join(plansDir, "board.json");
const prev = fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, "utf8")) : {};
const prevRow = n => (prev.rows || []).find(r => r.issue === n) || {};
const prevUn = n => (prev.unscheduled || []).find(r => r.issue === n) || {};

/* Boards */
/* The trees whose boards count: the root alone, or with --live every worktree of the repository, the root first. */
const trees = !live ? [root] : (() => {
  let wt = []; try { wt = sh("git", ["worktree", "list", "--porcelain"]).split(/\r?\n/).filter(l => l.startsWith("worktree ")).map(l => path.resolve(l.slice(9))); } catch (e) { /* not a git tree */ }
  return [root, ...wt.filter(t => path.relative(t, root) !== "" && fs.existsSync(path.join(t, "docs", "plans")))];
})();
const fresh = b => String((b.plan.wip || {}).updated || (b.plan.wip || {}).since || (b.plan.asBuilt || {}).date || "");
const boards = [];
trees.forEach(t => findPlans(t).forEach(p => {
  const b = { ...p, root: t, plan: JSON.parse(fs.readFileSync(path.join(p.dir, "plan.json"), "utf8")) };
  const k = boards.findIndex(x => x.plan.issue === b.plan.issue);
  if (k < 0) boards.push(b); else if (fresh(b) > fresh(boards[k])) boards[k] = b;
}));
const boardOf = n => boards.find(b => b.plan.issue === n);
/* A link from the board's own folder to a path in a tree: relative, or a file URL where none exists (a worktree on another drive). */
const relFromPlans = (p, t = root) => { const abs = path.join(t, p), rel = path.relative(outDir, abs);
  // no trailing slash on either form, as path.relative gives none: callers add it for a folder
  return path.isAbsolute(rel) ? url.pathToFileURL(abs).href.replace(/\/$/, "") : rel.split(path.sep).join("/"); };
const repo = (reg && reg.reg.repo) || (boards[0] && boards[0].plan.repo) || (() => { try { const m = sh("git", ["remote", "get-url", "origin"]).trim().match(/[:/]([^/:]+\/[^/]+?)(\.git)?$/); return m && m[1]; } catch (e) { return null; } })();
if (!repo) { console.error("cannot tell the repository (no registry, no board, no origin remote)"); process.exit(2); }
const [owner, name] = repo.split("/");

/* Tracker */
let issues = [], gq = {};
if (!flag(args, "no-gh")) {
  issues = JSON.parse(sh("gh", ["issue", "list", "--repo", repo, "--state", "all", "--limit", "1000", "--json", "number,title,state,labels,createdAt"]));
  const want = new Set([...issues.filter(i => i.state === "OPEN").map(i => i.number), ...boards.map(b => b.plan.issue)]);
  const nums = [...want];
  for (let i = 0; i < nums.length; i += 25) {
    const chunk = nums.slice(i, i + 25);
    const node = "number title state repository{nameWithOwner}";
    const q = `query{repository(owner:"${owner}",name:"${name}"){${chunk.map(n => `i${n}:issue(number:${n}){number parent{number} subIssues(first:50){nodes{${node}}} blockedBy(first:30){nodes{${node}}} blocking(first:30){nodes{${node}}}}`).join(" ")}}}`;
    const r = JSON.parse(sh("gh", ["api", "graphql", "-f", "query=" + q]));
    Object.values(r.data.repository).forEach(x => { if (x) gq[x.number] = x; });
  }
}
const issueOf = n => issues.find(i => i.number === n);
const levelOf = i => { const l = i && i.labels.find(x => /^level: [1-4]$/.test(x.name)); return l ? parseInt(l.name.slice(7), 10) : null; };
const ref = x => ({ issue: x.number, repo: x.repository && x.repository.nameWithOwner !== repo ? x.repository.nameWithOwner : undefined, state: x.state });
const sysInfo = slug => slug ? ((reg && reg.info(slug)) || { slug, name: slug, slot: 0, top: slug }) : null;

/* Tracking issues: labelled, with sub-issues, or a tracking board */
const trackingNums = new Set([...issues.filter(i => i.state === "OPEN" && (i.labels.some(l => l.name === "type: tracking") || ((gq[i.number] || {}).subIssues || { nodes: [] }).nodes.length)).map(i => i.number), ...boards.filter(b => b.plan.kind === "tracking" && b.plan.status !== "built").map(b => b.plan.issue)]);
const unitRow = n => { for (const b of boards) { if (b.plan.kind !== "tracking") continue; const r = (b.plan.rows || []).find(x => x.unit && x.unit.issue === n); if (r) return { board: b, row: r }; } return null; };
/* Unit states (plan/RULES.md §2): pending, complete (qa passed, not merged), landed. A tracking board written before complete and
   landed existed marked a landed unit as-planned, amended or deviated; those read as landed too. */
const LANDED_STATES = new Set(["landed", "as-planned", "amended", "deviated"]);
const unitState = u => (u && u.row.asBuilt && u.row.asBuilt.state) || "pending";
/* The next unit of each live tracking board (wip.next, plan/RULES.md §3), by issue number. */
const nextUnits = new Map();
boards.forEach(b => { if (b.plan.kind !== "tracking" || b.plan.status === "built") return; const id = (b.plan.wip || {}).next; const r = id && (b.plan.rows || []).find(x => x.id === id && x.unit && x.unit.issue); if (r) nextUnits.set(r.unit.issue, { board: b, row: r }); });
/* Whether an issue has landed: its own board is built, or its unit row has landed; an issue on no board reads the tracker. */
const landedIssue = (n, other) => {
  if (other) return other.state === "CLOSED";
  const b = boardOf(n), u = unitRow(n);
  if (b && b.plan.status === "built") return true;
  if (u) return LANDED_STATES.has(unitState(u));
  const i = issueOf(n); return !!(i && i.state === "CLOSED");
};

/* Rows: every issue with a board or a level label */
/* ...and every unit of a tracking board, so the chain (and its next unit) shows even without a level label or the tracker. */
const unitNums = boards.filter(b => b.plan.kind === "tracking").flatMap(b => (b.plan.rows || []).filter(r => r.unit && Number.isInteger(r.unit.issue) && r.unit.issue > 0).map(r => r.unit.issue));
const rowNums = new Set([...boards.map(b => b.plan.issue), ...issues.filter(i => levelOf(i)).map(i => i.number), ...unitNums]);
const ACTIVE_STEPS = new Set(["sizing", "interview", "research", "architecture", "plan", "branch", "implementation", "qa", "remediation", "landing"]);
const rows = [...rowNums].map(n => {
  const i = issueOf(n), g = gq[n] || {}, b = boardOf(n), u = unitRow(n), p = prevRow(n);
  const row = { issue: n, title: (i && i.title) || (b && b.plan.issueTitle) || (b && b.plan.title) || (u && u.row.name) || `#${n}`, state: i ? i.state : ((b && b.plan.status === "built") || (u && LANDED_STATES.has(unitState(u))) ? "CLOSED" : "OPEN"), level: levelOf(i) || (b && b.plan.level) || (u && u.row.unit.level) || null, created: i ? i.createdAt.slice(0, 10) : null,
    parent: (g.parent && g.parent.number) || (b && b.plan.parent && b.plan.parent.issue) || (u && u.board.plan.issue) || null,
    waitsOn: ((g.blockedBy || {}).nodes || []).map(ref), blocks: ((g.blocking || {}).nodes || []).map(ref) };
  if (b) {
    const w = b.plan.wip || {}, s = b.plan.status;
    Object.assign(row, { board: relFromPlans(b.folder + "/dashboard.html", b.root), folder: relFromPlans(b.folder, b.root) + "/", branch: b.plan.branch || null, system: b.plan.kind === "tracking" ? null : ((b.plan.systems || [])[0] || {}).slug || null,
      step: w.step || null, detail: w.step === "halted" ? `Waiting on the user: ${w.waitingOn || w.detail || ""}` : (w.detail || ""), since: w.since || null, updated: w.updated || null, qa: w.qa || [], qaMax: w.qaMax || null,
      status: s === "built" || unitState(u) === "landed" ? "landed" : s === "abandoned" || w.step === "cancelled" ? "abandoned" : w.step === "halted" ? "halted" : w.step === "escalated" ? "escalated" : u && unitState(u) === "complete" ? "complete" : s === "building" ? "building" : "planning",
      landed: s === "built" ? { pr: (b.plan.asBuilt || {}).pr || null, merge: (b.plan.asBuilt || {}).merge || null, version: (b.plan.asBuilt || {}).version || null, date: (b.plan.asBuilt || {}).date || null } : null });
    row.active = ACTIVE_STEPS.has(w.step) && ["planned", "building"].includes(s);
    if (b.plan.kind === "tracking") row.active = false; // the chain's active unit glows on its own row
  } else if (u) {
    const w = u.board.plan.wip || {}, cur = (w.current || []).some(a => a.split(".")[0] === u.row.id), st = unitState(u);
    Object.assign(row, { board: u.row.unit.board ? relFromPlans(u.board.folder + "/" + u.row.unit.board, u.board.root) : null, folder: u.row.unit.folder && !/^https?:/.test(u.row.unit.folder) ? relFromPlans(u.board.folder + "/" + u.row.unit.folder, u.board.root) + (u.row.unit.folder.endsWith("/") ? "/" : "") : (u.row.unit.folder || null), branch: u.row.unit.branch || null, system: u.row.system,
      step: cur ? w.step : null, detail: cur ? (w.detail || "") : ((u.row.asBuilt || {}).summary || ""), qa: cur ? (w.qa || []) : [], qaMax: cur ? w.qaMax : null,
      status: LANDED_STATES.has(st) ? "landed" : st === "complete" ? "complete" : st === "dropped" ? "abandoned" : cur ? (w.step === "halted" ? "halted" : "building") : "not-started", landed: null });
    row.active = cur && ACTIVE_STEPS.has(w.step);
  } else Object.assign(row, { board: null, folder: null, branch: null, system: p.system || null, step: null, detail: p.note || "", qa: [], status: "no-board", active: false, landed: null });
  /* The next unit (wip.next): "next · not started", never building or active, tagged with each blocker that has not landed. */
  const nx = nextUnits.get(n);
  if (nx && row.status !== "landed") {
    const own = (nx.row.unit.blockedBy || []).map(x => ({ issue: x })), tracked = ((g.blockedBy || {}).nodes || []).map(ref);
    const all = [...own, ...tracked.filter(t => !own.some(o => o.issue === t.issue && !t.repo))];
    Object.assign(row, { status: "next", active: false, step: null, qa: [], next: true,
      blockedBy: all.filter(x => !landedIssue(x.issue, x.repo ? x : null)).map(x => ({ issue: x.issue, repo: x.repo })) });
  }
  const si = sysInfo(row.system); row.systemName = si ? si.name : null;
  // A tracking issue spans several systems: it names their top-level systems and takes no colour of its own.
  if (b && b.plan.kind === "tracking") row.systemName = [...new Set((b.plan.systems || []).map(x => x.top || x.name))].join(", ");
  return row;
});

/* Groups: each tracking issue in landing order (its board's unit rows, else its sub-issues' order), then the rest by age */
const groups = [], order = new Map();
[...trackingNums].sort((a, b) => a - b).forEach(t => {
  const tb = boardOf(t), i = issueOf(t);
  groups.push({ key: String(t), issue: t, title: (i && i.title) || (tb && tb.plan.issueTitle) || `#${t}`, board: tb ? relFromPlans(tb.folder + "/dashboard.html", tb.root) : null });
  const seq = tb ? (tb.plan.rows || []).filter(r => r.unit).map(r => r.unit.issue) : ((gq[t] || {}).subIssues || { nodes: [] }).nodes.map(x => x.number);
  [t, ...seq].forEach((n, k) => { if (!order.has(n)) order.set(n, { group: String(t), order: k }); });
});
groups.push({ key: "other", issue: null, title: "Other runs, oldest first", board: null });
const rest = rows.filter(r => !order.has(r.issue)).sort((a, b) => String(a.created || "").localeCompare(String(b.created || "")) || a.issue - b.issue);
rest.forEach((r, k) => order.set(r.issue, { group: "other", order: k }));
rows.forEach(r => Object.assign(r, order.get(r.issue)));
rows.sort((a, b) => groups.findIndex(g => g.key === a.group) - groups.findIndex(g => g.key === b.group) || a.order - b.order);

/* Roadmap and unscheduled issues (Context) */
const claimed = new Set();
const roadmap = [...trackingNums].sort((a, b) => a - b).map(t => {
  const g = groups.find(x => x.issue === t), items = ((gq[t] || {}).subIssues || { nodes: [] }).nodes.map(x => { claimed.add(x.number); return { issue: x.number, title: x.title, state: x.state, level: levelOf(issueOf(x.number)) }; });
  claimed.add(t); return { issue: t, title: g.title, state: (issueOf(t) || {}).state || "OPEN", board: g.board, items };
});
const unscheduled = issues.filter(i => i.state === "OPEN" && !claimed.has(i.number)).sort((a, b) => b.number - a.number)
  .map(i => ({ issue: i.number, title: i.title, labels: i.labels.map(l => l.name).filter(l => !/^level: /.test(l)), created: i.createdAt.slice(0, 10), system: prevUn(i.number).system || (rows.find(r => r.issue === i.number) || {}).system || null }));

const used = new Set([...rows.map(r => r.system), ...unscheduled.map(u => u.system)].filter(Boolean));
let tree = {}; try { tree = { ref: opt(args, "ref", null) || sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim(), sha: sh("git", ["rev-parse", "--short", "HEAD"]).trim() }; } catch (e) { /* not a git tree */ }
const now = new Date();
if (live) tree = {}; // the live board names no one tree: its boards come from every worktree
const board = { schema: "work-board/1", repo, generated: now.toISOString().replace(/\.\d+Z$/, "Z"), asOf: now.toISOString().slice(0, 10), tree,
  ...(live ? { live: { worktrees: trees.length }, base: "../" } : {}),
  systems: [...used].map(sysInfo), groups: groups.filter(g => rows.some(r => r.group === g.key)), rows, roadmap, unscheduled };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(board, null, 2) + "\n");
// the live board is always the current template: it is regenerated at every event and never committed
if (!fs.existsSync(htmlPath) || live || flag(args, "refresh-template")) fs.copyFileSync(path.resolve(__dirname, "..", "template", "board.html"), htmlPath);
embed(outDir);
console.log(`${live ? `live board, ${trees.length} worktree${trees.length === 1 ? "" : "s"}: ` : ""}board.json: ${rows.length} runs in ${board.groups.length} groups, ${roadmap.length} roadmap items, ${unscheduled.length} unscheduled issues; index.html embedded`);
const noSys = [...rows.filter(r => !r.system && !trackingNums.has(r.issue)).map(r => "#" + r.issue), ...unscheduled.filter(u => !u.system).map(u => "#" + u.issue)];
if (noSys.length) console.log(`no system recorded for ${noSys.join(", ")}: set "system" on those entries in board.json once, and board.js keeps it`);
