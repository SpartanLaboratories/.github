// The cases of a halt during a fix step (admin-team/dashboards/call-3, the user's decision of 2026-11-06, "Call 3 (b)"; dated 50), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-halt-fix-step.js [--out <dir>].
// A halt during a fix step (the remediation step: a Correction or a Resolution, by its route) names the step by its route alone: "Halted at
// Correction", "Halted at Resolution", never the pass it answers ("Halted at the Resolution of Quality Review 2"). Every other halt reads as
// before ("Halted at Quality Review", "Halted at the plan"), and so does what is not a halt: a resume, an escalation, the step's own title.
// 1. passnames.js haltWords() (in a sentence) and haltName() (as a label): the fix step by its route alone, whatever its pass; every other
//    step as stepWords() and stepName() name it.
// 2. apply-event.js: a halt in a Correction or a Resolution, the first or a later one, writes "Halted at Correction: …" / "Halted at
//    Resolution: …"; a halt at Quality Review as before; the resumed and an escalation at the fix step as before; check.js clean on the board.
// 3. The wording it replaces: "Halted at the Correction of Quality Review 2", "Halted at the Resolution", "Halted at remediation" (and the
//    panel's "Held still at …") reworded by every rewrite (renamePassText(), renamePasses()) and found by passRefs() (check.js BOARD
//    WORDING on a board in flight); "Resumed at …" and "Escalated at …" left as written; lib.js trailStep() reads the new entry as the
//    remediation step's.
// 4. The template: its names block's haltLabel() equal to passnames.js haltName() for every step and route; a unit's run line ("at
//    Correction") and the waiting card's "resumes at" name a fix step by its route alone (run outside a browser); the step panel's wait line
//    names it so while its heading keeps the step's title.
// 5. The feature probe (halt-fix-step): found on the issue-board template, missed on one without it, for issue and tracking boards only.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesHaltFixStep(X) {
  const { sk, out, targets } = X;
  const PN = require(sk("plan/scripts/passnames.js")), lib = require(sk("plan/scripts/lib.js")), LR = require(sk("system/scripts/levelrefs.js")), F = require(sk("system/scripts/features.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const PBF = tp("plan/template/dashboard.html"), PB = rd(PBF);
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "halt-fix-step"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const STEPS = ["sizing", "interview", "research", "architecture", "sub-issues", "boards", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "state-boards", "merge", "landed"];
  const ROUTES = [null, "on-the-spot", "remediation", "re-plan-then-remediation", "rookie-dev", "planner-then-rookie-dev"];

  guard("passnames.js: a halt names a fix step by its route alone; every other step as before", c => {
    const fix = ROUTES.flatMap(r => [null, 1, 2, 3].map(p => [r, p, PN.haltWords("remediation", { route: r, pass: p }), PN.haltName("remediation", { route: r, pass: p })]));
    const want = r => (r === "re-plan-then-remediation" || r === "planner-then-rookie-dev") ? "Resolution" : "Correction";
    c.push(["haltWords() and haltName(): \"Correction\" or \"Resolution\" by the route, never its pass and never \"the\"", fix.every(([r, , w, n]) => w === want(r) && n === want(r)), js(fix.filter(([r, , w, n]) => !(w === want(r) && n === want(r))))]);
    const other = STEPS.filter(s => s !== "remediation").map(s => [s, PN.haltWords(s, { route: "remediation", pass: 2 }), PN.stepWords(s), PN.haltName(s, { route: "remediation", pass: 2 }), PN.stepName(s)]);
    c.push(["every other step as stepWords() and stepName() name it (\"Quality Review\", \"the plan\", \"Implementation\")", other.every(([, a, b, d, e]) => a === b && d === e) && PN.haltWords("qa") === "Quality Review" && PN.haltWords("plan") === "the plan", js(other.filter(([, a, b, d, e]) => !(a === b && d === e)))]);
    c.push(["what is not a halt keeps the visit's name: stepWords() \"the Correction of Quality Review 2\", stepName() \"Resolution of Quality Review 3\"", PN.stepWords("remediation", { route: "remediation", pass: 2 }) === "the Correction of Quality Review 2" && PN.stepName("remediation", { route: "re-plan-then-remediation", pass: 3 }) === "Resolution of Quality Review 3", js([PN.stepWords("remediation", { route: "remediation", pass: 2 }), PN.stepName("remediation", { route: "re-plan-then-remediation", pass: 3 })])]);
    c.push(["lib.js carries them (apply-event.js reads them there)", lib.haltWords === PN.haltWords && lib.haltName === PN.haltName, js([typeof lib.haltWords, typeof lib.haltName])]);
  });

  /* a board in flight at implementation, from the example */
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: "2026-10-26T08:00:00Z", current: ["built"], questions: [], research: null, open: [], qa: [], remediation: null, history: {}, waitingOn: null, resume: null, event: { name: "branch-cut", at: "2026-10-26T08:00:00Z" },
      stages: [{ id: "S1", name: "the parse", state: "done", rows: [] }, { id: "S2", name: "the routing", state: "current", rows: [] }], steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    x.trail = (x.trail || []).filter(t => t && t.column !== "built"); return x; };
  const tree = (name, plan, tpl) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/")); fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(`${EXD}/${f}`), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), lib.writeBlock(tpl || PB, "plan", JSON.stringify(plan, null, 2) + "\n"));
    const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, folder: plan.folder }; };
  let nreq = 0;
  const evIn = T => (name, at, facts) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--at", at, "--json"]); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { S = { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } return { a, S, p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const last = p => (p.trail || []).slice(-1)[0] || {};
  const old = p => PN.passRefsIn(p, "", [], LR.titleSkip(p));
  const keep = {};

  guard("apply-event.js: a halt in a Correction or a Resolution reads \"Halted at Correction\" / \"Halted at Resolution\"; every other wording as before", c => {
    const T = tree("fast", building()), ev = evIn(T);
    ev("implementation-stage", "2026-10-26T09:00:00Z", { stages: [{ id: "S2", state: "done" }] });
    ev("qa-pass", "2026-10-26T10:00:00Z", { qa: { pass: 1, verdict: "running" } });
    const q = ev("halted", "2026-10-26T10:30:00Z", { waitingOn: "a ruling on the scope" });
    c.push(["a halt at Quality Review as before: \"Halted at Quality Review: waiting on you (…)\"", q.a.status === 0 && last(q.p).label === "Halted at Quality Review: waiting on you (a ruling on the scope)", js([q.S.error, last(q.p).label])]);
    ev("resumed", "2026-10-26T11:00:00Z", {});
    ev("qa-pass", "2026-10-26T12:00:00Z", { qa: { pass: 1, verdict: "changes-requested", code: 3, route: "remediation" } });
    ev("implementation-stage", "2026-10-26T13:00:00Z", { remediation: { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }, { name: "Quality Review 2", state: "todo" }] } });
    const h1 = ev("halted", "2026-10-26T13:30:00Z", { waitingOn: "which fix to keep" });
    c.push(["a halt in the first Correction: \"Halted at Correction: waiting on you (…)\"", h1.a.status === 0 && h1.p.wip.step === "halted" && h1.p.wip.resume === "remediation" && last(h1.p).label === "Halted at Correction: waiting on you (which fix to keep)", js([h1.S.error, h1.p.wip.step, h1.p.wip.resume, last(h1.p).label])]);
    const r1 = ev("resumed", "2026-10-26T14:00:00Z", {});
    c.push(["…its resumption as before, \"Resumed at the Correction\"", r1.a.status === 0 && last(r1.p).label === "Resumed at the Correction", last(r1.p).label]);
    ev("qa-pass", "2026-10-26T15:00:00Z", { qa: { pass: 2, verdict: "running" } });
    ev("qa-pass", "2026-10-26T16:00:00Z", { qa: { pass: 2, verdict: "changes-requested", code: 2, route: "re-plan-then-remediation" } });
    ev("implementation-stage", "2026-10-26T16:30:00Z", { remediation: { pass: 2, route: "re-plan-then-remediation", steps: [{ name: "The plan re-pass", state: "current" }] } });
    const h2 = ev("halted", "2026-10-26T17:00:00Z", { waitingOn: "an answer" });
    c.push(["a halt in a later Resolution: \"Halted at Resolution: waiting on you (…)\", never \"the Resolution of Quality Review 2\"", h2.a.status === 0 && last(h2.p).label === "Halted at Resolution: waiting on you (an answer)", js([h2.S.error, last(h2.p).label])]);
    c.push(["the trail entry is the fix step's (lib.js trailStep())", lib.trailStep(last(h2.p).label) === "remediation" && lib.trailStep(last(h1.p).label) === "remediation", js([lib.trailStep(last(h2.p).label), lib.trailStep(last(h1.p).label)])]);
    c.push(["the board in flight holds no older wording, and checks clean on it", !old(h2.p).length && !/BOARD WORDING/.test(run(CHECK, [T.dir]).stdout), js(old(h2.p))]);
    keep.halted = { dir: T.dir, plan: h2.p };
    const r2 = ev("resumed", "2026-10-26T17:30:00Z", {});
    c.push(["…its resumption as before, the visit named: \"Resumed at the Resolution of Quality Review 2\"", r2.a.status === 0 && last(r2.p).label === "Resumed at the Resolution of Quality Review 2", last(r2.p).label]);
    const e2 = ev("escalated", "2026-10-26T18:00:00Z", { waitingOn: "a re-sizing" });
    c.push(["an escalation from the fix step is no halt: as before, \"Escalated at the Resolution of Quality Review 2\"", e2.a.status === 0 && /^Escalated at the Resolution of Quality Review 2: /.test(last(e2.p).label || ""), js([e2.S.error, last(e2.p).label])]);
  });

  guard("the wording it replaces: reworded by every rewrite, found in flight; a resume and an escalation left as written", c => {
    const ctx = PN.ctxOf({ qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }, { pass: 2, verdict: "changes-requested", route: "re-plan-then-remediation" }], remediation: { pass: 2, route: "re-plan-then-remediation" } });
    const want = [["Halted at the Correction of Quality Review 2: waiting on you (x)", "Halted at Correction: waiting on you (x)"], ["Halted at the Resolution: waiting on you (x)", "Halted at Resolution: waiting on you (x)"],
      ["Halted at the Correction: waiting on you (x)", "Halted at Correction: waiting on you (x)"], ["halted during the Resolution of Quality Review 3", "halted during Resolution"],
      ["Halted at remediation: waiting on you (x)", "Halted at Resolution: waiting on you (x)"], ["Held still at the Correction of Quality Review 2", "Held still at Correction"], ["held still in remediation", "held still in Resolution"]];
    const bad = want.filter(([a, b]) => PN.renamePassText(a, ctx) !== b);
    c.push(["a halt's fix step reads by its route alone, the pass and the article dropped", !bad.length, js(bad.map(([a, b]) => [a, PN.renamePassText(a, ctx), b]))]);
    const found = want.filter(([a]) => !PN.passRefs(a).length).map(x => x[0]), clean = want.filter(([, b]) => PN.passRefs(b).length).map(x => [x[1], PN.passRefs(x[1])]);
    c.push(["passRefs() finds each (check.js BOARD WORDING on a board in flight), and none in the new", !found.length && !clean.length, js([found, clean])]);
    const keepAs = ["Resumed at the Correction of Quality Review 2", "Escalated at the Resolution of Quality Review 2: waiting on a re-sizing", "Halted at Quality Review: waiting on you (x)", "Halted at the plan: waiting on you (x)", "Correction of Quality Review 2: the fixes", "Halted at Correction: waiting on you (x)", "`Halted at the Correction of Quality Review 2`"];
    const moved = keepAs.filter(s => PN.renamePassText(s, ctx) !== s || PN.passRefs(s).length);
    c.push(["a resume, an escalation, every other halt, the step's own name and code left as written", !moved.length, js(moved.map(s => [s, PN.renamePassText(s, ctx)]))]);
    c.push(["…and the older resume wording still reads with the article: \"Resumed at remediation\" → \"Resumed at the Resolution\"", PN.renamePassText("Resumed at remediation", ctx) === "Resumed at the Resolution", PN.renamePassText("Resumed at remediation", ctx)]);
    const plan = { schema: "plan-board/1", issueTitle: "Halted at the Correction of Quality Review 2", wip: { step: "halted", resume: "remediation", qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }, { pass: 2, verdict: "changes-requested", route: "remediation" }], remediation: { pass: 2, route: "remediation", steps: [] } },
      trail: [{ label: "Halted at the Correction of Quality Review 2: waiting on you (an answer)" }, { label: "Resumed at the Correction of Quality Review 2" }] };
    const p = copy(plan), lines = PN.renamePasses(p), again = PN.renamePasses(p);
    c.push(["renamePasses(): a board's halt entry reworded in place, its resume entry and the issue title it quotes left alone, a second run changing nothing",
      lines.length === 1 && !again.length && p.trail[0].label === "Halted at Correction: waiting on you (an answer)" && p.trail[1].label === plan.trail[1].label && p.issueTitle === plan.issueTitle, js([lines, p.trail.map(t => t.label), p.issueTitle])]);
    c.push(["lib.js trailStep(): \"Halted at Correction\", \"Halted at Resolution\" and \"halted in Correction\" are the remediation step's", ["Halted at Correction: waiting on you (x)", "Halted at Resolution: waiting on you (x)", "halted in Correction"].every(s => lib.trailStep(s) === "remediation"), js(["Halted at Correction: x", "Halted at Resolution: x", "halted in Correction"].map(s => lib.trailStep(s)))]);
  });

  /* the template's names block and its run helpers, run in a context outside a browser */
  const line = re => { const m = re.exec(PB); if (!m) throw new Error("not in the template: " + re); return m[0]; };
  guard("the template: haltLabel() equal to passnames.js haltName(); a unit's run line, the waiting card and the step panel name a fix step by its route alone", c => {
    const nb = /\/\* names:begin\b[\s\S]*?\*\/([\s\S]*?)\/\* names:end \*\//.exec(PB);
    if (!nb) { c.push(["the template carries its names block", false, "no names:begin … names:end"]); return; }
    const ctx = { esc: s => String(s == null ? "" : s) }; vm.createContext(ctx);
    vm.runInContext(nb[1].replace(/^const /gm, "var "), ctx);
    [/^function runCtx\(R\)\{[\s\S]*?\n  return \{route:[^\n]*\}; \}$/m, /^const RUN=.*$/m, /^const runKind=.*$/m, /^const runAt=.*$/m, /^const resumeAt=.*$/m].forEach(re => vm.runInContext(line(re).replace(/^const /, "var "), ctx));
    c.push(["the names block defines haltLabel()", typeof ctx.haltLabel === "function", typeof ctx.haltLabel]);
    if (typeof ctx.haltLabel !== "function") return;
    const all = STEPS.flatMap(s => ROUTES.flatMap(r => [null, 1, 2].map(p => [s, r, p, ctx.haltLabel(s, { route: r, pass: p }), PN.haltName(s, { route: r, pass: p })])));
    c.push(["haltLabel() is passnames.js haltName() for every step, route and pass", all.every(x => x[3] === x[4]), js(all.filter(x => x[3] !== x[4]).slice(0, 5))]);
    const L2 = { step: "halted", resume: "remediation", qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }, { pass: 2, verdict: "changes-requested", route: "re-plan-then-remediation" }], remediation: { pass: 2, route: "re-plan-then-remediation" } };
    const L1 = { step: "halted", resume: "remediation", qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }], remediation: { pass: 1, route: "remediation" } };
    c.push(["a unit's run line while halted in a fix step: \"at Resolution\", \"at Correction\", never the pass", ctx.runAt(L2) === "<span>at Resolution</span>" && ctx.runAt(L1) === "<span>at Correction</span>", js([ctx.runAt(L2), ctx.runAt(L1)])]);
    const LQ = { step: "halted", resume: "qa", qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }] }, LE = { ...L2, step: "escalated" };
    c.push(["…every other halt as before (\"at Quality Review\"), an escalation from the fix step naming its visit as before", ctx.runAt(LQ) === "<span>at Quality Review</span>" && ctx.runAt(LE) === "<span>at Resolution of Quality Review 2</span>", js([ctx.runAt(LQ), ctx.runAt(LE)])]);
    c.push(["the waiting card's \"resumes at\": a fix step by its route alone, every other step by its name (\"Research\", call-5)", ctx.resumeAt("remediation", ctx.runCtx(L2)) === "Resolution" && ctx.resumeAt("remediation", ctx.runCtx(L1)) === "Correction" && ctx.resumeAt("research", ctx.runCtx(L2)) === "Research", js([ctx.resumeAt("remediation", ctx.runCtx(L2)), ctx.resumeAt("research", ctx.runCtx(L2))])]);
    c.push(["…and the card writes it so, for the tracking issue's own halt and each unit's run", /resumes at \$\{esc\(resumeAt\(WIP\.resume,runCtx\(WIP\)\)\)\}/.test(PB) && /its run resumes at \$\{esc\(resumeAt\(L\.resume,runCtx\(L\)\)\)\}/.test(PB) && !/resumes at \$\{esc\((?:WIP|L)\.resume\)\}/.test(PB), "the waits card's resumes-at lines"]);
    c.push(["the step panel's wait line names the step by haltLabel() (\"⏸ Held still at Correction: …\"), its heading the step's title as before", /if\(k==="halted"\)\{ h\+=`<p class="sp-wait">⏸ Held still at \$\{esc\(S\?haltLabel\(S,runCtx\(R\)\):"its step"\)\}/.test(PB) && /title=stepTitle\(S,runCtx\(R\)\);/.test(PB) && /⇧ Escalated from \$\{esc\(S\?title:"its step"\)\}/.test(PB), "stepPanel()"]);
  });

  guard("the feature probe (halt-fix-step): issue and tracking boards only", c => {
    const miss = F.probe(PB, "plan-board").filter(m => m.id === "halt-fix-step");
    c.push(["the issue-board template has it", !miss.length, js(miss.map(F.line))]);
    const oldTpl = PB.replace(/Held still at \$\{esc\(S\?haltLabel\(S,runCtx\(R\)\):"its step"\)\}/, 'Held still at ${esc(S?title:"its step")}');
    const m = F.probe(oldTpl, "plan-board").find(x => x.id === "halt-fix-step");
    c.push(["the probe misses it on a template whose step panel names the halt's fix step with its pass (FEATURE MISSING, since dashboards-skill/50)", oldTpl !== PB && !!m && /FEATURE MISSING: a halt during a fix step/.test(F.line(m)) && /dashboards-skill\/50/.test(F.line(m)), m ? F.line(m) : "not missed"]);
    const f = F.FEATURES.find(x => x.id === "halt-fix-step") || {};
    c.push(["it applies to issue and tracking boards only, each other type with its reason", js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f.notFor && f.notFor[k] && F.applicable(k).every(x => x.id !== "halt-fix-step")), js(f.notFor || null)]);
    if (keep.halted) {
      const ok = run(CHECK, [keep.halted.dir, "--auto"]);
      c.push(["check.js --auto passes the halted board in flight made from the template", ok.status === 0 && !/FEATURE MISSING[^\n]*fix step/.test(ok.stdout + ok.stderr), (ok.stdout + ok.stderr).slice(-300)]);
      const B = tree("probe-old", keep.halted.plan, oldTpl), bad = run(CHECK, [B.dir, "--auto"]);
      c.push(["…and fails one made from a template without it (FEATURE MISSING)", bad.status !== 0 && /FEATURE MISSING: a halt during a fix step/.test(bad.stdout + bad.stderr), (bad.stdout + bad.stderr).slice(-300)]);
    }
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  /* on its own, the issue-board template counts as under test, as verify-templates.js counts it (deviation.js verified()) */
  if (!process.env.DASHBOARDS_TEMPLATES_UNDER_TEST) { const { sha } = require(sk("system/scripts/deviation.js")); process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify([sha(fs.readFileSync(sk("plan/template/dashboard.html"), "utf8"))]); }
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length; console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
