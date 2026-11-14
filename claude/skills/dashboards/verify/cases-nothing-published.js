// The cases of release.nothingPublished (the user's decisions of 2026-11-11, the release-warning proposal's choices 1 to 6; plan/RULES.md §2,
// the release field and the Consequences Tab, §8, its fails and warnings; dated 59 in the feature probes), run by verify-templates.js (it
// passes its helpers in), or on its own with no browser: node verify/cases-nothing-published.js [--out <dir>].
// A change that touches no published artifact (no module it changes is a published module, as consequences.md's published-artifacts section
// records) carries release.nothingPublished: true: no version moves, and the release warnings count none of its downstream effects.
// 1. check.js on an issue board: without the mark a change with downstream effects and no bump draws both release warnings; the mark quiets
//    them and says why; a mark that is not true fails; the mark beside a bump other than none, or beside release.unreleased, warns; an
//    entry of kind artifact beside it draws nothing (an artifact may be deployed and not published).
// 2. check.js on a tracking board: a unit entry's release takes the mark too, held to the same form (not true fails; a bump other than
//    none, or release.unreleased beside it, warns; an artifact entry beside it draws nothing).
// 3. The template: the Consequences Tab's version Badge reads "nothing published" where the mark is set, beside the bump, as it reads
//    "new, unreleased" for the other mark (releaseWords(), run outside a browser); the unit Card and its inspector the same; the Legend
//    says what it means; plan.json's impact comment names the mark and the unit entries; no grade in any of it.
// 4. The feature probe (nothing-published): found on the issue-board template, missed on one without it, for the issue and tracking boards
//    only, and why the others do not fit.
// 5. The fixture boards for a browser check, kept under <out>/nothing-published/fixtures/, and the Badge in a browser (--browser).
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesNothingPublished(X) {
  const { sk, out, targets } = X;
  const NEEDS_BROWSER = X.NEEDS_BROWSER || "needs a browser: not run (verify-templates.js --browser runs it)";
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), LR = require(sk("system/scripts/levelrefs.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const PT = rd(tp("plan/template/dashboard.html"));
  const withData = X.withData || ((html, id, json) => { const m = new RegExp(`<script type="application/json" id="${id}">[\\s\\S]*?</script>`).exec(html); return m ? html.replace(m[0], () => `<script type="application/json" id="${id}">${String(json).replace(/<\//g, "<\\/")}</script>`) : html; });
  const EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js");
  const sc = path.join(out, "nothing-published"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json"))), TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const lines = (r, re) => (r.stdout || "").split(/\r?\n/).filter(l => re.test(l)).join(" | ");
  /* check.js on a board written into a scratch repository (embed.js first, as at every event) */
  const tree = path.join(sc, "tree");
  const EXD = "plan/examples/38-handshake-empty-name";
  const chk = d => { const dir = path.join(tree, ...String(d.folder).split("/")); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    if (d.folder === EX.folder) fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
    wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PT); run(EMBED, [dir]); return run(CHECK, [dir, "--root", tree]); };
  const FEATURE_LINE = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const RELEASE_WARN = /takes a feat: release|says explicitly that it has no downstream effect/;
  /* an issue board on a small feature's steps line, its change with downstream effects and no version bump */
  const issue = m => { const d = copy(EX); d.wip.steps = FEATURE_LINE.slice();
    d.impact = { basis: "as-built", summary: "Verification case: the change moves files of the repository and its documents; no module it changes is published.", none: null,
      release: { bump: "none", version: null, note: "no module is published and no version moves", ...(m || {}) },
      downstream: [{ who: "the repository's readers", kind: "repository", effect: "behaviour", summary: "Verification case: a reader finds the documents in their new folders.", system: d.systems[0].slug }],
      adaptation: [{ who: "a local clone", need: "required", summary: "Verification case: a clone is cloned again." }], api: [], conversion: [], changes: [], source: "impact.md" }; return d; };

  /* ---------- 1. check.js on an issue board ---------- */
  guard("check.js: release.nothingPublished on an issue board quiets the release warnings, says why, and is held to its form", c => {
    const c0 = chk(issue()), c1 = chk(issue({ nothingPublished: true }));
    c.push(["without the mark: a change with downstream effects and no bump draws both release warnings", /takes a feat: release/.test(c0.stdout) && /says explicitly that it has no downstream effect/.test(c0.stdout), lines(c0, /release|feat/)]);
    c.push(["release.nothingPublished: true quiets both and says why; the board passes", c1.status === 0 && !RELEASE_WARN.test(c1.stdout) && /release\.nothingPublished — the change touches no published artifact/.test(c1.stdout), lines(c1, /release|feat|^FAIL/)]);
    const bad = chk(issue({ nothingPublished: "yes" }));
    c.push(["a mark that is not true fails", bad.status === 1 && /impact\.release\.nothingPublished is true .*\(got "yes"\)/.test(bad.stdout), lines(bad, /^FAIL/)]);
    const fa = chk(issue({ nothingPublished: false }));
    c.push(["false fails too: the mark is true or left out", fa.status === 1 && /impact\.release\.nothingPublished is true .*\(got false\)/.test(fa.stdout), lines(fa, /^FAIL/)]);
    const bumped = chk(issue({ nothingPublished: true, bump: "feat", version: "1.1.0" }));
    c.push(["the mark beside a bump other than none warns: keep bump none, or drop the mark", /nothingPublished says the change touches no published artifact, so no version moves, but release\.bump is feat: keep bump "none"/.test(bumped.stdout), lines(bumped, /nothingPublished/)]);
    const both = chk(issue({ nothingPublished: true, unreleased: true }));
    c.push(["the mark beside release.unreleased warns: keep one of the two", /nothingPublished says the change touches no published artifact, but release\.unreleased marks a new artifact to be released: keep one of the two/.test(both.stdout), lines(both, /nothingPublished/)]);
    const art = issue({ nothingPublished: true }); art.impact.downstream.push({ who: "the rewritten mirror", kind: "artifact", effect: "additive", summary: "Verification case: an artifact deployed, never published." });
    const ca = chk(art);
    c.push(["an entry of kind artifact beside the mark draws no warning", ca.status === 0 && !/^warn .*(nothingPublished|artifact)/m.test(ca.stdout) && !RELEASE_WARN.test(ca.stdout), lines(ca, /^warn|^FAIL/) || "quiet"]);
    const noEff = issue({ nothingPublished: true }); noEff.impact.downstream = []; noEff.impact.adaptation = [];
    const bare = copy(noEff); delete bare.impact.release.nothingPublished;
    const cb = chk(bare), cn = chk(noEff);
    c.push(["with no downstream effect and no none statement: the warning without the mark, the mark in its stead quiet", /says explicitly that it has no downstream effect/.test(cb.stdout) && cn.status === 0 && !RELEASE_WARN.test(cn.stdout), lines(cb, /release/) + " || " + lines(cn, /release|^FAIL/)]);
  });

  /* ---------- 2. check.js on a tracking board's unit entries ---------- */
  guard("check.js: a unit entry's release takes the mark too, held to the same form", c => {
    const trk = m => { const d = copy(TRK); const e = d.impact.units.find(u => u.unit === "build-logic"); e.release = { bump: "none", version: null, ...(m || {}) }; return d; };
    const at = 'impact\\.units\\[0\\]';
    const c0 = chk(trk({ nothingPublished: true }));
    c.push(["a unit entry with the mark and no bump: nothing said of it, the board passes", c0.status === 0 && !new RegExp(`${at}\\.release`).test(c0.stdout), lines(c0, /units\[0\]|^FAIL/) || "quiet"]);
    const c1 = chk(trk({ nothingPublished: "yes" }));
    c.push(["a unit entry's mark that is not true fails", c1.status === 1 && new RegExp(`FAIL .*${at}\\.release\\.nothingPublished is true`).test(c1.stdout), lines(c1, /^FAIL/)]);
    const c2 = chk(trk({ nothingPublished: true, bump: "fix", version: "1.0.1" }));
    c.push(["a unit entry's mark beside a bump other than none warns", new RegExp(`warn .*${at}\\.release\\.nothingPublished .*but its bump is fix: keep bump "none"`).test(c2.stdout), lines(c2, /nothingPublished/)]);
    const c3 = chk(trk({ nothingPublished: true, unreleased: true }));
    c.push(["a unit entry's mark beside release.unreleased warns: keep one of the two", new RegExp(`warn .*${at}\\.release\\.nothingPublished .*release\\.unreleased .*keep one of the two`).test(c3.stdout), lines(c3, /nothingPublished/)]);
    const c4 = chk(trk({ unreleased: "yes" }));
    c.push(["the unit entry's unreleased mark is still held to its form", c4.status === 1 && new RegExp(`FAIL .*${at}\\.release\\.unreleased is true`).test(c4.stdout), lines(c4, /^FAIL/)]);
  });

  /* ---------- 3. the template ---------- */
  guard("the template: the version Badge reads \"nothing published\" where the mark is set, on the Tab, the unit Card and its inspector, and the Legend says what it means", c => {
    const L = PT.split("\n");
    const def = name => { const i = L.findIndex(l => l.startsWith(`const ${name}=`) || l.startsWith(`function ${name}(`)); if (i < 0) throw new Error(`the template defines no ${name}`);
      let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n"); };
    const box = {}; vm.createContext(box); vm.runInContext(["UNRELEASED", "NOTHING_PUBLISHED", "IMP_BUMP", "releaseWords"].map(def).join("\n") + "\nthis.api={releaseWords,NOTHING_PUBLISHED,UNRELEASED};", box);
    const W = box.api.releaseWords;
    c.push(["releaseWords(): the bump, then the mark, then the version", W({ bump: "none", nothingPublished: true, version: null }) === "no version moves · nothing published" && W({ bump: "none", unreleased: true, version: "1.0.0" }) === "no version moves · new, unreleased: its first release is its own · 1.0.0" && W({ bump: "fix", version: "2.0.1" }) === "fix · a bugfix release · 2.0.1",
      js([W({ bump: "none", nothingPublished: true }), W({ bump: "none", unreleased: true, version: "1.0.0" }), W({ bump: "fix", version: "2.0.1" })])]);
    c.push(["…the short form a unit Card takes", W({ bump: "none", unreleased: true }, true) === "no version moves · new, unreleased" && W({ bump: "none", nothingPublished: true }, true) === "no version moves · nothing published", js([W({ bump: "none", unreleased: true }, true), W({ bump: "none", nothingPublished: true }, true)])]);
    c.push(["…a mark that is not true is not drawn", W({ bump: "none", nothingPublished: "yes" }) === "no version moves", W({ bump: "none", nothingPublished: "yes" })]);
    const imp = def("renderImpact"), unit = def("impUnitCard"), insp = def("inspectImpact");
    c.push(["the Tab's head, the unit Card and the inspector draw it through releaseWords()", /version · \$\{esc\(releaseWords\(rel\)\)\}/.test(imp) && /esc\(releaseWords\(e\.release,true\)\)/.test(unit) && /<dt>Version<\/dt><dd>\$\{esc\(releaseWords\(e\.release\)\)\}/.test(insp), "renderImpact · impUnitCard · inspectImpact"]);
    c.push(["the Legend says what the mark means where it drew it, on the version Badge or a unit Card's", imp.includes('relMark("nothingPublished")?"; nothing published: the change touches no published artifact, so no version moves":""') && imp.includes('const relMark=k=>(rel&&rel[k]===true)||units.some('), "renderImpact: the impact key"]);
    const words = [box.api.NOTHING_PUBLISHED, "nothing published: the change touches no published artifact, so no version moves"].join(" ");
    c.push(["no grade in the Badge or the Legend", !LR.levelRefs(words).length, words]);
    const PJ = rd(tp("plan/template/plan.json")), cm = JSON.parse(PJ).impact.$comment;
    c.push(["plan.json's impact comment names the mark, its source and the unit entries", /release\.nothingPublished: true \(optional\) marks a change that touches no published artifact, as consequences\.md's published-artifacts section records: no version moves \(bump none\), and the release warnings count none of its downstream effects/.test(cm) && cm.includes("A unit entry's release (units[], below) takes either mark") && !LR.levelRefs(cm).length, cm.slice(cm.indexOf("release.bump"), cm.indexOf("release.bump") + 600)]);
  });

  /* ---------- 4. the feature probe ---------- */
  guard("the feature probe: the version Badge's nothing published on the issue and tracking boards, and why the other types do not fit", c => {
    const f = F.FEATURES.find(x => x.id === "nothing-published");
    c.push(["the probe is there, for the plan boards only, and says why the others do not fit", !!f && js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => typeof (f.notFor || {})[k] === "string"), js(f && { types: f.types, notFor: f.notFor })]);
    c.push(["it finds the feature on the template", !!f && f.test(PT, "plan-board") === true, f ? String(f.test(PT, "plan-board")) : "no probe"]);
    const old = PT.replace(/\nconst NOTHING_PUBLISHED=[^\n]*/, "").replace(/rel\.nothingPublished===true\?NOTHING_PUBLISHED:""/g, '""');
    c.push(["it misses it on a template without it", !!f && f.test(old, "plan-board") !== true, f ? String(f.test(old, "plan-board")).slice(0, 200) : "no probe"]);
  });

  /* ---------- 5. the fixture boards for a browser check ---------- */
  guard("the fixture boards for a browser check, and the Badge in a browser", c => {
    const fx = path.join(sc, "fixtures"), laid = {};
    const lay = (name, d) => { const dir = path.join(fx, name), f = wr(path.join(dir, "dashboard.html"), withData(PT, "plan", JSON.stringify(d, null, 2)));
      wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); return f; };
    const marked = issue({ nothingPublished: true }); marked.title = "Verification case: nothing published";
    const unrel = copy(EX); unrel.wip.steps = FEATURE_LINE.slice(); unrel.title = "Verification case: a new, unreleased artifact";
    unrel.impact = { basis: "as-built", summary: "Verification case: a new module, with no release yet.", none: null, release: { bump: "none", version: null, unreleased: true },
      downstream: [{ who: "`acme:widgets-new` (new artifact)", kind: "artifact", effect: "additive", summary: "Verification case: a new artifact with no release yet.", system: unrel.systems[0].slug }], adaptation: [], api: [], conversion: [], changes: [], source: "impact.md" };
    const tk = copy(TRK); tk.impact.units.find(u => u.unit === "build-logic").release = { bump: "none", version: null, nothingPublished: true, note: "no module is published and no version moves" };
    laid["issue board, nothing published (the Consequences Tab)"] = lay("issue-nothing-published", marked);
    laid["issue board, new and unreleased, to compare (the Consequences Tab)"] = lay("issue-unreleased", unrel);
    laid["tracking board, a unit entry marked nothing published (the Consequences Tab, Units)"] = lay("tracking-unit-nothing-published", tk);
    c.push(["the fixture boards are laid", Object.values(laid).every(f => fs.existsSync(f)), Object.entries(laid).map(([w, f]) => `${w}: ${f}`).join(" | ")]);
    const { dumpDom, inner, chrome } = X;
    if (!chrome || !dumpDom) { c.push(["the Consequences Tab draws the Badge and the Legend entry in a browser", false, NEEDS_BROWSER]); return; }
    const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    const d1 = dumpDom(laid["issue board, nothing published (the Consequences Tab)"], "impact"), body = text(inner(d1, '<div[^>]*id="impact-body"[^>]*>', "div")), key = text(inner(d1, '<div class="legend" id="impact-key">', "div"));
    c.push(["the Tab's version Badge reads nothing published, and the Legend says what it means", /version · no version moves · nothing published/.test(body) && /nothing published: the change touches no published artifact, so no version moves/.test(key), body.slice(0, 160) + " · " + key.slice(0, 200)]);
    const d2 = dumpDom(laid["tracking board, a unit entry marked nothing published (the Consequences Tab, Units)"], "impact");
    c.push(["the tracking board's unit Card reads nothing published", /no version moves · nothing published/.test(text(inner(d2, '<div[^>]*id="impact-body"[^>]*>', "div"))), "impact-body"]);
  });
  return groups;
};

/* on its own, with no browser: the case groups against the skill's own templates */
if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const NB = "needs a browser: not run (verify-templates.js --browser runs it)";
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets, NEEDS_BROWSER: NB }).forEach(([what, cases]) => { const nr = cases.filter(x => x[2] === NB), b = cases.filter(x => !x[1] && !nr.includes(x)); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length - nr.length}/${cases.length - nr.length} cases${nr.length ? ` · not run without a browser: ${nr.length}` : ""}`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
