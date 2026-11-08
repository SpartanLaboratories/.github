// The cases of the team-raised retime (admin-team/dashboards/retime; plan/RULES.md §4, the retime row), run by verify-templates.js (it passes its
// helpers in), or on its own with no browser: node verify/cases-retime.js [--out <dir>].
// The trigger: KotlinBottools #2's run sent its sizing time as midnight, so its board's run start, its sizing's end and its plan's first visit
// all read 00:00. A retime corrects one event's recorded time: every place the record holds the old time moves to the new one (plan.sized, the
// visits and their snapshots, the waits, the questions, on a day change its trail entry's date, on a sub-issue its tracking board's record of
// it), with exactly one notes.corrections entry; no wip.event, no note, no trail entry of its own, the step and the detail unchanged. It is
// refused, nothing written, where the record does not hold the old time, another event is named at it, it bounds a stretch when the run was
// not running, or the new time crosses any other recorded time (strictly: it may meet a neighbour's); on a day change where the trail cannot
// tell the event's entry or the new day passes a neighbour's. A landed board takes it, kept as it closed (not re-rendered); --view writes
// the view copy alone; raised again, a duplicate. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesRetime(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the retime cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const sc = path.join(out, "retime"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), TIMELINE = sk("plan/scripts/timeline.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  let n = 0;
  /* an issue board in flight, from the worked example: its record as the fast path writes one */
  const flight = wip => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, questions: [], research: null, open: [], qa: [], plan: null, steps: STEPS.slice(), ...wip }; return x; };
  const running = () => { const p = flight({ step: "document", since: "2026-11-02T03:07:30Z", updated: "2026-11-02T04:14:48Z", current: ["built"], event: { name: "state-boards", at: "2026-11-02T04:14:48Z" }, detail: "Document: 6 of 7 tasks done.", document: { tasks: [{ id: "state-boards", name: "State boards", state: "current" }] },
    waits: [{ step: "document", since: "2026-11-02T03:05:00Z", ended: "2026-11-02T03:07:30Z", by: "open-points" }],
    history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z", endedBy: "sized", to: "plan" }], plan: [{ since: "2026-11-01T17:10:00Z", ended: "2026-11-01T21:31:00Z", endedBy: "plan-accepted", to: "branch", event: { name: "sized", at: "2026-11-01T17:10:00Z" }, plan: { state: "writing", since: "2026-11-01T17:10:00Z" } }],
      document: [{ since: "2026-11-02T02:11:00Z", ended: "2026-11-02T03:05:00Z", endedBy: "resumed", to: "document", held: true }] } });
    p.sized = "2026-11-01T17:10:00Z"; return p; };
  const lay = (name, plan, page) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), page || rd(PB)); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  const req = (plan, ev, facts, more) => wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, ...(ev ? { event: ev } : {}), folder: plan.folder, facts: facts || {}, ...(more || {}) }));
  const apply = (B, plan, ev, facts, at, extra) => { const a = run(APPLY, ["--event", req(plan, ev, facts), "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json", ...(extra || [])]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const vis = (p, s) => ((p.wip.history || {})[s] || []).map(v => [v.since, v.ended]);
  const files = B => ["plan.json", "dashboard.html", "plan.js"].map(f => { try { return rd(path.join(B.dir, f)); } catch (e) { return null; } }).join("\u0000");
  const R = (event, from, to, reason) => ({ event, from, to, reason: reason === undefined ? "the run sent its sizing time late" : reason });
  const ncorr = p => ((p.notes || {}).corrections || []).length;

  guard("apply-event.js retime: every place the record holds the event's old time moves to the new one, with one notes.corrections entry, and nothing else", c => {
    const plan = running(), B = lay("moves", plan), before = JSON.parse(rd(path.join(B.dir, "plan.json")));
    const r = apply(B, plan, "retime", R("sized", "2026-11-01T17:10:00Z", "2026-11-01T17:30:00Z"), "2026-11-03T00:00:00Z");
    c.push(["applied, enrich no", r.a.status === 0 && r.S.result === "ok" && r.S.enrich === "no", js([r.S.result, r.S.enrich, r.S.why, r.S.error])]);
    c.push(["the run's start, the sizing's end, the plan visit's start, its snapshot's event and its plan's start move", r.p.sized === "2026-11-01T17:30:00Z" && js(vis(r.p, "sizing")) === js([[null, "2026-11-01T17:30:00Z"]]) && js(vis(r.p, "plan")) === js([["2026-11-01T17:30:00Z", "2026-11-01T21:31:00Z"]]) && r.p.wip.history.plan[0].event.at === "2026-11-01T17:30:00Z" && r.p.wip.history.plan[0].plan.since === "2026-11-01T17:30:00Z", js([r.p.sized, vis(r.p, "sizing"), vis(r.p, "plan")])]);
    c.push(["no time of the old value is left anywhere in the record", !JSON.stringify({ ...r.p, notes: null }).includes("2026-11-01T17:10:00Z"), ""]);
    const e = (r.p.notes.corrections || []).slice(-1)[0] || {};
    c.push(["exactly one notes.corrections entry, with its retime and the day it was made", ncorr(r.p) === ncorr(before) + 1 && js(e.retime) === js({ event: "sized", from: "2026-11-01T17:10:00Z", to: "2026-11-01T17:30:00Z" }) && e.when === "2026-11-03", js(e)]);
    c.push(["…what was recorded and why, what it is now, and what moved with it", e.what === "The sizing was recorded at 2026-11-01 17:10:00 UTC: the run sent its sizing time late. It is recorded at 17:30:00 UTC; the run's start and the visits it bounds (sizing, plan) move with it.", e.what]);
    c.push(["no wip.event, no trail entry, the step, its start, the FullPulse and the detail unchanged; wip.updated moves", js(r.p.wip.event) === js(before.wip.event) && (r.p.trail || []).length === (before.trail || []).length && r.p.wip.step === "document" && r.p.wip.since === before.wip.since && js(r.p.wip.current) === js(before.wip.current) && r.p.wip.detail === before.wip.detail && r.p.wip.updated === "2026-11-03T00:00:00Z", js([r.p.wip.event, r.p.wip.updated, (r.p.trail || []).length])]);
    const T = lib.timelineSteps(r.p, { now: "2026-11-02T05:00:00Z" }), pv = T.visits.find(v => /^Plan/.test(v.label));
    c.push(["the Timeline reads the plan visit from the corrected start", pv && pv.from && pv.from.t === "2026-11-01T17:30:00Z", js(pv && pv.from)]);
    const ck = run(CHECK, [B.dir]); c.push(["check.js passes the board", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    const tl = run(TIMELINE, [B.dir]); c.push(["timeline.js prints the corrected sizing end", tl.status === 0 && /2026-11-01 17:30Z/.test(tl.stdout) && !/17:10Z/.test(tl.stdout), (tl.stdout || "").slice(0, 300)]);
    const html = rd(path.join(B.dir, "dashboard.html")); c.push(["the board's data block carries the entry (the Context's Notes card draws it)", html.includes("It is recorded at 17:30:00 UTC"), ""]);
    const f0 = files(B), again = apply(B, r.p, "retime", R("sized", "2026-11-01T17:10:00Z", "2026-11-01T17:30:00Z"), "2026-11-03T00:10:00Z");
    c.push(["raised again: a duplicate, nothing written", again.a.status === 0 && again.S.result === "duplicate" && files(B) === f0, js([again.S.result, again.S.error])]);
    /* a later event after it applies as before, and the corrected time stays */
    const q = apply(B, r.p, "landing", { pr: 7 }, "2026-11-03T00:30:00Z");
    c.push(["a later event applies on the corrected record, which it keeps", q.a.status === 0 && q.p.sized === "2026-11-01T17:30:00Z" && q.p.wip.step === "landing", js([q.S.result, q.S.error, q.p.sized])]);
  });

  guard("apply-event.js retime: refused, nothing written, where the record does not hold the old time, the new one crosses a neighbouring bound, or the facts fall short", c => {
    const plan = running(), B = lay("refusals", plan), f0 = files(B);
    const no = (name, ev, facts, re, at) => { const r = apply(B, plan, ev, facts, at || "2026-11-03T00:00:00Z");
      c.push([name, r.a.status === 1 && r.S.result === "failed" && re.test(r.S.error || "") && files(B) === f0, js([r.a.status, r.S.result, r.S.error])]); };
    no("an old time the record does not hold", "retime", R("plan-accepted", "2026-11-01T21:30:00Z", "2026-11-01T21:20:00Z"), /holds no time 2026-11-01T21:30:00Z: plan-accepted is recorded at 2026-11-01T21:31:00Z/);
    no("a sizing at another time than plan.sized", "retime", R("sized", "2026-11-01T21:31:00Z", "2026-11-01T21:20:00Z"), /holds the sizing at 2026-11-01T17:10:00Z/);
    no("another event named at the same time", "retime", R("halted", "2026-11-01T17:10:00Z", "2026-11-01T17:20:00Z"), /sized is recorded at the same time/);
    no("a new time past a later bound (the plan visit's end)", "retime", R("sized", "2026-11-01T17:10:00Z", "2026-11-01T22:00:00Z"), /crosses the end of plan · visit 1/);
    no("a new time past a wait's bound", "retime", R("resumed", "2026-11-02T03:05:00Z", "2026-11-02T03:08:00Z"), /crosses the end of a wait on the user|crosses the running visit's start/);
    no("a new time after the retime's own", "retime", R("sized", "2026-11-01T17:10:00Z", "2026-11-03T01:00:00Z"), /after the retime's own time/);
    no("the same time twice", "retime", R("sized", "2026-11-01T17:10:00Z", "2026-11-01T17:10:00.000Z"), /same time/);
    no("no reason", "retime", R("sized", "2026-11-01T17:10:00Z", "2026-11-01T17:20:00Z", ""), /no facts.reason/);
    no("no event named", "retime", { from: "2026-11-01T17:10:00Z", to: "2026-11-01T17:20:00Z", reason: "x" }, /no facts.event/);
    no("an event a retime does not correct (run-restarted)", "retime", R("run-restarted", "2026-11-01T17:10:00Z", "2026-11-01T17:20:00Z"), /no event whose time a retime corrects/);
    no("no times", "retime", R("sized", "midnight", "2026-11-01T17:20:00Z"), /no facts.from and facts.to/);
    no("a request naming no event, with a retime's facts: never read as facts.event", null, R("sized", "2026-11-01T17:10:00Z", "2026-11-01T17:20:00Z"), /names no event: a retime is "event": "retime"/);
    /* a stretch when the run was not running: its bounds are its own facts */
    const p2 = running(); p2.wip.outages = [{ step: "document", since: "2026-11-02T01:00:00Z", ended: "2026-11-02T02:11:00Z", reason: "session restart" }];
    const B2 = lay("outage", p2), g0 = files(B2);
    const o1 = apply(B2, p2, "retime", R("plan-accepted", "2026-11-02T02:11:00Z", "2026-11-02T02:20:00Z"), "2026-11-03T00:00:00Z");
    c.push(["an old time that bounds a stretch when the run was not running", o1.a.status === 1 && /bound of a stretch when the run was not running/.test(o1.S.error || "") && files(B2) === g0, js([o1.S.error])]);
    const o2 = apply(B2, p2, "retime", R("plan-accepted", "2026-11-01T21:31:00Z", "2026-11-02T01:30:00Z"), "2026-11-03T00:00:00Z");
    c.push(["a new time inside a stretch crosses its start", o2.a.status === 1 && /crosses a stretch when the run was not running/.test(o2.S.error || "") && files(B2) === g0, js([o2.S.error])]);
    /* a neighbour's time may be met, never passed */
    const m = apply(B, plan, "retime", R("sized", "2026-11-01T17:10:00Z", "2026-11-01T21:31:00Z"), "2026-11-03T00:00:00Z");
    c.push(["a new time that meets the next bound exactly applies", m.a.status === 0 && m.p.sized === "2026-11-01T21:31:00Z" && js(vis(m.p, "plan")) === js([["2026-11-01T21:31:00Z", "2026-11-01T21:31:00Z"]]), js([m.S.error, vis(m.p, "plan")])]);
  });

  guard("apply-event.js retime: on a day change the event's trail entry takes the new date, refused where the trail cannot tell it or the new day passes a neighbour's", c => {
    const day = trail => { const p = running(); p.sized = "2026-11-01T23:50:00Z";
      p.wip.history = { sizing: [{ since: null, ended: "2026-11-01T23:50:00Z", endedBy: "sized", to: "plan" }], plan: [{ since: "2026-11-01T23:50:00Z", ended: "2026-11-02T01:00:00Z", endedBy: "plan-accepted", to: "branch" }],
        document: [{ since: "2026-11-02T02:11:00Z", ended: "2026-11-02T03:05:00Z", endedBy: "resumed", to: "document", held: true }] };
      p.trail = trail; return p; };
    const ok = [{ date: "2026-11-01", column: "gap", label: "Sized; the plan starts" }, { date: "2026-11-02", column: "verdict", label: "Plan accepted" }];
    const p = day(ok), B = lay("day", p);
    const r = apply(B, p, "retime", R("sized", "2026-11-01T23:50:00Z", "2026-11-02T00:10:00Z", "the run sent a local time as UTC"), "2026-11-03T00:00:00Z");
    c.push(["the trail entry of the sizing takes the new day; the others stay", r.a.status === 0 && js(r.p.trail.map(t => t.date)) === js(["2026-11-02", "2026-11-02"]) && r.p.sized === "2026-11-02T00:10:00Z", js([r.S.error, r.p.trail])]);
    const e = r.p.notes.corrections.slice(-1)[0];
    c.push(["…the entry names the new time with its day, and its trail entry among what moved", /It is recorded at 2026-11-02 00:10:00 UTC; the run's start, the visits it bounds \(sizing, plan\) and its trail entry move with it\.$/.test(e.what), e.what]);
    const pass = day([{ date: "2026-11-01", column: "gap", label: "Sized; the plan starts" }, { date: "2026-11-01", column: "gap", label: "Research started: `q1`" }]), B2 = lay("day-pass", pass), g0 = files(B2);
    const r2 = apply(B2, pass, "retime", R("sized", "2026-11-01T23:50:00Z", "2026-11-02T00:10:00Z"), "2026-11-03T00:00:00Z");
    c.push(["a new day that passes a later entry's date: refused, nothing written", r2.a.status === 1 && /moves its trail entry past "Research started/.test(r2.S.error || "") && files(B2) === g0, js([r2.S.error])]);
    const two = day([{ date: "2026-11-01", column: "gap", label: "Run started" }, { date: "2026-11-01", column: "gap", label: "Sized; the plan starts" }]), B3 = lay("day-two", two), h0 = files(B3);
    const r3 = apply(B3, two, "retime", R("sized", "2026-11-01T23:50:00Z", "2026-11-02T00:10:00Z"), "2026-11-03T00:00:00Z");
    c.push(["two entries of the event on the old day: refused, which one is its own cannot be told", r3.a.status === 1 && /2 entries of sized on 2026-11-01/.test(r3.S.error || "") && files(B3) === h0, js([r3.S.error])]);
    const none = day([{ date: "2026-11-02", column: "verdict", label: "Plan accepted" }]), B4 = lay("day-none", none);
    const r4 = apply(B4, none, "retime", R("sized", "2026-11-01T23:50:00Z", "2026-11-02T00:10:00Z"), "2026-11-03T00:00:00Z");
    c.push(["no entry of the event on the old day: applied, the summary says no date moved", r4.a.status === 0 && (r4.S.applied || []).some(l => /no entry of sized on 2026-11-01: no date moved/.test(l)) && js(r4.p.trail) === js(none.trail), js([r4.S.error, r4.S.applied])]);
  });

  guard("apply-event.js retime: a landed board takes it, kept as it closed (not re-rendered onto the template); a cancelled one too", c => {
    const p = copy(EX); p.sized = "2026-10-19T09:00:00Z"; p.wip = { ...p.wip, step: "landed", since: "2026-10-20T12:00:00Z", updated: "2026-10-20T12:00:00Z", event: { name: "landed", at: "2026-10-20T12:00:00Z" },
      history: { sizing: [{ since: null, ended: "2026-10-19T09:00:00Z", endedBy: "sized", to: "plan" }], plan: [{ since: "2026-10-19T09:00:00Z", ended: "2026-10-19T15:00:00Z", endedBy: "plan-accepted", to: "branch" }] } };
    const page = rd(PB).replace("</head>", "<!-- an older page this board landed with -->\n</head>"), B = lay("landed", p, page);
    const r = apply(B, p, "retime", R("sized", "2026-10-19T09:00:00Z", "2026-10-19T09:40:00Z"), "2026-11-03T00:00:00Z");
    c.push(["applied on the landed board", r.a.status === 0 && r.p.sized === "2026-10-19T09:40:00Z" && r.p.status === "built" && r.p.wip.step === "landed", js([r.S.result, r.S.error])]);
    c.push(["…its page kept as it landed: not re-rendered", (r.S.rerendered || []).length === 0 && rd(path.join(B.dir, "dashboard.html")).includes("an older page this board landed with"), js(r.S.rerendered)]);
    c.push(["…one entry, its last event kept", ncorr(r.p) === ncorr(p) + 1 && js(r.p.wip.event) === js(p.wip.event), js(r.p.wip.event)]);
    const q = copy(p); q.status = "abandoned"; q.wip = { ...q.wip, step: "cancelled", event: { name: "cancelled", at: "2026-10-20T12:00:00Z" } }; delete q.asBuilt;
    const B2 = lay("cancelled", q), r2 = apply(B2, q, "retime", R("sized", "2026-10-19T09:00:00Z", "2026-10-19T09:40:00Z"), "2026-11-03T00:00:00Z");
    c.push(["a cancelled board takes it too", r2.a.status === 0 && r2.p.sized === "2026-10-19T09:40:00Z", js([r2.S.error])]);
  });

  guard("apply-event.js retime on a sub-issue: its tracking board's record of the same time moves with it, said in the one entry; --view writes the view copies alone", c => {
    const TF = "docs/plans/55-http-client-stack", T0 = "2026-10-26T09:00:00Z", T1 = "2026-10-26T09:20:00Z";
    const main = path.join(sc, "sub"), tdir = path.join(main, ...TF.split("/")), sdir = path.join(tdir, "69-feeds");
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const trk = copy(TRK); trk.rows.filter(r => r.unit).forEach(r => { r.unit.board = null; if (r.unit.folder) r.unit.folder = null; });
    trk.wip = { ...trk.wip, step: "implementation", since: T1, updated: T1, current: ["feeds.built"], event: { name: "sub-issues-filed", at: T0 },
      history: { ...(trk.wip.history || {}), "sub-issues": [{ since: T0, ended: T1, endedBy: "sized", to: "implementation" }] } };
    trk.trail = [...(trk.trail || []), { date: "2026-10-26", column: "built", label: "#69 started" }];
    { const nx = lib.nextUnit(trk); trk.wip.next = nx ? nx.id : null; }
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB));
    const s = flight({ step: "plan", since: T1, updated: T1, current: ["considered", "verdict"], event: { name: "sized", at: T1 }, detail: "Sized; the plan starts.", plan: { state: "re-pass", from: "parent", since: T1 },
      history: { sizing: [{ since: null, ended: T1, endedBy: "sized", to: "plan" }] } });
    Object.assign(s, { issue: 69, slug: "69-feeds", folder: `${TF}/69-feeds`, parent: { issue: 55 }, sized: T1 }); delete s.issueBoards;
    wr(path.join(sdir, "plan.json"), JSON.stringify(s, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    [sdir, tdir].forEach(d => { const e = run(EMBED, [d]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); });
    if (git(main, "add", "-A").status !== 0 || git(main, "commit", "-q", "-m", "boards").status !== 0) throw new Error("git commit failed");
    const B = { root: main, dir: sdir }, tracked = () => [sdir, tdir].map(d => rd(path.join(d, "plan.json"))).join("\u0000"), t0 = tracked();
    const to = "2026-10-26T09:25:00Z", a = run(APPLY, ["--event", req(s, "retime", R("sized", T1, to)), "--worktree", main, "--main", main, "--view", "--no-gh", "--no-live", "--at", "2026-11-03T00:00:00Z", "--json"]), S = parse(a);
    const VS = path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "69-feeds", "plan.json"), VT = path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "plan.json");
    c.push(["applied with --view: no tracked file written", a.status === 0 && S.result === "ok" && tracked() === t0 && git(main, "status", "--porcelain").stdout.trim() === "", js([S.result, S.error, git(main, "status", "--porcelain").stdout])]);
    const vs = fs.existsSync(VS) ? JSON.parse(rd(VS)) : null, vt = fs.existsSync(VT) ? JSON.parse(rd(VT)) : null;
    c.push(["the sub-issue's copy: its start, its sizing's end, its running visit's start and its plan's start moved", vs && vs.sized === to && vs.wip.since === to && vs.wip.history.sizing[0].ended === to && vs.wip.plan.since === to && vs.wip.event.at === to, js(vs && [vs.sized, vs.wip.since, vs.wip.event])]);
    c.push(["the tracking board's copy: its implementation start and the filing visit's end moved with it; its own last event kept", vt && vt.wip.since === to && vt.wip.history["sub-issues"][0].ended === to && vt.wip.event.at === T0, js(vt && [vt.wip.since, vt.wip.history["sub-issues"], vt.wip.event])]);
    const e = vs && (vs.notes.corrections || []).slice(-1)[0];
    c.push(["one entry, on the sub-issue's board, naming the tracking board's record; none on the tracking board", e && /#55's record of it move with it\.$/.test(e.what) && ((vt.notes || {}).corrections || []).length === ((trk.notes || {}).corrections || []).length, js([e && e.what, vt && vt.notes])]);
    const ck = [run(CHECK, [path.dirname(VS), "--root", main]), run(CHECK, [path.dirname(VT), "--root", main])];
    c.push(["check.js passes both copies", ck.every(x => x.status === 0), ck.map(x => (x.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 200)).join(" || ")]);
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
