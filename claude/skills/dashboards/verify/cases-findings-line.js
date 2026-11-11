// The cases of admin-team/dashboards/call-5 (the user's decision of 2026-11-06, "Call 5"; dated 51 in the feature probes), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-findings-line.js [--out <dir>].
// A Quality Review's findings line orders the count, then the severities, then the kinds: "18 findings (2 minor, 16 other; 3 documentation,
// 15 code)". Severities minor, then other (a qa report's own words after them); kinds documentation, test, code; a zero count left out. And
// two defects: a run's step by its name where a line showed its id, the "waiting on you" card's "resumes at" and the chain summary.
// 1. passnames.js findingsWords(): the order and the form, the zero counts left out, a severity-only pass, a qa report's own words.
// 2. apply-event.js: a returned pass's detail and trail entry in the order; check.js finds no older wording on the board.
// 3. The order before it ("18 findings (3 documentation, 15 code; 2 minor, 16 other)") reworded by every rewrite (renamePassText(),
//    renamePasses(), renamePassesIn() as board.js runs it) and found by passRefs() (check.js BOARD WORDING in flight); the new order, a
//    line with no severity, code and an issue's title left as written.
// 4. The template: its names block's findingsWords() equal to passnames.js's; the step panel's Quality Review card and the WIP panel's Pills
//    draw the one line, never "by kind:" / "by severity:" (run outside a browser).
// 5. The two defects: the waiting card's resumeAt() names every step ("Implementation", "Architecture"; a fix step by its route alone);
//    the tracking board's chain summary names its unit's step (stepLabel() with the run's context); the repository work board's chain
//    summary names a fix step by the route board.js records for the unit.
// 6. The feature probes (findings-line, run-step-names): found on the templates, missed on ones without them, each for its types only.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesFindingsLine(X) {
  const { sk, out, targets } = X;
  const PN = require(sk("plan/scripts/passnames.js")), lib = require(sk("plan/scripts/lib.js")), LR = require(sk("system/scripts/levelrefs.js")), F = require(sk("system/scripts/features.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const PB = rd(tp("plan/template/dashboard.html")), WB = rd(tp("plan/template/board.html"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), BOARD = sk("plan/scripts/board.js");
  const sc = path.join(out, "findings-line"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json"))), TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const LINE = "18 findings (2 minor, 16 other; 3 documentation, 15 code)", OLD = "18 findings (3 documentation, 15 code; 2 minor, 16 other)";
  /* the probes the scripts and the template answer alike: [findings, severity, zero, the line] */
  const PROBES = [[{ documentation: 3, test: 0, code: 15 }, { other: 16, minor: 2 }, false, LINE], [{ documentation: 10, test: 8, code: 0 }, null, false, "18 findings (10 documentation, 8 test)"],
    [{ code: 1 }, { minor: 1 }, false, "1 finding (1 minor; 1 code)"], [{ code: 3, test: 1, documentation: 2 }, { other: 0, minor: 6 }, false, "6 findings (6 minor; 2 documentation, 1 test, 3 code)"],
    [{}, { minor: 2, other: 1 }, false, "3 findings (2 minor, 1 other)"], [{ test: 2 }, { major: 1, minor: 1 }, false, "2 findings (1 minor, 1 major; 2 test)"],
    [{ documentation: 0, test: 0, code: 0 }, null, false, ""], [{ documentation: 0, test: 0, code: 0 }, null, true, "0 findings"], [{}, null, true, ""], [null, undefined, false, ""]];

  guard("passnames.js findingsWords(): the count, then the severities, then the kinds, each zero left out", c => {
    const got = PROBES.map(([f, s, z, w]) => [w, PN.findingsWords(f, s, z)]);
    c.push([`the line in the user's form: "${LINE}"`, got[0][1] === LINE, got[0][1]]);
    c.push(["every probe: the kinds documentation, test, code; the severities minor, other, a qa report's own words after them; zeros left out; \"0 findings\" only where asked", got.every(([w, g]) => w === g), js(got.filter(([w, g]) => w !== g))]);
    c.push(["its orders are the decision's (FINDING_KINDS, FINDING_SEVERITIES), and lib.js carries them", js(PN.FINDING_KINDS) === js(["documentation", "test", "code"]) && js(PN.FINDING_SEVERITIES) === js(["minor", "other"]) && lib.findingsWords === PN.findingsWords, js([PN.FINDING_KINDS, PN.FINDING_SEVERITIES, typeof lib.findingsWords])]);
  });

  /* a board in flight at implementation, from the example */
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: "2026-10-26T08:00:00Z", current: ["built"], questions: [], research: null, open: [], qa: [], remediation: null, history: {}, waitingOn: null, resume: null, event: { name: "branch-cut", at: "2026-10-26T08:00:00Z" },
      stages: [{ id: "S1", name: "the parse", state: "done", rows: [] }, { id: "S2", name: "the routing", state: "current", rows: [] }], steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    x.trail = (x.trail || []).filter(t => t && t.column !== "built"); return x; };
  const tree = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/")); fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(`${EXD}/${f}`), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), lib.writeBlock(PB, "plan", JSON.stringify(plan, null, 2) + "\n"));
    const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, folder: plan.folder }; };
  let nreq = 0;
  const evIn = T => (name, at, facts) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--at", at, "--json"]); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { S = { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } return { a, S, p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const last = p => (p.trail || []).slice(-1)[0] || {};
  const old = p => PN.passRefsIn(p, "", [], LR.titleSkip(p));

  guard("apply-event.js: a returned pass's detail and trail entry carry the findings line in the order", c => {
    const T = tree("fast", building()), ev = evIn(T);
    ev("implementation-stage", "2026-10-26T09:00:00Z", { stages: [{ id: "S2", state: "done" }] });
    ev("qa-pass", "2026-10-26T10:00:00Z", { qa: { pass: 1, verdict: "running" } });
    const q = ev("qa-pass", "2026-10-26T11:00:00Z", { qa: { pass: 1, verdict: "changes-requested", doc: 3, code: 15, severity: { other: 16, minor: 2 }, route: "remediation" } });
    c.push(["the detail: \"Quality Review 1: changes requested, " + LINE + "; a Correction, then the next review.\"", q.a.status === 0 && q.p.wip.detail === `Quality Review 1: changes requested, ${LINE}; a Correction, then the next review.`, js([q.S.error, q.p.wip.detail])]);
    c.push(["the trail entry: \"Quality Review 1: changes requested, " + LINE + "\"", last(q.p).label === `Quality Review 1: changes requested, ${LINE}`, last(q.p).label]);
    c.push(["the pass keeps its counts as data, by kind and by severity", js(q.p.wip.qa[0].findings) === js({ documentation: 3, code: 15 }) && js(q.p.wip.qa[0].severity) === js({ other: 16, minor: 2 }), js([q.p.wip.qa[0].findings, q.p.wip.qa[0].severity])]);
    /* the counts by kind nested as facts.qa.findings, as a run may send them (KotlinBottools #23): read as the flat ones, a flat count winning */
    const T2 = tree("fast-nested", building()), ev2 = evIn(T2);
    ev2("implementation-stage", "2026-10-26T09:00:00Z", { stages: [{ id: "S2", state: "done" }] });
    ev2("qa-pass", "2026-10-26T10:00:00Z", { qa: { pass: 1, verdict: "running" } });
    const q2 = ev2("qa-pass", "2026-10-26T11:00:00Z", { qa: { pass: 1, verdict: "CHANGES REQUESTED", findings: { test: 2, code: 3 }, code: 4, severity: { minor: 6, other: 0 }, route: "on-the-spot" } });
    c.push(["nested counts (facts.qa.findings) are kept by kind too, a flat count winning", q2.a.status === 0 && js(q2.p.wip.qa[0].findings) === js({ test: 2, code: 4 }), js([q2.S.error, q2.p.wip.qa[0].findings])]);
    const ck = run(CHECK, [T.dir]);
    c.push(["the board holds no older wording, and check.js finds none (no BOARD WORDING)", !old(q.p).length && !/BOARD WORDING/.test(ck.stdout + ck.stderr), js(old(q.p))]);
  });

  guard("the order before it: reworded by every rewrite, found in flight; the new order, code and a title left as written", c => {
    const want = [[OLD, LINE], [`Quality Review 1: changes requested, ${OLD}; a Correction, then the next review.`, `Quality Review 1: changes requested, ${LINE}; a Correction, then the next review.`],
      ["1 finding (1 code; 1 minor)", "1 finding (1 minor; 1 code)"], ["6 findings (2 documentation, 1 test, 3 code; 6 minor)", "6 findings (6 minor; 2 documentation, 1 test, 3 code)"],
      ["2 findings (2 test; 1 major, 1 minor)", "2 findings (1 minor, 1 major; 2 test)"], ["qa pass 2: 4 findings (1 test, 3 code; 1 other, 3 minor)", "Quality Review 2: 4 findings (3 minor, 1 other; 1 test, 3 code)"]];
    const bad = want.filter(([a, b]) => PN.renamePassText(a) !== b);
    c.push(["renamePassText(): the severities brought before the kinds, each list in its order", !bad.length, js(bad.map(([a, b]) => [a, PN.renamePassText(a), b]))]);
    const found = want.filter(([a]) => !PN.passRefs(a).length).map(x => x[0]), clean = want.filter(([, b]) => PN.passRefs(b).length).map(x => [x[1], PN.passRefs(x[1])]);
    c.push(["passRefs() finds each (check.js BOARD WORDING on a board in flight), and none in the new", !found.length && !clean.length, js([found, clean])]);
    const keepAs = [LINE, "18 findings (10 documentation, 8 test)", "3 findings (2 minor, 1 other)", "`18 findings (3 documentation, 15 code; 2 minor, 16 other)`", "a note on 3 findings (from the review; see below)"];
    const moved = keepAs.filter(s => PN.renamePassText(s) !== s || PN.passRefs(s).length);
    c.push(["the new order, a line with no severity, code and an unrelated parenthesis left as written", !moved.length, js(moved.map(s => [s, PN.renamePassText(s)]))]);
    const plan = { schema: "plan-board/1", issueTitle: `Report ${OLD}`, wip: { step: "remediation", detail: `Quality Review 1: changes requested, ${OLD}.`, qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }], remediation: { pass: 1, route: "remediation", steps: [] } },
      trail: [{ label: `Quality Review 1: changes requested, ${OLD}` }] };
    const p = copy(plan), lines = PN.renamePasses(p), again = PN.renamePasses(p);
    c.push(["renamePasses(): a board's detail and trail entry reworded in place, the issue title it quotes left alone, a second run changing nothing",
      lines.length === 1 && !again.length && p.wip.detail === `Quality Review 1: changes requested, ${LINE}.` && p.trail[0].label === `Quality Review 1: changes requested, ${LINE}` && p.issueTitle === plan.issueTitle, js([lines, p.wip.detail, p.trail[0].label, p.issueTitle])]);
    const board = { rows: [{ issue: 7, title: "a title", detail: `Quality Review 2: changes requested, ${OLD}; a Correction, then the next review.`, qa: [] }] };
    const ch = PN.renamePassesIn(board, LR.titleSkip(board));
    c.push(["renamePassesIn(), as board.js runs it on board.json: a row's detail reworded", ch.length === 1 && board.rows[0].detail === `Quality Review 2: changes requested, ${LINE}; a Correction, then the next review.`, js([ch, board.rows[0].detail])]);
  });

  /* the template's names block, run in a context outside a browser */
  const nb = /\/\* names:begin\b[\s\S]*?\*\/([\s\S]*?)\/\* names:end \*\//;
  const ctxOf = h => { const m = nb.exec(h); if (!m) return null; const ctx = { esc: s => String(s == null ? "" : s) }; vm.createContext(ctx); vm.runInContext(m[1].replace(/^const /gm, "var "), ctx); return ctx; };
  const line = (h, re) => { const m = re.exec(h); if (!m) throw new Error("not in the template: " + re); return m[0]; };

  guard("the template: findingsWords() equal to passnames.js's; the Quality Review card and the WIP panel's Pills draw the one line", c => {
    const N = ctxOf(PB);
    c.push(["the issue-board template's names block defines findingsWords() and its orders", !!N && typeof N.findingsWords === "function" && js(N.FINDING_KINDS) === js(PN.FINDING_KINDS) && js(N.FINDING_SEVERITIES) === js(PN.FINDING_SEVERITIES), N ? js([typeof N.findingsWords, N.FINDING_KINDS, N.FINDING_SEVERITIES]) : "no names block"]);
    if (!N || typeof N.findingsWords !== "function") return;
    const got = PROBES.map(([f, s, z]) => [N.findingsWords(f, s, z), PN.findingsWords(f, s, z)]);
    c.push(["findingsWords() is passnames.js findingsWords() for every probe", got.every(([a, b]) => a === b), js(got.filter(([a, b]) => a !== b))]);
    c.push(["the step panel's Quality Review card draws the line (with \"0 findings\" for a pass that counted none)", /function qaBlock\(p,keys\)\{ const d=QA\[p\.verdict\]\|\|QA\.running, fl=findingsWords\(p\.findings,p\.severity,true\);/.test(PB) && /\$\{fl\?`<small>\$\{esc\(fl\)\}<\/small>`:""\}\$\{rt\?`<small>route:/.test(PB), "qaBlock()"]);
    c.push(["the WIP panel's Quality Review Pills draw the same line", /fl=findingsWords\(p\.findings,p\.severity,true\); return `\$\{pill\(d,"",`\$\{passName\(p\.pass\)\} · \$\{d\.label\}`\)\}\$\{fl\?` <small>\$\{esc\(fl\)\}<\/small>`:""\}/.test(PB), "the WIP panel's facts"]);
    c.push(["no line of the order before it is drawn: no \"by kind:\", \"by severity:\" or \"doc\" for documentation", !/ by kind: /.test(PB) && !/>by severity: /.test(PB) && !/k==="documentation"\?"doc":k/.test(PB), "the template's script"]);
  });

  guard("the two defects: the waiting card's \"resumes at\" and the chain summaries name the step", c => {
    const N = ctxOf(PB);
    if (!N) { c.push(["the issue-board template carries its names block", false, "no names:begin … names:end"]); return; }
    [/^function runCtx\(R\)\{[\s\S]*?\n  return \{route:[^\n]*\}; \}$/m, /^const RUN=.*$/m, /^const runKind=.*$/m, /^const resumeAt=.*$/m].forEach(re => vm.runInContext(line(PB, re).replace(/^const /, "var "), N));
    const R2 = { qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }, { pass: 2, verdict: "changes-requested", route: "re-plan-then-remediation" }], remediation: { pass: 2, route: "re-plan-then-remediation" } };
    const ra = ["implementation", "architecture", "plan", "qa", "document", "remediation"].map(s => [s, N.resumeAt(s, N.runCtx(R2))]);
    c.push(["resumeAt(): \"Implementation\", \"Architecture\", \"Plan\", \"Quality Review\", \"Document\"; a fix step by its route alone, \"Resolution\"", js(ra.map(x => x[1])) === js(["Implementation", "Architecture", "Plan", "Quality Review", "Document", "Resolution"]), js(ra)]);
    c.push(["…and the waiting card writes it for the tracking issue's own halt and each unit's run", /<small>resumes at \$\{esc\(resumeAt\(WIP\.resume,runCtx\(WIP\)\)\)\}<\/small>/.test(PB) && /<small>its run resumes at \$\{esc\(resumeAt\(L\.resume,runCtx\(L\)\)\)\}<\/small>/.test(PB), "the waits card"]);
    vm.runInContext(`var runOf=r=>r.L;\n` + line(PB, /^  const runWord=r=>\{[^\n]*$/m).replace(/^  const /, "var ").replace(/ \/\*[^\n]*\*\/$/, ""), N);
    const rw = [{ L: { step: "remediation", ...R2 } }, { L: { step: "remediation", qa: [{ pass: 1, verdict: "changes-requested", route: "remediation" }], remediation: { pass: 1, route: "remediation" } } }, { L: { step: "plan" } }, { L: { step: "qa" } }, { L: { step: "halted", resume: "remediation" } }, { L: {} }, {}].map(r => N.runWord(r));
    c.push(["the tracking board's chain summary: \"in progress (Resolution of Quality Review 2)\", \"(Correction)\", \"(Plan)\", \"(Quality Review)\", never a step's id", js(rw) === js(["in progress (Resolution of Quality Review 2)", "in progress (Correction)", "in progress (Plan)", "in progress (Quality Review)", "waiting on you", "in progress", "in progress"]), js(rw)]);
    const W = ctxOf(WB);
    if (!W) { c.push(["the work-board template carries its names block", false, "no names block"]); return; }
    vm.runInContext(line(WB, /^const unitRunWord=.*$/m).replace(/^const /, "var "), W);
    const uw = [{ step: "remediation", route: "re-plan-then-remediation" }, { step: "remediation" }, { step: "plan" }, { step: "halted" }, {}].map(u => W.unitRunWord(u));
    c.push(["the repository work board's chain summary: a fix step by the route board.js records, \"in progress (Resolution)\"; \"(Plan)\"", js(uw) === js(["in progress (Resolution)", "in progress (Correction)", "in progress (Plan)", "waiting on you", "in progress"]), js(uw)]);
    /* board.js records the route of a unit at its fix step in the chain's current units */
    const p = copy(TRK), u = p.rows.find(r => r.unit && r.unit.live);
    u.unit.live = { ...u.unit.live, step: "remediation", resume: null, waitingOn: null, qa: [{ pass: 1, verdict: "changes-requested", date: "2026-10-22", findings: { code: 2 }, route: "re-plan-then-remediation" }], remediation: { pass: 1, route: "re-plan-then-remediation", steps: [] } };
    const root = path.join(sc, "wb"), dir = path.join(root, ...p.folder.split("/")); fs.mkdirSync(path.join(root, ".git", "info"), { recursive: true }); wr(path.join(root, ".git", "info", "exclude"), "docs/plans/.live/\n");
    wr(path.join(dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), lib.writeBlock(PB, "plan", JSON.stringify(p, null, 2) + "\n"));
    const b = run(BOARD, ["--root", root, "--no-gh"]); let bj = {}; try { bj = JSON.parse(rd(path.join(root, "docs", "plans", "board.json"))); } catch (e) { bj = { error: String(e.message) }; }
    const row = (bj.rows || []).find(r => r.chain) || {}, cu = ((row.chain || {}).current || []).find(x => x.slug === (u.unit.slug || u.id)) || null;
    c.push(["board.js: the chain's unit at its fix step carries its route (\"re-plan-then-remediation\"), a unit at any other step none", b.status === 0 && !!cu && cu.step === "remediation" && cu.route === "re-plan-then-remediation" && ((row.chain || {}).current || []).filter(x => x.step !== "remediation").every(x => !("route" in x)), js([b.status, (b.stdout || b.stderr || "").slice(-200), cu])]);
  });

  guard("the feature probes (findings-line, run-step-names): found on the templates, missed without them, for their types only", c => {
    const miss = (h, k, id) => F.probe(h, k).find(m => m.id === id);
    c.push(["the issue-board template has both", !miss(PB, "plan-board", "findings-line") && !miss(PB, "plan-board", "run-step-names"), js(F.probe(PB, "plan-board").map(F.line))]);
    c.push(["the work-board template has run-step-names", !miss(WB, "work-board", "run-step-names"), js(F.probe(WB, "work-board").map(F.line))]);
    const oldFl = PB.replace(/fl=findingsWords\(p\.findings,p\.severity,true\);/g, "f=p.findings||{};"), m1 = miss(oldFl, "plan-board", "findings-line");
    c.push(["findings-line is missed on a template that draws the findings without findingsWords() (FEATURE MISSING, since dashboards-skill/51)", oldFl !== PB && !!m1 && /dashboards-skill\/51/.test(F.line(m1)), m1 ? F.line(m1) : "not missed"]);
    const oldRa = PB.replace("const resumeAt=(s,c)=>haltLabel(s,c);", 'const resumeAt=(s,c)=>s==="remediation"?haltLabel(s,c):s;'), m2 = miss(oldRa, "plan-board", "run-step-names");
    c.push(["run-step-names is missed on a template whose resumes-at shows the step's id; halt-fix-step still found on it (dashboards-skill/50 holds)", oldRa !== PB && !!m2 && !miss(oldRa, "plan-board", "halt-fix-step"), m2 ? F.line(m2) : "not missed"]);
    const oldWb = WB.replace("stepLabel(u.step,{route:u.route||null})", "stepLabel(u.step)"), m3 = miss(oldWb, "work-board", "run-step-names");
    c.push(["…and on a work-board template whose chain summary names a fix step without its route", oldWb !== WB && !!m3, m3 ? F.line(m3) : "not missed"]);
    const f1 = F.FEATURES.find(x => x.id === "findings-line") || {}, f2 = F.FEATURES.find(x => x.id === "run-step-names") || {};
    c.push(["findings-line applies to issue and tracking boards only; run-step-names to them and the repository work board; each other type with its reason",
      js(f1.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f1.notFor && f1.notFor[k]) && js(f2.types) === js(["plan-board", "work-board"]) && ["system", "supersystem"].every(k => f2.notFor && f2.notFor[k] && F.applicable(k).every(x => x.id !== "run-step-names")) && f1.since === 51 && f2.since === 51,
      js([f1.types, f1.notFor, f2.types, f2.notFor])]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  /* on its own, the templates count as under test, as verify-templates.js counts them (deviation.js verified()) */
  if (!process.env.DASHBOARDS_TEMPLATES_UNDER_TEST) { const { sha } = require(sk("system/scripts/deviation.js")); process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify(["plan/template/dashboard.html", "plan/template/board.html"].map(f => sha(fs.readFileSync(sk(f), "utf8")))); }
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length; console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
