#!/usr/bin/env node
// The question log's reader. It reads questions.jsonl (and, for `check`, the
// ledger and the files the premises name) and writes nothing.
//
//   node questions.js queue    [--log <path>] [--json]   open questions in blocking order
//   node questions.js waiting  [--log <path>]            the same as JSON, for state.json's waitingOnUser
//   node questions.js check    [--log <path>] [--ledger <path>] [--id q-<n>] [--json]
//                                                        premises read again, ledger events that may answer
//   node questions.js stats    [--log <path>]            counts by status
//   node questions.js validate [--log <path>]            every line parses and has the record's keys
//
// The record and the blocking order are defined in the Archivist's brief
// (its section The questions). Paths default to
// ~/.claude/admin-team/; a path in a premise may start with `~/`.
// Exit codes: 0 clean, 1 findings (an invalid line, a cycle, a dangling
// `blockedBy`, a premise that reads otherwise), 2 usage or read error.

'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const STATUSES = ['open', 'answered', 'withdrawn', 'superseded', 'hooked'];
const KEYS = ['id', 'ts', 'by', 'lane', 'ledgerId', 'about', 'text', 'options', 'recommendation', 'blocks',
  'blockedBy', 'urgency', 'pin', 'premises', 'asked', 'putOff', 'status', 'answer', 'checked', 'note'];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
function home(p) { return p && p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p; }

const teamDir = path.join(os.homedir(), '.claude', 'admin-team');
const logPath = home(arg('--log', path.join(teamDir, 'questions.jsonl')));
const ledgerPath = home(arg('--ledger', path.join(teamDir, 'ledger.jsonl')));
const asJson = process.argv.includes('--json');

function readLog(p) {
  if (!fs.existsSync(p)) return { rows: [], bad: [] };
  const rows = []; const bad = [];
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    try { rows.push(Object.assign(JSON.parse(line), { _line: i + 1 })); } catch (e) { bad.push({ line: i + 1, why: 'not JSON' }); }
  });
  return { rows, bad };
}
function num(id) { const m = /^q-(\d+)$/.exec(id || ''); return m ? Number(m[1]) : Infinity; }
function external(q) { return (q.blocks || []).some(b => b && b.requester); }
function pinRank(q) { return q.pin === 'first' ? 0 : q.pin === 'last' ? 2 : 1; }

// Rules 2 to 6 of the blocking order; rule 1 (blockedBy) is the ordering constraint.
function compare(a, b) {
  return (pinRank(a) - pinRank(b))
    || ((a.urgency === 'blocking' ? 0 : 1) - (b.urgency === 'blocking' ? 0 : 1))
    || ((external(a) ? 0 : 1) - (external(b) ? 0 : 1))
    || ((b.blocks || []).length - (a.blocks || []).length)
    || String(a.ts || '').localeCompare(String(b.ts || ''))
    || (num(a.id) - num(b.id));
}

// Open questions in blocking order. A question waits behind every open question
// its blockedBy names; among those free to go, compare() decides. A cycle is
// reported and broken by placing the best of what remains.
function order(rows) {
  const open = rows.filter(q => q.status === 'open');
  const byId = new Map(open.map(q => [q.id, q]));
  const known = new Set(rows.map(q => q.id));
  const dangling = [];
  for (const q of open) for (const d of q.blockedBy || []) if (!known.has(d)) dangling.push({ id: q.id, blockedBy: d });
  const placed = new Set(); const out = []; const cycles = [];
  while (out.length < open.length) {
    const free = open.filter(q => !placed.has(q.id)
      && (q.blockedBy || []).every(d => !byId.has(d) || placed.has(d)));
    let next;
    if (free.length) next = free.sort(compare)[0];
    else {
      const rest = open.filter(q => !placed.has(q.id)).sort(compare);
      cycles.push(rest.map(q => q.id));
      next = rest[0];
    }
    placed.add(next.id); out.push(next);
  }
  return { queue: out, cycles, dangling };
}

function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

// Reads one premise again. Returns { now, holds } or { now: null, holds: null } for a judgement.
function readPremise(pr, ledger) {
  const c = pr.check;
  if (!c) return { now: null, holds: null, note: 'a judgement: read it again yourself' };
  const p = home(c.path);
  try {
    switch (c.type) {
      case 'exists': { const now = fs.existsSync(p); return { now, holds: String(now) === String(pr.as) }; }
      case 'file-sha256': { const now = fs.existsSync(p) ? sha256(p) : null; return { now, holds: now === pr.as }; }
      case 'file-contains': {
        const now = fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes(c.text);
        return { now, holds: String(now) === String(pr.as) };
      }
      case 'ledger-state': {
        let now = null;
        for (const e of ledger) if (e.id === c.id && e.type === 'state') now = e.state;
        return { now, holds: now === pr.as };
      }
      default: return { now: null, holds: null, note: `unknown check type ${c.type}` };
    }
  } catch (e) { return { now: null, holds: false, note: e.message }; }
}

