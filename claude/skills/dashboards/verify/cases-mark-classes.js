// The cases of the marks' classes (the user's nomenclature decisions of 2026-11-07, dated 48; GUIDANCE.md §1, §12; nomenclature/ui.md,
// nomenclature/boards.md "Board UI"), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
// node verify/cases-mark-classes.js [--out <dir>].
// "Glow" is retired: the in-progress mark is a FullPulse, the column at work its column's FullPulse, the up-next mark a still outer Ring,
// the live indicator's dot a FillPulse. Class names only, drawn as before:
// 1. The issue board template and the repository work board template carry .fullpulse, .upnext-ring and .fillpulse (the issue board's also
//    .col-fullpulse and .colcell-fullpulse), in their CSS and in the class strings their renderers write, and none of the older classes.
// 2. The feature probe (mark-classes) passes both templates and fails a board drawn before (the older classes), naming them.
// 3. check-board.js's browser pass counts the FullPulse marks, a board drawn before included (.fullpulse, .glow).
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* the renames, newest first, so a board drawn before can be stood in for by renaming a template back */
const RENAMES = [["col-fullpulse", "glow-soft"], ["colcell-fullpulse", "colglow"], ["dot-fullpulse", "glowdot"], ["svg-fullpulse", "svgglow"], ["fullpulse", "glow"], ["upnext-ring", "upnext"], ["fillpulse", "pulse"]];
const back = h => RENAMES.reduce((s, [n, o]) => s.split(n).join(o), h);

module.exports = function casesMarkClasses(X) {
  const { sk, targets } = X;
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const F = require(sk("system/scripts/features.js"));
  const T = { "plan-board": rd(tp("plan/template/dashboard.html")), "work-board": rd(tp("plan/template/board.html")) };
  const css = h => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const OLD = /\.(?:glow|glow-soft|colglow|upnext|pulse)(?![-\w])|" (?:glow|glow-soft|colglow|upnext|pulse)"/g;
  const groups = [];

  { const c = [];
    for (const [k, h] of Object.entries(T)) {
      const s = css(h), old = h.match(OLD) || [];
      c.push([`${k}: .fullpulse, .upnext-ring and .fillpulse in its CSS and its renderer's class strings`, /\.fullpulse\{animation:fullpulse /.test(s) && /(?:^|\n)\.upnext-ring\{/.test(s) && /\.livechip\.on\.fillpulse \.ld\{/.test(s) && /" fullpulse"/.test(h) && /" upnext-ring"/.test(h) && /" fillpulse"/.test(h), "the classes"]);
      if (k === "plan-board") c.push([`${k}: the column's FullPulse (.col-fullpulse) and each of its cells at phone width (.colcell-fullpulse)`, /(?:^|\n)\.col-fullpulse\{animation:col-fullpulse /.test(s) && /\.board \.cell\.colcell-fullpulse\{animation:col-fullpulse /.test(s) && /" col-fullpulse"/.test(h) && /" colcell-fullpulse"/.test(h), "the column's classes"]);
      c.push([`${k}: none of the older classes (.glow, .glow-soft, .colglow, .upnext, .pulse)`, !old.length, old.slice(0, 4).join(", ") || "none"]);
    }
    groups.push(["the marks' classes on the issue board and repository work board templates (dated 48)", c]); }

  { const c = [];
    for (const [k, h] of Object.entries(T)) {
      const now = F.probe(h, k).filter(m => m.id === "mark-classes"), before = F.probe(back(h), k).filter(m => m.id === "mark-classes");
      c.push([`${k}: the probe passes the template`, !now.length, now.map(m => m.why).join("; ") || "passes"]);
      c.push([`${k}: the probe fails a board drawn before, naming its older classes`, before.length === 1 && /\.glow\b/.test(before[0].why) && /\.upnext\b/.test(before[0].why) && /\.pulse\b/.test(before[0].why) && before[0].since === "dashboards-skill/48", before.map(m => F.line(m)).join("; ").slice(0, 220)]);
    }
    const f = F.FEATURES.find(x => x.id === "mark-classes");
    c.push(["the probe is a work board's only: the state boards named with their reason", !!f && !f.types.includes("system") && !f.types.includes("supersystem") && !!(f.notFor && f.notFor.system && f.notFor.supersystem), f ? f.types.join(", ") : "no probe"]);
    groups.push(["the feature probe (mark-classes) on the templates and on a board drawn before", c]); }

  { const c = [], cb = rd(sk("system/scripts/check-board.js"));
    c.push(["check-board.js counts the FullPulse marks, a board drawn before included, and limits none", /document\.querySelectorAll\("\.fullpulse,\.glow"\)\.length; console\.log\("CHECK fullpulse: "/.test(cb) && !/querySelectorAll\("\.glow"\)/.test(cb), "CHECK fullpulse"]);
    groups.push(["check-board.js's count of the in-progress marks", c]); }
  return groups;
};

if (require.main === module) {
  const sk = p => path.join(__dirname, "..", p);
  const groups = module.exports({ sk, out: path.join(os.tmpdir(), "dashboards-verify"), targets: [] });
  let bad = 0;
  groups.forEach(([what, cases]) => { const f = cases.filter(x => !x[1]); bad += f.length; console.log(`${f.length ? "FAILED " : "checked"}  ${what}: ${cases.length - f.length}/${cases.length} cases`); f.forEach(x => console.log(`  FAIL ${x[0]} — ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
