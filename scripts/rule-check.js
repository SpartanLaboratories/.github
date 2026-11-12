#!/usr/bin/env node
'use strict';
// S-S-C, the checker.
//
// Checks the rule system's four roots: S, P and D in the organization repository's checkout,
// G in the Claude Code configuration. Every rule of the system is stated in Structure.md; this
// script enforces it.
//
//   node rule-check.js                      check; exit 1 on any finding
//   node rule-check.js --write              check, then correct the codes, raise the tier marks in
//                                           the lists and the per-parent marks on the lines, and
//                                           rewrite the indexes; any finding leaves every file as
//                                           it is. G is written in place; S, P and D only in the
//                                           copy being committed, named with --policies
//   node rule-check.js --policies <path>    read S, P and D from that copy, not the standing
//                                           checkout the variable names
//   node rule-check.js --claude <path>      read G from there (by default the Claude
//                                           Code configuration in the home folder, else the
//                                           checkout's claude/ copy)
//   node rule-check.js --pointers-at <id>   list every pointer at an id, and check nothing
//   node rule-check.js --renumber <plan>    the one-time renumbering: give G's items
//                                           their tiered ids, rewrite the pointers at old ids and
//                                           write the old-to-new table into G's index; with
//                                           --write it writes, else it prints what it would do
//   node rule-check.js --defer-policies     with --write and no --policies copy: write G and
//                                           report what S, P and D need as pending instead of as
//                                           findings; the commit that carries G's edit into its
//                                           copy writes them
//
// The organization repository's checkout is found through SPARTAN_ORG_POLICIES, the process
// environment first and the stored user value second; unset, it is a finding. A file in another
// repository is read from a sibling folder of that checkout; a missing checkout makes the file
// "not checked", which is no failure. What it checks, and these switches, are stated in
// Structure.md, R-1010 (The checker).

const fs = require('fs');
const path = require('path');
const L = require('./rule-lib');

function parseArgs(argv) {
  const a = { write: false, policies: null, claude: null, pointersAt: null, renumber: null, deferPolicies: false, help: false, bad: [] };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--write') a.write = true;
    else if (v === '--defer-policies') a.deferPolicies = true;
    else if (v === '--policies') a.policies = argv[++i];
    else if (v === '--claude') a.claude = argv[++i];
    else if (v === '--pointers-at') a.pointersAt = argv[++i];
    else if (v === '--renumber') a.renumber = argv[++i];
    else if (v === '--help' || v === '-h') a.help = true;
    else a.bad.push(v);
  }
  for (const k of ['policies', 'claude', 'pointersAt', 'renumber']) if (a[k] === undefined) a.bad.push(`--${k} needs a value`);
  return a;
}

const same = (a, b) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

// ------------------------------------------------------------------------------- the check

/**
 * Runs the whole check over the system as the file layer shows it, and puts every correction a
 * --write makes into the layer's overlay. The caller flushes the overlay only when there is no
 * finding and the run was asked to write.
 * @returns {{findings:string[], notes:string[], pending:string[], stop:boolean, sys:object, counts:object}}
 */
