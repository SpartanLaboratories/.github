// The Whiteboards' shared parts (GUIDANCE.md §13, "The Whiteboards"): the generated part's ids, its elements in the Whiteboard type's
// format, the rules a text meets before it leaves a repository, the reading of the sources at a commit, and the batch check. Not a
// command: whiteboard.js generates, plans and checks through it, publish.js and plan/scripts/ideas.js take its text rules.
//
// The Whiteboard type's format, as its reference states it (read 2026-11-17; release 1794878195-db7d):
//   board/meta            {v: 1, title, order: [id, …]}, ids back to front
//   elements/<id>         one element: shape (a block), container (a section), text, arrow, … ; ids 1-40 of [A-Za-z0-9_.~:@+-], not all dots
//   limits                at most 800 elements, 200 KB each, 2 MB in all; a batch at most 50 writes and 1 MiB, each document once
//   colours               a block or section: yellow | peach | pink | green | blue | purple | white, or #rrggbb; a stroke, text or arrow:
//                         ink | terracotta | blue | green | purple, or #rrggbb
//   dashed                only an arrow ("dash": true)
// A write to a document that exists carries its version as if_version; a creation carries none.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const SKILL = path.resolve(__dirname, "..", "..");
const N = require(path.join(SKILL, "system", "scripts", "namerefs.js")), L = require(path.join(SKILL, "system", "scripts", "levelrefs.js"));
const { elidePrivate, privateRefs } = require(path.join(SKILL, "plan", "scripts", "org-board.js"));
const { dslElements } = require(path.join(SKILL, "system", "scripts", "statelib.js"));

