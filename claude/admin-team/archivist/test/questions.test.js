#!/usr/bin/env node
// Tests for questions.js on a fixture log it builds itself.
//   node questions.test.js --dir <an empty scratch folder>
// It writes only under --dir.

'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const i = process.argv.indexOf('--dir');
if (i < 0) { console.error('usage: questions.test.js --dir <scratch folder>'); process.exit(2); }
const dir = path.resolve(process.argv[i + 1]);
fs.mkdirSync(dir, { recursive: true });
const script = path.join(__dirname, '..', 'questions.js');

let pass = 0; let fail = 0;
function ok(cond, name) { if (cond) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}`); } }
function run(args) {
  try { return { code: 0, out: execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
}
function q(id, over) {
  return Object.assign({
    id, ts: '2026-11-13T00:00:00Z', by: 'coordinator', lane: null, ledgerId: null,
    about: { kind: 'other', ref: null }, text: `question ${id}`, options: [], recommendation: null,
    blocks: [], blockedBy: [], urgency: 'optional', pin: null, premises: [],
    asked: ['2026-11-13T00:00:00Z'], putOff: [], status: 'open', answer: null, checked: null, note: null,
  }, over);
}
function write(name, rows) { const p = path.join(dir, name); fs.writeFileSync(p, rows.map(r => JSON.stringify(r)).join('\n') + '\n'); return p; }

// --- the ordering rules, one fixture each -------------------------------------
const f = path.join(dir, 'target.txt'); fs.writeFileSync(f, 'alpha beta\n');
const log1 = write('order.jsonl', [
  q('q-1', { ts: '2026-11-13T01:00:00Z' }),                                                // optional, old
  q('q-2', { urgency: 'blocking', blocks: [{ kind: 'lane', ref: 'direction', requester: null }] }),
  q('q-3', { urgency: 'blocking', blocks: [{ kind: 'request', ref: 'run/1', requester: 'run-a' }] }), // another session waits
  q('q-4', { urgency: 'blocking', blocks: [{ kind: 'lane', ref: 'a' }, { kind: 'lane', ref: 'b' }] }), // holds more
  q('q-5', { pin: 'first' }),
  q('q-6', { pin: 'last', urgency: 'blocking' }),
  q('q-7', { urgency: 'blocking', blocks: [{ kind: 'request', ref: 'run/2', requester: 'run-b' }], blockedBy: ['q-1'] }),
  q('q-8', { status: 'answered' }),
  q('q-9', { ts: '2026-11-12T00:00:00Z' }),                                                // optional, older than q-1
]);
let r = run(['queue', '--log', log1, '--json']);
const order1 = JSON.parse(r.out).queue;
ok(r.code === 0, 'queue: exit 0 with no cycle');
ok(order1[0] === 'q-5', 'rule 2: pin first leads');
ok(order1[order1.length - 1] === 'q-6', 'rule 2: pin last ends, even when blocking');
ok(order1.indexOf('q-3') < order1.indexOf('q-4'), 'rule 4: another session waiting goes before team-only work');
ok(order1.indexOf('q-4') < order1.indexOf('q-2'), 'rule 5: holding more goes earlier');
ok(order1.indexOf('q-2') < order1.indexOf('q-9'), 'rule 3: blocking before optional');
ok(order1.indexOf('q-9') < order1.indexOf('q-1'), 'rule 6: the older first');
ok(order1.indexOf('q-1') < order1.indexOf('q-7'), 'rule 1: waits behind its open blocker, whatever else it has');
ok(!order1.includes('q-8'), 'only open questions are queued');

// --- blockedBy chains, cycles, dangling ----------------------------------------
const log2 = write('chain.jsonl', [
  q('q-1', { urgency: 'blocking', blockedBy: ['q-2'] }),
  q('q-2', { blockedBy: ['q-3'] }),
  q('q-3', {}),
  q('q-4', { blockedBy: ['q-5'] }),
  q('q-5', { status: 'answered' }),
]);
r = run(['queue', '--log', log2, '--json']);
const order2 = JSON.parse(r.out).queue;
ok(order2.indexOf('q-3') < order2.indexOf('q-2') && order2.indexOf('q-2') < order2.indexOf('q-1'), 'a chain is put root first');
ok(order2.indexOf('q-4') >= 0, 'a blocker that is closed no longer holds a question');

const log3 = write('cycle.jsonl', [q('q-1', { blockedBy: ['q-2'] }), q('q-2', { blockedBy: ['q-1'] }), q('q-3', { blockedBy: ['q-99'] })]);
r = run(['queue', '--log', log3]);
ok(r.code === 1 && /CYCLE: q-1 -> q-2/.test(r.out), 'a cycle is reported, exit 1');
ok(/DANGLING: q-3 blockedBy q-99/.test(r.out), 'a blockedBy naming no question is reported');
ok(/q-1/.test(r.out) && /q-2/.test(r.out), 'the questions in a cycle are still listed');

// --- waiting: what state.json's waitingOnUser is derived from ------------------
r = run(['waiting', '--log', log1]);
const waiting = JSON.parse(r.out);
ok(waiting.map(w => w.id).join() === order1.join(), 'waiting lists the open ids in the queue order');
ok(waiting[0].text === 'question q-5' && 'lane' in waiting[0] && 'urgency' in waiting[0], 'waiting carries id, lane, urgency, text');

// --- check: premises read again, ledger events that may answer -----------------
const ledger = write('ledger.jsonl', [
  { ts: '2026-11-12T23:00:00Z', event: 'user-decision', id: 'x/choice-1', words: 'before it was asked' },
  { ts: '2026-11-13T02:00:00Z', event: 'user-decision', id: 'x/choice-1', words: 'a' },
  { ts: '2026-11-13T02:00:00Z', type: 'state', id: 'run/1', state: 'cancelled' },
  { ts: '2026-11-13T03:00:00Z', type: 'state', id: 'job/7', state: 'done' },
]);
const log4 = write('check.jsonl', [
  q('q-1', { ledgerId: 'x/choice-1', premises: [
    { fact: 'the file says alpha', source: 'target.txt:1', check: { type: 'file-contains', path: f, text: 'alpha' }, as: true },
    { fact: 'the job is running', source: 'ledger', check: { type: 'ledger-state', id: 'job/7' }, as: 'started' },
    { fact: 'worth asking', source: 'judgement', check: null, as: null },
  ] }),
  q('q-2', { blocks: [{ kind: 'request', ref: 'run/1', requester: 'run-a' }], premises: [
    { fact: 'the file is as read', source: 'target.txt', check: { type: 'file-sha256', path: f }, as: require('crypto').createHash('sha256').update('alpha beta\n').digest('hex') },
    { fact: 'the file exists', source: 'target.txt', check: { type: 'exists', path: f }, as: true },
  ] }),
]);
r = run(['check', '--log', log4, '--ledger', ledger, '--json']);
const res = JSON.parse(r.out);
const c1 = res.find(x => x.id === 'q-1'); const c2 = res.find(x => x.id === 'q-2');
ok(c1.premises[0].holds === true, 'check: an unchanged file-contains premise holds');
ok(c1.premises[1].holds === false && c1.premises[1].now === 'done', 'check: a changed ledger-state premise is CHANGED');
ok(c1.premises[2].holds === null, 'check: a judgement premise is left to the Archivist');
ok(c1.mayAnswer.length === 1 && c1.mayAnswer[0].words === 'a', 'check: only ledger events since it was first put may answer it');
ok(c2.premises.every(p => p.holds === true), 'check: unchanged sha256 and exists premises hold');
ok(c2.ended.length === 1 && c2.ended[0].state === 'cancelled', 'check: a request it blocks that ended is reported');
ok(r.code === 1, 'check: exit 1 when a premise changed');
fs.writeFileSync(f, 'gamma\n');
r = run(['check', '--log', log4, '--ledger', ledger, '--json', '--id', 'q-2']);
ok(JSON.parse(r.out)[0].premises[0].holds === false, 'check: a changed file-sha256 premise is CHANGED');

// --- validate and stats ----------------------------------------------------------
const log5 = path.join(dir, 'bad.jsonl');
fs.writeFileSync(log5, JSON.stringify(q('q-1')) + '\n{not json\n' + JSON.stringify(q('q-1', { status: 'later' })) + '\n');
r = run(['validate', '--log', log5]);
ok(r.code === 1 && /not JSON/.test(r.out) && /duplicate q-1/.test(r.out) && /status later/.test(r.out), 'validate: bad JSON, duplicate id, unknown status');
r = run(['validate', '--log', log1]);
ok(r.code === 0 && /OK: 9 question/.test(r.out), 'validate: a good log passes');
r = run(['stats', '--log', log1]);
ok(JSON.parse(r.out).byStatus.open === 8, 'stats: counts by status');
r = run(['queue', '--log', path.join(dir, 'none.jsonl')]);
ok(r.code === 0 && /no open questions/.test(r.out), 'a missing log is an empty queue');

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
