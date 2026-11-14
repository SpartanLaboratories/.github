// The cases of a tracking board's "plan" step and a nested tracking board's roadmap item (admin-team/dashboards/tracking-step-plan;
// plan/RULES.md §2, "The Context's roadmap", and §4, the fast path's facts.step), run by verify-templates.js (it passes its helpers in), or on
// its own: node verify/cases-tracking-step-plan.js [--out <dir>]. The rendered Card needs a browser (verify-templates.js --browser).
// The trigger: KotlinBottools #2, a tracking issue nested under #1's roadmap. Its run sent sized with facts.step "plan" (its pipeline's
// step 2), which opened a plan pass and a plan visit on a board whose line has no plan step; and its board said nothing of the roadmap
// item it is, #1's "Phase 0 — History rewrite" (roadmap.md §4).
// 1. facts.step "plan" or "planning", on any event of a tracking board, is read as its architecture step (or, once the board stands past
//    its architecture, the step it stands at) and never opens wip.plan; an issue board is unchanged.
// 2. A tracking board with a parent takes plan.roadmap as a sub-issue's board does (lib.js roadmapFor()), the item carrying its section of
//    the parent's roadmap.md (roadmapDocItem()), which is also the last source; nothing is invented where no source names it.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesTrackingStepPlan(X) {
  const { sk, out, targets, dumpDom, withData, chrome } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["a tracking board's plan step and its parent's roadmap item (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const sc = path.join(out, "tracking-step-plan"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const TRK = J("verify/fixtures/tracking.plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const T = m => `2026-11-07T08:${String(m).padStart(2, "0")}:00Z`;
  /* a tracking board early in its run, at the step given: before its sign-off no unit rows yet (they come from the architecture at its
     sign-off), from its plan's documents on its units written, none filed, the first up next */
  const PRE = ["sizing", "interview", "research", "architecture", "plan"];
  const early = (step, over) => { const p = early0(step, over), st = lib.shownStep(p.wip);
    if (PRE.includes(st)) { p.rows = p.rows.filter(r => !r.unit); if (p.impact) delete p.impact.units; } else if (p.wip.next == null) { const nx = lib.nextUnit(p); p.wip.next = nx ? nx.id : null; }
    return p; };
  const early0 = (step, over) => { const p = copy(TRK); p.rows.forEach(r => { if (r.unit) { r.unit.board = null; r.unit.folder = null; r.unit.issue = null; r.unit.blockedBy = []; delete r.unit.live; r.asBuilt = { state: "pending", summary: "Not filed yet." }; } });
    Object.assign(p, { status: "planned", asBuilt: null, sized: T(0), branch: null }); p.milestones = (p.milestones || []).filter(m => m.column !== "built"); if (p.impact) { p.impact.basis = "plan"; delete p.impact.changes; }
    Object.assign(p.wip, { step, since: T(1), updated: T(1), current: [], next: null, landing: null, stages: [], steps: lib.STEPS_BY_LEVEL[4].slice(), history: {}, qa: [], waitingOn: null, resume: null, plan: null, questions: [], research: null, event: { name: "sized", at: T(1) }, ...(over || {}) }); return p; };
  const tree = p => { const root = path.join(sc, `t-${++n}`), dir = path.join(root, ...p.folder.split("/")); fs.mkdirSync(path.join(root, ".git", "info"), { recursive: true }); wr(path.join(root, ".git", "info", "exclude"), "docs/plans/.live/\n");
    wr(path.join(dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, p }; };
  const ev = (B, event, facts, at) => { const q = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: B.p.repo, issue: B.p.issue, event, folder: B.p.folder, branch: "docs/issue-x", facts }));
    const a = run(APPLY, ["--event", q, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]); return { a, S: parse(a) }; };
  const P = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  const said = S => (S.applied || []).find(x => /^facts\.step /.test(x)) || "";

  guard("a tracking board's facts.step \"plan\" or \"planning\" reads as its architecture step, never a plan pass (KotlinBottools #2)", c => {
    /* the trigger: sized with facts.step "plan" on a tracking board at its sizing */
    const A = tree(early("sizing")), a = ev(A, "sized", { step: "plan" }, T(2)), pa = P(A);
    c.push(["sized \"plan\": applied at the architecture, no wip.plan", a.a.status === 0 && a.S.result === "ok" && pa.wip.step === "architecture" && pa.wip.plan == null, js([a.S.result, a.S.error, pa.wip.step, pa.wip.plan])]);
    c.push(["…the summary says how \"plan\" was read", /facts\.step "plan" read as architecture \(a tracking board has no plan step/.test(said(a.S)), said(a.S)]);
    c.push(["…the trail \"Sized; the architecture starts\", no plan visit on its record", (pa.trail || []).some(t => /^Sized; the architecture starts/.test(t.label || "")) && !(pa.wip.history.plan || []).length, js([(pa.trail || []).slice(-1), Object.keys(pa.wip.history || {})])]);
    const G = tree(early("sizing")), g = ev(G, "sized", { step: "Planning" }, T(2)), pg = P(G);
    c.push(["sized \"Planning\" (any case): the same", g.a.status === 0 && pg.wip.step === "architecture" && pg.wip.plan == null && !(g.S.warnings || []).some(w => /STEP UNKNOWN/.test(w)), js([g.S.error, pg.wip.step, pg.wip.plan, g.S.warnings])]);
    const R = tree(early("research", { research: { phase: "verification", drafted: 1, since: {} } })), r = ev(R, "researched", { step: "plan" }, T(2)), pr = P(R);
    c.push(["researched naming \"plan\" next: the architecture, no wip.plan", r.a.status === 0 && pr.wip.step === "architecture" && pr.wip.plan == null, js([r.S.error, pr.wip.step, pr.wip.plan])]);
    const H = tree(early("halted", { resume: "architecture", waitingOn: "An answer." })), h = ev(H, "resumed", { step: "plan" }, T(2)), ph = P(H);
    c.push(["resumed at \"plan\" from a halt in the architecture: back at the architecture", h.a.status === 0 && ph.wip.step === "architecture" && ph.wip.plan == null && ph.wip.resume == null, js([h.S.error, ph.wip.step, ph.wip.plan])]);
    /* a halt between the sign-off and plan-accepted, in the run's own plan step: the signed-off board is never moved back */
    const D = tree(early("halted", { resume: "document", waitingOn: "An answer.", current: ["built"] })), d = ev(D, "resumed", { step: "plan" }, T(2)), pd = P(D);
    c.push(["resumed at \"plan\" on a board past its architecture (halted at document): it stays at document, never back at the architecture", d.a.status === 0 && pd.wip.step === "document" && pd.wip.plan == null, js([d.S.error, pd.wip.step, said(d.S)])]);
    /* an older board a sized at "plan" left at the plan step, with its plan pass */
    const O = tree(early("plan", { plan: { state: "writing", since: T(1) } }));
    const o = ev(O, "sized", {}, T(2)), po = P(O);
    c.push(["sized with no facts.step on an older board left at \"plan\": the architecture, no new plan pass opened", o.a.status === 0 && po.wip.step === "architecture" && !(o.S.applied || []).some(x => /^wip\.plan /.test(x)), js([o.S.error, po.wip.step, (o.S.applied || []).filter(x => /wip\.plan/.test(x))])]);
    const so = ev(O, "architecture-signed-off", {}, T(3)), ps = P(O);
    c.push(["…and the sign-off clears the plan pass it left", so.a.status === 0 && ps.wip.plan == null && ps.wip.step === "document", js([so.S.error, ps.wip.plan, ps.wip.step])]);
  });

  guard("an issue board's plan step is unchanged; \"planning\" stays unread there (research's planning phase)", c => {
    const L = () => { const p = copy(LIVE); Object.assign(p.wip, { step: "sizing", since: T(1), plan: null, questions: [], research: null, history: {} }); return p; };
    const I = tree(L()), i = ev(I, "sized", { step: "plan" }, T(2)), pi = P(I);
    c.push(["sized \"plan\" on an issue board: the plan step, its plan pass writing", i.a.status === 0 && pi.wip.step === "plan" && pi.wip.plan && pi.wip.plan.state === "writing", js([i.S.error, pi.wip.step, pi.wip.plan])]);
    const Q = tree(L()), q = ev(Q, "sized", { step: "planning" }, T(2));
    c.push(["sized \"planning\" on an issue board: warned as no step (STEP UNKNOWN), never read as plan", (q.S.warnings || []).some(w => /STEP UNKNOWN: facts\.step "planning"/.test(w)) && !/read as/.test(said(q.S)), js([q.a.status, q.S.error, q.S.warnings, said(q.S)])]);
  });

  /* a repository with #1's roadmap.md and #2, a tracking board nested under it, as KotlinBottools has them */
  const ROADMAP = ["# A consolidation — roadmap", "", "## Header", "", "- Phase 0 rewrites history first.", "", "## 4. The library's phases", "",
    "| # | Sub-issue title |", "|---|---|", "| 0 | Phase 0 — History rewrite: purge secrets and data |", "| 1 | Phase 1 — Build skeleton |", "",
    "### Phase 0 — History rewrite", "", "> **Dated note.** Phase 0 as designed ([`2-phase-0-history-rewrite/architecture.md`](2-phase-0-history-rewrite/architecture.md)).", "",
    "- **Scope:** the rewrite.", "", "### Phase 1 — Build skeleton", "", "- **Depends on:** Phase 0.", ""].join("\n");
  const NESTED = "docs/plans/1-consolidation/2-phase-0-history-rewrite";
  const nested = over => { const p = early("document", { current: ["built"] }); Object.assign(p, { issue: 2, slug: "2-phase-0-history-rewrite", folder: NESTED, parent: { issue: 1, board: null }, roadmap: null,
    issueTitle: "Phase 0 — History rewrite: purge secrets and data" }, over || {}); return p; };
  const nestTree = (md, over) => { const B = tree(nested(over)); if (md != null) wr(path.join(path.dirname(B.dir), "roadmap.md"), md); return B; };
  const ITEM = { ref: "../roadmap.md#phase-0--history-rewrite", section: "Phase 0 — History rewrite" };

  guard("a tracking board nested under another tracking issue names the parent's roadmap item it is (KotlinBottools #2)", c => {
    const A = nestTree(ROADMAP), p = P(A);
    c.push(["roadmapDocItem(): the one heading whose own text links into the board's folder, its GitHub anchor and its heading", js(lib.roadmapDocItem(p, A.dir)) === js(ITEM), js(lib.roadmapDocItem(p, A.dir))]);
    const r = lib.roadmapFor(p, A.dir);
    c.push(["no work board's data and no parent board: the item from the parent's roadmap.md alone, this issue's own title, no other item invented", !!r && r.from === "the parent's roadmap.md" && js(r.roadmap) === js({ issue: 1, title: null, asOf: null, items: [{ issue: 2, title: "Phase 0 — History rewrite: purge secrets and data", ...ITEM }] }), js(r)]);
    const e = run(EMBED, [A.dir]), pe = P(A);
    c.push(["embed.js fills the nested tracking board's unset roadmap (so every event does)", e.status === 0 && /roadmap: unset → #1/.test(e.stdout || "") && pe.roadmap && pe.roadmap.issue === 1, js([e.status, (e.stdout || "").split(/\r?\n/).filter(l => /roadmap/.test(l))])]);
    const wb = { schema: "work-board/1", asOf: "2026-11-07", roadmap: [{ issue: 1, title: "A consolidation (tracking)", state: "OPEN", items: [{ issue: 2, title: "Phase 0 — History rewrite: purge secrets and data", state: "OPEN" }, { issue: 3, title: "Phase 1 — Build skeleton", state: "OPEN" }] },
      { issue: 2, title: "Phase 0", state: "OPEN", items: [] }] };
    const W = nestTree(ROADMAP); wr(path.join(W.root, "docs", "plans", ".live", "board.json"), js(wb));
    const rw = lib.roadmapFor(P(W), W.dir);
    c.push(["the repository work board's data first: the parent's item list, the tracker's titles verbatim; only this board's item carries its roadmap.md section", !!rw && rw.from === "docs/plans/.live/board.json" && rw.roadmap.title === "A consolidation (tracking)" && js(rw.roadmap.items) === js([{ issue: 2, title: "Phase 0 — History rewrite: purge secrets and data", state: "OPEN", ...ITEM }, { issue: 3, title: "Phase 1 — Build skeleton", state: "OPEN" }]), js(rw)]);
    const byTitle = ROADMAP.replace(/ \(\[`2-phase-0-history-rewrite\/architecture\.md`\]\(2-phase-0-history-rewrite\/architecture\.md\)\)/, "");
    const B = nestTree(byTitle);
    c.push(["a roadmap.md that never links the folder: the one heading that is the issue's title before its first \": \"", js(lib.roadmapDocItem(P(B), B.dir)) === js(ITEM), js(lib.roadmapDocItem(P(B), B.dir))]);
    const two = byTitle + "\n### Phase 0 — History rewrite\n\n- A second section of the same name.\n";
    const C = nestTree(two);
    c.push(["two headings that fit and no link to decide: nothing named, nothing invented", lib.roadmapDocItem(P(C), C.dir) === null && lib.roadmapFor(P(C), C.dir) === null, js(lib.roadmapDocItem(P(C), C.dir))]);
    const lv = ROADMAP.replace("### Phase 0 — History rewrite", "### Phase 0 — a grade-3 rewrite");
    const Lv = nestTree(lv);
    c.push(["a heading that names a grade: the section's link alone, its heading never shown", (() => { const d = lib.roadmapDocItem(P(Lv), Lv.dir); return d && /^\.\.\/roadmap\.md#phase-0--a-grade-3-rewrite$/.test(d.ref) && !("section" in d); })(), js(lib.roadmapDocItem(P(Lv), Lv.dir))]);
    const N = nestTree(null), en = run(EMBED, [N.dir]);
    c.push(["no roadmap.md, no work board's data, no parent board: the roadmap stays unset", en.status === 0 && P(N).roadmap === null, js([en.status, P(N).roadmap])]);
    const Cl = nestTree(ROADMAP, { status: "built" });
    c.push(["a closed nested tracking board takes none (kept as it closed)", lib.roadmapFor(P(Cl), Cl.dir) === null, "built"]);
    c.push(["a tracking board with no parent takes none (its roadmap is its own units)", lib.roadmapFor(copy(TRK), path.join(sc, "none")) === null, "no parent"]);
  });

  guard("a sub-issue's board under a parent with a roadmap.md: its item carries the section there", c => {
    const root = path.join(sc, "sub"), up = path.join(root, "docs", "plans", "55-http-client-stack"), me = path.join(up, "64-url-policy");
    wr(path.join(up, "plan.json"), JSON.stringify(TRK, null, 2) + "\n"); wr(path.join(up, "dashboard.html"), rd(PB));
    wr(path.join(up, "roadmap.md"), "# Roadmap\n\n## Units\n\n### URL policy\n\n- Planned in [its folder](64-url-policy/plan.md).\n");
    const u = copy(LIVE); Object.assign(u, { issue: 64, folder: "docs/plans/55-http-client-stack/64-url-policy", parent: { issue: 55, board: "../dashboard.html" }, roadmap: null, issueTitle: "webtools-http: outbound-URL policies" });
    wr(path.join(me, "plan.json"), JSON.stringify(u, null, 2) + "\n"); wr(path.join(me, "dashboard.html"), rd(PB));
    const r = lib.roadmapFor(u, me), it = r && r.roadmap.items.find(i => i.issue === 64);
    c.push(["from the parent tracking board, as before, its own item with ../roadmap.md#url-policy and the others with none", !!r && r.from === "the parent tracking board" && it && it.ref === "../roadmap.md#url-policy" && it.section === "URL policy" && r.roadmap.items.filter(i => i.ref).length === 1, js(r && r.roadmap.items.filter(i => i.ref))]);
  });

  guard("the rendered Roadmap item Card of a nested tracking board (needs a browser)", c => {
    if (!chrome) { c.push(["the rendered Card (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const probe = 'const cs=[...document.querySelectorAll("#context .card")];const m=cs.find(x=>/^Roadmap item/.test(x.querySelector("h3").textContent));const u=cs.find(x=>/^Roadmap #/.test(x.querySelector("h3").textContent));document.body.dataset.r=JSON.stringify({m:m?m.textContent:"",a:m?[...m.querySelectorAll("a")].map(a=>a.getAttribute("href")):[],first:cs.indexOf(m)<cs.indexOf(u),u:!!u});';
    const page = (name, d) => { const dir = path.join(sc, "page", name), html = withData(rd(PB), "plan", JSON.stringify(d, null, 2)).replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${probe} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
      wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); return wr(path.join(dir, "dashboard.html"), html); };
    const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return {}; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return {}; } };
    const d = nested({ roadmap: { issue: 1, title: "A consolidation (tracking)", asOf: "2026-11-07", items: [{ issue: 2, title: "Phase 0 — History rewrite: purge secrets and data", state: "OPEN", ...ITEM }, { issue: 3, title: "Phase 1 — Build skeleton", state: "OPEN" }] } });
    const g = got(dumpDom(page("item", d), "", "1600,1000", 6000));
    c.push(["a Roadmap item Card before the units' Card: the parent, this issue's item \"1 of 2 items\", \"this board\" and its section linked", g.u && g.first && /#1/.test(g.m || "") && /1 of 2 items/.test(g.m || "") && /Phase 0 — History rewrite: purge secrets and data/.test(g.m || "") && /this board/.test(g.m || "") && /roadmap: Phase 0 — History rewrite/.test(g.m || "") && (g.a || []).some(h => /roadmap\.md#phase-0--history-rewrite$/.test(h)), js(g)]);
    const g0 = got(dumpDom(page("none", nested()), "", "1600,1000", 6000));
    c.push(["no roadmap: no Roadmap item Card, the units' Card as before", g0.u && !g0.m, js(g0)]);
  });

  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets, chrome: null, dumpDom: () => null, withData: null }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1] && x[2] !== "no Chrome or Edge"); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - cases.filter(x => !x[1]).length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
