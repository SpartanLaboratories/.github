#!/usr/bin/env node
// The data-only path for state boards (system/RULES.md §10): restamps the system, supersystem and repository state boards a branch touches,
// marks system parts built or planned, updates docs/dashboards/systems.json, re-embeds and checks without a browser pass —
// deterministically and with no reasoning, so the admin team runs it itself at an implementation stage, and inside a landing at the
// pre-merge refresh (facts.premerge: on the issue's branch, at the head the team names, the last commit before the board commit). What needs the code read and the prose written is left to the presenter: the summary's "enrich" line says
// whether, and why.
//   node apply-state.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--at <ISO time>] [--json]
// --event      the request: the protocol's plan-board request of an implementation-stage (or landed) event, or a state-boards request
//              (action "state-boards"; "state-pages", its older name, read alike); its JSON alone, or the message with its fenced json block. Read from it: github, issue, branch,
//              folder (the issue's plan folder, for the title and the board's systems), and facts:
//                systems   the registry slugs the branch touches (default: the issue board's systems, <worktree>/<folder>/plan.json)
//                sha       the commit the boards now show (default: the worktree's HEAD); at the pre-merge refresh the head the team
//                          names; at a restamp after the merge (landed), merge (or sha), the merge commit
//                ref       at the pre-merge refresh the branch (default: the request's branch); at a restamp after the merge, the
//                          default branch the merge is on (required there)
//                built     what the branch has built, each a registry slug, "#<issue>" (every planned system that issue alone plans),
//                planned   or "<dsl path>:<element id>" (paths relative to docs/dashboards), or {dsl, id, tag} / {system}; a DSL element
//                          marked built loses its Planned tag and takes `tag` when given; "planned" sets the Planned tag back
//                version   {slug: version}, a version a system's build moved to
//                title     the issue's title for the "last amended by" note (in the Context section), quoted verbatim; without it, a board
//                          keeps the verbatim title its state.json already holds for the same issue (else one another board in scope holds
//                          for it), and only with none of these takes the folder's name less its number, noted as not the issue's own; one
//                          that names a work level is a defect in the issue, written as it stands and flagged ISSUE TITLE NAMES A WORK
//                          LEVEL: #n in the notes
//                premerge  true for the pre-merge refresh (dashboards-skill/33): every board the branch stamped, and every board in scope,
//                          stamped "<ref> @ <sha>" with no "not yet landed": ref the branch (facts.ref, else the request's branch), sha the
//                          head the team names (facts.sha, else the worktree's HEAD), the last commit before the board commit; the boards
//                          land with the merge, so they say what the merged code is
//                landed    true for a state-boards request that restamps at a landing, after the merge (as the landed event does): the
//                          older flow, kept for a landing that refreshes no state board before its merge
//                enrich    reasons the team already knows the presenter is needed for (passed through)
// --worktree   the worktree the branch is checked out in; the boards are <worktree>/docs/dashboards/
// --repo       the GitHub slug, owner/repo; held to the request's github and the registry's repo
// --at         the time to stamp when the commit's own time cannot be read (default: facts.at, else now)
// --json       print the summary as one JSON object instead of key: value lines
// What it does: stamps every touched system, its supersystem and the repository (registry entry and board) "<branch> @ <sha> · not yet
// landed" (at the pre-merge refresh "<branch> @ <head>", after a merge "<ref> @ <merge>", for every entry stamped with the branch), with the issue as the last amendment; applies the
// built and planned marks to systems.json and to the DSLs — the code's first: a system, or a partPaths part, with a code path present at the
// stamped commit is built, with none present planned; a supersystem once every core subsystem is (statelib.js codeStatus(), system/RULES.md
// §7); the facts decide only what has no code paths — (the boards draw a part planned from its DSL element's Planned tag, or from its
// system's registry status: nothing in a board is edited by hand); restamps each DSL's as-is line; re-embeds state.json, workspace.dsl and
// systems.json into every board that carries them; runs check-board.js --auto --no-browser on every board it wrote. Reads git (HEAD, the
// commit time) and never writes it. Every file is written through a temporary file and a rename, and on any failure every file it wrote
// is put back: exit 1, nothing changed. Exit 0 when applied, when already applied (the same request twice changes nothing), and when
// there is nothing to apply (an event that moves no code, a repository with no docs/dashboards/systems.json); exit 2 on a usage error.
"use strict";
/* a system's board in the registry: "board", or "page" in a registry written before dashboards-skill/33 */
const boardOf = e => e && (typeof e.board === "string" && e.board.trim() ? e.board : typeof e.page === "string" && e.page.trim() ? e.page : null);
const T0 = Date.now();
const fs = require("fs"), path = require("path"), cp = require("child_process");
const L = require("./statelib.js");
const { levelRefs, titleDefect } = require("./levelrefs.js");

