// The cases of admin-team/dashboards-skill/task-times, run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-task-times.js [--out <dir>]. The trigger: KotlinBottools #24's run halted in its Document step at 01:59:34Z and reported its tasks
// with the halt (the documentation review done, the reconciliation current), which the board did not yet read; the next event, at the resume, stamped
// them 11 minutes late, and no correction fitted (a halt raised again reopens it, a retime moves every stamp of its event, a fill refused wip.document).
// fill.js's wip.document, [{ id, started?, finished?, reason }], corrects one task's recorded times (plan/RULES.md §2, a factual correction):
// 1. the task on wip.document; 2. each saved visit copy in wip.history holding it, shown as the corrected times put it at the visit's end; 3. one
// notes.corrections entry, from what to what and why, with nothing else moved and the same correction again writing nothing; 4. refused, nothing
// written: a time after wip.updated, a finish before the start, a time outside the Document step's bounds, an unknown task id, any other key, a start
// on a task to come or a finish on a task not done (a state change), no reason; 5. the same on a tracking board's Document step, and the bound of a
// step that has ended (fill.js mergeFill()). Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesTaskTimes(X) {
  const { sk, out } = X;
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const PB = sk("plan/template/dashboard.html");
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), FILL = sk("plan/scripts/fill.js");
  const sc = path.join(out, "task-times"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "qa", current: ["built"], questions: [], research: null, open: [], qa: [], asked: [], waits: [], waitingOn: null, resume: null, event: { name: "implementation-stage", at: "2026-11-12T01:00:00Z" }, steps: STEPS }; return x; };
  const tree = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); const e = run(EMBED, [dir], { env }); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, folder: plan.folder }; };
  const evIn = T => (name, facts, extra) => { const rq = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--json", ...(extra || [])], { env }); if (a.status !== 0) throw new Error(`${name}: ` + (a.stdout + a.stderr).slice(-400)); return parse(a); };
  const fillIn = T => fields => { const f = wr(path.join(sc, `fields-${++n}.json`), js(fields)), a = run(FILL, [T.dir, "--fields", f, "--json"], { env }); return { a, S: parse(a), p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const P = T => JSON.parse(rd(path.join(T.dir, "plan.json")));
  const tasks = p => ((p.wip.document || {}).tasks || []), task = (p, id) => tasks(p).find(t => t.id === id) || {};
  const vtask = (v, id) => (((v || {}).document || {}).tasks || []).find(t => t.id === id) || {};
  const hist = (p, s) => ((p.wip.history || {})[s] || []);
  /* #24's Document step: the review current, the halt (its tasks not read, as before the fix), the resume, and the document event that stamped the tasks */
  const TD = "2026-11-12T01:49:28Z", TH = "2026-11-12T01:59:34Z", TR = "2026-11-12T02:10:54Z";
  const FIVE = ["documentation-review", "reconcile-documentation", "reconcile-plan", "readme-changelog", "state-boards"];
  const QS = [{ text: "Is the configuration's header fixed in this change?", options: ["Fix it now", "Record it as a follow-up"] },
    { text: "Are the eight further improvements made in this change?", options: ["Record them as follow-ups", "Make them all now"] }];
  const REASON = "the run reported these states when it stopped for its questions at 01:59:34 UTC, in an event that carried them where the board did not yet read them";
  const replay = name => { const T = tree(name, building()), ev = evIn(T);
    ev("document", { tasks: FIVE.map((id, i) => ({ id, state: i ? "todo" : "current" })), at: TD });
    ev("halted", { waitingOn: "the maintainer's answer on the documentation findings", detail: "The documentation check found 13 points.", questions: QS, at: TH });
    ev("resumed", { at: TR });
    ev("document", { tasks: FIVE.map((id, i) => ({ id, state: i === 0 ? "done" : i < 3 ? "current" : "todo" })), detail: "The documentation check ended with 13 points.", at: TR });
    return { T, fill: fillIn(T), before: P(T) }; };
  const FIX = [{ id: "documentation-review", finished: TH, reason: REASON }, { id: "reconcile-documentation", started: TH, reason: REASON }];
  const strip = p => { const x = copy(p); delete x.wip.document; (x.wip.history.document || []).forEach(v => delete v.document); delete x.notes; return x; };

  guard("fill.js wip.document: one task's recorded times corrected, on the board and its saved visit copies, with one notes.corrections entry", c => {
    const { T, fill, before } = replay("correct");
    c.push(["the replay: the review finished and the reconciliation started at the resume, the halted visit's copy showing the review current", task(before, "documentation-review").finished === TR && task(before, "reconcile-documentation").started === TR && ((hist(before, "document")[0] || {}).document ? vtask(hist(before, "document")[0], "documentation-review").state === "current" : false),
      js([task(before, "documentation-review"), task(before, "reconcile-documentation"), hist(before, "document").map(v => [v.ended, v.endedBy])])]);
    const f = fill({ wip: { document: FIX } }), p = f.p;
    c.push(["the fill is applied, exit 0", f.a.status === 0 && f.S.fill === "ok", js([f.a.status, f.S.fill, f.S.error, f.S.check])]);
    const rv = task(p, "documentation-review"), rd2 = task(p, "reconcile-documentation"), rp = task(p, "reconcile-plan");
    c.push(["the review's finish corrected, its start, state, name and report as they were", rv.finished === TH && rv.started === TD && rv.state === "done" && rv.name === task(before, "documentation-review").name && rv.report === task(before, "documentation-review").report, js(rv)]);
    c.push(["the reconciliation's start corrected, still current", rd2.started === TH && rd2.state === "current" && !rd2.finished, js(rd2)]);
    c.push(["the task it did not name (reconcile-plan) as it was, and the list's order and length", js(rp) === js(task(before, "reconcile-plan")) && js(tasks(p).map(t => t.id)) === js(tasks(before).map(t => t.id)), js([rp, tasks(p).map(t => t.id)])]);
    const V = hist(p, "document")[0] || {};
    c.push(["the halted visit's saved copy: the review done at the halt, the reconciliation current from it, the rest to come", vtask(V, "documentation-review").state === "done" && vtask(V, "documentation-review").finished === TH && vtask(V, "documentation-review").started === TD && vtask(V, "reconcile-documentation").state === "current" && vtask(V, "reconcile-documentation").started === TH && vtask(V, "reconcile-plan").state === "todo" && !vtask(V, "reconcile-plan").started,
      js((V.document || {}).tasks)]);
    const C = ((p.notes || {}).corrections || []), C0 = ((before.notes || {}).corrections || []), e = C[C.length - 1] || {};
    c.push(["one notes.corrections entry, its taskTimes naming each time from what to what", C.length === C0.length + 1 && js(e.taskTimes) === js([{ id: "documentation-review", field: "finished", from: TR, to: TH }, { id: "reconcile-documentation", field: "started", from: TR, to: TH }]) && /^\d{4}-\d{2}-\d{2}$/.test(e.when || ""), js(e)]);
    c.push(["…its text says what was recorded, why, what it is now, and the saved record moving with it", /02:10:54 UTC/.test(e.what || "") && /01:59:34 UTC/.test(e.what || "") && (e.what || "").includes("did not yet read them") && /Documentation review's finish/.test(e.what || "") && /start/.test(e.what || "") && /saved record of the Document step's visit 1/.test(e.what || ""), e.what]);
    c.push(["nothing else moved: the wait, the questions, the trail, the step's times, the event, the other visits", js(strip(p)) === js(strip(before)), js([p.wip.waits, p.wip.since, p.wip.updated, p.trail.length, before.trail.length])]);
    c.push(["…and the board's embedded copy is the file", run(EMBED, [T.dir, "--check"], { env }).status === 0, "embed.js --check"]);
    const again = fill({ wip: { document: FIX } });
    c.push(["the same correction again: nothing more written, no second entry", again.a.status === 0 && js(again.p) === js(p), js([again.a.status, again.S.merged, ((again.p.notes || {}).corrections || []).length])]);
  });

  guard("fill.js wip.document: a correction that would move a state, cross a bound or name what it may not is refused, nothing written", c => {
    const { T, fill, before } = replay("refuse"), was = rd(path.join(T.dir, "plan.json"));
    const ok = FIX[0], refused = (label, entries, re) => { const f = fill({ wip: { document: entries } });
      c.push([`${label}: refused (exit 2), nothing written`, f.a.status === 2 && f.S.fill === "refused" && re.test(f.S.error || "") && rd(path.join(T.dir, "plan.json")) === was, js([f.a.status, f.S.error])]); };
    refused("a time after the board's last event", [ok, { id: "reconcile-documentation", started: "2026-11-12T02:30:00Z", reason: REASON }], /after the board's last event/);
    refused("a finish before the task's start", [{ id: "documentation-review", started: TH, finished: "2026-11-12T01:55:00Z", reason: REASON }], /would finish .* before it started/);
    refused("a time before the Document step began", [{ id: "documentation-review", started: "2026-11-12T00:30:00Z", reason: REASON }], /before the Document step began/);
    refused("an unknown task id", [ok, { id: "dokka-check", finished: TH, reason: REASON }], /holds no task "dokka-check"/);
    refused("a task's state (another key)", [ok, { id: "reconcile-plan", state: "done", reason: REASON }], /state: a fill corrects a task's times only/);
    refused("a task's name (another key)", [{ id: "documentation-review", finished: TH, name: "Review", reason: REASON }], /name: a fill corrects a task's times only/);
    refused("a start on a task to come", [{ id: "readme-changelog", started: TH, reason: REASON }], /is to come, with no start to correct/);
    refused("a finish on a task not done", [{ id: "reconcile-plan", finished: TR, reason: REASON }], /is current, with no finish to correct/);
    refused("an entry with no reason", [{ id: "documentation-review", finished: TH }], /gives no reason/);
    refused("a task named twice", [ok, { id: "documentation-review", started: TD, reason: REASON }], /is named twice/);
    c.push(["after every refusal the board is the replay's", js(P(T)) === js(before), "plan.json"]);
  });

  guard("fill.js wip.document on a tracking board's Document step, and the bound of a Document step that has ended (mergeFill)", c => {
    const { mergeFill, Refused } = require(FILL);
    const TRK = J("verify/fixtures/tracking.plan.json"), A = "2026-11-10T10:00:00Z", B = "2026-11-10T10:30:00Z", Cx = "2026-11-10T11:00:00Z";
    const doc = (s1, f1) => ({ tasks: [{ id: "reconcile-plan", name: "Reconcile the plan", state: "done", started: s1, finished: f1 }, { id: "state-boards", name: "State boards", state: "current", started: f1 }, { id: "document-landing", name: "Document commit", state: "todo" }] });
    const trk = copy(TRK); trk.wip = { ...(trk.wip || {}), step: "document", resume: null, since: B, updated: Cx, document: doc(A, Cx), history: { ...((trk.wip || {}).history || {}), document: [{ since: A, ended: B, endedBy: "halted", to: "document", held: true, document: doc(A, null) }] } };
    trk.wip.history.document[0].document.tasks[0] = { id: "reconcile-plan", name: "Reconcile the plan", state: "current", started: A };
    trk.wip.history.document[0].document.tasks[1] = { id: "state-boards", name: "State boards", state: "todo" };
    let R = null, err = null; try { R = mergeFill(trk, { wip: { document: [{ id: "reconcile-plan", finished: B, reason: "the halt reported it done" }, { id: "state-boards", started: B, reason: "the halt reported it done" }] } }, null); } catch (e) { err = e.message; }
    const W = R && R.plan.wip, V = W && W.history.document[0];
    c.push(["a tracking board: the tasks corrected on wip.document", !!W && task(R.plan, "reconcile-plan").finished === B && task(R.plan, "state-boards").started === B, js([err, W && W.document])]);
    c.push(["…its saved copy shows them as at the visit's end, and one corrections entry", !!V && vtask(V, "reconcile-plan").state === "done" && vtask(V, "reconcile-plan").finished === B && vtask(V, "state-boards").state === "current" && vtask(V, "state-boards").started === B && ((R.plan.notes || {}).corrections || []).filter(x => x && x.taskTimes).length === 1, js([V && V.document, R && R.plan.notes])]);
    /* a step that has ended: its bound is the last visit's end, not the board's last event */
    const past = copy(trk); past.wip.step = "landing"; past.wip.since = Cx; past.wip.updated = "2026-11-10T12:00:00Z"; past.wip.document = doc(A, "2026-11-10T10:40:00Z"); past.wip.history.document.push({ since: B, ended: Cx, endedBy: "landing", to: "landing", document: doc(A, "2026-11-10T10:40:00Z") });
    const tryFill = f => { try { mergeFill(copy(past), f, null); return null; } catch (e) { return e instanceof Refused ? e.message : "not refused: " + e.message; } };
    const late = tryFill({ wip: { document: [{ id: "reconcile-plan", finished: "2026-11-10T11:30:00Z", reason: "a test" }] } });
    c.push(["a Document step that has ended: a time after its last visit's end refused", /after the Document step ended \(2026-11-10T11:00:00Z\)/.test(late || ""), late]);
    const atEnd = tryFill({ wip: { document: [{ id: "reconcile-plan", finished: Cx, reason: "a test" }] } });
    c.push(["…at its last visit's end accepted", atEnd === null, atEnd]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length; console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
