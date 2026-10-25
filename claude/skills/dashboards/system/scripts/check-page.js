#!/usr/bin/env node
// The browser checker for every dashboard page: system, supersystem and repository pages, plan boards and the work board.
// Opens a page in headless Chrome (or Edge), clicks every tab, and reports whether each panel rendered, whether it shows a
// legend, and whether any script error fired; then checks the page-kind rules. Writes a screenshot beside the report.
//
//   node check-page.js <page.html> [--out <dir>] [--tab <tabId>] [--width 1400] [--height 1500] [--theme light|dark] [--frame <px>]
//
// Page kind: <meta name="dashboard" content="plan-board|work-board"> marks a plan board or the work board; anything else is a
// system page. Exit code 0 when, for every kind: every tab rendered with a visible legend (.key, or .c4key on the C4 tab), the
// Context section is headed exactly "Context", the footer is "Corresponds to <source>." and its authority sentence (GUIDANCE.md
// §3), no link is a dead href="#", the page has no horizontal scroll at the width
// checked, no work level is shown (levelrefs.js: "level 3", "L3", "level: 2" and the like, in any
// tab's text or the page's), no system colour falls in a status spectrum (palette.js: the --sys-N slots and a system page's
// --server / --client / --wire, read from the page's CSS and, in the browser, as the theme of the pass computes them), and no
// error fired. Then, by kind: a system page has a visible Guarantees area
// (.guarantees holding at least one .bubble) and, when the page sits under a docs/dashboards/ with a systems.json in a git
// work tree, no registry page or DSL file is git-ignored, and every entry of its BOARDS map (issue number → plan board) names a
// board file that is there; a plan board has a visible WIP strip (.wip) with its own legend, and its
// Impact tab shows no planning information (no dashed element, no planned / as-built pill, no changes-from-the-plan list). On every
// kind, dashed means only planned or pending (GUIDANCE.md §1): a dashed border or SVG stroke on any tab (every C4 view of a system
// page included) that marks nothing planned or pending fails (DASHED NOT PLANNED), and so does a workspace.dsl element style with
// "border dashed" on a tag other than Planned, read from the page without a browser. --theme sets
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
//
//   node check-page.js <page.html> --auto --no-browser
//
// --no-browser runs every check that needs no browser (the palette, the DSL's dashes, the board links, the git-ignore check, and the
// page's data: its state block, the embedded copies of state.json, workspace.dsl and systems.json, its part references; system/RULES.md
// §9) and names the browser pass it defers. The data-only path of a state page (apply-state.js, system/RULES.md §10) runs it.
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const args = process.argv.slice(2);
const USAGE_LINE = "usage: node check-page.js <page.html> [--auto [--no-browser]] [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark] [--frame <px>]";
require("./cliargs.js").strict(args, { usage: "usage: node check-page.js <page.html> [--auto [--no-browser [--features-as-notes]]] [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark] [--frame <px>]", valued: ["out", "tab", "width", "height", "theme", "frame"], flags: ["auto", "no-browser", "features-as-notes"], min: 1, max: 1 });
if (args.includes("--no-browser") && !args.includes("--auto")) { console.error(USAGE_LINE + "\n(--no-browser goes with --auto: the checks that need no browser, the browser pass deferred)"); process.exit(2); }
const opt = (name, def) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : def; };
const VALUED = ["--out", "--tab", "--width", "--height", "--theme", "--frame"];
const page = args.find((a, i) => !a.startsWith("--") && !(i > 0 && VALUED.includes(args[i - 1])));
if (!page) { console.error("usage: node check-page.js <page.html> [--auto [--no-browser]] [--out <dir>] [--tab <tabId>] [--width n] [--height n] [--theme light|dark] [--frame <px>]"); process.exit(2); }

/* The palette (GUIDANCE.md §1; palette.js), read from the page's CSS without a browser, so it holds on every page whatever its
   passes: a system colour in a status spectrum fails; a slot that is not the shared palette's value is a warning. */
