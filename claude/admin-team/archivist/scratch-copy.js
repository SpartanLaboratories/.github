#!/usr/bin/env node
// Finds what an open record points at in one session's scratchpad and task
// outputs, copies it into the archive, and verifies the copy.
//
//   node scratch-copy.js <id> --list                 the pointers and what each resolves to
//   node scratch-copy.js <id> --copy [--cap-mb 100]  copy into <archive>/scratch/<id>/ with MANIFEST.json
//   node scratch-copy.js <id> --verify               every copied file against the manifest and its source,
//                                                    and a description for every item over the cap
//
// The records read (the Archivist's brief, The session archive, **What an open
// record points at**): the whole ledger; state.json; the open questions; the
// open and decided hooks; every file under admin-team/proposals/; the
// predicted-issues tracker; every non-empty handoff. A pointer is a path with
// the session's id followed by scratchpad/ or tasks/; the words "scratchpad
// <first 8 of the id> <path>", or after a colon a comma list, "scratchpad
// <first 8 of the id>: <path>, <path>, <path>"; or a relative
// "scratchpad/<path>", which belongs to this session when the ledger line
// carrying it falls within the session's span, and is taken from every session
// that holds it when the record has no time. Each pointer resolves to the
// longest leading part of its path that exists. An item larger than the cap is
// not copied: the manifest lists its files and sizes and names the file under
// descriptions/ where the Archivist writes a description of the item and its
// contents, which stands in for it; --verify fails until that file is written.
// Writes only under <archive>/scratch/<id>/.

'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const TEXT = /\.(md|json|jsonl|txt|diff|patch|js|sh|cmd|csv)$/i;

function sources(P) {
  const s = [];
  const add = (file, filter) => { if (fs.existsSync(file)) s.push({ file, filter }); };
  add(path.join(P.team, 'ledger.jsonl'), 'ledger');
  add(path.join(P.team, 'state.json'), 'all');
  add(path.join(P.team, 'questions.jsonl'), 'open-questions');
  add(path.join(P.team, 'hooks.jsonl'), 'open-hooks');
  add(path.join(P.team, 'predicted-issues.md'), 'all');
  const prop = path.join(P.team, 'proposals');
  const stack = fs.existsSync(prop) ? [prop] : [];
  while (stack.length) {
    const cur = stack.pop();
    const st = fs.lstatSync(cur);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) fs.readdirSync(cur).forEach(n => stack.push(path.join(cur, n)));
    else if (TEXT.test(cur) && st.size < 50 * 1048576) s.push({ file: cur, filter: 'all' });
  }
  const ho = path.join(P.root, 'handoffs');
  if (fs.existsSync(ho)) for (const f of fs.readdirSync(ho)) if (f.endsWith('.md') && fs.statSync(path.join(ho, f)).size > 0) add(path.join(ho, f), 'all');
  return s;
}

// The lines of a source an open record holds, each with its time when it has one.
function lines(src) {
  const raw = fs.readFileSync(src.file, 'utf8').split(/\r?\n/);
  const out = [];
  raw.forEach((text, i) => {
    if (!text.trim()) return;
    let ts = null;
    if (src.filter !== 'all') {
      let r; try { r = JSON.parse(text); } catch (e) { return; }
      if (src.filter === 'open-questions' && r.status !== 'open') return;
      if (src.filter === 'open-hooks' && !['open', 'decided'].includes(r.status)) return;
      ts = r.ts || null;
    }
    out.push({ where: `${src.file}:${i + 1}`, ts, text: text.replace(/\\/g, '/').replace(/\/{2,}/g, '/') });
  });
  return out;
}

const ITEM = '[A-Za-z0-9._\\-/]{1,200}';
const PATH = `(${ITEM})`;
function clean(p) {
  return p.replace(/\/\.\.\.$/, '').replace(/\.\.\.$/, '').replace(/[./]+$/, '').replace(/^\/+/, '');
}

