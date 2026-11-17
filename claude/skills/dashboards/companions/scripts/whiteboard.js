#!/usr/bin/env node
// The Whiteboards' generated parts (GUIDANCE.md §13, "The Whiteboards"): generate one, plan its refresh against the board as read, check the
// plan's batches, and keep the repository's list of Whiteboard links.
//   node whiteboard.js generate --root <checkout> --sha <commit> --scope <system:<slug> | supersystem:<slug> | repository | org>
//                               [--branch <name>] [--run <plan folder>]... [--out <file>]
//   node whiteboard.js plan     --generated <file> --board <dir> [--out <file>]
//   node whiteboard.js check    --plan <file> --board <dir>
//   node whiteboard.js links    --root <main checkout> (--set <scope> --title <t> --link <url> --sha <sha> [--at <iso>] | --remove <scope> | --list)
//   node whiteboard.js orphans  --root <checkout> --sha <commit>
// generate reads the repository's files from git at the commit (git show, git ls-tree: nothing in a working tree), and each run's
// plan.json from its plan folder in its worktree, once: docs/dashboards/systems.json and the workspace.dsl files, docs/plans/board.json
// (the open issues, each with the system the repository work board gives it), the landed issues' consequences.md (or impact.md) for
// their open follow-ups and known gaps, and docs/plans/ideas.json; for the org Whiteboard, OrganizationPage's
// docs/plans/org-work-board/board.json and ideas.json. It writes the generated part as JSON (stdout, or --out): every element with its
// id, the parts each id draws, the ideas' sources, and what it left out and why. Nothing is written to a Whiteboard: the presenter
// writes the plan's batches with ArtifactData.
// plan reads the generated part and the board as read into <dir> (ArtifactData get board/meta and list elements, each with out_dir),
// and writes the batches that bring the board's generated part to it, touching nothing else (GUIDANCE.md §13, "A refresh writes only
// what it wrote"). check runs the batch check on a plan (GUIDANCE.md §13, "Before a write"); plan runs it too and writes nothing
// when it fails. links keeps docs/plans/.live/whiteboards.json in a main checkout (git-ignored; the scope's entry set or removed,
// the file replaced whole). orphans lists the links list's Whiteboards whose system or supersystem has left the registry at the commit.
// Exit 0 done, 1 a check failed or a source could not be read, 2 usage.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const W = require("./wblib.js");
const SKILL = W.SKILL;
const lib = () => require(path.join(SKILL, "plan", "scripts", "lib.js"));

const SCHEMA = "whiteboard-generated/1";
const LEAF_W = 240, NOTE_W = 300, GAP = 72, PAD = 24, TITLE_ROOM = 40, MAX_NOTES = 150;
const KIND_WORD = { fix: "a proposed fix", improvement: "an improvement", feature: "a feature", exploration: "something to explore", future: "for the future" };

