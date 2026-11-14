#!/usr/bin/env node
// Tests for the session scripts on a fixture it builds itself: a stand-in
// .claude folder, temp folder and archive under --dir. Nothing outside --dir
// is read for a session or written.
//   node sessions.test.js --dir <an empty scratch folder>

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const di = process.argv.indexOf('--dir');
if (di < 0) { console.error('usage: sessions.test.js --dir <scratch folder>'); process.exit(2); }
const DIR = path.resolve(process.argv[di + 1]);
if (fs.existsSync(DIR) && fs.readdirSync(DIR).length) { console.error(`${DIR} is not empty`); process.exit(2); }
const BIN = path.join(__dirname, '..');

let pass = 0; let fail = 0;
function ok(cond, name) { if (cond) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}`); } }

// ---- the fixture ---------------------------------------------------------------
const ROOT = path.join(DIR, 'home', '.claude');
const TEMP = path.join(DIR, 'tmp', 'claude');
const TEAM = path.join(ROOT, 'admin-team');
const PROJECT = path.join(ROOT, 'projects', path.join(ROOT, 'admin-team').replace(/[^A-Za-z0-9]/g, '-'));
const ARCHIVE = path.join(TEAM, 'archive');
const COMMON = ['--root', ROOT, '--temp', TEMP, '--archive', ARCHIVE];
const HASH = path.join(TEMP, 'eccc000011112222');
const OLD = path.join(TEMP, 'old-layout-folder');

function uid(n) { const h = crypto.createHash('md5').update('s' + n).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; }
function put(p, text) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
function jl(rows) { return rows.map(r => JSON.stringify(r)).join('\n') + '\n'; }
function ageTree(p, ms) {
  const t = new Date(Date.now() - ms);
  const stack = [p];
  while (stack.length) { const c = stack.pop(); if (!fs.existsSync(c)) continue; if (fs.statSync(c).isDirectory()) fs.readdirSync(c).forEach(n => stack.push(path.join(c, n))); fs.utimesSync(c, t, t); }
}

const S = { s1: uid(1), s2: uid(2), s3: uid(3), kept: uid(4), run: uid(5), held: uid(6), foreign: uid(7), fresh: uid(8), m1: uid(9), m2: uid(10), orphan: uid(11),
  empty: uid(12), emptyFresh: uid(13), emptyLive: uid(14), elsewhere: uid(15) };
const HEADS = '\n\n## Open points\n\nnone\n\n## Relevant to a current session\n\nnone\n';

function transcript(id, day, team, extra) {
  const ts = h => `2026-11-${day}T${h}:00:00.000Z`;
  const rows = [
    { type: 'custom-title', customTitle: 'admin team', sessionId: id },
    team ? { type: 'agent-setting', agentSetting: 'admin-team', sessionId: id } : { type: 'agent-name', agentName: 'other' },
    { type: 'user', timestamp: ts('10'), origin: { kind: 'human' }, message: { role: 'user', content: 'please archive the old sessions' } },
    { type: 'assistant', timestamp: ts('10'), message: { content: [{ type: 'text', text: 'On it.' }, { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls', description: 'List files' } }] } },
    { type: 'user', timestamp: ts('10'), message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'SECRET TOOL OUTPUT' }] } },
    { type: 'user', timestamp: ts('11'), isMeta: true, origin: { kind: 'peer', name: 'run-a' }, message: { content: '<cross-session-message from="run-a">a request</cross-session-message>' } },
    { type: 'assistant', timestamp: ts('11'), message: { content: [{ type: 'tool_use', id: 't2', name: 'Agent', input: { subagent_type: 'archivist', description: 'log a hook' } }] } },
    { type: 'user', timestamp: ts('11'), message: { content: [{ type: 'tool_result', tool_use_id: 't2', content: [{ type: 'text', text: 'Mode log-hook: hook-9 logged' }] }] } },
    { type: 'user', timestamp: ts('12'), isMeta: true, message: { content: '<task-notification>done</task-notification>' } },
    { type: 'assistant', timestamp: ts('12'), message: { content: [{ type: 'tool_use', id: 't3', name: 'AskUserQuestion', input: { questions: [{ question: 'Delete now?' }] } }] } },
    { type: 'user', timestamp: ts('12'), message: { content: [{ type: 'tool_result', tool_use_id: 't3', content: 'yes' }] } },
    { type: 'user', timestamp: ts('13'), isCompactSummary: true, message: { content: 'Summary of the earlier part.' } },
    { type: 'user', timestamp: ts('14'), origin: { kind: 'human' }, message: { role: 'user', content: 'thanks' } },
    { type: 'assistant', timestamp: ts('14'), message: { content: [{ type: 'text', text: 'Done.' }] } },
  ].concat(extra || []);
  put(path.join(PROJECT, id + '.jsonl'), jl(rows));
  put(path.join(PROJECT, id, 'subagents', 'agent-a1.meta.json'), JSON.stringify({ agentType: 'archivist', description: 'log a hook' }));
  put(path.join(PROJECT, id, 'subagents', 'agent-a1.jsonl'), jl([{ type: 'assistant', message: { content: [{ type: 'text', text: 'Final report of a1.' }] } }]));
  put(path.join(PROJECT, id, 'tool-results', 'r1.txt'), 'stored tool result');
  put(path.join(ROOT, 'file-history', id, 'v1'), 'old file');
  fs.mkdirSync(path.join(ROOT, 'session-env', id), { recursive: true });
}
transcript(S.s1, '01', true); transcript(S.s2, '02', true); transcript(S.s3, '03', true);
transcript(S.kept, '10', true); transcript(S.run, '12', true); transcript(S.held, '05', true);
transcript(S.foreign, '04', false); transcript(S.fresh, '06', true);
for (const m of [S.m1, S.m2]) { put(path.join(PROJECT, m, 'subagents', 'agent-b.meta.json'), '{"agentType":"planner"}'); put(path.join(PROJECT, m, 'tool-results', 'x.txt'), 'x'); fs.mkdirSync(path.join(ROOT, 'session-env', m), { recursive: true }); }
put(path.join(PROJECT, 'memory', 'MEMORY.md'), 'memory');
put(path.join(ROOT, 'history.jsonl'), jl([{ sessionId: S.s1, display: 'x' }]));

// Scratchpads: S1 in both layouts, the others in the newer one; an orphan folder.
put(path.join(HASH, S.s1, 'scratchpad', 'cited-abs', 'a.txt'), 'cited by an absolute path');
put(path.join(HASH, S.s1, 'scratchpad', 'cited-rel.json'), '{"cited":"relatively, in span"}');
put(path.join(HASH, S.s1, 'scratchpad', 'k25', 'deep', 'b.txt'), 'cited in words with an ellipsis');
put(path.join(HASH, S.s1, 'scratchpad', 'list-a.txt'), 'cited in words with a colon, first in a list');
put(path.join(HASH, S.s1, 'scratchpad', 'list-b', 'c.txt'), 'cited in words with a colon, in a list');
put(path.join(HASH, S.s1, 'scratchpad', 'list-d.json'), 'cited in words with a colon, last in a list');
put(path.join(HASH, S.s1, 'scratchpad', 'from-question.txt'), 'cited by an open question');
put(path.join(HASH, S.s1, 'scratchpad', 'from-hook.txt'), 'cited by an open hook');
put(path.join(HASH, S.s1, 'scratchpad', 'from-closed-hook.txt'), 'cited only by a closed hook');
put(path.join(HASH, S.s1, 'scratchpad', 'from-proposal.txt'), 'cited by a proposal');
put(path.join(HASH, S.s1, 'scratchpad', 'uncited-big.bin'), Buffer.alloc(2048));
put(path.join(HASH, S.s1, 'tasks', 'task1.output'), 'a task output, cited');
put(path.join(HASH, S.s1, 'images', '1.png'), Buffer.alloc(512)); // a pasted attachment, cited by nothing
put(path.join(HASH, S.s1, 'msg.txt'), 'docs: a spent commit message'); // a loose file of a known kind beside them
put(path.join(HASH, S.s1, 'verify-full.log'), 'BUILD SUCCESSFUL'); // a verification run's log, a loose file of a known kind too
put(path.join(OLD, S.s1, 'scratchpad', 'old.txt'), 'older layout');
for (const id of [S.s2, S.s3, S.kept, S.run, S.held, S.fresh, S.m1]) put(path.join(HASH, id, 'scratchpad', 'x.txt'), 'x');
put(path.join(HASH, S.s2, 'scratchpad', 'huge', 'h.bin'), Buffer.alloc(3 * 1048576));
put(path.join(HASH, S.orphan, 'scratchpad', 'o.txt'), 'an id with no session');
// Empty orphans: one quiet (in both layouts), one fresh, one a live record
// names; and an empty folder whose id has a transcript in another project.
for (const id of [S.empty, S.emptyFresh, S.emptyLive, S.elsewhere]) fs.mkdirSync(path.join(HASH, id, 'scratchpad'), { recursive: true });
fs.mkdirSync(path.join(OLD, S.empty, 'scratchpad'), { recursive: true });
put(path.join(ROOT, 'projects', 'D--Elsewhere', S.elsewhere + '.jsonl'), '{}\n');

// The open records.
put(path.join(TEAM, 'ledger.jsonl'), jl([
  { ts: '2026-11-01T10:30:00Z', event: 'note', what: `kept in ${path.join(HASH, S.s1, 'scratchpad', 'cited-abs', 'a.txt')}` },
  { ts: '2026-11-01T11:30:00Z', event: 'note', what: 'see scratchpad/cited-rel.json for the figures' },
  { ts: '2026-11-02T11:30:00Z', event: 'note', what: 'see scratchpad/x.txt (in S2 span, not S1)' },
  { ts: '2026-11-01T12:00:00Z', event: 'note', what: `browser check (scratchpad ${S.s1.slice(0, 8)} k25/... and more)` },
  { ts: '2026-11-01T12:10:00Z', event: 'note', what: `sweep kept (scratchpad ${S.s1.slice(0, 8)}: list-a.txt, list-b/c.txt, list-gone.txt,list-d.json)` },
  { ts: '2026-11-01T12:30:00Z', event: 'note', what: `output at ${path.join(HASH, S.s1, 'tasks', 'task1.output').replace(/\\/g, '/')}` },
  { ts: '2026-11-01T12:40:00Z', event: 'note', what: `gone: ${path.join(HASH, S.s1, 'scratchpad', 'missing.txt').replace(/\\/g, '/')}` },
  { ts: '2026-11-02T12:00:00Z', event: 'note', what: `huge at ${path.join(HASH, S.s2, 'scratchpad', 'huge').replace(/\\/g, '/')}` },
]));
put(path.join(TEAM, 'state.json'), JSON.stringify({ waitingOnUser: [] }));
put(path.join(TEAM, 'questions.jsonl'), jl([
  { id: 'q-1', ts: '2026-11-13T00:00:00Z', status: 'open', text: `premise in ${path.join(HASH, S.s1, 'scratchpad', 'from-question.txt').replace(/\\/g, '/')}` },
  { id: 'q-2', ts: '2026-11-13T00:00:00Z', status: 'answered', text: `old ${path.join(HASH, S.s1, 'scratchpad', 'uncited-big.bin').replace(/\\/g, '/')}` },
]));
put(path.join(TEAM, 'hooks.jsonl'), jl([
  { id: 'hook-1', ts: '2026-11-13T00:00:00Z', status: 'open', links: [path.join(HASH, S.s1, 'scratchpad', 'from-hook.txt').replace(/\\/g, '/')] },
  { id: 'hook-2', ts: '2026-11-13T00:00:00Z', status: 'done', links: [path.join(HASH, S.s1, 'scratchpad', 'from-closed-hook.txt').replace(/\\/g, '/')] },
]));
put(path.join(TEAM, 'proposals', 'p', 'plan.md'), `draft rests on ${path.join(HASH, S.s1, 'scratchpad', 'from-proposal.txt').replace(/\\/g, '/')}\n`);
put(path.join(ROOT, 'handoffs', 'admin-team.md'), '');

// Live records: the running team, a held session, a stale record.
put(path.join(ROOT, 'sessions', '1.json'), JSON.stringify({ pid: process.pid, sessionId: S.run, agent: 'admin-team', name: 'admin team' }));
put(path.join(ROOT, 'sessions', '2.json'), JSON.stringify({ pid: process.pid, sessionId: S.held, name: 'elsewhere' }));
put(path.join(ROOT, 'sessions', '3.json'), JSON.stringify({ pid: 2147483000, sessionId: S.s2, agent: 'admin-team' }));
put(path.join(ROOT, 'sessions', '5.json'), JSON.stringify({ pid: process.pid, sessionId: S.emptyLive, name: 'just started' }));

ageTree(path.join(DIR, 'home'), 3600e3); ageTree(path.join(DIR, 'tmp'), 3600e3);
// The fresh session changed a minute ago.
fs.utimesSync(path.join(PROJECT, S.fresh + '.jsonl'), new Date(), new Date());
fs.utimesSync(path.join(HASH, S.emptyFresh, 'scratchpad'), new Date(), new Date());

function run(script, args, cwd) {
  try { return { code: 0, out: execFileSync(process.execPath, [path.join(BIN, script), ...args, ...COMMON], { encoding: 'utf8', cwd }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
}
function j(r) { try { return JSON.parse(r.out); } catch (e) { return {}; } }
function exists(p) { return fs.existsSync(p); }

// ---- sessions.js ---------------------------------------------------------------
let r = run('sessions.js', ['--json']);
const cls = Object.fromEntries(j(r).rows.map(x => [x.id, x.class]));
ok(cls[S.run] === 'running', 'sessions: the live admin-team record is the running session');
ok(cls[S.held] === 'held', 'sessions: a session another live record names is held');
ok(cls[S.kept] === 'kept', 'sessions: the inactive session most recent to end is kept');
ok(cls[S.foreign] === 'foreign', 'sessions: a transcript with no admin-team agent setting is foreign');
ok(cls[S.s1] === 'candidate' && cls[S.s2] === 'candidate' && cls[S.m1] === 'candidate', 'sessions: older sessions and remains are candidates');
ok(cls[S.s2] === 'candidate', 'sessions: a record whose process is dead holds nothing');
ok(!(S.orphan in cls), 'sessions: a temp folder with no session is not listed');
ok(j(r).rows.find(x => x.id === S.fresh).quiet === false && j(r).rows.find(x => x.id === S.s1).quiet === true, 'sessions: the 10-minute quiet window');
put(path.join(ROOT, 'sessions', '4.json'), JSON.stringify({ pid: process.pid, sessionId: S.s3, agent: 'admin-team' }));
r = run('sessions.js', []);
ok(r.code === 2 && /more than one live admin-team record/.test(r.out), 'sessions: two live admin-team records stop it');
fs.rmSync(path.join(ROOT, 'sessions', '4.json'));

// ---- the id filter and the sizes ------------------------------------------------------
// The scripts' own functions, in this process, read the same fixture.
process.argv.push(...COMMON);
const L = require(path.join(BIN, 'lib.js'));
const P = L.paths();
const full = j(run('sessions.js', ['--json'])).rows;
const byId = Object.fromEntries(full.map(x => [x.id, x]));
const named = full.map(x => j(run('sessions.js', ['--id', x.id, '--json'])).rows || []);
ok(named.every((rs, i) => rs.length === 1 && rs[0].id === full[i].id && rs[0].class === full[i].class && rs[0].quiet === full[i].quiet)
  && ['running', 'held', 'kept', 'foreign', 'candidate'].every(k => named.some(rs => rs[0] && rs[0].class === k)), 'id filter: with its id named, every session gets the class and quiet of the full sweep, the kept one included');
ok(full.every(x => L.classify(P, Date.now(), { only: x.id }).rows.every(y => y.class === byId[y.id].class && (y.id === x.id ? y.quiet === byId[y.id].quiet : y.quiet === null))), 'id filter: every row keeps its class; only the named row is walked, the others have quiet null');
fs.utimesSync(path.join(HASH, S.s3, 'scratchpad', 'x.txt'), new Date(), new Date());
r = j(run('sessions.js', ['--id', S.s1, '--json']));
ok(r.rows[0].quiet === true && j(run('sessions.js', ['--json'])).rows.find(x => x.id === S.s3).quiet === false, 'id filter: a fresh store in another session leaves the named one quiet; the full sweep still shows it fresh');
ageTree(path.join(HASH, S.s3), 3600e3);
const walkedSize = id => L.stores(P, id).reduce((n, s) => n + L.walk(s.path).bytes, 0);
r = j(run('sessions.js', ['--json', '--sizes']));
ok(r.rows.length === full.length && r.rows.every(x => x.bytes === walkedSize(x.id)) && r.rows.find(x => x.id === S.s2).bytes > 3 * 1048576, 'sizes: the sweep\'s sizes are those of a walk of each row\'s stores');
ok(j(run('sessions.js', ['--id', S.s2, '--json', '--sizes'])).rows[0].bytes === walkedSize(S.s2), 'sizes: --id with --sizes gives the same size');
ok(!/ MB \[/.test(run('sessions.js', []).out) && / MB \[/.test(run('sessions.js', ['--sizes']).out), 'sizes: printed only with --sizes');

// ---- extract-session.js ----------------------------------------------------------
const base = n => path.join(ARCHIVE, 'sessions', 'base', n);
const B1 = base(`2026-11-01-${S.s1.slice(0, 8)}`);
r = run('extract-session.js', [S.s1, B1]);
const counts = j(r).counts || {};
ok(r.code === 0 && counts.userTyped === 2 && counts.team === 2, 'extract: the user\'s words and the team\'s text counted');
ok(counts.crossSession === 1 && counts.taskNotifications === 1 && counts.subagentReports === 1, 'extract: cross-session message, notification, subagent report');
ok(counts.questions === 1 && counts.answers === 1 && counts.compactions === 1 && counts.toolCalls === 3 && counts.subagents === 1, 'extract: question and answer, compaction, tool calls, subagents');
const conv = fs.readFileSync(path.join(B1, 'conversation.md'), 'utf8');
ok(conv.includes('please archive the old sessions') && conv.includes('- tool: Bash — List files'), 'extract: the user\'s words exactly, one line per tool call');
ok(!conv.includes('SECRET TOOL OUTPUT'), 'extract: no tool output');
ok(conv.includes('Final report of a1.'), 'extract: the subagents\' final reports');
ok(fs.readdirSync(B1).sort().join() === 'conversation.md,meta.json', 'extract: writes only conversation.md and meta.json');
ok(run('extract-session.js', [S.run, base('x')]).code === 1, 'extract: refuses the running session');
ok(run('extract-session.js', [S.foreign, base('y')]).code === 1, 'extract: refuses a foreign session');
ok(run('extract-session.js', [S.s2, B1]).code === 1, 'extract: refuses a folder that is not empty');
ok(run('extract-session.js', [S.orphan, base('z')]).code === 1, 'extract: refuses an id that is no admin team session');
const BM = base(`2026-10-01-${S.m1.slice(0, 8)}`);
r = run('extract-session.js', [S.m1, BM]);
ok(r.code === 0 && fs.readFileSync(path.join(BM, 'conversation.md'), 'utf8').includes('tool-results/x.txt'), 'extract: remains get a listing of their folder');

// Input that arrived while the session was busy: queued_command attachments,
// read in transcript order with the rest. A transcript outside the project
// folder, read by the script's own function.
const QT = path.join(DIR, 'queued', 'q.jsonl');
const qa = (ts, a) => ({ type: 'attachment', timestamp: `2026-11-01T${ts}:00.000Z`, uuid: 'u-' + a.source_uuid, attachment: Object.assign({ type: 'queued_command', commandMode: 'prompt' }, a) });
put(QT, jl([
  { type: 'user', timestamp: '2026-11-01T10:00:00.000Z', origin: { kind: 'human' }, message: { role: 'user', content: 'first words' } },
  { type: 'assistant', timestamp: '2026-11-01T10:01:00.000Z', message: { content: [{ type: 'text', text: 'Working.' }, { type: 'tool_use', id: 'qt1', name: 'Agent', input: { subagent_type: 'archivist', description: 'a job' } }] } },
  qa('10:02', { prompt: 'a word while busy', origin: { kind: 'human' }, humanTurn: true, source_uuid: 'q1', delivery_id: 'd1' }),
  qa('10:03', { prompt: '<cross-session-message from="run-b">a queued request</cross-session-message>', origin: { kind: 'peer', name: 'run-b' }, isMeta: true, source_uuid: 'q2', delivery_id: 'd2' }),
  qa('10:04', { commandMode: 'task-notification', prompt: '<task-notification>queued done</task-notification>', origin: { kind: 'task-notification' }, source_uuid: 'q3', delivery_id: 'd3' }),
  qa('10:05', { prompt: '<agent-message from="a1">\n[Subagent hand-back] The report follows:\n  queued report\n</agent-message>', origin: { kind: 'peer', from: 'a1', name: 'archivist' }, isMeta: true, source_uuid: 'q4', delivery_id: 'd4' }),
  qa('10:06', { prompt: 'typed with no origin', source_uuid: 'q5', delivery_id: 'd5' }),
  { type: 'attachment', timestamp: '2026-11-01T10:06:30.000Z', attachment: { type: 'edited_text_file', filename: 'x.md', snippet: 'NOT AN INPUT' } },
  { type: 'user', timestamp: '2026-11-01T10:07:00.000Z', message: { content: [{ type: 'tool_result', tool_use_id: 'qt1', content: 'Mode a-job: done' }] } },
  { type: 'user', timestamp: '2026-11-01T10:08:00.000Z', isMeta: true, origin: { kind: 'peer', name: 'planner' }, message: { content: 'Another Claude session sent a message:\n<agent-message from="a2">plain report</agent-message>' } },
  { type: 'user', timestamp: '2026-11-01T10:09:00.000Z', origin: { kind: 'human' }, message: { role: 'user', content: 'last words' } },
]));
const QX = require(path.join(BIN, 'extract-session.js')).extractSession(P, 'q', QT);
const qc = QX.counts; const qb = QX.body;
ok(qc.userTyped === 4 && qb.includes('Z User\n\na word while busy\n'), 'extract, queued: the user\'s message sent while the team was busy is a user turn');
ok(qb.includes('Z User\n\ntyped with no origin\n'), 'extract, queued: a queued input with no origin is classified as a user record would be');
ok(qb.includes('Z Cross-session message from run-b\n\n<cross-session-message from="run-b">a queued request'), 'extract, queued: a cross-session message');
ok(qb.includes('Z Task notification\n\n<task-notification>queued done'), 'extract, queued: a task notification');
ok(qb.includes('Z Cross-session message from archivist\n\n<agent-message from="a1">') && qc.crossSession === 3, 'extract, queued: a hand-back is read as one that is not queued is, as a cross-session message');
ok(qc.taskNotifications === 1 && qc.subagentReports === 1 && qc.team === 1 && qc.toolCalls === 1, 'extract, queued: the other counts are unchanged by queued input');
const qOrder = ['first words', 'Working.', 'a word while busy', 'a queued request', 'queued done', 'queued report', 'typed with no origin', 'Mode a-job: done', 'plain report', 'last words'].map(s => qb.indexOf(s));
ok(qOrder.every((n, i) => n >= 0 && (i === 0 || n > qOrder[i - 1])), 'extract, queued: in transcript order with the rest');
ok(qb.split('a word while busy').length === 2 && !qb.includes('NOT AN INPUT'), 'extract, queued: each queued input is read once; other attachments are not read');
const qHeads = k => (qb.match(new RegExp(`^### \\S+ ${k}`, 'gm')) || []).length;
ok(qHeads('User') === qc.userTyped && qHeads('Cross-session message') === qc.crossSession && qHeads('Task notification') === qc.taskNotifications
  && qHeads('Subagent report') === qc.subagentReports && qHeads('Team') === qc.team, 'extract, queued: each count is the number of its entries');

