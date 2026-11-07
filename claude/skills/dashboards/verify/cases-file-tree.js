// The cases of a step's files nested by their folders (admin-team/dashboards/step-file-tree, dated 43), run by verify-templates.js (it passes
// its helpers in), or on its own with no browser: node verify/cases-file-tree.js [--out <dir>].
// 1. The nesting (plan/RULES.md §2, "A step's files"), the template's own helpers run outside a browser: the module a heading (the folders
//    before src/<set>/, else the top folder), its source set a level under it with src/ left out, the rest of the folder path one line
//    holding its files; a file outside any module or source set at the level it belongs to; files in the list's order inside a folder,
//    folders in the order of their first file, a folder with one file on its own line, a path listed twice drawn once, a folder listed whole
//    an entry of its parent.
// 2. The drawing: every folder line a toggle (details, open at load) whose summary carries its full path in its title and, shown only while
//    closed, its file count ("· 1 file", "· 3 files"); each file a code label with its full path in its title; a folder line breaking after
//    a "/", a file name between the words of its camel case; everything escaped; an empty list drawing nothing.
// 3. The sites and the look: the Verdict inspector's Steps and the As built inspector's Files draw fileTree(), the one-path-per-line list is
//    gone, the CSS (a guide line per level, the toggles' marks, the count shown while closed, the file a code label), and inspect() keeping
//    closed the folders a reader closed when a redraw shows the same content.
// 4. The feature probe (file-tree): found on the issue-board template, missed on a template without it, for issue and tracking boards
//    only (each other type's reason stated); check.js --auto passes a board in flight embedded from the template and fails one embedded from a
//    template without it (FEATURE MISSING), and only reports it on a landed board.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesFileTree(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const sc = path.join(out, "file-tree"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env: { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") } });
  const F = require(sk("system/scripts/features.js"));
  const PB = rd(tp("plan/template/dashboard.html"));
  const CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js");
  const EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json"))), LIVE = JSON.parse(rd(sk("verify/fixtures/live-issue.plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const def = (h, name) => { const m = new RegExp(`^const ${name}=.*$`, "m").exec(h); return m ? m[0] : null; };
  const helpers = (h, names) => { const ctx = {}; vm.createContext(ctx); names.forEach(n => { const d = def(h, n); if (!d) throw new Error(`no const ${n}= in the template`); vm.runInContext(d.replace(/^const /, "var "), ctx); }); return ctx; };
  const H = helpers(PB, ["esc", "ftParts", "ftTree", "ftCount", "ftBrk", "ftWord", "ftHtml", "fileTree"]);
  /* the tree as lines: "[mod] webtools-feeds", "  [set] commonMain", "    [dir] kotlin/…", "      Log.kt" */
  const lines = (n, k = 0) => n.kids.flatMap(c => [`${"  ".repeat(k)}${c.k === "file" ? c.name : `[${c.k}] ${c.name}`}`, ...(c.k === "file" ? [] : lines(c, k + 1))]);
  const CM = "webtools-feeds/src/commonMain/kotlin/com/spartanlabs/webtools/feeds/", JM = "webtools-feeds/src/jvmMain/kotlin/com/spartanlabs/webtools/feeds/";
  const JR = "webtools-feeds/src/jvmTest/resources/feeds/";

  guard("a step's files nested by their folders: the module, its source set, the folder path as one line (plan/RULES.md §2, \"A step's files\")", c => {
    const t1 = lines(H.ftTree([CM + "Log.kt", JM + "Log.jvm.kt", CM + "UrlOrigin.kt"]));
    c.push(["the module a heading, each source set under it (src/ left out), the package path one line; files keep the list's order inside a folder, folders the order of their first file",
      js(t1) === js(["[mod] webtools-feeds", "  [set] commonMain", "    [dir] kotlin/com/spartanlabs/webtools/feeds", "      Log.kt", "      UrlOrigin.kt", "  [set] jvmMain", "    [dir] kotlin/com/spartanlabs/webtools/feeds", "      Log.jvm.kt"]), js(t1)]);
    const t2 = lines(H.ftTree([".gitattributes", CM + "ResultExtensions.kt", JR + "rss090.rdf", JR + "rss20.xml", "webtools-feeds/api/webtools-feeds.api", "webtools-feeds/build.gradle.kts"]));
    c.push(["a file outside any module or source set sits at the level it belongs to: the top, the module's own folder, the module itself; a folder with one file keeps its own line",
      js(t2) === js([".gitattributes", "[mod] webtools-feeds", "  [set] commonMain", "    [dir] kotlin/com/spartanlabs/webtools/feeds", "      ResultExtensions.kt", "  [set] jvmTest", "    [dir] resources/feeds", "      rss090.rdf", "      rss20.xml", "  [dir] api", "    webtools-feeds.api", "  build.gradle.kts"]), js(t2)]);
    const t3 = lines(H.ftTree(["src/main/kotlin/a/B.kt", "build-logic/convention/src/test/kotlin/C.kt", "build-logic/src/main/kotlin/D.kt", "main/HandshakeCoordinator.kt"]));
    c.push(["a source set with no module above it stands at the top; a module nested in a folder is every folder before src/<set>/; a list with no src/ keeps its top folder as the heading",
      js(t3) === js(["[set] main", "  [dir] kotlin/a", "    B.kt", "[mod] build-logic/convention", "  [set] test", "    [dir] kotlin", "      C.kt", "[mod] build-logic", "  [set] main", "    [dir] kotlin", "      D.kt", "[mod] main", "  HandshakeCoordinator.kt"]), js(t3)]);
    const t4 = lines(H.ftTree(["build-logic/", "build-logic/src/test/kotlin/", "./docs/x.md", "docs\\y.md", "docs/x.md", "", null, "  docs/z.md  "]));
    c.push(["a folder listed whole (a trailing \"/\") is an entry of its parent; a path listed twice (\"./\", a backslash, spaces aside) is drawn once; an empty entry is skipped",
      js(t4) === js(["build-logic/", "[mod] build-logic", "  [set] test", "    kotlin/", "[mod] docs", "  x.md", "  y.md", "  z.md"]), js(t4)]);
    const n = H.ftTree([CM + "Log.kt", JM + "Log.jvm.kt", CM + "UrlOrigin.kt"]).kids[0];
    c.push(["each folder line keeps its full path; the count is every file under it", n.path === "webtools-feeds/" && n.kids[0].path === "webtools-feeds/src/commonMain/" && n.kids[0].kids[0].path === CM && H.ftCount(n) === 3 && H.ftCount(n.kids[1]) === 1, js([n.path, n.kids[0].path, n.kids[0].kids[0].path, H.ftCount(n)])]);
  });

  guard("the drawing: every folder line a toggle, open at load, its file count while closed; each file a code label; every line its full path in its title", c => {
    const h = H.fileTree([CM + "Log.kt", CM + "UrlOrigin.kt", JM + "Log.jvm.kt"]);
    c.push(["one .ftree, a list per level", /^<span class="ftree"><ul class="ft-l">/.test(h) && (h.match(/<ul class="ft-l">/g) || []).length === 6, h.slice(0, 120)]);
    const det = [...h.matchAll(/<details class="ftd ft-(mod|set|dir)" open><summary title="([^"]*)">/g)].map(m => [m[1], m[2]]);
    c.push(["every folder line a details element, open at load, its summary titled with its full path", js(det) === js([["mod", "webtools-feeds/"], ["set", "webtools-feeds/src/commonMain/"], ["dir", CM], ["set", "webtools-feeds/src/jvmMain/"], ["dir", JM]]), js(det)]);
    c.push(["a closed folder's count: \"· n files\", \"· 1 file\"", /webtools-feeds<span class="ft-n"> · 3 files<\/span><\/summary>/.test(h) && /jvmMain<span class="ft-n"> · 1 file<\/span>/.test(h), h.slice(0, 300)]);
    c.push(["each file a code label, its full path in its title", h.includes(`<li class="ft-file" title="${CM}Log.kt"><code>Log.kt</code></li>`) && h.includes(`<li class="ft-file" title="${JM}Log.jvm.kt"><code>Log.jvm.kt</code></li>`), h.slice(-300)]);
    c.push(["a folder line breaks after a \"/\"; a file name between the words of its camel case, never inside one", h.includes("kotlin/<wbr>com/<wbr>spartanlabs/<wbr>webtools/<wbr>feeds/") && h.includes("<code>Url<wbr>Origin.kt</code>") && H.ftWord("ResponseCache.kt") === "Response<wbr>Cache.kt" && H.ftWord("rss090.rdf") === "rss090.rdf" && H.ftWord("HTTPClient.kt") === "HTTPClient.kt", js([H.ftWord("ResponseCache.kt"), H.ftWord("HTTPClient.kt")])]);
    const e = H.fileTree(["a<b>/C&D\"x.kt"]);
    c.push(["paths escaped in the text and in the titles", e.includes('title="a&lt;b&gt;/C&amp;D&quot;x.kt"') && e.includes("<code>C&amp;D&quot;x.kt</code>") && !/<b>/.test(e), e]);
    c.push(["an empty or missing list draws nothing", H.fileTree([]) === "" && H.fileTree(undefined) === "" && H.fileTree([""]) === "", js([H.fileTree([]), H.fileTree(undefined)])]);
  });

  guard("the sites and the look: the Verdict inspector's Steps and the As built inspector's Files; the toggles kept across a redraw", c => {
    const s = PB.replace(/\/\*[\s\S]*?\*\//g, "");
    c.push(["the Verdict inspector's Steps draw the step's files as the tree", /<span>\$\{rich\(s\.what\|\|""\)\}\$\{fileTree\(s\.files\)\}\$\{s\.check\?/.test(s), "inspectCell verdict"]);
    c.push(["the As built inspector's Files the same, the heading only where a file is listed", /\$\{ftTree\(b\.files\)\.kids\.length\?`<dt>Files<\/dt><dd>\$\{fileTree\(b\.files\)\}<\/dd>`:""\}/.test(s), "inspectCell built"]);
    c.push(["the one-path-per-line list is gone (no class=\"files\", no .files rules)", !/class="files"/.test(s) && !/(^|\n)(\.steps-list )?\.files[\s{]/.test(css(PB)), "css/js"]);
    c.push(["the As built card keeps its count", /b\.files&&b\.files\.length\?`\$\{b\.files\.length\} file\$\{b\.files\.length>1\?"s":""\}`/.test(s), "bcard meta"]);
    const k = css(PB);
    const want = [/\.ftree ul\.ft-l ul\.ft-l\{margin:1px 0 0 4px;padding-left:9px;border-left:1px solid var\(--line\)\}/, /\.ftree \.ft-l>li\{display:block;/, /\.ftree summary\{display:block;list-style:none;[^}]*cursor:pointer/, /\.ftree summary::-webkit-details-marker\{display:none\}/,
      /\.ftree summary::before\{content:"\\25BE";/, /\.ftree details:not\(\[open\]\)>summary::before\{content:"\\25B8"\}/, /\.ftree \.ft-n\{display:none;/, /\.ftree details:not\(\[open\]\)>summary>\.ft-n\{display:inline\}/,
      /\.ftree \.ft-mod>summary\{font-weight:700;color:var\(--ink\)\}/, /\.ftree \.ft-set>summary\{font-weight:600;color:var\(--ink-2\)\}/, /\.ftree \.ft-file code\{font-size:11px;color:var\(--ink-2\)\}/];
    const miss = want.filter(re => !re.test(k)).map(String);
    c.push(["the CSS: a guide line per level, the toggles' marks (▾ open, ▸ closed), the count shown only while closed, the module and the source set as headings, each file a code label", !miss.length, js(miss)]);
    c.push(["no folder class carries a type word a chip, a pill or a tile selector would take (a code label stays a label inside the tree)", !/class="[^"]*(chip|pill|tile)[^"]*"/.test((s.match(/const ftHtml=.*$/m) || [""])[0]) && !/\.ftree[^{]*(chip|pill|tile)/.test(k), "ftHtml"]);
    c.push(["inspect(): a redraw that shows the same content keeps closed the folders the reader closed; new content opens them all", /function inspect\(html\)\{ const b=\$\("#insp-body"\), same=b\.__shown===html, shut=same\?\[\.\.\.b\.querySelectorAll\("details\.ftd"\)\]\.map\(d=>!d\.open\):\[\]; b\.innerHTML=html; b\.__shown=html; if\(same\) b\.querySelectorAll\("details\.ftd"\)\.forEach\(\(d,i\)=>\{ if\(shut\[i\]\) d\.open=false; \}\);/.test(s), "inspect()"]);
    /* the same rule run against a stand-in for the inspector's DOM */
    const fake = () => { const b = { __shown: undefined, _html: "", _d: [], set innerHTML(v) { this._html = v; this._d = (v.match(/<details /g) || []).map(() => ({ open: true })); }, get innerHTML() { return this._html; }, querySelectorAll() { return this._d; } }; return b; };
    const body = fake(), ctx = { $: () => body, CUR_TAB: "design", cardInspector() {}, bindInspector() {} }; vm.createContext(ctx);
    const fn = (/^function inspect\(html\)\{.*\}$/m.exec(PB) || [""])[0]; vm.runInContext(fn, ctx);
    const T = H.fileTree([CM + "Log.kt", JM + "Log.jvm.kt"]);
    ctx.inspect(T); body._d[1].open = false; ctx.inspect(T); const kept = body._d.map(d => d.open);
    ctx.inspect(T + "<p>x</p>"); const fresh = body._d.map(d => d.open);
    c.push(["…run: the closed folder stays closed on the same content, and every folder opens on new content", !!fn && js(kept) === js([true, false, true, true, true]) && fresh.every(Boolean), js([kept, fresh])]);
  });

  guard("the feature probe (file-tree) and check.js on boards made from the template", c => {
    const miss = F.probe(PB, "plan-board").filter(m => m.id === "file-tree");
    c.push(["the probe finds it on the issue-board template", !miss.length, js(miss)]);
    const old = PB.replace("${fileTree(s.files)}", "${s.files&&s.files.length?`<span class=\"files\">${s.files.map(f=>`<code>${esc(f)}</code>`).join(\"\")}</span>`:\"\"}");
    c.push(["the probe misses it on a template that lists one path per line (FEATURE MISSING)", F.probe(old, "plan-board").some(m => m.id === "file-tree") && /FEATURE MISSING: a step's files/.test(F.line(F.probe(old, "plan-board").find(m => m.id === "file-tree"))) && /dashboards-skill\/43/.test(F.line(F.probe(old, "plan-board").find(m => m.id === "file-tree"))), "probe(old)"]);
    const f = F.FEATURES.find(x => x.id === "file-tree") || {};
    c.push(["it applies to issue and tracking boards only, each other type with its reason", js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f.notFor && f.notFor[k] && F.applicable(k).every(x => x.id !== "file-tree")), js(f.notFor || null)]);
    let n = 0;
    const board = (d, tpl) => { const root = path.join(sc, `t-${++n}`), dir = path.join(root, ...d.folder.split("/")); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
      wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(0, 300)); return dir; };
    const withFiles = d => { const r = d.rows.find(x => x.verdict && Array.isArray(x.verdict.steps) && x.verdict.steps.length) || d.rows[0]; r.verdict = r.verdict || {}; r.verdict.steps = (r.verdict.steps && r.verdict.steps.length ? r.verdict.steps : [{ id: "S1", what: "a step" }]); r.verdict.steps[0].files = [CM + "Log.kt", JM + "Log.jvm.kt", ".gitattributes"]; return d; };
    const ok = run(CHECK, [board(withFiles(copy(LIVE)), PB), "--auto"]);
    c.push(["check.js --auto passes a board in flight made from the template, its steps listing files", ok.status === 0 && !/FEATURE MISSING[^\n]*step's files/.test(ok.stdout + ok.stderr), (ok.stdout + ok.stderr).slice(-400)]);
    const bad = run(CHECK, [board(withFiles(copy(LIVE)), old), "--auto"]);
    c.push(["…and fails one made from a template without it (FEATURE MISSING)", bad.status !== 0 && /FEATURE MISSING: a step's files/.test(bad.stdout + bad.stderr), (bad.stdout + bad.stderr).slice(-400)]);
    const landed = run(CHECK, [board(copy(EX), old), "--auto"]);
    c.push(["a landed board made before it is reported, never failed for it (it is kept as it landed)", !/FAIL[^\n]*FEATURE MISSING: a step's files/.test(landed.stdout + landed.stderr) && (landed.status === 0 || !/FEATURE MISSING: a step's files/.test((landed.stdout + landed.stderr).split(/\r?\n/).filter(l => /FAIL/.test(l)).join("\n"))), (landed.stdout + landed.stderr).slice(-400)]);
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
