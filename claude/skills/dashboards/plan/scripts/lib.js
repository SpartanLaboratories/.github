// Shared helpers for the plan-set scripts (new.js, embed.js, check.js, board.js). Not a command.
"use strict";
const fs = require("fs"), path = require("path");

/* The repository root: --root <dir>, else the current directory. It must hold docs/ (a plan set lives under docs/plans/). */
function repoRoot(args) {
  const i = args.indexOf("--root");
  const root = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : process.cwd());
  if (!fs.existsSync(path.join(root, "docs"))) throw new Error(`${root} has no docs/ folder: run from the repository root or pass --root <repo>`);
  return root;
}
const opt = (args, name, dflt) => { const i = args.indexOf("--" + name); return i >= 0 && args[i + 1] != null && !args[i + 1].startsWith("--") ? args[i + 1] : dflt; };
const flag = (args, name) => args.includes("--" + name);

/* The registry's colour slots, computed exactly as the system pages compute them (system/template/supersystem.html, sysColour):
   the systems in registry order without the repo entry; a top-level system is one whose parent is not itself such a system;
   tops take slots 1..6 in order, a seventh and later get 0 (neutral); a child takes its top-level ancestor's slot. The repo
   entry itself, when a row names it, is neutral (slot 0). */
function registry(root) {
  const p = path.join(root, "docs", "dashboards", "systems.json");
  if (!fs.existsSync(p)) return null;
  const reg = JSON.parse(fs.readFileSync(p, "utf8"));
  const all = reg.systems || [], systems = all.filter(s => s.kind !== "repo");
  const by = slug => systems.find(s => s.slug === slug);
  const top = slug => { let s = by(slug); while (s && by(s.parent)) s = by(s.parent); return s; };
  const tops = systems.filter(s => !by(s.parent));
  const pageOf = s => s.page ? "docs/dashboards/" + s.page : null;
  const info = slug => {
    const s = by(slug);
    if (!s) { const r = all.find(x => x.slug === slug); return r ? { slug, name: r.name, slot: 0, top: r.name, status: r.status || "built", page: pageOf(r) } : null; }
    const t = top(slug), i = tops.indexOf(t);
    return { slug, name: s.name, slot: i >= 0 && i < 6 ? i + 1 : 0, top: t ? t.name : s.name, status: s.status, page: pageOf(s) };
  };
  return { reg, info };
}

/* GitHub's heading anchors (github-slugger): lower case, punctuation dropped, spaces to hyphens, duplicates numbered. */
function headingSlugs(md) { return new Set(mdHeadings(md).map(h => h.slug)); }
/* Every heading of a Markdown text outside fenced blocks: [{ slug, level, text, line }], line the 0-based line index. */
function mdHeadings(md) {
  // A fence closes only on a line of the same character, at least as long as its opener, with nothing after it (CommonMark):
  // a ``` inside a ```` block (a diff of a Markdown file, say) is content, not a close.
  const seen = {}, out = []; let fence = null;
  String(md).split(/\r?\n/).forEach((l, line) => {
    const f = l.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null; return; }
    if (f && !(f[1][0] === "`" && f[2].includes("`"))) { fence = f[1]; return; }
    const m = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/); if (!m) return;
    let s = m[2].replace(/<[^>]+>/g, "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
    const base = s; if (seen[base] != null) { seen[base]++; s = base + "-" + seen[base]; } else seen[base] = 0;
    out.push({ slug: s, level: m[1].length, text: m[2], line });
  });
  return out;
}

/* ---------- Statements' references and their excerpts (plan/RULES.md §2, "Statements") ----------
   A statement's ref is a relative link to a section of a Markdown file in the tree, "plan.md#5-design" (GitHub's heading anchor).
   sectionOf() reads that section: its heading, its first paragraph (the first block of prose under the heading, fenced code and tables
   skipped, Markdown links and emphasis reduced to their text, one line, at most 600 characters) and a hash of the whole section, from
   its heading to the next heading of the same or a higher level, line endings and trailing spaces normalised. The paragraph is what the
   page shows, so a work level in it (GUIDANCE.md §4) is elided ("…"); the hash is of the section as written. */
const STMT_REF = /^((?:\.\.\/|\.\/)?(?:[\w.-]+\/)*[\w.-]+\.md)#([\w\p{L}\p{N}-]+)$/u;
const parseRef = ref => { const m = typeof ref === "string" ? STMT_REF.exec(ref.trim()) : null; return m ? { file: m[1], anchor: m[2] } : null; };
function sectionOf(md, anchor) {
  const hs = mdHeadings(md), i = hs.findIndex(h => h.slug === anchor); if (i < 0) return null;
  const h = hs[i], lines = String(md).replace(/\r\n/g, "\n").split("\n"), end = (hs.slice(i + 1).find(x => x.level <= h.level) || { line: lines.length }).line;
  const body = lines.slice(h.line, end).map(l => l.replace(/\s+$/, "")), text = body.join("\n").replace(/\n+$/, "");
  const hash = require("crypto").createHash("sha256").update(text).digest("hex").slice(0, 12);
  /* the first paragraph: up to the first heading of any level below this one */
  const own = lines.slice(h.line + 1, (hs[i + 1] || { line: lines.length }).line);
  let para = [], fence = null;
  for (const l of own) {
    const f = l.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2].trim()) fence = null; continue; }
    if (f) { if (para.length) break; fence = f[1]; continue; }
    if (!l.trim()) { if (para.length) break; continue; }
    if (/^\s*\|/.test(l) || /^\s*<!--/.test(l)) { if (para.length) break; continue; }
    para.push(l.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, () => para.length ? "· " : ""));
  }
  let p = para.join(" ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/\s+/g, " ").trim();
  const { levelRefs } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));
  levelRefs(p).forEach(hit => { p = p.split(hit).join("…"); });
  if (p.length > 600) p = p.slice(0, 600).replace(/\s+\S*$/, "") + " …";
  return { heading: h.text.replace(/\s+/g, " ").trim(), paragraph: p, hash };
}
/* The label a reference shows, "(§4.2)": the statement's own label, else the heading's leading section number ("4.2", "A-3", "T-1"),
   else the heading itself (shortened); until an excerpt is copied, the section number its anchor names (refNumber, below: read from
   the referenced file's headings, or from the anchor alone and marked "?"), else the anchor. The page derives it the same way
   (stmtLabel()). */
const HEAD_NUM = /^((?:\d+\.)*\d+|[A-Z][A-Za-z0-9]?-[A-Za-z0-9]+)\.?(?=\s|$)/;
function refLabel(s) {
  if (s && typeof s.label === "string" && s.label.trim()) return s.label.trim();
  const h = s && s.excerpt && s.excerpt.heading, m = h && HEAD_NUM.exec(h);
  if (m) return "§" + m[1];
  if (h) return "§ " + (h.length > 32 ? h.slice(0, 31).replace(/\s+\S*$/, "") + "…" : h).replace(/`/g, "");
  const n = refNumberShown(s); if (n) return n.label + (n.from === "anchor" ? "?" : "");
  const r = parseRef(s && s.ref); return r ? "§ " + r.anchor : "§";
}
/* The section number a reference's anchor names, before its excerpt is copied (admin-team/dashboards-skill/23). GitHub's anchor drops the
   dots of a numbered heading ("4.2 The fix" → "42-the-fix"), so "42-…" may be §4.2 or §42. When the referenced Markdown is reachable
   from the board's folder, its headings decide: the numbered heading whose number, its dots dropped, leads the anchor ("4.2" for
   "42-…"; "A-3" for "a-3-…"), the one sharing most of the anchor where several do; heading numbers win. Only when the file is not there
   (or none of its numbered headings fits) is the anchor's leading number taken as it stands, and marked: { label: "§42", from: "anchor" },
   which the page shows "§42?". Returns { label, from: "headings" | "anchor" }, or null when the anchor leads with no number. */
function refNumberOf(dir, ref) {
  const r = parseRef(ref); if (!r) return null;
  const file = path.resolve(dir, r.file), root = treeRoot(dir) || path.resolve(dir);
  let md = null; if (!path.relative(root, file).startsWith("..")) { try { md = fs.readFileSync(file, "utf8"); } catch (e) { /* not there */ } }
  if (md != null) {
    const shared = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
    const fits = mdHeadings(md).map(h => { const m = HEAD_NUM.exec(String(h.text).replace(/<[^>]+>/g, "").trim()); return m ? { num: m[1], key: m[1].toLowerCase().replace(/\./g, ""), slug: h.slug } : null; })
      .filter(c => c && (r.anchor === c.key || r.anchor.startsWith(c.key + "-")));
    if (fits.length) { fits.sort((a, b) => shared(b.slug, r.anchor) - shared(a.slug, r.anchor) || b.key.length - a.key.length); return { label: "§" + fits[0].num, from: "headings" }; }
  }
  const lead = /^(\d+)(?=-|$)/.exec(r.anchor);
  return lead ? { label: "§" + lead[1], from: "anchor" } : null;
}
/* the refNumber a statement carries for its current reference (embed.js writes it; a stale one, for another ref, is not shown), else the
   anchor's leading number, marked: what the page shows when no file could be read */
function refNumberShown(s) {
  const ref = s && typeof s.ref === "string" ? s.ref.trim() : "", n = s && s.refNumber;
  if (n && typeof n === "object" && n.ref === ref && typeof n.label === "string" && /^§/.test(n.label)) return { label: n.label, from: n.from === "headings" ? "headings" : "anchor" };
  const r = parseRef(ref), lead = r && /^(\d+)(?=-|$)/.exec(r.anchor); return lead ? { label: "§" + lead[1], from: "anchor" } : null;
}
/* Every statement on a board that carries a reference: { s, at, row, col }. */
function statementRefs(plan) {
  const out = [];
  (Array.isArray(plan && plan.rows) ? plan.rows : []).forEach((r, i) => {
    if (!r || typeof r !== "object") return;
    stmtList(r.verdict).forEach((s, j) => out.push({ s, at: `rows[${i}] (${r.id}).verdict.statements[${j}]`, row: r, col: "verdict" }));
    stmtList(r.asBuilt).forEach((s, j) => out.push({ s, at: `rows[${i}] (${r.id}).asBuilt.statements[${j}]`, row: r, col: "built" }));
  });
  return out.filter(x => x.s.ref != null);
}
/* The section a reference names, read from the tree: { file (absolute), section } or { error }. The file must be a Markdown file in the
   board's tree (never outside it). */
function readRef(dir, ref) {
  const r = parseRef(ref); if (!r) return { error: "not a relative link to a Markdown section (<file>.md#<heading-anchor>)" };
  const file = path.resolve(dir, r.file), root = treeRoot(dir) || path.resolve(dir);
  if (path.relative(root, file).startsWith("..")) return { error: `${r.file} is outside the board's tree` };
  let md; try { md = fs.readFileSync(file, "utf8"); } catch (e) { return { error: `${r.file} does not exist from this folder` }; }
  const section = sectionOf(md, r.anchor);
  return section ? { file, section } : { error: `${r.file} has no heading #${r.anchor}` };
}
/* Copy each statement's excerpt (embed.js runs it before embedding, and apply-event.js with it): a statement whose reference resolves and
   that has no excerpt, or one copied from another reference (excerpt.ref differs), gets the section's heading, first paragraph and hash.
   An excerpt already copied for the same reference is kept, so a verdict is written once: when the plan section changes later, check.js
   warns (excerptDrift()) and the presenter decides; opts.refresh re-copies every excerpt (embed.js --refresh-excerpts). Returns one line
   per change. */
function copyExcerpts(plan, dir, opts) {
  const changes = [], refresh = !!(opts && opts.refresh);
  statementRefs(plan).forEach(x => {
    const ref = String(x.s.ref).trim();
    copyOne(x, ref);
    /* the reference's section number until an excerpt is copied (refNumberOf()); gone once one is */
    const e2 = x.s.excerpt, has = e2 && typeof e2 === "object" && e2.ref === ref, want = has ? null : refNumberOf(dir, ref), next2 = want ? { ref, ...want } : null;
    if (JSON.stringify(x.s.refNumber === undefined ? null : x.s.refNumber) === JSON.stringify(next2)) return;
    if (next2) { x.s.refNumber = next2; changes.push(`${x.at}: no excerpt of ${ref} yet; its section number ${next2.label} read from ${next2.from === "headings" ? "the file's headings" : "the anchor alone (marked: the file is not there)"}`); }
    else { delete x.s.refNumber; changes.push(`${x.at}: its section number dropped: the excerpt names it`); }
  });
  function copyOne(x, ref) {
    const e = x.s.excerpt;
    if (!refresh && e && typeof e === "object" && e.ref === ref) return;
    const got = readRef(dir, ref); if (got.error) return;
    const next = { ref, heading: got.section.heading, paragraph: got.section.paragraph, hash: got.section.hash };
    if (JSON.stringify(e || null) === JSON.stringify(next)) return;
    x.s.excerpt = next; changes.push(`${x.at}: excerpt of ${ref} ${e ? "re-copied" : "copied"} (${got.section.hash})`);
  }
  return changes;
}
/* The references whose section has changed, or gone, since the excerpt was copied (check.js warns on each): [{ at, ref, kind, want }],
   kind "missing" (no excerpt yet), "changed" (the section's hash differs), "gone" (the file or the heading is not there). */
function excerptDrift(plan, dir) {
  return statementRefs(plan).map(x => {
    const ref = String(x.s.ref).trim(), got = readRef(dir, ref), e = x.s.excerpt;
    if (got.error) return { at: x.at, ref, kind: "gone", why: got.error };
    if (!e || typeof e !== "object" || e.ref !== ref) return { at: x.at, ref, kind: "missing" };
    return e.hash !== got.section.hash ? { at: x.at, ref, kind: "changed", have: e.hash, want: got.section.hash, heading: got.section.heading } : null;
  }).filter(Boolean);
}
/* Everything embed.js resolves from the folders on disk before it embeds a plan board: the issue links and the units' runs
   (linkIssueBoards()) and the statements' excerpts (copyExcerpts()). Returns one line per change. */
function resolveBoard(plan, dir, opts) { return [...linkIssueBoards(plan, dir), ...linkShared(plan, dir), ...copyExcerpts(plan, dir, opts)]; }
/* The shared pages a board links (GUIDANCE.md §5; plan/RULES.md §1, "Links"), from the files on disk: the committed work board
   (workBoard, docs/plans/index.html), the repository page (repoPage, docs/dashboards/index.html) and each of the board's systems'
   pages (pages, by slug), each relative to the board's folder and present only while its file exists, so the page never links a
   missing file. embed.js writes them at every embed; check.js fails one whose file is gone. */
function sharedLinks(plan, dir) {
  const root = treeRoot(dir); if (!root || !plan) return {};
  const rel = f => path.relative(path.resolve(dir), path.join(root, ...f.split("/"))).split(path.sep).join("/"), want = {};
  if (fs.existsSync(path.join(root, "docs", "plans", "index.html"))) want.workBoard = rel("docs/plans/index.html");
  if (fs.existsSync(path.join(root, "docs", "dashboards", "index.html"))) want.repoPage = rel("docs/dashboards/index.html");
  const pages = {}; (Array.isArray(plan.systems) ? plan.systems : []).forEach(s => { if (s && typeof s.slug === "string" && typeof s.page === "string" && s.page.trim() && !/^[a-z]+:/i.test(s.page) && fs.existsSync(path.join(root, ...s.page.split("/")))) pages[s.slug] = rel(s.page); });
  if (Object.keys(pages).length) want.pages = pages;
  return want;
}
function linkShared(plan, dir) { if (!plan) return []; const want = sharedLinks(plan, dir); if (JSON.stringify(plan.links === undefined ? null : plan.links) === JSON.stringify(want)) return [];
  const was = plan.links; plan.links = want; return [`links: ${was === undefined ? "unset" : JSON.stringify(was)} → ${JSON.stringify(want)}`]; }

/* The embedded block of a page: <script type="application/json" id="<id>"> … </script>. */
const openTag = id => `<script type="application/json" id="${id}">`;
function readBlock(html, id) {
  const OPEN = openTag(id), a = html.indexOf(OPEN), b = a < 0 ? -1 : html.indexOf("</script>", a + OPEN.length);
  if (a < 0 || b < 0) return null;
  return html.slice(a + OPEN.length, b);
}
function writeBlock(html, id, json) {
  const OPEN = openTag(id), a = html.indexOf(OPEN);
  if (a < 0) throw new Error(`no <script type="application/json" id="${id}"> block`);
  const b = html.indexOf("</script>", a + OPEN.length);
  if (b < 0) throw new Error(`unterminated ${id} block`);
  // "</script" inside a JSON string would end the block early; "<\/script" is the same string once parsed.
  const body = "\n" + json.replace(/<\/script/gi, "<\\/script").replace(/\s*$/, "") + "\n";
  return html.slice(0, a + OPEN.length) + body + html.slice(b);
}

/* Every plan.json under docs/plans/, with its folder relative to the repository root. */
function findPlans(root) {
  const base = path.join(root, "docs", "plans"), found = [];
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".") || d.name === "research" || d.name === "superseded") return;
    const p = path.join(dir, d.name);
    if (fs.existsSync(path.join(p, "plan.json"))) found.push({ dir: p, folder: path.relative(root, p).split(path.sep).join("/") });
    walk(p);
  });
  if (fs.existsSync(base)) walk(base);
  return found;
}