// ---- archive.js verify and index ---------------------------------------------------
r = run('archive.js', ['verify', B1]);
ok(r.code === 1 && /no summary/.test(r.out), 'verify: fails with no summary');
put(path.join(B1, 'summary.md'), 'Session of 2026-11-02 only.\n');
ok(/first day 2026-11-01/.test(run('archive.js', ['verify', B1]).out), 'verify: the summary must name the first day');
put(path.join(B1, 'summary.md'), '# 2026-11-01 to 2026-11-01\n\nThe user asked to archive.\n');
ok(/no .{0,2}## Open points.{0,2} heading/.test(run('archive.js', ['verify', B1]).out), 'verify: the summary must hold its open points and what is relevant to a current session');
put(path.join(B1, 'summary.md'), '# 2026-11-01 to 2026-11-01\n\nThe user asked to archive.' + HEADS);
ok(run('archive.js', ['verify', B1]).code === 0, 'verify: passes with a summary naming the span, with both headings');

// ---- archive.js write-summary --------------------------------------------------------
const WORK = path.join(ARCHIVE, 'work'); const SUMF = path.join(WORK, 'summary.txt');
const sumRun = (text, folder) => { put(SUMF, text); return run('archive.js', ['write-summary', folder || B1, '--summary', SUMF]); };
const sumBefore = fs.readFileSync(path.join(B1, 'summary.md'), 'utf8');
r = run('archive.js', ['write-summary', B1]);
ok(r.code === 1 && /no summary/.test(r.out) && ['', ' \n\n'].every(t => { const x = sumRun(t); return x.code === 1 && /no summary/.test(x.out); }), 'write-summary: refuses no file, an empty file and one of only whitespace');
r = sumRun('Session of 2026-11-02 only.' + HEADS);
ok(r.code === 1 && /first day 2026-11-01/.test(r.out), 'write-summary: refuses a summary that does not name the span');
r = sumRun('# 2026-11-01 to 2026-11-01\n\nNo headings.\n');
ok(r.code === 1 && /Open points/.test(r.out) && /Relevant to a current session/.test(r.out), 'write-summary: refuses a summary without both headings');
ok(sumRun('2026-11-01' + HEADS, DIR).code === 1 && /no meta\.json/.test(sumRun('2026-11-01' + HEADS, base('not-extracted')).out), 'write-summary: refuses a folder that is no base folder of this archive, and one not extracted');
ok(fs.readFileSync(path.join(B1, 'summary.md'), 'utf8') === sumBefore, 'write-summary: a refusal leaves summary.md as it was');
const sumText = '# 2026-11-01 to 2026-11-01\r\n\r\nThe user asked to archive; written from a file, with "quotes" and \'apostrophes\'.' + HEADS.replace(/\n/g, '\r\n');
r = sumRun(sumText + '\r\n\r\n');
ok(r.code === 0 && j(r).replaced === true && j(r).written === `sessions/base/2026-11-01-${S.s1.slice(0, 8)}/summary.md` && fs.readFileSync(path.join(B1, 'summary.md'), 'utf8') === sumText.replace(/\s+$/, '') + '\n', 'write-summary: writes the file\'s text as summary.md, replacing the one there');
ok(run('archive.js', ['verify', B1]).code === 0 && !exists(path.join(B1, 'summary.md.tmp')), 'write-summary: the summary written verifies, and no temporary file is left');
fs.rmSync(WORK, { recursive: true });

// ---- scratch-copy.js ----------------------------------------------------------------
r = run('scratch-copy.js', [S.s1, '--list']);
const items = (j(r).items || []).map(x => x.item).sort();
ok(items.includes('scratchpad/cited-abs') || items.includes('scratchpad/cited-abs/a.txt'), 'pointers: an absolute path in the ledger');
ok(items.includes('scratchpad/cited-rel.json'), 'pointers: a relative path in a ledger line within the span');
ok(items.includes('scratchpad/k25'), 'pointers: the words form, an ellipsis trimmed');
ok(['scratchpad/list-a.txt', 'scratchpad/list-b/c.txt', 'scratchpad/list-d.json'].every(x => items.includes(x)), 'pointers: the words form with a colon and a comma list, every item');
ok((j(r).dangling || []).some(d => d.rel === 'list-gone.txt' && d.form === 'words, list'), 'pointers: an item of a comma list that names nothing is reported dangling');
ok(items.includes('tasks/task1.output'), 'pointers: a task output');
ok(items.includes('scratchpad/from-question.txt') && items.includes('scratchpad/from-hook.txt') && items.includes('scratchpad/from-proposal.txt'), 'pointers: an open question, an open hook, a proposal');
ok(!items.includes('scratchpad/from-closed-hook.txt') && !items.includes('scratchpad/uncited-big.bin'), 'pointers: a closed hook and an answered question are not open records');
ok(!items.includes('scratchpad/x.txt'), 'pointers: a relative path outside the span is not this session\'s');
ok((j(r).dangling || []).some(d => d.rel === 'missing.txt'), 'pointers: a pointer to nothing is reported dangling');
ok(run('scratch-copy.js', [S.run, '--list']).code === 1 && run('scratch-copy.js', [S.kept, '--list']).code === 1, 'pointers: refuses the running and the kept session');
r = run('scratch-copy.js', [S.s1, '--copy']);
ok(r.code === 0 && j(r).over.length === 0, 'copy: copies every item under the cap');
ok(exists(path.join(ARCHIVE, 'scratch', S.s1, 'scratchpad', 'k25', 'deep', 'b.txt')), 'copy: a folder is copied whole');
ok(run('scratch-copy.js', [S.s1, '--verify']).code === 0, 'copy: verifies');
fs.writeFileSync(path.join(ARCHIVE, 'scratch', S.s1, 'scratchpad', 'cited-rel.json'), 'tampered');
ok(run('scratch-copy.js', [S.s1, '--verify']).code === 1, 'copy: a changed copy fails the verification');
fs.writeFileSync(path.join(ARCHIVE, 'scratch', S.s1, 'scratchpad', 'cited-rel.json'), '{"cited":"relatively, in span"}');
r = run('archive.js', ['index', B1]);
ok(r.code === 0 && j(r).verified === true && j(r).scratch === `scratch/${S.s1}`, 'index: the verified session with its scratchpad copy');

// ---- delete-session.js refusals --------------------------------------------------------
const refused = (id, extra, why) => { const x = run('delete-session.js', [id, ...(extra || ['--confirm', id])]); return x.code === 1 && /refused/.test(x.out) && (!why || why.test(x.out)); };
ok(refused(S.s1, [], /--confirm/), 'delete refuses: no --confirm');
ok(refused(S.s1, ['--confirm', S.s2], /--confirm/), 'delete refuses: --confirm names another id');
ok(refused('../' + S.s1, null, /not a session id/), 'delete refuses: a path for an id');
ok(refused(S.orphan, null, /not an admin team session or remains/), 'delete refuses: an id with no session in the team\'s folder');
ok(refused(S.run, null, /running/), 'delete refuses: the running session');
ok(refused(S.held, null, /held/), 'delete refuses: a held session');
ok(refused(S.kept, null, /kept/), 'delete refuses: the session kept');
ok(refused(S.foreign, null, /not an admin team session/), 'delete refuses: a foreign session');
ok(refused(S.s2, null, /no verified archive/), 'delete refuses: no verified archive');
fs.appendFileSync(path.join(ARCHIVE, 'index.jsonl'), JSON.stringify({ id: S.fresh, verified: true, transcriptSha256: require('crypto').createHash('sha256').update(fs.readFileSync(path.join(PROJECT, S.fresh + '.jsonl'))).digest('hex') }) + '\n');
ok(refused(S.fresh, null, /last 10 minutes/), 'delete refuses: changed in the last 10 minutes');
const t1 = path.join(PROJECT, S.s1 + '.jsonl'); const saved = fs.readFileSync(t1);
fs.appendFileSync(t1, '{"type":"user"}\n'); ageTree(t1, 3600e3);
ok(refused(S.s1, null, /transcript changed/), 'delete refuses: the transcript changed since it was archived');
fs.writeFileSync(t1, saved); ageTree(t1, 3600e3);
fs.renameSync(path.join(ARCHIVE, 'scratch', S.s1, 'MANIFEST.json'), path.join(DIR, 'm.json'));
ok(refused(S.s1, null, /does not verify/), 'delete refuses: temp folders and no scratchpad copy');
fs.renameSync(path.join(DIR, 'm.json'), path.join(ARCHIVE, 'scratch', S.s1, 'MANIFEST.json'));
put(path.join(HASH, S.s1, 'stray'), 'x'); ageTree(path.join(HASH, S.s1), 3600e3);
ok(refused(S.s1, null, /more than scratchpad\/, tasks\/, images\/ and a loose msg\.txt or verify-full\.log: stray"/), 'delete refuses: a temp folder holding more than scratchpad/, tasks/, images/ and a loose msg.txt or verify-full.log, naming only what is more');
fs.rmSync(path.join(HASH, S.s1, 'stray'));
const msg = path.join(HASH, S.s1, 'msg.txt');
fs.renameSync(msg, path.join(DIR, 'msg.txt')); fs.mkdirSync(path.join(msg, 'inner'), { recursive: true }); ageTree(path.join(HASH, S.s1), 3600e3);
ok(refused(S.s1, null, /and a loose msg\.txt or verify-full\.log: msg\.txt"/), 'delete refuses: a msg.txt that is a folder is no loose file');
fs.rmSync(msg, { recursive: true }); fs.renameSync(path.join(DIR, 'msg.txt'), msg);
const vlog = path.join(HASH, S.s1, 'verify-full.log');
fs.renameSync(vlog, path.join(DIR, 'verify-full.log')); fs.mkdirSync(path.join(vlog, 'inner'), { recursive: true }); ageTree(path.join(HASH, S.s1), 3600e3);
ok(refused(S.s1, null, /and a loose msg\.txt or verify-full\.log: verify-full\.log"/), 'delete refuses: a verify-full.log that is a folder is no loose file');
fs.rmSync(vlog, { recursive: true }); fs.renameSync(path.join(DIR, 'verify-full.log'), vlog);
ageTree(path.join(HASH, S.s1), 3600e3); ageTree(path.join(ARCHIVE), 3600e3);
const deep = path.join(HASH, S.s1, 'scratchpad', 'k25', 'deep', 'b.txt');
fs.utimesSync(deep, new Date(), new Date());
ok(refused(S.s1, null, /last 10 minutes/), 'delete refuses: a file deep in the named session\'s temp folder changed in the last 10 minutes');
ageTree(path.join(HASH, S.s1), 3600e3);
fs.utimesSync(path.join(HASH, S.s3, 'scratchpad', 'x.txt'), new Date(), new Date());
r = run('delete-session.js', [S.s1, '--confirm', S.s1, '--dry-run']);
ok(r.code === 0 && j(r).removed.length === 6 && j(run('sessions.js', ['--json'])).rows.find(x => x.id === S.s3).quiet === false, 'delete: a fresh store in another session does not refuse the named one; the full sweep still shows it fresh');
ageTree(path.join(HASH, S.s3), 3600e3);

// ---- delete-session.js in this process: its own verification, the last check -------------
// Every way to start a child process is counted from here to the end of the block.
const cp = require('child_process'); const spawned = []; const unpatched = {};
for (const k of ['exec', 'execFile', 'execFileSync', 'execSync', 'fork', 'spawn', 'spawnSync']) {
  unpatched[k] = cp[k]; cp[k] = function (...a) { spawned.push(k); return unpatched[k].apply(this, a); };
}
const D = require(path.join(BIN, 'delete-session.js'));
const classifyS1 = () => L.classify(P, Date.now(), { only: S.s1 });
const manifestS1 = path.join(ARCHIVE, 'scratch', S.s1, 'MANIFEST.json');
fs.renameSync(manifestS1, path.join(DIR, 'm.json'));
let pf = D.planFor(P, classifyS1(), S.s1);
ok(/does not verify \(no manifest\)/.test(pf.refused || ''), 'delete in process: refuses a copy that does not verify (no manifest)');
fs.renameSync(path.join(DIR, 'm.json'), manifestS1);
const relCopy = path.join(ARCHIVE, 'scratch', S.s1, 'scratchpad', 'cited-rel.json');
fs.writeFileSync(relCopy, 'tampered');
pf = D.planFor(P, classifyS1(), S.s1);
ok(/does not verify .*copy scratchpad.cited-rel\.json/.test(pf.refused || ''), 'delete in process: refuses a changed copy');
fs.writeFileSync(relCopy, '{"cited":"relatively, in span"}');
pf = D.planFor(P, classifyS1(), S.s1);
ok(pf.plan && pf.plan.length === 6, 'delete in process: plans the removal once the copy verifies');
ok(exists(path.join(HASH, S.s1, 'images', '1.png')) && exists(msg) && exists(vlog) && pf.plan.some(s => s.store === 'temp' && s.path === path.join(HASH, S.s1)), 'delete in process: a temp folder holding images/, a loose msg.txt and a loose verify-full.log beside scratchpad/ and tasks/ is planned whole');
ok(spawned.length === 0, 'delete in process: verifies the copy without starting a child process');
const outs = []; const log = console.log;
const capture = f => { outs.length = 0; console.log = s => outs.push(String(s)); try { return f(); } finally { console.log = log; } };
const allS1 = () => [t1, path.join(PROJECT, S.s1), path.join(ROOT, 'file-history', S.s1), path.join(ROOT, 'session-env', S.s1), path.join(HASH, S.s1), path.join(OLD, S.s1), deep].every(exists);
let c1 = classifyS1();
fs.utimesSync(deep, new Date(), new Date());
let code = capture(() => D.deleteOne(P, c1, S.s1, false));
ok(c1.rows.find(x => x.id === S.s1).quiet === true && code === 1 && /last 10 minutes, at the last check before removal/.test(outs.join()) && allS1(), 'delete: a store changed after the first quiet check is caught by the last check, and nothing is removed');
ageTree(path.join(HASH, S.s1), 3600e3);
c1 = classifyS1();
put(path.join(ROOT, 'sessions', '6.json'), JSON.stringify({ pid: process.pid, sessionId: S.s1, name: 'resumed' }));
code = capture(() => D.deleteOne(P, c1, S.s1, false));
ok(code === 1 && /held by a live process, at the last check before removal/.test(outs.join()) && allS1(), 'delete: a live record that names it after the first check is caught by the last check, and nothing is removed');
fs.rmSync(path.join(ROOT, 'sessions', '6.json'));
ok(spawned.length === 0, 'delete in process: no child process started in the whole block');
for (const k of Object.keys(unpatched)) cp[k] = unpatched[k];

// ---- delete-session.js: dry run, then the deletion ---------------------------------------
r = run('delete-session.js', [S.s1, '--confirm', S.s1, '--dry-run']);
ok(r.code === 0 && j(r).removed.length === 6 && exists(t1), 'delete --dry-run: lists six paths (five stores, two temp layouts), removes nothing');
r = run('delete-session.js', [S.s1, '--confirm', S.s1]);
const rec = j(r);
ok(r.code === 0 && rec.removed.map(x => x.store).join() === 'temp,temp,file-history,session-env,folder,transcript', 'delete: temp folders first, the transcript last');
ok(!exists(t1) && !exists(path.join(PROJECT, S.s1)) && !exists(path.join(ROOT, 'file-history', S.s1)) && !exists(path.join(ROOT, 'session-env', S.s1)) && !exists(path.join(HASH, S.s1)) && !exists(path.join(OLD, S.s1)), 'delete: the five stores are gone');
ok(exists(path.join(HASH, S.orphan)) && exists(path.join(PROJECT, S.s2 + '.jsonl')) && exists(path.join(HASH, S.run)) && exists(path.join(ROOT, 'history.jsonl')) && exists(path.join(PROJECT, 'memory', 'MEMORY.md')), 'delete: nothing else is touched');
ok(exists(path.join(ARCHIVE, 'scratch', S.s1, 'tasks', 'task1.output')), 'delete: the scratchpad copy stays in the archive');
ok(!exists(path.join(HASH, S.s1, 'images')) && !exists(msg) && !exists(vlog) && !exists(path.join(ARCHIVE, 'scratch', S.s1, 'images')) && !exists(path.join(ARCHIVE, 'scratch', S.s1, 'msg.txt')) && !exists(path.join(ARCHIVE, 'scratch', S.s1, 'verify-full.log')), 'delete: the pasted images, the loose msg.txt and the loose verify-full.log go with the temp folder and are not copied into the archive');
put(path.join(DIR, 'del.json'), r.out);
r = run('archive.js', ['record-deletion', path.join(DIR, 'del.json')]);
ok(r.code === 0 && j(r).recorded[0].deleted.stores.length === 6, 'record-deletion: the index records what was removed');

// An item over the cap is described, not copied, and goes with the session.
const B2 = base(`2026-11-02-${S.s2.slice(0, 8)}`);
fs.rmSync(path.join(ROOT, 'sessions', '3.json'));
run('extract-session.js', [S.s2, B2]); put(path.join(B2, 'summary.md'), '2026-11-02' + HEADS);
r = run('scratch-copy.js', [S.s2, '--copy', '--cap-mb', '1']);
const over = (j(r).over || [])[0] || {};
ok(j(r).over.length === 1 && over.item === 'scratchpad/huge' && over.files === 1 && !exists(path.join(ARCHIVE, 'scratch', S.s2, 'scratchpad', 'huge')), 'copy: an item over the cap is not copied; its files listed for the description');
r = run('scratch-copy.js', [S.s2, '--verify']);
ok(r.code === 1 && /no description/.test(r.out), 'copy: no verification until the item is described');
run('archive.js', ['index', B2]); ageTree(path.join(DIR, 'home'), 3600e3);
ok(refused(S.s2, null, /does not verify/), 'delete refuses: an item over the cap with no description');
put(over.description, 'One 3 MB binary file of zeros, h.bin, cited once by the ledger.\n');
ok(run('scratch-copy.js', [S.s2, '--verify']).code === 0, 'copy: verifies once the description is written');
ageTree(path.join(DIR, 'home'), 3600e3); ageTree(path.join(DIR, 'tmp'), 3600e3);
r = run('delete-session.js', [S.s2, '--confirm', S.s2]);
ok(r.code === 0 && !exists(path.join(HASH, S.s2)) && !exists(path.join(PROJECT, S.s2 + '.jsonl')) && j(r).described.length === 1, 'delete: the described item goes with the rest of the session');
ok(exists(over.description), 'delete: the description stays in the archive');

// Remains.
put(path.join(BM, 'summary.md'), `Remains, last changed ${new Date(Date.now() - 3600e3).toISOString().slice(0, 10)}.` + HEADS);
run('scratch-copy.js', [S.m1, '--copy']); run('archive.js', ['index', BM]); ageTree(path.join(DIR, 'home'), 3600e3);
r = run('delete-session.js', [S.m1, '--confirm', S.m1]);
ok(r.code === 0 && !exists(path.join(PROJECT, S.m1)) && !exists(path.join(HASH, S.m1)) && exists(path.join(PROJECT, S.m2)), 'delete: remains go with their temp folder; other remains stay');

// ---- --all-ready: the user's route ------------------------------------------------------
const B3 = base(`2026-11-03-${S.s3.slice(0, 8)}`);
const BM2 = base(`2026-10-02-${S.m2.slice(0, 8)}`);
run('extract-session.js', [S.s3, B3]); put(path.join(B3, 'summary.md'), '2026-11-03' + HEADS);
run('extract-session.js', [S.m2, BM2]); put(path.join(BM2, 'summary.md'), new Date(Date.now() - 3600e3).toISOString().slice(0, 10) + HEADS);
run('scratch-copy.js', [S.s3, '--copy']); run('archive.js', ['index', B3]); run('archive.js', ['index', BM2]);
ageTree(path.join(DIR, 'home'), 3600e3); ageTree(path.join(DIR, 'tmp'), 3600e3);
const cr = L.classify(P, Date.now(), { only: x => x.class === 'ready' });
ok(cr.rows.filter(x => x.class === 'ready').length === 3 && cr.rows.every(x => (x.class === 'ready') === (x.quiet !== null)), '--all-ready: only the ready rows are walked');
r = run('delete-session.js', ['--all-ready', '--dry-run']);
let lines = r.out.trim().split('\n').map(l => JSON.parse(l));
ok(r.code === 1 && lines.length === 3 && lines.filter(x => x.dryRun).length === 2 && lines.some(x => x.id === S.fresh && /does not verify/.test(x.refused)) && exists(path.join(PROJECT, S.s3 + '.jsonl')), '--all-ready --dry-run: lists every ready session, goes on past a refusal, removes nothing');
r = run('delete-session.js', ['--all-ready']);
lines = r.out.trim().split('\n').map(l => JSON.parse(l));
ok(r.code === 1 && lines.filter(x => x.removed).map(x => x.id).sort().join() === [S.s3, S.m2].sort().join() && !exists(path.join(PROJECT, S.s3 + '.jsonl')) && !exists(path.join(PROJECT, S.m2)), '--all-ready: deletes every ready session that passes the checks');
ok(exists(path.join(PROJECT, S.kept + '.jsonl')) && exists(path.join(PROJECT, S.run + '.jsonl')) && exists(path.join(PROJECT, S.held + '.jsonl')) && exists(path.join(PROJECT, S.fresh + '.jsonl')), '--all-ready: the kept, running and held sessions, and the refused one, stay');
put(path.join(DIR, 'all.json'), r.out);
r = run('archive.js', ['record-deletion', path.join(DIR, 'all.json')]);
ok(r.code === 0 && (j(r).recorded || []).length === 2, 'record-deletion: records every session of an --all-ready run');
r = run('delete-session.js', ['--all-ready']);
ok(r.out.trim().split('\n').length === 1 && /refused/.test(r.out) && !/removed/.test(r.out), '--all-ready: only the refused session is left once the rest are deleted');

// ---- --orphans ------------------------------------------------------------------------------
fs.utimesSync(path.join(HASH, S.emptyFresh, 'scratchpad'), new Date(), new Date());
r = run('sessions.js', ['--json', '--orphans']);
const orph = Object.fromEntries((j(r).orphans || []).map(o => [o.id, o]));
ok(orph[S.empty] && orph[S.empty].paths.length === 2 && orph[S.orphan] && !orph[S.elsewhere] && !orph[S.emptyLive] && !orph[S.run], 'orphans: ids with no session in any project folder and no live record');
r = run('delete-session.js', ['--orphans', '--dry-run']);
ok(exists(path.join(HASH, S.empty)) && /"dryRun":true/.test(r.out), 'orphans --dry-run: removes nothing');
r = run('delete-session.js', ['--orphans']);
ok(r.code === 0 && !exists(path.join(HASH, S.empty)) && !exists(path.join(OLD, S.empty)), 'orphans: an empty quiet orphan goes, in both layouts');
ok(exists(path.join(HASH, S.orphan, 'scratchpad', 'o.txt')) && /holds 1 file/.test(r.out), 'orphans: one holding a file stays');
ok(exists(path.join(HASH, S.emptyFresh)) && /changed in the last 10 minutes/.test(r.out), 'orphans: one changed in the last 10 minutes stays');
ok(exists(path.join(HASH, S.emptyLive)) && exists(path.join(HASH, S.elsewhere)) && exists(path.join(HASH, S.kept)), 'orphans: a live record\'s, another project\'s and a session\'s folders stay');

// ---- no word from the user: a sweep and a deletion run on the checks alone ------------------
// Each call runs with its input closed, takes no flag beyond the script's own,
// and finds nothing in the team's records that names what it removes.
function runNoInput(script, args) {
  try { return { code: 0, out: execFileSync(process.execPath, [path.join(BIN, script), ...args, ...COMMON], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') }; }
}
const RECORDS = ['ledger.jsonl', 'questions.jsonl', 'hooks.jsonl', 'state.json'];
const readRecords = () => RECORDS.map(f => fs.readFileSync(path.join(TEAM, f), 'utf8')).join('\n');
S.swept = uid(16); S.s4 = uid(17);
fs.mkdirSync(path.join(HASH, S.swept, 'scratchpad'), { recursive: true }); ageTree(path.join(HASH, S.swept), 3600e3);
let before = readRecords();
ok(!before.includes(S.swept), 'no word: nothing in the team\'s records names the orphan');
const sweep = [runNoInput('sessions.js', ['--sizes', '--orphans']), runNoInput('archive.js', ['plan']), runNoInput('delete-session.js', ['--orphans'])];
ok(sweep.every(x => x.code === 0) && /orphan +temp +/.test(sweep[0].out) && !exists(path.join(HASH, S.swept)) && sweep[2].out.includes(`"orphan":"${S.swept}"`), 'no word: a sweep removes a qualifying orphan on the checks alone');
ok(exists(path.join(HASH, S.orphan, 'scratchpad', 'o.txt')) && exists(path.join(HASH, S.emptyFresh)) && exists(path.join(HASH, S.emptyLive)), 'no word: the sweep leaves every orphan that fails a check');
ok(readRecords() === before, 'no word: the sweep writes none of the team\'s records');

transcript(S.s4, '07', true); put(path.join(HASH, S.s4, 'scratchpad', 'x.txt'), 'x');
const B4 = base(`2026-11-07-${S.s4.slice(0, 8)}`);
ageTree(path.join(DIR, 'home'), 3600e3); ageTree(path.join(DIR, 'tmp'), 3600e3);
const order = [runNoInput('sessions.js', ['--id', S.s4, '--json']), runNoInput('extract-session.js', [S.s4, B4])];
put(path.join(B4, 'summary.md'), '2026-11-07' + HEADS);
order.push(runNoInput('scratch-copy.js', [S.s4, '--copy']), runNoInput('scratch-copy.js', [S.s4, '--verify']), runNoInput('archive.js', ['verify', B4]), runNoInput('archive.js', ['index', B4]));
ok(order.every(x => x.code === 0) && (j(order[0]).rows || [])[0].class === 'candidate', 'no word: an older session passes every step of the order before the deletion');
ageTree(path.join(DIR, 'home'), 3600e3); ageTree(path.join(DIR, 'tmp'), 3600e3);
before = readRecords();
ok(!before.includes(S.s4), 'no word: nothing in the team\'s records names the session');
r = runNoInput('delete-session.js', [S.s4, '--confirm', S.s4]);
ok(r.code === 0 && j(r).removed.length === 5 && !exists(path.join(PROJECT, S.s4 + '.jsonl')) && !exists(path.join(PROJECT, S.s4)) && !exists(path.join(ROOT, 'file-history', S.s4)) && !exists(path.join(ROOT, 'session-env', S.s4)) && !exists(path.join(HASH, S.s4)), 'no word: a deletion proceeds once every check passes');
ok(readRecords() === before && exists(path.join(PROJECT, S.kept + '.jsonl')) && exists(path.join(PROJECT, S.run + '.jsonl')) && exists(path.join(PROJECT, S.held + '.jsonl')), 'no word: the deletion writes none of the team\'s records and leaves the other sessions');

// ---- tiers -----------------------------------------------------------------------------
// Sixteen bases (today's count: 11 sessions and 5 remains): the 6 oldest wrap.
fs.rmSync(path.join(ARCHIVE, 'sessions'), { recursive: true });
const idx = [];
function fakeBase(n) {
  const id = uid(1000 + n); const d = new Date(Date.UTC(2026, 9, 1) + n * 86400e3).toISOString();
  const f = base(`${d.slice(0, 10)}-${id.slice(0, 8)}`);
  put(path.join(f, 'conversation.md'), `conversation ${n}`);
  put(path.join(f, 'summary.md'), `Summary of session ${n}, ${d.slice(0, 10)}.` + HEADS);
  put(path.join(f, 'meta.json'), JSON.stringify({ id, kind: 'session', title: 'admin team', from: d, to: d, transcriptBytes: 10, transcriptSha256: 'x', counts: {} }));
  idx.push({ id, kind: 'session', from: d, to: d, tier: 0, container: `sessions/base/${path.basename(f)}`, verified: true, scratch: n === 0 ? `scratch/${id}` : null, deleted: null });
  if (n === 0) {
    put(path.join(ARCHIVE, 'scratch', id, 'scratchpad', 'kept.txt'), 'pointed at');
    put(path.join(ARCHIVE, 'scratch', id, 'MANIFEST.json'), JSON.stringify({ id, items: [{ item: 'scratchpad/kept.txt', bytes: 10, pointers: ['ledger.jsonl:1 (absolute)'], files: [{ rel: 'scratchpad/kept.txt', bytes: 10 }] }] }));
  }
  return id;
}
const first = fakeBase(0); for (let n = 1; n < 16; n++) fakeBase(n);
fs.writeFileSync(path.join(ARCHIVE, 'index.jsonl'), jl(idx));
let pl = j(run('archive.js', ['plan']));
ok(pl.counts.base === 16 && pl.due.length === 6 && pl.due.every(d => d.action === 'fold-base'), 'tiers: 16 bases, 6 wraps due');
ok(run('archive.js', ['fold-base', path.join(ARCHIVE, pl.due[1].target)]).code === 1, 'tiers: only the oldest base is wrapped');
ok(run('archive.js', ['fold-base', 'sessions/base/no-such-folder'], DIR).code === 1, 'tiers: a relative target that names no base folder is refused');
r = run('archive.js', ['fold-base', pl.due[0].target], DIR);
ok(r.code === 0 && j(r).folded === first, 'tiers: fold-base takes its target as plan prints it, relative to the archive');
for (const d of pl.due.slice(1)) run('archive.js', ['fold-base', path.join(ARCHIVE, d.target)]);
pl = j(run('archive.js', ['plan']));
ok(pl.counts.base === 10 && pl.counts['wrapped-1'] === 1 && pl.due.length === 0, 'tiers: 10 bases and one wrapped session after the wraps');
const w1 = fs.readFileSync(path.join(ARCHIVE, 'sessions', 'wrapped-1', '0001.md'), 'utf8');
ok((w1.match(/<!-- archive-entry/g) || []).length === 6 && w1.includes('Summary of session 0, 2026-10-01.') && !w1.includes('conversation 0'), 'tiers: the wrapped session holds the six summaries verbatim, no conversation');
r = run('archive.js', ['resolve', '--ts', '2026-10-01T00:00:00.000Z']);
ok(j(r).container === 'sessions/wrapped-1/0001.md' && j(r).scratch === null && !exists(path.join(ARCHIVE, 'scratch', first)), 'tiers: a pointer by time still finds the session; its scratchpad copy is dropped at the first wrap');
ok(w1.includes('dropped at this wrap; it held:') && w1.includes('scratchpad/kept.txt, 10 bytes, 1 file(s), copied; pointed at by 1 record line(s)'), 'tiers: the wrapped entry lists what the dropped copy held');
ok(w1.includes('## Open points') && w1.includes('## Relevant to a current session'), 'tiers: the wrapped entry keeps the open points and what is relevant to a current session');
ok(run('archive.js', ['fold-base', path.join(ARCHIVE, 'sessions', 'base', fs.readdirSync(path.join(ARCHIVE, 'sessions', 'base'))[0])]).code === 1, 'tiers: no wrap while the base tier holds 10');

// Enough bases to fill ten wrapped sessions and start an eleventh: then one double-wrap is due.
let added = 0;
for (let n = 16; added < 200; n++) {
  fakeBase(n); added++;
  fs.appendFileSync(path.join(ARCHIVE, 'index.jsonl'), JSON.stringify(idx[idx.length - 1]) + '\n');
  for (const d of j(run('archive.js', ['plan'])).due.filter(x => x.action === 'fold-base')) run('archive.js', ['fold-base', path.join(ARCHIVE, d.target)]);
  if (j(run('archive.js', ['plan'])).counts['wrapped-1'] === 11) break;
}
pl = j(run('archive.js', ['plan']));
ok(pl.counts['wrapped-1'] === 11 && pl.due.length === 1 && pl.due[0].action === 'fold-upper' && pl.due[0].tier === 2 && pl.due[0].needsSummary, 'tiers: an eleventh wrapped session makes a double-wrap due');
const doc1 = path.join(ARCHIVE, pl.due[0].target);
ok(run('archive.js', ['fold-upper', '2', doc1]).code === 1, 'tiers: no double-wrap without the Archivist\'s summary');
put(path.join(DIR, 'sum.md'), 'The first wrapped session in brief.');
r = run('archive.js', ['fold-upper', '2', doc1, '--summary', path.join(DIR, 'sum.md')]);
ok(r.code === 0 && j(r).sessions === 10 && !exists(doc1), 'tiers: the oldest wrapped session is double-wrapped and removed');
pl = j(run('archive.js', ['plan']));
ok(pl.counts['wrapped-1'] === 10 && pl.counts['wrapped-2'] === 1 && pl.due.length === 0, 'tiers: 10 wrapped, 1 double-wrapped');
r = run('archive.js', ['resolve', '--id', first]);
ok(j(r).tier === 2 && j(r).container === 'sessions/wrapped-2/0001.md' && j(r).scratch === null, 'tiers: the oldest session resolves to the double-wrapped session');

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
