// The data of a state page (system/RULES.md §2, §10): what system, supersystem and repository pages render their stamps and their
// planned parts from, and the edits the data-only path makes to it. Not a command: apply-state.js writes through it and
// check-page.js checks with it.
//
//   state.json      beside each page, embedded verbatim as <script type="application/json" id="state">: the page's own stamp
//                   ({slug, version, asIs {ref, sha, date, landed}, lastAmended {issue, title, sha}, written {sha}})
//   workspace.dsl   beside each page, embedded as id="dsl": a part is planned while its element carries the Planned tag
//   systems.json    docs/dashboards/systems.json, embedded as id="systems" in supersystem and repository pages: a system is
//                   planned while its entry's status is "planned"
"use strict";
const fs = require("fs"), path = require("path");

const norm = s => String(s).replace(/\r\n/g, "\n");

/* ---------- Embedded blocks (as embed.js writes them) ---------- */
const blockRe = id => new RegExp(`(<script type="[^"]+" id="${id}">\\r?\\n)([\\s\\S]*?)(</script>)`);
/* the text of a page's block, trimmed, LF line endings; null when the page has no such block */
function blockText(html, id) { const m = String(html).match(blockRe(id)); return m ? norm(m[2]).trim() : null; }
/* the page with `content` embedded verbatim as block `id`, in the page's own line endings (embed.js's rule) */
function embedInto(html, id, content) {
  const c = norm(content).trim();
  if (c.includes("</script>")) throw new Error(`the ${id} data must not contain '</script>'`);
  const eol = String(html).includes("\r\n") ? "\r\n" : "\n", re = blockRe(id);
  if (!re.test(html)) throw new Error(`the page has no <script ... id="${id}"> block`);
  return html.replace(re, (_, a, __, z) => a + c.replace(/\n/g, eol) + eol + z);
}

/* ---------- The registry ---------- */
/* docs/dashboards/systems.json above a page (or in a worktree), or null */
function findRegistry(start) {
  let dir = fs.existsSync(start) && fs.statSync(start).isDirectory() ? path.resolve(start) : path.dirname(path.resolve(start));
  for (;;) {
    if (path.basename(dir) === "dashboards" && fs.existsSync(path.join(dir, "systems.json"))) return path.join(dir, "systems.json");
    if (fs.existsSync(path.join(dir, "docs", "dashboards", "systems.json"))) return path.join(dir, "docs", "dashboards", "systems.json");
    if (path.dirname(dir) === dir) return null;
    dir = path.dirname(dir);
  }
}
/* the entries a registry entry contains: its children, theirs, and so on */
function isAncestor(systems, anc, slug) {
  const by = s => systems.find(x => x.slug === s);
  for (let s = by(slug), seen = 0; s && s.parent && seen < 64; s = by(s.parent), seen++) if (s.parent === anc) return true;
  return false;
}

/* JSON written in the registry's own one-line style: {"k": v, "k2": v2}, [a, b] */
function inline(v) {
  if (Array.isArray(v)) return "[" + v.map(inline).join(", ") + "]";
  if (v && typeof v === "object") return "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + inline(x)).join(", ") + "}";
  return JSON.stringify(v);
}
/* The span of a JSON value starting at i (after whitespace): [start, end). Strings are respected. */
function valueSpan(t, i) {
  while (/\s/.test(t[i])) i++;
  const s = i;
  if (t[i] === '"') { i++; while (i < t.length && t[i] !== '"') i += t[i] === "\\" ? 2 : 1; return [s, i + 1]; }
  if (t[i] === "{" || t[i] === "[") {
    let depth = 0;
    for (; i < t.length; i++) {
      const c = t[i];
      if (c === '"') { i++; while (i < t.length && t[i] !== '"') i += t[i] === "\\" ? 2 : 1; continue; }
      if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") { depth--; if (!depth) return [s, i + 1]; }
    }
    return null;
  }
  const m = /^(-?\d[\d.eE+-]*|true|false|null)/.exec(t.slice(i)); return m ? [s, s + m[0].length] : null;
}
/* The top-level keys of the object whose "{" is at `open`: key → {key: [start of the key string], value: [start, end)} */
function objectKeys(t, open) {
  const keys = {}; let i = open + 1;
  for (;;) {
    while (/[\s,]/.test(t[i])) i++;
    if (t[i] === "}" || i >= t.length) return { keys, close: i };
    const ks = valueSpan(t, i); if (!ks) return { keys, close: i };
    const key = JSON.parse(t.slice(ks[0], ks[1])); i = ks[1];
    while (/\s/.test(t[i])) i++; i++; /* the colon */
    const vs = valueSpan(t, i); if (!vs) return { keys, close: i };
    keys[key] = { key: ks[0], value: vs }; i = vs[1];
  }
}
/* The registry text with the given fields of an entry (by slug) set or deleted (undefined), and the top-level fields `top`, edited in
   place so the file keeps its own layout; falls back to a whole rewrite when the edit cannot be made or does not parse to the
   intended registry. */
