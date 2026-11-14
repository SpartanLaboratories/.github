// The cases of an event's facts.tests read as sent, and of a remediation halted and resumed (plan/scripts/testslib.js normEntry(), mergeTests();
// plan/scripts/apply-event.js; plan/scripts/check.js; KotlinBottools #24), run by verify-templates.js (it passes its helpers in), or on its own
// with no browser: node verify/cases-tests-facts.js [--out <dir>].
// The defects: a testLevel given as a level folder's name ("gating", "component", "integration", "nonfunctional") was dropped without a word,
// and fourteen classes were stored with no level; an event that reported S1 to S5 done at once stamped every class with S5, "S3 python"
// included, over the stage the board recorded; a qa pass's run naming another test level than the one recorded (S4 log-filter: 3 held, 4a
// run) was passed over in silence; and check.js warned "two visits answer the same qa pass" where the first visit had ended at a halt and the
// second resumed the same remediation. A testSet (the user's decisions of 2026-11-13: tests are in named sets) is read beside a testLevel, and
// the other tests' counts keyed by a set's name beside a level's (verify/fixtures/tests-testset.request.json). Each group returns [title, cases], a case [name, ok, detail].
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
    x.tests = tests || { base: "master", updated: "2026-11-02T00:00:00Z", added: [{ class: "S1 branch", module: "plan procedure", testLevel: "1", path: PROC, tests: 4, stage: "S1" }], amended: [], relevant: [] }; return x; };
  let n = 0;
  const lay = plan => { const root = path.join(sc, `b-${++n}`), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir }; };
  const ev = (B, plan, event, facts, at) => { const rq = wr(path.join(sc, `req-${n}-${at.replace(/\D/g, "")}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event, folder: plan.folder, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const all = p => [...(p.tests.added || []), ...(p.tests.amended || []), ...(p.tests.relevant || [])];
  const cls = (p, c) => all(p).find(e => e.class === c) || {};
  const warnsOf = S => (S.warnings || []).map(String).join(" | "), whyOf = S => (S.why || []).map(String).join(" | ");
  const cl = (c, lv, extra) => ({ class: c, module: "plan procedure", testLevel: lv, path: PROC, tests: 3, rows: [R0], ...(extra || {}) });

  /* 1. a test level given by name */
  guard("testslib.js: a testLevel given as a level folder's name is read as its level and said; one it cannot read is named (KotlinBottools #24)", c => {
    const P = { rows: EX.rows, tests: null }, o = { now: "2026-11-02T01:00:00Z", ids: new Set(ids) };
    const r = TL.mergeTests(P, { added: [cl("S2 python", "gating"), cl("S3 mutations", "integration"), cl("S3 negatives", "Component"), cl("S3 gate", "nonfunctional"), cl("S3 log", "testing.deterministic")] }, o);
    const lv = c0 => ((P.tests || {}).added || []).find(e => e.class === c0) || {};
    c.push(["the names read as their levels: gating 1, integration 3, Component 2, nonfunctional 4c, testing.deterministic 4a", lv("S2 python").testLevel === "1" && lv("S3 mutations").testLevel === "3" && lv("S3 negatives").testLevel === "2" && lv("S3 gate").testLevel === "4c" && lv("S3 log").testLevel === "4a", js(((P.tests || {}).added || []).map(e => [e.class, e.testLevel]))]);
    const w = (r.warnings || []).join(" | ");
    c.push(["…and said, once: the value given, what it was read as and the classes, as a warning (no enrichment: nothing is left to write)", /TEST LEVEL BY NAME/.test(w) && /"gating" as 1 \(S2 python\)/.test(w) && /"integration" as 3 \(S3 mutations\)/.test(w) && /"nonfunctional" as 4c/.test(w) && (r.warnings || []).length === 1 && !r.notes.some(x => /testLevel/.test(x)), js([r.warnings, r.notes])]);
    const P2 = { rows: EX.rows, tests: null }, r2 = TL.mergeTests(P2, { added: [cl("S2 odd", "L9"), { class: "com.acme.testing.integration.FooTest", module: "m", testLevel: "fast", tests: 2 }] }, o);
    const a2 = ((P2.tests || {}).added || []);
    c.push(["a value that is neither is not read and is named for the presenter (enrich), with the level its path or package gives where it gives one", !(a2.find(e => e.class === "S2 odd") || {}).testLevel && (a2.find(e => /FooTest/.test(e.class)) || {}).testLevel === "3" && r2.notes.some(x => /testLevel not read/.test(x) && /"L9" \(S2 odd\)/.test(x) && /"fast" \(com\.acme\.testing\.integration\.FooTest \(its path: 3\)\)/.test(x)), js([a2.map(e => [e.class, e.testLevel]), r2.notes])]);
    const P3 = { rows: EX.rows, tests: null }, r3 = TL.mergeTests(P3, { added: [cl("S2 python", "1"), cl("S3 log", "4a")] }, o);
    c.push(["a test level sent as the protocol gives it is read with nothing said", (r3.warnings || []).length === 0 && !r3.notes.length && P3.tests.added.map(e => e.testLevel).join() === "1,4a", js([r3.warnings, r3.notes])]);
    /* the fast path's summary carries it, so the team's reply can pass it on */
    const d = building("implementation", ["done", "current", "todo"]), B = lay(d);
    const e = ev(B, d, "implementation-stage", { stage: "S2", stages: [{ id: "S1", name: "Baseline", state: "done" }, { id: "S2", name: "Local checks", state: "done" }, { id: "S3", name: "Scans", state: "current" }], tests: { added: [cl("S2 python", "gating")] } }, "2026-11-02T01:00:00Z");
    c.push(["apply-event.js says it in its summary, under warnings, and stores the level", e.a.status === 0 && /TEST LEVEL BY NAME: .*"gating" as 1 \(S2 python\)/.test(warnsOf(e.S)) && cls(e.p, "S2 python").testLevel === "1", js([e.S.result, e.S.warnings, e.S.error])]);
  });

  /* 2. several stages done at once */
  guard("apply-event.js: an event that reports several stages done at once stamps no class with the last one (KotlinBottools #24)", c => {
    const facts3 = (tests, extra) => ({ stage: "S3", stages: [{ id: "S1", name: "Baseline", state: "done", steps: ["branch", "workflow"] }, { id: "S2", name: "Local checks", state: "done", steps: ["python", "workflow"] }, { id: "S3", name: "Scans", state: "done", steps: ["mutations", "log-filter"] }], tests, ...(extra || {}) });
    const tests = { added: [cl("S2 python", "1"), cl("S3 mutations", "3"), cl("mutations", "3"), cl("workflow", "1"), cl("FooTest", "2"), cl("S1 branch", "1")] };
    /* (a) S1 to S3 finished by one report, the board at implementation */
    const d = building("implementation", ["done", "current", "todo"]); d.tests.added[0].stage = "S1"; const B = lay(d);
    const d2 = building("implementation", ["current", "todo", "todo"]); const B2 = lay(d2);
    const e = ev(B2, d2, "implementation-stage", facts3(tests), "2026-11-02T01:00:00Z");
    c.push(["S1 to S3 reported done at once: a class whose stage's steps name it takes that stage (\"S2 python\" S2, \"S3 mutations\" S3, a bare step one stage alone has: \"mutations\" S3)", e.a.status === 0 && cls(e.p, "S2 python").stage === "S2" && cls(e.p, "S3 mutations").stage === "S3" && cls(e.p, "mutations").stage === "S3", js(all(e.p).map(x => [x.class, x.stage]))]);
    c.push(["…a class no stage's steps name, or a step two stages share (\"workflow\"), takes no stage, never the last one, and is named for the presenter", !cls(e.p, "FooTest").stage && !cls(e.p, "workflow").stage && /reported done at once, and no stage's steps name workflow, FooTest: no stage written/.test(whyOf(e.S)), js([cls(e.p, "FooTest"), e.S.why])]);
    c.push(["…a class the board records keeps its stage (S1 branch: S1), unless its own entry names one", cls(e.p, "S1 branch").stage === "S1", js(cls(e.p, "S1 branch"))]);
    const own = ev(B, d, "implementation-stage", facts3({ amended: [cl("S1 branch", "1", { stage: "S2" })] }), "2026-11-02T01:00:00Z");
    c.push(["…its own entry's stage is taken", own.a.status === 0 && cls(own.p, "S1 branch").stage === "S2", js(cls(own.p, "S1 branch"))]);
    const again = ev(B2, d2, "implementation-stage", facts3(tests), "2026-11-02T01:00:00Z");
    c.push(["…and the same event twice writes the same", again.a.status === 0 && js(again.p.tests.added.map(x => [x.class, x.stage])) === js(e.p.tests.added.map(x => [x.class, x.stage])), js([again.S.result, again.p.tests.added.map(x => [x.class, x.stage])])]);
    /* (b) a remediation that runs every stage again: none finished by this report, every one listed done */
    const r = building("remediation", ["done", "done", "done"], { base: "master", updated: "2026-11-02T00:00:00Z", added: [cl("S2 python", "1", { stage: "S2" }), cl("S3 log-filter", "3", { stage: "S3" })], amended: [], relevant: [] }); const BR = lay(r);
    const er = ev(BR, r, "implementation-stage", facts3({ added: [cl("S2 python", "1"), cl("S3 log-filter", "3"), cl("S3 mutations", "3"), cl("controls.py", "3")] }, { remediation: { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "done" }] } }), "2026-11-02T02:00:00Z");
    c.push(["a remediation running S1 to S3 again: the classes on the board keep their stages (S2, S3), none restamped S3", er.a.status === 0 && cls(er.p, "S2 python").stage === "S2" && cls(er.p, "S3 log-filter").stage === "S3", js(all(er.p).map(x => [x.class, x.stage]))]);
    c.push(["…a new class takes the stage whose steps name it (S3 mutations: S3), and one no step names the remediation's fixes (Quality Review 1 fixes)", cls(er.p, "S3 mutations").stage === "S3" && /Quality Review 1 fixes/.test(cls(er.p, "controls.py").stage || ""), js([cls(er.p, "S3 mutations"), cls(er.p, "controls.py")])]);
    /* (c) one stage reported: as before, its classes take it */
    const s = building("implementation", ["done", "current", "todo"]); const BS = lay(s);
    const es = ev(BS, s, "implementation-stage", { stage: "S2", stages: [{ id: "S1", name: "Baseline", state: "done" }, { id: "S2", name: "Local checks", state: "done" }, { id: "S3", name: "Scans", state: "current" }], tests: { added: [cl("FooTest", "2")], amended: [cl("S1 branch", "1")] } }, "2026-11-02T01:00:00Z");
    c.push(["one stage reported done (S2): every class it names takes it, a class changed at that stage included (the last stage that added or changed it), as before", es.a.status === 0 && cls(es.p, "FooTest").stage === "S2" && cls(es.p, "S1 branch").stage === "S2" && !/reported done at once/.test(whyOf(es.S)), js(all(es.p).map(x => [x.class, x.stage]))]);
  });

  /* 3. a level a later event sends otherwise */
  guard("testslib.js: a recorded test set that a later event sends otherwise is replaced, and said with the set held and the set sent (KotlinBottools #24)", c => {
    const P = { rows: EX.rows, tests: { base: "master", updated: "2026-11-02T00:00:00Z", added: [cl("S4 log-filter", "3", { stage: "S4" })], amended: [], relevant: [] } };
    const r = TL.mergeTests(P, { ran: [{ class: "S4 log-filter", module: "plan procedure", testLevel: "4a", passed: 4, failed: 0, skipped: 0 }] }, { now: "2026-11-02T01:00:00Z", pass: 3, ids: new Set(ids) });
    const e = P.tests.added[0];
    c.push(["a qa pass's run naming 4a for a class held at 3: the run's level written, its result with it", e.testLevel === "4a" && e.result && e.result.state === "passed" && e.result.pass === 3, js(e)]);
    c.push(["…and said: the class, the set held and the set sent, each by its name", (r.warnings || []).some(x => /TEST SET CHANGED: S4 log-filter \(plan procedure\): the board held the set integration, the event sent deterministic; written deterministic/.test(x)), js(r.warnings)]);
    const r2 = TL.mergeTests(P, { ran: [{ class: "S4 log-filter", module: "plan procedure", testLevel: "4a", passed: 4, failed: 0, skipped: 0 }] }, { now: "2026-11-02T01:00:00Z", pass: 3, ids: new Set(ids) });
    c.push(["…the same facts again change nothing and say nothing", !r2.changed && !(r2.warnings || []).length, js([r2.changed, r2.warnings])]);
    const P2 = { rows: EX.rows, tests: { added: [cl("S4 scans", "3")], amended: [], relevant: [] } };
    const r3 = TL.mergeTests(P2, { amended: [cl("S4 scans", "2")] }, { now: "2026-11-02T01:00:00Z", stage: "S4", ids: new Set(ids) });
    c.push(["an implementation stage's facts that change a recorded level are said the same way", P2.tests.added[0].testLevel === "2" && (r3.warnings || []).some(x => /S4 scans .*held the set integration, the event sent component/.test(x)), js([P2.tests.added[0], r3.warnings])]);
    const r4 = TL.mergeTests({ rows: EX.rows, tests: { added: [cl("S4 x", "3")], amended: [], relevant: [] } }, { ran: [{ class: "S4 x", module: "plan procedure", passed: 3 }] }, { now: "2026-11-02T01:00:00Z", pass: 1, ids: new Set(ids) });
    c.push(["a run that names no level keeps the recorded one, with nothing said", !(r4.warnings || []).length, js(r4.warnings)]);
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

  /* 5. a testSet beside a testLevel (the user's decisions of 2026-11-13: vocabulary/decided-set (3), choice-1-live-keys (a)) */
  guard("testslib.js: a testSet is read beside a testLevel, by its name, and the other tests' counts keyed by a set's name beside a level's; a testLevel is read as before", c => {
    const o = { now: "2026-11-13T01:00:00Z", ids: new Set(ids) }, m = (cl0, extra) => ({ class: cl0, module: "m", tests: 1, ...extra });
    const P = { rows: EX.rows, tests: null }, r = TL.mergeTests(P, { added: [m("A", { testSet: "gating" }), m("B", { testSet: "Integration" }), m("C", { testSet: "testing.e2e" }), m("D", { testSet: "nonfunctional" }), m("E", { testSet: "uat" }), m("F", { testSet: "deterministic" }), m("G", { testSet: "component" })] }, o);
    const got = ((P.tests || {}).added || []).map(e => e.testLevel).join();
    c.push(["the seven names read as the test level the board records for each: gating 1, integration 3, e2e 4b, nonfunctional 4c, uat 5, deterministic 4a, component 2", got === "1,3,4b,4c,5,4a,2", got]);
    c.push(["…with nothing said: a set's name is the rule, so no TEST LEVEL BY NAME and no note", !(r.warnings || []).length && !r.notes.length, js([r.warnings, r.notes])]);
    const P2 = { rows: EX.rows, tests: null }; TL.mergeTests(P2, { added: [m("A", { testSet: "integration", testLevel: "1" }), m("B", { testSet: " ", testLevel: "4a" }), m("C", { testSet: "3" })] }, o);
    const got2 = ((P2.tests || {}).added || []).map(e => e.testLevel).join();
    c.push(["a testSet before a testLevel; an empty testSet leaves the testLevel read; a testSet sent as a number read as that level", got2 === "3,4a,3", got2]);
    const P3 = { rows: EX.rows, tests: null }, r3 = TL.mergeTests(P3, { added: [m("S2 odd", { testSet: "fast" }), { class: "com.acme.testing.uat.FooTest", module: "m", testSet: "smoke", tests: 2 }] }, o);
    const a3 = ((P3.tests || {}).added || []), n3 = r3.notes.join(" | ");
    c.push(["a testSet that is neither a name nor a number is not read, and named for the presenter, with the set its path names where it names one", !(a3.find(e => e.class === "S2 odd") || {}).testLevel && (a3.find(e => /FooTest/.test(e.class)) || {}).testLevel === "5" && /testSet not read/.test(n3) && /"fast" \(S2 odd\)/.test(n3) && /"smoke" \(com\.acme\.testing\.uat\.FooTest \(its path: 5\)\)/.test(n3), js([a3.map(e => [e.class, e.testLevel]), r3.notes])]);
    c.push(["…in its own note: the testLevel's note is not said for it", !r3.notes.some(x => /^testLevel not read/.test(x)), js(r3.notes)]);
    const P4 = { rows: EX.rows, tests: null }; TL.mergeTests(P4, { other: { byModule: { core: { gating: 5, component: { classes: 3, tests: 12 }, "4b": 1 }, api: { "2": 7 } } } }, o);
    c.push(["other.byModule keyed by a set's name read as its level's, beside a count keyed by a level", js((P4.tests || {}).other) === js({ byModule: { api: { "2": 7 }, core: { "1": 5, "2": { classes: 3, tests: 12 }, "4b": 1 } } }), js((P4.tests || {}).other)]);
    const P5 = { rows: EX.rows, tests: null }; TL.mergeTests(P5, { other: { byModule: { core: { integration: 2, "3": 9 } } } }, o);
    c.push(["…a set's name before its level where both are sent", js(((P5.tests || {}).other || {}).byModule) === js({ core: { "3": 2 } }), js((P5.tests || {}).other)]);
    /* the request fixture through the fast path, beside its old twin: testSet renamed testLevel and each name its level, the counts keyed by level */
    const RQ = J("verify/fixtures/tests-testset.request.json"), twin = copy(RQ.facts), SEG = TL.TEST_LEVEL_SEGMENTS;
    twin.tests.added.forEach(e => { e.testLevel = SEG[e.testSet]; delete e.testSet; });
    Object.keys(twin.tests.other.byModule).forEach(md => { twin.tests.other.byModule[md] = Object.fromEntries(Object.entries(twin.tests.other.byModule[md]).map(([k, v]) => [SEG[k] || k, v])); });
    const dN = building("implementation", ["done", "current", "todo"]), BN = lay(dN), eN = ev(BN, dN, RQ.event, RQ.facts, RQ.facts.at);
    const dO = building("implementation", ["done", "current", "todo"]), BO = lay(dO), eO = ev(BO, dO, RQ.event, twin, RQ.facts.at);
    const lvN = RQ.facts.tests.added.map(e => cls(eN.p, e.class).testLevel).join();
    c.push(["the request fixture (verify/fixtures/tests-testset.request.json) through apply-event.js: each class at its set's level, the counts by level", eN.a.status === 0 && lvN === "2,3,4a,4c" && js(eN.p.tests.other.byModule.core) === js({ "1": 5, "2": { classes: 3, tests: 12 }, "4b": 1 }), js([eN.S.error, lvN, eN.p.tests && eN.p.tests.other])]);
    c.push(["…its old twin (testLevel, the counts by level) writes the same Tests tab, with the same summary", eO.a.status === 0 && js(eN.p.tests) === js(eO.p.tests) && js(eN.S.warnings || []) === js(eO.S.warnings || []) && js(eN.S.why || []) === js(eO.S.why || []), js([eO.S.error, eN.S.warnings, eO.S.warnings])]);
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
