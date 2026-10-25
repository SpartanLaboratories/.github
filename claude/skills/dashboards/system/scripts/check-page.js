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
// checked, no more than six elements glow, no work level is shown (levelrefs.js: "level 3", "L3", "level: 2" and the like, in any
// tab's text or the page's), no system colour falls in a status spectrum (palette.js: the --sys-N slots and a system page's
// --server / --client / --wire, read from the page's CSS and, in the browser, as the theme of the pass computes them), and no
// error fired. Then, by kind: a system page has a visible Guarantees area
// (.guarantees holding at least one .bubble) and, when the page sits under a docs/dashboards/ with a systems.json in a git
// work tree, no registry page or DSL file is git-ignored, and every entry of its BOARDS map (issue number → plan board) names a
// board file that is there; a plan board has a visible WIP strip (.wip) with its own legend, and its
// Impact tab shows no planning information (no dashed element, no planned / as-built pill, no changes-from-the-plan list). --theme sets
// data-theme on <html>. --frame loads the page inside an iframe of that width (the harness for real phone widths, below what
// headless Chrome lays out as a window). The page is loaded from a wrapper copy in the output directory, so the committed file
// is never modified.
//
//   node check-page.js <page.html> --auto [--out <dir>]
//
// --auto checks only what the page adds to its template (GUIDANCE.md §8; deviation.js): no browser pass for a plan board or work
// board that is a verified template plus its data; one light pass for a system page whose CSS, tabs, script before MODEL (less its
// page-filled lines, REPO and SRC) and renderer are the verified template's (the facts it fills in); the full pass (light, dark, 520 px, a 390 px frame, 1920 x 1080 desktop) for a page that diverges — declared or
// not — or whose template changed since verify/verify-templates.js last verified it.
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const args = process.argv.slice(2);
require("./cliargs.js").strict(args, { usage: "usage: node check-page.js <page.html> [--auto] [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark] [--frame <px>]", valued: ["out", "tab", "width", "height", "theme", "frame"], flags: ["auto"], min: 1, max: 1 });
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const VALUED = ["--out", "--tab", "--width", "--height", "--theme", "--frame"];
const page = args.find((a, i) => !a.startsWith("--") && !(i > 0 && VALUED.includes(args[i - 1])));
if (!page) { console.error("usage: node check-page.js <page.html> [--auto] [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark] [--frame <px>]"); process.exit(2); }

/* The palette (GUIDANCE.md §1; palette.js), read from the page's CSS without a browser, so it holds on every page whatever its
   passes: a system colour in a status spectrum fails; a slot that is not the shared palette's value is a warning. */
const { paletteCheck, ALLOWED_HUES, STATUS_MIN_SAT } = require("./palette.js");
const palette = fs.existsSync(page) ? paletteCheck(fs.readFileSync(page, "utf8")) : { tokens: 0, problems: [], warnings: [] };
const paletteLines = () => [`CHECK palette: ${palette.tokens} system-colour tokens${palette.problems.length ? "" : ", none in a status spectrum"}`,
  ...palette.problems.map(p => "CHECK palette: PALETTE IN STATUS HUE " + p), ...palette.warnings.map(w => "CHECK palette: warning: " + w)];

