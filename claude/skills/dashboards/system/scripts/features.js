// The per-board feature probes (GUIDANCE.md §8, "Features"): one detector per template feature, tagged with the skill step that added it
// and the board types it applies to, the types it does not fit listed with the reason. Not a command: check-board.js (--auto, --auto
// --no-browser and its plain passes) and plan/scripts/check.js --auto run the static detectors on every board, whatever its browser pass,
// and fail a missing feature as "FEATURE MISSING: <feature> (template since dashboards-skill/N)" — through a declared divergence too: a
// divergence adds or argues a removal, it never excuses a board that lags its template. The layout detectors (LAYOUT) run in the browser
// pass (check-board.js's probe). verify/verify-templates.js holds every template to every detector that applies to it.
//
// Board types: "system" (a system board), "supersystem" (a supersystem or the repository state board), "plan-board" (an issue board or a tracking
// board), "work-board" (the committed repository work board or the live one). Features older than the cross-type review of dashboards-skill/10 are
// dated dashboards-skill/10, the run that carried them onto every type.
"use strict";

const ALL = ["system", "supersystem", "plan-board", "work-board"], STATE = ["system", "supersystem"], BOARDS = ["plan-board", "work-board"];
const head = h => (/<head>([\s\S]*?)<\/head>/.exec(h) || [, ""])[1];
const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
const scripts = h => [...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter(m => !/type="(application\/json|text\/plain)"/.test(m[0].slice(0, 60))).map(m => m[1]).join("\n");
const body = h => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<!--[\s\S]*?-->/g, "");
const text = s => s.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, "x").replace(/\s+/g, " ").trim();
const need = (ok, why) => ok ? true : why;

