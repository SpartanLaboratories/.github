// The cases of the element names checked (GUIDANCE.md §12, "The names, checked"; the user's decision of 2026-11-09, reading A; system/scripts/termrefs.js): the glossary,
// ~/.claude/nomenclature/ui.md and boards.md, is the only home of the names, and the scan parses them from it. Run by verify-templates.js (it passes its helpers in), or on its own
// with no browser: node verify/cases-termrefs.js.
// 1. The real glossary parses: its terms, the compound names, the class list, and every ruled-out word quoted as retired in the file that rules it out.
// 2. The parser keys on the rows: a rule line ({"name":…}) under a heading, a table row inside a fence, a bad line (named), a missing paragraph (named).
// 3. The scan: a banned word, the everyday lower-case word left alone, the allowed longer name, code, a capitalised name in neither list, a listed one, a sentence's first word.
// 4. The classes: a subject without its type word, a class beside its type word, a retired word, a template's class list read from the markup and the selectors.
// 5. A term line's "case": case-sensitive by default, "case":"any" in any case (lower case, plural), its "allow" still exempting, a bad value named.
// 6. check.js and check-board.js warn and fail nothing for it; a quoted title, a signature and a key are left out.
// 7. glossaryDir() reads the folder beside the skill, <root>/nomenclature for <root>/skills/dashboards, before ~/.claude/nomenclature; a folder under skills/ is not it.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");

