// The cases of an event's facts.tests read as sent, and of a remediation halted and resumed (plan/scripts/testslib.js normEntry(), mergeTests();
// plan/scripts/apply-event.js; plan/scripts/check.js; KotlinBottools #24), run by verify-templates.js (it passes its helpers in), or on its own
// with no browser: node verify/cases-tests-facts.js [--out <dir>].
// The defects: a test set given as a set folder's name was dropped without a word, and fourteen classes were stored with no set; an event that
// reported S1 to S5 done at once stamped every class with S5, "S3 python" included, over the stage the board recorded; a qa pass's run naming
// another test set than the one recorded (S4 log-filter: integration held, deterministic run) was passed over in silence; and check.js warned
// "two visits answer the same qa pass" where the first visit had ended at a halt and the second resumed the same remediation. A testSet (the
// user's decisions of 2026-11-13: tests are in named sets) is stored by its name, and the other tests' counts keyed by it (the decision of
// 2026-11-14, q-149 (b); verify/fixtures/tests-testset.request.json); a testLevel sent in its place is no longer read (the transition's end,
// L12); an open board that stores the old numbers is written by name at its next rewrite, a closed one keeps them. And KotlinBottools #39: a
// shell script's run sent as "gselftest.sh gating" by a stage and "gselftest gating" by the qa pass made two entries; it is one class under the
// ".sh" name, and no other name is read so (testslib.js sameShRun()). Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesTestsFacts(X) {
  const { sk, out, targets } = X;
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html") || sk("plan/template/dashboard.html");
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const TL = require(sk("plan/scripts/testslib.js"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "tests-facts"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const ids = EX.rows.map(r => r.id), R0 = ids[0], R1 = ids[1];
  const PROC = "docs/plans/38-handshake-empty-name/plan.md";
  const stagesWith = state => [
    { id: "S1", name: "Baseline", state: state[0], rows: [R0], steps: [{ id: "branch", name: "The branch" }, { id: "workflow", name: "The workflow" }] },
    { id: "S2", name: "Local checks", state: state[1], rows: [R0], steps: [{ id: "python", name: "The Python files" }, { id: "workflow", name: "The workflow's shell" }] },
    { id: "S3", name: "Scans", state: state[2], rows: [R1], steps: [{ id: "mutations", name: "The table's mutations" }, { id: "log-filter", name: "The filter" }] }];
  /* the example while it builds: at implementation (or remediation), S1 to S3 as given, a Tests tab with one class recorded at S1 */
  const building = (step, state, tests) => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step, since: "2026-11-02T00:00:00Z", updated: "2026-11-02T00:00:00Z", current: [R0 + ".built"], questions: [], research: null, open: [], plan: null, qaMax: 3,
      ...(step === "remediation" ? { qa: [{ pass: 1, verdict: "changes-requested", date: "2026-11-02", at: "2026-11-02T00:00:00Z", findings: { test: 2, code: 0 }, route: "remediation" }], remediation: { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }] } } : { qa: [], remediation: null }),
      stages: stagesWith(state), steps: STEPS.slice(), event: { name: step === "remediation" ? "qa-pass" : "branch-cut", at: "2026-11-02T00:00:00Z" } };
    x.tests = tests || { base: "master", updated: "2026-11-02T00:00:00Z", added: [{ class: "S1 branch", module: "plan procedure", testSet: "gating", path: PROC, tests: 4, stage: "S1" }], amended: [], relevant: [] }; return x; };
  let n = 0;
  const lay = plan => { const root = path.join(sc, `b-${++n}`), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir }; };
  const ev = (B, plan, event, facts, at) => { const rq = wr(path.join(sc, `req-${n}-${at.replace(/\D/g, "")}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event, folder: plan.folder, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const all = p => [...(p.tests.added || []), ...(p.tests.amended || []), ...(p.tests.relevant || [])];
  const cls = (p, c) => all(p).find(e => e.class === c) || {};
  const warnsOf = S => (S.warnings || []).map(String).join(" | "), whyOf = S => (S.why || []).map(String).join(" | ");
  const cl = (c, set, extra) => ({ class: c, module: "plan procedure", testSet: set, path: PROC, tests: 3, rows: [R0], ...(extra || {}) });

  /* 1. a test set given by its name, by its old number, or not read; a testLevel sent in its place is not read (the transition's end, L12) */
  guard("testslib.js: a testSet is stored by its name, one sent by its old number as its set, and one it cannot read is named; a testLevel sent in its place is not read (KotlinBottools #24; L12)", c => {
    const P = { rows: EX.rows, tests: null }, o = { now: "2026-11-02T01:00:00Z", ids: new Set(ids) };
    const r = TL.mergeTests(P, { added: [cl("S2 python", "gating"), cl("S3 mutations", "integration"), cl("S3 negatives", "Component"), cl("S3 gate", "nonfunctional"), cl("S3 log", "testing.deterministic")] }, o);
    const st = c0 => ((P.tests || {}).added || []).find(e => e.class === c0) || {};
    c.push(["the names stored by name: gating, integration, Component as component, nonfunctional, testing.deterministic as deterministic", st("S2 python").testSet === "gating" && st("S3 mutations").testSet === "integration" && st("S3 negatives").testSet === "component" && st("S3 gate").testSet === "nonfunctional" && st("S3 log").testSet === "deterministic", js(((P.tests || {}).added || []).map(e => [e.class, e.testSet]))]);
    c.push(["…with nothing said, and nothing stored under testLevel", !(r.warnings || []).length && !r.notes.length && !((P.tests || {}).added || []).some(e => "testLevel" in e), js([r.warnings, r.notes])]);
    const P2 = { rows: EX.rows, tests: null }, r2 = TL.mergeTests(P2, { added: [cl("S2 odd", "L9"), { class: "com.acme.testing.integration.FooTest", module: "m", testSet: "fast", tests: 2 }] }, o);
    const a2 = ((P2.tests || {}).added || []);
    c.push(["a value that is neither is not read and is named for the presenter (enrich), with the set its path or package gives where it gives one", !(a2.find(e => e.class === "S2 odd") || {}).testSet && (a2.find(e => /FooTest/.test(e.class)) || {}).testSet === "integration" && r2.notes.some(x => /testSet not read/.test(x) && /"L9" \(S2 odd\)/.test(x) && /"fast" \(com\.acme\.testing\.integration\.FooTest \(its path: integration\)\)/.test(x)), js([a2.map(e => [e.class, e.testSet]), r2.notes])]);
    const P3 = { rows: EX.rows, tests: null }, r3 = TL.mergeTests(P3, { added: [cl("S2 python", "1"), cl("S3 log", "4a")] }, o);
    c.push(["a set sent by its old number is stored by its name, with nothing said", (r3.warnings || []).length === 0 && !r3.notes.length && P3.tests.added.map(e => e.testSet).join() === "gating,deterministic", js([r3.warnings, r3.notes, P3.tests.added])]);
    /* the transition's end (L12): a testLevel, or a level, sent in place of testSet is no longer read, and no TEST LEVEL BY NAME is said */
    const P4 = { rows: EX.rows, tests: null }, r4 = TL.mergeTests(P4, { added: [{ class: "S2 python", module: "plan procedure", testLevel: "gating", path: PROC, tests: 3 }, { class: "com.acme.testing.component.BarTest", module: "m", testLevel: "3", tests: 1 }, { class: "S3 log", module: "plan procedure", level: "4a", path: PROC, tests: 2 }] }, o);
    const a4 = ((P4.tests || {}).added || []), s4 = c0 => a4.find(e => e.class === c0) || {};
    c.push(["a testLevel or a level sent in place of testSet is not read: a class takes the set its path names (BarTest: component, not integration), else none", !s4("S2 python").testSet && s4("com.acme.testing.component.BarTest").testSet === "component" && !s4("S3 log").testSet && !a4.some(e => "testLevel" in e || "level" in e), js(a4)]);
    c.push(["…and nothing is said of it: no TEST LEVEL BY NAME, no note", !(r4.warnings || []).length && !r4.notes.length, js([r4.warnings, r4.notes])]);
    /* the fast path stores the set by its name and says nothing of it */
    const d = building("implementation", ["done", "current", "todo"]), B = lay(d);
    const e = ev(B, d, "implementation-stage", { stage: "S2", stages: [{ id: "S1", name: "Baseline", state: "done" }, { id: "S2", name: "Local checks", state: "done" }, { id: "S3", name: "Scans", state: "current" }], tests: { added: [cl("S2 python", "gating")] } }, "2026-11-02T01:00:00Z");
    c.push(["apply-event.js stores the set by its name, with no warning on it", e.a.status === 0 && !/TEST LEVEL BY NAME/.test(warnsOf(e.S)) && cls(e.p, "S2 python").testSet === "gating" && !("testLevel" in cls(e.p, "S2 python")), js([e.S.result, e.S.warnings, e.S.error, cls(e.p, "S2 python")])]);
  });

  /* 2. several stages done at once */
  guard("apply-event.js: an event that reports several stages done at once stamps no class with the last one (KotlinBottools #24)", c => {
    const facts3 = (tests, extra) => ({ stage: "S3", stages: [{ id: "S1", name: "Baseline", state: "done", steps: ["branch", "workflow"] }, { id: "S2", name: "Local checks", state: "done", steps: ["python", "workflow"] }, { id: "S3", name: "Scans", state: "done", steps: ["mutations", "log-filter"] }], tests, ...(extra || {}) });
    const tests = { added: [cl("S2 python", "gating"), cl("S3 mutations", "integration"), cl("mutations", "integration"), cl("workflow", "gating"), cl("FooTest", "component"), cl("S1 branch", "gating")] };
    /* (a) S1 to S3 finished by one report, the board at implementation */
    const d = building("implementation", ["done", "current", "todo"]); d.tests.added[0].stage = "S1"; const B = lay(d);
    const d2 = building("implementation", ["current", "todo", "todo"]); const B2 = lay(d2);
    const e = ev(B2, d2, "implementation-stage", facts3(tests), "2026-11-02T01:00:00Z");
    c.push(["S1 to S3 reported done at once: a class whose stage's steps name it takes that stage (\"S2 python\" S2, \"S3 mutations\" S3, a bare step one stage alone has: \"mutations\" S3)", e.a.status === 0 && cls(e.p, "S2 python").stage === "S2" && cls(e.p, "S3 mutations").stage === "S3" && cls(e.p, "mutations").stage === "S3", js(all(e.p).map(x => [x.class, x.stage]))]);
    c.push(["…a class no stage's steps name, or a step two stages share (\"workflow\"), takes no stage, never the last one, and is named for the presenter", !cls(e.p, "FooTest").stage && !cls(e.p, "workflow").stage && /reported done at once, and no stage's steps name workflow, FooTest: no stage written/.test(whyOf(e.S)), js([cls(e.p, "FooTest"), e.S.why])]);
    c.push(["…a class the board records keeps its stage (S1 branch: S1), unless its own entry names one", cls(e.p, "S1 branch").stage === "S1", js(cls(e.p, "S1 branch"))]);
    const own = ev(B, d, "implementation-stage", facts3({ amended: [cl("S1 branch", "gating", { stage: "S2" })] }), "2026-11-02T01:00:00Z");
    c.push(["…its own entry's stage is taken", own.a.status === 0 && cls(own.p, "S1 branch").stage === "S2", js(cls(own.p, "S1 branch"))]);
    const again = ev(B2, d2, "implementation-stage", facts3(tests), "2026-11-02T01:00:00Z");
    c.push(["…and the same event twice writes the same", again.a.status === 0 && js(again.p.tests.added.map(x => [x.class, x.stage])) === js(e.p.tests.added.map(x => [x.class, x.stage])), js([again.S.result, again.p.tests.added.map(x => [x.class, x.stage])])]);
    /* (b) a remediation that runs every stage again: none finished by this report, every one listed done */
    const r = building("remediation", ["done", "done", "done"], { base: "master", updated: "2026-11-02T00:00:00Z", added: [cl("S2 python", "gating", { stage: "S2" }), cl("S3 log-filter", "integration", { stage: "S3" })], amended: [], relevant: [] }); const BR = lay(r);
    const er = ev(BR, r, "implementation-stage", facts3({ added: [cl("S2 python", "gating"), cl("S3 log-filter", "integration"), cl("S3 mutations", "integration"), cl("controls.py", "integration")] }, { remediation: { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "done" }] } }), "2026-11-02T02:00:00Z");
    c.push(["a remediation running S1 to S3 again: the classes on the board keep their stages (S2, S3), none restamped S3", er.a.status === 0 && cls(er.p, "S2 python").stage === "S2" && cls(er.p, "S3 log-filter").stage === "S3", js(all(er.p).map(x => [x.class, x.stage]))]);
    c.push(["…a new class takes the stage whose steps name it (S3 mutations: S3), and one no step names the remediation's fixes (Quality Review 1 fixes)", cls(er.p, "S3 mutations").stage === "S3" && /Quality Review 1 fixes/.test(cls(er.p, "controls.py").stage || ""), js([cls(er.p, "S3 mutations"), cls(er.p, "controls.py")])]);
    /* (c) one stage reported: as before, its classes take it */
    const s = building("implementation", ["done", "current", "todo"]); const BS = lay(s);
    const es = ev(BS, s, "implementation-stage", { stage: "S2", stages: [{ id: "S1", name: "Baseline", state: "done" }, { id: "S2", name: "Local checks", state: "done" }, { id: "S3", name: "Scans", state: "current" }], tests: { added: [cl("FooTest", "component")], amended: [cl("S1 branch", "gating")] } }, "2026-11-02T01:00:00Z");
    c.push(["one stage reported done (S2): every class it names takes it, a class changed at that stage included (the last stage that added or changed it), as before", es.a.status === 0 && cls(es.p, "FooTest").stage === "S2" && cls(es.p, "S1 branch").stage === "S2" && !/reported done at once/.test(whyOf(es.S)), js(all(es.p).map(x => [x.class, x.stage]))]);
  });

  /* 3. a set a later event sends otherwise */
  guard("testslib.js: a recorded test set that a later event sends otherwise is replaced, and said with the set held and the set sent (KotlinBottools #24)", c => {
    const P = { rows: EX.rows, tests: { base: "master", updated: "2026-11-02T00:00:00Z", added: [cl("S4 log-filter", "integration", { stage: "S4" })], amended: [], relevant: [] } };
    const r = TL.mergeTests(P, { ran: [{ class: "S4 log-filter", module: "plan procedure", testSet: "deterministic", passed: 4, failed: 0, skipped: 0 }] }, { now: "2026-11-02T01:00:00Z", pass: 3, ids: new Set(ids) });
    const e = P.tests.added[0];
    c.push(["a qa pass's run naming deterministic for a class held at integration: the run's set written, its result with it", e.testSet === "deterministic" && e.result && e.result.state === "passed" && e.result.pass === 3, js(e)]);
    c.push(["…and said: the class, the set held and the set sent, each by its name", (r.warnings || []).some(x => /TEST SET CHANGED: S4 log-filter \(plan procedure\): the board held the set integration, the event sent deterministic; written deterministic/.test(x)), js(r.warnings)]);
    const r2 = TL.mergeTests(P, { ran: [{ class: "S4 log-filter", module: "plan procedure", testSet: "deterministic", passed: 4, failed: 0, skipped: 0 }] }, { now: "2026-11-02T01:00:00Z", pass: 3, ids: new Set(ids) });
    c.push(["…the same facts again change nothing and say nothing", !r2.changed && !(r2.warnings || []).length, js([r2.changed, r2.warnings])]);
    const P2 = { rows: EX.rows, tests: { added: [cl("S4 scans", "integration")], amended: [], relevant: [] } };
    const r3 = TL.mergeTests(P2, { amended: [cl("S4 scans", "component")] }, { now: "2026-11-02T01:00:00Z", stage: "S4", ids: new Set(ids) });
    c.push(["an implementation stage's facts that change a recorded set are said the same way", P2.tests.added[0].testSet === "component" && (r3.warnings || []).some(x => /S4 scans .*held the set integration, the event sent component/.test(x)), js([P2.tests.added[0], r3.warnings])]);
    const r4 = TL.mergeTests({ rows: EX.rows, tests: { added: [cl("S4 x", "integration")], amended: [], relevant: [] } }, { ran: [{ class: "S4 x", module: "plan procedure", passed: 3 }] }, { now: "2026-11-02T01:00:00Z", pass: 1, ids: new Set(ids) });
    c.push(["a run that names no set keeps the recorded one, with nothing said", !(r4.warnings || []).length, js(r4.warnings)]);
    /* an open board written before the sets were stored by name: its testLevel is the set held, and the class merged stores testSet alone */
    const P5 = { rows: EX.rows, status: "building", wip: { step: "qa" }, tests: { added: [{ class: "S4 old", module: "plan procedure", testLevel: "3", path: PROC, tests: 3 }], amended: [], relevant: [] } };
    const r5 = TL.mergeTests(P5, { ran: [{ class: "S4 old", module: "plan procedure", testSet: "deterministic", passed: 3, failed: 0, skipped: 0 }] }, { now: "2026-11-02T01:00:00Z", pass: 1, ids: new Set(ids) });
    const e5 = P5.tests.added[0];
    c.push(["an open board's old testLevel 3 is the set held (integration): the run's set written by name, testLevel gone, and said", e5.testSet === "deterministic" && !("testLevel" in e5) && (r5.warnings || []).some(x => /S4 old .*held the set integration, the event sent deterministic/.test(x)), js([e5, r5.warnings])]);
  });

  /* 4. a remediation halted and resumed */
  guard("check.js: a remediation visit ended by a halt and the visit that resumes the same pass are one loop (KotlinBottools #24)", c => {
    const base = () => { const d = copy(EX); d.wip = { ...d.wip, history: { ...(d.wip.history || {}) } }; return d; };
    const vis = (pass, since, ended, endedBy, extra) => ({ since, ended, endedBy, to: endedBy === "halted" ? "remediation" : "qa", remediation: { pass, route: "remediation" }, ...(extra || {}) });
    const chk = H => { const d = base(); d.wip.history.remediation = H; const B = lay(d), k = run(CHECK, [B.dir]); return (k.stdout || "").split(/\r?\n/).filter(l => /two visits answer the same qa pass/.test(l)).join(" | "); };
    const halted = chk([vis(1, "2026-10-25T10:00:00Z", "2026-10-25T10:10:00Z", "halted", { held: true }), vis(1, "2026-10-25T10:30:00Z", "2026-10-25T11:00:00Z", "qa-pass"), vis(2, "2026-10-25T12:00:00Z", "2026-10-25T12:30:00Z", "qa-pass")]);
    c.push(["visits 1 (ended by a halt), 1 (resumed) and 2: no warning", !halted, halted || "no warning"]);
    const twice = chk([vis(1, "2026-10-25T10:00:00Z", "2026-10-25T10:10:00Z", "qa-pass"), vis(1, "2026-10-25T10:30:00Z", "2026-10-25T11:00:00Z", "qa-pass"), vis(2, "2026-10-25T12:00:00Z", "2026-10-25T12:30:00Z", "qa-pass")]);
    c.push(["two loops of pass 1 with no halt between: still warned", /two visits answer the same qa pass \(1, 1, 2\)/.test(twice), twice || "no warning"]);
    const apart = chk([vis(1, "2026-10-25T10:00:00Z", "2026-10-25T10:10:00Z", "halted", { held: true }), vis(2, "2026-10-25T10:30:00Z", "2026-10-25T11:00:00Z", "qa-pass"), vis(1, "2026-10-25T12:00:00Z", "2026-10-25T12:30:00Z", "qa-pass")]);
    c.push(["a halted visit of pass 1 not resumed next (pass 2 between) is still its own loop: warned", /two visits answer the same qa pass/.test(apart), apart || "no warning"]);
  });

  /* 5. the sets stored by name (the user's decisions of 2026-11-13: vocabulary/decided-set (3), choice-1-live-keys (a); the decision of
     2026-11-14, q-149 (b): the board stores each set by its name, testSet, and keys the other tests' counts by it) */
  guard("testslib.js: a testSet is stored by its name, and the other tests' counts keyed by the set's name, a count keyed by an old number read as its set's", c => {
    const o = { now: "2026-11-13T01:00:00Z", ids: new Set(ids) }, m = (cl0, extra) => ({ class: cl0, module: "m", tests: 1, ...extra });
    const P = { rows: EX.rows, tests: null }, r = TL.mergeTests(P, { added: [m("A", { testSet: "gating" }), m("B", { testSet: "Integration" }), m("C", { testSet: "testing.e2e" }), m("D", { testSet: "nonfunctional" }), m("E", { testSet: "uat" }), m("F", { testSet: "deterministic" }), m("G", { testSet: "component" })] }, o);
    const got = ((P.tests || {}).added || []).map(e => e.testSet).join();
    c.push(["the seven names stored by name: gating, integration, e2e, nonfunctional, uat, deterministic, component", got === "gating,integration,e2e,nonfunctional,uat,deterministic,component", got]);
    c.push(["…with nothing said: a set's name is the rule", !(r.warnings || []).length && !r.notes.length, js([r.warnings, r.notes])]);
    const P2 = { rows: EX.rows, tests: null }; TL.mergeTests(P2, { added: [m("A", { testSet: "integration", testLevel: "1" }), m("B", { testSet: " ", testLevel: "4a" }), m("C", { testSet: "3" })] }, o);
    const got2 = ((P2.tests || {}).added || []).map(e => e.testSet || "-").join();
    c.push(["a testSet read, a testLevel beside it not; an empty testSet stores no set (its testLevel unread); a testSet sent as a number stored as its set", got2 === "integration,-,integration" && !((P2.tests || {}).added || []).some(e => "testLevel" in e), got2]);
    const P3 = { rows: EX.rows, tests: null }, r3 = TL.mergeTests(P3, { added: [m("S2 odd", { testSet: "fast" }), { class: "com.acme.testing.uat.FooTest", module: "m", testSet: "smoke", tests: 2 }] }, o);
    const a3 = ((P3.tests || {}).added || []), n3 = r3.notes.join(" | ");
    c.push(["a testSet that is neither a name nor a number is not read, and named for the presenter, with the set its path names where it names one", !(a3.find(e => e.class === "S2 odd") || {}).testSet && (a3.find(e => /FooTest/.test(e.class)) || {}).testSet === "uat" && /testSet not read/.test(n3) && /"fast" \(S2 odd\)/.test(n3) && /"smoke" \(com\.acme\.testing\.uat\.FooTest \(its path: uat\)\)/.test(n3), js([a3.map(e => [e.class, e.testSet]), r3.notes])]);
    const P4 = { rows: EX.rows, tests: null }; TL.mergeTests(P4, { other: { byModule: { core: { gating: 5, component: { classes: 3, tests: 12 }, "4b": 1 }, api: { "2": 7 } } } }, o);
    c.push(["other.byModule keyed by the sets' names, a count keyed by an old number keyed by its set's name, in the sets' order", js((P4.tests || {}).other) === js({ byModule: { api: { component: 7 }, core: { gating: 5, component: { classes: 3, tests: 12 }, e2e: 1 } } }), js((P4.tests || {}).other)]);
    const P5 = { rows: EX.rows, tests: null }; TL.mergeTests(P5, { other: { byModule: { core: { integration: 2, "3": 9 } } } }, o);
    c.push(["…a set's name before its old number where both are sent", js(((P5.tests || {}).other || {}).byModule) === js({ core: { integration: 2 } }), js((P5.tests || {}).other)]);
    /* the request fixture through the fast path, and a twin that sends testLevel in place of testSet (no longer read) */
    const RQ = J("verify/fixtures/tests-testset.request.json"), twin = copy(RQ.facts);
    twin.tests.added.forEach(e => { e.testLevel = String(TL.TEST_LEVELS[TL.TEST_SETS.indexOf(e.testSet)]); delete e.testSet; });
    const dN = building("implementation", ["done", "current", "todo"]), BN = lay(dN), eN = ev(BN, dN, RQ.event, RQ.facts, RQ.facts.at);
    const dO = building("implementation", ["done", "current", "todo"]), BO = lay(dO), eO = ev(BO, dO, RQ.event, twin, RQ.facts.at);
    const sN = RQ.facts.tests.added.map(e => cls(eN.p, e.class).testSet).join();
    c.push(["the request fixture (verify/fixtures/tests-testset.request.json) through apply-event.js: each class's set stored by its name, the counts by name", eN.a.status === 0 && sN === "component,integration,deterministic,nonfunctional" && js(eN.p.tests.other.byModule.core) === js({ gating: 5, component: { classes: 3, tests: 12 }, e2e: 1 }), js([eN.S.error, sN, eN.p.tests && eN.p.tests.other])]);
    const sO = RQ.facts.tests.added.map(e => cls(eO.p, e.class).testSet || "-").join();
    c.push(["…a twin sending testLevel in place of testSet: not read, each class takes the set its package names (component, integration), else none", eO.a.status === 0 && sO === "component,integration,-,-" && !all(eO.p).some(e => "testLevel" in e) && !/TEST LEVEL BY NAME/.test(warnsOf(eO.S)), js([eO.S.error, sO, eO.S.warnings])]);
  });

  /* 6. an open board written before the sets were stored by name: written by name at its next rewrite; a closed board keeps what it holds */
  guard("testslib.js storeSets(), embed.js, check.js: an open board's testLevel and counts by an old number written by the sets' names at a rewrite; a closed board keeps them, read for good (q-149 (b))", c => {
    const old = () => ({ base: "master", updated: "2026-11-02T00:00:00Z", added: [{ class: "S1 branch", module: "plan procedure", testLevel: "1", path: PROC, tests: 4, stage: "S1" }, { class: "com.acme.testing.integration.HandshakeTest", module: "core", testLevel: "3", tests: 2 }], amended: [], relevant: [], other: { byModule: { core: { "1": 5, "2": { classes: 3, tests: 12 }, none: 2 } } } });
    const open = { status: "building", wip: { step: "implementation" }, tests: old() }, lines = TL.storeSets(open), a = open.tests.added;
    c.push(["an open board: each testLevel becomes testSet where it stood, by name (gating, integration), and one line says so", lines.length === 1 && /test sets stored by name, no longer by an old number \(testLevel\): 2 classes, the other tests' counts of 1 module$/.test(lines[0]) && a[0].testSet === "gating" && a[1].testSet === "integration" && !a.some(e => "testLevel" in e) && Object.keys(a[0]).join() === "class,module,testSet,path,tests,stage", js([lines, a])]);
    c.push(["…the other tests' counts keyed by the sets' names, \"none\" kept", js(open.tests.other.byModule.core) === js({ gating: 5, component: { classes: 3, tests: 12 }, none: 2 }), js(open.tests.other)]);
    c.push(["…and again: nothing left to write", !TL.storeSets(open).length, "a second storeSets() wrote something"]);
    const closed = { status: "built", wip: { step: "landed" }, tests: old() }, before = js(closed.tests);
    c.push(["a closed board (landed) keeps its testLevel and its counts by number, as it closed", !TL.storeSets(closed).length && js(closed.tests) === before, js(closed.tests)]);
    c.push(["…read for good: its classes' sets and the template's reading are the same (gating, integration)", closed.tests.added.map(e => TL.testSetOf(e)).join() === "gating,integration", js(closed.tests.added.map(e => TL.testSetOf(e)))]);
    /* the checks: an open board that still holds the old form is warned, never failed; a closed one is neither */
    const pw = TL.testsProblems({ status: "building", wip: { step: "implementation" }, rows: [], tests: old() }), pc = TL.testsProblems({ status: "built", wip: { step: "landed" }, rows: [], tests: old() });
    c.push(["check.js on an open board still holding testLevel: warned (its set by its old number; the counts by number), not failed", !pw.fail.length && pw.warn.some(x => /stores its set by its old number \(testLevel 1\)/.test(x)) && pw.warn.some(x => /tests\.other\.byModule\.core\.1: a count keyed by a set's old number/.test(x)), js(pw)]);
    c.push(["…on a closed one: neither", !pc.fail.length && !pc.warn.some(x => /old number/.test(x)), js(pc)]);
    const pb = TL.testsProblems({ status: "building", wip: { step: "implementation" }, rows: [], tests: { added: [{ class: "X", testSet: "fast" }, { class: "Y", testLevel: "9" }], amended: [], relevant: [], other: { byModule: { core: { smoke: 1 } } } } });
    c.push(["a testSet that is no set's name, a testLevel that is no old number and a count keyed by neither fail", pb.fail.some(x => /testSet must be one of gating/.test(x)) && pb.fail.some(x => /testLevel, an older board's set by its old number/.test(x)) && pb.fail.some(x => /core\.smoke: not a test set/.test(x)), js(pb.fail)]);
    /* through embed.js: the open board rewritten, the example (landed) left as it closed */
    const d = building("implementation", ["done", "current", "todo"], old()), B = lay(d), pd = JSON.parse(rd(path.join(B.dir, "plan.json")));
    c.push(["embed.js rewrites an open board's tests by the sets' names", (pd.tests.added || []).every(e => !("testLevel" in e)) && pd.tests.added.map(e => e.testSet).join() === "gating,integration" && js(pd.tests.other.byModule.core) === js({ gating: 5, component: { classes: 3, tests: 12 }, none: 2 }), js(pd.tests)]);
    const x = copy(EX); x.tests = old(); const BX = lay(x), px = JSON.parse(rd(path.join(BX.dir, "plan.json")));
    c.push(["…and leaves the landed example's testLevel as it closed", js(px.tests.added) === js(x.tests.added) && js(px.tests.other) === js(x.tests.other), js(px.tests)]);
    /* the plan-board template reads both forms */
    const tpl = rd(PB);
    c.push(["the plan-board template's tlOf() reads testSet first, then an older board's testLevel, and otherOf() keys a count by name or old number alike", /const tlOf=e=>\{ const s=e&&typeof e\.testSet==="string"\?TLV_SEG\[e\.testSet\]:null;/.test(tpl) && /const otherOf=T=>\{[^\n]*\n[^\n]*TLV_SEG\[k\]/.test(tpl), "tlOf() or otherOf() as before"]);
  });

  /* 7. a shell script's run named with and without ".sh" (KotlinBottools #39: an implementation stage sent "gselftest.sh gating", the qa
     pass "gselftest gating", and the Tests tab listed each of the five runs twice) */
  guard("testslib.js and apply-event.js: a shell script's run in a set, named with and without \".sh\", is one class under the \".sh\" name; no other name is (KotlinBottools #39)", c => {
    const MD = "tools/g27", SETS5 = ["gating", "deterministic", "component", "integration", "nonfunctional"], N5 = [49, 63, 80, 420, 23];
    const runOf = (name, set, n, extra) => ({ class: name, module: MD, testSet: set, passed: n, failed: 0, skipped: 0, ...(extra || {}) });
    const o = (pass, at) => ({ now: at || "2026-11-14T08:21:15Z", ...(pass ? { pass } : {}), ids: new Set(ids) });
    const names = P => all(P).map(e => e.class);
    /* (a) the board holds the ".sh" run, the qa pass sends it without */
    const P = { rows: EX.rows, tests: null };
    TL.mergeTests(P, { ran: SETS5.map((s, i) => runOf("gselftest.sh " + s, s, N5[i])) }, { ...o(0, "2026-11-14T07:34:38Z"), stage: "S2" });
    const r = TL.mergeTests(P, { ran: SETS5.map((s, i) => runOf("gselftest " + s, s, N5[i])) }, o(1));
    c.push(["the five runs sent with \".sh\", then by the qa pass without: five entries, each named with \".sh\"", names(P).join() === SETS5.map(s => "gselftest.sh " + s).join(), js(names(P))]);
    c.push(["…each with the qa pass's result (pass 1) and its count", all(P).every((e, i) => e.result && e.result.pass === 1 && e.result.passed === N5[i] && e.tests === N5[i]) && r.changed, js(all(P).map(e => [e.class, e.tests, e.result]))]);
    c.push(["…and the same facts again change nothing", !TL.mergeTests(P, { ran: SETS5.map((s, i) => runOf("gselftest " + s, s, N5[i])) }, o(1)).changed, js(names(P))]);
    /* (b) the other way round: the board holds the name without ".sh"; the run named with it is the same class and its name is kept */
    const Q = { rows: EX.rows, tests: { base: "master", updated: "2026-11-14T07:00:00Z", added: [], amended: [], relevant: [{ class: "gselftest gating", module: MD, testSet: "gating", tests: 49 }] } };
    TL.mergeTests(Q, { ran: [runOf("gselftest.sh gating", "gating", 49)] }, o(1));
    c.push(["the board's \"gselftest gating\", then a run of \"gselftest.sh gating\": one entry, renamed to the \".sh\" name", names(Q).join() === "gselftest.sh gating" && Q.tests.relevant[0].result.pass === 1, js(Q.tests)]);
    const A = { rows: EX.rows, tests: { base: "master", updated: "2026-11-14T07:00:00Z", added: [], amended: [], relevant: [{ class: "gselftest gating", module: MD, testSet: "gating", tests: 49 }] } };
    TL.mergeTests(A, { added: [{ class: "gselftest.sh gating", module: MD, testSet: "gating", tests: 50 }] }, { ...o(0), stage: "S3" });
    c.push(["…an added \"gselftest.sh gating\" over a Relevant \"gselftest gating\": one entry, moved to Added, under the \".sh\" name", names(A).join() === "gselftest.sh gating" && A.tests.added.length === 1 && !A.tests.relevant.length && A.tests.added[0].tests === 50, js(A.tests)]);
    const D = { rows: EX.rows, tests: { base: "master", updated: "2026-11-14T07:00:00Z", added: [], amended: [], relevant: [{ class: "gselftest.sh gating", module: MD, testSet: "gating", tests: 49 }] } };
    TL.mergeTests(D, { drop: [{ class: "gselftest gating", module: MD }] }, o(0));
    c.push(["…and a drop names it either way", !all(D).length, js(D.tests)]);
    /* (c) not the same class: another suffix, ".SH", no set's name after it, another set, another script, another module */
    [["gselftest.py gating", "gselftest gating"], ["gselftest.bash gating", "gselftest gating"], ["gselftest.SH gating", "gselftest gating"], ["gselftest.sh", "gselftest"], ["gselftest.sh gating", "gselftest component"], ["other.sh gating", "gselftest gating"], ["gselftest.sh fast", "gselftest fast"], ["gselftest.sh gating", "gselftest.sh  gating"]].forEach(([held, sent]) => {
      const X = { rows: EX.rows, tests: { base: "master", updated: "2026-11-14T07:00:00Z", added: [], amended: [], relevant: [{ class: held, module: MD, tests: 3 }] } };
      TL.mergeTests(X, { ran: [{ class: sent, module: MD, passed: 3, failed: 0, skipped: 0 }] }, o(1));
      c.push([`"${held}" held, "${sent}" sent: two entries, the held one untouched`, all(X).length === 2 && !X.tests.relevant[0].result && X.tests.relevant[0].class === held, js(X.tests.relevant)]);
    });
    const M = { rows: EX.rows, tests: { base: "master", updated: "2026-11-14T07:00:00Z", added: [], amended: [], relevant: [{ class: "gselftest.sh gating", module: MD, tests: 3 }] } };
    TL.mergeTests(M, { ran: [{ class: "gselftest gating", module: "tools/other", passed: 3, failed: 0, skipped: 0 }] }, o(1));
    c.push(["the same names in another module: two entries", all(M).length === 2 && !M.tests.relevant[0].result, js(M.tests.relevant)]);
    /* (d) through apply-event.js: the implementation stage's facts, then the qa pass's, as KotlinBottools #39 sent them */
    const d = building("implementation", ["done", "current", "todo"], { base: "master", updated: "2026-11-02T00:00:00Z", added: [], amended: [], relevant: [] }), B = lay(d);
    const e1 = ev(B, d, "implementation-stage", { stage: "S2", stages: [{ id: "S1", name: "Baseline", state: "done" }, { id: "S2", name: "Local checks", state: "done" }, { id: "S3", name: "Scans", state: "current" }], tests: { ran: SETS5.map((s, i) => runOf("gselftest.sh " + s, s, N5[i])) } }, "2026-11-02T01:00:00Z");
    const e2 = ev(B, d, "qa-pass", { qa: { pass: 1, verdict: "CHANGES REQUESTED", test: 2, code: 0, route: "remediation" }, tests: { ran: SETS5.map((s, i) => runOf("gselftest " + s, s, N5[i])), other: { byModule: {} } } }, "2026-11-02T02:00:00Z");
    c.push(["apply-event.js: the stage's \".sh\" runs, then the qa pass's runs without: five Relevant entries under the \".sh\" names, each with pass 1", e1.a.status === 0 && e2.a.status === 0 && names(e2.p).join() === SETS5.map(s => "gselftest.sh " + s).join() && all(e2.p).every(x => x.result && x.result.pass === 1), js([e1.S.error, e2.S.error, e2.S.applied, all(e2.p).map(x => [x.class, x.result && x.result.pass])])]);
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
