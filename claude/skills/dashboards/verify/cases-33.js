// The case groups of dashboards-skill/33 (the global conventions: boards never pages, no internal names in committed content, the pre-merge landing flow), run by
// verify-templates.js (it passes its helpers in): the element vocabulary of GUIDANCE.md §12 ("bubble" retired: guarantee cards, the WIP
// strip's cards, the inspector's cards, the dependency pill), boards never pages (check-board.js, the visible labels, the data keys
// systems[].board, links.repoBoard and links.boards read beside their older names), no internal names on a board (namerefs.js: the forms,
// scrubNames(), apply-event.js's scrub, the neutral remediation route ids, the progress notes by the work they report, the INTERNAL NAME
// warnings of check.js and check-board.js, the splice's migration of a state board's bubble classes and presenter: marks), an unnumbered
// work-level mention (levelrefs.js), the open points on every event (the fast path's standing rule), the pre-merge stamp of the state
// boards (apply-state.js facts.premerge) and the state-boards action, and the feature probes that read the older wording alike. Each
// group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases33(X) {
  const { sk, out, targets, dumpDom, inner, embedJs, node, withData, checker } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html"), SYS = tp("system/template/system.html"), SUP = tp("system/template/supersystem.html");
  if (!PB || !WB || !SYS || !SUP) return [["the dashboards-skill/33 cases (the four templates under test)", [["the four templates are under test", false, "a repository template set without them skips these groups"]]]];
  const N = require(sk("system/scripts/namerefs.js")), LR = require(sk("system/scripts/levelrefs.js")), lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), L = require(sk("system/scripts/statelib.js"));
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const text = h => (h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8" });
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), SPLICE = sk("system/scripts/splice.js"), AS = sk("system/scripts/apply-state.js");
  const sc = path.join(out, "skill-33"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const LIVE = J("verify/fixtures/live-issue.plan.json"), EX = J("plan/examples/38-handshake-empty-name/plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const tree = (name, boards) => { const root = path.join(sc, name); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    boards.forEach(d => { const dir = path.join(root, ...d.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), rd(PB)); node(embedJs, dir); }); return root; };
  const req = (file, o) => wr(file, JSON.stringify({ v: 1, action: "plan-board", ...o }));
  const apply = (root, rq, at) => { const r = cp.spawnSync(process.execPath, [APPLY, "--event", rq, "--worktree", root, "--no-live", "--at", at, "--json"], { encoding: "utf8" }); let s = {}; try { s = JSON.parse((r.stdout || "{}").trim().split(/\r?\n/).pop() || "{}"); } catch (e) { s = { error: (r.stdout || "") + (r.stderr || "") }; } return { status: r.status, s }; };
  const planOf = (root, folder) => JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json")));
  const built = d => { d.status = "building"; d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; }); Object.assign(d.wip, { questions: [], research: null }); return d; };

  /* 1. the vocabulary and the names in the templates themselves */
  guard("the templates: no \"bubble\", the §12 classes, no internal name in their fixed text and comments, the boards' labels (dashboards-skill/33)", c => {
    const T = { [PB]: "the issue-board template", [WB]: "the repository work board's template", [SYS]: "the system-board template", [SUP]: "the supersystem-board template" };
    Object.entries(T).forEach(([f, what]) => {
      const h = rd(f);
      c.push([`${what}: the word "bubble" names nothing (no class, no function, no text)`, !/bubble/i.test(h), (h.match(/.{0,30}bubble.{0,30}/i) || [""])[0]]);
      const cm = N.commentRefs(h);
      c.push([`${what}: its comments name no internal role (the placeholder mark is fill:)`, !cm.length && !/<!--\s*presenter:|\/\/\s*presenter:/.test(h), js(cm)]);
      /* the shown strings: the text outside scripts, and the template literals and strings of its scripts, less the progress notes' file names */
      const body = text(h), strs = [...h.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).filter(l => !/const (AGENTS|NOTE_WORK|ROUTE_OLD)=|function progNames\(|^\s*\/\//.test(l)).join("\n").matchAll(/`([^`]*)`|"([^"\n]{12,})"/g)].map(m => m[1] || m[2]).join(" | ");
      const hits = [...N.nameRefs(body), ...N.nameRefs(strs).filter(x => !/^admin-team$/i.test(x))];
      c.push([`${what}: no internal name in what it shows`, !hits.length, js([...new Set(hits)])]);
    });
    const sys = rd(SYS), sup = rd(SUP), pb = rd(PB), wb = rd(WB);
    c.push(["the state templates' Guarantees are guarantee cards (.guarantee-cards, .guarantee-card)", [sys, sup].every(h => /<div class="guarantee-cards">/.test(h) && /<div class="guarantee-card"><h3>Failure model<\/h3>/.test(h) && /\.guarantee-card\{/.test(h)), "classes"]);
    c.push(["the issue board's WIP strip, inspector and dependency marks carry the type word (.wipcards, .wipcard, .icards, .icard, .dep-pill)", /\.wip\.wipcards\{/.test(pb) && /class="wipcard unit/.test(pb) && /class="icards"/.test(pb) && /class="icard"/.test(pb) && /class="dep-pill"/.test(pb) && /const depPill=/.test(pb) && /function cardInspector\(/.test(pb), "classes"]);
    c.push(["the repository work board's dependency pill (.dep-pill, depPill())", /class="dep-pill"/.test(wb) && /const depPill=/.test(wb), "classes"]);
    c.push(["the labels say board: \"Repository work board\" (title, heading, links), \"Board\" in a supersystem board's inspector", /<title>Repository work board<\/title>/.test(wb) && /<h1>Repository work board<\/h1>/.test(wb) && /wbLink\("Repository work board"\)/.test(pb) && />Repository work board<\/a>/.test(sys) && /<dt>Board<\/dt>/.test(sup) && !/<dt>Dashboard<\/dt>/.test(sup), "labels"]);
    c.push(["the footer's authority sentence says \"beside this board\"", /Code and the Markdown beside this board are authoritative on any conflict\./.test(pb) && /beside this board are authoritative/.test(wb), "footer"]);
    c.push(["the checker is check-board.js; check-page.js is gone", fs.existsSync(sk("system/scripts/check-board.js")) && !fs.existsSync(sk("system/scripts/check-page.js")), "files"]);
  });

  /* 2. the forms and the scrub */
  guard("namerefs.js: the internal names found, a library's word left alone, scrubNames()'s safe rewrites; levelrefs.js's unnumbered mention (dashboards-skill/33)", c => {
    const found = ["accepted by the admin team", "the planner reconciled it", "rookie-dev's fixes", "qa found two issues", "the presenter's call", "the user's call", "the user chose B", "planner: rule on the gaps", "planner reconciles", "a code-reviewer pass", "the test-inspector report", "two researchers still out", "a planner re-pass"];
    const fine = ["uses OkHttp's `RoutePlanner`", "RoutePlanner picks a route", "runs on an `Executor`", "a single-thread executor drains the queue", "the event publisher emits", "qa pass 2 approved", "the QA tile", "from qa pass 1", "the implementer added a test", "waiting on the user", "the research step", "the architecture", "the bytecode verifier rejects it", "Level 2 — component"];
    const miss = found.filter(t => !N.nameRefs(t).length), wrong = fine.filter(t => N.nameRefs(t).length);
    c.push(["each internal form is found", !miss.length, js(miss)]);
    c.push(["a library's word, the qa step and the implementer are not", !wrong.length, js(wrong.map(t => [t, N.nameRefs(t)]))]);
    const want = [["Accepted by the admin team, PR #9.", "Accepted, PR #9."], ["a planner re-pass, then rookie-dev's fixes", "a plan re-pass, then the fixes"], ["Relevant is what qa's test-inspector ran", "Relevant is what the qa pass's test inspection ran"],
      ["Kept (the user's call).", "Kept."], ["rookie-dev: the 27 minor fixes", "the 27 minor fixes"], ["code-reviewer: no findings", "no findings"], ["Nine gaps await the planner's ruling", "Nine gaps await the ruling"], ["Two exclusions flagged by qa: x", "Two exclusions flagged: x"]];
    const bad = want.filter(([s, w]) => { const r = N.scrubNames(s); return r.text !== w || r.left.length; });
    c.push(["scrubNames(): the agent phrase dropped, a possessive the article, a role's work the work, a role label and an aside on the approval flow dropped", !bad.length, js(bad.map(([s, w]) => [s, N.scrubNames(s), w]))]);
    const left = N.scrubNames("The planner reconciled the impact.");
    c.push(["…and where no safe rewrite exists, the name is left and reported (the caller decides)", left.left.length === 1 && left.text === "The planner reconciled the impact.", js(left)]);
    c.push(["unambiguous(): a name no library uses, the approval flow and qa as an agent are; a library's word is not", N.unambiguous("rookie-dev") && N.unambiguous("user's call") && N.unambiguous("qa found") && !N.unambiguous("the planner") && !N.unambiguous("an executor"), "unambiguous"]);
    const lv = [["Recorded level confirmed.", "Recorded sizing confirmed."], ["the level was confirmed", "the sizing was confirmed"], ["the level re-check passed", "the sizing re-check passed"], ["the issue's level", "the issue's sizing"], ["proposed level 3 confirmed", "proposed sizing confirmed"]];
    const lvBad = lv.filter(([s, w]) => !LR.levelRefs(s).length || LR.scrubLevels(s, {}) !== w);
    c.push(["levelrefs.js: an unnumbered work-level mention is found and reworded (\"Recorded level confirmed\" → \"Recorded sizing confirmed\")", !lvBad.length, js(lvBad.map(([s, w]) => [s, LR.levelRefs(s), LR.scrubLevels(s, {}), w]))]);
    const notLv = ["the test level is recorded", "log level confirmed", "Level 1 · System Context", "tests at levels 1 to 4c", "the L2 component level check"];
    c.push(["…never a test level's, a log level's or a C4 level's words", notLv.every(s => !LR.levelRefs(s).length), js(notLv.filter(s => LR.levelRefs(s).length).map(s => [s, LR.levelRefs(s)]))]);
  });

  /* 3. apply-event.js: the scrub, the routes, the open points on every event */
  guard("apply-event.js: fact texts written with no internal name, the remediation routes' neutral ids, the open points on every event (dashboards-skill/33)", c => {
    const H = copy(LIVE); H.folder = "docs/plans/71-names"; H.issue = 71; H.slug = "71-names";
    const root = tree("ae", [H]);
    const a = apply(root, req(path.join(sc, "halt.json"), { github: H.repo, issue: H.issue, event: "halted", folder: H.folder, facts: { waitingOn: "A choice between two designs, accepted by the admin team (the user's call).", detail: "rookie-dev is out on S2", open: [{ text: "Open: the cache's eviction rule, flagged by qa", ref: "plan.md" }] } }), "2026-10-25T12:00:00Z");
    const p = planOf(root, H.folder), all = js(p.wip) + js(p.trail);
    c.push(["what waits on the user, reworded: the agent phrase and the aside dropped", a.status === 0 && p.wip.waitingOn === "A choice between two designs, accepted.", js([a.status, p.wip.waitingOn, a.s.error])]);
    c.push(["a text that still names a role no library uses is left out, and the presenter told (enrich)", a.s.enrich === "yes" && (a.s.why || []).some(x => /facts\.detail names "rookie-dev", an internal name a board never shows: not written/.test(x)) && !/rookie-dev/.test(all), js(a.s.why)]);
    c.push(["the open point of an event that is not a stage or a qa pass is applied (the fast path's standing rule), raised by the event, reworded", (p.wip.open || []).some(o => o.text === "Open: the cache's eviction rule, flagged" && o.raised === "halted") && !(a.s.why || []).some(x => /is not applied by the fast path/.test(x)), js([p.wip.open, a.s.why])]);
    c.push(["nothing the event wrote names an internal name or the approval flow", !N.nameRefsIn(p, "", [], LR.titleSkip(p)).length, js(N.nameRefsIn(p, "", [], LR.titleSkip(p)))]);
    /* the routes */
    const Q = built(copy(LIVE)); Q.folder = "docs/plans/72-routes"; Q.issue = 72; Q.slug = "72-routes"; Object.assign(Q.wip, { step: "qa", current: ["built"], qa: [], qaMax: 3 });
    const r2 = tree("routes", [Q]);
    const b = apply(r2, req(path.join(sc, "qa.json"), { github: Q.repo, issue: Q.issue, event: "qa-pass", folder: Q.folder, facts: { qa: { pass: 1, verdict: "changes-requested", findings: { documentation: 2 }, route: "planner-then-rookie-dev" }, remediation: { pass: 1, route: "planner-then-rookie-dev", steps: [{ name: "planner: rule on the gaps", state: "current" }, { name: "rookie-dev fixes", state: "todo" }] } } }), "2026-10-25T12:10:00Z");
    const q = planOf(r2, Q.folder);
    c.push(["the older route id a request carries is written as its neutral one, on the pass and the loop, and still means a plan re-pass", b.status === 0 && q.wip.qa[0].route === "re-plan-then-remediation" && q.wip.remediation.route === "re-plan-then-remediation" && q.wip.plan && q.wip.plan.state === "re-pass", js([b.status, q.wip.qa, q.wip.remediation, q.wip.plan, b.s.error])]);
    c.push(["the sub-steps' role labels are dropped (\"planner: rule on the gaps\" → \"rule on the gaps\", \"rookie-dev fixes\" → \"fixes\")", q.wip.remediation && js(q.wip.remediation.steps.map(x => x.name)) === js(["rule on the gaps", "fixes"]), js(q.wip.remediation && q.wip.remediation.steps)]);
    c.push(["the detail names the route in neutral words", /a plan re-pass, then a remediation pass, then the next qa pass/.test(q.wip.detail || "") && !/planner|rookie/.test(q.wip.detail || ""), q.wip.detail]);
    const k = run(CHECK, [path.join(r2, ...Q.folder.split("/"))]);
    c.push(["check.js reads the neutral ids, and warns on no internal name", k.status === 0 && !/INTERNAL NAME/.test(k.stdout || ""), (k.stdout || "").split(/\r?\n/).filter(l => /INTERNAL|route|FAIL/.test(l)).join(" | ")]);
    /* the landing: neutral words */
    const G = built(copy(LIVE)); G.folder = "docs/plans/73-landing"; G.issue = 73; G.slug = "73-landing"; Object.assign(G.wip, { step: "landing", current: [], qa: [{ pass: 1, verdict: "approved", date: "2026-10-25", at: "2026-10-25T11:00:00Z", findings: {} }] });
    const r3 = tree("land", [G]), l = apply(r3, req(path.join(sc, "land.json"), { github: G.repo, issue: G.issue, event: "landing", folder: G.folder, facts: { pr: 9 } }), "2026-10-25T12:20:00Z"), g = planOf(r3, G.folder);
    c.push(["the landing event's note, detail and trail name no role", l.status === 0 && g.wip.event.note === "land accepted, PR #9" && g.wip.detail === "Landing: merging it in PR #9." && !/admin team/.test(js(g)), js([l.status, g.wip.event, g.wip.detail, l.s.error])]);
  });

  /* 4. the warnings */
  guard("check.js and check-board.js warn on an internal name left in a board (INTERNAL NAME), never failing it (dashboards-skill/33)", c => {
    const P = copy(LIVE); P.folder = "docs/plans/74-warn"; P.issue = 74; P.slug = "74-warn"; P.wip.detail = "The presenter writes the verdicts; accepted by the admin team.";
    const root = tree("warn", [P]), dir = path.join(root, ...P.folder.split("/"));
    const k = run(CHECK, [dir]);
    c.push(["check.js on a plan.json naming the presenter and the admin team: a warning, the board passing", k.status === 0 && /warn\s+INTERNAL NAME: plan\.json \(wip\.detail\) names /.test(k.stdout || "") && /"The presenter"/.test(k.stdout || "") && /"admin team"/.test(k.stdout || ""), (k.stdout || "").split(/\r?\n/).filter(l => /INTERNAL/.test(l)).join(" | ") || String(k.status)]);
    const P2 = copy(LIVE); P2.folder = "docs/plans/75-clean"; P2.issue = 75; P2.slug = "75-clean"; const r2 = tree("clean", [P2]), k2 = run(CHECK, [path.join(r2, ...P2.folder.split("/"))]);
    c.push(["…and none on the clean fixture rendered from the current template (its comments and data)", k2.status === 0 && !/INTERNAL NAME/.test(k2.stdout || ""), (k2.stdout || "").split(/\r?\n/).filter(l => /INTERNAL/.test(l)).join(" | ") || "none"]);
    /* a state board written before: a presenter: mark and a name in its hand-written text */
    const h = rd(SYS).replace("<!-- fill: ", "<!-- presenter: ").replace("<h1>", "<h1 title=\"x\">").replace("</footer>", "</footer><p hidden>Reworded by the planner at the landing.</p>");
    const f = wr(path.join(sc, "state", "docs", "dashboards", "alpha", "index.html"), h);
    const b = run(checker, [f, "--auto", "--no-browser"]);
    c.push(["check-board.js --auto --no-browser on a state board with a presenter: comment and \"the planner\" in its text: warnings, the board not failed for them", /CHECK warning: INTERNAL NAME: its comments names "presenter:"/.test(b.stdout || "") && /CHECK warning: INTERNAL NAME: its text names "the planner"/.test(b.stdout || "") && !/^CHECK INTERNAL NAME/m.test(b.stdout || ""), (b.stdout || "").split(/\r?\n/).filter(l => /INTERNAL|^FAIL|^PASS/.test(l)).join(" | ")]);
    const ok = run(checker, [wr(path.join(sc, "state2", "docs", "dashboards", "alpha", "index.html"), rd(SYS)), "--auto", "--no-browser"]);
    c.push(["…and none on the current system template", !/INTERNAL NAME/.test(ok.stdout || ""), (ok.stdout || "").split(/\r?\n/).filter(l => /INTERNAL/.test(l)).join(" | ") || "none"]);
    /* a board rendered before keeps its footer's "beside this page" until it is re-rendered (a landed board never is): the check takes it */
    const ex = sk("plan/examples/38-handshake-empty-name/dashboard.html"), fp = run(checker, [ex, "--out", path.join(sc, "footer")]);
    c.push(["check-board.js takes the footer a board rendered before carries (\"beside this page\")", !/beside this page/.test(rd(ex)) || /CHECK footer: trimmed:/.test(fp.stdout || ""), (fp.stdout || "").split(/\r?\n/).filter(l => /footer/.test(l)).join(" | ")]);
  });

  /* 5. the splice migrates a state board's names */
  guard("splice.js: a state board made before is brought onto the template with guarantee cards and fill: marks, no bubble or presenter: left (dashboards-skill/33)", c => {
    const V = JSON.parse(rd(sk("verify/verified.json"))).templates["system/template/system.html"], hist = (V.history || []).filter(v => v.file && fs.existsSync(sk("verify/history/" + v.file)));
    const old = hist.map(v => rd(sk("verify/history/" + v.file))).reverse().find(h => /class="bubble"/.test(h) && /<!-- presenter:/.test(h));
    if (!old) { c.push(["a recorded version with bubble classes and presenter: marks is in verify/history/", false, "none cached"]); return; }
    const f = wr(path.join(sc, "splice", "docs", "dashboards", "alpha", "index.html"), old.replace("</footer>", "</footer><style>.bubble.mine{outline:0}</style>"));
    const r = run(SPLICE, [f, "--template", SYS, "--json"]); let j = null; try { j = JSON.parse((r.stdout || "").trim().split(/\r?\n/).pop()); } catch (e) { /* reported below */ }
    const h = rd(f);
    c.push(["the board's Guarantees take the template's classes, its own CSS follows, its comments say guarantee cards (no bubble left)", !/bubble/.test(h) && /<div class="guarantee-cards">/.test(h) && /<div class="guarantee-card"><h3>/.test(h) && /\.guarantee-card\.mine\{outline:0\}/.test(h), js([r.status, j && j.renamed, (h.match(/.{0,30}bubble.{0,30}/) || [""])[0]])]);
    c.push(["its placeholder marks read fill:, none presenter:", !/<!--\s*presenter:|\/\/\s*presenter:/.test(h) && /<!-- fill: /.test(h), (h.match(/.{0,20}presenter:.{0,30}/) || ["none"])[0]]);
    c.push(["the splice reports what it renamed", !!j && Array.isArray(j.renamed) && j.renamed.some(x => /guarantee-card/.test(x)) && j.renamed.some(x => /fill:/.test(x)), js(j && j.renamed)]);
  });

  /* 6. the data keys */
  guard("the data keys: systems[].board and links.repoBoard / links.boards, the older page, repoPage and pages read alike (dashboards-skill/33)", c => {
    const root = path.join(sc, "keys"), D = path.join(root, "docs", "dashboards");
    wr(path.join(D, "systems.json"), JSON.stringify({ repo: "acme/widgets", systems: [{ slug: "repo", name: "widgets", kind: "repo", parent: null, status: "built", page: "index.html" }, { slug: "alpha", name: "alpha", kind: "system", parent: null, status: "built", page: "alpha/index.html" }, { slug: "beta", name: "beta", kind: "system", parent: null, status: "built", board: "beta/index.html" }] }, null, 2));
    wr(path.join(D, "index.html"), "<!doctype html><title>r</title>"); wr(path.join(D, "alpha", "index.html"), "<!doctype html><title>a</title>"); wr(path.join(D, "beta", "index.html"), "<!doctype html><title>b</title>");
    const reg = lib.registry(root);
    c.push(["lib.js registry(): a system's board from \"board\", or from \"page\" in a registry written before; written as \"board\"", reg.info("alpha").board === "docs/dashboards/alpha/index.html" && reg.info("beta").board === "docs/dashboards/beta/index.html" && !("page" in reg.info("alpha")), js([reg.info("alpha"), reg.info("beta")])]);
    const P = copy(EX); P.folder = "docs/plans/38-handshake-empty-name"; P.systems = [{ slug: "alpha", name: "alpha", slot: 1, top: "alpha", status: "built", page: "docs/dashboards/alpha/index.html" }, { slug: "beta", name: "beta", slot: 2, top: "beta", status: "built", board: "docs/dashboards/beta/index.html" }];
    const dir = path.join(root, ...P.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(P, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "dashboard.html"), rd(PB));
    const now = lib.sharedLinks(P, dir);
    c.push(["on the current template, embed.js writes repoBoard and boards, a system read by its board or its page", now.repoBoard === "../../dashboards/index.html" && now.boards && now.boards.alpha === "../../dashboards/alpha/index.html" && now.boards.beta === "../../dashboards/beta/index.html" && !("repoPage" in now) && !("pages" in now), js(now)]);
    fs.writeFileSync(path.join(dir, "dashboard.html"), rd(PB).split('sharedLink("repoBoard")').join('sharedLink("repoPage")'));
    const was = lib.sharedLinks(P, dir);
    c.push(["on a board whose template reads only the older keys (a landed board), embed.js keeps writing repoPage and pages", was.repoPage === "../../dashboards/index.html" && was.pages && was.pages.alpha && !("repoBoard" in was), js(was)]);
    c.push(["linkOf(): a link by its key or its older one", lib.linkOf({ repoPage: "x" }, "repoBoard") === "x" && lib.linkOf({ repoBoard: "y", repoPage: "x" }, "repoBoard") === "y" && lib.linkOf({ pages: { a: 1 } }, "boards").a === 1, "linkOf"]);
    /* the template reads the older keys: rendered with links.repoPage and links.pages */
    const O = copy(P); O.links = { repoPage: "../../dashboards/index.html", pages: { alpha: "../../dashboards/alpha/index.html" } };
    const f = wr(path.join(sc, "keys-render", "dashboard.html"), withData(rd(PB), "plan", JSON.stringify(O, null, 2)));
    const d = dumpDom(f);
    c.push(["the current issue-board template links the repository state board and a system's board from the older keys too", d == null || (/<a href="\.\.\/\.\.\/dashboards\/index\.html">/.test(inner(d, '<nav class="crumbs"', "nav") || d) && /href="\.\.\/\.\.\/dashboards\/alpha\/index\.html"/.test(d)), d == null ? "no browser" : (d.match(/<a href="[^"]*dashboards[^"]*">[^<]*<\/a>/g) || []).slice(0, 3).join(" ")]);
    const k = run(CHECK, [dir]);
    c.push(["check.js accepts the new keys and the old (no failure for either)", !/links must be an object/.test(k.stdout || ""), (k.stdout || "").split(/\r?\n/).filter(l => /links/.test(l)).join(" | ") || "ok"]);
  });

  /* 7. apply-state.js: the pre-merge stamp, the state-boards action */
  guard("apply-state.js: the pre-merge stamp at the head the team names, \"<branch> @ <sha>\" with no \"not yet landed\"; the state-boards action, state-pages read alike (dashboards-skill/33)", c => {
    const root = path.join(sc, "premerge"), D = path.join(root, "docs", "dashboards"), stamp = { ref: "main", sha: "1111111", date: "2026-10-20" };
    const st = slug => L.stateText({ slug, version: null, asIs: stamp, written: { sha: "1111111" } });
    const reg = { repo: "acme/widgets", updated: "2026-10-20", systems: [{ slug: "repo", name: "widgets", kind: "repo", parent: null, status: "built", function: "x", paths: ["."], version: null, asIs: stamp, board: "index.html", dsl: "workspace.dsl" },
      { slug: "system-alpha", name: "system-alpha", kind: "system", parent: null, status: "built", function: "x", paths: [], asIs: stamp }, { slug: "system-beta", name: "system-beta", kind: "system", parent: null, status: "built", function: "x", paths: [], asIs: stamp }, { slug: "system-gamma", name: "system-gamma", kind: "system", parent: null, status: "planned", function: "x", paths: [] }] };
    const regText = JSON.stringify(reg, null, 2) + "\n", T = rd(SUP), dsl = L.blockText(T, "dsl");
    wr(path.join(D, "systems.json"), regText); wr(path.join(D, "state.json"), st("repo")); wr(path.join(D, "workspace.dsl"), dsl + "\n");
    wr(path.join(D, "index.html"), L.embedInto(L.embedInto(L.embedInto(T, "systems", regText), "dsl", dsl), "state", st("repo")));
    const rq = (action, facts) => wr(path.join(root, "req.json"), JSON.stringify({ action, github: "acme/widgets", issue: 9, branch: "feat/9", facts: { at: "2026-10-25T12:00:00Z", systems: ["system-alpha"], ...facts } }));
    const ap = f => { const r = run(AS, ["--event", f, "--worktree", root, "--json"]); let s = {}; try { s = JSON.parse(r.stdout.trim().split(/\r?\n/).pop()); } catch (x) { s = { error: r.stdout + r.stderr }; } s.status = r.status; return s; };
    let s = ap(rq("state-pages", { sha: "2222222" }));
    const R1 = JSON.parse(rd(path.join(D, "systems.json"))).systems.find(e => e.slug === "system-alpha");
    c.push(["a state-pages request (the older action name) still applies: the branch's stamp, not yet landed", s.status === 0 && R1.asIs.ref === "feat/9" && R1.asIs.landed === false, js([s.status, s.result, s.error, R1.asIs])]);
    s = ap(rq("state-boards", { sha: "3333333", premerge: true }));
    const R2 = JSON.parse(rd(path.join(D, "systems.json"))).systems.find(e => e.slug === "system-alpha"), S2 = JSON.parse(L.blockText(rd(path.join(D, "index.html")), "state") || "{}");
    c.push(["the pre-merge stamp: the branch at the head named, with no \"not yet landed\", on the registry and the repository state board", s.status === 0 && R2.asIs.ref === "feat/9" && R2.asIs.sha === "3333333" && !("landed" in R2.asIs) && S2.asIs && S2.asIs.sha === "3333333" && !("landed" in S2.asIs) && /^feat\/9 @ 3333333 · /.test(s.stamp || ""), js([s.status, s.result, s.stamp, s.error, R2.asIs, S2.asIs])]);
  });

  /* 8. the probes read the older wording alike, so a board made before is not failed for the wording alone */
  guard("the feature probes: the landing step's wording, the built parts' board and the dependency pill read in their older wording too (dashboards-skill/33)", c => {
    const pb = rd(PB), sup = rd(SUP), wb = rd(WB), miss = (h, k) => F.probe(h, k).map(m => m.id);
    c.push(["the current templates carry every feature they take", !miss(pb, "plan-board").length && !miss(wb, "work-board").length && !miss(sup, "supersystem").length && !miss(rd(SYS), "system").length, js([miss(pb, "plan-board"), miss(wb, "work-board"), miss(sup, "supersystem"), miss(rd(SYS), "system")])]);
    const pbOld = pb.split("the land is accepted and being merged").join("the admin team has accepted the land and is merging it").split("depPill").join("depBubble");
    c.push(["an issue board in the older wording (\"the admin team has accepted the land\", depBubble()) lacks no feature for it", !miss(pbOld, "plan-board").some(x => ["landing-event", "dependency-pills"].includes(x)), js(miss(pbOld, "plan-board"))]);
    const supOld = sup.split("its built parts' board").join("its built parts' page");
    c.push(["a supersystem board in the older wording (\"its built parts' page\") lacks no feature for it", !miss(supOld, "supersystem").includes("planned-parts-page"), js(miss(supOld, "supersystem"))]);
  });
  return groups;
};
