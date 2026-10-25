// The case group of admin-team/dashboards-skill/27, run by verify-templates.js (it passes its helpers in): verify/history/ is a local cache,
// kept out of the .github mirror, and a recorded version missing from it is rebuilt on demand (system/scripts/history.js, splice.js). The
// cases run offline, on a copy of the skill's scripts in a scratch folder (its own verify/verified.json and verify/history/) and a
// fixture git repository laid out as the mirror is (claude/skills/dashboards/<template path>): a missing version rebuilt from the clone
// (--history-repo) and the splice three-way from it; the rebuilt copy then read from the cache; a cached copy that no longer hashes to its
// record rebuilt; gh api's path, through a stand-in gh served from the fixture; a version nothing matches warned on, the splice going on
// with what is left, and two-way with nothing left. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases27(X) {
  const { sk, out, targets } = X;
  const TITLE = "verify/history/ rebuilt on demand from the mirror's git history (history.js, splice.js --history-repo, the two-way fallback)";
  const SYS = (targets.find(t => t.name === "system/template/system.html") || {}).path;
  if (!SYS) return [[TITLE, [["the system template is under test", false, "a repository template set without system.html skips this group"]]]];
  const c = [];
  try {
    const dev = require(sk("system/scripts/deviation.js")), norm = dev.norm, sha = dev.sha;
    const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
    const sc = path.join(out, "skill-27"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
    /* the scratch skill: the scripts, the current template, a record with two versions, the current one's file alone in its history */
    const FS = path.join(sc, "skill"), fsk = p => path.join(FS, ...p.split("/"));
    fs.readdirSync(sk("system/scripts")).filter(f => f.endsWith(".js")).forEach(f => wr(fsk("system/scripts/" + f), rd(sk("system/scripts/" + f))));
    const cur = norm(rd(SYS)), old = cur.replace("footer{margin-top:28px;", "footer{margin-top:24px;"), other = cur.replace("footer{margin-top:28px;", "footer{margin-top:20px;");
    if (old === cur) throw new Error("the system template has no footer{margin-top:28px; rule to vary");
    const TPL = wr(fsk("system/template/system.html"), cur), KEY = "system/template/system.html", REL = "claude/skills/dashboards/" + KEY;
    const vOld = { sha256: sha(old), verified: "2026-10-25", file: `system/${sha(old).slice(0, 12)}.html`, note: "the old version (verify case)" };
    const vCur = { sha256: sha(cur), verified: "2026-10-25", file: `system/${sha(cur).slice(0, 12)}.html`, note: "the current version (verify case)" };
    wr(fsk("verify/verified.json"), JSON.stringify({ templates: { [KEY]: { sha256: sha(cur), verified: "2026-10-25", history: [vOld, vCur] } } }, null, 2) + "\n");
    const hf = v => fsk("verify/history/" + v.file), clearHist = () => fs.rmSync(fsk("verify/history"), { recursive: true, force: true });
    const resetHist = () => { clearHist(); wr(hf(vCur), cur); };
    /* the fixture mirror: the old version committed with CRLF line endings (hashed LF-normalised), then an unrelated one, then the current */
    const git = (repo, ...a) => cp.spawnSync("git", ["-C", repo, "-c", "user.name=verify", "-c", "user.email=verify@example.invalid", "-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" });
    const mkRepo = (dir, versions) => { fs.mkdirSync(dir, { recursive: true }); cp.spawnSync("git", ["init", "-q", dir]);
      versions.forEach((t, i) => { wr(path.join(dir, ...REL.split("/")), t); git(dir, "add", "-A"); git(dir, "commit", "-qm", `version ${i + 1}`); }); return dir; };
    const G = mkRepo(path.join(sc, "mirror"), [old.replace(/\n/g, "\r\n"), other, cur]);
    const G2 = mkRepo(path.join(sc, "mirror-without"), [other]);
    c.push(["the fixture mirror holds three versions of the template", (git(G, "log", "--format=%H", "--", REL).stdout || "").trim().split(/\r?\n/).length === 3, git(G, "log", "--oneline").stdout]);
    /* the page, made from the old version, unchanged since */
    const page = path.join(sc, "tree", "docs", "dashboards", "alpha", "index.html"), SP = fsk("system/scripts/splice.js");
    const splice = (...a) => { const r = cp.spawnSync(process.execPath, [SP, page, "--template", TPL, "--json", ...a], { encoding: "utf8" }); let j = null; try { j = JSON.parse(r.stdout); } catch (e) { /* reported */ } return { r, j }; };
    const how = (j, p) => ((j && j.parts) || []).find(x => x.part === p) || {};

    /* 1. a missing version rebuilt from the local clone, and the splice three-way from it */
    resetHist(); wr(page, old);
    let { r, j } = splice("--history-repo", G);
    const reb = fs.existsSync(hf(vOld)) ? rd(hf(vOld)) : null;
    c.push(["splice.js --history-repo rebuilds the missing version from the clone and says so", r.status === 0 && j && j.history.rebuilt.length === 1 && j.history.rebuilt[0].sha256 === vOld.sha256 && /the local clone .* @ [0-9a-f]{7}/.test(j.history.rebuilt[0].from) && !j.warnings.length, JSON.stringify(j && { history: j.history, warnings: j.warnings }) || r.stderr]);
    c.push(["the rebuilt copy is written into verify/history/ under its recorded name, LF-normalised and hashing to its record", reb != null && !/\r/.test(reb) && sha(reb) === vOld.sha256, reb == null ? "no file" : `sha ${sha(reb).slice(0, 12)}`]);
    c.push(["the page, unchanged since the old version, is spliced from it: its CSS replaced by the template's", /replaced: the page had not changed it/.test(how(j, "style block 1").how || "") && /footer\{margin-top:28px;/.test(rd(page)) && !/footer\{margin-top:24px;/.test(rd(page)), JSON.stringify(how(j, "style block 1"))]);
    const plain = cp.spawnSync(process.execPath, [SP, page, "--template", TPL, "--dry-run"], { encoding: "utf8" });
    c.push(["--history-repo is a known option of splice.js (an unknown one still exits 2)", cp.spawnSync(process.execPath, [SP, page, "--history-rep", G], { encoding: "utf8" }).status === 2 && plain.status === 0, (plain.stdout || "").split(/\r?\n/)[0]]);

    /* 2. the rebuilt copy is read from the cache: nothing rebuilt, no clone needed */
    wr(page, old); ({ r, j } = splice());
    c.push(["the next splice reads the rebuilt copy from verify/history/: both versions read, nothing rebuilt, no warning", r.status === 0 && j && j.history.read === 2 && !j.history.rebuilt.length && !j.warnings.length, JSON.stringify(j && j.history)]);

    /* 3. a cached copy that no longer hashes to its record is rebuilt */
    const H = require(fsk("system/scripts/history.js"));
    wr(hf(vOld), old + "\n<!-- damaged -->\n");
    const L1 = H.load(TPL, { historyRepo: G });
    c.push(["a cached copy that no longer hashes to its record is rebuilt over", L1.rebuilt.length === 1 && sha(rd(hf(vOld))) === vOld.sha256 && L1.versions.length === 2, JSON.stringify({ rebuilt: L1.rebuilt.map(x => x.ref), missing: L1.missing })]);

    /* 4. gh api's path: the commits of the template's path in the mirror, then its raw content at each (a stand-in gh, served from the fixture) */
    resetHist(); const calls = [];
    const fakeGh = a => { calls.push(a.join(" ")); const u = a.find(x => x.startsWith("repos/")) || "";
      if (u.startsWith(`repos/SpartanLaboratories/.github/commits?path=${REL}&`)) return { status: 0, stdout: git(G, "log", "--format=%H", "--", REL).stdout };
      const m = u.match(/^repos\/SpartanLaboratories\/\.github\/contents\/(.+)\?ref=([0-9a-f]+)$/); if (m && a.includes("Accept: application/vnd.github.raw+json")) { const s = git(G, "show", `${m[2]}:${m[1]}`); return { status: s.status, stdout: s.stdout, stderr: s.stderr }; }
      return { status: 1, stdout: "", stderr: "unexpected call" }; };
    const viaGh = H.readVersion(TPL, v => /old version/.test(v.note || ""), { gh: fakeGh });
    c.push(["without a clone, the version is rebuilt through gh api (the path's commits, then the raw file at each) and cached", viaGh === old && fs.existsSync(hf(vOld)) && calls.length >= 2 && /--paginate/.test(calls[0]), calls.slice(0, 3).join(" || ")]);
    const ghDown = H.load(TPL, { gh: () => ({ status: 1, stdout: "", stderr: "HTTP 503" }) });
    c.push(["with every copy cached, gh is not needed: a gh failure changes nothing", ghDown.versions.length === 2 && !ghDown.missing.length, JSON.stringify(ghDown.missing)]);
    fs.rmSync(hf(vOld)); const ghDown2 = H.load(TPL, { gh: () => ({ status: 1, stdout: "", stderr: "HTTP 503" }) });
    c.push(["with the copy gone and gh failing, the version is reported missing with gh's reason; the others still read", ghDown2.versions.length === 1 && ghDown2.missing.length === 1 && /gh api .* failed: HTTP 503/.test(ghDown2.missing[0].why), JSON.stringify(ghDown2.missing)]);

    /* 5. a version nothing matches: warned on, the splice going on with the versions it has */
    resetHist(); wr(page, old); ({ r, j } = splice("--history-repo", G2));
    c.push(["a version no commit of the clone matches is warned on, naming it and why, and nothing is written for it", r.status === 0 && j && j.warnings.length === 1 && /recorded version [0-9a-f]{12} \(the old version \(verify case\)\) could not be read or rebuilt: not in verify\/history\/, and no version of claude\/skills\/dashboards\/system\/template\/system\.html in the local clone .* \(1 commit read\) hashes to it/.test(j.warnings[0]) && !fs.existsSync(hf(vOld)), JSON.stringify(j && j.warnings)]);
    c.push(["the splice goes on three ways from the version it has", /merged three ways/.test(how(j, "style block 1").how || ""), JSON.stringify(how(j, "style block 1"))]);
    const txt = cp.spawnSync(process.execPath, [SP, page, "--template", TPL, "--dry-run", "--history-repo", G2], { encoding: "utf8" });
    c.push(["the plain report prints the warning", /^ {2}WARNING: recorded version [0-9a-f]{12} .*could not be read or rebuilt/m.test(txt.stdout || ""), (txt.stdout || "").split(/\r?\n/).filter(l => /WARNING/.test(l)).join(" | ")]);

    /* 6. none left to read: the two-way fallback, with its warning */
    clearHist(); wr(page, old); ({ r, j } = splice("--history-repo", G2));
    c.push(["with no recorded version left, the splice is two-way and warns so", r.status === 0 && j && j.history.read === 0 && j.warnings.some(w => /none of the 2 recorded versions could be read or rebuilt: a two-way splice/.test(w)) && /with no recorded version to merge from/.test(how(j, "style block 1").how || ""), JSON.stringify(j && { w: j.warnings, p: how(j, "style block 1") })]);
    const notRepo = path.join(sc, "not-a-clone"); fs.mkdirSync(notRepo, { recursive: true }); clearHist(); wr(page, old); ({ r, j } = splice("--history-repo", notRepo));
    c.push(["a --history-repo that is no git repository is warned on with git's reason, and the splice still runs", r.status === 0 && j && j.warnings.some(w => /git log in .* failed|0 commits read/.test(w)), JSON.stringify(j && j.warnings).slice(0, 300)]);
  } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); }
  return [[TITLE, c]];
};
