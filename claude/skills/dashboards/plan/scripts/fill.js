#!/usr/bin/env node
// A fill: the presenter's fields written on top of the latest plan.json (plan/RULES.md §4, "The fast path"; admin-team/dashboards-skill/option-d-and-decisions).
// Composing a fill takes minutes and events keep applying meanwhile, so a fill never writes the file it read: it hands this script the fields it
// wrote, and the script merges them onto the board as it stands now, under the boards' short lock (lib.js lockTree()), through a rename (lib.js
// atomicWrite()), then embeds, checks, and on a new failure puts every file back.
//   node fill.js <folder> --fields <fields.json> [--root <repo>] [--json]
// <folder> the board's folder (docs/plans/[<parent>/]<issue>-<slug>, from the repository root; or absolute), a view copy's too;
// <fields.json> a partial plan.json holding only what this fill writes:
//   Any plan field but the ones the events own: function, title, issueTitle, systems, baseline, parent, fixOf, rows, milestones, impact, tests, roadmap, followUps,
//   documents, notes, issueBoards.
//   Merge: an object merges key by key; a list of objects with an identity (rows and options by id, systems by slug, issue lists by issue, tests by class,
//   ...) merges item by item, a new item appended, an item not named left alone, { "$remove": true } removing one; when every item is named the fill's order wins.
//   impact.units merges by unit; impact.changes and a unit entry's changes merge by what each names (unit, entry, what, none), so a concurrent entry is kept: an
//   item the fill does not name stays, { ..., "$remove": true } removes one, and an empty list there adds nothing (null clears the list).
//   Any other list and any other value replaces what is there. null clears a field.
//   Left alone, whatever the fill says, on a row: asBuilt.state unless the fill's is an outcome (the events derive pending, in-progress and partially-built; a
//   complete or landed unit stays so), and unit.issue, unit.board, unit.folder and unit.live once set (the filing and embed.js write them). One exception, plan/RULES.md §2,
//   "Before the outcome": partially-built with a summary is stored where the stages do not say otherwise (no stage decides the row, or they make it partially built too).
//   Refused, exit 2 and nothing written: wip, trail, status, sized, branch, asBuilt, kind and the board's identity (schema, repo, issue, slug, folder), foundation
//   and links (embed.js clears and writes them): the events own them. A work level (level, unit.level, proposedLevel) is dropped and named, never written (levels.js).
//   A qa pass the fields name "qa pass N" is written "Quality Review N" (passnames.js), and so is one the board already holds, before the merge; named in notes.
//   An internal name (GUIDANCE.md §4; namerefs.js cleanWritten()) in the fields' text is reworded where a safe rewording exists, and named in notes; a text that
//   would still name one no library uses is refused, exit 2 and nothing written, the field and the name said: the presenter rewords it. A wait on the user reads
//   "waiting on you". An issue's title, quoted verbatim, an option's signature, which is code, and a $comment are left alone.
//   Two narrow ways into what the events own, each by what it names, so neither undoes an event:
//   "trailAdd": [{ date, column, label, ref? }] appends trail entries, one already there skipped;
//   "trailFix": [{ "label": "<the entry as it reads>", "to": "<as it should read>" }] rewords trail entries already there, each found by its label; a label not there is
//   named and skipped (for a text that should never have been written: an internal name, a work level);
//   "wip": { "stages": [{ id, rows }], "questions": [{ question, rows }], "interview": [{ text, answer }], "asked": [{ text, step?, answer }], "qa": [{ pass, note }],
//            "current": { "step": "<the step this glow is for>", "cells": ["<row-id>.<column>"] }, "waitingOn": "<what waits on the user>", "detail": "<the WIP line, reworded>",
//            "open": [{ text, resolved }] }
//   sets only those fields of the items it names, an item the board does not hold named and skipped, and the glow only while the board's step is still that step. Any
//   other wip key is refused. wip.open corrects the time an open point already resolved was recorded at (a factual correction, plan/RULES.md §2: the fill also
//   writes its notes.corrections entry), on every snapshot that holds the point with the same time; an open point not resolved yet is refused (resolving is the events'),
//   and so is a time that is no UTC ISO time or is after wip.updated. An answer's gist (the interview's, a halt's) is written on the snapshots that hold its question too (lib.js syncAsked()).
//   wip.waitingOn is the text the fast path left out or wrote in its stead (plan/RULES.md §4, "A work level in the facts is reworded"): while the board
//   is halted or escalated it is written, and the stop's own trail entry and a detail that quoted the old text follow it, so the record reads alike;
//   once an event has taken the board out of the stop, the last stop's trail entry alone takes it, and a waitingOn and resume left standing are cleared.
// It catches up the plan's stage table on a board whose stages carry none of it (lib.js catchUpStageTable()), and keeps up what follows from new rows: a tracking board's wip.next once its unit rows first appear, the glow at research and at sub-issues, and a unit's
// blocker named by unit number ({ "unit": k }, plan/RULES.md §3, unit.blockedBy) written as its issue number once that unit is filed.
// Exit 0 when merged (the summary's check line says what still warns or fails), 1 when the fill would add a failure to the board (every file as it was), 2 on a usage error or a refused field.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const lib = require("./lib.js");
const { titleSkip, levelRefs } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));
const { cleanWritten, nameRefs, unambiguous } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "namerefs.js"));
/* why a brief of the plan's stage table cannot be shown (apply-event.js stageNope()), or null */
const stageNope = s => levelRefs(s).length ? "a work level" : nameRefs(s).some(unambiguous) ? "an internal name" : lib.passRefs(s).length ? "an older wording of a review" : null;

