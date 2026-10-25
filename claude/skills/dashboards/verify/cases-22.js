// The case groups of admin-team/dashboards-skill/22, run by verify-templates.js (it passes its helpers in): the KPI tiles' legends inside
// each tile, the larger charging arrow, the team-raised "landing" event, the header (no "board" tag, the title's #n the GitHub link, the
// issue line the GitHub title alone, "since" said once beside a step panel), board.js keeping "unassigned": true from every checkout, the
// research-planning glow on a board with and without rows, the Tests tab (data, fast path, checks, the tracking mirror, the page), and the
// feature probes of this run. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases22(X) {
  const { sk, out, targets, dumpDom, inner, chrome, checker, embedJs, checkJs, node, withData } = X;
  const lib = require(sk("plan/scripts/lib.js")), TL = require(sk("plan/scripts/testslib.js")), F = require(sk("system/scripts/features.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  if (!PB || !WB) return [["the dashboards-skill/22 cases (both plan-set templates under test)", [["both plan-set templates are under test", false, "a repository template set without them skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x));
  const text = h => (h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  const run = (js, a, env) => cp.spawnSync(process.execPath, [js, ...a], { encoding: "utf8", env: { ...process.env, ...(env || {}) } });
  const APPLY = sk("plan/scripts/apply-event.js"), BOARD = sk("plan/scripts/board.js"), NEW = sk("plan/scripts/new.js");
  const sc = path.join(out, "skill-22"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const T = { plan: rd(PB), work: rd(WB) };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), SUB = J("verify/fixtures/sub-issue.plan.json"), WBJ = J("verify/fixtures/work-board.json");
  /* a page with a probe that writes its result, JSON, on body[data-r] once the page has drawn */
  const probeAt = (html, js) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${js} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  const planPage = (name, d, js) => { const dir = path.join(sc, name); const html = withData(T.plan, "plan", JSON.stringify(d, null, 2)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); return wr(path.join(dir, "dashboard.html"), js ? probeAt(html, js) : html); };
  const workPage = (name, d) => { const dir = path.join(sc, name); wr(path.join(dir, "board.js"), lib.sidecarText("board", JSON.stringify(d, null, 2))); return wr(path.join(dir, "index.html"), withData(T.work, "board", JSON.stringify(d, null, 2))); };
  const wide = (f, h) => dumpDom(f, h || "", "1920,1080", 6000);
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  /* a scratch tree: docs/plans/<folder>/ with a board made from the template under test (template plus data, embedded) */
  const tree = (name, boards) => { const root = path.join(sc, name); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    boards.forEach(d => { const dir = path.join(root, ...d.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), T.plan); });
    boards.slice().reverse().forEach(d => node(embedJs, path.join(root, ...d.folder.split("/")))); return root; };
  const req = (file, o) => wr(file, JSON.stringify({ v: 1, action: "plan-board", ...o }));
  const apply = (root, rq, at) => { const r = cp.spawnSync(process.execPath, [APPLY, "--event", rq, "--worktree", root, "--no-live", "--at", at, "--json"], { encoding: "utf8" }); let s = {}; try { s = JSON.parse((r.stdout || "{}").trim().split(/\r?\n/).pop() || "{}"); } catch (e) { s = { error: (r.stdout || "") + (r.stderr || "") }; } return { status: r.status, s }; };
  const planOf = (root, folder) => JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json")));
  /* the example as a board whose run is under way: every verdict written, nothing built yet */
  const building = () => { const d = copy(EX); Object.assign(d, { status: "building", asBuilt: { ref: "master", sha: d.baseline.sha, date: d.baseline.date } }); d.rows.forEach(r => { r.asBuilt = { state: "pending" }; }); d.milestones = d.milestones.filter(m => m.column !== "built"); return d; };

  /* 1. the KPI tiles: each tile's legend inside the tile; no shared row under them, so every tile keeps its share of the row */
  guard("the KPI tiles' legends inside each tile, the tiles at their full width (dashboards-skill/22)", c => {
    if (!chrome) { c.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const js = 'const K=document.querySelector(".kpis"),ts=[...K.querySelectorAll(":scope>.kpi")];document.body.dataset.r=JSON.stringify({w:Math.round(K.getBoundingClientRect().width),t:ts.map(t=>{const b=t.getBoundingClientRect();return [Math.round(b.width),Math.round(b.top),!!t.querySelector(".seg-bar"),!!t.querySelector(":scope>.key")];}),shared:!!K.querySelector(":scope>.key")});';
    [["the live fixture (research)", LIVE], ["the tracking fixture", TRK]].forEach(([w, d], i) => {
      const r = got(wide(planPage("kpi-" + i, d, js))) || {};
      const ok = r.t && r.t.length === 5 && !r.shared && r.t.every(x => x[0] >= r.w * 0.18 && x[1] === r.t[0][1]) && r.t.every(x => x[2] === x[3]);
      c.push([`${w}: five tiles in one row, each over a sixth of it, each bar with its own legend inside its tile, no shared legend row (1920 px)`, !!ok, JSON.stringify(r)]); });
    /* a landed board (dashboards-skill/32): four tiles in one row, each over a fifth of it, and the Timeline across the row below it; the
       example records no time, so its Timeline has a legend (its visits) and no bar */
    { const r = got(wide(planPage("kpi-landed", EX, js))) || {}, t = r.t || [], four = t.slice(0, 4), tl = t[4];
      const ok = t.length === 5 && !r.shared && four.every(x => x[0] >= r.w * 0.22 && x[1] === four[0][1] && x[2] === x[3]) && tl && tl[0] >= r.w * 0.98 && tl[1] > four[0][1] && tl[3];
      c.push(["the example (landed): four tiles in one row, each over a fifth of it, each bar with its legend inside its tile, the Timeline across the row below with its legend, no shared legend row (1920 px)", !!ok, JSON.stringify(r)]); }
    const rw = got(dumpDom(wr(path.join(sc, "kpi-work", "index.html"), probeAt(withData(T.work, "board", JSON.stringify(WBJ, null, 2)), js)), "", "1920,1080", 6000)) || {};
    c.push(["the work board: its tiles' bars each carry their legend inside the tile, as before", !!rw.t && rw.t.every(x => x[2] === x[3]) && !rw.shared, JSON.stringify(rw)]);
    c.push(["the template draws no shared legend row (no kpi-key) and no CSS for one", !/kpi-key|kpikey/.test(T.plan) && /\.kpi \.key\{/.test(T.plan), "template"]);
  });

  /* 2. the larger charging arrow, during the plan step */
  guard("the larger charging arrow (dashboards-skill/22)", c => {
    if (!chrome) { c.push(["the rendered page (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const d = copy(LIVE); Object.assign(d.wip, { step: "plan", current: ["considered", "verdict"], questions: [], research: null, plan: { state: "writing", since: "2026-10-25T05:00:00Z" } });
    const js = 'const c=document.querySelector(".cell.verdict.charging"),s=c?getComputedStyle(c,"::before"):null,k=document.querySelector(".key i.chg");document.body.dataset.r=JSON.stringify({n:document.querySelectorAll(".cell.verdict.charging").length,h:s&&s.height,w:s&&parseFloat(s.width),gap:parseFloat(getComputedStyle(document.querySelector(".board")).columnGap),kw:k&&getComputedStyle(k).width,kh:k&&getComputedStyle(k).height});';
    const r = got(wide(planPage("charging", d, js))) || {};
    c.push(["the arrow is 22 px tall and reaches over both cells' edges (wider than the column gap)", r.n > 0 && r.h === "22px" && r.w >= r.gap + 12, JSON.stringify(r)]);
    c.push(["its legend swatch is the larger arrow too (30 x 18 px)", r.kw === "30px" && r.kh === "18px", JSON.stringify(r)]);
  });

  /* 3. the team-raised "landing" event: the admin team accepts the land and moves the board to the landing before it merges */
  guard("the team-raised landing event (apply-event.js; plan/RULES.md §4)", c => {
    const ex = copy(EX); Object.assign(ex, { status: "building", asBuilt: { ref: "master", sha: ex.baseline.sha, date: ex.baseline.date } });
    ex.wip = { ...ex.wip, step: "landing", current: [], event: { name: "qa-pass", at: "2026-10-25T09:00:00Z" } }; ex.rows.forEach(r => { r.asBuilt.state = "pending"; }); ex.milestones = ex.milestones.filter(m => m.column !== "built");
    const root = tree("landing", [ex]), F0 = ex.folder, rq = req(path.join(sc, "landing.json"), { github: ex.repo, issue: ex.issue, event: "landing", folder: F0, facts: { pr: 59 } });
    c.push(["lib.js EVENTS names landing, between escalated and landed", lib.EVENTS.indexOf("landing") === lib.EVENTS.indexOf("landed") - 1, lib.EVENTS.join(", ")]);
    const a = apply(root, rq, "2026-10-25T10:00:00Z"), p = planOf(root, F0);
    c.push(["applied: step landing, wip.event landing with its note, the detail and the trail entry, no enrichment", a.status === 0 && a.s.result === "ok" && p.wip.step === "landing" && p.wip.event.name === "landing" && /PR #59/.test(p.wip.event.note || "") && p.wip.detail === "Landing: the admin team merges it in PR #59." && p.trail.some(t => t.label === "Landing: the admin team merges it in PR #59" && t.ref === "PR #59") && a.s.enrich === "no" && p.status === "building", JSON.stringify(a.s).slice(0, 300)]);
    const b = apply(root, rq, "2026-10-25T10:05:00Z");
    c.push(["the same event twice changes nothing (duplicate)", b.status === 0 && b.s.result === "duplicate", b.s.result]);
    if (chrome) { const dom = wide(path.join(root, ...F0.split("/"), "dashboard.html")), sp = inner(dom, '<div class="sp[^"]*"[^>]*>', "div");
      c.push(["the landing step panel says the admin team has accepted the land and is merging it, with its pull request", /^<h3 class="sp-t">Landing<\/h3>/.test(sp) && /the admin team has accepted the land and is merging it in <a [^>]*>PR #59<\/a>/.test(sp), text(sp).slice(0, 200)]); }
    /* from a halt at the landing: the halt is cleared */
    const h = copy(ex); h.wip = { ...h.wip, step: "halted", resume: "landing", waitingOn: "Verification case: a question.", current: [], event: { name: "halted", at: "2026-10-25T09:30:00Z" } };
    const rootH = tree("landing-halted", [h]), aH = apply(rootH, req(path.join(sc, "landing-h.json"), { github: h.repo, issue: h.issue, event: "landing", folder: F0, facts: {} }), "2026-10-25T10:00:00Z"), pH = planOf(rootH, F0);
    c.push(["from a halt at the landing, the halt is cleared and the step is the landing", aH.status === 0 && pH.wip.step === "landing" && !pH.wip.resume && !pH.wip.waitingOn && pH.wip.detail === "Landing: the admin team merges it.", JSON.stringify(aH.s.applied || aH.s.error)]);
    /* refused on a board that has landed: nothing changes */
    const rootL = tree("landing-landed", [copy(EX)]), before = rd(path.join(rootL, ...F0.split("/"), "plan.json"));
    const aL = apply(rootL, req(path.join(sc, "landing-l.json"), { github: EX.repo, issue: EX.issue, event: "landing", folder: F0, facts: {} }), "2026-10-25T10:00:00Z");
    c.push(["refused on a board that has landed (exit 1), the board as it was", aL.status === 1 && /landed already/.test(aL.s.error || "") && rd(path.join(rootL, ...F0.split("/"), "plan.json")) === before, aL.s.error]);
    /* a sub-issue: the tracking board's mirror of its run follows (re-embedded), the standing rule untouched */
    const trk = copy(TRK); trk.rows.forEach(r => { delete r.unit.tests; delete r.unit.live; });
    const subF = trk.folder + "/47-java-floor", sub = building(); Object.assign(sub, { issue: 47, slug: "47-java-floor", folder: subF, title: "Java 11 floor", issueTitle: "Java 11 floor", parent: { issue: 55 }, branch: "fix/issue-47-java-floor" });
    sub.wip = { ...sub.wip, step: "landing", current: [], questions: [], research: null, qa: [{ pass: 1, verdict: "approved", date: "2026-10-25", findings: {} }], event: { name: "qa-pass", at: "2026-10-25T09:00:00Z" }, updated: "2026-10-25T09:00:00Z" };
    const rootS = tree("landing-sub", [trk, sub]), aS = apply(rootS, req(path.join(sc, "landing-s.json"), { github: sub.repo, issue: 47, event: "landing", folder: subF, facts: { pr: 77 } }), "2026-10-25T10:00:00Z");
    const pt = planOf(rootS, trk.folder), u = pt.rows.find(r => r.id === "java-floor");
    c.push(["a sub-issue's landing reaches its tracking board: the unit's mirror reads the landing, the unit's row and wip.next untouched", aS.status === 0 && u.unit.live && u.unit.live.step === "landing" && u.unit.live.event && u.unit.live.event.name === "landing" && ((u.asBuilt || {}).state) === ((TRK.rows.find(r => r.id === "java-floor").asBuilt || {}).state) && pt.wip.next === TRK.wip.next, JSON.stringify({ r: aS.s.result, e: aS.s.error, parent: aS.s.parent, live: u.unit.live && u.unit.live.step })]);
  });

  /* 4. the header: no "board" tag, the title's #n the GitHub link, the issue line the GitHub title alone; "since" said once */
  guard("the header and the strip: no \"board\" tag, the title's #n, the issue line, \"since\" said once (dashboards-skill/22)", c => {
    if (!chrome) { c.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const dI = wide(planPage("hdr-issue", LIVE)), h1 = inner(dI, '<h1 id="h1">', "h1"), il = inner(dI, '<p class="issueline" id="issueline">', "p"), chips = inner(dI, '<div class="chips" id="chips">', "div");
    c.push(["the title's #n opens the GitHub issue", new RegExp(`<a class="ghn" href="https://github\\.com/${LIVE.repo}/issues/${LIVE.issue}"[^>]*>#${LIVE.issue}</a>`).test(h1) && text(h1) === `#${LIVE.issue} · ${LIVE.title}`, h1.slice(0, 200)]);
    c.push(["the issue line carries the issue's GitHub title alone", text(il) === LIVE.issueTitle && !/GitHub issue|<a /.test(il), il.slice(0, 200)]);
    c.push(["no \"board\" tag (plan.json · n rows · n options) on a plan board", !/<span class="ck">board<\/span>/.test(chips) && !/plan\.json<\/b> ·/.test(chips), text(chips).slice(0, 200)]);
    const head = inner(dI, '<div class="wip-head">', "div"), sp = inner(dI, '<div class="sp[^"]*"[^>]*>', "div");
    c.push(["an issue board's strip head line has no \"since\" while its step panel is drawn; the panel says it", !/since/.test(text(head)) && /<span class="l">since<\/span>/.test(sp), text(head)]);
    const dL = wide(planPage("hdr-landed", EX)), headL = inner(dL, '<div class="wip-head">', "div");
    c.push(["a landed board, with no step panel, keeps the head line's \"since\"", /since/.test(text(headL)) && !/<div class="sp[ "]/.test(dL), text(headL)]);
    const dT = wide(planPage("hdr-tracking", TRK)), ub = inner(dT, '<div class="wb unit[^"]*"[^>]*>', "div"), spT = inner(dT, '<div class="sp[^"]*"[^>]*>', "div");
    c.push(["a tracking board's unit bubble has no \"since\" group beside its step panel; the panel says \"waiting since\"", !!ub && !/<span class="l">since<\/span>/.test(ub) && /<span class="l">updated<\/span>/.test(ub) && /<span class="l">waiting since<\/span>/.test(spT), text(ub).slice(0, 200)]);
    const own = copy(TRK); own.status = "planned"; own.rows.forEach(r => { r.asBuilt = { state: "pending", summary: "" }; delete r.unit.live; delete r.unit.issue; delete r.unit.board; }); own.wip = { ...own.wip, step: "sub-issues", current: ["units"], next: own.rows[0].id, resume: null, waitingOn: null, event: { name: "architecture-signed-off", at: "2026-10-21T10:00:00Z" } };
    const dO = wide(planPage("hdr-own", own)), headO = inner(inner(dO, '<div class="wb phase[^"]*"[^>]*>', "div"), '<div class="wip-head">', "div");
    c.push(["a tracking board at its own step (sub-issues), its own panel drawn: the phase's head line has no \"since\"", !/since/.test(text(headO)) && /<span class="l">since<\/span>/.test(dO), text(headO)]);
    const dW = wide(workPage("hdr-work", WBJ)), chipsW = inner(dW, '<div class="chips" id="chips">', "div");
    c.push(["no \"board\" tag (board.json · n runs) on the work board", !/<span class="ck">board<\/span>/.test(chipsW) && !/board\.json<\/b>/.test(chipsW), text(chipsW)]);
  });

  /* 5. board.js keeps "unassigned": true across live regenerations from any checkout (the decision read from every board it knows) */
  guard("board.js keeps \"unassigned\": true from every checkout's boards (dashboards-skill/22)", c => {
    const base = path.join(sc, "unassigned"), main = path.join(base, "main"), wt = path.join(base, "wt"), git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8" });
    fs.mkdirSync(path.join(main, "docs", "plans"), { recursive: true });
    if (git(main, "init", "-q", "-b", "master").status !== 0) { c.push(["git is available", false, "git init failed"]); return; }
    git(main, "remote", "add", "origin", "https://github.com/acme/widgets.git");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const row = (n, extra) => ({ issue: n, title: `Verification case #${n}`, state: "OPEN", created: "2026-10-01", parent: null, waitsOn: [], blocks: [], board: null, folder: null, branch: null, system: null, step: null, detail: "", qa: [], status: "not-started", active: false, landed: null, reconciliation: null, ...(extra || {}) });
    const board = (rows, un) => JSON.stringify({ schema: "work-board/1", repo: "acme/widgets", generated: "2026-10-24T00:00:00Z", asOf: "2026-10-24", tree: {}, links: {}, systems: [], groups: [], rows, roadmap: [], unscheduled: un }, null, 2) + "\n";
    /* the committed board lacks the decisions */
    wr(path.join(main, "docs", "plans", "board.json"), board([row(71), row(73)], [{ issue: 72, title: "Verification case #72", labels: [], created: "2026-10-02", system: null }]));
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "verify: the committed board");
    const w = git(main, "worktree", "add", "-q", wt, "-b", "feature");
    if (w.status !== 0) { c.push(["a worktree can be added", false, w.stderr]); return; }
    /* the decisions live only on the main checkout's live board: #71 (a boardless row), #72 (unscheduled) and #73 (recorded as an
       unscheduled issue there, a row now) */
    wr(path.join(main, "docs", "plans", ".live", "board.json"), board([row(71, { unassigned: true })], [{ issue: 72, title: "Verification case #72", labels: [], created: "2026-10-02", system: null, unassigned: true }, { issue: 73, title: "Verification case #73", labels: [], created: "2026-10-03", system: null, unassigned: true }]));
    const fx = wr(path.join(base, "tracker.json"), JSON.stringify({ issues: [71, 72, 73].map(n => ({ number: n, title: `Verification case #${n}`, state: "OPEN", stateReason: null, labels: n === 72 ? [] : [{ name: "level: 1" }], createdAt: `2026-10-0${n - 70}T00:00:00Z` })), prs: [], branches: [], graph: {} }));
    const env = { DASHBOARDS_TRACKER_FIXTURE: fx };
    const dec = (f, n, key) => { try { const b = JSON.parse(rd(f)); return ((b[key || "rows"] || []).find(r => r.issue === n) || {}).unassigned === true; } catch (e) { return false; } };
    const rA = run(BOARD, ["--live", "--root", wt], env), fA = path.join(wt, "docs", "plans", ".live", "board.json");
    c.push(["regenerated live from a worktree whose committed board lacks the decisions: #71, #72 and #73 keep \"unassigned\" (read from the main checkout's live board)", rA.status === 0 && dec(fA, 71) && dec(fA, 72, "unscheduled") && dec(fA, 73) && !/no system recorded/.test(rA.stdout), (rA.stdout + rA.stderr).trim().split(/\r?\n/).slice(-2).join(" | ")]);
    fs.rmSync(path.join(main, "docs", "plans", ".live", "board.json"));
    const rB = run(BOARD, ["--live", "--root", main], env), fB = path.join(main, "docs", "plans", ".live", "board.json");
    c.push(["the main checkout's live board, regenerated after its own was lost, takes them back from the worktree's", rB.status === 0 && dec(fB, 71) && dec(fB, 72, "unscheduled") && dec(fB, 73), (rB.stdout + rB.stderr).trim().split(/\r?\n/).slice(-2).join(" | ")]);
    const rC = run(BOARD, ["--root", main], env), fC = path.join(main, "docs", "plans", "board.json");
    c.push(["the committed board, regenerated at a landing, records them too", rC.status === 0 && dec(fC, 71) && dec(fC, 72, "unscheduled") && dec(fC, 73), (rC.stdout + rC.stderr).trim().split(/\r?\n/).slice(-2).join(" | ")]);
    c.push(["a row's decision recorded on its unscheduled entry carries over (#73), and is never reported missing", dec(fA, 73) && !/#73/.test((rA.stdout || "") + (rB.stdout || "")), "#73"]);
  });

  /* 6. the research-planning glow: a board with rows glows its whole Considered column, a board with no rows glows nothing */
  guard("the research-planning glow, with rows and without (plan/RULES.md §3)", c => {
    const withRows = copy(LIVE); withRows.wip = { ...withRows.wip, step: "research", questions: [], research: null, current: [], event: { name: "sized", at: "2026-10-25T03:00:00Z" } };
    const noRows = copy(withRows); noRows.rows = []; noRows.milestones = []; noRows.impact = null; delete noRows.issueBoards;
    const F0 = LIVE.folder, ev = d => req(path.join(sc, `rp-${d}.json`), { github: LIVE.repo, issue: LIVE.issue, event: "research-planning", folder: F0, facts: { drafted: 1 } });
    const rootA = tree("rp-rows", [withRows]), a = apply(rootA, ev("a"), "2026-10-25T04:00:00Z"), pa = planOf(rootA, F0);
    c.push(["a board with rows (a sub-issue's re-pass from its parent's plan): the whole Considered column glows", a.status === 0 && JSON.stringify(pa.wip.current) === '["considered"]', JSON.stringify(pa.wip.current)]);
    const rootB = tree("rp-none", [noRows]), b = apply(rootB, ev("b"), "2026-10-25T04:00:00Z"), pb = planOf(rootB, F0);
    c.push(["a board with no rows: nothing glows (wip.current empty)", b.status === 0 && Array.isArray(pb.wip.current) && pb.wip.current.length === 0, JSON.stringify(pb.wip.current)]);
    c.push(["lib.js glowMismatch() holds both: no warning on either, a warning on a rowless board that glows the column", !lib.glowMismatch(pa) && !lib.glowMismatch(pb) && !!lib.glowMismatch({ ...pb, wip: { ...pb.wip, current: ["considered"] } }), JSON.stringify(lib.glowMismatch({ ...pb, wip: { ...pb.wip, current: ["considered"] } }))]);
    if (chrome) { const dom = wide(path.join(rootB, ...F0.split("/"), "dashboard.html"));
      c.push(["the rowless board draws no glow: no washed column head, no glowing band; the step panel shows the planning", !/colhead phase colon/.test(dom) && !/<div class="band[^"]*glow/.test(dom) && /Planning the research questions/.test(text(inner(dom, '<div class="sp[^"]*"[^>]*>', "div"))), "rendered"]); }
    const nroot = path.join(sc, "rp-new"); fs.mkdirSync(path.join(nroot, "docs", "plans"), { recursive: true });
    const n = run(NEW, ["91", "verification-case", "--root", nroot, "--title", "Verification case", "--function", "Verification case.", "--baseline", "master@abcdef1", "--date", "2026-10-25", "--systems", "webtools-udp", "--level", "3", "--repo", "acme/widgets", "--step", "research"]);
    let pn = null; try { pn = JSON.parse(rd(path.join(nroot, "docs", "plans", "91-verification-case", "plan.json"))); } catch (e) { /* reported */ }
    c.push(["new.js lays a board at research with nothing glowing (it has no rows yet)", !!pn && Array.isArray(pn.wip.current) && pn.wip.current.length === 0, (n.stdout + n.stderr).trim().split(/\r?\n/).slice(-1)[0]]);
  });

  /* 7. the Tests tab: the data and the fast path (testslib.js, apply-event.js) */
  guard("the Tests tab's data: facts.tests through apply-event.js, the checks, the tracking mirror (dashboards-skill/22)", c => {
    const d = building(), F0 = d.folder; d.branch = "fix/issue-38-live";
    d.wip = { ...d.wip, step: "implementation", questions: [], research: null, current: ["validity-rule.built"], stages: [{ id: "S1", name: "the parse outcome", state: "current", rows: ["validity-rule"] }, { id: "S2", name: "the routing", state: "todo", rows: ["routing"] }], event: { name: "branch-cut", at: "2026-10-25T05:00:00Z" } };
    const root = tree("tests-fast", [d]), U = "webtools-udp/src/test/kotlin/com/spartanlabs/testing";
    const stage = { stage: "S1", stages: [{ id: "S1", name: "the parse outcome", state: "done" }, { id: "S2", name: "the routing", state: "current" }],
      tests: { base: "master", added: [{ class: "com.spartanlabs.testing.component.udp.HandshakeParseTest", module: "webtools-udp", tests: 5, rows: ["validity-rule", "no-such-row"] }, { name: "" }], amended: [{ class: "HandshakeCoordinatorTest", module: "webtools-udp", path: `${U}/component/udp/HandshakeCoordinatorTest.kt`, rows: ["routing"] }] } };
    const rq1 = req(path.join(sc, "tests-1.json"), { github: d.repo, issue: d.issue, event: "implementation-stage", folder: F0, facts: stage });
    const a = apply(root, rq1, "2026-10-25T06:00:00Z"), p = planOf(root, F0), t = p.tests || {};
    const add = (t.added || [])[0] || {}, am = (t.amended || [])[0] || {};
    c.push(["an implementation stage's facts.tests: Added and Amended written, each class's test level from its package or path, its stage, its rows", a.status === 0 && t.base === "master" && t.updated === "2026-10-25T06:00:00Z" && add.testLevel === "2" && add.stage === "S1" && JSON.stringify(add.rows) === '["validity-rule"]' && am.testLevel === "2" && am.class === "HandshakeCoordinatorTest" && (t.added || []).length === 1, JSON.stringify(t).slice(0, 300)]);
    c.push(["what could not be used (a row not on the board, a class with no name) is left out and named for the presenter: enrich", a.s.enrich === "yes" && a.s.why.some(w => /no-such-row/.test(w)) && a.s.why.some(w => /no class/.test(w)), JSON.stringify(a.s.why)]);
    const a2 = apply(root, rq1, "2026-10-25T06:10:00Z");
    c.push(["the same event twice changes nothing (duplicate)", a2.status === 0 && a2.s.result === "duplicate", a2.s.result]);
    const qa = { qa: { pass: 1, verdict: "approved" }, tests: { ran: [{ class: "com.spartanlabs.testing.component.udp.HandshakeParseTest", module: "webtools-udp", passed: 5 }, { class: "HandshakeCoordinatorTest", module: "webtools-udp", passed: 40, failed: 1 }, { class: "MultiConnectionUDPServerTest", module: "webtools-udp", testLevel: "3", passed: 22 }], other: { byModule: { "webtools-udp": { "1": 9, "2": { classes: 31, tests: 212 } } } } } };
    const aq = apply(root, req(path.join(sc, "tests-2.json"), { github: d.repo, issue: d.issue, event: "qa-pass", folder: F0, facts: qa }), "2026-10-25T07:00:00Z"), pq = planOf(root, F0), tq = pq.tests || {};
    const rel = (tq.relevant || [])[0] || {};
    c.push(["a qa pass's facts.tests.ran: each class's latest result with its pass; a class in no list goes to Relevant; Other's counts", aq.status === 0 && tq.added[0].result.state === "passed" && tq.added[0].result.pass === 1 && tq.amended[0].result.state === "failed" && tq.amended[0].result.failed === 1 && rel.class === "MultiConnectionUDPServerTest" && rel.testLevel === "3" && rel.tests === 22 && rel.result.state === "passed" && tq.other.byModule["webtools-udp"]["2"].tests === 212, JSON.stringify(tq).slice(0, 400)]);
    const ck = node(checkJs, path.join(root, ...F0.split("/")));
    c.push(["check.js passes the board (no test failure, no test warning)", ck.status === 0 && !/tests\./.test((ck.stdout || "").split(/\r?\n/).filter(l => /^(FAIL|warn)/.test(l)).join(" ")), (ck.stdout || "").split(/\r?\n/).filter(l => /^(FAIL|warn)/.test(l)).join(" | ").slice(0, 300)]);
    const promote = apply(root, req(path.join(sc, "tests-3.json"), { github: d.repo, issue: d.issue, event: "implementation-stage", folder: F0, facts: { stage: "S2", stages: [{ id: "S1", name: "the parse outcome", state: "done" }, { id: "S2", name: "the routing", state: "done" }], tests: { amended: [{ class: "MultiConnectionUDPServerTest", module: "webtools-udp", rows: ["routing"] }] } } }), "2026-10-25T08:00:00Z"), pp = planOf(root, F0).tests;
    c.push(["a class changed later moves up (Relevant → Amended), keeping its result; a class is in one list only", promote.status === 0 && !pp.relevant.some(e => e.class === "MultiConnectionUDPServerTest") && pp.amended.some(e => e.class === "MultiConnectionUDPServerTest" && e.result && e.result.state === "passed"), JSON.stringify(pp.amended.map(e => e.class))]);
    const none = apply(root, req(path.join(sc, "tests-4.json"), { github: d.repo, issue: d.issue, event: "implementation-stage", folder: F0, facts: { stage: "S3", stages: [{ id: "S1", name: "the parse outcome", state: "done" }, { id: "S2", name: "the routing", state: "done" }, { id: "S3", name: "the as-built record", state: "done" }] } }), "2026-10-25T08:30:00Z");
    c.push(["an implementation stage that reports a stage done without facts.tests leaves the tab to the presenter: enrich, naming the diff", none.status === 0 && none.s.enrich === "yes" && none.s.why.some(w => /Tests tab: the event carries no facts\.tests; Added and Amended come from the branch's diff/.test(w)), JSON.stringify(none.s.why)]);
    /* a tracking board records none of its own */
    const trk = copy(TRK); trk.rows.forEach(r => { delete r.unit.tests; delete r.unit.live; }); trk.wip = { ...trk.wip, current: [] }; trk.wip.next = lib.nextUnit(trk) ? lib.nextUnit(trk).id : null;
    const rootT = tree("tests-trk", [trk]), aT = apply(rootT, req(path.join(sc, "tests-5.json"), { github: trk.repo, issue: trk.issue, event: "landing", folder: trk.folder, facts: { tests: { added: [{ class: "X" }] } } }), "2026-10-25T09:00:00Z");
    c.push(["facts.tests on a tracking board is not written there: named for the presenter", aT.status === 0 && !planOf(rootT, trk.folder).tests && aT.s.why.some(w => /tracking board: its units' boards record the tests/.test(w)), JSON.stringify(aT.s.why || aT.s.error)]);
    /* the checks */
    const P = (tests, extra) => TL.testsProblems({ rows: [{ id: "routing" }], ...(extra || {}), tests });
    const bad = [
      ["a test level that is not one (\"L3\")", P({ added: [{ class: "A", testLevel: "L3" }] }), /testLevel must be one of/],
      ["a class in two lists", P({ added: [{ class: "A" }], relevant: [{ class: "A" }] }), /is also in tests\.added\[0\]/],
      ["a row that is not on the board", P({ amended: [{ class: "A", rows: ["nope"] }] }), /names no row of the board/],
      ["a result state that is not one", P({ added: [{ class: "A", result: { state: "green" } }] }), /result\.state must be one of/],
      ["Other with a key that is not a test level", P({ other: { byModule: { m: { "6": 1 } } } }), /not a test level/],
      ["tests on a tracking board", P({ added: [] }, { kind: "tracking" }), /tests on a tracking board/]];
    bad.forEach(([w, r, re]) => c.push([`testslib.js fails ${w}`, r.fail.some(f => re.test(f)), r.fail.join(" | ")]));
    const wv = P({ added: [{ class: "com.x.testing.integration.A", testLevel: "2" }] });
    c.push(["it warns when a class's path or package names another test level than its testLevel", wv.warn.some(x => /names the test level 3/.test(x)), wv.warn.join(" | ")]);
    c.push(["the sub-issue fixture's tests pass the checks", !TL.testsProblems(SUB).fail.length && !TL.testsProblems(SUB).warn.length, JSON.stringify(TL.testsProblems(SUB))]);
    /* the tracking board's mirror of each unit's tests (embed.js, unit.tests with rowNames); cleared when the unit records none */
    const sub = building(), subF = trk.folder + "/47-java-floor"; Object.assign(sub, { issue: 47, slug: "47-java-floor", folder: subF, title: "Java 11 floor", parent: { issue: 55 } });
    sub.wip = { ...sub.wip, step: "implementation", current: ["routing.built"], questions: [], research: null, event: { name: "implementation-stage", at: "2026-10-25T05:00:00Z" } };
    sub.tests = { base: "master", updated: "2026-10-25T05:00:00Z", added: [{ class: "HttpClientFloorTest", module: "webtools-http", testLevel: "2", tests: 7, rows: ["routing"] }], amended: [], relevant: [] };
    const rootM = tree("tests-mirror", [trk, sub]), pm = planOf(rootM, trk.folder), um = pm.rows.find(r => r.id === "java-floor").unit;
    c.push(["embed.js mirrors a unit's tests into its tracking board's row (unit.tests), with the names of the rows its classes verify", !!um.tests && um.tests.added[0].class === "HttpClientFloorTest" && um.tests.rowNames && um.tests.rowNames.routing === sub.rows.find(r => r.id === "routing").name, JSON.stringify(um.tests || null).slice(0, 200)]);
    const sd = path.join(rootM, ...subF.split("/")), sp = JSON.parse(rd(path.join(sd, "plan.json"))); sp.tests.added[0].tests = 8; fs.writeFileSync(path.join(sd, "plan.json"), JSON.stringify(sp, null, 2) + "\n");
    const cw = node(checkJs, path.join(rootM, ...trk.folder.split("/")));
    c.push(["check.js warns when the mirror differs from the unit's board (fixed by embed.js)", /unit\.tests \(#47\) differs from its board's tests/.test(cw.stdout || ""), (cw.stdout || "").split(/\r?\n/).filter(l => /unit\.tests/.test(l)).join(" | ")]);
    delete sp.tests; fs.writeFileSync(path.join(sd, "plan.json"), JSON.stringify(sp, null, 2) + "\n"); node(embedJs, path.join(rootM, ...trk.folder.split("/")));
    c.push(["the mirror is cleared once the unit's board records none", !("tests" in planOf(rootM, trk.folder).rows.find(r => r.id === "java-floor").unit), "cleared"]);
    const nt = copy(LIVE); nt.rows[0].unit = { n: 1, issue: 5, tests: { added: [] } };
    c.push(["check.js fails unit.tests on a board that is not a tracking board", (() => { const rootN = path.join(sc, "tests-nontrk"); const dir = path.join(rootN, ...LIVE.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(nt, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), T.plan); node(embedJs, dir); const r = node(checkJs, dir); return r.status === 1 && /unit\.tests on a board that is not a tracking board/.test(r.stdout); })(), "non-tracking"]);
  });

  /* 7. the Tests tab: the page */
  guard("the Tests tab on the page: four sub-tabs, by test level, results, rows, Other's counts, a tracking board's sum (dashboards-skill/22)", c => {
    if (!chrome) { c.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const tabsOf = dom => (inner(dom, '<div class="tabs" role="tablist" aria-label="Views">', "div").match(/id="t-[a-z-]+"/g) || []).map(x => x.slice(6, -1));
    const fS = planPage("tests-sub", SUB), dS = wide(fS, "tests.amended");
    c.push(["the Tests tab stands right of As built, on an issue board", JSON.stringify(tabsOf(dS).slice(0, 5)) === '["timeline","decisions","built","tests","impact"]', tabsOf(dS).join(", ")]);
    const st = inner(dS, '<div class="seg stabs" role="tablist" aria-label="Tests" id="tests-tabs">', "div");
    c.push(["four sub-tabs with their counts: Added 2, Amended 4, Relevant 3, Other 91 (classes)", /Added<small>2<\/small>/.test(st) && /Amended<small>4<\/small>/.test(st) && /Relevant<small>3<\/small>/.test(st) && /Other<small>91<\/small>/.test(st), text(st)]);
    c.push(["#tests.amended opens the Tests tab at Amended (selected, its panel shown)", /id="t-tests" aria-controls="p-tests" aria-selected="true"/.test(dS) && /id="t-tests-amended" aria-controls="p-tests-amended" aria-selected="true"/.test(dS) && /<div class="tsub" role="tabpanel" id="p-tests-amended" aria-labelledby="t-tests-amended">/.test(dS), "deep link"]);
    const am = inner(dS, '<div id="tests-amended">', "div"), heads = (am.match(/<h3 class="tlh">[\s\S]*?<\/h3>/g) || []).map(text);
    c.push(["Amended groups its classes by test level, in the hierarchy's order (L2, L3, L4a, L4c), each heading with its classes and tests", heads.length === 4 && /^L2 component 1 class · 41 tests/.test(heads[0]) && /^L3 integration/.test(heads[1]) && /^L4a deterministic/.test(heads[2]) && /^L4c non-functional/.test(heads[3]), heads.join(" | ")]);
    const card = (am.match(/<div class="tcard tl-2"[\s\S]*?<\/div><\/div>/) || [""])[0];
    c.push(["a class: its simple name, its package, its result with its count, its module, test count, stage and qa pass, and the rows it verifies linked", /<code class="cn" title="com\.spartanlabs\.testing\.component\.udp\.HandshakeCoordinatorTest">HandshakeCoordinatorTest<\/code>/.test(card) && /<div class="pk">com\.spartanlabs\.testing\.component\.udp<\/div>/.test(card) && /vp good"><i aria-hidden="true">✓<\/i>passed/.test(card) && /webtools-udp · 41 tests · stage A · qa pass 2/.test(text(card)) && /<a href="#routing\.built" data-go-row="routing">Unframed-datagram routing<\/a>/.test(card), text(card).slice(0, 300)]);
    const keyA = inner(dS, '<div class="key" id="tests-amended-key">', "div");
    c.push(["Amended's legend names the levels and the result it drew, and nothing else", /L2 component/.test(keyA) && /L3 integration/.test(keyA) && /L4a deterministic/.test(keyA) && /L4c non-functional/.test(keyA) && !/L1 gating|L5 UAT|skipped|failed|not run/.test(keyA) && /its latest run passed/.test(keyA), text(keyA)]);
    const dR = wide(fS, "tests.relevant"), rl = inner(dR, '<div id="tests-relevant">', "div"), keyR = inner(dR, '<div class="key" id="tests-relevant-key">', "div");
    c.push(["Relevant: a class with no test level in its own group, a skipped one neutral with its glyph and word, each in the legend", /no test level/.test(text(rl)) && /vp neutral"><i aria-hidden="true">↷<\/i>skipped/.test(rl) && /no test level/.test(keyR) && /its latest run skipped it/.test(keyR) && /L5 UAT \(strongest\)/.test(keyR) && !/lightest|darkest/.test(keyR), text(keyR)]);
    const dO = wide(fS, "tests.other"), ot = inner(dO, '<div id="tests-other">', "div"), keyO = inner(dO, '<div class="key" id="tests-other-key">', "div");
    c.push(["Other: counts only, per module and test level, \"not run: untouched by this change\", with its legend", /<table class="tbl tother">/.test(ot) && /<code>webtools-core<\/code><\/td>/.test(ot) && /31 <small>\(212 tests\)<\/small>/.test(ot) && /not run: untouched by this change/.test(ot) && !/<div class="tcard/.test(ot) && /counted only: never run for this change/.test(keyO), text(ot).slice(0, 300)]);
    /* keyboard: the sub-tablist's keys, and a sub-tab selected from another tab shows the Tests tab */
    const kjs = 'const a=document.getElementById("t-tests-added");document.getElementById("t-timeline").click();a.click();a.focus();const k=key=>document.activeElement.dispatchEvent(new KeyboardEvent("keydown",{key,bubbles:true}));const sel=()=>[...document.querySelectorAll(".stab")].findIndex(t=>t.getAttribute("aria-selected")==="true");const r=[];k("End");r.push(sel());k("Home");r.push(sel());k("ArrowRight");r.push(sel());r.push([...document.querySelectorAll(".stab")].filter(t=>t.tabIndex===0).length);document.getElementById("t-timeline").click();document.getElementById("t-tests-other").click();r.push(document.getElementById("p-tests").hidden?0:1,document.getElementById("p-tests-other").hidden?0:1);document.body.dataset.r=JSON.stringify(r);';
    const rk = got(wide(planPage("tests-keys", SUB, kjs))) || [];
    c.push(["the sub-tabs' keys: End, Home and the arrows move the selection, one sub-tab in the Tab order; one clicked from another tab shows Tests", JSON.stringify(rk) === "[3,0,1,1,1,1]", JSON.stringify(rk)]);
    /* the inspector */
    const ijs = 'document.getElementById("t-tests-amended").click();document.querySelector("#tests-amended .tcard").click();document.body.dataset.r=JSON.stringify(document.getElementById("insp-body").innerText.slice(0,1200));';
    const ri = got(wide(planPage("tests-insp", SUB, ijs))) || "";
    c.push(["a class opens in the inspector: its list, its name, its level and result, its path, the rows it verifies", /TESTS · AMENDED/.test(ri) && /HandshakeCoordinatorTest/.test(ri) && /L2 component/.test(ri) && /board rows it verifies/i.test(ri) && /latest result/i.test(ri), String(ri).slice(0, 200)]);
    /* a tracking board sums its units' tests, each unit a click away */
    const dT = wide(planPage("tests-trk", TRK), "tests.added"), ta = inner(dT, '<div id="tests-added">', "div");
    c.push(["a tracking board's Tests tab: each unit with tests on a line, its title opening its board's Tests tab; the rest named in one line", /<a href="61-build-logic\/dashboard\.html#tests\.added"[^>]*>Shared build logic<\/a> · 1 class/.test(ta) && /The other units record no tests yet: /.test(text(ta)) && /#62/.test(text(ta)), text(ta).slice(0, 300)]);
    c.push(["its classes carry their unit (the pair: #n to GitHub, the title to the unit's board) and the rows on the unit's board", /<div class="tu">unit 1\. <a href="https:\/\/github\.com\/[^"]+\/issues\/61"[^>]*>#61<\/a> <a href="61-build-logic\/dashboard\.html#tests\.added"/.test(ta) && /<a href="61-build-logic\/dashboard\.html#convention-plugin\.built">The convention plugin<\/a> \(on its board\)/.test(ta), (ta.match(/<div class="tu">[\s\S]*?<\/div>/) || [""])[0].slice(0, 300)]);
    const dTa = wide(planPage("tests-trk-am", TRK), "tests.amended"), keyT = inner(dTa, '<div class="key" id="tests-amended-key">', "div");
    c.push(["a failing class reads red, with its glyph and word and its counts, and its legend entry", /vp critical"><i aria-hidden="true">✕<\/i>failed · 6 passed, 1 failed/.test(dTa) && /its latest run failed/.test(keyT), text(keyT)]);
    /* nothing recorded: pending while the run is live (dashed), a plain box once the board has landed */
    const dL = wide(planPage("tests-live", LIVE), "tests.added"), keyL = inner(dL, '<div class="key" id="tests-added-key">', "div");
    c.push(["a live board with nothing recorded: a dashed note, pending, with its legend entry", /<p class="empty pend">No test class added on the branch yet/.test(dL) && /dashed: nothing recorded yet/.test(keyL), text(keyL)]);
    const dE = wide(planPage("tests-landed", EX), "tests.added"), keyE = inner(dE, '<div class="key" id="tests-added-key">', "div");
    c.push(["a landed board that recorded no tests: a plain box, \"No tests recorded on this board.\", never dashed", /<p class="empty">No tests recorded on this board\.<\/p>/.test(dE) && /box: nothing recorded/.test(keyE) && !/empty pend/.test(inner(dE, '<section class="view" role="tabpanel" id="p-tests"[^>]*>', "section")), text(keyE)]);
    c.push(["the work board has no Tests tab (one row per run)", !/id="t-tests"/.test(T.work), "board.html"]);
    const cp1 = cp.spawnSync(process.execPath, [checker, fS, "--out", path.join(sc, "tests-sub")], { encoding: "utf8" });
    c.push(["check-page.js passes the rendering, every sub-tab with its legend", cp1.status === 0 && ["added", "amended", "relevant", "other"].every(k => new RegExp(`CHECK tab t-tests-${k}: visible · \\d+ drawn nodes · legend`).test(cp1.stdout)), (cp1.stdout || "").split(/\r?\n/).filter(l => /t-tests|FAIL|DASHED|NO LEGEND/.test(l)).join(" | ").slice(0, 400)]);
  });

  /* 8. this run's feature probes */
  guard("the feature probes of dashboards-skill/22: on the templates, and missed by the templates dashboards-skill/26 left", c => {
    const ids = ["kpi-tile-legends", "no-model-tag", "title-issue-link", "panel-since-once", "charging-arrow-large", "landing-event", "tests-tab"];
    const mine = F.FEATURES.filter(f => f.since === 22);
    c.push(["features.js holds this run's seven detectors, tagged dashboards-skill/22", JSON.stringify(mine.map(f => f.id).sort()) === JSON.stringify(ids.slice().sort()), mine.map(f => f.id).join(", ")]);
    c.push(["the plan-board template carries each", !F.probe(T.plan, "plan-board").length, F.probe(T.plan, "plan-board").map(F.line).join(" | ")]);
    c.push(["the work-board template carries each it takes (the tiles' legends, no board tag)", !F.probe(T.work, "work-board").length && F.applicable("work-board").filter(f => f.since === 22).map(f => f.id).sort().join(",") === "kpi-tile-legends,no-model-tag", F.probe(T.work, "work-board").map(F.line).join(" | ")]);
    /* a recorded version, from verify/history/ or rebuilt from the mirror's git history (system/scripts/history.js) */
    const hist = (n, note) => require(sk("system/scripts/history.js")).readVersion(sk(n), x => new RegExp(note).test(x.note || ""), { historyRepo: X.historyRepo });
    const oldP = hist("plan/template/dashboard.html", "dashboards-skill/26"), oldW = hist("plan/template/board.html", "dashboards-skill/26");
    c.push(["the plan-board template as dashboards-skill/26 left it misses all seven", !!oldP && ids.every(id => F.probe(oldP, "plan-board").some(m => m.id === id)), oldP ? F.probe(oldP, "plan-board").map(m => m.id).join(", ") : "no recorded history"]);
    c.push(["the work-board template as dashboards-skill/26 left it misses the board tag's removal", !!oldW && F.probe(oldW, "work-board").some(m => m.id === "no-model-tag") && !F.probe(oldW, "work-board").some(m => m.id === "kpi-tile-legends"), oldW ? F.probe(oldW, "work-board").map(m => m.id).join(", ") : "no recorded history"]);
    ["system", "supersystem"].forEach(k => c.push([`none of them is held to a ${k} page (each names why it does not fit)`, mine.every(f => !f.types.includes(k) && f.notFor && f.notFor[k]), mine.map(f => f.id + ": " + (f.notFor || {})[k]).join(" | ").slice(0, 300)]));
  });
  return groups;
};
