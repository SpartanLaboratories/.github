"use strict";
// The verification's own scratch: every run of verify/verify-templates.js, and of a case group or browser-view-follow.js on its own, works
// in a fresh folder of its own under the temp root, so two runs at the same time share no file and no stand-in team state.
//   const SCR = require("./scratch.js").open("<name>", { keep });   SCR.out: the default output folder; SCR.run: the run's folder
// open() makes <temp root>/<name>-XXXXXX holding out/ (the default output folder: an explicit --out still wins), tmp/ (made the temp root of
// this process and of every process it spawns, through TEMP, TMP and TMPDIR, so check-board.js's and check.js's own default folders and each
// case's mkdtemp land inside it) and no-state.json (DASHBOARDS_ADMIN_STATE, the stand-in for the team's state: never written, so the cases
// read no sizing; a DASHBOARDS_ADMIN_STATE the caller set still wins); it sets DASHBOARDS_NO_WATCHER=1 unless the caller set it. At exit the folder is removed; it is kept, its path printed, when a
// check failed (exit 1), with --keep or DASHBOARDS_VERIFY_KEEP=1, or when the caller keeps it (a browser run, whose screenshots are its result).
const fs = require("fs"), path = require("path"), os = require("os");

function open(name, opts = {}) {
  const run = fs.mkdtempSync(path.join(os.tmpdir(), name + "-"));
  const out = path.join(run, "out"), tmp = path.join(run, "tmp");
  fs.mkdirSync(out); fs.mkdirSync(tmp);
  process.env.TEMP = process.env.TMP = process.env.TMPDIR = tmp;
  if (!process.env.DASHBOARDS_ADMIN_STATE) process.env.DASHBOARDS_ADMIN_STATE = path.join(run, "no-state.json");
  /* no fixture starts a progress notes' watcher (plan/scripts/progress-index.js), as under verify-templates.js: one would outlive the run
     with its working folder in tmp/, so the scratch could not be removed; the case that tests it turns it on for its own spawns */
  if (process.env.DASHBOARDS_NO_WATCHER === undefined) process.env.DASHBOARDS_NO_WATCHER = "1";
  /* a failed event that is no refusal keeps why it failed here (plan/scripts/apply-event.js keepFailure()): its command and request, its
     summary with the error's stack, every child's whole output and the files it would have written, one folder per failure */
  const failures = path.join(run, "failures");
  if (process.env.DASHBOARDS_VERIFY_FAILURES === undefined) process.env.DASHBOARDS_VERIFY_FAILURES = failures;
  const keep = !!opts.keep || process.argv.includes("--keep") || process.env.DASHBOARDS_VERIFY_KEEP === "1";
  process.on("exit", code => {
    if (keep || code === 1) {
      console.log(`scratch kept for inspection${keep ? "" : " (a check failed)"}: ${run}`);
      let n = 0; try { n = fs.readdirSync(failures).length; } catch (e) { /* none */ }
      if (n) console.log(`  failed events kept with their reasons (expected refusals and failures among them): ${n} in ${failures}`);
      return;
    }
    try { fs.rmSync(run, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
    catch (e) { console.log(`scratch not removed (${e.code || e.message}): ${run}`); }
  });
  return { run, out, tmp, keep };
}

module.exports = { open };
