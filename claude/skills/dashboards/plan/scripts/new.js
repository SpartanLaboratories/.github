#!/usr/bin/env node
// Lay an issue board's foundation (the "sized" event, plan/RULES.md §4, "The foundation"): docs/plans/[<parent>/]<issue>-<slug>/{plan.json,dashboard.html}.
// apply-event.js lays it itself at a sized with no board, through the same lib.js foundationPlan(); this is the presenter's fallback when
// that run failed (its summary names the event's time for --at), after which the event is raised again.
//   node new.js <issue> <slug> [--root <repo>] [--parent <folder under docs/plans>] [--fix-of <landed issue>] [--kind issue|tracking] [--level 2|3|4]
//               [--title "Short name"] [--issue-title "The issue's title"] [--function "One paragraph"]
//               [--baseline <sha>] [--date YYYY-MM-DD] [--branch <name>] [--systems slug,slug] [--step research] [--repo owner/name]
//               [--at <ISO time>]   the sized event's time, the run's start (plan.sized, wip.since); default now
// The repository root is --root, else the current directory. Systems take their names and colour slots from
// docs/dashboards/systems.json. Refuses to overwrite. Anything not given stays a <placeholder> that check.js refuses.
// With --parent, the new board links its parent's board (parent.board, set by embed.js only when the parent folder holds one), and
// embed.js re-embeds the tracking board in the parent folder, which links its unit to the new board (plan/RULES.md §1) and, once
// the unit is in its wip.current, mirrors the unit's run from the new board (§3). Every later embed.js of this folder does the same.
// --grade, else --level, is read for the kind and the steps line only, as the request or the team's local state tells it, and never written to the board (levels.js).
// A unit's board is laid at its own sized, never ahead of its run: there is no batch mode.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { repoRoot, opt, registry, signedOffParent, boardFolders, systemEntry, foundationPlan, atomicWrite, lockTree } = require("./lib.js");
const { embed } = require("./embed.js");

const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: "usage: node new.js <issue> <slug> [--root <repo>] [--parent <folder>] [--fix-of <issue>] [--kind issue|tracking] [--grade n] [--level n] [--title ...] [--issue-title ...] [--function ...] [--baseline <sha>] [--date YYYY-MM-DD] [--branch <name>] [--systems a,b] [--step <step>] [--repo owner/name] [--at <ISO time>]",
  valued: ["root", "parent", "fix-of", "kind", "grade", "level", "title", "issue-title", "function", "baseline", "date", "branch", "systems", "step", "repo", "at"], min: 2, max: 2 });
const issue = parseInt(args[0], 10), slug = args[1];
if (!issue || !slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error("usage: node new.js <issue> <slug> [--root <repo>] [--parent <folder>] [--fix-of <issue>] [--kind issue|tracking] [--grade n] [--level n] [--title ...] [--issue-title ...] [--function ...] [--baseline <sha>] [--date YYYY-MM-DD] [--branch <name>] [--systems a,b] [--step <step>] [--repo owner/name]");
  process.exit(2);
}
let root; try { root = repoRoot(args); } catch (e) { console.error(e.message); process.exit(2); }
const tpl = path.resolve(__dirname, "..", "template");
const name = slug.startsWith(issue + "-") ? slug : `${issue}-${slug}`;
const parent = opt(args, "parent", "");
/* --fix-of <n>: a fix to the work of an earlier, landed issue (plan/RULES.md §1, "A fix to an earlier plan's work"; admin-team/dashboards-skill/35):
   with --parent it sits under its own GitHub parent, else inside the landed issue's folder (a folded-in fix); plan.fixOf names that issue,
   and embed.js links its board */