/* A sub-issue's own board, seen from its tracking board's folder `dir` (plan/RULES.md §1, "Links to a sub-issue"): the unit's
   folder when it is a relative folder holding dashboard.html, else the folder directly inside the tracking folder named
   <issue>-<slug> that holds one. Returns { board, folder } as paths relative to `dir` ("61-build-logic/dashboard.html",
   "61-build-logic/"), or null when no board exists in this tree, so a board link is made only to a file that exists. */
function subIssueBoard(dir, unit) {
  if (!unit || !Number.isInteger(unit.issue) || unit.issue <= 0) return null;
  const f = typeof unit.folder === "string" && unit.folder.trim() && !/^[a-z][a-z0-9+.-]*:/i.test(unit.folder)
    ? unit.folder.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/?$/, "/") : null;
  if (f && fs.existsSync(path.join(dir, f, "dashboard.html"))) return { board: f + "dashboard.html", folder: f };
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith(unit.issue + "-")).map(d => d.name).sort(); } catch (e) { /* no folder */ }
  const hit = names.find(n => fs.existsSync(path.join(dir, n, "dashboard.html")));
  return hit ? { board: hit + "/dashboard.html", folder: hit + "/" } : null;
}

/* Link every unit of a tracking board to its sub-issue's board, from the folders on disk (embed.js runs it before embedding, so
   nobody writes these links by hand): unit.board becomes the board's relative path when it exists in this tree, and null when
   it does not (a link to a file that is not there would be dead); unit.folder is filled in when it was unset. Returns one line
   per change; an issue board, or a tracking board whose links are already right, returns []. */
function linkSubIssueBoards(plan, dir) {
  const changes = [];
  if (!plan || plan.kind !== "tracking") return changes;
  (plan.rows || []).forEach(r => {
    const u = r.unit; if (!u || !Number.isInteger(u.issue)) return;
    const hit = subIssueBoard(dir, u), want = hit ? hit.board : null;
    if ((u.board || null) !== want && (want || "board" in u)) {
      changes.push(`#${u.issue}: unit.board ${u.board ? JSON.stringify(u.board) : "unset"} → ${want ? JSON.stringify(want) : "null (no board in this tree)"}`);
      u.board = want;
    }
    if (hit && !u.folder) { u.folder = hit.folder; changes.push(`#${u.issue}: unit.folder unset → "${hit.folder}"`); }
  });
  return changes;
}

/* The live run of a tracking board's units (plan/RULES.md §3, "The units' own runs"). While a tracking board is live, each unit in
   its wip.current whose sub-issue has a board in this tree carries unit.live: a mirror of that board's run state, its wip as the
   pipeline last left it (step, since, updated, detail, steps, waitingOn, resume, qa, qaMax, and proposedLevel while escalated) plus
   its status and branch. Nobody writes it by hand: embed.js writes it from the sub-issue's plan.json at every embed of the tracking
   board, and every embed of a sub-issue's board re-embeds its parent's (embed.js), so the mirror follows each event of the unit's
   run. A unit that is not in progress, or has no board, or a tracking board that has landed or was cancelled, carries none. */
const trackingLive = plan => !["built", "abandoned"].includes(plan.status) && !["landed", "cancelled"].includes((plan.wip || {}).step);
function unitRun(sub) {
  const w = (sub && sub.wip) || {};
  const run = { step: w.step || null, since: w.since || null, updated: w.updated || w.since || null, detail: w.detail || "",
    steps: Array.isArray(w.steps) ? w.steps : [], waitingOn: w.waitingOn || null, resume: w.resume || null,
    qa: Array.isArray(w.qa) ? w.qa : [], qaMax: w.qaMax || null, status: sub.status || null, branch: sub.branch || null };
  if (w.proposedLevel) run.proposedLevel = w.proposedLevel;
  Object.assign(run, panelFacts(sub));
  /* the finished steps the unit's board kept no snapshot of, reconstructed from what survives on it (its trail, milestones, stages,
     qa passes), so the tracking board shows them as the unit's own board does (plan/RULES.md §3, "Finished steps") */
  const recon = reconstructSteps(sub); if (Object.keys(recon).length) run.recon = recon;
  return run;
}
/* ---------- Finished steps (plan/RULES.md §3, "Finished steps"; admin-team/dashboards-skill/24) ----------
   When a step ends, apply-event.js freezes the step panel's facts into wip.history.<step>, an array of the step's visits, oldest first:
   { since, ended, endedBy, to, held, event, detail, open, …the step's own facts }. A visit ends when the step the panel shows (a halt's or an
   escalation's resume step, else wip.step) changes, or, at remediation, when the qa pass it answers changes (each remediation loop is a
   visit of its own); every qa verdict is a visit of qa, the pass it returned, even when the run reached it from remediation. The step's
   own facts, per step (HISTORY_FIELDS): the interview's questions, the research phase and questions, the plan's pass, the branch, the
   stage list, the qa passes of the visit, the remediation loop (with the pass it answers), a tracking board's units filed or with a
   board. Each is taken as it stood when the step ended: after the ending event, unless that event cleared it or replaced it with the
   next visit's (a new remediation loop), then before. Deterministic and idempotent: the same event twice freezes nothing more. */
const HISTORY_FIELDS = { sizing: [], interview: ["interview"], research: ["research", "questions"], architecture: [], plan: ["plan"], branch: ["branch"],
  implementation: ["stages"], qa: ["qa"], remediation: ["remediation", "qa"], "sub-issues": ["units"], boards: ["units"], landing: [] };
