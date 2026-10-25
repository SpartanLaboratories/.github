#!/usr/bin/env node
// Bring a page onto its current template, keeping what the page owns (GUIDANCE.md §11, "Re-rendering"; system/RULES.md §8).
//   node splice.js <page.html> [--template <template.html>] [--verified] [--history-repo <clone of SpartanLaboratories/.github>] [--dry-run] [--json]
// A state page — a system, supersystem or repository page — is its template's CSS, script before MODEL and renderer around what the page
// fills in (the header, the MODEL, the panels, the Guarantees, the Context, its data blocks). The splice carries the current template's
// three parts onto the page and leaves the rest as it is:
//   - a part the page has not changed since the template version it was made from (its text is a version verify/verify-templates.js
//     recorded, verify/history/) is replaced by the current template's part;
//   - a part the page changed — a declared divergence (<meta name="template-divergence">), or one nobody declared — is merged three ways:
//     the recorded version nearest the page's part is the base, the page's own changes and the template's since then are both kept where
//     they do not touch; where they do, the page's part is left as it is and the conflict is reported for the presenter; with no recorded
//     base, an undeclared difference takes the template's part (it is undone, and reported) and a declared one is left and reported;
//   - the page-filled lines of the script before MODEL (REPO, SRC, BOARDS, WORK_BOARD and any const the template marks "// presenter:")
//     keep the page's values; a new one takes the template's default and is reported for the presenter to fill; the renderer's
//     DEFAULT_INSPECT line stays the page's;
//   - the header: a chip without its label is relabelled where its content says what it is (version, as-is, the C4 model, systems), the
//     old "last amended by" chip is removed (the renderer says it in the Context section) and any other unlabelled chip is reported;
//   - a page with no state block gets one, from its registry entry (state.json written beside it when there is none).
// A plan board or the work board is its template plus its data: the splice copies the template over the page and embeds the page's
// data block; one that declares a divergence is merged three ways as above, the page outside its data block as one part.
// The recorded versions are read through history.js: verify/history/ is a local cache, kept out of the .github mirror, and a version whose
// file is missing is rebuilt from the mirror's git history (a local clone with --history-repo, else gh api), matched by its recorded hash
// and written back into verify/history/. A version nothing matches is warned on; with none left to read, the splice is two-way (the page
// against the current template alone, as above with no recorded base).
// The template it splices onto is the current one (the page's, or --template's), or with --verified its recorded verified version: the text
// verify/verified.json records as the template's last full verification, from the template itself while it is unchanged, else from its
// history (rebuilt if it must be), so a page can be brought up while the template is being edited. A --template that is itself a cached
// version (a file in verify/history/) is that version of its template: the splice reads the template's recorded history as its merge
// bases, as it does for the template, and splices onto that version (with --verified, onto the verified one).
// It writes only the page (and a missing state.json beside it, and a rebuilt version into verify/history/), and never the page on --dry-run. Exit 0 when spliced (or already current), 1 when
// a conflict left a part as it was (the rest is written), 2 on a usage error.
"use strict";
const fs = require("fs"), path = require("path");
const dev = require("./deviation.js"), L = require("./statelib.js");

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
let pageArg = null;

