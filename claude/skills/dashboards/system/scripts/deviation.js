// How far a dashboard page deviates from the template it was made from (GUIDANCE.md §8). Not a command: check-page.js --auto and
// plan/scripts/check.js --auto use it to decide how much browser checking a page needs.
//
// A page starts from its template and changes only what its facts require. The template is verified once, in the skill
// (verify/verify-templates.js), and its verified hash is recorded in verify/verified.json; a page therefore needs a browser pass
// only for what it adds to the template:
//   identical   a plan board or work board that is its template plus the embedded data, byte for byte, of a verified template:
//               no browser pass (the data and the embed are checked by plan/scripts/check.js)
//   structure   a system, supersystem or repository page whose template parts (its CSS, its tab set, its renderer script) are the
//               verified template's: one light pass, for the facts the page fills in (MODEL, panels, legends, Guarantees, Context)
//   diverges    anything else — a declared divergence, an undeclared one, a page made from an older template, or a template
//               changed since it was verified: the full pass (light, dark, 520 px, a 390 px frame)
// A page declares a divergence with <meta name="template-divergence" content="what and why">, one per divergence, beside the
// footer comment GUIDANCE.md §7 asks for. A repository template (docs/plans/_template/, docs/dashboards/_template/) replaces
// the skill's when present; its verified hashes live in a verified.json beside it.
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const SKILL = path.resolve(__dirname, "..", "..");
const TEMPLATES = {
  "plan-board": { file: "dashboard.html", skill: "plan/template/dashboard.html", repo: "docs/plans/_template", block: "plan" },
  "work-board": { file: "board.html", skill: "plan/template/board.html", repo: "docs/plans/_template", block: "board" },
  "system": { file: "system.html", skill: "system/template/system.html", repo: "docs/dashboards/_template" },
  "supersystem": { file: "supersystem.html", skill: "system/template/supersystem.html", repo: "docs/dashboards/_template" },
};
const norm = s => s.replace(/\r\n/g, "\n");
const sha = s => crypto.createHash("sha256").update(norm(s)).digest("hex");

/* The page's kind: the dashboard meta, then an explicit template meta, then the Systems tab that only supersystem pages carry. */
function kindOf(html) {
  const m = (html.match(/<meta name="dashboard" content="([^"]+)">/) || [])[1];
  if (m === "plan-board" || m === "work-board") return m;
  const t = (html.match(/<meta name="template" content="([^"]+)">/) || [])[1];
  if (t && /supersystem/.test(t)) return "supersystem";
  if (t && /system\.html|system\/system/.test(t)) return "system";
  return /role="tab"[^>]*id="t-systems"/.test(html) ? "supersystem" : "system";
}
function repoRootOf(page) {
  for (let d = path.dirname(path.resolve(page)); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "docs")) && (fs.existsSync(path.join(d, "docs", "plans")) || fs.existsSync(path.join(d, "docs", "dashboards")))) return d;
    if (path.dirname(d) === d) return null;
  }
}
/* The template a page is held to: the repository's own, else the skill's. */
function templateFor(page, kind) {
  const t = TEMPLATES[kind], root = repoRootOf(page);
  const own = root ? path.join(root, ...t.repo.split("/"), t.file) : null;
  return own && fs.existsSync(own) ? own : path.join(SKILL, ...t.skill.split("/"));
}
/* The verified record of a template: verify/verified.json for the skill's, <dir>/verified.json for a repository's. */
function recordFile(template) {
  const inSkill = !path.relative(SKILL, template).startsWith("..");
  return inSkill ? { file: path.join(SKILL, "verify", "verified.json"), key: path.relative(SKILL, template).split(path.sep).join("/") }
    : { file: path.join(path.dirname(template), "verified.json"), key: path.basename(template) };
}
function verified(template) {
  const { file, key } = recordFile(template);
  let rec = null; try { rec = (JSON.parse(fs.readFileSync(file, "utf8")).templates || {})[key] || null; } catch (e) { /* none yet */ }
  const hash = sha(fs.readFileSync(template, "utf8"));
  return { ok: !!rec && rec.sha256 === hash, hash, rec, file, key };
}