const OWNED = ["wip", "trail", "status", "sized", "branch", "asBuilt", "kind", "schema", "repo", "issue", "slug", "folder", "foundation", "links"];
const IDENTITY = ["id", "slug", "issue", "class", "question", "pass", "n"];
const LEVELS = new Set(["level", "proposedLevel"]);
const WIP_KEYS = ["stages", "questions", "interview", "asked", "qa", "current", "waitingOn", "detail", "open"];
const UNIT_KEPT = ["issue", "board", "folder", "live"];
const ROW_DERIVED = ["pending", "in-progress", "partially-built"];
const isObj = v => v != null && typeof v === "object" && !Array.isArray(v);
class Refused extends Error {}

const identityOf = list => IDENTITY.find(k => list.every(x => isObj(x) && x[k] != null));
/* the fields with their keys read: a work level found anywhere is dropped and named */
function withoutLevels(v, at, dropped) {
  if (Array.isArray(v)) return v.map((x, i) => withoutLevels(x, `${at}[${i}]`, dropped));
  if (!isObj(v)) return v;
  const out = {};
  Object.keys(v).forEach(k => { const here = at ? `${at}.${k}` : k;
    /* a test class's own test level (tests.*.level) is no work level */
    if (LEVELS.has(k) && !/^tests\b/.test(at)) { dropped.push(here); return; }
    out[k] = withoutLevels(v[k], here, dropped); });
  return out;
}
/* the text of the fields, through the writers' one rule (namerefs.js cleanWritten()): reworded where it can be, named in notes; a name no rewording removes is refused.
   A key is skipped by the path skip() accepts: an issue's title, quoted verbatim, and an option's signature, which is code. */
function withoutNames(v, at, skip, notes) {
  if (Array.isArray(v)) return v.map((x, i) => withoutNames(x, `${at}[${i}]`, skip, notes));
  if (typeof v === "string") {
    if (skip(at)) return v;
    const r = cleanWritten(v);
    if (r.out) throw new Refused(`${at} names ${r.left.map(h => JSON.stringify(h)).join(", ")}, an internal name a board never shows (GUIDANCE.md §4): reword it and fill again`);
    if (r.text !== v) notes.push(`${at}: an internal name reworded (${JSON.stringify(r.text.length > 80 ? r.text.slice(0, 79) + "…" : r.text)})`);
    if (r.left.length) notes.push(`${at} names ${r.left.map(h => JSON.stringify(h)).join(", ")}: written as it is; reword it if it names the pipeline's role rather than the code's`);
    return r.text;
  }
  if (!isObj(v)) return v;
  const out = {};
  Object.keys(v).forEach(k => { out[k] = k === "$comment" ? v[k] : withoutNames(v[k], at ? `${at}.${k}` : k, skip, notes); });
  return out;
}
/* A change's identity: a difference names its unit and the entry it changed and says what changed; "no change" is one per unit. A list a fill composed earlier
   may not hold an entry written meanwhile, so these lists are never replaced whole. */
