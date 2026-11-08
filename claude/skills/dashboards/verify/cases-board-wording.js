// The cases of the board's names (admin-team/dashboards-skill/board-wording, the user's decisions of 2026-11-06; dated dashboards-skill/41 in
// the feature probes), run by verify-templates.js (it passes its helpers in), or on its own: node verify/cases-board-wording.js [--out <dir>].
// Every name a board shows has one home: plan/scripts/passnames.js for the scripts, and the templates' names block (names:begin), held equal
// here. The qa step reads "Quality Review", a pass "Quality Review N" (never an ordinal), one not numbered "review", what it returns its
// findings; the remediation step "Correction" (on-the-spot, remediation) or "Resolution" (re-plan-then-remediation), the first bare, a later
// one "Correction of Quality Review N"; every other step by its name ("State boards"), the Document step's commit "Document commit"; an open
// point's "raised" by the step that raised it; the legends' and progress notes' words. The fast path writes them, every rewrite rewords an
// older wording, check.js fails one on a board in flight (BOARD WORDING) and warns on a landed one. And the classes that carry their
// element's type (.kpi-tile, .verdict-pill, .legend): the templates, the splice of a board drawn before them, the probes. And the worked
// example's final-implementation.md, a record of the state alone, its board's links into it repointed. Only the rendered step panel needs a
// browser (reported not run without one). Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), vm = require("vm");

