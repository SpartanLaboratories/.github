#!/usr/bin/env node
// Deletes one archived admin team session's files, after checking again that
// it may; or every session ready for it; or the empty temp folders no session
// owns.
//
//   node delete-session.js <id> --confirm <id> [--dry-run]
//   node delete-session.js --all-ready [--dry-run]      every session archived, verified and not yet deleted
//   node delete-session.js --orphans [--dry-run]        every temp folder no session owns that holds no file
//
// A session is refused unless every check holds: the id is a session id and
// --confirm repeats it; it is an admin team session or remains in the team's
// folder; no live record names it (neither running nor held) and it is not the
// session kept; the archive's index has it verified; its transcript, if still
// there, has the sha256 the index recorded; none of its stores changed in the
// last 10 minutes; and, when it left temp folders, its scratchpad copy
// verifies against the manifest, a description written for every item too
// large to copy. Just before the removal it classifies the session again and
// walks its stores once more, and refuses it if it is no longer older or a
// store changed in the last 10 minutes. Only the stores of the session named,
// or with --all-ready of the sessions ready, are walked. Then it removes, in
// this order, each store that exists: its temp folders (scratchpad, task
// outputs, pasted images, a spent commit message, msg.txt, and a verification
// run's log, verify-full.log), ~/.claude/file-history/<id>/,
// ~/.claude/session-env/<id>/, the session's folder and, last, its transcript.
// --all-ready runs the same checks for each session it takes, one at a time,
// and goes on past a refusal.
//
// An orphan is a temp folder <temp>/<folder>/<id>/ whose id has no transcript
// or folder in any project folder and that no live record names. --orphans
// removes one only when it holds no file, has held none in the last 10
// minutes, and holds no link.
//
// It prints what it removed as JSON, one line per session or orphan, and
// writes nothing else: the Archivist records a session's deletion in the
// archive, the team in the ledger. Never touches ~/.claude/history.jsonl,
// sessions/, a project's memory/ or any other session's files.

'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const SC = require('./scratch-copy');

function say(o) { console.log(JSON.stringify(o)); }

// What a session's temp folder may hold: its scratchpad, its task outputs and
// its pasted images; and, loose beside them, a file of a known kind: a spent
// commit message (msg.txt) or a verification run's log (verify-full.log).
const TEMP_STORES = ['scratchpad', 'tasks', 'images'];
const TEMP_LOOSE = ['msg.txt', 'verify-full.log'];

// The class checks: why the row may not be deleted, or null.
function classRefusal(P, row, id) {
  if (!row) return `${id} is not an admin team session or remains in ${P.project}`;
  if (row.class === 'foreign') return `${id} is not an admin team session`;
  if (row.class === 'running') return `${id} is the running session`;
  if (row.class === 'held') return `${id} is held by a live process`;
  if (row.class === 'kept') return `${id} is the session kept, the most recent to end`;
  return null;
}

// Every check for one session; the paths to remove, or the reason it may not.
function planFor(P, c, id) {
  const row = c.rows.find(r => r.id === id);
  const why = classRefusal(P, row, id);
  if (why) return { refused: why };
  const ix = L.readIndex(P).find(l => l.id === id);
  if (!ix || !ix.verified) return { refused: `${id} has no verified archive in the index` };
  const transcript = path.join(P.project, id + '.jsonl');
  if (fs.existsSync(transcript) && ix.transcriptSha256 && L.sha256File(transcript) !== ix.transcriptSha256) {
    return { refused: `${id}: the transcript changed since it was archived` };
  }
  if (fs.existsSync(transcript) && !ix.transcriptSha256 && row.kind === 'session') return { refused: `${id}: the index records no transcript sha256` };
  if (!row.quiet) return { refused: `${id}: a store changed in the last 10 minutes` };

  const st = L.stores(P, id);
  const temps = st.filter(s => s.store === 'temp');
  let described = [];
  if (temps.length) {
    let v;
    try { v = SC.verify(P, id); } catch (e) { v = { verified: false, why: e.message }; }
    if (!v.verified) return { refused: `${id}: the scratchpad copy does not verify (${v.why || (v.bad || []).join(', ')})` };
    described = v.described || [];
  }

  const plan = [];
  const parentOf = { 'file-history': P.fileHistory, 'session-env': P.sessionEnv, folder: P.project, transcript: P.project };
  for (const s of temps) {
    const parent = path.dirname(s.path);
    if (path.dirname(parent) !== P.temp) return { refused: `${s.path} is not <temp>/<folder>/<id>` };
    const bad = L.safeTarget(parent, id, '', s.path); if (bad) return { refused: `${s.path}: ${bad}` };
    const inside = fs.readdirSync(s.path).filter(n => !TEMP_STORES.includes(n)
      && !(TEMP_LOOSE.includes(n) && fs.lstatSync(path.join(s.path, n)).isFile()));
    if (inside.length) return { refused: `${s.path} holds more than scratchpad/, tasks/, images/ and a loose ${TEMP_LOOSE.join(' or ')}: ${inside.join(', ')}` };
    plan.push(s);
  }
  for (const name of ['file-history', 'session-env', 'folder', 'transcript']) {
    const s = st.find(x => x.store === name); if (!s) continue;
    const bad = L.safeTarget(parentOf[name], id, name === 'transcript' ? '.jsonl' : '', s.path);
    if (bad) return { refused: `${s.path}: ${bad}` };
    plan.push(s);
  }
  return { plan, described, staleRecords: c.stale.filter(s => s.sessionId === id).map(s => s.file) };
}