const changeKey = c => JSON.stringify([c.unit == null ? null : c.unit, c.entry == null ? null : c.entry, c.what == null ? null : c.what, c.none === true]);
const KEPT_LISTS = { "impact.units": x => x.unit, "impact.changes": changeKey, "impact.units[].changes": changeKey };
function mergeValue(cur, next, at = "") {
  if (isObj(cur) && isObj(next)) { const out = { ...cur }; Object.keys(next).forEach(k => { out[k] = mergeValue(cur[k], next[k], at ? `${at}.${k}` : k); }); return out; }
  const kept = KEPT_LISTS[at];
  if (kept && Array.isArray(next) && next.every(x => isObj(x) && kept(x) != null) && (cur == null || (Array.isArray(cur) && cur.every(x => isObj(x) && kept(x) != null)))) {
    if (!next.length) return cur == null ? next : cur;
    return mergeList(cur || [], next, kept, at === "impact.units" ? (c, n) => mergeValue(c, n, "impact.units[]") : (c, n) => ({ ...c, ...n }));
  }
  if (Array.isArray(cur) && Array.isArray(next) && next.length) {
    const key = identityOf(next);
    if (key && cur.every(x => isObj(x) && x[key] != null)) return mergeList(cur, next, key, mergeValue);
  }
  return next;
}
function mergeList(cur, next, key, mergeItem) {
  const K = x => String(typeof key === "function" ? key(x) : x[key]);
  const named = new Map(next.map(x => [K(x), x])), kept = [];
  cur.forEach(x => { const n = named.get(K(x)); if (!n) kept.push(x); else if (!n.$remove) kept.push(mergeItem(x, n)); });
  next.filter(n => !n.$remove && !cur.some(x => K(x) === K(n))).forEach(n => { const { $remove, ...rest } = n; kept.push(rest); });
  /* when the fill names every item, its order wins */
  if (cur.every(x => named.has(K(x)))) { const at = new Map(next.map((n, i) => [K(n), i])); kept.sort((a, b) => at.get(K(a)) - at.get(K(b))); }
  return kept;
}
function mergeRow(cur, next, notes, plan) {
  const out = mergeValue(cur, next), id = cur.id;
  if (isObj(cur.asBuilt) && isObj(next.asBuilt) && typeof cur.asBuilt.state === "string" && typeof next.asBuilt.state === "string" && next.asBuilt.state !== cur.asBuilt.state) {
    /* an event's state stands against a fill's that is no outcome; a complete or landed unit stays so */
    const partStored = next.asBuilt.state === "partially-built" && !cur.unit && !["dropped", "deferred"].includes(cur.asBuilt.state) && typeof out.asBuilt.summary === "string" && !!out.asBuilt.summary.trim() && [null, "partially-built"].includes(lib.stagedState(plan, cur));
    if ((ROW_DERIVED.includes(next.asBuilt.state) && !partStored) || (cur.unit && ["complete", ...lib.UNIT_LANDED].includes(cur.asBuilt.state))) { out.asBuilt.state = cur.asBuilt.state; notes.push(`${id}: asBuilt.state stays ${cur.asBuilt.state}, the events'`); }
  }
  if (isObj(cur.unit) && isObj(next.unit)) UNIT_KEPT.forEach(k => { if (cur.unit[k] != null && next.unit[k] !== cur.unit[k]) { out.unit[k] = cur.unit[k]; if (next.unit[k] !== undefined) notes.push(`${id}: unit.${k} stays ${JSON.stringify(cur.unit[k])}, the filing's or embed.js's`); } });
  return out;
}
/* The fill onto a board, in memory. Returns { plan, merged, notes, dropped }; throws Refused on a field the events own. */
function mergeFill(board, fields, planDir) {
  if (!isObj(fields)) throw new Refused("the fields are not a JSON object");
  const dropped = [], notes = [], tSkip = titleSkip(null, "plan-board"), F = withoutNames(withoutLevels(fields, "", dropped), "", at => tSkip(at) || /^rows\[\d+\]\.options\[\d+\]\.signature$/.test(at) || /^trailFix\[\d+\]\.label$|^wip\.(?:interview|asked|questions|stages|qa|open)\[\d+\]\.(?:text|question|id|pass)$/.test(at), notes), plan = JSON.parse(JSON.stringify(board)), merged = [];
  /* the qa passes by name, "Quality Review N" (passnames.js): the fill's own text and the board's, so an item named by its text still matches */
  { const fr = lib.renamePassesIn(F, titleSkip(null, "plan-board")), br = lib.renamePasses(plan);
    if (fr.length) notes.push(`the fill's ${fr.slice(0, 4).join(", ")}${fr.length > 4 ? ", …" : ""}: a qa pass written "${lib.PASS_NAME} N"`); br.forEach(l => notes.push(`the board: ${l}`)); }
  const bad = Object.keys(F).filter(k => OWNED.includes(k) && k !== "wip");
  if (bad.length) throw new Refused(`${bad.join(", ")}: the events own ${bad.length === 1 ? "it" : "them"}, and a fill writes none (fill.js's head says what it may write)`);
  if (F.wip !== undefined) { const off = isObj(F.wip) ? Object.keys(F.wip).filter(k => !WIP_KEYS.includes(k)) : ["(not an object)"]; if (off.length) throw new Refused(`wip.${off.join(", wip.")}: the events own ${off.length === 1 ? "it" : "them"}; a fill's wip names only ${WIP_KEYS.join(", ")}`); }
  const hadUnits = (plan.rows || []).some(r => r && r.unit);
  Object.keys(F).filter(k => !["wip", "trailAdd", "trailFix"].includes(k)).forEach(k => {
    if (k === "rows" && Array.isArray(F.rows)) {
      if (F.rows.some(r => !isObj(r) || typeof r.id !== "string" || !r.id)) throw new Refused("rows: every row names its id");
      plan.rows = mergeList(Array.isArray(plan.rows) ? plan.rows : [], F.rows, "id", (c, n) => mergeRow(c, n, notes, plan));
    } else plan[k] = mergeValue(plan[k], F[k], k);
    merged.push(k);
  });
  /* the two narrow ways into what the events own */
  if (Array.isArray(F.trailAdd)) { plan.trail = Array.isArray(plan.trail) ? plan.trail : []; let n = 0;
    F.trailAdd.forEach(t => { if (!isObj(t) || typeof t.label !== "string" || !t.label.trim()) throw new Refused("trailAdd: every entry has a label");
      if (!plan.trail.some(x => x && x.date === t.date && x.column === t.column && x.label === t.label)) { plan.trail.push(t); n++; } });
    merged.push(`trail +${n}`); }
  /* trailFix: a trail entry reworded in place, found by its label (a text that should never have been written) */
  if (Array.isArray(F.trailFix)) { const trail = Array.isArray(plan.trail) ? plan.trail : [];
    F.trailFix.forEach(t => { if (!isObj(t) || typeof t.label !== "string" || typeof t.to !== "string" || !t.to.trim()) throw new Refused("trailFix: every entry has a label and a to");
      const hit = trail.filter(x => isObj(x) && x.label === t.label); if (!hit.length) { notes.push(`trailFix: no trail entry reads ${JSON.stringify(t.label)}: skipped`); return; }
      hit.forEach(x => { x.label = t.to; }); merged.push(`trail reworded ${hit.length}`); }); }
  const w = plan.wip = isObj(plan.wip) ? plan.wip : {};
  if (isObj(F.wip)) {
    const by = (name, key, list, set) => { (Array.isArray(list) ? list : []).forEach(x => { const have = (Array.isArray(w[name]) ? w[name] : []).find(y => isObj(y) && y[key] === (x || {})[key]);
      if (!have) { notes.push(`wip.${name} has no ${JSON.stringify((x || {})[key])}: skipped`); return; } set(have, x); merged.push(`wip.${name} ${have[key]}`); }); };
    const ids = new Set((plan.rows || []).map(r => r && r.id)), ownRows = (r) => (Array.isArray(r) ? r : []).filter(id => ids.has(id));
    by("stages", "id", F.wip.stages, (h, x) => { h.rows = ownRows(x.rows); });
    by("questions", "question", F.wip.questions, (h, x) => { h.rows = ownRows(x.rows); });
    by("interview", "text", F.wip.interview, (h, x) => { if (x.answer !== undefined) h.answer = x.answer; });
    /* a halt's question by its text (and its step, where the fill names one: the same text put in two steps) */
    (Array.isArray(F.wip.asked) ? F.wip.asked : []).forEach(x => { const hit = (Array.isArray(w.asked) ? w.asked : []).filter(y => isObj(y) && isObj(x) && y.text === x.text && (x.step == null || y.step === x.step));
      if (!hit.length) { notes.push(`wip.asked has no ${JSON.stringify((x || {}).text)}: skipped`); return; }
      hit.forEach(h => { if (x.answer !== undefined) h.answer = x.answer; }); merged.push(`wip.asked ${String(x.text).slice(0, 40)}`); });
    if (F.wip.interview || F.wip.asked) lib.syncAsked(w);
    by("qa", "pass", F.wip.qa, (h, x) => { if (x.note !== undefined) h.note = x.note; });
    /* an open point's recorded resolution time corrected (a factual error, RULES §2): by its text, on wip.open and on every snapshot holding the same record */
    (Array.isArray(F.wip.open) ? F.wip.open : []).forEach(x => {
      if (!isObj(x) || typeof x.text !== "string" || !lib.isTime(x.resolved)) throw new Refused("wip.open: every entry names an open point by its text and the UTC ISO time it was resolved at ({ text, resolved })");
      const hit = (Array.isArray(w.open) ? w.open : []).find(y => isObj(y) && y.text === x.text);
      if (!hit) { notes.push(`wip.open has no ${JSON.stringify(x.text)}: skipped`); return; }
      if (!lib.isTime(hit.resolved)) throw new Refused(`wip.open ${JSON.stringify(x.text)} is not resolved: an event resolves an open point, a fill only corrects the time it was recorded at`);
      if (lib.isTime(w.updated) && Date.parse(x.resolved) > Date.parse(w.updated)) throw new Refused(`wip.open ${JSON.stringify(x.text)}: ${x.resolved} is after the board's last event (${w.updated})`);
      if (hit.resolved === x.resolved) return;
      const old = hit.resolved; let n = 0;
      const fix = list => (Array.isArray(list) ? list : []).forEach(y => { if (isObj(y) && y.text === x.text && y.resolved === old) { y.resolved = x.resolved; n++; } });
      fix(w.open); Object.values(isObj(w.history) ? w.history : {}).forEach(vs => (Array.isArray(vs) ? vs : []).forEach(v => isObj(v) && fix(v.open)));
      merged.push(`wip.open resolved ${old} → ${x.resolved} (${n} record${n === 1 ? "" : "s"})`); });
    if (isObj(F.wip.current)) { const C = F.wip.current, cells = Array.isArray(C.cells) ? C.cells.map(String) : [];
      if (typeof C.step !== "string") throw new Refused("wip.current names the step its glow is for ({ step, cells })");
      if (lib.shownStep(w) === C.step) { w.current = cells; merged.push(`wip.current at ${C.step}`); } else notes.push(`wip.current was for ${C.step}; the board has moved on to ${lib.shownStep(w)}: left as the event set it`); }
    if (F.wip.detail !== undefined) { if (typeof F.wip.detail !== "string" || !F.wip.detail.trim()) throw new Refused("wip.detail is a text: the WIP line"); if (w.detail !== F.wip.detail) { w.detail = F.wip.detail; merged.push("wip.detail"); } }
    /* what waits on the user, written by the presenter where the fast path could not write the run's own text (an internal name or a work level in
       it). While the board waits: wip.waitingOn, and the stop's trail entry ("… waiting on you (<text>)") and a detail made of it ("Waiting on you:
       <text>") follow it, so the record says one thing. Once an event has taken the board out of the stop: the last stop's trail entry alone, its
       record, and a wip.waitingOn and wip.resume the event left standing cleared */
    if (F.wip.waitingOn !== undefined) {
      if (typeof F.wip.waitingOn !== "string" || !F.wip.waitingOn.trim()) throw new Refused("wip.waitingOn is a text: what waits on the user");
      const now = F.wip.waitingOn.trim(), trail = Array.isArray(plan.trail) ? plan.trail : [], quoting = /waiting on you \(([\s\S]*)\)$/;
      if (["halted", "escalated"].includes(w.step)) { const old = w.waitingOn;
        if (old !== now) { w.waitingOn = now; merged.push("wip.waitingOn");
          if (typeof old === "string" && old) {
            if (w.detail === `Waiting on you: ${old}`) { w.detail = `Waiting on you: ${now}`; merged.push("wip.detail"); }
            const t = trail.filter(x => isObj(x) && typeof x.label === "string" && x.label.endsWith(`waiting on you (${old})`)).pop();
            if (t) { t.label = t.label.slice(0, t.label.length - old.length - 1) + now + ")"; merged.push("the stop's trail entry"); } } } }
      else { const t = trail.filter(x => isObj(x) && typeof x.label === "string" && quoting.test(x.label)).pop();
        if (!t) notes.push(`wip.waitingOn: the board is at ${w.step} and its trail records no stop: skipped`);
        else if (t.label.match(quoting)[1] !== now) { t.label = t.label.replace(quoting, `waiting on you (${now})`); merged.push("the last stop's trail entry"); }
        if (w.waitingOn != null || w.resume != null) { w.waitingOn = null; w.resume = null; merged.push("wip.waitingOn and wip.resume, left standing after the stop, cleared"); } }
    }
  }
  /* a board whose branch-cut read no row of the plan's stage table catches it up (lib.js catchUpStageTable(), as the next event would) */
  if (planDir && !["built", "abandoned"].includes(plan.status)) { const enr = [], n = lib.catchUpStageTable(w, planDir, stageNope, enr); if (n) merged.push(`wip.stages: ${n} from the plan's stage table, caught up`); enr.forEach(x => notes.push(x)); }
  /* what follows from new rows */
  const rowsNow = Array.isArray(plan.rows) ? plan.rows : [];
  if (plan.kind === "tracking" && !hadUnits && rowsNow.some(r => r && r.unit) && w.next == null) { const nx = lib.nextUnit(plan); if (nx) { w.next = nx.id; merged.push(`wip.next ${nx.id}`); } }
  /* a blocker the fill names by unit number ({ unit: k }) whose unit is filed already is written as its issue number (lib.js mapUnitBlockers()) */
  if (F.rows) lib.mapUnitBlockers(plan).forEach(m => notes.push(`${m}: that unit is filed, so its issue number is written`));
  if (F.rows) { const st = lib.shownStep(w), stopped = ["halted", "escalated"].includes(w.step);
    if (st === "research") { const g = lib.researchGlow(plan).current; if (JSON.stringify(g) !== JSON.stringify(w.current || [])) { w.current = g; merged.push("wip.current, the research glow"); } }
    if (st === "sub-issues" && !stopped) { const g = lib.filingGlow(plan, st); if (JSON.stringify(g) !== JSON.stringify(w.current || [])) { w.current = g; merged.push("wip.current, the filing glow"); } } }
  return { plan, merged, notes, dropped };
}

