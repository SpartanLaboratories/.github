'use strict';
// The reading core the checker (rule-check.js) and the fetch script (rule-fetch.js) share, so the
// two cannot read a file differently. What it reads is stated in Structure.md: the files, folders
// and their core files in R-1001 (Files and folders), the kinds of section in R-1002 (Sections),
// the JSON line and its two forms in R-1003 (A rule), the tiers and the id record in R-1004 (`id`),
// splinters and pointer rules in R-1005 (Splinters) and R-1006 (Pointer rules), the codes in
// R-1007 (`code`), the pointers and by-file references in R-1008 (Pointers), the registers, the
// variable and the other repositories' checkouts in R-1010 (The checker), and what the fetch script
// prints, with the search, in R-1011 (The fetch script).
//
// Left out: groups of files with no folder of their own (the health files, the repositories, the
// sub-organizations), whose shape is not settled. Machine-local paths: none is written here; the
// home folder is asked of the operating system at run time.

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

// ---------------------------------------------------------------- ids: R-1004 (`id`), R-1005 (Splinters)

/** First number of each tier, by digit count, where its gap check starts: R-1004 (`id`). */
const TIER_START = { 1: 1, 2: 10, 3: 100, 4: 1000, 5: 10000 };
const TIER_END = { 1: 9, 2: 99, 3: 999, 4: 9999, 5: 99999 };
/** What each tier is on: R-1004 (`id`); a folder's id also addresses its core file, R-1001 (Files and folders). */
const TIER_OF = { main: 1, folder: 2, file: 3, section: 4, rule: 5 };
const TIER_WORD = { 1: 'a main file', 2: 'a folder', 3: 'a file', 4: 'a section', 5: 'a rule' };

/**
 * Parses an id. A plain number is a tiered id; a string is `<base>(-<n>|-P<n>)+`, its last
 * segment deciding its kind: `-<n>` a splinter of the rest, `-P<n>` a pointer rule at the rest
 * (R-1005 (Splinters), R-1006 (Pointer rules); a pointer may target anything, e.g. `10026-1-P1`).
 * A string of digits alone is read as
 * the number it spells, so an id given on a command line parses too.
 * @param {number|string} id
 * @returns {{kind:'tiered',n:number,tier:number}|{kind:'splinter'|'pointer',parent:string,part:number}|null}
 *   null when the id is malformed.
 */
function parseId(id) {
  if (typeof id === 'string' && /^[1-9]\d*$/.test(id)) id = Number(id);
  if (typeof id === 'number') {
    if (!Number.isInteger(id) || id < 1) return null;
    const tier = String(id).length;
    return tier <= 5 ? { kind: 'tiered', n: id, tier } : null;
  }
  if (typeof id !== 'string') return null;
  const m = /^(\d+(?:-P?\d+)*)-(P?)(\d+)$/.exec(id);
  if (!m || /^0/.test(m[3])) return null;
  const parentText = m[1];
  if (!parseId(parentText)) return null;
  return { kind: m[2] ? 'pointer' : 'splinter', parent: String(parentText), part: Number(m[3]) };
}

/** The key an id is looked up by: its decimal text for a number, the string itself otherwise. */
function idKey(id) { return String(id); }

/** The tiered id at the root of an id: 10026 for '10026-1-P1'. */
function baseId(id) {
  const p = parseId(id);
  if (!p) return null;
  return p.kind === 'tiered' ? p.n : baseId(p.parent);
}

// ------------------------------------------------------------- files: R-1001 (Files and folders), R-1002 (Sections), R-1003 (A rule)

/** The two forms of a JSON line, R-1003 (A rule): visible text in G, an HTML comment in S, P and D. */
const FORM = { visible: 'visible', comment: 'comment' };

const HEADING = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
// A one-line object holding "name" is a JSON line, its keys in any order, so a line with its keys
// out of order is reported as such rather than missed.
const VISIBLE_LINE = /^\{.*"name"\s*:.*\}$/;
const COMMENT_LINE = /^<!--\s*\{.*"name"\s*:.*\}\s*-->$/;
/** The keys of a JSON line, in their order; the last two absent when the count is zero: R-1003 (A rule). */
const LINE_KEYS = ['name', 'code', 'id', 'splinterMark', 'pointerMark'];

/**
 * Reads a line as a JSON line in either form. A line of neither shape is not a JSON line.
 * @returns {{value:object|null, error:string|null, form:'visible'|'comment', wrongForm:string|null}|null}
 */
function readJsonLine(line, form) {
  const t = line.trim();
  const isComment = COMMENT_LINE.test(t);
  const isVisible = !isComment && VISIBLE_LINE.test(t);
  if (!isComment && !isVisible) return null;
  const body = isComment ? t.replace(/^<!--\s*/, '').replace(/\s*-->$/, '') : t;
  let value = null, error = null;
  try { value = JSON.parse(body); } catch (e) { error = 'the JSON line does not parse'; }
  const wrongForm = (isComment && form === FORM.visible) || (isVisible && form === FORM.comment);
  return { value, error, form: isComment ? FORM.comment : FORM.visible, wrongForm: wrongForm ? (isComment ? 'comment' : 'visible') : null };
}

/** Writes a JSON line in a form, keys in their order, marks only when above zero: R-1003 (A rule). */
function formatJsonLine(value, form) {
  const out = {};
  for (const k of LINE_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    if ((k === 'splinterMark' || k === 'pointerMark') && !value[k]) continue;
    out[k] = value[k];
  }
  const json = JSON.stringify(out);
  return form === FORM.comment ? `<!-- ${json} -->` : json;
}

/** The offsets of a line's inline code spans, as [start, end) pairs (CommonMark backtick runs). */
function codeSpans(line) {
  const spans = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') { i += 1; continue; }
    let run = i;
    while (line[run] === '`') run += 1;
    const ticks = line.slice(i, run);
    const close = line.indexOf(ticks, run);
    if (close === -1) { i = run; continue; }
    spans.push([i, close + ticks.length]);
    i = close + ticks.length;
  }
  return spans;
}

/**
 * Reads a Markdown rule file into its items. Front matter and fenced blocks are skipped. Every
 * `#`, `##` and `###` heading becomes an item, with the JSON line that follows it if any; every
 * heading, however deep, gets its GitHub anchor, R-1008 (Pointers). `masked` is the text with front matter,
 * fences, JSON lines and code spans blanked to spaces, offsets kept, for the pointer scan.
 * @param {string} text the file's contents
 * @param {'visible'|'comment'} form the JSON-line form of the file's place, R-1003 (A rule)
 * @returns {{items:object[], findings:string[], lines:string[], masked:string[], eol:string,
 *   frontMatterEnd:number, anchors:Map<number,string>}} items carry level, heading, line (1-based),
 *   json (the parsed line or null), jsonLine (1-based or null), bodyStart and bodyEnd (0-based
 *   line indexes, exclusive end), anchor; findings carry their 1-based line as `line N: ...`
 */