const HISTORY_STEPS = Object.keys(HISTORY_FIELDS);
const STEP_ORDER = ["sizing", "interview", "research", "architecture", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"];
const isObj = v => v != null && typeof v === "object" && !Array.isArray(v);
const nonEmpty = v => Array.isArray(v) ? v.length > 0 : isObj(v);
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
/* the step the panel shows: the one a halt or an escalation stopped in, else wip.step */
const shownStep = w => w && ["halted", "escalated"].includes(w.step) ? (w.resume || null) : (w && w.step) || null;
/* a visit's key: the step shown, and at remediation the qa pass its loop answers */
const visitKey = w => { const s = shownStep(w); return !s ? null : s === "remediation" ? `remediation#${(w.remediation && w.remediation.pass) || ""}` : s; };
const FINAL_QA = ["approved", "changes-requested"];
const historyOf = w => isObj(w && w.history) ? w.history : {};
const frozenPasses = H => new Set((Array.isArray(H.qa) ? H.qa : []).flatMap(v => (Array.isArray(v && v.qa) ? v.qa : []).filter(p => p && FINAL_QA.includes(p.verdict)).map(p => p.pass)));
const unitCount = (plan, step) => { const units = (Array.isArray(plan.rows) ? plan.rows : []).filter(r => r && r.unit);
  return { done: units.filter(r => step === "sub-issues" ? Number.isInteger(r.unit.issue) && r.unit.issue > 0 : typeof r.unit.board === "string" && !!r.unit.board.trim()).length, total: units.length }; };
const lastEnded = H => Object.values(H).flatMap(vs => Array.isArray(vs) ? vs : []).map(v => v && v.ended).filter(x => typeof x === "string" && !isNaN(Date.parse(x))).sort((x, y) => Date.parse(x) - Date.parse(y)).pop() || null;
const openOf = w => (Array.isArray(w.open) ? w.open : []).filter(x => x && typeof x.text === "string" && x.text.trim() && !x.resolved);
/* One visit of a step, frozen: pre the board before the event that ends it, post after. */
function freezeVisit(pre, post, step, ev, now) {
  const a = (pre && pre.wip) || {}, b = (post && post.wip) || {}, H = historyOf(b);
  /* the visit began when the visit before it ended (visits follow each other: a halt inside a step is no visit of its own); with no
     visit frozen before it (a board older than the snapshots), when the panel's "since" says */
  const V = { since: lastEnded(H) || a.since || null, ended: now, endedBy: ev, to: shownStep(b) || b.step || null };
  if (["halted", "escalated"].includes(a.step)) V.held = true;
  if (a.event && a.event.name) V.event = clone(a.event);
  if (typeof a.detail === "string" && a.detail.trim()) V.detail = a.detail;
  const open = openOf(a); if (open.length) V.open = clone(open);
  const pick = k => nonEmpty(b[k]) ? b[k] : nonEmpty(a[k]) ? a[k] : null;
  (HISTORY_FIELDS[step] || []).forEach(k => {
    let v = null;
    if (k === "branch") v = (post && post.branch) || (pre && pre.branch) || null;
    else if (k === "units") v = unitCount(post || pre, step);
    else if (k === "qa" && step === "qa") { const seen = frozenPasses(H); v = (pick("qa") || []).filter(p => p && !seen.has(p.pass)); }
    else if (k === "qa") { const M = V.remediation; v = M ? (pick("qa") || []).filter(p => p && p.pass === M.pass) : null; }
    else if (k === "remediation") v = b.remediation && a.remediation && b.remediation.pass === a.remediation.pass ? b.remediation : a.remediation || null;
    else v = pick(k);
    if (nonEmpty(v) || (typeof v === "string" && v)) V[k] = clone(v);
  });
  return V;
}
/* Freeze what the event ended into post.wip.history (post is changed in place). Returns one line per visit frozen. */
function freezeSteps(pre, post, ev, now, facts) {
  const a = (pre && pre.wip) || {}, b = post.wip = isObj(post.wip) ? post.wip : {}, out = [];
  const push = (step, V) => { if (!HISTORY_STEPS.includes(step)) return; b.history = historyOf(b); (b.history[step] = Array.isArray(b.history[step]) ? b.history[step] : []).push(V);
    out.push(`wip.history.${step} + visit ${b.history[step].length}${step === "qa" && V.qa && V.qa.length ? ` (qa pass ${V.qa.map(p => p.pass).join(", ")})` : step === "remediation" && V.remediation ? ` (qa pass ${V.remediation.pass})` : ""}`); };
  const ka = visitKey(a), kb = visitKey(b), sa = shownStep(a);
  /* the run's start: a board laid before its run (or at sizing) records sizing once, ended by the sized event */
  /* sizing is one visit, the run's start, kept once: a later sized (or a board already holding it) freezes no second */
  if (!sa || sa === "sizing") { if (ev === "sized" && !nonEmpty(historyOf(b).sizing)) push("sizing", { since: sa === "sizing" && a.since ? a.since : null, ended: now, endedBy: "sized", to: shownStep(b) }); }
  else if (ka && ka !== kb) push(sa, freezeVisit(pre, post, sa, ev, now));
  /* a qa verdict the run reached from another step (remediation, implementation): the pass is a visit of qa of its own */
  const Q = facts && facts.qa, pass = Q && Number.isInteger(Q.pass) ? Q.pass : null, entry = pass != null ? (Array.isArray(b.qa) ? b.qa : []).find(p => p && p.pass === pass) : null;
  if (ev === "qa-pass" && entry && FINAL_QA.includes(entry.verdict) && sa !== "qa" && !frozenPasses(historyOf(b)).has(pass)) {
    const V = { since: null, ended: now, endedBy: "qa-pass", to: shownStep(b) || b.step || null };
    if (a.event && a.event.name) V.event = clone(a.event);
    const open = openOf(a); if (open.length) V.open = clone(open);
    V.qa = [clone(entry)]; push("qa", V);
  }
  return out;
}
/* The steps of a board the strip draws as finished (their dots become buttons): every step before the one shown, every step on a board
   that has landed (but "landed" itself), and any step other than the one shown that holds a finished visit (a remediation loop while the
   run is back at qa). A cancelled board draws no steps; a board not started has none finished. R is a wip, or a unit's mirror. */
function finishedSteps(R, status) {
  const w = R || {}, steps = Array.isArray(w.steps) && w.steps.length ? w.steps : STEP_ORDER, H = historyOf(w);
  if (w.step === "cancelled" || status === "abandoned") return [];
  if (w.step === "landed" || status === "built") return steps.filter(s => s !== "landed");
  const cur = shownStep(w), i = cur ? steps.indexOf(cur) : -1;
  return steps.filter((s, j) => s !== "landed" && ((i >= 0 && j < i) || (s !== cur && Array.isArray(H[s]) && H[s].length > 0)));
}
/* ---------- A finished step with no snapshot: reconstructed from what survives (plan/RULES.md §3, "Finished steps") ----------
   A board whose steps ended before the snapshots (or a step moved by hand) shows a reduced panel for them, labelled "reconstructed from
   the history": the trail entries and milestones that name the step, and what the board still holds of it — the interview's questions
   (wip.interview), the research questions the trail names (sent, returned with their findings), the branch, the stage list (wip.stages),
   the qa passes (wip.qa; at remediation the passes that requested changes), the units filed or with a board, the run's start (sized).
   A trail entry or milestone names its step by its leading words (trailStep()); a milestone that names none goes by its column (gap:
   research; considered: the architecture on a tracking board, else the plan; verdict: the plan; built: the landing). The template's
   reconStep() is the same rule. */
const TRAIL_STEP_WORDS = [["filing the units", "sub-issues"], ["creating the units", "boards"], ["the interview", "interview"], ["interview", "interview"], ["research", "research"], ["the architecture", "architecture"], ["architecture", "architecture"],
  ["the plan", "plan"], ["plan", "plan"], ["the branch", "branch"], ["branch", "branch"], ["implementation", "implementation"], ["qa", "qa"], ["remediation", "remediation"], ["the landing", "landing"], ["landing", "landing"], ["sizing", "sizing"]];
const TRAIL_STEP_RE = [[/^(run started|sized|sizing|re-?sized)\b/i, "sizing"], [/^interview/i, "interview"], [/^(research|verification|findings)/i, "research"], [/^architecture/i, "architecture"],
  [/^(\d+ of \d+ units? filed|sub-issues filed)/i, "sub-issues"], [/^\d+ of \d+ unit boards? created/i, "boards"], [/^plan\b/i, "plan"], [/^branch\b/i, "branch"], [/^(S\d+\b|implementation\b|stage\b)/i, "implementation"],
  [/^qa pass/i, "qa"], [/^remediation/i, "remediation"], [/^(landing|landed)\b/i, "landing"]];
function trailStep(label) {
  const s = String(label == null ? "" : label).replace(/`/g, "").replace(/\s+/g, " ").trim();
  const m = /^(?:halted|resumed|escalated)\s+(?:at|in|during)\s+(.+)$/i.exec(s);
  if (m) { const t = m[1].toLowerCase(), hit = TRAIL_STEP_WORDS.find(([x]) => t.startsWith(x)); return hit ? hit[1] : null; }
  const hit = TRAIL_STEP_RE.find(([re]) => re.test(s)); return hit ? hit[1] : null;
}
const MILESTONE_STEP = { gap: "research", verdict: "plan", built: "landing" };
/* a tracking board has no plan step of its own: its plan lands at its landing step, so an entry naming the plan is its landing's */
const boardStep = (plan, s) => plan && plan.kind === "tracking" && s === "plan" ? "landing" : s;
const milestoneStep = (plan, m) => boardStep(plan, trailStep(m && m.label) || (m && m.column === "considered" ? (plan.kind === "tracking" ? "architecture" : "plan") : MILESTONE_STEP[m && m.column] || null));
const okDay = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z)?$/.test(v) && !isNaN(Date.parse(v));
function reconstructStep(plan, step) {
  const w = (plan && plan.wip) || {}, R = { reconstructed: true, ended: null, trail: [], milestones: [] };
  const later = d => { if (okDay(d) && (R.ended == null || Date.parse(d) > Date.parse(R.ended))) R.ended = d; };
  (Array.isArray(plan.trail) ? plan.trail : []).forEach(t => { if (!t || typeof t.label !== "string" || !t.label.trim() || boardStep(plan, trailStep(t.label)) !== step) return;
    R.trail.push({ date: t.date || null, label: t.label, ...(typeof t.ref === "string" && t.ref.trim() ? { ref: t.ref } : {}) }); later(t.date); });
  (Array.isArray(plan.milestones) ? plan.milestones : []).forEach(m => { if (!m || typeof m.label !== "string" || !m.label.trim() || milestoneStep(plan, m) !== step) return;
    R.milestones.push({ date: m.date || null, label: m.label, ...(typeof m.ref === "string" && m.ref.trim() ? { ref: m.ref } : {}), ...(typeof m.note === "string" && m.note.trim() ? { note: m.note } : {}) }); later(m.date); });
  if (step === "sizing" && okDay(plan.sized)) { R.sized = plan.sized; later(plan.sized); }
  if (step === "interview" && nonEmpty(w.interview)) R.interview = clone(w.interview);
  if (step === "research") { const qs = [];
    R.trail.forEach(t => { const s = t.label.replace(/\s+/g, " "), sent = /^research started:/i.test(s), back = /^research returned:/i.test(s); if (!sent && !back) return;
      (s.match(/`([a-z0-9][a-z0-9-]*)`/g) || []).map(x => x.slice(1, -1)).forEach(q => { let have = qs.find(x => x.question === q); if (!have) { have = { question: q, findings: null }; qs.push(have); }
        if (back && t.ref) have.findings = t.ref; }); });
    if (qs.length) R.questions = qs; }
  if (step === "branch" && typeof plan.branch === "string" && plan.branch.trim()) R.branch = plan.branch;
  if (step === "implementation" && nonEmpty(w.stages)) R.stages = clone(w.stages);
  if (step === "qa" || step === "remediation") { const qa = (Array.isArray(w.qa) ? w.qa : []).filter(p => p && (step === "qa" || p.verdict === "changes-requested"));
    if (qa.length) R.qa = clone(qa); qa.forEach(p => later(p.at || p.date)); }
  if (["sub-issues", "boards"].includes(step) && (Array.isArray(plan.rows) ? plan.rows : []).some(r => r && r.unit)) R.units = unitCount(plan, step);
  return R;
}
/* { step: reconstruction } for every finished step that has no snapshot */
function reconstructSteps(plan) {
  const w = (plan && plan.wip) || {}, H = historyOf(w), out = {};
  finishedSteps(w, plan && plan.status).filter(s => !(Array.isArray(H[s]) && H[s].length)).forEach(s => { out[s] = reconstructStep(plan, s); });
  return out;
}
/* The step panel's facts of a board's run (plan/RULES.md §3, "The step panel"), as a unit's mirror carries them so the tracking
   board can draw that unit's step panel: only the fields the board records (none is written empty, so a mirror stays as small as
   the run): the last event, the interview's questions, the research phase and questions, the plan's pass, the implementation
   stages, the remediation's sub-steps; at the plan step the verdicts written of the rows, in implementation and remediation the
   deviations recorded (the rows' as-built changes); and rowNames, the names of the rows the questions and stages name. */
/* wip.history, the finished steps' snapshots (plan/RULES.md §3, "Finished steps"), rides along so the tracking board shows the unit's
   finished steps as its own board does; an empty history is left out. */
const PANEL_FIELDS = ["event", "interview", "research", "questions", "plan", "stages", "remediation", "open", "history"];
function panelFacts(sub) {
  const w = (sub && sub.wip) || {}, out = {}, has = v => Array.isArray(v) ? v.length > 0 : v != null && typeof v === "object" && (v !== w.history || Object.values(v).some(x => Array.isArray(x) && x.length));
  PANEL_FIELDS.forEach(k => { if (has(w[k])) out[k] = w[k]; });
  const rows = Array.isArray(sub && sub.rows) ? sub.rows : [], step = ["halted", "escalated"].includes(w.step) ? w.resume : w.step;
  if (step === "plan" && rows.length) out.verdicts = { written: rows.filter(r => r && verdictWritten(r.verdict)).length, total: rows.length };
  if (["implementation", "remediation"].includes(step) && rows.length) out.deviations = rows.reduce((n, r) => n + (Array.isArray(((r || {}).asBuilt || {}).changes) ? r.asBuilt.changes.length : 0), 0);
  /* the names of the rows the questions and stages name, so the tracking board names them as the unit's own board does */
  const named = new Set([...(out.questions || []), ...(out.stages || [])].flatMap(x => Array.isArray(x && x.rows) ? x.rows : []));
  const names = rows.filter(r => r && named.has(r.id) && typeof r.name === "string").map(r => [r.id, r.name]);
  if (names.length) out.rowNames = Object.fromEntries(names);
  return out;
}
/* The plan.json of a unit's sub-issue board, seen from the tracking board's folder `dir`, or null (no board, or one that does not
   parse, or a board of another issue). */
function subIssuePlan(dir, unit) {
  const hit = subIssueBoard(dir, unit); if (!hit) return null;
  try { const p = JSON.parse(fs.readFileSync(path.join(dir, hit.folder, "plan.json"), "utf8")); return p && p.issue === unit.issue ? p : null; } catch (e) { return null; }
}
/* What each unit's mirror should be now: [{ row, unit, inCur, want, have }] for every unit row, want null when it carries none. */
function unitRuns(plan, dir) {
  if (!plan || plan.kind !== "tracking") return [];
  const live = trackingLive(plan), cur = Array.isArray((plan.wip || {}).current) ? plan.wip.current : [];
  return (plan.rows || []).filter(r => r.unit && Number.isInteger(r.unit.issue)).map(r => {
    const inCur = unitInRun(cur, r.id), sub = live && inCur ? subIssuePlan(dir, r.unit) : null;
    return { row: r, unit: r.unit, inCur, want: sub ? unitRun(sub) : null, have: r.unit.live || null };
  });
}
/* The tracking board a sub-issue's board mirrors into (plan/RULES.md §3): the enclosing folder, when it is the parent's
   <issue>-<slug>/ and holds both plan.json and dashboard.html (parentBoard), else null. */
function parentFolder(dir, plan) {
  if (!plan || !plan.parent || !parentBoard(dir, plan.parent)) return null;
  const up = path.dirname(path.resolve(dir));
  return fs.existsSync(path.join(up, "plan.json")) ? up : null;
}
/* Write each unit's mirror (embed.js runs it before embedding). Returns one line per change. */
function mirrorUnitRuns(plan, dir) {
  const changes = [];
  unitRuns(plan, dir).forEach(x => {
    if (JSON.stringify(x.have) === JSON.stringify(x.want)) return;
    if (x.want) { x.unit.live = x.want; changes.push(`#${x.unit.issue}: run mirrored from its board, step ${x.want.step}, updated ${x.want.updated}${x.have ? ` (was step ${x.have.step}, updated ${x.have.updated})` : ""}`); }
    else if ("live" in x.unit) { delete x.unit.live; changes.push(`#${x.unit.issue}: run mirror cleared (${x.inCur ? "no board of its own in this tree, or the tracking board is not live" : "not in progress"})`); }
  });
  return changes;
}
/* The units' tests (plan/RULES.md §2, "The Tests tab"): on a tracking board each unit row carries unit.tests, its own board's tests block
   (testslib.js testsMirror(), with the names of the rows its classes verify), so the tracking board's Tests tab sums the units' tests. Nobody
   writes it by hand: embed.js writes it from the unit's plan.json in the same tree at every embed of the tracking board, landed units
   included, and clears it where the unit's board is not in the tree or records no tests. Returns [{ row, unit, want, have }]. */
