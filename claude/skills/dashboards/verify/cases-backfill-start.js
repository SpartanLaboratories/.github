// The cases of the team-raised backfill-start (the user's decision q-418 1a, console/kbt1-board-choices/answer; plan/RULES.md §4, the backfill-start
// row), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-backfill-start.js [--out <dir>]. A tracking
// board laid after its units' runs started is laid not started (new.js --step none), and each unit's start is recorded at its recorded time, in the
// order the units started: the unit in progress, the board building at implementation from the first start, the next unit up, the chain's detail, the
// trail entry on that day; a unit whose board in the tree has landed landed too, at its merge's time, by the standing rule; one notes.corrections entry
// each; no wip.event, wip.updated never back. Raised again, a duplicate; refused, nothing written, exit 3. Each group returns [title, cases], a case
// [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function casesBackfillStart(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the backfill-start cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), NEW = sk("plan/scripts/new.js"), FILL = sk("plan/scripts/fill.js");
  const sc = path.join(out, "backfill-start"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const P = d => JSON.parse(rd(path.join(d, "plan.json")));
  const fails = d => run(CHECK, [d], { env }).stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 3).join(" | ");
  const TF = "docs/plans/55-http-client-stack", UF = `${TF}/61-build-logic`;
  const LAID = "2026-11-20T01:00:00Z", T61 = "2026-10-18T07:00:00Z", M61 = "2026-10-19T09:00:00Z", T47 = "2026-10-21T10:00:00Z";
  /* the tracking board laid now, not started, its unit rows from the fixture all pending; #61's own board in the tree, landed; #47 started elsewhere */
  const laidRepo = (name, step, at) => {
    const main = path.join(sc, name), tdir = path.join(main, ...TF.split("/")), udir = path.join(main, ...UF.split("/"));
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n"); fs.mkdirSync(path.join(main, "docs", "plans"), { recursive: true });
    const l = run(NEW, ["55", "http-client-stack", "--root", main, "--kind", "tracking", "--step", step || "none", "--at", at || LAID, "--repo", TRK.repo, "--baseline", TRK.baseline.sha, "--date", TRK.baseline.date, "--title", TRK.title, "--issue-title", TRK.issueTitle || TRK.title, "--function", TRK.function, "--systems", TRK.systems.map(s => s.slug).join(",")], { env });
    if (l.status !== 0) throw new Error(`new.js failed: ${l.stderr || l.stdout}`);
    const rows = copy(TRK.rows).map(r => { const u = { n: r.unit.n, slug: r.unit.slug, issue: r.unit.issue, blockedBy: r.unit.blockedBy, versions: r.unit.versions, branch: null, folder: null, board: null };
      return { ...r, unit: u, asBuilt: { state: "pending", summary: `Filed as #${r.unit.issue}; its run has not started.` } }; });
    const f = wr(path.join(sc, `fields-${++n}.json`), js({ rows, impact: { ...copy(TRK.impact), units: (TRK.impact.units || []).map(u => ({ ...u, basis: "plan" })), changes: [] }, roadmap: TRK.roadmap || null, documents: TRK.documents || [] }));
    const fl = run(FILL, [tdir, "--fields", f, "--root", main], { env });
    const sub = copy(EX); Object.assign(sub, { issue: 61, slug: "61-build-logic", folder: UF, parent: { issue: 55 }, sized: T61, status: "built", asBuilt: { ...sub.asBuilt, merge: "806ce8e", sha: "806ce8e", pr: 89, date: M61.slice(0, 10), at: M61 } });
    delete sub.issueBoards;
    wr(path.join(udir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(udir, "dashboard.html"), rd(PB)); run(EMBED, [udir], { env }); run(EMBED, [tdir], { env });
    return { main, tdir, udir, repo: TRK.repo, laid: l, fill: fl };
  };
  const raise = (B, facts, extra, more) => { const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: B.repo, issue: 55, event: "backfill-start", folder: TF, ...(more || {}), facts }));
    const a = run(APPLY, ["--event", q, "--worktree", B.main, "--main", B.main, "--no-gh", "--no-live", "--json", ...(extra || [])], { env }); return { a, S: parse(a) }; };
  const snap = B => rd(path.join(B.tdir, "plan.json")) + rd(path.join(B.tdir, "dashboard.html")) + rd(path.join(B.udir, "plan.json"));

  guard("backfill-start: a tracking board laid after its units started shows them as they stand, each start at its recorded time", c => {
    const B = laidRepo("bf-main");
    const p0 = P(B.tdir);
    c.push(["new.js --step none lays the tracking board not started: no step, no run's start, no event, no visit, nothing glowing", B.laid.status === 0 && p0.wip.step == null && p0.sized == null && p0.wip.event == null && !Object.keys(p0.wip.history || {}).length && !(p0.wip.current || []).length && p0.status === "planned", js([B.laid.status, p0.wip.step, p0.sized, p0.wip.event, p0.wip.history, p0.wip.current, p0.status])]);
    c.push(["…its unit rows filled, every unit pending, #61 up next; check.js passes", B.fill.status === 0 && p0.rows.every(r => r.asBuilt.state === "pending") && p0.wip.next === "build-logic" && run(CHECK, [B.tdir], { env }).status === 0, js([B.fill.status, (B.fill.stdout || "").slice(-300), p0.wip.next, fails(B.tdir)])]);
    const b0 = snap(B), wrong = raise(B, { unit: 61, at: "2026-10-18T07:30:00Z" });
    c.push(["refused, nothing written: a time other than the start #61's board records", wrong.a.status === 3 && wrong.S.result === "refused" && /records its start at 2026-10-18T07:00:00Z, not 2026-10-18T07:30:00Z/.test(wrong.S.refused || "") && snap(B) === b0, js([wrong.a.status, wrong.S.result, wrong.S.refused])]);
    const a = raise(B, { unit: 61, at: T61 }), p1 = P(B.tdir), r61 = p1.rows.find(r => r.id === "build-logic");
    c.push(["#61 backfilled: applied", a.a.status === 0 && a.S.result === "ok", js([a.a.status, a.S.result, a.S.error, a.S.refused, a.S.check])]);
    c.push(["…the board building, at implementation from #61's start", p1.status === "building" && p1.wip.step === "implementation" && p1.wip.since === T61, js([p1.status, p1.wip.step, p1.wip.since])]);
    c.push(["…its own steps before it left unrecorded: no visit frozen, no sizing invented, no event of its own", !Object.keys(p1.wip.history || {}).length && p1.wip.event == null && p1.sized == null, js([p1.wip.history, p1.wip.event, p1.sized])]);
    c.push(["…#61 landed at its merge, by the standing rule (its board in the tree has landed): the plain fact as its summary, out of wip.current", r61.asBuilt.state === "landed" && /^#61 landed through PR #89 as 806ce8e\.$/.test(r61.asBuilt.summary) && !(p1.wip.current || []).includes("build-logic.built"), js([r61.asBuilt, p1.wip.current])]);
    c.push(["…its landing mirrored on its row by the embed (unit.landing)", (r61.unit.landing || {}).pr === 89 && (r61.unit.landing || {}).merge === "806ce8e", js(r61.unit.landing)]);
    c.push(["…the trail: \"#61 started\" on its day, \"#61 landed\" on its merge's day, in date order", p1.trail.some(t => t.label === "#61 started" && t.date === "2026-10-18") && p1.trail.some(t => t.label === "#61 landed" && t.date === "2026-10-19") && p1.trail.every((t, i, a) => !i || !t.date || !a[i - 1].date || a[i - 1].date <= t.date), js(p1.trail.slice(-4))]);
    c.push(["…wip.next the next unit in landing order, the chain's detail", p1.wip.next === "java-floor" && /^1 of 11 units landed; #47 up next\.$/.test(p1.wip.detail), js([p1.wip.next, p1.wip.detail])]);
    c.push(["…wip.updated not moved back (the board was written after the fact)", p1.wip.updated === p0.wip.updated, js([p0.wip.updated, p1.wip.updated])]);
    const e1 = ((p1.notes || {}).corrections || []).filter(x => x.backfill);
    c.push(["…one notes.corrections entry, saying the start was recorded after the fact, with its landing", e1.length === 1 && e1[0].backfill.unit === 61 && e1[0].backfill.at === T61 && e1[0].backfill.landed === M61 && /recorded on \d{4}-\d{2}-\d{2}, after the fact/.test(e1[0].what), js(e1)]);
    c.push(["…check.js passes", run(CHECK, [B.tdir], { env }).status === 0, fails(B.tdir)]);
    const b1 = snap(B), d = raise(B, { unit: 61, at: T61 });
    c.push(["raised again: a duplicate, nothing written", d.a.status === 0 && d.S.result === "duplicate" && snap(B) === b1, js([d.a.status, d.S.result, d.S.applied])]);
    const b = raise(B, { unit: 47, at: T47 }), p2 = P(B.tdir);
    c.push(["#47 backfilled, its board not in this tree: in progress from its start, #62 up next", b.a.status === 0 && b.S.result === "ok" && (p2.wip.current || []).includes("java-floor.built") && p2.wip.next === "http-core" && p2.wip.since === T61 && /^1 of 11 units landed; #47 in progress; #62 up next\.$/.test(p2.wip.detail), js([b.a.status, b.S.result, b.S.refused, p2.wip.current, p2.wip.next, p2.wip.detail])]);
    c.push(["…\"#47 started\" on its day, a second entry, check.js passes", p2.trail.some(t => t.label === "#47 started" && t.date === "2026-10-21") && ((p2.notes || {}).corrections || []).filter(x => x.backfill).length === 2 && run(CHECK, [B.tdir], { env }).status === 0, fails(B.tdir)]);
    const b2 = snap(B), refusals = [
      ["with --arrived (a run's event)", raise(B, { unit: 62, at: "2026-10-22T10:00:00Z" }, ["--arrived", "2026-11-20T02:00:00Z"]), /without --arrived/],
      ["with --view", raise(B, { unit: 62, at: "2026-10-22T10:00:00Z" }, ["--view"]), /never a view copy/],
      ["with --at", raise(B, { unit: 62, at: "2026-10-22T10:00:00Z" }, ["--at", "2026-10-22T10:00:00Z"]), /takes its time from facts\.at/],
      ["a unit in progress already", raise(B, { unit: 47, at: "2026-10-21T11:00:00Z" }), /in progress on #55's board already/],
      ["out of order: before the board's step start (an earlier unit's start)", raise(B, { unit: 62, at: "2026-10-18T06:00:00Z" }), /comes before the start of its implementation step/],
      ["a unit the board does not have", raise(B, { unit: 999, at: "2026-10-22T10:00:00Z" }), /no unit row for #999/],
      ["no time", raise(B, { unit: 62 }), /carries no facts\.at/],
      ["a time ahead of the clock", raise(B, { unit: 62, at: "2099-01-01T00:00:00Z" }), /ahead of the clock/],
      ["an issue board", raise(B, { unit: 62, at: "2026-10-22T10:00:00Z" }, [], { folder: UF, issue: 61 }), /is #61's issue board/]];
    refusals.forEach(([what, r, re]) => c.push([`refused (exit 3): ${what}`, r.a.status === 3 && r.S.result === "refused" && re.test(r.S.refused || ""), js([r.a.status, r.S.result, r.S.refused, r.S.error])]));
    c.push(["…and nothing written by any of them", snap(B) === b2, "the tracking board and #61's board"]);
  });

  guard("backfill-start on a tracking board whose own step is recorded before the start: that visit frozen at the start; a step recorded after it refuses", c => {
    const B = laidRepo("bf-step", "architecture", "2026-10-17T09:00:00Z");
    const a = raise(B, { unit: 61, at: T61 }), p = P(B.tdir), V = ((p.wip.history || {}).architecture || [])[0];
    c.push(["applied: the architecture visit frozen, ending at #61's start", a.a.status === 0 && a.S.result === "ok" && V && V.since === "2026-10-17T09:00:00Z" && V.ended === T61 && p.wip.step === "implementation" && p.wip.since === T61, js([a.a.status, a.S.result, a.S.refused, V, p.wip.step])]);
    c.push(["…check.js passes", run(CHECK, [B.tdir], { env }).status === 0, fails(B.tdir)]);
    const L = laidRepo("bf-late", "architecture", LAID), b4 = snap(L), r = raise(L, { unit: 61, at: T61 });
    c.push(["a board laid at a step after the unit's start (new.js without --step none): refused, nothing written", r.a.status === 3 && /comes before its run's start \(plan\.sized\)/.test(r.S.refused || "") && /new\.js --step none/.test(r.S.refused || "") && snap(L) === b4, js([r.a.status, r.S.refused])]);
  });
  return groups;
};

if (require.main === module) {
  /* a private scratch of its own (verify/scratch.js): out/, the temp root and the stand-in team state, removed at exit unless kept */
  const SCR = require("./scratch.js").open("cases-backfill-start");
  process.env.DASHBOARDS_VERIFY = "1"; process.env.DASHBOARDS_PRIVATES = process.env.DASHBOARDS_PRIVATES || path.join(__dirname, "fixtures", "private-repositories.json");
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : SCR.out);
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