function check(ctx) {
  const { files } = ctx;
  const findings = [...(ctx.preFindings || [])];
  const notes = [];
  const sys = L.buildSystem({ policies: ctx.policies, claude: ctx.claude, standing: ctx.standing, files, env: ctx.env, readStored: ctx.readStored });
  findings.push(...sys.findings);
  for (const nc of sys.notChecked) notes.push(`not checked: ${nc.repo}:${nc.entry.rel}; no checkout at ${nc.checkout} (set ${nc.variable} to override the folder)`);
  const anyUnchecked = sys.notChecked.length > 0;
  const changes = []; // {abs, place, kind, apply(lines)}, applied after the checks
  const lists = sys.places.map(p => p.register.ids);
  const retired = new Map();
  for (const l of lists) for (const r of l.retired) retired.set(L.idKey(r.id), r.by);

  // ---- each JSON line: its keys, its name, its form, its tier: R-1003 (A rule), R-1004 (`id`)
  for (const it of sys.all) {
    if (!it.item || !it.item.json) continue;
    const j = it.item.json;
    const keys = Object.keys(j);
    const order = L.LINE_KEYS.filter(k => keys.includes(k));
    if (keys.join() !== order.join() || keys.some(k => !L.LINE_KEYS.includes(k)) || !['name', 'code', 'id'].every(k => keys.includes(k))) {
      findings.push(`${it.entry.rel}:${it.item.jsonLine}: the JSON line reads {"name","code","id"} in that order, then "splinterMark" and "pointerMark" where they are above zero; it has ${JSON.stringify(keys)}`);
    }
    if (typeof j.name !== 'string' || j.name !== it.item.heading) findings.push(`${it.where}: JSON name ${JSON.stringify(j.name)} differs from its heading "${it.item.heading}"`);
    if (typeof j.code !== 'string') findings.push(`${it.where}: the JSON line's code needs a string`);
    if (it.item.jsonForm === L.FORM.comment && typeof j.name === 'string' && j.name.includes('-->')) findings.push(`${it.where}: a name holding "-->" cannot stand in the comment form`);
    for (const m of ['splinterMark', 'pointerMark']) if (j[m] !== undefined && !(Number.isInteger(j[m]) && j[m] >= 0)) findings.push(`${it.where}: ${m} needs a whole number`);
    const p = L.parseId(j.id);
    if (it.kind === 'main') {
      const want = L.MAIN_FILES[path.basename(it.entry.rel)];
      if (!want || j.id !== want.id) findings.push(`${it.where}: the main file ${it.entry.rel} carries id ${want ? want.id : '?'} (Structure.md, \`id\`), the line says ${JSON.stringify(j.id)}`);
    } else if (it.kind === 'folder' || it.kind === 'file') {
      if (!p || p.kind !== 'tiered' || p.tier !== it.tier) findings.push(`${it.where}: the title line of ${it.kind === 'folder' ? `the index file of folder ${it.folder.rel}` : 'a file'} takes a ${it.tier}-digit id (Structure.md, \`id\`), the line says ${JSON.stringify(j.id)}`);
    }
    if (it.expectedCode !== undefined && j.code !== it.expectedCode) {
      changes.push({ entry: it.entry, kind: 'code', what: `${it.where}: stale code "${j.code}", the place gives "${it.expectedCode}"`, it, set: { code: it.expectedCode } });
    }
  }

  // ---- one code, one item (carried over from today's checker)
  const codeOwner = new Map();
  for (const it of sys.all) {
    if (!it.expectedCode) continue;
    if (codeOwner.has(it.expectedCode)) findings.push(`${it.where}: code ${it.expectedCode} is also ${codeOwner.get(it.expectedCode)}`);
    else codeOwner.set(it.expectedCode, it.where);
  }

  // ---- the two id lists as one record: R-1004 (`id`)
  const inUse = [];
  for (const it of sys.all) {
    const p = L.parseId(it.id);
    if (p && p.kind === 'tiered') inUse.push({ id: it.id, where: it.where, list: (it.entry.place || it.listed.place).list });
  }
  const rec = L.checkRecord(inUse, lists, { reserved: Object.values(L.MAIN_FILES).map(m => m.id) });
  findings.push(...rec.findings);
  if (rec.stop) return { findings, notes, pending: [], stop: true, sys, counts: {} };
  if (anyUnchecked) for (const g of rec.gaps) notes.push(`not checked: ${g}, which may be in a file whose checkout is missing`);
  else findings.push(...rec.gaps);
  for (const s of rec.stale) {
    const place = sys.places[s.list];
    changes.push({ registerOf: place, kind: 'tier mark', what: `${place.registerPath}: the tier ${s.tier} mark ${s.from} is below id ${s.to}`, tier: s.tier, to: s.to });
  }

  // ---- the per-parent marks on the lines: R-1005 (Splinters), R-1006 (Pointer rules)
  const retiredStrings = new Set([...retired.keys()].filter(k => L.parseId(k)?.kind !== 'tiered'));
  const pm = L.checkPartMarks(sys.lineRecords, retiredStrings, { detail: true });
  findings.push(...pm.findings);
  for (const m of pm.missing) {
    if (anyUnchecked) notes.push(`not checked: the parts of ${m}, whose line was not read`);
    else findings.push(`parts of ${m} are in use or retired, and nothing holds ${m}`);
  }
  for (const r of pm.raise) {
    const owner = sys.items.get(r.id);
    if (owner.kind === 'listed') {
      // a listed item has no line: its pointerMark stands on its register entry, R-1006 (Pointer rules)
      changes.push({ registerOf: owner.listed.place, kind: 'listed mark', what: `${owner.where}: ${r.field} ${r.from || 'absent'} is below part ${r.to} in use or retired`, rel: owner.listed.rel, field: r.field, to: r.to });
      continue;
    }
    changes.push({ entry: owner.entry, kind: 'part mark', what: `${owner.where}: ${r.field} ${r.from || 'absent'} is below part ${r.to} in use or retired`, it: owner, set: { [r.field]: r.to } });
  }

  // ---- pointers: R-1008 (Pointers)
  const allPointers = [];
  for (const e of sys.fileEntries) {
    if (!e.read) continue;
    const pub = e.root.letter !== 'G';
    const ptrs = L.findPointers(e.read, pub);
    e.pointers = ptrs;
    for (const ptr of ptrs) {
      const at = `${sys.where(e)}:${ptr.line}`;
      allPointers.push({ e, ptr, at });
      const target = sys.items.get(ptr.id);
      if (!target) {
        if (retired.has(ptr.id)) findings.push(`${at}: pointer R-${ptr.id} is at a retired id${retired.get(ptr.id) !== null ? `; R-${retired.get(ptr.id)} replaced it` : ''}`);
        else if (anyUnchecked) notes.push(`not checked: ${at}: R-${ptr.id} is not in what was read`);
        else findings.push(`${at}: pointer to unknown id R-${ptr.id}`);
        continue;
      }
      ptr.target = target;
      const name = target.heading;
      if (ptr.name === null) findings.push(`${at}: pointer R-${ptr.id} has no name, expected "R-${ptr.id} (${name})"`);
      else if (ptr.name !== name) findings.push(`${at}: pointer R-${ptr.id} names "${ptr.name}", the target is "${name}"`);
      if (pub && target.entry.root.letter === 'G') findings.push(`${at}: an id pointer from ${e.root.letter} into G; nothing in S, P or D points into G (Structure.md, Pointers)`);
      if (ptr.bare) findings.push(`${at}: on a public page a pointer is the text of a Markdown link to its target (Structure.md, Pointers)`);
      if (ptr.href !== null) {
        const tFile = target.kind === 'listed' ? target.listed.abs : target.entry.abs;
        const anchored = ['section', 'rule', 'splinter', 'pointer'].includes(target.kind);
        const want = { file: tFile, anchor: anchored ? target.item.anchor : null, folder: target.kind === 'folder' ? target.folder.abs : null };
        if (target.entry.repo && target.entry.repo !== e.repo) {
          const url = target.entry.repoUrl;
          if (!url) notes.push(`not checked: ${at}: the link to ${target.entry.repo}, whose register entry gives no url`);
          else if (ptr.href !== `${url}${target.entry.rel}${want.anchor ? `#${want.anchor}` : ''}`) findings.push(`${at}: the link to R-${ptr.id} goes to ${ptr.href}, the target is at ${url}${target.entry.rel}${want.anchor ? `#${want.anchor}` : ''}`);
        } else {
          const ok = L.linkMatches(e.abs, ptr.href, want);
          if (ok === null) notes.push(`not checked: ${at}: R-${ptr.id} is linked by an absolute URL`);
          else if (ok !== true) findings.push(`${at}: the link around R-${ptr.id}: ${ok}`);
        }
      }
    }
  }

  // ---- pointer rules: the body rule, and a repointed rule takes a new id: R-1006 (Pointer rules)
  for (const it of sys.items.values()) {
    if (it.kind !== 'pointer') continue;
    const target = L.parseId(it.id).parent;
    const e = it.entry;
    const body = e.read.masked.slice(it.item.bodyStart, it.item.bodyEnd);
    const filled = body.map((l, i) => (l.trim() ? i : -1)).filter(i => i !== -1);
    const inBody = (e.pointers || []).filter(p => p.line - 1 >= it.item.bodyStart && p.line - 1 < it.item.bodyEnd);
    if (!filled.length) findings.push(`${it.where}: pointer rule ${it.id} has an empty body; its body points at R-${target}`);
    else if (filled[filled.length - 1] - filled[0] + 1 !== filled.length) findings.push(`${it.where}: pointer rule ${it.id} has a body of more than one paragraph; its whole body points at R-${target}`);
    if (inBody.length === 1 && inBody[0].id !== target) findings.push(`${it.where}: pointer rule ${it.id} points at R-${inBody[0].id}, its id names R-${target}: repointed without a new id; a repointed pointer rule takes a new id, the old one retired (Structure.md, Pointer rules)`);
    else if (inBody.length !== 1) findings.push(`${it.where}: pointer rule ${it.id} holds ${inBody.length} pointers; its only pointer is at R-${target}`);
    const t = sys.items.get(target);
    if (!t) {
      if (anyUnchecked) notes.push(`not checked: ${it.where}: the target R-${target} is not in what was read`);
      else findings.push(`${it.where}: pointer rule ${it.id} is at R-${target}, which ${retired.has(target) ? 'is retired' : 'does not exist'}`);
    } else if (e.root.letter !== 'G' && t.entry.root.letter === 'G') findings.push(`${it.where}: a pointer rule from ${e.root.letter} into G; nothing in S, P or D points into G (Structure.md, Pointers)`);
  }

  // ---- by-file references in a converted rule file, relative or by a full address: R-1008 (Pointers)
  const systemFile = (abs) => {
    const k = path.resolve(abs);
    const e = sys.byAbs.get(k);
    if (e) return { what: e.rel, converted: e.converted, entry: e, root: e.root.letter };
    const l = sys.listed.find(x => path.resolve(x.abs) === k);
    if (l) return { what: l.rel, converted: true, root: l.root.letter };
    const f = sys.folders.find(x => path.resolve(x.abs) === k.replace(/[\\/]+$/, ''));
    if (f) return { what: `${f.rel}/`, converted: f.core ? f.core.converted : true, root: f.root.letter };
    return null;
  };
  const convertedReads = sys.fileEntries.filter(e => e.read && e.converted);
  for (const e of convertedReads) {
    for (const ln of L.findLinks(e.read)) {
      if (ln.href.startsWith('/')) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(ln.href)) {
        // a full GitHub address of a file in a repository the registers give an address for; an
        // address under `claude/` in the organization repository is G's public copy, read in G
        const abs = L.githubTarget(ln.href, sys.addresses);
        const target = abs && systemFile(abs);
        if (!target) continue;
        const byAddress = target.root === 'G' ? 'by the full address of its public copy' : 'by its full address';
        // nothing in S, P or D points into G, in any form, whether the file is converted or not
        if (target.root === 'G' && e.root.letter !== 'G') findings.push(`${sys.where(e)}:${ln.line}: a link into G, ${byAddress}, to ${target.what}; nothing in S, P or D points into G: remove the link or name the file in code formatting (Structure.md, Pointers)`);
        else if (target.converted) findings.push(`${sys.where(e)}:${ln.line}: a by-file link, ${byAddress}, to ${target.entry && target.entry.repo ? `${target.entry.repo}:` : ''}${target.what}, which is inside the rule system; point at it by id (Structure.md, Pointers)`);
        continue;
      }
      const hash = ln.href.indexOf('#');
      const filePart = hash === -1 ? ln.href : ln.href.slice(0, hash);
      let target;
      let viaCopy = false;
      try {
        if (!filePart) target = { what: `${e.rel} (this file)`, converted: true, root: e.root.letter };
        else {
          const abs = path.resolve(path.dirname(e.abs), decodeURI(filePart));
          // a relative link into G's public copy, under `claude/` in the organization repository,
          // is read in G, wherever G is read from
          const inG = L.gCopyTarget(abs, sys.gCopy);
          viaCopy = !!inG;
          target = systemFile(inG || abs);
        }
      } catch (err) { target = null; }
      if (!target) continue;
      // nothing in S, P or D points into G, in any form, whether the file is converted or not
      if (target.root === 'G' && e.root.letter !== 'G') findings.push(`${sys.where(e)}:${ln.line}: a link into G, ${viaCopy ? 'by a relative link into its public copy' : 'by a relative link'}, to ${target.what}; nothing in S, P or D points into G: remove the link or name the file in code formatting (Structure.md, Pointers)`);
      else if (target.converted) findings.push(`${sys.where(e)}:${ln.line}: a by-file link to ${target.what}, which is inside the rule system; point at it by id (Structure.md, Pointers)`);
    }
    for (const q of L.findQuoted(e.read)) {
      for (const x of convertedReads) {
        const names = [x.rel, path.basename(x.rel)];
        if (!names.some(n => q.lineText.includes(n))) continue;
        if (x.read.items.some(i => i.level >= 2 && i.heading === q.quoted)) findings.push(`${sys.where(e)}:${q.line}: a quoted section reference, "${q.quoted}" of ${x.rel}, which is inside the rule system; point at it by id (Structure.md, Pointers)`);
      }
    }
  }

  // ---- the indexes, R-1009 (The indexes): S-I beside the register of S, P and D; G-I beside G's
  for (const place of sys.places) {
    const indexAbs = path.resolve(path.dirname(place.registerPath), place.register.index);
    if (anyUnchecked && place.key === 'SPD') { notes.push(`not checked: ${indexAbs}, the index of S, P and D, while a checkout is missing`); continue; }
    const current = files.exists(indexAbs) ? files.read(indexAbs) : null;
    const table = place.key === 'G' ? (ctx.oldTableText !== undefined ? ctx.oldTableText : L.readOldTable(current).text) : null;
    const want = renderIndex(sys, place, indexAbs, table);
    if (current !== want) changes.push({ abs: indexAbs, place, kind: 'index', what: `${indexAbs}: out of date`, text: want });
  }

  // ---- what --write would change, and where it may write: R-1010 (The checker)
  const pending = [];
  const policiesWritable = ctx.write && ctx.policiesGiven && !same(ctx.policies, ctx.standing);
  const placeOf = (c) => c.registerOf || c.place || c.entry.place;
  for (const c of changes) {
    const place = placeOf(c);
    const repo = c.entry && c.entry.repo;
    if (!ctx.write) { findings.push(`${c.what}; run with --write${place.key === 'SPD' ? ' in the copy being committed (--policies <path>)' : ''}`); continue; }
    if (repo) { findings.push(`${c.what}; a file in ${repo} changes on that repository's own route, which is not settled yet`); continue; }
    if (place.key === 'SPD' && !policiesWritable) {
      if (ctx.deferPolicies) pending.push(c.what);
      else findings.push(`${c.what}; S, P and D are written only in the copy being committed, named with --policies <path>, never in the standing checkout (Structure.md, The checker)`);
      continue;
    }
    c.go = true;
  }
  if (ctx.write) applyChanges(files, changes.filter(c => c.go));
  const counts = { files: sys.fileEntries.filter(e => e.read).length, items: sys.items.size, changes: changes.filter(c => c.go).length };
  return { findings, notes, pending, stop: false, sys, counts, allPointers };
}

