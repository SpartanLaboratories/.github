// The cases of the Gap cell's marks (admin-team/dashboards/gap-marks, dated 44), run by verify-templates.js (it passes its helpers in), or on
// its own with no browser: node verify/cases-gap-marks.js [--out <dir>].
// 1. The marks (plan/RULES.md §2, "The Gap cell"), the template's own helpers run outside a browser, every one derived from the row's data:
//    the evidence count label ("· 2 evidence", the figure muted at zero), the where chip (the row's where, its code spans plain inside the
//    chip; none without one), the baseline chip ("at <sha>", opening the commit; a plain chip without a repository or a commit-like sha; none
//    without a sha), and the bold lead (the summary's first sentence: ".", "!" or "?" and a space, outside a code span, not after "e.g.",
//    "i.e.", "vs." or "cf."; none for a one-sentence summary).
// 2. The cell: cellGap() puts the count label in the head after the kind chip, the lead in the summary, and the where chip, the baseline
//    chip and the research link in the foot, with no count left there; a gap not yet written draws as before.
// 3. Code spans drawn as code, never as literal backticks: a row's name on every site (rowTitle(), codeOnly(), nameText() in attributes),
//    and a row's where on the row label and the As built card (code labels) and in the inspector (dropped inside its one code label).
// 4. The look: the count label's figure in ink, muted at zero; the chips with the kind chip's look, their class carrying the type word, so
//    the code label rule keeps code plain inside them (GUIDANCE.md §12, "Code").
// 5. The feature probe (gap-marks): found on the issue-board template, missed on a template without it, for issue and tracking boards only
//    (each other type's reason stated); check.js --auto passes a board in flight embedded from the template and fails one embedded from a
//    template without it (FEATURE MISSING), and only reports it on a landed board.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesGapMarks(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const sc = path.join(out, "gap-marks"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env: { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") } });
  const F = require(sk("system/scripts/features.js"));
  const PB = rd(tp("plan/template/dashboard.html"));
  const CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js");
  const EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json"))), LIVE = JSON.parse(rd(sk("verify/fixtures/live-issue.plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const line = (h, re) => { const m = re.exec(h); if (!m) throw new Error("not in the template: " + re); return m[0]; };
  const def = (h, name) => line(h, new RegExp(`^const ${name}=.*$`, "m"));
  /* the template's helpers, run in a context with a repository and a baseline; rich() without linkRefs (its links are not what these test) */
  const ctxOf = (repo, base) => { const ctx = { REPO: repo, PLAN: { baseline: base }, cellGlow: () => "", linkRefs: t => ctx.esc(t) }; vm.createContext(ctx);
    ["esc", "rich", "codeOnly", "nameText", "moreLink", "evidenceLabel", "whereChip", "baselineChip", "leadSplit", "gapSum"].forEach(n => vm.runInContext(def(PB, n).replace(/^const /, "var "), ctx));
    vm.runInContext(line(PB, /^function cellGap\(r\)\{.*\}$/m), ctx); return ctx; };
  const REPO = "https://github.com/SpartanLaboratories/WebTools", H = ctxOf(REPO, { ref: "master", sha: "e8f0a88", date: "2026-11-03" });

  guard("the Gap cell's marks, each derived from the row's data (plan/RULES.md §2, \"The Gap cell\")", c => {
    c.push(["the evidence count label: \"· n evidence\", the figure in bold", H.evidenceLabel(2) === '<span class="count-label">· <b>2</b> evidence</span>', H.evidenceLabel(2)]);
    c.push(["…muted at zero (the zero class)", H.evidenceLabel(0) === '<span class="count-label zero">· <b>0</b> evidence</span>', H.evidenceLabel(0)]);
    c.push(["the where chip: the row's where, titled; its code spans as code (plain inside the chip), never literal backticks", H.whereChip({ where: "jvmTest (new, `testing.component`)" }) === '<span class="where-chip" title="where">jvmTest (new, <code>testing.component</code>)</span>', H.whereChip({ where: "jvmTest (new, `testing.component`)" })]);
    c.push(["…escaped, and none for a row without a where", H.whereChip({ where: "a<b>/ (new)" }) === '<span class="where-chip" title="where">a&lt;b&gt;/ (new)</span>' && H.whereChip({}) === "" && H.whereChip({ where: "" }) === "" && H.whereChip(null) === "", js([H.whereChip({ where: "a<b>/ (new)" }), H.whereChip({})])]);
    c.push(["the baseline chip: \"at <sha>\", opening the commit in a new tab, titled with the baseline's ref", H.baselineChip({ ref: "master", sha: "e8f0a88" }) === `<a class="baseline-chip" href="${REPO}/commit/e8f0a88" target="_blank" rel="noopener" title="the baseline: master">at e8f0a88</a>`, H.baselineChip({ ref: "master", sha: "e8f0a88" })]);
    const N = ctxOf("", {});
    c.push(["…a plain chip on a board with no repository, or a sha that is not a commit's; none without a sha", N.baselineChip({ sha: "e8f0a88" }) === '<span class="baseline-chip" title="the baseline">at e8f0a88</span>' && H.baselineChip({ sha: "HEAD<x>" }) === '<span class="baseline-chip" title="the baseline">at HEAD&lt;x&gt;</span>' && H.baselineChip({ ref: "master" }) === "" && H.baselineChip(undefined) === "", js([N.baselineChip({ sha: "e8f0a88" }), H.baselineChip({ sha: "HEAD<x>" }), H.baselineChip({})])]);
    const L = s => js(H.leadSplit(s));
    c.push(["the lead: the first sentence, and the rest after it", L("Nothing names a cached value. A `Url` will not do.") === js(["Nothing names a cached value.", "A `Url` will not do."]), L("Nothing names a cached value. A `Url` will not do.")]);
    c.push(["…none for a one-sentence summary (bolding all of it would set nothing apart), an empty one or a trailing space", H.leadSplit("Only one sentence.") === null && H.leadSplit("Ends here. ") === null && H.leadSplit("") === null && H.leadSplit(undefined) === null, L("Ends here. ")]);
    c.push(["…a full stop inside a code span ends no sentence", L("Call `a. b()` first. Then x.") === js(["Call `a. b()` first.", "Then x."]), L("Call `a. b()` first. Then x.")]);
    c.push(["…nor one after \"e.g.\", \"i.e.\", \"vs.\" or \"cf.\"", L("Some, e.g. this one, i.e. that, vs. another, cf. ours. Next.") === js(["Some, e.g. this one, i.e. that, vs. another, cf. ours.", "Next."]), L("Some, e.g. this one, i.e. that, vs. another, cf. ours. Next.")]);
    c.push(["…\"?\" and \"!\" end one too; a version number's dots do not", L("Is it? Yes!") === js(["Is it?", "Yes!"]) && L("Rome 2.1.0 is hardened. It parses.") === js(["Rome 2.1.0 is hardened.", "It parses."]), L("Rome 2.1.0 is hardened. It parses.")]);
    c.push(["the summary: the lead in bold, each part's code spans whole; a one-sentence summary as before; an unwritten gap \"Not yet written.\"",
      H.gapSum({ summary: "No `Url` will do. Its `equals` is on bytes." }) === '<b class="gap-lead">No <code>Url</code> will do.</b> Its <code>equals</code> is on bytes.' && H.gapSum({ summary: "One `x` only." }) === "One <code>x</code> only." && H.gapSum({}) === "Not yet written." && H.gapSum(null) === "Not yet written.",
      js([H.gapSum({ summary: "No `Url` will do. Its `equals` is on bytes." }), H.gapSum({ summary: "One `x` only." })])]);
  });

  guard("the cell: the count label in its head, the lead in its summary, the chips and the research link in its foot", c => {
    const r = { id: "cache-key", name: "`CacheKey<V>`: the key", where: "common/ (new)", gap: { kind: "missing", summary: "Nothing names a cached value. A `Url` will not do.", evidence: ["a.kt:1", "b.kt:2"], link: "../research/README.md#response-cache" } };
    const h = H.cellGap(r);
    c.push(["the head: the kind chip, then the count label", h.includes('<div class="kick">1 · GAP <span class="kind">missing</span><span class="count-label">· <b>2</b> evidence</span></div>'), h.slice(0, 400)]);
    c.push(["the summary opens with the bold lead", h.includes('<div class="sum"><b class="gap-lead">Nothing names a cached value.</b> A <code>Url</code> will not do.</div>'), h]);
    c.push(["the foot: the where chip, the baseline chip, the research link, in that order; no count left there", h.includes(`<div class="meta"><span class="where-chip" title="where">common/ (new)</span><a class="baseline-chip" href="${REPO}/commit/e8f0a88" target="_blank" rel="noopener" title="the baseline: master">at e8f0a88</a><a class="more" href="../research/README.md#response-cache">research ›</a></div>`) && !/<span>\d+ evidence<\/span>/.test(h), h.slice(-400)]);
    c.push(["the cell's label names the row without backticks", h.includes('aria-label="Gap: CacheKey&lt;V&gt;: the key"'), (/aria-label="[^"]*"/.exec(h) || [""])[0]]);
    const u = H.cellGap({ id: "x", name: "x" });
    c.push(["a gap not yet written: no kind, \"· 0 evidence\" muted, \"Not yet written.\", the baseline chip alone in its foot", u.includes('<div class="kick">1 · GAP<span class="count-label zero">· <b>0</b> evidence</span></div><div class="sum">Not yet written.</div>') && /<div class="meta"><a class="baseline-chip"[^>]*>at e8f0a88<\/a><\/div>/.test(u), u]);
    const N = ctxOf(REPO, {}).cellGap({ id: "x", name: "x", gap: { summary: "One." } });
    c.push(["a board with no baseline sha and a row with no where draw no chips", /<div class="meta"><\/div>/.test(N), N]);
    const ex = EX.rows.map(x => H.cellGap(x));
    c.push(["every row of the landed example draws one count label, in its head, matching its evidence", ex.every((x, i) => (x.match(/class="count-label/g) || []).length === 1 && x.includes(`<b>${(EX.rows[i].gap.evidence || []).length}</b> evidence`)), ex.length + " rows"]);
  });

  guard("code spans drawn as code, never as literal backticks: a row's name on every site, a row's where on the row label, the card and the inspector", c => {
    const s = PB.replace(/\/\*[\s\S]*?\*\//g, "");
    c.push(["no site draws a row's name through esc() (rowTitle(), codeOnly(), unitName(), pair() and, in attributes, nameText())", !/esc\((?:r|row|x\.row|u)\.name\)/.test(s), (s.match(/.{60}esc\((?:r|row|x\.row|u)\.name\).{20}/g) || []).slice(0, 3).join(" | ")]);
    c.push(["the row label's title through rowTitle(), which draws a row's name through codeOnly()", /<div class="nm">\$\{rowTitle\(r\)\}<\/div>/.test(s) && /function rowTitle\(r\)\{ const u=r\.unit; if\(!u\) return codeOnly\(r\.name\);/.test(s) && /\$\{u\.issue\?pair\(u\.issue,r\.name\):codeOnly\(r\.name\)\}/.test(s), "rowTitle"]);
    c.push(["a row's where: code labels on the row label and the As built card, never esc()", /\$\{r\.where\?`<div class="wh">\$\{codeOnly\(r\.where\)\}<\/div>`:""\}/.test(s) && /\$\{r\.where\?`<span class="wh">\$\{codeOnly\(r\.where\)\}<\/span>`:""\}/.test(s) && !/esc\(r\.where\)/.test(s), (s.match(/.{40}r\.where.{40}/g) || []).join(" | ")]);
    c.push(["…and in the inspector, its backticks dropped inside its one code label", /\$\{r\.where\?` · <code>\$\{esc\(String\(r\.where\)\.replace\(\/`\/g,""\)\)\}<\/code>`:""\}/.test(s), "whereOf"]);
    const ctx = ctxOf(REPO, {}); vm.runInContext(line(PB, /^function rowTitle\(r\)\{.*$/m) + "\n" + line(PB, /^  return `\$\{u\.n!=null.*$/m), ctx);
    const rows = [...[LIVE, EX].flatMap(d => d.rows), { name: "The `FeedParser` port, `FeedInput` and `FeedLimits`" }, { name: "`close()` and `HttpFailure.Closed(\"cache\")`" }, { name: "`RomeFeedParser`, the supplied parser", unit: { n: 3 } }].filter(r => /`/.test(r.name || ""));
    c.push(["every name with a code span in the fixtures draws it as code and keeps no backtick", rows.length > 0 && rows.every(r => !/`/.test(ctx.rowTitle(r)) && /<code>/.test(ctx.rowTitle(r))), rows.length + " names; " + (rows[0] ? ctx.rowTitle(rows[0]) : "")]);
  });

  guard("the look: the count label's figure in ink and muted at zero; the chips with the kind chip's look, code plain inside them", c => {
    const k = css(PB);
    const want = [/\.cell \.kick \.count-label\{font-weight:400;letter-spacing:\.04em;color:var\(--muted\)\}/, /\.cell \.kick \.count-label b\{color:var\(--ink\);font-weight:700\}/, /\.cell \.kick \.count-label\.zero b\{color:var\(--muted\);font-weight:400\}/,
      /\.cell \.sum b\.gap-lead\{font-weight:700\}/, /\.cell \.meta :is\(\.where-chip,\.baseline-chip\)\{font:600 10px var\(--mono\);color:var\(--ink-2\);border:1px solid var\(--line\);border-radius:3px;padding:1px 5px;letter-spacing:\.04em;text-decoration:none;[^}]*overflow-wrap:anywhere\}/, /\.cell \.meta a\.baseline-chip:hover\{/];
    const miss = want.filter(re => !re.test(k)).map(String);
    c.push(["the CSS: the count label, its zero, the lead, the two chips", !miss.length, js(miss)]);
    c.push(["the kind chip's look, the same font, colour, border and padding", /\.cell \.kick \.kind\{color:var\(--ink-2\);border:1px solid var\(--line\);border-radius:3px;padding:1px 5px;letter-spacing:\.04em;font-weight:600\}/.test(k), "kind"]);
    c.push(["the chips' classes carry the type word, which the code label rule keeps plain inside", /:is\(\[class\*="chip"\],\[class\*="pill"\],\[class\*="tile"\]\) code\{background:none;border:0;padding:0;border-radius:0\}/.test(k) && /class="where-chip"/.test(PB) && /class="baseline-chip"/.test(PB), "code-label rule"]);
    c.push(["no chip or count is dashed (GUIDANCE.md §1: dashed means planned or pending)", !/\.(?:count-label|where-chip|baseline-chip)[^{]*\{[^}]*dashed/.test(k), "css"]);
  });

  guard("the feature probe (gap-marks) and check.js on boards made from the template", c => {
    const miss = F.probe(PB, "plan-board").filter(m => m.id === "gap-marks");
    c.push(["the probe finds it on the issue-board template", !miss.length, js(miss)]);
    const now = line(PB, /^function cellGap\(r\)\{.*\}$/m);
    const was = 'function cellGap(r){ const g=r.gap||{}; return `<div class="cell gap${cellGlow(r.id,"gap")}" role="button" tabindex="0" data-row="${esc(r.id)}" data-col="gap" aria-label="Gap: ${nameText(r)}"><div class="kick">1 · GAP${g.kind?` <span class="kind">${esc(g.kind)}</span>`:""}</div><div class="sum">${rich(g.summary||"Not yet written.")}</div><div class="meta"><span>${(g.evidence||[]).length} evidence</span>${moreLink(g.link,"research")}</div></div>`; }';
    const old = PB.replace(now, was);
    const m = F.probe(old, "plan-board").find(x => x.id === "gap-marks");
    c.push(["the probe misses it on a template whose Gap cell keeps its count in its foot (FEATURE MISSING, since dashboards-skill/44)", old !== PB && !!m && /FEATURE MISSING: the Gap cell's marks/.test(F.line(m)) && /dashboards-skill\/44/.test(F.line(m)), m ? F.line(m) : "not missed"]);
    const f = F.FEATURES.find(x => x.id === "gap-marks") || {};
    c.push(["it applies to issue and tracking boards only, each other type with its reason", js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f.notFor && f.notFor[k] && F.applicable(k).every(x => x.id !== "gap-marks")), js(f.notFor || null)]);
    let n = 0;
    const board = (d, tpl) => { const root = path.join(sc, `t-${++n}`), dir = path.join(root, ...d.folder.split("/")); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
      wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(0, 300)); return dir; };
    const ok = run(CHECK, [board(copy(LIVE), PB), "--auto"]);
    c.push(["check.js --auto passes a board in flight made from the template", ok.status === 0 && !/FEATURE MISSING[^\n]*Gap cell's marks/.test(ok.stdout + ok.stderr), (ok.stdout + ok.stderr).slice(-400)]);
    const bad = run(CHECK, [board(copy(LIVE), old), "--auto"]);
    c.push(["…and fails one made from a template without it (FEATURE MISSING)", bad.status !== 0 && /FEATURE MISSING: the Gap cell's marks/.test(bad.stdout + bad.stderr), (bad.stdout + bad.stderr).slice(-400)]);
    const landed = run(CHECK, [board(copy(EX), old), "--auto"]);
    const failLines = (landed.stdout + landed.stderr).split(/\r?\n/).filter(l => /FAIL/.test(l)).join("\n");
    c.push(["a landed board made before it is reported, never failed for it (it is kept as it landed)", !/FEATURE MISSING: the Gap cell's marks/.test(failLines), (landed.stdout + landed.stderr).slice(-400)]);
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
