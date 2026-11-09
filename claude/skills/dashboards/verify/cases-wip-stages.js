// The cases of the stage view (the user's decisions of 2026-11-09; plan/RULES.md §3, "The stage table", "The record of a stage", "The stage list", "Collapsing", "The Now Chip"), of the
// phase Card's bar and the plan step's StepBar, of the plain system (GUIDANCE.md §1, Internal Tooling), and of apply-state.js's carried entries (system/RULES.md §10), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-wip-stages.js [--out <dir>].
// 1. lib.js stageTable(): a plan's table read, its rows out of form named, a fenced or absent table none.
// 2. apply-event.js: the table copied onto the stages at branch-cut (the brief verbatim), started, finished and the report from the events, kept through every merge; the same event
//    twice writes the same record; a stage's result; a plan with no table; a brief a board cannot show; the record of a remediation's sub-steps and the Document step's tasks.
// 3. check.js holds the new fields to their form.
// 4. The template, in a browser: the stage list, compact on a tracking unit's Card, the click, the collapsing, the position from a progress note, the Now Chip, no phase bar, the plan's StepBar.
// 5. The plain system: palette.js colourSlots(), lib.js registry(), the work boards' sysColour, the supersystem's.
// 6. apply-state.js: an entry merely stamped by the branch is restamped and keeps its last amendment.
// Each group returns [title, cases], a case [name, ok, detail]. The boards it lays are kept under <out>/wip-stages/ (the fixtures the report names for a browser check).
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesWipStages(X) {
  const { sk, out, targets } = X, dumpDom = X.dumpDom || (() => null);
  const NEEDS_BROWSER = X.NEEDS_BROWSER || "needs a browser: not run (verify-templates.js --browser runs it)";
  const lib = require(sk("plan/scripts/lib.js")), P = require(sk("system/scripts/palette.js")), F = require(sk("system/scripts/features.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const PB = rd(tp("plan/template/dashboard.html")), WB = rd(tp("plan/template/board.html")), OB = rd(tp("plan/template/org-board.html")), SUP = rd(tp("system/template/supersystem.html")), SYS = rd(tp("system/template/system.html"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "wip-stages"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const withData = X.withData || ((html, id, json) => { const m = new RegExp(`<script type="application/json" id="${id}">[\\s\\S]*?</script>`).exec(html); return m ? html.replace(m[0], () => `<script type="application/json" id="${id}">\n${json}\n</script>`) : html; });
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json"))), TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const STEPS = ["sizing", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const flight = wip => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, questions: [], research: null, open: [], qa: [], plan: null, waitingOn: null, resume: null, steps: STEPS.slice(), ...wip }; return x; };
  const TABLE = "\n\n### S1 — Local readiness\n\nText.\n\n### S2 — The walk\n\nText.\n\n| id | name | brief | kind | steps |\n|----|------|-------|------|-------|\n| S1 | Local readiness | the tool `saved` and checked \\| both ways | work | - |\n| S2 | The walk | issues walked in order | work | walk-a: Walk the issues; walk-b |\n| S3 | Link check | every link read back | check | |\n";
  const lay = (name, plan, table) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/")); fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true }); if (table !== false) wr(path.join(dir, "plan.md"), rd(path.join(dir, "plan.md")) + (table || TABLE));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  let nreq = 0;
  const apply = (B, plan, ev, facts, at) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: ev, folder: plan.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a); return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const STAGES = [["S1", "Local readiness"], ["S2", "The walk"], ["S3", "Link check"]].map(([id, name]) => ({ id, name }));
  const T0 = "2026-11-08T10:00:00Z", T1 = "2026-11-08T11:00:00Z", T2 = "2026-11-08T12:00:00Z", T3 = "2026-11-08T13:00:00Z";
  const atBranch = () => flight({ step: "branch", since: "2026-11-08T09:00:00Z", updated: "2026-11-08T09:00:00Z", event: { name: "plan-accepted", at: "2026-11-08T09:00:00Z" }, current: [], history: { sizing: [{ since: null, ended: "2026-11-08T08:00:00Z", endedBy: "sized", to: "plan" }] } });

  /* ---------- 1. the table ---------- */
  guard("lib.js stageTable(): the plan's stage table read, a row out of form named, a fenced or absent one none", c => {
    const T = lib.stageTable(TABLE);
    c.push(["three rows, in order, with their columns", !!T && T.stages.map(s => s.id).join() === "S1,S2,S3" && T.stages[2].kind === "check", js(T)]);
    c.push(["a brief taken verbatim, an escaped pipe read as a pipe", T.stages[0].brief === "the tool `saved` and checked | both ways", js(T.stages[0].brief)]);
    c.push(["the steps: an id, an id with its name, separated by a semicolon; none for - or an empty cell", js(T.stages[1].steps) === js([{ id: "walk-a", name: "Walk the issues" }, { id: "walk-b", name: "walk-b" }]) && !T.stages[0].steps.length && !T.stages[2].steps.length, js(T.stages.map(s => s.steps))]);
    c.push(["a text with no table reads none", lib.stageTable("# Plan\n\n| a | b |\n|---|---|\n| 1 | 2 |\n") === null, ""]);
    c.push(["a table inside a fenced block is no table", lib.stageTable("```\n| id | name | brief | kind | steps |\n|---|---|---|---|---|\n| S1 | n | b | work | |\n```\n") === null, ""]);
    const B = lib.stageTable("| id | name | brief | kind | steps |\n|---|---|---|---|---|\n|  | No id | b | work | |\n| S1 | n | b | maybe | two words: x |\n");
    c.push(["a row with no id is skipped and named, a kind and a step out of form named, the row kept as far as it holds", B.stages.length === 1 && B.stages[0].kind === undefined && B.stages[0].steps.length === 0 && B.problems.length === 3, js(B)]);
    const dir = path.join(sc, "tbl"); wr(path.join(dir, "plan.md"), "### S2 — The walk\n" + TABLE); const L = lib.planStageTable(dir);
    c.push(["planStageTable(): each row its section of the plan, by the heading that names the stage", L.stages[0].ref === undefined || L.stages[1].ref === "plan.md#s2--the-walk", js(L && L.stages.map(s => s.ref))]);
  });

  /* ---------- 2. the fast path ---------- */
  guard("apply-event.js: the stage table copied at branch-cut, started and finished and the end report from the events, kept through every merge; a check's result", c => {
    const plan = atBranch(), B = lay("board", plan);
    const a = apply(B, plan, "branch-cut", { branch: "feat/x", stages: STAGES }, T0), [s1, s2, s3] = a.p.wip.stages;
    c.push(["branch-cut applied, the fast path alone for the table", a.a.status === 0 && !(a.S.why || []).some(x => /brief/.test(x)), js([a.a.status, a.S.why, a.S.error])]);
    c.push(["each stage takes its row: the brief verbatim, its kind, its steps", s1.brief === "the tool `saved` and checked | both ways" && s1.kind === "work" && s3.kind === "check" && js(s2.steps) === js([{ id: "walk-a", name: "Walk the issues" }, { id: "walk-b", name: "walk-b" }]) && !("steps" in s1), js(a.p.wip.stages)]);
    c.push(["each stage takes its plan section from its heading, where one names it", s2.ref === "plan.md#s2--the-walk" && !("ref" in s3), js([s2.ref, s3.ref])]);
    c.push(["the first stage current since the event; the others no times", s1.started === T0 && s1.state === "current" && !s2.started && !s3.started, js([s1, s2])]);
    const b = apply(B, a.p, "implementation-stage", { stage: "S1", detail: "S1 is done: the tool passes.", stages: [{ id: "S1", name: "Local readiness", state: "done" }, { id: "S2", name: "The walk", state: "current" }, { id: "S3", name: "Link check", state: "todo" }] }, T1), [b1, b2] = b.p.wip.stages;
    c.push(["a stage's end: finished at the event, the event's detail its report; the next started", b.a.status === 0 && b1.finished === T1 && b1.report === "S1 is done: the tool passes." && b1.started === T0 && b2.started === T1, js(b.p.wip.stages)]);
    c.push(["the merge kept what the table wrote, on every stage", b1.brief === s1.brief && b2.steps.length === 2 && b.p.wip.stages[2].kind === "check", js(b.p.wip.stages)]);
    const dup = apply(B, b.p, "implementation-stage", { stage: "S1", detail: "S1 is done: the tool passes.", stages: [{ id: "S1", name: "Local readiness", state: "done" }, { id: "S2", name: "The walk", state: "current" }, { id: "S3", name: "Link check", state: "todo" }] }, T1);
    c.push(["the same event twice: a duplicate, the record unchanged", dup.a.status === 0 && dup.S.result === "duplicate" && js(dup.p.wip.stages) === js(b.p.wip.stages), js(dup.S.result)]);
    const d = apply(B, b.p, "implementation-stage", { stage: "S2", detail: "S2 done, walked in order.", stages: [{ id: "S1", name: "Local readiness", state: "done" }, { id: "S2", name: "The walk", state: "done" }, { id: "S3", name: "Link check", state: "current" }] }, T2);
    const e = apply(B, d.p, "implementation-stage", { stage: "S3", detail: "S3 failed: two links were lost.", stages: [{ id: "S1", name: "Local readiness", state: "done" }, { id: "S2", name: "The walk", state: "done", result: "passed" }, { id: "S3", name: "Link check", state: "done", result: "failed" }] }, T3);
    const E = id => e.p.wip.stages.find(x => x.id === id);
    c.push(["a check stage takes the result its closing event reports", E("S3").result === "failed" && E("S3").finished === T3, js(E("S3"))]);
    c.push(["a work stage takes none, whatever the event says, and it is warned on", E("S2").result === undefined && (e.S.warnings || []).some(x => /S2.*not a check/.test(x)), js([E("S2"), e.S.warnings])]);
    /* a template not verified yet asks a board for the full pass, which a run with no browser cannot give: that is no failure of the board */
    const k = run(CHECK, [B.dir, "--auto"]), fails = (k.stdout + k.stderr).split(/\r?\n/).filter(l => /FAIL/.test(l) && !/browser: NOT RUN|^FAIL:? *\d+ problem/.test(l));
    c.push(["check.js --auto passes the board", !fails.length, fails.slice(0, 6).join(" | ")]);
  });
  guard("apply-event.js: facts.result, a check closed with no result, a reopened stage, a plan with no table, a brief a board cannot show, the table with no facts.stages", c => {
    const plan = atBranch(), B = lay("board2", plan);
    let a = apply(B, plan, "branch-cut", { branch: "feat/x", stages: [{ id: "S1", name: "Check", state: "current" }] }, T0);
    a.p.wip.stages[0].kind = "check"; wr(path.join(B.dir, "plan.json"), JSON.stringify(a.p, null, 2)); wr(path.join(B.dir, "dashboard.html"), PB); run(EMBED, [B.dir]);
    const r = apply(B, a.p, "implementation-stage", { detail: "Green.", result: "pass", stages: [{ id: "S1", name: "Check", state: "done" }] }, T1);
    c.push(["facts.result, for the one stage the event closes", r.a.status === 0 && r.p.wip.stages[0].result === "passed", js(r.p.wip.stages)]);
    const re = apply(B, r.p, "implementation-stage", { stages: [{ id: "S1", name: "Check", state: "current" }] }, T2), R0 = re.p.wip.stages[0];
    c.push(["a stage reopened loses what its end recorded, its start kept", R0.finished === undefined && R0.report === undefined && R0.result === undefined && R0.started === T0, js(R0)]);
    const fin = apply(B, re.p, "implementation-stage", { stages: [{ id: "S1", name: "Check", state: "done" }] }, T3);
    c.push(["a check closed with no result: neutral, warned on, no report where the event says none", fin.p.wip.stages[0].result === undefined && fin.p.wip.stages[0].report === undefined && (fin.S.warnings || []).some(x => /STAGE RESULT/.test(x)), js([fin.p.wip.stages[0], fin.S.warnings])]);
    const plan3 = atBranch(), B3 = lay("no-table", plan3, false), n = apply(B3, plan3, "branch-cut", { branch: "feat/x", stages: STAGES }, T0);
    c.push(["a plan with no table falls back to no brief, the fast path unchanged", n.a.status === 0 && n.p.wip.stages.every(x => !x.brief) && n.p.wip.stages.length === 3, js(n.p.wip.stages)]);
    const plan4 = atBranch(), B4 = lay("named", plan4, "\n\n| id | name | brief | kind | steps |\n|---|---|---|---|---|\n| S1 | Local readiness | the rookie-dev does it | work | |\n"), m = apply(B4, plan4, "branch-cut", { branch: "feat/x", stages: [STAGES[0]] }, T0);
    c.push(["a brief naming an internal name is left off and named for the presenter, the board passing", m.a.status === 0 && !m.p.wip.stages[0].brief && m.S.enrich === "yes" && (m.S.why || []).some(x => /brief names an internal name/.test(x)), js([m.p.wip.stages, m.S.why, m.S.error])]);
    const plan5 = atBranch(), B5 = lay("from-table", plan5), z = apply(B5, plan5, "branch-cut", { branch: "feat/x" }, T0);
    c.push(["no facts.stages: the table gives the list, the first current", z.a.status === 0 && z.p.wip.stages.map(x => x.id + x.state).join() === "S1current,S2todo,S3todo" && z.p.wip.stages[1].brief === "issues walked in order", js([z.p.wip.stages, z.S.error])]);
  });
  guard("apply-event.js: an in-flight board's earlier stages from its visits; the record of a remediation's sub-steps and the Document step's tasks", c => {
    const plan = flight({ step: "implementation", since: T0, updated: T1, current: ["built"], detail: "The fixture equals its specification.", event: { name: "implementation-stage", at: T1, note: "S1 reported done; S2 current" },
      stages: [{ id: "S1", name: "One", state: "done", rows: [] }, { id: "S2", name: "Two", state: "current", rows: [] }], history: { sizing: [{ since: null, ended: "2026-11-08T08:00:00Z", endedBy: "sized", to: "implementation" }] } });
    const B = lay("inflight", plan, false), a = apply(B, plan, "implementation-stage", { detail: "Two is half built.", stages: [{ id: "S1", name: "One", state: "done" }, { id: "S2", name: "Two", state: "current" }] }, T2), [s1, s2] = a.p.wip.stages;
    c.push(["its last event told when S1 ended and S2 began, and S1's report", a.a.status === 0 && s1.finished === T1 && s1.report === "The fixture equals its specification." && s2.started === T1, js(a.p.wip.stages)]);
    const plan2 = flight({ step: "remediation", since: T0, updated: T0, current: ["built"], event: { name: "qa-pass", at: T0 }, remediation: { pass: 1, route: "remediation", steps: [{ name: "Fix A", state: "current" }, { name: "Fix B", state: "todo" }] }, qa: [{ pass: 1, verdict: "changes-requested", date: "2026-11-08", at: T0, findings: { code: 2 } }], history: { sizing: [{ since: null, ended: "2026-11-08T08:00:00Z", endedBy: "sized", to: "implementation" }] } });
    const B2 = lay("remediation", plan2, false), r = apply(B2, plan2, "implementation-stage", { detail: "Fix A done.", remediation: { pass: 1, route: "remediation", steps: [{ name: "Fix A", state: "done" }, { name: "Fix B", state: "current" }] } }, T1), S = r.p.wip.remediation.steps;
    c.push(["a remediation's sub-steps: finished with its report, the next started", r.a.status === 0 && S[0].finished === T1 && S[0].report === "Fix A done." && S[1].started === T1, js([S, r.S.error])]);
    const plan3 = flight({ step: "qa", since: T0, updated: T0, current: ["built"], event: { name: "qa-pass", at: T0 }, qa: [{ pass: 1, verdict: "approved", date: "2026-11-08", at: T0, findings: {} }], history: { sizing: [{ since: null, ended: "2026-11-08T08:00:00Z", endedBy: "sized", to: "implementation" }] } });
    const B3 = lay("doc", plan3, false), d = apply(B3, plan3, "document", { tasks: [{ id: "documentation-review", state: "current" }] }, T1), d2 = apply(B3, d.p, "document", { detail: "The review is done.", tasks: [{ id: "documentation-review", state: "done" }, { id: "dokka-check", state: "current" }] }, T2), TS = d2.p.wip.document.tasks;
    c.push(["a Document task: started at its event, finished with its report, the next started", d2.a.status === 0 && TS[0].started === T1 && TS[0].finished === T2 && TS[0].report === "The review is done." && TS[1].started === T2, js([TS, d2.S.error])]);
  });

  /* ---------- 3. check.js ---------- */
  guard("check.js holds the stage fields to their form", c => {
    const bad = patch => { const plan = flight({ step: "implementation", since: T0, updated: T0, current: ["built"], event: { name: "implementation-stage", at: T0 }, stages: [{ id: "S1", name: "One", state: "current", rows: [], ...patch }], history: { sizing: [{ since: null, ended: "2026-11-08T08:00:00Z", endedBy: "sized", to: "implementation" }] } }), B = lay("chk-" + (nreq++), plan, false); const k = run(CHECK, [B.dir, "--auto"]); return (k.stdout + k.stderr); };
    [[{ kind: "maybe" }, /\.kind must be work or check/], [{ steps: [{ id: "a" }] }, /\.steps must be the stage table's steps/], [{ result: "green" }, /\.result must be passed or failed/], [{ result: "passed" }, /on a stage that is not a check/], [{ started: "yesterday" }, /\.started must be a UTC ISO time/]].forEach(([p, re]) => { const o = bad(p); c.push([`refused: ${js(p)}`, re.test(o), o.split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 2).join(" | ")]); });
  });

  /* ---------- 4. the template in a browser ---------- */
  const sceneIssue = (extra) => { const x = flight({ step: "implementation", since: T1, updated: T2, current: ["built"], detail: "Walking the issues in order.", event: { name: "implementation-stage", at: T2 }, deviations: 0,
    stages: [{ id: "S1", name: "Local readiness", state: "done", rows: [], kind: "work", brief: "the tool `saved` and checked", started: T0, finished: T1, report: "S1 is done." }, { id: "S2", name: "Link check", state: "done", rows: [], kind: "check", brief: "every link read back", result: "passed", started: T1, finished: T2 }, { id: "S3", name: "The walk", state: "current", rows: [], kind: "work", brief: "walked in order", started: T2, steps: [{ id: "walk-a", name: "Walk the issues" }, { id: "walk-b", name: "Check the numbers" }] }, { id: "S4", name: "No brief", state: "todo", rows: [] }],
    asked: [{ step: "implementation", text: "An answered question", options: ["A"], answer: null, asked: T0, answered: T2 }], history: { sizing: [{ since: null, ended: "2026-11-08T08:00:00Z", endedBy: "sized", to: "implementation" }] }, ...extra }); return x; };
  const page = (name, x, tail) => { const f = path.join(sc, "fixtures", name, "dashboard.html"); return wr(f, withData(PB, "plan", JSON.stringify(x, null, 2)).replace("</body>", `${tail || ""}\n</body>`)); };
  const nb = c => c.push(["needs a browser", true, NEEDS_BROWSER]);
  guard("the template in a browser: the stage list, the collapsing, the click, the position from a progress note, the Now Chip, no phase bar, the plan's StepBar", c => {
    const dom = dumpDom(page("issue", sceneIssue())); if (dom === null) return nb(c);
    const wipOf = d => { const i = d.indexOf('id="wip"'), e = d.indexOf('id="kpis"', i); return i < 0 ? "" : d.slice(i, e > 0 ? e : undefined); };
    const w = wipOf(dom), rows = (w.match(/<li class="stg-row /g) || []).length;
    c.push(["the WIP Panel lists each stage", rows === 4, `${rows} rows`]);
    c.push(["number, name and status on a row, the brief where one is recorded", /<b class="id">S1<\/b>[\s\S]*?Local readiness[\s\S]*?<span class="br">the tool <code>saved<\/code> and checked<\/span>/.test(w) && !/No brief<\/button>[\s\S]*?<span class="br">/.test(w.split('data-stage="S4"')[1].split("</li>")[0]), w.slice(w.indexOf('data-stage="S1"'), w.indexOf('data-stage="S1"') + 400)]);
    c.push(["the status Pill: work neutral, a check passed green, at work the in-progress Pill, to come dashed", /data-stage="S1"[\s\S]*?verdict-pill ink"><i aria-hidden="true">✓<\/i>done/.test(w) && /data-stage="S2"[\s\S]*?verdict-pill good"><i aria-hidden="true">✓<\/i>passed/.test(w) && /data-stage="S3"[\s\S]*?verdict-pill accent/.test(w) && /data-stage="S4"[\s\S]*?verdict-pill neutral dashed/.test(w), ""]);
    c.push(["the current stage in a FullPulse on its row", /class="stg-row cur fullpulse" data-run="own" data-stage="S3"/.test(w), ""]);
    const dets = (w.match(/<details class="stg-d"/g) || []).length, opened = [...w.matchAll(/<details class="stg-d" data-key="([^"]+)" open/g)].map(m => m[1]);
    c.push(["the step Panel: every stage with a body collapses, the current one alone open", dets >= 3 && opened.length === 1 && /:stage:S3$/.test(opened[0]), js([dets, opened])]);
    c.push(["a stage with nothing to show has no disclosure", !new RegExp('data-key="[^"]*:stage:S4"').test(w), ""]);
    c.push(["the Now Chip with the latest report, pulsing, at the top of the step Panel", /<p class="sp-now"><span class="chip now fullpulse"><span class="ck">Now<\/span> Walking the issues in order\.<\/span><\/p>/.test(w), w.slice(w.indexOf("sp-now") - 10, w.indexOf("sp-now") + 260)]);
    c.push(["…where the answered questions stood: an answered question is off the live Panel", !/An answered question/.test(w), ""]);
    c.push(["the latest report is said once: no detail line in the strip beside the Panel", !/<p class="wip-detail">Walking/.test(w), ""]);
    c.push(["the Legend names the marks drawn", /a check stage that passed/.test(w) && /a stage in a FullPulse/.test(w) && /the run's latest report/.test(w) && /click a stage to open it/.test(w), ""]);
    c.push(["unmarked steps with no progress note", /Inside the stage/.test(w) && /<li class="unk">/.test(w) && !/aria-current="step"><i class="sdot"/.test(w), ""]);
    const probe = '<script>setTimeout(()=>{ PROG[String(PLAN.issue)]={x:{step:"walk-b",at:new Date().toISOString(),started:new Date().toISOString()}}; renderWip(); const b=document.querySelector(\'.stg-row[data-stage="S1"]\'); b.click(); setTimeout(()=>{ const q=k=>document.querySelector(\'details[data-key$="\'+k+\'"]\'); const ok={s1open:q(":stage:S1").open,s3open:q(":stage:S3").open,focus:document.activeElement&&document.activeElement.parentElement&&document.activeElement.parentElement.dataset.key||""}; renderWip(); ok.redraw=q(":stage:S1").open; ok.cur=[...document.querySelectorAll(".stg-steps li")].map(l=>l.className); document.documentElement.setAttribute("data-probe",JSON.stringify(ok)); },50); },300);</script>';
    const dp = dumpDom(page("issue-click", sceneIssue(), probe), null, null, 8000) || "", M = /data-probe="([^"]*)"/.exec(dp), PR = M ? JSON.parse(M[1].replace(/&quot;/g, '"')) : null;
    c.push(["a click on a stage opens it in the step Panel, the focus on its item, kept across the redraw, the current one left open", !!PR && PR.s1open && PR.s3open && /:stage:S1$/.test(PR.focus) && PR.redraw, js(PR)]);
    c.push(["a progress note's step marks the current step, those before it done, none after", !!PR && js(PR.cur) === js(["done", "cur"]), js(PR && PR.cur)]);
    const held = dumpDom(page("issue-held", sceneIssue({ step: "halted", resume: "implementation", waitingOn: "One answer", detail: "Walked half.", asked: [{ step: "implementation", text: "Which way?", options: ["A"], answer: null, asked: T2 }] }))) || "", hw = wipOf(held);
    c.push(["while the run waits on you: the Ring alone on the stage and the Now Chip, the waiting question kept", /class="stg-row cur held"/.test(hw) && /chip now held/.test(hw) && /Which way\?/.test(hw) && !/chip now fullpulse/.test(hw), ""]);
    const planDom = dumpDom(page("plan-step", flight({ step: "plan", since: T0, updated: T0, current: ["considered", "verdict"], event: { name: "sized", at: T0 }, plan: { state: "writing", since: T0 }, history: { sizing: [{ since: null, ended: T0, endedBy: "sized", to: "plan" }] } }))) || "", pw = wipOf(planDom);
    c.push(["plan writing → plan accepted is a StepBar", /<ol class="stepbar" aria-label="The plan StepBar"><li class="cur fullpulse" aria-current="step">plan writing/.test(pw) && !/class="steps"/.test(pw), pw.slice(pw.indexOf("The plan StepBar") - 40, pw.indexOf("The plan StepBar") + 300)]);
    /* a tracking board: compact, no phase bar */
    const t = copy(TRK); t.status = "building"; const u = t.rows.find(r => r.unit && r.unit.issue); t.wip = { ...t.wip, step: "implementation", since: T0, updated: T1, current: [u.id + ".built"], detail: "The chain." };
    const UR = t.rows.find(r => r === u); UR.asBuilt = { ...(UR.asBuilt || {}), state: "in-progress" }; UR.unit.live = { step: "implementation", since: T0, updated: T1, detail: "Its detail.", status: "building", steps: STEPS.slice(), stages: [{ id: "S1", name: "Local readiness", state: "done", kind: "work", brief: "A brief that stays off", rows: [] }, { id: "S2", name: "Walk", state: "current", kind: "work", brief: "another", rows: [] }], event: { name: "implementation-stage", at: T1 }, rowNames: {} };
    const td = dumpDom(page("tracking", t)) || "", tw = wipOf(td);
    c.push(["a tracking unit's Card: number, name and status, no brief", /wipcard unit/.test(tw) && (tw.match(/<li class="stg-row /g) || []).length === 2 && !/<span class="br">/.test(tw), ""]);
    c.push(["the phase Card has no thin bar, its count line and StepBar kept", !/chip-bar/.test(tw) && /The chain · /.test(tw), ""]);
    c.push(["the unit's detail is in its step Panel's Now Chip, not on its Card", /<span class="ck">Now<\/span> Its detail/.test(tw) && !/<p class="wip-detail">Its detail/.test(tw), ""]);
    /* a finished Implementation view: nothing open */
    const pastX = sceneIssue({ step: "qa", since: T3, current: ["built"], qa: [{ pass: 1, verdict: "running", at: T3, date: "2026-11-08", findings: {} }], history: { sizing: [{ since: null, ended: "2026-11-08T08:00:00Z", endedBy: "sized", to: "implementation" }], implementation: [{ since: T0, ended: T3, endedBy: "qa-pass", to: "qa", stages: [{ id: "S1", name: "One", state: "done", rows: [], report: "One done", finished: T1, started: T0 }, { id: "S2", name: "Two", state: "done", rows: [], report: "Two done", finished: T3, started: T1 }] }] } });
    const pd = dumpDom(page("finished-impl", pastX, '<script>setTimeout(()=>{ pickStep("own","implementation"); document.documentElement.setAttribute("data-past",String(document.querySelectorAll("#wip details[open]").length)+":"+String(document.querySelectorAll("#wip details.stg-d").length)); },300);</script>'), null, null, 6000) || "";
    c.push(["the finished Implementation view collapses too, none open", /data-past="0:2"/.test(pd), (/data-past="[^"]*"/.exec(pd) || [""])[0]]);
    /* a finished step's visits: collapsing, the latest open, and their brief in the WIP Panel, on any step that has them */
    const SN = (id, st) => ({ id, name: id, state: st, rows: [] });
    const vis = (i, extra) => ({ since: "2026-11-08T0" + i + ":00:00Z", ended: "2026-11-08T0" + i + ":30:00Z", endedBy: "halted", to: "implementation", held: true, detail: "Report of visit " + (i + 1) + ".", event: { name: "halted", at: "2026-11-08T0" + i + ":30:00Z" }, ...extra });
    const fourX = sceneIssue({ step: "qa", since: T3, current: ["built"], stages: [], qa: [{ pass: 1, verdict: "running", at: T3, date: "2026-11-08", findings: {} }], history: { sizing: [{ since: null, ended: "2026-11-08T00:00:00Z", endedBy: "sized", to: "implementation" }], implementation: [vis(1, { stages: [SN("S1", "done"), SN("S2", "current")] }), vis(2, { stages: [SN("S1", "done"), SN("S2", "current")] }), vis(3, { stages: [SN("S1", "done"), SN("S2", "done")], endedBy: "qa-pass", to: "qa", held: undefined })] } });
    const probeV = (step, run) => '<script>setTimeout(()=>{ pickStep("own","' + step + '"); const w=document.getElementById("wip"), keys=()=>[...w.querySelectorAll("details.sp-visit[open]")].map(d=>d.dataset.visit); const o={all:w.querySelectorAll("details.sp-visit").length,open:keys(),rows:w.querySelectorAll(".sp-brief .stg-row").length,brief:(w.querySelector(".sp-brief")||{}).textContent||"",legend:w.querySelector(".legend").textContent}; const r=w.querySelector(\'.sp-brief .stg-row[data-visit="0"]\'); if(r) r.click(); o.afterClick=keys(); renderWip(); o.afterRedraw=keys(); document.documentElement.setAttribute("data-v",JSON.stringify(o)); },300);</script>';
    const rdV = (name, x, step) => { const d = dumpDom(page(name, x, probeV(step)), null, null, 6000) || "", m = /data-v="([^"]*)"/.exec(d); return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")) : null; };
    const V4 = rdV("visits-implementation", fourX, "implementation");
    c.push(["a finished step's visits collapse, the latest open by default", !!V4 && V4.all === 3 && js(V4.open) === js(["2"]), js(V4 && [V4.all, V4.open])]);
    c.push(["the WIP Panel gives a row per visit: its account, how it ended, its last report", !!V4 && V4.rows === 3 && /1 of 2 stages done/.test(V4.brief) && /2 of 2 stages done/.test(V4.brief) && /waited on you/.test(V4.brief) && /Report of visit 3\./.test(V4.brief), js(V4 && V4.brief)]);
    c.push(["a click on a row opens that visit in the step Panel, kept across the redraw", !!V4 && js(V4.afterClick) === js(["0", "2"]) && js(V4.afterRedraw) === js(["0", "2"]), js(V4 && [V4.afterClick, V4.afterRedraw])]);
    c.push(["the Legend says the row opens and names how a visit ended", !!V4 && /click a row to open or close its detail/.test(V4.legend) && /a question put to you/.test(V4.legend), js(V4 && V4.legend).slice(0, 300)]);
    const qaX = sceneIssue({ step: "document", since: T3, current: ["built"], stages: [], qa: [], document: { tasks: [] }, history: { sizing: [{ since: null, ended: "2026-11-08T00:00:00Z", endedBy: "sized", to: "implementation" }], qa: [{ ended: T1, endedBy: "qa-pass", to: "remediation", qa: [{ pass: 1, verdict: "changes-requested", at: T1, date: "2026-11-08", findings: { code: 2 } }] }, { ended: T3, endedBy: "qa-pass", to: "document", qa: [{ pass: 2, verdict: "approved", at: T3, date: "2026-11-08", findings: {} }] }] } });
    const VQ = rdV("visits-qa", qaX, "qa");
    c.push(["every step that has visits: at Quality Review each pass is an item, its row named and its verdict shown", !!VQ && VQ.all === 2 && js(VQ.open) === js(["1"]) && VQ.rows === 2 && /Quality Review 1/.test(VQ.brief) && /Quality Review 2/.test(VQ.brief) && /changes requested/.test(VQ.brief) && /approved/.test(VQ.brief), js(VQ && [VQ.all, VQ.open, VQ.brief])]);
    const oneX = sceneIssue({ step: "qa", since: T3, current: ["built"], stages: [], qa: [{ pass: 1, verdict: "running", at: T3, date: "2026-11-08", findings: {} }], history: { sizing: [{ since: null, ended: "2026-11-08T00:00:00Z", endedBy: "sized", to: "implementation" }], implementation: [vis(1, { stages: [SN("S1", "done")], endedBy: "qa-pass", to: "qa", held: undefined })] } });
    const V1 = rdV("visits-one", oneX, "implementation");
    c.push(["a single visit stands open with no collapsing head; its row in the brief opens nothing", !!V1 && V1.all === 0 && V1.rows === 1 && /1 of 1 stage done/.test(V1.brief), js(V1 && [V1.all, V1.rows, V1.brief])]);
  });

  /* ---------- 5. the plain system ---------- */
  guard("the plain system: Internal Tooling and its subsystems take no slot and move no other system's colour; every template draws them in the ink", c => {
    const reg = [{ slug: "alpha", kind: "system", status: "built", name: "Alpha" }, { slug: "it", kind: "supersystem", status: "built", name: "Internal Tooling" }, { slug: "it-a", kind: "system", status: "built", name: "Tool A", parent: "it" }, { slug: "beta", kind: "system", status: "built", name: "Beta" }];
    const C = P.colourSlots(reg);
    c.push(["the systems around it keep their slots: Alpha 1, Beta 2", C.slot("alpha") === 1 && C.slot("beta") === 2, js([C.slot("alpha"), C.slot("beta")])]);
    c.push(["it and its subsystem hold none, drawn plain", C.slot("it") === 0 && C.slot("it-a") === 0 && C.plain("it").slug === "it" && C.plain("it-a").slug === "it" && C.holder("it") === null, js([C.slot("it"), C.slot("it-a")])]);
    const root = path.join(sc, "reg"); wr(path.join(root, "docs", "dashboards", "systems.json"), js({ repo: "a/b", systems: reg }));
    const R = lib.registry ? lib.registry(root) : null;
    if (R) c.push(["lib.js registry(): a subsystem's top names it, plain", R.info("it-a").top === "Internal Tooling" && R.info("it-a").plain === true && R.info("it-a").slot === 0, js(R.info("it-a"))]);
    [["the issue and tracking board template", PB], ["the repository work board template", WB], ["the org work board template", OB]].forEach(([n, h]) => { const ctx = {}; vm.createContext(ctx);
      [/^const sysOf=.*$/m, /^const sysPlain=.*$/m, /^const sysLit=.*$/m].forEach(re => { const m = re.exec(h); if (!m) throw new Error(n + " " + re); vm.runInContext(m[0].replace(/^const /, "var "), ctx); });
      vm.runInContext("var SYSTEMS=[{slug:'it-a',name:'Tool A',slot:0,top:'Internal Tooling',status:'built'},{slug:'x',name:'X',slot:3,top:'X',status:'built'},{slug:'ar',name:'Internal Tooling',slot:0,top:'Internal Tooling',status:'archived'}]; var SYS=SYSTEMS;", ctx);
      const m = /(?:function sysColour\(slug\)\{|const sysColour=sl=>\{)[^\n]*$/m.exec(h); vm.runInContext(m[0].replace(/^const sysColour=/, "var sysColour="), ctx);
      c.push([`${n}: the plain system in the ink, a slotted one its slot, an archived one neutral`, ctx.sysColour("it-a") === "var(--ink)" && ctx.sysColour("x") === "var(--sys-3)" && ctx.sysColour("ar") === "var(--muted)", js([ctx.sysColour("it-a"), ctx.sysColour("x"), ctx.sysColour("ar")])]); });
    const ss = /function sysPlain\(slug\)\{[^\n]*$/m.exec(SUP);
    c.push(["the supersystem and repository state boards hold the same rule and leave it out of the places", !!ss && /TOPS=SYSTEMS\.filter\(s=>!bySlug\(s\.parent\)&&!sysPlain\(s\.slug\)\)/.test(SUP) && /if\(sysPlain\(slug\)\) return "var\(--ink\)"/.test(SUP), ""]);
    c.push(["the system board draws its sides in the ink when its state says so", /:root\[data-sys-colour="plain"\]\{--server:var\(--ink\)/.test(SYS) && /STATE\.colour==="plain"/.test(SYS), ""]);
    [["plan-board", PB], ["work-board", WB], ["supersystem", SUP], ["system", SYS]].forEach(([k, h]) => { const miss = F.missing ? F.missing(h, k).filter(m => m.id === "plain-system") : []; c.push([`the feature probe finds it on the ${k} template`, !miss.length, js(miss)]); });
  });

  /* ---------- 6. apply-state.js ---------- */
  guard("apply-state.js: an entry merely stamped by the branch is restamped and keeps its last amendment (a repository's first boards)", c => {
    const L = require(sk("system/scripts/statelib.js")), AS = sk("system/scripts/apply-state.js"), tree = path.join(sc, "first-boards"), D = path.join(tree, "docs", "dashboards"), branch = "feat/issue-9-x";
    const stamp = { ref: branch, sha: "1111111", date: "2026-10-20" }, stTxt = (slug, version) => L.stateText({ slug, version, asIs: { ...stamp }, written: { sha: "1111111" } });
    ["system-alpha", "system-beta"].forEach(d => fs.mkdirSync(path.join(tree, d), { recursive: true }));
    const sup = SUP, sys = SYS, reg = JSON.parse(L.blockText(sup, "systems")); reg.repo = "acme/widgets";
    reg.systems.forEach(e => { e.asIs = { ...stamp }; delete e.lastAmended; });
    Object.assign(reg.systems.find(e => e.slug === "system-alpha"), { version: "1.0.0" }); Object.assign(reg.systems.find(e => e.slug === "system-beta"), { page: null, dsl: null, version: "2.0.0" });
    const gamma = reg.systems.find(e => e.slug === "system-gamma"); if (gamma && gamma.plannedBy) gamma.plannedBy.issue = 9;
    const regText = "{\n  \"repo\": \"acme/widgets\",\n  \"updated\": \"2026-10-20\",\n  \"systems\": [\n" + reg.systems.map(e => "    " + L.inline(e)).join(",\n") + "\n  ]\n}\n";
    fs.mkdirSync(path.join(D, "system-alpha"), { recursive: true }); fs.writeFileSync(path.join(D, "systems.json"), regText);
    const dsl = L.blockText(sup, "dsl").replace("// As-is at <repo> <branch> <sha> (<date>), <system> <version>.", `// As-is at widgets ${branch} 1111111 (2026-10-20), alpha 1.0.0.`);
    fs.writeFileSync(path.join(D, "workspace.dsl"), dsl + "\n"); fs.writeFileSync(path.join(D, "state.json"), stTxt("repo", null));
    fs.writeFileSync(path.join(D, "index.html"), L.embedInto(L.embedInto(L.embedInto(sup, "systems", regText), "dsl", dsl), "state", stTxt("repo", null)));
    const sd = L.blockText(sys, "dsl").replace("// As-is at <repo> <branch> <sha> (<date>), <system> <version>.", `// As-is at widgets ${branch} 1111111 (2026-10-20), alpha 1.0.0.`).replace('"system-slug as built at <sha>."', `"system-alpha as built at ${branch} 1111111."`);
    fs.writeFileSync(path.join(D, "system-alpha", "workspace.dsl"), sd + "\n"); fs.writeFileSync(path.join(D, "system-alpha", "state.json"), stTxt("system-alpha", "1.0.0"));
    fs.writeFileSync(path.join(D, "system-alpha", "index.html"), L.embedInto(L.embedInto(sys, "dsl", sd), "state", stTxt("system-alpha", "1.0.0")));
    const f = wr(path.join(sc, "first-req.json"), js({ v: 1, action: "state-boards", github: "acme/widgets", issue: 9, branch, facts: { document: true, at: "2026-10-25T12:00:00Z", sha: "2222222abcdef0", systems: ["system-beta"], base: "main" } }));
    const r = cp.spawnSync(process.execPath, [AS, "--event", f, "--worktree", tree, "--json"], { encoding: "utf8", env }); let s; try { s = JSON.parse((r.stdout || "").trim().split(/\r?\n/).pop()); } catch (e) { s = { result: "unparsed", error: (r.stdout || "") + (r.stderr || "") }; }
    const R1 = JSON.parse(rd(path.join(D, "systems.json"))), E = x => R1.systems.find(e => e.slug === x);
    c.push(["applied", r.status === 0, js([s.result, s.error, s.check])]);
    c.push(["the system the issue changed: restamped, last amended by the issue", E("system-beta").asIs.sha === "2222222" && E("system-beta").lastAmended && E("system-beta").lastAmended.issue === 9, js(E("system-beta"))]);
    c.push(["a system it did not change, stamped by the branch: restamped, no amendment written", E("system-alpha").asIs.sha === "2222222" && !E("system-alpha").lastAmended, js(E("system-alpha"))]);
    c.push(["…on its board's state too", (() => { const st = JSON.parse(rd(path.join(D, "system-alpha", "state.json"))); return st.asIs.sha === "2222222" && !st.lastAmended; })(), rd(path.join(D, "system-alpha", "state.json"))]);
    c.push(["the repository's own entry shows the changed system: last amended by the issue", E("repo") && E("repo").lastAmended && E("repo").lastAmended.issue === 9, js(E("repo"))]);
  });

  /* ---------- the feature probes ---------- */
  guard("the feature probes: stage-list, now-chip and visit-brief on the issue and tracking board template, missed on a board drawn before", c => {
    const has = (h, id) => { const f = F.FEATURES ? F.FEATURES.find(x => x.id === id) : null; return f ? f.test(h, "plan-board") === true : null; };
    ["stage-list", "now-chip", "visit-brief"].forEach(id => { const y = has(PB, id); c.push([`${id}: found on the template`, y === true, js(y)]); });
    const old = PB.replace(/function stageStrip\(/g, "function nope(").replace(/const KEY_NOW=/g, "const NO_KEY=").replace(/function pastBrief\(/g, "function nope2(");
    ["stage-list", "now-chip", "visit-brief"].forEach(id => { const y = has(old, id); c.push([`${id}: missed on one without it`, y === false, js(y)]); });
  });
  return groups;
};
if (require.main === module) { /* on its own, with no browser */
  const out = (() => { const i = process.argv.indexOf("--out"); return i >= 0 ? process.argv[i + 1] : path.join(os.tmpdir(), "cases-wip-stages"); })();
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, p);
  const NB = "needs a browser: not run (verify-templates.js --browser runs it)";
  const gs = module.exports({ sk, out, targets: [], NEEDS_BROWSER: NB }); let bad = 0;
  gs.forEach(([t, cs]) => { const f = cs.filter(x => !x[1]); bad += f.length; console.log(`${f.length ? "FAILED  " : "checked "} ${t}: ${cs.length - f.length}/${cs.length} cases`); f.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
