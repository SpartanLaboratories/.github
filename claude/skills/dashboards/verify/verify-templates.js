#!/usr/bin/env node
// Verify the dashboard templates once, so pages made from them need not be (GUIDANCE.md §8).
//   node verify/verify-templates.js [--root <repo>] [--out <dir>]
// Renders each template with its fixtures into a scratch folder and runs system/scripts/check-page.js on every rendering, in
// light, dark, 520 px and a 390 px frame. When every pass of a template passes, records the template's sha256 in
// verify/verified.json (the skill's templates) or in <repo>/docs/{plans,dashboards}/_template/verified.json (a repository's own
// templates, with --root). check-page.js --auto and plan/scripts/check.js --auto then skip the browser pass for a page that is a
// verified template plus its data, and give a system page whose structure is the template's one light pass. Run it after every
// change to a template; until then, every page made from that template gets the full pass.
// The fixtures cover each template's states: the issue board example (landed, every option verdict and as-built state), the
// tracking fixture (a landed, a complete and an in-progress unit, the unit up next and blocked), the work board fixture (landed,
// complete, building, next, not started; and its live variant from board.js --live) and each template's own placeholder content.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const { recordFile, sha, norm } = require(path.join(__dirname, "..", "system", "scripts", "deviation.js"));
const SKILL = path.resolve(__dirname, "..");
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(opt("out", path.join(os.tmpdir(), "dashboards-verify")));
const checker = path.join(SKILL, "system", "scripts", "check-page.js");
const MODES = [[], ["--theme", "dark"], ["--width", "520"], ["--frame", "390"]];
const sk = p => path.join(SKILL, ...p.split("/"));

/* Each template, the block its data goes in (none for system templates, which carry their own sample content), and its fixtures. */
const PLAN_FIX = [sk("plan/examples/38-handshake-empty-name/plan.json"), sk("verify/fixtures/tracking.plan.json"), null];
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
let failures = 0;
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
      results.push({ fixture: label, mode: m.join(" ") || "light", pass: r.status === 0, bad: lines.filter(l => /FAIL|ERROR|NOT VISIBLE|NO LEGEND|MISSING|WRONG|DEAD|TOO MANY|HORIZONTAL/.test(l)) });
    });
  });
  const ok = results.every(r => r.pass);
  console.log(`${ok ? "verified" : "FAILED  "} ${t.name}${root ? " (" + path.relative(path.resolve(root), t.path).split(path.sep).join("/") + ")" : ""}: ${results.filter(r => r.pass).length}/${results.length} passes`);
  results.filter(r => !r.pass).forEach(r => console.log(`  ${r.fixture} · ${r.mode}: ${r.bad.join(" | ")}`));
  if (!ok) { failures++; return; }
  const { file, key } = recordFile(t.path);
  let rec = {}; try { rec = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { /* first record */ }
  rec.$comment = "Written by verify/verify-templates.js: each template's sha256 (line endings normalised to LF) at its last full verification. check-page.js --auto and check.js --auto trust a template only while its hash matches.";
  rec.templates = rec.templates || {};
  rec.templates[key] = { sha256: sha(tpl), verified: today, fixtures: [...new Set(results.map(r => r.fixture))], modes: MODES.map(m => m.join(" ") || "light") };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rec, null, 2) + "\n");
});
console.log(failures ? `\n${failures} template(s) failed: not recorded; fix them and run again` : `\nall templates verified; screenshots in ${out}`);
process.exit(failures ? 1 : 0);
