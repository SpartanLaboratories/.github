// The cases of the C4 DSL reader's keyword identifiers (admin-team/dashboards/dsl-keyword-id, a defect, dated 47; GUIDANCE.md §8, §9),
// run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-dsl-keyword-id.js [--out <dir>].
// The defect: an element whose identifier is a keyword that opens a block of the DSL ("model = component …", "views = component …") was
// read as that block. The element was dropped (and, with a brace, the stack swallowed what followed), and the C4 tab crashed on the first
// relationship or view that named it, while every check passed. The fix:
// 1. Each board's reader (the system and supersystem templates' parseDsl(), the worked example's) reads a block keyword followed by "=" as
//    the element it assigns, the stack intact, so what follows reads as before.
// 2. statelib.js dslElements(), which apply-state.js and check-board.js read the DSL by, reads the same elements as the boards' reader.
// 3. statelib.js dslProblems() names an element by a block keyword (DSL KEYWORD ID) and a relationship, view scope or dynamic step that names
//    an element the model does not define (DSL UNKNOWN ELEMENT), and nothing on the templates' own DSL or the worked example's.
// 4. check-board.js --auto --no-browser fails a state board whose embedded DSL does either, without a browser, and passes the template's.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");

module.exports = function casesDslKeywordId(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x);
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const L = require(sk("system/scripts/statelib.js"));
  const BOARDS = [["the system board template", tp("system/template/system.html")], ["the supersystem and repository state board template", tp("system/template/supersystem.html")], ["the worked example", sk("system/examples/webtools-udp/index.html")]];
  const sc = path.join(out, "dsl-keyword-id"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  /* a board's parseDsl(), lifted out of its script as it stands */
  const reader = html => { const a = html.indexOf("function parseDsl(src){"); if (a < 0) return null; let d = 0, i = html.indexOf("{", a);
    for (; i < html.length; i++) { if (html[i] === "{") d++; else if (html[i] === "}" && !--d) break; }
    return new Function(html.slice(a, i + 1) + "\nreturn parseDsl;")(); };
  /* a model with two keyword identifiers, one opening a block of its own, then an element, relationships and views after them */
  const KW = [
    'workspace "Keywords" "Element identifiers that are block keywords." {',
    "  !identifiers hierarchical",
    "  model {",
    '    user = person "User" "Uses the app."',
    '    sys = softwareSystem "Sys" "The system." {',
    '      app = container "App" "The app." "Kotlin" {',
    '        model = component "Model" "Holds the state." "Kotlin"',
    '        views = component "Views" "Draws the state." "Kotlin" "Internal" {',
    '          description "Its own block."',
    "        }",
    '        styles = component "Styles" "Picks the colours." "Kotlin"',
    "      }",
    "    }",
    '    user -> sys.app.views "looks at"',
    '    sys.app.views -> sys.app.model "reads"',
    '    sys.app.views -> sys.app.styles "asks"',
    "  }",
    "  views {",
    '    component sys.app "app" "The app\'s components." {',
    "      include *",
    "    }",
    '    dynamic sys.app "draw" "One draw." {',
    '      sys.app.views -> sys.app.model "reads"',
    "    }",
    "  }",
    "}"].join("\n");
  const WANT = ["user", "sys", "sys.app", "sys.app.model", "sys.app.views", "sys.app.styles"];
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  guard("the C4 DSL reader: a block keyword as an element's identifier", c => {
    BOARDS.forEach(([what, f]) => {
      const p = reader(rd(f)); if (!p) { c.push([`${what}: its parseDsl() is found`, false, f]); return; }
      const M = p(KW);
      c.push([`${what}: "model", "views" and "styles" are read as the elements they assign, the stack intact`, js(M.order) === js(WANT), js(M.order)]);
      c.push([`${what}: the relationships after them are read, each end an element`, M.rels.length === 3 && M.rels.every(r => M.elements[r.from] && M.elements[r.to]), js(M.rels.map(r => r.from + ">" + r.to))]);
      c.push([`${what}: the views after them are read, a dynamic view's step included`, js(M.views.map(v => v.type + ":" + v.scope + ":" + v.steps.length)) === js(["component:sys.app:0", "dynamic:sys.app:1"]), js(M.views)]);
      c.push([`${what}: the tags of a keyword-named element are read`, js((M.elements["sys.app.views"] || {}).tags) === js(["Element", "Component", "Internal"]), js((M.elements["sys.app.views"] || {}).tags)]);
    });
    const S = L.dslElements(KW);
    c.push(["statelib.js dslElements() reads the elements the boards' reader reads", js(S.map(e => e.id)) === js(WANT), js(S.map(e => e.id))]);
    c.push(["statelib.js setPlannedTag() finds a keyword-named element", /views = component "Views" "Draws the state." "Kotlin" "Internal,Planned"/.test(L.setPlannedTag(KW, "sys.app.views", true) || ""), "sys.app.views"]);
  });

  guard("statelib.js dslProblems(): keyword identifiers and unknown elements", c => {
    const P = L.dslProblems(KW), kw = P.filter(p => p.code === "DSL KEYWORD ID");
    c.push(["each element named by a block keyword is named, with its line", js(kw.map(p => p.line)) === js([7, 8, 11]) && kw.every(p => /rename the identifier/.test(p.text)), js(kw)]);
    c.push(["a model whose references all resolve names no unknown element", !P.some(p => p.code === "DSL UNKNOWN ELEMENT"), js(P)]);
    const typo = KW.replace('sys.app.views -> sys.app.styles "asks"', 'sys.app.views -> sys.app.stlyes "asks"').replace('component sys.app "app"', 'component sys.ap "app"').replace('      sys.app.views -> sys.app.model "reads"\n    }', '      sys.app.view -> sys.app.model "reads"\n    }');
    const U = L.dslProblems(typo).filter(p => p.code === "DSL UNKNOWN ELEMENT");
    c.push(["a relationship, a view's scope and a dynamic step that name an undefined element are each named", typo !== KW && js(U.map(p => p.line)) === js([16, 19, 23]) && /a relationship names sys\.app\.stlyes/.test(U[0].text) && /the component view's scope names sys\.ap\b/.test(U[1].text) && /a dynamic view's step names sys\.app\.view\b/.test(U[2].text), js(U)]);
    c.push(["a dynamic view scoped * names nothing", !L.dslProblems(KW.replace('dynamic sys.app "draw"', 'dynamic * "draw"')).some(p => p.code === "DSL UNKNOWN ELEMENT"), "dynamic *"]);
    BOARDS.forEach(([what, f]) => { const d = L.blockText(rd(f), "dsl"), q = d == null ? null : L.dslProblems(d);
      c.push([`${what}'s own DSL reads cleanly`, Array.isArray(q) && !q.length, js(q)]); });
  });

  guard("check-board.js fails a DSL its C4 views would trip on, without a browser", c => {
    const checker = sk("system/scripts/check-board.js"), tpl = rd(tp("system/template/system.html"));
    const board = (name, dsl) => wr(path.join(sc, name, "index.html"), L.embedInto(tpl, "dsl", dsl));
    const r0 = run(checker, [board("clean", L.blockText(tpl, "dsl")), "--auto", "--no-browser"]);
    c.push(["the template's own DSL passes, said in a note", !/DSL (KEYWORD ID|UNKNOWN ELEMENT)/.test(r0.stdout) && /CHECK dsl: \d+ elements, every reference defined/.test(r0.stdout), (r0.stdout || "").split(/\r?\n/).filter(l => /dsl|DSL/.test(l)).join(" | ") || r0.stderr]);
    const r1 = run(checker, [board("keyword", KW), "--auto", "--no-browser"]);
    c.push(["a keyword identifier fails it (DSL KEYWORD ID)", r1.status === 1 && /CHECK DSL KEYWORD ID: workspace\.dsl line 7 names the element sys\.app\.model by "model"/.test(r1.stdout), (r1.stdout || "").split(/\r?\n/).filter(l => /DSL/.test(l)).join(" | ") || r1.stderr]);
    const r2 = run(checker, [board("unknown", L.blockText(tpl, "dsl").replace(/^(\s*)(\S+)( -> )/m, "$1$2.missing$3")), "--auto", "--no-browser"]);
    c.push(["a relationship naming an undefined element fails it (DSL UNKNOWN ELEMENT)", r2.status === 1 && /CHECK DSL UNKNOWN ELEMENT: workspace\.dsl line \d+: a relationship names \S+\.missing/.test(r2.stdout), (r2.stdout || "").split(/\r?\n/).filter(l => /DSL/.test(l)).join(" | ") || r2.stderr]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length;
    console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
