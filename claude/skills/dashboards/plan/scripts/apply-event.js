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
// --view       the live view only (the post-merge refresh's landed, plan/RULES.md §4, "The live view of a landing"): every board it would
//              write in place (the issue's, its parent tracking board) is written as its view copy under the main checkout's git-ignored
//              docs/plans/.live/view/<folder under docs/plans>/ instead, and read from that copy where one is fresher than the tracked
//              board (lib.js viewOf()); no tracked file is written. The live repository work board then opens the copies
// --no-live    leave the live repository work board alone; --no-gh builds it from the boards alone (board.js --no-gh)
// --json       print the summary as one JSON object instead of key: value lines
// What it does: reads the request and <worktree>/<folder>/plan.json; applies the event (the step, the stages and the derived as-built
// states, the research questions and phase, the glow, the halt and its resume, the open points, the qa passes, the remediation, the
// interview's questions, the detail, wip.event and wip.updated, one trail entry, the branch; the snapshot of the step it ended, frozen
// into wip.history.<step>, plan/RULES.md §3, "Finished steps"); re-renders the board onto the current
// template when it is not the verified template plus its data (plan/RULES.md §4, "Every event re-renders the board"); embeds the
// board (its data block and its plan.js sidecar); on a sub-issue applies the standing rule to its parent tracking board (a unit's
// start at sized, complete at an approving qa pass, landed at landed) and re-embeds it, which mirrors the unit's run; runs check.js
// (no browser pass) on every board it wrote and regenerates the live repository work board (board.js --live --refresh-template) at once.
// Writes only the issue's board files, its parent tracking board's files and docs/plans/.live/; never git, never a commit, never the
// committed repository work board. Every file is written through a temporary file and a rename, and on any failure every file it wrote is put
// back as it was: exit 1, nothing changed. Exit 0 when applied, or when the event was already applied (the same event twice changes
// nothing), or when there is no board to apply it to (sized: the presenter lays the foundation); exit 2 on a usage error.
// Since admin-team/dashboards-skill/35: the Document step's event (document, facts.tasks, applied whole; a team-raised state-boards on a
// board in that flow is its state-boards task), the land in two steps (landing, merge), an approving qa pass leading to the Document step;
// seeding at sized (a worktree branched after a landing starts the boards the main checkout's live view shows landed, seedFromView());
// an open point's report outside the tree copied when the point is raised, for the live view (runOpenJobs()), and every open point
// resolved at the land (check.js fails one left open); a bare test level beside a test word written as its named test level, and a bare
// "Ln" elsewhere elided as a work level with a warning (summary: warnings).
"use strict";
const T0 = Date.now();
const fs = require("fs"), path = require("path"), cp = require("child_process");
const lib = require("./lib.js"), TL = require("./testslib.js");
const dev = require(path.resolve(__dirname, "..", "..", "system", "scripts", "deviation.js"));
const { levelRefs, scrubLevels, nameTestLevels } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));
const { nameRefs, scrubNames, unambiguous } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "namerefs.js"));

const USAGE = "usage: node apply-event.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--main <checkout>] [--at <ISO time>] [--view] [--no-live] [--no-gh] [--json]";
const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: USAGE, valued: ["event", "worktree", "repo", "main", "at"], flags: ["view", "no-live", "no-gh", "json"], max: 0 });
const opt = n => lib.opt(args, n, null), flag = n => lib.flag(args, n);

/* the summary, printed at the end whatever happens */
const S = { result: null, event: null, issue: null, board: null, applied: [], enrich: [], rerendered: [], wrote: [], view: [], seeded: [], parent: null, live: null, check: null, warnings: [], defects: [], error: null, restored: 0 };
/* the fast path's own warnings (a bare "Ln" elided as a work level, dashboards-skill/35): printed under "warnings" and counted on the check line */
const WARNINGS = S.warnings;
const say = () => {
  S.ms = Date.now() - T0;
  S.warnings.splice(0, S.warnings.length, ...new Set(S.warnings));
  if (S.warnings.length && S.check && !/fast-path warning/.test(S.check)) S.check += ` · ${S.warnings.length} fast-path warning${S.warnings.length === 1 ? "" : "s"} (below)`;
  const enrich = S.enrich.length ? "yes" : "no";
  if (flag("json")) { console.log(JSON.stringify({ ...S, enrich, why: S.enrich.length ? S.enrich : ["the event's facts decide everything it writes"] })); return; }
  const L = [["apply-event", S.result], ["event", S.event], ["issue", S.issue != null ? "#" + S.issue : null], ["board", S.board],
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
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function atomicWrite(file, data) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, data);
  for (let i = 0; ; i++) { try { fs.renameSync(tmp, file); return; } catch (e) { if (i >= 20 || !["EPERM", "EBUSY", "EACCES"].includes(e.code)) { try { fs.unlinkSync(tmp); } catch (x) { /* gone */ } throw e; } sleep(25); } }
}
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
/* The column a step's trail entry sits in. */
const STEP_COLUMN = { "sub-issues": "considered", boards: "considered", sizing: "gap", interview: "gap", research: "gap", architecture: "considered", plan: "verdict", branch: "built", implementation: "built", qa: "built", remediation: "built", document: "built", landing: "built", "state-boards": "built", merge: "built", landed: "built", cancelled: "built" };
const STEP_WORDS = { "sub-issues": "filing the units as sub-issues", boards: "creating the units' boards", sizing: "sizing", interview: "the interview", research: "research", architecture: "the architecture", plan: "the plan", branch: "the branch", implementation: "implementation", qa: "qa", remediation: "remediation", document: "the Document step", landing: "the landing", "state-boards": "the state boards", merge: "the merge", landed: "landed" };
const ROUTE_WORDS = { "on-the-spot": "minor fixes on the spot, then the Document step with no new qa pass", "remediation": "a remediation pass, then the next qa pass", "re-plan-then-remediation": "a plan re-pass, then a remediation pass, then the next qa pass" };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const code = s => "`" + s + "`";

/* One event, applied to a copy of the board. Deterministic: the same board, facts and time give the same result. Returns
   { plan, applied, enrich, parentOp } — parentOp the standing rule's move on the parent tracking board, or null. */