/* ---------- line diffs and the three-way merge ---------- */
/* the hunks that turn `base` into `other`: [{ s, e, lines }], base[s, e) replaced by lines, in order (a longest common subsequence) */
function hunks(base, other) {
  const n = base.length, m = other.length, W = m + 1, dp = new Uint32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i * W + j] = base[i] === other[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
  const out = []; let i = 0, j = 0, cur = null;
  const flush = () => { if (cur) { out.push(cur); cur = null; } };
  while (i < n || j < m) {
    if (i < n && j < m && base[i] === other[j]) { flush(); i++; j++; }
    else if (j < m && (i >= n || dp[i * W + j + 1] >= dp[(i + 1) * W + j])) { if (!cur) cur = { s: i, e: i, lines: [] }; cur.lines.push(other[j++]); }
    else { if (!cur) cur = { s: i, e: i, lines: [] }; cur.e = ++i; }
  }
  flush(); return out;
}
/* base, mine (the page's) and theirs (the template's), as lines: { lines, conflicts: [{ at, mine, theirs }] } */
function merge3(base, mine, theirs) {
  const a = hunks(base, mine).map(x => ({ ...x, who: "mine" })), b = hunks(base, theirs).map(x => ({ ...x, who: "theirs" }));
  const all = [...a, ...b].sort((x, y) => x.s - y.s || x.e - y.e), take = [], conflicts = [];
  const touch = (x, y) => x.s < y.e && y.s < x.e || x.s === y.s || (x.s === x.e && x.s > y.s && x.s < y.e) || (y.s === y.e && y.s > x.s && y.s < x.e);
  for (let k = 0; k < all.length; k++) {
    const x = all[k], prev = take[take.length - 1];
    if (prev && touch(prev, x)) {
      if (prev.who !== x.who && prev.s === x.s && prev.e === x.e && prev.lines.join("\n") === x.lines.join("\n")) continue; /* the same change on both sides */
      /* both sides only add lines at the same place (a rule each, say): the template's first, then the page's */
      if (prev.who !== x.who && prev.s === prev.e && x.s === x.e && prev.s === x.s) { const th = prev.who === "theirs" ? prev : x, mi = prev.who === "mine" ? prev : x; take[take.length - 1] = { s: x.s, e: x.s, lines: [...th.lines, ...mi.lines], who: "both" }; continue; }
      conflicts.push({ at: x.s + 1, mine: (prev.who === "mine" ? prev : x).lines.slice(0, 3).join(" / "), theirs: (prev.who === "theirs" ? prev : x).lines.slice(0, 3).join(" / ") });
      continue;
    }
    take.push(x);
  }
  const out = []; let i = 0;
  take.forEach(x => { while (i < x.s) out.push(base[i++]); out.push(...x.lines); i = x.e; });
  while (i < base.length) out.push(base[i++]);
  return { lines: out, conflicts };
}

/* ---------- the parts of a page ---------- */
const norm = dev.norm, splitL = s => s.split("\n");
const FILLED = ["REPO", "SRC"], constName = l => (l.match(/^\s*const\s+([A-Za-z_$][\w$]*)\s*=/) || [])[1];
function locate(h) {
  const styles = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => ({ a: m.index + 7, b: m.index + 7 + m[1].length, text: m[1] }));
  const i = h.indexOf("const MODEL = {"), j = i < 0 ? -1 : h.indexOf("\n};\n", i), k = j < 0 ? -1 : h.indexOf("</script>", j), s = i < 0 ? -1 : h.lastIndexOf("<script>", i);
  return { styles, pre: s < 0 ? null : { a: s + 8, b: i, text: h.slice(s + 8, i) }, renderer: k < 0 ? null : { a: j + 4, b: k, text: h.slice(j + 4, k) } };
}
const filledNames = tplPre => new Set(splitL(tplPre).filter(l => constName(l) && (FILLED.includes(constName(l)) || /\/\/\s*presenter:/.test(l))).map(constName));
/* the comparable text of a part: the page-filled lines and the DEFAULT_INSPECT line left out, as deviation.js compares them */
const comparable = (kind, text, filled) => kind === "pre" ? splitL(text).filter(l => !filled.has(constName(l))).join("\n") : kind === "renderer" ? splitL(text).filter(l => !/^const DEFAULT_INSPECT=/.test(l)).join("\n") : text;

/* the template versions verify/verify-templates.js recorded (verified.json history), oldest first, read from verify/history/ or rebuilt
   from the mirror's git history (history.js) */
const H = require("./history.js");

