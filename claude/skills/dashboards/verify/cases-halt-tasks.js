// The cases of admin-team/dashboards-skill/halt-tasks and /unread-facts, run by verify-templates.js (it passes its helpers in), or on its own with no
// browser: node verify/cases-halt-tasks.js [--out <dir>]. The trigger: KotlinBottools #24's run halted in its Document step with two questions and sent
// facts.tasks with the halt (the documentation review done, the reconciliation current); apply-event.js applied the halt, its wait and its questions,
// did not read the tasks and said nothing of them, so the board showed the review current through the wait.
// 1. A halt in the Document step applies its facts.tasks as a document event does (plan/scripts/apply-event.js, the halted case): each task that
//    changes state stamped at the halt's time, a task done taking the halt's detail as its report, the team's tasks never moved back; the halt
//    itself (its step, wait, questions, visit and one trail entry) as without them, the visit the halt ended holding the tasks; the summary says
//    the tasks came from a halted event. Raised again with the same facts: a duplicate.
// 2. A halt recorded before the fix, raised again with its tasks at its own time (#24's correction): the tasks applied and the visit's snapshot
//    brought to them, with no second wait, question, visit or trail entry; raised once more, a duplicate.
// 3. A halt in the Document step whose tasks the Document step would refuse: the halt applied, the tasks not, a warning.
// 4. The unread facts: a halt outside the Document step carrying tasks, a document event carrying head, a misspelt key on an
//    implementation-stage, a step in the run's words on resumed: the summary's unread line (in --json, unread) names each key the event carried
//    and did not read, and none it read.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesHaltTasks(X) {
  const { sk, out } = X;
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const PB = sk("plan/template/dashboard.html");
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js");
  const sc = path.join(out, "halt-tasks"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
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
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--json", ...(extra || [])], { env }); return { a, S: parse(a), p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const tasks = p => ((p.wip.document || {}).tasks || []), task = (p, id) => tasks(p).find(t => t.id === id) || {};
  const hist = (p, s) => ((p.wip.history || {})[s] || []);
  const unread = S => Array.isArray(S.unread) ? S.unread : null;
  /* #24's Document step as it stood before the halt, and the halt as the run sent it (2026-11-12, the texts shortened) */
  const TD = "2026-11-12T01:49:28Z", TH = "2026-11-12T01:59:34Z", TR = "2026-11-12T02:20:00Z";
  const FIVE = ["documentation-review", "reconcile-documentation", "reconcile-plan", "readme-changelog", "state-boards"];
  const DOC = { tasks: FIVE.map((id, i) => ({ id, state: i ? "todo" : "current" })), head: "40357d40fa4796ae53e76411a74e2d1f8a237f4a" };
  const QS = [{ text: "Is the configuration's header fixed in this change?", options: ["Fix it now", "Record it as a follow-up"] },
    { text: "Are the eight further improvements made in this change?", options: ["Record them as follow-ups", "Make them all now", "Make them now except in the scan wrapper"] }];
  const HALT_BARE = { waitingOn: "the maintainer's answer on whether documentation findings in the byte-pinned files are fixed in this change", detail: "The documentation check found 13 points; four are gaps.", questions: QS, head: DOC.head };
  const HALT = { ...HALT_BARE, tasks: FIVE.map((id, i) => ({ id, state: i === 0 ? "done" : i === 1 ? "current" : "todo" })) };
  const atDoc = name => { const T = tree(name, building()), ev = evIn(T), d = ev("document", { ...DOC, at: TD }); if (d.a.status !== 0) throw new Error("document: " + (d.a.stdout + d.a.stderr).slice(-400)); return { T, ev, d }; };
  const haltShape = (c, p, label) => {
    const W = (p.wip.waits || []).filter(x => x.step === "document");
    c.push([`${label}: one wait on the user, from the halt, open`, W.length === 1 && W[0].since === TH && W[0].ended === null && W[0].by === "halted", js(p.wip.waits)]);
    const A = (p.wip.asked || []).filter(q => q.step === "document");
    c.push([`${label}: the two questions once each, asked at the halt`, A.length === 2 && A.every((q, i) => q.text === QS[i].text && q.asked === TH && q.answer === null), js(A.map(q => [q.text.slice(0, 20), q.asked]))]);
    const H = hist(p, "document");
    c.push([`${label}: one visit of the Document step, held, ended by the halt, holding the two questions`, H.length === 1 && H[0].held === true && H[0].ended === TH && H[0].endedBy === "halted" && (H[0].asked || []).length === 2, js(H.map(v => [v.since, v.ended, v.endedBy, v.held, (v.asked || []).length]))]);
    const tr = (p.trail || []).filter(t => /^Halted at/.test(t.label));
    c.push([`${label}: one trail entry for the halt, and none for the tasks`, tr.length === 1 && !(p.trail || []).some(t => /Reconcile/.test(t.label)), js((p.trail || []).slice(-3))]);
    c.push([`${label}: the board halted, to resume at the Document step`, p.wip.step === "halted" && p.wip.resume === "document" && p.wip.event.name === "halted" && p.wip.event.at === TH, js([p.wip.step, p.wip.resume, p.wip.event])]);
  };
  const tasksAtHalt = (c, p, label) => {
    const r = task(p, "documentation-review"), k = task(p, "reconcile-documentation");
    c.push([`${label}: the documentation review done, started at the document event, finished at the halt, the halt's detail its report`, r.state === "done" && r.started === TD && r.finished === TH && r.report === HALT.detail, js(r)]);
    c.push([`${label}: the reconciliation current from the halt`, k.state === "current" && k.started === TH && !k.finished, js(k)]);
    c.push([`${label}: the other tasks as they were, the Document commit still to come`, ["reconcile-plan", "readme-changelog", "state-boards", "document-landing"].every(id => task(p, id).state === "todo" && !task(p, id).started) && tasks(p).length === 6, js(tasks(p).map(t => [t.id, t.state]))]);
    const V = hist(p, "document")[0] || {}, vt = ((V.document || {}).tasks || []);
    c.push([`${label}: the visit the halt ended holds the tasks as the halt reported them`, js(vt) === js(tasks(p)), js(vt.map(t => [t.id, t.state]))]);
  };

  guard("apply-event.js: a halt in the Document step applies the tasks it carries, as a document event does, and stays a halt", c => {
    const { ev } = atDoc("halt-with-tasks");
    const h = ev("halted", { ...HALT, at: TH });
    c.push(["halted with facts.tasks: applied", h.a.status === 0 && h.S.result === "ok", js([h.a.status, h.S.result, h.S.error])]);
    tasksAtHalt(c, h.p, "the halt");
    haltShape(c, h.p, "the halt");
    c.push(["the summary says the tasks were taken from a halted event", (h.S.applied || []).some(x => /the tasks taken from a halted event in the Document step \(the protocol gives them at document\)/.test(x)), js(h.S.applied)]);
    c.push(["…and names facts.tasks nowhere as unread (it was read), only facts.head", js(unread(h.S)) === js(["head"]), js(h.S.unread)]);
    const again = ev("halted", { ...HALT, at: TH });
    c.push(["the same halt again: a duplicate, nothing written", again.a.status === 0 && again.S.result === "duplicate" && js(again.p) === js(h.p), js([again.S.result, again.S.applied])]);
    const r = ev("resumed", { step: "document", at: TR });
    c.push(["resumed: the tasks kept, the reconciliation still current from the halt", r.a.status === 0 && task(r.p, "documentation-review").finished === TH && task(r.p, "reconcile-documentation").state === "current" && task(r.p, "reconcile-documentation").started === TH, js(tasks(r.p).map(t => [t.id, t.state, t.started, t.finished]))]);
  });

  guard("apply-event.js: a halt recorded without its tasks, raised again with them at its own time (KotlinBottools #24's correction)", c => {
    const { ev } = atDoc("halt-raised-again");
    const h0 = ev("halted", { ...HALT_BARE, at: TH });
    c.push(["the halt recorded without its tasks: the review still current, the reconciliation to come", h0.a.status === 0 && task(h0.p, "documentation-review").state === "current" && task(h0.p, "reconcile-documentation").state === "todo", js(tasks(h0.p).map(t => [t.id, t.state]))]);
    const h = ev("halted", { ...HALT, at: TH }, ["--arrived", "2026-11-12T01:59:58Z"]);
    c.push(["raised again with its tasks and its arrival time: applied, not a duplicate, its time kept", h.a.status === 0 && h.S.result === "ok" && !h.S.arrival, js([h.a.status, h.S.result, h.S.arrival, h.S.error])]);
    tasksAtHalt(c, h.p, "raised again");
    haltShape(c, h.p, "raised again");
    c.push(["the summary says the visit's snapshot was brought to the tasks", (h.S.applied || []).some(x => /wip\.history\.document: the visit the halt ended holds the tasks the halt reported/.test(x)), js(h.S.applied)]);
    c.push(["the wait, the questions, the trail and the step's time as the first halt left them", js(h.p.wip.waits) === js(h0.p.wip.waits) && js(h.p.wip.asked) === js(h0.p.wip.asked) && js(h.p.trail) === js(h0.p.trail) && h.p.wip.since === h0.p.wip.since && h.p.wip.updated === h0.p.wip.updated, js([h.p.wip.since, h0.p.wip.since, h.p.wip.updated, h0.p.wip.updated])]);
    const once = ev("halted", { ...HALT, at: TH }, ["--arrived", "2026-11-12T01:59:58Z"]);
    c.push(["raised once more: a duplicate, nothing written", once.a.status === 0 && once.S.result === "duplicate" && js(once.p) === js(h.p), js([once.S.result, once.S.applied])]);
  });

  guard("apply-event.js: a halt whose tasks the Document step would refuse is applied without them, with a warning", c => {
    const { ev, d } = atDoc("halt-bad-tasks");
    const h = ev("halted", { ...HALT_BARE, tasks: [{ id: "documentation-review", state: "finished" }], at: TH });
    c.push(["the halt applied: halted, its wait and its questions", h.a.status === 0 && h.p.wip.step === "halted" && (h.p.wip.asked || []).length === 2 && (h.p.wip.waits || []).length === 1, js([h.a.status, h.p.wip.step, h.S.error])]);
    c.push(["the tasks left as the document event left them", js(tasks(h.p).map(t => [t.id, t.state])) === js(tasks(d.p).map(t => [t.id, t.state])), js(tasks(h.p).map(t => [t.id, t.state]))]);
    c.push(["the summary warns HALT TASKS NOT APPLIED, and nothing is unfinished", /HALT TASKS NOT APPLIED/.test(js(h.S.warnings)) && !h.S.unfinished, js([h.S.warnings, h.S.unfinished])]);
    const k = ev("halted", { ...HALT_BARE, tasks: [{ id: "documentation-review", state: "current" }, { id: "document-landing", state: "done" }], at: "2026-11-12T02:01:00Z" });
    c.push(["the commit named done before the rest: the halt applied, the tasks not, a warning, no unfinished line", k.a.status === 0 && task(k.p, "document-landing").state === "todo" && /HALT TASKS NOT APPLIED/.test(js(k.S.warnings)) && !k.S.unfinished, js([k.a.status, task(k.p, "document-landing"), k.S.warnings, k.S.unfinished])]);
  });

  guard("apply-event.js: the facts an event carries and does not read are named in its summary, never those it reads", c => {
    /* a halt at qa carrying the Document step's tasks */
    const T = tree("unread-qa", building()), ev = evIn(T);
    const h = ev("halted", { ...HALT, at: "2026-11-12T01:10:00Z" });
    c.push(["a halt outside the Document step: the tasks not applied", h.a.status === 0 && !tasks(h.p).length, js(tasks(h.p))]);
    c.push(["…and named unread, with facts.head; waitingOn, detail and questions not named", js(unread(h.S)) === js(["head", "tasks"]), js(h.S.unread)]);
    const line = run(APPLY, ["--event", wr(path.join(sc, "rq-line.json"), js({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: "resumed", folder: T.folder, facts: { step: "implement", detail: "Back at it.", tasks: [], colour: "blue", at: "2026-11-12T01:20:00Z" } })), "--worktree", T.root, "--no-live", "--no-gh"], { env });
    c.push(["the key: value summary's unread line: a step in the run's words is read, the other keys named", line.status === 0 && /^unread: facts\.tasks, facts\.colour \(carried by the event and not read by it: nothing on the board came from them\)$/m.test(line.stdout), (line.stdout.match(/^unread:.*$/m) || ["no unread line"])[0]]);
    const s = ev("implementation-stage", { stage: "S1", stages: [{ id: "S1", name: "The first stage", state: "current" }], detial: "a misspelt key", step: "implementation", at: "2026-11-12T01:30:00Z" });
    c.push(["an implementation-stage: its facts.step read (and ignored, as the summary says), a misspelt key named", s.a.status === 0 && js(unread(s.S)) === js(["detial"]), js([s.a.status, s.S.unread, s.S.error])]);
    const d = ev("document", { ...DOC, detail: "The documentation of the change set is being checked.", at: "2026-11-12T01:40:00Z" });
    c.push(["a document event: its tasks and detail read, facts.head named", d.a.status === 0 && js(unread(d.S)) === js(["head"]), js(d.S.unread)]);
    const all = ev("document", { tasks: DOC.tasks, at: "2026-11-12T01:41:00Z" });
    c.push(["an event that reads every key it carries: no unread line (an empty list in --json)", all.a.status === 0 && js(unread(all.S)) === "[]", js(all.S.unread)]);
    const dup = ev("document", { tasks: DOC.tasks, extra: 1, at: "2026-11-12T01:41:00Z" });
    c.push(["a duplicate names none (its first application named them)", dup.S.result === "duplicate" && js(unread(dup.S)) === "[]", js([dup.S.result, dup.S.unread])]);
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
