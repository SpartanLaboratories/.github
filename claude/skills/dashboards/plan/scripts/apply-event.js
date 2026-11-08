#!/usr/bin/env node
// The fast path for a plan-board event (plan/RULES.md §4, "The fast path"): applies what the event's facts alone decide to the board,
// deterministically and with no reasoning, so the admin team can run it itself in well under five seconds; what needs the folder's
// documents is left to the presenter, who enriches the board afterwards (the summary's "enrich" line says whether, and why).
//   node apply-event.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--main <checkout>] [--at <ISO time>]
//                       [--view] [--no-live] [--no-gh] [--json]
// --event      the admin-team protocol's plan-board request (action, event, folder, facts; the message's fenced json block, or the
//              JSON alone)
// --worktree   the worktree the issue's board lives in; the board is <worktree>/<folder>
// --repo       the GitHub slug, owner/repo; held to the request's github and the board's repo. A path to the main checkout is
//              accepted too, read as --main
// --main       the repository's main checkout, where the live repository work board lives (default: the request's repo, else the worktree)
// --at         the event's time (default: facts.at, else now); every stamp the event writes takes it
// --view       the live view only (the land's landing and merge, the post-merge refresh's landed, plan/RULES.md §4, "The live view of a
//              landing"): every board it would write in place (the issue's, its parent tracking board) is written as its view copy under the
//              main checkout's git-ignored docs/plans/.live/view/<folder under docs/plans>/ instead, and read from that copy where one is
//              fresher than the tracked board (lib.js viewOf()); no tracked file is written. The worktree may be the run's, before the merge
//              (--main the checkout; the copy's <base> names the worktree's folder) or the main checkout, after it. A land step raised again is
//              a duplicate; one older than the board's last event is refused. The live repository work board then opens the copies
// --no-live    leave the live repository work board alone; --no-gh builds it from the boards alone (board.js --no-gh)
// --json       print the summary as one JSON object instead of key: value lines
// What it does: reads the request and <worktree>/<folder>/plan.json; applies the event (the step, the stages and the derived as-built
// states, the research questions and phase, the glow, the halt and its resume, the open points, the qa passes, the remediation, the
// questions a halt puts to the user in any step (the interview's, and wip.asked) and their answer at the halt's end, the detail, wip.event and wip.updated, one trail entry, the branch; the snapshot of the step it ended, frozen
// into wip.history.<step>, plan/RULES.md §3, "Finished steps"); re-renders the board onto the current
// template when it is not the verified template plus its data (plan/RULES.md §4, "Every event re-renders the board"); embeds the
// board (its data block and its plan.js sidecar); on a sub-issue applies the standing rule to its parent tracking board (a unit's
// start at sized, complete at an approving qa pass, landed at landed) and re-embeds it, which mirrors the unit's run; runs check.js
// (no browser pass) on every board it wrote and regenerates the live repository work board (board.js --live --refresh-template) at once.
// Writes only the issue's board files, its parent tracking board's files and docs/plans/.live/; never git, never a commit, never the
// committed repository work board. Every file is written through a temporary file and a rename, and on any failure every file it wrote is put
// back as it was: exit 1, nothing changed. Exit 0 when applied, or when the event was already applied (the same event twice changes
// nothing); exit 2 on a usage error.
// A sized on a folder with no board lays the foundation itself and then applies the event to it (plan/RULES.md §4, "The foundation"; layFoundation(),
// lib.js foundationPlan()), so the board can be opened within seconds of the run's start: the title, the issue's title and the function from
// the event, the issue on the tracker (not with --no-gh), the parent's unit row or the registry, each from the first that tells it; what none
// tells reads as being written, never invented, and the summary says enrich: yes, for the presenter to fill it behind the event. Should
// anything fail, it is as any failed event: nothing written, the summary names new.js --at with the event's time.
// Only an explicit signal from the run moves the board's step (plan/RULES.md §4, the implementation-stage and qa-pass rows;
// admin-team/dashboards-skill/explicit-step): an implementation-stage's facts.step has no effect and every stage done implies nothing, so the
// step stays at implementation until the run's qa-pass with verdict "running", which opens the qa visit at the event's time; a returned verdict
// with no running before it for that pass still applies, and says so (summary: warnings; wip.qa[].startUnrecorded, which check.js warns on).
// Since admin-team/dashboards-skill/35: the Document step's event (document, facts.tasks, applied whole; a team-raised state-boards on a
// board in that flow is its state-boards task), the land in two steps (landing, merge), an approving qa pass leading to the Document step;
// seeding at sized (a run's tree, a worktree or the main checkout, branched after a landing starts the boards the main checkout's live view
// shows landed, seedFromView());
// the team-raised seed (admin-team/dashboards-skill/level-1-seed), the seeding alone, board-less as reseed is: a level-1 branch, which sends no sized and has no
// board, carries the repository's pending corrections through it, with its own unit on its tracking board marked complete where facts.tracking and facts.unit
// name it (seed());
// the team-raised unit-landed (admin-team/dashboards-skill/level-1-landed), with --view after the merge, board-less as seed is: that level-1 unit landed
// on its tracking board's view copy by the standing rule (unitLanded()); and at any unit's landing that is its tracking issue's last, the tracking
// board's own landing once its impact is reconciled (lastUnitLanding()), else named for the presenter;
// an open point's report outside the tree copied when the point is raised, for the live view (runOpenJobs()), and every open point
// resolved at the land (check.js fails one left open); a bare test level beside a test word written as its named test level, and a bare
// "Ln" elsewhere elided as a work level with a warning (summary: warnings).
// The fast path owns the Timeline (plan/RULES.md §4, "The fast path owns the Timeline"): the merge's time at landed from facts.mergedAt, git in
// the worktree, then the main checkout, then the pull request's merge time from the tracker (mergeTimes(), lib.js ghMergeTime(); not with
// --no-gh), a warning where none tells it, never an enrichment; the seeding at sized records it from git where the landing could not; a
// foundation it lays starts at the event's time.
// Tracking plans land, then file (admin-team/dashboards-skill/option-d-and-decisions): architecture-signed-off moves a tracking board to its plan's document step; its
// land follows; sub-issues-filed, raised after the merge with --view, moves it to "sub-issues", and a final one closes the filing with nothing
// glowing; the first unit's sized seeds that copy, lays the unit's own board and moves the tracking board to implementation. No board is laid ahead
// of its run: boards-created is refused, and an older board's record of it is read and drawn.
// A work level is never written (levels.js): the laying reads it from the request, else the team's local state, for the kind and the steps line only; a board
// not landed loses any it still holds at this rewrite (lib.js resolveBoard()); a landed one keeps them.
// Events and fills share the boards' short lock (lib.js lockTree()), held for this whole run: a fill (fill.js) merges onto the latest plan.json behind it and
// waits at most this run's second or two, so neither overwrites the other, and every file is written through a rename (lib.js atomicWrite()).
// A stretch when the run was not running (run-restarted, facts { since, ended, reason }; team-raised; admin-team/board/timeline-outages): its
// bounds from the facts alone, recorded once, whichever visit it falls in (lib.js outageSteps()); it bounds the visits and no board mentions
// it (decided 2026-11-05: time that is not counted is not mentioned), so it writes no wip.event, no event note and no trail entry (wip.updated still moves).
// One event's recorded time corrected (retime, facts { event, from, to, reason }; team-raised; admin-team/dashboards/retime): every place the record holds
// the old time moves to the new one (lib.js retimePlan(): plan.sized, the visits and their snapshots, the waits, the questions, the Tests tab's results, on a
// day change its trail entry's date; on a sub-issue its tracking board's record of it too), with one notes.corrections entry; refused, nothing written,
// where the record does not hold the old time, another event is named at it, it bounds a stretch when the run was not running, or the new time crosses
// any other recorded time. No wip.event, no note, no trail entry; a landed or cancelled board takes it, kept as it closed (not re-rendered). Raised again, a duplicate.
"use strict";
const T0 = Date.now();
const fs = require("fs"), path = require("path"), cp = require("child_process");
const lib = require("./lib.js"), TL = require("./testslib.js");
const dev = require(path.resolve(__dirname, "..", "..", "system", "scripts", "deviation.js"));
const { levelRefs, scrubLevels, nameTestLevels } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));
const { nameRefs, scrubNames, scrubWaits, unambiguous } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "namerefs.js"));

const USAGE = "usage: node apply-event.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--main <checkout>] [--at <ISO time>] [--view] [--no-live] [--no-gh] [--json]";
const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: USAGE, valued: ["event", "worktree", "repo", "main", "at"], flags: ["view", "no-live", "no-gh", "json"], max: 0 });
const opt = n => lib.opt(args, n, null), flag = n => lib.flag(args, n);

/* the summary, printed at the end whatever happens */
const S = { result: null, event: null, issue: null, board: null, laid: null, applied: [], enrich: [], rerendered: [], wrote: [], view: [], seeded: [], parent: null, live: null, check: null, warnings: [], defects: [], error: null, restored: 0 };
/* the fast path's own warnings (a bare "Ln" elided as a work level, dashboards-skill/35): printed under "warnings" and counted on the check line */
const WARNINGS = S.warnings;
const say = () => {
  S.ms = Date.now() - T0;
  S.warnings.splice(0, S.warnings.length, ...new Set(S.warnings));
  if (S.warnings.length && S.check && !/fast-path warning/.test(S.check)) S.check += ` · ${S.warnings.length} fast-path warning${S.warnings.length === 1 ? "" : "s"} (below)`;
  const enrich = S.enrich.length ? "yes" : "no";
  if (flag("json")) { console.log(JSON.stringify({ ...S, enrich, why: S.enrich.length ? S.enrich : ["the event's facts decide everything it writes"] })); return; }
  const L = [["apply-event", S.result], ["event", S.event], ["issue", S.issue != null ? "#" + S.issue : null], ["board", S.board], ["laid", S.laid],
    ["applied", S.applied.join("; ") || "nothing"], ["enrich", enrich], ["why", S.enrich.length ? S.enrich.join("; ") : "the event's facts decide everything it writes"],
    ["rerendered", S.rerendered.join(", ") || "none"], ["wrote", S.wrote.join(", ") || "nothing"], ["view", VIEWING ? S.view.join(", ") || "nothing" : null], ["seeded", S.seeded.length ? S.seeded.join(", ") : null], ["parent", S.parent || "none"], ["live", S.live || "untouched"],
    ["check", S.check || "not run"], ["warnings", S.warnings.length ? S.warnings.map(w => "warn " + w).join(" | ") : null], ["issue defects", S.defects.length ? S.defects.join(" | ") : null], ["error", S.error], ["restored", S.error ? `${S.restored} file${S.restored === 1 ? "" : "s"}, as they were` : null], ["time", `${S.ms} ms`]];
  L.filter(([, v]) => v != null).forEach(([k, v]) => console.log(`${k}: ${v}`));
};
class Refusal extends Error {}
const refuse = m => { throw new Refusal(m); };

/* Files: every write is staged (its old bytes kept) and atomic (a temporary file, then a rename); rollback() puts every staged file
   back. A rename can meet a file a browser holds open for a moment (Windows): it is retried briefly. */
const staged = new Map(), madeDirs = [];
const atomicWrite = lib.atomicWrite;
const stage = file => { if (!staged.has(file)) staged.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null); };
function put(file, text) {
  stage(file);
  const old = staged.get(file), now = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (now && Buffer.compare(now, Buffer.from(text)) === 0) return false;
  atomicWrite(file, text);
  return old === null || Buffer.compare(old, Buffer.from(text)) !== 0;
}
function rollback() {
  let n = 0;
  for (const [file, old] of staged) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file) : null;
    if (old === null) { if (cur !== null) { fs.rmSync(file, { force: true }); n++; } }
    else if (cur === null || Buffer.compare(cur, old) !== 0) { atomicWrite(file, old); n++; }
  }
  madeDirs.reverse().forEach(d => { try { fs.rmdirSync(d); } catch (e) { /* not empty */ } });
  return n;
}

/* The request: the protocol's plan-board JSON, alone or as the message's fenced json block. */
function readRequest(file) {
  let t; try { t = fs.readFileSync(file, "utf8"); } catch (e) { refuse(`cannot read the request ${file}: ${e.message}`); }
  try { return JSON.parse(t); } catch (e) { /* a message: its json block */ }
  const m = t.match(/```json\s*\n([\s\S]*?)\n\s*```/);
  if (!m) refuse(`the request ${file} is neither JSON nor a message with a fenced json block`);
  try { return JSON.parse(m[1]); } catch (e) { refuse(`the request's json block does not parse: ${e.message}`); }
}

const ID = /^[a-z0-9][a-z0-9-]*$/, STEPS = ["sizing", "interview", "research", "architecture", "sub-issues", "boards", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "state-boards", "merge", "landed", "halted", "escalated", "cancelled"];
/* the remediation routes (plan/RULES.md §5, "QA"): their ids name no role (dashboards-skill/33); a request (or a board) that carries the
   older ids, rookie-dev and planner-then-rookie-dev, is read through routeId() and written with the new ones */
const ROUTES = ["on-the-spot", "remediation", "re-plan-then-remediation"], SSTATES = ["done", "current", "todo"];
const ROUTE_OLD = { "rookie-dev": "remediation", "planner-then-rookie-dev": "re-plan-then-remediation" };
const routeId = r => (typeof r === "string" && ROUTE_OLD[r]) || r;
/* a step named in the run's own words (admin-team/board/timeline-waits): "implement", the pipeline's name of its implementation step. Any
   event that reads facts.step may use it; an implementation-stage reads none (its facts.step has no effect, applyEvent()) */
const STEP_ALIASES = { implement: "implementation", implementing: "implementation" };
/* a tracking board has no plan step (plan/RULES.md §3): its run's plan step is its architecture, so a facts.step in these words, on any
   event, is read as the board's architecture step (trackingArchStep()) and never opens wip.plan (KotlinBottools #2,
   admin-team/dashboards/tracking-step-plan). On an issue board "planning" stays unread: there it may name research's planning phase. */
const TRACKING_PLAN_WORDS = new Set(["plan", "planning"]);
/* The column a step's trail entry sits in. */
const STEP_COLUMN = { "sub-issues": "considered", boards: "considered", sizing: "gap", interview: "gap", research: "gap", architecture: "considered", plan: "verdict", branch: "built", implementation: "built", qa: "built", remediation: "built", document: "built", landing: "built", "state-boards": "built", merge: "built", landed: "built", cancelled: "built" };
/* every step in a sentence, and the routes, by their names (passnames.js: one home for each name a board shows) */
const STEP_WORDS = lib.STEP_WORDS, stepWords = lib.stepWords;
const ROUTE_WORDS = lib.ROUTE_WORDS;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const code = s => "`" + s + "`";
/* a retime's time as the record writes one: UTC, to the second */
const retimeStamp = s => new Date(s).toISOString().replace(/\.\d+Z$/, "Z");

/* One event, applied to a copy of the board. Deterministic: the same board, facts and time give the same result. Returns
   { plan, applied, enrich, parentOp } — parentOp the standing rule's move on the parent tracking board, or null. */
