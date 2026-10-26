#!/usr/bin/env node
// Lay an issue board's foundation (the "sized" event, plan/RULES.md §4): docs/plans/[<parent>/]<issue>-<slug>/{plan.json,dashboard.html}.
//   node new.js <issue> <slug> [--root <repo>] [--parent <folder under docs/plans>] [--kind issue|tracking] [--level 2|3|4]
//               [--title "Short name"] [--issue-title "The issue's title"] [--function "One paragraph"]
//               [--baseline <sha>] [--date YYYY-MM-DD] [--branch <name>] [--systems slug,slug] [--step research] [--repo owner/name]
// The repository root is --root, else the current directory. Systems take their names and colour slots from
// docs/dashboards/systems.json. Refuses to overwrite. Anything not given stays a <placeholder> that check.js refuses.
// With --parent, the new board links its parent's board (parent.board, set by embed.js only when the parent folder holds one), and
// embed.js re-embeds the tracking board in the parent folder, which links its unit to the new board (plan/RULES.md §1) and, once
// the unit is in its wip.current, mirrors the unit's run from the new board (§3). Every later embed.js of this folder does the same.
//
//   node new.js --batch <tracking folder> [--root <repo>] [--units id,id] [--baseline <sha>] [--date YYYY-MM-DD]
// The batch mode (plan/RULES.md §4, "boards-created"): once a tracking plan's units are filed as sub-issues, it lays every unit's board
// that is not in the tree yet, inside the tracking folder as <issue>-<unit slug>/: a foundation that has not started (status planned, no
// step, nothing glowing), its title, systems and parent from the unit row. Its Gap and Considered columns are the presenter's, from the
// tracking issue's documents (research/README.md, architecture.md: the unit's row in the decomposition, the alternatives weighed for
// it); the tracking board is re-embedded, which links each unit to its new board. --units limits it to those unit rows. A later "sized"
// event starts the board in place.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { repoRoot, opt, registry, signedOffParent, glowFor, subIssueBoard } = require("./lib.js");
const { embed } = require("./embed.js");

const args = process.argv.slice(2);
/* A tracking issue (level 4) runs its own steps up to its architecture and the landing of its plan; then "implementation" spans its
   units' runs, each on its own board, from the first unit's start until the last unit lands, and "landed" follows (plan/RULES.md §3). */
const STEPS_BY_LEVEL = {
  2: ["sizing", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "state-boards", "merge", "landed"],
  3: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "state-boards", "merge", "landed"],
  4: ["sizing", "interview", "research", "architecture", "sub-issues", "boards", "landing", "state-boards", "merge", "implementation", "landed"]};
