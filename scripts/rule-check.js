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
//                                           the lists and the per-parent marks on the lines,
//                                           rewrite the indexes, the pointer lists and the ids at
//                                           the pointers, keep each register's list of the rule
//                                           files that hold a quote pointer, and bring up to date
//                                           what each pointer took from its target, a quote
//                                           included; any finding leaves every file
//                                           as it is. G is written in place; S, P and D only in
//                                           the copy being committed, named with --policies, and
//                                           a file of another repository only in the copy of it
//                                           named with --copy
//   node rule-check.js --policies <path>    read S, P and D from that copy, not the standing
//                                           checkout the variable names
//   node rule-check.js --copy <folder>=<path>
//                                           read another repository's files from that copy, about
//                                           to be committed, not from its checkout; <folder> is
//                                           the folder name the register gives it; repeatable
//   node rule-check.js --claude <path>      read G from there (by default the Claude
//                                           Code configuration in the home folder, else the
//                                           checkout's claude/ copy)
//   node rule-check.js --pointers-at <id>   list every pointer at an id with its own id, and check
//                                           nothing
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
// repository is read from a sibling folder of that checkout, or from the copy named with --copy;
// a missing checkout makes the file "not checked", which is no failure, except in a --write in the
// copy being committed, where it is a finding. What it checks, and these switches, are stated in
// Structure.md, R-1010 (The checker); the pointers' own ids and lists in R-1008 (Pointers); the
// quote pointers in R-1123 (Quote pointers).

const fs = require('fs');
const path = require('path');
const L = require('./rule-lib');