function readFile(text, form) {
  const eol = /\r\n/.test(text) ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const masked = lines.slice();
  const findings = [];
  const items = [];
  const anchors = new Map();
  const slugger = makeSlugger();
  let i = 0;
  let frontMatterEnd = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end !== -1) {
      frontMatterEnd = end + 1;
      for (let k = 0; k < frontMatterEnd; k++) masked[k] = blank(lines[k]);
      i = frontMatterEnd;
    }
  }
  let fence = null;
  for (; i < lines.length; i++) {
    const l = lines[i];
    const f = FENCE.exec(l);
    if (f) {
      const marker = f[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length && /^ {0,3}[`~]+\s*$/.test(l)) fence = null;
      masked[i] = blank(l);
      continue;
    }
    if (fence) { masked[i] = blank(l); continue; }
    const h = HEADING.exec(l);
    if (h) {
      const anchor = slugger(h[2]);
      anchors.set(i + 1, anchor);
      if (h[1].length <= 3) {
        const item = { level: h[1].length, heading: h[2], line: i + 1, json: null, jsonLine: null, anchor };
        const next = lines[i + 1];
        if (next !== undefined) {
          const j = readJsonLine(next, form);
          if (j) {
            item.jsonLine = i + 2;
            item.jsonForm = j.form;
            if (j.error) findings.push(`line ${i + 2}: ${j.error}`);
            if (j.wrongForm) findings.push(`line ${i + 2}: a ${j.wrongForm} JSON line where this place takes the other form (Structure.md, A rule)`);
            item.json = j.value;
            masked[i + 1] = blank(next);
            i += 1;
          }
        }
        items.push(item);
      }
      maskSpans(lines, masked, h[1].length <= 3 ? items[items.length - 1].line - 1 : i);
      continue;
    }
    if (readJsonLine(l, form)) {
      findings.push(`line ${i + 1}: a JSON line not directly under a heading`);
      masked[i] = blank(l);
      continue;
    }
    maskSpans(lines, masked, i);
  }
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    it.bodyStart = (it.jsonLine || it.line); // 0-based index of the first body line
    let end = lines.length;
    for (let m = k + 1; m < items.length; m++) {
      if (items[m].level <= it.level) { end = items[m].line - 1; break; }
    }
    it.bodyEnd = end;
  }
  return { items, findings, lines, masked, eol, frontMatterEnd, anchors };
}

function blank(line) { return ' '.repeat(line.length); }

function maskSpans(lines, masked, i) {
  const spans = codeSpans(lines[i]);
  if (!spans.length) return;
  const chars = masked[i].split('');
  for (const [a, b] of spans) chars.fill(' ', a, b);
  masked[i] = chars.join('');
}

/**
 * Classifies the `##` sections of a read file, R-1002 (Sections):
 *  - 'pointer': the section is wholly a pointer rule; it carries the pointer id alone, no 4-digit id;
 *  - 'rules': it has `###` rules other than its own splinters; it needs a 4-digit id;
 *  - 'one-rule': no `###` rules, or only its own splinters; it needs a 4-digit id.
 * A `###` heading with no JSON line is a sub-heading of a one-rule section's body; in a section
 * of rules every `###` heading is a rule. A splinter sits in its parent's section: its parent is
 * the section or one of the section's rules, R-1005 (Splinters).
 * @returns {object[]} one entry per `##` item: {item, kind, rules, splinters, findings}, where
 *   `splinters` holds every splinter in the section with `parentItem` set
 */
function classifySections(read) {
  const out = [];
  const its = read.items;
  for (let k = 0; k < its.length; k++) {
    const s = its[k];
    if (s.level !== 2) continue;
    const children = [];
    for (let m = k + 1; m < its.length && its[m].level > 2; m++) if (its[m].level === 3) children.push(its[m]);
    const findings = [];
    const sid = s.json ? s.json.id : undefined;
    const pid = sid !== undefined ? parseId(sid) : null;
    const lined = children.filter(c => c.json);
    const byId = new Map([[idKey(sid), s], ...lined.map(c => [idKey(c.json.id), c])]);
    const splinters = [];
    for (const c of lined) {
      const p = parseId(c.json.id);
      if (p && p.kind === 'splinter') {
        const parentItem = byId.get(p.parent);
        if (parentItem && parentItem !== c) { c.parentItem = parentItem; splinters.push(c); }
      }
    }
    const rules = lined.filter(c => !splinters.includes(c));
    let kind;
    if (pid && pid.kind === 'pointer') {
      kind = 'pointer';
      if (children.length) findings.push(`line ${s.line}: a section that is a pointer rule holds ### headings`);
    } else {
      kind = rules.length ? 'rules' : 'one-rule';
      if (!s.json) findings.push(`line ${s.line}: the ## section has no JSON line`);
      else if (!pid || pid.kind !== 'tiered' || pid.tier !== TIER_OF.section) {
        findings.push(`line ${s.line}: a ## section takes a 4-digit id or, when it is wholly a pointer rule, a pointer id alone (Structure.md, Sections)`);
      }
    }
    if (kind === 'rules') {
      for (const c of children) if (!c.json) findings.push(`line ${c.line}: in a section of rules every ### heading is a rule, and this one has no JSON line`);
    }
    for (const r of rules) {
      const p = parseId(r.json.id);
      if (!p) findings.push(`line ${r.line}: malformed id ${JSON.stringify(r.json.id)}`);
      else if (p.kind === 'tiered' && p.tier !== TIER_OF.rule) findings.push(`line ${r.line}: a ### rule takes a 5-digit id (Structure.md, \`id\`)`);
      else if (p.kind === 'splinter') findings.push(`line ${r.line}: a splinter sits in its parent's section (Structure.md, Splinters)`);
    }
    out.push({ item: s, kind, rules, splinters, findings });
  }
  return out;
}

/**
 * The id a file's `#` title line must carry, R-1004 (`id`) and R-1001 (Files and folders): a main file 1 digit; a folder's core
 * file the folder's 2-digit id, with no 3-digit id of its own; any other file 3 digits.
 * @param {'main'|'core'|'file'} role
 */
function titleTier(role) {
  return role === 'main' ? TIER_OF.main : role === 'core' ? TIER_OF.folder : TIER_OF.file;
}

// ------------------------------------------------------------- GitHub's heading anchors: R-1008 (Pointers)

/**
 * GitHub's anchor for a heading, as its slugger derives it from the rendered text: inline code
 * keeps its text, links keep their text, emphasis markers go; then lower case, every character
 * that is not a letter, a mark, a digit, a connector, a space or a hyphen removed, and each space
 * a hyphen. Checked against GitHub's own rendering of twenty-nine headings on 2026-11-11 (the
 * self-test holds them); the suffix of a repeated heading (-1, -2, ...) is the slugger's and was
 * not seen in that rendering.
 */
function githubSlug(text) {
  let t = text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`+([^`]*?)`+/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|\*|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}]))/gu, '');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return t.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
}

/** A per-file slugger: the first use of a slug is bare, each repeat takes -1, -2, ... */
function makeSlugger() {
  const seen = new Map();
  return function slug(text) {
    const base = githubSlug(text);
    let s = base;
    if (seen.has(base)) {
      let n = seen.get(base);
      do { n += 1; s = `${base}-${n}`; } while (seen.has(s));
      seen.set(base, n);
    }
    seen.set(s, 0);
    return s;
  };
}

// ------------------------------------------------------------------- the id record: R-1004 (`id`)

/**
 * A list as each place keeps it, R-1004 (`id`): its tier marks and its retired ids, nothing else.
 * @typedef {{marks:Object<string,number>, retired:Array<{id:(number|string), by:(number|string|null)}>}} IdList
 */

/**
 * Checks the ids in use against the two lists read as one record, R-1004 (`id`): no id twice
 * (in use twice, or in use and retired); per tier, every number from the tier's start to the
 * record's mark (the highest of the lists' marks and the ids in use) is in use or retired; a tier
 * whose mark reaches its last number is full, which stops the run. Per list, a mark below the
 * highest id its own place uses is stale. The four main files' ids are fixed, so one whose
 * file does not exist yet is reserved, not a gap.
 * @param {Array<{id:(number|string), where:string, list?:number}>} inUse every tiered id found,
 *   `list` the index in `lists` of the place that uses it
 * @param {IdList[]} lists the two lists, G's and that of S, P and D
 * @param {{reserved?:number[]}} [opts]
 * @returns {{findings:string[], gaps:string[], stop:boolean, marks:Object<number,number>,
 *   listMarks:Array<Object<number,number>>, stale:Array<{list:number,tier:number,from:number,to:number}>}}
 *   `gaps` are kept apart so a caller with an unread checkout can report them as not checked
 */
function checkRecord(inUse, lists, opts = {}) {
  const reserved = new Set((opts.reserved || []).map(String));
  const findings = [];
  const gaps = [];
  let stop = false;
  const seen = new Map();
  for (const u of inUse) {
    const key = idKey(u.id);
    if (seen.has(key)) findings.push(`id ${key} is used twice: ${seen.get(key)} and ${u.where}`);
    else seen.set(key, u.where);
  }
  const retired = new Map();
  for (const l of lists) for (const r of l.retired || []) {
    const key = idKey(r.id);
    if (retired.has(key)) findings.push(`id ${key} is retired in both lists, or twice`);
    retired.set(key, r.by === undefined ? null : r.by);
    if (seen.has(key)) findings.push(`id ${key} is retired and in use at ${seen.get(key)}`);
  }
  for (const [key, by] of retired) {
    if (by === null) continue;
    if (!seen.has(idKey(by)) && !retired.has(idKey(by))) findings.push(`retired id ${key} names its replacement ${by}, which is neither in use nor retired`);
  }
  const marks = {};
  const listMarks = lists.map(l => ({ ...(l.marks || {}) }));
  const stale = [];
  for (let tier = 1; tier <= 5; tier++) {
    const parsed = inUse.map(u => ({ u, p: parseId(u.id) })).filter(x => x.p && x.p.kind === 'tiered' && x.p.tier === tier);
    lists.forEach((l, li) => {
      const own = parsed.filter(x => x.u.list === li).map(x => x.p.n);
      const have = (l.marks && l.marks[tier]) || 0;
      const top = Math.max(0, ...own);
      if (top > have) { stale.push({ list: li, tier, from: have, to: top }); listMarks[li][tier] = top; }
    });
    const listed = Math.max(0, ...lists.map(l => (l.marks && l.marks[tier]) || 0));
    const highest = Math.max(0, ...parsed.map(x => x.p.n));
    const mark = Math.max(listed, highest);
    marks[tier] = mark;
    if (mark >= TIER_END[tier] && tier > 1) { findings.push(`tier ${tier} is full (mark ${mark}): the user decides (Structure.md, \`id\`)`); stop = true; continue; }
    for (let n = TIER_START[tier]; n <= mark; n++) {
      const k = String(n);
      if (!seen.has(k) && !retired.has(k) && !reserved.has(k)) gaps.push(`tier ${tier}: id ${n} is neither in use nor retired (gap)`);
    }
  }
  return { findings, gaps, stop, marks, listMarks, stale };
}