/* ---------- The type's limits and format ---------- */
const LIMITS = { elements: 800, elementBytes: 200 * 1024, totalBytes: 2 * 1024 * 1024, batchWrites: 50, batchBytes: 1024 * 1024, text: 4000 };
const ID_RE = /^(?!\.+$)[A-Za-z0-9_.~:@+-]{1,40}$/;
const FILL = ["yellow", "peach", "pink", "green", "blue", "purple", "white"], INK = ["ink", "terracotta", "blue", "green", "purple"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const TYPES = ["shape", "container", "text", "arrow", "stroke", "image", "html", "table", "link", "sticker", "note"];
const GEN = "gen-";

/* A generated element's id: "gen-" and a stable key from what it draws (a DSL identifier, issue-<n>, idea-<id>, run-<n>, legend, stamp).
   A key the id's characters cannot hold, or one past the type's 40 characters, keeps a readable head and a hash of the whole key, so the
   id stays the same from refresh to refresh and never collides with another key's. */
function genId(key) {
  const k = String(key), safe = k.replace(/[^A-Za-z0-9_.~:@+-]/g, "-"), id = GEN + safe;
  if (safe === k && id.length <= 40 && ID_RE.test(id)) return id;
  const h = crypto.createHash("sha1").update(k).digest("hex").slice(0, 6);
  return GEN + safe.slice(0, 40 - GEN.length - 7) + "~" + h;
}
const isGenerated = id => typeof id === "string" && id.startsWith(GEN);

/* ---------- Text that leaves a repository (GUIDANCE.md §13, "What leaves a repository") ---------- */
/* A machine's own paths, and what reads as a credential or as a person's address: never on a Whiteboard, a published copy or an ideas file */
const LOCAL_PATH = [/(?<![\w/])[A-Za-z]:[\\/](?=[^\s])/, /(?<![\w.])\/(?:[a-z]\/)?(?:Users|home)\/[^/\s]+/i, /~[\\/]\.claude\b/, /\\\\[A-Za-z0-9.-]+\\[^\s]/, /\bAppData[\\/]/i, /\bfile:\/\//i];
const SECRET = [/\bgh[pousr]_[A-Za-z0-9]{20,}/, /\bgithub_pat_[A-Za-z0-9_]{20,}/, /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bsk-[A-Za-z0-9_-]{20,}/, /\b(?:password|passwd|api[_-]?key|secret|token)\s*[:=]\s*["']?[A-Za-z0-9_\-+/=.]{12,}/i];
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/;
/* A private claude.ai link (a Whiteboard's, a published copy's): never on what leaves this machine's state (GUIDANCE.md §5, §13) */
const PRIVATE_LINK = /\bclaude\.ai\/(?:code\/)?artifact\//i;
/* What a text still carries that may not leave a repository: [{ rule, hit }] (empty when it is clean) */
function textProblems(text, ctx) {
  const t = String(text == null ? "" : text), out = [], privates = (ctx && ctx.privates) || new Set();
  N.nameRefs(t).filter(N.unambiguous).forEach(hit => out.push({ rule: "internal name", hit }));
  L.levelRefs(t).forEach(hit => out.push({ rule: "grade", hit }));
  LOCAL_PATH.forEach(re => { const m = re.exec(t); if (m) out.push({ rule: "machine-local path", hit: m[0] }); });
  SECRET.forEach(re => { const m = re.exec(t); if (m) out.push({ rule: "credential", hit: m[0].slice(0, 12) + "…" }); });
  { const m = EMAIL.exec(t); if (m) out.push({ rule: "personal data (an address)", hit: m[0] }); }
  { const m = PRIVATE_LINK.exec(t); if (m) out.push({ rule: "private link", hit: m[0] }); }
  privateRefs(t, privates).forEach(hit => out.push({ rule: "private repository", hit }));
  return out;
}
/* A text made ready to leave a repository: an internal name or a grade reworded where a safe rewording exists (namerefs.js, levelrefs.js,
   as board.js does), a private repository's name elided; left out (null) where anything of textProblems() would remain. Returns
   { text, out, problems }. */
function cleanText(text, ctx) {
  if (typeof text !== "string" || !text.trim()) return { text: text == null ? "" : String(text), out: false, problems: [] };
  let s = text;
  const n = N.cleanWritten(s); if (n.out) return { text: null, out: true, problems: textProblems(s, ctx) };
  s = n.text;
  if (L.levelRefs(s).length) { const r = L.scrubLevels(s); if (r == null) return { text: null, out: true, problems: textProblems(s, ctx) }; s = r; }
  if (ctx && ctx.privates && ctx.privates.size) s = elidePrivate(s, ctx.privates).text;
  const problems = textProblems(s, ctx);
  return problems.length ? { text: null, out: true, problems } : { text: s, out: false, problems: [] };
}
/* Markdown read from a document, as a Whiteboard's plain text: links by their labels (a relative link would lead nowhere), no bold, one
   line, at most `max` characters cut at a word */
function plain(md, max) {
  let s = String(md || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*|__/g, "").replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ").trim();
  if (max && s.length > max) { s = s.slice(0, max); const sp = s.lastIndexOf(" "); s = (sp > max * 0.6 ? s.slice(0, sp) : s).replace(/[,;:.\s]+$/, "") + "…"; }
  return s;
}

/* ---------- Elements ---------- */
const textWidth = (text, size) => { const px = { small: 14, body: 16, large: 28, title: 48, huge: 96 }[size || "body"] || 16; return Math.ceil(String(text).split("\n").reduce((m, l) => Math.max(m, l.length), 0) * px * 0.55); };
/* a block's height for its words at the type's body size, counted generously (a block too small for its words is drawn larger, over its neighbours) */
function fitHeight(text, w, min) {
  const perLine = Math.max(8, Math.floor((w - 28) / 8.2)), lines = String(text).split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
  return Math.max(min || 64, lines * 22 + 34);
}
const block = (x, y, w, text, o) => ({ type: "shape", kind: (o && o.kind) || "rounded", x, y, w, h: (o && o.h) || fitHeight(text, w), color: (o && o.color) || "white", size: (o && o.size) || "body", text,
  ...(o && o.stroke ? { stroke: o.stroke } : {}), ...(o && o.hollow ? { hollow: true } : {}), ...(o && o.textAlign ? { textAlign: o.textAlign } : {}) });
const section = (x, y, w, h, title) => ({ type: "container", x, y, w, h, text: title });
const label = (x, y, text, size, wrap) => ({ type: "text", x, y, text, size: size || "body", ...(wrap ? { wrap } : {}) });
const arrow = (from, to, lbl, o) => ({ type: "arrow", from, to, ...(lbl ? { label: lbl } : {}), ...(o && o.dash ? { dash: true } : {}), ...(o && o.head ? { head: o.head } : {}) });
/* the look of each kind of generated part (one mark per kind, the Legend naming each; no colour stands for a state, GUIDANCE.md §13) */
const LOOK = {
  subject: { color: "blue" }, part: { color: "blue" }, neighbour: { color: "white" }, archived: { color: "white" },
  planned: { color: "white", hollow: true, stroke: "ink" }, note: { color: "white", stroke: "terracotta" }, run: { color: "white" }, stub: { color: "white" }
};

/* ---------- The batch check (GUIDANCE.md §13, "Before a write") ---------- */
const bytes = v => Buffer.byteLength(JSON.stringify(v), "utf8");
/* A plan's batches checked with no browser against the board as read (`board`: { meta: {version, data} | null, elements: Map id →
   {version, data} }). Returns [problem lines]; empty when every batch may be written. */
function checkBatches(batches, board, ctx) {
  const P = [], els = new Map(board && board.elements ? board.elements : []), hasMeta = !!(board && board.meta);
  if (!Array.isArray(batches)) return ["the plan's batches are not a list"];
  const after = new Map([...els].map(([id, d]) => [id, d.data]));
  batches.forEach((b, bi) => {
    const W = b && Array.isArray(b.writes) ? b.writes : null, at = `batch ${bi + 1}`;
    if (!W) { P.push(`${at}: no writes list`); return; }
    if (!W.length) P.push(`${at}: empty`);
    if (W.length > LIMITS.batchWrites) P.push(`${at}: ${W.length} writes, over the type's ${LIMITS.batchWrites} a call`);
    const size = bytes({ writes: W }); if (size > LIMITS.batchBytes) P.push(`${at}: ${size} bytes, over the type's 1 MiB a call`);
    const seen = new Set();
    W.forEach((w, wi) => {
      const where = `${at}, write ${wi + 1}`;
      if (!w || !["set", "update", "delete"].includes(w.op)) { P.push(`${where}: op ${w && w.op} is not set, update or delete`); return; }
      const doc = `${w.collection}/${w.doc_id}`;
      if (seen.has(doc)) P.push(`${where}: ${doc} is written twice in one batch`); seen.add(doc);
      if (w.collection === "board" && w.doc_id === "meta") {
        if (w.op === "delete") P.push(`${where}: board/meta is never deleted`);
        if (hasMeta && !Number.isInteger(w.if_version)) P.push(`${where}: board/meta exists and the write carries no if_version`);
        if (!hasMeta && w.if_version != null) P.push(`${where}: board/meta is created and carries an if_version`);
        const order = w.data && w.data.order;
        if (order && !Array.isArray(order)) P.push(`${where}: board/meta's order is not a list`);
        if (w.data && w.data.title != null) { const tp = textProblems(w.data.title, ctx); if (tp.length) P.push(`${where}: the title carries ${tp.map(x => `${x.rule} (${x.hit})`).join(", ")}`); }
        return; }
      if (w.collection !== "elements") { P.push(`${where}: ${doc} is not the generated part's (only elements/gen-* and board/meta are)`); return; }
      if (!ID_RE.test(String(w.doc_id))) P.push(`${where}: the id ${JSON.stringify(w.doc_id)} is not 1-40 of the type's characters`);
      if (!isGenerated(w.doc_id)) { P.push(`${where}: ${w.doc_id} is not a generated element: a refresh never writes a user's element`); return; }
      const exists = els.has(w.doc_id);
      if (exists && !Number.isInteger(w.if_version)) P.push(`${where}: ${w.doc_id} exists and the write carries no if_version`);
      if (exists && Number.isInteger(w.if_version) && els.get(w.doc_id).version !== w.if_version) P.push(`${where}: ${w.doc_id} is pinned to version ${w.if_version}, the board read shows ${els.get(w.doc_id).version}`);
      if (!exists && w.op !== "set") P.push(`${where}: ${w.doc_id} is not on the board, so it is created with set, not ${w.op}`);
      if (!exists && w.if_version != null) P.push(`${where}: ${w.doc_id} is created and carries an if_version`);
      if (w.op === "delete") { after.delete(w.doc_id); return; }
      /* an update merges its fields, a field written {"__delete__": true} removed */
      const d = w.op === "update" ? Object.fromEntries(Object.entries({ ...(after.get(w.doc_id) || {}), ...w.data }).filter(([, v]) => !(v && typeof v === "object" && v.__delete__ === true))) : w.data;
      if (!d || typeof d !== "object") { P.push(`${where}: no data`); return; }
      elementProblems(d, ctx).forEach(x => P.push(`${where}: ${w.doc_id} ${x}`));
      if (bytes(d) > LIMITS.elementBytes) P.push(`${where}: ${w.doc_id} is ${bytes(d)} bytes, over the type's 200 KB an element`);
      after.set(w.doc_id, d);
    });
  });
  /* the board as the batches leave it */
  if (after.size > LIMITS.elements) P.push(`the board would hold ${after.size} elements, over the type's ${LIMITS.elements}`);
  const total = [...after.values()].reduce((n, d) => n + bytes(d), 0); if (total > LIMITS.totalBytes) P.push(`the board would hold ${total} bytes, over the type's 2 MB`);
  after.forEach((d, id) => { if (d && d.type === "arrow" && isGenerated(id)) ["from", "to"].forEach(k => { if (typeof d[k] === "string" && !after.has(d[k])) P.push(`${id}: its ${k} end, ${d[k]}, is not on the board`); }); });
  return P;
}
/* One element's fields, as the type takes them, and its texts as they may leave a repository */
function elementProblems(d, ctx) {
  const P = [];
  if (!TYPES.includes(d.type)) P.push(`has type ${JSON.stringify(d.type)}, not one the type draws`);
  if (["note", "sticker"].includes(d.type)) P.push(`is a ${d.type}, which is people's, never generated`);
  if (d.color != null && !(HEX.test(d.color) || (d.type === "text" || d.type === "arrow" || d.type === "stroke" ? INK : FILL).includes(d.color))) P.push(`has the colour ${JSON.stringify(d.color)}, not one the type takes for a ${d.type}`);
  if (d.stroke != null && !(HEX.test(d.stroke) || INK.includes(d.stroke))) P.push(`has the stroke ${JSON.stringify(d.stroke)}, not one the type takes`);
  if (d.dash && d.type !== "arrow") P.push("is dashed, which only an arrow can be");
  ["text", "label"].forEach(k => { if (d[k] == null) return;
    if (typeof d[k] !== "string") { P.push(`has a ${k} that is not text`); return; }
    if (d[k].length > LIMITS.text) P.push(`has a ${k} of ${d[k].length} characters, over the type's ${LIMITS.text}`);
    textProblems(d[k], ctx).forEach(x => P.push(`has a ${k} that carries ${x.rule} (${x.hit})`)); });
  if (d.type === "arrow" && !(d.from && d.to)) P.push("is an arrow without both ends");
  return P;
}

/* ---------- The board as read ---------- */
/* A document as ArtifactData returns it, read from the file a read's out_dir wrote: its version and its fields. The read's exact
   shape is not established by a session yet (GUIDANCE.md §13): a document is taken as { version, data } where it has a data object,
   else as its own fields with the version beside them. */
const VERSION_KEYS = ["version", "_version", "__version__", "$version"];
function docOf(o) {
  if (!o || typeof o !== "object") return null;
  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) return { version: VERSION_KEYS.map(k => o[k]).find(Number.isInteger) || null, data: o.data };
  const data = {}; let version = null;
  Object.entries(o).forEach(([k, v]) => { if (VERSION_KEYS.includes(k) && Number.isInteger(v)) version = v; else if (!["id", "doc_id", "collection", "updated", "created", "by_user"].includes(k)) data[k] = v; });
  return { version, data };
}
/* The board read into a folder (ArtifactData get board/meta and list elements, each with out_dir): <dir>/board/meta.json and
   <dir>/elements/<id>.json. A missing folder or meta file reads as a new, empty board. */
function readBoard(dir) {
  const out = { meta: null, elements: new Map() };
  if (!dir || !fs.existsSync(dir)) return out;
  const mf = path.join(dir, "board", "meta.json"); if (fs.existsSync(mf)) out.meta = docOf(JSON.parse(fs.readFileSync(mf, "utf8")));
  const ed = path.join(dir, "elements");
  if (fs.existsSync(ed)) fs.readdirSync(ed).filter(f => f.endsWith(".json")).forEach(f => { const d = docOf(JSON.parse(fs.readFileSync(path.join(ed, f), "utf8"))); if (d) out.elements.set(f.slice(0, -5), d); });
  return out;
}

/* ---------- The sources, read from git at a commit ---------- */
function git(root, a) { return cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); }
/* a file's text at the commit, or null where it is not there */
function show(root, sha, p) { const r = git(root, ["show", `${sha}:${p}`]); return r.status === 0 ? r.stdout.replace(/\r\n/g, "\n") : null; }
/* the paths under a folder at the commit */
function tree(root, sha, dir) { const r = git(root, ["ls-tree", "-r", "--name-only", sha, "--", dir]); return r.status === 0 ? r.stdout.split(/\r?\n/).filter(Boolean) : []; }
/* the commit's short sha, or null where it does not resolve */
function shortSha(root, sha) { const r = git(root, ["rev-parse", "--short=7", "--verify", "--quiet", `${sha}^{commit}`]); return r.status === 0 ? r.stdout.trim() : null; }
const readJson = t => { try { return t == null ? null : JSON.parse(t); } catch (e) { return undefined; } };

/* ---------- workspace.dsl: elements (statelib.js dslElements) and relationships ---------- */
const tok = l => { const out = [], re = /"([^"]*)"|(\S+)/g; let m; while ((m = re.exec(l))) out.push(m[1] !== undefined ? { s: m[1] } : { t: m[2] }); return out; };
/* Every relationship of the model: [{ from, to, label, tags, line }], each end resolved to a defined element's hierarchical id (a bare id
   written inside an element's block resolved against it). Views are left out. */
function dslRelations(text) {
  const els = dslElements(text), ids = new Set(els.map(e => e.id)), lines = String(text).replace(/\r\n/g, "\n").split("\n"), stack = [], out = [];
  const resolve = (id, scope) => { if (ids.has(id)) return id; for (let s = scope; s; s = s.includes(".") ? s.slice(0, s.lastIndexOf(".")) : null) if (ids.has(s + "." + id)) return s + "." + id; return null; };
  const scopeId = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].id) return stack[i].id; return null; };
  lines.forEach((raw, i) => {
    let line = raw.trim(); if (!line || line.startsWith("//")) return;
    if (line === "}") { stack.pop(); return; }
    const opens = line.endsWith("{"); if (opens) line = line.slice(0, -1).trim();
    const T = tok(line), el = els.find(e => e.line === i);
    const inViews = stack.some(f => f.kind === "views" || f.kind === "styles");
    if (T.length && ["views", "styles"].includes(T[0].t)) { if (opens) stack.push({ kind: T[0].t }); return; }
    if (!inViews && T.length >= 3 && T[1].t === "->") {
      const S = T.slice(3).filter(x => x.s !== undefined).map(x => x.s), f = resolve(T[0].t, scopeId()), t = resolve(T[2].t, scopeId());
      if (f && t) out.push({ from: f, to: t, label: S[0] || "", tags: (S[2] || "").split(",").map(x => x.trim()).filter(Boolean), line: i });
    }
    if (opens) stack.push(el ? { kind: "element", id: el.id } : { kind: "anon" });
  });
  return { elements: els, relations: out };
}
const depth = id => String(id).split(".").length;
const ancestorOf = (a, b) => String(b).startsWith(String(a) + ".");

module.exports = { LIMITS, ID_RE, FILL, INK, GEN, genId, isGenerated, textProblems, cleanText, plain, textWidth, fitHeight, block, section, label, arrow, LOOK,
  bytes, checkBatches, elementProblems, docOf, readBoard, git, show, tree, shortSha, readJson, dslRelations, depth, ancestorOf, SKILL };
