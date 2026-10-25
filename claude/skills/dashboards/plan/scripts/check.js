#!/usr/bin/env node
// Check a plan board or the work board against plan/RULES.md §8, then (with --browser) in headless Chrome.
//   node check.js <plan-folder>          plan.json keeps the rules and dashboard.html embeds it verbatim
//   node check.js docs/plans             the work board: board.json and index.html
//   options: --root <repo> (default: found above the folder, the first one holding docs/plans)
//            --browser [--out <dir>]     also run system/scripts/check-page.js: light, dark, 520 px, a 390 px frame and 1920 x 1080
//            --auto [--out <dir>]        the usual mode (GUIDANCE.md §8): the data and the embed as always, then the browser pass
//                                        only if the page deviates from its template, declared or not, or the template changed
//                                        since verify/verify-templates.js verified it; a page that is the verified template plus
//                                        its data gets none
// Exit 0 when every rule holds, 1 otherwise. Warnings never fail the run.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const { levelRefsIn } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));
const { paletteCheck } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "palette.js"));
const { BUILDING_STATES, stagedState, nextUnit, leftForLater, BOARDLESS_STATES, Q_STATES, Q_NEEDS_FINDINGS, qState, R_PHASES, EVENTS, SIDECAR, readSidecar, glowMismatch, reconciliation, isNoChange, RECON_WORDS, signedOffParent, registry, headingSlugs, readBlock, findPlans, subIssueBoard, subIssuePlan,parentBoard, parentFolder, staleUnitRuns, otherBoards, issueRefs, treeRoot, boardFolders, boardLink, linkRule, opt, flag } = require("./lib.js");

const STATUS = ["planned", "building", "built", "abandoned"];
const STATES = ["pending", "in-progress", "partially-built", "as-planned", "amended", "deviated", "dropped", "deferred", "complete", "landed"];
const VERDICTS = ["accepted", "declined", "partial", "deferred"];
const GAP_KINDS = ["bug", "missing", "debt", "risk"];
const COLUMNS = ["gap", "considered", "verdict", "built"];
const STEPS = ["sizing", "interview", "research", "architecture", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed", "halted", "escalated", "cancelled"];
const QA = ["approved", "changes-requested", "running"];
const DATE = /^\d{4}-\d{2}-\d{2}$/, STAMP = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const ID = /^[a-z0-9][a-z0-9-]*$/, SHA = /^[0-9a-f]{7,40}$/;

const out = { fail: [], warn: [], ok: [] };
const fail = m => out.fail.push(m), warn = m => out.warn.push(m), ok = m => out.ok.push(m);
const str = v => typeof v === "string" && v.trim().length > 0;
const posInt = v => Number.isInteger(v) && v > 0;

/* Template leftovers: a value written <like this>, an <issue>/<slug>/<sha>/<YYYY-MM-DD> token, or a $comment key. */
function placeholders(v, at, found) {
  if (typeof v === "string") { if (/^<[^>]*>$/.test(v.trim()) || /<(issue|slug|YYYY-MM-DD|sha|owner\/name)[^>]*>/.test(v)) found.push(at); }
  else if (Array.isArray(v)) v.forEach((x, i) => placeholders(x, `${at}[${i}]`, found));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k === "$comment") found.push(`${at ? at + "." : ""}$comment`); else placeholders(v[k], at ? `${at}.${k}` : k, found); });
  return found;
}
/* No listings (RULES §7): a string over five lines, or a fenced block over five lines, is a code block too long for a board. */
function listings(v, at, found) {
  if (typeof v === "string") {
    const lines = v.split(/\r?\n/);
    if (lines.length > 5) found.push(`${at} (${lines.length} lines)`);
    else (v.match(/```[\s\S]*?```/g) || []).forEach(f => { if (f.split(/\r?\n/).length - 2 > 5) found.push(`${at} (fenced block)`); });
  } else if (Array.isArray(v)) v.forEach((x, i) => listings(x, `${at}[${i}]`, found));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => listings(v[k], at ? `${at}.${k}` : k, found));
  return found;
}

