// The cases of the code label and an option's signature (admin-team/dashboards/code-label-and-sigblock, dated 42), run by verify-templates.js
// (it passes its helpers in), or on its own with no browser: node verify/cases-code-label.js [--out <dir>].
// 1. The code label on every template (GUIDANCE.md §12, "Code"): every inline code a label of its own, the surface-2 fill, a hairline border,
//    1 × 4 px padding and a 3 px radius, in both themes (the two tokens defined in each palette), at normal weight inside bold text (b, strong,
//    .name, .nm, dt, th), and plain mono text inside a chip, a pill or a tile; the feature probe finds it on each template and misses it on a
//    template without it.
// 2. An option's signature (plan/RULES.md §2, "An option's signature"): a field of its own, drawn verbatim beneath the option's short name as
//    a block of code (code.codeblock) in the Considered cell (and the inspector's "Weighed against" list, the same button), the inspector
//    (.sigblock) and the Decisions table, its text in the button's aria-label; an option without one draws its name alone, as before.
// 3. Code spans in a row's name are code wherever the name is drawn: the issue board's header title (a title taken from a unit row's name),
//    and a state board's "last amended by" title.
// 4. check.js validates the field: a signature that is not a non-empty string fails; one wrapped in backticks, or one its name repeats, is
//    warned on; a name written before the field, carrying a signature, is left as it is (no warning, in flight or landed); a signature is code, so the internal-name scan and the issue-reference scan leave it alone. fill.js merges a signature onto an option by its id.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesCodeLabel(X) {
  const { sk, out, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env: { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") } });
  const F = require(sk("system/scripts/features.js")), lib = require(sk("plan/scripts/lib.js"));
  const T = { "plan/template/dashboard.html": ["plan-board"], "plan/template/board.html": ["work-board"], "system/template/system.html": ["system"], "system/template/supersystem.html": ["supersystem"] };
  const H = Object.fromEntries(Object.keys(T).map(n => [n, rd(tp(n))])), PB = H["plan/template/dashboard.html"];
  const sc = path.join(out, "code-label"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js"), FILL = sk("plan/scripts/fill.js");
  const EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json"))), LIVE = JSON.parse(rd(sk("verify/fixtures/live-issue.plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const def = (h, name) => { const m = new RegExp(`^const ${name}=.*$`, "m").exec(h); return m ? m[0] : null; };
  const helpers = (h, names) => { const ctx = {}; vm.createContext(ctx); names.forEach(n => { const d = def(h, n); if (!d) throw new Error(`no const ${n}= in the template`); vm.runInContext(d.replace(/^const /, "var "), ctx); }); return ctx; };
  /* a board in a tree of its own: its plan.json, the template under test, embedded */
  let n = 0;
  const board = (d) => { const root = path.join(sc, `t-${++n}`), dir = path.join(root, ...d.folder.split("/")); fs.mkdirSync(path.join(root, "docs", "plans"), { recursive: true });
    wr(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), PB); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(0, 300)); return dir; };
  const check = dir => { const r = run(CHECK, [dir]); return { status: r.status, text: (r.stdout || "") + (r.stderr || "") }; };
  const SIG = "getOrLoad(key, policy, maxAge, loader): Result<Lookup<V>>";

  guard("the code label on every template: a label of its own, normal weight inside bold text, plain inside chips, pills and tiles (GUIDANCE.md §12, \"Code\")", c => {
    Object.entries(T).forEach(([name, [kind]]) => {
      const s = css(H[name]);
      c.push([`${name}: code drawn as a label (surface-2 fill, hairline border, 1 × 4 px padding, 3 px radius)`, /(?:^|\n)code\{font-family:var\(--mono\);font-size:\.92em;overflow-wrap:anywhere;background:var\(--surface-2\);border:1px solid var\(--hair\);padding:1px 4px;border-radius:3px\}/.test(s), name]);
      c.push([`${name}: both tokens in both palettes (light, dark by the system setting, dark by the switch)`, (s.match(/--surface-2:/g) || []).length >= 3 && (s.match(/--hair:/g) || []).length >= 3, js([(s.match(/--surface-2:/g) || []).length, (s.match(/--hair:/g) || []).length])]);
      c.push([`${name}: normal weight inside bold text; plain inside a chip, a pill or a tile`, /:is\(b,strong,\.name,\.nm,dt,th\) code\{font-weight:400\}/.test(s) && /:is\(\[class\*="chip"\],\[class\*="pill"\],\[class\*="tile"\]\) code\{background:none;border:0;padding:0;border-radius:0\}/.test(s), name]);
      const miss = F.probe(H[name], kind).filter(m => m.id === "code-label");
      c.push([`${name}: the feature probe finds it`, !miss.length, js(miss)]);
      const old = H[name].replace(/;background:var\(--surface-2\);border:1px solid var\(--hair\);padding:1px 4px;border-radius:3px\}/, "}");
      c.push([`${name}: the probe misses it on a template without it (FEATURE MISSING)`, F.probe(old, kind).some(m => m.id === "code-label"), name]);
    });
  });

  guard("an option's signature beneath its short name, a block of code, in the Considered cell, the inspector and the Decisions table (plan/RULES.md §2)", c => {
    const X = helpers(PB, ["esc", "sigOf", "sigCode", "sigText"]);
    c.push(["sigCode(): the signature verbatim, escaped, as code.codeblock", X.sigCode({ signature: SIG }) === `<code class="codeblock">getOrLoad(key, policy, maxAge, loader): Result&lt;Lookup&lt;V&gt;&gt;</code>`, X.sigCode({ signature: SIG })]);
    c.push(["an option without a signature (or an empty one) draws nothing more: its name alone, as before", X.sigCode({ name: "x" }) === "" && X.sigCode({ signature: "  " }) === "" && X.sigCode(null) === "" && X.sigText({}) === "", js([X.sigCode({ name: "x" }), X.sigText({})])]);
    c.push(["sigText(): the signature in the button's aria-label, escaped", X.sigText({ signature: SIG }) === ", signature getOrLoad(key, policy, maxAge, loader): Result&lt;Lookup&lt;V&gt;&gt;", X.sigText({ signature: SIG })]);
    const s = PB.replace(/\/\*[\s\S]*?\*\//g, "");
    const sites = { "the Considered cell's option button (and the inspector's Weighed against list)": /aria-label="\$\{esc\(word\)\}: \$\{nameText\(o\)\}\$\{sigText\(o\)\}"[\s\S]{0,120}<span>\$\{codeOnly\(o\.name\)\}\$\{sigCode\(o\)\}<\/span>/,
      "the inspector, beneath the name": /<div class="name">\$\{codeOnly\(o\.name\)\}<\/div>\$\{sigOf\(o\)\?`<div class="sigblock">\$\{sigCode\(o\)\}<\/div>`:""\}/,
      "the Decisions table's Option column": /<td><b>\$\{rich\(opt\.name\)\}<\/b>\$\{sigCode\(opt\)\}/ };
    const miss = Object.entries(sites).filter(([, re]) => !re.test(s)).map(([k]) => k);
    c.push(["each site draws the signature beneath the name", !miss.length, js(miss)]);
    const k = css(PB);
    c.push(["code.codeblock: the code label set as a block, wrapping in itself (the approved look)", /code\.codeblock\{display:block;margin:3px 0;padding:3px 6px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1\.4;font-weight:400\}/.test(k) && /\.inspector \.sigblock code\.codeblock\{font-size:12\.5px;margin:5px 0 6px\}/.test(k), "css"]);
    const miss2 = F.probe(PB, "plan-board").filter(m => m.id === "option-signature");
    c.push(["the feature probe finds it on the issue-board template; it applies to no other type", !miss2.length && F.applicable("work-board").every(f => f.id !== "option-signature") && F.applicable("system").every(f => f.id !== "option-signature"), js(miss2)]);
    c.push(["the plan.json skeleton shows the field on an option", /"signature": "<optional: the signature the name stands for/.test(rd(sk("plan/template/plan.json"))), "plan/template/plan.json"]);
  });

  guard("code spans in a name drawn as code: the issue board's header title, a state board's \"last amended by\" title", c => {
    c.push(["the issue board's title (a unit row's name at its foundation) through codeOnly()", /#\$\{esc\(PLAN\.issue\)\}<\/a> · \$\{codeOnly\(PLAN\.title\|\|""\)\}`;/.test(PB), "plan/template/dashboard.html"]);
    ["system/template/system.html", "system/template/supersystem.html"].forEach(name =>
      c.push([`${name}: the last amendment's title draws its code spans as code`, /<a data-board="\$\{la\.issue\}">\$\{esc\(la\.title\)\.replace\(\/`\(\[\^`\]\*\)`\/g,"<code>\$1<\/code>"\)\}<\/a>/.test(H[name]), name]));
  });

  guard("check.js validates an option's signature; fill.js merges one; the scans leave it alone (plan/RULES.md §2, §8)", c => {
    const live = f => { const d = copy(LIVE); f(d); return d; }, landed = f => { const d = copy(EX); f(d); return d; };
    const opt = (d, row, id) => d.rows.find(r => r.id === row).options.find(o => o.id === id);
    const ok = check(board(live(d => { const o = opt(d, "routing", "one-parse-four-way"); o.name = "One split, one parse, a single `route`"; o.signature = "fun route(datagram: Datagram): Route"; })));
    c.push(["a board whose option carries a signature passes, with no signature warning", ok.status === 0 && !/signature/i.test(ok.text), ok.text.slice(-400)]);
    const empty = check(board(live(d => { opt(d, "routing", "one-parse-four-way").signature = ""; })));
    const num = check(board(live(d => { opt(d, "routing", "one-parse-four-way").signature = 42; })));
    c.push(["a signature that is not a non-empty string fails", empty.status !== 0 && /options\[0\]\.signature must be a non-empty string/.test(empty.text) && num.status !== 0 && /signature must be a non-empty string/.test(num.text), js([empty.status, num.status])]);
    const tick = check(board(live(d => { opt(d, "routing", "one-parse-four-way").signature = "`fun route(d: Datagram): Route`"; })));
    c.push(["a signature wrapped in backticks is warned on", /signature is wrapped in backticks/.test(tick.text), tick.text.slice(-300)]);
    const rep = check(board(live(d => { const o = opt(d, "routing", "one-parse-four-way"); o.name = "A single `fun route(d: Datagram): Route`"; o.signature = "fun route(d: Datagram): Route"; })));
    c.push(["a name that repeats its signature is warned on", /the name repeats its signature/.test(rep.text), rep.text.slice(-300)]);
    const inName = live(d => { opt(d, "routing", "one-parse-four-way").name = "A single suspend `" + SIG + "`"; });
    const w = check(board(inName)), wl = check(board(landed(d => { opt(d, "routing", "one-parse-four-way").name = "A single suspend `" + SIG + "`"; })));
    c.push(["an option written before the field keeps its name: a name carrying a signature draws no warning, in flight or landed", w.status === 0 && !/signature/i.test(w.text) && !/signature/i.test(wl.text), (w.text + wl.text).slice(-300)]);
    const nm = check(board(live(d => { opt(d, "routing", "one-parse-four-way").signature = "fun plan(planner: Planner, the planner's: Int): Plan"; })));
    c.push(["the internal-name scan leaves a signature alone (code, never prose)", !/INTERNAL NAME[^\n]*signature/.test(nm.text), nm.text.slice(-300)]);
    const d0 = live(d => { opt(d, "routing", "one-parse-four-way").signature = "fun route(issue: Int = #12): Route"; });
    c.push(["lib.issueRefs() reads no issue in a signature", !lib.issueRefs(d0).some(r => /signature/.test(r.at)), js(lib.issueRefs(d0).filter(r => /signature/.test(r.at)))]);
    const dir = board(live(() => {})), f = wr(path.join(sc, "fields.json"), js({ rows: [{ id: "routing", options: [{ id: "one-parse-four-way", name: "One split, one parse, a single `route`", signature: "fun route(datagram: Datagram): Route" }] }] }));
    const a = run(FILL, [dir, "--fields", f, "--json"]), p = JSON.parse(rd(path.join(dir, "plan.json"))), o = opt(p, "routing", "one-parse-four-way");
    c.push(["fill.js merges a signature onto the option it names by id, leaving its other fields and options", a.status === 0 && o.signature === "fun route(datagram: Datagram): Route" && o.verdict === "accepted" && p.rows.find(r => r.id === "routing").options.length === 3 && rd(path.join(dir, "dashboard.html")).includes("fun route(datagram: Datagram): Route"), js([a.status, (a.stdout || "").slice(-200), o])]);
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
