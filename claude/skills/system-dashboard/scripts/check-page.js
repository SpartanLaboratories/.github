#!/usr/bin/env node
// Opens a dashboard page in headless Chrome (or Edge), clicks every tab, and reports whether each
// panel rendered, whether it shows a legend, and whether any script error fired; then checks the
// Guarantees area and the Context heading. Writes a screenshot beside the report.
//
//   node check-page.js <page.html> [--out <dir>] [--tab <tabId>] [--width 1400] [--height 1500] [--theme light|dark]
//
// Exit code 0 when every tab rendered with a visible legend (.key, or .c4key on the C4 tab), the
// page has a visible Guarantees area (.guarantees holding at least one .bubble), its Context section
// is headed exactly "Context", and no error fired; 1 otherwise. --theme sets data-theme on <html>
// so the dark tokens can be looked at. The page is loaded from a wrapper copy in the output
// directory, so the committed file is never modified.
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const page = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!page) { console.error("usage: node check-page.js <page.html> [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark]"); process.exit(2); }
const out = opt("out", path.join(os.tmpdir(), "dashboard-check")), tab = opt("tab", ""), width = +opt("width", 1400), height = +opt("height", 1500), theme = opt("theme", "");
fs.mkdirSync(out, { recursive: true });

const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].concat(process.env.CHROME ? [process.env.CHROME] : []);
const browser = browsers.find(b => fs.existsSync(b));
if (!browser) { console.error("no Chrome/Edge found; set CHROME=<path to binary>"); process.exit(2); }

// The probe appended to the page: report tab clicks and errors through console.log, which headless Chrome
// echoes to stderr with --enable-logging=stderr.
// A legend counts when it is rendered (not display:none) and has at least one entry.
const probe = `<script>
window.addEventListener("error",e=>console.log("CHECK ERROR: "+e.message+" @"+(e.filename||"")+":"+e.lineno));
window.addEventListener("load",()=>{ setTimeout(()=>{
  const theme=${JSON.stringify(theme)}; if(theme) document.documentElement.dataset.theme=theme;
  const shown=e=>!!e&&e.offsetParent!==null;
  const tabs=[...document.querySelectorAll('[role="tab"]')]; console.log("CHECK tabs: "+tabs.length);
  tabs.forEach(t=>{ try{ t.click(); const p=document.getElementById(t.getAttribute("aria-controls")); const vis=p&&!p.hidden&&getComputedStyle(p).display!=="none"; const drawn=p?p.querySelectorAll("svg *, table, .card, .thread, .syscard").length:0; const keys=p?[...p.querySelectorAll(".key, .c4key")].filter(k=>shown(k)&&k.children.length).length:0; console.log("CHECK tab "+t.id+": "+(vis?"visible":"NOT VISIBLE")+" · "+drawn+" drawn nodes · "+(keys?"legend":"NO LEGEND (every tab needs a visible .key)")); }catch(err){ console.log("CHECK tab "+t.id+" threw: "+err.message); } });
  const g=document.querySelector(".guarantees"), b=g?[...g.querySelectorAll(".bubble")].filter(shown).map(x=>(x.querySelector("h3")||{}).firstChild):[];
  console.log("CHECK guarantees: "+(shown(g)&&b.length?b.length+" bubbles · "+b.map(n=>n?n.textContent.trim():"?").join(" · "):"MISSING (no visible .guarantees area with a .bubble)"));
  const c=document.querySelector(".context > h2"), ct=c?c.textContent.trim():"";
  console.log("CHECK context: "+(ct==="Context"?"headed Context":c?"WRONG HEADING '"+ct+"' (must read Context)":"MISSING (no .context section with an h2)"));
  const want=${JSON.stringify(tab)}; const t=want?document.getElementById(want):tabs[0]; if(t) t.click();
  if(want){ const bar=document.querySelector('[role="tablist"]'); if(bar) window.scrollTo(0, bar.getBoundingClientRect().top+window.scrollY-8); }
  console.log("CHECK done");
},400); });
</script>`;
const src = fs.readFileSync(page, "utf8");
const wrapped = src.includes("</body>") ? src.replace("</body>", probe + "\n</body>") : src + probe;
const base = path.basename(page, ".html"), wrapperPath = path.join(out, base + ".check.html"), shot = path.join(out, base + (tab ? "." + tab : "") + (theme ? "." + theme : "") + (width !== 1400 ? "." + width : "") + ".png");
fs.writeFileSync(wrapperPath, wrapped);

const url = "file:///" + path.resolve(wrapperPath).replace(/\\/g, "/");
const r = cp.spawnSync(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--enable-logging=stderr", "--v=0",
  "--virtual-time-budget=6000", `--window-size=${width},${height}`, `--screenshot=${shot}`, url], { encoding: "utf8", timeout: 120000 });
// Chrome prints console lines as `[...] "message", source: <url> (<line>)`; keep just the message.
const lines = (r.stderr || "").split(/\r?\n/).filter(l => /CONSOLE|Uncaught/.test(l)).map(l => l.replace(/^.*CONSOLE[^"]*"/, "").replace(/", source:[\s\S]*$/, "").trim());
const errors = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG HEADING/.test(l));
lines.forEach(l => console.log(l));
console.log(`screenshot: ${shot}`);
if (!lines.some(l => l.includes("CHECK done"))) { console.log("FAIL: the probe never completed (page did not load, or scripts aborted before the probe ran)"); process.exit(1); }
if (errors.length) { console.log(`FAIL: ${errors.length} problem(s)`); process.exit(1); }
console.log("PASS");