/**
 * Checks the per-parent marks written on the lines, R-1005 (Splinters) and R-1006 (Pointer rules): `splinterMark` on a parent's line,
 * `pointerMark` on a target's line, absent when the count is zero. For each parent, every part
 * from 1 to the mark is in use or retired, and no part in use is above the mark.
 * @param {Array<{id:(number|string), splinterMark?:number, pointerMark?:number, where:string}>} lines
 *   every JSON line of both places, and the listed items (which have no line)
 * @param {Set<string>} retiredIds the retired string ids of both lists
 * @returns {string[]|{findings:string[], raise:Array<{id:string, field:string, to:number}>, missing:string[]}}
 *   with opts.detail the raises a --write makes and the owners whose line was not read
 */
function checkPartMarks(lines, retiredIds, opts = {}) {
  const findings = [];
  const raise = [];
  const missing = [];
  const parts = new Map();
  const note = (id) => {
    const p = parseId(id);
    if (!p || p.kind === 'tiered') return;
    const key = `${p.parent}|${p.kind}`;
    if (!parts.has(key)) parts.set(key, new Set());
    parts.get(key).add(p.part);
  };
  for (const l of lines) note(l.id);
  for (const r of retiredIds) note(r);
  const byId = new Map(lines.map(l => [idKey(l.id), l]));
  for (const [key, set] of parts) {
    const [parent, kind] = key.split('|');
    const owner = byId.get(parent);
    const field = kind === 'splinter' ? 'splinterMark' : 'pointerMark';
    if (!owner) { missing.push(parent); if (!opts.detail) findings.push(`${kind} parts of ${parent}, whose line does not exist`); continue; }
    const mark = owner[field] || 0;
    const highest = Math.max(...set);
    if (highest > mark) {
      raise.push({ id: parent, field, to: highest, from: mark, where: owner.where });
      if (!opts.detail) findings.push(`${owner.where}: ${field} ${mark || 'absent'} is below part ${highest} in use or retired`);
    }
    for (let n = 1; n <= mark; n++) if (!set.has(n)) findings.push(`${owner.where}: ${parent}-${kind === 'pointer' ? 'P' : ''}${n} is neither in use nor retired (gap)`);
  }
  for (const l of lines) {
    for (const field of ['splinterMark', 'pointerMark']) {
      if (l[field] === 0) findings.push(`${l.where}: ${field} 0 is written; the field is absent when the count is zero`);
      const kind = field === 'splinterMark' ? 'splinter' : 'pointer';
      if (l[field] > 0 && !parts.has(`${idKey(l.id)}|${kind}`)) {
        for (let n = 1; n <= l[field]; n++) findings.push(`${l.where}: ${idKey(l.id)}-${kind === 'pointer' ? 'P' : ''}${n} is neither in use nor retired (gap)`);
      }
    }
  }
  return opts.detail ? { findings, raise, missing } : findings;
}

// --------------------------------------------------------------------- pointers: R-1008 (Pointers)

const ID_TEXT = '\\d+(?:-P?\\d+)*';

/**
 * Finds the pointers in a file: `R-<id> (Name)` outside code spans, fences, front matter and JSON
 * lines; on a public page (S, P, D) the pointer is the text of a Markdown link,
 * `[R-<id> (Name)](href)`. A name may run over a line break. The name is read from the
 * raw text, so a heading in code formatting keeps its backticks.
 * @param {{lines:string[], masked:string[]}} read as readFile returns it
 * @param {boolean} publicPage
 * @returns {Array<{id:string, name:(string|null), href:(string|null), line:number, bare:boolean,
 *   start:number, end:number}>} `line` 1-based; `bare` marks a pointer on a public page that is
 *   not the text of a link; `name` null when the pointer carries none; start and end are offsets
 *   into the joined text
 */
function findPointers(read, publicPage) {
  const raw = read.lines.join('\n');
  const text = read.masked.join('\n');
  const starts = [0];
  for (let i = 0; i < raw.length; i++) if (raw[i] === '\n') starts.push(i + 1);
  const lineOf = (off) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; } return lo + 1; };
  const out = [];
  const covered = [];
  const linkRe = new RegExp(`\\[R-(${ID_TEXT})\\s+\\(((?:[^()\\]]|\\([^()]*\\))*)\\)\\]\\(([^)\\s]*)\\)`, 'gd');
  let m;
  while ((m = linkRe.exec(text))) {
    const [ns, ne] = m.indices[2];
    out.push({ id: m[1], name: norm(raw.slice(ns, ne)), href: m[3], line: lineOf(m.index), bare: false, start: m.index, end: m.index + m[0].length });
    covered.push([m.index, m.index + m[0].length]);
  }
  const bareRe = new RegExp(`(?<![\\w-])R-(${ID_TEXT})\\b`, 'g');
  while ((m = bareRe.exec(text))) {
    if (covered.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const at = m.index + m[0].length;
    const open = /^\s*\(/.exec(text.slice(at, at + 10));
    let name = null, end = at;
    if (open) {
      let depth = 0;
      for (let i = at + open[0].length - 1; i < raw.length; i++) {
        if (raw[i] === '(') depth += 1;
        else if (raw[i] === ')') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
      }
      if (end > at) name = norm(raw.slice(at + open[0].length, end - 1));
    }
    out.push({ id: m[1], name, href: null, line: lineOf(m.index), bare: publicPage, start: m.index, end });
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

/**
 * Finds the Markdown links of a file that are not the link around a pointer, outside code spans
 * and fences, for the by-file check, R-1008 (Pointers). Images are left out.
 * @returns {Array<{text:string, href:string, line:number}>}
 */
function findLinks(read) {
  const text = read.masked.join('\n');
  const raw = read.lines.join('\n');
  const out = [];
  const re = /(?<!!)\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(text))) {
    if (new RegExp(`^R-${ID_TEXT}\\s+\\(`).test(m[1])) continue;
    out.push({ text: norm(raw.slice(m.index + 1, m.index + 1 + m[1].length)), href: m[2], line: raw.slice(0, m.index).split('\n').length });
  }
  return out;
}

/**
 * Finds quoted texts on the lines of a file outside code spans and fences: "..." and the curly
 * quotes, for the quoted section references of R-1008 (Pointers).
 * @returns {Array<{quoted:string, line:number, lineText:string}>}
 */
function findQuoted(read) {
  const out = [];
  read.masked.forEach((ml, i) => {
    const re = /"([^"\n]+)"|“([^”\n]+)”/g;
    let m;
    while ((m = re.exec(ml))) out.push({ quoted: (m[1] || m[2]).trim(), line: i + 1, lineText: read.lines[i] });
  });
  return out;
}

