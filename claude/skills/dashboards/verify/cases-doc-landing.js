// The cases of admin-team/dashboards-skill/doc-landing-and-view-follow, run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-doc-landing.js [--out <dir>]. The Document step's last task, document-landing, the team's (plan/RULES.md §4, "document"): to come from the list's
// start, current once the state boards finish, done just before the commit, never undone by a run's list, closed by the land, and a board without it left alone. A view
// copy not yet landed seeded as it stands, kept by board.js --live, and the event reseed bringing the finished state at the refresh's end, the run's wip untouched (plan/RULES.md §4, "Seeding at sized"). A fill's
// impact.units merged by unit and impact.changes by what each names, so a concurrent entry stays (plan/scripts/fill.js). The landed summary's enrich: no when no work is
// left. The tracked board's follow of its view copy, statically: the template's planStampOf() against lib.js planStamp(), and the feature probe; in a browser it is
// verify/browser-view-follow.js. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesDocLanding(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the document-landing and view-copy cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), BOARD = sk("plan/scripts/board.js"), FILL = sk("plan/scripts/fill.js");
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), { mergeFill } = require(sk("plan/scripts/fill.js"));
  const sc = path.join(out, "doc-landing"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const SIX = ["documentation-review", "reconcile-documentation", "dokka-check", "reconcile-plan", "readme-changelog", "state-boards"];
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "qa", current: ["built"], questions: [], research: null, open: [], qa: [], event: { name: "implementation-stage", at: "2026-10-26T08:00:00Z" }, steps: STEPS }; return x; };
  const tree = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk("plan/examples/38-handshake-empty-name")).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk("plan/examples/38-handshake-empty-name/" + f), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir], { env }); return { root, dir, folder: plan.folder }; };
  const evIn = T => (name, at, facts, extra) => { const rq = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: EX.repo, issue: T.issue || EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--at", at, "--json", ...(extra || [])], { env }); return { a, S: parse(a), p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const tasks = p => ((p.wip.document || {}).tasks || []), stateOf = (p, id) => (tasks(p).find(t => t.id === id) || {}).state;
  const at = m => `2026-10-26T${String(9 + Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00Z`;

  guard("the Document step's document-landing task: the team's, after State boards, a run's list never undoing it", c => {
    const T = tree("task", building()), ev = evIn(T);
    const e1 = ev("document", at(0), { tasks: SIX.map((id, i) => ({ id, state: i ? "todo" : "current" })) });
    c.push(["a run's six tasks: the board lists seven, Document commit last, to come, and not every task done", e1.a.status === 0 && js(tasks(e1.p).map(t => t.id)) === js([...SIX, "document-landing"]) && stateOf(e1.p, "document-landing") === "todo" && tasks(e1.p)[6].name === "Document commit" && /0 of 7 tasks done/.test(e1.p.wip.detail || "") && e1.S.enrich === "no", js([e1.a.status, tasks(e1.p), e1.p.wip.detail, e1.S.enrich, e1.S.why])]);
    const e2 = ev("document", at(1), { tasks: SIX.map(id => ({ id, state: id === "state-boards" ? "current" : "done" })) });
    const e3 = ev("state-boards", at(2));
    c.push(["state-boards accepted: its task current, the commit still to come", e3.a.status === 0 && stateOf(e3.p, "state-boards") === "current" && stateOf(e3.p, "document-landing") === "todo", js(tasks(e3.p))]);
    const e4 = ev("state-boards", at(3), { done: true });
    c.push(["state-boards with facts.done: its task done, the commit current, the step staying at document, the detail naming it", e4.a.status === 0 && stateOf(e4.p, "state-boards") === "done" && stateOf(e4.p, "document-landing") === "current" && e4.p.wip.step === "document" && /Document commit current/.test(e4.p.wip.detail || ""), js([tasks(e4.p), e4.p.wip.detail])]);
    const e5 = ev("document", at(4), { tasks: SIX.map(id => ({ id, state: "done" })) });
    c.push(["a run's document event after it, six tasks: the commit stays current", e5.a.status === 0 && stateOf(e5.p, "document-landing") === "current" && /6 of 7 tasks done/.test(e5.p.wip.detail || ""), js([tasks(e5.p), e5.p.wip.detail])]);
    const e5b = ev("document", at(5), { tasks: [{ id: "state-boards", state: "current" }, { id: "document-landing", state: "todo" }] });
    c.push(["a stale list naming either of the team's tasks at an earlier state: neither moves back", stateOf(e5b.p, "state-boards") === "done" && stateOf(e5b.p, "document-landing") === "current", js(tasks(e5b.p))]);
    const e6 = ev("document", at(6), { tasks: [{ id: "document-landing", state: "done" }] });
    c.push(["the team's document event naming it done: closed, every task done, on the fast path", e6.a.status === 0 && stateOf(e6.p, "document-landing") === "done" && /7 of 7 tasks done; every task done/.test(e6.p.wip.detail || "") && e6.p.wip.step === "document" && e6.S.enrich === "no", js([tasks(e6.p), e6.p.wip.detail, e6.S.enrich])]);
    const was = rd(path.join(T.dir, "plan.json")), e6b = ev("document", at(6), { tasks: [{ id: "document-landing", state: "done" }] });
    c.push(["raised again at its own time: a duplicate, nothing written", e6b.S.result === "duplicate" && rd(path.join(T.dir, "plan.json")) === was, js([e6b.S.result, e6b.S.applied])]);
    const e7 = ev("document", at(7), { tasks: SIX.map(id => ({ id, state: "done" })) });
    c.push(["a run's six-task list after that: the commit stays done", stateOf(e7.p, "document-landing") === "done", js(tasks(e7.p))]);
    const e8 = ev("state-boards", at(8));
    c.push(["the state boards raised anew (the base moved): the commit is to come again", stateOf(e8.p, "state-boards") === "current" && stateOf(e8.p, "document-landing") === "todo", js(tasks(e8.p))]);
    const e9 = ev("state-boards", at(9), { done: true });
    c.push(["…and current again when they finish", stateOf(e9.p, "state-boards") === "done" && stateOf(e9.p, "document-landing") === "current", js(tasks(e9.p))]);
    const e10 = ev("landing", at(10), { pr: 91 });
    c.push(["the land closes a task still open, the frozen Document step reading it done", e10.a.status === 0 && stateOf(e10.p, "document-landing") === "done" && ((e10.p.wip.history || {}).document || []).some(v => (v.document || {}).tasks && v.document.tasks.find(t => t.id === "document-landing").state === "done"), js([e10.a.status, e10.S.check, tasks(e10.p), e10.S.applied])]);
  });

  guard("the document-landing task: an unknown task before it, no tasks reported, a board without it", c => {
    const T = tree("task2", building()), ev = evIn(T);
    const e0 = ev("document", at(0), {});
    c.push(["no tasks reported: none listed, and the summary says so", tasks(e0.p).length === 0 && e0.S.enrich === "yes", js([tasks(e0.p), e0.S.why])]);
    const e1 = ev("document", at(1), { tasks: [{ id: "state-boards", state: "todo" }, { id: "site-check", name: "Site check", state: "current" }] });
    c.push(["a task of another id stands after the known ones and before the commit", js(tasks(e1.p).map(t => t.id)) === js(["state-boards", "site-check", "document-landing"]), js(tasks(e1.p))]);
    const six = building(); six.wip.step = "document"; six.wip.document = { tasks: SIX.map(id => ({ id, name: lib.DOC_TASK_NAMES[id], state: "done" })) };
    const T2 = tree("task3", six), ev2 = evIn(T2);
    const c0 = run(sk("plan/scripts/check.js"), [T2.dir], { env });
    c.push(["a board with six tasks and no such task checks as before", c0.status === 0, (c0.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ")]);
    const e2 = ev2("landing", at(0), { pr: 91 });
    c.push(["…and lands keeping its six", e2.a.status === 0 && e2.p.wip.step === "landing" && tasks(e2.p).length === 6, js([e2.a.status, e2.S.check, tasks(e2.p)])]);
    const six2 = building(); six2.wip.step = "document"; six2.wip.document = { tasks: SIX.map(id => ({ id, name: lib.DOC_TASK_NAMES[id], state: "done" })) };
    const e3 = evIn(tree("task4", six2))("document", at(0), { tasks: [{ id: "readme-changelog", state: "done" }] });
    c.push(["a board in flight with six tasks done takes it at its next document event, current", stateOf(e3.p, "document-landing") === "current" && tasks(e3.p).length === 7, js(tasks(e3.p))]);
  });

  /* a repository with a tracking board and a merged unit; the sub-issue's copy raised landed with its parts still to resolve */
  const seedTree = (name) => {
    const main = path.join(sc, name), tdir = path.join(main, "docs", "plans", "55-http-client-stack"), sdir = path.join(tdir, "47-java-23-bytecode");
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const sub = copy(EX); Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: "docs/plans/55-http-client-stack/47-java-23-bytecode", parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
    delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built");
    sub.wip = { ...sub.wip, step: "document", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: ["built"], questions: [], research: null, open: [], event: { name: "document", at: "2026-10-26T09:20:00Z" }, steps: STEPS };
    sub.rows[0].asBuilt = { state: "pending", summary: "" }; delete sub.rows[0].asBuilt.statements;
    const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    run(EMBED, [sdir], { env }); run(EMBED, [tdir], { env });
    /* the next unit's board, laid ahead of its run */
    const nd = path.join(tdir, "62-http-core"), nu = copy(LIVE); Object.assign(nu, { issue: 62, slug: "62-http-core", folder: "docs/plans/55-http-client-stack/62-http-core", parent: { issue: 55 }, issueTitle: "Verification case #62", status: "planned" });
    nu.wip = { ...nu.wip, step: null, current: [], event: { name: "boards-created", at: "2026-10-26T08:00:00Z" }, updated: "2026-10-26T08:00:00Z", history: {} };
    wr(path.join(nd, "plan.json"), JSON.stringify(nu, null, 2) + "\n"); wr(path.join(nd, "dashboard.html"), rd(PB)); run(EMBED, [nd], { env });
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the merge");
    return { main, tdir, sdir, sub, M: (git(main, "rev-parse", "HEAD").stdout || "").trim(),
      vS: path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode"), vT: path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack") };
  };
  const raise = (B, ev, issue, folder, facts, atT, extra) => { const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: B.sub.repo, ...(issue ? { issue } : {}), event: ev, ...(folder ? { folder } : {}), repo: B.main, facts: facts || {} }));
    const a = run(APPLY, ["--event", q, "--no-gh", "--at", atT, "--json", ...extra], { env }); return { a, S: parse(a) }; };
  const landedAt = (B, atT) => raise(B, "landed", 47, B.sub.folder, { pr: 90, sha: B.M, merge: B.M, date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" }, atT, ["--worktree", B.main, "--main", B.main, "--no-live", "--view"]);
  const sized = (B, wt, atT) => raise(B, "sized", 62, "docs/plans/55-http-client-stack/62-http-core", { step: "plan" }, atT, ["--worktree", wt, "--main", B.main]);

  const reseed = (B, atT, extra) => { const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: B.sub.repo, event: "reseed", facts: {} })); const a = run(APPLY, ["--event", q, "--worktree", B.main, "--main", B.main, "--no-gh", "--at", atT, "--json", ...(extra || [])], { env }); return { a, S: parse(a) }; };
  const P = (d) => JSON.parse(rd(path.join(d, "plan.json")));
  const finish = B => { /* the refresh's enrichment on the copies, through fill.js: the part resolved, the unit's row and its impact on the tracking board's copy; then landed again */
    const v = P(B.vS), f1 = wr(path.join(sc, `f-${++n}.json`), js({ rows: [{ id: v.rows[0].id, asBuilt: copy(EX.rows[0].asBuilt) }] })), a1 = run(FILL, [B.vS, "--fields", f1, "--json"], { env });
    const vt = P(B.vT), row = vt.rows.find(r => r.unit && r.unit.issue === 47);
    const f2 = wr(path.join(sc, `f-${++n}.json`), js({ rows: [{ id: row.id, asBuilt: { summary: "Verification case: the unit's summary from its documents." } }], impact: { units: [{ unit: row.id, basis: "as-built", summary: "Verification case: its impact." }], changes: [{ unit: row.id, when: "#47 landing", none: true }] } })), a2 = run(FILL, [B.vT, "--fields", f2, "--json"], { env });
    return { a1, a2, rowId: row.id }; };

  guard("the race: a sized during the refresh seeds at once, the copy kept; reseed brings the finished state, the run's wip left alone (a run in the main checkout)", c => {
    const B = seedTree("seed-race");
    const l = landedAt(B, "2026-10-26T09:30:00Z"), vp = P(B.vS);
    c.push(["landed with a part pending: the copy records the merge and stays at merge, not built, and the summary says what is left", l.a.status === 0 && vp.status !== "built" && vp.wip.step === "merge" && lib.landedPending(vp) && l.S.enrich === "yes" && /still to resolve/.test((l.S.why || []).join(" ")), js([l.a.status, vp.status, vp.wip.step, l.S.why, l.S.check])]);
    const s = sized(B, B.main, "2026-10-26T10:00:00Z"), ts = P(B.sdir);
    c.push(["the sized seeds at once, the copy as it stands: the tracked sub-issue at its merge, its parts pending", s.a.status === 0 && (s.S.seeded || []).some(x => /47-java-23-bytecode/.test(x)) && lib.landedPending(ts) && (ts.asBuilt || {}).merge === B.M, js([s.a.status, s.S.seeded, ts.status, s.S.error, s.S.check])]);
    c.push(["…the summary warns and names it", (s.S.warnings || []).some(w => /VIEW COPY NOT YET LANDED: 55-http-client-stack\/47-java-23-bytecode seeded as it stands .* raise reseed/.test(w)), js(s.S.warnings)]);
    c.push(["…and the copies stay for the enrichment, the tracking board's too", fs.existsSync(path.join(B.vS, "plan.json")) && fs.existsSync(path.join(B.vT, "plan.json")), js([fs.existsSync(path.join(B.vS, "plan.json")), fs.existsSync(path.join(B.vT, "plan.json")), s.S.live])]);
    /* the new run's event writes the tracking board's wip */
    const h = raise(B, "research-planning", 62, "docs/plans/55-http-client-stack/62-http-core", { drafted: 1 }, "2026-10-26T10:05:00Z", ["--worktree", B.main, "--main", B.main]);
    const W0 = P(B.tdir).wip;
    const fi = finish(B);
    c.push(["the enrichment still has its target: fill.js on both copies merges", fi.a1.status === 0 && parse(fi.a1).fill === "ok" && fi.a2.status === 0 && parse(fi.a2).fill === "ok", (fi.a1.stdout + fi.a2.stdout).slice(0, 500)]);
    const l2 = landedAt(B, "2026-10-26T10:10:00Z"), vp2 = P(B.vS), vt2 = P(B.vT), vr = vt2.rows.find(r => r.id === fi.rowId);
    c.push(["landed raised again: the copy built, the fills kept, the tracking copy's too (both read from the copies, which tie or trail their tracked boards)", l2.a.status === 0 && vp2.status === "built" && vp2.wip.step === "landed" && vp2.rows[0].asBuilt.state === EX.rows[0].asBuilt.state && /from its documents/.test((vr.asBuilt || {}).summary || ""), js([l2.a.status, vp2.status, l2.S.check, l2.S.error, vr.asBuilt])]);
    /* the defect of WebTools #67's refresh: once both copies were finished, any board.js --live before the reseed (the landed raised again, a racing run's event)
       removed them, as they tie or trail their tracked boards and nothing was left unfinished, so the reseed found nothing to bring */
    const lv = run(BOARD, ["--live", "--no-gh", "--root", B.main], { env });
    c.push(["board.js --live before the reseed keeps both finished copies while the tracked sub-issue is the seed's, unfinished", lv.status === 0 && fs.existsSync(path.join(B.vS, "plan.json")) && fs.existsSync(path.join(B.vT, "plan.json")) && lib.landedPending(P(B.sdir)), js([lv.status, fs.existsSync(path.join(B.vS, "plan.json")), fs.existsSync(path.join(B.vT, "plan.json")), (lv.stdout || lv.stderr).slice(-300)])]);
    const pre = P(B.tdir), other = js(pre.rows.filter(r => r.id !== fi.rowId));
    const r = reseed(B, "2026-10-26T10:20:00Z"), got = P(B.sdir), trk = P(B.tdir), row = trk.rows.find(x => x.id === fi.rowId);
    c.push(["reseed: the tracked sub-issue takes the copy whole, built at its merge", r.a.status === 0 && r.S.result === "ok" && got.status === "built" && got.wip.step === "landed" && (got.asBuilt || {}).merge === B.M && got.rows[0].asBuilt.state === EX.rows[0].asBuilt.state, js([r.a.status, r.S.result, got.status, r.S.check, r.S.error, r.S.seeded])]);
    c.push(["…the tracking board takes the landing's part: the row, the impact entry, the effect", (row.asBuilt || {}).state === "landed" && /from its documents/.test(row.asBuilt.summary || "") && trk.impact.units.some(e => e.unit === fi.rowId && /its impact/.test(e.summary)) && trk.impact.changes.some(e => e.unit === fi.rowId && e.none), js([row.asBuilt, trk.impact.units.map(e => e.unit)])]);
    const strip = w => { const { updated, next, detail, history, ...rest } = w; return js(rest); };
    c.push(["…and nothing the run's events wrote moves: wip (but its stamp) and every other row", strip(trk.wip) === strip(pre.wip) && strip(trk.wip) === strip(W0) && js(trk.rows.filter(x => x.id !== fi.rowId)) === other, js([strip(trk.wip).slice(0, 400), strip(W0).slice(0, 400)])]);
    c.push(["…the checks pass on both, and the copies, landed and no fresher, are gone", run(sk("plan/scripts/check.js"), [B.sdir], { env }).status === 0 && run(sk("plan/scripts/check.js"), [B.tdir], { env }).status === 0 && !fs.existsSync(path.join(B.vS, "plan.json")) && !fs.existsSync(path.join(B.vT, "plan.json")), js([fs.existsSync(path.join(B.vS, "plan.json")), fs.existsSync(path.join(B.vT, "plan.json")), r.S.live])]);
    const was = rd(path.join(B.tdir, "plan.json")), r2 = reseed(B, "2026-10-26T10:30:00Z");
    c.push(["raised again: nothing to do, nothing written", r2.a.status === 0 && r2.S.result === "nothing" && rd(path.join(B.tdir, "plan.json")) === was, js([r2.S.result, r2.S.applied])]);
  });

  guard("the race in a worktree: the run's tree seeded and re-seeded, the main checkout's tracked boards and copies left alone", c => {
    const B = seedTree("seed-wt"), wt = path.join(sc, "seed-wt-tree"); fs.rmSync(wt, { recursive: true, force: true });
    if (git(B.main, "worktree", "add", "-q", "-b", "feat/62", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    landedAt(B, "2026-10-26T09:30:00Z");
    const s = sized(B, wt, "2026-10-26T10:00:00Z"), wS = path.join(wt, "docs", "plans", "55-http-client-stack", "47-java-23-bytecode"), wT = path.dirname(wS);
    c.push(["the worktree's boards seeded as they stand", s.a.status === 0 && lib.landedPending(P(wS)), js([s.a.status, s.S.seeded, s.S.error])]);
    const m0 = rd(path.join(B.sdir, "plan.json")); finish(B); const l2 = landedAt(B, "2026-10-26T10:10:00Z");
    const pendingR = P(wS).status, r = reseed(B, "2026-10-26T10:20:00Z");
    c.push(["reseed from the main checkout finds the worktree: its sub-issue built, its tracking board's row written", l2.a.status === 0 && r.a.status === 0 && pendingR !== "built" && P(wS).status === "built" && /from its documents/.test((P(wT).rows.find(x => x.unit && x.unit.issue === 47).asBuilt || {}).summary || ""), js([l2.a.status, r.a.status, r.S.result, P(wS).status, r.S.error, r.S.check])]);
    c.push(["…the main checkout's tracked board as committed, its copy still its view", rd(path.join(B.sdir, "plan.json")) === m0 && P(B.vS).status === "built", js(P(B.vS).status)]);
  });

  guard("a landing nothing raced: reseed does nothing; a copy whose land is under way is not seeded", c => {
    const B = seedTree("seed-none"); const f = path.join(B.sdir, "plan.json"), s0 = JSON.parse(rd(f)); s0.rows = copy(EX.rows); s0.impact = { ...(s0.impact || {}), basis: "as-built" }; wr(f, JSON.stringify(s0, null, 2) + "\n"); run(EMBED, [B.sdir], { env }); git(B.main, "add", "-A"); git(B.main, "commit", "-q", "-m", "as built");
    const l = landedAt(B, "2026-10-26T09:30:00Z"), snap = () => rd(f) + rd(path.join(B.tdir, "plan.json")) + rd(path.join(B.vS, "plan.json")) + rd(path.join(B.vT, "plan.json"));
    c.push(["the copy landed at once", l.a.status === 0 && P(B.vS).status === "built", js([l.a.status, l.S.check])]);
    const b4 = snap(), r = reseed(B, "2026-10-26T09:40:00Z");
    c.push(["reseed with no run started: result nothing, tracked boards and copies byte for byte, the live board untouched", r.a.status === 0 && r.S.result === "nothing" && snap() === b4 && r.S.live === "untouched" && r.S.enrich === "no", js([r.a.status, r.S.result, r.S.live, r.S.enrich, r.S.error])]);
    const q = raise(B, "reseed", undefined, undefined, {}, "2026-10-26T09:41:00Z", ["--worktree", B.main, "--main", B.main, "--view"]);
    c.push(["reseed with --view is refused", q.a.status === 1 && /without --view/.test(q.S.error || ""), js(q.S)]);
    const B2 = seedTree("seed-under"); const a = raise(B2, "merge", 47, B2.sub.folder, { pr: 90 }, "2026-10-26T09:30:00Z", ["--worktree", B2.main, "--main", B2.main, "--no-live", "--view"]);
    const was = rd(path.join(B2.sdir, "plan.json")), s = sized(B2, B2.main, "2026-10-26T10:00:00Z");
    c.push(["a sized while the copy stands at merge, no merge on record: not seeded, warned, the copy there", a.a.status === 0 && s.a.status === 0 && rd(path.join(B2.sdir, "plan.json")) === was && (s.S.warnings || []).some(w => /VIEW COPY NOT YET LANDED: 55-http-client-stack\/47-java-23-bytecode is left/.test(w)) && fs.existsSync(path.join(B2.vS, "plan.json")), js([a.a.status, s.a.status, s.S.warnings, s.S.seeded, s.S.error])]);
  });

  guard("board.js --live: a copy no fresher is removed once landed, or when it never merged; kept while merged with parts to resolve", c => {
    const B = seedTree("keep"); const l = landedAt(B, "2026-10-26T09:30:00Z");
    const bump = at0 => { const f = path.join(B.sdir, "plan.json"), p = JSON.parse(rd(f)); p.wip.updated = at0; wr(f, JSON.stringify(p, null, 2) + "\n"); run(EMBED, [B.sdir], { env }); };
    bump("2026-10-26T11:00:00Z");
    const b1 = run(BOARD, ["--live", "--no-gh", "--root", B.main], { env, cwd: B.main });
    c.push(["merged, parts to resolve, its tracked board fresher: kept, and said", b1.status === 0 && fs.existsSync(path.join(B.vS, "plan.json")) && /kept the view copy .*47-java-23-bytecode/.test(b1.stdout || ""), (b1.stdout || b1.stderr).slice(0, 500)]);
    const mk = JSON.parse(rd(path.join(B.main, "docs", "plans", ".live", "boards.js")).replace(/^[\s\S]*?\.boards=/, "").replace(/;\s*$/, ""));
    c.push(["…and the marker does not name it: no board follows a copy no fresher", !/\.live\/view\//.test(String(mk[47] || "")), js(mk)]);
    const B2 = seedTree("handback"); const q = raise(B2, "landing", 47, B2.sub.folder, { pr: 90 }, "2026-10-26T09:30:00Z", ["--worktree", B2.main, "--main", B2.main, "--no-live", "--view"]);
    const f2 = path.join(B2.sdir, "plan.json"), p2 = JSON.parse(rd(f2)); p2.wip.updated = "2026-10-26T11:00:00Z"; wr(f2, JSON.stringify(p2, null, 2) + "\n"); run(EMBED, [B2.sdir], { env });
    const b2 = run(BOARD, ["--live", "--no-gh", "--root", B2.main], { env, cwd: B2.main });
    c.push(["a land handed back (at landing, the run moved on): stale, removed", q.a.status === 0 && b2.status === 0 && !fs.existsSync(path.join(B2.vS, "plan.json")), js([q.a.status, q.S.error, (b2.stdout || "").slice(0, 300)])]);
  });

  guard("fill.js: impact.units by unit, impact.changes by what each names, so a concurrent entry stays", c => {
    const board = copy(TRK), units = board.impact.units, changes = board.impact.changes, u0 = units[0].unit;
    board.impact.units = [...units, { unit: "other-unit", basis: "as-built", summary: "written meanwhile" }];
    board.impact.changes = [...changes, { unit: "other-unit", when: "#99 landing", none: true }];
    const R = mergeFill(board, { impact: { units: [{ unit: u0, summary: "the fill's words" }], changes: [{ unit: u0, entry: "downstream.2", what: "the fill's change", why: "a reason", when: "#61 landing" }] } }), I = R.plan.impact;
    c.push(["a unit's entry merges into it, the fields the fill leaves out kept", I.units.find(e => e.unit === u0).summary === "the fill's words" && I.units.find(e => e.unit === u0).basis === units[0].basis && js(I.units.find(e => e.unit === u0).changes) === js(units[0].changes), js(I.units[0])]);
    c.push(["an entry written meanwhile stays, in impact.units and impact.changes", I.units.some(e => e.unit === "other-unit") && I.changes.some(e => e.unit === "other-unit" && e.none === true), js([I.units.map(e => e.unit), I.changes.map(e => [e.unit, e.what])])]);
    c.push(["several changes of one unit: a new one appended, the old one kept", I.changes.filter(e => e.unit === u0).length === changes.filter(e => e.unit === u0).length + 1, js(I.changes)]);
    const same = mergeFill(R.plan, { impact: { changes: [{ unit: u0, entry: "downstream.2", what: "the fill's change", why: "a better reason" }] } }).plan.impact.changes;
    c.push(["the same change named again amends it, no second entry", same.filter(e => e.what === "the fill's change").length === 1 && same.find(e => e.what === "the fill's change").why === "a better reason" && same.find(e => e.what === "the fill's change").when === "#61 landing", js(same)]);
    const rm = mergeFill(R.plan, { impact: { changes: [{ unit: u0, entry: "downstream.2", what: "the fill's change", $remove: true }], units: [{ unit: "other-unit", $remove: true }] } }).plan.impact;
    c.push(["{ $remove: true } removes one, in either list", !rm.changes.some(e => e.what === "the fill's change") && !rm.units.some(e => e.unit === "other-unit") && rm.changes.some(e => e.unit === "other-unit"), js([rm.changes, rm.units.map(e => e.unit)])]);
    const empty = mergeFill(R.plan, { impact: { changes: [], units: [] } }).plan.impact, cleared = mergeFill(R.plan, { impact: { changes: null } }).plan.impact;
    c.push(["an empty list adds nothing; null clears", empty.changes.length === I.changes.length && empty.units.length === I.units.length && cleared.changes === null, js([empty.changes.length, cleared.changes])]);
    const un = mergeFill(R.plan, { impact: { units: [{ unit: u0, changes: [{ what: "a unit's own change", why: "a reason" }] }] } }).plan.impact.units.find(e => e.unit === u0);
    c.push(["a unit entry's own changes merge the same way", un.changes.length === units[0].changes.length + 1, js(un.changes)]);
    const bare = copy(EX); bare.impact = null; const fresh = mergeFill(bare, { impact: { basis: "plan", changes: [{ what: "a change", why: "a reason", when: "x" }] } }).plan.impact;
    c.push(["a board with no impact yet takes the fill's as written", fresh.basis === "plan" && fresh.changes.length === 1, js(fresh)]);
    /* a fill composed before the unit's landing: the board on disk took an entry meanwhile; the file keeps both */
    const root = path.join(sc, "fill-race"), trk = copy(TRK), dir = path.join(root, ...trk.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir], { env });
    const on = JSON.parse(rd(path.join(dir, "plan.json"))); on.impact.changes.push({ unit: u0, when: "written meanwhile", entry: "downstream.1", what: "Verification case: written meanwhile", why: "a reason" }); wr(path.join(dir, "plan.json"), JSON.stringify(on, null, 2) + "\n");
    const ff = wr(path.join(sc, "fields-race2.json"), js({ impact: { changes: changes.map(x => ({ ...x, why: "Verification case: reworded." })) } })), r = run(FILL, [dir, "--fields", ff, "--json"], { env }), af = JSON.parse(rd(path.join(dir, "plan.json"))).impact.changes;
    c.push(["through fill.js: the entry written meanwhile survives a list composed before it", r.status === 0 && af.some(x => /written meanwhile/.test(x.what || "")) && af.some(x => x.why === "Verification case: reworded."), js([r.status, parse(r).check, af.map(x => x.what)])]);
  });

  guard("the landed summary's enrich: no when no work is left, naming what is left otherwise", c => {
    const finished = () => { const x = building(); x.rows = copy(EX.rows); x.wip.open = []; x.wip.step = "merge"; x.wip.steps = STEPS; x.wip.event = { name: "merge", at: "2026-10-26T08:50:00Z" }; x.wip.since = "2026-10-26T08:50:00Z"; x.wip.updated = "2026-10-26T08:50:00Z"; return x; };
    const facts = { pr: 90, sha: "abcdef1", merge: "abcdef2", date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" };
    const a = finished(); a.impact = { ...(a.impact || {}), basis: "as-built" };
    const e1 = evIn(tree("enrich-none", a))("landed", at(0), facts);
    c.push(["every part resolved, the consequences reconciled: enrich no", e1.a.status === 0 && e1.p.status === "built" && e1.S.enrich === "no", js([e1.a.status, e1.p.status, e1.S.enrich, e1.S.why, e1.S.check])]);
    const b = finished(); b.impact = { ...(b.impact || {}), basis: "plan" };
    const e2 = evIn(tree("enrich-recon", b))("landed", at(0), facts);
    c.push(["every part resolved, the consequences not reconciled (check.js refuses it built): enrich yes, naming them and not the parts", e2.a.status === 1 && /impact is the as-built one/.test(e2.S.check || "") && e2.S.enrich === "yes" && /consequences reconciled/.test(e2.S.why.join(" ")) && !/every part/.test(e2.S.why.join(" ")), js([e2.S.enrich, e2.S.why])]);
    const d = finished(); d.rows[0].asBuilt = { state: "pending", summary: "" }; d.impact = { ...(d.impact || {}), basis: "as-built" };
    const e3 = evIn(tree("enrich-open", d))("landed", at(0), facts);
    c.push(["a part still pending: enrich yes, naming it", e3.S.enrich === "yes" && /still to resolve/.test(e3.S.why.join(" ")) && e3.p.status !== "built", js([e3.S.enrich, e3.S.why, e3.p.status])]);
    /* a sub-issue's landing: the tracking board's unit fully written leaves nothing; its entry missing is named */
    const B = seedTree("enrich-parent"), unit = copy(EX); const trkF = path.join(B.tdir, "plan.json"), trk = JSON.parse(rd(trkF)), row = trk.rows.find(r => r.unit && r.unit.issue === 47);
    const landed = () => { const f = path.join(B.sdir, "plan.json"), s = JSON.parse(rd(f)); s.rows = copy(EX.rows); s.impact = { ...(s.impact || {}), basis: "as-built" }; wr(f, JSON.stringify(s, null, 2) + "\n"); run(EMBED, [B.sdir], { env }); };
    landed();
    const e4 = raise(B, "landed", 47, B.sub.folder, { pr: 90, sha: B.M, merge: B.M, date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" }, "2026-10-26T09:30:00Z", ["--worktree", B.main, "--main", B.main, "--no-live", "--view"]);
    c.push(["a unit landed with only the plain fact on its tracking board: enrich yes, naming what comes from its board", e4.a.status === 0 && e4.S.enrich === "yes" && /the landed unit's impact entry, effect on the initiative's impact come from/.test((e4.S.why || []).join(" ")), js([e4.a.status, e4.S.enrich, e4.S.why, e4.S.check])]);
    const vt = path.join(B.vT, "plan.json"), vp = JSON.parse(rd(vt)), vr = vp.rows.find(r => r.id === row.id);
    vr.asBuilt.summary = "Verification case: the unit's summary from its documents."; vp.impact.units = [...(vp.impact.units || []).filter(e => e.unit !== row.id), { unit: row.id, basis: "as-built", summary: "Verification case." }]; vp.impact.changes = [...(vp.impact.changes || []), { unit: row.id, when: "#47 landing", none: true }];
    wr(vt, JSON.stringify(vp, null, 2) + "\n"); run(EMBED, [B.vT], { env });
    const e5 = raise(B, "landed", 47, B.sub.folder, { pr: 90, sha: B.M, merge: B.M, date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" }, "2026-10-26T09:40:00Z", ["--worktree", B.main, "--main", B.main, "--no-live", "--view"]);
    c.push(["raised on a copy and a tracking board with nothing left: enrich no", e5.a.status === 0 && e5.S.enrich === "no", js([e5.a.status, e5.S.enrich, e5.S.why, e5.S.result, e5.S.check])]);
  });

  guard("the tracked board's follow of its view copy, without a browser", c => {
    const t = rd(PB), m = t.match(/^const planStampOf=(.*);$/m);
    c.push(["the template holds planStampOf()", !!m, "no const planStampOf= line"]);
    const fn = m ? new Function(`return ${m[1]};`)() : () => null;
    const samples = [{ wip: { updated: "2026-10-26T09:00:00Z", since: "2026-10-26T08:00:00Z" } }, { wip: { since: "2026-10-26T08:00:00Z" } }, { asBuilt: { date: "2026-10-26" } }, {}, null,
      { wip: { updated: "2026-10-26T09:00:00Z" }, rows: [{ unit: { live: { updated: "2026-10-26T10:00:00Z" } } }, { unit: {} }, {}] }, { rows: [null] }];
    c.push(["planStampOf() is lib.js planStamp(), on every shape of stamp", samples.every(s => fn(s) === lib.planStamp(s)), js(samples.map(s => [fn(s), lib.planStamp(s)]))]);
    c.push(["the feature probe finds it on the template, and misses it on a board without it", F.probe(t, "plan-board").every(x => x.id !== "view-copy-follow") && F.probe(t.replace("function followSettle(", "function other("), "plan-board").some(x => x.id === "view-copy-follow"), js(F.probe(t, "plan-board"))]);
    c.push(["a published copy follows nothing: the poll stops at LIVE_LOCAL, and a view copy at its <base> line", /function pollFollow\(\)\{ if\(IS_VIEW_COPY\|\|!LIVE_LOCAL\) return;/.test(t) && /const IS_VIEW_COPY=!!document\.querySelector\("base\[data-live-view\]"\);/.test(t), "pollFollow()"]);
    c.push(["the Source tab says which plan.json it shows", /id="source-small"/.test(t) && /the live view's copy on this machine, never committed/.test(t), "source-small"]);
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
