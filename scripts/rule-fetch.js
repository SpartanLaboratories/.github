#!/usr/bin/env node
'use strict';
// S-S-F, the fetch script.
//
// Takes a pointer and prints what it points at, across the four roots (S, P and D in the
// organization repository's checkout, G in the Claude Code configuration): a rule or a section
// as its heading and text without the JSON lines; a file whole, the JSON lines stripped; a
// folder as its index file. It is also the search across the id record. Both are stated in
// Structure.md, R-1011 (The fetch script). It reads the files as the checker does, through the
// same core (rule-lib.js).
//
// The command line:
//   node rule-fetch.js <pointer>           R-1041, 1041, 13-P1 or 10026-1; a name after it is
//                                          ignored
//   node rule-fetch.js <pointer> --follow  for a pointer rule, print its target instead
//   node rule-fetch.js --where <id>        the root, the file and the heading, not the text
//   node rule-fetch.js --old <id>          an id of the numbering before the tiers: its new id,
//                                          from the old-to-new table in G's index
//   node rule-fetch.js --list              the whole id record from both places, each retired
//                                          id with its replacement
//   --policies <path>, --claude <path>     as the checker takes them
// Front matter is stripped from a printed file; --keep-front-matter keeps it.
// Exit 0 when it printed what was asked (a retired id's replacement included); 1 for an id
// nobody holds, or a register it cannot read; 2 when the variable is absent or a checkout it
// needs is missing, with one line naming the checkout and what to do.

const fs = require('fs');
const path = require('path');
const L = require('./rule-lib');

function parseArgs(argv) {
  const a = { pointer: null, follow: false, where: null, old: null, list: false, policies: null, claude: null, keepFrontMatter: false, bad: [] };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--follow') a.follow = true;
    else if (v === '--list') a.list = true;
    else if (v === '--keep-front-matter') a.keepFrontMatter = true;
    else if (v === '--where') a.where = argv[++i];
    else if (v === '--old') a.old = argv[++i];
    else if (v === '--policies') a.policies = argv[++i];
    else if (v === '--claude') a.claude = argv[++i];
    else if (v.startsWith('--')) a.bad.push(v);
    else if (a.pointer === null) a.pointer = v;
    else if (/^\(/.test(v) || /\)$/.test(v) || a.pointer) { /* the name after a pointer, ignored */ }
  }
  for (const k of ['where', 'old', 'policies', 'claude']) if (a[k] === undefined) a.bad.push(`--${k} needs a value`);
  return a;
}

/** Reads a pointer as given: `R-1041`, `1041`, `R-1041 (Name)`, `13-P1`, `10026-1`. */
function pointerId(text) {
  const m = /^\s*(?:R-)?(\d+(?:-P?\d+)*)\b/.exec(String(text));
  return m && L.parseId(m[1]) ? m[1] : null;
}