function editRegistryText(text, reg, edits, top) {
  const want = JSON.parse(JSON.stringify(reg));
  Object.entries(top || {}).forEach(([k, v]) => { if (v === undefined) delete want[k]; else want[k] = v; });
  Object.entries(edits).forEach(([slug, f]) => { const e = want.systems.find(x => x.slug === slug); Object.entries(f).forEach(([k, v]) => { if (v === undefined) delete e[k]; else e[k] = v; }); });
  let t = norm(text);
  try {
    const apply = (open, fields) => {
      /* right to left, so earlier offsets stay valid */
      const { keys, close } = objectKeys(t, open), ops = [], adds = [];
      Object.entries(fields).forEach(([k, v]) => {
        if (keys[k] && v === undefined) { let a = keys[k].key, b = keys[k].value[1]; const before = t.slice(0, a).match(/,\s*$/); if (before) a -= before[0].length; else { const after = t.slice(b).match(/^\s*,/); if (after) b += after[0].length; } ops.push([a, b, ""]); }
        else if (keys[k]) ops.push([keys[k].value[0], keys[k].value[1], inline(v)]);
        else if (v !== undefined) adds.push(JSON.stringify(k) + ": " + inline(v));
      });
      /* new fields go together before the object's closing brace, in the order given */
      if (adds.length) { let c = close; while (/\s/.test(t[c - 1])) c--; ops.push([c, c, (Object.keys(keys).length ? ", " : "") + adds.join(", ")]); }
      ops.sort((x, y) => y[0] - x[0]).forEach(([a, b, s]) => { t = t.slice(0, a) + s + t.slice(b); });
    };
    /* the entries first (they sit after the top-level fields' values in the usual layout, but are found afresh each time) */
    Object.entries(edits).forEach(([slug, f]) => {
      const m = new RegExp(`\\{\\s*"slug"\\s*:\\s*${JSON.stringify(slug).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).exec(t);
      if (!m) throw new Error("entry not found");
      apply(m.index, f);
    });
    if (top && Object.keys(top).length) apply(t.indexOf("{"), top);
    /* the same registry, key order aside */
    const canon = v => Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : v && typeof v === "object" ? "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}" : JSON.stringify(v);
    if (canon(JSON.parse(t)) !== canon(want)) throw new Error("the in-place edit does not give the intended registry");
    return { text: t, inPlace: true, reg: want };
  } catch (e) {
    return { text: JSON.stringify(want, null, 2) + "\n", inPlace: false, reg: want };
  }
}

/* ---------- workspace.dsl: the elements, their tags, the as-is line ---------- */
const TYPES = ["person", "softwareSystem", "container", "component"];
const tok = l => { const out = [], re = /"([^"]*)"|(\S+)/g; let m; while ((m = re.exec(l))) out.push(m[1] !== undefined ? { s: m[1] } : { t: m[2] }); return out; };
/* Every element of the model with its hierarchical id, line index and tags, read as the page's parseDsl() reads them. */
function dslElements(text) {
  const lines = norm(text).split("\n"), stack = [], out = [];
  const parentEl = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].kind === "element") return stack[i].id; return null; };
  const inBlock = k => stack.some(f => f.kind === k);
  lines.forEach((raw, i) => {
    let line = raw.trim(); if (!line || line.startsWith("//")) return;
    if (line === "}") { stack.pop(); return; }
    const opens = line.endsWith("{"); if (opens) line = line.slice(0, -1).trim();
    const T = tok(line); if (!T.length) { if (opens) stack.push({ kind: "anon" }); return; }
    const t0 = T[0].t;
    if (["workspace", "model", "views", "styles"].includes(t0)) { if (opens) stack.push({ kind: t0 }); return; }
    if (t0 === "!identifiers" || inBlock("styles") || inBlock("views")) { if (opens) stack.push({ kind: "anon" }); return; }
    if (T.length >= 3 && T[1].t === "->") { if (opens) stack.push({ kind: "anon" }); return; }
    if (T.length >= 3 && T[1].t === "=" && TYPES.includes(T[2].t)) {
      const type = T[2].t, S = T.slice(3).filter(x => x.s !== undefined).map(x => x.s), parent = parentEl(), id = parent ? parent + "." + t0 : t0;
      const tagIndex = type === "person" || type === "softwareSystem" ? 2 : 3;
      const tags = (S[tagIndex] || "").split(",").map(x => x.trim()).filter(Boolean);
      out.push({ id, ident: t0, type, line: i, parent, name: S[0] || t0, tags, tagIndex });
      if (opens) stack.push({ kind: "element", id });
      return;
    }
    if (opens) stack.push({ kind: "anon" });
  });
  return out;
}
/* The DSL with an element's Planned tag set (planned) or removed (built), and `add` tags added; null when the element is not there. */
function setPlannedTag(text, id, planned, add) {
  const t = norm(text), lines = t.split("\n"), e = dslElements(t).find(x => x.id === id);
  if (!e) return null;
  let tags = e.tags.filter(x => x !== "Planned");
  (add || []).forEach(a => { if (a && a !== "Planned" && !tags.includes(a)) tags.push(a); });
  if (planned) tags.push("Planned");
  const raw = lines[e.line], strs = [...raw.matchAll(/"[^"]*"/g)], want = tags.join(",");
  if (strs.length > e.tagIndex) {
    const m = strs[e.tagIndex];
    if (want) lines[e.line] = raw.slice(0, m.index) + JSON.stringify(want) + raw.slice(m.index + m[0].length);
    else { const pre = raw.slice(0, m.index).replace(/\s+$/, ""); lines[e.line] = pre + raw.slice(m.index + m[0].length); }
  } else if (want) {
    /* the strings before the tags that the line leaves out are written empty, so the tags land in their place */
    const last = strs.length ? strs[strs.length - 1] : null, at = last ? last.index + last[0].length : raw.length - (raw.trimEnd().endsWith("{") ? raw.length - raw.lastIndexOf("{") : 0);
    const fill = ' ""'.repeat(Math.max(0, e.tagIndex - strs.length));
    lines[e.line] = raw.slice(0, at) + fill + " " + JSON.stringify(want) + raw.slice(at);
  }
  return lines.join("\n");
}
/* The DSL restamped: the header's "// As-is at <repo> <ref> <sha> (<date>…)" line takes the new ref, sha and date (", not yet landed" on a
   branch), and the old sha in the views' descriptions ("… as built at <sha>.") takes the new one. Returns {text, line} (line: the as-is
   line was found and rewritten). */
function restampDsl(text, oldSha, asIs, oldRef) {
  let t = norm(text), line = false;
  const day = String(asIs.date || "").slice(0, 10), rx = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  t = t.replace(/^(\/\/ As-is at \S+ )(\S+) (\S+) \(([^)]*)\)/m, (_, head) => { line = true; return `${head}${asIs.ref} ${asIs.sha} (${day}${asIs.landed === false ? ", not yet landed" : ""})`; });
  if (oldSha && /^[0-9a-f]{7,40}$/.test(oldSha) && oldSha !== asIs.sha) {
    const v = t.search(/^\s*views\s*\{/m), re = new RegExp(`${oldRef ? `(?:${rx(oldRef)} )?` : ""}\\b${oldSha}\\b`, "g");
    if (v >= 0) t = t.slice(0, v) + t.slice(v).replace(re, m => (oldRef && m.startsWith(oldRef + " ") ? asIs.ref + " " : "") + asIs.sha);
  }
  return { text: t, line };
}

/* ---------- state.json ---------- */
/* state.json as it is written: one field per line, each value on that line ({"ref": "main", "sha": …}), as the templates show it */
const stateText = st => "{\n" + Object.entries(st).map(([k, v]) => "  " + JSON.stringify(k) + ": " + inline(v)).join(",\n") + "\n}\n";
/* The shape of a page's state: a list of problems (empty when it is in its form). */
function stateProblems(s) {
  const p = [], str = (v, k) => { if (typeof v !== "string" || !v.trim()) p.push(`${k} is not a string`); };
  if (!s || typeof s !== "object" || Array.isArray(s)) return ["state.json is not an object"];
  str(s.slug, "slug");
  if (s.version != null && typeof s.version !== "string") p.push("version is neither a string nor null");
  if (!s.asIs || typeof s.asIs !== "object") p.push("asIs is not an object");
  else { str(s.asIs.ref, "asIs.ref"); str(s.asIs.sha, "asIs.sha"); str(s.asIs.date, "asIs.date"); if (s.asIs.landed != null && typeof s.asIs.landed !== "boolean") p.push("asIs.landed is not true or false"); }
  if (s.lastAmended != null) {
    if (typeof s.lastAmended !== "object") p.push("lastAmended is not an object");
    else { if (!Number.isInteger(s.lastAmended.issue)) p.push("lastAmended.issue is not an issue number"); ["title", "sha"].forEach(k => { if (s.lastAmended[k] != null && typeof s.lastAmended[k] !== "string") p.push(`lastAmended.${k} is not a string`); }); }
  }
  if (s.written != null && (typeof s.written !== "object" || typeof s.written.sha !== "string")) p.push("written is not {sha}");
  return p;
}
/* Where a page's state and its registry entry disagree: [field, page value, registry value] */
function stateVsRegistry(s, e, kind) {
  const d = [], a = s.asIs || {}, b = e.asIs || {}, la = s.lastAmended || {}, lb = e.lastAmended || {};
  const cmp = (f, x, y) => { if (JSON.stringify(x == null ? null : x) !== JSON.stringify(y == null ? null : y)) d.push([f, x, y]); };
  cmp("asIs.ref", a.ref, b.ref); cmp("asIs.sha", a.sha, b.sha); cmp("asIs.date", a.date, b.date); cmp("asIs.landed", a.landed !== false, b.landed !== false);
  cmp("lastAmended.issue", la.issue, lb.issue);
  if (kind === "system") cmp("version", s.version, e.version);
  return d;
}

/* The part references a page makes: data-part="…" in its HTML (outside scripts) and part:"…" in its MODEL. */
function partRefs(html) {
  const h = norm(html), refs = new Set();
  const body = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  [...body.matchAll(/\bdata-part="([^"]+)"/g)].forEach(m => refs.add(m[1]));
  const i = h.indexOf("const MODEL = {"), j = i < 0 ? -1 : h.indexOf("\n};\n", i);
  if (i >= 0 && j > i) [...h.slice(i, j).replace(/^\s*\/\/.*$/gm, "").matchAll(/\bpart\s*:\s*"([^"]+)"/g)].forEach(m => refs.add(m[1]));
  return [...refs];
}

module.exports = { stateText, norm, blockText, embedInto, findRegistry, isAncestor, inline, editRegistryText, dslElements, setPlannedTag, restampDsl, stateProblems, stateVsRegistry, partRefs };
