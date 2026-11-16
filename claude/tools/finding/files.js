// A file's text by kind, as the baseline's "What the commit scan reads" says: a document or a board read
// whole, a source file's comments only, or nothing. The tables that say which is which are read from the
// baseline (lists.js); this file holds the readers of each comment form.
//   kindOf(path, repo, loaded)          "text", { comments: <form> } or { skip: <why> }
//   isBinary(buffer)                     a NUL byte in the first 8 KB
//   segments(path, content, kind)        the texts to match: [{ line, column, text, parts }]
//   position(segment, index)             the line and column of an index of a segment's text
//   readFor(root, path, repo, loaded)    the file read: { kind, segments } or { skip }
// A segment's text joins its lines with a line break; parts maps each line of it back to the file:
// [{ start, line, column }], start the offset in the text, line and column counted from 1.
"use strict";
const fs = require("fs"), path = require("path");
const { load } = require("./lists.js");

const norm = p => String(p).replace(/\\/g, "/").replace(/^\.\//, "");

/* ---- which kind -------------------------------------------------------------------------------- */

function kindOf(rel, repo, loaded) {
  const L = loaded || load(), p = norm(rel), r = String(repo || "").toLowerCase();
  const place = L.finding.places.find(x => (!x.repo || x.repo.toLowerCase() === r) && x.re.test(p));
  if (place) return place.read === "whole" ? "text" : { skip: `not read (${place.glob})` };
  const base = p.split("/").pop(), low = base.toLowerCase();
  let best = null;
  L.finding.kinds.forEach(k => k.names.forEach(n => {
    const hit = n.startsWith(".") ? low === n.toLowerCase() || low.endsWith(n.toLowerCase()) : base === n;
    if (hit && (!best || n.length > best.n.length)) best = { n, form: k.form };
  }));
  if (!best) return { skip: "a file of no kind the baseline names" };
  if (best.form === "none") return { skip: `no comments read (${best.n})` };
  return { comments: best.form };
}
const isBinary = buf => buf.subarray(0, 8192).includes(0);

/* ---- pieces and segments ----------------------------------------------------------------------- */

/* A piece is one line's text of a comment: { line, column, text, group }; pieces of one group on lines
   one after another become one segment. */
function toSegments(pieces) {
  const out = []; let cur = null, last = null;
  pieces.forEach(p => {
    if (!cur || p.group !== last.group || p.line !== last.line + 1) { cur = { line: p.line, column: p.column, text: "", parts: [] }; out.push(cur); }
    else cur.text += "\n";
    cur.parts.push({ start: cur.text.length, line: p.line, column: p.column });
    cur.text += p.text; last = p;
  });
  return out;
}
function position(seg, index) {
  let part = seg.parts[0];
  for (const p of seg.parts) { if (p.start <= index) part = p; else break; }
  return { line: part.line, column: part.column + (index - part.start) };
}
/* Line starts of a text, for the line and column of an offset */
function lineIndex(text) { const s = [0]; for (let i = 0; i < text.length; i++) if (text[i] === "\n") s.push(i + 1); return s; }
function lineCol(starts, off) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; }
  return { line: lo + 1, column: off - starts[lo] + 1 };
}
/* A comment's body, from offset a to offset b of the text, as pieces: each line its own, a block's
   leading "*" on a line no text. lineStar: whether the leading "*" is stripped. */
function bodyPieces(text, starts, a, b, group, lineStar) {
  const out = []; let off = a;
  text.slice(a, b).split("\n").forEach((ln, i) => {
    let t = ln.replace(/\r$/, ""), col = lineCol(starts, off).column, lead = 0;
    if (lineStar && i > 0) { const m = /^[ \t]*\*(?!\/)[ \t]?/.exec(t); if (m) lead = m[0].length; }
    if (lineStar && i === 0 && t.startsWith("*")) lead = 1;
    out.push({ line: lineCol(starts, off).line, column: col + lead, text: t.slice(lead), group });
    off += ln.length + 1;
  });
  return out;
}

/* ---- the C-like forms: // and /* *\/, strings, characters, templates and regular expressions as code -- */