if (args.includes("--batch")) { batch(args); process.exit(0); }
function batch(a) {
  require("../../system/scripts/cliargs.js").strict(a, { usage: "usage: node new.js --batch <tracking folder> [--root <repo>] [--units id,id] [--baseline <sha>] [--date YYYY-MM-DD]", valued: ["batch", "root", "units", "baseline", "date"], max: 0 });
  let root; try { root = repoRoot(a); } catch (e) { console.error(e.message); process.exit(2); }
  const given = opt(a, "batch", ""), tdir = path.resolve(root, given.startsWith("docs/") || given.startsWith("docs\\") ? given : path.join("docs", "plans", given));
  if (!fs.existsSync(path.join(tdir, "plan.json"))) { console.error(`${given} holds no plan.json: name the tracking issue's folder`); process.exit(2); }
  const tp = JSON.parse(fs.readFileSync(path.join(tdir, "plan.json"), "utf8"));
  if (tp.kind !== "tracking") { console.error(`${given} is #${tp.issue}'s board, not a tracking board`); process.exit(2); }
  const only = (opt(a, "units", "") || "").split(",").filter(Boolean), reg = registry(root), tpl = path.resolve(__dirname, "..", "template");
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z"), trel = path.relative(root, tdir).split(path.sep).join("/");
  let base = opt(a, "baseline", null); if (!base) { try { base = cp.execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) { base = (tp.baseline || {}).sha || "<sha>"; } }
  const made = [], kept = [];
  (tp.rows || []).filter(r => r && r.unit && (!only.length || only.includes(r.id))).forEach(r => {
    const u = r.unit;
    if (!Number.isInteger(u.issue) || u.issue <= 0) { kept.push(`${r.id}: no sub-issue filed yet`); return; }
    if (subIssueBoard(tdir, u)) { kept.push(`${r.id}: #${u.issue} has a board`); return; }
    const slug = String(u.slug || r.id).replace(/^\d+-/, ""), name = `${u.issue}-${slug}`, dir = path.join(tdir, name), rel = `${trel}/${name}`;
    if (fs.existsSync(path.join(dir, "plan.json"))) { kept.push(`${r.id}: ${rel}/plan.json exists`); return; }
    const plan = JSON.parse(fs.readFileSync(path.join(tpl, "plan.json"), "utf8")); delete plan.$comment;
    const level = Number.isInteger(u.level) ? u.level : null;
    Object.assign(plan, { repo: tp.repo, issue: u.issue, slug: name, folder: rel, kind: "issue", level, title: r.name, issueTitle: u.title || r.name,
      /* a true sentence until the presenter writes the unit's own function from the documents */
      function: `${r.name}: unit ${u.n != null ? u.n + " " : ""}of #${tp.issue}, its board laid from #${tp.issue}'s architecture. Its own plan is written when its run starts.`, status: "planned", sized: null /* not started: its sized event stamps it */, parent: { issue: tp.issue, board: null }, branch: null,
      baseline: { ref: (tp.baseline || {}).ref || "master", sha: base, date: opt(a, "date", now.slice(0, 10)) }, asBuilt: null,
      systems: [r.system].filter(Boolean).map(s => (reg && reg.info(s)) || (tp.systems || []).find(x => x && x.slug === s) || { slug: s, name: s, slot: 0, top: s, status: "built", board: null }),
      /* not started: no step, nothing glows, the steps its run will take; "sized" starts it in place (plan/RULES.md §4) */
      wip: { step: null, since: now, updated: now, detail: "", steps: STEPS_BY_LEVEL[level] || STEPS_BY_LEVEL[3], current: [], questions: [], research: null, interview: [], plan: null, stages: [], remediation: null, open: [], event: { name: "boards-created", at: now }, history: {} /* not started: its sized event records sizing */, next: null, qa: [], qaMax: 3, waitingOn: null, resume: null, blockers: { waitsOn: (u.blockedBy || []).map(n => ({ issue: n })), blocks: [] }, landing: null },
      milestones: [], trail: [{ date: now.slice(0, 10), column: "gap", label: `Board laid from #${tp.issue}'s architecture; not started` }], rows: [], impact: null, tests: null, roadmap: null, followUps: [], documents: [], notes: {} });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
    fs.copyFileSync(path.join(tpl, "dashboard.html"), path.join(dir, "dashboard.html"));
    embed(dir); made.push(rel);
  });
  made.forEach(m => console.log(`laid ${m}: not started; fill its Gap and Considered columns (and its function) from #${tp.issue}'s research/README.md and architecture.md, then embed.js and check.js`));
  kept.forEach(k => console.log(`left: ${k}`));
  console.log(`${made.length} board${made.length === 1 ? "" : "s"} laid in ${trel}${made.length ? "; the tracking board is re-embedded and links them" : ""}`);
}
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
Object.assign(plan, {
  repo: repo || plan.repo,
  issue, slug: name, folder: rel, kind,
  level: level ? parseInt(level, 10) : null,
  title: opt(args, "title", plan.title),
  issueTitle: opt(args, "issue-title", plan.issueTitle),
  function: opt(args, "function", plan.function),
  status: "planned",
  // the run's start: the plan phase's first bound on a landed board's Timeline tile (plan/RULES.md §2, "The KPI tiles")
  sized: now,
  // parent.board is set by embed.js below, from the folders on disk: "../dashboard.html" only when the parent folder holds a board
  parent: parent ? { issue: parseInt(path.basename(parent), 10) || null, board: null } : null,
  branch: opt(args, "branch", null),
  baseline: { ref: "master", sha: opt(args, "baseline", plan.baseline.sha), date: opt(args, "date", plan.baseline.date) },
  asBuilt: null,
  systems: (opt(args, "systems", "") || "").split(",").filter(Boolean).map(s => (reg && reg.info(s)) || { slug: s, name: s, slot: 0, top: s, status: "built", board: null }),
  wip: { step, since: now, updated: now, detail: "", steps: STEPS_BY_LEVEL[level] || STEPS_BY_LEVEL[3], current: step === "research" ? [] : glowFor(step) /* the step-to-column map, plan/RULES.md §3; a new board has no rows, and during research planning a board with no rows glows nothing */, questions: [] /* the research questions, each with its state, from research-started (plan/RULES.md §3) */, research: null /* the research phase, from research-planning */, interview: [] /* the interview questions, answered or waiting */, plan: null /* the plan pass: writing, or a re-pass */, stages: [] /* the implementation stages, from plan.md */, remediation: null, open: [] /* the open points raised during the run, until resolved */, event: { name: "sized", at: now } /* the last event (plan/RULES.md §4) */, history: { sizing: [{ since: null, ended: now, endedBy: "sized", to: step }] } /* the finished steps, frozen as they end (plan/RULES.md §3, "Finished steps"): sizing ends here */, next: null, qa: [], qaMax: 3, waitingOn: null, resume: null, blockers: { waitsOn: [], blocks: [] }, landing: null },
  // impact is written at plan acceptance from impact.md and reconciled at the landing (plan/RULES.md §2, Impact); until then the
  // Impact tab says that nothing is recorded yet
  milestones: [], trail: [], rows: [], impact: null, tests: null, roadmap: null, followUps: [], documents: [], notes: {}
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
/* The Verdict and As built columns are lists of statements (plan/RULES.md §2, "Statements"): say how they are written when they come. */
console.log("later: the Verdict column, at plan-accepted, is verdict.statements, one decision each with its reference into plan.md (ref: \"plan.md#<heading-anchor>\"; embed.js copies the section's excerpt); the As built column, at each row's outcome, is asBuilt.statements, one per verdict statement, each as-planned, amended or deviated");
console.log(`next: fill plan.json, then node ${sk("embed.js")} ${rel} && node ${sk("check.js")} ${rel} --auto`);
