#!/usr/bin/env node
// The session archive's index and tiers. Run by the Archivist only.
//
//   node archive.js verify <base folder>                 meta, conversation, summary and transcript agree
//   node archive.js index <base folder>                  add or replace the session's line, verified
//   node archive.js record-deletion <file>               write delete-session.js's output (one JSON line per session) into the index
//   node archive.js plan                                 the tiers' counts and the wraps due, oldest first
//   node archive.js fold-base <base folder>              wrap one base session into the newest wrapped session
//   node archive.js fold-upper <tier> <document> --summary <file>
//                                                        wrap one document of tier-1 into tier <tier> (2 or more)
//   node archive.js resolve --ts <UTC> | --id <id>       which session, where it is now, its scratchpad copy
//
// Layout (the Archivist's brief, The session archive): sessions/base/<date>-<id8>/
// (conversation.md, summary.md, meta.json); sessions/wrapped-<k>/<nnnn>.md, tier k;
// scratch/<id>/ (the copied scratchpad files and the descriptions of items too
// large to copy, dropped at the session's first wrap); index.jsonl.
// Each tier keeps 10; when it holds 11, its oldest is wrapped into the newest
// session of the tier above, which holds up to 10. A summary.md holds the two
// headings HEADINGS names, which verify checks.

'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const KEEP = 10; const HOLD = 10;
const MARK = /^<!-- archive-entry (\{.*\}) -->$/m;
const HEADINGS = ['## Open points', '## Relevant to a current session'];

function P0() { const P = L.paths(); P.sessionsDir = path.join(P.archive, 'sessions'); P.index = path.join(P.archive, 'index.jsonl'); return P; }
function writeIndex(P, lines) {
  fs.mkdirSync(P.archive, { recursive: true });
  const tmp = P.index + '.tmp';
  fs.writeFileSync(tmp, lines.map(l => JSON.stringify(l)).join('\n') + (lines.length ? '\n' : ''));
  fs.renameSync(tmp, P.index);
}
function inside(parent, p) { const r = path.relative(parent, p); return r && !r.startsWith('..') && !path.isAbsolute(r); }
function day(ts) { return String(ts || '').slice(0, 10); }

function verify(P, folder) {
  const bad = [];
  const meta = fs.existsSync(path.join(folder, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(folder, 'meta.json'), 'utf8')) : null;
  if (!meta) return { ok: false, bad: ['no meta.json'] };
  const conv = path.join(folder, 'conversation.md');
  if (!fs.existsSync(conv) || L.sha256File(conv) !== meta.conversationSha256) bad.push('conversation.md differs from meta.json');
  const sum = path.join(folder, 'summary.md');
  const s = fs.existsSync(sum) ? fs.readFileSync(sum, 'utf8') : '';
  if (!s.trim()) bad.push('no summary.md');
  else {
    if (meta.from && !s.includes(day(meta.from))) bad.push(`summary.md does not name the first day ${day(meta.from)}`);
    if (meta.to && !s.includes(day(meta.to))) bad.push(`summary.md does not name the last day ${day(meta.to)}`);
    for (const h of HEADINGS) if (!s.split(/\r?\n/).includes(h)) bad.push(`summary.md has no "${h}" heading`);
  }
  const t = path.join(P.project, meta.id + '.jsonl');
  if (meta.transcriptSha256 && fs.existsSync(t) && L.sha256File(t) !== meta.transcriptSha256) bad.push('the transcript changed since it was extracted');
  return { ok: bad.length === 0, bad, meta };
}

function bases(P) {
  const d = path.join(P.sessionsDir, 'base');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).map(n => {
    const meta = JSON.parse(fs.readFileSync(path.join(d, n, 'meta.json'), 'utf8'));
    return { folder: path.join(d, n), name: n, id: meta.id, from: meta.from || meta.to, meta };
  }).sort((a, b) => String(a.from).localeCompare(String(b.from)));
}
function docs(P, k) {
  const d = path.join(P.sessionsDir, `wrapped-${k}`);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(n => /^\d{4}\.md$/.test(n)).sort().map(n => {
    const file = path.join(d, n);
    const text = fs.readFileSync(file, 'utf8');
    const entries = text.split('\n').filter(l => MARK.test(l)).map(l => JSON.parse(MARK.exec(l)[1]));
    return { file, name: n, entries };
  });
}
function tierName(k) { return k === 1 ? 'wrapped' : k === 2 ? 'double-wrapped' : `wrapped ${k} times`; }