function unitTests(plan, dir) {
  if (!plan || plan.kind !== "tracking") return [];
  const TL = require("./testslib.js");
  return (plan.rows || []).filter(r => r && r.unit && Number.isInteger(r.unit.issue)).map(r => { const sub = subIssuePlan(dir, r.unit); return { row: r, unit: r.unit, want: sub ? TL.testsMirror(sub) : null, have: r.unit.tests || null }; });
}
function mirrorUnitTests(plan, dir) {
  const changes = [];
  unitTests(plan, dir).forEach(x => {
    if (JSON.stringify(x.have) === JSON.stringify(x.want)) return;
    if (x.want) { x.unit.tests = x.want; changes.push(`#${x.unit.issue}: tests mirrored from its board`); }
    else if ("tests" in x.unit) { delete x.unit.tests; changes.push(`#${x.unit.issue}: tests mirror cleared (no board of its own in this tree, or it records no tests)`); }
  });
  return changes;
}
const stampMs = s => { const t = Date.parse(String(s || "")); return isNaN(t) ? null : t; };
/* The mirrors that lag their sub-issue's board (check.js warns on each): "missing" (in progress with a board, no mirror), "older"
   (unit.live.updated earlier than the board's wip.updated), "differs" (not older, other content), "orphan" (a mirror embed.js
   would clear). */
function staleUnitRuns(plan, dir) {
  return unitRuns(plan, dir).map(x => {
    if (JSON.stringify(x.have) === JSON.stringify(x.want)) return null;
    if (!x.want) return { ...x, kind: "orphan" };
    if (!x.have) return { ...x, kind: "missing" };
    const h = stampMs(x.have.updated), w = stampMs(x.want.updated);
    return { ...x, kind: (h != null && w != null ? h < w : String(x.have.updated || "") < String(x.want.updated || "")) ? "older" : "differs" };
  }).filter(Boolean);
}

/* The repository root of the tree that holds a folder: the first ancestor with docs/plans, or null. */
function treeRoot(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, "docs", "plans"))) return d; if (path.dirname(d) === d) return null; }
}
/* Every issue folder under docs/plans/ of a tree that holds a board: { issue, dir } for each <issue>-<slug>/ with a dashboard.html,
   in name order, parents before their children. */
function boardFolders(root) {
  const base = path.join(root, "docs", "plans"), found = [];
  const walk = dir => {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    ents.sort((a, b) => a.name.localeCompare(b.name)).forEach(d => {
      if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith(".") || d.name === "research" || d.name === "superseded") return;
      const p = path.join(dir, d.name), m = d.name.match(/^(\d+)-/);
      if (m && fs.existsSync(path.join(p, "dashboard.html"))) found.push({ issue: parseInt(m[1], 10), dir: p });
      walk(p);
    });
  };
  if (fs.existsSync(base)) walk(base);
  return found;
}
const boardLink = (from, toDir) => path.relative(path.resolve(from), path.join(toDir, "dashboard.html")).split(path.sep).join("/");

/* The parent tracking issue's board, seen from a sub-issue's board in `dir` (plan/RULES.md §1, "Links to an issue's board"): the
   enclosing folder, when it is the parent's <issue>-<slug>/ and holds dashboard.html. Returns { board: "../dashboard.html" } or
   null, so the parent is linked to its board only when that file exists. */
function parentBoard(dir, parent) {
  if (!parent || !Number.isInteger(parent.issue) || parent.issue <= 0) return null;
  const up = path.dirname(path.resolve(dir));
  return path.basename(up).startsWith(parent.issue + "-") && fs.existsSync(path.join(up, "dashboard.html")) ? { board: "../dashboard.html" } : null;
}

/* Every issue a plan board names, where the page names it (plan/RULES.md §1): one entry per place, { n, repo, at, how, place,
   since }. how is "field" (a number the page links: the parent, a unit, a roadmap item, a follow-up, a blocker, a deferred part's
   issue, an ancestor folder in the breadcrumb), "text" (a #n or an owner/repo#n of its own repo outside `code` spans, in a field
   the page renders as linked text) or "url" (a GitHub URL of the issue written in the data, which the page links to GitHub
   whatever the rule). since is the template rule that first linked the place to a board: "sub" for the sub-issue rule (the
   SUB_BOARDS map: a unit's row, chain, inspector and roadmap entry, and every #n the page links), "issue" for the widened rule
   (the ISSUE_BOARDS map: the parent, the breadcrumb, the roadmap of an issue board, and the WIP strip's unit lines and "blocked
   by" tags and the deferred badge, which were plain text before). Names, ids, paths, states, dates and titles are written
   without links and skipped; "PR #n" is a pull request, never an issue. Approximate by design: it names the places a reader
   clicks. */
const ISSUE_UNLINKED = new Set(["$comment", "schema", "repo", "slug", "folder", "kind", "status", "id", "where", "title", "system", "slot", "top", "page", "board",
  "branch", "step", "steps", "since", "updated", "state", "verdict", "column", "date", "sha", "merge", "version", "pr", "files", "n", "level", "current", "next",
  "resume", "qa", "qaMax", "pass", "findings", "question", "questions", "landing", "chosen", "settles", "when", "issueBoards",
  "event", "research", "phase", "drafted", "stages", "severity", "started", "returned", "asked", "answered", "verdicts", "deviations", "hash", "list", "links", "pages",
  "class", "module", "path", "testLevel", "byModule", "rowNames", "base", "stage"]);
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const UNIT_LANDED = ["landed", "as-planned", "amended", "deviated"];
/* Left for later (plan/RULES.md §2, the As built tile; §3, the chain's progress): a row whose written verdict leaves it as is (kind
   "leave" with a summary) and that is resolved as planned (pending, as-planned or amended) is not built, so the counts leave it out
   of both figures and name it beside them. One that column 4 records built after all (deviated; a unit complete or landed) counts
   as built again; a dropped or deferred one keeps its own state. The plan-board template's leftForLater() is the same rule. */
const leftForLater = r => { const v = (r && r.verdict) || {}; return v.kind === "leave" && verdictWritten(v) && !["deviated", "dropped", "deferred", "complete", "landed"].includes(recordedState(r)); };
/* Statements (plan/RULES.md §2, "Statements"). A Verdict cell holds a list of statements, verdict.statements, each { text, ref, label,
   excerpt }: one decision per statement, bullets (verdict.list "bullets", the default) or numbered when order matters ("numbered"),
   each ending with a parenthesised reference to the plan paragraph it rests on, ref, a relative link to a section of a Markdown file
   (plan.md, a plan-<unit>.md, architecture.md for a unit row) with GitHub's heading anchor. embed.js copies the section's heading and
   first paragraph into excerpt { heading, paragraph, hash } (copyExcerpts(), below); the page shows it in the inspector when the
   reference is clicked, and check.js warns once the section has changed since the copy (excerptDrift()). A verdict written before the
   statements carries one paragraph in verdict.summary instead; both read as written. The As built cell carries one statement per
   verdict statement, asBuilt.statements, in the same order, each { text, state, ref? } with its adaptation, state "as-planned",
   "amended" or "deviated", marked with the as-built titles' symbols; the row's outcome is derived from them (statementOutcome()). */
const STMT_STATES = ["as-planned", "amended", "deviated"];
const stmtList = x => (x && Array.isArray(x.statements) ? x.statements : []).filter(s => s && typeof s === "object");
const verdictWritten = v => !!v && (stmtList(v).some(s => typeof s.text === "string" && s.text.trim()) || (typeof v.summary === "string" && !!v.summary.trim()));
/* The outcome a row's as-built statements give: deviated if any statement deviated, else amended if any amended, else as planned; null
   when the row has none (or one with no valid adaptation: check.js fails it), and on a tracking board's unit row, whose statements
   live on its sub-issue's board. */
function statementOutcome(row) {
  if (!row || row.unit) return null;
  const ss = stmtList(row.asBuilt).map(s => s.state);
  if (!ss.length || ss.some(s => !STMT_STATES.includes(s))) return null;
  return ss.includes("deviated") ? "deviated" : ss.includes("amended") ? "amended" : "as-planned";
}
/* A row's recorded state: the outcome its as-built statements derive, else asBuilt.state; dropped, deferred, complete and landed are
   kept as stored. Before the outcome the stages still decide (stagedState(), builtState()). */