module.exports = function casesTermrefs(X) {
  const { sk } = X, js = x => JSON.stringify(x), rd = f => fs.readFileSync(f, "utf8"), groups = [];
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const T = require(sk("system/scripts/termrefs.js")), G = T.loadGlossary();

  guard("the glossary parses: its terms, the compound names, the class list and the ruled-out words", c => {
    c.push(["ui.md and boards.md are found and parse with no problem", !!G && !G.problems.length, js(G && G.problems)]);
    if (!G) return;
    const want = ["Box", "Panel", "Tab", "Disclosure", "Card", "Tile", "Row", "Pill", "Chip", "ShareBar", "StepBar", "FullPulse", "Legend", "Switch", "Button", "system board", "tracking board", "org work board", "State boards"];
    const miss = want.filter(t => !G.terms.has(t));
    c.push(["every row's bold first Cell is a term", !miss.length, js(miss)]);
    c.push(["Disclosure is in ui.md's section 2, so it is a type word; Box, of section 1, is not", G.typeWords.includes("Disclosure") && !G.typeWords.includes("Box") && G.terms.get("Disclosure").files.includes("ui.md"), js(G.typeWords)]);
    const dir = G.dir, ui = rd(path.join(dir, "ui.md")), boards = rd(path.join(dir, "boards.md")), lines = [["ui.md", T.readFile(ui, "ui.md")], ["boards.md", T.readFile(boards, "boards.md")]];
    const orphans = lines.flatMap(([n, f]) => f.lines.filter(l => !f.rows.some(r => r.term === l.term) && !new RegExp(`\\*\\*${l.term}\\*\\*`).test(n === "ui.md" ? ui : boards)).map(l => `${n}: ${l.term}`));
    c.push(["every term line names a row of its file, or a term the file bolds", !orphans.length, js(orphans)]);
    const seeds = lines.flatMap(([n, f]) => f.lines.flatMap(l => l.not.map(w => ({ n, w, text: n === "ui.md" ? ui : boards }))));
    const unsourced = seeds.filter(s => !new RegExp(`"${s.w}" is retired`).test(s.text)).map(s => `${s.n}: ${s.w}`);
    c.push(["every ruled-out word is one its own file says is retired: none invented", seeds.length > 0 && !unsourced.length, js(unsourced)]);
    c.push(["the seeds read: Card not Bubble, FillPulse not Glow, board not Page (GitHub Pages allowed)", js(G.terms.get("Card").not) === '["Bubble"]' && G.terms.get("Card").case === null && js(G.terms.get("FillPulse").not) === '["Glow"]' && G.terms.get("FillPulse").case === null && js(G.terms.get("board").not) === '["Page"]' && js(G.terms.get("board").allow) === '["GitHub Pages"]' && G.terms.get("board").case === null, js([...G.terms.values()].filter(t => t.not.length))]);
    const names = ["WIP Panel", "Now Chip", "KPI Tile", "Guarantees Panel", "Context Panel", "Timeline Tile", "Quality Reviews Tile", "Verdict Cell", "As built Cell", "Hide Button"], gone = names.filter(n => !G.names.has(n));
    c.push(["the capitalised compounds are read from the compound-names paragraph and the rows", !gone.length && !G.names.has("Panel Panel"), js([gone, [...G.names]])]);
    const sub = ["guarantee", "wip", "unit", "verdict", "kpi", "dep", "upnext"], gone2 = sub.filter(s => !G.subjects.has(s));
    c.push(["the subjects are read from the compounds and the class list", !gone2.length, js(gone2)]);
    c.push(["boards.md's class list is read, each class with its element", G.classes.some(x => x.cls === "kpi-tile" && x.subject === "kpi" && x.element === "KPI Tile") && G.classes.some(x => x.cls === "card" && x.subject === null), js(G.classes)]);
  });

  guard("the parser keys on the table rows, never on what follows a heading", c => {
    const ui = ["## 1. Basic", "", '{"name":"R-1 a rule"}', "", "| Term | What |", "|---|---|", "| **Box** | A rectangle. |", "", "## 2. Specific", "", "```", '{"name":"R-2 a rule"}', "| **Fenced** | never a term |", '{"term":"Panel","not":["Section"]}', "```", "", '{"name":"R-3 a rule, loose"}', "", "| Term | Function | Built from |", "|---|---|---|", "| **Panel** | Holds. | a Group |", "", "| Term | Function |", "|---|---|", "| **Pill** | A word. |", "| notbold | a row with no bold first Cell |"].join("\n");
    const boards = ["## B", "", "A board's compound names follow the rule: a **status Pill**, and so on (a KPI Pill).", "", "Where a template's CSS class names an element's kind: `.card`, `.status-pill` (a status Pill).", "", "| Term | Use |", "|---|---|", "| **Panel** | the Guarantees Panel |"].join("\n");
    const g = T.parseGlossary(ui, boards);
    c.push(["the rows are found wherever they stand; a rule line changes nothing", js([...g.terms.keys()].sort()) === js(["Box", "Panel", "Pill"]) && !g.problems.length, js([[...g.terms.keys()], g.problems])]);
    c.push(["a fenced term line is read, a fenced table row is not", js(g.terms.get("Panel").not) === '["Section"]' && !g.terms.has("Fenced"), js(g.terms.get("Panel"))]);
    c.push(["ui.md's section 1 is no type word", !g.typeWords.includes("Box") && g.typeWords.includes("Panel"), js(g.typeWords)]);
    c.push(["the compound-names paragraph and the class list are read wherever they stand", g.subjects.has("status") && g.names.has("Guarantees Panel") && g.classes.some(x => x.cls === "status-pill"), js([[...g.subjects.keys()], [...g.names]])]);
    const bad = T.parseGlossary("```\n{not json}\n```\n", "```\n{\"term\":\"x\",\"not\":\"Y\"}\n```\n");
    c.push(["a bad fenced line, a bad list and a missing paragraph are each named", bad.problems.some(p => /not JSON/.test(p)) && bad.problems.some(p => /not a list/.test(p)) && bad.problems.some(p => /compound-names/.test(p)) && bad.problems.some(p => /CSS class list/.test(p)), js(bad.problems)]);
  });

  guard("the scan: a banned word, a name in neither list, and what it leaves alone", c => {
    if (!G) { c.push(["the glossary is read", false, ""]); return; }
    const r = t => T.termRefs(t, G);
    const banned = t => r(t).banned.map(b => b.hit), unknown = t => r(t).unknown;
    const cases = [["the Bubble on the Card", ["Bubble"], []], ["two Bubbles", ["Bubbles"], []], ["the Page and the Glow", ["Glow", "Page"], []], ["a web page, a cream glow, Dokka pages", [], []], ["GitHub Pages site", [], []], ["`Bubble` and `Page`", [], []], ["<code>Bubble</code>", [], []], ["[x](docs/Page.md)", [], []], ["https://x.y/Page", [], []],
      ["the Status Pill and a ProgressBar", [], ["Status Pill", "ProgressBar"]], ["the Guarantees Panel, the Verdict Cell, a FullPulse and a Timeline Tile", [], []], ["The Row was fixed. A Card too.", [], []], ["the Quality Reviews Tile", [], []], ["two Foo Tiles", [], ["Foo Tile"]], ["a status Pill, an issue Chip", [], []], ["Docker Image, Command Line", [], []], ["some-identifier/Bubble", [], []], ["ALL_CAPS", [], []]];
    const wrong = cases.filter(([t, b, u]) => js(banned(t)) !== js(b) || js(unknown(t)) !== js(u)).map(([t, b, u]) => [t, banned(t), unknown(t), b, u]);
    c.push(["each text reads as it should: a banned word, a name in neither list, the everyday word, the allowed name, code and a function word left alone", !wrong.length, js(wrong)]);
    const hits = T.termRefsIn({ title: "A Bubble in the title", $comment: "a Bubble", Bubble: "a key", rows: [{ a: "the Glow" }, "the Page"] }, "", [], at => at === "title", G);
    c.push(["a skipped path, $comment and a key are left out; every other string is read, with its path", js(hits.map(h => [h.at, h.hit])) === js([["rows[0].a", "Glow"], ["rows[1]", "Page"]]), js(hits)]);
    c.push(["a board's shown text: scripts, styles, comments, code and a quoted title out; two neighbouring Labels are no compound", !/Bubble/.test(T.shownText("<style>.a{content:'Bubble'}</style><script>var a='Bubble'</script><!-- Bubble --><code>Bubble</code><a data-board=\"3\">Bubble</a><span data-issue-title>Bubble</span>")) && !unknown(T.shownText("<a>Design</a><a>Timeline</a>")).length, ""]);
  });

  guard("the classes: named without their type word", c => {
    if (!G) { c.push(["the glossary is read", false, ""]); return; }
    const cl = h => T.classRefs(h, G).map(x => `${x.cls}:${x.why}`);
    const flagged = [['<i class="kpi">', ["kpi:subject"]], ["<style>.kpi{color:red}</style>", ["kpi:subject"]], ['<i class="glow">', ["glow:retired"]], ["<style>.bubble .x{a:b}</style>", ["bubble:retired"]], ['`<i class="dep${x?" a":""}">`', ["dep:subject"]]];
    const clean = ['<i class="kpi-tile">', '<i class="chip now">', '<i class="cell verdict">', '<i class="wipcard unit">', "<style>.chip.now{a:b}</style>", '<i class="other">'];
    const wrong = [...flagged.filter(([h, w]) => js(cl(h)) !== js(w)).map(([h, w]) => [h, cl(h), w]), ...clean.filter(h => cl(h).length).map(h => [h, cl(h)])];
    c.push(["a subject and a retired word are named; a class with, or standing beside, a type word is not", !wrong.length, js(wrong)]);
    const pb = rd(sk("plan/template/dashboard.html"));
    c.push(["the current template's class list is read from its markup and its selectors", T.classesOf(pb).has("kpi-tile") && T.classesOf(pb).has("stepbar"), ""]);
  });

  guard("a term line's case: case-sensitive by default, \"case\":\"any\" in any case", c => {
    const ui = ["## 2. Specific", "", "| Term | Function |", "|---|---|", "| **Card** | A statement. |", "| **Panel** | Holds. |", "", "```jsonl",
      '{"term":"Card","not":["Bubble"],"allow":["Bubble Tea"]}', '{"term":"Panel","not":["Glow"],"allow":["Glow Stick"],"case":"any"}', "```"].join("\n");
    const boards = ["## B", "", "A board's compound names follow the rule: a **status Card**, and so on (a KPI Card).", "", "Where a template's CSS class names an element's kind: `.card`."].join("\n");
    const g = T.parseGlossary(ui, boards), hit = t => T.termRefs(t, g).banned.map(b => b.hit);
    c.push(["a line's case is read: none by default, \"any\" when it says so; no problem", g.terms.get("Card").case === null && g.terms.get("Panel").case === "any" && !g.problems.length, js([g.terms.get("Card"), g.terms.get("Panel"), g.problems])]);
    const cases = [["a Bubble, two Bubbles", ["Bubble", "Bubbles"]], ["a bubble, two bubbles, BUBBLE", []], ["a Glow, a glow, GLOW", ["Glow", "glow", "GLOW"]], ["two glows, two Glows", ["glows", "Glows"]],
      ["a glow stick, a GLOW STICK, a Glow Stick", []], ["a glow stick and a glow", ["glow"]], ["a Bubble Tea and a bubble tea", []], ["`glow` and [x](glow.md)", []], ["aglow, glowing", []]];
    const wrong = cases.filter(([t, b]) => js(hit(t)) !== js(b)).map(([t, b]) => [t, hit(t), b]);
    c.push(["case-sensitive by default; \"case\":\"any\" matches lower case, capitals and the plural; \"allow\" still exempts, in any case for that term", !wrong.length, js(wrong)]);
    const bad = T.parseGlossary(ui.replace('"case":"any"', '"case":"Any"').replace('"allow":["Bubble Tea"]', '"allow":["Bubble Tea"],"case":true'), boards);
    const named = ['"case" of Panel is not "any": "Any"', '"case" of Card is not "any": true'];
    c.push(["a bad case value is named, and the term stays case-sensitive", named.every(n => bad.problems.some(p => p.includes(n))) && bad.terms.get("Panel").case === null && !T.termRefs("a glow", bad).banned.length, js(bad.problems)]);
  });

  guard("check.js and check-board.js warn on the names and fail nothing for them", c => {
    if (!G) { c.push(["the glossary is read", false, ""]); return; }
    const sc = fs.mkdtempSync(path.join(os.tmpdir(), "termrefs-")), root = path.join(sc, "r"), dir = path.join(root, "docs", "plans", "38-handshake-empty-name");
    const node = process.execPath, run = (s, a) => cp.spawnSync(node, [sk(s), ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: Object.assign({}, process.env, { DASHBOARDS_NO_BROWSER: "1" }) });
    const ex = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json")));
    wr(path.join(dir, "plan.json"), JSON.stringify(ex, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(sk("plan/template/dashboard.html"))); run("plan/scripts/embed.js", [dir]);
    const base = run("plan/scripts/check.js", [dir, "--root", root]);
    ex.rows[0].gap.summary = "A Bubble on the board and a Status Pill."; ex.issueTitle = "Retitle the Glow";
    wr(path.join(dir, "plan.json"), JSON.stringify(ex, null, 2) + "\n"); run("plan/scripts/embed.js", [dir]);
    const k = run("plan/scripts/check.js", [dir, "--root", root]), lines = (k.stdout || "").split(/\r?\n/).filter(l => /TERM /.test(l));
    c.push(["check.js warns once per kind, on data and classes", lines.some(l => /^warn +TERM BANNED WORD: .*"Bubble \(Card\)"/.test(l)) && lines.some(l => /^warn +TERM UNKNOWN NAME: .*"Status Pill"/.test(l)) && lines.every(l => /^warn/.test(l)), js(lines)]);
    c.push(["a quoted title is left out", !lines.some(l => /Glow/.test(l)), js(lines)]);
    c.push(["a term warning changes neither the exit code nor the failures", k.status === base.status && (k.stdout.match(/^FAIL/gm) || []).length === (base.stdout.match(/^FAIL/gm) || []).length, `${base.status} → ${k.status}`]);
    const sys = wr(path.join(sc, "state", "index.html"), rd(sk("system/template/system.html")).replace("</body>", "<p>a Bubble and a Status Pill</p></body>"));
    const b = run("system/scripts/check-board.js", [sys, "--auto", "--no-browser"]), bl = (b.stdout || "").split(/\r?\n/).filter(l => /TERM /.test(l));
    c.push(["check-board.js prints them as warnings on a state board", bl.some(l => /warning: TERM BANNED WORD: .*"Bubble \(Card\)"/.test(l)) && bl.some(l => /warning: TERM UNKNOWN NAME: .*"Status Pill"/.test(l)), js(bl)]);
    const bare = wr(path.join(sc, "state2", "index.html"), rd(sk("system/template/system.html")));
    const b0 = run("system/scripts/check-board.js", [bare, "--auto", "--no-browser"]);
    c.push(["…and its verdict is the same with them", b.status === b0.status, `${b0.status} → ${b.status}`]);
    fs.rmSync(sc, { recursive: true, force: true });
  });

  guard("glossaryDir(): the folder beside the skill, <root>/nomenclature for <root>/skills/dashboards, is read before ~/.claude/nomenclature", c => {
    /* a copy of termrefs.js laid as in ~/.claude and the mirror's claude/: <root>/skills/dashboards/system/scripts, its glossary <root>/nomenclature */
    const sc = fs.mkdtempSync(path.join(os.tmpdir(), "termrefs-dir-")), at = (...p) => path.join(sc, ...p);
    const lay = root => { ["termrefs.js", "levelrefs.js"].forEach(f => wr(path.join(root, "skills", "dashboards", "system", "scripts", f), rd(sk("system/scripts/" + f)))); return require(path.join(root, "skills", "dashboards", "system", "scripts", "termrefs.js")); };
    const glossary = dir => ["ui.md", "boards.md"].forEach(f => wr(path.join(dir, f), "| **Card** | x |\n"));
    const A = lay(at("a")); glossary(at("a", "nomenclature"));
    c.push(["the glossary beside the skill is found", A.glossaryDir() === at("a", "nomenclature"), js(A.glossaryDir())]);
    c.push(["…and a folder given wins over it", A.glossaryDir(at("a", "nomenclature")) === at("a", "nomenclature") && (() => { glossary(at("given")); return A.glossaryDir(at("given")) === at("given"); })(), js(A.glossaryDir(at("given")))]);
    const B = lay(at("b")); glossary(at("b", "skills", "nomenclature"));
    c.push(["a glossary under skills/, beside the skill's own folder, is not read", B.glossaryDir() !== at("b", "skills", "nomenclature"), js(B.glossaryDir())]);
    fs.rmSync(sc, { recursive: true, force: true });
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  let fails = 0;
  module.exports({ sk, out: os.tmpdir(), targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length;
    console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
