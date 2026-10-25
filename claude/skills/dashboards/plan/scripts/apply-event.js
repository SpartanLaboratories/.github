#!/usr/bin/env node
// The fast path for a plan-board event (plan/RULES.md §4, "The fast path"): applies what the event's facts alone decide to the board,
// deterministically and with no reasoning, so the admin team can run it itself in well under five seconds; what needs the folder's
// documents is left to the presenter, who enriches the board afterwards (the summary's "enrich" line says whether, and why).
//   node apply-event.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--main <checkout>] [--at <ISO time>]
//                       [--no-live] [--no-gh] [--json]
// --event      the admin-team protocol's plan-board request (action, event, folder, facts; the message's fenced json block, or the
//              JSON alone)
// --worktree   the worktree the issue's board lives in; the board is <worktree>/<folder>
// --repo       the GitHub slug, owner/repo; held to the request's github and the board's repo. A path to the main checkout is
//              accepted too, read as --main
// --main       the repository's main checkout, where the live work board lives (default: the request's repo, else the worktree)
// --at         the event's time (default: facts.at, else now); every stamp the event writes takes it
// --no-live    leave the live work board alone; --no-gh builds it from the boards alone (board.js --no-gh)
// --json       print the summary as one JSON object instead of key: value lines
// What it does: reads the request and <worktree>/<folder>/plan.json; applies the event (the step, the stages and the derived as-built
// states, the research questions and phase, the glow, the halt and its resume, the open points, the qa passes, the remediation, the
// interview's questions, the detail, wip.event and wip.updated, one trail entry, the branch); re-renders the page onto the current
// template when it is not the verified template plus its data (plan/RULES.md §4, "Every event re-renders the board"); embeds the
// board (its data block and its plan.js sidecar); on a sub-issue applies the standing rule to its parent tracking board (a unit's
// start at sized, complete at an approving qa pass, landed at landed) and re-embeds it, which mirrors the unit's run; runs check.js
// (no browser pass) on every board it wrote and regenerates the live work board (board.js --live --refresh-template) at once.
// Writes only the issue's board files, its parent tracking board's files and docs/plans/.live/; never git, never a commit, never the
// committed work board. Every file is written through a temporary file and a rename, and on any failure every file it wrote is put
// back as it was: exit 1, nothing changed. Exit 0 when applied, or when the event was already applied (the same event twice changes
// nothing), or when there is no board to apply it to (sized: the presenter lays the foundation); exit 2 on a usage error.
"use strict";
const T0 = Date.now();
const fs = require("fs"), path = require("path"), cp = require("child_process");
const lib = require("./lib.js");
const dev = require(path.resolve(__dirname, "..", "..", "system", "scripts", "deviation.js"));
const { levelRefs } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));

const USAGE = "usage: node apply-event.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--main <checkout>] [--at <ISO time>] [--no-live] [--no-gh] [--json]";
const args = process.argv.slice(2);
require("../../system/scripts/cliargs.js").strict(args, { usage: USAGE, valued: ["event", "worktree", "repo", "main", "at"], flags: ["no-live", "no-gh", "json"], max: 0 });
const opt = n => lib.opt(args, n, null), flag = n => lib.flag(args, n);

