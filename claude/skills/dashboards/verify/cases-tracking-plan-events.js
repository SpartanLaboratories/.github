// The cases of a tracking issue's run sending plan-accepted and branch-cut (admin-team/dashboards/tracking-plan-events; plan/RULES.md §4, the
// plan-accepted and branch-cut rows), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-tracking-plan-events.js [--out <dir>].
// The trigger: KotlinBottools #2, a tracking plan whose eight units are planned and not yet filed. Its run sent plan-accepted (the architecture
// final) and branch-cut (its units as the stages), as the run's own steps have it for a tracking issue. apply-event.js moved the tracking board to
// branch, then implementation, which its line has not before its units are filed, and check.js refused both ("unit.issue must be the sub-issue's
// number"). The fix: on a tracking board both keep it in its own line (the step it stands at when that is past its architecture, else document),
// branch-cut records the branch and writes no stages. An issue board keeps its branch and implementation steps (verify-templates.js's live-board
// steps and verify/cases-foundation.js hold them).
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesTrackingPlanEvents(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["a tracking issue's plan-accepted and branch-cut (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1" };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env: { ...env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") } });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "tracking-plan-events"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const TRK = J("verify/fixtures/tracking.plan.json"), F0 = TRK.folder;
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const T = m => `2026-11-07T07:${String(m).padStart(2, "0")}:00Z`;
  /* a tracking board at the step given, its units written and none filed, their dependencies by unit number (plan/RULES.md §3, unit.blockedBy;
     admin-team/dashboards/unit-blockers-before-filing) */
  const nOf = Object.fromEntries(TRK.rows.filter(r => r.unit).map(r => [r.unit.issue, r.unit.n]));
  const unfiled = (step, over) => { const p = copy(TRK); p.rows.forEach(r => { if (r.unit) { r.unit.board = null; r.unit.folder = null; r.unit.issue = null; r.unit.blockedBy = (r.unit.blockedBy || []).map(i => ({ unit: nOf[i] })); delete r.unit.live; r.asBuilt = { state: "pending", summary: "Not filed yet." }; } });
    Object.assign(p, { status: "planned", asBuilt: null, sized: T(0), branch: null }); p.milestones = (p.milestones || []).filter(m => m.column !== "built"); if (p.impact) { p.impact.basis = "plan"; delete p.impact.changes; }
    Object.assign(p.wip, { step, since: T(1), updated: T(1), current: step === "architecture" ? ["considered"] : ["built"], next: null, landing: null, stages: [], steps: lib.STEPS_BY_LEVEL[4].slice(), history: {}, qa: [], waitingOn: null, resume: null, plan: null, questions: [], research: null, event: { name: step === "architecture" ? "researched" : "architecture-signed-off", at: T(1) }, ...(over || {}) }); return p; };
  const tree = p => { const root = path.join(sc, `t-${++n}`), dir = path.join(root, ...F0.split("/")); fs.mkdirSync(path.join(root, ".git", "info"), { recursive: true }); wr(path.join(root, ".git", "info", "exclude"), "docs/plans/.live/\n");
    wr(path.join(dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  const ev = (B, event, facts, at) => { const q = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: TRK.repo, issue: TRK.issue, event, folder: F0, branch: "docs/issue-55-plan", facts }));
    const a = run(APPLY, ["--event", q, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]); return { a, S: parse(a) }; };
  const P = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  const units = p => p.rows.filter(r => r.unit);
  const STAGES = p => units(p).map((r, i) => ({ id: `u${i + 1}`, name: `Unit ${i + 1}` }));

  guard("a tracking issue's plan-accepted and branch-cut keep the board in its own line, its units unfiled", c => {
    /* the order KotlinBottools #2's run sent: architecture-signed-off, plan-accepted, branch-cut, then the Document step */
    const B = tree(unfiled("architecture")), s0 = ev(B, "architecture-signed-off", {}, T(2)), p0 = P(B);
    c.push(["architecture-signed-off: document, as before", s0.a.status === 0 && p0.wip.step === "document", js([s0.S.result, s0.S.error, p0.wip.step])]);
    const a = ev(B, "plan-accepted", { detail: "Architecture complete with its units." }, T(3)), pa = P(B);
    c.push(["plan-accepted on a tracking board: applied and the check passes, every unit still unfiled", a.a.status === 0 && a.S.result === "ok" && /^pass/.test(a.S.check || "") && units(pa).every(r => r.unit.issue == null), js([a.a.status, a.S.result, a.S.error, a.S.check])]);
    c.push(["…the board stays at its plan's documents, never at branch, its As built column glowing as the map gives", pa.wip.step === "document" && pa.wip.since === p0.wip.since && js(pa.wip.current) === js(["built"]), js([pa.wip.step, pa.wip.since, pa.wip.current])]);
    c.push(["…the event recorded, the trail \"Architecture final, with its units\" in the Verdict column, enrich yes for the documents", pa.wip.event.name === "plan-accepted" && pa.trail.some(t => t.label === "Architecture final, with its units" && t.column === "verdict") && a.S.enrich === "yes", js([pa.wip.event, pa.trail.slice(-1), a.S.enrich])]);
    c.push(["…no plan visit and no branch visit on its Timeline", !(pa.wip.history.plan || []).length && !(pa.wip.history.branch || []).length, js(Object.keys(pa.wip.history))]);
    const b = ev(B, "branch-cut", { branch: "docs/issue-55-plan", stages: STAGES(pa) }, T(4)), pb = P(B);
    c.push(["branch-cut on a tracking board: applied and the check passes, every unit still unfiled", b.a.status === 0 && b.S.result === "ok" && /^pass/.test(b.S.check || "") && units(pb).every(r => r.unit.issue == null), js([b.a.status, b.S.result, b.S.error, b.S.check])]);
    c.push(["…the branch recorded, no wip.stages written (its stages are its units), the board still at document", pb.branch === "docs/issue-55-plan" && !(pb.wip.stages || []).length && pb.wip.step === "document" && js(pb.wip.current) === js(["built"]), js([pb.branch, pb.wip.stages, pb.wip.step, pb.wip.current])]);
    c.push(["…enrich no: the stages match the unit rows", b.S.enrich === "no", js([b.S.enrich, b.S.why])]);
    const d = ev(B, "document", { tasks: [{ id: "reconcile-plan", name: "Architecture and consequences confirmed final", state: "done" }] }, T(5)), pd = P(B);
    c.push(["the Document step's event then applies as before", d.a.status === 0 && pd.wip.step === "document" && pd.wip.event.name === "document", js([d.S.result, d.S.error, pd.wip.step])]);
  });

  guard("on a tracking board at its architecture, past it, halted, or told too few stages", c => {
    const A = tree(unfiled("architecture")), a = ev(A, "plan-accepted", {}, T(2)), pa = P(A);
    c.push(["plan-accepted at the architecture (no sign-off event): document, as the sign-off moves it, the first unit up next", a.a.status === 0 && pa.wip.step === "document" && pa.wip.next === units(pa)[0].id && pa.wip.steps.includes("sub-issues"), js([a.S.error, a.S.check, pa.wip.step, pa.wip.next])]);
    c.push(["…its detail says the plan lands before its units are filed", /land are next, and its units are filed after the merge/.test(pa.wip.detail || ""), pa.wip.detail]);
    const H = tree(unfiled("halted", { resume: "document", waitingOn: "An answer." })), h = ev(H, "plan-accepted", {}, T(2)), ph = P(H);
    c.push(["plan-accepted while halted at document: the stop ended there", h.a.status === 0 && ph.wip.step === "document" && ph.wip.resume == null && ph.wip.waitingOn == null, js([h.S.error, ph.wip.step, ph.wip.resume, ph.wip.waitingOn])]);
    const D = tree(unfiled("document", { detail: "Document: 1 of 3 tasks done." })), b = ev(D, "branch-cut", { branch: "docs/issue-55-plan", stages: [{ id: "u1", name: "Unit 1" }] }, T(2)), pb = P(D);
    c.push(["branch-cut naming fewer stages than unit rows: applied, enrich yes naming the count", b.a.status === 0 && b.S.enrich === "yes" && (b.S.why || []).some(x => /1 stage and the board holds \d+ unit rows/.test(x)), js([b.S.error, b.S.enrich, b.S.why])]);
    const N = tree(unfiled("document")); N.p = P(N); N.p.rows = N.p.rows.filter(r => !r.unit); wr(path.join(N.dir, "plan.json"), JSON.stringify(N.p, null, 2) + "\n"); run(EMBED, [N.dir]);
    const nb = ev(N, "branch-cut", { branch: "docs/issue-55-plan", stages: [{ id: "u1", name: "Unit 1" }] }, T(2));
    c.push(["branch-cut on a tracking board with no unit rows: enrich yes, the presenter writes them", nb.S.enrich === "yes" && (nb.S.why || []).some(x => /no unit rows yet/.test(x)), js([nb.a.status, nb.S.error, nb.S.why])]);
  });

  guard("check.js: a unit row carries no number until sub-issues-filed has filed it, whatever step outside its line the board was put at", c => {
    /* the check the trigger's fast path failed: a board an older plan-accepted put at branch, its units planned and not yet filed */
    const CHECK = sk("plan/scripts/check.js"), fails = B => { const r = run(CHECK, [B.dir, "--root", B.root]); return { status: r.status, F: (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l) && /unit\.issue/.test(l)) }; };
    const at = (step, over) => { const B = tree(unfiled(step, over)); return fails(B); };
    const br = at("branch"), im = at("implementation"), dc = at("document"), sb = at("sub-issues");
    c.push(["a board at branch (outside its line), its units unfiled: no unit.issue failure", !br.F.length, js(br.F.slice(0, 2))]);
    c.push(["…at its plan's documents and at its filing step: none either", !dc.F.length && !sb.F.length, js([dc.F.slice(0, 1), sb.F.slice(0, 1)])]);
    c.push(["…at its units' runs (past the filing in its line): every unfiled unit fails, as before", im.F.length > 0, js([im.status, im.F.length])]);
    const seen = at("branch", { history: { "sub-issues": [{ since: T(1), ended: T(2), endedBy: "sized", to: "implementation" }] } });
    c.push(["…outside its line once the filing step was visited: an unfiled unit fails", seen.F.length > 0, js([seen.status, seen.F.length])]);
    const ev2 = at("branch", { event: { name: "sub-issues-filed", at: T(1) } });
    c.push(["…or once a sub-issues-filed is its last event: an unfiled unit fails", ev2.F.length > 0, js([ev2.status, ev2.F.length])]);
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