const recordedState = row => { const st = ((row && row.asBuilt) || {}).state || "pending"; return ["dropped", "deferred", "complete", "landed"].includes(st) ? st : statementOutcome(row) || st; };
function issueRefs(plan) {
  const out = [];
  if (!plan || typeof plan !== "object") return out;
  const repo = plan.repo || "", tracking = plan.kind === "tracking";
  // plain: the place was plain text, not a link at all, before the widened rule (the WIP strip's unit lines, the "blocked by"
  // tags, the deferred badge); crumb: the breadcrumb, which linked every ancestor's board whether or not it existed
  const add = (n, at, place, since, how, r, flags) => { if (Number.isInteger(n) && n > 0 && (!r || r === repo)) out.push({ n, repo: r || null, at, how: how || "field", place, since: since || "issue", ...(flags || {}) }); };
  /* fields */
  String(plan.folder || "").split("/").filter(Boolean).slice(2, -1).forEach(s => { const m = s.match(/^(\d+)-/); if (m) add(parseInt(m[1], 10), "folder", "the breadcrumb", "issue", "field", null, { crumb: true }); });
  if (plan.parent) add(plan.parent.issue, "parent.issue", 'the header\'s "part of" chip', "issue");
  const rm = plan.roadmap;
  if (!tracking && rm) { add(rm.issue, "roadmap.issue", "the Context roadmap", "issue"); (rm.items || []).forEach((x, i) => add(x.issue, `roadmap.items[${i}]`, "the Context roadmap", "issue")); }
  (plan.followUps || []).forEach((f, i) => add(f.issue, `followUps[${i}]`, `followUps[${i}] in Context`, "sub", "field", f.repo));
  const w = plan.wip || {}, bl = w.blockers || {};
  ["waitsOn", "blocks"].forEach(k => (bl[k] || []).forEach((x, i) => add(x.issue, `wip.blockers.${k}[${i}]`, `the WIP strip's ${k === "waitsOn" ? "waits on" : "blocks"}`, "sub", "field", x.repo)));
  const rows = Array.isArray(plan.rows) ? plan.rows : [], units = rows.filter(r => r.unit && Number.isInteger(r.unit.issue));
  rows.forEach(r => { const b = r.asBuilt || {}; if (!Number.isInteger(b.issue)) return;
    add(b.issue, `rows(${r.id}).asBuilt.issue`, `the inspector's "moved to" of ${r.id}`, "sub");
    if (b.state === "deferred") add(b.issue, `rows(${r.id}).asBuilt.issue`, `the "deferred → #${b.issue}" badge of ${r.id}`, "issue", "field", null, { plain: true }); });
  if (tracking) {
    const live = !["built", "abandoned"].includes(plan.status) && !["landed", "cancelled"].includes(w.step);
    const cur = Array.isArray(w.current) ? w.current : [], inCur = r => unitInRun(cur, r.id);
    const stateOf = r => (r.asBuilt || {}).state || "pending";
    units.forEach(r => {
      const n = r.unit.issue;
      add(n, `rows(${r.id}).unit.issue`, `the unit row's label (${r.id})`, "sub");
      add(n, `rows(${r.id}).unit.issue`, "the Context roadmap", "sub");
      add(n, `rows(${r.id}).unit.issue`, `the inspector's unit entry (${r.id})`, "sub");
      (r.unit.blockedBy || []).forEach((m, j) => add(m, `rows(${r.id}).unit.blockedBy[${j}]`, `the inspector's "blocked by" of ${r.id}`, "sub"));
      if (live && inCur(r)) add(n, `rows(${r.id}).unit.issue`, `the WIP strip's "In progress" line`, "issue", "field", null, { plain: true });
    });
    const nx = live && w.next ? units.find(r => r.id === w.next && !inCur(r) && stateOf(r) === "pending") : null;
    if (nx) {
      add(nx.unit.issue, `rows(${nx.id}).unit.issue`, `the WIP strip's "Up next" line`, "issue", "field", null, { plain: true });
      (nx.unit.blockedBy || []).filter(m => { const b = units.find(x => x.unit.issue === m); return !(b && UNIT_LANDED.includes(stateOf(b))); })
        .forEach(m => add(m, `rows(${nx.id}).unit.blockedBy`, `the "blocked by" tags of the unit up next (${nx.id})`, "issue", "field", null, { plain: true }));
    }
  }
  /* text: a tracking board does not render plan.roadmap (it draws its own from the units) */
  const skipTop = new Set(["asBuilt", "baseline", "parent", "systems", ...(tracking ? ["roadmap"] : [])]);
  const scan = (v, at, ctx) => {
    if (typeof v === "string") {
      if (/\.ref$/.test(at) && /^PR #?\d+$/i.test(v.trim())) return;
      v.split("`").forEach((x, i) => { if (i % 2) return;
        const re = /(^|[\s(>;,])(?:(PR )#\d+|([\w.-]+\/[\w.-]+)#(\d+)|#(\d+))\b/g; let m;
        while ((m = re.exec(x))) { if (m[2]) continue; const n = parseInt(m[4] || m[5], 10); add(n, at, `#${n} in ${at}`, "sub", "text", m[3] || null); } });
      const ure = new RegExp(`github\\.com/${reEsc(repo)}/issues/(\\d+)\\b`, "g"); let u;
      while ((u = ure.exec(v))) add(parseInt(u[1], 10), at, `${at} (a GitHub URL written in the data)`, "sub", "url");
    } else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${at}[${i}]`, ctx));
    else if (v && typeof v === "object") Object.keys(v).forEach(k => {
      if (ISSUE_UNLINKED.has(k) || (at === "" && skipTop.has(k))) return;
      if (k === "name" && ctx !== "options") return;   // a row's name is plain text; an option's is linked text in the decision log
      if (k === "label" && ctx !== "trail") return;    // a milestone's or document's label is plain; a trail entry's is linked text
      scan(v[k], at ? `${at}.${k}` : k, k);
    });
  };
  scan(plan, "", null);
  return out;
}

/* The boards of the other issues a plan board names (plan/RULES.md §1): every issue in issueRefs (fields and text) that is neither
   this issue, nor its parent (parent.board), nor a unit of this tracking board (unit.board), and whose board's dashboard.html is
   in this tree, anywhere under docs/plans/. Returns { "<n>": "<path relative to dir>" } in issue order; {} outside a tree. */
function otherBoards(plan, dir) {
  const root = treeRoot(dir), want = {};
  if (!root || !plan) return want;
  const self = path.resolve(dir), par = plan.parent && plan.parent.issue;
  const units = new Set(plan.kind === "tracking" ? (plan.rows || []).filter(r => r.unit).map(r => r.unit.issue) : []);
  const named = [...new Set(issueRefs(plan).filter(r => r.how !== "url").map(r => r.n))].sort((a, b) => a - b);
  if (!named.length) return want;
  const all = boardFolders(root);
  named.forEach(n => {
    if (n === plan.issue || n === par || units.has(n)) return;
    const hit = all.find(b => b.issue === n && path.resolve(b.dir) !== self);
    if (hit) want[String(n)] = boardLink(dir, hit.dir);
  });
  return want;
}

/* Link every issue a plan board names to that issue's board, from the folders on disk (embed.js runs it before embedding, so
   nobody writes these links by hand; plan/RULES.md §1): a tracking board's units (unit.board, linkSubIssueBoards), the parent
   (parent.board: "../dashboard.html" when the enclosing folder is the parent's and holds its board, else null), and every other
   issue it names (issueBoards: { "<n>": path }, present only while one is linked). A link is made only to a file that exists, and
   cleared when the file is gone. Returns one line per change. */
function linkIssueBoards(plan, dir) {
  const changes = linkSubIssueBoards(plan, dir);
  if (!plan) return changes;
  // the units' runs first (a tracking board): a mirrored detail may name issues, which issueBoards then links
  changes.push(...mirrorUnitRuns(plan, dir));
  // each unit's tests, from its own board, for the Tests tab (plan/RULES.md §2, "The Tests tab")
  changes.push(...mirrorUnitTests(plan, dir));
  if (plan.parent && Number.isInteger(plan.parent.issue)) {
    const hit = parentBoard(dir, plan.parent), want = hit ? hit.board : null;
    if ((plan.parent.board || null) !== want) {
      changes.push(`parent #${plan.parent.issue}: parent.board ${plan.parent.board ? JSON.stringify(plan.parent.board) : "unset"} → ${want ? JSON.stringify(want) : "null (the enclosing folder holds no board of #" + plan.parent.issue + ")"}`);
      plan.parent.board = want;
    }
  }
  const want = otherBoards(plan, dir), have = plan.issueBoards && typeof plan.issueBoards === "object" ? plan.issueBoards : {};
  if (JSON.stringify(have) !== JSON.stringify(want) || ("issueBoards" in plan && !Object.keys(want).length)) {
    new Set([...Object.keys(have), ...Object.keys(want)]).forEach(n => { if (have[n] !== want[n]) changes.push(`#${n}: issueBoards ${have[n] ? JSON.stringify(have[n]) : "unset"} → ${want[n] ? JSON.stringify(want[n]) : "removed (no board in this tree)"}`); });
    if (Object.keys(want).length) plan.issueBoards = want; else delete plan.issueBoards;
    if (!changes.length) changes.push(Object.keys(want).length ? "issueBoards: put in issue order" : "issueBoards: empty, removed");
  }
  return changes;
}

/* The markers of the templates that route an issue's links to its board (plan/RULES.md §1). SUB_BOARDS: the sub-issue rule (a
   tracking board's units; on the work board, every sub-issue with a board). ISSUE_BOARDS: the widened rule (every issue the page
   names that has a board: the parent, the units, every other issue; the WIP strip's unit lines and "blocked by" tags linked). A
   page with neither links every #n to GitHub. */
const SUB_BOARD_MARKER = "const SUB_BOARDS=";
const ISSUE_BOARD_MARKER = "const ISSUE_BOARDS=";
/* The link rule a page's template implements: 2 the widened rule, 1 the sub-issue rule, 0 neither. */
const linkRule = html => html.includes(ISSUE_BOARD_MARKER) ? 2 : html.includes(SUB_BOARD_MARKER) ? 1 : 0;

const skillDir = path.resolve(__dirname, "..");
/* A merged branch is not shown (plan/RULES.md §3, "Branches"), by the same rule as the template's PLAN_LANDED: an issue board's
   branch once the board has landed, a tracking board's once its own plan has landed (its wip.step, or the step a halt or an
   escalation resumes at, is past "landing"; its status is building or built; wip.landing records the plan's merge; or a unit has
   started). The branch a board shows, or null. */
function shownBranch(plan) {
  if (!plan || !plan.branch) return null;
  const w = plan.wip || {}, step = ["halted", "escalated"].includes(w.step) ? (w.resume || w.last || "") : w.step;
  if (plan.status === "built" || w.step === "landed") return null;
  if (plan.kind === "tracking") {
    const started = (plan.rows || []).some(r => r.unit && (((r.asBuilt || {}).state || "pending") !== "pending" || unitInRun(w.current, r.id)));
    if (["building", "built"].includes(plan.status) || ["implementation", "landed"].includes(step) || (w.landing && (w.landing.pr || w.landing.merge)) || started) return null;
  }
  return plan.branch;
}
/* A unit's branch on the work board: shown until the unit has landed. */
const unitBranch = row => row && row.unit && row.unit.branch && !UNIT_LANDED.includes((row.asBuilt || {}).state) ? row.unit.branch : null;

/* The impact's reconciliation state (plan/RULES.md §2, Impact): derived from the board's data, never stored. impact.basis keeps
   two values, "plan" and "as-built"; the state has three:
   - "planned": basis plan, no impact.changes entry recorded and, on a tracking board, no unit landed;
   - "partial" (partly reconciled): basis plan, with an impact.changes entry recorded or a unit landed;
   - "as-built": basis as-built.
   An impact.changes entry with none: true is a unit's explicit "no change" record: on a tracking board every landed unit records its
   effect on the initiative's impact at its landing refresh, as the changes it made (each naming the unit) or as one such entry.
   Returns null while the board records no impact, else { state, basis, tracking, landed, total (tracking boards; units dropped,
   deferred or left for later left out of the total, as in the chain's progress), changes (the real changes), noChange (unit ids with a "no change"
   entry), unrecorded (unit ids landed with neither) }. check.js and board.js use it; the plan-board template's reconciliationOf()
   is the same rule, in the page's own runtime. */
const isNoChange = c => !!c && typeof c === "object" && c.none === true;
function reconciliation(plan) {
  const I = plan && plan.impact;
  if (!I || typeof I !== "object" || Array.isArray(I)) return null;
  const tracking = plan.kind === "tracking", st = r => (r.asBuilt || {}).state || "pending";
  const counted = tracking ? (plan.rows || []).filter(r => r && r.unit && !["dropped", "deferred"].includes(st(r)) && !leftForLater(r)) : [];
  const landed = counted.filter(r => UNIT_LANDED.includes(st(r)));
  const changes = Array.isArray(I.changes) ? I.changes.filter(c => c && typeof c === "object") : [];
  const state = I.basis === "as-built" ? "as-built" : changes.length || landed.length ? "partial" : "planned";
  return { state, basis: I.basis, tracking, landed: tracking ? landed.length : null, total: tracking ? counted.length : null,
    changes: changes.filter(c => !isNoChange(c)).length,
    noChange: tracking ? [...new Set(changes.filter(isNoChange).map(c => c.unit))] : [],
    unrecorded: tracking ? landed.filter(r => !changes.some(c => c.unit === r.id)).map(r => r.id) : [] };
}
/* Boardless rows on the work board (plan/RULES.md §5, "Boardless rows"): a row with no board of its own and no tracking board's unit
   row to read takes its state from the tracker. BOARDLESS_STATES are the four it can take, in this order of precedence:
   - "not-planned": the issue is closed as not planned (GitHub's stateReason NOT_PLANNED): "closed · not planned", never landed;
   - "duplicate": the issue is closed as a duplicate (stateReason DUPLICATE): "closed · duplicate", never landed;
   - "landed": the issue is closed otherwise (completed, or no reason recorded);
   - "in-progress": open, and an open pull request refers to it (solid, never active: there is no run board to mirror);
   - "merged": open, and a pull request that refers to it has merged (awaiting close);
   - "in-progress": open, and a branch refers to it (a branch whose pull request has merged counts only as that merge);
   - "not-started": open, and nothing refers to it (dashed, pending).
   A pull request refers to issue n when GitHub links it as closing the issue (closing: closedByPullRequestsReferences nodes) or its
   head branch names the issue; a branch when GitHub links it to the issue (linked: linkedBranches names) or its name names the issue
   (namesIssue). stateReason is the tracker's reason for a closed issue (COMPLETED, NOT_PLANNED, …; null or absent when open or not
   read). Returns { status, tracker: { branch, pr: { number, state } | null } }; board.js writes both on the row, with stateReason,
   and check.js holds the row to them. */
const BOARDLESS_STATES = ["not-started", "in-progress", "merged", "landed", "not-planned", "duplicate"];
const closedNotPlanned = (state, reason) => state === "CLOSED" && reason === "NOT_PLANNED";
/* An issue closed as a duplicate of another (GitHub's stateReason DUPLICATE): "closed · duplicate", neutral like not planned, never landed. */
const closedDuplicate = (state, reason) => state === "CLOSED" && reason === "DUPLICATE";
/* Whether a branch name names issue n: "issue-62" or "issue/62" anywhere, or the number at the start of a path segment followed by
   "-", "_", "/" or the end ("62-http-core", "fix/62", "feature/3-g1-build-skeleton"); never a number inside a word or a version
   ("v62", "1.62", "g1"). */
const namesIssue = (branch, n) => new RegExp(`(^|/)(issue[-/])?${n}([-_/]|$)|[-_]issue-${n}([-_/]|$)`, "i").test(String(branch || ""));
function boardlessState(n, issueState, closing, linked, prs, branches, stateReason) {
  const byHead = (prs || []).filter(p => namesIssue(p.headRefName, n)), cl = (closing || []).filter(p => p && p.number);
  const all = [...cl, ...byHead.filter(p => !cl.some(c => c.number === p.number))];
  const open = all.filter(p => p.state === "OPEN").sort((a, b) => b.number - a.number), merged = all.filter(p => p.state === "MERGED").sort((a, b) => b.number - a.number);
  const mergedHeads = new Set(merged.map(p => p.headRefName).filter(Boolean));
  const named = [...new Set([...(linked || []), ...(branches || []).filter(b => namesIssue(b, n))])].filter(b => !mergedHeads.has(b));
  const pr = p => ({ number: p.number, state: p.state });
  if (closedNotPlanned(issueState, stateReason)) return { status: "not-planned", tracker: { branch: null, pr: merged[0] ? pr(merged[0]) : null } };
  if (closedDuplicate(issueState, stateReason)) return { status: "duplicate", tracker: { branch: null, pr: merged[0] ? pr(merged[0]) : null } };
  if (issueState === "CLOSED") return { status: "landed", tracker: { branch: null, pr: merged[0] ? pr(merged[0]) : null } };
  if (open.length) return { status: "in-progress", tracker: { branch: open[0].headRefName || null, pr: pr(open[0]) } };
  if (merged.length) return { status: "merged", tracker: { branch: null, pr: pr(merged[0]) } };
  if (named.length) return { status: "in-progress", tracker: { branch: named[0], pr: null } };
  return { status: "not-started", tracker: { branch: null, pr: null } };
}
/* ---------- QA passes shown, dependencies and what an issue holds up (admin-team/dashboards-skill/30) ----------
   qaShown(w): the qa passes a run shows (plan/RULES.md §2, "The KPI tiles"; §5): every pass wip.qa records, oldest first, and the pass
   that is running, which wip.qa does not record until its verdict arrives: { pass, verdict: "running" }. A pass is running while the run
   is at qa (wip.step "qa"): the one the remediation loop's current sub-step names ("qa pass 2"), else the pass after the last recorded
   one; or while the run is at remediation and that loop's current sub-step is a qa pass. None runs after an approving pass, past qaMax,
   or once the run has moved on (landing, landed, halted). w is a board's wip or a unit's run mirror (unit.live: step, qa, qaMax,
   remediation, history). The plan-board and work-board templates' qaShown() are the same rule, in the page's own runtime. The last pass
   shown carries inPlace when the run decided to fix its findings in place with no further pass (qaInPlace(), below). */
const QA_PASS_RE = /\bqa pass (\d+)\b/i;
function qaShown(w) {
  w = w || {}; const qa = (Array.isArray(w.qa) ? w.qa : []).filter(p => p && typeof p === "object").slice().sort((a, b) => (a.pass || 0) - (b.pass || 0));
  if (qa.some(p => p.verdict === "running")) return qa;
  const last = qa[qa.length - 1]; if (last && last.verdict === "approved") return qa;
  const M = w.remediation && typeof w.remediation === "object" ? w.remediation : {}, cur = (Array.isArray(M.steps) ? M.steps : []).find(s => s && s.state === "current" && QA_PASS_RE.test(String(s.name || "")));
  const named = cur ? parseInt(QA_PASS_RE.exec(String(cur.name))[1], 10) : null;
  const n = w.step === "qa" ? (named || (last && Number.isInteger(last.pass) ? last.pass + 1 : 1)) : w.step === "remediation" ? named : null;
  const max = Number.isInteger(w.qaMax) && w.qaMax > 0 ? w.qaMax : null;
  if (n && (!max || n <= max) && !qa.some(p => p.pass === n) && (!last || !Number.isInteger(last.pass) || n > last.pass)) { qa.push({ pass: n, verdict: "running" }); return qa; }
  return qaInPlace(w, qa);
}
/* The decision not to run another qa pass (admin-team/dashboards-skill/31): the last pass shown requested changes and the route it sent
   the run on is on-the-spot (every fix minor, made on the spot, no new qa pass; plan/RULES.md §2, wip.remediation). The route is read
   where a board records it, and nowhere else: the pass's own route (wip.qa[].route, apply-event.js at qa-pass), else the remediation loop
   that answers that pass (wip.remediation.route), else a frozen remediation visit that answered it (wip.history.remediation[].remediation).
   Never from prose: a note or a trail entry that says so is not read. The pass is then copied with inPlace: "fixing" while the run is at
   remediation (or halted, to resume there), "fixed" otherwise; every page that shows qa passes draws it as a small neutral mark beside
   the pass ("fixed in place · no 2nd pass"). A pass running after it, or an approving one, means no such decision stands: no mark. */
function qaRoute(w, p) {
  if (p && p.route) return p.route;
  const M = w.remediation && typeof w.remediation === "object" ? w.remediation : null;
  if (M && M.route && (M.pass == null || M.pass === p.pass)) return M.route;
  const H = w.history && typeof w.history === "object" && Array.isArray(w.history.remediation) ? w.history.remediation : [];
  const V = H.map(v => v && v.remediation).find(R => R && R.pass === p.pass && R.route);
  return V ? V.route : null;
}
function qaInPlace(w, qa) {
  const last = qa[qa.length - 1];
  if (!last || last.verdict !== "changes-requested" || qaRoute(w, last) !== "on-the-spot") return qa;
  const fixing = w.step === "remediation" || (w.step === "halted" && w.resume === "remediation");
  return [...qa.slice(0, -1), { ...last, route: "on-the-spot", inPlace: fixing ? "fixing" : "fixed" }];
}
/* the mark's words: "fixed in place · no 2nd pass", "fixing in place · no 3rd pass" (the pass after the one it answers) */
const inPlaceWords = p => p && p.inPlace ? `${p.inPlace === "fixing" ? "fixing" : "fixed"} in place · no ${ordinal((parseInt(p.pass, 10) || 0) + 1)} pass` : "";
/* A qa pass's number as an ordinal: 1st, 2nd, 3rd, 4th, … 11th, 12th, 13th, 21st (the work board's QA cell, a plan board's qa pills). */
const ordinal = n => { const k = Math.abs(parseInt(n, 10)); if (!Number.isFinite(k)) return String(n); const t = k % 100, u = k % 10; return `${n}${t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"}`; };
/* A dependency's two states (the work board's "Depends on"; a plan board's "depends on"; a tracking board's units; admin-team/
   dashboards-skill/30), each derived from the data, never written by hand:
   - its build state, depBuild(): "blocking" when it is part of the plan (a unit, or a sub-issue, of the row's tracking issue) and still
     open, not landed; "clear" when it is part of the plan and closed or landed; "pre-built" when it is not part of the tracking issue and
     was already built (closed) before the tracking plan started, so the plan relies on it without a unit of its own. A dependency that
     fits none (not part of the plan and still open, or closed only after the plan started; or a row with no tracking issue whose
     dependency is open) has no build state: { build: null, why }, reported by board.js, never given one;
   - its locality, depLocality(): "local-repository" (the same repository), "local-organization" (another repository of the same GitHub
     organization), "local-parent-org" (a repository of the parent organization, ORG_PARENT), "external-<name>" (outside both
     organizations, named by its owner). A case that fits none (a parent organization's repository depending on a child's) has none:
     { locality: null, why }, reported, never given one. */
const DEP_STATES = ["blocking", "clear", "pre-built"];
/* The two organizations and their relation (the user's: SpartanLaboratories is the parent of SpartanLabsGaming). */
const ORG_PARENT = { SpartanLabsGaming: "SpartanLaboratories" };
const LOCALITIES = ["local-repository", "local-organization", "local-parent-org", "external"];
const ownerOf = repo => String(repo || "").split("/")[0];
function depLocality(fromRepo, depRepo) {
  const to = depRepo || fromRepo; if (!to || to === fromRepo) return { locality: "local-repository" };
  const a = ownerOf(fromRepo), o = ownerOf(to), lower = x => String(x).toLowerCase(), known = new Set([...Object.keys(ORG_PARENT), ...Object.values(ORG_PARENT)].map(lower));
  if (lower(a) === lower(o)) return { locality: "local-organization" };
  const parent = ORG_PARENT[Object.keys(ORG_PARENT).find(k => lower(k) === lower(a))]; // GitHub logins compare case-insensitively
  if (parent && lower(parent) === lower(o)) return { locality: "local-parent-org" };
  if (!known.has(lower(o))) return { locality: `external-${o}` };
  return { locality: null, why: `${to} is in ${o}, which is neither ${a}'s own organization nor its parent organization (a parent organization's repository depending on a child's): no locality rule fits` };
}
const localityKind = l => !l ? null : String(l).startsWith("external-") ? "external" : l;
/* inPlan: the dependency is a unit or sub-issue of the row's tracking issue (false when the row has none); done: it has landed or is closed;
   closedAt, planStart: ISO dates or stamps (either may be unknown). */
function depBuild({ inPlan, done, closedAt, planStart, tracking }) {
  if (inPlan) return { build: done ? "clear" : "blocking" };
  if (!done) return { build: null, why: tracking ? "not part of the tracking issue and still open" : "the issue belongs to no tracking issue and its dependency is still open" };
  if (closedAt && planStart && String(closedAt).slice(0, 10) > String(planStart).slice(0, 10)) return { build: null, why: `not part of the tracking issue, and closed (${String(closedAt).slice(0, 10)}) only after the plan started (${String(planStart).slice(0, 10)})` };
  return { build: "pre-built", ...(closedAt && planStart ? {} : { note: "closed; when, relative to the plan's start, is not recorded" }) };
}
/* What an issue does to the issues it holds up (the work board's "Blocks · enables"; a plan board's and a tracking board's units'):
   "blocks" while it is still open, not done; "enables" once it is done (landed, or its issue closed). */
const HOLD_STATES = ["blocks", "enables"];
const holdState = done => done ? "enables" : "blocks";
/* A sub-issue of a signed-off tracking plan (plan/RULES.md §2, columns 1-2; §4, sized): its board's Gap and Considered columns are
   filled at "sized" from the parent's documents, since its research and architecture happened in the parent's run. Returns the
   parent tracking board's { dir, plan } when the enclosing folder holds the parent's board and that board has passed
   architecture-signed-off (a "considered" milestone, or unit rows), else null. new.js and check.js use it. */
function signedOffParent(dir, plan) {
  const up = parentFolder(dir, plan); if (!up) return null;
  let p; try { p = JSON.parse(fs.readFileSync(path.join(up, "plan.json"), "utf8")); } catch (e) { return null; }
  if (!p || p.kind !== "tracking" || p.issue !== plan.parent.issue) return null;
  const signed = (p.milestones || []).some(m => m && m.column === "considered") || (p.rows || []).some(r => r && r.unit);
  return signed ? { dir: up, plan: p } : null;
}
/* The words for a state, shared by check.js and the work board's data. */
const RECON_WORDS = { planned: "planned", partial: "partly reconciled", "as-built": "as built" };
/* The step-to-column map (plan/RULES.md §3, "The glow follows the step"): what wip.current holds at each wip.step, written once
   for the scripts (check.js warns on a board that does not keep it; new.js lays the foundation's wip.current from it).
     none     nothing glows                                  sizing, branch, landing, landed, cancelled
     cells    the cell the question concerns, or nothing      interview (<row-id>.<column> addresses only, no whole column)
     research the Considered cells of the rows the research  research (researchGlow below: the open questions' rows, the whole
              questions name                                  Considered column as the fallback)
     columns  exactly these columns                           architecture: considered; plan: considered, verdict; qa: built
     built    the As built cells of the rows the stage, or    implementation, remediation (<row-id>.built addresses on an issue board;
              the findings, touch                             the whole As built column, ["built"], when the current stage touches no
                                                              rows, no stage is current, or the rows the findings touch are not known;
                                                              on a tracking board the units in progress, or none)
     filing   the label cell of each unit row not yet done    sub-issues (a unit with no issue yet), boards (a unit with no board yet):
              in the step, <unit-id>.units                    filingGlow() below (admin-team/dashboards-skill/28)
   halted and escalated keep the glow of the step they stopped in (wip.resume), drawn as a still ring. */
const GLOW_MAP = {
  sizing: { kind: "none" }, interview: { kind: "cells" }, research: { kind: "research" },
  architecture: { kind: "columns", cols: ["considered"] }, plan: { kind: "columns", cols: ["considered", "verdict"] }, branch: { kind: "none" },
  implementation: { kind: "built" }, qa: { kind: "columns", cols: ["built"] }, remediation: { kind: "built" },
  landing: { kind: "none" }, landed: { kind: "none" }, cancelled: { kind: "none" },
  /* a tracking board after its architecture (plan/RULES.md §3): filing the units as sub-issues, then creating their boards; each unit row's
     label glows on its own while its issue (then its board) is made, and stops when that one is done (admin-team/dashboards-skill/28; it
     replaces the one glow on the label column of dashboards-skill/26) */
  "sub-issues": { kind: "filing" }, boards: { kind: "filing" }
};
const COLUMN_NAMES = { gap: "Gap", considered: "Considered", verdict: "Verdict", built: "As built", units: "the unit rows' label" };
/* The filing glow (plan/RULES.md §3; admin-team/dashboards-skill/28): at a tracking board's "sub-issues" step, the label cell of each unit
   row with no issue yet; at "boards", of each unit row with no board yet (unit.board, which embed.js sets from the folders on disk); in row
   order, however many. A unit stops glowing once its issue (its board) is recorded; the team raises sub-issues-filed and boards-created per
   unit, one or more at a time, and a final one that closes the step. */
const unitFiled = r => Number.isInteger(r.unit.issue) && r.unit.issue > 0, unitBoarded = r => typeof r.unit.board === "string" && !!r.unit.board.trim();
function filingGlow(plan, step) {
  if (!plan || plan.kind !== "tracking" || !["sub-issues", "boards"].includes(step)) return [];
  const done = step === "sub-issues" ? unitFiled : unitBoarded;
  return (Array.isArray(plan.rows) ? plan.rows : []).filter(r => r && r.unit && !done(r)).map(r => r.id + ".units");
}
/* The research questions and their states (plan/RULES.md §3, "Research: the questions and their states"). wip.questions records
   the run's research questions, each { question: "<slug>", rows: ["<row-id>", …], findings: null | "<path>", state }, from the
   research events: research-started adds questions "researching", research-returned sets one "returned" (its findings recorded),
   verification-started sets the returned ones "verifying", researched sets every one "complete", and plan-accepted (on a tracking
   board, architecture-signed-off) clears the list. "planning" is a question recorded with its rows before its batch is sent. A
   question written before the states existed has none: findings null reads "researching", a findings path "returned".
   Q_STATES is their order, from the least advanced; a row takes the least advanced state of the questions that name it. */
const Q_STATES = ["planning", "researching", "returned", "verifying", "complete"];
const Q_NEEDS_FINDINGS = ["returned", "verifying", "complete"];
const qState = q => q && Q_STATES.includes(q.state) ? q.state : q && q.findings != null ? "returned" : "researching";
/* The research phase (wip.research.phase): planning (the questions are being drafted, facts.drafted counted), research (a batch is
   out), verification (the findings are being verified), complete (researched). Written by research-planning, research-started,
   verification-started and researched; cleared with the questions. */
const R_PHASES = ["planning", "research", "verification", "complete"];
/* The research state of each row the questions name: Map row id → state (the least advanced of its questions'). */
function researchRows(plan) {
  const w = (plan && plan.wip) || {}, qs = Array.isArray(w.questions) ? w.questions.filter(q => q && typeof q === "object") : [];
  const ids = new Set((Array.isArray(plan && plan.rows) ? plan.rows : []).map(r => r && r.id)), out = new Map();
  qs.forEach(q => (Array.isArray(q.rows) ? q.rows : []).map(String).filter(id => ids.has(id)).forEach(id => {
    const s = qState(q), have = out.get(id); if (have == null || Q_STATES.indexOf(s) < Q_STATES.indexOf(have)) out.set(id, s); }));
  return out;
}
/* Research glows the rows being researched or verified (plan/RULES.md §3, "Research: the rows being researched"): the union of the
   Considered cells of the rows the questions "researching" or "verifying" name, however many. A returned question's rows stop glowing
   (they wait for the verification), unless another active question names them. Between the last research-returned and
   verification-started (no question researching or verifying, some returned) the returned questions' rows glow: the planner is on
   them next. The whole Considered column glows instead (the fallback) only while the rows are unknown: no question is recorded yet
   (research-planning: the questions are being drafted), none is researching, verifying or returned, a glowing question names no row
   (rows [], or only ids that are not rows of the board: a board with no rows once questions are recorded is a defect on an issue board,
   check.js NO ROWS AT RESEARCH, and a tracking board's questions name no row before its units, so this covers both; dashboards-skill/28).
   There is no count limit: the glow names exactly
   the cells being worked on. Returns { current, phase, fallback }, phase "none" (no question), "open" (a question researching),
   "verifying" (a question verifying, none researching) or "waiting" (none researching or verifying). */
function researchGlow(plan) {
  const w = (plan && plan.wip) || {}, rows = Array.isArray(plan && plan.rows) ? plan.rows : [], ids = new Set(rows.map(r => r && r.id));
  const qs = Array.isArray(w.questions) ? w.questions.filter(q => q && typeof q === "object") : [];
  const busy = qs.filter(q => ["researching", "verifying"].includes(qState(q)));
  const phase = !qs.length ? "none" : busy.some(q => qState(q) === "researching") ? "open" : busy.length ? "verifying" : "waiting";
  /* the questions whose rows glow: the ones being researched or verified, or, while none is, the returned ones awaiting verification */
  const active = busy.length ? busy : qs.filter(q => qState(q) === "returned");
  const column = (fallback) => ({ current: ["considered"], phase, fallback });
  /* research planning (plan/RULES.md §3): no question recorded yet. A board with rows glows its whole Considered column; a board with no
     rows glows nothing, and only the step panel shows the planning */
  if (phase === "none") return rows.length ? column("no research question is recorded yet") : { current: [], phase, fallback: "the board has no rows yet: nothing glows, the step panel shows the planning" };
  if (!active.length) return column("no question is being researched, verified or awaiting verification");
  const cells = new Set();
  for (const q of active) {
    const own = (Array.isArray(q.rows) ? q.rows : []).map(String).filter(id => ids.has(id));
    if (!own.length) return column(`question "${q.question}" names no row of the board`);
    own.forEach(id => cells.add(id + ".considered"));
  }
  return { current: rows.map(r => r.id + ".considered").filter(a => cells.has(a)), phase, fallback: null };
}
/* The plan-board events (plan/RULES.md §4), as wip.event.name records the last one a board took. */
const EVENTS = ["sized", "halted", "resumed", "research-planning", "research-started", "research-returned", "verification-started", "researched",
  "architecture-signed-off", "sub-issues-filed", "boards-created", "plan-accepted", "branch-cut", "implementation-stage", "qa-pass", "escalated", "landing", "landed", "cancelled"];
/* A row's as-built state before its outcome (plan/RULES.md §2, "Before the outcome"): derived from the implementation stages while the
   run is live. On an issue board, for a row wip.stages touches: "in-progress" when a current stage touches it, "partially-built" when a
   done stage touched it and a later stage still to come touches it, "pending" when only stages to come touch it; null otherwise (no
   stage touches it, or its last stage is done: its stored state, the outcome, applies). On a tracking board, a unit in wip.current whose
   row is pending is "in-progress" (its run is under way); a unit lands whole, so it is never partially built. Dropped, deferred,
   complete and landed rows, and a board that has landed or was cancelled, derive nothing. builtState() is the state the page shows:
   the derived one, else the stored one. The plan-board template's stagedState() and stateOf() are the same rule. */
const BUILDING_STATES = ["in-progress", "partially-built"];
function stagedState(plan, row) {
  const w = (plan && plan.wip) || {}, st = ((row && row.asBuilt) || {}).state || "pending";
  if (!row || plan.status === "built" || plan.status === "abandoned" || ["landed", "cancelled"].includes(w.step)) return null;
  if (["dropped", "deferred", "complete", "landed"].includes(st)) return null;
  if (plan.kind === "tracking") return row.unit && st === "pending" && unitInRun(w.current, row.id) ? "in-progress" : null;
  const sg = (Array.isArray(w.stages) ? w.stages : []).filter(x => x && Array.isArray(x.rows) && x.rows.includes(row.id));
  if (!sg.length) return null;
  if (sg.some(x => x.state === "current")) return "in-progress";
  const done = sg.some(x => x.state === "done"), todo = sg.some(x => x.state !== "done");
  return done && todo ? "partially-built" : !done ? "pending" : null;
}
const builtState = (plan, row) => stagedState(plan, row) || recordedState(row);
/* A unit whose run is under way (plan/RULES.md §3): an address of its row in wip.current, its label cell (<unit-id>.units) aside, which
   glows while the unit is filed as a sub-issue or its board created, before any run of its own (admin-team/dashboards-skill/28). */
const unitInRun = (cur, id) => (Array.isArray(cur) ? cur : []).some(a => { const p = String(a).split("."); return p[0] === id && p[1] !== "units"; });
/* The next unit in landing order (plan/RULES.md §3, "Next is the next one up"): the first unit row, in row order, that is pending, not
   in wip.current and not left for later (a unit whose written verdict leaves it as is, leftForLater()), or null when none is left.
   check.js holds wip.next to it; board.js and the template never name another. */
function nextUnit(plan) {
  if (!plan || plan.kind !== "tracking") return null;
  const cur = Array.isArray((plan.wip || {}).current) ? plan.wip.current : [];
  return (plan.rows || []).find(r => r && r.unit && ((r.asBuilt || {}).state || "pending") === "pending" && !unitInRun(cur, r.id) && !leftForLater(r)) || null;
}
/* The live sidecar (plan/RULES.md §1, "plan.js"): the data file as a script beside the page, which the page re-loads while its run
   is live and redraws from (the template's dashboardLive()). Its text is the data file verbatim between a fixed head and tail, so
   check.js reads it back and compares it with the data file. plan.json → plan.js; the work board's board.json → board.js. */
const SIDECAR = { plan: "plan.js", board: "board.js" };
const sidecarHead = id => `/* ${SIDECAR[id]}: ${id}.json as a script, written by plan/scripts/embed.js beside the page for its live view (plan/RULES.md §1). Do not edit: edit ${id}.json and re-embed. */\nwindow.dashboardLive&&window.dashboardLive(${JSON.stringify(id)},\n`;
/* The sidecar's text for a data file's text (its line endings kept). */
function sidecarText(id, json) { const eol = /\r\n/.test(json) ? "\r\n" : "\n"; return (sidecarHead(id) + json.replace(/\s*$/, "") + "\n);\n").replace(/\r?\n/g, eol); }
/* The data a sidecar carries, parsed: { data }, or { error } (missing, not in its form, or not parsing). */
function readSidecar(file, id) {
  let t; try { t = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"); } catch (e) { return { error: "missing" }; }
  const head = sidecarHead(id);
  if (!t.startsWith(head) || !/\n\);\n?$/.test(t)) return { error: "not in its form (embed.js writes it)" };
  try { return { data: JSON.parse(t.slice(head.length).replace(/\n\);\n?$/, "")) }; } catch (e) { return { error: "its data does not parse: " + e.message }; }
}
/* The wip.current a step starts with when nothing more is known (new.js): its columns, else nothing; research, the whole
   Considered column until a question is recorded. */
const glowFor = step => { const m = GLOW_MAP[step]; return m && m.kind === "columns" ? m.cols.slice() : m && m.kind === "research" ? ["considered"] : []; };
/* The map, applied to a board: null when wip.current keeps it (or it cannot be judged: a halt with no wip.resume, a board that
   has landed or was abandoned, whose glow is off anyway), else { step, via, want, bad }: the step judged (wip.resume for a halted
   or escalated board, named in via), the columns the map gives it in words, and the addresses (or the absence) that break it. */
function glowMismatch(plan) {
  const w = (plan && plan.wip) || {}, cur = Array.isArray(w.current) ? w.current.map(String) : [];
  if (plan.status === "built" || plan.status === "abandoned" || w.step === "landed") return null;
  const via = ["halted", "escalated"].includes(w.step) ? w.step : null, step = via ? w.resume : w.step;
  const m = GLOW_MAP[step]; if (!m) return null;
  const tracking = plan.kind === "tracking", rows = Array.isArray(plan.rows) ? plan.rows : [];
  const unitRow = id => rows.some(r => r && r.id === id && r.unit);
  const cols = m.kind === "columns" ? m.cols : [], words = cs => cs.map(c => `${COLUMN_NAMES[c]} (${JSON.stringify(c)})`).join(" and ");
  let want, bad = [];
  if (m.kind === "none") { want = "nothing"; bad = cur; }
  else if (m.kind === "research") {
    const g = researchGlow(plan), want0 = g.current;
    const who = g.phase === "waiting" ? "the returned questions awaiting verification" : "the questions being researched or verified";
    want = g.fallback && !want0.length ? `nothing (${g.fallback})` : g.fallback ? `the whole Considered column, as ["considered"] (the fallback: ${g.fallback})` : `the Considered cells of the rows ${who} name, as ${JSON.stringify(want0)}`;
    bad = cur.filter(a => !want0.includes(a)).map(a => a.endsWith(".considered") && want0[0] !== "considered" ? `${a} (${g.phase === "waiting" ? "no returned question" : "no question being researched or verified"} names its row)` : a);
    const miss = want0.filter(a => !cur.includes(a)); if (miss.length) bad.push(`${miss.join(", ")} missing`);
  }
  else if (m.kind === "cells") { want = "the cell the question concerns (<row-id>.<column>), or nothing"; bad = cur.filter(a => a.split(".").length !== 2); }
  else if (m.kind === "filing") {
    const want0 = filingGlow(plan, step);
    want = want0.length ? `the label cell of each unit row ${step === "sub-issues" ? "not filed as a sub-issue yet" : "with no board yet"}, as ${JSON.stringify(want0)}` : `nothing (every unit row ${step === "sub-issues" ? "has its issue" : "has its board"}: the step closes at the team's final event)`;
    bad = cur.filter(a => !want0.includes(a)).map(a => a === "units" ? "units (the one glow on the label column of dashboards-skill/26: each unit row now glows on its own)" : a);
    const miss = want0.filter(a => !cur.includes(a)); if (miss.length) bad.push(`${miss.join(", ")} missing`);
  }
  else if (m.kind === "columns") {
    want = `the ${words(cols)} column${cols.length > 1 ? "s" : ""}, as ${JSON.stringify(cols)}`; bad = cur.filter(a => !cols.includes(a));
    const miss = cols.filter(c => !cur.includes(c)); if (!bad.length && miss.length) bad = [`${miss.join(", ")} missing`];
  } else if (tracking) {
    want = "the As built cells of the units in progress (<unit-id>.built), or nothing between units";
    bad = cur.filter(a => { const p = a.split("."); return p.length !== 2 || p[1] !== "built" || !unitRow(p[0]); });
  } else {
    /* an issue board: the As built cells of the rows the current stage (or the qa findings) touches; the whole As built column,
       ["built"], when the current stage touches no rows, no stage is current, or the rows the qa findings touch are not known (a
       whole column glows only while the rows being worked on are unknown, GUIDANCE.md §1) */
    const st = (Array.isArray(w.stages) ? w.stages : []).find(x => x && x.state === "current");
    const own = st && Array.isArray(st.rows) ? st.rows.map(String).filter(id => rows.some(r => r && r.id === id)) : [];
    const column = step === "remediation" || !own.length;
    want = step === "remediation" ? 'the As built cells of the rows the qa findings touch (<row-id>.built), or the whole As built column, ["built"], while they are not known'
      : column ? `the whole As built column, as ["built"] (${st ? `the current stage ${st.id} touches no row` : "no stage is current"})`
      : `the As built cells of the rows the current stage ${st.id} touches (<row-id>.built), as ${JSON.stringify(own.map(id => id + ".built"))}`;
    if (cur.length === 1 && cur[0] === "built") bad = column ? [] : ["built (the current stage names its rows: their cells glow, not the whole column)"];
    else {
      bad = cur.filter(a => { const p = a.split("."); return p.length !== 2 || p[1] !== "built"; });
      if (!bad.length && !cur.length) bad = [step === "remediation" || !column ? "no As built cell named" : 'nothing named (the whole column, ["built"], glows)'];
    }
  }
  return bad.length ? { step, via, want, bad } : null;
}

/* ---------- The Timeline tile (plan/RULES.md §2, "The KPI tiles"; admin-team/dashboards-skill/32, in place of dashboards-skill/23's
   four phases) ----------
   A landed board's last tile carries one line per visit of a run step, in the step panel's vocabulary (sizing, interview, research,
   plan, branch, implementation, qa, remediation, landing; a tracking board's own steps), in the order the run visited them, each with
   its start → end and its duration; a step the record says nothing of is no line, and the sub-line names it. A qa visit is named by its
   pass ("qa · 1st pass"), a remediation visit by its loop ("remediation · loop 1", as the step panel numbers them), any other step
   visited twice by its visit ("plan · visit 2"). The bar draws the visits whose both bounds carry a time, one segment each in the order
   of the lines, sized by its time, in a neutral ink ramp, one shade per step (faintest for the first step drawn, the full ink for the
   last; a step's repeats share its shade), and each timed line is that segment's legend entry. Bounds come from the record only:
     1. a visit's own times: its snapshot's since and ended (wip.history); with no snapshot, the sizing's end from plan.sized and a qa
        pass's end from its at;
     2. the run's end, the last visit's, is the merge (asBuilt.at, the merge commit's time from git), where recorded;
     3. a neighbour's: visits follow each other, so a visit with an unknown bound takes the next visit's start as its end, or the one
        before's end as its start, when no step of the steps line lies between them;
     4. a step's own commit on the branch (asBuilt.commits, from git: a commit that changes only the step's documents, its research,
        its architecture or its plan): the step was under way by then, a "by" start, which gives no duration.
   A bound none of these gives is unknown ("—"); a visit with an unknown bound, or with bounds out of order, has no duration, is not
   drawn and is named in the sub-line. The figure is the sum of the visits drawn. A date alone is no time. The template's
   timelineSteps(), tlSpan() and timelineTotal() are the same rule. */
const okStamp = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z)?$/.test(v) && !isNaN(Date.parse(v));
const isTime = v => okStamp(v) && v.length > 10;
/* a step's shade on the bar, as the ink's share of its mix with the surface: 40 % for the first step drawn, 100 % for the last */
const tlShade = (k, n) => n <= 1 ? 100 : Math.round(40 + 60 * k / (n - 1));
const passOf = q => Array.isArray(q) && q[0] && Number.isInteger(q[0].pass) ? q[0].pass : null;
function timelineSteps(plan) {
  const P = plan && typeof plan === "object" ? plan : {}, w = P.wip || {}, H = historyOf(w), kind = P.kind === "tracking" ? "tracking" : "issue";
  const steps = (Array.isArray(w.steps) && w.steps.length ? w.steps : STEP_ORDER).filter(s => s !== "landed"), idx = s => steps.indexOf(s);
  const bd = t => isTime(t) ? { t, how: "exact" } : null, seq = [], recon = [], left = [];
  /* 1. the visits the history froze, oldest first */
  steps.forEach(s => (Array.isArray(H[s]) ? H[s] : []).forEach(v => { if (!isObj(v)) return;
    seq.push({ step: s, pass: s === "qa" ? passOf(v.qa) : s === "remediation" ? ((v.remediation && v.remediation.pass) || passOf(v.qa)) : null, from: bd(v.since), to: bd(v.ended) }); }));
  const tOf = v => Date.parse((v.to || v.from || { t: "" }).t) || 0;
  seq.sort((a, b) => tOf(a) - tOf(b) || idx(a.step) - idx(b.step));
  /* a step with no snapshot: a visit where the record names it (reconstructStep()), one per qa pass at qa and at remediation */
  steps.filter(s => !(Array.isArray(H[s]) && H[s].length)).forEach(s => {
    const R = reconstructStep(P, s), date = R.ended || null;
    if ((s === "qa" || s === "remediation") && Array.isArray(R.qa) && R.qa.length) { R.qa.forEach(q => recon.push({ step: s, pass: Number.isInteger(q.pass) ? q.pass : null, from: null, to: s === "qa" ? bd(q.at) : null, date: q.at || q.date || date })); return; }
    if (R.trail.length || R.milestones.length || R.sized || nonEmpty(R.interview) || nonEmpty(R.questions) || nonEmpty(R.stages) || R.units) recon.push({ step: s, pass: null, from: null, to: s === "sizing" ? bd(P.sized) : null, date });
    else left.push(s);
  });
  const loop = x => x.step === "qa" || x.step === "remediation";
  recon.sort((a, b) => loop(a) && loop(b) ? ((a.pass || 0) - (b.pass || 0) || idx(a.step) - idx(b.step)) : idx(a.step) - idx(b.step));
  recon.forEach(r => { r.recon = true; let k = seq.findIndex(v => !v.recon && idx(v.step) > idx(r.step)); if (k < 0) k = seq.length; seq.splice(k, 0, r); });
  /* 2. the run's end: the merge */
  const A = isObj(P.asBuilt) ? P.asBuilt : {}, last = seq[seq.length - 1];
  if (last && isTime(A.at) && (!last.from || Date.parse(A.at) >= Date.parse(last.from.t))) last.to = { t: A.at, how: "exact", merge: true };
  /* 3. the neighbours: the next step of the line, the same step again, or a step back (a loop), never across a step of the line that
     may hold an unrecorded visit */
  const adj = (a, b) => idx(b.step) - idx(a.step) <= 1;
  for (let ch = true, g = 0; ch && g < 4; g++) { ch = false;
    for (let k = 0; k + 1 < seq.length; k++) { const a = seq[k], b = seq[k + 1]; if (!adj(a, b)) continue;
      if (!a.to && b.from && b.from.how === "exact") { a.to = { t: b.from.t, how: "exact" }; ch = true; }
      if (!b.from && a.to && a.to.how === "exact") { b.from = { t: a.to.t, how: "exact" }; ch = true; } } }
  /* 4. a step's first commit: under way by then (a step visited once, its start still unknown) */
  const cs = (Array.isArray(A.commits) ? A.commits : []).filter(c => c && isTime(c.at) && typeof c.step === "string").sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  steps.forEach(s => { const vs = seq.filter(v => v.step === s), c = cs.find(x => x.step === s);
    if (vs.length === 1 && !vs[0].from && c && (!vs[0].to || Date.parse(c.at) <= Date.parse(vs[0].to.t))) vs[0].from = { t: c.at, how: "by", sha: c.sha || null }; });
  /* the lines: label, duration, shade */
  const cnt = {}, nth = {}; seq.forEach(v => { cnt[v.step] = (cnt[v.step] || 0) + 1; });
  seq.forEach(v => { v.n = nth[v.step] = (nth[v.step] || 0) + 1;
    v.label = v.step === "qa" ? (v.pass ? `qa · ${ordinal(v.pass)} pass` : cnt.qa > 1 ? `qa · visit ${v.n}` : "qa")
      : v.step === "remediation" ? (v.pass || cnt.remediation > 1 ? `remediation · loop ${v.n}` : "remediation") : cnt[v.step] > 1 ? `${v.step} · visit ${v.n}` : v.step;
    const a = v.from && v.from.how === "exact" ? Date.parse(v.from.t) : null, b = v.to ? Date.parse(v.to.t) : null;
    v.ms = a != null && b != null ? b - a : null; if (v.ms != null && v.ms < 0) { v.ms = null; v.order = true; } });
  const timed = seq.filter(v => v.ms != null), drawn = [...new Set(timed.map(v => v.step))].sort((x, y) => idx(x) - idx(y));
  timed.forEach(v => { v.shade = tlShade(drawn.indexOf(v.step), drawn.length); });
  return { kind, visits: seq, left, untimed: seq.filter(v => v.ms == null).map(v => v.label) };
}
/* A span as the tile says it: under an hour in minutes ("40 min"), under a day in hours and minutes ("2 h 35 min"), else in days and
   hours ("3 days 4 h"); "under 1 min" below a minute. */
