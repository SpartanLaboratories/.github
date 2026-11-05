// The cases of a qa verdict's step on the fast path (admin-team/board/qa-step; plan/RULES.md §4, the qa-pass row and "The fast path"),
// run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-qa-step.js [--out <dir>].
// The defect (WebTools #65, qa pass 1): the pipeline sends a returned verdict with facts.step "qa", the step the pass ran in, and the fast
// path took it as the step after the pass, so the board stayed at qa with the whole As built column glowing, its rows the findings touch
// unshown and no qa visit frozen. A returned verdict's facts.step "qa" now names the step it ran in; a running pass keeps it. And the pass's
// test report, which the protocol carries in facts.documents rather than facts.qa.report, is recorded from there. No case opens a browser.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesQaStep(X) {
  const { sk, out, targets } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["a qa verdict's step (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js");
  const sc = path.join(out, "qa-step"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  /* a board at qa, from the example: its rows pending, no as-built */
  const atQa = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "qa", since: "2026-11-01T22:37:24Z", updated: "2026-11-01T22:37:24Z", current: ["built"], questions: [], research: null, open: [], qa: [], plan: null, remediation: null,
      steps: STEPS.slice(), event: { name: "implementation-stage", at: "2026-11-01T22:37:24Z" } }; return x; };
  let n = 0;
  const lay = plan => { const root = path.join(sc, `b-${++n}`), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]);
    wr(path.join(root, "build", "reports", "tests", "index.html"), "<!doctype html><title>report</title>"); return { root, dir }; };
  const apply = (B, plan, facts, at) => { const rq = wr(path.join(sc, `req-${n}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: "qa-pass", folder: plan.folder, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };

  guard("apply-event.js: a returned qa verdict sent with facts.step \"qa\" moves the board on; the test report read from facts.documents", c => {
    const P = atQa(), rows = P.rows.map(r => r.id).slice(0, 2);
    const B = lay(P);
    const r = apply(B, P, { step: "qa", qa: { pass: 1, verdict: "CHANGES REQUESTED", test: 2, code: 0, severity: { minor: 1, other: 1 }, route: "remediation" }, rows, documents: ["build/reports/tests/index.html"] }, "2026-11-02T00:08:52Z");
    c.push(["changes requested with facts.step \"qa\": the step remediation, since the verdict", r.a.status === 0 && r.p.wip.step === "remediation" && r.p.wip.since === "2026-11-02T00:08:52Z", js([r.a.status, r.p.wip.step, r.p.wip.since, r.S.error])]);
    c.push(["…the glow on the rows the findings touch, never the whole As built column", js(r.p.wip.current) === js(rows.map(x => x + ".built")), js(r.p.wip.current)]);
    c.push(["…the qa visit frozen, ended by the pass", ((r.p.wip.history || {}).qa || []).some(v => v.ended === "2026-11-02T00:08:52Z" && v.endedBy === "qa-pass" && v.to === "remediation"), js((r.p.wip.history || {}).qa)]);
    c.push(["…the pass's test report recorded from facts.documents, as plain text", ((r.p.wip.qa || [])[0] || {}).report === "build/reports/tests/index.html", js(r.p.wip.qa)]);
    const P2 = atQa(), B2 = lay(P2);
    const a = apply(B2, P2, { step: "qa", qa: { pass: 1, verdict: "approved", test: 0, code: 0 } }, "2026-11-02T01:00:00Z");
    c.push(["approved with facts.step \"qa\": the Document step follows", a.a.status === 0 && a.p.wip.step === "document", js([a.a.status, a.p.wip.step, a.S.error])]);
    const P3 = atQa(), B3 = lay(P3);
    const q = apply(B3, P3, { step: "qa", qa: { pass: 1, verdict: "running" } }, "2026-11-02T01:00:00Z");
    c.push(["a running pass keeps the board at qa", q.a.status === 0 && q.p.wip.step === "qa", js([q.a.status, q.p.wip.step, q.S.error])]);
    const P4 = atQa(), B4 = lay(P4);
    const o = apply(B4, P4, { step: "plan", qa: { pass: 1, verdict: "changes-requested", test: 1, route: "re-plan-then-remediation" } }, "2026-11-02T01:00:00Z");
    c.push(["a returned verdict naming another step still takes it (an override, as before)", o.a.status === 0 && o.p.wip.step === "plan", js([o.a.status, o.p.wip.step, o.S.error])]);
  });
  /* the Timeline tab's lede while the run waits on the user (plan/RULES.md §2, "Waits on the user are not active time"): no visit runs to now
     then, so the lede never says a step's time runs to now; and it says nothing of the wait either (decided 2026-11-05: time that is not
     counted is not mentioned), so it reads as on a board with no step running (a static case: the render needs a browser) */
  guard("the template: the Timeline tab's lede says nothing of a wait, and never that a step runs to now while none is open", c => {
    const t = rd(PB), line = (t.split(/\r?\n/).find(l => /#timeline-lede"\)\.textContent=/.test(l)) || "");
    c.push(["the lede names no wait (no \"waits on you\", no \"not counted\")", !/waits on you|not counted|TS\.waits/.test(line) && /\$\("#timeline-lede"\)\.textContent=LANDED\?"Hover a segment for its times\.":TL_OPEN\?/.test(line), line.slice(0, 200)]);
    c.push(["…and says a step runs to now only while a visit is open", /TL_OPEN\?"The running step is open-ended: its time runs to now\."/.test(line), line.slice(0, 200)]);
  });
  /* a remediation report's stages (WebTools #65, qa pass 1): the one stage a remediation adds takes the rows the qa findings touch
     (facts.rows) itself; facts.stages[].rows, when given, are written as given; two new stages with no rows of their own stay for the
     presenter (facts.rows is the union of every finding then), as a plan stage's rows do */
  guard("apply-event.js: a remediation stage's rows on the fast path (facts.rows for its one new stage, facts.stages[].rows as given)", c => {
    const atRem = () => { const x = atQa(), ids = x.rows.map(r => r.id); x.wip.step = "remediation"; x.wip.current = [ids[0] + ".built"];
      x.wip.stages = [{ id: "S1", name: "The one plan stage", state: "done", rows: ids.slice() }];
      x.wip.qa = [{ pass: 1, verdict: "changes-requested", date: "2026-11-02", at: "2026-11-02T00:08:52Z", findings: { test: 2 }, route: "remediation" }];
      x.wip.remediation = { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }, { name: "qa pass 2", state: "todo" }] }; return x; };
    const ev = (B, plan, facts, at) => { const rq = wr(path.join(sc, `req-${n}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: "implementation-stage", folder: plan.folder, facts }));
      const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
      return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
    const st = (p, id) => ((p.wip.stages || []).find(x => x.id === id) || {}).rows;
    const why = S => (S.why || []).join(" | ");
    const S1 = { id: "S1", name: "The one plan stage", state: "done" };
    const rem = { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }] };
    const P = atRem(), ids = P.rows.map(r => r.id), fr = ids.slice(0, 2), B = lay(P);
    const one = ev(B, P, { step: "remediation", stage: "R1", stages: [S1, { id: "R1", name: "Remediation of qa pass 1", state: "current" }], rows: fr, remediation: rem }, "2026-11-02T01:00:00Z");
    c.push(["one new remediation stage takes facts.rows as its rows", one.a.status === 0 && js(st(one.p, "R1")) === js(fr), js([one.a.status, st(one.p, "R1"), one.S.error])]);
    c.push(["…and asks no enrichment for its rows", one.a.status === 0 && !/ touch/.test(why(one.S)), why(one.S)]);
    c.push(["…a plan stage keeps the rows the board records for it", js(st(one.p, "S1")) === js(ids), js(st(one.p, "S1"))]);
    const P2 = atRem(), B2 = lay(P2);
    const two = ev(B2, P2, { step: "remediation", stage: "R1", stages: [S1, { id: "R1", name: "First fixes", state: "current" }, { id: "R2", name: "Second fixes", state: "todo" }], rows: fr, remediation: rem }, "2026-11-02T01:00:00Z");
    c.push(["two new remediation stages with no rows of their own: no row written to either", two.a.status === 0 && js(st(two.p, "R1")) === "[]" && js(st(two.p, "R2")) === "[]", js([two.a.status, st(two.p, "R1"), st(two.p, "R2"), two.S.error])]);
    c.push(["…and the enrichment names them as remediation stages for the presenter", /remediation stages R1, R2 touch/.test(why(two.S)), why(two.S)]);
    const P3 = atRem(), B3 = lay(P3);
    const giv = ev(B3, P3, { step: "remediation", stage: "R1", stages: [S1, { id: "R1", name: "First fixes", state: "current", rows: [ids[0], "no-such-row"] }, { id: "R2", name: "Second fixes", state: "todo", rows: [ids[1]] }], rows: fr, remediation: rem }, "2026-11-02T01:00:00Z");
    c.push(["facts.stages[].rows are written as given, the board's row ids only", giv.a.status === 0 && js(st(giv.p, "R1")) === js([ids[0]]) && js(st(giv.p, "R2")) === js([ids[1]]), js([giv.a.status, st(giv.p, "R1"), st(giv.p, "R2"), giv.S.error])]);
    c.push(["…a row id not on the board is named in the summary, not written", /no-such-row/.test(why(giv.S)) && !/R1, R2 touch/.test(why(giv.S)), why(giv.S)]);
    const P4 = atQa(); P4.wip.step = "implementation"; P4.wip.stages = null; const B4 = lay(P4);
    const imp = ev(B4, P4, { step: "implementation", stage: "S1", stages: [{ id: "S1", name: "A plan stage", state: "current" }], rows: fr }, "2026-11-02T01:00:00Z");
    c.push(["outside remediation a new stage's rows still come from plan.md (facts.rows is not a stage's)", imp.a.status === 0 && js(st(imp.p, "S1")) === "[]" && /S1 touch come from plan\.md/.test(why(imp.S)), js([imp.a.status, st(imp.p, "S1"), why(imp.S)])]);
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
