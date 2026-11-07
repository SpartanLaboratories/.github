// The cases of the inspector's Hide button (admin-team/dashboards/inspector-hide-button, the user's decision of 2026-11-07, dated 46;
// GUIDANCE.md §6, "The inspector switch"), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-inspector-hide.js [--out <dir>].
// The Hide button sits in the inspector's head, right of its heading: an eye struck through and the word "Hide", a button (ui.md, Button) in
// the boards' neutrals, its accessible name "Hide the inspector". It drives the inspector switch's one state (localStorage
// "dashboards-inspector"): a click hides the inspector, remembers "hidden", flips the switch and moves the focus to it; the switch, or an item
// clicked while the inspector is hidden, shows it again. On every board with an inspector (system, supersystem and repository state boards,
// issue and tracking boards); not on the repository work board, which has none.
// 1. Each template's inspector carries the button in its markup, the same icon its renderer adds, and its CSS only the neutrals.
// 2. The script, run against a stand-in for the DOM: the button hides the inspector and keeps the switch in step; the focus moves to the
//    switch; a write into the inspector during the button's own gesture leaves it hidden; Enter on the button hides it too; the switch and
//    an item clicked bring it back; an inspector drawn before the button (its heading alone) gets the button, its heading wrapped with it.
// 3. The feature probe (inspector-hide): found on the three templates, missed without it (since dashboards-skill/46), not on the
//    repository work board, with the reason; check.js --auto passes an issue board made from the template and fails one without it.
// 4. A state board brought onto the template from a recorded version without the button carries it (splice.js), and the worked example too.
// 5. The fixture boards for a browser check, kept under <out>/inspector-hide/. Its rendered case needs --browser.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesInspectorHide(X) {
  const { sk, out, targets } = X, dumpDom = X.dumpDom || (() => null);
  const NEEDS_BROWSER = X.NEEDS_BROWSER || "needs a browser: not run (verify-templates.js --browser runs it)";
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const F = require(sk("system/scripts/features.js")), lib = require(sk("plan/scripts/lib.js"));
  const T = { "plan-board": rd(tp("plan/template/dashboard.html")), "work-board": rd(tp("plan/template/board.html")), system: rd(tp("system/template/system.html")), supersystem: rd(tp("system/template/supersystem.html")) };
  const FILE = { "plan-board": "plan/template/dashboard.html", system: "system/template/system.html", supersystem: "system/template/supersystem.html" };
  const NAME = { "plan-board": "the issue and tracking board template", "work-board": "the repository work board template", system: "the system board template", supersystem: "the supersystem and repository state board template" };
  const sc = path.join(out, "inspector-hide"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const iife = (h, name) => { const a = h.indexOf(`(function ${name}(){`); if (a < 0) return null; const b = h.indexOf("label(); })();", a); return b < 0 ? null : h.slice(a, b + "label(); })();".length); };
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const MARKUP = /<aside class="inspector" id="inspector" aria-live="polite">\n  <div class="insp-head"><h2>Inspector<\/h2><button class="hide-button" id="inspector-hide" type="button" aria-controls="inspector" aria-label="Hide the inspector">(<svg class="hide-eye"[^]*?<\/svg>)<span class="hide-word">Hide<\/span><\/button><\/div>\n  <div id="insp-body">/;

  /* ---------- a stand-in for the DOM: a tree of elements, enough for inspectorSwitch() and its Hide button ---------- */
  function dom(opts) {
    const store = new Map(Object.entries(opts.stored || {})), timers = [], micro = [], docL = {}, observers = [], resized = { n: 0 };
    let active = null;
    const mutated = node => observers.forEach(o => { let e = node; while (e) { if (e === o.t) { micro.push(() => o.f([{ type: "childList" }])); return; } e = e.parentNode; } });
    class El {
      constructor(tag, attrs) { this.tagName = String(tag).toUpperCase(); this.attrs = {}; this.children = []; this.parentNode = null; this.listeners = {}; this.dataset = {}; this._html = "";
        Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "html") this._html = v; else this.attrs[k] = String(v); }); }
      get id() { return this.attrs.id || ""; } set id(v) { this.attrs.id = String(v); }
      get className() { return this.attrs.class || ""; } set className(v) { this.attrs.class = String(v); }
      get type() { return this.attrs.type; } set type(v) { this.attrs.type = String(v); }
      get title() { return this.attrs.title; } set title(v) { this.attrs.title = String(v); }
      get innerHTML() { return this._html; } set innerHTML(v) { this._html = String(v); this.children = []; mutated(this); }
      get parentElement() { return this.parentNode; }
      getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; } setAttribute(n, v) { this.attrs[n] = String(v); } removeAttribute(n) { delete this.attrs[n]; }
      addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
      detach(n) { if (n.parentNode) { const p = n.parentNode; p.children.splice(p.children.indexOf(n), 1); mutated(p); } }
      appendChild(n) { this.detach(n); n.parentNode = this; this.children.push(n); mutated(this); return n; }
      insertBefore(n, ref) { this.detach(n); n.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); mutated(this); return n; }
      matches(sel) { return sel.split(",").some(s => { s = s.trim(); let m;
        if ((m = /^\[role="([^"]+)"\]$/.exec(s))) return this.attrs.role === m[1];
        if ((m = /^\.([\w-]+)$/.exec(s))) return this.className.split(/\s+/).includes(m[1]);
        if ((m = /^#([\w-]+)$/.exec(s))) return this.id === m[1];
        if (/^[a-z][a-z0-9]*$/i.test(s)) return this.tagName === s.toUpperCase();
        return false; }); }
      closest(sel) { let e = this; while (e) { if (e.matches(sel)) return e; e = e.parentNode; } return null; }
      all() { return this.children.flatMap(c => [c, ...c.all()]); }
      querySelector(sel) { let m;
        if ((m = /^:scope>([a-z][a-z0-9]*)$/i.exec(sel))) return this.children.find(c => c.tagName === m[1].toUpperCase()) || null;
        const hit = this.all().find(e => e.matches(sel)); if (hit) return hit;
        if (sel === "svg" && /<svg[\s>]/.test(this._html)) return { inHtml: true };
        if ((m = /^\.([\w-]+)$/.exec(sel)) && new RegExp(`class="${m[1]}"`).test(this._html)) return { inHtml: true };
        return null; }
      focus() { active = this; }
    }
    const body = new El("body"), root = { dataset: { ...(opts.root || {}) } };
    const tools = body.appendChild(new El("div", { class: "tools" }));
    if (opts.switchInMarkup) tools.appendChild(new El("button", { id: "inspector-switch", class: "switch", role: "switch", "aria-checked": "true", "aria-controls": "inspector", type: "button" }));
    tools.appendChild(new El("button", { id: "theme", class: "switch", role: "switch", type: "button" }));
    const stage = body.appendChild(new El("div", { class: "stage" })), ins = stage.appendChild(new El("aside", { id: "inspector", class: "inspector", "aria-live": "polite" }));
    if (opts.hideInMarkup) { const hd = ins.appendChild(new El("div", { class: "insp-head" })); hd.appendChild(new El("h2", { html: "Inspector" }));
      hd.appendChild(new El("button", { id: "inspector-hide", class: "hide-button", type: "button", "aria-controls": "inspector", "aria-label": "Hide the inspector", html: `${opts.eye}<span class="hide-word">Hide</span>` })); }
    else ins.appendChild(new El("h2", { html: "Inspector" }));
    const ib = ins.appendChild(new El("div", { id: "insp-body", html: "<p>Select an item.</p>" }));
    const item = stage.appendChild(new El("div", { id: "item", class: "cell" }));
    const byId = id => [body, ...body.all()].find(e => e.id === id) || null;
    const document = { documentElement: root, body, getElementById: byId, querySelector: () => null, createElement: t => new El(t), get activeElement() { return active; },
      addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); } };
    class MO { constructor(f) { this.f = f; } observe(t, o) { this.t = t; this.o = o; observers.push(this); } }
    const window = { matchMedia: () => ({ matches: false, addEventListener() {} }), MutationObserver: MO, dispatchEvent: e => { if (e.type === "resize") resized.n++; } };
    const ctx = vm.createContext({ document, window, MutationObserver: MO, matchMedia: window.matchMedia, setTimeout: f => timers.push(f), Event: class { constructor(t) { this.type = t; } },
      localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) } });
    const flush = () => { while (micro.length || timers.length) { while (micro.length) micro.shift()(); if (timers.length) timers.shift()(); } };
    /* a gesture: the document's capture listeners, then the target's own and its ancestors' (bubbling), then the microtasks, then the timers */
    const fire = (target, type, key) => { const e = { type, target, key, preventDefault() {} }; (docL[type] || []).forEach(f => f(e)); let n = target; while (n) { (n.listeners[type] || []).forEach(f => f(e)); n = n.parentNode; } flush(); };
    return { ctx, root, store, fire, flush, resized, ins, ib, item, byId, get active() { return active; }, run: code => { vm.runInContext(code, ctx); flush(); } };
  }

  const EYES = {};
  guard("the Hide button in each template's inspector: its markup, its icon and its look", c => {
    ["plan-board", "system", "supersystem"].forEach(k => {
      const h = T[k], m = MARKUP.exec(h), code = iife(h, "inspectorSwitch") || "", sm = /hb\.innerHTML='(<svg class="hide-eye"[^']*?<\/svg>)<span class="hide-word">Hide<\/span>'/.exec(code);
      EYES[k] = m && m[1];
      c.push([`${NAME[k]}: the inspector's head holds its heading and, right of it, the Hide button (a button, type=button, aria-label "Hide the inspector", controlling the inspector)`, !!m, m ? "found" : "the inspector's markup has no .insp-head with #inspector-hide"]);
      c.push([`${NAME[k]}: its icon an eye struck through, drawn in currentColor and hidden from assistive technology, beside the word "Hide"`, !!m && /aria-hidden="true"/.test(m[1]) && /focusable="false"/.test(m[1]) && /<circle /.test(m[1]) && /<path d="M2\.5 2\.5l11 11"/.test(m[1]) && !/(fill|stroke)="(?!none|currentColor)[^"]*"/.test(m[1]) && !/style=/.test(m[1]), m ? m[1].slice(0, 120) : "no icon"]);
      c.push([`${NAME[k]}: the renderer adds the same icon to an inspector drawn before it`, !!sm && !!m && sm[1] === m[1], sm ? "same" : "no hb.innerHTML with the icon in inspectorSwitch()"]);
      const cs = css(h), rules = cs.match(/\.(?:hide-button|insp-head)[^{]*\{[^}]*\}/g) || [];
      c.push([`${NAME[k]}: the head a flex row; the button in the boards' neutrals (no accent, no status colour), its hover the ink`, /\.inspector \.insp-head\{display:flex;align-items:center;justify-content:space-between;/.test(cs) && /\.inspector \.insp-head h2\{margin:0\}/.test(cs) && /\.hide-button\{[^}]*border:1px solid var\(--line\)[^}]*background:var\(--surface\);color:var\(--ink-2\)/.test(cs) && /\.hide-button:hover\{color:var\(--ink\);border-color:var\(--ink-2\)\}/.test(cs) && rules.length >= 5 && !rules.some(r => /var\(--(accent|good|warning|serious|critical|on)\)/.test(r)), `${rules.length} rules`]);
      c.push([`${NAME[k]}: no animation of its own (nothing else animates but a switch's knob, GUIDANCE.md §1)`, !rules.some(r => /animation|transition/.test(r)), "css"]);
    });
    c.push(["the repository work board template has no inspector, so no Hide button", !/id="inspector"|inspector-hide|hide-button/.test(T["work-board"]), "board.html"]);
  });

  guard("the Hide button's behaviour, against a stand-in for the DOM: one state with the inspector switch, the focus to the switch", c => {
    ["plan-board", "system", "supersystem"].forEach(k => {
      const code = iife(T[k], "inspectorSwitch"); if (!code) { c.push([`${NAME[k]}: inspectorSwitch()`, false, "not found"]); return; }
      const mk = (stored, hideInMarkup) => { const D = dom({ stored, switchInMarkup: k === "plan-board", hideInMarkup, eye: EYES[k] || "<svg></svg>" }); D.run(code); return D; };
      const D = mk(undefined, true), sw = D.byId("inspector-switch"), hb = D.byId("inspector-hide");
      c.push([`${NAME[k]}: shown at open: the switch checked; the button keeps its icon, its word and its name`, !!sw && !!hb && sw.attrs["aria-checked"] === "true" && D.root.dataset.inspector === undefined && hb.attrs["aria-label"] === "Hide the inspector" && hb.attrs.type === "button" && /<svg[\s\S]*<span class="hide-word">Hide<\/span>$/.test(hb.innerHTML) && /Hide the inspector\./.test(hb.attrs.title || ""), js(hb ? hb.attrs : null)]);
      /* the button's gesture, during which a resize handler writes into the inspector (as a redraw at the new width would) */
      hb.addEventListener("click", () => { D.ib.innerHTML = "<p>redrawn at the new width</p>"; });
      D.fire(hb, "click");
      c.push([`${NAME[k]}: a click on Hide hides the inspector, remembers "hidden", flips the switch and lays the tab out again`, D.root.dataset.inspector === "hidden" && D.store.get("dashboards-inspector") === "hidden" && sw.attrs["aria-checked"] === "false" && D.resized.n === 1, js({ root: D.root.dataset, stored: D.store.get("dashboards-inspector"), checked: sw.attrs["aria-checked"], resized: D.resized.n })]);
      c.push([`${NAME[k]}: …the focus moved to the inspector switch, in the header`, D.active === sw, D.active ? D.active.id : "none"]);
      c.push([`${NAME[k]}: …and a write into the inspector during that gesture does not bring it back`, D.root.dataset.inspector === "hidden", js(D.root.dataset)]);
      D.fire(sw, "click");
      c.push([`${NAME[k]}: the switch shows it again, remembers "shown" and is checked: one state, in step`, D.root.dataset.inspector === undefined && D.store.get("dashboards-inspector") === "shown" && sw.attrs["aria-checked"] === "true", js({ root: D.root.dataset, stored: D.store.get("dashboards-inspector"), checked: sw.attrs["aria-checked"] })]);
      /* the keyboard: Enter on the button (its keydown, then the click a button fires on Enter) */
      D.fire(hb, "keydown", "Enter"); D.fire(hb, "click");
      c.push([`${NAME[k]}: Enter on Hide hides it too, the focus on the switch`, D.root.dataset.inspector === "hidden" && sw.attrs["aria-checked"] === "false" && D.active === sw, js({ root: D.root.dataset, active: D.active && D.active.id })]);
      /* an item clicked while hidden, writing into the inspector, shows it again and flips the switch */
      D.item.addEventListener("click", () => { D.ib.innerHTML = "<p>the item's detail</p>"; }); D.fire(D.item, "click");
      c.push([`${NAME[k]}: an item clicked while hidden shows it again and flips the switch`, D.root.dataset.inspector === undefined && sw.attrs["aria-checked"] === "true" && D.store.get("dashboards-inspector") === "shown", js({ root: D.root.dataset, checked: sw.attrs["aria-checked"] })]);
      /* an inspector drawn before the button: its heading alone, wrapped with the button the renderer adds */
      const E = mk(undefined, false), ehb = E.byId("inspector-hide"), head = ehb && ehb.parentNode;
      c.push([`${NAME[k]}: an inspector drawn before it gets the button: its heading and the button in .insp-head, first in the inspector, the button with its icon, word and name`,
        !!ehb && ehb.tagName === "BUTTON" && head.className === "insp-head" && head.parentNode === E.ins && E.ins.children[0] === head && head.children[0].tagName === "H2" && head.children[1] === ehb && ehb.className === "hide-button" && ehb.attrs.type === "button" && ehb.attrs["aria-label"] === "Hide the inspector" && ehb.attrs["aria-controls"] === "inspector" && /^<svg class="hide-eye"[\s\S]*<span class="hide-word">Hide<\/span>$/.test(ehb.innerHTML),
        js(ehb ? { attrs: ehb.attrs, head: head && head.className, first: E.ins.children[0] && E.ins.children[0].className } : null)]);
      E.fire(ehb, "click");
      c.push([`${NAME[k]}: …and it works as the template's does`, E.root.dataset.inspector === "hidden" && E.byId("inspector-switch").attrs["aria-checked"] === "false" && E.active === E.byId("inspector-switch"), js(E.root.dataset)]);
      const G = mk({ "dashboards-inspector": "hidden" }, true);
      c.push([`${NAME[k]}: a board opened with "hidden" stored opens hidden, the switch unchecked, its button in place for when it is shown`, G.root.dataset.inspector === "hidden" && G.byId("inspector-switch").attrs["aria-checked"] === "false" && !!G.byId("inspector-hide"), js(G.root.dataset)]);
    });
  });

  guard("the feature probe (inspector-hide), and check.js on an issue board made from the template", c => {
    const f = F.FEATURES.find(x => x.id === "inspector-hide") || {};
    ["plan-board", "system", "supersystem"].forEach(k => {
      const miss = F.probe(T[k], k).filter(m => m.id === "inspector-hide");
      c.push([`${NAME[k]}: the probe finds it`, !miss.length, js(miss)]);
      const old = T[k].replace(/  if\(hb\)\{[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n/, "");
      const m = F.probe(old, k).find(x => x.id === "inspector-hide");
      c.push([`${NAME[k]}: …and misses it where the renderer wires no Hide button (FEATURE MISSING, since dashboards-skill/46)`, old !== T[k] && !!m && /FEATURE MISSING: the inspector's Hide button/.test(F.line(m)) && /dashboards-skill\/46/.test(F.line(m)), m ? F.line(m) : "not missed"]);
    });
    c.push(["it applies to every board with an inspector, and not to the repository work board, with the reason", js(f.types) === js(["system", "supersystem", "plan-board"]) && !!(f.notFor || {})["work-board"] && F.applicable("work-board").every(x => x.id !== "inspector-hide"), js({ types: f.types, notFor: f.notFor })]);
    /* an issue board in flight, made from the template, and one made from the template without the button's wiring */
    const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json")));
    const flight = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
      x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
      x.wip = { ...x.wip, step: "plan", since: "2026-11-07T01:00:00Z", updated: "2026-11-07T01:00:00Z", current: [], questions: [], research: null, open: [], qa: [], plan: null, waitingOn: null, resume: null }; return x; };
    const lay = (name, tpl) => { const P = flight(), root = path.join(sc, name), dir = path.join(root, ...P.folder.split("/"));
      fs.readdirSync(sk(EXD)).filter(x => /\.md$/.test(x) || x === "research").forEach(x => fs.cpSync(sk(EXD + "/" + x), path.join(dir, x), { recursive: true }));
      fs.mkdirSync(path.join(root, ".git"), { recursive: true }); wr(path.join(dir, "plan.json"), JSON.stringify(P, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), tpl);
      const e = run(sk("plan/scripts/embed.js"), [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return dir; };
    const ok = run(sk("plan/scripts/check.js"), [lay("issue-board", T["plan-board"]), "--auto"]);
    c.push(["check.js --auto passes an issue board in flight made from the template", ok.status === 0 && !/FEATURE MISSING[^\n]*Hide button/.test(ok.stdout + ok.stderr), (ok.stdout + ok.stderr).slice(-300)]);
    const bad = run(sk("plan/scripts/check.js"), [lay("issue-board-without", T["plan-board"].replace(/  if\(hb\)\{[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n/, "")), "--auto"]);
    c.push(["…and fails one made from a template without it (FEATURE MISSING)", bad.status !== 0 && /FEATURE MISSING: the inspector's Hide button/.test(bad.stdout + bad.stderr), (bad.stdout + bad.stderr).slice(-300)]);
  });

  guard("a state board brought onto the template carries the Hide button (splice.js), and the worked example does", c => {
    const V = require(sk("verify/verified.json")).templates, dev = require(sk("system/scripts/deviation.js"));
    ["system", "supersystem"].forEach(k => {
      const key = FILE[k], rec = V[key] || {}, cur = dev.sha(T[k]);
      const old = (rec.history || []).slice().reverse().find(v => v.sha256 !== cur && v.file && fs.existsSync(sk("verify/history/" + v.file)) && !/inspector-hide/.test(rd(sk("verify/history/" + v.file))));
      if (!old) { c.push([`${NAME[k]}: an older recorded version to splice from`, false, "none in verify/history/"]); return; }
      const root = path.join(sc, "splice-" + k), page = wr(path.join(root, "docs", "dashboards", "b", "index.html"), rd(sk("verify/history/" + old.file)));
      wr(path.join(root, "docs", "dashboards", "_template", `${k}.html`), T[k]);
      const r = cp.spawnSync(process.execPath, [sk("system/scripts/splice.js"), page, "--template", tp(key)], { encoding: "utf8" }), h = rd(page);
      c.push([`${NAME[k]}: spliced from the version of ${old.verified || "?"} (${old.sha256.slice(0, 12)}), its inspector's markup its own (the heading alone) and the Hide button wired by the renderer`,
        r.status === 0 && !/id="inspector-hide"/.test(h.replace(/<script[\s\S]*?<\/script>/g, "")) && !F.probe(h, k).some(m => m.id === "inspector-hide"), (r.stdout || r.stderr || "").split(/\r?\n/).slice(-4).join(" | ")]);
    });
    const ex = sk("system/examples/webtools-udp/index.html");
    if (fs.existsSync(ex)) { const miss = F.probe(rd(ex), "system").filter(m => m.id === "inspector-hide"); c.push(["the worked system board (system/examples/webtools-udp) carries it", !miss.length, js(miss)]); }
  });

  guard("the fixture boards for a browser check, and the Hide button in a browser", c => {
    const withData = X.withData;
    const laid = [];
    /* an issue board, a tracking board (its Landing Order tab puts the inspector under the graph), a system board drawn before the button
       (spliced: the renderer adds it), a supersystem board from the template */
    if (withData) {
      laid.push(wr(path.join(sc, "fixtures", "issue", "dashboard.html"), withData(T["plan-board"], "plan", rd(sk("plan/examples/38-handshake-empty-name/plan.json")))));
      laid.push(wr(path.join(sc, "fixtures", "tracking", "dashboard.html"), withData(T["plan-board"], "plan", rd(sk("verify/fixtures/tracking.plan.json")))));
    }
    const ex = sk("system/examples/webtools-udp/index.html"); if (fs.existsSync(ex)) laid.push(wr(path.join(sc, "fixtures", "system", "index.html"), rd(ex)));
    laid.push(wr(path.join(sc, "fixtures", "supersystem", "index.html"), T.supersystem));
    const sp = path.join(sc, "splice-system", "docs", "dashboards", "b", "index.html"); if (fs.existsSync(sp)) laid.push(wr(path.join(sc, "fixtures", "system-spliced", "index.html"), rd(sp)));
    c.push(["the fixture boards are laid", laid.length >= 3 && laid.every(f => fs.existsSync(f)), laid.map(f => path.relative(sc, f)).join(", ")]);
    const probe = `<script>window.addEventListener("load",()=>setTimeout(()=>{ const s=document.getElementById("inspector-switch"), i=document.getElementById("inspector"), b=document.getElementById("inspector-hide"), r=[]; const snap=()=>[document.documentElement.dataset.inspector||"shown", s&&s.getAttribute("aria-checked"), getComputedStyle(i).display, document.activeElement===s?"focus:switch":"focus:other"].join("/");
      r.push(snap()); b.click(); r.push(snap()+"/"+localStorage.getItem("dashboards-inspector")); s.click(); r.push(snap()+"/"+localStorage.getItem("dashboards-inspector")); document.body.dataset.hb=r.join("|"); },600));</script>`;
    [["an issue board", laid[0]], ["a system board", laid.find(f => /fixtures[\\/]system[\\/]/.test(f))]].filter(x => x[1]).forEach(([what, f]) => {
      const pg = wr(path.join(sc, "browser", path.basename(path.dirname(f)), path.basename(f)), rd(f).replace("</body>", probe + "</body>")), d = dumpDom(pg, "", "1400,1000", 6000);
      if (d == null) { c.push([`${what}: Hide hides the inspector, the switch unchecked and focused; the switch shows it again`, false, NEEDS_BROWSER]); return; }
      const got = (/data-hb="([^"]*)"/.exec(d) || [])[1] || "";
      c.push([`${what}: Hide hides the inspector, the switch unchecked and focused; the switch shows it again`, /^shown\/true\/block\/focus:other\|hidden\/false\/none\/focus:switch\/hidden\|shown\/true\/block\/focus:switch\/shown$/.test(got), got || "no probe result"]); });
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const NB = "needs a browser: not run (verify-templates.js --browser runs it)";
  /* on its own, the templates count as under test, as verify-templates.js counts them (deviation.js verified()) */
  if (!process.env.DASHBOARDS_TEMPLATES_UNDER_TEST) { const { sha } = require(sk("system/scripts/deviation.js")); process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify(["plan/template/dashboard.html", "system/template/system.html", "system/template/supersystem.html"].map(f => sha(fs.readFileSync(sk(f), "utf8")))); }
  const withData = (html, id, json) => { const m = new RegExp(`<script type="application/json" id="${id}">[\\s\\S]*?</script>`).exec(html); return m ? html.replace(m[0], () => `<script type="application/json" id="${id}">${String(json).replace(/<\//g, "<\\/")}</script>`) : html; };
  let fails = 0, skipped = 0;
  module.exports({ sk, out, targets: [], withData, NEEDS_BROWSER: NB }).forEach(([title, cases]) => { const nr = cases.filter(x => x[2] === NB), runc = cases.filter(x => !nr.includes(x)), bad = runc.filter(x => !x[1]); fails += bad.length; skipped += nr.length;
    console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${runc.length - bad.length}/${runc.length} cases${nr.length ? ` · not run without a browser: ${nr.length}` : ""}`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