/**
 * The name a pointer must carry for its target, R-1008 (Pointers): one form, `R-<id> (Name)`, for
 * every target; a rule or a section is named by its heading, a file by its `#` title, a folder by
 * the `#` title of its index file, a script or a generated index by its file name.
 * @param {{kind:string, heading?:string, read?:object, indexRead?:object, fileName?:string}} target
 * @returns {string|null} null when the file or index file has no `#` title (itself a finding)
 */
function expectedName(target) {
  if (target.kind === 'listed') return target.fileName;
  if (['rule', 'section', 'splinter', 'pointer'].includes(target.kind)) return target.heading;
  const r = target.kind === 'file' || target.kind === 'main' ? target.read : target.indexRead || target.read;
  const title = r && r.items.find(it => it.level === 1);
  return title ? title.heading : null;
}

/**
 * Checks a public-page link against the place of its target, R-1008 (Pointers): the path must lead to
 * the file that holds the target (for a folder, the folder or its index file), and the anchor
 * must be the target heading's, derived as GitHub derives it; a file, a folder or a listed item
 * takes no anchor. Paths are compared as written, case and all, since GitHub's are.
 * @param {string} fromFile absolute path of the page holding the pointer
 * @param {string} href the link's target as written
 * @param {{file:string, anchor:(string|null), folder?:string}} target the file holding the
 *   target, the anchor a section or rule must carry (null for a file, a folder or a listed item),
 *   and for a folder its directory
 * @returns {true|null|string} true when it matches; null for an absolute URL (not checked here);
 *   else what is wrong
 */
function linkMatches(fromFile, href, target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  const hash = href.indexOf('#');
  const filePart = hash === -1 ? href : href.slice(0, hash);
  const anchor = hash === -1 ? null : href.slice(hash + 1);
  const resolved = filePart ? path.resolve(path.dirname(fromFile), decodeURI(filePart)) : path.resolve(fromFile);
  const same = (a, b) => path.resolve(a) === path.resolve(b);
  const pathOk = same(resolved, target.file) || (target.folder && same(resolved.replace(/[\\/]+$/, ''), target.folder));
  if (!pathOk) return `the link goes to ${filePart || '(this page)'}, the target is in ${path.basename(target.file)}`;
  if (target.anchor && anchor !== target.anchor) return `the link's anchor is ${anchor === null ? 'missing' : `#${anchor}`}, the heading's is #${target.anchor}`;
  if (!target.anchor && anchor) return `a link to a file or a folder takes no anchor, this one has #${anchor}`;
  return true;
}

/**
 * A folder's core file by name, in the order it is looked for, R-1001 (Files and folders). The
 * list's last step,
 * the folder's only rule file, has no name: coreFileOf takes it.
 */
const INDEX_NAMES = ['Structure.md', 'CLAUDE.md', 'POLICY.md', 'DESIGN.md', 'README.md', 'GUIDANCE.md', 'RULES.md', 'INDEX.md'];

/**
 * Finds a folder's index file by name, R-1001 (Files and folders): a main file, then README.md, then GUIDANCE.md, then
 * RULES.md, then INDEX.md, by the exact name (GitHub's names are case-sensitive). A folder with
 * none returns null; the list's last step is coreFileOf's.
 * @param {string} dir
 * @param {{exists:Function, list:Function}} [files] the file layer; the disk when absent
 * @returns {string|null}
 */
function indexFileOf(dir, files) {
  let names;
  try { names = files ? files.list(dir) : fs.readdirSync(dir); } catch (e) { return null; }
  for (const n of INDEX_NAMES) if (names.includes(n)) return path.join(dir, n);
  return null;
}

/**
 * Whether a file directly in a registered folder counts as a rule file for the list's last step:
 * every Markdown file does, R-1001 (Files and folders). Scripts, templates and sub-folders never count; the caller
 * passes files only.
 * @param {string} abs the file's absolute path
 */
function countsForLastStep(abs) {
  return /\.md$/.test(abs);
}

/**
 * Finds a folder's core file by the whole list, R-1001 (Files and folders): its index
 * file by name, else its only rule file, where exactly one sits directly in it (the last step).
 * @param {string} dir
 * @param {Files} files the file layer
 * @returns {{file:(string|null), by:('name'|'only'|null), ruleFiles:string[]}} `by` says which
 *   step found it; with none, `ruleFiles` holds the rule files that kept the last step from it
 *   (none, or two or more)
 */
function coreFileOf(dir, files) {
  const named = indexFileOf(dir, files);
  if (named) return { file: named, by: 'name', ruleFiles: [] };
  let names;
  try { names = files.list(dir); } catch (e) { return { file: null, by: null, ruleFiles: [] }; }
  const ruleFiles = names.map(n => path.join(dir, n)).filter(p => files.isFile(p) && countsForLastStep(p)).sort();
  if (ruleFiles.length === 1) return { file: ruleFiles[0], by: 'only', ruleFiles };
  return { file: null, by: null, ruleFiles };
}

// --------------------------------------------------------------------- codes: R-1007 (`code`)

/** The four main files' ids, R-1004 (`id`), and their roots' letters. */
const MAIN_FILES = {
  'Structure.md': { id: 1, root: 'S' },
  'POLICY.md': { id: 2, root: 'P' },
  'DESIGN.md': { id: 3, root: 'D' },
  'CLAUDE.md': { id: 4, root: 'G' },
};
const ROOT_MAIN = { S: 'Structure.md', P: 'POLICY.md', D: 'DESIGN.md', G: 'CLAUDE.md' };

/**
 * A pointer rule's code, R-1007 (`code`): it takes no letter; its code is its file's code with its
 * `<target>-P<n>` id, e.g. pointerRuleCode('G', '1041-P1') is 'G-1041-P1'.
 */
function pointerRuleCode(fileCode, id) {
  const p = parseId(id);
  if (!p || p.kind !== 'pointer') throw new Error(`not a pointer-rule id: ${id}`);
  return `${fileCode}-${id}`;
}

/** The reserved segment for a main file's own sections: C, for Core, in all four roots, R-1007 (`code`). */
const CORE_SEGMENT = 'C';

/**
 * The segment under which a file's own sections sit, R-1007 (`code`): C for each
 * of the four main files (S-C-..., P-C-..., D-C-..., G-C-...); null for any other file, whose
 * sections share its folder's letter space with the folder's other files.
 */
function ownSectionSegment(file) {
  return Object.prototype.hasOwnProperty.call(MAIN_FILES, file) ? CORE_SEGMENT : null;
}

/**
 * The code of a section of a file, R-1007 (`code`): for a main file, root letter, C, then the section's
 * segment; for any other file, the file's code then the section's segment.
 */
function sectionCode(file, fileCode, segment) {
  const core = ownSectionSegment(file);
  return core ? `${fileCode}-${core}-${segment}` : `${fileCode}-${segment}`;
}

/** Findings for a folder or file that takes the Core segment at a root's second level, R-1007 (`code`). */
function checkCoreReserved(secondLevel) {
  return secondLevel.filter(s => s.segment === CORE_SEGMENT)
    .map(s => `${s.what}: C is reserved at a root's second level for the main file's own sections`);
}

/**
 * Checks that segments sharing one letter space are unique and well formed: at a root's second
 * level one capital letter, deeper 1 to 3, R-1007 (`code`).
 * @param {Array<{segment:string, what:string}>} siblings
 * @param {number} level the depth of the segments: 2 at a root's second level, 3 or more deeper
 * @returns {string[]} findings
 */
function checkSiblingSegments(siblings, level) {
  const findings = [];
  const re = level <= 2 ? /^[A-Z]$/ : /^[A-Z]{1,3}$/;
  const seen = new Map();
  for (const s of siblings) {
    if (typeof s.segment !== 'string' || !re.test(s.segment)) findings.push(`${s.what}: segment "${s.segment}" must be ${level <= 2 ? 'one capital letter' : '1 to 3 capital letters'}`);
    if (seen.has(s.segment)) findings.push(`${s.what} and ${seen.get(s.segment)} share the segment "${s.segment}"`);
    else seen.set(s.segment, s.what);
  }
  return findings;
}

// ------------------------------------------------------- the variable and other checkouts: R-1010 (The checker)