/** Puts the corrections into the overlay: lines rewritten, marks raised, indexes regenerated. */
function applyChanges(files, changes) {
  const byFile = new Map();
  for (const c of changes) {
    if (c.kind === 'code' || c.kind === 'part mark') {
      const k = path.resolve(c.entry.abs);
      if (!byFile.has(k)) byFile.set(k, { entry: c.entry, sets: new Map() });
      const f = byFile.get(k);
      const idx = c.it.item.jsonLine - 1;
      f.sets.set(idx, { ...(f.sets.get(idx) || { it: c.it }), ...c.set, it: c.it });
    }
  }
  for (const [abs, f] of byFile) {
    const read = f.entry.read;
    const lines = read.lines.slice();
    for (const [idx, s] of f.sets) {
      const j = { ...s.it.item.json };
      for (const k of ['code', 'splinterMark', 'pointerMark']) if (s[k] !== undefined) j[k] = s[k];
      lines[idx] = L.formatJsonLine(j, s.it.item.jsonForm || f.entry.root.form);
    }
    files.write(abs, lines.join(read.eol));
  }
  const regs = new Map();
  for (const c of changes.filter(x => x.kind === 'tier mark')) {
    const k = c.registerOf.registerPath;
    if (!regs.has(k)) regs.set(k, { place: c.registerOf, marks: { ...c.registerOf.register.ids.marks } });
    regs.get(k).marks[c.tier] = c.to;
  }
  for (const [p, r] of regs) {
    const text = files.read(p);
    const ordered = {};
    for (const t of ['1', '2', '3', '4', '5']) if (r.marks[t] !== undefined) ordered[t] = r.marks[t];
    const body = `{ ${Object.entries(ordered).map(([t, v]) => `"${t}": ${v}`).join(', ')} }`;
    const next = text.replace(/("marks"\s*:\s*)\{[^}]*\}/, `$1${body}`);
    files.write(p, next);
  }
  // a listed item's pointerMark on its register entry: R-1006 (Pointer rules)
  for (const c of changes.filter(x => x.kind === 'listed mark')) {
    const p = c.registerOf.registerPath;
    files.write(p, setListedMark(files.read(p), c.rel, c.field, c.to));
  }
  for (const c of changes.filter(x => x.kind === 'index')) files.write(c.abs, c.text);
}