if (args.includes("--auto")) {
  const { deviation } = require("./deviation.js");
  const d = deviation(page);
  paletteLines().forEach(l => console.log(l));
  console.log(`CHECK template: ${d.kind} page · ${d.verdict} · ${d.passes === "none" ? "no browser pass" : d.passes === "light" ? "one light pass (the facts it fills in)" : "full pass (light, dark, 520, frame 390, desktop 1920x1080)"}`);
  d.notes.forEach(n => console.log("CHECK template: " + n));
  if (d.passes === "none") { console.log(palette.problems.length ? "FAIL: a system colour in a status spectrum" : "PASS"); process.exit(palette.problems.length ? 1 : 0); }
  const rest = args.filter(a => a !== "--auto" && a !== page);
  const modes = d.passes === "light" ? [[]] : [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"], ["--width", "1920", "--height", "1080"]];
  let failed = 0;
  modes.forEach(m => {
    const r = cp.spawnSync(process.execPath, [__filename, page, ...rest, ...m], { encoding: "utf8" });
    const lines = (r.stdout || "").trim().split(/\r?\n/), label = m.join(" ") || "light";
    const bad = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG HEADING|DEAD href|TOO MANY|HORIZONTAL SCROLL|LEVEL REFERENCE|RAW UTC STAMP|PALETTE IN STATUS HUE|IMPACT SHOWS PLANNING|GIT-IGNORED|DEAD BOARD LINK|BOARDS UNREADABLE|FAIL/.test(l));
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
const { LEVEL_PATTERNS } = require("./levelrefs.js");
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
  /* work levels are never shown (levelrefs.js): the text of every tab, then of the whole page, is scanned */
  const LV=${JSON.stringify(LEVEL_PATTERNS)}.map(([s,f])=>new RegExp(s,f+"g")), lvHits=new Set();
  const lvScan=(txt,where)=>LV.forEach(re=>{ re.lastIndex=0; let m; while((m=re.exec(txt||""))) lvHits.add(where+": “"+m[0]+"”"); });
  tabs.forEach(t=>{ try{ t.click(); const p=document.getElementById(t.getAttribute("aria-controls")); if(p) lvScan(p.innerText,"tab "+t.id); const vis=p&&!p.hidden&&getComputedStyle(p).display!=="none"; const drawn=p?p.querySelectorAll("svg *, table, .card, .thread, .syscard, .cell, .bcard, .run").length:0; const keys=p?[...p.querySelectorAll(".key, .c4key")].filter(k=>shown(k)&&k.children.length).length:0; console.log("CHECK tab "+t.id+": "+(vis?"visible":"NOT VISIBLE")+" · "+drawn+" drawn nodes · "+(keys?"legend":"NO LEGEND (every tab needs a visible .key)")); }catch(err){ console.log("CHECK tab "+t.id+" threw: "+err.message); } });
  if(kind==="system"){
    const g=document.querySelector(".guarantees"), b=g?[...g.querySelectorAll(".bubble")].filter(shown).map(x=>(x.querySelector("h3")||{}).firstChild):[];
    console.log("CHECK guarantees: "+(shown(g)&&b.length?b.length+" bubbles · "+b.map(n=>n?n.textContent.trim():"?").join(" · "):"MISSING (no visible .guarantees area with a .bubble)"));
  }
  if(kind==="plan-board"){
    const w=document.querySelector(".wip"), k=w?w.querySelector(".key"):null;
    console.log("CHECK wip strip: "+(shown(w)&&w.textContent.trim()?"shown · step "+(w.dataset.step||"?")+(shown(k)&&k.children.length?" · legend":" · NO LEGEND (the strip needs its own .key)"):"MISSING (a plan board shows a visible .wip strip)"));
    /* The Impact tab shows the current best-known impact and no planning information (GUIDANCE.md §1; plan/RULES.md §2): nothing
       on it is dashed, no pill tells the planned impact from the as-built one, and no list of changes from the planned impact. */
    const ti=document.getElementById("t-impact"), ip=document.getElementById("p-impact");
    if(ti&&ip){ ti.click();
      const sides=["Top","Right","Bottom","Left"], dashed=[...ip.querySelectorAll("*")].filter(e=>{ if(!shown(e)) return false; const s=getComputedStyle(e); return sides.some(d=>s["border"+d+"Style"]==="dashed"&&parseFloat(s["border"+d+"Width"])>0)||(s.outlineStyle==="dashed"&&parseFloat(s.outlineWidth)>0); });
      const pills=[...ip.querySelectorAll(".vp, .chip, .badge")].filter(e=>/^\\W*(planned impact|as built(, amended)?|not recorded)\\s*$/i.test(e.textContent.trim()));
      const chg=/changes from the planned impact/i.test(ip.innerText);
      const what=[dashed.length?dashed.length+" dashed element"+(dashed.length>1?"s":"")+" ("+dashed.slice(0,3).map(e=>e.tagName.toLowerCase()+(e.className&&typeof e.className==="string"?"."+e.className.trim().split(/\\s+/).join("."):"")).join(", ")+")":"",pills.length?"a planned / as-built pill ("+pills[0].textContent.trim()+")":"",chg?"a changes-from-the-planned-impact list":""].filter(Boolean);
      console.log("CHECK impact: "+(what.length?"IMPACT SHOWS PLANNING: "+what.join("; ")+": the tab shows only the current best-known impact, one solid card style":"current impact only, nothing dashed"));
    }
  }
  /* System colours (GUIDANCE.md §1; palette.js): no slot in a status spectrum, as the theme of this pass computes them. */
  const AH=${JSON.stringify(ALLOWED_HUES)}, MS=${STATUS_MIN_SAT}, rs=getComputedStyle(document.documentElement);
  const rgbOf=v=>{ v=(v||"").trim().toLowerCase(); let m=v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/); if(m){ const h=m[1].length===3?m[1].split("").map(c=>c+c).join(""):m[1]; return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); } m=v.match(/^rgba?\\(\\s*([\\d.]+)\\D+([\\d.]+)\\D+([\\d.]+)/); return m?[m[1],m[2],m[3]].map(Number):null; };
  const hueBad=v=>{ const c=rgbOf(v); if(!c) return null; const [r,g,b]=c.map(x=>x/255), mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, d=mx-mn, s=d?d/(1-Math.abs(2*l-1)):0; if(s<MS) return null; let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4; h*=60; if(h<0) h+=360; return h>=AH[0]&&h<AH[1]?null:Math.round(h); };
  const toks=[1,2,3,4,5,6].map(n=>"--sys-"+n).concat(["--server","--client","--wire","--server-soft","--client-soft","--wire-soft"]).map(n=>[n,rs.getPropertyValue(n).trim()]).filter(x=>x[1]);
  const palBad=toks.map(([n,v])=>[n,v,hueBad(v)]).filter(x=>x[2]!=null);
  console.log("CHECK palette (computed): "+toks.length+" tokens"+(palBad.length?" · PALETTE IN STATUS HUE "+palBad.map(x=>x[0]+" "+x[1]+" (hue "+x[2]+"°)").join(", "):" · none in a status spectrum"));
  const c=document.querySelector(".context > h2"), ct=c?c.textContent.trim():"";
  console.log("CHECK context: "+(ct==="Context"?"headed Context":c?"WRONG HEADING '"+ct+"' (must read Context)":"MISSING (no .context section with an h2)"));
  const dead=document.querySelectorAll('a[href="#"]').length; if(dead) console.log("CHECK links: DEAD href=# x"+dead);
  /* Times (GUIDANCE.md §6): shown in the viewer's local time, the exact UTC value kept in the <time>'s datetime and title. Checked
     against the UTC source, so the result never depends on the machine's time zone: every <time> holding a zoned stamp has it as
     its title and does not show it raw, and no zoned ISO stamp is left as plain text (code, pre and the Source view excepted). */
  const ZS=/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:?\\d{2})/;
  const times=[...document.querySelectorAll("time[datetime]")].filter(t=>ZS.test(t.getAttribute("datetime")));
  const badT=times.filter(t=>!(t.title||"").includes(t.getAttribute("datetime"))||ZS.test(t.textContent));
  const raw=[]; const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest("script,style,pre,code,time,#p-source")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  while(tw.nextNode()){ const m=ZS.exec(tw.currentNode.nodeValue); if(m) raw.push(m[0]); }
  console.log("CHECK times: "+times.length+" local"+(badT.length?" · RAW UTC STAMP in a <time> without its UTC title ("+badT.slice(0,3).map(t=>t.getAttribute("datetime")).join(", ")+")":"")+(raw.length?" · RAW UTC STAMP shown as text ("+raw.slice(0,3).join(", ")+"): render it with when()":""));
  const glow=document.querySelectorAll(".glow").length; console.log("CHECK glow: "+glow+(glow>6?" TOO MANY (at most six elements glow)":""));
  const want=${JSON.stringify(tab)}; const t=want?document.getElementById(want):tabs[0]; if(t) t.click();
  lvScan(document.body.innerText,"page"); console.log("CHECK work levels: "+(lvHits.size?"LEVEL REFERENCE shown ("+[...lvHits].slice(0,6).join("; ")+"): a dashboard never shows a work level":"none shown"));
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

// The board links of a system, supersystem or repository page (GUIDANCE.md §5; system/RULES.md §6): its BOARDS map, issue number →
// plan board relative to the page, filled by the presenter on its one line. A link never points at a file that is not there, so an
// entry whose file is missing fails (DEAD BOARD LINK), and so does a map that is not plain JSON (keys and paths in double quotes).
function boardLinks() {
  if (/<meta name="dashboard" content="(plan-board|work-board)">/.test(src)) return null;
  const m = src.match(/^const BOARDS=(.*?);\s*(\/\/.*)?$/m);
  if (!m) return { note: "board links: no BOARDS map (a page on a template older than the board-link rule)", problems: [] };
  let map; try { map = JSON.parse(m[1]); } catch (e) { return { note: "", problems: [`BOARDS UNREADABLE: const BOARDS=${m[1].slice(0, 80)} is not plain JSON (${e.message})`] }; }
  const dir = path.dirname(path.resolve(page)), entries = Object.entries(map || {});
  const problems = entries.filter(([, p]) => typeof p !== "string" || /^[a-z]+:/i.test(p) || !fs.existsSync(path.resolve(dir, p.split("#")[0])))
    .map(([n, p]) => `DEAD BOARD LINK: BOARDS["${n}"] = ${JSON.stringify(p)} is not a plan board file relative to this page`);
  return { note: `board links: ${entries.length} in BOARDS, ${problems.length} dead`, problems };
}
const boardCheck = boardLinks();

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
const errors = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG HEADING|DEAD href|TOO MANY|HORIZONTAL SCROLL|LEVEL REFERENCE|RAW UTC STAMP|PALETTE IN STATUS HUE|IMPACT SHOWS PLANNING/.test(l));
lines.forEach(l => console.log(l));
paletteLines().forEach(l => { console.log(l); if (/PALETTE IN STATUS HUE/.test(l)) errors.push(l); });
if (regCheck) { if (regCheck.note) console.log("CHECK " + regCheck.note); regCheck.problems.forEach(p => { console.log("CHECK " + p); errors.push(p); }); }
if (boardCheck) { if (boardCheck.note) console.log("CHECK " + boardCheck.note); boardCheck.problems.forEach(p => { console.log("CHECK " + p); errors.push(p); }); }
console.log(`screenshot: ${shot}`);
if (!lines.some(l => l.includes("CHECK done"))) { console.log("FAIL: the probe never completed (page did not load, or scripts aborted before the probe ran)"); process.exit(1); }
if (errors.length) { console.log(`FAIL: ${errors.length} problem(s)`); process.exit(1); }
console.log("PASS");
