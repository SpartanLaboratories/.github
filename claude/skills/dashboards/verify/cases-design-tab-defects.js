// The cases of the defects found in the Design-tab review (admin-team/dashboards-skill/design-tab-defects), run by verify-templates.js (it
// passes its helpers in), or on its own with no browser: node verify/cases-design-tab-defects.js [--out <dir>].
// 1. A row's name (and an option's) is drawn through codeOnly() at every site of the issue-board template — the row's title, the inspector,
//    the Decisions table's Row column, the As built card, the Tests tab's "verifies" links, the roadmap, the step panel's row lists — and
//    an aria-label or a title attribute takes nameText(), the name with its backticks dropped. The repository work board draws only issue
//    titles (pair(), already through codeOnly()) and a fixed group heading, so it holds no row name.
// 2. A heading's leading section number may be a letter before a number ("R2", "R2.1"): the reference reads "(§R2)" (lib.js HEAD_NUM and
//    the template's stmtLabel(), the one form), and embed.js reads it from the file's headings for an anchor "r2-…".
// 3. A count and its noun agree: "1 step", "1 change", "1 commit", on every template that writes a count (plural()).
// 4. A step's file list: each file its own <code>, never run on with a separator; since admin-team/dashboards/step-file-tree (dated 43) the
//    list is nested by its folders (verify/cases-file-tree.js), which replaced the one-path-per-line list that scrolled in itself.
// 5. The scripts' messages in the current vocabulary: check-board.js asks for a .legend; features.js says the work board is held to the
//    board-wording feature; namerefs.js scrubNames() writes "code check", "test check", "the review's test check", "the review approved".
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm");

