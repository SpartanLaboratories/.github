// The cases of a stage's nested steps (the user's decisions of 2026-11-12, dashboards/nested-stages, -choices, -followups; plan/RULES.md §3, "The stage table",
// "The record of a step", "The stage list", "Collapsing"; the step-complete row of §4), run by verify-templates.js (it passes its helpers in), or on its own
// with no browser: node verify/cases-nested-steps.js [--out <dir>].
// 1. lib.js stageTable(): the "below" list to any depth, the flat cell as before (a dotted id included), every STAGE TABLE warning.
// 2. apply-event.js step-complete: a leaf, a parent (every step under it), the last step closing its parent, twice (a duplicate), a stage to come, an
//    unknown stage or step (a warning, nothing written), enrich no, no trail entry, the detail, the step, the stages and the glow unchanged, a halt kept,
//    a landed board kept; a sub-issue's tracking board re-embedded, its mirror carrying the record.
// 3. The records through a revised stage table: kept by id at any depth, dropped with their step; a flat step made a parent (#25's S2) takes its record down.
// 4. An implementation-stage sent mid-stage, or while the run is halted, with the stage states unchanged: what it closes and what it resumes.
// 5. check.js holds a step's record to its form; a fill keeps the records.
// 6. The template's steps block (vm, no browser): the numbers, the marks (a note, the records, a done stage, a stage to come, the implementer ahead of the
//    run), the count Labels and "at", the Disclosures open or closed, a finished view listing only a done stage's, the Legend's keys.
// Each group returns [title, cases], a case [name, ok, detail]. The boards it lays are kept under <out>/nested-steps/.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesNestedSteps(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const PB = rd(tp("plan/template/dashboard.html"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), FILL = sk("plan/scripts/fill.js");
  const sc = path.join(out, "nested-steps"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json")));
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const STEPS = ["sizing", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const flight = wip => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, questions: [], research: null, open: [], qa: [], plan: null, waitingOn: null, resume: null, steps: STEPS.slice(), ...wip }; return x; };
  /* the plan's stage table: S1 flat, S2 nested three deep under "below", S3 a check with a dotted flat cell */
  const TABLE = [
    "", "", "### S1 — Readiness", "", "Text.", "", "### S2 — The texts", "", "Text.", "",
    "| id | name | brief | kind | steps |", "|----|------|-------|------|-------|",
    "| S1 | Readiness | the tools read | work | r1: Tools read; r2 |",
    "| S2 | The texts | the bodies edited | work | below |",
    "| S3 | The check | every link read back | check | S3.read: The links read; S3.count |", "",
    "**Steps of S2**", "",
    "- `texts`: The new bodies built",
    "- `gate`: The bodies gated",
    "- `edits`: The edits",
    "  - `e1`: Issue 1",
    "  - `e2`: Issue 2",
    "    - `e2a`: Its body",
    "    - `e2b`: Its read-back",
    "  - `e3`: Issue 3",
    "- `after`: The occurrences counted", ""].join("\n");
  const lay = (name, plan, table) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true }); if (table !== false) wr(path.join(dir, "plan.md"), rd(path.join(dir, "plan.md")) + (table || TABLE));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  let nreq = 0;
  const apply = (B, plan, ev, facts, at, extra) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: ev, folder: plan.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json", ...(extra || [])]), S = parse(a); return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const T0 = "2026-11-12T10:00:00Z", T1 = "2026-11-12T11:00:00Z", T2 = "2026-11-12T12:00:00Z", T3 = "2026-11-12T13:00:00Z", T4 = "2026-11-12T14:00:00Z";
  const atBranch = () => flight({ step: "branch", since: "2026-11-12T09:00:00Z", updated: "2026-11-12T09:00:00Z", event: { name: "plan-accepted", at: "2026-11-12T09:00:00Z" }, current: [], history: { sizing: [{ since: null, ended: "2026-11-12T08:00:00Z", endedBy: "sized", to: "plan" }] } });
  const STG = [["S1", "Readiness"], ["S2", "The texts"], ["S3", "The check"]].map(([id, name]) => ({ id, name }));
  const stepOf = (p, sid, id) => { let hit = null; lib.walkSteps((p.wip.stages.find(x => x.id === sid) || {}).steps, s => { if (!hit && s.id === id) hit = s; }); return hit; };
  /* a board cut with the table, at S1 or wherever the facts say */
  const cut = name => { const P = atBranch(), B = lay(name, P); const r = apply(B, P, "branch-cut", { branch: "fix/38-x", stages: STG }, T0); if (r.a.status !== 0) throw new Error("branch-cut: " + (r.a.stdout + r.a.stderr).slice(-400)); return { B, P, p: r.p }; };

  /* ---------- 1. the table ---------- */
  guard("lib.js stageTable(): the \"below\" list to any depth, the flat cell as before, every STAGE TABLE warning", c => {
    const T = lib.stageTable(TABLE), s2 = T.stages[1];
    c.push(["a \"below\" cell takes the list under **Steps of S2**, nested three deep, in its order", js(s2.steps) === js([{ id: "texts", name: "The new bodies built" }, { id: "gate", name: "The bodies gated" }, { id: "edits", name: "The edits", steps: [{ id: "e1", name: "Issue 1" }, { id: "e2", name: "Issue 2", steps: [{ id: "e2a", name: "Its body" }, { id: "e2b", name: "Its read-back" }] }, { id: "e3", name: "Issue 3" }] }, { id: "after", name: "The occurrences counted" }]) && !("below" in s2), js(s2)]);
    c.push(["a table read with no problem names none", T.problems.length === 0, js(T.problems)]);
    c.push(["the flat cell read as before: an id, an id with its name, dotted ids included", js(T.stages[0].steps) === js([{ id: "r1", name: "Tools read" }, { id: "r2", name: "r2" }]) && js(T.stages[2].steps) === js([{ id: "S3.read", name: "The links read" }, { id: "S3.count", name: "S3.count" }]), js([T.stages[0].steps, T.stages[2].steps])]);
    const old = "| id | name | brief | kind | steps |\n|---|---|---|---|---|\n| S1 | n | b | work | S1.save: The tools saved; S1.tools: The tools, at their bytes, read |\n";
    c.push(["a #25-like flat row: dotted ids, a name holding a comma", js(lib.stageTable(old).stages[0].steps) === js([{ id: "S1.save", name: "The tools saved" }, { id: "S1.tools", name: "The tools, at their bytes, read" }]), js(lib.stageTable(old))]);
    c.push(["`below` in backticks and any case is \"below\"", lib.stageTable("| id | name | brief | kind | steps |\n|---|---|---|---|---|\n| S1 | n | b | work | `Below` |\n\n**Steps of s1**\n- `a`\n").stages[0].steps.length === 1, ""]);
    const W = lib.stageTable(["| id | name | brief | kind | steps |", "|---|---|---|---|---|", "| S1 | One | b | work | below |", "| S2 | Two | b | work | x |", "| S3 | Three | b | work | below |", "",
      "**Steps of S1**", "- `a`: A", "      - `deep`: jumped", "- `a`: again", "- bare: no ticks", "- `bad id`: x", "- (not an item)", "", "**Steps of S2**", "- `z`", "", "**Steps of S9**", "- `q`", "", "## Next", "", "**Steps of S3**", "- `n`"].join("\n"));
    const has = re => W.problems.some(p => re.test(p));
    c.push(["S1 read as far as it holds: a, its jumped step one level under it, bare", js(W.stages[0].steps) === js([{ id: "a", name: "A", steps: [{ id: "deep", name: "jumped" }] }, { id: "bare", name: "no ticks" }]), js(W.stages[0].steps)]);
    c.push(["warned: a jump of depth", has(/^S1: line [0-9]+: an item indented 3 levels/), js(W.problems)]);
    c.push(["warned: an id twice in a stage", has(/^S1: line [0-9]+: the step a twice in the stage/), ""]);
    c.push(["warned: an item out of form (no backticks, read; not an id, left out)", has(/the step id bare is not in backticks/) && has(/the step id "bad id" is not an id/), ""]);
    c.push(["a line that is no item ends the list", !js(W.stages[0].steps).includes("not an item"), ""]);
    c.push(["warned: a list for a stage whose cell is not \"below\", left unread", has(/S2: a list under "\*\*Steps of S2\*\*".*left unread/) && W.stages[1].steps.length === 1 && W.stages[1].steps[0].id === "x", js(W.stages[1])]);
    c.push(["warned: a list naming no stage of the table", has(/Steps of S9.*names no stage/), ""]);
    c.push(["warned: \"below\" with no list before the next heading (a list after it is not read)", has(/S3: its steps cell says "below", and no list/) && W.stages[2].steps.length === 0, js(W.stages[2])]);
    c.push(["warned: **Steps of …** with no list under it", has(/has no list under it/) === false && lib.stageTable("| id | name | brief | kind | steps |\n|---|---|---|---|---|\n| S1 | n | b | work | below |\n\n**Steps of S1**\n\nprose\n").problems.some(p => /has no list under it/.test(p)), ""]);
    c.push(["a tab counts four spaces", js(lib.stageTable("| id | name | brief | kind | steps |\n|---|---|---|---|---|\n| S1 | n | b | work | below |\n\n**Steps of S1**\n- `a`\n\t- `b`\n\t\t- `c`\n").stages[0].steps) === js([{ id: "a", name: "a", steps: [{ id: "b", name: "b", steps: [{ id: "c", name: "c" }] }] }]), ""]);
    c.push(["a list inside a fenced block is not read", lib.stageTable("| id | name | brief | kind | steps |\n|---|---|---|---|---|\n| S1 | n | b | work | below |\n\n```\n**Steps of S1**\n- `a`\n```\n").stages[0].steps.length === 0, ""]);
  });

  /* ---------- 2. step-complete ---------- */
  guard("apply-event.js step-complete: the record of a step on the fast path alone, nothing else moved", c => {
    const { B, P, p: p0 } = cut("complete");
    c.push(["branch-cut copies the nested steps onto S2", js(p0.wip.stages[1].steps) === js(lib.stageTable(TABLE).stages[1].steps), js(p0.wip.stages[1].steps)]);
    const before = copy(p0);
    const r1 = apply(B, P, "step-complete", { stage: "S1", stepId: "r1" }, T1);
    c.push(["a leaf: done with the event's time", r1.a.status === 0 && r1.S.result === "ok" && js(stepOf(r1.p, "S1", "r1")) === js({ id: "r1", name: "Tools read", state: "done", finished: T1 }), js([r1.S.result, stepOf(r1.p, "S1", "r1"), r1.S.error])]);
    c.push(["enrich: no", r1.S.enrich === "no", js(r1.S.why)]);
    c.push(["no trail entry, the detail, the step, the glow and every stage's state unchanged", js(r1.p.trail) === js(before.trail) && r1.p.wip.detail === before.wip.detail && r1.p.wip.step === before.wip.step && js(r1.p.wip.current) === js(before.wip.current) && js(r1.p.wip.stages.map(x => [x.state, x.started || null, x.finished || null])) === js(before.wip.stages.map(x => [x.state, x.started || null, x.finished || null])) && js(r1.p.rows.map(r => r.asBuilt)) === js(before.rows.map(r => r.asBuilt)), ""]);
    c.push(["wip.event is the step-complete with its time, no note; wip.updated moves", js(r1.p.wip.event) === js({ name: "step-complete", at: T1 }) && r1.p.wip.updated === T1, js(r1.p.wip.event)]);
    c.push(["no visit frozen", js(r1.p.wip.history) === js(before.wip.history), ""]);
    const r2 = apply(B, P, "step-complete", { stage: "S1", stepId: "r1" }, T2);
    c.push(["the same step again: a duplicate, its first time kept, nothing written", r2.a.status === 0 && r2.S.result === "duplicate" && stepOf(r2.p, "S1", "r1").finished === T1 && r2.p.wip.event.at === T1, js([r2.S.result, r2.S.applied])]);
    const r3 = apply(B, P, "step-complete", { stage: "s2", stepId: "`E2`" }, T2);
    const e2 = stepOf(r3.p, "S2", "e2");
    c.push(["a parent, the ids matched as a stage's (case, backticks): every step under it done with its time", r3.a.status === 0 && e2.state === "done" && e2.finished === T2 && e2.steps.every(s => s.state === "done" && s.finished === T2), js(e2)]);
    c.push(["a step recorded in a stage still to come, kept for it; the stage stays to come", r3.p.wip.stages[1].state === "todo", js(r3.p.wip.stages.map(x => x.state))]);
    c.push(["its parent, with steps still to come, stays as it was", !stepOf(r3.p, "S2", "edits").state, js(stepOf(r3.p, "S2", "edits"))]);
    apply(B, P, "step-complete", { stage: "S2", stepId: "e1" }, T3);
    const r4 = apply(B, P, "step-complete", { stage: "S2", stepId: "e3" }, T4), ed = stepOf(r4.p, "S2", "edits");
    c.push(["the last step closes its parent, with that time", ed.state === "done" && ed.finished === T4 && stepOf(r4.p, "S2", "e1").finished === T3, js(ed)]);
    c.push(["the steps keep their form: id, name, steps, state, finished, in that order", js(Object.keys(ed)) === js(["id", "name", "steps", "state", "finished"]), js(Object.keys(ed))]);
    const pre = rd(path.join(B.dir, "plan.json"));
    const u1 = apply(B, P, "step-complete", { stage: "S7", stepId: "r1" }, "2026-11-12T15:00:00Z");
    c.push(["an unknown stage: a warning naming the ids, nothing written, no refusal", u1.a.status === 0 && u1.S.result === "nothing" && (u1.S.warnings || []).some(w => /^STEP COMPLETE: the board holds no stage "S7" \(its stages: S1, S2, S3\)/.test(w)) && rd(path.join(B.dir, "plan.json")) === pre, js([u1.S.result, u1.S.warnings])]);
    const u2 = apply(B, P, "step-complete", { stage: "S1", stepId: "nope" }, "2026-11-12T15:00:00Z");
    c.push(["an unknown step: a warning, nothing written", u2.a.status === 0 && u2.S.result === "nothing" && (u2.S.warnings || []).some(w => /^STEP COMPLETE: stage S1 holds no step "nope"/.test(w)) && rd(path.join(B.dir, "plan.json")) === pre, js(u2.S.warnings)]);
    const u3 = apply(B, P, "step-complete", { stage: "S1" }, "2026-11-12T15:00:00Z");
    c.push(["no facts.stepId: refused", u3.a.status !== 0 && /facts\.stepId/.test(u3.S.error || ""), js(u3.S.error)]);
    const u4 = apply(B, P, "step-complete", { stage: "S1", stepId: "r2", step: "qa" }, "2026-11-12T15:00:00Z");
    c.push(["a facts.step is ignored: the board's step stays", u4.a.status === 0 && u4.p.wip.step === "implementation" && u4.S.applied.some(x => /facts\.step "qa" ignored/.test(x)), js(u4.S.applied)]);
    const ck = run(CHECK, [B.dir]);
    c.push(["check.js passes the board with its records", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ")]);
  });

  guard("apply-event.js step-complete: a halted run stays halted, a landed board is kept, a sub-issue's tracking board takes its mirror", c => {
    const { B, P } = cut("halted");
    const h = apply(B, P, "halted", { waitingOn: "One answer", detail: "Held." }, T1);
    const r = apply(B, P, "step-complete", { stage: "S1", stepId: "r1" }, T2);
    c.push(["the step recorded while halted", stepOf(r.p, "S1", "r1").state === "done", ""]);
    c.push(["the board stays halted: the wait open, the resume and what it waits on kept, no visit frozen", r.p.wip.step === "halted" && r.p.wip.resume === "implementation" && r.p.wip.waitingOn === h.p.wip.waitingOn && (r.p.wip.waits || []).length === (h.p.wip.waits || []).length && (r.p.wip.waits || []).slice(-1)[0].ended == null && js(r.p.wip.history) === js(h.p.wip.history), js([r.p.wip.step, r.p.wip.waits])]);
    const L = flight({ step: "landed", since: T0, updated: T0, event: { name: "landed", at: T0 }, current: [], stages: [{ id: "S1", name: "Readiness", state: "done", rows: [], steps: [{ id: "r1", name: "r1" }] }] }); L.status = "built";
    const BL = lay("landed", L, false), pre = rd(path.join(BL.dir, "plan.json")), rl = apply(BL, L, "step-complete", { stage: "S1", stepId: "r1" }, T1);
    c.push(["a landed board: a warning, nothing written", rl.a.status === 0 && rl.S.result === "nothing" && (rl.S.warnings || []).some(w => /STEP COMPLETE: S1 r1: the board has landed/.test(w)) && rd(path.join(BL.dir, "plan.json")) === pre, js([rl.S.result, rl.S.warnings])]);
    /* a sub-issue: its tracking board is re-embedded, its mirror carrying the record */
    const TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json"))), SUB = JSON.parse(rd(sk("verify/fixtures/sub-issue.plan.json")));
    const root = path.join(sc, "sub"), tdir = path.join(root, ...TRK.folder.split("/"));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    /* the sub-issue fixture made the tracking fixture's unit in progress, #62 http-core */
    const unit = TRK.rows.find(x => x.unit && x.unit.issue === 62);
    Object.assign(SUB, { issue: 62, slug: "62-http-core", repo: TRK.repo, folder: TRK.folder + "/62-http-core", parent: { issue: TRK.issue, board: "../dashboard.html" } });
    TRK.wip = { ...TRK.wip, current: [unit.id + ".built"], next: "test-support" };
    wr(path.join(tdir, "plan.json"), JSON.stringify(TRK, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), PB);
    const sub = { ...SUB, status: "building", wip: { ...SUB.wip, step: "implementation", since: T0, updated: T0, event: { name: "implementation-stage", at: T0 }, current: ["built"], waitingOn: null, resume: null, stages: [{ id: "S1", name: "One", state: "current", rows: [], steps: [{ id: "a", name: "A" }, { id: "b", name: "B" }] }] } };
    const sdir = path.join(root, ...SUB.folder.split("/")); wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), PB);
    run(EMBED, [sdir]); run(EMBED, [tdir]);
    const rs = apply({ root, dir: sdir }, sub, "step-complete", { stage: "S1", stepId: "a" }, T1), tp2 = JSON.parse(rd(path.join(tdir, "plan.json"))), mir = (tp2.rows.find(x => x.id === unit.id).unit.live || {});
    c.push(["the tracking board re-embedded, its unit's mirror carrying the step's record", rs.a.status === 0 && /re-embedded/.test(rs.S.parent || "") && js(((mir.stages || [])[0] || {}).steps) === js([{ id: "a", name: "A", state: "done", finished: T1 }, { id: "b", name: "B" }]), js([rs.S.result, rs.S.parent, rs.S.error, mir.stages])]);
  });

  /* ---------- 3. a revised table ---------- */
  guard("the records through a revised stage table: kept by id at any depth, dropped with their step; a flat step made a parent takes its record down", c => {
    const { B, P } = cut("revise");
    apply(B, P, "step-complete", { stage: "S2", stepId: "e2a" }, T1);
    apply(B, P, "step-complete", { stage: "S2", stepId: "e1" }, T1);
    apply(B, P, "step-complete", { stage: "S2", stepId: "after" }, T1);
    /* the plan revised: e2a moved out from under e2 to the top, e1 dropped, a new e4 */
    const md = path.join(B.dir, "plan.md"), txt = rd(md).replace("  - `e1`: Issue 1\n", "").replace("    - `e2a`: Its body\n", "").replace("- `after`: The occurrences counted", "- `e2a`: Its body, moved\n- `after`: The occurrences counted\n  - `e4`: A new one");
    wr(md, txt);
    const r = apply(B, P, "implementation-stage", { stages: [{ id: "S1", state: "current" }, { id: "S2", state: "todo" }, { id: "S3", state: "todo" }] }, T2), s2 = r.p.wip.stages[1].steps;
    c.push(["a step moved keeps its record by its id", (s2.find(s => s.id === "e2a") || {}).finished === T1 && (s2.find(s => s.id === "e2a") || {}).name === "Its body, moved", js(s2)]);
    c.push(["a step dropped takes its record with it", !JSON.stringify(s2).includes("\"e1\""), ""]);
    const af = s2.find(s => s.id === "after");
    c.push(["a done step given steps of its own takes them done with its time", af.state === "done" && af.finished === T1 && af.steps[0].state === "done" && af.steps[0].finished === T1, js(af)]);
    const e2 = stepOf(r.p, "S2", "e2");
    c.push(["a step whose last step is now done (e2b left alone, e2a moved out) stays as recorded", !e2.state && e2.steps.length === 1, js(e2)]);
    c.push(["check.js passes", run(CHECK, [B.dir]).status === 0, ""]);
    /* #25: a done stage's flat steps made a nested list, the steps all done */
    const P25 = flight({ step: "halted", resume: "implementation", waitingOn: "the user's answer", detail: "Held at S7.", since: T0, updated: T0, event: { name: "halted", at: T0 }, current: [],
      stages: [{ id: "S1", name: "Readiness", state: "done", rows: [], kind: "check", result: "passed", started: T0, finished: T0, steps: [{ id: "S1.save", name: "The tools saved" }] },
        { id: "S2", name: "Issue texts", state: "done", rows: [], kind: "work", started: T0, finished: T0, steps: [{ id: "S2.texts", name: "The new bodies built" }, { id: "S2.edits", name: "The nineteen edits" }] },
        { id: "S3", name: "The pre-flip gate", state: "current", rows: [], kind: "check", started: T0, steps: [{ id: "S3.reads", name: "The reads" }] }],
      waits: [{ step: "implementation", since: T0, ended: null, by: "halted" }] });
    const T25 = ["", "| id | name | brief | kind | steps |", "|---|---|---|---|---|", "| S1 | Readiness | b | check | S1.save: The tools saved |", "| S2 | Issue texts | b | work | below |", "| S3 | The pre-flip gate | b | check | S3.reads: The reads |", "",
      "**Steps of S2**", "", "- `S2.texts`: The new bodies built", "- `S2.edits`: The nineteen edits", ...Array.from({ length: 19 }, (_, i) => `  - \`S2.edit-${i + 1}\`: Issue ${i + 1}`), ""].join("\n");
    const B25 = lay("revise-25", P25, T25), r25 = apply(B25, P25, "implementation-stage", { detail: "Resumed at S3." }, T1), S2 = r25.p.wip.stages[1];
    c.push(["#25-like: a done stage's steps brought to the nested table at the next implementation-stage, 19 under S2.edits", r25.a.status === 0 && S2.steps[1].steps.length === 19 && S2.state === "done", js([r25.S.result, r25.S.error, S2.steps.map(s => [s.id, (s.steps || []).length])])]);
  });

  /* ---------- 4. implementation-stage mid-stage or halted ---------- */
  guard("an implementation-stage sent mid-stage, or while the run is halted, with the stage states unchanged (RULES §4: any event but cancelled takes a board out of a halt)", c => {
    const { B, P, p: p0 } = cut("mid");
    const same = [{ id: "S1", state: "current" }, { id: "S2", state: "todo" }, { id: "S3", state: "todo" }];
    const m = apply(B, P, "implementation-stage", { stages: same, detail: "Working on S1." }, T1);
    c.push(["mid-stage: no stage closed or opened, no stage's record changed", m.a.status === 0 && js(m.p.wip.stages.map(x => [x.id, x.state, x.started || null, x.finished || null, x.report || null])) === js(p0.wip.stages.map(x => [x.id, x.state, x.started || null, x.finished || null, x.report || null])), js(m.p.wip.stages.map(x => [x.id, x.state, x.started, x.finished]))]);
    c.push(["mid-stage: the step stays implementation, the rows' states unchanged", m.p.wip.step === "implementation" && js(m.p.rows.map(r => r.asBuilt.state)) === js(p0.rows.map(r => r.asBuilt.state)), ""]);
    apply(B, P, "halted", { waitingOn: "One answer", detail: "Held." }, T2);
    const h = apply(B, P, "implementation-stage", { stages: same, detail: "Still at S1." }, T3);
    c.push(["while halted: no stage closed or opened", h.a.status === 0 && js(h.p.wip.stages.map(x => [x.state, x.finished || null])) === js(p0.wip.stages.map(x => [x.state, x.finished || null])), js(h.p.wip.stages.map(x => [x.state, x.finished]))]);
    /* the rule other rules rest on: the event that takes a board out of a stop is resumed or any other but cancelled (plan/RULES.md §4, the halted row) */
    c.push(["while halted: the report takes the board out of the halt (step implementation, the wait ended), as RULES §4 says of any event but cancelled", h.p.wip.step === "implementation" && (h.p.wip.waits || []).slice(-1)[0].ended === T3 && !h.p.wip.resume, js([h.p.wip.step, h.p.wip.resume, (h.p.wip.waits || []).slice(-1)[0]])]);
  });

  /* ---------- 5. check.js and fill.js ---------- */
  guard("check.js holds a step's record to its form; a fill keeps the records", c => {
    const base = () => flight({ step: "implementation", since: T0, updated: T0, event: { name: "implementation-stage", at: T0 }, current: ["built"], stages: [{ id: "S1", name: "One", state: "current", rows: [], steps: [{ id: "a", name: "A", steps: [{ id: "b", name: "B" }] }] }] });
    const ckWith = (name, mut) => { const x = base(); mut(x.wip.stages[0].steps); const Bx = lay("ck-" + name, x, false), r = run(CHECK, [Bx.dir]); return { ok: r.status === 0, fails: (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ") }; };
    const good = ckWith("good", s => { s[0].steps[0].state = "done"; s[0].steps[0].finished = T0; });
    c.push(["a nested step done with its time passes", good.ok, good.fails]);
    const cur = ckWith("cur", s => { s[0].state = "current"; });
    c.push(["a stored state other than done fails", !cur.ok && /\.state is only "done"/.test(cur.fails), cur.fails]);
    const nof = ckWith("nofin", s => { s[0].steps[0].state = "done"; });
    c.push(["done with no finished time fails", !nof.ok && /is done and records no finished time/.test(nof.fails), nof.fails]);
    const fin = ckWith("fin", s => { s[0].finished = T0; });
    c.push(["a finished time on a step not done fails", !fin.ok && /finished is recorded on a step that is not done/.test(fin.fails), fin.fails]);
    const bad = ckWith("bad", s => { s[0].steps[0] = { id: "b" }; });
    c.push(["a nested step out of its form fails", !bad.ok && /\.steps must be the stage table's steps, each \{ id, name \}.*steps\[0\]\.steps\[0\] is not/.test(bad.fails), bad.fails]);
    /* a fill naming the stage's rows keeps its steps' records */
    const x = base(); x.wip.stages[0].steps[0].steps[0].state = "done"; x.wip.stages[0].steps[0].steps[0].finished = T0; x.wip.stages[0].steps[0].state = "done"; x.wip.stages[0].steps[0].finished = T0;
    const Bf = lay("fill", x, false), F = wr(path.join(sc, "fill-fields.json"), js({ wip: { stages: [{ id: "S1", rows: [x.rows[0].id] }] } })), fr = run(FILL, [Bf.dir, "--fields", F, "--root", Bf.root, "--json"]), fp = JSON.parse(rd(path.join(Bf.dir, "plan.json")));
    c.push(["a fill keeps the steps' records", fr.status === 0 && js(fp.wip.stages[0].steps) === js(x.wip.stages[0].steps) && js(fp.wip.stages[0].rows) === js([x.rows[0].id]), js([fr.status, (fr.stdout || fr.stderr).slice(-300), fp.wip.stages[0]])]);
  });

  /* ---------- 7. the implementer's own events (rookie-dev.md, "Board events"; the user's decision of 2026-11-12): a stage's closing the moment it ends,
     the next stage's steps after it, the tests per stage, a repeated closing, late events stamped at their arrival ---------- */
  guard("the implementer's events: a closing between step events, the closings mid-run, the tests per stage, a repeated closing, late events in a row", c => {
    const { B, P } = cut("implementer");
    const st = (p, id) => p.wip.stages.find(x => x.id === id);
    const tc = (cls, rows) => ({ class: "com.spartanlabs.testing.component.udp." + cls, module: "webtools-udp", tests: 2, rows });
    const rowId = P.rows[0].id;
    /* S1 closed by the implementer, S2 current, with S1's tests */
    const k1 = apply(B, P, "implementation-stage", { stage: "S1", detail: "S1: the tools read.", stages: [{ id: "S1", state: "done" }, { id: "S2", state: "current" }, { id: "S3", state: "todo" }], tests: { base: "master", added: [tc("OneTest", [rowId])] } }, T1);
    c.push(["a closing: the stage finished with its report, the next started, the detail", k1.a.status === 0 && st(k1.p, "S1").finished === T1 && st(k1.p, "S1").report === "S1: the tools read." && st(k1.p, "S2").started === T1 && k1.p.wip.detail === "S1: the tools read." && k1.p.wip.step === "implementation", js([k1.S.error, st(k1.p, "S1"), st(k1.p, "S2").started])]);
    /* the implementer runs ahead: S3's steps recorded while S2 still shows current */
    apply(B, P, "step-complete", { stage: "S3", stepId: "S3.read" }, "2026-11-12T11:10:00Z");
    apply(B, P, "step-complete", { stage: "S2", stepId: "texts" }, "2026-11-12T11:20:00Z");
    /* S2's closing, the next stage current, with S2's tests and its report */
    const k2 = apply(B, P, "implementation-stage", { stage: "S2", detail: "S2: the bodies edited.", stages: [{ id: "S1", state: "done" }, { id: "S2", state: "done" }, { id: "S3", state: "current" }], tests: { added: [tc("TwoTest", [rowId])] } }, T2);
    c.push(["S3's step recorded before S2 closed is kept through the closing's merge", (stepOf(k2.p, "S3", "S3.read") || {}).finished === "2026-11-12T11:10:00Z", js(st(k2.p, "S3").steps)]);
    c.push(["S2's own step kept, the closing stamping the stage alone", (stepOf(k2.p, "S2", "texts") || {}).finished === "2026-11-12T11:20:00Z" && st(k2.p, "S2").finished === T2 && st(k2.p, "S3").started === T2, js(st(k2.p, "S2"))]);
    const cls = ((k2.p.tests || {}).added || []).map(x => x.class.split(".").pop()).sort();
    c.push(["the tests accumulate per stage: S1's class kept beside S2's", js(cls) === js(["OneTest", "TwoTest"]), js(cls)]);
    const k3 = apply(B, P, "step-complete", { stage: "S3", stepId: "S3.count" }, "2026-11-12T12:10:00Z");
    c.push(["more of S3's steps after it: both recorded, nothing lost", (stepOf(k3.p, "S3", "S3.read") || {}).state === "done" && (stepOf(k3.p, "S3", "S3.count") || {}).state === "done", js(st(k3.p, "S3").steps)]);
    /* a repeated closing of S2, sent by the run on its return, with the stages as the board has them */
    const k4 = apply(B, P, "implementation-stage", { stage: "S2", detail: "S2 done (the run's own report).", stages: [{ id: "S1", state: "done" }, { id: "S2", state: "done" }, { id: "S3", state: "current" }] }, "2026-11-12T12:20:00Z");
    c.push(["a repeated closing leaves the stage's finished and report as they are", st(k4.p, "S2").finished === T2 && st(k4.p, "S2").report === "S2: the bodies edited." && st(k4.p, "S3").started === T2, js(st(k4.p, "S2"))]);
    c.push(["… and every step's record", js(k4.p.wip.stages.map(x => x.steps)) === js(k3.p.wip.stages.map(x => x.steps)), ""]);
    /* the last stage's closing, a check, from the implementer: its result, and the step stays implementation until the qa-pass running */
    const k5 = apply(B, P, "implementation-stage", { stage: "S3", detail: "S3: every link read back.", result: "passed", stages: [{ id: "S1", state: "done" }, { id: "S2", state: "done" }, { id: "S3", state: "done" }] }, T3);
    c.push(["the last closing: its result, and the step stays implementation", st(k5.p, "S3").result === "passed" && st(k5.p, "S3").finished === T3 && k5.p.wip.step === "implementation", js([k5.p.wip.step, st(k5.p, "S3")])]);
    /* late events, each stamped at the same arrival time, in a row */
    const L = cut("late"), A = "2026-11-12T15:00:00Z", arr = ["--arrived", A];
    const mk = (ev, facts) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: L.P.repo, issue: L.P.issue, event: ev, folder: L.P.folder, facts })); const a = run(APPLY, ["--event", rq, "--worktree", L.B.root, "--no-gh", "--no-live", "--json", ...arr]); return { S: parse(a), p: JSON.parse(rd(path.join(L.B.dir, "plan.json"))) }; };
    const l1 = mk("step-complete", { stage: "S1", stepId: "r1", at: "2026-11-12T13:00:00Z" }), l2 = mk("step-complete", { stage: "S1", stepId: "r2", at: "2026-11-12T13:30:00Z" });
    const l3 = mk("implementation-stage", { stage: "S1", detail: "S1 done.", stages: [{ id: "S1", state: "done" }, { id: "S2", state: "current" }, { id: "S3", state: "todo" }], at: "2026-11-12T13:40:00Z" });
    const l4 = mk("step-complete", { stage: "S2", stepId: "texts", at: "2026-11-12T14:00:00Z" });
    c.push(["late events in a row at one arrival time: each applied, none read as a duplicate", [l1, l2, l3, l4].every(x => x.S.result === "ok"), js([l1, l2, l3, l4].map(x => [x.S.result, x.S.arrival]))]);
    c.push(["… each stamped at the arrival, every record kept", stepOf(l4.p, "S1", "r1").finished === A && stepOf(l4.p, "S1", "r2").finished === A && st(l4.p, "S1").finished === A && stepOf(l4.p, "S2", "texts").finished === A && st(l4.p, "S2").state === "current", js(l4.p.wip.stages.map(x => [x.id, x.state, x.finished]))]);
    c.push(["check.js passes both boards", run(CHECK, [B.dir]).status === 0 && run(CHECK, [L.B.dir]).status === 0, ""]);
  });

  /* ---------- 6. the template's steps block, in a vm ---------- */
  guard("the template's steps block (no browser): the numbers, the marks, the count Labels, the Disclosures, the finished view, the Legend", c => {
    const m = /\/\* -{10} A stage's steps, nested[\s\S]*?\/\* \[\/steps-block\] \*\//.exec(PB);
    c.push(["the template holds the steps block", !!m, ""]); if (!m) return;
    const ctx = { DISC_OPEN: new Map(), PROG: {}, KEY_DISC: "KEY_DISC" }; vm.createContext(ctx);
    [/^const esc=.*$/m, /^const codeOnly=.*$/m, /^const discKey=.*$/m, /^const KEY_STEP=.*$/m].forEach(re => { const x = re.exec(PB); if (!x) throw new Error("template: " + re); vm.runInContext(x[0].replace(/^const /, "var "), ctx); });
    vm.runInContext(m[0].replace(/^const /mg, "var "), ctx);
    const draw = (x, mode, o, no) => { const keys = new Set(); ctx.__a = [x, { issue: 38, ...(o || {}) }, keys, no, mode]; const h = vm.runInContext("stageStepsHtml(...__a)", ctx); return { h, keys: [...keys] }; };
    const ids = h => [...h.matchAll(/<b class="id">([^<]+)<\/b>/g)].map(x => x[1]), lis = h => [...h.matchAll(/<li class="(\w+)"/g)].map(x => x[1]);
    const nineteen = Array.from({ length: 19 }, (_, i) => ({ id: "e" + (i + 1), name: "Issue " + (i + 1) }));
    const S2 = { id: "S2", name: "Texts", state: "current", steps: [{ id: "texts", name: "Texts" }, { id: "gate", name: "Gate" }, { id: "edits", name: "The `nineteen` edits", steps: nineteen }, { id: "after", name: "After" }] };
    /* numbering */
    const d0 = draw(copy(S2), "cur", {}, 2);
    c.push(["#25-like: 2-1, 2-2, 2-3, 2-3-1 … 2-3-19, 2-4, the names beside them, the ids not drawn", js(ids(d0.h)) === js(["2-1", "2-2", "2-3", ...nineteen.map((_, i) => "2-3-" + (i + 1)), "2-4"]) && !/>texts</.test(d0.h) && /The <code>nineteen<\/code> edits/.test(d0.h), js(ids(d0.h).slice(0, 5))]);
    const d1 = draw({ id: "S0", name: "Zero", state: "current", steps: [{ id: "a", name: "A" }, { id: "b", name: "B", steps: [{ id: "c", name: "C" }] }] }, "cur", {}, 1);
    c.push(["a plan starting at S0: S0 numbered 1", js(ids(d1.h)) === js(["1-1", "1-2", "1-2-1"]), js(ids(d1.h))]);
    /* marks: from the records, no note: the first leaf not done, every step it lies under */
    const rec = copy(S2); rec.steps[0].state = "done"; rec.steps[0].finished = T0; rec.steps[1].state = "done"; rec.steps[1].finished = T0; rec.steps[2].steps.slice(0, 11).forEach(s => { s.state = "done"; s.finished = T0; });
    const d2 = draw(rec, "cur", {}, 2), L2 = lis(d2.h);
    c.push(["from the records with no note: done, done, the parent at work, eleven done, 2-3-12 at work, the rest to come", L2[0] === "done" && L2[1] === "done" && L2[2] === "cur" && L2.slice(3, 14).every(x => x === "done") && L2[14] === "cur" && L2.slice(15).every(x => x === "todo"), js(L2)]);
    c.push(["the parent's count Label: \"11 of 19 done · at 2-3-12\", open while the step at work is under it", /<span class="count-label"><b>11<\/b> of 19 done · at 2-3-12<\/span>/.test(d2.h) && /data-key="live:38:stage:S2:step:S2\/edits" open/.test(d2.h), (/count-label">[^]*?<\/span>/.exec(d2.h) || [""])[0]]);
    c.push(["the step at work aria-current, each state said to a screen reader", (d2.h.match(/aria-current="step"/g) || []).length === 2 && /class="stp-st">, at work</.test(d2.h) && /class="stp-st">, done</.test(d2.h), ""]);
    /* a live note names a step */
    ctx.PROG = { 38: { "rookie-dev-1": { step: "E15" } } };
    const d3 = draw(rec, "cur", {}, 2), L3 = lis(d3.h); ctx.PROG = {};
    c.push(["from a note: the step it names (its id's case aside) and its parent at work, the first not done to come", L3[2] === "cur" && L3[14] === "todo" && L3[17] === "cur" && /at 2-3-15/.test(d3.h), js(L3)]);
    /* "19 steps" while none is done or at work, and closed */
    const fresh = copy(S2); fresh.steps[0].state = "done"; fresh.steps[0].finished = T0;
    const d4 = draw(fresh, "cur", {}, 2);
    c.push(["a parent with none of its steps done or at work: \"19 steps\", closed; the step at work is 2-2", /<b>19<\/b> steps<\/span>/.test(d4.h) && /data-key="live:38:stage:S2:step:S2\/edits">/.test(d4.h) && lis(d4.h)[1] === "cur", js(lis(d4.h).slice(0, 3))]);
    /* a step at work under it and none done: "0 of 19 done", the figure muted */
    const zero = copy(S2); ["texts", "gate"].forEach((id, i) => { zero.steps[i].state = "done"; zero.steps[i].finished = T0; });
    const dz = draw(zero, "cur", {}, 2);
    c.push(["none done, one at work: \"0 of 19 done · at 2-3-1\", the figure muted at zero", /<span class="count-label zero"><b>0<\/b> of 19 done · at 2-3-1<\/span>/.test(dz.h), (/count-label[^>]*>[^]*?<\/span>/.exec(dz.h) || [""])[0]]);
    /* the reader's choice survives */
    ctx.DISC_OPEN.set("live:38:stage:S2:step:S2/edits", true); const d5 = draw(fresh, "cur", {}, 2); ctx.DISC_OPEN.clear();
    c.push(["the reader's choice survives the redraw", /data-key="live:38:stage:S2:step:S2\/edits" open/.test(d5.h), ""]);
    /* a done stage */
    const d6 = draw({ ...copy(S2), state: "done" }, "done", {}, 2);
    c.push(["a done stage: \"Its steps\", every one done, \"19 of 19 done\", closed", /<div class="stg-h">Its steps<\/div>/.test(d6.h) && lis(d6.h).every(x => x === "done") && /<b>19<\/b> of 19 done<\/span>/.test(d6.h) && !/ open>/.test(d6.h), js(lis(d6.h).slice(0, 4))]);
    /* a stage to come */
    const d7 = draw({ ...copy(S2), state: "todo" }, "todo", {}, 3);
    c.push(["a stage to come: its steps listed, unmarked, numbered by its own place, closed", lis(d7.h).every(x => x === "unk") && ids(d7.h)[0] === "3-1" && !/ open>/.test(d7.h) && /<b>19<\/b> steps/.test(d7.h), js(lis(d7.h).slice(0, 4))]);
    /* the implementer ahead of the run: the current stage's steps all done, the next stage's first steps recorded */
    const ahead = { id: "S1", name: "One", state: "current", steps: [{ id: "a", name: "A", state: "done", finished: T0 }, { id: "b", name: "B", state: "done", finished: T1 }] };
    const next = { ...copy(S2), state: "todo" }; next.steps[0].state = "done"; next.steps[0].finished = T2;
    const d8 = draw(ahead, "cur", {}, 1), d9 = draw(next, "todo", {}, 2);
    c.push(["the implementer ahead of the run: the current stage's steps all done, none at work", lis(d8.h).every(x => x === "done") && !/aria-current/.test(d8.h), js(lis(d8.h))]);
    c.push(["… and the next stage, still to come, draws its recorded step done, the rest unmarked", lis(d9.h)[0] === "done" && lis(d9.h).slice(1).every(x => x === "unk"), js(lis(d9.h).slice(0, 4))]);
    /* a halted run: the Ring alone's key */
    const d10 = draw(rec, "cur", { held: true }, 2);
    c.push(["the Legend: the marks drawn, the held key while the run waits, the Disclosure's", d10.keys.some(k => /sdot held/.test(k)) && !d10.keys.some(k => /sdot cur/.test(k)) && d10.keys.includes("KEY_DISC") && d2.keys.some(k => /sdot cur/.test(k)) && d2.keys.some(k => /sdot todo/.test(k)) && d7.keys.some(k => /sdot unk/.test(k)) && !d7.keys.some(k => /sdot todo/.test(k)), js(d10.keys.length)]);
    const leafOnly = draw({ id: "S1", name: "One", state: "current", steps: [{ id: "a", name: "A" }] }, "cur", {}, 1);
    c.push(["a leaf a plain row, no Disclosure, no Disclosure key", !/<details/.test(leafOnly.h) && !leafOnly.keys.includes("KEY_DISC") && /<div class="stp">/.test(leafOnly.h), leafOnly.h.slice(0, 160)]);
    /* the finished view and the live panel, by the stage's state (stageBody()'s line) */
    const line = /\{ const mode=x\.state==="done"\?"done":o\.past\?null:x\.state==="current"\?"cur":"todo"; if\(mode\) h\+=stageStepsHtml\(x,o,keys,o\.no\|\|1,mode\); \}/.exec(PB);
    c.push(["stageBody(): steps in every state of the live panel; in a finished view only a done stage's", !!line, ""]);
    const modeOf = (state, past) => vm.runInNewContext('x.state==="done"?"done":o.past?null:x.state==="current"?"cur":"todo"', { x: { state }, o: { past } });
    c.push(["… done, current, to come live; done, nothing, nothing finished", js(["done", "current", "todo"].map(s => modeOf(s, false))) === js(["done", "cur", "todo"]) && js(["done", "current", "todo"].map(s => modeOf(s, true))) === js(["done", null, null]), ""]);
    c.push(["stageItems() gives each stage its number", /body:stageBody\(R,x,\{\.\.\.o,no:i\+1\},keys\)/.test(PB), ""]);
  });
  return groups;
};
if (require.main === module) { /* on its own, with no browser */
  const out = (() => { const i = process.argv.indexOf("--out"); return i >= 0 ? process.argv[i + 1] : path.join(os.tmpdir(), "cases-nested-steps"); })();
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, p);
  const gs = module.exports({ sk, out, targets: [] }); let bad = 0;
  gs.forEach(([t, cs]) => { const f = cs.filter(x => !x[1]); bad += f.length; console.log(`${f.length ? "FAILED  " : "checked "} ${t}: ${cs.length - f.length}/${cs.length} cases`); f.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
