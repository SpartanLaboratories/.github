// The cases of the private repositories (plan/RULES.md §1, "Private repositories"; the user's decision q-380), run by verify-templates.js (it
// passes its helpers in), or on its own with no browser: node verify/cases-private-names.js [--out <dir>].
// 1. The one rule (system/scripts/privaterefs.js): owner/name, owner/name#n, name#n, a CamelCase name and a value that is the name under a repo,
//    repository or name key name a repository; a plain-word name only beside one of those in the same text, never "GitHub <word>" or the word in
//    lower case; a name that begins another leaves no piece; a quotation (an issue's title, an excerpt) elided, any other text listed.
// 2. The list: a fixture list read alone (DASHBOARDS_PRIVATES); under the verification (DASHBOARDS_VERIFY=1) with neither a fixture nor a stand-in gh,
//    a failure that says why, and this machine's cache neither read nor written; from GitHub (a stand-in gh) into the cache; a fresh cache used as
//    it stands; an older one used, and said, where GitHub cannot be read; with none, a failure that says why; a malformed fixture refused; the
//    machine's cache outside every mirrored path; org-board.js, wblib.js and ideas.js reading the one module.
// 3. The writers: fill.js eliding a quoted title and refusing any other text (exit 2, nothing written); embed.js eliding an excerpt and a title,
//    refusing a board whose other text names one; apply-event.js eliding the issue's title at a sized and failing an event whose facts name one,
//    every file as it was; board.js eliding an issue's title and refusing a row's detail; apply-state.js eliding the last amendment's title and
//    refusing a state whose other text names one.
// 4. The checks: check.js failing a board whose data or page names one, a title included, and failing, saying why, where the list cannot be read;
//    check-board.js failing a state board whose hand-written text names one, and passing one that says "GitHub Support".
// No case reads GitHub or this machine's cache: the list is verify/fixtures/private-repositories.json, or a stand-in gh with a cache of the case's own.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesPrivateNames(X) {
  const { sk, out } = X, targets = X.targets || [];
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const sc = path.join(out, "private-names"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const FIXTURE = sk("verify/fixtures/private-repositories.json");
  /* every child runs under the verification with the fixture list, unless a case says otherwise */
  const baseEnv = { ...process.env, DASHBOARDS_VERIFY: "1", DASHBOARDS_PRIVATES: FIXTURE, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  delete baseEnv.DASHBOARDS_PRIVATES_CACHE; delete baseEnv.DASHBOARDS_GH;
  const run = (f, a, env) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env: env || baseEnv });
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const PR = require(sk("system/scripts/privaterefs.js"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), FILL = sk("plan/scripts/fill.js"), BOARD = sk("plan/scripts/board.js");
  const AS = sk("system/scripts/apply-state.js"), CB = sk("system/scripts/check-board.js");
  const PB = tp("plan/template/dashboard.html");
  const S = new Set(["acme/Support", "acme/VaultKeeper", "acme/hidden-ledger", "acme/hidden-ledger-old"]);
  let n = 0;

  guard("the one rule: what names a private repository, a quotation elided, any other text listed (privaterefs.js)", c => {
    const e = t => PR.elidePrivate(t, S).text, r = t => PR.privateRefs(t, S);
    c.push(["a plain-word name alone is the word: kept, and found nowhere", e("Ask GitHub Support; support the parser; Support it.") === "Ask GitHub Support; support the parser; Support it." && !r("Ask GitHub Support; Support it.").length, js(r("Ask GitHub Support; Support it."))]);
    c.push(["owner/name#n, owner/name and name#n are cut to \"…\" whole, the plain word beside them with them, \"GitHub Support\" kept", e("Move acme/Support#3 into Support, as GitHub Support asks; see Support#4 and acme/Support.") === "Move … into …, as GitHub Support asks; see … and ….", e("Move acme/Support#3 into Support, as GitHub Support asks; see Support#4 and acme/Support.")]);
    c.push(["a CamelCase name is found and cut on its own", r("Share code with VaultKeeper.").join() === "acme/VaultKeeper" && e("Share code with VaultKeeper.") === "Share code with ….", e("Share code with VaultKeeper.")]);
    c.push(["a name that begins another leaves no piece of the longer one", e("Retire acme/hidden-ledger-old for acme/hidden-ledger.") === "Retire … for ….", e("Retire acme/hidden-ledger-old for acme/hidden-ledger.")]);
    c.push(["a name inside a longer word, a path or another repository's name is no find", !r("acme/Supporting and VaultKeepers and acme/hidden-ledger-x").length, js(r("acme/Supporting and VaultKeepers and acme/hidden-ledger-x"))]);
    const d = { schema: "plan-board/1", issueTitle: "Port acme/Support#3 helpers", followUps: [{ issue: 4, title: "Use VaultKeeper" }], wip: { detail: "Waits on acme/hidden-ledger#2.", open: [{ text: "Fine." }] },
      rows: [{ id: "a", name: "Support", verdict: { statements: [{ text: "x", ref: "plan.md#a", excerpt: { heading: "Port", paragraph: "Use acme/VaultKeeper#1 here." } }] } }], blockers: { waitsOn: [{ repo: "acme/VaultKeeper", issue: 1 }] } };
    const g = PR.guardData(d, undefined, S);
    c.push(["an issue's title and an excerpt are elided in place", d.issueTitle === "Port … helpers" && d.followUps[0].title === "Use …" && d.rows[0].verdict.statements[0].excerpt.paragraph === "Use … here." && g.elided.length === 3, js(g.elided)]);
    c.push(["any other text is listed by where it stands, a value that is the name under a name key and a dependency's repo among them", js(g.named.map(x => x.at).sort()) === js(["blockers.waitsOn[0].repo", "rows[0].name", "wip.detail"]), js(g.named)]);
    c.push(["refsIn() lists a quotation too, for the checks", PR.refsIn({ schema: "plan-board/1", issueTitle: "Port acme/Support#3" }, S).length === 1, ""]);
    c.push(["guardBoard() throws, naming the field, where any other text names one", (() => { try { PR.guardBoard(copy({ wip: { detail: "acme/VaultKeeper" } }), "plan-board", "plan.json", { privates: S }); return false; } catch (x) { return /PRIVATE REPOSITORY: plan\.json .*wip\.detail.*nothing written/.test(x.message); } })(), ""]);
  });

  /* a child that prints what privatesOf() reads, or the error it throws */
  const probe = wr(path.join(sc, "probe.js"), `const P=require(${js(sk("system/scripts/privaterefs.js"))});try{const s=P.privatesOf(["acme","acme-games"]);process.stdout.write(JSON.stringify({list:[...s].sort(),source:P.source()}));}catch(e){process.stdout.write(JSON.stringify({error:e.message}));}`);
  const gh = wr(path.join(sc, "gh-stub.js"), `const a=process.argv.slice(2);if(a[0]==="repo"&&a[1]==="list"){process.stdout.write(JSON.stringify([{nameWithOwner:a[2]+"/open-thing",visibility:"PUBLIC"},{nameWithOwner:a[2]+"/Support",visibility:"PRIVATE"},{nameWithOwner:a[2]+"/inner",visibility:"INTERNAL"}]));process.exit(0);}process.exit(1);`);
  const noGh = path.join(sc, "no-such-gh.js");
  const envList = more => { const e = { ...baseEnv, ...more }; delete e.DASHBOARDS_PRIVATES; Object.keys(more).forEach(k => { if (more[k] == null) delete e[k]; }); return e; };

  guard("the list: a fixture, GitHub into this machine's cache, a fresh or an older cache, and under the verification no live read (privaterefs.js)", c => {
    const fx = parse(run(probe, []));
    c.push(["DASHBOARDS_PRIVATES names a fixture list, read alone", js(fx.list) === js(["acme/Support", "acme/VaultKeeper", "acme/hidden-ledger"]) && fx.source.source === "fixture", js(fx)]);
    const none = parse(run(probe, [], envList({})));
    c.push(["under the verification, with neither a fixture nor a stand-in gh, the reading fails and says why, this machine's cache unread", /verification reads no live GitHub/.test(none.error || "") && /DASHBOARDS_PRIVATES/.test(none.error || ""), js(none)]);
    const cache = path.join(sc, "cache", "private-repositories.json"), g1 = parse(run(probe, [], envList({ DASHBOARDS_GH: gh, DASHBOARDS_PRIVATES_CACHE: cache })));
    const cj = (() => { try { return JSON.parse(rd(cache)); } catch (e) { return {}; } })();
    c.push(["read from GitHub (a stand-in gh), every repository not public, both organizations", g1.source && g1.source.source === "github" && js(g1.list) === js(["acme-games/Support", "acme-games/inner", "acme/Support", "acme/inner"]), js(g1)]);
    c.push(["…and cached: its schema, the owners, the time read and the list", cj.schema === PR.SCHEMA && js(cj.owners) === js(["acme", "acme-games"]) && !isNaN(Date.parse(cj.read)) && cj.private.length === 4, js(cj)]);
    const g2 = parse(run(probe, [], envList({ DASHBOARDS_GH: noGh, DASHBOARDS_PRIVATES_CACHE: cache })));
    c.push(["a fresh cache is used as it stands: GitHub is not read", g2.source && g2.source.source === "cache" && g2.list.length === 4, js(g2)]);
    const old = { ...cj, read: "2026-01-01T00:00:00Z" }; wr(cache, js(old));
    const r3 = run(probe, [], envList({ DASHBOARDS_GH: noGh, DASHBOARDS_PRIVATES_CACHE: cache })), g3 = parse(r3);
    c.push(["an older cache, where GitHub cannot be read, is used and said", g3.source && g3.source.source === "stale cache" && g3.list.length === 4 && /GitHub could not be read/.test(r3.stderr || ""), js([g3, r3.stderr])]);
    const g4 = parse(run(probe, [], envList({ DASHBOARDS_GH: gh, DASHBOARDS_PRIVATES_CACHE: cache })));
    c.push(["an older cache is read again from GitHub where it can be", g4.source && g4.source.source === "github" && JSON.parse(rd(cache)).read !== old.read, js(g4)]);
    const g5 = parse(run(probe, [], envList({ DASHBOARDS_GH: noGh, DASHBOARDS_PRIVATES_CACHE: path.join(sc, "cache", "none.json") })));
    c.push(["with no cache and GitHub not to be read, it fails and says why: nothing is written", /could not be read from GitHub/.test(g5.error || "") && /nothing written/.test(g5.error || ""), js(g5)]);
    const bad = wr(path.join(sc, "bad-fixture.json"), js({ private: ["not a name"] })), g6 = parse(run(probe, [], { ...baseEnv, DASHBOARDS_PRIVATES: bad }));
    c.push(["a fixture that is not a list of owner/name is refused, saying why", /not a list of owner\/name/.test(g6.error || ""), js(g6)]);
    const rel = path.relative(path.join(os.homedir(), ".claude"), PR.DEFAULT_CACHE).split(path.sep), MIRRORED = ["CLAUDE.md", "rule-index.md", "settings.json", "hooks", "agents", "shared", "skills", "admin-team", "nomenclature", "tools"];
    c.push(["this machine's cache is under ~/.claude/cache/, outside every mirrored path", rel[0] === "cache" && !MIRRORED.includes(rel[0]) && rel.join("/") === "cache/dashboards/private-repositories.json", rel.join("/")]);
    c.push(["org-board.js, wblib.js and the ideas writer take the one module", require(sk("plan/scripts/org-board.js")).privateRefs === PR.privateRefs && require(sk("plan/scripts/org-board.js")).elidePrivate === PR.elidePrivate && /system", "scripts", "privaterefs\.js/.test(rd(sk("companions/scripts/wblib.js"))) && /privaterefs\.js/.test(rd(sk("plan/scripts/ideas.js"))) && !/function (elidePrivate|privateRefs)\b/.test(rd(sk("plan/scripts/org-board.js")) + rd(sk("companions/scripts/wblib.js")) + rd(sk("plan/scripts/ideas.js"))), ""]);
  });

  /* an issue board in implementation, from the worked example (as cases-arrival.js lays one) */
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), T0 = "2026-11-03T03:28:38Z";
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const STG = (a, b) => [{ id: "S1", name: "Stage one", state: a }, { id: "S2", name: "Stage two", state: b }];
  const flight = () => { const x = copy(EX), ids = x.rows.map(r => r.id); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: T0, updated: T0, current: ["built"], questions: [], research: null, open: [], qa: [], plan: null, remediation: null, history: {}, waits: [],
      stages: STG("current", "todo").map(s => ({ ...s, rows: [ids[0]] })), steps: STEPS.slice(), event: { name: "branch-cut", at: T0 } }; return x; };
  /* a board laid in a tree of its own; `raw` writes its data into the page without embed.js (a board that names one, as an older writer left it) */
  const lay = (plan, raw, more) => { const root = path.join(sc, `t-${++n}`), dir = path.join(root, ...plan.folder.split("/"));
    fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true }); (more || []).forEach(([f, t]) => wr(path.join(dir, f), t));
    const json = JSON.stringify(plan, null, 2) + "\n"; wr(path.join(dir, "plan.json"), json);
    if (raw) { const lib = require(sk("plan/scripts/lib.js")); wr(path.join(dir, "dashboard.html"), lib.writeBlock(rd(PB), "plan", json)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", json)); }
    else { wr(path.join(dir, "dashboard.html"), rd(PB)); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); }
    return { root, dir, plan }; };
  const files = B => ["plan.json", "dashboard.html", "plan.js"].map(f => { try { return rd(path.join(B.dir, f)); } catch (e) { return null; } }).join("\u0000");
  const P = B => JSON.parse(rd(path.join(B.dir, "plan.json")));

  guard("the writers: embed.js and fill.js elide a quotation and refuse any other text (an issue board)", c => {
    const p = flight(); p.issueTitle = "Port acme/Support#3 helpers"; p.rows[0].verdict.statements[0] = { text: p.rows[0].verdict.statements[0].text, ref: "notes.md#port" };
    const B = lay(p, false, [["notes.md", "# Notes\n\n## Port\n\nThe helpers move to acme/VaultKeeper#2, and VaultKeeper keeps them.\n"]]), q = P(B), ex = (q.rows[0].verdict.statements[0].excerpt || {}).paragraph || "";
    c.push(["embed.js elides the issue's title", q.issueTitle === "Port … helpers", q.issueTitle]);
    c.push(["embed.js elides the excerpt it copies", ex === "The helpers move to …, and … keeps them." && !/VaultKeeper/.test(rd(path.join(B.dir, "dashboard.html"))), ex]);
    const p2 = flight(); p2.wip.detail = "Stage one waits on acme/hidden-ledger#2.";
    const B2 = lay(p2, true), before = files(B2), e2 = run(EMBED, [B2.dir]);
    c.push(["embed.js refuses a board whose other text names one: exit 1, the field named, nothing written", e2.status === 1 && /PRIVATE REPOSITORY: .*wip\.detail/.test(e2.stderr) && files(B2) === before, (e2.stdout + e2.stderr).slice(-300)]);
    const fill = fields => { const f = wr(path.join(sc, `fields-${++n}.json`), js(fields)); const r = run(FILL, [B.dir, "--fields", f, "--json"]); return { r, s: parse(r) }; };
    const f0 = files(B), f1 = fill({ rows: [{ id: p.rows[0].id, gap: { text: "The helpers live in acme/VaultKeeper." } }] });
    c.push(["fill.js refuses a field that names one: exit 2, the field named, nothing written", f1.r.status === 2 && /PRIVATE REPOSITORY: the fields .*rows\[0\]\.gap\.text/.test(f1.s.error || "") && files(B) === f0, js(f1.s)]);
    const f2 = fill({ followUps: [{ issue: 12, title: "Share the cache with acme/Support#9" }] }), q2 = P(B), fu = (q2.followUps || []).find(x => x.issue === 12) || {};
    c.push(["fill.js elides a quoted title, named in notes", f2.r.status === 0 && fu.title === "Share the cache with …" && /a private repository's name elided/.test(f2.s.notes ? js(f2.s.notes) : ""), js([f2.s, fu])]);
    const f3 = fill({ trailFix: [{ label: "no such entry naming acme/VaultKeeper", to: "A clean label." }] });
    c.push(["a fill's trailFix label, which only finds an entry by its text, may name one (so a text already written can be corrected)", f3.r.status === 0, js(f3.s)]);
  });

  guard("the writers: apply-event.js elides the issue's title at a sized, and fails an event whose facts name one, every file as it was", c => {
    const root = path.join(sc, `sized-${++n}`); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    const req = facts => wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: "acme/widgets", issue: 97, event: "sized", folder: "docs/plans/97-port", facts: { step: "plan", baseline: "abc1234", ...facts } }));
    const a = run(APPLY, ["--event", req({ issueTitle: "Port acme/Support#3 helpers", title: "Port the helpers", function: "Moves the helpers into the library." }), "--worktree", root, "--no-gh", "--no-live", "--at", "2026-11-03T02:17:16Z", "--json"]), s = parse(a);
    const q = (() => { try { return JSON.parse(rd(path.join(root, "docs", "plans", "97-port", "plan.json"))); } catch (e) { return {}; } })();
    c.push(["the foundation's issue title has the name cut to \"…\"", a.status === 0 && q.issueTitle === "Port … helpers", js([a.status, s.error, q.issueTitle])]);
    const root2 = path.join(sc, `sized-${++n}`); fs.mkdirSync(path.join(root2, "docs", "plans"), { recursive: true });
    const a2 = run(APPLY, ["--event", req({ title: "Port the helpers to acme/VaultKeeper", function: "Moves the helpers." }), "--worktree", root2, "--no-gh", "--no-live", "--at", "2026-11-03T02:17:16Z", "--json"]), s2 = parse(a2);
    c.push(["a title of the board's own (not a quotation) that names one fails the event, nothing laid", a2.status === 1 && /PRIVATE REPOSITORY/.test(s2.error || "") && !fs.existsSync(path.join(root2, "docs", "plans", "97-port", "plan.json")), js([a2.status, s2.error])]);
    const B = lay(flight()), before = files(B);
    const rq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: B.plan.repo, issue: B.plan.issue, event: "implementation-stage", folder: B.plan.folder, facts: { stage: "S1", stages: STG("current", "todo"), at: "2026-11-03T04:00:00Z", open: [{ text: "Blocked by acme/hidden-ledger#2." }] } }));
    const a3 = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--json"]), s3 = parse(a3);
    c.push(["an event whose fact names one fails, every file as it was", a3.status === 1 && /PRIVATE REPOSITORY: .*wip\.open/.test(s3.error || "") && files(B) === before, js([a3.status, s3.error])]);
    const rq2 = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: B.plan.repo, issue: B.plan.issue, event: "implementation-stage", folder: B.plan.folder, facts: { stage: "S1", stages: STG("current", "todo"), at: "2026-11-03T04:00:00Z", open: [{ text: "Blocked until GitHub Support answers." }] } }));
    const a4 = run(APPLY, ["--event", rq2, "--worktree", B.root, "--no-gh", "--no-live", "--json"]), s4 = parse(a4);
    c.push(["…and the same fact saying \"GitHub Support\" applies", a4.status === 0, js([a4.status, s4.error])]);
  });

  guard("the writers: board.js elides an issue's title and refuses a row's text that names one", c => {
    const mk = () => { const root = path.join(sc, `wb-${++n}`); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
      const git = (...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd: root, encoding: "utf8", windowsHide: true });
      git("init", "-q", "-b", "master"); git("remote", "add", "origin", "https://github.com/acme/widgets.git"); return root; };
    const tracker = issues => wr(path.join(sc, `tracker-${++n}.json`), js({ issues: issues.map(i => ({ state: "OPEN", stateReason: null, closedAt: null, labels: [], createdAt: "2026-11-01T00:00:00Z", ...i })), prs: [], branches: [], graph: {} }));
    const root = mk(), r = run(BOARD, ["--root", root], { ...baseEnv, DASHBOARDS_TRACKER_FIXTURE: tracker([{ number: 5, title: "Port acme/Support#3 helpers" }]) });
    const b = (() => { try { return JSON.parse(rd(path.join(root, "docs", "plans", "board.json"))); } catch (e) { return {}; } })(), u = (b.unscheduled || []).find(x => x.issue === 5) || {};
    c.push(["an unscheduled issue's title has the name cut to \"…\"", r.status === 0 && u.title === "Port … helpers" && /private repositories: 1 name elided/.test(r.stdout), js([r.status, u.title, (r.stdout + r.stderr).slice(-200)])]);
    const root2 = mk(), p = flight(); p.status = "building"; p.wip.detail = "Waits on acme/hidden-ledger#2.";
    const dir = path.join(root2, ...p.folder.split("/")); wr(path.join(dir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB));
    const r2 = run(BOARD, ["--root", root2], { ...baseEnv, DASHBOARDS_TRACKER_FIXTURE: tracker([{ number: p.issue, title: "Handshake" }]) });
    c.push(["a row's detail that names one is refused: exit 1, the field named, no board.json written", r2.status === 1 && /PRIVATE REPOSITORY: board\.json .*rows\[0\]\.detail/.test(r2.stderr) && !fs.existsSync(path.join(root2, "docs", "plans", "board.json")), (r2.stdout + r2.stderr).slice(-300)]);
  });

  guard("the writers: apply-state.js elides the last amendment's title and refuses a state whose other text names one", c => {
    const L = require(sk("system/scripts/statelib.js")), SUP = tp("system/template/supersystem.html"), SYS = tp("system/template/system.html");
    const build = extra => { const sup = rd(SUP), sys = rd(SYS), tree = path.join(sc, `state-${++n}`), D = path.join(tree, "docs", "dashboards"), A = path.join(D, "system-alpha");
      const stamp = { ref: "main", sha: "1111111", date: "2026-10-20" }, stTxt = (slug, version) => L.stateText({ slug, version, asIs: { ...stamp }, lastAmended: { issue: 5, title: "five", sha: "1111111" }, written: { sha: "1111111" } });
      fs.mkdirSync(A, { recursive: true }); fs.mkdirSync(path.join(tree, "docs", "plans", "9-next-part"), { recursive: true }); ["system-alpha", "system-beta"].forEach(d => fs.mkdirSync(path.join(tree, d), { recursive: true }));
      const reg = JSON.parse(L.blockText(sup, "systems")); reg.repo = "acme/widgets";
      reg.systems.forEach(e => { if (e.status === "built") { e.asIs = { ...stamp }; e.lastAmended = { issue: 5, sha: "1111111" }; } });
      Object.assign(reg.systems.find(e => e.slug === "system-alpha"), { version: "1.0.0" }); Object.assign(reg.systems.find(e => e.slug === "system-beta"), { page: null, dsl: null, version: "2.0.0" });
      reg.systems.find(e => e.slug === "system-gamma").plannedBy.issue = 9;
      const regText = "{\n  \"repo\": \"acme/widgets\",\n  \"updated\": \"2026-10-20\",\n  \"systems\": [\n" + reg.systems.map(e => "    " + L.inline(e)).join(",\n") + "\n  ]\n}\n";
      fs.writeFileSync(path.join(D, "systems.json"), regText);
      const dsl = L.blockText(sup, "dsl").replace("// As-is at <repo> <branch> <sha> (<date>), <system> <version>.", "// As-is at widgets main 1111111 (2026-10-20), alpha 1.0.0.");
      fs.writeFileSync(path.join(D, "workspace.dsl"), dsl + "\n"); fs.writeFileSync(path.join(D, "state.json"), stTxt("repo", null));
      fs.writeFileSync(path.join(D, "index.html"), L.embedInto(L.embedInto(L.embedInto(sup, "systems", regText), "dsl", dsl), "state", stTxt("repo", null)));
      const sd = L.blockText(sys, "dsl").replace("// As-is at <repo> <branch> <sha> (<date>), <system> <version>.", "// As-is at widgets main 1111111 (2026-10-20), alpha 1.0.0.").replace('"system-slug as built at <sha>."', '"system-alpha as built at main 1111111."');
      const aState = extra ? JSON.stringify({ ...JSON.parse(stTxt("system-alpha", "1.0.0")), ...extra }, null, 2) + "\n" : stTxt("system-alpha", "1.0.0");
      fs.writeFileSync(path.join(A, "workspace.dsl"), sd + "\n"); fs.writeFileSync(path.join(A, "state.json"), aState);
      fs.writeFileSync(path.join(A, "index.html"), L.embedInto(L.embedInto(sys, "dsl", sd), "state", aState));
      fs.writeFileSync(path.join(tree, "docs", "plans", "9-next-part", "plan.json"), JSON.stringify({ issue: 9, systems: ["system-alpha"] }, null, 2) + "\n");
      return { tree, A, D }; };
    const apply = (T, facts) => { const f = wr(path.join(sc, `state-req-${++n}.json`), JSON.stringify({ v: 1, action: "state-boards", github: "acme/widgets", issue: 9, branch: "feat/issue-9-next-part", folder: "docs/plans/9-next-part", facts: { at: "2026-10-25T12:00:00Z", sha: "2222222abcdef0", ...facts } }));
      const r = run(AS, ["--event", f, "--worktree", T.tree, "--json"]); let s; try { s = JSON.parse((r.stdout || "").trim().split(/\r?\n/).pop()); } catch (e) { s = { result: "unparsed", error: (r.stdout || "") + (r.stderr || "") }; } s.status = r.status; return s; };
    const T = build(), s = apply(T, { title: "Port acme/Support#3 helpers" }), la = (JSON.parse(rd(path.join(T.A, "state.json"))).lastAmended || {});
    c.push(["the last amendment's title has the name cut to \"…\", named in the notes", s.status === 0 && la.title === "Port … helpers" && (s.notes || []).some(x => /private repositories: .* elided/.test(x)), js([s.status, s.error, la, s.notes])]);
    const T2 = build({ note: "Shared with acme/VaultKeeper." }), before = rd(path.join(T2.A, "state.json")), s2 = apply(T2, { title: "Next part" });
    c.push(["a state whose other text names one is refused, nothing written", s2.status === 1 && /PRIVATE REPOSITORY/.test(s2.error || "") && rd(path.join(T2.A, "state.json")) === before, js([s2.status, s2.error])]);
  });

  guard("the checks: check.js and check-board.js fail a board that names one; the list unread fails, saying why", c => {
    const ck = (dir, env) => run(CHECK, [dir], env), fails = r => (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l));
    const clean = lay(flight()), r0 = ck(clean.dir);
    c.push(["a clean board passes, naming none", !fails(r0).some(l => /PRIVATE/.test(l)) && /private repositories: plan\.json names none/.test(r0.stdout), fails(r0).join(" | ")]);
    const p1 = flight(); p1.wip.detail = "Waits on acme/hidden-ledger#2."; const r1 = ck(lay(p1, true).dir);
    c.push(["a board whose detail names one fails, PRIVATE REPOSITORY, the field named", r1.status === 1 && fails(r1).some(l => /PRIVATE REPOSITORY: plan\.json .*wip\.detail/.test(l)), fails(r1).join(" | ")]);
    const p2 = flight(); p2.issueTitle = "Port acme/Support#3 helpers"; const r2 = ck(lay(p2, true).dir);
    c.push(["a board whose issue title still names one fails too (a writer elides it)", r2.status === 1 && fails(r2).some(l => /PRIVATE REPOSITORY: plan\.json .*issueTitle/.test(l)), fails(r2).join(" | ")]);
    const envNone = { ...baseEnv }; delete envNone.DASHBOARDS_PRIVATES; const r3 = ck(clean.dir, envNone);
    c.push(["with the list not to be read, check.js fails, saying why", r3.status === 1 && fails(r3).some(l => /PRIVATE REPOSITORIES UNREAD: .*verification reads no live GitHub/.test(l)), fails(r3).join(" | ")]);
    const page = (name, extra) => { const f = path.join(sc, `sb-${++n}`, "index.html"); wr(f, extra ? rd(tp("system/template/system.html")).replace("<footer>", `<p>${extra}</p>
<footer>`) : rd(tp("system/template/system.html"))); return f; };
    const cb = f => run(CB, [f, "--auto", "--no-browser"]);
    const b0 = cb(page("clean")), b1 = cb(page("bad", "Its client code is shared with acme/VaultKeeper.")), b2 = cb(page("word", "Questions go to GitHub Support."));
    c.push(["check-board.js passes the template, naming none", !/PRIVATE REPOSITOR/.test(b0.stdout) || /private repositories: none named/.test(b0.stdout), b0.stdout.split(/\r?\n/).filter(l => /private|PRIVATE/.test(l)).join(" | ")]);
    c.push(["check-board.js fails a state board whose hand-written text names one", b1.status === 1 && /CHECK PRIVATE REPOSITORY: the board names a private repository \(acme\/VaultKeeper\)/.test(b1.stdout), b1.stdout.split(/\r?\n/).filter(l => /FAIL|PRIVATE/.test(l)).join(" | ")]);
    c.push(["…and finds nothing in \"GitHub Support\"", !/PRIVATE REPOSITORY/.test(b2.stdout), b2.stdout.split(/\r?\n/).filter(l => /PRIVATE/.test(l)).join(" | ")]);
    const envNone2 = { ...baseEnv }; delete envNone2.DASHBOARDS_PRIVATES; const b3 = run(CB, [page("unread"), "--auto", "--no-browser"], envNone2);
    c.push(["with the list not to be read, check-board.js fails, saying why", b3.status === 1 && /PRIVATE REPOSITORIES UNREAD: .*verification reads no live GitHub/.test(b3.stdout), b3.stdout.split(/\r?\n/).filter(l => /FAIL|PRIVATE/.test(l)).join(" | ")]);
  });

  return groups;
};

if (require.main === module) {
  /* a private scratch of its own (verify/scratch.js): out/, the temp root and the stand-in team state, removed at exit unless kept */
  const SCR = require("./scratch.js").open("cases-private-names");
  /* no live GitHub, no machine cache: the private repositories from the fixture list (system/scripts/privaterefs.js) */
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
