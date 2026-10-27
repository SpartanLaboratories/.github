// The case groups of admin-team/dashboards-skill/35, run by verify-templates.js (it passes its helpers in): a dependency's build state from its
// code (blocking until merged, clear once merged, an open issue with a merged pull request clear, pre-built, dropped when closed as not
// planned, a duplicate taking its canonical issue's state); remediation sub-steps in parallel; the open points (a build output's copy for the
// live view, none committed open); a bare "Ln" (named beside a test word, elided with a warning elsewhere); consequences.md (impact.md read
// alike, the Consequences tab); a fix to an earlier plan's work (fixOf, new.js --fix-of, the "fix to" chip and row); the Document step (the
// document event and its tasks, state-boards as its task, the land in two steps, the older line kept where its landing began); the state
// boards stamped in the Document step (apply-state.js facts.document); seeding at sized from the live view; the test report's neutral path;
// the structure map's recorded height; and the feature probes of this run. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases35(X) {
  const { sk, out, targets, dumpDom, withData, chrome } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), LR = require(sk("system/scripts/levelrefs.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html"), SB = tp("system/template/system.html");
  if (!PB || !WB) return [["the dashboards-skill/35 cases (both plan-set templates under test)", [["both plan-set templates are under test", false, "a repository template set without them skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8" });
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js"), BOARD = sk("plan/scripts/board.js"), NEW = sk("plan/scripts/new.js");
  const STATE = sk("system/scripts/apply-state.js"), CB = sk("system/scripts/check-board.js");
  const sc = path.join(out, "skill-35"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const probeAt = (html, code) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${code} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },900));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  /* the example as a board in flight at qa, in a tree of its own (its documents beside it) */
  const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; }); x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "qa", current: ["built"], questions: [], research: null, open: [], qa: [], event: { name: "implementation-stage", at: "2026-10-26T08:00:00Z" }, steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"] }; return x; };
  const tree = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk("plan/examples/38-handshake-empty-name")).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk("plan/examples/38-handshake-empty-name/" + f), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]); return { root, dir, folder: plan.folder }; };
  const evIn = T => (name, at, facts, extra) => { const rq = wr(path.join(sc, `${path.basename(T.root)}-${name}-${at.replace(/\D/g, "")}.json`), JSON.stringify({ v: 1, action: "plan-board", github: EX.repo, issue: EX.issue, event: name, folder: T.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", T.root, "--no-live", "--no-gh", "--at", at, "--json", ...(extra || [])]); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { /* below */ } return { a, S, p: JSON.parse(rd(path.join(T.dir, "plan.json"))) }; };

  /* 1. lib.js */
  guard("lib.js: a dependency's build state from its code, the Document step's steps and tasks, its glow and its kind of work (dashboards-skill/35)", c => {
    const B = o => lib.depBuild(o).build;
    c.push(["blocking until the code is merged, clear once it is, in a plan or not", B({ inPlan: true, merged: false }) === "blocking" && B({ inPlan: true, merged: true }) === "clear" && B({ inPlan: false, merged: false }) === "blocking" && B({ inPlan: false, merged: true, mergedAt: "2026-11-01", planStart: "2026-10-20" }) === "clear", "blocking · clear"]);
    c.push(["pre-built: outside the plan and merged before it started, taking precedence over clear", B({ inPlan: false, merged: true, mergedAt: "2026-10-01T00:00:00Z", planStart: "2026-10-20" }) === "pre-built" && B({ inPlan: true, merged: true, mergedAt: "2026-10-01", planStart: "2026-10-20" }) === "clear", "pre-built"]);
    c.push(["dropped: closed as not planned, whatever else", B({ inPlan: true, merged: false, reason: "NOT_PLANNED" }) === "dropped", "dropped"]);
    const dup = lib.depBuild({ inPlan: false, reason: "DUPLICATE", duplicateOf: { issue: 9, merged: false } }), dup2 = lib.depBuild({ reason: "DUPLICATE", duplicateOf: null });
    c.push(["a duplicate takes its canonical issue's state (via names it); one whose canonical the tracker does not name has none, with why", dup.build === "blocking" && dup.via === "#9" && dup2.build === null && /does not name/.test(dup2.why), js([dup, dup2])]);
    c.push(["DEP_STATES: blocking, clear, pre-built, dropped", js(lib.DEP_STATES) === js(["blocking", "clear", "pre-built", "dropped"]), js(lib.DEP_STATES)]);
    c.push(["STEP_ORDER: …, remediation, document, landing, merge, landed (lib.js and the template)", js(lib.STEP_ORDER.slice(-5)) === js(["remediation", "document", "landing", "merge", "landed"]) && /const STEP_ORDER=\[[^\]]*"remediation","document","landing","merge","landed"\]/.test(rd(PB)), js(lib.STEP_ORDER)]);
    const D = (s, cur) => js(lib.documentSteps(s, cur));
    c.push(["documentSteps(): a line before its landing takes the Document step and merge, and loses state-boards", D(["qa", "remediation", "landing", "landed"], "qa") === js(["qa", "remediation", "document", "landing", "merge", "landed"]) && D(["qa", "remediation", "landing", "state-boards", "merge", "landed"], "remediation") === js(["qa", "remediation", "document", "landing", "merge", "landed"]), D(["qa", "remediation", "landing", "landed"], "qa")]);
    c.push(["…a run at its landing or past it keeps the three landing steps; a tracking board at implementation keeps its line", D(["qa", "landing", "state-boards", "merge", "landed"], "landing") === js(["qa", "landing", "state-boards", "merge", "landed"]) && D(["qa", "landing", "landed"], "landing") === js(["qa", "landing", "state-boards", "merge", "landed"]) && D(["boards", "landing", "state-boards", "merge", "implementation", "landed"], "implementation") === js(["boards", "landing", "state-boards", "merge", "implementation", "landed"]) && D(["boards", "landing", "state-boards", "merge", "implementation", "landed"], "boards") === js(["boards", "document", "landing", "merge", "implementation", "landed"]), "kept"]);
    c.push(["the Document step: its glow the whole As built column, its kind of work landing, its snapshot its tasks, an event of its own", js(lib.glowFor("document")) === js(["built"]) && lib.tlFamily("document") === "landing" && js(lib.HISTORY_FIELDS.document) === js(["document"]) && lib.EVENTS.includes("document") && lib.PANEL_FIELDS.includes("document"), js([lib.glowFor("document"), lib.tlFamily("document")])]);
    c.push(["DOC_TASKS: documentation-review, reconcile-documentation, dokka-check, reconcile-plan, readme-changelog, state-boards", js(lib.DOC_TASKS.map(x => x[0])) === js(["documentation-review", "reconcile-documentation", "dokka-check", "reconcile-plan", "readme-changelog", "state-boards"]), js(lib.DOC_TASKS)]);
    c.push(["a Document trail entry is read back as its step", lib.trailStep("Document: Dokka check current") === "document", lib.trailStep("Document: Dokka check current")]);
  });

  /* 2. the Document step on the fast path */
  guard("apply-event.js: the Document step (document, its tasks in parallel, state-boards as its task), open points resolved at the land, the land in two steps (dashboards-skill/35)", c => {
    const T = tree("doc", building()), ev = evIn(T);
    fs.mkdirSync(path.join(T.root, "build", "reports", "tests"), { recursive: true }); wr(path.join(T.root, "build", "reports", "tests", "index.html"), "<html><body>Verification case: a test report.</body></html>");
    const e1 = ev("qa-pass", "2026-10-26T09:00:00Z", { qa: { pass: 1, verdict: "approved", report: "build/reports/tests/index.html" }, open: [{ text: "Verification case: a point to settle", ref: "build/reports/tests/index.html" }] });
    c.push(["an approving qa pass leads to the Document step; the older steps line takes it before its landing, merge after", e1.a.status === 0 && e1.p.wip.step === "document" && js(e1.p.wip.steps.slice(-5)) === js(["remediation", "document", "landing", "merge", "landed"]) && js(e1.p.wip.current) === js(["built"]), js([e1.a.status, e1.p.wip.step, e1.p.wip.steps, e1.S.error, e1.S.check])]);
    const op = (e1.p.wip.open || [])[0] || {}, q1 = (e1.p.wip.qa || [])[0] || {};
    c.push(["an open point's ref outside the tree: plain text on the board, its report copied for the live view (copy)", /not in the tree, so not linked/.test(op.ref || "") && /^\d+-[\w-]+\/[0-9a-f]{8}\/tests\/index\.html$/.test(op.copy || "") && fs.existsSync(path.join(T.root, "docs", "plans", ".live", "open", ...String(op.copy).split("/"))), js(op)]);
    c.push(["the qa pass's test report: its path as plain text, its copy, and .live/open/index.js listing both copies", q1.report === "build/reports/tests/index.html" && !!q1.reportCopy && (() => { try { const t = rd(path.join(T.root, "docs", "plans", ".live", "open", "index.js")); return t.includes(q1.reportCopy) && t.includes(op.copy); } catch (e) { return false; } })(), js(q1)]);
    const e2 = ev("document", "2026-10-26T09:10:00Z", { tasks: [{ id: "documentation-review", state: "current" }, { id: "dokka-check", state: "current" }, { id: "reconcile-plan", state: "todo" }] });
    const ts = ((e2.p.wip.document || {}).tasks || []);
    c.push(["document: its tasks with their names, two current at once, in the Document step's order", e2.a.status === 0 && js(ts.map(t => [t.id, t.state])) === js([["documentation-review", "current"], ["dokka-check", "current"], ["reconcile-plan", "todo"]]) && ts[0].name === "Documentation review" && /^Document: /.test(e2.p.wip.detail || ""), js([e2.a.status, ts, e2.p.wip.detail, e2.S.error])]);
    c.push(["…applied whole on the fast path (enrich: no)", e2.S.enrich === "no", js([e2.S.enrich, e2.S.why])]);
    const e3 = ev("state-boards", "2026-10-26T09:20:00Z");
    c.push(["state-boards, raised by the team in the Document step, is its state-boards task, current, the step staying at document", e3.a.status === 0 && e3.p.wip.step === "document" && ((e3.p.wip.document || {}).tasks || []).some(t => t.id === "state-boards" && t.state === "current"), js([e3.a.status, e3.p.wip.step, e3.p.wip.document])]);
    const e4 = ev("landing", "2026-10-26T09:30:00Z", { pr: 91 });
    c.push(["landing with an open point still open: refused by check.js (OPEN POINT AT THE LAND), nothing written", e4.a.status === 1 && /OPEN POINT AT THE LAND/.test(e4.S.check || "") && e4.p.wip.step === "document", js([e4.a.status, e4.S.check, e4.p.wip.step])]);
    const e5 = ev("landing", "2026-10-26T09:31:00Z", { pr: 91, open: [{ text: "Verification case: a point to settle", resolved: "settled in the plan" }] });
    c.push(["landing that resolves it: the step, the Document step frozen with its tasks, the new wording", e5.a.status === 0 && e5.p.wip.step === "landing" && ((e5.p.wip.history || {}).document || []).some(v => v.document && v.document.tasks.length === 4) && /state boards/.test(e5.p.wip.detail || ""), js([e5.a.status, e5.p.wip.step, (e5.p.wip.history || {}).document, e5.p.wip.detail])]);
    const e6 = ev("merge", "2026-10-26T09:40:00Z", { pr: 91 });
    c.push(["merge follows the landing: the land in two steps", e6.a.status === 0 && e6.p.wip.step === "merge" && ((e6.p.wip.history || {}).landing || []).length === 1 && !e6.p.wip.steps.includes("state-boards"), js([e6.a.status, e6.p.wip.step, e6.p.wip.steps])]);
    /* the older flow: a board already at its landing keeps the three landing steps */
    const old = building(); Object.assign(old.wip, { step: "landing", since: "2026-10-26T09:00:00Z", current: [], steps: ["qa", "remediation", "landing", "state-boards", "merge", "landed"], event: { name: "landing", at: "2026-10-26T09:00:00Z" } });
    const O = tree("doc-old", old), o1 = evIn(O)("state-boards", "2026-10-26T09:10:00Z");
    c.push(["a board that reached its landing on the older line: state-boards is its step of dashboards-skill/34", o1.a.status === 0 && o1.p.wip.step === "state-boards" && js(o1.p.wip.steps) === js(["qa", "remediation", "landing", "state-boards", "merge", "landed"]), js([o1.a.status, o1.p.wip.step, o1.p.wip.steps, o1.S.error])]);
    const rm = building(); Object.assign(rm.wip, { step: "remediation", current: ["built"], qa: [{ pass: 1, verdict: "changes-requested", date: "2026-10-26", at: "2026-10-26T08:30:00Z", route: "re-plan-then-remediation" }] });
    const R = tree("remed", rm), r1 = evIn(R)("implementation-stage", "2026-10-26T09:00:00Z", { step: "remediation", remediation: { pass: 1, route: "re-plan-then-remediation", steps: [{ name: "the fixes", state: "current" }, { name: "a plan re-pass", state: "current" }, { name: "qa pass 2", state: "todo" }] } });
    c.push(["remediation sub-steps may run in parallel: two current, accepted and checked", r1.a.status === 0 && (r1.p.wip.remediation.steps || []).filter(s => s.state === "current").length === 2, js([r1.a.status, r1.S.check, r1.p.wip.remediation])]);
  });

  /* 3. a bare "Ln" */
  guard("levelrefs.js: a bare Ln beside a test word written as its named test level, elsewhere elided with a warning (dashboards-skill/35)", c => {
    c.push(["\"L2 test\", \"tests (L3)\", \"regression test (L2)\" name no work level", ["L2 test", "tests (L3)", "regression test (L2)", "L1 regression tests"].every(t => !LR.levelRefs(t).length) && LR.levelRefs("L3 alone").length === 1, js(["L2 test", "tests (L3)", "L3 alone"].map(t => LR.levelRefs(t)))]);
    const n = t => LR.nameTestLevels(t).text;
    c.push(["nameTestLevels(): L2 component test, tests (L3 integration), regression test (L2 component), L1 gating tests; named and L4 left", n("L2 test") === "L2 component test" && n("tests (L3)") === "tests (L3 integration)" && n("regression test (L2)") === "regression test (L2 component)" && n("L1 tests") === "L1 gating tests" && n("L2 component test") === "L2 component test" && n("the L4 tests") === "the L4 tests", js([n("L2 test"), n("tests (L3)"), n("regression test (L2)")])]);
    const el = []; const s = LR.scrubLevels("Run the L3 checks", { elided: el });
    c.push(["scrubLevels(): a bare Ln elsewhere is elided, and reported", s === "Run the checks" && js(el) === js(["L3"]), js([s, el])]);
    const T = tree("levels", building()), e = evIn(T)("implementation-stage", "2026-10-26T09:00:00Z", { detail: "Run the L3 checks; the L2 test added" });
    c.push(["the fast path writes the named test level and warns on the elision (warnings: LEVEL ELIDED)", e.a.status === 0 && e.p.wip.detail === "Run the checks; the L2 component test added" && (e.S.warnings || []).some(w => /^LEVEL ELIDED: facts\.detail: "L3"/.test(w)) && /fast-path warning/.test(e.S.check || ""), js([e.a.status, e.p.wip.detail, e.S.warnings, e.S.check])]);
    const b = building(); b.function = b.function + " Its L2 test covers it.";
    const B2 = tree("levels-bare", b), k = run(CHECK, [B2.dir]);
    c.push(["check.js warns on a bare test level a board carries (BARE TEST LEVEL), never failing it", k.status === 0 && /BARE TEST LEVEL/.test(k.stdout), (k.stdout.split(/\r?\n/).find(l => /BARE TEST LEVEL/.test(l)) || k.stdout.slice(-200))]);
  });

  /* 4. consequences.md */
  guard("consequences.md, impact.md read alike in an older folder; the Consequences tab (dashboards-skill/35)", c => {
    const b = building(); b.impact = null; const T = tree("conseq", b);
    fs.rmSync(path.join(T.dir, "impact.md"), { force: true }); wr(path.join(T.dir, "consequences.md"), "# Consequences\n");
    const k1 = run(CHECK, [T.dir]);
    c.push(["check.js reads consequences.md: it warns that the Consequences tab is empty", /consequences\.md exists in this folder, but the Consequences tab is empty/.test(k1.stdout), (k1.stdout.split(/\r?\n/).find(l => /Consequences tab/.test(l)) || "no warning")]);
    fs.rmSync(path.join(T.dir, "consequences.md")); wr(path.join(T.dir, "impact.md"), "# Impact\n");
    const k2 = run(CHECK, [T.dir]);
    c.push(["…and impact.md in an older folder alike", /impact\.md exists in this folder, but the Consequences tab is empty/.test(k2.stdout), (k2.stdout.split(/\r?\n/).find(l => /Consequences tab/.test(l)) || "no warning")]);
    c.push(["the template's tab reads Consequences, its ids and deep links kept", /id="t-impact"[^>]*>Consequences</.test(rd(PB)) && /id="p-impact"/.test(rd(PB)) && /#impact\./.test(rd(PB)), "t-impact · p-impact · #impact."]);
  });

  /* 5. a fix to an earlier plan's work */
  guard("a fix to an earlier plan's work: new.js --fix-of inside the landed issue's folder, fixOf.board, the chip and the work board's row (dashboards-skill/35)", c => {
    const root = path.join(sc, "fix"), host = copy(EX); const hdir = path.join(root, ...host.folder.split("/"));
    wr(path.join(hdir, "plan.json"), JSON.stringify(host, null, 2) + "\n"); wr(path.join(hdir, "dashboard.html"), rd(PB)); run(EMBED, [hdir]);
    const n = run(NEW, ["91", "refusal-wording-fix", "--root", root, "--fix-of", String(host.issue), "--title", "Refusal wording fix", "--issue-title", "Verification case #91", "--function", "Verification case: a fix to #38's work.", "--baseline", "abcdef1", "--date", "2026-10-26", "--repo", host.repo, "--systems", (host.systems[0] || {}).slug || "x", "--level", "2"]);
    const fdir = path.join(hdir, "91-refusal-wording-fix");
    c.push(["new.js --fix-of lays the fix's folder inside the landed issue's folder, fixOf set, no parent", n.status === 0 && fs.existsSync(path.join(fdir, "plan.json")) && (() => { const p = JSON.parse(rd(path.join(fdir, "plan.json"))); return p.fixOf && p.fixOf.issue === host.issue && p.fixOf.board === "../dashboard.html" && !p.parent; })(), (n.stdout + n.stderr).trim().split(/\r?\n/).slice(0, 2).join(" | ")]);
    const k = run(CHECK, [fdir]);
    c.push(["check.js passes it, with no warning about its folder", !/fix to #38 has no GitHub parent/.test(k.stdout) && !/fixOf/.test((k.stdout.match(/^FAIL.*$/gm) || []).join(" ")), (k.stdout.match(/^(FAIL|warn).*fixOf.*$/gm) || ["none"]).join(" | ")]);
    const p = JSON.parse(rd(path.join(fdir, "plan.json"))); p.fixOf.board = "../../nowhere/dashboard.html"; wr(path.join(sc, "fixbad", "x"), "");
    const lone = path.join(root, "docs", "plans", "92-lone-fix"); const q = copy(p); Object.assign(q, { issue: 92, slug: "92-lone-fix", folder: "docs/plans/92-lone-fix", fixOf: { issue: host.issue, board: null } });
    wr(path.join(lone, "plan.json"), JSON.stringify(q, null, 2) + "\n"); wr(path.join(lone, "dashboard.html"), rd(PB)); run(EMBED, [lone]);
    const q2 = JSON.parse(rd(path.join(lone, "plan.json"))), k2 = run(CHECK, [lone]);
    c.push(["a fix elsewhere links the landed issue's board from anywhere in the tree, and is warned on for its place", q2.fixOf.board === "../38-handshake-empty-name/dashboard.html" && /fix to #38 has no GitHub parent and its folder is not inside #38's/.test(k2.stdout), js([q2.fixOf, (k2.stdout.match(/^warn.*fix to #38.*$/m) || [""])[0]])]);
    const b = run(BOARD, ["--root", root, "--no-gh"]), wb = JSON.parse(rd(path.join(root, "docs", "plans", "board.json")));
    const row = wb.rows.find(r => r.issue === 91) || {};
    c.push(["board.js lists the fix as a run, its row naming the issue it fixes (fixOf)", b.status === 0 && row.fixOf === host.issue, js([b.status, row.fixOf, (b.stderr || "").slice(0, 200)])]);
    c.push(["the templates draw it: the issue board's \"fix to\" chip, the work board's \"fix to #n\"", /tag\("fix to"/.test(rd(PB)) && /fix to \$\{ilink\(r\.fixOf\)\}/.test(rd(WB)), "fix to"]);
  });

  /* 6. board.js: dependencies from the code */
  guard("board.js: a dependency clear once its pull request merged though its issue is open, dropped when closed as not planned, a duplicate its canonical's state (dashboards-skill/35)", c => {
    const root = path.join(sc, "deps"), plans = path.join(root, "docs", "plans"), tdir = path.join(plans, "55-http-client-stack");
    fs.mkdirSync(plans, { recursive: true }); if (git(root, "init", "-q", "-b", "master").status !== 0) { c.push(["git is available", false, "git init failed"]); return; }
    git(root, "remote", "add", "origin", `https://github.com/${TRK.repo}.git`);
    const t = copy(TRK); wr(path.join(tdir, "plan.json"), JSON.stringify(t, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB));
    const node = (n, o) => ({ number: n, title: `Verification case #${n}`, state: "OPEN", stateReason: null, closedAt: null, repository: { nameWithOwner: TRK.repo }, ...(o || {}) });
    const units = t.rows.filter(r => r.unit).map(r => r.unit.issue);
    const issues = [55, ...units, 80, 81, 82, 83].map(n => ({ number: n, title: `Verification case #${n}`, state: [81, 82].includes(n) ? "CLOSED" : "OPEN", stateReason: n === 81 ? "NOT_PLANNED" : n === 82 ? "DUPLICATE" : null, closedAt: [81, 82].includes(n) ? "2026-10-22T00:00:00Z" : null, labels: n === 55 ? [{ name: "type: tracking" }] : [{ name: "level: 3" }], createdAt: "2026-10-10T00:00:00Z" }));
    const graph = { 55: { number: 55, subIssues: { nodes: units.map(n => node(n)) }, blockedBy: { nodes: [] }, blocking: { nodes: [] } },
      90: { number: 90, parent: null, blockedBy: { nodes: [node(80), node(81, { state: "CLOSED", stateReason: "NOT_PLANNED", closedAt: "2026-10-22T00:00:00Z" }), node(82, { state: "CLOSED", stateReason: "DUPLICATE", closedAt: "2026-10-22T00:00:00Z", timelineItems: { nodes: [{ canonical: node(83) }] } }), node(83)] }, blocking: { nodes: [] } } };
    issues.push({ number: 90, title: "Verification case #90", state: "OPEN", stateReason: null, closedAt: null, labels: [{ name: "level: 3" }], createdAt: "2026-10-10T00:00:00Z" });
    const fx = wr(path.join(sc, "deps-tracker.json"), JSON.stringify({ issues, prs: [{ number: 501, state: "MERGED", headRefName: "80-verification" }], branches: [], graph }));
    const r = run(BOARD, ["--root", root], { env: { ...process.env, DASHBOARDS_TRACKER_FIXTURE: fx } });
    c.push(["board.js runs on the fixture tree", r.status === 0, (r.stdout + r.stderr).trim().split(/\r?\n/).slice(-2).join(" | ")]);
    const wb = JSON.parse(rd(path.join(plans, "board.json"))), dep = m => ((wb.rows.find(x => x.issue === 90) || {}).waitsOn || []).find(x => x.issue === m) || {};
    c.push(["an open issue whose pull request merged: clear (the code was the blocker, not the issue)", dep(80).build === "clear", js(dep(80))]);
    c.push(["closed as not planned: dropped", dep(81).build === "dropped", js(dep(81))]);
    c.push(["closed as a duplicate of an open issue: that issue's state, blocking, via #83", dep(82).build === "blocking" && dep(82).via === "#83" && !("dupOf" in dep(82)), js(dep(82))]);
    c.push(["an open issue with nothing merged, outside any plan: blocking (no longer left without a state)", dep(83).build === "blocking" && !dep(83).why, js(dep(83))]);
    const k = run(CHECK, [plans]);
    c.push(["check.js passes the generated work board (dropped among the build states)", k.status === 0, (k.stdout.match(/^FAIL.*$/gm) || ["pass"]).slice(0, 2).join(" | ")]);
  });

  /* 7. apply-state.js in the Document step */
  guard("apply-state.js: the Document step's state boards stamped at the code-landing sha, no \"not yet landed\"; refused without the sha (dashboards-skill/35)", c => {
    const root = path.join(sc, "state"), dash = path.join(root, "docs", "dashboards"); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    const reg = { repo: "acme/widgets", systems: [{ slug: "repo", name: "widgets", kind: "repo", status: "built", board: "index.html", dsl: "workspace.dsl" }] };
    wr(path.join(dash, "systems.json"), JSON.stringify(reg, null, 2) + "\n");
    const rq = facts => wr(path.join(sc, "state-req.json"), JSON.stringify({ action: "state-boards", github: "acme/widgets", issue: 9, branch: "feat/9", facts: { at: "2026-10-26T12:00:00Z", systems: ["repo"], ...facts } }));
    const ap = f => { const a = run(STATE, ["--event", rq(f), "--worktree", root, "--json"]); try { return { a, S: JSON.parse(a.stdout) }; } catch (e) { return { a, S: {} }; } };
    const s1 = ap({ document: true });
    c.push(["without facts.sha the stamp is refused (exit 1): the Document step's stamp is the sha the request gives", s1.a.status === 1 && /code-landing sha/.test(s1.S.error || ""), js([s1.a.status, s1.S.error])]);
    const s2 = ap({ document: true, sha: "3333333" }), R = JSON.parse(rd(path.join(dash, "systems.json"))), e = R.systems.find(x => x.slug === "repo");
    c.push(["with it: \"feat/9 @ 3333333\", no \"not yet landed\" (landed not false)", s2.a.status === 0 && e.asIs && e.asIs.ref === "feat/9" && e.asIs.sha === "3333333" && e.asIs.landed === undefined && !/not yet landed/.test(s2.S.stamp || ""), js([s2.a.status, e.asIs, s2.S.stamp, s2.S.error])]);
  });

  /* 8. seeding at sized */
  guard("apply-event.js at sized: a worktree branched after a landing seeds the landed board and its tracking board from the live view (dashboards-skill/35)", c => {
    const main = path.join(sc, "seed-main"), wt = path.join(sc, "seed-wt"); fs.rmSync(wt, { recursive: true, force: true });
    const tdir = path.join(main, "docs", "plans", "55-http-client-stack"), sdir = path.join(tdir, "47-java-23-bytecode");
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) { c.push(["git is available", false, "git init failed"]); return; }
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const sub = copy(EX); Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: "docs/plans/55-http-client-stack/47-java-23-bytecode", parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
    delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built");
    sub.wip = { ...sub.wip, step: "merge", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: [], questions: [], research: null, open: [], event: { name: "merge", at: "2026-10-26T09:20:00Z" }, steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"] };
    const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    run(EMBED, [sdir]); run(EMBED, [tdir]);
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the merge"); const M = (git(main, "rev-parse", "HEAD").stdout || "").trim();
    const lq = wr(path.join(sc, "seed-landed.json"), JSON.stringify({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: "landed", folder: sub.folder, facts: { pr: 90, sha: M, merge: M, date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" } }));
    const lv = run(APPLY, ["--event", lq, "--worktree", main, "--main", main, "--no-gh", "--no-live", "--view", "--at", "2026-10-26T09:30:00Z", "--json"]);
    c.push(["the post-merge refresh's landed writes the view copies", lv.status === 0 && fs.existsSync(path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode", "plan.json")), (lv.stdout || lv.stderr).slice(0, 300)]);
    if (git(main, "worktree", "add", "-q", "-b", "feat/62", wt).status !== 0) { c.push(["git worktree add", false, "failed"]); return; }
    const nd = path.join(wt, "docs", "plans", "55-http-client-stack", "62-http-core"), nu = copy(LIVE);
    Object.assign(nu, { issue: 62, slug: "62-http-core", folder: "docs/plans/55-http-client-stack/62-http-core", parent: { issue: 55 }, issueTitle: "Verification case #62", status: "planned" });
    nu.wip = { ...nu.wip, step: null, current: [], event: { name: "boards-created", at: "2026-10-26T08:00:00Z" }, updated: "2026-10-26T08:00:00Z", history: {} };
    wr(path.join(nd, "plan.json"), JSON.stringify(nu, null, 2) + "\n"); wr(path.join(nd, "dashboard.html"), rd(PB)); run(EMBED, [nd]);
    const sq = wr(path.join(sc, "seed-sized.json"), JSON.stringify({ v: 1, action: "plan-board", github: nu.repo, issue: 62, event: "sized", folder: nu.folder, repo: main, facts: { step: "research" } }));
    const a = run(APPLY, ["--event", sq, "--worktree", wt, "--no-gh", "--no-live", "--at", "2026-10-26T10:00:00Z", "--json"]); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { /* below */ }
    const ws = JSON.parse(rd(path.join(wt, "docs", "plans", "55-http-client-stack", "47-java-23-bytecode", "plan.json"))), wtk = JSON.parse(rd(path.join(wt, "docs", "plans", "55-http-client-stack", "plan.json")));
    const u47 = wtk.rows.find(r => r.unit && r.unit.issue === 47) || {}, u62 = wtk.rows.find(r => r.unit && r.unit.issue === 62) || {};
    c.push(["sized seeds the landed sub-issue's board into the branch: its asBuilt and its merge", a.status === 0 && (S.seeded || []).some(x => /47-java-23-bytecode/.test(x)) && (ws.asBuilt || {}).merge === M, js([a.status, S.seeded, S.error, S.check, ws.asBuilt])]);
    c.push(["…and its parent tracking board together: the unit landed, the new run's unit in progress", (u47.asBuilt || {}).state === "landed" && (wtk.wip.current || []).includes(u62.id + ".built"), js([(u47.asBuilt || {}).state, wtk.wip.current, wtk.wip.next])]);
    c.push(["…and the worktree's committed repository work board regenerated", fs.existsSync(path.join(wt, "docs", "plans", "board.json")) && fs.existsSync(path.join(wt, "docs", "plans", "index.html")), "board.json · index.html"]);
    c.push(["nothing written in the main checkout's tracked boards", JSON.parse(rd(path.join(sdir, "plan.json"))).wip.step === "merge", "main untouched"]);
    /* a worktree branched before the merge holds no copy's merge: nothing seeded */
    const wt2 = path.join(sc, "seed-wt2"); fs.rmSync(wt2, { recursive: true, force: true });
    const vf = path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode", "plan.json"), vp = JSON.parse(rd(vf)); vp.asBuilt.merge = "1234567"; vp.asBuilt.sha = "1234567"; wr(vf, JSON.stringify(vp, null, 2) + "\n");
    git(main, "worktree", "add", "-q", "-b", "feat/63", wt2); const nd2 = path.join(wt2, "docs", "plans", "55-http-client-stack", "63-test-support"), nu2 = copy(nu); Object.assign(nu2, { issue: 63, slug: "63-test-support", folder: "docs/plans/55-http-client-stack/63-test-support" });
    wr(path.join(nd2, "plan.json"), JSON.stringify(nu2, null, 2) + "\n"); wr(path.join(nd2, "dashboard.html"), rd(PB)); run(EMBED, [nd2]);
    const sq2 = wr(path.join(sc, "seed-sized2.json"), JSON.stringify({ v: 1, action: "plan-board", github: nu.repo, issue: 63, event: "sized", folder: nu2.folder, repo: main, facts: { step: "research" } }));
    const a2 = run(APPLY, ["--event", sq2, "--worktree", wt2, "--no-gh", "--no-live", "--at", "2026-10-26T10:05:00Z", "--json"]); let S2 = {}; try { S2 = JSON.parse(a2.stdout); } catch (e) { /* below */ }
    c.push(["a copy whose merge the branch does not hold is not seeded", a2.status === 0 && !(S2.seeded || []).length && JSON.parse(rd(path.join(wt2, "docs", "plans", "55-http-client-stack", "47-java-23-bytecode", "plan.json"))).wip.step === "merge", js([a2.status, S2.seeded, S2.error])]);
  });

  /* 9. the structure map's height, check-board.js */
  guard("the structure map: 1000 wide, its height recorded (MODEL.structure.h, at most 812), a taller one failed (dashboards-skill/35)", c => {
    if (!SB) { c.push(["the system template is under test", false, "skipped"]); return; }
    const t = rd(SB); c.push(["the template records h:612 and the renderer reads it", /\bh:612,/.test(t) && /Number\(MODEL\.structure\.h\)/.test(t), "h:612"]);
    const tall = wr(path.join(sc, "tall", "index.html"), t.replace(/\bh:612,/, "h:900,")), r = run(CB, [tall, "--auto", "--no-browser"]);
    c.push(["check-board.js fails a map taller than 812 (STRUCTURE CANVAS TOO TALL)", r.status !== 0 && /STRUCTURE CANVAS TOO TALL/.test(r.stdout), (r.stdout.split(/\r?\n/).find(l => /STRUCTURE CANVAS/.test(l)) || r.stdout.slice(-200))]);
    const ok812 = wr(path.join(sc, "tall812", "index.html"), t.replace(/\bh:612,/, "h:812,")), r2 = run(CB, [ok812, "--auto", "--no-browser"]);
    c.push(["…and passes one of 812", !/STRUCTURE CANVAS TOO TALL/.test(r2.stdout), (r2.stdout.split(/\r?\n/).find(l => /STRUCTURE CANVAS/.test(l)) || "no finding")]);
  });

  /* 10. the rendered issue board */
  guard("the rendered issue board: the Document step's panel, the Consequences tab, a dropped dependency, a build output's live copy (dashboards-skill/35)", c => {
    if (!chrome) { c.push(["a headless browser is available", false, "no Chrome or Edge"]); return; }
    const b = building(); Object.assign(b.wip, { step: "document", current: ["built"], steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"],
      document: { tasks: [{ id: "documentation-review", name: "Documentation review", state: "done" }, { id: "dokka-check", name: "Dokka check", state: "current" }, { id: "state-boards", name: "State boards", state: "current" }] },
      qa: [{ pass: 1, verdict: "approved", date: "2026-10-26", at: "2026-10-26T09:00:00Z", findings: {}, report: "build/reports/tests/index.html", reportCopy: "38-handshake-empty-name/aaaaaaaa/tests/index.html" }],
      open: [{ text: "Verification case: an open point", raised: "qa pass 1", ref: "`build/reports/tests/index.html` (not in the tree, so not linked)", copy: "38-handshake-empty-name/bbbbbbbb/tests/index.html" }],
      blockers: { waitsOn: [{ issue: 81, state: "CLOSED", stateReason: "NOT_PLANNED", build: "dropped", locality: "local-repository" }], blocks: [] } });
    const T = tree("render", b); const lo = path.join(T.root, "docs", "plans", ".live", "open");
    ["38-handshake-empty-name/aaaaaaaa/tests/index.html", "38-handshake-empty-name/bbbbbbbb/tests/index.html"].forEach(f => wr(path.join(lo, ...f.split("/")), "<html>copy</html>"));
    wr(path.join(lo, "index.js"), `(window.DASHBOARDS_LIVE=window.DASHBOARDS_LIVE||{}).open=${js(["38-handshake-empty-name/aaaaaaaa/tests/index.html", "38-handshake-empty-name/bbbbbbbb/tests/index.html"])};\n`);
    const page = path.join(T.dir, "dashboard.html"); wr(page, probeAt(rd(page), 'document.body.dataset.r=JSON.stringify({t:(document.querySelector(".sp-t")||{}).textContent||"",p:(document.querySelector(".sp")||{}).textContent||"",tab:(document.getElementById("t-impact")||{}).textContent||"",wip:(document.querySelector("section.wip")||document.body).textContent,copies:[...document.querySelectorAll("a.livecopy")].map(a=>a.getAttribute("href"))});'));
    const R = got(dumpDom(page, "", "1600,1000", 8000)) || {};
    c.push(["the step panel at document: its title, its tasks, two in parallel", R.t === "Document" && /1 of 3 tasks done · 2 in parallel/.test(R.p || "") && /Dokka check · in progress/.test(R.p || ""), js([R.t, (R.p || "").slice(0, 300), R.err])]);
    c.push(["the tab reads Consequences", (R.tab || "").trim() === "Consequences", R.tab]);
    c.push(["a dependency closed as not planned: ✕ dropped on the WIP strip", /✕dropped|✕ dropped/.test(R.wip || ""), (R.wip || "").slice((R.wip || "").indexOf("depends on"), (R.wip || "").indexOf("depends on") + 120)]);
    c.push(["the open point's report and the test report: plain text, and their copies linked on this machine", (R.copies || []).length === 2 && (R.copies || []).every(h => /docs\/plans\/\.live\/open\/38-handshake-empty-name\/[ab]{8}\/tests\/index\.html$/.test(h)) && /not in the tree, so not linked/.test(R.p || "") , js(R.copies)]);
  });

  /* 11. the feature probes */
  guard("the feature probes of this run: the templates carry each, one without it does not (dashboards-skill/35)", c => {
    const ids = ["document-step", "dependency-dropped", "consequences-tab", "build-output-copies", "fix-of", "structure-height"];
    ids.forEach(id => { const f = F.FEATURES.find(x => x.id === id); c.push([`${id}: defined, since 35`, !!f && f.since === 35, f ? f.types.join(", ") : "missing"]); });
    const P = rd(PB), W = rd(WB), S0 = SB ? rd(SB) : "";
    const miss = (h, k, id) => F.probe(h, k).some(m => m.id === id);
    c.push(["the templates pass every probe of this run", !["plan-board"].some(k => F.probe(P, k).some(m => ids.includes(m.id))) && !F.probe(W, "work-board").some(m => ids.includes(m.id)) && (!SB || !F.probe(S0, "system").some(m => ids.includes(m.id))), "pass"]);
    c.push(["a board without the Document step lacks document-step", miss(P.replace('"remediation","document","landing","merge","landed"]', '"remediation","landing","landed"]'), "plan-board", "document-step"), "document-step"]);
    c.push(["a board whose pills have no dropped state lacks dependency-dropped", miss(P.replace('dropped:{g:"✕"', 'dropt:{g:"✕"'), "plan-board", "dependency-dropped"), "dependency-dropped"]);
    c.push(["a board whose tab reads Impact lacks consequences-tab", miss(P.replace('aria-selected="false">Consequences</button>', 'aria-selected="false">Impact</button>'), "plan-board", "consequences-tab"), "consequences-tab"]);
    c.push(["a system board fixed at 612 lacks structure-height", !SB || miss(S0.replace("Number(MODEL.structure.h)", "612"), "system", "structure-height"), "structure-height"]);
  });

  /* 12. the Systems tab by visibility, a system's parts inside its panel, archived (convention 13) */
  guard("the Systems tab: grouped by visibility (far to near, unset last), a supersystem's subsystems inside its panel, an Archived group apart; the registry checked (dashboards-skill/35)", c => {
    const SUP = tp("system/template/supersystem.html"); if (!SUP) { c.push(["the supersystem template is under test", false, "skipped"]); return; }
    const L = require(sk("system/scripts/statelib.js"));
    const reg = { repo: "acme/widgets", updated: "2026-10-26", systems: [
      { slug: "widgets", name: "widgets", kind: "repo", parent: null, status: "built", function: "Verification case.", paths: ["."], version: null, board: "index.html", dsl: "workspace.dsl" },
      { slug: "alpha", name: "alpha", kind: "system", parent: "widgets", status: "built", visibility: "internal-repo", function: "Verification case: alpha.", paths: [], version: "1.0.0" },
      { slug: "suite", name: "suite", kind: "supersystem", parent: "widgets", status: "built", visibility: "public", function: "Verification case: the suite.", paths: [] },
      { slug: "suite-core", name: "suite-core", kind: "system", parent: "suite", core: true, status: "built", function: "Verification case: its core.", paths: [], version: "2.0.0" },
      { slug: "suite-extra", name: "suite-extra", kind: "system", parent: "suite", core: false, status: "planned", function: "Verification case: planned.", paths: [], plannedBy: { issue: 9, architecture: "docs/plans/9-x/architecture.md", units: [{ unit: 1, slug: "extra", subIssue: 10 }], placement: "suite-extra/" } },
      { slug: "beta", name: "beta", kind: "system", parent: "widgets", status: "built", function: "Verification case: no visibility yet.", paths: [], version: "0.1.0" },
      { slug: "old", name: "old", kind: "system", parent: "widgets", status: "archived", function: "Verification case: archived.", paths: [], version: "0.9.0" }] };
    const root = path.join(sc, "vis"), dash = path.join(root, "docs", "dashboards"); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    wr(path.join(dash, "systems.json"), JSON.stringify(reg, null, 2) + "\n");
    const page = wr(path.join(dash, "index.html"), L.embedInto(L.norm(rd(SUP)), "systems", JSON.stringify(reg, null, 2)));
    const r = run(CB, [page, "--auto", "--no-browser"]);
    c.push(["check-board.js warns on a system with no visibility (VISIBILITY UNSET: beta), not on the archived one nor on a part", /VISIBILITY UNSET: beta records/.test(r.stdout) && !/VISIBILITY UNSET:[^\n]*\b(old|suite-core|suite-extra)\b/.test(r.stdout), (r.stdout.split(/\r?\n/).find(l => /VISIBILITY UNSET/.test(l)) || "no warning")]);
    const bad = copy(reg); bad.systems[1].visibility = "secret"; bad.systems[2].status = "retired"; wr(path.join(dash, "systems.json"), JSON.stringify(bad, null, 2) + "\n");
    const pageB = wr(path.join(dash, "index.html"), L.embedInto(L.norm(rd(SUP)), "systems", JSON.stringify(bad, null, 2))), r2 = run(CB, [pageB, "--auto", "--no-browser"]);
    c.push(["…and fails a status or a visibility outside the rule (REGISTRY INVALID)", r2.status !== 0 && /REGISTRY INVALID: alpha's visibility "secret"/.test(r2.stdout) && /REGISTRY INVALID: suite's status "retired"/.test(r2.stdout), (r2.stdout.match(/REGISTRY INVALID[^\n]*/g) || ["none"]).join(" | ")]);
    wr(path.join(dash, "systems.json"), JSON.stringify(reg, null, 2) + "\n"); wr(page, probeAt(L.embedInto(L.norm(rd(SUP)), "systems", JSON.stringify(reg, null, 2)), 'const g=[...document.querySelectorAll("#syscards>.sysgroup")].map(x=>x.textContent.trim().split(" ")[0]+" "+x.textContent.trim().split(" ")[1]);const p=document.querySelector(".syspanel[data-slug=suite]");document.body.dataset.r=JSON.stringify({g,inside:p?[...p.querySelectorAll(".syscard")].map(x=>x.dataset.slug):[],arch:(document.querySelector(".syscard[data-slug=old]")||{}).className||"",pl:(document.querySelector(".syscard[data-slug=suite-extra]")||{}).textContent||"",key:(document.getElementById("systems-key")||{}).textContent||""});'));
    if (!chrome) { c.push(["the rendered Systems tab (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const R = got(dumpDom(page, "", "1600,1000", 8000)) || {};
    c.push(["the groups far to near: public, internal · repo, the unset one, then Archived", (R.g || []).length === 4 && /public/.test(R.g[0]) && /internal/.test(R.g[1]) && /visibility not/.test(R.g[2]) && /archived/.test(R.g[3]), js([R.g, R.err])]);
    c.push(["the supersystem is a panel holding its own card and its subsystems' cards", js(R.inside) === js(["suite", "suite-core", "suite-extra"]), js(R.inside)]);
    c.push(["an archived card: solid and faded (class archived, never planned); a planned one names its unit and placement", /\barchived\b/.test(R.arch || "") && !/\bplanned\b/.test(R.arch || "") && /unit 1/.test(R.pl || "") && /placement suite-extra\//.test(R.pl || ""), js([R.arch, (R.pl || "").slice(0, 160)])]);
    c.push(["the legend names each visibility drawn and archived", /↗public consumed by another organization/.test(R.key || "") && /⌂internal · repo consumed only inside this repository/.test(R.key || "") && /⊟ archived no longer developed/.test(R.key || ""), (R.key || "").slice(0, 300)]);
  });

  return groups;
};
