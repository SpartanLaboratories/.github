// The cases of admin-team/presenter/researched-no-research (2026-11-13), run by verify-templates.js (it passes its helpers in), or on its own with no
// browser: node verify/cases-researched-nothing.js [--out <dir>].
// A. A researched that names no documents, on a board with no research question, says there was nothing to research (the user's decision of
//    2026-11-13, batch-4/q-2 (a)): the board moves to the plan at the event's time, records wip.research.nothing, words its detail and trail
//    "Nothing to research", asks for no enrichment from research documents, and the step Panel and the visit's gist say so (plan/RULES.md §4).
// B1. A re-pass standing at the plan step is kept by a researched, never overwritten by "writing".
// B2. The placeholder check reads neither a statement's excerpt nor a code span: a quoted path pattern, docs/plans/<issue>-<slug>/, is no leftover.
// B3. sub-issues-filed leaves a true summary on each filed unit whose run has not started; a summary the presenter wrote is kept.
// B4. No template class names an element's kind without its type word (TERM CLASS): .wip-panel, .unit-card, .dep-item.
// B5. A small fix's steps line has no research step: STEPS_BY_LEVEL, its sized at plan (one naming research refused), every research event refused,
//     its gap milestone counted under the plan, its Timeline naming no research, new.js laying it at plan.
// Each group returns [title, cases].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesResearchedNothing(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["a researched with nothing to research (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), NEW = sk("plan/scripts/new.js");
  const lib = require(sk("plan/scripts/lib.js")), TR = require(sk("system/scripts/termrefs.js"));
  const sc = path.join(out, "researched-nothing"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const T = m => `2026-11-13T10:${String(m).padStart(2, "0")}:00Z`;
  const root0 = () => { const r = path.join(sc, `t-${++n}`); fs.mkdirSync(path.join(r, "docs", "plans"), { recursive: true }); return r; };
  const req = (folder, event, facts, extra) => wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", event, folder, ...(extra || {}), facts }));
  const at = (root, folder) => path.join(root, ...folder.split("/"), "plan.json");
  const ev = (root, folder, event, facts, when, extra) => { const have = at(root, folder), github = fs.existsSync(have) ? JSON.parse(rd(have)).repo : "acme/widgets";
    const a = run(APPLY, ["--event", req(folder, event, facts, { github, ...(extra || {}) }), "--worktree", root, "--no-gh", "--no-live", "--at", when, "--json"], { env });
    return { a, S: parse(a), p: fs.existsSync(have) ? JSON.parse(rd(have)) : null }; };
  const put = (root, plan) => { const dir = path.join(root, ...plan.folder.split("/")), t = JSON.stringify(plan, null, 2) + "\n";
    wr(path.join(dir, "plan.json"), t); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", t)); wr(path.join(dir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", t)); return dir; };
  const enrichOf = S => js([S.enrich, S.why]);
  /* a small feature laid at research, its Rows written, as the fill leaves it after sized */
  const feature = (root, folder, extra) => { const L = ev(root, folder, "sized", { step: "research", baseline: "abc1234" }, T(1), { grade: 3, ...(extra || {}) });
    const p = L.p; p.function = "Verification case: the run adds an option."; delete p.foundation;
    p.rows = [{ id: "opt", name: "The option", system: (p.systems[0] || {}).slug || "x", where: "src/Main.kt", gap: { summary: "No option for it.", evidence: "`src/Main.kt:12`" }, options: [], verdict: null, asBuilt: { state: "pending" } }];
    put(root, p); return L; };

  guard("A. researched with no documents: nothing to research, the plan at the event's time, no enrichment from research documents", c => {
    const r = root0(), F = "docs/plans/90-nothing", L = feature(r, F);
    c.push(["the case's board is laid at research", L.a.status === 0 && L.p.wip.step === "research", js([L.S.error, L.p && L.p.wip.step])]);
    const E = ev(r, F, "researched", { step: "plan", detail: "No decision needs evidence from outside the code." }, T(9)), p = E.p || { wip: {} }, w = p.wip;
    c.push(["it applies and moves the board to the plan at the event's time", E.a.status === 0 && w.step === "plan" && w.since === T(9), js([E.S.error, w.step, w.since])]);
    c.push(["wip.research records nothing to research, its phase complete", w.research && w.research.nothing === true && w.research.phase === "complete" && w.research.since.complete === T(9), js(w.research)]);
    const tr = (p.trail || []).slice(-1)[0] || {};
    c.push(["its trail entry says nothing to research, with no reference, under the research step", /^Nothing to research; the plan next$/.test(tr.label || "") && !tr.ref && lib.trailStep(tr.label) === "research", js(tr)]);
    c.push(["the run's own detail is kept", w.detail === "No decision needs evidence from outside the code.", js(w.detail)]);
    c.push(["no enrichment from research documents that do not exist", !/research\/README\.md/.test(enrichOf(E.S)), enrichOf(E.S)]);
    c.push(["the plan step opens writing", w.plan && w.plan.state === "writing", js(w.plan)]);
    const V = ((w.history || {}).research || [])[0] || {};
    c.push(["the research visit is frozen from the sizing to the event, holding nothing to research", V.since === T(1) && V.ended === T(9) && V.endedBy === "researched" && V.research && V.research.nothing === true, js(V)]);
    const ck = run(CHECK, [path.join(r, ...F.split("/"))], { env });
    c.push(["check.js passes it, with no research warning", ck.status === 0 && !/wip\.research/.test(ck.stdout), (ck.stdout || "").split(/\r?\n/).filter(l => /^(FAIL|warn)/.test(l)).join(" | ").slice(0, 400)]);
    const E0 = ev(r, F, "researched", { step: "plan" }, T(10));
    c.push(["the same event again changes nothing more", E0.a.status === 0 && E0.p.wip.since === T(9) && (E0.p.trail || []).filter(x => /^Nothing to research/.test(x.label)).length === 1, js([E0.S.result, E0.p.wip.since])]);
    /* the detail when the run gives none */
    const r2 = root0(), F2 = "docs/plans/91-nothing-plain"; feature(r2, F2); const E2 = ev(r2, F2, "researched", { step: "plan" }, T(9));
    c.push(["with no detail of its own, the detail says nothing to research", E2.a.status === 0 && E2.p.wip.detail === "Nothing to research; the plan next.", js(E2.p && E2.p.wip.detail)]);
    /* the template: the step Panel's research view, and the visit's gist */
    const tpl = rd(PB);
    c.push(["the template's research panel says nothing to research, with no research StepBar, when nothing is recorded", /if\(Rs\.nothing===true&&!qs\.length\) return `<p class="sp-sum">Nothing to research: /.test(tpl), "PANEL.research"]);
    c.push(["…and the visit's gist reads \"nothing to research\"", /V\.research&&V\.research\.nothing===true&&!questionsOf\(V\)\.length\?"nothing to research"/.test(tpl), "visitGist"]);
    c.push(["…and its trail-step map reads the entry as the research step's, as lib.js does", /\[\/\^\(research\|verification\|findings\|nothing to research\)\/i,"research"\]/.test(tpl), "TRAIL_STEP_RE"]);
  });

  guard("A. researched with documents, or with questions recorded, is the research's end as before", c => {
    const r = root0(), F = "docs/plans/92-research"; feature(r, F);
    ev(r, F, "research-started", { researching: [{ question: "the-option", rows: ["opt"] }] }, T(2));
    wr(path.join(r, ...F.split("/"), "research", "the-option.md"), "# The option\n\nFindings.\n");
    ev(r, F, "research-returned", { returned: { question: "the-option", findings: `${F}/research/the-option.md` } }, T(3));
    wr(path.join(r, ...F.split("/"), "research", "README.md"), "# Research\n\nSummary.\n");
    const E = ev(r, F, "researched", { step: "plan", documents: [`${F}/research/README.md`] }, T(5)), w = (E.p || {}).wip || {};
    const tr = ((E.p || {}).trail || []).slice(-1)[0] || {};
    c.push(["research verified: no nothing mark, the trail \"Research verified\" with its README", E.a.status === 0 && w.research && w.research.nothing === undefined && /^Research verified; the plan next$/.test(tr.label || "") && tr.ref === "research/README.md", js([E.S.error, w.research, tr])]);
    c.push(["…and the Gap still comes from the research documents (enrich)", /research\/README\.md and the findings/.test(enrichOf(E.S)), enrichOf(E.S)]);
    const r2 = root0(), F2 = "docs/plans/93-questions-no-docs"; feature(r2, F2);
    ev(r2, F2, "research-started", { researching: [{ question: "q-one", rows: ["opt"] }] }, T(2));
    const E2 = ev(r2, F2, "researched", { step: "plan" }, T(5));
    c.push(["questions recorded and no documents named: the research's end, never \"nothing to research\"", E2.a.status === 0 && !(E2.p.wip.research || {}).nothing && /^Research verified/.test(((E2.p.trail || []).slice(-1)[0] || {}).label || ""), js(E2.p && E2.p.wip.research)]);
  });

  guard("B1. a re-pass standing at the plan step is kept by researched", c => {
    const r = root0(), F = "docs/plans/94-repass"; feature(r, F);
    const p = JSON.parse(rd(at(r, F))); p.wip.plan = { state: "re-pass", from: "existing", against: "main", since: T(1) }; put(r, p);
    const E = ev(r, F, "researched", { step: "plan" }, T(6));
    c.push(["a re-pass verifying the existing plan stays a re-pass", E.a.status === 0 && js(E.p.wip.plan) === js({ state: "re-pass", from: "existing", against: "main", since: T(1) }), js([E.S.error, E.p && E.p.wip.plan])]);
    const r2 = root0(), F2 = "docs/plans/95-writing"; feature(r2, F2);
    const E2 = ev(r2, F2, "researched", { step: "plan" }, T(6));
    c.push(["with no pass standing, the plan step opens writing", E2.a.status === 0 && E2.p.wip.plan && E2.p.wip.plan.state === "writing" && E2.p.wip.plan.since === T(6), js(E2.p && E2.p.wip.plan)]);
  });

  guard("B2. the placeholder check reads neither a statement's excerpt nor a code span", c => {
    const r = root0(), p = copy(EX), s0 = p.rows[0].verdict.statements[0];
    s0.excerpt = { ...s0.excerpt, paragraph: "Each issue keeps its folder at docs/plans/<issue>-<slug>/, inside its parent's." };
    p.rows[0].verdict.statements[1].text = "The folder is `docs/plans/<number>-<slug>/`, as the layout says.";
    const d = put(r, p), ck = run(CHECK, [d], { env });
    c.push(["a path pattern quoted in an excerpt and in a code span is no placeholder", !/placeholders left/.test(ck.stdout || ""), (ck.stdout || "").split(/\r?\n/).filter(l => /placeholder/.test(l)).join(" | ").slice(0, 300)]);
    const r2 = root0(), q = copy(EX); q.title = "<short name of the change>"; q.rows[0].name = "Rows for docs/plans/<issue>-<slug>"; const d2 = put(r2, q), ck2 = run(CHECK, [d2], { env });
    c.push(["a placeholder left in the data still fails, a whole value or a named one outside quotes", ck2.status === 1 && /FAIL\s+placeholders left from the template: title, rows\[0\]\.name/.test(ck2.stdout || ""), (ck2.stdout || "").split(/\r?\n/).filter(l => /placeholder/.test(l)).join(" | ").slice(0, 300)]);
    const tpl = J("plan/template/plan.json"), r3 = root0(); tpl.folder = "docs/plans/96-tpl"; tpl.slug = "96-tpl"; tpl.issue = 96; const d3 = put(r3, tpl), ck3 = run(CHECK, [d3], { env });
    c.push(["the template's own skeleton still fails as placeholders", ck3.status === 1 && /placeholders left from the template/.test(ck3.stdout || ""), (ck3.stdout || "").split(/\r?\n/).filter(l => /placeholder/.test(l)).join(" | ").slice(0, 300)]);
  });

  guard("B3. sub-issues-filed leaves a true summary on each filed unit whose run has not started", c => {
    const units = p => p.rows.filter(r => r.unit);
    const unfiled = () => { const p = copy(TRK); const nOf = {}; units(p).forEach(r => { nOf[r.unit.issue] = r.unit.n; });
      units(p).forEach(r => { r.unit.board = null; r.unit.folder = null; r.unit.blockedBy = (r.unit.blockedBy || []).map(i => nOf[i] ? { unit: nOf[i] } : i); r.unit.issue = null; delete r.unit.live; delete r.unit.tests; r.asBuilt = { state: "pending", summary: "Not filed yet: it is filed as a sub-issue once this design lands." }; });
      Object.assign(p, { status: "planned", asBuilt: null }); if (p.impact) p.impact.basis = "plan";
      Object.assign(p.wip, { step: "merge", since: T(1), updated: T(1), current: [], next: units(p)[0].id, landing: null, steps: lib.STEPS_BY_LEVEL[4].slice(), history: {}, qa: [], stages: [], questions: [], research: null, plan: null, waitingOn: null, resume: null, event: { name: "merge", at: T(1) } }); return p; };
    const r = root0(), p0 = unfiled(), d = put(r, p0), U = units(p0);
    const all = U.map((u, i) => ({ unit: u.id, issue: 100 + i }));
    const E = ev(r, p0.folder, "sub-issues-filed", { units: all.slice(0, 2) }, T(5), {}), u1 = E.p ? units(E.p) : [];
    const want0 = "Filed as #100; its run has not started. It starts first.";
    c.push(["the first unit, up next with no blocker: \"Filed as #100; its run has not started. It starts first.\"", E.a.status === 0 && (u1[0].asBuilt || {}).summary === want0, js([E.S.error, u1[0] && u1[0].asBuilt])]);
    const b1 = (u1[1] || { unit: {} }).unit.blockedBy || [], w1 = (u1[1] || {}).asBuilt || {};
    c.push(["the second unit names its blockers as they stand", E.a.status === 0 && w1.summary === lib.filedSummary(E.p, u1[1]) && /^Filed as #101; its run has not started\. (?:It starts once .+ ha(?:s|ve) landed|It starts first|No other unit blocks it)\.$/.test(w1.summary || ""), js([b1, w1.summary])]);
    c.push(["a unit not filed yet keeps its summary", E.a.status === 0 && /^Not filed yet/.test((u1[2] || {}).asBuilt.summary || ""), js(u1[2] && u1[2].asBuilt)]);
    /* the presenter's summary, naming a blocker in words, is kept; the event's own is brought up as the blockers are filed */
    const p1 = JSON.parse(rd(at(r, p0.folder))); units(p1)[0].asBuilt.summary = "Filed as #100; its run has not started. It starts first, before the tools."; put(r, p1);
    const E2 = ev(r, p0.folder, "sub-issues-filed", { units: all.slice(2), final: true }, T(6)), u2 = E2.p ? units(E2.p) : [];
    c.push(["a summary written otherwise is kept", E2.a.status === 0 && u2[0].asBuilt.summary === "Filed as #100; its run has not started. It starts first, before the tools.", js(u2[0] && u2[0].asBuilt)]);
    c.push(["every filed unit reads as filed after the final event", E2.a.status === 0 && u2.every(x => /^Filed as #\d+; its run has not started\./.test(x.asBuilt.summary)), js(u2.map(x => x.asBuilt.summary))]);
    c.push(["…each by its blockers' issue numbers once filed", E2.a.status === 0 && u2.slice(1).every(x => x.asBuilt.summary === lib.filedSummary(E2.p, x) && !/unit \d/.test(x.asBuilt.summary)), js(u2.map(x => [x.unit.blockedBy, x.asBuilt.summary]))]);
    const ck = run(CHECK, [d], { env });
    c.push(["check.js: no UNIT SUMMARY STALE once filed", !/UNIT SUMMARY STALE/.test(ck.stdout || ""), (ck.stdout || "").split(/\r?\n/).filter(l => /STALE/.test(l)).join(" | ")]);
    const p3 = JSON.parse(rd(at(r, p0.folder))); units(p3)[1].asBuilt.summary = "Not filed yet; it starts once the tools have landed."; put(r, p3); const ck3 = run(CHECK, [d], { env });
    c.push(["check.js warns on a filed unit whose summary still says it is not filed", /warn\s+UNIT SUMMARY STALE: rows\[\d+\] \([\w-]+\) is filed as #101/.test(ck3.stdout || ""), (ck3.stdout || "").split(/\r?\n/).filter(l => /STALE/.test(l)).join(" | ")]);
    /* the words */
    const fake = { kind: "tracking", wip: { current: [] }, rows: [{ id: "a", unit: { n: 1, issue: 39, blockedBy: [] }, asBuilt: { state: "pending" } }, { id: "b", unit: { n: 2, issue: 40, blockedBy: [39, { unit: 5 }, 12] }, asBuilt: { state: "pending" } }, { id: "c", unit: { n: 3, issue: 41, blockedBy: [] }, asBuilt: { state: "pending" } }] };
    c.push(["the words: first, several blockers, none and not first", lib.filedSummary(fake, fake.rows[0]) === "Filed as #39; its run has not started. It starts first." && lib.filedSummary(fake, fake.rows[1]) === "Filed as #40; its run has not started. It starts once #39, unit 5 and #12 have landed." && lib.filedSummary(fake, fake.rows[2]) === "Filed as #41; its run has not started. No other unit blocks it.", js(fake.rows.map(x => lib.filedSummary(fake, x)))]);
  });

  guard("B4. no template class names an element's kind without its type word", c => {
    const G = TR.loadGlossary();
    if (!G) { c.push(["the glossary is found", false, "nomenclature/ui.md and boards.md not found"]); return; }
    ["plan/template/dashboard.html", "plan/template/board.html", "plan/template/org-board.html", "system/template/system.html", "system/template/supersystem.html"].forEach(t => {
      const hits = TR.classRefs(rd(sk(t)), G); c.push([`${t}: no TERM CLASS`, !hits.length, js(hits)]); });
    const pb = rd(sk("plan/template/dashboard.html")), wb = rd(sk("plan/template/board.html"));
    c.push(["the WIP Panel keeps .wip beside .wip-panel (the browser check and older readers query .wip); its styles name .wip-panel", /<section class="wip wip-panel" id="wip"/.test(pb) && /w\.className="wip wip-panel";/.test(pb) && /\.wip-panel\{/.test(pb) && !/\.wip[{ .][^\n]*\{/.test((pb.match(/<style\b[^>]*>[\s\S]*?<\/style>/) || [""])[0].replace(/\.wip-panel/g, "")), "classes"]);
    c.push(["the chain's unit Cards are .unit-card", /<g class="unit-card \$\{S\.cls\}/.test(pb) && /\.chainsvg \.unit-card\{cursor:pointer\}/.test(pb) && !/\.chainsvg \.unit(?![-\w])/.test(pb), "classes"]);
    c.push(["a dependency's wrapper is .dep-item, its Pill .dep-pill", /<span class="dep-item">/.test(wb) && /\.dep-item\{/.test(wb) && !/\.dep(?![-\w])/.test(wb), "classes"]);
  });

  guard("B5. a small fix's steps line has no research step", c => {
    c.push(["STEPS_BY_LEVEL[2]: no research, no interview; a small feature's has both", !lib.STEPS_BY_LEVEL[2].includes("research") && !lib.STEPS_BY_LEVEL[2].includes("interview") && ["interview", "research"].every(s => lib.STEPS_BY_LEVEL[3].includes(s)), js(lib.STEPS_BY_LEVEL[2])]);
    const r = root0(), F = "docs/plans/97-a-fix", L = ev(r, F, "sized", { step: "plan", baseline: "abc1234" }, T(1), { grade: 2 });
    c.push(["a small fix sized at plan: laid with its line, at plan", L.a.status === 0 && L.p.wip.step === "plan" && js(L.p.wip.steps) === js(lib.STEPS_BY_LEVEL[2]), js([L.S.error, L.p && L.p.wip.step, L.p && L.p.wip.steps])]);
    const r2 = root0(), F2 = "docs/plans/98-a-fix-at-research", L2 = ev(r2, F2, "sized", { step: "research", baseline: "abc1234" }, T(1), { grade: 2 });
    c.push(["a small fix's sized naming research is refused, and nothing is laid", L2.a.status === 1 && /no research step/.test(L2.S.error || L2.a.stdout || "") && !fs.existsSync(at(r2, F2)), js([L2.a.status, L2.S.error])]);
    ["research-planning", "research-started", "research-returned", "verification-started", "researched"].forEach(e => {
      const facts = e === "research-started" ? { researching: [{ question: "q", rows: [] }] } : e === "research-returned" ? { returned: { question: "q", findings: "research/q.md" } } : e === "researched" ? { step: "plan" } : {};
      const before = rd(at(r, F)), E = ev(r, F, e, facts, T(3));
      c.push([`${e} on a small fix is refused, the board unchanged`, E.a.status === 1 && /no research step/.test(E.S.error || "") && rd(at(r, F)) === before, js([E.a.status, E.S.error])]);
    });
    /* the gap milestone, the Timeline */
    const p = JSON.parse(rd(at(r, F))); p.milestones = [{ date: "2026-11-13", column: "gap", label: "Gap written from the issue" }];
    c.push(["its gap milestone counts under the plan step, as research is not on its line", lib.milestoneStep(p, p.milestones[0]) === "plan", lib.milestoneStep(p, p.milestones[0])]);
    const f3 = copy(p); f3.wip.steps = lib.STEPS_BY_LEVEL[3].slice();
    c.push(["…and under research on a small feature's line, as before", lib.milestoneStep(f3, p.milestones[0]) === "research", lib.milestoneStep(f3, p.milestones[0])]);
    const TL = lib.timelineSteps(p, { now: T(30) });
    c.push(["its Timeline names no research, among the steps or as unrecorded", !(TL.left || []).includes("research") && !/research/.test(lib.timelineLeftOut(TL)), js([TL.left, lib.timelineLeftOut(TL)])]);
    const tpl = rd(PB);
    c.push(["the template counts the gap milestone under the plan on such a line, as lib.js does", /const lineStep=\(P,s\)=>s==="research"&&P&&P\.wip&&Array\.isArray\(P\.wip\.steps\)&&P\.wip\.steps\.length&&!P\.wip\.steps\.includes\("research"\)\?"plan":s;/.test(tpl), "lineStep"]);
    /* new.js */
    const r4 = root0(), nw = run(NEW, ["99", "a-fix", "--root", r4, "--grade", "2", "--repo", "acme/widgets", "--title", "A", "--function", "F.", "--baseline", "abc1234", "--date", "2026-11-13"], { env });
    const np = fs.existsSync(path.join(r4, "docs", "plans", "99-a-fix", "plan.json")) ? JSON.parse(rd(path.join(r4, "docs", "plans", "99-a-fix", "plan.json"))) : null;
    c.push(["new.js lays a small fix at plan by default", nw.status === 0 && np && np.wip.step === "plan" && !np.wip.steps.includes("research"), js([nw.status, nw.stderr, np && np.wip.step])]);
    const r5 = root0(), nw2 = run(NEW, ["99", "a-fix", "--root", r5, "--grade", "2", "--step", "research", "--repo", "acme/widgets", "--title", "A", "--function", "F.", "--baseline", "abc1234", "--date", "2026-11-13"], { env });
    c.push(["…and refuses --step research on it", nw2.status === 2 && /no research step/.test(nw2.stderr || "") && !fs.existsSync(path.join(r5, "docs", "plans", "99-a-fix", "plan.json")), js([nw2.status, nw2.stderr])]);
    const r6 = root0(), nw3 = run(NEW, ["99", "a-feature", "--root", r6, "--grade", "3", "--repo", "acme/widgets", "--title", "A", "--function", "F.", "--baseline", "abc1234", "--date", "2026-11-13"], { env });
    const np3 = fs.existsSync(path.join(r6, "docs", "plans", "99-a-feature", "plan.json")) ? JSON.parse(rd(path.join(r6, "docs", "plans", "99-a-feature", "plan.json"))) : null;
    c.push(["a small feature is still laid at research by default", nw3.status === 0 && np3 && np3.wip.step === "research", js([nw3.status, np3 && np3.wip.step])]);
  });
  guard("fill.js: a row brought onto a planned board with no asBuilt is pending (KotlinBottools #39's first fill)", c => {
    const r = root0(), F = "docs/plans/89-fill", L = ev(r, F, "sized", { step: "plan", baseline: "abc1234" }, T(1), { grade: 3 });
    const sys = ((L.p || {}).systems || [])[0], fields = wr(path.join(sc, "fill-89.json"), js({ function: "Verification case: the run adds an option.",
      rows: [{ id: "opt", name: "The option", system: (sys || {}).slug || "x", where: "src/Main.kt", gap: { summary: "No option for it.", evidence: "`src/Main.kt:12`" } }] }));
    const f = run(sk("plan/scripts/fill.js"), [path.join(r, ...F.split("/")), "--fields", fields, "--json"], { env }), p = JSON.parse(rd(at(r, F)));
    c.push(["the fill merges, the row pending", f.status === 0 && js((p.rows[0] || {}).asBuilt) === js({ state: "pending" }), js([f.status, (f.stdout || f.stderr || "").slice(0, 300), (p.rows[0] || {}).asBuilt])]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  /* run alone, the templates under test count as verified for the scripts the cases run, as verify-templates.js names them (deviation.js verified()) */
  const DV = require(sk("system/scripts/deviation.js"));
  process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify(["plan/template/dashboard.html", "plan/template/board.html", "plan/template/org-board.html"].map(t => DV.verified(sk(t)).hash));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
