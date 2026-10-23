#!/usr/bin/env node
// Verify the dashboard templates once, so pages made from them need not be (GUIDANCE.md §8).
//   node verify/verify-templates.js [--root <repo>] [--out <dir>]
// Renders each template with its fixtures into a scratch folder and runs system/scripts/check-page.js on every rendering, in
// light, dark, 520 px, a 390 px frame and a 1920 x 1080 desktop window. When every pass of a template passes, records the template's sha256 in
// verify/verified.json (the skill's templates) or in <repo>/docs/{plans,dashboards}/_template/verified.json (a repository's own
// templates, with --root). check-page.js --auto and plan/scripts/check.js --auto then skip the browser pass for a page that is a
// verified template plus its data, and give a system page whose structure is the template's one light pass. Run it after every
// change to a template; until then, every page made from that template gets the full pass.
// The fixtures cover each template's states: the issue board example (landed, every option verdict and as-built state), the
// tracking fixture (a landed, a complete and an in-progress unit, the unit up next and blocked), the sub-issue fixture (a board
// inside its parent's folder, its parent and a sibling with boards, a part deferred to an issue), the work board fixture (landed,
// complete, building, next, not started; a sub-issue with a board, linked from its row, the roadmap and a waits-on; and its
// live variant from board.js --live) and each template's own placeholder content.
// Before the browser passes it tests deviation.js on each system template, without a browser: page-filled lines are no
// difference; an undeclared change to the script before MODEL is reported, with its warning, and gets the full pass. It also
// tests the links to an issue's board (plan/RULES.md §1) on the plan-board and work-board templates: embed.js links a unit, the
// parent and every other issue a board names to that issue's board only when the board exists, and clears a link whose board is
// gone; check.js warns on a page older than the rule and fails a dead link; and the rendered pages (headless Chrome, --dump-dom)
// open the boards from the "part of" chip, the breadcrumb, the WIP strip's unit lines, the "blocked by" tags and the roadmap. And it
// tests the units' runs (plan/RULES.md §3): embed.js mirrors a unit's run from its own board into the tracking board, every embed of
// the sub-issue's board re-embeds the tracking board, check.js warns on a mirror older than the board, and the rendered tracking
// board shows the run on the WIP strip and in the unit's as-built cell, its mark paused while the run waits on the user.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const { recordFile, sha, norm } = require(path.join(__dirname, "..", "system", "scripts", "deviation.js"));
const SKILL = path.resolve(__dirname, "..");
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(opt("out", path.join(os.tmpdir(), "dashboards-verify")));
const checker = path.join(SKILL, "system", "scripts", "check-page.js");
/* light, dark, the narrowest window headless Chrome lays out, a phone-width frame, and a 16:9 desktop (the wide layout) */
const MODES = [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"], ["--width", "1920", "--height", "1080"]];
const sk = p => path.join(SKILL, ...p.split("/"));

/* Each template, the block its data goes in (none for system templates, which carry their own sample content), and its fixtures. */
const PLAN_FIX = [sk("plan/examples/38-handshake-empty-name/plan.json"), sk("verify/fixtures/tracking.plan.json"), sk("verify/fixtures/sub-issue.plan.json"), null];
const BOARD_FIX = [sk("verify/fixtures/work-board.json"), sk("verify/fixtures/work-board-live.json"), null];
const SETS = [
  { name: "plan/template/dashboard.html", file: "dashboard.html", dir: "docs/plans/_template", block: "plan", fixtures: PLAN_FIX },
  { name: "plan/template/board.html", file: "board.html", dir: "docs/plans/_template", block: "board", fixtures: BOARD_FIX },
  { name: "system/template/system.html", file: "system.html", dir: "docs/dashboards/_template", block: null, fixtures: [null] },
  { name: "system/template/supersystem.html", file: "supersystem.html", dir: "docs/dashboards/_template", block: null, fixtures: [null] },
];
const root = opt("root", null);
const targets = SETS.map(s => ({ ...s, path: root ? path.join(path.resolve(root), ...s.dir.split("/"), s.file) : sk(s.name) })).filter(t => fs.existsSync(t.path));
if (!targets.length) { console.error(root ? `${root} keeps no templates under docs/plans/_template/ or docs/dashboards/_template/` : "no templates found"); process.exit(2); }

const withData = (html, id, json) => {
  const open = `<script type="application/json" id="${id}">`, a = html.indexOf(open), b = html.indexOf("</script>", a + open.length);
  return html.slice(0, a + open.length) + "\n" + json.replace(/<\/script/gi, "<\\/script").trim() + "\n" + html.slice(b);
};
/* The comparison check-page.js --auto makes (deviation.js), tested on each system template before any browser pass, with no
   browser: a copy whose page-filled lines (REPO, SRC) carry a page's own values must not differ; a copy with one undeclared line
   added to the script before MODEL (where a supersystem or repository page keeps its Systems renderer) must differ there, be
   reported undeclared and get the full pass; the same copy declaring it must not be reported undeclared. Each copy sits in a
   scratch repository whose docs/dashboards/_template/ holds the template under test, so deviation.js holds it to that template. */
const { deviation } = require(path.join(SKILL, "system", "scripts", "deviation.js"));
let failures = 0, devFailures = 0;
targets.filter(t => !t.block).forEach(t => {
  const tpl = norm(fs.readFileSync(t.path, "utf8")), scratch = path.join(out, "deviation-" + path.basename(t.file, ".html"));
  const tdir = path.join(scratch, "docs", "dashboards", "_template"), pdir = path.join(scratch, "docs", "dashboards", "page");
  fs.mkdirSync(tdir, { recursive: true }); fs.mkdirSync(pdir, { recursive: true });
  fs.writeFileSync(path.join(tdir, t.file), tpl);
  const pre = tpl.lastIndexOf("<script>", tpl.indexOf("const MODEL = {"));
  const filled = tpl.replace(/^const REPO=.*$/m, 'const REPO="https://github.com/acme/widgets";').replace(/^const SRC=.*$/m, 'const SRC=REPO+"/blob/master/src/";');
  const added = tpl.slice(0, pre + "<script>".length) + "\nconst UNDECLARED_HELPER=()=>0;" + tpl.slice(pre + "<script>".length);
  const declared = added.replace("<head>", '<head>\n<meta name="template-divergence" content="a helper before MODEL (deviation self-test)">');
  const run = (name, html) => { const p = path.join(pdir, name + ".html"); fs.writeFileSync(p, html); return deviation(p); };
  const f = run("filled", filled), u = run("undeclared", added), d = run("declared", declared), before = x => x.differs.some(s => /script before MODEL/.test(s));
  const cases = [
    ["page-filled REPO and SRC are no difference", !f.differs.length, f.differs.join("; ")],
    ["an undeclared line before MODEL differs there", before(u), u.differs.join("; ") || "no difference found"],
    ["an undeclared line before MODEL is reported undeclared, with the warning", u.undeclared && u.notes.some(n => /no divergence is declared/.test(n)), u.notes.join(" | ")],
    ["an undeclared line before MODEL gets the full pass", u.passes === "full", u.passes],
    ["the same line declared is not reported undeclared", before(d) && !d.undeclared && d.passes === "full", d.notes.join(" | ")],
  ];
  const bad = cases.filter(c => !c[1]);
  console.log(`${bad.length ? "FAILED  " : "checked "} deviation.js on ${t.name}: ${cases.length - bad.length}/${cases.length} cases`);
  bad.forEach(c => console.log(`  ${c[0]}: ${c[2]}`));
  if (bad.length) devFailures++;
});

/* Links to an issue's board (plan/RULES.md §1), tested on the plan-board and work-board templates in scratch repositories that hold
   stub boards, so every relative link has a file behind it:
   - a tracking board (the tracking fixture; stubs for units #61 and #47): embed.js links a unit to the board that exists and
     unlinks one that does not; check.js passes the template plus its data without the warning, warns on a page older than the
     rule and names the places, and fails a link to a board that is not there;
   - a sub-issue's board (the sub-issue fixture, in its parent #36's folder; stubs for #36 and the sibling #52): embed.js sets
     parent.board and issueBoards from the folders on disk; check.js passes it without the warning, warns on a template of the
     sub-issue rule alone (SUB_BOARDS, no ISSUE_BOARDS) and names the "part of" chip, fails a parent.board whose board is gone, and
     embed.js clears it;
   - the rendered pages, through headless Chrome's --dump-dom: on the sub-issue board the "part of" chip opens the parent's board
     with GitHub ↗ beside it and no separate board link, the breadcrumb, a follow-up and a roadmap item open their boards, and the
     deferred badge links its issue; on the tracking board the WIP strip's "In progress" and "Up next" lines and the "blocked by"
     tag are links, each to the board when it exists and to GitHub when not; on the work board the group heading, the "part of"
     line, the Up next count and the "blocked by" tag are links;
   - the work board: check.js is silent on the current template and warns on one of the sub-issue rule alone. */
let linkFailures = 0;
const browsers = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
const chrome = process.env.CHROME && fs.existsSync(process.env.CHROME) ? process.env.CHROME : browsers.find(b => fs.existsSync(b));
/* The DOM of a page after its scripts ran, or null without a browser. */
const dumpDom = (page, hash) => { if (!chrome) return null; const r = cp.spawnSync(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--allow-file-access-from-files", "--virtual-time-budget=4000", "--dump-dom", "file:///" + path.resolve(page).replace(/\\/g, "/") + (hash ? "#" + hash : "")], { encoding: "utf8", timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  return r.stdout || ""; };
/* The inner HTML of the first element of a DOM dump whose opening tag matches `open` (a regex source), up to its closing tag. */
const inner = (dom, open, tag) => { const m = new RegExp(open).exec(dom || ""); if (!m) return ""; let depth = 1, i = m.index + m[0].length; const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g"); re.lastIndex = i;
  let t; while ((t = re.exec(dom))) { depth += t[1] ? -1 : 1; if (!depth) return dom.slice(i, t.index); } return dom.slice(i); };
const embedJs = path.join(SKILL, "plan", "scripts", "embed.js"), checkJs = path.join(SKILL, "plan", "scripts", "check.js");
const node = (js, folder, ...a) => cp.spawnSync(process.execPath, [js, folder, ...a], { encoding: "utf8" });
const lines = (r, re) => (r.stdout || "").split(/\r?\n/).filter(l => re.test(l)).join(" | ");
const warned = r => /has a board .* links #\d+ to its GitHub issue/.test(r.stdout || "");
const stub = dir => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "dashboard.html"), "<!doctype html><title>stub</title>"); };
const report = (what, cases) => { const bad = cases.filter(c => !c[1]);
  console.log(`${bad.length ? "FAILED  " : "checked "} ${what}: ${cases.length - bad.length}/${cases.length} cases`);
  bad.forEach(c => console.log(`  ${c[0]}: ${c[2]}`)); if (bad.length) linkFailures++; };