const { paletteCheck, ALLOWED_HUES, STATUS_MIN_SAT } = require("./palette.js");
const palette = fs.existsSync(page) ? paletteCheck(fs.readFileSync(page, "utf8")) : { tokens: 0, problems: [], warnings: [] };
/* Dashed means only planned (GUIDANCE.md §1): in the embedded workspace.dsl's styles, only the Planned tag may draw a dashed border.
   Read from the page without a browser, so it holds on every pass, --auto included. */
const dslDashes = (() => { if (!fs.existsSync(page)) return []; const m = fs.readFileSync(page, "utf8").match(/<script type="text\/plain" id="dsl">([\s\S]*?)<\/script>/); if (!m) return [];
  return [...m[1].matchAll(/^\s*element\s+"([^"]+)"\s*\{([^}]*)\}/gm)].filter(x => x[1] !== "Planned" && /\bborder\s+dashed\b/.test(x[2])).map(x => "DASHED NOT PLANNED: workspace.dsl styles element \"" + x[1] + "\" with border dashed: only Planned is dashed; draw it solid or dotted"); })();
const paletteLines = () => [`CHECK palette: ${palette.tokens} system-colour tokens${palette.problems.length ? "" : ", none in a status spectrum"}`,
  ...palette.problems.map(p => "CHECK palette: PALETTE IN STATUS HUE " + p), ...palette.warnings.map(w => "CHECK palette: warning: " + w),
  ...dslDashes.map(p => "CHECK dsl: " + p)];

/* The checks that need no browser, on every pass (--auto and --no-browser included): the registry's git-ignore check, the board links,
   and the page's data (the state block, the embedded copies of state.json, workspace.dsl and systems.json, the part references). */
const src = fs.existsSync(page) ? fs.readFileSync(page, "utf8") : "";
const regCheck = registryIgnored(), boardCheck = boardLinks(), stateCheck = stateChecks(), featureCheck = featureChecks(), linkCheck = deadLinks();
const staticChecks = [regCheck, boardCheck, stateCheck, linkCheck, featureCheck].filter(Boolean);
const staticLines = () => staticChecks.flatMap(c => [...(c.note ? ["CHECK " + c.note] : []), ...(c.notes || []).map(n => "CHECK " + n), ...c.problems.map(p => "CHECK " + p)]);
const staticProblems = staticChecks.flatMap(c => c.problems);