function main() {
  require("./cliargs.js").strict(args, { usage: "usage: node splice.js <page.html> [--template <template.html>] [--verified] [--history-repo <clone of SpartanLaboratories/.github>] [--dry-run] [--json]", valued: ["template", "history-repo"], flags: ["verified", "dry-run", "json"], min: 1, max: 1 });
  pageArg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--template" && args[i - 1] !== "--history-repo");
  const page = path.resolve(pageArg), report = { page: path.relative(process.cwd(), page).split(path.sep).join("/"), kind: null, template: null, onto: null, parts: [], filled: [], chips: [], state: null, conflicts: [], history: null, warnings: [], wrote: false };
  if (!fs.existsSync(page)) { console.error(`no such page: ${pageArg}`); process.exit(2); }
  const raw = fs.readFileSync(page, "utf8"), eol = raw.includes("\r\n") ? "\r\n" : "\n";
  let h = norm(raw); const kind = dev.kindOf(h); report.kind = kind;
  /* the template: the page's, or --template's; a --template in a history folder is a cached version of its template, whose recorded
     history is the merge bases (dashboards-skill/29) */
  let template = opt("template") ? path.resolve(opt("template")) : dev.templateFor(page, kind), ontoText = null;
  if (opt("template") && !fs.existsSync(template)) { console.error(`no such template: ${opt("template")}`); process.exit(2); }
  const cachedOf = opt("template") ? H.ofCached(template) : null;
  if (cachedOf) { ontoText = norm(fs.readFileSync(template, "utf8")); template = cachedOf.template;
    report.onto = `the recorded version ${H.label(cachedOf.v)} of ${cachedOf.key}${dev.sha(ontoText) === cachedOf.v.sha256 ? "" : " (its cached file no longer hashes to its record)"}`; }
  report.template = template;
  if (args.includes("--verified")) {
    const V = H.verifiedVersion(template, { historyRepo: opt("history-repo") });
    if (V.html == null) { console.error(`--verified: ${V.why}`); process.exit(2); }
    ontoText = V.html; report.onto = `the verified version ${H.label(V.v)}${V.v.verified ? `, verified ${V.v.verified}` : ""}, read from ${V.from}`;
  }
  if (!report.onto) report.onto = "the current template";
  const HL = H.load(template, { historyRepo: opt("history-repo") }), hist = HL.versions;
  report.history = { recorded: HL.recorded, read: hist.length, rebuilt: HL.rebuilt.map(x => ({ sha256: x.v.sha256, file: x.v.file, from: `${HL.source} @ ${x.ref}` })), missing: HL.missing.map(x => ({ sha256: x.v.sha256, note: x.v.note || null, why: x.why })) };
  HL.missing.forEach(x => report.warnings.push(`recorded version ${H.label(x.v)} could not be read or rebuilt: ${x.why}`));
  if (HL.recorded && !hist.length) report.warnings.push(`none of the ${HL.recorded} recorded versions could be read or rebuilt: a two-way splice (the page against the current template alone; an undeclared difference is undone, a declared one left)`);
  const tpl = ontoText != null ? ontoText : norm(fs.readFileSync(template, "utf8")), declared = /<meta name="template-divergence"/.test(h);
  /* one part: replaced, merged or left, by the rules above */
  const part = (name, mine, theirs, baseOf) => {
    if (mine === theirs) { report.parts.push({ part: name, how: "current" }); return mine; }
    const bases = hist.map(v => baseOf(v.html)).filter(x => x != null);
    if (bases.includes(mine)) { report.parts.push({ part: name, how: "replaced: the page had not changed it" }); return theirs; }
    if (bases.length) {
      const ml = splitL(mine), near = bases.map(b => ({ b, d: hunks(splitL(b), ml).reduce((n, x) => n + (x.e - x.s) + x.lines.length, 0) })).sort((x, y) => x.d - y.d)[0];
      const r = merge3(splitL(near.b), ml, splitL(theirs));
      if (!r.conflicts.length) { report.parts.push({ part: name, how: `merged three ways (${declared ? "its declared divergence" : "an undeclared difference"} kept)` }); return r.lines.join("\n"); }
      report.conflicts.push(...r.conflicts.map(c => ({ part: name, ...c }))); report.parts.push({ part: name, how: `left as it was: ${r.conflicts.length} conflict${r.conflicts.length === 1 ? "" : "s"}` }); return mine;
    }
    if (declared) { report.conflicts.push({ part: name, at: 0, mine: "(the page's)", theirs: "(the template's)" }); report.parts.push({ part: name, how: "left as it was: no recorded template version to merge from, and the page declares a divergence" }); return mine; }
    report.parts.push({ part: name, how: "replaced: an undeclared difference, with no recorded version to merge from, undone" }); return theirs;
  };

  if (kind === "plan-board" || kind === "work-board") {
    const id = dev.TEMPLATES[kind].block, data = L.blockText(h, id);
    if (data == null) { console.error(`${pageArg} has no ${id} data block`); process.exit(2); }
    const empty = x => x.replace(new RegExp(`(<script type="application/json" id="${id}">)[\\s\\S]*?(</script>)`), "$1\n{}\n$2");
    const merged = part("the page outside its data block", empty(h), empty(tpl), v => empty(v));
    h = L.embedInto(merged, id, data);
  } else {
    const P = locate(h), T = locate(tpl);
    if (!P.pre || !P.renderer || !T.pre || !T.renderer) { console.error(`${pageArg}: no MODEL block found in the page or its template: not a state page the splice can read`); process.exit(2); }
    const filled = filledNames(T.pre.text);
    /* the script before MODEL: the template's, merged, then the page's own values on its page-filled lines */
    const pageFilled = new Map(splitL(P.pre.text).filter(l => filled.has(constName(l))).map(l => [constName(l), l]));
    let pre = part("the script before MODEL", comparable("pre", P.pre.text, filled), comparable("pre", T.pre.text, filled), v => { const x = locate(v); return x.pre ? comparable("pre", x.pre.text, filledNames(x.pre.text)) : null; });
    /* put the kept lines back where the template has them: the template's lines walked in order against the merged ones, each kept line
       inserted where the walk stands */
    const reinsert = (tplText, isKept, merged, lineFor) => { const out = splitL(merged); let cur = 0;
      splitL(tplText).forEach(l => { if (isKept(l)) { out.splice(cur, 0, lineFor(l)); cur++; return; } const at = out.indexOf(l, cur); if (at >= 0) cur = at + 1; });
      return out.join("\n"); };
    pre = reinsert(T.pre.text, l => filled.has(constName(l)), pre, l => { const nm = constName(l), mine = pageFilled.get(nm); if (!mine) report.filled.push(`${nm}: new in the template, its default written: fill it`); return mine || l; });
    /* the renderer: the template's, merged; the page's DEFAULT_INSPECT */
    const di = splitL(P.renderer.text).find(l => /^const DEFAULT_INSPECT=/.test(l));
    let ren = part("the renderer", comparable("renderer", P.renderer.text), comparable("renderer", T.renderer.text), v => { const x = locate(v); return x.renderer ? comparable("renderer", x.renderer.text) : null; });
    ren = reinsert(T.renderer.text, l => /^const DEFAULT_INSPECT=/.test(l), ren, l => di || l);
    /* the CSS: each style block of the template in order (a page's extra blocks, a declared divergence, are merged as part of the last) */
    const css = T.styles.map((t, i) => { const mine = P.styles[i] ? P.styles[i].text : ""; return part(`style block ${i + 1}`, mine, t.text, v => { const x = locate(v).styles[i]; return x ? x.text : null; }); });
    /* write the parts back, from the end of the page to its start */
    const edits = [[P.renderer.a, P.renderer.b, ren], [P.pre.a, P.pre.b, pre], ...P.styles.map((s, i) => i < css.length ? [s.a, s.b, css[i]] : null).filter(Boolean)].sort((x, y) => y[0] - x[0]);
    edits.forEach(([a, b, t]) => { h = h.slice(0, a) + t + h.slice(b); });
    /* the header's chips */
    h = h.replace(/<header>([\s\S]*?)<\/header>/, (m, inner) => "<header>" + inner.replace(/[ \t]*<span class="chip" id="chip-amended"[^>]*><\/span>\n?/, () => { report.chips.push("the \"last amended by\" chip removed: the renderer says it in the Context section"); return ""; })
      .replace(/<span class="chip([^"]*)"((?![^>]*\bid="chip-)[^>]*)>((?:(?!<span class="chip)[\s\S])*?)<\/span>(?=\s*(<span class="chip|<\/div>))/g, (all, cls, attrs, body) => {
        if (/class="ck"/.test(body) || !body.replace(/<[^>]+>/g, "").trim()) return all;
        const t = body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); let ck = null, b = body;
        if (/\bmodel\b/.test(cls)) ck = "C4 model";
        else if (/^as-is\b/i.test(t)) { ck = "as-is at"; b = body.replace(/as-is\s*(at\s*)?/i, ""); }
        else if (/last amended/i.test(t)) { report.chips.push(`removed: ${JSON.stringify(t.slice(0, 50))} (the last amendment is said in the Context section)`); return ""; }
        else if (/^v?\d+\.\d+(\.\d+)?[a-z]?$/i.test(t)) ck = "version";
        else if (/\bsystems?\b/i.test(t) && /\d/.test(t)) ck = "systems";
        if (!ck) { report.chips.push(`left unlabelled: ${JSON.stringify(t.slice(0, 50))}: give it its label (<span class="ck">…</span>)`); return all; }
        report.chips.push(`labelled "${ck}": ${JSON.stringify(t.slice(0, 50))}`); return `<span class="chip${cls}"${attrs}><span class="ck">${ck}</span> ${b.trim()}</span>`; }) + "</header>");
    /* the state block */
    if (L.blockText(h, "state") == null && L.blockText(tpl, "state") != null) {
      const reg = L.findRegistry(page); let e = null, R = null; if (reg) { try { R = JSON.parse(fs.readFileSync(reg, "utf8")); } catch (x) { /* reported by the checker */ } }
      const pagesRel = reg ? path.relative(path.dirname(reg), page).split(path.sep).join("/") : null;
      if (R) e = (R.systems || []).find(x => x.page === pagesRel) || null;
      if (!e || !e.asIs) report.state = "no state block, and no registry entry with a stamp to build one from: the presenter writes state.json";
      else {
        const st = { slug: e.slug, version: e.kind === "system" ? (e.version == null ? null : e.version) : null, asIs: e.asIs, ...(e.lastAmended && Number.isInteger(e.lastAmended.issue) ? { lastAmended: { issue: e.lastAmended.issue, sha: e.lastAmended.sha } } : {}), written: { sha: e.asIs.sha } };
        const txt = L.stateText(st), block = `<!-- The page's state. A verbatim copy of state.json beside the page (scripts/embed.js state.json index.html state). -->\n<script type="application/json" id="state">\n${txt.trim()}\n</script>\n\n`;
        const at = h.search(/<script type="(text\/plain|application\/json)" id="(dsl|systems)">/); const at2 = at >= 0 ? h.lastIndexOf("<!--", at) > h.lastIndexOf("</script>", at) ? h.lastIndexOf("<!--", at) : at : h.indexOf("<script>");
        h = h.slice(0, at2) + block + h.slice(at2);
        const sf = path.join(path.dirname(page), "state.json");
        if (!fs.existsSync(sf) && !args.includes("--dry-run")) fs.writeFileSync(sf, txt);
        report.state = `a state block added from the registry entry ${e.slug}${fs.existsSync(sf) ? "" : ", state.json written beside the page"}: the title of its last amendment is the presenter's`;
      }
    }
  }
  const out = h.replace(/\n/g, eol), changed = out !== raw;
  if (changed && !args.includes("--dry-run")) { fs.writeFileSync(page, out); report.wrote = true; }
  report.changed = changed;
  if (args.includes("--json")) console.log(JSON.stringify(report));
  else {
    console.log(`splice: ${report.page} (${kind}) onto ${path.relative(process.cwd(), template).split(path.sep).join("/")}${report.onto === "the current template" ? "" : ` as ${report.onto}`}${hist.length ? `, ${hist.length} recorded version${hist.length === 1 ? "" : "s"}` : ", no recorded versions"}`);
    HL.rebuilt.forEach(x => console.log(`  history: ${H.label(x.v)} rebuilt from ${HL.source} @ ${x.ref} into verify/history/${x.v.file || ""}`));
    report.warnings.forEach(w => console.log(`  WARNING: ${w}`));
    report.parts.forEach(p => console.log(`  ${p.part}: ${p.how}`));
    report.filled.forEach(f => console.log(`  page-filled ${f}`)); report.chips.forEach(c => console.log(`  chip ${c}`)); if (report.state) console.log(`  state: ${report.state}`);
    report.conflicts.forEach(c => console.log(`  CONFLICT in ${c.part} at line ${c.at}: the page has ${JSON.stringify(c.mine.slice(0, 80))}, the template ${JSON.stringify(c.theirs.slice(0, 80))}`));
    console.log(changed ? (args.includes("--dry-run") ? "would write the page (--dry-run)" : "wrote the page: re-embed its data and check it (check-page.js --auto)") : "the page is current: nothing to write");
  }
  process.exit(report.conflicts.length ? 1 : 0);
}
if (require.main === module) main();
module.exports = { hunks, merge3 };
