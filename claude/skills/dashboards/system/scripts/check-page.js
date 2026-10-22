#!/usr/bin/env node
// The browser checker for every dashboard page: system, supersystem and repository pages, plan boards and the work board.
// Opens a page in headless Chrome (or Edge), clicks every tab, and reports whether each panel rendered, whether it shows a
// legend, and whether any script error fired; then checks the page-kind rules. Writes a screenshot beside the report.
//
//   node check-page.js <page.html> [--out <dir>] [--tab <tabId>] [--width 1400] [--height 1500] [--theme light|dark] [--frame <px>]
//
// Page kind: <meta name="dashboard" content="plan-board|work-board"> marks a plan board or the work board; anything else is a
// system page. Exit code 0 when, for every kind: every tab rendered with a visible legend (.key, or .c4key on the C4 tab), the
// Context section is headed exactly "Context", no link is a dead href="#", the page has no horizontal scroll at the width
// checked, no more than six elements glow, and no error fired. Then, by kind: a system page has a visible Guarantees area
// (.guarantees holding at least one .bubble) and, when the page sits under a docs/dashboards/ with a systems.json in a git
// work tree, no registry page or DSL file is git-ignored; a plan board has a visible WIP strip (.wip) with its own legend. --theme sets
// data-theme on <html>. --frame loads the page inside an iframe of that width (the harness for real phone widths, below what
// headless Chrome lays out as a window). The page is loaded from a wrapper copy in the output directory, so the committed file
// is never modified.
//
//   node check-page.js <page.html> --auto [--out <dir>]
//
// --auto checks only what the page adds to its template (GUIDANCE.md §8; deviation.js): no browser pass for a plan board or work
// board that is a verified template plus its data; one light pass for a system page whose CSS, tabs, script before MODEL (less its
// page-filled lines, REPO and SRC) and renderer are the verified template's (the facts it fills in); the full pass (light, dark, 520 px, a 390 px frame) for a page that diverges — declared or
// not — or whose template changed since verify/verify-templates.js last verified it.
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const VALUED = ["--out", "--tab", "--width", "--height", "--theme", "--frame"];
const page = args.find((a, i) => !a.startsWith("--") && !(i > 0 && VALUED.includes(args[i - 1])));
if (!page) { console.error("usage: node check-page.js <page.html> [--auto] [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark] [--frame <px>]"); process.exit(2); }

if (args.includes("--auto")) {
  const { deviation } = require("./deviation.js");
  const d = deviation(page);
  console.log(`CHECK template: ${d.kind} page · ${d.verdict} · ${d.passes === "none" ? "no browser pass" : d.passes === "light" ? "one light pass (the facts it fills in)" : "full pass (light, dark, 520, frame 390)"}`);
  d.notes.forEach(n => console.log("CHECK template: " + n));
  if (d.passes === "none") { console.log("PASS"); process.exit(0); }
  const rest = args.filter(a => a !== "--auto" && a !== page);
  const modes = d.passes === "light" ? [[]] : [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"]];
  let failed = 0;
  modes.forEach(m => {
    const r = cp.spawnSync(process.execPath, [__filename, page, ...rest, ...m], { encoding: "utf8" });
    const lines = (r.stdout || "").trim().split(/\r?\n/), label = m.join(" ") || "light";
    const bad = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG HEADING|DEAD href|TOO MANY|HORIZONTAL SCROLL|GIT-IGNORED|FAIL/.test(l));
    console.log(`CHECK pass ${label}: ${r.status === 0 ? "PASS" : "FAIL"} · ${(lines.find(l => l.startsWith("screenshot:")) || "").replace("screenshot: ", "")}`);
    bad.forEach(l => console.log("  " + l));
    if (r.status !== 0) failed++;
  });
  console.log(failed ? `FAIL: ${failed} of ${modes.length} pass(es)` : "PASS");
  process.exit(failed ? 1 : 0);
}
const out = opt("out", path.join(os.tmpdir(), "dashboard-check")), tab = opt("tab", ""), theme = opt("theme", ""), frame = +opt("frame", 0);
const width = +opt("width", frame ? frame + 48 : 1400), height = +opt("height", 1500);
fs.mkdirSync(out, { recursive: true });

const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const browser = process.env.CHROME && fs.existsSync(process.env.CHROME) ? process.env.CHROME : browsers.find(b => fs.existsSync(b));
if (!browser) { console.error("no Chrome/Edge found; set CHROME=<path to binary>"); process.exit(2); }

