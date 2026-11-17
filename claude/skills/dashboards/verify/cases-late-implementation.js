// The cases of the q-102 wait rule, the late update of an implementation stage and a fix pass the user finished, run by verify-templates.js
// (it passes its helpers in), or on its own with no browser: node verify/cases-late-implementation.js [--out <dir>].
// 1. A wait is the run waiting on the user, whatever event put it there (the user's decision q-102, console/q102-escalated-wait: "If the session
//    is waiting on me then its a wait"; plan/RULES.md §2, "Waits on the user are not active time"): lib.js waitsOnUser() reads the board's record
//    of what the run waits on (wip.waitingOn, else a stop recorded before the field); waitSteps() opens a wait at whatever event leaves that
//    record standing and ends it at the event that clears it, by the event that marked it; check.js holds by to an event's name, never a list.
// 2. The late update of an implementation stage (plan/RULES.md §3, "The late update of an implementation stage"; the user's decisions
//    scheme/noimpl): a run halted for its implementation, resumed, records each stage its check found built with late-update (facts.event
//    implementation-stage, facts.stages, no time): the stage done, late, no finished, its report the detail; the stage made current with no
//    started; the Rows' as-built states derived; the step, the trail, wip.event and wip.detail unmoved; a second one replacing the report; the
//    same one twice writing nothing; the refusals; check.js; the template's Pill and finish chip, run in a vm with no browser.
// 3. A fix pass the user finished (answer 17 a): the run's implementation-stage with facts.remediation after its check closes the fixes'
//    sub-step at its own time, after the wait the halt opened, with no new event form.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), vm = require("vm");

