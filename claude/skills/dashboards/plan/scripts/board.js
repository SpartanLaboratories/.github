#!/usr/bin/env node
// Regenerate the repository work board (plan/RULES.md §5): docs/plans/board.json from every plan.json under docs/plans/ plus the
// tracker (gh: issues, sub-issues, parents, blocked-by), then docs/plans/index.html from template/board.html with board.json
// embedded verbatim.
//   node board.js [--root <repo>] [--ref <branch>] [--refresh-template] [--no-gh] [--live]
// The root is --root, else the current directory. A row's "system" for an issue with no board, and an unscheduled issue's
// "system", are the presenter's: board.js keeps them from the previous board.json (the one it writes, then the other of the
// committed and the live board, so a decision recorded on either carries over). An entry the user decided belongs to no system
// (a docs-only issue that changes only a planning record, say) records "unassigned": true with "system" null: board.js keeps it,
// shows "no system" on the row and stops reporting it as missing a system. --refresh-template copies the template over
// an existing index.html. --no-gh builds from the boards alone (no tracker rows, roadmap or unscheduled issues).
// --ref names the branch the board reflects (default: the checked-out branch). In a landing refresh the tree is a docs branch cut
// at the merged commit, so pass the default branch (e.g. --ref master): the board then names the commit it shows, not the branch
// it was written on. Unit states and the next unit are read as plan/RULES.md §2-§3 set them: a unit row that is complete reads
// "complete", one that is landed (or as-planned, amended or deviated, on a board written before those states) reads "landed", and
// the unit a tracking board names in wip.next reads "next", never active, with the blockers that have not landed. A row's "board"
// is set only when that board's dashboard.html exists, and the page links that issue's #n to it, a tracking issue's as much as a sub-issue's (plan/RULES.md §1, §5).
// A row with a board carries "reconciliation", its impact's reconciliation state as lib.js reconciliation() derives it (planned,
// partial or as-built, with landed and total units on a tracking board), or null while the board records no impact (plan/RULES.md §2, §5).
// A row with no board of its own and no tracking board's unit row to read (a boardless row: any issue the tracker sizes, whatever
// its level) takes its state from the tracker (plan/RULES.md §5, "Boardless rows"): closed as not planned, "not-planned" ("closed ·
// not planned", never landed); closed otherwise, "landed"; open with a pull request
// that refers to it merged, "merged" (awaiting close); open with an open pull request or a branch that refers to it, "in-progress"
// (solid, never active: there is no run board to mirror); otherwise "not-started". A pull request refers to an issue when GitHub
// links it as closing the issue (closedByPullRequestsReferences) or its head branch names the issue; a branch refers to it when
// GitHub links it to the issue (linkedBranches) or its name names the issue (branchNames(): "issue-62", "62-slug" or "fix/62" as a
// path segment, never a number inside a word). The row records what it read as "tracker": { branch, pr: { number, state } }.
// --live builds the live work board (presenter brief, plan-board mode): run it on the repository's main checkout. It reads the
// boards of every worktree of the repository (git worktree list; the root first), keeps for each issue the freshest board (the
// latest wip.updated, else wip.since, else asBuilt.date, or a later unit.live.updated it mirrors; the root's on a tie), and writes docs/plans/.live/board.json and
// index.html, never the committed docs/plans/board.json and index.html. Its links reach each board where it lives: relative
// when they can, a file URL into a worktree on another drive otherwise; the folder is local only (.git/info/exclude).
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), url = require("url");
const { repoRoot, flag, opt, registry, findPlans, subIssueBoard, shownBranch, unitBranch, reconciliation, leftForLater, boardlessState } = require("./lib.js");
/* A closed issue's reason, kept on every row, roadmap item and waits-on/blocks entry that the tracker read: "NOT_PLANNED" reads
   "closed · not planned" on the page, never landed (plan/RULES.md §5); open issues and the other reasons record none. */
const reasonOf = x => x && x.state === "CLOSED" && x.stateReason ? { stateReason: x.stateReason } : {};
const { embed } = require("./embed.js");

