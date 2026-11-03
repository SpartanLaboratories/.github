// The cases of "a tracking plan lands, then files" (admin-team/dashboards-skill/option-d-and-decisions; plan/RULES.md §3, §4), run by verify-templates.js (it passes its
// helpers in), or on its own with no browser: node verify/cases-option-d.js [--out <dir>].
// A tracking board's steps are its architecture, its plan's document step and land, then sub-issues after the merge, then its units' runs. No unit's board is laid ahead
// of its run: boards-created is refused and new.js has no batch mode. An older board that recorded the boards step is still read and drawn. Each group returns [title, cases].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesOptionD(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["a tracking plan lands, then files (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), NEW = sk("plan/scripts/new.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "option-d"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const TRK = J("verify/fixtures/tracking.plan.json"), F0 = TRK.folder, env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const git = (root, ...a) => cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8", windowsHide: true });
  let n = 0;
  const T = m => `2026-11-03T10:${String(m).padStart(2, "0")}:00Z`;
  /* a tracking board before its sign-off: the units written, none filed */
  const before = () => { const p = copy(TRK); p.rows.forEach(r => { if (r.unit) { r.unit.board = null; r.unit.folder = null; r.unit.issue = null; delete r.unit.live; r.asBuilt = { state: "pending", summary: "Not started." }; } });
    Object.assign(p, { status: "planned", asBuilt: null, sized: T(0) }); p.milestones = (p.milestones || []).filter(m => m.column !== "built"); if (p.impact) { p.impact.basis = "plan"; delete p.impact.changes; }
    Object.assign(p.wip, { step: "architecture", since: T(0), updated: T(0), current: ["considered"], next: null, landing: null, steps: lib.STEPS_BY_LEVEL[4].slice(), history: {}, qa: [], waitingOn: null, resume: null, event: { name: "researched", at: T(0) } }); return p; };
  const tree = p => { const root = path.join(sc, `t-${++n}`), dir = path.join(root, ...F0.split("/")); fs.mkdirSync(dir, { recursive: true }); git(root, "init", "-q", "-b", "master"); wr(path.join(root, ".git", "info", "exclude"), "docs/plans/.live/\n");
    wr(path.join(dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir], { env }); return { root, dir }; };
  const commit = (root, m) => { git(root, "add", "-A"); git(root, "-c", "user.email=x@x", "-c", "user.name=x", "commit", "-q", "-m", m); return (git(root, "rev-parse", "HEAD").stdout || "").trim(); };
  const ev = (B, event, facts, at, flags, folder, more) => { const q = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: TRK.repo, event, folder: folder || F0, ...(more || {}), facts }));
    const a = run(APPLY, ["--event", q, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json", ...(flags || [])], { env }); return { a, S: parse(a) }; };
  const P = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  const viewOf = B => JSON.parse(rd(path.join(B.root, "docs", "plans", ".live", "view", ...F0.split("/").slice(2), "plan.json")));
  const units = p => p.rows.filter(r => r.unit);

  guard("a tracking plan lands, then files: its steps line, its land with no unit filed, then the filing in the view copy", c => {
    c.push(["a tracking issue's steps: its architecture, its plan's document step and land, then the filing, then its units' runs", js(lib.STEPS_BY_LEVEL[4]) === js(["sizing", "interview", "research", "architecture", "document", "landing", "merge", "sub-issues", "implementation", "landed"]), js(lib.STEPS_BY_LEVEL[4])]);
    const B = tree(before()), s0 = ev(B, "architecture-signed-off", {}, T(1)), p0 = P(B), ids = units(p0).map(r => r.id);
    c.push(["architecture-signed-off moves a tracking board to its plan's document step, its whole As built column glowing; the first unit up next", s0.a.status === 0 && p0.wip.step === "document" && js(p0.wip.current) === js(["built"]) && p0.wip.next === ids[0], js([s0.S.result, s0.S.error, s0.S.check, p0.wip.step, p0.wip.current, p0.wip.next])]);
    c.push(["…its detail says the plan lands before its units are filed", /land are next, and its units are filed after the merge/.test(p0.wip.detail), p0.wip.detail]);
    const old = before(); old.wip.steps = old.wip.steps.filter(x => x !== "sub-issues"); const Bo = tree(old), so = ev(Bo, "architecture-signed-off", {}, T(1));
    c.push(["a line that lacks it takes sub-issues after its merge", so.a.status === 0 && P(Bo).wip.steps.indexOf("sub-issues") === P(Bo).wip.steps.indexOf("merge") + 1, js(P(Bo).wip.steps)]);
    const d = ev(B, "document", { tasks: [{ id: "reconcile-plan", state: "current" }] }, T(2));
    c.push(["document: a unit with no issue passes on the board's own line, before its sub-issues step", d.a.status === 0 && P(B).wip.step === "document" && units(P(B)).every(r => r.unit.issue == null), js([d.S.result, d.S.check])]);
    const M = commit(B.root, "the plan's merge"), trackedBytes = rd(path.join(B.dir, "plan.json"));
    const l1 = ev(B, "landing", { pr: 60 }, T(3), ["--view"]), l2 = ev(B, "merge", { pr: 60 }, T(4), ["--view"]), l3 = ev(B, "landed", { pr: 60, merge: M, date: "2026-11-03" }, T(5), ["--view"]);
    c.push(["landing, merge and landed pass through with --view, unit rows unfiled", [l1, l2, l3].every(x => x.a.status === 0), js([l1.S.error, l2.S.error, l3.S.error, l3.S.check])]);
    c.push(["landed, while no unit has started, records the plan's merge on wip.landing, the board staying planned at its merge, no asBuilt", viewOf(B).wip.landing && viewOf(B).wip.landing.merge === M && viewOf(B).wip.step === "merge" && viewOf(B).status === "planned" && viewOf(B).asBuilt == null, js([viewOf(B).wip.landing, viewOf(B).wip.step, viewOf(B).status])]);
    const f1 = ev(B, "sub-issues-filed", { units: ids.slice(0, 2).map((id, i) => ({ unit: id, issue: 62 + i })) }, T(6), ["--view"]), v1 = viewOf(B);
    c.push(["the first sub-issues-filed ends the merge: step sub-issues, the labels of the unfiled units glowing", f1.a.status === 0 && v1.wip.step === "sub-issues" && js(v1.wip.current) === js(ids.slice(2).map(i => i + ".units")) && (v1.wip.history.merge || []).length === 1, js([f1.S.error, f1.S.check, v1.wip.step, v1.wip.current])]);
    c.push(["…with --view it writes only the view copy: the tracked board is untouched", rd(path.join(B.dir, "plan.json")) === trackedBytes, "tracked plan.json"]);
    const early = ev(B, "sub-issues-filed", { final: true }, T(7), ["--view"]);
    c.push(["a final one too early stays at sub-issues and says so", early.a.status === 0 && viewOf(B).wip.step === "sub-issues" && /final, too early/.test(viewOf(B).wip.event.note), js(viewOf(B).wip.event)]);
    const f2 = ev(B, "sub-issues-filed", { final: true, units: ids.slice(2).map((id, i) => ({ unit: id, issue: 64 + i })) }, T(8), ["--view"]), v2 = viewOf(B);
    c.push(["the final one stays at sub-issues with nothing glowing, every unit filed", f2.a.status === 0 && v2.wip.step === "sub-issues" && !v2.wip.current.length && units(v2).every(r => r.unit.issue > 0) && /each unit's board appears when its run starts/.test(v2.wip.detail), js([f2.S.error, v2.wip.step, v2.wip.current, v2.wip.detail])]);
    c.push(["…no unit has a board", units(v2).every(r => !r.unit.board) && !fs.readdirSync(B.dir).some(x => /^\d+-/.test(x)), js(fs.readdirSync(B.dir))]);

    /* the first unit's sized, on a branch cut from the merge */
    const wtRoot = path.join(sc, `wt-${++n}`); const added = git(B.root, "worktree", "add", "-q", "-b", "feat/62", wtRoot);
    c.push(["a worktree for the first unit", added.status === 0, added.stderr]);
    const Bw = { root: wtRoot, dir: path.join(wtRoot, ...F0.split("/")) }, uf = `${F0}/62-${units(v2)[0].unit.slug || units(v2)[0].id}`;
    const sz = ev(Bw, "sized", { step: "research", baseline: M.slice(0, 7) }, T(10), ["--main", B.root], uf, { issue: 62 }), wp = P(Bw), ub = JSON.parse(rd(path.join(wtRoot, ...uf.split("/"), "plan.json")));
    c.push(["the first unit's sized seeds the filed units, lays its own board and moves the tracking board to implementation", sz.a.status === 0 && (sz.S.seeded || []).some(x => x === F0) && wp.wip.step === "implementation" && units(wp).every(r => r.unit.issue > 0) && sz.S.laid === uf, js([sz.S.result, sz.S.error, sz.S.seeded, sz.S.laid, wp.wip.step])]);
    c.push(["…the unit in progress, the next one up, the filing frozen", wp.wip.current.includes(ids[0] + ".built") && wp.wip.next === ids[1] && (wp.wip.history["sub-issues"] || []).length === 1, js([wp.wip.current, wp.wip.next, Object.keys(wp.wip.history)])]);
    c.push(["…the unit's board named by the unit row, its parent the tracking board; only that one laid", ub.parent.issue === TRK.issue && ub.title === units(wp)[0].name && units(wp).filter(r => r.unit.board).length === 1, js([ub.parent, ub.title, units(wp).filter(r => r.unit.board).length])]);
    c.push(["…the wip.landing carried on, and check.js passes both boards", wp.wip.landing && wp.wip.landing.merge === M && run(CHECK, [Bw.dir], { env }).status === 0 && run(CHECK, [path.join(wtRoot, ...uf.split("/"))], { env }).status === 0, js(wp.wip.landing)]);
  });

  guard("a filing whose merge no event recorded still seeds; a late filing moves nothing back", c => {
    const B = tree(before()); ev(B, "architecture-signed-off", {}, T(1)); ev(B, "document", {}, T(2)); const M = commit(B.root, "the plan's merge"), ids = units(P(B)).map(r => r.id);
    ev(B, "merge", { pr: 60 }, T(4), ["--view"]); const f = ev(B, "sub-issues-filed", { final: true, units: ids.map((id, i) => ({ unit: id, issue: 62 + i })) }, T(5), ["--view"]);
    c.push(["filed in the view copy, no merge recorded", f.a.status === 0 && !(viewOf(B).wip.landing && viewOf(B).wip.landing.merge), js(viewOf(B).wip.landing)]);
    const wtRoot = path.join(sc, `wt-${++n}`); git(B.root, "worktree", "add", "-q", "-b", "feat/62b", wtRoot); const Bw = { root: wtRoot, dir: path.join(wtRoot, ...F0.split("/")) };
    const sz = ev(Bw, "sized", { step: "research", baseline: M.slice(0, 7) }, T(10), ["--main", B.root], `${F0}/62-unit`, { issue: 62 });
    c.push(["the first unit's sized seeds the copy all the same: its row names the unit", sz.a.status === 0 && (sz.S.seeded || []).includes(F0) && P(Bw).wip.step === "implementation", js([sz.S.seeded, sz.S.error, P(Bw).wip.step])]);
    const m = copy(P(Bw)), Bz = tree(m), late = ev(Bz, "sub-issues-filed", { final: true }, T(12));
    c.push(["a late sub-issues-filed on a board at its units' runs leaves the step where it stands", late.a.status === 0 && P(Bz).wip.step === "implementation" && P(Bz).wip.current.includes(ids[0] + ".built"), js([late.S.error, P(Bz).wip.step, P(Bz).wip.current])]);
  });

  guard("no board ahead of its run: boards-created refused, no batch mode; an older board's boards step still reads", c => {
    const B = tree(before()), was = rd(path.join(B.dir, "plan.json")), r = ev(B, "boards-created", { final: true }, T(1));
    c.push(["a boards-created request is refused, nothing written", r.a.status === 1 && /boards-created is retired/.test(r.S.error || "") && rd(path.join(B.dir, "plan.json")) === was, js([r.a.status, r.S.error])]);
    c.push(["lib.js splits what a board may have recorded from what a request may raise", lib.EVENTS.includes("boards-created") && lib.RETIRED_EVENTS.includes("boards-created"), js(lib.RETIRED_EVENTS)]);
    const nb = run(NEW, ["--batch", F0.split("/").slice(2).join("/"), "--root", B.root], { env });
    c.push(["new.js has no batch mode: --batch is an unknown option, exit 2", nb.status === 2, (nb.stderr || nb.stdout).slice(0, 160)]);
    /* an older board, its line and record as dashboards-skill/28 left them */
    const old = before(); units(old).forEach((r, i) => { r.unit.issue = 62 + i; });
    Object.assign(old.wip, { next: units(old)[0].id, step: "boards", since: T(2), current: units(old).map(r => r.id + ".units"), steps: ["sizing", "interview", "research", "architecture", "sub-issues", "boards", "document", "landing", "merge", "implementation", "landed"], event: { name: "boards-created", at: T(2) } });
    const Bo = tree(old), ck = run(CHECK, [Bo.dir], { env });
    c.push(["check.js passes an older board at its boards step, its event in the record", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    const up = ev(Bo, "resumed", { step: "boards" }, T(3));
    c.push(["an event on it keeps its line: boards where it stands, no second sub-issues", up.a.status === 0 && P(Bo).wip.steps.filter(x => x === "sub-issues").length === 1 && P(Bo).wip.steps.includes("boards") && P(Bo).wip.step === "boards", js([up.S.error, P(Bo).wip.steps, P(Bo).wip.step])]);
    const tpl = rd(PB);
    c.push(["the template keeps the readers: the boards panel and the Timeline's steps", /boards:\(R,o\)=>/.test(tpl) && /"sub-issues","boards"/.test(tpl), "template"]);
    c.push(["the template's next step after a filing is the first unit's run, and after a tracking plan's merge the filing", /implementation: the first unit's run/.test(tpl) && /sub-issues: each unit filed/.test(tpl), "nextStepOf"]);
    if (X.dumpDom && X.NEEDS_BROWSER) { const d = X.dumpDom(path.join(Bo.dir, "dashboard.html"), "", "1400,1000"), panel = d && X.inner(d, '<div class="sp own', "div");
      c.push(d == null ? ["an older board at boards draws its own step panel", false, X.NEEDS_BROWSER] : ["an older board at boards draws its own step panel", /with a board/.test(panel || ""), (panel || "").slice(0, 200)]); }
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
