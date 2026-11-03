// The cases of the waits on the user (admin-team/board/timeline-waits; plan/RULES.md §2, "The Timeline tile's legend", §4, "The fast path owns
// the Timeline"), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-timeline-waits.js
// [--out <dir>]. The time from a blocking question to the user until its answer is waiting, not active time: no visit's duration and no
// Timeline figure counts it, and the step is split into visits around it, as a step the run comes back to is. The signals, on the fast
// path (apply-event.js, lib.js waitSteps()): a stop (halted, escalated) until the event that takes the board out of it; and a resumed on a
// board that was not stopped, after an event whose open points it answers. The step a run names in its own words ("implement") read as
// the board's. While the run waits no visit runs to now (the template's tick has nothing to follow). lib.js timelineSteps() and the
// template's copy agree. No case here opens a browser. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), vm = require("vm");

module.exports = function casesTimelineWaits(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["the waits on the user (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "timeline-waits"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const MIN = 60000, STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  /* a board in flight, from the example: its rows pending, no as-built, the wip given */
  const flight = wip => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, questions: [], research: null, open: [], qa: [], plan: null, steps: STEPS.slice(), ...wip }; return x; };
  const lay = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir);
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir }; };
  let nreq = 0;
  const apply = (B, plan, ev, facts, at) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: ev, folder: plan.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const vis = (p, s) => ((p.wip.history || {})[s] || []).map(v => [v.since, v.ended, v.endedBy || null, !!v.held]);

  /* 1. a stop, halted then resumed, inside the plan step */
  guard("apply-event.js: a halt ends the visit running at the question, held; the resume starts the step's next visit at the answer; the wait between them counts for neither", c => {
    const plan = flight({ step: "plan", since: "2026-11-01T17:10:00Z", updated: "2026-11-01T17:10:00Z", current: ["considered", "verdict"], plan: { state: "writing", since: "2026-11-01T17:10:00Z" },
      event: { name: "sized", at: "2026-11-01T17:10:00Z" }, history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z", endedBy: "sized", to: "plan" }] } });
    const B = lay("halt", plan);
    const h = apply(B, plan, "halted", { waitingOn: "interview answers" }, "2026-11-01T17:30:52Z");
    c.push(["halted: the plan's visit 1 frozen 17:10 → 17:30:52, held, ended by the halt", h.a.status === 0 && js(vis(h.p, "plan")) === js([["2026-11-01T17:10:00Z", "2026-11-01T17:30:52Z", "halted", true]]), js([h.a.status, vis(h.p, "plan"), h.S.error])]);
    c.push(["…and the wait opened: wip.waits [{ plan, 17:30:52, open, halted }], the board stopped", js(h.p.wip.waits) === js([{ step: "plan", since: "2026-11-01T17:30:52Z", ended: null, by: "halted" }]) && h.p.wip.step === "halted" && h.p.wip.resume === "plan", js([h.p.wip.waits, h.p.wip.step])]);
    const T0 = lib.timelineSteps(h.p, { now: "2026-11-01T17:40:00Z" });
    c.push(["while it waits, no visit runs to now (nothing open for the tick to follow); the wait is open, not counted", !T0.visits.some(v => v.open) && T0.waits.length === 1 && T0.waits[0].open && T0.waits[0].ms == null && lib.timelineTotal(T0) === 20 * MIN + 52000 && /waiting on the user now: not counted/.test(lib.timelineWaitNote(T0)), js([lib.timelineLines(T0), lib.timelineWaitNote(T0)])]);
    const again = apply(B, h.p, "halted", { waitingOn: "interview answers" }, "2026-11-01T17:30:52Z");
    c.push(["the same halt again: a duplicate, nothing written", again.a.status === 0 && again.S.result === "duplicate" && js(again.p.wip.waits) === js(h.p.wip.waits), js([again.S.result, again.p.wip.waits])]);
    const r = apply(B, h.p, "resumed", {}, "2026-11-01T17:43:53Z");
    c.push(["resumed: the wait ended at the answer; the step back at plan, its since the answer; no second visit frozen", r.a.status === 0 && js(r.p.wip.waits) === js([{ step: "plan", since: "2026-11-01T17:30:52Z", ended: "2026-11-01T17:43:53Z", by: "halted" }]) && r.p.wip.step === "plan" && r.p.wip.since === "2026-11-01T17:43:53Z" && vis(r.p, "plan").length === 1, js([r.p.wip.waits, r.p.wip.step, r.p.wip.since, vis(r.p, "plan")])]);
    const q = apply(B, r.p, "research-planning", { drafted: 0 }, "2026-11-01T17:44:30Z");
    c.push(["the next event that ends the step: the plan's visit 2, 17:43:53 → 17:44:30, starting at the answer, not at the question", q.a.status === 0 && js(vis(q.p, "plan")) === js([["2026-11-01T17:10:00Z", "2026-11-01T17:30:52Z", "halted", true], ["2026-11-01T17:43:53Z", "2026-11-01T17:44:30Z", "research-planning", false]]), js(vis(q.p, "plan"))]);
    const T = lib.timelineSteps(q.p, { now: "2026-11-01T18:00:00Z" }), L = lib.timelineLines(T);
    c.push(["the Timeline: plan · visit 1, the wait, plan · visit 2, research so far; the figure the visits alone (20 min 52 s + 37 s + 15 min 30 s), the wait named in the sub-line",
      T.visits.map(v => v.label).join(",") === "sizing,plan · visit 1,plan · visit 2,research" && lib.timelineRows(T).map(x => x.wait ? "wait" : x.visit.label).join(",") === "sizing,plan · visit 1,wait,plan · visit 2,research"
      && lib.timelineTotal(T) === (20 * MIN + 52000) + 37000 + (15 * MIN + 30000) && lib.timelineWaitNote(T) === "not counted: waiting on the user, 13 min", js([L, lib.timelineTotal(T), lib.timelineWaitNote(T)])]);
    const ck = run(CHECK, [B.dir]);
    c.push(["check.js passes the board with its waits", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL|wip\.waits/.test(l)).join(" | ").slice(0, 400)]);
  });

  /* 2. the open points of an event, answered by a resumed (the #65 case) */
  guard("apply-event.js: an event's open points put to the user, then a resumed that answers them: the wait runs from that event to the resumed, the visit split around it", c => {
    const stages = [1, 2, 3].map(i => ({ id: `S${i}`, name: `Stage ${i}`, state: i < 3 ? "done" : "current" }));
    const plan = flight({ step: "implementation", since: "2026-11-01T21:31:35Z", updated: "2026-11-01T22:00:00Z", current: ["built"], stages,
      event: { name: "implementation-stage", at: "2026-11-01T22:00:00Z" }, history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z", endedBy: "sized", to: "plan" }],
        plan: [{ since: "2026-11-01T17:10:00Z", ended: "2026-11-01T21:31:00Z", endedBy: "plan-accepted", to: "branch" }], branch: [{ since: "2026-11-01T21:31:00Z", ended: "2026-11-01T21:31:35Z", endedBy: "branch-cut", to: "implementation" }] } });
    const B = lay("open", plan);
    const open = [{ text: "A case not directly testable awaits a decision", raised: "implement" }, { text: "A reading of the plan awaits confirmation", raised: "implement" }];
    const s = apply(B, plan, "implementation-stage", { step: "implement", stage: "S3", stages: stages.map(x => ({ ...x, state: "done" })), open }, "2026-11-01T22:37:24Z");
    c.push(["facts.step \"implement\" is the implementation step: every stage done, the run still implementing, the step stays (never moved to qa)", s.a.status === 0 && s.p.wip.step === "implementation" && s.p.wip.since === "2026-11-01T21:31:35Z" && (s.S.applied || []).some(x => /facts\.step "implement" read as implementation/.test(x)), js([s.p.wip.step, s.p.wip.since, (s.S.applied || []).filter(x => /facts\.step/.test(x)), s.S.error])]);
    const resolved = open.map(o => ({ ...o, resolved: "decided" }));
    const r = apply(B, s.p, "resumed", { step: "qa", open: resolved }, "2026-11-01T23:43:35Z");
    c.push(["resumed: the wait 22:37:24 → 23:43:35 recorded, by its open points, in implementation", r.a.status === 0 && js(r.p.wip.waits) === js([{ step: "implementation", since: "2026-11-01T22:37:24Z", ended: "2026-11-01T23:43:35Z", by: "open-points" }]), js([r.p.wip.waits, r.S.error])]);
    c.push(["…the implementation visit ends at the question (21:31:35 → 22:37:24, held, ended by the stage report), and qa starts at the answer", js(vis(r.p, "implementation")) === js([["2026-11-01T21:31:35Z", "2026-11-01T22:37:24Z", "implementation-stage", true]]) && r.p.wip.step === "qa" && r.p.wip.since === "2026-11-01T23:43:35Z", js([vis(r.p, "implementation"), r.p.wip.step, r.p.wip.since])]);
    const T = lib.timelineSteps(r.p, { now: "2026-11-01T23:53:35Z" }), qa = T.visits[T.visits.length - 1];
    c.push(["the Timeline: the qa visit open from 23:43:35, 10 min so far; the 1 h 6 min wait not counted", qa.step === "qa" && qa.open && qa.from.t === "2026-11-01T23:43:35Z" && qa.ms === 10 * MIN && lib.timelineWaitNote(T) === "not counted: waiting on the user, 1 h 6 min", js([lib.timelineLines(T), lib.timelineWaitNote(T)])]);
    const again = apply(B, r.p, "resumed", { step: "qa", open: resolved }, "2026-11-01T23:43:35Z");
    c.push(["the same resumed again: a duplicate, no second wait", again.a.status === 0 && again.S.result === "duplicate" && (again.p.wip.waits || []).length === 1, js([again.S.result, again.p.wip.waits])]);
    /* the board as the step-name defect left it: moved to qa at the question; the resumed starts the qa visit at the answer, none frozen before */
    const wrong = copy(s.p); wrong.wip.step = "qa"; wrong.wip.since = "2026-11-01T22:37:24Z"; wrong.wip.history.implementation = [{ since: "2026-11-01T21:31:35Z", ended: "2026-11-01T22:37:24Z", endedBy: "implementation-stage", to: "qa" }];
    const B2 = lay("open-qa", wrong), r2 = apply(B2, wrong, "resumed", { step: "qa", open: resolved }, "2026-11-01T23:43:35Z");
    c.push(["a board already at qa when the question was put: the wait recorded in qa, no qa visit of no time frozen, qa's since the answer", r2.a.status === 0 && js(r2.p.wip.waits) === js([{ step: "qa", since: "2026-11-01T22:37:24Z", ended: "2026-11-01T23:43:35Z", by: "open-points" }]) && !(r2.p.wip.history.qa || []).length && r2.p.wip.since === "2026-11-01T23:43:35Z", js([r2.p.wip.waits, r2.p.wip.history.qa, r2.p.wip.since])]);
    /* no stop and no open point: no wait is guessed */
    const plain = copy(plan); plain.wip.open = []; const B3 = lay("no-wait", plain), r3 = apply(B3, plain, "resumed", { step: "implementation" }, "2026-11-01T22:40:00Z");
    c.push(["a resumed with neither a stop before it nor an open point: no wait recorded, the visit runs on", r3.a.status === 0 && !(r3.p.wip.waits || []).length && r3.p.wip.since === "2026-11-01T21:31:35Z", js([r3.p.wip.waits, r3.p.wip.since])]);
    const B4 = lay("bad-step", plan), r4 = apply(B4, plan, "implementation-stage", { step: "building it", stages: stages }, "2026-11-01T22:10:00Z");
    c.push(["a facts.step that names no step is warned on (STEP UNKNOWN), never dropped silently", r4.a.status === 0 && (r4.S.warnings || []).some(w => /^STEP UNKNOWN: facts\.step "building it"/.test(w)), js(r4.S.warnings)]);
    const ck = run(CHECK, [B.dir]);
    c.push(["check.js passes the board with its waits", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 400)]);
  });

  /* 3. a board stopped before the waits were recorded, the neighbour rule across a wait, check.js on a malformed list */
  guard("lib.js timelineSteps(): a stop recorded before the waits, the neighbour rule across a wait, and check.js holding wip.waits to its form", c => {
    const legacy = flight({ step: "halted", resume: "plan", waitingOn: "an answer", since: "2026-11-01T17:30:52Z", updated: "2026-11-01T17:30:52Z", current: ["considered", "verdict"], event: { name: "halted", at: "2026-11-01T17:30:52Z" },
      history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z", endedBy: "sized", to: "plan" }] } });
    /* a run sized straight into its plan: no step of its line between sizing and the plan */
    legacy.trail = []; legacy.milestones = []; legacy.wip.steps = STEPS.filter(x => !["interview", "research"].includes(x));
    const T = lib.timelineSteps(legacy, { now: "2026-11-01T17:40:00Z" }), pv = T.visits.find(v => v.step === "plan");
    c.push(["halted with no wait recorded: the visit ends at the halt (its start the visit before's end), the wait open from it, nothing runs to now", pv && pv.from && pv.from.t === "2026-11-01T17:10:00Z" && pv.to.t === "2026-11-01T17:30:52Z" && !T.visits.some(v => v.open) && T.waits.length === 1 && T.waits[0].open, js([lib.timelineLines(T)])]);
    const B = lay("legacy", legacy), r = apply(B, legacy, "resumed", {}, "2026-11-01T17:43:53Z");
    c.push(["…its resume records the wait from the stop's since and freezes the visit the halt interrupted, held", r.a.status === 0 && js(r.p.wip.waits) === js([{ step: "plan", since: "2026-11-01T17:30:52Z", ended: "2026-11-01T17:43:53Z", by: "halted" }]) && js(vis(r.p, "plan")) === js([["2026-11-01T17:10:00Z", "2026-11-01T17:30:52Z", "halted", true]]) && r.p.wip.since === "2026-11-01T17:43:53Z", js([r.p.wip.waits, vis(r.p, "plan"), r.p.wip.since])]);
    /* a visit with no start of its own after a wait takes the answer, not the question */
    const nb = copy(r.p); nb.status = "built"; nb.wip.step = "landed"; nb.wip.history.plan.push({ since: null, ended: "2026-11-01T18:00:00Z", endedBy: "plan-accepted", to: "branch" });
    const T2 = lib.timelineSteps(nb), p2 = T2.visits.filter(v => v.step === "plan")[1];
    c.push(["the neighbour rule across a wait: a visit after it with no start of its own begins at the answer, never at the question", p2 && p2.from && p2.from.t === "2026-11-01T17:43:53Z", js(lib.timelineLines(T2))]);
    const bad = copy(r.p); bad.wip.waits = [{ step: "plan", since: "2026-11-01T17:43:53Z", ended: "2026-11-01T17:30:52Z", by: "a guess" }, { step: "plan", since: "2026-11-01T17:50:00Z", ended: null, by: "halted" }];
    const B5 = lay("bad-waits", bad), ck = run(CHECK, [B5.dir]), o = ck.stdout || "";
    c.push(["check.js fails a wait out of order and an unknown signal, and warns on an open wait on a board not stopped", ck.status !== 0 && /wip\.waits\[0\]: since .* is after ended/.test(o) && /wip\.waits\[0\]\.by is the signal/.test(o) && /wip\.waits\[1\] is open while the board is not stopped/.test(o), o.split(/\r?\n/).filter(l => /waits/.test(l)).join(" | ").slice(0, 500)]);
  });

  /* 4. the template's copy is the same rule */
  guard("the template: its timelineSteps(), timelineRows() and timelineWaitNote() give lib.js's result, the waits drawn as their own lines, never on the bar", c => {
    const t = rd(PB), lines = t.split(/\r?\n/);
    /* a top-level definition: from its line to the next line that starts at the margin */
    const def = name => { const i = lines.findIndex(l => l.startsWith(`const ${name}=`) || l.startsWith(`function ${name}(`)); if (i < 0) throw new Error(`the template defines no ${name}`);
      let j = i + 1; while (j < lines.length && /^\s/.test(lines[j])) j++; return lines.slice(i, j).join("\n"); };
    const names = ["ordinal", "STEP_ORDER", "histOf", "visitsOf", "shownOf", "WAIT_BY", "waitsOf", "outagesOf", "okStamp", "isTime", "TL_FAMILIES", "tlFamily", "tlShade", "timelineFamilies", "APPROX_SOURCES", "approxBounds", "timelineLanded", "timelineSteps", "timelineRows", "timelineWaitNote", "tlSpan", "timelineTotal"];
    const src = names.map(def).join("\n") + "\nconst reconStep=()=>({trail:[],milestones:[]});\nthis.api={timelineSteps,timelineRows,timelineWaitNote,timelineTotal};";
    const box = {}; vm.createContext(box); vm.runInContext(src, box);
    const A = box.api, shape = T => js({ v: T.visits.map(v => [v.step, v.label, v.from && v.from.t, v.to && v.to.t, v.ms, !!v.open]), w: (T.waits || []).map(x => [x.step, x.by, x.from && x.from.t, x.to && x.to.t, x.ms, x.open]) });
    const B1 = { status: "building", wip: { step: "plan", since: "2026-11-01T17:43:53Z", steps: STEPS, waits: [{ step: "plan", since: "2026-11-01T17:30:52Z", ended: "2026-11-01T17:43:53Z", by: "halted" }],
      history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z" }], plan: [{ since: "2026-11-01T17:10:00Z", ended: "2026-11-01T17:30:52Z", endedBy: "halted", held: true }] } } };
    const B2 = { status: "building", wip: { step: "halted", resume: "plan", since: "2026-11-01T17:30:52Z", steps: STEPS, history: { sizing: [{ since: null, ended: "2026-11-01T17:10:00Z" }] } } };
    const now = "2026-11-01T17:50:00Z";
    [[B1, "a board resumed after a wait"], [B2, "a board stopped before the waits were recorded"]].forEach(([b, what]) => { const L = lib.timelineSteps(b, { now }), P = A.timelineSteps(b, now);
      c.push([`${what}: the template's Timeline is lib.js's (visits, waits, rows, the figure, the note)`, shape(L) === shape(P) && lib.timelineTotal(L) === A.timelineTotal(P) && lib.timelineWaitNote(L) === A.timelineWaitNote(P)
        && js(lib.timelineRows(L).map(r => r.wait ? "wait" : r.visit.label)) === js(A.timelineRows(P).map(r => r.wait ? "wait" : r.visit.label)), js([shape(L), shape(P), lib.timelineWaitNote(L), A.timelineWaitNote(P)])]); });
    c.push(["the tile draws each wait as a line of its own (.tl-wait, the halt's yellow mark), its time \"not counted\", the note naming the mark; the bar takes the visits alone",
      /wline=x=>`<span class="tl-wait"/.test(t) && /timelineRows\(T\)\.map\(r=>r\.outage\?oline\(r\.outage\):r\.wait\?wline\(r\.wait\):line\(r\.visit\)\)/.test(t) && /"yellow: waiting on the user, not counted"/.test(t) && /\.key i\.segk\.tl-waitk\{[^}]*var\(--warning\)/.test(t) && /esc\(timelineWaitNote\(T\)\)/.test(t) && /const tpParts=tsTimed\.map\(/.test(t), "wline · timelineRows · tl-waitk · timelineWaitNote"]);
    c.push(["the tick follows only a visit open to now: while the run waits none is open, so nothing ticks", /TL_OPEN=TS\.visits\.some\(v=>v\.open\)/.test(t) && /if\(waiting&&cur&&idx\(cur\)>=0\)/.test(t), "TL_OPEN · waiting"]);
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
