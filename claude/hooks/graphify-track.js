#!/usr/bin/env node
// graphify-track.js: the tool half of the temporary graphify usage tracker.
//
// Appends one JSON line per event to the local log ~/.claude/admin-team/graphify-usage.jsonl
// (GRAPHIFY_TRACK_LOG overrides the path). The settings.json hooks start it, in the background,
// only in a checkout with graphify-out/graph.json, so a linked worktree, which has none, logs
// nothing. It never prints and always exits 0: a tool call is never blocked or given context.
//
// Modes; the hook's input JSON arrives on stdin:
//   post   PostToolUse and PostToolUseFailure for Bash, Grep, Read and Glob: a graph query
//          (the use), a search or a file read (the baseline), with the size returned.
//   stop   SubagentStop: the agent's self-report line, when its last message carries one.
// The reminders are logged by graphify-track.sh; the totals, and the lines the admin team adds
// for graph upkeep, are ~/.claude/admin-team/graphify-totals.js's.
'use strict';
const t0 = Date.now();
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG = process.env.GRAPHIFY_TRACK_LOG ||
  path.join(os.homedir(), '.claude', 'admin-team', 'graphify-usage.jsonl');

// Shell words. SEARCH and WRAP follow graphify's own test for a search
// (`graphify hook-guard search`, graphify 0.9.82): a search tool in command position, after
// VAR=x prefixes and wrapper words, with quoted spans and heredoc bodies ignored.
const SEARCH = new Set(['grep', 'egrep', 'fgrep', 'zgrep', 'rg', 'ripgrep', 'find', 'fd', 'ack', 'ag']);
const WRAP = new Set(['sudo', 'command', 'exec', 'nohup', 'time', 'nice', 'ionice', 'env',
  'xargs', 'timeout', 'stdbuf', 'doas']);
const READ = new Set(['cat', 'head', 'tail', 'less', 'more', 'bat', 'nl']);

