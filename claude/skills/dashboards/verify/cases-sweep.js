// The cases of the sweep of a rule that can fail boards and its warning stage (GUIDANCE.md §11, "A rule that can fail boards: the sweep and its
// warning stage"; the user's decision q-411), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-sweep.js [--out <dir>].
// 1. The record and the stage (system/scripts/sweeplib.js): under the verification no record but a case's own; a text's mark, never the text; a
//    text kept only while its repository's stage stands; a rule with no finder refused, naming the rule; the machine's record outside every
//    mirrored path.
// 2. The sweep (system/scripts/sweep.js run): refused without --binds-closed, for a repository not on the org work board, for a rule with no
//    finder; every committed board and view copy checked, a quotation fixable and any other text listed, the boards untouched without --fix;
//    a closed board skipped where the rule does not bind closed boards, checked where it does; a state board's own text listed; --fix writing
//    the writers' fix into the data, its embedded copy and its sidecar, and leaving the rest; a repository where nothing is found has no stage.
// 3. The warning stage: check.js and check-board.js warning, naming the sweep, on a text already on a board, and failing a text the sweep does
//    not list; embed.js, apply-event.js and fill.js writing a board that holds a kept text with a warning, and refusing a text newly written;
//    a seeding (p78's encounter) failing on a view copy's text with no sweep, and carrying it with a warning in the sweep's warning stage;
//    a lower-case name with hyphens already on a board (q-412, 2a): with no sweep an event that writes the board fails, in the warning stage it
//    applies with a warning naming the sweep, its quotation cut, and a fact that newly names one still fails; a run's checkout (--run) whose
//    board carries the text otherwise than the committed board, read and recorded so the run's event warns, and never written, --fix included.
// 4. The stage's end (sweep.js landed): the checks fail and the writers refuse the same text again; landed twice changes nothing; status.
// No case reads GitHub or this machine's caches: the private repositories are verify/fixtures/private-repositories.json, the org work board's
// repositories a list of the case's own, the record a file of the case's own (DASHBOARDS_SWEEPS).
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesSweep(X) {
  const { sk, out } = X, targets = X.targets || [];
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const sc = path.join(out, "sweep"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const FIXTURE = sk("verify/fixtures/private-repositories.json");
  const CONFIG = wr(path.join(sc, "repositories.json"), js({ owner: "acme", repositories: ["widgets", "gadgets", "Support"], organizations: [] }));
  let n = 0;
  const recordOf = () => path.join(sc, `record-${n}.json`);
  const envWith = rec => { const e = { ...process.env, DASHBOARDS_VERIFY: "1", DASHBOARDS_PRIVATES: FIXTURE, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
    delete e.DASHBOARDS_PRIVATES_CACHE; delete e.DASHBOARDS_GH; if (rec) e.DASHBOARDS_SWEEPS = rec; else delete e.DASHBOARDS_SWEEPS; return e; };
  const run = (f, a, env) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env });
  const parse = a => { try { return JSON.parse((a.stdout || "").trim().split(/\r?\n/).pop()); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const SWEEP = sk("system/scripts/sweep.js"), APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), FILL = sk("plan/scripts/fill.js"), CB = sk("system/scripts/check-board.js");
  const PB = tp("plan/template/dashboard.html");
  const fails = r => (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)), warns = r => (r.stdout || "").split(/\r?\n/).filter(l => /^warn/i.test(l));

  /* an issue board in implementation, from the worked example (as cases-private-names.js lays one) */
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), T0 = "2026-11-03T03:28:38Z";
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const STG = (a, b) => [{ id: "S1", name: "Stage one", state: a }, { id: "S2", name: "Stage two", state: b }];
  const flight = () => { const x = copy(EX), ids = x.rows.map(r => r.id); Object.assign(x, { status: "building", asBuilt: null, repo: "acme/widgets" }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: T0, updated: T0, current: ["built"], questions: [], research: null, open: [], qa: [], plan: null, remediation: null, history: {}, waits: [],
      stages: STG("current", "todo").map(s => ({ ...s, rows: [ids[0]] })), steps: STEPS.slice(), event: { name: "branch-cut", at: T0 } }; return x; };
  const OLD = "The helpers live in acme/VaultKeeper.";
  const named = () => { const p = flight(); p.rows[0].gap.summary = OLD; p.issueTitle = "Port acme/Support#3 helpers"; return p; };
  /* a tree of its own, its boards written raw (as an older writer left them, before the rule): `boards` [[plan, folder?]] */
  const tree = (boards, more) => { const root = path.join(sc, `t-${++n}`); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    const lib = require(sk("plan/scripts/lib.js"));
    boards.forEach(p => { const dir = path.join(root, ...p.folder.split("/")), json = JSON.stringify(p, null, 2) + "\n";
      wr(path.join(dir, "plan.json"), json); wr(path.join(dir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", json)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", json)); });
    (more || []).forEach(([f, t]) => wr(path.join(root, ...f.split("/")), t));
    return root; };
  const files = (root, folder) => ["plan.json", "dashboard.html", "plan.js"].map(f => { try { return rd(path.join(root, ...folder.split("/"), f)); } catch (e) { return null; } }).join("\u0000");
  const P = (root, folder) => JSON.parse(rd(path.join(root, ...folder.split("/"), "plan.json")));
  const sweep = (a, rec) => { const r = run(SWEEP, [...a, "--config", CONFIG, "--json"], envWith(rec)); return { r, s: parse(r) }; };
  const swept = (root, rec, more) => sweep(["run", "private-repositories", "--repo", "acme/widgets", "--tree", root, "--placed", "2026-11-17", "--binds-closed", "yes", "--at", "2026-11-20T01:00:00Z", ...(more || [])], rec);

  guard("the record and the stage: a case's own record, a text's mark, kept only while the stage stands (sweeplib.js)", c => {
    const SW = require(sk("system/scripts/sweeplib.js"));
    const keep = { V: process.env.DASHBOARDS_VERIFY, S: process.env.DASHBOARDS_SWEEPS };
    try {
      process.env.DASHBOARDS_VERIFY = "1"; delete process.env.DASHBOARDS_SWEEPS; SW.forget();
      c.push(["under the verification, with no record named, no sweep stands and nothing is written", SW.recordFile() === null && SW.readRecord().sweeps.length === 0 && (() => { try { SW.writeRecord({ schema: SW.SCHEMA, sweeps: [] }); return false; } catch (e) { return /DASHBOARDS_SWEEPS/.test(e.message); } })(), String(SW.recordFile())]);
      const h = SW.textHash(OLD);
      c.push(["a text's mark is a hash, never the text", /^[0-9a-f]{24}$/.test(h) && !h.includes("VaultKeeper") && h === SW.textHash(OLD) && h !== SW.textHash(OLD + " "), h]);
      const rec = path.join(sc, `record-unit-${++n}.json`); process.env.DASHBOARDS_SWEEPS = rec; SW.forget();
      SW.writeRecord({ schema: SW.SCHEMA, sweeps: [{ rule: "private-repositories", swept: "2026-11-20T01:00:00Z", repositories: [{ repo: "acme/widgets", landed: null, texts: [h] }, { repo: "acme/gadgets", landed: "2026-11-21T00:00:00Z", texts: [SW.textHash("Other.")] }] }] });
      SW.forget();
      const sp = SW.split("private-repositories", [{ at: "a", h }, { at: "b", h: SW.textHash("New text.") }, { at: "c", h: SW.textHash("Other.") }]);
      c.push(["a text the sweep lists is kept while its repository's stage stands; one it does not list, or listed where the fixes landed, is fresh", sp.kept.length === 1 && sp.kept[0].at === "a" && sp.kept[0].sweep.repo === "acme/widgets" && js(sp.fresh.map(x => x.at)) === js(["b", "c"]), js(sp)]);
      c.push(["…and only under its own rule", SW.split("another-rule", [{ at: "a", h }]).kept.length === 0, ""]);
      c.push(["the record holds no name a rule bars", !/VaultKeeper|Support/.test(rd(rec)), rd(rec).slice(0, 200)]);
      c.push(["a rule with no finder is refused, naming the rule and where finders are given", (() => { try { SW.rule("no-such-rule"); return false; } catch (e) { return /no rule "no-such-rule" has a finder/.test(e.message) && /GUIDANCE\.md §11/.test(e.message); } })(), ""]);
      const relp = path.relative(path.join(os.homedir(), ".claude"), SW.DEFAULT_RECORD).split(path.sep), MIRRORED = ["CLAUDE.md", "rule-index.md", "settings.json", "hooks", "agents", "shared", "skills", "admin-team", "nomenclature", "tools"];
      c.push(["this machine's record is under ~/.claude/cache/, outside every mirrored path", relp[0] === "cache" && !MIRRORED.includes(relp[0]) && relp.join("/") === "cache/dashboards/sweeps.json", relp.join("/")]);
      c.push(["stripBlocks() empties the data blocks and keeps the page's own text", SW.stripBlocks('<p>a</p><script type="application/json" id="plan">\n{"x":"acme/VaultKeeper"}\n</script><p>b</p>') === '<p>a</p><script type="application/json" id="plan"></script><p>b</p>', ""]);
    } finally { if (keep.V === undefined) delete process.env.DASHBOARDS_VERIFY; else process.env.DASHBOARDS_VERIFY = keep.V; if (keep.S === undefined) delete process.env.DASHBOARDS_SWEEPS; else process.env.DASHBOARDS_SWEEPS = keep.S; SW.forget(); }
  });

  guard("the sweep: every committed board and view copy checked, a quotation fixable, any other text listed, closed boards by the rule (sweep.js run)", c => {
    const rec = path.join(sc, `record-${++n}.json`);
    const p = named(), root = tree([p]);
    const u1 = sweep(["run", "private-repositories", "--repo", "acme/widgets", "--tree", root, "--placed", "2026-11-17"], rec);
    c.push(["refused without --binds-closed, saying each rule says whether it binds closed boards", u1.r.status === 2 && /--binds-closed yes\|no is needed/.test(u1.s.error || ""), js(u1.s)]);
    const u2 = sweep(["run", "private-repositories", "--repo", "acme/elsewhere", "--tree", root, "--placed", "2026-11-17", "--binds-closed", "yes"], rec);
    c.push(["refused for a repository not on the org work board", u2.r.status === 2 && /not on the org work board/.test(u2.s.error || ""), js(u2.s)]);
    const u3 = sweep(["run", "no-such-rule", "--repo", "acme/widgets", "--tree", root, "--placed", "2026-11-17", "--binds-closed", "yes"], rec);
    c.push(["refused for a rule with no finder", u3.r.status === 2 && /no rule "no-such-rule"/.test(u3.s.error || ""), js(u3.s)]);
    const rp = sweep(["repos"], rec);
    c.push(["repos: the org work board's repositories, less every private one", rp.r.status === 0 && js(rp.s.repos) === js(["acme/widgets", "acme/gadgets"]), js(rp.s)]);
    const before = files(root, p.folder), a = swept(root, rec);
    c.push(["a sweep without --fix checks the board and writes nothing to it", a.r.status === 0 && a.s.result === "swept" && a.s.boards === 1 && files(root, p.folder) === before, js([a.r.status, a.s.error, a.s.boards])]);
    c.push(["…it names the quotation as one the writers fix, and lists the other text alone for the user's decision, each by where it stands", (a.s.fixable || []).length === 1 && a.s.fixable[0].at === "issueTitle" && (a.s.listed || []).length === 1 && a.s.listed[0].at === "rows[0].gap.summary" && /reworded where the board stores it/.test(a.s.listed[0].why) && !(a.s.fixed || []).length, js([a.s.fixable, a.s.listed])]);
    const R = JSON.parse(rd(rec)), e = R.sweeps[0].repositories[0];
    c.push(["…and records the rule, when it was placed, whether it binds closed boards, and for the repository the mark of each text, its stage standing", R.schema === "dashboards-sweeps/1" && R.sweeps[0].rule === "private-repositories" && R.sweeps[0].placed === "2026-11-17" && R.sweeps[0].bindsClosed === true && e.repo === "acme/widgets" && e.landed === null && e.texts.length === 2 && a.s.stage === "warning", js(R)]);
    /* a closed board, by whether the rule binds closed boards */
    const q = named(); q.folder = "docs/plans/41-closed"; q.issue = 41; q.status = "built"; q.wip = { ...q.wip, step: "landed" };
    const root2 = tree([q]), b1 = sweep(["run", "private-repositories", "--repo", "acme/widgets", "--tree", root2, "--placed", "2026-11-17", "--binds-closed", "no"], path.join(sc, `record-${++n}.json`));
    c.push(["a closed board is skipped where the rule does not bind closed boards: nothing found, no stage", b1.r.status === 0 && b1.s.skippedClosed === 1 && b1.s.boards === 0 && b1.s.stage === "none", js(b1.s)]);
    const b2 = sweep(["run", "private-repositories", "--repo", "acme/widgets", "--tree", root2, "--placed", "2026-11-17", "--binds-closed", "yes"], path.join(sc, `record-${++n}.json`));
    c.push(["…and checked where it does", b2.r.status === 0 && b2.s.skippedClosed === 0 && b2.s.boards === 1 && b2.s.finds === 2, js(b2.s)]);
    /* a view copy in the main checkout, and a state board's own text */
    const main = path.join(sc, `main-${++n}`), lib = require(sk("plan/scripts/lib.js")), v = named(), vdir = path.join(main, "docs", "plans", ".live", "view", ...v.folder.split("/")), vj = JSON.stringify(v, null, 2) + "\n";
    wr(path.join(vdir, "plan.json"), vj); wr(path.join(vdir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", vj));
    const root3 = tree([flight()], [["docs/dashboards/system-alpha/index.html", rd(tp("system/template/system.html")).replace("<footer>", "<p>Its client code is shared with acme/VaultKeeper.</p>\n<footer>")]]);
    const d = sweep(["run", "private-repositories", "--repo", "acme/widgets", "--tree", root3, "--main", main, "--placed", "2026-11-17", "--binds-closed", "yes"], path.join(sc, `record-${++n}.json`));
    c.push(["with --main, a view copy is checked too", d.r.status === 0 && (d.s.listed || []).some(x => /^docs\/plans\/\.live\/view\//.test(x.board) && x.at === "rows[0].gap.summary"), js(d.s.listed)]);
    c.push(["a state board's own text is listed by its line, to be reworded by hand", (d.s.listed || []).some(x => x.board === "docs/dashboards/system-alpha/index.html" && /^its page, line \d+$/.test(x.at) && /by hand/.test(x.why)), js(d.s.listed)]);
    /* --fix */
    const p4 = named(), root4 = tree([p4]), f = swept(root4, path.join(sc, `record-${++n}.json`), ["--fix"]), q4 = P(root4, p4.folder);
    const html4 = rd(path.join(root4, ...p4.folder.split("/"), "dashboard.html")), side4 = rd(path.join(root4, ...p4.folder.split("/"), "plan.js"));
    c.push(["--fix writes the writers' fix: the quotation's name cut to \"…\" in the data, its embedded copy and its sidecar", f.r.status === 0 && q4.issueTitle === "Port … helpers" && !/acme\/Support#3/.test(html4) && !/acme\/Support#3/.test(side4) && js(f.s.wrote) === js([`${p4.folder}/plan.json`]), js([f.s.error, q4.issueTitle, f.s.wrote])]);
    c.push(["…leaves the other text as it stands, listed", q4.rows[0].gap.summary === OLD && (f.s.listed || []).length === 1 && f.s.listed[0].at === "rows[0].gap.summary" && (f.s.fixed || []).length === 1, js([f.s.listed, f.s.fixed])]);
    c.push(["…and the board still embeds its data verbatim", run(EMBED, [path.join(root4, ...p4.folder.split("/")), "--check"], envWith(null)).status === 0, ""]);
    const g = swept(tree([flight()]), path.join(sc, `record-${++n}.json`));
    c.push(["a repository where nothing is found has no warning stage", g.r.status === 0 && g.s.finds === 0 && g.s.stage === "none", js(g.s)]);
  });

  guard("the warning stage: the checks warn on a text already on a board, naming the sweep, and the writers refuse only a text newly written", c => {
    const rec = path.join(sc, `record-${++n}.json`), p = named(), root = tree([p]), dir = path.join(root, ...p.folder.split("/"));
    const env = envWith(rec), env0 = envWith(null);
    const r0 = run(CHECK, [dir], env0);
    c.push(["with no sweep, check.js fails the board, as the rule says", r0.status === 1 && fails(r0).some(l => /PRIVATE REPOSITORY: plan\.json .*rows\[0\]\.gap\.summary/.test(l)), fails(r0).join(" | ")]);
    const a = swept(root, rec);
    const r1 = run(CHECK, [dir], env);
    c.push(["in the warning stage, check.js warns on the text the sweep lists, naming the sweep, and fails nothing for it", a.r.status === 0 && !fails(r1).some(l => /PRIVATE/.test(l)) && warns(r1).some(l => /PRIVATE REPOSITORY, KEPT BY A SWEEP: plan\.json .*rows\[0\]\.gap\.summary.*the sweep of 2026-11-20 \(private-repositories\) lists it in acme\/widgets/.test(l)), [fails(r1).join(" | "), warns(r1).filter(l => /PRIVATE/.test(l)).join(" | ")].join(" || ")]);
    const e1 = run(EMBED, [dir], env), q1 = P(root, p.folder);
    c.push(["embed.js writes the board, the kept text with a warning, and still cuts the quotation's name", e1.status === 0 && /KEPT BY A SWEEP/.test(e1.stdout) && q1.issueTitle === "Port … helpers" && q1.rows[0].gap.summary === OLD, (e1.stdout + e1.stderr).slice(-300)]);
    const ev = (facts, extra) => { const rq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: p.repo, issue: p.issue, event: "implementation-stage", folder: p.folder, facts: { stage: "S1", stages: STG("current", "todo"), at: "2026-11-20T04:00:00Z", ...facts } }));
      const r = run(APPLY, ["--event", rq, "--worktree", root, "--no-gh", "--no-live", "--json", ...(extra || [])], env); return { r, s: parse(r) }; };
    const a1 = ev({});
    c.push(["apply-event.js applies an event to a board holding a kept text, the summary warning and naming the sweep", a1.r.status === 0 && (a1.s.warnings || []).some(w => /KEPT BY A SWEEP.*the sweep of 2026-11-20/.test(w)) && P(root, p.folder).rows[0].gap.summary === OLD, js([a1.r.status, a1.s.error, a1.s.warnings, a1.s.check])]);
    const before = files(root, p.folder), a2 = ev({ open: [{ text: "Blocked by acme/hidden-ledger#2." }] });
    c.push(["…and fails an event whose fact newly names one, every file as it was", a2.r.status === 1 && /PRIVATE REPOSITORY: .*wip\.open/.test(a2.s.error || "") && files(root, p.folder) === before, js([a2.r.status, a2.s.error])]);
    const fill = fields => { const f = wr(path.join(sc, `fields-${++n}.json`), js(fields)); const r = run(FILL, [dir, "--fields", f, "--json"], env); return { r, s: parse(r) }; };
    const f1 = fill({ rows: [{ id: p.rows[0].id, gap: { summary: OLD } }] });
    c.push(["fill.js takes a text already on the board, warning in its notes and naming the sweep", f1.r.status === 0 && /KEPT BY A SWEEP: the fields .*rows\[0\]\.gap\.summary/.test(js(f1.s.notes || [])), js([f1.r.status, f1.s.error, f1.s.notes])]);
    const f0 = files(root, p.folder), f2 = fill({ rows: [{ id: p.rows[0].id, gap: { summary: "The helpers now live in acme/VaultKeeper." } }] });
    c.push(["…and refuses a text newly written that names one: exit 2, nothing written", f2.r.status === 2 && /PRIVATE REPOSITORY: the fields .*rows\[0\]\.gap\.summary/.test(f2.s.error || "") && files(root, p.folder) === f0, js([f2.r.status, f2.s.error])]);
    /* a state board's own text, kept */
    const sroot = tree([flight()], [["docs/dashboards/system-alpha/index.html", rd(tp("system/template/system.html")).replace("<footer>", "<p>Its client code is shared with acme/VaultKeeper.</p>\n<footer>")]]);
    const srec = path.join(sc, `record-${++n}.json`), page = path.join(sroot, "docs", "dashboards", "system-alpha", "index.html");
    swept(sroot, srec);
    const b1 = run(CB, [page, "--auto", "--no-browser"], envWith(srec));
    c.push(["check-board.js warns on a state board's own text the sweep lists, naming the sweep, and finds no problem in it", !/CHECK PRIVATE REPOSITORY: /.test(b1.stdout) && /PRIVATE REPOSITORY, KEPT BY A SWEEP: the board .*the sweep of 2026-11-20/.test(b1.stdout), b1.stdout.split(/\r?\n/).filter(l => /PRIVATE|private/.test(l)).join(" | ")]);
    wr(page, rd(page).replace("<footer>", "<p>Its tests run against acme/hidden-ledger.</p>\n<footer>"));
    const b2 = run(CB, [page, "--auto", "--no-browser"], envWith(srec));
    c.push(["…and fails a line the sweep does not list", b2.status === 1 && /CHECK PRIVATE REPOSITORY: the board names a private repository \(acme\/hidden-ledger\)/.test(b2.stdout), b2.stdout.split(/\r?\n/).filter(l => /PRIVATE/.test(l)).join(" | ")]);
  });

  /* the user's decision q-412, 2a: a lower-case name with hyphens, bare, newly found by the rule, on a board that already held it (the #2 board's encounter) */
  guard("a lower-case name with hyphens already on a board: the sweep finds it, and an event that writes the board warns, naming the sweep, where with no sweep it fails", c => {
    const rec = path.join(sc, `record-${++n}.json`), p = flight(), env0 = envWith(null), env = envWith(rec);
    const SUM = "Rehearsed in hidden-ledger before the swap.", EXC = "Run the rewrite in hidden-ledger first.";
    p.impact = { ...(p.impact || {}), summary: SUM };
    p.rows[1].verdict.statements[0].excerpt = { ...(p.rows[1].verdict.statements[0].excerpt || {}), paragraph: EXC };
    const root = tree([p]), dir = path.join(root, ...p.folder.split("/"));
    const ev = (e, facts) => { const rq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: p.repo, issue: p.issue, event: "implementation-stage", folder: p.folder, facts: { stage: "S1", stages: STG("current", "todo"), at: "2026-11-20T04:00:00Z", ...(facts || {}) } }));
      const r = run(APPLY, ["--event", rq, "--worktree", root, "--no-gh", "--no-live", "--json"], e); return { r, s: parse(r) }; };
    const before = files(root, p.folder), a0 = ev(env0);
    c.push(["with no sweep, an event that writes the board fails on the summary it already held, every file as it was", a0.r.status === 1 && /PRIVATE REPOSITORY: .*\(acme\/hidden-ledger\).*impact\.summary/.test(a0.s.error || "") && files(root, p.folder) === before, js([a0.r.status, a0.s.error])]);
    const sw = swept(root, rec);
    c.push(["the sweep finds both: the excerpt as one the writers fix, the summary listed for the user's decision", sw.r.status === 0 && (sw.s.fixable || []).some(x => /rows\[1\]\.verdict\.statements\[0\]\.excerpt\.paragraph$/.test(x.at)) && (sw.s.listed || []).some(x => x.at === "impact.summary") && sw.s.stage === "warning", js([sw.s.fixable, sw.s.listed])]);
    const a1 = ev(env), q1 = P(root, p.folder);
    c.push(["in the warning stage the same event applies: the summary kept, the summary warning and naming the sweep, no refusal", a1.r.status === 0 && q1.impact.summary === SUM && (a1.s.warnings || []).some(w => /KEPT BY A SWEEP.*impact\.summary.*the sweep of 2026-11-20 \(private-repositories\) lists it in acme\/widgets/.test(w)), js([a1.r.status, a1.s.error, a1.s.warnings])]);
    c.push(["…and the excerpt, a quotation, has the name cut to \"…\" as the writers cut it", q1.rows[1].verdict.statements[0].excerpt.paragraph === "Run the rewrite in … first.", q1.rows[1].verdict.statements[0].excerpt.paragraph]);
    const r1 = run(CHECK, [dir], env);
    c.push(["check.js warns on the kept summary, naming the sweep, and fails nothing for it", !fails(r1).some(l => /PRIVATE/.test(l)) && warns(r1).some(l => /PRIVATE REPOSITORY, KEPT BY A SWEEP: plan\.json .*impact\.summary/.test(l)), [fails(r1).join(" | "), warns(r1).filter(l => /PRIVATE/.test(l)).join(" | ")].join(" || ")]);
    const b2 = files(root, p.folder), a2 = ev(env, { open: [{ text: "The swap waits on hidden-ledger." }] });
    c.push(["…and an event whose fact newly names one bare still fails, every file as it was", a2.r.status === 1 && /PRIVATE REPOSITORY: .*wip\.open/.test(a2.s.error || "") && files(root, p.folder) === b2, js([a2.r.status, a2.s.error])]);
    /* a run's checkout (--run) whose board carries the text otherwise than the committed board (a seeding added to it, its view copy gone) */
    const RUNSUM = SUM + " Deleting it is the owner's.", rp = copy(p); rp.impact.summary = RUNSUM;
    const runRoot = tree([rp]), runDir = path.join(runRoot, ...rp.folder.split("/")), rec2 = path.join(sc, `record-${++n}.json`), env2 = envWith(rec2);
    const evR = (e, facts) => { const rq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: rp.repo, issue: rp.issue, event: "implementation-stage", folder: rp.folder, facts: { stage: "S1", stages: STG("current", "todo"), at: "2026-11-20T04:00:00Z", ...(facts || {}) } }));
      const r = run(APPLY, ["--event", rq, "--worktree", runRoot, "--no-gh", "--no-live", "--json"], e); return { r, s: parse(r) }; };
    const base = tree([p]);
    swept(base, rec2);
    const runBefore = files(runRoot, rp.folder), m0 = evR(env2);
    c.push(["a sweep of the committed boards alone leaves the run's own form of the text unkept: the run's event fails, every file as it was", m0.r.status === 1 && /PRIVATE REPOSITORY: .*impact\.summary/.test(m0.s.error || "") && files(runRoot, rp.folder) === runBefore, js([m0.r.status, m0.s.error])]);
    const sr = swept(base, rec2, ["--run", runRoot]);
    c.push(["with --run, the sweep reads the run's checkout, reports the text found there and not on the committed boards, and writes nothing in it", sr.r.status === 0 && (sr.s.inFlight || []).length === 1 && sr.s.inFlight[0].at === "impact.summary" && sr.s.inFlight[0].board === `${rp.folder}/plan.json` && files(runRoot, rp.folder) === runBefore, js([sr.s.error, sr.s.inFlight])]);
    c.push(["…and records it, with the run's checkout", (() => { const e = JSON.parse(rd(rec2)).sweeps[0].repositories[0]; return js(e.runs) === js([path.resolve(runRoot)]) && e.inFlight.length === 1 && e.texts.length === 3; })(), rd(rec2).slice(0, 400)]);
    const m1 = evR(env2);
    c.push(["…so the run's event applies, warning and naming the sweep", m1.r.status === 0 && (m1.s.warnings || []).some(w => /KEPT BY A SWEEP.*impact\.summary/.test(w)) && P(runRoot, rp.folder).impact.summary === RUNSUM, js([m1.r.status, m1.s.error, m1.s.warnings])]);
    const runNow = files(runRoot, rp.folder), sf = swept(base, rec2, ["--run", runRoot, "--fix"]);
    c.push(["--fix writes the committed boards' fixes and never a run's checkout", sf.r.status === 0 && js(sf.s.wrote) === js([`${rp.folder}/plan.json`]) && files(runRoot, rp.folder) === runNow, js([sf.s.error, sf.s.wrote])]);
  });

  /* p78's encounter: a run's first board event seeds the previous landing's view copy, which holds a text written before the rule was placed */
  guard("the warning stage at a seeding: a view copy's text already on a board is seeded with a warning, where with no sweep the event fails (apply-event.js seed)", c => {
    const lib = require(sk("plan/scripts/lib.js")), TRK = J("verify/fixtures/tracking.plan.json");
    const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
    const TF = "docs/plans/55-http-client-stack", SF = `${TF}/47-java-23-bytecode`, env0 = envWith(null);
    const main = path.join(sc, `seed-main-${++n}`), tdir = path.join(main, ...TF.split("/")), sdir = path.join(main, ...SF.split("/"));
    if (git(sc, "init", "-q", "-b", "master", main).status !== 0) throw new Error("git init failed");
    wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
    const sub = copy(EX); Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: SF, parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
    delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built"); sub.impact = { ...(sub.impact || {}), basis: "as-built" };
    sub.wip = { ...sub.wip, step: "document", since: "2026-10-26T09:20:00Z", updated: "2026-10-26T09:20:00Z", current: ["built"], questions: [], research: null, open: [], event: { name: "document", at: "2026-10-26T09:20:00Z" }, steps: STEPS };
    const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); wr(path.join(sdir, "plan.json"), JSON.stringify(sub, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
    run(EMBED, [sdir], env0); run(EMBED, [tdir], env0);
    git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the merge");
    const M = (git(main, "rev-parse", "HEAD").stdout || "").trim();
    const lq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: "landed", folder: SF, repo: main, facts: { pr: 90, sha: M, merge: M, date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" } }));
    const la = parse(run(APPLY, ["--event", lq, "--worktree", main, "--main", main, "--no-live", "--no-gh", "--at", "2026-10-26T09:30:00Z", "--json", "--view"], env0));
    /* the tracking board's view copy, as a writer left it before the rule: a text of the board's own that names a private repository */
    const vT = path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack"), vt = JSON.parse(rd(path.join(vT, "plan.json")));
    vt.function = "Consolidates the HTTP clients, as acme/VaultKeeper does."; const vj = JSON.stringify(vt, null, 2) + "\n";
    wr(path.join(vT, "plan.json"), vj); wr(path.join(vT, "dashboard.html"), lib.writeBlock(rd(path.join(vT, "dashboard.html")), "plan", vj)); if (fs.existsSync(path.join(vT, "plan.js"))) wr(path.join(vT, "plan.js"), lib.sidecarText("plan", vj));
    const wt = path.join(sc, `seed-wt-${++n}`);
    c.push(["the landing is in the view copies", la.result === "ok" && git(main, "worktree", "add", "-q", "-b", "docs/issue-63", wt).status === 0, js([la.result, la.error])]);
    const wT = path.join(wt, ...TF.split("/")), snap = () => rd(path.join(wT, "plan.json")) + rd(path.join(wT, "dashboard.html"));
    const seedIt = (rec, atT) => { const q = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: sub.repo, event: "seed", facts: {} }));
      const a = run(APPLY, ["--event", q, "--worktree", wt, "--main", main, "--no-gh", "--no-live", "--at", atT, "--json"], envWith(rec)); return { a, S: parse(a) }; };
    const before = snap(), s0 = seedIt(null, "2026-10-26T10:00:00Z");
    c.push(["with no sweep, the seeding fails on the copy's text, every file as it was (as on p78's encounter)", s0.a.status === 1 && /PRIVATE REPOSITORY/.test(s0.S.error || "") && snap() === before, js([s0.a.status, s0.S.error])]);
    const rec = path.join(sc, `record-${++n}.json`);
    const cfg = wr(path.join(sc, `repositories-${n}.json`), js({ owner: sub.repo.split("/")[0], repositories: [sub.repo.split("/")[1]], organizations: [] }));
    const sw = parse(run(SWEEP, ["run", "private-repositories", "--repo", sub.repo, "--tree", main, "--main", main, "--placed", "2026-11-17", "--binds-closed", "yes", "--at", "2026-11-20T01:00:00Z", "--config", cfg, "--json"], envWith(rec)));
    c.push(["the sweep finds the copy's text, with the main checkout's view copies, and lists it", sw.result === "swept" && (sw.listed || []).some(x => /^docs\/plans\/\.live\/view\/55-http-client-stack\/plan\.json$/.test(x.board) && x.at === "function"), js([sw.result, sw.error, sw.listed])]);
    const s1 = seedIt(rec, "2026-10-26T10:05:00Z"), pt = JSON.parse(rd(path.join(wT, "plan.json")));
    c.push(["in the warning stage, the same seeding applies: the copy's text carried, the summary warning and naming the sweep", s1.a.status === 0 && s1.S.result === "ok" && pt.function === vt.function && (s1.S.warnings || []).some(w => /KEPT BY A SWEEP.*the sweep of 2026-11-20/.test(w)), js([s1.a.status, s1.S.result, s1.S.error, s1.S.check, s1.S.warnings])]);
  });

  guard("the stage's end: once the fixes land, the same text fails and is refused again (sweep.js landed, status)", c => {
    const rec = path.join(sc, `record-${++n}.json`), p = named(), root = tree([p]), dir = path.join(root, ...p.folder.split("/")), env = envWith(rec);
    swept(root, rec, ["--fix"]);
    const s0 = sweep(["status"], rec);
    c.push(["status: the sweep, its rule, and the repository's warning stage standing", s0.r.status === 0 && s0.s.sweeps.length === 1 && s0.s.sweeps[0].repositories[0].stage === "warning" && s0.s.sweeps[0].repositories[0].fixed === 1 && s0.s.sweeps[0].repositories[0].listed === 1, js(s0.s)]);
    const u = sweep(["landed", "private-repositories", "--repo", "acme/gadgets"], rec);
    c.push(["landed is refused for a repository the sweep has no entry for", u.r.status === 2 && /no sweep of private-repositories is recorded for acme\/gadgets/.test(u.s.error || ""), js(u.s)]);
    const l = sweep(["landed", "private-repositories", "--repo", "acme/widgets", "--at", "2026-11-21T00:00:00Z"], rec);
    c.push(["landed records the fixes landed: the stage has ended", l.r.status === 0 && l.s.result === "landed" && JSON.parse(rd(rec)).sweeps[0].repositories[0].landed === "2026-11-21T00:00:00Z", js(l.s)]);
    const l2 = sweep(["landed", "private-repositories", "--repo", "acme/widgets"], rec);
    c.push(["…and again changes nothing", l2.r.status === 0 && l2.s.result === "unchanged" && JSON.parse(rd(rec)).sweeps[0].repositories[0].landed === "2026-11-21T00:00:00Z", js(l2.s)]);
    const r = run(CHECK, [dir], env);
    c.push(["check.js fails the text again, as the rule says", r.status === 1 && fails(r).some(x => /PRIVATE REPOSITORY: plan\.json .*rows\[0\]\.gap\.summary/.test(x)) && !warns(r).some(x => /KEPT BY A SWEEP/.test(x)), fails(r).join(" | ")]);
    const before = files(root, p.folder), e = run(EMBED, [dir], env);
    c.push(["embed.js refuses the board again, nothing written", e.status === 1 && /PRIVATE REPOSITORY: .*rows\[0\]\.gap\.summary/.test(e.stderr) && files(root, p.folder) === before, (e.stdout + e.stderr).slice(-300)]);
  });

  return groups;
};

if (require.main === module) {
  /* a private scratch of its own (verify/scratch.js): out/, the temp root and the stand-in team state, removed at exit unless kept */
  const SCR = require("./scratch.js").open("cases-sweep");
  process.env.DASHBOARDS_VERIFY = "1"; process.env.DASHBOARDS_PRIVATES = process.env.DASHBOARDS_PRIVATES || path.join(__dirname, "fixtures", "private-repositories.json");
  const args = process.argv.slice(2), oi = args.indexOf("--out"), out = oi >= 0 ? path.resolve(args[oi + 1]) : SCR.out;
  const SK = path.resolve(__dirname, ".."), sk = p => path.join(SK, ...p.split("/"));
  let failed = 0;
  module.exports({ sk, out }).forEach(([title, cases]) => {
    const bad = cases.filter(c => !c[1]); failed += bad.length;
    console.log(`${bad.length ? "FAILED " : "checked"}  ${title}: ${cases.length - bad.length}/${cases.length} cases`);
    bad.forEach(c => console.log(`  ${c[0]}: ${c[2]}`));
  });
  process.exit(failed ? 1 : 0);
}