function findPointers(P, id, span) {
  const id8 = id.slice(0, 8);
  const abs = new RegExp(`${id}/(scratchpad|tasks)/${PATH}`, 'g');
  const words = new RegExp(`scratchpad ${id8} ${PATH}`, 'g');
  const list = new RegExp(`scratchpad ${id8}: (${ITEM}(?:, ?${ITEM})*)`, 'g');
  const rel = new RegExp(`(?:^|[^A-Za-z0-9_/-])scratchpad/${PATH}`, 'g');
  const found = [];
  for (const src of sources(P)) {
    for (const ln of lines(src)) {
      let m;
      abs.lastIndex = 0; while ((m = abs.exec(ln.text))) found.push({ where: ln.where, form: 'absolute', area: m[1], rel: clean(m[2]) });
      words.lastIndex = 0; while ((m = words.exec(ln.text))) found.push({ where: ln.where, form: 'words', area: 'scratchpad', rel: clean(m[1]) });
      list.lastIndex = 0; while ((m = list.exec(ln.text))) for (const p of m[1].split(/, ?/)) found.push({ where: ln.where, form: 'words, list', area: 'scratchpad', rel: clean(p) });
      if (ln.text.includes(id)) continue; // its scratchpad paths were read above
      rel.lastIndex = 0;
      while ((m = rel.exec(ln.text))) {
        const inSpan = ln.ts && span.from && span.to ? ln.ts >= span.from && ln.ts <= span.to : null;
        if (inSpan === false) continue;
        found.push({ where: ln.where, form: inSpan ? 'relative, in span' : 'relative, no time', area: 'scratchpad', rel: clean(m[1]) });
      }
    }
  }
  return found.filter(f => f.rel);
}

// The longest leading part of the pointer's path that exists in one of the temp folders.
function resolve(P, id, ptr) {
  const segs = ptr.rel.split('/').filter(s => s && s !== '.' && s !== '..');
  for (const t of L.tempFolders(P, id)) {
    for (let n = segs.length; n >= 1; n--) {
      const p = path.join(t, ptr.area, ...segs.slice(0, n));
      if (fs.existsSync(p)) return { temp: t, abs: p, item: path.join(ptr.area, ...segs.slice(0, n)).replace(/\\/g, '/') };
    }
  }
  return null;
}

function filesUnder(p) {
  const out = []; const links = [];
  const stack = [p];
  while (stack.length) {
    const cur = stack.pop();
    const st = fs.lstatSync(cur);
    if (st.isSymbolicLink()) { links.push(cur); continue; }
    if (st.isDirectory()) fs.readdirSync(cur).forEach(n => stack.push(path.join(cur, n)));
    else out.push({ abs: cur, bytes: st.size });
  }
  return { files: out, links };
}

// Every copied file against the manifest and its source, and a description
// for every item over the cap. Reads only. delete-session.js calls it too, in
// its own process, after its own class checks.
function verify(P, id) {
  const dest = path.join(P.archive, 'scratch', id);
  const manifestPath = path.join(dest, 'MANIFEST.json');
  if (!fs.existsSync(manifestPath)) return { id, verified: false, why: 'no manifest' };
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const bad = [];
  for (const it of m.items.filter(x => x.over)) {
    const d = path.join(dest, it.description);
    if (!fs.existsSync(d) || !fs.readFileSync(d, 'utf8').trim()) bad.push(`no description ${it.description}`);
  }
  for (const it of m.items.filter(x => !x.over)) for (const f of it.files) {
    const copy = path.join(dest, f.rel);
    if (!fs.existsSync(copy) || L.sha256File(copy) !== f.sha256) bad.push(`copy ${f.rel}`);
    const src = path.join(it.temp, f.rel);
    if (fs.existsSync(src) && L.sha256File(src) !== f.sha256) bad.push(`source changed ${f.rel}`);
  }
  return { id, verified: bad.length === 0, described: m.items.filter(x => x.over).map(x => x.item), bad };
}

