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
// (.guarantees holding at least one .bubble); a plan board has a visible WIP strip (.wip) with its own legend. --theme sets
// data-theme on <html>. --frame loads the page inside an iframe of that width (the harness for real phone widths, below what
// headless Chrome lays out as a window). The page is loaded from a wrapper copy in the output directory, so the committed file
// is never modified.
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const page = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!page) { console.error("usage: node check-page.js <page.html> [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark] [--frame <px>]"); process.exit(2); }
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
const wrapped = src.includes("</body>") ? src.replace("</body>", probe + "\n</body>") : src + probe;
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
console.log(`screenshot: ${shot}`);
if (!lines.some(l => l.includes("CHECK done"))) { console.log("FAIL: the probe never completed (page did not load, or scripts aborted before the probe ran)"); process.exit(1); }
if (errors.length) { console.log(`FAIL: ${errors.length} problem(s)`); process.exit(1); }
console.log("PASS");
