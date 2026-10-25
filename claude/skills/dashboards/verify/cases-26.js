// The case groups of admin-team/dashboards-skill/26, run by verify-templates.js (it passes its helpers in): the per-page feature probes,
// the splice, the Guarantees' and Context's legends, links only to files that exist (live first), the work-board link on the state pages,
// the tablists' keys, the clean-ups, the theme remembered across pages, the as-is part naming no issue, the rendered Markdown copies, the
// tracking issue's unit boards and its two steps after the architecture, the agents' progress notes, and built or planned from the code
// (a supersystem from its core subsystems). Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases26(X) {
  const { sk, out, targets, dumpDom, inner, chrome, checker, embedJs, checkJs, node, stub, withData } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js")), L = require(sk("system/scripts/statelib.js")), dev = require(sk("system/scripts/deviation.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const SYS = tp("system/template/system.html"), SUP = tp("system/template/supersystem.html"), PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const text = h => (h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const run = (js, a) => cp.spawnSync(process.execPath, [js, ...a], { encoding: "utf8" });
  const probeAt = (html, js) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${js} }catch(e){ document.body.dataset.r="ERR "+e.message; } },700));</script></body>`);
  const got = d => ((d || "").match(/<body[^>]*data-r="([^"]*)"/) || [])[1] || "";
  const groups = [];
  if (!SYS || !SUP || !PB || !WB) return [["the dashboards-skill/26 cases (all four templates under test)", [["all four templates are under test", false, "a repository template set without all four skips these groups"]]]];
  const sc = path.join(out, "skill-26"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const T = { system: rd(SYS), supersystem: rd(SUP), "plan-board": rd(PB), "work-board": rd(WB) };
  const EX = rd(sk("plan/examples/38-handshake-empty-name/plan.json")), WBJ = rd(sk("verify/fixtures/work-board.json")), LIVEJ = rd(sk("verify/fixtures/live-issue.plan.json")), TRJ = rd(sk("verify/fixtures/tracking.plan.json"));

  /* 1. the feature probes */
  { const c = [];
    Object.entries(T).forEach(([k, h]) => { const miss = F.probe(h, k); c.push([`the ${k} template carries every feature its type takes (${F.applicable(k).length})`, !miss.length, miss.map(F.line).join(" | ")]); });
    F.FEATURES.forEach(f => c.push([`the detector "${f.id}" names its step and, for each type it does not fit, the reason`, /^\d+$/.test(String(f.since)) && F.TYPES.every(t => f.types.includes(t) || (f.notFor && f.notFor[t])), JSON.stringify({ since: f.since, types: f.types, notFor: f.notFor })]));
    /* the template this run started from lacks this run's features: the probes say so */
    /* a recorded version, from verify/history/ or rebuilt from the mirror's git history (system/scripts/history.js) */
    const hist = n => require(sk("system/scripts/history.js")).readVersion(sk(n), x => /dashboards-skill\/25/.test(x.note || ""), { historyRepo: X.historyRepo });
    const oldSys = hist("system/template/system.html");
    c.push(["the system template as dashboards-skill/25 left it misses this run's features (tab keys, the as-is header, the legends, the work-board link)", !!oldSys && ["tab-keys", "as-is-header", "guarantees-legend", "context-legend", "workboard-link"].every(id => F.probe(oldSys, "system").some(m => m.id === id)), oldSys ? F.probe(oldSys, "system").map(m => m.id).join(", ") : "no recorded history"]);
    /* check-page.js --auto --no-browser fails a missing feature through a declared divergence; --features-as-notes notes it */
    const lag = wr(path.join(sc, "features", "lag", "index.html"), (oldSys || T.system).replace("<head>", '<head>\n<meta name="template-divergence" content="a declared divergence (verify case)">'));
    const r1 = run(checker, [lag, "--auto", "--no-browser"]), r2 = run(checker, [lag, "--auto", "--no-browser", "--features-as-notes"]);
    c.push(["check-page.js fails FEATURE MISSING through a declared divergence, naming the step", r1.status === 1 && /FEATURE MISSING: the tablist's keys.*\(template since dashboards-skill\/26\)/.test(r1.stdout), (r1.stdout || "").split(/\r?\n/).filter(l => /FEATURE|FAIL|PASS/.test(l)).slice(0, 3).join(" | ")]);
    c.push(["--features-as-notes prints the misses as notes and passes (the data-only path)", r2.status === 0 && /CHECK note: FEATURE MISSING/.test(r2.stdout), (r2.stdout || "").split(/\r?\n/).filter(l => /FEATURE|FAIL|PASS/.test(l)).slice(-2).join(" | ")]);
    /* check.js --auto on a plan board made from the old template fails its missing features */
    const oldPb = hist("plan/template/dashboard.html"), tree = path.join(sc, "features", "tree"), dir = path.join(tree, "docs", "plans", "38-handshake-empty-name");
    fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "plan.json"), EX.replace(/"status": "built"/, "\"status\": \"building\"").replace(/"step": "landed"/, "\"step\": \"implementation\"")); fs.writeFileSync(path.join(dir, "dashboard.html"), oldPb || T["plan-board"]); node(embedJs, dir);
    /* a landed board is kept as it landed: the same page, landed, reports its newer features and does not fail on them (below) */
    const r3 = node(checkJs, dir, "--root", tree, "--auto", "--out", path.join(sc, "features", "out"));
    c.push(["check.js --auto fails a board on an older template for its missing features", r3.status === 1 && /FAIL {2}FEATURE MISSING: the agents' progress notes/.test(r3.stdout), (r3.stdout || "").split(/\r?\n/).filter(l => /FEATURE/.test(l)).slice(0, 2).join(" | ")]);
    fs.writeFileSync(path.join(dir, "plan.json"), EX); fs.writeFileSync(path.join(dir, "dashboard.html"), oldPb || T["plan-board"]); node(embedJs, dir);
    const r4 = node(checkJs, dir, "--root", tree, "--auto", "--out", path.join(sc, "features", "out2"));
    c.push(["a landed board is kept as it landed: its newer features reported, never failed", !/FAIL {2}FEATURE MISSING/.test(r4.stdout) && /ok {4}features \(kept as it landed\): FEATURE MISSING/.test(r4.stdout), (r4.stdout || "").split(/\r?\n/).filter(l => /FEATURE|^FAIL/.test(l)).slice(0, 3).join(" | ")]);
    groups.push(["the per-page feature probes (features.js): every template passes each detector its type takes; a lagging page fails, through a declared divergence too", c]); }

  /* 2. the splice */
  { const c = [], SP = sk("system/scripts/splice.js"), tree = path.join(sc, "splice"), D = path.join(tree, "docs", "dashboards");
    /* a recorded version, from verify/history/ or rebuilt from the mirror's git history (system/scripts/history.js) */
    const hist = n => require(sk("system/scripts/history.js")).readVersion(sk(n), x => /dashboards-skill\/25/.test(x.note || ""), { historyRepo: X.historyRepo });
    const old = hist("system/template/system.html") || T.system;
    const fill = h => h.replace(/^const REPO=.*$/m, 'const REPO="https://github.com/acme/widgets";').replace('<span class="chip"><span class="ck">platform</span> <b>Kotlin/JVM</b></span>', '<span class="chip"><b>v1.2.3</b></span>');
    const a = wr(path.join(D, "alpha", "index.html"), fill(old)), r = run(SP, [a, "--template", SYS]), after = rd(a);
    const dv = dev.deviation(a);
    c.push(["a page made from the previous template, undiverged: its CSS, script before MODEL and renderer become the current template's", r.status === 0 && !dv.differs.length, (r.stdout || "") + " | " + dv.differs.join("; ")]);
    c.push(["its page-filled REPO is kept, and the new WORK_BOARD line is reported to fill", /^const REPO="https:\/\/github\.com\/acme\/widgets";/m.test(after) && /page-filled WORK_BOARD: new in the template/.test(r.stdout), (r.stdout || "").split(/\r?\n/).filter(l => /page-filled/.test(l)).join(" | ")]);
    c.push(["the old \"last amended by\" chip is removed and an unlabelled chip is relabelled", !/id="chip-amended"/.test(after) && /<span class="chip"><span class="ck">version<\/span> <b>v1\.2\.3<\/b><\/span>/.test(after), (r.stdout || "").split(/\r?\n/).filter(l => /chip/.test(l)).join(" | ")]);
    /* a declared divergence: an extra CSS rule on the old CSS is kept beside the new template's */
    const div = fill(old).replace("<head>", '<head>\n<meta name="template-divergence" content="an extra CSS rule (verify case)">').replace("footer{margin-top:28px;", ".verify-extra{color:inherit}\nfooter{margin-top:28px;");
    const b = wr(path.join(D, "beta", "index.html"), div), rb = run(SP, [b, "--template", SYS]), hb = rd(b);
    c.push(["a declared divergence is merged three ways: its extra rule kept, the template's new CSS carried", rb.status === 0 && /\.verify-extra\{color:inherit\}/.test(hb) && /\.context \.amended\{/.test(hb) && /merged three ways/.test(rb.stdout), (rb.stdout || "").split(/\r?\n/).filter(l => /style|CONFLICT/.test(l)).join(" | ")]);
    /* a change the template also made, differently: a conflict, the part left as it was, exit 1 */
    const conf = fill(old).replace("<head>", '<head>\n<meta name="template-divergence" content="a changed bug badge (verify case)">').replace('.badge.bug{border-color:var(--serious)}', '.badge.bug{border-color:var(--critical)}');
    const cc = wr(path.join(D, "gamma", "index.html"), conf), rc = run(SP, [cc, "--template", SYS]);
    c.push(["a change that meets the template's own is a conflict: that part left as it was, reported, exit 1", rc.status === 1 && /CONFLICT in style block 1/.test(rc.stdout) && /border-color:var\(--critical\)/.test(rd(cc)), (rc.stdout || "").split(/\r?\n/).filter(l => /CONFLICT|style/.test(l)).join(" | ")]);
    /* a plan board on the previous template: the current template plus its data */
    const oldPb = hist("plan/template/dashboard.html") || T["plan-board"], pdir = path.join(tree, "docs", "plans", "38-handshake-empty-name");
    const pb = wr(path.join(pdir, "dashboard.html"), lib.writeBlock(oldPb, "plan", EX)), rp = run(SP, [pb, "--template", PB]);
    c.push(["a plan board on the previous template becomes the current template plus its data", rp.status === 0 && dev.norm(rd(pb)) === dev.norm(lib.writeBlock(T["plan-board"], "plan", EX)), rp.stdout]);
    const md = require(sk("system/scripts/splice.js")), m3 = md.merge3(["a", "b", "c", "d"], ["a", "B", "c", "d"], ["a", "b", "c", "D"]);
    c.push(["merge3 keeps both sides' changes that do not touch", JSON.stringify(m3.lines) === '["a","B","c","D"]' && !m3.conflicts.length, JSON.stringify(m3)]);
    groups.push(["the splice (system/scripts/splice.js): the template's CSS, script before MODEL and renderer carried onto a state page, three ways for a declared divergence", c]); }

  /* 3, 6, 9, C. the state pages rendered: legends, the work-board link, the band, no issue above Context */
  { const c = [], d = dumpDom(wr(path.join(sc, "state", "sup", "index.html"), T.supersystem)), ds = dumpDom(wr(path.join(sc, "state", "sys", "index.html"), T.system));
    if (d == null) c.push(["a browser renders the pages (set CHROME)", false, "no Chrome or Edge"]);
    else {
      const gk = inner(d, '<div class="key" id="guarantees-key">', "div"), ck = inner(d, '<div class="key" id="context-key">', "div");
      c.push(["the supersystem template's Guarantees legend: the system swatches and the dashed planned row", /class="swk"/.test(gk) && /dashed, faded: about a planned part/.test(gk) && /italic, muted/.test(gk), text(gk).slice(0, 200)]);
      c.push(["its Context legend: the system badges, the issue's state, the neutral bug badge, the chain bar", /class="sbar"/.test(ck) && /the issue's state on the tracker/.test(ck) && /labelled a bug/.test(ck) && /chain: units landed of all units/.test(ck), text(ck).slice(0, 240)]);
      c.push(["the roadmap's tracking issue shows its chain: \"chain 1 of 3 landed\" and its bar", /chain 1 of 3 landed <span class="cbar"[^>]*><i style="width:33%"><\/i>/.test(d), (d.match(/chain \d of \d landed.{0,80}/) || ["none"])[0]]);
      c.push(["the bug badge is neutral: no status colour in its rule", !/\.badge\.bug[^{]*\{[^}]*var\(--(serious|critical|warning)\)/.test(T.supersystem + T.system), "the .badge.bug rules"]);
      const hdr = inner(d, "<header>", "header"), hds = inner(ds, "<header>", "header");
      c.push(["no issue number in the header; the last amendment in the Context section", !/#\d|#N/.test(text(hdr) + text(hds)) && /id="ctx-amended"[^>]*>.*?last amended by.*?#1<\/a>/.test(d) && /id="ctx-amended"/.test(ds), text(hdr).slice(0, 120) + " || " + (d.match(/id="ctx-amended"[^>]*>.{0,140}/) || ["no ctx-amended"])[0]]);
      const named = wr(path.join(sc, "state", "named", "index.html"), T.system.replace("<li>Confined: …</li>", "<li>Confined: … (#12)</li>")), rn = run(checker, [named, "--out", path.join(sc, "state", "out")]);
      c.push(["check-page.js's browser pass fails an issue number above the Context section", rn.status === 1 && /FEATURE MISSING: an as-is part that names no issue .*#12/.test(rn.stdout), (rn.stdout || "").split(/\r?\n/).filter(l => /as-is|FAIL/.test(l)).join(" | ")]);
      c.push(["the Systems tab names no issue", !/#\d|#N/.test(text(inner(d, '<div class="syscards" id="syscards">', "div"))), text(inner(d, '<div class="syscards" id="syscards">', "div")).slice(0, 200)]);
      c.push(["the work board's line, plain text while no work board is there", /<a data-workboard="" title="No work board in this checkout">Work board<\/a>/.test(d) || /<a data-workboard[^>]*>Work board<\/a>/.test(d) && !/data-workboard[^>]*href=/.test(d), (d.match(/<a data-workboard[^>]*>/) || ["none"])[0]]);
      c.push(["the structure band is drawn only where MODEL.structure asks for one: none in the template", !/<rect[^>]*class="band"/.test(inner(ds, '<svg id="svg-structure"', "svg")), (inner(ds, '<svg id="svg-structure"', "svg").match(/<rect[^>]*class="band"[^>]*>/) || ["no band"])[0]]);
      const withBand = T.system.replace("    lanes:[[\"SYSTEM\",40,44,\"start\"]],", "    band:[430,48,140,400],\n    lanes:[[\"SYSTEM\",40,44,\"start\"]],"), db = dumpDom(wr(path.join(sc, "state", "band", "index.html"), withBand));
      c.push(["…and one where it does", /<rect[^>]*class="band"/.test(inner(db, '<svg id="svg-structure"', "svg")), (inner(db, '<svg id="svg-structure"', "svg").match(/<rect[^>]*class="band"[^>]*>/) || ["no band"])[0]]);
      c.push(["the dead .kpi .seg-bar rules are gone from the system templates", !/\.kpi \.seg-bar/.test(T.system + T.supersystem), "CSS"]);
      /* the work-board link: committed when its file is there, the live view first when its marker loads */
      const repo = path.join(sc, "state", "repo"), page = path.join(repo, "docs", "dashboards", "index.html");
      fs.mkdirSync(path.join(repo, "docs", "plans", ".live"), { recursive: true }); fs.writeFileSync(path.join(repo, "docs", "plans", "index.html"), "<!doctype html><title>wb</title>");
      wr(page, T.supersystem.replace(/^const WORK_BOARD=\{"committed":null,/m, 'const WORK_BOARD={"committed":"../plans/index.html",'));
      const dc = dumpDom(page);
      c.push(["with the committed board there, the link opens it", /<a data-workboard[^>]*href="\.\.\/plans\/index\.html"/.test(dc), (dc.match(/<a data-workboard[^>]*>/) || ["none"])[0]]);
      fs.writeFileSync(path.join(repo, "docs", "plans", ".live", "index.js"), '(window.DASHBOARDS_LIVE=window.DASHBOARDS_LIVE||{}).board="index.html";\n');
      const dl = dumpDom(page);
      c.push(["with the live view's marker there, the link opens the live view first", /<a data-workboard[^>]*href="\.\.\/plans\/\.live\/index\.html"/.test(dl), (dl.match(/<a data-workboard[^>]*>/) || ["none"])[0]]);
      const dead = wr(path.join(repo, "docs", "dashboards", "dead", "index.html"), T.system.replace(/^const WORK_BOARD=\{"committed":null,/m, 'const WORK_BOARD={"committed":"../../plans/gone.html",').replace('<a href="../index.html">REPO</a>', '<a href="../nowhere.html">REPO</a>'));
      const rr = run(checker, [dead, "--auto", "--no-browser"]);
      c.push(["check-page.js fails a dead WORK_BOARD and a dead hand-written link", rr.status === 1 && /DEAD LINK: WORK_BOARD\.committed/.test(rr.stdout) && /DEAD LINK: href="\.\.\/nowhere\.html"/.test(rr.stdout), (rr.stdout || "").split(/\r?\n/).filter(l => /DEAD/.test(l)).join(" | ")]);
    }
    groups.push(["the state pages: the Guarantees' and Context's legends, the chain, the neutral bug badge, the work-board link live first, the band, no issue above Context", c]); }

  /* 5, E, H. the plan board in a scratch tree: links only to files there, live first; the Markdown copies; the progress notes */
  { const c = [], tree = path.join(sc, "links"), dir = path.join(tree, "docs", "plans", "38-handshake-empty-name");
    fs.rmSync(tree, { recursive: true, force: true });
    fs.cpSync(sk("plan/examples/38-handshake-empty-name"), dir, { recursive: true });
    const ex = JSON.parse(EX); ex.systems[0].page = "docs/dashboards/webtools-udp/index.html"; fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(ex, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "dashboard.html"), T["plan-board"]);
    let e = node(embedJs, dir), P = JSON.parse(rd(path.join(dir, "plan.json")));
    c.push(["embed.js records no shared link while none of their files is there", JSON.stringify(P.links) === "{}", JSON.stringify(P.links)]);
    let d = dumpDom(path.join(dir, "dashboard.html"));
    const crumbs = x => inner(x, '<div class="crumbs" id="crumbs">', "div");
    c.push(["the breadcrumb is plain text then: no link to a missing work board or repository page", d == null || !/<a /.test(crumbs(d)), crumbs(d)]);
    wr(path.join(tree, "docs", "plans", "index.html"), "<!doctype html><title>wb</title>"); wr(path.join(tree, "docs", "dashboards", "index.html"), "<!doctype html><title>repo</title>"); wr(path.join(tree, "docs", "dashboards", "webtools-udp", "index.html"), "<!doctype html><title>udp</title>");
    node(embedJs, dir); P = JSON.parse(rd(path.join(dir, "plan.json")));
    c.push(["with the files there, embed.js links each, relative to the board", P.links.workBoard === "../index.html" && P.links.repoPage === "../../dashboards/index.html" && P.links.pages["webtools-udp"] === "../../dashboards/webtools-udp/index.html", JSON.stringify(P.links)]);
    fs.rmSync(path.join(tree, "docs", "dashboards", "index.html"));
    const ck = node(checkJs, dir, "--root", tree);
    c.push(["check.js fails a link whose file is gone (DEAD LINK)", ck.status === 1 && /DEAD LINK: links\.repoPage/.test(ck.stdout), (ck.stdout || "").split(/\r?\n/).filter(l => /DEAD|links/.test(l)).join(" | ")]);
    wr(path.join(tree, "docs", "dashboards", "index.html"), "<!doctype html><title>repo</title>"); node(embedJs, dir);
    /* the rendered copies: written beside, in docs/plans/.live/docs/, with GitHub's anchors and the links between copies */
    const live = path.join(tree, "docs", "plans", ".live", "docs"), cp1 = path.join(live, "38-handshake-empty-name", "plan.html");
    const idx = fs.existsSync(path.join(live, "index.js")) ? rd(path.join(live, "index.js")) : "";
    c.push(["embed.js renders the Markdown the board links into docs/plans/.live/docs/ and lists them", fs.existsSync(cp1) && /docs\/plans\/38-handshake-empty-name\/plan\.md/.test(idx) && /research\/README\.md/.test(idx), idx.slice(0, 200)]);
    const ph = fs.existsSync(cp1) ? rd(cp1) : "", want = lib.mdHeadings(rd(path.join(dir, "plan.md"))).map(x => x.slug);
    c.push(["a copy carries GitHub's heading anchors, the theme switch before its first paint and both palettes", want.length > 3 && want.every(s => ph.includes(`id="${s}"`)) && /<head>[\s\S]*localStorage\.getItem\("dashboards-theme"\)[\s\S]*<\/head>/.test(ph) && /:root\[data-theme="dark"\]/.test(ph), `${want.filter(s => !ph.includes(`id="${s}"`)).length} of ${want.length} anchors missing`]);
    c.push(["a copy's link to another copied document opens that copy; one to a file not copied opens the file", /href="architecture\.html"/.test(ph) && /href="research\/README\.html"/.test(ph), (ph.match(/href="[^"#]*\.(md|html)[^"]*"/g) || []).slice(0, 6).join(" ")]);
    /* the board, on disk with its copies and the live marker: a "(§n)" reference opens the copy at its section; the work board the live view */
    wr(path.join(tree, "docs", "plans", ".live", "index.js"), '(window.DASHBOARDS_LIVE=window.DASHBOARDS_LIVE||{}).board="index.html";\n');
    d = dumpDom(path.join(dir, "dashboard.html"));
    c.push(["on the board a statement's reference opens the copy at its section", d == null || /<a class="sref" href="\.\.\/\.\.\/\.\.\/docs\/plans\/\.live\/docs\/38-handshake-empty-name\/plan\.html#[\w-]+"/.test(d), (d.match(/<a class="sref" href="[^"]+"/) || ["none"])[0]]);
    c.push(["…and the breadcrumb's work board the live view", d == null || /href="\.\.\/\.\.\/\.\.\/docs\/plans\/\.live\/index\.html"[^>]*>work board/.test(crumbs(d)), crumbs(d)]);
    c.push(["…and its Context's legend names the swatches it drew", d == null || /<div class="key" id="context-key">[\s\S]*?webtools-udp/.test(d), (d.match(/<div class="key" id="context-key">.{0,120}/) || ["none"])[0]]);
    /* the progress notes: a fresh one and a stale one, under the live fixture's issue */
    const lv = JSON.parse(LIVEJ), ldir = path.join(tree, ...lv.folder.split("/")); lv.wip.updated = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    fs.mkdirSync(ldir, { recursive: true }); fs.writeFileSync(path.join(ldir, "plan.json"), JSON.stringify(lv, null, 2) + "\n"); fs.writeFileSync(path.join(ldir, "dashboard.html"), T["plan-board"]); node(embedJs, ldir);
    const now = Date.now(), iso = ms => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z"), pdir = path.join(tree, "docs", "plans", ".live", "progress", String(lv.issue));
    const note = (name, started, at) => wr(path.join(pdir, name + ".js"), `(window.PROGRESS=window.PROGRESS||{})[${JSON.stringify(name)}]=${JSON.stringify({ agent: name, issue: lv.issue, started: iso(started), at: iso(at), done: "Read the three findings files.", left: "Write the verification section.", eta: "~10 min" })};\n`);
    note("planner", now - 25 * 60000, now - 2 * 60000); note("researcher-blast-radius", now - 60 * 60000, now - 30 * 60000);
    const dp = dumpDom(path.join(ldir, "dashboard.html"), "", null, 6000), sp = inner(dp, '<div class="wip-facts sp-prog"', "div");
    c.push(["the step panel shows each agent's note as an info group: the agent, elapsed, done, left, ETA, as of", dp == null || /class="prog"><span class="l">planner<\/span><small>2\d min in<\/small> done: Read the three findings files\. · left: Write the verification section\. · ETA ~10 min <small>as of/.test(sp), text(sp).slice(0, 240)]);
    c.push(["a note not updated for over 20 minutes is muted, and the legend names both", dp == null || /class="prog stale"><span class="l">researcher-blast-radius/.test(sp) && /a progress note: an agent's own report/.test(dp) && /muted: no update for over 20 minutes/.test(dp), text(sp).slice(0, 200)]);
    c.push(["the progress notes are probed only by a live board: none on the landed example", !/class="prog/.test(inner(d || "", '<section class="wip"', "section")), "the example board"]);
    groups.push(["links to files that exist, live first (plan boards); the rendered Markdown copies; the agents' progress notes in the step panel", c]); }

  /* F, G. the tracking issue's unit boards and its steps after the architecture */
  { const c = [], tree = path.join(sc, "tracking"), F0 = "docs/plans/55-http-client-stack", tdir = path.join(tree, ...F0.split("/")), AE = sk("plan/scripts/apply-event.js"), NEW = sk("plan/scripts/new.js");
    fs.rmSync(tree, { recursive: true, force: true }); fs.mkdirSync(tdir, { recursive: true });
    const p = JSON.parse(TRJ); p.rows.forEach(r => { if (r.unit) { r.unit.board = null; r.unit.folder = null; r.asBuilt = { state: "pending", summary: "Not started." }; if (r.unit.n > 2) delete r.unit.issue; } });
    Object.assign(p, { status: "planned", asBuilt: null }); Object.assign(p.wip, { step: "architecture", current: ["considered"], next: null, landing: null });
    fs.writeFileSync(path.join(tdir, "plan.json"), JSON.stringify(p, null, 2) + "\n"); fs.writeFileSync(path.join(tdir, "dashboard.html"), T["plan-board"]); node(embedJs, tdir);
    const ev = (n, e, f, folder) => { const q = wr(path.join(tree, `req-${e}-${n}.json`), JSON.stringify({ action: "plan-board", github: p.repo, issue: n, event: e, folder: folder || F0, facts: f })); const r = run(AE, ["--event", q, "--worktree", tree, "--no-live", "--json"]); let s = {}; try { s = JSON.parse(r.stdout.trim().split(/\r?\n/).pop()); } catch (x) { s = { error: r.stdout + r.stderr }; } s.status = r.status; return s; };
    const J = f => JSON.parse(rd(path.join(tree, ...f.split("/"), "plan.json")));
    let s = ev(55, "architecture-signed-off", { at: "2026-10-25T14:00:00Z" });
    /* dashboards-skill/28 replaced the one glow on the label column with each unfiled unit's label glowing on its own (verify/cases-28.js) */
    const unfiled = J(F0).rows.filter(r => r.unit && !r.unit.issue).map(r => r.id + ".units");
    c.push(["architecture-signed-off: the tracking board files its units next, each unit not filed yet glowing on its own (dashboards-skill/28)", s.status === 0 && J(F0).wip.step === "sub-issues" && unfiled.length === 9 && JSON.stringify(J(F0).wip.current) === JSON.stringify(unfiled), JSON.stringify([s.result, s.error, J(F0).wip.step, J(F0).wip.current])]);
    const dS = dumpDom(path.join(tdir, "dashboard.html"), "", "1400,1000"), panel = inner(dS, '<div class="sp own', "div");
    c.push(["its step panel counts the units filed, from the rows", dS == null || /2 of 11 units filed as sub-issues/.test(text(panel)), text(panel).slice(0, 200)]);
    c.push(["each unit not filed yet glows on its own label, the label column no glow of its own (dashboards-skill/28)", dS == null || ((dS.match(/<div class="rowlab glow"/g) || []).length === 9 && /<div class="colhead" data-col="units"/.test(dS) && !/<div class="band glow-soft"/.test(dS)), `${(dS.match(/<div class="rowlab glow"/g) || []).length} unit labels glowing`]);
    s = ev(55, "sub-issues-filed", { at: "2026-10-25T14:05:00Z", final: true, units: ["http-core", "test-support", "url-policy", "okhttp-transport", "response-cache", "call-budget", "call-facades", "feeds", "http-docs"].map((u, i) => ({ unit: u, issue: 62 + i })) });
    c.push(["sub-issues-filed (the final one, dashboards-skill/28): each unit's issue written; every unit filed, the step moves to boards", s.status === 0 && J(F0).wip.step === "boards" && J(F0).rows.filter(r => r.unit).every(r => r.unit.issue > 0), JSON.stringify([s.result, s.error, J(F0).wip.step])]);
    const nb = run(NEW, ["--batch", "55-http-client-stack", "--root", tree, "--baseline", "abc1234", "--date", "2026-10-25"]);
    const sub = J(F0 + "/62-http-core");
    c.push(["new.js --batch lays every unit's board that is missing: not started, nothing glowing, its parent linked", nb.status === 0 && /11 boards laid/.test(nb.stdout) && sub.wip.step === null && sub.status === "planned" && !sub.wip.current.length && sub.parent.issue === 55 && sub.parent.board === "../dashboard.html", (nb.stdout || "").split(/\r?\n/).slice(-1)[0]]);
    const k = node(checkJs, path.join(tdir, "62-http-core"), "--root", tree);
    c.push(["check.js passes a laid board (its Gap and Considered still to write: a warning)", k.status === 0 && /no rows/.test(k.stdout), (k.stdout || "").split(/\r?\n/).filter(l => /^FAIL|no rows/.test(l)).join(" | ")]);
    s = ev(55, "boards-created", { at: "2026-10-25T14:10:00Z", final: true });
    c.push(["boards-created (the final one, dashboards-skill/28): every unit linked to its board, the step moves to the plan's landing, nothing glows", s.status === 0 && J(F0).wip.step === "landing" && !J(F0).wip.current.length && J(F0).rows.filter(r => r.unit).every(r => r.unit.board), JSON.stringify([s.result, s.error, J(F0).wip.step])]);
    const dN = dumpDom(path.join(tdir, "62-http-core", "dashboard.html"));
    c.push(["a laid board reads \"Not started\", with no step panel", dN == null || /Not started/.test(text(inner(dN, '<section class="wip"', "section"))) && !/<div class="sp"/.test(dN), text(inner(dN, '<section class="wip"', "section")).slice(0, 160)]);
    s = ev(62, "sized", { at: "2026-10-25T15:00:00Z", step: "research" }, F0 + "/62-http-core");
    c.push(["a later sized starts the laid board in place, and the unit on its tracking board", s.status === 0 && s.result === "ok" && J(F0 + "/62-http-core").wip.step === "research" && J(F0).wip.current.includes("http-core.built"), JSON.stringify([s.result, s.error, J(F0 + "/62-http-core").wip.step, J(F0).wip.current])]);
    const wb = run(sk("plan/scripts/board.js"), ["--root", tree, "--no-gh"]), bj = JSON.parse(rd(path.join(tree, "docs", "plans", "board.json")));
    c.push(["the work board reads a laid board not started, and records its links", wb.status === 0 && (bj.rows.find(r => r.issue === 63) || {}).status === "not-started" && bj.links && typeof bj.links === "object", JSON.stringify((bj.rows.find(r => r.issue === 63) || {}).status) + " " + JSON.stringify(bj.links)]);
    groups.push(["a tracking issue's unit boards laid before its plan lands (new.js --batch, sized in place) and its steps sub-issues and boards (team-raised events)", c]); }

  /* 8, 10. the tablists' keys and the theme remembered across pages, on every type */
  { const c = [], pages = [["a plan board", lib.writeBlock(T["plan-board"], "plan", EX)], ["the work board", lib.writeBlock(T["work-board"], "board", WBJ)], ["a system page", T.system], ["a supersystem page", T.supersystem]];
    const keys = 'const t=[...document.querySelector(\'[role="tablist"]\').querySelectorAll(\'[role="tab"]\')], k=(el,key)=>el.dispatchEvent(new KeyboardEvent("keydown",{key,bubbles:true})), sel=()=>t.findIndex(x=>x.getAttribute("aria-selected")==="true"), o=[]; k(t[0],"End"); o.push(sel()); k(t[t.length-1],"Home"); o.push(sel()); k(t[0],"ArrowLeft"); o.push(sel()); k(t[t.length-1],"ArrowRight"); o.push(sel()); o.push(t.filter(x=>x.tabIndex===0).length); o.push(t.length); document.body.dataset.r=o.join(",");';
    pages.forEach(([w, h], i) => { const d = dumpDom(wr(path.join(sc, "keys", String(i), "index.html"), probeAt(h, keys))), r = got(d).split(",").map(Number), n = r[5];
      c.push([`${w}: End, Home and the arrows move the selection, one tab in the Tab order`, d == null || (r[0] === n - 1 && r[1] === 0 && r[2] === n - 1 && r[3] === 0 && r[4] === 1), got(d)]); });
    /* the theme: picked on one page, applied in the next page's head before its first paint, across types */
    const pre = h => h.replace(/(<script>[^<]*dashboards-theme[^<]*<\/script>)/, '$1<script>window.__t0=document.documentElement.dataset.theme||"none";</script>');
    pages.forEach(([w, h], i) => { const [w2, h2] = pages[(i + 1) % pages.length], dir = path.join(sc, "theme", String(i));
      wr(path.join(dir, "b.html"), probeAt(pre(h2), 'document.body.dataset.r=window.__t0+"/"+getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();'));
      const a = wr(path.join(dir, "a.html"), probeAt(h, 'localStorage.removeItem("dashboards-theme"); document.getElementById("theme").click(); setTimeout(()=>{ location.href="b.html"; },100);'));
      const d = dumpDom(a, "", null, 7000);
      c.push([`the night theme picked on ${w} is applied by ${w2} before its first paint`, d == null || /^dark\/#10141b$/.test(got(d)), got(d) || "no probe result"]); });
    groups.push(["the tablists' keys (Home, End, arrows, a roving tabindex) and the theme remembered across pages before the first paint, on every type", c]); }

  /* I. built or planned from the code; a supersystem from its core subsystems */
  { const c = [], tree = path.join(sc, "code"), D = path.join(tree, "docs", "dashboards"), AS = sk("system/scripts/apply-state.js");
    const stamp = { ref: "main", sha: "1111111", date: "2026-10-20" }, st = slug => L.stateText({ slug, version: null, asIs: stamp, written: { sha: "1111111" } });
    const reg = { repo: "acme/widgets", updated: "2026-10-20", systems: [
      { slug: "repo", name: "widgets", kind: "repo", parent: null, status: "built", function: "x", paths: ["."], version: null, asIs: stamp, page: "index.html", dsl: "workspace.dsl" },
      { slug: "stack", name: "stack", kind: "supersystem", parent: null, status: "planned", function: "x", paths: [] },
      { slug: "core-a", name: "core-a", kind: "system", parent: "stack", core: true, status: "planned", function: "x", paths: ["core-a/"] },
      { slug: "core-b", name: "core-b", kind: "system", parent: "stack", core: true, status: "planned", function: "x", paths: ["core-b/"] },
      { slug: "extra", name: "extra", kind: "system", parent: "stack", core: false, status: "planned", function: "x", paths: ["extra/"] },
      /* the template's own sample systems, which its HTML names; no code paths, so their status stays theirs */
      { slug: "system-alpha", name: "system-alpha", kind: "system", parent: null, status: "built", function: "x", paths: [], asIs: stamp },
      { slug: "system-beta", name: "system-beta", kind: "system", parent: null, status: "built", function: "x", paths: [], asIs: stamp },
      { slug: "system-gamma", name: "system-gamma", kind: "system", parent: null, status: "planned", function: "x", paths: [] }] };
    const regText = () => JSON.stringify(reg, null, 2) + "\n";
    const build = () => { fs.rmSync(tree, { recursive: true, force: true }); fs.mkdirSync(D, { recursive: true }); fs.writeFileSync(path.join(D, "systems.json"), regText()); fs.writeFileSync(path.join(D, "state.json"), st("repo"));
      const dsl = L.blockText(T.supersystem, "dsl"); fs.writeFileSync(path.join(D, "workspace.dsl"), dsl + "\n");
      fs.writeFileSync(path.join(D, "index.html"), L.embedInto(L.embedInto(L.embedInto(T.supersystem, "systems", regText()), "dsl", dsl), "state", st("repo"))); };
    const req = facts => wr(path.join(tree, "req.json"), JSON.stringify({ action: "state-pages", github: "acme/widgets", issue: 9, branch: "feat/9", facts: { at: "2026-10-25T12:00:00Z", sha: "2222222", systems: ["core-a"], ...facts } }));
    const apply = f => { const r = run(AS, ["--event", f, "--worktree", tree, "--json"]); let s = {}; try { s = JSON.parse(r.stdout.trim().split(/\r?\n/).pop()); } catch (x) { s = { error: r.stdout + r.stderr }; } s.status = r.status; return s; };
    const R = () => JSON.parse(rd(path.join(D, "systems.json"))), S = slug => R().systems.find(e => e.slug === slug).status;
    build(); fs.mkdirSync(path.join(tree, "core-a"));
    let s = apply(req({}));
    c.push(["a system whose code is there is built, from the code alone (no built fact)", s.status === 0 && S("core-a") === "built" && S("core-b") === "planned", JSON.stringify([s.result, s.error, S("core-a"), S("core-b")])]);
    c.push(["its supersystem stays planned while a core subsystem is not built", S("stack") === "planned", S("stack")]);
    fs.mkdirSync(path.join(tree, "core-b")); s = apply(req({ sha: "3333333", systems: ["core-b"] }));
    c.push(["once every core subsystem is built the supersystem is built; its optional one does not count", s.status === 0 && S("core-b") === "built" && S("stack") === "built" && S("extra") === "planned", JSON.stringify([s.result, s.error, S("stack"), S("extra")])]);
    s = apply(req({ sha: "4444444", systems: ["extra"], built: ["extra"] }));
    c.push(["a built fact the code contradicts is overruled by the code, and noted", s.status === 0 && S("extra") === "planned" && (s.notes || []).some(n => /the code decides/.test(n)), JSON.stringify([s.result, S("extra"), s.notes])]);
    /* an unclassified subsystem: enrich, and the supersystem's status left */
    reg.systems.find(e => e.slug === "extra").core = undefined; reg.systems.forEach(e => { if (e.slug !== "repo") e.status = e.slug === "stack" ? "planned" : e.status; }); build(); fs.mkdirSync(path.join(tree, "core-a")); fs.mkdirSync(path.join(tree, "core-b"));
    s = apply(req({}));
    c.push(["a subsystem not classified core or optional: the supersystem's status is left, enrich yes", s.status === 0 && S("stack") === "planned" && s.enrich === "yes" && s.why.some(w => /not classified core or optional/.test(w)), JSON.stringify([s.result, S("stack"), s.why])]);
    const ck = run(checker, [path.join(D, "index.html"), "--auto", "--no-browser"]);
    c.push(["check-page.js warns on the unclassified subsystem", /SUBSYSTEM UNCLASSIFIED: stack's extra/.test(ck.stdout), (ck.stdout || "").split(/\r?\n/).filter(l => /UNCLASSIFIED|STATUS/.test(l)).join(" | ")]);
    /* the registry contradicting the code */
    const bad = JSON.parse(rd(path.join(D, "systems.json"))); bad.systems.find(e => e.slug === "core-b").status = "planned"; const bt = JSON.stringify(bad, null, 2) + "\n";
    fs.writeFileSync(path.join(D, "systems.json"), bt); fs.writeFileSync(path.join(D, "index.html"), L.embedInto(rd(path.join(D, "index.html")), "systems", bt));
    const cb = run(checker, [path.join(D, "index.html"), "--auto", "--no-browser"]);
    c.push(["check-page.js fails a status the code contradicts (STATUS DISAGREES WITH CODE)", cb.status === 1 && /STATUS DISAGREES WITH CODE: core-b is planned in systems\.json/.test(cb.stdout), (cb.stdout || "").split(/\r?\n/).filter(l => /STATUS/.test(l)).join(" | ")]);
    /* a part with code paths of its own */
    const C = L.codeStatus({ systems: [{ slug: "a", kind: "system", status: "built", paths: ["core-a/"], dsl: "a/workspace.dsl", partPaths: { "repo.a.x": ["core-a/"], "repo.a.y": ["core-a/missing.kt"] } }] }, tree, null);
    c.push(["a part is built while its code paths are there, planned while none is", C.parts.find(x => x.id === "repo.a.x").planned === false && C.parts.find(x => x.id === "repo.a.y").planned === true, JSON.stringify(C.parts)]);
    groups.push(["built or planned from the code (apply-state.js, statelib codeStatus, check-page.js): a system from its code paths, a part from its own, a supersystem once every core subsystem is", c]); }

  return groups;
};
