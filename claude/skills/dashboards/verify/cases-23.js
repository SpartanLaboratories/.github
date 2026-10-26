// The case groups of admin-team/dashboards-skill/23, run by verify-templates.js (it passes its helpers in): (the Timeline tile's phases on
// a landed board, replaced by its step visits in dashboards-skill/32, verify/cases-32.js), the run's start stamped (plan.sized) and each qa pass's time (wip.qa[].at); a reference's section
// number before its excerpt (refNumber: the file's headings win, the anchor's number marked "?" where the file is not there); a work
// level in the pipeline's facts reworded, never written ("inside level 3", "a level-3 re-pass", "Label level: 3"), test-level phrases
// left alone; and the feature probes of this run. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases23(X) {
  const { sk, out, targets, dumpDom, inner, chrome, checker, embedJs, checkJs, node, withData } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), LR = require(sk("system/scripts/levelrefs.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  if (!PB || !WB) return [["the dashboards-skill/23 cases (both plan-set templates under test)", [["both plan-set templates are under test", false, "a repository template set without them skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x));
  const run = (js, a) => cp.spawnSync(process.execPath, [js, ...a], { encoding: "utf8" });
  const APPLY = sk("plan/scripts/apply-event.js"), NEW = sk("plan/scripts/new.js");
  const sc = path.join(out, "skill-23"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const T = { plan: rd(PB), work: rd(WB) };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const probeAt = (html, js) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${js} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  const planPage = (name, d, js) => { const dir = path.join(sc, name); const html = withData(T.plan, "plan", JSON.stringify(d, null, 2)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); return wr(path.join(dir, "dashboard.html"), js ? probeAt(html, js) : html); };
  const wide = (f, h) => dumpDom(f, h || "", "1920,1080", 6000);
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const tree = (name, boards) => { const root = path.join(sc, name); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    boards.forEach(d => { const dir = path.join(root, ...d.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), T.plan); });
    boards.slice().reverse().forEach(d => node(embedJs, path.join(root, ...d.folder.split("/")))); return root; };
  const req = (file, o) => wr(file, JSON.stringify({ v: 1, action: "plan-board", ...o }));
  const apply = (root, rq, at) => { const r = cp.spawnSync(process.execPath, [APPLY, "--event", rq, "--worktree", root, "--no-live", "--at", at, "--json"], { encoding: "utf8" }); let s = {}; try { s = JSON.parse((r.stdout || "{}").trim().split(/\r?\n/).pop() || "{}"); } catch (e) { s = { error: (r.stdout || "") + (r.stderr || "") }; } return { status: r.status, s }; };
  const planOf = (root, folder) => JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json")));
  /* the Timeline tile's probe: the last tile's label, sub-line, segments (class, width) and legend entries, and each shade's colour in
     both themes */
  const TILE = 'const k=[...document.querySelectorAll("#kpis>.kpi")].pop(),segs=[...k.querySelectorAll(".seg-bar i")],key=[...k.querySelectorAll(":scope>.key>span")];const col=()=>segs.map(i=>getComputedStyle(i).backgroundColor);const light=col();document.documentElement.dataset.theme="dark";const dark=col();document.body.dataset.r=JSON.stringify({l:k.querySelector(".l").textContent,s:k.querySelector(".s").textContent,segs:segs.map(i=>[i.className,Math.round(i.getBoundingClientRect().width)]),key:key.map(x=>x.textContent),keyCls:key.map(x=>(x.querySelector("i")||{}).className),light,dark,bar:(k.querySelector(".seg-bar")||{}).getAttribute&&k.querySelector(".seg-bar").getAttribute("aria-label")});';
  /* a computed colour's channels, 0 to 1 (Chrome writes a color-mix() result as "color(srgb r g b)", a plain one as "rgb(r, g, b)") */
  const chans = c => { const m = String(c).match(/[\d.]+/g) || [], v = m.slice(0, 3).map(Number); return /color\(/.test(c) ? v : v.map(x => x / 255); };
  const lum = c => { const v = chans(c); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const landed = f => { const d = copy(EX); f(d); return d; };

  /* 1. the Timeline tile's phases: replaced by its step visits (dashboards-skill/32), whose cases are verify/cases-32.js */

  /* 2. the run's start and the qa passes' times, stamped by the scripts */
  guard("the run's start (plan.sized) and each qa pass's time (wip.qa[].at), stamped by new.js and apply-event.js (dashboards-skill/23)", c => {
    const L0 = copy(LIVE); delete L0.sized; L0.wip.step = "sizing"; L0.wip.current = []; L0.wip.questions = []; L0.wip.research = null;
    const root = tree("sized", [L0]), F0 = L0.folder;
    const a = apply(root, req(path.join(sc, "sized.json"), { github: L0.repo, issue: L0.issue, event: "sized", folder: F0, facts: { step: "research" } }), "2026-10-25T07:00:00Z"), p = planOf(root, F0);
    c.push(["sized stamps plan.sized with the event's time", a.status === 0 && p.sized === "2026-10-25T07:00:00Z" && (a.s.applied || []).includes("sized 2026-10-25T07:00:00Z"), JSON.stringify([a.status, a.s.result, p.sized, a.s.error])]);
    const b = apply(root, req(path.join(sc, "sized2.json"), { github: L0.repo, issue: L0.issue, event: "sized", folder: F0, facts: { step: "research" } }), "2026-10-25T09:00:00Z"), p2 = planOf(root, F0);
    c.push(["a later sized keeps the first stamp (the run started once)", b.status === 0 && p2.sized === "2026-10-25T07:00:00Z", JSON.stringify([b.s.result, p2.sized])]);
    const Q = copy(LIVE); Object.assign(Q, { status: "building" }); Object.assign(Q.wip, { step: "qa", current: ["built"], questions: [], research: null, qa: [] }); Q.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; });
    const rq = tree("qa-at", [Q]), qa = apply(rq, req(path.join(sc, "qa.json"), { github: Q.repo, issue: Q.issue, event: "qa-pass", folder: Q.folder, facts: { qa: { pass: 1, verdict: "approved" } } }), "2026-10-25T11:58:00Z"), pq = planOf(rq, Q.folder);
    c.push(["a qa pass records its time (at) beside its date", qa.status === 0 && pq.wip.qa[0].at === "2026-10-25T11:58:00Z" && pq.wip.qa[0].date === "2026-10-25", JSON.stringify(pq.wip.qa)]);
    const nroot = path.join(sc, "new-root"); fs.mkdirSync(path.join(nroot, "docs", "plans"), { recursive: true });
    const n = run(NEW, ["91", "verification-case", "--root", nroot, "--title", "Verification case", "--function", "Verification case.", "--baseline", "abcdef1", "--date", "2026-10-25", "--repo", "acme/widgets", "--step", "research"]);
    const np = JSON.parse(rd(path.join(nroot, "docs", "plans", "91-verification-case", "plan.json")));
    c.push(["new.js stamps the foundation's sized (an ISO date-time), never the template's placeholder", n.status === 0 && lib.okStamp(np.sized) && np.sized.length > 10, JSON.stringify([n.status, np.sized, (n.stderr || "").slice(0, 120)])]);
    const troot = tree("batch", [copy(TRK)]), tdir = path.join(troot, ...TRK.folder.split("/"));
    const bt = run(NEW, ["--batch", TRK.folder, "--root", troot]);
    const laid = fs.readdirSync(tdir).filter(x => /^\d+-/.test(x) && fs.existsSync(path.join(tdir, x, "plan.json"))).map(x => JSON.parse(rd(path.join(tdir, x, "plan.json"))));
    c.push(["new.js --batch lays unit boards not started: sized null until their own sized event", bt.status === 0 && laid.length > 0 && laid.every(x => x.sized === null), JSON.stringify([bt.status, laid.map(x => [x.issue, x.sized]), (bt.stdout || "").split(/\r?\n/).slice(-2)])]);
  });

  /* 3. a reference's section number before its excerpt */
  guard("a reference's section number before its excerpt: the file's headings win, the anchor's number marked where the file is not there (dashboards-skill/23)", c => {
    const dir = path.join(sc, "refnum"); fs.mkdirSync(dir, { recursive: true });
    wr(path.join(dir, "numbers.md"), "# Numbers\n\n## 4.2 The fix\n\nThe fix.\n\n## 42 Forty-two\n\nForty-two.\n\n## A-3 Appendix\n\nAppendix.\n\n## Notes\n\nNotes.\n");
    const R = ref => lib.refNumberOf(dir, ref);
    c.push(["\"42-the-fix-old\" in a file whose headings hold 4.2 and 42: the heading sharing most of the anchor wins, §4.2", JSON.stringify(R("numbers.md#42-the-fix-old")) === JSON.stringify({ label: "§4.2", from: "headings" }), JSON.stringify(R("numbers.md#42-the-fix-old"))]);
    c.push(["\"42-forty-two-v2\": §42 from the headings", JSON.stringify(R("numbers.md#42-forty-two-v2")) === JSON.stringify({ label: "§42", from: "headings" }), JSON.stringify(R("numbers.md#42-forty-two-v2"))]);
    c.push(["a lettered number, \"a-3-old\": §A-3 from the headings", JSON.stringify(R("numbers.md#a-3-old")) === JSON.stringify({ label: "§A-3", from: "headings" }), JSON.stringify(R("numbers.md#a-3-old"))]);
    c.push(["the file not there: the anchor's leading number as it stands, from the anchor", JSON.stringify(R("missing.md#42-the-fix")) === JSON.stringify({ label: "§42", from: "anchor" }), JSON.stringify(R("missing.md#42-the-fix"))]);
    c.push(["an anchor that leads with no number: none", R("numbers.md#notes-old") === null && R("missing.md#the-fix") === null, JSON.stringify([R("numbers.md#notes-old"), R("missing.md#the-fix")])]);
    c.push(["lib.js refLabel(): the excerpt's heading first, then refNumber (from the anchor marked \"?\"), then the whole anchor", lib.refLabel({ ref: "numbers.md#42-x", excerpt: { heading: "4.2 The fix" } }) === "§4.2" && lib.refLabel({ ref: "numbers.md#42-x", refNumber: { ref: "numbers.md#42-x", label: "§4.2", from: "headings" } }) === "§4.2" && lib.refLabel({ ref: "missing.md#42-x" }) === "§42?" && lib.refLabel({ ref: "missing.md#the-fix" }) === "§ the-fix" && lib.refLabel({ ref: "numbers.md#42-x", label: "my label" }) === "my label",
      [lib.refLabel({ ref: "missing.md#42-x" }), lib.refLabel({ ref: "missing.md#the-fix" })].join(" | ")]);
    /* embed.js writes refNumber where no excerpt could be copied, and drops it once one is */
    const d = copy(EX); d.folder = "docs/plans/38-handshake-empty-name";
    const s0 = d.rows[0].verdict.statements[0], s1 = d.rows[1].verdict.statements[0]; s0.ref = "numbers.md#42-the-fix-old"; delete s0.excerpt; s1.ref = "gone.md#7-a-section"; delete s1.excerpt;
    const root = tree("refnum-tree", [d]), f = path.join(root, ...d.folder.split("/"));
    ["plan.md", "architecture.md", "impact.md", "final-implementation.md"].forEach(x => { const s = sk("plan/examples/38-handshake-empty-name/" + x); if (fs.existsSync(s)) wr(path.join(f, x), rd(s)); });
    wr(path.join(f, "numbers.md"), rd(path.join(dir, "numbers.md"))); node(embedJs, f);
    const p = planOf(root, d.folder), q0 = p.rows[0].verdict.statements[0], q1 = p.rows[1].verdict.statements[0];
    c.push(["embed.js writes refNumber: §4.2 from the headings (the file there, its heading gone), §7 from the anchor (the file not there)", JSON.stringify(q0.refNumber) === JSON.stringify({ ref: "numbers.md#42-the-fix-old", label: "§4.2", from: "headings" }) && JSON.stringify(q1.refNumber) === JSON.stringify({ ref: "gone.md#7-a-section", label: "§7", from: "anchor" }) && !q0.excerpt && !q1.excerpt, JSON.stringify([q0.refNumber, q1.refNumber])]);
    const k = run(checkJs, [f]);
    c.push(["check.js warns on the marked one (its number read from the anchor alone), not on the one the headings decided", /shows "§7\?": the number is read from the anchor alone/.test(k.stdout) && !/shows "§4\.2\?"/.test(k.stdout), (k.stdout || "").split(/\r?\n/).filter(l => /refNumber|anchor alone/.test(l)).join(" | ").slice(0, 300)]);
    if (chrome) {
      const js = 'const a=[...document.querySelectorAll("#board a.sref")];document.body.dataset.r=JSON.stringify({t:a.map(x=>x.textContent),ti:a.map(x=>x.title),k:document.getElementById("timeline-key").textContent,bk:(document.getElementById("built-key")||{}).textContent||""});';
      const pg = path.join(f, "probe.html"); fs.writeFileSync(pg, probeAt(rd(path.join(f, "dashboard.html")), js));
      const r = got(wide(pg)) || {};
      c.push(["the board: \"(§4.2)\" plain, \"(§7?)\" marked, the mark's reason in its title", (r.t || []).includes("(§4.2)") && (r.t || []).includes("(§7?)") && (r.ti || []).some(x => /read from the link's anchor alone/.test(x)), JSON.stringify((r.t || []).slice(0, 6))]);
      c.push(["the Timeline's legend names the mark it drew", /\(§n\?\) a section number read from its link alone/.test(r.k || ""), (r.k || "").slice(-200)]);
      const ex = got(wide(planPage("refnum-example", EX, 'document.body.dataset.r=JSON.stringify({k:document.getElementById("timeline-key").textContent});'))) || {};
      c.push(["a board whose references all have their excerpts draws no mark and names none in its legend", !/\(§n\?\)/.test(ex.k || "x(§n?)"), (ex.k || "").slice(-120)]);
    } else c.push(["the rendered page (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    /* once the heading is there, the excerpt is copied and refNumber goes */
    fs.appendFileSync(path.join(f, "numbers.md"), "\n## 4.2 The fix (old)\n\nThe old fix.\n"); node(embedJs, f);
    const p2 = planOf(root, d.folder), q2 = p2.rows[0].verdict.statements[0];
    c.push(["the heading back in the file: embed.js copies the excerpt and drops refNumber", q2.excerpt && q2.excerpt.heading === "4.2 The fix (old)" && q2.refNumber === undefined && lib.refLabel(q2) === "§4.2", JSON.stringify([q2.excerpt && q2.excerpt.heading, q2.refNumber])]);
    const bad = copy(p2); bad.rows[0].verdict.statements[0].refNumber = { ref: "x.md#7", label: "7" }; wr(path.join(f, "plan.json"), JSON.stringify(bad, null, 2) + "\n");
    const kb = run(checkJs, [f]);
    c.push(["check.js fails a refNumber not in its form", kb.status === 1 && /refNumber must be \{ ref, label: "§n", from: headings \| anchor \}/.test(kb.stdout), (kb.stdout || "").split(/\r?\n/).filter(l => /refNumber/.test(l)).join(" | ").slice(0, 300)]);
  });

  /* 4. a work level in the pipeline's facts, reworded */
  guard("a work level in the pipeline's facts reworded, never written; test-level phrases left alone (levelrefs.js, apply-event.js; dashboards-skill/23)", c => {
    const work = ["inside level 3", "diff inside level 3, hygiene clean", "a level-3 change", "Label level: 3", "level-3 re-pass", "within the level-2 bounds", "outside level 3", "a level-2 fix", "Sized; label level: 2"];
    const tests = ["L1 per-type gating", "Level 4a tests", "the Level 3 pass", "Level 2 unit tests", "inside level 3 integration tests", "L1 gating", "L4a deterministic", "Level 2 — component", "tests at levels 1 to 4c", "inside level 4a", "level-1 line comments", "Level-2 KDoc"];
    c.push(["levelrefs.js finds the scope, re-pass and label phrases", work.every(s => LR.levelRefs(s).length), work.filter(s => !LR.levelRefs(s).length).join(", ")]);
    c.push(["levelrefs.js leaves the test-level phrases (and the documentation rings) alone", tests.every(s => !LR.levelRefs(s).length), tests.filter(s => LR.levelRefs(s).length).map(s => s + " → " + LR.levelRefs(s).join("/")).join(", ")]);
    const want = [["diff inside level 3, hygiene clean", "unit", "diff inside the unit's scope, hygiene clean"], ["The fix stays inside level 3.", "issue", "The fix stays inside the issue's scope."],
      ["The planner runs a level-3 re-pass.", "unit", "The planner runs a re-pass."], ["Level-3 re-pass started", "unit", "Re-pass started"], ["Sized; Label level: 3; research starts", "issue", "Sized; research starts"],
      ["a level-3 issue", "issue", "an issue"], ["an L3 change", "issue", "a change"], ["escalated to level 4 by the user", "issue", "escalated by the user"], ["(#61, level 3)", "issue", "(#61)"],
      ["Is the fix still inside level 3? Label level: 3.", "unit", "Is the fix still inside the unit's scope?"], ["re-levelled to 4", "issue", "re-sized"], ["L1 per-type gating stays", "unit", "L1 per-type gating stays"]];
    const bad = want.filter(([s, k, w]) => LR.scrubLevels(s, { scope: k }) !== w);
    c.push(["scrubLevels() rewords each form (the scope, the elided level with its article mended, the label dropped) and leaves a test level alone", !bad.length, bad.map(([s, k, w]) => `${JSON.stringify(s)} → ${JSON.stringify(LR.scrubLevels(s, { scope: k }))}, not ${JSON.stringify(w)}`).join(" | ")]);
    c.push(["a text that is nothing but a work level gives null (the caller leaves it out)", LR.scrubLevels("Label level: 3", {}) === null && LR.scrubLevels("level: 2.", {}) === null, String(LR.scrubLevels("Label level: 3", {}))]);
    /* the fast path on a sub-issue's board and on an issue board */
    const sub = copy(LIVE); sub.folder = "docs/plans/55-http-client-stack/70-live-verification"; sub.parent = { issue: 55, board: null };
    sub.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; });
    const rs = tree("lv-sub", [sub]), h = apply(rs, req(path.join(sc, "lv-halt.json"), { github: sub.repo, issue: sub.issue, event: "halted", folder: sub.folder, facts: { waitingOn: "Is the fix still inside level 3? Label level: 3." } }), "2026-10-25T12:00:00Z"), ps = planOf(rs, sub.folder);
    c.push(["a halt on a sub-issue's board: what waits on the user reworded, the unit's scope, enrich yes with the new wording", h.status === 0 && ps.wip.waitingOn === "Is the fix still inside the unit's scope?" && h.s.enrich === "yes" && (h.s.why || []).some(x => /facts\.waitingOn named a work level, which a board never shows: written reworded/.test(x)) && !LR.levelRefsIn(ps, "", []).length, JSON.stringify([h.s.result, ps.wip.waitingOn, h.s.why, h.s.error]).slice(0, 400)]);
    const rr = apply(rs, req(path.join(sc, "lv-rem.json"), { github: sub.repo, issue: sub.issue, event: "implementation-stage", folder: sub.folder, facts: { step: "remediation", remediation: { pass: 1, route: "planner-then-rookie-dev", steps: [{ name: "planner: a level-3 re-pass of plan §9", state: "current" }, { name: "rookie-dev: L1 per-type gating classes", state: "todo" }] } } }), "2026-10-25T12:10:00Z"), pr = planOf(rs, sub.folder);
    c.push(["a remediation's sub-steps: \"a level-3 re-pass\" reads \"a re-pass\", \"L1 per-type gating\" kept, the role labels dropped, the route's older id read as its neutral one", rr.status === 0 && pr.wip.remediation && pr.wip.remediation.steps[0].name === "a re-pass of plan §9" && pr.wip.remediation.steps[1].name === "L1 per-type gating classes" && pr.wip.remediation.route === "re-plan-then-remediation", JSON.stringify([rr.s.result, pr.wip.remediation, rr.s.error]).slice(0, 300)]);
    const brn = copy(LIVE); Object.assign(brn.wip, { step: "branch", current: [], questions: [], research: null }); const rb = tree("lv-branch", [brn]), was = brn.branch;
    const bc = apply(rb, req(path.join(sc, "lv-branch.json"), { github: brn.repo, issue: brn.issue, event: "branch-cut", folder: brn.folder, facts: { branch: "feat/issue-70-level-3-fix" } }), "2026-10-25T12:20:00Z"), pb = planOf(rb, brn.folder);
    c.push(["an identifier is never reworded: a branch that names a work level is left out, the presenter told", bc.status === 0 && pb.branch === was && (bc.s.why || []).some(x => /facts\.branch names a work level, which a board never shows: not written/.test(x)), JSON.stringify([bc.s.result, pb.branch, bc.s.error])]);
    const q62 = J("verify/fixtures/qa-pass-62.request.json"), iss = copy(LIVE); iss.status = "building"; Object.assign(iss.wip, { step: "qa", current: ["built"], questions: [], research: null, qa: [] });
    iss.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; });
    const ri = tree("lv-62", [iss]), q = apply(ri, wr(path.join(sc, "lv-62.json"), JSON.stringify({ ...q62, issue: iss.issue, folder: iss.folder, $comment: undefined })), "2026-10-25T11:58:00Z"), pi = planOf(ri, iss.folder);
    c.push(["the WebTools #62 qa-pass event: its detail written with \"diff inside the issue's scope\", the rest of it kept", q.status === 0 && /^Code review PASS: no logic bug, every plan item done, diff inside the issue's scope, hygiene clean\. Doc: Level-2 KDoc complete/.test(pi.wip.detail || "") && !LR.levelRefs(pi.wip.detail || "").length, (pi.wip.detail || q.s.error || "").slice(0, 160)]);
  });

  /* 5. this run's feature probes */
  guard("the feature probes of dashboards-skill/23: on the templates, missed by the templates dashboards-skill/22 left, a work level in a board's data", c => {
    const ids = ["timeline-phases", "ref-number", "level-phrases"], mine = F.FEATURES.filter(f => f.since === 23);
    c.push(["features.js holds this run's three detectors, tagged dashboards-skill/23", JSON.stringify(mine.map(f => f.id).sort()) === JSON.stringify(ids.slice().sort()), mine.map(f => f.id).join(", ")]);
    c.push(["the plan-board template carries each", !F.probe(T.plan, "plan-board").length, F.probe(T.plan, "plan-board").map(F.line).join(" | ")]);
    c.push(["the work-board template carries the one it takes (no work level in its data)", !F.probe(T.work, "work-board").length && F.applicable("work-board").filter(f => f.since === 23).map(f => f.id).join(",") === "level-phrases", F.probe(T.work, "work-board").map(F.line).join(" | ")]);
    ["system", "supersystem"].forEach(k => { const t = tp(`system/template/${k}.html`); if (t) c.push([`the ${k} template carries the one it takes`, !F.probe(rd(t), k).length && F.applicable(k).filter(f => f.since === 23).map(f => f.id).join(",") === "level-phrases", F.probe(rd(t), k).map(F.line).join(" | ")]); });
    /* a recorded version, from verify/history/ or rebuilt from the mirror's git history (system/scripts/history.js) */
    const hist = (n, note) => require(sk("system/scripts/history.js")).readVersion(sk(n), x => new RegExp(note).test(x.note || ""), { historyRepo: X.historyRepo });
    const oldP = hist("plan/template/dashboard.html", "dashboards-skill/22 left");
    c.push(["the plan-board template as dashboards-skill/22 left it misses the Timeline phases and the section number", !!oldP && ["timeline-phases", "ref-number"].every(id => F.probe(oldP, "plan-board").some(m => m.id === id)), oldP ? F.probe(oldP, "plan-board").map(m => m.id).join(", ") : "no recorded history"]);
    const withLevel = withData(T.plan, "plan", JSON.stringify({ ...copy(LIVE), wip: { ...copy(LIVE).wip, detail: "Code review PASS: diff inside level 3." } }, null, 2));
    const m = F.probe(withLevel, "plan-board").find(x => x.id === "level-phrases");
    c.push(["a board whose data names \"inside level 3\" misses no work level in its data, with the hit named", !!m && /inside level 3/.test(m.why), m ? F.line(m) : "not reported"]);
    const sys = tp("system/template/system.html");
    if (sys) { const h = rd(sys).replace(/(<script type="application\/json" id="state">)([\s\S]*?)(<\/script>)/, (x, a, b, z) => { let s; try { s = JSON.parse(b); } catch (e) { return x; } s.lastAmended = { ...(s.lastAmended || {}), issue: 9, title: "a level-3 re-pass" }; return a + "\n" + JSON.stringify(s) + "\n" + z; });
      /* dashboards-skill/28: lastAmended.title quotes the issue's title, which the probe leaves out (a work level there is the issue's
         defect, flagged by check-board.js); the same words in any other field of the state still miss the feature */
      const h2 = h.replace(/(<script type="application\/json" id="state">)([\s\S]*?)(<\/script>)/, (x, a, b, z) => { let s; try { s = JSON.parse(b); } catch (e) { return x; } s.version = "a level-3 re-pass"; return a + "\n" + JSON.stringify(s) + "\n" + z; });
      c.push(["a system board whose state names \"a level-3 re-pass\" misses it too (the data-only path's probe), its quoted title aside", F.probe(h2, "system").some(x => x.id === "level-phrases") && !F.probe(h, "system").some(x => x.id === "level-phrases"), F.probe(h2, "system").map(x => x.id).join(", ")]); }
    ["system", "supersystem", "work-board"].forEach(k => c.push([`the Timeline phases and the section number are not held to a ${k} page (each names why it does not fit)`, mine.filter(f => f.id !== "level-phrases").every(f => !f.types.includes(k) && f.notFor && f.notFor[k]), mine.map(f => f.id + ": " + (f.notFor || {})[k]).join(" | ").slice(0, 300)]));
  });
  return groups;
};