function readLedger(p) {
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (e) { /* a torn last line is skipped */ }
  }
  return out;
}

const ENDED = ['done', 'cancelled', 'rejected', 'stopped'];
function check(q, ledger) {
  const since = (q.asked && q.asked[0]) || q.ts || '';
  const names = new Set([q.id, q.ledgerId].filter(Boolean));
  const mayAnswer = ledger.filter(e => (e.ts || '') >= since
    && (e.event === 'user-decision' || e.event === 'user-direction')
    && (names.has(e.id) || names.has(e.question) || names.has(e.qid)))
    .map(e => ({ ts: e.ts, event: e.event, id: e.id, words: e.words }));
  const blockRefs = new Set((q.blocks || []).filter(b => b && b.kind === 'request').map(b => b.ref));
  const ended = [];
  for (const e of ledger) {
    if (e.type === 'state' && blockRefs.has(e.id) && ENDED.includes(e.state) && (e.ts || '') >= since) {
      ended.push({ ts: e.ts, id: e.id, state: e.state });
    }
  }
  const premises = (q.premises || []).map(pr => Object.assign({ fact: pr.fact, as: pr.as }, readPremise(pr, ledger)));
  return { id: q.id, mayAnswer, ended, premises, changed: premises.some(p => p.holds === false) };
}

function main() {
  const cmd = process.argv[2];
  const { rows, bad } = readLog(logPath);
  if (cmd === 'validate') {
    const problems = bad.slice();
    const seen = new Set();
    for (const q of rows) {
      for (const k of KEYS) if (!(k in q)) problems.push({ line: q._line, why: `missing ${k}` });
      if (!/^q-\d+$/.test(q.id || '')) problems.push({ line: q._line, why: 'id is not q-<n>' });
      if (seen.has(q.id)) problems.push({ line: q._line, why: `duplicate ${q.id}` });
      seen.add(q.id);
      if (!STATUSES.includes(q.status)) problems.push({ line: q._line, why: `status ${q.status}` });
      if (!['blocking', 'optional'].includes(q.urgency)) problems.push({ line: q._line, why: `urgency ${q.urgency}` });
    }
    problems.forEach(p => console.log(`line ${p.line}: ${p.why}`));
    console.log(problems.length ? `FINDINGS: ${problems.length}` : `OK: ${rows.length} question(s)`);
    return problems.length ? 1 : 0;
  }
  if (cmd === 'stats') {
    const c = {}; rows.forEach(q => { c[q.status] = (c[q.status] || 0) + 1; });
    console.log(JSON.stringify({ total: rows.length, byStatus: c }));
    return bad.length ? 1 : 0;
  }
  if (cmd === 'queue' || cmd === 'waiting') {
    const { queue, cycles, dangling } = order(rows);
    if (cmd === 'waiting') {
      console.log(JSON.stringify(queue.map(q => ({ id: q.id, lane: q.lane, urgency: q.urgency, text: q.text }))));
      return 0;
    }
    if (asJson) console.log(JSON.stringify({ queue: queue.map(q => q.id), cycles, dangling }));
    else {
      queue.forEach((q, i) => console.log(`${i + 1}. ${q.id} [${q.urgency}${q.pin ? ', pin ' + q.pin : ''}${q.lane ? ', ' + q.lane : ''}] ${q.text}`));
      cycles.forEach(c => console.log(`CYCLE: ${c.join(' -> ')}`));
      dangling.forEach(d => console.log(`DANGLING: ${d.id} blockedBy ${d.blockedBy}`));
      if (!queue.length) console.log('no open questions');
    }
    return cycles.length || dangling.length ? 1 : 0;
  }
  if (cmd === 'check') {
    const ledger = readLedger(ledgerPath);
    const only = arg('--id', null);
    const results = rows.filter(q => q.status === 'open' && (!only || q.id === only)).map(q => check(q, ledger));
    if (asJson) console.log(JSON.stringify(results));
    else for (const r of results) {
      console.log(`${r.id}: ${r.changed ? 'CHANGED' : 'holds'}`);
      r.premises.forEach(p => console.log(`  premise ${p.holds === null ? 'unchecked' : p.holds ? 'holds' : 'CHANGED'}: ${p.fact}${p.note ? ' (' + p.note + ')' : ''}`));
      r.mayAnswer.forEach(e => console.log(`  may answer: ${e.ts} ${e.event} ${e.id}`));
      r.ended.forEach(e => console.log(`  ended: ${e.ts} ${e.id} ${e.state}`));
    }
    return results.some(r => r.changed) ? 1 : 0;
  }
  console.error('usage: questions.js queue|waiting|check|stats|validate [--log <path>] [--ledger <path>] [--id q-<n>] [--json]');
  return 2;
}

if (require.main === module) {
  try { process.exitCode = main(); } catch (e) { console.error(e.message); process.exitCode = 2; }
}
module.exports = { order, compare, check, readPremise };