// The probe appended to the page: report tab clicks and errors through console.log, which headless Chrome echoes to stderr with
// --enable-logging=stderr (from an iframe too). A legend counts when it is rendered (not display:none) and has at least one entry.
const probe = `<script>
window.addEventListener("error",e=>console.log("CHECK ERROR: "+e.message+" @"+(e.filename||"")+":"+e.lineno));
window.addEventListener("load",()=>{ setTimeout(()=>{
  const theme=${JSON.stringify(theme)}; if(theme) document.documentElement.dataset.theme=theme;
  const meta=document.querySelector('meta[name="dashboard"]'), kind=meta?meta.content:"system";
  console.log("CHECK kind: "+kind);
  const shown=e=>!!e&&e.offsetParent!==null;
  const tabs=[...document.querySelectorAll('[role="tab"]')]; console.log("CHECK tabs: "+tabs.length);
  tabs.forEach(t=>{ try{ t.click(); const p=document.getElementById(t.getAttribute("aria-controls")); const vis=p&&!p.hidden&&getComputedStyle(p).display!=="none"; const drawn=p?p.querySelectorAll("svg *, table, .card, .thread, .syscard, .cell, .bcard, .run").length:0; const keys=p?[...p.querySelectorAll(".key, .c4key")].filter(k=>shown(k)&&k.children.length).length:0; console.log("CHECK tab "+t.id+": "+(vis?"visible":"NOT VISIBLE")+" · "+drawn+" drawn nodes · "+(keys?"legend":"NO LEGEND (every tab needs a visible .key)")); }catch(err){ console.log("CHECK tab "+t.id+" threw: "+err.message); } });
  if(kind==="system"){
    const g=document.querySelector(".guarantees"), b=g?[...g.querySelectorAll(".bubble")].filter(shown).map(x=>(x.querySelector("h3")||{}).firstChild):[];
    console.log("CHECK guarantees: "+(shown(g)&&b.length?b.length+" bubbles · "+b.map(n=>n?n.textContent.trim():"?").join(" · "):"MISSING (no visible .guarantees area with a .bubble)"));
  }
  if(kind==="plan-board"){
    const w=document.querySelector(".wip"), k=w?w.querySelector(".key"):null;
    console.log("CHECK wip strip: "+(shown(w)&&w.textContent.trim()?"shown · step "+(w.dataset.step||"?")+(shown(k)&&k.children.length?" · legend":" · NO LEGEND (the strip needs its own .key)"):"MISSING (a plan board shows a visible .wip strip)"));
  }
  const c=document.querySelector(".context > h2"), ct=c?c.textContent.trim():"";
  console.log("CHECK context: "+(ct==="Context"?"headed Context":c?"WRONG HEADING '"+ct+"' (must read Context)":"MISSING (no .context section with an h2)"));
  const dead=document.querySelectorAll('a[href="#"]').length; if(dead) console.log("CHECK links: DEAD href=# x"+dead);
  const glow=document.querySelectorAll(".glow").length; console.log("CHECK glow: "+glow+(glow>6?" TOO MANY (at most six elements glow)":""));
  const want=${JSON.stringify(tab)}; const t=want?document.getElementById(want):tabs[0]; if(t) t.click();
  const sw=document.documentElement.scrollWidth, cw=document.documentElement.clientWidth;
  console.log("CHECK width: "+cw+"px"+(sw>cw+1?" · HORIZONTAL SCROLL ("+sw+"px of content)":" · no horizontal scroll"));
  if(want){ const bar=document.querySelector('[role="tablist"]'); if(bar) window.scrollTo(0, bar.getBoundingClientRect().top+window.scrollY-8); }
  console.log("CHECK done");
},400); });
</script>`;
const src = fs.readFileSync(page, "utf8");