const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: "usage: node board.js [--root <repo>] [--ref <branch>] [--refresh-template] [--no-gh] [--live]\nRegenerates docs/plans/board.json and index.html (with --live, docs/plans/.live/ instead).", valued: ["root", "ref"], flags: ["refresh-template", "no-gh", "live"], max: 0 });
let root; try { root = repoRoot(args); } catch (e) { console.error(e.message); process.exit(2); }
const live = flag(args, "live");
const plansDir = path.join(root, "docs", "plans"), outDir = live ? path.join(plansDir, ".live") : plansDir;
const jsonPath = path.join(outDir, "board.json"), htmlPath = path.join(outDir, "index.html");
const reg = registry(root);
const sh = (cmd, a) => cp.execFileSync(cmd, a, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
/* The presenter's decisions (a row's or an unscheduled issue's system, or "unassigned"): from the board this run writes, then from
   the other of the committed and the live board, so one recorded between landings on the live board reaches the next landing's. */
const readJson = p => { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {}; } catch (e) { return {}; } };
const prevs = [...new Set([jsonPath, path.join(plansDir, "board.json"), path.join(plansDir, ".live", "board.json")])].map(readJson);
const decided = x => !!(x && (x.system || x.unassigned === true));
const prevOf = key => n => { const all = prevs.map(p => (p[key] || []).find(r => r.issue === n)).filter(Boolean); return all.find(decided) || all[0] || {}; };
const prevRow = prevOf("rows"), prevUn = prevOf("unscheduled");

/* Boards */
/* The trees whose boards count: the root alone, or with --live every worktree of the repository, the root first. */
const trees = !live ? [root] : (() => {
  let wt = []; try { wt = sh("git", ["worktree", "list", "--porcelain"]).split(/\r?\n/).filter(l => l.startsWith("worktree ")).map(l => path.resolve(l.slice(9))); } catch (e) { /* not a git tree */ }
  return [root, ...wt.filter(t => path.relative(t, root) !== "" && fs.existsSync(path.join(t, "docs", "plans")))];
})();
/* How fresh a board is: its own wip.updated (else since, else asBuilt.date), or, on a tracking board, the latest run it mirrors from
   a unit in progress (unit.live.updated, plan/RULES.md §3), whichever is later: a re-embed that only refreshed the mirror still
   makes that copy the freshest. */
const fresh = b => { const w = b.plan.wip || {};
  return [String(w.updated || w.since || (b.plan.asBuilt || {}).date || ""), ...(b.plan.rows || []).map(r => String(((r.unit || {}).live || {}).updated || ""))].sort().pop(); };
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

/* Tracker. The reads run in parallel, in two rounds (shAll(): one child process that runs its commands at once), since the live
   work board is regenerated at every board event and its time is mostly the tracker's round trips (plan/scripts/apply-event.js, the
   fast path): round 1 the issue list, the pull requests, the remote and local branches and the graph of every issue with a board;
   round 2 the graph of the open issues round 1 did not cover. What is read, and what a failed read does, is as before: the issue
   list and the graph are required, the pull requests and the branches are logged and left out. */
const PAR = 'const cp=require("child_process");const [cwd,jobs]=JSON.parse(process.argv[1]);Promise.all(jobs.map(([c,a])=>new Promise(r=>cp.execFile(c,a,{cwd,encoding:"utf8",maxBuffer:268435456,windowsHide:true},(e,o,er)=>r(e?{error:String(e.message||e).split("\\n")[0]+(er?" "+String(er).split("\\n")[0]:"")}:{out:o}))))).then(x=>process.stdout.write(JSON.stringify(x)));';
const shAll = jobs => jobs.length ? JSON.parse(cp.execFileSync(process.execPath, ["-e", PAR, JSON.stringify([root, jobs])], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 })) : [];
const must = (r, what) => { if (r.error) throw new Error(`${what} failed: ${r.error}`); return r.out; };
const graphJobs = nums => { const jobs = [];
  for (let i = 0; i < nums.length; i += 25) {
    const chunk = nums.slice(i, i + 25);
    const node = "number title state stateReason repository{nameWithOwner}";
    const q = `query{repository(owner:"${owner}",name:"${name}"){${chunk.map(n => `i${n}:issue(number:${n}){number parent{number} closedByPullRequestsReferences(first:20,includeClosedPrs:true){nodes{number state headRefName}} linkedBranches(first:10){nodes{ref{name}}} subIssues(first:50){nodes{${node}}} blockedBy(first:30){nodes{${node}}} blocking(first:30){nodes{${node}}}}`).join(" ")}}}`;
    jobs.push(["gh", ["api", "graphql", "-f", "query=" + q]]);
  }
  return jobs; };
