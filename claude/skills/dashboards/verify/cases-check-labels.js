// The cases of dashboards-skill/52 (the user's decision of 2026-11-06), run by verify-templates.js (it passes its helpers in), or on its
// own with no browser: node verify/cases-check-labels.js [--out <dir>].
// A Quality Review's checks are labelled by the check: "documentation check", "code check", "test check" (the documentation check read
// "documentation review" before; the other two already read so). None of the labels was an agent's name: the note files are named by
// their agents, the labels never were.
// 1. The labels: passnames.js NOTE_WORK, and the issue-board template's names block NOTE_WORK and noteLabel() (a tracking board labels
//    each unit's notes with the same), none naming an agent.
// 2. namerefs.js scrubNames() writes the same words for the agents that run the checks.
// 3. The older label as the scripts wrote it ("the documentation review pass", lowercase) reworded by every rewrite (renamePassText(),
//    renamePasses(), renamePassesIn() as board.js runs it) and found by passRefs() (check.js BOARD WORDING in flight); the Document step's
//    task "Documentation review", "reviewed", "reviewer", an id, code and an issue's title left as written.
// 4. apply-event.js: a qa-pass fact naming the agents written with the labels; a Document step's task keeps its name; check.js fails a
//    board in flight that holds the older label, embed.js rewords it, a landed board is only warned on.
// 5. The feature probe (check-labels): found on the template, missed on one labelled before it, for its types only.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesCheckLabels(X) {
  const { sk, out, targets } = X;
  const PN = require(sk("plan/scripts/passnames.js")), lib = require(sk("plan/scripts/lib.js")), LR = require(sk("system/scripts/levelrefs.js"));
  const N = require(sk("system/scripts/namerefs.js")), F = require(sk("system/scripts/features.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const PB = rd(tp("plan/template/dashboard.html"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "check-labels"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const LABELS = { "documentation-reviewer": "documentation check", "code-reviewer": "code check", "test-inspector": "test check" };

  guard("the labels: passnames.js NOTE_WORK and the template's noteLabel(), none naming an agent", c => {
    const got = Object.keys(LABELS).map(k => [k, PN.NOTE_WORK[k]]);
    c.push(["passnames.js NOTE_WORK: \"documentation check\", \"code check\", \"test check\"", got.every(([k, v]) => v === LABELS[k]), js(got)]);
    const nw = /const NOTE_WORK=[^\n]*\n/.exec(PB), nl = /const noteLabel=[^\n]*\n/.exec(PB);
    const label = nw && nl && vm.runInNewContext(`${nw[0]}${nl[0]};noteLabel`, { PASS_NAME: PN.PASS_NAME });
    const each = label ? Object.entries(PN.NOTE_WORK).flatMap(([k, v]) => [[k, label(k), v], [k + "-a-slug", label(k + "-a-slug"), v + " · a-slug"]]) : [];
    c.push(["the template's noteLabel() reads every name of passnames.js NOTE_WORK, plain and slugged, as passnames.js labels it", !!label && each.every(([, g, w]) => g === w), js(each.filter(([, g, w]) => g !== w))]);
    const probes = [["documentation-reviewer", "documentation check"], ["code-reviewer", "code check"], ["test-inspector", "test check"], ["documentation-reviewer-2", "documentation check · 2"], ["qa", "Quality Review"]];
    const lg = label ? probes.map(([n, w]) => [n, label(n), w]) : [];
    c.push(["noteLabel(): each check's note by its label (a slugged one too), the pass's own by its name", !!label && lg.every(([, g, w]) => g === w), js(lg)]);
    const named = Object.values(PN.NOTE_WORK).filter(v => N.nameRefs(v).length);
    c.push(["no label names an agent, a session or a role (nomenclature/internal-names.md)", !named.length, js(named)]);
    const older = Object.keys(LABELS).map(k => PN.NOTE_WORK[k]).filter(v => /\b(?:review|inspection)\b/i.test(v));
    c.push(["no check's label reads \"review\" or \"inspection\" (the pass itself is \"Quality Review\")", !older.length, js(older)]);
  });

  guard("namerefs.js scrubNames(): the agents that run the checks written as the labels", c => {
    const want = [["the documentation-reviewer pass", "the documentation check pass"], ["The documentation-reviewer pass found 3 KDoc gaps; the test-inspector report is clean.", "The documentation check pass found 3 KDoc gaps; the test check report is clean."],
      ["a code-reviewer pass and a documentation-reviewer pass", "a code check pass and a documentation check pass"], ["Relevant is what qa's test-inspector ran", "Relevant is what the review's test check ran"]];
    const bad = want.map(([s, w]) => [s, N.scrubNames(s), w]).filter(([, r, w]) => r.text !== w || r.left.length);
    c.push(["each reworded to the labels, naming nothing left", !bad.length, js(bad)]);
    const again = want.filter(([, w]) => PN.renamePassText(w) !== w || PN.passRefs(w).length);
    c.push(["…and with no older wording for a rewrite to catch", !again.length, js(again)]);
  });

  guard("the older label: reworded by every rewrite, found in flight; the Document step's task and other words left as written", c => {
    const want = [["the documentation review pass", "the documentation check pass"], ["Quality Review 1: the documentation review found 3 gaps.", "Quality Review 1: the documentation check found 3 gaps."],
      ["documentation review and code check clean", "documentation check and code check clean"], ["two documentation reviews", "two documentation checks"]];
    const bad = want.filter(([a, b]) => PN.renamePassText(a) !== b);
    c.push(["renamePassText(): \"documentation review\" → \"documentation check\"", !bad.length, js(bad.map(([a, b]) => [a, PN.renamePassText(a), b]))]);
    const found = want.filter(([a]) => !PN.passRefs(a).length).map(x => x[0]), clean = want.filter(([, b]) => PN.passRefs(b).length).map(x => [x[1], PN.passRefs(x[1])]);
    c.push(["passRefs() finds each (check.js BOARD WORDING on a board in flight), and none in the new", !found.length && !clean.length, js([found, clean])]);
    const keepAs = ["Documentation review", "Document: 1 of 7 tasks done; Documentation review current.", "Document: Documentation review, Dokka check in parallel",
      "the documentation reviewed and reconciled", "a documentation reviewer", "documentation-review", "`documentation review`", "a code review on the pull request"];
    const moved = keepAs.filter(s => PN.renamePassText(s) !== s || PN.passRefs(s).length);
    c.push(["the Document step's task \"Documentation review\", \"reviewed\", \"reviewer\", an id, code and other words left as written", !moved.length, js(moved.map(s => [s, PN.renamePassText(s)]))]);
    const plan = { schema: "plan-board/1", issueTitle: "Fix the documentation review pass", wip: { step: "document", detail: "Document: the documentation review pass is clean.", qa: [{ pass: 1, verdict: "approved" }],
      document: { tasks: [{ id: "documentation-review", name: "Documentation review", state: "current" }] } }, trail: [{ label: "Quality Review 1: approved; the documentation review pass clean" }] };
    const p = copy(plan), lines = PN.renamePasses(p), again = PN.renamePasses(p);
    c.push(["renamePasses(): a board's detail and trail entry reworded in place, the task's name and the issue title it quotes left alone, a second run changing nothing",
      lines.length === 1 && !again.length && p.wip.detail === "Document: the documentation check pass is clean." && p.trail[0].label === "Quality Review 1: approved; the documentation check pass clean" && p.wip.document.tasks[0].name === "Documentation review" && p.issueTitle === plan.issueTitle,
      js([lines, p.wip.detail, p.trail[0].label, p.wip.document.tasks[0].name, p.issueTitle])]);
    const board = { rows: [{ issue: 7, title: "a title", detail: "Quality Review 2: approved; the documentation review pass clean.", qa: [] }] };
    const ch = PN.renamePassesIn(board, LR.titleSkip(board));
    c.push(["renamePassesIn(), as board.js runs it on board.json: a row's detail reworded", ch.length === 1 && board.rows[0].detail === "Quality Review 2: approved; the documentation check pass clean.", js([ch, board.rows[0].detail])]);
  });

  /* a board in flight at implementation, from the example */
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: "2026-10-26T08:00:00Z", current: ["built"], questions: [], research: null, open: [], qa: [], remediation: null, history: {}, waitingOn: null, resume: null, event: { name: "branch-cut", at: "2026-10-26T08:00:00Z" },
      stages: [{ id: "S1", name: "the parse", state: "done", rows: [] }, { id: "S2", name: "the routing", state: "current", rows: [] }], steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    x.trail = (x.trail || []).filter(t => t && t.column !== "built"); return x; };
  const place = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/")); fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(`${EXD}/${f}`), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), lib.writeBlock(PB, "plan", JSON.stringify(plan, null, 2) + "\n")); return { root, dir, folder: plan.folder }; };
  const tree = (name, plan) => { const T = place(name, plan), e = run(EMBED, [T.dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return T; };
  let nreq = 0;
  const evIn = T => (name, at, facts) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--at", at, "--json"]); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { S = { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } return { a, S, p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const old = p => PN.passRefsIn(p, "", [], LR.titleSkip(p));
  const bw = s => (s.split(/\r?\n/).filter(l => /BOARD WORDING/.test(l)).join(" | ") || "no line").slice(0, 240);

  guard("apply-event.js and check.js: the labels written, the older one failed in flight, reworded by a rewrite, warned on when landed", c => {
    const T = tree("fast", building()), ev = evIn(T);
    ev("implementation-stage", "2026-10-26T09:00:00Z", { stages: [{ id: "S2", state: "done" }] });
    ev("qa-pass", "2026-10-26T10:00:00Z", { qa: { pass: 1, verdict: "running" } });
    const q = ev("qa-pass", "2026-10-26T11:00:00Z", { qa: { pass: 1, verdict: "approved" }, detail: "The documentation-reviewer pass found no gaps; the code-reviewer and the test-inspector report are clean." });
    c.push(["a qa-pass fact naming the agents is written with the labels", q.a.status === 0 && q.p.wip.detail === "The documentation check pass found no gaps; the code check and the test check report are clean.", js([q.S.error, q.p.wip.detail])]);
    const d = ev("document", "2026-10-27T09:00:00Z", { tasks: [{ id: "documentation-review", state: "current" }] });
    const t = ((d.p.wip.document || {}).tasks || []).find(x => x && x.id === "documentation-review") || {};
    c.push(["the Document step's task keeps its name, \"Documentation review\"", d.a.status === 0 && t.name === "Documentation review" && /Documentation review current/.test(d.p.wip.detail || ""), js([d.S.error, t, d.p.wip.detail])]);
    const ck = run(CHECK, [T.dir]);
    c.push(["the board holds no older wording, and check.js finds none (no BOARD WORDING)", !old(d.p).length && !/BOARD WORDING/.test(ck.stdout + ck.stderr), js(old(d.p))]);

    const b = building(); b.wip.step = "qa"; b.wip.qa = [{ pass: 1, verdict: "running", date: "2026-10-26" }]; b.wip.detail = "Quality Review 1: the documentation review pass is running.";
    b.trail.push({ date: "2026-10-26", column: "built", label: "Quality Review 1: the documentation review pass started" });
    const I = place("check", b), c1 = run(CHECK, [I.dir]);
    c.push(["a board in flight holding the older label fails BOARD WORDING, naming where", c1.status !== 0 && /^FAIL.*BOARD WORDING: plan\.json holds an older wording: .*wip\.detail \("documentation review"\)/m.test(c1.stdout), bw(c1.stdout)]);
    const e = run(EMBED, [I.dir]), p = JSON.parse(rd(path.join(I.dir, "plan.json"))), c2 = run(CHECK, [I.dir]);
    c.push(["embed.js rewords it, and the board passes on that count", e.status === 0 && p.wip.detail === "Quality Review 1: the documentation check pass is running." && p.trail.slice(-1)[0].label === "Quality Review 1: the documentation check pass started" && !/BOARD WORDING/.test(c2.stdout), js([e.status, p.wip.detail, p.trail.slice(-1)[0].label, bw(c2.stdout)])]);
    const L = copy(EX); L.trail = [...(L.trail || []), { date: "2026-10-27", column: "built", label: "Quality Review 1: the documentation review pass clean" }];
    const D = place("landed", L), c3 = run(CHECK, [D.dir]);
    c.push(["a landed board holding it is warned on, kept as it landed", !/^FAIL.*BOARD WORDING/m.test(c3.stdout) && /^warn\s+BOARD WORDING: .*kept as it landed/m.test(c3.stdout), bw(c3.stdout)]);
  });

  guard("the feature probe (check-labels): found on the template, missed on one labelled before it, for its types only", c => {
    const miss = (h, k) => F.probe(h, k).find(m => m.id === "check-labels");
    c.push(["the issue-board template has it", !miss(PB, "plan-board"), js(F.probe(PB, "plan-board").map(F.line))]);
    const before = PB.replace('["documentation-rev","documentation check"]', '["documentation-rev","documentation review"]'), m = miss(before, "plan-board");
    c.push(["missed on a template that labels the documentation check \"documentation review\" (FEATURE MISSING, since dashboards-skill/52)", before !== PB && !!m && /dashboards-skill\/52/.test(F.line(m)), m ? F.line(m) : "not missed"]);
    const f = F.FEATURES.find(x => x.id === "check-labels") || {};
    c.push(["it applies to issue and tracking boards only; the repository work board and the state boards each with its reason", js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f.notFor && f.notFor[k] && F.applicable(k).every(x => x.id !== "check-labels")) && f.since === 52, js([f.types, f.notFor, f.since])]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  /* on its own, the templates count as under test, as verify-templates.js counts them (deviation.js verified()) */
  if (!process.env.DASHBOARDS_TEMPLATES_UNDER_TEST) { const { sha } = require(sk("system/scripts/deviation.js")); process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify(["plan/template/dashboard.html", "plan/template/board.html"].map(f => sha(fs.readFileSync(sk(f), "utf8")))); }
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length; console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
