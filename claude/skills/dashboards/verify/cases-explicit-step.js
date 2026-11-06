// The cases of "only an explicit signal from the run moves the board's step" (admin-team/dashboards-skill/explicit-step; plan/RULES.md §4, the
// implementation-stage and qa-pass rows), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-explicit-step.js [--out <dir>].
// The defect (WebTools #66): every stage done moved the board to qa at the stage report, or the verdict closed the implementation visit with a
// qa visit of no time, so implementation read 25 minutes too long and qa · 1st pass under a minute. An implementation-stage now moves no step of
// its own: facts.step has no effect and every stage done implies nothing, until the run's qa-pass with verdict "running" opens the qa visit at
// its time; the verdict closes that same visit. Remediation alone stays recognised. A returned verdict with no running before it applies as it
// stands, and says so. No case opens a browser. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesExplicitStep(X) {
  const { sk, out, targets } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["an explicit signal moves the step (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "explicit-step"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const T0 = "2026-11-03T03:28:38Z", T1 = "2026-11-03T04:23:52Z", T2 = "2026-11-03T04:48:46Z", T3 = "2026-11-03T04:58:24Z", T4 = "2026-11-03T05:10:00Z";
  const STG = (a, b) => [{ id: "S1", name: "Stage one", state: a }, { id: "S2", name: "Stage two", state: b }];
  /* a board in implementation, from the example: its rows pending, two stages, the second current */
  const board = over => { const x = copy(EX), ids = x.rows.map(r => r.id); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: T0, updated: T0, current: ["built"], questions: [], research: null, open: [], qa: [], plan: null, remediation: null, history: {}, waits: [],
      stages: STG("done", "current").map(s => ({ ...s, rows: [ids[0]] })), steps: STEPS.slice(), event: { name: "branch-cut", at: T0 }, ...(over || {}) }; return x; };
  let n = 0;
  const lay = plan => { const root = path.join(sc, `b-${++n}`), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir, plan }; };
  const ev = (B, event, facts, at, flags) => { const rq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: B.plan.repo, issue: B.plan.issue, event, folder: B.plan.folder, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, ...(flags || ["--json"])]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const vis = (p, s) => ((p.wip.history || {})[s] || []).map(v => [v.since, v.ended, v.endedBy, v.to]);
  const warned = (r, re) => (r.S.warnings || []).some(w => re.test(w));
  const NOSTART = /^QA START NOT RECORDED: Quality Review \d+'s verdict came with no qa-pass verdict "running" before it/;
  const REM = (pass, state) => ({ pass, route: "remediation", steps: [{ name: "The fixes", state }, { name: `qa pass ${pass + 1}`, state: "todo" }] });
  const atRem = over => board({ step: "remediation", since: T2, current: ["built"], stages: STG("done", "done"), remediation: REM(1, "current"), qa: [{ pass: 1, verdict: "changes-requested", date: "2026-11-03", at: T2, findings: { test: 2 }, route: "remediation" }],
    history: { implementation: [{ since: T0, ended: T1, endedBy: "qa-pass", to: "qa" }], qa: [{ since: T1, ended: T2, endedBy: "qa-pass", to: "remediation", qa: [{ pass: 1, verdict: "changes-requested" }] }] }, event: { name: "qa-pass", at: T2 }, ...(over || {}) });

  guard("apply-event.js: an implementation-stage moves no step of its own: facts.step has no effect, every stage done implies nothing", c => {
    const B = lay(board()), a = ev(B, "implementation-stage", { stage: "S2", stages: STG("done", "done") }, T1);
    c.push(["every stage done, no facts.step: the step stays implementation, its visit still running from its start", a.a.status === 0 && a.p.wip.step === "implementation" && a.p.wip.since === T0, js([a.a.status, a.p.wip.step, a.p.wip.since, a.S.error])]);
    c.push(["…no implementation visit frozen, no qa visit opened", !vis(a.p, "implementation").length && !vis(a.p, "qa").length, js(a.p.wip.history)]);
    c.push(["…the whole As built column glows, and the wording still says qa comes next, as the run's next step", js(a.p.wip.current) === js(["built"]) && /qa next/.test(a.p.wip.detail), js([a.p.wip.current, a.p.wip.detail])]);
    const Bq = lay(board()), q = ev(Bq, "implementation-stage", { step: "qa", stage: "S2", stages: STG("done", "done") }, T1);
    c.push(["facts.step \"qa\" with every stage done: ignored, the step stays, and the summary says so", q.a.status === 0 && q.p.wip.step === "implementation" && q.p.wip.since === T0 && (q.S.applied || []).some(x => /facts\.step "qa" ignored/.test(x)), js([q.p.wip.step, q.p.wip.since, q.S.applied])]);
    const Bm = lay(board()), m = ev(Bm, "implementation-stage", { step: "qa", stage: "S1", stages: STG("done", "current") }, T1);
    c.push(["facts.step \"qa\" with a stage still current: ignored too", m.a.status === 0 && m.p.wip.step === "implementation", js([m.p.wip.step])]);
    const Bi = lay(board()), i = ev(Bi, "implementation-stage", { step: "implement", stage: "S2", stages: STG("done", "done") }, T1);
    c.push(["facts.step \"implement\": no effect either, the run's word for the step it stays in", i.a.status === 0 && i.p.wip.step === "implementation" && i.p.wip.since === T0, js([i.p.wip.step, i.S.applied])]);
    const Bu = lay(board()), u = ev(Bu, "implementation-stage", { step: "building it", stages: STG("done", "current") }, T1);
    c.push(["a facts.step that names no step: ignored, and no STEP UNKNOWN warning on a field with no effect", u.a.status === 0 && u.p.wip.step === "implementation" && !warned(u, /^STEP UNKNOWN/) && (u.S.applied || []).some(x => /facts\.step "building it" ignored/.test(x)), js([u.S.warnings, u.S.applied])]);
    const Bb = lay(board({ step: "branch", since: T0, current: [], stages: [] })), b = ev(Bb, "implementation-stage", { stage: "S1", stages: STG("current", "todo") }, T1);
    c.push(["from a step before it, the report itself says the run is implementing: the step implementation, since the event", b.a.status === 0 && b.p.wip.step === "implementation" && b.p.wip.since === T1, js([b.p.wip.step, b.p.wip.since, b.S.error])]);
    const Ba = lay(board({ step: "halted", resume: "plan", waitingOn: "An answer.", since: T0, current: [], stages: [] })), al = ev(Ba, "resumed", { step: "implement" }, T1);
    c.push(["another event still reads the alias: a resumed's \"implement\" is the implementation step", al.a.status === 0 && al.p.wip.step === "implementation" && (al.S.applied || []).some(x => /facts\.step "implement" read as implementation/.test(x)), js([al.a.status, al.p.wip.step, al.S.applied, al.S.error])]);
    const Bq2 = lay(board({ step: "qa", since: T1, stages: STG("done", "current"), qa: [{ pass: 1, verdict: "running", date: "2026-11-03", at: T1, findings: {} }], detail: "QA pass 1 running.", event: { name: "qa-pass", at: T1 } })), l = ev(Bq2, "implementation-stage", { stage: "S2", stages: STG("done", "done") }, T2);
    c.push(["a late report on a board at qa moves nothing back: the visit runs on, the detail kept (an older board's \"QA pass 1\" named \"Quality Review 1\"), the stages merged, no \"qa next\"", l.a.status === 0 && l.p.wip.step === "qa" && l.p.wip.since === T1 && l.p.wip.detail === "Quality Review 1 running." && l.p.wip.stages[1].state === "done" && !/qa next/.test(js(l.p.trail.slice(-1))) && !vis(l.p, "qa").length, js([l.p.wip.step, l.p.wip.since, l.p.wip.detail, l.p.trail.slice(-1), l.S.error])]);
    const Bd = lay(board({ step: "document", since: T2, stages: STG("done", "current"), document: { tasks: [] } })), d = ev(Bd, "implementation-stage", { step: "qa", stage: "S2", stages: STG("done", "done") }, T3);
    c.push(["…nor on a board at the Document step", d.a.status === 0 && d.p.wip.step === "document" && d.p.wip.since === T2, js([d.p.wip.step, d.p.wip.since, d.S.error])]);
  });

  guard("apply-event.js: remediation is recognised from the report, never from facts.step, and a \"qa\" sent after one is ignored: the board waits for the running event", c => {
    const B1 = lay(board()), r1 = ev(B1, "implementation-stage", { remediation: REM(1, "current") }, T2);
    c.push(["facts.remediation: the step remediation", r1.a.status === 0 && r1.p.wip.step === "remediation" && r1.p.wip.remediation.pass === 1, js([r1.p.wip.step, r1.S.error])]);
    const IGN = /facts\.step "remediation" ignored/;
    const B2 = lay(board({ step: "qa", since: T1, remediation: REM(1, "done") })), r2 = ev(B2, "implementation-stage", { step: "remediation", stage: "S2", stages: STG("done", "done") }, T2);
    c.push(["facts.step \"remediation\" on a board at qa: ignored like any other, the visit runs on, and the summary says so", r2.a.status === 0 && r2.p.wip.step === "qa" && r2.p.wip.since === T1 && !vis(r2.p, "qa").length && (r2.S.applied || []).some(x => IGN.test(x)), js([r2.p.wip.step, r2.p.wip.since, r2.S.applied, r2.S.error])]);
    const B2i = lay(board()), r2i = ev(B2i, "implementation-stage", { step: "remediation", stage: "S1", stages: STG("done", "current") }, T2);
    c.push(["…on a board at implementation: the step stays, no remediation visit, the report worded as a stage's", r2i.a.status === 0 && r2i.p.wip.step === "implementation" && r2i.p.wip.since === T0 && !vis(r2i.p, "implementation").length && !r2i.p.wip.remediation && !/^Remediation/.test(r2i.p.trail[r2i.p.trail.length - 1].label) && (r2i.S.applied || []).some(x => IGN.test(x)), js([r2i.p.wip.step, r2i.p.wip.since, r2i.p.wip.remediation, r2i.p.trail.slice(-1), r2i.S.error])]);
    const B2r = lay(board()), r2r = ev(B2r, "implementation-stage", { step: "remediation", stage: "R1", stages: [...STG("done", "done"), { id: "R1", name: "The fixes", state: "current" }], rows: [EX.rows[0].id] }, T2);
    c.push(["…so a new stage it names is no remediation's: facts.rows is not taken as its rows", r2r.a.status === 0 && r2r.p.wip.step === "implementation" && js(r2r.p.wip.stages[2].rows) === "[]", js([r2r.p.wip.step, r2r.p.wip.stages, r2r.S.error])]);
    const B2b = lay(board()), r2b = ev(B2b, "implementation-stage", { step: "remediation", remediation: REM(1, "current") }, T2);
    c.push(["facts.step \"remediation\" beside facts.remediation: facts.remediation moves the step, the summary still names the step ignored", r2b.a.status === 0 && r2b.p.wip.step === "remediation" && r2b.p.wip.remediation.pass === 1 && (r2b.S.applied || []).some(x => IGN.test(x)), js([r2b.p.wip.step, r2b.S.applied, r2b.S.error])]);
    const B3 = lay(atRem()), r3 = ev(B3, "implementation-stage", { step: "qa", stage: "R1", stages: [...STG("done", "done"), { id: "R1", name: "The fixes", state: "done" }], rows: [] }, T3);
    c.push(["a facts.step \"qa\" after a remediation, its stages all done: ignored, the visit runs on, no qa visit", r3.a.status === 0 && r3.p.wip.step === "remediation" && r3.p.wip.since === T2 && !vis(r3.p, "remediation").length, js([r3.p.wip.step, r3.p.wip.since, r3.p.wip.history.remediation, r3.S.error])]);
    c.push(["…its wording follows the remediation, never \"qa next\", and the stage is the remediation's", !/qa next/.test(js([r3.p.wip.detail, r3.p.wip.event, r3.p.trail.slice(-1)])) && /^Remediation/.test(r3.p.trail[r3.p.trail.length - 1].label), js([r3.p.wip.detail, r3.p.trail.slice(-1)])]);
    const B4 = lay(atRem()), r4 = ev(B4, "implementation-stage", { step: "qa", remediation: REM(1, "done") }, T3);
    c.push(["a facts.step \"qa\" beside facts.remediation: ignored, the sub-steps written", r4.a.status === 0 && r4.p.wip.step === "remediation" && r4.p.wip.since === T2 && r4.p.wip.remediation.steps[0].state === "done", js([r4.p.wip.step, r4.p.wip.remediation, r4.S.error])]);
    const B5 = lay(atRem()), r5 = ev(B5, "implementation-stage", { stage: "R1", stages: [...STG("done", "done"), { id: "R1", name: "The fixes", state: "current" }], rows: [EX.rows[0].id] }, T3);
    c.push(["a report with no step and no facts.remediation while the board stands at remediation is that remediation's: its new stage takes facts.rows", r5.a.status === 0 && r5.p.wip.step === "remediation" && js(r5.p.wip.stages[2].rows) === js([EX.rows[0].id]), js([r5.p.wip.step, r5.p.wip.stages, r5.S.error])]);
    const r6 = ev(B3, "qa-pass", { qa: { pass: 2, verdict: "running" } }, T4);
    c.push(["the running event then moves it: the remediation visit closed at its time, qa open from there", r6.a.status === 0 && r6.p.wip.step === "qa" && r6.p.wip.since === T4 && js(vis(r6.p, "remediation")) === js([[T2, T4, "qa-pass", "qa"]]), js([r6.p.wip.step, r6.p.wip.since, vis(r6.p, "remediation"), r6.S.error])]);
  });

  guard("apply-event.js: qa-pass with verdict \"running\" opens the qa visit at its time, and the verdict closes that same visit", c => {
    const B = lay(board({ stages: STG("done", "done"), since: T0 }));
    const r = ev(B, "qa-pass", { qa: { pass: 1, verdict: "running" } }, T1);
    c.push(["running: the implementation visit closed at its time, ended by it", r.a.status === 0 && js(vis(r.p, "implementation")) === js([[T0, T1, "qa-pass", "qa"]]), js([vis(r.p, "implementation"), r.S.error])]);
    c.push(["…the step qa, since its time, the pass recorded running", r.p.wip.step === "qa" && r.p.wip.since === T1 && r.p.wip.qa[0].verdict === "running" && r.p.wip.qa[0].at === T1 && !vis(r.p, "qa").length, js([r.p.wip.step, r.p.wip.since, r.p.wip.qa, r.p.wip.history.qa])]);
    const was = rd(path.join(B.dir, "plan.json")), dup = ev(B, "qa-pass", { qa: { pass: 1, verdict: "running" } }, T1);
    c.push(["raised again: a duplicate, nothing written", dup.a.status === 0 && dup.S.result === "duplicate" && rd(path.join(B.dir, "plan.json")) === was, js([dup.S.result, dup.S.error])]);
    const v = ev(B, "qa-pass", { qa: { pass: 1, verdict: "changes-requested", test: 2, route: "remediation" }, rows: [EX.rows[0].id] }, T2);
    c.push(["the verdict closes that same visit: one qa visit, from the running event to the verdict, with its pass", v.a.status === 0 && js(vis(v.p, "qa")) === js([[T1, T2, "qa-pass", "remediation"]]) && js(v.p.wip.history.qa[0].qa.map(p => [p.pass, p.verdict])) === js([[1, "changes-requested"]]), js([vis(v.p, "qa"), v.p.wip.history.qa, v.S.error])]);
    c.push(["…no warning and no mark: the pass's start is on the record", !warned(v, /^QA START NOT RECORDED/) && !v.p.wip.qa[0].startUnrecorded, js([v.S.warnings, v.p.wip.qa[0]])]);
    const ck0 = run(CHECK, [B.dir]);
    c.push(["…and check.js keeps quiet on it", ck0.status === 0 && !/QA START NOT RECORDED/.test(ck0.stdout), (ck0.stdout || "").split(/\r?\n/).filter(l => /QA START|FAIL/.test(l)).join(" | ")]);
    const r2 = ev(B, "qa-pass", { qa: { pass: 2, verdict: "running" } }, T3);
    c.push(["a re-run: running closes the remediation visit at its time", r2.a.status === 0 && r2.p.wip.step === "qa" && r2.p.wip.since === T3 && js(vis(r2.p, "remediation")) === js([[T2, T3, "qa-pass", "qa"]]), js([r2.p.wip.step, vis(r2.p, "remediation"), r2.S.error])]);
    const v2 = ev(B, "qa-pass", { qa: { pass: 2, verdict: "approved", test: 0, code: 0 } }, T4);
    c.push(["…and its verdict closes the second qa visit, no third", v2.a.status === 0 && js(vis(v2.p, "qa")) === js([[T1, T2, "qa-pass", "remediation"], [T3, T4, "qa-pass", "document"]]) && js(v2.p.wip.history.qa[1].qa.map(p => p.pass)) === js([2]), js([vis(v2.p, "qa"), v2.S.error])]);
    const L = lib.timelineLines(lib.timelineSteps(v2.p));
    c.push(["the Timeline: implementation ends and qa · 1st pass starts at the running event, 25 min of qa, not under a minute", L.some(l => /^implementation \(build\): .*04:23Z · 55 min$/.test(l)) && L.some(l => /^qa · 1st pass \(checking\): .*04:23Z → .*04:48Z · 25 min$/.test(l)) && L.some(l => /^qa · 2nd pass \(checking\): .*04:58Z → .*05:10Z · 12 min$/.test(l)), L.join(" | ")]);
    /* a halt while the pass runs: the visit is split around the wait, the pass kept, no mark */
    const H = lay(board({ stages: STG("done", "done") }));
    ev(H, "qa-pass", { qa: { pass: 1, verdict: "running" } }, T1); ev(H, "halted", { waitingOn: "An answer." }, "2026-11-03T04:30:00Z"); ev(H, "resumed", {}, "2026-11-03T04:40:00Z");
    const hv = ev(H, "qa-pass", { qa: { pass: 1, verdict: "approved" } }, T2);
    c.push(["a halt while the pass runs: two qa visits around the wait, the verdict closing the second, no mark", hv.a.status === 0 && js(vis(hv.p, "qa").map(x => x.slice(0, 2))) === js([[T1, "2026-11-03T04:30:00Z"], ["2026-11-03T04:40:00Z", T2]]) && !hv.p.wip.qa[0].startUnrecorded && !warned(hv, /^QA START/), js([vis(hv.p, "qa"), hv.p.wip.qa, hv.S.warnings])]);
  });

  guard("apply-event.js and check.js: a returned verdict with no running before it for that pass applies as it stands, and says so", c => {
    const B = lay(board({ stages: STG("done", "done") }));
    const v = ev(B, "qa-pass", { qa: { pass: 1, verdict: "changes-requested", test: 2, route: "remediation" }, rows: [EX.rows[0].id] }, T2);
    c.push(["the event applies as it stands: the step remediation, the implementation visit ended by the verdict, a qa visit with no start of its own", v.a.status === 0 && v.S.result === "ok" && v.p.wip.step === "remediation" && js(vis(v.p, "implementation")) === js([[T0, T2, "qa-pass", "remediation"]]) && js(vis(v.p, "qa")) === js([[null, T2, "qa-pass", "remediation"]]), js([v.a.status, v.p.wip.step, vis(v.p, "implementation"), vis(v.p, "qa"), v.S.error])]);
    c.push(["the summary says so, in its warnings", warned(v, NOSTART) && /fast-path warning/.test(v.S.check || ""), js([v.S.warnings, v.S.check])]);
    c.push(["the entry carries the mark", v.p.wip.qa[0].startUnrecorded === true, js(v.p.wip.qa[0])]);
    const ck = run(CHECK, [B.dir]);
    c.push(["check.js warns on it, never fails", ck.status === 0 && /^warn\s+QA START NOT RECORDED: wip\.qa\[0\] \(pass 1\)/m.test(ck.stdout), (ck.stdout || "").split(/\r?\n/).filter(l => /QA START|FAIL/.test(l)).join(" | ")]);
    const dup = ev(B, "qa-pass", { qa: { pass: 1, verdict: "changes-requested", test: 2, route: "remediation" }, rows: [EX.rows[0].id] }, T2);
    c.push(["the same verdict again: a duplicate", dup.a.status === 0 && dup.S.result === "duplicate", js([dup.S.result, dup.S.error])]);
    const fix = ev(B, "qa-pass", { qa: { pass: 1, verdict: "changes-requested", test: 3, route: "remediation" }, rows: [EX.rows[0].id] }, T3);
    c.push(["a verdict sent again with corrected counts keeps the mark and warns of nothing new", fix.a.status === 0 && fix.p.wip.qa[0].startUnrecorded === true && fix.p.wip.qa[0].findings.test === 3 && !warned(fix, NOSTART), js([fix.p.wip.qa[0], fix.S.warnings])]);
    const r2 = ev(B, "qa-pass", { qa: { pass: 2, verdict: "running" } }, T4), v2 = ev(B, "qa-pass", { qa: { pass: 2, verdict: "approved", test: 0, code: 0 } }, "2026-11-03T05:20:00Z");
    c.push(["a later pass with its running event: no mark of its own, the first pass's kept", r2.a.status === 0 && v2.a.status === 0 && !v2.p.wip.qa[1].startUnrecorded && v2.p.wip.qa[0].startUnrecorded === true && !warned(v2, NOSTART), js([v2.p.wip.qa.map(p => [p.pass, p.verdict, p.startUnrecorded]), v2.S.warnings])]);
    const Bt = lay(board({ stages: STG("done", "done") })), t = ev(Bt, "qa-pass", { qa: { pass: 1, verdict: "approved" } }, T2, []);
    c.push(["the plain summary carries the line", t.a.status === 0 && /^warnings: .*QA START NOT RECORDED: Quality Review 1/m.test(t.a.stdout), (t.a.stdout || "").split(/\r?\n/).filter(l => /^warnings/.test(l)).join(" ")]);
    const Bq = lay(board({ step: "qa", since: T1, stages: STG("done", "done") })), q = ev(Bq, "qa-pass", { qa: { pass: 1, verdict: "approved" } }, T2);
    c.push(["a board already at qa with no running recorded for the pass: the same line", q.a.status === 0 && warned(q, NOSTART) && q.p.wip.qa[0].startUnrecorded === true, js([q.S.warnings, q.p.wip.qa])]);
    const bad = copy(v.p); bad.wip.qa[0].startUnrecorded = "yes"; const Bb = lay(bad), kb = run(CHECK, [Bb.dir]);
    c.push(["check.js fails a mark that is not true", kb.status !== 0 && /startUnrecorded is true/.test(kb.stdout), (kb.stdout || "").split(/\r?\n/).filter(l => /startUnrecorded/.test(l)).join(" | ")]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
