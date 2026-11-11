// The cases of the live view of a landing (plan/RULES.md §4, "The live view of a landing"), run by verify-templates.js (it passes its
// helpers in): the post-merge refresh's landed, raised with apply-event.js --view into view copies under docs/plans/.live/view/, never a
// tracked file; a copy's <base> line (lib.js withViewBase()), read by deviation.js as no difference from the template; embed.js and
// check.js on a copy's folder, its links resolved from the tracked folder and its neighbours' links opening their own copies
// (lib.js viewLink()); board.js --live opening the copies and removing a stale one; the landed unit's plain-fact summary the fast
// path writes on the tracking board; and the land's own steps, landing and merge, raised with --view before the merge (the board only in a
// worktree) and after it, idempotent, tracked files and both checkouts clean. Each group returns [title, cases], a case [name, ok, detail].
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

  guard("board.js --live: a unit's copy in flight, removed as stale, no longer keeps its tracking board's copy in the same run", c => {
    /* the tracked boards caught up to their copies (an in-flight run's events raised with --view meanwhile): both copies tie their tracked boards */
    lay(); fs.rmSync(path.join(root, "docs", "plans", ".live"), { recursive: true, force: true });
    [[sdir, vsub], [tdir, vtrk]].forEach(([d, v]) => ["plan.json", "dashboard.html", "plan.js"].forEach(f => wr(path.join(v, f), rd(path.join(d, f)))));
    const b = run(BOARD, ["--live", "--no-gh", "--root", root], { cwd: root }), lines = b.stdout.split(/\r?\n/).filter(l => /view copy/.test(l));
    c.push(["both copies are removed in one run, the unit's first", b.status === 0 && !fs.existsSync(path.join(vsub, "plan.json")) && !fs.existsSync(path.join(vtrk, "plan.json")) && lines.length === 2 && lines.every(l => /removed the stale view copy/.test(l)) && /47-java-23-bytecode/.test(lines[0]), js([b.status, fs.existsSync(path.join(vtrk, "plan.json")), lines])]);
  });

  guard("apply-event.js --view: the land's landing and merge, before the merge and after it, nothing tracked written (plan/RULES.md §4, \"The live view of a landing\")", c => {
    const g = (cwd, ...a) => cp.spawnSync("git", ["-C", cwd, ...a], { encoding: "utf8" }), clean = d => g(d, "status", "--porcelain").stdout.trim() === "";
    const M = path.join(sc, "land-main"), W = path.join(sc, "land-wt"), SUB = ["docs", "plans", "55-http-client-stack", "47-java-23-bytecode"], TR = SUB.slice(0, 3);
    [W, M].forEach(d => fs.rmSync(d, { recursive: true, force: true })); fs.mkdirSync(M, { recursive: true });
    const T0 = "2026-10-26T09:00:00Z", T1 = "2026-10-26T09:10:00Z", T2 = "2026-10-26T09:12:00Z", T3 = "2026-10-26T09:12:30Z";
    /* the board at the document-landing commit: the Document step done, the land next; on its branch, in a worktree only */
    const s0 = copy(sub); s0.wip = { ...s0.wip, step: "document", since: "2026-10-26T08:00:00Z", updated: "2026-10-26T09:00:00Z", event: { name: "document", at: "2026-10-26T09:00:00Z" },
      steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    const t0 = copy(trk); t0.wip.updated = "2026-10-26T08:00:00Z"; t0.wip.current = ["java-floor.built"]; t0.wip.next = "http-core"; t0.rows.find(r => r.id === "java-floor").asBuilt = { state: "complete", summary: "#47's run passed qa; it is not merged yet." };
    g(M, "init", "-q", "-b", "master"); g(M, "config", "user.email", "verify@example.invalid"); g(M, "config", "user.name", "verify"); g(M, "config", "core.autocrlf", "false");
    fs.appendFileSync(path.join(M, ".git", "info", "exclude"), "docs/plans/.live/\n");
    wr(path.join(M, ...TR, "plan.json"), JSON.stringify(t0, null, 2) + "\n"); wr(path.join(M, ...TR, "dashboard.html"), rd(PB)); run(EMBED, [path.join(M, ...TR)]);
    g(M, "add", "-A"); g(M, "commit", "-q", "-m", "the tracking board");
    g(M, "worktree", "add", "-q", "-b", "feat/47", W);
    wr(path.join(W, ...SUB, "plan.json"), JSON.stringify(s0, null, 2) + "\n"); wr(path.join(W, ...SUB, "dashboard.html"), rd(PB)); run(EMBED, [path.join(W, ...SUB)]);
    g(W, "add", "-A"); g(W, "commit", "-q", "-m", "the document-landing commit");
    const vS = path.join(M, "docs", "plans", ".live", "view", ...SUB.slice(2)), vT = path.dirname(vS), wS = path.join(W, ...SUB);
    const ev = (e, at, extra) => wr(path.join(sc, `land-${e}-${at.replace(/\W/g, "")}.json`), JSON.stringify({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: e, folder: sub.folder, facts: { pr: 90, at, ...(extra || {}) } }));
    const raise = (e, at, tree, extra) => { const a = run(APPLY, ["--event", ev(e, at, extra), "--worktree", tree, "--main", M, "--no-gh", "--view", "--json"]); let S = {}; try { S = JSON.parse(a.stdout); } catch (x) { /* reported by the case */ } return { status: a.status, S, raw: js([a.status, S.result, S.check, S.error, (a.stderr || "").slice(0, 200)]) }; };
    const P = d => JSON.parse(rd(path.join(d, "plan.json"))), trailOf = (p, re) => (p.trail || []).filter(t => re.test(t.label)).length;

    /* before the merge: the board lives only in the worktree */
    c.push(["the main checkout holds no board of the issue before the merge", !fs.existsSync(path.join(M, ...SUB, "plan.json")), M]);
    const a1 = raise("landing", T1, W);
    c.push(["landing, before the merge: applied, checks pass on both copies", a1.status === 0 && a1.S.result === "ok" && /^pass/.test(a1.S.check || ""), a1.raw]);
    c.push(["nothing tracked written, and neither checkout is dirty (a dirty worktree blocks its removal)", clean(W) && clean(M), js([g(W, "status", "--porcelain").stdout, g(M, "status", "--porcelain").stdout])]);
    const p1 = P(vS);
    c.push(["the copy shows the landing at its real time", p1.wip.step === "landing" && p1.wip.since === T1 && p1.wip.event.at === T1 && trailOf(p1, /^Landing:/) === 1, js([p1.wip.step, p1.wip.since, p1.wip.event])]);
    c.push(["its <base> line names the board where it lives, the worktree's folder, and viewSource() reads it", path.resolve(lib.viewSource(vS)) === path.resolve(wS) && path.resolve(lib.viewBaseFolder(vS)) === path.resolve(wS), js([lib.viewSource(vS), lib.viewBaseFolder(vS)])]);
    const t1 = P(vT);
    c.push(["the tracking board's copy mirrors the unit's run from the unit's copy, so it stays fresher than the tracked board", t1.rows.find(r => r.id === "java-floor").unit.live.step === "landing" && t1.rows.find(r => r.id === "java-floor").unit.live.updated === T1, js(t1.rows.find(r => r.id === "java-floor").unit.live || null).slice(0, 200)]);
    const k1 = run(CHECK, [vS]), k2 = run(CHECK, [vT]);
    c.push(["check.js passes both copies on its own, with no --root", k1.status === 0 && k2.status === 0, js([k1.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)), k2.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l))])]);
    const e1 = run(EMBED, [vS]);
    c.push(["embed.js on the copy keeps its <base> and writes no tracked file", e1.status === 0 && path.resolve(lib.viewBaseFolder(vS)) === path.resolve(wS) && clean(W) && clean(M), js([e1.status, (e1.stderr || "").slice(0, 200), lib.viewBaseFolder(vS)])]);
    const b1 = run(BOARD, ["--live", "--no-gh", "--root", M], { cwd: M }), B1 = JSON.parse(rd(path.join(M, "docs", "plans", ".live", "board.json"))), r1 = B1.rows.find(r => r.issue === 47);
    c.push(["board.js --live keeps the copy and its row opens it, at the landing, its folder the worktree's", b1.status === 0 && fs.existsSync(path.join(vS, "plan.json")) && r1 && r1.step === "landing" && r1.board === "view/55-http-client-stack/47-java-23-bytecode/dashboard.html" && /land-wt/.test(r1.folder), js([b1.status, r1 && [r1.step, r1.board, r1.folder], (b1.stderr || "").slice(0, 200)])]);
    const before1 = rd(path.join(vS, "plan.json")), a1b = raise("landing", T1, W);
    c.push(["landing raised again is a duplicate: the copy unchanged", a1b.status === 0 && a1b.S.result === "duplicate" && rd(path.join(vS, "plan.json")) === before1, a1b.raw]);
    const a2 = raise("merge", T2, W), p2 = P(vS);
    c.push(["merge, before the merge: applied, the landing's visit frozen with its end", a2.status === 0 && a2.S.result === "ok" && p2.wip.step === "merge" && p2.wip.since === T2 && (p2.wip.history.landing || []).length === 1 && p2.wip.history.landing[0].since === T1 && p2.wip.history.landing[0].ended === T2, a2.raw + js(p2.wip.history.landing)]);
    const a1c = raise("landing", T1, W), P2 = P(vS);
    c.push(["landing raised again with the board at the merge is a duplicate: no second visit, the trail not doubled", a1c.status === 0 && a1c.S.result === "duplicate" && P2.wip.step === "merge" && P2.wip.history.landing.length === 1 && trailOf(P2, /^Landing:/) === 1, a1c.raw]);
    const keep = rd(path.join(vS, "plan.json")), old = raise("landing", "2026-10-26T09:05:00Z", W);
    c.push(["a land step older than the board's last event is refused, nothing changed", old.status === 1 && /older than the board's last event/.test(old.S.error || "") && rd(path.join(vS, "plan.json")) === keep, old.raw]);

    /* the merge: the board is in the main checkout now */
    g(M, "merge", "--no-ff", "-q", "-m", "Merge the branch", "feat/47");
    const sha = g(M, "rev-parse", "--short", "HEAD").stdout.trim();
    const a2b = raise("merge", T2, M);
    c.push(["merge raised again after the merge, from the main checkout, is a duplicate", a2b.status === 0 && a2b.S.result === "duplicate", a2b.raw]);
    const a3 = raise("landed", T3, M, { sha, merge: sha, mergedAt: T3 }), p3 = P(vS), html3 = rd(path.join(vS, "dashboard.html"));
    c.push(["landed, from the main checkout: built, the copy's <base> now the main checkout's folder", a3.status === 0 && p3.status === "built" && p3.wip.step === "landed" && /<base href="\.\.\/\.\.\/\.\.\/\.\.\/55-http-client-stack\/47-java-23-bytecode\/" data-live-view>/.test(html3), a3.raw + (html3.match(/<base [^>]*>/) || ["none"])[0]]);
    const lines = lib.timelineLines(lib.timelineSteps(p3)), has = (re) => lines.some(l => re.test(l));
    c.push(["the Timeline: landing from its real time to the merge step's, then the merge to the merge's time, each once", has(/^Landing.*09:10Z → .*09:12Z/) && has(/^Merge.*09:12Z → .*09:12Z/) && lines.filter(l => /^Landing/.test(l)).length === 1 && lines.filter(l => /^Merge/.test(l)).length === 1, lines.filter(l => /^(Document|Landing|Merge)/.test(l)).join(" | ")]);
    const a1d = raise("landing", T1, M), a2d = raise("merge", T2, M), p3b = P(vS);
    c.push(["both raised again on the landed copy are duplicates: the trail not doubled", a1d.S.result === "duplicate" && a2d.S.result === "duplicate" && trailOf(p3b, /^Landing:/) === 1 && trailOf(p3b, /^Merge:/) === 1 && p3b.wip.step === "landed", a1d.raw + a2d.raw]);
    { const q0 = P(vS); q0.wip.detail = "Merged through PR #90: the landing's own record."; wr(path.join(vS, "plan.json"), JSON.stringify(q0, null, 2) + "\n"); run(EMBED, [vS]);
      const a3b = raise("landed", T3, M, { sha, merge: sha, mergedAt: T3 });
      c.push(["landed raised again on the enriched copy is a duplicate: the record's detail stays", a3b.status === 0 && a3b.S.result === "duplicate" && P(vS).wip.detail === q0.wip.detail, a3b.raw + P(vS).wip.detail]); }
    const ts = P(vT), row3 = ts.rows.find(r => r.id === "java-floor");
    c.push(["the tracking board's copy: the unit landed, out of wip.current, the next one up", row3.asBuilt.state === "landed" && !(ts.wip.current || []).includes("java-floor.built") && ts.wip.next === "http-core" && !row3.unit.live, js([row3.asBuilt.state, ts.wip.current, ts.wip.next])]);
    c.push(["still nothing dirty in either checkout", clean(W) && clean(M), js([g(W, "status", "--porcelain").stdout, g(M, "status", "--porcelain").stdout])]);

    /* after the merge alone: the real times, older than the moment raised and later than the tracked board's stamp; no copy yet */
    fs.rmSync(path.join(M, "docs", "plans", ".live", "view"), { recursive: true, force: true });
    const b1a = raise("landing", T1, M), b1k = fs.existsSync(path.join(vS, "plan.json")) && fs.existsSync(path.join(vT, "dashboard.html"));
    c.push(["landing, after the merge: applied, and board.js --live leaves the tracking board's copy (it refused before, its copy removed under the check as no fresher)", b1a.status === 0 && b1a.S.result === "ok" && b1k && P(vS).wip.step === "landing" && P(vT).rows.find(r => r.id === "java-floor").unit.live.updated === T1, b1a.raw]);
    const b2a = raise("merge", T2, M), b3a = raise("landed", T3, M, { sha, merge: sha, mergedAt: T3 }), q = P(vS), ql = lib.timelineLines(lib.timelineSteps(q));
    c.push(["merge and landed follow, the same Timeline; the main checkout clean", b2a.status === 0 && b3a.status === 0 && q.wip.step === "landed" && ql.some(l => /^Landing.*09:10Z → .*09:12Z/.test(l)) && ql.some(l => /^Merge.*09:12Z → .*09:12Z/.test(l)) && clean(M), b2a.raw + b3a.raw + ql.filter(l => /^(Landing|Merge)/.test(l)).join(" | ")]);
    /* a time not after the board's own stamp: said, as the live view drops such a copy */
    fs.rmSync(path.join(M, "docs", "plans", ".live", "view"), { recursive: true, force: true });
    const late = raise("landing", T0, M);
    c.push(["a land step not after the board's own stamp is warned on (VIEW COPY NOT FRESHER), as the live view drops such a copy", (late.S.warnings || []).some(w => /VIEW COPY NOT FRESHER/.test(w)), late.raw + js(late.S.warnings)]);
    /* a worktree on another drive: no relative path exists, so the <base> is a file URL (the copy is git-ignored, never committed) */
    if (process.platform === "win32") {
      const h = lib.viewBaseHref("D:\\m\\docs\\plans\\.live\\view\\a", "C:\\wt\\docs\\plans\\a");
      c.push(["viewBaseHref() across drives is a file URL into the worktree", h === "file:///C:/wt/docs/plans/a/", h]);
    }
    [W].forEach(d => { g(M, "worktree", "remove", "--force", d); });
  });
  return groups;
};