/* ---------- The sources at the commit ---------- */
function registryAt(root, sha) {
  const t = W.show(root, sha, "docs/dashboards/systems.json"), reg = W.readJson(t);
  if (!reg || !Array.isArray(reg.systems)) throw new Error(`docs/dashboards/systems.json ${t == null ? "is not" : "does not read"} at ${sha}`);
  return reg;
}
const dslPath = rel => "docs/dashboards/" + String(rel).replace(/^\.?\/+/, "");
/* the defaultbranch's name, for the stamp: --branch, else origin's HEAD, else main */
function branchOf(root, given) {
  if (given) return given;
  const r = W.git(root, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim().replace(/^origin\//, "") : "main";
}
/* the open issues the repository work board lists at the commit, each with the system it gives it (board.js decides an issue's system):
   [{ issue, title, system }] */
function openIssues(root, sha) {
  const b = W.readJson(W.show(root, sha, "docs/plans/board.json"));
  if (!b) return { issues: [], note: "docs/plans/board.json is not at the commit: no open issue drawn" };
  const seen = new Map(), add = (n, title, system) => { if (Number.isInteger(n) && !seen.has(n)) seen.set(n, { issue: n, title: String(title || ""), system: system || null }); };
  (b.rows || []).filter(r => r && r.state === "OPEN").forEach(r => add(r.issue, r.title, r.system));
  (b.unscheduled || []).forEach(u => add(u.issue, u.title, u.system));
  (b.roadmap || []).forEach(m => { if (m.state === "OPEN") add(m.issue, m.title, null); (m.items || []).filter(i => i.state === "OPEN").forEach(i => add(i.issue, i.title, null)); });
  return { issues: [...seen.values()].sort((a, b2) => a.issue - b2.issue), note: null };
}
/* The open follow-ups and known gaps of the landed issues at the commit, from each landed board's consequences.md (or impact.md): a list item
   under a heading that names follow-ups or known gaps, and, where the section sorts its items under labels ("Open:", "Closed, not
   triggered"), only those under a label that says open; an item that says it is closed is left out. [{ issue, kind, title, systems }] */
function openFollowUps(root, sha) {
  const files = W.tree(root, sha, "docs/plans"), out = [];
  files.filter(f => /\/plan\.json$/.test(f)).forEach(pf => {
    const plan = W.readJson(W.show(root, sha, pf)); if (!plan || !Number.isInteger(plan.issue)) return;
    if (!(plan.status === "built" || (plan.wip && plan.wip.step === "landed"))) return;
    const dir = pf.slice(0, -"plan.json".length), md = W.show(root, sha, dir + "consequences.md") || W.show(root, sha, dir + "impact.md"); if (!md) return;
    const systems = (plan.systems || []).map(s => s && s.slug).filter(Boolean);
    let kind = null, labelled = false, open = true;
    md.split("\n").forEach(line => {
      const h = /^(#{2,4})\s+(.*)$/.exec(line);
      if (h) { kind = /follow-?ups?/i.test(h[2]) ? "follow-up" : /known gaps?/i.test(h[2]) ? "known gap" : null; labelled = false; open = true; return; }
      if (!kind) return;
      const lbl = /^\*\*([^*]+)\*\*\s*(?:\([^)]*\))?\s*:?\s*$/.exec(line.trim()) || /^\*\*([^*]+?):?\*\*/.exec(line.trim());
      if (lbl && !/^\s*-/.test(line)) { const t = lbl[1].toLowerCase(); if (/\bopen\b/.test(t) || /\bclosed\b/.test(t) || /\bsettled\b/.test(t)) { labelled = true; open = /\bopen\b/.test(t) && !/\bclosed\b/.test(t); } return; }
      const item = /^- (.*)$/.exec(line); if (!item) return;
      if (labelled && !open) return;
      if (/\bclosed\b|~~/i.test(item[1].slice(0, 160))) return;
      const bold = /^\*\*(.+?)\*\*/.exec(item[1]), title = W.plain(bold ? bold[1] : item[1], 160).replace(/[.:]+$/, "");
      if (title) out.push({ issue: plan.issue, kind, title, systems });
    });
  });
  return out;
}
function ideasAt(root, sha, p) { const d = W.readJson(W.show(root, sha, p)); return d && Array.isArray(d.ideas) ? d.ideas : []; }
/* A run's live state for its section in progress, read once from its plan folder in its worktree: null where it has no board, or it has
   landed or been cancelled. A plan.json being written is read once more; then the run is left out and said. */
function runOf(folder) {
  const f = path.join(folder, "plan.json"); let p = null;
  for (let i = 0; i < 2 && p == null; i++) { try { p = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { p = null; } }
  if (p == null) return { miss: `${path.basename(folder)}: plan.json could not be read twice` };
  if (p.status === "built" || p.status === "abandoned" || (p.wip && ["landed", "cancelled"].includes(p.wip.step))) return { done: p.issue };
  return { plan: p };
}

/* ---------- Layout: leaves and groups, laid out left to right, then down ---------- */
const leaf = (id, data, extra) => ({ kind: "leaf", id, data, w: data.w, h: data.h, ...(extra || {}) });
const group = (id, title, children, extra) => ({ kind: "group", id, title, children, ...(extra || {}) });
/* a row's top room: a section's title stands above its box, so a row holding a section starts lower */
const rowTop = r => r.some(c => c.kind === "group") ? TITLE_ROOM : 0;
const rowH = r => Math.max(...r.map(c => c.h)) + rowTop(r);
function measure(n) {
  if (n.kind === "leaf") return n;
  const cols = n.cols || (n.children.some(c => c.kind === "group") ? 2 : 3);
  n.children.forEach(measure);
  const rows = []; for (let i = 0; i < n.children.length; i += cols) rows.push(n.children.slice(i, i + cols));
  n.rows = rows;
  const inner = rows.length ? rows.reduce((s, r) => Math.max(s, r.reduce((t, c) => t + c.w, 0) + GAP * (r.length - 1)), 0) : LEAF_W;
  n.w = Math.max(inner + 2 * PAD, W.textWidth(n.title || "", "body") + 2 * PAD);
  n.h = (rows.length ? rows.reduce((s, r) => s + rowH(r), 0) + GAP / 2 * (rows.length - 1) : 40) + 2 * PAD;
  return n;
}
/* positions every node and emits its elements back to front: a section before what it holds */
function place(n, x, y, out, parent) {
  if (n.kind === "leaf") { out.push({ id: n.id, data: { ...n.data, x, y }, parent: parent || null, part: n.part || null }); return; }
  out.push({ id: n.id, data: W.section(x, y, n.w, n.h, n.title), parent: parent || null, part: n.part || null, section: true });
  let cy = y + PAD;
  n.rows.forEach(r => { let cx = x + PAD; r.forEach(c => { place(c, cx, cy + rowTop(r), out, n.id); cx += c.w + GAP; }); cy += rowH(r) + GAP / 2; });
}
function column(nodes, x, y, out) { let cy = y; nodes.forEach(n => { measure(n); place(n, x, cy + (n.kind === "group" ? TITLE_ROOM : 0), out); cy += n.h + (n.kind === "group" ? TITLE_ROOM : 0) + PAD; }); return cy; }

/* ---------- What each part looks like ---------- */
function partLeaf(id, name, detail, look, ctx, part) {
  const t = clean([look === "planned" ? `planned · ${name}` : look === "archived" ? `archived · ${name}` : name, detail ? W.plain(detail, 90) : ""].filter(Boolean).join("\n"), ctx);
  if (t == null) return null;
  return leaf(id, W.block(0, 0, LEAF_W, t, W.LOOK[look] || W.LOOK.part), { part });
}
function noteLeaf(id, text, ctx, part) { const t = clean(text, ctx); return t == null ? null : leaf(id, W.block(0, 0, NOTE_W, t, { ...W.LOOK.note, textAlign: "left" }), { part, note: true }); }
/* every text through the rules of what leaves a repository (wblib.js cleanText()); a text that cannot be made clean is left out and said */
function clean(text, ctx) { const r = W.cleanText(text, ctx); if (r.out) { ctx.skipped.push({ what: W.plain(text, 60).replace(/\S+/g, w => w), why: [...new Set(r.problems.map(p => p.rule))].join(", ") || "left out" }); return null; } return r.text; }

/* ---------- The DSL drawn ---------- */
function dslAt(root, sha, rel, ctx) { const t = W.show(root, sha, dslPath(rel)); if (t == null) { ctx.skipped.push({ what: dslPath(rel), why: "not at the commit" }); return null; } return W.dslRelations(t); }
const lc = s => String(s || "").toLowerCase();
/* the DSL element that stands for a registry entry: a container or software system named for it, or with its slug as identifier */
function subjectOf(model, entry) {
  const m = model.elements.filter(e => ["container", "softwareSystem"].includes(e.type) && (lc(e.name) === lc(entry.name) || lc(e.name) === lc(entry.slug) || lc(e.ident) === lc(entry.slug)));
  return m.find(e => e.type === "container") || m[0] || null;
}
const lookOf = (e, entry) => entry && entry.status === "archived" ? "archived" : (entry && entry.status === "planned") || (e && e.tags.includes("Planned")) ? "planned" : null;
/* arrows for a model's relationships, each end taken to what is drawn for it (target()), one arrow a pair, a planned one dashed */
function arrowsOf(model, target, plannedIds, ctx) {
  const seen = new Set(), out = [];
  model.relations.forEach(r => {
    const a = target(r.from), b = target(r.to); if (!a || !b || a === b) return;
    const key = a + ">" + b; if (seen.has(key)) return; seen.add(key);
    const lbl = r.label ? clean(W.plain(r.label, 60), ctx) : null, dash = r.tags.includes("Planned") || plannedIds.has(a) || plannedIds.has(b);
    out.push({ id: W.genId(`rel.${a.slice(4)}>${b.slice(4)}`), data: W.arrow(a, b, lbl, { dash }), parent: null, arrow: true });
  });
  return out;
}

/* ---------- The four generated parts ---------- */
/* The organizations' private repositories, read from GitHub (gh, or the command DASHBOARDS_GH names) as the ideas writer reads them: a name of
   one in a text is elided, so no Whiteboard names one; where GitHub cannot be read, nothing is generated. */
function generate(o) {
  const I = require(path.join(SKILL, "plan", "scripts", "ideas.js")), privates = o.privates || I.privatesOf(I.ownersOf());
  const ctx = { skipped: [], privates };
  const sha = W.shortSha(o.root, o.sha); if (!sha) throw new Error(`${o.sha} is not a commit in ${o.root}`);
  return o.scope === "org" ? generateOrg(o, sha, ctx) : generateRepo(o, sha, ctx);
}
function generateRepo(o, sha, ctx) {
  const reg = registryAt(o.root, o.sha), repoName = String(reg.repo || "").split("/").pop() || path.basename(o.root), all = reg.systems;
  const by = s => all.find(x => x.slug === s), repoRow = all.find(x => x.kind === "repo") || null;
  const kidsOf = s => all.filter(x => x.parent === s && x.kind !== "repo");
  const [kind, slug] = o.scope.includes(":") ? o.scope.split(":") : [o.scope, null];
  let entry = null;
  if (kind === "system" || kind === "supersystem") { entry = by(slug); if (!entry) throw new Error(`${slug} is not in the registry at ${sha}: its Whiteboard is no longer refreshed (whiteboard.js orphans)`);
    const isSuper = entry.kind === "supersystem" || kidsOf(slug).length > 0; if (kind === "supersystem" && !isSuper) throw new Error(`${slug} is a system, not a supersystem: scope system:${slug}`); }
  else if (kind !== "repository") throw new Error(`scope ${o.scope} is not system:<slug>, supersystem:<slug>, repository or org`);
  const branch = branchOf(o.root, o.branch), name = entry ? entry.name || entry.slug : repoName;
  const title = clean(entry ? `${repoName} · ${name}` : repoName, ctx) || repoName;
  const els = [], parts = {}, planned = new Set(), main = [], neighbours = new Map();
  const mark = (n) => { if (n && n.part) parts[n.id] = n.part; if (n && n.data && n.data.hollow) planned.add(n.id); return n; };
  /* the parts of one system: its subject's children in its own DSL (else the repository's), each container with components a section */
  const systemParts = (e) => {
    const model = e.dsl ? dslAt(o.root, o.sha, e.dsl, ctx) : repoRow && repoRow.dsl ? dslAt(o.root, o.sha, repoRow.dsl, ctx) : null;
    const subj = model && subjectOf(model, e); if (!subj) return { model, subj: null, nodes: [] };
    const kids = model.elements.filter(x => x.parent === subj.id);
    const nodes = kids.map(k => { const gk = model.elements.filter(x => x.parent === k.id);
      if (gk.length) return mark(group(W.genId(`el.${k.id}`), clean(k.tags.includes("Planned") ? `planned · ${k.name}` : k.name, ctx) || k.ident, gk.map(c => mark(partLeaf(W.genId(`el.${c.id}`), c.name, "", lookOf(c) || "part", ctx, c.id))).filter(Boolean), { part: k.id }));
      return mark(partLeaf(W.genId(`el.${k.id}`), k.name, "", lookOf(k) || "part", ctx, k.id)); }).filter(Boolean);
    return { model, subj, nodes };
  };
  const inScope = new Set();
  if (kind === "system") {
    const { model, subj, nodes } = systemParts(entry), sid = W.genId(`sys.${entry.slug}`);
    inScope.add(entry.slug);
    const look = lookOf(subj, entry);
    main.push(nodes.length ? mark(group(sid, clean(look ? `${look} · ${name}` : name, ctx) || entry.slug, nodes, { part: entry.slug })) : mark(partLeaf(sid, name, entry.function || "", look || "subject", ctx, entry.slug)));
    if (model && subj) {
      const d = W.depth(subj.id), drawn = new Set(nodes.flatMap(n => n.kind === "group" ? [n.id, ...n.children.map(c => c.id)] : [n.id]));
      /* only the relationships that touch the system: its neighbours are what it works with, drawn once each */
      const inside = id => id === subj.id || W.ancestorOf(subj.id, id);
      const target = id => { if (id === subj.id) return sid; if (inside(id)) { let x = id; while (x && !drawn.has(W.genId(`el.${x}`))) x = x.includes(".") ? x.slice(0, x.lastIndexOf(".")) : null; return x ? W.genId(`el.${x}`) : sid; }
        if (W.ancestorOf(id, subj.id)) return null; const lifted = id.split(".").slice(0, d).join("."); return neighbourOf(model, lifted, neighbours, ctx); };
      const touching = { relations: model.relations.filter(r => inside(r.from) !== inside(r.to) || (inside(r.from) && inside(r.to))) };
      els.push(...arrowsOf(touching, target, planned, ctx).map(a => ({ ...a, late: true })));
    }
  } else {
    /* a supersystem's systems, or the repository's top-level systems and supersystems, each a section */
    const top = kind === "supersystem" ? kidsOf(entry.slug) : all.filter(x => x.kind !== "repo" && (!x.parent || (repoRow && x.parent === repoRow.slug) || !by(x.parent)));
    const topOf = s => { let e = by(s); while (e && e.parent && by(e.parent) && !top.includes(e)) e = by(e.parent); return e && top.includes(e) ? e.slug : null; };
    (kind === "supersystem" ? [entry, ...all] : all).forEach(e => { if (e && topOf(e.slug)) inScope.add(e.slug); });
    if (kind === "supersystem") inScope.add(entry.slug);
    top.forEach(e => {
      const sid = W.genId(`sys.${e.slug}`), look = lookOf(null, e), kids = kidsOf(e.slug);
      let nodes;
      if (kids.length) nodes = kids.map(k => mark(partLeaf(W.genId(`sys.${k.slug}`), k.name || k.slug, k.function || "", lookOf(null, k) || "part", ctx, k.slug))).filter(Boolean);
      else nodes = look ? [] : systemParts(e).nodes;
      main.push(nodes.length ? mark(group(sid, clean(look ? `${look} · ${e.name || e.slug}` : e.name || e.slug, ctx) || e.slug, nodes, { part: e.slug })) : mark(partLeaf(sid, e.name || e.slug, e.function || "", look || "part", ctx, e.slug)));
    });
    /* how they interact: the scope's own DSL (the supersystem's, else the repository's), each end taken to its system's section */
    const scopeRow = kind === "supersystem" ? entry : repoRow;
    const model = scopeRow && scopeRow.dsl ? dslAt(o.root, o.sha, scopeRow.dsl, ctx) : null;
    if (model) {
      const subj = kind === "supersystem" ? subjectOf(model, entry) : model.elements.find(e2 => e2.type === "softwareSystem" && !e2.tags.includes("External") && model.elements.some(c => c.parent === e2.id)) || null;
      const slugAt = id => { for (let x = id; x; x = x.includes(".") ? x.slice(0, x.lastIndexOf(".")) : null) { const el = model.elements.find(e2 => e2.id === x); if (!el) continue; const m = all.find(s => s.kind !== "repo" && (lc(s.name) === lc(el.name) || lc(s.slug) === lc(el.name) || lc(s.slug) === lc(el.ident))); if (m) return m.slug; } return null; };
      const target = id => { const s = slugAt(id), t = s && topOf(s); if (t) return W.genId(`sys.${t}`); if (subj && (id === subj.id || W.ancestorOf(subj.id, id) || W.ancestorOf(id, subj.id))) return null;
        return neighbourOf(model, id.split(".").slice(0, subj ? W.depth(subj.id) : 1).join("."), neighbours, ctx); };
      els.push(...arrowsOf(model, target, planned, ctx).map(a => ({ ...a, late: true })));
    }
  }
  /* the notes: open issues, open follow-ups and known gaps, and the ideas that concern the scope */
  const notes = [], concernsScope = s => kind === "repository" || (s && inScope.has(s));
  const issues = openIssues(o.root, o.sha); if (issues.note) ctx.skipped.push({ what: "open issues", why: issues.note });
  issues.issues.filter(i => kind === "repository" ? true : concernsScope(i.system)).forEach(i => { const n = noteLeaf(W.genId(`issue-${i.issue}`), `Open issue #${i.issue}${kind === "repository" && i.system ? ` · ${(by(i.system) || {}).name || i.system}` : ""} — ${W.plain(i.title, 140)}`, ctx, i.system ? i.system : null); if (n) notes.push(n); });
  openFollowUps(o.root, o.sha).filter(f => kind === "repository" || f.systems.some(concernsScope)).forEach(f => {
    const key = `${f.kind === "follow-up" ? "fu" : "gap"}-${f.issue}-${require("crypto").createHash("sha1").update(f.title).digest("hex").slice(0, 6)}`;
    const n = noteLeaf(W.genId(key), `${f.kind === "follow-up" ? "Follow-up" : "Known gap"} of #${f.issue} — ${f.title}`, ctx, f.systems[0] || null); if (n) notes.push(n); });
  const sources = {};
  ideasAt(o.root, o.sha, "docs/plans/ideas.json").filter(i => kind === "repository" || (i.concerns || []).some(c => concernsScope(c) || [...Object.values(parts)].includes(c))).forEach(i => {
    const n = noteLeaf(W.genId(`idea-${i.id}`), `Idea ${i.id} · ${i.kind}${i.issue ? ` · #${i.issue}` : ""} — ${i.text}`, ctx, null);
    if (!n) return; n.concerns = i.concerns || []; notes.push(n); if (i.source && i.source.element) sources[n.id] = { scope: i.source.scope, element: i.source.element }; });
  return layOut({ o, sha, ctx, title, stamp: `as-is at ${branch} @ ${sha}`, branch, main, neighbours: [...neighbours.values()], notes, els, parts, planned, sources, scopeOf: kind, inScope });
}
/* a neighbour (a person, another system, a sibling container): one white block, made once */
function neighbourOf(model, id, map, ctx) {
  const el = model.elements.find(e => e.id === id); if (!el) return null;
  const gid = W.genId(`el.${el.id}`);
  if (!map.has(gid)) { const n = partLeaf(gid, el.name, el.type === "person" ? "person" : el.tags.includes("External") ? "outside the repository" : "", "neighbour", ctx, el.id); if (!n) return null; map.set(gid, n); }
  return gid;
}

function generateOrg(o, sha, ctx) {
  const b = W.readJson(W.show(o.root, o.sha, "docs/plans/org-work-board/board.json"));
  if (!b || !/^org-work-board\/[12]$/.test(String(b.schema))) throw new Error(`docs/plans/org-work-board/board.json is not an org work board at ${sha}`);
  const repoNode = r => {
    const key = `repo.${r.owner}.${r.name}`, bd = r.board, kids = [];
    if (!bd) kids.push(leaf(W.genId(`${key}.none`), W.block(0, 0, LEAF_W, "No work-board data", W.LOOK.neighbour)));
    else {
      const runs = (bd.rows || []).filter(x => x.state === "OPEN" && x.step && x.step !== "landed");
      if (runs.length) { const t = clean(["In progress", ...runs.slice(0, 10).map(x => `#${x.issue} ${W.plain(x.title, 60)} · ${x.step}`), runs.length > 10 ? `… ${runs.length - 10} more` : ""].filter(Boolean).join("\n"), ctx); if (t) kids.push(leaf(W.genId(`${key}.runs`), W.block(0, 0, LEAF_W + 60, t, { ...W.LOOK.part, textAlign: "left" }))); }
      const rm = (bd.roadmap || []); if (rm.length) { const t = clean(["Roadmap", ...rm.slice(0, 8).map(m => `#${m.issue} ${W.plain(m.title, 60)}${(m.items || []).length ? ` · ${(m.items || []).length} items` : ""}`)].join("\n"), ctx); if (t) kids.push(leaf(W.genId(`${key}.roadmap`), W.block(0, 0, LEAF_W + 60, t, { ...W.LOOK.neighbour, textAlign: "left" }))); }
      const un = (bd.unscheduled || []); if (un.length) { const t = clean([`Unscheduled · ${un.length}`, ...un.slice(0, 8).map(i => `#${i.issue} ${W.plain(i.title, 60)}`), un.length > 8 ? `… ${un.length - 8} more` : ""].filter(Boolean).join("\n"), ctx); if (t) kids.push(leaf(W.genId(`${key}.unscheduled`), W.block(0, 0, LEAF_W + 60, t, { ...W.LOOK.neighbour, textAlign: "left" }))); }
      if (!kids.length) kids.push(leaf(W.genId(`${key}.quiet`), W.block(0, 0, LEAF_W, "No open run, roadmap or unscheduled issue", W.LOOK.neighbour)));
    }
    return group(W.genId(key), clean(`${r.owner}/${r.name}`, ctx) || r.name, kids, { part: `${r.owner}/${r.name}` });
  };
  const parts = {}, main = [];
  const orgNode = (owner, repos, sub) => group(W.genId(`org.${owner}`), clean(sub ? `${owner} · sub-organization of ${sub}` : owner, ctx) || owner, repos.map(repoNode), { part: owner });
  main.push(orgNode(b.organization, b.repositories || [], null));
  (b.organizations || []).forEach(x => main.push(orgNode(x.owner, x.repositories || [], x.parent)));
  const walk = n => { if (n.part) parts[n.id] = n.part; (n.children || []).forEach(walk); }; main.forEach(walk);
  const notes = [], sources = {};
  ideasAt(o.root, o.sha, "docs/plans/org-work-board/ideas.json").forEach(i => {
    const n = noteLeaf(W.genId(`idea-${i.id}`), `Idea ${i.id} · ${i.kind}${i.issue ? ` · ${i.issue}` : ""} — ${i.text}`, ctx, null);
    if (!n) return; n.concerns = (i.concerns || []).map(c => String(c).split(":")[0]); notes.push(n); if (i.source && i.source.element) sources[n.id] = { scope: i.source.scope, element: i.source.element }; });
  const free = { id: W.genId("free-area"), title: "Ideas across repositories: your space" };
  return layOut({ o, sha, ctx, title: clean(b.organization, ctx) || "Organization", stamp: `as of ${String(b.generated || "").slice(0, 10)} (the org work board at ${sha})`, branch: null, main, neighbours: [], notes, els: [], parts, planned: new Set(), sources, scopeOf: "org", free, inScope: new Set() });
}

/* ---------- Placing it all, the runs in progress and the Legend ---------- */
function layOut(g) {
  const out = [], ctx = g.ctx;
  out.push({ id: W.genId("title"), data: W.label(0, 0, g.title, "title") });
  out.push({ id: W.genId("stamp"), data: W.label(0, 72, `${g.stamp} · generated; what you add around it is yours, and a refresh never changes it`, "body", 900) });
  /* the main part, its neighbours to the right, the notes beyond them */
  const X0 = 400, Y0 = 200; let x = X0, bottom = Y0;
  g.main.forEach(measure);
  const mainW = Math.max(...g.main.map(n => n.w), LEAF_W);
  { let cy = Y0; g.main.forEach(n => { place(n, x, cy + (n.kind === "group" ? TITLE_ROOM : 0), out); cy += n.h + (n.kind === "group" ? TITLE_ROOM : 0) + GAP; }); bottom = Math.max(bottom, cy); }
  x += mainW + 144;
  if (g.neighbours.length) { bottom = Math.max(bottom, column(g.neighbours, x, Y0 + TITLE_ROOM, out)); x += LEAF_W + 144; }
  /* notes: capped, with one note saying how many more there are */
  let notes = g.notes;
  if (notes.length > MAX_NOTES) { const more = notes.length - MAX_NOTES + 1; notes = [...notes.slice(0, MAX_NOTES - 1), noteLeaf(W.genId("notes-more"), `… and ${more} more open issues, follow-ups, known gaps and ideas: the repository work board and the issue boards list them`, ctx, null)].filter(Boolean); }
  if (notes.length) {
    const head = { id: W.genId("notes-heading"), data: W.label(x, Y0 - 8, "Open issues, follow-ups, known gaps and ideas", "body") }; out.push(head);
    const perCol = Math.ceil(notes.length / Math.max(1, Math.ceil(notes.length / 12)));
    for (let i = 0; i < notes.length; i += perCol) { bottom = Math.max(bottom, column(notes.slice(i, i + perCol), x, Y0 + 32, out)); x += NOTE_W + PAD; }
    x += 120;
  }
  if (g.free) { out.push({ id: g.free.id, data: W.section(x, Y0 + TITLE_ROOM, 760, 560, g.free.title), parent: null, section: true }); bottom = Math.max(bottom, Y0 + 600); }
  /* the runs in progress, each a section of its own below */
  const runs = (g.o.runs || []).map(runOf), runIds = [];
  let ry = bottom + 120;
  runs.forEach(r => {
    if (r.miss) { ctx.skipped.push({ what: "a run in progress", why: r.miss }); return; }
    if (!r.plan) return;
    const p = r.plan, sys = (p.systems || []).map(s => s && s.slug).filter(Boolean);
    if (g.scopeOf !== "repository" && g.scopeOf !== "org" && !sys.some(s => g.inScope.has(s))) return;
    if (g.scopeOf === "org") return;
    const at = String((p.wip && (p.wip.updated || p.wip.since)) || "").replace(/:\d{2}(?:\.\d+)?Z$/, "Z").replace("T", " ");
    const stepName = (() => { try { return require(path.join(SKILL, "plan", "scripts", "passnames.js")).stepName((p.wip && p.wip.step) || ""); } catch (e) { return (p.wip && p.wip.step) || ""; } })();
    const kids = [];
    const st = clean(`Step: ${stepName || "not started"}${p.wip && p.wip.detail ? `\n${W.plain(p.wip.detail, 160)}` : ""}`, ctx); if (st) kids.push(leaf(W.genId(`run-${p.issue}.step`), W.block(0, 0, LEAF_W + 60, st, { ...W.LOOK.run, textAlign: "left" })));
    (p.rows || []).slice(0, 24).forEach(row => { const s = (row.asBuilt && row.asBuilt.state) || "pending", t = clean(`${W.plain(row.name || row.id, 80)}\n${s}`, ctx); if (t) kids.push(leaf(W.genId(`run-${p.issue}.${row.id}`), W.block(0, 0, LEAF_W, t, W.LOOK.run))); });
    const title = clean(`#${p.issue} ${W.plain(p.issueTitle || p.title || "", 80)} — in progress as of ${at || "now"}`, ctx) || `#${p.issue} — in progress as of ${at || "now"}`;
    const n = measure(group(W.genId(`run-${p.issue}`), title, kids)); place(n, X0, ry + TITLE_ROOM, out); ry += n.h + TITLE_ROOM + GAP; runIds.push(p.issue);
  });
  /* arrows: the model's, then a note to each part it concerns */
  const ids = new Set(out.map(e => e.id));
  g.els.filter(a => ids.has(a.data.from) && ids.has(a.data.to)).forEach(a => out.push(a));
  const partToId = new Map(Object.entries(g.parts).map(([id, p]) => [p, id]));
  g.notes.forEach(n => (n.concerns || []).forEach(c => { const to = partToId.get(c) || partToId.get(String(c).replace(/^[^:]*:/, "")); if (to && ids.has(n.id)) out.push({ id: W.genId(`about.${n.id.slice(4)}>${to.slice(4)}`), data: W.arrow(n.id, to, null, { head: "none" }), arrow: true }); }));
  /* the Legend: one sample of each look drawn */
  const looks = new Set(out.filter(e => e.data.type === "shape").map(e => e.data.hollow ? "planned" : e.data.stroke === "terracotta" ? "note" : e.data.color === "blue" ? "part" : "neighbour"));
  const dashed = out.some(e => e.data.type === "arrow" && e.data.dash);
  const L = [];
  const sample = (k, text, look) => L.push(leaf(W.genId(`legend.${k}`), W.block(0, 0, 252, text, { ...look, textAlign: "left" })));
  if (looks.has("part")) sample("part", g.scopeOf === "org" ? "A repository's runs in progress" : "A part of what this Whiteboard is about, as built", W.LOOK.part);
  if (looks.has("neighbour")) sample("neighbour", g.scopeOf === "org" ? "A repository's roadmap or unscheduled issues" : "A neighbour: a person or a system it works with", W.LOOK.neighbour);
  if (looks.has("planned")) sample("planned", "planned · a part not built yet (its outline hollow)", W.LOOK.planned);
  if (looks.has("note")) sample("note", "A note: an open issue, a follow-up, a known gap or an idea", W.LOOK.note);
  if (dashed) sample("dashed", "A dashed arrow: a planned relationship", W.LOOK.neighbour);
  sample("sections", "A section: a system, a supersystem, a run in progress or an organization, named in its title", W.LOOK.neighbour);
  const legend = measure(group(W.genId("legend"), "Legend (generated)", L, { cols: 1 }));
  const legendOut = []; place(legend, 0, Y0 + TITLE_ROOM, legendOut);
  /* back to front: the sections first (outer before inner), then the rest in the order laid out */
  const all = [...legendOut, ...out], sections = all.filter(e => e.section), rest = all.filter(e => !e.section);
  const elements = [...sections, ...rest].map(e => ({ id: e.id, data: e.data, ...(e.parent ? { parent: e.parent } : {}) }));
  const dup = elements.map(e => e.id).filter((id, i, a) => a.indexOf(id) !== i); if (dup.length) throw new Error(`the generator made one id twice: ${[...new Set(dup)].join(", ")}`);
  return { schema: SCHEMA, scope: g.o.scope, sha: g.sha, branch: g.branch, title: g.title, stamp: g.stamp, generated: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    elements, parts: g.parts, sources: g.sources, runs: runIds, skipped: ctx.skipped };
}

/* ---------- The refresh's plan (GUIDANCE.md §13, "A refresh writes only what it wrote") ---------- */
const KEEP_PLACE = ["x", "y", "w", "h"];
const CHANGEABLE = ["text", "color", "stroke", "hollow", "kind", "size", "label", "dash", "from", "to", "head", "textAlign", "wrap", "type", "points"];
const boxOf = d => d && Number.isFinite(d.x) && Number.isFinite(d.y) ? { x: d.x, y: d.y, w: Number.isFinite(d.w) ? d.w : W.textWidth(d.text || "", d.size), h: Number.isFinite(d.h) ? d.h : 40 } : null;
const overlaps = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function planRefresh(gen, board, opts) {
  const els = board.elements, writes = [], summary = { add: [], update: [], stub: [], remove: [], kept: 0, notDrawn: [] };
  const userArrows = [...els].filter(([id, d]) => !W.isGenerated(id) && d.data && d.data.type === "arrow");
  const pointedAt = id => userArrows.some(([, a]) => a.data.from === id || a.data.to === id);
  /* an idea harvested from a note still on this Whiteboard gets no note: the user's own stands for it (O10) */
  const kept = gen.elements.filter(e => { const s = gen.sources && gen.sources[e.id]; if (s && s.scope === gen.scope && els.has(s.element) && !W.isGenerated(s.element)) { summary.notDrawn.push(e.id); return false; } return true; });
  /* an arrow goes with an end that is not drawn */
  const keptIds = new Set(kept.map(e => e.id)), want = kept.filter(e => e.data.type !== "arrow" || [e.data.from, e.data.to].every(x => typeof x !== "string" || keptIds.has(x) || (els.has(x) && !W.isGenerated(x))));
  const wantIds = new Set(want.map(e => e.id));
  const userBoxes = [...els].filter(([id, d]) => !W.isGenerated(id) && d.data && d.data.type !== "arrow").map(([, d]) => boxOf(d.data)).filter(Boolean);
  const allBoxes = [...els].map(([, d]) => boxOf(d.data)).filter(Boolean);
  /* a new element inside a generated section the user moved goes where that section now is */
  const delta = new Map();
  want.forEach(e => { const cur = els.get(e.id); if (cur && cur.data && Number.isFinite(cur.data.x) && Number.isFinite(e.data.x)) delta.set(e.id, { dx: cur.data.x - e.data.x, dy: cur.data.y - e.data.y }); });
  const shiftOf = e => { for (let p = e.parent; p; p = (want.find(x => x.id === p) || {}).parent) if (delta.has(p)) return delta.get(p); return { dx: 0, dy: 0 }; };
  const fresh = want.filter(e => !els.has(e.id)).map(e => { const s = shiftOf(e); return { ...e, data: Number.isFinite(e.data.x) ? { ...e.data, x: e.data.x + s.dx, y: e.data.y + s.dy } : e.data }; });
  /* what lands on a user's element moves, with all that is new, below everything on the board: never over a user's element */
  if (fresh.some(e => userBoxes.some(b => overlaps(boxOf(e.data), b)))) {
    const below = (allBoxes.length ? Math.max(...allBoxes.map(b => b.y + b.h)) : 0) + 200, top = Math.min(...fresh.filter(e => Number.isFinite(e.data.y)).map(e => e.data.y));
    fresh.forEach(e => { if (Number.isFinite(e.data.y)) e.data = { ...e.data, y: e.data.y - top + below }; });
  }
  fresh.forEach(e => { writes.push({ op: "set", collection: "elements", doc_id: e.id, data: e.data }); summary.add.push(e.id); });
  want.filter(e => els.has(e.id)).forEach(e => {
    const cur = els.get(e.id), d = cur.data || {}, change = {};
    CHANGEABLE.forEach(k => { const a = d[k], b = e.data[k]; if (JSON.stringify(a === undefined ? null : a) !== JSON.stringify(b === undefined ? null : b)) change[k] = b === undefined ? { __delete__: true } : b; });
    /* a part come back where its stub stood */
    if (!Object.keys(change).length) { summary.kept++; return; }
    writes.push({ op: "update", collection: "elements", doc_id: e.id, data: change, if_version: cur.version }); summary.update.push(e.id);
  });
  [...els].filter(([id]) => W.isGenerated(id) && !wantIds.has(id)).forEach(([id, cur]) => {
    const d = cur.data || {};
    if (d.type !== "arrow" && pointedAt(id)) {
      const was = String(d.text || "").split("\n")[0].replace(/ — removed at \S+$/, ""), text = `${was} — removed at ${gen.sha}`;
      if (d.text === text) { summary.kept++; return; }
      writes.push({ op: "update", collection: "elements", doc_id: id, data: { text, color: "white", stroke: { __delete__: true }, hollow: { __delete__: true } }, if_version: cur.version }); summary.stub.push(id); return; }
    writes.push({ op: "delete", collection: "elements", doc_id: id, if_version: cur.version }); summary.remove.push(id);
  });
  /* board/meta: the order merged, back to front (the user's elements keep theirs, a removed one leaves it, a new section goes behind all but
     the sections, anything else new on top), and the title; written under if_version, or set on a new board */
  const removed = new Set(summary.remove), curOrder = board.meta && board.meta.data && Array.isArray(board.meta.data.order) ? board.meta.data.order.filter(id => !removed.has(id)) : [];
  const known = new Set(curOrder), isSection = id => { const e = want.find(x => x.id === id) || {}; return e.data && e.data.type === "container"; };
  const newSections = fresh.filter(e => isSection(e.id) && !known.has(e.id)).map(e => e.id), newRest = fresh.filter(e => !isSection(e.id) && !known.has(e.id)).map(e => e.id);
  const lastSection = curOrder.reduce((k, id, i) => { const d = els.get(id); return d && d.data && d.data.type === "container" ? i : k; }, -1);
  const order = [...curOrder.slice(0, lastSection + 1), ...newSections, ...curOrder.slice(lastSection + 1), ...newRest];
  [...els.keys()].filter(id => !removed.has(id) && !order.includes(id)).forEach(id => order.push(id));
  const meta = board.meta && board.meta.data ? board.meta.data : null;
  if (!meta) writes.push({ op: "set", collection: "board", doc_id: "meta", data: { v: 1, title: gen.title, order } });
  else if (JSON.stringify(meta.order || []) !== JSON.stringify(order) || meta.title !== gen.title) writes.push({ op: "update", collection: "board", doc_id: "meta", data: { order, title: gen.title }, if_version: board.meta.version });
  /* batches of at most 50 writes and 1 MiB, the type's limits a call: creations of sections first, then their contents, updates, removals, and
     board/meta last, so the order never names an element not written yet */
  const metaW = writes.filter(w => w.collection === "board"), rest = writes.filter(w => w.collection !== "board");
  const rank = w => w.op === "set" ? (isSection(w.doc_id) ? 0 : w.data && w.data.type === "arrow" ? 2 : 1) : w.op === "update" ? 3 : 4;
  rest.sort((a, b) => rank(a) - rank(b));
  const batches = []; let cur = [];
  const flush = () => { if (cur.length) batches.push({ writes: cur }); cur = []; };
  [...rest, ...metaW].forEach(w => { if (cur.length >= W.LIMITS.batchWrites || W.bytes({ writes: [...cur, w] }) > W.LIMITS.batchBytes * 0.95) flush(); cur.push(w); }); flush();
  return { schema: "whiteboard-plan/1", scope: gen.scope, sha: gen.sha, title: gen.title, batches, summary };
}

/* ---------- The links list (docs/plans/.live/whiteboards.json) ---------- */
function linksFile(root) { return path.join(root, "docs", "plans", ".live", "whiteboards.json"); }
function readLinks(root, repo) { const f = linksFile(root); try { const d = JSON.parse(fs.readFileSync(f, "utf8")); if (d && Array.isArray(d.whiteboards)) return d; } catch (e) { /* a missing or broken list starts afresh */ } return { schema: "whiteboards/1", repo: repo || null, whiteboards: [] }; }
function writeLinks(root, d) {
  const f = linksFile(root); fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + ".tmp-" + process.pid; fs.writeFileSync(tmp, JSON.stringify(d, null, 2) + "\n"); fs.renameSync(tmp, f);
  /* docs/plans/.live/ is git-ignored through the checkout's .git/info/exclude, the line added if it is missing (a file edit, no git write) */
  const q = a => cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  if (q(["rev-parse", "--is-inside-work-tree"]).status === 0 && q(["check-ignore", "-q", "--no-index", "docs/plans/.live/whiteboards.json"]).status !== 0) {
    const g = q(["rev-parse", "--git-path", "info/exclude"]).stdout.trim(), ex = path.isAbsolute(g) ? g : path.join(root, g), had = fs.existsSync(ex) ? fs.readFileSync(ex, "utf8") : "";
    fs.mkdirSync(path.dirname(ex), { recursive: true }); fs.writeFileSync(ex, had + (had && !/\n$/.test(had) ? "\n" : "") + "docs/plans/.live/\n"); }
}
const SCOPE_RE = /^(?:system:[a-z0-9][a-z0-9._-]*|supersystem:[a-z0-9][a-z0-9._-]*|repository|org)$/;
const LINK_RE = /^https:\/\/claude\.ai\/(?:code\/)?artifact\/[A-Za-z0-9_-]+$/;

/* ---------- The command ---------- */
function opt(a, n) { const i = a.indexOf("--" + n); return i >= 0 ? a[i + 1] : undefined; }
function opts(a, n) { return a.map((x, i) => x === "--" + n ? a[i + 1] : null).filter(x => x != null); }
function writeOut(file, v) { const t = JSON.stringify(v, null, 2) + "\n"; if (file) { fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true }); fs.writeFileSync(file, t); } else process.stdout.write(t); }
function main() {
  const a = process.argv.slice(2), cmd = a.shift();
  const usage = "usage: node whiteboard.js generate --root <checkout> --sha <commit> --scope <scope> [--branch <name>] [--run <plan folder>]... [--out <file>]\n       node whiteboard.js plan --generated <file> --board <dir> [--out <file>]\n       node whiteboard.js check --plan <file> --board <dir>\n       node whiteboard.js links --root <checkout> (--set <scope> --title <t> --link <url> --sha <sha> [--at <iso>] | --remove <scope> | --list)\n       node whiteboard.js orphans --root <checkout> --sha <commit>";
  const spec = { generate: { valued: ["root", "sha", "scope", "branch", "run", "out"], flags: [] }, plan: { valued: ["generated", "board", "out"], flags: [] }, check: { valued: ["plan", "board"], flags: [] },
    links: { valued: ["root", "set", "title", "link", "sha", "at", "remove"], flags: ["list"] }, orphans: { valued: ["root", "sha"], flags: [] } }[cmd];
  if (!spec) { console.error(usage); process.exit(cmd === "--help" ? 0 : 2); }
  /* --run may be given more than once: the strict parser sees each */
  require(path.join(SKILL, "system", "scripts", "cliargs.js")).strict(a.filter((x, i) => !(x === "--run" || a[i - 1] === "--run")), { usage, ...spec, max: 0 });
  try {
    if (cmd === "generate") {
      const root = path.resolve(opt(a, "root") || "."), sha = opt(a, "sha"), scope = opt(a, "scope");
      if (!sha || !scope) { console.error(usage); process.exit(2); }
      const g = generate({ root, sha, scope, branch: opt(a, "branch"), runs: opts(a, "run").map(r => path.resolve(r)) });
      writeOut(opt(a, "out"), g);
      process.stderr.write(`generated ${g.scope} at ${g.sha}: ${g.elements.length} elements${g.runs.length ? `, in progress: #${g.runs.join(", #")}` : ""}${g.skipped.length ? `, ${g.skipped.length} left out` : ""}\n`);
      if (g.elements.length > W.LIMITS.elements) { console.error(`the generated part holds ${g.elements.length} elements, over the type's ${W.LIMITS.elements}`); process.exit(1); }
    } else if (cmd === "plan") {
      const gen = JSON.parse(fs.readFileSync(opt(a, "generated"), "utf8")), board = W.readBoard(opt(a, "board"));
      if (gen.schema !== SCHEMA) throw new Error(`${opt(a, "generated")} is not a generated part (${SCHEMA})`);
      const p = planRefresh(gen, board), P = W.checkBatches(p.batches, board, {});
      p.check = P.length ? P : "pass";
      if (P.length) { P.forEach(x => console.error(`FAIL ${x}`)); console.error("the plan fails the batch check: nothing to write"); process.exit(1); }
      writeOut(opt(a, "out"), p);
      process.stderr.write(`plan for ${p.scope}: ${p.batches.length} batch${p.batches.length === 1 ? "" : "es"}; add ${p.summary.add.length}, update ${p.summary.update.length}, stub ${p.summary.stub.length}, remove ${p.summary.remove.length}, unchanged ${p.summary.kept}${p.summary.notDrawn.length ? `, ${p.summary.notDrawn.length} idea note(s) not drawn (the user's own note stands for each)` : ""}\n`);
    } else if (cmd === "check") {
      const p = JSON.parse(fs.readFileSync(opt(a, "plan"), "utf8")), P = W.checkBatches(p.batches, W.readBoard(opt(a, "board")), {});
      P.forEach(x => console.log(`FAIL ${x}`)); console.log(P.length ? `batch check: ${P.length} problem(s)` : `batch check: pass (${(p.batches || []).length} batches)`); process.exit(P.length ? 1 : 0);
    } else if (cmd === "links") {
      const root = path.resolve(opt(a, "root") || "."), reg = W.readJson(fs.existsSync(path.join(root, "docs/dashboards/systems.json")) ? fs.readFileSync(path.join(root, "docs/dashboards/systems.json"), "utf8") : null), d = readLinks(root, reg && reg.repo);
      if (a.includes("--list")) { writeOut(null, d); return; }
      const set = opt(a, "set"), rm = opt(a, "remove");
      if (rm) { if (!SCOPE_RE.test(rm)) throw new Error(`--remove ${rm} is not a scope`); d.whiteboards = d.whiteboards.filter(x => x.scope !== rm); writeLinks(root, d); writeOut(null, { removed: rm, file: linksFile(root) }); return; }
      if (!set || !SCOPE_RE.test(set)) throw new Error(`--set ${set} is not a scope`);
      const link = opt(a, "link"), title = opt(a, "title"), sha = opt(a, "sha"), at = opt(a, "at") || new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      if (!LINK_RE.test(String(link))) throw new Error(`--link ${link} is not a claude.ai artifact link`);
      if (!title || !sha) throw new Error("--set needs --title and --sha");
      const entry = { scope: set, title, link, lastWrite: { at, sha } }, k = d.whiteboards.findIndex(x => x.scope === set);
      if (k >= 0) d.whiteboards[k] = entry; else d.whiteboards.push(entry);
      writeLinks(root, d); writeOut(null, { set: entry, file: linksFile(root) });
    } else if (cmd === "orphans") {
      const root = path.resolve(opt(a, "root") || "."), reg = registryAt(root, opt(a, "sha")), d = readLinks(root), slugs = new Set(reg.systems.map(s => s.slug));
      const gone = d.whiteboards.filter(x => /^(system|supersystem):/.test(x.scope) && !slugs.has(x.scope.split(":")[1]));
      writeOut(null, { orphans: gone, note: gone.length ? "each is no longer refreshed; its delete waits on the user's confirmation at the team's console" : "none" });
    }
  } catch (e) { console.error(`whiteboard: ${e.message}`); process.exit(1); }
}
if (require.main === module) main();
module.exports = { SCHEMA, generate, planRefresh, readLinks, writeLinks, runOf, openIssues, openFollowUps, subjectOf };
