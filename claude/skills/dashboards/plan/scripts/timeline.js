#!/usr/bin/env node
// The Timeline tile of a landed board (plan/RULES.md §2, "The KPI tiles"; admin-team/dashboards-skill/32), from the command line.
//   node timeline.js <folder>                         print the tile's step lines (UTC), its figure and what it leaves out
//   node timeline.js <folder> --from-git [--repo-dir <path>]
//                                                     record, from git, the merge's time (asBuilt.at) and the branch's step commits
//                                                     (asBuilt.commits) into <folder>/plan.json, then print the lines; run embed.js on
//                                                     the folder after it. --repo-dir is the clone that holds the merge (default: the
//                                                     git repository the folder is in).
// It never guesses a time: what git cannot tell (no git, the merge not in the clone, no merge sha on the board) is left unrecorded and
// said. apply-event.js records the same at a board's landed event, from the worktree; this is for a board that landed before the rule.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const lib = require("./lib.js");
const USAGE = "usage: node timeline.js <folder> [--from-git] [--repo-dir <path>]";
const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: USAGE, valued: ["repo-dir"], flags: ["from-git"], min: 1, max: 1 });
const dir = path.resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--repo-dir"));
const file = path.join(dir, "plan.json");
if (!fs.existsSync(file)) { console.error(`${dir} holds no plan.json`); process.exit(2); }
const text = fs.readFileSync(file, "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n", plan = JSON.parse(text);

if (args.includes("--from-git")) {
  let repo = lib.opt(args, "repo-dir", null);
  if (!repo) { try { repo = cp.execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) { repo = null; } }
  const A = plan.asBuilt && typeof plan.asBuilt === "object" ? plan.asBuilt : null, merge = A && (A.merge || A.sha);
  if (!A || !merge) { console.error("the board records no merge (asBuilt.merge or asBuilt.sha): nothing to read from git"); process.exit(1); }
  const folder = typeof plan.folder === "string" && plan.folder ? plan.folder : (repo ? path.relative(repo, dir).split(path.sep).join("/") : null);
  const g = lib.gitTimes(repo, folder, A.merge || A.sha);
  if (!g.at) { console.error(`git cannot tell the merge's time (${repo ? `${merge} is not in ${repo}` : "no git repository found"}): nothing recorded`); process.exit(1); }
  const before = JSON.stringify(A);
  A.at = g.at; if (Array.isArray(g.commits)) { if (g.commits.length) A.commits = g.commits; else delete A.commits; }
  if (JSON.stringify(A) !== before) { fs.writeFileSync(file, (JSON.stringify(plan, null, 2) + "\n").replace(/\n/g, eol)); console.log(`recorded asBuilt.at ${A.at}${A.commits ? ` and ${A.commits.length} step commit${A.commits.length === 1 ? "" : "s"} (${A.commits.map(c => `${c.sha} ${c.step}`).join(", ")})` : ""} in ${file}; run embed.js on the folder`); }
  else console.log("asBuilt.at and asBuilt.commits already record what git tells: plan.json unchanged");
}
const T = lib.timelineSteps(plan), tot = lib.timelineTotal(T), lo = lib.timelineLeftOut(T);
if (!(plan.status === "built" || (plan.wip || {}).step === "landed")) console.log("(the board has not landed: its board shows the QA passes tile, not the Timeline)");
lib.timelineLines(T).forEach(l => console.log("  " + l));
const an = lib.timelineApproxNote(T);
console.log(`figure: ${tot != null ? `${T.visits.some(v => v.ms != null && v.approx) ? "≈ " : ""}${lib.tlSpan(tot)}` : "—"}${lo ? ` · ${lo}` : ""}${an ? ` · ${an}` : ""}`);
