// The case groups of admin-team/dashboards-skill/29, run by verify-templates.js (it passes its helpers in), for three tool and template
// defects: splice.js onto the recorded verified version of a board's template (--verified), and a --template that is a cached version (a
// file in verify/history/) spliced with its template's history as the merge bases, not with none; apply-state.js keeping a verbatim
// lastAmended.title already on record for the same issue, taking facts.title when the event carries it, and the folder's name only when
// neither exists (noted); and a planned supersystem whose built parts have a board, its Systems card linking that board ("its built parts'
// page", "planned · built in part") instead of "no board yet", with its legend entry and its feature probe. Each group returns
// [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases29(X) {
  const { sk, out, targets, dumpDom, inner, checker } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const SYS = tp("system/template/system.html"), SUP = tp("system/template/supersystem.html");
  if (!SYS || !SUP) return [["the dashboards-skill/29 cases (both system templates under test)", [["both system templates are under test", false, "a repository template set without both skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const text = h => (h || "").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  const sc = path.join(out, "cases-29"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [];
  const guard = (title, f) => { const c = []; try { f(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  /* 1. splice.js --verified, and a --template that is a cached version */
  guard("splice.js onto the recorded verified version (--verified), and a cached version as --template keeping its template's history (dashboards-skill/29)", c => {
    const dev = require(sk("system/scripts/deviation.js")), norm = dev.norm, sha = dev.sha;
    /* a scratch skill (its scripts, its own verified.json and verify/history/): three versions of the system template, the verified one
       recorded and cached, an older one the board was made from, and the template on disk being edited past the verified one */
    const FS = path.join(sc, "skill"), fsk = p => path.join(FS, ...p.split("/"));
    fs.readdirSync(sk("system/scripts")).filter(f => f.endsWith(".js")).forEach(f => wr(fsk("system/scripts/" + f), rd(sk("system/scripts/" + f))));
    const ver = norm(rd(SYS)), old = ver.replace("footer{margin-top:28px;", "footer{margin-top:24px;"), edit = ver.replace("footer{margin-top:28px;", "footer{margin-top:32px;");
    if (old === ver || edit === ver) throw new Error("the system template has no footer{margin-top:28px; rule to vary");
    const KEY = "system/template/system.html", TPL = wr(fsk(KEY), ver);
    const vOld = { sha256: sha(old), verified: "2026-10-24", file: `system/${sha(old).slice(0, 12)}.html`, note: "the old version (verify case)" };
    const vVer = { sha256: sha(ver), verified: "2026-10-25", file: `system/${sha(ver).slice(0, 12)}.html`, note: "the verified version (verify case)" };
    const record = () => wr(fsk("verify/verified.json"), JSON.stringify({ templates: { [KEY]: { sha256: sha(ver), verified: "2026-10-25", history: [vOld, vVer] } } }, null, 2) + "\n");
    record(); wr(fsk("verify/history/" + vOld.file), old); const VERF = wr(fsk("verify/history/" + vVer.file), ver);
    const SP = fsk("system/scripts/splice.js"), page = path.join(sc, "tree", "docs", "dashboards", "alpha", "index.html");
    const splice = (...a) => { const r = cp.spawnSync(process.execPath, [SP, page, "--json", ...a], { encoding: "utf8" }); let j = null; try { j = JSON.parse(r.stdout); } catch (e) { /* reported */ } return { r, j }; };
    const how = (j, p) => ((j && j.parts) || []).find(x => x.part === p) || {};
    const margin = () => (rd(page).match(/footer\{margin-top:(\d+)px;/) || [])[1];

    /* the template on disk unchanged: --verified reads it, as the verified version */
    wr(page, old); let { r, j } = splice("--template", TPL, "--verified");
    c.push(["with the template unchanged, --verified splices onto it, read from the template itself", r.status === 0 && j && /^the verified version [0-9a-f]{12} \(the verified version \(verify case\)\), verified 2026-10-25, read from the template itself/.test(j.onto) && margin() === "28", JSON.stringify(j && { onto: j.onto, m: margin() }) || r.stderr]);

    /* the template being edited: the current template is the edit, the verified version the cached one */
    wr(TPL, edit); wr(page, old); ({ r, j } = splice("--template", TPL, "--verified"));
    c.push(["while the template is edited, --verified splices onto the verified version from verify/history/, not onto the edit", r.status === 0 && j && /read from verify\/history\/system\/[0-9a-f]{12}\.html$/.test(j.onto) && margin() === "28", JSON.stringify(j && { onto: j.onto, m: margin() }) || r.stderr]);
    c.push(["…with the template's recorded history as its merge bases: both versions read, the board's unchanged CSS replaced", j && j.history && j.history.read === 2 && /replaced: the board had not changed it/.test(how(j, "style block 1").how || "") && !j.warnings.length, JSON.stringify(j && { h: j.history, p: how(j, "style block 1"), w: j.warnings })]);
    wr(page, old); ({ r, j } = splice("--template", TPL));
    c.push(["without --verified the splice is onto the current template, the edit", r.status === 0 && j && j.onto === "the current template" && margin() === "32", JSON.stringify(j && { onto: j.onto, m: margin() })]);

    /* a cached version given as --template: its template's history, not none */
    wr(page, old); ({ r, j } = splice("--template", VERF));
    c.push(["a cached version as --template: onto that version, the template it is a version of named, its history read (the defect: none was)", r.status === 0 && j && /^the recorded version [0-9a-f]{12} \(the verified version \(verify case\)\) of system\/template\/system\.html$/.test(j.onto) && path.resolve(j.template) === path.resolve(TPL) && j.history.read === 2 && /replaced: the board had not changed it/.test(how(j, "style block 1").how || "") && margin() === "28", JSON.stringify(j && { onto: j.onto, t: j.template, h: j.history, p: how(j, "style block 1") }) || r.stderr]);

    /* a declared divergence, merged three ways onto the verified version */
    const div = old.replace("</head>", '<meta name="template-divergence" content="a rule of its own (verify case)">\n</head>').replace("<style>", "<style>\n.page-own{outline:0}");
    wr(page, div); ({ r, j } = splice("--template", TPL, "--verified"));
    c.push(["a declared divergence is merged three ways onto the verified version: the board's change kept, the template's taken", r.status === 0 && /merged three ways \(its declared divergence kept\)/.test(how(j, "style block 1").how || "") && /<style>\n\.page-own\{outline:0\}/.test(rd(page)) && margin() === "28", JSON.stringify(how(j, "style block 1"))]);

    /* the plain report names what it spliced onto */
    wr(page, old); const txt = cp.spawnSync(process.execPath, [SP, page, "--template", TPL, "--verified", "--dry-run"], { encoding: "utf8" });
    c.push(["the plain report names the verified version it splices onto", txt.status === 0 && /^splice: .* onto .*system\/template\/system\.html as the verified version [0-9a-f]{12}/m.test(txt.stdout || ""), (txt.stdout || "").split(/\r?\n/)[0]]);

    /* refusals: no record, and a verified version that can be read from nowhere */
    fs.rmSync(fsk("verify/verified.json")); ({ r } = splice("--template", TPL, "--verified"));
    c.push(["--verified with no verified record exits 2, naming why", r.status === 2 && /--verified: system\/template\/system\.html has no verified record/.test(r.stderr || ""), (r.stderr || "").trim()]);
    record(); fs.rmSync(VERF); const noGh = path.join(sc, "not-a-clone"); fs.mkdirSync(noGh, { recursive: true });
    ({ r } = splice("--template", TPL, "--verified", "--history-repo", noGh));
    c.push(["--verified with the verified version neither on disk nor rebuildable exits 2, and the board is not written", r.status === 2 && /neither the template on disk nor a readable recorded version/.test(r.stderr || "") && margin() === "24", (r.stderr || "").trim().slice(0, 240)]);
    c.push(["--verified is a known flag of splice.js (an unknown one still exits 2)", cp.spawnSync(process.execPath, [SP, page, "--verifed"], { encoding: "utf8" }).status === 2 && /--verified/.test(cp.spawnSync(process.execPath, [SP, "--help"], { encoding: "utf8" }).stdout + cp.spawnSync(process.execPath, [SP, "--help"], { encoding: "utf8" }).stderr), "usage"]);
  });

  /* 2. apply-state.js: lastAmended.title */
  guard("apply-state.js keeps a verbatim lastAmended.title for the same issue, takes facts.title, else the issue board's issueTitle, and the folder's name only when none exists (dashboards-skill/29)", c => {
    const L = require(sk("system/scripts/statelib.js")), AS = sk("system/scripts/apply-state.js");
    const sup = rd(SUP), sys = rd(SYS), tree = path.join(sc, "state-tree"), D = path.join(tree, "docs", "dashboards"), A = path.join(D, "system-alpha");
    const stamp = { ref: "main", sha: "1111111", date: "2026-10-20" }, VERB = "Add the next part: verbatim, as on GitHub";
    const stTxt = (slug, version, la) => L.stateText({ slug, version, asIs: { ...stamp }, lastAmended: la, written: { sha: "1111111" } });
    const build = (laRepo, laAlpha) => {
      fs.rmSync(tree, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true }); fs.mkdirSync(path.join(tree, "docs", "plans", "9-next-part"), { recursive: true });
      ["system-alpha", "system-beta"].forEach(d => fs.mkdirSync(path.join(tree, d), { recursive: true }));
      const reg = JSON.parse(L.blockText(sup, "systems")); reg.repo = "acme/widgets";
      reg.systems.forEach(e => { if (e.status === "built") { e.asIs = { ...stamp }; e.lastAmended = { issue: 5, sha: "1111111" }; } });
      Object.assign(reg.systems.find(e => e.slug === "system-alpha"), { version: "1.0.0" });
      Object.assign(reg.systems.find(e => e.slug === "system-beta"), { page: null, dsl: null, version: "2.0.0" });
      reg.systems.find(e => e.slug === "system-gamma").plannedBy.issue = 9;
      const regText = "{\n  \"repo\": \"acme/widgets\",\n  \"updated\": \"2026-10-20\",\n  \"systems\": [\n" + reg.systems.map(e => "    " + L.inline(e)).join(",\n") + "\n  ]\n}\n";
      fs.writeFileSync(path.join(D, "systems.json"), regText);
      const dsl = L.blockText(sup, "dsl").replace("// As-is at <repo> <branch> <sha> (<date>), <system> <version>.", "// As-is at widgets main 1111111 (2026-10-20), alpha 1.0.0.");
      fs.writeFileSync(path.join(D, "workspace.dsl"), dsl + "\n"); fs.writeFileSync(path.join(D, "state.json"), stTxt("repo", null, laRepo));
      fs.writeFileSync(path.join(D, "index.html"), L.embedInto(L.embedInto(L.embedInto(sup, "systems", regText), "dsl", dsl), "state", stTxt("repo", null, laRepo)));
      const sd = L.blockText(sys, "dsl").replace("// As-is at <repo> <branch> <sha> (<date>), <system> <version>.", "// As-is at widgets main 1111111 (2026-10-20), alpha 1.0.0.").replace('"system-slug as built at <sha>."', '"system-alpha as built at main 1111111."');
      fs.writeFileSync(path.join(A, "workspace.dsl"), sd + "\n"); fs.writeFileSync(path.join(A, "state.json"), stTxt("system-alpha", "1.0.0", laAlpha));
      fs.writeFileSync(path.join(A, "index.html"), L.embedInto(L.embedInto(sys, "dsl", sd), "state", stTxt("system-alpha", "1.0.0", laAlpha)));
      fs.writeFileSync(path.join(tree, "docs", "plans", "9-next-part", "plan.json"), JSON.stringify({ issue: 9, systems: ["system-alpha"] }, null, 2) + "\n");
    };
    let n = 0;
    const apply = facts => { const f = wr(path.join(sc, `state-req-${++n}.json`), JSON.stringify({ v: 1, action: "plan-board", event: "implementation-stage", github: "acme/widgets", issue: 9, branch: "feat/issue-9-next-part", folder: "docs/plans/9-next-part", facts: { at: "2026-10-25T12:00:00Z", sha: "2222222abcdef0", ...facts } }, null, 2));
      const r = cp.spawnSync(process.execPath, [AS, "--event", f, "--worktree", tree, "--json"], { encoding: "utf8" }); let s; try { s = JSON.parse((r.stdout || "").trim().split(/\r?\n/).pop()); } catch (e) { s = { result: "unparsed", error: (r.stdout || "") + (r.stderr || "") }; } s.status = r.status; return s; };
    const titles = () => [path.join(A, "state.json"), path.join(D, "state.json")].map(f => (JSON.parse(rd(f)).lastAmended || {}).title);
    const embedded = () => [path.join(A, "index.html"), path.join(D, "index.html")].every(p => L.blockText(rd(p), "state") === rd(path.join(path.dirname(p), "state.json")).trim());
    const slugNote = s => (s.notes || []).some(x => /taken from the folder's name/.test(x));

    /* the defect: no facts.title, a verbatim title on the board's state for #9, and the folder name written over it */
    build({ issue: 5, title: "five", sha: "1111111" }, { issue: 9, title: VERB, sha: "1111111" });
    let s = apply({});
    let [ta, tr] = titles();
    c.push(["no facts.title: the board keeps the verbatim title its state.json holds for the same issue, never the folder's name", s.status === 0 && ta === VERB, JSON.stringify({ result: s.result, ta, error: s.error })]);
    c.push(["…and the shared board in scope, with no title for #9, takes that verbatim title, not the folder's name; no folder-name note", tr === VERB && !slugNote(s) && embedded(), JSON.stringify({ tr, notes: s.notes })]);

    /* facts.title wins when the event carries it */
    build({ issue: 5, title: "five", sha: "1111111" }, { issue: 9, title: VERB, sha: "1111111" });
    s = apply({ title: "Add the next part (retitled on GitHub)" }); [ta, tr] = titles();
    c.push(["facts.title, when the event carries it, is written on every board in scope", s.status === 0 && ta === "Add the next part (retitled on GitHub)" && tr === ta && !slugNote(s) && embedded(), JSON.stringify({ ta, tr })]);

    /* a title on record for another issue is not this one's */
    build({ issue: 5, title: "five", sha: "1111111" }, { issue: 5, title: "five", sha: "1111111" });
    s = apply({}); [ta, tr] = titles();
    c.push(["with no facts.title and no title on record for the issue (another issue's title is not it), the folder's name less its number, noted", s.status === 0 && ta === "next-part" && tr === "next-part" && slugNote(s) && embedded(), JSON.stringify({ ta, tr, notes: s.notes })]);

    /* the same request twice: the kept title is not churned */
    const again = apply({});
    c.push(["the same request again changes nothing (the folder's name it wrote is no verbatim title, so it is not mistaken for one)", again.status === 0 && again.result === "duplicate" && titles().every(t => t === "next-part"), JSON.stringify({ result: again.result, wrote: again.wrote })]);

    /* a folder-name title on record yields to a verbatim one another board holds */
    build({ issue: 9, title: "next-part", sha: "1111111" }, { issue: 9, title: VERB, sha: "1111111" });
    s = apply({}); [ta, tr] = titles();
    c.push(["a board holding only the folder's name for the issue takes the verbatim title another board in scope holds", s.status === 0 && ta === VERB && tr === VERB && !slugNote(s), JSON.stringify({ ta, tr })]);
    /* the issue board's own issueTitle, with no title on record for the issue: the verbatim title, never the folder's name */
    build({ issue: 5, title: "five", sha: "1111111" }, { issue: 5, title: "five", sha: "1111111" });
    fs.writeFileSync(path.join(tree, "docs", "plans", "9-next-part", "plan.json"), JSON.stringify({ issue: 9, issueTitle: VERB, systems: ["system-alpha"] }, null, 2) + "\n");
    s = apply({}); [ta, tr] = titles();
    c.push(["with no facts.title and no title on record, the issue board's own issueTitle, verbatim, on every board in scope; no folder-name note", s.status === 0 && ta === VERB && tr === VERB && !slugNote(s) && embedded(), JSON.stringify({ ta, tr, notes: s.notes })]);
    c.push(["the boards it wrote pass check-board.js --auto --no-browser", [path.join(A, "index.html"), path.join(D, "index.html")].every(p => cp.spawnSync(process.execPath, [checker, p, "--auto", "--no-browser"], { encoding: "utf8" }).status === 0), /^pass/.test(s.check || "") ? s.check : String(s.check)]);
  });

  /* 3. a planned supersystem whose built parts have a board */
  guard("a planned supersystem whose built parts have a board: its Systems card links that board, never \"no board yet\" (dashboards-skill/29)", c => {
    const L = require(sk("system/scripts/statelib.js")), F = require(sk("system/scripts/features.js")), H = require(sk("system/scripts/history.js"));
    const sup = rd(SUP), reg = JSON.parse(L.blockText(sup, "systems"));
    /* system-gamma: a planned supersystem with a board for its built parts, and a planned system with none beside it */
    Object.assign(reg.systems.find(e => e.slug === "system-gamma"), { kind: "supersystem", page: "system-gamma/index.html" });
    reg.systems.push({ slug: "system-delta", name: "system-delta", kind: "system", parent: null, status: "planned", function: "What delta will do.", paths: [], plannedBy: { issue: 0, architecture: "docs/plans/N-slug/architecture.md" } });
    const regText = "{\n  \"repo\": \"ORG/REPO\",\n  \"updated\": \"YYYY-MM-DD\",\n  \"systems\": [\n" + reg.systems.map(e => "    " + L.inline(e)).join(",\n") + "\n  ]\n}\n";
    const page = wr(path.join(sc, "parts-page", "index.html"), L.embedInto(sup, "systems", regText)); wr(path.join(sc, "parts-page", "system-gamma", "index.html"), "<!doctype html><title>stub</title>");
    const d = dumpDom(page, "", "1400,1000");
    c.push(["a browser renders the board (set CHROME)", d != null, "no Chrome or Edge found"]);
    if (d != null) {
      const cards = inner(d, '<div class="syscards" id="syscards">', "div"), card = slug => (cards.match(new RegExp(`<span class="syscard planned"[^>]*data-slug="${slug}"[\\s\\S]*?</span></div></span>`)) || [""])[0];
      const g = card("system-gamma"), dl = card("system-delta"), key = text(inner(d, '<div class="key" id="systems-key">', "div"));
      c.push(["the planned supersystem's card links its built parts' board and says \"planned · built in part\", not \"no board yet\"", /<div class="st">planned · built in part<\/div>/.test(g) && /<a href="system-gamma\/index\.html">its built parts' board<\/a>/.test(g) && !/no board yet/.test(g), text(g).slice(0, 220)]);
      c.push(["…as a link inside the card, the card itself a span (links do not nest: \"its plan\" is a link too)", /^<span class="syscard planned"/.test(g) && !/<a class="syscard planned"[^>]*data-slug="system-gamma"/.test(cards), g.slice(0, 120)]);
      c.push(["a planned system with no board still says \"planned · no board yet\", with no board link", /<div class="st">planned · no board yet<\/div>/.test(dl) && !/its built parts' board/.test(dl), text(dl).slice(0, 200)]);
      c.push(["the legend names both: \"planned: no board yet, or built in part: links its built parts' board\"", /planned: no board yet, or built in part: links its built parts' board/.test(key), key.slice(0, 300)]);
      const base = dumpDom(SUP, "", "1400,1000"), bkey = text(inner(base, '<div class="key" id="systems-key">', "div"));
      c.push(["with no planned supersystem board, the legend keeps \"planned: no board yet\" alone", /planned: no board yet(?!, or)/.test(bkey) && !/built parts/.test(bkey), bkey.slice(0, 200)]);
      const ck = cp.spawnSync(process.execPath, [checker, page, "--out", path.join(sc, "parts-page-check")], { encoding: "utf8" });
      c.push(["check-board.js's full pass passes the board (legends, dashes, keyboard, no dead link)", ck.status === 0, (ck.stdout || "").split(/\r?\n/).filter(l => /FAIL|DEAD|LEGEND|MISSING/.test(l)).slice(0, 4).join(" | ") || "pass"]);
    }
    /* the feature probe: the template passes it; the verified version before this run lacks it */
    c.push(["the feature probe planned-parts-page applies to supersystem and repository state boards, and the template passes it", F.applicable("supersystem").some(f => f.id === "planned-parts-page") && !F.probe(sup, "supersystem").some(m => m.id === "planned-parts-page"), JSON.stringify(F.probe(sup, "supersystem"))]);
    c.push(["…not to the other types, each with its reason", ["system", "plan-board", "work-board"].every(k => !F.applicable(k).some(f => f.id === "planned-parts-page")) && Object.keys((F.FEATURES.find(f => f.id === "planned-parts-page") || {}).notFor || {}).length === 3, JSON.stringify((F.FEATURES.find(f => f.id === "planned-parts-page") || {}).notFor)]);
    const lacks = (() => { const R = H.load(SUP, { noRebuild: true }).versions.filter(v => !/its built parts' (?:board|page)/.test(v.html)); return R.length ? R[R.length - 1].html : null; })();
    c.push(["a board on the template before this run is missing the feature (it says \"no board yet\" on such a card)", lacks == null || F.probe(lacks, "supersystem").some(m => m.id === "planned-parts-page" && /no board yet/.test(m.why)), lacks == null ? "no earlier version cached" : JSON.stringify(F.probe(lacks, "supersystem").filter(m => m.id === "planned-parts-page"))]);
  });

  return groups;
};
