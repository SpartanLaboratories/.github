// The per-page feature probes (GUIDANCE.md §8, "Features"): one detector per template feature, tagged with the skill step that added it
// and the page types it applies to, the types it does not fit listed with the reason. Not a command: check-page.js (--auto, --auto
// --no-browser and its plain passes) and plan/scripts/check.js --auto run the static detectors on every page, whatever its browser pass,
// and fail a missing feature as "FEATURE MISSING: <feature> (template since dashboards-skill/N)" — through a declared divergence too: a
// divergence adds or argues a removal, it never excuses a page that lags its template. The layout detectors (LAYOUT) run in the browser
// pass (check-page.js's probe). verify/verify-templates.js holds every template to every detector that applies to it.
//
// Page types: "system" (a system page), "supersystem" (a supersystem or the repository page), "plan-board" (an issue board or a tracking
// board), "work-board" (the committed work board or the live one). Features older than the cross-type review of dashboards-skill/10 are
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
  { id: "theme-switch", name: "the theme switch (a light/night toggle that remembers the choice)", since: 17, types: ALL,
    test: h => need(/"dashboards-theme"/.test(scripts(h)) && /localStorage\.setItem\(/.test(scripts(h)), "no script writes localStorage \"dashboards-theme\"") },
  { id: "dark-palette", name: "the dark palette, selected by the system setting and by the switch", since: 17, types: ALL,
    test: h => need(/prefers-color-scheme:\s*dark/.test(css(h)) && /:root\[data-theme="dark"\]/.test(css(h)), "the CSS lacks the prefers-color-scheme dark palette or :root[data-theme=\"dark\"]") },
  { id: "labelled-tags", name: "the header's tags, each its label then its value", since: 21, types: ALL,
    test: (h, k) => {
      if (BOARDS.includes(k)) return need(/<span class="ck">/.test(scripts(h)), "the renderer writes no labelled tag (<span class=\"ck\">)");
      const hd = (/<header>([\s\S]*?)<\/header>/.exec(body(h)) || [, ""])[1], chips = [...hd.matchAll(/<span class="chip[^"]*"(?![^>]*\bid="chip-)[^>]*>([\s\S]*?)<\/span>\s*(?=<span class="chip|<\/div>)/g)];
      const bare = chips.filter(m => text(m[1]) && !/class="ck"/.test(m[1]));
      return need(!bare.length, `${bare.length} header chip${bare.length === 1 ? "" : "s"} without a label: ${bare.slice(0, 3).map(m => JSON.stringify(text(m[1]).slice(0, 40))).join(", ")}`); } },
  { id: "wide-1500", name: "the wide desktop layout (over 1500 px the page uses most of the window)", since: 10, types: ALL,
    test: h => need(/@media\s*\(min-width:\s*1500px\)\s*\{[^}]*\.page\{max-width:min\(2400px,100%\)\}/.test(css(h)), "no @media (min-width:1500px) widening .page to min(2400px,100%)") },
  { id: "boards-map", name: "the BOARDS map (an issue's number links its plan board)", since: 10, types: STATE,
    notFor: { "plan-board": "its board links come from its data (embed.js)", "work-board": "its board links come from its data (board.js)" },
    test: h => need(/^const BOARDS=/m.test(h), "no const BOARDS= line") },
  { id: "live-indicator", name: "the live indicator: on a plan board and the work board, never on a state page", since: 17, types: ALL,
    test: (h, k) => BOARDS.includes(k) ? need(/id="live"/.test(h), "no live indicator (id=\"live\")") : need(!/class="livechip/.test(body(h)), "a state page shows the code at a named commit: it has no live indicator") },
  { id: "one-line-ledes", name: "ledes of at most one short line (130 characters)", since: 10, types: ALL,
    test: h => { const long = [...body(h).matchAll(/<p class="lede"[^>]*>([\s\S]*?)<\/p>/g)].map(m => text(m[1])).filter(t => t.length > 130);
      return need(!long.length, `${long.length} lede${long.length === 1 ? "" : "s"} over 130 characters: ${long.slice(0, 2).map(t => JSON.stringify(t.slice(0, 60) + "…")).join(", ")}`); } },
  { id: "reduced-motion", name: "reduced motion honoured wherever anything animates", since: 17, types: ALL,
    test: h => { const c = css(h); return need(!/@keyframes|animation:/.test(c) || /prefers-reduced-motion:\s*reduce/.test(c), "the page animates and has no prefers-reduced-motion rule"); } },
  { id: "keyboard-buttons", name: "every role=button reachable by keyboard (a tabindex beside it)", since: 10, types: ALL,
    test: h => { const bad = h.replace(/<style>[\s\S]*?<\/style>/g, "").split(/\r?\n/).filter(l => /role(="|:"|=\\")button/.test(l) && !/tabindex|tabIndex/.test(l));
      return need(!bad.length, `${bad.length} line${bad.length === 1 ? "" : "s"} with role=button and no tabindex: ${bad.slice(0, 2).map(l => JSON.stringify(l.trim().slice(0, 70))).join(", ")}`); } },
  { id: "tab-keys", name: "the tablist's keys: arrows, Home and End, a roving tabindex", since: 26, types: ALL,
    test: h => { const s = scripts(h); return need(/Home:0/.test(s) && /End:n-1/.test(s) && /\.tabIndex=on\?0:-1/.test(s), "the tablist handles no Home/End, or keeps no roving tabindex (tabKeys())"); } },
  { id: "state-block", name: "the state block (the stamp drawn from state.json)", since: 25, types: STATE,
    notFor: { "plan-board": "its stamps are its data's (plan.json)", "work-board": "its stamps are its data's (board.json)" },
    test: h => need(/<script type="application\/json" id="state">/.test(h), "no <script type=\"application/json\" id=\"state\"> block") },
  { id: "as-is-header", name: "an as-is part that names no issue: the last amendment said in the Context section", since: 26, types: STATE,
    notFor: { "plan-board": "a board is the record of one issue", "work-board": "it lists the issues" },
    test: h => need(!/id="chip-amended"/.test(body(h)) && /ctx-amended/.test(scripts(h)), /id="chip-amended"/.test(body(h)) ? "the header still carries the \"last amended by\" chip" : "the renderer does not say the last amendment in the Context section") },
  { id: "guarantees-legend", name: "the Guarantees' legend (what its bubbles draw: swatches, planned rows, gaps)", since: 26, types: STATE,
    notFor: { "plan-board": "no Guarantees section", "work-board": "no Guarantees section" },
    test: h => need(/guarantees-key/.test(scripts(h)), "the renderer draws no Guarantees legend (sectionKeys())") },
  { id: "context-legend", name: "the Context's legend (what its cards draw)", since: 26, types: ALL,
    test: h => need(/context-key/.test(h), "the page draws no Context legend") },
  { id: "workboard-link", name: "the work board linked live first (the live view on this machine, else the committed board)", since: 26, types: ALL,
    test: (h, k) => k === "work-board" ? need(/\.live\/index\.js/.test(scripts(h)), "the committed board does not name the live view") : BOARDS.includes(k) ? need(/docs\/plans\/\.live\/index\.js/.test(scripts(h)), "the board does not probe the live work board (docs/plans/.live/index.js)") : need(/^const WORK_BOARD=/m.test(h) && /data-workboard/.test(scripts(h)), "no WORK_BOARD line, or no data-workboard link") },
  { id: "existing-links", name: "links to the shared pages only where their files exist (from the data)", since: 26, types: BOARDS,
    notFor: { system: "its hand-written links are held to the files by check-page.js (DEAD LINK)", supersystem: "its hand-written links are held to the files by check-page.js (DEAD LINK)" },
    test: (h, k) => need(k === "plan-board" ? /PLAN\.links/.test(scripts(h)) : /B\.links/.test(scripts(h)), "the renderer links the shared pages without the data's links") },
  { id: "md-copies", name: "Markdown opened as its rendered copy when one is on disk", since: 26, types: BOARDS,
    notFor: { system: "it links committed documents on GitHub, not the plan folders' Markdown", supersystem: "it links committed documents on GitHub, not the plan folders' Markdown" },
    test: h => need(/\.live\/docs\/index\.js/.test(scripts(h)), "the page does not look for the rendered copies (docs/plans/.live/docs/index.js)") },
  { id: "progress-notes", name: "the agents' progress notes in the step panel", since: 26, types: ["plan-board"],
    notFor: { system: "no step panel: a state page shows no run", supersystem: "no step panel: a state page shows no run", "work-board": "one row per run: each run's detail is on its own board" },
    test: h => need(/docs\/plans\/\.live\/progress\//.test(scripts(h)), "the step panel does not load the progress notes") },
  { id: "tracking-steps", name: "a tracking board's steps after its architecture (sub-issues, boards)", since: 26, types: ["plan-board"],
    notFor: { system: "no run steps", supersystem: "no run steps", "work-board": "it shows each run's step as text" },
    test: h => need(/"sub-issues":\(R,o\)/.test(scripts(h)), "the step panel has no sub-issues step") },
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
      : need(/\.kpi \.key\{/.test(css(h)), "the tiles carry no legend of their own (.kpi .key)") },
  { id: "no-model-tag", name: "no \"board\" tag in the header (it repeated the KPI tiles; the source is in the footer and the Source tab)", since: 22, types: BOARDS,
    notFor: { system: "its C4 model tag names the DSL the page renders, with counts no tile repeats", supersystem: "its C4 model tag names the DSL the page renders, with counts no tile repeats" },
    test: h => need(!/tag\("board",/.test(scripts(h)), "the header still draws the \"board\" tag") },
  { id: "title-issue-link", name: "the title's #n is the GitHub issue's link; the issue line the issue's GitHub title alone", since: 22, types: ["plan-board"],
    notFor: { system: "no issue of its own: a state page names no issue above its Context", supersystem: "no issue of its own: a state page names no issue above its Context", "work-board": "no issue of its own" },
    test: h => need(/class=\\?"ghn\\?"/.test(scripts(h)) && !/GitHub issue \$\{ext\(/.test(scripts(h)), "the title's #n is not a link, or the issue line still repeats it (\"GitHub issue #n\")") },
  { id: "panel-since-once", name: "\"since\" said once: by the step panel, not by the strip's head line or the unit bubble beside it", since: 22, types: ["plan-board"],
    notFor: { system: "no step panel", supersystem: "no step panel", "work-board": "no step panel: one row per run" },
    test: h => need(/ownPanelShown/.test(scripts(h)), "the strip's head line repeats the step panel's \"since\"") },
  { id: "charging-arrow-large", name: "the larger charging arrow (22 px, reaching over both cells' edges)", since: 22, types: ["plan-board"],
    notFor: { system: "no Timeline columns", supersystem: "no Timeline columns", "work-board": "no Timeline columns: one row per run" },
    test: h => need(/\.cell\.verdict\.charging::before\{[^}]*height:22px/.test(css(h)), "the charging arrow is the small one (12 px)") },
  { id: "landing-event", name: "the landing step panel names the team-raised landing (the admin team merging it)", since: 22, types: ["plan-board"],
    notFor: { system: "no run steps", supersystem: "no run steps", "work-board": "it shows each run's step and detail as text" },
    test: h => need(/admin team has accepted the land/.test(scripts(h)), "the landing step panel does not read the landing event") },
  { id: "tests-tab", name: "the Tests tab (Added, Amended, Relevant, Other; by test level, with results and the rows verified)", since: 22, types: ["plan-board"],
    notFor: { system: "a state page shows the code at a commit, not one change's tests (its Guarantees count the test levels)", supersystem: "a state page shows the code at a commit, not one change's tests (its Guarantees count the test levels)", "work-board": "one row per run: each run's tests are on its own board" },
    test: h => { const b = body(h), s = scripts(h); return need(/id="t-tests"/.test(b) && ["added", "amended", "relevant", "other"].every(k => new RegExp(`id="t-tests-${k}"`).test(b)) && /function renderTests\(/.test(s), "no Tests tab with its four sub-tabs (Added, Amended, Relevant, Other)"); } },
  /* admin-team/dashboards-skill/23 */
  { id: "timeline-phases", name: "the Timeline tile's bar on a landed board: the time per phase in neutral ink shades, each phase in its legend, a phase with no bound named", since: 23, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state page shows no run's phases", supersystem: "no KPI tiles", "work-board": "one row per run and no Timeline tile: each run's phases are on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/function timelinePhases\(/.test(s) && /o\.timeline=key\(/.test(s) && /\.tp-1\{--tp:/.test(c) && /\.tp-4\{--tp:/.test(c), "the Timeline tile draws no bar of its phases (timelinePhases(), the tp shades)"); } },
  { id: "ref-number", name: "a reference's section number before its excerpt: from its file's headings (refNumber), else its anchor's number marked \"?\"", since: 23, types: ["plan-board"],
    notFor: { system: "no statements with plan references", supersystem: "no statements with plan references", "work-board": "no statements: one row per run" },
    test: h => { const s = scripts(h); return need(/const refNumShown=/.test(s) && /refMarked\(/.test(s) && /\.key b\.srefk\{/.test(css(h)), "a reference with no excerpt still reads its whole anchor (\"§ 42-the-fix\"), with no section number from refNumber"); } },
  { id: "level-phrases", name: "no work level in the page's data, its scope and re-pass phrases included (\"inside level 3\", \"a level-3 re-pass\", \"Label level: 3\")", since: 23, types: ALL,
    /* an issue's title is quoted verbatim and left out of the scan (dashboards-skill/28): one that names a work level is a defect in the
       issue, flagged by check.js and check-page.js (ISSUE TITLE NAMES A WORK LEVEL: #n), never a missing feature of the page */
    test: h => { const { levelRefs, levelRefsIn, titleSkip } = require("./levelrefs.js"), hits = [];
      [...h.matchAll(/<script type="(application\/json|text\/plain)"[^>]*>([\s\S]*?)<\/script>/g)].forEach(m => { if (m[1] === "text/plain") levelRefs(m[2]).forEach(x => hits.push(x)); else { try { const d = JSON.parse(m[2]); levelRefsIn(d, "", [], titleSkip(d)).forEach(x => hits.push(x.hit)); } catch (e) { /* the embed checks report a block that does not parse */ } } });
      return need(!hits.length, `its data names a work level ${hits.slice(0, 3).map(x => JSON.stringify(x)).join(", ")}: reword it (levelrefs.js scrubLevels()), never write it`); } },
  /* admin-team/dashboards-skill/28 */
  { id: "unit-filing-glow", name: "each unit row's label glowing on its own while its sub-issue, then its board, is made (<unit-id>.units)", since: 28, types: ["plan-board"],
    notFor: { system: "no units and no run", supersystem: "no units and no run", "work-board": "it marks runs: filing is the tracking issue's own step, on its own row, and a unit's row glows only once its run is under way" },
    test: h => { const s = scripts(h); return need(/class="rowlab\$\{r\.unit&&CURRENT\.includes\(r\.id\+"\.units"\)/.test(s) && /const rowActive=r=>CURRENT\.some\(a=>\{ const p=String\(a\)\.split\("\."\); return p\[0\]===r\.id&&p\[1\]!=="units"; \}\)/.test(s), "the unit rows' labels glow as one column (\"units\"), not each unit on its own, or a unit being filed reads as in progress"); } },
  { id: "timeline-sum", name: "the Timeline tile's figure the sum of the phases its bar draws (a phase left out not summed)", since: 28, types: ["plan-board"],
    notFor: { system: "its tiles are hand-written counted facts: a state page shows no run's phases", supersystem: "no KPI tiles", "work-board": "one row per run and no Timeline tile: each run's phases are on its own board" },
    test: h => { const s = scripts(h); return need(/function timelineTotal\(/.test(s) && /tlDuration\(timelineTotal\(TP\)\)/.test(s), "the Timeline tile's figure is the span from baseline to built, not the sum of its phases (timelineTotal())"); } },
  { id: "issue-title-quoted", name: "an issue's title quoted verbatim and marked (data-issue-title), so a work level in it is flagged as a defect in the issue, not shown as the page's", since: 28, types: ALL,
    test: (h, k) => { const s = scripts(h);
      if (k === "plan-board") return need(/data-issue-title=/.test(s) && /\$\("#issueline"\)\.innerHTML=PLAN\.issueTitle\?`<span data-issue-title=/.test(s), "the renderer quotes no issue title marked data-issue-title (the issue line, the roadmap, the follow-ups)");
      if (k === "work-board") return need(/data-issue-title=/.test(s), "the renderer quotes no issue title marked data-issue-title (the rows, the groups, the roadmap, the unscheduled issues)");
      return need(/a\[data-board\]/.test(s) && /issueTitle=/.test(s) && /data-issue-title/.test(s), "linkIssues() drops the title's mark: a title written <a data-board=\"N\"> keeps data-issue-title once resolved"); } },
  /* admin-team/dashboards-skill/29 */
  { id: "planned-parts-page", name: "a planned supersystem's card linking the page of its built parts (\"its built parts' page\"), never \"no page yet\"", since: 29, types: ["supersystem"],
    notFor: { system: "no Systems tab: it is the page of one system", "plan-board": "its systems tag links a system's page from the files on disk (embed.js), whatever its status", "work-board": "no system cards: it links the repository page and the boards" },
    test: h => need(/its built parts' page/.test(scripts(h)), "the Systems tab says \"no page yet\" on a planned supersystem whose built parts have a page") },
  /* admin-team/dashboards-skill/24 */
  { id: "finished-steps", name: "finished steps on the progress strip clickable: each shows its snapshot (wip.history) in the step panel, or what survives, reconstructed", since: 24, types: ["plan-board"],
    notFor: { system: "no progress strip: a state page shows the code at a commit, not a run's steps", supersystem: "no progress strip: a state page shows the code at a commit, not a run's steps", "work-board": "no progress strip: one row per run, each run's step as text; its steps are on its own board" },
    test: h => { const s = scripts(h), c = css(h); return need(/function pastPanel\(/.test(s) && /class="stepbtn"/.test(s) && /function reconStep\(/.test(s) && /reconstructed from the history/.test(s) && /\.steps li\.sel \.dot\{/.test(c), "the strip's finished steps are not buttons, or the step panel cannot show a finished step's snapshot (pastPanel(), reconStep())"); } },
];
/* The layout detectors, run in the browser pass (check-page.js's probe), named here so the report and the rules list them. */
const LAYOUT = [
  { id: "header-halves", name: "the header's two halves (intro left, tags right, from 940 px)", since: 21, types: ALL },
  { id: "wide-page", name: "the page using most of a window wider than 1500 px", since: 10, types: ALL },
  { id: "context-legend-shown", name: "the Context's legend shown wherever its cards draw an encoding", since: 26, types: ALL },
  { id: "guarantees-legend-shown", name: "the Guarantees' legend shown wherever its bubbles draw an encoding", since: 26, types: STATE },
];
const sinceOf = f => `dashboards-skill/${f.since}`;
/* the detectors that apply to a page type */
const applicable = kind => FEATURES.filter(f => f.types.includes(kind));
/* The missing features of a page: [{ id, name, since, why }] — empty when the page carries every feature its type takes. */
function probe(html, kind) {
  return applicable(kind).map(f => { let r; try { r = f.test(String(html).replace(/\r\n/g, "\n"), kind); } catch (e) { r = "the detector failed: " + e.message; } return r === true ? null : { id: f.id, name: f.name, since: sinceOf(f), why: r }; }).filter(Boolean);
}
const line = m => `FEATURE MISSING: ${m.name} (template since ${m.since})${m.why ? ": " + m.why : ""}`;
module.exports = { FEATURES, LAYOUT, applicable, probe, line, sinceOf, TYPES: ALL };
