#!/usr/bin/env node
// The ideas files' only writer and their check (GUIDANCE.md §13, "The ideas files"): a repository's docs/plans/ideas.json and the
// organization's docs/plans/org-work-board/ideas.json in OrganizationPage.
//   node ideas.js add     --file <ideas.json> --kind <kind> --text <text> [--concerns <a,b>] [--issue <n | owner/repo#n>] [--at <iso>] [--org]
//   node ideas.js drop    --file <ideas.json> --id <n> --reason <text>
//   node ideas.js harvest --file <ideas.json> --scope <system:<slug> | supersystem:<slug> | repository | org> --board <dir> [--parts <generated.json>] [--at <iso>] [--org]
//   node ideas.js check   --file <ideas.json> [--org]
// add, drop and harvest write the file whole (written beside it, then renamed) and print a summary (JSON); check prints its findings.
// A text that breaks the rules of what leaves a repository is refused, naming the field and the rule, and never reworded: exit 3, nothing
// written. A harvest reads the Whiteboard as read into <dir> (ArtifactData board/meta and elements, each read with out_dir), takes every
// element that is not generated and carries text (the user's notes), and writes each with its element id as its source, the kind its
// words say and, as its concerns, the generated parts its arrows point at; a note that breaks the rules, carries an owner or a due date,
// or is already in the file by its element id is left out and named. --org: the organization's file (concerns owner/repo or
// owner/repo:<slug>, an issue owner/repo#n); the path decides it where --org is not given. GitHub is read for the organizations'
// private repositories (gh, or the command DASHBOARDS_GH names, as org-board.js reads it), so that no idea names one; where it cannot
// be read, nothing is written. Exit 0 done, 1 a check failed, 2 usage, 3 refused.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const SKILL = path.resolve(__dirname, "..", "..");

const SCHEMA = "ideas/1";
const KINDS = ["fix", "improvement", "feature", "exploration", "future"];
const FIELDS = ["id", "kind", "text", "concerns", "issue", "noted", "source"];
const TOP = ["schema", "next", "ideas"];
const SCOPE_RE = /^(?:system:[a-z0-9][a-z0-9._-]*|supersystem:[a-z0-9][a-z0-9._-]*|repository|org)$/;
const ELEMENT_RE = /^(?!\.+$)[A-Za-z0-9_.~:@+-]{1,40}$/;
const PART_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const REPO_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const wb = () => require(path.join(SKILL, "companions", "scripts", "wblib.js"));
const isOrgFile = (file, org) => !!org || /(?:^|[\\/])org-work-board[\\/]ideas\.json$/.test(String(file));

/* An owner (a person named or addressed as the one to do it) or a due date in a harvested note (GUIDANCE.md §13): never written */
const OWNER = [/(?<![\w.])@[A-Za-z0-9][A-Za-z0-9_-]*/, /\b(?:owner|assignee|assigned to|owned by|for whom)\b\s*[:=]?\s*\S/i, /\b(?:TODO|FIXME)\s*\(\s*[A-Za-z][\w-]*\s*\)/,
  /\b[A-Z][a-z]+\s+(?:will|should|must|has to|needs to)\s+(?:do|handle|take|own|fix|write|look at)\b/, /^\s*[A-Z][a-z]+\s*:\s/];
const DUE = [/\b(?:due|deadline|by|before|until)\b\s*[:=]?\s*(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?|(?:mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow|today|tonight|next (?:week|month|sprint)|end of (?:the )?(?:day|week|month|quarter|year)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2})\b/i,
  /\b(?:eod|eow|eom|asap)\b/i, /\b\d{4}-\d{2}-\d{2}\b/];
