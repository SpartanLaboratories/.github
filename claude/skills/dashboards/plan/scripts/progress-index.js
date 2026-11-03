#!/usr/bin/env node
// The progress notes' index (plan/RULES.md §3, "Progress notes"; admin-team/board/progress-index). Every agent of a run writes
// docs/plans/.live/progress/<issue>/<name>.js and picks <name> itself: its agent name, a researcher's question, or the slug of its share of the
// work ("planner-reconcile"), so the names are open-ended. A board opened from disk cannot list a folder and a note needs no event, so the
// names must stand somewhere the board can load and be kept true between events: this script writes, in each issue's folder,
//   docs/plans/.live/progress/<issue>/index.js    (window.PROGRESS_NAMES=window.PROGRESS_NAMES||{})["<issue>"]=["planner-reconcile"];
// It holds no note's text and is git-ignored like the notes.
//   node progress-index.js --once <checkout>      write the index of every issue's folder now
//   node progress-index.js --ensure <checkout>    start the watcher for that checkout unless one is alive (apply-event.js, at every event)
//   node progress-index.js --watch <checkout>     the watcher: re-reads the folder every few seconds, and stops by itself (below)
// The watcher runs only for a git work tree whose docs/plans/.live/ is git-ignored, one per checkout (.watcher.json in the progress folder holds
// its pid and heartbeat), and stops when the checkout's progress folder is gone or no note has been written for IDLE_MS; the next event starts
// it again. DASHBOARDS_NO_WATCHER=1 starts none (verify/verify-templates.js sets it). To stop one by hand, end the pid in .watcher.json.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const TICK_MS = +process.env.DASHBOARDS_WATCHER_TICK_MS || 3000, FRESH_MS = 30000, IDLE_MS = +process.env.DASHBOARDS_WATCHER_IDLE_MS || 4 * 3600000;
const NAME = /^[a-z0-9][a-z0-9-]*$/, ISSUE = /^\d+$/;
const dirOf = root => path.join(root, "docs", "plans", ".live", "progress");

/* The names one issue's folder holds, sorted; the index itself and a file that cannot be a note left out. */
function namesIn(dir) { return fs.readdirSync(dir).filter(f => f.endsWith(".js")).map(f => f.slice(0, -3)).filter(n => n !== "index" && NAME.test(n)).sort(); }
const indexText = (issue, names) => `(window.PROGRESS_NAMES=window.PROGRESS_NAMES||{})[${JSON.stringify(String(issue))}]=${JSON.stringify(names)};\n`;
/* Write every issue's index whose names changed, through a temporary file and a rename, so no board reads half of one. Returns the issues written. */
function writeIndexes(root) {
  const base = dirOf(root), wrote = []; if (!fs.existsSync(base)) return wrote;
  for (const issue of fs.readdirSync(base).filter(x => ISSUE.test(x))) {
    const dir = path.join(base, issue); let names;
    try { if (!fs.statSync(dir).isDirectory()) continue; names = namesIn(dir); } catch (e) { continue; }
    const file = path.join(dir, "index.js"), text = indexText(issue, names); let was = null;
    try { was = fs.readFileSync(file, "utf8"); } catch (e) { /* none yet */ }
    if (was === text) continue;
    const tmp = path.join(dir, `.index.${process.pid}.tmp`);
    try { fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); wrote.push(issue); }
    catch (e) { try { fs.rmSync(tmp, { force: true }); } catch (x) { /* the next tick tries again */ } }
  }
  return wrote;
}
/* The newest note's write time across the checkout (the index and the watcher's own file are no note), or 0. */
function newestNote(root) {
  const base = dirOf(root); let t = 0;
  try {
    for (const issue of fs.readdirSync(base).filter(x => ISSUE.test(x))) for (const n of namesIn(path.join(base, issue))) {
      try { t = Math.max(t, fs.statSync(path.join(base, issue, n + ".js")).mtimeMs); } catch (e) { /* deleted under us */ }
    }
  } catch (e) { /* no folder */ }
  return t;
}
/* A watcher may run here: a git work tree whose .live is ignored, so nothing it writes can reach a commit. */
function watchable(root) {
  const git = a => cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8", windowsHide: true }).status === 0;
  return git(["rev-parse", "--is-inside-work-tree"]) && git(["check-ignore", "-q", "--no-index", "docs/plans/.live/progress/index.js"]);
}
const stampFile = root => path.join(dirOf(root), ".watcher.json");
function readStamp(root) { try { return JSON.parse(fs.readFileSync(stampFile(root), "utf8")); } catch (e) { return null; } }
function alive(st) { if (!st || !Number.isInteger(st.pid) || !(Date.now() - st.at < FRESH_MS)) return false; try { process.kill(st.pid, 0); return true; } catch (e) { return false; } }
/* Start the watcher unless one is alive; the index is written now either way. Never throws: at worst a board misses a slugged note. */
function ensureWatcher(root) {
  try {
    root = path.resolve(root);
    if (process.env.DASHBOARDS_NO_WATCHER === "1" || !watchable(root)) return "no watcher here";
    fs.mkdirSync(dirOf(root), { recursive: true }); writeIndexes(root);
    if (alive(readStamp(root))) return "alive";
    cp.spawn(process.execPath, [__filename, "--watch", root], { detached: true, stdio: "ignore", windowsHide: true, cwd: os.tmpdir() }).unref();
    return "started";
  } catch (e) { return "not started: " + e.message; }
}
function watch(root) {
  root = path.resolve(root); const base = dirOf(root), started = Date.now(); let beat = 0;
  const stamp = () => { const tmp = stampFile(root) + "." + process.pid + ".tmp"; fs.writeFileSync(tmp, JSON.stringify({ pid: process.pid, at: Date.now() })); fs.renameSync(tmp, stampFile(root)); beat = Date.now(); };
  const stop = () => { try { const st = readStamp(root); if (st && st.pid === process.pid) fs.rmSync(stampFile(root), { force: true }); } catch (e) { /* its folder is gone */ } process.exit(0); };
  if (!fs.existsSync(base) || alive(readStamp(root))) process.exit(0);
  stamp();
  const tick = () => {
    try {
      if (!fs.existsSync(base)) return stop();
      /* two watchers started together: the one whose stamp was overwritten leaves */
      const st = readStamp(root); if (st && st.pid !== process.pid && alive(st)) process.exit(0);
      writeIndexes(root);
      if (Date.now() - Math.max(started, newestNote(root)) > IDLE_MS) return stop();
      if (Date.now() - beat > FRESH_MS / 3) stamp();
    } catch (e) { /* a file in use: the next tick reads it again */ }
  };
  tick(); setInterval(tick, TICK_MS);
}

module.exports = { writeIndexes, ensureWatcher, namesIn, indexText, watchable };
if (require.main === module) {
  const [mode, root] = process.argv.slice(2);
  if (!root || !["--once", "--ensure", "--watch"].includes(mode)) { console.error("usage: progress-index.js --once|--ensure|--watch <checkout>"); process.exit(2); }
  if (mode === "--once") console.log(JSON.stringify({ wrote: writeIndexes(path.resolve(root)) }));
  else if (mode === "--ensure") console.log(ensureWatcher(root));
  else watch(root);
}