function cPieces(text, opts) {
  const starts = lineIndex(text), pieces = [], n = text.length;
  const nested = !!opts.nested, regex = !!opts.regex, template = !!opts.template, triple = !!opts.triple, dollar = !!opts.dollar;
  const stack = []; let i = 0, prev = "", group = 0;
  const startsRegex = () => /^$|[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || /\b(?:return|typeof|case|in|of|delete|void|throw|new|do|else|yield|await)$/.test(prev);
  const skipQuoted = (q, multi) => {
    i += q.length;
    while (i < n) {
      if (!multi && text[i] === "\n") return;
      if (text[i] === "\\" && q !== '"""') { i += 2; continue; }
      if (text.startsWith(q, i)) { i += q.length; return; }
      if (dollar && (q === '"' || q === '"""' || q === "`") && text.startsWith("${", i)) { stack.push({ q, multi, depth: 0 }); i += 2; return "tpl"; }
      if (template && q === "`" && text.startsWith("${", i)) { stack.push({ q, multi, depth: 0 }); i += 2; return "tpl"; }
      i++;
    }
  };
  while (i < n) {
    const c = text[i];
    if (stack.length && (c === "{" || c === "}")) {
      const top = stack[stack.length - 1];
      if (c === "{") { top.depth++; i++; prev = c; continue; }
      if (top.depth > 0) { top.depth--; i++; prev = c; continue; }
      stack.pop(); i--; skipQuotedResume(top); prev = "x"; continue;
    }
    if (text.startsWith("//", i)) {
      const end = text.indexOf("\n", i), e = end < 0 ? n : end;
      pieces.push(...bodyPieces(text, starts, i + 2, e, "l", false)); i = e; continue;
    }
    if (text.startsWith("/*", i)) {
      let depth = 1, j = i + 2;
      while (j < n && depth > 0) {
        if (nested && text.startsWith("/*", j)) { depth++; j += 2; }
        else if (text.startsWith("*/", j)) { depth--; j += 2; }
        else j++;
      }
      const e = depth > 0 ? n : j - 2;
      group++; pieces.push(...bodyPieces(text, starts, i + 2, e, `b${group}`, true)); group++;
      i = depth > 0 ? n : j; continue;
    }
    if (triple && text.startsWith('"""', i)) { skipQuoted('"""', true); prev = "x"; continue; }
    if (c === '"' || c === "'") { skipQuoted(c, false); prev = "x"; continue; }
    if (c === "`") { skipQuoted("`", template); prev = "x"; continue; }
    if (regex && c === "/" && startsRegex()) {
      let j = i + 1, cls = false;
      while (j < n && text[j] !== "\n") {
        if (text[j] === "\\") { j += 2; continue; }
        if (text[j] === "[") cls = true; else if (text[j] === "]") cls = false;
        else if (text[j] === "/" && !cls) break;
        j++;
      }
      if (j < n && text[j] === "/") { i = j + 1; prev = "x"; continue; }
    }
    if (!/\s/.test(c)) { const m = /^[A-Za-z_$][\w$]*/.exec(text.slice(i, i + 40)); if (m) { prev = m[0]; i += m[0].length; continue; } prev = c; }
    i++;
  }
  return pieces;
  /* back inside a string after a template's expression closed */
  function skipQuotedResume(top) {
    i++;
    while (i < n) {
      if (!top.multi && text[i] === "\n") return;
      if (text[i] === "\\" && top.q !== '"""') { i += 2; continue; }
      if (text.startsWith(top.q, i)) { i += top.q.length; return; }
      if ((dollar || (template && top.q === "`")) && text.startsWith("${", i)) { stack.push({ q: top.q, multi: top.multi, depth: 0 }); i += 2; return; }
      i++;
    }
  }
}

/* ---- the other forms --------------------------------------------------------------------------- */

/* /* *\/ only, strings as code */
function cssPieces(text) {
  const starts = lineIndex(text), pieces = []; let i = 0, g = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") { i++; while (i < text.length && text[i] !== c && text[i] !== "\n") { if (text[i] === "\\") i++; i++; } i++; continue; }
    if (text.startsWith("/*", i)) { const e = text.indexOf("*/", i + 2), end = e < 0 ? text.length : e; g++; pieces.push(...bodyPieces(text, starts, i + 2, end, `b${g}`, true)); i = e < 0 ? text.length : e + 2; continue; }
    i++;
  }
  return pieces;
}
/* <!-- --> anywhere */
function markupPieces(text, from, to) {
  const starts = lineIndex(text), pieces = []; let i = from || 0, g = 0; const end = to == null ? text.length : to;
  while (i < end) {
    const a = text.indexOf("<!--", i); if (a < 0 || a >= end) break;
    const b = text.indexOf("-->", a + 4), e = b < 0 || b > end ? end : b;
    g++; pieces.push(...bodyPieces(text, starts, a + 4, e, `m${a}`, false));
    i = e + 3;
  }
  return pieces;
}
/* <!-- --> outside script and style; a JavaScript script's // and /* *\/; a style's /* *\/ */
function htmlPieces(text) {
  const pieces = [], blocks = [], re = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi; let m;
  while ((m = re.exec(text))) {
    const bodyStart = m.index + m[0].indexOf(">") + 1, bodyEnd = bodyStart + m[3].length;
    blocks.push([m.index, re.lastIndex]);
    const tag = m[1].toLowerCase(), type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(m[2]);
    const js = tag === "script" && (!type || /^(?:text\/javascript|application\/javascript|module)$/i.test(type[1]));
    const padded = text.slice(0, bodyStart).replace(/[^\n]/g, " ") + m[3];
    if (js) pieces.push(...cPieces(padded, { regex: true, template: true }).map(p => Object.assign(p, { group: `s${m.index}${p.group}` })));
    else if (tag === "style") pieces.push(...cssPieces(padded).map(p => Object.assign(p, { group: `s${m.index}${p.group}` })));
  }
  let last = 0;
  blocks.forEach(([a, b]) => { pieces.push(...markupPieces(text, last, a)); last = b; });
  pieces.push(...markupPieces(text, last, text.length));
  return pieces.sort((a, b) => a.line - b.line || a.column - b.column);
}
/* A comment that runs to the end of the line from a marker the line test finds: test(line) returns the
   marker's index and length, or null */
