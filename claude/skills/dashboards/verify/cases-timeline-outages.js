// The cases of a stretch when the run was not running (admin-team/board/timeline-outages; plan/RULES.md §2, "A run not running is not active
// time", §4, the run-restarted row), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node
// verify/cases-timeline-outages.js [--out <dir>]. A stretch when a run's session was down is not counted and not mentioned (decided
// 2026-11-05): no line, mark, note or trail entry on any board, never a bar segment, never summed, the step split into visits around it. Recorded only when a
// restart is known (a reported one, or a run's request from a different session), by the team-raised run-restarted event, its bounds from
// the facts alone, on the fast path, idempotent; it falls in the
// running visit, a closed one, a wait, or a gap. lib.js timelineSteps() and the template's copy agree. No case here opens a browser. Each
// group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), vm = require("vm");

module.exports = function casesTimelineOutages(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["a stretch when the run was not running (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), TIMELINE = sk("plan/scripts/timeline.js");
  const sc = path.join(out, "timeline-outages"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const MIN = 60000, STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const flight = wip => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, questions: [], research: null, open: [], qa: [], plan: null, steps: STEPS.slice(), ...wip }; return x; };
  const lay = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir }; };
  let nreq = 0;
  const apply = (B, plan, ev, facts, at) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: ev, folder: plan.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const vis = (p, s) => ((p.wip.history || {})[s] || []).map(v => [v.since, v.ended, v.endedBy || null, v.outage || null]);
  const rowsOf = T => lib.timelineRows(T).map(r => r.visit ? r.visit.label : "line").join(",");
  /* nothing on the tile says the stretch or the wait: the rows are the visits alone, no line says "not counted", and the result holds neither */
  const silent = T => lib.timelineRows(T).every(r => r.visit) && !/run not running|waiting on you|not counted/.test(lib.timelineLines(T).join(" | ")) && !("waits" in T) && !("outages" in T);
  const reasonF = { reason: "session restart" };
  /* the running board of the case the rule came from: document visit 2 running, a wait before it */
  const running = () => flight({ step: "document", since: "2026-11-02T03:07:30Z", updated: "2026-11-02T04:14:48Z", current: ["built"], event: { name: "state-boards", at: "2026-11-02T04:14:48Z" }, detail: "Document: 6 of 7 tasks done.", document: { tasks: [{ id: "state-boards", name: "State boards", state: "current" }] },
    waits: [{ step: "document", since: "2026-11-02T03:05:00Z", ended: "2026-11-02T03:07:30Z", by: "open-points" }],
    history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z", endedBy: "sized", to: "plan" }], plan: [{ since: "2026-11-01T17:10:00Z", ended: "2026-11-01T21:31:00Z", endedBy: "plan-accepted", to: "branch" }], document: [{ since: "2026-11-02T02:11:00Z", ended: "2026-11-02T03:05:00Z", endedBy: "resumed", to: "document", held: true }] } });

  /* 1. the visit still running */
  guard("apply-event.js run-restarted: a stretch in the running visit ends it at its start; the step's next visit starts at its end; the fast path writes it all", c => {
    const plan = running(), B = lay("running", plan), F = { since: "2026-11-02T04:16:35Z", ended: "2026-11-03T00:00:03Z", ...reasonF };
    const r = apply(B, plan, "run-restarted", F, "2026-11-03T00:19:00Z");
    c.push(["applied, enrich no: the facts decide everything it writes", r.a.status === 0 && r.S.result === "ok" && r.S.enrich === "no", js([r.S.result, r.S.enrich, r.S.why, r.S.error])]);
    c.push(["the running visit frozen: 03:07:30 → 04:16:35, its outage its reason, not held", js(vis(r.p, "document")[1]) === js(["2026-11-02T03:07:30Z", "2026-11-02T04:16:35Z", "run-restarted", "session restart"]) && !r.p.wip.history.document[1].held, js(vis(r.p, "document"))]);
    c.push(["the step unchanged, its since the stretch's end, the glow and the detail kept", r.p.wip.step === "document" && r.p.wip.since === "2026-11-03T00:00:03Z" && js(r.p.wip.current) === js(["built"]) && r.p.wip.detail === "Document: 6 of 7 tasks done.", js([r.p.wip.step, r.p.wip.since, r.p.wip.current, r.p.wip.detail])]);
    c.push(["wip.outages holds it; wip.waits is untouched", js(r.p.wip.outages) === js([{ step: "document", since: "2026-11-02T04:16:35Z", ended: "2026-11-03T00:00:03Z", reason: "session restart" }]) && r.p.wip.waits.length === 1, js([r.p.wip.outages, r.p.wip.waits])]);
    c.push(["no wip.event, no event note, no trail entry: the stretch is mentioned nowhere; wip.updated still moves", (r.p.trail || []).length === (plan.trail || []).length && !(r.p.trail || []).some(t => /not running|not counted/i.test(t.label || "")) && js(r.p.wip.event) === js(plan.wip.event) && r.p.wip.updated === "2026-11-03T00:19:00Z", js([(r.p.trail || []).slice(-1), r.p.wip.event, r.p.wip.updated])]);
    const T = lib.timelineSteps(r.p, { now: "2026-11-03T00:19:03Z" });
    const v2 = T.visits.find(v => v.label === "Document · visit 2"), v3 = T.visits.find(v => v.label === "Document · visit 3");
    c.push(["the Timeline: document · visit 1, 2 and 3 (running to now), nothing between them", /Document · visit 1,Document · visit 2,Document · visit 3$/.test(rowsOf(T)) && v2.ms === (69 * MIN + 5000) && v3.open && v3.from.t === "2026-11-03T00:00:03Z" && v3.ms === 19 * MIN, js([rowsOf(T), v2 && v2.ms, v3 && v3.ms])]);
    c.push(["the figure the visits alone; the line is on no bar segment: T.visits holds no stretch", lib.timelineTotal(T) === T.visits.filter(v => v.ms != null).reduce((n, v) => n + v.ms, 0) && !T.visits.some(v => v.outage || v.label === "run not running"), js(lib.timelineTotal(T))]);
    c.push(["the tile mentions neither the stretch nor the wait: no line, no note (lib.js has no timelineWaitNote())", silent(T) && lib.timelineWaitNote === undefined, js(lib.timelineLines(T))]);
    const again = apply(B, r.p, "run-restarted", F, "2026-11-03T00:25:00Z");
    c.push(["the same bounds again: a duplicate, nothing written", again.a.status === 0 && again.S.result === "duplicate" && js(again.p) === js(r.p), js([again.S.result, again.p.wip.updated])]);
    /* a later event, then the same stretch once more */
    const q = apply(B, r.p, "landing", { pr: 7 }, "2026-11-03T00:30:00Z");
    c.push(["the next event freezes document · visit 3 from the stretch's end, never from the last visit's end", js(vis(q.p, "document")[2].slice(0, 2)) === js(["2026-11-03T00:00:03Z", "2026-11-03T00:30:00Z"]), js(vis(q.p, "document"))]);
    const again2 = apply(B, q.p, "run-restarted", F, "2026-11-03T00:40:00Z");
    c.push(["the same bounds after a later event: still a duplicate", again2.a.status === 0 && again2.S.result === "duplicate" && js(again2.p) === js(q.p), js([again2.S.result])]);
    const ck = run(CHECK, [B.dir]); c.push(["check.js passes the board", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 400)]);
    const tl = run(TIMELINE, [B.dir]); c.push(["timeline.js prints the visits alone: no line and no note for the stretch", tl.status === 0 && /Document · visit 3/.test(tl.stdout) && !/run not running|not counted|waiting on you/.test(tl.stdout), (tl.stdout || "").slice(-400)]);
  });

  /* 2. a closed visit, a wait, a gap; what is refused */
  guard("apply-event.js run-restarted: a closed visit is cut around the stretch, a wait is cut around it, a gap takes the record alone; the record refuses what contradicts it", c => {
    const plan = running(), B = lay("closed", plan);
    const r = apply(B, plan, "run-restarted", { since: "2026-11-01T18:00:00Z", ended: "2026-11-01T20:00:00Z", ...reasonF }, "2026-11-03T00:19:00Z");
    c.push(["a closed visit cut: the first part ends at the start, the second keeps its end and the event that ended it", r.a.status === 0 && js(vis(r.p, "plan")) === js([["2026-11-01T17:10:00Z", "2026-11-01T18:00:00Z", "run-restarted", "session restart"], ["2026-11-01T20:00:00Z", "2026-11-01T21:31:00Z", "plan-accepted", null]]), js([vis(r.p, "plan"), r.S.error])]);
    c.push(["the running visit is left as it was", r.p.wip.since === "2026-11-02T03:07:30Z" && r.p.wip.step === "document", js([r.p.wip.since])]);
    const T = lib.timelineSteps(r.p, { now: "2026-11-02T05:00:00Z" });
    c.push(["the Timeline: plan · visit 1, plan · visit 2, nothing between them", /Plan · visit 1,Plan · visit 2/.test(rowsOf(T)) && silent(T), rowsOf(T)]);
    const r2 = apply(B, r.p, "run-restarted", { since: "2026-11-02T04:00:00Z", ended: "2026-11-02T04:10:00Z", ...reasonF }, "2026-11-03T00:20:00Z");
    c.push(["a second stretch, in the running visit: two lines, oldest first, the running visit starting at its end", r2.a.status === 0 && r2.p.wip.outages.map(x => x.since).join() === "2026-11-01T18:00:00Z,2026-11-02T04:00:00Z" && r2.p.wip.since === "2026-11-02T04:10:00Z", js([r2.p.wip.outages, r2.S.error])]);
    const T2 = lib.timelineSteps(r2.p, { now: "2026-11-02T05:00:00Z" });
    c.push(["two stretches: still nothing said of either, the running visit from the second's end", silent(T2) && T2.visits[T2.visits.length - 1].open && T2.visits[T2.visits.length - 1].from.t === "2026-11-02T04:10:00Z", js(lib.timelineLines(T2))]);
    const bad = apply(B, r2.p, "run-restarted", { since: "2026-11-01T21:00:00Z", ended: "2026-11-02T01:00:00Z", ...reasonF }, "2026-11-03T00:21:00Z");
    c.push(["a visit's end inside the stretch: refused, nothing written", bad.a.status === 1 && /the record holds the run active/.test(bad.S.error || "") && js(bad.p) === js(r2.p), js([bad.S.error])]);
    const over = apply(B, r2.p, "run-restarted", { since: "2026-11-01T18:30:00Z", ended: "2026-11-01T19:00:00Z", ...reasonF }, "2026-11-03T00:21:00Z");
    c.push(["inside a stretch already recorded: refused", over.a.status === 1 && /overlaps/.test(over.S.error || ""), js(over.S.error)]);
    [[{ ended: "2026-11-02T04:10:00Z", ...reasonF }, /facts\.since/], [{ since: "2026-11-02T05:00:00Z", ended: "2026-11-02T04:00:00Z", ...reasonF }, /not before/], [{ since: "2026-11-02T05:00:00Z", ended: "2030-01-01T00:00:00Z", ...reasonF }, /after the event's time/], [{ since: "2026-11-02T05:00:00Z", ended: "2026-11-02T06:00:00Z" }, /facts\.reason/]].forEach(([f, re]) => {
      const x = apply(B, r2.p, "run-restarted", f, "2026-11-03T00:22:00Z"); c.push([`facts ${js(f)}: refused`, x.a.status === 1 && re.test(x.S.error || ""), js(x.S.error)]); });
    /* a wait: an open one on a halted board, cut around the stretch; nothing runs, no visit is drawn at the stretch's end */
    const halted = flight({ step: "halted", resume: "plan", waitingOn: "an answer", since: "2026-11-01T17:30:00Z", updated: "2026-11-01T17:30:00Z", current: ["verdict"], event: { name: "halted", at: "2026-11-01T17:30:00Z" }, waits: [{ step: "plan", since: "2026-11-01T17:30:00Z", ended: null, by: "halted" }],
      history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z", endedBy: "sized", to: "plan" }], plan: [{ since: "2026-11-01T17:10:00Z", ended: "2026-11-01T17:30:00Z", endedBy: "halted", to: "plan", held: true }] } });
    const BH = lay("halted", halted), h = apply(BH, halted, "run-restarted", { since: "2026-11-01T18:00:00Z", ended: "2026-11-01T19:00:00Z", ...reasonF }, "2026-11-01T19:05:00Z");
    c.push(["inside an open wait: the wait cut, its last part still open; no visit frozen; the board still stopped", h.a.status === 0 && js(h.p.wip.waits) === js([{ step: "plan", since: "2026-11-01T17:30:00Z", ended: "2026-11-01T18:00:00Z", by: "halted" }, { step: "plan", since: "2026-11-01T19:00:00Z", ended: null, by: "halted" }]) && vis(h.p, "plan").length === 1 && h.p.wip.step === "halted", js([h.p.wip.waits, vis(h.p, "plan"), h.S.error])]);
    const TH = lib.timelineSteps(h.p, { now: "2026-11-01T19:10:00Z" });
    c.push(["…no visit runs and none is drawn at the stretch's end; the rows the plan's visit alone, nothing said of the wait or the stretch", !TH.visits.some(v => v.open) && TH.visits.filter(v => v.step === "plan").length === 1 && /Plan$/.test(rowsOf(TH)) && silent(TH), js([rowsOf(TH), lib.timelineLines(TH)])]);
    const res = apply(BH, h.p, "resumed", { step: "plan" }, "2026-11-01T19:30:00Z");
    c.push(["…the answer ends the last part; no visit frozen for the time inside the wait", res.a.status === 0 && vis(res.p, "plan").length === 1 && res.p.wip.since === "2026-11-01T19:30:00Z" && res.p.wip.waits[1].ended === "2026-11-01T19:30:00Z", js([vis(res.p, "plan"), res.p.wip.waits, res.S.error])]);
    /* a gap between visits */
    const gap = running(); gap.wip.history.branch = [{ since: "2026-11-01T22:00:00Z", ended: "2026-11-01T22:10:00Z", endedBy: "branch-cut", to: "implementation" }];
    const BG = lay("gap", gap), g = apply(BG, gap, "run-restarted", { since: "2026-11-01T21:31:00Z", ended: "2026-11-01T22:00:00Z", ...reasonF }, "2026-11-03T00:19:00Z");
    c.push(["a gap between visits: the line alone, every visit as it was", g.a.status === 0 && g.p.wip.outages.length === 1 && vis(g.p, "plan").length === 1 && vis(g.p, "branch").length === 1 && g.p.wip.since === gap.wip.since, js([g.p.wip.outages, vis(g.p, "plan"), g.S.error])]);
    /* a landed board is kept as it ended */
    const landed = copy(EX), BL = lay("landed", landed), l = apply(BL, landed, "run-restarted", { since: "2026-10-01T01:00:00Z", ended: "2026-10-01T02:00:00Z", ...reasonF }, "2026-11-03T00:19:00Z");
    c.push(["a landed board: refused, kept as it ended", l.a.status === 1 && /landed already/.test(l.S.error || ""), js(l.S.error)]);
    /* check.js on a malformed list */
    const mal = copy(r2.p); mal.wip.outages = [{ step: "plan", since: "2026-11-01T18:30:00Z", ended: "2026-11-01T19:30:00Z", reason: "x" }, { step: "plan", since: "2026-11-01T19:00:00Z", ended: null }, { step: "plan", since: "2026-11-01T17:20:00Z", ended: "2026-11-01T17:40:00Z" }];
    const BM = lay("mal", mal), mk = run(CHECK, [BM.dir]), o = mk.stdout || "";
    c.push(["check.js fails a stretch with no end, one out of order, and one overlapping a visit", mk.status !== 0 && /wip\.outages\[1\]\.ended is the ISO date-time/.test(o) && /wip\.outages\[2\] began/.test(o) && /wip\.outages\[2\] overlaps a visit of plan/.test(o), o.split(/\r?\n/).filter(l => /outages/.test(l)).join(" | ").slice(0, 600)]);
    /* a running visit that would count it: a stretch recorded by hand with wip.since left before its end */
    const un = copy(plan); un.wip.outages = [{ step: "document", since: "2026-11-02T04:16:35Z", ended: "2026-11-03T00:00:03Z" }];
    const BU = lay("uncut", un), uk = run(CHECK, [BU.dir]); c.push(["check.js fails a stretch the running visit would count", uk.status !== 0 && /the running visit began/.test(uk.stdout || ""), (uk.stdout || "").split(/\r?\n/).filter(l => /outages/.test(l)).join(" | ").slice(0, 400)]);
  });

  /* 3. the fast path's texts */
  guard("run-restarted's reason goes through the fast path's scrubbing: no internal name and no work level reaches a board", c => {
    const plan = running(), B = lay("names", plan), r = apply(B, plan, "run-restarted", { since: "2026-11-02T04:16:35Z", ended: "2026-11-03T00:00:03Z", reason: "the admin team session was restarted at level 3" }, "2026-11-03T00:19:00Z");
    const w = js(r.p.wip.outages) + js(r.p.trail.slice(-1)) + js(r.p.wip.event);
    c.push(["neither the name nor the level is written", r.a.status === 0 && !/admin team|level 3/i.test(w), w.slice(0, 400)]);
  });

  /* 4. open points put before a stretch, answered by a resumed after it: the resumed reads the run's own last event (run-restarted leaves
     wip.event alone), and the wait is cut around the stretch, a time being one or the other */
  guard("a resumed answering open points put before a stretch: the wait runs from the question, cut around the stretch; the visit ends at the question", c => {
    const stages = [{ id: "S1", name: "Stage 1", state: "current" }, { id: "S2", name: "Stage 2", state: "todo" }];
    const plan = flight({ step: "implementation", since: "2026-11-05T10:00:00Z", updated: "2026-11-05T10:30:00Z", current: ["built"], stages, event: { name: "implementation-stage", at: "2026-11-05T10:30:00Z" },
      history: { sizing: [{ since: null, ended: "2026-11-05T09:00:00Z", endedBy: "sized", to: "plan" }], plan: [{ since: "2026-11-05T09:00:00Z", ended: "2026-11-05T09:50:00Z", endedBy: "plan-accepted", to: "branch" }], branch: [{ since: "2026-11-05T09:50:00Z", ended: "2026-11-05T10:00:00Z", endedBy: "branch-cut", to: "implementation" }] } });
    const B = lay("resumed-across", plan), open = [{ text: "A reading of the plan awaits confirmation", raised: "implementation" }];
    const s = apply(B, plan, "implementation-stage", { stage: "S1", stages: [{ id: "S1", name: "Stage 1", state: "done" }, { id: "S2", name: "Stage 2", state: "current" }], open }, "2026-11-05T10:40:00Z");
    const r = apply(B, s.p, "run-restarted", { since: "2026-11-05T11:00:00Z", ended: "2026-11-05T12:00:00Z", reason: "a new session took up the run" }, "2026-11-05T12:00:00Z");
    c.push(["run-restarted keeps the run's own last event", r.a.status === 0 && js(r.p.wip.event) === js(s.p.wip.event) && r.p.wip.updated === "2026-11-05T12:00:00Z", js([r.p.wip.event, r.S.error])]);
    const q = apply(B, r.p, "resumed", { step: "implementation", open: open.map(o => ({ ...o, resolved: "confirmed" })) }, "2026-11-05T12:10:00Z");
    c.push(["the resumed applies: the wait from the question 10:40, cut around the stretch (10:40 → 11:00, 12:00 → 12:10)", q.a.status === 0 && js(q.p.wip.waits) === js([{ step: "implementation", since: "2026-11-05T10:40:00Z", ended: "2026-11-05T11:00:00Z", by: "open-points" }, { step: "implementation", since: "2026-11-05T12:00:00Z", ended: "2026-11-05T12:10:00Z", by: "open-points" }]), js([q.p.wip.waits, q.S.error])]);
    c.push(["…the visit the question interrupted ends at it, held, no longer at the stretch; the next starts at the answer", js(vis(q.p, "implementation")) === js([["2026-11-05T10:00:00Z", "2026-11-05T10:40:00Z", "implementation-stage", null]]) && q.p.wip.history.implementation[0].held === true && q.p.wip.since === "2026-11-05T12:10:00Z", js([vis(q.p, "implementation"), q.p.wip.since])]);
    const T = lib.timelineSteps(q.p, { now: "2026-11-05T12:20:00Z" });
    c.push(["the Timeline: implementation 40 min, then 10 min so far; nothing said of the wait or the stretch", /Implementation · visit 1,Implementation · visit 2$/.test(rowsOf(T)) && T.visits.slice(-2).map(v => v.ms).join() === `${40 * MIN},${10 * MIN}` && silent(T), js(lib.timelineLines(T))]);
    const again = apply(B, q.p, "resumed", { step: "implementation", open: open.map(o => ({ ...o, resolved: "confirmed" })) }, "2026-11-05T12:10:00Z");
    c.push(["the same resumed again: a duplicate", again.a.status === 0 && again.S.result === "duplicate", js(again.S.result)]);
    const ck = run(CHECK, [B.dir]); c.push(["check.js passes the board", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 400)]);
  });

  /* 5. the template's copy of the rule */
  guard("the template: its timelineSteps() and timelineRows() give lib.js's result; neither the stretch nor the wait is mentioned; the step panel reads the visit plainly ended", c => {
    const t = rd(PB), lines = t.split(/\r?\n/);
    const def = name => { const i = lines.findIndex(l => l.startsWith(`const ${name}=`) || l.startsWith(`function ${name}(`)); if (i < 0) throw new Error(`the template defines no ${name}`);
      let j = i + 1; while (j < lines.length && /^\s/.test(lines[j])) j++; return lines.slice(i, j).join("\n"); };
    const names = ["PASS_NAME", "STEP_NAME", "ROUTE_NAME", "ROUTE_OLD", "routeName", "remediationName", "stepLabel", "routesOf", "STEP_ORDER", "histOf", "visitsOf", "shownOf", "WAIT_BY", "waitsOf", "outagesOf", "okStamp", "isTime", "TL_FAMILIES", "tlFamily", "tlShade", "timelineFamilies", "APPROX_SOURCES", "approxBounds", "timelineLanded", "timelineSteps", "timelineRows", "tlSpan", "timelineTotal"];
    const src = names.map(def).join("\n") + "\nconst reconStep=()=>({trail:[],milestones:[]});\nthis.api={timelineSteps,timelineRows,timelineTotal};";
    const box = {}; vm.createContext(box); vm.runInContext(src, box);
    const A = box.api, shape = T => js({ v: T.visits.map(v => [v.step, v.label, v.from && v.from.t, v.to && v.to.t, v.ms, !!v.open]) });
    const rowSh = R => js(R.map(r => r.visit ? r.visit.label : "line"));
    const B1 = { status: "building", wip: { step: "document", since: "2026-11-03T00:00:03Z", steps: STEPS, waits: [{ step: "document", since: "2026-11-02T03:05:00Z", ended: "2026-11-02T03:07:30Z", by: "open-points" }], outages: [{ step: "document", since: "2026-11-02T04:16:35Z", ended: "2026-11-03T00:00:03Z", reason: "session restart" }],
      history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z" }], document: [{ since: "2026-11-02T02:11:00Z", ended: "2026-11-02T03:05:00Z", held: true }, { since: "2026-11-02T03:07:30Z", ended: "2026-11-02T04:16:35Z", outage: "session restart" }] } } };
    const B2 = { status: "building", wip: { step: "halted", resume: "plan", since: "2026-11-01T17:30:00Z", steps: STEPS, waits: [{ step: "plan", since: "2026-11-01T17:30:00Z", ended: "2026-11-01T18:00:00Z", by: "halted" }, { step: "plan", since: "2026-11-01T19:00:00Z", ended: null, by: "halted" }], outages: [{ step: "plan", since: "2026-11-01T18:00:00Z", ended: "2026-11-01T19:00:00Z", reason: null }],
      history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z" }], plan: [{ since: "2026-11-01T17:10:00Z", ended: "2026-11-01T17:30:00Z", held: true }] } } };
    const now = "2026-11-03T00:19:03Z";
    [[B1, "a running visit after the stretch"], [B2, "a stretch inside a wait, the board stopped"]].forEach(([b, what]) => { const L = lib.timelineSteps(b, { now }), P = A.timelineSteps(b, now);
      c.push([`${what}: the template's Timeline is lib.js's (the visits, the rows, the figure), and neither holds a wait or a stretch`, shape(L) === shape(P) && lib.timelineTotal(L) === A.timelineTotal(P) && rowSh(lib.timelineRows(L)) === rowSh(A.timelineRows(P)) && !("waits" in P) && !("outages" in P) && A.timelineRows(P).every(r => r.visit), js([shape(L), shape(P)])]); });
    c.push(["the tile draws the visits alone: no wait or stretch line, mark or \"not counted\" note", /timelineRows\(T\)\.map\(r=>line\(r\.visit\)\)/.test(t) && !/oline=|wline=|class="tl-outage"|class="tl-wait"|\.tl-outk\{|\.tl-waitk\{|\.tl-outage|\.tl-wait\b|timelineWaitNote|hatched: run not running|yellow: waiting on you|The run waits on you: no step's time/.test(t), "timelineTile"]);
    c.push(["a step's segment keeps a quarter of the old floor: 0.75 % of the figure (was 3 %) and 1 px (was 4 px)", /n:tsTot>0\?Math\.max\(v\.ms,tsTot\*0\.0075\):1/.test(t) && /\.kpi-tile \.seg-bar i\.tp\{min-width:1px\}/.test(t), "tpParts · .seg-bar i.tp"]);
    c.push(["the Context's events leave out an older run-restarted's trail entry", /\(PLAN\.trail\|\|\[\]\)\.filter\(t=>!\(t&&\/\^Run not running for \/\.test/.test(t), "events"]);
    c.push(["the bar takes the visits alone", /const tpParts=tsTimed\.map\(/.test(t) && /tsTimed=TS\.visits\.filter\(/.test(t), "tpParts"]);
    c.push(["the step panel reads a visit a stretch ended like any visit's end, its time only (no reason, no ending event); a halt still \"ended, waiting on you\"", /grp\(V\.held&&!V\.outage\?"ended, waiting on you":"ended",`<span class="nw">\$\{when\(V\.ended\)\}<\/span>\$\{V\.endedBy&&!V\.outage\?/.test(t) && !/ended, run not running/.test(t), "visitHtml"]);
    const F = require(sk("system/scripts/features.js")), f = F.FEATURES.find(x => x.id === "timeline-uncounted-silent"), old = t + '\n<script>const oline=x=>`<span class="tl-outage">`;</script>\n';
    c.push(["the feature detector holds issue and tracking boards to it, fails a board that still draws the line, and says why the others do not fit", f && f.test(t.replace(/\r\n/g, "\n"), "plan-board") === true && f.test(old, "plan-board") !== true && !F.FEATURES.some(x => x.id === "timeline-outages") && js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f.notFor[k]), js(f && f.types)]);
  });
  return groups;
};

/* on its own, with no browser: the case groups against the skill's own templates */
if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