/**
 * Reads a user variable: the process environment first, then the stored user value, R-1010 (The
 * checker). On
 * Windows the stored value is HKCU\Environment; elsewhere there is no stored value to read.
 * @param {string} name
 * @param {{env?:object, readStored?:Function}} [deps] for the self-test
 * @returns {{value:(string|null), source:('process'|'stored'|null)}}
 */
function readVariable(name, deps = {}) {
  const env = deps.env || process.env;
  if (env[name]) return { value: env[name], source: 'process' };
  const stored = (deps.readStored || readStoredUserValue)(name);
  return stored ? { value: stored, source: 'stored' } : { value: null, source: null };
}

function readStoredUserValue(name) {
  if (process.platform !== 'win32') return null;
  let out;
  try {
    out = childProcess.execFileSync('reg', ['query', 'HKCU\\Environment', '/v', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { return null; }
  const m = new RegExp(`^\\s*${name}\\s+(REG_SZ|REG_EXPAND_SZ)\\s+(.*)$`, 'mi').exec(out);
  if (!m) return null;
  const v = m[2].trim();
  return m[1] === 'REG_EXPAND_SZ' ? v.replace(/%([^%]+)%/g, (all, k) => process.env[k] || all) : v;
}

/** The variable that names the organization repository's checkout, R-1010 (The checker). */
const POLICIES_VARIABLE = 'SPARTAN_ORG_POLICIES';

/**
 * The name of the variable that overrides the sibling folder of another repository, R-1010 (The
 * checker): SPARTAN_CHECKOUT_ and the register's folder name in capitals, each run of other
 * characters an underscore.
 */
function overrideVariable(folderName) {
  return `SPARTAN_CHECKOUT_${folderName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

/**
 * Finds the checkout of another repository, R-1010 (The checker): a sibling folder of the policies checkout,
 * under the folder name the register gives, a variable overriding it.
 * @returns {{path:string, exists:boolean}}
 */
function siblingCheckout(policiesPath, folderName, override) {
  const p = override || path.join(path.dirname(path.resolve(policiesPath)), folderName);
  return { path: p, exists: fs.existsSync(p) };
}

/**
 * Reads a repository's address as a register gives it, R-1008 (Pointers): `https://github.com/<owner>/<repo>/`
 * and whatever follows, e.g. `blob/main/`. Owner and repository are compared in lower case, as
 * GitHub resolves them.
 * @returns {{owner:string, repo:string}|null} null when it is no GitHub repository address
 */
function parseGithubAddress(url) {
  const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)(?:\/|$)/i.exec(String(url || ''));
  return m ? { owner: m[1].toLowerCase(), repo: m[2].replace(/\.git$/i, '').toLowerCase() } : null;
}

/** Where G's public copy sits in the organization repository, R-1008 (Pointers). */
const G_COPY = 'claude/';

/**
 * The file a full GitHub address points at, when it is a file or folder of a repository the
 * registers give an address for, R-1008 (Pointers): `https://github.com/<owner>/<repo>/blob|tree/<ref>/<path>`,
 * its anchor and query left off, `<ref>` one segment. An address may carry a `prefix`: a path
 * under it is read in that address's `base` with the prefix taken off, so a path under `claude/`
 * in the organization repository is read in G, its public copy's source. The longest prefix that
 * fits is taken.
 * @param {string} href the link's target as written
 * @param {Array<{owner:string, repo:string, base:string, prefix?:string}>} addresses each
 *   repository's address and the folder its checkout is read from
 * @returns {string|null} the absolute path in that checkout, or null
 */
function githubTarget(href, addresses) {
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/[^/]+\/([^#?]*)/i.exec(href);
  if (!m || !m[3]) return null;
  let rel;
  try { rel = decodeURI(m[3]); } catch (e) { return null; }
  const fits = addresses.filter(x => x.owner === m[1].toLowerCase() && x.repo === m[2].toLowerCase() && rel.startsWith(x.prefix || ''));
  if (!fits.length) return null;
  const a = fits.reduce((best, x) => ((x.prefix || '').length > (best.prefix || '').length ? x : best));
  const rest = rel.slice((a.prefix || '').length);
  return rest ? path.join(a.base, rest) : null;
}

/**
 * The file of G a path in the organization repository's checkout stands for, when it lies in G's
 * public copy, under `claude/`, R-1008 (Pointers): the path with the copy's folder taken off, read
 * in G, wherever G is read from. So a relative link that resolves into the copy is a link into G,
 * as a full address into it is.
 * @param {string} abs the absolute path a relative link resolves to
 * @param {{checkout:string, base:string}|null} gCopy the organization repository's checkout and
 *   the folder G is read from
 * @returns {string|null} the absolute path in G, or null when the path is outside the copy or is
 *   the copy itself
 */
function gCopyTarget(abs, gCopy) {
  if (!gCopy) return null;
  const rel = toPosix(path.relative(path.resolve(gCopy.checkout), path.resolve(abs)));
  if (!rel.startsWith(G_COPY)) return null;
  const rest = rel.slice(G_COPY.length);
  return rest ? path.join(gCopy.base, rest) : null;
}

/** G's place: `--claude <path>` when given, else ~/.claude, else the `claude/` copy in the checkout. */
function claudeRoot(given, policiesPath) {
  if (given) return path.resolve(given);
  const home = path.join(os.homedir(), '.claude');
  if (fs.existsSync(home)) return home;
  if (policiesPath && fs.existsSync(path.join(policiesPath, 'claude'))) return path.join(policiesPath, 'claude');
  return home;
}

// ------------------------------------------------------------------------- the file layer

/**
 * Reads through an overlay of pending writes, so a whole --write is worked out before any file is
 * touched and nothing is written when there is a finding.
 */
class Files {
  constructor() { this.overlay = new Map(); this.cache = new Map(); }
  key(p) { return path.resolve(p); }
  exists(p) { return this.overlay.has(this.key(p)) || fs.existsSync(p); }
  isFile(p) {
    if (this.overlay.has(this.key(p))) return true;
    try { return fs.statSync(p).isFile(); } catch (e) { return false; }
  }
  read(p) {
    const k = this.key(p);
    if (this.overlay.has(k)) return this.overlay.get(k);
    if (!this.cache.has(k)) this.cache.set(k, fs.readFileSync(p, 'utf8'));
    return this.cache.get(k);
  }
  list(dir) {
    const k = this.key(dir);
    const names = new Set(fs.existsSync(dir) ? fs.readdirSync(dir) : []);
    for (const p of this.overlay.keys()) if (path.dirname(p) === k) names.add(path.basename(p));
    return [...names];
  }
  write(p, text) {
    const k = this.key(p);
    const before = this.overlay.has(k) ? this.overlay.get(k) : (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
    if (before === text) return false;
    this.overlay.set(k, text);
    return true;
  }
  changed() { return [...this.overlay.keys()]; }
  flush() {
    for (const [p, t] of this.overlay) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); }
    this.overlay.clear(); this.cache.clear();
  }
}

// ------------------------------------------------------------------- the registers: R-1010 (The checker)

/**
 * Validates the shape of a register (registers/schema.md). The key names are the draft's.
 * @param {object} reg the parsed register
 * @param {string} where its path, for the findings
 * @param {string[]} letters the roots this register may hold
 * @returns {string[]} findings
 */
function checkRegisterShape(reg, where, letters) {
  const f = [];
  const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (typeof reg.index !== 'string') f.push(`${where}: "index" needs the path of the generated index`);
  if (!obj(reg.roots)) f.push(`${where}: "roots" needs an object of root letter to its part`);
  else for (const [r, part] of Object.entries(reg.roots)) {
    if (!letters.includes(r)) { f.push(`${where}: root ${r} does not belong in this register (${letters.join(', ')})`); continue; }
    if (!obj(part)) { f.push(`${where}: root ${r} needs an object`); continue; }
    if (part.main !== ROOT_MAIN[r]) f.push(`${where}: root ${r}'s main file is ${ROOT_MAIN[r]} (Structure.md, \`id\`), the register says ${part.main}`);
    if (part.ownSections !== CORE_SEGMENT) f.push(`${where}: root ${r}'s ownSections is C, the Core segment (Structure.md, \`code\`)`);
    for (const k of ['listed', 'files', 'folders']) if (part[k] !== undefined && !obj(part[k])) f.push(`${where}: root ${r}'s "${k}" needs an object keyed by path`);
    for (const [p, e] of Object.entries(part.listed || {})) {
      if (!obj(e)) { f.push(`${where}: listed ${p} needs an object`); continue; }
      if (e.id !== null && parseId(e.id)?.tier !== TIER_OF.file) f.push(`${where}: listed ${p} takes a 3-digit id (Structure.md, \`code\`), has ${JSON.stringify(e.id)}`);
      if (e.pointerMark !== undefined && !(Number.isInteger(e.pointerMark) && e.pointerMark >= 0)) f.push(`${where}: listed ${p}'s pointerMark needs a whole number (Structure.md, Pointer rules)`);
    }
  }
  // the organization repository's register gives the repository's own address, R-1008 (Pointers)
  if (letters.includes('S') && !parseGithubAddress(reg.url)) f.push(`${where}: "url" needs the organization repository's address, https://github.com/<owner>/<repo>/blob/<branch>/ (Structure.md, Pointers)`);
  for (const [name, repo] of Object.entries((reg.repositories && typeof reg.repositories === 'object') ? reg.repositories : {})) {
    if (repo && repo.url !== undefined && !parseGithubAddress(repo.url)) f.push(`${where}: repositories.${name}.url needs a GitHub repository address`);
  }
  if (reg.notConverted !== undefined && !Array.isArray(reg.notConverted)) f.push(`${where}: "notConverted" needs a list of paths`);
  if (reg.repositories !== undefined && !obj(reg.repositories)) f.push(`${where}: "repositories" needs an object`);
  if (!obj(reg.ids) || !obj(reg.ids.marks) || !Array.isArray(reg.ids.retired)) f.push(`${where}: "ids" needs "marks" (per tier) and "retired" (a list)`);
  else {
    for (const [t, v] of Object.entries(reg.ids.marks)) if (!/^[1-5]$/.test(t) || !Number.isInteger(v) || v < 0) f.push(`${where}: ids.marks.${t} needs a whole number, tiers 1 to 5`);
    for (const r of reg.ids.retired) if (!obj(r) || !parseId(r.id) || !(r.by === null || parseId(r.by))) f.push(`${where}: a retired entry reads { "id": <old>, "by": <new or null> }, found ${JSON.stringify(r)}`);
  }
  return f;
}

function toPosix(p) { return p.split(path.sep).join('/'); }

/**
 * Builds the system from both registers: the roots, their folders, files and listed items with
 * their generated codes, every read file and every item with an id. It reports what it meets
 * while building (missing files, register shape, segments) and leaves the rest of the checking
 * to the checker; the fetch script uses the same build to find an id.
 * @param {{policies:string, claude:string, standing:(string|null), files:Files, env?:object}} o
 * @returns {object} the system: places, roots, fileEntries, folders, listed, items (Map id ->
 *   item), lines (for the part marks), findings, notChecked, notes
 */
function buildSystem(o) {
  const files = o.files;
  const env = o.env || process.env;
  const findings = [];
  const notes = [];
  const notChecked = [];
  const places = [];
  const addPlace = (key, base, registerPath, letters) => {
    if (!files.exists(registerPath)) { findings.push(`${registerPath}: the register does not exist`); return; }
    const text = files.read(registerPath);
    let reg;
    try { reg = JSON.parse(text); } catch (e) { findings.push(`${registerPath}: the register does not parse: ${e.message}`); return; }
    const shape = checkRegisterShape(reg, registerPath, letters);
    findings.push(...shape);
    if (shape.length) return;
    places.push({ key, base, registerPath, register: reg, registerText: text, list: places.length, form: key === 'G' ? FORM.visible : FORM.comment });
  };
  addPlace('SPD', o.policies, path.join(o.policies, 'rule-files.json'), ['S', 'P', 'D']);
  addPlace('G', o.claude, path.join(o.claude, 'admin-team', 'rule-files.json'), ['G']);

  const roots = {};
  const fileEntries = [];
  const folders = [];
  const listed = [];
  const addresses = [];
  const byAbs = new Map();
  const where = (e) => `${e.repo ? `${e.repo}:` : ''}${e.rel}`;

  for (const place of places) {
    const reg = place.register;
    const notConverted = new Set(reg.notConverted || []);
    const coreless = new Set(); // registered files left out with a folder that has no core file
    for (const [letter, part] of Object.entries(reg.roots)) {
      const root = { letter, place, base: place.base, part, code: letter, level: 1, form: letter === 'G' ? FORM.visible : FORM.comment, children: [] };
      roots[letter] = root;
      // folders, shallow first, each under its nearest registered ancestor
      const fpaths = Object.keys(part.folders || {}).sort((a, b) => a.split('/').length - b.split('/').length);
      const myFolders = [];
      for (const fp of fpaths) {
        const parent = nearest(myFolders, fp) || root;
        const seg = part.folders[fp].segment;
        const folder = { kind: 'folder', root, place, rel: fp, abs: path.join(place.base, fp), segment: seg, parent, code: `${parent.code}-${seg}`, level: parent.level + 1, children: [], order: Object.keys(part.folders).indexOf(fp) };
        if (folders.some(x => path.resolve(x.abs) === path.resolve(folder.abs))) findings.push(`${place.registerPath}: folder ${fp} is registered twice`);
        parent.children.push(folder);
        myFolders.push(folder);
        folders.push(folder);
      }
      myFolders.sort((a, b) => a.order - b.order);
      root.folders = myFolders;
      const mainEntry = { kind: 'file', role: 'main', root, place, rel: part.main, abs: path.join(place.base, part.main), code: letter, level: 1, sections: ((part.files || {})[part.main] || {}).sections || {}, converted: !notConverted.has(part.main), registerKey: part.main };
      fileEntries.push(mainEntry);
      root.main = mainEntry;
      // each folder's core file, by the list: R-1001 (Files and folders)
      for (const folder of myFolders) {
        if (!files.exists(folder.abs)) { findings.push(`${where(folder)}: the registered folder does not exist`); continue; }
        const found = coreFileOf(folder.abs, files);
        const idx = found.file;
        if (!idx && found.ruleFiles.length > 1) {
          findings.push(`${where(folder)}: the folder has no index file by name (${INDEX_NAMES.join(', ')}) and holds ${found.ruleFiles.length} rule files (${found.ruleFiles.map(p => path.basename(p)).join(', ')}); a folder with more than one rule file needs a core file by name (Structure.md, Files and folders)`);
          continue;
        }
        if (!idx) { findings.push(`${where(folder)}: the folder has no index file (one of ${INDEX_NAMES.join(', ')}) and no rule file to take as its core file (Structure.md, Files and folders)`); continue; }
        folder.coreBy = found.by;
        const rel = toPosix(path.relative(place.base, idx));
        const entry = (part.files || {})[rel] || {};
        if (entry.segment !== undefined) findings.push(`${place.registerPath}: ${rel} is the core file of ${folder.rel} and shares its code (Structure.md, Files and folders); it takes no segment of its own`);
        const core = { kind: 'file', role: 'core', root, place, rel, abs: idx, folder, code: folder.code, level: folder.level, sections: entry.sections || {}, converted: !notConverted.has(rel), registerKey: rel };
        folder.core = core;
        fileEntries.push(core);
      }
      for (const [fp, fe] of Object.entries(part.files || {})) {
        if (fp === part.main || fileEntries.some(e => e.place === place && e.rel === fp)) continue;
        const inCoreless = myFolders.some(fd => fd.core === undefined && toPosix(path.dirname(fp)) === fd.rel);
        if (inCoreless && INDEX_NAMES.includes(path.basename(fp))) {
          findings.push(`${place.registerPath}: ${fp} is named like an index file of a folder whose index file was not found`);
        }
        // a file with no segment in a folder whose core file was not found stood as that core file:
        // the folder's finding covers it
        if (inCoreless && fe.segment === undefined) { coreless.add(fp); continue; }
        const parent = nearest(myFolders, fp) || root;
        const entry = { kind: 'file', role: 'file', root, place, rel: fp, abs: path.join(place.base, fp), segment: fe.segment, parent, code: `${parent.code}-${fe.segment}`, level: parent.level + 1, sections: fe.sections || {}, converted: !notConverted.has(fp), registerKey: fp };
        parent.children.push(entry);
        fileEntries.push(entry);
      }
      for (const [lp, le] of Object.entries(part.listed || {})) {
        const parent = nearest(myFolders, lp) || root;
        // a listed item has no line: its pointerMark stands on its register entry, R-1006 (Pointer rules)
        const entry = { kind: 'listed', root, place, rel: lp, abs: path.join(place.base, lp), segment: le.segment, parent, code: `${parent.code}-${le.segment}`, level: parent.level + 1, id: le.id, pointerMark: le.pointerMark, fileName: path.basename(lp) };
        parent.children.push(entry);
        listed.push(entry);
        const isIndex = path.resolve(entry.abs) === path.resolve(path.dirname(place.registerPath), reg.index);
        if (!isIndex && !files.exists(entry.abs)) findings.push(`${where(entry)}: the listed file does not exist (Structure.md, \`code\`)`);
      }
    }
    // the repositories' addresses, for a full GitHub address in a link: R-1008 (Pointers)
    if (reg.url) addresses.push({ ...parseGithubAddress(reg.url), base: place.base });
    // files in other repositories, R-1010 (The checker): a sibling folder of the policies checkout
    for (const [name, repo] of Object.entries(reg.repositories || {})) {
      const overrideName = overrideVariable(repo.folder || name);
      const override = readVariable(overrideName, { env, readStored: o.readStored }).value;
      const co = siblingCheckout(o.standing || o.policies, repo.folder || name, override);
      if (repo.url) addresses.push({ ...parseGithubAddress(repo.url), base: co.path });
      for (const [fp, fe] of Object.entries(repo.files || {})) {
        const root = roots[fe.root];
        if (!root) { findings.push(`${place.registerPath}: ${name}:${fp} names root ${fe.root}, which this register does not hold`); continue; }
        const under = fe.under ? root.folders.find(x => x.rel === fe.under) : null;
        if (fe.under && !under) { findings.push(`${place.registerPath}: ${name}:${fp} sits under ${fe.under}, which is not a registered folder of ${fe.root}`); continue; }
        const parent = under || root;
        const entry = { kind: 'file', role: 'file', root, place, repo: name, repoUrl: repo.url || null, rel: fp, abs: path.join(co.path, fp), segment: fe.segment, parent, code: `${parent.code}-${fe.segment}`, level: parent.level + 1, sections: fe.sections || {}, converted: !notConverted.has(`${name}:${fp}`), registerKey: `${name}:${fp}` };
        parent.children.push(entry);
        if (!co.exists) { entry.notChecked = true; notChecked.push({ entry, repo: name, checkout: co.path, variable: overrideName }); }
        fileEntries.push(entry);
      }
    }
    // after every root of the place and its other repositories, so a file of any of them is known
    for (const nc of notConverted) {
      const ncDir = toPosix(path.dirname(nc));
      if (coreless.has(nc) || folders.some(fd => fd.place === place && fd.core === undefined && fd.rel === ncDir)) continue;
      if (!fileEntries.some(e => e.place === place && e.registerKey === nc)) findings.push(`${place.registerPath}: notConverted names ${nc}, which is not a registered file`);
    }
  }
  // G's public copy, under `claude/` in the organization repository: a full address into it, or a
  // relative link that resolves into it, is read as a link into G, R-1008 (Pointers)
  const spdPlace = places.find(p => p.key === 'SPD');
  const gPlace = places.find(p => p.key === 'G');
  if (spdPlace && gPlace && spdPlace.register.url) addresses.push({ ...parseGithubAddress(spdPlace.register.url), base: gPlace.base, prefix: G_COPY });
  const gCopy = spdPlace && gPlace ? { checkout: spdPlace.base, base: gPlace.base } : null;

  // segments: unique among siblings; C reserved at a root's second level: R-1007 (`code`)
  for (const root of Object.values(roots)) {
    const second = root.children.map(c => ({ segment: c.segment, what: `${root.letter}: ${c.rel}` }));
    findings.push(...checkSiblingSegments(second, 2), ...checkCoreReserved(second));
    const own = Object.entries(root.main.sections).map(([h, s]) => ({ segment: s, what: `${root.main.rel} section "${h}"` }));
    findings.push(...checkSiblingSegments(own, 3));
    for (const folder of root.folders) {
      const sibs = folder.children.map(c => ({ segment: c.segment, what: `${folder.rel}: ${c.rel}` }));
      if (folder.core) for (const [h, s] of Object.entries(folder.core.sections)) sibs.push({ segment: s, what: `${folder.core.rel} section "${h}"` });
      findings.push(...checkSiblingSegments(sibs, folder.level + 1));
    }
    for (const e of fileEntries.filter(x => x.root === root && x.role === 'file')) {
      findings.push(...checkSiblingSegments(Object.entries(e.sections).map(([h, s]) => ({ segment: s, what: `${where(e)} section "${h}"` })), e.level + 1));
    }
  }

  // read every file and make its items
  const items = new Map();
  const all = []; // every item with an id, a second holder of one id included, for the record
  const dupStrings = [];
  const lineRecords = [];
  const addItem = (it) => {
    const k = idKey(it.id);
    all.push(it);
    if (items.has(k)) {
      const p = parseId(it.id);
      if (p && p.kind !== 'tiered') dupStrings.push(`id ${k} is used twice: ${items.get(k).where} and ${it.where}`);
      return;
    }
    items.set(k, it);
  };
  for (const e of fileEntries) {
    byAbs.set(path.resolve(e.abs), e);
    if (e.notChecked) continue;
    if (!files.exists(e.abs)) { findings.push(`${where(e)}: the registered file does not exist`); e.missing = true; continue; }
    const read = readFile(files.read(e.abs), e.root.form);
    e.read = read;
    for (const f of read.findings) findings.push(`${where(e)}:${f.replace(/^line /, '')}`);
    const title = read.items.find(it => it.level === 1);
    if (!title) { findings.push(`${where(e)}: the file has no # title (Structure.md, Files and folders)`); continue; }
    e.title = title;
    for (const extra of read.items.filter(it => it.level === 1 && it !== title && it.json)) findings.push(`${where(e)}:${extra.jsonLine}: a JSON line under a second # heading`);
    const kind = e.role === 'main' ? 'main' : e.role === 'core' ? 'folder' : 'file';
    const titleItem = { kind, entry: e, item: title, heading: title.heading, where: `${where(e)}:${title.line}`, expectedCode: e.code, tier: titleTier(e.role), read };
    if (kind === 'folder') titleItem.folder = e.folder;
    e.titleItem = titleItem;
    if (title.json) {
      titleItem.id = title.json.id;
      addItem(titleItem);
    } else findings.push(`${where(e)}:${title.line}: the # title has no JSON line (Structure.md, Files and folders)`);
    if (!e.converted) continue;
    const classes = classifySections(read);
    e.classes = classes;
    for (const c of classes) {
      for (const f of c.findings) findings.push(`${where(e)}:${f.replace(/^line /, '')}`);
      const s = c.item;
      if (!s.json) continue;
      const seg = e.sections[s.heading];
      const fileCode = e.code;
      const sec = { kind: c.kind === 'pointer' ? 'pointer' : 'section', entry: e, item: s, heading: s.heading, id: s.json.id, where: `${where(e)}:${s.line}`, read, sectionKind: c.kind };
      if (c.kind === 'pointer') {
        sec.expectedCode = `${fileCode}-${idKey(s.json.id)}`;
        if (seg !== undefined) findings.push(`${where(e)}:${s.line}: the section is a pointer rule, which takes no letter (Structure.md, \`code\`); the register gives it "${seg}"`);
      } else if (seg === undefined) {
        findings.push(`${where(e)}:${s.line}: the register gives section "${s.heading}" no segment`);
      } else {
        sec.expectedCode = e.role === 'main' ? `${fileCode}-${CORE_SEGMENT}-${seg}` : `${fileCode}-${seg}`;
      }
      addItem(sec);
      const positional = c.rules.filter(r => parseId(r.json.id)?.kind === 'tiered');
      for (const r of c.rules) {
        const p = parseId(r.json.id);
        const rule = { kind: p && p.kind === 'pointer' ? 'pointer' : 'rule', entry: e, item: r, heading: r.heading, id: r.json.id, where: `${where(e)}:${r.line}`, read, section: sec };
        if (rule.kind === 'pointer') rule.expectedCode = `${fileCode}-${idKey(r.json.id)}`;
        // a numbered rule takes its position even when it is the only one; a pointer rule takes
        // none, and the positions count the other rules: R-1007 (`code`)
        else if (sec.expectedCode) rule.expectedCode = `${sec.expectedCode}-${positional.indexOf(r) + 1}`;
        addItem(rule);
      }
      const splinterPos = new Map();
      for (const sp of c.splinters) {
        const parentKey = idKey(sp.parentItem.json.id);
        const n = (splinterPos.get(parentKey) || 0) + 1;
        splinterPos.set(parentKey, n);
        addItem({ kind: 'splinter', entry: e, item: sp, heading: sp.heading, id: sp.json.id, where: `${where(e)}:${sp.line}`, read, parentKey, position: n, section: sec });
      }
    }
    const known = new Set(Object.keys(e.sections));
    for (const h of known) if (!classes.some(c => c.item.heading === h)) findings.push(`${where(e)}: the register gives a segment to section "${h}", which the file does not have`);
  }
  // splinters' codes follow their parents' (a parent may itself be a splinter)
  const splinterCode = (it, depth = 0) => {
    if (it.kind !== 'splinter') return it.expectedCode;
    if (depth > 20) return undefined;
    const parent = items.get(it.parentKey);
    const pc = parent && splinterCode(parent, depth + 1);
    return pc ? `${pc}-${it.position}` : undefined;
  };
  for (const it of items.values()) if (it.kind === 'splinter') it.expectedCode = splinterCode(it);
  // listed items have ids in the register and no line: R-1007 (`code`)
  for (const l of listed) {
    const it = { kind: 'listed', entry: l, heading: l.fileName, id: l.id, where: `${l.place.registerPath} (listed ${l.rel})`, expectedCode: l.code, fileName: l.fileName, listed: l };
    l.item = it;
    if (l.id !== null && l.id !== undefined) addItem(it);
  }
  for (const it of all) {
    const j = it.item && it.item.json;
    const pointerMark = it.kind === 'listed' ? it.listed.pointerMark : j ? j.pointerMark : undefined;
    lineRecords.push({ id: it.id, splinterMark: j ? j.splinterMark : undefined, pointerMark, where: it.where, it });
  }
  findings.push(...dupStrings);
  return { places, roots, fileEntries, folders, listed, items, all, lineRecords, findings, notes, notChecked, byAbs, files, where, addresses, gCopy };
}

function nearest(folders, rel) {
  let best = null;
  for (const f of folders) {
    if (rel.startsWith(`${f.rel}/`) && rel !== f.rel && (!best || f.rel.length > best.rel.length)) best = f;
  }
  return best;
}

/** The place where an item's text lives, for messages: the root, the file and the heading. */
function describe(it) {
  const e = it.entry;
  const file = `${e.repo ? `${e.repo}:` : ''}${e.rel}`;
  if (it.kind === 'listed') return `${e.root.letter} ${file} (listed, ${it.expectedCode})`;
  const hashes = it.item ? '#'.repeat(it.item.level) : '';
  return `${e.root.letter} ${file}:${it.item.line} ${hashes} ${it.heading} (${it.expectedCode || it.item.json?.code || 'no code'})`;
}

// ------------------------------------------------------------- what the fetch script prints

/** 0-based indexes of the JSON lines under headings; a JSON-like line in a fenced example is not one. */
function jsonLineIndexes(read) {
  return new Set(read.items.filter(it => it.jsonLine).map(it => it.jsonLine - 1));
}

/** A rule or a section: its heading and text, without the JSON lines, R-1011 (The fetch script). */
function printItem(read, item) {
  const strip = jsonLineIndexes(read);
  const out = [read.lines[item.line - 1]];
  for (let i = item.bodyStart; i < item.bodyEnd; i++) {
    if (strip.has(i)) continue;
    out.push(read.lines[i]);
  }
  return trimBlankEnds(out).join('\n');
}

/**
 * A file whole, the JSON lines stripped, R-1011 (The fetch script). A folder prints as its index
 * file. Front matter is stripped too unless asked to keep it.
 */
function printFile(read, opts = {}) {
  const strip = jsonLineIndexes(read);
  const from = opts.keepFrontMatter ? 0 : (read.frontMatterEnd || 0);
  return trimBlankEnds(read.lines.filter((l, i) => i >= from && !strip.has(i))).join('\n');
}

function trimBlankEnds(a) {
  let s = 0, e = a.length;
  while (s < e && !a[s].trim()) s++;
  while (e > s && !a[e - 1].trim()) e--;
  return a.slice(s, e);
}

/**
 * The search across the record, R-1011 (The fetch script): an id in use, where it is; a retired id, that it is
 * retired and what replaced it; null when nobody holds it.
 * @param {string|number} id
 * @param {Map<string,string>} where id -> "root file heading"
 * @param {Map<string,(number|string|null)>} retired id -> replacement
 */
function locate(id, where, retired) {
  const key = idKey(id);
  if (where.has(key)) return { state: 'in use', where: where.get(key) };
  if (retired.has(key)) return { state: 'retired', by: retired.get(key) };
  return null;
}

// ------------------------------------------------------------- the old-to-new table: R-1009 (The indexes)

const TABLE_HEADING = '## The old-to-new table';
const TABLE_HEAD = ['| Old id | New id | New code | Heading at the renumbering |', '|--------|--------|----------|----------------------------|'];

/**
 * Reads the old-to-new table from G's index, R-1009 (The indexes): the rows `| <old> | <new> | <code> | <heading> |`
 * under TABLE_HEADING. The table is written once, by the renumbering, and carried from one
 * generated index to the next as its rows, so nothing else in the file is carried with it.
 * @returns {{rows:Array<{old:string, now:string, code:string, heading:string}>, text:(string|null)}}
 *   text is the table rendered again from its rows, null when the index holds none
 */
function readOldTable(indexText) {
  if (!indexText) return { rows: [], text: null };
  const lines = indexText.split(/\r?\n/);
  const at = lines.indexOf(TABLE_HEADING);
  if (at === -1) return { rows: [], text: null };
  const rows = [];
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{1,6} /.test(l)) break;
    const m = /^\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)\|\s*$/.exec(l);
    if (!m) continue;
    const cells = [m[1], m[2], m[3], m[4]].map(s => s.trim());
    if (/^-+$/.test(cells[0]) || cells[0] === 'Old id') continue;
    rows.push({ old: cells[0].replace(/^R-/, ''), now: cells[1].replace(/^R-/, ''), code: cells[2], heading: cells[3] });
  }
  return { rows, text: renderOldTable(rows) };
}

/** The old-to-new table as G's index carries it. */
function renderOldTable(rows) {
  return [TABLE_HEADING, '', 'Each id of the numbering before the tiers, and the id that took its place.', '',
    ...TABLE_HEAD, ...rows.map(r => `| ${r.old} | ${r.now} | ${r.code || ''} | ${r.heading || ''} |`)].join('\n');
}

module.exports = {
  TIER_START, TIER_END, TIER_OF, TIER_WORD, FORM, LINE_KEYS,
  parseId, idKey, baseId, readJsonLine, formatJsonLine, codeSpans, readFile, classifySections, titleTier,
  githubSlug, makeSlugger,
  MAIN_FILES, ROOT_MAIN, CORE_SEGMENT, pointerRuleCode, ownSectionSegment, sectionCode, checkCoreReserved,
  checkSiblingSegments,
  checkRecord, checkPartMarks, findPointers, findLinks, findQuoted, expectedName, linkMatches,
  readVariable, readStoredUserValue, POLICIES_VARIABLE, overrideVariable, siblingCheckout, claudeRoot,
  INDEX_NAMES, indexFileOf, countsForLastStep, coreFileOf, parseGithubAddress, githubTarget, G_COPY, gCopyTarget,
  Files, checkRegisterShape, buildSystem, describe, toPosix,
  printItem, printFile, locate, readOldTable, renderOldTable, TABLE_HEADING,
};