function applyEvent(orig, ev, facts, req, now) {
  const plan = JSON.parse(JSON.stringify(orig)), applied = [], enrich = [], resolved = [], today = now.slice(0, 10);
  const w = plan.wip = plan.wip && typeof plan.wip === "object" ? plan.wip : {};
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
    if (levelRefs(s).length) {
      const el = [], r = IDENT.has(field) ? null : scrubLevels(s, { scope, elided: el });
      /* a bare "Ln" elided as a work level is warned on, so the elision is visible (dashboards-skill/35) */
      if (r && el.length) WARNINGS.push(`LEVEL ELIDED: facts.${field}: ${el.map(h => JSON.stringify(h)).join(", ")} elided as a work level (written ${shortJ(r)}); a test level is written with its name ("L2 component")`);
      if (!r) { enrich.push(`facts.${field} names a work level, which a board never shows: not written`); return null; }
      enrich.push(`facts.${field} named a work level, which a board never shows: written reworded (${shortJ(r)})`);
      s = r;
    }
    if (!nameRefs(s).length) return s;
    const n = IDENT.has(field) ? { text: s, left: nameRefs(s) } : scrubNames(s);
    if (n.left.some(unambiguous)) { enrich.push(`facts.${field} names ${n.left.map(h => JSON.stringify(h)).join(", ")}, an internal name a board never shows: not written`); return null; }
    if (n.left.length) { enrich.push(`facts.${field} names ${n.left.map(h => JSON.stringify(h)).join(", ")}: written as it is; reword it if it names the pipeline's role rather than the code's`); return n.text; }
    enrich.push(`facts.${field} named an internal name, which a board never shows: written reworded (${shortJ(n.text)})`);
    return n.text;
  };
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
    /* a tracking board filing its units, then creating their boards: each unit row not done in the step glows on its own (lib.js filingGlow()) */
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
    if (step === "remediation" && !tracking && g.length === 1 && g[0] === "built") enrich.push("the rows the qa findings touch are not known from the facts: the whole As built column glows until the presenter names them");
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
    const said = txt(facts.stage, "stage"), pass = R.pass != null ? `qa pass ${R.pass}` : "the qa pass";
    const names = curs.map(x => x.name).join(curs.length > 1 ? " | " : "");
    const what = said || [dn.length ? `${plural(dn.length, "sub-step")} done` : null, curs.length === 1 ? `${names} current` : curs.length ? `${curs.length} sub-steps current in parallel: ${names}` : ss.length ? "every sub-step done" : null].filter(Boolean).join("; ") || null;
    note = note || (said || [dn.length ? `${dn.length} of ${ss.length} remediation sub-steps done` : null, curs.length === 1 ? "the next current" : curs.length ? `${curs.length} current in parallel` : null].filter(Boolean).join("; ") || `remediation for ${pass}`);
    detail = detail || `Remediation for ${pass}${curs.length === 1 ? ": " + names : what ? ": " + what : ""}.`;
    /* a facts.stage that names the pass itself ("qa pass 1 fixes done; …") stands alone, after "Remediation:" */
    trail = { column: "built", label: said && /\bqa pass\b/i.test(said) ? `Remediation: ${said}` : `Remediation for ${pass}${what ? ": " + what : ""}` };
  };

  switch (ev) {
    case "sized": {
      const step = facts.step || (w.step === "sizing" || !w.step ? null : stopped(w.step) ? w.resume : w.step);
      if (!step || !["interview", "research", "plan", "architecture"].includes(step)) refuse(`sized names no step to start at (facts.step: interview, research or plan; got ${JSON.stringify(facts.step || null)})`);
      if (stopped(w.step)) { w.resume = null; w.waitingOn = null; }
      /* the run's start, kept once: the plan phase's first bound on the Timeline tile (plan/RULES.md §2, "The KPI tiles") */
      if (!lib.okStamp(plan.sized)) { plan.sized = now; applied.push(`sized ${now}`); }
      setStep(step); setGlow(step);
      if (step === "plan" && !w.plan) { w.plan = plan.parent ? { state: "re-pass", from: "parent", since: now } : { state: "writing", since: now }; applied.push(`wip.plan ${w.plan.state}`); }
      enrich.push("sized: the foundation and, for a sub-issue of a signed-off tracking plan, the Gap and Considered columns come from the documents");
      detail = detail || `Sized; ${STEP_WORDS[step]} starts.`;
      trail = { column: "gap", label: `Sized; ${STEP_WORDS[step]} starts` };
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
      if (Array.isArray(facts.questions) && (resume === "interview" || facts.step === "interview")) {
        w.interview = Array.isArray(w.interview) ? w.interview : [];
        facts.questions.forEach((q, i) => {
          const text = txt(q && typeof q === "object" ? q.text : q, `questions[${i}].text`); if (!text || w.interview.some(x => x && x.text === text)) return;
          const options = q && Array.isArray(q.options) ? q.options.map((o, j) => txt(o, `questions[${i}].options[${j}]`)).filter(Boolean) : [];
          w.interview.push({ text, ...(options.length ? { options } : {}), answer: null, asked: now }); applied.push(`wip.interview + "${text.slice(0, 40)}"`);
        });
      }
      detail = detail || `Waiting on the user: ${waiting}`;
      trail = { column: STEP_COLUMN[resume] || "built", label: `Halted at ${STEP_WORDS[resume] || resume}: waiting on the user (${waiting})` };
      break;
    }
    case "resumed": {
      /* the step to return to: the facts', else the one the halt recorded; once resumed (the same event again), the step it is at */
      const step = facts.step || w.resume || (!stopped(w.step) && w.event && w.event.name === "resumed" ? w.step : null);
      if (!step || !STEPS.includes(step) || stopped(step)) refuse(`resumed names no step to return to (facts.step, or the board's wip.resume; got ${JSON.stringify(step || null)})`);
      w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared");
      setStep(step); setGlow(step);
      if (step === "interview" && (w.interview || []).some(q => q && q.answer == null)) enrich.push("resumed: the interview's answers are recorded from the user's reply");
      detail = detail || `Resumed at ${STEP_WORDS[step] || step}.`;
      trail = { column: STEP_COLUMN[step] || "built", label: `Resumed at ${STEP_WORDS[step] || step}` };
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
      if (step === "plan" && (!w.plan || w.plan.state !== "writing")) { w.plan = { state: "writing", since: now }; applied.push("wip.plan writing"); }
      setGlow(step);
      enrich.push("researched: the Gap column and its milestone come from research/README.md and the findings");
      detail = detail || `Research verified; ${STEP_WORDS[step]} next.`;
      trail = { column: "gap", label: `Research verified; ${STEP_WORDS[step]} next`, ref: docRef("research/README.md") };
      break;
    }
    case "architecture-signed-off": {
      if ((w.questions || []).length || w.research) applied.push("wip.questions and wip.research cleared");
      w.questions = []; w.research = null;
      /* a tracking board's own steps after its architecture: the units filed as sub-issues, then their boards, then the plan's landing */
      const next = tracking ? "sub-issues" : "landing";
      if (tracking) withUnitSteps(w, applied);
      setStep(next); setGlow(next);
      if (tracking && rows.some(r => r.unit)) { const nx = lib.nextUnit(plan), id = nx ? nx.id : null; if (w.next !== id) { w.next = id; applied.push(`wip.next ${id}`); } }
      enrich.push("architecture-signed-off: the Considered column and, on a tracking board, the unit rows come from architecture.md");
      detail = detail || (tracking ? "Architecture signed off; its units are filed as sub-issues next." : "Architecture signed off; the plan lands next.");
      trail = { column: "considered", label: "Architecture signed off", ref: docRef("architecture.md") };
      break;
    }
    /* team-raised (plan/RULES.md §4; admin-team/dashboards-skill/28): the units filed as sub-issues, then their boards created, each event
       per unit (facts.units [{unit: <row id>, issue: n}], one or more at a time) and a final one closing the step (facts.final: true). The
       glow is the units not yet done in the step (lib.js filingGlow()), so each unit stops glowing as its issue (its board) is recorded; the
       counts are read from the rows. The final event moves the step on once every unit is done; one that comes too early leaves it. */
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
      const next = final && all ? "boards" : w.step === "boards" && all ? "boards" : "sub-issues";
      setStep(next); setGlow(next);
      detail = detail || `${filed} of ${plural(units.length, "unit")} filed as sub-issues${next === "boards" ? "; their boards are created next" : ""}.`;
      trail = { column: "considered", label: `${filed} of ${plural(units.length, "unit")} filed as sub-issues${final && next === "boards" ? "; filing done" : ""}` };
      /* the final event is recorded as such, so one that comes too early is not taken for the last per-unit event again (a duplicate) */
      if (final) note = note || (next === "boards" ? "final: filing done" : `final, too early: ${units.length - filed} of ${plural(units.length, "unit")} with no issue yet`);
      break;
    }
    case "boards-created": {
      if (!tracking) refuse("boards-created is a tracking board's event");
      lib.linkSubIssueBoards(plan, DIR).forEach(x => applied.push(x));
      const units = rows.filter(r => r && r.unit), made = units.filter(lib.unitBoarded).length, final = facts.final === true, all = units.length > 0 && made === units.length;
      withUnitSteps(w, applied);
      const next = final && all ? "landing" : w.step === "landing" && all ? "landing" : "boards";
      setStep(next); setGlow(next);
      if (made < units.length) enrich.push(`${units.length - made} of the units' boards are not in the tree yet${final ? ": the step stays at boards" : ""}`);
      detail = detail || `${made} of ${plural(units.length, "unit board")} created${next === "landing" ? "; the tracking plan lands next" : ""}.`;
      trail = { column: "considered", label: `${made} of ${plural(units.length, "unit board")} created${final && next === "landing" ? "; boards done" : ""}` };
      if (final) note = note || (next === "landing" ? "final: every unit's board created" : `final, too early: ${units.length - made} of ${plural(units.length, "unit")} with no board yet`);
      break;
    }
    case "plan-accepted": {
      if ((w.questions || []).length || w.research || w.plan) applied.push("wip.questions, wip.research and wip.plan cleared");
      w.questions = []; w.research = null; w.plan = null;
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
      mergeStages(w, facts, applied, enrich, true);
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
      /* During remediation (facts.remediation, or facts.step "remediation") the report answers a qa pass: its sub-steps are written
         whether or not the facts also carry the stages (which are then merged too, every one done), and the wording follows the
         remediation, facts.stage first, never "qa next". */
      const remed = !!facts.remediation || facts.step === "remediation";
      if (facts.remediation) setRemediation(w, facts.remediation, applied, enrich, txt);
      if (remed && !Array.isArray(facts.stages)) {
        const step = facts.step && STEPS.includes(facts.step) ? facts.step : "remediation";
        setStep(step); setGlow(step);
        remediationWording();
        break;
      }
      const before = JSON.parse(JSON.stringify(w.stages || []));
      mergeStages(w, facts, applied, enrich, false);
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
      const allDone = st.length > 0 && st.every(x => x.state === "done");
      const step = facts.step && STEPS.includes(facts.step) ? facts.step : remed ? "remediation" : allDone ? "qa" : "implementation";
      setStep(step); setGlow(step);
      if (remed) { remediationWording(); break; }
      /* the wording comes from the facts alone, never from what changed, so the same event twice writes the same board: the stage
         reported is facts.stage when it names a done stage, else the last done stage before the current one */
      const c = curStage(), ci = c ? st.indexOf(c) : st.length;
      const rep = st.find(x => x.id === facts.stage && x.state === "done") || st.slice(0, ci).reverse().find(x => x.state === "done") || null;
      note = note || [rep ? `${rep.id} reported done` : null, c ? `${c.id} current` : allDone ? "qa next" : null].filter(Boolean).join("; ") || null;
      detail = detail || (c ? `Implementation at ${c.id} of ${st.length}${rep ? `: ${rep.id} is done` : ""}; ${c.id} takes ${c.name}.` : allDone ? `Implementation done, ${plural(st.length, "stage")}; qa next.` : "Implementation.");
      trail = { column: "built", label: c ? `${rep ? rep.id + " done; " : ""}${c.id} current: ${c.name}` : allDone ? `Implementation done (${plural(st.length, "stage")}); qa next` : "Implementation stage reported" };
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
      const entry = { pass: Q.pass, verdict, date: today, at: now, findings, ...(Object.keys(severity).length ? { severity } : {}), ...(verdict === "changes-requested" && route ? { route } : {}) };
      const qn = txt(Q.note, "qa.note"); if (qn) entry.note = qn;
      w.qa = Array.isArray(w.qa) ? w.qa : []; const k = w.qa.findIndex(x => x && x.pass === Q.pass);
      /* the pass's test report (facts.qa.report, build/reports/tests/index.html; admin-team/dashboards-skill/35): a build output, never
         committed, so recorded as plain text (its path from the repository root), and copied once, when the pass returns, under the
         git-ignored docs/plans/.live/open/ for the live view to link (reportCopy); a pass recorded before keeps its copy */
      const had = k >= 0 ? w.qa[k] : null;
      if (typeof Q.report === "string" && Q.report.trim()) { const rp = openRefLocal(Q.report.trim().replace(/\\/g, "/")).replace(/^\.\//, "");
        if (!/^`/.test(rp)) { entry.report = rp; const cp0 = had && had.report === rp && had.reportCopy ? had.reportCopy : openCopyFor(rp, `qa pass ${Q.pass} test report`, plan.folder); if (cp0) entry.reportCopy = cp0; } }
      if (k < 0) w.qa.push(entry); else w.qa[k] = { ...(w.qa[k] && w.qa[k].note && !entry.note ? { note: w.qa[k].note } : {}), ...entry };
      w.qa.sort((a, b) => a.pass - b.pass); applied.push(`wip.qa pass ${Q.pass} ${verdict}`);
      /* an open point the qa report raises (or settles) is kept as at an implementation stage (plan/RULES.md §3, wip.open) */
      if (Array.isArray(facts.open)) mergeOpen(w, facts, applied, txt, `qa pass ${Q.pass}`, resolved, plan.folder, DIR, enrich);
      if (w.qaMax !== 3 && !Number.isInteger(w.qaMax)) w.qaMax = 3;
      const counts = [...Object.entries(findings).filter(([, n]) => n).map(([k2, n]) => `${n} ${k2}`), ...Object.entries(severity).filter(([, n]) => n).map(([k2, n]) => `${n} ${k2}`)].join(", ");
      const anyFinding = Object.values(findings).some(n => n > 0);
      if (verdict === "approved") {
        if (w.remediation) applied.push("wip.remediation cleared"); w.remediation = null;
        /* the Document step follows an approving pass (dashboards-skill/35); a board on the older line goes to its landing */
        const after = Array.isArray(w.steps) && w.steps.length && !w.steps.includes("document") ? "landing" : "document";
        const step = facts.step && STEPS.includes(facts.step) ? facts.step : after; setStep(step); setGlow(step);
        if (anyFinding) enrich.push("qa-pass: the approving pass's findings detail comes from the qa report");
        detail = detail || `QA pass ${Q.pass} approved; ${step === "document" ? "the Document step follows" : "the landing follows"}.`;
        if (plan.parent) parentOp = { kind: "complete" };
      } else if (verdict === "changes-requested") {
        setRemediation(w, { pass: Q.pass, ...(facts.remediation || {}), route }, applied, enrich, txt);
        if (route === "re-plan-then-remediation") { w.plan = { state: "re-pass", from: "qa", pass: Q.pass, since: now }; applied.push(`wip.plan re-pass after qa pass ${Q.pass}`); }
        const step = facts.step && STEPS.includes(facts.step) ? facts.step : "remediation"; setStep(step); setGlow(step);
        enrich.push("qa-pass: the findings detail (the rows they touch, the pass's note) comes from the qa report");
        detail = detail || `QA pass ${Q.pass}: changes requested${counts ? " (" + counts + ")" : ""}${route ? "; " + ROUTE_WORDS[route] : ""}.`;
      } else { setStep("qa"); setGlow("qa"); detail = detail || `QA pass ${Q.pass} running.`; }
      note = note || `pass ${Q.pass}: ${verdict}`;
      trail = { column: "built", label: `QA pass ${Q.pass}: ${verdict === "changes-requested" ? "changes requested" : verdict}${counts ? " (" + counts + ")" : ""}` };
      break;
    }
    case "escalated": {
      const resume = stopped(w.step) ? w.resume : w.step;
      if (!resume || stopped(resume)) refuse("escalated: the board records no step it escalated from");
      if (w.resume !== resume) { w.resume = resume; applied.push(`wip.resume ${resume}`); }
      setStep("escalated");
      if (Number.isInteger(facts.proposedLevel) && facts.proposedLevel >= 1 && facts.proposedLevel <= 4) { w.proposedLevel = facts.proposedLevel; applied.push("wip.proposedLevel (data only)"); }
      w.waitingOn = txt(facts.waitingOn, "waitingOn") || "A re-sizing of the issue.";
      enrich.push("escalated: the board follows the issue's new sizing");
      detail = detail || "Escalated: waiting on a re-sizing.";
      trail = { column: STEP_COLUMN[resume] || "built", label: `Escalated at ${STEP_WORDS[resume] || resume}: waiting on a re-sizing` };
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
    /* team-raised (plan/RULES.md §4), the landing in three steps (admin-team/dashboards-skill/34): "landing", the land accepted, the branch
       brought up to date and the code, the version bump and the reconciled documents committed on it; "state-boards", the pre-merge refresh
       of the state boards on the branch, stamped at its head, and its board commit; "merge", the pull request merged. "landed" is applied
       after the merge (the post-merge refresh shows it in the live view; the next landing commits it). Each records its visit's time: the
       step's since, and the step before frozen with its end (wip.history). */
    /* The Document step (admin-team/dashboards-skill/35), between qa (or remediation) and the land: facts.tasks [{id, name, state}], ids
       documentation-review, reconcile-documentation, dokka-check, reconcile-plan, readme-changelog and state-boards, states done | current |
       todo, merged by id into wip.document.tasks (a task the event leaves out keeps its state; several may be current: the tasks may run in
       parallel). The admin team raises the state-boards task itself when it accepts the run's state-boards request: a "state-boards" event
       on a board in this flow is that task, current (below). Applied whole on the fast path: the step, the tasks, the glow, the detail and the
       trail entry; nothing needs the documents. */
    case "document": {
      if (["built", "abandoned"].includes(plan.status) || ["landed", "cancelled"].includes(w.step)) refuse(`document: the board has ${plan.status === "abandoned" || w.step === "cancelled" ? "been cancelled" : "landed"} already`);
      if (stopped(w.step)) { w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared"); }
      if (Array.isArray(w.steps) && !w.steps.includes("document")) { const ls = lib.documentSteps(w.steps, null); if (ls !== w.steps && ls.includes("document")) { w.steps = ls; applied.push("wip.steps: the Document step before the landing, merge after it"); } }
      mergeTasks(w, facts.tasks, applied, enrich, txt);
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
        mergeTasks(w, given ? t0 : [...t0, { id: "state-boards", state: facts.done === true ? "done" : "current" }], applied, enrich, txt);
        setStep("document"); setGlow("document");
        ({ note, detail, trail } = documentWording(w, note, detail, "the state boards"));
        break;
      }
      if (stopped(w.step)) { w.resume = null; w.waitingOn = null; applied.push("wip.resume and wip.waitingOn cleared"); }

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
      const A = plan.asBuilt && typeof plan.asBuilt === "object" ? plan.asBuilt : {};
      const sha = [facts.sha, facts.merge].find(s => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s)), pr = Number.isInteger(facts.pr) ? facts.pr : null;
      const next = { ...A, ...(sha ? { sha } : {}), ...(typeof facts.merge === "string" && /^[0-9a-f]{7,40}$/.test(facts.merge) ? { merge: facts.merge } : {}), ...(pr ? { pr } : {}),
        ...(txt(facts.version, "version") ? { version: txt(facts.version, "version") } : {}), date: /^\d{4}-\d{2}-\d{2}$/.test(String(facts.date || "")) ? facts.date : (A.date || today) };
      /* the merge's time and the branch's step commits, for the Timeline tile (plan/RULES.md §2, "The KPI tiles"; dashboards-skill/32):
         facts.mergedAt when given, else read from git in the worktree (lib.js gitTimes()); nothing is recorded where git cannot tell */
      const gt = lib.gitTimes(ROOT, typeof plan.folder === "string" ? plan.folder : null, next.merge || sha || null), mAt = lib.isTime(facts.mergedAt) ? facts.mergedAt : gt.at || null;
      if (mAt) next.at = mAt; if (Array.isArray(gt.commits) && gt.commits.length) next.commits = gt.commits;
      if (!next.at) enrich.push("landed: the merge's time (asBuilt.at) is not recorded: git in the worktree cannot tell it (timeline.js <folder> --from-git, or facts.mergedAt)");
      plan.asBuilt = next; applied.push("asBuilt");
      /* the board is built, and its step landed, only once every part is resolved and the merge is recorded (check.js); until the
         pre-merge refresh resolves them it stays at the landing, its merge recorded */
      /* a row's recorded state: the outcome its as-built statements derive, else its stored state (plan/RULES.md §2, "Statements") */
      const open = rows.filter(r => ["pending", ...lib.BUILDING_STATES].includes(lib.recordedState(r)));
      w.resume = null; w.waitingOn = null;
      if (next.sha && next.date && !open.length) { if (plan.status !== "built") { plan.status = "built"; applied.push("status built"); } setStep("landed"); setGlow("landed"); }
      else { const at = (Array.isArray(w.steps) && w.steps.includes("merge")) || ["merge", "state-boards"].includes(w.step) ? "merge" : "landing"; setStep(at); setGlow(at); enrich.push(open.length ? `landed: ${open.map(r => r.id).join(", ")} still to resolve before the board is built (it stays at the ${at === "merge" ? "merge" : "landing"} until then)` : "landed: asBuilt has no sha yet"); }
      enrich.push("landed: every part is resolved, the trail completed and the consequences reconciled from final-implementation.md and consequences.md (impact.md in an older folder), on the board seeded at the next run's sized or by the presenter");
      detail = detail || `Landed${pr ? " in PR #" + pr : ""}.`;
      /* the merge commit names the merge: facts.merge when given (facts.sha may be the branch's last commit), else the one sha given */
      const mergeSha = next.merge || sha;
      trail = { column: "built", label: `Landed${pr ? " in PR #" + pr : ""}${mergeSha ? ", merge " + mergeSha.slice(0, 7) : ""}`, ...(pr ? { ref: `PR #${pr}` } : {}) };
      if (plan.parent) parentOp = { kind: "landed" };
      break;
    }
    default: refuse(`unknown event ${JSON.stringify(ev)}`);
  }
  /* The Tests tab (plan/RULES.md §2, "The Tests tab"): an event that carries facts.tests has it applied (testslib.js mergeTests()); an
     implementation stage or a qa verdict without one leaves the tab to the presenter, from the branch's diff and the qa report */
  if (facts.tests != null) {
    if (tracking) enrich.push("facts.tests on a tracking board: its units' boards record the tests (the presenter writes them there)");
    else { const qp = ev === "qa-pass" && facts.qa && Number.isInteger(facts.qa.pass) ? facts.qa.pass : null;
      /* A remediation's report names no stage of plan.md: its classes take "qa pass n fixes", the pass the remediation answers, never the
         report's free-text note ("qa pass 2 fixes done; reconciliation current" is a status, not a stage) */
      const remPass = (facts.remediation || facts.step === "remediation") && w.remediation && Number.isInteger(w.remediation.pass) ? w.remediation.pass : null;
      const r = TL.mergeTests(plan, facts.tests, { now, pass: qp, stage: ev === "implementation-stage" ? reportedStage || stageIdOf(facts.stage) || (remPass ? `qa pass ${remPass} fixes` : null) || (typeof facts.stage === "string" && facts.stage.trim() ? facts.stage.trim() : null) : null, ids });
      applied.push(...r.applied); enrich.push(...r.notes.map(n => "tests: " + n)); }
  } else if (!tracking && testsDue)
    enrich.push(`the Tests tab: the event carries no facts.tests; ${ev === "qa-pass" ? "Relevant, Other and the results come from the qa report" : "Added and Amended come from the branch's diff against its base"}`);
  /* the fast path takes open points at every event (plan/RULES.md §4, "The fast path"; moved onto it in dashboards-skill/33): an
     implementation stage and a qa pass raise theirs above, any other event here, raised by the event's name */
  if (Array.isArray(facts.open) && facts.open.length && !["implementation-stage", "qa-pass"].includes(ev)) mergeOpen(w, facts, applied, txt, ev, resolved, plan.folder, DIR, enrich);
  if (detail !== w.detail) { w.detail = detail; applied.push("wip.detail"); }
  const evRec = { name: ev, at: now, ...(note ? { note } : {}) };
  w.event = evRec; w.updated = now;
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
  applied.push(...lib.freezeSteps(orig, plan, ev, now, facts));
  return { plan, applied, enrich, parentOp };
}

/* wip.stages from facts.stages ([{id, name, state}]), each keeping the rows the board records for it (plan.md's stages, written by the
   presenter); at branch-cut a list with no states starts with the first current and the rest to do. */
/* A tracking board's steps line with its two steps after the architecture (plan/RULES.md §3): inserted when a board written before them lacks them. */
function withUnitSteps(w, applied) {
  const st = Array.isArray(w.steps) ? w.steps.slice() : [];
  if (!st.length || (st.includes("sub-issues") && st.includes("boards"))) return;
  const at = st.indexOf("architecture"); if (at < 0) return;
  st.splice(at + 1, 0, ...["sub-issues", "boards"].filter(s => !st.includes(s))); w.steps = st; applied.push("wip.steps: sub-issues and boards after the architecture");
}
function mergeStages(w, facts, applied, enrich, first) {
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
    return { id: s.id, name, state, rows: Array.isArray(old.rows) ? old.rows : [] };
  });
  if (out.filter(x => x.state === "current").length > 1) refuse("facts.stages names more than one current stage");
  const norows = out.filter(x => !have.some(y => y && y.id === x.id)).map(x => x.id);
  if (norows.length) enrich.push(`the rows stage${norows.length > 1 ? "s" : ""} ${norows.join(", ")} touch come from plan.md`);
  if (JSON.stringify(out) !== JSON.stringify(have)) { w.stages = out; applied.push(`wip.stages ${out.map(x => x.id + " " + x.state).join(", ")}`); }
}
/* wip.document from the facts (admin-team/dashboards-skill/35): {tasks: [{id, name, state}]}, merged by id: a task the event names takes
   its state (and its name, when given; else the name it has, else lib.js DOC_TASK_NAMES), a task it leaves out keeps its own, a new one is
   added in the order lib.js DOC_TASKS gives (another id after them, as given). Several may be current: the tasks may run in parallel. A task
   with no id, or whose state is not done, current or todo, is refused, as a stage's is. */
