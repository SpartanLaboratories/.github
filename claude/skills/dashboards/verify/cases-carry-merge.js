// The cases of the carry merges (the user's decision q-419 a, p79; plan/RULES.md §4, "The carry merges"), run by verify-templates.js (it passes its
// helpers in), or on its own with no browser: node verify/cases-carry-merge.js [--out <dir>]. A landing's view copy carried onto a tracked board (the
// seeding at sized and seed, and reseed) is merged into it, never written over it: the copy wins on what the landing owns (status, wip, asBuilt, impact,
// trail, each Row's asBuilt, the Merged milestone), the tracked board on everything else it changed since the landing (lib.js carryMerge(), on the base the
// landing's merge holds), any other conflict refused with a clear message, the copy kept; the excerpts re-copied from the documents in the tree. With it,
// the seeding order (admin-team/presenter/seeding-order): the copies written deepest first, so a tracking board's embed reads its unit's board seeded and
// keeps unit.landing. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function casesCarryMerge(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the carry merge cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "carry-merge"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EXD = sk("plan/examples/38-handshake-empty-name"), EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  let n = 0;
  const P = d => JSON.parse(rd(path.join(d, "plan.json")));
  const fails = d => run(CHECK, [d], { env }).stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).slice(0, 3).join(" | ");
  const TF = "docs/plans/55-http-client-stack", SF = `${TF}/47-java-23-bytecode`;
  /* a repository whose #47 (a unit of #55) is at its Document step, committed as its merge with its documents; then landed into the view copies */
  const landedRepo = name => {
    const main = path.join(sc, name), tdir = path.join(main, ...TF.split("/")), sdir = path.join(main, ...SF.split("/"));
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const sub = copy(EX); Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: SF, parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
    delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built"); sub.impact = { ...(sub.impact || {}), basis: "as-built" };
    sub.wip = { ...sub.wip, step: "document", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: ["built"], questions: [], research: null, open: [], event: { name: "document", at: "2026-10-26T09:20:00Z" }, steps: STEPS };
    const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
    ["plan.md", "final-implementation.md", "architecture.md", "impact.md"].forEach(f => { if (fs.existsSync(path.join(EXD, f))) wr(path.join(sdir, f), rd(path.join(EXD, f))); });
    if (fs.existsSync(path.join(EXD, "research"))) fs.cpSync(path.join(EXD, "research"), path.join(sdir, "research"), { recursive: true });
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    run(EMBED, [sdir], { env }); run(EMBED, [tdir], { env });
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the merge");
    const M = (git(main, "rev-parse", "HEAD").stdout || "").trim();
    const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: "landed", folder: SF, repo: main, facts: { pr: 90, sha: M, merge: M, date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" } }));
    const l = run(APPLY, ["--event", q, "--worktree", main, "--main", main, "--no-live", "--no-gh", "--at", "2026-10-26T09:30:00Z", "--json", "--view"], { env });
    return { main, tdir, sdir, M, repo: sub.repo, landed: parse(l), vS: path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode"), vT: path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack") };
  };
  /* a docs-only landing after the post-merge view: it edits the tracked boards on master and commits, raising no board event (p79) */
  const docsLanding = (B, edit) => { edit(B); run(EMBED, [B.sdir], { env }); run(EMBED, [B.tdir], { env }); git(B.main, "add", "-A"); git(B.main, "commit", "-q", "-m", "docs: a later landing"); };
  const seed = (B, wt, atT, extra) => { const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: B.repo, event: "seed", facts: {} }));
    const a = run(APPLY, ["--event", q, "--worktree", wt, "--main", B.main, "--no-gh", "--no-live", "--at", atT, "--json", ...(extra || [])], { env }); return { a, S: parse(a) }; };
  const tree = (B, name, branch) => { const wt = path.join(sc, name); fs.rmSync(wt, { recursive: true, force: true }); if (git(B.main, "worktree", "add", "-q", "-b", branch, wt).status !== 0) throw new Error("git worktree add failed"); return wt; };

  guard("carryMerge(): the copy wins on what the landing owns, the tracked board on what it changed since the landing, a part only the copy changed is the copy's", c => {
    const base = copy(EX); base.status = "building"; base.followUps = [{ issue: 52, note: "base" }];
    const tracked = copy(base); tracked.function = "Verification case: a docs landing reworded the function."; tracked.rows[0].system = "webtools-docs";
    tracked.milestones = tracked.milestones.map(m => m.column === "gap" ? { ...m, note: "Verification case: the tracked board's own note." } : m).filter(m => m.column !== "built");
    tracked.trail = [...tracked.trail, { date: "2026-10-27", column: "built", label: "Verification case: the tracked board's own trail entry" }];
    const cpy = copy(base); cpy.status = "built"; cpy.asBuilt = { ...cpy.asBuilt, merge: "abcdef1" }; cpy.wip = { ...cpy.wip, step: "landed", detail: "Landed." };
    cpy.impact = { ...(cpy.impact || {}), basis: "as-built" }; cpy.rows[0].asBuilt = { ...cpy.rows[0].asBuilt, summary: "Verification case: the landing's summary." };
    cpy.followUps = [{ issue: 52, note: "Verification case: the post-merge fill's follow-up." }];
    cpy.milestones = [...cpy.milestones.filter(m => m.column !== "built"), { column: "built", label: "Merged", date: "2026-10-26", note: "merged as abcdef1" }];
    cpy.rows[0].unit = { issue: 9, live: { step: "plan" }, landing: { pr: 1, merge: "abcdef1" } };
    const R = lib.carryMerge(cpy, tracked, base), p = R.plan || {};
    c.push(["no conflict, a merged board", R.plan && !R.conflicts.length, js(R.conflicts)]);
    c.push(["owned: status, wip, asBuilt, impact and the trail are the copy's (the tracked board's own trail entry with them)", p.status === "built" && js(p.wip) === js(cpy.wip) && js(p.asBuilt) === js(cpy.asBuilt) && js(p.impact) === js(cpy.impact) && js(p.trail) === js(cpy.trail), js([p.status, p.wip && p.wip.step, (p.trail || []).length])]);
    c.push(["owned: each Row's asBuilt is the copy's", js(p.rows[0].asBuilt) === js(cpy.rows[0].asBuilt), js(p.rows[0].asBuilt).slice(0, 200)]);
    c.push(["owned: the Merged milestone is the copy's; the tracked board's own change to another milestone kept", (p.milestones || []).some(m => m.column === "built" && m.note === "merged as abcdef1") && (p.milestones || []).some(m => m.column === "gap" && /own note/.test(m.note)), js(p.milestones)]);
    c.push(["not owned, changed by the tracked board since the landing: the tracked board's (the function, a Row's system), and named as kept", p.function === tracked.function && p.rows[0].system === "webtools-docs" && R.kept.includes("function") && R.kept.some(k => /^rows\.[^.]+\.system$/.test(k)), js([p.function, p.rows[0].system, R.kept])]);
    c.push(["not owned, changed by the copy alone: the copy's (the post-merge fill's follow-up)", js(p.followUps) === js(cpy.followUps), js(p.followUps)]);
    c.push(["a unit's mirror and landing are the embed's: neither side's is kept", !(p.rows[0].unit || {}).live && !(p.rows[0].unit || {}).landing, js(p.rows[0].unit)]);
    const both = copy(cpy); both.function = "Verification case: the copy's own function.";
    const R2 = lib.carryMerge(both, tracked, base);
    c.push(["a part both changed, not owned: the tracked board's", R2.plan && R2.plan.function === tracked.function && R2.kept.includes("function"), js([R2.plan && R2.plan.function, R2.kept])]);
    const R3 = lib.carryMerge(cpy, tracked, null);
    c.push(["with no base: the tracked board wins on every part not owned (the follow-ups too); the owned parts the copy's", R3.plan && js(R3.plan.followUps) === js(tracked.followUps) && R3.plan.status === "built" && R3.plan.function === tracked.function, js([R3.plan && R3.plan.followUps])]);
    const tf = copy(TRK), cf = copy(TRK); tf.rows.forEach(r => { r.unit.issue = null; }); const R5 = lib.carryMerge(cf, tf, null);
    c.push(["with no base, a part the tracked board holds nothing for is the copy's (its units' issues, filed on the copy)", R5.plan && R5.plan.rows.every((r, i) => r.unit.issue === cf.rows[i].unit.issue), js(R5.plan && R5.plan.rows.map(r => r.unit.issue))]);
    const R4 = lib.carryMerge(copy(base), copy(base), copy(base));
    c.push(["a tracked board as the landing left it and an unchanged copy: the same board, nothing kept", R4.plan && js(R4.plan) === js(Object.assign(copy(base), { rows: base.rows.map(r => { const x = copy(r); if (x.unit) { delete x.unit.live; delete x.unit.landing; } return x; }) })) && !R4.kept.length, js(R4.kept)]);
  });

  guard("carryMerge(): any other conflict is refused, with a clear message", c => {
    const base = copy(EX), cpy = copy(EX), tracked = copy(EX);
    const gone = tracked.rows.splice(1, 1)[0];
    const R = lib.carryMerge(cpy, tracked, base);
    c.push(["a Row whose as-built state the copy holds, removed from the tracked board since the landing: refused, naming the Row", !R.plan && R.conflicts.some(t => t.includes(`Row ${gone.id}`) && /has removed it since the landing/.test(t)), js(R.conflicts)]);
    const R1 = lib.carryMerge(cpy, tracked, null);
    c.push(["…with no base to tell: refused too", !R1.plan && R1.conflicts.some(t => t.includes(`Row ${gone.id}`) && /does not have it/.test(t)), js(R1.conflicts)]);
    const added = copy(EX); added.rows.push({ ...copy(EX.rows[0]), id: "verification-added", asBuilt: { state: "pending" } });
    const R2 = lib.carryMerge(copy(EX), added, copy(EX));
    c.push(["a Row the tracked board added to a board the landing built: refused, no landing gave it an as-built state", !R2.plan && R2.conflicts.some(t => /Row verification-added was added to the tracked board after #38 landed/.test(t)), js(R2.conflicts)]);
    const other = copy(EX); other.issue = 39;
    const R3 = lib.carryMerge(other, copy(EX), copy(EX));
    c.push(["two different boards: refused", !R3.plan && R3.conflicts.some(t => /#39's issue board/.test(t) && /#38's issue board/.test(t)), js(R3.conflicts)]);
    const ta = copy(TRK), tb = copy(TRK), tc = copy(TRK); tc.rows.push({ ...copy(TRK.rows[2]), id: "verification-unit", unit: { n: 12, slug: "verification-unit", issue: 71 } });
    const R4 = lib.carryMerge(tb, tc, ta);
    c.push(["a unit Row the tracked board added to a tracking board still building: kept, no conflict", R4.plan && R4.plan.rows.some(r => r.id === "verification-unit"), js(R4.conflicts)]);
  });

  guard("the seeding merges: a docs landing after the post-merge view keeps its changes; the landing's state is carried; the excerpts re-copied; unit.landing kept (the seeding order)", c => {
    const B = landedRepo("cm-drift");
    c.push(["the landing is in the view copies, built at its merge", B.landed.result === "ok" && P(B.vS).status === "built" && fs.existsSync(path.join(B.vT, "plan.json")), js([B.landed.result, B.landed.error, B.landed.check])]);
    const FN = "Verification case: the function as a docs landing reworded it after the post-merge view.", SYS = "webtools-docs";
    const fi = path.join(B.sdir, "final-implementation.md"), was = rd(fi);
    const codeHead = was.match(/^#+\s*Code\s*$/m);
    docsLanding(B, b => {
      const s = P(b.sdir); s.function = FN; wr(path.join(b.sdir, "plan.json"), JSON.stringify(s, null, 2) + "\n");
      const t = P(b.tdir); t.rows.find(r => r.id === "http-core").system = SYS; wr(path.join(b.tdir, "plan.json"), JSON.stringify(t, null, 2) + "\n");
      if (codeHead) wr(fi, was.replace(/^(#+\s*Code\s*\r?\n\r?\n)[^\r\n]+/m, "$1Verification case: the section as a docs landing reworded it."));
    });
    c.push(["the docs landing left the copies behind it: the copy still holds the old function and system", P(B.vS).function !== FN && P(B.vT).rows.find(r => r.id === "http-core").system !== SYS, "the view copies"]);
    const wt = tree(B, "cm-drift-tree", "feat/issue-62");
    const s = seed(B, wt, "2026-10-27T10:00:00Z"), wS = path.join(wt, ...SF.split("/")), wT = path.join(wt, ...TF.split("/")), ps = P(wS), pt = P(wT);
    c.push(["both seeded", s.a.status === 0 && s.S.result === "ok" && (s.S.seeded || []).some(x => /47-java-23-bytecode/.test(x)) && (s.S.seeded || []).includes(TF), js([s.a.status, s.S.result, s.S.seeded, s.S.error, s.S.check])]);
    c.push(["the landing's state carried: #47 built at its merge, its unit landed on #55", ps.status === "built" && (ps.asBuilt || {}).merge === B.M && ((pt.rows.find(r => r.id === "java-floor") || {}).asBuilt || {}).state === "landed", js([ps.status, ps.asBuilt, pt.rows.find(r => r.id === "java-floor").asBuilt])]);
    c.push(["the docs landing's changes kept: #47's function, #55's unit system", ps.function === FN && pt.rows.find(r => r.id === "http-core").system === SYS, js([ps.function, pt.rows.find(r => r.id === "http-core").system])]);
    c.push(["…and named in the summary as kept", (s.S.applied || []).some(x => /^seeded 55-http-client-stack\/47-java-23-bytecode: the tracked board's own changes since the landing kept \(.*function/.test(x)) && (s.S.applied || []).some(x => /^seeded 55-http-client-stack: the tracked board's own changes since the landing kept \(.*system/.test(x)), js(s.S.applied)]);
    const st = (ps.rows || []).flatMap(r => ((r.asBuilt || {}).statements || [])).find(x => x && x.ref === "final-implementation.md#code");
    c.push(["the excerpts re-copied from the documents in the tree: the as-built statement on final-implementation.md#code reads the section as the docs landing left it", !codeHead || (st && st.excerpt && /reworded it/.test(st.excerpt.paragraph)), js(st && st.excerpt)]);
    const L = (pt.rows.find(r => r.id === "java-floor").unit || {}).landing;
    c.push(["the seeding order: #55's unit row for #47 carries its landing (unit.landing), read from #47's board seeded first", L && L.pr === 90 && String(L.merge || "").startsWith(B.M.slice(0, 7)), js(L)]);
    c.push(["…check.js passes on both, with no unit landing warning", run(CHECK, [wS], { env }).status === 0 && run(CHECK, [wT], { env }).status === 0 && !/unit\.landing/.test(run(CHECK, [wT], { env }).stdout.split(/\r?\n/).filter(l => /^warn/.test(l)).join(" ")), fails(wT) || fails(wS)]);
    const b4 = rd(path.join(wS, "plan.json")) + rd(path.join(wT, "plan.json")), s2 = seed(B, wt, "2026-10-27T10:05:00Z");
    c.push(["raised again: nothing fresher, nothing written", s2.a.status === 0 && s2.S.result === "nothing" && rd(path.join(wS, "plan.json")) + rd(path.join(wT, "plan.json")) === b4, js([s2.S.result, s2.S.applied])]);
  });

  guard("the seeding refuses a conflict: neither copy of the landing carried, both kept, the tracked boards as they were, the event not failed", c => {
    const B = landedRepo("cm-conflict"), gone = P(B.sdir).rows[1].id;
    docsLanding(B, b => { const s = P(b.sdir); s.rows = s.rows.filter(r => r.id !== gone); wr(path.join(b.sdir, "plan.json"), JSON.stringify(s, null, 2) + "\n"); });
    const wt = tree(B, "cm-conflict-tree", "feat/issue-62"), wS = path.join(wt, ...SF.split("/")), wT = path.join(wt, ...TF.split("/")), b4 = rd(path.join(wS, "plan.json")) + rd(path.join(wT, "plan.json"));
    const s = seed(B, wt, "2026-10-27T10:00:00Z");
    c.push(["the event goes on (exit 0), nothing seeded", s.a.status === 0 && s.S.result === "nothing" && !(s.S.seeded || []).length, js([s.a.status, s.S.result, s.S.seeded, s.S.error])]);
    c.push(["the sub-issue's copy refused, naming the Row; the tracking board's copy held with it", (s.S.applied || []).some(x => x.startsWith("not seeded: 55-http-client-stack/47-java-23-bytecode (the carry's merge refuses it:") && x.includes(`Row ${gone}`)) && (s.S.applied || []).some(x => /^not seeded: 55-http-client-stack \(the copy of 55-http-client-stack\/47-java-23-bytecode, which stands for the same landing, is refused\)/.test(x)), js(s.S.applied)]);
    c.push(["…a VIEW COPY CONFLICT warning for each", (s.S.warnings || []).filter(w => /^VIEW COPY CONFLICT: /.test(w)).length === 2, js(s.S.warnings)]);
    c.push(["…the tracked boards as they were, the copies kept", rd(path.join(wS, "plan.json")) + rd(path.join(wT, "plan.json")) === b4 && fs.existsSync(path.join(B.vS, "plan.json")) && fs.existsSync(path.join(B.vT, "plan.json")), "the tracked boards and the copies"]);
  });

  guard("lib.js writeBlock(): the data block takes the page's line endings at its boundaries and inside (hook-317)", c => {
    const crlf = "a\r\n<script type=\"application/json\" id=\"plan\">\n{}\n</script>\r\nz\r\n", lf = crlf.replace(/\r/g, "");
    const A = lib.writeBlock(crlf, "plan", "{\n  \"a\": 1\n}\n"), Bv = lib.writeBlock(lf, "plan", "{\r\n  \"a\": 1\r\n}\r\n");
    c.push(["a CRLF page: every line CRLF, no LF alone", !/[^\r]\n/.test(A) && A.includes("<script type=\"application/json\" id=\"plan\">\r\n{\r\n  \"a\": 1\r\n}\r\n</script>"), JSON.stringify(A)]);
    c.push(["an LF page: every line LF, no CR", !/\r/.test(Bv) && Bv.includes("<script type=\"application/json\" id=\"plan\">\n{\n  \"a\": 1\n}\n</script>"), JSON.stringify(Bv)]);
    c.push(["the data reads the same", js(JSON.parse(lib.readBlock(A, "plan"))) === js({ a: 1 }) && js(JSON.parse(lib.readBlock(Bv, "plan"))) === js({ a: 1 }), "readBlock"]);
  });
  return groups;
};

if (require.main === module) {
  /* a private scratch of its own (verify/scratch.js): out/, the temp root and the stand-in team state, removed at exit unless kept */
  const SCR = require("./scratch.js").open("cases-carry-merge");
  process.env.DASHBOARDS_VERIFY = "1"; process.env.DASHBOARDS_PRIVATES = process.env.DASHBOARDS_PRIVATES || path.join(__dirname, "fixtures", "private-repositories.json");
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : SCR.out);
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
