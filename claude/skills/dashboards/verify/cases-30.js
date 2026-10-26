// The case groups of admin-team/dashboards-skill/30, run by verify-templates.js (it passes its helpers in), for the repository work board's columns
// and their spread to the other types: the qa passes shown with the pass running (the defect: a pass in progress, recorded only in the
// remediation's current "qa pass n" sub-step or by the run being at qa, was shown nowhere; a unit's passes read from the tracking board's
// own wip, which stays empty), each pass numbered as an ordinal; the board-link and branch columns dropped, the branch in the state cell;
// "Depends on" with each dependency's build state (blocking, clear, pre-built) and locality (local-repository, local-organization,
// local-parent-org, external-<name>), a dependency no rule fits left with none and reported; "Blocks · enables"; check.js on the new
// fields; the issue board's WIP strip and QA tile and a tracking board's unit inspector; and this run's feature probes. Each group returns
// [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases30(X) {
  const { sk, out, targets, dumpDom, inner, withData } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  if (!PB || !WB) return [["the dashboards-skill/30 cases (both plan-set templates under test)", [["both plan-set templates are under test", false, "a repository template set without them skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const text = h => (h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  const run = (f, a, env) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env: { ...process.env, ...(env || {}) } });
  const BOARD = sk("plan/scripts/board.js"), CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js");
  const sc = path.join(out, "skill-30"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  /* 1. the rules in lib.js */
  guard("lib.js: qaShown() with the pass running, ordinal(), depBuild(), depLocality(), holdState() (dashboards-skill/30)", c => {
    const P1 = { pass: 1, verdict: "changes-requested" }, rem = (cur, state) => ({ pass: 1, route: "planner-then-rookie-dev", steps: [{ name: "rookie-dev: the fixes", state: "done" }, { name: cur, state: state || "current" }] });
    const v = w => js(lib.qaShown(w).map(p => `${p.pass}:${p.verdict}`));
    c.push(["#63's case: at qa, the remediation's current sub-step \"qa pass 2\": pass 1 and the 2nd running", v({ step: "qa", qa: [P1], qaMax: 3, remediation: rem("qa pass 2") }) === js(["1:changes-requested", "2:running"]), v({ step: "qa", qa: [P1], qaMax: 3, remediation: rem("qa pass 2") })]);
    c.push(["at qa with no remediation: the pass after the last recorded runs (the first, before any)", v({ step: "qa", qa: [P1] }) === js(["1:changes-requested", "2:running"]) && v({ step: "qa", qa: [] }) === js(["1:running"]), v({ step: "qa", qa: [P1] }) + " " + v({ step: "qa", qa: [] })]);
    c.push(["at remediation whose current sub-step is a qa pass: that pass runs; at another sub-step, none", v({ step: "remediation", qa: [P1], remediation: rem("qa pass 2") }) === js(["1:changes-requested", "2:running"]) && v({ step: "remediation", qa: [P1], remediation: rem("rookie-dev: write the tests") }) === js(["1:changes-requested"]), v({ step: "remediation", qa: [P1], remediation: rem("qa pass 2") })]);
    c.push(["none runs once the run moved on (landing, landed, halted), after an approving pass, or past qaMax", [{ step: "landing", qa: [P1] }, { step: "landed", qa: [P1] }, { step: "halted", resume: "qa", qa: [P1] }].every(w => v(w) === js(["1:changes-requested"])) && v({ step: "qa", qa: [{ pass: 1, verdict: "approved" }] }) === js(["1:approved"]) && v({ step: "qa", qaMax: 1, qa: [P1] }) === js(["1:changes-requested"]), "landing · landed · halted · approved · qaMax"]);
    c.push(["a running pass already recorded is kept, never doubled; passes sorted by number", v({ step: "qa", qa: [{ pass: 2, verdict: "running" }, P1] }) === js(["1:changes-requested", "2:running"]), v({ step: "qa", qa: [{ pass: 2, verdict: "running" }, P1] })]);
    const ords = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 112].map(lib.ordinal).join(" ");
    c.push(["ordinal(): 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 101st 111th 112th", ords === "1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd 101st 111th 112th", ords]);
    const L = (a, b) => lib.depLocality(a, b).locality;
    c.push(["depLocality(): the same repository, another of the organization, the parent organization's, and external-<owner>", L("SpartanLaboratories/WebTools", "SpartanLaboratories/WebTools") === "local-repository" && L("SpartanLaboratories/WebTools", "SpartanLaboratories/KotlinBottools") === "local-organization" && L("SpartanLabsGaming/MyGameServer", "SpartanLaboratories/WebTools") === "local-parent-org" && L("SpartanLabsGaming/MyGameServer", "SpartanLabsGaming/MyGameTools") === "local-organization" && L("SpartanLaboratories/WebTools", "square/okhttp") === "external-square", [L("SpartanLaboratories/WebTools", "SpartanLaboratories/KotlinBottools"), L("SpartanLabsGaming/MyGameServer", "SpartanLaboratories/WebTools"), L("SpartanLaboratories/WebTools", "square/okhttp")].join(" ")]);
    const unfit = lib.depLocality("SpartanLaboratories/WebTools", "SpartanLabsGaming/MyGameTools");
    c.push(["a parent organization's repository depending on a child's fits no locality rule: none, with its reason, never invented", unfit.locality === null && /no locality rule fits/.test(unfit.why || ""), js(unfit)]);
    const B = o => lib.depBuild(o).build;
    c.push(["depBuild(): part of the plan, open blocking and closed clear; not part of it and closed before the plan started, pre-built", B({ inPlan: true, done: false }) === "blocking" && B({ inPlan: true, done: true }) === "clear" && B({ inPlan: false, done: true, closedAt: "2026-10-01T00:00:00Z", planStart: "2026-10-20", tracking: true }) === "pre-built", "blocking · clear · pre-built"]);
    const late = lib.depBuild({ inPlan: false, done: true, closedAt: "2026-11-01", planStart: "2026-10-20", tracking: true }), open = lib.depBuild({ inPlan: false, done: false, tracking: true }), lone = lib.depBuild({ inPlan: false, done: false, tracking: false });
    c.push(["a dependency no build rule fits (closed only after the plan started; not part of the plan and open; no tracking issue and open) has none, with its reason", late.build === null && /only after the plan started/.test(late.why) && open.build === null && /still open/.test(open.why) && lone.build === null && /no tracking issue/.test(lone.why), js([late, open, lone])]);
    c.push(["holdState(): blocks while the issue is open, enables once it is done", lib.holdState(false) === "blocks" && lib.holdState(true) === "enables", "blocks · enables"]);
  });

  /* 2. board.js: a tracking board and a unit's board, the tracker read from a fixture; then the board and check.js */
  const TRK = J("verify/fixtures/tracking.plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json"), REPO = TRK.repo;
  const root = path.join(sc, "tree"), plans = path.join(root, "docs", "plans"), TF = path.join(plans, "55-http-client-stack"), UF = path.join(TF, "63-test-support");
  let wbHtml = "", wbJson = null;
  guard("board.js: the qa pass running, the unit's own run, each dependency's build state and locality, blocks or enables (dashboards-skill/30)", c => {
    const git = (...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd: root, encoding: "utf8" });
    fs.mkdirSync(plans, { recursive: true });
    if (git("init", "-q", "-b", "master").status !== 0) { c.push(["git is available", false, "git init failed"]); return; }
    git("remote", "add", "origin", `https://github.com/${REPO}.git`);
    const trk = copy(TRK); trk.folder = "docs/plans/55-http-client-stack"; trk.wip.current = ["java-floor.built", "test-support.built"];
    const ts = trk.rows.find(r => r.id === "test-support"); ts.unit.folder = "63-test-support/"; ts.unit.board = null;
    const u = copy(LIVE); Object.assign(u, { issue: 63, slug: "63-test-support", folder: "docs/plans/55-http-client-stack/63-test-support", title: "Test support", issueTitle: "Verification case #63", status: "building", branch: "feat/issue-63-test-support", parent: { issue: 55, board: "../dashboard.html" } });
    u.wip = { ...u.wip, step: "qa", current: ["built"], qa: [{ pass: 1, verdict: "changes-requested", findings: { documentation: 3 }, severity: { minor: 2, other: 1 }, route: "planner-then-rookie-dev" }], qaMax: 3,
      remediation: { pass: 1, route: "planner-then-rookie-dev", steps: [{ name: "rookie-dev: the minor fixes", state: "done" }, { name: "planner: rule on the gaps", state: "done" }, { name: "qa pass 2", state: "current" }] }, updated: "2026-10-25T19:58:08Z" };
    wr(path.join(TF, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(UF, "plan.json"), JSON.stringify(u, null, 2) + "\n");
    wr(path.join(TF, "dashboard.html"), rd(PB)); wr(path.join(UF, "dashboard.html"), rd(PB));
    const units = trk.rows.filter(r => r.unit).map(r => r.unit.issue), closed = new Set([61, 62]);
    const node = (n, o) => ({ number: n, title: `Verification case #${n}`, state: closed.has(n) ? "CLOSED" : "OPEN", stateReason: closed.has(n) ? "COMPLETED" : null, closedAt: closed.has(n) ? "2026-10-22T00:00:00Z" : null, repository: { nameWithOwner: REPO }, ...(o || {}) });
    const issues = [55, ...units, 90, 30, 31].map(n => ({ number: n, title: `Verification case #${n}`, state: closed.has(n) || n === 30 || n === 31 ? "CLOSED" : "OPEN", stateReason: closed.has(n) || n === 30 || n === 31 ? "COMPLETED" : null, closedAt: n === 30 ? "2026-10-01T00:00:00Z" : n === 31 ? "2026-12-01T00:00:00Z" : closed.has(n) ? "2026-10-22T00:00:00Z" : null, labels: n === 55 ? [{ name: "type: tracking" }] : n === 30 || n === 31 ? [] : [{ name: "level: 3" }], createdAt: "2026-10-10T00:00:00Z" }));
    const graph = { 55: { number: 55, subIssues: { nodes: units.map(n => node(n)) }, blockedBy: { nodes: [] }, blocking: { nodes: [] } },
      64: { number: 64, parent: { number: 55 }, blockedBy: { nodes: [node(62), node(30, { state: "CLOSED", stateReason: "COMPLETED", closedAt: "2026-10-01T00:00:00Z" })] }, blocking: { nodes: [] } },
      65: { number: 65, parent: { number: 55 }, blockedBy: { nodes: [node(31, { state: "CLOSED", stateReason: "COMPLETED", closedAt: "2026-12-01T00:00:00Z" })] }, blocking: { nodes: [] } },
      66: { number: 66, parent: { number: 55 }, blockedBy: { nodes: [node(3, { state: "OPEN", repository: { nameWithOwner: "SpartanLabsGaming/MyGameTools" } }), node(16, { state: "CLOSED", stateReason: "COMPLETED", closedAt: "2026-09-01T00:00:00Z", repository: { nameWithOwner: "SpartanLaboratories/KotlinBottools" } })] }, blocking: { nodes: [] } },
      90: { number: 90, parent: null, blockedBy: { nodes: [node(5, { state: "OPEN", repository: { nameWithOwner: "square/okhttp" } })] }, blocking: { nodes: [] } } };
    const fx = wr(path.join(sc, "tracker.json"), JSON.stringify({ issues, prs: [], branches: [], graph }));
    const r = run(BOARD, ["--root", root], { DASHBOARDS_TRACKER_FIXTURE: fx });
    c.push(["board.js runs on the fixture tree", r.status === 0, (r.stdout + r.stderr).trim().split(/\r?\n/).slice(-3).join(" | ")]);
    wbJson = JSON.parse(rd(path.join(plans, "board.json"))); wbHtml = path.join(plans, "index.html");
    const row = n => wbJson.rows.find(x => x.issue === n) || {}, dep = (n, m, rp) => (row(n).waitsOn || []).find(x => x.issue === m && (x.repo || null) === (rp || null)) || {};
    c.push(["#63 at qa, the remediation's current sub-step \"qa pass 2\": its row lists the 1st pass and the 2nd running (the defect: the 1st alone)", js((row(63).qa || []).map(p => `${p.pass}:${p.verdict}`)) === js(["1:changes-requested", "2:running"]), js(row(63).qa)]);
    const jf = trk.rows.find(x => x.id === "java-floor"), want = js(lib.qaShown(jf.unit.live));
    c.push(["a unit with no board of its own takes its qa passes from its own run (unit.live), never the tracking board's empty wip.qa", js(row(47).qa) === want && (row(47).step || null) === (jf.unit.live.step || null), js({ row: row(47).qa, live: jf.unit.live.qa, step: row(47).step })]);
    c.push(["a unit's dependency on another unit is part of the plan, in this repository: clear once closed (#63 on #62), blocking while open (#65 on #64, #63)", dep(63, 62).build === "clear" && dep(63, 62).locality === "local-repository" && dep(65, 64).build === "blocking" && dep(65, 63).build === "blocking", js([dep(63, 62), dep(65, 64)])]);
    c.push(["a dependency that is no unit of the tracking issue and was closed before its plan started is pre-built (#64 on #30)", dep(64, 30).build === "pre-built" && dep(64, 30).locality === "local-repository", js(dep(64, 30))]);
    c.push(["one closed only after the plan started fits no build rule: none, with its reason (#65 on #31), and board.js reports it", dep(65, 31).build === null && /only after the plan started/.test(dep(65, 31).why || "") && /dependencies no state rule fits.*#65 depends on #31/.test(r.stdout), js(dep(65, 31))]);
    c.push(["another repository of the organization, closed before the plan: pre-built, local-organization (#66 on KotlinBottools#16)", dep(66, 16, "SpartanLaboratories/KotlinBottools").build === "pre-built" && dep(66, 16, "SpartanLaboratories/KotlinBottools").locality === "local-organization", js(dep(66, 16, "SpartanLaboratories/KotlinBottools"))]);
    c.push(["a child organization's repository (SpartanLabsGaming) as a dependency of the parent's fits no locality rule: none, reported", dep(66, 3, "SpartanLabsGaming/MyGameTools").locality === null && /no locality rule fits/.test(dep(66, 3, "SpartanLabsGaming/MyGameTools").why || "") && /MyGameTools/.test(r.stdout), js(dep(66, 3, "SpartanLabsGaming/MyGameTools"))]);
    c.push(["an issue outside every tracking issue, its dependency open and external: external-square, no build state (reported)", dep(90, 5, "square/okhttp").locality === "external-square" && dep(90, 5, "square/okhttp").build === null, js(dep(90, 5, "square/okhttp"))]);
    const hold = n => (row(n).blocks || []).map(x => `${x.issue}:${x.hold}`).sort();
    c.push(["Blocks · enables: a landed unit enables the units that name it (#61), an open one blocks them (#63)", hold(61).includes("47:enables") && hold(61).includes("62:enables") && hold(63).includes("65:blocks") && hold(63).includes("69:blocks"), js({ 61: hold(61), 63: hold(63) })]);
    const k = run(CHECK, [plans]);
    c.push(["check.js passes the generated work board (build, locality and hold board.js's)", k.status === 0, (k.stdout || "").split(/\r?\n/).filter(l => /^fail/.test(l)).slice(0, 3).join(" | ") || "pass"]);
  });

  /* 3. the work-board page drawn from it */
  guard("the repository work board: no branch or board column, the branch in the state cell, the qa passes as ordinals, the dependency pills and their legend (dashboards-skill/30)", c => {
    if (!wbJson) { c.push(["the board.js group produced a board", false, "no board.json"]); return; }
    const page = path.join(sc, "wb", "index.html"); wr(page, withData(rd(WB), "board", JSON.stringify(wbJson, null, 2)));
    const dom = dumpDom(page); if (dom == null) { c.push(["a headless browser is available", true, "skipped: no browser"]); return; }
    const head = inner(dom, '<thead>', "thead"), ths = [...head.matchAll(/<th>([^<]*)<\/th>/g)].map(m => m[1]);
    c.push(["six columns: Issue, State, Now, QA, Depends on, Blocks · enables (no Branch, no Board)", js(ths) === js(["Issue", "State", "Now", "QA", "Depends on", "Blocks · enables"]), js(ths)]);
    const rowOf = n => { const m = new RegExp(`<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*/issues/${n}"`).exec(dom); return m ? inner(dom.slice(m.index), '<tr class="run[^"]*"[^>]*>', "tr") : ""; };
    const r63 = rowOf(63), cells = [...r63.matchAll(/<td>([\s\S]*?)<\/td>(?=<td>|$)/g)].map(m => m[1]);
    c.push(["#63's state cell shows its branch", /branch <code>feat\/issue-63-test-support<\/code>/.test(r63) && cells.length === 6, text(cells[1] || "").slice(0, 200)]);
    c.push(["#63's QA cell: \"✕ 1st · changes requested\" and \"… 2nd · in progress\"", /1st · changes requested/.test(text(r63)) && /2nd · in progress/.test(text(r63)), text(cells[3] || r63).slice(0, 200)]);
    c.push(["a dependency's pill: its build state and its locality (#63 on #62: ✓ clear ⌂ repo)", /<span class="dep-pill"><span class="vp good"><i aria-hidden="true">✓<\/i>clear<\/span><span class="loc l1"><i aria-hidden="true">⌂<\/i>repo<\/span><\/span>/.test(r63), (inner(r63, '<div class="deps">', "div") || "").slice(0, 300)]);
    const r64 = rowOf(64), r66 = rowOf(66), r90 = rowOf(90);
    c.push(["pre-built neutral, local-organization on the ramp, external with its owner's name", /◼<\/i>pre-built/.test(r64) && /class="vp neutral"/.test(r64) && /<span class="loc l2"><i aria-hidden="true">◇<\/i>org/.test(r66) && /<span class="loc l4"><i aria-hidden="true">↗<\/i>external · square/.test(r90), text(r90).slice(0, 200)]);
    c.push(["a dependency no rule fits draws no state, its reason on hover", /MyGameTools#3[\s\S]{0,80}<span class="dep-pill" title="[^"]*no locality rule fits/.test(r66) || (/MyGameTools#3/.test(r66) && !/MyGameTools#3<\/a> <span class="dep-pill"><span class="vp/.test(r66)), (inner(r66, '<div class="deps">', "div") || "").slice(0, 400)]);
    c.push(["Blocks · enables: #61 → enables, #63 ⊘ blocks", /→<\/i>enables/.test(rowOf(61)) && /⊘<\/i>blocks/.test(r63), "enables · blocks"]);
    const key = inner(dom, '<div class="key" id="runs-key">', "div");
    c.push(["the legend names each build state, locality and hold drawn, and the qa pass running", ["a dependency's build state: part of the plan, still open", "a dependency's build state: part of the plan, landed or closed", "a dependency's build state: not part of the tracking issue", "a dependency's locality: this repository", "a dependency's locality: another repository of this organization", "a dependency's locality: outside both organizations", "this issue is still open: it holds these issues up", "this issue is done: these issues can go ahead", "the qa pass running now", "a dependency with no build state or locality drawn"].every(s => text(key).includes(s)), text(key).slice(0, 600)]);
    c.push(["no legend entry for a state not drawn (parent org)", !/a repository of the parent organization/.test(text(key)), "parent org absent"]);
    /* a board.json written before the rule (no build, locality or hold; qa without the running pass): the board derives what it can */
    const old = copy(wbJson); old.rows.forEach(r => { (r.waitsOn || []).forEach(x => { delete x.build; delete x.locality; delete x.why; }); (r.blocks || []).forEach(x => delete x.hold); if (r.issue === 63) r.qa = r.qa.filter(p => p.verdict !== "running"); });
    const p2 = path.join(sc, "wb-old", "index.html"); wr(p2, withData(rd(WB), "board", JSON.stringify(old, null, 2))); const d2 = dumpDom(p2) || "";
    const o63 = (m => m ? inner(d2.slice(m.index), '<tr class="run[^"]*"[^>]*>', "tr") : "")(/<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*\/issues\/63"/.exec(d2));
    c.push(["an older board.json: the running pass from the row's step, the locality from the entry's repository, the hold from the row", /2nd · in progress/.test(text(o63)) && /⌂<\/i>repo/.test(o63) && /⊘<\/i>blocks/.test(o63) && !/<span class="vp good"><i aria-hidden="true">✓<\/i>clear/.test(o63), text(o63).slice(0, 240)]);
  });

  /* 4. the issue board and the tracking board */
  guard("issue boards: the QA tile and the WIP strip's passes with the one running, as ordinals, the WIP strip's dependencies, a tracking unit's in its inspector (dashboards-skill/30)", c => {
    const u = JSON.parse(rd(path.join(UF, "plan.json")));
    u.wip.blockers = { waitsOn: [{ issue: 62, state: "CLOSED", build: "clear", locality: "local-repository" }, { issue: 5, repo: "square/okhttp", state: "OPEN" }], blocks: [{ issue: 65, state: "OPEN" }] };
    const dir = path.join(sc, "pb"), page = path.join(dir, "dashboard.html"); wr(page, withData(rd(PB), "plan", JSON.stringify(u, null, 2)));
    const dom = dumpDom(page); if (dom == null) { c.push(["a headless browser is available", true, "skipped: no browser"]); return; }
    const kp = text(inner(dom, '<div class="kpis" id="kpis">', "div"));
    c.push(["the QA tile counts the running pass and names each by its ordinal", /QA passes 2 of at most 3/.test(kp) && /1st pass: changes requested · 2nd pass: in progress/.test(kp) && /running/.test(kp), kp.slice(kp.indexOf("QA passes"), kp.indexOf("QA passes") + 160)]);
    const wip = inner(dom, '<section class="wip[^"]*"[^>]*>', "section"), wt = text(wip);
    c.push(["the WIP strip's qa pills: \"1st pass · changes requested\", \"2nd pass · in progress\"", /1st pass · changes requested/.test(wt) && /2nd pass · in progress/.test(wt), wt.slice(wt.indexOf("qa "), wt.indexOf("qa ") + 160)]);
    c.push(["the WIP strip: depends on, each with its pill (✓ clear ⌂ repo; ↗ external · square, no build state recorded), and blocks · enables", /depends on/.test(wt) && /#62 ✓ clear ⌂ repo/.test(wt) && /okhttp#5 ↗ external · square/.test(wt) && /blocks · enables #65 ⊘ blocks/.test(wt), wt.slice(wt.indexOf("depends on"), wt.indexOf("depends on") + 200)]);
    c.push(["…with their legend entries in the strip's legend", /a dependency's build state: part of the plan, landed or closed/.test(wt) && /a dependency's locality: outside both organizations/.test(wt) && /this issue is still open: it holds these issues up/.test(wt), "legend"]);
    /* the tracking board: a unit's dependencies and what it holds up, in its inspector */
    const tdir = path.join(sc, "tb"), tpage = path.join(tdir, "dashboard.html"); wr(tpage, withData(rd(PB), "plan", rd(path.join(TF, "plan.json"))));
    const td = dumpDom(tpage, "call-facades.built") || "", ins = text(inner(td, '<aside class="inspector"[^>]*>', "aside") || td);
    c.push(["a unit's inspector: depends on its units, each ⊘ blocking ⌂ repo while open; blocks · enables the units that name it; their legend", /depends on #67 ⊘ blocking ⌂ repo #66 ⊘ blocking ⌂ repo #65 ⊘ blocking ⌂ repo/.test(ins) && /blocks · enables #69 ⊘ blocks/.test(ins) && /a dependency's build state: part of the plan, still open/.test(ins), (ins.match(/depends on.{0,260}/) || [""])[0]]);
    const td2 = dumpDom(tpage, "http-core.built") || "", ins2 = text(inner(td2, '<aside class="inspector"[^>]*>', "aside") || td2);
    c.push(["…a landed unit it depends on reads ✓ clear (#62 on #61), and a complete one still blocks (#47, qa passed, not merged)", /depends on #61 ✓ clear ⌂ repo #47 ⊘ blocking ⌂ repo/.test(ins2), (ins2.match(/depends on.{0,200}/) || [""])[0]]);
  });

  /* 5. check.js on the new fields */
  guard("check.js holds a dependency's build state, locality and reason, and a row's hold, to board.js's values (dashboards-skill/30)", c => {
    if (!wbJson) { c.push(["the board.js group produced a board", false, "no board.json"]); return; }
    const bad = (name, f, re, warnOnly) => { const d = copy(wbJson); f(d); const dir = path.join(sc, "chk-" + name.replace(/\W+/g, "-").slice(0, 40)); wr(path.join(dir, "board.json"), JSON.stringify(d, null, 2) + "\n"); wr(path.join(dir, "index.html"), withData(rd(WB), "board", JSON.stringify(d, null, 2)));
      cp.spawnSync(process.execPath, [EMBED, dir], { encoding: "utf8" }); const k = run(CHECK, [dir]); const o = k.stdout || "";
      c.push([name, re.test(o) && (warnOnly ? k.status === 0 : k.status !== 0), o.split(/\r?\n/).filter(l => re.test(l)).slice(0, 1).join("") || o.split(/\r?\n/).filter(l => /^(fail|warn)/.test(l)).slice(0, 2).join(" | ")]); };
    const at = (d, n) => d.rows.find(r => r.issue === n);
    bad("a build state that is not one of blocking, clear, pre-built fails", d => { at(d, 63).waitsOn[0].build = "external"; }, /\.build must be blocking \| clear \| pre-built or null/);
    bad("a locality that is not one of the four forms fails", d => { at(d, 63).waitsOn[0].locality = "nearby"; }, /\.locality must be local-repository \| local-organization \| local-parent-org, external-<name> or null/);
    bad("a dependency left with no state and no reason fails", d => { delete at(d, 65).waitsOn.find(x => x.issue === 31).why; }, /a dependency no state rule fits says why/);
    bad("a hold that does not match the row is warned on", d => { at(d, 61).blocks[0].hold = "blocks"; }, /\.hold is blocks, but the issue is done/, true);
  });

  /* 6. the feature probes */
  guard("the feature probes of dashboards-skill/30: the qa passes shown, the dependency pills", c => {
    const pb = rd(PB), wb = rd(WB);
    const miss = (h, k) => F.probe(h, k).map(m => m.id);
    c.push(["both plan-set templates carry both features", !miss(pb, "plan-board").some(x => ["qa-passes-shown", "dependency-pills"].includes(x)) && !miss(wb, "work-board").some(x => ["qa-passes-shown", "dependency-pills"].includes(x)), js([miss(pb, "plan-board"), miss(wb, "work-board")])]);
    const wbOld = wb.replace("<th>Depends on</th><th>Blocks · enables</th>", "<th>Waits on · blocks</th><th>Branch</th><th>Board</th>");
    c.push(["a repository work board with the old columns misses the dependency pills", miss(wbOld, "work-board").includes("dependency-pills"), js(miss(wbOld, "work-board"))]);
    const pbOld = pb.replace("function qaShown(", "function qaShownGone(");
    c.push(["an issue board without qaShown() misses the qa passes shown", miss(pbOld, "plan-board").includes("qa-passes-shown"), js(miss(pbOld, "plan-board"))]);
    const ex = rd(sk("plan/examples/38-handshake-empty-name/dashboard.html"));
    c.push(["the example board (landed, made before) lacks them: reported for a landed board, never re-rendered", miss(ex, "plan-board").includes("dependency-pills"), js(miss(ex, "plan-board"))]);
    c.push(["neither probe applies to the state boards, each with its reason", ["system", "supersystem"].every(k => !F.applicable(k).some(f => ["qa-passes-shown", "dependency-pills"].includes(f.id))) && F.FEATURES.filter(f => ["qa-passes-shown", "dependency-pills"].includes(f.id)).every(f => f.notFor && f.notFor.system && f.notFor.supersystem), "notFor"]);
  });
  return groups;
};