// The registry check (system/RULES.md §9): on a system, supersystem or repository page, find the docs/dashboards/systems.json
// the page belongs to and fail when the registry, or any entry's page or workspace.dsl, is git-ignored in its repository, as a
// `build/` rule swallows docs/dashboards/build/. Files are tested, never folders: `git check-ignore --no-index` reports every
// path ending in "/" as matched (by a blank .gitignore line, in git 2.55), so a folder is tested through the files the
// registry puts in it. --no-index tests the rules alone, so a tracked file under an ignored folder still fails (the next file
// added there would not be). Outside a git work tree the check is skipped with a note.
function registryIgnored() {
  if (/<meta name="dashboard" content="(plan-board|work-board)">/.test(src)) return null;
  let dir = path.dirname(path.resolve(page)), reg = null;
  for (;;) {
    if (path.basename(dir) === "dashboards" && fs.existsSync(path.join(dir, "systems.json"))) { reg = path.join(dir, "systems.json"); break; }
    if (fs.existsSync(path.join(dir, "docs", "dashboards", "systems.json"))) { reg = path.join(dir, "docs", "dashboards", "systems.json"); break; }
    if (path.dirname(dir) === dir) break;
    dir = path.dirname(dir);
  }
  if (!reg) return { note: "registry: no docs/dashboards/systems.json above the page; git-ignore check skipped", problems: [] };
  const dash = path.dirname(reg);
  let systems; try { systems = JSON.parse(fs.readFileSync(reg, "utf8")).systems || []; } catch (e) { return { note: "", problems: [`REGISTRY UNREADABLE: ${e.message}`] }; }
  const files = new Map([["systems.json", "the registry"]]);
  systems.forEach(s => ["page", "dsl"].forEach(k => { const f = typeof s[k] === "string" ? s[k].trim().replace(/\\/g, "/").replace(/^\.?\/+/, "") : ""; if (f && !f.endsWith("/")) files.set(f, `${s.slug || "?"} ${k}`); }));
  const git = a => cp.spawnSync("git", ["-C", dash, ...a], { encoding: "utf8" });
  if (git(["rev-parse", "--is-inside-work-tree"]).status !== 0) return { note: "registry: not inside a git work tree; git-ignore check skipped", problems: [] };
  const rels = [...files.keys()];
  const r = git(["check-ignore", "--no-index", "--", ...rels]);
  if (r.status !== 0 && r.status !== 1) return { note: `registry: git check-ignore failed (${(r.stderr || "").trim()}); git-ignore check skipped`, problems: [] };
  const hit = (r.stdout || "").split(/\r?\n/).filter(Boolean);
  const why = hit.length ? (git(["check-ignore", "--no-index", "-v", "--", ...hit]).stdout || "").split(/\r?\n/).filter(Boolean) : [];
  const problems = hit.map(f => { const v = why.find(l => l.endsWith("\t" + f)); return `GIT-IGNORED: ${files.get(f)} docs/dashboards/${f}${v ? ` (rule ${v.split("\t")[0]})` : ""}: the file would never be committed; rename the folder or add a negation`; });
  return { note: `registry: ${rels.length} paths from systems.json, ${hit.length} git-ignored`, problems };
}
const regCheck = registryIgnored();

const wrapped =src.includes("</body>") ? src.replace("</body>", probe + "\n</body>") : src + probe;
const base = path.basename(path.dirname(path.resolve(page))) + "." + path.basename(page, ".html");
const wrapperPath = path.join(out, base + ".check.html");
const shot = path.join(out, base + (tab ? "." + tab : "") + (theme ? "." + theme : "") + (frame ? ".frame" + frame : width !== 1400 ? "." + width : "") + ".png");
fs.writeFileSync(wrapperPath, wrapped);
let target = wrapperPath;
if (frame) {
  // The harness: the wrapped page inside an iframe of the phone width.
  target = path.join(out, base + ".frame.html");
  fs.writeFileSync(target, `<!doctype html><meta charset="utf-8"><title>frame ${frame}</title><style>body{margin:0;background:#888}iframe{display:block;margin:0 auto;border:0;background:#fff}</style><iframe src="${path.basename(wrapperPath)}" width="${frame}" height="${height}"></iframe>`);
}

const url = "file:///" + path.resolve(target).replace(/\\/g, "/");
const r = cp.spawnSync(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--enable-logging=stderr", "--v=0",
  "--allow-file-access-from-files", "--virtual-time-budget=6000", `--window-size=${width},${height}`, `--screenshot=${shot}`, url], { encoding: "utf8", timeout: 120000 });
// Chrome prints console lines as `[...] "message", source: <url> (<line>)`; keep just the message.
const lines = (r.stderr || "").split(/\r?\n/).filter(l => /CONSOLE|Uncaught/.test(l)).map(l => l.replace(/^.*CONSOLE[^"]*"/, "").replace(/", source:[\s\S]*$/, "").trim());
const errors = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG HEADING|DEAD href|TOO MANY|HORIZONTAL SCROLL/.test(l));
lines.forEach(l => console.log(l));
if (regCheck) { if (regCheck.note) console.log("CHECK " + regCheck.note); regCheck.problems.forEach(p => { console.log("CHECK " + p); errors.push(p); }); }
console.log(`screenshot: ${shot}`);
if (!lines.some(l => l.includes("CHECK done"))) { console.log("FAIL: the probe never completed (page did not load, or scripts aborted before the probe ran)"); process.exit(1); }
if (errors.length) { console.log(`FAIL: ${errors.length} problem(s)`); process.exit(1); }
console.log("PASS");