function tlSpan(ms) { if (ms == null || !isFinite(ms)) return "—"; const m = Math.round(ms / 6e4); if (m < 1) return "under 1 min"; if (m < 60) return `${m} min`;
  if (m < 1440) { const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; }
  let d = Math.floor(m / 1440), h = Math.round((m - d * 1440) / 60); if (h === 24) { d++; h = 0; } return `${d} day${d === 1 ? "" : "s"}${h ? ` ${h} h` : ""}`; }
/* The tile's figure: the sum of the visits the bar draws, in ms; null when none is drawn. */
function timelineTotal(T) { const ts = (T && Array.isArray(T.visits) ? T.visits : []).filter(v => v.ms != null); return ts.length ? ts.reduce((n, v) => n + v.ms, 0) : null; }
/* the sub-line's note of the visits not summed, and of the steps the record says nothing of */
function timelineLeftOut(T) { const vs = (T && T.visits || []).filter(v => v.ms == null), o = vs.filter(v => v.order), u = vs.filter(v => !v.order);
  return [u.length ? `not summed: ${u.map(v => v.label).join(", ")} (a bound not recorded)` : "", o.length ? `not summed: ${o.map(v => v.label).join(", ")} (bounds out of order)` : "",
    T && T.left && T.left.length ? `no record of: ${T.left.join(", ")}` : ""].filter(Boolean).join(" · "); }
