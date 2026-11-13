#!/usr/bin/env node
// Extracts one admin team session, or one remains, into the folder it is given.
//
//   node extract-session.js <id> <folder>
//
// Writes conversation.md and meta.json into <folder> (new or empty) and nothing
// else. conversation.md holds, in order: the user's words exactly, the team's
// console text, the cross-session messages, the task notifications, each
// question put with AskUserQuestion and its answer, the subagents' reports,
// the compaction summaries, and one line per tool call; no tool output. For
// remains, which have no transcript, it holds a listing of the folder and the
// subagents' final reports. Refuses a running, held or foreign session.

'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(p => (p && p.type === 'text' ? p.text : '')).filter(Boolean).join('\n');
  return '';
}
function oneLine(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; }
function toolLine(p) {
  const i = p.input || {};
  const what = i.description || i.command || i.file_path || i.pattern || i.subagent_type || i.to || '';
  return `- tool: ${p.name}${what ? ' — ' + oneLine(what, 160) : ''}`;
}

// The last assistant text of a subagent's transcript: its report.
function finalReport(file) {
  let last = '';
  for (const r of L.readJsonl(file)) {
    if (r.type === 'assistant' && r.message) { const t = textOf(r.message.content); if (t) last = t; }
  }
  return last;
}
function subagents(dir) {
  const sub = path.join(dir, 'subagents');
  if (!fs.existsSync(sub)) return [];
  const out = [];
  for (const f of fs.readdirSync(sub).sort()) {
    if (!f.endsWith('.meta.json')) continue;
    let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(sub, f), 'utf8')); } catch (e) { /* kept empty */ }
    const t = path.join(sub, f.replace(/\.meta\.json$/, '.jsonl'));
    out.push({ name: f.replace(/\.meta\.json$/, ''), type: meta.agentType || null, description: meta.description || null,
      report: fs.existsSync(t) ? finalReport(t) : '' });
  }
  return out;
}

function extractSession(P, id, transcript) {
  const counts = { userTyped: 0, team: 0, crossSession: 0, taskNotifications: 0, questions: 0, answers: 0,
    subagentReports: 0, compactions: 0, toolCalls: 0 };
  const toolName = new Map();
  const out = [];
  const records = L.readJsonl(transcript);
  for (const r of records) {
    const ts = r.timestamp || '';
    if (r.type === 'user' && r.message) {
      const c = r.message.content;
      if (r.isCompactSummary) { counts.compactions++; out.push(`### ${ts} Compaction summary\n\n${textOf(c)}\n`); continue; }
      if (Array.isArray(c)) {
        for (const part of c) {
          if (part && part.type === 'tool_result') {
            const name = toolName.get(part.tool_use_id);
            const body = textOf(part.content) || (typeof part.content === 'string' ? part.content : '');
            if (name === 'Agent' || name === 'Task') { counts.subagentReports++; out.push(`### ${ts} Subagent report\n\n${body}\n`); }
            else if (name === 'AskUserQuestion') { counts.answers++; out.push(`### ${ts} Answer\n\n${body}\n`); }
          }
        }
      }
      const t = textOf(c);
      if (!t) continue;
      const origin = r.origin && r.origin.kind;
      if (origin === 'peer' || t.includes('<cross-session-message')) {
        counts.crossSession++; out.push(`### ${ts} Cross-session message${r.origin && r.origin.name ? ' from ' + r.origin.name : ''}\n\n${t}\n`);
      } else if (t.includes('<task-notification')) {
        counts.taskNotifications++; out.push(`### ${ts} Task notification\n\n${t}\n`);
      } else if (origin === 'human' || (!r.isMeta && typeof c === 'string')) {
        counts.userTyped++; out.push(`### ${ts} User\n\n${t}\n`);
      }
      continue;
    }
    if (r.type === 'assistant' && r.message && Array.isArray(r.message.content)) {
      const tools = [];
      for (const p of r.message.content) {
        if (p.type === 'text' && p.text) { counts.team++; out.push(`### ${ts} Team\n\n${p.text}\n`); }
        if (p.type === 'tool_use') {
          toolName.set(p.id, p.name);
          counts.toolCalls++;
          if (p.name === 'AskUserQuestion') { counts.questions++; out.push(`### ${ts} Question\n\n${JSON.stringify(p.input && p.input.questions ? p.input.questions : p.input, null, 1)}\n`); }
          else tools.push(toolLine(p));
        }
      }
      if (tools.length) out.push(tools.join('\n') + '\n');
    }
  }
  return { counts, body: out.join('\n'), records };
}