/* the summary, printed at the end whatever happens */
const S = { result: null, event: null, issue: null, board: null, applied: [], enrich: [], rerendered: [], wrote: [], parent: null, live: null, check: null, error: null, restored: 0 };
const say = () => {
  S.ms = Date.now() - T0;
  const enrich = S.enrich.length ? "yes" : "no";
  if (flag("json")) { console.log(JSON.stringify({ ...S, enrich, why: S.enrich.length ? S.enrich : ["the event's facts decide everything it writes"] })); return; }
  const L = [["apply-event", S.result], ["event", S.event], ["issue", S.issue != null ? "#" + S.issue : null], ["board", S.board],
    ["applied", S.applied.join("; ") || "nothing"], ["enrich", enrich], ["why", S.enrich.length ? S.enrich.join("; ") : "the event's facts decide everything it writes"],
    ["rerendered", S.rerendered.join(", ") || "none"], ["wrote", S.wrote.join(", ") || "nothing"], ["parent", S.parent || "none"], ["live", S.live || "untouched"],
    ["check", S.check || "not run"], ["error", S.error], ["restored", S.error ? `${S.restored} file${S.restored === 1 ? "" : "s"}, as they were` : null], ["time", `${S.ms} ms`]];
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

const ID = /^[a-z0-9][a-z0-9-]*$/, STEPS = ["sizing", "interview", "research", "architecture", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed", "halted", "escalated", "cancelled"];
const ROUTES = ["on-the-spot", "rookie-dev", "planner-then-rookie-dev"], SSTATES = ["done", "current", "todo"];
/* The column a step's trail entry sits in. */
const STEP_COLUMN = { sizing: "gap", interview: "gap", research: "gap", architecture: "considered", plan: "verdict", branch: "built", implementation: "built", qa: "built", remediation: "built", landing: "built", landed: "built", cancelled: "built" };
const STEP_WORDS = { sizing: "sizing", interview: "the interview", research: "research", architecture: "the architecture", plan: "the plan", branch: "the branch", implementation: "implementation", qa: "qa", remediation: "remediation", landing: "the landing", landed: "landed" };
const ROUTE_WORDS = { "on-the-spot": "minor fixes on the spot, then landing with no new qa pass", "rookie-dev": "a remediation pass, then the next qa pass", "planner-then-rookie-dev": "a planner re-pass, then a remediation pass, then the next qa pass" };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const code = s => "`" + s + "`";

/* One event, applied to a copy of the board. Deterministic: the same board, facts and time give the same result. Returns
   { plan, applied, enrich, parentOp } — parentOp the standing rule's move on the parent tracking board, or null. */
function applyEvent(orig, ev, facts, req, now) {
  const plan = JSON.parse(JSON.stringify(orig)), applied = [], enrich = [], resolved = [], today = now.slice(0, 10);
  const w = plan.wip = plan.wip && typeof plan.wip === "object" ? plan.wip : {};
  const rows = Array.isArray(plan.rows) ? plan.rows : [], ids = new Set(rows.map(r => r && r.id)), tracking = plan.kind === "tracking";
  /* a text from the facts, as one line; a work level in it (GUIDANCE.md §4) is never written */
  const txt = (v, field) => {
    if (typeof v !== "string" || !v.trim()) return null;
    const s = v.replace(/\s+/g, " ").trim();
    if (levelRefs(s).length) { enrich.push(`facts.${field} names a work level, which a board never shows: not written`); return null; }
    return s;
  };
  const setStep = s => { if (w.step !== s) { w.step = s; w.since = now; applied.push(`wip.step ${s}`); } };
  const stopped = s => s === "halted" || s === "escalated";
  const curStage = () => (w.stages || []).find(x => x && x.state === "current") || null;
  const builtCells = list => [...new Set((list || []).map(String).filter(id => ids.has(id)))].map(id => id + ".built");
  const factRows = () => Array.isArray(facts.rows) ? facts.rows.filter(x => typeof x === "string") : null;
  /* wip.current for a step, by the step-to-column map (plan/RULES.md §3; lib.js GLOW_MAP) */
  const glow = step => {
    const m = lib.GLOW_MAP[step]; if (!m) return w.current || [];
    if (m.kind === "none") return [];
    if (m.kind === "columns") return m.cols.slice();
    if (m.kind === "research") return lib.researchGlow(plan).current;
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
  const research = () => (w.research = w.research && typeof w.research === "object" ? w.research : { phase: null, drafted: 0, since: {} });
  const setPhase = ph => { const r = research(); r.since = r.since && typeof r.since === "object" ? r.since : {}; if (r.phase !== ph) { r.phase = ph; r.since[ph] = now; applied.push(`wip.research.phase ${ph}`); } };
  const qs = () => (w.questions = Array.isArray(w.questions) ? w.questions : []);
  const openList = () => { const q = qs(); return q.filter(x => !["returned", "verifying", "complete"].includes(lib.qState(x))).map(x => code(x.question)); };
  const researchDetail = () => { const q = qs(), ret = q.filter(x => x.findings != null).length;
    return q.length ? `Research: ${ret} of ${plural(q.length, "question")} returned${openList().length ? "; open: " + openList().join(", ") : ""}.` : "Research: the questions are being drafted."; };
  const docRef = f => fs.existsSync(path.join(DIR, f)) ? f : null;
  /* the note, detail and trail entry of a remediation report: facts.stage (what the report says it reached) first, else the
     sub-steps done and the one current; from the facts alone, so the same event twice writes the same board */
  const remediationWording = () => {
    const R = w.remediation || {}, ss = R.steps || [], cur = ss.find(x => x.state === "current"), dn = ss.filter(x => x.state === "done");
    const said = txt(facts.stage, "stage"), pass = R.pass != null ? `qa pass ${R.pass}` : "the qa pass";
    const what = said || [dn.length ? `${plural(dn.length, "sub-step")} done` : null, cur ? `${cur.name} current` : ss.length && !cur ? "every sub-step done" : null].filter(Boolean).join("; ") || null;
    note = note || (said || [dn.length ? `${dn.length} of ${ss.length} remediation sub-steps done` : null, cur ? "the next current" : null].filter(Boolean).join("; ") || `remediation for ${pass}`);
    detail = detail || `Remediation for ${pass}${cur ? ": " + cur.name : what ? ": " + what : ""}.`;
    /* a facts.stage that names the pass itself ("qa pass 1 fixes done; …") stands alone, after "Remediation:" */
    trail = { column: "built", label: said && /\bqa pass\b/i.test(said) ? `Remediation: ${said}` : `Remediation for ${pass}${what ? ": " + what : ""}` };
  };

  switch (ev) {
    case "sized": {
      const step = facts.step || (w.step === "sizing" || !w.step ? null : stopped(w.step) ? w.resume : w.step);
      if (!step || !["interview", "research", "plan", "architecture"].includes(step)) refuse(`sized names no step to start at (facts.step: interview, research or plan; got ${JSON.stringify(facts.step || null)})`);
      if (stopped(w.step)) { w.resume = null; w.waitingOn = null; }
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
      const waiting = txt(facts.waitingOn, "waitingOn") || txt(facts.detail, "detail") || "An answer from the user.";
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
      setStep("landing"); setGlow("landing");
      if (tracking && rows.some(r => r.unit)) { const nx = lib.nextUnit(plan), id = nx ? nx.id : null; if (w.next !== id) { w.next = id; applied.push(`wip.next ${id}`); } }
      enrich.push("architecture-signed-off: the Considered column and, on a tracking board, the unit rows come from architecture.md");
      detail = detail || "Architecture signed off; the plan lands next.";
      trail = { column: "considered", label: "Architecture signed off", ref: docRef("architecture.md") };
      break;
    }
    case "plan-accepted": {
      if ((w.questions || []).length || w.research || w.plan) applied.push("wip.questions, wip.research and wip.plan cleared");
      w.questions = []; w.research = null; w.plan = null;
      setStep("branch"); setGlow("branch");
      enrich.push("plan-accepted: the Considered and Verdict columns, the verdict milestone and the impact come from plan.md and impact.md");
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
      if (Array.isArray(facts.open)) mergeOpen(w, facts, applied, txt, `implementation-stage ${facts.stage || (curStage() || {}).id || ""}`.trim(), resolved);
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
      const route = Q.route || (facts.remediation || {}).route || null;
      if (route && !ROUTES.includes(route)) refuse(`facts.qa.route ${JSON.stringify(route)} is not one of ${ROUTES.join(", ")}`);
      const entry = { pass: Q.pass, verdict, date: today, findings, ...(Object.keys(severity).length ? { severity } : {}), ...(verdict === "changes-requested" && route ? { route } : {}) };
      const qn = txt(Q.note, "qa.note"); if (qn) entry.note = qn;
      w.qa = Array.isArray(w.qa) ? w.qa : []; const k = w.qa.findIndex(x => x && x.pass === Q.pass);
      if (k < 0) w.qa.push(entry); else w.qa[k] = { ...(w.qa[k] && w.qa[k].note && !entry.note ? { note: w.qa[k].note } : {}), ...entry };
      w.qa.sort((a, b) => a.pass - b.pass); applied.push(`wip.qa pass ${Q.pass} ${verdict}`);
      /* an open point the qa report raises (or settles) is kept as at an implementation stage (plan/RULES.md §3, wip.open) */
      if (Array.isArray(facts.open)) mergeOpen(w, facts, applied, txt, `qa pass ${Q.pass}`, resolved);
      if (w.qaMax !== 3 && !Number.isInteger(w.qaMax)) w.qaMax = 3;
      const counts = [...Object.entries(findings).filter(([, n]) => n).map(([k2, n]) => `${n} ${k2}`), ...Object.entries(severity).filter(([, n]) => n).map(([k2, n]) => `${n} ${k2}`)].join(", ");
      const anyFinding = Object.values(findings).some(n => n > 0);
      if (verdict === "approved") {
        if (w.remediation) applied.push("wip.remediation cleared"); w.remediation = null;
        const step = facts.step && STEPS.includes(facts.step) ? facts.step : "landing"; setStep(step); setGlow(step);
        if (anyFinding) enrich.push("qa-pass: the approving pass's findings detail comes from the qa report");
        detail = detail || `QA pass ${Q.pass} approved; the landing is the admin team's.`;
        if (plan.parent) parentOp = { kind: "complete" };
      } else if (verdict === "changes-requested") {
        setRemediation(w, { pass: Q.pass, route, ...(facts.remediation || {}) }, applied, enrich, txt);
        if (route === "planner-then-rookie-dev") { w.plan = { state: "re-pass", from: "qa", pass: Q.pass, since: now }; applied.push(`wip.plan re-pass after qa pass ${Q.pass}`); }
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
      w.waitingOn = txt(facts.waitingOn, "waitingOn") || "The user's re-sizing of the issue.";
      enrich.push("escalated: the board follows the issue's new sizing");
      detail = detail || "Escalated: waiting on the user's re-sizing.";
      trail = { column: STEP_COLUMN[resume] || "built", label: `Escalated at ${STEP_WORDS[resume] || resume}: waiting on the user's re-sizing` };
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
    case "landed": {
      const A = plan.asBuilt && typeof plan.asBuilt === "object" ? plan.asBuilt : {};
      const sha = [facts.sha, facts.merge].find(s => typeof s === "string" && /^[0-9a-f]{7,40}$/.test(s)), pr = Number.isInteger(facts.pr) ? facts.pr : null;
      const next = { ...A, ...(sha ? { sha } : {}), ...(typeof facts.merge === "string" && /^[0-9a-f]{7,40}$/.test(facts.merge) ? { merge: facts.merge } : {}), ...(pr ? { pr } : {}),
        ...(txt(facts.version, "version") ? { version: txt(facts.version, "version") } : {}), date: /^\d{4}-\d{2}-\d{2}$/.test(String(facts.date || "")) ? facts.date : (A.date || today) };
      plan.asBuilt = next; applied.push("asBuilt");
      /* the board is built, and its step landed, only once every part is resolved and the merge is recorded (check.js); until the
         landing refresh resolves them it stays at the landing, its merge recorded */
      /* a row's recorded state: the outcome its as-built statements derive, else its stored state (plan/RULES.md §2, "Statements") */
      const open = rows.filter(r => ["pending", ...lib.BUILDING_STATES].includes(lib.recordedState(r)));
      w.resume = null; w.waitingOn = null;
      if (next.sha && next.date && !open.length) { if (plan.status !== "built") { plan.status = "built"; applied.push("status built"); } setStep("landed"); setGlow("landed"); }
      else { setStep("landing"); setGlow("landing"); enrich.push(open.length ? `landed: ${open.map(r => r.id).join(", ")} still to resolve before the board is built (it stays at the landing until then)` : "landed: asBuilt has no sha yet"); }
      enrich.push("landed: the landing refresh resolves every part, completes the trail and reconciles the impact");
      detail = detail || `Landed${pr ? " in PR #" + pr : ""}.`;
      trail = { column: "built", label: `Landed${pr ? " in PR #" + pr : ""}${sha ? ", merge " + sha.slice(0, 7) : ""}`, ...(pr ? { ref: `PR #${pr}` } : {}) };
      if (plan.parent) parentOp = { kind: "landed" };
      break;
    }
    default: refuse(`unknown event ${JSON.stringify(ev)}`);
  }
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
  return { plan, applied, enrich, parentOp };
}

/* wip.stages from facts.stages ([{id, name, state}]), each keeping the rows the board records for it (plan.md's stages, written by the
   presenter); at branch-cut a list with no states starts with the first current and the rest to do. */
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
/* wip.remediation from the facts: {pass, route, steps: [{name, state}]}. */
function setRemediation(w, R, applied, enrich, txt) {
  if (!R || !Number.isInteger(R.pass)) refuse("the remediation names no qa pass (facts.remediation.pass)");
  if (R.route != null && !ROUTES.includes(R.route)) refuse(`facts.remediation.route ${JSON.stringify(R.route)} is not one of ${ROUTES.join(", ")}`);
  const old = w.remediation && w.remediation.pass === R.pass ? w.remediation : {};
  /* a sub-step's name: a work level in it (GUIDANCE.md §4) is elided ("…") rather than the step dropped, and the presenter is told */
  const stepName = (raw, i) => { const t = txt(raw, `remediation.steps[${i}].name`); if (t || typeof raw !== "string" || !raw.trim()) return t;
    let s = raw.replace(/\s+/g, " ").trim(); levelRefs(s).forEach(h => { s = s.split(h).join("…"); }); return s; };
  const steps = Array.isArray(R.steps) ? R.steps.map((s, i) => { const raw = s && (s.name || s.what), name = stepName(raw, i);
    if (!name) refuse(`facts.remediation.steps[${i}] has no name (got ${JSON.stringify(raw === undefined ? null : raw)})`);
    if (!SSTATES.includes(s.state)) refuse(`facts.remediation.steps[${i}].state ${JSON.stringify(s.state)} is not done, current or todo`);
    return { name, state: s.state }; }) : old.steps;
  if (steps && steps.filter(s => s.state === "current").length > 1) refuse("facts.remediation.steps names more than one current step");
  const next = { pass: R.pass, ...(R.route || old.route ? { route: R.route || old.route } : {}), ...(steps ? { steps } : {}) };
  if (JSON.stringify(next) !== JSON.stringify(w.remediation || null)) { w.remediation = next; applied.push(`wip.remediation pass ${R.pass}${next.route ? " " + next.route : ""}`); }
}
/* wip.open from facts.open ([{text, raised?, ref?, resolved?}]): a new point appended, a known one (by its text) marked resolved. */
function mergeOpen(w, facts, applied, txt, raised, resolved) {
  w.open = Array.isArray(w.open) ? w.open : [];
  facts.open.forEach((o, i) => {
    const text = txt(o && typeof o === "object" ? o.text : o, `open[${i}].text`); if (!text) return;
    const res = o && (o.resolved === true ? true : txt(o.resolved, `open[${i}].resolved`));
    let have = w.open.find(x => x && x.text === text);
    if (!have) { have = { text, raised: txt(o && o.raised, `open[${i}].raised`) || raised, ...(o && typeof o.ref === "string" && o.ref.trim() ? { ref: o.ref.trim() } : {}) }; w.open.push(have); applied.push(`wip.open + "${text.slice(0, 40)}"`); }
    if (res && have.resolved !== res) { have.resolved = res; applied.push(`wip.open resolved "${text.slice(0, 40)}"`); resolved.push(have); }
  });
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
    if (state !== "landed") { row.asBuilt = { ...(row.asBuilt || {}), state: "landed" }; applied.push(`#${plan.issue}: ${row.id} landed`); }
    if (cur.includes(cell)) { w.current = cur.filter(a => a !== cell); applied.push(`#${plan.issue}: ${row.id} out of wip.current`); }
    enrich.push(`#${plan.issue}: the landed unit's summary, its impact entry and its effect on the initiative's impact come from the sub-issue's board and documents`);
  }
  const nx = lib.nextUnit(plan), id = nx ? nx.id : null;
  if (w.next !== id) { w.next = id; applied.push(`#${plan.issue}: wip.next ${id}`); }
  const d = chainDetail(plan); if (w.detail !== d) { w.detail = d; applied.push(`#${plan.issue}: wip.detail`); }
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
  const cur = units.filter(r => (w.current || []).some(a => String(a).split(".")[0] === r.id)), n = r => r.unit.issue ? "#" + r.unit.issue : r.name;
  const done = cur.filter(r => st(r) === "complete"), going = cur.filter(r => st(r) !== "complete"), nx = units.find(r => r.id === w.next);
  return [`${landed.length} of ${plural(counted.length, "unit")} landed`, going.length ? `${going.map(n).join(", ")} in progress` : null,
    done.length ? `${done.map(n).join(", ")} complete, awaiting ${done.length > 1 ? "their landings" : "its landing"}` : null, nx ? `${n(nx)} up next` : null].filter(Boolean).join("; ") + ".";
}

/* The page a board is embedded into: the page itself, or the current template when the page is not the verified template plus its
   data (plan/RULES.md §4: every event re-renders the board onto the current template). A page that declares a divergence, or a
   template not verified since it changed, is left as it is, and the presenter is told. */
const emptyBlock = (html, id) => dev.norm(html).replace(new RegExp(`(<script type="application/json" id="${id}">)[\\s\\S]*?(</script>)`), "$1\n{}\n$2");
function pageBase(pagePath, enrich, rel) {
  const html = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, "utf8") : null, tplPath = dev.templateFor(pagePath, "plan-board"), tpl = fs.readFileSync(tplPath, "utf8");
  if (html != null && emptyBlock(html, "plan") === emptyBlock(tpl, "plan")) return { html, rerendered: false };
  if (html != null && /<meta name="template-divergence"/.test(html)) { enrich.push(`${rel} declares a divergence from the template: not re-rendered`); return { html, rerendered: false }; }
  if (!dev.verified(tplPath).ok) { enrich.push(`the template ${path.relative(dev.SKILL, tplPath).split(path.sep).join("/")} changed since it was verified: ${rel} not re-rendered (run verify/verify-templates.js)`); if (html == null) refuse(`${rel} has no page and the template is not verified`); return { html, rerendered: false }; }
  return { html: tpl, rerendered: true };
}
/* Embed a board in memory and write its three files (plan/scripts/embed.js does the same on disk): the issue links, on a tracking
   board the units' mirrors, and the statements' excerpts not copied yet, resolved from the folders on disk (lib.js resolveBoard()),
   plan.json in its own line endings, the page's data block and the plan.js sidecar. */
function writeBoard(dir, data, eol, enrich, label) {
  const rel = path.relative(ROOT, path.join(dir, "dashboard.html")).split(path.sep).join("/");
  lib.resolveBoard(data, dir);
  const json = (JSON.stringify(data, null, 2) + "\n").replace(/\n/g, eol);
  const base = pageBase(path.join(dir, "dashboard.html"), enrich, rel);
  if (base.rerendered) S.rerendered.push(rel);
  const html = lib.writeBlock(base.html, "plan", json), js = lib.sidecarText("plan", json);
  const files = [["plan.json", json], ["dashboard.html", html], ["plan.js", js]], wrote = [];
  files.forEach(([f, t]) => { if (put(path.join(dir, f), t)) wrote.push(f); });
  if (wrote.length) S.wrote.push(`${label}: ${wrote.join(", ")}`);
  return wrote.length > 0;
}
/* A child process, as a promise of { status, stdout, stderr }. */
const run = (file, a, cwd) => new Promise(res => { const c = cp.spawn(process.execPath, [file, ...a], { cwd, windowsHide: true }); let o = "", e = "";
  c.stdout.on("data", d => { o += d; }); c.stderr.on("data", d => { e += d; }); c.on("close", s => res({ status: s, stdout: o, stderr: e })); c.on("error", x => res({ status: 1, stdout: o, stderr: String(x) })); });

let DIR = null, ROOT = null;
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
  if (!fs.existsSync(path.join(ROOT, "docs"))) refuse(`the worktree ${ROOT} has no docs/ folder`);
  const at = opt("at") || facts.at || req.at || null;
  if (at && isNaN(Date.parse(at))) refuse(`the event's time ${JSON.stringify(at)} is not an ISO time`);
  const now = (at ? new Date(at) : new Date()).toISOString().replace(/\.\d+Z$/, "Z");
  const planFile = path.join(DIR, "plan.json");
  if (!fs.existsSync(planFile)) {
    if (ev !== "sized") refuse(`${folder} holds no plan.json: there is no board to apply ${ev} to`);
    S.result = "no-board"; S.issue = req.issue || null; S.enrich.push("sized: no board yet; the presenter lays the foundation (new.js) from the documents"); return;
  }
  const text = fs.readFileSync(planFile, "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n";
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
  const R = applyEvent(orig, ev, facts, req, now);
  S.applied.push(...R.applied); S.enrich.push(...R.enrich);

  {
    writeBoard(DIR, R.plan, eol, S.enrich, "board");
    /* the parent tracking board: the standing rule's move, then a re-embed that mirrors this unit's run (lib.js mirrorUnitRuns) */
    const up = lib.parentFolder(DIR, R.plan);
    if (up && fs.existsSync(path.join(up, "dashboard.html"))) {
      const ptext = fs.readFileSync(path.join(up, "plan.json"), "utf8"), peol = /\r\n/.test(ptext) ? "\r\n" : "\n";
      let pplan; try { pplan = JSON.parse(ptext); } catch (e) { throw new Error(`the parent tracking board's plan.json does not parse: ${e.message}`); }
      if (R.parentOp) { const P = applyParent(pplan, R.plan, R.parentOp, now); pplan = P.plan; S.applied.push(...P.applied); S.enrich.push(...P.enrich); }
      const prel = path.relative(ROOT, up).split(path.sep).join("/");
      S.parent = `${prel} (${writeBoard(up, pplan, peol, S.enrich, "parent") ? "re-embedded" : "unchanged"})`;
    } else if (R.plan.parent && R.parentOp) S.enrich.push(`the parent tracking board #${R.plan.parent.issue} is not in the enclosing folder: the standing rule is the presenter's`);

    /* check.js on every board written, and the live work board, at once */
    const checks = [run(path.join(__dirname, "check.js"), [DIR], ROOT)];
    if (up) checks.push(run(path.join(__dirname, "check.js"), [up], ROOT));
    let liveRun = null, liveDir = null;
    const main = path.resolve(opt("main") || REPO_PATH || req.repo || ROOT);
    if (flag("no-live")) S.live = "skipped (--no-live)";
    else if (!fs.existsSync(path.join(main, "docs", "plans"))) { S.live = `skipped (${main} has no docs/plans/)`; S.enrich.push("the live work board: the main checkout was not found"); }
    else {
      liveDir = path.join(main, "docs", "plans", ".live");
      if (!fs.existsSync(liveDir)) { fs.mkdirSync(liveDir, { recursive: true }); madeDirs.push(liveDir); }
      ["board.json", "index.html", "board.js"].forEach(f => stage(path.join(liveDir, f)));
      const ex = path.join(main, ".git", "info", "exclude");
      if (fs.existsSync(path.join(main, ".git")) && fs.statSync(path.join(main, ".git")).isDirectory() && !(fs.existsSync(ex) && /^\/?docs\/plans\/\.live\/?\s*$/m.test(fs.readFileSync(ex, "utf8"))))
        S.enrich.push("docs/plans/.live/ is not in the main checkout's .git/info/exclude: the presenter adds the line");
      liveRun = run(path.join(__dirname, "board.js"), ["--live", "--refresh-template", "--root", main, ...(flag("no-gh") ? ["--no-gh"] : [])], main);
    }
    const [cks, lv] = await Promise.all([Promise.all(checks), liveRun]);
    const warns = cks.map(c => (c.stdout.match(/^warn/gm) || []).length), fails = cks.flatMap(c => c.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)));
    if (cks.some(c => c.status !== 0)) { S.check = `FAIL: ${fails.slice(0, 6).join(" | ") || (cks.find(c => c.status !== 0).stderr || "").trim().split(/\r?\n/)[0]}`; throw new Error("check.js failed on the board it would write"); }
    S.check = `pass (board: ${plural(warns[0], "warning")}${up ? `; parent: ${plural(warns[1], "warning")}` : ""})`;
    if (lv) {
      if (lv.status !== 0) throw new Error(`board.js --live failed: ${(lv.stderr || lv.stdout).trim().split(/\r?\n/).slice(-1)[0]}`);
      S.live = `regenerated ${path.relative(main, liveDir).split(path.sep).join("/")}/`;
    }
    S.result = "ok";
  }
}

main().then(() => { say(); process.exit(0); }, e => {
  S.result = "failed"; S.error = e.message;
  try { S.restored = rollback(); } catch (x) { S.error += `; the rollback failed too: ${x.message}`; }
  if (!S.enrich.includes("the event was not applied: the presenter applies it")) S.enrich.unshift("the event was not applied: the presenter applies it");
  say(); process.exit(1);
});
