// The case groups of admin-team/dashboards-skill/31, run by verify-templates.js (it passes its helpers in): the decision not to run another
// qa pass shown (a pass whose findings were fixed in place, its on-the-spot route read from the pass, the remediation loop answering it, or
// a frozen remediation visit; never from prose), derived by lib.js qaShown() / qaInPlace() and drawn as a small neutral mark beside the
// pass on the work board's QA column, a plan board's QA tile and WIP strip and a tracking unit's run line; apply-event.js recording a
// remediation's route on the pass it answers; check.js refusing a stored inPlace; the work board's Runs tab drawn larger but its Now column,
// each run a labelled card under 880 px with no sideways scroll; and this run's feature probes. Each group returns [title, cases], a case
// [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases31(X) {
  const { sk, out, targets, dumpDom, inner, embedJs, node, withData } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  if (!PB || !WB) return [["the dashboards-skill/31 cases (both plan-set templates under test)", [["both plan-set templates are under test", false, "a repository template set without them skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const text = h => (h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  const run = (f, a, env) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env: { ...process.env, ...(env || {}) } });
  const APPLY = sk("plan/scripts/apply-event.js"), BOARD = sk("plan/scripts/board.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "skill-31"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const LIVE = J("verify/fixtures/live-issue.plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), WBJ = J("verify/fixtures/work-board.json");
  const probeAt = (html, code) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${code} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const CR = (pass, o) => ({ pass, verdict: "changes-requested", findings: { documentation: 3 }, ...(o || {}) });
  const v = w => js(lib.qaShown(w).map(p => `${p.pass}:${p.verdict}${p.inPlace ? ":" + p.inPlace : ""}`));

  /* 1. the rule in lib.js */
  guard("lib.js: qaShown() marks the pass fixed in place with no further pass, from the recorded route only (dashboards-skill/31)", c => {
    c.push(["#62's record: pass 1 changes requested, route on-the-spot, the run landed: fixed in place", v({ step: "landed", qa: [CR(1, { route: "on-the-spot" })] }) === js(["1:changes-requested:fixed"]), v({ step: "landed", qa: [CR(1, { route: "on-the-spot" })] })]);
    const w63 = { step: "remediation", qa: [CR(1, { route: "planner-then-rookie-dev" }), CR(2, { route: "on-the-spot" })], qaMax: 3, remediation: { pass: 2, route: "on-the-spot", steps: [{ name: "rookie-dev: the minor fixes", state: "current" }] } };
    c.push(["#63's record: pass 2 on-the-spot while the run is at remediation: fixing; only the last pass is marked", v(w63) === js(["1:changes-requested", "2:changes-requested:fixing"]), v(w63)]);
    c.push(["…its words name the pass after it: \"fixing in place · no 3rd pass\"; \"fixed in place · no 2nd pass\" for #62", lib.inPlaceWords(lib.qaShown(w63)[1]) === "fixing in place · no 3rd pass" && lib.inPlaceWords(lib.qaShown({ step: "landing", qa: [CR(1, { route: "on-the-spot" })] })[0]) === "fixed in place · no 2nd pass", lib.inPlaceWords(lib.qaShown(w63)[1])]);
    c.push(["halted to resume at remediation: still fixing", v({ step: "halted", resume: "remediation", qa: [CR(1, { route: "on-the-spot" })] }) === js(["1:changes-requested:fixing"]), "halted"]);
    c.push(["the route read from the remediation loop answering the pass when the pass records none", v({ step: "landing", qa: [CR(1)], remediation: { pass: 1, route: "on-the-spot" } }) === js(["1:changes-requested:fixed"]) && v({ step: "landing", qa: [CR(1)], remediation: { pass: 2, route: "on-the-spot" } }) === js(["1:changes-requested"]), "the loop's pass must match"]);
    c.push(["…else from a frozen remediation visit that answered it (wip.history.remediation)", v({ step: "landed", qa: [CR(1)], remediation: null, history: { remediation: [{ remediation: { pass: 1, route: "on-the-spot" } }] } }) === js(["1:changes-requested:fixed"]), "history"]);
    c.push(["#47's record (the decision only in its note, no route): no mark, never read from prose", v({ step: "landed", qa: [CR(1, { note: "7 doc items and 2 test gaps, fixed on the spot; no second pass" })] }) === js(["1:changes-requested"]), "note only"]);
    c.push(["no mark for another route, an approving pass, or a pass running after it", v({ step: "landed", qa: [CR(1, { route: "rookie-dev" })] }) === js(["1:changes-requested"]) && v({ step: "landed", qa: [{ pass: 1, verdict: "approved", route: "on-the-spot" }] }) === js(["1:approved"]) && v({ step: "qa", qa: [CR(1, { route: "on-the-spot" })], qaMax: 3 }) === js(["1:changes-requested", "2:running"]), "rookie-dev · approved · running"]);
    const src = [CR(1, { route: "on-the-spot" })]; lib.qaShown({ step: "landed", qa: src });
    c.push(["qaShown() copies the pass: the board's own wip.qa is never written", src[0].inPlace === undefined, js(src[0])]);
  });

  /* 2. apply-event.js and check.js */
  const tree = (name, boards) => { const root = path.join(sc, name); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    boards.forEach(d => { const dir = path.join(root, ...d.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), rd(PB)); node(embedJs, dir); }); return root; };
  const req = (file, o) => wr(file, JSON.stringify({ v: 1, action: "plan-board", ...o }));
  const apply = (root, rq, at) => { const r = cp.spawnSync(process.execPath, [APPLY, "--event", rq, "--worktree", root, "--no-live", "--at", at, "--json"], { encoding: "utf8" }); let s = {}; try { s = JSON.parse((r.stdout || "{}").trim().split(/\r?\n/).pop() || "{}"); } catch (e) { s = { error: (r.stdout || "") + (r.stderr || "") }; } return { status: r.status, s }; };
  const planOf = (root, folder) => JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json")));
  const built = d => { d.status = "building"; d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; }); Object.assign(d.wip, { questions: [], research: null }); return d; };
  guard("apply-event.js records a remediation's route on the pass it answers; check.js refuses a stored inPlace (dashboards-skill/31)", c => {
    const Q = built(copy(LIVE)); Object.assign(Q.wip, { step: "qa", current: ["built"], qa: [], qaMax: 3 });
    const root = tree("ae", [Q]);
    const a = apply(root, req(path.join(sc, "qa.json"), { github: Q.repo, issue: Q.issue, event: "qa-pass", folder: Q.folder, facts: { qa: { pass: 1, verdict: "changes-requested", findings: { documentation: 2 } } } }), "2026-10-25T12:00:00Z");
    const p1 = planOf(root, Q.folder);
    c.push(["a qa pass sent with no route records none", a.status === 0 && p1.wip.qa[0].route === undefined, js([a.status, p1.wip.qa, a.s.error])]);
    const b = apply(root, req(path.join(sc, "rem.json"), { github: Q.repo, issue: Q.issue, event: "implementation-stage", folder: Q.folder, facts: { step: "remediation", remediation: { pass: 1, route: "on-the-spot", steps: [{ name: "minor fixes on the spot", state: "current" }] } } }), "2026-10-25T12:10:00Z");
    const p2 = planOf(root, Q.folder);
    c.push(["the remediation event's on-the-spot route is written onto pass 1 too, and the summary says so", b.status === 0 && p2.wip.qa[0].route === "on-the-spot" && (b.s.applied || []).includes("wip.qa pass 1 route on-the-spot"), js([b.status, p2.wip.qa, b.s.applied, b.s.error])]);
    c.push(["…so the mark outlives the loop: with wip.remediation cleared, the pass still reads fixed in place", v({ ...p2.wip, step: "landing", remediation: null }) === js(["1:changes-requested:fixed"]), v({ ...p2.wip, step: "landing", remediation: null })]);
    const d = copy(p2); d.wip.qa[0].inPlace = "fixed"; const dir = path.dirname(wr(path.join(sc, "chk", ...d.folder.split("/"), "plan.json"), JSON.stringify(d, null, 2) + "\n"));
    fs.writeFileSync(path.join(dir, "dashboard.html"), rd(PB)); node(embedJs, dir); const k = run(CHECK, [dir]);
    c.push(["check.js fails a stored inPlace: it is derived from the route", k.status !== 0 && /wip\.qa\[0\]\.inPlace is derived/.test(k.stdout || ""), (k.stdout || "").split(/\r?\n/).filter(l => /inPlace/.test(l)).join(" | ") || String(k.status)]);
  });

  /* 3. board.js writes the mark into the row, and the work-board page draws it, with its legend; an older board.json is derived */
  guard("the work board: the mark beside the pass in the QA column, its legend, from board.js and from an older board.json (dashboards-skill/31)", c => {
    const root = path.join(sc, "wbtree"), plans = path.join(root, "docs", "plans"); fs.mkdirSync(plans, { recursive: true });
    const git = (...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd: root, encoding: "utf8" });
    if (git("init", "-q", "-b", "master").status !== 0) { c.push(["git is available", false, "git init failed"]); return; }
    git("remote", "add", "origin", `https://github.com/${LIVE.repo}.git`);
    const L = built(copy(LIVE)); L.status = "built"; Object.assign(L.wip, { step: "landed", current: [], qa: [CR(1, { route: "on-the-spot" })], qaMax: 3 }); L.folder = "docs/plans/" + path.basename(LIVE.folder);
    const dir = path.join(root, ...L.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(L, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), rd(PB));
    const r = run(BOARD, ["--root", root, "--no-gh"]);
    let row = {}; try { row = JSON.parse(rd(path.join(plans, "board.json"))).rows.find(x => x.issue === L.issue) || {}; } catch (e) { /* reported below */ }
    c.push(["board.js writes the pass with inPlace \"fixed\" into the row", r.status === 0 && js((row.qa || []).map(p => p.inPlace || null)) === js(["fixed"]), js([r.status, row.qa, (r.stdout + r.stderr).trim().split(/\r?\n/).slice(-2)])]);
    const w = copy(WBJ), r84 = w.rows.find(x => x.issue === 84), r47 = w.rows.find(x => x.issue === 47);
    r84.qa = [CR(1, { route: "on-the-spot", inPlace: "fixed" })]; r84.qaMax = 3;
    r47.step = "remediation"; r47.qa = [CR(1, { route: "on-the-spot" })];   /* an older board.json: the route, no inPlace */
    const page = wr(path.join(sc, "wb", "index.html"), withData(rd(WB), "board", JSON.stringify(w, null, 2)));
    const dom = dumpDom(page); if (dom == null) { c.push(["a headless browser is available", true, "skipped: no browser"]); return; }
    const rowOf = n => { const m = new RegExp(`<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*/issues/${n}"`).exec(dom); return m ? inner(dom.slice(m.index), '<tr class="run[^"]*"[^>]*>', "tr") : ""; };
    const t84 = text(rowOf(84)), t47 = text(rowOf(47));
    c.push(["#84's QA cell: \"✕ 1st · changes requested\" with \"✎ fixed in place · no 2nd pass\" beside it, in a neutral mark", /1st · changes requested ✎ fixed in place · no 2nd pass/.test(t84) && /<span class="qa1"><span class="vp critical">[\s\S]*?<\/span><span class="qamark"/.test(rowOf(84)), t84.slice(t84.indexOf("1st"), t84.indexOf("1st") + 80)]);
    c.push(["an older board.json (the route, no inPlace) at remediation: the page derives \"fixing in place · no 2nd pass\"", /✎ fixing in place · no 2nd pass/.test(t47), t47.slice(t47.indexOf("1st"), t47.indexOf("1st") + 80)]);
    const key = text(inner(dom, '<div class="key" id="runs-key">', "div"));
    c.push(["the legend names both marks drawn, each with its meaning", /fixed in place · no 2nd pass the findings were fixed on the spot, and no further qa pass ran/.test(key) && /fixing in place · no 2nd pass the findings are being fixed on the spot; no further qa pass will run/.test(key), key.slice(key.indexOf("✎") - 5, key.indexOf("✎") + 200)]);
    const plain = copy(WBJ), p2 = wr(path.join(sc, "wb-plain", "index.html"), withData(rd(WB), "board", JSON.stringify(plain, null, 2))), d2 = dumpDom(p2) || "";
    c.push(["no mark, and no legend entry, where no pass records the route (the fixture's #61: its note says \"no third pass\", never read)", !/qamark/.test(inner(d2, '<table class="tbl" id="runs">', "table")) && !/fixed in place/.test(text(inner(d2, '<div class="key" id="runs-key">', "div"))), "none"]);
  });

  /* 4. the plan board's WIP strip and QA tile, and a tracking unit's run line */
  guard("plan boards: the mark on the WIP strip's qa pill and in the QA tile; a tracking unit's run line (dashboards-skill/31)", c => {
    const Q = built(copy(LIVE)); Object.assign(Q.wip, { step: "remediation", current: ["built"], qa: [CR(1, { route: "on-the-spot" })], qaMax: 3, remediation: { pass: 1, route: "on-the-spot", steps: [{ name: "minor fixes on the spot", state: "current" }] } });
    const page = wr(path.join(sc, "pb", "dashboard.html"), withData(rd(PB), "plan", JSON.stringify(Q, null, 2)));
    const dom = dumpDom(page); if (dom == null) { c.push(["a headless browser is available", true, "skipped: no browser"]); return; }
    const wt = text(inner(dom, '<section class="wip[^"]*"[^>]*>', "section")), kp = text(inner(dom, '<div class="kpis" id="kpis">', "div"));
    c.push(["the WIP strip: \"1st pass · changes requested\" with \"✎ fixing in place · no 2nd pass\", and its legend entry", /1st pass · changes requested[^✎]{0,40}✎ fixing in place · no 2nd pass/.test(wt) && /the findings are being fixed on the spot; no further qa pass will run/.test(wt), wt.slice(wt.indexOf("1st pass"), wt.indexOf("1st pass") + 120)]);
    c.push(["the QA tile's sub-line: \"1st pass: changes requested, fixing in place · no 2nd pass\"", /1st pass: changes requested, fixing in place · no 2nd pass/.test(kp), kp.slice(kp.indexOf("QA passes"), kp.indexOf("QA passes") + 140)]);
    const Ld = copy(Q); Ld.status = "built"; Ld.wip.step = "landed"; Ld.wip.current = []; Ld.wip.remediation = null;
    const dl = dumpDom(wr(path.join(sc, "pb-landed", "dashboard.html"), withData(rd(PB), "plan", JSON.stringify(Ld, null, 2)))) || "", wl = text(inner(dl, '<section class="wip[^"]*"[^>]*>', "section"));
    c.push(["a landed board's WIP strip: \"fixed in place · no 2nd pass\"", /✎ fixed in place · no 2nd pass/.test(wl), wl.slice(wl.indexOf("1st pass"), wl.indexOf("1st pass") + 100)]);
    const T = copy(TRK), jf = T.rows.find(r => r.id === "java-floor"); Object.assign(jf.unit.live, { step: "landing", resume: null, waitingOn: null, qa: [CR(1, { route: "on-the-spot" })] });
    const td = dumpDom(wr(path.join(sc, "tb", "dashboard.html"), withData(rd(PB), "plan", JSON.stringify(T, null, 2)))) || "";
    c.push(["a tracking board: the unit's run (its qa pills) shows \"✎ fixed in place · no 2nd pass\", with the legend entry", /1st qa · changes requested ✎ fixed in place · no 2nd pass/.test(text(td)) && /the findings were fixed on the spot, and no further qa pass ran/.test(text(td)), (text(td).match(/.{0,60}fixed in place.{0,60}/) || [""])[0]]);
  });

  /* 5. the Runs tab larger but Now; a labelled card per run under 880 px */
  guard("the work board's Runs tab: every column larger but Now; each run a labelled card at phone width, no sideways scroll (dashboards-skill/31)", c => {
    const page = wr(path.join(sc, "wb-size", "index.html"), probeAt(withData(rd(WB), "board", JSON.stringify(WBJ, null, 2)),
      'const fz=s=>{const e=document.querySelector(s);return e?parseFloat(getComputedStyle(e).fontSize):null;};const r=[...document.querySelectorAll("#runs tr.run")];const first=sel=>{for(const t of r){const e=t.querySelector(sel);if(e)return parseFloat(getComputedStyle(e).fontSize);}return null;};' +
      'const tr=r[0],sc=document.querySelector(".scroll");document.body.dataset.r=JSON.stringify({t:first("td:nth-child(1) .t"),state:first("td:nth-child(2) .vp"),qa:first("td:nth-child(4) .vp"),dep:first("td:nth-child(5) .dep .vp"),now:first("td:nth-child(3)"),key:fz("#runs-key .vp"),thead:getComputedStyle(document.querySelector("#runs thead")).display,row:getComputedStyle(tr).display,label:getComputedStyle(tr.querySelector("td:nth-child(2)"),"::before").content,page:document.documentElement.scrollWidth-window.innerWidth,inner:sc.scrollWidth-sc.clientWidth});'));
    const wide = got(dumpDom(page, "", "1920,1080", 6000)), mid = got(dumpDom(page, "", "1280,900", 6000)), nar = got(dumpDom(page, "", "520,1200", 6000));
    if (!wide) { c.push(["a headless browser is available", true, "skipped: no browser"]); return; }
    c.push(["1920 px: the issue's title, the state, qa and dependency pills larger than before (15+, 12+, 12+, 11.5+ px)", wide.t >= 15 && wide.state >= 12 && wide.qa >= 12 && wide.dep >= 11.5, js(wide)]);
    c.push(["…the Now column keeps its size, 12.5 px, at every width; the legend's pills are unchanged (10.5 px)", wide.now === 12.5 && mid.now === 12.5 && nar.now === 12.5 && wide.key === 10.5, js([wide.now, mid.now, nar.now, wide.key])]);
    c.push(["1280 px: still the table, its head shown, no sideways page scroll", mid.thead !== "none" && mid.row === "table-row" && mid.page <= 0, js(mid)]);
    c.push(["520 px: each run a card (grid), the head hidden, each cell labelled (State), no sideways scroll of the page or inside the table", nar.thead === "none" && nar.row === "grid" && /State/.test(nar.label) && nar.page <= 0 && nar.inner <= 1, js(nar)]);
  });

  /* 6. the feature probes */
  guard("the feature probes of dashboards-skill/31: the in-place mark, the larger Runs tab", c => {
    const pb = rd(PB), wb = rd(WB), miss = (h, k) => F.probe(h, k).map(m => m.id);
    c.push(["both plan-set templates carry the in-place mark; the work board the larger Runs tab", !miss(pb, "plan-board").includes("qa-in-place") && !miss(wb, "work-board").some(x => ["qa-in-place", "runs-larger"].includes(x)), js([miss(pb, "plan-board"), miss(wb, "work-board")])]);
    c.push(["a work board without the mark, or with the small table, misses them", miss(wb.replace("const inPlaceMark=", "const gone="), "work-board").includes("qa-in-place") && miss(wb.replace(".tbl{font-size:14.5px", ".tbl{font-size:12.5px"), "work-board").includes("runs-larger"), "probes"]);
    c.push(["runs-larger fits the work board only, its reason given for each other type", F.FEATURES.filter(f => f.id === "runs-larger").every(f => js(f.types) === js(["work-board"]) && f.notFor.system && f.notFor.supersystem && f.notFor["plan-board"]) && !F.applicable("plan-board").some(f => f.id === "runs-larger"), "notFor"]);
    c.push(["the example board (landed, made before) lacks the mark: reported for a landed board, never re-rendered", miss(rd(sk("plan/examples/38-handshake-empty-name/dashboard.html")), "plan-board").includes("qa-in-place"), "example"]);
  });
  return groups;
};
