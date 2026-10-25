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
// board shows the run on the WIP strip and in the unit's as-built cell, its mark paused while the run waits on the user. And it
// tests the conventions carried across every dashboard type (GUIDANCE.md §11) on the system templates and the work board: one-line
// ledes, the wide desktop layout, the board links of a system page (BOARDS, data-board, data-issue) and check-page.js's failure
// on a dead one. And it tests the impact's reconciliation state (plan/RULES.md §2, Impact): derived, never stored, the same in lib.js,
// the plan-board template's chip, check.js and board.json, and the per-unit "no change" entry. And a sub-issue's board born at "sized" under a
// signed-off tracking plan, its Gap and Considered filled from the parent's documents (plan/RULES.md §4). And the Verdicts tile and column,
// which count and label only written verdicts (a board with rows and none, a board with mixed, a tracking board), and the footer on
// every dashboard type (GUIDANCE.md §3), with check-page.js failing the old form. And that dashed means only planned or pending on
// every type (the verdict's kind chip, the model chip, the Source legend, the link button: solid), the As built tile's count of built
// rows (dropped and deferred out of both figures), and a work-board entry's recorded "no system" (plan/RULES.md §2, §5). And the decisions
// of 2026-10-25: no dash but planned or pending (lifelines, returns and C4 frames solid; check-page.js's DASHED NOT PLANNED, every C4
// view included), rows left for later out of the As built count, and boardless work-board rows taking their state from the tracker. And the decisions of
// dashboards-skill/17: the step panel beside the WIP strip, research-state rings, the charging arrow, the strip's open research questions, the
// work board's still ring, live updates through the plan.js and board.js sidecars, and the theme switch on every type. And the decisions of
// dashboards-skill/18: no glow cap (the exact cells; the returned questions' rows before the verification), "closed · not planned" on the work
// board, wip.next skipping units left for later, release.unreleased, the plan verification re-pass, the richer event facts (interview options,
// qa severity and route, the remediation's route), the as-built states before the outcome (in progress, partially built) and open points
// (wip.open). A template is recorded only when its
// browser passes and every case group pass.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const { recordFile, sha, norm } = require(path.join(__dirname, "..", "system", "scripts", "deviation.js"));
const SKILL = path.resolve(__dirname, "..");
require(path.join(__dirname, "..", "system", "scripts", "cliargs.js")).strict(process.argv.slice(2), { usage: "usage: node verify/verify-templates.js [--root <repo>] [--out <dir>]", valued: ["root", "out"], max: 0 });
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(opt("out", path.join(os.tmpdir(), "dashboards-verify")));
const checker = path.join(SKILL, "system", "scripts", "check-page.js");
/* light, dark, the narrowest window headless Chrome lays out, a phone-width frame, and a 16:9 desktop (the wide layout) */
const MODES = [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"], ["--width", "1920", "--height", "1080"]];
const sk = p => path.join(SKILL, ...p.split("/"));

/* Each template, the block its data goes in (none for system templates, which carry their own sample content), and its fixtures. */
const PLAN_FIX = [sk("plan/examples/38-handshake-empty-name/plan.json"), sk("verify/fixtures/tracking.plan.json"), sk("verify/fixtures/sub-issue.plan.json"), sk("verify/fixtures/live-issue.plan.json"), null];
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
/* The DOM of a page after its scripts ran (in a window of `size`, "w,h", when given), or null without a browser. */
const dumpDom = (page, hash, size, budget) => { if (!chrome) return null; const r = cp.spawnSync(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", ...(size ? [`--window-size=${size}`] : []),
  "--allow-file-access-from-files", `--virtual-time-budget=${budget || 4000}`, "--dump-dom", "file:///" + path.resolve(page).replace(/\\/g, "/") + (hash ? "#" + hash : "")], { encoding: "utf8", timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
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
      const wip = inner(dom, '<section class="wip[^"]*"[^>]*>', "section"), inProg = (wip.match(/In progress · unit[\s\S]*?<\/div>/) || [""])[0];
      const nx = d.rows.find(r => r.id === d.wip.next);
      cases.push([`the "In progress" line links #${plain.unit.issue}'s number to GitHub and its name to its board, with no GitHub ↗`, inProg.includes(`/issues/${plain.unit.issue}"`) && inProg.includes(`href="${plain.unit.folder}dashboard.html"`) && !/class="gh"/.test(inProg), inProg.slice(0, 400) || "no In progress line"]);
      /* the unit row (plan/RULES.md §1, "Number and title"): "n. #N Title", the number to GitHub, the title to the board (plain
         text while there is none), and no link line under the system */
      const lab = id => inner(dom, `<div class="rowlab"[^>]*id="row-${id}"[^>]*>`, "div"), nm = id => (lab(id).match(/<div class="nm">([\s\S]*?)<\/div>/) || ["", ""])[1];
      const withB = nm(plain.id), noB = nm(nx.id), reEsc = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cases.push([`the unit row reads "${plain.unit.n}. #${plain.unit.issue} ${plain.name}": the number opens GitHub, the title the board`, new RegExp(`^${plain.unit.n}\\. <a href="https://github\\.com/[^"]+/issues/${plain.unit.issue}"[^>]*>#${plain.unit.issue}</a> <a href="${reEsc(plain.unit.folder)}dashboard\\.html"[^>]*>`).test(withB) && !/class="un"/.test(lab(plain.id)), withB.slice(0, 300) || "no unit row"]);
      cases.push([`a unit with no board keeps its title as plain text ("${nx.unit.n}. #${nx.unit.issue} ${nx.name}")`, new RegExp(`^${nx.unit.n}\\. <a href="https://github\\.com/[^"]+/issues/${nx.unit.issue}"[^>]*>#${nx.unit.issue}</a> [^<]`).test(noB), noB.slice(0, 300) || "no unit row"]);
      /* the unit up next stays on the chain chip and the unit row (the step panel of the unit in progress takes its bubble): the chip
         links #${nx} to GitHub (no board) and its "blocked by" to the blocker's board */
      const chip = inner(dom, '<span class="chip status progress[^"]*">', "span");
      cases.push([`the chain chip's "up next" links #${nx.unit.issue} to GitHub (no board) and its "blocked by" opens #${plain.unit.issue}'s board`, chip.includes(`/issues/${nx.unit.issue}"`) && /up next, blocked by/.test(chip) && chip.includes(`href="${plain.unit.folder}dashboard.html"`), chip.slice(0, 500) || "no chain chip"]);
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
      const wip = inner(dom, '<section class="wip[^"]*"[^>]*>', "section"), run = inner(wip, `<div class="wb unit[^"]*" data-row="${plain.id}">`, "div"), wait = inner(wip, '<div class="wb wait">', "div");
      const cell = (dom.match(new RegExp(`<div class="cell built[^"]*"[^>]*data-row="${plain.id}"[\\s\\S]*?<div class="meta">`)) || [""])[0];
      rc.push(["the WIP strip shows the unit's run in its own bubble, halted, and what it waits on in the \"Waiting on you\" bubble", new RegExp(`class="wb unit halted" data-row="${plain.id}"`).test(wip) && /waiting on the user/.test(run) && /Verification stub: the user chooses/.test(wait), (run || wip).slice(0, 400) || "no run bubble"]);
      rc.push(["the unit's as-built cell carries the run line, its mark paused", /class="run"/.test(cell) && /waiting on the user/.test(cell) && / held"/.test(cell.slice(0, 200)), cell.slice(0, 500) || "no cell"]);
      /* an escalated unit run waits on the user too: its mark pauses to the ring alone, as a halt's does (GUIDANCE.md §1; plan/RULES.md
         §3, the glow follows the step), on its as-built cell and on its bubble's current step */
      Object.assign(sub.wip, { step: "escalated", resume: "plan", updated: "2026-10-23T01:20:00Z", waitingOn: null }); writeSub(); node(embedJs, subDir);
      const domE = dumpDom(path.join(folder, "dashboard.html")) || "", wipE = inner(domE, '<section class="wip[^"]*"[^>]*>', "section"), runE = inner(wipE, `<div class="wb unit[^"]*" data-row="${plain.id}">`, "div");
      const cellE = ((domE.match(new RegExp(`<div class="cell built[^"]*"[^>]*data-row="${plain.id}"`)) || [""])[0]);
      rc.push(["an escalated unit run pauses its mark too: the ring alone on its as-built cell and on its current step", / held"/.test(cellE) && !/ glow"/.test(cellE) && /class="cur held"/.test(runE) && !/class="cur glow"/.test(runE), `${cellE} · ${(runE.match(/<li class="cur[^"]*"/) || ["no current step"])[0]}`]);
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
     the example's four sections, with no planning information (no standing pill, no dashed card, no changes list); the tracking
     fixture's initiative impact, planned in the data but drawn as solid cards like any other, and one entry per unit whose title
     opens the unit's board; a board with no impact recorded says so with its source; a board with no version bump
     and nothing downstream says so explicitly; check.js warns when impact.md exists but the tab is empty, and fails a board whose
     text names a work level; check-page.js reports a work level the page shows. */
  const ic = [], iScratch = path.join(out, "impact"), ex = JSON.parse(fs.readFileSync(sk("plan/examples/38-handshake-empty-name/plan.json"), "utf8"));
  const page = (name, data) => { const dir = path.join(iScratch, "docs", "plans", name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const d = { ...data, slug: name, folder: `docs/plans/${name}` }; fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); node(embedJs, dir); return dir; };
  const panel = dom => inner(dom, '<section class="view" role="tabpanel" id="p-impact"[^>]*>', "section");
  { const dir = page("38-handshake-empty-name", ex), dom = dumpDom(path.join(dir, "dashboard.html"), "impact");
    if (dom != null) { const p = panel(dom);
      ic.push(["the example's Impact tab shows its four sections and no planning information", ["Downstream effects", "Adaptation requirements", "API changes", "Conversion steps"].every(h => p.includes(h)) && !/(planned impact|as built(, amended)?)<\/span>/.test(p) && !/icard[^"]*planned/.test(p) && !/Changes from the planned impact/.test(p) && /id="impact-key"[^>]*><span/.test(p), p.slice(0, 300) || "no Impact panel"]);
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
      ic.push(["a tracking board shows the initiative's planned impact as solid cards with no standing pill, and a unit entry whose title opens the unit's board", !/planned impact/.test(p) && !/icard[^"]*planned/.test(p) && /class="bcard icard"/.test(p) && /<h3>Units/.test(p) && p.includes(`/issues/${bu.unit.issue}"`) && p.includes(`href="${bu.unit.board}"`), p.slice(0, 300)]); } }
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

/* The conventions of 2026-10-23, on the plan-board template, rendered through headless Chrome where a page is involved:
   - test levels are not work levels (GUIDANCE.md §4): levelrefs.js passes "L1 gating" … "L5 UAT", "Level 2 — component" and the C4
     levels, and still finds the work-level forms;
   - Impact colours are compatibility first (GUIDANCE.md §1; plan/RULES.md §2): breaking entries red, deprecations and other
     non-breaking changes worth noting yellow, the rest in their system's colour, the badges alike; the tab shows no planning
     information: every card solid whatever the basis, no standing pill, no changes-from-the-plan list, and check-page.js fails a
     copy that draws an Impact card dashed; check.js fails a "compat" that lowers an entry;
   - the As built tab shows how the impact differed from the plan (plan/RULES.md §2, Impact): impact.changes as solid cards in their
     system's colour, never red or yellow, each linking the Impact card it changed (a deep link opens it selected), a tracking
     board's unit changes under the unit's number and title, "None" once reconciled unchanged, nothing while still the plan's;
     while partly reconciled (basis "plan", changes accumulating as the work lands, a tracking board's as each unit lands) the
     changes so far with a line saying how far, "None so far" on a tracking board whose landed units changed nothing;
     check.js fails a change whose "entry" names no Impact entry and does not warn on changes under basis "plan";
   - system colours stay out of the status spectra (GUIDANCE.md §1; system/scripts/palette.js): every template's slots are the
     shared palette's and none is green, yellow, orange, amber, red or pink; check.js and check-page.js fail a copy with an orange
     slot, check-page.js from the CSS and from the computed colours alike;
   - the plan-board ledes are one short line;
   - a tracking board's WIP strip is bubbles (plan/RULES.md §3): the phase, a unit in progress, up next, and "waiting on you" only
     while something is halted;
   - merged branches are not shown (§3, "Branches"): a tracking board whose plan has landed and a landed issue board show no
     branch chip; a tracking board still planning does; a unit's live branch shows;
   - times show in the viewer's local time (GUIDANCE.md §6): every stamp is a <time> with its UTC value as datetime and title,
     checked against the UTC source so the result never depends on the machine's zone; check-page.js fails a raw stamp;
   - the timeline's four columns sit on bands on a desktop window and on none in the narrow layout;
   - every script refuses an unknown option, and --help prints the usage without touching a file. */
targets.filter(t => t.block === "plan").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), nc = [], sc = path.join(out, "conventions"); fs.mkdirSync(sc, { recursive: true });
  const render = (name, d, hash, size) => { const f = path.join(sc, name + ".html"); fs.writeFileSync(f, withData(tpl, "plan", JSON.stringify(d, null, 2))); return dumpDom(f, hash, size); };
  const fx = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x));
  const sub = fx("verify/fixtures/sub-issue.plan.json"), trk = fx("verify/fixtures/tracking.plan.json"), ex = fx("plan/examples/38-handshake-empty-name/plan.json");
  const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

  const { levelRefs } = require(path.join(SKILL, "system", "scripts", "levelrefs.js"));
  const testLabels = ["L1 gating", "L2 component", "L3 integration", "L4a deterministic", "L4b e2e", "L4c non-functional", "L5 UAT", "L3 · integration", "L1 GATING", "L4C NON-FUNCTIONAL", "Level 2 — component", "Level 1 · System Context", "the Level-4c suite", "tests at levels 1 to 4c"];
  const workForms = ["L3", "a level-3 change", "level: 2", "(#61, level 3)", "escalated to level 4", "the work level"];
  nc.push(["levelrefs.js passes every test level's and C4 level's label", testLabels.every(s => !levelRefs(s).length), testLabels.filter(s => levelRefs(s).length).join(", ")]);
  nc.push(["levelrefs.js still finds every work-level form", workForms.every(s => levelRefs(s).length), workForms.filter(s => !levelRefs(s).length).join(", ")]);

  /* check.js on compat: a "compat" that lowers an entry fails; one that raises it passes */
  { const dir = path.join(sc, "docs", "plans", ex.slug); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const d = copy(ex); d.folder = `docs/plans/${ex.slug}`; d.impact.api[0] = { ...d.impact.api[0], change: "removed", compat: "notable" };
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); node(embedJs, dir);
    const c = node(checkJs, dir, "--root", sc);
    nc.push(["check.js fails a \"compat\" that lowers a removed surface", c.status === 1 && /compat "notable" lowers an entry that is breaking/.test(c.stdout), lines(c, /^FAIL/) || "no failure"]);
    d.impact.api[0] = { ...ex.impact.api[0], compat: "breaking" }; fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); node(embedJs, dir);
    const c2 = node(checkJs, dir, "--root", sc);
    nc.push(["check.js takes a \"compat\" that raises an entry, and warns that a breaking entry rides in a major release", c2.status === 0 && /a breaking entry .* rides in a major release/.test(c2.stdout), lines(c2, /^(FAIL|warn)/)]); }
  /* check.js on impact changes: an "entry" that names no Impact entry fails (the As built card would link nothing); one that names
     an entry passes; a unit's change carries no entry */
  { const dir = path.join(sc, "docs", "plans", ex.slug); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const d = copy(ex); d.folder = `docs/plans/${ex.slug}`; d.impact.changes = [{ what: "Verification case: a change from the planned impact.", why: "Verification case.", when: "landing", entry: `api.${ex.impact.api.length + 5}` }];
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); node(embedJs, dir);
    const c = node(checkJs, dir, "--root", sc);
    nc.push(["check.js fails an impact change whose entry names no Impact entry", c.status === 1 && /entry "api\.\d+" names no entry/.test(c.stdout), lines(c, /^FAIL/) || "no failure"]);
    d.impact.changes[0].entry = "api.0"; d.impact.changes[0].system = d.systems[0].slug; fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); node(embedJs, dir);
    const c2 = node(checkJs, dir, "--root", sc);
    nc.push(["check.js takes an impact change that names its entry and system", c2.status === 0, lines(c2, /^FAIL/)]);
    /* partly reconciled (plan/RULES.md §2, Impact): changes accumulate while basis is still "plan", and check.js does not warn */
    d.status = "building"; d.impact.basis = "plan"; fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); node(embedJs, dir);
    const c3 = node(checkJs, dir, "--root", sc);
    nc.push(["check.js takes impact changes while the basis is still the plan's (partly reconciled), with no warning", !/impact\.changes records differences/.test(c3.stdout) && !/^FAIL.*impact/m.test(c3.stdout), lines(c3, /^(FAIL|warn).*impact/) || "no impact warning"]); }

  const dSub = render("sub-impact", sub, "impact");
  if (dSub == null) nc.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  else {
    const p = inner(dSub, '<section class="view" role="tabpanel" id="p-impact"[^>]*>', "section");
    const cards = c => p.match(new RegExp(`<div class="bcard icard[^"]*"[^>]*data-compat="${c}"`, "g")) || [];
    nc.push(["Impact: the breaking entries are red cards (a breaking effect, a required adaptation that breaks, a removed surface, a raised step)", cards("breaking").length === 4 && cards("breaking").every(c => / cmp critical"/.test(c)), cards("breaking").join(" | ") || p.slice(0, 300)]);
    nc.push(["Impact: deprecations and other non-breaking changes worth noting are yellow cards", cards("notable").length === 3 && cards("notable").every(c => / cmp warning"/.test(c)), cards("notable").join(" | ")]);
    nc.push(["Impact: every other entry keeps its system's colour", cards("compatible").length === 3 && cards("compatible").every(c => !/ cmp /.test(c)), cards("compatible").join(" | ")]);
    nc.push(["Impact: the badges take the same colours, with their glyph and word", /class="badge critical"><b aria-hidden="true">!<\/b>breaking/.test(p) && /class="badge critical"><b aria-hidden="true">✕<\/b>removed/.test(p) && /class="badge warning"><b aria-hidden="true">⚠<\/b>deprecated/.test(p) && /class="badge critical"><b aria-hidden="true">!<\/b>required change/.test(p), "badge colours missing"]);
    nc.push(["Impact: a raised card says why in a pill, and the legend reads red and yellow as compatibility", /<span class="vp warning"><i aria-hidden="true">⚠<\/i>worth noting/.test(p) && /red: breaking/.test(p) && /yellow: worth noting/.test(p), text(inner(p, '<div class="key" id="impact-key">', "div")).slice(0, 300)]);
    const dT = render("tracking-impact", trk, "impact"), pT = inner(dT, '<section class="view" role="tabpanel" id="p-impact"[^>]*>', "section");
    nc.push(["Impact: a red or yellow card on a planned impact is solid, like every card", /class="bcard icard cmp critical"/.test(pT) && /class="bcard icard cmp warning"/.test(pT) && !/icard[^"]*planned/.test(pT), (pT.match(/class="bcard icard[^"]*"/g) || ["no card"]).slice(0, 4).join(" | ")]);
    const am = copy(ex); am.impact.changes = [{ what: "Verification case: a change from the planned impact.", why: "Verification case.", when: "landing" }];
    const pA = inner(render("amended-impact", am, "impact"), '<section class="view" role="tabpanel" id="p-impact"[^>]*>', "section");
    nc.push(["Impact: an amended impact shows no standing pill and no list of changes from the plan", !/as built, amended/.test(pA) && !/Changes from the planned impact/.test(pA) && !/Verification case: a change from the planned impact/.test(pA) && /Downstream effects/.test(pA), text(pA).slice(0, 300)]);
    /* the As built tab shows how the impact differed from the plan (plan/RULES.md §2, Impact; GUIDANCE.md §1): impact.changes as
       solid cards in their system's colour (muted where none), never in the Impact tab's red or yellow, each linking the Impact card
       it changed; on a tracking board each unit's own changes under its number and title; "None" once reconciled with no change;
       nothing while the impact is still the plan's and unchanged. A deep link "#impact.<entry>" opens that card, selected. */
    const builtImp = dom => inner(dom, '<div id="built-impact">', "div");
    const bS = builtImp(render("sub-built", sub, "built")), chg = bS.match(/<div class="bcard ichg"[^>]*>/g) || [];
    nc.push(["As built: the impact's changes from the plan are cards, each linking the Impact card it changed", /Impact changes from the plan/.test(bS) && chg.length === sub.impact.changes.length && /href="#impact\.api\.0"/.test(bS) && /href="#impact\.downstream\.2"/.test(bS), `${chg.length} cards · ${text(bS).slice(0, 200)}`]);
    nc.push(["As built: an impact change takes its system's colour (its own, else its entry's; muted for none), solid, never red or yellow", chg[0] && chg[0].includes(`data-sys="${sub.impact.api[0].system}"`) && chg.slice(1).every(c => c.includes('data-sys=""')) && !/\b(cmp|badge|vp) (critical|warning|serious)\b/.test(bS) && !/planned/.test(chg.join(" ")), chg.join(" | ")]);
    const kS = inner(render("sub-built", sub, "built"), '<div class="key" id="built-key">', "div");
    nc.push(["As built: the legend lists the muted bar for an impact change of no single system", /an impact change of no single system/.test(kS), text(kS).slice(0, 300)]);
    const bA = builtImp(render("amended-built", am, "built"));
    nc.push(["As built: an amended impact's change from the plan is listed there", /Verification case: a change from the planned impact/.test(bA), text(bA).slice(0, 200)]);
    const bE = builtImp(render("example-built", ex, "built"));
    nc.push(["As built: an impact reconciled with no change says so", /None: the impact as built is the impact the plan recorded/.test(bE) && !/class="bcard ichg"/.test(bE), text(bE).slice(0, 200)]);
    const pl = copy(ex); pl.status = "building"; pl.impact.basis = "plan"; pl.impact.changes = [];
    const bP = builtImp(render("planned-built", pl, "built"));
    nc.push(["As built: an impact still the plan's and unchanged shows the planned chip, dashed, and no change card", /class="vp neutral dashed"><i aria-hidden="true">…<\/i>planned/.test(bP) && /Nothing reconciled yet/.test(bP) && !/class="bcard ichg"/.test(bP), text(bP).slice(0, 200)]);
    const bu = trk.rows.find(r => r.unit && trk.impact.units.some(e => e.unit === r.id && (e.changes || []).length)), bT = builtImp(render("tracking-built", trk, "built"));
    nc.push(["As built: a tracking board lists each unit's own impact changes under its number and title, linking its unit card", !!bu && /<h4>Units<\/h4>/.test(bT) && bT.includes(`/issues/${bu.unit.issue}"`) && bT.includes(`href="${bu.unit.board}"`) && bT.includes(`href="#impact.unit.${bu.id}"`), text(bT).slice(0, 300)]);
    /* partly reconciled (plan/RULES.md §2, Impact): a tracking board's initiative impact accumulates changes as its units land, basis
       still "plan", and one line says how far it has got; with units landed and no change yet it says "None so far"; an issue
       board's changes recorded during implementation say so too */
    const landedN = trk.rows.filter(r => r.unit && ["landed", "as-planned", "amended", "deviated"].includes((r.asBuilt || {}).state)).length, unitsN = trk.rows.filter(r => r.unit && !["dropped", "deferred"].includes((r.asBuilt || {}).state)).length;
    nc.push(["As built: a tracking board's partly reconciled initiative impact shows its changes so far and how many units have landed", trk.impact.basis === "plan" && trk.impact.changes.length > 0 && /<h4>The initiative<\/h4>/.test(bT) && text(bT).includes(`So far, with ${landedN} of ${unitsN} units landed`) && /href="#impact\.downstream\.1"/.test(bT), text(bT).slice(0, 300)]);
    /* "None so far" only from recorded "no change" entries, never inferred from absence: a landed unit with no entry is named as not
       recorded yet, dashed, with its legend entry */
    const lu = trk.rows.find(r => r.unit && ["landed", "as-planned", "amended", "deviated"].includes((r.asBuilt || {}).state));
    const tn = copy(trk); tn.impact.changes = []; const dTn = render("tracking-unrecorded", tn, "built"), bTn = builtImp(dTn);
    nc.push(["As built: a tracking board whose landed unit recorded nothing does not say \"None so far\"; it names the unit as not recorded yet, dashed", !/None so far/.test(bTn) && /class="empty pend">Not recorded yet: /.test(bTn) && bTn.includes(`/issues/${lu.unit.issue}"`) && /dashed line: a landed unit whose effect on the impact is not recorded yet/.test(inner(dTn, '<div class="key" id="built-key">', "div")), text(bTn).slice(0, 300)]);
    const ts = copy(trk); ts.impact.changes = [{ unit: lu.id, when: `#${lu.unit.issue} landing`, none: true }]; const bTs = builtImp(render("tracking-none-so-far", ts, "built"));
    nc.push(["As built: a tracking board whose landed units recorded \"no change\" says \"None so far\", naming them", /None so far: /.test(bTs) && text(bTs).includes(`recorded no change to the initiative's impact`) && !/Not recorded yet/.test(bTs), text(bTs).slice(0, 300)]);
    const pp = copy(am); pp.status = "building"; pp.impact.basis = "plan"; const bPp = builtImp(render("issue-partly", pp, "built"));
    nc.push(["As built: an issue board's impact changes recorded during implementation are shown, marked as so far", /So far, as implementation recorded them/.test(bPp) && /Verification case: a change from the planned impact/.test(bPp), text(bPp).slice(0, 300)]);
    /* a halted issue board keeps its detail beside the question it waits on (the tracking strip's rule); with no waitingOn the wait
       line falls back to the detail, which is then not drawn twice */
    const strip = dom => inner(dom, '<section class="wip[^"]*" id="wip"[^>]*>', "section");
    const hb = copy(ex); hb.status = "building"; hb.impact.basis = "plan"; Object.assign(hb.wip, { step: "halted", current: [], landing: null, detail: "Verification case: stage C is written; the reply text is open.", waitingOn: "Verification case: which refusal reply text to send.", resume: "implementation" });
    const sH = strip(render("issue-halted", hb, ""));
    nc.push(["WIP: a halted issue board shows its detail beside the question it waits on", /class="wip-wait"[^>]*>Waiting on the user: Verification case: which refusal reply text/.test(sH) && /class="wip-detail"[^>]*>Verification case: stage C is written/.test(sH), text(sH).slice(0, 300)]);
    const hn = copy(hb); hn.wip.waitingOn = null; const sN = strip(render("issue-halted-nowait", hn, ""));
    nc.push(["WIP: a halted issue board with no question stated shows its detail once, as the wait line", /Waiting on the user: Verification case: stage C is written/.test(sN) && !/class="wip-detail"/.test(sN), text(sN).slice(0, 300)]);
    const dDeep = inner(render("sub-deep", sub, "impact.api.0"), '<section class="view" role="tabpanel" id="p-impact"[^>]*>', "section");
    nc.push(["a deep link to an Impact entry opens the Impact tab with that card selected", /class="bcard icard[^"]*\bsel\b[^"]*"[^>]*data-imp="api\.0"/.test(dDeep), (dDeep.match(/class="bcard icard[^"]*"[^>]*data-imp="api\.0"/) || ["no card"])[0]]);

    /* check-page.js fails an Impact tab that shows planning: a copy of the tracking board whose Impact cards are drawn dashed */
    const fd = path.join(sc, "impact-dashed.html"); fs.writeFileSync(fd, withData(tpl, "plan", JSON.stringify(trk, null, 2)).replace("</style>", ".icard{border-style:dashed}</style>"));
    const rd = cp.spawnSync(process.execPath, [checker, fd, "--out", sc], { encoding: "utf8" });
    nc.push(["check-page.js fails an Impact tab that draws a card dashed", rd.status === 1 && /IMPACT SHOWS PLANNING/.test(rd.stdout || ""), (rd.stdout || "").split(/\r?\n/).filter(l => /impact|FAIL/.test(l)).join(" | ")]);

    /* the ledes */
    const lede = (dom, id) => text((dom.match(new RegExp(`<p class="lede" id="${id}">([\\s\\S]*?)</p>`)) || ["", ""])[1]);
    const dTl = render("tracking-timeline", trk), dEx = render("example-timeline", ex);
    nc.push(["the Timeline lede is one short line on both kinds of board", lede(dTl, "timeline-lede").length > 0 && lede(dTl, "timeline-lede").length <= 120 && lede(dEx, "timeline-lede").length <= 120, `${lede(dTl, "timeline-lede").length} / ${lede(dEx, "timeline-lede").length} characters`]);
    const ledes = (dEx.match(/<p class="lede"[^>]*>[\s\S]*?<\/p>/g) || []).map(text).filter(Boolean);
    nc.push(["every tab's lede is at most one short line", ledes.every(l => l.length <= 130), ledes.filter(l => l.length > 130).join(" | ")]);

    /* the bubbles and the branches */
    const wip = inner(dTl, '<section class="wip[^"]*"[^>]*>', "section"), chips = inner(dTl, '<div class="chips" id="chips">', "div");
    nc.push(["a tracking board's WIP strip is bubbles: the phase, the unit in progress, that unit's step panel in place of up next, and waiting on you while halted", /class="wb phase"/.test(wip) && /class="wb unit halted"/.test(wip) && /class="sp sp-held" data-step="landing"/.test(wip) && !/class="wb next upnext"/.test(wip) && /class="wb wait"/.test(wip) && /UP NEXT/.test(wip), wip.slice(0, 300)]);
    const nm = copy(trk); nm.rows.forEach(r => { if (r.unit) delete r.unit.live; });
    const wipNm = inner(render("tracking-no-mirror", nm), '<section class="wip[^"]*"[^>]*>', "section");
    nc.push(["with no unit's run mirrored, the up-next bubble stays, with its blocker", /class="wb next upnext"/.test(wipNm) && /blocked by/.test(inner(wipNm, '<div class="wb next upnext"[^>]*>', "div")) && !/class="sp[ "]/.test(wipNm), wipNm.slice(0, 300)]);
    const run = copy(trk), jf = run.rows.find(r => r.unit && r.unit.live); Object.assign(jf.unit.live, { step: "landing", resume: null, waitingOn: null });
    const wipRun = inner(render("tracking-running", run), '<section class="wip[^"]*"[^>]*>', "section");
    nc.push(["no \"waiting on you\" bubble while nothing is halted", !/class="wb wait"/.test(wipRun) && /class="wb unit"/.test(wipRun), wipRun.slice(0, 300)]);
    nc.push(["a tracking board whose plan has landed shows no branch chip; its unit's live branch still shows", !/>branch <b>/.test(chips) && wip.includes(jf.unit.live.branch), text(chips).slice(0, 300)]);
    const early = copy(trk); Object.assign(early, { status: "planned" }); early.wip = { ...early.wip, step: "architecture", current: ["considered"], next: null }; early.rows.forEach(r => { r.asBuilt = { state: "pending", summary: "" }; delete r.unit.live; });
    const chipsEarly = inner(render("tracking-planning", early), '<div class="chips" id="chips">', "div");
    nc.push(["a tracking board still planning shows its branch", chipsEarly.includes(`branch <b>${early.branch}</b>`), text(chipsEarly).slice(0, 300)]);
    const exB = copy(ex); exB.branch = exB.branch || "fix/issue-38-verification";
    const chipsEx = inner(render("example-branch", exB), '<div class="chips" id="chips">', "div");
    nc.push(["a landed issue board shows no branch chip", !/>branch <b>/.test(chipsEx), text(chipsEx).slice(0, 300)]);

    /* local times, checked against the UTC source */
    const stamp = trk.wip.updated, tm = new RegExp(`<time datetime="${stamp}" title="${stamp} \\(UTC\\)">([^<]+)</time>`).exec(wip);
    nc.push(["a stamp is shown as a <time> in local time, its UTC value as datetime and title", !!tm && !/\d{4}-\d{2}-\d{2}T/.test(tm[1]), tm ? tm[0] : "no <time> for wip.updated"]);
    const rawD = copy(trk); rawD.wip.detail = `Verification case: written at ${stamp}.`;
    const fr = path.join(sc, "raw-stamp.html"); fs.writeFileSync(fr, withData(tpl, "plan", JSON.stringify(rawD, null, 2)));
    const cr = cp.spawnSync(process.execPath, [checker, fr, "--out", sc], { encoding: "utf8" });
    nc.push(["check-page.js fails a stamp left raw in the text", cr.status === 1 && /RAW UTC STAMP shown as text/.test(cr.stdout || ""), (cr.stdout || "").split(/\r?\n/).filter(l => /times|FAIL/.test(l)).join(" | ")]);

    /* the column bands */
    const wide = render("example-wide", ex, "", "1920,1080"), narrow = render("example-narrow", ex, "", "520,900");
    const bands = dom => (dom.match(/<div class="band"/g) || []).length;
    nc.push(["the timeline's four columns sit on bands on a desktop window, and on none in the narrow layout", bands(wide) === 4 && bands(narrow) === 0, `${bands(wide)} wide, ${bands(narrow)} narrow`]);

    /* Landing Order (the tab once called Chain): its label, the old #chain link, the graph across the full width, and the inspector
       under it as bubbles once a unit is selected (a click injected into a scratch copy) */
    const pick = `<script>window.addEventListener("load",()=>setTimeout(()=>{const g=document.querySelector(".chainsvg .unit[data-row=\\"${jf.id}\\"]");if(g)g.dispatchEvent(new MouseEvent("click",{bubbles:true}));},600));</script>`;
    const fo = path.join(sc, "landing-order.html"); fs.writeFileSync(fo, withData(tpl, "plan", JSON.stringify(trk, null, 2)).replace("</body>", pick + "</body>"));
    const dO = dumpDom(fo, "chain", "1920,1080"), tabLabel = (dO.match(/<button class="tab"[^>]*id="t-landing-order"[^>]*>([^<]*)</) || ["", ""])[1];
    const svgW = +((dO.match(/<svg class="chainsvg" width="(\d+(?:\.\d+)?)"/) || [])[1] || 0), insp = inner(dO, '<aside class="inspector"[^>]*>', "aside");
    nc.push(["the tab reads \"Landing Order\", and a link to #chain still opens it", tabLabel === "Landing Order" && /<section class="view" role="tabpanel" id="p-landing-order"[^>]*>/.test(dO) && !/id="p-landing-order"[^>]*hidden/.test(dO), `label "${tabLabel}"`]);
    nc.push(["on a 1920 window the graph spans the content width and the inspector sits under it", svgW > 1500 && /<div class="stage below">/.test(dO), `svg ${svgW}px, stage ${(dO.match(/<div class="stage[^"]*">/) || ["?"])[0]}`]);
    nc.push(["a selected unit's inspector is bubbles in the inspector's order: what was selected, then each section", /<div class="ibubbles"><div class="ib ib-head">/.test(insp) && (insp.match(/<div class="ib">/g) || []).length >= 2 && /Its run now/.test(insp), insp.slice(0, 300)]);
  }

  /* the palette (GUIDANCE.md §1; system/scripts/palette.js): every template's system colours are the shared palette's and none is in a
     status spectrum; a copy of the plan template with an orange slot fails check.js and check-page.js (its CSS, and the colour the
     browser computes) */
  { const P = require(path.join(SKILL, "system", "scripts", "palette.js"));
    const res = SETS.map(x => [x.name, P.paletteCheck(fs.readFileSync(sk(x.name), "utf8"))]);
    nc.push(["every template's system colours are the shared palette's, none in a status spectrum", res.every(([, r]) => r.tokens >= 6 && !r.problems.length && !r.warnings.length), res.filter(([, r]) => r.tokens < 6 || r.problems.length || r.warnings.length).map(([n, r]) => `${n}: ${r.tokens} tokens; ${[...r.problems, ...r.warnings].slice(0, 2).join("; ")}`).join(" | ")]);
    const allPal = [...P.PALETTE.light, ...P.PALETTE.dark];
    nc.push(["no slot of the shared palette is in a status spectrum, and every one is distinct", allPal.every(c => !P.inStatusHue(c)) && new Set(P.PALETTE.light).size === P.PALETTE.light.length && new Set(P.PALETTE.dark).size === P.PALETTE.dark.length, allPal.filter(c => P.inStatusHue(c)).join(", ")]);
    nc.push(["palette.js finds the status hues: orange, amber, green, red, pink", ["#eb6834", "#eda100", "#1baf7a", "#d03b3b", "#e87ba4"].every(c => P.inStatusHue(c)) && !P.inStatusHue("#7d879a"), ["#eb6834", "#eda100", "#1baf7a", "#d03b3b", "#e87ba4"].filter(c => !P.inStatusHue(c)).join(", ")]);
    const orange = tpl.replace("--sys-2:#653184;", "--sys-2:#eb6834;");
    const dir = path.join(sc, "docs", "plans", "38-orange-slot"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify({ ...ex, slug: "38-orange-slot", folder: "docs/plans/38-orange-slot" }, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), orange); node(embedJs, dir);
    const c = node(checkJs, dir, "--root", sc);
    nc.push(["check.js fails a page whose system slot is orange", orange !== tpl && c.status === 1 && /palette: --sys-2: #eb6834 is in a status spectrum/.test(c.stdout), lines(c, /palette/) || "no failure"]);
    const r = cp.spawnSync(process.execPath, [checker, path.join(dir, "dashboard.html"), "--out", sc], { encoding: "utf8" });
    nc.push(["check-page.js fails it, from the CSS and from the computed colour", r.status === 1 && /CHECK palette: PALETTE IN STATUS HUE --sys-2/.test(r.stdout || "") && /palette \(computed\).*PALETTE IN STATUS HUE --sys-2/.test(r.stdout || ""), (r.stdout || "").split(/\r?\n/).filter(l => /palette/.test(l)).join(" | ")]); }

  /* strict options: an unknown one fails before any file is touched; --help prints the usage */
  { const repo = path.join(sc, "cli"), bj = path.join(repo, "docs", "plans", "board.json"); fs.rmSync(repo, { recursive: true, force: true }); fs.mkdirSync(path.dirname(bj), { recursive: true });
    const sentinel = '{"sentinel":true}\n'; fs.writeFileSync(bj, sentinel);
    const run = (js, ...a) => cp.spawnSync(process.execPath, [path.join(SKILL, ...js.split("/")), ...a], { encoding: "utf8", cwd: repo });
    const h = run("plan/scripts/board.js", "--root", repo, "--help"), u = run("plan/scripts/board.js", "--root", repo, "--hepl");
    nc.push(["board.js --help prints the usage and leaves board.json alone", h.status === 0 && /usage: node board\.js/.test(h.stdout) && fs.readFileSync(bj, "utf8") === sentinel, `exit ${h.status}`]);
    nc.push(["board.js refuses an unknown option, exit 2, board.json untouched", u.status === 2 && /unknown option --hepl/.test(u.stderr) && fs.readFileSync(bj, "utf8") === sentinel, `exit ${u.status}: ${(u.stderr || "").split(/\r?\n/)[0]}`]);
    const others = [["plan/scripts/check.js", "x", "--bogus"], ["plan/scripts/embed.js", "x", "--bogus"], ["plan/scripts/new.js", "1", "x", "--bogus"], ["system/scripts/check-page.js", "x.html", "--bogus"], ["system/scripts/embed.js", "a", "b", "--bogus"], ["verify/verify-templates.js", "--bogus"]];
    const bad = others.filter(([js, ...a]) => { const r = run(js, ...a); return r.status !== 2 || !/unknown option --bogus/.test(r.stderr); });
    nc.push(["every other script refuses an unknown option with its usage, exit 2", !bad.length, bad.map(b => b[0]).join(", ")]);
    const helps = ["plan/scripts/check.js", "plan/scripts/embed.js", "plan/scripts/new.js", "system/scripts/check-page.js", "system/scripts/embed.js"].filter(js => { const r = run(js, "-h"); return r.status !== 0 || !/usage:/.test(r.stdout); });
    nc.push(["every script prints its usage for -h and exits 0", !helps.length, helps.join(", ")]); }
  report(`this run's conventions on ${t.name}`, nc);
});

/* A sub-issue of a signed-off tracking plan at "sized" (plan/RULES.md §2, columns 1-2; §4, sized): its board is born with the Gap
   and Considered columns filled from the parent's documents, with the gap and considered milestones, and no Verdict yet. In a
   scratch tree holding the tracking fixture (signed off: it has unit rows) and the unit's folder inside it: check.js passes such a
   board with no milestone warning and says so; it warns on one born empty; new.js --parent prints what to fill; the page renders
   the filled columns (the options in Considered) with no verdict and passes a light browser pass. */
targets.filter(t => t.block === "plan").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), zc = [], scratch = path.join(out, "sized-sub-issue"); fs.rmSync(scratch, { recursive: true, force: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x));
  const trk = J("verify/fixtures/tracking.plan.json"), ex = J("plan/examples/38-handshake-empty-name/plan.json");
  const tdir = path.join(scratch, ...trk.folder.split("/")); fs.mkdirSync(tdir, { recursive: true });
  fs.writeFileSync(path.join(tdir, "plan.json"), JSON.stringify(trk, null, 2) + "\n"); fs.writeFileSync(path.join(tdir, "dashboard.html"), tpl);
  const u = trk.rows.find(r => r.unit && r.unit.issue && ((r.asBuilt || {}).state || "pending") === "pending"), name = `${u.unit.issue}-verification-unit`, sdir = path.join(tdir, name);
  const born = (rows, milestones) => ({ schema: "plan-board/1", repo: trk.repo, issue: u.unit.issue, slug: name, folder: `${trk.folder}/${name}`, kind: "issue", level: 3,
    title: u.name, function: "Verification case: a unit's board at sized, its research and architecture done in the parent's run.", status: "planned",
    parent: { issue: trk.issue, board: null }, branch: null, baseline: trk.baseline, asBuilt: null, systems: (trk.systems || []).filter(s => s.slug === u.system),
    wip: { step: "plan", since: "2026-10-25T07:00:00Z", updated: "2026-10-25T07:00:00Z", detail: "Verification case: the planner writes `plan.md` now.", steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"],
      current: ["considered", "verdict"], next: null, qa: [], qaMax: 3, waitingOn: null, resume: null, blockers: { waitsOn: [], blocks: [] }, landing: null },
    milestones, trail: [], rows, impact: null, roadmap: null, followUps: [], documents: [], notes: {} });
  const filledRows = ex.rows.slice(0, 2).map(r => ({ id: r.id, name: r.name, group: r.group, system: u.system, where: r.where, gap: { ...r.gap, link: null, source: null },
    options: r.options.map(o => ({ ...o, link: null, source: null })), verdict: {}, asBuilt: { state: "pending", summary: "" } }));
  const ms = [{ column: "gap", label: "gap · from #" + trk.issue + "'s research", date: "2026-10-25" }, { column: "considered", label: "considered · from #" + trk.issue + "'s architecture", date: "2026-10-25" }];
  const write = d => { fs.rmSync(sdir, { recursive: true, force: true }); fs.mkdirSync(sdir, { recursive: true }); fs.writeFileSync(path.join(sdir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(sdir, "dashboard.html"), tpl); node(embedJs, sdir); return node(checkJs, sdir, "--root", scratch); };
  const c1 = write(born(filledRows, ms));
  zc.push(["check.js passes a sub-issue board born at sized with Gap and Considered filled, no Verdict, and no milestone warning", c1.status === 0 && /Gap and Considered filled from the parent's documents/.test(c1.stdout) && !/no "(gap|considered|verdict)" milestone/.test(c1.stdout) && !/signed off: its Gap and Considered/.test(c1.stdout), lines(c1, /^(FAIL|warn).*(milestone|options|signed off)/) || "clean"]);
  const dom = dumpDom(path.join(sdir, "dashboard.html"));
  if (dom != null) { const id = filledRows[0].id, cell = col => inner(dom, `<div class="cell ${col}[^"]*"[^>]*data-row="${id}"[^>]*>`, "div");
    const g = cell("gap"), c = cell("considered"), v = cell("verdict");
    zc.push(["the page renders the filled Gap and Considered columns with no verdict", !!g && !/Not yet written/.test(g) && (c.match(/<li>/g) || []).length === filledRows[0].options.length && /Not yet written/.test(v), `gap ${g ? "drawn" : "missing"} · ${(c.match(/<li>/g) || []).length} options · verdict ${/Not yet written/.test(v) ? "empty" : "written or missing"}`]);
    const r = cp.spawnSync(process.execPath, [checker, path.join(sdir, "dashboard.html"), "--out", scratch], { encoding: "utf8" });
    zc.push(["it passes a light browser pass", r.status === 0, (r.stdout || "").split(/\r?\n/).filter(l => /FAIL|ERROR|MISSING|NO LEGEND/.test(l)).join(" | ")]);
  } else zc.push(["the rendered sub-issue board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  const c2 = write(born([], []));
  zc.push(["check.js warns on a sub-issue board of a signed-off plan born with empty columns", /sub-issue of #\d+, whose tracking plan is signed off: its Gap and Considered columns/.test(c2.stdout) && /no rows/.test(c2.stdout), lines(c2, /signed off/) || "no warning"]);
  fs.rmSync(sdir, { recursive: true, force: true });
  const n = cp.spawnSync(process.execPath, [path.join(SKILL, "plan", "scripts", "new.js"), String(u.unit.issue), "verification-unit", "--root", scratch, "--parent", trk.folder.split("/").slice(2).join("/"), "--level", "3", "--repo", trk.repo], { encoding: "utf8", cwd: scratch });
  zc.push(["new.js --parent under a signed-off tracking plan says to fill Gap and Considered from the parent's documents", n.status === 0 && /is a signed-off tracking plan: fill the Gap and Considered columns now/.test(n.stdout), (n.stdout || n.stderr || "").split(/\r?\n/).slice(0, 3).join(" | ")]);
  report(`a sub-issue born at sized under a signed-off tracking plan, on ${t.name}`, zc);
});

/* The glow follows the step (plan/RULES.md §3, the step-to-column map; lib.js GLOW_MAP). check.js keeps quiet on a board whose
   wip.current is its step's row of the map and warns, naming the step's columns, on one that is not: an issue board at every step,
   a halted and an escalated board judged by wip.resume, a landed board not at all, and a tracking board in implementation (its
   units in progress, or nothing between units). new.js lays the foundation's wip.current from the map. The rendered page holds an
   escalated board's glow still, the ring alone, as a halted one's, and lets a running one breathe. */
targets.filter(t => t.block === "plan").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), gc = [], scratch = path.join(out, "glow-map"); fs.rmSync(scratch, { recursive: true, force: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x));
  const ex = J("plan/examples/38-handshake-empty-name/plan.json"), trk = J("verify/fixtures/tracking.plan.json");
  const GW = /^warn {2}wip\.current .* does not match wip\.step/m, gwLine = r => lines(r, /does not match wip\.step|keeps the step-to-column map/) || "no glow line";
  const put = (d, dir) => { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); node(embedJs, dir); return node(checkJs, dir, "--root", scratch); };
  const edir = path.join(scratch, "docs", "plans", ex.slug);
  const at = (step, current, resume) => { const d = copy(ex); d.folder = `docs/plans/${ex.slug}`; d.status = "building"; Object.assign(d.wip, { step, current, resume: resume || null, landing: null, waitingOn: step === "halted" ? "Verification case: a question for the user." : null }); return d; };
  const [r0, r1, r2] = ex.rows.map(r => r.id), C = id => id + ".considered";
  /* research: the rows being researched (wip.questions; lib.js researchGlow()), with the fallback to the whole Considered column */
  const Q = (question, rows, findings, state) => ({ question, rows, findings: findings || null, ...(state ? { state } : {}) });
  const rq = (cur, questions, o) => { o = o || {}; const d = at(o.step || "research", cur, o.resume); d.wip.questions = questions;
    d.trail = [...(d.trail || []), ...questions.filter(q => q.findings && !o.noTrail).map(q => ({ date: "2026-10-25", column: "gap", label: `Verification case: research returned, ${q.question}`, ref: q.findings }))]; return d; };
  [ // [what, board, warns? (true: the glow warning; a word: another warning, the glow quiet), what the warning must name]
    ["research with open questions glows their rows' Considered cells: quiet", rq([C(r0), C(r1)], [Q("q-one", [r0, r1]), Q("q-two", [r1])]), false],
    ["research with open questions glowing the whole column: warns", rq(["considered"], [Q("q-one", [r0, r1])]), true, /Considered cells of the rows the questions being researched or verified name/],
    ["research glowing a row no open question names: warns, naming it", rq([C(r0), C(r2)], [Q("q-one", [r0])]), true, /\.considered \(no question being researched or verified names its row\)/],
    ["a returned question's rows stop glowing, a row another open question names keeps glowing: quiet", rq([C(r1), C(r2)], [Q("q-one", [r0, r1], "research/q-one.md"), Q("q-two", [r1, r2])]), false],
    ["a returned question's row left glowing: warns", rq([C(r0), C(r1), C(r2)], [Q("q-one", [r0, r1], "research/q-one.md"), Q("q-two", [r1, r2])]), true, /no question being researched or verified names its row/],
    ["the verification (verification-started: every question verifying) glows every question's rows again: quiet", rq([C(r0), C(r1), C(r2)], [Q("q-one", [r0, r1], "research/q-one.md", "verifying"), Q("q-two", [r2], "research/q-two.md", "verifying")]), false],
    ["every question returned, the verification not started: the returned questions' rows glow: quiet", rq([C(r0), C(r1), C(r2)], [Q("q-one", [r0, r1], "research/q-one.md", "returned"), Q("q-two", [r2], "research/q-two.md", "returned")]), false],
    ["every question returned, the whole Considered column glowing instead: warns", rq(["considered"], [Q("q-one", [r0, r1], "research/q-one.md", "returned"), Q("q-two", [r2], "research/q-two.md", "returned")]), true, /Considered cells of the rows the returned questions awaiting verification name/],
    ["a question naming no row falls back to the whole Considered column: quiet", rq(["considered"], [Q("q-one", [r0]), Q("q-none", [])]), false],
    ["seven cells glow exactly, with no count limit and no fallback: quiet", rq(ex.rows.slice(0, 7).map(r => C(r.id)), [Q("q-wide", ex.rows.slice(0, 7).map(r => r.id), null, "researching")]), false],
    ["seven cells collapsed to the whole Considered column: warns", rq(["considered"], [Q("q-wide", ex.rows.slice(0, 7).map(r => r.id), null, "researching")]), true, /Considered cells of the rows the questions being researched or verified name/],
    ["a halt during research keeps the research glow: quiet", rq([C(r0)], [Q("q-one", [r0])], { step: "halted", resume: "research" }), false],
    ["a returned question whose findings the trail does not record: warns", rq([C(r1)], [Q("q-one", [r0], "research/q-one.md"), Q("q-two", [r1])], { noTrail: true }), "trail", /the trail records no entry with that ref/],
    ["questions not complete once the run is past research: warns", rq(["considered", "verdict"], [Q("q-one", [r0], "research/q-one.md")], { step: "plan" }), "past", /researched sets every question complete/],
    ["complete questions kept at the plan step (the green ring until plan-accepted): no question warning", rq(["considered", "verdict"], [Q("q-one", [r0], "research/q-one.md", "complete")], { step: "plan" }), "kept", /^(?![\s\S]*wip\.questions (records|at "plan"))/],
    ["questions left once the plan is accepted: warns", rq([], [Q("q-one", [r0], "research/q-one.md", "complete")], { step: "branch" }), "accepted", /plan-accepted clears them/],
    ["a question naming an id that is not a row: warns", rq([C(r0)], [Q("q-one", [r0, "no-such-row"])]), "row", /names "no-such-row", which is not a row of this board/]
  ].forEach(([what, d, warns, names]) => {
    const c = put(d, edir), w = GW.test(c.stdout);
    gc.push([what, warns === true ? w && names.test(c.stdout) : warns ? !w && names.test(c.stdout) : !w && /keeps the step-to-column map/.test(c.stdout), lines(c, /does not match wip\.step|keeps the step-to-column map|wip\.questions/) || "no glow line"]);
  });
  { const c = put(rq([C(r0)], [Q("q-one", [r0]), Q("q-one", "r0")]), edir);
    gc.push(["check.js fails a malformed wip.questions (a question twice, rows not an array)", c.status === 1 && /a second entry for question "q-one"/.test(c.stdout) && /rows must be an array of row ids/.test(c.stdout), lines(c, /^FAIL/) || "no failure"]); }
  { const c = put(rq([C(r0)], [Q("q-one", [r0], null, "researched"), Q("q-two", [r1], null, "verifying"), Q("q-three", [r2], "research/q-three.md", "researching")]), edir);
    gc.push(["check.js fails a question state that is not one of the five, a verifying question with no findings, a researching one with findings", c.status === 1 && /\.state must be one of planning, researching, returned, verifying, complete/.test(c.stdout) && /"q-two"\) is "verifying" but records no findings/.test(c.stdout) && /"q-three"\) is "researching" but records findings/.test(c.stdout), lines(c, /^FAIL/) || "no failure"]); }
  { const c = put(rq([C(r0)], [Q("q-one", [r0])]), edir);
    gc.push(["check.js warns on a question that records no state (written before the states), naming what it reads as", /\("q-one"\) records no state: it reads "researching"/.test(c.stdout), lines(c, /records no state/) || "no warning"]); }
  [ // [step, wip.current, wip.resume, warns?, what the warning must name]
    ["sizing", [], null, false], ["sizing", ["gap"], null, true, /map glows nothing/],
    ["interview", [], null, false], ["interview", [`${r0}.gap`], null, false], ["interview", ["verdict"], null, true, /the cell the question concerns/],
    ["research", ["considered"], null, false], ["research", ["gap"], null, true, /whole Considered column, as \["considered"\] \(the fallback: no research question is recorded yet\)/],
    ["architecture", ["considered"], null, false],
    ["plan", ["considered", "verdict"], null, false], ["plan", ["verdict"], null, true, /considered missing/],
    ["branch", [], null, false], ["branch", ["verdict"], null, true, /map glows nothing/],
    ["implementation", [`${r0}.built`, `${r1}.built`], null, false], ["implementation", [`${r0}.verdict`], null, true, /As built cells of the rows the stage touches/], ["implementation", [], null, true, /no As built cell named/],
    ["qa", ["built"], null, false], ["qa", [`${r1}.built`], null, true, /As built \("built"\) column/],
    ["remediation", [`${r1}.built`], null, false], ["remediation", ["built"], null, true, /qa findings touch/],
    ["landing", [], null, false], ["landing", ["built"], null, true, /map glows nothing/],
    ["halted", ["considered", "verdict"], "plan", false], ["halted", ["built"], "plan", true, /stopped in "plan", wip\.resume/],
    ["escalated", [`${r0}.built`], "implementation", false], ["escalated", ["considered"], "implementation", true, /stopped in "implementation"/]
  ].forEach(([step, cur, resume, warns, names]) => {
    const c = put(at(step, cur, resume), edir), w = GW.test(c.stdout);
    gc.push([`${step}${resume ? ` (resume ${resume})` : ""} with ${JSON.stringify(cur)}: check.js ${warns ? "warns" : "keeps quiet"}`, warns ? w && names.test(c.stdout) : !w && /keeps the step-to-column map/.test(c.stdout), gwLine(c)]);
  });
  { const c = put(copy(ex), edir); gc.push(["a landed board: no glow warning (its glow is off)", !GW.test(c.stdout), gwLine(c)]); }
  /* the rendered page: an escalated board holds its glow still, as a halted one does; a running one breathes */
  const cellCls = dom => ((dom || "").match(new RegExp(`<div class="cell built[^"]*"[^>]*data-row="${r0}"`)) || [""])[0];
  const stepCls = dom => ((inner(dom || "", '<section class="wip[^"]*"[^>]*>', "section").match(/<li class="cur[^"]*"/)) || [""])[0];
  if (chrome) {
    put(at("escalated", [`${r0}.built`], "implementation"), edir); const dE = dumpDom(path.join(edir, "dashboard.html"));
    gc.push(["an escalated board's glow is the ring alone, on its cell and its current step", / held"/.test(cellCls(dE)) && !/ glow"/.test(cellCls(dE)) && /cur held"/.test(stepCls(dE)), `${cellCls(dE)} · ${stepCls(dE)}`]);
    put(at("implementation", [`${r0}.built`]), edir); const dI = dumpDom(path.join(edir, "dashboard.html"));
    gc.push(["a running board's glow breathes, on its cell and its current step", / glow"/.test(cellCls(dI)) && /cur glow"/.test(stepCls(dI)), `${cellCls(dI)} · ${stepCls(dI)}`]);
  } else gc.push(["the rendered glow (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  /* a tracking board: its units in progress, or nothing between units; never a unit's other cell */
  const tdir = path.join(scratch, ...trk.folder.split("/")), unitCur = (trk.wip.current || [])[0];
  { const c = put(copy(trk), tdir); gc.push([`a tracking board in implementation with its unit in progress (${JSON.stringify(trk.wip.current)}): check.js keeps quiet`, !GW.test(c.stdout) && /keeps the step-to-column map/.test(c.stdout), gwLine(c)]); }
  { const d = copy(trk); d.wip.current = []; const c = put(d, tdir); gc.push(["a tracking board in implementation between units (nothing in progress): check.js keeps quiet", !GW.test(c.stdout), gwLine(c)]); }
  { const d = copy(trk); d.wip.current = [String(unitCur).split(".")[0] + ".verdict"]; const c = put(d, tdir); gc.push(["a tracking board glowing a unit's Verdict in implementation: check.js warns, naming the units in progress", GW.test(c.stdout) && /As built cells of the units in progress/.test(c.stdout), gwLine(c)]); }
  /* new.js: the foundation's wip.current is its step's columns */
  const nroot = path.join(scratch, "new"); fs.mkdirSync(path.join(nroot, "docs", "plans"), { recursive: true });
  const born = [["research", ["considered"]], ["plan", ["considered", "verdict"]], ["interview", []]].map(([step, want], i) => {
    const r = cp.spawnSync(process.execPath, [path.join(SKILL, "plan", "scripts", "new.js"), String(900 + i), `glow-${step}`, "--root", nroot, "--step", step, "--level", "3", "--repo", "owner/name"], { encoding: "utf8", cwd: nroot });
    let got = null; try { const pw = JSON.parse(fs.readFileSync(path.join(nroot, "docs", "plans", `${900 + i}-glow-${step}`, "plan.json"), "utf8")).wip; got = Array.isArray(pw.questions) && !pw.questions.length ? pw.current : "no empty wip.questions"; } catch (e) { /* reported below */ }
    return [step, want, got, r.status];
  });
  gc.push(["new.js lays wip.current from the map (research considered, plan considered and verdict, interview nothing) and wip.questions empty", born.every(([, want, got, s]) => s === 0 && JSON.stringify(got) === JSON.stringify(want)), born.map(([st, w, g, s]) => `${st}: ${JSON.stringify(g)} (want ${JSON.stringify(w)}, exit ${s})`).join("; ")]);
  report(`the glow follows the step on ${t.name}`, gc);
});

/* The impact's reconciliation state (plan/RULES.md §2, Impact; §5; §8), derived and never stored, in each runtime that derives or
   shows it:
   - lib.js reconciliation(), the scripts' one derivation: planned, partial and as-built on an issue board and a tracking board (a
     unit landed with nothing recorded is partial too), null while no impact is recorded;
   - the plan-board template (reconciliationOf()): the chip on the As built tab in all three states, on an issue board and a tracking
     board, with its legend entry: planned dashed and neutral, partly reconciled yellow (n of M units on a tracking board), as built
     green; nothing on the Impact tab;
   - check.js prints the derived state; warns on a landed unit with no impact.changes entry, and not once it records "no change";
     names a change whose "when" names the unit but carries no "unit"; warns on an as-built impact with a landed unit unrecorded;
     fails a "no change" entry on an issue board;
   - board.js writes each row's "reconciliation" into board.json (planned, partial with n of M on the tracking issue, as-built, null
     for a row with no board of its own), check.js takes it, and the work board shows it in the State cell with its legend. */
targets.filter(t => t.block === "plan").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), rc = [], sc = path.join(out, "reconciliation"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const { reconciliation } = require(path.join(SKILL, "plan", "scripts", "lib.js"));
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x));
  const trk = J("verify/fixtures/tracking.plan.json"), ex = J("plan/examples/38-handshake-empty-name/plan.json");
  const LANDED = ["landed", "as-planned", "amended", "deviated"], lu = trk.rows.find(r => r.unit && LANDED.includes((r.asBuilt || {}).state));
  /* the six boards: an issue board and a tracking board in each state */
  const iPlanned = copy(ex); iPlanned.status = "building"; iPlanned.impact.basis = "plan"; iPlanned.impact.changes = [];
  const iPartial = copy(iPlanned); iPartial.impact.changes = [{ what: "Verification case: a deviation that changed the impact.", why: "Verification case.", when: "Stage B", entry: "api.0" }];
  const iBuilt = copy(ex);
  const tPlanned = copy(trk); Object.assign(tPlanned, { status: "planned" }); tPlanned.rows.forEach(r => { r.asBuilt = { state: "pending", summary: "" }; delete r.unit.live; });
  tPlanned.wip = { ...tPlanned.wip, step: "landing", current: [], next: tPlanned.rows[0].id }; tPlanned.impact.changes = []; tPlanned.impact.units = [];
  const tPartial = copy(trk);
  const tBuilt = copy(trk); Object.assign(tBuilt, { status: "built", asBuilt: { ref: "master", sha: "abcdef1", date: "2026-10-25" } });
  tBuilt.rows.forEach(r => { r.asBuilt = { state: "landed", summary: "Landed." }; delete r.unit.live; }); tBuilt.wip = { ...tBuilt.wip, step: "landed", current: [], next: null };
  tBuilt.impact.basis = "as-built"; tBuilt.impact.units.forEach(e => { e.basis = "as-built"; });
  tBuilt.impact.changes = [...tBuilt.impact.changes, ...tBuilt.rows.filter(r => r.unit && r.id !== lu.id).map(r => ({ unit: r.id, when: `#${r.unit.issue} landing`, none: true }))];
  const B = { "issue · planned": [iPlanned, "planned"], "issue · partial": [iPartial, "partial"], "issue · as-built": [iBuilt, "as-built"],
    "tracking · planned": [tPlanned, "planned"], "tracking · partial": [tPartial, "partial"], "tracking · as-built": [tBuilt, "as-built"] };
  const landedOnly = copy(trk); landedOnly.impact.changes = [];
  const derived = Object.entries(B).map(([k, [d, want]]) => [k, (reconciliation(d) || {}).state, want]);
  rc.push(["lib.js reconciliation() derives planned, partial and as-built on an issue board and a tracking board", derived.every(([, got, want]) => got === want), derived.map(([k, g, w]) => `${k}: ${g} (want ${w})`).join("; ")]);
  const lo = reconciliation(landedOnly);
  rc.push(["a tracking board with a unit landed and nothing recorded is partial, with that unit unrecorded; no impact is null", lo.state === "partial" && lo.landed === 1 && lo.total === 11 && lo.unrecorded.join() === lu.id && reconciliation({ ...ex, impact: null }) === null, JSON.stringify(lo)]);
  /* the chip, rendered */
  const render = (name, d, hash) => { const f = path.join(sc, name + ".html"); fs.writeFileSync(f, withData(tpl, "plan", JSON.stringify(d, null, 2))); return dumpDom(f, hash); };
  const CHIP = { planned: /<p class="q recon"><span class="vp neutral dashed"><i aria-hidden="true">…<\/i>planned<\/span>/, partial: /<p class="q recon"><span class="vp warning"><i aria-hidden="true">◐<\/i>partly reconciled( · \d+ of \d+ units?)?<\/span>/, "as-built": /<p class="q recon"><span class="vp good"><i aria-hidden="true">✓<\/i>as built<\/span>/ };
  const KEY = { planned: /impact planned: the plan's/, partial: /impact partly reconciled: changes recorded/, "as-built": /impact as built: reconciled with the build/ };
  const seen = [];
  Object.entries(B).forEach(([k, [d, want]], i) => {
    const dom = render("chip-" + i, d, "built"); if (dom == null) return;
    const bi = inner(dom, '<div id="built-impact">', "div"), key = inner(dom, '<div class="key" id="built-key">', "div"), imp = inner(dom, '<section class="view" role="tabpanel" id="p-impact"[^>]*>', "section");
    const others = Object.keys(CHIP).filter(s => s !== want);
    seen.push([k, CHIP[want].test(bi) && others.every(s => !CHIP[s].test(bi)) && KEY[want].test(key) && others.every(s => !KEY[s].test(key)) && !/class="q recon"/.test(imp), (bi.match(/<p class="q recon">[\s\S]*?<\/p>/) || ["no chip"])[0].slice(0, 200)]);
  });
  if (!seen.length) rc.push(["the rendered chip (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  else seen.forEach(([k, okv, got]) => rc.push([`the As built tab's chip reads the derived state, with its legend entry, and the Impact tab has none: ${k}`, okv, got]));
  const dT = render("chip-trk-n", tPartial, "built");
  if (dT != null) rc.push(["a tracking board's partly reconciled chip says how many units have landed", /partly reconciled · 1 of 11 units<\/span>/.test(inner(dT, '<div id="built-impact">', "div")), (inner(dT, '<div id="built-impact">', "div").match(/<p class="q recon">[\s\S]*?<\/p>/) || ["no chip"])[0]]);
  /* check.js: the derived state, the per-unit entry, the inconsistencies */
  const chk = (name, d) => { const dir = path.join(sc, "tree", "docs", "plans", ...(d.folder.split("/").slice(2))); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), tpl); node(embedJs, dir); return node(checkJs, dir, "--root", path.join(sc, "tree")); };
  const stateLine = r => ((r.stdout || "").match(/^ok {4}impact: reconciliation (\S+)/m) || [])[1];
  const printed = Object.entries(B).map(([k, [d, want]]) => { const dd = copy(d); if (!dd.folder.startsWith("docs/plans/")) dd.folder = "docs/plans/" + dd.slug; return [k, stateLine(chk("p-" + k.replace(/\W+/g, "-"), dd)), want]; });
  rc.push(["check.js prints the derived state on every board", printed.every(([, g, w]) => g === w), printed.map(([k, g, w]) => `${k}: ${g} (want ${w})`).join("; ")]);
  const per = new RegExp(`unit "${lu.id}" \\(#${lu.unit.issue}\\) has landed and impact\\.changes records nothing for it`);
  const c1 = chk("u-none", landedOnly);
  rc.push(["check.js warns on a landed unit with no impact.changes entry", per.test(c1.stdout) && c1.status === 0, lines(c1, /impact\.changes records nothing/) || "no warning"]);
  const named = copy(landedOnly); named.impact.changes = [{ what: "Verification case: a change.", why: "Verification case.", when: `#${lu.unit.issue} landing` }];
  const c2 = chk("u-when", named);
  rc.push(["the warning names a change whose \"when\" names the unit's landing but carries no \"unit\"", per.test(c2.stdout) && /impact\.changes\[0\] names #\d+ in "when" but carries no unit/.test(c2.stdout), lines(c2, /records nothing/) || "no warning"]);
  const noneE = copy(landedOnly); noneE.impact.changes = [{ unit: lu.id, when: `#${lu.unit.issue} landing`, none: true }];
  const c3 = chk("u-recorded", noneE);
  rc.push(["check.js takes a landed unit's \"no change\" entry, with no warning", c3.status === 0 && !per.test(c3.stdout) && !/no change/.test(lines(c3, /^warn/)), lines(c3, /^(FAIL|warn).*(no change|records nothing)/) || "no warning"]);
  const c4 = chk("u-tracking-fixture", copy(trk));
  rc.push(["the tracking fixture records its landed unit's change with its unit, and check.js does not warn", c4.status === 0 && !per.test(c4.stdout), lines(c4, /records nothing|^FAIL/) || "no warning"]);
  const inc = copy(landedOnly); inc.impact.basis = "as-built";
  const c5 = chk("u-inconsistent", inc);
  rc.push(["check.js warns that an as-built impact with a landed unit unrecorded, and units still to land, is inconsistent", /inconsistent: the impact is reconciled \(basis as-built\), but unit/.test(c5.stdout) && /inconsistent: the initiative's impact is reconciled \(basis as-built\), but 10 of 11 units have not landed/.test(c5.stdout), lines(c5, /inconsistent/) || "no warning"]);
  const iss = copy(ex); iss.folder = "docs/plans/" + iss.slug; iss.impact.changes = [{ unit: "x", when: "#1 landing", none: true }];
  const c6 = chk("u-issue", iss);
  rc.push(["check.js fails a \"no change\" entry on an issue board", c6.status === 1 && /a "no change" entry \(none: true\) records a unit's landing, and an issue board has no units/.test(c6.stdout), lines(c6, /^FAIL/) || "no failure"]);
  const c7 = chk("u-built", tBuilt);
  rc.push(["check.js passes a tracking board reconciled whole, every landed unit's effect recorded", c7.status === 0 && stateLine(c7) === "as-built" && !/records nothing|inconsistent/.test(c7.stdout), lines(c7, /^(FAIL|warn).*(impact|inconsistent)/) || "clean"]);
  report(`the derived reconciliation state on ${t.name}`, rc);
});
/* board.js writes the derived state into board.json, and the work board shows it */
targets.filter(t => t.block === "board").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), wc = [], repo = path.join(out, "reconciliation-board"); fs.rmSync(repo, { recursive: true, force: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x));
  const ex = J("plan/examples/38-handshake-empty-name/plan.json"), trk = J("verify/fixtures/tracking.plan.json"), ptpl = fs.readFileSync(sk("plan/template/dashboard.html"), "utf8");
  const put = (d, issue, slug, f) => { const x = copy(d); Object.assign(x, { issue, slug, folder: `docs/plans/${slug}` }); f(x); const dir = path.join(repo, "docs", "plans", slug); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(x, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), ptpl); node(embedJs, dir); };
  put(ex, 101, "101-planned", x => { x.status = "building"; x.impact.basis = "plan"; x.impact.changes = []; });
  put(ex, 102, "102-partial", x => { x.status = "building"; x.impact.basis = "plan"; x.impact.changes = [{ what: "Verification case.", why: "Verification case.", when: "Stage B" }]; });
  put(ex, 103, "103-built", () => {});
  put(ex, 104, "104-no-impact", x => { x.status = "building"; x.impact = null; });
  put(trk, 155, "155-tracking", () => {});
  const r = cp.spawnSync(process.execPath, [path.join(SKILL, "plan", "scripts", "board.js"), "--root", repo, "--no-gh"], { encoding: "utf8", cwd: repo });
  let b = null; try { b = JSON.parse(fs.readFileSync(path.join(repo, "docs", "plans", "board.json"), "utf8")); } catch (e) { /* none written */ }
  const rowOf = n => ((b && b.rows) || []).find(x => x.issue === n) || {}, rcOf = n => JSON.stringify(rowOf(n).reconciliation);
  const unit = trk.rows.find(x => x.unit && x.unit.issue && !x.unit.board);
  wc.push(["board.js writes each row's reconciliation into board.json: planned, partial, as-built, null with no impact, n of M on a tracking issue, null on a unit with no board", r.status === 0 && rcOf(101) === '{"state":"planned","landed":null,"total":null}' && rcOf(102) === '{"state":"partial","landed":null,"total":null}' && rcOf(103) === '{"state":"as-built","landed":null,"total":null}' && rcOf(104) === "null" && rcOf(155) === '{"state":"partial","landed":1,"total":11}' && rcOf(unit.unit.issue) === "null",
    r.status ? (r.stderr || r.stdout).slice(0, 300) : [101, 102, 103, 104, 155, unit.unit.issue].map(n => `#${n} ${rcOf(n)}`).join("; ")]);
  const c = node(checkJs, path.join(repo, "docs", "plans"), "--root", repo);
  wc.push(["check.js takes board.json's reconciliation and prints the count", c.status === 0 && /impact reconciliation 1 planned, 2 partly reconciled, 1 as built/.test(c.stdout), lines(c, /reconciliation|^FAIL/) || "nothing printed"]);
  if (b) { const bad = copy(b); bad.rows[0].reconciliation = { state: "partly" }; fs.writeFileSync(path.join(repo, "docs", "plans", "board.json"), JSON.stringify(bad, null, 2) + "\n"); node(embedJs, path.join(repo, "docs", "plans"));
    const c2 = node(checkJs, path.join(repo, "docs", "plans"), "--root", repo);
    wc.push(["check.js fails a reconciliation state that is not one of the three", c2.status === 1 && /reconciliation must be null or/.test(c2.stdout), lines(c2, /^FAIL/) || "no failure"]); }
  const f = path.join(out, "reconciliation-board-fixture.html"); fs.writeFileSync(f, withData(tpl, "board", fs.readFileSync(sk("verify/fixtures/work-board.json"), "utf8")));
  const dom = dumpDom(f);
  if (dom == null) wc.push(["the rendered work board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  else { const key = inner(dom, '<div class="key" id="runs-key">', "div");
    wc.push(["the work board shows the derived state in the State cell, with its legend: the tracking issue partly reconciled with n of M, a landed issue as built", /<span class="vp warning"><i aria-hidden="true">◐<\/i>impact partly reconciled · 1 of 11<\/span>/.test(dom) && /<span class="vp good"><i aria-hidden="true">✓<\/i>impact as built<\/span>/.test(dom) && /impact partly reconciled<\/span> changes recorded as the work lands/.test(key) && /impact as built<\/span> reconciled with the build/.test(key) && !/impact planned<\/span>/.test(key), key.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(-260)]); }
  report(`the derived reconciliation state on ${t.name}`, wc);
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

/* The plan-board improvements of 2026-10-22/23 carried to the other dashboard types (GUIDANCE.md §11), rendered through headless
   Chrome:
   - every tab's lede is at most one short line (GUIDANCE.md §2), on both system templates and on the work board, committed and live;
   - the wide desktop layout (GUIDANCE.md §6): on a 1920 x 1080 window a system and a supersystem page use most of the window, the
     inspector widens to 360 px and a fixed-aspect diagram stops at 1280 px; at 1400 px the page keeps its 1280 px measure;
   - board links on a system or supersystem page (GUIDANCE.md §5; system/RULES.md §2, §6): with a board for #7 in BOARDS, a title
     written <a data-board="7"> opens it and a lone <a data-issue="7"> opens it; with none, the title is plain text and a lone #n opens
     the GitHub issue; the supersystem's planned card and inspector link "planned by #7" through ilink(); check-page.js fails a BOARDS
     entry whose file is not there, and passes the one that is. */
targets.filter(t => !t.block || t.block === "board").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), cc = [], sc = path.join(out, "conventions-" + path.basename(t.file, ".html"));
  fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
  const write = (name, html) => { const f = path.join(sc, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); return f; };
  const ledesOf = dom => (dom.match(/<p class="lede"[^>]*>[\s\S]*?<\/p>/g) || []).map(text).filter(Boolean);
  if (t.block === "board") {
    const b = fs.readFileSync(sk("verify/fixtures/work-board.json"), "utf8"), bl = fs.readFileSync(sk("verify/fixtures/work-board-live.json"), "utf8");
    const d1 = dumpDom(write("board/index.html", withData(tpl, "board", b))), d2 = dumpDom(write("board-live/index.html", withData(tpl, "board", bl)));
    if (d1 == null) cc.push(["the rendered work board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    else {
      const l = [...ledesOf(d1), ...ledesOf(d2)].filter(x => !/^(No tracking issue is open|Every open issue sits)/.test(x));
      cc.push(["the work board's Runs lede is one short line, committed and live", l.length >= 2 && l.every(x => x.length <= 130), l.map(x => x.length + ": " + x).join(" | ")]);
      const docs = inner(d1, '<div class="card"><h3>Plans and documents</h3>', "div"), r = JSON.parse(b).rows.find(x => x.board);
      cc.push([`the Plans card pairs #${r.issue}: its number opens GitHub, its title its board`, new RegExp(`/issues/${r.issue}"[^>]*>#${r.issue}</a> <a href="${r.board.replace(/[.]/g, "\\.")}"`).test(docs), text(docs).slice(0, 300)]);
    }
  } else {
    const sup = /supersystem/.test(t.file);
    const probe = `<script>window.addEventListener("load",()=>setTimeout(()=>{const w=s=>{const e=document.querySelector(s);return e?Math.round(e.getBoundingClientRect().width):0;};document.body.dataset.widths=[w(".page"),w("#inspector"),w(".view:not([hidden])>svg")].join(",");},500));</script>`;
    const pl = dumpDom(write("placeholder/index.html", tpl));
    if (pl == null) { cc.push(["the rendered template (no browser found: set CHROME)", false, "no Chrome or Edge"]); }
    else {
      const l = ledesOf(pl);
      cc.push(["every tab's lede is at most one short line", l.length >= 6 && l.every(x => x.length <= 130), l.filter(x => x.length > 130).join(" | ") || `${l.length} ledes`]);
      const tab = sup ? "t-structure" : null, pick = tab ? `<script>window.addEventListener("load",()=>document.getElementById("${tab}").click());</script>` : "";
      const widths = size => { const d = dumpDom(write(`wide-${size}/index.html`, tpl.replace("</body>", pick + probe + "</body>")), "", size); return ((d || "").match(/data-widths="([\d,]+)"/) || ["", "0,0,0"])[1].split(",").map(Number); };
      const [pw, iw, sw] = widths("1920,1080"), [pn] = widths("1400,1000");
      cc.push(["on a 1920 window the page uses most of it, the inspector is 360 px and a fixed-aspect diagram stops at 1280 px", pw > 1800 && iw === 360 && sw > 0 && sw <= 1280, `page ${pw}px, inspector ${iw}px, diagram ${sw}px`]);
      cc.push(["at 1400 px the page keeps its 1280 px measure", pn > 0 && pn <= 1280, `page ${pn}px`]);
      /* board links: a stub board for #7 beside the page */
      const withBoards = tpl.replace(/^const BOARDS=\{\};/m, 'const BOARDS={"7":"boards/7/dashboard.html"};')
        .replace('<span><a data-board="N">Issue title</a></span>', '<span><a data-board="7">Issue with a board</a></span>')
        .replace(/(Plans[^<]*<a data-issue=")N(">)#N</, "$17$2#7<")
        .replace(/("slug": "system-gamma"[\s\S]*?"plannedBy": \{"issue": )0/, "$17");
      const f = write("links/index.html", withBoards); stub(path.join(sc, "links", "boards", "7"));
      const noComments = x => (x || "").replace(/<!--[\s\S]*?-->/g, ""), dl = dumpDom(f), ctx = noComments(inner(dl, '<section class="context">', "section"));
      cc.push(["with a board in BOARDS, the title <a data-board> opens it", /<a data-board="7" href="boards\/7\/dashboard\.html"[^>]*>Issue with a board<\/a>/.test(ctx), (ctx.match(/.{0,120}Issue with a board.{0,20}/) || ["no title"])[0]]);
      cc.push(["with a board in BOARDS, a lone <a data-issue> opens the board", /<a data-issue="7" href="boards\/7\/dashboard\.html"/.test(ctx), (ctx.match(/<a data-issue="7"[^>]*>/) || ["no lone #7"])[0]]);
      cc.push(["with no board, a title stays plain text and a lone #n opens the GitHub issue", !/data-board="N"/.test(ctx) && /Issue mapped to the item/.test(ctx) && /<a data-issue="N" href="https:\/\/github\.com\/ORG\/REPO\/issues\/N"/.test(inner(pl, '<section class="context">', "section")), (ctx.match(/.{0,80}Issue mapped to the item.{0,10}/) || ["no title"])[0]]);
      if (sup) cc.push(["the Systems tab's planned card links \"planned by #7\" to its board", /planned by <a href="boards\/7\/dashboard\.html"/.test(inner(dl, '<div class="syscards" id="syscards">', "div")), text(inner(dl, '<div class="syscards" id="syscards">', "div")).slice(0, 200)]);
      const ok = cp.spawnSync(process.execPath, [checker, f, "--out", sc], { encoding: "utf8" });
      cc.push(["check-page.js passes a BOARDS entry whose board is there", ok.status === 0 && /board links: 1 in BOARDS, 0 dead/.test(ok.stdout || ""), (ok.stdout || "").split(/\r?\n/).filter(x => /board links|FAIL/.test(x)).join(" | ")]);
      const dead = write("dead/index.html", withBoards);
      const bad = cp.spawnSync(process.execPath, [checker, dead, "--out", sc], { encoding: "utf8" });
      cc.push(["check-page.js fails a BOARDS entry whose board is not there", bad.status === 1 && /DEAD BOARD LINK: BOARDS\["7"\]/.test(bad.stdout || ""), (bad.stdout || "").split(/\r?\n/).filter(x => /board links|DEAD|FAIL/.test(x)).join(" | ")]);
    }
  }
  report(`the cross-type conventions on ${t.name}`, cc);
});

/* The Verdicts tile and the Verdict column count only verdicts that are written (plan/RULES.md §2: column 3 is written once, at
   plan acceptance; a verdict is written once it has a summary, as check.js reads it). Rendered through headless Chrome:
   - a board with rows and no verdict yet (rows whose verdict is {} and rows that carry only a kind, the WebTools #62 shape): the
     tile reads "0 of N · none written yet" and never "build"; no verdict cell shows a kind; the inspector names no kind;
   - a board with mixed verdicts (written build and leave, unwritten build and leave kinds): the tile counts the written ones and
     says how many are not yet written; written cells keep their kind, unwritten ones show none;
   - a tracking board with some unit verdicts unwritten counts the same way;
   - the example, every verdict written, names no unwritten count. */
targets.filter(t => t.block === "plan").forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), vc = [], sc = path.join(out, "verdicts"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x));
  const ex = J("plan/examples/38-handshake-empty-name/plan.json"), trk = J("verify/fixtures/tracking.plan.json");
  const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const click = id => `<script>window.addEventListener("load",()=>setTimeout(()=>{const c=document.querySelector('.cell.verdict[data-row="${id}"]');if(c)c.click();},600));</script>`;
  const render = (name, d, id) => { const f = path.join(sc, name + ".html"); fs.writeFileSync(f, withData(tpl, "plan", JSON.stringify(d, null, 2)).replace("</body>", (id ? click(id) : "") + "</body>")); return dumpDom(f); };
  const tile = dom => (text(inner(dom, '<div class="kpis" id="kpis">', "div")).match(/Verdicts (.*?) As built/) || ["", "no Verdicts tile"])[1];
  const vcell = (dom, id) => (dom.match(new RegExp(`<div class="cell verdict[^"]*"[^>]*data-row="${id}"[^>]*><div class="kick">[\\s\\S]*?</div><div class="sum">[\\s\\S]*?</div>`)) || [""])[0];
  const kicker = dom => text((inner(dom, '<aside class="inspector"[^>]*>', "aside").match(/<div class="kicker">([\s\S]*?)<\/div>/) || ["", ""])[1]);
  const unbuilt = d => { d.status = "planned"; d.asBuilt = null; d.impact = null; d.rows.forEach(r => { r.asBuilt = { state: "pending", summary: "" }; delete (r.unit || {}).live; }); d.milestones = (d.milestones || []).filter(m => ["gap", "considered"].includes(m.column)); d.wip = { ...d.wip, step: "plan", current: ["verdict"], landing: null, qa: [] }; return d; };
  /* no verdict yet: half the rows carry an empty verdict, half a bare kind */
  const none = unbuilt(copy(ex)); none.rows.forEach((r, i) => { r.verdict = i % 2 ? { kind: i % 4 === 1 ? "leave" : "build" } : {}; });
  const dN = render("no-verdicts", none, none.rows[1].id);
  if (dN == null) vc.push(["the rendered Verdicts tile (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  else {
    vc.push([`a board with ${none.rows.length} rows and no verdict yet reads "0 of ${none.rows.length} · none written yet", never "build"`, tile(dN) === `0 of ${none.rows.length} none written yet`, tile(dN)]);
    const cells = none.rows.map(r => vcell(dN, r.id));
    vc.push(["no unwritten verdict cell shows a kind, and each says it is not yet written", cells.every(c => c && !/class="kind"/.test(c) && /Not yet written\./.test(c)), cells.filter(c => !c || /class="kind"/.test(c)).map(c => text(c).slice(0, 80)).join(" | ") || "cells missing"]);
    vc.push(["the inspector of an unwritten verdict (a bare kind) names no kind", kicker(dN) === "3 · VERDICT" && /Not yet written\./.test(inner(dN, '<aside class="inspector"[^>]*>', "aside")), kicker(dN) || "no inspector"]);
    /* mixed: the first row's verdict emptied, the second a bare build kind, the last a bare leave kind (an unwritten leave) */
    const mix = unbuilt(copy(ex)), last = mix.rows.length - 1;
    mix.rows[0].verdict = {}; mix.rows[1].verdict = { kind: "build", summary: "" }; mix.rows[last].verdict = { kind: "leave", summary: " " };
    const W = r => typeof (r.verdict || {}).summary === "string" && r.verdict.summary.trim(), wb = mix.rows.filter(r => W(r) && r.verdict.kind !== "leave").length, wl = mix.rows.filter(r => W(r) && r.verdict.kind === "leave").length, wo = mix.rows.length - wb - wl;
    const dM = render("mixed-verdicts", mix, mix.rows[0].id), leaveRow = mix.rows.find(r => W(r) && r.verdict.kind === "leave");
    vc.push([`a board with mixed verdicts counts the written ones: "${wb} build · ${wl} left for later · ${wo} not yet written"`, tile(dM) === `${wb} build ${wl} left for later · ${wo} not yet written`, tile(dM)]);
    vc.push(["written cells keep their kind (build, leave as is); unwritten ones, a bare leave kind included, show none", /class="kind">build</.test(vcell(dM, mix.rows[2].id)) && /class="kind">leave as is</.test(vcell(dM, leaveRow.id)) && [0, 1, last].every(i => !/class="kind"/.test(vcell(dM, mix.rows[i].id))) && !/cell verdict leave/.test(vcell(dM, mix.rows[last].id)), [0, 1, 2, last].map(i => `${mix.rows[i].id}: ${text(vcell(dM, mix.rows[i].id)).slice(0, 40)}`).join(" | ")]);
    vc.push(["the inspector of an emptied verdict names no kind", kicker(dM) === "3 · VERDICT", kicker(dM) || "no inspector"]);
    const tm = unbuilt(copy(trk)); tm.rows.slice(0, 5).forEach(r => { r.verdict = {}; });
    const tb = tm.rows.filter(r => (r.verdict || {}).summary).length, tT = tile(render("tracking-verdicts", tm));
    vc.push([`a tracking board with five unit verdicts unwritten reads "${tb} build · 0 left for later · 5 not yet written"`, tT === `${tb} build 0 left for later · 5 not yet written`, tT]);
    const tE = tile(render("example-verdicts", ex));
    vc.push(["the example, every verdict written, names no unwritten count", tE === "9 build 2 left for later", tE]);
  }
  report(`the Verdicts tile and column on ${t.name}`, vc);
});

/* The footer (GUIDANCE.md §3), on every dashboard type: "Corresponds to <source>." and the authority sentence, a plan or tracking
   board's columns sentence after it, and nothing more — read from the rendered plan boards and work boards and from the system
   templates and example; check-page.js fails a footer in the old form on a system page and on a plan board. */
{ const fc = [], sc = path.join(out, "footer"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), tp = name => (targets.find(t => t.name === name) || {}).path;
  const ftext = html => (inner(html, "<footer[^>]*>", "footer") || "").replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
  const MD = "Code and the Markdown beside this page are authoritative on any conflict.", CODE = "Code is authoritative on any conflict.", COLS = "Columns 1 to 3 are written once; column 4 records every difference.";
  const put = (name, html) => { const f = path.join(sc, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); return f; };
  const checkFails = f => { const r = cp.spawnSync(process.execPath, [checker, f, "--out", sc], { encoding: "utf8" }); return [r.status === 1 && /FOOTER NOT IN ITS FORM/.test(r.stdout || ""), (r.stdout || "").split(/\r?\n/).filter(l => /footer|FAIL/.test(l)).join(" | ")]; };
  const ptpl = tp("plan/template/dashboard.html");
  if (ptpl) { const tpl = fs.readFileSync(ptpl, "utf8");
    [["an issue board", J("plan/examples/38-handshake-empty-name/plan.json")], ["a tracking board", J("verify/fixtures/tracking.plan.json")], ["a sub-issue board", J("verify/fixtures/sub-issue.plan.json")]].forEach(([what, d], i) => {
      const dom = dumpDom(put(`plan-${i}.html`, withData(tpl, "plan", JSON.stringify(d, null, 2)))), want = `Corresponds to ${d.folder}/plan.json. ${MD} ${COLS}`;
      fc.push([`${what}'s footer reads "${want}"`, dom != null && ftext(dom) === want, dom == null ? "no Chrome or Edge" : ftext(dom)]); });
    const old = tpl.replace(/\$\("#footer"\)\.innerHTML=`Corresponds to [^`]*`;/, () => '$("#footer").innerHTML=`Built from <code>${esc(FOLDER)}/plan.json</code>, embedded verbatim, against the baseline <code>master</code>. Nothing has landed yet. ' + MD + " " + COLS + ' Maintained by the presenter agent.`;');
    const [okP, outP] = checkFails(put("plan-old.html", withData(old, "plan", fs.readFileSync(sk("plan/examples/38-handshake-empty-name/plan.json"), "utf8"))));
    fc.push(["check-page.js fails a plan board whose footer is the old form", old !== tpl && okP, outP || "no failure"]); }
  const btpl = tp("plan/template/board.html");
  if (btpl) { const tpl = fs.readFileSync(btpl, "utf8");
    [["the work board", "verify/fixtures/work-board.json", "docs/plans/board.json"], ["the live work board", "verify/fixtures/work-board-live.json", "docs/plans/.live/board.json"]].forEach(([what, fx, src], i) => {
      const dom = dumpDom(put(`board-${i}/index.html`, withData(tpl, "board", fs.readFileSync(sk(fx), "utf8")))), want = `Corresponds to ${src}. ${MD}`;
      fc.push([`${what}'s footer reads "${want}"`, dom != null && ftext(dom) === want, dom == null ? "no Chrome or Edge" : ftext(dom)]); }); }
  [["system/template/system.html", "a system page", `Corresponds to workspace.dsl. ${CODE}`], ["system/template/supersystem.html", "a supersystem or repository page", `Corresponds to docs/dashboards/systems.json and workspace.dsl. ${CODE}`]].forEach(([name, what, want]) => {
    const p = tp(name); if (!p) return; const html = fs.readFileSync(p, "utf8");
    fc.push([`${what}'s footer reads "${want}", its divergence comment kept`, ftext(html) === want && /<footer>[\s\S]*?<!-- presenter: list each divergence/.test(html), ftext(html)]);
    if (name === "system/template/system.html") {
      const old = html.replace("<footer>Corresponds to <code>workspace.dsl</code>. ", "<footer>Drawn from <code>workspace.dsl</code> and the code at <code>master abc1234</code>. ").replace(`${CODE}<!--`, () => `${CODE} Maintained by the presenter agent.<!--`);
      const [okS, outS] = checkFails(put("system-old/index.html", old));
      fc.push(["check-page.js fails a system page whose footer is the old form", old !== html && okS, outS || "no failure"]); } });
  if (!root) { const exs = fs.readFileSync(sk("system/examples/webtools-udp/index.html"), "utf8");
    fc.push(["the system example's footer is the trimmed form", ftext(exs) === `Corresponds to workspace.dsl. ${CODE}`, ftext(exs)]); }
  report("the footer on every dashboard type", fc);
}

/* Dashed means only planned or pending (GUIDANCE.md §1), the As built tile counts what is built, and "no system" is a recorded
   decision (plan/RULES.md §2, §5), on every dashboard type, rendered through headless Chrome with a probe that reads computed styles:
   - the plan board: the verdict's kind chip, "leave as is" included, is solid, and the Timeline legend names the kind chips it drew
     (the verdict's and the gap's) as the same solid chip; the header's model chip is solid; the Source legend draws no dashed swatch;
   - the As built tile reads "N / M rows built": N the rows as-planned, amended or deviated, M every row less the dropped and deferred
     ones and those left for later, which the line under it still names; a tracking board's "N / M units landed" is counted the same way, as its chain chip;
   - the work board: the model chip solid, no dashed swatch in the Source legend; a row recorded "unassigned": true reads "no system"
     (not "no system recorded"); check.js passes "unassigned": true with system null and fails one that is not true or sits beside
     a system;
   - the system and supersystem templates: the model chip and the inspector's link button are solid. */
{ const dc = [], sc = path.join(out, "dashed-and-counts"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x)), tp = name => (targets.find(t => t.name === name) || {}).path;
  const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const put = (name, html) => { const f = path.join(sc, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); return f; };
  /* the probe: each selector's computed top border style, "sel=style" joined by "|", on body[data-borders]; a .linkbtn is made */
  const probe = sels => `<script>window.addEventListener("load",()=>setTimeout(()=>{const b=document.createElement("button");b.className="linkbtn";document.body.append(b);document.body.dataset.borders=${JSON.stringify(sels)}.map(s=>s+"="+[...document.querySelectorAll(s)].map(e=>getComputedStyle(e).borderTopStyle).join(",")).join("|");},700));</script>`;
  const borders = dom => Object.fromEntries(((dom || "").match(/data-borders="([^"]*)"/) || ["", ""])[1].split("|").filter(Boolean).map(x => { const i = x.lastIndexOf("="); return [x.slice(0, i).replace(/&gt;/g, ">"), x.slice(i + 1).split(",").filter(Boolean)]; }));
  const solid = xs => !!xs && xs.length > 0 && xs.every(s => s === "solid");
  const ptpl = tp("plan/template/dashboard.html");
  if (ptpl) { const tpl = fs.readFileSync(ptpl, "utf8"), ex = J("plan/examples/38-handshake-empty-name/plan.json"), trk = J("verify/fixtures/tracking.plan.json");
    const render = (name, d) => dumpDom(put(name + ".html", withData(tpl, "plan", JSON.stringify(d, null, 2)).replace("</body>", probe([".cell.verdict .kick .kind", ".cell.verdict.leave .kick .kind", "#timeline-key .kind", ".chip.model"]) + "</body>")));
    const tile = dom => (text(inner(dom, '<div class="kpis" id="kpis">', "div")).match(/As built (.*?) (QA passes|Timeline)/) || ["", "no As built tile"])[1];
    const BUILT = ["as-planned", "amended", "deviated"], LANDED = ["landed", ...BUILT], st = r => (r.asBuilt || {}).state || "pending", { leftForLater } = require(path.join(SKILL, "plan", "scripts", "lib.js"));
    const dE = render("example", ex);
    if (dE == null) dc.push(["the rendered plan board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    else { const b = borders(dE), key = inner(dE, '<div class="key" id="timeline-key">', "div"), src = inner(dumpDom(path.join(sc, "example.html"), "source"), '<div class="key" id="source-key">', "div");
      dc.push(["the verdict's kind chip is solid, \"leave as is\" included", solid(b[".cell.verdict .kick .kind"]) && solid(b[".cell.verdict.leave .kick .kind"]) && /class="kind">leave as is</.test(dE), JSON.stringify(b)]);
      dc.push(["the Timeline legend names the kind chips it drew, solid: the verdict's (build, leave as is) and the gap's", /<b class="kind">build<\/b> <b class="kind">leave as is<\/b> the verdict's kind: build it, or leave it as is/.test(key) && /<b class="kind">bug<\/b>[\s\S]*? the gap's kind/.test(key) && solid(b["#timeline-key .kind"]), text(key).slice(0, 300)]);
      dc.push(["the header's model chip is solid, and the Source legend draws no dashed swatch", solid(b[".chip.model"]) && /this copy is replaced on every/.test(src) && !/class="pln"/.test(src), `${JSON.stringify(b[".chip.model"])} · ${src.slice(0, 160)}`]);
      dc.push(["the example's As built tile reads \"9 / 9 rows built\", its two rows left for later named under it, not counted", tile(dE).startsWith("9 / 9 rows built") && /4 as planned · 5 amended · 2 left for later/.test(tile(dE)) && ex.rows.length === 11, tile(dE)]);
      const v = copy(ex); v.rows[0].asBuilt = { state: "dropped", summary: "Verification case.", reason: "Verification case." }; v.rows[1].asBuilt = { state: "deferred", summary: "Verification case.", issue: 999 };
      const n = v.rows.filter(r => BUILT.includes(st(r)) && !leftForLater(r)).length, m = v.rows.filter(r => !["dropped", "deferred"].includes(st(r)) && !leftForLater(r)).length, tv = tile(render("dropped", v));
      dc.push([`with a row dropped and one deferred the tile reads "${n} / ${m} rows built", both still named under it`, tv.startsWith(`${n} / ${m} rows built`) && /1 dropped/.test(tv) && /1 deferred/.test(tv), tv]);
      const tk = copy(trk), pend = tk.rows.filter(r => r.unit && st(r) === "pending" && r.id !== (tk.wip || {}).next && !((tk.wip || {}).current || []).some(a => a.split(".")[0] === r.id));
      pend[pend.length - 1].asBuilt = { state: "dropped", summary: "Verification case.", reason: "Verification case." };
      const units = tk.rows.filter(r => r.unit), tn = units.filter(r => LANDED.includes(st(r))).length, tm = units.filter(r => !["dropped", "deferred"].includes(st(r))).length, dT = render("tracking-dropped", tk), tt = tile(dT);
      dc.push([`a tracking board with a unit dropped reads "${tn} / ${tm} units landed", as its chain chip counts`, tt.startsWith(`${tn} / ${tm} units landed`) && /1 dropped/.test(tt) && new RegExp(`${tn} of ${tm} landed`).test(text(dT)), tt]); } }
  const btpl = tp("plan/template/board.html");
  if (btpl) { const tpl = fs.readFileSync(btpl, "utf8"), b = J("verify/fixtures/work-board.json");
    const un = copy(b); un.groups.push({ key: "other", issue: null, title: "Other runs, oldest first", board: null });
    un.rows.push({ issue: 71, title: "Verification case: a planning record only", state: "OPEN", created: "2026-10-01", parent: null, waitsOn: [], blocks: [], board: null, folder: null, branch: null, system: null, unassigned: true, step: null, detail: "", qa: [], qaMax: null, status: "no-board", landed: null, reconciliation: null, active: false, systemName: "no system", group: "other", order: 0 });
    un.unscheduled = [{ issue: 72, title: "Verification case: an unscheduled planning record", labels: [], created: "2026-10-02", system: null, unassigned: true }];
    const dW = dumpDom(put("work-board/index.html", withData(tpl, "board", JSON.stringify(un, null, 2)).replace("</body>", probe([".chip.model"]) + "</body>")));
    if (dW == null) dc.push(["the rendered work board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    else { const bw = borders(dW), src = inner(dW, '<div class="key" id="source-key">', "div"), row = (dW.match(/<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*>#71<[\s\S]*?<\/tr>/) || [""])[0];
      dc.push(["the work board's model chip is solid, and its Source legend draws no dashed swatch", solid(bw[".chip.model"]) && /this copy is replaced on every/.test(src) && !/class="pln"/.test(src), `${JSON.stringify(bw[".chip.model"])} · ${src.slice(0, 160)}`]);
      dc.push(["a row recorded \"unassigned\": true reads \"no system\", not \"no system recorded\"", /<\/span>no system<\/div>/.test(row) && !/no system recorded/.test(row), text(row).slice(0, 200)]); }
    const dir = path.join(sc, "tree", "docs", "plans"), chk = d => { fs.rmSync(path.join(sc, "tree"), { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      (d.rows || []).filter(r => r.board).forEach(r => stub(path.join(dir, path.dirname(r.board))));
      fs.writeFileSync(path.join(dir, "board.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "index.html"), tpl); node(embedJs, dir); return node(checkJs, dir, "--root", path.join(sc, "tree")); };
    const c1 = chk(un);
    dc.push(["check.js passes \"unassigned\": true with system null, on a row and an unscheduled issue", c1.status === 0 && !/unassigned/.test(lines(c1, /^(FAIL|warn)/)), lines(c1, /^(FAIL|warn)/) || "clean"]);
    const bad1 = copy(un); bad1.rows[bad1.rows.length - 1].unassigned = "yes"; const c2 = chk(bad1);
    const bad2 = copy(un); bad2.unscheduled[0].system = "gradle-build"; const c3 = chk(bad2);
    dc.push(["check.js fails an \"unassigned\" that is not true, and one beside a system", c2.status === 1 && /rows\[\d+\]\.unassigned must be true/.test(c2.stdout) && c3.status === 1 && /unscheduled\[0\]\.unassigned must be true/.test(c3.stdout), `${lines(c2, /^FAIL/)} || ${lines(c3, /^FAIL/)}`]); }
  ["system/template/system.html", "system/template/supersystem.html"].forEach(name => { const p = tp(name); if (!p) return;
    const d = dumpDom(put(path.basename(name, ".html") + "/index.html", fs.readFileSync(p, "utf8").replace("</body>", probe([".chip.model", ".linkbtn"]) + "</body>")));
    if (d == null) { dc.push([`the rendered ${name} (no browser found: set CHROME)`, false, "no Chrome or Edge"]); return; }
    const bs = borders(d); dc.push([`${name}: the model chip and the inspector's link button are solid`, solid(bs[".chip.model"]) && solid(bs[".linkbtn"]), JSON.stringify(bs)]); });
  report("dashed means planned, the As built count and \"no system\" on every dashboard type", dc);
}

/* The decisions of 2026-10-25 (admin-team/dashboards-skill/16), on every dashboard type they fit (GUIDANCE.md §11):
   - dashed means only planned or pending, no exception (GUIDANCE.md §1; system/RULES.md §4, §9): the system and supersystem
     templates draw their lifelines, returns and C4 frames solid, so check-page.js's dash scan (every tab, every C4 view) passes them;
     the same template with a dashed lifeline, a dashed boundary frame or a DSL style dashing a tag other than Planned fails
     (DASHED NOT PLANNED), and a page from the template before the change fails too; the plan board and work board fixtures pass;
   - rows left for later (plan/RULES.md §2): lib.js leftForLater() and the template agree; a leave row built after all (deviated)
     counts as built again; a tracking board's unit with a leave verdict, not landed, is out of the tile, the chain and the
     reconciliation's total, and named;
   - boardless work-board rows take their state from the tracker (plan/RULES.md §5): lib.js boardlessState() over every case,
     namesIssue() over branch names, check.js on the fixture's five boardless rows and on rows that contradict their tracker, and
     the rendered work board: "not started" dashed, "in progress" and "merged · awaiting close" solid, no glow, legend entries. */
{ const xc = [], sc = path.join(out, "decisions-16"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x)), tp = name => (targets.find(t => t.name === name) || {}).path;
  const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const put = (name, html) => { const f = path.join(sc, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); return f; };
  const pageCheck = (file, ...a) => cp.spawnSync(process.execPath, [checker, file, "--out", sc, ...a], { encoding: "utf8" });
  const lib = require(path.join(SKILL, "plan", "scripts", "lib.js"));
  /* 1. dashed means only planned or pending */
  ["system/template/system.html", "system/template/supersystem.html"].forEach(name => { const p = tp(name); if (!p) return; const base = path.basename(name, ".html"), tpl = fs.readFileSync(p, "utf8");
    if (!chrome) { xc.push([`${name}: the dash scan (no browser found: set CHROME)`, false, "no Chrome or Edge"]); return; }
    const ok = pageCheck(put(base + "-solid/index.html", tpl));
    xc.push([`${name}: lifelines, returns and C4 frames are solid; every dash marks something planned, on every tab and C4 view`, ok.status === 0 && /CHECK dashes: every dashed element is planned or pending/.test(ok.stdout), lines(ok, /CHECK dashes|FAIL/)]);
    const life = tpl.replace(".life{stroke:var(--line);stroke-width:1.2}", ".life{stroke:var(--line);stroke-dasharray:3 4}"), bound = tpl.replace(".c4bound{fill:var(--surface-2);fill-opacity:.45;stroke:var(--line);stroke-width:1.5}", ".c4bound{fill:var(--surface-2);fill-opacity:.45;stroke:var(--line);stroke-dasharray:8 5}");
    const r1 = pageCheck(put(base + "-dashed-life/index.html", life)), r2 = pageCheck(put(base + "-dashed-frame/index.html", bound));
    xc.push([`${name}: a dashed lifeline and a dashed boundary frame fail (DASHED NOT PLANNED)`, life !== tpl && bound !== tpl && r1.status === 1 && /DASHED NOT PLANNED: line\.life/.test(r1.stdout) && r2.status === 1 && /DASHED NOT PLANNED: rect\.c4bound/.test(r2.stdout), `${lines(r1, /CHECK dashes/)} || ${lines(r2, /CHECK dashes/)}`]);
    const dsl = tpl.replace(/element "Internal"(\s*)\{([^}]*)\}/, (m, sp, body) => `element "Internal"${sp}{${body.replace(/\s+$/, "")} border dashed }`), r3 = pageCheck(put(base + "-dashed-dsl/index.html", dsl));
    /* the C4 legend is drawn with each view: the frame entry exactly where the view draws a frame, the planned arrow exactly where it
       draws one, and the Planned swatch exactly where it shows a Planned element */
    const kp = `<script>window.addEventListener("load",()=>setTimeout(()=>{ const t=document.getElementById("t-c4"); if(t) t.click(); const out=[];
      document.querySelectorAll("#c4-ladder .rung").forEach(r=>{ if(r.dataset.v==="dsl") return; r.click(); const k=document.getElementById("c4-key").innerHTML, s=document.getElementById("svg-c4");
        out.push([!!s.querySelector(".c4bound")===/boundary: the view/.test(k), !!s.querySelector(".c4rel.dashed,.c4rel.planned")===/to or from a Planned element/.test(k), !!s.querySelector(".c4el.planned")===/class="pln"/.test(k)].map(Number).join("")); });
      document.body.dataset.c4keys=out.join(","); },700));</script>`;
    const kd = dumpDom(put(base + "-c4key/index.html", tpl.replace("</body>", kp + "</body>"))), keys = ((kd || "").match(/data-c4keys="([^"]*)"/) || ["", ""])[1];
    xc.push([`${name}: each C4 view's legend names the frame, the planned arrow and the Planned swatch exactly where the view draws them`, keys !== "" && keys.split(",").every(x => x === "111"), keys || "no views read"]);
    xc.push([`${name}: a workspace.dsl style dashing a tag other than Planned fails, without a browser too`, dsl !== tpl && r3.status === 1 && /CHECK dsl: DASHED NOT PLANNED: workspace\.dsl styles element "Internal"/.test(r3.stdout), lines(r3, /CHECK dsl|FAIL/)]); });
  if (chrome) [["plan/template/dashboard.html", "plan", "plan/examples/38-handshake-empty-name/plan.json"], ["plan/template/dashboard.html", "plan", "verify/fixtures/tracking.plan.json"], ["plan/template/board.html", "board", "verify/fixtures/work-board.json"]].forEach(([name, block, fx]) => { const p = tp(name); if (!p) return;
    const r = pageCheck(put(`dash-${path.basename(fx, ".json")}/index.html`, withData(fs.readFileSync(p, "utf8"), block, fs.readFileSync(sk(fx), "utf8"))));
    xc.push([`${name} with ${path.basename(fx)}: every dash is planned or pending`, /CHECK dashes: every dashed element is planned or pending/.test(r.stdout), lines(r, /CHECK dashes/)]); });
  /* 2. rows left for later */
  const ptpl = tp("plan/template/dashboard.html");
  if (ptpl) { const tpl = fs.readFileSync(ptpl, "utf8"), ex = J("plan/examples/38-handshake-empty-name/plan.json"), trk = J("verify/fixtures/tracking.plan.json"), st = r => (r.asBuilt || {}).state || "pending";
    const tile = d => (text(inner(d, '<div class="kpis" id="kpis">', "div")).match(/As built (.*?) (QA passes|Timeline)/) || ["", "no As built tile"])[1];
    const render = (name, d) => dumpDom(put(name + ".html", withData(tpl, "plan", JSON.stringify(d, null, 2))));
    xc.push(["lib.js leftForLater(): the example's two leave rows (as planned, amended) are left for later, no build row is", ex.rows.filter(lib.leftForLater).map(r => r.id).join(",") === "whitespace-in-tokens,client-validation", ex.rows.filter(lib.leftForLater).map(r => r.id).join(",")]);
    const dv = copy(ex), lr = dv.rows.find(r => r.id === "client-validation"); lr.asBuilt.state = "deviated";
    xc.push(["lib.js leftForLater(): a leave row built after all (deviated) and a deferred one are not left for later", !lib.leftForLater(lr) && !lib.leftForLater({ verdict: { kind: "leave", summary: "x" }, asBuilt: { state: "deferred" } }) && lib.leftForLater({ verdict: { kind: "leave", summary: "x" } }) && !lib.leftForLater({ verdict: { kind: "leave", summary: " " } }), "rule"]);
    const tk = copy(trk), pend = tk.rows.filter(r => r.unit && st(r) === "pending" && r.id !== (tk.wip || {}).next && !((tk.wip || {}).current || []).some(a => a.split(".")[0] === r.id));
    const lu = pend[pend.length - 1]; lu.verdict = { ...(lu.verdict || {}), kind: "leave", summary: "Verification case: this unit is left as is." };
    const units = tk.rows.filter(r => r.unit), tn = units.filter(r => ["landed", "as-planned", "amended", "deviated"].includes(st(r))).length, tm = units.filter(r => !["dropped", "deferred"].includes(st(r)) && !lib.leftForLater(r)).length, rc = lib.reconciliation(tk);
    xc.push([`lib.js reconciliation(): a tracking board's unit left for later is out of the total (${tm})`, !rc || rc.total === tm, JSON.stringify(rc && { landed: rc.landed, total: rc.total })]);
    const dD = render("left-deviated", dv), dT = render("left-tracking", tk);
    if (dD == null) xc.push(["the rendered tiles (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    else { xc.push(["a leave row built after all (deviated) counts as built again: \"10 / 10 rows built\", \"1 left for later\"", tile(dD).startsWith("10 / 10 rows built") && /1 left for later/.test(tile(dD)) && /1 deviated/.test(tile(dD)), tile(dD)]);
      xc.push([`a tracking board's unit left for later: "${tn} / ${tm} units landed" and named, as its chain chip counts`, tile(dT).startsWith(`${tn} / ${tm} units landed`) && /1 left for later/.test(tile(dT)) && new RegExp(`${tn} of ${tm} landed`).test(text(dT)), tile(dT)]); } }
  /* 3. boardless rows: state from the tracker */
  const B = lib.boardlessState, pr = (number, state, headRefName) => ({ number, state, headRefName });
  const cases = [
    ["open, nothing refers to it: not started", B(80, "OPEN", [], [], [], ["master", "fix/180-x", "v80", "release-1.80"]), "not-started", null, null],
    ["open, a branch names it: in progress", B(81, "OPEN", [], [], [], ["fix/81-port-lock"]), "in-progress", "fix/81-port-lock", null],
    ["open, GitHub links a branch: in progress", B(81, "OPEN", [], ["any-name"], [], []), "in-progress", "any-name", null],
    ["open, an open pull request's head names it: in progress, with the pull request", B(82, "OPEN", [], [], [pr(91, "OPEN", "docs/issue-82-readme")], []), "in-progress", "docs/issue-82-readme", 91],
    ["open, a closing pull request merged: merged, branch hidden", B(83, "OPEN", [pr(92, "MERGED", "x")], [], [], ["x"]), "merged", null, 92],
    ["open, merged and another open pull request: in progress", B(83, "OPEN", [pr(92, "MERGED", "x")], [], [pr(94, "OPEN", "fix/83-more")], []), "in-progress", "fix/83-more", 94],
    ["closed: landed", B(84, "CLOSED", [pr(93, "MERGED", "y")], [], [], ["y"]), "landed", null, 93],
    ["a closed, unmerged pull request alone: not started", B(85, "OPEN", [pr(95, "CLOSED", "z")], [], [], []), "not-started", null, null]];
  cases.forEach(([what, got, status, branch, n]) => xc.push([`boardlessState(): ${what}`, got.status === status && got.tracker.branch === branch && ((got.tracker.pr || {}).number || null) === n, JSON.stringify(got)]));
  const N = lib.namesIssue;
  xc.push(["namesIssue(): issue-62, 62-slug, fix/62, add-issue-62 name #62; after-62, v62, 1.62, 620-x and g1 do not", ["feat/issue-62-http-core", "62-http", "fix/62", "add-issue-62"].every(b => N(b, 62)) && !["docs/dashboards-after-62", "v62", "release-1.62", "620-x"].some(b => N(b, 62)) && N("feature/3-g1-build-skeleton", 3) && !N("feature/3-g1-build-skeleton", 1), "names"]);
  const btpl = tp("plan/template/board.html");
  if (btpl) { const tpl = fs.readFileSync(btpl, "utf8"), wb = J("verify/fixtures/work-board.json"), dir = path.join(sc, "tree", "docs", "plans");
    const chk = d => { fs.rmSync(path.join(sc, "tree"), { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); (d.rows || []).filter(r => r.board).forEach(r => stub(path.join(dir, path.dirname(r.board))));
      fs.writeFileSync(path.join(dir, "board.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "index.html"), tpl); node(embedJs, dir); return node(checkJs, dir, "--root", path.join(sc, "tree")); };
    const c0 = chk(wb);
    xc.push(["check.js passes the fixture's six boardless rows, one per state", c0.status === 0 && /6 boardless rows, state from the tracker: 1 not-started, 2 in-progress, 1 merged, 1 landed, 1 not-planned/.test(c0.stdout), lines(c0, /boardless|FAIL/)]);
    const bad = (what, f, re) => { const d = copy(wb); f(d.rows.find(r => r.issue === 80), d.rows.find(r => r.issue === 83), d); const r = chk(d); xc.push([`check.js fails ${what}`, r.status === 1 && re.test(r.stdout), lines(r, /^FAIL/)]); };
    bad("a not-started row a branch refers to", r => { r.tracker.branch = "fix/80-x"; }, /status "not-started" does not match/);
    bad("a landed row whose issue is open", r => { r.status = "landed"; }, /landed means the issue is closed/);
    bad("a boardless row that glows", (r, m) => { m.active = true; }, /a boardless row never glows/);
    bad("a tracker state on a row without tracker", (r, m) => { delete m.tracker; }, /is a boardless row's state, read from the tracker/);
    bad("a status the page does not draw", r => { r.status = "started"; }, /status must be one of/);
    const old = copy(wb), o = old.rows.find(r => r.issue === 80); delete o.tracker; o.status = "no-board"; const cw = chk(old);
    xc.push(["check.js warns on a row from a board.js older than the boardless rows (\"no-board\")", cw.status === 0 && /"no-board" is the state of a board\.js older/.test(cw.stdout), lines(cw, /no-board/)]);
    const dW = dumpDom(put("work-board/index.html", withData(tpl, "board", JSON.stringify(wb, null, 2))));
    if (dW == null) xc.push(["the rendered work board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
    else { const row = n => (dW.match(new RegExp(`<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*>#${n}<[\\s\\S]*?</tr>`)) || [""])[0], key = inner(dW, '<div class="key" id="runs-key">', "div");
      xc.push(["the work board: not started dashed, in progress and merged solid, none glowing", /^<tr class="run nob"/.test(row(80)) && [81, 82, 83, 84].every(n => /^<tr class="run"/.test(row(n)) && !/glow/.test(row(n))) && /vp neutral dashed[^>]*><i aria-hidden="true">…<\/i>not started/.test(row(80)) && /vp neutral"><i aria-hidden="true">▸<\/i>in progress/.test(row(81)) && /vp good"><i aria-hidden="true">✓<\/i>merged · awaiting close/.test(row(83)), [80, 81, 83].map(n => text(row(n)).slice(0, 90)).join(" | ")]);
      xc.push(["the work board: a boardless row shows its pull request and, in progress, its branch; a merged one no branch", /PR #91<\/a> open/.test(row(82)) && /<code>docs\/issue-82-readme<\/code>/.test(row(82)) && /PR #92<\/a> merged/.test(row(83)) && !/<code>/.test(row(83)), text(row(82)).slice(0, 160)]);
      xc.push(["the legend names in progress and merged · awaiting close with where they came from", /in progress<\/span> no board: a branch or an open pull request refers to it/.test(key) && /merged · awaiting close<\/span> no board: its pull request merged, the issue still open/.test(key), text(key).slice(0, 400)]); } }
  report("dashed means only planned (solid furniture), rows left for later, boardless rows from the tracker", xc);
}

/* The decisions of 2026-10-25 (admin-team/dashboards-skill/17), on every dashboard type they fit (GUIDANCE.md §11), rendered from the
   live issue fixture (verify/fixtures/live-issue.plan.json, a run mid-research) and its variants at each step:
   A. the step panel beside the half-width WIP strip: interview (answered, waiting), research (the planning → research → verification
      timeline, each question's state, the returned count), plan (writing, re-pass, verdicts written), implementation (stages done,
      current, to come), qa (each pass apart, by kind and by severity), remediation (its sub-steps), halted and escalated (what it waits
      on, held still); none on a landed board; on a tracking board, the unit's step panel in place of the up-next bubble;
   B. research-state rings on the Considered cells (red planning, orange researching and returned, yellow verifying, green complete),
      with their legend entry; none while the questions are only drafted; check.js on the question states and the research phase;
   C. the charging arrow into each unwritten Verdict cell during the plan step, still while halted, gone once written or past the plan;
   D. the strip's research line: the open questions and how many have returned;
   E. the work board: a halted or escalated row keeps the still ring;
   F. live updates: embed.js writes plan.js (board.js on the work board), check.js holds it to the data file, and the page re-loads it
      while the run is live, redraws in place keeping the tab and the inspector, and says so in its live indicator;
   G. the theme switch on every dashboard type: it follows the system setting until clicked, then remembers the choice. */
{ const lc = [], sc = path.join(out, "decisions-17"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x)), tp = name => (targets.find(t => t.name === name) || {}).path;
  const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
  const lib = require(path.join(SKILL, "plan", "scripts", "lib.js"));
  const ptpl = tp("plan/template/dashboard.html"), btpl = tp("plan/template/board.html"), PT = ptpl ? fs.readFileSync(ptpl, "utf8") : "", BT = btpl ? fs.readFileSync(btpl, "utf8") : "";
  const LIVE = J("verify/fixtures/live-issue.plan.json"), ids = LIVE.rows.map(r => r.id);
  /* the variants of the live fixture, one per step the panel breaks down */
  const at = (f) => { const d = copy(LIVE); f(d, d.wip); return d; };
  const complete = w => { w.questions.forEach(q => { q.state = "complete"; q.findings = q.findings || `research/${q.question}.md`; }); w.research = { ...w.research, phase: "complete" }; };
  const V = {
    research: at(() => {}),
    planning: at((d, w) => { w.questions = []; w.research = { phase: "planning", drafted: 2, since: { planning: "2026-10-25T08:05:00Z" } }; w.current = ["considered"]; w.event = { name: "research-planning", at: "2026-10-25T08:10:00Z" }; }),
    verifying: at((d, w) => { w.questions.forEach(q => { q.state = "verifying"; q.findings = q.findings || `research/${q.question}.md`; }); w.research.phase = "verification"; w.current = ["considered"]; /* a verifying question names no row: the fallback */ }),
    interview: at((d, w) => { w.step = "interview"; w.current = []; w.questions = []; w.research = null; w.interview[1].answer = null; w.interview[1].answered = null; }),
    plan: at((d, w) => { w.step = "plan"; w.current = ["considered", "verdict"]; complete(w); w.plan = { state: "re-pass", from: "qa", pass: 1 }; d.rows.slice(1, 4).forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written." }; }); }),
    halted: at((d, w) => { w.step = "halted"; w.resume = "plan"; w.current = ["considered", "verdict"]; complete(w); w.plan = { state: "writing" }; w.waitingOn = "Verification case: which refusal reply text to send."; }),
    escalated: at((d, w) => { w.step = "escalated"; w.resume = "plan"; w.current = ["considered", "verdict"]; complete(w); }),
    implementation: at((d, w) => { d.status = "building"; w.step = "implementation"; w.questions = []; w.research = null; d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; });
      w.stages = [{ id: "A", name: "The validity rule", state: "done", rows: [ids[0]] }, { id: "B", name: "Routing and the reply", state: "current", rows: [ids[1], ids[2]] }, { id: "C", name: "Documents", state: "todo", rows: [ids[6]] }]; w.current = [ids[1] + ".built", ids[2] + ".built"]; }),
    qa: at((d, w) => { d.status = "building"; w.step = "qa"; w.questions = []; w.research = null; w.current = ["built"]; d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written." }; });
      w.qa = [{ pass: 1, verdict: "changes-requested", date: "2026-10-25", findings: { documentation: 4, test: 2, code: 1 }, severity: { major: 2, minor: 5 } }]; }),
    remediation: at((d, w) => { d.status = "building"; w.step = "remediation"; w.questions = []; w.research = null; w.current = [ids[0] + ".built"]; d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written." }; });
      w.qa = [{ pass: 1, verdict: "changes-requested", findings: { documentation: 1, test: 0, code: 2 } }]; w.remediation = { pass: 1, steps: [{ what: "Planner re-pass of stage B", state: "done" }, { what: "Implementer fixes for pass 1", state: "current" }, { what: "qa pass 2", state: "todo" }] }; }),
    branch: at((d, w) => { w.step = "branch"; w.current = []; w.questions = []; w.research = null; d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written." }; }); })
  };
  const render = (name, d, o) => { o = o || {}; const dir = path.join(sc, name); fs.mkdirSync(dir, { recursive: true }); const f = path.join(dir, "dashboard.html");
    fs.writeFileSync(f, withData(PT, "plan", JSON.stringify(d, null, 2)).replace("</body>", (o.inject || "") + "</body>"));
    if (o.side !== false) fs.writeFileSync(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(o.side || d, null, 2)));
    return dumpDom(f, o.hash || "", o.size, o.budget); };
  const strip = dom => inner(dom, '<section class="wip[^"]*" id="wip"[^>]*>', "section");
  const panel = dom => inner(strip(dom), '<div class="sp[^"]*"[^>]*>', "div");
  const cellOf = (dom, col, id) => ((dom || "").match(new RegExp(`<div class="cell ${col}[^"]*"[^>]*data-row="${id}"`)) || [""])[0];
  if (!ptpl || !chrome) lc.push(["the rendered plan boards (no browser found: set CHROME)", !!ptpl && !!chrome, "no Chrome or Edge"]);
  else {
    const D = {}; Object.keys(V).forEach(k => { D[k] = render("v-" + k, V[k]); });
    /* A. the step panel */
    const sR = strip(D.research), pR = panel(D.research);
    lc.push(["A: an issue board's strip sits beside its step panel, half and half, the legend under both", /class="wip split"/.test(D.research) && /<div class="wiprow"><div class="wipmain">/.test(sR) && /class="sp" data-step="research"/.test(sR) && /<\/div><div class="key">/.test(sR), sR.slice(0, 200)]);
    lc.push(["A: research: the planning → research → verification timeline, research current", /aria-label="The research timeline"/.test(pR) && /<li class="done"><span class="dot"[^>]*><\/span>planning<\/li><li class="cur glow"[^>]*><span class="dot"[^>]*><\/span>research<\/li><li class="todo"><span class="dot"[^>]*><\/span>verification<\/li>/.test(pR), text(pR).slice(0, 200)]);
    lc.push(["A: research: each question with its state and the count returned", /2 of 4 questions returned/.test(text(pR)) && (pR.match(/vp serious"><i aria-hidden="true">↻<\/i>researching/g) || []).length === 2 && (pR.match(/vp serious"><i aria-hidden="true">✓<\/i>returned/g) || []).length === 2 && /bears on no row/.test(pR), text(pR).slice(0, 300)]);
    lc.push(["A: research-planning: the panel says planning and how many questions are drafted; no row rings", /Planning the research questions: 2 drafted so far/.test(text(panel(D.planning))) && /<li class="cur glow"[^>]*><span class="dot"[^>]*><\/span>planning/.test(panel(D.planning)) && !/class="cell considered[^"$]* rs /.test(D.planning), text(panel(D.planning)).slice(0, 200)]);
    lc.push(["A: interview: the questions, answered or waiting, counted", /1 of 2 questions answered · 1 waiting/.test(text(panel(D.interview))) && /vp warning"><i aria-hidden="true">\?<\/i>waiting on the user/.test(panel(D.interview)) && /answer: Refused/.test(text(panel(D.interview))), text(panel(D.interview)).slice(0, 300)]);
    const pP = panel(D.plan);
    lc.push(["A: plan: a re-pass after a qa pass, plan accepted to come, the verdicts written and those still to write", /re-pass after qa pass 1/.test(text(pP)) && /<li class="todo"><span class="dot"[^>]*><\/span>plan accepted/.test(pP) && /3 of 11 verdicts written/.test(text(pP)) && /Still to write: /.test(text(pP)), text(pP).slice(0, 300)]);
    const pI = panel(D.implementation);
    lc.push(["A: implementation: the stages done, current and to come, with the rows each touches", /Stage B of 3 · 1 done/.test(text(pI)) && /<li class="done"><span class="dot"[^>]*><\/span><span class="q"><b>A<\/b>/.test(pI) && /<li class="cur"><span class="dot"[^>]*><\/span><span class="q"><b>B<\/b>/.test(pI) && /<li class="todo"><span class="dot"[^>]*><\/span><span class="q"><b>C<\/b>/.test(pI) && /touches /.test(pI), text(pI).slice(0, 300)]);
    const pQ = panel(D.qa);
    lc.push(["A: qa: each pass apart, its verdict, its finding counts by kind and by severity, the running pass", (pQ.match(/<div class="sp-pass /g) || []).length === 2 && /Pass 1 <span class="vp critical">/.test(pQ) && /findings by kind: 4 doc · 2 test · 1 code/.test(pQ) && /by severity: 2 major · 5 minor/.test(pQ) && /sp-pass run pend/.test(pQ) && /Pass 2 running · at most 3 passes/.test(text(pQ)), text(pQ).slice(0, 300)]);
    lc.push(["A: remediation: the qa pass it answers and its sub-steps, done, current, to come", /Answering qa pass 1/.test(text(panel(D.remediation))) && /<li class="done">[\s\S]*?Planner re-pass of stage B/.test(panel(D.remediation)) && /<li class="cur">[\s\S]*?Implementer fixes/.test(panel(D.remediation)) && /<li class="todo">[\s\S]*?qa pass 2/.test(panel(D.remediation)), text(panel(D.remediation)).slice(0, 300)]);
    const pH = panel(D.halted), pE = panel(D.escalated);
    lc.push(["A: halted and escalated: what it waits on, the panel held still (no breathing dot)", /class="sp sp-held" data-step="plan"/.test(strip(D.halted)) && /Held still at plan: it waits on the user for Verification case: which refusal reply/.test(text(pH)) && /class="cur held"/.test(pH) && !/class="cur glow"/.test(pH) && /Escalated from plan: held still/.test(text(pE)) && /class="cur held"/.test(pE), text(pH).slice(0, 200)]);
    const dEx = render("v-landed", J("plan/examples/38-handshake-empty-name/plan.json"));
    lc.push(["A: a landed board has no current step: its strip runs across the row, no panel", !/class="wip split"/.test(dEx) && !/class="sp[ "]/.test(strip(dEx)), strip(dEx).slice(0, 160)]);
    /* the unit's step panel on a tracking board, from its mirror, which carries the panel's facts (lib.js panelFacts()) */
    const trk = J("verify/fixtures/tracking.plan.json"), u = trk.rows.find(r => r.unit && r.unit.live), tq = copy(trk), uq = tq.rows.find(r => r.id === u.id);
    Object.assign(uq.unit.live, { step: "research", resume: null, waitingOn: null, questions: [{ question: "unit-question", rows: [], findings: null, state: "researching" }], research: { phase: "research" } });
    const run = lib.unitRun({ status: "planned", wip: { step: "research", questions: [{ question: "q", rows: [], findings: null, state: "researching" }], research: { phase: "research" }, stages: [], plan: null }, rows: [] });
    lc.push(["A: lib.js unitRun() mirrors the step panel's facts a unit's board records, and only those", Array.isArray(run.questions) && run.research && run.research.phase === "research" && !("stages" in run) && !("plan" in run), JSON.stringify(run).slice(0, 200)]);
    const run2 = lib.unitRun({ status: "building", wip: { step: "implementation", stages: [{ id: "A", state: "current", rows: ["r1"] }] }, rows: [{ id: "r1", name: "Row one", asBuilt: { state: "amended", changes: [{ what: "x", why: "y" }] } }, { id: "r2", name: "Row two" }] });
    lc.push(["A: the mirror names the rows its stages touch and counts the deviations, so the unit's panel reads as on its own board", JSON.stringify(run2.rowNames) === JSON.stringify({ r1: "Row one" }) && run2.deviations === 1, JSON.stringify({ rowNames: run2.rowNames, deviations: run2.deviations })]);
    const fT = path.join(sc, "trk"); fs.mkdirSync(fT, { recursive: true }); fs.writeFileSync(path.join(fT, "dashboard.html"), withData(PT, "plan", JSON.stringify(tq, null, 2)));
    const dT = dumpDom(path.join(fT, "dashboard.html")), sT = strip(dT);
    lc.push(["A: a tracking board's unit step panel shows the unit's own research, and its bubble the open questions", /class="sp" data-step="research"/.test(sT) && new RegExp(`Unit ${u.unit.n} · #${u.unit.issue} · its step in detail`).test(text(sT)) && /unit-question/.test(inner(sT, '<div class="sp[^"]*"[^>]*>', "div")) && /RESEARCH<\/span>0 of 1 returned · open: <code>unit-question<\/code>/i.test(sT), text(inner(sT, '<div class="sp[^"]*"[^>]*>', "div")).slice(0, 200)]);
    /* B. the rings */
    const ring = (dom, id) => (cellOf(dom, "considered", id).match(/ rs rs-(\w+)/) || [])[1] || null;
    lc.push(["B: rings on the Considered cells by the least advanced state of their questions: researching orange, returned orange, none for an unnamed row", ring(D.research, ids[0]) === "researching" && ring(D.research, ids[1]) === "returned" && ring(D.research, ids[3]) === "researching" && ring(D.research, ids[5]) === null && /vp serious"><i aria-hidden="true">✓<\/i>returned/.test(inner(D.research, `<div class="cell considered[^"]*"[^>]*data-row="${ids[1]}"[^>]*>`, "div")), ids.slice(0, 6).map(id => ring(D.research, id)).join(",")]);
    lc.push(["B: verifying yellow, complete green (kept at the plan step), and the ring is the border, never a fill", ring(D.verifying, ids[0]) === "verifying" && ring(D.plan, ids[0]) === "complete" && /\.cell\.rs\{border:2px solid var\(--rc\)/.test(ptpl ? fs.readFileSync(ptpl, "utf8") : "") && /\.rs-planning\{--rc:var\(--critical\)\}\.rs-researching,\.rs-returned\{--rc:var\(--serious\)\}\.rs-verifying\{--rc:var\(--warning\)\}\.rs-complete\{--rc:var\(--good\)\}/.test(fs.readFileSync(ptpl, "utf8")), [ring(D.verifying, ids[0]), ring(D.plan, ids[0])].join(",")]);
    const kR = inner(D.research, '<div class="key" id="timeline-key">', "div");
    lc.push(["B: the Timeline legend names each research state it drew, as a ring with its pill", /<i class="ring rs-researching"><\/i>[\s\S]*?research state: a researcher is out on it/.test(kR) && /<i class="ring rs-returned"><\/i>/.test(kR) && !/rs-verifying/.test(kR), text(kR).slice(-300)]);
    lc.push(["B: no ring once the plan is accepted (the questions cleared) or on a landed board", ids.every(id => ring(D.branch, id) === null) && ids.every(id => ring(dEx, id) === null), "rings at branch: " + ids.map(id => ring(D.branch, id)).filter(Boolean).length]);
    /* C. the charging arrow */
    const chg = (dom, id) => /\bcharging\b/.test(cellOf(dom, "verdict", id)), still = (dom, id) => / charging still/.test(cellOf(dom, "verdict", id));
    lc.push(["C: during the plan step an unwritten verdict's connector charges; a written one is the plain line", chg(D.plan, ids[0]) && !still(D.plan, ids[0]) && !chg(D.plan, ids[1]) && /charging arrow: its verdict being written/.test(inner(D.plan, '<div class="key" id="timeline-key">', "div")), cellOf(D.plan, "verdict", ids[0])]);
    lc.push(["C: it holds still while halted or escalated, and is gone outside the plan step", still(D.halted, ids[0]) && still(D.escalated, ids[0]) && !chg(D.research, ids[0]) && !chg(D.branch, ids[0]) && !chg(D.implementation, ids[0]), [cellOf(D.halted, "verdict", ids[0]), cellOf(D.research, "verdict", ids[0])].join(" | ").slice(0, 300)]);
    const tplCss = fs.readFileSync(ptpl, "utf8");
    lc.push(["C: the arrow's segments fill left to right as an animation, and hold still under reduced motion", /@keyframes charge\{0%\{background-size:0 100%,100% 100%\}100%\{background-size:100% 100%,100% 100%\}\}/.test(tplCss) && /prefers-reduced-motion:reduce\)\{\.cell\.verdict\.charging::before\{animation:none!important\}\}/.test(tplCss), "css"]);
    /* D. the strip lists the open questions with the count returned */
    lc.push(["D: the strip lists the open research questions and how many have returned", /<span class="l">research<\/span>2 of 4 returned · open: <code>blast-radius<\/code>, <code>token-splitting<\/code>/.test(inner(sR, '<div class="wipmain">', "div")), text(inner(sR, '<div class="wip-facts">', "div"))]);
    /* the check: every pass of the variants (dashes only planned, a legend everywhere, no script error) */
    ["plan", "halted", "qa"].forEach(k => { const r = cp.spawnSync(process.execPath, [checker, path.join(sc, "v-" + k, "dashboard.html"), "--out", path.join(sc, "v-" + k)], { encoding: "utf8" });
      lc.push([`the ${k} variant passes check-page.js (no dash that is not planned, every legend, no error)`, r.status === 0, (r.stdout || "").split(/\r?\n/).filter(l => /FAIL|DASHED|ERROR|NO LEGEND/.test(l)).join(" | ")]); });
    /* F. live updates: the sidecar, the poll, the redraw, the indicator */
    const chipOf = dom => inner(dom || "", '<span class="livechip[^"]*" id="live"[^>]*>', "span"), chipCls = dom => ((dom || "").match(/<span class="(livechip[^"]*)" id="live"/) || [])[1] || "";
    const B2 = copy(LIVE); B2.wip.detail = "Verification case: the run moved on."; B2.wip.updated = "2026-10-25T09:20:00Z"; B2.wip.questions[0] = { ...B2.wip.questions[0], state: "returned", findings: "research/blast-radius.md" };
    const pick = `<script>window.addEventListener("load",()=>setTimeout(()=>{ document.getElementById("t-decisions").click(); const tr=document.querySelector("#dec-table tbody tr"); if(tr) tr.click(); },300));</script>`;
    const dL = render("live-redraw", LIVE, { side: B2, inject: pick, budget: 9000 });
    lc.push(["F: the page re-loads plan.js while the run is live and redraws in place: the new detail, the question returned", /Verification case: the run moved on\./.test(strip(dL)) && /3 of 4 returned/.test(strip(dL)), text(inner(strip(dL), '<div class="wipmain">', "div")).slice(0, 200)]);
    lc.push(["F: the redraw keeps the tab and what the inspector shows", /<button class="tab"[^>]*id="t-decisions"[^>]*aria-selected="true"/.test(dL) && /<div class="kicker">2 · CONSIDERED<\/div>/.test(inner(dL, '<aside class="inspector"[^>]*>', "aside")), text(inner(dL, '<aside class="inspector"[^>]*>', "aside")).slice(0, 120)]);
    lc.push(["F: the live indicator: LIVE · updated n s ago, its dot pulsing, the counter restarted at the change", /livechip on pulse/.test(chipCls(dL)) && /LIVE · updated \d+ s ago/.test(text(chipOf(dL))), chipCls(dL) + " · " + text(chipOf(dL))]);
    const QL = copy(LIVE); QL.wip.updated = "2026-01-01T00:00:00Z"; QL.wip.since = "2026-01-01T00:00:00Z"; const dQ = render("live-quiet", QL, { budget: 6500 });
    lc.push(["F: with no change for a quiet spell it reads LIVE · no change for n min, the dot still", /^livechip on$/.test(chipCls(dQ)) && /LIVE · no change for \d+ (min|h)/.test(text(chipOf(dQ))), chipCls(dQ) + " · " + text(chipOf(dQ))]);
    const dU = render("live-unavailable", LIVE, { side: false, budget: 6500 });
    lc.push(["F: with plan.js unreadable it reads LIVE · data unavailable", /livechip on na/.test(chipCls(dU)) && /LIVE · data unavailable/.test(text(chipOf(dU))), chipCls(dU) + " · " + text(chipOf(dU))]);
    const hL = copy(V.halted); hL.wip.updated = new Date().toISOString().replace(/\.\d+Z$/, "Z"); const dH = render("live-halted", hL, { budget: 6500 });
    lc.push(["F: while the run waits on the user the dot holds still", /^livechip on$/.test(chipCls(dH)) && /LIVE · updated/.test(text(chipOf(dH))), chipCls(dH) + " · " + text(chipOf(dH))]);
    lc.push(["F: a landed board does not poll: not live · as of its local time", /livechip off/.test(chipCls(dEx)) && /not live · as of/.test(text(chipOf(dEx))) && /<time datetime=/.test(chipOf(dEx)), chipCls(dEx) + " · " + text(chipOf(dEx))]);
    /* embed.js writes the sidecar; check.js holds it to plan.json; embed.js --check too */
    const tree = path.join(sc, "tree"), dir = path.join(tree, "docs", "plans", LIVE.slug); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(LIVE, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), PT); node(embedJs, dir);
    const side = lib.readSidecar(path.join(dir, "plan.js"), "plan"), c1 = node(checkJs, dir, "--root", tree);
    lc.push(["F: embed.js writes plan.js beside the page, carrying plan.json; check.js says so", !side.error && JSON.stringify(side.data) === JSON.stringify(LIVE) && /ok {4}plan\.js carries plan\.json/.test(c1.stdout) && c1.status === 0, side.error || lines(c1, /plan\.js|^FAIL/)]);
    fs.writeFileSync(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(B2, null, 2)));
    const c2 = node(checkJs, dir, "--root", tree), e2 = node(embedJs, dir, "--check");
    lc.push(["F: check.js and embed.js --check fail a plan.js that differs from plan.json", c2.status === 1 && /plan\.js differs from plan\.json: run embed\.js/.test(c2.stdout) && e2.status === 1 && /sidecar plan\.js differs/.test(e2.stdout), lines(c2, /plan\.js/) + " · " + (e2.stdout || "").trim()]);
    fs.unlinkSync(path.join(dir, "plan.js")); const c3 = node(checkJs, dir, "--root", tree);
    lc.push(["F: check.js warns when plan.js is missing", c3.status === 0 && /plan\.js is missing beside the page/.test(c3.stdout), lines(c3, /plan\.js/)]);
    /* check.js on the step panel's facts */
    const bad = copy(LIVE); Object.assign(bad.wip, { event: { name: "research-finished" }, research: { phase: "drafting" }, interview: [{ answer: "x" }], plan: { state: "re-pass" }, stages: [{ id: "A", state: "current" }, { id: "B", state: "current" }] });
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(bad, null, 2) + "\n"); node(embedJs, dir); const c4 = node(checkJs, dir, "--root", tree);
    lc.push(["check.js fails an unknown event, research phase, an interview question with no text, a re-pass with no source, two current stages", c4.status === 1 && /wip\.event must be/.test(c4.stdout) && /wip\.research must be/.test(c4.stdout) && /wip\.interview\[0\] needs its text/.test(c4.stdout) && /a re-pass names where it comes from/.test(c4.stdout) && /more than one "current" stage/.test(c4.stdout), lines(c4, /^FAIL/)]);
    const ok = copy(V.verifying); ok.wip.event = { name: "verification-started", at: "2026-10-25T09:35:00Z" };
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(ok, null, 2) + "\n"); node(embedJs, dir); const c5 = node(checkJs, dir, "--root", tree);
    lc.push(["check.js takes the new events (research-planning, verification-started) and a verification with its questions verifying", c5.status === 0 && lib.EVENTS.includes("research-planning") && lib.EVENTS.includes("verification-started") && !/wip\.(event|research)/.test(lines(c5, /^(FAIL|warn)/)), lines(c5, /^(FAIL|warn).*wip/) || "clean"]);
    /* new.js lays the new fields */
    const nroot = path.join(sc, "new"); fs.mkdirSync(path.join(nroot, "docs", "plans"), { recursive: true });
    const nr = cp.spawnSync(process.execPath, [path.join(SKILL, "plan", "scripts", "new.js"), "901", "panel", "--root", nroot, "--level", "3", "--repo", "owner/name"], { encoding: "utf8", cwd: nroot });
    let nw = null; try { nw = JSON.parse(fs.readFileSync(path.join(nroot, "docs", "plans", "901-panel", "plan.json"), "utf8")).wip; } catch (e) { /* below */ }
    lc.push(["new.js lays the step panel's fields (research, interview, plan, stages, remediation, the sized event) and writes plan.js", nr.status === 0 && !!nw && nw.research === null && Array.isArray(nw.interview) && Array.isArray(nw.stages) && nw.event && nw.event.name === "sized" && fs.existsSync(path.join(nroot, "docs", "plans", "901-panel", "plan.js")), (nr.stdout || nr.stderr || "").split(/\r?\n/)[0]]);
  }
  /* E and F on the work board */
  if (btpl && chrome) {
    const wb = J("verify/fixtures/work-board-live.json"), h = copy(wb), r47 = h.rows.find(r => r.issue === 47); Object.assign(r47, { status: "halted", active: false, step: "halted" });
    const wdir = path.join(sc, "wb"); fs.mkdirSync(wdir, { recursive: true }); const wf = path.join(wdir, "index.html");
    const h2 = copy(h); h2.generated = "2026-10-25T09:00:00Z"; h2.rows.find(r => r.issue === 62).detail = "Verification case: the live work board moved on.";
    fs.writeFileSync(wf, withData(BT, "board", JSON.stringify(h, null, 2))); fs.writeFileSync(path.join(wdir, "board.js"), lib.sidecarText("board", JSON.stringify(h2, null, 2)));
    const dW = dumpDom(wf, "", null, 9000), row = (dW.match(/<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*>#47<[\s\S]*?<\/tr>/) || [""])[0];
    lc.push(["E: a halted run's row on the work board keeps the still ring, with its legend entry", /class="vp warning held"><i aria-hidden="true">⏸<\/i>waiting on the user/.test(row) && /ring alone, still: being worked on, paused while the run waits on the user/.test(inner(dW, '<div class="key" id="runs-key">', "div")), row.slice(0, 300)]);
    lc.push(["F: the live work board re-loads board.js and redraws in place, LIVE · updated", /Verification case: the live work board moved on\./.test(dW) && /LIVE · updated \d+ s ago/.test(text(inner(dW, '<span class="livechip[^"]*" id="live"[^>]*>', "span"))), text(inner(dW, '<span class="livechip[^"]*" id="live"[^>]*>', "span"))]);
    const cf = path.join(sc, "wb-committed", "index.html"); fs.mkdirSync(path.dirname(cf), { recursive: true }); fs.writeFileSync(cf, withData(BT, "board", fs.readFileSync(sk("verify/fixtures/work-board.json"), "utf8")));
    const dC = dumpDom(cf);
    lc.push(["F: the committed work board does not poll: not live · as of its generated time", /not live · as of/.test(text(inner(dC, '<span class="livechip[^"]*" id="live"[^>]*>', "span"))), text(inner(dC, '<span class="livechip[^"]*" id="live"[^>]*>', "span"))]);
  } else lc.push(["the rendered work board (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  /* G. the theme switch on every dashboard type: a click picks the other palette and remembers it; a later page applies the choice before
     its first paint; before any click the page follows the system setting (the button says which) */
  if (chrome) {
    const probe = `<script>window.addEventListener("load",()=>setTimeout(()=>{ const b=document.getElementById("theme"), r=document.documentElement; const before=(r.dataset.theme||"none")+"/"+(b?b.textContent:"no button"); if(b) b.click(); const after=r.dataset.theme+"/"+localStorage.getItem("dashboards-theme")+"/"+b.textContent; if(b) b.click(); document.body.dataset.theme=[before,after,r.dataset.theme+"/"+localStorage.getItem("dashboards-theme")].join("|"); },500));</script>`;
    const pages = [["a plan board", ptpl, "plan", "plan/examples/38-handshake-empty-name/plan.json"], ["a tracking board", ptpl, "plan", "verify/fixtures/tracking.plan.json"], ["the work board", btpl, "board", "verify/fixtures/work-board.json"], ["a system page", tp("system/template/system.html"), null, null], ["a supersystem or repository page", tp("system/template/supersystem.html"), null, null]];
    pages.forEach(([what, tpath, block, fx], i) => { if (!tpath) return; const html = fs.readFileSync(tpath, "utf8"), f = path.join(sc, "theme-" + i, block === "board" ? "index.html" : block ? "dashboard.html" : "index.html");
      fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, (block ? withData(html, block, fs.readFileSync(sk(fx), "utf8")) : html).replace("</body>", probe + "</body>"));
      const d = dumpDom(f), got = ((d || "").match(/data-theme="([^"]*)"/g) || []).map(x => x.slice(12, -1)).pop() || "";
      lc.push([`G: ${what}: the theme switch follows the system setting until clicked, then picks the other palette and remembers it`, /^none\/☀ light\|dark\/dark\/☾ night\|light\/light$/.test(got) && /<head>[\s\S]*?localStorage\.getItem\("dashboards-theme"\)[\s\S]*?<\/head>/.test(html), got || "no probe result"]); });
  } else lc.push(["the theme switch (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  report("the step panel, research rings, the charging arrow, live updates and the theme switch (dashboards-skill/17)", lc);
}

/* The decisions of dashboards-skill/18 (2026-10-25), on every dashboard type they fit (GUIDANCE.md §11):
   1. no glow cap: the exact cells being worked on glow however many (check.js and check-page.js set no count limit); between the last
      research-returned and verification-started the returned questions' rows glow (the glow-map cases above);
   2. a boardless work-board row closed as not planned reads "closed · not planned", never landed (lib.js boardlessState(), check.js,
      the rendered row, its legend entry, the Landed count, a roadmap item and a waits-on entry);
   3. a tracking board's wip.next skips a unit left for later (lib.js nextUnit(), check.js, the page);
   4. release.unreleased: a new artifact with no release quiets check.js's two release warnings, is held to its form, and the Impact
      tab says "new, unreleased";
   5. the plan step's re-pass verifying an existing plan (from "existing", against a ref) in the step panel, and check.js on it;
   6. the richer event facts: an interview question's options, a qa pass's severity (minor, other) and route, a remediation's route and
      its sub-steps by name, each in the step panel, and check.js on their forms;
   7. the as-built states before the outcome: in progress (a current stage) and partially built (a done stage, a later one to come),
      derived from wip.stages, solid, each with its legend entry; a unit whose run is under way reads in progress; check.js on them;
   8. open points (wip.open): listed in the step panel until resolved, mirrored for a unit, and check.js on their form. */
{ const yc = [], sc = path.join(out, "decisions-18"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const J = n => JSON.parse(fs.readFileSync(sk(n), "utf8")), copy = x => JSON.parse(JSON.stringify(x)), tp = name => (targets.find(t => t.name === name) || {}).path;
  const text = h => (h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
  const lib = require(path.join(SKILL, "plan", "scripts", "lib.js"));
  const ptpl = tp("plan/template/dashboard.html"), btpl = tp("plan/template/board.html"), PT = ptpl ? fs.readFileSync(ptpl, "utf8") : "", BT = btpl ? fs.readFileSync(btpl, "utf8") : "";
  const LIVE = J("verify/fixtures/live-issue.plan.json"), EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), ids = LIVE.rows.map(r => r.id);
  const tree = path.join(sc, "tree");
  /* check.js on a board written into a scratch repository (embed.js first, as at every event) */
  const chk = d => { const dir = path.join(tree, ...String(d.folder || `docs/plans/${d.slug}`).split("/")); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "dashboard.html"), PT); node(embedJs, dir); return node(checkJs, dir, "--root", tree); };
  const render = (name, d, hash) => { const dir = path.join(sc, name); fs.mkdirSync(dir, { recursive: true }); const f = path.join(dir, "dashboard.html");
    fs.writeFileSync(f, withData(PT, "plan", JSON.stringify(d, null, 2))); fs.writeFileSync(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); return dumpDom(f, hash || ""); };
  const light = name => cp.spawnSync(process.execPath, [checker, path.join(sc, name, "dashboard.html"), "--out", path.join(sc, name)], { encoding: "utf8" });
  const strip = dom => inner(dom, '<section class="wip[^"]*" id="wip"[^>]*>', "section"), panel = dom => inner(strip(dom), '<div class="sp[^"]*"[^>]*>', "div");
  const cellOf = (dom, col, id) => inner(dom || "", `<div class="cell ${col}[^"]*"[^>]*data-row="${id}"[^>]*>`, "div"), cellTag = (dom, col, id) => ((dom || "").match(new RegExp(`<div class="cell ${col}[^"]*"[^>]*data-row="${id}"`)) || [""])[0];
  const live = f => { const d = copy(LIVE); f(d, d.wip); return d; };
  const built = d => { d.status = "building"; d.wip.questions = []; d.wip.research = null; d.rows.forEach(r => { r.verdict = { kind: "build", summary: "Verification case: written.", steps: [{ id: "A", what: "x" }] }; }); };
  /* 1. no glow cap */
  { const d = live((d, w) => { built(d); w.step = "implementation"; w.current = ids.map(id => id + ".built"); w.stages = [{ id: "A", name: "Everything at once", state: "current", rows: ids.slice() }]; });
    const c = chk(d);
    yc.push([`1: ${ids.length} exact As built cells glowing: check.js passes, quiet on the glow, no count limit`, c.status === 0 && /keeps the step-to-column map at "implementation"/.test(c.stdout) && !/glow at once|rows glow/.test(c.stdout), lines(c, /glow|^FAIL/) || "nothing"]);
    if (chrome) { const dom = render("glow-all", d), n = (dom.match(/<div class="cell built[^"]* glow[ "]/g) || []).length, r = light("glow-all");
      yc.push([`1: the page draws all ${ids.length} glowing cells, and check-page.js counts them with no limit`, n === ids.length && r.status === 0 && new RegExp(`CHECK glow: \\d+$`, "m").test(r.stdout) && !/TOO MANY/.test(r.stdout), `${n} drawn · ${lines(r, /CHECK glow|FAIL/)}`]); } }
  { const g = lib.researchGlow(live((d, w) => { w.questions = [{ question: "q-one", rows: [ids[0], ids[1]], findings: "research/q-one.md", state: "returned" }, { question: "q-two", rows: [ids[2]], findings: "research/q-two.md", state: "returned" }]; }));
    yc.push(["1: lib.js researchGlow(): every question returned, the verification not started: the returned questions' rows, no fallback", !g.fallback && g.phase === "waiting" && JSON.stringify(g.current) === JSON.stringify(ids.slice(0, 3).map(id => id + ".considered")), JSON.stringify(g)]); }
  /* 2. closed as not planned */
  const B = lib.boardlessState;
  yc.push(["2: boardlessState(): closed as not planned reads not-planned; closed as completed, landed", B(86, "CLOSED", [], [], [], [], "NOT_PLANNED").status === "not-planned" && B(86, "CLOSED", [], [], [], [], "COMPLETED").status === "landed" && B(86, "OPEN", [], [], [], [], null).status === "not-started", "rule"]);
  if (btpl) { const wb = J("verify/fixtures/work-board.json"), dir = path.join(sc, "wtree", "docs", "plans");
    const wchk = d => { fs.rmSync(path.join(sc, "wtree"), { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); (d.rows || []).filter(r => r.board).forEach(r => stub(path.join(dir, path.dirname(r.board))));
      fs.writeFileSync(path.join(dir, "board.json"), JSON.stringify(d, null, 2) + "\n"); fs.writeFileSync(path.join(dir, "index.html"), BT); node(embedJs, dir); return node(checkJs, dir, "--root", path.join(sc, "wtree")); };
    const bad = (what, f, re) => { const d = copy(wb); f(d.rows.find(r => r.issue === 85), d.rows.find(r => r.issue === 84)); const r = wchk(d); yc.push([`2: check.js fails ${what}`, r.status === 1 && re.test(r.stdout), lines(r, /^FAIL/)]); };
    bad("a row closed as not planned that reads landed", r => { r.status = "landed"; }, /closed as not planned: the row reads "not-planned"/);
    bad("a not-planned row without the tracker's NOT_PLANNED", r => { delete r.stateReason; }, /not-planned needs the tracker's stateReason NOT_PLANNED/);
    bad("a not-planned row whose issue is open", r => { r.state = "OPEN"; delete r.stateReason; }, /not-planned means the issue is closed as not planned/);
    if (chrome) { const w2 = copy(wb), it = (w2.roadmap[0].items || [])[3]; it.state = "CLOSED"; it.stateReason = "NOT_PLANNED"; const r80 = w2.rows.find(r => r.issue === 80); r80.waitsOn = [{ issue: 85, state: "CLOSED", stateReason: "NOT_PLANNED" }];
      const f = path.join(sc, "wb", "index.html"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, withData(BT, "board", JSON.stringify(w2, null, 2)));
      const dW = dumpDom(f), row = n => (dW.match(new RegExp(`<tr class="run[^"]*"[^>]*><td><span class="t"><a [^>]*>#${n}<[\\s\\S]*?</tr>`)) || [""])[0], key = inner(dW, '<div class="key" id="runs-key">', "div");
      yc.push(["2: the work board: the row closed as not planned reads \"closed · not planned\", solid and neutral, not glowing", /^<tr class="run"/.test(row(85)) && /vp neutral"><i aria-hidden="true">⊖<\/i>closed · not planned/.test(row(85)) && !/glow|landed/.test(row(85).replace(/<a [^>]*>[^<]*<\/a>/g, "")), text(row(85)).slice(0, 120)]);
      yc.push(["2: its legend entry, and the Landed tile counts it apart", /closed · not planned<\/span> no board: closed on the tracker as not planned/.test(key) && /1 closed as not planned, not counted/.test(text(inner(dW, '<div class="kpis" id="kpis">', "div"))), text(key).slice(0, 300)]);
      yc.push(["2: a roadmap item and a waits-on entry closed as not planned say so", /<small>closed · not planned<\/small>/.test(dW) && /#85<\/a>[^<]*<small> closed · not planned<\/small>/.test(row(80)), text(row(80)).slice(0, 160)]);
      const r = cp.spawnSync(process.execPath, [checker, f, "--out", path.dirname(f)], { encoding: "utf8" });
      yc.push(["2: the work board with the row passes check-page.js", r.status === 0, lines(r, /FAIL|ERROR|DASHED|NO LEGEND/)]); } }
  if (chrome) { const s = copy(J("verify/fixtures/sub-issue.plan.json")); const it = s.roadmap.items[2]; it.state = "closed"; it.stateReason = "NOT_PLANNED";
    const dom = render("roadmap-np", s); yc.push(["2: a plan board's roadmap item closed as not planned reads \"closed · not planned\"", /closed · not planned/.test(text(dom)), "context"]); }
  /* 3. wip.next skips a unit left for later */
  { const tk = copy(TRK), nx = tk.rows.find(r => r.id === tk.wip.next); nx.verdict = { ...(nx.verdict || {}), kind: "leave", summary: "Verification case: this unit is left as is." };
    const want = lib.nextUnit(tk), c1 = chk(tk);
    yc.push(["3: lib.js nextUnit() skips the unit left for later", !!want && want.id !== nx.id && !lib.leftForLater(want), want ? want.id : "null"]);
    yc.push(["3: check.js fails a wip.next that names a unit left for later, naming the next one", c1.status === 1 && /names a unit left for later/.test(c1.stdout) && new RegExp(`next unit in landing order is "${want.id}"`).test(c1.stdout), lines(c1, /wip\.next/)]);
    const tk2 = copy(tk); tk2.wip.next = want.id; const c2 = chk(tk2);
    yc.push(["3: with wip.next on the following unit check.js says nothing about it", !/wip\.next/.test(lines(c2, /^(FAIL|warn)/)), lines(c2, /wip\.next/) || "quiet"]);
    if (chrome) { const dom = render("next-leave", tk); yc.push(["3: the page never tags a unit left for later UP NEXT", !/UP NEXT/.test(cellOf(dom, "built", nx.id)), text(cellOf(dom, "built", nx.id)).slice(0, 120)]); } }
  /* 4. release.unreleased */
  { const base = m => { const d = copy(EX); d.level = 3; d.impact = { basis: "as-built", summary: "Verification case: a new module.", none: null, release: { bump: "none", version: null, ...(m || {}) },
      downstream: [{ who: "`acme:widgets-new` (new artifact)", kind: "artifact", effect: "additive", summary: "Verification case: a new artifact with no release yet.", system: d.systems[0].slug }], adaptation: [], api: [], conversion: [], changes: [], source: "impact.md" }; return d; };
    const c0 = chk(base()), c1 = chk(base({ unreleased: true })), c2 = chk(base({ unreleased: true, bump: "feat" })), d3 = base({ unreleased: true }); d3.impact.downstream[0].kind = "consumer"; const c3 = chk(d3), c4 = chk(base({ unreleased: "yes" }));
    yc.push(["4: without the mark a new artifact with no bump draws both release warnings", /takes a feat: release/.test(c0.stdout) && /says explicitly that it has no downstream effect/.test(c0.stdout), lines(c0, /release|feat/)]);
    yc.push(["4: release.unreleased: true quiets both, and check.js says why", !/takes a feat: release|says explicitly that it has no downstream effect/.test(c1.stdout) && /release\.unreleased — the artifact is new and unreleased/.test(c1.stdout), lines(c1, /release|feat/)]);
    yc.push(["4: the mark with a bump, or with no artifact entry, warns; a mark that is not true fails", /keep bump "none"/.test(c2.stdout) && /no downstream entry of kind artifact/.test(c3.stdout) && c4.status === 1 && /release\.unreleased is true/.test(c4.stdout), [lines(c2, /unreleased/), lines(c3, /unreleased/), lines(c4, /^FAIL/)].join(" || ")]);
    if (chrome) { const dom = render("unreleased", base({ unreleased: true }), "impact"), body = inner(dom, '<div[^>]*id="impact-body"[^>]*>', "div"), r = light("unreleased");
      yc.push(["4: the Impact tab's version badge says new, unreleased, and its legend says what it means; check-page.js passes it", /version · no version moves · new, unreleased: its first release is its own/.test(text(body)) && /new, unreleased: the artifact has no release yet/.test(text(inner(dom, '<div class="key" id="impact-key">', "div"))) && r.status === 0, text(body).slice(0, 200) + " · " + lines(r, /FAIL|IMPACT/)]); } }
  /* 5-8. the step panel's new facts */
  const V = {
    existing: live((d, w) => { w.step = "halted"; w.resume = "plan"; w.waitingOn = "Verification case: accept the verification's deltas."; w.current = ["considered", "verdict"]; w.questions = []; w.research = null; w.plan = { state: "re-pass", from: "existing", against: "main" }; }),
    interview: live((d, w) => { w.step = "interview"; w.current = []; w.questions = []; w.research = null; w.interview[1] = { text: "Verification case: which reply?", options: ["Refuse with a reason", "Trim and accept"], answer: null, asked: "2026-10-25T07:31:00Z" }; }),
    qa: live((d, w) => { built(d); w.step = "remediation"; w.current = [ids[0] + ".built"]; w.qa = [{ pass: 1, verdict: "changes-requested", findings: { documentation: 2, test: 1, code: 1 }, severity: { minor: 3, other: 1 }, route: "planner-then-rookie-dev" }]; w.remediation = { pass: 1, route: "planner-then-rookie-dev" }; }),
    spot: live((d, w) => { built(d); w.step = "remediation"; w.current = [ids[0] + ".built"]; w.qa = [{ pass: 1, verdict: "changes-requested", findings: { documentation: 2 }, severity: { minor: 2 }, route: "on-the-spot" }]; w.remediation = { pass: 1, route: "on-the-spot", steps: [{ name: "Verification case: the wording fixes", state: "current" }] }; }),
    staged: live((d, w) => { built(d); w.step = "implementation"; d.rows[0].asBuilt = { state: "as-planned", summary: "Verification case: built in A." }; d.rows[1].asBuilt = { state: "pending", summary: "Verification case: A built the rule; C builds the reply." };
      w.stages = [{ id: "A", name: "The rule", state: "done", rows: [ids[0], ids[1]] }, { id: "B", name: "Routing", state: "current", rows: [ids[2]] }, { id: "C", name: "The reply", state: "todo", rows: [ids[1], ids[3]] }]; w.current = [ids[2] + ".built"];
      w.open = [{ text: "Verification case: the plan's media-type rows disagree with its grammar.", raised: "implementation-stage A", ref: "plan.md" }, { text: "Verification case: settled earlier.", raised: "implementation-stage A", resolved: "The planner corrected plan.md." }]; })
  };
  const D = chrome ? Object.fromEntries(Object.keys(V).map(k => [k, render("v-" + k, V[k])])) : {};
  if (chrome) {
    const pE = panel(D.existing);
    yc.push(["5: a plan verification: the re-pass verifying the existing plan against main, held still while halted", /re-pass verifying the existing plan against main/.test(text(pE)) && /verifies the plan already written against main as it stands now/.test(text(pE)) && /class="cur held"/.test(pE), text(pE).slice(0, 260)]);
    const pI = panel(D.interview);
    yc.push(["6: an interview question lists its options", /<ul class="sp-opts"><li>Refuse with a reason<\/li><li>Trim and accept<\/li><\/ul>/.test(pI), text(pI).slice(0, 260)]);
    const pQ = panel(D.qa), pS = panel(D.spot);
    yc.push(["6: a qa pass shows its severity (minor, other) and its route; a planner-then-rookie-dev remediation lists its loop", /by severity: 3 minor · 1 other/.test(pQ) && /route: a remediation pass: a planner re-pass, then rookie-dev, then the next qa pass/.test(text(pQ)) && /Planner re-pass for qa pass 1/.test(pQ) && /rookie-dev fixes/.test(pQ) && /qa pass 2/.test(pQ), text(pQ).slice(0, 400)]);
    yc.push(["6: an on-the-spot remediation: its sub-steps by name, next landing with no new qa pass", /Verification case: the wording fixes · in progress/.test(text(pS)) && /next: landing \(no new qa pass\)/.test(text(pS)) && /fixed on the spot, no new qa pass/.test(text(pS)), text(pS).slice(0, 300)]);
    const dS = D.staged, st = id => (cellOf(dS, "built", id).match(/<span class="vp ([^"]*)"><i aria-hidden="true">([^<]*)<\/i>([^<]*)/) || []).slice(1).join("|");
    yc.push(["7: the stages decide the state: a done row as planned, one with a stage to come partially built, the current one in progress, one only to come pending", st(ids[0]) === "good|✓|as planned" && st(ids[1]) === "ink|◑|partially built" && st(ids[2]) === "accent|▶|in progress" && st(ids[3]) === "neutral dashed|…|pending", [0, 1, 2, 3].map(i => st(ids[i])).join(" ; ")]);
    yc.push(["7: in progress and partially built are solid, each with its legend entry; the tile does not count them built", !/dashed/.test(cellTag(dS, "built", ids[1])) && !/dashed/.test(cellTag(dS, "built", ids[2])) && /in progress<\/span> being built: a current stage works on it/.test(inner(dS, '<div class="key" id="timeline-key">', "div")) && /partially built<\/span> a finished stage built part of it/.test(inner(dS, '<div class="key" id="timeline-key">', "div")) && /^1 \/ /.test((text(inner(dS, '<div class="kpis" id="kpis">', "div")).match(/As built (.*?) (QA passes|Timeline)/) || ["", ""])[1]), text(inner(dS, '<div class="kpis" id="kpis">', "div")).slice(0, 200)]);
    yc.push(["7: lib.js builtState() agrees with the page", lib.builtState(V.staged, V.staged.rows[1]) === "partially-built" && lib.builtState(V.staged, V.staged.rows[2]) === "in-progress" && lib.builtState(V.staged, V.staged.rows[3]) === "pending" && lib.builtState(V.staged, V.staged.rows[0]) === "as-planned", "rule"]);
    const pO = panel(dS);
    yc.push(["8: the open points still open are listed in the step panel with where they were raised; a resolved one is not", /1 open point/.test(text(pO)) && /the plan's media-type rows disagree/.test(text(pO)) && /raised at implementation-stage A/.test(text(pO)) && !/settled earlier/.test(pO) && /an open point raised during the run/.test(strip(dS)), text(inner(pO, '<div class="sp-open">', "div")).slice(0, 200)]);
    ["existing", "qa", "staged"].forEach(k => { const r = light("v-" + k); yc.push([`the ${k} variant passes check-page.js`, r.status === 0, lines(r, /FAIL|DASHED|ERROR|NO LEGEND/)]); });
    const tk = copy(TRK); tk.wip.current = [...tk.wip.current, "http-core.built"]; tk.wip.next = lib.nextUnit(tk).id; const dT = render("unit-running", tk), hc = tk.rows.find(r => r.id === "http-core");
    yc.push(["7: a tracking board's unit whose run is under way reads in progress; lib.js agrees", /▶<\/i>in progress/.test(cellOf(dT, "built", "http-core")) && lib.builtState(tk, hc) === "in-progress", text(cellOf(dT, "built", "http-core")).slice(0, 120)]);
  } else yc.push(["the rendered boards (no browser found: set CHROME)", false, "no Chrome or Edge"]);
  /* check.js on the new facts' forms */
  { const bad = copy(V.qa); bad.wip.qa[0].route = "fast"; bad.wip.remediation.route = "later"; bad.wip.interview = [{ text: "x", options: [""] }]; bad.wip.plan = { state: "writing", against: "main" }; bad.wip.open = [{ text: "an open point" }];
    const c = chk(bad);
    yc.push(["6, 8: check.js fails a bad route, an empty option, against on a writing pass, an open point without raised", c.status === 1 && /wip\.qa\[0\]\.route must be one of/.test(c.stdout) && /wip\.remediation\.route must be one of/.test(c.stdout) && /options must be an array/.test(c.stdout) && /wip\.plan\.against names the ref/.test(c.stdout) && /wip\.open\[0\]\.raised names the event or stage/.test(c.stdout), lines(c, /^FAIL/)]);
    const okc = chk(V.qa); yc.push(["6: check.js takes the qa pass's severity and route and the remediation's route", !/route|severity/.test(lines(okc, /^(FAIL|warn)/)), lines(okc, /^(FAIL|warn)/) || "clean"]);
    const ex2 = chk(V.existing); yc.push(["5: check.js takes a re-pass from existing against main", !/wip\.plan/.test(lines(ex2, /^(FAIL|warn)/)), lines(ex2, /wip\.plan/) || "clean"]); }
  { const s1 = copy(V.staged); s1.rows[1].asBuilt = { state: "as-planned", summary: "x" }; s1.rows[2].asBuilt = { state: "partially-built", summary: "" }; s1.rows[4].asBuilt = { state: "in-progress" };
    const c = chk(s1);
    yc.push(["7: check.js fails a partially built row with no summary, and warns on an outcome a later stage contradicts and an in-progress no stage bears out", c.status === 1 && /says in asBuilt\.summary what is built and what is left/.test(c.stdout) && /its outcome applies once its last stage is done/.test(c.stdout) && /no stage of wip\.stages that touches the row is current or still to come/.test(c.stdout), lines(c, /asBuilt|FAIL/)]);
    const tk = copy(TRK), u = tk.rows.find(r => r.id === "http-core"); u.asBuilt = { state: "partially-built", summary: "x" }; const ct = chk(tk);
    yc.push(["7: check.js fails a partially built unit row: a unit lands whole", ct.status === 1 && /a unit lands whole/.test(ct.stdout), lines(ct, /^FAIL/)]);
    const s2 = copy(V.staged); s2.wip.open[1].resolved = "settled"; const c2 = chk(s2);
    yc.push(["8: check.js warns on a resolved open point the trail does not record", /is resolved, but the trail records no entry for it/.test(c2.stdout), lines(c2, /open/)]);
    const run = lib.unitRun({ status: "building", wip: { step: "implementation", open: V.staged.wip.open }, rows: [] });
    yc.push(["8: a unit's mirror carries its open points (lib.js panelFacts())", Array.isArray(run.open) && run.open.length === 2, JSON.stringify(run.open || null).slice(0, 80)]); }
  report("no glow cap, closed as not planned, next skips left for later, unreleased artifacts, plan verification, the richer event facts, the as-built states before the outcome, open points (dashboards-skill/18)", yc);
}

const today = new Date().toISOString().slice(0, 10);
targets.forEach(t => {
  const tpl = fs.readFileSync(t.path, "utf8"), results = [];
  t.fixtures.forEach(fx => {
    const label = fx ? path.basename(fx, ".json").replace(/\.plan$/, "") : "placeholder";
    const dir = path.join(out, path.basename(t.file, ".html") + "-" + label);
    fs.mkdirSync(dir, { recursive: true });
    const page = path.join(dir, t.block === "board" ? "index.html" : t.block ? "dashboard.html" : "index.html");
    fs.writeFileSync(page, fx ? withData(tpl, t.block, fs.readFileSync(fx, "utf8")) : tpl);
    if (t.block) fs.writeFileSync(path.join(dir, t.block === "board" ? "board.js" : "plan.js"), require(path.join(SKILL, "plan", "scripts", "lib.js")).sidecarText(t.block, fx ? fs.readFileSync(fx, "utf8") : "{}"));
    MODES.forEach(m => {
      const r = cp.spawnSync(process.execPath, [checker, page, "--out", dir, ...m], { encoding: "utf8" });
      const lines = (r.stdout || "").split(/\r?\n/);
      results.push({ fixture: label, mode: m.join(" ") || "light", pass: r.status === 0, bad: lines.filter(l => /FAIL|ERROR|NOT VISIBLE|NO LEGEND|MISSING|WRONG|DEAD|TOO MANY|HORIZONTAL|LEVEL REFERENCE|RAW UTC STAMP|PALETTE IN STATUS HUE|IMPACT SHOWS PLANNING|DASHED NOT PLANNED|FOOTER NOT IN ITS FORM/.test(l)) });
    });
  });
  const ok = results.every(r => r.pass);
  console.log(`${ok ? "verified" : "FAILED  "} ${t.name}${root ? " (" + path.relative(path.resolve(root), t.path).split(path.sep).join("/") + ")" : ""}: ${results.filter(r => r.pass).length}/${results.length} passes`);
  results.filter(r => !r.pass).forEach(r => console.log(`  ${r.fixture} · ${r.mode}: ${r.bad.join(" | ")}`));
  if (!ok) { failures++; return; }
  if (linkFailures) { console.log(`  not recorded: a case group above failed`); failures++; return; }
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
