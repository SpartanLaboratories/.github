// The cases of the org work board, run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-org-board.js [--out <dir>].
// The generator (plan/scripts/org-board.js): the committed snapshot and the live view from one reading, no sidecar, a private repository named nowhere, a board linked on its
// default branch or its run's branch or not at all, a machine's paths left out, the live view's marker and the exclude line; check.js's new kind; the features the template
// takes; and the writers' one path for internal names (namerefs.js cleanWorkBoard(), cleanWritten()): a repository work board's copied text and a fill's text.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesOrgBoard(X) {
  const { sk, out } = X;
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; }, js = x => JSON.stringify(x, null, 2) + "\n";
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"], ...(o || {}) });
  const GEN = sk("plan/scripts/org-board.js"), CHECK = sk("plan/scripts/check.js"), TPL = sk("plan/template/org-board.html"), lib = require(sk("plan/scripts/lib.js")), N = require(sk("system/scripts/namerefs.js"));
  const sc = path.join(out, "org-board"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  /* GitHub, stood in for by a stub reading its replies from a file */
  const gh = {
    "repo view acme/widgets": { nameWithOwner: "acme/widgets", defaultBranchRef: { name: "main" }, isPrivate: false, isArchived: false, url: "https://github.com/acme/widgets" },
    "repo view acme/secret-vault": { nameWithOwner: "acme/secret-vault", defaultBranchRef: { name: "main" }, isPrivate: true, isArchived: false, url: "https://github.com/acme/secret-vault" },
    "repo view acme/SecretVault": { nameWithOwner: "acme/SecretVault", defaultBranchRef: { name: "main" }, isPrivate: true, isArchived: false, url: "https://github.com/acme/SecretVault" },
    "repo view acme/Hidden": { nameWithOwner: "acme/Hidden", defaultBranchRef: { name: "main" }, isPrivate: true, isArchived: false, url: "https://github.com/acme/Hidden" },
    "repo view acme/empty-repo": { nameWithOwner: "acme/empty-repo", defaultBranchRef: { name: "main" }, isPrivate: false, isArchived: false, url: "https://github.com/acme/empty-repo" },
    "repo view acme-games/engine": { nameWithOwner: "acme-games/engine", defaultBranchRef: { name: "master" }, isPrivate: false, isArchived: false, url: "https://github.com/acme-games/engine" },
    "repo list acme": [{ nameWithOwner: "acme/widgets", isArchived: false, url: "https://github.com/acme/widgets", visibility: "PUBLIC" }, { nameWithOwner: "acme/empty-repo", isArchived: false, url: "https://github.com/acme/empty-repo", visibility: "PUBLIC" }, { nameWithOwner: "acme/secret-vault", isArchived: false, url: "https://github.com/acme/secret-vault", visibility: "PRIVATE" }, { nameWithOwner: "acme/SecretVault", isArchived: false, url: "https://github.com/acme/SecretVault", visibility: "PRIVATE" }, { nameWithOwner: "acme/Hidden", isArchived: false, url: "https://github.com/acme/Hidden", visibility: "PRIVATE" }, { nameWithOwner: "acme/.github", isArchived: false, url: "https://github.com/acme/.github", visibility: "PUBLIC" }, { nameWithOwner: "acme/old-thing", isArchived: true, url: "https://github.com/acme/old-thing", visibility: "PUBLIC" }, { nameWithOwner: "acme/reference-only", isArchived: false, url: "https://github.com/acme/reference-only", visibility: "PUBLIC" }],
    "repo list acme-games": [{ nameWithOwner: "acme-games/engine", isArchived: false, url: "https://github.com/acme-games/engine", visibility: "PUBLIC" }],
    "trees acme/widgets main": ["docs/plans/index.html", "docs/plans/7-parser/dashboard.html"],
    "trees acme/widgets feat%2F8-cache": ["docs/plans/8-cache/dashboard.html"],
    "trees acme/widgets feat%2F11-no-copy": ["docs/plans/other/dashboard.html"],
    "trees acme/empty-repo main": ["README.md"], "trees acme-games/engine master": ["README.md"],
    "head": "1a74516b0c0a4d1f9d6c1e7e0f4ac2d9b1f2c3a4"
  };
  const replies = wr(path.join(sc, "gh.json"), JSON.stringify(gh));
  const stub = wr(path.join(sc, "gh-stub.js"), `const G=JSON.parse(require("fs").readFileSync(${JSON.stringify(replies)},"utf8"));const a=process.argv.slice(2);let v;
if(a[0]==="repo"&&a[1]==="view")v=G["repo view "+a[2]];else if(a[0]==="repo"&&a[1]==="list")v=G["repo list "+a[2]];
else if(a[0]==="api"){const m=/^repos\\/([^/]+\\/[^/]+)\\/git\\/trees\\/([^?]+)/.exec(a[1]);if(m){const t=G["trees "+m[1]+" "+m[2]];if(!t)process.exit(1);process.stdout.write(t.join("\\n")+"\\n");process.exit(0);}if(/\\/branches\\//.test(a[1])){process.stdout.write(G.head+"\\n");process.exit(0);}process.exit(1);}
if(v===undefined)process.exit(1);process.stdout.write(typeof v==="string"?v:JSON.stringify(v));`);
  /* three sibling checkouts: the page, a repository with a live view, and a private one's folder */
  const root = path.join(sc, "Page"), widgets = path.join(sc, "widgets");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  const live = { schema: "work-board/1", repo: "acme/widgets", generated: "2026-11-08T11:58:00Z", asOf: "2026-11-08", base: "../", live: { worktrees: 1 }, tree: {}, systems: [{ slug: "widgets-core", name: "widgets-core", slot: 1, top: "widgets-core", status: "built" }],
    groups: [{ key: "g", title: "Runs", issue: null }], roadmap: [], unscheduled: [], rows: [
      { issue: 7, title: "Rewrite widgets, SecretVault and Hidden, and replace the SecretVault clone", state: "CLOSED", waitsOn: [], blocks: [{ issue: 2, repo: "acme/secret-vault", hold: "blocks" }], board: "../7-parser/dashboard.html", folder: "../7-parser/", system: "widgets-core", detail: "Merged.", status: "landed", active: false, group: "g", order: 1, qa: [{ pass: 1, verdict: "approved", note: "reviewed by the planner's fixes" }] },
      { issue: 8, title: "On a branch on GitHub", state: "OPEN", waitsOn: [], blocks: [], board: "../8-cache/dashboard.html", folder: "../8-cache/", branch: "feat/8-cache", system: "widgets-core", detail: "Waiting on the user: under the admin-team model", status: "halted", active: false, group: "g", order: 2, step: "halted" },
      { issue: 9, title: "A branch not on GitHub", state: "OPEN", waitsOn: [], blocks: [], board: "../9-stream/dashboard.html", folder: "../9-stream/", branch: "feat/9-stream", system: "widgets-core", detail: "Stage 1 of 2, the Hidden cost named.", status: "building", active: true, group: "g", order: 3 },
      { issue: 10, title: "In a worktree", state: "OPEN", waitsOn: [], blocks: [], board: "file:///D:/elsewhere/worktree/docs/plans/10-w/dashboard.html", folder: "../../../../worktree/docs/plans/10-w/", branch: null, system: "widgets-core", detail: "", status: "planning", active: false, group: "g", order: 4 },
      { issue: 11, title: "A branch on GitHub without the board", state: "OPEN", waitsOn: [], blocks: [], board: "../11-no-copy/dashboard.html", folder: "../11-no-copy/", branch: "feat/11-no-copy", system: "widgets-core", detail: "", status: "building", active: true, group: "g", order: 5 }
    ] };
  wr(path.join(widgets, "docs", "plans", ".live", "board.json"), js(live));
  const cfg = wr(path.join(sc, "repos.json"), JSON.stringify({ owner: "acme", url: "https://github.com/acme", repositories: ["widgets", "secret-vault", "empty-repo"], organizations: [{ owner: "acme-games", parent: "acme", url: "https://github.com/acme-games", repositories: ["engine"] }], referenceOnly: ["reference-only"] }));
  const env = { ...process.env, DASHBOARDS_GH: stub };
  cp.spawnSync("git", ["init", "-q", root], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const R = run(GEN, ["--root", root, "--config", cfg], { env });
  const snap = path.join(root, "docs", "plans", "org-work-board"), liv = path.join(root, "docs", "plans", ".live", "org-work-board");
  const S = (() => { try { return JSON.parse(R.stdout); } catch (e) { return { parseError: (R.stderr || R.stdout || "").slice(0, 400) }; } })();
  const read = d => { try { return { j: JSON.parse(rd(path.join(d, "board.json"))), html: rd(path.join(d, "index.html")) }; } catch (e) { return { j: {}, html: "" }; } };
  const a = read(snap), b = read(liv), wg = (a.j.repositories || []).find(r => r.name === "widgets") || {};

  guard("the generator writes the committed snapshot and the live view from one reading (plan/scripts/org-board.js)", c => {
    c.push(["it exits 0 and reports both forms", R.status === 0 && S.snapshot === snap && S.live === liv, `exit ${R.status} ${(R.stderr || "").slice(0, 240)} ${S.parseError || ""}`]);
    c.push(["the schema is org-work-board/1 and only the live view says live", a.j.schema === "org-work-board/1" && b.j.schema === "org-work-board/1" && !a.j.live && b.j.live === true, js({ a: a.j.live, b: b.j.live })]);
    c.push(["each form is the template plus its board.json verbatim", !!a.html && lib.readBlock(a.html, "board").trim() === rd(path.join(snap, "board.json")).trim() && !!b.html && lib.readBlock(b.html, "board").trim() === rd(path.join(liv, "board.json")).trim(), "the data block differs from board.json"]);
    c.push(["neither form has a sidecar beside it (no board.js)", !fs.existsSync(path.join(snap, "board.js")) && !fs.existsSync(path.join(liv, "board.js")), "a board.js exists"]);
    c.push(["the live view names itself in docs/plans/.live/org-work-board/index.js", /orgBoard="index\.html"/.test(fs.existsSync(path.join(liv, "index.js")) ? rd(path.join(liv, "index.js")) : ""), "no marker"]);
    c.push(["docs/plans/.live/ is added to the checkout's .git/info/exclude", /docs\/plans\/\.live\//.test(rd(path.join(root, ".git", "info", "exclude"))), rd(path.join(root, ".git", "info", "exclude")).slice(0, 120)]);
    const s = S.check || [];
    c.push(["both forms pass check.js", s.length === 2 && s.every(x => x.status === 0), js(s).slice(0, 400)]);
  });

  guard("--checkouts names the folder of checkouts, apart from where the board is written (a worktree with none beside it)", c => {
    const wt = path.join(sc, "elsewhere", "worktree"), held = path.join(sc); fs.mkdirSync(path.join(wt, "docs"), { recursive: true });
    cp.spawnSync("git", ["init", "-q", wt], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const R2 = run(GEN, ["--root", wt, "--checkouts", held, "--config", cfg], { env }), s2 = read(path.join(wt, "docs", "plans", "org-work-board")), l2 = read(path.join(wt, "docs", "plans", ".live", "org-work-board"));
    const w2 = (s2.j.repositories || []).find(r => r.name === "widgets") || {};
    c.push(["it reads the repositories from the named folder and writes under the root", R2.status === 0 && !!w2.board && (w2.board.rows || []).length === 5, `exit ${R2.status} ${(R2.stderr || "").slice(0, 200)}`]);
    c.push(["without it, the same root finds no checkout: the default stays the root's sibling folders", (() => { const R3 = run(GEN, ["--root", wt, "--config", cfg], { env }), s3 = read(path.join(wt, "docs", "plans", "org-work-board")), w3 = (s3.j.repositories || []).find(r => r.name === "widgets") || {}; return R3.status === 0 && w3.board === null; })(), "the default read a checkout"]);
    run(GEN, ["--root", wt, "--checkouts", held, "--config", cfg], { env });
    const l3 = read(path.join(wt, "docs", "plans", ".live", "org-work-board")), s4 = read(path.join(wt, "docs", "plans", "org-work-board"));
    c.push(["only the live view records where the checkouts are; the committed snapshot holds no machine's path", typeof l3.j.siblings === "string" && /\/$/.test(l3.j.siblings) && !("siblings" in s4.j) && !("siblings" in a.j), js({ live: l3.j.siblings, snap: s4.j.siblings })]);
    c.push(["the template reads it", /SIB=B\.siblings\|\|/.test(rd(TPL)), "no B.siblings"]);
    const bad = run(GEN, ["--root", wt, "--checkouts", path.join(sc, "no-such-folder"), "--config", cfg], { env });
    c.push(["a folder that is not there is a usage error, exit 2", bad.status === 2 && /is not a folder/.test(bad.stderr), `exit ${bad.status}`]);
  });

  guard("a private repository is named nowhere; the parent organization has no container (the user's decisions)", c => {
    const all = a.html + b.html + rd(path.join(snap, "board.json")) + rd(path.join(liv, "board.json"));
    c.push(["secret-vault appears in neither form, not in Not shown, not as a dependency", !/secret-vault/.test(all), "named in the output"]);
    c.push(["a public issue's title naming a private repository elides each name, its plain-word one with it, and leaves the word elsewhere", ((wg.board || {}).rows || [])[0] && wg.board.rows[0].title === "Rewrite widgets, … and …, and replace the … clone" && wg.board.rows[2].detail === "Stage 1 of 2, the Hidden cost named." && !/SecretVault/.test(all), js(((wg.board || {}).rows || [])[0] && wg.board.rows[0].title)]);
    c.push(["Not shown lists the .github, the archived and the reference-only repositories, no private one", (a.j.notShown || []).map(x => x.repository).sort().join() === ["acme/.github", "acme/old-thing", "acme/reference-only"].sort().join() && (a.j.notShown || []).every(x => x.url && !/private/.test(x.why)), js(a.j.notShown)]);
    c.push(["a repository has no visibility field", !("visibility" in wg), Object.keys(wg).join()]);
    c.push(["the parent organization's repositories are the board's own repositories; only the sub-organization is an organizations entry", (a.j.repositories || []).length === 2 && (a.j.organizations || []).length === 1 && a.j.organizations[0].owner === "acme-games" && a.j.organizations[0].parent === "acme", js((a.j.organizations || []).map(o => o.owner))]);
  });

  guard("a board's link: its default branch, else its run's branch once the branch and the file are on GitHub, else none (the user's decisions)", c => {
    const B = wg.boards || {}; const ul = (wg.unlinked || []).map(u => u.issue).sort((x, y) => x - y);
    c.push(["#7, on the default branch, links there", B[7] && B[7].path === "docs/plans/7-parser/dashboard.html" && B[7].ref === "main", js(B[7])]);
    c.push(["#8, on a branch on GitHub whose tree holds the board, links its branch copy", B[8] && B[8].ref === "feat/8-cache", js(B[8])]);
    c.push(["#9 (a branch not on GitHub), #10 (no branch recorded) and #11 (a branch on GitHub without the board) stay unlinked, listed", ul.join() === "9,10,11" && !B[9] && !B[10] && !B[11], js(wg.unlinked)]);
    c.push(["#11: the branch exists, the board file is not on it, and the reason says so", /whose copy of the board is not on GitHub yet/.test(((wg.unlinked || []).find(u => u.issue === 11) || {}).why || ""), js(wg.unlinked)]);
    c.push(["no machine's path is left in the data: the worktree row's board and folder are null, the view's markers dropped", ((wg.board || {}).rows || [])[3] && wg.board.rows[3].board === null && wg.board.rows[3].folder === null && !("live" in (wg.board || {})), js(((wg.board || {}).rows || [])[3])]);
  });

  guard("the board's text goes through the writers' one path (the user's decision on internal names)", c => {
    const r = ((wg.board || {}).rows || []);
    c.push(["a halted row's detail naming a name no rewording removes gives way to \"Waiting on you.\"", r[1] && r[1].detail === "Waiting on you.", r[1] && r[1].detail]);
    c.push(["a pass's note is reworded", r[0] && r[0].qa[0].note === "reviewed by the fixes", r[0] && r[0].qa[0].note]);
    const bRows = { rows: [{ detail: "Waiting on the user: the planner's call", qa: [] }] }; N.cleanWorkBoard(bRows);
    c.push(["cleanWorkBoard() leaves no wait on the user, and is the path board.js writes through", /^Waiting on you: /.test(bRows.rows[0].detail) && /cleanWorkBoard\(board\)/.test(rd(sk("plan/scripts/board.js"))), bRows.rows[0].detail]);
    const fill = require(sk("plan/scripts/fill.js")), base = { wip: { step: "halted", waitingOn: "old", detail: "Waiting on you: old" }, trail: [{ date: "2026-10-25", label: "the planner's verification" }], rows: [] };
    const m = fill.mergeFill(base, { wip: { waitingOn: "C2, by the planner's fixes", detail: "Waiting on you: a re-pass" }, trailFix: [{ label: "the planner's verification", to: "the plan's verification" }], rows: [{ id: "x", gap: { summary: "the planner's note" } }] });
    c.push(["fill.js rewords a safe form, wip.detail and a trail entry through its narrow ways", m.plan.wip.waitingOn === "C2, by the fixes" && m.plan.wip.detail === "Waiting on you: a re-pass" && m.plan.trail[0].label === "the plan's verification" && m.plan.rows[0].gap.summary === "the note" && m.notes.some(n => /internal name reworded/.test(n)), js(m.plan.wip) + m.notes.join("|")]);
    let refused = ""; try { fill.mergeFill(base, { rows: [{ id: "x", gap: { summary: "under the admin-team model" } }] }); } catch (e) { refused = e.message; }
    c.push(["fill.js refuses a text that would still name one no library uses, naming the field", /rows\[0\]\.gap\.summary names .*admin-team/.test(refused), refused]);
    c.push(["a Refused is what a fill exits 2 on", /e instanceof Refused/.test(rd(sk("plan/scripts/fill.js"))), "fill.js"]);
    const G = rd(GEN); c.push(["the generator holds no rewording table", !/REWORD\b|reworded\s*:/.test(G) && !/under the single-writer model/.test(G), "the old table or reworded[] is still there"]);
  });

  guard("check.js holds the org work board's kind; the template's features; the one form of a link", c => {
    const F = require(sk("system/scripts/features.js")), D = require(sk("system/scripts/deviation.js"));
    const bad = sub => { const d = path.join(sc, "bad-" + sub.name); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); const j = JSON.parse(JSON.stringify(a.j)); sub.mut(j, d); wr(path.join(d, "board.json"), js(j)); wr(path.join(d, "index.html"), lib.writeBlock(rd(TPL), "board", js(j))); return run(CHECK, [d]); };
    const ok = run(CHECK, [snap]);
    c.push(["check.js passes the snapshot", ok.status === 0, (ok.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ")]);
    const c1 = bad({ name: "schema", mut: j => { j.schema = "work-board/1"; } }), c2 = bad({ name: "private", mut: (j) => { j.repositories[0].visibility = "private"; } }), c3 = bad({ name: "url", mut: (j) => { j.repositories[0].boards["7"] = "https://example.com/x"; } }), c4 = bad({ name: "sidecar", mut: (j, d) => { wr(path.join(d, "board.js"), "x"); } }), c5 = bad({ name: "notshown", mut: (j) => { j.notShown.push({ repository: "acme/secret-vault", url: "https://github.com/acme/secret-vault", why: "private" }); } }), c6 = bad({ name: "machine", mut: (j) => { j.repositories[0].board.rows[0].board = "file:///D:/x"; } });
    c.push(["a wrong schema is taken for the repository work board's check, not the org board's", c1.status !== 0, "c1"]);
    c.push(["a private repository's visibility fails", c2.status === 1 && /private repository/.test(c2.stdout), c2.stdout.slice(0, 200)]);
    c.push(["a board link that is not a path and a ref fails", c3.status === 1 && /boards\[7\] must be/.test(c3.stdout), c3.stdout.slice(0, 200)]);
    c.push(["a sidecar beside the board fails", c4.status === 1 && /no sidecar/.test(c4.stdout), c4.stdout.slice(0, 200)]);
    c.push(["a private repository in Not shown fails", c5.status === 1 && /notShown/.test(c5.stdout), c5.stdout.slice(0, 200)]);
    c.push(["a machine's path in a row fails", c6.status === 1 && /machine's path/.test(c6.stdout), c6.stdout.slice(0, 200)]);
    const tpl = rd(TPL), miss = F.probe(a.html, "org-work-board");
    c.push(["the template takes the org work board's features, its own and the shared ones", !miss.length && F.applicable("org-work-board").length > 10, js(miss)]);
    c.push(["its kind is known to deviation.js", D.kindOf(tpl) === "org-work-board", D.kindOf(tpl)]);
    c.push(["the website's form of a link is one function, siteUrl()", (tpl.match(/\/blob\//g) || []).length === 1 && /const siteUrl=/.test(tpl) && !/https:\/\/github\.com\/\$\{[^}]+\}\/blob/.test(tpl), "more than one place builds a website link"]);
    c.push(["the committed board and the live view share the template; a live view is only re-read on disk", /const isLive=\(\)=>!!B\.live&&LOCAL/.test(tpl) && /function readSiblings\(\)\{ if\(!LOCAL\) return;/.test(tpl), "no"]);
  });
  guard("the issue tree (plan/RULES.md §5, §10): the real sub-issue chain to any depth, in both work-board templates, one block", c => {
    const W = rd(sk("plan/template/board.html")), O = rd(TPL), block = t => (/\/\* tree:begin[\s\S]*?\/\* tree:end \*\//.exec(t) || [""])[0], css = t => (/\/\* tree-css:begin[\s\S]*?\/\* tree-css:end \*\//.exec(t) || [""])[0];
    c.push(["the tree's code is the same block in the repository work board and the org work board", !!block(O) && block(W) === block(O), "the blocks differ"]);
    c.push(["so are its styles", !!css(O) && css(W) === css(O), "the blocks differ"]);
    const vm = require("vm"), mk = () => { const st = {}; const ctx = vm.createContext({ esc: x => String(x == null ? "" : x), plural: (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s")), STATUS: { "not-started": { g: "…", l: "not started" }, "not-planned": { g: "⊖", l: "closed · not planned" }, duplicate: { g: "⊜", l: "closed · duplicate" } }, stOf: r => r.status, pill: d => "PILL:" + d.l, pair: (n, t) => "#" + n + " " + t, ilink: n => "#" + n, closedWord: x => x && x.state === "CLOSED" ? (x.stateReason === "NOT_PLANNED" ? "closed · not planned" : x.stateReason === "DUPLICATE" ? "closed · duplicate" : "closed") : "", TREE_KEY: "k", localStorage: { getItem: k => st[k] || null, setItem: (k, v) => { st[k] = v; } }, document: { addEventListener() {} }, out: null }); vm.runInContext(block(O).replace("const TREE_BUSY", "this.TREE_BUSY_MARK=1; const TREE_BUSY") + "\nthis.F=issueForest; this.FL=treeFlat; this.BU=treeBareStatus; this.P=treePref; this.BUSY=treeBusy; this.OF=x=>x;", ctx); return ctx; };
    const rows = [
      { issue: 2, title: "Phase 0", parent: 1, group: "1", order: 1, status: "building", active: false },
      { issue: 21, title: "Prep", parent: 2, group: "2", order: 1, status: "landed" },
      { issue: 22, title: "Rehearsal", parent: 2, group: "2", order: 2, status: "building", active: true },
      { issue: 40, title: "Standalone", parent: null, group: "other", order: 0, status: "landed", folder: "../40-standalone/" },
      { issue: 41, title: "A fix", parent: null, group: "other", order: 1, status: "building", folder: "../40-standalone/41-fix/", fixOf: 40 },
      { issue: 42, title: "Folded in", parent: null, group: "other", order: 2, status: "planning", folder: "../40-standalone/42-folded/" },
      { issue: 50, title: "Unit of a tracking issue on no list", parent: 99, group: "other", order: 3, status: "planning", folder: "../99-gone/50-unit/" },
      { issue: 60, title: "Landed chain", parent: null, group: "other", order: 4, status: "landed" },
      { issue: 61, title: "Landed unit", parent: 60, group: "other", order: 5, status: "landed" } ];
    const groups = [{ key: "1", issue: 1, title: "Consolidation" }, { key: "2", issue: 2, title: "Phase 0" }, { key: "other", issue: null, title: "Other runs" }];
    const road = [{ issue: 1, title: "Consolidation", state: "OPEN", items: [{ issue: 2, title: "Phase 0", state: "OPEN" }, { issue: 3, title: "Phase 1", state: "OPEN" }, { issue: 4, title: "Dropped", state: "CLOSED", stateReason: "NOT_PLANNED" }] }, { issue: 7, title: "Another tracking issue", state: "OPEN", items: [] }];
    const X = mk(), forest = X.F(rows, groups, road), flat = X.FL(forest, "r#"), of = n => flat.find(e => e.x && e.x.issue === n);
    c.push(["#1, with no Row of its own, owns #2 (a Row) and #3, #4 (roadmap items with no run), in landing order", of(1) && of(1).depth === 0 && of(2).depth === 1 && of(2).up === "1" && forest.nodes.find(x => x.issue === 1).kids.map(k => k.issue).join() === "2,3,4", flat.map(e => e.x ? e.x.issue + ":" + e.depth : "head").join()]);
    c.push(["#2 owns #21 and #22 at depth 2: to any depth", of(21).depth === 2 && of(22).depth === 2 && of(21).up === "2" && forest.nodes.find(x => x.issue === 2).kids.map(k => k.issue).join() === "21,22", "#21, #22"]);
    c.push(["a roadmap issue with no Row and no children is a root, after the tracking groups, before the rest", of(7) && of(7).depth === 0 && flat.findIndex(e => e.x && e.x.issue === 7) < flat.findIndex(e => e.x && e.x.issue === 40), js(flat.map(e => e.x && e.x.issue))]);
    c.push(["an issue with no parent sits at the root, under its group's heading", of(40).depth === 0 && of(40).up === "" && flat.some(e => e.head && e.head.key === "other") && flat.findIndex(e => e.head && e.head.key === "other") < flat.findIndex(e => e.x && e.x.issue === 40), js({ i: of(40).x.issue, d: of(40).depth, up: of(40).up })]);
    c.push(["the folder hierarchy nests a Row with no parent", of(42).up === "40", js({ i: of(42).x.issue, d: of(42).depth, up: of(42).up })]);
    c.push(["a fix never nests by its folder: it is no sub-issue", of(41).up === "" && of(41).depth === 0, js({ i: of(41).x.issue, d: of(41).depth, up: of(41).up })]);
    c.push(["an issue whose parent is on no list stays at the root, keeping the parent (\"part of\")", of(50).up === "" && forest.nodes.find(x => x.issue === 50).up === null && forest.nodes.find(x => x.issue === 50).parent === 99, js({ i: of(50).x.issue, d: of(50).depth, up: of(50).up })]);
    const loop = X.F([{ issue: 8, parent: 9, group: "other", order: 0, status: "landed" }, { issue: 9, parent: 8, group: "other", order: 1, status: "landed" }], [{ key: "other", issue: null, title: "Other runs" }], []);
    c.push(["a loop in the data draws no link, and both issues show", loop.roots.map(x => x.issue).sort().join() === "8,9", js(loop.roots.map(x => x.issue))]);
    c.push(["by default a level is open while something below it is in flight (#1, #2), and shut when nothing is (#40's chain landed, #60)", of(1).open === true && of(2).open === true && of(22).hidden === false && of(60).open === false && of(61).hidden === true, [of(1).open, of(60).open, of(61).hidden].join()]);
    X.P.set("r#2", false); const after = X.FL(X.F(rows, groups, road), "r#"), a2 = n => after.find(e => e.x && e.x.issue === n);
    c.push(["a choice kept in this browser overrides the default: #2 shut, its units hidden, #1 still open", a2(2).open === false && a2(21).hidden === true && a2(3).hidden === false, js({ o: a2(2).open, h: a2(21).hidden })]);
    c.push(["a line with no Row is drawn from the tracker: open sub-issue not started (dashed), closed as not planned by its reason, an open tracking issue with children by its own state word", X.BU(forest.nodes.find(x => x.issue === 3)) === "not-started" && X.BU(forest.nodes.find(x => x.issue === 4)) === "not-planned" && X.BU(forest.nodes.find(x => x.issue === 1)) === null, "statuses"]);
    /* every level that owns sub-issues shows its chain's StepBar, in both templates, from real data only (plan/RULES.md §5) */
    [["org work board", O], ["repository work board", W]].forEach(([nm, T]) => {
      const cu = T.indexOf("const chainUnits="), cr = T.indexOf("const chainRow="), chainCode = T.slice(cu, T.indexOf("\n", cr));
      const ctxOf = rs => { const ctx = vm.createContext({ esc: x => String(x == null ? "" : x), codeOnly: x => String(x), plural: (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s")), STATUS: { "not-started": { l: "not started" }, "not-planned": { l: "np" }, duplicate: { l: "d" } }, stOf: r => r.status, pill: d => "PILL:" + d.l, pair: (n, t) => "#" + n + " " + t, ilink: n => "#" + n, closedWord: () => "", sysColour: () => "var(--muted)", ROWS: rs, SB_STATE: { done: "landed", cur: "in progress", todo: "to come" }, TREE_KEY: "k", localStorage: { getItem: () => null, setItem: () => {} }, document: { addEventListener() {} } }); vm.runInContext(chainCode + "\n" + block(T) + "\nthis.F=issueForest; this.FL=treeFlat; this.CH=treeChain; this.CR=chainRow; this.BARE=treeBare; this.CU=chainUnits;", ctx); return ctx; };
      const rs = [
        { issue: 2, title: "Phase 0", parent: 1, group: "1", order: 1, status: "building" },
        { issue: 21, title: "Prep", parent: 2, group: "2", order: 1, status: "landed" },
        { issue: 22, title: "Rehearsal", parent: 2, group: "2", order: 2, status: "building", active: true },
        { issue: 23, title: "Merged", parent: 2, group: "2", order: 3, status: "merged" },
        { issue: 24, title: "Cancelled", parent: 2, group: "2", order: 4, status: "abandoned" },
        { issue: 30, title: "Recorded", parent: null, group: "other", order: 9, status: "building", chain: { units: [{ name: "From its board", state: "current" }] } },
        { issue: 31, title: "Unit", parent: 30, group: "other", order: 10, status: "not-started" },
        { issue: 40, title: "Host", parent: null, group: "other", order: 0, status: "landed", folder: "../40-host/" },
        { issue: 42, title: "Folded in", parent: null, group: "other", order: 2, status: "planning", folder: "../40-host/42-folded/" } ];
      const rd2 = [
        { issue: 1, title: "Consolidation", state: "OPEN", items: [{ issue: 2, title: "Phase 0", state: "OPEN" }, { issue: 3, title: "Phase 1", state: "OPEN" }, { issue: 4, title: "Dropped", state: "CLOSED", stateReason: "NOT_PLANNED" }, { issue: 5, title: "Done", state: "CLOSED", stateReason: "COMPLETED" }, { issue: 6, title: null }] },
        { issue: 7, title: "No sub-issue data", state: "OPEN", items: [] },
        { issue: 8, title: "Outer", state: "OPEN", items: [{ issue: 9, title: "Inner", state: "OPEN" }, { issue: 11, title: "Untouched", state: "OPEN" }] },
        { issue: 9, title: "Inner", state: "OPEN", items: [{ issue: 10, title: "Closed under it", state: "CLOSED" }] } ];
      const gs = [{ key: "1", issue: 1, title: "Consolidation" }, { key: "2", issue: 2, title: "Phase 0" }, { key: "other", issue: null, title: "Other" }];
      const X = ctxOf(rs), f = X.F(rs, gs, rd2), fl = X.FL(f, "r#"), en = n => fl.find(e => e.x && e.x.issue === n), nd = n => f.nodes.find(x => x.issue === n), chain = n => X.CH(nd(n)).map(u => u.name + ":" + u.st).join();
      const liOf = h => (h.match(/<li class="[a-z]+"/g) || []).map(s => s.slice(11, -1)).join();
      c.push([`${nm}: #1, a tracking issue with no Row, chains its sub-issues from the tree: its Row's state, the tracker's, nesting a tracking issue; not planned out, a line with no state out`, chain(1) === "Phase 0:cur,Phase 1:todo,Done:done", chain(1)]);
      const bar1 = X.CR(nd(1), en(1));
      c.push([`${nm}: its StepBar is a row of its own across the table, as #2's is`, /^<tr class="chainrow"[^>]*><td colspan="6"><ol class="stepbar" aria-label="#1: its units in landing order">/.test(bar1) && liOf(bar1) === "cur,todo,done" && !/<ol class="stepbar" data-tree-d/.test(bar1), bar1.slice(0, 160)]);
      c.push([`${nm}: the line with no Row emits it right after itself, so it hides with the line`, X.BARE(en(1)).includes('</td><td></td><td></td><td></td><td></td></tr><tr class="chainrow"') && /<tr class="run/.test(X.BARE(en(1))), X.BARE(en(1)).slice(-220)]);
      c.push([`${nm}: a nested tracking issue with a Row and no recorded units chains from the tree, merged done, cancelled out, indented at its depth`, chain(2) === "Prep:done,Rehearsal:cur,Merged:done" && /<ol class="stepbar" data-tree-d style="--d:1"/.test(X.CR(nd(2).row, en(2))), chain(2)]);
      c.push([`${nm}: a chain its board records is drawn as recorded, not from the tree`, X.CU(nd(30).row, nd(30)).map(u => u.name).join() === "From its board", js(X.CU(nd(30).row, nd(30)))]);
      c.push([`${nm}: a bare sub-issue is at work once anything under it is done or at work, else to come`, chain(8) === "Inner:cur,Untouched:todo", chain(8)]);
      c.push([`${nm}: a tracking issue with no sub-issue data shows no StepBar`, X.CR(nd(7), en(7)) === "" && !/chainrow/.test(X.BARE(en(7))), X.CR(nd(7), en(7))]);
      c.push([`${nm}: an issue nested only by its folder owns no sub-issue for the chain`, en(42).up === "40" && chain(40) === "" && X.CR(nd(40).row, en(40)) === "", chain(40)]);
      c.push([`${nm}: a hidden level's StepBar is hidden with it`, /<tr class="chainrow"[^>]* hidden>/.test(X.CR(nd(2).row, { ...en(2), hidden: true })), X.CR(nd(2).row, { ...en(2), hidden: true }).slice(0, 80)]);
      c.push([`${nm}: the Legend names the states of every chain drawn, from the tree`, /forest\.nodes\.flatMap\(x=>chainUnits\(x\.row\|\|x,x\)\.map\(u=>u\.st\)\)/.test(T), "the Legend reads Rows with a chain only"]);
    });
    const WF = F => F.replace(/\s+/g, " ");
    c.push(["the org work board's rows carry the tree's depth and Button, and a repository Panel its own Button", /treeAttrs\(e\)/.test(O) && /treeBtn\(e\)/.test(O) && /repoBtn\(r,/.test(O) && /aria-controls="\$\{esc\(id\)\}-tree \$\{esc\(id\)\}-key"/.test(O), "no tree in the rows"]);
    c.push(["the repository work board's rows carry them too", /treeAttrs\(e\)/.test(W) && /treeBtn\(e\)/.test(W) && /treeFlat\(forest,""\)/.test(W), "no tree in the rows"]);
    c.push(["each Row hides with its StepBar, and the Legend names the Button", /nx\.classList\.contains\("chainrow"\)/.test(O) && /treeLegend\(forest\)/.test(O) && /treeLegend\(forest\)/.test(W), "no"]);
    c.push(["the Button is a real button, keyboard-reachable, named and stated for assistive technology", /<button type="button" class="tw"/.test(O) && /aria-expanded="\$\{e\.open\}"/.test(O) && /aria-label="/.test(O), "no"]);
  });

  return groups;
};

if (require.main === module) {
  const a = process.argv.slice(2), o = a.includes("--out") ? a[a.indexOf("--out") + 1] : path.join(os.tmpdir(), "dashboards-verify");
  const sk = p => path.join(path.resolve(__dirname, ".."), ...p.split("/"));
  let bad = 0;
  module.exports({ sk, out: path.resolve(o) }).forEach(([what, cases]) => { const f = cases.filter(c => !c[1]); console.log(`${f.length ? "FAILED  " : "checked "} ${what}: ${cases.length - f.length}/${cases.length} cases`); f.forEach(c => console.log(`  ${c[0]}: ${c[2]}`)); bad += f.length; });
  process.exit(bad ? 1 : 0);
}
