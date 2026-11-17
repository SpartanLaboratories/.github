// The cases of the architecture stages on the tracking board (plan/RULES.md §3, "A multi-system run's architecture step", with "The plan stages" and
// "The late update" it applies; §4, the researched, architecture-signed-off, plan-stage, late-update and plan-accepted rows; §8), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-arch-stages.js [--out <dir>].
// 1. lib.js: the four stages in their order with their briefs, a check accepted by report, the sign-off's move to write consequences (report passed
//    over when a stage before it is open), the ways back (write after check/accept and after report), the close, the late update's wording, the
//    stages read back from the trail, the architecture visit's frozen field.
// 2. apply-event.js: seeded at researched, write current; the stage already open writing nothing; the moves with their trail lines in the
//    architecture step's column; a check sent back; a halt holding report; the sign-off closing report with its detail and opening write
//    consequences, the board staying at its architecture step; plan-accepted closing them, clearing wip.architecture, moving the board to its
//    plan's documents and freezing the visit with the stages as it closed them.
// 3. apply-event.js: the refusals (another step, a board from before the stages, re-pass, a stage it does not know, write consequences sent, a
//    closed board), each writing nothing, enrich no; PLAN STAGE ORDER; a board from before keeping its step without them, at a resumed and at
//    the sign-off.
// 4. a reconsideration at the sign-off (write after report, no warning), a sign-off with report passed over, the late update (a stage passed
//    over recorded with no time; report never; refused once the architecture is final).
// 5. retime and reword reach an architecture stage.
// 6. check.js holds wip.architecture and an architecture visit's frozen copy to their form, and refuses it on an issue board.
// 7. the template: the architecture-stage list (the WIP strip and the phase Card), the step Panel's Disclosures, the Pills, the Legend, a finished
//    visit and its account, the reconstruction (the template's functions run in a vm, with no browser), and the same reconstruction as lib.js.
// Each group returns [title, cases], a case [name, ok, detail]. The boards it lays are kept under <out>/arch-stages/.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesArchStages(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const PB = rd(tp("plan/template/dashboard.html"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "arch-stages"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const T = m => `2026-11-15T10:${String(m).padStart(2, "0")}:00Z`;
  const TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json"))), F0 = TRK.folder;
  const nOf = Object.fromEntries(TRK.rows.filter(r => r.unit).map(r => [r.unit.issue, r.unit.n]));
  /* a tracking board in flight at the step given, its units written and none filed (or none written, units false), as a tracking issue's run has it */
  const flight = (step, over, o) => { o = o || {}; const p = copy(TRK);
    p.rows.forEach(r => { if (r.unit) { r.unit.board = null; r.unit.folder = null; r.unit.issue = null; r.unit.blockedBy = (r.unit.blockedBy || []).map(i => ({ unit: nOf[i] })); delete r.unit.live; r.asBuilt = { state: "pending", summary: "Not filed yet." }; } });
    if (o.units !== true) p.rows = p.rows.filter(r => !r.unit);
    Object.assign(p, { status: "planned", asBuilt: null, sized: T(0), branch: null }); p.milestones = (p.milestones || []).filter(m => m.column !== "built"); if (p.impact) { p.impact.basis = "plan"; delete p.impact.changes; if (o.units !== true) delete p.impact.units; }
    p.trail = (p.trail || []).filter(t => ["sizing", "interview", "research"].includes(lib.trailStep(t.label)));
    Object.assign(p.wip, { step, since: T(1), updated: T(1), current: step === "research" ? ["considered"] : ["considered"], next: null, landing: null, stages: [], steps: lib.STEPS_BY_LEVEL[4].slice(), history: {}, qa: [], waitingOn: null, resume: null, plan: null,
      questions: [], research: step === "research" ? { phase: "verification", drafted: 1, since: { verification: T(1) } } : null, event: { name: step === "research" ? "verification-started" : "researched", at: T(1) }, detail: "", ...(over || {}) });
    return p; };
  let nt = 0, nreq = 0;
  const lay = (name, p) => { const root = path.join(sc, name || `t-${++nt}`), dir = path.join(root, ...F0.split("/")); fs.mkdirSync(path.join(root, ".git", "info"), { recursive: true }); wr(path.join(root, ".git", "info", "exclude"), "docs/plans/.live/\n");
    wr(path.join(dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  const board = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  const apply = (B, ev, facts, at, opts) => { const q = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: TRK.repo, issue: TRK.issue, event: ev, folder: F0, branch: "docs/issue-55-plan", facts: facts || {} }));
    const a = run(APPLY, ["--event", q, "--worktree", B.root, "--no-gh", "--no-live", ...(opts || (at ? ["--at", at] : [])), "--json"]); return { a, S: parse(a), p: board(B) }; };
  const ids = p => ((p.wip.architecture || {}).stages || []).map(x => `${x.id}:${x.state}`).join(" ");
  const stage = (p, id) => ((p.wip.architecture || {}).stages || []).find(x => x.id === id) || {};
  const last = p => (p.trail || []).slice(-1)[0] || {};
  const checkOk = B => { const k = run(CHECK, [B.dir]); return { ok: k.status === 0, out: (k.stdout + k.stderr).split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 4).join(" | ") }; };
  const unchanged = (B, before) => rd(path.join(B.dir, "plan.json")) === before;
  /* the fixture's unit rows, none filed, as a fill writes them after the sign-off */
  const unitRows = () => flight("architecture", {}, { units: true }).rows.filter(r => r.unit);
  const FILL = sk("plan/scripts/fill.js");
  const fill = (B, fields) => { const f = wr(path.join(sc, `fields-${++nreq}.json`), js(fields)), a = run(FILL, [B.dir, "--fields", f, "--json"]); return { a, S: parse(a) }; };
  const pre = B => rd(path.join(B.dir, "plan.json"));

  /* ---------- 1. lib.js ---------- */
  guard("lib.js: the architecture stages in their order, moved by the plan stages' functions, read back from the trail (plan/RULES.md §3)", c => {
    c.push(["the four ids in their order: write, check/accept, report, write consequences", js(lib.ARCH_STAGES) === js(["write", "check", "report", "consequences"]) && js(lib.ARCH_STAGES.map(id => lib.PLAN_STAGE_NAMES[id])) === js(["write", "check/accept", "report", "write consequences"]), js(lib.ARCH_STAGES)]);
    c.push(["their briefs, the rules' words", js(lib.ARCH_STAGE_BRIEFS) === js({ write: "The architecture drafted, with its units", check: "The architecture checked, then accepted or sent back", report: "The architecture and its units put to you; it ends at your sign-off", consequences: "What the change does to its surroundings, written down" }), js(lib.ARCH_STAGE_BRIEFS)]);
    const A = { stages: lib.seedPlanStages(lib.ARCH_STAGES, T(1)) };
    lib.planStageMove(A, "check", T(2), "Drafted.");
    const r = lib.planStageMove(A, "report", T(3), "Holds.");
    c.push(["a check round that opens report is accepted", A.stages[1].result === "accepted" && r.closedWord === "accepted" && A.stages[2].state === "current", js(A.stages)]);
    const s = lib.planStageMove(A, "consequences", T(4), "Approved as proposed.");
    c.push(["the sign-off's move: report done at its time with the detail, write consequences current", s.closed === "report" && !s.passed.length && A.stages[2].finished === T(4) && A.stages[2].report === "Approved as proposed." && js(A.stages[3]) === js({ id: "consequences", state: "current", started: T(4) }), js(A.stages)]);
    c.push(["the close at plan-accepted: write consequences done at its time", js(lib.planStagesClose(A, T(5), "Final.")) === js({ closed: "consequences", passed: [] }) && A.stages[3].finished === T(5) && A.stages[3].report === "Final.", js(A.stages[3])]);
    const B = { stages: lib.seedPlanStages(lib.ARCH_STAGES, T(1)) }; lib.planStageMove(B, "check", T(2), "Drafted.");
    const p = lib.planStageMove(B, "consequences", T(3), "Signed off.");
    c.push(["a sign-off while a stage before report is open: closed with no time, accepted, report passed over", js(p.passed) === js(["report"]) && !("finished" in B.stages[1]) && B.stages[1].result === "accepted" && B.stages[2].state === "todo", js(B.stages)]);
    const C = { stages: lib.seedPlanStages(lib.ARCH_STAGES, T(1)) }; lib.planStageMove(C, "check", T(2), "Drafted."); lib.planStageMove(C, "report", T(3), "Holds.");
    const back = lib.planStageMove(C, "write", T(4), "Your answer has it reconsidered.");
    c.push(["back from report to write is a way back: report's round kept, check and report to come, write round 2", back.back && back.wayBack && C.stages[0].state === "current" && C.stages[0].rounds.length === 1 && C.stages[1].state === "todo" && C.stages[1].rounds[0].result === "accepted" && C.stages[2].rounds[0].report === "Your answer has it reconsidered." && C.stages[3].state === "todo" && !C.stages[3].rounds, js(C.stages.map(x => [x.id, x.state, (x.rounds || []).length]))]);
    c.push(["its trail line in the architecture's words", lib.planStageLine(back, "write", "Your answer has it reconsidered.", "Architecture stage") === "Architecture stage: write, round 2 · report: done — Your answer has it reconsidered.", lib.planStageLine(back, "write", "Your answer has it reconsidered.", "Architecture stage")]);
    const L = { stages: lib.seedPlanStages(lib.ARCH_STAGES, T(1)) }; lib.planStageMove(L, "report", T(2), "Drafted and checked.");
    c.push(["a late update for check/accept: done, late, accepted (read from report)", lib.planStageLate(L, "check", "Checked.", "architecture stage").changed && js(L.stages[1]) === js({ id: "check", state: "done", late: true, report: "Checked.", result: "accepted" }), js(L.stages[1])]);
    c.push(["its refusal names the architecture stages where none is open", /no architecture stage is open/.test(lib.planStageLate({ stages: [{ id: "write", state: "done" }, { id: "check", state: "todo" }, { id: "report", state: "todo" }, { id: "consequences", state: "todo" }] }, "write", "x", "architecture stage").refused || ""), ""]);
    const tr = ["Research verified; the architecture next", "Architecture stage: check/accept · write: done — Drafted.", "Architecture stage: write, round 2 · check/accept: sent back — One system too many.", "Architecture stage: check/accept · write: done", "Architecture stage: report · check/accept: accepted — Holds.", "Architecture signed off", "Architecture final, with its units"];
    const rb = lib.archStagesFromTrail(tr);
    c.push(["read back from the trail: each move with no time, the sign-off opening write consequences, the final line closing it", js(rb.map(x => [x.id, x.state, (x.rounds || []).length, x.result || null, x.report || null])) === js([["write", "done", 1, null, null], ["check", "done", 1, "accepted", "Holds."], ["report", "done", 0, null, null], ["consequences", "done", 0, null, null]]), js(rb)]);
    c.push(["a trail with no architecture stage line reads none (a board from before them)", lib.archStagesFromTrail(["Architecture signed off", "Architecture final, with its units"]) === null, ""]);
    c.push(["an architecture visit freezes wip.architecture (HISTORY_FIELDS)", js(lib.HISTORY_FIELDS.architecture) === js(["architecture"]), js(lib.HISTORY_FIELDS.architecture)]);
  });

  /* ---------- 2. the fast path, from researched to plan-accepted ---------- */
  let FLOW = null;
  guard("apply-event.js: a tracking board's architecture step as four architecture stages, from researched to plan-accepted (plan/RULES.md §3, §4)", c => {
    const B = lay("flow", flight("research")); FLOW = B;
    const r = apply(B, "researched", { documents: ["research/README.md"] }, T(2));
    c.push(["researched seeds the four stages, write current from the event, the board at its architecture step", r.a.status === 0 && r.p.wip.step === "architecture" && ids(r.p) === "write:current check:todo report:todo consequences:todo" && stage(r.p, "write").started === T(2) && r.p.wip.plan == null, js([r.S.error, r.p.wip.architecture])]);
    const o = apply(B, "plan-stage", { stage: "write", detail: "x" }, T(3));
    c.push(["plan-stage naming the stage open: nothing written, enrich no", o.a.status === 0 && o.S.result === "nothing" && o.S.enrich === "no" && (o.S.applied || []).some(x => /architecture stage write is open already/.test(x)), js([o.S.result, o.S.applied, o.S.error])]);
    const k1 = apply(B, "plan-stage", { stage: "check", detail: "Drafted with eleven units." }, T(4));
    c.push(["plan-stage check: write done at its time with the detail, check current; no step, no glow moved", k1.a.status === 0 && k1.S.enrich === "no" && js(stage(k1.p, "write")) === js({ id: "write", state: "done", started: T(2), finished: T(4), report: "Drafted with eleven units." }) && stage(k1.p, "check").state === "current" && k1.p.wip.step === "architecture" && js(k1.p.wip.current) === js(r.p.wip.current), js([k1.S.error, k1.p.wip.architecture, k1.p.wip.current])]);
    c.push(["its trail line, \"Architecture stage: …\", in the architecture step's column with no reference", last(k1.p).label === "Architecture stage: check/accept · write: done — Drafted with eleven units." && last(k1.p).column === "considered" && !("ref" in last(k1.p)), js(last(k1.p))]);
    c.push(["wip.event and wip.detail written", k1.p.wip.event.name === "plan-stage" && k1.p.wip.event.at === T(4) && k1.p.wip.detail === "Drafted with eleven units.", js([k1.p.wip.event, k1.p.wip.detail])]);
    const sb = apply(B, "plan-stage", { stage: "write", detail: "One system too many." }, T(5));
    c.push(["the check sends it back: its round sent back and kept, write round 2, no warning", sb.a.status === 0 && stage(sb.p, "check").state === "todo" && stage(sb.p, "check").rounds[0].result === "sent back" && stage(sb.p, "write").rounds.length === 1 && last(sb.p).label === "Architecture stage: write, round 2 · check/accept: sent back — One system too many." && !(sb.S.warnings || []).some(x => /PLAN STAGE ORDER/.test(x)), js([sb.S.error, sb.S.warnings, last(sb.p)])]);
    apply(B, "plan-stage", { stage: "check", detail: "Redrafted with ten units." }, T(6));
    const rp = apply(B, "plan-stage", { stage: "report", detail: "The design holds." }, T(7));
    c.push(["the check accepted: report opens", rp.a.status === 0 && stage(rp.p, "check").result === "accepted" && stage(rp.p, "report").state === "current" && last(rp.p).label === "Architecture stage: report · check/accept: accepted — The design holds.", js([rp.S.error, rp.p.wip.architecture])]);
    const h = apply(B, "halted", { waitingOn: "The architecture's sign-off", questions: [{ text: "Approve the architecture?", options: ["Approve as proposed", "Approve with changes", "Reconsider"] }] }, T(8));
    const hv = ((h.p.wip.history || {}).architecture || []).slice(-1)[0] || {};
    c.push(["a halt holds report current; the visit it ends freezes the stages as they stood", h.a.status === 0 && h.p.wip.step === "halted" && h.p.wip.resume === "architecture" && stage(h.p, "report").state === "current" && hv.held === true && (((hv.architecture || {}).stages || []).find(x => x.id === "report") || {}).state === "current", js([h.S.error, hv])]);
    const so = apply(B, "architecture-signed-off", { detail: "Approved with two changes." }, T(9));
    c.push(["the sign-off: report done at its time, its report the detail; write consequences current from it", so.a.status === 0 && js(stage(so.p, "report")) === js({ id: "report", state: "done", started: T(7), finished: T(9), report: "Approved with two changes." }) && js(stage(so.p, "consequences")) === js({ id: "consequences", state: "current", started: T(9) }), js([so.S.error, so.p.wip.architecture])]);
    c.push(["…the board stays at its architecture step, out of the halt, the architecture's glow kept, sub-issues in its line", so.p.wip.step === "architecture" && so.p.wip.resume == null && so.p.wip.waitingOn == null && js(so.p.wip.current) === js(["considered"]) && so.p.wip.steps.includes("sub-issues"), js([so.p.wip.step, so.p.wip.current, so.p.wip.steps])]);
    c.push(["…its own trail line, no stage line; the detail says the consequences come next", last(so.p).label === "Architecture signed off" && !(so.p.trail || []).some(t => /^Architecture stage: write consequences/.test(t.label)) && so.p.wip.detail === "Approved with two changes.", js([last(so.p), so.p.wip.detail])]);
    c.push(["…the questions the halt put answered at the sign-off", (so.p.wip.asked || []).every(q => q.answered === T(9)), js(so.p.wip.asked)]);
    const oc = apply(B, "plan-stage", { stage: "consequences", detail: "x" }, T(10));
    c.push(["plan-stage naming write consequences while it is open: nothing written", oc.a.status === 0 && oc.S.result === "nothing", js([oc.S.result, oc.S.error])]);
    /* the unit rows written behind the sign-off, by a fill, as the enrichment writes them */
    const fu = fill(B, { rows: unitRows() }), pf = board(B);
    c.push(["a fill writes the unit rows behind the sign-off: the stages kept as the events left them, the first unit up next", fu.a.status === 0 && js(pf.wip.architecture) === js(so.p.wip.architecture) && pf.wip.next === unitRows()[0].id && pf.wip.step === "architecture", js([fu.a.status, fu.S.error, (fu.a.stdout || "").slice(-300), pf.wip.next])]);
    const k = checkOk(B); c.push(["check.js passes the board at write consequences, its units written", k.ok, k.out]);
    const pa = apply(B, "plan-accepted", { detail: "consequences.md written; the architecture is final." }, T(11));
    const V = ((pa.p.wip.history || {}).architecture || []).slice(-1)[0] || {}, vs = (V.architecture || {}).stages || [];
    c.push(["plan-accepted: wip.architecture cleared, the board at its plan's documents, the first unit up next", pa.a.status === 0 && pa.p.wip.architecture == null && pa.p.wip.step === "document" && pa.p.wip.next === pa.p.rows.find(x => x.unit).id, js([pa.S.error, pa.p.wip.step, pa.p.wip.next])]);
    c.push(["…the visit it ended holds the stages as it closed them: write consequences done at its time with the detail, every stage done", V.endedBy === "plan-accepted" && vs.length === 4 && vs.every(x => x.state === "done") && (vs.find(x => x.id === "consequences") || {}).finished === T(11) && (vs.find(x => x.id === "consequences") || {}).report === "consequences.md written; the architecture is final.", js(V)]);
    c.push(["…two architecture visits: the one the halt ended and the one plan-accepted ended", (pa.p.wip.history.architecture || []).length === 2, js((pa.p.wip.history.architecture || []).map(v => v.endedBy))]);
    c.push(["…its own trail line", last(pa.p).label === "Architecture final, with its units", js(last(pa.p))]);
    const k2 = checkOk(B); c.push(["check.js passes the board at its plan's documents", k2.ok, k2.out]);
    const l = apply(B, "late-update", { event: "plan-stage", stage: "check", detail: "x" }, null, ["--arrived", T(12)]);
    c.push(["a late update once the architecture is final: refused, saying so", l.a.status === 1 && /made final, its stages closed/.test(l.S.error || ""), js(l.S.error)]);
    const s2 = apply(B, "plan-stage", { stage: "write", detail: "x" }, T(12));
    c.push(["a plan-stage once the board is past its architecture: refused", s2.a.status === 1 && /not at its architecture step/.test(s2.S.error || ""), js(s2.S.error)]);
  });

  /* ---------- 3. the refusals, the warning, a board from before ---------- */
  guard("apply-event.js: an architecture stage refused where plan/RULES.md §3 says, nothing written; PLAN STAGE ORDER; a board from before the stages", c => {
    const B = lay("refuse-research", flight("research")), p0 = pre(B), a = apply(B, "plan-stage", { stage: "check", detail: "x" }, T(2));
    c.push(["at another step: refused, the step named, nothing written, enrich no", a.a.status === 1 && /stands at research, not at its architecture step/.test(a.S.error || "") && a.S.enrich === "no" && unchanged(B, p0), js([a.S.error, a.S.enrich])]);
    apply(B, "researched", {}, T(2)); const p1 = pre(B);
    const cq = apply(B, "plan-stage", { stage: "consequences", detail: "x" }, T(3)), rpz = apply(B, "plan-stage", { stage: "re-pass", detail: "x" }, T(3)), un = apply(B, "plan-stage", { stage: "review", detail: "x" }, T(3));
    c.push(["write consequences before the sign-off: refused, the sign-off opens it", cq.a.status === 1 && /opened by the architecture's sign-off/.test(cq.S.error || "") && /not signed off yet/.test(cq.S.error || ""), js(cq.S.error)]);
    c.push(["re-pass: refused, a sub-issue's plan stage", rpz.a.status === 1 && /re-pass is a sub-issue's plan stage/.test(rpz.S.error || ""), js(rpz.S.error)]);
    c.push(["a stage it does not know: refused", un.a.status === 1 && /"review" is no architecture stage/.test(un.S.error || ""), js(un.S.error)]);
    c.push(["every refusal writes nothing, enrich no", unchanged(B, p1) && [cq, rpz, un].every(x => x.S.enrich === "no"), ""]);
    apply(B, "plan-stage", { stage: "check", detail: "Drafted." }, T(3)); apply(B, "plan-stage", { stage: "report", detail: "Holds." }, T(4));
    const odd = apply(B, "plan-stage", { stage: "check", detail: "Again." }, T(5));
    c.push(["a move back no way gives (check/accept after report) is recorded and warned on, never refused", odd.a.status === 0 && (odd.S.warnings || []).some(x => /PLAN STAGE ORDER: check\/accept opened again after report, a way back the architecture step does not give/.test(x)) && stage(odd.p, "check").state === "current", js([odd.S.error, odd.S.warnings])]);
    const kk = run(CHECK, [B.dir]);
    c.push(["check.js warns on the board it left (PLAN STAGE ORDER), naming the architecture step", kk.status === 0 && /PLAN STAGE ORDER: wip\.architecture\.stages: check ran again[^\n]*architecture step/.test(kk.stdout), kk.stdout.split(/\r?\n/).filter(l => /PLAN STAGE|FAIL/.test(l)).join(" | ")]);
    /* a board from before the stages: at its architecture step with none */
    const OB = lay("before", flight("architecture")), po = pre(OB);
    const ob = apply(OB, "plan-stage", { stage: "check", detail: "x" }, T(2));
    c.push(["a board from before the stages: refused, saying so, nothing written", ob.a.status === 1 && /this board has none \(a board from before them\)/.test(ob.S.error || "") && unchanged(OB, po), js(ob.S.error)]);
    apply(OB, "halted", { waitingOn: "The sign-off" }, T(3));
    const rs = apply(OB, "resumed", {}, T(4));
    c.push(["…a halt there resumed: no stages seeded (it stood at its architecture step before)", rs.a.status === 0 && rs.p.wip.step === "architecture" && rs.p.wip.architecture == null, js([rs.S.error, rs.p.wip.architecture])]);
    const so = apply(OB, "architecture-signed-off", {}, T(5));
    c.push(["…its sign-off moves it to its plan's documents, as ever", so.a.status === 0 && so.p.wip.step === "document" && so.p.wip.architecture == null, js([so.S.error, so.p.wip.step])]);
    /* a halt at research resumed at the architecture step: the stages open there */
    const RB = lay("resumed", flight("halted", { resume: "research", waitingOn: "An answer." }));
    const rr = apply(RB, "resumed", { step: "architecture" }, T(2));
    c.push(["resumed at the architecture step from research, none standing: the stages seeded, write current", rr.a.status === 0 && ids(rr.p) === "write:current check:todo report:todo consequences:todo" && stage(rr.p, "write").started === T(2), js([rr.S.error, rr.p.wip.architecture])]);
    /* a landed board */
    const LB = flight("landed"); LB.status = "built"; const BL = lay("landed", LB), pl = pre(BL), l = apply(BL, "plan-stage", { stage: "write", detail: "x" }, T(2));
    c.push(["a landed board: refused, kept as it closed", l.a.status === 1 && /has landed/.test(l.S.error || "") && unchanged(BL, pl), js(l.S.error)]);
  });

  /* ---------- 4. the answers at the sign-off, a report passed over, the late update ---------- */
  guard("a reconsideration at the sign-off, a sign-off with report passed over, and the late update (plan/RULES.md §3)", c => {
    const B = lay("reconsider", flight("research")); apply(B, "researched", {}, T(2));
    apply(B, "plan-stage", { stage: "check", detail: "Drafted." }, T(3)); apply(B, "plan-stage", { stage: "report", detail: "Holds." }, T(4));
    apply(B, "halted", { waitingOn: "The sign-off" }, T(5)); apply(B, "resumed", {}, T(6));
    const w = apply(B, "plan-stage", { stage: "write", detail: "Your answer has the transport reconsidered." }, T(7));
    c.push(["reconsider: write after report is a way back; report's round closed with the detail, check and report to come, write consequences untouched", w.a.status === 0 && !(w.S.warnings || []).some(x => /PLAN STAGE ORDER/.test(x)) && stage(w.p, "write").state === "current" && stage(w.p, "write").rounds.length === 1 && stage(w.p, "report").state === "todo" && stage(w.p, "report").rounds[0].finished === T(7) && stage(w.p, "report").rounds[0].report === "Your answer has the transport reconsidered." && stage(w.p, "check").rounds[0].result === "accepted" && js(stage(w.p, "consequences")) === js({ id: "consequences", state: "todo" }), js([w.S.error, w.S.warnings, w.p.wip.architecture])]);
    c.push(["…its trail line", last(w.p).label === "Architecture stage: write, round 2 · report: done — Your answer has the transport reconsidered.", js(last(w.p))]);
    apply(B, "plan-stage", { stage: "check", detail: "Redrafted." }, T(8)); apply(B, "plan-stage", { stage: "report", detail: "Holds again." }, T(9));
    const so = apply(B, "architecture-signed-off", { detail: "Approved as proposed." }, T(10));
    c.push(["the sign-off it then gets closes that round of report", so.a.status === 0 && stage(so.p, "report").finished === T(10) && stage(so.p, "report").rounds.length === 1 && stage(so.p, "consequences").state === "current", js(so.p.wip.architecture)]);
    const k = checkOk(B); c.push(["check.js passes the board", k.ok, k.out]);
    /* a sign-off while check/accept is open: report passed over */
    const P = lay("passed-over", flight("research")); apply(P, "researched", {}, T(2)); apply(P, "plan-stage", { stage: "check", detail: "Drafted." }, T(3));
    const ps = apply(P, "architecture-signed-off", { detail: "Approved." }, T(4));
    c.push(["a sign-off while check/accept is open: closed with no time, accepted, its report the detail; report not recorded; write consequences current", ps.a.status === 0 && stage(ps.p, "check").state === "done" && !("finished" in stage(ps.p, "check")) && stage(ps.p, "check").result === "accepted" && stage(ps.p, "check").report === "Approved." && js(stage(ps.p, "report")) === js({ id: "report", state: "todo" }) && stage(ps.p, "consequences").state === "current", js(ps.p.wip.architecture)]);
    const p2 = pre(P), lr = apply(P, "late-update", { event: "plan-stage", stage: "report", detail: "x" }, null, ["--arrived", T(5)]);
    c.push(["a late update for report: refused, a report is never recorded late; nothing written", lr.a.status === 1 && /report is never recorded late/.test(lr.S.error || "") && unchanged(P, p2), js(lr.S.error)]);
    const lc = apply(P, "late-update", { event: "plan-stage", stage: "consequences", detail: "x" }, null, ["--arrived", T(5)]);
    c.push(["a late update for the stage open: refused", lc.a.status === 1 && /stage open now/.test(lc.S.error || ""), js(lc.S.error)]);
    /* report sent with check/accept passed over, then the late update for check/accept */
    const L = lay("late", flight("research")); apply(L, "researched", {}, T(2));
    const sk2 = apply(L, "plan-stage", { stage: "report", detail: "Drafted and checked." }, T(3));
    c.push(["report sent while write is open: write closed with no time, check/accept passed over", sk2.a.status === 0 && !("finished" in stage(sk2.p, "write")) && stage(sk2.p, "check").state === "todo" && stage(sk2.p, "report").state === "current", js(sk2.p.wip.architecture)]);
    const before = sk2.p, l1 = apply(L, "late-update", { event: "plan-stage", stage: "check", detail: "Checked and accepted." }, null, ["--arrived", T(4)]);
    c.push(["the late update records check/accept done, late, no time, accepted (read from report)", l1.a.status === 0 && l1.S.enrich === "no" && js(stage(l1.p, "check")) === js({ id: "check", state: "done", late: true, report: "Checked and accepted.", result: "accepted" }), js([l1.S.error, stage(l1.p, "check")])]);
    c.push(["…no wip.event, no wip.detail, no trail line; wip.updated the arrival; no arrival line", js(l1.p.wip.event) === js(before.wip.event) && l1.p.wip.detail === before.wip.detail && js(l1.p.trail) === js(before.trail) && l1.p.wip.updated === T(4) && l1.S.arrival == null, js([l1.p.wip.event, l1.p.wip.updated, l1.S.arrival])]);
    const lw = apply(L, "late-update", { event: "plan-stage", stage: "write", detail: "x" }, null, ["--arrived", T(5)]);
    c.push(["a late update for a stage with a time: refused", lw.a.status === 1 && /latest round has a time/.test(lw.S.error || ""), js(lw.S.error)]);
    const so2 = apply(L, "architecture-signed-off", { detail: "Approved." }, T(6)), pa = apply(L, "plan-accepted", { detail: "Final." }, T(7));
    const V = ((pa.p.wip.history || {}).architecture || []).slice(-1)[0] || {};
    c.push(["the frozen visit keeps the late stage as recorded", so2.a.status === 0 && pa.a.status === 0 && ((((V.architecture || {}).stages) || []).find(x => x.id === "check") || {}).late === true, js(V.architecture)]);
    /* plan-accepted with no sign-off, a stage before write consequences open */
    const N = lay("no-signoff", flight("research")); apply(N, "researched", {}, T(2)); apply(N, "plan-stage", { stage: "check", detail: "Drafted." }, T(3)); apply(N, "plan-stage", { stage: "report", detail: "Holds." }, T(4));
    const na = apply(N, "plan-accepted", { detail: "Final." }, T(5)), NV = ((na.p.wip.history || {}).architecture || []).slice(-1)[0] || {}, ns = (NV.architecture || {}).stages || [];
    c.push(["plan-accepted with report open: report done with no time, write consequences not recorded, the board at document", na.a.status === 0 && na.p.wip.step === "document" && (ns.find(x => x.id === "report") || {}).state === "done" && !("finished" in (ns.find(x => x.id === "report") || {})) && (ns.find(x => x.id === "consequences") || {}).state === "todo", js([na.S.error, NV.architecture])]);
  });

  /* ---------- 5. retime and reword ---------- */
  guard("retime and reword reach an architecture stage's time and report", c => {
    const B = lay("corrections", flight("research")); apply(B, "researched", {}, T(2));
    apply(B, "plan-stage", { stage: "check", detail: "The architecture is drafted in full." }, T(3));
    const rt = apply(B, "retime", { event: "plan-stage", from: T(3), to: "2026-11-15T10:02:30Z", reason: "the clock was read late" });
    c.push(["retime moves the stage's start and the closed stage's end", rt.a.status === 0 && stage(rt.p, "write").finished === "2026-11-15T10:02:30Z" && stage(rt.p, "check").started === "2026-11-15T10:02:30Z", js([rt.S.error, rt.p.wip.architecture])]);
    const rw = apply(B, "reword", { event: "plan-stage", recordedAt: "2026-11-15T10:02:30Z", from: "drafted in full", to: "drafted whole", reason: "plainer" });
    c.push(["reword finds the closed stage's report by its time, and the trail line with it", rw.a.status === 0 && stage(rw.p, "write").report === "The architecture is drafted whole." && (rw.p.trail || []).some(t => t.label === "Architecture stage: check/accept · write: done — The architecture is drafted whole."), js([rw.S.error, stage(rw.p, "write"), last(rw.p)])]);
  });

  /* ---------- 6. check.js ---------- */
  guard("check.js holds wip.architecture and an architecture visit's frozen copy to their form (plan/RULES.md §8)", c => {
    const base = flight("architecture", { event: { name: "plan-stage", at: T(2) }, updated: T(2), architecture: { stages: lib.seedPlanStages(lib.ARCH_STAGES, T(1)) } });
    const B = lay("check", base), good = run(CHECK, [B.dir]);
    c.push(["seeded stages pass", good.status === 0, good.stdout.split(/\r?\n/).filter(l => /FAIL/.test(l)).join(" | ")]);
    const bad = (name, f, re, board) => { const p = copy(board || base); f(p); wr(path.join(B.dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); run(EMBED, [B.dir]); const k = run(CHECK, [B.dir]); c.push([name, k.status !== 0 && re.test(k.stdout), k.stdout.split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 3).join(" | ")]); };
    bad("out of order (the plan step's order)", p => { const s = p.wip.architecture.stages; [s[2], s[3]] = [s[3], s[2]]; }, /wip\.architecture\.stages must be write, check, report, consequences, in that order/);
    bad("re-pass among them", p => { p.wip.architecture.stages.unshift({ id: "re-pass", state: "done" }); }, /must be write, check, report, consequences/);
    bad("two current", p => { p.wip.architecture.stages[1].state = "current"; }, /more than one current/);
    bad("a key it does not keep", p => { p.wip.architecture.since = T(1); }, /wip\.architecture holds "since": it keeps its stages alone/);
    bad("not { stages }", p => { p.wip.architecture = []; }, /wip\.architecture must be \{ stages \}/);
    bad("a frozen visit's stages out of form", p => { p.wip.history = { architecture: [{ since: T(0), ended: T(1), endedBy: "halted", to: "halted", held: true, architecture: { stages: [{ id: "check", state: "done" }] } }] }; }, /wip\.history\.architecture\[0\]\.architecture\.stages must be/);
    const ISSUE = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json")));
    const IB = { root: path.join(sc, "check-issue"), dir: path.join(sc, "check-issue", ...ISSUE.folder.split("/")) };
    fs.cpSync(sk("plan/examples/38-handshake-empty-name"), IB.dir, { recursive: true }); fs.mkdirSync(path.join(IB.root, ".git"), { recursive: true });
    const IP = copy(ISSUE); IP.wip = { ...(IP.wip || {}), architecture: { stages: lib.seedPlanStages(lib.ARCH_STAGES, T(1)) } }; wr(path.join(IB.dir, "plan.json"), JSON.stringify(IP, null, 2) + "\n"); wr(path.join(IB.dir, "dashboard.html"), PB); run(EMBED, [IB.dir]);
    const ki = run(CHECK, [IB.dir]);
    c.push(["wip.architecture on an issue board: fails", ki.status !== 0 && /an issue board keeps none/.test(ki.stdout), ki.stdout.split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 3).join(" | ")]);
    wr(path.join(B.dir, "plan.json"), JSON.stringify(base, null, 2) + "\n"); run(EMBED, [B.dir]);
  });

  /* ---------- 7. the template, its functions run with no browser ---------- */
  guard("the template: the architecture-stage list, the Disclosures, the Pills, the Legend, a finished visit and its account, the reconstruction", c => {
    const src = PB, grab = (re, what) => { const m = re.exec(src); if (!m) throw new Error("the template has no " + what); return m[0]; };
    const block = grab(/\/\* \[plan-stages\][\s\S]*?\/\* \[\/plan-stages\] \*\//, "[plan-stages] block");
    const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const ctx = vm.createContext({ esc, rich: s => esc(s), codeOnly: s => esc(s), when: s => `<time>${esc(s)}</time>`, okStamp: s => typeof s === "string" && !isNaN(Date.parse(s)), plural: (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`,
      pill: (def, extra, word) => `<span class="verdict-pill ${def.cls}${def.dash ? " dashed" : ""}"><i>${def.g}</i>${esc(word || def.label)}${extra || ""}</span>`,
      STG_PILL: { done: { g: "✓", label: "done", cls: "ink" }, current: { g: "▶", label: "in progress", cls: "accent" }, todo: { g: "…", label: "to come", cls: "neutral", dash: true } }, dotMark: "<span class=\"dot\"></span>", DISC_OPEN: new Map(),
      discItem: o => `<li class="${o.cls}" data-key="${esc(o.key)}" data-open="${o.cur ? 1 : 0}">${o.id ? `<b class="id">${esc(o.id)}</b>` : ""}<span class="nm">${o.name}</span>${o.meta || ""}${o.pill}<div class="body">${o.body || ""}</div></li>`,
      discList: items => items.length ? `<ol class="stg-list">${items.join("")}</ol>` : "", discKey: (o, what, id) => `${o.past ? "past" : "live"}:${o.issue}:${what}:${id}`, KEY_DISC: "KEY_DISC", KEY_STG_OPEN: "KEY_STG_OPEN", KEY_STG_RUN: "KEY_STG_RUN", KEY_STG_HELD: "KEY_STG_HELD", KEY_PAST_TODO: "KEY_PAST_TODO",
      stgChip: (l, v) => `<span><span class="l">${l}</span>${v}</span>` });
    vm.runInContext(block, ctx);
    const A = { stages: [{ id: "write", state: "done", started: T(1), finished: T(3), report: "Redrafted.", rounds: [{ started: T(0), finished: T(1), report: "Drafted." }] }, { id: "check", state: "current", started: T(3), rounds: [{ started: T(1), finished: T(2), report: "One system too many.", result: "sent back" }] }, { id: "report", state: "todo" }, { id: "consequences", state: "todo" }] };
    const keys = new Set(), strip = vm.runInContext(`pstageStrip(${js({ architecture: A })},"architecture",K,false,{run:"own"},"arch")`, Object.assign(ctx, { K: keys }));
    c.push(["the WIP list names them \"Architecture stages\", each with its number, its name with its round, its Pill and its brief", /Architecture stages · 1 of 4 done · check\/accept, round 2 in progress/.test(strip) && /data-stage="arch-check"/.test(strip) && /The architecture drafted, with its units/.test(strip) && /it ends at your sign-off/.test(strip) && (strip.match(/<li class="stg-row/g) || []).length === 4 && /aria-label="The architecture stages at a glance"/.test(strip), strip.slice(0, 500)]);
    c.push(["the stage at work in a FullPulse; a stage run before carries its latest earlier round", /stg-row cur fullpulse[^>]*data-stage="arch-check"/.test(strip) && /round 1 · ↺ sent back/.test(strip), strip.replace(/\s+/g, " ").slice(0, 600)]);
    c.push(["the Legend names them as architecture stages, a round sent back as the architecture's", [...keys].some(k => /an architecture stage to come/.test(k)) && [...keys].some(k => /sent the architecture back to be revised, not failed/.test(k)), js([...keys])]);
    c.push(["no list at another step, none for the plan kind at the architecture step, and none on an issue board's plan step for the architecture kind", vm.runInContext(`pstageStrip(${js({ architecture: A })},"document",new Set(),false,{run:"own"},"arch")`, ctx) === "" && vm.runInContext(`pstageStrip(${js({ architecture: A })},"architecture",new Set(),false,{run:"own"})`, ctx) === "" && vm.runInContext(`pstageStrip(${js({ plan: A })},"plan",new Set(),false,{run:"own"},"arch")`, ctx) === "", ""]);
    const held = vm.runInContext(`pstageStrip(${js({ architecture: A })},"architecture",new Set(),true,{run:"own"},"arch")`, ctx);
    c.push(["held while the run waits on you: the Ring alone", /stg-row cur held/.test(held) && !/fullpulse/.test(held) && /check\/accept, round 2 paused/.test(held), ""]);
    const items = vm.runInContext(`pstageItems(${js(A)},{issue:55},new Set(),"arch")`, ctx);
    c.push(["the step Panel draws each as a Disclosure keyed as an architecture stage, the current one open", (items.match(/<li /g) || []).length === 4 && /data-key="live:55:stage:arch-check" data-open="1"/.test(items) && /data-key="live:55:stage:arch-write" data-open="0"/.test(items) && /Round 1/.test(items) && /One system too many\./.test(items), items.slice(0, 400)]);
    const D = { stages: [{ id: "write", state: "done", started: T(1), finished: T(2) }, { id: "check", state: "done", late: true, report: "Checked.", result: "accepted" }, { id: "report", state: "done", started: T(3), finished: T(4), report: "Approved." }, { id: "consequences", state: "current", started: T(4) }] };
    const ds = vm.runInContext(`pstageStrip(${js({ architecture: D })},"architecture",new Set(),false,{run:"own"},"arch")`, ctx);
    c.push(["after the sign-off: write consequences in progress, check/accept recorded late, accepted", /accepted · time not recorded/.test(ds) && /stg-row cur fullpulse[^>]*data-stage="arch-consequences"/.test(ds) && /What the change does to its surroundings, written down/.test(ds), ds.replace(/\s+/g, " ").slice(0, 700)]);
    const past = vm.runInContext(`pstageItems(${js({ stages: [D.stages[0], { id: "check", state: "done", finished: T(3), result: "accepted" }, { id: "report", state: "current", started: T(3) }, { id: "consequences", state: "todo" }] })},{issue:55,past:true},new Set(),"arch")`, ctx);
    c.push(["a finished visit: none open, report in progress when the step ended, write consequences dashed, \"not recorded\"", !/data-open="1"/.test(past) && /in progress when the step ended/.test(past) && /not recorded/.test(past), past.replace(/\s+/g, " ").slice(0, 600)]);
    c.push(["a visit's short account counts them (\"3 of 4 architecture stages done\")", vm.runInContext(`pstageGist(${js(D)},"arch")`, ctx) === "3 of 4 architecture stages done" && vm.runInContext(`pstageGist(${js({ stages: [{ id: "write", state: "done" }, { id: "check", state: "todo" }] })})`, ctx) === "1 of 2 plan stages done", vm.runInContext(`pstageGist(${js(D)},"arch")`, ctx)]);
    const tr = ["Architecture stage: check/accept · write: done — Drafted.", "Architecture stage: write, round 2 · check/accept: sent back — One system too many.", "Architecture stage: check/accept · write: done", "Architecture stage: report · check/accept: accepted — Holds.", "Architecture signed off", "Architecture final, with its units"];
    c.push(["the template's reconstruction from the trail is lib.js's, at every point of it", [2, 4, 5, 6].every(n => js(vm.runInContext(`reconArchStages(${js(tr.slice(0, n))})`, ctx)) === js(lib.archStagesFromTrail(tr.slice(0, n)))) && vm.runInContext(`reconArchStages(${js(["Architecture signed off"])})`, ctx) === null, js(vm.runInContext(`reconArchStages(${js(tr)})`, ctx))]);
    c.push(["the template's architecture briefs are lib.js's, in the stages' order", js(vm.runInContext("ASTAGE_BRIEF", ctx)) === js(lib.ARCH_STAGE_BRIEFS) && js(Object.keys(vm.runInContext("ASTAGE_BRIEF", ctx))) === js(lib.ARCH_STAGES), ""]);
    c.push(["the WIP strip and the phase Card list them; the step Panel, the finished visit, the account, the reconstruction and the own Panel's rule call them",
      (src.match(/pstageStrip\(WIP,shownStep,pkeys,HALTED\|\|st==="escalated",\{run:"own"\},"arch"\)/g) || []).length === 2 && /pstageItems\(A,o,keys\|\|new Set\(\),"arch"\)/.test(src) && /pstageItems\(A,\{\.\.\.o,past:true\},keys,"arch"\)/.test(src) && /pstageGist\(V\.architecture,"arch"\)/.test(src) && /reconArchStages\(R\.trail/.test(src) && /const ownPanelAt=s=>OWN_PANEL_STEPS\.includes\(s\)\|\|\(s==="architecture"/.test(src) && !/OWN_PANEL_STEPS\.includes\(ownStep\)/.test(src), ""]);
    c.push(["no comment in the template names a dated decision", !/decided 20\d\d-\d\d-\d\d/.test(src), (src.match(/.{0,60}decided 20\d\d-\d\d-\d\d.{0,20}/) || [""])[0]]);
    if (FLOW) { const k = run(CHECK, [FLOW.dir, "--auto"]), f = (k.stdout + k.stderr).split(/\r?\n/).filter(l => /FAIL/.test(l) && !/browser: NOT RUN|^FAIL:? *\d+ problem/.test(l)); c.push(["check.js --auto passes the tracking board laid above", !f.length, f.slice(0, 4).join(" | ")]); }
  });
  return groups;
};

if (require.main === module) {
  /* no live GitHub, no machine cache: the private repositories from the fixture list (system/scripts/privaterefs.js) */
  process.env.DASHBOARDS_VERIFY = "1"; process.env.DASHBOARDS_PRIVATES = process.env.DASHBOARDS_PRIVATES || path.join(__dirname, "fixtures", "private-repositories.json");
  const args = process.argv.slice(2), oi = args.indexOf("--out"), out = oi >= 0 ? args[oi + 1] : fs.mkdtempSync(path.join(os.tmpdir(), "arch-stages-"));
  const sk = p => path.join(__dirname, "..", ...p.split("/"));
  let bad = 0; module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const f = cases.filter(x => !x[1]); bad += f.length;
    console.log(`${f.length ? "FAILED " : "checked"}  ${title}: ${cases.length - f.length}/${cases.length} cases`); f.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  console.log(`boards under ${path.join(out, "arch-stages")}`); process.exit(bad ? 1 : 0);
}
