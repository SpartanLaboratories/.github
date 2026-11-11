// The cases of admin-team/dashboards-skill/level-1-landed, run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-unit-landed.js [--out <dir>]. The team-raised unit-landed (plan/RULES.md §4, "The live view of a landing"): after the merge of a
// tracking issue's unit that has no board (a level-1 unit, marked complete at its seed), raised with --view from the main checkout, naming no board,
// it makes the standing rule's landed move on the tracking board's view copy alone (the unit landed with the plain fact of its landing, out of
// wip.current, wip.next the next unit or none), never a tracked file; raised again, nothing; refused without --view, with a folder, with another
// state, with no merge, on a unit that has a board of its own and has not landed by it. At the tracking issue's last unit (by unit-landed or by a
// sub-issue's landed) the tracking board lands with it once its impact is reconciled whole (status built, asBuilt at that merge, wip.step landed),
// and until then stays at implementation, the summary naming the reconciliation; the next sized seeds the copy, board.js --live keeps a tied copy
// whose board-less unit's record is unfinished, and reseed brings the finished record to a board a sized seeded unfinished.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesUnitLanded(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the unit-landed cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), BOARD = sk("plan/scripts/board.js"), FILL = sk("plan/scripts/fill.js");
  const sc = path.join(out, "unit-landed"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  let n = 0;
  const P = d => JSON.parse(rd(path.join(d, "plan.json")));
  const TF = "docs/plans/55-http-client-stack", VT = m => path.join(m, "docs", "plans", ".live", "view", "55-http-client-stack");
  const ev = (B, wt, event, facts, atT, extra, more) => { const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: B.repo, event, ...(more || {}), facts: facts || {} }));
    const a = run(APPLY, ["--event", q, "--worktree", wt, "--main", B.main, "--no-gh", "--at", atT, "--json", ...(extra || [])], { env }); return { a, S: parse(a) }; };
  /* a repository whose tracking board #55 has its level-1 unit (#63, or the last one #70 with every other unit landed) marked complete by the team's seed,
     committed as that unit's merge */
  const repo = (name, last, sub) => {
    const main = path.join(sc, name), tdir = path.join(main, ...TF.split("/"));
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
    trk.rows.filter(r => r.unit).forEach(r => { r.unit.board = null; if (r.unit.folder) r.unit.folder = null; });
    if (last) {
      /* every unit but the last (and, with sub, the one before it, #69, whose own board lands it) landed, its record finished */
      const done = trk.rows.filter(r => r.unit && r.id !== "http-docs" && !(sub && r.id === "feeds"));
      done.forEach(r => { r.asBuilt = { state: "landed", summary: `Landed through PR #${r.unit.issue + 20}: ${r.name} as planned.` }; });
      trk.impact.units = done.map(r => ({ unit: r.id, basis: "as-built", summary: `${r.name}: as planned.`, release: { bump: "none", version: null }, changes: [] }));
      trk.impact.changes = done.map(r => ({ unit: r.id, when: `#${r.unit.issue} landing`, none: true }));
      trk.wip.current = []; trk.wip.next = sub ? "feeds" : "http-docs"; trk.wip.detail = "10 of 11 units landed.";
    }
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB));
    let sdir = null;
    if (sub) {
      /* #69 (feeds) a sub-issue with a board, at its Document step */
      sdir = path.join(tdir, "69-feeds");
      const s = copy(EX); Object.assign(s, { issue: 69, slug: "69-feeds", folder: `${TF}/69-feeds`, parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: s.baseline.sha, date: s.baseline.date } });
      delete s.issueBoards; s.milestones = s.milestones.filter(m => m.column !== "built"); s.impact = { ...(s.impact || {}), basis: "as-built" };
      s.wip = { ...s.wip, step: "document", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: ["built"], questions: [], research: null, open: [], event: { name: "document", at: "2026-10-26T09:20:00Z" }, steps: STEPS };
      wr(path.join(sdir, "plan.json"), JSON.stringify(s, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
      const t = P(tdir); t.wip.current = ["feeds.built"]; t.wip.next = "http-docs"; t.rows.find(r => r.id === "feeds").asBuilt = { state: "complete", summary: "#69's run: the Quality Review approved; it is not merged yet." }; wr(path.join(tdir, "plan.json"), JSON.stringify(t, null, 2) + "\n");
      run(EMBED, [sdir], { env });
    }
    run(EMBED, [tdir], { env });
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the base");
    const B = { main, tdir, sdir, repo: trk.repo, vT: VT(main) };
    const unit = last ? 70 : 63;
    if (!sub) {
      const s = ev(B, main, "seed", { tracking: TF, unit, state: "complete" }, "2026-10-26T09:30:00Z", ["--no-live"]);
      if (s.S.result !== "ok") throw new Error(`the seed failed: ${js([s.S.result, s.S.error, s.S.check])}`);
    }
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the merge");
    B.M = (git(main, "rev-parse", "HEAD").stdout || "").trim(); B.unit = unit;
    return B;
  };
  const LANDED = (B, extra) => ({ tracking: TF, unit: B.unit, merge: B.M, pr: 97, mergedAt: "2026-10-26T10:00:00Z", ...(extra || {}) });
  const failsOf = d => run(CHECK, [d, "--root", path.dirname(path.dirname(path.dirname(path.dirname(d))))], { env }).stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l));

  guard("unit-landed: a board-less unit landed on its tracking board's view copy, nothing tracked written", c => {
    const B = repo("ul-one", false), tracked = () => rd(path.join(B.tdir, "plan.json")), b4 = tracked();
    const r = ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:05:00Z", ["--view"]);
    const v = fs.existsSync(path.join(B.vT, "plan.json")) ? P(B.vT) : null, row = v && v.rows.find(x => x.id === "test-support");
    c.push(["applied into the view copy, check passing", r.a.status === 0 && r.S.result === "ok" && !!v && /^pass/.test(r.S.check || ""), js([r.a.status, r.S.result, r.S.error, r.S.check])]);
    c.push(["…the unit landed, the plain fact of its landing as its summary", (row.asBuilt || {}).state === "landed" && row.asBuilt.summary === `#63 landed through PR #97 as ${B.M.slice(0, 7)}.`, js(row && row.asBuilt)]);
    c.push(["…out of wip.current, wip.next the next unit in landing order", !(v.wip.current || []).includes("test-support.built") && v.wip.next === "http-core", js([v.wip.current, v.wip.next])]);
    c.push(["…one trail entry, the chain's detail, the board still at implementation", v.trail.filter(t => t.label === "#63 landed").length === 1 && /^2 of 11 units landed/.test(v.wip.detail || "") && v.wip.step === "implementation" && v.status === "building", js([v.trail.slice(-1), v.wip.detail, v.wip.step])]);
    c.push(["…enrich: the unit's record from its merge (no board or documents of its own)", r.S.enrich === "yes" && (r.S.why || []).some(w => /the landed unit's summary.* from its merge \(PR #97\): the unit has no board/.test(w)), js(r.S.why)]);
    c.push(["…no tracked file written; the copy's <base> names the tracked folder", tracked() === b4 && /<base [^>]*data-live-view/.test(rd(path.join(B.vT, "dashboard.html"))) && !(git(B.main, "status", "--porcelain").stdout || "").trim(), js(git(B.main, "status", "--porcelain").stdout)]);
    c.push(["…the live repository work board regenerated, its row from the copy", /regenerated/.test(r.S.live || "") && fs.existsSync(path.join(B.main, "docs", "plans", ".live", "board.json")), js(r.S.live)]);
    const before = rd(path.join(B.vT, "plan.json")), r2 = ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:10:00Z", ["--view"]);
    c.push(["raised again: result nothing, the copy unchanged", r2.a.status === 0 && r2.S.result === "nothing" && rd(path.join(B.vT, "plan.json")) === before, js([r2.S.result, r2.S.applied, r2.S.error])]);
    c.push(["…the unit's merge and PR recorded on its row (no board of its own holds them)", row.asBuilt.merge === B.M && row.asBuilt.pr === 97, js(row.asBuilt)]);
    /* a branch cut before the merge does not take the copy: the unit's merge is not in its history */
    const old = path.join(sc, "ul-one-old"); fs.rmSync(old, { recursive: true, force: true });
    if (git(B.main, "worktree", "add", "-q", "-b", "docs/old", old, "HEAD~1").status !== 0) { c.push(["git worktree add before the merge", false, "failed"]); return; }
    const so = ev(B, old, "seed", {}, "2026-10-26T10:15:00Z", ["--no-live"]), orow = P(path.join(old, ...TF.split("/"))).rows.find(x => x.id === "test-support");
    c.push(["a branch cut before the unit's merge is not seeded with it", so.a.status === 0 && (orow.asBuilt || {}).state !== "landed" && (so.S.applied || []).some(x => /board-less unit's merge on it is not in this branch's history/.test(x)), js([so.S.result, so.S.applied, so.S.error, orow.asBuilt])]);
    /* the next run, branched after the merge: its sized seeds the tracking board's copy (the unit's merge in the branch) */
    const wt = path.join(sc, "ul-one-tree"); fs.rmSync(wt, { recursive: true, force: true });
    if (git(B.main, "worktree", "add", "-q", "-b", "docs/issue-80", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    const s = ev(B, wt, "seed", {}, "2026-10-26T10:20:00Z", ["--no-live"]);
    const wrow = P(path.join(wt, ...TF.split("/"))).rows.find(x => x.id === "test-support");
    c.push(["a later branch's seed carries the unit landed onto its tracked tracking board", s.a.status === 0 && s.S.result === "ok" && (wrow.asBuilt || {}).state === "landed" && (s.S.seeded || []).includes(TF), js([s.S.result, s.S.seeded, s.S.error, wrow.asBuilt])]);
  });

  guard("unit-landed refuses what it cannot do, and writes nothing", c => {
    const B = repo("ul-refuse", false), snap = () => rd(path.join(B.tdir, "plan.json")) + (fs.existsSync(path.join(B.vT, "plan.json")) ? rd(path.join(B.vT, "plan.json")) : "");
    /* #47 (java-floor) has a board of its own in this tree, not landed by it */
    const own = path.join(B.tdir, "47-java-23-bytecode"); fs.mkdirSync(own, { recursive: true }); wr(path.join(own, "plan.json"), "{}\n");
    const b4 = snap();
    const cases = [
      ["without --view", ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:05:00Z", []), /raise it with --view/],
      ["naming a folder", ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:05:00Z", ["--view"], { folder: `${TF}/63-test-support` }), /names no board/],
      ["a state other than landed", ev(B, B.main, "unit-landed", LANDED(B, { state: "complete" }), "2026-10-26T10:05:00Z", ["--view"]), /marks its unit landed/],
      ["no merge", ev(B, B.main, "unit-landed", LANDED(B, { merge: null }), "2026-10-26T10:05:00Z", ["--view"]), /a unit lands at its merge/],
      ["a unit the tracking board does not have", ev(B, B.main, "unit-landed", LANDED(B, { unit: 999 }), "2026-10-26T10:05:00Z", ["--view"]), /no unit row for #999/],
      ["a unit with a board of its own, not landed by it", ev(B, B.main, "unit-landed", LANDED(B, { unit: 47 }), "2026-10-26T10:05:00Z", ["--view"]), /has a board of its own/]];
    cases.forEach(([what, r, re]) => c.push([`refused: ${what}`, r.a.status === 1 && re.test(r.S.error || ""), js([r.a.status, r.S.error])]));
    c.push(["…and nothing written by any of them", snap() === b4, "the tracked board and its copy"]);
  });

  guard("unit-landed at the tracking issue's last unit: the tracking board lands once its impact is reconciled", c => {
    const B = repo("ul-last", true);
    const r = ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:05:00Z", ["--view"]), v = P(B.vT);
    c.push(["every unit landed, wip.next none, the board still at implementation (its impact not reconciled)", r.S.result === "ok" && v.rows.filter(x => x.unit).every(x => x.asBuilt.state === "landed") && v.wip.next === null && v.wip.step === "implementation" && v.status === "building" && !(v.wip.current || []).length, js([r.S.result, r.S.error, v.wip.next, v.wip.step, v.status])]);
    c.push(["…enrich names the reconciliation and the event raised again", (r.S.why || []).some(w => /#55: every unit has landed: the initiative's impact is reconciled whole .* unit-landed raised again for #70/.test(w)), js(r.S.why)]);
    /* the presenter's enrichment, through fill.js on the copy: #70's record and the initiative's impact reconciled */
    const fields = { rows: [{ id: "http-docs", asBuilt: { state: "landed", summary: "Landed through PR #97: the architecture and usage documents for the HTTP stack." } }],
      impact: { basis: "as-built", units: [...v.impact.units, { unit: "http-docs", basis: "as-built", summary: "Documentation only.", release: { bump: "none", version: null }, changes: [] }], changes: [...v.impact.changes, { unit: "http-docs", when: "#70 landing", none: true }] } };
    const ff = wr(path.join(sc, "ul-last-fields.json"), js(fields)), f = run(FILL, [B.vT, "--fields", ff, "--root", B.main, "--json"], { env });
    c.push(["the enrichment through fill.js on the copy passes", f.status === 0 && P(B.vT).impact.basis === "as-built", (f.stdout || f.stderr).slice(0, 400)]);
    const r2 = ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:30:00Z", ["--view"]), w = P(B.vT);
    c.push(["raised again: the tracking board lands at #70's merge (status built, wip.step landed, nothing glowing)", r2.a.status === 0 && r2.S.result === "ok" && w.status === "built" && w.wip.step === "landed" && !(w.wip.current || []).length && w.wip.next === null, js([r2.S.result, r2.S.error, r2.S.check, w.status, w.wip.step])]);
    c.push(["…asBuilt the last unit's merge, its PR and its time", (w.asBuilt || {}).merge === B.M && w.asBuilt.sha === B.M && w.asBuilt.pr === 97 && w.asBuilt.at === "2026-10-26T10:00:00Z" && w.asBuilt.date === "2026-10-26", js(w.asBuilt)]);
    c.push(["…the built milestone at that merge, on the fast path (admin-team/dashboards/built-milestone-fast-path)", (w.milestones || []).filter(m => m && m.column === "built").length === 1 && w.milestones.some(m => m.column === "built" && m.label === "Merged" && m.ref === "PR #97" && m.note === `merged as ${B.M.slice(0, 7)}` && m.date === "2026-10-26"), js((w.milestones || []).filter(m => m && m.column === "built"))]);
    c.push(["…the implementation visit ends at that merge, the detail and the trail say it landed", ((w.wip.history || {}).implementation || []).slice(-1).map(x => x.ended).join() === "2026-10-26T10:00:00Z" && /^Landed: 11 of 11 units, the last #70 in PR #97\.$/.test(w.wip.detail) && w.trail.some(t => /^Landed: every unit, the last #70 in PR #97, merge /.test(t.label)) && (w.wip.event || {}).name === "landed", js([(w.wip.history || {}).implementation, w.wip.detail, w.trail.slice(-2), w.wip.event])]);
    c.push(["…check.js passes on the landed copy, with nothing left to enrich", failsOf(B.vT).length === 0 && r2.S.enrich === "no", js([failsOf(B.vT).slice(0, 3), r2.S.why])]);
    const r3 = ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:40:00Z", ["--view"]);
    c.push(["raised once more: nothing (the tracking board has landed)", r3.a.status === 0 && r3.S.result === "nothing", js([r3.S.result, r3.S.applied])]);
  });

  guard("a sub-issue's landed at the last unit lands the tracking board too, once reconciled (the shared standing rule)", c => {
    const B = repo("ul-sub", true, true);
    /* #70 already landed board-less before; #69 (feeds), with its board, is the last */
    const t = P(B.tdir); t.rows.find(r => r.id === "http-docs").asBuilt = { state: "landed", summary: "Landed through PR #96: the documents." };
    t.impact.units.push({ unit: "http-docs", basis: "as-built", summary: "Documentation only.", release: { bump: "none", version: null }, changes: [] }); t.impact.changes.push({ unit: "http-docs", when: "#70 landing", none: true });
    t.impact.units.push({ unit: "feeds", basis: "as-built", summary: "The feeds module.", release: { bump: "none", version: null }, changes: [] }); t.impact.changes.push({ unit: "feeds", when: "#69 landing", none: true });
    t.impact.basis = "as-built"; t.wip.next = null;
    wr(path.join(B.tdir, "plan.json"), JSON.stringify(t, null, 2) + "\n"); run(EMBED, [B.tdir], { env }); git(B.main, "add", "-A"); git(B.main, "commit", "-q", "-m", "the merge of #69"); const M = (git(B.main, "rev-parse", "HEAD").stdout || "").trim();
    const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: B.repo, issue: 69, event: "landed", folder: `${TF}/69-feeds`, facts: { pr: 99, sha: M, merge: M, date: "2026-10-26", mergedAt: "2026-10-26T11:00:00Z" } }));
    const l = parse(run(APPLY, ["--event", q, "--worktree", B.main, "--main", B.main, "--no-gh", "--at", "2026-10-26T11:05:00Z", "--json", "--view"], { env })), v = P(B.vT);
    c.push(["landed on #69's board: the tracking board's copy lands at #69's merge", l.result === "ok" && v.status === "built" && v.wip.step === "landed" && (v.asBuilt || {}).merge === M && v.asBuilt.at === "2026-10-26T11:00:00Z", js([l.result, l.error, l.check, v.status, v.wip.step, v.asBuilt])]);
    c.push(["…and check.js passes on it", failsOf(B.vT).length === 0, js(failsOf(B.vT).slice(0, 3))]);
  });

  guard("the refresh: a tied tracking copy kept while its board-less unit's record is unfinished; reseed brings the finished record", c => {
    const B = repo("ul-race", false);
    const r = ev(B, B.main, "unit-landed", LANDED(B), "2026-10-26T10:05:00Z", ["--view"]);
    if (r.S.result !== "ok") { c.push(["unit-landed", false, js([r.S.result, r.S.error])]); return; }
    /* a sized in a worktree during the refresh seeds the copy as it stands: the tracked board there ties the copy */
    const wt = path.join(sc, "ul-race-tree"); fs.rmSync(wt, { recursive: true, force: true });
    if (git(B.main, "worktree", "add", "-q", "-b", "docs/issue-81", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    const s = ev(B, wt, "seed", {}, "2026-10-26T10:06:00Z", ["--no-live"]), wT = path.join(wt, ...TF.split("/"));
    c.push(["the seed during the refresh carries the unfinished record", s.S.result === "ok" && P(wT).rows.find(x => x.id === "test-support").asBuilt.state === "landed", js([s.S.result, s.S.error])]);
    /* the main checkout's own tracked board stays behind the copy, so the copy is fresher there; a tie: write the copy's stamp onto a tracked board that ties it */
    const tie = P(B.vT); wr(path.join(B.tdir, "plan.json"), JSON.stringify(tie, null, 2) + "\n");
    const lv = run(BOARD, ["--live", "--root", B.main, "--no-gh"], { env });
    c.push(["board.js --live keeps the tied copy while the board-less unit's record is unfinished", lv.status === 0 && fs.existsSync(path.join(B.vT, "plan.json")), (lv.stdout || lv.stderr).split(/\r?\n/).filter(l => /view copy/.test(l)).join(" | ")]);
    git(B.main, "checkout", "--", ".");
    /* the presenter finishes the record on the copy */
    const v = P(B.vT), fields = { rows: [{ id: "test-support", asBuilt: { state: "landed", summary: "Landed through PR #97: the test fixtures' documents." } }], impact: { units: [...(v.impact.units || []), { unit: "test-support", basis: "as-built", summary: "Documentation only.", release: { bump: "none", version: null }, changes: [] }], changes: [...(v.impact.changes || []), { unit: "test-support", when: "#63 landing", none: true }] } };
    const ff = wr(path.join(sc, "ul-race-fields.json"), js(fields)), f = run(FILL, [B.vT, "--fields", ff, "--root", B.main, "--json"], { env });
    c.push(["the enrichment on the copy", f.status === 0, (f.stdout || f.stderr).slice(0, 300)]);
    const rs = ev(B, B.main, "reseed", {}, "2026-10-26T10:20:00Z", ["--no-live"]), wrow = P(wT).rows.find(x => x.id === "test-support");
    c.push(["reseed brings the finished record to the board the seed wrote", rs.a.status === 0 && rs.S.result === "ok" && wrow.asBuilt.summary === "Landed through PR #97: the test fixtures' documents." && (P(wT).impact.units || []).some(u => u.unit === "test-support") && (P(wT).impact.changes || []).some(x => x.unit === "test-support"), js([rs.S.result, rs.S.error, rs.S.applied, wrow.asBuilt])]);
    c.push(["…and leaves the main checkout's tracked board alone", rd(path.join(B.tdir, "plan.json")) === (git(B.main, "show", "HEAD:" + TF + "/plan.json").stdout || "").replace(/\r\n/g, "\n") || !(git(B.main, "status", "--porcelain", "--", TF).stdout || "").trim(), js(git(B.main, "status", "--porcelain").stdout)]);
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
