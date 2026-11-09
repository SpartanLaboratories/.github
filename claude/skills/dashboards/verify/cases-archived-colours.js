// The cases of "an archived system holds no colour" (system/scripts/palette.js colourSlots(); GUIDANCE.md §1; admin-team/dashboards-skill/option-d-and-decisions), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-archived-colours.js [--out <dir>].
// One rule in every runtime: an archived system holds no slot and is drawn neutral, solid and faded, with its tag; a live top-level system keeps the slot of its place, so archiving
// one moves no other system's colour; what its place freed goes to the next system with none. Each group returns [title, cases].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesArchivedColours(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; }, js = x => JSON.stringify(x);
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const P = require(sk("system/scripts/palette.js")), lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const sc = path.join(out, "archived-colours"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const S = (slug, parent, status, kind) => ({ slug, name: slug, kind: kind || "system", parent, status: status || "built" });
  /* the WebTools registry's shape, webtools-common appended as the pending registry entry says */
  const WT = [S("webtools", null, "built", "repo"), S("webtools-udp", "webtools"), S("webtools-scraping", "webtools", "archived"), S("webtools-browser", "webtools", "archived"), S("gradle-build", "webtools"), S("js-commoncheck", "gradle-build"), S("webtools-http", "webtools", "planned", "supersystem"), S("webtools-http-core", "webtools-http"), S("webtools-feeds", "webtools", "planned")];
  const slots = (list, slugs) => { const C = P.colourSlots(list); return slugs.map(s => C.slot(s)); };
  const reg = list => { const root = path.join(sc, `r-${Math.random().toString(36).slice(2, 8)}`); wr(path.join(root, "docs", "dashboards", "systems.json"), js({ repo: "a/b", systems: list })); return lib.registry(root); };

  guard("colourSlots(): an archived system holds none; archiving moves no one; a freed slot goes to the next with none", c => {
    c.push(["a registry with no archived system: as it always was, a top's slot its place, a child its top's", js(slots([S("a", null), S("b", null), S("b1", "b")], ["a", "b", "b1"])) === js([1, 2, 2]), "slots"]);
    c.push(["a thirteenth top-level system with none free folds into the neutral", js(slots("abcdefghijklm".split("").map(x => S(x, null)), ["l", "m"])) === js([12, 0]), "slots"]);
    /* a repository entry is no system: the systems listed under it are top-level, each its own colour (the user's decision of 2026-11-08; KotlinBottools' ten planned systems) */
    const repoTen = [{ slug: "kotlinbottools", name: "KotlinBottools", kind: "repo", parent: null, status: "built" }, ...["toolchain", "backups-and-manifests", "legacy-data-copy", "rewrite-pipeline", "privacy-gate", "residual-exposure", "cleanup", "repository-swap", "clone-realignment", "repository-hygiene"].map(x => S(x, "kotlinbottools", "planned"))];
    c.push(["ten systems under a repository entry: ten colours, none folded to the neutral", js(slots(repoTen, repoTen.slice(1).map(s => s.slug))) === js([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), js(slots(repoTen, repoTen.slice(1).map(s => s.slug)))]);
    const now = slots(WT, ["webtools-udp", "webtools-scraping", "webtools-browser", "gradle-build", "js-commoncheck", "webtools-http", "webtools-http-core", "webtools-feeds"]);
    c.push(["WebTools today: archived neutral, every live system where it stood", js(now) === js([1, 0, 0, 4, 4, 5, 5, 6]), js(now)]);
    const w = [...WT, S("webtools-common", "webtools", "planned")];
    c.push(["webtools-common appended: slot 7, its own place, the others unmoved", js(slots(w, ["webtools-common", "webtools-udp", "gradle-build", "webtools-http", "webtools-feeds"])) === js([7, 1, 4, 5, 6]) && P.PALETTE.names[6] === "harbour", js(slots(w, ["webtools-common"]))]);
    c.push(["an archived child holds none, under a live top", js(slots([S("a", null), S("a1", "a", "archived"), S("a2", "a")], ["a", "a1", "a2"])) === js([1, 0, 1]), "slots"]);
    c.push(["a live child of an archived top is a system with no colour yet: the freed slot goes to it", js(slots([S("x", null, "archived"), S("x1", "x"), S("b", null)], ["x", "x1", "b"])) === js([0, 1, 2]), "slots"]);
    const seven = "abcdefghijkl".split("").map(x => S(x, null)); seven[1].status = "archived"; seven.push(S("m", null), S("n", null));
    c.push(["two systems past the twelfth and one slot freed: the first takes it, the second folds", js(slots(seven, ["m", "n"])) === js([2, 0]), "slots"]);
    const R = reg(WT);
    c.push(["lib.js registry() gives an archived system slot 0, and it is its own top", R.info("webtools-browser").slot === 0 && R.info("webtools-browser").top === "webtools-browser" && R.info("webtools-browser").status === "archived", js(R.info("webtools-browser"))]);
    c.push(["…a live one its place", R.info("webtools-http-core").slot === 5 && R.info("webtools-http-core").top === "webtools-http", js(R.info("webtools-http-core"))]);
  });

  guard("the twelve system colour slots: light and dark, off the status spectra, 3:1 on the surfaces, and in every template that draws them", c => {
    const hex = v => [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16)), lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }, lum = rgb => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }, cr = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const P2 = P.PALETTE, slots12 = P2.light.length === 12 && P2.dark.length === 12 && P2.names.length === 12;
    c.push(["the palette holds twelve slots, each named, the first six unchanged", slots12 && P2.light.slice(0, 6).join() === "#2a78d6,#653184,#0d7680,#1d2660,#9656aa,#1a9ec7" && P2.dark.slice(0, 6).join() === "#3987e5,#8a44d8,#1f8089,#b4bef5,#a86fb8,#31b5f4", js(P2.names)]);
    c.push(["every slot of both themes stays off the status spectra (hue 175–295°)", [...P2.light, ...P2.dark].every(v => !P.inStatusHue(v)), js([...P2.light, ...P2.dark].filter(v => P.inStatusHue(v)))]);
    c.push(["every slot at least 3:1 against its theme's Card surface, the six added against the page background and the Card's darker fill too", P2.light.every(v => cr(v, "#fcfcfd") >= 3) && P2.dark.every(v => cr(v, "#171c25") >= 3) && P2.light.slice(6).every(v => cr(v, "#f3f5f8") >= 3) && P2.dark.slice(6).every(v => cr(v, "#10141b") >= 3 && cr(v, "#1f2530") >= 3), js([...P2.light.map(v => [v, cr(v, "#fcfcfd").toFixed(1)]), ...P2.dark.map(v => [v, cr(v, "#171c25").toFixed(1)])])]);
    c.push(["no two slots share a colour in a theme", new Set(P2.light).size === 12 && new Set(P2.dark).size === 12, "distinct"]);
    const check = (name, rel, dark) => { const h = rd(tp(rel)), found = n => new RegExp("--sys-" + n + "\\s*:\\s*" + (dark ? P2.dark[n - 1] : P2.light[n - 1]).replace("#", "#")).test(h); c.push([name + ": --sys-1 to --sys-12, in " + (dark ? "dark" : "light"), [...Array(12).keys()].every(i => found(i + 1)), "tokens"]); };
    [["the issue and tracking board template", "plan/template/dashboard.html"], ["the repository work board template", "plan/template/board.html"], ["the org work board template", "plan/template/org-board.html"], ["the supersystem and repository state board template", "system/template/supersystem.html"]].forEach(([n, rel]) => { check(n, rel, false); check(n, rel, true); });
    const lit = rel => /s\.slot<=12/.test(rd(tp(rel))); c.push(["the work boards draw a system up to slot 12", ["plan/template/dashboard.html", "plan/template/board.html", "plan/template/org-board.html"].every(lit), "sysLit()"]);
    c.push(["the feature probe (twelve-slots) passes the templates", !F.probe(rd(tp("plan/template/dashboard.html")), "plan-board").some(m => m.id === "twelve-slots") && !F.probe(rd(tp("plan/template/board.html")), "work-board").some(m => m.id === "twelve-slots") && !F.probe(rd(tp("system/template/supersystem.html")), "supersystem").some(m => m.id === "twelve-slots"), "probe"]);
    c.push(["…and names a board drawn with six", F.probe(rd(tp("plan/template/board.html")).replace(/--sys-12:#[0-9a-f]+/g, ""), "work-board").some(m => m.id === "twelve-slots"), "probe"]);
  });

  guard("every board type takes it: the templates, the in-flight boards, check-board.js", c => {
    /* the supersystem template's own runtime of the rule, evaluated against the same registries */
    const sup = rd(tp("system/template/supersystem.html")), start = sup.indexOf("const SLOTS=12"), end = sup.indexOf("function sysColour");
    const runRule = list => { const fn = new Function("SYSTEMS", `${sup.slice(start, end)}; return slug => { const n=sysSlot(slug); return n; };`); return fn(list.filter(s => s.kind !== "repo")); };
    const lists = [WT, [...WT, S("webtools-common", "webtools", "planned")], [S("x", null, "archived"), S("x1", "x"), S("b", null)], ["a", "b", "c", "d", "e", "f", "g", "h"].map((x, i) => S(x, null, i === 1 ? "archived" : "built"))];
    c.push(["the supersystem template's rule and colourSlots() agree on every slug", lists.every(l => { const a = runRule(l), C = P.colourSlots(l); return l.filter(s => s.kind !== "repo").every(s => a(s.slug) === C.slot(s.slug)); }), js(lists.map(l => { const a = runRule(l); return l.filter(s => s.kind !== "repo").map(s => [s.slug, a(s.slug), P.colourSlots(l).slot(s.slug)]); }).slice(0, 1))]);
    const dash = rd(tp("plan/template/dashboard.html")), work = rd(tp("plan/template/board.html")), sys = rd(tp("system/template/system.html"));
    c.push(["an issue board: an archived entry draws neutral whatever slot it records, faded, its legend and tag saying so", /const sysLit=s=>(?:sysPlain\(s\)\|\|\()?!!s&&s\.status!=="archived"/.test(dash) && /sys-archived/.test(dash) && /\(⊟ archived\)/.test(dash) && /" · ⊟ archived"/.test(dash), "dashboard.html"]);
    c.push(["the repository work board: neutral, faded, tagged, with its legend entry", /const sysLit=s=>(?:sysPlain\(s\)\|\|\()?!!s&&s\.status!=="archived"/.test(work) && /\.sysarch/.test(work) && /class="sbar arch"/.test(work), "board.html"]);
    c.push(["a system board: an archived system's three sides neutral, by its status chip", /:root:has\(\.chip\[data-sys-status="archived"\]\)\{--server:var\(--muted\)/.test(sys), "system.html"]);
    ["plan/template/dashboard.html:plan-board", "plan/template/board.html:work-board", "system/template/supersystem.html:supersystem", "system/template/system.html:system"].forEach(x => { const [p, k] = x.split(":"), miss = F.probe(rd(tp(p)), k).filter(m => m.id === "archived-no-colour");
      c.push([`the feature probe holds ${p} to it`, !miss.length, js(miss)]); });
    c.push(["…and fails a template that assigns an archived system a colour", F.probe(sup.replace('s.status==="archived"||sysPlain(slug)) return null', 's.status==="x"||sysPlain(slug)) return null'), "supersystem").some(m => m.id === "archived-no-colour"), "probe"]);
    /* an in-flight board's entry follows the registry, a landed one's is kept */
    const root = path.join(sc, "flight"), reg0 = { repo: "a/b", systems: [S("r", null, "built", "repo"), S("old", "r", "archived"), S("live", "r")] }; wr(path.join(root, "docs", "dashboards", "systems.json"), js(reg0));
    const dir = path.join(root, "docs", "plans", "9-x"); fs.mkdirSync(dir, { recursive: true });
    const inflight = { status: "building", systems: [{ slug: "old", name: "old", slot: 1, top: "old", status: "built", board: null }] }, landed = { status: "built", systems: [{ slug: "old", name: "old", slot: 1, top: "old", status: "built", board: null }] };
    const ch = lib.refreshSystems(inflight, dir);
    c.push(["embed.js takes an in-flight board's entry from the registry: slot 0, status archived", inflight.systems[0].slot === 0 && inflight.systems[0].status === "archived" && ch.some(x => /slot 1 → 0/.test(x)), js(ch)]);
    lib.refreshSystems(landed, dir);
    c.push(["a landed board's entry is kept as it landed", landed.systems[0].slot === 1 && landed.systems[0].status === "built", js(landed.systems)]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html", "system/template/supersystem.html", "system/template/system.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
