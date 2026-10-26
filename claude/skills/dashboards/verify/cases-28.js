// The case groups of admin-team/dashboards-skill/28, run by verify-templates.js (it passes its helpers in): (the Timeline tile's figure the
// sum of what its bar draws, since dashboards-skill/32 the visits of its run's steps: verify/cases-32.js); an issue's title quoted verbatim, one that names a work level flagged as a
// defect in the issue (ISSUE TITLE NAMES A WORK LEVEL: #n) by check.js, check-board.js, apply-event.js and apply-state.js and never a failure
// of the board, on every type; an issue board at research with no rows a defect (NO ROWS AT RESEARCH), research planning on a rowless board
// glowing nothing, a tracking board's research left alone; each unit row's label glowing on its own while it is filed as a sub-issue, then
// while its board is created (per-unit sub-issues-filed and boards-created events, a final one closing each step); and the feature probes
// of this run. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases28(X) {
  const { sk, out, targets, dumpDom, inner, checker, embedJs, checkJs, node, stub, withData } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), LR = require(sk("system/scripts/levelrefs.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html"), SYS = tp("system/template/system.html"), SUP = tp("system/template/supersystem.html");
  if (!PB || !WB || !SYS || !SUP) return [["the dashboards-skill/28 cases (every template under test)", [["every template is under test", false, "a repository template set without all four skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x));
  const run = (js, a, o) => cp.spawnSync(process.execPath, [js, ...a], { encoding: "utf8", ...(o || {}) });
  const text = h => (h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const APPLY = sk("plan/scripts/apply-event.js"), NEW = sk("plan/scripts/new.js"), BOARD = sk("plan/scripts/board.js");
  const sc = path.join(out, "skill-28"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const T = { plan: rd(PB), work: rd(WB), system: rd(SYS), supersystem: rd(SUP) };
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), WBJ = J("verify/fixtures/work-board.json");
  const probeAt = (html, js) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${js} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  const planPage = (name, d, js) => { const dir = path.join(sc, name); const html = withData(T.plan, "plan", JSON.stringify(d, null, 2)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); return wr(path.join(dir, "dashboard.html"), js ? probeAt(html, js) : html); };
  const wide = (f, h) => dumpDom(f, h || "", "1920,1080", 6000);
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const tree = (name, boards) => { const root = path.join(sc, name); fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    boards.forEach(d => { const dir = path.join(root, ...d.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), T.plan); });
    boards.slice().reverse().forEach(d => node(embedJs, path.join(root, ...d.folder.split("/")))); return root; };
  const req = (file, o) => wr(file, JSON.stringify({ v: 1, action: "plan-board", ...o }));
  const apply = (root, rq, at) => { const r = run(APPLY, ["--event", rq, "--worktree", root, "--no-live", "--at", at, "--json"]); let s = {}; try { s = JSON.parse((r.stdout || "{}").trim().split(/\r?\n/).pop() || "{}"); } catch (e) { s = { error: (r.stdout || "") + (r.stderr || "") }; } return { status: r.status, s }; };
  const planOf = (root, folder) => JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json")));
  const fails = r => (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l));
  const LV = "Retry budget for the cache (level: 2)", LV2 = "A level-3 change to the transport";

  /* 1. the Timeline tile's figure, the sum of what its bar draws: since dashboards-skill/32 the visits of its run's steps (verify/cases-32.js) */

  /* 2. an issue's title quoted verbatim; one that names a work level flagged as the issue's defect, never the board's failure */
  guard("an issue's title quoted verbatim; one naming a work level flagged ISSUE TITLE NAMES A WORK LEVEL: #n, never a failure, on every type (dashboards-skill/28)", c => {
    /* levelrefs.js */
    const pd = { schema: "plan-board/1", issue: 70, issueTitle: LV, function: "Checks the handshake.", followUps: [{ issue: 81, title: LV2, note: "Left for later." }], roadmap: { issue: 55, title: "HTTP client stack", items: [{ issue: 62, title: "inside level 3" }] }, rows: [{ id: "a", name: "Row a", unit: { issue: 63, title: "Label level: 3" } }] };
    const hits = LR.issueTitleRefs(pd).map(x => [x.at, x.issue]);
    c.push(["levelrefs.js issueTitleRefs(): every quoted title of an issue board that names a work level, with its issue (the board's own for issueTitle)", JSON.stringify(hits) === JSON.stringify([["issueTitle", 70], ["followUps[0].title", 81], ["roadmap.items[0].title", 62], ["rows[0].unit.title", 63]]), JSON.stringify(hits)]);
    c.push(["levelRefsIn() with titleSkip() leaves the titles out and still finds a work level anywhere else", !LR.levelRefsIn(pd, "", [], LR.titleSkip(pd)).length && LR.levelRefsIn({ ...pd, function: "a level-3 change" }, "", [], LR.titleSkip(pd)).map(x => x.at).join() === "function", JSON.stringify(LR.levelRefsIn({ ...pd, function: "a level-3 change" }, "", [], LR.titleSkip(pd)))]);
    const wd = { schema: "work-board/1", rows: [{ issue: 62, title: LV, detail: "x" }], groups: [{ issue: 55, title: LV2 }], unscheduled: [{ issue: 90, title: "Label level: 3" }], roadmap: [{ issue: 55, title: "ok", items: [{ issue: 63, title: "(#61, level 3)" }] }] };
    c.push(["…and of the repository work board and of a state board, by their data's kind", LR.dataKind(wd) === "work-board" && LR.issueTitleRefs(wd).map(x => x.issue).join() === "62,55,90,63" && LR.issueTitleRefs({ slug: "alpha", lastAmended: { issue: 9, title: LV } }).map(x => x.issue).join() === "9", JSON.stringify(LR.issueTitleRefs(wd).map(x => x.at))]);
    c.push(["the flag names the issue, where it is quoted and the words, and says it is the issue's defect", /^ISSUE TITLE NAMES A WORK LEVEL: #70 \(issueTitle: "Retry budget for the cache \(level: 2\)" names "level: 2"\): a defect in the issue, quoted verbatim on the board; the issue is retitled on GitHub$/.test(LR.titleDefect(LR.issueTitleRefs(pd)[0])), LR.titleDefect(LR.issueTitleRefs(pd)[0])]);
    /* check.js on an issue board: the same verdict with the title, and the flag */
    const L0 = copy(LIVE), L1 = copy(LIVE); L1.issueTitle = LV; L1.followUps = [...(L1.followUps || []), { issue: 81, title: LV2, note: "Left for later." }];
    const r0 = tree("title-base", [L0]), r1 = tree("title-level", [L1]), F0 = LIVE.folder;
    const k0 = run(checkJs, [path.join(r0, ...F0.split("/"))]), k1 = run(checkJs, [path.join(r1, ...F0.split("/"))]);
    c.push(["check.js: a board whose issue title and a follow-up's title name a work level keeps its verdict, with no work-level failure", k1.status === k0.status && !/shows a work level/.test(k1.stdout), JSON.stringify([k0.status, k1.status, fails(k1).slice(0, 3)])]);
    c.push(["…and flags each, by number, as a warning", /^warn\s+ISSUE TITLE NAMES A WORK LEVEL: #70 \(issueTitle:/m.test(k1.stdout) && /^warn\s+ISSUE TITLE NAMES A WORK LEVEL: #81 \(followUps\[\d+\]\.title:/m.test(k1.stdout), (k1.stdout || "").split(/\r?\n/).filter(l => /ISSUE TITLE/.test(l)).join(" | ").slice(0, 300)]);
    const L2 = copy(L1); L2.followUps[L2.followUps.length - 1].note = "Waits on a level-3 change."; const r2 = tree("title-level-note", [L2]), k2 = run(checkJs, [path.join(r2, ...F0.split("/"))]);
    c.push(["a work level anywhere else (a follow-up's note) still fails the board", k2.status === 1 && /shows a work level, which a dashboard never does: followUps\[\d+\]\.note/.test(k2.stdout) && !/shows a work level[^\n]*issueTitle/.test(k2.stdout), fails(k2).join(" | ").slice(0, 300)]);
    /* check.js on the repository work board: the same */
    const wtree = (name, b) => { const root = path.join(sc, name), dir = path.join(root, "docs", "plans"); fs.rmSync(root, { recursive: true, force: true }); const j = JSON.stringify(b, null, 2); wr(path.join(dir, "board.json"), j + "\n"); wr(path.join(dir, "index.html"), withData(T.work, "board", j)); wr(path.join(dir, "board.js"), lib.sidecarText("board", j)); return dir; };
    const W1 = copy(WBJ); W1.rows[0].title = LV; const w0 = run(checkJs, [wtree("wb-base", WBJ)]), w1 = run(checkJs, [wtree("wb-level", W1)]);
    c.push(["check.js on the repository work board: a row's title naming a work level keeps the verdict and is flagged", w1.status === w0.status && !/shows a work level/.test(w1.stdout) && new RegExp(`^warn\\s+ISSUE TITLE NAMES A WORK LEVEL: #${W1.rows[0].issue} \\(rows\\[0\\]\\.title:`, "m").test(w1.stdout), JSON.stringify([w0.status, w1.status]) + " " + (w1.stdout || "").split(/\r?\n/).filter(l => /ISSUE TITLE|^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    /* apply-event.js: the event applies, the title is left as it is, the summary names the defect */
    if (k0.status === 0) {
      const a = apply(r1, req(path.join(sc, "title-halt.json"), { github: L1.repo, issue: L1.issue, event: "halted", folder: F0, facts: { waitingOn: "Which reply text the refusal takes." } }), "2026-10-25T16:00:00Z"), p = planOf(r1, F0);
      c.push(["apply-event.js applies an event on such a board, the title untouched, and names the defect in its summary (issue defects)", a.status === 0 && a.s.result === "ok" && p.issueTitle === LV && (a.s.defects || []).includes("ISSUE TITLE NAMES A WORK LEVEL: #70") && (a.s.defects || []).includes("ISSUE TITLE NAMES A WORK LEVEL: #81"), JSON.stringify([a.status, a.s.result, a.s.defects, a.s.error, p.issueTitle])]);
      const t = run(APPLY, ["--event", req(path.join(sc, "title-halt2.json"), { github: L1.repo, issue: L1.issue, event: "resumed", folder: F0, facts: {} }), "--worktree", r1, "--no-live", "--at", "2026-10-25T16:05:00Z"]);
      c.push(["…its plain summary carries an \"issue defects\" line", t.status === 0 && /^issue defects: ISSUE TITLE NAMES A WORK LEVEL: #70 \| ISSUE TITLE NAMES A WORK LEVEL: #81$/m.test(t.stdout), (t.stdout || "").split(/\r?\n/).filter(l => /defects|^error/.test(l)).join(" | ")]);
    } else c.push(["the live fixture's board passes check.js (to apply an event on it)", false, fails(k0).join(" | ").slice(0, 300)]);
    /* the boards: each quoted title marked; the browser pass flags it and passes, a work level elsewhere still fails */
    const L3 = copy(L1); const pg = planPage("title-page", L3), d = dumpDom(pg, "", "1400,1000");
    c.push(["the issue board marks its issue line and a follow-up's title data-issue-title, by issue", d == null || (/<p class="issueline" id="issueline"><span data-issue-title="70">/.test(d) && /data-issue-title="81">A level-3 change to the transport</.test(d)), (d || "").match(/<p class="issueline"[^>]*>/) + " · " + ((d || "").match(/data-issue-title="81"[^<]*/) || ["no follow-up mark"])[0]]);
    const dt = dumpDom(planPage("title-trk", TRK), "", "1400,1000");
    c.push(["a unit's name (the presenter's) is no quotation: a tracking board's unit rows carry no mark", dt == null || (!/class="rowlab[^"]*"[^>]*>(?:(?!<\/div>)[\s\S])*data-issue-title/.test(dt) && !/<div class="nm">[^]*?data-issue-title[^]*?<\/div>/.test(inner(dt, '<div class="rowlab', "div"))), "the first unit row"]);
    const cp1 = run(checker, [pg, "--out", path.join(sc, "title-page-check")]);
    c.push(["check-board.js passes the board, prints the quoted titles and flags the two by number, its title text left out of the work-level scan", cp1.status === 0 && /CHECK issue titles: \d+ quoted verbatim · ISSUE TITLE NAMES A WORK LEVEL: #70 · ISSUE TITLE NAMES A WORK LEVEL: #81/.test(cp1.stdout) && /CHECK work levels: none shown/.test(cp1.stdout), (cp1.stdout || "").split(/\r?\n/).filter(l => /issue titles|work levels|^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    const cp2 = run(checker, [planPage("title-page-note", L2), "--out", path.join(sc, "title-page-note-check")]);
    c.push(["…while a work level in a follow-up's note still fails it (LEVEL REFERENCE)", cp2.status === 1 && /LEVEL REFERENCE shown/.test(cp2.stdout), (cp2.stdout || "").split(/\r?\n/).filter(l => /work levels/.test(l)).join(" | ").slice(0, 300)]);
    const W2 = copy(WBJ); W2.rows[0].title = LV; const wdir = wtree("wb-level-page", W2), dw = dumpDom(path.join(wdir, "index.html"), "", "1400,1000");
    c.push(["the repository work board marks every title it quotes (rows, groups, roadmap, unscheduled issues)", dw == null || ((dw.match(/data-issue-title="\d+"/g) || []).length >= W2.rows.length && new RegExp(`data-issue-title="${W2.rows[0].issue}">${LV.replace(/[()]/g, "\\$&")}<`).test(dw)), `${((dw || "").match(/data-issue-title="\d+"/g) || []).length} marks`]);
    const cw = run(checker, [path.join(wdir, "index.html"), "--out", path.join(sc, "wb-level-check")]);
    c.push(["check-board.js passes the repository work board and flags the row's title", cw.status === 0 && new RegExp(`ISSUE TITLE NAMES A WORK LEVEL: #${W2.rows[0].issue}\\b`).test(cw.stdout), (cw.stdout || "").split(/\r?\n/).filter(l => /issue titles|^FAIL/.test(l)).join(" | ").slice(0, 300)]);
    /* a state board: a Context title written <a data-board="N"> naming a work level */
    [["system", T.system], ["supersystem", T.supersystem]].forEach(([k, h]) => {
      const html = h.replace('<a data-board="N">Roadmap item title</a>', `<a data-board="7">Roadmap item title ${LV}</a>`), page = wr(path.join(sc, "state-" + k, "index.html"), html);
      const nb = run(checker, [page, "--auto", "--no-browser"]);
      c.push([`a ${k} page: without a browser, the Context's title naming a work level is a warning, the board passing`, nb.status === 0 && /CHECK warning: ISSUE TITLE NAMES A WORK LEVEL: #7 \(the Context's <a data-board="7">/.test(nb.stdout), (nb.stdout || "").split(/\r?\n/).filter(l => /ISSUE TITLE|^FAIL/.test(l)).join(" | ").slice(0, 300)]);
      const bp = run(checker, [page, "--out", path.join(sc, "state-" + k + "-check")]);
      c.push([`…and in the browser: flagged by number, no work level shown, the pass passing`, bp.status === 0 && /ISSUE TITLE NAMES A WORK LEVEL: #7\b/.test(bp.stdout) && /CHECK work levels: none shown/.test(bp.stdout), (bp.stdout || "").split(/\r?\n/).filter(l => /issue titles|work levels|^FAIL/.test(l)).join(" | ").slice(0, 300)]);
      const ds = dumpDom(page, "", "1400,1000");
      c.push([`…linkIssues() keeps the title's mark once resolved: plain text with no board, marked data-issue-title`, ds == null || new RegExp(`<span data-issue-title="7">Roadmap item title ${LV.replace(/[()]/g, "\\$&")}</span>`).test(ds), ((ds || "").match(/<span data-issue-title="7">[^<]*/) || ["no mark"])[0]]);
    });
  });

  /* 3. rows before research: an issue board at research with no rows is a defect */
  guard("an issue board at research with no rows a defect (NO ROWS AT RESEARCH); research planning on a rowless board and a tracking board's research left alone (dashboards-skill/28)", c => {
    const F0 = LIVE.folder, msg = /^FAIL\s+NO ROWS AT RESEARCH: /m;
    const B = f => { const d = copy(LIVE); d.rows = []; delete d.tests; d.impact = null; f(d); return d; };
    const at = B(() => {}), k1 = run(checkJs, [path.join(tree("norows-research", [at]), ...F0.split("/"))]);
    c.push(["check.js fails an issue board at research with questions recorded and no rows", k1.status === 1 && msg.test(k1.stdout) && /4 research questions recorded and no rows: the rows are named from the gaps before the research starts/.test(k1.stdout), (k1.stdout || "").split(/\r?\n/).filter(l => /NO ROWS/.test(l)).join(" | ").slice(0, 300)]);
    const held = B(d => { d.wip.resume = "research"; d.wip.step = "halted"; d.wip.waitingOn = "A question."; }), k2 = run(checkJs, [path.join(tree("norows-halted", [held]), ...F0.split("/"))]);
    c.push(["…and one halted there, resuming at research", k2.status === 1 && /NO ROWS AT RESEARCH: the board is at research \(halted, resuming there\)/.test(k2.stdout), (k2.stdout || "").split(/\r?\n/).filter(l => /NO ROWS/.test(l)).join(" | ").slice(0, 300)]);
    const phase = B(d => { d.wip.questions = []; d.wip.current = ["considered"]; d.wip.research = { phase: "verification", drafted: 4, since: {} }; }), k3 = run(checkJs, [path.join(tree("norows-phase", [phase]), ...F0.split("/"))]);
    c.push(["…and one whose research phase is past planning with no question recorded", k3.status === 1 && /its research phase at verification and no rows/.test(k3.stdout), (k3.stdout || "").split(/\r?\n/).filter(l => /NO ROWS/.test(l)).join(" | ").slice(0, 300)]);
    const plan = B(d => { d.wip.questions = []; d.wip.current = []; d.wip.research = { phase: "planning", drafted: 2, since: { planning: "2026-10-25T08:05:00Z" } }; }), k4 = run(checkJs, [path.join(tree("norows-planning", [plan]), ...F0.split("/"))]);
    c.push(["research planning on a rowless board is no defect: no NO ROWS AT RESEARCH, and nothing glows", !msg.test(k4.stdout) && JSON.stringify(lib.researchGlow(plan).current) === "[]", fails(k4).join(" | ").slice(0, 300)]);
    const nb = run(NEW, ["71", "not-yet", "--root", tree("norows-new", []), "--title", "Not yet", "--function", "Verification case.", "--level", "2", "--baseline", "master@abcdef1", "--date", "2026-10-25", "--systems", "webtools-udp", "--repo", "acme/widgets", "--step", "research"]);
    const nf = path.join(sc, "norows-new", "docs", "plans", "71-not-yet"), k5 = fs.existsSync(nf) ? run(checkJs, [nf]) : { stdout: "no folder: " + (nb.stdout || "") + (nb.stderr || "") };
    c.push(["new.js lays a board at research with no rows, which passes (its research has not started)", !msg.test(k5.stdout || "") && fs.existsSync(nf), (k5.stdout || "").split(/\r?\n/).filter(l => /^FAIL|NO ROWS/.test(l)).join(" | ").slice(0, 300)]);
    const t = copy(TRK); t.rows = []; Object.assign(t, { status: "planned", asBuilt: null, impact: null }); Object.assign(t.wip, { step: "research", current: ["considered"], next: null, questions: [{ question: "scope", rows: [], findings: null, state: "researching" }], research: { phase: "research", drafted: 1, since: {} } });
    const k6 = run(checkJs, [path.join(tree("norows-tracking", [t]), ...t.folder.split("/"))]);
    c.push(["a tracking board at research with no rows is not a defect: its rows are its units, written at the architecture's sign-off", !msg.test(k6.stdout) && JSON.stringify(lib.researchGlow(t).current) === '["considered"]', fails(k6).join(" | ").slice(0, 300)]);
    c.push(["researchGlow() has no branch of its own for a board with no rows beyond planning: a rowless board's questions name no row (the fallback)", !/the board has no rows yet"\)/.test(rd(sk("plan/scripts/lib.js"))) && /names no row of the board/.test(lib.researchGlow(at).fallback || ""), JSON.stringify(lib.researchGlow(at))]);
    /* the fast path refuses to write such a board */
    const pl = B(d => { d.wip.questions = []; d.wip.current = []; d.wip.research = { phase: "planning", drafted: 2, since: {} }; }), r = tree("norows-apply", [pl]), before = rd(path.join(r, ...F0.split("/"), "plan.json"));
    const a = apply(r, req(path.join(sc, "norows-start.json"), { github: pl.repo, issue: pl.issue, event: "research-started", folder: F0, facts: { researching: [{ question: "blast-radius", rows: ["validity-rule"] }] } }), "2026-10-25T17:00:00Z");
    c.push(["apply-event.js: research-started on a rowless issue board fails on NO ROWS AT RESEARCH and writes nothing", a.status === 1 && /NO ROWS AT RESEARCH/.test(String(a.s.check)) && rd(path.join(r, ...F0.split("/"), "plan.json")) === before, JSON.stringify([a.status, String(a.s.check).slice(0, 160)])]);
    /* the Timeline's line for a board with no rows */
    const di = dumpDom(planPage("norows-page", plan), "", "1400,1000"), dk = dumpDom(planPage("norows-trk-page", t), "", "1400,1000");
    c.push(["the Timeline says the rows are named before the research starts (a tracking board: its units come at the sign-off)", di == null || (/No rows yet: they are named from the gaps before the research starts\./.test(di) && /No units yet: they are written from the architecture at its sign-off\./.test(dk) && !/the rows with it/.test(di)), text(inner(di || "", '<div class="board"[^>]*>', "div")).slice(0, 160)]);
  });

  /* 4. a tracking board files its units, then creates their boards: each unit row's label glows on its own */
  guard("each unit row's label glowing on its own while it is filed, then while its board is created; per-unit events, a final one closing each step (dashboards-skill/28)", c => {
    const root = path.join(sc, "filing"), F0 = "docs/plans/55-http-client-stack", tdir = path.join(root, ...F0.split("/"));
    fs.rmSync(root, { recursive: true, force: true }); fs.mkdirSync(tdir, { recursive: true });
    const p = copy(TRK); p.rows.forEach(r => { if (r.unit) { r.unit.board = null; r.unit.folder = null; delete r.unit.live; r.asBuilt = { state: "pending", summary: "Not started." }; if (r.unit.n > 2) delete r.unit.issue; } });
    Object.assign(p, { status: "planned", asBuilt: null, branch: "plan/55-http-client-stack" }); Object.assign(p.wip, { step: "architecture", current: ["considered"], next: null, landing: null });
    fs.writeFileSync(path.join(tdir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); fs.writeFileSync(path.join(tdir, "dashboard.html"), T.plan); node(embedJs, tdir);
    let n = 0; const ev = (e, f) => apply(root, req(path.join(sc, `filing-${++n}.json`), { github: p.repo, issue: 55, event: e, folder: F0, facts: f }), `2026-10-25T14:${String(n).padStart(2, "0")}:00Z`);
    const P = () => planOf(root, F0), U = d => d.rows.filter(r => r.unit), lit = d => d.wip.current.filter(a => /\.units$/.test(a)).map(a => a.split(".")[0]);
    const ids = U(p).map(r => r.id), unfiled = U(p).filter(r => !r.unit.issue).map(r => r.id);
    let a = ev("architecture-signed-off", {}), d = P();
    c.push(["architecture-signed-off: the step sub-issues, the label of each unit not filed yet glowing on its own, in row order", a.status === 0 && d.wip.step === "sub-issues" && JSON.stringify(d.wip.current) === JSON.stringify(unfiled.map(id => id + ".units")), JSON.stringify([a.s.result, a.s.error, d.wip.step, d.wip.current])]);
    c.push(["a unit's label glowing is not its run: wip.next stays the first pending unit, nothing reads in progress, the plan's branch still shown", d.wip.next === ids[0] && U(d).every(r => lib.builtState(d, r) === "pending") && lib.shownBranch(d) === "plan/55-http-client-stack" && lib.nextUnit({ ...d, wip: { ...d.wip, current: [ids[0] + ".units"] } }).id === ids[0], JSON.stringify([d.wip.next, U(d).map(r => lib.builtState(d, r)).join(","), lib.shownBranch(d)])]);
    a = ev("sub-issues-filed", { units: [{ unit: unfiled[0], issue: 62 }, { unit: unfiled[1], issue: 63 }] }); d = P();
    c.push(["sub-issues-filed for two units: their labels stop glowing, the rest glow on; the step stays; the panel's count from the rows", a.status === 0 && d.wip.step === "sub-issues" && JSON.stringify(lit(d)) === JSON.stringify(unfiled.slice(2)) && /^4 of 11 units filed as sub-issues\.$/.test(d.wip.detail), JSON.stringify([a.s.result, a.s.error, d.wip.current, d.wip.detail])]);
    const dS = dumpDom(path.join(tdir, "dashboard.html"), "", "1400,1000"), own = inner(dS || "", '<div class="sp own', "div");
    c.push(["the board: exactly the seven unit labels glow (each its own interior glow), no column head or band glows for them", dS == null || ((dS.match(/<div class="rowlab glow"/g) || []).length === 7 && !/<div class="band glow-soft"/.test(dS) && unfiled.slice(2).every(id => new RegExp(`<div class="rowlab glow"[^>]*id="row-${id}"`).test(dS))), `${((dS || "").match(/<div class="rowlab glow"/g) || []).length} glowing`]);
    c.push(["…the step panel counts 4 of 11 and marks the seven being filed, the legend names the glow", dS == null || (/4 of 11 units filed as sub-issues/.test(text(own)) && (own.match(/<li class="cur">/g) || []).length === 7 && /interior glow, breathing: being worked on now/.test(inner(dS, '<div class="key" id="design-key"', "div"))), `${(own.match(/<li class="cur">/g) || []).length} current in the panel`]);
    const wb = run(BOARD, ["--root", root, "--no-gh"]), bj = fs.existsSync(path.join(root, "docs", "plans", "board.json")) ? JSON.parse(rd(path.join(root, "docs", "plans", "board.json"))) : { rows: [] };
    const trow = bj.rows.find(r => r.issue === 55) || {}, urows = bj.rows.filter(r => [61, 47, 62, 63].includes(r.issue));
    c.push(["the repository work board: no unit reads as running while it is filed (the chain names none in progress, no unit row active)", wb.status === 0 && trow.chain && !(trow.chain.current || []).length && urows.every(r => !r.active), JSON.stringify([wb.status, trow.chain && trow.chain.current, urows.map(r => [r.issue, r.active])])]);
    a = ev("sub-issues-filed", { units: unfiled.slice(2).map((id, i) => ({ unit: id, issue: 64 + i })) }); d = P();
    c.push(["every unit filed, no final event yet: nothing glows, the step stays sub-issues", a.status === 0 && d.wip.step === "sub-issues" && !d.wip.current.length && /^11 of 11 units filed as sub-issues\.$/.test(d.wip.detail), JSON.stringify([a.s.result, d.wip.step, d.wip.current])]);
    const again = ev("sub-issues-filed", { units: unfiled.slice(2).map((id, i) => ({ unit: id, issue: 64 + i })) });
    c.push(["the same event again changes nothing", again.status === 0 && again.s.result === "duplicate", JSON.stringify([again.s.result, again.s.applied])]);
    a = ev("sub-issues-filed", { final: true }); d = P();
    c.push(["the final sub-issues-filed closes the step: boards, the label of every unit with no board yet glowing", a.status === 0 && d.wip.step === "boards" && JSON.stringify(lit(d)) === JSON.stringify(ids) && /their boards are created next/.test(d.wip.detail) && /filing done/.test((d.trail || []).slice(-1)[0].label), JSON.stringify([a.s.result, a.s.error, d.wip.step, d.wip.current.length, (d.trail || []).slice(-1)[0]])]);
    U(d).slice(0, 2).forEach(r => stub(path.join(tdir, `${r.unit.issue}-${r.unit.slug || r.id}`)));
    a = ev("boards-created", { units: U(d).slice(0, 2).map(r => ({ unit: r.id, issue: r.unit.issue })) }); d = P();
    c.push(["boards-created for two units: linked from the folders on disk, their labels stop glowing, the rest glow on", a.status === 0 && d.wip.step === "boards" && JSON.stringify(lit(d)) === JSON.stringify(ids.slice(2)) && U(d).slice(0, 2).every(r => r.unit.board), JSON.stringify([a.s.result, a.s.error, d.wip.current.length])]);
    a = ev("boards-created", { final: true }); d = P();
    c.push(["a final boards-created that comes too early leaves the step at boards, and says why", a.status === 0 && d.wip.step === "boards" && (a.s.why || []).some(w => /9 of the units' boards are not in the tree yet: the step stays at boards/.test(w)), JSON.stringify([a.s.result, d.wip.step, a.s.why])]);
    const nb = run(NEW, ["--batch", "55-http-client-stack", "--root", root, "--baseline", "abc1234", "--date", "2026-10-25"]);
    a = ev("boards-created", { final: true }); d = P();
    c.push(["every board laid, the final boards-created closes the step: the plan's landing, nothing glowing", nb.status === 0 && a.status === 0 && d.wip.step === "landing" && !d.wip.current.length, JSON.stringify([nb.status, a.s.result, a.s.error, d.wip.step, d.wip.current])]);
    /* check.js on the address */
    const ck = (name, f) => { const q = copy(d); f(q); const r = tree(name, [q]); return run(checkJs, [path.join(r, ...q.folder.split("/"))]); };
    const k1 = ck("filing-bad-row", q => { q.wip.step = "boards"; q.wip.current = ["nope.units"]; });
    c.push(["check.js fails a <unit-id>.units address naming no unit row", k1.status === 1 && /wip\.current "nope\.units" names no unit row/.test(k1.stdout), fails(k1).join(" | ").slice(0, 200)]);
    const L = copy(LIVE); L.wip.current = [L.rows[0].id + ".units"]; const k2 = run(checkJs, [path.join(tree("filing-issue-board", [L]), ...L.folder.split("/"))]);
    c.push(["…and one on an issue board", k2.status === 1 && /is a tracking board's/.test(k2.stdout), fails(k2).join(" | ").slice(0, 200)]);
    const k3 = ck("filing-legacy", q => { q.wip.step = "sub-issues"; q.wip.current = ["units"]; });
    c.push(["the old one glow on the label column (\"units\") is off the map now: a warning that names it", /^warn\s+wip\.current \["units"\] does not match wip\.step "sub-issues"[^\n]*units \(the one glow on the label column of dashboards-skill\/26/m.test(k3.stdout), (k3.stdout || "").split(/\r?\n/).filter(l => /does not match/.test(l)).join(" | ").slice(0, 300)]);
  });

  /* 5. the feature probes of this run */
  guard("the feature probes of this run: each template carries them, a template without the feature does not (dashboards-skill/28)", c => {
    const ids = ["unit-filing-glow", "timeline-sum", "issue-title-quoted"];
    [["plan-board", T.plan], ["work-board", T.work], ["system", T.system], ["supersystem", T.supersystem]].forEach(([k, h]) => {
      const miss = F.probe(h, k).filter(m => ids.includes(m.id)), want = F.applicable(k).filter(f => ids.includes(f.id)).map(f => f.id);
      c.push([`the ${k} template carries ${want.join(", ")}`, !miss.length && want.length === (k === "plan-board" ? 3 : 1), JSON.stringify(miss)]); });
    const lacks = (h, k, id) => F.probe(h, k).some(m => m.id === id);
    c.push(["a plan template whose unit labels glow as one column lacks unit-filing-glow", lacks(T.plan.replace('class="rowlab${r.unit&&CURRENT.includes(r.id+".units")', 'class="rowlab${r.unit&&CURRENT.includes("units")'), "plan-board", "unit-filing-glow"), "probe"]);
    c.push(["a plan template whose Timeline figure is not the sum of what its bar draws lacks timeline-sum", lacks(T.plan.split("tlSpan(tot)").join("tlSpan(0)"), "plan-board", "timeline-sum"), "probe"]);
    c.push(["a plan template that does not mark its issue line lacks issue-title-quoted", lacks(T.plan.replace('`<span data-issue-title="${esc(PLAN.issue)}">${rich(PLAN.issueTitle)}</span>`', 'rich(PLAN.issueTitle)'), "plan-board", "issue-title-quoted"), "probe"]);
    c.push(["a work-board template whose pair() marks no title lacks it", lacks(T.work.split("data-issue-title=").join("data-x="), "work-board", "issue-title-quoted"), "probe"]);
    c.push(["a system template whose linkIssues() drops the mark lacks it", lacks(T.system.split("data-issue-title").join("data-x").replace(/issueTitle=/g, "x="), "system", "issue-title-quoted"), "probe"]);
    c.push(["level-phrases leaves a quoted title out: a plan page whose issue title names a work level carries it", !F.probe(withData(T.plan, "plan", JSON.stringify({ ...copy(LIVE), issueTitle: LV })), "plan-board").some(m => m.id === "level-phrases") && F.probe(withData(T.plan, "plan", JSON.stringify({ ...copy(LIVE), function: LV2 })), "plan-board").some(m => m.id === "level-phrases"), "probe"]);
  });
  return groups;
};