/* The files a fill may rewrite: the board's, and its parent tracking board's, which embed.js re-embeds. */
const FILES = ["plan.json", "dashboard.html", "plan.js"];
function snapshot(dirs) { const m = new Map(); dirs.forEach(d => FILES.forEach(f => { const p = path.join(d, f); m.set(p, fs.existsSync(p) ? fs.readFileSync(p) : null); })); return m; }
function restore(snap) { for (const [p, old] of snap) { if (old === null) fs.rmSync(p, { force: true }); else if (!fs.existsSync(p) || Buffer.compare(fs.readFileSync(p), old) !== 0) lib.atomicWrite(p, old); } }
const checkBoard = (dir, root) => { const r = cp.spawnSync(process.execPath, [path.join(__dirname, "check.js"), dir, ...(root ? ["--root", root] : [])], { encoding: "utf8", windowsHide: true });
  return { status: r.status, fails: (r.stdout || "").split(/\r?\n/).filter(l => /^FAIL/.test(l)), warns: (r.stdout || "").split(/\r?\n/).filter(l => /^warn/.test(l)).length }; };

function main() {
  const args = process.argv.slice(2), USAGE = "usage: node fill.js <folder> --fields <fields.json> [--root <repo>] [--json]";
  require("../../system/scripts/cliargs.js").strict(args, { usage: USAGE, valued: ["fields", "root"], flags: ["json"], min: 1, max: 1 });
  const given = args.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--fields", "--root"].includes(args[i - 1]))), fieldsFile = lib.opt(args, "fields", null), json = lib.flag(args, "json");
  const S = { fill: null, board: given, merged: [], notes: [], dropped: [], check: null, error: null };
  const say = code => { if (json) console.log(JSON.stringify(S)); else [["fill", S.fill], ["board", S.board], ["merged", S.merged.join(", ") || "nothing"], ["notes", S.notes.join(" | ") || null], ["dropped", S.dropped.length ? `${S.dropped.join(", ")}: a work level is never written` : null], ["check", S.check], ["error", S.error]].filter(([, v]) => v != null).forEach(([k, v]) => console.log(`${k}: ${v}`)); process.exit(code); };
  if (!given || !fieldsFile) { console.error(USAGE); process.exit(2); }
  const base = lib.opt(args, "root", null), dir = path.resolve(base || process.cwd(), given), planFile = path.join(dir, "plan.json");
  if (!fs.existsSync(planFile)) { S.fill = "refused"; S.error = `${given} holds no plan.json: the board is laid by its sized event`; say(2); }
  const root = lib.treeRoot(dir) || base || null;
  /* a view copy locks and checks in the tree it sits in; its own parent copy is re-embedded with it */
  let fields; try { fields = JSON.parse(fs.readFileSync(fieldsFile, "utf8")); } catch (e) { S.fill = "refused"; S.error = `the fields ${fieldsFile}: ${e.message}`; say(2); }
  try { if (root) lib.lockTree(root, "fill.js"); } catch (e) { S.fill = "failed"; S.error = e.message; say(1); }
  /* everything below is read here, under the lock: the latest board, whatever the events wrote while the fill was composed */
  const text = fs.readFileSync(planFile, "utf8"), eol = /\r\n/.test(text) ? "\r\n" : "\n"; let board;
  try { board = JSON.parse(text); } catch (e) { S.fill = "failed"; S.error = `plan.json does not parse: ${e.message}`; say(1); }
  let R; try { R = mergeFill(board, fields, lib.viewSource(dir) || dir); } catch (e) { if (!(e instanceof Refused)) throw e; S.fill = "refused"; S.error = e.message; say(2); }
  Object.assign(S, { merged: R.merged, notes: R.notes, dropped: R.dropped });
  const { embed } = require("./embed.js"), src = lib.viewSource(dir) || dir, up = lib.parentFolder(src, R.plan), upCopy = up && src !== dir ? (lib.viewOf(up, lib.viewParts(dir).root) || {}).dir : up;
  const snap = snapshot([dir, ...(upCopy && fs.existsSync(path.join(upCopy, "plan.json")) ? [upCopy] : [])]);
  const write = () => { lib.atomicWrite(planFile, (JSON.stringify(R.plan, null, 2) + "\n").replace(/\n/g, eol)); return embed(dir); };
  try {
    const E = write(); if (E.parent && E.parent.error) S.notes.push(`the parent tracking board could not be re-embedded: ${E.parent.error}`);
    if (E.copies && E.copies.skipped) S.notes.push(E.copies.skipped);
    let C = checkBoard(dir, src !== dir ? root : null);
    if (C.status !== 0) {
      /* a fill may not add a failure; one the board already had is what a fill may be on its way to repair, and is said */
      const after = C.fails, afterBytes = snapshot([dir]); restore(snap);
      const before = checkBoard(dir, src !== dir ? root : null), added = after.filter(l => !before.fails.includes(l));
      if (added.length) { S.fill = "failed"; S.check = `FAIL: ${added.slice(0, 6).join(" | ")}`; S.error = "the fill would add a failure to the board: every file put back as it was"; say(1); }
      for (const [p, b] of afterBytes) if (b !== null) lib.atomicWrite(p, b);
      embed(dir); C = { ...checkBoard(dir, src !== dir ? root : null) };
      S.check = `the board still fails what it failed before: ${C.fails.slice(0, 4).join(" | ")}`;
    } else S.check = `pass (${C.warns} warning${C.warns === 1 ? "" : "s"})`;
  } catch (e) { restore(snap); S.fill = "failed"; S.error = `${e.message}: every file put back as it was`; say(1); }
  S.fill = "ok"; say(0);
}
if (require.main === module) main();
module.exports = { mergeFill, Refused, OWNED, changeKey };