/* one visit's line in UTC, as check.js and timeline.js report it: "implementation: 2026-10-25 14:21Z → 2026-10-25 19:00Z · 4 h 39 min" */
const tlBoundText = b => b ? `${b.how === "by" ? "by " : ""}${b.t.slice(0, 10)} ${b.t.slice(11, 16)}Z${b.merge ? " (the merge)" : ""}` : "—";
const timelineLines = T => (T && T.visits || []).map(v => `${v.label}: ${tlBoundText(v.from)} → ${tlBoundText(v.to)} · ${v.ms != null ? tlSpan(v.ms) : "—"}`);
/* The merge's time and the branch's step commits, from git, for the Timeline tile (asBuilt.at, asBuilt.commits): the merge commit's
   committer time; for a merge with two parents, each commit of the branch (not a merge) that changes only the board folder's research
   (research/…), its architecture.md, or its plan (plan.md, plan-<unit>.md, draft.md), with its committer time and the step. {} when git
   cannot tell (no git, the merge not in this clone): nothing is recorded, never guessed. */
const utcIso = s => { const d = new Date(String(s || "")); return isNaN(d) ? null : d.toISOString().replace(/\.\d{3}Z$/, "Z"); };
const commitStep = (dir, files) => { if (!files.length) return null; const rel = files.map(f => f.startsWith(dir) ? f.slice(dir.length) : null); if (rel.some(r => r == null)) return null;
  if (rel.every(r => r.startsWith("research/"))) return "research"; if (rel.every(r => r === "architecture.md")) return "architecture";
  if (rel.every(r => /^(draft|plan(-[a-z0-9-]+)?)\.md$/.test(r))) return "plan"; return null; };
