// The rendered copies of the Markdown an issue board links (plan/RULES.md §1, "The Markdown copies"). Not a command: embed.js (and so
// apply-event.js and new.js) and board.js --live call it.
//
// Every Markdown document a board links — its plan.md or plan-<unit>.md, final-implementation.md, consequences.md (impact.md in a folder
// older than the rename), architecture.md, the
// research README and findings, anything its data names as a relative *.md path — is rendered into a self-contained HTML copy under
// the git-ignored docs/plans/.live/docs/ of the board's own tree, at the same path relative to docs/plans/ with .md become .html (a
// document outside docs/plans/ goes under .live/docs/_repo/<its path from the repository root>). A copy has GitHub's heading anchors,
// so a statement's "(§n)" reference opens it at its section; its links to the other copies are rewritten to them and every other
// relative link to the file itself; it carries the boards' light and dark palettes and the theme switch. docs/plans/.live/docs/index.js
// lists the copies on disk ((window.DASHBOARDS_LIVE||{}).docs, repository-relative .md paths): a board, the repository work board and a copy load it
// and open the copy when one exists, else the .md. The copies are a cache of this machine, never committed: they are written only where
// docs/plans/.live/ is git-ignored (the main checkout's .git/info/exclude, shared by every worktree) or outside a git work tree.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/* GitHub's heading anchors (github-slugger), as lib.js mdHeadings() computes them */
const slugOf = (t, seen) => { let s = String(t).replace(/<[^>]+>/g, "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
  const base = s; if (seen[base] != null) { seen[base]++; s = base + "-" + seen[base]; } else seen[base] = 0; return s; };

/* ---------- Inline Markdown: code spans, links, images (as links), emphasis, strike-through, autolinks, hard breaks ---------- */
function inline(t, link) {
  const codes = [];
  let s = String(t).replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (m, f, c) => { codes.push(`<code>${esc(c.replace(/^ (.*) $/, "$1"))}</code>`); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (m, alt, u) => `<a href="${esc(link(u.replace(/&amp;/g, "&")))}">${alt || "image"}</a>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (m, txt, u) => { const h = link(u.replace(/&amp;/g, "&")); return `<a href="${esc(h)}"${/^https?:/i.test(h) ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`; });
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (m, u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (m, a, b) => `<strong>${a || b}</strong>`);
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>").replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>").replace(/ {2,}$/gm, "<br>");
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[+i]);
}

/* ---------- Blocks: headings, paragraphs, lists (nested by indentation), block quotes, fenced code, tables, rules ---------- */
function render(md, link) {
  const lines = String(md).replace(/\r\n/g, "\n").replace(/\t/g, "    ").split("\n"), seen = {};
  const out = [];
  const isFence = l => /^ {0,3}(`{3,}|~{3,})/.exec(l);
  const isTableSep = l => /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(l) && l.includes("-");
  const cells = l => { let x = l.trim(); if (x.startsWith("|")) x = x.slice(1); if (x.endsWith("|") && !x.endsWith("\\|")) x = x.slice(0, -1); return x.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|")); };
  const listItem = l => /^( *)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(l);
  function blocks(ls) {
    const h = []; let i = 0;
    while (i < ls.length) {
      const l = ls[i];
      if (!l.trim()) { i++; continue; }
      const f = isFence(l);
      if (f) { const fence = f[1], lang = l.slice(l.indexOf(fence) + fence.length).trim().split(/\s/)[0]; const body = []; i++;
        while (i < ls.length && !(new RegExp(`^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`).test(ls[i]))) body.push(ls[i++]);
        i++; h.push(`<pre><code${lang ? ` class="lang-${esc(lang)}"` : ""}>${esc(body.join("\n"))}</code></pre>`); continue; }
      const hm = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
      if (hm) { const id = slugOf(hm[2], seen); h.push(`<h${hm[1].length} id="${esc(id)}"><a class="anchor" href="#${esc(id)}" aria-label="Link to this section">#</a>${inline(hm[2], link)}</h${hm[1].length}>`); i++; continue; }
      if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(l)) { h.push("<hr>"); i++; continue; }
      if (/^ {0,3}>/.test(l)) { const q = []; while (i < ls.length && ls[i].trim() && /^ {0,3}>/.test(ls[i])) q.push(ls[i++].replace(/^ {0,3}> ?/, "")); h.push(`<blockquote>${blocks(q)}</blockquote>`); continue; }
      if (l.includes("|") && i + 1 < ls.length && isTableSep(ls[i + 1])) {
        const head = cells(l), al = cells(ls[i + 1]).map(c => c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : ""); i += 2;
        const rows = []; while (i < ls.length && ls[i].trim() && ls[i].includes("|")) rows.push(cells(ls[i++]));
        const td = (t, c, k) => `<${t}${al[k] ? ` style="text-align:${al[k]}"` : ""}>${inline(c, link)}</${t}>`;
        h.push(`<div class="tbl"><table><thead><tr>${head.map((c, k) => td("th", c, k)).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${head.map((x, k) => td("td", r[k] || "", k)).join("")}</tr>`).join("")}</tbody></table></div>`); continue; }
      const li = listItem(l);
      if (li) {
        const ind = li[1].length, ordered = /\d/.test(li[2]), start = ordered ? parseInt(li[2], 10) : 1, items = [];
        while (i < ls.length) {
          const m = listItem(ls[i]);
          if (m && m[1].length === ind && /\d/.test(m[2]) === ordered) { items.push([m[3]]); i++; continue; }
          if (!ls[i].trim()) { const nx = ls.slice(i + 1).find(x => x.trim()); if (nx != null && (/^\s/.test(nx) && (nx.length - nx.trimStart().length) > ind)) { items[items.length - 1].push(""); i++; continue; } break; }
          if ((ls[i].length - ls[i].trimStart().length) > ind || (!m && !isFence(ls[i]) && !/^ {0,3}(#|>)/.test(ls[i]) && items.length)) { items[items.length - 1].push(ls[i].replace(new RegExp(`^ {0,${ind + 4}}`), "")); i++; continue; }
          break;
        }
        const itemHtml = it => { const t = /^\[( |x|X)\]\s+/.exec(it[0]); const first = t ? it[0].slice(t[0].length) : it[0]; const rest = it.slice(1);
          const inner = rest.some(x => x.trim()) ? (rest.some(x => listItem(x) || isFence(x) || !x.trim()) ? `<p>${inline(first, link)}</p>` + blocks(rest) : inline([first, ...rest].join(" "), link)) : inline(first, link);
          return `<li${t ? ' class="task"' : ""}>${t ? `<input type="checkbox" disabled${t[1] !== " " ? " checked" : ""}> ` : ""}${inner}</li>`; };
        h.push(ordered ? `<ol${start !== 1 ? ` start="${start}"` : ""}>${items.map(itemHtml).join("")}</ol>` : `<ul>${items.map(itemHtml).join("")}</ul>`); continue;
      }
      const p = []; while (i < ls.length && ls[i].trim() && !isFence(ls[i]) && !/^ {0,3}(#{1,6}\s|>)/.test(ls[i]) && !listItem(ls[i]) && !(ls[i].includes("|") && i + 1 < ls.length && isTableSep(ls[i + 1]))) p.push(ls[i++]);
      if (p.length) h.push(`<p>${inline(p.join("\n"), link)}</p>`); else i++;
    }
    return h.join("\n");
  }
  out.push(blocks(lines));
  return out.join("\n");
}

/* The board of one copy: the boards' palettes, the theme switch (applied before the first paint), the rendered document. */
function page(title, srcRel, repo, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="dashboard" content="doc-copy">
<title>${esc(title)}</title>
<script>try{var t=localStorage.getItem("dashboards-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>
<style>
/* A rendered copy of a Markdown document an issue board links (plan/scripts/mdcopy.js; plan/RULES.md §1): the boards' palettes, light and
   dark; prose at its own measure. Never committed: it lives in the git-ignored docs/plans/.live/docs/ of this machine. */
:root{--bg:#f3f5f8;--surface:#fcfcfd;--surface-2:#eef1f6;--ink:#0e1420;--ink-2:#4a5468;--muted:#7d879a;--line:#dfe4ec;--link:#2a78d6;--focus:#2a78d6;
  --sans:system-ui,-apple-system,"Segoe UI",sans-serif;--mono:ui-monospace,"Cascadia Mono",Consolas,"SF Mono",monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#10141b;--surface:#171c25;--surface-2:#1f2530;--ink:#eef1f6;--ink-2:#b8c0ce;--muted:#8a93a5;--line:#2a313d;--link:#6aa6f0;--focus:#3987e5;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#10141b;--surface:#171c25;--surface-2:#1f2530;--ink:#eef1f6;--ink-2:#b8c0ce;--muted:#8a93a5;--line:#2a313d;--link:#6aa6f0;--focus:#3987e5;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 var(--sans);padding:0 max(16px,env(safe-area-inset-left,0px)) 40px}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.topbar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 12px;padding:18px 0 8px;font-size:12px;color:var(--muted);max-width:980px;margin:0 auto}
.topbar code{overflow-wrap:anywhere}
.themebtn{appearance:none;font:600 11px/1 var(--mono);padding:5px 9px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink-2);cursor:pointer;white-space:nowrap}
main{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:8px 28px 24px;max-width:980px;margin:0 auto;overflow-wrap:anywhere}
a{color:var(--link)}
h1,h2,h3,h4,h5,h6{line-height:1.3;margin:1.4em 0 .5em;text-wrap:balance}
h1{font-size:26px}h2{font-size:21px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{font-size:17px}h4,h5,h6{font-size:15px}
h1 .anchor,h2 .anchor,h3 .anchor,h4 .anchor,h5 .anchor,h6 .anchor{float:left;margin-left:-20px;width:20px;color:var(--muted);text-decoration:none;opacity:0}
h1:hover .anchor,h2:hover .anchor,h3:hover .anchor,h4:hover .anchor,h5:hover .anchor,h6:hover .anchor,.anchor:focus{opacity:1}
:target{scroll-margin-top:12px;background:color-mix(in srgb,var(--link) 8%,transparent);border-radius:4px}
code{font-family:var(--mono);font-size:.9em;background:var(--surface-2);border-radius:3px;padding:1px 4px}
pre{background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:12px 14px;overflow-x:auto;font:13px/1.5 var(--mono)}
pre code{background:none;padding:0}
blockquote{margin:0 0 1em;padding:2px 14px;border-left:3px solid var(--line);color:var(--ink-2)}
.tbl{overflow-x:auto;margin:0 0 1em}
table{border-collapse:collapse;font-size:14px}
th,td{border:1px solid var(--line);padding:5px 9px;vertical-align:top;text-align:left}
th{background:var(--surface-2)}
hr{border:0;border-top:1px solid var(--line);margin:1.5em 0}
li.task{list-style:none}li.task input{margin:0 6px 0 -18px}
footer{max-width:980px;margin:16px auto 0;font-size:12px;color:var(--muted)}
</style>
</head>
<body>
<div class="topbar"><span>${esc(repo || "")}${repo ? " › " : ""}<code>${esc(srcRel)}</code> · a rendered copy</span><button class="themebtn" id="theme" type="button"></button></div>
<main>
${body}
</main>
<footer>A rendered copy of <code>${esc(srcRel)}</code>, made on this machine. The Markdown is authoritative on any conflict.</footer>
<script>
(function themeSwitch(){ var KEY="dashboards-theme", root=document.documentElement, btn=document.getElementById("theme"), mq=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
  function chosen(){ try{ var t=localStorage.getItem(KEY); return t==="light"||t==="dark"?t:null; }catch(e){ return null; } }
  function now(){ return root.dataset.theme==="dark"||root.dataset.theme==="light"?root.dataset.theme:(mq&&mq.matches?"dark":"light"); }
  function label(){ var t=now(); btn.textContent=t==="dark"?"\\u263e night":"\\u2600 light"; btn.setAttribute("aria-pressed",String(t==="dark")); btn.title="Theme: "+(t==="dark"?"night":"light")+(chosen()?"":", as the system setting")+". Click for "+(t==="dark"?"light":"night")+"."; }
  btn.addEventListener("click",function(){ var t=now()==="dark"?"light":"dark"; root.dataset.theme=t; try{ localStorage.setItem(KEY,t); }catch(e){} label(); });
  if(mq&&mq.addEventListener) mq.addEventListener("change",label); label(); })();
</script>
</body>
</html>
`;
}

/* ---------- Where the copies go, and whether they may ---------- */
function treeRoot(dir) { for (let d = path.resolve(dir); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, "docs", "plans"))) return d; if (path.dirname(d) === d) return null; } }
const posix = p => p.split(path.sep).join("/");
/* the copy of a repository-relative .md path, relative to docs/plans/.live/docs/ */
const copyRel = rel => (rel.startsWith("docs/plans/") ? rel.slice("docs/plans/".length) : "_repo/" + rel).replace(/\.md$/i, ".html");
/* the .live/docs/ folder may be written: docs/plans/.live/ is git-ignored there (the common .git/info/exclude), or the tree is no git work tree */
const LIVE_OK = new Map();
function liveWritable(root) {
  if (LIVE_OK.has(root)) return LIVE_OK.get(root);
  const git = a => cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8" });
  let ok; if (git(["rev-parse", "--is-inside-work-tree"]).status !== 0) ok = true;
  else ok = git(["check-ignore", "-q", "--no-index", "docs/plans/.live/docs/index.js"]).status === 0;
  LIVE_OK.set(root, ok); return ok;
}

/* The Markdown files a board's data links: every string of plan.json that is a relative *.md path (with an optional #anchor), resolved
   from the board's folder, that exists in the tree. Returns repository-relative paths. */
function linkedDocs(plan, dir) {
  const root = treeRoot(dir); if (!root) return [];
  const found = new Set();
  const walk = v => { if (typeof v === "string") { const m = /^((?:\.\.?\/)*(?:[\w.-]+\/)*[\w.-]+\.md)(#[^\s]*)?$/i.exec(v.trim()); if (m) { const abs = path.resolve(dir, m[1]), rel = posix(path.relative(root, abs)); if (!rel.startsWith("..") && !path.isAbsolute(rel) && fs.existsSync(abs) && fs.statSync(abs).isFile()) found.add(rel); } }
    else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  walk(plan);
  return [...found].sort();
}

/* Render the given repository-relative Markdown files of a tree into its .live/docs/, then rewrite the index. opts.repo names the
   repository in the copies' bar. Returns { wrote, skipped }: skipped is the reason nothing was written (the folder is not git-ignored). */
function copyDocs(root, rels, opts) {
  opts = opts || {};
  if (!rels.length) return { wrote: [], skipped: null };
  if (!liveWritable(root)) return { wrote: [], skipped: "docs/plans/.live/ is not git-ignored in this checkout (add it to the main checkout's .git/info/exclude): no rendered copies written" };
  const base = path.join(root, "docs", "plans", ".live", "docs"), wrote = [];
  const all = new Set([...rels, ...indexed(root)]);
  rels.forEach(rel => {
    const src = path.join(root, ...rel.split("/")), out = path.join(base, ...copyRel(rel).split("/"));
    let md; try { md = fs.readFileSync(src, "utf8"); } catch (e) { return; }
    /* a link from the copy: to another copy where there is one (the same relative path, .md become .html), else to the file itself */
    const link = u => {
      if (!u || /^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith("#") || u.startsWith("/")) return u;
      const m = /^([^#?]*)(.*)$/.exec(u), target = path.resolve(path.dirname(src), m[1]), trel = posix(path.relative(root, target));
      if (trel.startsWith("..")) return u;
      if (/\.md$/i.test(trel) && all.has(trel)) return posix(path.relative(path.dirname(out), path.join(base, ...copyRel(trel).split("/")))) + m[2];
      return posix(path.relative(path.dirname(out), target)) + (m[1] ? "" : "") + m[2];
    };
    const title = ((/^#\s+(.+)$/m.exec(md) || [])[1] || path.basename(rel)).replace(/[`*_]/g, "");
    const html = page(title, rel, opts.repo, render(md, link));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    let old = null; try { old = fs.readFileSync(out, "utf8"); } catch (e) { /* new */ }
    if (old !== html) { fs.writeFileSync(out, html); wrote.push(copyRel(rel)); }
  });
  writeIndex(root);
  return { wrote, skipped: null };
}
/* the copies on disk, as repository-relative .md paths */
function indexed(root) {
  const base = path.join(root, "docs", "plans", ".live", "docs"), out = [];
  const walk = d => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    es.forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.html$/i.test(e.name)) { const r = posix(path.relative(base, p)).replace(/\.html$/i, ".md"); out.push(r.startsWith("_repo/") ? r.slice(6) : "docs/plans/" + r); } }); };
  walk(base); return out.sort();
}
function writeIndex(root) {
  const f = path.join(root, "docs", "plans", ".live", "docs", "index.js");
  const text = `/* docs/plans/.live/docs/index.js: the rendered copies of the Markdown the issue boards link, on this machine (plan/scripts/mdcopy.js). Never committed. */\n(window.DASHBOARDS_LIVE=window.DASHBOARDS_LIVE||{}).docs=${JSON.stringify(indexed(root))};\n`;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let old = null; try { old = fs.readFileSync(f, "utf8"); } catch (e) { /* new */ }
  if (old !== text) fs.writeFileSync(f, text);
}
/* A board's copies: the Markdown its data links, rendered into its tree's .live/docs/. */
function copyBoardDocs(plan, dir) { const root = treeRoot(dir); if (!root) return { wrote: [], skipped: "no tree root" }; return copyDocs(root, linkedDocs(plan, dir), { repo: plan && plan.repo }); }

module.exports = { render, page, linkedDocs, copyDocs, copyBoardDocs, indexed, writeIndex, liveWritable, copyRel, treeRoot };
