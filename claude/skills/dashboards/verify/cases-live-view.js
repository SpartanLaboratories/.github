// The cases of the live view of a landing (plan/RULES.md §4, "The live view of a landing"), run by verify-templates.js (it passes its
// helpers in): the post-merge refresh's landed, raised with apply-event.js --view into view copies under docs/plans/.live/view/, never a
// tracked file; a copy's <base> line (lib.js withViewBase()), read by deviation.js as no difference from the template; embed.js and
// check.js on a copy's folder, its links resolved from the tracked folder and its neighbours' links opening their own copies
// (lib.js viewLink()); board.js --live opening the copies and removing a stale one; and the landed unit's plain-fact summary the fast
// path writes on the tracking board. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function casesLiveView(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js")), dev = require(sk("system/scripts/deviation.js"));
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the live view cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js"), BOARD = sk("plan/scripts/board.js");
  const sc = path.join(out, "live-view"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  /* a tree outside any git work tree (its .live/ is writable there): the tracking fixture #55 and its unit #47 at the merge, every part resolved */
  const root = path.join(sc, "repo"), tdir = path.join(root, "docs", "plans", "55-http-client-stack"), sdir = path.join(tdir, "47-java-23-bytecode");
  const sub = copy(EX);
  Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: "docs/plans/55-http-client-stack/47-java-23-bytecode", parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
  delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built");
  sub.wip = { ...sub.wip, step: "merge", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: [], questions: [], research: null, event: { name: "merge", at: "2026-10-26T09:20:00Z" },
    steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "state-boards", "merge", "landed"] };
  const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
  const lay = () => {
    fs.rmSync(root, { recursive: true, force: true });
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB));
    wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    run(EMBED, [sdir]); run(EMBED, [tdir]);
  };
  const snap = () => [tdir, sdir].flatMap(d => ["plan.json", "dashboard.html", "plan.js"].map(f => rd(path.join(d, f)))).join("\0");
  const vsub = path.join(root, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode"), vtrk = path.dirname(vsub);

  lay();
  guard("lib.js: a view copy's folder, its tracked folder and its <base> line (plan/RULES.md §4, \"The live view of a landing\")", c => {
    c.push(["viewDirOf() and viewSource() map a tracked folder and its copy both ways", path.resolve(lib.viewDirOf(sdir, root)) === path.resolve(vsub) && path.resolve(lib.viewSource(vsub)) === path.resolve(sdir) && lib.viewSource(sdir) === null, js([lib.viewDirOf(sdir, root), lib.viewSource(vsub)])]);
    c.push(["treeRoot() of a copy's folder is the tree that holds .live/view/", path.resolve(lib.treeRoot(vsub)) === path.resolve(root), lib.treeRoot(vsub)]);
    const h = lib.withViewBase(rd(PB), vsub, sdir), again = lib.withViewBase(h, vsub, sdir);
    c.push(["withViewBase(): one <base href=\"../../../../55-http-client-stack/47-java-23-bytecode/\" data-live-view> line right after <head>, and once only", /<head>\r?\n<base href="\.\.\/\.\.\/\.\.\/\.\.\/55-http-client-stack\/47-java-23-bytecode\/" data-live-view>\r?\n/.test(h) && again === h, (h.match(/<base [^>]*>/) || [""])[0]]);
    const f = wr(path.join(sc, "dev", "dashboard.html"), h);
    const d = dev.deviation(f);
    c.push(["deviation.js reads the copy as the template plus its data: no difference, no browser pass", d.verdict === "identical" && d.passes === "none", js([d.verdict, d.passes, d.differs])]);
    c.push(["planStamp(): the later of wip.updated and a mirrored unit run's", lib.planStamp({ wip: { updated: "2026-10-26T09:00:00Z" }, rows: [{ unit: { live: { updated: "2026-10-26T10:00:00Z" } } }] }) === "2026-10-26T10:00:00Z", lib.planStamp({ wip: { updated: "2026-10-26T09:00:00Z" } })]);
  });

  guard("apply-event.js --view: landed into the view copies, nothing tracked written (plan/RULES.md §4, \"The live view of a landing\")", c => {
    lay(); const before = snap();
    const rq = wr(path.join(sc, "landed-47.json"), JSON.stringify({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: "landed", folder: sub.folder, facts: { pr: 90, sha: "abcdef1", merge: "abcdef2", date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" } }));
    const a = run(APPLY, ["--event", rq, "--worktree", root, "--main", root, "--no-gh", "--view", "--at", "2026-10-26T09:30:00Z", "--json"]);
    let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { /* reported below */ }
    c.push(["the event applies, and checks pass on both copies", a.status === 0 && S.result === "ok" && /^pass/.test(S.check || ""), js([a.status, S.result, S.check, S.error, (a.stderr || "").slice(0, 300)])]);
    c.push(["no tracked file changed: the boards, their data and their sidecars byte for byte", snap() === before, "the tracked boards differ after --view"]);
    const vp = JSON.parse(rd(path.join(vsub, "plan.json"))), vt = JSON.parse(rd(path.join(vtrk, "plan.json")));
    c.push(["the issue's copy: built, landed, the merge recorded", vp.status === "built" && vp.wip.step === "landed" && vp.asBuilt.merge === "abcdef2" && vp.asBuilt.pr === 90, js([vp.status, vp.wip.step, vp.asBuilt])]);
    const row = vt.rows.find(r => r.id === "java-floor");
    c.push(["the tracking board's copy: the unit landed, out of wip.current, the next one up", row.asBuilt.state === "landed" && !(vt.wip.current || []).includes("java-floor.built") && vt.wip.next === "http-core", js([row.asBuilt.state, vt.wip.current, vt.wip.next])]);
    c.push(["a unit's summary written before is kept at its landing", row.asBuilt.summary === trk.rows.find(r => r.id === "java-floor").asBuilt.summary, row.asBuilt.summary]);
    { const t2 = copy(trk); t2.rows.find(r => r.id === "java-floor").asBuilt.summary = "#47's run passed qa; it is not merged yet."; const r2 = path.join(sc, "repo2"), d2 = path.join(r2, "docs", "plans", "55-http-client-stack"), s2 = path.join(d2, "47-java-23-bytecode");
      wr(path.join(d2, "plan.json"), JSON.stringify(t2, null, 2) + "\n"); wr(path.join(d2, "dashboard.html"), rd(PB)); wr(path.join(s2, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(s2, "dashboard.html"), rd(PB)); run(EMBED, [s2]); run(EMBED, [d2]);
      const a2 = run(APPLY, ["--event", rq, "--worktree", r2, "--main", r2, "--no-gh", "--no-live", "--at", "2026-10-26T09:30:00Z", "--json"]), u2 = JSON.parse(rd(path.join(d2, "plan.json"))).rows.find(r => r.id === "java-floor");
      c.push(["a unit whose summary is only its qa pass's plain fact gets its landing's plain fact, in place without --view (check.js: a landed part describes what exists)", a2.status === 0 && u2.asBuilt.summary === "#47 landed through PR #90 as abcdef2.", js([a2.status, u2.asBuilt.summary, (a2.stdout || "").slice(0, 300)])]); }
    const html = rd(path.join(vsub, "dashboard.html"));
    c.push(["the issue's copy carries its <base> line naming the tracked folder", /<base href="\.\.\/\.\.\/\.\.\/\.\.\/55-http-client-stack\/47-java-23-bytecode\/" data-live-view>/.test(html), (html.match(/<base [^>]*>/) || ["none"])[0]]);
    c.push(["the copies link each other: the issue's parent its tracking board's copy, the tracking board's unit the issue's copy", vp.parent.board === "../../.live/view/55-http-client-stack/dashboard.html" && row.unit.board === "../.live/view/55-http-client-stack/47-java-23-bytecode/dashboard.html", js([vp.parent.board, row.unit.board])]);
    const k = run(CHECK, [vsub, "--root", root]), k2 = run(CHECK, [vtrk, "--root", root]);
    c.push(["check.js passes both copies", k.status === 0 && k2.status === 0, js([k.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)), k2.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l))])]);
    wr(path.join(vsub, "dashboard.html"), html.replace(/<base [^>]*data-live-view>\r?\n/, ""));
    const k3 = run(CHECK, [vsub, "--root", root]);
    c.push(["check.js fails a copy whose <base> line is gone", k3.status !== 0 && /view copy's <base href> is missing/.test(k3.stdout), k3.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ")]);
    const e = run(EMBED, [vsub]);
    c.push(["embed.js on a copy writes its <base> line back and re-embeds the tracking board's copy, never the tracked board", e.status === 0 && /<base [^>]*data-live-view>/.test(rd(path.join(vsub, "dashboard.html"))) && snap() === before, js([e.status, (e.stderr || "").slice(0, 200)])]);
  });

  guard("board.js --live: the copies stand in for the tracked boards while fresher, and a stale copy is removed", c => {
    const b = run(BOARD, ["--live", "--no-gh", "--root", root], { cwd: root });
    const B = JSON.parse(rd(path.join(root, "docs", "plans", ".live", "board.json"))), r47 = B.rows.find(r => r.issue === 47), r55 = B.rows.find(r => r.issue === 55);
    c.push(["the landed issue's row reads landed and opens its copy", b.status === 0 && r47 && r47.status === "landed" && r47.board === "view/55-http-client-stack/47-java-23-bytecode/dashboard.html", js([b.status, r47 && [r47.status, r47.board], (b.stderr || "").slice(0, 200)])]);
    c.push(["the tracking issue's row and group open its copy; its folder stays the tracked one", r55 && r55.board === "view/55-http-client-stack/dashboard.html" && r55.folder === "../55-http-client-stack/" && (B.groups.find(g => g.issue === 55) || {}).board === "view/55-http-client-stack/dashboard.html", js(r55 && [r55.board, r55.folder])]);
    /* the next landing commits the landed state: the tracked board is as fresh as the copy */
    const t = JSON.parse(rd(path.join(sdir, "plan.json"))); t.wip.updated = "2026-10-26T12:00:00Z"; wr(path.join(sdir, "plan.json"), JSON.stringify(t, null, 2) + "\n");
    const b2 = run(BOARD, ["--live", "--no-gh", "--root", root], { cwd: root });
    const B2 = JSON.parse(rd(path.join(root, "docs", "plans", ".live", "board.json"))), r47b = B2.rows.find(r => r.issue === 47);
    c.push(["a copy no fresher than its tracked board is removed, and the row opens the tracked board again", b2.status === 0 && !fs.existsSync(path.join(vsub, "plan.json")) && r47b.board === "../55-http-client-stack/47-java-23-bytecode/dashboard.html" && /removed the stale view copy/.test(b2.stdout), js([b2.status, fs.existsSync(vsub), r47b.board, b2.stdout.split(/\r?\n/).filter(l => /view copy/.test(l))])]);
  });
  return groups;
};