/* A relative link on the board: its file must exist, and its #anchor must be a heading of that Markdown file. */
function checkLink(dir, ref, at) {
  if (!str(ref) || /^https?:/.test(ref) || SHA.test(ref) || /^(PR )?#\d+$/i.test(ref) || /^[\w.-]+\/[\w.-]+#\d+$/.test(ref)) return;
  const m = ref.match(/^([\w./-]+\.(?:md|html|json|kt|kts|dsl|txt)|[\w./-]+\/)(#[\w-]+)?/); if (!m) return;
  const file = path.resolve(dir, m[1]);
  if (!fs.existsSync(file)) { warn(`${at}: links ${m[1]}, which does not exist from this folder`); return; }
  if (m[2] && /\.md$/.test(m[1]) && !headingSlugs(fs.readFileSync(file, "utf8")).has(m[2].slice(1))) warn(`${at}: ${m[1]} has no heading ${m[2]}`);
}

/* No work levels on a dashboard (GUIDANCE.md §4): every string the page renders is free of a work-level reference
   (system/scripts/levelrefs.js). The numeric fields that keep a level as data (level, unit.level, proposedLevel) are not text. */
function levelFail(data, file) {
  const hits = levelRefsIn(data, "", []);
  // a decision's defence written as its work level ("Level 3: one system, additive"), the architecture's usual form
  (data.rows || []).forEach((r, i) => { const d = (r && r.verdict || {}).defense; if (typeof d === "string" && /^\s*level [1-4]\b(?![a-c])\s*[:.]/i.test(d)) hits.push({ at: `rows[${i}].verdict.defense`, hit: d.slice(0, 9) }); });
  if (hits.length) fail(`${file} shows a work level, which a dashboard never does: ${hits.slice(0, 6).map(h => `${h.at} ("${h.hit}")`).join(", ")}${hits.length > 6 ? ` and ${hits.length - 6} more` : ""}; say what the work is instead (one system, a bug fix, docs only)`);
}

function checkPlan(plan, dir, root) {
  const folderName = path.basename(path.resolve(dir));
  if (plan.schema !== "plan-board/1") fail(`schema must be "plan-board/1" (got ${JSON.stringify(plan.schema)})`);
  if (!str(plan.repo) || !/^[^/\s<]+\/[^/\s>]+$/.test(plan.repo)) fail("repo must be owner/name");
  if (!posInt(plan.issue)) fail("issue must be a positive integer");
  if (!str(plan.slug)) fail("slug is required"); else if (plan.slug !== folderName) fail(`slug "${plan.slug}" must equal the folder name "${folderName}"`);
  if (posInt(plan.issue) && str(plan.slug) && !plan.slug.startsWith(plan.issue + "-")) fail(`slug must start with "${plan.issue}-"`);
  if (!str(plan.folder)) warn("folder is not set: the page assumes docs/plans/<slug> for its links to the shared pages");
  else if (root && plan.folder !== path.relative(root, path.resolve(dir)).replace(/\\/g, "/")) warn(`folder "${plan.folder}" is not this folder's path from the repository root; the page's links to the shared pages will be wrong`);
  ["title", "function"].forEach(k => { if (!str(plan[k])) fail(`${k} is required`); });
  if (!STATUS.includes(plan.status)) fail(`status must be one of ${STATUS.join(", ")}`);
  if (plan.kind != null && !["issue", "tracking"].includes(plan.kind)) fail(`kind must be issue or tracking (got ${JSON.stringify(plan.kind)})`);
  if (plan.level != null && ![1, 2, 3, 4].includes(plan.level)) fail(`level must be 1 to 4 or null (got ${JSON.stringify(plan.level)})`);
  const b = plan.baseline || {};
  if (!str(b.ref) || !str(b.sha) || !str(b.date)) fail("baseline needs ref, sha and date");
  if (str(b.sha) && !SHA.test(b.sha)) fail(`baseline.sha "${b.sha}" is not a commit sha`);
  if (str(b.date) && !DATE.test(b.date)) fail(`baseline.date "${b.date}" is not YYYY-MM-DD`);
  if (plan.status === "built") {
    const a = plan.asBuilt || {};
    if (!str(a.sha) || !str(a.date)) fail("a built plan needs asBuilt.sha and asBuilt.date");
    if (str(a.sha) && !SHA.test(a.sha)) fail(`asBuilt.sha "${a.sha}" is not a commit sha`);
    if (str(a.date) && !DATE.test(a.date)) fail(`asBuilt.date "${a.date}" is not YYYY-MM-DD`);
    if (a.merge && !SHA.test(String(a.merge))) fail(`asBuilt.merge "${a.merge}" is not a commit sha`);
  } else if (plan.status === "planned" && plan.asBuilt) fail("a planned plan has asBuilt: null");

  const systems = Array.isArray(plan.systems) ? plan.systems : [];
  systems.forEach((s, i) => { if (!str(s.slug) || !str(s.name)) fail(`systems[${i}] needs slug and name`); if (s.slot != null && !(Number.isInteger(s.slot) && s.slot >= 0 && s.slot <= 6)) fail(`systems[${i}].slot must be 0 to 6`); });
  // Colour groups, not rows (plan/RULES.md §8): a system's parts share their top-level system's slot.
  const groups = new Set(systems.map(s => s.top || s.name || s.slug));
  if (groups.size > 6) warn(`more than six colour groups on one board (${groups.size} top-level systems)`);
  const reg = root ? registry(root) : null;
  if (reg) systems.forEach((s, i) => { const r = reg.info(s.slug); if (!r) warn(`systems[${i}] "${s.slug}" is not in docs/dashboards/systems.json`); else if (r.slot !== (s.slot || 0)) warn(`systems[${i}] "${s.slug}" has slot ${s.slot}, the registry gives ${r.slot}: its colour would differ from the system pages'`); });

  const ms = plan.milestones || [];
  ms.forEach((m, i) => {
    if (!COLUMNS.includes(m.column)) fail(`milestones[${i}].column must be one of ${COLUMNS.join(", ")}`);
    if (!str(m.label)) fail(`milestones[${i}] needs a label`);
    if (m.date && !DATE.test(m.date)) fail(`milestones[${i}].date "${m.date}" is not YYYY-MM-DD`);
    checkLink(dir, m.ref, `milestones[${i}].ref`);
  });
  const has = c => ms.some(m => m.column === c);
  (plan.trail || []).forEach((t, i) => { if (t.date && !DATE.test(t.date)) fail(`trail[${i}].date "${t.date}" is not YYYY-MM-DD`); if (t.column && !COLUMNS.includes(t.column)) fail(`trail[${i}].column must be one of ${COLUMNS.join(", ")}`); checkLink(dir, t.ref, `trail[${i}].ref`); });

  const rows = Array.isArray(plan.rows) ? plan.rows : [];
  const tracking = plan.kind === "tracking";
  if (!rows.length && plan.status !== "planned") fail("rows is empty: a board past planning has at least one row");
  /* The columns are written in order (RULES §4): options are required once the Considered column is written, the verdict once
     the Verdict column is. A planned board between "researched" and "plan-accepted" may hold rows with a gap only. */
  const wantOptions = plan.status !== "planned" || has("considered") || has("verdict");
  const wantVerdict = plan.status !== "planned" || has("verdict");
  if (rows.length) ["gap", "considered", "verdict"].forEach(c => { if (!has(c) && (c === "gap" || (c === "considered" ? wantOptions : wantVerdict))) warn(`no "${c}" milestone: the column header carries no date`); });
  if (plan.status === "built" && !has("built")) warn('a built plan usually carries a "built" milestone (the merge or the release)');
  /* A sub-issue of a signed-off tracking plan is never born with empty columns (RULES §2, columns 1-2; §4, sized): its Gap and
     Considered columns, with their milestones, are filled at "sized" from the parent's research and architecture. */
  const sop = plan.kind !== "tracking" && plan.parent ? signedOffParent(dir, plan) : null;
  if (sop) {
    const miss = [!rows.length ? "no rows" : "", rows.length && !has("gap") ? 'no "gap" milestone' : "", rows.length && !has("considered") ? 'no "considered" milestone' : "",
      rows.length && rows.some(r => !Array.isArray(r.options) || !r.options.length) ? `rows without options (${rows.filter(r => !Array.isArray(r.options) || !r.options.length).map(r => r.id).slice(0, 4).join(", ")})` : ""].filter(Boolean);
    if (miss.length) warn(`this is a sub-issue of #${plan.parent.issue}, whose tracking plan is signed off: its Gap and Considered columns, with the "gap" and "considered" milestones, are filled at "sized" from the parent's research README and architecture (the unit's row in the decomposition, the alternatives weighed for it), but the board has ${miss.join(", ")}`);
    else ok(`sub-issue of the signed-off #${plan.parent.issue}: Gap and Considered filled from the parent's documents`);
  }
  const ids = new Set();
  const plans = root ? findPlans(root) : [];
  rows.forEach((r, i) => {
    const at = `rows[${i}]${r.id ? ` (${r.id})` : ""}`;
    if (!str(r.id) || !ID.test(r.id)) fail(`${at}: id must be kebab-case`); else if (ids.has(r.id)) fail(`${at}: duplicate id`); else ids.add(r.id);
    if (!str(r.name)) fail(`${at}: name is required`);
    if (!str(r.system)) fail(`${at}: system is required`); else if (systems.length && !systems.some(s => s.slug === r.system)) warn(`${at}: system "${r.system}" is not in plan.systems; it falls to the neutral colour`);
    const g = r.gap || {};
    if (!str(g.summary)) fail(`${at}: gap.summary is required (the hole, never the fix)`);
    if (g.kind && !GAP_KINDS.includes(g.kind)) fail(`${at}: gap.kind must be one of ${GAP_KINDS.join(", ")}`);
    if (!Array.isArray(g.evidence) || !g.evidence.length) warn(`${at}: gap.evidence is empty; cite path:line at the baseline`);
    checkLink(dir, g.link, `${at}.gap.link`); checkLink(dir, g.source, `${at}.gap.source`);
    const opts = Array.isArray(r.options) ? r.options : [];
    if (!opts.length && wantOptions) fail(`${at}: options is empty; record every option weighed, the one taken included`);
    const oids = new Set(); let chosen = 0;
    opts.forEach((o, j) => {
      const oat = `${at}.options[${j}]`;
      if (!str(o.id) || !ID.test(o.id)) fail(`${oat}: id must be kebab-case`); else if (oids.has(o.id)) fail(`${oat}: duplicate option id`); else oids.add(o.id);
      if (!str(o.name)) fail(`${oat}: name is required`);
      if (!VERDICTS.includes(o.verdict)) fail(`${oat}: verdict must be one of ${VERDICTS.join(", ")}`);
      if (o.verdict === "accepted" || (o.verdict === "partial" && o.chosen === true)) chosen++;
      if (["declined", "partial", "deferred"].includes(o.verdict) && !str(o.why)) fail(`${oat}: a ${o.verdict} option needs "why"`);
      checkLink(dir, o.link, `${oat}.link`);
    });
    if (opts.length && chosen !== 1) fail(`${at}: exactly one option must be accepted, or partial with "chosen": true (found ${chosen}); for a part left alone, the accepted option is the one that leaves it`);
    const v = r.verdict || {};
    if (!str(v.summary) && wantVerdict) fail(`${at}: verdict.summary is required`);
    if (v.kind && !["build", "leave"].includes(v.kind)) fail(`${at}: verdict.kind must be build or leave`);
    (v.steps || []).forEach((s, j) => { if (!str(s.what)) fail(`${at}.verdict.steps[${j}]: "what" is required`); checkLink(dir, s.link, `${at}.verdict.steps[${j}].link`); });
    // A unit row's steps are its sub-issue's plan, not the tracking board's: no warning there.
    if (str(v.summary) && (v.kind || "build") === "build" && !(v.steps || []).length && !r.unit) warn(`${at}: a build verdict names no steps`);
    checkLink(dir, v.link, `${at}.verdict.link`);
    const bld = r.asBuilt || {}, st = bld.state;
    if (!STATES.includes(st)) fail(`${at}: asBuilt.state must be one of ${STATES.join(", ")}`);
    // complete and landed are a tracking board's unit-row states (RULES §2); an issue board's rows keep as-planned, amended, deviated.
    if (["complete", "landed"].includes(st) && !r.unit) fail(`${at}: "${st}" is a unit-row state on a tracking board; an issue board's row is as-planned, amended or deviated`);
    if (plan.status === "planned" && st !== "pending" && !BUILDING_STATES.includes(st)) fail(`${at}: a planned plan has every part pending, or being built (found ${st})`);
    if (plan.status === "built" && (st === "pending" || BUILDING_STATES.includes(st))) fail(`${at}: a built plan has no ${st === "pending" ? "pending" : st} part`);
    /* before the outcome (RULES §2): in progress while a current stage works on the row, partially built while a later stage is still to
       come; a unit lands whole, so it is never partially built */
    if (st === "partially-built" && r.unit) fail(`${at}: a unit lands whole, in one merge: it is never partially built (its own board's rows say what is built)`);
    if (st === "partially-built" && !str(bld.summary)) fail(`${at}: a partially built part says in asBuilt.summary what is built and what is left`);
    { const want = stagedState(plan, r), shown = want || st;
      if (BUILDING_STATES.includes(st) && !want && !["built", "abandoned"].includes(plan.status)) warn(`${at}: asBuilt.state is "${st}", but ${r.unit ? "the unit is not in wip.current" : "no stage of wip.stages that touches the row is current or still to come"}: once its last stage is done its outcome applies (as-planned, amended or deviated)`);
      else if (want && st !== "pending" && want !== st) warn(`${at}: asBuilt.state is "${st}", but ${r.unit ? "the unit's run is under way (it is in wip.current)" : "wip.stages make it"} "${want}"${["as-planned", "amended", "deviated"].includes(st) ? ": its outcome applies once its last stage is done" : ""}; the page shows "${shown}"`);
      if (shown === "partially-built" && st !== "partially-built" && !str(bld.summary)) warn(`${at} is partially built (wip.stages: a done stage touched it, a later one is still to come), but asBuilt.summary is empty: say what is built and what is left`); }
    if (["amended", "deviated"].includes(st) && (!Array.isArray(bld.changes) || !bld.changes.length)) fail(`${at}: an ${st} part lists its changes`);
    (bld.changes || []).forEach((c, j) => {
      const cat = `${at}.asBuilt.changes[${j}]`;
      if (!str(c.what) || !str(c.why)) fail(`${cat}: "what" and "why" are required`);
      if (c.settles) {
        const sid = typeof c.settles === "string" ? c.settles : c.settles.option, sv = typeof c.settles === "object" ? (c.settles.verdict || "accepted") : "accepted";
        const o = opts.find(x => x.id === sid);
        if (!o) fail(`${cat}.settles names no option "${sid}"`); else if (o.verdict !== "deferred") fail(`${cat}.settles "${sid}", which was not deferred`);
        if (!["accepted", "declined", "partial"].includes(sv)) fail(`${cat}.settles.verdict must be accepted, declined or partial`);
      }
      if (c.ref && /^[0-9a-f]+$/.test(c.ref) && !SHA.test(c.ref)) fail(`${cat}.ref "${c.ref}" is not a commit sha`);
    });
    if (st === "dropped" && !str(bld.summary)) fail(`${at}: a dropped part states why in asBuilt.summary`);
    if (st === "deferred" && !posInt(bld.issue)) fail(`${at}: a deferred part names the issue it moved to (asBuilt.issue)`);
    if (st && st !== "pending" && st !== "in-progress" && !str(bld.summary)) fail(`${at}: a ${st} part describes what exists in asBuilt.summary`);
    (bld.commits || []).forEach((c, j) => { if (!SHA.test(String(c))) fail(`${at}.asBuilt.commits[${j}] "${c}" is not a commit sha`); });
    checkLink(dir, bld.link, `${at}.asBuilt.link`);
    if (r.unit) {
      const u = r.unit;
      if (!tracking) warn(`${at}: a unit row on a board whose kind is not tracking`);
      if (!posInt(u.issue)) fail(`${at}.unit.issue must be the sub-issue's number`);
      (u.blockedBy || []).forEach((n, j) => { if (!posInt(n)) fail(`${at}.unit.blockedBy[${j}] must be an issue number`); });
      // The sub-issue's board (RULES §1): when its file exists in this tree the row links it, relative to this folder; a link to
      // a board that does not exist is dead. embed.js sets both from the folders on disk.
      const hit = subIssueBoard(dir, u);
      if (hit && u.board !== hit.board) fail(`${at}: #${u.issue} has a board (${hit.board}) that this unit row does not link (unit.board is ${u.board ? JSON.stringify(u.board) : "unset"}): run embed.js, which links it`);
      if (!hit && u.board) fail(`${at}: unit.board ${JSON.stringify(u.board)} names no board in this tree, a dead link: run embed.js, which clears it`);
      if (!hit && posInt(u.issue)) {
        const away = plans.filter(p => path.basename(p.dir).startsWith(u.issue + "-") && fs.existsSync(path.join(p.dir, "dashboard.html")));
        if (away.length) warn(`${at}: #${u.issue}'s board is at ${away[0].folder}/dashboard.html, outside this tracking board's folder: the board keeps linking the GitHub issue until the sub-issue's folder sits inside this one`);
      }
      if (str(u.folder)) checkLink(dir, u.folder, `${at}.unit.folder`);
      // The unit's run, mirrored from its own board by embed.js (RULES §3); its freshness is the warning further down.
      if (u.live != null) {
        const L = u.live;
        if (typeof L !== "object" || Array.isArray(L)) fail(`${at}.unit.live must be the mirror of the sub-issue board's run (embed.js writes it)`);
        else {
          if (!STEPS.includes(L.step)) fail(`${at}.unit.live.step must be one of ${STEPS.join(", ")} (got ${JSON.stringify(L.step)})`);
          ["since", "updated"].forEach(k => { if (L[k] != null && !STAMP.test(String(L[k]))) fail(`${at}.unit.live.${k} "${L[k]}" is not a date or an ISO date-time`); });
          if (L.resume != null && !STEPS.includes(L.resume)) fail(`${at}.unit.live.resume "${L.resume}" is not a step`);
        }
      }
    }
  });

  /* The parent's board and the other issues' boards (RULES §1): a link names a board that exists in this tree, or it is dead;
     embed.js sets and clears both from the folders on disk. A missing link where a board exists is the warning below. */
  const p = plan.parent;
  if (p && p.issue != null && !posInt(p.issue)) fail("parent.issue must be the tracking issue's number");
  if (p && posInt(p.issue)) {
    const hit = parentBoard(dir, p);
    if (p.board && !hit) fail(`parent.board ${JSON.stringify(p.board)} names no board of #${p.issue} in this tree (the enclosing folder is not #${p.issue}'s, or holds no dashboard.html), a dead link: run embed.js, which clears it`);
    else if (p.board && hit && p.board !== hit.board) fail(`parent.board ${JSON.stringify(p.board)} is not #${p.issue}'s board (${hit.board}): run embed.js, which links it`);
    if (!hit) {
      const away = plans.filter(x => path.basename(x.dir).startsWith(p.issue + "-") && path.resolve(x.dir) !== path.resolve(dir) && fs.existsSync(path.join(x.dir, "dashboard.html")));
      if (away.length) warn(`the parent #${p.issue}'s board is at ${away[0].folder}/dashboard.html, but this board's folder is not inside it: the "part of" chip keeps linking the GitHub issue until this folder sits inside #${p.issue}'s`);
    }
  }
  if (plan.issueBoards != null) {
    if (typeof plan.issueBoards !== "object" || Array.isArray(plan.issueBoards)) fail('issueBoards must be an object { "<issue>": "<path to its dashboard.html>" } (embed.js writes it)');
    else {
      const want = otherBoards(plan, dir);
      Object.keys(plan.issueBoards).forEach(n => {
        const b = plan.issueBoards[n];
        if (!/^\d+$/.test(n)) fail(`issueBoards key "${n}" is not an issue number`);
        else if (!str(b) || !fs.existsSync(path.resolve(dir, b))) fail(`issueBoards["${n}"] ${JSON.stringify(b)} names no board in this tree, a dead link: run embed.js, which clears it`);
        else if (want[n] !== b) warn(`issueBoards["${n}"] is ${JSON.stringify(b)}, but embed.js would write ${want[n] ? JSON.stringify(want[n]) : "nothing (#" + n + " is not named on this board, or is its parent or a unit)"}: run embed.js`);
      });
    }
  }

  const w = plan.wip;
  if (!w || typeof w !== "object") warn("wip is missing: the WIP strip has nothing to show");
  else {
    if (!STEPS.includes(w.step)) fail(`wip.step must be one of ${STEPS.join(", ")} (got ${JSON.stringify(w.step)})`);
    (w.steps || []).forEach((s, j) => { if (!STEPS.includes(s)) fail(`wip.steps[${j}] "${s}" is not a step`); });
    ["since", "updated"].forEach(k => { if (w[k] != null && !STAMP.test(String(w[k]))) fail(`wip.${k} "${w[k]}" is not a date or an ISO date-time`); });
    if (w.step === "halted") {
      if (!str(w.waitingOn) && !str(w.detail)) fail("a halted board says what waits on the user (wip.waitingOn)");
      const since = Date.parse(w.since || w.updated || "");
      if (since && Date.now() - since > 86400000) warn(`halted since ${w.since || w.updated}: more than a day`);
    }
    if (w.resume != null && !STEPS.includes(w.resume)) fail(`wip.resume "${w.resume}" is not a step`);
    (w.qa || []).forEach((p, j) => { if (!posInt(p.pass)) fail(`wip.qa[${j}].pass must be a pass number`); if (!QA.includes(p.verdict)) fail(`wip.qa[${j}].verdict must be one of ${QA.join(", ")}`); if (p.date && !DATE.test(p.date)) fail(`wip.qa[${j}].date "${p.date}" is not YYYY-MM-DD`);
      /* finding counts: by kind (findings: documentation, test, code) and, where the qa report states it, by severity (severity: {"<word>": n}) */
      if (p.route != null && !ROUTES.includes(p.route)) fail(`wip.qa[${j}].route must be one of ${ROUTES.join(", ")} (got ${JSON.stringify(p.route)})`);
      else if (p.route != null && p.verdict !== "changes-requested") warn(`wip.qa[${j}] (pass ${p.pass}) records a route (${p.route}) but its verdict is ${p.verdict}: a route answers requested changes`);
      ["findings", "severity"].forEach(k => { const f = p[k]; if (f == null) return; if (typeof f !== "object" || Array.isArray(f) || Object.entries(f).some(([n, c]) => !/^[a-z][a-z-]*$/.test(n) || !(Number.isInteger(c) && c >= 0))) fail(`wip.qa[${j}].${k} must map a lower-case word to a count, e.g. {"major": 2, "minor": 3} (got ${JSON.stringify(f)})`); }); });
    const cur = Array.isArray(w.current) ? w.current : [];
    cur.forEach(a => {
      const parts = String(a).split(".");
      if (parts.length === 1) { if (!COLUMNS.includes(parts[0])) fail(`wip.current "${a}" is neither a column nor a <row-id>.<column> address`); }
      else if (parts.length !== 2 || !ids.has(parts[0]) || !COLUMNS.includes(parts[1])) fail(`wip.current "${a}" names no cell`);
    });
    // The standing rule (RULES §3): a unit that has landed leaves wip.current in the same landing refresh.
    cur.forEach(a => { const r = rows.find(x => x.id === String(a).split(".")[0]); if (r && r.unit && (r.asBuilt || {}).state === "landed") fail(`wip.current "${a}" names a landed unit; the landing refresh removes it from wip.current`); });
    /* no count limit (plan/RULES.md §3): the glow names exactly the cells being worked on, however many; the step-to-column map below
       is the only check on what glows */
    if ((w.step === "landed" || plan.status === "built") && cur.length) warn("a landed board has wip.current set; nothing glows once it has landed");
    if (w.step === "landed" && plan.status !== "built") fail('wip.step is "landed" but status is not "built"');
    /* The glow follows the step (RULES §3, the step-to-column map; lib.js GLOW_MAP): wip.current holds what wip.step's row of the
       map gives it, a halted or escalated board what the step it stopped in gives (wip.resume), held still as a ring. */
    const gm = glowMismatch(plan);
    /* The research questions (RULES §3, "Research: the rows being researched"; §4, research-started and research-returned): each
       { question, rows, findings }, findings null while it is open; researched clears them, and the trail keeps each findings file. */
    if (w.questions != null) {
      if (!Array.isArray(w.questions)) fail('wip.questions must be an array of research questions, each { "question": "<slug>", "rows": ["<row-id>", …], "findings": null | "<path>" }');
      else {
        const seen = new Set();
        w.questions.forEach((q, j) => {
          const qat = `wip.questions[${j}]`;
          if (!q || typeof q !== "object" || Array.isArray(q)) { fail(`${qat} must be an object { question, rows, findings }`); return; }
          if (!str(q.question) || !ID.test(q.question)) fail(`${qat}.question must be the research question's kebab-case slug`);
          else if (seen.has(q.question)) fail(`${qat}: a second entry for question "${q.question}"`); else seen.add(q.question);
          if (!Array.isArray(q.rows) || q.rows.some(x => !str(x))) fail(`${qat}.rows must be an array of row ids (empty when the question names no row)`);
          else q.rows.filter(x => !ids.has(x)).forEach(x => warn(`${qat} ("${q.question}") names "${x}", which is not a row of this board: while none of its rows is, the question glows the whole Considered column`));
          if (q.findings != null && !str(q.findings)) fail(`${qat}.findings is the path of the question's findings once it has returned, or null while it is open`);
          else if (str(q.findings)) { checkLink(dir, q.findings, `${qat}.findings`); if (!(plan.trail || []).some(t => t && t.ref === q.findings)) warn(`${qat} ("${q.question}") has returned (${q.findings}), but the trail records no entry with that ref: research-returned records the findings in the trail`); }
          ["started", "returned"].forEach(k => { if (q[k] != null && !STAMP.test(String(q[k]))) fail(`${qat}.${k} "${q[k]}" is not a date or an ISO date-time`); });
          /* the question's state (RULES §3, "Research: the questions and their states"): one of Q_STATES, and its findings recorded
             exactly when it has returned; a question with no state reads from its findings (written before the states) */
          if (q.state == null) warn(`${qat} ("${q.question}") records no state: it reads "${qState(q)}" from its findings; the research events write it (${Q_STATES.join(", ")})`);
          else if (!Q_STATES.includes(q.state)) fail(`${qat}.state must be one of ${Q_STATES.join(", ")} (got ${JSON.stringify(q.state)})`);
          else if (Q_NEEDS_FINDINGS.includes(q.state) && !str(q.findings)) fail(`${qat} ("${q.question}") is "${q.state}" but records no findings: a question has returned, its findings path recorded, before it is ${q.state}`);
          else if (!Q_NEEDS_FINDINGS.includes(q.state) && q.findings != null) fail(`${qat} ("${q.question}") is "${q.state}" but records findings (${q.findings}): research-returned sets it "returned"`);
        });
        const rs = ["halted", "escalated"].includes(w.step) ? w.resume : w.step, qsAll = w.questions.filter(q => q && typeof q === "object");
        /* the questions stay, complete, until the plan is accepted (on a tracking board, the architecture signed off), so the rows keep
           their green ring; at research a question is anything but complete; past the plan they are cleared */
        const keeps = tracking ? ["research", "architecture"] : ["research", "architecture", "plan"];
        if (qsAll.length && !["built", "abandoned"].includes(plan.status) && rs) {
          if (!keeps.includes(rs)) warn(`wip.questions records ${qsAll.length} research question${qsAll.length === 1 ? "" : "s"} while the run is at "${rs}": ${tracking ? "architecture-signed-off" : "plan-accepted"} clears them (the trail keeps each question's findings)`);
          else if (rs !== "research" && qsAll.some(q => qState(q) !== "complete")) warn(`wip.questions at "${rs}" holds questions that are not complete (${qsAll.filter(q => qState(q) !== "complete").map(q => q.question).slice(0, 4).join(", ")}): researched sets every question complete`);
          else if (rs === "research" && qsAll.every(q => qState(q) === "complete")) warn("every research question is complete while the run is still at research: researched moves the step on");
        }
      }
    }
    /* The step panel's facts (RULES §3, "The step panel"): each optional, each written from an event's facts or the folder's documents. */
    checkPanel(plan, w, ids, tracking, dir);
    if (gm) warn(`wip.current ${JSON.stringify(cur)} does not match wip.step "${w.step}"${gm.via ? ` (it stopped in "${gm.step}", wip.resume, and keeps that step's glow as a still ring)` : ""}: at "${gm.step}" the map glows ${gm.want}; off the map: ${gm.bad.join(", ")} (plan/RULES.md §3, the glow follows the step)`);
    else if (!["built", "abandoned"].includes(plan.status) && w.step !== "landed" && !(["halted", "escalated"].includes(w.step) && !w.resume)) ok(`wip.current keeps the step-to-column map at "${w.step}"${["halted", "escalated"].includes(w.step) ? ` (the glow of "${w.resume}", the step it stopped in, held still)` : ""}`);
    /* wip.next (RULES §3): on a tracking board, always the next unit in landing order — the first unit row, in row order, that is
       pending, not in wip.current and not left for later (lib.js nextUnit()) — or null when none is left. It is never also current,
       never a unit already done and never one whose verdict leaves it as is. A board written before wip.next existed (no key at all)
       only warns. */
    if (!tracking && w.next != null) fail(`wip.next "${w.next}" is set on a board whose kind is not tracking; only a tracking board names a next unit`);
    if (tracking) {
      const units = rows.filter(r => r.unit), inCur = r => cur.some(a => String(a).split(".")[0] === r.id);
      const want = nextUnit(plan);
      if (w.next != null) {
        const nx = units.find(r => r.id === w.next);
        if (typeof w.next !== "string" || !nx) fail(`wip.next ${JSON.stringify(w.next)} names no unit row (it takes a unit row's id)`);
        else {
          const st = (nx.asBuilt || {}).state;
          if (st !== "pending") fail(`wip.next "${w.next}" names a unit whose state is ${st}; the next unit has not started`);
          if (inCur(nx)) fail(`wip.next "${w.next}" is also in wip.current; when its run starts it moves to wip.current and the following unit becomes next`);
          if (st === "pending" && leftForLater(nx)) fail(`wip.next "${w.next}" names a unit left for later (its verdict leaves it as is): the next unit skips it`);
        }
      }
      if (!("next" in w)) { if (want) warn(`wip.next is not recorded; the next unit in landing order is "${want.id}" (#${want.unit.issue})`); }
      else if ((w.next || null) !== (want ? want.id : null)) fail(want
        ? `wip.next is ${JSON.stringify(w.next)}, but the next unit in landing order is "${want.id}" (#${want.unit.issue}): the first pending unit not in wip.current and not left for later`
        : `wip.next is "${w.next}", but no unit is left that is pending, not in wip.current and not left for later: it is null`);
    }
    if (plan.status === "built" && w.step !== "landed") fail('a built plan has wip.step "landed"');
    /* A tracking board's wip.step is the tracking issue's own phase (RULES §3): "implementation" while its units run, never a
       unit's step, which its unit line shows from the mirror. */
    if (tracking && ["plan", "branch", "qa", "remediation"].includes(w.step)) warn(`wip.step "${w.step}" is a unit's step; a tracking board's wip.step is its own phase ("implementation" while its units run), and each unit in progress shows its own step from its mirror (unit.live)`);
    ["waitsOn", "blocks"].forEach(k => ((w.blockers || {})[k] || []).forEach((x, j) => { if (!posInt(x.issue)) fail(`wip.blockers.${k}[${j}].issue must be an issue number`); }));
  }
  /* The units' runs (RULES §3): each unit in progress mirrors its sub-issue board's run; a mirror that lags that board is a warning,
     fixed by re-embedding (embed.js on the tracking board, or on the sub-issue's board, which re-embeds its parent). */
  if (tracking) staleUnitRuns(plan, dir).forEach(x => {
    const at = `rows(${x.row.id}).unit.live (#${x.unit.issue})`, fix = "run embed.js on this folder, or on the sub-issue's, which re-embeds this one";
    if (x.kind === "older") warn(`${at} mirrors its board's run as of ${x.have.updated}, older than the board's wip.updated ${x.want.updated} (now step ${x.want.step}): ${fix}`);
    else if (x.kind === "missing") warn(`${at}: the unit is in progress and its board exists, but this board does not mirror its run (now step ${x.want.step}, updated ${x.want.updated}): ${fix}`);
    else if (x.kind === "differs") warn(`${at} differs from its board's run (step ${x.want.step}, updated ${x.want.updated}) although it is not older: the board changed without a new wip.updated; ${fix}`);
    else warn(`${at}: a mirror embed.js would clear (${x.inCur ? "no board of the unit in this tree, or this board is not live" : "the unit is not in progress"}): run embed.js on this folder`);
  });
  /* On a sub-issue's board: its parent's tracking board, in the enclosing folder, mirrors this run; it lags until re-embedded. */
  if (!tracking && posInt(plan.issue)) {
    const up = parentFolder(dir, plan);
    if (up) { let tp = null; try { tp = JSON.parse(fs.readFileSync(path.join(up, "plan.json"), "utf8")); } catch (e) { /* the parent's own check reports it */ }
      if (tp) staleUnitRuns(tp, up).filter(x => x.unit.issue === plan.issue && x.kind !== "orphan").forEach(x => warn(`the parent #${tp.issue}'s tracking board mirrors this run ${x.kind === "missing" ? "not at all" : x.kind === "older" ? `as of ${x.have.updated}, older than this board's ${x.want.updated}` : "with other content"}: run embed.js on this folder, which re-embeds it`)); }
  }
  checkImpact(plan, dir, systems, rows, tracking);
  (plan.followUps || []).forEach((f, i) => { if (!posInt(f.issue) && !str(f.name)) fail(`followUps[${i}] needs an issue number or, for an unfiled follow-up, a name`); });
  (plan.documents || []).forEach((d, i) => { if (!str(d.label) && !str(d.path)) fail(`documents[${i}] needs a label or a path`); checkLink(dir, d.path, `documents[${i}].path`); });

  const left = placeholders(plan, "", []);
  if (left.length) fail(`placeholders left from the template: ${left.slice(0, 8).join(", ")}${left.length > 8 ? ` and ${left.length - 8} more` : ""}`);
  levelFail(plan, "plan.json");
  const lists = listings(plan, "", []);
  if (lists.length) fail(`code blocks over five lines in the data (the detail belongs in the Markdown, linked): ${lists.slice(0, 6).join(", ")}`);
  if (!out.fail.length) ok(`plan.json: ${tracking ? "tracking board, " : ""}${rows.length} rows, ${rows.reduce((n, r) => n + (r.options || []).length, 0)} options, status ${plan.status}, step ${(w || {}).step || "—"}`);
}

/* The step panel's facts (RULES §3, "The step panel"; §4): the last event (wip.event), the interview's questions, the research phase,
   the plan's pass, the implementation stages and the remediation's sub-steps. Each is optional; a value written is held to its form. */
const STAGE_STATES = ["done", "current", "todo"], PLAN_PASSES = ["writing", "re-pass"], REPASS_FROM = ["parent", "qa", "existing"];
/* the route /resolve-issue step 5 takes from a qa pass's findings (wip.qa[].route, wip.remediation.route): minor fixes on the spot with
   no new qa pass, a rookie-dev remediation pass, or a planner re-pass then rookie-dev */
const ROUTES = ["on-the-spot", "rookie-dev", "planner-then-rookie-dev"];
function checkPanel(plan, w, ids, tracking, dir) {
  const stampOk = (v, at) => { if (v != null && !STAMP.test(String(v))) fail(`${at} "${v}" is not a date or an ISO date-time`); };
  const ev = w.event;
  if (ev != null) { if (typeof ev !== "object" || Array.isArray(ev) || !EVENTS.includes(ev.name)) fail(`wip.event must be { name, at, note }, name one of ${EVENTS.join(", ")} (got ${JSON.stringify(ev)})`); else stampOk(ev.at, "wip.event.at"); }
  if (w.interview != null) {
    if (!Array.isArray(w.interview)) fail("wip.interview must be an array of the interview's questions, each { \"text\": \"…\", \"answer\": null | \"…\" }");
    else w.interview.forEach((q, j) => { const at = `wip.interview[${j}]`;
      if (!q || typeof q !== "object" || !str(q.text)) fail(`${at} needs its text (the question asked)`);
      else { if (q.answer != null && !str(q.answer)) fail(`${at}.answer is the answer's gist, or null while the question waits`); stampOk(q.asked, at + ".asked"); stampOk(q.answered, at + ".answered");
        /* the options the question offers, from the halted event's facts.questions, each a short statement */
        if (q.options != null && (!Array.isArray(q.options) || q.options.some(o => !str(o)))) fail(`${at}.options must be an array of the options the question offers, each a non-empty string (got ${JSON.stringify(q.options)})`); } });
  }
  const R = w.research;
  if (R != null) {
    if (typeof R !== "object" || Array.isArray(R) || !R_PHASES.includes(R.phase)) fail(`wip.research must be { phase, drafted, since }, phase one of ${R_PHASES.join(", ")} (got ${JSON.stringify(R)})`);
    else {
      if (R.drafted != null && !(Number.isInteger(R.drafted) && R.drafted >= 0)) fail(`wip.research.drafted is the number of questions drafted so far (got ${JSON.stringify(R.drafted)})`);
      if (R.since != null) { if (typeof R.since !== "object" || Array.isArray(R.since)) fail("wip.research.since maps each phase to the time it began"); else Object.entries(R.since).forEach(([k, v]) => { if (!R_PHASES.includes(k)) fail(`wip.research.since names "${k}", which is not a research phase`); stampOk(v, "wip.research.since." + k); }); }
      const qs = (Array.isArray(w.questions) ? w.questions : []).filter(q => q && typeof q === "object"), st = qs.map(qState);
      if (R.phase === "planning" && st.some(x => x !== "planning")) warn(`wip.research is at "planning", but a question is ${st.find(x => x !== "planning")}: research-started moves the phase to "research"`);
      if (R.phase === "verification" && !st.includes("verifying") && !st.includes("researching")) warn("wip.research is at \"verification\", but no question is verifying: verification-started sets the returned questions \"verifying\"");
      if (R.phase === "complete" && st.some(x => x !== "complete")) warn("wip.research is \"complete\", but a question is not: researched sets every question complete");
      if (["research", "verification"].includes(R.phase) && !qs.length) warn(`wip.research is at "${R.phase}", but no question is recorded: research-started records them`);
    }
  }
  if (w.plan != null) {
    const P = w.plan;
    if (typeof P !== "object" || Array.isArray(P) || !PLAN_PASSES.includes(P.state)) fail(`wip.plan must be { state, from, pass }, state one of ${PLAN_PASSES.join(", ")} (got ${JSON.stringify(P)})`);
    else { if (P.state === "re-pass" && !REPASS_FROM.includes(P.from)) fail(`a re-pass names where it comes from: wip.plan.from is ${REPASS_FROM.join(", ")} (the parent's plan, a qa pass, or an existing plan verified against the base)`);
      if (P.against != null && (!str(P.against) || P.from !== "existing")) fail(`wip.plan.against names the ref an existing plan is verified against (a re-pass from "existing"), e.g. "main" (got ${JSON.stringify(P.against)} on a ${P.state}${P.from ? " from " + P.from : ""})`);
      if (P.from === "qa" && !posInt(P.pass)) fail("a re-pass after qa names the qa pass it answers: wip.plan.pass"); stampOk(P.since, "wip.plan.since"); }
  }
  if (w.stages != null) {
    if (!Array.isArray(w.stages)) fail("wip.stages must be an array of the implementation stages, each { id, name, state, rows }");
    else { w.stages.forEach((x, j) => { const at = `wip.stages[${j}]`;
        if (!x || typeof x !== "object") { fail(`${at} must be an object`); return; }
        if (!str(x.id) && !str(x.name)) fail(`${at} needs its id or name (the stage of plan.md)`);
        if (!STAGE_STATES.includes(x.state)) fail(`${at}.state must be one of ${STAGE_STATES.join(", ")}`);
        (Array.isArray(x.rows) ? x.rows : []).forEach(r => { if (!ids.has(r)) warn(`${at} names row "${r}", which is not a row of this board`); }); });
      if (w.stages.filter(x => x && x.state === "current").length > 1) fail("wip.stages has more than one \"current\" stage"); }
  }
  /* wip.open (RULES §3): the open points raised during the run, each { text, raised, ref, resolved }: shown in the step panel until
     resolved, then kept in the trail */
  if (w.open != null) {
    if (!Array.isArray(w.open)) fail('wip.open must be an array of open points, each { "text": "…", "raised": "<event or stage>", "ref": "<link>", "resolved": "<how>" }');
    else w.open.forEach((x, j) => { const at = `wip.open[${j}]`;
      if (!x || typeof x !== "object" || Array.isArray(x) || !str(x.text)) { fail(`${at} needs its text (the open point)`); return; }
      if (!str(x.raised)) fail(`${at}.raised names the event or stage that raised it (e.g. "implementation-stage S2")`);
      if (x.ref != null) { if (!str(x.ref)) fail(`${at}.ref is a link to where the point is recorded, or left out`); else checkLink(dir, x.ref, `${at}.ref`); }
      if (x.resolved != null && x.resolved !== true && !str(x.resolved)) fail(`${at}.resolved is how it was resolved (a sentence, or true), or left out while it is open`);
      if (x.resolved && !(plan.trail || []).some(t => t && typeof t.label === "string" && (t.label.includes(x.text.slice(0, 40)) || (x.ref && t.ref === x.ref)))) warn(`${at} is resolved, but the trail records no entry for it (a label quoting its text, or its ref): the trail keeps a resolved open point`); });
  }
  if (w.remediation != null) {
    const M = w.remediation;
    if (typeof M !== "object" || Array.isArray(M)) fail("wip.remediation must be { pass, steps: [{ what, state }] }");
    else { if (M.pass != null && !posInt(M.pass)) fail("wip.remediation.pass is the qa pass whose findings it answers");
      if (M.route != null && !ROUTES.includes(M.route)) fail(`wip.remediation.route must be one of ${ROUTES.join(", ")} (got ${JSON.stringify(M.route)})`);
      const v = M.steps == null ? [] : Array.isArray(M.steps) ? M.steps : (fail("wip.remediation.steps must be an array"), []);
      v.forEach((x, j) => { const at = `wip.remediation.steps[${j}]`; if (!x || typeof x !== "object" || !(str(x.what) || str(x.name))) fail(`${at} needs "name" (or "what")`); else if (!STAGE_STATES.includes(x.state)) fail(`${at}.state must be one of ${STAGE_STATES.join(", ")}`); });
      if (v.filter(x => x && x.state === "current").length > 1) fail("wip.remediation.steps has more than one \"current\" step"); }
  }
  if (tracking && ((Array.isArray(w.stages) && w.stages.length) || w.remediation || w.plan)) warn("a tracking board records implementation stages, a plan pass or a remediation: those are its units' runs, each on its own board, not the tracking issue's");
}

/* The Impact tab's data (RULES §2, Impact; §8). impact is null until plan acceptance, then an object with basis "plan" (the plan's
   impact, from impact.md, partly reconciled while its changes[] accumulate as the work lands: an implementation stage's deviation,
   on a tracking board each unit's landing) and, from the landing on (a tracking board's last unit's), "as-built" (reconciled, each
   difference from the plan in changes[]). The
   vocabularies are checked; a built board's impact is the as-built one and a planned board's the plan's. Warnings: impact.md in
   the folder while the tab is empty; a release that does not fit the level (a level-3 bump needs a downstream effect, and a
   level-3 change with none says so); a breaking effect or a removed surface without a major release; on a tracking board, a unit
   whose own board records its impact while this board has no entry for it, or an entry still the plan's once the unit landed. */
const IMP_BASES = ["plan", "as-built"], IMP_BUMPS = ["none", "fix", "feat", "major"], IMP_KINDS = ["consumer", "system", "repository", "artifact", "operator"];
const IMP_EFFECTS = ["none", "additive", "behaviour", "breaking"], IMP_NEEDS = ["none", "optional", "required"], IMP_CHANGES = ["added", "changed", "deprecated", "removed"];
const IMP_TIERS = ["stable-core", "supported-extension", "experimental", "internal"];
const IMP_LISTS = ["downstream", "adaptation", "api", "conversion"];
/* Compatibility (GUIDANCE.md §1, the Impact tab's exception): an entry's colour is derived from it (a breaking effect or a removed
   surface is breaking; a behaviour change, a deprecated or changed surface and a required adaptation are worth noting) and may be
   raised, never lowered, by "compat". The template's compatOf() is the same rule. */
const IMP_COMPAT = ["compatible", "notable", "breaking"];
const compatFloor = (k, x) => k === "downstream" ? (x.effect === "breaking" ? "breaking" : x.effect === "behaviour" ? "notable" : "compatible")
  : k === "api" ? (x.change === "removed" ? "breaking" : ["deprecated", "changed"].includes(x.change) ? "notable" : "compatible")
  : k === "adaptation" ? (x.need === "required" ? "notable" : "compatible") : "compatible";
function compatCheck(k, x, at) {
  const f = compatFloor(k, x);
  if (x.compat == null) return f;
  if (!IMP_COMPAT.includes(x.compat)) { fail(`${at}.compat must be one of ${IMP_COMPAT.join(", ")} (got ${JSON.stringify(x.compat)})`); return f; }
  if (IMP_COMPAT.indexOf(x.compat) < IMP_COMPAT.indexOf(f)) fail(`${at}.compat "${x.compat}" lowers an entry that is ${f === "breaking" ? "breaking" : "worth noting"} by its ${k === "downstream" ? "effect" : k === "api" ? "change" : "need"}: compat may raise an entry's colour, never lower it`);
  return IMP_COMPAT.indexOf(x.compat) > IMP_COMPAT.indexOf(f) ? x.compat : f;
}
function checkImpact(plan, dir, systems, rows, tracking) {
  const I = plan.impact, hasDoc = fs.existsSync(path.join(dir, "impact.md"));
  if (I == null) { if (hasDoc) warn("impact.md exists in this folder, but the Impact tab is empty (impact is null): fill plan.json impact from it (RULES §2, Impact)"); return; }
  if (typeof I !== "object" || Array.isArray(I)) { fail("impact must be an object (or null until plan acceptance)"); return; }
  if (!IMP_BASES.includes(I.basis)) fail(`impact.basis must be one of ${IMP_BASES.join(", ")} (got ${JSON.stringify(I.basis)})`);
  if (plan.status === "built" && I.basis === "plan") fail('a built board\'s impact is the as-built one: the landing reconciles it from final-implementation.md and sets impact.basis "as-built"');
  if (plan.status === "planned" && I.basis === "as-built") fail('a planned board has nothing built: impact.basis is "plan"');
  if (I.none != null && !str(I.none)) fail("impact.none is a plain statement of why no downstream impact is recorded, or null");
  const sysOk = (s, at) => { if (s != null && (!str(s) || (systems.length && !systems.some(x => x.slug === s)))) warn(`${at}.system "${s}" is not in plan.systems; it is drawn as outside the repository's systems (use null for a party outside them)`); };
  const each = (k, f) => { const v = I[k]; if (v == null) return []; if (!Array.isArray(v)) { fail(`impact.${k} must be an array`); return []; } v.forEach((x, i) => { const at = `impact.${k}[${i}]`; if (!x || typeof x !== "object") fail(`${at} must be an object`); else { f(x, at); checkLink(dir, x.link, `${at}.link`); } }); return v; };
  const breaking = [];
  const ds = each("downstream", (x, at) => { if (compatCheck("downstream", x, at) === "breaking") breaking.push(at); if (!str(x.who) || !str(x.summary)) fail(`${at}: "who" and "summary" are required`); if (x.kind != null && !IMP_KINDS.includes(x.kind)) fail(`${at}.kind must be one of ${IMP_KINDS.join(", ")}`); if (!IMP_EFFECTS.includes(x.effect)) fail(`${at}.effect must be one of ${IMP_EFFECTS.join(", ")}`); sysOk(x.system, at); });
  const ad = each("adaptation", (x, at) => { if (compatCheck("adaptation", x, at) === "breaking") breaking.push(at); if (!str(x.who) || !str(x.summary)) fail(`${at}: "who" and "summary" are required`); if (!IMP_NEEDS.includes(x.need)) fail(`${at}.need must be one of ${IMP_NEEDS.join(", ")}`); sysOk(x.system, at); });
  const api = each("api", (x, at) => { if (compatCheck("api", x, at) === "breaking") breaking.push(at); if (!str(x.surface) || !str(x.summary)) fail(`${at}: "surface" and "summary" are required`); if (!IMP_CHANGES.includes(x.change)) fail(`${at}.change must be one of ${IMP_CHANGES.join(", ")}`); if (x.tier != null && !IMP_TIERS.includes(x.tier)) fail(`${at}.tier must be one of ${IMP_TIERS.join(", ")}, or null when not stated`); sysOk(x.system, at); });
  const cv = each("conversion", (x, at) => { if (compatCheck("conversion", x, at) === "breaking") breaking.push(at); if (!str(x.what)) fail(`${at}: "what" (the step) is required`); });
  /* impact.changes and impact.units[].changes: the differences from the planned impact, which the As built tab shows (RULES §2,
     Impact). Each needs what and why; "entry" (optional) names the Impact entry it changed as <section>.<index>, and the As built
     card links that card, so an entry that names none fails; "system" (optional) is a registry slug, as on the entries. */
  const lists = { downstream: ds, adaptation: ad, api, conversion: cv };
  const unitRow = id => rows.find(r => r.unit && r.id === id);
  const checkChange = (x, at) => {
    /* unit (tracking boards): the unit row whose landing recorded the entry; none: true marks that unit's explicit "no change" to
       the initiative's impact, which needs its unit and names no entry (RULES §2, Impact; §8) */
    if (x.none != null && x.none !== true) fail(`${at}.none is true (a unit's "no change" entry) or left out (got ${JSON.stringify(x.none)})`);
    if (x.unit != null) { if (!tracking) fail(`${at}.unit: an issue board has no units; leave unit out`); else if (!unitRow(x.unit)) fail(`${at}.unit ${JSON.stringify(x.unit)} names no unit row`); }
    if (x.none === true) {
      if (!tracking) fail(`${at}: a "no change" entry (none: true) records a unit's landing, and an issue board has no units: an issue board reconciled with no change keeps impact.changes empty, and its basis "as-built" says "None"`);
      else if (x.unit == null) fail(`${at}: a "no change" entry (none: true) names its unit (the unit row id)`);
      if (x.entry != null) fail(`${at}.entry: a "no change" entry changed no entry; leave entry out`);
      if (!str(x.when)) warn(`${at}: a "no change" entry says when it was recorded ("#<n> landing")`);
      if (x.what != null && !str(x.what)) fail(`${at}.what is a statement, or left out`);
      if (x.ref && /^[0-9a-f]+$/.test(x.ref) && !SHA.test(x.ref)) fail(`${at}.ref "${x.ref}" is not a commit sha`);
      return;
    }
    if (!str(x.what) || !str(x.why)) fail(`${at}: "what" and "why" are required`);
    if (x.ref && /^[0-9a-f]+$/.test(x.ref) && !SHA.test(x.ref)) fail(`${at}.ref "${x.ref}" is not a commit sha`);
    if (x.entry != null) { const m = /^(downstream|adaptation|api|conversion)\.(\d+)$/.exec(String(x.entry));
      if (!m) fail(`${at}.entry ${JSON.stringify(x.entry)} must name an Impact entry as <section>.<index> (${IMP_LISTS.join(", ")}), or be left out`);
      else if (!lists[m[1]][+m[2]]) fail(`${at}.entry "${x.entry}" names no entry: impact.${m[1]} has ${lists[m[1]].length}; the As built tab would link a card that is not there`); }
    sysOk(x.system, at);
  };
  /* changes[] under basis "plan" are expected, not warned about: the impact is partly reconciled while they accumulate (RULES §2). */
  each("changes", checkChange);
  const rel = I.release;
  if (rel != null && (typeof rel !== "object" || !IMP_BUMPS.includes(rel.bump))) fail(`impact.release.bump must be one of ${IMP_BUMPS.join(", ")}`);
  checkLink(dir, I.link, "impact.link"); checkLink(dir, I.source, "impact.source");
  const items = ds.length + ad.length + api.length + cv.length, effect = ds.some(x => x.effect && x.effect !== "none") || api.length || ad.some(x => x.need === "required");
  if (!items && !str(I.none) && !str(I.summary) && !(I.units || []).length) warn(`the Impact tab is empty: impact records no entry, no summary and no "none" statement${hasDoc ? ", although impact.md exists in this folder: fill it from there" : ""}`);
  if (str(I.none) && effect) warn("impact.none says no downstream impact is recorded, but the entries record one: keep one of the two");
  const bump = rel && rel.bump;
  /* release.unreleased (RULES §2, Impact): the change's downstream effect lands on a new artifact that has never been released, so no
     existing version moves and its first release is its own. It quiets the two release warnings below for that case, and is held to
     its form: true, with no bump, and the new artifact recorded as a downstream entry of kind artifact. */
  const unrel = !!rel && typeof rel === "object" && rel.unreleased === true;
  if (rel && typeof rel === "object" && rel.unreleased != null && rel.unreleased !== true) fail(`impact.release.unreleased is true (the artifact is new and unreleased) or left out (got ${JSON.stringify(rel.unreleased)})`);
  if (unrel && bump && bump !== "none") warn(`impact.release.unreleased says the artifact is new and unreleased, so no existing version moves, but release.bump is ${bump}: keep bump "none" (its first release is its own), or drop the mark`);
  if (unrel && !ds.some(x => x.kind === "artifact")) warn("impact.release.unreleased marks a new, unreleased artifact, but no downstream entry of kind artifact records it: add one (who: the artifact, effect additive)");
  if (unrel) ok("impact: release.unreleased — the artifact is new and unreleased; no existing version moves (the release warnings are quiet)");
  if (plan.level === 3 && bump === "none" && effect && !unrel) warn("a level-3 change with a downstream effect takes a feat: release; release.bump is none (a new artifact that has never been released: mark it with impact.release.unreleased: true)");
  if (plan.level === 3 && bump === "none" && !str(I.none) && !unrel) warn("a level-3 change with no version bump says explicitly that it has no downstream effect (impact.none), or marks a new, unreleased artifact (impact.release.unreleased: true)");
  if (plan.level === 3 && bump === "feat" && !effect && str(I.none)) warn("a level-3 change bumps only with a downstream effect, but impact.none says it has none");
  if (breaking.length && !tracking && bump && bump !== "major") warn(`a breaking entry (${breaking.slice(0, 3).join(", ")}) rides in a major release; release.bump is ${bump}`);
  if (plan.level === 4 && bump && bump !== "none") warn("a level-4 plan moves no version itself (docs only): its units' releases go in impact.units");
  /* units: tracking boards only, one entry per unit row */
  const us = I.units == null ? [] : Array.isArray(I.units) ? I.units : (fail("impact.units must be an array"), []);
  if (us.length && !tracking) fail("impact.units is for a tracking board's units; an issue board has none");
  const seen = new Set();
  us.forEach((e, i) => {
    const at = `impact.units[${i}]`, r = rows.find(x => x.unit && x.id === (e || {}).unit);
    if (!r) { fail(`${at}.unit ${JSON.stringify((e || {}).unit)} names no unit row`); return; }
    if (seen.has(e.unit)) fail(`${at}: a second entry for unit "${e.unit}"`); seen.add(e.unit);
    if (!str(e.summary)) fail(`${at}: summary is required`);
    compatCheck("unit", e, at);
    if (!IMP_BASES.includes(e.basis)) fail(`${at}.basis must be one of ${IMP_BASES.join(", ")}`);
    if (e.release != null && (typeof e.release !== "object" || !IMP_BUMPS.includes(e.release.bump))) fail(`${at}.release.bump must be one of ${IMP_BUMPS.join(", ")}`);
    else if (e.release != null && e.release.unreleased != null && e.release.unreleased !== true) fail(`${at}.release.unreleased is true (the unit's artifact is new and unreleased) or left out`);
    else if (e.release != null && e.release.unreleased === true && e.release.bump !== "none") warn(`${at}.release.unreleased marks a new, unreleased artifact, but its bump is ${e.release.bump}: keep bump "none"`);
    if (e.changes != null) { if (!Array.isArray(e.changes)) fail(`${at}.changes must be an array`);
      else { e.changes.forEach((c, j) => { const cat = `${at}.changes[${j}]`; if (!c || typeof c !== "object") fail(`${cat} must be an object`);
        else { if (!str(c.what) || !str(c.why)) fail(`${cat}: "what" and "why" are required`); if (c.ref && /^[0-9a-f]+$/.test(c.ref) && !SHA.test(c.ref)) fail(`${cat}.ref "${c.ref}" is not a commit sha`);
          if (c.entry != null) fail(`${cat}.entry: a unit's change links its unit card, not an entry of the initiative's impact; leave entry out`); } });
        if (e.changes.length && e.basis !== "as-built") warn(`${at}.changes records differences from unit "${e.unit}"'s planned impact, which exist only once its entry is reconciled (basis as-built)`); } }
    if (e.basis === "plan" && UNIT_DONE.includes((r.asBuilt || {}).state)) warn(`${at}: unit "${e.unit}" has landed, but its impact entry is still the plan's: reconcile it from the unit's board (basis as-built)`);
    checkLink(dir, e.link, `${at}.link`); checkLink(dir, e.source, `${at}.source`);
  });
  if (tracking) rows.filter(r => r.unit && !seen.has(r.id)).forEach(r => {
    const sp = subIssuePlan(dir, r.unit), si = sp && sp.impact;
    if (si && typeof si === "object" && (str(si.summary) || str(si.none))) warn(`impact.units has no entry for unit "${r.id}" (#${r.unit.issue}), whose own board records its impact: summarise it here`);
  });
  reconciliationCheck(plan, rows, tracking);
}
/* The derived reconciliation state (RULES §2, Impact; lib.js reconciliation(), the one derivation the scripts share): printed, and
   the stored data warned on where it contradicts itself. Every landed unit of a tracking board records its effect on the
   initiative's impact in impact.changes: the changes it made (each naming the unit) or one "no change" entry (none: true). */
function reconciliationCheck(plan, rows, tracking) {
  const R = reconciliation(plan); if (!R) return;
  const I = plan.impact, changes = Array.isArray(I.changes) ? I.changes : [];
  const label = r => { const x = rows.find(y => y.id === r); return x && x.unit && x.unit.issue ? `"${r}" (#${x.unit.issue})` : `"${r}"`; };
  const st = r => (r.asBuilt || {}).state || "pending";
  ok(`impact: reconciliation ${R.state} (${RECON_WORDS[R.state]}; derived: basis ${JSON.stringify(R.basis)}, ${R.changes} change${R.changes === 1 ? "" : "s"} recorded${tracking ? `, ${R.noChange.length} "no change" entr${R.noChange.length === 1 ? "y" : "ies"}, ${R.landed} of ${R.total} unit${R.total === 1 ? "" : "s"} landed` : ""})`);
  if (!tracking) return;
  R.unrecorded.forEach(id => {
    const r = rows.find(x => x.id === id), n = r.unit.issue;
    const hint = n ? changes.map((c, i) => c && c.unit == null && new RegExp(`#${n}\\b`).test(String(c.when || "")) ? `impact.changes[${i}]` : null).filter(Boolean) : [];
    warn(`${R.state === "as-built" ? "inconsistent: the impact is reconciled (basis as-built), but " : ""}unit ${label(id)} has landed and impact.changes records nothing for it: its landing refresh records its effect on the initiative's impact, either the changes it made, each with unit "${id}", or one entry {"unit": "${id}", "when": "${n ? `#${n} ` : ""}landing", "none": true}${hint.length ? `; ${hint.join(", ")} name${hint.length === 1 ? "s" : ""} #${n} in "when" but carr${hint.length === 1 ? "ies" : "y"} no unit: add "unit": "${id}"` : ""}`);
  });
  const ids = [...new Set(changes.filter(c => c && c.unit != null).map(c => c.unit))];
  ids.forEach(id => {
    const r = rows.find(x => x.unit && x.id === id); if (!r) return;
    const mine = changes.filter(c => c && c.unit === id), none = mine.filter(isNoChange);
    if (none.length && none.length < mine.length) warn(`impact.changes records both changes and a "no change" entry for unit ${label(id)}: keep the changes, or the one "no change" entry`);
    else if (none.length > 1) warn(`impact.changes records ${none.length} "no change" entries for unit ${label(id)}: one is enough`);
    if (!UNIT_DONE.includes(st(r)) && none.length) warn(`impact.changes records "no change" for unit ${label(id)}, which has not landed (${st(r)}): a unit's effect is recorded in its landing refresh`);
  });
  const open = rows.filter(r => r.unit && !["dropped", "deferred"].includes(st(r)) && !UNIT_DONE.includes(st(r)));
  if (R.state === "as-built" && open.length && plan.status !== "abandoned") warn(`inconsistent: the initiative's impact is reconciled (basis as-built), but ${open.length} of ${R.total} units have not landed (${open.slice(0, 4).map(r => label(r.id)).join(", ")}${open.length > 4 ? ", …" : ""}): it is reconciled whole at the last unit's landing; keep basis "plan" until then`);
  if (R.state !== "as-built" && R.total && R.landed === R.total && plan.status !== "built") warn(`every unit has landed, but the initiative's impact is still ${RECON_WORDS[R.state]} (basis plan): the last unit's landing reconciles it whole and sets basis "as-built"`);
}
const UNIT_DONE = ["landed", "as-planned", "amended", "deviated"];

/* The warning (RULES §1, §8): an issue the board names has a board in this tree, but the page does not open that board from
   every place it names the issue. The issue's board is a unit's in this tracking board's folder (unit.board), the parent's in the
   enclosing folder (parent.board), or any other issue's anywhere under docs/plans/ (issueBoards); the places are lib.js
   issueRefs'. A place misses the board when the page's template is older than the rule that links it (no ISSUE_BOARDS map: only a
   unit's row, chain, inspector, roadmap and #n in the text were linked, through SUB_BOARDS; neither map: nothing), when the data
   field is not the board on disk (embed.js not re-run), or when the data writes the issue as a GitHub URL. One warning per issue,
   naming each place and the fix. On a template older than the widened rule a second warning names the issue references it leaves
   as plain text, or links to a board that does not exist, for issues that have no board. */
function issueLinkWarnings(plan, dir, html) {
  const rule = linkRule(html), tracking = plan.kind === "tracking", self = path.resolve(dir);
  const refs = issueRefs(plan).filter(r => r.n !== plan.issue);
  const units = new Map(tracking ? (plan.rows || []).filter(r => r.unit && posInt(r.unit.issue)).map(r => [r.unit.issue, r]) : []);
  const par = plan.parent && posInt(plan.parent.issue) ? plan.parent.issue : null;
  const root = treeRoot(dir), all = root ? boardFolders(root) : [], others = plan.issueBoards && typeof plan.issueBoards === "object" ? plan.issueBoards : {};
  const plainOld = [];
  [...new Set(refs.map(r => r.n))].sort((a, b) => a - b).forEach(n => {
    const mine = refs.filter(r => r.n === n);
    let kind, hit, has;
    if (units.has(n)) { kind = "unit"; const h = subIssueBoard(dir, units.get(n).unit); hit = h && h.board; has = units.get(n).unit.board; }
    else if (n === par) { kind = "parent"; const h = parentBoard(dir, plan.parent); hit = h && h.board; has = plan.parent.board; }
    else { kind = "other"; const h = all.find(b => b.issue === n && path.resolve(b.dir) !== self); hit = h ? boardLink(dir, h.dir) : null; has = others[String(n)]; }
    if (!hit) {
      if (rule < 2) mine.forEach(r => { if (r.plain) plainOld.push(`#${n} in ${r.place} (plain text)`); else if (r.crumb) plainOld.push(`#${n} in the breadcrumb (a link to a board that does not exist)`); });
      return;
    }
    const dataOk = (has || null) === hit, need = r => kind === "unit" && r.since === "sub" ? 1 : 2, places = [];
    // the breadcrumb of a template older than the widened rule links every ancestor folder's board by its path, which is right
    // whenever that board exists; on the current template it follows the data like every other place
    mine.forEach(r => { if (r.crumb ? rule === 2 && !dataOk : r.how === "url" || !dataOk || rule < need(r)) places.push(r.place); });
    if (kind === "unit" && !dataOk) places.push("the chain in the WIP strip");
    const uniq = [...new Set(places)];
    if (!uniq.length) return;
    const field = kind === "unit" ? "unit.board" : kind === "parent" ? "parent.board" : `issueBoards["${n}"]`;
    const fixes = [];
    if (mine.some(r => !r.crumb && rule < need(r))) fixes.push("the page is on a template older than the rule: re-render it (copy plan/template/dashboard.html over it, then embed.js)");
    if (!dataOk) fixes.push(`${field} is ${has ? JSON.stringify(has) : "unset"}: run embed.js, which links it`);
    if (mine.some(r => r.how === "url")) fixes.push(`write the issue as #${n} in the data, and the page links it to the board`);
    warn(`#${n}${kind === "parent" ? " (the parent)" : ""} has a board (${hit}), but this page links #${n} to its GitHub issue, or leaves it as plain text, in ${uniq.length} place${uniq.length === 1 ? "" : "s"}: ${uniq.join("; ")}. Fix: ${fixes.join("; ")}`);
  });
  if (plainOld.length) { const u = [...new Set(plainOld)]; warn(`this page is on a template older than the widened link rule (plan/RULES.md §1): ${u.length} issue reference${u.length === 1 ? " is" : "s are"} not linked to the issue's GitHub page: ${u.join("; ")}. Fix: re-render it (copy plan/template/dashboard.html over it, then embed.js)`); }
}
/* The same on the work board: an issue with a board (a row with "board"), on a page whose template does not link it there. A
   template with the SUB_BOARDS map linked a sub-issue's row, roadmap entry, waits-on and blocks, but left the "part of" line,
   the "blocked by" tags and the Up next count as plain text, and linked a tracking issue to GitHub; one with neither map linked
   every #n to GitHub. */
function workBoardLinkWarnings(b, html) {
  const rule = linkRule(html); if (rule === 2) return;
  const rows = b.rows || [], same = w => !w.repo || w.repo === b.repo;
  rows.filter(r => r.board).forEach(r => {
    const n = r.issue, old = rule === 1 && !!r.parent, places = [];
    if (!old) {
      places.push("its row in the Issue column");
      (b.groups || []).forEach(g => { if (g.issue === n) places.push("its group heading"); });
      (b.roadmap || []).forEach(m => { if (m.issue === n) places.push("the roadmap"); if ((m.items || []).some(i => i.issue === n)) places.push(`the roadmap under #${m.issue}`); });
      rows.forEach(x => {
        if ((x.waitsOn || []).some(w => w.issue === n && same(w))) places.push(`"waits on" in #${x.issue}'s row`);
        if ((x.blocks || []).some(w => w.issue === n && same(w))) places.push(`"blocks" in #${x.issue}'s row`);
      });
    }
    rows.forEach(x => {
      if (x.parent === n) places.push(`"part of" in #${x.issue}'s row`);
      if ((x.blockedBy || []).some(w => w.issue === n && same(w))) places.push(`the "blocked by" tag of #${x.issue}`);
    });
    if (r.status === "next") places.push("the Up next count");
    const uniq = [...new Set(places)];
    if (uniq.length) warn(`#${n} has a board (${r.board}), but the work board links #${n} to its GitHub issue, or leaves it as plain text, in ${uniq.length} place${uniq.length === 1 ? "" : "s"}: ${uniq.join("; ")}. Fix: the page is on a template older than the rule; regenerate it with board.js --refresh-template`);
  });
}

function checkHtml(htmlPath, id, data, kindMeta) {
  if (!fs.existsSync(htmlPath)) { fail(`${path.basename(htmlPath)} is missing (scaffold it from the template)`); return; }
  const html = fs.readFileSync(htmlPath, "utf8"), body = readBlock(html, id);
  if (body == null) { fail(`${path.basename(htmlPath)} has no <script type="application/json" id="${id}"> block`); return; }
  let embedded; try { embedded = JSON.parse(body); } catch (e) { fail("the embedded copy does not parse: " + e.message); return; }
  if (JSON.stringify(embedded) !== JSON.stringify(data)) fail(`the embedded copy differs from ${id}.json: run embed.js`); else ok(`${path.basename(htmlPath)} embeds ${id}.json verbatim`);
  /* the live sidecar (RULES §1, "plan.js"): the data file as a script beside the page, which the page re-loads while its run is live */
  const side = readSidecar(path.join(path.dirname(htmlPath), SIDECAR[id]), id);
  if (side.error === "missing") warn(`${SIDECAR[id]} is missing beside the page: its live view has nothing to re-load (run embed.js, which writes it)`);
  else if (side.error) fail(`${SIDECAR[id]} is ${side.error}: run embed.js`);
  else if (JSON.stringify(side.data) !== JSON.stringify(data)) fail(`${SIDECAR[id]} differs from ${id}.json: run embed.js`);
  else ok(`${SIDECAR[id]} carries ${id}.json`);
  if (!html.includes(`<meta name="dashboard" content="${kindMeta}">`)) fail(`${path.basename(htmlPath)} does not declare <meta name="dashboard" content="${kindMeta}">`);
  const panels = html.match(/<section[^>]*role="tabpanel"[\s\S]*?<\/section>/g) || [];
  if (!panels.length) fail(`${path.basename(htmlPath)} has no tab panels`);
  let missing = 0; panels.forEach(p => { const pid = (p.match(/id="([^"]+)"/) || [])[1]; if (!/class="key"/.test(p)) { fail(`tab panel ${pid} has no legend (.key)`); missing++; } });
  if (panels.length && !missing) ok(`${panels.length} tab panels, each with a legend`);
  if (kindMeta === "plan-board" && !/<section class="wip"/.test(html)) fail('the page has no WIP strip (<section class="wip">)');
  if (kindMeta === "plan-board" && !/id="p-impact"/.test(html)) warn("the page has no Impact tab: it is on a template older than the tab (plan/RULES.md §2, Impact); re-render it (copy plan/template/dashboard.html over it, then embed.js)");
  if (!/<title>/.test(html)) fail("the page has no <title>");
  if (/href="#"/.test(html)) fail('the page has a dead href="#" link');
  if (!/prefers-color-scheme:dark/.test(html)) fail("the page has no dark-mode block");
  if (/<(script|link|img)[^>]+(src|href)="https?:/i.test(html)) fail("the page loads an external resource");
  if (Buffer.byteLength(html) > 16 * 1024 * 1024) fail("the page is over 16 MB");
  /* System colours (GUIDANCE.md §1; system/scripts/palette.js): none in a status spectrum, and each slot the shared palette's */
  const pal = paletteCheck(html);
  pal.problems.forEach(p => fail(`palette: ${p}`)); pal.warnings.forEach(w => warn(`palette: ${w}`));
  if (!pal.problems.length) ok(`palette: ${pal.tokens} system-colour tokens, none in a status spectrum`);
  if (kindMeta === "plan-board") issueLinkWarnings(data, path.dirname(htmlPath), html);
  if (kindMeta === "work-board") workBoardLinkWarnings(data, html);
}

function checkBoard(dir) {
  const b = JSON.parse(fs.readFileSync(path.join(dir, "board.json"), "utf8"));
  if (b.schema !== "work-board/1") fail(`board.json schema must be "work-board/1" (got ${JSON.stringify(b.schema)})`);
  if (!str(b.repo)) fail("board.json needs repo");
  (b.rows || []).forEach((r, i) => { if (!posInt(r.issue) || !str(r.title)) fail(`rows[${i}] needs issue and title`); if (r.board) checkLink(dir, r.board, `rows[${i}].board`);
    /* the impact's reconciliation state, derived by board.js from the row's board (lib.js reconciliation()): null, or { state, landed, total } */
    const rc = r.reconciliation; if (rc != null && (typeof rc !== "object" || !Object.keys(RECON_WORDS).includes(rc.state))) fail(`rows[${i}].reconciliation must be null or { state: ${Object.keys(RECON_WORDS).join(" | ")}, landed, total } (got ${JSON.stringify(rc)}): regenerate it with board.js`); });
  /* A row's state (plan/RULES.md §5): one the work board draws. A boardless row (board.js writes "tracker" on it) takes its state from
     the tracker, one of BOARDLESS_STATES, and holds to what it read: landed when the issue is closed; merged with a merged pull
     request; in progress with an open pull request or a branch (never active: no run board to mirror); not started with neither. */
  const ROW_STATES = ["landed", "complete", "building", "planning", "halted", "escalated", "abandoned", "next", "no-board", ...BOARDLESS_STATES];
  (b.rows || []).forEach((r, i) => { const at = "rows[" + i + "] (#" + r.issue + ")";
    if (r.status != null && !ROW_STATES.includes(r.status)) fail(at + ".status must be one of " + [...new Set(ROW_STATES)].join(", ") + " (got " + JSON.stringify(r.status) + ")");
    if (r.tracker === undefined) {
      if (["in-progress", "merged"].includes(r.status)) fail(at + ': "' + r.status + '" is a boardless row\'s state, read from the tracker, but the row records no "tracker": regenerate it with board.js');
      if (r.status === "no-board") warn(at + ': "no-board" is the state of a board.js older than the boardless rows (plan/RULES.md §5): regenerate the work board with board.js, which reads its state from the tracker');
      return; }
    const t = r.tracker, pr = t && t.pr;
    if (!t || typeof t !== "object" || Array.isArray(t) || !(t.branch === null || (typeof t.branch === "string" && t.branch.trim())) || !(pr === null || (pr && typeof pr === "object" && posInt(pr.number) && ["OPEN", "MERGED"].includes(pr.state)))) { fail(at + ".tracker must be { branch: a branch name or null, pr: { number, state: OPEN | MERGED } or null } (got " + JSON.stringify(t) + "): regenerate it with board.js"); return; }
    if (r.board) fail(at + ': a row with a board takes its state from the board, not the tracker; leave "tracker" out');
    if (!BOARDLESS_STATES.includes(r.status)) { fail(at + ": a boardless row is " + BOARDLESS_STATES.join(", ") + " (got " + JSON.stringify(r.status) + ")"); return; }
    if (r.active) fail(at + ": a boardless row never glows: it has no run board to mirror");
    const closed = r.state === "CLOSED", np = closed && r.stateReason === "NOT_PLANNED", why = {
      landed: !closed ? "landed means the issue is closed" : np ? 'the issue was closed as not planned: the row reads "not-planned" (closed · not planned), never landed' : null,
      "not-planned": !closed ? "not-planned means the issue is closed as not planned" : !np ? `not-planned needs the tracker's stateReason NOT_PLANNED (got ${JSON.stringify(r.stateReason == null ? null : r.stateReason)})` : null,
      merged: closed ? "a closed issue has landed" : !pr || pr.state !== "MERGED" ? "merged needs the merged pull request (tracker.pr, state MERGED)" : null,
      "in-progress": closed ? "a closed issue has landed" : pr ? (pr.state !== "OPEN" ? "in progress with a pull request needs an open one" : null) : !t.branch ? "in progress needs a branch or an open pull request that refers to the issue" : null,
      "not-started": closed ? "a closed issue has landed" : pr || t.branch ? "not started means no branch or pull request refers to the issue" : null }[r.status];
    if (why) fail(at + ': status "' + r.status + '" does not match what the tracker recorded (state ' + r.state + (r.stateReason ? " " + r.stateReason : "") + ", branch " + JSON.stringify(t.branch) + ", pr " + JSON.stringify(pr) + "): " + why);
    if (["merged", "landed", "not-planned"].includes(r.status) && r.branch) fail(at + ': a merged branch is not shown (plan/RULES.md §3, "Branches"): branch is null once the row is ' + r.status);
  });
  const bl = (b.rows || []).filter(r => r.tracker !== undefined);
  if (bl.length) ok("board.json: " + bl.length + " boardless row" + (bl.length === 1 ? "" : "s") + ", state from the tracker: " + BOARDLESS_STATES.map(k => bl.filter(r => r.status === k).length + " " + k).join(", "));
  /* "unassigned": the decision that an entry belongs to no system (board.js keeps it): true, and never beside a system */
  [["rows", b.rows], ["unscheduled", b.unscheduled]].forEach(([k, xs]) => (xs || []).forEach((r, i) => { if (r.unassigned !== undefined && (r.unassigned !== true || r.system)) fail(`${k}[${i}].unassigned must be true, with "system" null (got unassigned ${JSON.stringify(r.unassigned)}, system ${JSON.stringify(r.system)})`); }));
  const rcs = (b.rows || []).filter(r => r.reconciliation && r.reconciliation.state);
  if (rcs.length) ok(`board.json: impact reconciliation ${Object.keys(RECON_WORDS).map(k => `${rcs.filter(r => r.reconciliation.state === k).length} ${RECON_WORDS[k]}`).join(", ")}`);
  const left = placeholders(b, "", []); if (left.length) fail(`placeholders left: ${left.slice(0, 8).join(", ")}`);
  levelFail(b, "board.json");
  if (!out.fail.length) ok(`board.json: ${(b.rows || []).length} runs, ${(b.roadmap || []).length} roadmap items, ${(b.unscheduled || []).length} unscheduled issues`);
  checkHtml(path.join(dir, "index.html"), "board", b, "work-board");
}

const FULL = [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"], ["--width", "1920", "--height", "1080"]];
function browser(page, outDir, modes) {
  const checker = path.resolve(__dirname, "..", "..", "system", "scripts", "check-page.js");
  (modes || FULL).forEach(extra => {
    const r = cp.spawnSync(process.execPath, [checker, page, "--out", outDir, ...extra], { encoding: "utf8" });
    const label = extra.join(" ") || "light";
    const res = (r.stdout || "").trim().split(/\r?\n/);
    if (r.status === 0) ok(`browser (${label}): PASS · ${(res.find(l => l.startsWith("screenshot:")) || "").replace("screenshot: ", "")}`);
    else fail(`browser (${label}): ${res.filter(l => /FAIL|ERROR|Uncaught|threw|NOT VISIBLE|NO LEGEND|MISSING|WRONG|DEAD|TOO MANY|HORIZONTAL|LEVEL REFERENCE|RAW UTC STAMP|PALETTE IN STATUS HUE|IMPACT SHOWS PLANNING|GIT-IGNORED|REGISTRY UNREADABLE/.test(l)).join(" | ") || (r.stderr || "").trim()}`);
  });
}

function findRoot(dir, args) {
  const given = opt(args, "root", null); if (given) return path.resolve(given);
  for (let d = path.resolve(dir); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, "docs", "plans"))) return d; if (path.dirname(d) === d) return null; }
}
function run(dir, args) {
  args = args || [];
  const root = findRoot(dir, args), isBoard = fs.existsSync(path.join(dir, "board.json"));
  if (isBoard) checkBoard(dir);
  else {
    const jsonPath = path.join(dir, "plan.json");
    if (!fs.existsSync(jsonPath)) { fail(`${jsonPath} is missing`); return report(); }
    let plan; try { plan = JSON.parse(fs.readFileSync(jsonPath, "utf8")); } catch (e) { fail("plan.json does not parse: " + e.message); return report(); }
    checkPlan(plan, dir, root);
    checkHtml(path.join(dir, "dashboard.html"), "plan", plan, "plan-board");
  }
  const page = path.join(dir, isBoard ? "index.html" : "dashboard.html"), outDir = opt(args, "out", path.join(os.tmpdir(), "dashboard-check"));
  if (flag(args, "browser")) browser(page, outDir);
  else if (flag(args, "auto") && fs.existsSync(page)) {
    const d = require(path.resolve(__dirname, "..", "..", "system", "scripts", "deviation.js")).deviation(page);
    // A declared divergence is reported; a difference nobody declared, or an unverified template, is a warning.
    d.notes.forEach(n => (/^declared divergence/.test(n) ? ok : warn)(`template: ${n}`));
    if (d.passes === "none") ok(`template: ${path.basename(page)} is the verified template plus its data; browser pass not needed`);
    else browser(page, outDir, d.passes === "light" ? [[]] : FULL);
  }
  return report();
}
function report() {
  out.ok.forEach(m => console.log("ok    " + m));
  out.warn.forEach(m => console.log("warn  " + m));
  out.fail.forEach(m => console.log("FAIL  " + m));
  console.log(out.fail.length ? `\n${out.fail.length} failure${out.fail.length === 1 ? "" : "s"}` : "\nall checks pass");
  return out.fail.length ? 1 : 0;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  require("../../system/scripts/cliargs.js").strict(args, { usage: "usage: node check.js <plan-folder | docs/plans> [--root <repo>] [--auto | --browser] [--out <dir>]", valued: ["root", "out"], flags: ["auto", "browser"], min: 1, max: 1 });
  const dir = args.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--root", "--out"].includes(args[i - 1])));
  if (!dir) { console.error("usage: node check.js <plan-folder | docs/plans> [--root <repo>] [--auto | --browser] [--out <dir>]"); process.exit(2); }
  process.exit(run(dir, args));
}
module.exports = { run };
