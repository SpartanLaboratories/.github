// The cases of the fast path owning the Timeline (plan/RULES.md §4, "The fast path owns the Timeline"), run by verify-templates.js (it
// passes its helpers in), or on its own with no browser: node verify/cases-timeline-fast-path.js [--out <dir>]. Every Timeline input of an
// issue or tracking board written by apply-event.js at its event, none left to the presenter: the merge's time at landed from the facts,
// git in the worktree, git in the main checkout or the pull request's merge time from the tracker (lib.js ghMergeTime(), held to the
// board's merge commit), a warning and no enrichment where none can tell; the seeding at the next run's sized recording it from git; the
// run's start at a foundation laid after its event (new.js --at); a board in flight's Timeline redrawn from the plan.js sidecar an event
// writes, the running visit open to now; and the template's tick that keeps the running visit, the figure "so far", the KPI tiles' tracer
// labels and the tracers following the clock between two events. No case here opens a browser. Each group returns [title, cases], a case
// [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesTimelineFastPath(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["the Timeline's fast path (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const ENV = (when) => ({ ...process.env, GIT_AUTHOR_NAME: "v", GIT_AUTHOR_EMAIL: "v@example.invalid", GIT_COMMITTER_NAME: "v", GIT_COMMITTER_EMAIL: "v@example.invalid", ...(when ? { GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when } : {}) });
  const git = (cwd, a, when) => cp.spawnSync("git", a, { cwd, encoding: "utf8", env: ENV(when) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), NEW = sk("plan/scripts/new.js");
  const sc = path.join(out, "timeline-fast-path"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EXD = "plan/examples/38-handshake-empty-name", EX = J(EXD + "/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const timelineWhy = S => (S.why || []).filter(w => /merge's time|asBuilt\.at|timeline\.js|mergedAt/.test(w));
  /* a stand-in for the tracker: prints what DASHBOARDS_GH_REPLY names (a pull request's state, merge time and merge commit) */
  const ghStub = wr(path.join(sc, "gh-stub.js"), "const r = process.env.DASHBOARDS_GH_REPLY; if (!r) process.exit(1); process.stdout.write(r);\n");
  const withGh = reply => ({ env: { ...process.env, DASHBOARDS_GH: ghStub, DASHBOARDS_GH_REPLY: reply ? js(reply) : "" } });
  let haveGit = true; try { cp.execFileSync("git", ["--version"], { stdio: "ignore" }); } catch (e) { haveGit = false; }

  /* 1. lib.js ghMergeTime() */
  guard("lib.js ghMergeTime(): the pull request's merge time from the tracker, held to the board's merge commit, never a guess", c => {
    const M = "0123456789abcdef0123456789abcdef01234567", saved = [process.env.DASHBOARDS_GH, process.env.DASHBOARDS_GH_REPLY];
    const at = (reply, merge, repo, pr) => { process.env.DASHBOARDS_GH = ghStub; process.env.DASHBOARDS_GH_REPLY = reply ? js(reply) : ""; try { return lib.ghMergeTime(repo === undefined ? "acme/widgets" : repo, pr === undefined ? 9 : pr, merge); } finally { if (saved[0] === undefined) delete process.env.DASHBOARDS_GH; else process.env.DASHBOARDS_GH = saved[0]; if (saved[1] === undefined) delete process.env.DASHBOARDS_GH_REPLY; else process.env.DASHBOARDS_GH_REPLY = saved[1]; } };
    const merged = { state: "MERGED", mergedAt: "2026-10-25T21:40:14Z", mergeCommit: { oid: M } };
    c.push(["a merged pull request whose merge commit is the board's: its merge time, in UTC", js(at(merged, M.slice(0, 7))) === js({ at: "2026-10-25T21:40:14Z", oid: M }), js(at(merged, M.slice(0, 7)))]);
    c.push(["…a board that records no merge commit yet takes it too", at(merged, null).at === "2026-10-25T21:40:14Z", js(at(merged, null))]);
    c.push(["a merge commit that is not the board's: not taken, the mismatch named", js(at(merged, "fedcba9")) === js({ mismatch: M }), js(at(merged, "fedcba9"))]);
    c.push(["not merged, no merge time, the tracker failing, no repository or no pull request: nothing", js(at({ ...merged, state: "OPEN" }, null)) === "{}" && js(at({ ...merged, mergedAt: null }, null)) === "{}" && js(at(null, null)) === "{}" && js(at(merged, null, "not a slug")) === "{}" && js(at(merged, null, "acme/widgets", null)) === "{}", "{} each"]);
  });

  /* 2. apply-event.js at landed: every source of the merge's time, and no enrichment for the Timeline */
  guard("apply-event.js at landed: the merge's time from the facts, git in the worktree, git in the main checkout, the pull request; a warning, never the presenter, where none tells it", c => {
    if (!haveGit) { c.push(["git is on the path", false, "no git"]); return; }
    const repo = path.join(sc, "repo"), folder = "docs/plans/91-verification-case", fdir = path.join(repo, ...folder.split("/"));
    fs.mkdirSync(fdir, { recursive: true }); git(repo, ["init", "-q", "-b", "main"]);
    const commit = (files, msg, when) => { files.forEach(([f, t]) => wr(path.join(repo, f), t)); git(repo, ["add", "-A"]); git(repo, ["commit", "-q", "-m", msg], when); };
    commit([["README.md", "x\n"]], "base", "2026-10-25T10:00:00Z");
    git(repo, ["checkout", "-q", "-b", "feat"]);
    commit([[folder + "/research/README.md", "q\n"]], "docs: research questions", "2026-10-25T12:35:59Z");
    commit([[folder + "/plan.md", "p\n"]], "docs: plan", "2026-10-25T14:00:00Z");
    git(repo, ["checkout", "-q", "main"]); git(repo, ["merge", "-q", "--no-ff", "-m", "Merge feat", "feat"], "2026-10-25T21:40:14Z");
    const merge = (git(repo, ["rev-parse", "HEAD"]).stdout || "").trim();
    const lv = copy(EX); Object.assign(lv, { folder, issue: 91, slug: "91-verification-case", status: "building" }); lv.asBuilt = { ref: "main", sha: lv.baseline.sha, date: lv.baseline.date }; lv.wip.step = "landing"; lv.wip.current = [];
    const lay = root => { const d = path.join(root, ...folder.split("/")); docsInto(d); wr(path.join(d, "plan.json"), JSON.stringify(lv, null, 2) + "\n"); wr(path.join(d, "dashboard.html"), rd(PB)); run(EMBED, [d]); return d; };
    lay(repo);
    /* a worktree outside git (its board alone), and a main checkout outside git: git can tell nothing there */
    const plain = path.join(sc, "plain-wt"), plainMain = path.join(sc, "plain-main"); lay(plain); fs.mkdirSync(path.join(plainMain, "docs", "plans"), { recursive: true });
    const ev = (name, facts) => wr(path.join(sc, name + ".json"), js({ v: 1, action: "plan-board", github: lv.repo, issue: 91, event: "landed", folder, facts: { pr: 9, merge: merge.slice(0, 7), sha: merge.slice(0, 7), date: "2026-10-25", ...(facts || {}) } }));
    const landed = (root, main, extra, o, facts, name) => { lay(root); const a = run(APPLY, ["--event", ev(name, facts), "--worktree", root, "--main", main, "--no-live", "--at", "2026-10-25T22:03:35Z", "--json", ...(extra || [])], o);
      return { a, S: parse(a), p: JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json"))) }; };
    const r1 = landed(repo, repo, ["--no-gh"], null, null, "l1");
    c.push(["git in the worktree: the merge's time and the step commits; no Timeline reason to enrich, no warning", r1.a.status === 0 && r1.p.asBuilt.at === "2026-10-25T21:40:14Z" && (r1.p.asBuilt.commits || []).length === 2 && !timelineWhy(r1.S).length && !(r1.S.warnings || []).length, js([r1.a.status, r1.p.asBuilt.at, timelineWhy(r1.S), r1.S.warnings, r1.S.error])]);
    const r2 = landed(plain, repo, ["--no-gh"], null, null, "l2");
    c.push(["git in the main checkout, where the worktree's cannot tell it", r2.a.status === 0 && r2.p.asBuilt.at === "2026-10-25T21:40:14Z" && (r2.p.asBuilt.commits || []).length === 2 && !timelineWhy(r2.S).length, js([r2.a.status, r2.p.asBuilt, r2.S.error])]);
    const r3 = landed(plain, plainMain, [], withGh({ state: "MERGED", mergedAt: "2026-10-25T21:40:14Z", mergeCommit: { oid: merge } }), null, "l3");
    c.push(["the pull request's merge time from the tracker, where git cannot tell it, and said in what it applied", r3.a.status === 0 && r3.p.asBuilt.at === "2026-10-25T21:40:14Z" && !r3.p.asBuilt.commits && (r3.S.applied || []).some(x => /PR #9's merge time/.test(x)) && !timelineWhy(r3.S).length, js([r3.a.status, r3.p.asBuilt.at, (r3.S.applied || []).filter(x => /PR/.test(x)), r3.S.error])]);
    const r4 = landed(plain, plainMain, [], withGh({ state: "MERGED", mergedAt: "2026-10-25T21:40:14Z", mergeCommit: { oid: "f".repeat(40) } }), null, "l4");
    c.push(["…not when the pull request's merge commit is not the board's: nothing recorded, a warning", r4.a.status === 0 && !r4.p.asBuilt.at && (r4.S.warnings || []).some(w => /is not the board's merge/.test(w)) && !timelineWhy(r4.S).length, js([r4.p.asBuilt.at, r4.S.warnings])]);
    const r5 = landed(plain, plainMain, ["--no-gh"], null, null, "l5");
    c.push(["none can tell it: nothing recorded, never guessed; a warning naming the next run's sized; enrich gives no Timeline reason", r5.a.status === 0 && !r5.p.asBuilt.at && (r5.S.warnings || []).some(w => /not recorded yet/.test(w) && /next run's sized records it from git/.test(w)) && !timelineWhy(r5.S).length, js([r5.p.asBuilt.at, r5.S.warnings, timelineWhy(r5.S)])]);
    const r6 = landed(plain, plainMain, [], withGh({ state: "MERGED", mergedAt: "2026-10-25T21:40:14Z", mergeCommit: { oid: merge } }), { mergedAt: "2026-10-25T21:41:00Z" }, "l6");
    c.push(["facts.mergedAt first, before git and the tracker", r6.a.status === 0 && r6.p.asBuilt.at === "2026-10-25T21:41:00Z", js([r6.a.status, r6.p.asBuilt.at])]);
    /* never backwards: a merge time before the last visit's start does not end it (lib.js timelineSteps(), rule 2) */
    const nb = copy(r1.p); nb.status = "built"; nb.wip.step = "landed"; nb.wip.history = { landing: [{ since: "2026-10-25T21:50:00Z", ended: "2026-10-25T22:00:00Z", endedBy: "merge" }] }; nb.wip.steps = ["landing", "landed"]; nb.asBuilt.at = "2026-10-25T21:40:14Z";
    const T = lib.timelineSteps(nb), last = T.visits[T.visits.length - 1];
    c.push(["never backwards: a merge time before the last visit's start leaves that visit's own end", last && last.to && last.to.t === "2026-10-25T22:00:00Z" && !last.to.merge, js(last)]);
  });

  /* 3. seeding at sized records the merge's time from git */
  guard("apply-event.js at sized: the seeding records the merge's time from git where the landing could not, keeping one already recorded", c => {
    if (!haveGit) { c.push(["git is on the path", false, "no git"]); return; }
    const main = path.join(sc, "seed-main"), wt = path.join(sc, "seed-wt");
    git(sc, ["init", "-q", "-b", "master", main]); wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const tdir = path.join(main, "docs", "plans", "55-http-client-stack"), sdir = path.join(tdir, "47-java-23-bytecode");
    const sub = copy(EX); Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: "docs/plans/55-http-client-stack/47-java-23-bytecode", parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
    delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built");
    sub.wip = { ...sub.wip, step: "merge", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: [], questions: [], research: null, open: [], event: { name: "merge", at: "2026-10-26T09:20:00Z" }, steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); docsInto(sdir); wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    run(EMBED, [sdir]); run(EMBED, [tdir]);
    git(main, ["add", "-A"]); git(main, ["commit", "-q", "-m", "the merge"], "2026-10-26T09:22:00Z"); const M = (git(main, ["rev-parse", "HEAD"]).stdout || "").trim();
    const lq = wr(path.join(sc, "seed-landed.json"), js({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: "landed", folder: sub.folder, facts: { pr: 90, sha: M, merge: M, date: "2026-10-26" } }));
    const lv = run(APPLY, ["--event", lq, "--worktree", main, "--main", main, "--no-gh", "--no-live", "--view", "--at", "2026-10-26T09:30:00Z", "--json"]);
    const vf = path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode", "plan.json");
    c.push(["the post-merge refresh's landed records the merge's time from the main checkout's git", lv.status === 0 && fs.existsSync(vf) && JSON.parse(rd(vf)).asBuilt.at === "2026-10-26T09:22:00Z", (lv.stdout || lv.stderr).slice(0, 300)]);
    /* as a landing would leave it where git could not tell: the time not recorded */
    const vp = JSON.parse(rd(vf)); delete vp.asBuilt.at; wr(vf, JSON.stringify(vp, null, 2) + "\n");
    if (git(main, ["worktree", "add", "-q", "-b", "feat/62", wt]).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    const nd = path.join(wt, "docs", "plans", "55-http-client-stack", "62-http-core"), nu = copy(J("verify/fixtures/live-issue.plan.json"));
    Object.assign(nu, { issue: 62, slug: "62-http-core", folder: "docs/plans/55-http-client-stack/62-http-core", parent: { issue: 55 }, issueTitle: "Verification case #62", status: "planned" });
    nu.wip = { ...nu.wip, step: null, current: [], event: { name: "boards-created", at: "2026-10-26T08:00:00Z" }, updated: "2026-10-26T08:00:00Z", history: {} };
    wr(path.join(nd, "plan.json"), JSON.stringify(nu, null, 2) + "\n"); wr(path.join(nd, "dashboard.html"), rd(PB)); run(EMBED, [nd]);
    const sq = wr(path.join(sc, "seed-sized.json"), js({ v: 1, action: "plan-board", github: nu.repo, issue: 62, event: "sized", folder: nu.folder, repo: main, facts: { step: "research" } }));
    const a = run(APPLY, ["--event", sq, "--worktree", wt, "--no-gh", "--no-live", "--at", "2026-10-26T10:00:00Z", "--json"]), S = parse(a);
    const ws = JSON.parse(rd(path.join(wt, "docs", "plans", "55-http-client-stack", "47-java-23-bytecode", "plan.json")));
    c.push(["the seeded board takes the merge's time from git (the merge is in the branch now), and the summary says so", a.status === 0 && (ws.asBuilt || {}).at === "2026-10-26T09:22:00Z" && (S.applied || []).some(x => /47-java-23-bytecode: asBuilt\.at from git/.test(x)), js([a.status, (ws.asBuilt || {}).at, (S.applied || []).filter(x => /from git/.test(x)), S.error])]);
    /* a recorded time is kept: a second branch, its copy carrying the facts' merge time */
    const wt2 = path.join(sc, "seed-wt2"); const vp2 = JSON.parse(rd(vf)); vp2.asBuilt.at = "2026-10-26T09:21:30Z"; vp2.wip.updated = "2026-10-26T11:00:00Z"; wr(vf, JSON.stringify(vp2, null, 2) + "\n");
    git(main, ["worktree", "add", "-q", "-b", "feat/63", wt2]); const nd2 = path.join(wt2, "docs", "plans", "55-http-client-stack", "63-test-support"), nu2 = copy(nu); Object.assign(nu2, { issue: 63, slug: "63-test-support", folder: "docs/plans/55-http-client-stack/63-test-support" });
    wr(path.join(nd2, "plan.json"), JSON.stringify(nu2, null, 2) + "\n"); wr(path.join(nd2, "dashboard.html"), rd(PB)); run(EMBED, [nd2]);
    const sq2 = wr(path.join(sc, "seed-sized2.json"), js({ v: 1, action: "plan-board", github: nu.repo, issue: 63, event: "sized", folder: nu2.folder, repo: main, facts: { step: "research" } }));
    const a2 = run(APPLY, ["--event", sq2, "--worktree", wt2, "--no-gh", "--no-live", "--at", "2026-10-26T11:05:00Z", "--json"]);
    const ws2 = JSON.parse(rd(path.join(wt2, "docs", "plans", "55-http-client-stack", "47-java-23-bytecode", "plan.json")));
    c.push(["…a merge time already recorded is kept over git's", a2.status === 0 && (ws2.asBuilt || {}).at === "2026-10-26T09:21:30Z", js([a2.status, (ws2.asBuilt || {}).at, parse(a2).error])]);
  });

  /* 4. the run's start at a foundation laid after its event */
  guard("the run's start at sized with no board: apply-event.js names the event's time, new.js --at stamps it (plan.sized, wip.since)", c => {
    const root = path.join(sc, "new-root"); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    const rq = wr(path.join(sc, "nb-sized.json"), js({ v: 1, action: "plan-board", github: "acme/widgets", issue: 93, event: "sized", folder: "docs/plans/93-a-case", facts: { step: "research" } }));
    const a = run(APPLY, ["--event", rq, "--worktree", root, "--no-gh", "--no-live", "--at", "2026-10-27T08:15:00Z", "--json"]), S = parse(a);
    c.push(["no board yet: nothing written, and the summary names new.js --at with the event's time", a.status === 0 && S.result === "no-board" && (S.why || []).some(w => /new\.js \.\.\. --at 2026-10-27T08:15:00Z/.test(w)), js([a.status, S.result, S.why])]);
    const n = run(NEW, ["93", "a-case", "--root", root, "--at", "2026-10-27T08:15:00Z", "--repo", "acme/widgets", "--title", "A case"]);
    const p = fs.existsSync(path.join(root, "docs", "plans", "93-a-case", "plan.json")) ? JSON.parse(rd(path.join(root, "docs", "plans", "93-a-case", "plan.json"))) : {};
    c.push(["new.js --at: the run's start and the first step's since are the event's time", n.status === 0 && p.sized === "2026-10-27T08:15:00Z" && (p.wip || {}).since === "2026-10-27T08:15:00Z", js([n.status, p.sized, (p.wip || {}).since, (n.stderr || "").slice(0, 200)])]);
    const bad = run(NEW, ["94", "b-case", "--root", root, "--at", "tomorrow"]);
    c.push(["…an --at that is no ISO UTC time is a usage error, nothing laid", bad.status === 2 && !fs.existsSync(path.join(root, "docs", "plans", "94-b-case")), js([bad.status, (bad.stderr || "").slice(0, 160)])]);
  });

  /* 5. a board in flight: its Timeline from the sidecar an event writes, and the template's tick */
  guard("a board in flight: the Timeline redrawn from the plan.js an event writes, the running visit open to now, and the template's tick between events", c => {
    const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: "2026-10-26T08:00:00Z", updated: "2026-10-26T08:00:00Z", current: ["built"], questions: [], research: null, open: [], qa: [], event: { name: "branch-cut", at: "2026-10-26T08:00:00Z" }, history: { branch: [{ since: "2026-10-26T07:55:00Z", ended: "2026-10-26T08:00:00Z", endedBy: "branch-cut", to: "implementation" }] },
      steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    const root = path.join(sc, "flight"), dir = path.join(root, ...x.folder.split("/")); docsInto(dir); wr(path.join(dir, "plan.json"), JSON.stringify(x, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]);
    const rq = wr(path.join(sc, "flight-qa.json"), js({ v: 1, action: "plan-board", github: x.repo, issue: x.issue, event: "qa-pass", folder: x.folder, facts: { qa: { pass: 1, verdict: "running" } } }));
    const a = run(APPLY, ["--event", rq, "--worktree", root, "--no-gh", "--no-live", "--at", "2026-10-26T11:30:00Z", "--json"]), S = parse(a);
    const sc0 = lib.readSidecar(path.join(dir, "plan.js"), "plan"), P = sc0.data || {}, pj = JSON.parse(rd(path.join(dir, "plan.json")));
    c.push(["the event writes the sidecar the board polls: plan.js carries plan.json, and the board's own block too", a.status === 0 && js(P) === js(pj) && js(JSON.parse(lib.readBlock(rd(path.join(dir, "dashboard.html")), "plan"))) === js(pj), js([a.status, sc0.error, S.error])]);
    const T = lib.timelineSteps(P, { now: "2026-10-26T11:40:00Z" }), vs = T.visits, impl = vs.find(v => v.step === "implementation"), qa = vs[vs.length - 1];
    c.push(["from the sidecar: the finished visit frozen at the event's time, the running one open from it to now, the figure so far", impl && impl.from && impl.from.t === "2026-10-26T08:00:00Z" && impl.to && impl.to.t === "2026-10-26T11:30:00Z" && qa.step === "qa" && qa.open && qa.from.t === "2026-10-26T11:30:00Z" && qa.ms === 10 * 60000 && lib.timelineTotal(T) === (5 + 210 + 10) * 60000, js(lib.timelineLines(T))]);
    const tr = lib.timelineTracers(T), tqa = tr.find(t => t.tile === "qa"), tb = tr.find(t => t.tile === "built");
    c.push(["…and the KPI tiles' tracers: QA passes open, \"so far\"; As built the branch and implementation", tqa && tqa.open && tqa.ms === 10 * 60000 && tb && tb.ms === 215 * 60000 && !tb.open, js(tr)]);
    const later = lib.timelineSteps(P, { now: "2026-10-26T12:10:00Z" });
    c.push(["the same data read later: the running visit and the figure grow with the clock, nothing else moves", later.visits[later.visits.length - 1].ms === 40 * 60000 && lib.timelineTotal(later) - lib.timelineTotal(T) === 30 * 60000, js(lib.timelineLines(later).slice(-1))]);
    const t = rd(PB);
    c.push(["the template redraws on a newer sidecar (dashboardLive → dashboardRedraw → renderAll: the KPI tiles, the Timeline tile, the tracers on the Timeline tab), never on an older one",
      /function renderAll\(\)\{[^\n]*renderKpis\(\)[^\n]*if\(CUR_TAB==="steps"\) setTimeout\(drawTracers,0\)/.test(t) && /window\.dashboardLive=\(id,data\)=>\{[^\n]*if\(a!=null&&b!=null&&a<b\)\{ liveChip\(\); return; \} dashboardRedraw\(data\);/.test(t), "renderAll · stampOf"]);
    c.push(["the template's tick: while an open-ended visit is drawn, the tiles and the tracers are drawn again every 30 s and when the board is shown again; nothing when none runs",
      /TRACERS=timelineTracers\(TS\); TL_OPEN=TS\.visits\.some\(v=>v\.open\);/.test(t) && /let TL_OPEN=false; const TL_TICK_MS=30000;/.test(t) && /function timelineTick\(\)\{ if\(!TL_OPEN\|\|document\.hidden\) return; renderKpis\(\); localizeTimes\(\); if\(CUR_TAB==="steps"\) drawTracers\(\); \}/.test(t) && /setInterval\(timelineTick,TL_TICK_MS\); document\.addEventListener\("visibilitychange",timelineTick\);/.test(t), "TL_OPEN · timelineTick · setInterval · visibilitychange"]);
    c.push(["the template's Timeline reads \"now\" afresh at each render of a board in flight", /const TS=timelineSteps\(PLAN,LANDED\?null:new Date\(\)\.toISOString\(\)/.test(t), "timelineSteps(PLAN, now)"]);
  });

  /* 6. the rule and the code agree: no Timeline reason left to enrich */
  guard("the fast path owns the Timeline: the ruleset says so, and no enrichment is left for a Timeline input", c => {
    const R = rd(sk("plan/RULES.md")), A = rd(sk("plan/scripts/apply-event.js"));
    c.push(["plan/RULES.md: \"The fast path owns the Timeline\", naming its inputs", /\*\*The fast path owns the Timeline\.\*\*/.test(R) && /ghMergeTime\(\)/.test(R) && /new\.js --at/.test(R), "the paragraph"]);
    c.push(["apply-event.js pushes no Timeline reason to enrich (the merge's time is a warning)", !/enrich\.push\([^)]*merge's time/.test(A) && /WARNINGS\.push\(mt\.warn\)/.test(A), "no enrich.push for the merge's time"]);
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
