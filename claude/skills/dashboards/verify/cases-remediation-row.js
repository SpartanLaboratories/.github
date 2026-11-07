// The cases of a row a remediation stage reopens and of the Tests tab's facts on that stage (admin-team/board/remediation-row; plan/RULES.md
// §2 "Before the outcome", §4 "The fast path"), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-remediation-row.js [--out <dir>].
// The defects (WebTools #65, remediation stage R1): facts.tests.drop named a class on no list of the board (added and deleted on the branch
// before any event recorded it), and the fast path passed over it in silence, so the summary never said the fact was taken; a run sent as
// "webtools-http componentTest" at one event and "componentTest" with its module at the next was listed twice, and a later run kept the
// earlier run's count beside its own result (392 tests, 395 passed); and a row with its as-built statements, reopened by a later stage, was
// drawn partially built with its statements alone, its summary (what is built, what is left) never shown. check.js warned on such a row stored
// partially built beside its statements, reading the stored state as the outcome they derive. Each group returns
// [title, cases], a case [name, ok, detail]; the template's rendering needs a browser and is reported as not run without one.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesRemediationRow(X) {
  const { sk, out, targets, dumpDom, withData, NEEDS_BROWSER } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["a row a remediation stage reopens (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const TL = require(sk("plan/scripts/testslib.js"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js");
  const sc = path.join(out, "remediation-row"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const ids = EX.rows.map(r => r.id), R0 = ids[0], R1 = ids[1];
  /* the example in remediation: every row built with its statements (as the example records them), R1 done on two rows, R2 still to come on
     the first */
  const atRem = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "remediation", since: "2026-11-02T00:08:52Z", updated: "2026-11-02T00:08:52Z", current: [R0 + ".built", R1 + ".built"], questions: [], research: null, open: [], plan: null,
      qa: [{ pass: 1, verdict: "changes-requested", date: "2026-11-02", at: "2026-11-02T00:08:52Z", findings: { test: 2, code: 0 }, route: "remediation" }], qaMax: 3,
      remediation: { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }, { name: "qa pass 2", state: "todo" }] },
      stages: [{ id: "S1", name: "The build", state: "done", rows: ids.slice() }, { id: "R1", name: "First fixes", state: "done", rows: [R0, R1] }, { id: "R2", name: "Second fixes", state: "todo", rows: [R0] }],
      steps: STEPS.slice(), event: { name: "qa-pass", at: "2026-11-02T00:08:52Z" } };
    x.tests = { base: "master", updated: "2026-11-02T00:08:52Z", added: [{ class: "KeptTest", module: "webtools-udp", testLevel: "2", tests: 3 }], amended: [], relevant: [] }; return x; };
  let n = 0;
  const lay = plan => { const root = path.join(sc, `b-${++n}`), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir }; };
  const ev = (B, plan, facts, at) => { const rq = wr(path.join(sc, `req-${n}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: "implementation-stage", folder: plan.folder, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const words = S => [].concat(S.applied || [], S.why || [], S.enrich || []).map(String).join(" | ");

  guard("testslib.js and apply-event.js: facts.tests.drop of a class on no list is named, a run named with its module is one entry, a run's count is its own", c => {
    const now = "2026-11-02T01:22:28Z", o = { now, ids: new Set(ids) };
    const P = { rows: EX.rows, tests: { base: "master", updated: "2026-11-01T00:00:00Z", added: [{ class: "KeptTest", module: "m", testLevel: "2", tests: 3 }], amended: [], relevant: [] } };
    const r = TL.mergeTests(P, { drop: [{ class: "GoneComponentTest", module: "m", testLevel: "2", path: "m/src/test/kotlin/x/testing/component/GoneComponentTest.kt" }] }, o);
    c.push(["a drop of a class on no list: nothing changes, and the summary names it", !r.changed && r.applied.some(x => /tests\.drop GoneComponentTest: on no list of the board/.test(x)) && P.tests.added.length === 1, js(r)]);
    const r2 = TL.mergeTests(P, { drop: ["KeptTest"] }, o);
    c.push(["a drop of a class on a list still removes it", r2.changed && !P.tests.added.length && r2.applied.includes("tests.added − KeptTest"), js(r2)]);
    const Q = { rows: EX.rows, tests: null };
    TL.mergeTests(Q, { ran: [{ class: "m componentTest", module: "m", passed: 392, failed: 0, skipped: 0 }] }, { now: "2026-11-01T22:37:24Z", ids: new Set(ids) });
    TL.mergeTests(Q, { ran: [{ class: "componentTest", module: "m", passed: 395, failed: 0, skipped: 0 }] }, o);
    const rel = (Q.tests || {}).relevant || [];
    c.push(["a run sent as \"<module> componentTest\", then as \"componentTest\" with its module: one Relevant entry", rel.length === 1 && rel[0].class === "componentTest", js(rel)]);
    c.push(["…with the later run's result and its count (395, never the earlier 392)", rel.length === 1 && rel[0].result.passed === 395 && rel[0].tests === 395 && rel[0].result.at === now, js(rel)]);
    TL.mergeTests(Q, { ran: [{ class: ":m:componentTest", module: "m", passed: 396 }] }, { now: "2026-11-02T02:00:00Z", ids: new Set(ids) });
    c.push(["…and a Gradle path \":<module>:componentTest\" is the same entry", ((Q.tests || {}).relevant || []).length === 1 && Q.tests.relevant[0].tests === 396, js(Q.tests.relevant)]);
    c.push(["bareName keeps a name that only starts like the module (\"mx componentTest\" in module \"m\")", TL.bareName("mx componentTest", "m") === "mx componentTest" && TL.bareName("m componentTest", "m") === "componentTest" && TL.bareName("m", "m") === "m", js([TL.bareName("mx componentTest", "m"), TL.bareName("m componentTest", "m")])]);
    /* the fast path end to end: the stage's summary carries the drop, and it raises no enrichment of its own */
    const B = atRem(), L = lay(B);
    const e = ev(L, B, { step: "remediation", stage: "R1", stages: B.wip.stages.map(s => ({ id: s.id, name: s.name, state: s.state })), rows: [R0, R1],
      tests: { added: [{ class: "NewDeterministicTest", module: "webtools-udp", testLevel: "4a", tests: 5, rows: [R0] }], drop: [{ class: "GoneComponentTest", module: "webtools-udp", testLevel: "2" }] } }, "2026-11-02T01:22:28Z");
    c.push(["apply-event.js: the stage applies (exit 0), Added takes the new class", e.a.status === 0 && (e.p.tests.added || []).some(x => x.class === "NewDeterministicTest"), js([e.a.status, e.S.error, (e.p.tests || {}).added])]);
    c.push(["…and its summary names the drop of the class on no list, never passing over it", /tests\.drop GoneComponentTest: on no list of the board/.test(js(e.S.applied || [])), js(e.S.applied)]);
    c.push(["…as applied, not as an enrichment for the presenter", !/GoneComponentTest/.test(js(e.S.why || []) + js(e.S.enrich || [])), words(e.S)]);
  });

  /* A report that finishes no stage can still change what the rows say (WebTools #67, the report of qa pass 1's fixes: every stage already done, a sub-step
     done, a new deviation D7 and the rows it touches, and the fast path said enrich: no, so the board stayed behind it) */
  guard("apply-event.js: a report that finishes no stage asks for the documents when it finishes a remediation sub-step or names a deviation", c => {
    const allDone = P => { P.wip.stages.forEach(s => { s.state = "done"; }); return P.wip.stages.map(s => ({ id: s.id, name: s.name, state: s.state })); };
    const why = S => (S.why || []).join(" | "), tests = { base: "master", amended: [{ class: "KeptTest", module: "webtools-udp", testLevel: "2", tests: 4, rows: [R0] }] };
    const fixed = { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "done" }, { name: "qa pass 2", state: "current" }] };
    const held = { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }, { name: "qa pass 2", state: "todo" }] };
    const P1 = atRem(), st1 = allDone(P1), B1 = lay(P1);
    const e1 = ev(B1, P1, { stage: "R2", stages: st1, rows: [R0, R1], remediation: fixed, deviations: ["D7: the plan's listing corrected"], tests }, "2026-11-02T01:00:00Z");
    c.push(["every stage already done, a sub-step done, a deviation: enrich yes, naming what it found and the rows", e1.a.status === 0 && e1.S.enrich === "yes" && /1 remediation sub-step done, 1 deviation named/.test(why(e1.S)) && why(e1.S).includes(R0 + ", " + R1) && /final-implementation.md/.test(why(e1.S)), js([e1.a.status, e1.S.enrich, e1.S.error, why(e1.S)])]);
    c.push(["…and the event itself applies as before: the step stays remediation, the sub-steps written", e1.p.wip.step === "remediation" && js((e1.p.wip.remediation.steps || []).map(s => s.state)) === js(["done", "current"]), js([e1.p.wip.step, e1.p.wip.remediation])]);
    const P2 = atRem(), B2 = lay(P2);
    const e2 = ev(B2, P2, { rows: [R0], remediation: fixed, tests }, "2026-11-02T01:00:00Z");
    c.push(["a remediation report with no stages at all, a sub-step done: enrich yes", e2.a.status === 0 && e2.S.enrich === "yes" && /1 remediation sub-step done/.test(why(e2.S)) && !/deviation named/.test(why(e2.S)), js([e2.a.status, e2.S.enrich, why(e2.S)])]);
    const e2b = ev(B2, P2, { rows: [R0], remediation: fixed, tests, detail: "The same sub-step, a later word." }, "2026-11-02T01:10:00Z");
    c.push(["…a later report of the same sub-step asks nothing new", e2b.a.status === 0 && e2b.S.enrich === "no", js([e2b.a.status, e2b.S.enrich, why(e2b.S)])]);
    const P3 = atRem(), B3 = lay(P3);
    const e3 = ev(B3, P3, { rows: [R0], remediation: held, tests }, "2026-11-02T01:00:00Z");
    c.push(["a remediation report with the sub-step still current and no deviation: enrich no, as before", e3.a.status === 0 && e3.S.enrich === "no", js([e3.a.status, e3.S.enrich, why(e3.S)])]);
    const P4 = atRem(), B4 = lay(P4);
    const e4 = ev(B4, P4, { rows: [R0], remediation: fixed }, "2026-11-02T01:00:00Z");
    c.push(["a sub-step done with no facts.tests: the Tests tab is asked for too", e4.a.status === 0 && e4.S.enrich === "yes" && /the Tests tab: the event carries no facts.tests/.test(why(e4.S)), js([e4.a.status, why(e4.S)])]);
    const P5 = atRem(); P5.wip.step = "implementation"; P5.wip.remediation = null; P5.wip.stages = [{ id: "S1", name: "The build", state: "current", rows: ids.slice() }]; const B5 = lay(P5);
    const e5 = ev(B5, P5, { stage: "S1", stages: [{ id: "S1", name: "The build", state: "current" }], deviations: ["D1: a plan row reads otherwise"], tests }, "2026-11-02T01:00:00Z");
    c.push(["outside remediation, a stage still current and a deviation named: enrich yes", e5.a.status === 0 && e5.S.enrich === "yes" && /1 deviation named/.test(why(e5.S)), js([e5.a.status, e5.S.enrich, why(e5.S)])]);
    const P6 = atRem(); P6.wip.step = "implementation"; P6.wip.remediation = null; P6.wip.stages = [{ id: "S1", name: "The build", state: "current", rows: ids.slice() }]; const B6 = lay(P6);
    const e6 = ev(B6, P6, { stage: "S1", stages: [{ id: "S1", name: "The build", state: "done" }], deviations: ["D1: a plan row reads otherwise"], tests }, "2026-11-02T01:00:00Z");
    c.push(["a stage finished with a deviation: one reason, the stage's, as before", e6.a.status === 0 && e6.S.enrich === "yes" && /stage S1 done/.test(why(e6.S)) && !/deviation named/.test(why(e6.S)), js([e6.a.status, why(e6.S)])]);
  });

  /* check.js: a reopened row that stores the staged state beside its statements is not warned on; one that still stores its outcome is */
  guard("check.js: a row a later stage reopens, stored partially built beside its statements with its summary, passes without a warning", c => {
    const CHECK = sk("plan/scripts/check.js"), sum = "Built: the first fixes. Left: the second fixes.";
    const warnFor = P => { const L = lay(P), r = run(CHECK, [L.dir]); return { r, w: (r.stdout || "").split(/\r?\n/).filter(l => /^warn/.test(l) && l.includes(`(${R0})`) && /wip\.stages make it/.test(l)) }; };
    const P = atRem(); Object.assign(P.rows.find(r => r.id === R0).asBuilt, { state: "partially-built", summary: sum });
    const ok = warnFor(P);
    c.push(["stored \"partially-built\" with its statements and summary: no \"wip.stages make it\" warning, no failure", ok.r.status === 0 && !ok.w.length, (ok.w.join(" | ") || (ok.r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ")).slice(0, 300)]);
    const Q = atRem(); Q.rows.find(r => r.id === R0).asBuilt.summary = sum;
    const still = warnFor(Q);
    c.push(["…one that still stores its outcome is warned on, as before", still.w.length === 1, (still.r.stdout || "").slice(0, 300)]);
  });

  /* the template: a partially built row that already carries its as-built statements shows its summary above them (a static case on the
     template's source, and the rendering in a browser) */
  guard("the template: a row a later stage reopens shows its summary (what is built, what is left) above its as-built statements", c => {
    const tpl = rd(PB);
    c.push(["buildingLead() draws the summary of an in-progress or partially built row that has statements", /const buildingLead=\(r,st,cls\)=>\{[^\n]*\(st==="in-progress"\|\|st==="partially-built"\)&&stmtsOf\(b\)\.length/.test(tpl), "buildingLead() not found in its form"]);
    c.push(["…in the As built cell, the inspector and the As built tab's card", /builtBody=\(r,st\)=>\{[^\n]*buildingLead\(r,st\)\+s/.test(tpl) && /buildingLead\(r,st,"lead"\)\+stmtsHtml\(r,"built"\)/.test(tpl) && /buildingLead\(r,st,"blead"\)\+stmtsHtml\(r,"built"\)/.test(tpl), "a place without it"]);
    const P = atRem(), sum = "Built: the first fixes. Left: the second fixes, after the plan amendment.";
    P.rows.find(r => r.id === R0).asBuilt.state = "partially-built"; P.rows.find(r => r.id === R0).asBuilt.summary = sum;
    const dir = path.join(sc, "render"), page = wr(path.join(dir, "dashboard.html"), withData(tpl, "plan", js(P)));
    wr(path.join(dir, "plan.js"), require(sk("plan/scripts/lib.js")).sidecarText("plan", js(P)));
    const dom = dumpDom ? dumpDom(page, "", "1600,1000", 8000) : null;
    if (dom == null) { c.push(["the partially built row's cell shows the summary and the statements", false, NEEDS_BROWSER]); return; }
    const cell = (dom.match(new RegExp(`<div class="cell built[^"]*"[^>]*data-row="${R0}"[\\s\\S]*?<div class="meta">`)) || [""])[0];
    c.push(["the partially built row's cell shows the summary and the statements", /class="blead"/.test(cell) && cell.includes("Left: the second fixes") && /class="stmts marked/.test(cell), cell.slice(0, 300)]);
    const other = (dom.match(new RegExp(`<div class="cell built[^"]*"[^>]*data-row="${ids[2]}"[\\s\\S]*?<div class="meta">`)) || [""])[0];
    c.push(["…a row with its outcome shows its statements alone", other && !/class="blead"/.test(other), other.slice(0, 200)]);
  });

  /* a module's test task run whole over the board's own classes (WebTools #69, stage 1): "gatingTest (webtools-feeds)" and its two siblings
     were listed in Relevant as unchanged tests, and the sixteen Added classes they ran stayed "not run yet" */
  guard("testslib.js: a test task that passed whole over the board's own classes is their results", c => {
    const at = "2026-11-06T23:12:54Z", o = { now: at, ids: new Set(ids), stage: "S1" };
    const mk = () => ({ rows: EX.rows, tests: { updated: "2026-11-06T00:00:00Z", amended: [], relevant: [], added: [
      { class: "AComponentTest", module: "f", testLevel: "2", tests: 3 }, { class: "BComponentTest", module: "f", testLevel: "2", tests: 5 },
      { class: "CDeterministicTest", module: "f", testLevel: "4a", tests: 2 }, { class: "OtherComponentTest", module: "g", testLevel: "2", tests: 4 }] } });
    c.push(["bareName reads \"<name> (<module>)\" as <name>", TL.bareName("gatingTest (webtools-feeds)", "webtools-feeds") === "gatingTest" && TL.bareName("gatingTest (x)", "webtools-feeds") === "gatingTest (x)", js(TL.bareName("gatingTest (webtools-feeds)", "webtools-feeds"))]);
    const P = mk(); TL.mergeTests(P, { ran: [{ class: "componentTest (f)", module: "f", passed: 8, failed: 0, skipped: 0 }, { class: "deterministicTest (f)", module: "f", passed: 2, failed: 0, skipped: 0 }] }, o);
    const A = P.tests.added, res = n => (A.find(x => x.class === n) || {}).result || {};
    c.push(["each class of that module and level takes the result, passed whole with its own count", res("AComponentTest").passed === 3 && res("BComponentTest").passed === 5 && res("CDeterministicTest").passed === 2 && res("AComponentTest").state === "passed" && res("AComponentTest").at === at, js(A)]);
    c.push(["…a class of another module is untouched, and no Relevant entry is added", !res("OtherComponentTest").state && !P.tests.relevant.length, js(P.tests)]);
    c.push(["…and the same facts twice change nothing", !TL.mergeTests(P, { ran: [{ class: "componentTest (f)", module: "f", passed: 8, failed: 0, skipped: 0 }] }, o).changed, ""]);
    const Q = mk(); Q.tests.relevant = [{ class: "componentTest (f)", module: "f", tests: 8, result: { state: "passed", passed: 8, failed: 0, skipped: 0, at } }];
    TL.mergeTests(Q, { ran: [{ class: "componentTest", module: "f", passed: 8, failed: 0, skipped: 0 }] }, o);
    c.push(["an earlier event's Relevant entry for the same run goes once its classes carry it", !Q.tests.relevant.length && Q.tests.added[0].result && Q.tests.added[0].result.passed === 3, js(Q.tests)]);
    const F = mk(); TL.mergeTests(F, { ran: [{ class: "componentTest", module: "f", passed: 7, failed: 1, skipped: 0 }] }, o);
    c.push(["a run with a failure stays a Relevant entry of its own, its classes untouched", F.tests.relevant.length === 1 && F.tests.relevant[0].result.state === "failed" && !F.tests.added[0].result, js(F.tests)]);
    const M = mk(); TL.mergeTests(M, { ran: [{ class: "componentTest", module: "f", passed: 20, failed: 0, skipped: 0 }] }, o);
    c.push(["a run counting more than the board's classes (other classes of the module) stays a Relevant entry, as before", M.tests.relevant.length === 1 && M.tests.relevant[0].tests === 20 && !M.tests.added[0].result, js(M.tests)]);
  });

  /* a run's note (WebTools #65, qa pass 2): a failure the change did not cause, an untouched class of #62 timing out under parallel task runs,
     was drawn as the change's failure with nothing to say otherwise; the result now carries an optional note, shown on the card and in the
     inspector, taken by the fast path from facts.tests.ran[].note and replaced with the next result */
  guard("testslib.js, apply-event.js and the template: a test result's note", c => {
    const o = { now: "2026-11-02T02:06:09Z", ids: new Set(ids), pass: 2 }, Q = { rows: EX.rows, tests: null };
    const note = "Not this change's failure: an untouched class of an earlier issue, green in isolation.";
    TL.mergeTests(Q, { ran: [{ class: "nonfunctionalTest", module: "m", passed: 30, failed: 1, skipped: 0, note }] }, o);
    const e = ((Q.tests || {}).relevant || [])[0] || {};
    c.push(["facts.tests.ran[].note is kept with the result, the state still failed", e.result && e.result.note === note && e.result.state === "failed", js(e)]);
    c.push(["…and passes testsProblems()", !TL.testsProblems(Q).fail.length, js(TL.testsProblems(Q))]);
    TL.mergeTests(Q, { ran: [{ class: "nonfunctionalTest", module: "m", passed: 31, failed: 0, skipped: 0 }] }, { ...o, now: "2026-11-02T03:00:00Z", pass: 3 });
    const e2 = ((Q.tests || {}).relevant || [])[0] || {};
    c.push(["the next result replaces it, note and all", e2.result && e2.result.state === "passed" && e2.result.note == null, js(e2)]);
    const B = { rows: EX.rows, tests: { relevant: [{ class: "nonfunctionalTest", module: "m", result: { state: "failed", failed: 1, note: 3 } }] } };
    c.push(["a result.note that is not a text fails the check", TL.testsProblems(B).fail.some(f => /result.note must be a text/.test(f)), js(TL.testsProblems(B))]);
    const P = atRem(), L = lay(P), rq = wr(path.join(sc, "req-note.json"), js({ v: 1, action: "plan-board", github: P.repo, issue: P.issue, event: "qa-pass", folder: P.folder,
      facts: { step: "qa", qa: { pass: 2, verdict: "CHANGES REQUESTED", test: 1, code: 0, severity: { minor: 1, other: 0 }, route: "on-the-spot" }, rows: [R0], tests: { ran: [{ class: "nonfunctionalTest", module: "m", passed: 30, failed: 1, skipped: 0, note: "Not this change's failure:  an untouched class of an earlier issue." }] } } }));
    const a = run(APPLY, ["--event", rq, "--worktree", L.root, "--no-gh", "--no-live", "--at", "2026-11-02T02:06:09Z", "--json"]), p = JSON.parse(rd(path.join(L.dir, "plan.json")));
    const ne = ((p.tests || {}).relevant || []).find(x => x.class === "nonfunctionalTest") || {};
    c.push(["apply-event.js takes the note through the rewording of any text from the facts, as one line", a.status === 0 && ne.result && ne.result.note === "Not this change's failure: an untouched class of an earlier issue.", (a.stderr || "").slice(0, 200) + js(ne)]);
    const P2 = atRem(), L2 = lay(P2), rq2 = wr(path.join(sc, "req-note-2.json"), js({ v: 1, action: "plan-board", github: P2.repo, issue: P2.issue, event: "qa-pass", folder: P2.folder,
      facts: { step: "qa", qa: { pass: 2, verdict: "CHANGES REQUESTED", test: 1, code: 0, severity: { minor: 1, other: 0 }, route: "on-the-spot" }, rows: [R0], tests: { ran: [{ class: "nonfunctionalTest", module: "m", passed: 30, failed: 1, skipped: 0, note: "Pre-existing, as the admin team relays it." }] } } }));
    const a2 = run(APPLY, ["--event", rq2, "--worktree", L2.root, "--no-gh", "--no-live", "--at", "2026-11-02T02:06:09Z", "--json"]), p2 = JSON.parse(rd(path.join(L2.dir, "plan.json"))), S2 = parse(a2);
    const ne2 = ((p2.tests || {}).relevant || []).find(x => x.class === "nonfunctionalTest") || {};
    c.push(["…a note naming an internal name is never written with it, and the presenter is told", a2.status === 0 && !/admin team/i.test(js(ne2)) && /tests.note/.test(words(S2)), js(ne2) + " " + words(S2).slice(0, 300)]);
    const tpl = rd(PB);
    c.push(["the template's test card and inspector show the note (resNote())", tpl.includes("const resNote=e=>") && tpl.includes('<div class="tn">${rich(resNote(e))}</div>') && tpl.includes('<br>${rich(resNote(e))}'), "resNote() not found where the card and the inspector draw the result"]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  const NEEDS_BROWSER = "needs a browser: not run (verify-templates.js --browser runs it)";
  const withData = (tpl, block, json) => require(sk("plan/scripts/lib.js")).writeBlock(tpl, block, json);
  let bad = 0, skipped = 0;
  module.exports({ sk, out, targets, dumpDom: null, withData, NEEDS_BROWSER }).forEach(([what, cases]) => { const s = cases.filter(x => !x[1] && x[2] === NEEDS_BROWSER), b = cases.filter(x => !x[1] && x[2] !== NEEDS_BROWSER); bad += b.length; skipped += s.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length - s.length}/${cases.length - s.length} cases${s.length ? ` · not run without a browser: ${s.length}` : ""}`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
