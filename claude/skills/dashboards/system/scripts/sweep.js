#!/usr/bin/env node
// The sweep of a rule that can fail boards (GUIDANCE.md §11, "A rule that can fail boards: the sweep and its warning stage"; the user's decision q-411).
//   node sweep.js run <rule> --repo <owner/name> --tree <checkout> --placed <date> --binds-closed yes|no [--main <checkout>] [--fix] [--at <time>]
//                                [--config <repositories.json>] [--json]
//       checks every committed board of one repository on the org work board with the rule's finder (sweeplib.js RULES): its issue and tracking
//       boards (docs/plans/**/plan.json), its repository work board (docs/plans/board.json), the org work board where the repository holds it
//       (docs/plans/org-work-board/board.json), its state boards (docs/dashboards/**/*.html, their data blocks and the page's own text), each
//       with its page read with its data blocks emptied; with --main, every view copy in that checkout (docs/plans/.live/view/**/plan.json);
//       and, with --run (once per run), the issue, tracking and work boards of a run's checkout as its working tree holds them, its boards in
//       flight: a text a run's board already carries that the committed boards no longer show (a view copy's, carried onto the run's branch by
//       a seeding, once that copy is gone) is found there. A run's checkout is only read: its finds are recorded and listed, never fixed, as
//       the run's own writers carry its boards; a find the same as one of the committed boards' is reported once, with theirs.
//       --tree is a checkout of the repository's default branch: its tracked files are read (git ls-files; a folder that is no git checkout is
//       read whole). A board whose issue is closed is skipped where the rule does not bind closed boards (--binds-closed no).
//       Each find is either fixed, with --fix, by the fix the board's own writers make (the rule's sweepFix(): for the private repositories, a
//       quotation's name cut to "…"), written in place in the board's data file, its embedded copy and its sidecar (the same files the
//       writers write, through a rename), on an issue, tracking or work board and a view copy; or listed for the user's decision, with why.
//       The sweep is recorded (sweeplib.js, the record outside every mirrored path): the rule, when it was placed, whether it binds closed
//       boards, and for the repository the mark of every text found (never the text), what was fixed and what is listed. From then on the
//       repository's warning stage stands: every writer and both checkers warn, naming the sweep, on a text the sweep lists as already on a
//       board, and refuse only a text newly written; a repository where nothing was found has no stage. Running it again for the same
//       repository replaces its entry.
//   node sweep.js landed <rule> --repo <owner/name> [--at <time>] [--json]
//       records that the sweep's fixes in that repository have landed: its warning stage ends, and the rule refuses again every text that
//       breaks it, already on a board or not.
//   node sweep.js status [<rule>] [--json]        every sweep recorded, each repository's stage (warning, or ended at its landing)
//   node sweep.js repos [--config <repositories.json>] [--json]
//       the repositories on the org work board (plan/template/org-board.repositories.json, less every private repository): those a sweep checks.
// It reads git and the files, and writes only the boards it fixes (--fix) and the record; it commits nothing. The fixes in --tree land through the
// team's version control (a docs-only landing per repository); the view copies are git-ignored and need none.
// Exit 0 when it ran (finds or none), 1 when a board or the record could not be read or written, 2 on a usage error or a refusal.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const SW = require("./sweeplib.js"), L = require("./statelib.js");
const lib = require("../../plan/scripts/lib.js"), { boardClosed } = require("../../plan/scripts/levels.js");
const SKILL = path.resolve(__dirname, "..", "..");
const USAGE = `usage: node sweep.js run <rule> --repo <owner/name> --tree <checkout> --placed <date> --binds-closed yes|no [--main <checkout>] [--run <checkout>]... [--fix] [--at <time>] [--config <repositories.json>] [--json]
       node sweep.js landed <rule> --repo <owner/name> [--at <time>] [--json]
       node sweep.js status [<rule>] [--json]
       node sweep.js repos [--config <repositories.json>] [--json]`;
