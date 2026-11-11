// The cases of admin-team/dashboards/built-milestone-fast-path, run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-built-milestone.js [--out <dir>]. The built milestone moved onto the fast path (plan/RULES.md §4, the landed row and "More onto
// the fast path"): apply-event.js writes it at landed from the landing's record alone, "Merged", its pull request as the ref, "merged as <sha>",
// dated by the merge's time (UTC), else by asBuilt.date; once, so the same event raised again changes nothing and a built milestone already on the
// board (a release's) is kept; and no milestone without a merge sha. The tracking board's own landing at its last unit takes it the same way
// (verify/cases-unit-landed.js holds that case beside the rest of the last unit's landing).
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesBuiltMilestone(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the built-milestone cases (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, ...(o || {}) });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "built-milestone"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json")));
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const F = "docs/plans/38-handshake-empty-name";
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const P = d => JSON.parse(rd(path.join(d, "plan.json")));
  let n = 0;
  /* a repository whose issue board #38 is at its merge, every part resolved, with no built milestone (or with `keep`, a release's), committed as its merge */
  const repo = (name, keep) => {
    const main = path.join(sc, name), dir = path.join(main, ...F.split("/"));
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const s = copy(EX); delete s.issueBoards; s.parent = null;
    Object.assign(s, { status: "building", asBuilt: { ref: "master", sha: s.baseline.sha, date: s.baseline.date } });
    s.milestones = s.milestones.filter(m => m.column !== "built").concat(keep ? [keep] : []);
    s.wip = { ...s.wip, step: "merge", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: [], questions: [], research: null, open: [], event: { name: "merge", at: "2026-10-26T09:20:00Z" }, steps: STEPS };
    wr(path.join(dir, "plan.json"), JSON.stringify(s, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB));
    run(EMBED, [dir], { env });
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the merge");
    return { main, dir, M: (git(main, "rev-parse", "HEAD").stdout || "").trim(), view: path.join(main, "docs", "plans", ".live", "view", "38-handshake-empty-name") };
  };
  const landed = (B, facts, atT) => { const q = wr(path.join(sc, `rq-${++n}.json`), js({ v: 1, action: "plan-board", github: EX.repo, issue: 38, event: "landed", folder: F, facts }));
    const a = run(APPLY, ["--event", q, "--worktree", B.main, "--main", B.main, "--no-gh", "--at", atT, "--json", "--view"], { env }); return { a, S: parse(a) }; };
  const built = d => (P(d).milestones || []).filter(m => m && m.column === "built");
  const fails = d => run(CHECK, [d, "--root", path.dirname(path.dirname(path.dirname(path.dirname(d))))], { env }).stdout.split(/\r?\n/).filter(l => /^(FAIL|warn)/.test(l));

  guard("landed writes the built milestone on the fast path, once", c => {
    const B = repo("bm-issue");
    const r = landed(B, { merge: B.M, pr: 97, mergedAt: "2026-10-26T23:30:00Z" }, "2026-10-27T00:05:00Z"), ms = built(B.view);
    c.push(["landed: the board built, one built milestone", r.a.status === 0 && r.S.result === "ok" && P(B.view).status === "built" && ms.length === 1, js([r.S.result, r.S.error, r.S.check, ms])]);
    c.push(["…\"Merged\", the pull request its ref, \"merged as <sha>\" its note, dated by the merge's UTC time", ms.length === 1 && ms[0].label === "Merged" && ms[0].ref === "PR #97" && ms[0].note === `merged as ${B.M.slice(0, 7)}` && ms[0].date === "2026-10-26", js(ms)]);
    c.push(["…the summary names it", (r.S.applied || []).some(x => /^the built milestone: merged as [0-9a-f]{7}$/.test(x)), js(r.S.applied)]);
    c.push(["…check.js no longer warns that a built plan lacks it", !fails(B.view).some(l => /usually carries a "built" milestone/.test(l)), js(fails(B.view))]);
    const r2 = landed(B, { merge: B.M, pr: 97, mergedAt: "2026-10-26T23:30:00Z" }, "2026-10-27T00:05:00Z");
    c.push(["raised again: a duplicate, still one built milestone", r2.a.status === 0 && r2.S.result === "duplicate" && built(B.view).length === 1, js([r2.S.result, r2.S.error, built(B.view)])]);
  });

  guard("a built milestone already on the board is kept; no merge sha, no milestone", c => {
    const rel = { column: "built", label: "Released", date: "2026-10-25", note: "the release" };
    const B = repo("bm-keep", rel);
    const r = landed(B, { merge: B.M, pr: 97, mergedAt: "2026-10-26T10:00:00Z" }, "2026-10-26T10:05:00Z"), ms = built(B.view);
    c.push(["landed keeps the board's own built milestone and adds none", r.a.status === 0 && r.S.result === "ok" && ms.length === 1 && ms[0].label === "Released", js([r.S.result, r.S.error, ms])]);
    const C = repo("bm-nosha");
    const r2 = landed(C, { pr: 97 }, "2026-10-26T10:05:00Z"), dir2 = fs.existsSync(path.join(C.view, "plan.json")) ? C.view : C.dir;
    c.push(["landed with no merge sha writes no built milestone", r2.a.status === 0 && built(dir2).length === 0, js([r2.S.result, r2.S.error, built(dir2)])]);
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