// The newest open document of tier k, or a new one.
function target(P, k) {
  const ds = docs(P, k);
  const last = ds[ds.length - 1];
  if (last && last.entries.length < HOLD) return { file: last.file, fresh: false };
  const n = String((last ? Number(last.name.slice(0, 4)) : 0) + 1).padStart(4, '0');
  const d = path.join(P.sessionsDir, `wrapped-${k}`);
  fs.mkdirSync(d, { recursive: true });
  return { file: path.join(d, `${n}.md`), fresh: true, header: `# Archived sessions, ${tierName(k)} (tier ${k}), ${n}\n\nEach entry below stands for what it wrapped; the archive's index.jsonl says which session is where.\n` };
}
function append(t, section) {
  const before = fs.existsSync(t.file) ? fs.readFileSync(t.file, 'utf8') : t.header;
  fs.writeFileSync(t.file, before + '\n' + section);
  return fs.readFileSync(t.file, 'utf8');
}
// What the session's scratchpad copy held, for its tier-1 entry: the copy
// itself is dropped at that wrap.
function scratchLines(P, ix) {
  const mf = ix.scratch ? path.join(P.archive, ix.scratch, 'MANIFEST.json') : null;
  if (!mf || !fs.existsSync(mf)) return 'none';
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (!m.items.length) return 'nothing pointed at';
  return 'dropped at this wrap; it held:\n' + m.items.map(i => `  - ${i.item}, ${i.bytes} bytes, ${i.files.length} file(s), `
    + (i.over ? 'too large to copy, described' : 'copied') + `; pointed at by ${i.pointers.length} record line(s)`).join('\n');
}
function rel(P, p) { return path.relative(P.archive, p).replace(/\\/g, '/'); }

function plan(P) {
  const out = [];
  const b = bases(P);
  for (let i = 0; i < b.length - KEEP; i++) out.push({ tier: 1, action: 'fold-base', target: rel(P, b[i].folder), needsSummary: false });
  for (let k = 1; ; k++) {
    const ds = docs(P, k);
    if (!ds.length && !fs.existsSync(path.join(P.sessionsDir, `wrapped-${k + 1}`))) break;
    for (let i = 0; i < ds.length - KEEP; i++) out.push({ tier: k + 1, action: 'fold-upper', target: rel(P, ds[i].file), needsSummary: true });
  }
  const counts = { base: b.length };
  for (let k = 1; fs.existsSync(path.join(P.sessionsDir, `wrapped-${k}`)); k++) counts[`wrapped-${k}`] = docs(P, k).length;
  return { counts, due: out };
}

