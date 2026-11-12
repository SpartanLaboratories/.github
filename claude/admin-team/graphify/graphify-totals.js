#!/usr/bin/env node
// graphify-totals.js: the totals of the temporary graphify usage tracker, and the Graphify
// Manager's way to add what graph upkeep cost.
//
//   node graphify-totals.js [--json]
//       Totals per pipeline run and overall from ~/.claude/admin-team/graphify-usage.jsonl.
//       A run is one session; it is a pipeline run when its transcript holds /resolve-issue.
//   node graphify-totals.js add <build|refresh|label> <repo> <tokens> [note ...]
//       Appends the model tokens one graph build, refresh or label pass spent.
//
// Options: --log <file> (else GRAPHIFY_TRACK_LOG, else the default log), --projects <dir> (the
// transcripts, default ~/.claude/projects).
//
// Sizes in the log are bytes the model was given. Tokens are estimated from them at
// BYTES_PER_TOKEN, and tokens saved are estimated from the agents' self-report lines; neither is
// a measurement. Only the upkeep lines carry tokens as reported.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const BYTES_PER_TOKEN = 4;
const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const LOG = opt('--log') || process.env.GRAPHIFY_TRACK_LOG ||
  path.join(os.homedir(), '.claude', 'admin-team', 'graphify-usage.jsonl');
const PROJECTS = opt('--projects') || path.join(os.homedir(), '.claude', 'projects');
const JSON_OUT = flag('--json');

if (args[0] === 'add') {
  const [, work, repo, tok, ...note] = args;
  const tokens = Number(tok);
  if (!/^(build|refresh|label)$/.test(work || '') || !repo || !Number.isInteger(tokens) || tokens < 0) {
    console.error('usage: graphify-totals.js add <build|refresh|label> <repo> <tokens> [note ...]');
    process.exit(2);
  }
  const rec = { ts: new Date().toISOString(), session: null, agent_id: null, agent: 'graphify-manager', repo,
    tool: null, kind: 'upkeep', work, tokens, note: note.length ? note.join(' ') : null };
  fs.appendFileSync(LOG, JSON.stringify(rec) + '\n');
  console.log(JSON.stringify(rec));
  process.exit(0);
}
if (args.length) { console.error('unknown arguments: ' + args.join(' ')); process.exit(2); }

const lines = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n') : [];
const events = [];
let bad = 0;
for (const l of lines) {
  if (!l.trim()) continue;
  try { events.push(JSON.parse(l)); } catch (e) { bad++; }
}

// The session's transcript tells whether it ran /resolve-issue, with which arguments, and its
// title.
const transcriptCache = new Map();
function describe(session) {
  if (transcriptCache.has(session)) return transcriptCache.get(session);
  const d = { pipeline: false, command: null, title: null };
  try {
    for (const dir of fs.readdirSync(PROJECTS)) {
      const f = path.join(PROJECTS, dir, session + '.jsonl');
      if (!fs.existsSync(f)) continue;
      for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
        if (!d.pipeline && l.includes('<command-name>/resolve-issue</command-name>')) {
          d.pipeline = true;
          const a = /<command-args>([^<]*)<\/command-args>/.exec(l);
          d.command = ('/resolve-issue ' + (a ? a[1] : '')).trim();
        }
        if (l.includes('"type":"custom-title"')) {
          try { d.title = JSON.parse(l).customTitle || d.title; } catch (e) { /* not a whole entry */ }
        }
      }
      break;
    }
  } catch (e) { /* no transcripts: the run stays unnamed */ }
  transcriptCache.set(session, d);
  return d;
}

function blank() {
  return {
    reminders: { n: 0, bytes: 0 }, queries: { n: 0, bytes: 0, by: {} }, updates: { n: 0, bytes: 0 },
    searches: { n: 0, bytes: 0 }, reads: { n: 0, bytes: 0 }, failed: 0,
    self: { agents: 0, queries: 0, replaced_searches: 0, replaced_reads: 0 },
    upkeep: { tokens: 0, by: {} }, repos: new Set(), agents: new Set(), first: null, last: null,
  };
}
function add(t, ev) {
  const b = Number(ev.bytes) || 0;
  if (ev.repo) t.repos.add(ev.repo);
  if (ev.agent && ev.agent_id) t.agents.add(ev.agent);
  if (!t.first || ev.ts < t.first) t.first = ev.ts;
  if (!t.last || ev.ts > t.last) t.last = ev.ts;
  if (ev.failed) t.failed++;
  switch (ev.kind) {
    case 'reminder': t.reminders.n++; t.reminders.bytes += b; break;
    case 'graph-query': t.queries.n++; t.queries.bytes += b; t.queries.by[ev.sub || '?'] = (t.queries.by[ev.sub || '?'] || 0) + 1; break;
    case 'graph-update': t.updates.n++; t.updates.bytes += b; break;
    case 'search': t.searches.n++; t.searches.bytes += b; break;
    case 'read': t.reads.n++; t.reads.bytes += b; break;
    case 'self-report':
      t.self.agents++; t.self.queries += ev.queries || 0;
      t.self.replaced_searches += ev.replaced_searches || 0; t.self.replaced_reads += ev.replaced_reads || 0;
      break;
    case 'upkeep': t.upkeep.tokens += ev.tokens || 0; t.upkeep.by[ev.work] = (t.upkeep.by[ev.work] || 0) + (ev.tokens || 0); break;
  }
}
// A SubagentStop can fire more than once for one agent: keep its last self-report.
const lastSelf = new Map();
for (const ev of events) if (ev.kind === 'self-report') lastSelf.set(ev.session + '/' + ev.agent_id, ev);
const counted = events.filter(ev => ev.kind !== 'self-report' || lastSelf.get(ev.session + '/' + ev.agent_id) === ev);