const USAGE = "usage: node apply-state.js --event <request.json> --worktree <path> [--repo <owner/repo>] [--at <ISO time>] [--json]";
const args = process.argv.slice(2);
require("./cliargs.js").strict(args, { usage: USAGE, valued: ["event", "worktree", "repo", "at"], flags: ["json"], max: 0 });
const opt = n => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; }, flag = n => args.includes("--" + n);

/* the summary, printed at the end whatever happens */
const S = { result: null, event: null, issue: null, stamp: null, systems: [], applied: [], enrich: [], notes: [], wrote: [], check: null, defects: [], error: null, restored: 0 };
const say = () => {
  S.ms = Date.now() - T0;
  const enrich = S.enrich.length ? "yes" : "no", why = S.enrich.length ? S.enrich : ["the request's facts decide everything it writes"];
  if (flag("json")) { console.log(JSON.stringify({ ...S, enrich, why })); return; }
  [["apply-state", S.result], ["event", S.event], ["issue", S.issue != null ? "#" + S.issue : null], ["stamp", S.stamp], ["systems", S.systems.join(", ") || null],
    ["applied", S.applied.join("; ") || "nothing"], ["enrich", enrich], ["why", why.join("; ")], ["notes", S.notes.join("; ") || null],
    ["wrote", S.wrote.join(", ") || "nothing"], ["check", S.check || "not run"], ["issue defects", S.defects.length ? S.defects.join(" | ") : null], ["error", S.error],
    ["restored", S.error ? `${S.restored} file${S.restored === 1 ? "" : "s"}, as they were` : null], ["time", `${S.ms} ms`]]
    .filter(([, v]) => v != null).forEach(([k, v]) => console.log(`${k}: ${v}`));
};
class Refusal extends Error {}
const refuse = m => { throw new Refusal(m); };

/* Files: every write is staged (its old bytes kept) and atomic (a temporary file, then a rename); rollback() puts every staged file back.
   A rename can meet a file a browser holds open for a moment (Windows): it is retried briefly. */
const staged = new Map();
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function atomicWrite(file, data) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, data);
  for (let i = 0; ; i++) { try { fs.renameSync(tmp, file); return; } catch (e) { if (i >= 20 || !["EPERM", "EBUSY", "EACCES"].includes(e.code)) { try { fs.unlinkSync(tmp); } catch (x) { /* gone */ } throw e; } sleep(25); } }
}
function put(file, text) {
  if (!staged.has(file)) staged.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null);
  const now = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (now && Buffer.compare(now, Buffer.from(text)) === 0) return false;
  atomicWrite(file, text); return true;
}
function rollback() {
  let n = 0;
  for (const [file, old] of staged) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file) : null;
    if (old === null) { if (cur !== null) { fs.rmSync(file, { force: true }); n++; } }
    else if (cur === null || Buffer.compare(cur, old) !== 0) { atomicWrite(file, old); n++; }
  }
  return n;
}
/* a file's text in LF, and the line ending it is written in */
const readText = f => { const t = fs.readFileSync(f, "utf8"); return { text: L.norm(t), eol: t.includes("\r\n") ? "\r\n" : "\n" }; };
const inEol = (t, eol) => eol === "\r\n" ? L.norm(t).replace(/\n/g, "\r\n") : L.norm(t);