const fixOf = opt(args, "fix-of", null), fixN = fixOf ? parseInt(String(fixOf).replace(/^#/, ""), 10) : null;
if (fixOf && !(fixN > 0)) { console.error(`--fix-of takes the number of the landed issue this fixes (got ${JSON.stringify(fixOf)})`); process.exit(2); }
let host = "";
if (fixN && !parent) { const hit = boardFolders(root).find(b => b.issue === fixN); if (!hit) { console.error(`--fix-of ${fixN}: #${fixN}'s folder is not in this tree; name --parent <folder> for a fix under its own GitHub parent`); process.exit(2); } host = path.relative(path.join(root, "docs", "plans"), hit.dir).split(path.sep).join("/"); }
const rel = ["docs", "plans", ...(parent || host).split(/[\\/]/).filter(Boolean), name].join("/"), dir = path.join(root, ...rel.split("/"));
lockTree(root, "new.js");
if (fs.existsSync(path.join(dir, "dashboard.html")) || fs.existsSync(path.join(dir, "plan.json"))) { console.error(`refusing to overwrite: ${rel} already holds a plan.json or dashboard.html`); process.exit(1); }

const reg = registry(root);
let repo = opt(args, "repo", reg && reg.reg.repo);
if (!repo) { try { const u = cp.execSync("git remote get-url origin", { cwd: root, encoding: "utf8" }).trim(); const m = u.match(/[:/]([^/:]+\/[^/]+?)(\.git)?$/); if (m) repo = m[1]; } catch (e) { /* stays a placeholder */ } }

const skeleton = JSON.parse(fs.readFileSync(path.join(tpl, "plan.json"), "utf8"));
/* --grade first, else --level (the user's decision of 2026-11-13, vocabulary/choice-1-live-keys (a); --level read until the rule rework's L12) */
const level = opt(args, "grade", null) || opt(args, "level", null), kind = opt(args, "kind", level === "4" ? "tracking" : "issue");
/* the run's start, the sized event's time (--at; apply-event.js names it in its summary when its own laying failed), so the Timeline's
   first bound is the event's, not the time the foundation was laid (plan/RULES.md §4, "The fast path owns the Timeline") */
const AT = opt(args, "at", null);
if (AT != null && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(AT) || isNaN(Date.parse(AT)))) { console.error(`--at ${JSON.stringify(AT)} is not an ISO UTC time (YYYY-MM-DDTHH:MM[:SS]Z)`); process.exit(2); }
const now = (AT ? new Date(AT) : new Date()).toISOString().replace(/\.\d+Z$/, "Z");
const step = opt(args, "step", "research"); // its wip.current comes from the step-to-column map (plan/RULES.md §3): lib.js glowFor()
const plan = foundationPlan(skeleton, {
  repo, issue, name, rel, kind, step, now,
  level: level ? parseInt(level, 10) : null,
  title: opt(args, "title", undefined), issueTitle: opt(args, "issue-title", undefined), function: opt(args, "function", undefined),
  parent: parent ? { issue: parseInt(path.basename(parent), 10) || null, board: null } : null,
  fixOf: fixN ? { issue: fixN, board: null } : null,
  branch: opt(args, "branch", null),
  baseline: { ref: "master", sha: opt(args, "baseline", skeleton.baseline.sha), date: opt(args, "date", skeleton.baseline.date) },
  systems: (opt(args, "systems", "") || "").split(",").filter(Boolean).map(s => systemEntry(reg, s))
});
if (plan.parent && !plan.parent.issue) plan.parent = null;
fs.mkdirSync(dir, { recursive: true });
atomicWrite(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
atomicWrite(path.join(dir, "dashboard.html"), fs.readFileSync(path.join(tpl, "dashboard.html")));
const own = embed(dir);
console.log(`created ${rel}/plan.json and dashboard.html from the template`);
own.linked.forEach(l => console.log(`linked ${l}`));
/* A sub-issue's board now exists inside its tracking issue's folder: embed() has re-embedded the tracking board, so its links to
   this sub-issue go to this board from now on (plan/RULES.md §1), and, once the unit is in the tracking board's wip.current, the
   unit mirrors this board's run (§3). */
if (own.parent && own.parent.error) console.log(`could not re-embed the tracking board in ${own.parent.dir}: ${own.parent.error}`);
else if (own.parent) { const tb = path.relative(root, own.parent.dir).split(path.sep).join("/"); own.parent.linked.forEach(l => console.log(`tracking board ${tb}: ${l}`)); console.log(`re-embedded the tracking board ${tb}`); }
/* A sub-issue of a signed-off tracking plan is never born with empty columns (plan/RULES.md §2, §4, sized): say what to fill now. */
const sop = signedOffParent(dir, plan);
if (sop) { const pr = path.relative(root, sop.dir).split(path.sep).join("/"); console.log(`#${plan.parent.issue} is a signed-off tracking plan: fill the Gap and Considered columns now, with the gap and considered milestones, from ${pr}/research/README.md and ${pr}/architecture.md (this unit's row in the decomposition, the alternatives weighed for it)`); }
const left = JSON.stringify(plan).match(/"<[^"]*>"/g) || [];
if (left.length) console.log(`still to fill: ${left.length} placeholder${left.length > 1 ? "s" : ""} (${left.slice(0, 5).join(", ")}${left.length > 5 ? ", …" : ""})`);
const sk = p => path.join(__dirname, p);
/* The Verdict and As built columns are lists of statements (plan/RULES.md §2, "Statements"): say how they are written when they come. */
console.log("later: the Verdict column, at plan-accepted, is verdict.statements, one decision each with its reference into plan.md (ref: \"plan.md#<heading-anchor>\"; embed.js copies the section's excerpt); the As built column, at each row's outcome, is asBuilt.statements, one per verdict statement, each as-planned, amended or deviated");
console.log(`next: fill plan.json, then node ${sk("embed.js")} ${rel} && node ${sk("check.js")} ${rel} --auto`);
