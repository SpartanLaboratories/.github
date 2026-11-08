// The cases of a tracking board's unit dependencies before its units are filed (admin-team/dashboards/unit-blockers-before-filing, dated 49;
// plan/RULES.md §3, unit.blockedBy; §4, the sub-issues-filed row; §8), run by verify-templates.js (it passes its helpers in), or on its own with
// no browser: node verify/cases-unit-blockers.js [--out <dir>].
// The trigger: KotlinBottools #2, whose eight units were planned with their dependencies in the architecture and filed after the plan's merge;
// unit.blockedBy took issue numbers only, so its unit rows carried none and the board drew the units as independent, filed and unfiled alike.
// The rule: a blocker is an issue number, or { unit: k }, a unit of the same board by its number (unit.n) while that unit has no issue yet.
// 1. check.js accepts { unit: k } before the filing, and fails a malformed one, one naming no unit, two units or the unit itself, and one naming
//    a unit already filed (its issue number belongs there).
// 2. sub-issues-filed writes each { unit: k } as that unit's issue number the moment it is filed, per unit; once every unit is filed every
//    blocker is its issue number, the check passes at each event, and the same event again changes nothing.
// 3. fill.js keeps { unit: k } before the filing and writes a filed unit's issue number in its stead after it.
// 4. The template: blockerOf(), blockersOf(), bref(), unitDeps(), unitHolds() and openBlockers() run outside a browser, and the Landing Order
//    (renderChain()) drawing an arrow for each dependency before the filing; a unit not filed yet named "unit k · its slug", never "#null".
// 5. board.js: the up-next unit's "blocked by" names a blocker not filed yet by its slug ({ unit, slug }), board.html's blockerRef() draws it,
//    and the dependency pills leave it out until it is filed; the feature probe (unit-blockers) on both templates.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), vm = require("vm");

