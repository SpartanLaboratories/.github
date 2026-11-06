// The cases of the header's switches (admin-team/dashboards-skill/theme-switch and /inspector-switch, the user's decisions of 2026-11-05; the
// features dated 39), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-switches.js [--out <dir>].
// GUIDANCE.md §12, "Switch": a track with a knob that slides to the side of the state shown, a real toggle (role="switch", aria-checked),
// in the neutrals, the knob jumping under reduced motion. The theme switch on every dashboard type and on the rendered Markdown copies
// (☀ light, ☾ night); the inspector switch on every board with an inspector (system, supersystem and repository state boards, issue and
// tracking boards; not the repository work board, which has none): shown by default, the choice remembered across boards and reloads
// (localStorage "dashboards-inspector", applied before the first paint), an item clicked while it is hidden showing it again, the tab taking
// the freed width. The switches' scripts run here against a small stand-in for the DOM, so their behaviour is checked with no browser;
// the rendered boards are checked only with --browser. And the decision path's legend, which names "planned, not built" only where a
// node is planned (the defect of every state board's flowKey()). Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), vm = require("vm");

module.exports = function casesSwitches(X) {
  const { sk, out, targets } = X, dumpDom = X.dumpDom || (() => null);
  const NEEDS_BROWSER = X.NEEDS_BROWSER || "needs a browser: not run (verify-templates.js --browser runs it)";
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; }, js = x => JSON.stringify(x);
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const F = require(sk("system/scripts/features.js")), md = require(sk("plan/scripts/mdcopy.js"));
  const sc = path.join(out, "switches"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const T = { "plan-board": rd(tp("plan/template/dashboard.html")), "work-board": rd(tp("plan/template/board.html")), system: rd(tp("system/template/system.html")), supersystem: rd(tp("system/template/supersystem.html")) };
  const NAME = { "plan-board": "the issue and tracking board template", "work-board": "the repository work board template", system: "the system board template", supersystem: "the supersystem and repository state board template" };
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n"), head = h => (/<head>([\s\S]*?)<\/head>/.exec(h) || [, ""])[1];
  const iife = (h, name) => { const a = h.indexOf(`(function ${name}(){`); if (a < 0) return null; const b = h.indexOf("label(); })();", a); return b < 0 ? null : h.slice(a, b + "label(); })();".length); };

  /* ---------- a small stand-in for the DOM: enough for the switches' scripts ---------- */
  function dom(opts) {
    const store = new Map(Object.entries(opts.stored || {})), timers = [], micro = [], doc = { listeners: {} }, byId = new Map(), observers = [];
    const el = (id, attrs) => { const e = { id, attrs: { ...(attrs || {}) }, className: (attrs || {}).class || "", innerHTML: (attrs || {}).html || "", listeners: {}, parentElement: null, dataset: {},
      getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }, setAttribute(n, v) { this.attrs[n] = String(v); }, removeAttribute(n) { delete this.attrs[n]; },
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      querySelector(s) { const cls = (/^\.([\w-]+)$/.exec(s) || [])[1]; return cls && new RegExp(`class="${cls}"`).test(this.innerHTML) ? {} : null; },
      closest(sel) { const roles = [...sel.matchAll(/\[role="([^"]+)"\]/g)].map(m => m[1]); return roles.includes(this.attrs.role) ? this : null; },
      insertBefore(n, ref) { n.parentElement = this; n.before = ref ? ref.id : null; if (n.id) byId.set(n.id, n); },
      set type(v) { this.attrs.type = v; }, get type() { return this.attrs.type; } }; if (id) byId.set(id, e); return e; };
    const tools = el("tools"), root = { dataset: { ...(opts.root || {}) } };
    (opts.els || []).forEach(([id, attrs]) => { const e = el(id, attrs); e.parentElement = tools; });
    const resized = { n: 0 };
    const document = { documentElement: root, getElementById: id => byId.get(id) || null, querySelector: () => null, createElement: () => el(null),
      addEventListener(t, f, cap) { (doc.listeners[t] = doc.listeners[t] || []).push(f); } };
    class MO { constructor(f) { this.f = f; observers.push(this); } observe(t, o) { this.t = t; this.o = o; } }
    const ctx = vm.createContext({ document, window: { matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: MO, dispatchEvent: e => { if (e.type === "resize") resized.n++; } },
      localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
      matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: MO, setTimeout: f => timers.push(f), Event: class { constructor(t) { this.type = t; } } });
    const flush = () => { while (micro.length) micro.shift()(); while (timers.length) timers.shift()(); };
    /* a write into an observed element: its observers' callbacks queued, as a microtask after the handler */
    const write = target => observers.filter(o => o.t === target).forEach(o => micro.push(() => o.f([{ type: "childList" }])));
    /* a gesture: the document's capture listeners, then the target's own, then the microtasks, then the timers */
    const fire = (target, type, key) => { const e = { type, target, key, preventDefault() {} }; (doc.listeners[type] || []).forEach(f => f(e)); (target.listeners[type] || []).forEach(f => f(e)); flush(); };
    return { ctx, el, byId, root, store, fire, write, flush, resized, run: code => { vm.runInContext(code, ctx); flush(); } };
  }

  guard("the theme switch, drawn as a switch on every dashboard type and on the rendered Markdown copies", c => {
    Object.entries(T).forEach(([k, h]) => {
      const code = iife(h, "themeSwitch");
      c.push([`${NAME[k]}: no theme button left (.themebtn, aria-pressed set on the theme control)`, !/themebtn/.test(h) && !!code && !/setAttribute\("aria-pressed"/.test(code), code ? "themeSwitch() found" : "no themeSwitch()"]);
      /* an old board's theme button, a word in it, is made a switch in place: role, the track and knob, the ends, aria-checked, no aria-pressed */
      const D = dom({ els: [["theme", { class: "themebtn", html: "☀ light", "aria-pressed": "false", type: "button" }]] }); D.run(code); const b = D.byId.get("theme");
      c.push([`${NAME[k]}: an old theme button becomes the switch: role=switch, the track and its knob, ☀ and ☾ at its ends, aria-checked false while light, no aria-pressed`,
        b.className === "switch" && b.attrs.role === "switch" && b.attrs["aria-checked"] === "false" && !("aria-pressed" in b.attrs) && /class="switch-track"[\s\S]*class="switch-knob"/.test(b.innerHTML) && /☀[\s\S]*switch-track[\s\S]*☾/.test(b.innerHTML) && /follows the system setting/.test(b.attrs["aria-label"]), js({ cls: b.className, attrs: b.attrs, html: b.innerHTML.slice(0, 120) })]);
      D.fire(b, "click");
      c.push([`${NAME[k]}: a click picks night, remembers it and checks the switch; a second click goes back to light`, D.root.dataset.theme === "dark" && D.store.get("dashboards-theme") === "dark" && b.attrs["aria-checked"] === "true" && /^Night theme$/.test(b.attrs["aria-label"])
        && (D.fire(b, "click"), D.root.dataset.theme === "light" && D.store.get("dashboards-theme") === "light" && b.attrs["aria-checked"] === "false"), js({ theme: D.root.dataset.theme, stored: D.store.get("dashboards-theme"), checked: b.attrs["aria-checked"] })]);
      const cs = css(h), rules = cs.match(/\.switch[^{]*\{[^}]*\}/g) || [];
      c.push([`${NAME[k]}: the switch's CSS: a track, a knob that slides when checked, jumping under reduced motion, and only neutrals (no accent, no status colour)`,
        /\.switch-track\{[^}]*transition:/.test(cs) && /\.switch\[aria-checked="true"\] \.switch-knob\{transform:translateX\(12px\)/.test(cs) && /prefers-reduced-motion:reduce\)\{\.switch-track,\.switch-knob\{transition:none\}\}/.test(cs) && rules.length >= 6 && !rules.some(r => /var\(--(accent|good|warning|serious|critical)\)/.test(r)), `${rules.length} switch rules`]);
      c.push([`${NAME[k]}: the feature probe holds it to the switch`, !F.probe(h, k).some(m => m.id === "switch-look"), js(F.probe(h, k).filter(m => m.id === "switch-look"))]);
    });
    c.push(["the feature probe fails a board whose theme control is the old button", F.probe(T.system.replace(/switch-track/g, "x-track"), "system").some(m => m.id === "switch-look" && m.since === "dashboards-skill/39"), "probe"]);
    /* the state boards' renderer adds the switch to a header that has none */
    ["system", "supersystem"].forEach(k => { const code = iife(T[k], "themeSwitch"); c.push([`${NAME[k]}: the renderer adds the theme switch to a header that has none, as a switch`, /tools\.innerHTML='<button class="switch" id="theme" type="button" role="switch" aria-checked="false"><\/button>'/.test(code), "themeSwitch()"]); });
    /* the Markdown copies carry the same switch */
    const pg = md.page("t", "docs/plans/x/plan.md", "a/b", "<p>x</p>"), pcode = (/<script>\s*(\(function themeSwitch\(\)\{[\s\S]*?\}\)\(\);)\s*<\/script>/.exec(pg) || [])[1];
    c.push(["a rendered Markdown copy: the switch with its ends, role=switch, no theme button, still under reduced motion", /<button class="switch" id="theme" type="button" role="switch" aria-checked="false"><span class="switch-end off" aria-hidden="true">☀<\/span><span class="switch-track" aria-hidden="true"><span class="switch-knob"><\/span><\/span><span class="switch-end on" aria-hidden="true">☾<\/span><\/button>/.test(pg) && !/themebtn|aria-pressed/.test(pg) && /prefers-reduced-motion:reduce\)\{\.switch-track,\.switch-knob\{transition:none\}\}/.test(pg), "mdcopy.js page()"]);
    if (pcode) { const D = dom({ els: [["theme", { class: "switch", role: "switch", html: '<span class="switch-track"></span>' }]] }); D.run(pcode); const b = D.byId.get("theme"); D.fire(b, "click");
      c.push(["…and its script checks it while night and remembers the choice", b.attrs["aria-checked"] === "true" && D.store.get("dashboards-theme") === "dark", js(b.attrs)]); }
    else c.push(["…and its script checks it while night and remembers the choice", false, "no themeSwitch() in the copy"]);
  });

  guard("the inspector switch on every board with an inspector, and not on the repository work board", c => {
    ["plan-board", "system", "supersystem"].forEach(k => {
      const h = T[k], code = iife(h, "inspectorSwitch"), cs = css(h);
      c.push([`${NAME[k]}: the choice applied in the head before the first paint, the hidden layout in the CSS`, /localStorage\.getItem\("dashboards-inspector"\)==="hidden"\)document\.documentElement\.dataset\.inspector="hidden"/.test(head(h)) && /:root\[data-inspector="hidden"\] \.stage\{grid-template-columns:minmax\(0,1fr\)\}/.test(cs) && /:root\[data-inspector="hidden"\] \.inspector\{display:none\}/.test(cs) && !!code, code ? "inspectorSwitch() found" : "no inspectorSwitch()"]);
      if (!code) return;
      const pre = k === "plan-board" ? [["inspector-switch", { class: "switch", role: "switch", "aria-checked": "true", "aria-controls": "inspector", type: "button" }]] : [];
      const mkD = stored => { const D = dom({ stored, els: [["inspector", {}], ...pre, ["theme", { class: "switch", role: "switch" }]] }); D.run(code); return D; };
      const D = mkD(); const sw = D.byId.get("inspector-switch"), ins = D.byId.get("inspector");
      c.push([`${NAME[k]}: shown by default: the switch checked, its knob right, controlling the inspector, left of the theme switch`, !!sw && sw.attrs.role === "switch" && sw.attrs["aria-checked"] === "true" && sw.attrs["aria-controls"] === "inspector" && /inspector<\/span><span class="switch-track"/.test(sw.innerHTML) && D.root.dataset.inspector === undefined && (k === "plan-board" || sw.before === "theme"),
        js(sw ? { attrs: sw.attrs, before: sw.before, html: sw.innerHTML } : null)]);
      D.fire(sw, "click");
      c.push([`${NAME[k]}: a click hides it, remembers "hidden" and lays the tab out again`, D.root.dataset.inspector === "hidden" && D.store.get("dashboards-inspector") === "hidden" && sw.attrs["aria-checked"] === "false" && D.resized.n === 1, js({ root: D.root.dataset, stored: D.store.get("dashboards-inspector"), checked: sw.attrs["aria-checked"], resized: D.resized.n })]);
      D.write(ins); D.flush();
      c.push([`${NAME[k]}: a write into the inspector with no gesture (a live redraw, a tab's default text at load) leaves it hidden`, D.root.dataset.inspector === "hidden", js(D.root.dataset)]);
      const tab = D.el("t-x", { role: "tab" }); tab.addEventListener("click", () => D.write(ins)); D.fire(tab, "click");
      c.push([`${NAME[k]}: clicking a tab, which writes its default text into the inspector, leaves it hidden`, D.root.dataset.inspector === "hidden", js(D.root.dataset)]);
      const item = D.el("cell"); item.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") D.write(ins); }); item.addEventListener("click", () => D.write(ins));
      D.fire(item, "keydown", "ArrowRight");
      c.push([`${NAME[k]}: a key other than Enter or Space on an item leaves it hidden`, D.root.dataset.inspector === "hidden", js(D.root.dataset)]);
      D.fire(item, "click");
      c.push([`${NAME[k]}: clicking an item while hidden shows it again, flips the switch and remembers "shown"`, D.root.dataset.inspector === undefined && sw.attrs["aria-checked"] === "true" && D.store.get("dashboards-inspector") === "shown", js({ root: D.root.dataset, stored: D.store.get("dashboards-inspector"), checked: sw.attrs["aria-checked"] })]);
      const E = mkD({ "dashboards-inspector": "hidden" }), esw = E.byId.get("inspector-switch");
      c.push([`${NAME[k]}: remembered across boards and reloads: a board opened with "hidden" stored opens hidden, the switch unchecked`, E.root.dataset.inspector === "hidden" && esw.attrs["aria-checked"] === "false", js({ root: E.root.dataset, checked: esw.attrs["aria-checked"] })]);
      const it2 = E.el("card"); it2.addEventListener("keydown", e => { if (e.key === "Enter") E.write(E.byId.get("inspector")); }); E.fire(it2, "keydown", "Enter");
      c.push([`${NAME[k]}: an item pressed with Enter while hidden shows it too`, E.root.dataset.inspector === undefined && esw.attrs["aria-checked"] === "true", js(E.root.dataset)]);
      c.push([`${NAME[k]}: the feature probe holds it to the inspector switch, and fails it without`, !F.probe(h, k).some(m => m.id === "inspector-switch") && F.probe(h.replace(/function inspectorSwitch\(/, "function x("), k).some(m => m.id === "inspector-switch" && m.since === "dashboards-skill/39"), "probe"]);
    });
    const ih = T["plan-board"];
    c.push(["the issue board's header: the inspector switch between the live indicator and the theme switch", /<span class="livechip" id="live"><\/span><button class="switch" id="inspector-switch" type="button" role="switch" aria-checked="true" aria-controls="inspector"><\/button><button class="switch" id="theme"/.test(ih), "header"]);
    const w = T["work-board"], fw = F.FEATURES.find(f => f.id === "inspector-switch");
    c.push(["the repository work board has no inspector, so no inspector switch, and the probe says why", !/id="inspector"|inspectorSwitch|dashboards-inspector/.test(w) && !F.applicable("work-board").some(f => f.id === "inspector-switch") && !!fw && !!(fw.notFor || {})["work-board"], fw ? js(fw.notFor) : "no detector"]);
  });

  guard("a state board brought onto the template carries both switches (splice.js, the head's script before the first paint)", c => {
    const V = require(sk("verify/verified.json")).templates;
    ["system", "supersystem"].forEach(k => {
      const key = `system/template/${k}.html`, rec = V[key] || {}, cur = require(sk("system/scripts/deviation.js")).sha(T[k]);
      const old = (rec.history || []).slice().reverse().find(v => v.sha256 !== cur && v.file && fs.existsSync(sk("verify/history/" + v.file)) && !/inspectorSwitch/.test(rd(sk("verify/history/" + v.file))));
      if (!old) { c.push([`${NAME[k]}: an older recorded version to splice from`, false, "none in verify/history/"]); return; }
      const root = path.join(sc, "splice-" + k), tdir = path.join(root, "docs", "dashboards", "_template"), page = wr(path.join(root, "docs", "dashboards", "b", "index.html"), rd(sk("verify/history/" + old.file)));
      wr(path.join(tdir, `${k}.html`), T[k]);
      const r = cp.spawnSync(process.execPath, [sk("system/scripts/splice.js"), page, "--template", tp(key)], { encoding: "utf8" }), h = rd(page);
      c.push([`${NAME[k]}: spliced from the version of ${old.verified || "?"} (${old.sha256.slice(0, 12)}), it carries the switch look and the inspector switch, its head reading the inspector's choice`,
        r.status === 0 && !F.probe(h, k).some(m => ["switch-look", "inspector-switch", "theme-prepaint"].includes(m.id)) && /the head's script before the first paint: replaced by the template's/.test(r.stdout), (r.stdout || r.stderr || "").split(/\r?\n/).slice(-6).join(" | ")]);
    });
  });

  guard("the decision path's legend names planned only where a node is planned (system and supersystem templates)", c => {
    [["system", "lvlCol"], ["supersystem", "endCol"]].forEach(([k, col]) => {
      const h = T[k], a = h.indexOf("function flowKey(F){"), b = h.indexOf("\n}", a), code = a < 0 ? null : h.slice(a, b + 2);
      if (!code) { c.push([`${NAME[k]}: flowKey()`, false, "not found"]); return; }
      const key = { innerHTML: "" }, run = nodes => { vm.runInNewContext(`${code}; flowKey(F);`, { F: { nodes }, $: () => key, esc: s => String(s), isPlanned: x => !!x && x.planned === true, [col]: () => "var(--muted)", sysTop: () => null }); return key.innerHTML; };
      const built = run({ a: { k: "d" }, b: { k: "t", lvl: "DELIVER" } }), planned = run({ a: { k: "d" }, b: { k: "t", lvl: "DELIVER", planned: true } });
      c.push([`${NAME[k]}: no "planned, not built" entry for a path with no planned node; one where a node is planned`, !/planned, not built/.test(built) && /<i class="pln"><\/i>planned, not built/.test(planned), js({ built: built.slice(-120), planned: planned.slice(-80) })]);
    });
    const sup = T.supersystem;
    c.push(["the supersystem template's Structure and Threads legends name planned, and each start pill, only where drawn", /\(S\.nodes\.some\(isPlanned\)\|\|S\.deps\.some\(d=>!!d\[3\]\)\?`<span><i class="pln"><\/i>planned, not built<\/span>`:""\)/.test(sup) && /\(has\("\.pill\.eager"\)\?/.test(sup) && /\(planned\?`<span><span class="pill planned">planned<\/span>planned, not built<\/span>`:""\)/.test(sup), "supersystem.html"]);
  });

  guard("the switches in a browser (issue board, system board): hidden, the tab takes the width; an item clicked shows it again", c => {
    const probe = sel => `<script>window.addEventListener("load",()=>setTimeout(()=>{ const s=document.getElementById("inspector-switch"), i=document.getElementById("inspector"), st=document.querySelector(".stage"), r=[]; const snap=()=>[document.documentElement.dataset.inspector||"shown", s&&s.getAttribute("aria-checked"), getComputedStyle(i).display, getComputedStyle(st).gridTemplateColumns.split(" ").length].join("/");
      r.push(snap()); s.click(); r.push(snap()+"/"+localStorage.getItem("dashboards-inspector")); const it=document.querySelector(${js(sel)}); if(it) it.dispatchEvent(new MouseEvent("click",{bubbles:true})); setTimeout(()=>{ r.push(snap()+"/"+localStorage.getItem("dashboards-inspector")); document.body.dataset.sw=r.join("|"); },50); },600));</script>`;
    const pages = [["an issue board", wr(path.join(sc, "b-issue", "dashboard.html"), X.withData ? X.withData(T["plan-board"], "plan", rd(sk("plan/examples/38-handshake-empty-name/plan.json"))).replace("</body>", probe(".cell.considered") + "</body>") : ""), ".cell.considered"],
      ["a system board", wr(path.join(sc, "b-system", "index.html"), T.system.replace("</body>", probe(".thread") + "</body>")), ".thread"]];
    pages.forEach(([what, f]) => { const d = dumpDom(f, "", "1400,1000", 6000); if (d == null) { c.push([`${what}: the inspector switch hides the inspector, the tab takes its width, and a click on an item shows it again`, false, NEEDS_BROWSER]); return; }
      const got = (/data-sw="([^"]*)"/.exec(d) || [])[1] || "";
      c.push([`${what}: the inspector switch hides the inspector, the tab takes its width, and a click on an item shows it again`, /^shown\/true\/block\/2\|hidden\/false\/none\/1\/hidden\|shown\/true\/block\/2\/shown$/.test(got), got || "no probe result"]); });
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html", "system/template/supersystem.html", "system/template/system.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0, skipped = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const nr = cases.filter(x => x[2] === "needs a browser: not run (verify-templates.js --browser runs it)"), run = cases.filter(x => !nr.includes(x)), b = run.filter(x => !x[1]); bad += b.length; skipped += nr.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${run.length - b.length}/${run.length} cases${nr.length ? ` · not run without a browser: ${nr.length}` : ""}`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