module.exports = function casesLateImplementation(X) {
  const { sk, out } = X;
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const PB = sk("plan/template/dashboard.html");
  const sc = path.join(out, "late-implementation"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  let n = 0;
  /* the worked example's board in flight, at the branch step: no plan stage table in its folder, so the stages are the events' */
  const atBranch = () => { const x = copy(EX); Object.assign(x, { status: "planned", asBuilt: null, sized: "2026-11-16T08:00:00Z" });
    x.rows.forEach(r => { r.asBuilt = { state: "pending" }; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { step: "branch", since: "2026-11-16T09:50:00Z", updated: "2026-11-16T09:50:00Z", detail: "Branch next.", steps: STEPS, current: [], qa: [], open: [], waits: [], waitingOn: null, resume: null, event: { name: "plan-accepted", at: "2026-11-16T09:50:00Z" } };
    return x; };
  const tree = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB));
    const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, folder: plan.folder, plan }; };
  const evIn = T => (name, facts, extra) => { const rq = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: T.plan.repo, issue: T.plan.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--json", ...(extra || [])]); return { a, S: parse(a), p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const files = T => ["plan.json", "dashboard.html", "plan.js"].map(f => { try { return rd(path.join(T.dir, f)); } catch (e) { return null; } }).join("\u0000");
  const fails = d => { const r = run(CHECK, [d]); return { status: r.status, fails: (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)) }; };
  const stage = (p, id) => (p.wip.stages || []).find(x => x.id === id) || {};
  const ok0 = (r, what) => { if (r.a.status !== 0) throw new Error(`${what}: exit ${r.a.status} ${(r.S.error || r.S.refused || r.a.stderr || "").slice(0, 300)}`); return r; };
  const T1 = "2026-11-16T10:00:00Z", TH = "2026-11-16T10:05:00Z", TR = "2026-11-16T11:00:00Z", TA = "2026-11-16T11:02:00Z", TS = "2026-11-16T11:30:00Z";
  const STAGES = [{ id: "S1", name: "The rule", rows: ["validity-rule"] }, { id: "S2", name: "The routing", rows: ["routing", "refusal-reply"] }, { id: "S3", name: "The documents", rows: ["protocol-doc"] }];
  const states = (...s) => STAGES.map((x, i) => ({ id: x.id, name: x.name, state: s[i] }));
  const WAITING = "the implementation of the plan";
  /* the run halted for its implementation after the branch is cut, then resumed */
  const paused = (name, resume) => { const T = tree(name, atBranch()), ev = evIn(T);
    ok0(ev("branch-cut", { branch: "issue-38", stages: STAGES, at: T1 }), "branch-cut");
    const h = ok0(ev("halted", { waitingOn: WAITING, at: TH }), "halted");
    const r = resume === false ? null : ok0(ev("resumed", { detail: "The plan's first two stages are built.", at: TR }), "resumed");
    return { T, ev, h, r }; };
  const late = (ev, id, s, detail, extra) => ev("late-update", { event: "implementation-stage", stage: id, detail, stages: s }, extra || ["--arrived", TA]);

  guard("a wait is the run waiting on the user, whatever event put it there (q-102): waitsOnUser(), waitSteps() and check.js read no list of event types", c => {
    c.push(["waitsOnUser(): the board stopped on the user waits; a waitingOn an older event left standing on a board out of its stop is no wait",
      lib.waitsOnUser({ step: "halted", resume: "plan", waitingOn: "an answer" }) && lib.waitsOnUser({ step: "escalated" }) && !lib.waitsOnUser({ step: "document", waitingOn: "sign-off of the design" }) && !lib.waitsOnUser({ step: "plan" }), ""]);
    const now = "2026-11-16T12:00:00Z", pre = { wip: { step: "plan", since: "2026-11-16T11:00:00Z", waits: [] } }, post = { wip: { step: "halted", resume: "plan", since: now, waitingOn: "an answer", waits: [] } };
    const o = lib.waitSteps(pre, post, "plan-stage", now, {});
    c.push(["waitSteps(): an event of any name that puts the board into its record of a wait opens one, by that event (no list of event types)", !!o.opened && js(post.wip.waits) === js([{ step: "plan", since: now, ended: null, by: "plan-stage" }]), js(post.wip.waits)]);
    const later = "2026-11-16T12:30:00Z", pre2 = copy(post), post2 = copy(post); post2.wip.step = "plan"; delete post2.wip.resume; delete post2.wip.waitingOn;
    const o2 = lib.waitSteps(pre2, post2, "research-started", later, {});
    c.push(["…and the event that takes the board out of it, of any name, ends it", !!o2.closed && post2.wip.waits[0].ended === later && o2.endedBy === "halted",js([post2.wip.waits, o2.endedBy])]);
    /* a halt and an escalation, as the board takes them */
    const P = paused("wait-halt"), W = P.r.p.wip.waits || [];
    c.push(["a halt records what the run waits on and opens a wait by it; the resumed ends it", js(W) === js([{ step: "implementation", since: TH, ended: TR, by: "halted" }]) && P.h.p.wip.waitingOn === WAITING, js(W)]);
    const T = tree("wait-escalated", atBranch()), ev = evIn(T); ok0(ev("branch-cut", { branch: "issue-38", stages: STAGES, at: T1 }), "branch-cut");
    const e = ok0(ev("escalated", { at: TH }), "escalated"), EW = (e.p.wip.waits || []).slice(-1)[0] || {};
    c.push(["an escalation records what the run waits on (a re-sizing) and opens a wait by it", e.p.wip.waitingOn === "A re-sizing of the issue." && EW.by === "escalated" && EW.since === TH && EW.ended === null, js([e.p.wip.waitingOn, EW])]);
    /* check.js: by is the event that marked the wait */
    const f = path.join(P.T.dir, "plan.json"), keep = rd(f), pj = JSON.parse(keep);
    pj.wip.waits[0].by = "plan-accepted"; wr(f, JSON.stringify(pj, null, 2) + "\n"); const k1 = fails(P.T.dir);
    pj.wip.waits[0].by = 7; wr(f, JSON.stringify(pj, null, 2) + "\n"); const k2 = fails(P.T.dir); wr(f, keep);
    c.push(["check.js: a wait marked by any event's name is in its form", !k1.fails.some(l => /\.by is/.test(l)), k1.fails.join(" | ").slice(0, 300)]);
    c.push(["check.js: a by that is no event's name fails, naming the rule", k2.fails.some(l => /wip\.waits\[0\]\.by is the event that marked the wait/.test(l)), k2.fails.join(" | ").slice(0, 300)]);
  });

  guard("late-update of an implementation stage: done with no time, the stage made current unstamped, the Rows derived, the step, trail and WIP line unmoved", c => {
    const P = paused("late"), ev = P.ev, before = P.r.p;
    const a = late(ev, "S1", states("done", "current", "todo"), "S1 is in place: the validity rule and its tests.");
    const p = a.p, s1 = stage(p, "S1"), s2 = stage(p, "S2");
    c.push(["applied, exit 0", a.a.status === 0 && a.S.result === "ok", js([a.a.status, a.S.result, a.S.error])]);
    c.push(["S1 done, late, no finished, its start from the branch kept, its report the detail", s1.state === "done" && s1.late === true && s1.finished == null && s1.started === T1 && s1.report === "S1 is in place: the validity rule and its tests.", js(s1)]);
    c.push(["S2 current with no started: it became current at a time no one recorded", s2.state === "current" && s2.started == null && stage(p, "S3").state === "todo", js([s2, stage(p, "S3")])]);
    c.push(["the step stays implementation; no trail line, wip.event and wip.detail unmoved; wip.updated the arrival", p.wip.step === "implementation" && (p.trail || []).length === (before.trail || []).length && js(p.wip.event) === js(before.wip.event) && p.wip.detail === before.wip.detail && p.wip.updated === TA, js([p.wip.step, (p.trail || []).length, p.wip.event, p.wip.updated])]);
    c.push(["the Rows' as-built states as an implementation-stage derives them, and the FullPulse on S2's rows", p.rows.every(r => { const s = lib.stagedState(p, r); return !s || s === "partially-built" || lib.recordedState(r) === s; }) && lib.recordedState(p.rows.find(r => r.id === "routing")) === "in-progress" && js(p.wip.current) === js(["routing.built", "refusal-reply.built"]), js([p.rows.map(r => [r.id, lib.recordedState(r)]), p.wip.current])]);
    c.push(["status building; enrich yes, the rows' summaries left to the fill", p.status === "building" && a.S.enrich === "yes" && (a.S.why || []).some(x => /S1 done, recorded late/.test(x)), js([p.status, a.S.enrich, a.S.why])]);
    const k = fails(P.T.dir); c.push(["check.js passes the board", k.status === 0, k.fails.join(" | ").slice(0, 300)]);
    const f0 = files(P.T), again = late(ev, "S1", states("done", "current", "todo"), "S1 is in place: the validity rule and its tests.");
    c.push(["the same late update again: nothing written", again.a.status === 0 && again.S.result === "duplicate" && files(P.T) === f0, js([again.S.result, again.S.applied])]);
    const b = late(ev, "S2", states("done", "done", "current"), "S2 is in place: the routing and its reply."), q = b.p;
    c.push(["S2 recorded late the same way; S3 current, unstamped; S1 kept late", stage(q, "S2").late === true && stage(q, "S2").finished == null && stage(q, "S3").state === "current" && stage(q, "S3").started == null && stage(q, "S1").late === true, js(q.wip.stages)]);
    const r2 = late(ev, "S2", states("done", "done", "current"), "S2 is in place: the routing, its reply and its tests.");
    c.push(["a second late update of S2 replaces its report, and says so", r2.a.status === 0 && stage(r2.p, "S2").report === "S2 is in place: the routing, its reply and its tests." && (r2.S.applied || []).some(l => /its report replaced/.test(l)), js([stage(r2.p, "S2"), r2.S.applied])]);
    const d = ok0(ev("implementation-stage", { stage: "S3", detail: "S3 done: the documents.", stages: states("done", "done", "done"), at: TS }), "implementation-stage"), dp = d.p;
    c.push(["the run's later implementation-stage stamps S3's finish as usual, and S1 and S2 stay late, with no finish", stage(dp, "S3").finished === TS && stage(dp, "S1").late === true && stage(dp, "S2").late === true && stage(dp, "S1").finished == null && stage(dp, "S2").finished == null && dp.wip.step === "implementation", js(dp.wip.stages)]);
    const k2 = fails(P.T.dir); c.push(["check.js passes the board after it", k2.status === 0, k2.fails.join(" | ").slice(0, 300)]);
    const fz = files(P.T), done = late(ev, "S3", states("done", "done", "done"), "S3 again.");
    c.push(["a stage recorded done with a time: refused, exit 1, nothing written", done.a.status === 1 && /S3 is recorded done already \(finished 2026-11-16T11:30:00Z\)/.test(done.S.error || "") && files(P.T) === fz, js([done.a.status, done.S.error])]);
    /* check.js holds the late record to its form */
    const f = path.join(P.T.dir, "plan.json"), keep = rd(f), pj = JSON.parse(keep); pj.wip.stages[0].finished = "2026-11-16T10:30:00Z"; wr(f, JSON.stringify(pj, null, 2) + "\n");
    const k3 = fails(P.T.dir); wr(f, keep);
    c.push(["check.js fails a stage recorded late that records a finish", k3.fails.some(l => /wip\.stages\[0\] is recorded late, with no time, and records finished/.test(l)), k3.fails.join(" | ").slice(0, 300)]);
  });

  guard("late-update of an implementation stage: accepted while halted to resume at implementation; refused, nothing written, where the rule says", c => {
    const H = paused("late-halted", false), a = late(H.ev, "S1", states("done", "current", "todo"), "S1 is in place.");
    c.push(["while the run is halted to resume at implementation: applied, the board kept halted, its FullPulse as the halt left it", a.a.status === 0 && a.p.wip.step === "halted" && stage(a.p, "S1").late === true && js(a.p.wip.current) === js(H.h.p.wip.current), js([a.a.status, a.p.wip.step, a.p.wip.current, a.S.error])]);
    const P = paused("late-refused"), ev = P.ev, f0 = files(P.T);
    const no = (name, r, re, kind) => c.push([name, r.a.status === 1 && r.S.result === "failed" && re.test(r.S.error || "") && files(P.T) === f0 && (r.S.why || []).some(x => new RegExp(`no fill writes the ${kind || "implementation"} stages`).test(x)), js([r.a.status, r.S.error, r.S.why])]);
    no("a stage the board does not hold", late(ev, "S9", states("done", "current", "todo"), "x"), /"S9" is no implementation stage of this board/);
    no("without facts.stages", ev("late-update", { event: "implementation-stage", stage: "S1", detail: "x" }, ["--arrived", TA]), /carries facts\.stages/);
    no("a facts.stages entry the board does not hold", late(ev, "S1", [...states("done", "current", "todo"), { id: "S4", name: "More", state: "todo" }], "x"), /facts\.stages names "S4", no stage of this board/);
    no("the stage not done in facts.stages", late(ev, "S1", states("current", "todo", "todo"), "x"), /gives S1 as "current"/);
    no("with facts.remediation", ev("late-update", { event: "implementation-stage", stage: "S1", detail: "x", stages: states("done", "current", "todo"), remediation: { pass: 1, route: "remediation", steps: [] } }, ["--arrived", TA]), /closed by the run's implementation-stage with facts\.remediation/);
    no("with --at", late(ev, "S1", states("done", "current", "todo"), "x", ["--at", TA]), /late-update carries no time and is given none/);
    no("with facts.at", ev("late-update", { event: "implementation-stage", stage: "S1", detail: "x", stages: states("done", "current", "todo"), at: TA }, ["--arrived", TA]), /late-update carries no facts\.at/);
    no("an event late-update does not record", ev("late-update", { event: "qa-pass", stage: "S1", detail: "x" }, ["--arrived", TA]), /plan-stage or implementation-stage/, "plan");
    const Q = paused("late-at-qa"); ok0(Q.ev("qa-pass", { qa: { pass: 1, verdict: "running" }, at: TS }), "qa-pass"); const fq = files(Q.T);
    const rq = late(Q.ev, "S1", states("done", "current", "todo"), "x");
    c.push(["off the implementation step (at qa): refused, nothing written", rq.a.status === 1 && /stands at qa, not at its implementation step/.test(rq.S.error || "") && files(Q.T) === fq, js([rq.a.status, rq.S.error])]);
    const B = atBranch(); B.wip.step = "implementation"; B.wip.since = T1; const N = tree("late-no-stages", B), fn = files(N);
    const rn = late(evIn(N), "S1", states("done", "current", "todo"), "x");
    c.push(["a board with no wip.stages: refused, nothing written", rn.a.status === 1 && /records no implementation stages/.test(rn.S.error || "") && files(N) === fn, js([rn.a.status, rn.S.error])]);
    const K = tree("late-tracking", copy(TRK)), fk = files(K), rk = late(evIn(K), "S1", states("done", "current", "todo"), "x");
    c.push(["a tracking board: refused, nothing written", rk.a.status === 1 && /a tracking board keeps no implementation stages/.test(rk.S.error || "") && files(K) === fk, js([rk.a.status, rk.S.error])]);
  });

  guard("a fix pass the user finished (answer 17 a): the run's implementation-stage after its check closes the fixes' sub-step at its own time, after the wait", c => {
    const P = paused("fix-pass"), ev = P.ev;
    late(ev, "S1", states("done", "current", "todo"), "S1 is in place."); late(ev, "S2", states("done", "done", "current"), "S2 is in place.");
    ok0(ev("implementation-stage", { stage: "S3", detail: "S3 done.", stages: states("done", "done", "done"), at: TS }), "implementation-stage");
    ok0(ev("qa-pass", { qa: { pass: 1, verdict: "running" }, at: "2026-11-16T11:40:00Z" }), "qa running");
    const v = ok0(ev("qa-pass", { qa: { pass: 1, verdict: "changes-requested", code: 1, test: 0, doc: 0, severity: { minor: 0, other: 1 }, route: "remediation" }, rows: ["routing"], at: "2026-11-16T12:00:00Z" }), "qa verdict");
    const FH = "2026-11-16T12:05:00Z", FR = "2026-11-16T13:00:00Z", FD = "2026-11-16T13:10:00Z";
    const h = ok0(ev("halted", { waitingOn: "the fixes the review asks for", at: FH }), "halted at the fixes");
    const tl = (h.p.trail || []).slice(-1)[0] || {};
    c.push(["the halt at the fix pass reads by its route alone, waiting on you for the fixes", h.p.wip.step === "halted" && h.p.wip.resume === v.p.wip.step && /^Halted at (Correction|Resolution): waiting on you \(the fixes the review asks for\)$/.test(tl.label || ""), js([h.p.wip.step, h.p.wip.resume, tl.label])]);
    ok0(ev("resumed", { detail: "The fixes are made.", at: FR }), "resumed");
    const d = ok0(ev("implementation-stage", { detail: "Every fix is in place.", remediation: { pass: 1, route: "remediation", steps: [{ name: "Fix the routing reply", state: "done" }] }, rows: ["routing"], at: FD }), "the fixes done");
    const R = d.p.wip.remediation || {}, st = (R.steps || [])[0] || {}, W = (d.p.wip.waits || []).filter(x => x.since === FH);
    c.push(["the fixes' sub-step done at the event's time, after the wait; no new event form", d.p.wip.step === "remediation" && st.state === "done" && st.finished === FD, js([d.p.wip.step, R])]);
    c.push(["the time the user spent on the fixes is the wait the halt opened, not counted", W.length === 1 && W[0].ended === FR && W[0].by === "halted", js(d.p.wip.waits)]);
    const k = fails(P.T.dir); c.push(["check.js passes the board", k.status === 0, k.fails.join(" | ").slice(0, 300)]);
  });

  guard("the template: a stage recorded late reads \"✓ done · time not recorded\", its finish \"not recorded\", its Legend entry said; one with a time as before (vm, no browser)", c => {
    const lines = rd(PB).split(/\r?\n/);
    const def = name => { const i = lines.findIndex(l => l.startsWith(`const ${name}=`) || l.startsWith(`function ${name}(`)); if (i < 0) throw new Error(`the template defines no ${name}`);
      let j = i + 1; while (j < lines.length && /^\s/.test(lines[j])) j++; return lines.slice(i, j).join("\n"); };
    const src = `const STATES={"in-progress":{g:"◐",label:"in progress",cls:"info"}};const esc=s=>String(s);const okStamp=v=>typeof v==="string"&&!isNaN(Date.parse(v));const when=v=>"at "+v;\n`
      + ["pill", "STG_PILL", "STG_WORD", "stgState", "stgPill", "stgChip", "stampChips"].map(def).join("\n") + "\nthis.api={stgPill,stampChips};";
    const box = {}; vm.createContext(box); vm.runInContext(src, box); const A = box.api;
    const k1 = new Set(), lateX = { id: "S1", state: "done", late: true, started: T1, report: "x" }, timed = { id: "S2", state: "done", started: T1, finished: TS };
    const p1 = A.stgPill(lateX, k1, "stage"), c1 = A.stampChips(lateX).join("");
    c.push(["the late stage's Pill reads done · time not recorded, and its Legend entry says it was recorded late", /done · time not recorded/.test(p1) && [...k1].some(x => /a stage recorded late, with no time/.test(x)), js([p1, [...k1]])]);
    c.push(["its finish reads not recorded, its start as recorded", /finished.*not recorded/.test(c1) && /started.*at 2026-11-16T10:00:00Z/.test(c1), c1]);
    const k2 = new Set(), p2 = A.stgPill(timed, k2, "stage"), c2 = A.stampChips(timed).join("");
    c.push(["a stage done with its time reads done, its finish its time, as before", />done</.test(p2) && !/time not recorded/.test(p2) && /finished.*at 2026-11-16T11:30:00Z/.test(c2) && [...k2].some(x => /a stage finished/.test(x)), js([p2, c2])]);
  });

  return groups;
};

if (require.main === module) {
  /* no live GitHub, no machine cache: the private repositories from the fixture list (system/scripts/privaterefs.js) */
  process.env.DASHBOARDS_VERIFY = "1"; process.env.DASHBOARDS_PRIVATES = process.env.DASHBOARDS_PRIVATES || path.join(__dirname, "fixtures", "private-repositories.json");
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let bad = 0;
  module.exports({ sk, out }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