function main(argv, deps = {}) {
  const out = deps.out || ((s) => process.stdout.write(`${s}\n`));
  const a = parseArgs(argv);
  const asked = [a.pointer, a.where, a.old, a.list ? 'list' : null].filter(x => x !== null);
  if (a.bad.length || asked.length !== 1) {
    out(`usage: node rule-fetch.js <pointer> [--follow] | --where <id> | --old <id> | --list  [--policies <path>] [--claude <path>]${a.bad.length ? `\nunknown or incomplete argument(s): ${a.bad.join(' ')}` : ''}`);
    return 1;
  }
  const v = L.readVariable(L.POLICIES_VARIABLE, { env: deps.env, readStored: deps.readStored });
  if (!a.policies && !v.value) { out(`${L.POLICIES_VARIABLE} is not set: there is no checkout of the organization repository; set it to one.`); return 2; }
  const policies = path.resolve(a.policies || v.value);
  if (!fs.existsSync(policies)) { out(`${policies}: the checkout of the organization repository is missing; clone it there.`); return 2; }
  const claude = L.claudeRoot(a.claude, policies);
  const files = new L.Files();
  const sys = L.buildSystem({ policies, claude, standing: v.value ? path.resolve(v.value) : policies, files, env: deps.env, readStored: deps.readStored });
  if (sys.places.length < 2) { out(sys.findings.filter(f => /register/.test(f)).join('\n') || 'the registers cannot be read'); return 1; }
  const retired = new Map();
  for (const p of sys.places) for (const r of p.register.ids.retired) retired.set(L.idKey(r.id), r.by);
  const missing = () => {
    const repos = [...new Set(sys.notChecked.map(n => `${n.repo} (expected at ${n.checkout}, or where ${n.variable} says)`))];
    return repos.length ? `the checkout of ${repos.join(', ')} is missing and may hold it; clone it beside the organization repository's checkout.` : null;
  };
  const nameOf = (id) => { const it = sys.items.get(L.idKey(id)); return it ? `R-${L.idKey(id)} (${it.heading})` : `R-${L.idKey(id)}`; };

  if (a.list) {
    const rows = [...sys.items.values()].map(it => ({ it, p: L.parseId(it.id) }));
    const k = (x) => (x.p.kind === 'tiered' ? [x.p.tier, x.p.n, ''] : [String(L.baseId(x.it.id)).length, L.baseId(x.it.id), L.idKey(x.it.id)]);
    rows.sort((x, y) => { const p = k(x), q = k(y); return p[0] - q[0] || p[1] - q[1] || (p[2] < q[2] ? -1 : p[2] > q[2] ? 1 : 0); });
    out('In use:');
    for (const { it } of rows) out(`  R-${L.idKey(it.id)} (${it.heading})  ${L.describe(it)}`);
    out('Retired:');
    if (!retired.size) out('  none');
    for (const [id, by] of retired) out(`  R-${id}: ${by === null ? 'nothing replaced it' : `replaced by ${nameOf(by)}`}`);
    for (const n of sys.notChecked) out(`not read: ${n.repo}:${n.entry.rel}; ${missing()}`);
    return 0;
  }

  if (a.old !== null) {
    const gPlace = sys.places.find(p => p.key === 'G');
    const indexAbs = path.resolve(path.dirname(gPlace.registerPath), gPlace.register.index);
    const table = L.readOldTable(fs.existsSync(indexAbs) ? fs.readFileSync(indexAbs, 'utf8') : null);
    const key = String(a.old).replace(/^R-/, '');
    const row = table.rows.find(r => r.old === key);
    if (!row) { out(`old R-${key}: not in the old-to-new table${table.text === null ? ' (G\'s index holds no table)' : ''}`); return 1; }
    if (row.now === 'none') { out(`old R-${key}: retired before the renumbering; nothing took its place`); return 0; }
    const it = sys.items.get(row.now);
    out(`old R-${key} is now ${nameOf(row.now)}${it ? `: ${L.describe(it)}` : ''}`);
    return 0;
  }

  const id = pointerId(a.where !== null ? a.where : a.pointer);
  if (!id) { out(`${a.where !== null ? a.where : a.pointer}: not a pointer; a pointer reads R-<id>, e.g. R-1041, R-13-P1 or R-10026-1`); return 1; }
  const where = new Map([...sys.items.values()].map(it => [L.idKey(it.id), L.describe(it)]));
  const found = L.locate(id, where, retired);
  if (!found) {
    const m = missing();
    if (m) { out(`R-${id}: not found in what was read; ${m}`); return 2; }
    out(`R-${id}: no item holds this id, and it is not retired`);
    return 1;
  }
  if (found.state === 'retired') {
    out(`R-${id} is retired; ${found.by === null ? 'nothing replaced it' : `${nameOf(found.by)} replaced it`}.`);
    return 0;
  }
  if (a.where !== null) { out(found.where); return 0; }

  let it = sys.items.get(id);
  if (a.follow) {
    const seen = new Set();
    while (it && it.kind === 'pointer' && !seen.has(L.idKey(it.id))) {
      seen.add(L.idKey(it.id));
      const target = L.parseId(it.id).parent;
      const t = sys.items.get(target);
      if (!t) {
        if (retired.has(target)) { out(`${nameOf(it.id)} points at R-${target}, which is retired; ${retired.get(target) === null ? 'nothing replaced it' : `${nameOf(retired.get(target))} replaced it`}.`); return 0; }
        const m = missing();
        out(`${nameOf(it.id)} points at R-${target}, which was not found${m ? `; ${m}` : ''}`);
        return m ? 2 : 1;
      }
      it = t;
    }
  }
  out(render(it, a));
  return 0;
}

/** What an item prints as: R-1011 (The fetch script). */
function render(it, a) {
  if (it.kind === 'listed') return fs.readFileSync(it.listed.abs, 'utf8').replace(/\s+$/, '');
  if (it.kind === 'main' || it.kind === 'file' || it.kind === 'folder') return L.printFile(it.read, { keepFrontMatter: a.keepFrontMatter });
  return L.printItem(it.read, it.item);
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, pointerId };