function main() {
  const [cmd, a1, a2] = process.argv.slice(2);
  const P = P0();
  const say = o => console.log(JSON.stringify(o));
  if (cmd === 'verify') { const v = verify(P, path.resolve(a1)); say({ ok: v.ok, bad: v.bad }); return v.ok ? 0 : 1; }
  if (cmd === 'index') {
    const folder = path.resolve(a1);
    if (!inside(path.join(P.sessionsDir, 'base'), folder)) { say({ refused: 'not a base folder of this archive' }); return 1; }
    const v = verify(P, folder); if (!v.ok) { say({ refused: 'does not verify', bad: v.bad }); return 1; }
    const m = v.meta;
    const scratch = path.join(P.archive, 'scratch', m.id);
    const line = { id: m.id, kind: m.kind, title: m.title, from: m.from, to: m.to, tier: 0, container: rel(P, folder),
      verified: true, transcriptSha256: m.transcriptSha256, scratch: fs.existsSync(path.join(scratch, 'MANIFEST.json')) ? rel(P, scratch) : null,
      archived: new Date().toISOString(), deleted: null };
    const lines = L.readIndex(P).filter(l => l.id !== m.id); lines.push(line);
    writeIndex(P, lines); say(line); return 0;
  }
  if (cmd === 'record-deletion') {
    const recs = L.readJsonl(path.resolve(a1)).filter(r => r.id && !r.refused && !r.orphan);
    if (!recs.length || recs.some(r => r.dryRun || !Array.isArray(r.removed))) { say({ refused: 'not a deletion record' }); return 1; }
    const lines = L.readIndex(P);
    const missing = recs.filter(r => !lines.find(x => x.id === r.id)).map(r => r.id);
    if (missing.length) { say({ refused: `not in the index: ${missing.join(', ')}` }); return 1; }
    for (const rec of recs) {
      const l = lines.find(x => x.id === rec.id);
      l.deleted = { at: rec.at, bytes: rec.bytes, stores: rec.removed.map(r => r.store), described: (rec.described || []).length };
    }
    say({ recorded: recs.map(r => ({ id: r.id, deleted: lines.find(x => x.id === r.id).deleted })) });
    writeIndex(P, lines); return 0;
  }
  if (cmd === 'plan') { say(plan(P)); return 0; }
  if (cmd === 'fold-base') {
    const folder = path.resolve(a1);
    const b = bases(P);
    const me = b.find(x => x.folder === folder);
    if (!me) { say({ refused: 'not a base folder of this archive' }); return 1; }
    if (b.length <= KEEP) { say({ refused: `the base tier holds ${b.length}, not more than ${KEEP}` }); return 1; }
    if (b[0].folder !== folder) { say({ refused: `not the oldest base session (${b[0].name} is)` }); return 1; }
    const summary = fs.readFileSync(path.join(folder, 'summary.md'), 'utf8').replace(/\s+$/, '');
    const m = me.meta;
    const ix = L.readIndex(P).find(l => l.id === m.id) || {};
    const entry = { id: m.id, from: m.from, to: m.to, tier: 0 };
    const t = target(P, 1);
    const section = `## ${m.id}${m.title ? ' — ' + m.title : ''}\n\n<!-- archive-entry ${JSON.stringify(entry)} -->\n\n`
      + `- Span: ${m.from || '-'} to ${m.to || '-'} (${m.kind})\n`
      + `- Transcript: ${m.transcriptBytes === null ? 'none (remains)' : m.transcriptBytes + ' bytes, sha256 ' + m.transcriptSha256}\n`
      + `- Counts: ${JSON.stringify(m.counts)}\n`
      + `- Files deleted: ${ix.deleted ? ix.deleted.at + ', ' + ix.deleted.bytes + ' bytes (' + ix.deleted.stores.join(', ') + ')' : 'not yet'}\n`
      + `- Scratchpad copy: ${scratchLines(P, ix)}\n\n`
      + `### Summary\n\n${summary}\n`;
    const after = append(t, section);
    if (!after.includes(summary) || !after.includes(JSON.stringify(entry))) { say({ refused: 'the wrapped session does not read back' }); return 1; }
    fs.rmSync(folder, { recursive: true, force: false });
    const sc = ix.scratch ? path.join(P.archive, ix.scratch) : null;
    if (sc && inside(path.join(P.archive, 'scratch'), sc)) fs.rmSync(sc, { recursive: true, force: true });
    const lines = L.readIndex(P);
    for (const l of lines) if (l.id === m.id) { l.tier = 1; l.container = rel(P, t.file); l.scratch = null; }
    writeIndex(P, lines);
    say({ folded: m.id, into: rel(P, t.file), created: t.fresh }); return 0;
  }
  if (cmd === 'fold-upper') {
    const k = Number(a1); const doc = path.resolve(a2); const sumFile = L.opt('--summary', null);
    if (!(k >= 2)) { say({ refused: 'the tier is 2 or more' }); return 1; }
    const lower = docs(P, k - 1);
    if (lower.length <= KEEP) { say({ refused: `tier ${k - 1} holds ${lower.length}, not more than ${KEEP}` }); return 1; }
    if (lower[0].file !== doc) { say({ refused: `not the oldest document of tier ${k - 1} (${lower[0].name} is)` }); return 1; }
    const summary = sumFile && fs.existsSync(sumFile) ? fs.readFileSync(sumFile, 'utf8').replace(/\s+$/, '') : '';
    if (!summary) { say({ refused: 'no summary: the Archivist writes it first' }); return 1; }
    const ids = L.readIndex(P).filter(l => l.container === rel(P, doc));
    const from = ids.map(l => l.from || l.to).sort()[0]; const to = ids.map(l => l.to).sort().slice(-1)[0];
    const entry = { doc: `wrapped-${k - 1}/${path.basename(doc)}`, ids: ids.map(l => l.id), from, to, tier: k - 1 };
    const t = target(P, k);
    const section = `## ${entry.doc}: ${ids.length} sessions, ${from} to ${to}\n\n<!-- archive-entry ${JSON.stringify(entry)} -->\n\n`
      + ids.map(l => `- ${l.id}: ${l.from || '-'} to ${l.to || '-'}`).join('\n')
      + `\n\n### Summary\n\n${summary}\n`;
    const after = append(t, section);
    if (!after.includes(summary) || !after.includes(JSON.stringify(entry))) { say({ refused: 'the wrapped session does not read back' }); return 1; }
    fs.rmSync(doc, { force: false });
    const lines = L.readIndex(P);
    for (const l of lines) if (l.container === rel(P, doc)) { l.tier = k; l.container = rel(P, t.file); }
    writeIndex(P, lines);
    say({ folded: entry.doc, sessions: ids.length, into: rel(P, t.file), created: t.fresh }); return 0;
  }
  if (cmd === 'resolve') {
    const ts = L.opt('--ts', null); const id = L.opt('--id', null);
    const lines = L.readIndex(P);
    const hit = id ? lines.find(l => l.id === id) : lines.find(l => ts && l.from && l.to && ts >= l.from && ts <= l.to);
    if (!hit) { say({ found: false }); return 1; }
    say({ found: true, id: hit.id, tier: hit.tier, container: hit.container, scratch: hit.scratch,
      scratchExists: hit.scratch ? fs.existsSync(path.join(P.archive, hit.scratch)) : false });
    return 0;
  }
  console.error('usage: archive.js verify|index|record-deletion|plan|fold-base|fold-upper|resolve …');
  return 2;
}

process.exitCode = main();
