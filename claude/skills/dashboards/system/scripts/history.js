// The recorded versions of a template (verify/verified.json "history"), their text read from verify/history/ and rebuilt on demand.
//   const H = require(".../system/scripts/history.js");
//   const { versions, missing, rebuilt, source } = H.load(template, { historyRepo });   // splice.js
//   const html = H.readVersion(template, v => /dashboards-skill\/25/.test(v.note || ""), { historyRepo });   // the verify cases
//   const { html, v, from } = H.verifiedVersion(template, { historyRepo });   // splice.js --verified: the recorded verified version
//   const { template, key, v } = H.ofCached(file);   // splice.js --template <a file in verify/history/>: the template it is a version of
// verify/history/ is a local cache: it is kept out of the .github mirror. A recorded version whose file is missing (or no longer hashes
// to its recorded sha256) is rebuilt from the git history of the mirror, SpartanLaboratories/.github, at claude/skills/dashboards/<the
// template's path>: from a local clone when historyRepo names one (git log --all --follow, git show), else through gh api (the commits
// that touched the path, then the file's raw content at each). Each candidate is hashed as verified.json is (LF-normalised sha256); the
// match is written into verify/history/ under its recorded file name and used. A version no candidate matches is returned in `missing`,
// with the reason, for the caller to warn on; nothing is guessed. Only the skill's own templates are rebuilt: a repository's templates
// keep their history committed beside their verified.json, and a missing file there is reported as missing.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const dev = require("./deviation.js");

const MIRROR = "SpartanLaboratories/.github", PREFIX = "claude/skills/dashboards/";
const short = s => String(s || "").slice(0, 12);

function recordOf(template) {
  const { file, key } = dev.recordFile(template);
  let rec = null; try { rec = (JSON.parse(fs.readFileSync(file, "utf8")).templates || {})[key] || null; } catch (e) { /* none */ }
  const inSkill = !path.relative(dev.SKILL, path.resolve(template)).startsWith("..");
  return { file, key, dir: path.join(path.dirname(file), "history"), rec, inSkill };
}
/* the history file of a recorded version: its own name, else the name verify-templates.js gives one */
const fileOf = (key, v) => v.file || `${path.basename(key, ".html")}/${short(v.sha256)}.html`;
function cached(dir, key, v) {
  const f = path.join(dir, ...fileOf(key, v).split("/"));
  if (!fs.existsSync(f)) return { html: null, why: "not in verify/history/" };
  const html = dev.norm(fs.readFileSync(f, "utf8"));
  return dev.sha(html) === v.sha256 ? { html } : { html: null, why: "its file in verify/history/ no longer hashes to its recorded sha256" };
}