function main() {
  const args = process.argv.slice(2);
  const sid = args[0]; const dest = args[1];
  if (!sid || !dest || sid.startsWith('--') || dest.startsWith('--')) { console.error('usage: extract-session.js <id> <folder>'); return 2; }
  if (!L.ID_RE.test(sid)) { console.error(`REFUSED: ${sid} is not a session id`); return 1; }
  const P = L.paths();
  let c; try { c = L.classify(P); } catch (e) { console.error(`STOP: ${e.message}`); return 2; }
  const row = c.rows.find(r => r.id === sid);
  if (!row) { console.error(`REFUSED: ${sid} is not an admin team session or remains`); return 1; }
  if (['running', 'held', 'foreign'].includes(row.class)) { console.error(`REFUSED: ${sid} is ${row.class}`); return 1; }
  if (fs.existsSync(dest) && fs.readdirSync(dest).length) { console.error(`REFUSED: ${dest} is not empty`); return 1; }
  fs.mkdirSync(dest, { recursive: true });

  const folderPath = path.join(P.project, sid);
  const subs = subagents(folderPath);
  const meta = { id: sid, kind: row.kind, title: row.title, from: row.from, to: row.to, extractedAt: new Date().toISOString() };
  let body;
  if (row.kind === 'session') {
    const t = path.join(P.project, sid + '.jsonl');
    const e = extractSession(P, sid, t);
    body = `# ${row.title || 'admin team'} — ${sid}\n\n${row.from} to ${row.to}\n\n${e.body}`;
    meta.transcriptBytes = fs.statSync(t).size;
    meta.transcriptSha256 = L.sha256File(t);
    meta.records = e.records.length;
    meta.counts = e.counts;
  } else {
    const listing = [];
    const stack = [folderPath];
    while (stack.length) {
      const cur = stack.pop();
      const st = fs.lstatSync(cur);
      if (st.isDirectory() && !st.isSymbolicLink()) fs.readdirSync(cur).forEach(n => stack.push(path.join(cur, n)));
      else listing.push(`- ${path.relative(folderPath, cur).replace(/\\/g, '/')} (${st.size} bytes)`);
    }
    body = `# Remains — ${sid}\n\nNo transcript is left. Last change ${row.to}.\n\n## What the folder holds\n\n${listing.sort().join('\n')}\n`;
    meta.transcriptBytes = null; meta.transcriptSha256 = null;
    meta.counts = { files: listing.length };
  }
  if (subs.length) {
    body += `\n## Subagents' final reports\n\n` + subs.map(s => `### ${s.name}${s.type ? ' (' + s.type + ')' : ''}${s.description ? ' — ' + oneLine(s.description, 160) : ''}\n\n${s.report || '(no report)'}\n`).join('\n');
  }
  meta.counts.subagents = subs.length;
  meta.stores = L.stores(P, sid).map(s => ({ store: s.store, bytes: L.walk(s.path).bytes }));
  meta.conversationSha256 = L.sha256Text(body);
  fs.writeFileSync(path.join(dest, 'conversation.md'), body);
  fs.writeFileSync(path.join(dest, 'meta.json'), JSON.stringify(meta, null, 1) + '\n');
  console.log(JSON.stringify({ id: sid, folder: dest, kind: row.kind, counts: meta.counts, conversationBytes: Buffer.byteLength(body) }));
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { extractSession };