const takeGraph = rs => rs.forEach(r => Object.values(JSON.parse(must(r, "gh api graphql")).data.repository).forEach(x => { if (x) gq[x.number] = x; }));
let issues = [], gq = {};
/* Pull requests and branches, for the boardless rows (plan/RULES.md §5): every pull request with its head branch, and every branch
   on the remote and in the local repository (the root's refs; with --live, every worktree shares them). */
let prs = [], branches = [];
if (!flag(args, "no-gh")) {
  const boardNums = [...new Set(boards.map(b => b.plan.issue))], g1 = graphJobs(boardNums);
  const [il, pl, rb, lb, ...gr1] = shAll([
    ["gh", ["issue", "list", "--repo", repo, "--state", "all", "--limit", "1000", "--json", "number,title,state,stateReason,labels,createdAt"]],
    ["gh", ["pr", "list", "--repo", repo, "--state", "all", "--limit", "1000", "--json", "number,state,headRefName"]],
    ["gh", ["api", "--paginate", `repos/${repo}/branches?per_page=100`, "--jq", ".[].name"]],
    ["git", ["for-each-ref", "--format=%(refname:short)", "refs/heads"]], ...g1]);
  issues = JSON.parse(must(il, "gh issue list"));
  takeGraph(gr1);
  const rest = [...new Set(issues.filter(i => i.state === "OPEN").map(i => i.number))].filter(n => !boardNums.includes(n));
  takeGraph(shAll(graphJobs(rest)));
  if (pl.error) console.log("could not list pull requests: " + pl.error); else prs = JSON.parse(pl.out);
  if (rb.error) console.log("could not list remote branches: " + rb.error); else branches = rb.out.split(/\r?\n/).filter(Boolean);
  if (!lb.error) branches.push(...lb.out.split(/\r?\n/).filter(Boolean)); // not a git tree: no local branches
  branches = [...new Set(branches)];
}
/* The tracker's state of a boardless row (plan/RULES.md §5, "Boardless rows"): lib.js boardlessState(). */
const trackerState = (n, i) => { const g = gq[n] || {};
  return boardlessState(n, i ? i.state : "OPEN", (g.closedByPullRequestsReferences || {}).nodes || [], ((g.linkedBranches || {}).nodes || []).map(x => x && x.ref && x.ref.name).filter(Boolean), prs, branches, i ? i.stateReason : null); };
const issueOf = n => issues.find(i => i.number === n);
const levelOf = i => { const l = i && i.labels.find(x => /^level: [1-4]$/.test(x.name)); return l ? parseInt(l.name.slice(7), 10) : null; };
const ref = x => ({ issue: x.number, repo: x.repository && x.repository.nameWithOwner !== repo ? x.repository.nameWithOwner : undefined, state: x.state, ...reasonOf(x) });
/* A system's name and colour slot: the registry's; else, in a repository with no registry entry for it yet, the slot the boards
   themselves give it (plan.json systems), so a row keeps the colour its own board shows (GUIDANCE.md §1); else no colour. */
const boardSys = slug => { for (const b of boards) { const s = (b.plan.systems || []).find(x => x && x.slug === slug); if (s) return { slug, name: s.name || slug, slot: Number.isInteger(s.slot) ? s.slot : 0, top: s.top || s.name || slug }; } return null; };
const sysInfo = slug => slug ? ((reg && reg.info(slug)) || boardSys(slug) || { slug, name: slug, slot: 0, top: slug }) : null;