/* the candidates, newest first: [{ ref, read() }] from a local clone of the mirror, or through gh api */
function candidatesLocal(repo, rel) {
  const r = cp.spawnSync("git", ["-C", repo, "log", "--all", "--follow", "--format=%x01%H", "--name-only", "--", rel], { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) return { error: `git log in ${repo} failed: ${(r.stderr || r.error || "").toString().trim().split(/\r?\n/)[0]}` };
  const out = [];
  r.stdout.split("\x01").filter(x => x.trim()).forEach(chunk => { const [sha, ...names] = chunk.split(/\r?\n/).map(s => s.trim()).filter(Boolean); const p = names[0] || rel;
    out.push({ ref: sha.slice(0, 7), read: () => { const s = cp.spawnSync("git", ["-C", repo, "show", `${sha}:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 }); return s.status === 0 ? s.stdout : null; } }); });
  return { list: out };
}
const ghDefault = a => cp.spawnSync("gh", a, { encoding: "utf8", maxBuffer: 64 << 20 });
function candidatesGh(gh, slug, rel) {
  const r = gh(["api", `repos/${slug}/commits?path=${encodeURI(rel)}&per_page=100`, "--paginate", "--jq", ".[].sha"]);
  if (!r || r.status !== 0) return { error: `gh api (the commits of ${rel} in ${slug}) failed: ${((r && (r.stderr || r.error)) || "no gh").toString().trim().split(/\r?\n/)[0]}` };
  const shas = r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return { list: shas.map(sha => ({ ref: sha.slice(0, 7), read: () => { const c = gh(["api", "-H", "Accept: application/vnd.github.raw+json", `repos/${slug}/contents/${encodeURI(rel)}?ref=${sha}`]); return c && c.status === 0 ? c.stdout : null; } })) };
}

/* rebuild the wanted versions ({ sha256 → v }) of a skill template into dir; returns { rebuilt: [{ v, ref }], why, source } */
function rebuild(key, wanted, dir, opts) {
  const rel = PREFIX + key, slug = opts.mirror || MIRROR;
  const source = opts.historyRepo ? `the local clone ${opts.historyRepo}` : `gh api ${slug}`;
  const c = opts.historyRepo ? candidatesLocal(path.resolve(opts.historyRepo), rel) : candidatesGh(opts.gh || ghDefault, slug, rel);
  if (c.error) return { rebuilt: [], why: c.error, source };
  const rebuilt = [];
  for (const cand of c.list) {
    if (!wanted.size) break;
    const text = cand.read(); if (text == null) continue;
    const html = dev.norm(text), h = dev.sha(html), v = wanted.get(h); if (!v) continue;
    const f = path.join(dir, ...fileOf(key, v).split("/")), tmp = f + ".part";
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(tmp, html); fs.renameSync(tmp, f);
    wanted.delete(h); rebuilt.push({ v, ref: cand.ref, html });
  }
  return { rebuilt, why: wanted.size ? `no version of ${rel} in ${source} (${c.list.length} commit${c.list.length === 1 ? "" : "s"} read) hashes to it` : null, source };
}

/* every recorded version of a template, oldest first, with its text: { versions, missing: [{ v, why }], rebuilt: [{ v, ref }], source } */
function load(template, opts = {}) {
  const R = recordOf(template), hist = (R.rec && Array.isArray(R.rec.history)) ? R.rec.history : [];
  const got = new Map(), why = new Map();
  hist.forEach(v => { const c = cached(R.dir, R.key, v); if (c.html != null) got.set(v.sha256, c.html); else why.set(v.sha256, c.why); });
  const wanted = new Map(hist.filter(v => !got.has(v.sha256)).map(v => [v.sha256, v]));
  let rebuilt = [], source = null;
  if (wanted.size && R.inSkill && !opts.noRebuild) {
    const r = rebuild(R.key, wanted, R.dir, opts); source = r.source; rebuilt = r.rebuilt;
    rebuilt.forEach(x => got.set(x.v.sha256, x.html));
    if (r.why) [...wanted.keys()].forEach(h => why.set(h, `${why.get(h)}, and ${r.why}`));
  } else if (wanted.size && !R.inSkill) [...wanted.keys()].forEach(h => why.set(h, `${why.get(h)} (a repository template's history is committed beside its verified.json; not rebuilt)`));
  return {
    key: R.key, recorded: hist.length,
    versions: hist.filter(v => got.has(v.sha256)).map(v => ({ ...v, html: got.get(v.sha256) })),
    missing: hist.filter(v => !got.has(v.sha256)).map(v => ({ v, why: why.get(v.sha256) })),
    rebuilt: rebuilt.map(x => ({ v: x.v, ref: x.ref })), source,
  };
}
/* the text of the one recorded version `pick` selects (a predicate on its record entry), rebuilt if it must be; null when none is */
function readVersion(template, pick, opts = {}) {
  const R = recordOf(template), v = ((R.rec && R.rec.history) || []).find(pick); if (!v) return null;
  const c = cached(R.dir, R.key, v); if (c.html != null) return c.html;
  if (!R.inSkill || opts.noRebuild) return null;
  const r = rebuild(R.key, new Map([[v.sha256, v]]), R.dir, opts); return r.rebuilt.length ? r.rebuilt[0].html : null;
}
/* The verified version of a template: the text verify/verified.json records as its last full verification (the record's sha256), read
   from the template itself while it is unchanged, else from its recorded history (verify/history/, rebuilt if it must be), so a board can
   be spliced onto it while the template is being edited (splice.js --verified). { html, v, from } or { html: null, why }. */
function verifiedVersion(template, opts = {}) {
  const R = recordOf(template);
  if (!R.rec || !R.rec.sha256) return { html: null, why: `${R.key} has no verified record in ${path.basename(R.file)}: run verify/verify-templates.js once` };
  const listed = (Array.isArray(R.rec.history) ? R.rec.history : []).find(x => x.sha256 === R.rec.sha256), v = listed || { sha256: R.rec.sha256, verified: R.rec.verified };
  if (fs.existsSync(template)) { const cur = dev.norm(fs.readFileSync(template, "utf8")); if (dev.sha(cur) === R.rec.sha256) return { html: cur, v, from: "the template itself (unchanged since it was verified)" }; }
  const html = listed ? readVersion(template, x => x.sha256 === R.rec.sha256, opts) : null;
  if (html != null) return { html, v, from: `verify/history/${fileOf(R.key, v)}` };
  return { html: null, why: `the verified version ${label(v)} of ${R.key} is neither the template on disk nor a readable recorded version (${listed ? "not in verify/history/, and not rebuilt" : "its record lists no history entry for it"})` };
}
/* A cached version file (a file under a record's history/ folder, e.g. verify/history/supersystem/9b877b5e17b6.html) back to the template
   it is a version of and its record entry: { template, key, v } or null. A board given such a file as its --template is spliced with that
   template's recorded history as its merge bases, not with none. */
function ofCached(file) {
  const f = path.resolve(file);
  for (let d = path.dirname(f); path.dirname(d) !== d; d = path.dirname(d)) {
    if (path.basename(d) !== "history") continue;
    const recFile = path.join(path.dirname(d), "verified.json"); if (!fs.existsSync(recFile)) continue;
    let T = {}; try { T = JSON.parse(fs.readFileSync(recFile, "utf8")).templates || {}; } catch (e) { continue; }
    const rel = path.relative(d, f).split(path.sep).join("/"), inSkill = path.resolve(recFile) === path.join(dev.SKILL, "verify", "verified.json");
    for (const [key, rec] of Object.entries(T)) {
      const v = (rec.history || []).find(x => fileOf(key, x) === rel); if (!v) continue;
      return { template: inSkill ? path.join(dev.SKILL, ...key.split("/")) : path.join(path.dirname(recFile), key), key, v };
    }
  }
  return null;
}
/* a one-line account of a version, for warnings */
const label = v => `${short(v.sha256)}${v.note ? ` (${v.note})` : ""}`;

module.exports = { load, readVersion, verifiedVersion, ofCached, label, MIRROR, PREFIX };