const ownerOf = t => { for (const re of OWNER) { const m = re.exec(t); if (m) return m[0].trim(); } return null; };
const dueOf = t => { for (const re of DUE) { const m = re.exec(t); if (m) return m[0].trim(); } return null; };
/* The kind a note's words say (hook-85/P1b): a proposed fix, something to explore, something for later, a new feature, else an improvement */
function kindOf(text) {
  const t = String(text).toLowerCase();
  if (/\b(?:fix|bug|broken|breaks|wrong|fails?|failing|error|crash(?:es)?|regression|defect)\b/.test(t)) return "fix";
  if (/\b(?:explore|exploration|investigate|look into|try out|spike|what if|could we|research|experiment)\b/.test(t)) return "exploration";
  if (/\b(?:later|someday|some day|future|eventually|one day|long[- ]term|next major)\b/.test(t)) return "future";
  if (/\b(?:add|new|support|feature|introduce|allow|enable|offer)\b/.test(t)) return "feature";
  return "improvement";
}

/* ---------- The file ---------- */
const empty = () => ({ schema: SCHEMA, next: 1, ideas: [] });
function read(file) {
  if (!fs.existsSync(file)) return empty();
  const t = fs.readFileSync(file, "utf8"); let v;
  try { v = JSON.parse(t); } catch (e) { throw new Error(`${file} is not JSON: ${e.message}`); }
  return v;
}
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid; fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n"); fs.renameSync(tmp, file);
}
/* The ideas of a file that name an issue (an issue board's Ideas Card, plan/RULES.md §2): [{id, kind, text, concerns}], none where the
   file is missing or does not read */
function ideasFor(file, issue) {
  let d; try { d = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null; } catch (e) { d = null; }
  if (!d || !Array.isArray(d.ideas)) return [];
  return d.ideas.filter(i => i && i.issue === issue && typeof i.text === "string").map(i => ({ id: i.id, kind: i.kind, text: i.text, concerns: Array.isArray(i.concerns) ? i.concerns : [] }));
}

/* ---------- The check ---------- */
/* A file's problems: its schema, unique ids under next, no field the schema does not have, each field's form, and every text clean of
   what may not leave a repository. ctx: { org, privates } */
