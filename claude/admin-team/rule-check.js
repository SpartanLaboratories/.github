#!/usr/bin/env node
// Checks the rule files listed in rule-files.json and keeps the rule index.
//
//   node rule-check.js           check; exit 1 on any finding, a stale index, a
//                                stale code and a stale high-water mark included
//   node rule-check.js --write   check, then correct the codes in the rule files,
//                                raise the high-water mark and rewrite the index;
//                                any finding leaves every file as it is
//
// A rule is a Markdown heading whose next line is a JSON line
//   {"name":"<the heading's text>","code":"A-DM-A-1","id":5}
// with the body starting on the line after. Sections are the `##` headings; a
// `##` heading with a JSON line is a section that is one rule. Pointers read
// `R-<id> (Name)`.
//
// `id` is permanent. Every number from 1 to the highest in use is either in use
// or in `retiredIds`, so a new id can only be above `highWaterMark`.
//
// A splinter is a part of a rule that needs pointing at. Its `id` is a string of
// parent and part, "26-1", its pointer reads `R-26-1 (Name)`, and its parent must
// be a rule. Parts are permanent like ids: every part from 1 to the highest used
// is in use or in `retiredIds` as "26-1", and `splinterMarks` keeps each parent's
// highest part, so a new part can only be above it.
//
// A pointer rule is a rule whose whole body points at one other rule, its target.
// Its `id` is a string of target and part, "28-1", like a splinter's, and the two
// share the target's parts: a part is one or the other, never both, so the
// retired list and the marks above hold both. A rule with a string id is a
// splinter when it sits in its parent's section and a pointer rule anywhere else;
// a pointer rule's body is one paragraph whose only pointer is to its target.
//
// `code` follows the rule's location and is never written by hand: the kind
// letter from the file's path, the file's acronym and the section's letter from
// the `codes` table in rule-files.json, then the rule's position in its section,
// which a section holding a single rule leaves out. A splinter's code is its
// parent's plus `-<n>`, its position among that parent's splinters; a pointer
// rule's code follows its own location, as a plain rule's does.
//
// Paths in the config are relative to the directory above this script.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(__dirname, 'rule-files.json');

const HEADING = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const JSON_LINE = /^\{\s*"name"\s*:/;
const SPLINTER_ID = /^([1-9]\d*)-([1-9]\d*)$/;
const KINDS = 'A agent, S skill, N nomenclature, G global, O organization, R repo';

/** GitHub's heading anchor, without the per-file de-duplication suffix. */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

/** A line's blank of the same length, so masked and raw text keep one set of offsets. */
function blank(line) {
  return ' '.repeat(line.length);
}

/** The offsets of a line's inline code spans, as [start, end) pairs. */
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

/** Splits a file into its lines, its rules, its section order and the text pointers are read from. */
function parse(file, relPath, findings) {
  const lines = file.split('\n');
  const rules = [];
  const sections = [];
  const seenAnchors = new Map();
  const headings = [];
  let section = null;
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end !== -1) start = end + 1;
  }
  const masked = lines.slice(); // code spans, fences and JSON lines hidden from the pointer scan
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i < start) continue;
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      masked[i] = blank(line);
      continue;
    }
    if (fence) { masked[i] = blank(line); continue; }

    const headingMatch = line.match(HEADING);
    if (headingMatch) {
      headings.push(i);
      const text = headingMatch[2];
      const base = slug(text);
      const count = seenAnchors.get(base) || 0;
      seenAnchors.set(base, count + 1);
      const anchor = count === 0 ? base : `${base}-${count}`;
      if (headingMatch[1].length === 2) {
        section = text;
        sections.push(text);
      }
      const next = lines[i + 1];
      if (next !== undefined && JSON_LINE.test(next)) {
        const heading = i + 1;
        i += 1; // the JSON line belongs to this heading; the loop moves past it
        masked[i] = blank(next);
        let meta;
        try { meta = JSON.parse(next); } catch (e) {
          findings.push(`${relPath}:${i + 1}: malformed JSON line`);
          continue;
        }
        const splinter = typeof meta.id === 'string' ? SPLINTER_ID.exec(meta.id) : null;
        const wholeId = Number.isSafeInteger(meta.id) && meta.id >= 1;
        if (Object.keys(meta).join() !== 'name,code,id' || typeof meta.name !== 'string'
          || typeof meta.code !== 'string' || !(wholeId || splinter)) {
          findings.push(`${relPath}:${i + 1}: JSON line needs a string name, a string code and a plain whole-number id or a "<parent>-<part>" splinter or pointer-rule id, in that order`);
          continue;
        }
        if (meta.name !== text) {
          findings.push(`${relPath}:${i + 1}: JSON name "${meta.name}" differs from its heading "${text}"`);
        }
        rules.push({
          id: meta.id,
          ref: `R-${meta.id}`,
          parent: splinter ? Number(splinter[1]) : null,
          part: splinter ? Number(splinter[2]) : null,
          kind: splinter ? null : 'rule', // a string id is a splinter or a pointer rule, told apart in classifyParts
          name: meta.name,
          code: meta.code,
          anchor,
          file: relPath,
          line: heading,
          jsonIndex: i,
          section,
        });
      }
      continue;
    }
    if (JSON_LINE.test(line)) {
      findings.push(`${relPath}:${i + 1}: JSON line not directly under a heading`);
      masked[i] = blank(line);
      continue;
    }
    let chars = null;
    for (const [from, to] of codeSpans(line)) {
      chars = chars || masked[i].split('');
      chars.fill(' ', from, to);
    }
    if (chars) masked[i] = chars.join('');
  }
  for (const rule of rules) {
    const next = headings.find((index) => index > rule.jsonIndex);
    rule.bodyEnd = next === undefined ? lines.length : next; // the body runs from jsonIndex + 1 to here
  }
  return { lines, masked, rules, sections };
}