const overall = blank();
const runs = new Map();
for (const ev of counted) {
  add(overall, ev);
  if (!ev.session) continue;
  if (!runs.has(ev.session)) runs.set(ev.session, blank());
  add(runs.get(ev.session), ev);
}

const tok = b => Math.round(b / BYTES_PER_TOKEN);
const mean = (x, fb) => (x.n ? x.bytes / x.n : fb);
// The estimate: the searches and reads the agents say a query replaced, each at the mean size
// of a logged search or read (the run's own, else the overall), less what the graph cost the
// run's context (the queries, the reminders and the update outputs).
function estimate(t) {
  const avoided = t.self.replaced_searches * mean(t.searches, mean(overall.searches, 0)) +
    t.self.replaced_reads * mean(t.reads, mean(overall.reads, 0));
  const spent = t.queries.bytes + t.reminders.bytes + t.updates.bytes;
  return { avoided_tokens: tok(avoided), context_cost_tokens: tok(spent), net_tokens: tok(avoided - spent) };
}
function summary(t) {
  return {
    repos: [...t.repos].sort(), agents: [...t.agents].sort(), from: t.first, to: t.last,
    reminders: t.reminders, graph_queries: t.queries, graph_updates: t.updates,
    searches: t.searches, reads: t.reads, failed_tool_calls: t.failed, self_reports: t.self,
    upkeep_tokens: t.upkeep, estimate: estimate(t),
  };
}

const runList = [...runs.entries()].map(([session, t]) => ({ session, ...describe(session), ...summary(t) }))
  .sort((a, b) => (a.from < b.from ? -1 : 1));
const all = summary(overall);
all.estimate.net_after_upkeep_tokens = all.estimate.net_tokens - overall.upkeep.tokens;

if (JSON_OUT) {
  console.log(JSON.stringify({ log: LOG, bytes_per_token: BYTES_PER_TOKEN, unreadable_lines: bad, runs: runList, overall: all }, null, 2));
  process.exit(0);
}

const kb = b => `${b} B (~${tok(b)} tokens)`;
function block(s, indent) {
  const p = ' '.repeat(indent), out = [];
  const by = Object.entries(s.graph_queries.by).map(([k, v]) => `${k} ${v}`).join(', ');
  out.push(`${p}cost   reminders ${s.reminders.n}: ${kb(s.reminders.bytes)}; graphify update ${s.graph_updates.n}: ${kb(s.graph_updates.bytes)}`);
  out.push(`${p}use    graph queries ${s.graph_queries.n}${by ? ` (${by})` : ''}: ${kb(s.graph_queries.bytes)}`);
  out.push(`${p}base   searches ${s.searches.n}: ${kb(s.searches.bytes)}; file reads ${s.reads.n}: ${kb(s.reads.bytes)}` +
    (s.failed_tool_calls ? ` (${s.failed_tool_calls} of them failed calls)` : ''));
  out.push(`${p}self   ${s.self_reports.agents} agents reported ${s.self_reports.queries} queries, replacing ` +
    `${s.self_reports.replaced_searches} searches and ${s.self_reports.replaced_reads} file reads`);
  const e = s.estimate;
  out.push(`${p}saved  estimate: ~${e.avoided_tokens} tokens avoided, less ~${e.context_cost_tokens} spent on the graph: ~${e.net_tokens} tokens net`);
  return out.join('\n');
}
const out = [];
out.push(`graphify tracker totals (${LOG})`);
out.push(`Tokens are estimates at ${BYTES_PER_TOKEN} bytes per token; tokens saved are an estimate, never a measurement.`);
if (bad) out.push(`${bad} unreadable lines skipped.`);
out.push('');
const pipeline = runList.filter(r => r.pipeline), other = runList.filter(r => !r.pipeline);
out.push(`Pipeline runs: ${pipeline.length}`);
for (const r of pipeline) {
  out.push(`- ${r.command}${r.title ? ` "${r.title}"` : ''} in ${r.repos.join(', ') || '?'}, ${r.from} to ${r.to}, session ${r.session}`);
  if (r.agents.length) out.push(`    agents: ${r.agents.join(', ')}`);
  out.push(block(r, 4));
}
out.push('');
out.push(`Other sessions: ${other.length}`);
for (const r of other) {
  out.push(`- ${r.title ? `"${r.title}" ` : ''}in ${r.repos.join(', ') || '?'}, ${r.from} to ${r.to}, session ${r.session}`);
  out.push(block(r, 4));
}
out.push('');
out.push(`Overall, ${all.from || '-'} to ${all.to || '-'}:`);
out.push(block(all, 2));
const up = Object.entries(overall.upkeep.by).map(([k, v]) => `${k} ${v}`).join(', ');
out.push(`  upkeep ${overall.upkeep.tokens} model tokens as reported by the Graphify Manager${up ? ` (${up})` : ''}`);
out.push(`  net    estimate after upkeep: ~${all.estimate.net_after_upkeep_tokens} tokens`);
console.log(out.join('\n'));
