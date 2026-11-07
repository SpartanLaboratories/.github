// The cases of a fill merging onto the latest plan.json (plan/scripts/fill.js; admin-team/dashboards-skill/option-d-and-decisions; plan/RULES.md §4), run by verify-templates.js
// (it passes its helpers in), or on its own with no browser: node verify/cases-fill.js [--out <dir>].
// A sized fill takes minutes and events keep applying meanwhile. A fill's fields go on top of the board as it stands when fill.js runs: wip, the trail and every other
// event-owned field stay as the events left them, and event and fill never lose each other's write, run one after the other or at once. Each group returns [title, cases].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesFill(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["a fill merges onto the latest board (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), FILL = sk("plan/scripts/fill.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "fill"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const T = m => `2026-11-03T11:${String(m).padStart(2, "0")}:00Z`;
  /* a just-laid foundation, as a sized leaves it: no rows, the function a stand-in */
  const laid = () => { const root = path.join(sc, `t-${++n}`), folder = "docs/plans/93-response-cache"; fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    const a = ev({ root, folder }, "sized", { step: "research", baseline: "abc1234", title: "Response cache" }, T(0)); if (a.a.status !== 0) throw new Error("the foundation: " + a.a.stdout); return { root, folder, dir: path.join(root, ...folder.split("/")) }; };
  const ev = (B, event, facts, at, flags) => { const q = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: "acme/widgets", event, folder: B.folder, facts }));
    const a = run(APPLY, ["--event", q, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json", ...(flags || [])], { env }); return { a, S: parse(a) }; };
  const fill = (B, fields, dir) => { const f = wr(path.join(sc, `fields-${++n}.json`), js(fields)), a = run(FILL, [dir || B.dir, "--fields", f, "--json"], { env }); return { a, S: parse(a) }; };
  const P = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  const ROW = (id, gap) => ({ id, name: "Row " + id, system: "cache", where: "cache/", gap: { kind: "missing", summary: gap, ref: null }, options: [], verdict: null, asBuilt: { state: "pending", summary: "" } });

  guard("fill.js writes its fields on top of the latest plan.json, leaving wip and the trail as the events left them", c => {
    const B = laid(), before = P(B), f1 = fill(B, { function: "What this run does, from the issue.", rows: [ROW("headers", "No cache headers are read."), ROW("store", "No store.")] });
    c.push(["the fill is applied: the function and the rows written, the board checked", f1.a.status === 0 && f1.S.fill === "ok" && P(B).function === "What this run does, from the issue." && P(B).rows.length === 2 && /^pass/.test(f1.S.check), js([f1.a.status, f1.S])]);
    c.push(["…plan.foundation cleared once everything it names is written, as at any embed", P(B).foundation === undefined, js(P(B).foundation)]);
    c.push(["…wip, the trail and the status as the event left them", js({ ...P(B).wip, current: 0, updated: 0 }) === js({ ...before.wip, current: 0, updated: 0 }) && js(P(B).trail) === js(before.trail) && P(B).status === before.status, js(P(B).wip.event)]);
    c.push(["…its embedded copy and plan.js are the file", run(EMBED, [B.dir, "--check"], { env }).status === 0, "embed.js --check"]);

    /* composed against what it read, while events applied behind it; a question recorded before the fill names the rows: the board reads as being written, the event applies */
    const Bs = laid(), composed = { function: "Written from a snapshot taken at sized.", rows: [ROW("headers", "No cache headers are read.")] };
    const e1 = ev(Bs, "research-planning", { drafted: 3 }, T(1)), e2 = ev(Bs, "research-started", { researching: [{ question: "q-one", rows: [] }] }, T(2)), wipBefore = P(Bs).wip, trailBefore = P(Bs).trail;
    const f2 = fill(Bs, composed), p2 = P(Bs);
    c.push(["two events behind a fill composed before them: neither lost, the fill on top", e1.a.status === 0 && e2.a.status === 0 && f2.a.status === 0 && p2.wip.event.name === "research-started" && p2.wip.questions.length === 1 && js(p2.trail) === js(trailBefore) && p2.function === composed.function && p2.rows.length === 1, js([f2.S.error, p2.wip.event, p2.trail.length])]);
    c.push(["…wip.since and the research phase as the events set them", p2.wip.since === wipBefore.since && js(p2.wip.research) === js(wipBefore.research), js([p2.wip.since, p2.wip.research])]);
    const e3 = ev(Bs, "research-returned", { returned: { question: "q-one", findings: "research/q-one.md" } }, T(3));
    c.push(["an event after the fill keeps the fill's rows and function", e3.a.status === 0 && P(Bs).rows.length === 1 && P(Bs).function === composed.function, js(e3.S.error)]);
  });

  guard("what a fill may write, what stands against it, what it may not", c => {
    const B = laid(); fill(B, { function: "F.", rows: [ROW("a", "Gap a."), ROW("b", "Gap b.")] });
    ev(B, "research-started", { researching: [{ question: "q", rows: ["a"] }] }, T(1));
    c.push(["the research glow follows the rows the questions name", js(P(B).wip.current) === js(["a.considered"]), js(P(B).wip.current)]);
    const f = fill(B, { rows: [{ id: "b", gap: { summary: "Gap b, restated." } }, ROW("c", "Gap c.")] }), p = P(B);
    c.push(["rows merge by id: a row named takes what the fill says, its other fields kept; a new one appended; one not named left alone", f.a.status === 0 && p.rows.map(r => r.id).join() === "a,b,c" && p.rows[1].gap.summary === "Gap b, restated." && p.rows[1].gap.kind === "missing" && p.rows[0].gap.summary === "Gap a.", js(p.rows.map(r => [r.id, r.gap]))]);
    c.push(["a fill naming a row { $remove: true } removes it", fill(B, { rows: [{ id: "c", $remove: true }] }).a.status === 0 && P(B).rows.map(r => r.id).join() === "a,b", js(P(B).rows.map(r => r.id))]);
    c.push(["naming every row, the fill's order wins", fill(B, { rows: [{ id: "b" }, { id: "a" }] }).a.status === 0 && P(B).rows.map(r => r.id).join() === "b,a", js(P(B).rows.map(r => r.id))]);
    const was = rd(path.join(B.dir, "plan.json"));
    ["wip", "trail", "status", "sized", "branch", "asBuilt", "issue", "foundation"].forEach(k => { const r = fill(B, { [k]: k === "wip" ? { step: "qa" } : "x" }); c.push([`${k}: refused, exit 2, nothing written`, r.a.status === 2 && r.S.fill === "refused" && rd(path.join(B.dir, "plan.json")) === was, js([r.a.status, r.S.error])]); });
    const lv = fill(B, { level: 3, proposedLevel: 4, function: "F2.", rows: [{ id: "a", level: 3 }] });
    c.push(["a work level in a fill is dropped and named, never written", lv.a.status === 0 && (lv.S.dropped || []).length === 3 && P(B).level === undefined && P(B).function === "F2." && P(B).rows.every(r => r.level === undefined), js([lv.a.status, lv.S.dropped, lv.S.check, lv.S.error])]);
    const tr = fill(B, { trailAdd: [{ date: "2026-11-03", column: "gap", label: "Rows named from the issue" }] }), trn = P(B).trail.length, tr2 = fill(B, { trailAdd: [{ date: "2026-11-03", column: "gap", label: "Rows named from the issue" }] });
    c.push(["trailAdd appends an entry, once", tr.a.status === 0 && tr2.a.status === 0 && P(B).trail.length === trn && P(B).trail.some(t => t.label === "Rows named from the issue"), js(P(B).trail.length)]);

    /* the narrow way into wip: only the fields of the items it names */
    const Bw = laid(); fill(Bw, { function: "F.", rows: [ROW("a", "Gap a."), ROW("b", "Gap b.")] });
    ev(Bw, "plan-accepted", {}, T(1)); ev(Bw, "branch-cut", { branch: "feat/x", stages: [{ id: "S1", name: "One" }, { id: "S2", name: "Two" }] }, T(2));
    const st = fill(Bw, { wip: { stages: [{ id: "S1", rows: ["a", "nope"] }, { id: "S9", rows: ["a"] }], current: { step: "implementation", cells: ["a.built"] } } }), pw = P(Bw);
    c.push(["wip.stages[].rows by id: the stage's rows, an off-board row left out, an unknown stage named; its state stays the event's", st.a.status === 0 && js(pw.wip.stages[0].rows) === js(["a"]) && pw.wip.stages[0].state === "current" && (st.S.notes || []).some(x => /S9/.test(x)), js([pw.wip.stages, st.S.notes])]);
    c.push(["wip.current for the step the board is at", js(pw.wip.current) === js(["a.built"]), js(pw.wip.current)]);
    const stale = fill(Bw, { wip: { current: { step: "research", cells: ["b.considered"] } } });
    c.push(["wip.current for a step the board has left: left as the event set it, and said", stale.a.status === 0 && js(P(Bw).wip.current) === js(["a.built"]) && (stale.S.notes || []).some(x => /moved on/.test(x)), js([P(Bw).wip.current, stale.S.notes])]);

    /* wip.waitingOn, while the board waits on the user: the text the fast path left out (an internal name in the run's own), the stop's trail entry and a detail quoting it with it */
    { const { mergeFill: mf } = require(FILL), old = "The design is ready.", neu = "sign-off of the design";
      const held = { kind: "issue", status: "planned", rows: [], trail: [{ date: "2026-11-03", column: "considered", label: `Halted at the architecture: waiting on you (${old})` }], wip: { step: "halted", resume: "architecture", waitingOn: old, detail: `Waiting on you: ${old}` } };
      const m = mf(held, { wip: { waitingOn: neu } });
      c.push(["wip.waitingOn while halted: written, the stop's trail entry and the detail quoting it follow", m.plan.wip.waitingOn === neu && m.plan.wip.detail === `Waiting on you: ${neu}` && m.plan.trail[0].label === `Halted at the architecture: waiting on you (${neu})` && held.wip.waitingOn === old, js([m.plan.wip, m.plan.trail, m.merged])]);
      const going = mf({ ...held, wip: { ...held.wip, step: "document", detail: "Signed off." } }, { wip: { waitingOn: neu } });
      c.push(["wip.waitingOn once out of the stop: the last stop's trail entry takes it, a waitingOn and resume left standing cleared, the detail left", going.plan.trail[0].label === `Halted at the architecture: waiting on you (${neu})` && going.plan.wip.waitingOn === null && going.plan.wip.resume === null && going.plan.wip.detail === "Signed off.", js([going.plan.wip, going.plan.trail, going.merged])]);
      const never = mf({ ...held, trail: [], wip: { step: "research" } }, { wip: { waitingOn: neu } });
      c.push(["wip.waitingOn on a board whose trail records no stop: skipped and said", never.plan.wip.waitingOn === undefined && never.notes.some(x => /records no stop/.test(x)), js([never.plan.wip, never.notes])]);
      let refusedEmpty = false; try { mf(held, { wip: { waitingOn: " " } }); } catch (e) { refusedEmpty = /waitingOn/.test(e.message); }
      c.push(["wip.waitingOn empty: refused", refusedEmpty, "refused"]);
      /* the event that takes the board out of a stop clears what it waited on and where it was to resume, whichever event it is */
      const Bh = laid(); ev(Bh, "halted", { waitingOn: "an answer on the scope", questions: ["Keep the scope?"] }, T(1)); const out = ev(Bh, "researched", {}, T(2)), ph = P(Bh);
      c.push(["an event other than resumed that ends a halt clears wip.waitingOn and wip.resume", out.a.status === 0 && ph.wip.step !== "halted" && ph.wip.waitingOn === null && ph.wip.resume === null, js([out.S.error, ph.wip.step, ph.wip.waitingOn, ph.wip.resume])]); }
    ev(Bw, "implementation-stage", { stage: "S1", stages: [{ id: "S1", name: "One", state: "done" }, { id: "S2", name: "Two", state: "current" }] }, T(3));
    const sd = fill(Bw, { rows: [{ id: "a", asBuilt: { state: "pending", summary: "Written so far." } }] }), ra = P(Bw).rows.find(r => r.id === "a");
    c.push(["a row's derived state stands against a fill's that is no outcome; the summary is the fill's", sd.a.status === 0 && ra.asBuilt.summary === "Written so far." && ra.asBuilt.state !== "pending" === (P(Bw).rows.find(r => r.id === "a").asBuilt.state !== "pending"), js(ra.asBuilt)]);

    /* partially built with its summary, where the stages decide nothing (row a's last stage is done, its rest comes after the stages): stored; without a summary, or against a stage's state, the row's stands */
    const { mergeFill } = require(FILL), pbBoard = { kind: "issue", status: "building", rows: ["a", "b", "c"].map(id => ({ id, asBuilt: { state: "pending", summary: "" } })), wip: { step: "implementation", stages: [{ id: "S1", state: "done", rows: ["a", "b"] }, { id: "S2", state: "current", rows: ["c"] }] } };
    const part = summary => ({ state: "partially-built", summary }), pb = mergeFill(pbBoard, { rows: [{ id: "a", asBuilt: part("Built so far; the rest comes after the stages.") }, { id: "b", asBuilt: part("") }, { id: "c", asBuilt: part("Not so.") }] }), stateOf = id => pb.plan.rows.find(r => r.id === id).asBuilt.state;
    c.push(["a fill's partially-built with a summary is stored where no stage decides the row", stateOf("a") === "partially-built", js(pb.plan.rows)]);
    c.push(["…without a summary the row's state stands, and is said", stateOf("b") === "pending" && pb.notes.some(x => /^b: asBuilt.state stays/.test(x)), js(pb.notes)]);
    c.push(["…against a current stage the row's state stands, and is said", stateOf("c") === "pending" && pb.notes.some(x => /^c: asBuilt.state stays/.test(x)), js(pb.notes)]);

    /* a tracking board: the units' rows appear, wip.next with them; the filing's issue stands */
    const t0 = copy(TRK), units = t0.rows.filter(r => r.unit); t0.rows = []; Object.assign(t0, { status: "planned", asBuilt: null }); Object.assign(t0.wip, { step: "document", since: T(0), updated: T(0), current: ["built"], next: null, landing: null, steps: lib.STEPS_BY_LEVEL[4].slice(), history: {}, qa: [] }); if (t0.impact) t0.impact = null;
    const Bt = { root: path.join(sc, `t-${++n}`), folder: t0.folder }; Bt.dir = path.join(Bt.root, ...t0.folder.split("/")); wr(path.join(Bt.dir, "plan.json"), JSON.stringify(t0, null, 2) + "\n"); wr(path.join(Bt.dir, "dashboard.html"), rd(PB)); run(EMBED, [Bt.dir], { env });
    const rowsT = units.map(r => { const x = copy(r); x.unit.board = null; x.unit.folder = null; x.unit.issue = null; delete x.unit.live; x.asBuilt = { state: "pending", summary: "Not started." }; return x; });
    const ft = fill(Bt, { rows: rowsT });
    c.push(["a tracking board's unit rows first appearing set wip.next to the first unit", ft.a.status === 0 && P(Bt).wip.next === units[0].id, js([ft.a.status, ft.S.error, ft.S.check, P(Bt).wip.next])]);
    const fi = copy(P(Bt)); fi.rows[0].unit.issue = 62; wr(path.join(Bt.dir, "plan.json"), JSON.stringify(fi, null, 2) + "\n"); run(EMBED, [Bt.dir], { env });
    const again = fill(Bt, { rows: [{ id: units[0].id, unit: { issue: 99, blockedBy: [], level: 3 } }] });
    c.push(["a unit's issue, once the filing has set it, stands against a fill", again.a.status === 0 && P(Bt).rows[0].unit.issue === 62 && P(Bt).rows[0].unit.level === undefined, js(P(Bt).rows[0].unit)]);
  });

  guard("a fill that would fail the board changes nothing; no board; a bad fields file", c => {
    const B = laid(), snap = ["plan.json", "dashboard.html", "plan.js"].map(x => rd(path.join(B.dir, x)));
    const bad = fill(B, { function: "Fine.", milestones: [{ column: "nowhere", label: "x" }] });
    c.push(["a fill that adds a check failure: exit 1, every file as it was, the failure named", bad.a.status === 1 && bad.S.fill === "failed" && /milestones\[0\]\.column/.test(bad.S.check || "") && ["plan.json", "dashboard.html", "plan.js"].every((x, i) => rd(path.join(B.dir, x)) === snap[i]), js([bad.a.status, bad.S.check, bad.S.error])]);
    const none = fill({ dir: path.join(B.root, "docs", "plans", "94-none") }, { function: "x" });
    c.push(["no board: refused, exit 2; a fill never lays one", none.a.status === 2 && /no plan\.json/.test(none.S.error || ""), js([none.a.status, none.S.error])]);
    const f = wr(path.join(sc, "broken.json"), "{ not json"), r = run(FILL, [B.dir, "--fields", f, "--json"], { env }), S = parse(r);
    c.push(["a fields file that does not parse: refused, exit 2", r.status === 2 && /broken\.json/.test(S.error || ""), js([r.status, S.error])]);
    c.push(["the usage: an unknown option exits 2", run(FILL, [B.dir, "--nope"], { env }).status === 2, "cliargs"]);
    /* a board that already fails: the fill that repairs part of it is not refused for what it did not add */
    const Bb = laid(); const pb = P(Bb); pb.rows = [ROW("a", "Gap a.")]; pb.wip.event = { name: "research-started", at: T(1) }; pb.milestones = [{ column: "nowhere", label: "already bad" }]; pb.foundation = undefined; wr(path.join(Bb.dir, "plan.json"), JSON.stringify(pb, null, 2) + "\n");
    const ok = fill(Bb, { function: "A fill on its way." });
    c.push(["a failure the board already had does not stop a fill, and is said", ok.a.status === 0 && P(Bb).function === "A fill on its way." && /still fails/.test(ok.S.check || ""), js([ok.a.status, ok.S.check, ok.S.error])]);
  });

  guard("event and fill at the same time: neither loses the other's write, no reader sees half a file", c => {
    /* the short lock: a dead holder is taken over, a live one waited on */
    const B = laid(), lockFile = path.join(B.root, "docs", "plans", ".live", ".boards.lock");
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, js({ pid: 2147483646, at: T(0), what: "a process that died" }));
    const taken = fill(B, { function: "After a dead holder." });
    c.push(["a lock left by a process that died is taken over", taken.a.status === 0 && P(B).function === "After a dead holder." && !fs.existsSync(lockFile), js([taken.a.status, taken.S.error, fs.existsSync(lockFile)])]);
    c.push(["the lock is gone after an event and after a fill; no temporary file stays", ev(B, "research-planning", { drafted: 1 }, T(1)).a.status === 0 && !fs.existsSync(lockFile) && !fs.readdirSync(B.dir).some(x => /\.tmp$/.test(x)), js(fs.readdirSync(B.dir))]);

    /* the real thing: rounds of an event and a fill started together, a reader parsing the files throughout, in one driver process */
    const Bc = laid(); fill(Bc, { function: "F.", rows: [ROW("a", "Gap a.")] }); ev(Bc, "research-started", { researching: [{ question: "q", rows: ["a"] }] }, T(1));
    const ROUNDS = 6, driver = wr(path.join(sc, "race.js"), `"use strict";
const cp = require("child_process"), fs = require("fs"), path = require("path");
const [apply, fillJs, root, folder, scratch] = process.argv.slice(2), dir = path.join(root, ...folder.split("/")), env = { ...process.env };
const go = (f, a) => new Promise(res => { const c = cp.spawn(process.execPath, [f, ...a], { env, windowsHide: true }); let o = ""; c.stdout.on("data", d => { o += d; }); c.on("close", s => res({ s, o })); });
let bad = 0, reads = 0, stop = false;
const reader = async () => { while (!stop) { for (const f of ["plan.json"]) { try { JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); reads++; } catch (e) { if (e.code !== "EBUSY" && e.code !== "EPERM") bad++; } }
  try { const h = fs.readFileSync(path.join(dir, "dashboard.html"), "utf8"); if (!/<\\/html>\\s*$/.test(h)) bad++; } catch (e) { if (e.code !== "EBUSY" && e.code !== "EPERM") bad++; }
  await new Promise(r => setTimeout(r, 2)); } };
(async () => { const r = reader(), out = [];
  for (let i = 1; i <= ${ROUNDS}; i++) {
    const q = path.join(scratch, "race-req-" + i + ".json"), f = path.join(scratch, "race-fields-" + i + ".json");
    fs.writeFileSync(q, JSON.stringify({ v: 1, action: "plan-board", github: "acme/widgets", event: "research-returned", folder, facts: { returned: { question: "q", findings: "research/q-" + i + ".md" }, note: "round " + i } }));
    fs.writeFileSync(f, JSON.stringify({ notes: { ["fill" + i]: "round " + i }, rows: [{ id: "a", gap: { summary: "Gap as of round " + i + "." } }] }));
    const at = "2026-11-03T12:" + String(i).padStart(2, "0") + ":00Z";
    out.push(await Promise.all([go(apply, ["--event", q, "--worktree", root, "--no-gh", "--no-live", "--at", at, "--json"]), go(fillJs, [dir, "--fields", f, "--json"])]));
  }
  stop = true; await r; console.log(JSON.stringify({ bad, reads, codes: out.map(x => x.map(y => y.s)), fails: out.flatMap(x => x.filter(y => y.s !== 0).map(y => y.o.slice(0, 900))) })); })();
`);
    const R = run(driver, [APPLY, FILL, Bc.root, Bc.folder, sc], { env, timeout: 240000 }); let D = {}; try { D = JSON.parse(R.stdout.trim().split(/\r?\n/).pop()); } catch (e) { D = { parseError: (R.stdout || R.stderr || "").slice(0, 400) }; }
    const pc = P(Bc), trailN = pc.trail.filter(t => /^Research returned/.test(t.label)).length;
    c.push(["every round's event and fill exit 0", Array.isArray(D.codes) && D.codes.length === ROUNDS && D.codes.every(x => x[0] === 0 && x[1] === 0), js([D.codes, D.fails, D.parseError])]);
    c.push(["no fill lost: every round's field is on the board", Array.from({ length: ROUNDS }, (_, i) => i + 1).every(i => (pc.notes || {})["fill" + i] === "round " + i), js(pc.notes)]);
    c.push(["no event lost: the last round's event is the board's, and every round's time passed through", pc.wip.event && pc.wip.event.name === "research-returned" && /^2026-11-03T12:0\d:00Z$/.test(pc.wip.updated) && trailN >= 1 && pc.wip.questions[0].findings && /research\/q-\d\.md/.test(pc.wip.questions[0].findings), js([pc.wip.event, pc.wip.updated, trailN, pc.wip.questions])]);
    c.push(["no reader saw half a file: plan.json parsed and dashboard.html whole on every read", D.bad === 0 && D.reads > 0, js([D.bad, D.reads])]);
    c.push(["the board checks after the race, its embedded copy and sidecar the file", run(CHECK, [Bc.dir], { env }).status === 0 && run(EMBED, [Bc.dir, "--check"], { env }).status === 0, (run(CHECK, [Bc.dir], { env }).stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    c.push(["the lock is released", !fs.existsSync(path.join(Bc.root, "docs", "plans", ".live", ".boards.lock")), "lock"]);
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