/**
 * Sets a mark on a listed entry in a register's text, keeping the file's layout: the entry
 * `"<path>": { ... }` gains the field after its other keys, or has its value replaced.
 */
function setListedMark(text, rel, field, value) {
  const key = rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const re = new RegExp(`("${key}"\\s*:\\s*\\{)([^}]*)(\\})`);
  return text.replace(re, (all, open, inner, close) => {
    const has = new RegExp(`("${field}"\\s*:\\s*)\\d+`);
    if (has.test(inner)) return `${open}${inner.replace(has, `$1${value}`)}${close}`;
    const trail = /\s*$/.exec(inner)[0];
    return `${open}${inner.slice(0, inner.length - trail.length)}, "${field}": ${value}${trail}${close}`;
  });
}

// ---------------------------------------------------------------------------- the indexes

/**
 * The text of a place's index: every item with an id, file by file in the register's order, each
 * with its link, its code and its name; for G, the old-to-new table carried at its end: R-1009
 * (The indexes).
 */
function renderIndex(sys, place, indexAbs, table) {
  const dir = path.dirname(indexAbs);
  const isG = place.key === 'G';
  const out = [
    isG ? '# Rule index of G' : '# Rule index of S, P and D',
    '',
    `Generated by \`rule-check.js\` from \`${L.toPosix(path.relative(dir, place.registerPath))}\`; not edited by hand.`,
    '',
  ];
  const link = (abs, anchor) => `${L.toPosix(path.relative(dir, abs)) || path.basename(abs)}${anchor ? `#${anchor}` : ''}`;
  const entryLine = (it, depth, abs, anchor) => {
    const label = `R-${L.idKey(it.id)} (${it.heading})`;
    const target = it.entry && it.entry.repo ? (it.entry.repoUrl ? `${it.entry.repoUrl}${it.entry.rel}${anchor ? `#${anchor}` : ''}` : null) : link(abs, anchor);
    out.push(`${'  '.repeat(depth)}- ${target ? `[${label}](${target})` : `${label}, ${it.entry.repo}:${it.entry.rel}`} \`${it.expectedCode}\``);
  };
  const fileBlock = (e, depth) => {
    if (!e || !e.titleItem || e.titleItem.id === undefined) return;
    entryLine(e.titleItem, depth, e.abs, null);
    if (!e.converted || !e.classes) return;
    const kids = (parentKey) => [...sys.items.values()].filter(x => x.kind === 'splinter' && x.parentKey === parentKey && x.entry === e);
    const emitSplinters = (key, d) => { for (const s of kids(key)) { entryLine(s, d, e.abs, s.item.anchor); emitSplinters(L.idKey(s.id), d + 1); } };
    for (const c of e.classes) {
      const s = c.item;
      if (!s.json) continue;
      const it = sys.items.get(L.idKey(s.json.id));
      if (!it || it.entry !== e) continue;
      entryLine(it, depth + 1, e.abs, s.anchor);
      emitSplinters(L.idKey(it.id), depth + 2);
      for (const r of c.rules) {
        const ri = sys.items.get(L.idKey(r.json.id));
        if (!ri || ri.entry !== e) continue;
        entryLine(ri, depth + 2, e.abs, r.anchor);
        emitSplinters(L.idKey(ri.id), depth + 3);
      }
    }
  };
  const walk = (node, depth) => {
    for (const c of node.children) {
      if (c.kind === 'folder') { fileBlock(c.core, depth); walk(c, depth + 1); }
      else if (c.kind === 'listed') { if (c.item && c.id !== null) entryLine(c.item, depth, c.abs, null); }
      else fileBlock(c, depth);
    }
  };
  for (const letter of isG ? ['G'] : ['S', 'P', 'D']) {
    const root = sys.roots[letter];
    if (!root || root.place !== place) continue;
    out.push(`## ${letter}`, '');
    fileBlock(root.main, 0);
    walk(root, 1);
    out.push('');
  }
  if (isG && table) out.push(table, '');
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

// ------------------------------------------------------------------- pointers at an id: R-1002 (Sections)

function listPointersAt(ctx, id) {
  const r = check({ ...ctx, write: false });
  const key = L.idKey(id);
  const rows = [];
  for (const it of r.sys.items.values()) {
    if (it.kind === 'pointer' && L.parseId(it.id).parent === key) rows.push(`${it.where}: pointer rule ${it.id} (${it.heading})`);
  }
  for (const { ptr, at } of r.allPointers || []) if (ptr.id === key) rows.push(`${at}: R-${ptr.id} (${ptr.name})`);
  const target = r.sys.items.get(key);
  console.log(target ? `R-${key} (${target.heading}): ${L.describe(target)}` : `R-${key}: not in use`);
  for (const row of rows) console.log(`  ${row}`);
  console.log(`${rows.length} pointer(s) at R-${key}`);
  for (const n of r.notes) console.log(n);
  return target ? 0 : 1;
}

// --------------------------------------------------------------- the renumbering, run once

/**
 * The one-time renumbering. G's register is already in the new form and G's files carry the old
 * ids; the plan names the old register, the files that moved, and the old file whose ids now
 * live in S. Ids are given in the order items enter, R-1004 (`id`): G's main file 4; then G's folders,
 * files and listed items in the register's order, each tier counting up from the record's mark;
 * then each file's sections and rules in reading order. Pointer rules keep their part: `28-3`
 * becomes `<new 28>-P3`. Every pointer `R-<old>` in G's Markdown files is rewritten with its new
 * id and its target's name, the old index excepted; a pointer or pointer rule already at an id of
 * S, P or D keeps it. The plan's `moved` gives, for the old-to-new table, the item that now
 * carries the subject of an old id whose item left its file. The retired list is reset: every
 * old id has its row in the old-to-new table, R-1009 (The indexes), so the list starts empty.
 */
function renumber(ctx, planPath) {
  const files = ctx.files;
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const old = JSON.parse(fs.readFileSync(path.resolve(path.dirname(planPath), plan.oldRegister), 'utf8'));
  const findings = [];
  const sys = L.buildSystem({ policies: ctx.policies, claude: ctx.claude, standing: ctx.standing, files, env: ctx.env });
  const gPlace = sys.places.find(p => p.key === 'G');
  const spd = sys.places.find(p => p.key === 'SPD');
  if (!gPlace || !spd) { console.log(sys.findings.join('\n')); console.log('FAIL: both registers are needed'); return 1; }
  const G = sys.roots.G;
  const gEntries = sys.fileEntries.filter(e => e.root === G);
  const unreadable = gEntries.filter(e => !e.read || !e.title);
  for (const e of unreadable) findings.push(`${e.rel}: needs a # title before the renumbering (Structure.md, Files and folders)`);

  // the record's marks before G takes its ids: the ids S, P and D use, and both lists' marks
  const mark = {};
  for (let t = 1; t <= 5; t++) mark[t] = Math.max(spd.register.ids.marks[t] || 0, gPlace.register.ids.marks[t] || 0);
  for (const it of sys.items.values()) {
    if (it.entry.root.letter === 'G') continue;
    const p = L.parseId(it.id);
    if (p && p.kind === 'tiered') mark[p.tier] = Math.max(mark[p.tier], p.n);
  }
  // each tier counts from its first number (10, 100, 1000, 10000) when nothing holds it yet: R-1004 (`id`)
  const next = (t) => { mark[t] = Math.max(mark[t], L.TIER_START[t] - 1) + 1; return mark[t]; };
  const oldMap = new Map(); // old id key -> new id
  const oldName = new Map(); // old id key -> heading today
  const edits = new Map(); // abs -> { entry, set: Map(itemLine -> id), insert: Map(itemLine -> id) }
  const editOf = (e) => { const k = path.resolve(e.abs); if (!edits.has(k)) edits.set(k, { entry: e, set: new Map() }); return edits.get(k); };
  const title = (e, id) => { editOf(e).set.set(e.title.line, id); };

  if (G.main.title) title(G.main, L.MAIN_FILES['CLAUDE.md'].id);
  for (const f of G.folders) if (f.core && f.core.title) title(f.core, next(2));
  const files3 = gEntries.filter(e => e.role === 'file');
  for (const e of files3) if (e.title) title(e, next(3));
  const listedIds = [];
  for (const l of sys.listed.filter(x => x.root === G)) {
    if (l.id === null || l.id === undefined) { l.newId = next(3); listedIds.push(l); }
  }
  const order = [G.main, ...G.folders.map(f => f.core).filter(Boolean), ...files3];
  const deferred = [];
  for (const e of order) {
    if (!e.read || !e.converted) continue;
    const its = e.read.items;
    for (let k = 0; k < its.length; k++) {
      const it = its[k];
      if (it.level === 1) continue;
      if (it.level === 2) {
        const children = [];
        for (let m = k + 1; m < its.length && its[m].level > 2; m++) if (its[m].level === 3) children.push(its[m]);
        if (it.json && typeof it.json.id === 'string') { deferred.push({ e, it }); continue; }
        if (!it.json && !children.some(c => c.json)) { findings.push(`${e.rel}:${it.line}: a ## section with no JSON line and no rules; give it a line before the renumbering`); continue; }
        const id = next(4);
        if (it.json) { oldMap.set(L.idKey(it.json.id), id); oldName.set(L.idKey(it.json.id), it.heading); }
        editOf(e).set.set(it.line, id);
      } else if (it.level === 3 && it.json) {
        if (typeof it.json.id === 'string') { deferred.push({ e, it }); continue; }
        const id = next(5);
        oldMap.set(L.idKey(it.json.id), id);
        oldName.set(L.idKey(it.json.id), it.heading);
        editOf(e).set.set(it.line, id);
      }
    }
  }
  // old ids that now live in S (Structure-Policy.md to Structure.md)
  for (const [oldPath, to] of Object.entries(plan.toS || {})) {
    const src = path.join(ctx.claude, oldPath);
    if (!fs.existsSync(src)) { findings.push(`${oldPath}: the old file is needed to map its ids into S`); continue; }
    const read = L.readFile(fs.readFileSync(src, 'utf8'), L.FORM.visible);
    const sEntry = sys.fileEntries.find(x => x.root.letter === 'S' && x.rel === to.file);
    for (const it of read.items) {
      if (!it.json || it.level === 1) continue;
      const heading = (to.headings || {})[it.heading] || it.heading;
      const target = sEntry && sEntry.read && sEntry.read.items.find(x => x.heading === heading && x.json);
      if (!target) { findings.push(`${oldPath}:${it.line}: old R-${it.json.id} (${it.heading}) has no section "${heading}" in ${to.file}`); continue; }
      oldMap.set(L.idKey(it.json.id), target.json.id);
      oldName.set(L.idKey(it.json.id), it.heading);
    }
  }
  // an item of S, P or D, which a file of G may already point at by its id before the renumbering
  const spdItem = (key) => { const x = sys.items.get(L.idKey(key)); return x && x.entry.root.letter !== 'G' ? x : null; };
  for (const { e, it } of deferred) {
    const p = L.parseId(it.json.id);
    const t = p && oldMap.get(p.parent);
    if (!t && p && spdItem(p.parent)) continue; // already at its target in S, P or D: it keeps its id
    if (!t) { findings.push(`${e.rel}:${it.line}: old ${it.json.id} is at R-${p ? p.parent : '?'}, which has no new id`); continue; }
    const id = `${t}-P${p.part}`;
    oldMap.set(L.idKey(it.json.id), id);
    oldName.set(L.idKey(it.json.id), it.heading);
    editOf(e).set.set(it.line, id);
  }
  for (const r of old.retiredIds || []) if (!oldMap.has(L.idKey(r))) oldMap.set(L.idKey(r), null);

  // write the lines: a line under each title and section that lacks one, the new id on each
  for (const { entry: e, set } of edits.values()) {
    const lines = e.read.lines.slice();
    const byLine = new Map(e.read.items.map(i => [i.line, i]));
    const at = [...set.keys()].sort((a, b) => b - a);
    for (const line of at) {
      const it = byLine.get(line);
      const j = { name: it.heading, code: it.json ? it.json.code : '', id: set.get(line) };
      if (it.json) lines[it.jsonLine - 1] = L.formatJsonLine(j, L.FORM.visible);
      else lines.splice(line, 0, L.formatJsonLine(j, L.FORM.visible));
    }
    files.write(e.abs, lines.join(e.read.eol));
  }
  // the listed items' ids into G's register
  if (listedIds.length) {
    let text = files.read(gPlace.registerPath);
    for (const l of listedIds) {
      const re = new RegExp(`("${l.rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"\\s*:\\s*\\{[^}]*"id"\\s*:\\s*)null`);
      text = text.replace(re, `$1${l.newId}`);
    }
    files.write(gPlace.registerPath, text);
  }
  // the retired list is reset: the old ids live in the old-to-new table
  {
    const text = files.read(gPlace.registerPath);
    files.write(gPlace.registerPath, text.replace(/("retired"\s*:\s*)\[[^\]]*\]/, '$1[]'));
  }

  // rewrite the pointers at old ids in G's Markdown files
  const oldIndex = path.resolve(ctx.claude, old.index);
  const leaving = new Set(Object.keys(plan.toS || {}).map(k => path.resolve(ctx.claude, k)));
  const mdFiles = walkMarkdown(ctx.claude).filter(p => path.resolve(p) !== oldIndex && !leaving.has(path.resolve(p)));
  const pending = [];
  for (const abs of mdFiles) {
    const text = files.read(abs);
    const read = L.readFile(text, L.FORM.visible);
    const ptrs = L.findPointers(read, false);
    if (!ptrs.length) continue;
    pending.push({ abs, read, ptrs });
  }
  // the new names come from the files as rewritten
  const nameOf = (newId) => {
    const s2 = L.buildSystem({ policies: ctx.policies, claude: ctx.claude, standing: ctx.standing, files, env: ctx.env });
    return (s2.items.get(L.idKey(newId)) || {}).heading;
  };
  const sys2 = L.buildSystem({ policies: ctx.policies, claude: ctx.claude, standing: ctx.standing, files, env: ctx.env });
  // old ids whose item left its file, each to the item that now carries its subject, named in the
  // plan by its file and heading, for the old-to-new table
  for (const [oldId, to] of Object.entries(plan.moved || {})) {
    const t = [...sys2.items.values()].find(x => x.entry && x.entry.root.letter === to.root && x.entry.rel === to.file && x.heading === to.heading);
    if (!t) { findings.push(`plan: old R-${oldId} moves to "${to.heading}" in ${to.root} ${to.file}, which was not found`); continue; }
    oldMap.set(L.idKey(oldId), t.id);
    oldName.set(L.idKey(oldId), to.was || '');
  }
  let rewritten = 0;
  for (const { abs, read, ptrs } of pending) {
    let raw = read.lines.join('\n');
    let changed = false;
    for (const p of [...ptrs].reverse()) {
      // a pointer already at an id of S, P or D stays, unless the id is also an old one and the
      // pointer carries the old item's name: old ids come first, the name tells the two apart
      const kept = spdItem(p.id);
      if (kept && (!oldMap.has(p.id) || (p.name !== null && p.name === kept.heading && p.name !== oldName.get(p.id)))) continue;
      if (!oldMap.has(p.id)) { findings.push(`${L.toPosix(path.relative(ctx.claude, abs))}:${p.line}: pointer R-${p.id} has no new id`); continue; }
      const nu = oldMap.get(p.id);
      if (nu === null) { findings.push(`${L.toPosix(path.relative(ctx.claude, abs))}:${p.line}: pointer R-${p.id} is at an id retired before the renumbering`); continue; }
      const t = sys2.items.get(L.idKey(nu));
      const name = t ? t.heading : nameOf(nu);
      raw = `${raw.slice(0, p.start)}R-${nu} (${name})${raw.slice(p.end)}`;
      changed = true;
      rewritten += 1;
    }
    if (changed) files.write(abs, raw.split('\n').join(read.eol));
  }

  // the old-to-new table, carried in G's index: R-1009 (The indexes)
  const sortKey = (k) => { const p = L.parseId(k); return p && p.kind === 'tiered' ? [p.n, ''] : [L.baseId(k), k]; };
  const keys = [...oldMap.keys()].sort((a, b) => { const x = sortKey(a), y = sortKey(b); return x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0); });
  const tableFor = (s) => L.renderOldTable(keys.map(k => {
    const nu = oldMap.get(k);
    if (nu === null) return { old: k, now: 'none', code: '', heading: 'retired before the renumbering' };
    const t = s.items.get(L.idKey(nu));
    return { old: k, now: String(nu), code: t ? t.expectedCode : '', heading: oldName.get(k) || '' };
  }));
  const first = check({ ...ctx, write: true, oldTableText: '', preFindings: [] });
  const table = tableFor(first.sys);
  // the first pass put its corrections in the overlay; the second writes the index with the table
  const r = check({ ...ctx, write: true, oldTableText: table, preFindings: findings });
  console.log(table);
  console.log('');
  console.log(`renumbering: ${oldMap.size} old id(s), ${rewritten} pointer(s) rewritten, ${files.changed().length} file(s) changed`);
  for (const p of files.changed()) console.log(`  ${p}`);
  for (const n of r.notes) console.log(n);
  for (const p of r.pending) console.log(`pending: ${p}`);
  if (r.findings.length || r.stop) {
    for (const f of r.findings) console.log(f);
    console.log(`FAIL: ${r.findings.length} finding(s); nothing written`);
    return 1;
  }
  if (ctx.write) { files.flush(); console.log('written'); }
  else console.log('dry run: nothing written; run on a copy with --write to see the diffs');
  return 0;
}