function linePieces(text, test) {
  const pieces = [];
  text.split("\n").forEach((raw, i) => {
    const ln = raw.replace(/\r$/, ""), m = test(ln);
    if (m) pieces.push({ line: i + 1, column: m.at + m.len + 1, text: ln.slice(m.at + m.len), group: "line" });
  });
  return pieces;
}
/* a marker outside a quoted string, a quote opening only at a line's start or after a space or one of = : ( [ , */
function outsideQuotes(ln, marker, needSpace) {
  let q = null;
  for (let i = 0; i < ln.length; i++) {
    const c = ln[i];
    if (q) { if (c === "\\" && q === '"') { i++; continue; } if (c === q) q = null; continue; }
    if ((c === '"' || c === "'") && (i === 0 || /[\s=:([,]/.test(ln[i - 1]))) { q = c; continue; }
    if (ln.startsWith(marker, i) && (!needSpace || i === 0 || /[ \t]/.test(ln[i - 1]))) return { at: i, len: marker.length };
  }
  return null;
}
const leading = markers => ln => { const m = /^[ \t]*/.exec(ln)[0].length; const k = markers.find(x => ln.startsWith(x, m)); return k ? { at: m, len: k.length } : null; };
const batchTest = ln => { const m = /^([ \t]*@?[ \t]*)(rem(?=[ \t]|$)|::)/i.exec(ln); return m ? { at: m[1].length, len: m[2].length } : null; };

/* ---- segments ---------------------------------------------------------------------------------- */

function wholeSegment(content) {
  const text = content.replace(/^﻿/, ""), parts = []; let off = 0;
  text.split("\n").forEach((ln, i) => { parts.push({ start: off, line: i + 1, column: 1 }); off += ln.length + 1; });
  return [{ line: 1, column: 1, text, parts }];
}
function segments(rel, content, kind) {
  const text = String(content).replace(/^﻿/, "");
  if (kind === "text") return wholeSegment(text);
  if (!kind || !kind.comments) return [];
  const form = kind.comments, ext = norm(rel).toLowerCase();
  let pieces;
  switch (form) {
    case "c-nested": pieces = cPieces(text, { nested: true, triple: true, dollar: true }); break;
    case "c": pieces = cPieces(text, { regex: /\.(?:m?js|cjs|ts)$/.test(ext), template: /\.(?:m?js|cjs|ts)$/.test(ext), triple: /\.(?:java|groovy|gradle)$/.test(ext) }); break;
    case "css": pieces = cssPieces(text); break;
    case "html": pieces = htmlPieces(text); break;
    case "markup": pieces = markupPieces(text); break;
    case "hash": pieces = linePieces(text, ln => outsideQuotes(ln, "#", true)); break;
    case "hash-line": pieces = linePieces(text, leading(["#"])); break;
    case "properties": pieces = linePieces(text, leading(["#", "!"])); break;
    case "ini": pieces = linePieces(text, leading(["#", ";"])); break;
    case "http": pieces = linePieces(text, leading(["//", "#"])); break;
    case "batch": pieces = linePieces(text, batchTest); break;
    case "dash": pieces = linePieces(text, ln => outsideQuotes(ln, "--", false)); break;
    default: pieces = [];
  }
  return toSegments(pieces);
}

/* A file of a checkout read for a scan: { kind, segments } or { skip }. A file that cannot be read throws. */
function readFor(root, rel, repo, loaded) {
  const p = norm(rel), buf = fs.readFileSync(path.join(root, p));
  if (isBinary(buf)) return { skip: "binary" };
  const kind = kindOf(p, repo, loaded);
  if (kind !== "text" && !kind.comments) return { skip: kind.skip };
  return { kind, segments: segments(p, buf.toString("utf8"), kind) };
}

module.exports = { kindOf, isBinary, segments, position, readFor, norm };