function removeAll(plan, dry) {
  const removed = [];
  for (const s of plan) {
    const bytes = L.walk(s.path).bytes;
    if (!dry) fs.rmSync(s.path, { recursive: true, force: false });
    removed.push({ store: s.store, path: s.path, bytes });
  }
  return removed;
}

// The last check, just before the removal: the session classified again and
// its stores walked once more, so a class or a store that changed since
// planFor's checks refuses it. Why it may not, or null.
function recheck(P, id) {
  let c;
  try { c = L.classify(P, Date.now(), { only: id }); } catch (e) { return e.message; }
  const row = c.rows.find(r => r.id === id);
  const why = classRefusal(P, row, id);
  if (why) return `${why}, at the last check before removal`;
  if (row.quiet !== true) return `${id}: a store changed in the last 10 minutes, at the last check before removal`;
  return null;
}

function deleteOne(P, c, id, dry) {
  const p = planFor(P, c, id);
  if (p.refused) { say({ id, refused: p.refused }); return 1; }
  const last = recheck(P, id);
  if (last) { say({ id, refused: last }); return 1; }
  const removed = removeAll(p.plan, dry);
  say({ id, dryRun: dry, at: new Date().toISOString(), removed, bytes: removed.reduce((n, r) => n + r.bytes, 0),
    described: p.described, staleRecords: p.staleRecords });
  return 0;
}

function orphans(P, dry) {
  let code = 0;
  for (const o of L.orphans(P)) {
    let why = null;
    if (o.files) why = `holds ${o.files} file(s)`;
    else if (o.links) why = 'holds a link';
    else if (!o.quiet) why = 'changed in the last 10 minutes';
    const plan = [];
    for (const p of o.paths) {
      if (why) break;
      const parent = path.dirname(p);
      if (path.dirname(parent) !== P.temp) why = `${p} is not <temp>/<folder>/<id>`;
      else why = L.safeTarget(parent, o.id, '', p);
      if (!why) plan.push({ store: 'temp', path: p });
    }
    if (why) { say({ orphan: o.id, skipped: why }); continue; }
    try { say({ orphan: o.id, dryRun: dry, at: new Date().toISOString(), removed: removeAll(plan, dry) }); }
    catch (e) { say({ orphan: o.id, failed: e.message }); code = 1; }
  }
  return code;
}

function main() {
  const dry = L.flag('--dry-run');
  const P = L.paths();
  const all = L.flag('--all-ready'); const orph = L.flag('--orphans');
  if (orph) return orphans(P, dry);
  const only = all ? (r => r.class === 'ready') : (process.argv[2] || '');
  let c; try { c = L.classify(P, Date.now(), { only }); } catch (e) { say({ refused: e.message }); return 1; }
  if (all) {
    const done = new Set(L.readIndex(P).filter(l => l.deleted).map(l => l.id));
    const ready = c.rows.filter(r => r.class === 'ready' && !done.has(r.id));
    if (!ready.length) { say({ allReady: 0 }); return 0; }
    let code = 0;
    for (const r of ready) code = Math.max(code, deleteOne(P, c, r.id, dry));
    return code;
  }
  const id = process.argv[2];
  if (!id || !L.ID_RE.test(id)) { say({ refused: `${id} is not a session id` }); return 1; }
  if (L.opt('--confirm', null) !== id) { say({ id, refused: '--confirm does not repeat the id' }); return 1; }
  return deleteOne(P, c, id, dry);
}

if (require.main === module) process.exitCode = main();
module.exports = { planFor, recheck, deleteOne };