function walkMarkdown(dir) {
  const out = [];
  const skip = new Set(['.git', 'node_modules']);
  const go = (d) => {
    for (const n of fs.readdirSync(d, { withFileTypes: true })) {
      if (skip.has(n.name)) continue;
      const p = path.join(d, n.name);
      if (n.isDirectory()) go(p);
      else if (n.name.endsWith('.md')) out.push(p);
    }
  };
  go(dir);
  return out.sort();
}

// ----------------------------------------------------------------------------------- main

function main(argv, deps = {}) {
  const args = parseArgs(argv);
  if (args.help || args.bad.length) {
    if (args.bad.length) console.log(`unknown or incomplete argument(s): ${args.bad.join(' ')}`);
    console.log('usage: node rule-check.js [--write] [--policies <path>] [--claude <path>] [--defer-policies] [--pointers-at <id>] [--renumber <plan.json>]');
    return args.help ? 0 : 1;
  }
  const preFindings = [];
  const v = L.readVariable(L.POLICIES_VARIABLE, { env: deps.env, readStored: deps.readStored });
  if (!v.value) preFindings.push(`${L.POLICIES_VARIABLE} is not set, in the process or as a stored user value; ask the admin team for the checkout with the policies-checkout request (Structure.md, The checker)`);
  const standing = v.value ? path.resolve(v.value) : null;
  const policies = args.policies ? path.resolve(args.policies) : standing;
  if (!policies || !fs.existsSync(policies)) {
    for (const f of preFindings) console.log(f);
    if (policies) console.log(`${policies}: the organization repository's checkout does not exist`);
    console.log('FAIL: no checkout of the organization repository to check');
    return 1;
  }
  const claude = L.claudeRoot(args.claude, policies);
  const ctx = { files: new L.Files(), policies, claude, standing, policiesGiven: !!args.policies, write: args.write, deferPolicies: args.deferPolicies, env: deps.env, readStored: deps.readStored, preFindings };
  if (args.pointersAt) return listPointersAt(ctx, args.pointersAt);
  if (args.renumber) return renumber(ctx, path.resolve(args.renumber));
  const r = check(ctx);
  for (const n of r.notes) console.log(n);
  if (r.findings.length || r.stop) {
    for (const f of r.findings) console.log(f);
    console.log(r.stop ? 'STOP: a full tier; nothing written' : `FAIL: ${r.findings.length} finding(s)${args.write ? '; nothing written' : ''}`);
    return 1;
  }
  for (const p of r.pending) console.log(`pending in the copy being committed: ${p}`);
  if (args.write) {
    const changed = ctx.files.changed();
    ctx.files.flush();
    for (const p of changed) console.log(`wrote ${p}`);
  }
  console.log(`OK: ${r.counts.files} file(s), ${r.counts.items} id(s)${r.notes.length ? `, ${r.notes.length} not checked` : ''}`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, check, renderIndex, parseArgs };
