// The cases of admin-team/dashboards-skill/level-1-seed, run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-seed.js [--out <dir>]. The team-raised seed (plan/RULES.md §4, "Seeding at sized"): the seeding of a sized alone, board-less as reseed is, so a
// level-1 branch, which has no board and sends no sized, carries the repository's pending corrections (the previous landing's issue board landed at its merge, its
// tracking board, the repository work board) in its document-landing commit; the run's own unit on its tracking board marked complete where the facts name it, its
// cell in wip.current; no board laid; raised again, nothing; refused with --view, with a folder, with a state other than complete, on a unit the board does not have.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesSeed(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the seed cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "seed"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  let n = 0;
  const P = d => JSON.parse(rd(path.join(d, "plan.json")));
  const TF = "docs/plans/55-http-client-stack", SF = `${TF}/47-java-23-bytecode`;
  /* a repository whose #47 (a unit of #55) is built and at its Document step, committed as its merge; then landed into the view copies */
  const landedRepo = (name, trkEdit) => {
    const main = path.join(sc, name), tdir = path.join(main, ...TF.split("/")), sdir = path.join(main, ...SF.split("/"));
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const sub = copy(EX); Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: SF, parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
    delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built"); sub.impact = { ...(sub.impact || {}), basis: "as-built" };
    sub.wip = { ...sub.wip, step: "document", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: ["built"], questions: [], research: null, open: [], event: { name: "document", at: "2026-10-26T09:20:00Z" }, steps: STEPS };
    const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z"; if (trkEdit) trkEdit(trk);
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    run(EMBED, [sdir], { env }); run(EMBED, [tdir], { env });
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the merge");
    const M = (git(main, "rev-parse", "HEAD").stdout || "").trim();
    const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: "landed", folder: SF, repo: main, facts: { pr: 90, sha: M, merge: M, date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" } }));
    const l = run(APPLY, ["--event", q, "--worktree", main, "--main", main, "--no-live", "--no-gh", "--at", "2026-10-26T09:30:00Z", "--json", "--view"], { env });
    return { main, tdir, sdir, M, repo: sub.repo, landed: parse(l), vS: path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode"), vT: path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack") };
  };
  const seed = (B, wt, facts, atT, extra, more) => { const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: B.repo, event: "seed", ...(more || {}), facts: facts || {} }));
    const a = run(APPLY, ["--event", q, "--worktree", wt, "--main", B.main, "--no-gh", "--at", atT, "--json", ...(extra || [])], { env }); return { a, S: parse(a) }; };
  const UNIT = { tracking: TF, unit: 63, state: "complete" };

  guard("seed: a level-1 branch carries the pending corrections, its unit complete, and lays no board", c => {
    const B = landedRepo("seed-wt"), wt = path.join(sc, "seed-wt-tree"); fs.rmSync(wt, { recursive: true, force: true });
    c.push(["the landing is in the view copies, built at its merge", B.landed.result === "ok" && P(B.vS).status === "built" && fs.existsSync(path.join(B.vT, "plan.json")), js([B.landed.result, B.landed.error, B.landed.check])]);
    if (git(B.main, "worktree", "add", "-q", "-b", "docs/issue-63", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    const mainBefore = rd(path.join(B.sdir, "plan.json")) + rd(path.join(B.tdir, "plan.json"));
    const s = seed(B, wt, UNIT, "2026-10-26T10:00:00Z"), wS = path.join(wt, ...SF.split("/")), wT = path.join(wt, ...TF.split("/")), ps = P(wS), pt = P(wT), row = pt.rows.find(r => r.unit && r.unit.issue === 63);
    c.push(["seeded: the sub-issue's board landed at its merge, its tracking board with it", s.a.status === 0 && s.S.result === "ok" && ps.status === "built" && (ps.asBuilt || {}).merge === B.M && (s.S.seeded || []).some(x => /47-java-23-bytecode/.test(x)) && (s.S.seeded || []).includes(TF), js([s.a.status, s.S.result, s.S.seeded, s.S.error, s.S.check])]);
    c.push(["…the landed unit landed on the tracking board and out of wip.current", (pt.rows.find(r => r.id === "java-floor").asBuilt || {}).state === "landed" && !(pt.wip.current || []).includes("java-floor.built"), js([pt.rows.find(r => r.id === "java-floor").asBuilt, pt.wip.current])]);
    c.push(["…the level-1 unit complete, its cell in wip.current, the plain fact as its summary, one trail entry", (row.asBuilt || {}).state === "complete" && (pt.wip.current || []).includes("test-support.built") && /^#63's run: .* approved; it is not merged yet\.$/.test(row.asBuilt.summary || "") && pt.trail.filter(t => /^#63 /.test(t.label)).length === 1, js([row.asBuilt, pt.wip.current, pt.trail.slice(-2)])]);
    c.push(["…wip.next the next pending unit in landing order, and the detail says the unit awaits its landing", pt.wip.next === "http-core" && /#63 complete, awaiting its landing/.test(pt.wip.detail || ""), js([pt.wip.next, pt.wip.detail])]);
    c.push(["…no board laid for the level-1 issue", !fs.readdirSync(wT).some(d => /^63-/.test(d)) && !s.S.laid && !s.S.board, js([fs.readdirSync(wT), s.S.laid, s.S.board])]);
    const wb = path.join(wt, "docs", "plans", "board.json");
    c.push(["…the worktree's committed repository work board regenerated from the seeded boards", fs.existsSync(wb) && /#?47/.test(rd(wb)) && run(CHECK, [path.join(wt, "docs", "plans")], { env }).status === 0 && (s.S.wrote || []).some(w => /repository work board/.test(w)), js(s.S.wrote)]);
    c.push(["…check.js passes on both seeded boards", run(CHECK, [wS], { env }).status === 0 && run(CHECK, [wT], { env }).status === 0, js([run(CHECK, [wT], { env }).stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 3)])]);
    c.push(["…the main checkout's tracked boards untouched, its copies kept (still fresher there)", rd(path.join(B.sdir, "plan.json")) + rd(path.join(B.tdir, "plan.json")) === mainBefore && fs.existsSync(path.join(B.vS, "plan.json")) && fs.existsSync(path.join(B.vT, "plan.json")), js(s.S.live)]);
    const snap = () => rd(path.join(wS, "plan.json")) + rd(path.join(wT, "plan.json")) + rd(wb);
    const b4 = snap(), s2 = seed(B, wt, UNIT, "2026-10-26T10:05:00Z");
    c.push(["raised again: result nothing, nothing written", s2.a.status === 0 && s2.S.result === "nothing" && snap() === b4, js([s2.a.status, s2.S.result, s2.S.applied, s2.S.error])]);
  });

  guard("seed in the main checkout, with no unit mark: the corrections alone", c => {
    const B = landedRepo("seed-main");
    const s = seed(B, B.main, {}, "2026-10-26T10:00:00Z", ["--no-live"]);
    c.push(["seeded in place, the tracking board's units as the landing left them, no unit marked", s.a.status === 0 && s.S.result === "ok" && P(B.sdir).status === "built" && P(B.tdir).rows.filter(r => r.unit && (r.asBuilt || {}).state === "complete").length === 0, js([s.a.status, s.S.result, s.S.seeded, s.S.error])]);
    const s2 = seed(B, B.main, {}, "2026-10-26T10:05:00Z", ["--no-live"]);
    c.push(["raised again: nothing", s2.a.status === 0 && s2.S.result === "nothing", js([s2.S.result, s2.S.applied])]);
  });

  guard("seed refuses what it cannot do, and writes nothing", c => {
    const B = landedRepo("seed-refuse"), snap = () => rd(path.join(B.sdir, "plan.json")) + rd(path.join(B.tdir, "plan.json"));
    const b4 = snap();
    const cases = [
      ["with --view", seed(B, B.main, UNIT, "2026-10-26T10:00:00Z", ["--view"]), /without --view/],
      ["naming a folder", seed(B, B.main, UNIT, "2026-10-26T10:00:00Z", [], { folder: "docs/plans/55-http-client-stack/63-test-support" }), /names no board/],
      ["a state other than complete", seed(B, B.main, { ...UNIT, state: "landed" }, "2026-10-26T10:00:00Z"), /post-merge view marks it landed/],
      ["a unit the tracking board does not have", seed(B, B.main, { ...UNIT, unit: 999 }, "2026-10-26T10:00:00Z"), /no unit row for #999/],
      ["a tracking folder that is an issue board", seed(B, B.main, { ...UNIT, tracking: SF }, "2026-10-26T10:00:00Z"), /not a tracking board/]];
    cases.forEach(([what, r, re]) => c.push([`refused: ${what}`, r.a.status === 1 && re.test(r.S.error || ""), js([r.a.status, r.S.error])]));
    c.push(["…and nothing written by any of them", snap() === b4, "the tracked boards"]);
  });

  guard("seed: a landing whose merge the branch does not hold is not seeded", c => {
    const B = landedRepo("seed-old"), wt = path.join(sc, "seed-old-tree"); fs.rmSync(wt, { recursive: true, force: true });
    /* a branch cut before the merge: its first commit's parent has no docs at all, so a second branch from an empty root */
    const root = (git(B.main, "commit-tree", "-m", "before", (git(B.main, "mktree").stdout || "").trim() || "4b825dc642cb6eb9a060e54bf8d69288fbee4904").stdout || "").trim();
    if (!root || git(B.main, "worktree", "add", "-q", "-b", "docs/old", wt, root).status !== 0) { c.push(["git worktree add at a commit before the merge", false, root]); return; }
    fs.mkdirSync(path.join(wt, ...TF.split("/")), { recursive: true }); fs.cpSync(B.tdir, path.join(wt, ...TF.split("/")), { recursive: true });
    const s = seed(B, wt, {}, "2026-10-26T10:00:00Z", ["--no-live"]);
    c.push(["nothing seeded from a copy whose merge is not in this branch's history", s.a.status === 0 && !(s.S.seeded || []).some(x => /47-java-23-bytecode/.test(x)) && (s.S.applied || []).some(x => /merge is not in this branch's history/.test(x)), js([s.a.status, s.S.result, s.S.seeded, s.S.applied, s.S.error])]);
  });
  /* a closed board is kept as it closed (GUIDANCE.md §8, §11): the seeding writes a landed board from its view copy and keeps the copy's page,
     never re-rendering it onto a later template (KotlinBottools #23, seeded at #24's sized on 2026-11-11, had been re-rendered) */
  guard("seed: a landed board is seeded on the page it landed with, never re-rendered onto a later template", c => {
    const B = landedRepo("seed-closed"), wt = path.join(sc, "seed-closed-tree"); fs.rmSync(wt, { recursive: true, force: true });
    if (git(B.main, "worktree", "add", "-q", "-b", "docs/closed", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    /* the view copy's page made from an older template: a mark in its template part */
    const vf = path.join(B.vS, "dashboard.html"), MARK = "<!-- verification case: the template this board landed with -->";
    wr(vf, rd(vf).replace("</body>", MARK + "\n</body>"));
    const s = seed(B, wt, {}, "2026-10-26T10:00:00Z", ["--no-live"]), wS = path.join(wt, ...SF.split("/")), page = rd(path.join(wS, "dashboard.html"));
    c.push(["the landed board seeded on its view copy's page: the older template kept, its data the copy's, no live-view <base> line, not named as re-rendered",
      s.a.status === 0 && (s.S.seeded || []).some(x => /47-java-23-bytecode/.test(x)) && page.includes(MARK) && !lib.VIEW_BASE_RE.test(page) && !/47-java-23-bytecode\/dashboard\.html/.test(js(s.S.rerendered || "")) && P(wS).status === "built",
      js([s.a.status, s.S.result, s.S.seeded, s.S.rerendered, page.includes(MARK), s.S.error])]);
    c.push(["…its page embeds its data verbatim", run(EMBED, [wS, "--check"], { env }).status === 0, "embed.js --check"]);
    const wT = path.join(wt, ...TF.split("/")), strip = h => h.replace(/\r\n/g, "\n").replace(/<script type="application\/json" id="plan">[\s\S]*?<\/script>/, "");
    c.push(["…the tracking board, still in flight, is on the current template", strip(rd(path.join(wT, "dashboard.html"))) === strip(rd(PB)), "the tracking board's page"]);
  });
  /* p23 (KotlinBottools #2 at #24's sized, 2026-11-11): a tracking board past its filing whose plan's merge (wip.landing.merge) no branch holds, as after a
     history rewrite, is seeded with its landed unit's copy: its plan's merge gates only its filing */
  const GONE = "1a74516a28c14f22d642d6adb3000aca264b6731";
  guard("seed: a tracking board past its filing is seeded with its landed unit's copy, though its plan's merge is in no branch's history (p23)", c => {
    const B = landedRepo("seed-gone", t => { t.wip.landing = { pr: 20, merge: GONE }; }), wt = path.join(sc, "seed-gone-tree"); fs.rmSync(wt, { recursive: true, force: true });
    c.push(["the plan's merge is no commit of this repository, and the tracking board's copy carries it", git(B.main, "cat-file", "-e", GONE + "^{commit}").status !== 0 && (P(B.vT).wip.landing || {}).merge === GONE, js(P(B.vT).wip.landing)]);
    if (git(B.main, "worktree", "add", "-q", "-b", "docs/gone", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    const s = seed(B, wt, {}, "2026-10-26T10:00:00Z", ["--no-live"]), wT = path.join(wt, ...TF.split("/")), pt = P(wT);
    c.push(["both seeded: the landed sub-issue at its merge and its tracking board's copy with it", s.a.status === 0 && s.S.result === "ok" && (s.S.seeded || []).some(x => /47-java-23-bytecode/.test(x)) && (s.S.seeded || []).includes(TF) && !(s.S.applied || []).some(x => /^not seeded: 55-http-client-stack \(/.test(x)), js([s.a.status, s.S.result, s.S.seeded, s.S.applied, s.S.error])]);
    c.push(["…the tracked tracking board is the copy (its stamp and its wip): the unit landed, the plan's merge kept as recorded", pt.wip.updated === P(B.vT).wip.updated && pt.wip.detail === P(B.vT).wip.detail && (pt.rows.find(r => r.id === "java-floor").asBuilt || {}).state === "landed" && (pt.wip.landing || {}).merge === GONE, js([pt.rows.find(r => r.id === "java-floor").asBuilt, pt.wip.landing])]);
    c.push(["…check.js passes on it", run(CHECK, [wT], { env }).status === 0, run(CHECK, [wT], { env }).stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 3).join(" | ")]);
  });
  /* p23's second layer: a tracking board's copy refused (here for a board-less unit's merge the branch does not hold) while its landed sub-issue is seeded
     alone still gives up what that landing owns: the row as built, its impact.units entry, its impact.changes entries and its trail; never another unit's, never wip */
  guard("seed: a refused tracking copy still gives up what the seeded landing owns (p23)", c => {
    const B = landedRepo("seed-owned"), wt = path.join(sc, "seed-owned-tree"); fs.rmSync(wt, { recursive: true, force: true });
    const MS = "Verification case: #47 landed, the Java 11 floor on the three artifacts, as the post-merge refresh wrote it.", MU = "Verification case: the floor as built: class files major 55 on all three artifacts.";
    const MC = "Verification case: the floor applies through the convention plugin, as the landing reconciled it.", MT = "Verification case: #47's record reconciled";
    const v = P(B.vT), fr = v.rows.find(r => r.id === "java-floor"), ts = v.rows.find(r => r.id === "test-support");
    fr.asBuilt = { ...fr.asBuilt, summary: MS };
    v.impact.units = v.impact.units.map(u => u.unit === "java-floor" ? { ...u, basis: "as-built", summary: MU } : u);
    v.impact.changes = [...(v.impact.changes || []), { what: MC, why: "Verification case: the build-logic unit's landing moved the floor's home.", when: "#47 landing", unit: "java-floor", entry: "downstream.1", system: "webtools" }];
    v.trail = [...(v.trail || []), { date: "2026-10-26", column: "built", label: MT, ref: "" }];
    ts.asBuilt = { state: "landed", summary: "#63 landed as 1a74516.", merge: GONE };
    v.wip.detail = "Verification case: the copy's own detail.";
    wr(path.join(B.vT, "plan.json"), JSON.stringify(v, null, 2) + "\n");
    if (git(B.main, "worktree", "add", "-q", "-b", "docs/owned", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    const s = seed(B, wt, {}, "2026-10-26T10:00:00Z", ["--no-live"]), wT = path.join(wt, ...TF.split("/")), pt = P(wT), row = id => pt.rows.find(r => r.id === id);
    c.push(["the tracking board's copy refused, the sub-issue seeded alone", s.a.status === 0 && s.S.result === "ok" && (s.S.applied || []).some(x => /^not seeded: 55-http-client-stack \(a board-less unit's merge/.test(x)) && (s.S.seeded || []).some(x => /47-java-23-bytecode/.test(x)), js([s.a.status, s.S.result, s.S.seeded, s.S.applied, s.S.error])]);
    c.push(["…the landed unit's row as built taken from the copy", (row("java-floor").asBuilt || {}).state === "landed" && row("java-floor").asBuilt.summary === MS, js(row("java-floor").asBuilt)]);
    c.push(["…its impact.units entry and its impact.changes entry taken", (pt.impact.units.find(u => u.unit === "java-floor") || {}).summary === MU && (pt.impact.changes || []).some(x => x.what === MC), js([pt.impact.units.find(u => u.unit === "java-floor"), (pt.impact.changes || []).map(x => x.what)])]);
    c.push(["…the copy's trail entry taken, once", pt.trail.filter(t => t.label === MT).length === 1, js(pt.trail.slice(-3))]);
    c.push(["…nothing of the refused unit's landing, and the copy's wip left alone", (row("test-support").asBuilt || {}).state !== "landed" && pt.wip.detail !== v.wip.detail, js([row("test-support").asBuilt, pt.wip.detail])]);
    c.push(["…check.js passes on it", run(CHECK, [wT], { env }).status === 0, run(CHECK, [wT], { env }).stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 3).join(" | ")]);
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