function main() {
  const id = process.argv[2];
  if (!id || !L.ID_RE.test(id)) { console.error('usage: scratch-copy.js <id> --list|--copy|--verify [--cap-mb 100]'); return 2; }
  const P = L.paths();
  let c; try { c = L.classify(P, Date.now(), { only: id }); } catch (e) { console.error(`STOP: ${e.message}`); return 2; }
  const row = c.rows.find(r => r.id === id);
  if (!row) { console.error(`REFUSED: ${id} is not an admin team session or remains`); return 1; }
  if (['running', 'held', 'kept', 'foreign'].includes(row.class)) { console.error(`REFUSED: ${id} is ${row.class}`); return 1; }
  const dest = path.join(P.archive, 'scratch', id);
  const manifestPath = path.join(dest, 'MANIFEST.json');

  if (L.flag('--verify')) {
    const v = verify(P, id);
    console.log(JSON.stringify(v));
    return v.verified ? 0 : 1;
  }

  const ptrs = findPointers(P, id, { from: row.from, to: row.to });
  const items = new Map(); const dangling = [];
  for (const p of ptrs) {
    const r = resolve(P, id, p);
    if (!r) { if (p.form !== 'relative, no time') dangling.push(p); continue; }
    const key = r.abs;
    if (!items.has(key)) items.set(key, Object.assign({ pointers: [] }, r));
    items.get(key).pointers.push(`${p.where} (${p.form})`);
  }
  // An item inside another item is copied with it.
  const keys = [...items.keys()];
  for (const k of keys) if (keys.some(o => o !== k && k.startsWith(o + path.sep))) {
    const outer = keys.find(o => o !== k && k.startsWith(o + path.sep));
    items.get(outer).pointers.push(...items.get(k).pointers); items.delete(k);
  }
  if (L.flag('--list')) {
    console.log(JSON.stringify({ id, items: [...items.values()].map(i => ({ item: i.item, temp: i.temp, pointers: i.pointers })), dangling }, null, 1));
    return 0;
  }
  if (!L.flag('--copy')) { console.error('one of --list, --copy, --verify'); return 2; }
  const cap = Number(L.opt('--cap-mb', '100')) * 1048576;
  if (fs.existsSync(dest) && fs.readdirSync(dest).length) { console.error(`REFUSED: ${dest} is not empty`); return 1; }
  const manifest = { id, copiedAt: new Date().toISOString(), capBytes: cap, items: [], dangling };
  for (const it of items.values()) {
    const { files, links } = filesUnder(it.abs);
    const bytes = files.reduce((n, f) => n + f.bytes, 0);
    const entry = { item: it.item, temp: it.temp, pointers: it.pointers, bytes, links: links.map(l => path.relative(it.temp, l).replace(/\\/g, '/')), files: [] };
    if (bytes > cap) {
      entry.over = true;
      entry.description = path.join('descriptions', it.item + '.md').replace(/\\/g, '/');
      entry.files = files.map(f => ({ rel: path.relative(it.temp, f.abs).replace(/\\/g, '/'), bytes: f.bytes }));
      manifest.items.push(entry); continue;
    }
    for (const f of files) {
      const rel = path.relative(it.temp, f.abs);
      const to = path.join(dest, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(f.abs, to);
      entry.files.push({ rel: rel.replace(/\\/g, '/'), bytes: f.bytes, sha256: L.sha256File(f.abs) });
    }
    manifest.items.push(entry);
  }
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  const copied = manifest.items.filter(i => !i.over);
  console.log(JSON.stringify({ id, dest, items: copied.length, files: copied.reduce((n, i) => n + i.files.length, 0),
    bytes: copied.reduce((n, i) => n + i.bytes, 0), over: manifest.items.filter(i => i.over).map(i => ({ item: i.item, bytes: i.bytes, files: i.files.length, description: path.join(dest, i.description) })),
    dangling: dangling.length }));
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { findPointers, resolve, verify };
