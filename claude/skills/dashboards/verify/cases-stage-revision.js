// The cases of two defects KotlinBottools #24's run exposed in apply-event.js's implementation-stage (admin-team/dashboards/stage-revision;
// plan/RULES.md §3, "The stage table", and §4, the implementation-stage row), run by verify-templates.js (it passes its helpers in), or on its
// own with no browser: node verify/cases-stage-revision.js [--out <dir>].
// 1. The stage table after a plan revision: the plan was re-passed during the Correction of Quality Review 1 and its stage table changed (S2 "The
//    six files" became "The seven files", with a new step), but the stages kept the first plan's link, briefs and steps, as the table was read at
//    branch-cut only and the event's steps were never taken. Every later stage event now brings the stages to the table as it stands, or to the
//    event's steps where the table names no such stage; a finished visit's record keeps what it ran to.
// 2. A late report on a board at Quality Review: a Correction's report sent while Quality Review 2 ran moved the board back to the Correction. A
//    late report on a board already at qa or past it moves nothing back, a remediation's included; its sub-steps are still recorded on the
//    remediation the board holds. Each group returns [title, cases], a case [name, ok, detail]. No case opens a browser.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesStageRevision(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the stage table after a plan revision; a late report at Quality Review (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js");
  const sc = path.join(out, "stage-revision"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const T0 = "2026-11-11T20:20:36Z", T1 = "2026-11-11T20:27:00Z", T2 = "2026-11-11T20:46:16Z", T3 = "2026-11-11T21:47:07Z", T4 = "2026-11-11T21:55:23Z", T5 = "2026-11-11T21:58:00Z";
  /* the plan's stage table, first as written and then as revised */
  const PLAN = (two, steps2, head2) => `# Plan\n\n## Shape of the procedure\n\n| id | name | brief | kind | steps |\n|---|---|---|---|---|\n` +
    `| S1 | Baseline | The baseline is as recorded | check | branch: The branch; tools: The tools |\n| S2 | ${two} | The ${two.toLowerCase()} are written | work | ${steps2} |\n\n## Procedure\n\n### S1 — Baseline\n\nIt checks.\n\n### S2 — ${head2}\n\nIt writes.\n`;
  const V1 = PLAN("The six files", "ignore: The ignore list; config: The configuration", "The six files");
  const V2 = PLAN("The seven files", "ignore: The ignore list; config: The configuration; controls: The allowlist controls", "The seven files");
  const OLD = [{ id: "S1", name: "Baseline", brief: "The baseline is as recorded", kind: "check", steps: [{ id: "branch", name: "The branch" }, { id: "tools", name: "The tools" }], ref: "plan.md#s1--baseline" },
    { id: "S2", name: "The six files", brief: "The the six files are written", kind: "work", steps: [{ id: "ignore", name: "The ignore list" }, { id: "config", name: "The configuration" }], ref: "plan.md#s2--the-six-files" }];
  const REM = (pass, a, b) => ({ pass, route: "re-plan-then-remediation", steps: [{ name: "Revise the plan", state: a }, { name: "Run the revised checks", state: b }] });
  const board = over => { const x = copy(EX), ids = x.rows.map(r => r.id); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    const stages = OLD.map(s => ({ ...copy(s), state: "done", rows: [ids[0]], finished: T1 }));
    x.wip = { ...x.wip, step: "remediation", since: T2, updated: T2, current: ["built"], questions: [], research: null, open: [], plan: null, waits: [], steps: STEPS.slice(), stages,
      qa: [{ pass: 1, verdict: "changes-requested", date: "2026-11-11", at: T2, findings: { test: 11 }, route: "re-plan-then-remediation" }], remediation: REM(1, "current", "todo"),
      history: { implementation: [{ since: T0, ended: T1, endedBy: "qa-pass", to: "qa", stages: copy(stages) }], qa: [{ since: T1, ended: T2, endedBy: "qa-pass", to: "remediation" }] },
      event: { name: "qa-pass", at: T2 }, ...(over || {}) }; return x; };
  let n = 0;
  const lay = (plan, md) => { const root = path.join(sc, `b-${++n}`), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
    if (md != null) wr(path.join(dir, "plan.md"), md);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir, plan }; };
  const ev = (B, event, facts, at) => { const rq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: B.plan.repo, issue: B.plan.issue, event, folder: B.plan.folder, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]); return { a, S: parse(a), p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const S2 = p => (p.wip.stages || []).find(s => s.id === "S2") || {};
  const STG = (a, b, extra) => [{ id: "S1", name: "Baseline", state: a, ...((extra || {}).S1 || {}) }, { id: "S2", name: "The seven files", state: b, ...((extra || {}).S2 || {}) }];

  guard("apply-event.js: a later stage event brings the stages to the plan's stage table as it stands, after a plan revision (KotlinBottools #24)", c => {
    const B = lay(board(), V2);
    const a = ev(B, "implementation-stage", { stage: "S1", stages: STG("current", "todo"), remediation: REM(1, "done", "current") }, T3), s2 = S2(a.p);
    c.push(["the revised plan's link, brief and steps on S2", a.a.status === 0 && s2.ref === "plan.md#s2--the-seven-files" && s2.brief === "The the seven files are written" && js((s2.steps || []).map(x => x.id)) === js(["ignore", "config", "controls"]), js([a.a.status, a.S.error, s2.ref, s2.brief, s2.steps])]);
    c.push(["…S1, whose row did not change, keeps what it had", js((a.p.wip.stages[0] || {}).steps) === js(OLD[0].steps) && a.p.wip.stages[0].brief === OLD[0].brief, js(a.p.wip.stages[0])]);
    c.push(["…the summary says so", (a.S.applied || []).some(x => /brought to the plan's stage table as it stands now/.test(x)), js(a.S.applied)]);
    const hv = ((a.p.wip.history.implementation || [])[0] || {}).stages || [];
    c.push(["…the first implementation visit's record keeps the first plan's link and steps", (hv.find(x => x.id === "S2") || {}).ref === "plan.md#s2--the-six-files" && js(((hv.find(x => x.id === "S2") || {}).steps || []).map(x => x.id)) === js(["ignore", "config"]), js(hv)]);
    const b = ev(B, "implementation-stage", { stage: "S1", stages: STG("current", "todo"), remediation: REM(1, "done", "current") }, T3);
    c.push(["the same event again: nothing more", b.a.status === 0 && (b.S.duplicate === true || !(b.S.applied || []).some(x => /stage's table|stage table as it stands/.test(x))) && js(S2(b.p)) === js(s2), js([b.S.applied, b.S.duplicate])]);
    /* a plan with no stage table: the event's steps, a name the board has kept */
    const Bn = lay(board(), "# Plan\n\nNo table.\n");
    const m = ev(Bn, "implementation-stage", { stage: "S1", stages: STG("current", "todo", { S2: { steps: ["ignore", "config", "controls"] } }), remediation: REM(1, "done", "current") }, T3), m2 = S2(m.p);
    c.push(["no stage table: the event's steps taken, each known step keeping its name, a new one named by its id", m.a.status === 0 && js(m2.steps) === js([{ id: "ignore", name: "The ignore list" }, { id: "config", name: "The configuration" }, { id: "controls", name: "controls" }]), js([m.S.error, m2.steps])]);
    c.push(["…its link and brief kept, as nothing gives others", m2.ref === OLD[1].ref && m2.brief === OLD[1].brief, js([m2.ref, m2.brief])]);
    /* a report with no stages (the remediation's sub-steps alone) brings them too */
    const Br = lay(board(), V2), r = ev(Br, "implementation-stage", { remediation: REM(1, "done", "current") }, T3);
    c.push(["a remediation report with no stages: the stages are brought to the table too", r.a.status === 0 && S2(r.p).ref === "plan.md#s2--the-seven-files", js([r.S.error, S2(r.p).ref])]);
    /* the plan unchanged: nothing changes */
    const Bu = lay(board(), V1.replace("The the", "The")), u = ev(Bu, "implementation-stage", { stage: "S1", stages: STG("current", "todo", { S2: { name: "The six files" } }), remediation: REM(1, "done", "current") }, T3);
    const Bk = lay(board(), V2.replace("| S1 | Baseline | The baseline is as recorded | check |", "| S1 | Baseline | The baseline is as recorded | work |")), k = ev(Bk, "implementation-stage", { stage: "S1", stages: STG("current", "todo"), remediation: REM(1, "done", "current") }, T3);
    c.push(["a revised table that makes S1 a work stage: the kind kept, and the change named for the presenter", k.a.status === 0 && (k.p.wip.stages[0] || {}).kind === "check" && k.S.enrich === "yes" && (k.S.why || []).some(x => /now makes S1 a work stage; the board keeps it a check stage/.test(x)), js([k.S.error, (k.p.wip.stages[0] || {}).kind, k.S.why])]);
    c.push(["the plan as the stages hold it (but the brief, which the plan words otherwise): only what differs moves", u.a.status === 0 && S2(u.p).ref === OLD[1].ref && js(S2(u.p).steps) === js(OLD[1].steps), js([u.S.error, S2(u.p)])]);
  });

  guard("apply-event.js: a late report on a board at Quality Review or past it moves nothing back, a remediation's included (KotlinBottools #24)", c => {
    const atQa = over => board({ step: "qa", since: T4, updated: T4, remediation: REM(1, "done", "current"), stages: OLD.map(s => ({ ...copy(s), state: "done", rows: [], finished: T3 })),
      qa: [{ pass: 1, verdict: "changes-requested", date: "2026-11-11", at: T2, findings: { test: 11 }, route: "re-plan-then-remediation" }, { pass: 2, verdict: "running", date: "2026-11-11", at: T4 }],
      history: { implementation: [{ since: T0, ended: T1, endedBy: "qa-pass", to: "qa" }], qa: [{ since: T1, ended: T2, endedBy: "qa-pass", to: "remediation" }], remediation: [{ since: T2, ended: T4, endedBy: "qa-pass", to: "qa" }] },
      event: { name: "qa-pass", at: T4 }, detail: "Quality Review 2 running.", ...(over || {}) });
    const B = lay(atQa(), V2), a = ev(B, "implementation-stage", { stage: "S2", stages: STG("done", "done", { S1: { result: "passed" } }), remediation: REM(1, "done", "done") }, T5);
    c.push(["a Correction's report with stages, sent while Quality Review 2 runs: the board stays at qa, the visit running from its start", a.a.status === 0 && a.p.wip.step === "qa" && a.p.wip.since === T4, js([a.a.status, a.S.error, a.p.wip.step, a.p.wip.since])]);
    c.push(["…no qa visit frozen, no remediation visit opened", ((a.p.wip.history.qa || []).length === 1) && ((a.p.wip.history.remediation || []).length === 1), js(a.p.wip.history)]);
    c.push(["…the sub-steps recorded on the remediation the board holds", js((a.p.wip.remediation.steps || []).map(x => x.state)) === js(["done", "done"]), js(a.p.wip.remediation)]);
    c.push(["…the check stage's result recorded", ((a.p.wip.stages || []).find(s => s.id === "S1") || {}).result === "passed", js(a.p.wip.stages)]);
    c.push(["…the summary says the board stays", (a.S.applied || []).some(x => /a late remediation report: the board stays at qa/.test(x)), js(a.S.applied)]);
    c.push(["…and the WIP line is the one the step wrote, though the report carries no detail", a.p.wip.detail === "Quality Review 2 running.", js(a.p.wip.detail)]);
    const Bl = lay(atQa({ stages: OLD.map((s, i) => ({ ...copy(s), state: i ? "current" : "done", rows: [], ...(i ? { started: T3 } : { finished: T3 }) })) }), V2);
    const l = ev(Bl, "implementation-stage", { stage: "S2", detail: "S2 is done: the seven files hold their bytes.", stages: STG("done", "done"), remediation: REM(1, "done", "done") }, T5);
    c.push(["a late report with a detail: the WIP line kept, \"Quality Review 2 running.\"", l.a.status === 0 && l.p.wip.step === "qa" && l.p.wip.detail === "Quality Review 2 running.", js([l.S.error, l.p.wip.step, l.p.wip.detail])]);
    c.push(["…its detail recorded on the stage it closes, and the summary says the line was kept", (S2(l.p).report === "S2 is done: the seven files hold their bytes.") && (l.S.applied || []).some(x => /wip\.detail kept: a late report/.test(x)), js([S2(l.p), l.S.applied])]);
    const Bm = lay(atQa(), V2), mm = ev(Bm, "implementation-stage", { stage: "S1", detail: "Results added.", stages: STG("done", "done", { S1: { result: "passed" } }) }, T5);
    c.push(["a late report that closes nothing new, with a detail: the WIP line kept too", mm.a.status === 0 && mm.p.wip.detail === "Quality Review 2 running." && mm.p.wip.step === "qa", js([mm.S.error, mm.p.wip.detail])]);
    const Bn = lay(atQa(), V2), b = ev(Bn, "implementation-stage", { remediation: REM(1, "done", "done") }, T5);
    c.push(["a Correction's report with no stages, at qa: the board stays at qa too", b.a.status === 0 && b.p.wip.step === "qa" && b.p.wip.since === T4 && (b.p.wip.history.qa || []).length === 1, js([b.S.error, b.p.wip.step, b.p.wip.since])]);
    const Bd = lay(atQa({ step: "document", since: T5, remediation: null, document: { tasks: [] } }), V2), d = ev(Bd, "implementation-stage", { remediation: REM(1, "done", "done") }, "2026-11-11T22:00:00Z");
    c.push(["at the Document step, its remediation over: the board stays, and no remediation is opened again", d.a.status === 0 && d.p.wip.step === "document" && d.p.wip.remediation == null, js([d.S.error, d.p.wip.step, d.p.wip.remediation])]);
    const Bh = lay(atQa({ step: "halted", resume: "qa", waitingOn: "an answer" }), V2), h = ev(Bh, "implementation-stage", { remediation: REM(1, "done", "done") }, T5);
    c.push(["halted at qa: a late remediation report does not move it to the Correction", h.a.status === 0 && h.p.wip.step !== "remediation" && (h.p.wip.resume || h.p.wip.step) !== "remediation", js([h.S.error, h.p.wip.step, h.p.wip.resume])]);
    /* what stays as it was: a report during the remediation, and one from implementation that carries a remediation */
    const Br = lay(board(), V2), r = ev(Br, "implementation-stage", { stage: "S1", stages: STG("current", "todo"), remediation: REM(1, "done", "current") }, T3);
    c.push(["a report while the board stands at the Correction stays there", r.a.status === 0 && r.p.wip.step === "remediation", js([r.S.error, r.p.wip.step])]);
    const Bi = lay(board({ step: "implementation", since: T0, remediation: null, qa: [], history: {} }), V2), i = ev(Bi, "implementation-stage", { remediation: REM(1, "current", "todo") }, T1);
    c.push(["from implementation, a report that carries a remediation still gives the Correction", i.a.status === 0 && i.p.wip.step === "remediation", js([i.S.error, i.p.wip.step])]);
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
