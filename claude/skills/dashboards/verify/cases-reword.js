// The cases of reword, one event's recorded text reworded (admin-team/dashboards-skill/reword-event; the user's decisions of 2026-11-13,
// dashboards/reword-event and dashboards/run-sent-corrections; plan/RULES.md §4, the reword row), and of a run's own retime and reword (the same
// decisions; the retime row). Run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-reword.js [--out <dir>].
// The trigger: KotlinBottools #25's run asked, before its Document commit, for four of its recorded texts to be reworded (two stage reports each
// carried by several stages, one closing report's sentence, and a halt's question); the rules had no route. A reword finds the event's own places
// by the stamps it wrote (a report by its `finished`, a detail by its visit's `event`, a question by its `asked`, a review's note by its `at`),
// rewords the passage in every one of them and in every whole copy of what they held (the snapshots, the detail, the trail entry), with one
// notes.corrections entry that keeps the passages as digests; no wip.event, no trail entry of its own, no time, step or state changed. It is refused,
// nothing written, where a fact is missing, the passage is not in the event's record (named where it is instead), the event is the team's record,
// another event is named at the same time, a text would be left empty, the new wording breaks the writers' rule, the board is closed or its
// Document commit is recorded done; raised again, a duplicate. On a sub-issue the tracking board's mirror follows; with --view only the view copies
// change. A run's own retime (raised with --arrived) is held to the run's limits: its own events only, before its land is sent, a clock reading
// to the second, never later than the event's arrival can have been. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesReword(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the reword cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const sc = path.join(out, "reword"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  let n = 0;
  /* the texts: a report closing two stages (with a sentence to take out), a remediation's report its two steps repeat, a halt's question */
  const DROP = "Two stages closed in one report; at is the end of the last, S2.";
  const R1 = `${DROP} S1 ended at 10:05:00Z: the parser holds. S2 ended at 10:10:00Z: the reply holds; the request was refused twice before it ran.`;
  const R2 = "The wording corrections are made; the request was refused twice before it ran.";
  const Q = "The record says the request was refused twice before it ran. How much of this stays in the public documents?";
  const T1 = "2026-11-02T10:10:00Z", T2 = "2026-11-02T12:00:00Z", T3 = "2026-11-02T13:00:00Z", T4 = "2026-11-02T13:05:00Z";
  const flight = wip => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, questions: [], research: null, open: [], qa: [], plan: null, steps: STEPS.slice(), ...wip }; return x; };
  const stage = (id, extra) => ({ id, name: `Stage ${id}`, state: "done", rows: ["validity-rule"], kind: "work", started: "2026-11-02T10:00:00Z", finished: T1, report: R1, ...(extra || {}) });
  const running = more => { const p = flight({ step: "document", since: T4, updated: "2026-11-02T14:00:00Z", current: ["built"], event: { name: "document", at: "2026-11-02T14:00:00Z" }, detail: "Document: 1 of 3 tasks done.",
    document: { tasks: [{ id: "readme", name: "README", state: "done", finished: "2026-11-02T14:00:00Z" }, { id: "state-boards", name: "State boards", state: "todo" }, { id: "document-landing", name: "Document commit", state: "todo" }] },
    stages: [stage("S1"), stage("S2")],
    remediation: { pass: 1, route: "on-the-spot", steps: [{ name: "The wording", state: "done", finished: T2, report: R2 }, { name: "The record", state: "done", finished: T2, report: R2 }] },
    asked: [{ step: "document", text: Q, options: ["Keep it as written", "Generalise it"], answer: null, asked: T3, answered: T4 }],
    waits: [{ step: "document", since: T3, ended: T4, by: "halted" }],
    history: { sizing: [{ since: null, ended: "2026-11-02T09:00:00Z", endedBy: "sized", to: "implementation" }],
      implementation: [{ since: "2026-11-02T09:00:00Z", ended: "2026-11-02T11:00:00Z", endedBy: "qa-pass", to: "qa", event: { name: "implementation-stage", at: T1, note: "S2 reported done; Quality Review next" }, detail: R1, stages: [stage("S1"), stage("S2")] }],
      document: [{ since: "2026-11-02T12:30:00Z", ended: T3, endedBy: "halted", to: "document", held: true, asked: [{ text: Q, options: ["Keep it as written", "Generalise it"], answer: null, asked: T3, answered: T4 }] }] } });
    p.sized = "2026-11-02T09:00:00Z"; p.trail = [...(p.trail || []), { date: "2026-11-02", column: "built", label: "Halted at the Document step: waiting on you (the answer on the wording)" }]; return Object.assign(p, more || {}); };
  const lay = (name, plan, page) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), page || rd(PB)); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  const req = (plan, ev, facts, more) => wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, ...(ev ? { event: ev } : {}), folder: plan.folder, facts: facts || {}, ...(more || {}) }));
  const apply = (B, plan, ev, facts, at, extra) => { const a = run(APPLY, ["--event", req(plan, ev, facts), "--worktree", B.root, "--no-gh", "--no-live", ...(at ? ["--at", at] : []), "--json", ...(extra || [])]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const files = B => ["plan.json", "dashboard.html", "plan.js"].map(f => { try { return rd(path.join(B.dir, f)); } catch (e) { return null; } }).join("\u0000");
  const W = (event, recordedAt, from, to, reason) => ({ event, recordedAt, from, to, reason: reason === undefined ? "the as-built record words it so" : reason });
  const holds = (v, s) => JSON.stringify(v).includes(JSON.stringify(s).slice(1, -1));
  const ncorr = p => ((p.notes || {}).corrections || []).length;
  const NOW = "2026-11-03T00:00:00Z";

  guard("apply-event.js reword: every place the event's record holds the passage takes the new wording, its copies with it, with one notes.corrections entry, and nothing else", c => {
    const plan = running(), B = lay("moves", plan), before = JSON.parse(rd(path.join(B.dir, "plan.json")));
    /* a stage report carried by two stages, a snapshot's copy of each, and the visit's detail */
    const r = apply(B, plan, "reword", W("implementation-stage", T1, "the request was refused twice before it ran", "the request service declined to run it twice"), NOW);
    c.push(["applied, enrich no", r.a.status === 0 && r.S.result === "ok" && r.S.enrich === "no", js([r.S.result, r.S.enrich, r.S.why, r.S.error])]);
    const want = R1.replace("the request was refused twice before it ran", "the request service declined to run it twice");
    c.push(["both stages' report, the snapshot's two copies and the visit's detail take the new wording", r.p.wip.stages.every(s => s.report === want) && r.p.wip.history.implementation[0].stages.every(s => s.report === want) && r.p.wip.history.implementation[0].detail === want, js(r.p.wip.stages.map(s => s.report))]);
    c.push(["…and nothing of another event: the remediation's report and the halt's question keep the passage (theirs, not this event's)", r.p.wip.remediation.steps.every(s => s.report === R2) && r.p.wip.asked[0].text === Q, ""]);
    const e = (r.p.notes.corrections || []).slice(-1)[0] || {};
    c.push(["exactly one notes.corrections entry, its passages as digests", ncorr(r.p) === ncorr(before) + 1 && e.reword && e.reword.event === "implementation-stage" && e.reword.at === T1 && e.reword.from === lib.rewordDigest("the request was refused twice before it ran") && e.reword.to === lib.rewordDigest("the request service declined to run it twice") && e.when === "2026-11-03", js(e)]);
    c.push(["…which names the event, its time and its places, gives the reason and the new wording, and never the withdrawn one", e.what === "An implementation stage's report of 2026-11-02 10:10:00 UTC is reworded in the report that closed S1 and S2: the as-built record words it so. The passage now reads \"the request service declined to run it twice\"." && !holds(r.p.notes, "refused twice"), e.what]);
    c.push(["no wip.event, no trail entry, the step, its start, the times, the FullPulse and the detail unchanged; wip.updated moves", js(r.p.wip.event) === js(before.wip.event) && r.p.trail.length === before.trail.length && r.p.wip.step === "document" && r.p.wip.since === before.wip.since && js(r.p.wip.current) === js(before.wip.current) && r.p.wip.detail === before.wip.detail && js(r.p.wip.waits) === js(before.wip.waits) && r.p.sized === before.sized && r.p.wip.updated === NOW, js([r.p.wip.event, r.p.wip.updated])]);
    const ck = run(CHECK, [B.dir]); c.push(["check.js passes the board", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    c.push(["the board's data block carries the entry", rd(path.join(B.dir, "dashboard.html")).includes("is reworded in the report that closed S1 and S2"), ""]);
    /* a sentence taken out: one adjacent run of spaces with it */
    const d = apply(B, r.p, "reword", W("implementation-stage", T1, DROP, "", "the sentence named a data field"), "2026-11-03T00:05:00Z");
    c.push(["an empty facts.to takes the passage out with its space, in every place", d.a.status === 0 && d.p.wip.stages.every(s => s.report.startsWith("S1 ended at 10:05:00Z")) && d.p.wip.history.implementation[0].detail.startsWith("S1 ended") && !holds(d.p, "at is the end of the last"), js([d.S.error, d.p.wip.stages[0].report.slice(0, 40)])]);
    c.push(["…its entry says it is taken out", /reworded in the report that closed S1 and S2: the sentence named a data field\. The passage is taken out\.$/.test((d.p.notes.corrections.slice(-1)[0] || {}).what || ""), (d.p.notes.corrections.slice(-1)[0] || {}).what]);
    /* the remediation's steps repeat their report: every copy */
    const m = apply(B, d.p, "reword", W("implementation-stage", T2, "the request was refused twice before it ran", "the request service declined to run it twice"), "2026-11-03T00:10:00Z");
    c.push(["a remediation's report its steps repeat: every step takes it", m.a.status === 0 && m.p.wip.remediation.steps.every(s => s.report === R2.replace("the request was refused twice before it ran", "the request service declined to run it twice")), js([m.S.error, m.p.wip.remediation.steps.map(s => s.report)])]);
    /* a halt's question, in wip.asked and in the visit that holds it */
    const q = apply(B, m.p, "reword", W("halted", T3, "says the request was refused twice before it ran", "describes how the request service handled the request"), "2026-11-03T00:15:00Z");
    const q2 = Q.replace("says the request was refused twice before it ran", "describes how the request service handled the request");
    c.push(["a halt's question: wip.asked and the halted visit's asked take it", q.a.status === 0 && q.p.wip.asked[0].text === q2 && q.p.wip.history.document[0].asked[0].text === q2, js([q.S.error, q.p.wip.asked[0].text])]);
    c.push(["…its entry names the halt and the question", /^The halt of 2026-11-02 13:00:00 UTC is reworded in a question it put: /.test((q.p.notes.corrections.slice(-1)[0] || {}).what || ""), (q.p.notes.corrections.slice(-1)[0] || {}).what]);
    const f0 = files(B), again = apply(B, q.p, "reword", W("halted", T3, "says the request was refused twice before it ran", "describes how the request service handled the request"), "2026-11-03T00:20:00Z");
    c.push(["raised again: a duplicate, nothing written", again.a.status === 0 && again.S.result === "duplicate" && files(B) === f0, js([again.S.result, again.S.error])]);
    const later = apply(B, q.p, "document", { tasks: [{ id: "state-boards", state: "current" }] }, "2026-11-03T00:30:00Z");
    c.push(["a later event applies on the reworded record, which it keeps", later.a.status === 0 && later.p.wip.asked[0].text === q2 && ncorr(later.p) === ncorr(q.p), js([later.S.result, later.S.error])]);
  });

  guard("apply-event.js reword: what the halt waits on, in wip.waitingOn and its trail entry", c => {
    const p = running(); p.wip = { ...p.wip, step: "halted", resume: "document", since: T3, event: { name: "halted", at: T3 }, waitingOn: "the answer on the wording", detail: "Halted at the Document step: waiting on you." };
    p.wip.asked[0].answered = null; p.wip.waits = [{ step: "document", since: T3, ended: null, by: "halted" }]; p.wip.history.document[0].ended = T3; p.wip.updated = T3;
    p.trail[p.trail.length - 1].date = T3.slice(0, 10);
    const B = lay("waiting", p);
    const r = apply(B, p, "reword", W("halted", T3, "the answer on the wording", "the answer on the public documents' wording"), NOW);
    c.push(["wip.waitingOn and the halt's trail entry take it, the trail growing by nothing", r.a.status === 0 && r.p.wip.waitingOn === "the answer on the public documents' wording" && r.p.trail.slice(-1)[0].label === "Halted at the Document step: waiting on you (the answer on the public documents' wording)" && r.p.trail.length === p.trail.length, js([r.S.error, r.p.wip.waitingOn, r.p.trail.slice(-1)[0]])]);
    c.push(["…the board still halted, its wait open", r.p.wip.step === "halted" && r.p.wip.waits[0].ended === null, js(r.p.wip.waits)]);
    const ck = run(CHECK, [B.dir]); c.push(["check.js passes the board", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 300)]);
  });

  guard("apply-event.js reword: refused, nothing written, where the facts fall short, the passage is not the event's, the wording breaks the writers' rule, or the board is past its Document commit", c => {
    const plan = running(), B = lay("refusals", plan), f0 = files(B);
    const no = (name, facts, re, B0, p0) => { const b = B0 || B, pp = p0 || plan, g = files(b), r = apply(b, pp, "reword", facts, NOW);
      c.push([name, r.a.status === 1 && r.S.result === "failed" && re.test(r.S.error || "") && files(b) === g, js([r.a.status, r.S.result, r.S.error])]); };
    const P = "the request was refused twice before it ran", N = "the request service declined to run it twice";
    no("no event named", { recordedAt: T1, from: P, to: N, reason: "x" }, /no facts.event/);
    no("no recorded time", { event: "implementation-stage", from: P, to: N, reason: "x" }, /no facts.recordedAt/);
    no("no passage", W("implementation-stage", T1, " ", N), /no facts.from/);
    no("no facts.to", { event: "implementation-stage", recordedAt: T1, from: P, reason: "x" }, /no facts.to/);
    no("no reason", W("implementation-stage", T1, P, N, ""), /no facts.reason/);
    no("facts.to equal to facts.from", W("implementation-stage", T1, P, P), /same text/);
    no("an event the record does not hold at that time", W("implementation-stage", "2026-11-02T10:11:00Z", P, N), /holds no text of implementation-stage at 2026-11-02T10:11:00Z/);
    no("a passage the event's record does not hold, said where it is (another event's record)", W("halted", T3, "The wording corrections are made", "x"), /holds no "The wording corrections are made"; it is held at wip\.remediation\.steps\[0\]\.report.*the record of another event/);
    no("a passage only a Row holds (columns 1 to 3, written once)", W("implementation-stage", T1, plan.rows[0].gap.summary.slice(0, 30), "x"), /it is held at rows\[0\].*a Row's text/);
    no("a passage held nowhere", W("implementation-stage", T1, "no such words anywhere", "x"), /held nowhere in the record/);
    no("the team's record (state-boards)", W("state-boards", T1, P, N), /state-boards is the team's record/);
    no("the team's record (landing)", W("landing", T1, P, N), /landing is the team's record/);
    no("a new wording naming a grade", W("implementation-stage", T1, P, "a grade-3 change declined it"), /carries a grade/);
    no("a new wording naming an internal name", W("implementation-stage", T1, P, "the admin team declined it"), /carries an internal name/);
    no("a new wording in an older step name", W("implementation-stage", T1, P, "qa pass 2 declined it"), /older wording of a step's name/);
    no("a new wording with a test set by number", W("implementation-stage", T1, P, "the L2 test declined it"), /test set by number \(L2; write the set's name\)/);
    no("a new wording with a test set by number beside its name", W("implementation-stage", T1, P, "the L2 component test declined it"), /test set by number \(L2;/);
    no("a text left empty", W("implementation-stage", T2, R2, ""), /would be left empty/);
    { const r = apply(B, plan, null, W("implementation-stage", T1, P, N), NOW); c.push(["a request naming no event, with a reword's facts: never read as facts.event", r.a.status === 1 && /names no event/.test(r.S.error || "") && files(B) === f0, js([r.S.error])]); }
    /* another event named at the same time: a report found by its time alone cannot be told */
    const p2 = running(); p2.wip.history.implementation[0].ended = T1; p2.wip.history.implementation[0].endedBy = "halted"; const B2 = lay("same-time", p2);
    no("another event named at the same time", W("implementation-stage", T1, P, N), /halted is recorded at the same time/, B2, p2);
    /* the Document commit recorded done */
    const p3 = running(); p3.wip.document.tasks.forEach(t => { t.state = "done"; t.finished = "2026-11-02T14:00:00Z"; }); const B3 = lay("doc-commit", p3);
    no("a board whose Document commit is recorded done", W("implementation-stage", T1, P, N), /Document commit is recorded done/, B3, p3);
    /* a landed and a cancelled board: kept as they closed */
    const p4 = running({ status: "built" }); p4.wip.step = "landed"; const B4 = lay("landed", p4);
    no("a board that has landed", W("implementation-stage", T1, P, N), /has landed/, B4, p4);
    const p5 = running({ status: "abandoned" }); p5.wip.step = "cancelled"; const B5 = lay("cancelled", p5);
    no("a board that was cancelled", W("implementation-stage", T1, P, N), /been cancelled/, B5, p5);
    c.push(["the board is as it was", files(B) === f0, ""]);
  });

  guard("apply-event.js reword on a sub-issue: the tracking board's mirror of the run follows; --view writes the view copies alone", c => {
    const TF = "docs/plans/55-http-client-stack", T0 = "2026-10-26T09:00:00Z", TS = "2026-10-26T09:20:00Z";
    const mk = name => { const main = path.join(sc, name), tdir = path.join(main, ...TF.split("/")), sdir = path.join(tdir, "69-feeds");
      if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
      wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
      const trk = copy(TRK); trk.rows.filter(r => r.unit).forEach(r => { r.unit.board = null; if (r.unit.folder) r.unit.folder = null; });
      trk.wip = { ...trk.wip, step: "implementation", since: TS, updated: TS, current: ["feeds.built"], event: { name: "sub-issues-filed", at: T0 },
        history: { ...(trk.wip.history || {}), "sub-issues": [{ since: T0, ended: TS, endedBy: "sized", to: "implementation" }] } };
      { const nx = lib.nextUnit(trk); trk.wip.next = nx ? nx.id : null; }
      wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB));
      const s = running(); Object.assign(s, { issue: 69, slug: "69-feeds", folder: `${TF}/69-feeds`, parent: { issue: 55 } }); delete s.issueBoards;
      wr(path.join(sdir, "plan.json"), JSON.stringify(s, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
      [sdir, tdir].forEach(d => { const e = run(EMBED, [d]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); });
      if (git(main, "add", "-A").status !== 0 || git(main, "commit", "-q", "-m", "boards").status !== 0) throw new Error("git commit failed");
      return { main, tdir, sdir, s }; };
    const P = "the request was refused twice before it ran", N = "the request service declined to run it twice";
    const A = mk("sub");
    const mirror0 = JSON.parse(rd(path.join(A.tdir, "plan.json"))).rows.find(r => r.unit && r.unit.issue === 69);
    c.push(["the tracking board mirrors the run before the reword, the passage in it", mirror0 && mirror0.unit.live && holds(mirror0.unit.live, P), js(mirror0 && Object.keys(mirror0.unit.live || {}))]);
    const a = run(APPLY, ["--event", req(A.s, "reword", W("implementation-stage", T1, P, N)), "--worktree", A.main, "--main", A.main, "--no-gh", "--no-live", "--at", NOW, "--json"]), S = parse(a);
    const sp = JSON.parse(rd(path.join(A.sdir, "plan.json"))), tp = JSON.parse(rd(path.join(A.tdir, "plan.json"))), mu = tp.rows.find(r => r.unit && r.unit.issue === 69);
    c.push(["applied: the sub-issue's board reworded", a.status === 0 && S.result === "ok" && sp.wip.stages.every(x => x.report === R1.replace(P, N)), js([S.result, S.error])]);
    const R1n = R1.replace(P, N);
    c.push(["the tracking board's mirror of the run holds the new wording, never the old (another event's text keeps its own)", mu && mu.unit.live && !holds(mu.unit.live, R1) && holds(mu.unit.live, R1n) && holds(mu.unit.live, R2), js(S.applied)]);
    c.push(["one entry, on the sub-issue's board, naming the mirror; none on the tracking board", /#55's mirror of it: /.test((sp.notes.corrections.slice(-1)[0] || {}).what || "") && ((tp.notes || {}).corrections || []).length === ((TRK.notes || {}).corrections || []).length, (sp.notes.corrections.slice(-1)[0] || {}).what]);
    const ck = [run(CHECK, [A.sdir]), run(CHECK, [A.tdir])];
    c.push(["check.js passes both boards", ck.every(x => x.status === 0), ck.map(x => (x.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 200)).join(" || ")]);
    /* --view: the view copies alone */
    const V = mk("sub-view"), tracked = () => [V.sdir, V.tdir].map(d => rd(path.join(d, "plan.json"))).join("\u0000"), t0 = tracked();
    const v = run(APPLY, ["--event", req(V.s, "reword", W("implementation-stage", T1, P, N)), "--worktree", V.main, "--main", V.main, "--view", "--no-gh", "--no-live", "--at", NOW, "--json"]), SV = parse(v);
    const VS = path.join(V.main, "docs", "plans", ".live", "view", "55-http-client-stack", "69-feeds", "plan.json"), VT = path.join(V.main, "docs", "plans", ".live", "view", "55-http-client-stack", "plan.json");
    c.push(["with --view: no tracked file written", v.status === 0 && SV.result === "ok" && tracked() === t0 && git(V.main, "status", "--porcelain").stdout.trim() === "", js([SV.result, SV.error, git(V.main, "status", "--porcelain").stdout])]);
    const vs = fs.existsSync(VS) ? JSON.parse(rd(VS)) : null, vt = fs.existsSync(VT) ? JSON.parse(rd(VT)) : null, vu = vt && vt.rows.find(r => r.unit && r.unit.issue === 69);
    c.push(["…the view copies reworded, the mirror's included", vs && !holds(vs.wip, R1) && holds(vs.wip, R1n) && vu && vu.unit.live && !holds(vu.unit.live, R1) && holds(vu.unit.live, R1n), js([!!vs, !!vt])]);
  });

  guard("a run's own reword and retime (raised with --arrived; the user's decision of 2026-11-13): held to the run's limits", c => {
    const plan = running(), P = "the request was refused twice before it ran", N = "the request service declined to run it twice";
    const runSent = (B, p, ev, facts, arrived) => { const a = run(APPLY, ["--event", req(p, ev, { ...facts, at: arrived }), "--worktree", B.root, "--no-gh", "--no-live", "--arrived", arrived, "--json"]), S = parse(a);
      return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
    const B = lay("run-reword", plan);
    const r = runSent(B, plan, "reword", W("implementation-stage", T1, P, N), NOW);
    c.push(["a run's reword of its own event applies as the team's does", r.a.status === 0 && r.S.result === "ok" && r.p.wip.stages.every(s => !s.report.includes(P)) && ncorr(r.p) === ncorr(plan) + 1, js([r.S.result, r.S.error])]);
    const g = files(B), r2 = runSent(B, r.p, "reword", W("state-boards", T1, N, P), "2026-11-03T00:01:00Z");
    c.push(["a run's reword of the team's record: refused", r2.a.status === 1 && /team's record/.test(r2.S.error || "") && files(B) === g, js([r2.S.error])]);
    /* a run's retime */
    const p2 = running(); const B2 = lay("run-retime", p2), g2 = files(B2);
    const rt = (facts, at) => runSent(B2, p2, "retime", facts, at || NOW);
    const R = (event, from, to) => ({ event, from, to, reason: "the time the run read when it happened" });
    const n1 = rt(R("implementation-stage", T1, "2026-11-02T10:13:00Z"));
    c.push(["a run's retime later than the event's arrival can have been (its recorded time plus 2 min): refused", n1.a.status === 1 && /later than implementation-stage's arrival can have been/.test(n1.S.error || "") && files(B2) === g2, js([n1.S.error])]);
    const n2 = rt(R("implementation-stage", T1, "2026-11-02T10:08Z"));
    c.push(["a run's retime whose facts.to is no clock reading to the second: refused", n2.a.status === 1 && /no clock reading to the second/.test(n2.S.error || "") && files(B2) === g2, js([n2.S.error])]);
    const n3 = rt(R("document", "2026-11-02T14:00:00Z", "2026-11-02T13:59:30Z"));
    c.push(["a run's retime of its own event within the bounds applies", n3.a.status === 0 && n3.S.result === "ok", js([n3.S.error])]);
    const p4 = running(); p4.wip.event = { name: "landing", at: "2026-11-02T15:00:00Z" }; p4.wip.step = "landing"; p4.wip.since = "2026-11-02T15:00:00Z"; p4.wip.updated = "2026-11-02T15:00:00Z";
    p4.wip.document.tasks.forEach(t => { t.state = "done"; t.finished = "2026-11-02T14:30:00Z"; }); p4.wip.history.document.push({ since: T4, ended: "2026-11-02T15:00:00Z", endedBy: "landing", to: "landing" });
    const B4 = lay("run-retime-land", p4), g4 = files(B4), n4 = runSent(B4, p4, "retime", R("implementation-stage", T1, "2026-11-02T10:09:00Z"), NOW);
    c.push(["a run's retime once its land is sent: refused", n4.a.status === 1 && /land has been sent/.test(n4.S.error || "") && files(B4) === g4, js([n4.S.error])]);
    const p5 = running(); p5.wip.history.document.push({ since: T4, ended: "2026-11-02T13:30:00Z", endedBy: "state-boards", to: "document", event: { name: "state-boards", at: "2026-11-02T13:30:00Z" } });
    const B5 = lay("run-retime-team", p5), g5 = files(B5), n5 = runSent(B5, p5, "retime", R("state-boards", "2026-11-02T13:30:00Z", "2026-11-02T13:29:00Z"), NOW);
    c.push(["a run's retime of the team's record: refused", n5.a.status === 1 && /state-boards is the team's record/.test(n5.S.error || "") && files(B5) === g5, js([n5.S.error])]);
    /* the team's retime at the presenter's word keeps its own reach: a later time, past the run's bound */
    const t1 = apply(B2, n3.p, "retime", R("implementation-stage", T1, "2026-11-02T10:13:00Z"), NOW);
    c.push(["the team's retime (no --arrived) keeps its reach: a time later than the run's bound applies", t1.a.status === 0 && t1.S.result === "ok", js([t1.S.error])]);
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