function dropHeredocs(text) {
  const open = /<<-?\s*(['"]?)(\w+)\1/g;
  let m;
  while ((m = open.exec(text))) {
    const nl = text.indexOf('\n', m.index + m[0].length);
    if (nl < 0) break;
    const term = new RegExp('^\\s*' + m[2] + '\\s*$', 'm');
    const rest = text.slice(nl + 1);
    const t = term.exec(rest);
    if (!t) return text.slice(0, nl + 1);
    text = text.slice(0, nl + 1) + rest.slice(t.index + t[0].length);
    open.lastIndex = nl + 1;
  }
  return text;
}

// A Bash command's kind: 'graph-query' (graphify query|path|explain, with `sub`),
// 'graph-update' (graphify update), 'search', 'read' (a file printed with cat, head, tail, less,
// more, bat, nl or `sed -n`, not redirected into a file), or null. A graph query outranks a
// search, a search outranks a read.
function classifyBash(cmd) {
  let text = dropHeredocs(String(cmd || ''));
  text = text.replace(/'[^']*'/g, ' Q ').replace(/"[^"]*"/g, ' Q ');
  // Drop stderr and descriptor redirects, so a `>` left in a segment writes its output to a file.
  text = text.replace(/\d*>&\d+/g, ' ').replace(/2>>?\s*\S+/g, ' ');
  let search = false, read = false;
  for (const seg of text.split(/\|\||&&|[|;&\n]|\$\(|`|\(|\)|\{|\}/)) {
    const tok = seg.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tok.length) {
      const w = tok[i];
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) { i++; continue; }
      let name = w.replace(/\\/g, '/').split('/').pop().toLowerCase();
      if (name.endsWith('.exe')) name = name.slice(0, -4);
      if (WRAP.has(name)) { i++; while (i < tok.length && tok[i].startsWith('-')) i++; continue; }
      const next = tok[i + 1] || '';
      if (name === 'graphify' && /^(query|path|explain)$/.test(next)) return { kind: 'graph-query', sub: next };
      if (name === 'graphify' && next === 'update') return { kind: 'graph-update', sub: 'update' };
      if (SEARCH.has(name)) search = true;
      else if (name === 'git' && tok.slice(i + 1, i + 4).includes('grep')) search = true;
      else if (!seg.includes('>') && (READ.has(name) ||
        (name === 'sed' && tok.slice(i + 1).some(t => /^-[a-zA-Z]*n/.test(t))))) read = true;
      break;
    }
  }
  return search ? { kind: 'search' } : read ? { kind: 'read' } : null;
}

const bytes = s => (typeof s === 'string' ? Buffer.byteLength(s, 'utf8') : 0);
// What a tool returned to the model, sized by the tool's result shape; the serialized result
// when the shape is not the expected one.
function resultBytes(tool, r) {
  if (r == null) return null;
  if (typeof r === 'string') return bytes(r);
  try {
    if (tool === 'Bash' && ('stdout' in r || 'stderr' in r)) return bytes(r.stdout) + bytes(r.stderr);
    if (tool === 'Read' && r.file && typeof r.file.content === 'string') return bytes(r.file.content);
    if (tool === 'Grep' && ('content' in r || 'filenames' in r)) {
      return typeof r.content === 'string' && r.content ? bytes(r.content)
        : bytes((r.filenames || []).join('\n'));
    }
    if (tool === 'Glob' && Array.isArray(r.filenames)) return bytes(r.filenames.join('\n'));
    return bytes(JSON.stringify(r));
  } catch (e) { return null; }
}
const inGraphOut = p => typeof p === 'string' && /(^|[\\/])graphify-out([\\/]|$)/.test(p);

// The self-report line CLAUDE.md's graphify section sets:
//   graphify: <q> queries; replaced <s> searches, <r> file reads
const SELF = /graphify:\s*(\d+)\s+(?:graph\s+)?quer(?:y|ies)\s*[;,]\s*replaced\s+(\d+)\s+search(?:es)?\s*(?:,|and)\s*(\d+)\s+(?:file\s+)?reads?/i;

// The agent's last report: last_assistant_message, else the last assistant message in its
// transcript (the text blocks and a SubagentHandback message, all blocks of that message),
// read from the file's last 256 KB.
function lastReport(input) {
  const said = input.last_assistant_message;
  if (said && SELF.test(said)) return said;
  const file = input.agent_transcript_path || input.transcript_path;
  if (!file) return said || null;
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size, len = Math.min(size, 262144);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n');
    let id, parts = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      let o; try { o = JSON.parse(lines[i]); } catch (e) { continue; }
      if (!o || o.type !== 'assistant' || !o.message || !Array.isArray(o.message.content)) {
        if (id !== undefined && o && o.type === 'assistant') break;
        continue;
      }
      if (id !== undefined && o.message.id !== id) break;
      id = o.message.id;
      const here = [];
      for (const b of o.message.content) {
        if (b.type === 'text') here.push(b.text);
        else if (b.type === 'tool_use' && b.name === 'SubagentHandback' && b.input &&
          typeof b.input.message === 'string') here.push(b.input.message);
      }
      parts = here.concat(parts);
      if (id === undefined) break; // no message id: the one entry is the message
    }
    if (parts.length) return parts.join('\n');
  } finally { fs.closeSync(fd); }
  return said || null;
}

// The repository is the checkout the hook found the graph in: its working directory.
function record(input, kind, tool) {
  const cwd = process.cwd();
  return {
    ts: new Date().toISOString(),
    session: input.session_id || null,
    agent_id: input.agent_id || null,
    agent: input.agent_type || null,
    repo: cwd ? path.basename(cwd) : null,
    tool: tool || null,
    kind,
  };
}
// One appendFileSync per line: one write in append mode, so lines from concurrent sessions do
// not interleave.
function append(rec) {
  rec.hook_ms = Date.now() - t0;
  fs.appendFileSync(LOG, JSON.stringify(rec) + '\n');
}
function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { return {}; }
}

function main() {
  const mode = process.argv[2];
  const input = readStdin();
  if (mode === 'post') {
    const tool = input.tool_name, ti = input.tool_input || {};
    let c = null;
    if (tool === 'Bash') c = classifyBash(ti.command);
    else if (tool === 'Read') c = inGraphOut(ti.file_path) ? { kind: 'graph-query', sub: 'file' } : { kind: 'read' };
    else if (tool === 'Grep') c = inGraphOut(ti.path) ? { kind: 'graph-query', sub: 'file' } : { kind: 'search' };
    else if (tool === 'Glob') c = { kind: 'search' };
    if (!c) return;
    const rec = record(input, c.kind, tool);
    if (c.sub) rec.sub = c.sub;
    const failed = input.hook_event_name === 'PostToolUseFailure';
    rec.bytes = failed ? bytes(input.error) : resultBytes(tool, input.tool_response);
    if (failed) rec.failed = true;
    rec.tool_ms = typeof input.duration_ms === 'number' ? input.duration_ms : null;
    append(rec);
  } else if (mode === 'stop') {
    // Only in a graphed checkout, as the tool hooks; SubagentStop has no matcher to say so.
    if (!fs.existsSync(path.join('graphify-out', 'graph.json'))) return;
    const text = lastReport(input);
    const m = text && SELF.exec(text);
    if (!m) return;
    const rec = record(input, 'self-report', null);
    rec.queries = +m[1]; rec.replaced_searches = +m[2]; rec.replaced_reads = +m[3];
    append(rec);
  }
}

try { main(); } catch (e) { /* silent: the tracker never disturbs a tool call */ }
process.exitCode = 0;