module.exports = function casesBoardWording(X) {
  const { sk, out, targets } = X, dumpDom = X.dumpDom || (() => null);
  const NEEDS_BROWSER = X.NEEDS_BROWSER || "needs a browser: not run (verify-templates.js --browser runs it)";
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8" });
  const PN = require(sk("plan/scripts/passnames.js")), lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), LR = require(sk("system/scripts/levelrefs.js"));
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js"), SPLICE = sk("system/scripts/splice.js");
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  const sc = path.join(out, "board-wording"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(`${EXD}/plan.json`);
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  /* a template's names block, run on its own */
  const namesOf = h => { const m = /\/\* names:begin\b[\s\S]*?\*\/([\s\S]*?)\/\* names:end \*\//.exec(h); if (!m) return null;
    const names = ["PASS_NAME", "REVIEW", "passName", "STEP_NAME", "ROUTE_NAME", "routeName", "remediationName", "stepLabel", "REMEDIATION_NOTE", "PROGRESS_NOTE", "NOTE_WORK", "EVENT_STEP", "raisedWords", "inPlaceWords"];
    return vm.runInNewContext(`(function(){ ${m[1]}\n return {${names.map(n => `${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")}}; })()`, {}); };

  guard("the names: one home in passnames.js, and the templates' names blocks equal to it", c => {
    const N = namesOf(rd(PB)), W = namesOf(rd(WB));
    c.push(["the issue-board template and the work-board template each carry a names block that runs on its own", !!N && !!W && typeof N.stepLabel === "function" && typeof W.stepLabel === "function", js([!!N, !!W])]);
    if (!N || !W) return;
    const same = (a, b) => js(a) === js(b);
    c.push(["the issue board's PASS_NAME, STEP_NAME, ROUTE_NAME, NOTE_WORK and EVENT_STEP are passnames.js's", N.PASS_NAME === PN.PASS_NAME && N.REVIEW === PN.REVIEW && same(N.STEP_NAME, PN.STEP_NAME) && same(N.ROUTE_NAME, PN.ROUTE_NAME) && same(N.NOTE_WORK, PN.NOTE_WORK) && same(N.EVENT_STEP, PN.EVENT_STEP), js([N.PASS_NAME, N.STEP_NAME && N.STEP_NAME.qa])]);
    c.push(["…and its legend words: the Correction's line and the progress note's", N.REMEDIATION_NOTE === PN.REMEDIATION_NOTE && N.PROGRESS_NOTE === PN.PROGRESS_NOTE && PN.REMEDIATION_NOTE === "Correction or Resolution after a Quality Review; each step is recorded as it runs" && PN.PROGRESS_NOTE === "a progress note: a report of the work as it happens", js([N.REMEDIATION_NOTE, N.PROGRESS_NOTE])]);
    const probes = [["remediation", 1], ["remediation", 2], ["on-the-spot", 1], ["re-plan-then-remediation", 1], ["re-plan-then-remediation", 3], [null, 2], ["planner-then-rookie-dev", 2]];
    const rn = probes.map(([r, p]) => [N.remediationName(r, p), PN.remediationName(r, p)]);
    c.push(["remediationName(): \"Correction\", \"Correction of Quality Review 2\", \"Resolution\", \"Resolution of Quality Review 3\", the same in both", rn.every(([a, b]) => a === b) && rn[0][1] === "Correction" && rn[1][1] === "Correction of Quality Review 2" && rn[2][1] === "Correction" && rn[3][1] === "Resolution" && rn[4][1] === "Resolution of Quality Review 3" && rn[6][1] === "Resolution of Quality Review 2", js(rn)]);
    const steps = Object.keys(PN.STEP_NAME), sl = steps.map(s => [s, N.stepLabel(s), PN.stepName(s), W.stepLabel(s)]);
    c.push(["every step by its name, the same in passnames.js and both templates: qa \"Quality Review\", state-boards \"State boards\"", sl.every(([, a, b, d]) => a === b && b === d) && PN.stepName("qa") === "Quality Review" && PN.stepName("state-boards") === "State boards" && PN.stepName("implementation") === "Implementation", js(sl.filter(([, a, b, d]) => !(a === b && b === d)))]);
    c.push(["…remediation by its route on both templates (a step not yet routed reads as the default route's, \"Correction\")", N.stepLabel("remediation", { route: "re-plan-then-remediation" }) === "Resolution" && W.stepLabel("remediation", { route: "re-plan-then-remediation" }) === "Resolution" && N.stepLabel("remediation") === "Correction" && N.stepLabel("remediation", { route: "remediation", pass: 2 }) === "Correction of Quality Review 2", N.stepLabel("remediation", { route: "re-plan-then-remediation" })]);
    const rw = ["implementation-stage S3", "implementation-stage", "document", "qa-pass", "Quality Review 1", "qa pass 2", "sized", "state-boards", "a note the run wrote"].map(r => [r, N.raisedWords(r), PN.raisedWords(r)]);
    c.push(["an open point's \"raised\": \"raised during Implementation, stage 3\", \"raised at Document\", never an event's id", rw.every(([, a, b]) => a === b) && rw[0][2] === "raised during Implementation, stage 3" && rw[2][2] === "raised at Document" && rw[3][2] === "raised at Quality Review" && rw[4][2] === "raised during Quality Review 1" && rw[7][2] === "raised at State boards", js(rw)]);
    const ip = [{ pass: 1, inPlace: "fixed" }, { pass: 2, inPlace: "fixing" }].map(p => [N.inPlaceWords(p), W.inPlaceWords(p), PN.inPlaceWords(p)]);
    c.push(["the in-place mark: \"fixed in place · no additional review\", the same on every board", ip.every(([a, b, d]) => a === b && b === d) && ip[0][2] === "fixed in place · no additional review" && ip[1][2] === "fixing in place · no additional review", js(ip)]);
    c.push(["the Document step's commit task is named \"Document commit\" (lib.js DOC_TASKS)", lib.DOC_TASKS.find(t => t[0] === "document-landing")[1] === "Document commit" && PN.TASK_NAME["state-boards"] === "State boards", js(lib.DOC_TASKS.slice(-2))]);
    c.push(["what a pass returns, its findings: \"18 findings (10 documentation, 8 test)\"", PN.findingsWords({ documentation: 10, test: 8, code: 0 }) === "18 findings (10 documentation, 8 test)" && PN.findingsWords({ code: 1 }, { minor: 1 }) === "1 finding (1 code; 1 minor)" && PN.findingsWords({ code: 0 }) === "", PN.findingsWords({ documentation: 10, test: 8, code: 0 })]);
  });

  guard("the older wording, reworded wherever a board holds it; code, ids and titles left as written", c => {
    const ctx = PN.ctxOf({ qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }, { pass: 2, verdict: "changes-requested", route: "re-plan-then-remediation" }], remediation: { pass: 2, route: "re-plan-then-remediation" } });
    const want = [["fixed on the spot, no new qa pass", "fixed on the spot, no additional review"], ["then the next qa pass", "then the next review"], ["The qa pass had approved; the merge followed.", "The review had approved; the merge followed."],
      ["complete: qa passed", "complete: the review approved"], ["Halted at qa: waiting on you (x)", "Halted at Quality Review: waiting on you (x)"], ["Implementation done, 3 stages; qa next.", "Implementation done, 3 stages; Quality Review next."],
      ["Remediation for qa pass 1: The fixes.", "Correction: The fixes."], ["Remediation for Quality Review 2: the plan re-pass", "Resolution of Quality Review 2: the plan re-pass"],
      ["Remediation: Quality Review 1 fixes done; Quality Review 2 next", "Correction: Quality Review 1 fixes done; Quality Review 2 next"], ["Resumed at remediation", "Resumed at the Resolution"],
      ["The route's loop; its sub-steps are recorded as they run.", "The route's loop; its sub-steps are recorded as they run."], ["the remediation loop answering it", "the Resolution answering it"],
      ["then the Document-landing commit", "then the Document commit"], ["qa passes 1 and 2 found it", "Quality Reviews 1 and 2 found it"]];
    const bad = want.filter(([a, b]) => PN.renamePassText(a, ctx) !== b);
    c.push(["each older wording reads in the new one, the step named by the route the board records", !bad.length, js(bad.map(([a, b]) => [a, PN.renamePassText(a, ctx), b]))]);
    const found = want.filter(([a, b]) => a !== b && !PN.passRefs(a).length).map(x => x[0]), clean = want.filter(([, b]) => PN.passRefs(b).length).map(x => [x[1], PN.passRefs(x[1])]);
    c.push(["passRefs() finds every older wording, and none in the new", !found.length && !clean.length, js([found, clean])]);
    const keep = ["the qa-pass event", "`qa pass 1`", "<code>qa next</code>", "re-plan-then-remediation", "the remediation route", "a Correction, then the next review", "Quality Review 2 approved", "rookie-dev", "Document commit"];
    const moved = keep.filter(s => PN.renamePassText(s, ctx) !== s || PN.passRefs(s).length);
    c.push(["code, the events' and routes' ids and the new wording are left as written", !moved.length, js(moved.map(s => [s, PN.renamePassText(s, ctx)]))]);
    const plan = { schema: "plan-board/1", issueTitle: "Fix the qa next button", wip: { step: "remediation", qa: [{ pass: 1, verdict: "changes-requested", route: "re-plan-then-remediation" }], remediation: { pass: 1, route: "re-plan-then-remediation", steps: [] }, detail: "Remediation for qa pass 1.", document: { tasks: [{ id: "document-landing", name: "Document-landing commit", state: "todo" }] } },
      trail: [{ label: "Halted at qa: waiting on you (an answer)" }], rows: [{ id: "a", unit: { title: "qa pass 3 title" }, asBuilt: { summary: "no new qa pass ran" } }] };
    const p = copy(plan), lines = PN.renamePasses(p), again = PN.renamePasses(p);
    c.push(["renamePasses(): a board reworded in place, the remediation by the route its wip records, one line saying so, a second run changing nothing",
      lines.length === 1 && !again.length && p.wip.detail === "Resolution." && p.wip.document.tasks[0].name === "Document commit" && p.trail[0].label === "Halted at Quality Review: waiting on you (an answer)" && p.rows[0].asBuilt.summary === "no additional review ran", js([lines, p.wip.detail, p.wip.document.tasks[0].name])]);
    c.push(["…its ids and the issue titles it quotes left alone", p.issueTitle === plan.issueTitle && p.rows[0].unit.title === "qa pass 3 title" && p.wip.document.tasks[0].id === "document-landing" && p.wip.remediation.route === "re-plan-then-remediation", js([p.issueTitle, p.rows[0].unit.title])]);
    c.push(["lib.js trailStep(): a Correction's or Resolution's entry is the remediation step's, as the older wording was", lib.trailStep("Correction: the fixes current") === "remediation" && lib.trailStep("Resolution of Quality Review 2: x") === "remediation" && lib.trailStep("Halted at the Correction: waiting on you") === "remediation" && lib.trailStep("Remediation for Quality Review 1") === "remediation", "trailStep"]);
  });

  /* the example as a board in flight, in a tree of its own */
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: "2026-10-26T08:00:00Z", current: ["built"], questions: [], research: null, open: [], qa: [], remediation: null, history: {}, event: { name: "branch-cut", at: "2026-10-26T08:00:00Z" },
      stages: [{ id: "S1", name: "the parse", state: "done", rows: [] }, { id: "S2", name: "the routing", state: "current", rows: [] }], steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    x.trail = (x.trail || []).filter(t => t && t.column !== "built"); return x; };
  const tree = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(`${EXD}/${f}`), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", JSON.stringify(plan, null, 2) + "\n")); run(EMBED, [dir]); return { root, dir, folder: plan.folder }; };
  const evIn = T => (name, at, facts) => { const rq = wr(path.join(sc, `${path.basename(T.root)}-${name}-${at.replace(/\D/g, "")}.json`), JSON.stringify({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--at", at, "--json"]); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { /* below */ } return { a, S, p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const last = p => (p.trail || []).slice(-1)[0] || {};
  const old = p => PN.passRefsIn(p, "", [], LR.titleSkip(p));

  guard("the fast path writes every name from passnames.js", c => {
    const T = tree("fast", building()), ev = evIn(T);
    const r1 = ev("implementation-stage", "2026-10-26T09:00:00Z", { stages: [{ id: "S2", state: "done" }] });
    c.push(["every stage done: \"Quality Review next\", never \"qa next\"", r1.a.status === 0 && /Quality Review next/.test(r1.p.wip.detail || "") && /Quality Review next/.test(last(r1.p).label || "") && !old(r1.p).length, js([r1.S.error, r1.p.wip.detail, last(r1.p).label])]);
    ev("qa-pass", "2026-10-26T10:00:00Z", { qa: { pass: 1, verdict: "running" } });
    const r2 = ev("halted", "2026-10-26T10:30:00Z", { waitingOn: "a ruling on the scope" });
    c.push(["a halt at qa: \"Halted at Quality Review: waiting on you (…)\"", r2.a.status === 0 && last(r2.p).label === "Halted at Quality Review: waiting on you (a ruling on the scope)", last(r2.p).label]);
    const r3 = ev("resumed", "2026-10-26T11:00:00Z", {});
    c.push(["…and its resumption, \"Resumed at Quality Review\"", r3.a.status === 0 && last(r3.p).label === "Resumed at Quality Review", last(r3.p).label]);
    const r4 = ev("qa-pass", "2026-10-26T12:00:00Z", { qa: { pass: 1, verdict: "changes-requested", documentation: 10, test: 8, route: "remediation" } });
    c.push(["a pass that requests changes: its findings counted, its route by the step's name", r4.a.status === 0 && r4.p.wip.detail === "Quality Review 1: changes requested, 18 findings (10 documentation, 8 test); a Correction, then the next review." && last(r4.p).label === "Quality Review 1: changes requested, 18 findings (10 documentation, 8 test)", js([r4.S.error, r4.p.wip.detail, last(r4.p).label])]);
    const r5 = ev("implementation-stage", "2026-10-26T13:00:00Z", { remediation: { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }, { name: "Quality Review 2", state: "todo" }] } });
    c.push(["the first remediation is \"Correction\", with no number and no \"loop\"", r5.a.status === 0 && r5.p.wip.detail === "Correction: The fixes." && last(r5.p).label === "Correction: The fixes current", js([r5.S.error, r5.p.wip.detail, last(r5.p).label])]);
    ev("qa-pass", "2026-10-26T14:00:00Z", { qa: { pass: 2, verdict: "running" } });
    ev("qa-pass", "2026-10-26T15:00:00Z", { qa: { pass: 2, verdict: "changes-requested", code: 2, route: "re-plan-then-remediation" } });
    const r6 = ev("implementation-stage", "2026-10-26T16:00:00Z", { remediation: { pass: 2, route: "re-plan-then-remediation", steps: [{ name: "The plan re-pass", state: "current" }] } });
    c.push(["a later one names the pass it answers, by its route: \"Resolution of Quality Review 2\"", r6.a.status === 0 && r6.p.wip.detail === "Resolution of Quality Review 2: The plan re-pass." && /^Resolution of Quality Review 2: /.test(last(r6.p).label || ""), js([r6.S.error, r6.p.wip.detail, last(r6.p).label])]);
    const r7 = ev("halted", "2026-10-26T16:30:00Z", { waitingOn: "an answer" });
    /* a halt names its fix step by its route alone, never the pass (admin-team/dashboards/call-3; verify/cases-halt-fix-step.js) */
    c.push(["a halt there names the fix step by its route alone: \"Halted at Resolution\", never \"of Quality Review 2\"", last(r7.p).label === "Halted at Resolution: waiting on you (an answer)", last(r7.p).label]);
    c.push(["the board in flight holds no older wording, and checks clean on it", !old(r7.p).length && !/BOARD WORDING/.test(run(CHECK, [T.dir]).stdout), js(old(r7.p))]);
    const r8 = ev("document", "2026-10-27T09:00:00Z", { tasks: [{ id: "documentation-review", state: "current" }] });
    const dl = ((r8.p.wip.document || {}).tasks || []).find(t => t && t.id === "document-landing");
    c.push(["the Document step's commit task is named \"Document commit\"", r8.a.status === 0 && !!dl && dl.name === "Document commit", js([r8.S.error, dl])]);
  });

  guard("check.js fails a board in flight holding an older wording (BOARD WORDING); a rewrite clears it; a landed board is only warned on", c => {
    const b = building(); b.wip.step = "remediation"; b.wip.qa = [{ pass: 1, verdict: "changes-requested", route: "remediation", date: "2026-10-26" }]; b.wip.remediation = { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }] };
    b.wip.detail = "Remediation for Quality Review 1: The fixes."; b.trail.push({ date: "2026-10-26", column: "built", label: "Implementation done (2 stages); qa next" });
    const root = path.join(sc, "check"), dir = path.join(root, ...b.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(`${EXD}/${f}`), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(b, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", JSON.stringify(b, null, 2) + "\n"));
    const c1 = run(CHECK, [dir]);
    c.push(["the board fails BOARD WORDING, naming where", c1.status !== 0 && /^FAIL.*BOARD WORDING: plan\.json holds an older wording: .*wip\.detail/m.test(c1.stdout), (c1.stdout.split(/\r?\n/).find(l => /BOARD WORDING/.test(l)) || "").slice(0, 220)]);
    const e = run(EMBED, [dir]), p = JSON.parse(rd(path.join(dir, "plan.json"))), c2 = run(CHECK, [dir]);
    c.push(["embed.js rewords it, and the board passes on that count", e.status === 0 && p.wip.detail === "Correction: The fixes." && /Quality Review next/.test(p.trail.slice(-1)[0].label) && !/BOARD WORDING/.test(c2.stdout), js([p.wip.detail, p.trail.slice(-1)[0].label])]);
    const L = copy(EX); L.trail = [...(L.trail || []), { date: "2026-10-27", column: "built", label: "Remediation for Quality Review 1: the fixes" }];
    const r2 = path.join(sc, "landed"), d2 = path.join(r2, ...L.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(`${EXD}/${f}`), path.join(d2, f), { recursive: true }));
    wr(path.join(d2, "plan.json"), JSON.stringify(L, null, 2) + "\n"); wr(path.join(d2, "dashboard.html"), lib.writeBlock(rd(PB), "plan", JSON.stringify(L, null, 2) + "\n"));
    const c3 = run(CHECK, [d2]);
    c.push(["a landed board holding it is warned on, kept as it landed", !/^FAIL.*BOARD WORDING/m.test(c3.stdout) && /^warn\s+BOARD WORDING: .*kept as it landed/m.test(c3.stdout), (c3.stdout.split(/\r?\n/).filter(l => /BOARD WORDING/.test(l)).join(" | ") || "no line").slice(0, 220)]);
  });

  guard("the classes carry their element's type: .kpi-tile, .verdict-pill, .legend, on every board type", c => {
    const T = [["plan/template/dashboard.html", "plan-board"], ["plan/template/board.html", "work-board"], ["system/template/system.html", "system"], ["system/template/supersystem.html", "supersystem"]];
    T.forEach(([f, k]) => { const h = rd(tp(f)), css = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n"), cls = [...h.matchAll(/class(?:Name)?="([^"]*)"/g)].map(m => m[1].split(/\s+/)).flat();
      const oldCss = css.match(/\.(?:kpi|vp|key|c4key)(?![-\w])/g) || [], oldCls = cls.filter(x => ["kpi", "vp", "key", "c4key"].includes(x));
      c.push([`${f}: no .kpi, .vp, .key or .c4key, in its CSS or its markup; .legend styled`, !oldCss.length && !oldCls.length && /\.legend\{/.test(css), js([[...new Set(oldCss)], [...new Set(oldCls)]])]);
      const miss = F.probe(h, k).filter(m => ["board-ui-classes", "board-wording"].includes(m.id)); c.push([`${f}: the probes of dashboards-skill/41 hold it`, !miss.length, js(miss)]); });
    /* a state board drawn before them, brought onto the template by the splice: its own tiles and legends renamed */
    const H = require(sk("system/scripts/history.js")), V = (H.versions ? H.versions(sk("system/template/system.html")) : []) || [];
    const base = path.join(sc, "splice", "index.html"); wr(base, rd(sk("system/examples/webtools-udp/index.html")).replace(/class="kpi-tile"/g, 'class="kpi"').replace(/<div class="legend"/g, '<div class="key"').replace(/class="c4-legend"/g, 'class="c4key"'));
    ["state.json", "workspace.dsl"].forEach(f => { if (fs.existsSync(sk(`system/examples/webtools-udp/${f}`))) fs.copyFileSync(sk(`system/examples/webtools-udp/${f}`), path.join(sc, "splice", f)); });
    const s = run(SPLICE, [base, "--template", tp("system/template/system.html"), "--json"]); let R = {}; try { R = JSON.parse(s.stdout); } catch (e) { /* below */ }
    const h2 = rd(base);
    c.push(["splice.js renames a board's own classes (class kpi, key, c4key) and reports it; its property accesses are left alone", (R.renamed || []).some(x => /class kpi → kpi-tile/.test(x)) && (R.renamed || []).some(x => /class key → legend/.test(x)) && (R.renamed || []).some(x => /class c4key → c4-legend/.test(x)) && !/class="(?:kpi|key|c4key)"/.test(h2) && /\.key\b/.test(h2.replace(/<style>[\s\S]*?<\/style>/g, "")) === /[\w)\]]\.key\b/.test(h2.replace(/<style>[\s\S]*?<\/style>/g, "")), js([R.renamed, s.stderr && s.stderr.slice(0, 200)])]);
    c.push(["…and the spliced board carries the probe's classes", !F.probe(h2, "system").some(m => m.id === "board-ui-classes"), js(F.probe(h2, "system").map(m => m.id))]);
    const oldTpl = rd(sk("system/template/system.html")).replace(/\.legend(?![-\w])/g, ".key");
    c.push(["a board on the older classes is told so (FEATURE MISSING: board-ui-classes), the older features still read on it", F.probe(oldTpl, "system").some(m => m.id === "board-ui-classes") && !F.probe(oldTpl, "system").some(m => ["kpi-tile-legends", "ref-num-shown"].includes(m.id)), js(F.probe(oldTpl, "system").map(m => m.id))]);
  });

  guard("the worked example: final-implementation.md records the state alone, and its board's links follow it", c => {
    const md = rd(sk(`${EXD}/final-implementation.md`)), heads = [...md.matchAll(/^#{2,3} (.+)$/gm)].map(m => m[1]);
    c.push(["no review stage, no decisions taken during the reviews, no research that did not hold, no follow-ups section", !heads.some(h => /review|decision|research|follow-up|how the plan grew/i.test(h)), js(heads)]);
    c.push(["…and no process: no review, pass, loop or remediation named in its text", !/\b(?:qa|reviews?|reviewed|remediation|loop)\b/i.test(md.replace(/`[^`]*`/g, "")), (md.replace(/`[^`]*`/g, "").match(/.{30}\b(?:qa|reviews?|reviewed|remediation|loop)\b.{30}/i) || [""])[0]]);
    const slug = h => h.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"), anchors = new Set(heads.map(slug));
    const refs = []; const walk = (v, at) => { if (typeof v === "string") { const m = /^final-implementation\.md#([\w-]+)$/.exec(v); if (m) refs.push([at, m[1]]); } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`)); else if (v && typeof v === "object") Object.keys(v).forEach(k => walk(v[k], `${at}.${k}`)); }; walk(EX, "");
    const dead = refs.filter(([, a]) => !anchors.has(a));
    c.push(["every link of the board into it names a section it has", refs.length > 0 && !dead.length, js(dead.slice(0, 5))]);
    const ck = run(CHECK, [sk(EXD)]);
    c.push(["the example checks with no failure but the browser pass, and holds no older wording", !ck.stdout.split(/\r?\n/).some(l => /^FAIL/.test(l) && !/browser/.test(l)) && !old(EX).length, js([ck.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)), old(EX)])]);
  });

  guard("the rendered step panel names the step: \"Quality Review\" on the strip, \"Correction of Quality Review 2\" as the panel's heading", c => {
    const b = building(); b.wip.step = "remediation"; b.wip.qa = [{ pass: 1, verdict: "changes-requested", route: "remediation", date: "2026-10-26" }, { pass: 2, verdict: "changes-requested", route: "remediation", date: "2026-10-26" }];
    b.wip.remediation = { pass: 2, route: "remediation", steps: [{ name: "The fixes", state: "current" }] }; b.wip.open = [{ text: "A doc gap", raised: "implementation-stage S2" }];
    const f = wr(path.join(sc, "render", "dashboard.html"), lib.writeBlock(rd(PB), "plan", JSON.stringify(b, null, 2) + "\n"));
    const d = dumpDom(f, "", "1400,1000", 6000);
    if (d == null) { c.push(["the strip, the panel's heading, the open point's raised, rendered", false, NEEDS_BROWSER]); return; }
    c.push(["the strip reads \"Quality Review\" and \"Correction\"; the panel's heading \"Correction of Quality Review 2\"; the point \"raised during Implementation, stage 2\"", />Quality Review<\/li>|>Quality Review<\/button>/.test(d) && /<h3 class="sp-t">Correction of Quality Review 2<\/h3>/.test(d) && /raised during Implementation, stage 2/.test(d) && !/>qa<\/li>|remediation · loop|1st pass/.test(d), (d.match(/<h3 class="sp-t">[^<]*<\/h3>/) || [""])[0]]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html", "system/template/supersystem.html", "system/template/system.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