function problems(d, ctx) {
  const P = [], org = !!(ctx && ctx.org), W = wb();
  if (!d || typeof d !== "object" || Array.isArray(d)) return ["the file is not an object"];
  if (d.schema !== SCHEMA) P.push(`schema is ${JSON.stringify(d.schema)}, not "${SCHEMA}"`);
  Object.keys(d).filter(k => !TOP.includes(k)).forEach(k => P.push(`the file has the field ${JSON.stringify(k)}, which the schema does not`));
  if (!Number.isInteger(d.next) || d.next < 1) P.push("next is not a positive whole number");
  if (!Array.isArray(d.ideas)) { P.push("ideas is not a list"); return P; }
  const ids = new Set(), sources = new Set();
  d.ideas.forEach((i, n) => {
    const at = `ideas[${n}]`;
    if (!i || typeof i !== "object") { P.push(`${at} is not an object`); return; }
    Object.keys(i).filter(k => !FIELDS.includes(k)).forEach(k => P.push(`${at} has the field ${JSON.stringify(k)}, which an idea does not (no owner, due date, priority or state)`));
    if (!Number.isInteger(i.id) || i.id < 1) P.push(`${at}.id is not a positive whole number`);
    else { if (ids.has(i.id)) P.push(`${at}.id ${i.id} is used twice`); ids.add(i.id); if (Number.isInteger(d.next) && i.id >= d.next) P.push(`${at}.id ${i.id} is not under next (${d.next})`); }
    if (!KINDS.includes(i.kind)) P.push(`${at}.kind ${JSON.stringify(i.kind)} is not one of ${KINDS.join(", ")}`);
    if (typeof i.text !== "string" || !i.text.trim()) P.push(`${at}.text is empty`);
    else W.textProblems(i.text, ctx).forEach(x => P.push(`${at}.text carries ${x.rule} (${x.hit})`));
    if (!Array.isArray(i.concerns)) P.push(`${at}.concerns is not a list`);
    else i.concerns.forEach((c, k) => { const ok = org ? (typeof c === "string" && (REPO_RE.test(c) || /^[^:]+\/[^:]+:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(c) && REPO_RE.test(c.split(":")[0]))) : typeof c === "string" && PART_RE.test(c);
      if (!ok) P.push(`${at}.concerns[${k}] ${JSON.stringify(c)} is not ${org ? "owner/repo or owner/repo:<slug>" : "a registry slug or a DSL element id"}`);
      else W.textProblems(c, ctx).filter(x => x.rule === "private repository").forEach(x => P.push(`${at}.concerns[${k}] names a private repository`)); });
    if (i.issue != null) { const ok = org ? typeof i.issue === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+#\d+$/.test(i.issue) : Number.isInteger(i.issue) && i.issue > 0;
      if (!ok) P.push(`${at}.issue ${JSON.stringify(i.issue)} is not ${org ? "owner/repo#n" : "an issue number"}`);
      else if (org) W.textProblems(i.issue, ctx).filter(x => x.rule === "private repository").forEach(() => P.push(`${at}.issue names a private repository`)); }
    if (typeof i.noted !== "string" || !ISO_RE.test(i.noted)) P.push(`${at}.noted is not a UTC stamp (YYYY-MM-DDTHH:MM:SSZ)`);
    if (i.source != null) {
      const s = i.source;
      if (!s || typeof s !== "object" || Array.isArray(s)) P.push(`${at}.source is not an object`);
      else {
        Object.keys(s).filter(k => !["scope", "element"].includes(k)).forEach(k => P.push(`${at}.source has the field ${JSON.stringify(k)}: a source is its Whiteboard's scope and the note's element id, never a link`));
        if (!SCOPE_RE.test(String(s.scope))) P.push(`${at}.source.scope ${JSON.stringify(s.scope)} is not system:<slug>, supersystem:<slug>, repository or org`);
        if (!ELEMENT_RE.test(String(s.element))) P.push(`${at}.source.element ${JSON.stringify(s.element)} is not an element id`);
        const key = `${s.scope} ${s.element}`; if (sources.has(key)) P.push(`${at}.source: the note ${s.element} of ${s.scope} is in the file twice`); sources.add(key);
      }
    }
  });
  return P;
}

