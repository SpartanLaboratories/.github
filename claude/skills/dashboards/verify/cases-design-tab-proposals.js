// The cases of dashboards-skill/53, the approved proposals of the Design tab's review (the user's approval of 2026-11-06: proposals 4, 6 and
// 7), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-design-tab-proposals.js [--out <dir>].
// 1. The Verdict's section chip (plan/RULES.md §2, "Statements"): a Verdict statement's reference drawn as a neutral chip, "§R2" (never the
//    link blue, no parentheses), a marked one "§42?" named in the legend; an As built statement ends with the same chip (the user's decision of 2026-11-08); a click on either opens the
//    section's excerpt (bindRefs()).
// 2. The Verdict cell's count labels (plan/RULES.md §2, "The Verdict Cell's count Labels"): its steps, tests and risks each a count label, the
//    figure in ink and muted at zero, the noun agreeing with it.
// 3. A unit's landing on a tracking board's As built cell (plan/RULES.md §3, "The units' landings"): embed.js copies the unit's own board's
//    pull request and merge commit into unit.landing (lib.js mirrorUnitLandings()) and clears it where that board has not landed; check.js
//    fails one not in its form or on an issue board and warns on one that lags its board; the cell draws the PR chip and the merge chip above
//    its summary, from unit.landing or, for a unit with no board, the row's asBuilt.pr and asBuilt.merge.
// 4. check.js warns on a path outside a code span in a row's evidence, statements or summaries (UNQUOTED PATH, plan/RULES.md §7), never fails.
// 5. The feature probes (section-chip, verdict-count-labels, landing-chips) pass on the template and name what an older one lacks.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesDesignTabProposals(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), C = require(sk("plan/scripts/check.js"));
  const PB = rd(tp("plan/template/dashboard.html")), WB = rd(tp("plan/template/board.html"));
  const SYS = rd(tp("system/template/system.html")), SUP = rd(tp("system/template/supersystem.html"));
  const EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "design-tab-proposals"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json"), DASHBOARDS_NO_BROWSER: "1" };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env });
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  /* the template's script without its comments, and a block of its top-level definitions from one line to another (that line left out) */
  const code = h => h.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const block = (h, from, to) => { const i = h.indexOf(from), j = h.indexOf(to, i + 1); if (i < 0 || j < 0) throw new Error(`no block ${from} … ${to} in the template`); return h.slice(i, j); };
  const line = (h, name) => { const m = new RegExp(`^const ${name}=.*$`, "m").exec(h); if (!m) throw new Error(`no const ${name}= in the template`); return m[0]; };
  /* the template's own helpers, run outside a browser */
  const ctx = (h, repo) => { const x = {}; vm.createContext(x);
    vm.runInContext(["esc", "relLink", "codeOnly", "nameText"].map(n => line(h, n).replace(/^const /, "var ")).join("\n"), x);
    vm.runInContext(`var REPO=${js(repo || "")};\n` + block(h, "const refNumShown=", "\nfunction stmtsHtml(").replace(/^const /gm, "var ").replace(/^let /gm, "var "), x);
    vm.runInContext(block(h, "const countLabel=", "\nconst whereChip=").replace(/^const /gm, "var "), x);
    return x; };

  guard("the section chip: \"§R2\", neutral, opening the excerpt, on Verdict and As built statements (the issue-board template)", c => {
    const H = ctx(PB);
    const s = { text: "The port stays generic.", ref: "plan.md#r2-the-port", excerpt: { heading: "R2. The port and its contract", paragraph: "…", hash: "x" } };
    const v = H.stmtRef(s, "port", "verdict", 0), b = H.stmtRef(s, "port", "built", 0);
    c.push(["a Verdict statement's reference is a section chip reading \"§R2\", no parentheses", /^ <a class="section-chip" href="plan\.md#r2-the-port" data-row="port" data-col="verdict" data-i="0" title="R2\. The port and its contract: click for the section's excerpt">§R2<\/a>$/.test(v), v]);
    c.push(["an As built statement ends with the same section chip, no parentheses, on its own row and column", /^ <a class="section-chip" href="plan\.md#r2-the-port" data-row="port" data-col="built" data-i="0" title="R2\. The port and its contract: click for the section's excerpt">§R2<\/a>$/.test(b), b]);
    const m = { text: "x", ref: "gone.md#42-the-fix" }, mv = H.stmtRef(m, "port", "verdict", 1);
    c.push(["a marked reference (its number from the anchor alone) reads \"§42?\" on its chip, the reason in its title", />§42\?<\/a>$/.test(mv) && /read from the link's anchor alone/.test(mv), mv]);
    c.push(["no reference, or one that is no relative link, draws no chip", H.stmtRef({ text: "x" }, "p", "verdict", 0) === "" && H.stmtRef({ text: "x", ref: "https://example.com/a#b" }, "p", "verdict", 0) === "", "\"\""]);
    const kV = H.refKey([m], []), kB = H.refKey([], [m]), k0 = H.refKey([s], [s]);
    c.push(["the legend names the marked chip \"§n?\" for Verdict and As built statements alike, and nothing when none is marked", /<b class="section-chip">§n\?<\/b> a section number read from its link alone/.test(kV) && /<b class="section-chip">§n\?<\/b>/.test(kB) && k0 === "" && !/srefk/.test(PB), js([kV, kB, k0])]);
    const s2 = code(PB);
    c.push(["the legend is fed the Verdict statements and the As built ones apart", /\+refKey\(ROWS\.flatMap\(r=>stmtsOf\(r\.verdict\)\),ROWS\.flatMap\(r=>stmtsOf\(r\.asBuilt\)\)\);/.test(s2), "renderBoard()"]);
    c.push(["a click on a section chip opens the excerpt (bindRefs() binds it), and no statement keeps a parenthesised reference", /function bindRefs\(root\)\{ \(root\|\|document\)\.querySelectorAll\("a\.section-chip"\)/.test(s2) && !/\bsref\b/.test(s2), "bindRefs()"]);
    const css = (PB.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "", chip = (/(?:^|\n)a\.section-chip\{([^}]*)\}/.exec(css) || [])[1] || "";
    c.push(["the chip is neutral: the kind chip's ink and hairline, never the link blue", /color:var\(--ink-2\)/.test(chip) && /border:1px solid var\(--line\)/.test(chip) && !/--link/.test(chip) && /\.legend b\.section-chip\{[^}]*color:var\(--ink-2\)/.test(css), chip]);
    c.push(["code inside the chip stays plain (the code label's rule for a chip)", /:is\(\[class\*="chip"\],\[class\*="pill"\],\[class\*="tile"\]\) code\{background:none;border:0;padding:0;border-radius:0\}/.test(css), "CSS"]);
    c.push(["the Design tab's lede names the § reference", /a statement's § reference for its detail/.test(PB), "renderBoard()"]);
  });

  guard("the Verdict cell's count labels: steps, tests and risks, the figure in ink and muted at zero", c => {
    const H = ctx(PB);
    c.push(["a count label: the figure bold, the noun agreeing with it", H.countLabel(1, "step") === '<span class="count-label"><b>1</b> step</span>' && H.countLabel(2, "risk") === '<span class="count-label"><b>2</b> risks</span>' && H.countLabel(3, "class", "classes") === '<span class="count-label"><b>3</b> classes</span>', js([H.countLabel(1, "step"), H.countLabel(2, "risk")])]);
    c.push(["muted at zero", H.countLabel(0, "test") === '<span class="count-label zero"><b>0</b> tests</span>', H.countLabel(0, "test")]);
    c.push(["the Verdict cell's foot draws its three counts as count labels", /<div class="meta"><span>\$\{countLabel\(\(v\.steps\|\|\[\]\)\.length,"step"\)\} · \$\{countLabel\(\(v\.tests\|\|\[\]\)\.length,"test"\)\} · \$\{countLabel\(\(v\.risks\|\|\[\]\)\.length,"risk"\)\}<\/span>\$\{moreLink\(v\.link,"plan"\)\}<\/div>/.test(PB), "cellVerdict()"]);
    c.push(["the As built cell's foot draws its changes and commits as count labels too (the user's decision of 2026-11-08)", /<div class="meta"><span>\$\{countLabel\(\(b\.changes\|\|\[\]\)\.length,"change"\)\} · \$\{countLabel\(\(b\.commits\|\|\[\]\)\.length,"commit"\)\}<\/span>/.test(PB), "cellBuilt()"]);
    const css = (PB.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
    c.push(["the CSS: the figure in ink, muted at zero, in the cell's foot as in the Gap cell's head", /\.cell \.meta \.count-label b\{color:var\(--ink\);font-weight:700\}/.test(css) && /\.cell \.meta \.count-label\.zero b\{color:var\(--muted\);font-weight:400\}/.test(css) && /\.cell \.kick \.count-label\.zero b\{/.test(css), "CSS"]);
  });

  guard("a unit's landing: unit.landing copied from its own board, the PR chip and the merge chip on its As built cell (the tracking board)", c => {
    /* lib.js unitLandingOf(): a landed board's wip.landing, else its asBuilt; none before it lands */
    const U = lib.unitLandingOf;
    c.push(["a landed board's pull request and merge commit", js(U({ status: "built", asBuilt: { sha: "abc1234", merge: "8122af7", pr: 89 } })) === js({ pr: 89, merge: "8122af7" }), js(U({ status: "built", asBuilt: { merge: "8122af7", pr: 89 } }))]);
    c.push(["its wip.landing first, as its own landed fact reads it", js(U({ status: "built", wip: { step: "landed", landing: { pr: 90, merge: "fedcba9" } }, asBuilt: { merge: "8122af7", pr: 89 } })) === js({ pr: 90, merge: "fedcba9" }), "wip.landing"]);
    c.push(["none from a board not landed, one that records neither, or a sha that is no sha", U({ status: "building", wip: { step: "merge", landing: { pr: 89 } } }) === null && U({ status: "built", asBuilt: { sha: "abc1234" } }) === null && js(U({ status: "built", asBuilt: { merge: "not-a-sha", pr: 89 } })) === js({ pr: 89 }), "null"]);
    /* a tree: the tracking fixture, its unit #61 (build-logic) with a landed board of its own */
    const TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json"))), EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json")));
    const root = path.join(sc, "tree"), tdir = path.join(root, "docs", "plans", "55-http-client-stack"), sdir = path.join(tdir, "61-build-logic");
    const trk = copy(TRK); trk.rows.filter(r => r.unit).forEach(r => { r.unit.board = null; r.unit.folder = r.id === "build-logic" ? "61-build-logic/" : null; delete r.unit.landing; });
    wr(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); wr(path.join(tdir, "dashboard.html"), PB);
    const s = copy(EX); Object.assign(s, { issue: 61, slug: "61-build-logic", folder: "docs/plans/55-http-client-stack/61-build-logic", parent: { issue: 55 }, status: "built",
      asBuilt: { ...(s.asBuilt || {}), sha: "8122af7", merge: "8122af7", pr: 89, date: s.baseline.date } });
    delete s.issueBoards; s.wip = { ...(s.wip || {}), step: "landed", landing: undefined };
    wr(path.join(sdir, "plan.json"), JSON.stringify(s, null, 2) + "\n"); wr(path.join(sdir, "dashboard.html"), PB);
    const P = () => JSON.parse(rd(path.join(tdir, "plan.json"))), row = (p, id) => p.rows.find(r => r.id === id);
    const e1 = run(EMBED, [tdir]), p1 = P();
    c.push(["embed.js copies the landed unit's pull request and merge into unit.landing", js(row(p1, "build-logic").unit.landing) === js({ pr: 89, merge: "8122af7" }) && /#61: landing mirrored from its board, PR #89, merge 8122af7/.test(e1.stdout + e1.stderr), js([row(p1, "build-logic").unit.landing, (e1.stdout || e1.stderr).split(/\r?\n/).filter(l => /landing/.test(l)).slice(0, 2)])]);
    c.push(["…and none onto a unit whose board is not in the tree", p1.rows.filter(r => r.unit && r.id !== "build-logic").every(r => !("landing" in r.unit)), "the other units"]);
    c.push(["the embedded copy carries it (the board draws from it)", /"landing": \{\s*"pr": 89,\s*"merge": "8122af7"\s*\}/.test(rd(path.join(tdir, "dashboard.html"))), "dashboard.html"]);
    const k1 = run(CHECK, [tdir, "--root", root]);
    c.push(["check.js: no landing warning on a mirror that matches its board", !/unit\.landing/.test(k1.stdout), (k1.stdout || "").split(/\r?\n/).filter(l => /unit\.landing/.test(l)).join(" | ")]);
    /* a mirror that lags: check.js warns; embed.js puts it right */
    const p2 = P(); row(p2, "build-logic").unit.landing = { pr: 88, merge: "8122af7" }; wr(path.join(tdir, "plan.json"), JSON.stringify(p2, null, 2) + "\n");
    const k2 = run(CHECK, [tdir, "--root", root]);
    c.push(["check.js warns on a mirror that differs from its board's landing", /^warn.*rows\(build-logic\)\.unit\.landing \(#61\) differs from its board's landing/m.test(k2.stdout), (k2.stdout || "").split(/\r?\n/).filter(l => /unit\.landing/.test(l)).join(" | ").slice(0, 300)]);
    /* not in its form: fails */
    const p3 = P(); row(p3, "build-logic").unit.landing = { pr: "89", merge: "nope" }; wr(path.join(tdir, "plan.json"), JSON.stringify(p3, null, 2) + "\n");
    const k3 = run(CHECK, [tdir, "--root", root]);
    c.push(["check.js fails a unit.landing whose pr is no number or whose merge is no sha", /^FAIL.*unit\.landing\.pr "89" is not a pull request's number/m.test(k3.stdout) && /^FAIL.*unit\.landing\.merge "nope" is not a commit sha/m.test(k3.stdout), (k3.stdout || "").split(/\r?\n/).filter(l => /unit\.landing/.test(l)).join(" | ").slice(0, 300)]);
    run(EMBED, [tdir]);
    c.push(["embed.js puts the mirror right again", js(row(P(), "build-logic").unit.landing) === js({ pr: 89, merge: "8122af7" }), js(row(P(), "build-logic").unit.landing)]);
    /* the unit's board not landed: the mirror is cleared */
    const s4 = JSON.parse(rd(path.join(sdir, "plan.json"))); s4.status = "building"; s4.wip.step = "merge"; delete s4.asBuilt.merge; delete s4.asBuilt.pr; wr(path.join(sdir, "plan.json"), JSON.stringify(s4, null, 2) + "\n");
    run(EMBED, [tdir]);
    c.push(["a unit whose board has not landed carries no landing (embed.js clears it)", !("landing" in row(P(), "build-logic").unit), js(row(P(), "build-logic").unit)]);
    /* on an issue board: fails */
    const ex = copy(EX); ex.rows[0].unit = { landing: { pr: 1, merge: "abc1234" } };
    const idir = path.join(root, "docs", "plans", "38-handshake-empty-name"); wr(path.join(idir, "plan.json"), JSON.stringify(EX, null, 2) + "\n"); wr(path.join(idir, "dashboard.html"), PB); run(EMBED, [idir]);
    const pi = JSON.parse(rd(path.join(idir, "plan.json"))); pi.rows[0].unit = { landing: { pr: 1, merge: "abc1234" } }; wr(path.join(idir, "plan.json"), JSON.stringify(pi, null, 2) + "\n");
    const k5 = run(CHECK, [idir, "--root", root]);
    c.push(["check.js fails a unit.landing on a board that is not a tracking board", /^FAIL.*unit\.landing on a board that is not a tracking board/m.test(k5.stdout), (k5.stdout || "").split(/\r?\n/).filter(l => /unit\.landing/.test(l)).join(" | ").slice(0, 300)]);
    /* the cell's chips, from the template's own helpers */
    const H = ctx(PB, "https://github.com/SpartanLaboratories/WebTools"), H0 = ctx(PB, "");
    const ch = H.landingChips({ unit: { issue: 61, landing: { pr: 89, merge: "8122af7aa" } }, asBuilt: { state: "landed" } });
    c.push(["the PR chip and the merge chip, each opening what it names", ch === '<div class="landing-chips"><a class="pr-chip" href="https://github.com/SpartanLaboratories/WebTools/pull/89" target="_blank" rel="noopener" title="the unit\'s pull request">PR #89</a><a class="merge-chip" href="https://github.com/SpartanLaboratories/WebTools/commit/8122af7aa" target="_blank" rel="noopener" title="the unit\'s merge commit 8122af7aa">merge 8122af7</a></div>', ch]);
    const bl = H0.landingChips({ unit: { issue: 63 }, asBuilt: { state: "landed", merge: "abc1234", pr: 97 } });
    c.push(["a unit with no board: the chips from its row's asBuilt (unit-landed's record); with no repository, plain chips", /<span class="pr-chip"[^>]*>PR #97<\/span><span class="merge-chip"[^>]*>merge abc1234<\/span>/.test(bl), bl]);
    c.push(["nothing on a unit that records no landing, nor on a row that is no unit", H.landingChips({ unit: { issue: 62 }, asBuilt: { state: "pending" } }) === "" && H.landingChips({ asBuilt: { pr: 5, merge: "abc1234" } }) === "", "\"\""]);
    c.push(["the As built cell draws them above its summary", /\$\{nextTags\(r\)\}<\/div>\$\{landingChips\(r\)\}<div class="sum">\$\{builtBody\(r,st\)\}<\/div>/.test(PB), "cellBuilt()"]);
    const css = (PB.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
    c.push(["the chips neutral, with the kind chip's look, wherever they stand", /(?:^|\n)\.landing-chips :is\(\.pr-chip,\.merge-chip\)\{font:600 10px var\(--mono\);color:var\(--ink-2\);border:1px solid var\(--line\)/.test(css), "CSS"]);
    c.push(["the As built Tab's Card and the inspector draw them too, above the statements (the user's decision of 2026-11-08)", /<\/div>\$\{landingChips\(r\)\}\$\{stmtsOf\(b\)\.length\?buildingLead\(r,st,"blead"\)/.test(PB) && /\$\{esc\(STATES\[st\]\.desc\)\}<\/div>\$\{landingChips\(r\)\}\$\{stmtsOf\(b\)\.length\?buildingLead\(r,st,"lead"\)/.test(PB), "renderBuilt(), inspectBuilt()"]);
  });

  guard("check.js warns on a path outside a code span in a row's texts (UNQUOTED PATH), never fails", c => {
    const want = [["common/HttpTransport.kt:29-30 — the read", ["common/HttpTransport.kt:29-30"]], ["see `a/b.kt` and plan.md.", ["plan.md"]], ["build.gradle.kts, README.md:12", ["build.gradle.kts", "README.md:12"]],
      ["(src/main/x.ts)", ["src/main/x.ts"]], ["Node.js, 1.2.3, e.g. x", []], ["https://x.y/a/b.kt and [x](docs/a.md)", []], ["the docs/ folder", []], ["`common/HttpTransport.kt:29`", []]];
    const bad = want.filter(([s, w]) => js(C.unquotedPaths(s)) !== js(w));
    c.push(["unquotedPaths(): a path with a folder or a line, or a file of an extension prose has no word in; never a code span, a URL, a link's target, \"Node.js\" or a version", !bad.length, js(bad.map(([s, w]) => [s, C.unquotedPaths(s), w]))]);
    const r = { gap: { summary: "a/b.kt", evidence: ["c/d.kt:1", "`e/f.kt:2`"] }, options: [{ summary: "x.md" }], verdict: { statements: [{ text: "g/h.kt" }] }, asBuilt: { summary: "i/j.kt", statements: [{ text: "ok" }] } };
    const sites = C.rowPathTexts(r, "rows[0] (x)").filter(([s]) => C.unquotedPaths(s).length).map(([, w]) => w);
    c.push(["it reads the gap's summary and evidence, each option's summary, the verdict's and the as-built statements and summaries", js(sites) === js(["rows[0] (x).gap.summary", "rows[0] (x).gap.evidence[0]", "rows[0] (x).options[0].summary", "rows[0] (x).asBuilt.summary", "rows[0] (x).verdict.statements[0].text"].sort((a, b) => sites.indexOf(a) - sites.indexOf(b))) && sites.length === 5, js(sites)]);
    const root = path.join(sc, "paths"), dir = path.join(root, "docs", "plans", "38-handshake-empty-name"), EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json")));
    const ex = copy(EX); ex.rows[0].gap.evidence = ["common/HttpTransport.kt:29-30 — the read", "`common/Handshake.kt:12`"];
    wr(path.join(dir, "plan.json"), JSON.stringify(ex, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB); run(EMBED, [dir]);
    const k = run(CHECK, [dir, "--root", root]), w = (k.stdout || "").split(/\r?\n/).filter(l => /UNQUOTED PATH/.test(l));
    c.push(["check.js warns once, naming the site and the path, and fails nothing for it", w.length === 1 && /^warn/.test(w[0]) && /rows\[0\] \([^)]+\)\.gap\.evidence\[0\] "common\/HttpTransport\.kt:29-30"/.test(w[0]) && !/Handshake\.kt/.test(w[0]) && !(k.stdout || "").split(/\r?\n/).some(l => /^FAIL/.test(l) && /UNQUOTED/.test(l)), w.join(" | ").slice(0, 400)]);
  });

  guard("the feature probes: section-chip, verdict-count-labels, landing-chips (issue and tracking boards only)", c => {
    const ids = ["section-chip", "verdict-count-labels", "landing-chips"], fs53 = F.FEATURES.filter(f => ids.includes(f.id));
    c.push(["each is a feature of dashboards-skill/53, for the issue and tracking boards, with its reason for every other type", fs53.length === 3 && fs53.every(f => f.since === 53 && js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f.notFor && typeof f.notFor[k] === "string" && f.notFor[k].length > 20)), js(fs53.map(f => [f.id, f.since, f.types]))]);
    const miss = F.probe(PB, "plan-board").filter(m => ids.includes(m.id));
    c.push(["the issue-board template carries all three", !miss.length, js(miss)]);
    const old = PB.replace(/const stmtRef=\(s,row,col,i\)=>\{[^\n]*\n[^\n]*\n/, 'const stmtRef=(s,row,col,i)=>"";\n').replace(/\$\{countLabel\(/g, "${plural(").split("${landingChips(r)}").join("");
    const lost = F.probe(old, "plan-board").map(m => m.id).filter(id => ids.includes(id));
    c.push(["a template without them is told which it lacks", js(lost) === js(ids), js(lost)]);
    const fBuilt = F.FEATURES.find(f => f.id === "as-built-marks");
    c.push(["the As built marks are one feature, dated dashboards-skill/57, for the issue and tracking boards", !!fBuilt && fBuilt.since === 57 && js(fBuilt.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => typeof (fBuilt.notFor || {})[k] === "string"), js(fBuilt && fBuilt.types)]);
    c.push(["…found on the template, named when one mark is lost", !F.probe(PB, "plan-board").some(m => m.id === "as-built-marks") && F.probe(PB.replace('${landingChips(r)}${stmtsOf(b).length?buildingLead(r,st,"blead")', '${stmtsOf(b).length?buildingLead(r,st,"blead")'), "plan-board").some(m => m.id === "as-built-marks"), "probe"]);
    c.push(["the other templates are not held to them", [[WB, "work-board"], [SYS, "system"], [SUP, "supersystem"]].every(([h, k]) => !F.applicable(k).some(f => ids.includes(f.id))), "work-board, system, supersystem"]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length; console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
