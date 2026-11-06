// The cases of "a qa pass is named Quality Review N" (plan/scripts/passnames.js; 2026-11-05, dated dashboards-skill/40 in the feature probes), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-quality-review.js [--out <dir>].
// The name comes from the scripts and the template, never from free text: the fast path names every pass it composes "Quality Review N" and rewords
// every fact text it writes; every rewrite of a board (embed.js, apply-event.js, fill.js) rewords what the board already holds; board.js rewords
// the repository work board; check.js fails a board not landed (and the work board) that still says "qa pass N", and only warns on a landed one.
// The data keys and identifiers (qa, pass, facts.qa, the qa-pass event), the issue titles quoted verbatim, code in backticks, the qa pass named
// without a number and the ordinal pills are left as they are. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesQualityReview(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8" });
  const PN = require(sk("plan/scripts/passnames.js")), lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js"), FILL = sk("plan/scripts/fill.js"), BOARD = sk("plan/scripts/board.js");
  const PB = tp("plan/template/dashboard.html");
  const sc = path.join(out, "quality-review"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EX = J("plan/examples/38-handshake-empty-name/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  guard("passnames.js: a qa pass named \"Quality Review N\", the older wording reworded, the rest left as written", c => {
    const want = [["qa pass 1's fixes", "Quality Review 1's fixes"], ["Remediation for qa pass 1", "Correction"], ["qa pass 2 fixes", "Quality Review 2 fixes"],
      ["QA pass 2 approved; the Document step follows.", "Quality Review 2 approved; the Document step follows."], ["after qa pass #3", "after Quality Review 3"],
      ["qa passes 1 and 2 found it", "Quality Reviews 1 and 2 found it"], ["the 2nd qa pass found it", "Quality Review 2 found it"], ["qa pass 1, 3 findings", "Quality Review 1, 3 findings"]];
    const bad = want.filter(([a, b]) => PN.renamePassText(a) !== b || PN.passRefs(a).length !== 1 || PN.passRefs(b).length);
    c.push(["each older form reads \"Quality Review N\", and the reworded text names no older form", !bad.length, js(bad.map(([a, b]) => [a, PN.renamePassText(a), b]))]);
    const keep = ["the `qa pass 1` field", "<code>qa pass 2</code>", "the qa-pass event", "1st pass · approved", "qa · 2nd pass", "pass 2 passed"];
    const moved = keep.filter(s => PN.renamePassText(s) !== s || PN.passRefs(s).length);
    c.push(["code and the event's id are left as written (the qa pass with no number reads \"review\" since dashboards-skill/41: verify/cases-board-wording.js)", !moved.length, js(moved)]);
    c.push(["passName(), passNames(): the one name", PN.passName(2) === "Quality Review 2" && PN.passNames([1, 2]) === "Quality Reviews 1, 2" && PN.passNames([3]) === "Quality Review 3" && PN.PASS_NAME === "Quality Review", PN.passNames([1, 2])]);
    const plan = { schema: "plan-board/1", issueTitle: "Fix qa pass 2 crash", $comment: "qa pass 1", wip: { step: "qa", detail: "QA pass 1 running.", qa: [{ pass: 1, verdict: "running" }], event: { name: "qa-pass" }, history: { qa: [{ endedBy: "qa-pass", detail: "qa pass 1 fixes" }] } },
      trail: [{ label: "QA pass 1: changes requested" }], rows: [{ id: "a", unit: { title: "qa pass 3 title" }, asBuilt: { summary: "fixed after qa pass 1" } }] };
    const p = copy(plan), lines = PN.renamePasses(p), again = PN.renamePasses(p);
    c.push(["renamePasses(): every string of a board reworded, in place, one line saying so; a second run changes nothing",
      lines.length === 1 && !again.length && p.wip.detail === "Quality Review 1 running." && p.wip.history.qa[0].detail === "Quality Review 1 fixes" && p.trail[0].label === "Quality Review 1: changes requested" && p.rows[0].asBuilt.summary === "fixed after Quality Review 1", js([lines, again])]);
    c.push(["…its keys and identifiers, its $comment and the issue titles it quotes left alone", p.wip.event.name === "qa-pass" && p.wip.history.qa[0].endedBy === "qa-pass" && p.wip.step === "qa" && p.$comment === "qa pass 1" && p.issueTitle === "Fix qa pass 2 crash" && p.rows[0].unit.title === "qa pass 3 title", js([p.issueTitle, p.rows[0].unit.title])]);
    c.push(["passRefsIn() with the board's titles skipped finds what is left, and nothing once reworded", PN.passRefsIn(plan, "", [], require(sk("system/scripts/levelrefs.js")).titleSkip(plan)).length === 4 && !PN.passRefsIn(p, "", [], require(sk("system/scripts/levelrefs.js")).titleSkip(p)).length, js(PN.passRefsIn(plan))]);
  });

  guard("the pass a board names is read in either wording: qaShown(), the trail's step, the template's copies of both", c => {
    const rem = name => ({ pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "done" }, { name, state: "current" }] }), P1 = { pass: 1, verdict: "changes-requested" };
    const v = w => lib.qaShown(w).map(p => `${p.pass}:${p.verdict}`).join();
    c.push(["lib.js qaShown(): the remediation's current sub-step \"Quality Review 2\" runs pass 2, as \"qa pass 2\" did", v({ step: "qa", qa: [P1], remediation: rem("Quality Review 2") }) === "1:changes-requested,2:running" && v({ step: "remediation", qa: [P1], remediation: rem("Quality Review 2") }) === "1:changes-requested,2:running" && v({ step: "remediation", qa: [P1], remediation: rem("qa pass 2") }) === "1:changes-requested,2:running", v({ step: "remediation", qa: [P1], remediation: rem("Quality Review 2") })]);
    c.push(["lib.js trailStep(): \"Quality Review 1: approved\" and \"halted at Quality Review 2\" are the qa step's, as the older wording is", lib.trailStep("Quality Review 1: approved") === "qa" && lib.trailStep("Halted at Quality Review 2: waiting on you") === "qa" && lib.trailStep("QA pass 1: approved") === "qa", "trailStep"]);
    const h = rd(PB);
    c.push(["the issue-board template names a pass from PASS_NAME, and its qaShown() and trail rule read both wordings", /const PASS_NAME="Quality Review"/.test(h) && /const RE=\/\\b\(\?:qa\\s\+pass\|quality\\s\+review\)\\s\+#\?\(\\d\+\)\\b\/i/.test(h) && /\[\/\^\(\?:qa pass\|quality review\)\/i,"qa"\]/.test(h) && /\["quality review","qa"\]/.test(h), "dashboard.html"]);
    const hs = h.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    c.push(["…and composes no \"qa pass N\" or \"Pass N\" of its own", !/qa pass \$\{/i.test(hs) && !/[`>]Pass \$\{/.test(hs), (hs.match(/.{30}(?:qa pass|[`>]Pass) \$\{.{30}/i) || [""])[0]]);
    ["plan/template/dashboard.html:plan-board", "plan/template/board.html:work-board"].forEach(x => { const [p, k] = x.split(":"), miss = F.probe(rd(tp(p)), k).filter(m => m.id === "quality-review"); c.push([`the feature probe holds ${p} to it`, !miss.length, js(miss)]); });
    { const bad = h.replace("Answering ${esc(passName(n||\"?\"))}", "Answering qa pass ${esc(n||\"?\")}"); c.push(["…and fails a template that composes \"qa pass ${n}\"", bad !== h && F.probe(bad, "plan-board").some(m => m.id === "quality-review"), "probe"]); }
    const f = F.FEATURES.find(x => x.id === "quality-review");
    c.push(["the probe: dated, the issue board's, each type it does not fit named with the reason", !!f && f.since === 40 && js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(t => f.notFor && f.notFor[t]), f ? js([f.since, f.types]) : "missing"]);
  });

  /* the example as a board in flight at implementation, holding the older wording, in a tree of its own */
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "remediation", since: "2026-10-26T08:00:00Z", current: ["built"], questions: [], research: null, open: [{ text: "Doc gap from qa pass 1", raised: "qa pass 1" }], qa: [{ pass: 1, verdict: "changes-requested", date: "2026-10-26", at: "2026-10-26T08:00:00Z", findings: { documentation: 1 } }],
      remediation: { pass: 1, route: "remediation", steps: [{ name: "The fixes", state: "current" }, { name: "qa pass 2", state: "todo" }] }, detail: "Remediation for qa pass 1: The fixes.", event: { name: "qa-pass", at: "2026-10-26T08:00:00Z" },
      steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    x.trail = [...(x.trail || []).filter(t => t && t.column !== "built"), { date: "2026-10-26", column: "built", label: "QA pass 1: changes requested (1 documentation)" }]; return x; };
  const tree = (name, plan, embed) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk("plan/examples/38-handshake-empty-name")).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk("plan/examples/38-handshake-empty-name/" + f), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", JSON.stringify(plan, null, 2) + "\n")); if (embed !== false) run(EMBED, [dir]); return { root, dir, folder: plan.folder }; };
  const evIn = T => (name, at, facts) => { const rq = wr(path.join(sc, `${path.basename(T.root)}-${name}-${at.replace(/\D/g, "")}.json`), JSON.stringify({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--at", at, "--json"]); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { /* below */ } return { a, S, p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };
  const old = s => PN.passRefsIn(s, "", [], require(sk("system/scripts/levelrefs.js")).titleSkip(s));

  guard("check.js fails a board not landed that says \"qa pass N\"; embed.js rewords it; a landed board is warned on, never failed", c => {
    const T = tree("check", building(), false), ck = () => run(CHECK, [T.dir]);
    const c1 = ck();
    c.push(["a board in flight holding the older wording fails BOARD WORDING, naming where", c1.status !== 0 && /^FAIL.*BOARD WORDING: plan\.json holds an older wording: wip\.detail/m.test(c1.stdout), (c1.stdout.split(/\r?\n/).find(l => /BOARD WORDING/.test(l)) || "").slice(0, 200)]);
    const e = run(EMBED, [T.dir]), p = JSON.parse(rd(path.join(T.dir, "plan.json"))), c2 = ck();
    c.push(["embed.js rewords it (every rewrite does), and the board passes", e.status === 0 && !old(p).length && p.wip.detail === "Correction: The fixes." && p.wip.remediation.steps[1].name === "Quality Review 2" && !/BOARD WORDING/.test(c2.stdout), js([e.stderr, old(p), p.wip.detail, (c2.stdout.split(/\r?\n/).find(l => /BOARD WORDING|^FAIL/.test(l)) || "")])]);
    c.push(["…its identifiers left as they are: the qa-pass event, the qa step, the pass numbers", p.wip.event.name === "qa-pass" && p.wip.qa[0].pass === 1 && p.wip.remediation.pass === 1 && p.wip.steps.includes("qa"), js(p.wip.event)]);
    const L = copy(EX); L.trail = [...(L.trail || []), { date: L.asBuilt && L.asBuilt.date || "2026-10-27", column: "built", label: "QA pass 1: approved" }];
    const TL = tree("landed", L, false), c3 = run(CHECK, [TL.dir]);
    c.push(["a landed board that says it is warned on, never failed: kept as it landed", c3.status === 0 && /^warn\s+BOARD WORDING: .*kept as it landed/m.test(c3.stdout), (c3.stdout.split(/\r?\n/).filter(l => /BOARD WORDING|^FAIL/.test(l)).join(" | ") || c3.stdout.slice(-300))]);
  });

  guard("the fast path names every pass it writes \"Quality Review N\", and rewords the facts and the board it reads", c => {
    const T = tree("fast", building()), ev = evIn(T);
    const r1 = ev("implementation-stage", "2026-10-26T09:00:00Z", { remediation: { pass: 1, route: "remediation", steps: [{ name: "rookie-dev fixes", state: "done" }, { name: "qa pass 2", state: "current" }] }, stage: "qa pass 1 fixes done; qa pass 2 next", open: [{ text: "Doc gap from qa pass 1", resolved: true }] });
    const w1 = r1.p.wip, t1 = r1.p.trail.filter(t => t && /^(?:Remediation|Correction|Resolution)/.test(t.label)).slice(-1)[0] || {};
    c.push(["a remediation report: its stage, sub-steps and trail entry in the new wording, the older facts reworded", r1.a.status === 0 && w1.remediation.steps[1].name === "Quality Review 2" && t1.label === "Correction: Quality Review 1 fixes done; Quality Review 2 next" && !old(r1.p).length, js([r1.S.error, w1.remediation.steps, t1.label, old(r1.p)])]);
    c.push(["…the open point the board held as \"qa pass 1\" matched by its new wording and resolved, no second point", w1.open.length === 1 && /Quality Review 1/.test(w1.open[0].text) && !!w1.open[0].resolved, js(w1.open)]);
    c.push(["…the summary says what it reworded", (r1.S.applied || []).some(x => /"qa pass 1 fixes done|qa pass 2"/.test(x) && /Quality Review N/.test(x)) || (r1.S.applied || []).some(x => /Quality Review N/.test(x)), js((r1.S.applied || []).filter(x => /Quality Review/.test(x)))]);
    const r2 = ev("qa-pass", "2026-10-26T10:00:00Z", { qa: { pass: 2, verdict: "running" } }), r3 = ev("qa-pass", "2026-10-26T11:00:00Z", { qa: { pass: 2, verdict: "approved", note: "the 2nd qa pass found nothing new" } });
    const t3 = r3.p.trail.slice(-1)[0] || {}, q2 = (r3.p.wip.qa || []).find(p => p.pass === 2) || {};
    c.push(["a qa pass running, then approved: the detail, the trail entry and the event note name \"Quality Review 2\"", r2.a.status === 0 && r2.p.wip.detail === "Quality Review 2 running." && r3.a.status === 0 && /^Quality Review 2 approved; /.test(r3.p.wip.detail) && t3.label === "Quality Review 2: approved" && r3.p.wip.event.note === "Quality Review 2: approved", js([r2.p.wip.detail, r3.p.wip.detail, t3.label, r3.p.wip.event.note])]);
    c.push(["…its note reworded, and the board checks clean", q2.note === "Quality Review 2 found nothing new" && run(CHECK, [T.dir]).status === 0 && !old(r3.p).length, js([q2.note, old(r3.p)])]);
    const r4 = ev("qa-pass", "2026-10-26T11:00:00Z", { qa: { pass: 2, verdict: "approved", note: "the 2nd qa pass found nothing new" } });
    c.push(["the same event twice is still a duplicate", r4.a.status === 0 && r4.S.result === "duplicate", js([r4.S.result, r4.S.error])]);
    /* the frozen history and the template's step panel read the new wording */
    const H = (r3.p.wip.history || {}).qa || [];
    c.push(["the qa visit frozen in wip.history names its pass in the new wording wherever it carries text", !old(H).length, js(old(H))]);
  });

  guard("a fill writes the new wording, whatever it was given; board.js generates the work board in it", c => {
    const T = tree("fill", building()), fields = wr(path.join(sc, "fill.json"), js({ rows: [{ id: EX.rows[0].id, gap: { summary: "Found by qa pass 1: the empty name." } }], wip: { qa: [{ pass: 1, note: "qa pass 1's findings, all documentation" }] } }));
    const f = run(FILL, [T.dir, "--fields", fields, "--json"]); let S = {}; try { S = JSON.parse(f.stdout); } catch (e) { /* below */ }
    const p = JSON.parse(rd(path.join(T.dir, "plan.json"))), r0 = p.rows.find(r => r.id === EX.rows[0].id) || {};
    c.push(["fill.js: the fill's text and the board's both reworded, and noted", f.status === 0 && S.fill === "ok" && /Quality Review 1/.test(js(r0.gap)) && p.wip.qa[0].note === "Quality Review 1's findings, all documentation" && !old(p).length && (S.notes || []).some(n => /Quality Review N/.test(n)), js([S.fill, S.error, r0.gap, p.wip.qa[0].note, S.notes])]);
    /* a landed board's older wording is reworded in the work board board.js generates */
    const L = copy(EX); L.asBuilt = { ...(L.asBuilt || {}), summary: "Landed after qa pass 2." };
    const TL = tree("work", L, false); wr(path.join(TL.root, "docs", "dashboards", "systems.json"), js({ repo: EX.repo, systems: [] }));
    const b = run(BOARD, ["--root", TL.root, "--no-gh"]), bj = fs.existsSync(path.join(TL.root, "docs", "plans", "board.json")) ? JSON.parse(rd(path.join(TL.root, "docs", "plans", "board.json"))) : null;
    c.push(["board.js: board.json carries no \"qa pass N\", a landed board's text included", b.status === 0 && !!bj && !old(bj).length, js([b.stderr && b.stderr.slice(0, 200), bj && old(bj)])]);
    const ck = run(CHECK, [path.join(TL.root, "docs", "plans")]);
    c.push(["…and check.js passes it on that count", !/BOARD WORDING/.test(ck.stdout), (ck.stdout.split(/\r?\n/).find(l => /BOARD WORDING/.test(l)) || "")]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html", "system/template/supersystem.html", "system/template/system.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
