// The cases of the plan stages on the issue board (plan/RULES.md §3, "The plan stages", "The late update"; §4, the plan-stage and late-update rows, "The
// event's time"; §8), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-plan-stages.js [--out <dir>].
// 1. lib.js: the stages seeded for each pass, a move forward, a stage passed over, going back (rounds, every stage after it back to come), the ways back,
//    the late update, plan-accepted's close, the trail line in the rules' words, the stages read back from the trail.
// 2. apply-event.js: a sub-issue's re-pass seeded at sized, the stage already open writing nothing at any step (the research step between), the
//    moves with their trail lines, a check sent back and accepted, a halt holding the stage, plan-accepted closing the pass and the visit frozen
//    with the stages; a writing pass from write at researched; a small fix and a board from before the stages keeping the plan step without them.
// 3. apply-event.js: the refusals (the step, the pass, the stage, a closed board, a tracking board with no architecture stages), each writing
//    nothing, enrich no; the PLAN STAGE ORDER warning.
// 4. apply-event.js late-update: a stage passed over recorded with no time, its report replaced by a second one, the same one a duplicate; refused for
//    the stage open or one after it, a stage with a time, once the plan is accepted, and with facts.at or --at; --arrived moving wip.updated alone,
//    never back, no arrival line, no wip.event, no trail line.
// 5. retime and reword reaching a stage's report; reword refusing a late update.
// 6. check.js holds wip.plan.stages and a visit's frozen copy to their form.
// 7. the tracking board's mirror of a unit's run carries the stages (unit.live.plan).
// 8. the template: the WIP Panel's plan-stage list, the step Panel's Disclosures, the Pills and the Legend, a finished visit, the unit Card's compact
//    list, the reconstruction (the template's functions run in a vm, with no browser), and the same reconstruction as lib.js.
// Each group returns [title, cases], a case [name, ok, detail]. The boards it lays are kept under <out>/plan-stages/.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesPlanStages(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const PB = rd(tp("plan/template/dashboard.html"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "plan-stages"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json")));
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const STEPS = ["sizing", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const T0 = "2026-11-15T10:00:00Z", T1 = "2026-11-15T10:10:00Z", T2 = "2026-11-15T10:20:00Z", T3 = "2026-11-15T10:30:00Z", T4 = "2026-11-15T10:40:00Z", T5 = "2026-11-15T10:50:00Z", T6 = "2026-11-15T11:00:00Z", T7 = "2026-11-15T11:10:00Z";
  /* a board in flight from the example: a sub-issue unless sub is false; at sizing, ready for its sized */
  const flight = (wip, o) => { o = o || {}; const x = copy(EX); Object.assign(x, { status: "planned", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; delete r.verdict; });
    x.milestones = x.milestones.filter(m => m.column === "gap"); if (x.impact) x.impact.basis = "plan"; if (o.sub !== false) x.parent = { issue: 36 }; else delete x.parent;
    x.wip = { questions: [], research: null, open: [], qa: [], plan: null, waitingOn: null, resume: null, steps: (o.steps || STEPS).slice(), step: "sizing", since: null, updated: "2026-11-15T09:00:00Z", current: [], detail: "", event: null, ...wip }; return x; };
  const lay = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true }); wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB);
    const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, plan }; };
  let nreq = 0;
  const req = (B, ev, facts) => wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: B.plan.repo, issue: B.plan.issue, event: ev, folder: B.plan.folder, facts: facts || {} }));
  const board = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  /* an event at its time (--at), or with the options given (a late update: --arrived, or none) */
  const apply = (B, ev, facts, at, opts) => { const a = run(APPLY, ["--event", req(B, ev, facts), "--worktree", B.root, "--no-gh", "--no-live", ...(opts || (at ? ["--at", at] : [])), "--json"]); return { a, S: parse(a), p: board(B) }; };
  const ids = p => ((p.wip.plan || {}).stages || []).map(x => `${x.id}:${x.state}`).join(" ");
  const stage = (p, id) => ((p.wip.plan || {}).stages || []).find(x => x.id === id) || {};
  const checkOk = B => { const k = run(CHECK, [B.dir]); return { ok: k.status === 0, out: (k.stdout + k.stderr).split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 4).join(" | ") }; };
  const unchanged = (B, before) => rd(path.join(B.dir, "plan.json")) === before;

  /* ---------- 1. lib.js ---------- */
  guard("lib.js: the plan stages seeded, moved, passed over, sent back and read back from the trail (plan/RULES.md §3, \"The plan stages\")", c => {
    c.push(["a re-pass from the parent runs five stages, a writing pass four from write, any other pass none", js(lib.planPassIds({ state: "re-pass", from: "parent" })) === js(["re-pass", "write", "check", "consequences", "report"]) && js(lib.planPassIds({ state: "writing" })) === js(["write", "check", "consequences", "report"]) && lib.planPassIds({ state: "re-pass", from: "qa", pass: 1 }) === null && lib.planPassIds({ state: "re-pass", from: "existing" }) === null, ""]);
    c.push(["the stages' names are the user's words", js(lib.PLAN_STAGES.map(id => lib.PLAN_STAGE_NAMES[id])) === js(["re-pass", "write", "check/accept", "write consequences", "report"]), ""]);
    c.push(["a stage read by its id or its name, case and backticks aside", lib.planStageId("`Check`") === "check" && lib.planStageId("check/accept") === "check" && lib.planStageId("Write consequences") === "consequences" && lib.planStageId("review") === null, ""]);
    const P = { stages: lib.seedPlanStages(lib.PLAN_STAGES, T0) };
    c.push(["seeded: the first current from its time, the rest to come with nothing recorded", js(P.stages[0]) === js({ id: "re-pass", state: "current", started: T0 }) && P.stages.slice(1).every(x => x.state === "todo" && Object.keys(x).length === 2), js(P.stages)]);
    const m1 = lib.planStageMove(P, "write", T1, "The slice holds against the code.");
    c.push(["a move: the stage before done at the event's time with the detail, the stage named current from it", P.stages[0].state === "done" && P.stages[0].finished === T1 && P.stages[0].report === "The slice holds against the code." && P.stages[1].state === "current" && P.stages[1].started === T1 && m1.closed === "re-pass" && m1.closedWord === "done", js(P.stages.slice(0, 2))]);
    c.push(["the stage already open: nothing changed", lib.planStageMove(P, "write", T2, "x").open === true && P.stages[1].started === T1 && P.stages[0].report === "The slice holds against the code.", ""]);
    lib.planStageMove(P, "check", T2, "The plan is drafted.");
    const back = lib.planStageMove(P, "write", T3, "Two sections to redraft.");
    const W = P.stages[1], C = P.stages[2];
    c.push(["going back: the check round closed, sent back, kept in its rounds, the check back to come", back.back && back.wayBack && back.closedWord === "sent back" && C.state === "todo" && js(C.rounds) === js([{ started: T2, finished: T3, report: "Two sections to redraft.", result: "sent back" }]) && !("started" in C), js(C)]);
    c.push(["going back: write opens its next round, its first kept in its rounds", W.state === "current" && W.started === T3 && js(W.rounds) === js([{ started: T1, finished: T2, report: "The plan is drafted." }]) && back.round === 2 && lib.planStageName(W) === "write, round 2", js(W)]);
    c.push(["the trail line in the rules' words, the round and the result named", lib.planStageLine(back, "write", "Two sections to redraft.") === "Plan stage: write, round 2 · check/accept: sent back — Two sections to redraft.", lib.planStageLine(back, "write", "Two sections to redraft.")]);
    lib.planStageMove(P, "check", T4, "Redrafted.");
    const acc = lib.planStageMove(P, "consequences", T5, "The plan holds against both landed siblings' contracts.");
    c.push(["a check round that opens consequences is accepted; its trail line as the rules give it", C.result === "accepted" && lib.planStageLine(acc, "consequences", "The plan holds against both landed siblings' contracts.") === "Plan stage: write consequences · check/accept: accepted — The plan holds against both landed siblings' contracts.", lib.planStageLine(acc, "consequences", "The plan holds against both landed siblings' contracts.")]);
    /* a stage passed over: report opened with consequences current would be the next; open re-pass from report instead: the first stage after report */
    lib.planStageMove(P, "report", T6, "Written.");
    const re = lib.planStageMove(P, "re-pass", T7, "The answer has the plan reconsidered.");
    c.push(["back from report to the first stage (an answer reconsidering the plan): every stage after it back to come, each keeping its rounds", re.back && re.wayBack && P.stages.slice(1).every(x => x.state === "todo" && x.rounds && x.rounds.length) && P.stages[2].rounds.length === 2 && P.stages[2].rounds[1].result === "accepted" && P.stages[0].state === "current" && P.stages[0].rounds.length === 1, js(P.stages.map(x => [x.id, x.state, (x.rounds || []).length]))]);
    const Q = { stages: lib.seedPlanStages(lib.PLAN_STAGES.slice(1), T0) };
    lib.planStageMove(Q, "check", T1, "Drafted.");
    const skip = lib.planStageMove(Q, "report", T2, "Checked.");
    c.push(["a stage passed over: the current one closed with no finished, the stages between to come", js(skip.passed) === js(["consequences"]) && Q.stages[1].state === "done" && !("finished" in Q.stages[1]) && Q.stages[1].result === "accepted" && Q.stages[2].state === "todo" && Q.stages[3].started === T2, js(Q.stages)]);
    const odd = lib.planStageMove(Q, "check", T3, "Back to the check.");
    c.push(["a move back no way gives is recorded the same way and named (wayBack false)", !odd.wayBack && Q.stages[1].state === "current" && Q.stages[3].state === "todo" && Q.stages[3].rounds.length === 1, js(odd)]);
    const L = { stages: lib.seedPlanStages(lib.PLAN_STAGES.slice(1), T0) }; lib.planStageMove(L, "report", T1, "Drafted and checked.");
    const l1 = lib.planStageLate(L, "check", "The plan checked.");
    c.push(["a late update: the stage passed over done, late, no time, its result read from the stage that ran after it", l1.changed && js(L.stages[1]) === js({ id: "check", state: "done", late: true, report: "The plan checked.", result: "accepted" }), js(L.stages[1])]);
    const l2 = lib.planStageLate(L, "check", "The plan checked again.");
    c.push(["a second late update replaces its report", l2.changed && l2.again && L.stages[1].report === "The plan checked again.", js(L.stages[1])]);
    c.push(["the same late update again changes nothing", lib.planStageLate(L, "check", "The plan checked again.").changed === false, ""]);
    c.push(["refused: the stage open, a stage after it, a stage with a time, a stage the pass has not", /stage open now/.test(lib.planStageLate(L, "report", "x").refused || "") && /latest round has a time/.test(lib.planStageLate(L, "write", "x").refused || "") && /no stage/.test(lib.planStageLate(L, "re-pass", "x").refused || ""), ""]);
    const K = { stages: lib.seedPlanStages(lib.PLAN_STAGES.slice(1), T0) }; lib.planStageMove(K, "check", T1, "Drafted.");
    c.push(["plan-accepted with a stage before report open: done with no time, the stages after it to come; a check closed so accepted", js(lib.planStagesClose(K, T2, "Accepted.")) === js({ closed: "check", passed: ["consequences", "report"] }) && !("finished" in K.stages[1]) && K.stages[1].result === "accepted" && K.stages[3].state === "todo", js(K.stages)]);
    const R = { stages: lib.seedPlanStages(lib.PLAN_STAGES.slice(1), T0) }; lib.planStageMove(R, "report", T1, "x"); lib.planStagesClose(R, T2, "Accepted as reported.");
    c.push(["plan-accepted at report: report done at its time, its report the detail", R.stages[3].finished === T2 && R.stages[3].report === "Accepted as reported.", js(R.stages[3])]);
    const tr = ["Sized; the plan starts", "Plan stage: write · re-pass: done — The slice holds.", "Plan stage: check/accept · write: done — Drafted.", "Plan stage: write, round 2 · check/accept: sent back — Two sections.", "Plan stage: check/accept · write: done", "Plan stage: report · check/accept: accepted — Holds.", "Plan accepted"];
    const rb = lib.planStagesFromTrail(tr, true);
    c.push(["read back from the trail: each move as its event made it, with no time, closed by Plan accepted", js(rb.map(x => [x.id, x.state, (x.rounds || []).length, x.result || null, x.report || null])) === js([["re-pass", "done", 0, null, "The slice holds."], ["write", "done", 1, null, null], ["check", "done", 1, "accepted", "Holds."], ["consequences", "todo", 0, null, null], ["report", "done", 0, null, null]]) && !JSON.stringify(rb).includes("started"), js(rb)]);
    c.push(["a trail with no plan stage line reads none", lib.planStagesFromTrail(["Plan accepted"], true) === null, ""]);
  });

  /* ---------- 2. the fast path: a sub-issue's re-pass, a writing pass, a pass with none ---------- */
  let SUBB = null;
  guard("apply-event.js: a sub-issue's plan step as five plan stages, from sized to plan-accepted (plan/RULES.md §3, §4)", c => {
    const B = lay("sub", flight({})); SUBB = B;
    const s = apply(B, "sized", { step: "plan" }, T0);
    c.push(["sized naming plan seeds the re-pass with its five stages, re-pass current from the event", s.a.status === 0 && s.p.wip.plan.state === "re-pass" && s.p.wip.plan.from === "parent" && ids(s.p) === "re-pass:current write:todo check:todo consequences:todo report:todo" && stage(s.p, "re-pass").started === T0, js([s.S.error, s.p.wip.plan])]);
    const o = apply(B, "plan-stage", { stage: "re-pass", detail: "x" }, T1);
    c.push(["plan-stage naming the stage open: nothing written, no error, enrich no", o.a.status === 0 && o.S.result === "nothing" && o.S.enrich === "no" && (o.S.applied || []).some(x => /re-pass is open already/.test(x)) && o.p.wip.event.name === "sized", js([o.S.result, o.S.applied, o.S.error])]);
    const r = apply(B, "research-started", { researching: [{ question: "q-one", rows: [] }] }, T1);
    const o2 = apply(B, "plan-stage", { stage: "re-pass", detail: "x" }, T2);
    c.push(["across the run's research step the re-pass stays current, and a send naming it there writes nothing, never refused", r.a.status === 0 && r.p.wip.step === "research" && ids(r.p).startsWith("re-pass:current") && o2.a.status === 0 && o2.S.result === "nothing", js([r.S.error, o2.S.result, o2.S.error])]);
    apply(B, "research-returned", { returned: { question: "q-one", findings: "research/q-one.md" } }, T2);
    const rs = apply(B, "researched", { documents: ["research/README.md"] }, T3);
    c.push(["researched keeps the re-pass standing, its stages as they stand", rs.a.status === 0 && rs.p.wip.step === "plan" && rs.p.wip.plan.from === "parent" && stage(rs.p, "re-pass").started === T0 && ids(rs.p).startsWith("re-pass:current"), js([rs.S.error, rs.p.wip.plan])]);
    const w = apply(B, "plan-stage", { stage: "write", detail: "The slice holds against the code as it is now." }, T4);
    const ln = (w.p.trail || []).slice(-1)[0] || {};
    c.push(["plan-stage write: re-pass done at its time with the detail, write current", w.a.status === 0 && w.S.enrich === "no" && js(stage(w.p, "re-pass")) === js({ id: "re-pass", state: "done", started: T0, finished: T4, report: "The slice holds against the code as it is now." }) && js(stage(w.p, "write")) === js({ id: "write", state: "current", started: T4 }), js([w.S.error, w.p.wip.plan])]);
    c.push(["its trail line, in the verdict column with no reference", ln.label === "Plan stage: write · re-pass: done — The slice holds against the code as it is now." && ln.column === "verdict" && !("ref" in ln), js(ln)]);
    c.push(["wip.event and wip.detail written; no step, no glow, no row moved", w.p.wip.event.name === "plan-stage" && w.p.wip.event.at === T4 && w.p.wip.detail === "The slice holds against the code as it is now." && w.p.wip.step === "plan" && js(w.p.wip.current) === js(rs.p.wip.current) && js(w.p.rows) === js(rs.p.rows), js([w.p.wip.event, w.p.wip.detail, w.p.wip.current])]);
    const dup = apply(B, "plan-stage", { stage: "write", detail: "The slice holds against the code as it is now." }, T4);
    c.push(["the same event twice writes nothing more", dup.a.status === 0 && ["nothing", "duplicate"].includes(dup.S.result) && js(dup.p) === js(w.p), js(dup.S.result)]);
    apply(B, "plan-stage", { stage: "check", detail: "The plan is drafted." }, T5);
    const sb = apply(B, "plan-stage", { stage: "write", detail: "Two sections to redraft." }, T6);
    c.push(["the check sends the plan back: its round sent back and kept, write round 2", sb.a.status === 0 && stage(sb.p, "check").state === "todo" && stage(sb.p, "check").rounds[0].result === "sent back" && stage(sb.p, "write").rounds.length === 1 && stage(sb.p, "write").state === "current" && /^Plan stage: write, round 2 · check\/accept: sent back — Two sections to redraft\.$/.test(((sb.p.trail || []).slice(-1)[0] || {}).label) && !(sb.S.warnings || []).some(x => /PLAN STAGE ORDER/.test(x)), js([sb.S.error, sb.p.wip.plan.stages, sb.S.warnings])]);
    apply(B, "plan-stage", { stage: "check", detail: "Redrafted." }, T7);
    const T8 = "2026-11-15T11:20:00Z", T9 = "2026-11-15T11:30:00Z", T10 = "2026-11-15T11:40:00Z", T11 = "2026-11-15T11:50:00Z", T12 = "2026-11-15T12:00:00Z";
    const cq = apply(B, "plan-stage", { stage: "consequences", detail: "The plan holds against both landed siblings' contracts." }, T8);
    c.push(["the check accepted: consequences opens; the trail line reads accepted", cq.a.status === 0 && stage(cq.p, "check").result === "accepted" && ((cq.p.trail || []).slice(-1)[0] || {}).label === "Plan stage: write consequences · check/accept: accepted — The plan holds against both landed siblings' contracts.", js(stage(cq.p, "check"))]);
    apply(B, "plan-stage", { stage: "report", detail: "consequences.md written." }, T9);
    const h = apply(B, "halted", { waitingOn: "Two Considerations", questions: [{ text: "Which way?", options: ["A", "B"] }] }, T10);
    c.push(["a halt holds the report stage current", h.a.status === 0 && h.p.wip.step === "halted" && h.p.wip.resume === "plan" && stage(h.p, "report").state === "current", js([h.S.error, ids(h.p)])]);
    const hv = (h.p.wip.history.plan || []).slice(-1)[0] || {};
    c.push(["the visit the halt ended freezes the stages as they stood", hv.held === true && ((hv.plan || {}).stages || []).find(x => x.id === "report").state === "current", js(hv.plan)]);
    apply(B, "resumed", {}, T11);
    const pa = apply(B, "plan-accepted", { detail: "The plan is accepted as reported." }, T12);
    const v = (pa.p.wip.history.plan || []).slice(-1)[0] || {}, vs = ((v.plan || {}).stages || []);
    c.push(["plan-accepted: the pass cleared, the board at its branch step", pa.a.status === 0 && pa.p.wip.plan === null && pa.p.wip.step === "branch", js([pa.S.error, pa.p.wip.step])]);
    c.push(["the visit it ended holds the stages as plan-accepted closed them: report done at its time, its report the detail", v.endedBy === "plan-accepted" && vs.length === 5 && vs.every(x => x.state === "done") && (vs.find(x => x.id === "report") || {}).finished === T12 && (vs.find(x => x.id === "report") || {}).report === "The plan is accepted as reported.", js(v)]);
    c.push(["plan-accepted keeps its own trail line, no stage line", ((pa.p.trail || []).slice(-1)[0] || {}).label === "Plan accepted", js((pa.p.trail || []).slice(-2))]);
    const k = checkOk(B); c.push(["check.js passes the board", k.ok, k.out]);
  });

  guard("apply-event.js: a writing pass from write, and the plan steps that keep no stages (plan/RULES.md §3, S5, S6)", c => {
    const B = lay("writing", flight({ step: "research", since: T0, updated: T0, event: { name: "research-started", at: T0 }, research: { phase: "research", drafted: 1, since: { research: T0 } }, questions: [{ question: "q-a", rows: [], findings: "research/q-a.md", state: "returned", started: T0, returned: T0 }] }, { sub: false }));
    const r = apply(B, "researched", { documents: ["research/README.md"] }, T1);
    c.push(["researched on an issue that is no sub-issue: a writing pass with its four stages, write current from the event", r.a.status === 0 && r.p.wip.plan.state === "writing" && ids(r.p) === "write:current check:todo consequences:todo report:todo" && stage(r.p, "write").started === T1, js([r.S.error, r.p.wip.plan])]);
    const o = apply(B, "plan-stage", { stage: "write", detail: "x" }, T2);
    c.push(["the planner's first write writes nothing (the board opened it with the pass)", o.a.status === 0 && o.S.result === "nothing", js(o.S.result)]);
    const rp = apply(B, "plan-stage", { stage: "re-pass", detail: "x" }, T2);
    c.push(["re-pass on a writing pass is refused, nothing written, enrich no", rp.a.status === 1 && /writing pass runs from write/.test(rp.S.error || "") && rp.S.enrich === "no" && js(rp.p) === js(o.p), js([rp.S.error, rp.S.enrich])]);
    /* a sub-issue sized at research, then researched with no pass standing: the re-pass from its parent, five stages */
    const B2 = lay("sub-research", flight({ step: "research", since: T0, updated: T0, event: { name: "research-started", at: T0 }, research: { phase: "research", drafted: 1, since: { research: T0 } }, questions: [{ question: "q-a", rows: [], findings: "research/q-a.md", state: "returned", started: T0, returned: T0 }] }));
    const r2 = apply(B2, "researched", { documents: ["research/README.md"] }, T1);
    c.push(["a sub-issue's researched with no pass standing opens its re-pass from the parent, with five stages", r2.a.status === 0 && r2.p.wip.plan.state === "re-pass" && r2.p.wip.plan.from === "parent" && ids(r2.p).startsWith("re-pass:current"), js([r2.S.error, r2.p.wip.plan])]);
    /* a halt at research resumed at the plan step, no pass standing: the pass opens there */
    const B3 = lay("resumed", flight({ step: "halted", resume: "research", waitingOn: "An answer", since: T0, updated: T0, event: { name: "halted", at: T0 } }, { sub: false }));
    const r3 = apply(B3, "resumed", { step: "plan" }, T1);
    c.push(["resumed at the plan step with no pass standing opens the pass with its stages", r3.a.status === 0 && r3.p.wip.plan.state === "writing" && ids(r3.p).startsWith("write:current") && stage(r3.p, "write").started === T1, js([r3.S.error, r3.p.wip.plan])]);
    /* a small fix: no research step on its line, no stages */
    const B4 = lay("small-fix", flight({}, { sub: false, steps: ["sizing", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] }));
    const s4 = apply(B4, "sized", { step: "plan" }, T0), p4 = apply(B4, "plan-stage", { stage: "write", detail: "x" }, T1);
    c.push(["a small fix's plan keeps no stages; plan-stage is refused there, naming it", s4.a.status === 0 && !(s4.p.wip.plan || {}).stages && p4.a.status === 1 && /no plan stages \(a small fix's plan\)/.test(p4.S.error || ""), js([s4.p.wip.plan, p4.S.error])]);
    /* a small fix sub-issue: the same */
    const B5 = lay("small-fix-sub", flight({}, { steps: ["sizing", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] }));
    const s5 = apply(B5, "sized", { step: "plan" }, T0);
    c.push(["a small fix's re-pass from its parent keeps no stages either", s5.a.status === 0 && s5.p.wip.plan.state === "re-pass" && !s5.p.wip.plan.stages, js(s5.p.wip.plan)]);
    /* a board from before the stages: a pass standing with none */
    const B6 = lay("before", flight({ step: "plan", since: T0, updated: T0, event: { name: "researched", at: T0 }, plan: { state: "writing", since: T0 }, current: ["considered", "verdict"] }, { sub: false }));
    const p6 = apply(B6, "plan-stage", { stage: "check", detail: "x" }, T1);
    c.push(["a board from before the stages: refused, naming it, nothing written", p6.a.status === 1 && /a board from before the plan stages/.test(p6.S.error || "") && !board(B6).wip.plan.stages, js(p6.S.error)]);
    const k = checkOk(B); c.push(["check.js passes the writing pass's board", k.ok, k.out]);
  });

  /* ---------- 3. the refusals and the warning ---------- */
  guard("apply-event.js: plan-stage refused where plan/RULES.md §3 says, nothing written; PLAN STAGE ORDER", c => {
    const B = lay("refuse", flight({}, { sub: false })); apply(B, "sized", { step: "research" }, T0);
    apply(B, "research-started", { researching: [{ question: "q-one", rows: [] }] }, T0);
    const pre = rd(path.join(B.dir, "plan.json"));
    const a = apply(B, "plan-stage", { stage: "check", detail: "x" }, T1);
    c.push(["at another step: refused, the step named, nothing written, enrich no, the why says no fill writes it", a.a.status === 1 && /stands at research, not at its plan step/.test(a.S.error || "") && a.S.enrich === "no" && /no fill writes the plan stages/.test((a.S.why || []).join(" ")) && unchanged(B, pre), js([a.S.error, a.S.enrich, a.S.why])]);
    const b = apply(B, "plan-stage", { detail: "x" }, T1);
    c.push(["with no facts.stage: refused", b.a.status === 1 && /carries no facts.stage/.test(b.S.error || "") && unchanged(B, pre), js(b.S.error)]);
    const B2 = lay("refuse-2", flight({}, { sub: false })); apply(B2, "sized", { step: "research" }, T0); apply(B2, "researched", {}, T0);
    const pre2 = rd(path.join(B2.dir, "plan.json"));
    const u = apply(B2, "plan-stage", { stage: "review", detail: "x" }, T1);
    c.push(["a stage id it does not know: refused", u.a.status === 1 && /"review" is no plan stage/.test(u.S.error || "") && unchanged(B2, pre2), js(u.S.error)]);
    apply(B2, "plan-stage", { stage: "check", detail: "Drafted." }, T1); apply(B2, "plan-stage", { stage: "report", detail: "Checked." }, T2);
    const odd = apply(B2, "plan-stage", { stage: "check", detail: "Again." }, T3);
    c.push(["a move back no way gives is recorded and warned on (PLAN STAGE ORDER), never refused", odd.a.status === 0 && (odd.S.warnings || []).some(x => /PLAN STAGE ORDER: check\/accept opened again after report/.test(x)) && stage(odd.p, "check").state === "current", js([odd.S.error, odd.S.warnings])]);
    const k = run(CHECK, [B2.dir]);
    c.push(["check.js warns on the board it left (PLAN STAGE ORDER)", /PLAN STAGE ORDER/.test(k.stdout) && k.status === 0, k.stdout.split(/\r?\n/).filter(l => /PLAN STAGE|FAIL/.test(l)).join(" | ")]);
    /* a landed board */
    const L = flight({ step: "landed", since: T0, updated: T0, event: { name: "landed", at: T0 } }); L.status = "built";
    const BL = lay("landed", L), preL = rd(path.join(BL.dir, "plan.json")), l = apply(BL, "plan-stage", { stage: "write", detail: "x" }, T1);
    c.push(["a landed board: refused, kept as it closed", l.a.status === 1 && /has landed/.test(l.S.error || "") && unchanged(BL, preL), js(l.S.error)]);
    /* a tracking board: no architecture stages yet */
    const TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json"))); TRK.status = "planned"; TRK.wip = { ...TRK.wip, step: "architecture", since: T0, updated: T0, event: { name: "researched", at: T0 }, current: ["considered"] };
    const BT = lay("tracking", TRK), preT = rd(path.join(BT.dir, "plan.json")), t = apply(BT, "plan-stage", { stage: "write", detail: "x" }, T1);
    c.push(["a tracking board with no architecture stages: refused, saying so", t.a.status === 1 && /tracking board takes it at its architecture step alone, as an architecture stage, and only where the board has architecture stages; this board has none/.test(t.S.error || "") && unchanged(BT, preT) && t.S.enrich === "no", js([t.S.error, t.S.enrich])]);
    const tl = apply(BT, "late-update", { event: "plan-stage", stage: "write", detail: "x" }, null, ["--arrived", T1]);
    c.push(["a late update on that tracking board: refused alike", tl.a.status === 1 && /architecture stages; this board has none/.test(tl.S.error || "") && unchanged(BT, preT), js(tl.S.error)]);
  });

  /* ---------- 4. the late update ---------- */
  guard("apply-event.js late-update: a stage passed over recorded with no time (plan/RULES.md §3, \"The late update\"; §4, \"The event's time\")", c => {
    const B = lay("late", flight({}, { sub: false })); apply(B, "sized", { step: "research" }, T0); apply(B, "researched", {}, T1);
    apply(B, "plan-stage", { stage: "check", detail: "Drafted." }, T2);
    const sk2 = apply(B, "plan-stage", { stage: "report", detail: "Checked and accepted." }, T3);
    c.push(["a stage passed over: check closed with no finished, consequences to come, report current", sk2.a.status === 0 && stage(sk2.p, "check").state === "done" && !("finished" in stage(sk2.p, "check")) && stage(sk2.p, "check").result === "accepted" && stage(sk2.p, "consequences").state === "todo" && stage(sk2.p, "report").state === "current", js(sk2.p.wip.plan.stages)]);
    const pre = sk2.p, l = apply(B, "late-update", { event: "plan-stage", stage: "consequences", detail: "consequences.md written." }, null, ["--arrived", T4]);
    c.push(["the late update records it done, late, no time, its report the detail", l.a.status === 0 && l.S.enrich === "no" && js(stage(l.p, "consequences")) === js({ id: "consequences", state: "done", late: true, report: "consequences.md written." }), js([l.S.error, stage(l.p, "consequences")])]);
    c.push(["no wip.event, no wip.detail, no trail line, no step; wip.updated the arrival", js(l.p.wip.event) === js(pre.wip.event) && l.p.wip.detail === pre.wip.detail && js(l.p.trail) === js(pre.trail) && l.p.wip.step === "plan" && l.p.wip.updated === T4, js([l.p.wip.event, l.p.wip.updated])]);
    c.push(["no arrival line: its missing facts.at is not stamped", l.S.arrival == null, js(l.S.arrival)]);
    const l2 = apply(B, "late-update", { event: "plan-stage", stage: "consequences", detail: "consequences.md written, the adoption named." }, null, ["--arrived", T2]);
    c.push(["a second late update replaces its report; an arrival before wip.updated never moves it back", l2.a.status === 0 && stage(l2.p, "consequences").report === "consequences.md written, the adoption named." && l2.p.wip.updated === T4, js([l2.S.error, l2.p.wip.updated])]);
    const l3 = apply(B, "late-update", { event: "plan-stage", stage: "consequences", detail: "consequences.md written, the adoption named." }, null, ["--arrived", T5]);
    c.push(["the same late update again: a duplicate, nothing written", l3.a.status === 0 && l3.S.result === "duplicate" && js(l3.p) === js(l2.p), js([l3.S.result, l3.S.applied])]);
    const p0 = rd(path.join(B.dir, "plan.json"));
    const r1 = apply(B, "late-update", { event: "plan-stage", stage: "report", detail: "x" }, null, ["--arrived", T5]);
    const r2 = apply(B, "late-update", { event: "plan-stage", stage: "write", detail: "x" }, null, ["--arrived", T5]);
    const r3 = apply(B, "late-update", { event: "plan-stage", stage: "consequences", detail: "x", at: T5 }, null, ["--arrived", T5]);
    const r4 = apply(B, "late-update", { event: "plan-stage", stage: "consequences", detail: "x" }, null, ["--at", T5]);
    const r5 = apply(B, "late-update", { event: "qa-pass", stage: "consequences", detail: "x" }, null, ["--arrived", T5]);
    c.push(["refused for the stage open now", r1.a.status === 1 && /stage open now/.test(r1.S.error || ""), js(r1.S.error)]);
    c.push(["refused for a stage whose latest round has a time", r2.a.status === 1 && /latest round has a time/.test(r2.S.error || ""), js(r2.S.error)]);
    c.push(["refused with a facts.at, and with --at", r3.a.status === 1 && /carries no facts.at/.test(r3.S.error || "") && r4.a.status === 1 && /raised with --at/.test(r4.S.error || ""), js([r3.S.error, r4.S.error])]);
    c.push(["refused where facts.event is not plan-stage", r5.a.status === 1 && /facts.event names the event/.test(r5.S.error || ""), js(r5.S.error)]);
    c.push(["every refusal writes nothing, enrich no", unchanged(B, p0) && [r1, r2, r3, r4, r5].every(x => x.S.enrich === "no"), ""]);
    const pa = apply(B, "plan-accepted", { detail: "Accepted." }, T6);
    const r6 = apply(B, "late-update", { event: "plan-stage", stage: "consequences", detail: "x" }, null, ["--arrived", T7]);
    c.push(["once the plan is accepted: refused", pa.a.status === 0 && r6.a.status === 1 && /the plan was accepted/.test(r6.S.error || ""), js([pa.S.error, r6.S.error])]);
    const v = (pa.p.wip.history.plan || []).slice(-1)[0] || {};
    c.push(["the frozen visit keeps the late stage as recorded", (((v.plan || {}).stages || []).find(x => x.id === "consequences") || {}).late === true, js(v.plan)]);
    const k = checkOk(B); c.push(["check.js passes the board", k.ok, k.out]);
    /* without --arrived, the time it is applied moves wip.updated */
    const B2 = lay("late-now", flight({}, { sub: false })); apply(B2, "sized", { step: "research" }, T0); apply(B2, "researched", {}, T1); apply(B2, "plan-stage", { stage: "report", detail: "All done." }, T2);
    const n = apply(B2, "late-update", { event: "plan-stage", stage: "write", detail: "x" }, null, []);
    c.push(["raised with no option: a stage with a time refused, the same as with one", n.a.status === 1 && /latest round has a time/.test(n.S.error || ""), js(n.S.error)]);
    const n2 = apply(B2, "late-update", { event: "plan-stage", stage: "check", detail: "Checked.", open: [{ text: "A point raised with no time." }], tests: { added: [] } }, null, []);
    c.push(["raised with no option: wip.updated takes the time it is applied, after the board's", n2.a.status === 0 && Date.parse(n2.p.wip.updated) > Date.parse(T2), js(n2.p.wip.updated)]);
    c.push(["a late update takes no open point and no tests (it has no time to stamp them at): both named unread", js((n2.S.unread || []).slice().sort()) === js(["open", "tests"]) && !(n2.p.wip.open || []).length && !n2.p.tests, js([n2.S.unread, n2.p.wip.open])]);
  });

  /* ---------- 5. retime and reword ---------- */
  guard("retime and reword reach a plan stage's report; reword refuses a late update", c => {
    const B = lay("corrections", flight({}, { sub: false })); apply(B, "sized", { step: "research" }, T0); apply(B, "researched", {}, T1);
    apply(B, "plan-stage", { stage: "check", detail: "The plan is drafted in full." }, T2);
    const rt = apply(B, "retime", { event: "plan-stage", from: T2, to: "2026-11-15T10:19:00Z", reason: "the clock was read late" });
    c.push(["retime moves the stage's start and the closed stage's end", rt.a.status === 0 && stage(rt.p, "write").finished === "2026-11-15T10:19:00Z" && stage(rt.p, "check").started === "2026-11-15T10:19:00Z", js([rt.S.error, rt.p.wip.plan.stages])]);
    const rw = apply(B, "reword", { event: "plan-stage", recordedAt: "2026-11-15T10:19:00Z", from: "drafted in full", to: "drafted whole", reason: "plainer" });
    c.push(["reword finds the closed stage's report by its time, and the detail and the trail line with it", rw.a.status === 0 && stage(rw.p, "write").report === "The plan is drafted whole." && rw.p.wip.detail === "The plan is drafted whole." && (rw.p.trail || []).some(t => t.label === "Plan stage: check/accept · write: done — The plan is drafted whole."), js([rw.S.error, stage(rw.p, "write"), rw.p.wip.detail])]);
    const rl = apply(B, "reword", { event: "late-update", recordedAt: T2, from: "x", to: "y", reason: "z" });
    c.push(["reword of a late update is refused: a second late update replaces its report", rl.a.status === 1 && /second late update/.test(rl.S.error || ""), js(rl.S.error)]);
    const rr = apply(B, "retime", { event: "late-update", from: T2, to: T3, reason: "z" });
    c.push(["retime of a late update is refused: it has no time", rr.a.status === 1, js(rr.S.error)]);
  });

  /* ---------- 6. check.js ---------- */
  guard("check.js holds wip.plan.stages and a visit's frozen copy to their form (plan/RULES.md §8)", c => {
    const base = flight({ step: "plan", since: T0, updated: T1, event: { name: "plan-stage", at: T1 }, current: ["considered", "verdict"], plan: { state: "re-pass", from: "parent", since: T0, stages: lib.seedPlanStages(lib.PLAN_STAGES, T0) } });
    const B = lay("check", base), good = run(CHECK, [B.dir]);
    c.push(["a seeded pass passes", good.status === 0, good.stdout.split(/\r?\n/).filter(l => /FAIL/.test(l)).join(" | ")]);
    const bad = (name, f, re) => { const p = copy(base); f(p); wr(path.join(B.dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); run(EMBED, [B.dir]); const k = run(CHECK, [B.dir]); c.push([name, k.status !== 0 && re.test(k.stdout), k.stdout.split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 3).join(" | ")]); };
    bad("an id it does not know", p => { p.wip.plan.stages[1].id = "draft"; }, /must be re-pass, write, check, consequences, report/);
    bad("out of order", p => { const s = p.wip.plan.stages; [s[1], s[2]] = [s[2], s[1]]; }, /in that order/);
    bad("re-pass on a writing pass", p => { p.wip.plan.state = "writing"; delete p.wip.plan.from; }, /re-pass on a writing pass/);
    bad("stages on a pass that has none", p => { p.wip.plan.from = "qa"; p.wip.plan.pass = 1; }, /has no plan stages/);
    bad("two current", p => { p.wip.plan.stages[1].state = "current"; }, /more than one current/);
    bad("a time that is no time, and one out of order", p => { Object.assign(p.wip.plan.stages[0], { state: "done", started: T1, finished: T0 }); p.wip.plan.stages[1] = { id: "write", state: "current", started: "soon" }; }, /started .* is after finished|is a UTC ISO time/);
    bad("a result on a stage that is no check", p => { Object.assign(p.wip.plan.stages[0], { state: "done", finished: T1, result: "accepted" }); p.wip.plan.stages[1] = { id: "write", state: "current", started: T1 }; }, /on the check\/accept stage alone/);
    bad("a check result not accepted or sent back", p => { p.wip.plan.stages[0] = { id: "re-pass", state: "done", started: T0, finished: T1 }; p.wip.plan.stages[1] = { id: "write", state: "done", started: T1, finished: T1 }; p.wip.plan.stages[2] = { id: "check", state: "done", late: true, result: "passed" }; p.wip.plan.stages[3] = { id: "consequences", state: "current", started: T1 }; }, /"accepted" or "sent back"/);
    bad("late beside a time", p => { p.wip.plan.stages[0] = { id: "re-pass", state: "done", started: T0, late: true }; p.wip.plan.stages[1] = { id: "write", state: "current", started: T1 }; }, /recorded late has no time/);
    bad("a round out of form", p => { p.wip.plan.stages[1].rounds = [{ started: T0, finished: T1, state: "done" }]; }, /a round does not keep/);
    bad("a stage to come that records its latest round", p => { p.wip.plan.stages[2].report = "x"; }, /to come and records report/);
    bad("a frozen visit's stages out of form", p => { p.wip.history = { plan: [{ since: T0, ended: T1, endedBy: "halted", to: "halted", plan: { state: "re-pass", from: "parent", stages: [{ id: "write", state: "done" }] } }] }; }, /wip\.history\.plan\[0\]\.plan\.stages must be/);
    wr(path.join(B.dir, "plan.json"), JSON.stringify(base, null, 2) + "\n"); run(EMBED, [B.dir]);
  });

  /* ---------- 7. the mirror ---------- */
  guard("the tracking board's mirror of a unit's run carries its plan stages (unit.live.plan)", c => {
    const TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
    const root = path.join(sc, "mirror"), tdir = path.join(root, ...TRK.folder.split("/")); fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    const unit = TRK.rows.find(x => x.unit && x.unit.issue === 62);
    /* the unit's own board: the example in flight, at its plan step, its re-pass seeded */
    const SUB = flight({ step: "plan", since: T0, updated: T0, event: { name: "sized", at: T0 }, current: ["considered", "verdict"], plan: { state: "re-pass", from: "parent", since: T0, stages: lib.seedPlanStages(lib.PLAN_STAGES, T0) } });
    Object.assign(SUB, { issue: 62, slug: "62-http-core", repo: TRK.repo, folder: TRK.folder + "/62-http-core", parent: { issue: TRK.issue, board: "../dashboard.html" } });
    TRK.wip = { ...TRK.wip, current: [unit.id + ".built"], next: "test-support" };
    wr(path.join(tdir, "plan.json"), JSON.stringify(TRK, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), PB);
    const sdir = path.join(root, ...SUB.folder.split("/")); wr(path.join(sdir, "plan.json"), JSON.stringify(SUB, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), PB);
    run(EMBED, [sdir]); run(EMBED, [tdir]);
    const B = { root, dir: sdir, plan: SUB }, r = apply(B, "plan-stage", { stage: "write", detail: "The slice holds." }, T1);
    const tp = JSON.parse(rd(path.join(tdir, "plan.json"))), mir = (tp.rows.find(x => x.id === unit.id).unit.live || {});
    c.push(["the tracking board re-embedded, its unit's mirror carrying the stages as the unit's board holds them", r.a.status === 0 && /re-embedded/.test(r.S.parent || "") && js(((mir.plan || {}).stages || []).map(x => x.id + ":" + x.state)) === js(["re-pass:done", "write:current", "check:todo", "consequences:todo", "report:todo"]), js([r.S.error, r.S.parent, mir.plan])]);
    const k = run(CHECK, [tdir]); c.push(["check.js passes the tracking board", k.status === 0, k.stdout.split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 3).join(" | ")]);
  });

  /* ---------- 8. the template, its functions run with no browser ---------- */
  guard("the template: the plan-stage list, the Disclosures, the Pills, the Legend, a finished visit, the compact list, the reconstruction", c => {
    const src = PB, grab = (re, what) => { const m = re.exec(src); if (!m) throw new Error("the template has no " + what); return m[0]; };
    const block = grab(/\/\* \[plan-stages\][\s\S]*?\/\* \[\/plan-stages\] \*\//, "[plan-stages] block");
    const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const ctx = vm.createContext({ esc, rich: s => esc(s), codeOnly: s => esc(s), when: s => `<time>${esc(s)}</time>`, okStamp: s => typeof s === "string" && !isNaN(Date.parse(s)), plural: (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`,
      pill: (def, extra, word) => `<span class="verdict-pill ${def.cls}${def.dash ? " dashed" : ""}"><i>${def.g}</i>${esc(word || def.label)}${extra || ""}</span>`, STATES: { "in-progress": { g: "▶", label: "in progress", cls: "accent" } },
      STG_PILL: { done: { g: "✓", label: "done", cls: "ink" }, current: { g: "▶", label: "in progress", cls: "accent" }, todo: { g: "…", label: "to come", cls: "neutral", dash: true } }, dotMark: "<span class=\"dot\"></span>", DISC_OPEN: new Map(),
      discItem: o => `<li class="${o.cls}" data-key="${esc(o.key)}" data-open="${o.cur ? 1 : 0}">${o.id ? `<b class="id">${esc(o.id)}</b>` : ""}<span class="nm">${o.name}</span>${o.meta || ""}${o.pill}<div class="body">${o.body || ""}</div></li>`,
      discList: items => items.length ? `<ol class="stg-list">${items.join("")}</ol>` : "", discKey: (o, what, id) => `${o.past ? "past" : "live"}:${o.issue}:${what}:${id}`, KEY_DISC: "KEY_DISC", KEY_STG_OPEN: "KEY_STG_OPEN", KEY_STG_RUN: "KEY_STG_RUN", KEY_STG_HELD: "KEY_STG_HELD", KEY_PAST_TODO: "KEY_PAST_TODO",
      stgChip: (l, v) => `<span><span class="l">${l}</span>${v}</span>`, out: null });
    vm.runInContext(block, ctx);
    const P = { state: "re-pass", from: "parent", stages: [{ id: "re-pass", state: "done", started: T0, finished: T1, report: "The slice holds." }, { id: "write", state: "current", started: T3, rounds: [{ started: T1, finished: T2, report: "Drafted." }] }, { id: "check", state: "todo", rounds: [{ started: T2, finished: T3, report: "Two sections.", result: "sent back" }] }, { id: "consequences", state: "todo" }, { id: "report", state: "todo" }] };
    const keys = new Set(), strip = vm.runInContext(`pstageStrip(${js({ plan: P })},"plan",K,false,{run:"own"})`, Object.assign(ctx, { K: keys }));
    c.push(["the WIP Panel lists each plan stage: its number, its name with its round, its Pill, its brief", /data-stage="plan-write"/.test(strip) && />2</.test(strip) && /write, round 2/.test(strip) && /The plan drafted in full/.test(strip) && /The parent&#39;s design|The parent's design/.test(strip) && (strip.match(/<li class="stg-row/g) || []).length === 5, strip.slice(0, 400)]);
    c.push(["the stage at work in a FullPulse; a stage run before carries its latest earlier round beside its Pill", /stg-row cur fullpulse[^>]*data-stage="plan-write"/.test(strip) && /round 1 · ↺ sent back/.test(strip), strip.replace(/\s+/g, " ").slice(0, 600)]);
    c.push(["the Legend names what it drew: a stage at work, a click opens it, sent back", keys.has("KEY_STG_RUN") && keys.has("KEY_STG_OPEN") && [...keys].some(k => /sent back/.test(k)), js([...keys])]);
    const held = vm.runInContext(`pstageStrip(${js({ plan: P })},"plan",new Set(),true,{run:"own"})`, ctx);
    c.push(["held while the run waits on you: the Ring alone", /stg-row cur held/.test(held) && !/fullpulse/.test(held), ""]);
    c.push(["no list at another step, or for a pass with no stages", vm.runInContext(`pstageStrip(${js({ plan: P })},"implementation",new Set(),false,{run:"own"})`, ctx) === "" && vm.runInContext(`pstageStrip(${js({ plan: { state: "writing" } })},"plan",new Set(),false,{run:"own"})`, ctx) === "", ""]);
    const compact = vm.runInContext(`pstageStrip(${js({ plan: P })},"plan",new Set(),false,{run:"62",compact:true})`, ctx);
    c.push(["the unit Card's compact list: number, name and status, no brief", (compact.match(/<li class="stg-row/g) || []).length === 5 && !/The plan drafted in full/.test(compact) && /data-run="62"/.test(compact), compact.slice(0, 300)]);
    const k2 = new Set(), items = vm.runInContext(`pstageItems(${js(P)},{issue:40},K2)`, Object.assign(ctx, { K2: k2 }));
    c.push(["the step Panel draws each as a Disclosure, the current one open, the others closed", (items.match(/<li /g) || []).length === 5 && /data-key="live:40:stage:plan-write" data-open="1"/.test(items) && /data-key="live:40:stage:plan-check" data-open="0"/.test(items), items.slice(0, 300)]);
    c.push(["opened: when it started and ended, its report, each earlier round with its times, report and result", /The slice holds\./.test(items) && /Round 1/.test(items) && /Two sections\./.test(items) && /sent back/.test(items) && /started/.test(items), ""]);
    const L = { state: "writing", stages: [{ id: "write", state: "done", started: T0, finished: T1, report: "Drafted." }, { id: "check", state: "done", late: true, report: "Checked.", result: "accepted" }, { id: "consequences", state: "todo" }, { id: "report", state: "current", started: T2 }] };
    const li = vm.runInContext(`pstageItems(${js(L)},{issue:40},new Set())`, ctx), ls = vm.runInContext(`pstageStrip(${js({ plan: L })},"plan",new Set(),false,{run:"own"})`, ctx);
    c.push(["a stage recorded late reads \"done · time not recorded\"; the check by its result, accepted green", /✓ accepted · time not recorded|accepted · time not recorded/.test(ls) && /verdict-pill good/.test(ls) && /not recorded/.test(li), ls.replace(/\s+/g, " ").slice(0, 600)]);
    const past = vm.runInContext(`pstageItems(${js(L)},{issue:40,past:true},new Set())`, ctx);
    c.push(["a finished visit: none open, a stage still to come dashed, \"not recorded\"", !/data-open="1"/.test(past) && /not recorded/.test(past) && /dashed/.test(past), past.replace(/\s+/g, " ").slice(0, 500)]);
    c.push(["a visit's short account counts them (\"3 of 4 plan stages done\")", vm.runInContext(`pstageGist(${js(L)})`, ctx) === "2 of 4 plan stages done" && vm.runInContext(`pstageGist(${js(P)})`, ctx) === "1 of 5 plan stages done", vm.runInContext(`pstageGist(${js(L)})`, ctx)]);
    const tr = ["Plan stage: write · re-pass: done — The slice holds.", "Plan stage: check/accept · write: done — Drafted.", "Plan stage: write, round 2 · check/accept: sent back — Two sections.", "Plan accepted"];
    c.push(["the template's reconstruction from the trail is lib.js's", js(vm.runInContext(`reconPlanStages(${js(tr)},true)`, ctx)) === js(lib.planStagesFromTrail(tr, true)) && js(vm.runInContext(`reconPlanStages(${js(tr.slice(1))},false)`, ctx)) === js(lib.planStagesFromTrail(tr.slice(1), false)), js(vm.runInContext(`reconPlanStages(${js(tr)},true)`, ctx))]);
    c.push(["the template's names and briefs are lib.js's", js(vm.runInContext("PSTAGE_NAME", ctx)) === js(lib.PLAN_STAGE_NAMES) && js(vm.runInContext("PSTAGE_BRIEF", ctx)) === js(lib.PLAN_STAGE_BRIEFS), ""]);
    c.push(["the plan step's Panel, the finished visit, the gist and the reconstruction call them", /pstageItems\(P,o,keys\)/.test(src) && /pstageItems\(V\.plan,\{\.\.\.o,past:true\},keys\)/.test(src) && /pstageGist\(V\.plan\)/.test(src) && /reconPlanStages\(/.test(src) && /pstageStrip\(L,/.test(src) && /pstageStrip\(WIP,/.test(src), ""]);
    /* the board lays and checks with stages at every point (a full render needs a browser: the user's check) */
    if (SUBB) { const k = run(CHECK, [SUBB.dir, "--auto"]), f = (k.stdout + k.stderr).split(/\r?\n/).filter(l => /FAIL/.test(l) && !/browser: NOT RUN|^FAIL:? *\d+ problem/.test(l)); c.push(["check.js --auto passes the sub-issue's board laid above", !f.length, f.slice(0, 4).join(" | ")]); }
  });
  return groups;
};

if (require.main === module) {
  const args = process.argv.slice(2), oi = args.indexOf("--out"), out = oi >= 0 ? args[oi + 1] : fs.mkdtempSync(path.join(os.tmpdir(), "plan-stages-"));
  const sk = p => path.join(__dirname, "..", ...p.split("/"));
  let bad = 0; module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const f = cases.filter(x => !x[1]); bad += f.length;
    console.log(`${f.length ? "FAILED " : "checked"}  ${title}: ${cases.length - f.length}/${cases.length} cases`); f.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  console.log(`boards under ${path.join(out, "plan-stages")}`); process.exit(bad ? 1 : 0);
}
