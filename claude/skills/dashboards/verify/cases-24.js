// The case groups of admin-team/dashboards-skill/24, run by verify-templates.js (it passes its helpers in): the finished steps on a plan
// board's progress strip are clickable. apply-event.js freezes each step's panel facts into wip.history.<step> as the step ends (each
// remediation loop and each qa pass a visit of its own; deterministic, idempotent, the fast path), new.js lays the sizing visit, the
// standing rule freezes a tracking board's own step; check.js holds wip.history to its form; the template shows a finished step's snapshot
// in the step panel (the dot a button, ringed in ink and pressed, the viewing line with "back to now", the selection kept across the live
// redraw), a step with no snapshot reconstructed from what survives (labelled "reconstructed from the history", the template's rule the
// same as lib.js's), a tracking board's unit through its mirror and its own steps in a row of their own, a landed board beside its landing;
// and the feature probe. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases24(X) {
  const { sk, out, targets, dumpDom, chrome, embedJs, checkJs, node, withData } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["the dashboards-skill/24 cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x));
  const run = (js, a) => cp.spawnSync(process.execPath, [js, ...a], { encoding: "utf8" });
  const APPLY = sk("plan/scripts/apply-event.js"), NEW = sk("plan/scripts/new.js");
  const sc = path.join(out, "skill-24"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const T = rd(PB), LIVE = J("verify/fixtures/live-issue.plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), SUB = J("verify/fixtures/sub-issue.plan.json");
  const probeAt = (html, js) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${js} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  const planPage = (name, d, js) => { const dir = path.join(sc, "pages", name), j = JSON.stringify(d, null, 2); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", j)); return wr(path.join(dir, "dashboard.html"), probeAt(withData(T, "plan", j), js)); };
  const view = (f, size) => got(dumpDom(f, "", size || "1920,1080", 6000)) || {};
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const tree = (name, boards) => { const root = path.join(sc, name); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    boards.forEach(d => { const dir = path.join(root, ...d.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), T); });
    boards.slice().reverse().forEach(d => node(embedJs, path.join(root, ...d.folder.split("/")))); return root; };
  const req = (file, o) => wr(file, JSON.stringify({ v: 1, action: "plan-board", ...o }));
  const apply = (root, rq, at) => { const r = cp.spawnSync(process.execPath, [APPLY, "--event", rq, "--worktree", root, "--no-live", "--at", at, "--json"], { encoding: "utf8" }); let s = {}; try { s = JSON.parse((r.stdout || "{}").trim().split(/\r?\n/).pop() || "{}"); } catch (e) { s = { error: (r.stdout || "") + (r.stderr || "") }; } return { status: r.status, s }; };
  const planOf = (root, folder) => JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json")));

  /* A full run through the fast path, on a copy of the live fixture: research ends, a halt inside the plan step, the plan accepted, the
     branch cut, the stages done, qa pass 1 (changes requested, from qa), a remediation loop, qa pass 2 (changes requested, reached from
     remediation), a second loop, the landing and the merge. */
  const base = () => { const d = copy(LIVE); d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; }); return d; };
  const STAGES = st => [{ id: "S1", name: "the rule", state: st[0] }, { id: "S2", name: "the tests", state: st[1] }];
  const RUN = [
    ...(LIVE.wip.questions || []).map(q => ["research-returned", { returned: { question: q.question, findings: `research/${q.question}.md` } }]),
    ["verification-started", {}], ["researched", {}], ["halted", { waitingOn: "Verification case: a decision on the plan." }], ["resumed", {}], ["plan-accepted", {}],
    ["branch-cut", { branch: "fix/issue-70-verification", stages: STAGES(["current", "todo"]) }],
    ["implementation-stage", { stage: "S1", stages: STAGES(["done", "current"]) }], ["implementation-stage", { stage: "S2", stages: STAGES(["done", "done"]) }],
    ["qa-pass", { qa: { pass: 1, verdict: "changes-requested", doc: 2, test: 1, code: 0, route: "rookie-dev" } }],
    ["implementation-stage", { step: "remediation", remediation: { pass: 1, route: "rookie-dev", steps: [{ name: "rookie-dev fixes", state: "done" }] } }],
    ["qa-pass", { qa: { pass: 2, verdict: "changes-requested", doc: 1, route: "on-the-spot" } }],
    ["implementation-stage", { step: "remediation", remediation: { pass: 2, route: "on-the-spot", steps: [{ name: "minor fixes on the spot", state: "done" }] } }],
    ["landing", { pr: 9 }]];
  const at = i => new Date(Date.parse("2026-10-25T09:00:00Z") + i * 600000).toISOString().replace(/\.000Z$/, "Z");
  const playRun = (name, upto) => { const root = tree(name, [base()]), F0 = LIVE.folder, res = [];
    RUN.slice(0, upto == null ? RUN.length : upto).forEach(([ev, facts], i) => res.push([ev, apply(root, req(path.join(sc, `${name}-${i}.json`), { github: LIVE.repo, issue: LIVE.issue, event: ev, folder: F0, facts }), at(i))]));
    return { root, res, plan: planOf(root, F0) }; };
  let RAN = null;

  /* 1. the snapshots, frozen by the fast path */
  guard("finished steps frozen into wip.history by apply-event.js: each step as it ended, each remediation loop and each qa pass apart (dashboards-skill/24)", c => {
    const A = playRun("run"); RAN = A; const H = A.plan.wip.history || {};
    c.push(["every event of the run applies and passes check.js", A.res.every(([, r]) => r.status === 0 && r.s.result === "ok"), JSON.stringify(A.res.filter(([, r]) => r.status !== 0 || r.s.result !== "ok").map(([e, r]) => [e, r.s.result, String(r.s.error || r.s.check || "").slice(0, 160)]))]);
    c.push(["the steps frozen, in visits: sizing (the fixture's), research, plan, branch, implementation, qa twice, remediation twice", JSON.stringify(Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.length]))) === JSON.stringify({ sizing: 1, research: 1, plan: 1, branch: 1, implementation: 1, qa: 2, remediation: 2 }), JSON.stringify(Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.length])))]);
    const R = (H.research || [])[0] || {};
    c.push(["research: ended by researched, to the plan, its questions complete and its phase complete, as they stood", R.endedBy === "researched" && R.to === "plan" && (R.questions || []).length === (LIVE.wip.questions || []).length && R.questions.every(q => q.state === "complete") && R.research && R.research.phase === "complete", JSON.stringify({ endedBy: R.endedBy, to: R.to, q: (R.questions || []).map(q => q.state), phase: R.research && R.research.phase })]);
    const P = (H.plan || [])[0] || {};
    c.push(["a halt inside the plan step is no visit: the plan's one visit began when research ended, and kept its pass though plan-accepted cleared it", P.since === R.ended && P.endedBy === "plan-accepted" && P.plan && P.plan.state === "writing" && !(A.plan.wip.history.halted), JSON.stringify({ since: P.since, researchEnded: R.ended, plan: P.plan })]);
    const B = (H.branch || [])[0] || {}, I = (H.implementation || [])[0] || {};
    c.push(["branch: the branch the step cut; implementation: the stage list as it stood when it ended, every stage done", B.branch === "fix/issue-70-verification" && B.endedBy === "branch-cut" && JSON.stringify((I.stages || []).map(x => x.state)) === JSON.stringify(["done", "done"]) && I.to === "qa", JSON.stringify({ branch: B.branch, stages: (I.stages || []).map(x => x.id + " " + x.state), to: I.to })]);
    const Q = H.qa || [];
    c.push(["qa: pass 1 a visit of qa (since the build ended), pass 2 a visit of its own though the run reached it from remediation (no since)", Q.length === 2 && JSON.stringify(Q.map(v => (v.qa || []).map(p => p.pass))) === "[[1],[2]]" && Q[0].since === I.ended && Q[1].since === null && Q[1].qa[0].verdict === "changes-requested", JSON.stringify(Q.map(v => ({ since: v.since, passes: (v.qa || []).map(p => p.pass + " " + p.verdict) })))]);
    const M = H.remediation || [];
    c.push(["remediation: each loop apart, with the pass it answers, its route and sub-steps; the second does not overwrite the first", M.length === 2 && M[0].remediation.pass === 1 && M[0].remediation.route === "rookie-dev" && (M[0].remediation.steps || [])[0].name === "rookie-dev fixes" && M[1].remediation.pass === 2 && (M[0].qa || [])[0].pass === 1 && (M[1].qa || [])[0].pass === 2, JSON.stringify(M.map(v => ({ pass: v.remediation && v.remediation.pass, route: v.remediation && v.remediation.route, steps: (v.remediation && v.remediation.steps || []).map(s => s.name), qa: (v.qa || []).map(p => p.pass) })))]);
    c.push(["the second loop began when the first ended (the step stayed remediation), and ended at the landing", M.length === 2 && M[1].since === M[0].ended && M[1].endedBy === "landing" && M[1].to === "landing", JSON.stringify(M.map(v => [v.since, v.ended, v.endedBy, v.to]))]);
    c.push(["each visit carries its last event and (but a qa pass reached from another step) its detail; every stamp is the events' own time (--at)", Object.entries(H).flatMap(([k, v]) => v.map(x => [k, x])).filter(([, v]) => v.endedBy !== "sized").every(([k, v]) => v.event && v.event.name && (typeof v.detail === "string" || (k === "qa" && v.since === null))) && Object.values(H).flat().every(v => /^2026-10-25T/.test(v.ended)), JSON.stringify(Object.entries(H).map(([k, v]) => [k, v.map(x => (x.event || {}).name)]))]);
    /* the same event twice changes nothing; the same run replayed gives the same board */
    const last = RUN[RUN.length - 1], again = apply(A.root, req(path.join(sc, "run-again.json"), { github: LIVE.repo, issue: LIVE.issue, event: last[0], folder: LIVE.folder, facts: last[1] }), at(RUN.length - 1));
    c.push(["the same event twice changes nothing: duplicate, wip.history as it was", again.status === 0 && again.s.result === "duplicate" && JSON.stringify(planOf(A.root, LIVE.folder).wip.history) === JSON.stringify(H), JSON.stringify([again.status, again.s.result])]);
    const B2 = playRun("run-replay");
    c.push(["deterministic: the same run replayed on a fresh copy writes the same history", JSON.stringify(B2.plan.wip.history) === JSON.stringify(H), "replayed"]);
    const qd = apply(B2.root, req(path.join(sc, "qa2-again.json"), { github: LIVE.repo, issue: LIVE.issue, event: "qa-pass", folder: LIVE.folder, facts: { qa: { pass: 2, verdict: "changes-requested", doc: 1, route: "on-the-spot" } } }), at(RUN.length + 1));
    c.push(["a qa verdict sent again later freezes no second visit of the same pass", (planOf(B2.root, LIVE.folder).wip.history.qa || []).length === 2, JSON.stringify([qd.status, qd.s.result, (planOf(B2.root, LIVE.folder).wip.history.qa || []).map(v => v.qa.map(p => p.pass))])]);
    const L = apply(A.root, req(path.join(sc, "run-landed.json"), { github: LIVE.repo, issue: LIVE.issue, event: "landed", folder: LIVE.folder, facts: { sha: "abcdef1", pr: 9, date: "2026-10-25" } }), at(RUN.length + 2)), LP = planOf(A.root, LIVE.folder);
    c.push(["landed (every part resolved first, or it stays at the landing): the landing step is frozen once the step moves to landed", L.status === 0 && (LP.wip.step === "landed" ? (LP.wip.history.landing || []).length === 1 : !(LP.wip.history.landing || []).length), JSON.stringify([L.status, LP.wip.step, (LP.wip.history.landing || []).length])]);
    /* the board after the run passes check.js, which reports the snapshots */
    const k = node(checkJs, path.join(A.root, ...LIVE.folder.split("/")));
    c.push(["check.js passes the board and reports the history it keeps", k.status === 0 && /ok\s+history: sizing 1 · research 1 · plan 1 · branch 1 · implementation 1 · qa 2 · remediation 2/.test(k.stdout), (k.stdout || "").split(/\r?\n/).filter(l => /history|FAIL/.test(l)).join(" | ").slice(0, 300)]);
  });

  /* 2. check.js on wip.history */
  guard("check.js holds wip.history to its form: a step a snapshot is kept of, stamps in order, the ending event, each frozen fact's form (dashboards-skill/24)", c => {
    if (!RAN) { c.push(["the run of group 1 is there", false, "group 1 did not run"]); return; }
    const bad = (name, f, re, kind) => { const d = copy(RAN.plan); f(d.wip.history); const root = tree("check-" + name, [d]), k = node(checkJs, path.join(root, ...d.folder.split("/")));
      c.push([`check.js ${kind === "warn" ? "warns on" : "fails"} ${name}`, (kind === "warn" ? k.status === 0 : k.status === 1) && re.test(k.stdout), (k.stdout || "").split(/\r?\n/).filter(l => /history/.test(l)).join(" | ").slice(0, 240)]); };
    bad("a step no snapshot is kept of", H => { H.halted = [{ ended: "2026-10-25T10:00:00Z" }]; }, /FAIL\s+wip\.history\.halted: "halted" is not a step a snapshot is kept of/);
    bad("an ended that is no stamp", H => { H.plan[0].ended = "noon"; }, /FAIL\s+wip\.history\.plan\[0\]\.ended is the ISO date-time the step ended/);
    bad("visits out of order", H => { H.qa.reverse(); }, /FAIL\s+wip\.history\.qa\[1\] ended .* before the visit ahead of it/);
    bad("an ending event that is none", H => { H.branch[0].endedBy = "cut"; }, /FAIL\s+wip\.history\.branch\[0\]\.endedBy is the event that ended the step/);
    bad("a stage list not in its form", H => { H.implementation[0].stages[0].state = "finished"; }, /FAIL\s+wip\.history\.implementation\[0\]\.stages is the stage list as it stood/);
    bad("a key a snapshot of the step does not keep", H => { H.branch[0].stages = []; }, /warn\s+wip\.history\.branch\[0\] holds "stages", which a snapshot of branch does not keep/, "warn");
    bad("two loops answering the same pass", H => { H.remediation[1].remediation.pass = 1; }, /warn\s+wip\.history\.remediation: two visits answer the same qa pass/, "warn");
    const d = copy(LIVE); delete d.wip.history; const root = tree("check-none", [d]), k = node(checkJs, path.join(root, ...d.folder.split("/")));
    c.push(["a board with no history passes, its finished steps reported as reconstructed", k.status === 0 && /ok\s+history: no snapshot \(reconstructed from the history: sizing, interview\)/.test(k.stdout), (k.stdout || "").split(/\r?\n/).filter(l => /history/.test(l)).join(" | ")]);
  });

  /* 3. sizing, laid by new.js and by a board's first sized; a tracking board's own step frozen by the standing rule; the mirror */
  guard("sizing frozen at the run's start (new.js, and sized on a board laid before its run); a tracking board's own step by the standing rule; the unit's mirror carries its history (dashboards-skill/24)", c => {
    const nroot = path.join(sc, "new-root"); fs.mkdirSync(path.join(nroot, "docs", "plans"), { recursive: true });
    const n = run(NEW, ["91", "verification-case", "--root", nroot, "--title", "Verification case", "--function", "Verification case.", "--baseline", "abcdef1", "--date", "2026-10-25", "--repo", "acme/widgets", "--step", "research"]);
    const np = JSON.parse(rd(path.join(nroot, "docs", "plans", "91-verification-case", "plan.json"))), sz = ((np.wip.history || {}).sizing || [])[0] || {};
    c.push(["new.js lays history.sizing: ended at the run's start (plan.sized), by sized, to the step it starts at", n.status === 0 && sz.ended === np.sized && sz.endedBy === "sized" && sz.to === "research", JSON.stringify([n.status, np.wip.history])]);
    const trk = copy(TRK); trk.wip.step = "landing"; trk.wip.current = []; trk.wip.history = {}; trk.rows.forEach(r => { if (r.unit) delete r.unit.live; }); trk.wip.next = (lib.nextUnit(trk) || {}).id || null;
    const troot = tree("standing", [trk]), tdir = path.join(troot, ...TRK.folder.split("/"));
    const bt = run(NEW, ["--batch", TRK.folder, "--root", troot]);
    const nx = trk.rows.find(r => r.id === trk.wip.next), laid = fs.readdirSync(tdir).filter(x => /^\d+-/.test(x) && fs.existsSync(path.join(tdir, x, "plan.json"))).find(x => JSON.parse(rd(path.join(tdir, x, "plan.json"))).issue === (nx && nx.unit.issue));
    c.push(["new.js --batch lays unit boards with an empty history (not started)", bt.status === 0 && !!laid && JSON.stringify(JSON.parse(rd(path.join(tdir, laid, "plan.json"))).wip.history) === "{}", JSON.stringify([bt.status, laid])]);
    if (!laid) return;
    const uf = `${TRK.folder}/${laid}`, a = apply(troot, req(path.join(sc, "unit-sized.json"), { github: TRK.repo, issue: nx.unit.issue, event: "sized", folder: uf, facts: { step: "plan" } }), "2026-10-25T07:00:00Z");
    const up = planOf(troot, uf), tp2 = planOf(troot, TRK.folder), row = tp2.rows.find(r => r.id === nx.id);
    c.push(["sized on a board laid before its run records sizing once, ended by the event", a.status === 0 && JSON.stringify(up.wip.history.sizing) === JSON.stringify([{ since: null, ended: "2026-10-25T07:00:00Z", endedBy: "sized", to: "plan" }]), JSON.stringify([a.status, a.s.result, up.wip.history, String(a.s.error || "").slice(0, 160)])]);
    c.push(["the unit's start ends the tracking board's own landing: frozen into its history by the standing rule", (tp2.wip.history.landing || []).length === 1 && tp2.wip.history.landing[0].to === "implementation" && tp2.wip.history.landing[0].ended === "2026-10-25T07:00:00Z", JSON.stringify(tp2.wip.history)]);
    c.push(["the tracking board's mirror of the unit carries its history (lib.js panelFacts)", !!(row && row.unit.live && row.unit.live.history && row.unit.live.history.sizing), JSON.stringify(row && row.unit.live && Object.keys(row.unit.live))]);
    const b2 = apply(troot, req(path.join(sc, "unit-sized2.json"), { github: TRK.repo, issue: nx.unit.issue, event: "sized", folder: uf, facts: { step: "plan" } }), "2026-10-25T09:00:00Z");
    c.push(["a later sized records no second sizing", b2.status === 0 && planOf(troot, uf).wip.history.sizing.length === 1, JSON.stringify([b2.s.result, planOf(troot, uf).wip.history.sizing.length])]);
  });

  /* 4. reconstruction: the rule, in lib.js */
  guard("a finished step with no snapshot, reconstructed from what survives: the trail's and milestones' step by their leading words, the stages, the qa passes (dashboards-skill/24)", c => {
    const cls = { "Sized; research starts": "sizing", "Run started: sized as one system": "sizing", "Research returned: `x`": "research", "Verification started: 2 findings": "research", "Halted in the plan's verification: waiting": "plan",
      "Halted at the interview: waiting on the user (x)": "interview", "Resumed at research": "research", "Escalated at implementation: waiting": "implementation", "Architecture signed off": "architecture", "3 of 11 units filed as sub-issues": "sub-issues",
      "11 of 11 unit boards created": "boards", "Plan accepted": "plan", "Branch `fix/x` cut; implementation starts at S1": "branch", "S1 done; S2 current: two": "implementation", "QA pass 1: changes requested": "qa", "Remediation for qa pass 1": "remediation",
      "Landing: the admin team merges it in PR #9": "landing", "Landed in PR #9": "landing", "Gap and Considered filled from the parent's research": null, "Issue #63 opened": null };
    const miss = Object.entries(cls).filter(([l, s]) => lib.trailStep(l) !== s);
    c.push(["trailStep(): each label to its step by its leading words, a halt's, a resume's and an escalation's by the step named, others to none", !miss.length, JSON.stringify(miss.map(([l, s]) => [l, s, lib.trailStep(l)]))]);
    const R = lib.reconstructSteps(SUB);
    c.push(["a landed board with no snapshot: every step but landed reconstructed", JSON.stringify(Object.keys(R)) === JSON.stringify(SUB.wip.steps.filter(s => s !== "landed")), JSON.stringify(Object.keys(R))]);
    c.push(["research from its trail entry and its milestone; qa with every pass; remediation with the passes that requested changes", R.research.trail.length === 1 && R.research.milestones.length === 1 && (R.qa.qa || []).length === 2 && (R.remediation.qa || []).every(p => p.verdict === "changes-requested") && R.branch.branch === SUB.branch, JSON.stringify({ rt: R.research.trail.map(t => t.label.slice(0, 30)), rm: R.research.milestones.map(m => m.label), qa: (R.qa.qa || []).length, br: R.branch.branch })]);
    const d = copy(RAN ? RAN.plan : LIVE); delete d.wip.history; const R2 = lib.reconstructSteps(d);
    c.push(["the interview from the questions the board still holds, answered or waiting", (R2.interview.interview || []).length === (LIVE.wip.interview || []).length && (LIVE.wip.interview || []).length > 0, JSON.stringify(R2.interview).slice(0, 200)]);
    const d0 = copy(d); d0.wip.interview = []; const R0 = lib.reconstructSteps(d0);
    c.push(["research questions from the trail: sent, and returned with their findings", RAN ? (R2.research.questions || []).length === (LIVE.wip.questions || []).length && R2.research.questions.every(q => /^research\//.test(q.findings || "")) : false, JSON.stringify(R2.research && R2.research.questions)]);
    c.push(["a step the history says nothing of reconstructs empty (the page says so), with no time", JSON.stringify(R0.interview) === JSON.stringify({ reconstructed: true, ended: null, trail: [], milestones: [] }), JSON.stringify(R0.interview)]);
    const TL = lib.reconstructStep(TRK, "landing");
    c.push(["a tracking board has no plan step: what names its plan (its verdict milestone, \"Plan merged\") is its landing's", TL.milestones.some(m => /^Plan merged/.test(m.label)) && !lib.reconstructStep(TRK, "plan").milestones.length, JSON.stringify(TL.milestones.map(m => m.label))]);
    const mir = lib.unitRun(d);
    c.push(["a unit's mirror carries the reconstruction of its board's finished steps with no snapshot (recon)", !!mir.recon && JSON.stringify(mir.recon) === JSON.stringify(R2), JSON.stringify(Object.keys(mir.recon || {}))]);
  });

  /* 5. the template */
  guard("the template: a finished step's dot a button; a click shows its snapshot in the step panel, ringed in ink, with \"back to now\"; kept across the live redraw; reconstructed where no snapshot (dashboards-skill/24)", c => {
    if (!chrome) { c.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    if (!RAN) { c.push(["the run of group 1 is there", false, "group 1 did not run"]); return; }
    const P = RAN.plan, fin = lib.finishedSteps(P.wip, P.status);
    const PR = `const out={}, B=()=>[...document.querySelectorAll("#wip .stepbtn")], pick=(r,s)=>{ const b=B().find(x=>x.dataset.run===r&&x.dataset.step===s); if(!b) return false; b.click(); return true; }, sp=()=>document.querySelector("#wip .sp.past");
      const col=v=>{ const e=document.createElement("i"); e.style.color=v; document.body.appendChild(e); const c=getComputedStyle(e).color; e.remove(); return c; };
      out.btns=B().map(b=>[b.dataset.run,b.dataset.step,b.tagName,b.type,b.getAttribute("aria-pressed"),b.tabIndex]);
      out.key=[...document.querySelectorAll("#wip > .key > span")].map(s=>s.textContent);`;
    const r1 = view(planPage("snap", P, PR + `
      pick("own","research"); const s1=sp(); out.r={view:s1&&s1.dataset.view,step:s1&&s1.dataset.step,line:s1&&s1.querySelector(".sp-view").textContent,back:!!(s1&&s1.querySelector("button.sp-back")),sel:[...document.querySelectorAll("#wip li.sel")].map(l=>l.textContent),pressed:B().filter(b=>b.getAttribute("aria-pressed")==="true").map(b=>b.dataset.step),focus:document.activeElement&&document.activeElement.dataset.step,shadow:getComputedStyle(document.querySelector("#wip li.sel .dot")).boxShadow,ink:col("var(--ink)"),accent:col("var(--accent)"),keys:[...document.querySelectorAll("#wip > .key > span")].map(s=>s.textContent).filter(t=>/ringed in ink/.test(t)).length,live:!!document.querySelector("#wip .sp:not(.past)")};
      const d=JSON.parse(JSON.stringify(PLAN)); d.wip.updated="2026-10-25T23:00:00Z"; d.wip.detail="Verification case: the live redraw."; dashboardRedraw(d); out.redraw={step:sp()&&sp().dataset.step,focus:document.activeElement&&document.activeElement.dataset.step,detail:document.querySelector("#wip .wip-detail").textContent};
      pick("own","remediation"); out.rem={h4:[...sp().querySelectorAll(".sp-visit>h4")].map(h=>h.textContent),line:sp().querySelector(".sp-view").textContent};
      pick("own","qa"); out.qa={h4:[...sp().querySelectorAll(".sp-visit>h4")].map(h=>h.textContent),passes:sp().querySelectorAll(".sp-pass").length};
      pick("own","qa"); out.again={past:!!sp(),live:!!document.querySelector("#wip .sp:not(.past)")};
      pick("own","plan"); sp().querySelector(".sp-back").click(); out.back={past:!!sp(),focus:document.activeElement&&document.activeElement.dataset.step};
      pick("own","branch"); document.querySelector("#wip").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})); out.esc={past:!!sp()};
      document.body.dataset.r=JSON.stringify(out);`));
    c.push(["every finished step lib.js names is a button (type button, in the Tab order, aria-pressed), and only those", JSON.stringify((r1.btns || []).map(b => b[1])) === JSON.stringify(fin) && (r1.btns || []).every(b => b[0] === "own" && b[2] === "BUTTON" && b[3] === "button" && b[4] === "false" && b[5] === 0), JSON.stringify([fin, r1.btns, r1.err])]);
    c.push(["the strip's legend says a finished step is clicked to see it", (r1.key || []).some(t => /step done: click a finished step to see it in the panel/.test(t)), JSON.stringify(r1.key)]);
    const r = r1.r || {};
    c.push(["a click shows that step's snapshot in the step panel, the live panel out", r.view === "snapshot" && r.step === "research" && !r.live && r.back, JSON.stringify(r)]);
    c.push(["the line above the panel: \"viewing: research · finished <time>\" and the way back", /^viewing: research · finished .+\d{4}.+back to now$/.test(r.line || ""), r.line]);
    c.push(["the clicked dot stays highlighted and pressed, focus on it, and the legend names the mark", JSON.stringify(r.sel) === '["research"]' && JSON.stringify(r.pressed) === '["research"]' && r.focus === "research" && r.keys === 1, JSON.stringify([r.sel, r.pressed, r.focus, r.keys])]);
    c.push(["the highlight is an ink ring, never the accent (it marks the work in progress)", !!r.shadow && r.shadow.includes(r.ink) && !r.shadow.includes(r.accent), JSON.stringify([r.shadow, r.ink, r.accent])]);
    c.push(["the selection survives the live redraw (dashboardRedraw), the focus too", (r1.redraw || {}).step === "research" && (r1.redraw || {}).focus === "research" && /the live redraw/.test((r1.redraw || {}).detail || ""), JSON.stringify(r1.redraw)]);
    c.push(["remediation shows each loop apart; qa each pass apart", JSON.stringify((r1.rem || {}).h4) === JSON.stringify(["Loop 1 · qa pass 1", "Loop 2 · qa pass 2"]) && / · 2 loops/.test((r1.rem || {}).line || "") && JSON.stringify((r1.qa || {}).h4) === JSON.stringify(["Pass 1", "Pass 2"]) && (r1.qa || {}).passes === 2, JSON.stringify([r1.rem, r1.qa])]);
    c.push(["a second click on the dot, \"back to now\" and Escape each return to the current step", (r1.again || {}).live && !(r1.again || {}).past && !(r1.back || {}).past && (r1.back || {}).focus === "plan" && !(r1.esc || {}).past, JSON.stringify([r1.again, r1.back, r1.esc])]);
    /* no snapshot: reconstructed, the template's rule the same as lib.js's */
    const old = copy(P); delete old.wip.history; old.wip.interview = []; const want = lib.reconstructSteps(old);
    const r2 = view(planPage("recon", old, PR + `
      out.recon=Object.fromEntries(finishedOf(WIP,PLAN.status).map(s=>[s,reconStep(PLAN,s)]));
      pick("own","research"); const s=sp(); out.r={view:s&&s.dataset.view,line:s&&s.querySelector(".sp-view").textContent,links:[...s.querySelectorAll("a")].map(a=>a.getAttribute("href")).filter(h=>/research\\//.test(h)),text:s.innerText.slice(0,200)};
      pick("own","interview"); out.i=sp().innerText;
      document.body.dataset.r=JSON.stringify(out);`));
    c.push(["no snapshot: the template reconstructs every finished step exactly as lib.js does", JSON.stringify(r2.recon) === JSON.stringify(want), JSON.stringify(Object.keys(r2.recon || {})) + " " + JSON.stringify(r2.err || "")]);
    c.push(["the reduced panel is labelled \"reconstructed from the history\" and links the findings the trail names", (r2.r || {}).view === "reconstructed" && /reconstructed from the history/.test((r2.r || {}).line || "") && ((r2.r || {}).links || []).length >= (LIVE.wip.questions || []).length, JSON.stringify(r2.r)]);
    c.push(["a step the history records nothing of says so", /The history records nothing for this step\./.test(r2.i || ""), String(r2.i).slice(0, 160)]);
    /* a landed board: every step but landed a button; the step picked beside the landing */
    const r3 = view(planPage("landed", SUB, PR + `pick("own","qa"); const s=sp(); out.l={split:document.getElementById("wip").classList.contains("split"),main:!!document.querySelector("#wip .wipmain.landed"),view:s&&s.dataset.view,passes:s?s.querySelectorAll(".sp-pass").length:0}; document.body.dataset.r=JSON.stringify(out);`));
    c.push(["a landed board: every step but landed is a button; the step picked shows beside the landing, reconstructed", JSON.stringify((r3.btns || []).map(b => b[1])) === JSON.stringify(SUB.wip.steps.filter(s => s !== "landed")) && (r3.l || {}).split && (r3.l || {}).main && (r3.l || {}).view === "reconstructed" && (r3.l || {}).passes === 2, JSON.stringify([(r3.btns || []).map(b => b[1]), r3.l, r3.err])]);
    /* the phone width: no horizontal page scroll with a finished step shown */
    const r4 = view(planPage("narrow", P, PR + `pick("own","remediation"); out.n={sw:document.scrollingElement.scrollWidth,w:innerWidth,past:!!sp()}; document.body.dataset.r=JSON.stringify(out);`), "520,900");
    c.push(["at 520 px a finished step's panel causes no horizontal page scroll", (r4.n || {}).past && (r4.n || {}).sw <= (r4.n || {}).w, JSON.stringify(r4.n)]);
  });

  /* 6. tracking boards: the unit's steps through its mirror, the board's own steps */
  guard("a tracking board: the unit's finished steps through its mirror (unit.live), the board's own in a row of their own beside the phase (dashboards-skill/24)", c => {
    if (!chrome) { c.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const row = TRK.rows.find(r => r.unit && r.unit.live), L = row.unit.live, uf = lib.finishedSteps(L, L.status), of = lib.finishedSteps(TRK.wip, TRK.status);
    const PR = `const out={}, B=()=>[...document.querySelectorAll("#wip .stepbtn")], pick=(r,s)=>{ const b=B().find(x=>x.dataset.run===r&&x.dataset.step===s); if(!b) return false; b.click(); return true; }, sp=()=>document.querySelector("#wip .sp.past"), box=e=>{ const r=e.getBoundingClientRect(); return [Math.round(r.left),Math.round(r.right),Math.round(r.top)]; };
      out.btns=B().map(b=>b.dataset.run+":"+b.dataset.step);
      pick("${row.unit.issue}","plan"); let s=sp(); out.u={view:s&&s.dataset.view,line:s&&s.querySelector(".sp-view").textContent,r:s&&s.style.getPropertyValue("--r"),live:document.querySelectorAll(".wipgrid>.sp:not(.past)").length};
      pick("${row.unit.issue}","research"); s=sp(); out.ur={view:s&&s.dataset.view,text:s&&s.innerText.slice(0,200)};
      pick("own","architecture"); s=sp(); const u=document.querySelector(".wipgrid>.wb.unit"), p=document.querySelector(".wipgrid>.sp:not(.past)");
      out.o={view:s&&s.dataset.view,own:s&&s.classList.contains("own"),r:s&&s.style.getPropertyValue("--r"),ur:u&&u.style.getPropertyValue("--r"),box:s&&box(s),ubox:u&&box(u),pbox:p&&box(p),line:s&&s.querySelector(".sp-view").textContent};
      document.body.dataset.r=JSON.stringify(out);`;
    const r1 = view(planPage("tracking", TRK, PR));
    c.push(["the tracking board's own finished steps and the unit's are buttons, each run's apart", JSON.stringify(r1.btns) === JSON.stringify([...of.map(s => "own:" + s), ...uf.map(s => row.unit.issue + ":" + s)]), JSON.stringify([r1.btns, r1.err])]);
    const u = r1.u || {};
    c.push(["a unit's finished step shows its snapshot in place of the unit's step panel, beside its bubble, named \"#n's\"", u.view === "snapshot" && new RegExp(`^viewing: #${row.unit.issue}'s plan · finished`).test(u.line || "") && u.r === "1" && u.live === 0, JSON.stringify(u)]);
    c.push(["a unit's step with no snapshot reads its mirror's reconstruction", (r1.ur || {}).view === "reconstructed" && /research verified in the parent's run/.test((r1.ur || {}).text || ""), JSON.stringify(r1.ur)]);
    const o = r1.o || {};
    c.push(["the board's own finished step takes a row of its own, first, beside the phase; the unit's row and live panel follow", o.view === "snapshot" && o.own && o.r === "1" && o.ur === "2" && !!o.pbox && /^viewing: architecture · finished/.test(o.line || ""), JSON.stringify(o)]);
    c.push(["from 940 px the own step's panel spans the unit's and the panel's shares", !!o.box && !!o.ubox && !!o.pbox && Math.abs(o.box[0] - o.ubox[0]) <= 2 && Math.abs(o.box[1] - o.pbox[1]) <= 2, JSON.stringify([o.box, o.ubox, o.pbox])]);
  });

  /* 7. the feature probe */
  guard("the feature probe of this run: the template carries it, the template as dashboards-skill/23 left it does not (dashboards-skill/24)", c => {
    const miss = F.probe(T, "plan-board").filter(m => m.id === "finished-steps");
    c.push(["the plan-board template carries \"finished-steps\"", !miss.length, miss.map(F.line).join(" | ")]);
    /* the recorded version, from verify/history/ or rebuilt from the mirror's git history (system/scripts/history.js) */
    const old = require(sk("system/scripts/history.js")).readVersion(sk("plan/template/dashboard.html"), x => /dashboards-skill\/23/.test(x.note || ""), { historyRepo: X.historyRepo });
    c.push(["the template as dashboards-skill/23 left it misses it, named with its step", !!old && F.probe(old, "plan-board").some(m => m.id === "finished-steps" && m.since === "dashboards-skill/24"), old ? F.probe(old, "plan-board").map(m => m.id).join(", ") : "no recorded history"]);
    const f = F.FEATURES.find(x => x.id === "finished-steps");
    c.push(["it fits the plan boards only, with the reason for each type it does not", !!f && JSON.stringify(f.types) === '["plan-board"]' && ["system", "supersystem", "work-board"].every(k => f.notFor && /no progress strip/.test(f.notFor[k])), JSON.stringify(f && f.notFor)]);
  });
  return groups;
};
