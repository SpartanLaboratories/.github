// The cases of the StepBar (dashboards-skill/54: the user's decisions of 2026-11-06 and 2026-11-07; nomenclature/ui.md, StepBar;
// nomenclature/boards.md, "Board UI"), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-stepbar.js [--out <dir>].
// A StepBar is the steps of a sequence in order, each a chevron with its name inside, done, current or to come. It draws:
//   - the progress strip of an issue board and the WIP strip of a tracking board (its own steps and each unit's run), the step names inside,
//     the current step carrying the in-progress marks where it did before (the FullPulse; the Ring alone while the run waits on you);
//   - a tracking issue's chain on the state boards' roadmap (system, supersystem and repository state boards) and on the repository work
//     board's rows, one chevron per unit with the unit's name inside, on a line of its own; no mark (the state boards draw no work in
//     progress; on the repository work board the unit at work carries its FullPulse on its own row).
// Every StepBar is an ordered list, the current step aria-current="step", each state said in words to a screen reader; it works in light
// and dark (tokens only), and wraps inside itself at 390 px, never widening the board.
// 1. The StepBar's look: one CSS block, the same in the four templates; the issue board's marks and finished-step buttons.
// 2. The progress strip, against a stand-in: stepsLine() draws the StepBar, its states, its marks, its finished steps' buttons.
// 3. The repository work board: board.js writes chain.units; the template draws them on a row of their own, or a board.json written
//    before them from its unit rows.
// 4. The state boards' roadmap: the chain written with its units' names drawn as a StepBar under the roadmap item, numbered where a chain
//    was written before the names; its legend.
// 5. The feature probe (stepbar): found on the four templates, missed on a board drawn before (since dashboards-skill/54).
// 6. The fixture boards for a browser check, kept under <out>/stepbar/fixtures/. Its rendered cases need --browser.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesStepBar(X) {
  const { sk, out, targets } = X, dumpDom = X.dumpDom || (() => null);
  const NEEDS_BROWSER = X.NEEDS_BROWSER || "needs a browser: not run (verify-templates.js --browser runs it)";
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const F = require(sk("system/scripts/features.js"));
  const T = { "plan-board": rd(tp("plan/template/dashboard.html")), "work-board": rd(tp("plan/template/board.html")), system: rd(tp("system/template/system.html")), supersystem: rd(tp("system/template/supersystem.html")) };
  const NAME = { "plan-board": "the issue and tracking board template", "work-board": "the repository work board template", system: "the system board template", supersystem: "the supersystem and repository state board template" };
  const sc = path.join(out, "stepbar"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const withData = X.withData || ((html, id, json) => { const m = new RegExp(`<script type="application/json" id="${id}">[\\s\\S]*?</script>`).exec(html); return m ? html.replace(m[0], () => `<script type="application/json" id="${id}">${String(json).replace(/<\//g, "<\\/")}</script>`) : html; });
  const between = (h, a, b) => { const i = h.indexOf(a); if (i < 0) return null; const j = h.indexOf(b, i); return j < 0 ? null : h.slice(i, j + b.length); };
  const lis = h => [...String(h).matchAll(/<li class="([^"]*)"([^>]*)>([\s\S]*?)<\/li>/g)].map(m => ({ cls: m[1], attrs: m[2], body: m[3] }));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  /* ---------- 1. the look ---------- */
  const BASE_A = "/* The StepBar (nomenclature/ui.md, StepBar; dashboards-skill/54)", BASE_B = ".legend i.sbk.todo{--sb-edge:repeating-linear-gradient(90deg,var(--muted) 0 3px,transparent 3px 5px);--sb-fill:var(--surface)}\n";
  guard("the StepBar's look: one CSS block in the four templates, and the issue board's marks", c => {
    const blocks = Object.fromEntries(Object.entries(T).map(([k, h]) => [k, between(css(h), BASE_A, BASE_B)]));
    Object.entries(blocks).forEach(([k, b]) => c.push([`${NAME[k]}: carries the StepBar's CSS block`, !!b, b ? `${b.length} characters` : "not found"]));
    const ref = blocks["plan-board"];
    c.push(["the block is the same, byte for byte, in all four templates", !!ref && Object.values(blocks).every(b => b === ref), Object.entries(blocks).filter(([, b]) => b !== ref).map(([k]) => k).join(", ") || "the same"]);
    const b = ref || "";
    c.push(["an ordered list in a row that wraps inside itself (flex-wrap), never wider than its line", /\.stepbar\{list-style:none;[^}]*display:flex;flex-wrap:wrap;[^}]*min-width:0;max-width:100%\}/.test(b), "the .stepbar rule"]);
    c.push(["each step a chevron (a clip-path polygon pointing right, notched left but the first), its name wrapping inside it", /\.stepbar>li\{[^}]*overflow-wrap:anywhere;clip-path:polygon\(0 0,calc\(100% - 10px\) 0,100% 50%,calc\(100% - 10px\) 100%,0 100%,10px 50%\)\}/.test(b) && /\.stepbar>li:first-child\{[^}]*clip-path:polygon\(0 0,calc\(100% - 10px\) 0,100% 50%,calc\(100% - 10px\) 100%,0 100%\)\}/.test(b), "the li rules"]);
    c.push(["its edge and its fill layered inside the chevron, so a dashed edge and a mark follow its shape", /\.stepbar>li::before,\.stepbar>li::after\{content:"";position:absolute;inset:0;z-index:-2;background:var\(--sb-edge\)\}/.test(b) && /\.stepbar>li::after\{z-index:-1;inset:var\(--sb-w\);background:var\(--sb-fill\);clip-path:polygon\(/.test(b), "::before, ::after"]);
    c.push(["done solid in the strong neutral; current solid, ink and bold; to come dashed and muted", /\.stepbar>li\{--sb-edge:var\(--ink-2\);--sb-fill:color-mix\(in srgb,var\(--ink-2\) 14%,var\(--surface\)\)/.test(b) && /\.stepbar>li\.cur\{--sb-edge:var\(--ink\);[^}]*font-weight:700\}/.test(b) && /\.stepbar>li\.todo\{--sb-edge:repeating-linear-gradient\(90deg,var\(--muted\) 0 5px,transparent 5px 9px\);--sb-fill:var\(--surface\);color:var\(--muted\)\}/.test(b), "the states"]);
    c.push(["only tokens: no colour of its own, so light and dark both follow the board's palette", !/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i.test(b), (b.match(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/gi) || []).join(", ") || "tokens only"]);
    c.push(["no status colour and no accent in the shared block (the accent is the in-progress mark, the issue board's alone)", !/--(good|warning|serious|critical|accent)\b/.test(b), (b.match(/--(good|warning|serious|critical|accent)\b/g) || []).join(", ") || "none"]);
    c.push(["each step's state said in words to a screen reader (.sb-st, visually hidden)", /\.stepbar \.sb-st\{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset\(50%\);white-space:nowrap\}/.test(b), ".sb-st"]);
    c.push(["the Legend's chevron keys (i.sbk): done, current, to come", /\.legend i\.sbk\{/.test(b) && /\.legend i\.sbk\.cur\{/.test(b) && /\.legend i\.sbk\.todo\{/.test(b), "i.sbk"]);
    const pc = css(T["plan-board"]);
    c.push([`${NAME["plan-board"]}: the current step at work in a FullPulse (the accent Ring, the wash breathing about 2 s), the Ring alone while held`, /@keyframes stepbar-fullpulse\{/.test(pc) && /\.stepbar>li\.cur\.fullpulse,\.stepbar>li\.cur\.held\{animation:none;box-shadow:none;background:none;--sb-edge:var\(--accent\);--sb-w:2px\}/.test(pc) && /\.stepbar>li\.cur\.fullpulse::after\{animation:stepbar-fullpulse 2s ease-in-out infinite\}/.test(pc) && /\.stepbar>li\.cur\.held\{--sb-fill:var\(--surface\)\}/.test(pc), "the marks"]);
    c.push([`${NAME["plan-board"]}: under reduced motion the FullPulse holds still at its middle strength`, /@media \(prefers-reduced-motion:reduce\)\{\.stepbar>li\.cur\.fullpulse::after\{animation:none!important;background-color:color-mix\(in srgb,var\(--accent\) 18%,var\(--surface\)\)\}\}/.test(pc), "reduced motion"]);
    c.push([`${NAME["plan-board"]}: a finished step's button inside its chevron, its focus ring inside the chevron, the one shown ringed in ink, never the accent`, /\.stepbar>li>\.stepbtn\{appearance:none;/.test(pc) && /\.stepbar>li>\.stepbtn:focus-visible\{outline:2px solid var\(--focus\);outline-offset:1px/.test(pc) && /\.stepbar>li\.sel\{--sb-edge:var\(--ink\);--sb-w:2\.5px;font-weight:700\}/.test(pc), "the buttons"]);
    ["work-board", "system", "supersystem"].forEach(k => c.push([`${NAME[k]}: no mark on its StepBar (no stepbar FullPulse rule)`, !/stepbar-fullpulse|\.stepbar>li\.cur\.fullpulse/.test(css(T[k])), "none"]));
  });

  /* ---------- 2. the progress strip ---------- */
  guard("the progress strip and the WIP strip: stepsLine() draws a StepBar, against a stand-in", c => {
    const src = between(T["plan-board"], "const SB_STATE={done:\"done\",cur:\"current\",todo:\"to come\"};", "join(\"\")}</ol>`; }\n");
    c.push(["the template holds stepsLine() with its StepBar", !!src, src ? "found" : "not found"]);
    if (!src) return;
    const draw = (steps, cur, o, g) => { const ctx = vm.createContext({ esc: s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
      stepLabel: s => ({ qa: "Quality Review", remediation: "Correction" })[s] || s.charAt(0).toUpperCase() + s.slice(1), finishedOf: R => R.fin || [], selFor: () => (g || {}).sel || null,
      PAUSED: !!(g || {}).paused, LANDED: !!(g || {}).landed, PICKS: 0, out: null });
      vm.runInContext(src + "\nout=stepsLine(" + js(steps) + "," + js(cur) + "," + js(o || {}) + ");", ctx); return ctx.out; };
    const S = ["sizing", "research", "plan", "implementation", "qa", "landing", "landed"];
    const live = draw(S, "plan", {}), L = lis(live);
    c.push(["an ordered list of class stepbar, one item per step, in order, with its aria-label", /^<ol class="stepbar" aria-label="Pipeline steps">/.test(live) && L.length === S.length, live.slice(0, 80)]);
    c.push(["the steps before the current one done, the current one current, the rest to come", js(L.map(x => x.cls.split(" ")[0])) === js(["done", "done", "cur", "todo", "todo", "todo", "todo"]), js(L.map(x => x.cls))]);
    c.push(["each chevron holds the step's name, by its name (never its id), and its state in words for a screen reader", /^Sizing<span class="sb-st">, done<\/span>$/.test(L[0].body) && /^Plan<span class="sb-st">, current<\/span>$/.test(L[2].body) && /^Quality Review<span class="sb-st">, to come<\/span>$/.test(L[4].body), js(L.map(x => x.body).slice(0, 5))]);
    c.push(["the current step aria-current=\"step\", and only it", L.filter(x => /aria-current="step"/.test(x.attrs)).length === 1 && /aria-current="step"/.test(L[2].attrs), js(L.map(x => x.attrs))]);
    c.push(["the current step at work carries the FullPulse", L[2].cls === "cur fullpulse", L[2].cls]);
    c.push(["while the run waits on you, the Ring alone (held), never the FullPulse", lis(draw(S, "plan", {}, { paused: true }))[2].cls === "cur held", lis(draw(S, "plan", {}, { paused: true }))[2].cls]);
    c.push(["a unit's run on a tracking board: its own held state, its own label", (() => { const h = draw(S, "qa", { held: true, label: "#47: its pipeline steps" }), l = lis(h); return /aria-label="#47: its pipeline steps"/.test(h) && l[4].cls === "cur held"; })(), "held"]);
    c.push(["the inspector's still copy: current, with no mark", lis(draw(S, "plan", { still: true }))[2].cls === "cur", lis(draw(S, "plan", { still: true }))[2].cls]);
    const landed = lis(draw(S, "landed", {}, { landed: true }));
    c.push(["a landed board: every step done, nothing in a FullPulse", landed.every(x => x.cls === "done") && !landed.some(x => /aria-current/.test(x.attrs)), js(landed.map(x => x.cls))]);
    const picked = draw(S, "implementation", { pick: { key: "own", R: { fin: ["sizing", "research", "plan"] }, status: "building" } }, { sel: "research" }), P = lis(picked);
    c.push(["a finished step: a button inside its chevron, the step's name its text, pressed while it is the one shown (sel)", /^<button type="button" class="stepbtn" data-run="own" data-step="sizing" aria-pressed="false" aria-label="Sizing: finished; show it in the step panel">Sizing<\/button>$/.test(P[0].body) && P[1].cls === "done pick sel" && /aria-pressed="true"/.test(P[1].body) && P[3].cls === "cur fullpulse", js(P.map(x => [x.cls, x.body.slice(0, 70)]))]);
    c.push(["no dot left in the strip: the chevron is the mark", !/class="dot"/.test(live + picked), "no .dot"]);
    const lg = T["plan-board"];
    c.push(["the strip's Legend: chevron keys for done, the step at work in a FullPulse, the Ring alone while paused, to come dashed, and the one shown", /<span><i class="sbk"><\/i>step done\$\{PICKS\?": click a finished step to see it in the panel":""\}<\/span>/.test(lg) && /<i class="sbk acc"><\/i>current step, in a FullPulse: the step at work now/.test(lg) && /<i class="sbk ring"><\/i>current step, the Ring alone: paused while the run waits on you/.test(lg) && /<i class="sbk todo"><\/i>dashed: step to come/.test(lg) && /const KEY_SEL=`<span><i class="sbk sel"><\/i>ringed in ink: the finished step the panel shows<\/span>`;/.test(lg), "the Legend"]);
    c.push(["the research StepBar in the step panel is left as it is (a list of dots, its own rules)", /aria-label="The research StepBar"/.test(lg) && /<ol class="steps" aria-label="The research StepBar">/.test(lg), "the research StepBar"]);
  });

  /* ---------- 3. the repository work board ---------- */
  guard("the repository work board: board.js writes the chain's units, the template draws them on a row of their own", c => {
    const tree = path.join(sc, "work-tree"), TR = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json"))), dir = path.join(tree, ...TR.folder.split("/"));
    fs.mkdirSync(path.join(tree, ".git"), { recursive: true }); wr(path.join(dir, "plan.json"), JSON.stringify(TR, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), T["plan-board"]);
    const e = run(sk("plan/scripts/embed.js"), [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300));
    const b = run(sk("plan/scripts/board.js"), ["--root", tree, "--no-gh"]);
    c.push(["board.js generates the work board from a tracking board", b.status === 0, (b.stdout + b.stderr).slice(-300)]);
    if (b.status !== 0) return;
    const bj = JSON.parse(rd(path.join(tree, "docs", "plans", "board.json"))), row = bj.rows.find(r => r.issue === TR.issue) || {}, u = (row.chain || {}).units || [];
    c.push(["chain.units: one per counted unit, in landing order, each its number, issue and name (the tracking board's row name)", u.length === row.chain.total && u.length === 11 && u[0].n === 1 && u[0].issue === 61 && u[0].name === "Shared build logic" && u[2].name === "webtools-http common core", js(u.slice(0, 3))]);
    c.push(["…done where landed, current where its run is under way or it is complete and not merged, todo else", js(u.map(x => x.state)) === js(["done", "current", ...Array(9).fill("todo")]), js(u.map(x => x.state))]);
    const html = rd(path.join(tree, "docs", "plans", "index.html"));
    c.push(["the generated board is the template plus its data", html.replace(/<script type="application\/json" id="board">[\s\S]*?<\/script>/, "") === T["work-board"].replace(/<script type="application\/json" id="board">[\s\S]*?<\/script>/, ""), "template"]);
    /* the template's own helpers, against a stand-in: from chain.units, and from the unit rows of a board.json written before them */
    const W = T["work-board"], cr = W.indexOf("const chainRow="), code = [W.slice(W.indexOf("const chainCell="), W.indexOf("\n", cr))]; if (cr < 0 || !/const chainUnits=/.test(code[0])) throw new Error("the work board template holds no chainCell() … chainRow()");
    const evalWith = (B, r) => { const ctx = vm.createContext({ esc: s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
      codeOnly: s => String(s == null ? "" : s).split("`").map((p, i) => i % 2 ? `<code>${p}</code>` : p).join(""), ROWS: B.rows, STATUS: {}, pill: () => "", heldRow: () => false, chainText: () => "summary",
      stOf: x => x.status, out: null }); vm.runInContext(code.join("\n") + "\nout=[chainRow(" + js(r) + "),chainCell(" + js(r) + ",\"building\")];", ctx); return ctx.out; };
    const [rowHtml, cell] = evalWith(bj, row), L = lis(rowHtml);
    c.push(["a row of its own under the tracking issue's row, across the six columns, holding the StepBar", /^<tr class="chainrow"><td colspan="6"><ol class="stepbar" aria-label="#55: its units in landing order">/.test(rowHtml) && /<\/ol><\/td><\/tr>$/.test(rowHtml), rowHtml.slice(0, 120)]);
    c.push(["one chevron per unit, the unit's name inside, the states in words, the unit in progress aria-current and unmarked", L.length === 11 && L[0].cls === "done" && /^Shared build logic<span class="sb-st">, landed<\/span>$/.test(L[0].body) && L[1].cls === "cur" && /aria-current="step"/.test(L[1].attrs) && L[2].cls === "todo" && /, to come</.test(L[2].body) && !/fullpulse|held|upnext/.test(rowHtml), js(L.slice(0, 3))]);
    c.push(["the state cell keeps the chain's summary, and no thin bar", cell === '<div class="chainsum">summary</div>' && !/cbar/.test(cell), cell]);
    const WB = JSON.parse(rd(sk("verify/fixtures/work-board.json"))), r0 = WB.rows.find(r => r.chain), [old] = evalWith(WB, r0), O = lis(old);
    c.push(["a board.json written before chain.units: the StepBar from the tracking issue's unit rows, in their order, by their titles", !!r0 && !(r0.chain || {}).units && O.length === WB.rows.filter(r => r.parent === r0.issue).length && O[0].cls === "done" && O[1].cls === "cur" && O[2].cls === "todo" && /^Build: move shared configuration/.test(O[0].body) && /<code>build-logic<\/code>/.test(O[0].body), js(O.slice(0, 3).map(x => [x.cls, x.body.slice(0, 50)]))]);
    c.push(["the rows emit it under the tracking issue's row; the narrow layout stacks it as a block", /<\/td><\/tr>\$\{chainRow\(r,e\)\}`; \}\);/.test(W) && /\.tbl tr\.chainrow,\.tbl tr\.chainrow>td\{display:block\}/.test(css(W)), "chainRow(r)"]);
    c.push(["its Legend: the chain's states it drew (landed, in progress, to come), in place of the thin bar", /a tracking issue's unit, in landing order: landed/.test(W) && /<i class="sbk cur"><\/i>bold: a unit in progress, or complete and not merged/.test(W) && /<i class="sbk todo"><\/i>dashed: a unit to come/.test(W) && !/class="cbar"/.test(W.replace(/<style>[\s\S]*?<\/style>/g, "")), "the Legend"]);
  });

  /* ---------- 4. the state boards' roadmap ---------- */
  guard("the state boards' roadmap: a tracking issue's chain drawn as a StepBar under the roadmap item", c => {
    ["system", "supersystem"].forEach(k => {
      const h = T[k];
      c.push([`${NAME[k]}: the sample roadmap item names its units, each with its state`, /<span class="chainprog" data-landed="1" data-total="3"><span data-unit="done">First unit<\/span><span data-unit="current">Second unit<\/span><span data-unit="todo">Third unit<\/span><\/span>/.test(h), "the sample"]);
      c.push([`${NAME[k]}: the fill comment gives the form`, /<span class="chainprog" data-landed="n" data-total="m">, holding\n\s+<span data-unit="done\|current\|todo">the unit's name<\/span> per unit in landing order/.test(h), "the comment"]);
      const fn = between(h, "const SB_STATE={done:\"landed\",cur:\"in progress\",todo:\"to come\"};", "ri.after(bar); }); }");
      c.push([`${NAME[k]}: the renderer holds chainBars(), run first by sectionKeys()`, !!fn && /function sectionKeys\(\)\{\n  chainBars\(\);/.test(h), fn ? "found" : "not found"]);
      if (!fn) return;
      /* a stand-in: a roadmap item (.ri) inside its li, its chain the element chainBars() reads */
      const mk = units => { const made = [];
        const chain = { dataset: { landed: "1", total: "3" }, units, textContent: "", closest: s => s === ".ri" ? ri : null, querySelectorAll: () => units.map(u => ({ dataset: { unit: u[0] }, innerHTML: u[1] })) };
        const li = { tag: "li" }, ri = { parentElement: li, querySelector: () => ({ textContent: "#55" }), after: n => made.push(n) };
        const document = { querySelectorAll: () => [chain], createElement: t => ({ tag: t, className: "", attrs: {}, setAttribute(a, v) { this.attrs[a] = v; }, innerHTML: "" }) };
        const ctx = vm.createContext({ document }); vm.runInContext(fn + "\nchainBars(); chainBars();", ctx); return { chain, made }; };
      const A = mk([["done", "First unit"], ["current", "Second <code>unit</code>"], ["todo", "Third unit"]]), bar = A.made[0] || {}, L = lis(bar.innerHTML || "");
      c.push([`${NAME[k]}: "chain n of m landed" stays in the item; one StepBar inserted after it, once`, A.chain.textContent === "chain 1 of 3 landed" && A.made.length === 1 && bar.tag === "ol" && bar.className === "stepbar" && bar.attrs["aria-label"] === "#55: its units in landing order", js({ t: A.chain.textContent, n: A.made.length, cls: bar.className, label: bar.attrs })]);
      c.push([`${NAME[k]}: one chevron per unit, its name inside (its code kept), done, current or to come, the current aria-current and unmarked`, L.length === 3 && L[0].cls === "done" && /^First unit<span class="sb-st">, landed<\/span>$/.test(L[0].body) && L[1].cls === "cur" && /aria-current="step"/.test(L[1].attrs) && /<code>unit<\/code>/.test(L[1].body) && L[2].cls === "todo" && !/fullpulse|held/.test(bar.innerHTML), js(L)]);
      const B = mk([]), BL = lis((B.made[0] || {}).innerHTML || "");
      c.push([`${NAME[k]}: a chain written before the names: its units numbered, the landed ones done`, BL.length === 3 && BL[0].cls === "done" && /^unit 1</.test(BL[0].body) && BL[1].cls === "todo" && /^unit 2</.test(BL[1].body), js(BL)]);
      c.push([`${NAME[k]}: the Context's Legend names the chain's states it drew, in place of the thin bar`, /<span><i class="sbk"><\/i>a tracking issue's unit, in landing order: landed<\/span>/.test(h) && /<i class="sbk cur"><\/i>bold: a unit in progress/.test(h) && /<i class="sbk todo"><\/i>dashed: a unit to come/.test(h) && !/class="cbar"/.test(h), "the Legend"]);
      c.push([`${NAME[k]}: the StepBar stands on a line of its own under the item, indented as its issues are`, /\.roadmap>li>\.stepbar\{margin:5px 0 3px 14px\}/.test(css(h)), "the CSS"]);
    });
  });

  /* ---------- 5. the feature probe ---------- */
  guard("the feature probe (stepbar): found on the four templates, missed on a board drawn before", c => {
    const f = F.FEATURES.find(x => x.id === "stepbar") || {};
    c.push(["it applies to every dashboard type, since dashboards-skill/54", js(f.types) === js(["system", "supersystem", "plan-board", "work-board"]) && f.since === 54, js({ types: f.types, since: f.since })]);
    const V = require(sk("verify/verified.json")).templates, dev = require(sk("system/scripts/deviation.js"));
    Object.entries(T).forEach(([k, h]) => {
      const now = F.probe(h, k).filter(m => m.id === "stepbar");
      c.push([`${NAME[k]}: the probe finds it`, !now.length, js(now)]);
      const file = { "plan-board": "plan/template/dashboard.html", "work-board": "plan/template/board.html", system: "system/template/system.html", supersystem: "system/template/supersystem.html" }[k], rec = V[file] || {};
      const old = (rec.history || []).slice().reverse().find(v => v.file && fs.existsSync(sk("verify/history/" + v.file)) && !/class="stepbar"|className="stepbar"/.test(rd(sk("verify/history/" + v.file))));
      if (!old) { c.push([`${NAME[k]}: an older recorded version to probe`, false, "none in verify/history/"]); return; }
      const m = F.probe(rd(sk("verify/history/" + old.file)), k).find(x => x.id === "stepbar");
      c.push([`${NAME[k]}: …and misses it on the version of ${old.verified || "?"} (FEATURE MISSING, since dashboards-skill/54)`, !!m && /FEATURE MISSING: the StepBar/.test(F.line(m)) && /dashboards-skill\/54/.test(F.line(m)), m ? F.line(m).slice(0, 200) : "not missed"]);
    });
  });

  /* ---------- 6. the fixture boards for a browser check ---------- */
  guard("the fixture boards for a browser check, and the StepBar in a browser", c => {
    const fx = path.join(sc, "fixtures"), laid = {};
    const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json"))), LIVE = JSON.parse(rd(sk("verify/fixtures/live-issue.plan.json"))), TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
    const halted = copy(LIVE); Object.assign(halted.wip, { step: "halted", resume: "research", waitingOn: "Which of the two parsers to keep." });
    laid["issue board in flight (research, a FullPulse)"] = wr(path.join(fx, "issue-live", "dashboard.html"), withData(T["plan-board"], "plan", JSON.stringify(LIVE)));
    laid["issue board waiting on you (the Ring alone)"] = wr(path.join(fx, "issue-halted", "dashboard.html"), withData(T["plan-board"], "plan", JSON.stringify(halted)));
    laid["issue board landed (every step done, finished steps clickable)"] = wr(path.join(fx, "issue-landed", "dashboard.html"), withData(T["plan-board"], "plan", JSON.stringify(EX)));
    laid["tracking board (its own steps and a unit's run)"] = wr(path.join(fx, "tracking", "dashboard.html"), withData(T["plan-board"], "plan", JSON.stringify(TRK)));
    const tree = path.join(sc, "work-tree", "docs", "plans", "index.html");
    if (fs.existsSync(tree)) laid["repository work board (chain.units from board.js)"] = wr(path.join(fx, "work-board", "index.html"), rd(tree));
    laid["repository work board (a board.json written before chain.units)"] = wr(path.join(fx, "work-board-before", "index.html"), withData(T["work-board"], "board", rd(sk("verify/fixtures/work-board.json"))));
    laid["system board (the template's sample roadmap)"] = wr(path.join(fx, "system", "index.html"), T.system);
    laid["supersystem and repository state board (the template's sample roadmap)"] = wr(path.join(fx, "supersystem", "index.html"), T.supersystem);
    c.push(["the fixture boards are laid", Object.values(laid).every(f => fs.existsSync(f)), Object.entries(laid).map(([w, f]) => `${w}: ${f}`).join(" | ")]);
    /* in a browser: every StepBar an ordered list of chevrons, none wider than the board at 390 px */
    const probe = `<script>window.addEventListener("load",()=>setTimeout(()=>{ const bars=[...document.querySelectorAll("ol.stepbar")], W=document.documentElement.clientWidth, sw=document.documentElement.scrollWidth;
      const wide=bars.filter(b=>{ const r=b.getBoundingClientRect(); return r.right>W+0.5||[...b.children].some(l=>l.getBoundingClientRect().right>W+0.5); }).length, cur=bars.flatMap(b=>[...b.children]).filter(l=>l.getAttribute("aria-current")==="step").length;
      document.body.dataset.sb=[bars.length,bars.every(b=>[...b.children].every(l=>l.tagName==="LI"&&getComputedStyle(l).clipPath!=="none")),wide,sw<=W,cur].join("/"); },700));</script>`;
    Object.entries(laid).forEach(([what, f]) => {
      const pg = wr(path.join(sc, "browser", path.basename(path.dirname(f)), path.basename(f)), rd(f).replace("</body>", probe + "</body>")), d = dumpDom(pg, "", "390,900", 6000);
      if (d == null) { c.push([`${what}: StepBars drawn as chevrons, none wider than the board at 390 px`, false, NEEDS_BROWSER]); return; }
      const got = ((/data-sb="([^"]*)"/.exec(d) || [])[1] || "").split("/");
      c.push([`${what}: StepBars drawn as chevrons, none wider than the board at 390 px`, +got[0] > 0 && got[1] === "true" && got[2] === "0" && got[3] === "true", got.join("/") || "no probe result"]); });
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const NB = "needs a browser: not run (verify-templates.js --browser runs it)";
  if (!process.env.DASHBOARDS_TEMPLATES_UNDER_TEST) { const { sha } = require(sk("system/scripts/deviation.js")); process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify(["plan/template/dashboard.html", "plan/template/board.html", "system/template/system.html", "system/template/supersystem.html"].map(f => sha(fs.readFileSync(sk(f), "utf8")))); }
  let fails = 0, skipped = 0;
  module.exports({ sk, out, targets: [], NEEDS_BROWSER: NB }).forEach(([title, cases]) => { const nr = cases.filter(x => x[2] === NB), runc = cases.filter(x => !nr.includes(x)), bad = runc.filter(x => !x[1]); fails += bad.length; skipped += nr.length;
    console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${runc.length - bad.length}/${runc.length} cases${nr.length ? ` · not run without a browser: ${nr.length}` : ""}`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