/** Reads every pointer `R-142 (Name)` or `R-142-1 (Name)` in a file and checks it against the known rules. */
function checkPointers(relPath, lines, masked, known, findings) {
  const raw = lines.join('\n');
  const text = masked.join('\n');
  // The lookbehind keeps a code ending in section letter R and a number, A-DM-R-1, from reading as a pointer.
  const pointer = /(?<![\w-])R-\d+(?:-\d+)?\b/g;
  let match;
  while ((match = pointer.exec(text)) !== null) {
    const id = match[0];
    const line = raw.slice(0, match.index).split('\n').length;
    const at = match.index + id.length;
    const rule = known.get(id);
    if (!rule) {
      findings.push(`${relPath}:${line}: pointer to unknown id ${id}`);
      continue;
    }
    const open = /^\s*\(/.exec(raw.slice(at));
    if (!open) {
      findings.push(`${relPath}:${line}: pointer ${id} has no name, expected "${id} (${rule.name})"`);
      continue;
    }
    let depth = 0;
    let end = -1;
    for (let i = at + open[0].length - 1; i < raw.length; i += 1) {
      if (raw[i] === '(') depth += 1;
      else if (raw[i] === ')') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) {
      findings.push(`${relPath}:${line}: pointer ${id} has an unclosed name`);
      continue;
    }
    const name = raw.slice(at + open[0].length, end).replace(/\s+/g, ' ').trim();
    if (name !== rule.name) {
      findings.push(`${relPath}:${line}: pointer ${id} names "${name}", the rule is "${rule.name}"`);
    }
  }
}

/** The leading letter of a file's codes, from where it lives; null for a file of none of the six kinds. */
function kindLetter(relPath) {
  if (relPath === 'CLAUDE.md' || relPath === 'Structure-Policy.md' || /^shared\//.test(relPath)) return 'G';
  if (/^agents\/[^/]+\.md$/.test(relPath)) return 'A';
  if (/^skills\//.test(relPath)) return 'S';
  if (/^nomenclature\//.test(relPath)) return 'N';
  return null; // O and R name files outside this root, which no path here can show
}

/** Works out each rule's code from where it sits. A gap in the table is a finding; no code is guessed. */
function assignCodes(relPath, rules, sections, table, findings) {
  const kind = kindLetter(relPath);
  if (!kind) findings.push(`${relPath}: file kind is none of ${KINDS}; put it to the user`);
  const acronym = table && table.acronym;
  const goodAcronym = typeof acronym === 'string' && /^[A-Z]+$/.test(acronym);
  if (!goodAcronym) findings.push(`${relPath}: needs an acronym in the codes table of rule-files.json`);

  const letters = new Map(Object.entries((table && table.sections) || {}));
  const owner = new Map();
  for (const [name, letter] of letters) {
    if (typeof letter !== 'string' || !/^[A-Z]$/.test(letter)) {
      findings.push(`${relPath}: section "${name}" needs a single capital letter, has "${letter}"`);
    } else if (owner.has(letter)) {
      findings.push(`${relPath}: sections "${owner.get(letter)}" and "${name}" both map to letter ${letter}`);
    } else {
      owner.set(letter, name);
    }
  }
  sections.forEach((name, i) => {
    if (sections.indexOf(name) !== i) findings.push(`${relPath}: section "${name}" appears twice, two sections map to one letter`);
  });

  const groups = new Map();
  for (const rule of rules) {
    if (!rule.section) {
      findings.push(`${rule.file}:${rule.line}: rule outside any section has no code`);
      continue;
    }
    if (rule.kind !== 'rule' && rule.kind !== 'pointer') continue; // a splinter takes its parent's code, in assignSplinterCodes
    if (!groups.has(rule.section)) groups.set(rule.section, []);
    groups.get(rule.section).push(rule);
  }
  for (const [name, group] of groups) {
    const letter = letters.get(name);
    if (!letter) {
      findings.push(`${relPath}: section "${name}" has no letter in the codes table of rule-files.json`);
      continue;
    }
    if (!kind || !goodAcronym) continue;
    group.forEach((rule, i) => {
      rule.expected = `${kind}-${acronym}-${letter}${group.length === 1 ? '' : `-${i + 1}`}`;
    });
  }
}

/**
 * Tells each string id's rule a splinter, in its parent's section, or a pointer rule, anywhere else, and
 * checks a pointer rule's body: one paragraph whose only pointer is to its target. The target must be a rule.
 */
function classifyParts(parsed, known, findings) {
  const pointer = /(?<![\w-])R-\d+(?:-\d+)?\b/g;
  for (const { masked, rules } of parsed) {
    for (const rule of rules) {
      if (rule.part === null) continue;
      const parent = known.get(`R-${rule.parent}`);
      if (!parent) {
        findings.push(`${rule.file}:${rule.line}: ${rule.ref} has no parent or target, R-${rule.parent} is not a rule in any listed file`);
        continue;
      }
      if (parent.file === rule.file && parent.section === rule.section) {
        rule.kind = 'splinter';
        continue;
      }
      rule.kind = 'pointer';
      const body = masked.slice(rule.jsonIndex + 1, rule.bodyEnd);
      const filled = body.map((line, i) => (line.trim() === '' ? -1 : i)).filter((i) => i !== -1);
      if (filled.length === 0) {
        findings.push(`${rule.file}:${rule.line}: pointer rule ${rule.ref} has an empty body, expected a pointer to R-${rule.parent}`);
        continue;
      }
      if (filled[filled.length - 1] - filled[0] + 1 !== filled.length) {
        findings.push(`${rule.file}:${rule.line}: pointer rule ${rule.ref} has a body of more than one paragraph; its whole body points at R-${rule.parent}`);
      }
      const targets = body.join('\n').match(pointer) || [];
      if (targets.length !== 1 || targets[0] !== `R-${rule.parent}`) {
        findings.push(`${rule.file}:${rule.line}: pointer rule ${rule.ref} points at ${targets.length === 0 ? 'no rule' : targets.join(', ')}; its body points at R-${rule.parent} and at no other rule`);
      }
    }
  }
}

/** Gives each splinter its parent's code plus its position among the parent's splinters. */
function assignSplinterCodes(parsed, known) {
  const positions = new Map();
  for (const { rules } of parsed) {
    for (const rule of rules) {
      if (rule.kind !== 'splinter') continue;
      const parent = known.get(`R-${rule.parent}`);
      const position = (positions.get(rule.parent) || 0) + 1;
      positions.set(rule.parent, position);
      if (parent.expected !== undefined) rule.expected = `${parent.expected}-${position}`;
    }
  }
}

/** Checks every parent's parts against the retired list and its mark, and returns the marks they should read. */
function checkParts(parsed, retired, marks, findings) {
  const used = new Map();
  const gone = new Map();
  const note = (map, parent, part) => {
    if (!map.has(parent)) map.set(parent, new Set());
    map.get(parent).add(part);
  };
  for (const { rules } of parsed) {
    for (const rule of rules) {
      if (rule.part !== null) note(used, rule.parent, rule.part);
    }
  }
  for (const id of retired) {
    const splinter = typeof id === 'string' ? SPLINTER_ID.exec(id) : null;
    if (splinter) note(gone, Number(splinter[1]), Number(splinter[2]));
  }
  const next = { ...marks };
  const parents = new Set([...used.keys(), ...gone.keys(), ...Object.keys(marks).map(Number)]);
  for (const parent of parents) {
    const inUse = used.get(parent) || new Set();
    const retiredParts = gone.get(parent) || new Set();
    const top = Math.max(0, ...inUse, ...retiredParts);
    const mark = marks[parent] || 0;
    for (let part = 1; part <= Math.max(top, mark); part += 1) {
      if (!inUse.has(part) && !retiredParts.has(part)) {
        findings.push(`admin-team/rule-files.json: part R-${parent}-${part}, a splinter or a pointer rule, is neither in use nor retired`);
      }
    }
    if (top > mark) next[parent] = top;
  }
  return next;
}

/** The index text for the parsed files, in config order. */
function renderIndex(parsed, indexPath) {
  const out = [
    '# Rule index',
    '',
    'Generated by `admin-team/rule-check.js` from the rule files in `admin-team/rule-files.json`; do not edit by hand.',
    '',
  ];
  const dir = path.dirname(indexPath);
  for (const { relPath, rules, sections } of parsed) {
    const link = path.relative(dir, relPath).split(path.sep).join('/');
    out.push(`## [${relPath}](${link})`, '');
    const groups = sections.map((name) => ({ name, rules: [] }));
    const loose = { name: null, rules: [] };
    for (const rule of rules) {
      (groups.find((group) => group.name === rule.section) || loose).rules.push(rule);
    }
    for (const group of [loose, ...groups]) {
      if (group.rules.length === 0) continue;
      if (group.name) out.push(`### ${group.name}`, '');
      for (const rule of group.rules) {
        out.push(`- [${rule.ref}](${link}#${rule.anchor}) \`${rule.code}\` ${rule.name}`);
      }
      out.push('');
    }
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

function main() {
  const write = process.argv.includes('--write');
  const configText = fs.readFileSync(CONFIG, 'utf8');
  const config = JSON.parse(configText);
  const findings = [];

  const markIsGood = Number.isSafeInteger(config.highWaterMark) && config.highWaterMark >= 0;
  if (!markIsGood) findings.push('admin-team/rule-files.json: highWaterMark needs a whole number');
  const mark = markIsGood ? config.highWaterMark : 0;
  const retiredIsGood = Array.isArray(config.retiredIds)
    && config.retiredIds.every((id) => (Number.isSafeInteger(id) && id > 0)
      || (typeof id === 'string' && SPLINTER_ID.test(id)));
  if (!retiredIsGood) findings.push('admin-team/rule-files.json: retiredIds needs a list of whole numbers and "<parent>-<part>" splinter or pointer-rule ids');
  const retired = new Set(retiredIsGood ? config.retiredIds : []);
  const marksAreGood = config.splinterMarks !== null && typeof config.splinterMarks === 'object'
    && !Array.isArray(config.splinterMarks)
    && Object.entries(config.splinterMarks).every(([parent, top]) => /^[1-9]\d*$/.test(parent)
      && Number.isSafeInteger(top) && top > 0);
  if (!marksAreGood) findings.push('admin-team/rule-files.json: splinterMarks needs an object of parent or target id to highest part');
  const marks = marksAreGood ? config.splinterMarks : {};

  const parsed = [];
  const known = new Map();
  const codes = (config.codes && typeof config.codes === 'object') ? config.codes : {};
  for (const relPath of config.files) {
    const result = parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'), relPath, findings);
    parsed.push({ relPath, ...result });
    for (const rule of result.rules) {
      const previous = known.get(rule.ref);
      if (previous) {
        findings.push(`${rule.file}:${rule.line}: duplicate id ${rule.ref}, also ${previous.file}:${previous.line}; a new id goes above the high-water mark ${mark}`);
      } else {
        known.set(rule.ref, rule);
      }
      if (retired.has(rule.id)) {
        findings.push(`${rule.file}:${rule.line}: id ${rule.ref} is retired and may not reappear`);
      }
    }
  }
  classifyParts(parsed, known, findings);
  for (const { relPath, rules, sections } of parsed) {
    assignCodes(relPath, rules, sections, codes[relPath], findings);
  }
  assignSplinterCodes(parsed, known);
  for (const { relPath, lines, masked } of parsed) {
    checkPointers(relPath, lines, masked, known, findings);
  }

  const inUse = new Set(parsed.flatMap(({ rules }) => rules.filter((rule) => rule.part === null).map((rule) => rule.id)));
  const highest = Math.max(0, ...inUse);
  for (let id = 1; id <= Math.max(mark, highest); id += 1) {
    if (!inUse.has(id) && !retired.has(id)) {
      findings.push(`admin-team/rule-files.json: id R-${id} is neither in use nor retired`);
    }
  }
  const nextMarks = checkParts(parsed, retired, marks, findings);
  const raisedMarks = Object.keys(nextMarks).filter((parent) => nextMarks[parent] !== marks[parent]);

  const stale = [];
  const codeOwners = new Map();
  for (const entry of parsed) {
    for (const rule of entry.rules) {
      if (rule.expected === undefined) continue;
      const other = codeOwners.get(rule.expected);
      if (other) findings.push(`${rule.file}:${rule.line}: code ${rule.expected} is also ${other.file}:${other.line}`);
      else codeOwners.set(rule.expected, rule);
      if (rule.code !== rule.expected) {
        stale.push({ entry, rule, was: rule.code });
        rule.code = rule.expected;
      }
    }
  }

  const expected = renderIndex(parsed, config.index);
  const indexFile = path.join(ROOT, config.index);
  const current = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : null;
  if (write && findings.length === 0) {
    const touched = new Set();
    for (const { entry, rule } of stale) {
      entry.lines[rule.jsonIndex] = JSON.stringify({ name: rule.name, code: rule.code, id: rule.id });
      touched.add(entry);
    }
    for (const entry of touched) {
      fs.writeFileSync(path.join(ROOT, entry.relPath), entry.lines.join('\n'));
    }
    if (stale.length > 0) console.log(`corrected ${stale.length} code(s) in ${touched.size} file(s)`);
    let nextConfig = configText;
    if (highest > mark) {
      nextConfig = nextConfig.replace(/("highWaterMark"\s*:\s*)\d+/, `$1${highest}`);
      console.log(`raised the high-water mark from ${mark} to ${highest}`);
    }
    if (raisedMarks.length > 0) {
      nextConfig = nextConfig.replace(/("splinterMarks"\s*:\s*)\{[^}]*\}/, `$1${JSON.stringify(nextMarks)}`);
      console.log(`raised the splinter marks of ${raisedMarks.map((parent) => `R-${parent}`).join(', ')}`);
    }
    if (nextConfig !== configText) fs.writeFileSync(CONFIG, nextConfig);
    if (current !== expected) fs.writeFileSync(indexFile, expected);
    console.log(`${current === expected ? 'unchanged' : 'wrote'} ${config.index}`);
  } else if (!write) {
    for (const { rule, was } of stale) {
      findings.push(`${rule.file}:${rule.jsonIndex + 1}: stale code "${was}", the location gives "${rule.code}", run with --write`);
    }
    if (highest > mark) findings.push(`admin-team/rule-files.json: high-water mark ${mark} is below id R-${highest}, run with --write`);
    for (const parent of raisedMarks) {
      findings.push(`admin-team/rule-files.json: splinter mark of R-${parent} is below part ${nextMarks[parent]}, run with --write`);
    }
    if (current !== expected) findings.push(`${config.index}: out of date, run with --write`);
  }

  const rules = parsed.reduce((sum, { rules: list }) => sum + list.length, 0);
  if (findings.length > 0) {
    for (const finding of findings) console.log(finding);
    console.log(`FAIL: ${findings.length} finding(s) in ${parsed.length} file(s), ${rules} rule(s)`);
    process.exit(1);
  }
  console.log(`OK: ${parsed.length} file(s), ${rules} rule(s)`);
}

main();