targets.filter(t => t.block === "plan").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), oldSub = tpl.replace("const ISSUE_BOARDS=", "const SUB_BOARDS="), none = tpl.replace("const ISSUE_BOARDS=", "const ISSUE_BOARDS_OFF=");
  /* the tracking board */
  const fx = JSON.parse(fs.readFileSync(sk("verify/fixtures/tracking.plan.json"), "utf8"));
  const unit = (fx.rows || []).find(r => r.unit && r.unit.board), plain = (fx.rows || []).find(r => r.unit && !r.unit.board && r.unit.folder);
  if (!unit || !plain) { console.log(`FAILED   issue links on ${t.name}: the tracking fixture needs a unit with a board and one with a folder but no board`); linkFailures++; return; }
  const scratch = path.join(out, "issue-links-tracking"), folder = path.join(scratch, ...fx.folder.split("/"));
  const setup = (data, html, stubs) => {
    fs.rmSync(scratch, { recursive: true, force: true }); fs.mkdirSync(folder, { recursive: true });
    (stubs || []).forEach(r => stub(path.join(folder, r.unit.folder || path.dirname(r.unit.board))));
    fs.writeFileSync(path.join(folder, "plan.json"), JSON.stringify(data, null, 2) + "\n"); fs.writeFileSync(path.join(folder, "dashboard.html"), html);
  };
  const data = () => JSON.parse(fs.readFileSync(path.join(folder, "plan.json"), "utf8"));
  const boardOf = (d, r) => d.rows.find(x => x.id === r.id).unit.board;
  const cases = [];
  { const d = JSON.parse(JSON.stringify(fx)); delete d.rows.find(x => x.id === unit.id).unit.board; setup(d, tpl, [unit]); node(embedJs, folder);
    const c = node(checkJs, folder, "--root", scratch);
    cases.push(["embed.js links a unit to its sub-issue's board when the board exists", boardOf(data(), unit) === unit.unit.board, String(boardOf(data(), unit))]);
    cases.push(["check.js passes the template plus its data without the warning", c.status === 0 && !warned(c), lines(c, /^(FAIL|warn)/)]); }
  { setup(fx, none, [unit]); node(embedJs, folder); const c = node(checkJs, folder, "--root", scratch);
    cases.push(["check.js warns on a page older than the rule and names the places", warned(c) && /the unit row's label/.test(c.stdout), lines(c, /^warn/) || "no warning"]); }
  { setup(fx, oldSub, [unit]); node(embedJs, folder); const c = node(checkJs, folder, "--root", scratch);
    cases.push(["check.js names the WIP strip's plain-text unit lines on a template of the sub-issue rule alone", /older than the widened link rule/.test(c.stdout) && /"Up next" line/.test(c.stdout), lines(c, /^warn/) || "no warning"]); }
  { setup(fx, tpl, []); const c0 = node(checkJs, folder, "--root", scratch);
    cases.push(["check.js fails a unit linked to a board that does not exist", c0.status === 1 && /names no board in this tree/.test(c0.stdout), lines(c0, /^FAIL/) || "no failure"]);
    node(embedJs, folder); const c = node(checkJs, folder, "--root", scratch);
    cases.push(["embed.js unlinks it, and the page keeps the GitHub link", boardOf(data(), unit) === null && c.status === 0, `unit.board ${JSON.stringify(boardOf(data(), unit))}, check exit ${c.status}`]); }
  { setup(fx, tpl, [unit, plain]); node(embedJs, folder); const d = data();
    cases.push(["a second unit's board is linked once it exists", boardOf(d, plain) === plain.unit.folder + "dashboard.html", String(boardOf(d, plain))]);
    const dom = dumpDom(path.join(folder, "dashboard.html"));
    if (dom != null) {
      const wip = inner(dom, '<section class="wip"[^>]*>', "section"), inProg = (wip.match(/In progress · unit[\s\S]*?<\/div>/) || [""])[0], next = (wip.match(/Up next · unit[\s\S]*?<\/div>/) || [""])[0];
      const nx = d.rows.find(r => r.id === d.wip.next);
      cases.push([`the "In progress" line links #${plain.unit.issue}'s number to GitHub and its name to its board, with no GitHub ↗`, inProg.includes(`/issues/${plain.unit.issue}"`) && inProg.includes(`href="${plain.unit.folder}dashboard.html"`) && !/class="gh"/.test(inProg), inProg.slice(0, 400) || "no In progress line"]);
      /* the unit row (plan/RULES.md §1, "Number and title"): "n. #N Title", the number to GitHub, the title to the board (plain
         text while there is none), and no link line under the system */
      const lab = id => inner(dom, `<div class="rowlab"[^>]*id="row-${id}"[^>]*>`, "div"), nm = id => (lab(id).match(/<div class="nm">([\s\S]*?)<\/div>/) || ["", ""])[1];
      const withB = nm(plain.id), noB = nm(nx.id), reEsc = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cases.push([`the unit row reads "${plain.unit.n}. #${plain.unit.issue} ${plain.name}": the number opens GitHub, the title the board`, new RegExp(`^${plain.unit.n}\\. <a href="https://github\\.com/[^"]+/issues/${plain.unit.issue}"[^>]*>#${plain.unit.issue}</a> <a href="${reEsc(plain.unit.folder)}dashboard\\.html"[^>]*>`).test(withB) && !/class="un"/.test(lab(plain.id)), withB.slice(0, 300) || "no unit row"]);
      cases.push([`a unit with no board keeps its title as plain text ("${nx.unit.n}. #${nx.unit.issue} ${nx.name}")`, new RegExp(`^${nx.unit.n}\\. <a href="https://github\\.com/[^"]+/issues/${nx.unit.issue}"[^>]*>#${nx.unit.issue}</a> [^<]`).test(noB), noB.slice(0, 300) || "no unit row"]);
      cases.push([`the "Up next" line links #${nx.unit.issue} to GitHub (no board) and the "blocked by" tag opens #${plain.unit.issue}'s board`, next.includes(`/issues/${nx.unit.issue}"`) && /blocked by/.test(next) && next.includes(`href="${plain.unit.folder}dashboard.html"`), next.slice(0, 500) || "no Up next line"]);
    } else cases.push(["the rendered tracking board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  }
  report(`issue links on ${t.name} (tracking board)`, cases);

  /* The units' own runs (plan/RULES.md §3), in the same scratch tracking tree: the unit in progress gets a real board of its own (the
     template plus a plan.json whose run is at "plan"); embed.js on the tracking board mirrors that run into unit.live; a later event
     on the sub-issue's board leaves the mirror older, which check.js warns on, on both boards; embed.js on the sub-issue's board
     re-embeds the tracking board, which then mirrors the new state; the rendered tracking board shows the run under the WIP strip's
     "In progress" line and in the unit's as-built cell, its mark paused while the run waits on the user; and a mirror on a unit
     that is no longer in progress is cleared. */
  { const rc = [], live = () => data().rows.find(x => x.id === plain.id).unit.live;
    setup(fx, tpl, [unit]);
    const subDir = path.join(folder, plain.unit.folder), subName = path.basename(subDir);
    const sub = { schema: "plan-board/1", repo: fx.repo, issue: plain.unit.issue, slug: subName, folder: `${fx.folder}/${subName}`, kind: "issue", level: plain.unit.level,
      title: plain.name, function: "Verification stub: a unit's own board.", status: "planned", parent: { issue: fx.issue, board: null }, branch: null,
      baseline: fx.baseline, asBuilt: null, systems: (fx.systems || []).filter(s => s.slug === plain.system),
      wip: { step: "plan", since: "2026-10-23T00:27:57Z", updated: "2026-10-23T00:27:57Z", detail: "Verification stub: the planner writes `plan.md` now.",
        steps: ["sizing", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"], current: ["considered", "verdict"], next: null,
        qa: [], qaMax: 3, waitingOn: null, resume: null, blockers: { waitsOn: [], blocks: [] }, landing: null },
      milestones: [], trail: [], rows: [], roadmap: null, followUps: [], documents: [], notes: {} };
    const writeSub = () => fs.writeFileSync(path.join(subDir, "plan.json"), JSON.stringify(sub, null, 2) + "\n");
    fs.mkdirSync(subDir, { recursive: true }); writeSub(); fs.writeFileSync(path.join(subDir, "dashboard.html"), tpl);
    node(embedJs, folder); let L = live();
    rc.push(["embed.js on the tracking board mirrors the unit's run from its board", !!L && L.step === "plan" && L.updated === sub.wip.updated, JSON.stringify(L)]);
    let c = node(checkJs, folder, "--root", scratch);
    rc.push(["check.js is silent on a fresh mirror", c.status === 0 && !/unit\.live/.test(c.stdout), lines(c, /unit\.live|^FAIL/)]);
    Object.assign(sub.wip, { step: "halted", resume: "plan", updated: "2026-10-23T01:10:00Z", waitingOn: "Verification stub: the user chooses between two designs." }); writeSub();
    c = node(checkJs, folder, "--root", scratch);
    rc.push(["check.js warns when the mirror is older than the sub-issue board's wip.updated", /unit\.live .*older than the board's wip\.updated/.test(c.stdout), lines(c, /^warn/) || "no warning"]);
    const cs = node(checkJs, subDir, "--root", scratch);
    rc.push(["check.js on the sub-issue's board warns that its parent's mirror lags", /tracking board mirrors this run as of/.test(cs.stdout), lines(cs, /^warn/) || "no warning"]);
    node(embedJs, subDir); L = live();
    rc.push(["embed.js on the sub-issue's board re-embeds the tracking board, which mirrors the new state", !!L && L.step === "halted" && L.waitingOn === sub.wip.waitingOn, JSON.stringify(L)]);
    c = node(checkJs, folder, "--root", scratch);
    rc.push(["check.js passes the re-embedded tracking board without the warning", c.status === 0 && !/unit\.live/.test(c.stdout), lines(c, /unit\.live|^FAIL/)]);
    const dom = dumpDom(path.join(folder, "dashboard.html"));
    if (dom != null) {
      const wip = inner(dom, '<section class="wip"[^>]*>', "section"), run = inner(wip, '<div class="unitrun[^"]*">', "div");
      const cell = (dom.match(new RegExp(`<div class="cell built[^"]*"[^>]*data-row="${plain.id}"[\\s\\S]*?<div class="meta">`)) || [""])[0];
      rc.push(["the WIP strip shows the unit's run under its \"In progress\" line, waiting on the user", /class="unitrun halted"/.test(wip) && /Waiting on the user: Verification stub/.test(run), run.slice(0, 400) || "no run block"]);
      rc.push(["the unit's as-built cell carries the run line, its mark paused", /class="run"/.test(cell) && /waiting on the user/.test(cell) && / held"/.test(cell.slice(0, 200)), cell.slice(0, 500) || "no cell"]);
    } else rc.push(["the rendered tracking board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    const d = data(); d.wip.current = d.wip.current.filter(a => a.split(".")[0] !== plain.id);
    fs.writeFileSync(path.join(folder, "plan.json"), JSON.stringify(d, null, 2) + "\n"); node(embedJs, folder);
    rc.push(["embed.js clears the mirror of a unit that is no longer in progress", live() === undefined, JSON.stringify(live())]);
    report(`the units' runs on ${t.name} (tracking board)`, rc);
  }

  /* a sub-issue's board inside its parent's folder */
  const sx = JSON.parse(fs.readFileSync(sk("verify/fixtures/sub-issue.plan.json"), "utf8"));
  const sScratch = path.join(out, "issue-links-sub-issue"), sFolder = path.join(sScratch, ...sx.folder.split("/")), parentDir = path.dirname(sFolder);
  const sibling = Object.entries(sx.issueBoards || {})[0];
  if (!sx.parent || !sibling) { console.log(`FAILED   issue links on ${t.name}: the sub-issue fixture needs a parent and an issueBoards entry`); linkFailures++; return; }
  const sSetup = (d, html, parentStub) => {
    fs.rmSync(sScratch, { recursive: true, force: true }); fs.mkdirSync(sFolder, { recursive: true });
    if (parentStub) stub(parentDir); stub(path.join(sFolder, path.dirname(sibling[1])));
    fs.writeFileSync(path.join(sFolder, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(sFolder, "dashboard.html"), html);
  };
  const sData = () => JSON.parse(fs.readFileSync(path.join(sFolder, "plan.json"), "utf8"));
  const sc = [];
  { const d = JSON.parse(JSON.stringify(sx)); delete d.parent.board; delete d.issueBoards; sSetup(d, tpl, true); node(embedJs, sFolder); const e = sData();
    sc.push(["embed.js links the parent's board when the enclosing folder holds it", e.parent.board === "../dashboard.html", JSON.stringify(e.parent)]);
    sc.push([`embed.js links #${sibling[0]}, which the board names, to its board`, (e.issueBoards || {})[sibling[0]] === sibling[1], JSON.stringify(e.issueBoards)]);
    const c = node(checkJs, sFolder, "--root", sScratch);
    sc.push(["check.js passes the sub-issue board without the warning", c.status === 0 && !warned(c), lines(c, /^(FAIL|warn)/)]);
    const dom = dumpDom(path.join(sFolder, "dashboard.html"));
    if (dom != null) {
      const chip = (inner(dom, '<div class="chips" id="chips">', "div").match(/<span class="chip">part of[\s\S]*?<\/span>/) || [""])[0];
      const crumbs = inner(dom, '<div class="crumbs" id="crumbs">', "div"), ctx = inner(dom, '<div class="cards" id="context">', "div");
      sc.push([`the "part of" chip opens #${sx.parent.issue}'s board, with GitHub ↗ beside it and no separate board link`, chip.includes('href="../dashboard.html"') && /class="gh"[^>]*>GitHub ↗/.test(chip) && !/>board<\/a>/.test(chip), chip || "no chip"]);
      sc.push(["the breadcrumb opens the parent's board", new RegExp(`href="\\.\\./dashboard\\.html">${path.basename(parentDir)}<`).test(crumbs), crumbs.slice(0, 400)]);
      sc.push([`the roadmap and the follow-ups open #${sibling[0]}'s board`, (ctx.split(`href="${sibling[1]}"`).length - 1) >= 2, `${ctx.split(`href="${sibling[1]}"`).length - 1} links`]);
      const def = sx.rows.find(r => (r.asBuilt || {}).state === "deferred");
      sc.push([`the deferred badge links #${def.asBuilt.issue}`, new RegExp(`→ <a href="https://github\\.com/${sx.repo}/issues/${def.asBuilt.issue}"`).test(dom), "no link in the badge"]);
    } else sc.push(["the rendered sub-issue board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  }
  { sSetup(sx, oldSub, true); node(embedJs, sFolder); const c = node(checkJs, sFolder, "--root", sScratch);
    sc.push(['check.js warns on a template of the sub-issue rule alone and names the "part of" chip', /\(the parent\) has a board/.test(c.stdout) && /"part of" chip/.test(c.stdout), lines(c, /^warn/) || "no warning"]); }
  { sSetup(sx, tpl, false); const c0 = node(checkJs, sFolder, "--root", sScratch);
    sc.push(["check.js fails a parent.board whose board is not there", c0.status === 1 && /parent\.board .* names no board/.test(c0.stdout), lines(c0, /^FAIL/) || "no failure"]);
    node(embedJs, sFolder); const c = node(checkJs, sFolder, "--root", sScratch);
    sc.push(["embed.js clears it, and the chip keeps the GitHub link", sData().parent.board === null && c.status === 0, `parent.board ${JSON.stringify(sData().parent.board)}, check exit ${c.status}`]); }
  report(`issue links on ${t.name} (sub-issue board)`, sc);

  /* The Impact tab (plan/RULES.md §2, "Impact") and the work-level guard (GUIDANCE.md §4), on the rendered pages and in check.js:
     the example's four sections, as built; the tracking fixture's initiative impact, planned and dashed, and one entry per unit
     whose title opens the unit's board; a board with no impact recorded says so with its source; a board with no version bump
     and nothing downstream says so explicitly; check.js warns when impact.md exists but the tab is empty, and fails a board whose
     text names a work level; check-page.js reports a work level the page shows. */
  const ic = [], iScratch = path.join(out, "impact"), ex = JSON.parse(fs.readFileSync(sk("plan/examples/38-handshake-empty-name/plan.json"), "utf8"));
  const page = (name, data) => { const dir = path.join(iScratch, "docs", "plans", name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const d = { ...data, slug: name, folder: `docs/plans/${name}` }; fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); node(embedJs, dir); return dir; };
  const panel = dom => inner(dom, '<section class="view" role="tabpanel" id="p-impact"[^>]*>', "section");
  { const dir = page("38-handshake-empty-name", ex), dom = dumpDom(path.join(dir, "dashboard.html"), "impact");
    if (dom != null) { const p = panel(dom);
      ic.push(["the example's Impact tab shows its four sections and its as-built basis", ["Downstream effects", "Adaptation requirements", "API changes", "Conversion steps"].every(h => p.includes(h)) && /as built<\/span>/.test(p) && /id="impact-key"[^>]*><span/.test(p), p.slice(0, 300) || "no Impact panel"]);
    } else ic.push(["the rendered Impact tab (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    fs.writeFileSync(path.join(dir, "impact.md"), "# Impact\n");
    const d = JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8")); d.impact = null; fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); node(embedJs, dir);
    const c = node(checkJs, dir, "--root", iScratch);
    ic.push(["check.js warns when impact.md exists but the Impact tab is empty", /impact\.md exists in this folder, but the Impact tab is empty/.test(c.stdout), lines(c, /^warn/) || "no warning"]);
    const dom2 = dumpDom(path.join(dir, "dashboard.html"), "impact");
    if (dom2 != null) ic.push(["a board with no impact recorded shows the tab with the statement and its source", /No downstream impact recorded yet/.test(panel(dom2)) && /Source:/.test(panel(dom2)), panel(dom2).slice(0, 300)]); }
  { const d = JSON.parse(JSON.stringify(ex)); d.impact = { basis: "as-built", summary: "", none: "Verification case: a change inside one system with no consumer-visible difference.", release: { bump: "none", version: null }, downstream: [], adaptation: [], api: [], conversion: [], changes: [], source: "plan.md" };
    const dir = page("38-no-bump", d), dom = dumpDom(path.join(dir, "dashboard.html"), "impact");
    if (dom != null) ic.push(["no version bump and nothing downstream is said explicitly", /No downstream impact recorded\./.test(panel(dom)) && /no version moves/.test(panel(dom)) && !/\blevel\b/i.test(panel(dom).replace(/<[^>]+>/g, "")), panel(dom).slice(0, 400)]); }
  { const fxT = JSON.parse(fs.readFileSync(sk("verify/fixtures/tracking.plan.json"), "utf8")), dir = path.join(iScratch, ...fxT.folder.split("/")), bu = fxT.rows.find(r => r.unit && r.unit.board);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); stub(path.join(dir, bu.unit.folder));
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(fxT, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); node(embedJs, dir);
    const dom = dumpDom(path.join(dir, "dashboard.html"), "impact");
    if (dom != null) { const p = panel(dom);
      ic.push(["a tracking board shows the initiative's impact, planned and dashed, and a unit entry whose title opens the unit's board", /planned impact/.test(p) && /class="bcard icard planned"/.test(p) && /<h3>Units/.test(p) && p.includes(`/issues/${bu.unit.issue}"`) && p.includes(`href="${bu.unit.board}"`), p.slice(0, 300)]); } }
  { const d = JSON.parse(JSON.stringify(ex)); d.notes = { ...d.notes, sizing: "Verification case: a level-3 change (#61, level 3), shown as L3." };
    const dir = page("38-levels", d), c = node(checkJs, dir, "--root", iScratch);
    ic.push(["check.js fails a board whose text names a work level", c.status === 1 && /shows a work level/.test(c.stdout), lines(c, /^FAIL/) || "no failure"]);
    const r = cp.spawnSync(process.execPath, [checker, path.join(dir, "dashboard.html"), "--out", iScratch], { encoding: "utf8" });
    ic.push(["check-page.js reports a work level the page shows", r.status === 1 && /LEVEL REFERENCE/.test(r.stdout || ""), (r.stdout || "").split(/\r?\n/).filter(l => /work levels|FAIL/.test(l)).join(" | ")]); }
  report(`the Impact tab and the work-level guard on ${t.name}`, ic);

  /* The chain's progress (plan/RULES.md §3): a tracking board's status chip reads the chain, not "building". Rendered from the
     tracking fixture as it stands (unit 1 landed, unit 2 in progress with its run halted, unit 3 up next and blocked by #47), then
     with the run at "plan", with no unit started, and with every unit landed; an issue board keeps its status chip. */
  const cc = [], cScratch = path.join(out, "chain-progress"); fs.mkdirSync(cScratch, { recursive: true });
  const fxC = JSON.parse(fs.readFileSync(sk("verify/fixtures/tracking.plan.json"), "utf8"));
  const text = h => (h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const chipOf = (name, d) => { const f = path.join(cScratch, name + ".html"); fs.writeFileSync(f, withData(tpl, "plan", JSON.stringify(d, null, 2))); const dom = dumpDom(f); if (dom == null) return null;
    const m = /<span class="chip status[^"]*">/.exec(dom); return m ? m[0] + inner(dom, '<span class="chip status[^"]*">', "span") : ""; };
  const variant = f => { const d = JSON.parse(JSON.stringify(fxC)); f(d); return d; };
  const c0 = chipOf("as-is", fxC);
  if (c0 == null) cc.push(["the rendered chain chip (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  else {
    cc.push(["a tracking board's chip reads the chain: landed of all, the unit waiting on the user, the unit up next and its blocker", /^chain 1 of 11 landed · #47 waiting on you · #62 up next, blocked by #47$/.test(text(c0)) && /class="cbar"[^>]*><i style="width:9%"/.test(c0) && !/building/.test(text(c0)), text(c0) || "no chip"]);
    const c1 = chipOf("run-at-plan", variant(d => { d.rows.find(r => r.id === "java-floor").unit.live.step = "plan"; d.rows.find(r => r.id === "java-floor").unit.live.resume = null; }));
    cc.push(["a unit whose run goes on reads its step from its mirror", /#47 in progress \(plan\)/.test(text(c1)), text(c1)]);
    const c2 = chipOf("planned", variant(d => { d.status = "planned"; d.rows.forEach(r => { r.asBuilt = { state: "pending", summary: "" }; delete r.unit.live; }); d.wip.step = "landing"; d.wip.current = []; d.wip.next = d.rows[0].id; }));
    cc.push(["before any unit starts it reads \"planned · M units\"", text(c2) === "chain planned · 11 units", text(c2)]);
    const c3 = chipOf("all-landed", variant(d => { d.status = "built"; d.asBuilt = { ref: "master", sha: "abcdef1", date: "2026-10-23" }; d.rows.forEach(r => { r.asBuilt = { state: "landed", summary: "Landed." }; delete r.unit.live; }); d.wip.step = "landed"; d.wip.current = []; d.wip.next = null; }));
    cc.push(["once every unit has landed it reads \"landed · M of M\"", text(c3) === "chain landed · 11 of 11" && /width:100%/.test(c3), text(c3)]);
    const c4 = chipOf("issue-board", JSON.parse(fs.readFileSync(sk("plan/examples/38-handshake-empty-name/plan.json"), "utf8")));
    cc.push(["an issue board keeps its status chip", /^status built$/.test(text(c4)), text(c4)]);
  }
  report(`the chain's progress on ${t.name}`, cc);
});

targets.filter(t => t.block === "board").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), b = JSON.parse(fs.readFileSync(sk("verify/fixtures/work-board.json"), "utf8"));
  const scratch = path.join(out, "issue-links-work-board"), dir = path.join(scratch, "docs", "plans");
  const setup = html => { fs.rmSync(scratch, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    (b.rows || []).filter(r => r.board).forEach(r => stub(path.join(dir, path.dirname(r.board))));
    fs.writeFileSync(path.join(dir, "board.json"), JSON.stringify(b, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "index.html"), html); node(embedJs, dir); };
  const track = (b.rows || []).find(r => r.board && !r.parent), next = (b.rows || []).find(r => r.status === "next" && (r.blockedBy || []).length);
  const cases = [];
  if (!track || !next) { console.log(`FAILED   issue links on ${t.name}: the work-board fixture needs a tracking row with a board and a blocked next unit`); linkFailures++; return; }
  setup(tpl); let c = node(checkJs, dir, "--root", scratch);
  cases.push(["check.js is silent on the current template", c.status === 0 && !warned(c), lines(c, /^(FAIL|warn)/)]);
  const dom = dumpDom(path.join(dir, "index.html"));
  if (dom != null) {
    const grp = (dom.match(/<tr class="grp">[\s\S]*?<\/tr>/) || [""])[0], kpis = inner(dom, '<div class="kpis" id="kpis">', "div");
    const row = (dom.match(new RegExp(`<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*>#${next.issue}<[\\s\\S]*?</tr>`)) || [""])[0];
    cases.push([`the group heading links #${track.issue}'s number to GitHub and its title to its board, with no GitHub ↗`, grp.includes(`/issues/${track.issue}"`) && grp.includes(`href="${track.board}"`) && !/class="gh"/.test(grp), grp.slice(0, 400)]);
    cases.push([`"part of #${track.issue}" opens its board`, new RegExp(`part of <a href="${track.board.replace(/[.]/g, "\\.")}"`).test(row), row.slice(0, 600)]);
    cases.push([`the "blocked by" tag of #${next.issue} links #${next.blockedBy[0].issue}`, /blocked by <a /.test(row), row.slice(0, 600)]);
    cases.push(["the Up next count links its units", new RegExp(`<a [^>]*>#${next.issue}</a> · not started`).test(kpis), kpis.slice(0, 400)]);
    /* the tracking issue's state cell shows its chain's progress in place of a bare "building" (plan/RULES.md §3) */
    const trow = (dom.match(new RegExp(`<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*>#${track.issue}</a>[\\s\\S]*?</tr>`)) || [""])[0], cell = (trow.match(/<div class="chainsum">[\s\S]*?<\/div>/) || [""])[0];
    cases.push([`#${track.issue}'s state cell reads its chain, not "building"`, /1 of 11 landed/.test(cell) && /#47<\/a> in progress \(implementation\)/.test(cell) && /#62<\/a> up next, blocked by <a /.test(cell) && /class="cbar"/.test(cell) && !/>building</.test(trow), cell.slice(0, 500) || trow.slice(0, 500)]);
  } else cases.push(["the rendered work board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  setup(tpl.replace("const ISSUE_BOARDS=", "const SUB_BOARDS=")); c = node(checkJs, dir, "--root", scratch);
  cases.push([`check.js warns on a template of the sub-issue rule alone and names #${track.issue}'s group heading`, new RegExp(`#${track.issue} has a board .*its group heading`).test(c.stdout), lines(c, /^warn/) || "no warning"]);
  report(`issue links on ${t.name}`, cases);
});

const today = new Date().toISOString().slice(0, 10);
targets.forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), results = [];
  t.fixtures.forEach(fx => {
    const label = fx ? path.basename(fx, ".json").replace(/\.plan$/, "") : "placeholder";
    const dir = path.join(out, path.basename(t.file, ".html") + "-" + label);
    fs.mkdirSync(dir, { recursive: true });
    const page = path.join(dir, t.block === "board" ? "index.html" : t.block ? "dashboard.html" : "index.html");
    fs.writeFileSync(page, fx ? withData(tpl, t.block, fs.readFileSync(fx, "utf8")) : tpl);
    MODES.forEach(m => {
      const r = cp.spawnSync(process.execPath, [checker, page, "--out", dir, ...m], { encoding: "utf8" });
      const lines = (r.stdout || "").split(/\r?\n/);
      results.push({ fixture: label, mode: m.join(" ") || "light", pass: r.status === 0, bad: lines.filter(l => /FAIL|ERROR|NOT VISIBLE|NO LEGEND|MISSING|WRONG|DEAD|TOO MANY|HORIZONTAL|LEVEL REFERENCE/.test(l)) });
    });
  });
  const ok = results.every(r => r.pass);
  console.log(`${ok ? "verified" : "FAILED  "} ${t.name}${root ? " (" + path.relative(path.resolve(root), t.path).split(path.sep).join("/") + ")" : ""}: ${results.filter(r => r.pass).length}/${results.length} passes`);
  results.filter(r => !r.pass).forEach(r => console.log(`  ${r.fixture} · ${r.mode}: ${r.bad.join(" | ")}`));
  if (!ok) { failures++; return; }
  if (t.block && linkFailures) { console.log(`  not recorded: the issue link cases failed`); failures++; return; }
  const { file, key } = recordFile(t.path);
  let rec = {}; try { rec = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { /* first record */ }
  rec.$comment = "Written by verify/verify-templates.js: each template's sha256 (line endings normalised to LF) at its last full verification. check-page.js --auto and check.js --auto trust a template only while its hash matches.";
  rec.templates = rec.templates || {};
  rec.templates[key] = { sha256: sha(tpl), verified: today, fixtures: [...new Set(results.map(r => r.fixture))], modes: MODES.map(m => m.join(" ") || "light") };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rec, null, 2) + "\n");
});
if (devFailures) console.log(`\ndeviation.js failed its cases on ${devFailures} template(s): fix system/scripts/deviation.js`);
console.log(failures ? `\n${failures} template(s) failed: not recorded; fix them and run again` : `\nall templates verified; screenshots in ${out}`);
process.exit(failures || devFailures || linkFailures ? 1 : 0);