module.exports = function casesDesignTabDefects(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8"), js = x => JSON.stringify(x);
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const lib = require(sk("plan/scripts/lib.js")), N = require(sk("system/scripts/namerefs.js")), F = require(sk("system/scripts/features.js"));
  const PB = rd(tp("plan/template/dashboard.html")), WB = rd(tp("plan/template/board.html"));
  const SYS = rd(tp("system/template/system.html")), SUP = rd(tp("system/template/supersystem.html"));
  const sc = path.join(out, "design-tab-defects"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  /* one top-level definition of a template's script, by its name ("const plural=…;" on one line) */
  const def = (h, name) => { const m = new RegExp(`^const ${name}=.*$`, "m").exec(h); return m ? m[0] : null; };
  /* the template's own helpers, run outside a browser */
  const helpers = (h, names) => { const ctx = {}; vm.createContext(ctx); names.forEach(n => { const d = def(h, n); if (!d) throw new Error(`no const ${n}= in the template`); vm.runInContext(d.replace(/^const /, "var "), ctx); }); return ctx; };
  /* the template's script without its comments, where the cases look for a pattern */
  const code = h => h.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  guard("a row's name through codeOnly() at every site; nameText() for an aria-label or a title (the issue-board template)", c => {
    const H = helpers(PB, ["esc", "codeOnly", "nameText", "plural"]);
    c.push(["codeOnly() draws a name's code span as <code>", H.codeOnly("`UdpTransport` closes <cleanly>") === "<code>UdpTransport</code> closes &lt;cleanly&gt;", H.codeOnly("`UdpTransport` closes <cleanly>")]);
    c.push(["nameText() drops the backticks and escapes, for a row, an option or a plain string", H.nameText({ name: "`R2` \"fix\" <x>" }) === "R2 &quot;fix&quot; &lt;x&gt;" && H.nameText("`a`b") === "ab" && H.nameText({}) === "" && H.nameText(null) === "", js([H.nameText({ name: "`R2` \"fix\" <x>" }), H.nameText("`a`b")])]);
    const s = code(PB);
    const left = (s.match(/esc\((?:r|row|u\.r)\.name\)|esc\(o\.rowName\(|unwritten\.slice\(0,6\)\.map\(esc\)|esc\(names\[id\]\|\|id\)/g) || []);
    c.push(["no row name is drawn through esc() alone (the title, the inspector, the Decisions table, the As built card, the Tests tab, the roadmap, the step panel)", !left.length, js(left)]);
    const sites = { "the row's title": /function rowTitle\(r\)\{ const u=r\.unit; if\(!u\) return codeOnly\(r\.name\);[\s\S]{0,120}pair\(u\.issue,r\.name\):codeOnly\(r\.name\)/,
      "the inspector's name": /<div class="name">\$\{codeOnly\(r\.name\)\}<\/div>/, "the Decisions table's Row column": /<td>\$\{codeOnly\(row\.name\)\}<\/td>/,
      "the As built card's title": /`\$\{esc\(r\.unit\.n\)\} · `:""\}\$\{codeOnly\(r\.name\)\}<\/span>/, "the Tests tab's verifies links": /data-go-row="\$\{esc\(id\)\}">\$\{codeOnly\(r\.name\)\}<\/a>/,
      "the Tests tab's links to a unit's rows": /\.built">\$\{codeOnly\(names\[id\]\|\|id\)\}<\/a>`:codeOnly\(names\[id\]\|\|id\)/, "the roadmap": /pair\(r\.unit\.issue,r\.name\):codeOnly\(r\.name\)\} · \$\{badge/,
      "the step panel's rows": /map\(id=>codeOnly\(o\.rowName\(id\)\)\)/, "the verdicts still to write": /o\.unwritten\.slice\(0,6\)\.map\(codeOnly\)/ };
    const miss = Object.entries(sites).filter(([, re]) => !re.test(s)).map(([k]) => k);
    c.push(["each site draws the name through codeOnly()", !miss.length, js(miss)]);
    const aria = (s.match(/aria-label="[^"]*\$\{esc\((?:r|o)\.name\)\}/g) || []).concat(s.match(/title="\$\{esc\(s\.excerpt/g) || []);
    const named = (s.match(/aria-label="[^"]*\$\{nameText\((?:r|o)\)\}/g) || []).length;
    c.push(["every aria-label naming a row or an option, and a reference's title, takes nameText() (backticks dropped)", !aria.length && named >= 8 && /title="\$\{nameText\(s\.excerpt/.test(s), js({ left: aria, named })]);
    const wb = code(WB), titles = (wb.match(/esc\([a-zA-Z]+\.title\)/g) || []);
    c.push(["the repository work board holds no row name: its issue titles go through pair() (codeOnly()), its one esc(g.title) a fixed group heading", js(titles) === js(["esc(g.title)"]) && /title: "Other runs, oldest first"/.test(rd(sk("plan/scripts/board.js"))) && /const pair=\(n,title,repo\)=>\{ const b=boardOf\(n,repo\), t=codeOnly\(title\)/.test(wb), js(titles)]);
  });

  guard("a letter-prefixed section number reads \"(§R2)\" (lib.js HEAD_NUM, the template's stmtLabel())", c => {
    const want = [["R2 Remediation stage", "§R2"], ["R2. Remediation", "§R2"], ["R2.1 The second fix", "§R2.1"], ["A1 Appendix", "§A1"], ["4.2 The fix", "§4.2"], ["A-3 Option", "§A-3"], ["T-1 Test", "§T-1"],
      ["B2B sales", "§ B2B sales"], ["Rollout", "§ Rollout"], ["R2D2 notes", "§ R2D2 notes"]];
    const bad = want.filter(([h, w]) => lib.refLabel({ ref: "plan.md#x", excerpt: { heading: h } }) !== w);
    c.push(["refLabel(): the heading's leading number, a letter before a number included; a word that only starts with one is no number", !bad.length, js(bad.map(([h, w]) => [h, lib.refLabel({ ref: "plan.md#x", excerpt: { heading: h } }), w]))]);
    const H = helpers(PB, ["esc"]);
    const fn = /function stmtLabel\(s\)\{[\s\S]*?\n  const a=String\(\(s&&s\.ref\)\|\|""\)\.split\("#"\)\[1\]; return a\?"§ "\+a:"§"; \}/.exec(PB);
    if (!fn) throw new Error("no stmtLabel() in the template");
    vm.runInContext(fn[0], vm.createContext(H));
    const tbad = want.filter(([h, w]) => H.stmtLabel({ ref: "plan.md#x", excerpt: { heading: h } }) !== w);
    c.push(["the template's stmtLabel() reads the same", !tbad.length, js(tbad.map(([h, w]) => [h, H.stmtLabel({ ref: "plan.md#x", excerpt: { heading: h } }), w]))]);
    const dir = path.join(sc, "docs", "plans", "9-x"); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.md"), "# Plan\n\n## R2 Remediation stage\n\nThe second stage.\n\n## 4.2 The fix\n\nThe fix.\n");
    const r2 = lib.refNumberOf(dir, "plan.md#r2-remediation-stage"), n42 = lib.refNumberOf(dir, "plan.md#42-the-fix");
    c.push(["refNumberOf(): an anchor \"r2-…\" read from the file's headings as §R2, a numbered one as before", !!r2 && r2.label === "§R2" && r2.from === "headings" && !!n42 && n42.label === "§4.2", js([r2, n42])]);
  });

  guard("a count and its noun agree (\"1 step\", \"1 change\", \"1 commit\"), on every template that writes a count", c => {
    [["plan/template/dashboard.html", PB], ["plan/template/board.html", WB], ["system/template/system.html", SYS], ["system/template/supersystem.html", SUP]].forEach(([n, h]) => {
      const H = helpers(h, ["plural"]);
      c.push([`${n}: plural()`, H.plural(1, "step") === "1 step" && H.plural(2, "step") === "2 steps" && H.plural(0, "commit") === "0 commits" && H.plural("1", "unit") === "1 unit" && H.plural(3, "class", "classes") === "3 classes", H.plural(1, "step")]);
      const s = code(h), left = (s.match(/\$\{[^{}`]*(?:length|\bqmax|\bM|\bm|\bchanges|\.tests|total)\}\s(?:steps|tests|risks|changes|commits|stages|units|parts|events|slots|elements|relationships|views|styles)\b/g) || []);
      c.push([`${n}: no count written with a fixed plural noun`, !left.length, js(left)]);
    });
    c.push(["the Verdict cell's and the As built cell's counts through plural()", /\$\{plural\(\(v\.steps\|\|\[\]\)\.length,"step"\)\} · \$\{plural\(\(v\.tests\|\|\[\]\)\.length,"test"\)\} · \$\{plural\(\(v\.risks\|\|\[\]\)\.length,"risk"\)\}/.test(PB) && /\$\{plural\(\(b\.changes\|\|\[\]\)\.length,"change"\)\} · \$\{plural\(\(b\.commits\|\|\[\]\)\.length,"commit"\)\}/.test(PB), "dashboard.html"]);
    c.push(["apply-event.js: a remediation's sub-steps counted as \"1 of 1 sub-step done\"", /`\$\{dn\.length\} of \$\{plural\(ss\.length, "sub-step"\)\} done`/.test(rd(sk("plan/scripts/apply-event.js"))), "apply-event.js"]);
  });

  guard("a step's file list: each file its own <code>, never run on with a separator (nested by its folders since step-file-tree)", c => {
    c.push(["the Verdict inspector's steps and the As built inspector's Files draw the nested list, no path joined to the next", /\$\{fileTree\(s\.files\)\}/.test(PB) && /<dt>Files<\/dt><dd>\$\{fileTree\(b\.files\)\}<\/dd>/.test(PB) && !/s\.files\.map\(esc\)\.join/.test(PB) && !/b\.files\.map\(esc\)\.join/.test(PB), "the two inspectors"]);
    c.push(["each file its own <code> (the nested list's file lines)", /<li class="ft-file" title="\$\{esc\(k\.path\)\}"><code>\$\{ftWord\(k\.name\)\}<\/code><\/li>/.test(PB), "ftHtml()"]);
    c.push(["a long path never widens the board: a folder line breaks after a \"/\", a file name between its words", /\.steps-list li>span\{min-width:0\}/.test(PB) && /\.ftree summary\{[^}]*overflow-wrap:anywhere\}/.test(PB) && /\.ftree \.ft-file\{overflow-wrap:anywhere\}/.test(PB), "CSS"]);
  });

  guard("the scripts' messages in the current vocabulary (check-board.js, features.js, namerefs.js)", c => {
    const cb = rd(sk("system/scripts/check-board.js"));
    c.push(["check-board.js asks every tab for a visible .legend", /NO LEGEND \(every tab needs a visible \.legend\)/.test(cb) && !/needs a visible \.key\b/.test(cb), "check-board.js"]);
    const f = F.FEATURES.find(x => x.id === "quality-review"), wbWhy = f && f.notFor && f.notFor["work-board"] || "";
    c.push(["features.js: the work board's reason no longer calls its passes ordinals, and names the feature that holds it", !!wbWhy && !/ordinal/i.test(wbWhy) && /board-wording/.test(wbWhy) && F.FEATURES.some(x => x.id === "board-wording" && x.types.includes("work-board")), wbWhy]);
    const want = [["Relevant is what qa's test-inspector ran", "Relevant is what the review's test check ran"], ["the test-inspector report", "the test check report"], ["a code-reviewer pass", "a code check pass"],
      ["the documentation-reviewer pass", "the documentation review pass"], ["qa approved it", "the review approved it"], ["qa has approved", "the review has approved"], ["code-reviewer: no findings", "no findings"]];
    const bad = want.filter(([s, w]) => { const r = N.scrubNames(s); return r.text !== w || r.left.length; });
    c.push(["scrubNames(): \"code check\", \"test check\", \"the review's test check\", \"the review approved\", each naming nothing left", !bad.length, js(bad.map(([s, w]) => [s, N.scrubNames(s), w]))]);
    const PN = require(sk("plan/scripts/passnames.js"));
    c.push(["…in the progress notes' own words (passnames.js NOTE_WORK) and with no older pass wording for the renaming to catch", /"test-inspector": "test check"/.test(rd(sk("plan/scripts/passnames.js"))) && /"code-reviewer": "code check"/.test(rd(sk("plan/scripts/passnames.js"))) && want.every(([s]) => { const t = N.scrubNames(s).text; return PN.renamePassText(t) === t; }), "passnames.js"]);
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