function gitTimes(repoDir, folder, merge) {
  const out = {}; if (!repoDir || !/^[0-9a-f]{7,40}$/.test(String(merge || ""))) return out;
  const g = a => require("child_process").execFileSync("git", ["-C", repoDir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true }).trim();
  try {
    const [iso, ...parents] = g(["show", "-s", "--format=%cI %P", merge]).split(/\s+/).filter(Boolean), at = utcIso(iso); if (at) out.at = at;
    if (parents.length === 2 && folder) {
      const dir = String(folder).replace(/\\/g, "/").replace(/\/+$/, "") + "/", commits = [];
      g(["log", "--no-merges", "--format=%x00%H %cI", "--name-only", `${parents[0]}..${parents[1]}`]).split("\0").filter(x => x.trim()).forEach(block => {
        const lines = block.split(/\r?\n/).map(s => s.trim()).filter(Boolean), [sha, when] = (lines[0] || "").split(" "), step = commitStep(dir, lines.slice(1)), t = utcIso(when);
        if (step && t && /^[0-9a-f]{7,40}$/.test(sha || "")) commits.push({ sha: sha.slice(0, 7), at: t, step }); });
      out.commits = commits.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    }
  } catch (e) { /* no git, or the merge is not in this clone: nothing recorded */ }
  return out;
}

module.exports = { qaShown, qaRoute, qaInPlace, inPlaceWords, ordinal, QA_PASS_RE, DEP_STATES, ORG_PARENT, LOCALITIES, depLocality, localityKind, depBuild, HOLD_STATES, holdState, filingGlow, unitFiled, unitBoarded, HISTORY_FIELDS, HISTORY_STEPS, STEP_ORDER, shownStep, visitKey, freezeVisit, freezeSteps, finishedSteps, trailStep, milestoneStep, reconstructStep, reconstructSteps, okStamp, isTime, tlShade, timelineSteps, tlSpan, timelineTotal, timelineLeftOut, tlBoundText, timelineLines, gitTimes, commitStep, refNumberOf, refNumberShown, STMT_STATES, stmtList, verdictWritten, statementOutcome, recordedState, closedDuplicate, mdHeadings, parseRef, sectionOf, refLabel, statementRefs, readRef, copyExcerpts, excerptDrift, resolveBoard, BUILDING_STATES, stagedState, builtState, unitInRun, nextUnit, closedNotPlanned, leftForLater, UNIT_LANDED, BOARDLESS_STATES, namesIssue, boardlessState, GLOW_MAP, glowFor, glowMismatch, researchGlow, Q_STATES, Q_NEEDS_FINDINGS, qState, R_PHASES, researchRows, EVENTS, SIDECAR, sidecarText, readSidecar, PANEL_FIELDS, panelFacts, reconciliation, isNoChange, RECON_WORDS, signedOffParent,shownBranch, unitBranch,repoRoot, opt, flag, registry, headingSlugs, openTag, readBlock, writeBlock, findPlans, subIssueBoard, linkSubIssueBoards,
  trackingLive, unitRun, subIssuePlan, unitRuns, mirrorUnitRuns, unitTests, mirrorUnitTests, parentFolder, staleUnitRuns, stampMs, treeRoot, boardFolders, boardLink, parentBoard, issueRefs, otherBoards, linkIssueBoards, sharedLinks, linkShared, SUB_BOARD_MARKER, ISSUE_BOARD_MARKER, linkRule, skillDir };