const args = process.argv.slice(2);
const pos = require("./cliargs.js").strict(args, { usage: USAGE, valued: ["repo", "tree", "main", "run", "placed", "binds-closed", "at", "config"], flags: ["fix", "json"], min: 1, max: 2 });
const JSONOUT = args.includes("--json");
const opt = (n, d) => lib.opt(args, n, d);
const refuse = m => { if (JSONOUT) console.log(JSON.stringify({ result: "refused", error: m })); else console.error(m); process.exit(2); };
const failed = m => { if (JSONOUT) console.log(JSON.stringify({ result: "failed", error: m })); else console.error(m); process.exit(1); };
const isoAt = () => { const a = opt("at", null); if (a != null && isNaN(Date.parse(a))) refuse(`--at ${a}: not a time`); return (a ? new Date(a) : new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"); };
const rel = (root, f) => path.relative(root, f).split(path.sep).join("/");

/* ---------- The repositories on the org work board ---------- */
function boardRepos() {
  const file = path.resolve(opt("config", path.join(SKILL, "plan", "template", "org-board.repositories.json")));
  let cfg; try { cfg = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { failed(`${file}: ${e.message}`); }
  const all = [...(cfg.repositories || []).map(n => `${cfg.owner}/${n}`), ...(cfg.organizations || []).flatMap(o => (o.repositories || []).map(n => `${o.owner}/${n}`))];
  let privates; try { privates = require("./privaterefs.js").privatesOf([cfg.owner, ...(cfg.organizations || []).map(o => o.owner)]); } catch (e) { failed(e.message); }
  return all.filter(r => !privates.has(r));
}

/* ---------- The boards of a tree ---------- */
const SKIP_DIRS = new Set([".live", "_template", "superseded", "node_modules", ".git"]);
function walk(dir, out) {
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  ents.forEach(e => { const f = path.join(dir, e.name); if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(f, out); } else out.push(f); });
  return out;
}
function trackedFiles(tree) {
  const r = cp.spawnSync("git", ["-C", tree, "ls-files", "-z", "--", "docs/plans", "docs/dashboards"], { encoding: "utf8", windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  if (r.status === 0 && fs.existsSync(path.join(tree, ".git"))) return r.stdout.split("\0").filter(Boolean).map(f => path.join(tree, ...f.split("/")));
  return [...walk(path.join(tree, "docs", "plans"), []), ...walk(path.join(tree, "docs", "dashboards"), [])];
}
const inSkipped = (root, f) => rel(root, f).split("/").slice(0, -1).some(d => SKIP_DIRS.has(d));
/* each board: { type: issue | work | state | view, root, data (file), page (html), id (block) } */
function boardsOf(tree, main) {
  const out = [], files = trackedFiles(tree).filter(f => !inSkipped(tree, f));
  files.filter(f => path.basename(f) === "plan.json").forEach(f => out.push({ type: "issue", root: tree, data: f, page: path.join(path.dirname(f), "dashboard.html"), id: "plan", sidecar: path.join(path.dirname(f), lib.SIDECAR.plan) }));
  files.filter(f => path.basename(f) === "board.json" && rel(tree, f).startsWith("docs/plans/")).forEach(f => out.push({ type: "work", root: tree, data: f, page: path.join(path.dirname(f), "index.html"), id: "board", sidecar: path.join(path.dirname(f), lib.SIDECAR.board) }));
  files.filter(f => /\.html$/i.test(f) && rel(tree, f).startsWith("docs/dashboards/")).forEach(f => out.push({ type: "state", root: tree, page: f }));
  if (main) walk(path.join(main, "docs", "plans", ".live", "view"), []).filter(f => path.basename(f) === "plan.json")
    .forEach(f => out.push({ type: "view", root: main, data: f, page: path.join(path.dirname(f), "dashboard.html"), id: "plan", sidecar: path.join(path.dirname(f), lib.SIDECAR.plan) }));
  return out;
}
/* a run's checkout: every board on disk under docs/plans and docs/dashboards, tracked or not, as its working tree holds it (no view copy) */
function runBoardsOf(r) {
  const out = [], files = [...walk(path.join(r, "docs", "plans"), []), ...walk(path.join(r, "docs", "dashboards"), [])];
  files.filter(f => path.basename(f) === "plan.json").forEach(f => out.push({ type: "issue", data: f, page: path.join(path.dirname(f), "dashboard.html"), id: "plan" }));
  files.filter(f => path.basename(f) === "board.json" && rel(r, f).startsWith("docs/plans/")).forEach(f => out.push({ type: "work", data: f, page: path.join(path.dirname(f), "index.html"), id: "board" }));
  files.filter(f => /\.html$/i.test(f) && rel(r, f).startsWith("docs/dashboards/")).forEach(f => out.push({ type: "state", page: f }));
  return out;
}
/* every value of a repeated option */
const optAll = n => args.reduce((a, x, i) => (x === `--${n}` && args[i + 1] != null && !args[i + 1].startsWith("--") ? [...a, args[i + 1]] : a), []);
const readJson = f => JSON.parse(fs.readFileSync(f, "utf8"));
const readText = f => { try { return fs.readFileSync(f, "utf8"); } catch (e) { return null; } };

/* ---------- run ---------- */
function run(ruleId) {
  const R = (() => { try { return SW.rule(ruleId); } catch (e) { refuse(e.message); } })();
  const repo = opt("repo", null), treeArg = opt("tree", null), mainArg = opt("main", null), placed = opt("placed", null), bc = opt("binds-closed", null);
  if (!repo || !/^[^/\s]+\/[^/\s]+$/.test(repo)) refuse("--repo <owner/name> is needed");
  if (!treeArg) refuse("--tree <checkout of the repository's default branch> is needed");
  if (!placed || isNaN(Date.parse(placed))) refuse("--placed <date>, when the rule was placed, is needed");
  if (!["yes", "no"].includes(bc)) refuse("--binds-closed yes|no is needed: each rule that can fail boards says whether it binds closed boards (GUIDANCE.md §11)");
  const repos = boardRepos();
  if (!repos.includes(repo)) refuse(`${repo} is not on the org work board (${repos.join(", ")}): a sweep checks the repositories on it (GUIDANCE.md §11; plan/RULES.md §10, "What is left out")`);
  const tree = path.resolve(treeArg), main = mainArg ? path.resolve(mainArg) : null;
  if (!fs.existsSync(path.join(tree, "docs"))) refuse(`--tree ${tree} holds no docs/`);
  if (main && !fs.existsSync(main)) refuse(`--main ${main} is not there`);
  const runs = optAll("run").map(r => path.resolve(r));
  runs.forEach(r => { if (!fs.existsSync(path.join(r, "docs", "plans"))) refuse(`--run ${r} holds no docs/plans/`); });
  const at = isoAt(), bindsClosed = bc === "yes", FIX = args.includes("--fix");
  const sha = (() => { const r = cp.spawnSync("git", ["-C", tree, "rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }); return r.status === 0 && fs.existsSync(path.join(tree, ".git")) ? r.stdout.trim() : null; })();
  const boards = boardsOf(tree, main), fixed = [], listed = [], texts = new Set();
  let checked = 0, skippedClosed = 0;
  const writeBack = new Map();
  for (const b of boards) {
    const where = b.type === "view" ? rel(main, b.page) : rel(tree, b.page);
    if (b.type === "state") {
      const html = readText(b.page); if (html == null) continue; checked++;
      ["plan", "board", "state"].forEach(id => { const t = L.blockText(html, id); if (t == null) return; let d; try { d = JSON.parse(t); } catch (e) { return; }
        R.mod.sweepFind(d, id === "state" ? "state" : undefined).forEach(x => { texts.add(x.h); listed.push({ board: where, at: `${id} data: ${x.at}`, keys: x.keys, why: x.quoted ? "a quotation on a state board: its next stamp cuts the name (system/scripts/apply-state.js)" : "text a writer refuses: reworded where the board stores it" }); }); });
      R.mod.sweepPage(SW.stripBlocks(html)).forEach(x => { texts.add(x.h); listed.push({ board: where, at: `its page, line ${x.line}`, keys: x.keys, why: "the board's own text: reworded by hand" }); });
      continue;
    }
    let data; try { data = readJson(b.data); } catch (e) { failed(`${rel(b.root, b.data)} cannot be read: ${e.message}`); }
    const kind = b.id === "plan" ? "plan-board" : undefined;
    if (b.id === "plan" && !bindsClosed && boardClosed(data)) { skippedClosed++; continue; }
    checked++;
    const finds = R.mod.sweepFind(data, kind);
    finds.forEach(x => { texts.add(x.h); (x.quoted ? fixed : listed).push({ board: rel(b.root, b.data), at: x.at, keys: x.keys, ...(x.quoted ? {} : { why: "text a writer refuses: reworded where the board stores it (an issue or tracking board's through fill.js)" }) }); });
    const html = readText(b.page);
    if (html != null) R.mod.sweepPage(SW.stripBlocks(html)).forEach(x => { texts.add(x.h); listed.push({ board: where, at: `its page, line ${x.line}`, keys: x.keys, why: "the page's own text, outside its data: the template or a hand edit" }); });
    if (FIX && finds.some(x => x.quoted)) writeBack.set(b, { data, kind });
  }
  /* a run's checkout (--run): its boards in flight, read as its working tree holds them, tracked or not; recorded, never fixed */
  const inFlight = [], ofTree = new Set(texts);
  for (const r of runs) {
    for (const b of runBoardsOf(r)) {
      const page = rel(r, b.page), dataAt = b.data ? rel(r, b.data) : page;
      const note = (x, at, where) => { const fresh = !ofTree.has(x.h); texts.add(x.h); if (fresh && !inFlight.some(y => y.h === x.h && y.board === where)) inFlight.push({ checkout: r, board: where, at, keys: x.keys, h: x.h, quoted: !!x.quoted }); };
      if (b.type === "state") {
        const html = readText(b.page); if (html == null) continue; checked++;
        ["plan", "board", "state"].forEach(id => { const t = L.blockText(html, id); if (t == null) return; let d; try { d = JSON.parse(t); } catch (e) { return; } R.mod.sweepFind(d, id === "state" ? "state" : undefined).forEach(x => note(x, `${id} data: ${x.at}`, page)); });
        R.mod.sweepPage(SW.stripBlocks(html)).forEach(x => note(x, `its page, line ${x.line}`, page));
        continue;
      }
      let data; try { data = readJson(b.data); } catch (e) { failed(`${b.data} cannot be read: ${e.message}`); }
      if (b.id === "plan" && !bindsClosed && boardClosed(data)) { skippedClosed++; continue; }
      checked++;
      R.mod.sweepFind(data, b.id === "plan" ? "plan-board" : undefined).forEach(x => note(x, x.at, dataAt));
      const html = readText(b.page);
      if (html != null) R.mod.sweepPage(SW.stripBlocks(html)).forEach(x => note(x, `its page, line ${x.line}`, page));
    }
  }
  /* the fixes the board's own writers make, written as they write them: the data file, its embedded copy and its sidecar, each through a rename */
  const wrote = [];
  if (FIX && writeBack.size) {
    const roots = new Set([...writeBack.keys()].map(b => b.root));
    roots.forEach(r => { if (fs.existsSync(path.join(r, "docs", "plans"))) lib.lockTree(r, "sweep.js"); });
    try {
      for (const [b, { data, kind }] of writeBack) {
        const n = R.mod.sweepFix(data, kind); if (!n) continue;
        const was = fs.readFileSync(b.data, "utf8"), eol = /\r\n/.test(was) ? "\r\n" : "\n", json = (JSON.stringify(data, null, 2) + "\n").replace(/\n/g, eol);
        lib.atomicWrite(b.data, json);
        if (fs.existsSync(b.page)) lib.atomicWrite(b.page, lib.writeBlock(fs.readFileSync(b.page, "utf8"), b.id, json));
        if (fs.existsSync(b.sidecar)) lib.atomicWrite(b.sidecar, lib.sidecarText(b.id, json));
        wrote.push(rel(b.root, b.data));
      }
    } catch (e) { failed(`a fix could not be written: ${e.message}`); }
  }
  /* without --fix, what the writers would fix is fixable, not fixed: neither listed for a decision */
  const fixedShown = FIX ? fixed : [], fixable = FIX ? [] : fixed, toList = listed;
  /* the record: the rule, and for this repository the mark of every text found, what was fixed and what is listed */
  const rec = JSON.parse(JSON.stringify(SW.readRecord()));
  let s = rec.sweeps.find(x => x && x.rule === ruleId);
  if (!s) { s = { rule: ruleId, cite: R.cite, placed, bindsClosed, swept: at, repositories: [] }; rec.sweeps.push(s); }
  Object.assign(s, { cite: R.cite, placed, bindsClosed, swept: at });
  s.repositories = (s.repositories || []).filter(r => r && r.repo !== repo);
  const entry = { repo, swept: at, sha, boards: checked, skippedClosed, landed: texts.size ? null : at, texts: [...texts].sort(),
    fixed: fixedShown.map(({ board, at: a }) => ({ board, at: a })), fixable: fixable.map(({ board, at: a }) => ({ board, at: a })), listed: toList.map(({ board, at: a, why }) => ({ board, at: a, why })),
    ...(runs.length ? { runs, inFlight: inFlight.map(({ checkout, board, at: a, quoted }) => ({ checkout, board, at: a, quoted })) } : {}) };
  if (!texts.size) entry.nothingFound = true;
  s.repositories.push(entry);
  let file; try { file = SW.writeRecord(rec); } catch (e) { failed(`the sweeps' record could not be written: ${e.message}`); }
  const S = { result: "swept", rule: ruleId, repo, tree: rel(process.cwd(), tree) || ".", sha, at, bindsClosed, boards: checked, skippedClosed, finds: texts.size,
    fixed: fixedShown, fixable, wrote, listed: toList, ...(runs.length ? { runs, inFlight: inFlight.map(({ h, ...x }) => x) } : {}), stage: texts.size ? "warning" : "none", record: file };
  if (JSONOUT) console.log(JSON.stringify(S));
  else {
    console.log(`swept ${repo} for ${ruleId} (${R.cite}) at ${sha ? sha.slice(0, 7) : "a tree that is no git checkout"}: ${checked} board${checked === 1 ? "" : "s"} checked${skippedClosed ? `, ${skippedClosed} closed board${skippedClosed === 1 ? "" : "s"} skipped (the rule does not bind them)` : ""}`);
    if (FIX) console.log(`fixed: ${fixedShown.length} text${fixedShown.length === 1 ? "" : "s"} in ${wrote.length} board${wrote.length === 1 ? "" : "s"}${wrote.length ? ` (${wrote.join(", ")}): they land through a docs-only landing of the repository` : ""}`);
    if (!FIX) { console.log(`fixable by the boards' own writers: ${fixable.length ? "" : "none"}`); fixable.forEach(x => console.log(`  ${x.board} at ${x.at} (${x.keys.join(", ")}): run again with --fix`)); }
    console.log(`listed for the user's decision: ${toList.length ? "" : "none"}`);
    toList.forEach(x => console.log(`  ${x.board} at ${x.at} (${x.keys.join(", ")}): ${x.why}`));
    if (runs.length) { console.log(`in a run's checkout, not on the committed boards: ${inFlight.length ? "" : "none"}`); inFlight.forEach(x => console.log(`  ${x.checkout}: ${x.board} at ${x.at} (${x.keys.join(", ")}): ${x.quoted ? "a quotation, cut by the run's own writers" : "the run's board carries it: reworded on the run's branch"}`)); }
    console.log(texts.size ? `warning stage: stands in ${repo} until its fixes land (node sweep.js landed ${ruleId} --repo ${repo})` : `warning stage: none, nothing found`);
    console.log(`record: ${file}`);
  }
  process.exit(0);
}

/* ---------- landed ---------- */
function landed(ruleId) {
  const repo = opt("repo", null); if (!repo) refuse("--repo <owner/name> is needed");
  const at = isoAt(), rec = JSON.parse(JSON.stringify(SW.readRecord()));
  const s = rec.sweeps.find(x => x && x.rule === ruleId), r = s && (s.repositories || []).find(x => x && x.repo === repo);
  if (!r) refuse(`no sweep of ${ruleId} is recorded for ${repo} (node sweep.js status)`);
  if (r.landed) { const S = { result: "unchanged", rule: ruleId, repo, landed: r.landed }; if (JSONOUT) console.log(JSON.stringify(S)); else console.log(`the sweep of ${ruleId} in ${repo} has no warning stage standing (ended ${r.landed})`); process.exit(0); }
  r.landed = at;
  let file; try { file = SW.writeRecord(rec); } catch (e) { failed(`the sweeps' record could not be written: ${e.message}`); }
  const S = { result: "landed", rule: ruleId, repo, landed: at, record: file };
  if (JSONOUT) console.log(JSON.stringify(S)); else console.log(`the sweep of ${ruleId} in ${repo}: its fixes landed at ${at}; the warning stage has ended, and the rule refuses every text that breaks it`);
  process.exit(0);
}

/* ---------- status ---------- */
function status(ruleId) {
  const rec = SW.readRecord(), list = rec.sweeps.filter(s => s && (!ruleId || s.rule === ruleId));
  const S = { result: "status", record: SW.recordFile(), sweeps: list.map(s => ({ rule: s.rule, cite: s.cite, placed: s.placed, bindsClosed: s.bindsClosed, swept: s.swept,
    repositories: (s.repositories || []).map(r => ({ repo: r.repo, swept: r.swept, stage: r.landed ? "ended" : "warning", landed: r.landed || null, finds: (r.texts || []).length, fixed: (r.fixed || []).length, listed: (r.listed || []).length })) })) };
  if (JSONOUT) console.log(JSON.stringify(S));
  else if (!S.sweeps.length) console.log(`no sweep recorded${ruleId ? ` for ${ruleId}` : ""} (${S.record || "no record"})`);
  else S.sweeps.forEach(s => { console.log(`${s.rule} (${s.cite}), placed ${s.placed}, binds closed boards: ${s.bindsClosed ? "yes" : "no"}`);
    s.repositories.forEach(r => console.log(`  ${r.repo}: ${r.stage === "warning" ? "warning stage" : `ended ${r.landed}`} · ${r.finds} found · ${r.fixed} fixed · ${r.listed} listed`)); });
  process.exit(0);
}

const cmd = pos[0];
if (cmd === "run") { if (!pos[1]) refuse("run needs the rule's id"); run(pos[1]); }
else if (cmd === "landed") { if (!pos[1]) refuse("landed needs the rule's id"); landed(pos[1]); }
else if (cmd === "status") status(pos[1]);
else if (cmd === "repos") { if (pos[1]) refuse("repos takes no argument"); const r = boardRepos(); if (JSONOUT) console.log(JSON.stringify({ result: "repos", repos: r })); else r.forEach(x => console.log(x)); process.exit(0); }
else refuse(`unknown command ${cmd}\n${USAGE}`);