if (args.includes("--auto")) {
  const { deviation } = require("./deviation.js");
  const d = deviation(page);
  paletteLines().forEach(l => console.log(l));
  staticLines().forEach(l => console.log(l));
  if (args.includes("--no-browser")) {
    /* the data-only path (apply-state.js): every check that needs no browser; the browser pass the page needs is named and left to
       the presenter's next look (the landing refresh) */
    const bad = palette.problems.length + dslDashes.length + staticProblems.length;
    console.log(`CHECK template: ${d.kind} page · ${d.verdict} · browser pass deferred (${d.passes === "none" ? "none needed" : d.passes === "light" ? "one light pass" : "the full pass"})`);
    d.notes.forEach(n => console.log("CHECK template: " + n));
    console.log(bad ? `FAIL: ${bad} problem(s) found without a browser` : "PASS (no browser)"); process.exit(bad ? 1 : 0);
  }
  console.log(`CHECK template: ${d.kind} page · ${d.verdict} · ${d.passes === "none" ? "no browser pass" : d.passes === "light" ? "one light pass (the facts it fills in)" : "full pass (light, dark, 520, frame 390, desktop 1920x1080)"}`);
  d.notes.forEach(n => console.log("CHECK template: " + n));
  if (d.passes === "none") { const bad = palette.problems.length || dslDashes.length || staticProblems.length; console.log(bad ? `FAIL: ${palette.problems.length ? "a system colour in a status spectrum" : dslDashes.length ? "a dashed DSL style that is not Planned" : staticProblems[0]}` : "PASS"); process.exit(bad ? 1 : 0); }
  const rest = args.filter(a => a !== "--auto" && a !== page);
  const modes = d.passes === "light" ? [[]] : [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"], ["--width", "1920", "--height", "1080"]];
  let failed = 0;
  modes.forEach(m => {
    const r = cp.spawnSync(process.execPath, [__filename, page, ...rest, ...m], { encoding: "utf8" });
    const lines = (r.stdout || "").trim().split(/\r?\n/), label = m.join(" ") || "light";
    const bad = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG HEADING|DEAD href|TOO MANY|HORIZONTAL SCROLL|LEVEL REFERENCE|RAW UTC STAMP|PALETTE IN STATUS HUE|IMPACT SHOWS PLANNING|DASHED NOT PLANNED|FOOTER NOT IN ITS FORM|GIT-IGNORED|DEAD BOARD LINK|DEAD LINK|BOARDS UNREADABLE|STATE |EMBED DIFFERS|PART UNKNOWN|FEATURE MISSING|STATUS DISAGREES WITH CODE|FAIL/.test(l));
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
  /* Dashed means only planned or pending (GUIDANCE.md §1), on every tab of every kind: a dashed border or outline, or a dashed SVG
     stroke (a dash of 3 px or more; shorter is dotted: standalone or conditional), on an element that is not, and is not inside, one
     marked planned or pending by the kind's own classes. Diagram furniture (lifelines, returns, boundary frames) is solid. */
  const PLANNED_SEL=kind==="plan-board"?".planned,.pending,.deferred,.todo,.dashed,.pln,.hollow,.dash,.next,.st-pending,.st-deferred,.pend":kind==="work-board"?".dashed,.pln,.nob":".planned,.dashed,.pln";
  const dashHits=new Map(), SIDES=["Top","Right","Bottom","Left"], SHAPES=new Set(["line","path","rect","polygon","polyline","circle","ellipse"]);
  const seen=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=="hidden";
  const clsOf=e=>String(e.getAttribute("class")||"").trim().split(/\\s+/).filter(Boolean).map(c=>"."+c).join("");
  const nameOf=e=>e.tagName.toLowerCase()+clsOf(e)+(e.parentElement&&clsOf(e.parentElement)?" in "+clsOf(e.parentElement):"");
  const dashScan=where=>{ document.querySelectorAll("body *").forEach(e=>{ if(e.closest("defs,marker,script,style")||!seen(e)) return; const s=getComputedStyle(e); let dashed=false;
    if(e instanceof SVGElement){ if(SHAPES.has(e.tagName.toLowerCase())&&s.stroke!=="none"&&s.strokeDasharray&&s.strokeDasharray!=="none") dashed=parseFloat(s.strokeDasharray)>=3; }
    else dashed=SIDES.some(d=>s["border"+d+"Style"]==="dashed"&&parseFloat(s["border"+d+"Width"])>0)||(s.outlineStyle==="dashed"&&parseFloat(s.outlineWidth)>0);
    if(dashed&&!e.closest(PLANNED_SEL)){ const k=nameOf(e); if(!dashHits.has(k)) dashHits.set(k,where); } }); };
  tabs.forEach(t=>{ try{ t.click(); dashScan("tab "+t.id); if(kind==="system"&&t.id==="t-c4"){ const rungs=[...document.querySelectorAll(".rung")]; rungs.forEach((r,i)=>{ r.click(); dashScan("tab t-c4, view "+(i+1)); }); if(rungs[0]) rungs[0].click(); } const p=document.getElementById(t.getAttribute("aria-controls")); if(p) lvScan(p.innerText,"tab "+t.id); const vis=p&&!p.hidden&&getComputedStyle(p).display!=="none"; const drawn=p?p.querySelectorAll("svg *, table, .card, .thread, .syscard, .cell, .bcard, .run").length:0; const keys=p?[...p.querySelectorAll(".key, .c4key")].filter(k=>shown(k)&&k.children.length).length:0; console.log("CHECK tab "+t.id+": "+(vis?"visible":"NOT VISIBLE")+" · "+drawn+" drawn nodes · "+(keys?"legend":"NO LEGEND (every tab needs a visible .key)")); }catch(err){ console.log("CHECK tab "+t.id+" threw: "+err.message); } });
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
  /* The footer (GUIDANCE.md §3): "Corresponds to <source>." and the authority sentence (a plan board's columns sentence after it),
     nothing more: no baseline, landed state or "maintained by" clause. A system, supersystem or repository page names code alone. */
  const ft=document.querySelector("footer"), ftx=ft?ft.textContent.replace(/\\s+/g," ").trim():"";
  const AUTH=kind==="system"?"Code is authoritative on any conflict.":"Code and the Markdown beside this page are authoritative on any conflict.";
  const COLS=kind==="plan-board"?" Columns 1 to 3 are written once; column 4 records every difference.":"";
  const ftOk=ftx.startsWith("Corresponds to ")&&ftx.length>("Corresponds to . "+AUTH+COLS).length&&ftx.endsWith(". "+AUTH+COLS)&&ftx.split(AUTH).length===2&&!/Maintained by|embedded verbatim|against the baseline|Built from|Drawn from|Nothing has landed/.test(ftx);
  console.log("CHECK footer: "+(ftOk?"trimmed: "+ftx:"FOOTER NOT IN ITS FORM ("+(ftx?JSON.stringify(ftx.slice(0,160)):"no footer")+"): it reads Corresponds to <source>. "+AUTH+COLS));
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
  dashScan("page"); console.log("CHECK dashes: "+(dashHits.size?"DASHED NOT PLANNED: "+[...dashHits].slice(0,6).map(([k,w])=>k+" ("+w+")").join("; ")+": dashed means only planned or pending; draw it solid, or mark it planned":"every dashed element is planned or pending"));
  const glow=document.querySelectorAll(".glow").length; console.log("CHECK glow: "+glow); /* reported, never limited: the glow names exactly what is being worked on (plan/RULES.md §3) */
  /* the layout detectors (features.js LAYOUT): the header's two halves from 940 px, the page using most of a wide window, the Context's
     and the Guarantees' legends shown wherever their sections draw an encoding */
  const vw=document.documentElement.clientWidth, hd=document.querySelector("header"), h1=hd&&hd.querySelector("h1"), ch=hd&&hd.querySelector(".chips"), pg=document.querySelector(".page");
  if(vw>=940&&h1&&ch&&ch.children.length){ const hb=hd.getBoundingClientRect(), mid=hb.left+hb.width/2, a=h1.getBoundingClientRect(), b=ch.getBoundingClientRect(); if(!(a.right<=mid+2&&b.left>=mid-2)) console.log("CHECK layout: FEATURE MISSING: the header's two halves (intro left, tags right, from 940 px) (template since dashboards-skill/21): the title ends at "+Math.round(a.right)+" px and the tags start at "+Math.round(b.left)+" px, the header's middle is "+Math.round(mid)+" px"); }
  if(vw>1500&&pg&&pg.getBoundingClientRect().width<vw*0.8) console.log("CHECK layout: FEATURE MISSING: the page using most of a window wider than 1500 px (template since dashboards-skill/10): the page is "+Math.round(pg.getBoundingClientRect().width)+" px of "+vw);
  const cx=document.querySelector("section.context"), gu=document.querySelector("section.guarantees");
  /* a state page is as-is (GUIDANCE.md §5, §7): nothing above its Context names an issue, the header, the tiles, every tab drawn and the
     Guarantees, code and source views aside */
  if(kind==="system"){ const hits=new Set(); [document.querySelector("header"),document.querySelector(".kpis"),...document.querySelectorAll('[role="tabpanel"]'),gu].filter(Boolean).forEach(root=>{ const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest("script,style,pre,code,#insp-body")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}); while(w.nextNode()){ const m=(w.currentNode.nodeValue||"").match(/(^|[^\\w&#])#\\d+\\b/g); if(m) m.forEach(x=>hits.add(x.slice(x.indexOf("#")))); } });
    if(hits.size) console.log("CHECK as-is: FEATURE MISSING: an as-is part that names no issue (template since dashboards-skill/26): "+[...hits].slice(0,6).join(", ")+" above the Context section; the issues belong in its roadmap and lists"); }
  if(cx&&cx.querySelector(".badge,.sw,.vp")&&!shown(document.getElementById("context-key"))) console.log("CHECK layout: FEATURE MISSING: the Context's legend shown wherever its cards draw an encoding (template since dashboards-skill/26): its cards draw badges or swatches and no #context-key is shown");
  if(kind==="system"&&gu&&gu.querySelector("[data-sys],.planned,.gap,.bars,.badge")&&!shown(document.getElementById("guarantees-key"))) console.log("CHECK layout: FEATURE MISSING: the Guarantees' legend shown wherever its bubbles draw an encoding (template since dashboards-skill/26): no #guarantees-key is shown");
  const want=${JSON.stringify(tab)}; const t=want?document.getElementById(want):tabs[0]; if(t) t.click();
  lvScan(document.body.innerText,"page"); console.log("CHECK work levels: "+(lvHits.size?"LEVEL REFERENCE shown ("+[...lvHits].slice(0,6).join("; ")+"): a dashboard never shows a work level":"none shown"));
  const sw=document.documentElement.scrollWidth, cw=document.documentElement.clientWidth;
  console.log("CHECK width: "+cw+"px"+(sw>cw+1?" · HORIZONTAL SCROLL ("+sw+"px of content)":" · no horizontal scroll"));
  if(want){ const bar=document.querySelector('[role="tablist"]'); if(bar) window.scrollTo(0, bar.getBoundingClientRect().top+window.scrollY-8); }
  console.log("CHECK done");
},400); });
</script>`;

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

// The page's data (system/RULES.md §2, §10): a system, supersystem or repository page renders its stamp from its state block, a verbatim
// copy of state.json beside it, and its planned parts from its DSL and registry. Fails a state block that is not JSON or not in its form
// (STATE UNREADABLE, STATE INVALID), one that differs from state.json beside the page (STATE EMBED DIFFERS), a state that names a system
// the registry does not list or disagrees with its registry entry on the stamp, the last amendment or the version (STATE UNKNOWN SYSTEM,
// STATE DISAGREES WITH REGISTRY), an embedded workspace.dsl or systems.json that differs from its file (DSL EMBED DIFFERS, REGISTRY EMBED
// DIFFERS), and a part reference (data-part, part:) that names no element of the DSL and no system of the registry (PART UNKNOWN). A
// page with no state block, on a template older than it, gets a note.
function stateChecks() {
  if (/<meta name="dashboard" content="(plan-board|work-board)">/.test(src) || !src) return null;
  const L = require("./statelib.js"), { kindOf, templateFor } = require("./deviation.js"), kind = kindOf(src);
  const notes = [], problems = [], dir = path.dirname(path.resolve(page)), reg = L.findRegistry(page);
  let R = null; if (reg) { try { R = JSON.parse(fs.readFileSync(reg, "utf8")); } catch (e) { /* the registry check reports it */ } }
  const st = L.blockText(src, "state");
  let tplHas = false; try { tplHas = L.blockText(fs.readFileSync(templateFor(page, kind), "utf8"), "state") != null; } catch (e) { /* no template */ }
  if (st == null) notes.push(`state: no state block${tplHas ? " (a page on a template older than the data-only path: apply-state.js leaves it to the presenter, who brings it onto the template)" : ""}`);
  else {
    let s = null; try { s = JSON.parse(st); } catch (e) { problems.push(`STATE UNREADABLE: the state block is not JSON (${e.message})`); }
    if (s) {
      L.stateProblems(s).forEach(p => problems.push(`STATE INVALID: ${p}`));
      const side = path.join(dir, "state.json");
      if (fs.existsSync(side)) { if (L.norm(fs.readFileSync(side, "utf8")).trim() !== st) problems.push("STATE EMBED DIFFERS: the state block is not state.json beside the page: node embed.js state.json index.html state"); else notes.push(`state: ${s.slug} at ${(s.asIs || {}).ref} @ ${(s.asIs || {}).sha}${(s.asIs || {}).landed === false ? " · not yet landed" : ""}, embedded from state.json`); }
      else notes.push("state: no state.json beside the page (the template's own sample)");
      const e = R && Array.isArray(R.systems) ? R.systems.find(x => x.slug === s.slug) : null;
      if (R && !e) problems.push(`STATE UNKNOWN SYSTEM: the state names ${JSON.stringify(s.slug)}, which docs/dashboards/systems.json does not list`);
      else if (e) { const d = L.stateVsRegistry(s, e, kind); d.forEach(([f, a, b]) => problems.push(`STATE DISAGREES WITH REGISTRY: ${f} is ${JSON.stringify(a)} on the page and ${JSON.stringify(b)} in systems.json`)); if (!d.length) notes.push(`state: ${s.slug} at ${(s.asIs || {}).ref} @ ${(s.asIs || {}).sha}${(s.asIs || {}).landed === false ? " (not yet landed)" : ""}, as systems.json has it`); }
    }
  }
  /* Built or planned is the code's (system/RULES.md §7, §10): every system the page draws whose code paths the registry records, its
     parts with code paths of their own (partPaths) and its supersystems (built once every core subsystem is) agree with the code at the
     page's stamped commit (STATUS DISAGREES WITH CODE); a supersystem's subsystem not classified core or optional is a warning. */
  if (R && reg && st != null) { let s0 = null; try { s0 = JSON.parse(st); } catch (e) { /* reported above */ }
    const sha = s0 && s0.asIs ? s0.asIs.sha : null, code = L.codeStatus(R, L.registryRoot(reg), sha), all = R.systems || [], me = s0 && all.find(x => x.slug === s0.slug);
    const drawn = kind === "system" ? (me ? [me] : []) : me && me.kind === "supersystem" ? all.filter(x => x.slug === me.slug || L.isAncestor(all, me.slug, x.slug)) : all;
    drawn.forEach(e => { const d = code.systems.get(e.slug);
      if (d && d.status !== e.status) problems.push(`STATUS DISAGREES WITH CODE: ${e.slug} is ${e.status} in systems.json, the code at ${sha} says ${d.status} (${d.status === "built" ? "present: " + d.present.join(", ") : "none of " + d.missing.join(", ") + " is there"}): run apply-state.js`);
      const sp = code.supers.get(e.slug);
      if (sp && sp.status && sp.status !== e.status) problems.push(`STATUS DISAGREES WITH CODE: the supersystem ${e.slug} is ${e.status} in systems.json; its core subsystems (${sp.core.join(", ")}) make it ${sp.status}: run apply-state.js`);
      if (sp && sp.unclassified.length) notes.push(`warning: SUBSYSTEM UNCLASSIFIED: ${e.slug}'s ${sp.unclassified.join(", ")} ${sp.unclassified.length === 1 ? "is" : "are"} not classified core or optional in systems.json ("core", from its architecture): its status is not derived until ${sp.unclassified.length === 1 ? "it is" : "they are"}`); });
    const pdsl = L.blockText(src, "dsl"), els = pdsl ? L.dslElements(pdsl) : [], dslRel = path.relative(path.dirname(reg), path.join(dir, "workspace.dsl")).split(path.sep).join("/");
    code.parts.filter(x => x.dsl === dslRel).forEach(x => { const el = els.find(y => y.id === x.id); if (el && el.tags.includes("Planned") !== x.planned) problems.push(`STATUS DISAGREES WITH CODE: ${x.id} is ${el.tags.includes("Planned") ? "Planned" : "built"} in workspace.dsl, the code at ${sha} says ${x.planned ? "planned" : "built"} (${x.paths.join(", ")}): run apply-state.js`); });
  }
  const dsl = L.blockText(src, "dsl"), dslFile = path.join(dir, "workspace.dsl");
  if (dsl != null && fs.existsSync(dslFile) && L.norm(fs.readFileSync(dslFile, "utf8")).trim() !== dsl) problems.push("DSL EMBED DIFFERS: the embedded workspace.dsl is not the file beside the page: node embed.js workspace.dsl index.html dsl");
  const sys = L.blockText(src, "systems");
  if (sys != null && reg && L.norm(fs.readFileSync(reg, "utf8")).trim() !== sys) problems.push("REGISTRY EMBED DIFFERS: the embedded systems.json is not docs/dashboards/systems.json: node embed.js <docs/dashboards/systems.json> index.html systems");
  const ids = new Set(dsl ? L.dslElements(dsl).map(x => x.id) : []);
  let slugs = new Set(); try { slugs = new Set((JSON.parse(sys || "{}").systems || []).map(x => x.slug)); } catch (e) { /* the embed check reports it */ }
  L.partRefs(src).forEach(r => {
    if (r.startsWith("sys:")) { if (kind !== "supersystem") problems.push(`PART UNKNOWN: ${r}: a system page reads no registry; tie the part to an element of its workspace.dsl`); else if (!slugs.has(r.slice(4))) problems.push(`PART UNKNOWN: ${r}: the embedded registry lists no such system`); }
    else if (!ids.has(r)) problems.push(`PART UNKNOWN: ${r}: the embedded workspace.dsl has no such element`);
  });
  return { notes, problems };
}

// The page's features (features.js; GUIDANCE.md §8, "Features"): every template feature its type takes, whatever its browser pass and
// through a declared divergence too: a missing one fails as FEATURE MISSING: <feature> (template since dashboards-skill/N).
function featureChecks() {
  if (!src) return null;
  const F = require("./features.js"), { kindOf } = require("./deviation.js"), kind = kindOf(src);
  if (/<meta name="dashboard" content="doc-copy">/.test(src)) return null;
  const miss = F.probe(src, kind);
  /* --features-as-notes (with --auto --no-browser, apply-state.js): a page that lags its template is the presenter's to splice at the landing
     refresh, not a reason to refuse a stamp: its missing features are notes, and do not fail the run */
  /* a landed or cancelled issue board is kept as it landed and never re-rendered (GUIDANCE.md §11, "Re-rendering"): its newer features are notes */
  let closed = false; if (kind === "plan-board") { try { const p = JSON.parse(require("./statelib.js").blockText(src, "plan") || "{}"); closed = ["built", "abandoned"].includes(p.status); } catch (e) { /* the data check reports it */ } }
  const asNotes = closed || (args.includes("--features-as-notes") && args.includes("--no-browser"));
  return { note: `features: ${F.applicable(kind).length - miss.length} of ${F.applicable(kind).length} a ${kind} page takes`, notes: asNotes ? miss.map(m => "note: " + F.line(m)) : [], problems: asNotes ? [] : miss.map(F.line) };
}
// The links a state page's hand-written HTML makes (GUIDANCE.md §5: a link never points at a file that is not there): every relative
// href outside its scripts, from the page's folder, when the page sits in a repository's docs/; and its WORK_BOARD's committed board.
function deadLinks() {
  if (!src || /<meta name="dashboard" content="(plan-board|work-board|doc-copy)">/.test(src)) return null;
  const { repoRootOf } = (() => { try { return { repoRootOf: p => { for (let d = path.dirname(path.resolve(p)); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, "docs", "dashboards")) || fs.existsSync(path.join(d, "docs", "plans"))) return d; if (path.dirname(d) === d) return null; } } }; } catch (e) { return { repoRootOf: () => null }; } })();
  const dir = path.dirname(path.resolve(page)), problems = [], notes = [];
  const wb = (src.match(/^const WORK_BOARD=(.*?);\s*(\/\/.*)?$/m) || [])[1];
  if (wb != null) { let W; try { W = JSON.parse(wb); } catch (e) { problems.push(`DEAD LINK: const WORK_BOARD=${wb.slice(0, 60)} is not plain JSON (${e.message})`); }
    if (W && W.committed != null && (typeof W.committed !== "string" || !fs.existsSync(path.resolve(dir, W.committed)))) problems.push(`DEAD LINK: WORK_BOARD.committed ${JSON.stringify(W.committed)} is not the work board's file relative to this page (null while there is none)`); }
  if (!repoRootOf(page)) { notes.push("links: the page is in no repository's docs/: its relative links are not checked"); return { notes, problems }; }
  const html = src.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, ""), seen = new Set();
  [...html.matchAll(/\bhref="([^"]+)"/g)].map(m => m[1]).filter(u => !/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(u)).forEach(u => { const f = decodeURIComponent(u.split("#")[0].split("?")[0]); if (!f || seen.has(f)) return; seen.add(f);
    if (!fs.existsSync(path.resolve(dir, f))) problems.push(`DEAD LINK: href="${u}" names no file from this page's folder`); });
  notes.push(`links: ${seen.size} relative link${seen.size === 1 ? "" : "s"} in the page's HTML, ${problems.filter(p => /href=/.test(p)).length} dead`);
  return { notes, problems };
}
const wrapped =src.includes("</body>") ? src.replace("</body>", probe + "\n</body>") : src + probe;
const base = path.basename(path.dirname(path.resolve(page))) + "." + path.basename(page, ".html");
const wrapperPath = path.join(out, base + ".check.html");
const shot = path.join(out, base + (tab ? "." + tab : "") + (theme ? "." + theme : "") + (frame ? ".frame" + frame : width !== 1400 ? "." + width : "") + ".png");
fs.writeFileSync(wrapperPath, wrapped);
// A plan board or the work board re-loads its live sidecar (plan.js, board.js) from beside the page while its run is live: the wrapper
// gets a copy beside it, so the pass sees the page as a reader would; a copy left by another page is removed.
["plan.js", "board.js"].forEach(f => { const side = path.join(path.dirname(path.resolve(page)), f); const copy = path.join(out, f); if (/<meta name="dashboard" content="(plan-board|work-board)">/.test(src) && fs.existsSync(side)) fs.copyFileSync(side, copy); else if (fs.existsSync(copy)) fs.unlinkSync(copy); });
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
const errors = lines.filter(l => /CHECK ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG HEADING|DEAD href|TOO MANY|HORIZONTAL SCROLL|LEVEL REFERENCE|RAW UTC STAMP|PALETTE IN STATUS HUE|IMPACT SHOWS PLANNING|DASHED NOT PLANNED|FOOTER NOT IN ITS FORM|FEATURE MISSING/.test(l));
lines.forEach(l => console.log(l));
paletteLines().forEach(l => { console.log(l); if (/PALETTE IN STATUS HUE|DASHED NOT PLANNED/.test(l)) errors.push(l); });
if (regCheck) { if (regCheck.note) console.log("CHECK " + regCheck.note); regCheck.problems.forEach(p => { console.log("CHECK " + p); errors.push(p); }); }
if (boardCheck) { if (boardCheck.note) console.log("CHECK " + boardCheck.note); boardCheck.problems.forEach(p => { console.log("CHECK " + p); errors.push(p); }); }
if (stateCheck) { stateCheck.notes.forEach(n => console.log("CHECK " + n)); stateCheck.problems.forEach(p => { console.log("CHECK " + p); errors.push(p); }); }
[linkCheck, featureCheck].filter(Boolean).forEach(c => { (c.notes || []).forEach(n => console.log("CHECK " + n)); c.problems.forEach(p => { console.log("CHECK " + p); errors.push(p); }); });
console.log(`screenshot: ${shot}`);
if (!lines.some(l => l.includes("CHECK done"))) { console.log("FAIL: the probe never completed (page did not load, or scripts aborted before the probe ran)"); process.exit(1); }
if (errors.length) { console.log(`FAIL: ${errors.length} problem(s)`); process.exit(1); }
console.log("PASS");
