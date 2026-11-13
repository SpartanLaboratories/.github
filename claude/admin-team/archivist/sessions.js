#!/usr/bin/env node
// Lists the admin team's sessions and remains with their class. Reads only.
//
//   node sessions.js [--id <id>] [--sizes] [--orphans] [--json]
//
// Classes (the Archivist's brief, The session archive): running (the live
// record whose agent is admin-team), held (another live record names it), kept
// (the inactive session most recent to end), foreign (a transcript in the
// team's folder that is not an admin team session), ready (archived and
// verified, its files not yet deleted), candidate (older: to archive).
// `quiet` is false when any of its stores changed in the last 10 minutes.
// With --id only that session's stores are walked; without it, every row's,
// once, and --sizes takes the bytes from that walk.
// --orphans adds the temp folders of ids no session owns (no transcript or
// folder in any project folder, no live record), with their file count:
// delete-session.js --orphans removes those that hold no file and are quiet.
// Exit 2 when more than one live record names an admin-team agent.

'use strict';
const L = require('./lib');

function main() {
  const P = L.paths();
  const only = L.opt('--id', null);
  let c;
  try { c = L.classify(P, Date.now(), { only }); } catch (e) { console.error(`STOP: ${e.message}`); return 2; }
  let rows = c.rows;
  if (only) rows = rows.filter(r => r.id === only);
  if (L.flag('--sizes')) {
    for (const r of rows) r.bytes = c.bytes.get(r.id);
  }
  if (L.flag('--json')) {
    const out = { running: c.running, held: c.held, stale: c.stale.map(s => s.file), rows };
    if (L.flag('--orphans')) out.orphans = L.orphans(P);
    console.log(JSON.stringify(out, null, 1));
    return 0;
  }
  console.log(`running: ${c.running || 'none'}; held: ${c.held.join(', ') || 'none'}; stale records: ${c.stale.length}`);
  for (const r of rows) {
    console.log(`${r.class.padEnd(9)} ${r.kind.padEnd(7)} ${r.id} ${r.from || '-'} .. ${r.to || '-'}${r.quiet ? '' : ' (changed in the last 10 minutes)'}`
      + `${r.bytes !== undefined ? ' ' + Math.round(r.bytes / 1048576) + ' MB' : ''} [${r.stores.join(', ')}]`);
  }
  if (L.flag('--orphans')) {
    for (const o of L.orphans(P)) console.log(`orphan    temp    ${o.id} ${o.files} file(s)${o.quiet ? '' : ' (changed in the last 10 minutes)'} [${o.paths.length} folder(s)]`);
  }
  if (only && !rows.length) { console.log(`${only}: not an admin team session or remains`); return 1; }
  return 0;
}

process.exitCode = main();