function parseArgs(argv) {
  const a = { write: false, policies: null, claude: null, copies: {}, pointersAt: null, renumber: null, deferPolicies: false, help: false, bad: [] };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--write') a.write = true;
    else if (v === '--defer-policies') a.deferPolicies = true;
    else if (v === '--policies') a.policies = argv[++i];
    else if (v === '--copy') {
      const c = argv[++i];
      const eq = c === undefined ? -1 : c.indexOf('=');
      if (eq < 1 || eq === c.length - 1) a.bad.push('--copy needs <folder>=<path>');
      else a.copies[c.slice(0, eq)] = path.resolve(c.slice(eq + 1));
    }
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
const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;
/** The kinds of target a link reaches by an anchor: R-1008 (Pointers). */
const ANCHORED = ['section', 'rule', 'splinter', 'pointer'];

/**
 * The edits --write makes at one pointer, R-1008 (Pointers), as [start, end) offsets into the
 * file's joined text: a repointed pointer takes its new target's id; a name or a link that is not
 * as its target is now is written from the target, the link in the pointer's own form; the own id
 * is written as the link's title on a page and in square brackets after the pointer in G. The rest
 * of the pointer, its line breaks included, is kept.
 * @param {object} rec the pointer as the check read it
 * @param {string} tid its target's id
 * @param {string|null} own its own id, null for a pointer rule, at whose pointer nothing is written
 * @param {Function} linkNow the link to a target as it is now
 * @returns {Array<{start:number, end:number, text:string}>}
 */
function pointerSpans(rec, tid, own, linkNow) {
  const { ptr, target } = rec;
  const out = [];
  if (rec.repointedFrom) out.push({ start: ptr.spans.id[0], end: ptr.spans.id[1], text: tid });
  if (ptr.name !== target.heading) out.push({ start: ptr.spans.name[0], end: ptr.spans.name[1], text: target.heading });
  if (ptr.href !== null && (rec.repointedFrom || rec.linkBad)) out.push({ start: ptr.spans.href[0], end: ptr.spans.href[1], text: linkNow(rec.e, ptr, target) });
  if (own !== null && (rec.pub ? ptr.title : ptr.tag) !== own) {
    if (rec.pub) out.push(ptr.spans.title ? { start: ptr.spans.title[0], end: ptr.spans.title[1], text: own } : { start: ptr.spans.close, end: ptr.spans.close, text: ` "${own}"` });
    else out.push(ptr.spans.tag ? { start: ptr.spans.tag[0], end: ptr.spans.tag[1], text: ` [${own}]` } : { start: ptr.end, end: ptr.end, text: ` [${own}]` });
  }
  return out;
}

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
  const sys = L.buildSystem({ policies: ctx.policies, claude: ctx.claude, standing: ctx.standing, files, env: ctx.env, readStored: ctx.readStored, copies: ctx.copies });
  findings.push(...sys.findings);
  for (const nc of sys.notChecked) notes.push(`not checked: ${nc.repo}:${nc.entry.rel}; no checkout at ${nc.checkout} (set ${nc.variable} to override the folder)`);
  const anyUnchecked = sys.notChecked.length > 0;
  // a --write in the copy being committed reads every file it may have to write: R-1010 (The checker)
  const policiesWritable = ctx.write && ctx.policiesGiven && !same(ctx.policies, ctx.standing);
  // a quote pointer file in a missing checkout is not checked; it holds no item, so S-I stays
  // checked: R-1010 (The checker)
  for (const nc of sys.quoteNotChecked) notes.push(`not checked: ${nc.repo}:${nc.entry.rel}, a quote pointer file; no checkout at ${nc.checkout} (set ${nc.variable} to override the folder)`);
  if (policiesWritable) {
    for (const nc of [...sys.notChecked, ...sys.quoteNotChecked]) findings.push(`${nc.repo}:${nc.entry.rel}: no checkout at ${nc.checkout}; with --write in the copy being committed a missing checkout is a finding (set ${nc.variable}, or name the copy with --copy ${nc.folder}=<path>) (Structure.md, The checker)`);
  }
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
      findings.push(`${it.entry.rel}:${it.item.jsonLine}: the JSON line reads {"name","code","id"} in that order, then "splinterMark", "pointerMark" and "quoteMark" where they are above zero; it has ${JSON.stringify(keys)}`);
    }
    if (typeof j.name !== 'string' || j.name !== it.item.heading) findings.push(`${it.where}: JSON name ${JSON.stringify(j.name)} differs from its heading "${it.item.heading}"`);
    if (typeof j.code !== 'string') findings.push(`${it.where}: the JSON line's code needs a string`);
    if (it.item.jsonForm === L.FORM.comment && typeof j.name === 'string' && j.name.includes('-->')) findings.push(`${it.where}: a name holding "-->" cannot stand in the comment form`);
    for (const m of L.MARKS) if (j[m] !== undefined && !(Number.isInteger(j[m]) && j[m] >= 0)) findings.push(`${it.where}: ${m} needs a whole number`);
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
  const listable = []; // the pointers that stand on lists, in reading order
  const spdPlace = sys.places.find(p => p.key === 'SPD');
  // a retired id to the id in use that replaced it, through any chain; null when none did
  const follow = (id) => {
    let k = L.idKey(id);
    const seen = new Set();
    while (retired.has(k) && !seen.has(k)) {
      seen.add(k);
      if (retired.get(k) === null) return null;
      k = L.idKey(retired.get(k));
    }
    return sys.items.has(k) ? k : null;
  };
  const entryOf = (t) => (t.kind === 'listed' ? t.listed : t.entry);
  // the link to a target as it is now, in the pointer's own form: relative within one repository,
  // by the full address the registers give when the pointer is written so or crosses repositories
  const linkNow = (e, ptr, target) => {
    const entry = entryOf(target);
    const anchor = ANCHORED.includes(target.kind) ? target.item.anchor : null;
    const toFolder = target.kind === 'folder' && /\/(#|$)/.test(ptr.href || '');
    const abs = toFolder ? target.folder.abs : entry.abs;
    let href;
    if (ABSOLUTE.test(ptr.href || '') || (entry.repo || null) !== (e.repo || null)) {
      // a folder at its repository's root, `.`, is reached at the repository's address itself
      const folderPath = toFolder && path.posix.normalize(target.folder.rel) !== '.' ? `${target.folder.rel}/` : '';
      href = `${entry.repo ? entry.repoUrl : spdPlace.register.url}${toFolder ? folderPath : entry.rel}`;
    } else {
      href = `${L.toPosix(path.relative(path.dirname(e.abs), abs))}${toFolder ? '/' : ''}` || path.basename(abs);
      if (anchor && path.resolve(path.dirname(e.abs), href) === path.resolve(e.abs)) href = '';
    }
    return `${href}${anchor ? `#${anchor}` : ''}`;
  };
  // what is wrong with a pointer's link, or null; a full address is checked against the address
  // the registers give, here and from another repository into here
  const linkProblem = (e, ptr, target, at) => {
    if (ptr.href === null) return null;
    const entry = entryOf(target);
    if (ABSOLUTE.test(ptr.href) || (entry.repo || null) !== (e.repo || null)) {
      if (entry.repo && !entry.repoUrl) { notes.push(`not checked: ${at}: the link to ${entry.repo}, whose register entry gives no url`); return null; }
      const now = linkNow(e, ptr, target);
      return ptr.href === now ? null : `the link to R-${ptr.id} goes to ${ptr.href}, the target is at ${now}`;
    }
    const want = { file: entry.abs, anchor: ANCHORED.includes(target.kind) ? target.item.anchor : null, folder: target.kind === 'folder' ? target.folder.abs : null };
    const ok = L.linkMatches(e.abs, ptr.href, want);
    return ok === true || ok === null ? null : `the link around R-${ptr.id}: ${ok}`;
  };
  // the parts of a -Q pointer rule's body, its quote and its reference, R-1006 (Pointer rules); and
  // of a quote pointer file, after its # title, R-1123 (Quote pointers)
  const quoteRules = new Map();
  for (const it of sys.items.values()) {
    if (it.kind === 'pointer' && L.parseId(it.id).quote) quoteRules.set(it, L.quoteParts(it.entry.read, it.item.bodyStart, it.item.bodyEnd));
  }
  for (const q of sys.quoteFiles) {
    if (!q.read) continue;
    let at = q.read.frontMatterEnd || 0;
    while (at < q.read.lines.length && !q.read.lines[at].trim()) at++;
    if (!/^# /.test(q.read.lines[at] || '')) findings.push(`${sys.where(q)}:${at + 1}: a quote pointer file opens with its own # title (Structure.md, Quote pointers)`);
    q.parts = L.quoteParts(q.read, at + 1, q.read.lines.length);
    for (const f of q.parts.findings) findings.push(`${sys.where(q)}:${f.replace(/^line /, '')}`);
    if (!q.parts.quote) findings.push(`${sys.where(q)}: a quote pointer file holds no quote between ${L.QUOTE_OPEN} and ${L.QUOTE_CLOSE} (Structure.md, Quote pointers)`);
  }
  const inLines = (r, line) => !!r && line - 1 >= r.start && line - 1 < r.end;
  for (const e of [...sys.fileEntries, ...sys.quoteFiles]) {
    if (!e.read) continue;
    const pub = !!e.quoteFile || e.root.letter !== 'G';
    const ptrs = L.findPointers(e.read, pub);
    e.pointers = ptrs;
    for (const ptr of ptrs) {
      const at = `${sys.where(e)}:${ptr.line}`;
      let holder;
      if (e.quoteFile) {
        // a quote pointer file's id pointer is its reference, held by the file
        if (!e.parts.quote || !inLines(e.parts.ref, ptr.line)) { findings.push(`${at}: an id pointer in a quote pointer file outside its reference; a quote pointer file's id pointer is its reference (Structure.md, Quote pointers)`); continue; }
        holder = { id: e.holder, kind: 'quote file', where: sys.where(e) };
      } else holder = L.holderOf(e, sys.items, ptr.line);
      const rec = { e, ptr, at, pub, order: allPointers.length, holder, ref: !!e.quoteFile };
      allPointers.push(rec);
      // a -Q pointer rule's pointer is the one in its reference; one in what it adds is a pointer
      // in its text
      const qr = holder && holder.kind === 'pointer' ? quoteRules.get(holder) : null;
      rec.isRule = !!holder && holder.kind === 'pointer' && (!qr || !qr.quote || inLines(qr.ref, ptr.line));
      if (rec.isRule) {
        // a pointer rule's own id is its id, and nothing is written at its pointer: one written there
        // was written by hand
        const written = L.idWrittenAt(e.read, ptr, pub);
        if (written !== null) findings.push(`${at}: pointer rule ${rec.holder.id}'s pointer R-${ptr.id} carries ${written}, written by hand; a pointer rule's own id is its id, and nothing is written at its pointer (Structure.md, Pointers)`);
      }
      let target = sys.items.get(ptr.id);
      if (!target) {
        // a pointer at an id retired with a replacement is repointed to it; a pointer rule is
        // repointed only under a new id of its own, R-1006 (Pointer rules)
        const by = retired.has(ptr.id) ? follow(ptr.id) : null;
        if (retired.has(ptr.id) && (by === null || rec.isRule)) findings.push(`${at}: pointer R-${ptr.id} is at a retired id${retired.get(ptr.id) !== null ? `; R-${retired.get(ptr.id)} replaced it` : ''}`);
        else if (!retired.has(ptr.id) && anyUnchecked) notes.push(`not checked: ${at}: R-${ptr.id} is not in what was read`);
        else if (!retired.has(ptr.id)) findings.push(`${at}: pointer to unknown id R-${ptr.id}`);
        if (by === null || rec.isRule) continue;
        rec.repointedFrom = ptr.id;
        target = sys.items.get(by);
      }
      ptr.target = target;
      const name = target.heading;
      const bad = [];
      if (ptr.name === null) bad.push(`${at}: pointer R-${ptr.id} has no name, expected "R-${ptr.id} (${name})"`);
      if ((e.quoteFile ? e.place.key !== 'G' : pub) && entryOf(target).root.letter === 'G') bad.push(`${at}: an id pointer from ${e.quoteFile ? 'a quote pointer file of S, P and D\'s register' : e.root.letter} into G; nothing in S, P or D points into G (Structure.md, Pointers)`);
      if (ptr.bare) bad.push(`${at}: on a public page a pointer is the text of a Markdown link to its target (Structure.md, Pointers)`);
      if (!bad.length && !rec.holder) bad.push(`${at}: pointer R-${ptr.id} stands in no item with an id, so it can stand on no list (Structure.md, Pointers)`);
      if (bad.length) { findings.push(...bad); continue; }
      rec.target = target;
      // a pointer in text carries `<target>-T<n>`; a quote pointer file's reference `<target>-Q<n>`
      const carried = pub ? ptr.title : ptr.tag;
      rec.own = !rec.isRule && carried !== null && (rec.ref ? L.parseQuotePart(carried) : L.parseOwnId(carried)) ? carried : null;
      rec.problems = [];
      if (!rec.repointedFrom) {
        if (ptr.name !== name) rec.problems.push(`pointer R-${ptr.id} names "${ptr.name}", the target is "${name}"`);
        const lp = linkProblem(e, ptr, target, at);
        if (lp) { rec.problems.push(lp); rec.linkBad = true; }
      }
      listable.push(rec);
    }
  }

  // ---- the pointer ids and lists: R-1008 (Pointers). A pointer is correct when its own id is on
  // its target's list; one that carries no id, or an id not on the list of the target its text
  // names, is new, and is recorded only when it holds its target's name and link as they are now.
  // Of two carriers of one id, the one in the item the list names keeps it. A pointer that is gone
  // leaves its list, its id not retired; the next part is the one above the highest on the list.
  const oldLists = new Map(); // target -> Map(own id -> holder id)
  const listedIn = new Map(); // target -> the place whose register held its list
  for (const place of sys.places) {
    const shape = L.checkPointerLists(place.register, place.registerPath);
    findings.push(...shape);
    if (shape.length) continue;
    for (const [t, list] of Object.entries(place.register.pointers || {})) {
      if (!oldLists.has(t)) oldLists.set(t, new Map());
      listedIn.set(t, place);
      for (const [own, h] of Object.entries(list)) oldLists.get(t).set(own, L.idKey(h));
    }
  }
  const holderNow = (h) => follow(h) || h;
  // a holder as a message names it: an item's id, or a quote pointer file's repository and path
  const named = (h) => (L.isFileHolder(h) ? h : `R-${h}`);
  const newLists = new Map();
  const put = (t, own, h) => { if (!newLists.has(t)) newLists.set(t, new Map()); newLists.get(t).set(own, h); };
  const listNotes = new Map();
  const say = (t, s) => { if (!listNotes.has(t)) listNotes.set(t, []); listNotes.get(t).push(s); };
  const pointerEdits = [];
  const pc = { kept: 0, followed: 0, moved: 0, recorded: 0, repointed: 0, gone: 0 };
  const byTarget = new Map();
  for (const rec of listable) {
    const t = L.idKey(rec.target.id);
    if (!byTarget.has(t)) byTarget.set(t, []);
    byTarget.get(t).push(rec);
  }
  // a list held by a quote pointer file stays while the file is not checked: R-1123 (Quote pointers)
  const quoteFileOf = (h) => sys.quoteFiles.find(q => q.holder === h);
  const unread = (t, h) => {
    if (L.isFileHolder(h)) { const q = quoteFileOf(h); return (anyUnchecked && !sys.items.has(t)) || (!!q && !!q.notChecked); }
    return anyUnchecked && (!sys.items.has(t) || !sys.items.has(holderNow(h)));
  };
  // a target's quote count, R-1006 (Pointer rules): a part is given above its quoteMark, the -Q
  // pointer rules' parts in use or retired, and the highest quote part on its list
  const quoteMarkOf = (t) => {
    const it = sys.items.get(t);
    const v = !it ? 0 : it.kind === 'listed' ? it.listed.quoteMark : it.item && it.item.json ? it.item.json.quoteMark : 0;
    return v || 0;
  };
  const quoteRuleParts = (t) => [...sys.items.keys(), ...retired.keys()].map(L.parseQuotePart).filter(q => q && q.target === t).map(q => q.part);
  for (const [tid, recs] of byTarget) {
    const list = oldLists.get(tid) || new Map();
    const kept = new Set();
    let next = 1 + Math.max(0, ...[...list.keys()].map(L.parseOwnId).filter(o => o && o.target === tid).map(o => o.part));
    let nextQ = 1 + Math.max(0, quoteMarkOf(tid), ...quoteRuleParts(tid), ...[...list.keys()].map(L.parseQuotePart).filter(q => q && q.target === tid).map(q => q.part));
    const fresh = [];
    const carriers = new Map();
    for (const rec of recs) {
      const h = L.idKey(rec.holder.id);
      if (rec.isRule) {
        // a pointer rule's own id is its id, and nothing is written at its pointer; one repointed
        // without a new id is reported with the pointer rules
        if (L.parseId(h).parent !== tid) continue;
        // a quote part held both by a -Q pointer rule and by a file's reference
        if (list.has(h) && L.isFileHolder(list.get(h))) { findings.push(`${rec.at}: pointer rule ${h} takes a quote part that the reference in ${list.get(h)} holds on R-${tid}'s list; a quote part is given above the target's quoteMark and the highest quote part on its list (Structure.md, Pointer rules)`); continue; }
        if (list.has(h)) { kept.add(h); put(tid, h, h); pc.kept += 1; if (rec.problems.length) { pointerEdits.push({ rec, tid, own: null, what: rec.problems.join('; ') }); pc.followed += 1; } }
        else if (!rec.problems.length) { put(tid, h, h); say(tid, `${h} recorded`); pc.recorded += 1; }
        else findings.push(`${rec.at}: pointer rule ${h} is new on R-${tid}'s list, and ${rec.problems.join('; ')}; a new pointer is recorded only as its target is (Structure.md, Pointers)`);
        continue;
      }
      // a reference keeps a quote part its file holds on the list; a pointer in text a T part
      const o = rec.own ? (rec.ref ? L.parseQuotePart(rec.own) : L.parseOwnId(rec.own)) : null;
      if (o && !rec.repointedFrom && o.target === tid && list.has(rec.own) && (!rec.ref || L.isFileHolder(list.get(rec.own)))) {
        if (!carriers.has(rec.own)) carriers.set(rec.own, []);
        carriers.get(rec.own).push(rec);
      } else fresh.push(rec);
    }
    for (const [own, rs] of carriers) {
      let keeper = rs[0];
      if (rs.length > 1) {
        const listedH = holderNow(list.get(own));
        const inH = rs.filter(r => L.idKey(r.holder.id) === listedH);
        if (inH.length !== 1) {
          for (const r of rs) findings.push(`${r.at}: ${own} is carried by ${rs.length} pointers, ${inH.length} of them in ${named(listedH)}, the item its list names, which does not tell them apart (Structure.md, Pointers)`);
          kept.add(own);
          put(tid, own, list.get(own));
          continue;
        }
        keeper = inH[0];
        for (const r of rs) if (r !== keeper) { r.copyOf = own; fresh.push(r); }
      }
      const h = L.idKey(keeper.holder.id);
      kept.add(own);
      put(tid, own, h);
      pc.kept += 1;
      if (holderNow(list.get(own)) !== h) { say(tid, `${own} moved from ${named(list.get(own))} to ${named(h)}`); pc.moved += 1; }
      if (keeper.problems.length) { pointerEdits.push({ rec: keeper, tid, own, what: keeper.problems.join('; ') }); pc.followed += 1; }
    }
    fresh.sort((x, y) => x.order - y.order);
    for (const rec of fresh) {
      const name = rec.target.heading;
      if (!rec.repointedFrom && rec.problems.length) {
        const other = rec.own ? (rec.ref ? L.parseQuotePart(rec.own) : L.parseOwnId(rec.own)).target : null;
        if (rec.copyOf) findings.push(`${rec.at}: a copy of ${rec.copyOf}, new here, and ${rec.problems.join('; ')}; a new pointer is recorded only as its target is (Structure.md, Pointers)`);
        else if (other && other !== tid && (oldLists.get(other) || new Map()).has(rec.own)) findings.push(`${rec.at}: R-${tid} carries ${rec.own}, R-${other}'s, and ${rec.problems.join('; ')}: a mistyped id, not a repointing (Structure.md, Pointers)`);
        else findings.push(`${rec.at}: R-${tid} is new on its list, and ${rec.problems.join('; ')}; a new pointer is recorded only as its target is (Structure.md, Pointers)`);
        continue;
      }
      const own = rec.ref ? `${tid}-Q${nextQ}` : `${tid}-T${next}`;
      if (rec.ref) nextQ += 1; else next += 1;
      const h = L.idKey(rec.holder.id);
      put(tid, own, h);
      say(tid, `${own} recorded in ${named(h)}`);
      let what;
      if (rec.repointedFrom) { what = `pointer R-${rec.repointedFrom} is at a retired id; R-${tid} replaced it: repointed as ${own}`; pc.repointed += 1; }
      else {
        what = rec.copyOf ? `a copy of ${rec.copyOf}: recorded as ${own}` : rec.own ? `R-${tid} (${name}) carries ${rec.own}, not on R-${tid}'s list: recorded as ${own}` : `R-${tid} (${name}) is new: recorded as ${own}`;
        pc.recorded += 1;
      }
      pointerEdits.push({ rec, tid, own, what });
    }
    for (const [own, h] of list) {
      if (kept.has(own) || (newLists.get(tid) && newLists.get(tid).has(own))) continue;
      if (unread(tid, h)) { put(tid, own, h); continue; }
      say(tid, `${own} (in ${named(h)}) gone: taken off, not retired`);
      pc.gone += 1;
    }
  }
  for (const [t, list] of oldLists) {
    if (byTarget.has(t)) continue;
    for (const [own, h] of list) {
      if (unread(t, h)) { put(t, own, h); continue; }
      say(t, `${own} (in ${named(h)}) gone: taken off, not retired`);
      pc.gone += 1;
    }
  }
  for (const { rec, tid, own, what } of pointerEdits) {
    changes.push({ entry: rec.e, kind: 'pointer', what: `${rec.at}: ${what}`, spans: pointerSpans(rec, tid, own, linkNow) });
  }
  // the lists, each in the register that records its target's id
  const listPlace = (t) => { const it = sys.items.get(t); return it ? entryOf(it).place : listedIn.get(t); };
  for (const place of sys.places) {
    if (L.checkPointerLists(place.register, place.registerPath).length) continue;
    const want = {};
    for (const [t, m] of newLists) if (listPlace(t) === place) want[t] = Object.fromEntries(m);
    const had = {};
    for (const [t, list] of Object.entries(place.register.pointers || {})) had[t] = Object.fromEntries(Object.entries(list).map(([k, v]) => [k, L.idKey(v)]));
    const flat = (l) => JSON.stringify(Object.keys(l || {}).sort(L.idOrder).map(k => [k, l[k]]));
    const differ = [...new Set([...Object.keys(want), ...Object.keys(had)])].filter(t => flat(want[t]) !== flat(had[t])).sort(L.idOrder);
    for (const t of differ) changes.push({ registerOf: place, kind: 'pointer list', what: `${place.registerPath}: the list of R-${t}: ${(listNotes.get(t) || ['rewritten']).join('; ')}`, lists: want });
    if (!differ.length && place.register.pointers !== undefined && L.withPointerLists(place.registerText, want) !== place.registerText) {
      changes.push({ registerOf: place, kind: 'pointer list', what: `${place.registerPath}: the pointer lists are not in the layout the checker writes`, lists: want });
    }
  }

  // ---- quotes, each held equal to what its target generates now, line endings aside; one that
  // differs is out of date, and --write generates it again: R-1123 (Quote pointers)
  const homeOf = (entry) => {
    if (entry.repo) return entry.repoUrl ? { base: entry.repoUrl, rel: entry.rel } : { error: `${entry.repo}, its target's repository, has no "url" in its register entry` };
    if (!spdPlace) return { error: 'the organization repository\'s register was not read' };
    return entry.root.letter === 'G' ? { base: spdPlace.register.url, rel: `${L.G_COPY}${entry.rel}` } : { base: spdPlace.register.url, rel: entry.rel };
  };
  const quoteFrom = (target) => {
    const src = L.quoteSource(target);
    if (src.error) return src;
    const home = homeOf(entryOf(target));
    return home.error ? home : L.quoteOf(src.read, src.from, src.to, src.skip, home.base, home.rel);
  };
  const holdQuote = (e, q, block, what) => {
    const have = e.read.lines.slice(q.open, q.close + 1);
    if (have.join('\n') === block.join('\n')) return;
    const first = block.findIndex((l, i) => l !== have[i]);
    let start = 0;
    for (let i = 0; i < q.open; i++) start += e.read.lines[i].length + 1;
    const end = start + have.join('\n').length;
    changes.push({ entry: e, kind: 'quote', what: `${sys.where(e)}:${q.open + 1}: the quote of ${what} is out of date (first difference at line ${q.open + 1 + (first === -1 ? have.length : first)})`, spans: [{ start, end, text: block.join('\n') }] });
  };

  // ---- pointer rules: the body rule by the id's letter, and a repointed rule takes a new id:
  // R-1006 (Pointer rules)
  for (const it of sys.items.values()) {
    if (it.kind !== 'pointer') continue;
    const p = L.parseId(it.id);
    const target = p.parent;
    const e = it.entry;
    const t = sys.items.get(target);
    const quoted = (e.read.quotes || []).some(q => q.open >= it.item.bodyStart && q.open < it.item.bodyEnd);
    const qr = quoteRules.get(it);
    const body = e.read.masked.slice(it.item.bodyStart, it.item.bodyEnd);
    const filled = body.map((l, i) => (l.trim() ? i : -1)).filter(i => i !== -1);
    const inBody = (e.pointers || []).filter(x => x.line - 1 >= it.item.bodyStart && x.line - 1 < it.item.bodyEnd);
    if (!p.quote && quoted) findings.push(`${it.where}: pointer rule ${it.id}'s body is a quote pointer; a pointer rule whose body is a quote pointer takes ${target}-Q<n> in place of ${target}-P<n>: give it a new id and retire the old one (Structure.md, Pointer rules)`);
    else if (p.quote && !quoted) findings.push(`${it.where}: pointer rule ${it.id}'s body is a paragraph; a pointer rule whose body is a paragraph takes ${target}-P<n>, and ${target}-Q<n> only when its body is a quote pointer: give it a new id and retire the old one (Structure.md, Pointer rules)`);
    else if (p.quote) {
      for (const f of qr.findings) findings.push(`${sys.where(e)}:${f.replace(/^line /, '')}`);
      if (qr.ref) {
        const inRef = inBody.filter(x => inLines(qr.ref, x.line));
        if (inRef.length === 1 && inRef[0].id !== target) findings.push(`${it.where}: pointer rule ${it.id} points at R-${inRef[0].id}, its id names R-${target}: repointed without a new id; a repointed pointer rule takes a new id, the old one retired (Structure.md, Pointer rules)`);
        else if (inRef.length !== 1) findings.push(`${it.where}: pointer rule ${it.id}'s reference holds ${inRef.length} pointers; its only pointer is at R-${target}`);
      }
      if (t) {
        const gen = quoteFrom(t);
        if (gen.error) findings.push(`${it.where}: pointer rule ${it.id} quotes R-${target}, and ${gen.error} (Structure.md, Quote pointers)`);
        else holdQuote(e, qr.quote, gen.block, `R-${target}`);
      }
    } else {
      if (!filled.length) findings.push(`${it.where}: pointer rule ${it.id} has an empty body; its body points at R-${target}`);
      else if (filled[filled.length - 1] - filled[0] + 1 !== filled.length) findings.push(`${it.where}: pointer rule ${it.id} has a body of more than one paragraph; its whole body points at R-${target}`);
      if (inBody.length === 1 && inBody[0].id !== target) findings.push(`${it.where}: pointer rule ${it.id} points at R-${inBody[0].id}, its id names R-${target}: repointed without a new id; a repointed pointer rule takes a new id, the old one retired (Structure.md, Pointer rules)`);
      else if (inBody.length !== 1) findings.push(`${it.where}: pointer rule ${it.id} holds ${inBody.length} pointers; its only pointer is at R-${target}`);
    }
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
    if (f) return { what: `${f.repo ? `${f.repo}:` : ''}${f.rel}/`, converted: f.core ? f.core.converted : true, root: f.root.letter };
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

  // ---- where a quote stands: in a rule file only as the body of a pointer rule; R-1123 (Quote
  // pointers)
  for (const e of convertedReads) {
    for (const q of e.read.quotes) {
      const h = L.holderOf(e, sys.items, q.open + 1);
      if (!h || h.kind !== 'pointer') findings.push(`${sys.where(e)}:${q.open + 1}: a quote in a rule file stands only as the body of a pointer rule (Structure.md, Quote pointers)`);
    }
  }
  // ---- each quote pointer file: its reference, one id pointer or one link to a document outside
  // the system by the full address of its home, and its quote of that target: R-1123 (Quote pointers)
  for (const q of sys.quoteFiles) {
    if (!q.read || !q.parts || !q.parts.quote || !q.parts.ref) continue;
    const at = `${sys.where(q)}:${q.parts.ref.start + 1}`;
    const ptrs = (q.pointers || []).filter(x => inLines(q.parts.ref, x.line));
    const links = L.findLinks(q.read).filter(x => inLines(q.parts.ref, x.line));
    if (ptrs.length + links.length !== 1) { findings.push(`${at}: the reference holds ${ptrs.length + links.length} pointers and links; its only pointer or link is to its target (Structure.md, Quote pointers)`); continue; }
    if (ptrs.length) {
      const target = ptrs[0].target;
      if (!target) continue; // the pointer's own finding names it
      const gen = quoteFrom(target);
      if (gen.error) findings.push(`${at}: the reference is R-${L.idKey(target.id)}, and ${gen.error} (Structure.md, Quote pointers)`);
      else holdQuote(q, q.parts.quote, gen.block, `R-${L.idKey(target.id)}`);
      continue;
    }
    const href = links[0].href;
    const m = /^(https:\/\/github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[^/]+\/)([^#?]+)/i.exec(href);
    const abs = m && L.githubTarget(href, sys.addresses);
    if (!abs) { findings.push(`${at}: the reference links ${href}; a document outside the system is linked by the full address of its home, in a repository a register gives an address for (Structure.md, Quote pointers)`); continue; }
    const inside = systemFile(abs);
    if (inside) { findings.push(`${at}: the reference links ${inside.what}, which is inside the rule system; point at it by id (Structure.md, Quote pointers)`); continue; }
    if (!files.isFile(abs)) { findings.push(`${at}: the reference leads nowhere: ${href}; it is linked again by hand (Structure.md, Quote pointers)`); continue; }
    let rel;
    try { rel = decodeURI(m[2]); } catch (err) { rel = m[2]; }
    const src = L.quoteSourceOutside(L.readFile(files.read(abs), L.FORM.comment), rel);
    const gen = src.error ? src : L.quoteOf(src.read, src.from, src.to, src.skip, m[1], rel);
    if (gen.error) findings.push(`${at}: the reference links ${rel}, and ${gen.error} (Structure.md, Quote pointers)`);
    else holdQuote(q, q.parts.quote, gen.block, rel);
  }
  // ---- each register's list of the rule files of its roots that hold a quote pointer, under the
  // repository of a file in another one: R-1123 (Quote pointers)
  for (const place of sys.places) {
    const reg = place.register;
    const scopes = [null, ...Object.keys(reg.repositories || {})];
    for (const k of scopes) {
      const have = k === null ? reg.ruleFilesWithQuotes : reg.repositories[k].ruleFilesWithQuotes;
      const mine = sys.fileEntries.filter(e => e.place === place && (e.repo || null) === k);
      // a file not read keeps its place on the list
      const want = [...new Set([...mine.filter(e => e.read && e.read.quotes.length).map(e => e.rel), ...(have || []).filter(r => mine.some(e => e.rel === r && e.notChecked))])].sort();
      if ((have === undefined && !want.length) || JSON.stringify(have) === JSON.stringify(want)) continue;
      changes.push({ registerOf: place, kind: 'quote list', repo: k, list: want, what: `${place.registerPath}: ${k === null ? '' : `repositories.${k}.`}ruleFilesWithQuotes lists ${JSON.stringify(have || [])}; the rule files that hold a quote pointer are ${JSON.stringify(want)}` });
    }
  }

  // ---- the indexes, R-1009 (The indexes): S-I beside the register of S, P and D; G-I beside G's
  for (const place of sys.places) {
    const indexAbs = path.resolve(path.dirname(place.registerPath), place.register.index);
    if (anyUnchecked && place.key === 'SPD') { notes.push(`not checked: ${indexAbs}, the index of S, P and D, while a checkout is missing`); continue; }
    const current = files.exists(indexAbs) ? files.read(indexAbs) : null;
    const table = place.key === 'G' ? (ctx.oldTableText !== undefined ? ctx.oldTableText : L.readOldTable(current).text) : null;
    const want = renderIndex(sys, place, indexAbs, table);
    // Line endings are not compared: a checkout may write the index with CRLF.
    const lf = (t) => t.replace(/\r\n/g, '\n');
    if (current === null || lf(current) !== lf(want)) changes.push({ abs: indexAbs, place, kind: 'index', what: `${indexAbs}: out of date`, text: want });
  }

  // ---- what --write would change, and where it may write: R-1010 (The checker)
  const pending = [];
  const placeOf = (c) => c.registerOf || c.place || c.entry.place;
  for (const c of changes) {
    const place = placeOf(c);
    const repo = c.entry && c.entry.repo;
    if (!ctx.write) { findings.push(`${c.what}; run with --write${repo ? ` with the copy of ${repo} being committed (--copy ${c.entry.repoFolder}=<path>)` : place.key === 'SPD' ? ' in the copy being committed (--policies <path>)' : ''}`); continue; }
    if (repo) {
      // a file of another repository is written only in the copy of it about to be committed
      if (c.entry.copy) c.go = true;
      else findings.push(`${c.what}; a file in ${repo} is written only in the copy of it being committed, named with --copy ${c.entry.repoFolder}=<path>, never in its standing checkout (Structure.md, The checker)`);
      continue;
    }
    if (place.key === 'SPD' && !policiesWritable) {
      if (ctx.deferPolicies) pending.push(c.what);
      else findings.push(`${c.what}; S, P and D are written only in the copy being committed, named with --policies <path>, never in the standing checkout (Structure.md, The checker)`);
      continue;
    }
    c.go = true;
  }
  if (ctx.write) applyChanges(files, changes.filter(c => c.go));
  const counts = { files: sys.fileEntries.filter(e => e.read).length, items: sys.items.size, changes: changes.filter(c => c.go).length };
  const pointerChanges = changes.filter(c => c.go && (c.kind === 'pointer' || c.kind === 'pointer list')).map(c => c.what);
  return { findings, notes, pending, stop: false, sys, counts, allPointers, pointerCounts: pc, pointerChanges, oldLists };
}

/**
 * Puts the corrections into the overlay: lines rewritten, pointers rewritten, marks raised, the
 * pointer lists and the indexes regenerated.
 */
function applyChanges(files, changes) {
  const byFile = new Map();
  for (const c of changes) {
    if (c.kind === 'code' || c.kind === 'part mark' || c.kind === 'pointer' || c.kind === 'quote') {
      const k = path.resolve(c.entry.abs);
      if (!byFile.has(k)) byFile.set(k, { entry: c.entry, sets: new Map(), spans: [] });
      const f = byFile.get(k);
      // a quote is written whole, from its first marker line to its last; nothing else stands in it
      if (c.kind === 'pointer' || c.kind === 'quote') { f.spans.push(...c.spans); continue; }
      const idx = c.it.item.jsonLine - 1;
      f.sets.set(idx, { ...(f.sets.get(idx) || { it: c.it }), ...c.set, it: c.it });
    }
  }
  for (const [abs, f] of byFile) {
    const read = f.entry.read;
    const lines = read.lines.slice();
    for (const [idx, s] of f.sets) {
      const j = { ...s.it.item.json };
      for (const k of ['code', ...L.MARKS]) if (s[k] !== undefined) j[k] = s[k];
      lines[idx] = L.formatJsonLine(j, s.it.item.jsonForm || f.entry.root.form);
    }
    // a pointer never stands on a JSON line, so its offsets, taken as line and column, still hold
    // once the JSON lines are rewritten
    const at = (ls) => { const s = [0]; for (const l of ls) s.push(s[s.length - 1] + l.length + 1); return s; };
    const before = at(read.lines);
    const lineOf = (off) => { let i = 0; while (i + 1 < before.length && before[i + 1] <= off) i += 1; return { line: i, col: off - before[i] }; };
    const after = at(lines);
    let text = lines.join('\n');
    const spans = f.spans.map(s => ({ a: lineOf(s.start), b: lineOf(s.end), text: s.text }))
      .sort((x, y) => (y.a.line - x.a.line) || (y.a.col - x.a.col));
    for (const s of spans) text = `${text.slice(0, after[s.a.line] + s.a.col)}${s.text}${text.slice(after[s.b.line] + s.b.col)}`;
    files.write(abs, text.split('\n').join(read.eol));
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
  // the lists of the rule files that hold a quote pointer: R-1123 (Quote pointers)
  for (const c of changes.filter(x => x.kind === 'quote list')) {
    const p = c.registerOf.registerPath;
    files.write(p, setQuoteList(files.read(p), c.repo, c.list));
  }
  // the pointer lists, the block written whole once per register: R-1008 (Pointers)
  const listsOf = new Map();
  for (const c of changes.filter(x => x.kind === 'pointer list')) listsOf.set(c.registerOf.registerPath, c.lists);
  for (const [p, lists] of listsOf) files.write(p, L.withPointerLists(files.read(p), lists));
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

/**
 * Sets a register's list of the rule files that hold a quote pointer, keeping the file's layout,
 * R-1123 (Quote pointers): `"ruleFilesWithQuotes"` at the top level, after `"notConverted"`, for
 * the register's own roots, or in a repository's entry for that repository's files; its value
 * replaced where it stands, else the key added.
 * @param {string|null} repo the repository's name in `"repositories"`, null for the top level
 */
function setQuoteList(text, repo, list) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const t = text.replace(/\r\n/g, '\n');
  const value = `[${list.map(p => JSON.stringify(p)).join(', ')}]`;
  let next;
  if (repo === null) {
    const has = /^ {2}"ruleFilesWithQuotes"\s*:\s*\[[^\]]*\]/m;
    const after = /^( {2}"notConverted"\s*:\s*\[[^\]]*\])(,?)$/m;
    if (has.test(t)) next = t.replace(has, `  "ruleFilesWithQuotes": ${value}`);
    else if (after.test(t)) next = t.replace(after, (all, line, comma) => `${line},\n  "ruleFilesWithQuotes": ${value}${comma}`);
    else { const close = t.lastIndexOf('\n}'); next = `${t.slice(0, close)},\n  "ruleFilesWithQuotes": ${value}${t.slice(close)}`; }
  } else {
    const key = t.indexOf(`${JSON.stringify(repo)}:`, t.indexOf('"repositories"'));
    const from = t.indexOf('{', key);
    let depth = 0, to = from;
    for (; to < t.length; to++) { if (t[to] === '{') depth++; else if (t[to] === '}' && --depth === 0) break; }
    const scope = t.slice(from, to);
    const has = /"ruleFilesWithQuotes"\s*:\s*\[[^\]]*\]/;
    const trail = /\s*$/.exec(scope)[0];
    const inner = has.test(scope) ? scope.replace(has, `"ruleFilesWithQuotes": ${value}`) : `${scope.slice(0, scope.length - trail.length)}, "ruleFilesWithQuotes": ${value}${trail}`;
    next = `${t.slice(0, from)}${inner}${t.slice(to)}`;
  }
  JSON.parse(next);
  return next.split('\n').join(eol);
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
      // a level has no id and no line: what sits under it is listed at its depth, R-1001 (Files
      // and folders)
      else if (c.kind === 'level') walk(c, depth);
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
    if (it.kind === 'pointer' && L.parseId(it.id).parent === key) rows.push(`${it.where}: pointer rule ${it.id} (${it.heading}), own id ${it.id}`);
  }
  // each pointer in the text with the own id it carries, and whether its target's list holds it:
  // R-1008 (Pointers)
  const list = (r.oldLists && r.oldLists.get(key)) || new Map();
  const seen = new Set();
  for (const { ptr, at, pub, isRule, holder, ref } of r.allPointers || []) {
    if (ptr.id !== key) continue;
    if (isRule) { rows.push(`${at}: R-${ptr.id} (${ptr.name}), the pointer of pointer rule ${holder.id}`); continue; }
    // a quote pointer file's reference carries a part of the quote count: R-1123 (Quote pointers)
    const own = pub ? ptr.title : ptr.tag;
    const carried = own !== null && (ref ? L.parseQuotePart(own) : L.parseOwnId(own)) ? own : null;
    if (carried) seen.add(carried);
    rows.push(`${at}: R-${ptr.id} (${ptr.name}), ${ref ? 'the reference of a quote pointer file, ' : ''}own id ${carried ? `${carried}${list.has(carried) ? '' : ', not on its list'}` : 'none'}`);
  }
  for (const [own, h] of list) if (!seen.has(own) && h !== own) rows.push(`${own}: on the list, in ${L.isFileHolder(h) ? h : `R-${h}`}, and no pointer carries it`);
  const target = r.sys.items.get(key);
  console.log(target ? `R-${key} (${target.heading}): ${L.describe(target)}` : `R-${key}: not in use`);
  for (const row of rows) console.log(`  ${row}`);
  console.log(`${rows.filter(x => !/: on the list, in .*, and no pointer carries it$/.test(x)).length} pointer(s) at R-${key}`);
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
    console.log('usage: node rule-check.js [--write] [--policies <path>] [--copy <folder>=<path>]... [--claude <path>] [--defer-policies] [--pointers-at <id>] [--renumber <plan.json>]');
    return args.help ? 0 : 1;
  }
  const preFindings = [];
  const v = L.readVariable(L.POLICIES_VARIABLE, { env: deps.env, readStored: deps.readStored });
  if (!v.value) preFindings.push(`${L.POLICIES_VARIABLE} is not set, in the process or as a stored user value; set it to a checkout of this repository (Structure.md, The checker)`);
  const standing = v.value ? path.resolve(v.value) : null;
  const policies = args.policies ? path.resolve(args.policies) : standing;
  if (!policies || !fs.existsSync(policies)) {
    for (const f of preFindings) console.log(f);
    if (policies) console.log(`${policies}: the organization repository's checkout does not exist`);
    console.log('FAIL: no checkout of the organization repository to check');
    return 1;
  }
  const claude = L.claudeRoot(args.claude, policies);
  const ctx = { files: new L.Files(), policies, claude, standing, policiesGiven: !!args.policies, copies: args.copies, write: args.write, deferPolicies: args.deferPolicies, env: deps.env, readStored: deps.readStored, preFindings };
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
    // what --write did to the pointers and their lists: each change, or their count when many
    const pc = r.pointerCounts;
    if (r.pointerChanges.length <= 12) for (const w of r.pointerChanges) console.log(`pointer: ${w}`);
    else console.log(`pointer: ${r.pointerChanges.length} change(s)`);
    if (r.pointerChanges.length) console.log(`pointers: ${pc.kept} kept (${pc.followed} brought up to date, ${pc.moved} moved), ${pc.recorded} recorded, ${pc.repointed} repointed, ${pc.gone} taken off`);
    for (const p of changed) console.log(`wrote ${p}`);
  }
  console.log(`OK: ${r.counts.files} file(s), ${r.counts.items} id(s)${r.notes.length ? `, ${r.notes.length} not checked` : ''}`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, check, renderIndex, parseArgs };
