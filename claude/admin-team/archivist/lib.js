'use strict';
// Shared by the Archivist's session scripts: where things are, which sessions
// are the admin team's, which are running, held, kept or older, and the
// stores each one has. Reads only; nothing here writes or removes.
//
// Every path can be moved for a test: --root <the .claude folder>,
// --temp <the temp folder's claude/ folder>, --project <the team's project
// folder>, --archive <the archive folder>. Defaults: ~/.claude,
// <os temp>/claude, ~/.claude/projects/<the team folder's name>,
// ~/.claude/admin-team/archive.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const QUIET_MS = 10 * 60 * 1000;

function opt(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.includes(name); }

// Claude Code names a project folder after its working directory, every
// character that is not a letter or a digit replaced by "-".
function slug(p) { return p.replace(/[^A-Za-z0-9]/g, '-'); }

function paths() {
  const root = path.resolve(opt('--root', path.join(os.homedir(), '.claude')));
  const team = path.join(root, 'admin-team');
  return {
    root,
    team,
    temp: path.resolve(opt('--temp', path.join(os.tmpdir(), 'claude'))),
    project: path.resolve(opt('--project', path.join(root, 'projects', slug(team)))),
    projects: path.join(root, 'projects'),
    sessions: path.join(root, 'sessions'),
    fileHistory: path.join(root, 'file-history'),
    sessionEnv: path.join(root, 'session-env'),
    archive: path.resolve(opt('--archive', path.join(team, 'archive'))),
  };
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (e) { /* a torn line is skipped */ }
  }
  return out;
}
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function sha256Text(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

// Walks a file or folder without following links: total bytes, newest mtime, files.
function walk(p) {
  const res = { bytes: 0, newest: 0, files: 0, links: [] };
  if (!fs.existsSync(p)) return res;
  const stack = [p];
  while (stack.length) {
    const cur = stack.pop();
    let st;
    try { st = fs.lstatSync(cur); } catch (e) { continue; }
    res.newest = Math.max(res.newest, st.mtimeMs);
    if (st.isSymbolicLink()) { res.links.push(cur); continue; }
    if (st.isDirectory()) { for (const e of fs.readdirSync(cur)) stack.push(path.join(cur, e)); }
    else { res.bytes += st.size; res.files++; }
  }
  return res;
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function liveRecords(P) {
  const out = [];
  if (!fs.existsSync(P.sessions)) return out;
  for (const f of fs.readdirSync(P.sessions)) {
    if (!f.endsWith('.json')) continue;
    let r;
    try { r = JSON.parse(fs.readFileSync(path.join(P.sessions, f), 'utf8')); } catch (e) { continue; }
    if (!r || !r.sessionId) continue;
    out.push({ file: f, pid: r.pid, sessionId: r.sessionId, agent: r.agent || null, alive: isAlive(r.pid) });
  }
  return out;
}

// One transcript read for what the classes need: whether it is the team's,
// its title and its first and last time.
function readTranscriptHead(file) {
  const info = { team: false, title: null, from: null, to: null };
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch (e) { continue; }
    if (r.agentSetting === 'admin-team') info.team = true;
    if (r.customTitle) info.title = r.customTitle;
    if (r.timestamp) { if (!info.from || r.timestamp < info.from) info.from = r.timestamp; if (!info.to || r.timestamp > info.to) info.to = r.timestamp; }
  }
  return info;
}

// The temp folders a session left: <temp>/<any folder>/<id>/, both layouts.
function tempFolders(P, id) {
  const out = [];
  if (!fs.existsSync(P.temp)) return out;
  for (const d of fs.readdirSync(P.temp)) {
    const parent = path.join(P.temp, d);
    let st; try { st = fs.lstatSync(parent); } catch (e) { continue; }
    if (!st.isDirectory()) continue;
    const p = path.join(parent, id);
    if (fs.existsSync(p) && fs.lstatSync(p).isDirectory()) out.push(p);
  }
  return out;
}

function stores(P, id) {
  const s = [
    { store: 'transcript', path: path.join(P.project, id + '.jsonl') },
    { store: 'folder', path: path.join(P.project, id) },
    { store: 'file-history', path: path.join(P.fileHistory, id) },
    { store: 'session-env', path: path.join(P.sessionEnv, id) },
  ].filter(x => fs.existsSync(x.path));
  for (const t of tempFolders(P, id)) s.push({ store: 'temp', path: t });
  return s;
}

// The temp folders of ids that no session owns: <temp>/<folder>/<id>/ whose id
// has no transcript or folder in any project folder and that no live record
// names. Each with its files and whether it has been quiet for 10 minutes.
function orphans(P, now = Date.now()) {
  const known = new Set();
  const dirs = [P.project];
  if (fs.existsSync(P.projects)) for (const d of fs.readdirSync(P.projects)) dirs.push(path.join(P.projects, d));
  for (const d of dirs) {
    let names; try { names = fs.readdirSync(d); } catch (e) { continue; }
    for (const n of names) { const id = n.replace(/.jsonl$/, ''); if (ID_RE.test(id)) known.add(id); }
  }
  for (const r of liveRecords(P)) if (r.alive) known.add(r.sessionId);
  const byId = new Map();
  if (!fs.existsSync(P.temp)) return [];
  for (const d of fs.readdirSync(P.temp)) {
    const parent = path.join(P.temp, d);
    let st; try { st = fs.lstatSync(parent); } catch (e) { continue; }
    if (!st.isDirectory()) continue;
    for (const id of fs.readdirSync(parent)) {
      if (!ID_RE.test(id) || known.has(id)) continue;
      const p = path.join(parent, id);
      if (!fs.lstatSync(p).isDirectory()) continue;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(p);
    }
  }
  return [...byId].map(([id, ps]) => {
    const w = ps.map(walk);
    return { id, paths: ps, files: w.reduce((n, x) => n + x.files, 0), links: w.reduce((n, x) => n + x.links.length, 0),
      quiet: w.every(x => x.newest < now - QUIET_MS) };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function readIndex(P) { return readJsonl(path.join(P.archive, 'index.jsonl')); }

// Every admin team session and remains in the team's project folder, with its
// class. Throws when more than one live record names an admin-team agent.
// The live records and every transcript are read in full on every call, so
// the classes are the same whatever opts.only says. opts.only, an id or a test
// of a row that sees its class, limits which rows' stores are walked: a row
// not walked has quiet null. Without it every row is walked. The result's
// bytes maps each walked row's id to the bytes its stores hold.
function classify(P, now = Date.now(), opts = {}) {
  const live = liveRecords(P);
  const teamLive = live.filter(r => r.alive && r.agent === 'admin-team');
  if (teamLive.length > 1) {
    const e = new Error(`more than one live admin-team record: ${teamLive.map(r => r.file).join(', ')}`);
    e.code = 'TWO_TEAMS'; throw e;
  }
  const running = teamLive.length ? teamLive[0].sessionId : null;
  const held = new Set(live.filter(r => r.alive && r.sessionId !== running).map(r => r.sessionId));
  const stale = live.filter(r => !r.alive);
  const index = new Map(readIndex(P).map(l => [l.id, l]));
  const rows = [];
  const names = fs.existsSync(P.project) ? fs.readdirSync(P.project) : [];
  for (const n of names) {
    const m = /^(.*)\.jsonl$/.exec(n);
    if (m && ID_RE.test(m[1])) {
      const h = readTranscriptHead(path.join(P.project, n));
      rows.push({ id: m[1], kind: 'session', team: h.team, title: h.title, from: h.from, to: h.to });
    }
  }
  for (const n of names) {
    if (!ID_RE.test(n) || names.includes(n + '.jsonl')) continue;
    if (!fs.lstatSync(path.join(P.project, n)).isDirectory()) continue;
    const w = walk(path.join(P.project, n));
    rows.push({ id: n, kind: 'remains', team: true, title: null, from: null, to: new Date(w.newest).toISOString() });
  }
  const inactive = rows.filter(r => r.kind === 'session' && r.team && r.id !== running && !held.has(r.id));
  const kept = inactive.reduce((a, b) => (!a || (b.to || '') > (a.to || '') ? b : a), null);
  const only = opts.only === undefined || opts.only === null ? null
    : typeof opts.only === 'function' ? opts.only : (r => r.id === opts.only);
  const bytes = new Map();
  for (const r of rows) {
    const ix = index.get(r.id);
    let cls;
    if (!r.team) cls = 'foreign';
    else if (r.id === running) cls = 'running';
    else if (held.has(r.id)) cls = 'held';
    else if (kept && r.id === kept.id) cls = 'kept';
    else if (ix && ix.verified) cls = 'ready';
    else cls = 'candidate';
    const st = stores(P, r.id);
    if (!only || only(Object.assign({}, r, { class: cls }))) {
      const w = st.map(s => walk(s.path));
      r.quiet = w.every(x => x.newest < now - QUIET_MS);
      bytes.set(r.id, w.reduce((n, x) => n + x.bytes, 0));
    } else r.quiet = null;
    r.stores = st.map(s => s.store);
    r.class = cls;
  }
  rows.sort((a, b) => String(a.from || a.to).localeCompare(String(b.from || b.to)));
  return { running, held: [...held], stale, rows, bytes };
}

// A path to remove must be exactly <parent>/<id><suffix>, and no link.
function safeTarget(parent, id, suffix, target) {
  const want = path.join(path.resolve(parent), id + (suffix || ''));
  if (path.resolve(target) !== want) return `not ${want}`;
  if (!ID_RE.test(id)) return 'not a session id';
  if (!fs.existsSync(target)) return null;
  if (fs.lstatSync(target).isSymbolicLink()) return 'a link';
  return null;
}

module.exports = { ID_RE, QUIET_MS, opt, flag, slug, paths, readJsonl, sha256File, sha256Text, walk, isAlive,
  liveRecords, readTranscriptHead, tempFolders, stores, orphans, readIndex, classify, safeTarget };
