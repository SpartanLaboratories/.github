// The cases of "a board keeps no work level" (plan/scripts/levels.js; admin-team/dashboards-skill/option-d-and-decisions; plan/RULES.md §2), and of the labels and the two event-note
// defects that came with it, run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-work-levels.js [--out <dir>].
// A level is read from the request, else the team's local state, for the kind and the steps line of a laying, and never written. An open board drops what it still holds at
// any rewrite, and check.js fails one that holds any; a closed work board, landed or cancelled, keeps them, whatever rewrites it, and check.js never fails it. Each group returns [title, cases].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesWorkLevels(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path, WB = (targets.find(t => t.name === "plan/template/board.html") || {}).path;
  if (!PB) return [["a board keeps no work level (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), NEW = sk("plan/scripts/new.js");
  const lib = require(sk("plan/scripts/lib.js")), TL = require(sk("plan/scripts/testslib.js"));
  const sc = path.join(out, "work-levels"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const stateFile = wr(path.join(sc, "state.json"), js({ levels: { "acme/widgets#71": 2, "acme/widgets#72": 4 } })), env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") }, envState = { ...process.env, DASHBOARDS_ADMIN_STATE: stateFile };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const T = m => `2026-11-03T09:${String(m).padStart(2, "0")}:00Z`;
  const root0 = () => { const r = path.join(sc, `t-${++n}`); fs.mkdirSync(path.join(r, "docs", "plans"), { recursive: true }); return r; };
  const req = (folder, event, facts, extra) => wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", event, folder, ...(extra || {}), facts }));
  const ev = (root, folder, event, facts, at, o) => { const have = path.join(root, ...folder.split("/"), "plan.json"), github = fs.existsSync(have) ? JSON.parse(rd(have)).repo : "acme/widgets", a = run(APPLY, ["--event", req(folder, event, facts, { github, ...((o && o.extra) || {}) }), "--worktree", root, "--no-gh", "--no-live", "--at", at, "--json"], { env: (o && o.env) || env }); return { a, S: parse(a), p: fs.existsSync(path.join(root, ...folder.split("/"), "plan.json")) ? JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json"))) : null }; };
  const put = (root, plan) => { const dir = path.join(root, ...plan.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(plan, null, 2) + "\n")); wr(path.join(dir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", JSON.stringify(plan, null, 2) + "\n")); return dir; };
  const oldLive = () => { const p = copy(LIVE); p.level = 3; p.wip.proposedLevel = 4; return p; };
  const oldLanded = () => { const p = copy(EX); p.level = 3; p.wip.proposedLevel = 3; return p; };
  const oldTrack = () => { const p = copy(TRK); p.level = 4; p.rows.filter(r => r.unit).forEach(r => { r.unit.level = 3; if (r.unit.live) r.unit.live.proposedLevel = 4; }); return p; };

  guard("a new board carries no work level: the laying, the template, the kind and the steps from the request or the team's state", c => {
    const tpl = J("plan/template/plan.json");
    c.push(["the template's skeleton has no level, no unit.level", tpl.level === undefined && !js(tpl.rows).includes('"level"'), "plan/template/plan.json"]);
    c.push(["its $comment no longer offers them as data", !/keep the work level as data only/.test(tpl.$comment), "$comment"]);
    c.push(["the fixtures and the example carry none", ![EX, TRK, LIVE].some(p => lib.workLevelFields(p).length), js([EX, TRK, LIVE].map(lib.workLevelFields))]);
    const r2 = root0(), L2 = ev(r2, "docs/plans/70-a-fix", "sized", { step: "research", baseline: "abc1234" }, T(1), { extra: { level: 2 } });
    c.push(["a level in the request gives the steps line, a small fix's with no interview; never written", L2.a.status === 0 && !L2.p.wip.steps.includes("interview") && !lib.workLevelFields(L2.p).length && L2.p.kind === "issue", js([L2.S.error, L2.p && L2.p.wip.steps, L2.p && L2.p.level])]);
    const r3 = root0(), L3 = ev(r3, "docs/plans/71-from-state", "sized", { step: "research", baseline: "abc1234" }, T(1), { env: envState });
    c.push(["none in the request: the team's local state, levels[\"owner/repo#n\"]", L3.a.status === 0 && !L3.p.wip.steps.includes("interview"), js(L3.p && L3.p.wip.steps)]);
    const r4 = root0(), L4 = ev(r4, "docs/plans/72-an-initiative", "sized", { step: "research", baseline: "abc1234" }, T(1), { env: envState });
    c.push(["level 4 in the state: a tracking board, its own steps line, no level", L4.a.status === 0 && L4.p.kind === "tracking" && js(L4.p.wip.steps) === js(lib.STEPS_BY_LEVEL[4]) && !lib.workLevelFields(L4.p).length, js([L4.p && L4.p.kind, L4.p && L4.p.wip.steps])]);
    const r5 = root0(), L5 = ev(r5, "docs/plans/73-none", "sized", { step: "research", baseline: "abc1234" }, T(1));
    c.push(["none anywhere: a small feature's line", L5.a.status === 0 && L5.p.wip.steps.includes("interview") && L5.p.kind === "issue", js(L5.p && L5.p.wip.steps)]);
    const r6 = root0(), nw = run(NEW, ["74", "a-case", "--root", r6, "--level", "4", "--repo", "acme/widgets", "--title", "A", "--function", "F.", "--baseline", "abc1234", "--date", "2026-11-03"], { env }), np = JSON.parse(rd(path.join(r6, "docs", "plans", "74-a-case", "plan.json")));
    c.push(["new.js --level is read, never written", nw.status === 0 && np.kind === "tracking" && !lib.workLevelFields(np).length, js([nw.status, np.kind, np.level])]);
    const rE = root0(), E0 = ev(rE, "docs/plans/76-esc", "sized", { step: "research", baseline: "abc1234" }, T(1)), Ee = ev(rE, "docs/plans/76-esc", "escalated", { proposedLevel: 4 }, T(2));
    c.push(["escalated: facts.proposedLevel is the team's, never on the board", Ee.a.status === 0 && Ee.p.wip.step === "escalated" && Ee.p.wip.proposedLevel === undefined, js(Ee.p && Ee.p.wip.proposedLevel)]);
    const lv = lib.unitRun({ status: "building", wip: { step: "escalated", proposedLevel: 4 } });
    c.push(["a unit's mirror carries none", lv.proposedLevel === undefined, js(lv.proposedLevel)]);
  });

  guard("an open board drops them at any rewrite and check.js fails it; a closed one, landed or cancelled, keeps them and check.js never fails it", c => {
    const rL = root0(), dL = put(rL, oldLive()), ck0 = run(CHECK, [dL], { env });
    c.push(["check.js fails a board not landed that holds them, naming the fields", ck0.status === 1 && /FAIL\s+WORK LEVEL ON THE BOARD: level, wip\.proposedLevel/.test(ck0.stdout), (ck0.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    const e = ev(rL, oldLive().folder, "halted", { waitingOn: "An answer." }, T(5));
    c.push(["an event reads it without failing and drops them", e.a.status === 0 && !lib.workLevelFields(e.p).length && e.p.wip.step === "halted", js([e.S.error, e.S.check, lib.workLevelFields(e.p || {})])]);
    c.push(["…its embedded copy and sidecar too", !/"proposedLevel"/.test(rd(path.join(dL, "plan.js"))) && !/"proposedLevel"/.test(lib.readBlock(rd(path.join(dL, "dashboard.html")), "plan")), "embed"]);
    const rE = root0(), dE = put(rE, oldLive()), em = run(EMBED, [dE], { env });
    c.push(["embed.js drops them too, on a board not landed", em.status === 0 && !lib.workLevelFields(JSON.parse(rd(path.join(dE, "plan.json")))).length && run(CHECK, [dE], { env }).status === 0, (em.stdout || "").slice(0, 200)]);

    /* landed */
    const rB = root0(), dB = put(rB, oldLanded()), ckB = run(CHECK, [dB], { env });
    c.push(["check.js passes a landed board that holds them, and says so", ckB.status === 0 && /a closed board keeps the work level it holds/.test(ckB.stdout), (ckB.stdout || "").split(/\r?\n/).filter(l => /^FAIL|closed board keeps/.test(l)).join(" | ").slice(0, 300)]);
    const bytes = rd(path.join(dB, "plan.json")), emB = run(EMBED, [dB], { env }), afterB = JSON.parse(rd(path.join(dB, "plan.json")));
    c.push(["embed.js on a landed board keeps them", emB.status === 0 && afterB.level === 3 && afterB.wip.proposedLevel === 3, js([afterB.level, afterB.wip.proposedLevel])]);
    const rewrite = ev(rB, EX.folder, "landed", { pr: 90, sha: "abcdef1", merge: "abcdef1", date: "2026-10-22" }, T(9));
    c.push(["the landed event on it: it keeps them, as a landed board", rewrite.a.status === 0 && rewrite.p.level === 3 && rewrite.p.wip.proposedLevel === 3 && rewrite.p.status === "built", js([rewrite.S.error, rewrite.p && rewrite.p.level])]);
    c.push(["boardLanded(): status built or step landed; a cancelled board and a tracking board with units in flight are not", lib.boardLanded({ status: "built", wip: {} }) && lib.boardLanded({ status: "building", wip: { step: "landed" } }) && !lib.boardLanded({ status: "abandoned", wip: { step: "cancelled" } }) && !lib.boardLanded({ kind: "tracking", status: "building", wip: { step: "implementation" } }), "lib"]);
    c.push(["boardClosed(): landed or cancelled; a tracking board with units in flight is open", lib.boardClosed({ status: "built", wip: {} }) && lib.boardClosed({ status: "building", wip: { step: "landed" } }) && lib.boardClosed({ status: "abandoned", wip: {} }) && lib.boardClosed({ status: "building", wip: { step: "cancelled" } }) && !lib.boardClosed({ kind: "tracking", status: "building", wip: { step: "implementation" } }), "lib"]);
    /* cancelled: closed too, but never landed */
    const rC = root0(), oc = oldLive(), dC = put(rC, oc), cn = ev(rC, oc.folder, "cancelled", { reason: "Not needed." }, T(9));
    c.push(["the cancelled event on a board holding them: status abandoned, and it keeps them", cn.a.status === 0 && cn.p.status === "abandoned" && cn.p.level === 3 && cn.p.wip.proposedLevel === 4, js([cn.S.error, cn.S.check, cn.p && cn.p.status, cn.p && cn.p.level])]);
    const ckC = run(CHECK, [dC], { env });
    c.push(["check.js passes a cancelled board that holds them, and says so", ckC.status === 0 && /a closed board keeps the work level it holds/.test(ckC.stdout) && !/WORK LEVEL ON THE BOARD/.test(ckC.stdout), (ckC.stdout || "").split(/\r?\n/).filter(l => /^FAIL|closed board keeps/.test(l)).join(" | ").slice(0, 300)]);
    const emC = run(EMBED, [dC], { env }), afterC = JSON.parse(rd(path.join(dC, "plan.json")));
    c.push(["embed.js on a cancelled board keeps them", emC.status === 0 && afterC.level === 3 && afterC.wip.proposedLevel === 4, js([afterC.level, afterC.wip.proposedLevel])]);
    c.push(["a cancelled board is still not a landed one", lib.boardLanded(afterC) === false, js([afterC.status, afterC.wip.step])]);
    const cTrk = oldTrack(); cTrk.status = "abandoned"; cTrk.wip.step = "cancelled";
    c.push(["dropWorkLevels() leaves a cancelled board alone, a tracking board's unit levels too", !lib.dropWorkLevels(cTrk).length && cTrk.level === 4 && cTrk.rows.filter(r => r.unit).every(r => r.unit.level === 3), js(lib.workLevelFields(cTrk))]);
    /* a run in flight whose board already dropped them: its landing re-adds nothing */
    const rD = root0(), pD = copy(EX); pD.status = "building"; Object.assign(pD.wip, { step: "merge", since: T(8), updated: T(8), current: [], event: { name: "merge", at: T(8) } }); put(rD, pD); run(EMBED, [path.join(rD, ...EX.folder.split("/"))], { env });
    const ld = ev(rD, EX.folder, "landed", { pr: 91, sha: "abcdef1", merge: "abcdef1", date: "2026-11-03", mergedAt: T(9) }, T(9));
    c.push(["the landed event on a board that already dropped them re-adds nothing", ld.a.status === 0 && ld.p.status === "built" && !lib.workLevelFields(ld.p).length, js([ld.S.error, ld.p && ld.p.status, lib.workLevelFields(ld.p || {})])]);

    /* a tracking board with units in flight */
    const rT = root0(), dT = put(rT, oldTrack()), ckT = run(CHECK, [dT], { env });
    c.push(["a tracking board with units in flight is open: check.js fails it, naming unit.level", ckT.status === 1 && /WORK LEVEL ON THE BOARD: level, rows \([^)]+\)\.unit\.level/.test(ckT.stdout), (ckT.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    const emT = run(EMBED, [dT], { env }), pT = JSON.parse(rd(path.join(dT, "plan.json")));
    c.push(["…embed.js drops them, the mirrors' too", emT.status === 0 && !lib.workLevelFields(pT).length, js(lib.workLevelFields(pT))]);
    const fx = copy(LIVE); fx.level = 3;
    c.push(["a seed's copy that has closed keeps them: dropWorkLevels() leaves a closed board alone and takes them from an open one", !lib.dropWorkLevels(oldLanded()).length && !!lib.dropWorkLevels(fx).length, "lib"]);
  });

  guard("the release warnings read the board's kind and steps line, never a level", c => {
    const base = over => { const p = copy(LIVE); p.impact = { basis: "plan", summary: "x", none: null, release: { bump: "none", version: null }, downstream: [] }; Object.assign(p.wip, over || {}); return p; };
    const warnFor = p => run(CHECK, [put(root0(), p)], { env }).stdout || "";
    c.push(["a feature's line (it has an interview): a bump of none says it has no downstream effect", /a level-3 change with no version bump says explicitly/.test(warnFor(base({ steps: lib.STEPS_BY_LEVEL[3].slice() }))), "warn"]);
    c.push(["a fix's line (no interview): no such warning", !/a level-3 change with no version bump/.test(warnFor(base({ steps: lib.STEPS_BY_LEVEL[2].slice() }))), "warn"]);
  });

  guard("the labels: a board says \"waiting on you\"", c => {
    const dash = rd(PB), work = WB ? rd(WB) : "";
    c.push(["neither work-board template says \"on the user\" anywhere", !/on the user/i.test(dash) && !/on the user/i.test(work), (dash.match(/.{30}on the user.{10}/i) || work.match(/.{30}on the user.{10}/i) || [""])[0]]);
    c.push(["the labels are there", /label:"Waiting on you"/.test(dash) && /l:"waiting on you"/.test(work) && /\["Waiting on you",n\("halted"\)/.test(work), "templates"]);
    c.push(["lib.js keeps no Timeline note of the waits to word at all (decided 2026-11-05: time that is not counted is not mentioned)", lib.timelineWaitNote === undefined, typeof lib.timelineWaitNote]);
    const r = root0(), d = put(r, copy(LIVE)), e = ev(r, LIVE.folder, "halted", { waitingOn: "An answer from the user." }, T(5));
    c.push(["stored data keeps what the run sent: wip.waitingOn is as the facts said it", e.a.status === 0 && e.p.wip.waitingOn === "An answer from the user.", js(e.p && e.p.wip.waitingOn)]);
  });

  guard("the event notes: an off-board row in facts.rows, an empty facts.tests.other", c => {
    /* remediation with a row that is not on the board */
    const remB = () => { const r = root0(), p = copy(LIVE); Object.assign(p.wip, { step: "qa", since: T(1), current: ["built"], qa: [{ pass: 1, verdict: "running", date: "2026-11-03", at: T(1), findings: {} }], event: { name: "qa-pass", at: T(1) } }); put(r, p); return { r, p }; };
    const A = remB(), a = ev(A.r, A.p.folder, "qa-pass", { qa: { pass: 1, verdict: "changes-requested", test: 1, route: "remediation" }, rows: ["logging"] }, T(5));
    c.push(["facts.rows naming no row on the board: the dropped id is reported, not \"not known from the facts\"", a.a.status === 0 && (a.S.why || []).some(w => /facts\.rows names no row on this board: logging/.test(w)) && !(a.S.why || []).some(w => /are not known from the facts/.test(w)), js(a.S.why)]);
    c.push(["…the whole column still glows until the presenter names them", js(a.p.wip.current) === js(["built"]), js(a.p.wip.current)]);
    const id = A.p.rows[0].id, B = remB(), b = ev(B.r, B.p.folder, "qa-pass", { qa: { pass: 1, verdict: "changes-requested", test: 1, route: "remediation" }, rows: [id, "logging"] }, T(5));
    c.push(["one on the board, one not: its cell glows, the other named as left out", b.a.status === 0 && js(b.p.wip.current) === js([id + ".built"]) && (b.S.why || []).some(w => /facts\.rows names rows not on this board \(logging\): left out/.test(w)), js([b.p.wip.current, b.S.why])]);
    const C = remB(), cc = ev(C.r, C.p.folder, "qa-pass", { qa: { pass: 1, verdict: "changes-requested", test: 1, route: "remediation" } }, T(5));
    c.push(["no facts.rows at all: the note it always was", (cc.S.why || []).some(w => /are not known from the facts/.test(w)), js(cc.S.why)]);
    /* an empty other */
    const mk = () => ({ tests: { added: [], amended: [], relevant: [], other: { byModule: { core: { "2": 4 } } }, updated: T(0) } });
    const r1 = TL.mergeTests(mk(), { other: { byModule: {} } }, { now: T(1) });
    c.push(["facts.tests.other with an empty byModule: no note, nothing changed, the earlier counts left as they were", !r1.notes.length && !r1.changed, js(r1)]);
    const pl = mk(); TL.mergeTests(pl, { other: { byModule: {} } }, { now: T(1) });
    c.push(["…T.other stands", js(pl.tests.other) === js({ byModule: { core: { "2": 4 } } }), js(pl.tests.other)]);
    const none = { tests: null }, r2 = TL.mergeTests(none, { other: { byModule: {} } }, { now: T(1) });
    c.push(["…on a board with none: no note, no tests block made", !r2.notes.length && !r2.changed && none.tests === null, js(r2)]);
    const r3 = TL.mergeTests(mk(), { other: { byModule: { core: {} } } }, { now: T(1) });
    c.push(["a module with no counts is empty too: no note", !r3.notes.length, js(r3.notes)]);
    [["a string", "x"], ["no byModule", { modules: {} }], ["byModule a list", { byModule: [] }], ["a module not an object", { byModule: { core: 4 } }], ["a count of the wrong type", { byModule: { core: { "2": "four" } } }]].forEach(([w, v]) => { const r = TL.mergeTests(mk(), { other: v }, { now: T(1) }); c.push([`a wrong shape, ${w}: the note, not applied`, r.notes.some(x => /facts\.tests\.other is not/.test(x)) && !r.changed, js(r.notes)]); });
    const r4 = mk(), r5 = TL.mergeTests(r4, { other: { byModule: { api: { "3": 2 } } } }, { now: T(1) });
    c.push(["counts still replace", r5.changed && js(r4.tests.other.byModule) === js({ api: { "3": 2 } }), js(r4.tests.other)]);
    const D = { r: root0(), p: copy(LIVE) }; put(D.r, D.p); const ee = ev(D.r, D.p.folder, "resumed", { step: D.p.wip.step === "halted" ? D.p.wip.resume : D.p.wip.step, tests: { other: { byModule: {} } } }, T(6));
    c.push(["on the fast path it raises no enrichment", ee.a.status === 0 && !(ee.S.why || []).some(w => /facts\.tests\.other/.test(w)), js([ee.S.error, ee.S.check, ee.S.why])]);
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