module.exports = function casesUnitBlockers(X) {
  const { sk, out, targets } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const sc = path.join(out, "unit-blockers"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), FILL = sk("plan/scripts/fill.js"), BOARD = sk("plan/scripts/board.js");
  const lib = require(sk("plan/scripts/lib.js")), FEAT = require(sk("system/scripts/features.js"));
  const PB = rd(tp("plan/template/dashboard.html")), WB = rd(tp("plan/template/board.html"));
  const TRK = J("verify/fixtures/tracking.plan.json"), F0 = TRK.folder;
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  let n = 0;
  const T = m => `2026-11-07T09:${String(m).padStart(2, "0")}:00Z`;
  const units = p => p.rows.filter(r => r.unit);
  /* the fixture's blockers, by issue number, and the same by unit number */
  const ISSUE_DEPS = Object.fromEntries(units(TRK).map(r => [r.id, (r.unit.blockedBy || []).slice()]));
  const nOfIssue = Object.fromEntries(units(TRK).map(r => [r.unit.issue, r.unit.n])), issueOf = Object.fromEntries(units(TRK).map(r => [r.id, r.unit.issue]));
  /* a tracking board at its plan's documents, its units written with their dependencies by unit number and none filed */
  const unfiled = (step, over) => { const p = copy(TRK);
    p.rows.forEach(r => { if (r.unit) { r.unit.blockedBy = (r.unit.blockedBy || []).map(i => ({ unit: nOfIssue[i] })); r.unit.board = null; r.unit.folder = null; r.unit.issue = null; delete r.unit.live; delete r.unit.tests; r.asBuilt = { state: "pending", summary: "Not filed yet." }; } });
    Object.assign(p, { status: "planned", asBuilt: null, sized: T(0), branch: null }); p.milestones = (p.milestones || []).filter(m => m.column !== "built"); if (p.impact) { p.impact.basis = "plan"; delete p.impact.changes; }
    Object.assign(p.wip, { step, since: T(1), updated: T(1), current: step === "document" ? ["built"] : [], next: units(p)[0].id, landing: null, stages: [], steps: lib.STEPS_BY_LEVEL[4].slice(), history: {}, qa: [], waitingOn: null, resume: null, plan: null, questions: [], research: null, event: { name: "architecture-signed-off", at: T(1) }, ...(over || {}) }); return p; };
  const tree = (p, root0) => { const root = root0 || path.join(sc, `t-${++n}`), dir = path.join(root, ...p.folder.split("/")); fs.mkdirSync(path.join(root, ".git", "info"), { recursive: true }); wr(path.join(root, ".git", "info", "exclude"), "docs/plans/.live/\n");
    wr(path.join(dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  const P = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  const ev = (B, event, facts, at) => { const q = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: TRK.repo, issue: TRK.issue, event, folder: F0, branch: "main", facts }));
    const a = run(APPLY, ["--event", q, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]); return { a, S: parse(a) }; };
  const blockerFails = B => { const r = run(CHECK, [B.dir, "--root", B.root]); return { status: r.status, F: (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l) && /blockedBy/.test(l)), all: (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)) }; };
  const withRow = (p, id, f) => { f(p.rows.find(r => r.id === id)); return p; };

  guard("check.js: a unit's blockers by unit number before its units are filed (plan/RULES.md §3, §8)", c => {
    const ok = blockerFails(tree(unfiled("document")));
    c.push(["a tracking board at its plan's documents, its units' dependencies by unit number and none filed: no blockedBy failure", !ok.F.length, js(ok.F.slice(0, 2))]);
    const sb = blockerFails(tree(unfiled("sub-issues", { current: units(TRK).map(r => r.id + ".units"), event: { name: "sub-issues-filed", at: T(1) } })));
    c.push(["…and at its filing step, nothing filed yet: none either", !sb.F.length, js(sb.F.slice(0, 2))]);
    const bad = (name, f, re) => { const B = tree(withRow(unfiled("document"), "http-core", f)), k = blockerFails(B); c.push([name, k.F.some(l => re.test(l)), js(k.F.slice(0, 3))]); };
    bad("a { unit: k } naming no unit row fails", r => { r.unit.blockedBy = [{ unit: 99 }]; }, /names unit 99, which no unit row of the board numbers/);
    bad("…a unit naming itself", r => { r.unit.blockedBy = [{ unit: r.unit.n }]; }, /names itself as its own blocker/);
    bad("…an entry with more than its unit", r => { r.unit.blockedBy = [{ unit: 1, issue: 61 }]; }, /is \{ "unit": n \} and nothing else/);
    bad("…an entry neither an issue number nor { unit: k }", r => { r.unit.blockedBy = ["unit 1"]; }, /must be an issue number, or \{ "unit": n \}/);
    bad("…a blockedBy that is no list", r => { r.unit.blockedBy = { unit: 1 }; }, /unit\.blockedBy must be a list/);
    { const p = unfiled("document"); units(p)[1].unit.n = 1; const k = blockerFails(tree(p)); c.push(["…a unit number two unit rows carry", k.F.some(l => /which 2 unit rows number/.test(l)), js(k.F.slice(0, 3))]); }
    { const p = unfiled("sub-issues", { current: [], event: { name: "sub-issues-filed", at: T(1) } }); units(p)[0].unit.issue = 61; const k = blockerFails(tree(p));
      c.push(["…a { unit: k } naming a unit already filed (its issue number belongs there)", k.F.some(l => /names unit 1, filed as #61: a filed unit is named by its issue number/.test(l)), js(k.F.slice(0, 3))]); }
    { const p = unfiled("document"); units(p)[3].unit.blockedBy = [{ unit: 3 }, 30]; const k = blockerFails(tree(p));
      c.push(["a mix of a unit number and an outside issue number passes", !k.F.length, js(k.F.slice(0, 2))]); }
  });

  guard("sub-issues-filed writes each unit number as its issue number as each blocker is filed (plan/RULES.md §4)", c => {
    const B = tree(unfiled("document"));
    const a = ev(B, "sub-issues-filed", { units: [{ unit: "build-logic", issue: 61 }] }, T(2)), p1 = P(B), row = id => p1.rows.find(r => r.id === id);
    c.push(["the first unit filed: applied, the check passing", a.a.status === 0 && a.S.result === "ok" && /^pass/.test(a.S.check || ""), js([a.a.status, a.S.result, a.S.error, a.S.check])]);
    c.push(["…every unit it blocks names it #61 now, the blockers not filed yet still by unit number", js(row("java-floor").unit.blockedBy) === "[61]" && js(row("http-core").unit.blockedBy) === js([61, { unit: 2 }]) && js(row("test-support").unit.blockedBy) === js([{ unit: 3 }]),
      js([row("java-floor").unit.blockedBy, row("http-core").unit.blockedBy, row("test-support").unit.blockedBy])]);
    c.push(["…the event's report names each blocker it wrote", (a.S.applied || []).some(l => /java-floor: unit\.blockedBy unit 1 → #61/.test(l)) && (a.S.applied || []).some(l => /http-core: unit\.blockedBy unit 1 → #61/.test(l)), js(a.S.applied)]);
    const rest = units(TRK).slice(1).map(r => ({ unit: r.id, issue: issueOf[r.id] }));
    const b = ev(B, "sub-issues-filed", { units: rest.slice(0, 4) }, T(3)), c2 = ev(B, "sub-issues-filed", { units: rest.slice(4), final: true }, T(4)), p2 = P(B);
    c.push(["the rest filed, then the final event: applied, the check passing at each", b.a.status === 0 && c2.a.status === 0 && /^pass/.test(b.S.check || "") && /^pass/.test(c2.S.check || ""), js([b.S.error, b.S.check, c2.S.error, c2.S.check])]);
    c.push(["…every unit's blockers are now its issue numbers, exactly the dependencies the plan gave", units(p2).every(r => js(r.unit.blockedBy) === js(ISSUE_DEPS[r.id].filter((x, i, l) => l.indexOf(x) === i))), js(units(p2).filter(r => js(r.unit.blockedBy) !== js(ISSUE_DEPS[r.id])).map(r => [r.id, r.unit.blockedBy, ISSUE_DEPS[r.id]]))]);
    c.push(["…no unit number left: the final event asks for nothing about them", !units(p2).some(r => r.unit.blockedBy.some(lib.isUnitRef)) && !(c2.S.why || []).some(x => /unit number/.test(x)), js(c2.S.why)]);
    const again = ev(B, "sub-issues-filed", { units: rest.slice(4), final: true }, T(5));
    c.push(["the same final event again changes nothing", again.a.status === 0 && again.S.result === "duplicate", js([again.S.result, again.S.applied])]);
    /* a stray unit number the filing cannot map */
    const p3 = unfiled("document"); units(p3)[2].unit.blockedBy = [{ unit: 1 }, { unit: 2 }]; const S3 = tree(p3); fs.writeFileSync(path.join(S3.dir, "plan.json"), JSON.stringify(p3, null, 2) + "\n");
    const all = units(TRK).map(r => ({ unit: r.id, issue: issueOf[r.id] }));
    const s3 = ev(S3, "sub-issues-filed", { units: all, final: true }, T(2)), q3 = P(S3);
    c.push(["every unit filed in one final event: every blocker written as its issue number in the same event", s3.a.status === 0 && js(units(q3)[2].unit.blockedBy) === "[61,47]", js([s3.S.error, units(q3)[2].unit.blockedBy])]);
    c.push(["lib.js mapUnitBlockers() leaves a unit number no unit row carries as it is (check.js fails it; the final event names it for the presenter)", (() => { const q = copy(q3); units(q)[4].unit.blockedBy = [{ unit: 42 }]; return !lib.mapUnitBlockers(q).length && js(units(q)[4].unit.blockedBy) === js([{ unit: 42 }]); })(), ""]);
  });

  guard("fill.js: a fill's blockers by unit number, before and after the filing", c => {
    const fill = (B, fields) => { const f = wr(path.join(sc, `fields-${++n}.json`), js(fields)); const a = run(FILL, [B.dir, "--fields", f, "--root", B.root, "--json"]); return { a, S: parse(a) }; };
    const p = unfiled("document"); units(p).forEach(r => { r.unit.blockedBy = []; }); const B = tree(p);
    const deps = units(TRK).map(r => ({ id: r.id, unit: { blockedBy: ISSUE_DEPS[r.id].map(i => ({ unit: nOfIssue[i] })) } }));
    const f1 = fill(B, { rows: deps }), q1 = P(B);
    c.push(["before the filing: the fill's unit numbers written as they are, the check passing", f1.a.status === 0 && js(units(q1).find(r => r.id === "http-core").unit.blockedBy) === js([{ unit: 1 }, { unit: 2 }]) && !blockerFails(B).F.length, js([f1.a.status, f1.S.check, (f1.a.stdout || "").slice(0, 200)])]);
    const p2 = unfiled("sub-issues", { current: [], event: { name: "sub-issues-filed", at: T(1) } }); units(p2).forEach(r => { r.unit.issue = issueOf[r.id]; r.unit.blockedBy = []; }); const B2 = tree(p2);
    const f2 = fill(B2, { rows: deps }), q2 = P(B2);
    c.push(["after the filing: each written as its unit's issue number, and named in the fill's notes", f2.a.status === 0 && units(q2).every(r => js(r.unit.blockedBy) === js(ISSUE_DEPS[r.id])) && (f2.S.notes || []).some(x => /http-core: unit\.blockedBy unit 2 → #47/.test(x)), js([f2.a.status, (f2.S.notes || []).slice(0, 3), units(q2).map(r => r.unit.blockedBy)])]);
  });

  guard("the template: a unit's dependencies drawn between units before they are filed (blockerOf(), the Landing Order)", c => {
    const block = (h, from, to) => { const i = h.indexOf(from), j = h.indexOf(to, i); if (i < 0 || j < 0) throw new Error("not in the template: " + from); return h.slice(i, j); };
    const line = re => { const m = re.exec(PB); if (!m) throw new Error("not in the template: " + re); return m[0]; };
    const deps = block(PB, "/* a unit's dependencies and what it holds up", "/* the legend entries of the dependency pills");
    const ctxOf = rows => { const ctx = { ROWS: rows, LANDED: false, STOPPED: false, PAUSED: false }; vm.createContext(ctx);
      vm.runInContext(`var esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); var ilink=n=>"<a>#"+n+"</a>"; var unitLanded=r=>["landed","as-planned"].includes((r.asBuilt||{}).state);`, ctx);
      vm.runInContext(deps.replace(/^const /gm, "var "), ctx); vm.runInContext(line(/^function openBlockers\(r\)\{.*\}$/m), ctx); return ctx; };
    const p = unfiled("document"), x = ctxOf(p.rows), row = id => p.rows.find(r => r.id === id);
    const r3 = row("http-core");
    c.push(["blockersOf(): a unit number resolves to its unit row, no issue yet", js(x.blockersOf(r3).map(b => [b.issue, b.row && b.row.id, b.n])) === js([[null, "build-logic", 1], [null, "java-floor", 2]]), js(x.blockersOf(r3).map(b => [b.issue, b.row && b.row.id, b.n]))]);
    c.push(["bref(): a unit not filed yet named \"unit k · its slug\", plain text", x.bref(x.blockersOf(r3)[0]) === "unit 1 · build-logic", x.bref(x.blockersOf(r3)[0])]);
    c.push(["unitDeps(): each with its build state (blocking until it lands) and locality, never #null", js(x.unitDeps(r3).map(d => [d.build, d.locality])) === js([["blocking", "local-repository"], ["blocking", "local-repository"]]) && !x.unitDeps(r3).map(x.bref).join(" ").includes("#null"), js(x.unitDeps(r3).map(d => [d.build, d.locality]))]);
    c.push(["unitHolds(): an unfiled unit holds up the units naming it", js(x.unitHolds(row("build-logic")).map(h => h.row.id)) === js(["java-floor", "http-core"]), js(x.unitHolds(row("build-logic")).map(h => h.row.id))]);
    c.push(["openBlockers(): blockers not landed, by unit number too", x.openBlockers(r3).length === 2, js(x.openBlockers(r3).length)]);
    const q = copy(p); units(q).forEach(r => { r.unit.issue = issueOf[r.id]; r.unit.blockedBy = ISSUE_DEPS[r.id].slice(); }); units(q)[0].asBuilt = { state: "landed", summary: "Landed." };
    const y = ctxOf(q.rows), q3 = q.rows.find(r => r.id === "http-core");
    c.push(["once filed: each blocker linked like any #n, a landed one clear", y.unitDeps(q3).map(y.bref).join(" ") === "<a>#61</a> <a>#47</a>" && js(y.unitDeps(q3).map(d => d.build)) === js(["clear", "blocking"]), js([y.unitDeps(q3).map(y.bref), y.unitDeps(q3).map(d => d.build)])]);
    /* the Landing Order: renderChain() with a stand-in for the DOM */
    const chain = block(PB, "function renderChain(){", "\n/* ---------- Source ---------- */");
    const draw = rows => { const ctx = { ROWS: rows, LANDED: false, STOPPED: false, PAUSED: false, NEXT_ROW: null, INSPECTED: null, TAG_NEXT: "UP NEXT", out: {} }; vm.createContext(ctx);
      vm.runInContext(`var esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;"); var ilink=n=>"#"+n; var unitLanded=r=>false; var stateOf=r=>(r.asBuilt||{}).state||"pending";
        var STATES={pending:{cls:"pending",label:"planned",g:"○",desc:"planned"}}; var rowActive=()=>false, runOf=()=>null, runShort=()=>"", runPaused=()=>false, isNext=()=>false, nameText=r=>esc(r.name), paint=()=>{}, sysKey=()=>"", badge=()=>"", inspectBuilt=()=>{};
        var document={querySelectorAll:()=>[]}; var $=s=>{ if(!out[s]) out[s]={clientWidth:0,set innerHTML(v){ this.html=v; }}; return out[s]; };`, ctx);
      vm.runInContext(deps.replace(/^const /gm, "var "), ctx); vm.runInContext(chain, ctx); ctx.renderChain(); return ctx.out["#chain-frame"].html || ""; };
    const svg = draw(p.rows), edges = (svg.match(/<path class="edge/g) || []).length, want = units(TRK).reduce((s, r) => s + new Set(ISSUE_DEPS[r.id]).size, 0);
    c.push(["the Landing Order before the filing: one arrow per dependency, the units in columns by depth", edges === want && edges > 0, js([edges, want])]);
    c.push(["…its boxes say a unit is not filed yet, never \"#null\"", !svg.includes("#null") && /not filed yet · /.test(svg), (svg.match(/<text class="s"[^>]*>[^<]*/) || [""])[0]]);
    const old = draw(units(p).map(r => ({ ...r, unit: { ...r.unit, blockedBy: [] } })));
    c.push(["…and none where the rows carry none (the board as KotlinBottools #2's read)", !(old.match(/<path class="edge/g) || []).length, ""]);
  });

  guard("the repository work board and the feature probe: a blocker not filed yet named by its slug", c => {
    const root = path.join(sc, `wb-${++n}`);
    const p = unfiled("document"); units(p)[0].unit.blockedBy = [{ unit: 3 }];
    tree(p, root); const a = run(BOARD, ["--root", root, "--no-gh"]), bj = JSON.parse(rd(path.join(root, "docs", "plans", "board.json")));
    const t = bj.rows.find(r => r.issue === 55) || {};
    c.push(["before the filing: the chain's up-next unit carries its blocker as { unit, slug }", a.status === 0 && t.chain && js(t.chain.next && t.chain.next.blockedBy) === js([{ unit: 3, slug: "http-core" }]), js([a.status, (a.stdout || a.stderr || "").slice(-200), t.chain && t.chain.next])]);
    const root2 = path.join(sc, `wb-${++n}`), p2 = unfiled("sub-issues", { current: [], event: { name: "sub-issues-filed", at: T(1) } });
    units(p2).forEach((r, i) => { if (i !== 2) { r.unit.issue = issueOf[r.id]; r.unit.blockedBy = ISSUE_DEPS[r.id].filter(m => m !== 62); } }); units(p2)[0].unit.blockedBy = [{ unit: 3 }];
    tree(p2, root2); const b = run(BOARD, ["--root", root2, "--no-gh"]), bj2 = JSON.parse(rd(path.join(root2, "docs", "plans", "board.json"))), r61 = bj2.rows.find(r => r.issue === 61) || {};
    c.push(["mid-filing: the filed up-next unit's row says blocked by the unit not filed yet, by its slug; no dependency pill for it", b.status === 0 && r61.status === "next" && js(r61.blockedBy) === js([{ unit: 3, slug: "http-core" }]) && !(r61.waitsOn || []).length, js([b.status, r61.status, r61.blockedBy, r61.waitsOn])]);
    const ctx = {}; vm.createContext(ctx); vm.runInContext(`var esc=s=>String(s==null?"":s); var ilink=(n,r)=>"<a>#"+n+"</a>";`, ctx);
    vm.runInContext((/^const blockerRef=.*$/m.exec(WB) || [""])[0].replace(/^const /, "var "), ctx);
    c.push(["board.html's blockerRef(): an issue linked, a unit not filed yet named by its slug", typeof ctx.blockerRef === "function" && ctx.blockerRef({ issue: 62 }) === "<a>#62</a>" && ctx.blockerRef({ unit: 3, slug: "http-core" }) === "http-core", typeof ctx.blockerRef === "function" ? js([ctx.blockerRef({ issue: 62 }), ctx.blockerRef({ unit: 3, slug: "http-core" })]) : "no blockerRef in board.html"]);
    const f = FEAT.FEATURES.find(x => x.id === "unit-blockers");
    c.push(["the feature probe (unit-blockers): found on the issue-board and work-board templates", !!f && f.test(PB.replace(/\r\n/g, "\n"), "plan-board") === true && f.test(WB.replace(/\r\n/g, "\n"), "work-board") === true, f ? js([f.test(PB, "plan-board"), f.test(WB, "work-board")]) : "no unit-blockers feature"]);
    const oldPB = PB.replace("units.forEach(r=>deps(r).forEach(", "units.forEach(r=>(r.unit.blockedBy||[]).map(n=>byIssue.get(n)).filter(Boolean).forEach("), oldWB = WB.replace(/blockerRef/g, "issueOnly");
    c.push(["…and missed on a template without it, each with its reason", !!f && typeof f.test(oldPB, "plan-board") === "string" && typeof f.test(oldWB, "work-board") === "string", f ? js([f.test(oldPB, "plan-board"), f.test(oldWB, "work-board")]) : ""]);
    c.push(["…for the issue and tracking boards and the repository work board; the state boards' reasons stated", !!f && js(f.types) === js(["plan-board", "work-board"]) && !!(f.notFor || {}).system && !!(f.notFor || {}).supersystem, f ? js([f.types, Object.keys(f.notFor || {})]) : ""]);
  });

  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 && a[oi + 1] ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length; console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