/* ---------- GitHub: the organizations' private repositories ---------- */
const ghBin = process.env.DASHBOARDS_GH || "gh", ghVia = /\.js$/i.test(ghBin);
function privatesOf(owners) {
  const set = new Set();
  owners.forEach(o => {
    const r = cp.spawnSync(ghVia ? process.execPath : ghBin, ghVia ? [ghBin, "repo", "list", o, "--json", "nameWithOwner,visibility", "-L", "400"] : ["repo", "list", o, "--json", "nameWithOwner,visibility", "-L", "400"], { encoding: "utf8", windowsHide: true, timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0) throw new Error(`GitHub could not be read for ${o}'s repositories (${(r.stderr || "").trim() || "gh failed"}): nothing written, as no idea may name a private repository`);
    JSON.parse(r.stdout).filter(x => x.visibility !== "PUBLIC").forEach(x => set.add(x.nameWithOwner));
  });
  return set;
}
function ownersOf() {
  const cfg = JSON.parse(fs.readFileSync(path.join(SKILL, "plan", "template", "org-board.repositories.json"), "utf8"));
  return [cfg.owner, ...(cfg.organizations || []).map(o => o.owner)];
}

/* ---------- The commands ---------- */
class Refused extends Error {}
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
function opt(args, n) { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; }

function add(file, o, ctx) {
  const d = read(file), P = problems(d, ctx); if (P.length) throw new Refused(`${file} does not pass its check, so nothing is added: ${P.slice(0, 3).join("; ")}`);
  return addTo(d, o, ctx);
}
/* an idea added to the file's data (the file itself untouched): { data, idea }, or Refused */
function addTo(d, o, ctx) {
  if (!KINDS.includes(o.kind)) throw new Refused(`kind ${JSON.stringify(o.kind)} is not one of ${KINDS.join(", ")}`);
  const W = wb(), tp = W.textProblems(o.text || "", ctx);
  if (!o.text || !o.text.trim()) throw new Refused("text is empty");
  if (tp.length) throw new Refused(`text carries ${tp.map(x => `${x.rule} (${x.hit})`).join(", ")}: an idea's text is never reworded; send it again in other words`);
  const idea = { id: d.next, kind: o.kind, text: o.text.trim(), concerns: o.concerns || [], ...(o.issue != null ? { issue: o.issue } : {}), noted: o.at || nowIso(), ...(o.source ? { source: o.source } : {}) };
  const next = { ...d, next: d.next + 1, ideas: [...d.ideas, idea] }, P2 = problems(next, ctx);
  if (P2.length) throw new Refused(P2.join("; "));
  return { data: next, idea };
}
function drop(file, id, reason, ctx) {
  const d = read(file), k = d.ideas.findIndex(i => i && i.id === id);
  if (k < 0) throw new Refused(`no idea ${id} in ${file}`);
  if (!reason || !reason.trim()) throw new Refused("a drop needs its reason (a filed idea: the issue it was filed as)");
  const next = { ...d, ideas: d.ideas.filter((_, j) => j !== k) };
  const P = problems(next, ctx); if (P.length) throw new Refused(P.join("; "));
  return { data: next, idea: d.ideas[k] };
}
/* the part a generated element draws, from its id (whiteboard.js genId keys: el.<dsl id>, sys.<slug>, repo.<owner>.<name>), or from the
   generator's parts map where an id was shortened with a hash */
function partOf(id, parts, org) {
  if (parts && parts[id]) return parts[id];
  const m = /^gen-(el|sys|repo)\.(.+)$/.exec(id); if (!m || m[2].includes("~")) return null;
  if (m[1] === "repo") { const i = m[2].indexOf("."); return i > 0 ? `${m[2].slice(0, i)}/${m[2].slice(i + 1)}` : null; }
  return org ? null : m[2];
}
function harvest(file, scope, boardDir, o, ctx) {
  const W = wb(), board = W.readBoard(boardDir), d = read(file), P = problems(d, ctx);
  if (P.length) throw new Refused(`${file} does not pass its check, so nothing is harvested: ${P.slice(0, 3).join("; ")}`);
  if (!SCOPE_RE.test(scope)) throw new Refused(`scope ${JSON.stringify(scope)} is not system:<slug>, supersystem:<slug>, repository or org`);
  if (!board.elements.size) throw new Refused(`no elements read in ${boardDir}`);
  const els = [...board.elements], written = [], leftOut = [], have = new Set(d.ideas.filter(i => i.source && i.source.scope === scope).map(i => i.source.element));
  const arrows = els.filter(([, e]) => e.data && e.data.type === "arrow");
  let data = d;
  els.filter(([id, e]) => !W.isGenerated(id) && e.data && ["shape", "text", "note"].includes(e.data.type) && typeof e.data.text === "string" && e.data.text.trim())
    .sort((a, b) => (a[1].data.y || 0) - (b[1].data.y || 0) || (a[1].data.x || 0) - (b[1].data.x || 0))
    .forEach(([id, e]) => {
      const words = e.data.text.trim();
      if (have.has(id)) { leftOut.push({ element: id, words, why: "already in the file" }); return; }
      const tp = W.textProblems(words, ctx); if (tp.length) { leftOut.push({ element: id, words, why: tp.map(x => x.rule).join(", ") }); return; }
      const ow = ownerOf(words); if (ow) { leftOut.push({ element: id, words, why: `an owner ("${ow}")` }); return; }
      const due = dueOf(words); if (due) { leftOut.push({ element: id, words, why: `a due date ("${due}")` }); return; }
      const concerns = [...new Set(arrows.filter(([, a]) => a.data.from === id || a.data.to === id).map(([, a]) => a.data.from === id ? a.data.to : a.data.from)
        .filter(x => typeof x === "string" && W.isGenerated(x)).map(x => partOf(x, o.parts, ctx.org)).filter(Boolean))];
      let r; try { r = addTo(data, { kind: kindOf(words), text: words, concerns, at: o.at, source: { scope, element: id } }, ctx); }
      catch (err) { leftOut.push({ element: id, words, why: err.message }); return; }
      data = r.data; written.push({ id: r.idea.id, kind: r.idea.kind, element: id, concerns });
    });
  const P2 = problems(data, ctx); if (P2.length) throw new Refused(P2.join("; "));
  return { data, written, leftOut };
}

function main() {
  const args = process.argv.slice(2), cmd = args.shift();
  const usage = "usage: node ideas.js add --file <f> --kind <k> --text <t> [--concerns a,b] [--issue n|owner/repo#n] [--at iso] [--org]\n       node ideas.js drop --file <f> --id <n> --reason <text>\n       node ideas.js harvest --file <f> --scope <scope> --board <dir> [--parts <generated.json>] [--at iso] [--org]\n       node ideas.js check --file <f> [--org]";
  const spec = { add: { valued: ["file", "kind", "text", "concerns", "issue", "at"], flags: ["org"] }, drop: { valued: ["file", "id", "reason"], flags: ["org"] }, harvest: { valued: ["file", "scope", "board", "parts", "at"], flags: ["org"] }, check: { valued: ["file"], flags: ["org"] } }[cmd];
  if (!spec) { console.error(usage); process.exit(cmd === "--help" ? 0 : 2); }
  require(path.join(SKILL, "system", "scripts", "cliargs.js")).strict(args, { usage, ...spec, max: 0 });
  const file = opt(args, "file"); if (!file) { console.error(usage); process.exit(2); }
  const org = isOrgFile(file, args.includes("--org"));
  try {
    const ctx = { org, privates: privatesOf(ownersOf()) };
    if (cmd === "check") { const P = problems(read(file), ctx); P.forEach(p => console.log(`FAIL ${p}`)); console.log(P.length ? `ideas check: ${P.length} problem(s)` : "ideas check: pass"); process.exit(P.length ? 1 : 0); }
    let r;
    if (cmd === "add") {
      const at = opt(args, "at"); if (at != null && !ISO_RE.test(at)) throw new Refused("--at is not a UTC stamp (YYYY-MM-DDTHH:MM:SSZ)");
      const iss = opt(args, "issue"), issue = iss == null ? undefined : org ? iss : Number(iss);
      r = add(file, { kind: opt(args, "kind"), text: opt(args, "text"), concerns: (opt(args, "concerns") || "").split(",").map(s => s.trim()).filter(Boolean), issue, at }, ctx);
      write(file, r.data); console.log(JSON.stringify({ file, added: r.idea }, null, 2));
    } else if (cmd === "drop") {
      r = drop(file, Number(opt(args, "id")), opt(args, "reason"), ctx); write(file, r.data); console.log(JSON.stringify({ file, dropped: r.idea, reason: opt(args, "reason") }, null, 2));
    } else {
      const pf = opt(args, "parts"), parts = pf ? (JSON.parse(fs.readFileSync(pf, "utf8")).parts || {}) : null, at = opt(args, "at");
      if (at != null && !ISO_RE.test(at)) throw new Refused("--at is not a UTC stamp (YYYY-MM-DDTHH:MM:SSZ)");
      r = harvest(file, opt(args, "scope"), opt(args, "board"), { parts, at }, ctx);
      if (r.written.length) write(file, r.data);
      console.log(JSON.stringify({ file, scope: opt(args, "scope"), written: r.written, leftOut: r.leftOut }, null, 2));
    }
  } catch (e) { console.error(`ideas: ${e.message}`); process.exit(e instanceof Refused ? 3 : 1); }
}
if (require.main === module) main();
module.exports = { SCHEMA, KINDS, problems, ideasFor, kindOf, ownerOf, dueOf, partOf, privatesOf, ownersOf, add, addTo, drop, harvest, read, Refused };
