#!/usr/bin/env node
// Check a plan board or the work board against plan/RULES.md §8, then (with --browser) in headless Chrome.
//   node check.js <plan-folder>          plan.json keeps the rules and dashboard.html embeds it verbatim
//   node check.js docs/plans             the work board: board.json and index.html
//   options: --root <repo> (default: found above the folder, the first one holding docs/plans)
//            --browser [--out <dir>]     also run system/scripts/check-page.js: light, dark, 520 px and a 390 px frame
//            --auto [--out <dir>]        the usual mode (GUIDANCE.md §8): the data and the embed as always, then the browser pass
//                                        only if the page deviates from its template, declared or not, or the template changed
//                                        since verify/verify-templates.js verified it; a page that is the verified template plus
//                                        its data gets none
// Exit 0 when every rule holds, 1 otherwise. Warnings never fail the run.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const { registry, headingSlugs, readBlock, findPlans, subIssueBoard, parentBoard, otherBoards, issueRefs, treeRoot, boardFolders, boardLink, linkRule, opt, flag } = require("./lib.js");

const STATUS = ["planned", "building", "built", "abandoned"];
const STATES = ["pending", "as-planned", "amended", "deviated", "dropped", "deferred", "complete", "landed"];
const VERDICTS = ["accepted", "declined", "partial", "deferred"];
const GAP_KINDS = ["bug", "missing", "debt", "risk"];
const COLUMNS = ["gap", "considered", "verdict", "built"];
const STEPS = ["sizing", "interview", "research", "architecture", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed", "halted", "escalated", "cancelled"];
const QA = ["approved", "changes-requested", "running"];
const DATE = /^\d{4}-\d{2}-\d{2}$/, STAMP = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const ID = /^[a-z0-9][a-z0-9-]*$/, SHA = /^[0-9a-f]{7,40}$/;
const MAX_GLOW = 6;

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
    if (plan.status === "planned" && st !== "pending") fail(`${at}: a planned plan has every part pending (found ${st})`);
    if (plan.status === "built" && st === "pending") fail(`${at}: a built plan has no pending part`);
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
    if (st && st !== "pending" && !str(bld.summary)) fail(`${at}: a ${st} part describes what exists in asBuilt.summary`);
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
    (w.qa || []).forEach((p, j) => { if (!posInt(p.pass)) fail(`wip.qa[${j}].pass must be a pass number`); if (!QA.includes(p.verdict)) fail(`wip.qa[${j}].verdict must be one of ${QA.join(", ")}`); if (p.date && !DATE.test(p.date)) fail(`wip.qa[${j}].date "${p.date}" is not YYYY-MM-DD`); });
    const cur = Array.isArray(w.current) ? w.current : [];
    cur.forEach(a => {
      const parts = String(a).split(".");
      if (parts.length === 1) { if (!COLUMNS.includes(parts[0])) fail(`wip.current "${a}" is neither a column nor a <row-id>.<column> address`); }
      else if (parts.length !== 2 || !ids.has(parts[0]) || !COLUMNS.includes(parts[1])) fail(`wip.current "${a}" names no cell`);
    });
    // The standing rule (RULES §3): a unit that has landed leaves wip.current in the same landing refresh.
    cur.forEach(a => { const r = rows.find(x => x.id === String(a).split(".")[0]); if (r && r.unit && (r.asBuilt || {}).state === "landed") fail(`wip.current "${a}" names a landed unit; the landing refresh removes it from wip.current`); });
    if (cur.length > MAX_GLOW) fail(`wip.current names ${cur.length} cells; at most ${MAX_GLOW} glow at once`);
    if ((w.step === "landed" || plan.status === "built") && cur.length) warn("a landed board has wip.current set; nothing glows once it has landed");
    if (w.step === "landed" && plan.status !== "built") fail('wip.step is "landed" but status is not "built"');
    /* wip.next (RULES §3): on a tracking board, always the next unit in landing order — the first unit row, in row order, that is
       pending and not in wip.current — or null when none is left. It is never also current and never a unit already done. A
       board written before wip.next existed (no key at all) only warns. */
    if (!tracking && w.next != null) fail(`wip.next "${w.next}" is set on a board whose kind is not tracking; only a tracking board names a next unit`);
    if (tracking) {
      const units = rows.filter(r => r.unit), inCur = r => cur.some(a => String(a).split(".")[0] === r.id);
      const want = units.find(r => ((r.asBuilt || {}).state || "pending") === "pending" && !inCur(r)) || null;
      if (w.next != null) {
        const nx = units.find(r => r.id === w.next);
        if (typeof w.next !== "string" || !nx) fail(`wip.next ${JSON.stringify(w.next)} names no unit row (it takes a unit row's id)`);
        else {
          const st = (nx.asBuilt || {}).state;
          if (st !== "pending") fail(`wip.next "${w.next}" names a unit whose state is ${st}; the next unit has not started`);
          if (inCur(nx)) fail(`wip.next "${w.next}" is also in wip.current; when its run starts it moves to wip.current and the following unit becomes next`);
        }
      }
      if (!("next" in w)) { if (want) warn(`wip.next is not recorded; the next unit in landing order is "${want.id}" (#${want.unit.issue})`); }
      else if ((w.next || null) !== (want ? want.id : null)) fail(want
        ? `wip.next is ${JSON.stringify(w.next)}, but the next unit in landing order is "${want.id}" (#${want.unit.issue}): the first pending unit not in wip.current`
        : `wip.next is "${w.next}", but no unit is left that is pending and not in wip.current: it is null`);
    }
    if (plan.status === "built" && w.step !== "landed") fail('a built plan has wip.step "landed"');
    ["waitsOn", "blocks"].forEach(k => ((w.blockers || {})[k] || []).forEach((x, j) => { if (!posInt(x.issue)) fail(`wip.blockers.${k}[${j}].issue must be an issue number`); }));
  }
  (plan.followUps || []).forEach((f, i) => { if (!posInt(f.issue) && !str(f.name)) fail(`followUps[${i}] needs an issue number or, for an unfiled follow-up, a name`); });
  (plan.documents || []).forEach((d, i) => { if (!str(d.label) && !str(d.path)) fail(`documents[${i}] needs a label or a path`); checkLink(dir, d.path, `documents[${i}].path`); });

  const left = placeholders(plan, "", []);
  if (left.length) fail(`placeholders left from the template: ${left.slice(0, 8).join(", ")}${left.length > 8 ? ` and ${left.length - 8} more` : ""}`);
  const lists = listings(plan, "", []);
  if (lists.length) fail(`code blocks over five lines in the data (the detail belongs in the Markdown, linked): ${lists.slice(0, 6).join(", ")}`);
  if (!out.fail.length) ok(`plan.json: ${tracking ? "tracking board, " : ""}${rows.length} rows, ${rows.reduce((n, r) => n + (r.options || []).length, 0)} options, status ${plan.status}, step ${(w || {}).step || "—"}`);
}

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
  if (!html.includes(`<meta name="dashboard" content="${kindMeta}">`)) fail(`${path.basename(htmlPath)} does not declare <meta name="dashboard" content="${kindMeta}">`);
  const panels = html.match(/<section[^>]*role="tabpanel"[\s\S]*?<\/section>/g) || [];
  if (!panels.length) fail(`${path.basename(htmlPath)} has no tab panels`);
  let missing = 0; panels.forEach(p => { const pid = (p.match(/id="([^"]+)"/) || [])[1]; if (!/class="key"/.test(p)) { fail(`tab panel ${pid} has no legend (.key)`); missing++; } });
  if (panels.length && !missing) ok(`${panels.length} tab panels, each with a legend`);
  if (kindMeta === "plan-board" && !/<section class="wip"/.test(html)) fail('the page has no WIP strip (<section class="wip">)');
  if (!/<title>/.test(html)) fail("the page has no <title>");
  if (/href="#"/.test(html)) fail('the page has a dead href="#" link');
  if (!/prefers-color-scheme:dark/.test(html)) fail("the page has no dark-mode block");
  if (/<(script|link|img)[^>]+(src|href)="https?:/i.test(html)) fail("the page loads an external resource");
  if (Buffer.byteLength(html) > 16 * 1024 * 1024) fail("the page is over 16 MB");
  if (kindMeta === "plan-board") issueLinkWarnings(data, path.dirname(htmlPath), html);
  if (kindMeta === "work-board") workBoardLinkWarnings(data, html);
}

function checkBoard(dir) {
  const b = JSON.parse(fs.readFileSync(path.join(dir, "board.json"), "utf8"));
  if (b.schema !== "work-board/1") fail(`board.json schema must be "work-board/1" (got ${JSON.stringify(b.schema)})`);
  if (!str(b.repo)) fail("board.json needs repo");
  (b.rows || []).forEach((r, i) => { if (!posInt(r.issue) || !str(r.title)) fail(`rows[${i}] needs issue and title`); if (r.board) checkLink(dir, r.board, `rows[${i}].board`); });
  const glowing = (b.rows || []).filter(r => r.active).length;
  if (glowing > MAX_GLOW) warn(`${glowing} runs are active: more than ${MAX_GLOW} rows glow at once`);
  const left = placeholders(b, "", []); if (left.length) fail(`placeholders left: ${left.slice(0, 8).join(", ")}`);
  if (!out.fail.length) ok(`board.json: ${(b.rows || []).length} runs, ${(b.roadmap || []).length} roadmap items, ${(b.unscheduled || []).length} unscheduled issues`);
  checkHtml(path.join(dir, "index.html"), "board", b, "work-board");
}

const FULL = [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"]];
function browser(page, outDir, modes) {
  const checker = path.resolve(__dirname, "..", "..", "system", "scripts", "check-page.js");
  (modes || FULL).forEach(extra => {
    const r = cp.spawnSync(process.execPath, [checker, page, "--out", outDir, ...extra], { encoding: "utf8" });
    const label = extra.join(" ") || "light";
    const res = (r.stdout || "").trim().split(/\r?\n/);
    if (r.status === 0) ok(`browser (${label}): PASS · ${(res.find(l => l.startsWith("screenshot:")) || "").replace("screenshot: ", "")}`);
    else fail(`browser (${label}): ${res.filter(l => /FAIL|ERROR|NOT VISIBLE|NO LEGEND|MISSING|WRONG|DEAD|TOO MANY|HORIZONTAL/.test(l)).join(" | ") || (r.stderr || "").trim()}`);
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
  const args = process.argv.slice(2), dir = args.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--root", "--out"].includes(args[i - 1])));
  if (!dir) { console.error("usage: node check.js <plan-folder | docs/plans> [--root <repo>] [--auto | --browser] [--out <dir>]"); process.exit(2); }
  process.exit(run(dir, args));
}
module.exports = { run };
