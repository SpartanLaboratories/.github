#!/usr/bin/env node
// Opens a dashboard page in headless Chrome (or Edge), clicks every tab, and reports whether each
// panel rendered and whether any script error fired. Writes a screenshot beside the report.
//
//   node check-page.js <page.html> [--out <dir>] [--tab <tabId>] [--width 1400] [--height 1500]
//
// Exit code 0 when every tab rendered and no error fired; 1 otherwise. The page is loaded from a
// wrapper copy in the output directory, so the committed file is never modified.
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const args = process.argv.slice(2);
const page = args.find(a => !a.startsWith("--"));
if (!page) { console.error("usage: node check-page.js <page.html> [--out <dir>] [--tab <tabId>] [--width n] [--height n]"); process.exit(2); }
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const out = opt("out", path.join(os.tmpdir(), "dashboard-check")), tab = opt("tab", ""), width = +opt("width", 1400), height = +opt("height", 1500);
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
const probe = `<script>
window.addEventListener("error",e=>console.log("CHECK ERROR: "+e.message+" @"+(e.filename||"")+":"+e.lineno));
window.addEventListener("load",()=>{ setTimeout(()=>{
  const tabs=[...document.querySelectorAll('[role="tab"]')]; console.log("CHECK tabs: "+tabs.length);
  tabs.forEach(t=>{ try{ t.click(); const p=document.getElementById(t.getAttribute("aria-controls")); const vis=p&&!p.hidden&&getComputedStyle(p).display!=="none"; const drawn=p?p.querySelectorAll("svg *, table, .card, .thread, .syscard").length:0; console.log("CHECK tab "+t.id+": "+(vis?"visible":"NOT VISIBLE")+" · "+drawn+" drawn nodes"); }catch(err){ console.log("CHECK tab "+t.id+" threw: "+err.message); } });
  const want=${JSON.stringify(tab)}; const t=want?document.getElementById(want):tabs[0]; if(t) t.click();
  if(want){ const bar=document.querySelector('[role="tablist"]'); if(bar) window.scrollTo(0, bar.getBoundingClientRect().top+window.scrollY-8); }
  console.log("CHECK done");
},400); });
</script>`;
const src = fs.readFileSync(page, "utf8");
const wrapped = src.includes("</body>") ? src.replace("</body>", probe + "\n</body>") : src + probe;
const base = path.basename(page, ".html"), wrapperPath = path.join(out, base + ".check.html"), shot = path.join(out, base + (tab ? "." + tab : "") + ".png");
fs.writeFileSync(wrapperPath, wrapped);

const url = "file:///" + path.resolve(wrapperPath).replace(/\\/g, "/");
const r = cp.spawnSync(browser, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--enable-logging=stderr", "--v=0",
  "--virtual-time-budget=6000", `--window-size=${width},${height}`, `--screenshot=${shot}`, url], { encoding: "utf8", timeout: 120000 });
// Chrome prints console lines as `[...] "message", source: <url> (<line>)`; keep just the message.
const lines = (r.stderr || "").split(/\r?\n/).filter(l => /CONSOLE|Uncaught/.test(l)).map(l => l.replace(/^.*CONSOLE[^"]*"/, "").replace(/", source:[\s\S]*$/, "").trim());
const errors = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE/.test(l));
lines.forEach(l => console.log(l));
console.log(`screenshot: ${shot}`);
if (!lines.some(l => l.includes("CHECK done"))) { console.log("FAIL: the probe never completed (page did not load, or scripts aborted before the probe ran)"); process.exit(1); }
if (errors.length) { console.log(`FAIL: ${errors.length} problem(s)`); process.exit(1); }
console.log("PASS");
