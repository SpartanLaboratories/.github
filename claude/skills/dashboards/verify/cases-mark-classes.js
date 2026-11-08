// The cases of the marks' classes (the user's nomenclature decisions of 2026-11-07, dated 48; GUIDANCE.md §1, §12; nomenclature/ui.md,
// nomenclature/boards.md "Board UI"), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-mark-classes.js [--out <dir>]; with --fixture it first rewrites the browser fixture (5) from the templates.
// "Glow" is retired: the in-progress mark is a FullPulse, the column at work its column's FullPulse, the up-next mark a still outer Ring,
// the live indicator's dot a FillPulse. Class names only, drawn as before:
// 1. The issue board template and the repository work board template carry .fullpulse, .upnext-ring and .fillpulse (the issue board's also
//    .col-fullpulse and .colcell-fullpulse), in their CSS and in the class strings their renderers write, and none of the older classes.
// 2. The feature probe (mark-classes) passes both templates and fails a board drawn before (the older classes), naming them.
// 3. check-board.js's browser pass counts the FullPulse marks, a board drawn before included (.fullpulse, .glow).
// 4. The visible wording (admin-team/dashboards/visible-glow-wording): no "glow" a reader sees on any template or the worked example,
//    only the identifiers IDS lists; the Legend entries name the FullPulse and the Ring, the repository work board's Active now Tile says
//    "in a FullPulse below", the research StepBar's aria-label names a StepBar, the supersystem sample note the Context Panel.
// 5. The mark-class browser fixture, verify/fixtures/mark-classes/ (index.html: the issue and tracking boards' marks; work-board.html: the
//    repository work board's): static and offline, each template's own <style> copied verbatim so it draws what a board draws, every mark
//    class on an element beside the Legend entries as the template words them. A case fails it once it no longer matches the templates.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* the renames, newest first, so a board drawn before can be stood in for by renaming a template back */
const RENAMES = [["col-fullpulse", "glow-soft"], ["colcell-fullpulse", "colglow"], ["dot-fullpulse", "glowdot"], ["svg-fullpulse", "svgglow"], ["fullpulse", "glow"], ["upnext-ring", "upnext"], ["fillpulse", "pulse"]];
const back = h => RENAMES.reduce((s, [n, o]) => s.split(n).join(o), h);

/* what a reader never sees: comments (CSS, HTML, script) dropped, so "glow" left in one is no visible wording */
const visible = h => h.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
/* the internal identifiers kept (never shown on a board): the issue board's mark helpers and Legend constants */
const IDS = /\b(?:glowCls|cellGlow|colGlowCls|KEY_GLOW|KEY_COLGLOW)\b/g;

/* The mark-class browser fixture: one page per template, its <style> verbatim, then static markup carrying each mark class as the
   template's renderer writes it, and the Legend entries taken from the template's own strings. */