function applyEvent(orig, ev, facts, req, now) {
  const plan = JSON.parse(JSON.stringify(orig)), applied = [], enrich = [], resolved = [], today = now.slice(0, 10);
  const w = plan.wip = plan.wip && typeof plan.wip === "object" ? plan.wip : {};
  /* Only an explicit signal from the run moves the board's step (admin-team/dashboards-skill/explicit-step): an implementation-stage's
     facts.step has no effect, whatever it names, "remediation" included, and every stage done does not imply qa: the step stays at
     implementation until the run's qa-pass with verdict "running". Remediation is recognised from the report alone: facts.remediation, or a
     report while the board stands at remediation, which is that remediation's, so a "qa" sent after one is ignored too and the board waits
     for the running event. */
  let remed = false;
  if (ev === "implementation-stage") {
    const said = typeof facts.step === "string" ? facts.step.trim() : "", { step: dropped, ...rest } = facts;
    remed = !!facts.remediation || (["halted", "escalated"].includes(w.step) ? w.resume : w.step) === "remediation";
    facts = rest;
    if (said) applied.push(`facts.step ${JSON.stringify(said)} ignored: an implementation-stage moves no step of its own`);
  }
  /* the step the facts name on any other event, in the run's own words where they differ from the board's (admin-team/board/timeline-waits:
     "implement" is the implementation step); a facts.step that names no step is warned on, never dropped silently, and the step is derived
     from the event */
  if (typeof facts.step === "string" && facts.step.trim()) {
    const said = facts.step.trim(), low = said.toLowerCase(), tplan = plan.kind === "tracking" && TRACKING_PLAN_WORDS.has(low);
    const step = tplan ? trackingArchStep(w) : STEP_ALIASES[low] || said;
    if (step !== facts.step) { facts = { ...facts, step }; applied.push(`facts.step ${JSON.stringify(said)} read as ${step}${tplan ? " (a tracking board has no plan step: its run's plan is its architecture)" : ""}`); }
    if (!STEPS.includes(step)) WARNINGS.push(`STEP UNKNOWN: facts.step ${JSON.stringify(said)} is no step of the board (${STEPS.join(", ")}): the step is derived from the event`);
  }
  /* a steps line written before the landing's three steps (dashboards-skill/34) takes state-boards and merge after its landing, at any
     event of a board still in flight (a landed or cancelled board keeps its line) */
  /* a steps line written before the Document step (dashboards-skill/35) takes it before its landing, and merge after it, at any event of a
     board in flight whose run has not reached its landing; a run at its landing or past it keeps the three landing steps of
     dashboards-skill/34 (lib.js documentSteps()); a landed or cancelled board keeps its line */
  if (Array.isArray(w.steps) && !["built", "abandoned"].includes(plan.status) && !["landed", "cancelled"].includes(w.step)) { const ls = lib.documentSteps(w.steps, lib.shownStep(w)); if (ls !== w.steps) { w.steps = ls; applied.push(`wip.steps: ${ls.includes("document") ? "the Document step before the landing, merge after it" : "state-boards and merge after the landing"}`); } }
  const rows = Array.isArray(plan.rows) ? plan.rows : [], ids = new Set(rows.map(r => r && r.id)), tracking = plan.kind === "tracking";
  /* a text from the facts, as one line; a work level in it (GUIDANCE.md §4) is never written: the phrase is reworded or elided
     (levelrefs.js scrubLevels(): "inside level 3" → "inside the unit's scope" on a sub-issue's board, "the issue's" elsewhere; "a
     level-3 re-pass" → "a re-pass"; "Label level: 3" dropped), and the text is left out only when a work level would remain; the
     presenter is told either way (admin-team/dashboards-skill/23) */
  const scope = plan.parent ? "unit" : "issue";
  /* an identifier (the branch, the version) is never reworded: one that names a work level is left out, as before */
  const IDENT = new Set(["branch", "version"]);
  /* then an internal name (GUIDANCE.md §4, "No internal names"; namerefs.js scrubNames(), dashboards-skill/33): the pipeline's agents,
     sessions and roles and the approval flow are never written either: "accepted by the admin team" → "accepted", "a planner re-pass"
     → "a plan re-pass", "rookie-dev's fixes" → "the fixes", "(the user's call)" dropped; a text that still names one no library uses is
     left out, and one that names a word a library may use as well (the planner, the verifier) is written and named for the presenter */
  const shortJ = r => JSON.stringify(r.length > 80 ? r.slice(0, 79) + "…" : r);
  const txt = (v, field) => {
    if (typeof v !== "string" || !v.trim()) return null;
    let s = v.replace(/\s+/g, " ").trim();
    /* a bare test level beside a test word is written as its named test level ("L2 test" → "L2 component test"; levelrefs.js
       nameTestLevels(), admin-team/dashboards-skill/35): a rewording the facts alone decide */
    if (!IDENT.has(field)) { const nt = nameTestLevels(s); if (nt.named.length) { s = nt.text; applied.push(`facts.${field}: ${nt.named.join(", ")} written as ${nt.named.length === 1 ? "its" : "their"} named test level`); } }
    /* a qa pass is named "Quality Review N" (passnames.js renamePassText(); "qa pass 1's fixes" → "Quality Review 1's fixes"): a rewording
       the facts alone decide, so neither a run nor a fill brings the older wording back */
    if (!IDENT.has(field)) { const qr = lib.renamePassText(s); if (qr !== s) { applied.push(`facts.${field}: ${lib.passRefs(s).map(h => JSON.stringify(h)).join(", ")} written as "${lib.PASS_NAME} N"`); s = qr; } }
    if (levelRefs(s).length) {
      const el = [], r = IDENT.has(field) ? null : scrubLevels(s, { scope, elided: el });
      /* a bare "Ln" elided as a work level is warned on, so the elision is visible (dashboards-skill/35) */
      if (r && el.length) WARNINGS.push(`LEVEL ELIDED: facts.${field}: ${el.map(h => JSON.stringify(h)).join(", ")} elided as a work level (written ${shortJ(r)}); a test level is written with its name ("L2 component")`);
      if (!r) { enrich.push(`facts.${field} names a work level, which a board never shows: not written`); return null; }
      enrich.push(`facts.${field} named a work level, which a board never shows: written reworded (${shortJ(r)})`);
      s = r;
    }
    /* a wait on the user reads "waiting on you" (GUIDANCE.md §4; namerefs.js scrubWaits()): a rewording the facts alone decide */
    if (!IDENT.has(field)) s = scrubWaits(s);
    if (!nameRefs(s).length) return s;
    const n = IDENT.has(field) ? { text: s, left: nameRefs(s) } : scrubNames(s);
    if (n.left.some(unambiguous)) { enrich.push(`facts.${field} names ${n.left.map(h => JSON.stringify(h)).join(", ")}, an internal name a board never shows: not written`); return null; }
    if (n.left.length) { enrich.push(`facts.${field} names ${n.left.map(h => JSON.stringify(h)).join(", ")}: written as it is; reword it if it names the pipeline's role rather than the code's`); return n.text; }
    enrich.push(`facts.${field} named an internal name, which a board never shows: written reworded (${shortJ(n.text)})`);
    return n.text;
  };
  /* a step derived from the board, not the facts (sized, resumed): plan on a tracking board, an older board's, reads as its architecture step */
  const tPlan = s => tracking && s === "plan" ? trackingArchStep(w) : s;
  const setStep = s => { if (w.step !== s) { w.step = s; w.since = now; applied.push(`wip.step ${s}`); } };
  const stopped = s => s === "halted" || s === "escalated";
  const curStage = () => (w.stages || []).find(x => x && x.state === "current") || null;
  /* a facts.stage that is a stage's id ("S5"), else null: a sentence such as "S5 done; S6 current" is not an id */
  const stageIdOf = v => { const t = typeof v === "string" ? v.trim() : ""; return t && (w.stages || []).some(x => x && x.id === t) ? t : null; };
  let reportedStage = null;
  const builtCells = list => [...new Set((list || []).map(String).filter(id => ids.has(id)))].map(id => id + ".built");
  const factRows = () => Array.isArray(facts.rows) ? facts.rows.filter(x => typeof x === "string") : null;
  /* wip.current for a step, by the step-to-column map (plan/RULES.md §3; lib.js GLOW_MAP) */
  const glow = step => {
    const m = lib.GLOW_MAP[step]; if (!m) return w.current || [];
    if (m.kind === "none") return [];
    if (m.kind === "columns") return m.cols.slice();
    if (m.kind === "research") return lib.researchGlow(plan).current;
    /* a tracking board filing its units (an older board also creating their boards): each unit row not done in the step glows on its own (lib.js filingGlow()) */
    if (m.kind === "filing") return lib.filingGlow(plan, step);
    if (m.kind === "cells") return (w.current || []).map(String).filter(a => a.split(".").length === 2);
    if (tracking) return (w.current || []).map(String).filter(a => /\.built$/.test(a) && rows.some(r => r.id === a.split(".")[0] && r.unit));
    /* an issue board: the cells of the rows the current stage touches; the whole As built column, ["built"], when it touches no rows
       or no stage is current (plan/RULES.md §3) */
    if (step === "implementation") { const c = curStage(), cells = c ? builtCells(c.rows) : []; return cells.length ? cells : ["built"]; }
    /* remediation: the rows the qa findings touch (facts.rows), else the cells already glowing, else the whole column while unknown */
    const fr = factRows(); if (fr) { const cells = builtCells(fr); return cells.length ? cells : ["built"]; }
    const keep = (w.current || []).map(String).filter(a => /\.built$/.test(a) && ids.has(a.split(".")[0]));
    return keep.length ? keep : ["built"];
  };
  const setGlow = step => {
    const g = glow(step);
    if (JSON.stringify(g) !== JSON.stringify(w.current || [])) { w.current = g; applied.push(`wip.current ${g.length ? g.join(", ") : "empty"}`); }
    /* a row the facts name that is not on the board is reported by its id, as facts.tests reports one (testslib.js): the facts did name rows, the board holds none of them */
    if (step === "remediation" && !tracking) { const fr = factRows() || [], off = [...new Set(fr.filter(x => !ids.has(x)))], full = g.length === 1 && g[0] === "built";
      if (fr.length && full && off.length === fr.length) enrich.push(`facts.rows names no row on this board: ${off.join(", ")} (the whole As built column glows until the presenter names them)`);
      else if (off.length) enrich.push(`facts.rows names rows not on this board (${off.join(", ")}): left out`);
      else if (full) enrich.push("the rows the qa findings touch are not known from the facts: the whole As built column glows until the presenter names them"); }
  };
  let detail = txt(facts.detail, "detail"), note = txt(facts.note, "note"), trail = null, parentOp = null;
  /* the Tests tab is due an update when a stage is reported done or a qa pass returns its verdict (plan/RULES.md §2, "The Tests tab") */
  let testsDue = false;
  const research = () => (w.research = w.research && typeof w.research === "object" ? w.research : { phase: null, drafted: 0, since: {} });
  const setPhase = ph => { const r = research(); r.since = r.since && typeof r.since === "object" ? r.since : {}; if (r.phase !== ph) { r.phase = ph; r.since[ph] = now; applied.push(`wip.research.phase ${ph}`); } };
  const qs = () => (w.questions = Array.isArray(w.questions) ? w.questions : []);
  const openList = () => { const q = qs(); return q.filter(x => !["returned", "verifying", "complete"].includes(lib.qState(x))).map(x => code(x.question)); };
  const researchDetail = () => { const q = qs(), ret = q.filter(x => x.findings != null).length;
    return q.length ? `Research: ${ret} of ${plural(q.length, "question")} returned${openList().length ? "; open: " + openList().join(", ") : ""}.` : "Research: the questions are being drafted."; };
  const docRef = f => fs.existsSync(path.join(DIR, f)) ? f : null;
  /* the note, detail and trail entry of a remediation report: facts.stage (what the report says it reached) first, else the
     sub-steps done and the current ones (several may run in parallel); from the facts alone, so the same event twice writes the same board */
  const remediationWording = () => {
    const R = w.remediation || {}, ss = R.steps || [], curs = ss.filter(x => x.state === "current"), dn = ss.filter(x => x.state === "done");
    const said = txt(facts.stage, "stage"), name = lib.remediationName(R.route, R.pass);
    const names = curs.map(x => x.name).join(curs.length > 1 ? " | " : "");
    const what = said || [dn.length ? `${plural(dn.length, "sub-step")} done` : null, curs.length === 1 ? `${names} current` : curs.length ? `${curs.length} sub-steps current in parallel: ${names}` : ss.length ? "every sub-step done" : null].filter(Boolean).join("; ") || null;
    note = note || (said || [dn.length ? `${dn.length} of ${plural(ss.length, "sub-step")} done` : null, curs.length === 1 ? "the next current" : curs.length ? `${curs.length} current in parallel` : null].filter(Boolean).join("; ") || name);
    detail = detail || `${name}${curs.length === 1 ? ": " + names : what ? ": " + what : ""}.`;
    /* the step by its route's name (passnames.js remediationName(): "Correction", a later one "Correction of Quality Review 2"), then what it reached */
    trail = { column: "built", label: `${name}${what ? ": " + what : ""}` };
  };

  switch (ev) {
    case "sized": {
      /* a tracking board's step a sized derives (no facts.step) is never plan either: an older board left there reads as its architecture */
      const step = facts.step || tPlan(w.step === "sizing" || !w.step ? null : stopped(w.step) ? w.resume : w.step);
      if (!step || !["interview", "research", "plan", "architecture"].includes(step)) refuse(`sized names no step to start at (facts.step: interview, research or plan; got ${JSON.stringify(facts.step || null)})`);
      if (stopped(w.step)) { w.resume = null; w.waitingOn = null; }
      /* the run's start, kept once: the plan phase's first bound on the Timeline tile (plan/RULES.md §2, "The KPI tiles") */
      if (!lib.okStamp(plan.sized)) { plan.sized = now; applied.push(`sized ${now}`); }
      setStep(step); setGlow(step);
      if (step === "plan" && !tracking && !w.plan) { w.plan = plan.parent ? { state: "re-pass", from: "parent", since: now } : { state: "writing", since: now }; applied.push(`wip.plan ${w.plan.state}`); }
      enrich.push(lib.foundationFilling(plan).function || lib.foundationFilling(plan).columns.length ? "sized: the foundation is laid and the event applied; what reads as being written comes from the issue and the documents: the function, the rows with their Gap and, for a sub-issue of a signed-off tracking plan, the Considered column, written in place on this board, as at any enrichment (embed.js clears plan.foundation)" : "sized: the function and, for a sub-issue of a signed-off tracking plan, the Gap and Considered columns come from the documents");
      detail = detail || `Sized; ${STEP_WORDS[step]} starts.`;
      /* a corrected sizing (a second sized with no event between, a request re-sent with corrected facts) adds no second entry where
         the trail already records the sizing that day (the foundation's "Run started" entry, or the first sized's own) */
      const resent = w.event && w.event.name === "sized" && (plan.trail || []).some(x => x && x.date === today && lib.trailStep(x.label) === "sizing");
      trail = resent ? null : { column: "gap", label: `Sized; ${STEP_WORDS[step]} starts` };
      if (plan.parent) parentOp = { kind: "start" };
      break;
    }
    case "halted": {
      if (!["waitingOn", "detail"].some(k => typeof facts[k] === "string" && facts[k].trim())) refuse("halted carries no facts.waitingOn (what waits on the user)");
      /* a text the board cannot show (a work level) gives way to a plain one; the presenter is told (txt) */
      const waiting = txt(facts.waitingOn, "waitingOn") || txt(facts.detail, "detail") || "An answer.";
      const resume = stopped(w.step) ? w.resume : w.step;
      if (!resume || stopped(resume)) refuse("halted: the board records no step to resume at");
      if (w.resume !== resume) { w.resume = resume; applied.push(`wip.resume ${resume}`); }
      setStep("halted");
      if (w.waitingOn !== waiting) { w.waitingOn = waiting; applied.push("wip.waitingOn"); }
      /* the questions the halt puts to the user, with the options each offers (admin-team/dashboards/halt-questions, dated 45): at a halt
         in any step, the interview's into wip.interview, any other step's into wip.asked with the step it halted in; the same question
         put again while it waits is no second one (the same event twice writes nothing more) */
      if (Array.isArray(facts.questions)) {
        const iv = resume === "interview" || facts.step === "interview", key = iv ? "interview" : "asked";
        const list = w[key] = Array.isArray(w[key]) ? w[key] : [];
        facts.questions.forEach((q, i) => {
          const text = txt(q && typeof q === "object" ? q.text : q, `questions[${i}].text`); if (!text) return;
          if (iv ? list.some(x => x && x.text === text) : list.some(x => x && x.text === text && x.step === resume && !lib.qAnswered(x))) return;
          const options = q && Array.isArray(q.options) ? q.options.map((o, j) => txt(o, `questions[${i}].options[${j}]`)).filter(Boolean) : [];
          list.push({ ...(iv ? {} : { step: resume }), text, ...(options.length ? { options } : {}), answer: null, asked: now }); applied.push(`wip.${key} + "${text.slice(0, 40)}"`);
        });
      }
      detail = detail || `Waiting on you: ${waiting}`;
      trail = { column: STEP_COLUMN[resume] || "built", label: `Halted at ${stepWords(resume, lib.ctxOf(w))}: waiting on you (${waiting})` };
      break;
    }
    case "resumed": {
      /* the step to return to: the facts', else the one the halt recorded; once resumed (the same event again), the step it is at */
      const step = facts.step || tPlan(w.resume || (!stopped(w.step) && w.event && w.event.name === "resumed" ? w.step : null));
      if (!step || !STEPS.includes(step) || stopped(step)) refuse(`resumed names no step to return to (facts.step, or the board's wip.resume; got ${JSON.stringify(step || null)})`);
      w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared");
      setStep(step); setGlow(step);
      if (step === "interview" && (w.interview || []).some(q => q && q.answer == null)) enrich.push("resumed: the interview's answers are recorded from the user's reply");
      detail = detail || `Resumed at ${stepWords(step, lib.ctxOf(w))}.`;
      trail = { column: STEP_COLUMN[step] || "built", label: `Resumed at ${stepWords(step, lib.ctxOf(w))}` };
      break;
    }
    case "research-planning": {
      const n = Number.isInteger(facts.drafted) && facts.drafted >= 0 ? facts.drafted : 0, r = research();
      setPhase("planning"); if (r.drafted !== n) { r.drafted = n; applied.push(`wip.research.drafted ${n}`); }
      setStep("research"); setGlow("research");
      detail = detail || `Research planning: ${plural(n, "question")} drafted.`;
      trail = { column: "gap", label: `Research planning: ${plural(n, "question")} drafted` };
      break;
    }
    case "research-started": {
      const list = Array.isArray(facts.researching) ? facts.researching : [];
      if (!list.length) refuse("research-started carries no facts.researching ([{question, rows}])");
      const q = qs(), added = [];
      list.forEach((x, i) => {
        const slug = x && x.question;
        if (typeof slug !== "string" || !ID.test(slug)) refuse(`facts.researching[${i}].question ${JSON.stringify(slug)} is not a kebab-case slug`);
        const rws = Array.isArray(x.rows) ? x.rows.filter(y => typeof y === "string" && ID.test(y)) : [];
        const off = rws.filter(y => !ids.has(y)); if (off.length) enrich.push(`question ${code(slug)} names rows not on the board yet (${off.join(", ")}): the presenter writes them`);
        const have = q.find(y => y && y.question === slug);
        if (!have) { q.push({ question: slug, rows: rws, findings: null, state: "researching", started: now }); added.push(code(slug)); }
        else if (lib.qState(have) === "planning") { Object.assign(have, { rows: [...new Set([...(have.rows || []), ...rws])], state: "researching", started: now }); added.push(code(slug)); }
      });
      if (added.length) applied.push(`wip.questions + ${added.join(", ")}`);
      setPhase("research"); setStep("research"); setGlow("research");
      detail = detail || researchDetail();
      trail = { column: "gap", label: `Research started: ${list.map(x => code(x.question)).join(", ")}` };
      break;
    }
    case "research-returned": {
      const r = facts.returned;
      if (!r || typeof r.question !== "string" || !ID.test(r.question) || typeof r.findings !== "string" || !r.findings.trim()) refuse("research-returned carries no facts.returned {question, findings}");
      let f = r.findings.trim().replace(/\\/g, "/").replace(/^\.\//, "");
      const folder = String(plan.folder || "").replace(/\/?$/, "/"); if (folder !== "/" && f.startsWith(folder)) f = f.slice(folder.length);
      if (!fs.existsSync(path.join(DIR, f))) enrich.push(`the findings ${f} are not in the folder yet`);
      const q = qs(); let have = q.find(y => y && y.question === r.question);
      if (!have) { have = { question: r.question, rows: [], findings: null, state: "researching" }; q.push(have); enrich.push(`question ${code(r.question)} was not recorded by a research-started: the presenter names its rows`); }
      if (have.findings !== f || lib.qState(have) !== "returned") { if (["verifying", "complete"].includes(lib.qState(have)) && have.findings === f) { /* already further on */ } else { Object.assign(have, { findings: f, state: "returned", returned: now }); applied.push(`wip.questions ${code(r.question)} returned`); } }
      setStep("research"); setGlow("research");
      note = note || `returned: ${r.question}`;
      detail = detail || researchDetail();
      trail = { column: "gap", label: `Research returned: ${code(r.question)}`, ref: f };
      break;
    }
    case "verification-started": {
      const q = qs(), ret = q.filter(x => lib.qState(x) === "returned");
      ret.forEach(x => { x.state = "verifying"; }); if (ret.length) applied.push(`wip.questions ${ret.map(x => code(x.question)).join(", ")} verifying`);
      const ver = q.filter(x => lib.qState(x) === "verifying").length;
      if (!ver) enrich.push("verification-started: no returned question is recorded to verify");
      setPhase("verification"); setStep("research"); setGlow("research");
      detail = detail || `Research: verifying ${plural(ver, "finding")}.`;
      trail = { column: "gap", label: `Verification started: ${plural(ver, "finding")}` };
      break;
    }
    case "researched": {
      const q = qs(), none = q.filter(x => x.findings == null);
      q.filter(x => x.findings != null && x.state !== "complete").forEach(x => { x.state = "complete"; });
      if (q.length) applied.push("wip.questions complete");
      if (none.length) enrich.push(`questions with no findings recorded (${none.map(x => x.question).join(", ")}) cannot be complete`);
      setPhase("complete");
      const step = facts.step || (tracking ? "architecture" : "plan");
      if (!["architecture", "plan"].includes(step)) refuse(`researched: the next step is architecture or plan (got ${JSON.stringify(step)})`);
      setStep(step);
      if (step === "plan" && !tracking && (!w.plan || w.plan.state !== "writing")) { w.plan = { state: "writing", since: now }; applied.push("wip.plan writing"); }
      setGlow(step);
      enrich.push("researched: the Gap column and its milestone come from research/README.md and the findings");
      detail = detail || `Research verified; ${STEP_WORDS[step]} next.`;
      trail = { column: "gap", label: `Research verified; ${STEP_WORDS[step]} next`, ref: docRef("research/README.md") };
      break;
    }
    case "architecture-signed-off": {
      if ((w.questions || []).length || w.research) applied.push("wip.questions and wip.research cleared");
      w.questions = []; w.research = null;
      /* a tracking board has no plan step: a plan pass a sized at "plan" left standing is cleared here (KotlinBottools #2, admin-team/dashboards/tracking-plan-events) */
      if (tracking && w.plan) { w.plan = null; applied.push("wip.plan cleared (a tracking board has no plan step)"); }
      /* a tracking board's own steps after its architecture: its plan's documents and its land; its units are filed after the merge */
      const next = tracking ? "document" : "landing";
      if (tracking) withUnitSteps(w, applied);
      setStep(next); setGlow(next);
      if (tracking && rows.some(r => r.unit)) { const nx = lib.nextUnit(plan), id = nx ? nx.id : null; if (w.next !== id) { w.next = id; applied.push(`wip.next ${id}`); } }
      enrich.push("architecture-signed-off: the Considered column and, on a tracking board, the unit rows come from architecture.md");
      detail = detail || (tracking ? "Architecture signed off; the plan's documents and its land are next, and its units are filed after the merge." : "Architecture signed off; the plan lands next.");
      trail = { column: "considered", label: "Architecture signed off", ref: docRef("architecture.md") };
      break;
    }
    /* team-raised after the plan's merge, with --view (plan/RULES.md §4; admin-team/dashboards-skill/28): the units filed as sub-issues, each event
       per unit (facts.units [{unit: <row id>, issue: n}], one or more at a time) and a final one closing the step (facts.final: true). The
       first event ends the plan's merge. The glow is the units with no issue yet (lib.js filingGlow()), so each unit stops glowing as its issue is
       recorded; the counts are read from the rows. The final event, once every unit is filed, leaves the step at sub-issues with nothing glowing, until
       the first unit's start moves it to implementation (applyParent()); one that comes too early says so. facts.merge (and facts.pr) record the plan's
       merge (wip.landing), which the next sized in the repository holds it to when it seeds this copy (seedFromView()). */
    case "sub-issues-filed": {
      if (!tracking) refuse("sub-issues-filed is a tracking board's event");
      (Array.isArray(facts.units) ? facts.units : []).forEach(x => { const id = x && (x.unit || x.row || x.id), n = x && x.issue;
        const r = rows.find(y => y && y.id === id && y.unit); if (!r) { enrich.push(`sub-issues-filed names ${JSON.stringify(id)}, which is no unit row of the board`); return; }
        if (!Number.isInteger(n) || n <= 0) { enrich.push(`sub-issues-filed gives ${id} no issue number`); return; }
        if (r.unit.issue !== n) { r.unit.issue = n; applied.push(`${id}: unit.issue #${n}`); } });
      const units = rows.filter(r => r && r.unit), filed = units.filter(lib.unitFiled).length, final = facts.final === true, all = units.length > 0 && filed === units.length;
      if (!units.length) enrich.push("sub-issues-filed: the board has no unit rows yet: the presenter writes them from architecture.md");
      if (final && !all && units.length) enrich.push(`sub-issues-filed closes the step, but ${units.length - filed} of the ${plural(units.length, "unit")} have no issue yet: the step stays at sub-issues`);
      withUnitSteps(w, applied);
      /* a board already at its units' runs, or an older one at its boards step, stays there: a late filing moves nothing back */
      const stood = stopped(w.step) ? w.resume : w.step, next = ["implementation", "boards"].includes(stood) ? stood : "sub-issues", closed = final && all;
      recordPlanMerge(plan, w, facts, applied, txt);
      setStep(next); setGlow(next);
      detail = detail || `${filed} of ${plural(units.length, "unit")} filed as sub-issues${closed ? "; each unit's board appears when its run starts" : ""}.`;
      trail = { column: "considered", label: `${filed} of ${plural(units.length, "unit")} filed as sub-issues${closed ? "; filing done" : ""}` };
      /* the final event is recorded as such, so one that comes too early is not taken for the last per-unit event again (a duplicate) */
      if (final) note = note || (closed ? "final: filing done" : `final, too early: ${units.length - filed} of ${plural(units.length, "unit")} with no issue yet`);
      break;
    }
    case "plan-accepted": {
      if ((w.questions || []).length || w.research || w.plan) applied.push("wip.questions, wip.research and wip.plan cleared");
      w.questions = []; w.research = null; w.plan = null;
      /* A tracking board has no plan, branch or build step before its units are filed (plan/RULES.md §3, §4): its run's plan-accepted
         (the architecture final with its units) keeps it in its own line, never at branch, where a unit not yet filed fails the check
         (KotlinBottools #2, admin-team/dashboards/tracking-plan-events). */
      if (tracking) {
        withUnitSteps(w, applied);
        const next = trackingPlanStep(w); setStep(next); setGlow(next);
        if (rows.some(r => r.unit) && w.next == null) { const nx = lib.nextUnit(plan); if (nx) { w.next = nx.id; applied.push(`wip.next ${nx.id}`); } }
        enrich.push("plan-accepted on a tracking board: the unit rows' Considered and Verdict columns, the verdict milestone and the consequences come from architecture.md and consequences.md");
        detail = detail || (next === "document" ? "Architecture final with its units; the plan's documents and its land are next, and its units are filed after the merge." : w.detail || null);
        trail = { column: "verdict", label: "Architecture final, with its units", ref: docRef("architecture.md") };
        break;
      }
      setStep("branch"); setGlow("branch");
      enrich.push("plan-accepted: the Considered and Verdict columns, the verdict milestone and the consequences come from plan.md and consequences.md (impact.md in an older folder)");
      detail = detail || "Plan accepted; the branch is cut next.";
      trail = { column: "verdict", label: "Plan accepted", ref: docRef("plan.md") };
      break;
    }
    case "branch-cut": {
      const b = txt(facts.branch, "branch") || txt(req.branch, "branch");
      if (b && plan.branch !== b) { plan.branch = b; applied.push(`branch ${b}`); }
      if (!b && !plan.branch) enrich.push("branch-cut names no branch");
      /* A tracking board's build is its units' runs, after their filing (plan/RULES.md §3): its run's branch-cut records the planning branch,
         its facts.stages are the units its rows already hold, so no wip.stages are written and the board stays in its own line
         (KotlinBottools #2, admin-team/dashboards/tracking-plan-events). */
      if (tracking) {
        withUnitSteps(w, applied);
        const units = rows.filter(r => r && r.unit), said = Array.isArray(facts.stages) ? facts.stages.length : 0;
        if (said) applied.push(`facts.stages: ${plural(said, "stage")}, read as the units; no wip.stages on a tracking board`);
        if (!units.length) enrich.push("branch-cut on a tracking board with no unit rows yet: the presenter writes them from architecture.md");
        else if (said && said !== units.length) enrich.push(`branch-cut names ${plural(said, "stage")} and the board holds ${plural(units.length, "unit row")}: the presenter checks the units against architecture.md`);
        const next = trackingPlanStep(w); setStep(next); setGlow(next);
        if (units.length && w.next == null) { const nx = lib.nextUnit(plan); if (nx) { w.next = nx.id; applied.push(`wip.next ${nx.id}`); } }
        detail = detail || (next === "document" ? `Planning branch ${code(plan.branch || "?")} confirmed; the plan's documents and its land are next.` : w.detail || null);
        trail = { column: "verdict", label: `Planning branch ${code(plan.branch || "?")} confirmed` };
        break;
      }
      mergeStages(w, facts, applied, enrich, true, ids);
      setStep("implementation"); setGlow("implementation");
      const c = curStage();
      detail = detail || `Branch ${code(plan.branch || "?")} cut; implementation starts${c ? ` at ${c.id}: ${c.name}` : ""}.`;
      trail = { column: "built", label: `Branch ${code(plan.branch || "?")} cut; implementation starts${c ? " at " + c.id : ""}` };
      break;
    }
    case "implementation-stage": {
      if (plan.status === "planned") { plan.status = "building"; applied.push("status building"); }
      reportedStage = stageIdOf(facts.stage) || (curStage() || {}).id || null;
      if (Array.isArray(facts.open)) mergeOpen(w, facts, applied, txt, `implementation-stage ${reportedStage || ""}`.trim(), resolved, plan.folder, DIR, enrich);
      /* During remediation (facts.remediation, or a report while the board stands at remediation) the report answers a qa pass: its
         sub-steps are written whether or not the facts also carry the stages (which are then merged too, every one done), and the wording
         follows the remediation, facts.stage first, never "Quality Review next". */
      const fixedBefore = new Set(((w.remediation || {}).steps || []).filter(x => x && x.state === "done").map(x => x.name));
      if (facts.remediation) setRemediation(w, facts.remediation, applied, enrich, txt);
      /* A report can change what the rows say while it finishes no stage (WebTools #67, the report of qa pass 1's fixes: every stage already done, a sub-step done,
         a new deviation D7, and it said enrich: no): a remediation sub-step it finishes, or a deviation it names, needs the documents too (plan/RULES.md §4,
         "The fast path"). From the board and the facts alone, so the same report twice asks nothing new of the sub-steps. */
      const reportWithoutStage = () => {
        const fixed = facts.remediation ? ((w.remediation || {}).steps || []).filter(x => x && x.state === "done" && !fixedBefore.has(x.name)) : [];
        const devs = (Array.isArray(facts.deviations) ? facts.deviations : []).filter(d => typeof d === "string" && d.trim());
        if (!fixed.length && !devs.length) return;
        const rws = (Array.isArray(facts.rows) ? facts.rows : []).filter(id => ids.has(id));
        enrich.push(`${[fixed.length ? `${plural(fixed.length, "remediation sub-step")} done` : null, devs.length ? `${plural(devs.length, "deviation")} named` : null].filter(Boolean).join(", ")}: the summaries and outcomes of ${rws.length ? rws.join(", ") : "the rows they touch"}, and any deviation from final-implementation.md, come from the documents`);
        if (fixed.length) testsDue = true;
      };
      if (remed && !Array.isArray(facts.stages)) {
        setStep("remediation"); setGlow("remediation");
        reportWithoutStage();
        remediationWording();
        break;
      }
      const before = JSON.parse(JSON.stringify(w.stages || []));
      mergeStages(w, facts, applied, enrich, false, ids, remed);
      const st = w.stages || [], done = st.filter(x => x.state === "done" && !before.some(y => y.id === x.id && y.state === "done"));
      /* the derived as-built states (plan/RULES.md §2, "Before the outcome"): never an outcome; an outcome a row already records stays */
      rows.forEach(r => {
        const s = lib.stagedState(plan, r), have = lib.recordedState(r);
        if (!s || s === have || !["pending", ...lib.BUILDING_STATES].includes(have)) return;
        if (s === "partially-built" && !(r.asBuilt && typeof r.asBuilt.summary === "string" && r.asBuilt.summary.trim())) { enrich.push(`${r.id} is partially built and has no summary yet`); return; }
        r.asBuilt = { ...(r.asBuilt || {}), state: s }; applied.push(`${r.id} ${s}`);
      });
      const touched = [...new Set(done.flatMap(x => x.rows || []))].filter(id => ids.has(id));
      testsDue = done.length > 0;
      if (done.length) enrich.push(`stage${done.length > 1 ? "s" : ""} ${done.map(x => x.id).join(", ")} done: the summaries and outcomes of ${touched.length ? touched.join(", ") : "the rows they touch"}, and any deviation from final-implementation.md, come from the documents`);
      else reportWithoutStage();
      const allDone = st.length > 0 && st.every(x => x.state === "done");
      /* the step: remediation when the report is one, else implementation, every stage done or not (only the run's qa-pass with verdict
         "running" moves it on); a late report on a board already at qa or past it moves nothing back */
      const stood = stopped(w.step) ? w.resume : w.step, past = ["qa", "document", "landing", "state-boards", "merge", "landed", "cancelled"].includes(stood);
      const step = remed ? "remediation" : past ? stood : "implementation";
      setStep(step); setGlow(step);
      if (remed) { remediationWording(); break; }
      /* the wording comes from the facts alone, never from what changed, so the same event twice writes the same board: the stage
         reported is facts.stage when it names a done stage, else the last done stage before the current one */
      const c = curStage(), ci = c ? st.indexOf(c) : st.length;
      const rep = st.find(x => x.id === facts.stage && x.state === "done") || st.slice(0, ci).reverse().find(x => x.state === "done") || null;
      /* the Tests tab's classes take the stage reported done, the one the note names (plan/RULES.md §4, facts.tests: "the reported stage"), not a
         stage facts.stage names as current (WebTools #68: stage 1 reported done with facts.stage "stage-2", and its five classes read "stage-2");
         from the facts and the stages alone, so the same event twice gives the same stage */
      if (rep) reportedStage = rep.id;
      note = note || [rep ? `${rep.id} reported done` : null, c ? `${c.id} current` : allDone && !past ? `${lib.PASS_NAME} next` : null].filter(Boolean).join("; ") || null;
      detail = detail || (past ? w.detail || null : c ? `Implementation at ${c.id} of ${st.length}${rep ? `: ${rep.id} is done` : ""}; ${c.id} takes ${c.name}.` : allDone ? `Implementation done, ${plural(st.length, "stage")}; ${lib.PASS_NAME} next.` : "Implementation.");
      trail = { column: "built", label: c ? `${rep ? rep.id + " done; " : ""}${c.id} current: ${c.name}` : allDone ? `Implementation done (${plural(st.length, "stage")})${past ? "" : `; ${lib.PASS_NAME} next`}` : "Implementation stage reported" };
      break;
    }
    case "qa-pass": {
      const Q = facts.qa;
      if (!Q || !Number.isInteger(Q.pass) || Q.pass < 1) refuse("qa-pass carries no facts.qa {pass, verdict, …}");
      const v = String(Q.verdict || "").toLowerCase();
      const verdict = /^(approved?|pass(ed)?|ok)$/.test(v) ? "approved" : /change|fail|reject|request/.test(v) ? "changes-requested" : /running/.test(v) ? "running" : null;
      if (!verdict) refuse(`facts.qa.verdict ${JSON.stringify(Q.verdict)} is not approved, changes-requested or running`);
      const findings = {}; [["documentation", Q.documentation != null ? Q.documentation : Q.doc], ["test", Q.test], ["code", Q.code]].forEach(([k, n]) => { if (Number.isInteger(n) && n >= 0) findings[k] = n; });
      const severity = {}; if (Q.severity && typeof Q.severity === "object") Object.keys(Q.severity).forEach(k => { if (Number.isInteger(Q.severity[k]) && Q.severity[k] >= 0) severity[k] = Q.severity[k]; });
      const route = routeId(Q.route || (facts.remediation || {}).route || null);
      if (route && !ROUTES.includes(route)) refuse(`facts.qa.route ${JSON.stringify(route)} is not one of ${ROUTES.join(", ")}`);
      testsDue = verdict !== "running";
      /* a returned verdict's facts.step "qa" names the step the pass ran in, never the step after it: the step after is the verdict's
         (remediation, or the Document step), so the board never stays at qa with the whole As built column glowing once the pass is in */
      const after0 = verdict !== "running" && facts.step === "qa" ? null : facts.step;
      /* the pass's test report: facts.qa.report, else facts.qa.doc when it names the report rather than counting documentation findings (a run
         sends the report path there, PROTOCOL.md's qa {pass, verdict, doc, …}; WebTools #68, Quality Review 1), else the test report among
         facts.documents (the protocol carries the report path there) */
      const isReport = d => typeof d === "string" && /(^|[\\/])reports[\\/]tests[\\/](.+[\\/])?index\.html?$/i.test(d.trim());
      const rep0 = typeof Q.report === "string" && Q.report.trim() ? Q.report : isReport(Q.doc) ? Q.doc : (Array.isArray(facts.documents) ? facts.documents : []).find(isReport) || null;
      const entry = { pass: Q.pass, verdict, date: today, at: now, findings, ...(Object.keys(severity).length ? { severity } : {}), ...(verdict === "changes-requested" && route ? { route } : {}) };
      const qn = txt(Q.note, "qa.note"); if (qn) entry.note = qn;
      w.qa = Array.isArray(w.qa) ? w.qa : []; const k = w.qa.findIndex(x => x && x.pass === Q.pass);
      /* the pass's test report (facts.qa.report, build/reports/tests/index.html; admin-team/dashboards-skill/35): a build output, never
         committed, so recorded as plain text (its path from the repository root), and copied once, when the pass returns, under the
         git-ignored docs/plans/.live/open/ for the live view to link (reportCopy); a pass recorded before keeps its copy */
      const had = k >= 0 ? w.qa[k] : null;
      /* a returned verdict with no running before it for that pass still applies as it stands, and says so: the summary's warnings line and
         the entry's mark, which check.js warns on, so a pass whose start the run never signalled is not silent. A verdict sent again keeps
         the mark and says nothing new. */
      if (verdict !== "running" && !had) { entry.startUnrecorded = true; WARNINGS.push(`QA START NOT RECORDED: ${lib.passName(Q.pass)}'s verdict came with no qa-pass verdict "running" before it, so the pass's start is not on the record: its qa visit has no start of its own`); }
      else if (verdict !== "running" && had.startUnrecorded) entry.startUnrecorded = true;
      if (rep0) { const rp = openRefLocal(rep0.trim().replace(/\\/g, "/")).replace(/^\.\//, "");
        if (!/^`/.test(rp)) { entry.report = rp; const cp0 = had && had.report === rp && had.reportCopy ? had.reportCopy : openCopyFor(rp, `${lib.passName(Q.pass)} test report`, plan.folder); if (cp0) entry.reportCopy = cp0; } }
      if (k < 0) w.qa.push(entry); else w.qa[k] = { ...(w.qa[k] && w.qa[k].note && !entry.note ? { note: w.qa[k].note } : {}), ...entry };
      w.qa.sort((a, b) => a.pass - b.pass); applied.push(`wip.qa pass ${Q.pass} ${verdict}`);
      /* an open point the qa report raises (or settles) is kept as at an implementation stage (plan/RULES.md §3, wip.open) */
      if (Array.isArray(facts.open)) mergeOpen(w, facts, applied, txt, lib.passName(Q.pass), resolved, plan.folder, DIR, enrich);
      if (w.qaMax !== 3 && !Number.isInteger(w.qaMax)) w.qaMax = 3;
      /* what the pass returned, its findings (passnames.js findingsWords(): "18 findings (3 documentation, 15 code)") */
      const counts = lib.findingsWords(findings, severity);
      const anyFinding = Object.values(findings).some(n => n > 0);
      if (verdict === "approved") {
        if (w.remediation) applied.push("wip.remediation cleared"); w.remediation = null;
        /* the Document step follows an approving pass (dashboards-skill/35); a board on the older line goes to its landing */
        const after = Array.isArray(w.steps) && w.steps.length && !w.steps.includes("document") ? "landing" : "document";
        const step = after0 && STEPS.includes(after0) ? after0 : after; setStep(step); setGlow(step);
        if (anyFinding) enrich.push("qa-pass: the approving pass's findings detail comes from the qa report");
        detail = detail || `${lib.passName(Q.pass)} approved; ${step === "document" ? "the Document step follows" : "the landing follows"}.`;
        if (plan.parent) parentOp = { kind: "complete" };
      } else if (verdict === "changes-requested") {
        setRemediation(w, { pass: Q.pass, ...(facts.remediation || {}), route }, applied, enrich, txt);
        if (route === "re-plan-then-remediation") { w.plan = { state: "re-pass", from: "qa", pass: Q.pass, since: now }; applied.push(`wip.plan re-pass after qa pass ${Q.pass}`); }
        const step = after0 && STEPS.includes(after0) ? after0 : "remediation"; setStep(step); setGlow(step);
        enrich.push("qa-pass: the findings detail (the rows they touch, the pass's note) comes from the qa report");
        detail = detail || `${lib.passName(Q.pass)}: changes requested${counts ? ", " + counts : ""}${route ? "; " + ROUTE_WORDS[route] : ""}.`;
      } else { setStep("qa"); setGlow("qa"); detail = detail || `${lib.passName(Q.pass)} running.`; }
      note = note || `${lib.passName(Q.pass)}: ${verdict}`;
      trail = { column: "built", label: `${lib.passName(Q.pass)}: ${verdict === "changes-requested" ? "changes requested" : verdict}${counts ? ", " + counts : ""}` };
      break;
    }
    case "escalated": {
      const resume = stopped(w.step) ? w.resume : w.step;
      if (!resume || stopped(resume)) refuse("escalated: the board records no step it escalated from");
      if (w.resume !== resume) { w.resume = resume; applied.push(`wip.resume ${resume}`); }
      setStep("escalated");
      /* facts.proposedLevel is the team's, in its local state: never written to a board (levels.js) */
      w.waitingOn = txt(facts.waitingOn, "waitingOn") || "A re-sizing of the issue.";
      enrich.push("escalated: the board follows the issue's new sizing");
      detail = detail || "Escalated: waiting on a re-sizing.";
      trail = { column: STEP_COLUMN[resume] || "built", label: `Escalated at ${stepWords(resume, lib.ctxOf(w))}: waiting on a re-sizing` };
      break;
    }
    case "cancelled": {
      if (plan.status !== "abandoned") { plan.status = "abandoned"; applied.push("status abandoned"); }
      const reason = txt(facts.reason, "reason");
      plan.notes = plan.notes && typeof plan.notes === "object" ? plan.notes : {};
      if (reason) { plan.notes.cancelled = reason; applied.push("notes.cancelled"); } else enrich.push("cancelled carries no facts.reason");
      w.resume = null; w.waitingOn = null; setStep("cancelled"); setGlow("cancelled");
      enrich.push("cancelled: the board's closing state comes from the documents");
      detail = detail || `Cancelled${reason ? ": " + reason : "."}`;
      trail = { column: "built", label: `Cancelled${reason ? ": " + reason : ""}` };
      break;
    }
    /* landing and merge reach the view copies with --view (the land has committed the board; plan/RULES.md §4, "The live view of a landing").
       team-raised (plan/RULES.md §4), the landing in three steps (admin-team/dashboards-skill/34): "landing", the land accepted, the branch
       brought up to date and the code, the version bump and the reconciled documents committed on it; "state-boards", the pre-merge refresh
       of the state boards on the branch, stamped at its head, and its board commit; "merge", the pull request merged. "landed" is applied
       after the merge (the post-merge refresh shows it in the live view; the next landing commits it). Each records its visit's time: the
       step's since, and the step before frozen with its end (wip.history). */
    /* The Document step (admin-team/dashboards-skill/35), between qa (or remediation) and the land: facts.tasks [{id, name, state}], ids
       documentation-review, reconcile-documentation, dokka-check, reconcile-plan, readme-changelog, state-boards and document-landing, states
       done | current | todo, merged by id into wip.document.tasks (a task the event leaves out keeps its state; several may be current: the
       tasks may run in parallel). The admin team raises the state-boards task itself when it accepts the run's state-boards request: a
       "state-boards" event on a board in this flow is that task, current (below). The document-landing task is the team's too: state-boards
       with facts.done moves it to current, and the team raises this event naming it done, just before the executor commits, so the committed
       board carries it closed. This event never moves either of the two back (mergeTasks()), so a run's list, which may lack them or carry
       an older state, cannot undo them. Applied whole on the fast path: the step, the tasks, the glow, the detail and the trail entry; nothing
       needs the documents. */
    case "document": {
      if (["built", "abandoned"].includes(plan.status) || ["landed", "cancelled"].includes(w.step)) refuse(`document: the board has ${plan.status === "abandoned" || w.step === "cancelled" ? "been cancelled" : "landed"} already`);
      if (stopped(w.step)) { w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared"); }
      if (Array.isArray(w.steps) && !w.steps.includes("document")) { const ls = lib.documentSteps(w.steps, null); if (ls !== w.steps && ls.includes("document")) { w.steps = ls; applied.push("wip.steps: the Document step before the landing, merge after it"); } }
      mergeTasks(w, facts.tasks, applied, enrich, txt, { forward: true });
      setStep("document"); setGlow("document");
      ({ note, detail, trail } = documentWording(w, note, detail, txt(facts.task, "task")));
      break;
    }
    case "landing": case "state-boards": case "merge": {
      if (["built", "abandoned"].includes(plan.status) || ["landed", "cancelled"].includes(w.step)) refuse(`${ev}: the board has ${plan.status === "abandoned" || w.step === "cancelled" ? "been cancelled" : "landed"} already`);
      /* the state boards in the Document step (dashboards-skill/35): on a board whose steps line has the Document step (or that is at it), the
         team-raised state-boards is the Document step's state-boards task, current; on a board that reached its landing in the older line it
         is the step of dashboards-skill/34, and so it is on a board already at its landing (or past it), whose line then takes state-boards
         after its landing: the state boards are never put back before a land that has begun */
      const shown = lib.shownStep(w), ln = Array.isArray(w.steps) ? w.steps : [], beforeLand = !shown || shown === "document" || (ln.includes(shown) && ln.includes("landing") && ln.indexOf(shown) < ln.indexOf("landing"));
      const docFlow = w.step === "document" || (stopped(w.step) && w.resume === "document") || (ln.includes("document") && beforeLand);
      if (ev === "state-boards" && !docFlow && ln.includes("landing") && !ln.includes("state-boards")) { const st = ln.slice(); st.splice(st.indexOf("landing") + 1, 0, "state-boards"); w.steps = st; applied.push("wip.steps: state-boards after the landing (the older flow)"); }
      if (ev === "state-boards" && docFlow) {
        if (stopped(w.step)) { w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared"); }
        const t0 = Array.isArray(facts.tasks) ? facts.tasks : [], given = t0.some(x => x && x.id === "state-boards");
        mergeTasks(w, given ? t0 : [...t0, { id: "state-boards", state: facts.done === true ? "done" : "current" }], applied, enrich, txt, { boards: true });
        setStep("document"); setGlow("document");
        ({ note, detail, trail } = documentWording(w, note, detail, "the state boards"));
        break;
      }
      if (stopped(w.step)) { w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared"); }
      if (ev !== "state-boards") closeLandingCommit(w, applied);
      setStep(ev); setGlow(ev);
      const pr = Number.isInteger(facts.pr) && facts.pr > 0 ? facts.pr : null, inPr = pr ? " in PR #" + pr : "";
      const say = { landing: [`land accepted${pr ? ", PR #" + pr : ""}`, ln.includes("document") ? `Landing: the land accepted${inPr}; the branch carries the code, the version bump, the reconciled documents and the state boards.` : `Landing: the branch brought up to date; the code, the version bump and the reconciled documents committed on it.`, `Landing: the land accepted${inPr}`],
        "state-boards": ["the state boards refreshed on the branch", `State boards: the pre-merge refresh on the branch, stamped at its head, and its board commit.`, `State boards: refreshed on the branch before the merge`],
        merge: [`merging${pr ? " PR #" + pr : ""}`, `Merge: merging it${inPr}.`, `Merge: merging it${inPr}`] }[ev];
      note = note || say[0];
      detail = detail || say[1];
      trail = { column: "built", label: say[2], ...(pr ? { ref: `PR #${pr}` } : {}) };
      break;
    }
    case "landed": {
      /* a tracking plan not started on its units: this is its plan's merge, recorded on wip.landing; its asBuilt is the initiative's, written when its last unit lands */
      if (tracking && plan.status === "planned") {
        recordPlanMerge(plan, w, facts, applied, txt);
        w.resume = null; w.waitingOn = null; setStep("merge"); setGlow("merge");
        const pr0 = Number.isInteger(facts.pr) ? facts.pr : null, m0 = (w.landing || {}).merge;
        detail = detail || `The plan landed${pr0 ? " in PR #" + pr0 : ""}; its units are filed next.`;
        trail = { column: "built", label: `The plan landed${pr0 ? " in PR #" + pr0 : ""}${m0 ? ", merge " + String(m0).slice(0, 7) : ""}`, ...(pr0 ? { ref: `PR #${pr0}` } : {}) };
        break;
      }
      closeLandingCommit(w, applied);
      const A = plan.asBuilt && typeof plan.asBuilt === "object" ? plan.asBuilt : {};
      const sha = [facts.sha, facts.merge].find(s => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s)), pr = Number.isInteger(facts.pr) ? facts.pr : null;
      const next = { ...A, ...(sha ? { sha } : {}), ...(typeof facts.merge === "string" && /^[0-9a-f]{7,40}$/.test(facts.merge) ? { merge: facts.merge } : {}), ...(pr ? { pr } : {}),
        ...(txt(facts.version, "version") ? { version: txt(facts.version, "version") } : {}), date: /^\d{4}-\d{2}-\d{2}$/.test(String(facts.date || "")) ? facts.date : (A.date || today) };
      /* the merge's time and the branch's step commits, for the Timeline tile (plan/RULES.md §2, "The KPI tiles"; dashboards-skill/32):
         the fast path owns them (plan/RULES.md §4, "The fast path owns the Timeline"): facts.mergedAt when given, else git (the worktree,
         then the main checkout), else the pull request's merge time from the tracker; what none can tell is left unrecorded, never
         guessed, and recorded from git when the next run's sized seeds this board (seedFromView()); never the presenter's */
      const mt = mergeTimes(plan, facts, req, next.merge || sha || null, next.pr || null);
      if (mt.at) next.at = mt.at; if (Array.isArray(mt.commits) && mt.commits.length) next.commits = mt.commits;
      if (mt.applied) applied.push(mt.applied);
      if (mt.warn) WARNINGS.push(mt.warn);
      plan.asBuilt = next; applied.push("asBuilt");
      /* the board is built, and its step landed, only once every part is resolved and the merge is recorded (check.js); until the
         pre-merge refresh resolves them it stays at the landing, its merge recorded */
      /* a row's recorded state: the outcome its as-built statements derive, else its stored state (plan/RULES.md §2, "Statements") */
      const open = rows.filter(r => ["pending", ...lib.BUILDING_STATES].includes(lib.recordedState(r)));
      w.resume = null; w.waitingOn = null;
      if (next.sha && next.date && !open.length) { if (plan.status !== "built") { plan.status = "built"; applied.push("status built"); } setStep("landed"); setGlow("landed"); }
      else { const at = (Array.isArray(w.steps) && w.steps.includes("merge")) || ["merge", "state-boards"].includes(w.step) ? "merge" : "landing"; setStep(at); setGlow(at); enrich.push(open.length ? `landed: ${open.map(r => r.id).join(", ")} still to resolve before the board is built (it stays at the ${at === "merge" ? "merge" : "landing"} until then)` : "landed: asBuilt has no sha yet"); }
      /* what is still to write from the documents: the open parts are said above; the consequences while they are not reconciled, or not on the board with their document beside it. Nothing left, no enrichment */
      const rec = lib.reconciliation(plan), docs = DIR && ["consequences.md", "impact.md"].some(f => fs.existsSync(path.join(DIR, f)));
      if (rec ? rec.state !== "as-built" : docs) enrich.push("landed: the consequences reconciled from final-implementation.md and consequences.md (impact.md in an older folder), on the board seeded at the next run's sized or by the presenter");
      /* raised again on a board it already landed, the detail the landing's record wrote stays: the same event twice changes nothing */
      detail = detail || ((w.event || {}).name === "landed" && w.detail ? w.detail : `Landed${pr ? " in PR #" + pr : ""}.`);
      /* the merge commit names the merge: facts.merge when given (facts.sha may be the branch's last commit), else the one sha given */
      const mergeSha = next.merge || sha;
      trail = { column: "built", label: `Landed${pr ? " in PR #" + pr : ""}${mergeSha ? ", merge " + mergeSha.slice(0, 7) : ""}`, ...(pr ? { ref: `PR #${pr}` } : {}) };
      if (plan.parent) parentOp = { kind: "landed" };
      break;
    }
    /* team-raised (plan/RULES.md §4; admin-team/board/timeline-outages): a request reported a restart, or a run's request came from a
       different session than its last one, so the run was not running from facts.since to facts.ended. Its bounds come from the facts alone
       and it is never inferred from a gap between events (a gap in one session's requests is never a break); nothing else in the facts is read. The step does not change: the visit it falls in
       is cut around it (lib.js outageSteps()). The same bounds again are a duplicate (main()). No wip.event, no event note and no trail entry: the stretch
       drops out of the times and no board mentions it (decided 2026-11-05); wip.outages and the cut visit's outage field keep it as data. */
    case "run-restarted": {
      if (["built", "abandoned"].includes(plan.status) || ["landed", "cancelled"].includes(w.step)) refuse(`run-restarted: the board has ${plan.status === "abandoned" || w.step === "cancelled" ? "been cancelled" : "landed"} already, and a finished run's board is kept as it ended`);
      if (!lib.isTime(facts.since) || !lib.isTime(facts.ended)) refuse(`run-restarted carries no facts.since and facts.ended, the UTC ISO times the run stopped and came back (got ${JSON.stringify([facts.since || null, facts.ended || null])})`);
      if (!(Date.parse(facts.since) < Date.parse(facts.ended))) refuse(`run-restarted: facts.since ${facts.since} is not before facts.ended ${facts.ended}`);
      if (Date.parse(facts.ended) > Date.parse(now)) refuse(`run-restarted: facts.ended ${facts.ended} is after the event's time ${now}: the event says the run has come back`);
      if (typeof facts.reason !== "string" || !facts.reason.trim()) refuse("run-restarted carries no facts.reason (why, in plain words, such as \"session restart\")");
      const reason = txt(facts.reason, "reason");
      const lastAt = w.event && lib.isTime(w.event.at) ? Date.parse(w.event.at) : null;
      if (lastAt != null && lastAt > Date.parse(facts.since) && lastAt < Date.parse(facts.ended)) WARNINGS.push(`RUN ACTIVE IN THE STRETCH: the board's last event (${w.event.name}, ${w.event.at}) falls inside ${facts.since} → ${facts.ended}: check the bounds`);
      const r = lib.outageSteps(orig, plan, { since: facts.since, ended: facts.ended, reason }, ev);
      if (r.refused) refuse(`run-restarted: ${r.refused}`);
      applied.push(...r.lines);
      detail = detail || w.detail || null;
      note = null; /* no event note, not even one the facts carry, and no wip.event (below): the stretch is mentioned nowhere */
      break;
    }
    /* One event's recorded time corrected (team-raised; admin-team/dashboards/retime; plan/RULES.md §4, the retime row): facts.event, the event
       retimed, facts.from, the time the record holds for it, facts.to, the time it should hold, facts.reason, in plain words. Every place the
       record holds the old time moves to the new one (lib.js retimePlan()), and one notes.corrections entry says so (plan/RULES.md §2: a
       factual error is corrected in place under notes.corrections). It is refused, nothing written, where the record does not hold the old
       time, where the new one would cross a neighbouring bound, or where another event is named at the same time. It writes no wip.event,
       no event note and no trail entry of its own, and changes neither the step nor the detail; wip.updated moves, never back. A board
       that has landed or was cancelled takes it too, kept as it closed otherwise (not re-rendered onto the template): a correction of a fact
       is the one edit its written record takes. On a sub-issue, its tracking board's record of the same time moves with it (main()). Raised
       again (its entry on record), it is a duplicate (main()). Nothing else in the facts is read. */
    case "retime": {
      const E = typeof facts.event === "string" ? facts.event.trim() : "";
      if (!E) refuse("retime carries no facts.event, the event whose recorded time it corrects");
      if (!lib.EVENTS.includes(E) || lib.RETIME_NOT.includes(E)) refuse(`retime: ${JSON.stringify(E)} is no event whose time a retime corrects (one of ${lib.EVENTS.filter(x => !lib.RETIME_NOT.includes(x)).join(", ")}; a stretch's bounds are its own facts)`);
      if (!lib.isTime(facts.from) || !lib.isTime(facts.to)) refuse(`retime carries no facts.from and facts.to, the UTC ISO times the record holds and should hold (got ${JSON.stringify([facts.from || null, facts.to || null])})`);
      const from = retimeStamp(facts.from), to = retimeStamp(facts.to);
      if (from === to) refuse(`retime: facts.from and facts.to are the same time, ${to}: nothing to correct`);
      if (Date.parse(to) > Date.parse(now)) refuse(`retime: facts.to ${to} is after the retime's own time ${now}: a time is never recorded ahead of the record`);
      if (typeof facts.reason !== "string" || !facts.reason.trim()) refuse("retime carries no facts.reason (why the recorded time is wrong, in plain words)");
      const r = lib.retimePlan(plan, { event: E, from, to });
      if (r.refused) refuse(`retime: ${r.refused}`);
      applied.push(...r.lines);
      const reason = txt(facts.reason, "reason");
      if (!reason) enrich.push("retime: its reason was left out of the correction's entry (above): the presenter words it");
      const clock = s => `${s.slice(0, 10)} ${s.slice(11, 19)} UTC`;
      const head = `${lib.retimeWords(E, tracking)} was recorded at ${clock(from)}${reason ? `: ${reason.replace(/[\s.;:,]+$/, "")}` : ""}. It is recorded at ${to.slice(0, 10) === from.slice(0, 10) ? `${to.slice(11, 19)} UTC` : clock(to)}`;
      plan.notes = plan.notes && typeof plan.notes === "object" && !Array.isArray(plan.notes) ? plan.notes : {};
      plan.notes.corrections = Array.isArray(plan.notes.corrections) ? plan.notes.corrections : [];
      const entry = { what: lib.retimeWhat(head, r.words), when: today, retime: { event: E, from, to } };
      plan.notes.corrections.push(entry);
      applied.push("notes.corrections +1");
      /* the sub-issue's tracking board takes the same move in main(), which may add its words to this entry */
      if (plan.parent) parentOp = { kind: "retime", event: E, from, to, head, words: r.words, entry: plan.notes.corrections.length - 1 };
      detail = w.detail || null;
      note = null; /* no event note and no wip.event (below): the correction is said once, in its notes.corrections entry */
      break;
    }
    default: refuse(`unknown event ${JSON.stringify(ev)}`);
  }
  /* The Tests tab (plan/RULES.md §2, "The Tests tab"): an event that carries facts.tests has it applied (testslib.js mergeTests()); an
     implementation stage or a qa verdict without one leaves the tab to the presenter, from the branch's diff and the qa report */
  if (facts.tests != null && ev !== "retime") {
    if (tracking) enrich.push("facts.tests on a tracking board: its units' boards record the tests (the presenter writes them there)");
    else { const qp = ev === "qa-pass" && facts.qa && Number.isInteger(facts.qa.pass) ? facts.qa.pass : null;
      /* A remediation's report names no stage of plan.md: its classes take "Quality Review n fixes", the pass the remediation answers, never the
         report's free-text note ("Quality Review 2 fixes done; reconciliation current" is a status, not a stage) */
      const remPass = remed && w.remediation && Number.isInteger(w.remediation.pass) ? w.remediation.pass : null;
      const r = TL.mergeTests(plan, facts.tests, { now, pass: qp, stage: ev === "implementation-stage" ? reportedStage || stageIdOf(facts.stage) || (remPass ? `${lib.passName(remPass)} fixes` : null) || (typeof facts.stage === "string" && facts.stage.trim() ? lib.renamePassText(facts.stage.trim()) : null) : null, ids, txt: v => txt(v, "tests.note") });
      applied.push(...r.applied); enrich.push(...r.notes.map(n => "tests: " + n)); }
  } else if (!tracking && testsDue)
    enrich.push(`the Tests tab: the event carries no facts.tests; ${ev === "qa-pass" ? "Relevant, Other and the results come from the qa report" : "Added and Amended come from the branch's diff against its base"}`);
  /* the fast path takes open points at every event (plan/RULES.md §4, "The fast path"; moved onto it in dashboards-skill/33): an
     implementation stage and a qa pass raise theirs above, any other event here, raised by the event's name */
  if (Array.isArray(facts.open) && facts.open.length && !["implementation-stage", "qa-pass", "retime"].includes(ev)) mergeOpen(w, facts, applied, txt, ev, resolved, plan.folder, DIR, enrich);
  if (detail !== w.detail) { w.detail = detail; applied.push("wip.detail"); }
  const evRec = { name: ev, at: now, ...(note ? { note } : {}) };
  /* run-restarted leaves wip.event as it was (plan/RULES.md §4; decided 2026-11-05): it is no event of the run's, and a later resumed reads the
     run's own last event, never the break; wip.updated still moves */
  /* retime leaves it too: it is a correction of the record, said in its notes.corrections entry; and its wip.updated never goes back (a
     correction raised with an older time than the board's last write still changed the board after it) */
  if (ev !== "run-restarted" && ev !== "retime") w.event = evRec;
  w.updated = ev === "retime" && lib.isTime(w.updated) && Date.parse(w.updated) > Date.parse(now) ? w.updated : now;
  if (trail) {
    const t = { date: today, column: trail.column, label: trail.label, ...(trail.ref ? { ref: trail.ref } : {}) };
    plan.trail = Array.isArray(plan.trail) ? plan.trail : [];
    if (!plan.trail.some(x => x && x.date === t.date && x.column === t.column && x.label === t.label && (x.ref || null) === (t.ref || null))) { plan.trail.push(t); applied.push("trail +1"); }
  }
  /* a resolved open point is kept in the trail (plan/RULES.md §3, wip.open) */
  resolved.forEach(o => { const t = { date: today, column: "built", label: `Open point resolved: ${o.text}`, ...(o.ref ? { ref: o.ref } : {}) };
    plan.trail = Array.isArray(plan.trail) ? plan.trail : [];
    if (!plan.trail.some(x => x && x.label === t.label)) { plan.trail.push(t); applied.push("trail +1 (open point resolved)"); } });
  /* the finished step's snapshot (plan/RULES.md §3, "Finished steps"; admin-team/dashboards-skill/24): when the event ends the step the
     panel showed (or a remediation loop, or returns a qa verdict), its panel's facts are frozen into wip.history.<step>, as they stood */
  /* the questions put at a halt are answered once the run is out of it: at a resumed, or at any other event that takes the board out of the
     stop but cancelled (admin-team/dashboards/halt-questions, dated 45) */
  { const was = stopped((orig.wip || {}).step); if (ev === "resumed" || (was && !stopped(w.step) && ev !== "cancelled")) applied.push(...lib.answerQuestions(w, now)); }
  applied.push(...lib.freezeSteps(orig, plan, ev, now, facts));
  /* what a stop waited on and the step it was to resume at end with the stop, whichever event takes the board out of it (lib.js waitSteps()'s
     "resumed or any other"): an architecture-signed-off after a halt had left both standing */
  if (stopped((orig.wip || {}).step) && !stopped(w.step) && (w.resume != null || w.waitingOn != null)) { w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared"); }
  /* a halt's questions on the visit the halt ended, and every answer on the snapshots (lib.js syncAsked()) */
  applied.push(...lib.syncAsked(w));
  return { plan, applied, enrich, parentOp };
}

/* wip.stages from facts.stages ([{id, name, state}]), each keeping the rows the board records for it (plan.md's stages, written by the
   presenter); at branch-cut a list with no states starts with the first current and the rest to do. */
/* A tracking board's steps line with its filing step after its plan's merge (plan/RULES.md §3): inserted where a board written before it lacks it; an older line that has sub-issues (and boards) keeps them where they stand. */
function withUnitSteps(w, applied) {
  const st = Array.isArray(w.steps) ? w.steps.slice() : [];
  if (!st.length || st.includes("sub-issues")) return;
  const at = st.indexOf("merge"); if (at < 0) return;
  st.splice(at + 1, 0, "sub-issues"); w.steps = st; applied.push("wip.steps: sub-issues after the merge");
}
/* The step a tracking board stands at once its architecture is final (its run's plan-accepted and branch-cut, admin-team/dashboards/tracking-plan-events):
   the step it already stands at when that is past its architecture in its own line (the Document step, its land, the filing, its units' runs),
   else its plan's documents (document), as architecture-signed-off moves it; a stop is ended there, as any event ends it. */
function trackingPlanStep(w) {
  const at = lib.shownStep(w), line = Array.isArray(w.steps) ? w.steps : [], arch = line.indexOf("architecture");
  if (at && at !== "landed" && line.includes(at) && arch >= 0 && line.indexOf(at) > arch) return at;
  return "document";
}
/* The step a tracking board's "plan" names (TRACKING_PLAN_WORDS): its architecture, the step its run's plan is; once the board stands past
   its architecture in its own line (signed off: the Document step, its land, the filing, its units' runs), the step it stands at, so a
   "plan" sent then (a resumed after a halt in the run's plan step) never moves a signed-off board back (admin-team/dashboards/tracking-step-plan). */
function trackingArchStep(w) {
  const at = lib.shownStep(w), line = Array.isArray(w.steps) ? w.steps : [], arch = line.indexOf("architecture");
  if (at && at !== "landed" && line.includes(at) && arch >= 0 && line.indexOf(at) > arch) return at;
  return "architecture";
}
/* A tracking plan's own merge, from the facts (facts.merge, else a sha in facts.sha; facts.pr; facts.version; facts.date): wip.landing, as a tracking board has recorded it since dashboards-skill/35. */
function recordPlanMerge(plan, w, facts, applied, txt) {
  const m = [facts.merge, facts.sha].find(s => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s)) || null, pr = Number.isInteger(facts.pr) && facts.pr > 0 ? facts.pr : null;
  if (!m && !pr) return;
  const L = w.landing && typeof w.landing === "object" ? w.landing : {}, next = { ...L, ...(pr ? { pr } : {}), ...(m ? { merge: m } : {}), ...(txt(facts.version, "version") ? { version: txt(facts.version, "version") } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(String(facts.date || "")) ? { date: facts.date } : {}) };
  if (JSON.stringify(next) !== JSON.stringify(w.landing || null)) { w.landing = next; applied.push(`wip.landing ${m ? String(m).slice(0, 7) : "PR #" + pr}`); }
}
/* wip.stages from facts.stages (plan/RULES.md §4, "The fast path"). A stage's rows: facts.stages[i].rows when the event gives them (the
   board's row ids only; another is named in the summary and left out), else the rows the board records for it, else, for the one stage a
   remediation report adds (facts.remediation, or any report while the board stands at remediation), the rows the qa findings touch (facts.rows, the board's ids):
   the remediation's own stage then carries every finding, so its rows are exact. Two or more new stages in one report share facts.rows
   between them in a way only the documents tell, so they stay for the presenter, as a plan stage's rows do (WebTools #65, R1 and R2). */
function mergeStages(w, facts, applied, enrich, first, ids, remed = !!facts.remediation) {
  const have = Array.isArray(w.stages) ? w.stages : [];
  if (!Array.isArray(facts.stages) || !facts.stages.length) {
    if (!have.length) enrich.push("the stages of plan.md, with the rows each touches, come from plan.md");
    else if (first && !have.some(x => x.state === "current")) { const t = have.find(x => x.state !== "done"); if (t) { t.state = "current"; applied.push(`wip.stages ${t.id} current`); } }
    return;
  }
  const out = facts.stages.map((s, i) => {
    if (!s || typeof s.id !== "string" || !s.id.trim()) refuse(`facts.stages[${i}] has no id`);
    const old = have.find(x => x && x.id === s.id) || {};
    const state = SSTATES.includes(s.state) ? s.state : first ? (i === 0 ? "current" : "todo") : null;
    if (!state) refuse(`facts.stages[${i}].state ${JSON.stringify(s.state)} is not done, current or todo`);
    const name = typeof s.name === "string" && s.name.trim() ? s.name.replace(/\s+/g, " ").trim() : old.name;
    if (!name) refuse(`facts.stages[${i}] (${s.id}) has no name`);
    let rows = Array.isArray(old.rows) ? old.rows : [], given = false;
    if (Array.isArray(s.rows)) {
      const ok = s.rows.filter(x => typeof x === "string" && (!ids || ids.has(x))), off = s.rows.filter(x => !ok.includes(x));
      if (off.length) enrich.push(`facts.stages[${i}] (${s.id}) names rows not on the board (${off.map(x => JSON.stringify(x)).join(", ")}): not written`);
      rows = [...new Set(ok)]; given = true;
    }
    return { id: s.id, name, state, rows, given };
  });
  const fresh = out.filter(x => !x.given && !have.some(y => y && y.id === x.id));
  const fr = Array.isArray(facts.rows) ? [...new Set(facts.rows.filter(x => typeof x === "string" && (!ids || ids.has(x))))] : [];
  if (remed && fresh.length === 1 && fr.length) { fresh[0].rows = fr; fresh[0].given = true; applied.push(`wip.stages ${fresh[0].id} rows from facts.rows (${fr.join(", ")})`); }
  out.forEach(x => delete x.given);
  if (out.filter(x => x.state === "current").length > 1) refuse("facts.stages names more than one current stage");
  const norows = fresh.filter(x => !x.rows.length).map(x => x.id);
  if (norows.length) enrich.push(remed
    ? `the rows remediation stage${norows.length > 1 ? "s" : ""} ${norows.join(", ")} touch: facts.rows names the rows of every finding and facts.stages[].rows none per stage, so the presenter maps them from the findings and any plan amendment`
    : `the rows stage${norows.length > 1 ? "s" : ""} ${norows.join(", ")} touch come from plan.md`);
  if (JSON.stringify(out) !== JSON.stringify(have)) { w.stages = out; applied.push(`wip.stages ${out.map(x => x.id + " " + x.state).join(", ")}`); }
}
/* wip.document from the facts (admin-team/dashboards-skill/35): {tasks: [{id, name, state}]}, merged by id: a task the event names takes
   its state (and its name, when given; else the name it has, else lib.js DOC_TASK_NAMES), a task it leaves out keeps its own, a new one is
   added in the order lib.js DOC_TASKS gives (another id after them, as given, the document-landing task last of all). Several may be current:
   the tasks may run in parallel. A task with no id, or whose state is not done, current or todo, is refused, as a stage's is.
   The team's own tasks (lib.js TEAM_TASKS): a list that has tasks takes the document-landing task where it has none, to come, or current once
   the state boards are done, so the list never reads "every task done" before that commit; a board with no such task and no new event keeps
   its list. how.forward (the document event): the event moves neither back, so a run's list, written from what it knows, undoes neither.
   how.boards (the team's state-boards event): the state boards done move the commit from to come to current; the state boards raised again
   (a land that asks for them anew, the base having moved) put it back to come, since another commit follows them. */
const TASK_ORDER = ["todo", "current", "done"];
function mergeTasks(w, list, applied, enrich, txt, how = {}) {
  const have = w.document && typeof w.document === "object" && Array.isArray(w.document.tasks) ? w.document.tasks.filter(x => x && typeof x === "object") : [];
  const out = have.map(x => ({ ...x }));
  (Array.isArray(list) ? list : []).forEach((t, i) => {
    const id = t && typeof t.id === "string" ? t.id.trim() : "";
    if (!ID.test(id)) refuse(`facts.tasks[${i}] has no id (a kebab-case task id, such as documentation-review)`);
    if (!SSTATES.includes(t.state)) refuse(`facts.tasks[${i}].state ${JSON.stringify(t.state)} is not done, current or todo`);
    const name = txt(t.name, `tasks[${i}].name`), x = out.find(y => y.id === id);
    if (x) { if (!(how.forward && lib.TEAM_TASKS.includes(id) && TASK_ORDER.indexOf(t.state) < TASK_ORDER.indexOf(x.state))) x.state = t.state; if (name) x.name = name; }
    else { const nm = name || lib.DOC_TASK_NAMES[id]; if (!nm) { enrich.push(`facts.tasks[${i}] (${id}) is no task of the Document step the board knows and carries no name: written with its id as its name`); }
      out.push({ id, name: nm || id, state: t.state }); }
  });
  if (out.length) {
    const named = (Array.isArray(list) ? list : []).some(t => t && t.id === lib.DOC_LANDING_TASK), sb = out.find(x => x.id === "state-boards");
    let dl = out.find(x => x.id === lib.DOC_LANDING_TASK);
    if (!dl) { dl = { id: lib.DOC_LANDING_TASK, name: lib.DOC_TASK_NAMES[lib.DOC_LANDING_TASK], state: "todo" }; out.push(dl); }
    if (!named && sb && sb.state === "done" && dl.state === "todo") dl.state = "current";
    else if (!named && how.boards && sb && sb.state !== "done") dl.state = "todo";
  }
  const rank = id => { if (id === lib.DOC_LANDING_TASK) return Infinity; const k = lib.DOC_TASKS.findIndex(([d]) => d === id); return k < 0 ? lib.DOC_TASKS.length : k; };
  out.sort((a, b) => (rank(a.id) === rank(b.id) ? 0 : rank(a.id) - rank(b.id)));
  if (!out.length) enrich.push("document carries no facts.tasks: the step panel lists none until the tasks are reported");
  const next = { tasks: out };
  if (JSON.stringify(next) !== JSON.stringify(w.document || null)) { w.document = next; applied.push(`wip.document ${out.map(x => x.id + " " + x.state).join(", ") || "(no tasks)"}`); }
}
/* The land has begun, so the document-landing commit is made: a task still open (its raise missed) closes with the land's event, in the
   view copies and the frozen Document step alike. A board with no such task keeps its list. */
function closeLandingCommit(w, applied) {
  const t = ((w.document && Array.isArray(w.document.tasks)) ? w.document.tasks : []).find(x => x && x.id === lib.DOC_LANDING_TASK);
  if (t && t.state !== "done") { t.state = "done"; applied.push(`wip.document ${lib.DOC_LANDING_TASK} done (the land has begun)`); }
}
/* the note, the detail and the trail entry of a Document step event, from its tasks alone (the same event twice writes the same board) */
function documentWording(w, note, detail, said) {
  const ts = ((w.document || {}).tasks || []), cur = ts.filter(x => x.state === "current"), dn = ts.filter(x => x.state === "done");
  const curWords = cur.length ? `${cur.map(x => x.name).join(", ")} ${cur.length > 1 ? "in parallel" : "current"}` : ts.length && dn.length === ts.length ? "every task done" : null;
  const count = ts.length ? `${dn.length} of ${ts.length} task${ts.length === 1 ? "" : "s"} done` : null;
  return { note: note || [said, count].filter(Boolean).join("; ") || "the Document step",
    detail: detail || `Document: ${[count, curWords].filter(Boolean).join("; ") || "the documents and the state boards on the branch"}.`,
    trail: { column: "built", label: `Document: ${curWords || count || "the step begins"}` } };
}
/* wip.remediation from the facts: {pass, route, steps: [{name, state}]}. */
function setRemediation(w, R, applied, enrich, txt) {
  if (!R || !Number.isInteger(R.pass)) refuse("the remediation names no qa pass (facts.remediation.pass)");
  /* the route's neutral id, whatever the request or the board carried (routeId()) */
  R = { ...R, ...(R.route != null ? { route: routeId(R.route) } : {}) };
  if (R.route != null && !ROUTES.includes(R.route)) refuse(`facts.remediation.route ${JSON.stringify(R.route)} is not one of ${ROUTES.join(", ")}`);
  const old0 = w.remediation && w.remediation.pass === R.pass ? w.remediation : {}, old = old0.route ? { ...old0, route: routeId(old0.route) } : old0;
  /* a sub-step's name: a work level in it (GUIDANCE.md §4) is elided ("…") rather than the step dropped, and the presenter is told */
  const stepName = (raw, i) => { const t = txt(raw, `remediation.steps[${i}].name`); if (t || typeof raw !== "string" || !raw.trim()) return t;
    let s = lib.renamePassText(raw.replace(/\s+/g, " ").trim()); levelRefs(s).forEach(h => { s = s.split(h).join("…"); }); s = scrubNames(s).text; nameRefs(s).forEach(h => { s = s.split(h).join("…"); }); return s; };
  const steps = Array.isArray(R.steps) ? R.steps.map((s, i) => { const raw = s && (s.name || s.what), name = stepName(raw, i);
    if (!name) refuse(`facts.remediation.steps[${i}] has no name (got ${JSON.stringify(raw === undefined ? null : raw)})`);
    if (!SSTATES.includes(s.state)) refuse(`facts.remediation.steps[${i}].state ${JSON.stringify(s.state)} is not done, current or todo`);
    return { name, state: s.state }; }) : old.steps;
  /* several sub-steps may be current at once: a remediation's legs can run in parallel (rookie-dev's minor fixes beside the planner's
     ruling, WebTools #63 qa pass 1); each glows in the step panel. A sub-step has one state, so one done or to do is never current.
     The implementation stages keep at most one current (mergeStages). */
  const next = { pass: R.pass, ...(R.route || old.route ? { route: R.route || old.route } : {}), ...(steps ? { steps } : {}) };
  if (JSON.stringify(next) !== JSON.stringify(w.remediation || null)) { w.remediation = next; applied.push(`wip.remediation pass ${R.pass}${next.route ? " " + next.route : ""}`); }
  /* the route is recorded on the pass it answers too, so the decision outlives the loop (wip.remediation is cleared once it ends): every
     board reads the in-place mark from it (lib.js qaInPlace(), dashboards-skill/31). Only a pass that requested changes and records no route. */
  const qp = next.route && Array.isArray(w.qa) ? w.qa.find(p => p && p.pass === R.pass) : null;
  if (qp && qp.verdict === "changes-requested" && qp.route == null) { qp.route = next.route; applied.push(`wip.qa pass ${R.pass} route ${next.route}`); }
}
/* wip.open from facts.open ([{text, raised?, ref?, resolved?}]): a new point appended, a known one (by its text) marked resolved. `raised`
   names the event or stage that raised it (plan/RULES.md §3): a time given there is not one, and the event's own label is used; `ref` is a
   link from the board's folder, so a path from the repository root ("docs/plans/<folder>/plan.md") is made relative to the folder. */
const OPEN_TIME = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
function openRef(ref, folder) {
  let r = String(ref).trim().replace(/\\/g, "/").replace(/^\.\//, "");
  const fo = String(folder || "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (fo && /^docs\//.test(r) && !/^[a-z][a-z0-9+.-]*:/i.test(r)) { const [p, h] = r.split("#"); const rel = path.posix.relative(fo, p) || path.posix.basename(p); r = rel + (h != null ? "#" + h : ""); }
  return r;
}
/* A link never points at a file that is not there (plan/RULES.md §1): a ref naming a file (or folder) that is not in the tree from the
   board's folder — a build output such as a qa report under build/, which is never committed — is kept as text naming it, not as a
   link, and the presenter is told. Anything else (a URL, a sha, PR #n, #n, a sentence) is kept as it is. */
const FILE_REF = /^([\w./-]+\.(?:md|html|json|kt|kts|dsl|txt|xml|log)|[\w./-]+\/)(#[\w-]+)?$/;
function openRefText(ref, dir, enrich) {
  const m = FILE_REF.exec(ref); if (!m || !dir || fs.existsSync(path.resolve(dir, m[1]))) return ref;
  if (enrich) enrich.push(`an open point's ref ${ref} is not in the tree from the board's folder (a build output is never committed): written as text, not a link`);
  return "`" + m[1] + "` (not in the tree, so not linked)";
}
/* An open point's ref given as an absolute path (GUIDANCE.md §10: no machine-local path on a board): inside the worktree, made relative to
   its root (a build output, "build/reports/…"); outside it, its file name alone, as text. */
function openRefLocal(ref) {
  const r = String(ref).trim(); if (!/^(?:[a-z]:[\\/]|[\\/])/i.test(r) || !ROOT) return r;
  const rel = path.relative(ROOT, path.resolve(r)); return !rel.startsWith("..") && !path.isAbsolute(rel) ? rel.split(path.sep).join("/") : "`" + path.basename(r) + "` (outside the repository, not linked)";
}
/* The copy of an open point's report, taken when the point is raised (plan/RULES.md §3, wip.open; admin-team/dashboards-skill/35): a ref that
   names a file outside the tree (a build output such as a test report, never committed) stays plain text on the committed board, and the
   file as it stood is copied under the git-ignored docs/plans/.live/open/<the board's folder under docs/plans>/<key>/ of the worktree and of
   the main checkout (an HTML report's index.html with its folder, a small one), so the live view links each point to the report it was
   raised against. The point records the copy's path under .live/open/ (copy); the copies are made once the event is written (OPEN_JOBS),
   a cache of this machine outside the atomic set, never committed; a later event never takes the copy again. */
const OPEN_JOBS = [];
function openCopyFor(raw, text, folder) {
  const m = FILE_REF.exec(String(raw || "").trim().replace(/\\/g, "/").replace(/^\.\//, "")); if (!m || !ROOT) return null;
  const src = [path.resolve(DIR || ROOT, m[1]), path.resolve(ROOT, m[1])].find(f => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } });
  if (!src || !path.relative(path.join(ROOT, "docs", "plans"), src).startsWith("..")) return null;
  const under = String(folder || "").replace(/\\/g, "/").replace(/^docs\/plans\/?/, "").replace(/\/+$/, "");
  const key = require("crypto").createHash("sha1").update(text).digest("hex").slice(0, 8);
  const whole = /^index\.html?$/i.test(path.basename(src)), name = whole ? `${path.basename(path.dirname(src))}/${path.basename(src)}` : path.basename(src);
  const rel = [under, key, name].filter(Boolean).join("/");
  OPEN_JOBS.push({ src, whole, rel });
  return rel;
}
function mergeOpen(w, facts, applied, txt, raised, resolved, folder, dir, enrich) {
  w.open = Array.isArray(w.open) ? w.open : [];
  facts.open.forEach((o, i) => {
    const text = txt(o && typeof o === "object" ? o.text : o, `open[${i}].text`); if (!text) return;
    const res = o && (o.resolved === true ? true : txt(o.resolved, `open[${i}].resolved`));
    let have = w.open.find(x => x && x.text === text);
    const said = txt(o && o.raised, `open[${i}].raised`), by = said && !OPEN_TIME.test(said) ? said : raised;
    if (!have) { const raw = o && typeof o.ref === "string" && o.ref.trim() ? openRefLocal(o.ref) : null, ref = raw ? openRefText(openRef(raw, folder), dir, enrich) : null;
      const copy = raw && ref !== openRef(raw, folder) ? openCopyFor(raw, text, folder) : null;
      have = { text, raised: by, ...(ref ? { ref } : {}), ...(copy ? { copy } : {}) }; w.open.push(have); applied.push(`wip.open + "${text.slice(0, 40)}"${copy ? " (its report copied for the live view)" : ""}`); }
    if (res && have.resolved !== res) { have.resolved = res; applied.push(`wip.open resolved "${text.slice(0, 40)}"`); resolved.push(have); }
  });
}

/* Take the open points' report copies (OPEN_JOBS) into each checkout's git-ignored docs/plans/.live/open/ (the worktree's, and the main
   checkout's, where the view copies of a landing resolve), each once: a copy already there is the report the point was raised against and
   is kept. An HTML report's index.html is copied with its folder when the folder is small (at most 2000 files, 50 MB), else alone. Then
   docs/plans/.live/open/index.js lists the copies on disk ((window.DASHBOARDS_LIVE||{}).open), which a board loads to link them. Returns
   one line per copy taken. */
function runOpenJobs() {
  const md = require("./mdcopy.js"), out = [], roots = [...new Set([ROOT, MAIN].filter(Boolean).map(r => path.resolve(r)))];
  const jobs = OPEN_JOBS.filter((j, i) => OPEN_JOBS.findIndex(k => k.rel === j.rel) === i);
  roots.forEach(root => {
    if (!fs.existsSync(path.join(root, "docs", "plans")) || !md.liveWritable(root)) return;
    const base = path.join(root, "docs", "plans", ".live", "open");
    jobs.forEach(j => {
      const dest = path.join(base, ...j.rel.split("/")); if (fs.existsSync(dest)) return;
      try {
        let whole = j.whole;
        if (whole) { let n = 0, size = 0; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { n++; size += fs.statSync(p).size; } if (n > 2000 || size > 50e6) return; } };
          walk(path.dirname(j.src)); if (n > 2000 || size > 50e6) whole = false; }
        if (whole) fs.cpSync(path.dirname(j.src), path.dirname(dest), { recursive: true });
        else { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(j.src, dest); }
        out.push(path.relative(root, dest).split(path.sep).join("/"));
      } catch (e) { S.enrich.push(`an open point's report could not be copied (${j.rel}): ${e.message}`); }
    });
    const idx = path.join(base, "index.js"); let list = [];
    try { const m = /\.open=(\[[\s\S]*?\]);/.exec(fs.readFileSync(idx, "utf8")); if (m) list = JSON.parse(m[1]); } catch (e) { /* none yet */ }
    list = [...new Set([...list, ...jobs.map(j => j.rel)])].filter(r => typeof r === "string" && fs.existsSync(path.join(base, ...r.split("/")))).sort();
    if (list.length) { fs.mkdirSync(base, { recursive: true });
      const text = `/* docs/plans/.live/open/index.js: the open points' reports, copied when each point was raised (plan/scripts/apply-event.js). Never committed. */\n(window.DASHBOARDS_LIVE=window.DASHBOARDS_LIVE||{}).open=${JSON.stringify(list)};\n`;
      let old = null; try { old = fs.readFileSync(idx, "utf8"); } catch (e) { /* new */ } if (old !== text) fs.writeFileSync(idx, text); }
  });
  return out;
}

/* The merge's time (asBuilt.at) and the branch's step commits (asBuilt.commits) at landed, for the Timeline tile (plan/RULES.md §2, "The
   Timeline tile's legend"; §4, "The fast path owns the Timeline"), each from the first source that tells it: facts.mergedAt; git in the
   worktree, then in the main checkout (lib.js gitTimes(): the merge commit's time, and the step commits of a two-parent merge); the pull
   request's merge time from the tracker (lib.js ghMergeTime(); not with --no-gh), held to the board's merge commit. The step commits come
   from git alone. Where none tells the time, nothing is recorded and the summary warns: the next run's sized records it from git when it
   seeds the board (the merge is then in its branch). The tracker is asked once per run (the duplicate check applies the event twice). */
const GH_MEMO = new Map();
function mergeTimes(plan, facts, req, merge, pr) {
  const folder = typeof plan.folder === "string" ? plan.folder : null, out = {};
  let g = lib.gitTimes(ROOT, folder, merge);
  if (!g.at && MAIN && path.resolve(MAIN) !== path.resolve(ROOT)) g = lib.gitTimes(MAIN, folder, merge);
  if (Array.isArray(g.commits) && g.commits.length) out.commits = g.commits;
  if (lib.isTime(facts.mergedAt)) { out.at = facts.mergedAt; return out; }
  if (g.at) { out.at = g.at; return out; }
  const repo = REPO_SLUG || req.github || plan.repo || null, n = Number.isInteger(facts.pr) && facts.pr > 0 ? facts.pr : Number.isInteger(pr) && pr > 0 ? pr : null;
  if (!flag("no-gh") && repo && n) {
    const key = `${repo}#${n}@${merge || ""}`; if (!GH_MEMO.has(key)) GH_MEMO.set(key, lib.ghMergeTime(repo, n, merge));
    const t = GH_MEMO.get(key);
    if (t.at) { out.at = t.at; out.applied = `asBuilt.at from PR #${n}'s merge time (git here does not hold the merge yet)`; return out; }
    if (t.mismatch) { out.warn = `landed: PR #${n}'s merge commit ${String(t.mismatch).slice(0, 7)} is not the board's merge ${String(merge).slice(0, 7)}: its merge time is not taken; the next run's sized records the merge's time from git when it seeds this board`; return out; }
  }
  out.warn = `landed: the merge's time (asBuilt.at) is not recorded yet: ${merge ? "git here does not hold the merge" : "the board records no merge commit"}${flag("no-gh") ? "" : n ? " and the tracker cannot tell it" : " and the event names no pull request"}; the next run's sized records it from git when it seeds this board (or timeline.js <folder> --from-git, or facts.mergedAt)`;
  return out;
}

/* The standing rule on the parent tracking board (plan/RULES.md §3, "Next is the next one up"): a unit's start (sized), its approving
   qa pass (complete) and its landing (landed). Returns { plan, applied, enrich }. */
function applyParent(orig, sub, op, now) {
  const plan = JSON.parse(JSON.stringify(orig)), w = plan.wip = plan.wip || {}, applied = [], enrich = [];
  const row = (plan.rows || []).find(r => r && r.unit && r.unit.issue === sub.issue);
  if (!row) { enrich.push(`the tracking board #${plan.issue} has no unit row for #${sub.issue}`); return { plan, applied, enrich }; }
  const cur = Array.isArray(w.current) ? w.current.map(String) : [], cell = row.id + ".built", state = ((row.asBuilt || {}).state) || "pending";
  const live = !["built", "abandoned"].includes(plan.status) && !["landed", "cancelled"].includes(w.step);
  if (!live) { enrich.push(`the tracking board #${plan.issue} has landed or was cancelled: left alone`); return { plan, applied, enrich }; }
  if (op.kind === "start") {
    if (state === "pending" && !cur.includes(cell)) { w.current = [...cur.filter(a => /\.built$/.test(a) && (plan.rows || []).some(r => r.unit && r.id === a.split(".")[0])), cell]; applied.push(`#${plan.issue}: ${row.id} in progress`); }
    if (!["halted", "escalated"].includes(w.step) && w.step !== "implementation") { w.step = "implementation"; w.since = now; applied.push(`#${plan.issue}: wip.step implementation`); }
    if (["planned"].includes(plan.status)) { plan.status = "building"; applied.push(`#${plan.issue}: status building`); }
  } else if (op.kind === "complete") {
    if (!["complete", ...lib.UNIT_LANDED].includes(state)) {
      const had = row.asBuilt && typeof row.asBuilt.summary === "string" && row.asBuilt.summary.trim();
      /* a complete unit says what exists (check.js): with no summary yet, the plain fact; one written before is the presenter's to update */
      row.asBuilt = { ...(row.asBuilt || {}), state: "complete", ...(had ? {} : { summary: `#${sub.issue}'s run: the ${lib.REVIEW} approved; it is not merged yet.` }) };
      applied.push(`#${plan.issue}: ${row.id} complete`);
      if (had) enrich.push(`#${plan.issue}: ${row.id}'s summary, now complete, comes from #${sub.issue}'s board`);
    }
  } else if (op.kind === "landed") {
    /* a landed unit says what exists (check.js): with no summary yet, or only the plain fact its qa pass wrote, the plain fact of its
       landing from the sub-issue's asBuilt; a summary written from the documents is the presenter's to update */
    const A = (sub && sub.asBuilt) || {}, m = A.merge || A.sha, s0 = row.asBuilt && typeof row.asBuilt.summary === "string" ? row.asBuilt.summary.trim() : "";
    const had = s0 && ![`#${sub.issue}'s run passed qa; it is not merged yet.`, `#${sub.issue}'s run: the ${lib.REVIEW} approved; it is not merged yet.`].includes(s0);
    if (state !== "landed" || !had) { row.asBuilt = { ...(row.asBuilt || {}), state: "landed", ...(had ? {} : { summary: `#${sub.issue} landed${A.pr ? ` through PR #${A.pr}` : ""}${m ? ` as ${String(m).slice(0, 7)}` : ""}.` }) }; applied.push(`#${plan.issue}: ${row.id} landed${had ? "" : ", with the plain fact of its landing as its summary"}`); }
    /* a unit with no board of its own records its landing on its row (merge, pr): no board of its holds it, and the next sized seeds the tracking board's copy only into a branch that holds that merge (seedFromView()) */
    if (op.boardless && m && (row.asBuilt.merge !== m || (A.pr && row.asBuilt.pr !== A.pr))) { row.asBuilt = { ...row.asBuilt, merge: m, ...(A.pr ? { pr: A.pr } : {}) }; applied.push(`#${plan.issue}: ${row.id}'s merge ${String(m).slice(0, 7)} on its row`); }
    if (cur.includes(cell)) { w.current = cur.filter(a => a !== cell); applied.push(`#${plan.issue}: ${row.id} out of wip.current`); }
    const left = lib.unitLeft(plan, row);
    if (left.length) enrich.push(`#${plan.issue}: the landed unit's ${left.join(", ")} ${left.length === 1 ? "comes" : "come"} from ${op.boardless ? `its merge${A.pr ? ` (PR #${A.pr})` : ""}: the unit has no board or documents of its own` : "the sub-issue's board and documents"}`);
  }
  const nx = lib.nextUnit(plan), id = nx ? nx.id : null;
  if (w.next !== id) { w.next = id; applied.push(`#${plan.issue}: wip.next ${id}`); }
  /* the tracking issue's last unit (plan/RULES.md §3, "The units' own runs"; §2, Consequences): implementation spans its units' runs until the last
     unit lands, then landed. The board lands at that unit's merge, as an issue board lands at its own (the landed event): status built, asBuilt the
     last unit's merge (sha, merge, PR, date, the merge's time at), wip.step landed, nothing glowing; only once every part is resolved and the
     initiative's impact is reconciled whole (basis as-built), which is the presenter's from the tracking folder's documents. Until then it stays at
     implementation, every unit landed, and the summary names what is left; unit-landed raised again for that unit lands it then. */
  const landing = op.kind === "landed" ? lastUnitLanding(plan, sub, now) : null;
  if (landing && landing.enrich) enrich.push(landing.enrich);
  const freezeAt = landing && landing.at ? landing.at : now;
  if (landing && landing.land) {
    const A = (sub && sub.asBuilt) || {}, m = A.merge || A.sha, pr = Number.isInteger(A.pr) ? A.pr : null;
    plan.asBuilt = { ...(plan.asBuilt && typeof plan.asBuilt === "object" ? plan.asBuilt : {}), sha: m, merge: m, ...(pr ? { pr } : {}), date: (landing.mergedAt || now).slice(0, 10), ...(landing.mergedAt ? { at: landing.mergedAt } : {}) };
    plan.status = "built"; w.step = "landed"; w.since = freezeAt; w.current = []; w.resume = null; w.waitingOn = null;
    w.event = { name: "landed", at: now, note: `#${sub.issue}, its last unit, landed${pr ? " in PR #" + pr : ""}` };
    applied.push(`#${plan.issue}: every unit landed: status built, asBuilt at #${sub.issue}'s merge ${String(m).slice(0, 7)}${landing.mergedAt ? "" : " (its time not recorded)"}, wip.step landed`);
    if (!landing.mergedAt) WARNINGS.push(`landed: #${plan.issue}'s merge time (asBuilt.at) is not recorded: neither the facts (mergedAt) nor git here tell #${sub.issue}'s merge ${String(m).slice(0, 7)}; the next run's sized records it from git when it seeds this board`);
  }
  const d = landing && landing.land ? `Landed: ${landing.total} of ${plural(landing.total, "unit")}, the last #${sub.issue}${Number.isInteger(((sub || {}).asBuilt || {}).pr) ? " in PR #" + sub.asBuilt.pr : ""}.` : chainDetail(plan);
  if (w.detail !== d) { w.detail = d; applied.push(`#${plan.issue}: wip.detail`); }
  /* the tracking board's own step the unit's start ended (its plan's landing), frozen as any board's (plan/RULES.md §3, "Finished steps"); at its last
     unit's landing, its implementation visit, ended at that unit's merge where its time is known */
  lib.freezeSteps(orig, plan, op.kind === "start" ? "sized" : op.kind === "landed" ? "landed" : "qa-pass", freezeAt, null).forEach(x => applied.push(`#${plan.issue}: ${x}`));
  if (applied.length) {
    w.updated = now;
    const words = { start: "started", complete: "complete: the review approved", landed: "landed" }[op.kind];
    const t = { date: now.slice(0, 10), column: "built", label: `#${sub.issue} ${words}` };
    plan.trail = Array.isArray(plan.trail) ? plan.trail : [];
    if (!plan.trail.some(x => x && x.date === t.date && x.column === t.column && x.label === t.label)) plan.trail.push(t);
    if (landing && landing.land) {
      const A = sub.asBuilt || {}, m = A.merge || A.sha, pr = Number.isInteger(A.pr) ? A.pr : null;
      const t2 = { date: now.slice(0, 10), column: "built", label: `Landed: every unit, the last #${sub.issue}${pr ? " in PR #" + pr : ""}, merge ${String(m).slice(0, 7)}`, ...(pr ? { ref: `PR #${pr}` } : {}) };
      if (!plan.trail.some(x => x && x.label === t2.label)) plan.trail.push(t2);
    }
  }
  return { plan, applied, enrich };
}
/* Whether a unit's landing is its tracking issue's last (plan/RULES.md §3), and whether the tracking board lands with it: { land, total, at, mergedAt }
   when every counted unit has landed, no part is open and the initiative's impact is reconciled (or the board records none); { enrich } naming what is
   left when every unit has landed but the board cannot land yet; null when a unit is still to land. The merge's time: the landing's asBuilt.at
   (facts.mergedAt on a board-less unit), else git in the tree, then the main checkout. */
function lastUnitLanding(plan, sub, now) {
  const st = r => ((r.asBuilt || {}).state) || "pending", units = (plan.rows || []).filter(r => r && r.unit);
  const counted = units.filter(r => !["dropped", "deferred"].includes(st(r)) && !lib.leftForLater(r));
  if (!counted.length || !counted.every(r => lib.UNIT_LANDED.includes(st(r)))) return null;
  if (plan.status === "built") return null;
  const A = (sub && sub.asBuilt) || {}, m = [A.merge, A.sha].find(s => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s)), who = `#${plan.issue}: every unit has landed`;
  if (!m) return { enrich: `${who}, but #${sub.issue}'s merge is not recorded: the tracking board lands at its last unit's merge (raise the event with facts.merge)` };
  const open = (plan.rows || []).filter(r => r && ["pending", ...lib.BUILDING_STATES].includes(lib.recordedState(r)));
  if (open.length) return { enrich: `${who}, but ${open.map(r => r.id).join(", ")} ${open.length === 1 ? "is" : "are"} still open: the tracking board lands once every part is resolved` };
  const rec = lib.reconciliation(plan);
  if (rec && rec.state !== "as-built") return { enrich: `${who}: the initiative's impact is reconciled whole from the tracking folder's consequences.md (impact.md in an older folder) and final-implementation.md where it has one, basis "as-built" (plan/RULES.md §2, Consequences); then unit-landed raised again for #${sub.issue} (--view) lands the tracking board at that merge` };
  let mergedAt = lib.isTime(A.at) ? A.at : null;
  if (!mergedAt) { const g = lib.gitTimes(ROOT, null, m); mergedAt = g.at || (MAIN && path.resolve(MAIN) !== path.resolve(ROOT || "") ? lib.gitTimes(MAIN, null, m).at : null) || null; }
  const since = Date.parse(((plan.wip || {}).since) || 0) || 0, t = mergedAt ? Date.parse(mergedAt) : NaN;
  return { land: true, total: counted.length, mergedAt, at: mergedAt && t >= since && t <= Date.parse(now) ? mergedAt : null };
}
/* The chain in one line (plan/RULES.md §3, "The units' own runs": wip.detail speaks for the chain). */
function chainDetail(plan) {
  const w = plan.wip || {}, units = (plan.rows || []).filter(r => r && r.unit), st = r => ((r.asBuilt || {}).state) || "pending";
  const counted = units.filter(r => !["dropped", "deferred"].includes(st(r)) && !lib.leftForLater(r)), landed = counted.filter(r => lib.UNIT_LANDED.includes(st(r)));
  const cur = units.filter(r => lib.unitInRun(w.current, r.id)), n = r => r.unit.issue ? "#" + r.unit.issue : r.name;
  const done = cur.filter(r => st(r) === "complete"), going = cur.filter(r => st(r) !== "complete"), nx = units.find(r => r.id === w.next);
  return [`${landed.length} of ${plural(counted.length, "unit")} landed`, going.length ? `${going.map(n).join(", ")} in progress` : null,
    done.length ? `${done.map(n).join(", ")} complete, awaiting ${done.length > 1 ? "their landings" : "its landing"}` : null, nx ? `${n(nx)} up next` : null].filter(Boolean).join("; ") + ".";
}

/* The board a board is embedded into: the board itself, or the current template when the board is not the verified template plus its
   data (plan/RULES.md §4: every event re-renders the board onto the current template). A board that declares a divergence, or a
   template not verified since it changed, is left as it is, and the presenter is told. */
const emptyBlock = (html, id) => dev.norm(html).replace(/<base [^>]*data-live-view[^>]*>\n/, "").replace(new RegExp(`(<script type="application/json" id="${id}">)[\\s\\S]*?(</script>)`), "$1\n{}\n$2");
function pageBase(pagePath, enrich, rel, tplOf, keep) {
  const html = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, "utf8") : null, tplPath = dev.templateFor(tplOf || pagePath, "plan-board"), tpl = fs.readFileSync(tplPath, "utf8");
  /* a retime on a board that has landed or was cancelled corrects its record and nothing else: the board is kept as it closed, never re-rendered onto a later template */
  if (html != null && keep) return { html, rerendered: false };
  if (html != null && emptyBlock(html, "plan") === emptyBlock(tpl, "plan")) return { html, rerendered: false };
  if (html != null && /<meta name="template-divergence"/.test(html)) { enrich.push(`${rel} declares a divergence from the template: not re-rendered`); return { html, rerendered: false }; }
  if (!dev.verified(tplPath).ok) { enrich.push(`the template ${path.relative(dev.SKILL, tplPath).split(path.sep).join("/")} changed since it was verified: ${rel} not re-rendered (run verify/verify-templates.js)`); if (html == null) refuse(`${rel} has no board and the template is not verified`); return { html, rerendered: false }; }
  return { html: tpl, rerendered: true };
}
/* Embed a board in memory and write its three files (plan/scripts/embed.js does the same on disk): the issue links, on a tracking
   board the units' mirrors, and the statements' excerpts not copied yet, resolved from the folders on disk (lib.js resolveBoard()),
   plan.json in its own line endings, the board's data block and the plan.js sidecar. */
function writeBoard(dir, data, eol, enrich, label) {
  /* with --view, the board's view copy in the main checkout (lib.js viewDirOf()), its links resolved from the tracked folder `dir` */
  const to = VIEWING ? lib.viewDirOf(dir, MAIN) : dir;
  if (VIEWING) { const made = []; for (let d = to; !fs.existsSync(d); d = path.dirname(d)) made.unshift(d); made.forEach(d => { fs.mkdirSync(d); madeDirs.push(d); }); }
  const rel = path.relative(VIEWING ? MAIN : ROOT, path.join(to, "dashboard.html")).split(path.sep).join("/");
  lib.setViewLinks(VIEWING, MAIN); try { lib.resolveBoard(data, dir); } finally { lib.setViewLinks(false); }
  const json = (JSON.stringify(data, null, 2) + "\n").replace(/\n/g, eol);
  const closed = ["built", "abandoned"].includes(data.status) || ["landed", "cancelled"].includes((data.wip || {}).step);
  const base = pageBase(fs.existsSync(path.join(to, "dashboard.html")) ? path.join(to, "dashboard.html") : path.join(dir, "dashboard.html"), enrich, rel, path.join(dir, "dashboard.html"), EV === "retime" && closed);
  if (base.rerendered && fs.existsSync(path.join(to, "dashboard.html"))) S.rerendered.push(rel);
  let html = lib.writeBlock(base.html, "plan", json); const js = lib.sidecarText("plan", json);
  if (VIEWING) html = lib.withViewBase(html, to, dir);
  const files = [["plan.json", json], ["dashboard.html", html], ["plan.js", js]], wrote = [];
  files.forEach(([f, t]) => { if (put(path.join(to, f), t)) wrote.push(f); });
  if (VIEWING && !S.view.includes(rel)) S.view.push(rel);
  if (wrote.length) S.wrote.push(`${label}: ${wrote.join(", ")}`);
  return wrote.length > 0;
}
/* Seeding at sized (plan/RULES.md §4, "Seeding at sized"; admin-team/dashboards-skill/35). The post-merge refresh shows a landing in view
   copies under the main checkout's git-ignored docs/plans/.live/view/ (the issue board landed at its merge, its parent tracking board's
   unit landed and the next one up). When a run is sized in a worktree branched after that landing, the boards it shows start from those
   copies, so the new branch carries the landed state from its first commit: every view copy fresher than the worktree's tracked board
   (lib.js planStamp()) whose merge (asBuilt.merge, else sha, on a tracking board wip.landing.merge) is in the worktree's history (git merge-base --is-ancestor), and a copy with no
   merge of its own (a tracking board) filing its units or with a seeded copy inside its folder, is written over the tracked board (plan.json, dashboard.html,
   plan.js; its links resolved from the tracked folder, never into .live/). A landed sub-issue seeded without its tracking board's copy
   marks its unit landed on the tracked tracking board by the standing rule (applyParent()): a merge that marks an issue landed on its own
   board does so for its parent too, and both are seeded together. It reads nothing of the issue's own board, so a sized on a folder with no
   board seeds too, before it lays the foundation (main()); and a run in the main checkout itself seeds its tracked boards like a worktree's: --view never
   comes here, so a sized there is a run's. Nothing is seeded from a copy whose merge the branch does not hold, nor from a copy whose land is still under way (no merge on
   record), or a tracking board's copy with such a copy inside it. A copy merged with parts still to resolve (lib.js landedPending(), the post-merge refresh under way) is
   seeded as it stands, so the run is never delayed: the summary warns and names it, board.js --live keeps the copy for the enrichment, and the team's reseed at the end of
   the refresh brings the finished state (reseed(), below). Returns the tracked folders written. */
function seedFromView(now) {
  if (!MAIN) return [];
  const vroot = path.join(MAIN, ...lib.VIEW); if (!fs.existsSync(vroot)) return [];
  const read = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; } };
  const dirs = []; const walk = d => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } if (fs.existsSync(path.join(d, "plan.json"))) dirs.push(d); es.filter(e => e.isDirectory()).forEach(e => walk(path.join(d, e.name))); };
  walk(vroot);
  const inHead = sha => cp.spawnSync("git", ["-C", ROOT, "merge-base", "--is-ancestor", sha, "HEAD"], { encoding: "utf8", windowsHide: true }).status === 0;
  const copies = dirs.map(vd => { const rel = path.relative(vroot, vd).split(path.sep).join("/"), tracked = path.join(ROOT, "docs", "plans", ...rel.split("/"));
    return { vd, rel, tracked, vp: read(path.join(vd, "plan.json")), tp: read(path.join(tracked, "plan.json")) }; });
  const cand = copies
    .filter(x => x.rel && x.vp && x.tp && x.vp.issue === x.tp.issue && (!DIR || path.resolve(x.tracked) !== path.resolve(DIR)) && String(lib.planStamp(x.vp)) > String(lib.planStamp(x.tp)));
  /* a copy not yet landed, and a tracking board's copy with one inside it, wait: the copy stays for the enrichment, and a later raise seeds it */
  const held = copies.filter(x => x.rel && lib.notYetLanded(x.vp) && !lib.landedPending(x.vp) && (!x.tp || String(lib.planStamp(x.vp)) > String(lib.planStamp(x.tp))));
  const waiting = cand.filter(x => held.some(y => y.rel === x.rel || y.rel.startsWith(x.rel + "/")));
  waiting.forEach(x => { const me = held.find(y => y.rel === x.rel), w0 = (x.vp.wip || {}), why = me ? `its land is under way (status ${x.vp.status}, step ${lib.shownStep(w0) || "none"})` : `a unit inside it has its land under way (${held.filter(y => y.rel.startsWith(x.rel + "/")).map(y => y.rel).join(", ")})`;
    S.applied.push(`not seeded: ${x.rel} (${why})`); WARNINGS.push(`VIEW COPY NOT YET LANDED: ${x.rel} is left: ${why}; the next sized seeds it`); });
  cand.splice(0, cand.length, ...cand.filter(x => !waiting.includes(x)));
  /* a tracking board in its units' filing records its plan's merge on wip.landing; a landed board on asBuilt */
  const mergeOf = p => { const A = (p && p.asBuilt) || {}, L = (p && p.wip && p.wip.landing) || {}, m = [A.merge, A.sha, L.merge].find(s => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s)); return m || null; };
  /* a tracking copy that records no merge and is filing its units (or filed them): the plan's merge is what this tree's tracked board came from, so its filed units go on too */
  const filing = p => !!p && p.kind === "tracking" && lib.shownStep(p.wip || {}) === "sub-issues";
  /* a tracking copy holding a board-less unit's landing (unit-landed) that the tracked board lacks: that unit's merge, recorded on its row, is held to this branch's history too */
  const boardless = x => x.vp.kind !== "tracking" ? [] : (x.vp.rows || []).filter(r => r && r.unit && lib.UNIT_LANDED.includes((r.asBuilt || {}).state) && /^[0-9a-f]{7,40}$/.test(String((r.asBuilt || {}).merge || "")))
    .filter(r => { const t = ((x.tp.rows || []).find(y => y && y.id === r.id) || {}).asBuilt || {}; return !lib.UNIT_LANDED.includes(t.state); }).map(r => r.asBuilt.merge);
  const blOk = x => boardless(x).every(inHead);
  const ok = cand.filter(x => blOk(x) && (mergeOf(x.vp) ? inHead(mergeOf(x.vp)) : boardless(x).length > 0));
  cand.filter(x => !ok.includes(x) && blOk(x) && !mergeOf(x.vp) && (filing(x.vp) || ok.some(y => y.rel.startsWith(x.rel + "/")))).forEach(x => ok.push(x));
  cand.filter(x => !ok.includes(x)).forEach(x => S.applied.push(`not seeded: ${x.rel} (${!blOk(x) ? "a board-less unit's merge on it is not in this branch's history" : mergeOf(x.vp) ? "its merge is not in this branch's history" : "no landing inside it seeded"})`));
  ok.filter(x => lib.landedPending(x.vp)).forEach(x => WARNINGS.push(`VIEW COPY NOT YET LANDED: ${x.rel} seeded as it stands (status ${x.vp.status}, step ${lib.shownStep(x.vp.wip || {}) || "none"}, parts still to resolve): the copy is kept for the post-merge refresh; raise reseed when the refresh ends`));
  const out = [];
  ok.sort((a, b) => a.rel.split("/").length - b.rel.split("/").length).forEach(x => {
    const text = fs.readFileSync(path.join(x.tracked, "plan.json"), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n";
    /* the Timeline's merge time and step commits, where the landing could not record them (plan/RULES.md §4, "The fast path owns the
       Timeline"): the merge is in this branch's history now, so git tells them; a time already recorded is kept */
    const A = x.vp.asBuilt, m = mergeOf(x.vp);
    if (A && m && (!lib.isTime(A.at) || !Array.isArray(A.commits))) {
      const g = lib.gitTimes(ROOT, typeof x.vp.folder === "string" ? x.vp.folder : `docs/plans/${x.rel}`, m), got = [];
      if (!lib.isTime(A.at) && g.at) { A.at = g.at; got.push("asBuilt.at"); }
      if (!Array.isArray(A.commits) && Array.isArray(g.commits) && g.commits.length) { A.commits = g.commits; got.push("asBuilt.commits"); }
      if (got.length) S.applied.push(`seeded ${x.rel}: ${got.join(" and ")} from git`);
    }
    writeBoard(x.tracked, x.vp, eol, S.enrich, `seeded ${x.rel}`); out.push(x.tracked); S.seeded.push(`docs/plans/${x.rel}`);
  });
  /* the parent of a landed sub-issue seeded alone: its unit landed by the standing rule */
  ok.filter(x => (x.vp.status === "built" || lib.landedPending(x.vp)) && x.vp.parent && Number.isInteger(x.vp.parent.issue)).forEach(x => {
    const up = path.dirname(x.tracked); if (out.includes(up) || !fs.existsSync(path.join(up, "plan.json"))) return;
    const text = fs.readFileSync(path.join(up, "plan.json"), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n"; let pp; try { pp = JSON.parse(text); } catch (e) { return; }
    if (pp.issue !== x.vp.parent.issue || pp.kind !== "tracking") return;
    const P = applyParent(pp, x.vp, { kind: "landed" }, now); S.applied.push(...P.applied.map(a => `seeded: ${a}`)); S.enrich.push(...P.enrich);
    if (P.applied.length) { writeBoard(up, P.plan, eol, S.enrich, `seeded ${path.relative(path.join(ROOT, "docs", "plans"), up).split(path.sep).join("/")}`); out.push(up); S.seeded.push(path.relative(ROOT, up).split(path.sep).join("/") + " (its unit landed)"); }
  });
  if (out.length) S.applied.push(`seeded ${out.length} board${out.length === 1 ? "" : "s"} from the live view (the previous landing's state)`);
  return out;
}
/* The event reseed (plan/RULES.md §4, "Seeding at sized"), team-raised at the end of every post-merge refresh; it names no board and no time is needed. A sized that met the refresh seeded
   a copy as it stood; this brings the finished state to the boards seeded then, in the main checkout and every worktree. It acts only on a landing such a sized seeded: a tracked board
   holding that landing unfinished (lib.js landedPending()) whose copy has now landed takes the copy whole, as nothing but the landing writes it; a tracked board already built keeps its
   board. Its tracking board, whose wip the new run's events write, takes only what the landing owns: the unit's row as built (the unit landed, by the standing rule, and the copy's summary),
   its impact.units entry, its impact.changes entries and the copy's trail entries it lacks. A tracked board at its committed state (no sized seeded anything) is left alone, so a landing
   nothing raced does nothing. A copy still unfinished is warned on and left. board.js --live --settled then removes the copies no fresher, which the refresh no longer needs. */
/* What a unit's landing owns on its tracking board, taken from the board's finished view copy (cp0, its row crow) onto a tracked board (merged, its row
   row): the row as built, its impact.units entry, its impact.changes entries and the copy's trail entries the board lacks. Returns whether it changed. */
function takeOwned(merged, cp0, row, crow) {
  let changed = false;
  const nextB = { ...(row.asBuilt || {}), ...(crow.asBuilt || {}) }; if (JSON.stringify(nextB) !== JSON.stringify(row.asBuilt || {})) { row.asBuilt = nextB; changed = true; }
  const I = merged.impact, CI = cp0.impact;
  if (I && typeof I === "object" && CI && typeof CI === "object") {
    const cu = (Array.isArray(CI.units) ? CI.units : []).find(e => e && e.unit === row.id), us = Array.isArray(I.units) ? I.units : [];
    if (cu && JSON.stringify(us.find(e => e && e.unit === row.id) || null) !== JSON.stringify(cu)) { I.units = [...us.filter(e => !(e && e.unit === row.id)), cu]; changed = true; }
    const cs = (Array.isArray(CI.changes) ? CI.changes : []).filter(c => c && c.unit === row.id), hs = Array.isArray(I.changes) ? I.changes : [];
    cs.forEach(c => { if (!hs.some(h => JSON.stringify(h) === JSON.stringify(c))) { const { changeKey } = require("./fill.js"), at = hs.findIndex(h => h && changeKey(h) === changeKey(c)); if (at >= 0) hs[at] = c; else hs.push(c); I.changes = hs; changed = true; } });
  }
  (Array.isArray(cp0.trail) ? cp0.trail : []).forEach(t => { merged.trail = Array.isArray(merged.trail) ? merged.trail : []; if (t && !merged.trail.some(h => h && h.date === t.date && h.column === t.column && h.label === t.label)) { merged.trail.push(t); changed = true; } });
  return changed;
}
async function reseed(now, req) {
  const read = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; } };
  const vroot = path.join(MAIN, ...lib.VIEW), dirs = []; const walk = d => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } if (fs.existsSync(path.join(d, "plan.json"))) dirs.push(d); es.filter(e => e.isDirectory()).forEach(e => walk(path.join(d, e.name))); };
  walk(vroot);
  const copies = dirs.map(vd => ({ vd, rel: path.relative(vroot, vd).split(path.sep).join("/"), vp: read(path.join(vd, "plan.json")) })).filter(x => x.rel && x.vp && (!req.github || !x.vp.repo || x.vp.repo === req.github));
  const landedIssues = copies.filter(x => x.vp.kind !== "tracking");
  landedIssues.filter(x => lib.landedPending(x.vp)).forEach(x => WARNINGS.push(`VIEW COPY NOT YET LANDED: ${x.rel} still has parts to resolve: raise landed with --view once they are, then reseed again`));
  const gw = cp.spawnSync("git", ["-C", MAIN, "worktree", "list", "--porcelain"], { encoding: "utf8", windowsHide: true });
  const trees = [...new Set([path.resolve(MAIN), ...(gw.status === 0 ? gw.stdout.split(/\r?\n/).filter(l => l.startsWith("worktree ")).map(l => path.resolve(l.slice(9))) : [])])].filter(t => fs.existsSync(path.join(t, "docs", "plans")));
  const written = new Map();
  for (const tree of trees) {
    ROOT = tree;
    for (const x of landedIssues.filter(y => y.vp.status === "built")) {
      const tracked = path.join(tree, "docs", "plans", ...x.rel.split("/"));
      let tp = read(path.join(tracked, "plan.json")); if (!tp || tp.issue !== x.vp.issue || !(lib.landedPending(tp) || tp.status === "built")) continue;
      lib.lockTree(tree, "apply-event.js reseed"); tp = read(path.join(tracked, "plan.json"));
      const note = d => { if (!written.has(tree)) written.set(tree, []); written.get(tree).push(d); S.seeded.push(path.relative(tree, d).split(path.sep).join("/")); };
      if (lib.landedPending(tp)) {
        const vp = JSON.parse(JSON.stringify(x.vp)), A = vp.asBuilt || {}, m = A.merge || A.sha;
        if (m && (!lib.isTime(A.at) || !Array.isArray(A.commits))) { const g = lib.gitTimes(tree, vp.folder || `docs/plans/${x.rel}`, m); if (!lib.isTime(A.at) && g.at) A.at = g.at; if (!Array.isArray(A.commits) && Array.isArray(g.commits) && g.commits.length) A.commits = g.commits; }
        const text = fs.readFileSync(path.join(tracked, "plan.json"), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n";
        writeBoard(tracked, vp, eol, S.enrich, `re-seeded ${x.rel}`); note(tracked); S.applied.push(`re-seeded ${x.rel}: landed at ${String(m || "").slice(0, 7)}`);
      }
      /* its tracking board: only what the landing owns */
      const up = path.dirname(tracked), ptext = (() => { try { return fs.readFileSync(path.join(up, "plan.json"), "utf8"); } catch (e) { return null; } })(); if (!ptext || !x.vp.parent) continue;
      let pp; try { pp = JSON.parse(ptext); } catch (e) { continue; } if (pp.kind !== "tracking" || pp.issue !== x.vp.parent.issue) continue;
      const before = JSON.stringify(pp), P = applyParent(pp, x.vp, { kind: "landed" }, now), merged = P.plan, row = (merged.rows || []).find(r => r && r.unit && r.unit.issue === x.vp.issue);
      const cpy = copies.find(y => y.rel === path.dirname(x.rel).split(path.sep).join("/")), cp0 = cpy && cpy.vp, crow = cp0 && row && (cp0.rows || []).find(r => r && r.id === row.id);
      const changed = crow && row ? takeOwned(merged, cp0, row, crow) : false;
      if (changed) { merged.wip = merged.wip || {}; merged.wip.updated = now; }
      if (changed || JSON.stringify(merged) !== before) {
        const eol = /\r\n/.test(ptext) ? "\r\n" : "\n"; writeBoard(up, merged, eol, S.enrich, `re-seeded ${path.relative(path.join(tree, "docs", "plans"), up).split(path.sep).join("/")}`); note(up);
        S.applied.push(`re-seeded #${merged.issue}: #${x.vp.issue}'s row, its impact entries and its trail; its wip left to the run's events`);
      }
    }
    /* a tracking board's copy that a board-less unit's landing wrote (unit-landed): no issue board's copy stands for that landing, so the copy itself is
       read. A tracked tracking board a sized seeded with that unit landed and its record unfinished (lib.js unitLeft()) takes what the landing owns
       (takeOwned()); one a sized seeded with every unit landed but not built, while the copy has landed, takes the copy whole: no unit of it runs any more */
    for (const x of copies.filter(y => y.vp.kind === "tracking")) {
      const tracked = path.join(tree, "docs", "plans", ...x.rel.split("/")); let tp = read(path.join(tracked, "plan.json")); if (!tp || tp.issue !== x.vp.issue || tp.kind !== "tracking") continue;
      const st = r => ((r.asBuilt || {}).state) || "pending", counted = p => (p.rows || []).filter(r => r && r.unit && !["dropped", "deferred"].includes(st(r)) && !lib.leftForLater(r));
      const whole = x.vp.status === "built" && tp.status !== "built" && counted(tp).length > 0 && counted(tp).every(r => lib.UNIT_LANDED.includes(st(r)));
      const boardless = (x.vp.rows || []).filter(r => r && r.unit && lib.UNIT_LANDED.includes(st(r)) && !landedIssues.some(y => y.vp.issue === r.unit.issue) && !r.unit.board)
        .map(r => ({ crow: r, row: (tp.rows || []).find(t => t && t.id === r.id) })).filter(p => p.row && lib.UNIT_LANDED.includes(st(p.row)) && lib.unitLeft(tp, p.row).length > 0);
      if (!whole && !boardless.length) continue;
      lib.lockTree(tree, "apply-event.js reseed"); tp = read(path.join(tracked, "plan.json")); if (!tp) continue;
      const ptext = fs.readFileSync(path.join(tracked, "plan.json"), "utf8"), eol = /\r\n/.test(ptext) ? "\r\n" : "\n";
      const note = d => { if (!written.has(tree)) written.set(tree, []); written.get(tree).push(d); S.seeded.push(path.relative(tree, d).split(path.sep).join("/")); };
      if (whole) { writeBoard(tracked, JSON.parse(JSON.stringify(x.vp)), eol, S.enrich, `re-seeded ${x.rel}`); note(tracked); S.applied.push(`re-seeded ${x.rel}: landed with its last unit`); continue; }
      let changed = false; boardless.forEach(p => { const row = (tp.rows || []).find(t => t && t.id === p.crow.id); if (row && takeOwned(tp, x.vp, row, p.crow)) changed = true; });
      if (changed) { tp.wip = tp.wip || {}; tp.wip.updated = now; writeBoard(tracked, tp, eol, S.enrich, `re-seeded ${x.rel}`); note(tracked);
        S.applied.push(`re-seeded #${tp.issue}: ${boardless.map(p => "#" + p.crow.unit.issue).join(", ")}'s row, impact entries and trail; its wip left to the run's events`); }
    }
  }
  /* the checks, the committed repository work board of each tree written, and the live one; nothing written, nothing regenerated, unless a copy is left to clear */
  const stale = copies.some(x => { const t = read(path.join(MAIN, "docs", "plans", ...x.rel.split("/"), "plan.json")); return t && !(String(lib.planStamp(x.vp)) > String(lib.planStamp(t))); });
  for (const [tree, ds] of written) {
    ROOT = tree;
    const cks = await Promise.all([...new Set(ds)].map(d => run(path.join(__dirname, "check.js"), [d], tree)));
    if (cks.some(c => c.status !== 0)) { S.check = `FAIL: ${cks.flatMap(c => c.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l))).slice(0, 6).join(" | ")}`; throw new Error("check.js failed on a board it would re-seed"); }
    ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(tree, "docs", "plans", f)));
    const wb = await run(path.join(__dirname, "board.js"), ["--refresh-template", "--root", tree, ...(flag("no-gh") ? ["--no-gh"] : [])], tree);
    if (wb.status !== 0) throw new Error(`board.js (the committed repository work board, after re-seeding) failed: ${(wb.stderr || wb.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
  }
  if ((written.size || stale) && !flag("no-live")) {
    const lv = await run(path.join(__dirname, "board.js"), ["--live", "--settled", "--refresh-template", "--root", MAIN, ...(flag("no-gh") ? ["--no-gh"] : [])], MAIN);
    if (lv.status !== 0) throw new Error(`board.js --live failed: ${(lv.stderr || lv.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
    S.live = "regenerated docs/plans/.live/";
  } else S.live = "untouched";
  S.check = written.size ? "pass" : "nothing to check";
  S.result = written.size ? "ok" : "nothing";
  if (!written.size) S.applied.push("no board holds a landing a sized seeded unfinished: nothing to re-seed");
}
/* The event seed (plan/RULES.md §4, "Seeding at sized"; admin-team/dashboards-skill/level-1-seed), team-raised at a level-1 run's state-boards request, never with --view,
   naming no board: a level-1 run has no board and sends no sized, so its branch carries the repository's pending corrections through this event alone. It is the
   seeding half of sized and nothing else: seedFromView() into --worktree from --main's view copies (the previous landing's issue board landed at its merge, its
   tracking board's filed units, its unit landed and the next one up), then, where the facts name one, the run's own unit on its tracking board marked complete,
   the state a unit gets at its approving review, its cell in wip.current as a unit's run holds it until it lands (facts { tracking: "docs/plans/<…>/<n>-<slug>",
   unit: <issue>, state: "complete" }; its merge cannot be known yet, so the post-merge view marks it landed). Then every board written is checked and the worktree's
   committed repository work board regenerated (board.js --refresh-template), with the live one. It lays no board, so it is named for what it does: seed, as reseed is
   the refresh's follow-up to a seed. Raised again it finds nothing fresher and the unit already complete: result nothing, nothing written. */
async function seed(now, req, facts) {
  const has = k => Object.prototype.hasOwnProperty.call(facts, k) && facts[k] != null;
  let mark = null;
  if (has("tracking") || has("unit") || has("state")) {
    const tf = typeof facts.tracking === "string" ? facts.tracking.replace(/\\/g, "/").replace(/\/+$/, "") : null, tfolder = tf && !/^docs\/plans\//.test(tf) ? `docs/plans/${tf}` : tf;
    if (!tfolder || !/^docs\/plans\/(.+\/)?\d+-[a-z0-9][a-z0-9-]*$/.test(tfolder) || tfolder.split("/").includes("..")) refuse(`seed: facts.tracking ${JSON.stringify(facts.tracking || null)} is not docs/plans/[<parent>/]<issue>-<slug>, the tracking board's folder`);
    if (!Number.isInteger(facts.unit) || facts.unit < 1) refuse(`seed: facts.unit ${JSON.stringify(facts.unit === undefined ? null : facts.unit)} is not the unit's issue number`);
    const state = facts.state == null ? "complete" : facts.state;
    if (state !== "complete") refuse(`seed: facts.state ${JSON.stringify(state)}: a seed marks its unit complete, the state of its approving review; the post-merge view marks it landed (unit-landed, raised with --view after the merge)`);
    mark = { folder: tfolder, dir: path.join(ROOT, ...tfolder.split("/")), unit: facts.unit };
    if (!fs.existsSync(path.join(mark.dir, "plan.json"))) refuse(`seed: ${tfolder} holds no plan.json: there is no tracking board to mark #${facts.unit} on`);
  }
  try { lib.lockTree(ROOT, "apply-event.js seed"); } catch (e) { refuse(e.message); }
  const seeded = seedFromView(now), written = [...seeded];
  if (mark) {
    const text = fs.readFileSync(path.join(mark.dir, "plan.json"), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n"; let pp;
    try { pp = JSON.parse(text); } catch (e) { refuse(`${mark.folder}/plan.json does not parse: ${e.message}`); }
    if (pp.kind !== "tracking") refuse(`seed: ${mark.folder} is #${pp.issue}'s issue board, not a tracking board`);
    if (req.github && pp.repo && req.github !== pp.repo) refuse(`seed: the tracking board is ${pp.repo}'s, not ${req.github}'s`);
    const row = (pp.rows || []).find(r => r && r.unit && r.unit.issue === mark.unit);
    if (!row) refuse(`seed: the tracking board #${pp.issue} has no unit row for #${mark.unit}`);
    const st = (row.asBuilt || {}).state || "pending", w = pp.wip = pp.wip || {}, cur = Array.isArray(w.current) ? w.current.map(String) : [], cell = row.id + ".built";
    if (["built", "abandoned"].includes(pp.status) || ["landed", "cancelled"].includes(w.step)) refuse(`seed: the tracking board #${pp.issue} has landed or was cancelled: #${mark.unit} is not marked on it`);
    if (["dropped", "deferred"].includes(st) || lib.leftForLater(row)) refuse(`seed: #${mark.unit}'s unit ${row.id} is ${["dropped", "deferred"].includes(st) ? st : "left for later"} on #${pp.issue}'s board: a unit outside the plan is not marked complete`);
    if (lib.UNIT_LANDED.includes(st)) S.applied.push(`#${pp.issue}: ${row.id} has landed already: left`);
    else {
      /* the unit's run, as a sized would have started it: its cell in wip.current, where the approving review leaves it until it lands */
      const entered = st === "pending" && !cur.includes(cell);
      if (entered) w.current = [...cur, cell];
      const P = applyParent(pp, { issue: mark.unit }, { kind: "complete" }, now);
      if (entered) { P.applied.unshift(`#${pp.issue}: ${row.id} in wip.current, its run in progress`); P.plan.wip.updated = now; }
      S.applied.push(...P.applied); S.enrich.push(...P.enrich);
      if (P.applied.length && writeBoard(mark.dir, P.plan, eol, S.enrich, `#${mark.unit}'s unit on #${pp.issue}`) && !written.includes(mark.dir)) written.push(mark.dir);
    }
  }
  if (!written.length) {
    S.result = "nothing"; S.live = "untouched"; S.check = "nothing to check";
    S.applied.push(`nothing to seed: no view copy is fresher than its tracked board with its merge in this branch's history${mark ? `, and #${mark.unit} is marked already` : ""}`);
    return;
  }
  const cks = await Promise.all(written.map(d => run(path.join(__dirname, "check.js"), [d], ROOT)));
  if (cks.some(c => c.status !== 0)) { S.check = `FAIL: ${cks.flatMap(c => c.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l))).slice(0, 6).join(" | ") || (cks.find(c => c.status !== 0).stderr || "").trim().split(/\r?\n/)[0]}`; throw new Error("check.js failed on a board the seed would write"); }
  ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(ROOT, "docs", "plans", f)));
  const wb = await run(path.join(__dirname, "board.js"), ["--refresh-template", "--root", ROOT, ...(flag("no-gh") ? ["--no-gh"] : [])], ROOT);
  if (wb.status !== 0) throw new Error(`board.js (the committed repository work board, after seeding) failed: ${(wb.stderr || wb.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
  S.wrote.push("the repository work board: docs/plans/board.json, index.html, board.js (regenerated after seeding)");
  if (flag("no-live")) S.live = "skipped (--no-live)";
  else if (fs.existsSync(path.join(MAIN, "docs", "plans"))) {
    const liveDir = path.join(MAIN, "docs", "plans", ".live");
    ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(liveDir, f)));
    [...new Set([MAIN, ROOT])].forEach(t => ["index.js", "boards.js"].forEach(f => stage(path.join(t, "docs", "plans", ".live", f))));
    const lv = await run(path.join(__dirname, "board.js"), ["--live", "--refresh-template", "--root", MAIN, ...(flag("no-gh") ? ["--no-gh"] : [])], MAIN);
    if (lv.status !== 0) throw new Error(`board.js --live failed: ${(lv.stderr || lv.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
    S.live = "regenerated docs/plans/.live/";
  }
  const warns = cks.reduce((n, c) => n + (c.stdout.match(/^warn/gm) || []).length, 0);
  S.check = `pass (${plural(written.length, "board")}: ${plural(warns, "warning")})`;
  S.defects = [...new Set(cks.flatMap(c => c.stdout.split(/\r?\n/).map(l => (l.match(/^warn\s+(ISSUE TITLE NAMES A WORK LEVEL: #[\d?]+)/) || [])[1]).filter(Boolean)))];
  S.result = "ok";
}
/* The event unit-landed (plan/RULES.md §4, "The live view of a landing"; admin-team/dashboards-skill/level-1-landed), team-raised after the merge of a
   tracking issue's unit that has no board (a level-1 unit, marked complete at its seed), with --view, from the main checkout, naming no board: the
   standing rule's landed move on the tracking board's view copy, as a sub-issue's landed makes it (applyParent()): the unit landed with the plain fact of
   its landing as its summary, out of wip.current, wip.next the next unit in landing order or none, the chain's detail and one trail entry; and, at the
   tracking issue's last unit, the tracking board's own landing where the rules let it land (lastUnitLanding()). Facts { tracking: "docs/plans/<…>/<n>-<slug>",
   unit: <issue>, merge: <sha>, pr?: <n>, mergedAt?: <ISO time>, state?: "landed" }. It writes only the view copy and the live repository work board,
   never a tracked file. Raised again it changes nothing (result nothing), unless the board can land now that its impact is reconciled. A unit with a board
   of its own lands by its board's landed; unit-landed is refused for it until that has marked it, and then lands its tracking board only. */
async function unitLanded(now, req, facts) {
  const tf = typeof facts.tracking === "string" ? facts.tracking.replace(/\\/g, "/").replace(/\/+$/, "") : null, tfolder = tf && !/^docs\/plans\//.test(tf) ? `docs/plans/${tf}` : tf;
  if (!tfolder || !/^docs\/plans\/(.+\/)?\d+-[a-z0-9][a-z0-9-]*$/.test(tfolder) || tfolder.split("/").includes("..")) refuse(`unit-landed: facts.tracking ${JSON.stringify(facts.tracking || null)} is not docs/plans/[<parent>/]<issue>-<slug>, the tracking board's folder`);
  if (!Number.isInteger(facts.unit) || facts.unit < 1) refuse(`unit-landed: facts.unit ${JSON.stringify(facts.unit === undefined ? null : facts.unit)} is not the unit's issue number`);
  if (facts.state != null && facts.state !== "landed") refuse(`unit-landed: facts.state ${JSON.stringify(facts.state)}: unit-landed marks its unit landed (a seed marks it complete)`);
  const merge = typeof facts.merge === "string" && /^[0-9a-f]{7,40}$/.test(facts.merge) ? facts.merge : null;
  if (!merge) refuse(`unit-landed: facts.merge ${JSON.stringify(facts.merge === undefined ? null : facts.merge)} is not the merge commit's sha: a unit lands at its merge`);
  if (facts.pr != null && !(Number.isInteger(facts.pr) && facts.pr > 0)) refuse(`unit-landed: facts.pr ${JSON.stringify(facts.pr)} is not a pull request's number`);
  if (facts.mergedAt != null && !lib.isTime(facts.mergedAt)) refuse(`unit-landed: facts.mergedAt ${JSON.stringify(facts.mergedAt)} is not an ISO date-time`);
  const dir = path.join(ROOT, ...tfolder.split("/"));
  if (!fs.existsSync(path.join(dir, "plan.json"))) refuse(`unit-landed: ${tfolder} holds no plan.json: there is no tracking board to mark #${facts.unit} on`);
  try { lib.lockTree(ROOT, "apply-event.js unit-landed"); if (path.resolve(MAIN) !== path.resolve(ROOT)) lib.lockTree(MAIN, "apply-event.js unit-landed --view"); } catch (e) { refuse(e.message); }
  const text = fs.readFileSync(viewRead(dir), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n"; let pp;
  try { pp = JSON.parse(text); } catch (e) { refuse(`${tfolder}/plan.json does not parse: ${e.message}`); }
  S.issue = pp.issue; S.board = tfolder;
  if (pp.kind !== "tracking") refuse(`unit-landed: ${tfolder} is #${pp.issue}'s issue board, not a tracking board`);
  if (req.github && pp.repo && req.github !== pp.repo) refuse(`unit-landed: the tracking board is ${pp.repo}'s, not ${req.github}'s`);
  const row = (pp.rows || []).find(r => r && r.unit && r.unit.issue === facts.unit);
  if (!row) refuse(`unit-landed: the tracking board #${pp.issue} has no unit row for #${facts.unit}`);
  const st = (row.asBuilt || {}).state || "pending", w = pp.wip || {};
  if (pp.status === "abandoned" || w.step === "cancelled") refuse(`unit-landed: the tracking board #${pp.issue} was cancelled: #${facts.unit} is not marked on it`);
  if (["dropped", "deferred"].includes(st) || lib.leftForLater(row)) refuse(`unit-landed: #${facts.unit}'s unit ${row.id} is ${["dropped", "deferred"].includes(st) ? st : "left for later"} on #${pp.issue}'s board: a unit outside the plan does not land on it`);
  const own = (() => { try { return fs.readdirSync(dir, { withFileTypes: true }).some(d => d.isDirectory() && d.name.startsWith(facts.unit + "-") && fs.existsSync(path.join(dir, d.name, "plan.json"))); } catch (e) { return false; } })();
  if (own && !lib.UNIT_LANDED.includes(st)) refuse(`unit-landed: #${facts.unit} has a board of its own: its landed (raised on its board with --view) lands its unit`);
  if (pp.status === "built" || w.step === "landed") { S.result = "nothing"; S.live = "untouched"; S.check = "nothing to check"; S.applied.push(`#${pp.issue} has landed already: nothing written`); return; }
  /* the unit's landing, as a sub-issue's asBuilt carries it: the merge, the pull request, the merge's time */
  const sub = { issue: facts.unit, asBuilt: { merge, ...(Number.isInteger(facts.pr) ? { pr: facts.pr } : {}), ...(facts.mergedAt ? { at: facts.mergedAt } : {}) } };
  if (st === "pending") S.applied.push(`#${pp.issue}: ${row.id} was not marked complete: marked landed at its merge`);
  const P = applyParent(pp, sub, { kind: "landed", boardless: !own }, now);
  S.applied.push(...P.applied); S.enrich.push(...P.enrich);
  if (!P.applied.length) { S.result = "nothing"; S.live = "untouched"; S.check = "nothing to check"; S.applied.push(`#${facts.unit} is landed on #${pp.issue} already: nothing written`); return; }
  /* a view copy lives only while fresher than the board it stands for */
  { let tp = null; try { tp = JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8")); } catch (e) { /* reported above */ }
    if (tp && !(String(lib.planStamp(P.plan)) > String(lib.planStamp(tp)))) WARNINGS.push(`VIEW COPY NOT FRESHER: the event's time ${now} is not after the board's own stamp ${lib.planStamp(tp)}, so the live view drops the copy: raise it with its real time`); }
  writeBoard(dir, P.plan, eol, S.enrich, `#${facts.unit}'s unit on #${pp.issue}`);
  const ck = await run(path.join(__dirname, "check.js"), [lib.viewDirOf(dir, MAIN), "--root", ROOT], ROOT);
  if (ck.status !== 0) { S.check = `FAIL: ${ck.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 6).join(" | ") || (ck.stderr || "").trim().split(/\r?\n/)[0]}`; throw new Error("check.js failed on the tracking board's view copy"); }
  S.check = `pass (tracking board: ${plural((ck.stdout.match(/^warn/gm) || []).length, "warning")})`;
  S.defects = [...new Set(ck.stdout.split(/\r?\n/).map(l => (l.match(/^warn\s+(ISSUE TITLE NAMES A WORK LEVEL: #[\d?]+)/) || [])[1]).filter(Boolean))];
  if (flag("no-live")) S.live = "skipped (--no-live)";
  else {
    const liveDir = path.join(MAIN, "docs", "plans", ".live");
    ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(liveDir, f)));
    [...new Set([MAIN, ROOT])].forEach(t => ["index.js", "boards.js"].forEach(f => stage(path.join(t, "docs", "plans", ".live", f))));
    const lv = await run(path.join(__dirname, "board.js"), ["--live", "--refresh-template", "--root", MAIN, ...(flag("no-gh") ? ["--no-gh"] : [])], MAIN);
    if (lv.status !== 0) throw new Error(`board.js --live failed: ${(lv.stderr || lv.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
    S.live = "regenerated docs/plans/.live/";
  }
  S.result = "ok";
}
/* A child process, as a promise of { status, stdout, stderr }. */
const run = (file, a, cwd) => new Promise(res => { const c = cp.spawn(process.execPath, [file, ...a], { cwd, windowsHide: true }); let o = "", e = "";
  c.stdout.on("data", d => { o += d; }); c.stderr.on("data", d => { e += d; }); c.on("close", s => res({ status: s, stdout: o, stderr: e })); c.on("error", x => res({ status: 1, stdout: o, stderr: String(x) })); });

let DIR = null, ROOT = null, MAIN = null, LAY_HINT = null, EV = null;
const VIEWING = flag("view");
/* the board's data where --view reads it: its view copy when one is fresher than the tracked board, else the tracked plan.json */
const HELD = new Set();
const viewRead = dir => { const v = VIEWING ? lib.viewOf(dir, MAIN) : null; return v && (v.fresh || HELD.has(path.resolve(dir))) ? path.join(v.dir, "plan.json") : path.join(dir, "plan.json"); };
/* --repo takes the GitHub slug, owner/repo; a path to the repository's main checkout is accepted too and read as --main (the
   protocol's "repo" field is that path, its "github" field the slug). Anything else is a usage error. */
const REPO_ARG = opt("repo"), REPO_SLUG = REPO_ARG && /^[\w.-]+\/[\w.-]+$/.test(REPO_ARG) && !fs.existsSync(path.resolve(REPO_ARG)) ? REPO_ARG : null;
const REPO_PATH = REPO_ARG && !REPO_SLUG && fs.existsSync(REPO_ARG) && fs.statSync(REPO_ARG).isDirectory() ? REPO_ARG : null;
if (REPO_ARG && !REPO_SLUG && !REPO_PATH) { console.error(`${USAGE}\n(--repo takes the GitHub slug owner/repo, e.g. SpartanLaboratories/WebTools, or the path of the repository's main checkout; got ${JSON.stringify(REPO_ARG)})`); process.exit(2); }
if (REPO_PATH && opt("main") && path.resolve(opt("main")) !== path.resolve(REPO_PATH)) { console.error(`${USAGE}\n(--repo ${REPO_PATH} is a path, read as the main checkout, but --main names another: ${opt("main")})`); process.exit(2); }
/* The foundation of a sized on a folder with no board (plan/RULES.md §4, "The foundation"): built in memory, not started, for the event to
   start in place, as a board laid before its run is. Each text from the first source that tells it: the event, the issue on the tracker, the
   parent's unit row, the registry, the folder's own name; every text but the issue's title (quoted verbatim, §4) as any fact's, its work
   level and its internal names reworded, or left out for the next source. What only the documents can tell reads as being written, in
   the function's closing sentence and, from plan.foundation, on the board's columns. A fact the check requires and nothing tells (the repository, the baseline) refuses: the event falls
   back whole. Returns { plan, applied, enrich }. */
const gitAt = (...a) => { const r = cp.spawnSync("git", ["-C", ROOT, ...a], { encoding: "utf8", windowsHide: true }); return r.status === 0 ? r.stdout.trim() : null; };
function cleanText(v) {
  if (typeof v !== "string" || !v.trim()) return null;
  let s = nameTestLevels(v.replace(/\s+/g, " ").trim()).text;
  if (levelRefs(s).length) { s = scrubLevels(s, { scope: "issue", elided: [] }); if (!s || levelRefs(s).length) return null; }
  s = scrubWaits(s);
  if (nameRefs(s).length) { const n = scrubNames(s); if (n.left.some(unambiguous)) return null; s = n.text; }
  return /<(issue|slug|YYYY-MM-DD|sha|owner\/name)/.test(s) || /^<[^>]*>$/.test(s) ? null : s;
}
function layFoundation(req, facts, folder, now) {
  const name = path.basename(DIR), issue = parseInt(name, 10), applied = [], enrich = [];
  if (req.issue != null && req.issue !== issue) refuse(`the request names issue #${req.issue}, the folder is #${issue}'s`);
  const tplPlan = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "template", "plan.json"), "utf8"));
  let reg = null; try { reg = lib.registry(ROOT); } catch (e) { enrich.push(`docs/dashboards/systems.json does not parse (${e.message}): the systems are laid as the event names them`); }
  /* the repository */
  const inGit = fs.existsSync(path.join(ROOT, ".git"));
  const remote = () => { const u = inGit ? gitAt("remote", "get-url", "origin") : null, m = u && u.match(/[:/]([^/:]+\/[^/]+?)(\.git)?$/); return m ? m[1] : null; };
  const repo = REPO_SLUG || req.github || (reg && reg.reg.repo) || remote();
  if (!repo) refuse("the foundation names no repository: the request has no github, the registry no repo, the checkout no origin");
  /* the baseline: the event's sha (a string, or {ref, sha, date}), else the tree's HEAD; its date the commit's, else the event's */
  const g0 = facts.baseline != null ? facts.baseline : req.baseline, gb = g0 && typeof g0 === "object" ? g0 : { sha: g0 };
  const isSha = v => typeof v === "string" && /^[0-9a-f]{7,40}$/.test(v), isDay = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const sha = isSha(gb.sha) ? gb.sha : inGit ? gitAt("rev-parse", "--short", "HEAD") : null;
  if (!isSha(sha)) refuse(`the foundation has no baseline: the event names no sha (facts.baseline: ${JSON.stringify(g0 == null ? null : g0)}) and ${ROOT} tells none`);
  const shaDay = inGit ? gitAt("show", "-s", "--format=%cs", sha) : null;
  const originHead = inGit ? gitAt("symbolic-ref", "--short", "refs/remotes/origin/HEAD") : null;
  const ref = typeof gb.ref === "string" && gb.ref.trim() ? gb.ref.trim() : originHead ? originHead.replace(/^origin\//, "") : inGit && gitAt("rev-parse", "--verify", "--quiet", "refs/heads/main") ? "main" : "master";
  /* the parent, from the event, else the folder the issue sits in: a tracking board's (or a folder with no board yet), its parent; another
     issue's board holds a fix of its work or a folded-in issue, which the event or the presenter names */
  const up = path.dirname(DIR), upNum = parseInt(path.basename(up), 10) || null, inPlans = path.relative(path.join(ROOT, "docs", "plans"), up) !== "" && !path.relative(path.join(ROOT, "docs", "plans"), up).startsWith("..");
  let upPlan = null; try { upPlan = JSON.parse(fs.readFileSync(path.join(up, "plan.json"), "utf8")); } catch (e) { /* no board there, or none readable */ }
  const num = v => { const n = typeof v === "string" ? parseInt(v.replace(/^#/, ""), 10) : v; return Number.isInteger(n) && n > 0 ? n : null; };
  const said = num(facts.parent != null ? facts.parent : req.parent), fix = num(facts.fixOf != null ? facts.fixOf : req.fixOf);
  const within = upPlan && upPlan.issue === upNum && upPlan.kind !== "tracking" ? upNum : null;
  const parentN = said || (inPlans && upNum && !within && !fix ? upNum : null);
  if (within && !said && !fix) enrich.push(`#${issue} sits inside #${within}'s folder, and #${within} is no tracking issue: its parent and any fixOf are the presenter's to record`);
  const row = upPlan && parentN && upPlan.issue === parentN ? (upPlan.rows || []).find(r => r && r.unit && r.unit.issue === issue) || null : null, unit = row ? row.unit : null;
  /* the level, read for the kind and the steps line and never kept on the board (levels.js): the request's, an older unit row's, else the team's local state */
  const lv = [req.level, facts.level, unit && unit.level, lib.localLevel(repo, issue)].find(v => [1, 2, 3, 4].includes(v)), level = lv != null ? lv : null;
  const kind = facts.kind === "tracking" || facts.kind === "issue" ? facts.kind : level === 4 || facts.step === "architecture" ? "tracking" : "issue";
  /* the systems: the event's slugs, else the unit row's. A slug the registry does not know yields to the parent's unit row's system where the
     registry knows that one (WebTools #66: the run sent webtools-http-response-cache, the registry and the unit row say webtools-http-cache),
     with a warning; else it falls back to itself, in the neutral colour (lib.js systemEntry()): the check warns on it, and it is named here,
     for the presenter to map it */
  const saidSlugs = (Array.isArray(facts.systems) ? facts.systems : typeof facts.systems === "string" ? [facts.systems] : row && row.system ? [row.system] : []).filter(s => typeof s === "string" && s.trim()).map(s => s.trim());
  const knownSlug = s => !!(reg && reg.info(s)), rowSlug = row && typeof row.system === "string" && knownSlug(row.system) ? row.system : null, yielded = rowSlug ? [...new Set(saidSlugs.filter(s => !knownSlug(s)))] : [];
  if (yielded.length) { WARNINGS.push(`SYSTEM UNKNOWN: ${yielded.map(s => JSON.stringify(s)).join(", ")} ${yielded.length === 1 ? "is" : "are"} not in docs/dashboards/systems.json: the parent's unit row's ${JSON.stringify(rowSlug)} laid instead`); applied.push(`systems: ${yielded.join(", ")} yielded to the unit row's ${rowSlug}`); }
  const slugs = [...new Set(saidSlugs.map(s => yielded.includes(s) ? rowSlug : s))];
  const systems = slugs.map(s => lib.systemEntry(reg, s)), unknown = slugs.filter(s => !(reg && reg.info(s)));
  if (unknown.length) { WARNINGS.push(`SYSTEM UNKNOWN: ${unknown.map(s => JSON.stringify(s)).join(", ")} ${unknown.length === 1 ? "is" : "are"} not in docs/dashboards/systems.json: laid as named, in the neutral colour, with no board`); enrich.push(`facts.systems names ${unknown.join(", ")}, which the registry does not know: laid as named, in the neutral colour, with no board; the presenter maps ${unknown.length === 1 ? "it" : "them"} to the registry's slug`); }
  /* the texts */
  const wantIssue = !cleanText(facts.function) || !(typeof facts.issueTitle === "string" && facts.issueTitle.trim());
  const G = wantIssue && !flag("no-gh") ? lib.ghIssue(repo, issue) : {};
  const shortName = name.slice(String(issue).length + 1).replace(/-/g, " "), fromSlug = shortName.charAt(0).toUpperCase() + shortName.slice(1);
  const title = cleanText(facts.title) || cleanText(row && row.name) || fromSlug;
  /* the issue's title is quoted verbatim, whatever it says (a work level in it is a defect in the issue, which check.js flags) */
  const issueTitle = [facts.issueTitle, G.title, unit && unit.title].find(v => typeof v === "string" && v.trim()) || null;
  const given = cleanText(facts.function);
  const unitWords = unit ? `${title}, unit ${unit.n != null ? unit.n + " " : ""}of #${parentN}.` : null;
  const body = cleanText(lib.firstParagraph(G.body)), gap = row && row.gap ? cleanText(row.gap.summary) : null;
  const sys = !body && !gap && slugs.length && reg ? (reg.reg.systems || []).find(s => s.slug === slugs[0] && typeof s.function === "string") : null, sysWords = sys ? cleanText(`${sys.name}: ${sys.function}`) : null;
  const standIn = [body ? null : unitWords, body, gap, sysWords, !body && !unitWords && !gap && !sysWords ? (issueTitle && cleanText(issueTitle) ? `${cleanText(issueTitle).replace(/[.:;,]+$/, "")}.` : `Issue #${issue}, ${shortName}.`) : null, "What this run does is being written from the documents."].filter(Boolean).join(" ");
  const fn = given || standIn;
  const parent = parentN ? { issue: parentN, board: null } : null;
  const plan = lib.foundationPlan(tplPlan, { repo, issue, name, rel: folder, kind, level, title, issueTitle, function: fn, parent, fixOf: fix ? { issue: fix, board: null } : null, step: null, now,
    baseline: { ref, sha, date: isDay(gb.date) ? gb.date : isDay(shaDay) ? shaDay : now.slice(0, 10) }, systems });
  const sop = parent && kind !== "tracking" && upPlan && upPlan.issue === parentN && upPlan.kind === "tracking" && ((upPlan.milestones || []).some(m => m && m.column === "considered") || (upPlan.rows || []).some(r => r && r.unit));
  plan.foundation = { at: now, ...(given ? {} : { function: fn }), ...(sop ? { considered: true } : {}) };
  applied.push(`foundation laid: title from ${cleanText(facts.title) ? "the event" : cleanText(row && row.name) ? "the parent's unit row" : "the folder's name"}, the issue's title from ${!issueTitle ? "nothing yet" : issueTitle === facts.issueTitle ? "the event" : issueTitle === G.title ? "the tracker" : "the parent's unit row"}, the function ${given ? "from the event" : `a stand-in from ${[body ? "the tracker" : null, !body && unitWords ? "the parent's unit row" : null, gap ? "the unit row's gap" : null, sysWords ? "the registry" : null].filter(Boolean).join(" and ") || "the folder's name"}`}`);
  return { plan, applied, enrich };
}
async function main() {
  const evFile = opt("event"), wt = opt("worktree");
  if (!evFile || !wt) { console.error(`${USAGE}\n(--event and --worktree are required)`); process.exit(2); }
  const req = readRequest(evFile), facts = req.facts && typeof req.facts === "object" ? req.facts : {};
  if (req.action && req.action !== "plan-board") refuse(`the request's action is ${JSON.stringify(req.action)}, not plan-board`);
  /* a retime's facts.event is the event it retimes, never the request's: a request that names none, with a retime's facts, is not read as that event */
  if (!req.event && (facts.from != null || facts.to != null)) refuse(`the request names no event: a retime is "event": "retime", and its facts.event (${JSON.stringify(facts.event || null)}) the event it retimes`);
  const ev = req.event || facts.event; S.event = ev || null; EV = ev;
  /* retired: no unit's board is laid ahead of its run (plan/RULES.md §4); an older board's record of it is still read */
  if (lib.RETIRED_EVENTS.includes(ev)) refuse(`${ev} is retired: a unit's board is laid at its own sized, never ahead of its run`);
  if (!lib.EVENTS.includes(ev)) refuse(`the request names no plan-board event (got ${JSON.stringify(ev || null)}; one of ${lib.EVENTS.join(", ")})`);
  if (ev === "reseed") {
    if (VIEWING) refuse("reseed writes the tracked boards a sized seeded, never the view copies: raise it without --view");
    if (REPO_SLUG && req.github && REPO_SLUG !== req.github) refuse(`--repo ${REPO_SLUG} is not the request's github ${req.github}`);
    ROOT = path.resolve(wt); MAIN = path.resolve(opt("main") || REPO_PATH || req.repo || ROOT);
    if (!fs.existsSync(path.join(MAIN, "docs", "plans"))) refuse(`reseed: the main checkout ${MAIN} has no docs/plans/`);
    const at0 = opt("at") || facts.at || null; if (at0 && isNaN(Date.parse(at0))) refuse(`the event's time ${JSON.stringify(at0)} is not an ISO time`);
    return reseed((at0 ? new Date(at0) : new Date()).toISOString().replace(/\.\d+Z$/, "Z"), req);
  }
  if (ev === "seed") {
    if (VIEWING) refuse("seed writes a run's tracked boards from the view copies, never the view copies: raise it without --view");
    if (req.folder != null) refuse(`seed names no board: the run's unit on its tracking board is facts.tracking and facts.unit, not the request's folder ${JSON.stringify(req.folder)}`);
    if (REPO_SLUG && req.github && REPO_SLUG !== req.github) refuse(`--repo ${REPO_SLUG} is not the request's github ${req.github}`);
    ROOT = path.resolve(wt); MAIN = path.resolve(opt("main") || REPO_PATH || req.repo || ROOT);
    if (!fs.existsSync(path.join(ROOT, "docs", "plans"))) refuse(`seed: the worktree ${ROOT} has no docs/plans/`);
    if (!fs.existsSync(path.join(MAIN, "docs", "plans"))) refuse(`seed: the main checkout ${MAIN} has no docs/plans/`);
    const at0 = opt("at") || facts.at || null; if (at0 && isNaN(Date.parse(at0))) refuse(`the event's time ${JSON.stringify(at0)} is not an ISO time`);
    return seed((at0 ? new Date(at0) : new Date()).toISOString().replace(/\.\d+Z$/, "Z"), req, facts);
  }
  if (ev === "unit-landed") {
    if (!VIEWING) refuse("unit-landed writes the tracking board's view copy, never a tracked file: raise it with --view, from the main checkout, after the merge");
    if (req.folder != null) refuse(`unit-landed names no board: the unit on its tracking board is facts.tracking and facts.unit, not the request's folder ${JSON.stringify(req.folder)}`);
    if (REPO_SLUG && req.github && REPO_SLUG !== req.github) refuse(`--repo ${REPO_SLUG} is not the request's github ${req.github}`);
    ROOT = path.resolve(wt); MAIN = path.resolve(opt("main") || REPO_PATH || req.repo || ROOT);
    if (!fs.existsSync(path.join(MAIN, "docs", "plans"))) refuse(`--view: the main checkout ${MAIN} has no docs/plans/`);
    if (!require("./mdcopy.js").liveWritable(MAIN)) refuse(`--view: docs/plans/.live/ is not git-ignored in ${MAIN} (add it to the main checkout's .git/info/exclude): no view copy written`);
    const at0 = opt("at") || facts.at || req.at || null; if (at0 && isNaN(Date.parse(at0))) refuse(`the event's time ${JSON.stringify(at0)} is not an ISO time`);
    return unitLanded((at0 ? new Date(at0) : new Date()).toISOString().replace(/\.\d+Z$/, "Z"), req, facts);
  }
  const folder = typeof req.folder === "string" ? req.folder.replace(/\\/g, "/").replace(/\/+$/, "") : null;
  if (!folder || !/^docs\/plans\/(.+\/)?\d+-[a-z0-9][a-z0-9-]*$/.test(folder) || folder.split("/").includes("..")) refuse(`the request's folder ${JSON.stringify(req.folder || null)} is not docs/plans/[<parent>/]<issue>-<slug>`);
  ROOT = path.resolve(wt); DIR = path.join(ROOT, ...folder.split("/")); S.board = folder;
  MAIN = path.resolve(opt("main") || REPO_PATH || req.repo || ROOT);
  if (VIEWING && !fs.existsSync(path.join(MAIN, "docs", "plans"))) refuse(`--view: the main checkout ${MAIN} has no docs/plans/`);
  if (VIEWING && !require("./mdcopy.js").liveWritable(MAIN)) refuse(`--view: docs/plans/.live/ is not git-ignored in ${MAIN} (add it to the main checkout's .git/info/exclude): no view copy written`);
  if (!fs.existsSync(path.join(ROOT, "docs"))) refuse(`the worktree ${ROOT} has no docs/ folder`);
  const at = opt("at") || facts.at || req.at || null;
  if (at && isNaN(Date.parse(at))) refuse(`the event's time ${JSON.stringify(at)} is not an ISO time`);
  const now = (at ? new Date(at) : new Date()).toISOString().replace(/\.\d+Z$/, "Z");
  const planFile = path.join(DIR, "plan.json");
  /* the boards' short lock, held for this run (lib.js lockTree()): a fill behind this event merges onto what it writes, and waits at most this run's second or two; with --view the view copies' tree too */
  try { lib.lockTree(ROOT, `apply-event.js ${ev}`); if (VIEWING && path.resolve(MAIN) !== path.resolve(ROOT)) lib.lockTree(MAIN, `apply-event.js ${ev} --view`); } catch (e) { refuse(e.message); }
  /* a sized on a folder with no board lays the foundation first (plan/RULES.md §4, "The foundation"), after the seed, so it reads its parent's
     unit row as the previous landing left it, and the event then starts it in place; a failure on the way leaves it to the presenter */
  let laid = null, seededFirst = [];
  if (!fs.existsSync(planFile)) {
    if (ev !== "sized") refuse(`${folder} holds no plan.json: there is no board to apply ${ev} to`);
    /* the view shows a landing, never a run's start: nothing to do */
    if (VIEWING) { S.result = "no-board"; S.issue = req.issue || null; S.enrich.push("sized with --view: no board to show; the event is raised without it"); return; }
    LAY_HINT = `sized: no foundation was laid, so the presenter lays it (new.js ... --at ${now}, the event's time, the Timeline's run start) from the documents, then raises the event again, which starts the unit on its tracking board`;
    seededFirst = seedFromView(now);
    laid = layFoundation(req, facts, folder, now);
  }
  /* a copy a sized seeded as it stood ties its tracked board, or falls behind it on the tracking board: the refresh's fills are in the copy, so the refresh's own events read it (reseed() then brings it to the tracked boards) */
  if (VIEWING) { const v0 = lib.viewOf(DIR, MAIN); let vp0 = null; try { vp0 = v0 && JSON.parse(fs.readFileSync(path.join(v0.dir, "plan.json"), "utf8")); } catch (e) { /* no copy */ }
    if (lib.landedPending(vp0)) { HELD.add(path.resolve(DIR)); HELD.add(path.resolve(path.dirname(DIR))); } }
  const text = laid ? null : fs.readFileSync(viewRead(DIR), "utf8"), eol = text && /\r\n/.test(text) ? "\r\n" : "\n";
  let orig = laid ? laid.plan : null; if (!laid) { try { orig = JSON.parse(text); } catch (e) { refuse(`${folder}/plan.json does not parse: ${e.message}`); } }
  /* the board as read names its qa passes "Quality Review N" before the event applies (passnames.js renamePasses()), so an open point or an
     entry the facts name again in the new wording matches the one it already holds, and the same event twice still changes nothing */
  const renamed = lib.renamePasses(orig);
  S.issue = orig.issue;
  if (req.issue != null && req.issue !== orig.issue) refuse(`the request names issue #${req.issue}, the board is #${orig.issue}'s`);
  const repo = REPO_SLUG || req.github || null;
  if (REPO_SLUG && req.github && REPO_SLUG !== req.github) refuse(`--repo ${REPO_SLUG} is not the request's github ${req.github}`);
  if (repo && orig.repo && repo !== orig.repo) refuse(`the board is ${orig.repo}'s, not ${repo}'s`);

  /* a land step is known by its visit: raised again, whatever events came since (the merge, landed), it changes nothing (plan/RULES.md §4,
     "The live view of a landing"), with its own time, or with none on a board that has landed; with --view, one older than the board's last event
     cannot be placed: the view's Timeline would run backwards */
  if (["landing", "merge"].includes(ev)) {
    const W0 = orig.wip || {}, gone = orig.status === "built" || W0.step === "landed";
    if (at ? lib.landVisit(W0, ev, now) : gone && lib.landVisit(W0, ev, null)) { S.result = "duplicate"; S.applied.push(`${ev} is already recorded${at ? ` at ${now}` : ""}: nothing written`); return; }
    if (VIEWING && W0.event && lib.isTime(W0.event.at) && Date.parse(now) < Date.parse(W0.event.at)) refuse(`--view: ${ev} at ${now} is older than the board's last event (${W0.event.name}, ${W0.event.at}): raise landing, merge and landed in order (remove the view copies under docs/plans/.live/view/ to start them again)`);
  }
  /* a stretch when the run was not running is known by its bounds: raised again, whatever events came since, it changes nothing */
  if (ev === "run-restarted" && lib.hasOutage(orig.wip, facts.since, facts.ended)) { S.result = "duplicate"; S.applied.push(`${facts.since} → ${facts.ended} is already recorded: nothing written`); return; }
  /* a retime is known by its correction's entry: raised again, whatever events came since, it changes nothing */
  if (ev === "retime" && lib.isTime(facts.from) && lib.isTime(facts.to)) {
    const k = { event: typeof facts.event === "string" ? facts.event.trim() : facts.event, from: retimeStamp(facts.from), to: retimeStamp(facts.to) };
    if ((((orig.notes || {}).corrections) || []).some(x => x && x.retime && x.retime.event === k.event && x.retime.from === k.from && x.retime.to === k.to)) { S.result = "duplicate"; S.applied.push(`${k.event} ${k.from} → ${k.to} is already corrected: nothing written`); return; }
  }
  /* the same event twice changes nothing: applied again at its own recorded time, it gives the board it left */
  const last = (orig.wip || {}).event;
  if (ev !== "run-restarted" && ev !== "retime" && last && last.name === ev && last.at) {
    const again = applyEvent(orig, ev, facts, req, last.at), a = JSON.parse(JSON.stringify(again.plan)), b = JSON.parse(JSON.stringify(orig));
    a.wip.updated = b.wip.updated = null;
    if (JSON.stringify(a) === JSON.stringify(b)) { S.result = "duplicate"; S.applied.push(`already applied at ${last.at}: nothing written`); return; }
  }
  /* seeding at sized (plan/RULES.md §4, "Seeding at sized"; admin-team/dashboards-skill/35): a run sized in a worktree branched after a
     landing starts from the landed state the main checkout's live view shows, so the branch carries it from its first commit */
  const seeded = laid ? seededFirst : ev === "sized" && !VIEWING ? seedFromView(now) : [];
  const R = applyEvent(orig, ev, facts, req, now);
  if (laid) { S.laid = folder; S.applied.push(...laid.applied); S.enrich.push(...laid.enrich); }
  S.applied.push(...renamed, ...R.applied); S.enrich.push(...R.enrich);
  /* a sub-issue's retime: its tracking board's record of the same time moves with it (the unit's start, its review, its landing, which the
     standing rule stamped there), under the same refusals; the one correction entry, on the sub-issue's board, says so */
  let retimedParent = null;
  if (R.parentOp && R.parentOp.kind === "retime") {
    const up0 = lib.parentFolder(DIR, R.plan);
    if (up0 && fs.existsSync(path.join(up0, "dashboard.html"))) {
      let pp; try { pp = JSON.parse(fs.readFileSync(viewRead(up0), "utf8")); } catch (e) { refuse(`the parent tracking board's plan.json does not parse: ${e.message}`); }
      const O = R.parentOp, P = lib.retimePlan(pp, { event: O.event, from: O.from, to: O.to, parentOf: R.plan.issue });
      if (P.refused) refuse(`retime: ${P.refused}`);
      if (P.moved.length) { const W = pp.wip = pp.wip || {}; if (!(lib.isTime(W.updated) && Date.parse(W.updated) > Date.parse(now))) W.updated = now;
        R.plan.notes.corrections[O.entry].what = lib.retimeWhat(O.head, [...O.words, `#${pp.issue}'s record of it`]); }
      S.applied.push(...P.lines.map(l => /^the tracking board/.test(l) ? l : `#${pp.issue}: ${l}`));
      retimedParent = pp;
    }
  }
  /* a view copy lives only while fresher than the board it stands for (board.js --live removes it otherwise): said, never lost in silence */
  if (VIEWING) { let tp = null; try { tp = JSON.parse(fs.readFileSync(planFile, "utf8")); } catch (e) { /* reported above */ } if (tp && !(String(lib.planStamp(R.plan)) > String(lib.planStamp(tp)))) WARNINGS.push(`VIEW COPY NOT FRESHER: the event's time ${now} is not after the board's own stamp ${lib.planStamp(tp)}, so the live view drops the copy: raise it with its real time`); }

  {
    if (laid) { const made = []; for (let d = DIR; !fs.existsSync(d); d = path.dirname(d)) made.unshift(d); made.forEach(d => { fs.mkdirSync(d); madeDirs.push(d); }); }
    if (laid && !flag("no-live")) { const lv = path.join(ROOT, "docs", "plans", ".live"); if (!fs.existsSync(lv)) { fs.mkdirSync(lv, { recursive: true }); madeDirs.push(lv); } }
    writeBoard(DIR, R.plan, eol, S.enrich, "board");
    /* the parent tracking board: the standing rule's move, then a re-embed that mirrors this unit's run (lib.js mirrorUnitRuns) */
    const up = lib.parentFolder(DIR, R.plan);
    if (up && fs.existsSync(path.join(up, "dashboard.html"))) {
      const ptext = fs.readFileSync(viewRead(up), "utf8"), peol = /\r\n/.test(ptext) ? "\r\n" : "\n";
      let pplan; try { pplan = JSON.parse(ptext); } catch (e) { throw new Error(`the parent tracking board's plan.json does not parse: ${e.message}`); }
      if (retimedParent) pplan = retimedParent;
      else if (R.parentOp) { const P = applyParent(pplan, R.plan, R.parentOp, now); pplan = P.plan; S.applied.push(...P.applied); S.enrich.push(...P.enrich); }
      const prel = path.relative(ROOT, up).split(path.sep).join("/");
      S.parent = `${prel} (${writeBoard(up, pplan, peol, S.enrich, "parent") ? "re-embedded" : "unchanged"})`;
      /* with --view, the issue's copy once more, now that its parent's copy exists for its link to open (lib.js viewLink()) */
      if (VIEWING) writeBoard(DIR, R.plan, eol, [], "board");
    } else if (R.plan.parent && R.parentOp && R.parentOp.kind !== "retime") S.enrich.push(`the parent tracking board #${R.plan.parent.issue} is not in the enclosing folder: the standing rule is the presenter's`);

    /* check.js on every board written, and the live repository work board, at once */
    const at = d => VIEWING ? [lib.viewDirOf(d, MAIN), "--root", ROOT] : [d];
    const checks = [run(path.join(__dirname, "check.js"), at(DIR), ROOT)];
    if (up) checks.push(run(path.join(__dirname, "check.js"), at(up), ROOT));
    /* the boards seeded from the live view, and the worktree's committed repository work board regenerated from them (board.js
       --refresh-template), so the branch carries the previous landing's state from its first commit */
    const seededChecks = seeded.filter(d => d !== DIR && d !== up).map(d => run(path.join(__dirname, "check.js"), [d], ROOT));
    let wbRun = null;
    if (seeded.length) { ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(ROOT, "docs", "plans", f)));
      wbRun = run(path.join(__dirname, "board.js"), ["--refresh-template", "--root", ROOT, ...(flag("no-gh") ? ["--no-gh"] : [])], ROOT); }
    let liveStart = null, liveDir = null;
    const main = path.resolve(opt("main") || REPO_PATH || req.repo || ROOT);
    if (flag("no-live")) S.live = "skipped (--no-live)";
    else if (!fs.existsSync(path.join(main, "docs", "plans"))) { S.live = `skipped (${main} has no docs/plans/)`; S.enrich.push("the live repository work board: the main checkout was not found"); }
    else {
      liveDir = path.join(main, "docs", "plans", ".live");
      if (!fs.existsSync(liveDir)) { fs.mkdirSync(liveDir, { recursive: true }); madeDirs.push(liveDir); }
      ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(liveDir, f)));
      /* the markers board.js writes in every tree it reads: put back too, or a failed event's marker names a board that is gone */
      [...new Set([main, ROOT])].forEach(t => ["index.js", "boards.js"].forEach(f => stage(path.join(t, "docs", "plans", ".live", f))));
      const ex = path.join(main, ".git", "info", "exclude");
      if (fs.existsSync(path.join(main, ".git")) && fs.statSync(path.join(main, ".git")).isDirectory() && !(fs.existsSync(ex) && /^\/?docs\/plans\/\.live\/?\s*$/m.test(fs.readFileSync(ex, "utf8"))))
        S.enrich.push("docs/plans/.live/ is not in the main checkout's .git/info/exclude: the presenter adds the line");
      liveStart = () => run(path.join(__dirname, "board.js"), ["--live", "--refresh-template", "--root", main, ...(flag("no-gh") ? ["--no-gh"] : [])], main);
    }
    /* with --view the checks read the copies before board.js --live runs: it removes a copy no fresher than its tracked board, never under a check reading it */
    const viewCks = VIEWING ? await Promise.all(checks) : null;
    const [cks, lv, sks, wb] = await Promise.all([viewCks || Promise.all(checks), liveStart && !(viewCks && viewCks.some(c => c.status !== 0)) ? liveStart() : null, Promise.all(seededChecks), wbRun]);
    const warns = cks.map(c => (c.stdout.match(/^warn/gm) || []).length), fails = cks.flatMap(c => c.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)));
    /* no open point is committed open (dashboards-skill/35): at the landing every open point is resolved, and check.js fails a board at the
       land with one still open; the summary says what to do */
    if (fails.some(l => /OPEN POINT AT THE LAND/.test(l))) S.enrich.push("an open point is still open at the land: resolve it (facts.open, each with resolved) and raise the event again; nothing is committed open");
    if (fails.some(l => /GAP UNWRITTEN|FOUNDATION NOT FILLED/.test(l))) S.enrich.push("the board's foundation is not filled: write what it reads as being written from the documents (the function, the rows with their Gap) and raise the event again");
    if (cks.some(c => c.status !== 0)) { S.check = `FAIL: ${fails.slice(0, 6).join(" | ") || (cks.find(c => c.status !== 0).stderr || "").trim().split(/\r?\n/)[0]}`; throw new Error("check.js failed on the board it would write"); }
    if (sks.some(c => c.status !== 0)) { S.check = `FAIL (a seeded board): ${sks.flatMap(c => c.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l))).slice(0, 4).join(" | ")}`; throw new Error("check.js failed on a board seeded from the live view"); }
    if (wb && wb.status !== 0) throw new Error(`board.js (the committed repository work board, after seeding) failed: ${(wb.stderr || wb.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
    if (wb) S.wrote.push("the repository work board: docs/plans/board.json, index.html, board.js (regenerated after seeding)");
    S.check = `pass (board: ${plural(warns[0], "warning")}${up ? `; parent: ${plural(warns[1], "warning")}` : ""})`;
    /* an issue title that names a work level is a defect in the issue (levelrefs.js issueTitleRefs(); dashboards-skill/28): quoted verbatim,
       never failing the board; named here so the team brings it to the user to retitle on GitHub */
    S.defects = [...new Set(cks.flatMap(c => c.stdout.split(/\r?\n/).map(l => (l.match(/^warn\s+(ISSUE TITLE NAMES A WORK LEVEL: #[\d?]+)/) || [])[1]).filter(Boolean)))];
    if (lv) {
      if (lv.status !== 0) throw new Error(`board.js --live failed: ${(lv.stderr || lv.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
      S.live = `regenerated ${path.relative(main, liveDir).split(path.sep).join("/")}/`;
    }
    /* the rendered copies of the Markdown the board links (mdcopy.js): a cache of this machine, outside the atomic set */
    try { const md = require("./mdcopy.js"), c = md.copyBoardDocs(R.plan, DIR); if (c.skipped) S.enrich.push(c.skipped); else if (c.wrote.length) S.wrote.push(`rendered copies: ${c.wrote.length}`); } catch (e) { S.enrich.push("the rendered Markdown copies failed: " + e.message); }
    /* the open points' reports, copied when each point is raised (dashboards-skill/35): a cache of this machine, outside the atomic set */
    if (OPEN_JOBS.length) { try { const c = runOpenJobs(); if (c.length) S.wrote.push(`open points' reports copied: ${c.join(", ")}`); } catch (e) { S.enrich.push("the open points' report copies failed: " + e.message); } }
    /* the progress notes' index and its watcher (progress-index.js): a note needs no event, and a board cannot list a folder. A cache of this machine, outside the atomic set */
    if (!VIEWING && !["landed", "cancelled"].includes(((R.plan || {}).wip || {}).step)) { try { require("./progress-index.js").ensureWatcher(ROOT); } catch (e) { S.enrich.push("the progress notes' index failed: " + e.message); } }
    S.result = "ok";
  }
}

main().then(() => { say(); process.exit(0); }, e => {
  S.result = "failed"; S.error = e.message;
  try { S.restored = rollback(); } catch (x) { S.error += `; the rollback failed too: ${x.message}`; }
  if (!S.enrich.includes("the event was not applied: the presenter applies it")) S.enrich.unshift("the event was not applied: the presenter applies it");
  if (LAY_HINT) { S.laid = null; [S.applied, S.enrich].forEach(l => l.splice(0, l.length, ...l.filter(x => !/^foundation laid|^sized: the foundation is laid/.test(x)))); S.enrich.push(LAY_HINT); }
  say(); process.exit(1);
});
