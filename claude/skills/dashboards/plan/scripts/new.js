#!/usr/bin/env node
// Lay a plan board's foundation (the "sized" event, plan/RULES.md §4): docs/plans/[<parent>/]<issue>-<slug>/{plan.json,dashboard.html}.
//   node new.js <issue> <slug> [--root <repo>] [--parent <folder under docs/plans>] [--kind issue|tracking] [--level 2|3|4]
//               [--title "Short name"] [--issue-title "The issue's title"] [--function "One paragraph"]
//               [--baseline <sha>] [--date YYYY-MM-DD] [--branch <name>] [--systems slug,slug] [--step research] [--repo owner/name]
// The repository root is --root, else the current directory. Systems take their names and colour slots from
// docs/dashboards/systems.json. Refuses to overwrite. Anything not given stays a <placeholder> that check.js refuses.
// With --parent, the new board links its parent's board (parent.board, set by embed.js only when the parent folder holds one), and
// embed.js re-embeds the tracking board in the parent folder, which links its unit to the new board (plan/RULES.md §1) and, once
// the unit is in its wip.current, mirrors the unit's run from the new board (§3). Every later embed.js of this folder does the same.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { repoRoot, opt, registry, signedOffParent, glowFor } = require("./lib.js");
const { embed } = require("./embed.js");

const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: "usage: node new.js <issue> <slug> [--root <repo>] [--parent <folder>] [--kind issue|tracking] [--level n] [--title ...] [--issue-title ...] [--function ...] [--baseline <sha>] [--date YYYY-MM-DD] [--branch <name>] [--systems a,b] [--step <step>] [--repo owner/name]",
  valued: ["root", "parent", "kind", "level", "title", "issue-title", "function", "baseline", "date", "branch", "systems", "step", "repo"], min: 2, max: 2 });
const issue = parseInt(args[0], 10), slug = args[1];
if (!issue || !slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error("usage: node new.js <issue> <slug> [--root <repo>] [--parent <folder>] [--kind issue|tracking] [--level n] [--title ...] [--issue-title ...] [--function ...] [--baseline <sha>] [--date YYYY-MM-DD] [--branch <name>] [--systems a,b] [--step <step>] [--repo owner/name]");
  process.exit(2);
}
let root; try { root = repoRoot(args); } catch (e) { console.error(e.message); process.exit(2); }
const tpl = path.resolve(__dirname, "..", "template");
const name = slug.startsWith(issue + "-") ? slug : `${issue}-${slug}`;
const parent = opt(args, "parent", "");
const rel = ["docs", "plans", ...parent.split(/[\\/]/).filter(Boolean), name].join("/"), dir = path.join(root, ...rel.split("/"));
if (fs.existsSync(path.join(dir, "dashboard.html")) || fs.existsSync(path.join(dir, "plan.json"))) { console.error(`refusing to overwrite: ${rel} already holds a plan.json or dashboard.html`); process.exit(1); }

const reg = registry(root);
let repo = opt(args, "repo", reg && reg.reg.repo);
if (!repo) { try { const u = cp.execSync("git remote get-url origin", { cwd: root, encoding: "utf8" }).trim(); const m = u.match(/[:/]([^/:]+\/[^/]+?)(\.git)?$/); if (m) repo = m[1]; } catch (e) { /* stays a placeholder */ } }

const plan = JSON.parse(fs.readFileSync(path.join(tpl, "plan.json"), "utf8"));
delete plan.$comment;
const level = opt(args, "level", null), kind = opt(args, "kind", level === "4" ? "tracking" : "issue");
const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
const step = opt(args, "step", "research"); // its wip.current comes from the step-to-column map (plan/RULES.md §3): lib.js glowFor()
/* A tracking issue (level 4) runs its own steps up to its architecture and the landing of its plan; then "implementation" spans its
   units' runs, each on its own board, from the first unit's start until the last unit lands, and "landed" follows (plan/RULES.md §3). */
const STEPS_BY_LEVEL = {
  2: ["sizing", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"],
  3: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"],
  4: ["sizing", "interview", "research", "architecture", "landing", "implementation", "landed"]};
Object.assign(plan, {
  repo: repo || plan.repo,
  issue, slug: name, folder: rel, kind,
  level: level ? parseInt(level, 10) : null,
  title: opt(args, "title", plan.title),
  issueTitle: opt(args, "issue-title", plan.issueTitle),
  function: opt(args, "function", plan.function),
  status: "planned",
  // parent.board is set by embed.js below, from the folders on disk: "../dashboard.html" only when the parent folder holds a board
  parent: parent ? { issue: parseInt(path.basename(parent), 10) || null, board: null } : null,
  branch: opt(args, "branch", null),
  baseline: { ref: "master", sha: opt(args, "baseline", plan.baseline.sha), date: opt(args, "date", plan.baseline.date) },
  asBuilt: null,
  systems: (opt(args, "systems", "") || "").split(",").filter(Boolean).map(s => (reg && reg.info(s)) || { slug: s, name: s, slot: 0, top: s, status: "built", page: null }),
  wip: { step, since: now, updated: now, detail: "", steps: STEPS_BY_LEVEL[level] || STEPS_BY_LEVEL[3], current: glowFor(step) /* the step-to-column map, plan/RULES.md §3 */, questions: [] /* the research questions, from research-started */, next: null, qa: [], qaMax: 3, waitingOn: null, resume: null, blockers: { waitsOn: [], blocks: [] }, landing: null },
  // impact is written at plan acceptance from impact.md and reconciled at the landing (plan/RULES.md §2, Impact); until then the
  // Impact tab says that nothing is recorded yet
  milestones: [], trail: [], rows: [], impact: null, roadmap: null, followUps: [], documents: [], notes: {}
});
if (plan.parent && !plan.parent.issue) plan.parent = null;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
fs.copyFileSync(path.join(tpl, "dashboard.html"), path.join(dir, "dashboard.html"));
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
console.log(`next: fill plan.json, then node ${sk("embed.js")} ${rel} && node ${sk("check.js")} ${rel} --auto`);
