// The cases of a foundation laid on the fast path (admin-team/board/foundation-fast-path; plan/RULES.md §4, "The foundation"), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-foundation.js [--out <dir>].
// The defect (WebTools #66): apply-event.js answered no-board at a sized with no board, and a presenter run laid the foundation and wrote Gap and
// Considered before anything showed: ten minutes of a run working with no board to open. A sized now lays the foundation itself, applies the
// event, re-embeds the parent tracking board and regenerates the live repository work board, and says enrich: yes for the fill behind it;
// what reads as being written is read from the data; a failure leaves nothing. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesFoundation(X) {
  const { sk, out, targets } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["a foundation on the fast path (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), NEW = sk("plan/scripts/new.js"), CB = sk("system/scripts/check-board.js");
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "foundation"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const TRK = J("verify/fixtures/tracking.plan.json");
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const git = (root, ...a) => cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8", windowsHide: true });
  const REG = { repo: "acme/widgets", updated: "2026-11-01", systems: [
    { slug: "widgets", name: "Widgets", kind: "repo", parent: null, status: "built", function: "The repository.", paths: ["."], board: "index.html", dsl: "workspace.dsl" },
    { slug: "cache", name: "the cache", kind: "system", parent: "widgets", status: "built", function: "Keep the answers a caller asked for.", paths: ["cache/"], board: null, dsl: null }] };
  let n = 0;
  /* a fresh tree: docs/plans, the registry, a git repository unless asked otherwise; optionally a tracking board around the folder */
  const tree = (o = {}) => { const root = path.join(sc, `t-${++n}`); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    if (o.registry !== false) wr(path.join(root, "docs", "dashboards", "systems.json"), js(REG));
    if (o.git !== false) { git(root, "init", "-q", "-b", "main"); wr(path.join(root, "README.md"), "x\n"); git(root, "add", "-A"); git(root, "-c", "user.email=x@x", "-c", "user.name=x", "commit", "-q", "-m", "base"); wr(path.join(root, ".git", "info", "exclude"), "docs/plans/.live/\n"); }
    return root; };
  const lay = (root, folder, facts, extra = {}, flags = []) => { const rq = wr(path.join(sc, `req-${n}-${Math.random().toString(36).slice(2, 7)}.json`), js({ v: 1, action: "plan-board", github: "acme/widgets", event: "sized", folder, ...extra, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", root, "--no-gh", "--at", "2026-11-03T02:17:16Z", "--json", ...flags], { env: { ...process.env, ...(extra.env || {}) } }), S = parse(a), f = path.join(root, ...folder.split("/"), "plan.json");
    return { a, S, f, p: fs.existsSync(f) ? JSON.parse(rd(f)) : null }; };
  /* what a tree holds, every file with its bytes (the rollback's proof) */
  const snap = root => { const m = {}; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === ".git") continue; const p = path.join(d, e.name); if (e.isDirectory()) { m[p + path.sep] = ""; walk(p); } else m[p] = rd(p); } }; walk(root); return m; };
  const same = (a, b) => js(Object.entries(a).sort()) === js(Object.entries(b).sort());
  const ghStub = wr(path.join(sc, "gh-stub.js"), "process.stdout.write(process.env.DASHBOARDS_GH_REPLY || '');process.exit(process.env.DASHBOARDS_GH_REPLY ? 0 : 1);\n");

  guard("apply-event.js at a sized with no board: the foundation laid, the event applied, the board open in seconds, with --no-gh", c => {
    const root = tree(), folder = "docs/plans/93-response-cache";
    const L = lay(root, folder, { step: "research", grade: 3, baseline: "abc1234", systems: ["cache"] });
    c.push(["exit 0, result ok, laid named", L.a.status === 0 && L.S.result === "ok" && L.S.laid === folder, js([L.a.status, L.S.result, L.S.laid, L.S.error, L.S.check])]);
    c.push(["enrich yes, for the fill behind it", L.S.enrich === "yes" && (L.S.why || []).some(w => /foundation is laid and the event applied/.test(w)), js(L.S.why)]);
    c.push(["every board file written: plan.json, dashboard.html, plan.js", ["plan.json", "dashboard.html", "plan.js"].every(f => fs.existsSync(path.join(root, ...folder.split("/"), f))), "files"]);
    const P = L.p || { wip: {} };
    c.push(["the run's start and the step's start are the event's time", P.sized === "2026-11-03T02:17:16Z" && P.wip.since === "2026-11-03T02:17:16Z" && P.foundation.at === "2026-11-03T02:17:16Z", js([P.sized, P.wip.since])]);
    c.push(["the sizing visit recorded once, ended by sized", js(P.wip.history && P.wip.history.sizing) === js([{ since: null, ended: "2026-11-03T02:17:16Z", endedBy: "sized", to: "research" }]), js(P.wip.history)]);
    c.push(["the title from the folder's name when nothing else tells it, the issue's title null, never a placeholder", P.title === "Response cache" && P.issueTitle === null, js([P.title, P.issueTitle])]);
    c.push(["the function says what is being written, from the registry", /^the cache: Keep the answers a caller asked for\. What this run does is being written from the documents\.$/.test(P.function) && P.foundation.function === P.function, js(P.function)]);
    c.push(["the baseline: the event's sha, the default branch from the tree, the event's date where git cannot tell the sha's", js(P.baseline) === js({ ref: "main", sha: "abc1234", date: "2026-11-03" }), js(P.baseline)]);
    c.push(["no row, no milestone: nothing invented", js(P.rows) === "[]" && js(P.milestones) === "[]" && P.impact === null, js([P.rows, P.milestones])]);
    const ck = run(CHECK, [path.join(root, ...folder.split("/"))]);
    c.push(["check.js passes the foundation, naming what is being written", ck.status === 0 && /being written: the function, the Gap column/.test(ck.stdout), (ck.stdout || "").split(/\r?\n/).filter(l => /FAIL|foundation/.test(l)).join(" | ").slice(0, 300)]);
    const cb = run(CB, [path.join(root, ...folder.split("/"), "dashboard.html"), "--auto", "--no-browser"], { env: { ...process.env, DASHBOARDS_NO_BROWSER: "1" } });
    c.push(["check-board.js --auto --no-browser passes it, the verified template plus its data", cb.status === 0, (cb.stdout || cb.stderr || "").split(/\r?\n/).filter(l => /FAIL/.test(l)).join(" | ").slice(0, 300)]);
    c.push(["the live repository work board regenerated, in the same run", fs.existsSync(path.join(root, "docs", "plans", ".live", "index.html")) && /regenerated/.test(L.S.live || ""), js(L.S.live)]);
    const live = JSON.parse(rd(path.join(root, "docs", "plans", ".live", "board.json")));
    c.push(["…showing the run", (live.rows || []).some(r => r.issue === 93), js((live.rows || []).map(r => r.issue))]);
    const was = rd(L.f), again = lay(root, folder, { step: "research", grade: 3, baseline: "abc1234", systems: ["cache"] });
    c.push(["raised again: a duplicate, nothing written", again.a.status === 0 && again.S.result === "duplicate" && rd(L.f) === was, js([again.S.result, again.S.error])]);
    const inTree = tree(), B = lay(inTree, "docs/plans/94-a-case", { step: "plan" });
    const head = (git(inTree, "rev-parse", "--short", "HEAD").stdout || "").trim();
    c.push(["with no baseline in the event, the tree's HEAD and its commit's date", B.a.status === 0 && B.p.baseline.sha === head && /^\d{4}-\d{2}-\d{2}$/.test(B.p.baseline.date), js([B.a.status, B.p && B.p.baseline, B.S.error])]);
    c.push(["step plan glows considered and verdict by the map, and the plan's pass starts", js(B.p.wip.current) === js(["considered", "verdict"]) && B.p.wip.plan.state === "writing", js([B.p.wip.current, B.p.wip.plan])]);
    c.push(["with no systems named, none laid, and the sentence still honest", js(B.p.systems) === "[]" && /^Issue #94, a case\. What this run does/.test(B.p.function), js(B.p.function)]);
    const fix = lay(tree(), "docs/plans/95-widget-thing", { step: "research", baseline: "abc1234", function: "The caller's own sentence on what this run does.", title: "a grade-3 change to the widget" });
    c.push(["a function the event gives is taken, with no stand-in recorded", fix.p.function === "The caller's own sentence on what this run does." && fix.p.foundation.function === undefined, js([fix.p.function, fix.p.foundation])]);
    c.push(["…and a grade in facts.title is reworded, never written", fix.a.status === 0 && fix.p.title === "a change to the widget", js([fix.a.status, fix.p.title, fix.S.error, fix.S.check])]);
  });

  guard("the foundation's facts from the tracker, the parent's unit row and the registry, each from the first that tells it", c => {
    const tracked = o => { const root = tree(); const t = copy(TRK); const tdir = path.join(root, ...t.folder.split("/")); wr(path.join(tdir, "plan.json"), JSON.stringify(t, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); run(EMBED, [tdir]); return { root, t, tdir, ...(o || {}) }; };
    const T = tracked(), u = T.t.rows.find(r => r.unit && r.unit.issue && !["landed", "complete"].includes((r.asBuilt || {}).state) && r.id === T.t.wip.next) || T.t.rows.find(r => r.unit && r.unit.issue && (r.asBuilt || {}).state === "pending");
    const folder = `${T.t.folder}/${u.unit.issue}-${u.unit.slug || u.id}`;
    const G = { title: "webtools: the verbatim title on the tracker", body: "Unit in the plan for the stack.\n\n## Scope\n\n- a list\n" };
    const L = lay(T.root, folder, { step: "plan", baseline: "abc1234" }, { env: { DASHBOARDS_GH: ghStub, DASHBOARDS_GH_REPLY: js(G) } }, []);
    c.push(["a sub-issue with --no-gh: exit 0, the parent named from the folder it sits in", L.a.status === 0 && L.p.parent.issue === T.t.issue && L.p.parent.board === "../dashboard.html", js([L.a.status, L.S.error, L.S.check, L.p && L.p.parent])]);
    c.push(["…its title the unit row's name", L.p.title === u.name, js([L.p.title, u.name])]);
    c.push(["…its systems the unit row's, no grade kept", L.p.level === undefined && L.p.systems.length === 1 && L.p.systems[0].slug === u.system, js([L.p.level, L.p.systems])]);
    c.push(["…the Considered column recorded as coming at sized, its parent being signed off", L.p.foundation.considered === true && js(lib.foundationFilling(L.p).columns) === js(["gap", "considered"]), js(L.p.foundation)]);
    const tb = JSON.parse(rd(path.join(T.tdir, "plan.json")));
    c.push(["the tracking board: the unit moved into wip.current and its board linked, in the same run", (tb.wip.current || []).includes(u.id + ".built") && tb.rows.find(r => r.id === u.id).unit.board === `${path.basename(folder)}/dashboard.html`, js([tb.wip.current, tb.rows.find(r => r.id === u.id).unit.board])]);
    c.push(["…the next unit up, and the unit's mirror of the run", tb.wip.next !== u.id && tb.rows.find(r => r.id === u.id).unit.live && tb.rows.find(r => r.id === u.id).unit.live.step === "plan", js([tb.wip.next, tb.rows.find(r => r.id === u.id).unit.live && tb.rows.find(r => r.id === u.id).unit.live.step])]);
    c.push(["the check names no missing column on a sub-issue still being written", !/whose tracking plan is signed off/.test(run(CHECK, [path.join(T.root, ...folder.split("/"))]).stdout), "no warning"]);
    /* the tracker, through the stub */
    const T2 = tracked(), rq = wr(path.join(sc, `gh2-${n}.json`), js({ v: 1, action: "plan-board", github: "acme/widgets", issue: u.unit.issue, event: "sized", folder, facts: { step: "plan", baseline: "abc1234" } }));
    const a = run(APPLY, ["--event", rq, "--worktree", T2.root, "--at", "2026-11-03T02:17:16Z", "--json", "--no-live"], { env: { ...process.env, DASHBOARDS_GH: ghStub, DASHBOARDS_GH_REPLY: js(G) } }), S = parse(a), P = JSON.parse(rd(path.join(T2.root, ...folder.split("/"), "plan.json")));
    c.push(["the issue's title from the tracker, verbatim", a.status === 0 && P.issueTitle === G.title, js([a.status, P.issueTitle, S.error])]);
    c.push(["the function opens with the body's first plain paragraph, then what is being written", P.function.startsWith("Unit in the plan for the stack. ") && /What this run does is being written from the documents\.$/.test(P.function), js(P.function)]);
    const down = run(APPLY, ["--event", wr(path.join(sc, `gh3-${n}.json`), js({ v: 1, action: "plan-board", github: "acme/widgets", event: "sized", folder: "docs/plans/96-down", facts: { step: "plan", baseline: "abc1234" } })), "--worktree", T2.root, "--at", "2026-11-03T02:17:16Z", "--json", "--no-live"], { env: { ...process.env, DASHBOARDS_GH: ghStub, DASHBOARDS_GH_REPLY: "" } });
    c.push(["the tracker down: laid all the same", down.status === 0 && parse(down).result === "ok", js([down.status, parse(down).error])]);
    c.push(["firstParagraph: skips headings, lists, tables and a lead into a list; cuts at a sentence; none where none ends", lib.firstParagraph("## Problem\n\nThe first.\n\nThe second.") === "The first." && lib.firstParagraph("# H\n\n- a\n\n| x |\n\nFrom here:\n\n- b") === null && lib.firstParagraph("A".repeat(50) + ". " + "b".repeat(500)) === "A".repeat(50) + "." && lib.firstParagraph("c".repeat(600)) === null, js(lib.firstParagraph("## Problem\n\nThe first.\n\nThe second."))]);
    /* another issue's board around the folder: a fix or a folded-in issue, never taken for a sub-issue */
    const H = tree(), host = copy(TRK); Object.assign(host, { kind: "issue", issue: 40, slug: "40-host", folder: "docs/plans/40-host", rows: [], status: "planned", parent: null, wip: { ...host.wip, step: "plan", current: ["considered", "verdict"], next: null } });
    const hd = path.join(H, "docs", "plans", "40-host"); wr(path.join(hd, "plan.json"), JSON.stringify(host, null, 2) + "\n"); wr(path.join(hd, "dashboard.html"), rd(PB)); run(EMBED, [hd]);
    const K = lay(H, "docs/plans/40-host/41-a-fix", { step: "plan", baseline: "abc1234" }, {}, ["--no-live"]);
    c.push(["inside another issue's board: no parent taken, and the presenter told", K.a.status === 0 && K.p.parent === null && (K.S.why || []).some(w => /sits inside #40's folder/.test(w)), js([K.a.status, K.p && K.p.parent, K.S.error, K.S.check])]);
    const K2 = lay(H, "docs/plans/40-host/42-a-fix", { step: "plan", baseline: "abc1234", fixOf: 40 }, {}, ["--no-live"]);
    c.push(["…facts.fixOf is taken", K2.a.status === 0 && K2.p.fixOf && K2.p.fixOf.issue === 40 && K2.p.parent === null, js([K2.a.status, K2.p && K2.p.fixOf, K2.S.error])]);
    const trk = lay(tree(), "docs/plans/97-an-initiative", { step: "architecture", baseline: "abc1234", grade: 4 });
    c.push(["a tracking issue: kind and steps from the level; no column to write at sized, only the function", trk.a.status === 0 && trk.p.kind === "tracking" && trk.p.wip.steps.includes("sub-issues") && js(lib.foundationFilling(trk.p)) === js({ function: true, columns: [] }), js([trk.a.status, trk.p && trk.p.kind, trk.p && lib.foundationFilling(trk.p), trk.S.error])]);
  });

  guard("a slug the registry does not know falls back: laid as named, in the neutral colour, with no board, warned and named for the presenter", c => {
    const L = lay(tree(), "docs/plans/98-a-case", { step: "plan", baseline: "abc1234", systems: ["no-such-system", "cache"] });
    c.push(["exit 0: the board is laid all the same", L.a.status === 0 && L.S.result === "ok", js([L.a.status, L.S.error, L.S.check])]);
    c.push(["the unknown slug is its own name, slot 0, no board; the known one the registry's", js(L.p.systems[0]) === js({ slug: "no-such-system", name: "no-such-system", slot: 0, top: "no-such-system", status: "built", board: null }) && L.p.systems[1].name === "the cache", js(L.p.systems)]);
    c.push(["the summary warns, and asks the presenter to map it", (L.S.warnings || []).some(w => /SYSTEM UNKNOWN: "no-such-system"/.test(w)) && (L.S.why || []).some(w => /maps it to the registry's slug/.test(w)), js([L.S.warnings, L.S.why])]);
    const k = run(CHECK, [path.dirname(L.f)]);
    c.push(["check.js warns on it, never fails", k.status === 0 && /"no-such-system" is not in docs\/dashboards\/systems\.json/.test(k.stdout), (k.stdout || "").split(/\r?\n/).filter(l => /no-such|FAIL/.test(l)).join(" | ").slice(0, 240)]);
    /* the defect (WebTools #66): the run sent webtools-http-response-cache; the registry and the parent's unit row say webtools-http-cache */
    const inTrk = reg => { const root = tree(), t = copy(TRK), tdir = path.join(root, ...t.folder.split("/")), u = t.rows.find(r => r.unit && r.unit.issue && r.system && (r.asBuilt || {}).state === "pending"); wr(path.join(tdir, "plan.json"), JSON.stringify(t, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); run(EMBED, [tdir]);
      if (reg) wr(path.join(root, "docs", "dashboards", "systems.json"), js({ ...REG, systems: [...REG.systems, { slug: u.system, name: "the unit's system", kind: "system", parent: "widgets", status: "built", function: "What the unit's system does.", paths: ["unit/"], board: null, dsl: null }] }));
      return { root, u, folder: `${t.folder}/${u.unit.issue}-${u.unit.slug || u.id}` }; };
    const Y = inTrk(true), yl = lay(Y.root, Y.folder, { step: "plan", baseline: "abc1234", systems: ["no-such-system"] }, {}, ["--no-live"]);
    c.push(["on a sub-issue the unknown slug yields to the unit row's system, the registry's entry", yl.a.status === 0 && yl.p.systems.length === 1 && yl.p.systems[0].slug === Y.u.system && yl.p.systems[0].name === "the unit's system" && yl.p.systems[0].slot !== 0, js([yl.a.status, yl.p && yl.p.systems, yl.S.error])]);
    c.push(["…warned on, naming both, and nothing left for the presenter to map", (yl.S.warnings || []).some(w => w.includes('SYSTEM UNKNOWN: "no-such-system"') && w.includes(JSON.stringify(Y.u.system))) && !(yl.S.why || []).some(w => /maps it to the registry's slug/.test(w)), js([yl.S.warnings, yl.S.why])]);
    const yk = run(CHECK, [path.dirname(yl.f)]);
    c.push(["…so check.js has no unknown slug to warn on", yk.status === 0 && !/no-such-system/.test(yk.stdout), (yk.stdout || "").split(/\r?\n/).filter(l => /no-such|FAIL/.test(l)).join(" | ").slice(0, 240)]);
    const Y2 = inTrk(true), kn = lay(Y2.root, Y2.folder, { step: "plan", baseline: "abc1234", systems: ["cache"] }, {}, ["--no-live"]);
    c.push(["a slug the registry knows stands, whatever the unit row says", kn.a.status === 0 && kn.p.systems.length === 1 && kn.p.systems[0].slug === "cache" && !(kn.S.warnings || []).some(w => /SYSTEM UNKNOWN/.test(w)), js([kn.p && kn.p.systems, kn.S.warnings])]);
    const Y3 = inTrk(false), fb = lay(Y3.root, Y3.folder, { step: "plan", baseline: "abc1234", systems: ["no-such-system"] }, {}, ["--no-live"]);
    c.push(["a unit row's system the registry does not know either: the fallback as it stands, laid as the event named it, for the presenter to map", fb.a.status === 0 && fb.p.systems[0].slug === "no-such-system" && fb.p.systems[0].slot === 0 && (fb.S.why || []).some(w => /maps it to the registry's slug/.test(w)), js([fb.a.status, fb.p && fb.p.systems, fb.S.why])]);
    const none = lay(tree({ registry: false }), "docs/plans/99-a-case", { step: "plan", baseline: "abc1234", systems: ["cache"] });
    c.push(["no registry at all: the same fallback", none.a.status === 0 && none.p.systems[0].slot === 0 && none.p.systems[0].name === "cache", js([none.a.status, none.p && none.p.systems, none.S.error])]);
  });

  guard("a failure falls back cleanly: exit 1, nothing half-written, no folder left, enrich yes with new.js --at named, new.js still the fallback", c => {
    const bad = (label, root, folder, facts, extra, re, flags) => { const before = snap(root), L = lay(root, folder, facts, extra, flags), after = snap(root);
      c.push([`${label}: exit 1, failed, every file as it was`, L.a.status === 1 && L.S.result === "failed" && L.S.laid === null && same(before, after) && !fs.existsSync(path.dirname(L.f)) && (!re || re.test(L.S.error || "")), js([L.a.status, L.S.result, L.S.laid, L.S.error, same(before, after)])]);
      c.push([`…enrich yes, the fallback named with the event's time`, L.S.enrich === "yes" && (L.S.why || []).some(w => /new\.js \.\.\. --at 2026-11-03T02:17:16Z/.test(w)) && !(L.S.why || []).some(w => /foundation is laid/.test(w)), js(L.S.why)]); return L; };
    bad("no step in the facts", tree(), "docs/plans/90-a-case", { baseline: "abc1234" }, {}, /names no step/);
    bad("no baseline anywhere (no sha given, no git)", tree({ git: false }), "docs/plans/90-a-case", { step: "plan" }, {}, /no baseline/);
    bad("no repository anywhere", tree({ registry: false, git: false }), "docs/plans/90-a-case", { step: "plan", baseline: "abc1234" }, { github: null }, /no repository/);
    bad("the request's issue is not the folder's", tree(), "docs/plans/90-a-case", { step: "plan", baseline: "abc1234" }, { issue: 91 }, /the folder is #90's/);
    /* the failure comes after the writes: the live repository work board cannot be regenerated */
    const R = tree(); fs.mkdirSync(path.join(R, "docs", "plans", ".live", "board.json"), { recursive: true });
    const before = snap(R), L = lay(R, "docs/plans/90-a-case", { step: "plan", baseline: "abc1234" }), after = snap(R);
    c.push(["a live board that cannot be written: exit 1, the laid board taken back, its folder gone", L.a.status === 1 && same(before, after) && !fs.existsSync(path.dirname(L.f)), js([L.a.status, L.S.error, L.S.restored, same(before, after)])]);
    /* a template not verified since it changed (a repository's own, with no record of it): never a laying from it */
    const U = tree(); wr(path.join(U, "docs", "plans", "_template", "dashboard.html"), rd(PB) + "<!-- changed -->\n");
    bad("a template changed since it was verified", U, "docs/plans/90-a-case", { step: "plan", baseline: "abc1234" }, {}, /the template is not verified/);
    /* the failure comes after the writes and the live board's regeneration: the check refuses it. The live markers go back too */
    const Q = tree(); const q0 = snap(Q), QL = lay(Q, "docs/plans/90-a-case", { step: "plan", baseline: "abc1234" }, { github: "not-a-slug" }), q1 = snap(Q);
    c.push(["a board the check refuses: exit 1, the laid board, its folder, the live board and its markers all taken back", QL.a.status === 1 && same(q0, q1), js([QL.a.status, QL.S.error, QL.S.check, Object.keys(q1).filter(k => !(k in q0)).map(k => path.relative(Q, k))])]);
    /* the fallback still works: new.js, then the event raised again */
    const N = tree(), nr = run(NEW, ["90", "a-case", "--root", N, "--at", "2026-11-03T02:17:16Z", "--repo", "acme/widgets", "--title", "A case", "--issue-title", "A case on the tracker", "--function", "A function.", "--baseline", "abc1234", "--date", "2026-11-03", "--step", "plan", "--grade", "3"]);
    const after2 = lay(N, "docs/plans/90-a-case", { step: "plan", baseline: "abc1234" });
    c.push(["new.js lays the foundation with no marker, and the event raised again applies to it", nr.status === 0 && after2.a.status === 0 && after2.p.foundation === undefined && after2.S.laid === null, js([nr.status, (nr.stderr || "").slice(0, 200), after2.a.status, after2.S.result, after2.S.error])]);
  });

  guard("the fill behind the event: read from the data, cleared at its embed; a board past its plan's acceptance with its Gap unwritten is refused", c => {
    const root = tree(), folder = "docs/plans/93-a-case", L = lay(root, folder, { step: "plan", baseline: "abc1234", systems: ["cache"], grade: 3 }), dir = path.dirname(L.f);
    const ev = (event, facts, at) => { const rq = wr(path.join(sc, `f-${n}-${event}.json`), js({ v: 1, action: "plan-board", github: "acme/widgets", issue: 93, event, folder, facts }));
      const a = run(APPLY, ["--event", rq, "--worktree", root, "--no-gh", "--no-live", "--at", at, "--json"]); return { a, S: parse(a), p: JSON.parse(rd(L.f)) }; };
    /* the plan's acceptance on a board still being filled */
    const was = rd(L.f), r0 = ev("plan-accepted", {}, "2026-11-03T03:00:00Z");
    c.push(["plan-accepted with the Gap unwritten: refused, exit 1, the board as it was", r0.a.status === 1 && /GAP UNWRITTEN/.test(r0.S.check || "") && rd(L.f) === was, js([r0.a.status, r0.S.check, r0.S.error])]);
    c.push(["…enrich yes, saying what to write", r0.S.enrich === "yes" && (r0.S.why || []).some(w => /foundation is not filled/.test(w)), js(r0.S.why)]);
    /* the fill: the rows with their gap, keeping the function a stand-in for now */
    const row = { id: "the-gap", group: "Code", name: "The part", system: "cache", gap: { kind: "missing", summary: "Verification case: what is missing.", evidence: ["cache/x.kt:1"] }, options: [], verdict: {}, asBuilt: { state: "pending" } };
    const P1 = JSON.parse(rd(L.f)); P1.rows = [row]; P1.milestones = [{ column: "gap", label: "Written from the issue", date: "2026-11-03" }]; wr(L.f, JSON.stringify(P1, null, 2) + "\n"); run(EMBED, [dir]);
    const p1 = JSON.parse(rd(L.f));
    c.push(["rows written: the marker stays while the function is the stand-in, no column left to write", p1.foundation && js(lib.foundationFilling(p1)) === js({ function: true, columns: [] }), js([p1.foundation, lib.foundationFilling(p1)])]);
    const r1 = ev("plan-accepted", {}, "2026-11-03T03:05:00Z");
    c.push(["plan-accepted with the function still the stand-in: refused", r1.a.status === 1 && /FOUNDATION NOT FILLED/.test(r1.S.check || ""), js([r1.a.status, r1.S.check])]);
    const P2 = JSON.parse(rd(L.f)); P2.function = "Verification case: what this run does, from the documents."; wr(L.f, JSON.stringify(P2, null, 2) + "\n"); run(EMBED, [dir]);
    const p2 = JSON.parse(rd(L.f));
    c.push(["the function written: embed.js clears the marker, with nothing else to do", p2.foundation === undefined && rd(path.join(dir, "plan.js")).includes("what this run does, from the documents"), js(p2.foundation)]);
    const r2 = ev("plan-accepted", {}, "2026-11-03T03:10:00Z");
    c.push(["plan-accepted on the filled board applies", r2.a.status === 0 && r2.p.wip.step === "branch", js([r2.a.status, r2.p.wip.step, r2.S.error, r2.S.check])]);
    /* a board that was never a foundation is held to the same Gap */
    const B = tree(), np = run(NEW, ["80", "bare", "--root", B, "--title", "Bare", "--issue-title", "Bare", "--function", "A function.", "--repo", "acme/widgets", "--baseline", "abc1234", "--date", "2026-11-03", "--step", "plan", "--grade", "3"]);
    const bf = path.join(B, "docs", "plans", "80-bare", "plan.json"), bp = JSON.parse(rd(bf)); bp.wip.step = "branch"; bp.wip.current = []; wr(bf, JSON.stringify(bp, null, 2) + "\n"); run(EMBED, [path.dirname(bf)]);
    const bk = run(CHECK, [path.dirname(bf)]);
    c.push(["check.js: any issue board at branch with no rows fails, GAP UNWRITTEN", np.status === 0 && bk.status === 1 && /GAP UNWRITTEN: the run is at branch/.test(bk.stdout), (bk.stdout || "").split(/\r?\n/).filter(l => /FAIL/.test(l)).join(" | ").slice(0, 240)]);
    bp.status = "abandoned"; bp.wip.step = "cancelled"; bp.notes = { cancelled: "Verification case." }; wr(bf, JSON.stringify(bp, null, 2) + "\n"); run(EMBED, [path.dirname(bf)]);
    c.push(["…a cancelled board is not: it stops where its run stopped", run(CHECK, [path.dirname(bf)]).status === 0, "cancelled"]);
    /* malformed marker */
    const M = tree(), m0 = lay(M, "docs/plans/70-a-case", { step: "plan", baseline: "abc1234" }), mp = JSON.parse(rd(m0.f)); mp.foundation = { at: "yesterday" }; wr(m0.f, JSON.stringify(mp, null, 2) + "\n"); run(EMBED, [path.dirname(m0.f)]);
    const mk = run(CHECK, [path.dirname(m0.f)]);
    c.push(["check.js: a marker that is not one fails", mk.status === 1 && /foundation is \{at/.test(mk.stdout), (mk.stdout || "").split(/\r?\n/).filter(l => /FAIL/.test(l)).join(" | ").slice(0, 240)]);
    /* the template's copy of the rule */
    const t = rd(PB);
    c.push(["the template: the filling columns glow through CURRENT, never through wip.current", /FILLING=\(LANDED\|\|STOPPED\)\?\[\]:fillingOf\(PLAN\)/.test(t) && /CURRENT=\(LANDED\|\|STOPPED\)\?\[\]:\[\.\.\.new Set\(\[\.\.\.\(WIP\.current\|\|\[\]\),\.\.\.FILLING\]\)\]/.test(t), "CURRENT"]);
    c.push(["…a filling column's head says it is being written, and the lede says what is", /FILLING\.includes\(c\.key\)\?"being written"/.test(t) && /being written from/.test(t), "head and lede"]);
    /* the template's fillingOf() and lib.js foundationFilling() agree */
    const m = /const fillingOf=(P=>\{[^\n]*\});/.exec(t), fo = m ? new Function(`return (${m[1]})`)() : null;
    const samples = [{ rows: [] }, { foundation: { at: "x" }, rows: [] }, { foundation: { at: "x", considered: true }, rows: [] }, { foundation: { at: "x", considered: true }, rows: [{ id: "a", options: [] }] }, { foundation: { at: "x", considered: true }, rows: [{ id: "a", options: [{ id: "o" }] }] }, { foundation: { at: "x" }, kind: "tracking", rows: [] }];
    c.push(["…the template's fillingOf() is lib.js foundationFilling()'s columns", !!fo && samples.every(s => js(fo(s)) === js(lib.foundationFilling(s).columns)), js(samples.map(s => [fo && fo(s), lib.foundationFilling(s).columns]))]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  /* as verify-templates.js does: the templates under test count as verified for the scripts the cases run */
  const { sha } = require(sk("system/scripts/deviation.js"));
  process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify(targets.map(t => sha(fs.readFileSync(t.path, "utf8"))));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