/* The request: JSON alone, or a message's fenced json block. */
function readRequest(file) {
  let t; try { t = fs.readFileSync(file, "utf8"); } catch (e) { refuse(`cannot read the request ${file}: ${e.message}`); }
  try { return JSON.parse(t); } catch (e) { /* a message: its json block */ }
  const m = t.match(/```json\s*\n([\s\S]*?)\n\s*```/);
  if (!m) refuse(`the request ${file} is neither JSON nor a message with a fenced json block`);
  try { return JSON.parse(m[1]); } catch (e) { refuse(`the request's json block does not parse: ${e.message}`); }
}
/* git, read only */
const git = (root, a) => { const r = cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8" }); return r.status === 0 ? (r.stdout || "").trim() : null; };
const run = (file, a, cwd) => new Promise(res => { const c = cp.spawn(process.execPath, [file, ...a], { cwd, windowsHide: true }); let o = "", e = "";
  c.stdout.on("data", d => { o += d; }); c.stderr.on("data", d => { e += d; }); c.on("close", s => res({ status: s, stdout: o, stderr: e })); c.on("error", x => res({ status: 1, stdout: o, stderr: String(x) })); });
const HEX = /^[0-9a-f]{7,40}$/, VIS = ["Public", "Internal", "Standalone"];
const iso = d => new Date(d).toISOString().replace(/\.\d+Z$/, "Z");

async function main() {
  const evFile = opt("event"), wt = opt("worktree");
  if (!evFile || !wt) { console.error(`${USAGE}\n(--event and --worktree are required)`); process.exit(2); }
  const req = readRequest(evFile), facts = req.facts && typeof req.facts === "object" ? req.facts : {};
  const action = req.action === "state-pages" ? "state-boards" : req.action || "state-boards", ev = action === "plan-board" ? (req.event || facts.event || null) : "state-boards";
  S.event = ev; S.issue = Number.isInteger(req.issue) ? req.issue : Number.isInteger(facts.issue) ? facts.issue : null;
  if (!["plan-board", "state-boards"].includes(action)) refuse(`the request's action is ${JSON.stringify(action)}, neither plan-board nor state-boards`);
  if (action === "plan-board" && !["implementation-stage", "landed"].includes(ev)) { S.result = "skipped"; S.applied.push(`${ev || "an event"} moves no code: the state boards keep their stamps`); return; }
  const ROOT = path.resolve(wt), DASH = path.join(ROOT, "docs", "dashboards"), REG = path.join(DASH, "systems.json");
  if (!fs.existsSync(REG)) { S.result = "no-dashboards"; S.notes.push(`${ROOT} keeps no docs/dashboards/systems.json: no state boards to stamp`); return; }
  const regFile = readText(REG); let reg; try { reg = JSON.parse(regFile.text); } catch (e) { refuse(`docs/dashboards/systems.json does not parse: ${e.message}`); }
  if (!Array.isArray(reg.systems)) refuse("docs/dashboards/systems.json has no systems list");
  const repoArg = opt("repo");
  if (repoArg && !/^[\w.-]+\/[\w.-]+$/.test(repoArg)) { console.error(`${USAGE}\n(--repo takes the GitHub slug owner/repo; got ${JSON.stringify(repoArg)})`); process.exit(2); }
  [repoArg, req.github].filter(Boolean).forEach(r => { if (reg.repo && r !== reg.repo) refuse(`the registry is ${reg.repo}'s, not ${r}'s`); });
  const bySlug = s => reg.systems.find(x => x.slug === s);

  /* the stamp: the branch and its commit ("not yet landed"); at the pre-merge refresh the branch and the head the team names; at a
     restamp after the merge the default branch and the merge commit */
  const premerge = facts.premerge === true, landed = ev === "landed" || facts.landed === true || premerge;
  const head = git(ROOT, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const branch = req.branch || facts.branch || (head && head !== "HEAD" ? head : null);
  if (!branch) refuse("the request names no branch, and the worktree's HEAD is detached");
  const shaFull = [landed && !premerge ? facts.merge : null, facts.sha, req.sha, landed && !premerge ? null : git(ROOT, ["rev-parse", "HEAD"])].find(x => typeof x === "string" && HEX.test(x));
  if (!shaFull) refuse(landed ? "a landing restamp needs the merge commit (facts.merge or facts.sha)" : "no commit to stamp: facts.sha is missing and the worktree's HEAD cannot be read");
  const sha = shaFull.slice(0, 7), ref = premerge ? (facts.ref || branch) : landed ? (facts.ref || facts.base || req.base || null) : branch;
  if (!ref) refuse("a landing restamp needs the default branch the merge is on (facts.ref)");
  const at = opt("at") || facts.at || req.at || null;
  if (at && isNaN(Date.parse(at))) refuse(`the time ${JSON.stringify(at)} is not an ISO time`);
  const ct = git(ROOT, ["log", "-1", "--format=%ct", shaFull]);
  const date = facts.date && !isNaN(Date.parse(facts.date)) ? facts.date : ct && /^\d+$/.test(ct) ? iso(+ct * 1000) : iso(at ? Date.parse(at) : Date.now());
  const asIs = { ref, sha, date, ...(landed ? {} : { landed: false }) };
  S.stamp = `${ref} @ ${sha} · ${landed ? date : "not yet landed"}`;
  const folder = typeof req.folder === "string" ? req.folder.replace(/\\/g, "/").replace(/\/+$/, "") : null;
  if (folder && (folder.split("/").includes("..") || !/^docs\/plans\//.test(folder))) refuse(`the request's folder ${JSON.stringify(folder)} is not under docs/plans/`);
  /* the title is the issue's, quoted verbatim: never reworded, never elided (GUIDANCE.md §4, §5; admin-team/dashboards-skill/28). Work
     levels are never part of an issue, so a title that names one is a defect in the issue: written as it stands and flagged, ISSUE TITLE
     NAMES A WORK LEVEL: #n, in the summary's notes, for the team to bring to the user to retitle on GitHub */
  /* which title a board's last amendment takes (dashboards-skill/29): facts.title when the event carries it; else the verbatim title the
     board's state.json already holds for the same issue (never overwritten by a folder name); else one another board in scope holds for it;
     only with none of these the folder's name less its number, which is not the issue's own and is noted so */
  const slugTitle = folder ? path.basename(folder).replace(/^\d+-/, "") || null : null;
  const factTitle = typeof facts.title === "string" && facts.title.trim() ? facts.title.replace(/\s+/g, " ").trim() : null;
  if (factTitle && levelRefs(factTitle).length) { S.notes.push(titleDefect({ issue: S.issue, at: "facts.title", title: factTitle, hits: levelRefs(factTitle) })); S.defects.push(`ISSUE TITLE NAMES A WORK LEVEL: #${S.issue != null ? S.issue : "?"}`); }
  const keptTitle = la => la && la.issue === S.issue && typeof la.title === "string" && la.title.trim() && la.title !== slugTitle ? la.title : null;

  /* the systems the branch touches: the facts', else the issue board's; at the pre-merge refresh (and after a merge), also every entry the branch stamped */
  let named = Array.isArray(facts.systems) ? facts.systems : Array.isArray(req.systems) ? req.systems : null;
  if (!named && folder && fs.existsSync(path.join(ROOT, ...folder.split("/"), "plan.json"))) {
    try { const b = JSON.parse(fs.readFileSync(path.join(ROOT, ...folder.split("/"), "plan.json"), "utf8")); if (Array.isArray(b.systems)) { named = b.systems; S.notes.push(`systems from the board ${folder}`); } } catch (e) { refuse(`${folder}/plan.json does not parse: ${e.message}`); }
  }
  const touched = new Set((named || []).filter(x => typeof x === "string"));
  if (landed) reg.systems.filter(e => e.asIs && e.asIs.landed === false && e.asIs.ref === branch).forEach(e => touched.add(e.slug));
  const unknown = [...touched].filter(s => !bySlug(s));
  if (unknown.length) refuse(`BLOCKED — system unresolved: ${unknown.join(", ")} ${unknown.length === 1 ? "is" : "are"} not in docs/dashboards/systems.json (its systems: ${reg.systems.map(e => e.slug).join(", ")})`);

  /* built and planned: registry entries (by slug or by the issue that alone plans them) and DSL elements */
  const flips = new Map(), elems = [];
  const dslOwner = f => reg.systems.find(e => typeof e.dsl === "string" && e.dsl.replace(/^\.?\//, "") === f);
  const addEntry = (e, planned) => { flips.set(e.slug, planned ? "planned" : "built"); Object.entries(e.c4 || {}).forEach(([f, id]) => elems.push({ dsl: f, id, planned, tag: null, why: e.slug })); };
  const resolve = (x, planned) => {
    if (x && typeof x === "object") {
      if (x.system) { const e = bySlug(x.system); if (!e) refuse(`built/planned names the system ${x.system}, which the registry does not list`); return addEntry(e, planned); }
      if (x.dsl && x.id) { elems.push({ dsl: String(x.dsl).replace(/^\.?\//, ""), id: x.id, planned, tag: VIS.includes(x.tag) ? x.tag : null, why: null }); if (x.tag && !VIS.includes(x.tag)) refuse(`the tag ${x.tag} is not Public, Internal or Standalone`); return; }
      refuse(`built/planned holds ${JSON.stringify(x)}: an entry is {system} or {dsl, id, tag}`);
    }
    if (typeof x !== "string") refuse(`built/planned holds ${JSON.stringify(x)}`);
    const m = x.match(/^#(\d+)$/);
    if (m) {
      const n = +m[1], hits = reg.systems.filter(e => e.plannedBy && (e.plannedBy.issue === n || (Array.isArray(e.plannedBy.units) && e.plannedBy.units.length && e.plannedBy.units.every(u => u.subIssue === n))));
      if (!hits.length) S.notes.push(`${x}: no system in the registry is planned by that issue alone`);
      return hits.forEach(e => addEntry(e, planned));
    }
    if (bySlug(x)) return addEntry(bySlug(x), planned);
    const c = x.lastIndexOf(":");
    if (c > 0 && /\.dsl$/.test(x.slice(0, c))) return elems.push({ dsl: x.slice(0, c).replace(/^\.?\//, ""), id: x.slice(c + 1), planned, tag: null, why: null });
    refuse(`built/planned names ${JSON.stringify(x)}: neither a registry slug, "#<issue>" nor "<dsl path>:<element id>"`);
  };
  (Array.isArray(facts.built) ? facts.built : []).forEach(x => resolve(x, false));
  (Array.isArray(facts.planned) ? facts.planned : []).forEach(x => resolve(x, true));
  /* Built or planned is the code's (system/RULES.md §7, §10): a system with code paths is built while one is present at the stamped commit,
     a part with code paths of its own (partPaths) likewise; a supersystem is built once every core subsystem is. What the code decides
     overrides a fact that says otherwise; facts.built and facts.planned decide only what has no code paths recorded. */
  const code = L.codeStatus(reg, ROOT, shaFull), said = new Map(flips);
  code.systems.forEach((d, slug) => { const e = bySlug(slug);
    if (said.has(slug) && said.get(slug) !== d.status) S.notes.push(`${slug}: the facts say ${said.get(slug)}, the code says ${d.status} (${d.status === "built" ? "present: " + d.present.join(", ") : "none of " + d.missing.join(", ") + " is in the tree"}): the code decides`);
    if (d.status !== e.status || said.has(slug)) addEntry(e, d.status === "planned");
    if (d.status === "built" && d.missing.length) S.enrich.push(`${slug} is built, but its registry paths ${d.missing.join(", ")} are not in the tree: the presenter corrects its paths in systems.json`); });
  code.parts.forEach(x => { if (!x.dsl) return; const was = elems.find(y => y.dsl === x.dsl && y.id === x.id);
    if (was && was.planned !== x.planned) S.notes.push(`${x.dsl}:${x.id}: the facts say ${was.planned ? "planned" : "built"}, the code says ${x.planned ? "planned" : "built"}: the code decides`);
    elems.push({ dsl: x.dsl, id: x.id, planned: x.planned, tag: null, why: "code" }); });
  /* the supersystems, after their subsystems: built once every core subsystem is built (the flips above included) */
  const after0 = s => flips.has(s) ? flips.get(s) : code.statusOf(s);
  reg.systems.filter(e => e.kind === "supersystem").forEach(e => {
    const kids = reg.systems.filter(c => c.parent === e.slug && c.kind !== "repo"), un = kids.filter(c => typeof c.core !== "boolean"), core = kids.filter(c => c.core === true);
    const near = touched.has(e.slug) || kids.some(c => touched.has(c.slug) || flips.has(c.slug));
    if (!kids.length) return;
    if (un.length) { if (near) S.enrich.push(`${e.slug}: ${un.map(c => c.slug).join(", ")} ${un.length === 1 ? "is" : "are"} not classified core or optional: the presenter records "core" in systems.json from its architecture; its status is left ${e.status}`); return; }
    if (!core.length) { if (near) S.enrich.push(`${e.slug}: none of its subsystems is core: its status is left ${e.status}`); return; }
    const st = core.every(c => after0(c.slug) === "built") ? "built" : "planned";
    if (st !== e.status) addEntry(e, st === "planned"); });
  flips.forEach((_, s) => touched.add(s));
  elems.forEach(x => { const o = dslOwner(x.dsl); if (!o) refuse(`${x.dsl} is no board's workspace.dsl in the registry`); touched.add(o.slug); });
  if (facts.version != null && (typeof facts.version !== "object" || Array.isArray(facts.version))) refuse("facts.version names a version per system: {\"<slug>\": \"<version>\"}");
  Object.keys(facts.version || {}).forEach(s => { if (!bySlug(s)) refuse(`facts.version names ${s}, which the registry does not list`); touched.add(s); });
  if (!touched.size) { S.result = "no-systems"; S.enrich.push("the request names no system the branch touches (facts.systems) and the issue's board records none: the presenter decides which"); return; }

  /* every board that shows a touched system: its own, its supersystems', the repository's */
  const scope = new Set(touched);
  reg.systems.filter(e => e.kind === "repo" || (e.kind === "supersystem" && [...touched].some(s => L.isAncestor(reg.systems, e.slug, s)))).forEach(e => scope.add(e.slug));
  S.systems = [...touched];

  /* the registry */
  const edits = {};
  /* A planned supersystem whose board shows its built parts (dashboards-skill/29: "built in part") is stamped with them: the board names the
     supersystem in its state, and a touched part that is built and shares the board restamps it, as the board now shows that part's code. */
  const statusNow = c => flips.get(c.slug) || c.status;
  const builtInPart = (e, systems) => e.kind === "supersystem" && !!boardOf(e)
    && systems.some(c => c.slug !== e.slug && boardOf(c) === boardOf(e) && touched.has(c.slug) && statusNow(c) === "built");
  for (const slug of scope) {
    const e = bySlug(slug), f = {}, flip = flips.get(slug), status = flip || e.status;
    if (flip && flip !== e.status) { f.status = flip; S.applied.push(`${slug} ${flip}`); }
    if (status === "planned" && !builtInPart(e, reg.systems)) { if (touched.has(slug) && !flip) S.notes.push(`${slug} is planned: nothing built to stamp`); if (Object.keys(f).length) edits[slug] = f; continue; }
    if (JSON.stringify(e.asIs || null) !== JSON.stringify(asIs)) f.asIs = asIs;
    if (S.issue != null) { const la = { issue: S.issue, sha, ...(e.lastAmended && e.lastAmended.issue === S.issue && e.lastAmended.note ? { note: e.lastAmended.note } : {}) }; if (JSON.stringify(e.lastAmended || null) !== JSON.stringify(la)) f.lastAmended = la; }
    const v = (facts.version || {})[slug]; if (v != null && v !== e.version) { f.version = String(v); S.applied.push(`${slug} version ${v}`); S.enrich.push(`${slug} moved to ${v}: the Compatibility & versioning card says it in the presenter's words`); }
    if (Object.keys(f).length) edits[slug] = f;
  }
  const regEdit = Object.keys(edits).length ? L.editRegistryText(regFile.text, reg, edits, { updated: date.slice(0, 10) }) : { text: regFile.text, reg, inPlace: true };
  if (!regEdit.inPlace) S.notes.push("systems.json rewritten whole: its layout could not be kept");
  const R = regEdit.reg, after = s => R.systems.find(x => x.slug === s);
  if (Object.keys(edits).length) S.applied.push(`systems.json: ${Object.keys(edits).filter(s => edits[s].asIs).length} stamped`);

  /* the enrich reasons the marks raise */
  flips.forEach((st, s) => { const e = bySlug(s); if (st === e.status) return;
    S.enrich.push(`${s} marked ${st}: what its board and the shared boards say of it (descriptions, panels, Guarantees, Context${st === "built" && !(e.paths || []).length ? ", its code paths in systems.json" : ""}) is the presenter's to write from the code`);
    if (st === "built" && !boardOf(e)) S.notes.push(`${s} is built on the branch and has no board: one is written only when the repository gives it one`);
    const p = e.parent && after(e.parent); if (st === "built" && p && p.status === "planned") S.enrich.push(`${s} is built while its parent ${p.slug} is still planned: name ${p.slug} in built once it is`); });
  (Array.isArray(facts.enrich) ? facts.enrich : []).filter(x => typeof x === "string" && x.trim()).forEach(x => S.enrich.push(x.trim()));

  /* the boards */
  const pages = [];
  const regText = L.norm(regEdit.text).trim();
  /* a verbatim title for this issue another board in scope already holds (its state.json, else its state block) */
  let sharedTitle = null;
  if (!factTitle && S.issue != null) for (const e of R.systems.filter(x => scope.has(x.slug) && boardOf(x))) {
    const file = path.join(DASH, ...boardOf(e).split("/")), stFile = path.join(path.dirname(file), "state.json");
    let st = null; try { st = JSON.parse(fs.existsSync(stFile) ? fs.readFileSync(stFile, "utf8") : fs.existsSync(file) ? L.blockText(L.norm(fs.readFileSync(file, "utf8")), "state") || "null" : "null"); } catch (x) { /* refused below, page by page */ }
    if (st && keptTitle(st.lastAmended)) { sharedTitle = keptTitle(st.lastAmended); break; }
  }
  let slugUsed = false;
  for (const e of R.systems.filter(x => boardOf(x))) {
    const file = path.join(DASH, ...boardOf(e).split("/")), rel = path.relative(ROOT, file).split(path.sep).join("/");
    const inScope = scope.has(e.slug) && (e.status !== "planned" || builtInPart(e, R.systems));
    if (!fs.existsSync(file)) { if (inScope) S.enrich.push(`${rel} is in the registry but not on disk: the presenter writes it`); continue; }
    const pg = readText(file); let html = pg.text, wrote = false;
    const hasState = L.blockText(html, "state") != null, hasSystems = L.blockText(html, "systems") != null;
    const myElems = elems.filter(x => typeof e.dsl === "string" && x.dsl === e.dsl.replace(/^\.?\//, ""));
    if (inScope && !hasState) {
      S.enrich.push(`${rel} is on a template older than the state block: the presenter brings it onto the template, then its stamp${myElems.length ? " and its parts" : ""}`);
      if (hasSystems && L.blockText(html, "systems") !== regText) { html = L.embedInto(html, "systems", regText); S.notes.push(`${rel}: its registry copy re-embedded only`); put(file, inEol(html, pg.eol)) && S.wrote.push(rel); pages.push(file); }
      continue;
    }
    if (inScope) {
      const stFile = path.join(path.dirname(file), "state.json"), had = fs.existsSync(stFile);
      const st0 = had ? readText(stFile) : { text: L.blockText(html, "state"), eol: pg.eol };
      let s; try { s = JSON.parse(st0.text); } catch (x) { refuse(`${rel}'s state does not parse: ${x.message}`); }
      /* a board several registry entries share (a system board that carries its parts, a supersystem's board for its built parts) names one
         of them, its owner, in its state: the board is stamped when the owner's entry is reached, never under a part's slug */
      if (s.slug !== e.slug) {
        const owner = R.systems.find(x => x.slug === s.slug && boardOf(x) === boardOf(e));
        if (!owner) refuse(`${rel}'s state names ${s.slug}, the registry ${e.slug}`);
        if (!scope.has(owner.slug) || !(owner.status !== "planned" || builtInPart(owner, R.systems))) S.notes.push(`${rel} shows ${e.slug}, but its state names ${owner.slug}, which is not stamped here`);
        continue;
      }
      const old = s.asIs || {}, la = s.lastAmended || {};
      if (!s.written && old.sha) s.written = { sha: old.sha };
      s.asIs = asIs;
      if (S.issue != null) { const title = factTitle || keptTitle(la) || sharedTitle || slugTitle; if (title && title === slugTitle && !factTitle) slugUsed = true;
        s.lastAmended = { issue: S.issue, ...(title ? { title } : {}), sha }; }
      if (e.kind === "system") s.version = e.version == null ? null : e.version;
      const stText = L.stateText(s);
      if (put(stFile, inEol(stText, st0.eol))) S.wrote.push(path.relative(ROOT, stFile).split(path.sep).join("/"));
      if (!had) S.notes.push(`${rel}: state.json written beside it from its state block`);
      if (L.blockText(html, "state") !== stText.trim()) { html = L.embedInto(html, "state", stText); wrote = true; }
      /* its DSL: the marks, then the as-is line */
      const dslFile = path.join(DASH, ...(e.dsl || path.posix.join(path.posix.dirname(boardOf(e)), "workspace.dsl")).split("/"));
      if (fs.existsSync(dslFile)) {
        const d0 = readText(dslFile); let t = d0.text;
        myElems.forEach(x => {
          const el = L.dslElements(t).find(y => y.id === x.id);
          if (!el) { S.enrich.push(`${x.id} is not in ${e.dsl}: the presenter adds the part it names`); return; }
          const nt = L.setPlannedTag(t, x.id, x.planned, x.tag ? [x.tag] : []);
          if (nt == null) return;
          if (nt !== t) { t = nt; S.applied.push(`${e.dsl}: ${x.id} ${x.planned ? "planned" : "built"}`);
            const now = L.dslElements(t).find(y => y.id === x.id), par = now.parent && L.dslElements(t).find(y => y.id === now.parent);
            if (!x.planned) {
              if (!x.why) S.enrich.push(`${x.id} marked built in ${e.dsl}: what the board says of it (its description, the panels, the Guarantees) is the presenter's to write from the code`);
              if (now.type === "component" && !now.tags.some(g => VIS.includes(g))) S.enrich.push(`${x.id} is built with no Public, Internal or Standalone tag in ${e.dsl}: the presenter sets it`);
              if (par && par.tags.includes("Planned")) S.enrich.push(`${x.id} is built inside ${par.id}, which ${e.dsl} still tags Planned`);
            } } });
        const rs = L.restampDsl(t, old.sha, asIs, old.ref); t = rs.text;
        if (!rs.line) S.notes.push(`${e.dsl}: no "// As-is at <repo> <ref> <sha> (<date>)" line to restamp`);
        if (put(dslFile, inEol(t, d0.eol))) S.wrote.push(path.relative(ROOT, dslFile).split(path.sep).join("/"));
        if (L.blockText(html, "dsl") != null && L.blockText(html, "dsl") !== L.norm(t).trim()) { html = L.embedInto(html, "dsl", t); wrote = true; }
      } else if (myElems.length) refuse(`${e.dsl} is not on disk`);
      if (landed && s.written && s.written.sha !== old.sha) S.enrich.push(`${rel}: its panels were written at ${s.written.sha}, before the branch's last stamp ${old.sha}: the pre-merge refresh reads them again at the merge`);
    }
    if (hasSystems && L.blockText(html, "systems") !== regText) { html = L.embedInto(html, "systems", regText); wrote = true; }
    if (wrote && put(file, inEol(html, pg.eol))) S.wrote.push(rel);
    if (inScope || wrote) pages.push(file);
  }
  if (slugUsed) S.notes.push(`lastAmended.title "${slugTitle}" taken from the folder's name: no facts.title and no title on record for #${S.issue}; it is not the issue's own, so the presenter quotes the issue's title verbatim`);
  if (put(REG, inEol(regEdit.text, regFile.eol))) S.wrote.unshift("docs/dashboards/systems.json");
  if (S.wrote.length) S.applied.push(`stamped ${S.stamp}`);

  /* check-board.js without a browser on every board in scope, at once */
  const checker = path.join(__dirname, "check-board.js");
  const cks = await Promise.all(pages.map(p => run(checker, [p, "--auto", "--no-browser", "--features-as-notes"], ROOT)));
  /* a board that lags its template is no reason to refuse the stamp: its missing features are the presenter's, who splices it onto the
     template at the pre-merge refresh (system/scripts/splice.js) */
  cks.forEach((c, i) => { const miss = (c.stdout.match(/^CHECK note: FEATURE MISSING: .*$/gm) || []).length; if (miss) S.enrich.push(`${path.relative(ROOT, pages[i]).split(path.sep).join("/")} lags its template (${miss} feature${miss === 1 ? "" : "s"} missing): the presenter splices it onto the template (system/scripts/splice.js) at the pre-merge refresh`); });
  const bad = cks.map((c, i) => [c, pages[i]]).filter(([c]) => c.status !== 0);
  if (bad.length) { S.check = "FAIL: " + bad.map(([c, p]) => `${path.relative(ROOT, p).split(path.sep).join("/")}: ${(c.stdout.split(/\r?\n/).filter(l => /^CHECK .*[A-Z]{4,} [A-Z]{2,}|^FAIL/.test(l)).slice(0, 4).join(" | ")) || (c.stderr || "").trim().split(/\r?\n/)[0]}`).join(" ; "); throw new Error("check-board.js failed on a board it would write"); }
  const deferred = cks.map(c => (c.stdout.match(/browser pass deferred \(([^)]+)\)/) || [])[1]).filter(Boolean);
  S.check = pages.length ? `pass, no browser (${pages.length} board${pages.length === 1 ? "" : "s"}; browser pass deferred to the presenter's next look: ${[...new Set(deferred)].join(", ") || "none"})` : "no board to check";
  S.result = S.wrote.length ? "ok" : "duplicate";
  if (!S.wrote.length) S.applied.push("already applied: nothing written");
}

main().then(() => { say(); process.exit(0); }, e => {
  S.result = "failed"; S.error = e.message;
  try { S.restored = rollback(); } catch (x) { S.error += `; the rollback failed too: ${x.message}`; }
  S.enrich.unshift("the request was not applied: the presenter applies it");
  say(); process.exit(1);
});