/* Tracking issues: labelled, with sub-issues, or a tracking board */
const trackingNums = new Set([...issues.filter(i => i.state === "OPEN" && (i.labels.some(l => l.name === "type: tracking") || ((gq[i.number] || {}).subIssues || { nodes: [] }).nodes.length)).map(i => i.number), ...boards.filter(b => b.plan.kind === "tracking" && b.plan.status !== "built").map(b => b.plan.issue)]);
const unitRow = n => { for (const b of boards) { if (b.plan.kind !== "tracking") continue; const r = (b.plan.rows || []).find(x => x.unit && x.unit.issue === n); if (r) return { board: b, row: r }; } return null; };
/* Unit states (plan/RULES.md §2): pending, complete (qa passed, not merged), landed. A tracking board written before complete and
   landed existed marked a landed unit as-planned, amended or deviated; those read as landed too. */
const LANDED_STATES = new Set(["landed", "as-planned", "amended", "deviated"]);
const unitState = u => (u && u.row.asBuilt && u.row.asBuilt.state) || "pending";
/* The next unit of each live tracking board (wip.next, plan/RULES.md §3), by issue number. */
const nextUnits = new Map();
boards.forEach(b => { if (b.plan.kind !== "tracking" || b.plan.status === "built") return; const id = (b.plan.wip || {}).next; const r = id && (b.plan.rows || []).find(x => x.id === id && x.unit && x.unit.issue && !leftForLater(x)); if (r) nextUnits.set(r.unit.issue, { board: b, row: r }); });
/* Whether an issue has landed: its own board is built, or its unit row has landed; an issue on no board reads the tracker. For a
   blocker this means "no longer blocks": an issue closed as not planned no longer blocks either, though its own row never reads landed. */
const landedIssue = (n, other) => {
  if (other) return other.state === "CLOSED";
  const b = boardOf(n), u = unitRow(n);
  if (b && b.plan.status === "built") return true;
  if (u) return LANDED_STATES.has(unitState(u));
  const i = issueOf(n); return !!(i && i.state === "CLOSED");
};
/* A tracking issue's chain, for its row's state cell (plan/RULES.md §3, "The chain's progress"): units landed of all units (dropped,
   deferred and left-for-later units counted apart, lib.js leftForLater()), each unit in progress with its own run's step (from the unit's freshest board, else the
   tracking board's mirror, unit.live), and the unit up next with the blockers that have not landed. */
const chainOf = b => {
  const p = b.plan, w = p.wip || {}, units = (p.rows || []).filter(r => r.unit), st = r => (r.asBuilt || {}).state || "pending";
  const live = !["built", "abandoned"].includes(p.status) && !["landed", "cancelled"].includes(w.step);
  const dropped = units.filter(r => st(r) === "dropped").length, deferred = units.filter(r => st(r) === "deferred").length, left = units.filter(leftForLater).length;
  const counted = units.filter(r => !["dropped", "deferred"].includes(st(r)) && !leftForLater(r)), landed = counted.filter(r => LANDED_STATES.has(st(r))).length;
  const cur = live ? units.filter(r => (w.current || []).some(a => String(a).split(".")[0] === r.id)) : [];
  const current = cur.map(r => { const own = r.unit.issue ? boardOf(r.unit.issue) : null, ow = own ? own.plan.wip || {} : null, L = r.unit.live || {};
    return { issue: r.unit.issue || null, slug: r.unit.slug || r.id, step: (ow && ow.step) || L.step || null }; });
  const nx = live && w.next ? units.find(r => r.id === w.next && st(r) === "pending" && !leftForLater(r)) : null;
  const next = nx ? { issue: nx.unit.issue || null, slug: nx.unit.slug || nx.id, blockedBy: (nx.unit.blockedBy || []).filter(n => !landedIssue(n)).map(n => ({ issue: n })) } : null;
  const started = landed > 0 || current.length > 0 || units.some(r => st(r) === "complete");
  return { total: counted.length, landed, dropped, deferred, left, planned: !started && p.status !== "built", done: p.status === "built" || (counted.length > 0 && landed === counted.length), current, next };
};