const FEATURES = [
  { id: "theme-prepaint", name: "the theme switch's choice applied before the first paint (a script in the head)", since: 17, types: ALL,
    test: h => need(/localStorage\.getItem\("dashboards-theme"\)/.test(head(h)), "no script in <head> reads localStorage \"dashboards-theme\"") },
  { id: "theme-switch", name: "the theme switch (light or night, the choice remembered)", since: 17, types: ALL,
    test: h => need(/"dashboards-theme"/.test(scripts(h)) && /localStorage\.setItem\(/.test(scripts(h)), "no script writes localStorage \"dashboards-theme\"") },
  { id: "dark-palette", name: "the dark palette, selected by the system setting and by the switch", since: 17, types: ALL,
    test: h => need(/prefers-color-scheme:\s*dark/.test(css(h)) && /:root\[data-theme="dark"\]/.test(css(h)), "the CSS lacks the prefers-color-scheme dark palette or :root[data-theme=\"dark\"]") },
  { id: "labelled-tags", name: "the header's tags, each its label then its value", since: 21, types: ALL,
    test: (h, k) => {
      if (BOARDS.includes(k)) return need(/<span class="ck">/.test(scripts(h)), "the renderer writes no labelled tag (<span class=\"ck\">)");
      const hd = (/<header>([\s\S]*?)<\/header>/.exec(body(h)) || [, ""])[1], chips = [...hd.matchAll(/<span class="chip[^"]*"(?![^>]*\bid="chip-)[^>]*>([\s\S]*?)<\/span>\s*(?=<span class="chip|<\/div>)/g)];
      const bare = chips.filter(m => text(m[1]) && !/class="ck"/.test(m[1]));
      return need(!bare.length, `${bare.length} header chip${bare.length === 1 ? "" : "s"} without a label: ${bare.slice(0, 3).map(m => JSON.stringify(text(m[1]).slice(0, 40))).join(", ")}`); } },
  { id: "wide-1500", name: "the wide desktop layout (over 1500 px the board uses most of the window)", since: 10, types: ALL,
    test: h => need(/@media\s*\(min-width:\s*1500px\)\s*\{[^}]*\.page\{max-width:min\(2400px,100%\)\}/.test(css(h)), "no @media (min-width:1500px) widening .page to min(2400px,100%)") },
  { id: "boards-map", name: "the BOARDS map (an issue's number links its issue board)", since: 10, types: STATE,
    notFor: { "plan-board": "its board links come from its data (embed.js)", "work-board": "its board links come from its data (board.js)" },
    test: h => need(/^const BOARDS=/m.test(h), "no const BOARDS= line") },
  { id: "live-indicator", name: "the live indicator: on an issue board and the repository work board, never on a state board", since: 17, types: ALL,
    test: (h, k) => BOARDS.includes(k) ? need(/id="live"/.test(h), "no live indicator (id=\"live\")") : need(!/class="livechip/.test(body(h)), "a state board shows the code at a named commit: it has no live indicator") },
  { id: "one-line-ledes", name: "ledes of at most one short line (130 characters)", since: 10, types: ALL,
    test: h => { const long = [...body(h).matchAll(/<p class="lede"[^>]*>([\s\S]*?)<\/p>/g)].map(m => text(m[1])).filter(t => t.length > 130);
      return need(!long.length, `${long.length} lede${long.length === 1 ? "" : "s"} over 130 characters: ${long.slice(0, 2).map(t => JSON.stringify(t.slice(0, 60) + "…")).join(", ")}`); } },
  { id: "reduced-motion", name: "reduced motion honoured wherever anything animates", since: 17, types: ALL,
    test: h => { const c = css(h); return need(!/@keyframes|animation:/.test(c) || /prefers-reduced-motion:\s*reduce/.test(c), "the board animates and has no prefers-reduced-motion rule"); } },
  { id: "keyboard-buttons", name: "every role=button reachable by keyboard (a tabindex beside it)", since: 10, types: ALL,
    test: h => { const bad = h.replace(/<style>[\s\S]*?<\/style>/g, "").split(/\r?\n/).filter(l => /role(="|:"|=\\")button/.test(l) && !/tabindex|tabIndex/.test(l));
      return need(!bad.length, `${bad.length} line${bad.length === 1 ? "" : "s"} with role=button and no tabindex: ${bad.slice(0, 2).map(l => JSON.stringify(l.trim().slice(0, 70))).join(", ")}`); } },
  { id: "tab-keys", name: "the tablist's keys: arrows, Home and End, a roving tabindex", since: 26, types: ALL,
    test: h => { const s = scripts(h); return need(/Home:0/.test(s) && /End:n-1/.test(s) && /\.tabIndex=on\?0:-1/.test(s), "the tablist handles no Home/End, or keeps no roving tabindex (tabKeys())"); } },
  { id: "state-block", name: "the state block (the stamp drawn from state.json)", since: 25, types: STATE,
    notFor: { "plan-board": "its stamps are its data's (plan.json)", "work-board": "its stamps are its data's (board.json)" },
    /* the block, and the header's as-is chip drawn from it (a hand-written stamp is never restamped) */
    test: h => { const hd = (/<header>([\s\S]*?)<\/header>/.exec(body(h)) || [, ""])[1], st = /<script type="application\/json" id="state">/.test(h);
      return need(st && /id="chip-asis"/.test(hd), st ? "the header's as-is chip is hand-written, not drawn from state.json (no id=\"chip-asis\")" : "no <script type=\"application/json\" id=\"state\"> block"); } },
  { id: "as-is-header", name: "an as-is part that names no issue: the last amendment said in the Context section", since: 26, types: STATE,
    notFor: { "plan-board": "a board is the record of one issue", "work-board": "it lists the issues" },
    /* the header names no issue: no "last amended by" chip, the template's old placeholder or one written by hand, and no issue link
       (a GitHub issue, a data-board or a data-issue mark) */
    test: h => { const hd = (/<header>([\s\S]*?)<\/header>/.exec(body(h)) || [, ""])[1];
      const amended = /id="chip-amended"/.test(hd) || /<span class="ck">\s*last amended/i.test(hd), issue = /\/issues\/\d+|data-board=|data-issue=/.test(hd);
      return need(!amended && !issue && /ctx-amended/.test(scripts(h)), amended ? "the header still carries a \"last amended by\" chip" : issue ? "the header names an issue (an issue link, data-board or data-issue)" : "the renderer does not say the last amendment in the Context section"); } },
  { id: "guarantees-legend", name: "the Guarantees' legend (what its guarantee cards draw: swatches, planned rows, gaps)", since: 26, types: STATE,
    notFor: { "plan-board": "no Guarantees section", "work-board": "no Guarantees section" },
    test: h => need(/guarantees-key/.test(scripts(h)), "the renderer draws no Guarantees legend (sectionKeys())") },
  { id: "context-legend", name: "the Context's legend (what its cards draw)", since: 26, types: ALL,
    test: h => need(/context-key/.test(h), "the board draws no Context legend") },
  { id: "workboard-link", name: "the repository work board linked live first (the live view on this machine, else the committed board)", since: 26, types: ALL,
    test: (h, k) => k === "work-board" ? need(/\.live\/index\.js/.test(scripts(h)), "the committed board does not name the live view") : BOARDS.includes(k) ? need(/docs\/plans\/\.live\/index\.js/.test(scripts(h)), "the board does not probe the live repository work board (docs/plans/.live/index.js)") : need(/^const WORK_BOARD=/m.test(h) && /data-workboard/.test(scripts(h)), "no WORK_BOARD line, or no data-workboard link") },
  { id: "existing-links", name: "links to the shared boards only where their files exist (from the data)", since: 26, types: BOARDS,
    notFor: { system: "its hand-written links are held to the files by check-board.js (DEAD LINK)", supersystem: "its hand-written links are held to the files by check-board.js (DEAD LINK)" },
    test: (h, k) => need(k === "plan-board" ? /PLAN\.links/.test(scripts(h)) : /B\.links/.test(scripts(h)), "the renderer links the shared boards without the data's links") },
  { id: "md-copies", name: "Markdown opened as its rendered copy when one is on disk", since: 26, types: BOARDS,
    notFor: { system: "it links committed documents on GitHub, not the plan folders' Markdown", supersystem: "it links committed documents on GitHub, not the plan folders' Markdown" },
    test: h => need(/\.live\/docs\/index\.js/.test(scripts(h)), "the board does not look for the rendered copies (docs/plans/.live/docs/index.js)") },
  { id: "progress-notes", name: "the agents' progress notes in the step panel", since: 26, types: ["plan-board"],
    notFor: { system: "no step panel: a state board shows no run", supersystem: "no step panel: a state board shows no run", "work-board": "one row per run: each run's detail is on its own board" },
    test: h => need(/docs\/plans\/\.live\/progress\//.test(scripts(h)), "the step panel does not load the progress notes") },
  { id: "progress-index", name: "every progress note drawn, whatever its name: the names read from the issue's progress index", since: 35, types: ["plan-board"],
    notFor: { system: "no step panel: a state board shows no run", supersystem: "no step panel: a state board shows no run", "work-board": "one row per run: each run's detail is on its own board" },
    test: h => need(/progress\/\$\{issue\}\/index\.js/.test(scripts(h)) && /progNames\(R,await loadNoteNames\(n\)\)/.test(scripts(h)), "the step panel probes fixed names only, so a note with a slug of its own is never drawn") },
  { id: "tracking-steps", name: "a tracking board's own steps: its plan's land, then its units filed (sub-issues)", since: 26, types: ["plan-board"],
    notFor: { system: "no run steps", supersystem: "no run steps", "work-board": "it shows each run's step as text" },
    test: h => need(/"sub-issues":\(R,o\)/.test(scripts(h)), "the step panel has no sub-issues step") },
  { id: "quality-review", name: "a qa pass named by its number reads \"Quality Review N\", from the template's PASS_NAME (plan/scripts/passnames.js), never \"qa pass N\"", since: 40, types: ["plan-board"],
    notFor: { system: "no qa passes: a state board shows the code at a commit, not a run", supersystem: "no qa passes: a state board shows the code at a commit, not a run",
      "work-board": "held to the board-wording feature instead: its Quality Reviews column names each pass by its number from its names block, and its rows' text comes from board.json, which board.js words so" },
    test: h => { const s = scripts(h); return need(/const PASS_NAME="Quality Review"/.test(s) && !/qa pass \$\{/i.test(s) && !/[`>]Pass \$\{/.test(s), "the template names a qa pass \"qa pass N\" (or \"Pass N\") rather than from PASS_NAME, \"Quality Review N\""); } },
  /* admin-team/dashboards-skill/board-wording (the user's decisions of 2026-11-06), dated 41: the names a board shows, from the template's
     names block (plan/scripts/passnames.js, the same names), and the classes renamed to carry their element's type. A board drawn before them
     keeps its older names and classes until its next rebuild (the splice, its next event, board.js --refresh-template); a landed issue board
     is kept as it landed (GUIDANCE.md §11). */
  { id: "board-wording", name: "every name from the template's names block: the qa step \"Quality Review\", a pass \"Quality Review N\" (never an ordinal), one not numbered \"review\", the remediation step \"Correction\" or \"Resolution\" by its route (no \"loop\"), each step by its name", since: 41, types: ["plan-board", "work-board"],
    notFor: { system: "no run: a state board shows the code at a commit, not a run's steps or reviews", supersystem: "no run: a state board shows the code at a commit, not a run's steps or reviews" },
    test: (h, k) => { const s = scripts(h), base = /\/\* names:begin\b/.test(s) && /const STEP_NAME=\{/.test(s) && /const stepLabel=/.test(s) && /in place · no additional \$\{REVIEW\}/.test(s) && !/\bordinal\(/.test(s);
      return need(k === "plan-board" ? base && /const remediationName=/.test(s) && /const REMEDIATION_NOTE="Correction or Resolution after a Quality Review; each step is recorded as it runs"/.test(s) && !/remediation · loop|Loop \$\{i\+1\}|\bqa · \$\{/.test(s) && /function raisedWords\(/.test(s) : base,
        "the board composes its older names (an ordinal pass, \"qa\" or \"remediation · loop\" for a step, \"no 2nd pass\") rather than from the names block (names:begin, STEP_NAME, stepLabel())"); } },
  { id: "board-ui-classes", name: "the classes that carry their element's type: .kpi-tile, .verdict-pill, .legend, .c4-legend (never .kpi, .vp, .key, .c4key)", since: 41, types: ALL,
    test: h => { const c = css(h); const old = (c.match(/\.(?:kpi|vp|key|c4key)(?![-\w])/g) || []); return need(!old.length && /\.legend\{/.test(c), `the board's CSS still uses the older classes (${[...new Set(old)].join(", ") || "no .legend"}): splice it onto the template, or re-render it`); } },
  { id: "waiting-on-you", name: "a board's text says \"waiting on you\", never naming the user in the third person", since: 37, types: ["plan-board", "work-board"],
    notFor: { system: "no run to wait on", supersystem: "no run to wait on" },
    test: h => need(!/waiting on the user/i.test(scripts(h)), "its text still says \"waiting on the user\"") },
  { id: "archived-no-colour", name: "an archived system holds no colour: neutral, solid, faded, with its tag", since: 37, types: ["supersystem", "plan-board", "work-board", "system"],
    test: (h, kind) => need(kind === "system" ? /data-sys-status="archived"/.test(css(h)) : kind === "supersystem" ? /const SLOT_OF=/.test(scripts(h)) && /s\.status==="archived"\) return null/.test(scripts(h)) : /const sysLit=s=>!!s&&s\.status!=="archived"/.test(scripts(h)), "an archived system's colour is assigned like a live one's (its slot held)") },
  { id: "kpi-bars", name: "a segmented bar on every tile that counts states", since: 19, types: BOARDS,
    notFor: { system: "its tiles are hand-written counted facts, with no states to segment", supersystem: "no KPI tiles" },
    test: h => need(/seg-bar/.test(scripts(h)), "no tile draws a segmented bar") },
  { id: "bug-badge-neutral", name: "the bug badge neutral, told by its ▲ and its word", since: 26, types: STATE,
    notFor: { "plan-board": "no bug badge", "work-board": "no bug badge" },
    test: h => { const m = /\.badge\.bug[^{]*\{[^}]*\}/g, rules = css(h).match(m) || []; return need(!rules.some(r => /var\(--(serious|critical|warning|good)\)/.test(r)), "the bug badge takes a status colour"); } },
  { id: "chain-progress", name: "a tracking issue's chain on the roadmap (n of m landed, a bar)", since: 26, types: STATE,
    notFor: { "plan-board": "it draws the chain from its data (the chain chip)", "work-board": "it draws the chain from its data (the state cell)" },
    test: h => need(/chainprog/.test(scripts(h)), "the renderer draws no chain progress (sectionKeys())") },
  { id: "core-subsystems", name: "a supersystem's subsystems marked core or optional", since: 26, types: ["supersystem"],
    notFor: { system: "it draws no subsystems' roles", "plan-board": "no Systems tab", "work-board": "no Systems tab" },
    test: h => need(/core subsystem/.test(scripts(h)), "the Systems tab does not mark core and optional subsystems") },
  /* admin-team/dashboards-skill/22 */
  { id: "kpi-tile-legends", name: "each KPI tile's legend inside the tile, no shared legend row under the tiles", since: 22, types: BOARDS,
    notFor: { system: "its tiles are hand-written counted facts with no bar, so no legend", supersystem: "no KPI tiles" },
    test: (h, k) => k === "plan-board" ? need(/function kpiKeys\(/.test(scripts(h)) && !/kpikey|kpi-key/.test(h), /kpikey|kpi-key/.test(h) ? "the tiles still share one legend row (kpi-key)" : "no tile carries its own legend (kpiKeys())")
      : need(/\.kpi(?:-tile)? \.(?:key|legend)\{/.test(css(h)), "the tiles carry no legend of their own (.kpi-tile .legend)") },
  { id: "no-model-tag", name: "no \"board\" tag in the header (it repeated the KPI tiles; the source is in the footer and the Source tab)", since: 22, types: BOARDS,
    notFor: { system: "its C4 model tag names the DSL the board renders, with counts no tile repeats", supersystem: "its C4 model tag names the DSL the board renders, with counts no tile repeats" },
    test: h => need(!/tag\("board",/.test(scripts(h)), "the header still draws the \"board\" tag") },
  { id: "title-issue-link", name: "the title's #n is the GitHub issue's link; the issue line the issue's GitHub title alone", since: 22, types: ["plan-board"],
    notFor: { system: "no issue of its own: a state board names no issue above its Context", supersystem: "no issue of its own: a state board names no issue above its Context", "work-board": "no issue of its own" },
    test: h => need(/class=\\?"ghn\\?"/.test(scripts(h)) && !/GitHub issue \$\{ext\(/.test(scripts(h)), "the title's #n is not a link, or the issue line still repeats it (\"GitHub issue #n\")") },
  { id: "panel-since-once", name: "\"since\" said once: by the step panel, not by the strip's head line or the unit card beside it", since: 22, types: ["plan-board"],
    notFor: { system: "no step panel", supersystem: "no step panel", "work-board": "no step panel: one row per run" },
    test: h => need(/ownPanelShown/.test(scripts(h)), "the strip's head line repeats the step panel's \"since\"") },
  { id: "charging-arrow-large", name: "the larger charging arrow (22 px, reaching over both cells' edges)", since: 22, types: ["plan-board"],
    notFor: { system: "no Timeline columns", supersystem: "no Timeline columns", "work-board": "no Timeline columns: one row per run" },
    test: h => need(/\.cell\.verdict\.charging::before\{[^}]*height:22px/.test(css(h)), "the charging arrow is the small one (12 px)") },
  { id: "landing-event", name: "the landing step panel names the team-raised landing (the land accepted and merged)", since: 22, types: ["plan-board"],
    notFor: { system: "no run steps", supersystem: "no run steps", "work-board": "it shows each run's step and detail as text" },
    /* the wording of dashboards-skill/33 ("the land is accepted and being merged"), or the older one on a board rendered before it */
    test: h => need(/the land is accepted and being merged|admin team has accepted the land/.test(scripts(h)), "the landing step panel does not read the landing event") },
  { id: "tests-tab", name: "the Tests tab (Added, Amended, Relevant, Other; by test level, with results and the rows verified)", since: 22, types: ["plan-board"],
    notFor: { system: "a state board shows the code at a commit, not one change's tests (its Guarantees count the test levels)", supersystem: "a state board shows the code at a commit, not one change's tests (its Guarantees count the test levels)", "work-board": "one row per run: each run's tests are on its own board" },
    test: h => { const b = body(h), s = scripts(h); return need(/id="t-tests"/.test(b) && ["added", "amended", "relevant", "other"].every(k => new RegExp(`id="t-tests-${k}"`).test(b)) && /function renderTests\(/.test(s), "no Tests tab with its four sub-tabs (Added, Amended, Relevant, Other)"); } },
  /* admin-team/dashboards-skill/23 */
  { id: "timeline-phases", name: "the Timeline tile's bar on a landed board: the time per phase in neutral ink shades, each phase in its legend, a phase with no bound named", since: 23, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state board shows no run's phases", supersystem: "no KPI tiles", "work-board": "one row per run and no Timeline tile: each run's phases are on its own board" },
    /* the phases of dashboards-skill/23, or the legend of step visits that replaced them (dashboards-skill/32, timeline-steps) */
    test: h => { const s = scripts(h), c = css(h); return need((/function timelinePhases\(/.test(s) && /o\.timeline=key\(/.test(s) && /\.tp-1\{--tp:/.test(c) && /\.tp-4\{--tp:/.test(c)) || /function timelineSteps\(/.test(s), "the Timeline tile draws no bar of its phases (timelinePhases(), the tp shades)"); } },
  { id: "ref-number", name: "a reference's section number before its excerpt: from its file's headings (refNumber), else its anchor's number marked \"?\"", since: 23, types: ["plan-board"],
    notFor: { system: "no statements with plan references", supersystem: "no statements with plan references", "work-board": "no statements: one row per run" },
    test: h => { const s = scripts(h); return need(/const refNumShown=/.test(s) && /refMarked\(/.test(s) && /\.(?:key|legend) b\.srefk\{/.test(css(h)), "a reference with no excerpt still reads its whole anchor (\"§ 42-the-fix\"), with no section number from refNumber"); } },
  { id: "level-phrases", name: "no work level in the board's data, its scope and re-pass phrases included (\"inside level 3\", \"a level-3 re-pass\", \"Label level: 3\")", since: 23, types: ALL,
    /* an issue's title is quoted verbatim and left out of the scan (dashboards-skill/28): one that names a work level is a defect in the
       issue, flagged by check.js and check-board.js (ISSUE TITLE NAMES A WORK LEVEL: #n), never a missing feature of the board */
    test: h => { const { levelRefs, levelRefsIn, titleSkip } = require("./levelrefs.js"), hits = [];
      [...h.matchAll(/<script type="(application\/json|text\/plain)"[^>]*>([\s\S]*?)<\/script>/g)].forEach(m => { if (m[1] === "text/plain") levelRefs(m[2]).forEach(x => hits.push(x)); else { try { const d = JSON.parse(m[2]); levelRefsIn(d, "", [], titleSkip(d)).forEach(x => hits.push(x.hit)); } catch (e) { /* the embed checks report a block that does not parse */ } } });
      return need(!hits.length, `its data names a work level ${hits.slice(0, 3).map(x => JSON.stringify(x)).join(", ")}: reword it (levelrefs.js scrubLevels()), never write it`); } },
  /* admin-team/dashboards-skill/28 */
  { id: "unit-filing-glow", name: "each unit row's label glowing on its own while its sub-issue, then its board, is made (<unit-id>.units)", since: 28, types: ["plan-board"],
    notFor: { system: "no units and no run", supersystem: "no units and no run", "work-board": "it marks runs: filing is the tracking issue's own step, on its own row, and a unit's row glows only once its run is under way" },
    test: h => { const s = scripts(h); return need(/class="rowlab\$\{r\.unit&&CURRENT\.includes\(r\.id\+"\.units"\)/.test(s) && /const rowActive=r=>CURRENT\.some\(a=>\{ const p=String\(a\)\.split\("\."\); return p\[0\]===r\.id&&p\[1\]!=="units"; \}\)/.test(s), "the unit rows' labels glow as one column (\"units\"), not each unit on its own, or a unit being filed reads as in progress"); } },
  { id: "timeline-sum", name: "the Timeline tile's figure the sum of the phases its bar draws (a phase left out not summed)", since: 28, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state board shows no run's phases", supersystem: "no KPI tiles", "work-board": "one row per run and no Timeline tile: each run's phases are on its own board" },
    /* the sum of the phases drawn (dashboards-skill/28), or of the visits drawn (dashboards-skill/32) */
    test: h => { const s = scripts(h); return need(/function timelineTotal\(/.test(s) && (/tlDuration\(timelineTotal\(TP\)\)/.test(s) || /tlSpan\(tot\)/.test(s)), "the Timeline tile's figure is the span from baseline to built, not the sum of its phases (timelineTotal())"); } },
  { id: "issue-title-quoted", name: "an issue's title quoted verbatim and marked (data-issue-title), so a work level in it is flagged as a defect in the issue, not shown as the board's", since: 28, types: ALL,
    test: (h, k) => { const s = scripts(h);
      if (k === "plan-board") return need(/data-issue-title=/.test(s) && /\$\("#issueline"\)\.innerHTML=PLAN\.issueTitle\?`<span data-issue-title=/.test(s), "the renderer quotes no issue title marked data-issue-title (the issue line, the roadmap, the follow-ups)");
      if (k === "work-board") return need(/data-issue-title=/.test(s), "the renderer quotes no issue title marked data-issue-title (the rows, the groups, the roadmap, the unscheduled issues)");
      return need(/a\[data-board\]/.test(s) && /issueTitle=/.test(s) && /data-issue-title/.test(s), "linkIssues() drops the title's mark: a title written <a data-board=\"N\"> keeps data-issue-title once resolved"); } },
  /* admin-team/dashboards-skill/29 */
  { id: "planned-parts-page", name: "a planned supersystem's card linking the board of its built parts (\"its built parts' board\"), never \"no board yet\"", since: 29, types: ["supersystem"],
    notFor: { system: "no Systems tab: it is the board of one system", "plan-board": "its systems tag links a system's board from the files on disk (embed.js), whatever its status", "work-board": "no system cards: it links the repository state board and the boards" },
    test: h => need(/its built parts' (?:board|page)/.test(scripts(h)), "the Systems tab says \"no board yet\" on a planned supersystem whose built parts have a board") },
  /* admin-team/dashboards-skill/30 */
  { id: "qa-passes-shown", name: "every Quality Review a board records and the one running (qaShown()), each by its number (\"Quality Review 2\"; an ordinal before dashboards-skill/41)", since: 30, types: BOARDS,
    notFor: { system: "no qa passes: a state board shows the code at a commit, not a run", supersystem: "no qa passes: a state board shows the code at a commit, not a run" },
    test: h => { const s = scripts(h); return need(/function qaShown\(/.test(s) && (/\$\{passName\(p\.pass\)\}/.test(s) || (/const ordinal=/.test(s) && /\$\{ordinal\(p\.pass\)\}/.test(s))), "the Quality Reviews leave out the one running, or are not named by their number (qaShown(), passName())"); } },
  { id: "dependency-pills", name: "each dependency with its build state (blocking, clear, pre-built) and its locality (repo, org, parent org, external), and what an issue holds up (blocks or enables)", since: 30, types: BOARDS,
    notFor: { system: "a state board is as-is and names no issue above its Context; its Context lists issues open or closed, not their dependencies", supersystem: "a state board is as-is and names no issue above its Context; its Context lists issues open or closed, not their dependencies" },
    test: (h, k) => { const s = scripts(h), base = /const dep(?:Pill|Bubble)=/.test(s) && /const LOC=\{/.test(s) && /const HOLD=\{/.test(s) && /\.loc\.l4\{/.test(css(h));
      if (k === "work-board") return need(base && /<th>Depends on<\/th><th>Blocks · enables<\/th>/.test(s) && !/<th>Branch<\/th>|<th>Board<\/th>/.test(s) && /branch <code>/.test(s), "the repository work board keeps its \"Waits on · blocks\", Branch or Board column, or draws no dependency pills (depPill(), HOLD)");
      return need(base && /depends on <span class="deplist">/.test(s), "the WIP strip and a unit's inspector list \"waits on\" or \"blocked by\" with no dependency pills (depPill(), unitDeps())"); } },
  /* admin-team/dashboards-skill/31 */
  { id: "qa-in-place", name: "the decision not to run another qa pass: a small neutral mark beside the pass whose findings were fixed in place (the on-the-spot route, qaShown())", since: 31, types: BOARDS,
    notFor: { system: "no qa passes: a state board shows the code at a commit, not a run", supersystem: "no qa passes: a state board shows the code at a commit, not a run" },
    test: h => { const s = scripts(h); return need(s.includes("const inPlaceMark=") && s.includes("inPlace:") && css(h).includes(".qamark{"), "a pass fixed in place with no further pass reads as unfinished: no mark beside it (qaShown() and inPlaceMark(), .qamark)"); } },
  { id: "runs-larger", name: "the Runs tab's content larger but Now, each run a labelled card under 880 px", since: 31, types: ["work-board"],
    notFor: { system: "no runs table: its tabs show the code at a commit", supersystem: "no runs table: its tabs show the code at a commit", "plan-board": "no runs table: one run, its rows a timeline grid sized by its own rules (plan/RULES.md §2)" },
    test: h => { const c = css(h); return need(c.includes(".tbl{font-size:14.5px") && c.includes(".tbl td:nth-child(3){font-size:12.5px}") && c.includes("@media (max-width:879.98px)"), "the Runs tab keeps the small table (12.5 px everywhere) or scrolls it sideways at phone width"); } },
  /* admin-team/dashboards-skill/32 */
  { id: "timeline-steps", name: "the Timeline tile of a landed board: one line per visit of a run step, its start → end and duration from the record only (— where none), in hours and minutes, the bar one segment per timed visit", since: 32, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state board shows no run's steps", supersystem: "no KPI tiles", "work-board": "one row per run and no Timeline tile: its Landed tile counts runs and shows no time; each run's steps are on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/function timelineSteps\(/.test(s) && /const tlSpan=/.test(s) && /function timelineTile\(/.test(s) && /class="(?:key|legend) tl-steps"/.test(s) && (c.includes(".kpis:has(>.kpi>.key.tl-steps){") || c.includes(".tl-tile>.kpi{") || c.includes(".tl-tile>.kpi-tile{")) /* across the KPI row (dashboards-skill/32), or across the Timeline tab (dashboards-skill/34) */, "the Timeline tile shows phases in calendar days (\"same day\"), not one line per run step with its times (timelineSteps(), tlSpan(), timelineTile())"); } },
  /* admin-team/dashboards-skill/34 */
  { id: "timeline-families", name: "the Timeline tile coloured by kind of work (planning, build, checking, landing), a shade per step, a mark before each step line and a legend of the families", since: 34, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state board shows no run's steps", supersystem: "no KPI tiles", "work-board": "one row per run and no Timeline tile: each run's steps are on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/const TL_FAMILIES=/.test(s) && /class="(?:key|legend) tl-fams"/.test(s) && /--wk-planning-a:/.test(c) && /--wk-landing-b:/.test(c) && (c.includes(".key i.segk.tl-out{") || c.includes(".legend i.segk.tl-out{")), "the Timeline tile draws its steps in a neutral ink ramp, with no kinds of work (TL_FAMILIES, the --wk tokens, the families legend)"); } },
  { id: "timeline-approx", name: "the Timeline tile reads approximate bounds (asBuilt.approx, ≈), never as recorded times", since: 34, types: ["plan-board"],
    notFor: { system: "no Timeline tile", supersystem: "no KPI tiles", "work-board": "no Timeline tile" },
    test: h => need(/function approxBounds\(/.test(scripts(h)) && /function timelineApproxNote\(/.test(scripts(h)), "the Timeline tile ignores asBuilt.approx (approxBounds(), timelineApproxNote())") },
  { id: "landing-split", name: "the landing in three steps: landing, state boards, merge, then landed", since: 34, types: ["plan-board"],
    notFor: { system: "no run steps", supersystem: "no run steps", "work-board": "it shows each run's step as text (its state column), from the board's own data" },
    /* since dashboards-skill/35 the land is two steps after the Document step (document-step, below); either line has the land split */
    test: h => need(/const STEP_ORDER=\[[^\]]*("landing","state-boards","merge"|"document","landing","merge"),"landed"\]/.test(scripts(h)), "the steps line ends at one landing step (STEP_ORDER without merge)") },
  { id: "roadmap-parent", name: "an issue board's Context roadmap names its parent tracking issue when its roadmap is not filled, never \"no tracking parent\"", since: 34, types: ["plan-board"],
    notFor: { system: "its Context lists the repository roadmap from the tracker", supersystem: "its Context lists the repository roadmap from the tracker", "work-board": "it lists the repository roadmap itself (board.js, from the tracker or the tracking boards)" },
    test: h => need(/else if\(PLAN\.parent&&Number\.isInteger\(PLAN\.parent\.issue\)\) cards\.push\(`<div class="card"><h3>Roadmap/.test(scripts(h)), "a sub-issue's board whose roadmap is unset says it has no tracking parent") },
  { id: "design-tab", name: "the four columns' tab named Design (in place of Timeline, which the Timeline tile keeps), #timeline still opening it", since: 34, types: ["plan-board"],
    notFor: { system: "its tabs are the six core tabs of a state board", supersystem: "its tabs are the six core tabs of a state board", "work-board": "no four-column tab: its tabs are Runs and the rest" },
    test: h => need(/id="t-design"[^>]*>Design</.test(h) && /hash==="timeline"\|\|hash==="p-timeline"/.test(scripts(h)), "the four columns' tab is still named Timeline, beside the Timeline tile") },
  { id: "timeline-tab", name: "the Timeline tab after Design: the Timeline tile, the KPI tiles below it with their tracers, on every issue board (a board in flight its steps so far)", since: 34, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state board shows no run's steps", supersystem: "no KPI tiles and no run", "work-board": "one row per run: its tiles count runs and say no step's time; each run's steps are on its own board" },
    test: h => { const s = scripts(h); return need(/id="t-steps"[^>]*>Timeline</.test(h) && /<div class="tl-tile" id="tl-tile">/.test(h) && /function drawTracers\(/.test(s) && /function timelineTracers\(/.test(s) && !/<\/section>\s*<div class="kpis" id="kpis"><\/div>\s*<!--/.test(h), "the KPI tiles stand in the board's head, with no Timeline tab and no tracers (drawTracers(), timelineTracers())"); } },
  /* admin-team/dashboards-skill/doc-landing-and-view-follow */
  { id: "view-copy-follow", name: "a tracked issue or tracking board opened on this machine follows its fresher view copy at each poll, read-only, labelled the live view", since: 38, types: ["plan-board"],
    notFor: { system: "a state board has no run steps and no view copy", supersystem: "a state board has no run steps and no view copy", "work-board": "its live view is a board of its own (docs/plans/.live/index.html), which the committed one links" },
    test: h => { const s2 = scripts(h); return need(/const planStampOf=/.test(s2) && /function followSettle\(/.test(s2) && /dataset\.viewCopy/.test(s2) && /id="liveview"/.test(h), "the tracked board does not follow its view copy (planStampOf(), followSettle(), the script's data-view-copy, #liveview)"); } },
  /* admin-team/dashboards-skill/35 */
  { id: "document-step", name: "the Document step between qa and the land (its tasks in the step panel, the state boards among them), then the land in two steps, landing and merge", since: 35, types: ["plan-board"],
    notFor: { system: "no run steps", supersystem: "no run steps", "work-board": "it shows each run's step as text (its state column), from the board's own data" },
    test: h => { const s2 = scripts(h); return need(/const STEP_ORDER=\[[^\]]*"remediation","document","landing","merge","landed"\]/.test(s2) && /\bdocument:\(R,o\)=>/.test(s2) && /\bdocument:\(V,o,keys\)=>/.test(s2), "the steps line has no Document step, or its step panel cannot show its tasks (STEP_ORDER, PANEL.document, PAST.document)"); } },
  { id: "dependency-dropped", name: "a dependency's build state from its code (blocking until merged, clear once merged, pre-built, and dropped when closed as not planned)", since: 35, types: BOARDS,
    notFor: { system: "a state board names no issue's dependencies", supersystem: "a state board names no issue's dependencies" },
    test: h => need(/dropped:\{g:"✕"/.test(scripts(h)) && /its code is not merged yet/.test(scripts(h)), "the dependency pills read the GitHub issue (open, closed) rather than its code, and draw no dropped state (DEP)") },
  { id: "consequences-tab", name: "the Consequences tab (the Impact tab before dashboards-skill/35; its ids, its #impact deep links and its data key kept)", since: 35, types: ["plan-board"],
    notFor: { system: "no such tab: a state board shows the code at a commit", supersystem: "no such tab", "work-board": "no such tab: each row carries its reconciliation chip" },
    test: h => need(/id="t-impact"[^>]*>Consequences</.test(h), "the tab is still labelled Impact") },
  { id: "build-output-copies", name: "a build output (an open point's report, a qa pass's test report) named as plain text, and linked to its copy in the live view (docs/plans/.live/open/)", since: 35, types: ["plan-board"],
    notFor: { system: "it names its test report as plain text, with no live view to link it (system/RULES.md §5)", supersystem: "as a system board", "work-board": "it shows no open point or test report: each run's are on its own board" },
    test: h => need(/const liveCopyLink=/.test(scripts(h)) && /docs\/plans\/\.live\/open\/index\.js/.test(scripts(h)), "an open point's or a test report's build output is never linked to its copy in the live view (liveCopyLink())") },
  /* admin-team/board/timeline-outages (dashboards-skill/36) and admin-team/board/timeline-waits, as the decision of 2026-11-05 left them: time
     that is not counted is not mentioned. Its stretches and waits still bound the visits; the "run not running" and "waiting on you" lines,
     their marks and the sub-line's "not counted" note are gone. A board drawn on the template of dashboards-skill/36-37 still draws them and
     is re-rendered by its next event; a landed one is kept as it landed. */
  { id: "timeline-uncounted-silent", name: "the Timeline mentions no time it does not count: a wait on you or a stretch when the run was not running only bounds the visits (no line, no mark, no note, never a bar segment, never summed)", since: 38, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state board shows no run's steps", supersystem: "no KPI tiles", "work-board": "one row per run and no Timeline tile: it sums no step's time; each run's steps are on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/const outagesOf=/.test(s) && /const waitsOf=/.test(s) && /function timelineRows\(T\)\{ return \(\(T&&T\.visits\)\|\|\[\]\)\.map\(v=>\(\{visit:v\}\)\); \}/.test(s) && !/class="tl-wait"|class="tl-outage"|function timelineWaitNote\(/.test(s) && !/\.tl-outk\{|\.tl-waitk\{/.test(c), "the Timeline draws a wait on you or a stretch when the run was not running as a line of its own, or names their time in a note (wline, oline, timelineWaitNote())"); } },
  { id: "fix-of", name: "a fix to an earlier plan's work names the landed issue it fixes (\"fix to #n\"), its board first", since: 35, types: BOARDS,
    notFor: { system: "a state board names no issue above its Context", supersystem: "a state board names no issue above its Context" },
    test: (h, k) => need(k === "work-board" ? /fix to \$\{ilink\(r\.fixOf\)\}/.test(scripts(h)) : /tag\("fix to"/.test(scripts(h)), "a fix's board or row does not name the issue it fixes (plan.fixOf, row.fixOf)") },
  { id: "systems-visibility", name: "the Systems tab grouped by visibility (public, internal · org, internal · repo, unset; an Archived group apart), a system's parts inside its panel, planned dashed and archived faded", since: 35, types: ["supersystem"],
    notFor: { system: "one system: its visibility is a header tag (system/RULES.md §2)", "plan-board": "its systems are a header tag; no Systems tab", "work-board": "one row per run: an archived system's rows carry a tag, visibility does not group runs" },
    test: h => { const s2 = scripts(h); return need(/const VISIBILITY=\[/.test(s2) && /function sysBlock\(/.test(s2) && /\.syspanel\{/.test(css(h)) && /s\.status==="archived"/.test(s2), "the Systems tab is one flat grid: no visibility groups, no panels holding a system's parts, no Archived group (VISIBILITY, sysBlock())"); } },
  { id: "structure-height", name: "the structure map 1000 wide, its height recorded on the board (MODEL.structure.h, at most 812)", since: 35, types: ["system"],
    notFor: { supersystem: "its Structure tab draws the systems in a layout of its own", "plan-board": "no structure map", "work-board": "no structure map" },
    test: h => need(/Number\(MODEL\.structure\.h\)/.test(scripts(h)), "the structure map is fixed at 1000×612 (MODEL.structure.h not read)") },
  /* admin-team/dashboards-skill/theme-switch and /inspector-switch (the user's decisions of 2026-11-05), dated 39: the header's switches
     (GUIDANCE.md §12, "Switch"). A board drawn before them keeps its theme button and has no inspector switch until its next rebuild (the
     splice, its next event, board.js --refresh-template); a landed issue board is kept as it landed (§11). */
  { id: "switch-look", name: "the theme switch drawn as a switch: a track with a knob that slides to the palette shown (role=switch, aria-checked), the knob still under reduced motion", since: 39, types: ALL,
    test: h => { const s = scripts(h), c = css(h); return need(/class="switch-track"/.test(h) && /setAttribute\("role","switch"\)|role="switch"/.test(h) && /setAttribute\("aria-checked"/.test(s) && /\.switch-knob\{/.test(c) && /prefers-reduced-motion:\s*reduce\)\{\.switch-track,\.switch-knob\{transition:none\}/.test(c),
      "the theme control is a button that reads its state as a word (☀ light, ☾ night), not a switch with a knob (.switch-track, .switch-knob, role=switch, aria-checked)"); } },
  { id: "inspector-switch", name: "the inspector switch: shown by default, the choice remembered across boards and reloads, an item clicked while hidden showing it again, the tab taking the freed width", since: 39, types: ["system", "supersystem", "plan-board"],
    notFor: { "work-board": "no inspector: one row per run, each run's detail on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/"dashboards-inspector"/.test(s) && /localStorage\.getItem\("dashboards-inspector"\)/.test(head(h)) && /function inspectorSwitch\(/.test(s) && /:root\[data-inspector="hidden"\] \.inspector\{display:none\}/.test(c) && /:root\[data-inspector="hidden"\] \.stage\{grid-template-columns:minmax\(0,1fr\)\}/.test(c),
      "no inspector switch (inspectorSwitch(), localStorage \"dashboards-inspector\" read in the head, :root[data-inspector=\"hidden\"])"); } },
  /* admin-team/dashboards/code-label-and-sigblock (the user's decisions of 2026-11-06 and 2026-11-07), dated 42: the code label on every type
     (GUIDANCE.md §12, "Code"), and an option's signature drawn beneath its name on an issue or tracking board (plan/RULES.md §2). A board drawn
     before them draws its code as bare mono text until its next rebuild (the splice, its next event, board.js --refresh-template); a landed
     issue board is kept as it landed (§11). */
  { id: "code-label", name: "the code label: every inline code a label of its own (the surface-2 fill, a hairline border, 1 × 4 px padding, 3 px radius), at normal weight inside bold text, plain inside a chip, a pill or a tile", since: 42, types: ALL,
    test: h => { const c = css(h); return need(/(?:^|\n)code\{[^}]*background:var\(--surface-2\);border:1px solid var\(--hair\);padding:1px 4px;border-radius:3px\}/.test(c) && /:is\(b,strong,\.name,\.nm,dt,th\) code\{font-weight:400\}/.test(c) && /:is\(\[class\*="chip"\],\[class\*="pill"\],\[class\*="tile"\]\) code\{background:none;border:0;padding:0;border-radius:0\}/.test(c),
      "inline code is bare mono text (no code{background:var(--surface-2);border:1px solid var(--hair);…}, or no normal weight inside bold text, or no plain code inside chips, pills and tiles)"); } },
  { id: "option-signature", name: "an option's signature (its own field) drawn beneath its short name as a block of code, in the Considered cell, the inspector and the Decisions table", since: 42, types: ["plan-board"],
    notFor: { system: "no options: a state board shows the code at a commit, not the options a run weighed", supersystem: "no options: a state board shows the code at a commit, not the options a run weighed", "work-board": "no options: one row per run, each run's options on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/const sigCode=o=>/.test(s) && /\$\{codeOnly\(o\.name\)\}\$\{sigCode\(o\)\}/.test(s) && /<div class="sigblock">\$\{sigCode\(o\)\}<\/div>/.test(s) && /<\/b>\$\{sigCode\(opt\)\}/.test(s) && /code\.codeblock\{display:block;/.test(c),
      "an option's signature field is not drawn (sigCode() beneath the name in the Considered cell, the inspector's .sigblock, the Decisions table; code.codeblock)"); } },
  /* admin-team/dashboards/step-file-tree (the user's decision of 2026-11-07, mockup pick 2), dated 43: a step's files, and the As built
     inspector's Files, nested by their folders on an issue or tracking board (plan/RULES.md §2, "A step's files"). A board drawn before it
     lists one full path per line until its next rebuild (its next event, the splice); a landed issue board is kept as it landed (§11). */
  { id: "file-tree", name: "a step's files (and the As built inspector's Files) nested by their folders: the module, its source set, the folder path as one line, each file a code label; every folder line a toggle, open at load, a closed one counting its files", since: 43, types: ["plan-board"],
    notFor: { system: "its inspector lists a component's few source files by name, each a link under the system's one source root: no modules or source sets to nest", supersystem: "no file lists: a system's code paths are its registry's folders, one line", "work-board": "no file lists: one row per run, each run's files on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/const ftTree=files=>/.test(s) && /const fileTree=files=>/.test(s) && /<details class="ftd ft-\$\{k\.k\}" open>/.test(s) && /\$\{fileTree\(s\.files\)\}/.test(s) && /<dt>Files<\/dt><dd>\$\{fileTree\(b\.files\)\}<\/dd>/.test(s) && /\.ftree details:not\(\[open\]\)>summary>\.ft-n\{display:inline\}/.test(c),
      "a step's files are listed one full path per line (no fileTree() in the Verdict inspector's steps and the As built inspector's Files, or no .ftree toggles)"); } },
  /* admin-team/dashboards/gap-marks (the user's decision of 2026-11-07, mockup pick 3, variant B), dated 44: the Gap cell's marks on an issue
     or tracking board (plan/RULES.md §2, "The Gap cell"). A board drawn before them keeps the evidence count in the cell's foot and its
     summary unbolded until its next rebuild (its next event, the splice); a landed issue board is kept as it landed (§11). */
  { id: "gap-marks", name: "the Gap cell's marks: the evidence count label in its head (muted at zero), the bold lead (the summary's first sentence), the where chip and the baseline chip in its foot", since: 44, types: ["plan-board"],
    notFor: { system: "no Gap column: a state board shows the code at a commit, not the gaps a run found", supersystem: "no Gap column: a state board shows the code at a commit, not the gaps a run found", "work-board": "no Gap column: one row per run, each run's gaps on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/const evidenceLabel=n=>/.test(s) && /const whereChip=r=>/.test(s) && /const baselineChip=b=>/.test(s) && /const leadSplit=s=>/.test(s) && /\$\{evidenceLabel\(\(g\.evidence\|\|\[\]\)\.length\)\}<\/div><div class="sum">\$\{gapSum\(g\)\}<\/div><div class="meta">\$\{whereChip\(r\)\}\$\{baselineChip\(PLAN\.baseline\)\}/.test(s) && /\.cell \.kick \.count-label\.zero b\{/.test(c) && /\.cell \.meta :is\(\.where-chip,\.baseline-chip\)\{/.test(c),
      "the Gap cell keeps its evidence count in its foot, with no bold lead, where chip or baseline chip (evidenceLabel(), gapSum(), whereChip(), baselineChip() in cellGap(); .count-label, .where-chip, .baseline-chip)"); } },
  /* admin-team/dashboards/halt-questions (the user's decision of 2026-11-07), dated 45: the questions a halt in any step puts to the user, with
     their options, in the panel the interview's use (plan/RULES.md §3, wip.asked): the live panel of the step it halted in, the snapshot of the
     visit the halt ended, a tracking board's unit panel and its "waiting on you" card. A board drawn before it shows the halt's wait line alone
     until its next rebuild (its next event, the splice); a landed issue board is kept as it landed (§11). */
  { id: "halt-questions", name: "the questions a halt puts to you in any step, each with its options, answered or waiting, in the step panel the interview's use (live, on the visit the halt ended, and on a tracking board's waiting card)", since: 45, types: ["plan-board"],
    notFor: { system: "no run: a state board shows the code at a commit, not a run's halts", supersystem: "no run: a state board shows the code at a commit, not a run's halts", "work-board": "one row per run, its wait one line; the questions and their options are on the run's own board" },
    test: h => { const s = scripts(h); return need(/function questionsHtml\(list,keys,kind,lead\)\{/.test(s) && /const askedShown=\(R,S\)=>/.test(s) && /if\(S!=="interview"\) h\+=askedBlock\(askedShown\(R,S\),keys\);/.test(s) && /if\(Array\.isArray\(V\.asked\)\) h\+=askedBlock\(/.test(s) && /const waitingQs=R=>/.test(s) && /qs=waitingQs\(L\)/.test(s),
      "a halt outside the interview shows only what it waits on: no questions with their options (questionsHtml(), askedShown() in stepPanel(), a visit's asked, waitingQs() on the waiting card)"); } },
  /* admin-team/dashboards-skill/24 */
  { id: "finished-steps", name: "finished steps on the progress strip clickable: each shows its snapshot (wip.history) in the step panel, or what survives, reconstructed", since: 24, types: ["plan-board"],
    notFor: { system: "no progress strip: a state board shows the code at a commit, not a run's steps", supersystem: "no progress strip: a state board shows the code at a commit, not a run's steps", "work-board": "no progress strip: one row per run, each run's step as text; its steps are on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/function pastPanel\(/.test(s) && /class="stepbtn"/.test(s) && /function reconStep\(/.test(s) && /reconstructed from the history/.test(s) && /\.steps li\.sel \.dot\{/.test(c), "the strip's finished steps are not buttons, or the step panel cannot show a finished step's snapshot (pastPanel(), reconStep())"); } },
];
/* The layout detectors, run in the browser pass (check-board.js's probe), named here so the report and the rules list them. */
const LAYOUT = [
  { id: "header-halves", name: "the header's two halves (intro left, tags right, from 940 px)", since: 21, types: ALL },
  { id: "wide-page", name: "the board using most of a window wider than 1500 px", since: 10, types: ALL },
  { id: "context-legend-shown", name: "the Context's legend shown wherever its cards draw an encoding", since: 26, types: ALL },
  { id: "guarantees-legend-shown", name: "the Guarantees' legend shown wherever its guarantee cards draw an encoding", since: 26, types: STATE },
];
const sinceOf = f => `dashboards-skill/${f.since}`;
/* the detectors that apply to a board type */
const applicable = kind => FEATURES.filter(f => f.types.includes(kind));
/* The missing features of a board: [{ id, name, since, why }] — empty when the board carries every feature its type takes. */
function probe(html, kind) {
  return applicable(kind).map(f => { let r; try { r = f.test(String(html).replace(/\r\n/g, "\n"), kind); } catch (e) { r = "the detector failed: " + e.message; } return r === true ? null : { id: f.id, name: f.name, since: sinceOf(f), why: r }; }).filter(Boolean);
}
const line = m => `FEATURE MISSING: ${m.name} (template since ${m.since})${m.why ? ": " + m.why : ""}`;
module.exports = { FEATURES, LAYOUT, applicable, probe, line, sinceOf, TYPES: ALL };
