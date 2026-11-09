#!/usr/bin/env node
// Checks the rule files listed in rule-files.json and keeps the rule index.
//
//   node rule-check.js           check; exit 1 on any finding, the index included
//   node rule-check.js --write   check, then rewrite the index; a file with
//                                findings leaves the index as it is
//
// A rule is a Markdown heading whose next line is a JSON line
//   {"name":"<the heading's text>","id":"R-0001"}
// with the body starting on the line after. Sections are the `##` headings.
// Paths in the config are relative to the directory above this script.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG = path.join(__dirname, 'rule-files.json');

const HEADING = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const ID_FORM = /^R-\d{4,}$/;
const JSON_LINE = /^\{\s*"name"\s*:/;

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
      const text = headingMatch[2];
      const base = slug(text);
      const count = seenAnchors.get(base) || 0;
      seenAnchors.set(base, count + 1);
      const anchor = count === 0 ? base : `${base}-${count}`;
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
        if (typeof meta.name !== 'string' || typeof meta.id !== 'string' || !ID_FORM.test(meta.id)) {
          findings.push(`${relPath}:${i + 1}: JSON line needs a string name and an id like R-0001`);
          continue;
        }
        if (meta.name !== text) {
          findings.push(`${relPath}:${i + 1}: JSON name "${meta.name}" differs from its heading "${text}"`);
        }
        rules.push({ id: meta.id, name: meta.name, anchor, file: relPath, line: heading, section });
      } else if (headingMatch[1].length === 2) {
        section = text;
        sections.push(text);
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
  return { lines, masked, rules, sections };
}

/** Reads every pointer `R-0142 (Name)` in a file and checks it against the known rules. */
function checkPointers(relPath, lines, masked, known, findings) {
  const raw = lines.join('\n');
  const text = masked.join('\n');
  const pointer = /\bR-\d{4,}\b/g;
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
        out.push(`- [${rule.id}](${link}#${rule.anchor}) ${rule.name}`);
      }
      out.push('');
    }
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

function main() {
  const write = process.argv.includes('--write');
  const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const findings = [];
  const parsed = [];
  const known = new Map();
  for (const relPath of config.files) {
    const result = parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'), relPath, findings);
    parsed.push({ relPath, ...result });
    for (const rule of result.rules) {
      const previous = known.get(rule.id);
      if (previous) {
        findings.push(`${rule.file}:${rule.line}: duplicate id ${rule.id}, also ${previous.file}:${previous.line}`);
      } else {
        known.set(rule.id, rule);
      }
    }
  }
  for (const { relPath, lines, masked } of parsed) {
    checkPointers(relPath, lines, masked, known, findings);
  }

  const expected = renderIndex(parsed, config.index);
  const indexFile = path.join(ROOT, config.index);
  const current = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : null;
  if (write && findings.length === 0) {
    if (current !== expected) fs.writeFileSync(indexFile, expected);
    console.log(`${current === expected ? 'unchanged' : 'wrote'} ${config.index}`);
  } else if (!write && current !== expected) {
    findings.push(`${config.index}: out of date, run with --write`);
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