function mergeTasks(w, list, applied, enrich, txt) {
  const have = w.document && typeof w.document === "object" && Array.isArray(w.document.tasks) ? w.document.tasks.filter(x => x && typeof x === "object") : [];
  const out = have.map(x => ({ ...x }));
  (Array.isArray(list) ? list : []).forEach((t, i) => {
    const id = t && typeof t.id === "string" ? t.id.trim() : "";
    if (!ID.test(id)) refuse(`facts.tasks[${i}] has no id (a kebab-case task id, such as documentation-review)`);
    if (!SSTATES.includes(t.state)) refuse(`facts.tasks[${i}].state ${JSON.stringify(t.state)} is not done, current or todo`);
    const name = txt(t.name, `tasks[${i}].name`), x = out.find(y => y.id === id);
    if (x) { x.state = t.state; if (name) x.name = name; }
    else { const nm = name || lib.DOC_TASK_NAMES[id]; if (!nm) { enrich.push(`facts.tasks[${i}] (${id}) is no task of the Document step the board knows and carries no name: written with its id as its name`); }
      out.push({ id, name: nm || id, state: t.state }); }
  });
  const rank = id => { const k = lib.DOC_TASKS.findIndex(([d]) => d === id); return k < 0 ? lib.DOC_TASKS.length : k; };
  out.sort((a, b) => rank(a.id) - rank(b.id));
  if (!out.length) enrich.push("document carries no facts.tasks: the step panel lists none until the tasks are reported");
  const next = { tasks: out };
  if (JSON.stringify(next) !== JSON.stringify(w.document || null)) { w.document = next; applied.push(`wip.document ${out.map(x => x.id + " " + x.state).join(", ") || "(no tasks)"}`); }
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
    let s = raw.replace(/\s+/g, " ").trim(); levelRefs(s).forEach(h => { s = s.split(h).join("…"); }); s = scrubNames(s).text; nameRefs(s).forEach(h => { s = s.split(h).join("…"); }); return s; };
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
      row.asBuilt = { ...(row.asBuilt || {}), state: "complete", ...(had ? {} : { summary: `#${sub.issue}'s run passed qa; it is not merged yet.` }) };
      applied.push(`#${plan.issue}: ${row.id} complete`);
      if (had) enrich.push(`#${plan.issue}: ${row.id}'s summary, now complete, comes from #${sub.issue}'s board`);
    }
  } else if (op.kind === "landed") {
    /* a landed unit says what exists (check.js): with no summary yet, or only the plain fact its qa pass wrote, the plain fact of its
       landing from the sub-issue's asBuilt; a summary written from the documents is the presenter's to update */
    const A = (sub && sub.asBuilt) || {}, m = A.merge || A.sha, s0 = row.asBuilt && typeof row.asBuilt.summary === "string" ? row.asBuilt.summary.trim() : "";
    const had = s0 && s0 !== `#${sub.issue}'s run passed qa; it is not merged yet.`;
    if (state !== "landed" || !had) { row.asBuilt = { ...(row.asBuilt || {}), state: "landed", ...(had ? {} : { summary: `#${sub.issue} landed${A.pr ? ` through PR #${A.pr}` : ""}${m ? ` as ${String(m).slice(0, 7)}` : ""}.` }) }; applied.push(`#${plan.issue}: ${row.id} landed${had ? "" : ", with the plain fact of its landing as its summary"}`); }
    if (cur.includes(cell)) { w.current = cur.filter(a => a !== cell); applied.push(`#${plan.issue}: ${row.id} out of wip.current`); }
    enrich.push(`#${plan.issue}: the landed unit's summary, its impact entry and its effect on the initiative's impact come from the sub-issue's board and documents`);
  }
  const nx = lib.nextUnit(plan), id = nx ? nx.id : null;
  if (w.next !== id) { w.next = id; applied.push(`#${plan.issue}: wip.next ${id}`); }
  const d = chainDetail(plan); if (w.detail !== d) { w.detail = d; applied.push(`#${plan.issue}: wip.detail`); }
  /* the tracking board's own step the unit's start ended (its plan's landing), frozen as any board's (plan/RULES.md §3, "Finished steps") */
  lib.freezeSteps(orig, plan, op.kind === "start" ? "sized" : op.kind === "landed" ? "landed" : "qa-pass", now, null).forEach(x => applied.push(`#${plan.issue}: ${x}`));
  if (applied.length) {
    w.updated = now;
    const words = { start: "started", complete: "complete: qa passed", landed: "landed" }[op.kind];
    const t = { date: now.slice(0, 10), column: "built", label: `#${sub.issue} ${words}` };
    plan.trail = Array.isArray(plan.trail) ? plan.trail : [];
    if (!plan.trail.some(x => x && x.date === t.date && x.column === t.column && x.label === t.label)) plan.trail.push(t);
  }
  return { plan, applied, enrich };
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
function pageBase(pagePath, enrich, rel, tplOf) {
  const html = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, "utf8") : null, tplPath = dev.templateFor(tplOf || pagePath, "plan-board"), tpl = fs.readFileSync(tplPath, "utf8");
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
  lib.setViewLinks(VIEWING); try { lib.resolveBoard(data, dir); } finally { lib.setViewLinks(false); }
  const json = (JSON.stringify(data, null, 2) + "\n").replace(/\n/g, eol);
  const base = pageBase(fs.existsSync(path.join(to, "dashboard.html")) ? path.join(to, "dashboard.html") : path.join(dir, "dashboard.html"), enrich, rel, path.join(dir, "dashboard.html"));
  if (base.rerendered) S.rerendered.push(rel);
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
   (lib.js planStamp()) whose merge (asBuilt.merge, else sha) is in the worktree's history (git merge-base --is-ancestor), and a copy with no
   merge of its own (a tracking board) with a seeded copy inside its folder, is written over the tracked board (plan.json, dashboard.html,
   plan.js; its links resolved from the tracked folder, never into .live/). A landed sub-issue seeded without its tracking board's copy
   marks its unit landed on the tracked tracking board by the standing rule (applyParent()): a merge that marks an issue landed on its own
   board does so for its parent too, and both are seeded together. Nothing is seeded in the main checkout itself, or from a copy whose merge
   the branch does not hold. Returns the tracked folders written. */
function seedFromView(now) {
  if (!MAIN || path.resolve(MAIN) === path.resolve(ROOT)) return [];
  const vroot = path.join(MAIN, ...lib.VIEW); if (!fs.existsSync(vroot)) return [];
  const read = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; } };
  const dirs = []; const walk = d => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } if (fs.existsSync(path.join(d, "plan.json"))) dirs.push(d); es.filter(e => e.isDirectory()).forEach(e => walk(path.join(d, e.name))); };
  walk(vroot);
  const inHead = sha => cp.spawnSync("git", ["-C", ROOT, "merge-base", "--is-ancestor", sha, "HEAD"], { encoding: "utf8", windowsHide: true }).status === 0;
  const cand = dirs.map(vd => { const rel = path.relative(vroot, vd).split(path.sep).join("/"), tracked = path.join(ROOT, "docs", "plans", ...rel.split("/"));
    return { vd, rel, tracked, vp: read(path.join(vd, "plan.json")), tp: read(path.join(tracked, "plan.json")) }; })
    .filter(x => x.rel && x.vp && x.tp && x.vp.issue === x.tp.issue && path.resolve(x.tracked) !== path.resolve(DIR) && String(lib.planStamp(x.vp)) > String(lib.planStamp(x.tp)));
  const mergeOf = p => { const A = (p && p.asBuilt) || {}, m = [A.merge, A.sha].find(s => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s)); return m || null; };
  const ok = cand.filter(x => mergeOf(x.vp) && inHead(mergeOf(x.vp)));
  cand.filter(x => !ok.includes(x) && !mergeOf(x.vp) && ok.some(y => y.rel.startsWith(x.rel + "/"))).forEach(x => ok.push(x));
  cand.filter(x => !ok.includes(x)).forEach(x => S.applied.push(`not seeded: ${x.rel} (${mergeOf(x.vp) ? "its merge is not in this branch's history" : "no landing inside it seeded"})`));
  const out = [];
  ok.sort((a, b) => a.rel.split("/").length - b.rel.split("/").length).forEach(x => {
    const text = fs.readFileSync(path.join(x.tracked, "plan.json"), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n";
    writeBoard(x.tracked, x.vp, eol, S.enrich, `seeded ${x.rel}`); out.push(x.tracked); S.seeded.push(`docs/plans/${x.rel}`);
  });
  /* the parent of a landed sub-issue seeded alone: its unit landed by the standing rule */
  ok.filter(x => x.vp.status === "built" && x.vp.parent && Number.isInteger(x.vp.parent.issue)).forEach(x => {
    const up = path.dirname(x.tracked); if (out.includes(up) || !fs.existsSync(path.join(up, "plan.json"))) return;
    const text = fs.readFileSync(path.join(up, "plan.json"), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n"; let pp; try { pp = JSON.parse(text); } catch (e) { return; }
    if (pp.issue !== x.vp.parent.issue || pp.kind !== "tracking") return;
    const P = applyParent(pp, x.vp, { kind: "landed" }, now); S.applied.push(...P.applied.map(a => `seeded: ${a}`)); S.enrich.push(...P.enrich);
    if (P.applied.length) { writeBoard(up, P.plan, eol, S.enrich, `seeded ${path.relative(path.join(ROOT, "docs", "plans"), up).split(path.sep).join("/")}`); out.push(up); S.seeded.push(path.relative(ROOT, up).split(path.sep).join("/") + " (its unit landed)"); }
  });
  if (out.length) S.applied.push(`seeded ${out.length} board${out.length === 1 ? "" : "s"} from the live view (the previous landing's state)`);
  return out;
}
/* A child process, as a promise of { status, stdout, stderr }. */
const run = (file, a, cwd) => new Promise(res => { const c = cp.spawn(process.execPath, [file, ...a], { cwd, windowsHide: true }); let o = "", e = "";
  c.stdout.on("data", d => { o += d; }); c.stderr.on("data", d => { e += d; }); c.on("close", s => res({ status: s, stdout: o, stderr: e })); c.on("error", x => res({ status: 1, stdout: o, stderr: String(x) })); });

let DIR = null, ROOT = null, MAIN = null;
const VIEWING = flag("view");
/* the board's data where --view reads it: its view copy when one is fresher than the tracked board, else the tracked plan.json */
const viewRead = dir => { const v = VIEWING ? lib.viewOf(dir, MAIN) : null; return v && v.fresh ? path.join(v.dir, "plan.json") : path.join(dir, "plan.json"); };
/* --repo takes the GitHub slug, owner/repo; a path to the repository's main checkout is accepted too and read as --main (the
   protocol's "repo" field is that path, its "github" field the slug). Anything else is a usage error. */
const REPO_ARG = opt("repo"), REPO_SLUG = REPO_ARG && /^[\w.-]+\/[\w.-]+$/.test(REPO_ARG) && !fs.existsSync(path.resolve(REPO_ARG)) ? REPO_ARG : null;
const REPO_PATH = REPO_ARG && !REPO_SLUG && fs.existsSync(REPO_ARG) && fs.statSync(REPO_ARG).isDirectory() ? REPO_ARG : null;
if (REPO_ARG && !REPO_SLUG && !REPO_PATH) { console.error(`${USAGE}\n(--repo takes the GitHub slug owner/repo, e.g. SpartanLaboratories/WebTools, or the path of the repository's main checkout; got ${JSON.stringify(REPO_ARG)})`); process.exit(2); }
if (REPO_PATH && opt("main") && path.resolve(opt("main")) !== path.resolve(REPO_PATH)) { console.error(`${USAGE}\n(--repo ${REPO_PATH} is a path, read as the main checkout, but --main names another: ${opt("main")})`); process.exit(2); }
async function main() {
  const evFile = opt("event"), wt = opt("worktree");
  if (!evFile || !wt) { console.error(`${USAGE}\n(--event and --worktree are required)`); process.exit(2); }
  const req = readRequest(evFile), facts = req.facts && typeof req.facts === "object" ? req.facts : {};
  if (req.action && req.action !== "plan-board") refuse(`the request's action is ${JSON.stringify(req.action)}, not plan-board`);
  const ev = req.event || facts.event; S.event = ev || null;
  if (!lib.EVENTS.includes(ev)) refuse(`the request names no plan-board event (got ${JSON.stringify(ev || null)}; one of ${lib.EVENTS.join(", ")})`);
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
  if (!fs.existsSync(planFile)) {
    if (ev !== "sized") refuse(`${folder} holds no plan.json: there is no board to apply ${ev} to`);
    S.result = "no-board"; S.issue = req.issue || null; S.enrich.push("sized: no board yet; the presenter lays the foundation (new.js) from the documents"); return;
  }
  const text = fs.readFileSync(viewRead(DIR), "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n";
  let orig; try { orig = JSON.parse(text); } catch (e) { refuse(`${folder}/plan.json does not parse: ${e.message}`); }
  S.issue = orig.issue;
  if (req.issue != null && req.issue !== orig.issue) refuse(`the request names issue #${req.issue}, the board is #${orig.issue}'s`);
  const repo = REPO_SLUG || req.github || null;
  if (REPO_SLUG && req.github && REPO_SLUG !== req.github) refuse(`--repo ${REPO_SLUG} is not the request's github ${req.github}`);
  if (repo && orig.repo && repo !== orig.repo) refuse(`the board is ${orig.repo}'s, not ${repo}'s`);

  /* the same event twice changes nothing: applied again at its own recorded time, it gives the board it left */
  const last = (orig.wip || {}).event;
  if (last && last.name === ev && last.at) {
    const again = applyEvent(orig, ev, facts, req, last.at), a = JSON.parse(JSON.stringify(again.plan)), b = JSON.parse(JSON.stringify(orig));
    a.wip.updated = b.wip.updated = null;
    if (JSON.stringify(a) === JSON.stringify(b)) { S.result = "duplicate"; S.applied.push(`already applied at ${last.at}: nothing written`); return; }
  }
  /* seeding at sized (plan/RULES.md §4, "Seeding at sized"; admin-team/dashboards-skill/35): a run sized in a worktree branched after a
     landing starts from the landed state the main checkout's live view shows, so the branch carries it from its first commit */
  const seeded = ev === "sized" && !VIEWING ? seedFromView(now) : [];
  const R = applyEvent(orig, ev, facts, req, now);
  S.applied.push(...R.applied); S.enrich.push(...R.enrich);

  {
    writeBoard(DIR, R.plan, eol, S.enrich, "board");
    /* the parent tracking board: the standing rule's move, then a re-embed that mirrors this unit's run (lib.js mirrorUnitRuns) */
    const up = lib.parentFolder(DIR, R.plan);
    if (up && fs.existsSync(path.join(up, "dashboard.html"))) {
      const ptext = fs.readFileSync(viewRead(up), "utf8"), peol = /\r\n/.test(ptext) ? "\r\n" : "\n";
      let pplan; try { pplan = JSON.parse(ptext); } catch (e) { throw new Error(`the parent tracking board's plan.json does not parse: ${e.message}`); }
      if (R.parentOp) { const P = applyParent(pplan, R.plan, R.parentOp, now); pplan = P.plan; S.applied.push(...P.applied); S.enrich.push(...P.enrich); }
      const prel = path.relative(ROOT, up).split(path.sep).join("/");
      S.parent = `${prel} (${writeBoard(up, pplan, peol, S.enrich, "parent") ? "re-embedded" : "unchanged"})`;
      /* with --view, the issue's copy once more, now that its parent's copy exists for its link to open (lib.js viewLink()) */
      if (VIEWING) writeBoard(DIR, R.plan, eol, [], "board");
    } else if (R.plan.parent && R.parentOp) S.enrich.push(`the parent tracking board #${R.plan.parent.issue} is not in the enclosing folder: the standing rule is the presenter's`);

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
    let liveRun = null, liveDir = null;
    const main = path.resolve(opt("main") || REPO_PATH || req.repo || ROOT);
    if (flag("no-live")) S.live = "skipped (--no-live)";
    else if (!fs.existsSync(path.join(main, "docs", "plans"))) { S.live = `skipped (${main} has no docs/plans/)`; S.enrich.push("the live repository work board: the main checkout was not found"); }
    else {
      liveDir = path.join(main, "docs", "plans", ".live");
      if (!fs.existsSync(liveDir)) { fs.mkdirSync(liveDir, { recursive: true }); madeDirs.push(liveDir); }
      ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(liveDir, f)));
      const ex = path.join(main, ".git", "info", "exclude");
      if (fs.existsSync(path.join(main, ".git")) && fs.statSync(path.join(main, ".git")).isDirectory() && !(fs.existsSync(ex) && /^\/?docs\/plans\/\.live\/?\s*$/m.test(fs.readFileSync(ex, "utf8"))))
        S.enrich.push("docs/plans/.live/ is not in the main checkout's .git/info/exclude: the presenter adds the line");
      liveRun = run(path.join(__dirname, "board.js"), ["--live", "--refresh-template", "--root", main, ...(flag("no-gh") ? ["--no-gh"] : [])], main);
    }
    const [cks, lv, sks, wb] = await Promise.all([Promise.all(checks), liveRun, Promise.all(seededChecks), wbRun]);
    const warns = cks.map(c => (c.stdout.match(/^warn/gm) || []).length), fails = cks.flatMap(c => c.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)));
    /* no open point is committed open (dashboards-skill/35): at the landing every open point is resolved, and check.js fails a board at the
       land with one still open; the summary says what to do */
    if (fails.some(l => /OPEN POINT AT THE LAND/.test(l))) S.enrich.push("an open point is still open at the land: resolve it (facts.open, each with resolved) and raise the event again; nothing is committed open");
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
    S.result = "ok";
  }
}

main().then(() => { say(); process.exit(0); }, e => {
  S.result = "failed"; S.error = e.message;
  try { S.restored = rollback(); } catch (x) { S.error += `; the rollback failed too: ${x.message}`; }
  if (!S.enrich.includes("the event was not applied: the presenter applies it")) S.enrich.unshift("the event was not applied: the presenter applies it");
  say(); process.exit(1);
});