/* A plan board or the work board: the page with its data block emptied, against the template with its block emptied. */
const emptyBlock = (html, id) => norm(html).replace(new RegExp(`(<script type="application/json" id="${id}">)[\\s\\S]*?(</script>)`), "$1\n{}\n$2");
function firstDiff(a, b) { const x = a.split("\n"), y = b.split("\n"); for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return i + 1; return 0; }
/* A system page: the template parts — every <style> block, the tab ids in order, and the renderer (the main script after
   MODEL's closing "};", without the DEFAULT_INSPECT line, whose text is the page's own). */
function systemParts(html) {
  const h = norm(html);
  const styles = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
  const tabs = [...h.matchAll(/<button[^>]*role="tab"[^>]*id="([^"]+)"/g)].map(m => m[1]);
  const i = h.indexOf("const MODEL = {"), j = i < 0 ? -1 : h.indexOf("\n};\n", i), k = j < 0 ? -1 : h.indexOf("</script>", j);
  const renderer = k < 0 ? null : h.slice(j + 4, k).split("\n").filter(l => !/^const DEFAULT_INSPECT=/.test(l)).join("\n");
  return { styles, tabs, renderer };
}

function deviation(page) {
  const html = fs.readFileSync(page, "utf8"), kind = kindOf(html), template = templateFor(page, kind), tpl = fs.readFileSync(template, "utf8");
  const declared = [...html.matchAll(/<meta name="template-divergence" content="([^"]*)">/g)].map(m => m[1]);
  const v = verified(template), differs = [];
  if (TEMPLATES[kind].block) {
    const id = TEMPLATES[kind].block, a = emptyBlock(html, id), b = emptyBlock(tpl, id);
    if (a !== b) differs.push(`everything outside its data block (first difference at line ${firstDiff(a, b)}): it is not the template plus its data`);
  } else {
    const a = systemParts(html), b = systemParts(tpl);
    if (a.styles.join("\0") !== b.styles.join("\0")) differs.push(`its CSS (${a.styles.length} style block${a.styles.length === 1 ? "" : "s"}, the template has ${b.styles.length})`);
    if (a.tabs.join(",") !== b.tabs.join(",")) differs.push(`its tabs (${a.tabs.join(", ")}; the template has ${b.tabs.join(", ")})`);
    if (a.renderer == null) differs.push("its script (no MODEL block found)");
    else if (a.renderer !== b.renderer) differs.push(`its renderer script (first difference at line ${firstDiff(a.renderer, b.renderer)} after MODEL)`);
  }
  let verdict, passes;
  if (!v.ok) { verdict = "diverges"; passes = "full"; }
  else if (differs.length || declared.length) { verdict = "diverges"; passes = "full"; }
  else if (TEMPLATES[kind].block) { verdict = "identical"; passes = "none"; }
  else { verdict = "structure"; passes = "light"; }
  /* the template named the way a reader finds it: the skill's path, or the repository's from its root */
  const rel = p => { const inSkill = !path.relative(SKILL, p).startsWith(".."), root = repoRootOf(page);
    return inSkill ? "the skill's " + path.relative(SKILL, p).split(path.sep).join("/") : root ? path.relative(root, p).split(path.sep).join("/") : p; };
  const notes = [];
  if (!v.ok) notes.push(`the template ${rel(template)} ${v.rec ? "changed since it was verified" : "has no verified record"}: run verify/verify-templates.js once to verify it`);
  differs.forEach(d => notes.push(`differs from ${rel(template)} in ${d}`));
  declared.forEach(d => notes.push(`declared divergence: ${d}`));
  if (differs.length && !declared.length) notes.push(TEMPLATES[kind].block
    ? "no divergence is declared: re-render the page from the template (copy it over the page, then embed.js), or declare the divergence with <meta name=\"template-divergence\" content=\"…\">"
    : "no divergence is declared: bring the page's CSS, tabs and renderer back to the template's, or declare the divergence with <meta name=\"template-divergence\" content=\"…\">");
  return { kind, template, templateVerified: v.ok, declared, differs, verdict, passes, notes, undeclared: differs.length > 0 && !declared.length };
}
module.exports = { deviation, kindOf, templateFor, verified, recordFile, sha, norm, TEMPLATES, SKILL };