const FIX_DIR = "verify/fixtures/mark-classes";
function buildFixture(rdT) {
  const D = rdT("plan/template/dashboard.html"), W = rdT("plan/template/board.html");
  const style = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const NEXT_TAG = `<span class="tag-next">UP NEXT</span>`;
  const grab = (h, re, what) => { const m = h.match(re); if (!m) throw new Error("the template no longer holds " + what); return m[1].split("${TAG_NEXT}").join(NEXT_TAG); };
  const dKeys = [["KEY_GLOW", /const KEY_GLOW=`([^`]*)`;/], ["KEY_HELD", /const KEY_HELD=`([^`]*)`;/], ["KEY_COLGLOW", /const KEY_COLGLOW=`([^`]*)`;/],
    ["KEY_COLHELD", /const KEY_COLHELD=`([^`]*)`;/], ["KEY_NEXT", /const KEY_NEXT=r=>`(<span><i class="nx"><\/i>\$\{TAG_NEXT\}[^<`]*<\/span>)/]].map(([n, re]) => grab(D, re, n));
  const wKeys = [/(<span><i class="gl"><\/i>[^<`]*<\/span>)/, /(<span><i class="hold"><\/i>[^<`]*<\/span>)/, /(<span><i class="nx"><\/i>\$\{TAG_NEXT\}[^<`]*<\/span>)/].map((re, i) => grab(W, re, "the work board's Legend entry " + i));
  const kpiSub = grab(W, /\["Active now",ROWS\.filter\(r=>r\.active\)\.length,"([^"]*)"\]/, "the Active now Tile's line");
  const page = (title, css, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<!-- A static browser fixture of the dashboards skill (verify/cases-mark-classes.js, case group 5): every mark class, drawn by the template's
     own styles, copied verbatim below. Generated: node verify/cases-mark-classes.js --fixture. Never hand-edit it. -->
<style>${css}</style>
<style>
/* the fixture's own layout, nothing a board draws */
.fx{max-width:1180px;margin:0 auto;padding:12px 0}
.fx h2{font-size:15px;margin:26px 0 4px}
.fx h2 code,.fx .why code{font:600 12.5px var(--mono)}
.fx .why{font-size:12.5px;color:var(--ink-2);margin:0 0 8px;max-width:110ch}
.fx .row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
.fx .row>.cell,.fx .row>.rowlab,.fx .row>.bcards{width:240px;max-width:100%;box-sizing:border-box}
.fx .board>.band{position:relative;z-index:0}
.fx #fx-theme{font:600 12px var(--mono);padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);cursor:pointer}
.fx #fx-theme:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.fx .scroll{overflow-x:auto}
@media (max-width:900px){.fx .board>.band{display:none}}
</style>
</head>
<body>
<main class="fx">
${body}
</main>
<script>/* the fixture's light and dark switch: sets data-theme on the root, as the boards' theme Switch does, and remembers nothing */
document.getElementById("fx-theme").addEventListener("click",function(){var r=document.documentElement,d=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.dataset.theme=d?"light":"dark";});</script>
</body>
</html>
`;
  const head = (h1, other) => `<h1>${h1}</h1>
<p class="why">Each mark as a board draws it, with the template's own styles. Check it in light and dark (the button), at full width and at
phone width (390 px), and with reduced motion asked for (the browser's rendering settings), where every mark holds still.</p>
<p><button type="button" id="fx-theme">Switch light / dark</button> · ${other}</p>`;
  const cells = (cls, row) => ["gap", "considered", "verdict", "built"].map((c, i) => `<div class="cell ${c}${c === "considered" ? cls : ""}" style="grid-column:${i + 2};grid-row:${row}">${c === "considered" ? `a Cell of the column at work (<code>${cls.trim()}</code>)` : "a Cell"}</div>`).join("");
  const board = (band, cellCls) => `<div class="scroll"><div class="board">
<div class="colhead" style="grid-column:1;grid-row:1" aria-hidden="true"></div><div class="colhead phase" style="grid-column:2;grid-row:1"><div class="ph"><b>1</b>GAP</div></div><div class="colhead phase colon" style="grid-column:3;grid-row:1"><div class="ph"><b>2</b>CONSIDERED</div></div><div class="colhead phase" style="grid-column:4;grid-row:1"><div class="ph"><b>3</b>VERDICT</div></div><div class="colhead phase" style="grid-column:5;grid-row:1"><div class="ph"><b>4</b>AS BUILT</div></div>
<div class="band${band}" style="grid-column:3;grid-row:1/4" aria-hidden="true"></div>
${[2, 3].map(n => `<div class="rowlab" style="--c:var(--sys-${n - 1});grid-column:1;grid-row:${n}"><div class="nm">Row ${n - 1}</div></div>${cells(cellCls, n)}`).join("\n")}
</div></div>`;
  const bcards = cls => `<div class="bcards colbox${cls}"><div class="bcard st-pending" style="--c:var(--sys-1)"><b>an As built Card</b> (<code>${cls.trim()}</code> round the Cards)</div><div class="bcard st-pending" style="--c:var(--sys-2)"><b>another</b></div></div>`;
  const svgUnit = (x, cls, label, sys) => `<g class="unit ${cls}" transform="translate(${x},10)" style="--c:var(--sys-${sys})"><rect class="box" width="168" height="46" rx="5"/><rect class="bar" width="5" height="46" rx="2"/><text class="t" x="12" y="19">${label}</text><text class="s" x="12" y="37">${cls.split(" ").pop()}</text></g>`;
  const live = `<div class="row"><span class="livechip on fillpulse"><span class="ld" aria-hidden="true">●</span>LIVE · updated 3 s ago</span><span class="livechip on"><span class="ld" aria-hidden="true"></span>LIVE · no change for 4 min</span><span class="livechip off"><span class="ld" aria-hidden="true"></span>not live</span></div>`;
  const index = page("Mark classes: issue and tracking boards", style(D), `${head("Mark classes: issue and tracking boards", '<a href="work-board.html">the repository work board\'s marks</a>')}
<h2><code>.fullpulse</code>: a Cell being worked on</h2>
<p class="why">A FullPulse: a solid accent Ring inside the edge, a faint accent wash, the interior breathing (about 2 s). While the run waits on the user it stops to the Ring alone (<code>.held</code>).</p>
<div class="row"><div class="cell gap">a Cell, no mark</div><div class="cell gap fullpulse"><code>.fullpulse</code></div><div class="cell gap held"><code>.held</code>: the Ring alone</div></div>
<h2><code>.fullpulse</code>: the step panel's current step and a unit Row's label</h2>
<ol class="steps" aria-label="The research StepBar"><li class="done"><span class="dot" aria-hidden="true"></span>planning</li><li class="cur fullpulse" aria-current="step"><span class="dot" aria-hidden="true"></span>research</li><li class="todo"><span class="dot" aria-hidden="true"></span>verification</li></ol>
<ol class="steps" aria-label="The research StepBar, held"><li class="done"><span class="dot" aria-hidden="true"></span>planning</li><li class="cur held" aria-current="step"><span class="dot" aria-hidden="true"></span>research (held)</li><li class="todo"><span class="dot" aria-hidden="true"></span>verification</li></ol>
<div class="row"><div class="rowlab fullpulse" style="--c:var(--sys-1)"><div class="nm">a unit Row's label: <code>.fullpulse</code></div></div><div class="rowlab held" style="--c:var(--sys-2)"><div class="nm">held: <code>.held</code></div></div></div>
<h2><code>.col-fullpulse</code> and <code>.colcell-fullpulse</code>: a whole column at work</h2>
<p class="why">Wider than 900 px: one FullPulse on the Considered column itself, its band (<code>.col-fullpulse</code>) under a head washed in the accent, and its Cells unmarked. At 900 px or narrower no columns are drawn, so each of the column's Cells carries it instead (<code>.colcell-fullpulse</code>). The second board waits on the user: the band holds still (<code>.held</code>), each Cell at phone width the Ring alone (<code>.colheld</code>).</p>
${board(" col-fullpulse", " colcell-fullpulse")}
${board(" held", " colcell-fullpulse colheld")}
<h2><code>.col-fullpulse</code>: round the As built Tab's Cards</h2>
<div class="row">${bcards(" col-fullpulse")}${bcards(" held")}</div>
<h2><code>.upnext-ring</code>: the unit up next</h2>
<p class="why">A still outer Ring with the static UP NEXT Tag: never animated, never read as in progress.</p>
<div class="row"><div class="cell built upnext-ring">an As built Cell: <code>.upnext-ring</code> ${NEXT_TAG}</div></div>
<ol class="chain"><li class="done" style="--c:var(--sys-1)"><span class="u">1 · core</span></li><li class="fullpulse" style="--c:var(--sys-2)"><span class="u">2 · transport</span></li><li class="held" style="--c:var(--sys-3)"><span class="u">3 · held</span></li><li class="upnext-ring pending" style="--c:var(--sys-4)"><span class="u">4 · client</span></li></ol>
<div class="scroll"><svg class="chainsvg" width="770" height="66" viewBox="0 0 770 66" role="img" aria-label="Units: in progress, held, up next, no mark">${svgUnit(10, "accent fullpulse", "2 · transport", 2)}${svgUnit(200, "accent held", "3 · held", 3)}${svgUnit(390, "ink pending upnext-ring", "4 · client", 4)}${svgUnit(580, "ink pending", "5 · no mark", 5)}</svg></div>
<h2><code>.fillpulse</code>: the live indicator's dot</h2>
<p class="why">Ink, never the accent: a FillPulse while the view is live and changing; still once it goes quiet, while the run waits on the user, or when it is not live.</p>
${live}
<h2>The Legend entries, as the template words them</h2>
<div class="legend">${dKeys.join("")}</div>`);
  const work = page("Mark classes: the repository work board", style(W), `${head("Mark classes: the repository work board", '<a href="index.html">the issue and tracking boards\' marks</a>')}
<h2><code>.fullpulse</code>: a run being worked on</h2>
<p class="why">The run's state Pill carries the FullPulse; while the run waits on the user, the Ring alone (<code>.held</code>). The Active now Tile reads "${kpiSub}".</p>
<div class="row"><span class="verdict-pill neutral"><i aria-hidden="true">●</i>building, no mark</span><span class="verdict-pill neutral fullpulse"><i aria-hidden="true">●</i>building</span><span class="verdict-pill warning held"><i aria-hidden="true">⏸</i>waiting on you</span></div>
<h2><code>.upnext-ring</code>: the unit up next</h2>
<div class="row"><span class="verdict-pill neutral dashed upnext-ring"><i aria-hidden="true">→</i>next · not started</span>${NEXT_TAG}</div>
<h2><code>.fillpulse</code>: the live indicator's dot</h2>
${live}
<h2>The Legend entries, as the template words them</h2>
<div class="legend">${wKeys.join("")}</div>`);
  return { "index.html": index, "work-board.html": work };
}

module.exports = function casesMarkClasses(X) {
  const { sk, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const F = require(sk("system/scripts/features.js"));
  const T = { "plan-board": rd(tp("plan/template/dashboard.html")), "work-board": rd(tp("plan/template/board.html")) };
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const OLD = /\.(?:glow|glow-soft|colglow|upnext|pulse)(?![-\w])|" (?:glow|glow-soft|colglow|upnext|pulse)"/g;
  const groups = [];

  { const c = [];
    for (const [k, h] of Object.entries(T)) {
      const s = css(h), old = h.match(OLD) || [];
      c.push([`${k}: .fullpulse, .upnext-ring and .fillpulse in its CSS and its renderer's class strings`, /\.fullpulse\{animation:fullpulse /.test(s) && /(?:^|\n)\.upnext-ring\{/.test(s) && /\.livechip\.on\.fillpulse \.ld\{/.test(s) && /" fullpulse"/.test(h) && /" upnext-ring"/.test(h) && /" fillpulse"/.test(h), "the classes"]);
      if (k === "plan-board") c.push([`${k}: the column's FullPulse (.col-fullpulse) and each of its cells at phone width (.colcell-fullpulse)`, /(?:^|\n)\.col-fullpulse\{animation:col-fullpulse /.test(s) && /\.board \.cell\.colcell-fullpulse\{animation:col-fullpulse /.test(s) && /" col-fullpulse"/.test(h) && /" colcell-fullpulse"/.test(h), "the column's classes"]);
      c.push([`${k}: none of the older classes (.glow, .glow-soft, .colglow, .upnext, .pulse)`, !old.length, old.slice(0, 4).join(", ") || "none"]);
    }
    groups.push(["the marks' classes on the issue board and repository work board templates (dated 48)", c]); }

  { const c = [];
    for (const [k, h] of Object.entries(T)) {
      const now = F.probe(h, k).filter(m => m.id === "mark-classes"), before = F.probe(back(h), k).filter(m => m.id === "mark-classes");
      c.push([`${k}: the probe passes the template`, !now.length, now.map(m => m.why).join("; ") || "passes"]);
      c.push([`${k}: the probe fails a board drawn before, naming its older classes`, before.length === 1 && /\.glow\b/.test(before[0].why) && /\.upnext\b/.test(before[0].why) && /\.pulse\b/.test(before[0].why) && before[0].since === "dashboards-skill/48", before.map(m => F.line(m)).join("; ").slice(0, 220)]);
    }
    const f = F.FEATURES.find(x => x.id === "mark-classes");
    c.push(["the probe is a work board's only: the state boards named with their reason", !!f && !f.types.includes("system") && !f.types.includes("supersystem") && !!(f.notFor && f.notFor.system && f.notFor.supersystem), f ? f.types.join(", ") : "no probe"]);
    groups.push(["the feature probe (mark-classes) on the templates and on a board drawn before", c]); }

  { const c = [], cb = rd(sk("system/scripts/check-board.js"));
    c.push(["check-board.js counts the FullPulse marks, a board drawn before included, and limits none", /document\.querySelectorAll\("\.fullpulse,\.glow"\)\.length; console\.log\("CHECK fullpulse: "/.test(cb) && !/querySelectorAll\("\.glow"\)/.test(cb), "CHECK fullpulse"]);
    groups.push(["check-board.js's count of the in-progress marks", c]); }
  { const c = [], skT = f => rd(sk(f));
    const files = { "plan/template/dashboard.html": T["plan-board"], "plan/template/board.html": T["work-board"], "system/template/system.html": rd(tp("system/template/system.html")),
      "system/template/supersystem.html": rd(tp("system/template/supersystem.html")), "plan/examples/38-handshake-empty-name/dashboard.html": skT("plan/examples/38-handshake-empty-name/dashboard.html") };
    for (const [f, h] of Object.entries(files)) { const left = (visible(h).replace(IDS, "").match(/[^\n]{0,40}glow[^\n]{0,40}/gi) || []);
      c.push([`${f}: no "glow" a reader sees (only the identifiers glowCls, cellGlow, colGlowCls, KEY_GLOW, KEY_COLGLOW)`, !left.length, left.slice(0, 3).join(" | ") || "none"]); }
    for (const [k, h] of [["plan/template/dashboard.html", T["plan-board"]], ["the worked example", files["plan/examples/38-handshake-empty-name/dashboard.html"]]]) {
      c.push([`${k}: its Legend names the FullPulse, the still outer Ring, the column's FullPulse and the Ring alone`, /<i class="gl"><\/i>FullPulse, breathing: being worked on now/.test(h) && (h.match(/\$\{TAG_NEXT\} still outer Ring: the next unit, not started/g) || []).length === 2 && /<i class="gl colk"><\/i>FullPulse around a whole column/.test(h) && /<i class="hold"><\/i>Ring alone: being worked on/.test(h) && /<i class="hold colk"><\/i>Ring around a whole column/.test(h) && /merged; nothing in a FullPulse<\/span>/.test(h), "the Legend entries"]);
      c.push([`${k}: the research StepBar's aria-label names a StepBar`, /aria-label="The research StepBar"/.test(h) && !/research timeline"/.test(h), "aria-label"]); }
    c.push(["plan/template/board.html: the Active now Tile says \"in a FullPulse below\", its Legend the FullPulse, the Ring alone and the still outer Ring", /\["Active now",ROWS\.filter\(r=>r\.active\)\.length,"in a FullPulse below"\]/.test(T["work-board"]) && /<i class="gl"><\/i>FullPulse, breathing: being worked on now/.test(T["work-board"]) && /<i class="hold"><\/i>Ring alone, still: being worked on/.test(T["work-board"]) && /\$\{TAG_NEXT\} still outer Ring: the next unit, not started/.test(T["work-board"]), "the Tile and the Legend"]);
    c.push(["system/template/supersystem.html: the sample thread note names the Context Panel", /note:"Planned: its plan is in the Context Panel\."/.test(files["system/template/supersystem.html"]) && !/Context section\."/.test(files["system/template/supersystem.html"]), "the note"]);
    groups.push(["the visible wording of the marks on every template and the worked example (no \"glow\" a reader sees)", c]); }

  { const c = [];
    let want = null; try { want = buildFixture(f => rd(sk(f))); } catch (e) { c.push(["the fixture builds from the templates", false, e.message]); }
    if (want) {
      for (const [f, h] of Object.entries(want)) {
        const at = sk(path.join(FIX_DIR, f)), got = fs.existsSync(at) ? rd(at) : null;
        c.push([`${FIX_DIR}/${f}: present and current with the templates (else: node verify/cases-mark-classes.js --fixture)`, got === h, got == null ? "missing" : got === h ? "current" : "stale"]);
      }
      const body = h => h.slice(h.indexOf("<body>")), has = (h, cls) => new RegExp(`class="(?:[^"]* )?${cls}(?: [^"]*)?"`).test(body(h));
      const all = ["fullpulse", "col-fullpulse", "colcell-fullpulse", "upnext-ring", "fillpulse", "held"], wb = ["fullpulse", "upnext-ring", "fillpulse", "held"];
      c.push(["index.html: every mark class on an element (.fullpulse, .col-fullpulse, .colcell-fullpulse, .upnext-ring, .fillpulse, and .held)", all.every(x => has(want["index.html"], x)), all.filter(x => !has(want["index.html"], x)).join(", ") || "all"]);
      c.push(["work-board.html: the repository work board's mark classes on an element (.fullpulse, .upnext-ring, .fillpulse, .held)", wb.every(x => has(want["work-board.html"], x)), wb.filter(x => !has(want["work-board.html"], x)).join(", ") || "all"]);
      c.push(["both pages offline (no external resource), with no older class and no \"glow\" a reader sees", Object.values(want).every(h => !/(?:src|href)="(?:https?:)?\/\//.test(h) && !(body(h).match(OLD) || []).length && !/glow/i.test(visible(body(h)))), "offline"]);
    }
    groups.push(["the mark-class browser fixture (verify/fixtures/mark-classes/)", c]); }
  return groups;
};
module.exports.buildFixture = buildFixture;
module.exports.FIX_DIR = FIX_DIR;

if (require.main === module) {
  const sk = p => path.join(__dirname, "..", p);
  if (process.argv.includes("--fixture")) {
    const fx = buildFixture(f => fs.readFileSync(sk(f), "utf8").replace(/\r\n/g, "\n")); fs.mkdirSync(sk(FIX_DIR), { recursive: true });
    for (const [f, h] of Object.entries(fx)) { fs.writeFileSync(sk(path.join(FIX_DIR, f)), h); console.log("wrote " + path.join(FIX_DIR, f)); }
  }
  const groups = module.exports({ sk, out: path.join(os.tmpdir(), "dashboards-verify"), targets: [] });
  let bad = 0;
  groups.forEach(([what, cases]) => { const f = cases.filter(x => !x[1]); bad += f.length; console.log(`${f.length ? "FAILED " : "checked"}  ${what}: ${cases.length - f.length}/${cases.length} cases`); f.forEach(x => console.log(`  FAIL ${x[0]} — ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