/* Rows: every issue with a board or a level label (the label decides which issues are rows; no level is written to board.json,
   since a dashboard never shows one: GUIDANCE.md §4) */
/* ...and every unit of a tracking board, so the chain (and its next unit) shows even without a level label or the tracker. */
const unitNums = boards.filter(b => b.plan.kind === "tracking").flatMap(b => (b.plan.rows || []).filter(r => r.unit && Number.isInteger(r.unit.issue) && r.unit.issue > 0).map(r => r.unit.issue));
const rowNums = new Set([...boards.map(b => b.plan.issue), ...issues.filter(i => levelOf(i)).map(i => i.number), ...unitNums]);
const ACTIVE_STEPS = new Set(["sizing", "interview", "research", "architecture", "plan", "branch", "implementation", "qa", "remediation", "landing"]);
const rows = [...rowNums].map(n => {
  const i = issueOf(n), g = gq[n] || {}, b = boardOf(n), u = unitRow(n), p = prevRow(n);
  const row = { issue: n, title: (i && i.title) || (b && b.plan.issueTitle) || (b && b.plan.title) || (u && u.row.name) || `#${n}`, state: i ? i.state : ((b && b.plan.status === "built") || (u && LANDED_STATES.has(unitState(u))) ? "CLOSED" : "OPEN"), ...reasonOf(i), created: i ? i.createdAt.slice(0, 10) : null,
    parent: (g.parent && g.parent.number) || (b && b.plan.parent && b.plan.parent.issue) || (u && u.board.plan.issue) || null,
    waitsOn: ((g.blockedBy || {}).nodes || []).map(ref), blocks: ((g.blocking || {}).nodes || []).map(ref) };
  if (b) {
    const w = b.plan.wip || {}, s = b.plan.status;
    Object.assign(row, { board: fs.existsSync(path.join(b.dir, "dashboard.html")) ? relFromPlans(b.folder + "/dashboard.html", b.root) : null, folder: relFromPlans(b.folder, b.root) + "/", branch: shownBranch(b.plan), /* a merged branch is not shown (plan/RULES.md §3, "Branches") */ system: b.plan.kind === "tracking" ? null : ((b.plan.systems || [])[0] || {}).slug || null,
      step: w.step || null, detail: w.step === "halted" ? `Waiting on the user: ${w.waitingOn || w.detail || ""}` : (w.detail || ""), since: w.since || null, updated: w.updated || null, qa: w.qa || [], qaMax: w.qaMax || null,
      status: s === "built" || unitState(u) === "landed" ? "landed" : s === "abandoned" || w.step === "cancelled" ? "abandoned" : w.step === "halted" ? "halted" : w.step === "escalated" ? "escalated" : u && unitState(u) === "complete" ? "complete" : s === "building" ? "building" : "planning",
      landed: s === "built" ? { pr: (b.plan.asBuilt || {}).pr || null, merge: (b.plan.asBuilt || {}).merge || null, version: (b.plan.asBuilt || {}).version || null, date: (b.plan.asBuilt || {}).date || null } : null });
    /* the impact's reconciliation state, derived from the board (lib.js reconciliation(); plan/RULES.md §2, Impact, §5): null while it
       records no impact; landed and total on a tracking board */
    const rc = reconciliation(b.plan);
    row.reconciliation = rc ? { state: rc.state, landed: rc.landed, total: rc.total } : null;
    row.active = ACTIVE_STEPS.has(w.step) && ["planned", "building"].includes(s);
    if (b.plan.kind === "tracking") row.active = false; // the chain's active unit glows on its own row
    if (b.plan.kind === "tracking") row.chain = chainOf(b); // the state cell shows the chain's progress, not a bare "building"
  } else if (u) {
    const w = u.board.plan.wip || {}, cur = (w.current || []).some(a => a.split(".")[0] === u.row.id), st = unitState(u);
    // the unit's board as embed.js resolves it, from the folders on disk: linked only when its file exists (plan/RULES.md §1)
    const sb = subIssueBoard(u.board.dir, u.row.unit);
    Object.assign(row, { board: sb ? relFromPlans(u.board.folder + "/" + sb.board, u.board.root) : null, folder: u.row.unit.folder && !/^https?:/.test(u.row.unit.folder) ? relFromPlans(u.board.folder + "/" + u.row.unit.folder, u.board.root) + (u.row.unit.folder.endsWith("/") ? "/" : "") : (u.row.unit.folder || null), branch: unitBranch(u.row), system: u.row.system,
      step: cur ? w.step : null, detail: cur ? (w.detail || "") : ((u.row.asBuilt || {}).summary || ""), qa: cur ? (w.qa || []) : [], qaMax: cur ? w.qaMax : null,
      status: LANDED_STATES.has(st) ? "landed" : st === "complete" ? "complete" : st === "dropped" ? "abandoned" : cur ? (w.step === "halted" ? "halted" : "building") : "not-started", landed: null, reconciliation: null /* no board of its own: its impact is on the tracking board */ });
    row.active = cur && ACTIVE_STEPS.has(w.step);
  } else {
    /* a boardless row: its state from the tracker (plan/RULES.md §5); its branch shown while it is in progress, never a merged one */
    const ts = trackerState(n, i);
    Object.assign(row, { board: null, folder: null, branch: ts.status === "in-progress" ? ts.tracker.branch : null, system: p.system || null, ...(!p.system && p.unassigned === true ? { unassigned: true } : {}), step: null, detail: p.note || "", qa: [], status: ts.status, tracker: ts.tracker, active: false, landed: null, reconciliation: null });
  }
  /* The next unit (wip.next): "next · not started", never building or active, tagged with each blocker that has not landed. */
  const nx = nextUnits.get(n);
  if (nx && row.status !== "landed") {
    const own = (nx.row.unit.blockedBy || []).map(x => ({ issue: x })), tracked = ((g.blockedBy || {}).nodes || []).map(ref);
    const all = [...own, ...tracked.filter(t => !own.some(o => o.issue === t.issue && !t.repo))];
    Object.assign(row, { status: "next", active: false, step: null, qa: [], next: true,
      blockedBy: all.filter(x => !landedIssue(x.issue, x.repo ? x : null)).map(x => ({ issue: x.issue, repo: x.repo })) });
  }
  const si = sysInfo(row.system); row.systemName = si ? si.name : row.unassigned ? "no system" : null; // "unassigned": decided, not missing
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
  const g = groups.find(x => x.issue === t), items = ((gq[t] || {}).subIssues || { nodes: [] }).nodes.map(x => { claimed.add(x.number); return { issue: x.number, title: x.title, state: x.state, ...reasonOf(x) }; });
  claimed.add(t); return { issue: t, title: g.title, state: (issueOf(t) || {}).state || "OPEN", board: g.board, items };
});
const unscheduled = issues.filter(i => i.state === "OPEN" && !claimed.has(i.number)).sort((a, b) => b.number - a.number)
  .map(i => ({ issue: i.number, title: i.title, labels: i.labels.map(l => l.name).filter(l => !/^level: /.test(l)), created: i.createdAt.slice(0, 10), system: prevUn(i.number).system || (rows.find(r => r.issue === i.number) || {}).system || null }))
  /* a deliberate "no system" (above): kept from the previous entry, or taken from the issue's own row */
  .map(u => u.system || !(prevUn(u.issue).unassigned === true || (rows.find(r => r.issue === u.issue) || {}).unassigned) ? u : { ...u, unassigned: true });

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
const noSys = [...new Set([...rows.filter(r => !r.system && !r.unassigned && !trackingNums.has(r.issue)).map(r => "#" + r.issue), ...unscheduled.filter(u => !u.system && !u.unassigned).map(u => "#" + u.issue)])];
if (noSys.length) console.log(`no system recorded for ${noSys.join(", ")}: set "system" (or "unassigned": true, for no system) on those entries in board.json once, and board.js keeps it`);
