// The Tests tab's data rules (plan/RULES.md §2, "The Tests tab"), shared by apply-event.js, embed.js (through lib.js) and check.js. Not a
// command. A board's plan.json "tests" holds the test classes the change touches, by how: "added" (new on the branch, from the git diff
// against its base), "amended" (existing classes the branch changed), "relevant" (unchanged existing classes that exercise the new code
// anyway: what qa's test-inspector ran on the change, less Added and Amended), and "other" (every other test, counts only per module and
// test level: never run for this change). Each class { class, module, testLevel, path, tests, rows, stage, result }; a class is in one
// list only, Added before Amended before Relevant. A tracking board records none of its own: embed.js mirrors each unit's into the unit
// row (unit.tests, with rowNames), and the page sums them. The plan-board template's tlOf(), resOf() and testKey() are the same rules.
"use strict";

const TEST_LISTS = ["added", "amended", "relevant"];
/* The five-level testing hierarchy's levels (CLAUDE.md, "Testing — 5-Level Hierarchy"): test levels, never work levels (GUIDANCE.md §4). */
const TEST_LEVELS = ["1", "2", "3", "4a", "4b", "4c", "5"];
const TEST_LEVEL_SEGMENTS = { gating: "1", component: "2", integration: "3", deterministic: "4a", e2e: "4b", nonfunctional: "4c", uat: "5" };
const TEST_RESULTS = ["passed", "failed", "skipped", "not-run"];
const LEVEL_PATH = /(?:^|[./\\])testing[./\\](gating|component|integration|deterministic|e2e|nonfunctional|uat)(?:[./\\]|$)/;
const STAMP = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const ID = /^[a-z0-9][a-z0-9-]*$/;
const str = v => typeof v === "string" && v.trim().length > 0;
const count = v => Number.isInteger(v) && v >= 0;

/* A class's test level: its own testLevel when it is one, else the level folder its path or package names (testing.<segment>), else null. */
function levelFromPath(e) { const m = LEVEL_PATH.exec(String((e && (e.path || e.class)) || "")); return m ? TEST_LEVEL_SEGMENTS[m[1]] : null; }
function testLevelOf(e) { const v = e && e.testLevel != null ? String(e.testLevel) : null; return v && TEST_LEVELS.includes(v) ? v : levelFromPath(e); }
/* A class's identity across the lists: its module and its class name. */
const testKey = e => `${(e && e.module) || ""}::${e && e.class}`;
/* A result's state: its own when it is one, else what its counts say (a failure fails it). */
function resultState(r) {
  if (!r || typeof r !== "object") return "not-run";
  if (TEST_RESULTS.includes(r.state)) return r.state;
  return r.failed > 0 ? "failed" : r.passed > 0 ? "passed" : r.skipped > 0 ? "skipped" : "not-run";
}
const testsBlock = plan => plan && plan.tests && typeof plan.tests === "object" && !Array.isArray(plan.tests) ? plan.tests : null;
const hasTests = t => !!t && (TEST_LISTS.some(k => Array.isArray(t[k]) && t[k].length) || !!(t.other && t.other.byModule && typeof t.other.byModule === "object" && Object.keys(t.other.byModule).length));

/* One class from the facts, normalised: { entry } or { why } when it cannot be used. o: { ids (the board's row ids), stage, pass, now }. */
function normEntry(x, o, withResult) {
  if (!x || typeof x !== "object" || Array.isArray(x)) return { why: "not an object" };
  const cls = str(x.class) ? x.class.trim() : str(x.name) ? x.name.trim() : null;
  if (!cls) return { why: "no class" };
  const e = { class: cls };
  if (str(x.module)) e.module = x.module.trim();
  const lv = x.testLevel != null ? String(x.testLevel) : x.level != null ? String(x.level) : null;
  const level = lv && TEST_LEVELS.includes(lv) ? lv : levelFromPath({ path: x.path, class: cls });
  if (level) e.testLevel = level;
  if (str(x.path)) e.path = x.path.trim().replace(/\\/g, "/");
  if (count(x.tests)) e.tests = x.tests;
  /* a class qa ran with its counts and no test count of its own: the tests it ran are its count */
  else if (withResult && ["passed", "failed", "skipped"].some(k => count(x[k]) || (x.result && count(x.result[k])))) e.tests = ["passed", "failed", "skipped"].reduce((n, k) => n + (count((x.result || x)[k]) ? (x.result || x)[k] : 0), 0);
  const notes = [];
  if (Array.isArray(x.rows)) { const rows = x.rows.filter(r => typeof r === "string" && ID.test(r)), off = rows.filter(r => o.ids && !o.ids.has(r)); if (off.length) notes.push(`${cls} names rows not on the board (${off.join(", ")}): left out`); e.rows = rows.filter(r => !o.ids || o.ids.has(r)); }
  if (str(x.stage)) e.stage = x.stage.trim(); else if (o.stage && !withResult) e.stage = o.stage;
  const R = x.result && typeof x.result === "object" ? x.result : withResult || ["state", "passed", "failed", "skipped"].some(k => x[k] != null) ? x : null;
  if (R) {
    const r = {}; ["passed", "failed", "skipped"].forEach(k => { if (count(R[k])) r[k] = R[k]; });
    const st = TEST_RESULTS.includes(R.state) ? R.state : resultState(r); r.state = st;
    if (Number.isInteger(R.pass) && R.pass > 0) r.pass = R.pass; else if (o.pass) r.pass = o.pass;
    r.at = str(R.at) && STAMP.test(R.at) ? R.at : o.now;
    e.result = { state: r.state, ...["passed", "failed", "skipped"].reduce((a, k) => (r[k] != null ? { ...a, [k]: r[k] } : a), {}), ...(r.pass ? { pass: r.pass } : {}), at: r.at };
  }
  return { entry: e, notes };
}
/* The other tests' counts: { byModule: { <module>: { <level or "none">: n | { classes, tests } } } }, or null when the facts' are not that. */
function normOther(x) {
  const m = x && typeof x === "object" && x.byModule && typeof x.byModule === "object" && !Array.isArray(x.byModule) ? x.byModule : null;
  if (!m) return null;
  const out = {};
  Object.keys(m).sort().forEach(md => { const lv = m[md]; if (!lv || typeof lv !== "object" || Array.isArray(lv)) return; const row = {};
    [...TEST_LEVELS, "none"].forEach(k => { const v = lv[k]; if (count(v)) row[k] = v; else if (v && typeof v === "object" && count(v.classes)) row[k] = { classes: v.classes, ...(count(v.tests) ? { tests: v.tests } : {}) }; });
    if (Object.keys(row).length) out[md] = row; });
  return Object.keys(out).length ? { byModule: out, ...(str(x.source) ? { source: x.source.trim() } : {}) } : null;
}
/* Apply an event's facts.tests to a board (plan/RULES.md §4): each class of "added", "amended" and "relevant" upserted, a class kept in the
   highest list it has reached (Added, then Amended, then Relevant: a class added on the branch and changed later stays Added); "ran", the
   classes qa's test-inspector ran with their results, sets each one's latest result and puts a class in no list into Relevant; "other"
   replaces the counts; "drop" removes classes from every list (a change reverted); "base" names the ref the diff is against. The same
   facts twice change nothing. Returns { changed, applied, notes }. o: { now, pass, stage, ids }. */
function mergeTests(plan, ft, o) {
  const applied = [], notes = [];
  if (!ft || typeof ft !== "object" || Array.isArray(ft)) return { changed: false, applied, notes: ["facts.tests is not an object: not applied"] };
  const before = JSON.stringify(testsBlock(plan));
  const T = testsBlock(plan) ? JSON.parse(before) : {};
  TEST_LISTS.forEach(k => { T[k] = Array.isArray(T[k]) ? T[k] : []; });
  if (str(ft.base) && T.base !== ft.base.trim()) T.base = ft.base.trim();
  const rank = { added: 3, amended: 2, relevant: 1 };
  const find = e => { for (const k of TEST_LISTS) { let i = T[k].findIndex(x => x && testKey(x) === testKey(e)); if (i < 0 && !e.module) { const hits = T[k].map((x, j) => x && x.class === e.class ? j : -1).filter(j => j >= 0); if (hits.length === 1) i = hits[0]; } if (i >= 0) return { k, i }; } return null; };
  const merge = (old, e) => { const m = { ...old, ...e }; if (old.rows || e.rows) m.rows = [...new Set([...(old.rows || []), ...(e.rows || [])])]; if (old.module && !e.module) m.module = old.module; return m; };
  const put = (k, e, resultOnly) => { const w = find(e);
    if (!w) { T[k].push(e); applied.push(`tests.${k} + ${e.class}`); return; }
    const old = T[w.k][w.i], merged = resultOnly ? { ...old, ...(e.result ? { result: e.result } : {}), ...(old.testLevel || !e.testLevel ? {} : { testLevel: e.testLevel }), ...(old.tests != null || e.tests == null ? {} : { tests: e.tests }), ...(old.path || !e.path ? {} : { path: e.path }) } : merge(old, e);
    if (rank[k] > rank[w.k]) { T[w.k].splice(w.i, 1); T[k].push(merged); applied.push(`tests: ${e.class} ${w.k} → ${k}`); }
    else if (JSON.stringify(merged) !== JSON.stringify(old)) { T[w.k][w.i] = merged; applied.push(`tests.${w.k} ${e.class}${resultOnly && e.result ? " " + e.result.state : ""}`); } };
  TEST_LISTS.forEach(k => { if (ft[k] != null && !Array.isArray(ft[k])) { notes.push(`facts.tests.${k} is not a list: not applied`); return; }
    (ft[k] || []).forEach((x, i) => { const n = normEntry(x, o, false); if (!n.entry) { notes.push(`facts.tests.${k}[${i}]: ${n.why}: not applied`); return; } notes.push(...n.notes); put(k, n.entry, false); }); });
  if (ft.ran != null && !Array.isArray(ft.ran)) notes.push("facts.tests.ran is not a list: not applied");
  (Array.isArray(ft.ran) ? ft.ran : []).forEach((x, i) => { const n = normEntry(x, o, true); if (!n.entry) { notes.push(`facts.tests.ran[${i}]: ${n.why}: not applied`); return; } notes.push(...n.notes); put("relevant", n.entry, true); });
  if (ft.other != null) { const ot = normOther(ft.other); if (!ot) notes.push("facts.tests.other is not { byModule: { <module>: { <test level>: count } } }: not applied"); else if (JSON.stringify(T.other || null) !== JSON.stringify(ot)) { T.other = ot; applied.push("tests.other"); } }
  (Array.isArray(ft.drop) ? ft.drop : []).forEach(x => { const e = typeof x === "string" ? { class: x } : x && typeof x === "object" && str(x.class) ? { class: x.class, ...(str(x.module) ? { module: x.module } : {}) } : null; if (!e) return; const w = find(e); if (w) { T[w.k].splice(w.i, 1); applied.push(`tests.${w.k} − ${e.class}`); } });
  const changed = JSON.stringify(T) !== before && (before !== "null" || hasTests(T) || !!T.base);
  if (changed) { T.updated = o.now; const ordered = { ...(T.base ? { base: T.base } : {}), updated: T.updated }; TEST_LISTS.forEach(k => { ordered[k] = T[k]; }); if (T.other) ordered.other = T.other; plan.tests = ordered; }
  return { changed, applied, notes };
}
/* A unit's mirror on its tracking board (unit.tests): its board's tests block as it stands, with rowNames, the names of the rows its
   classes verify, so the tracking board names them as the unit's own board does; null when that board records none. */
function testsMirror(sub) {
  const t = testsBlock(sub); if (!hasTests(t)) return null;
  const out = JSON.parse(JSON.stringify(t)); delete out.rowNames;
  const ids = new Set(TEST_LISTS.flatMap(k => (Array.isArray(out[k]) ? out[k] : []).flatMap(e => (e && Array.isArray(e.rows) ? e.rows : []))));
  const names = (Array.isArray(sub.rows) ? sub.rows : []).filter(r => r && ids.has(r.id) && typeof r.name === "string").map(r => [r.id, r.name]);
  if (names.length) out.rowNames = Object.fromEntries(names);
  return out;
}

/* The checks (check.js): failures and warnings on a board's tests block, its unit rows' mirrors excepted (check.js holds those to the
   units' boards). Returns { fail: [], warn: [] }. */
function testsProblems(plan) {
  const fail = [], warn = [], t = plan ? plan.tests : null, rows = Array.isArray(plan && plan.rows) ? plan.rows : [], ids = new Set(rows.map(r => r && r.id));
  if (t == null) return { fail, warn };
  if (typeof t !== "object" || Array.isArray(t)) { fail.push("tests must be an object { base, updated, added, amended, relevant, other } (plan/RULES.md §2, \"The Tests tab\")"); return { fail, warn }; }
  if (plan.kind === "tracking") fail.push("tests on a tracking board: a tracking issue records no tests of its own; its units' boards do, and embed.js mirrors each into its unit row (unit.tests)");
  if (t.base != null && !str(t.base)) fail.push("tests.base must be the ref the diff is taken against");
  if (t.updated != null && !STAMP.test(String(t.updated))) fail.push(`tests.updated "${t.updated}" is not an ISO date-time`);
  const seen = new Map();
  TEST_LISTS.forEach(k => {
    if (t[k] == null) return;
    if (!Array.isArray(t[k])) { fail.push(`tests.${k} must be a list of classes`); return; }
    t[k].forEach((e, i) => {
      const at = `tests.${k}[${i}]`;
      if (!e || typeof e !== "object" || Array.isArray(e)) { fail.push(`${at} must be a class { class, module, testLevel, tests, rows, result }`); return; }
      if (!str(e.class)) fail.push(`${at} has no class`);
      if (e.module != null && !str(e.module)) fail.push(`${at}.module must be a module name or absent`);
      if (e.testLevel != null && !TEST_LEVELS.includes(String(e.testLevel))) fail.push(`${at}.testLevel must be one of ${TEST_LEVELS.join(", ")} (a test level of the five-level hierarchy) or absent, got ${JSON.stringify(e.testLevel)}`);
      else { const p = levelFromPath(e); if (p && e.testLevel != null && String(e.testLevel) !== p) warn.push(`${at} (${e.class}): its path names the test level ${p}, its testLevel says ${e.testLevel}`); if (p && e.testLevel == null) warn.push(`${at} (${e.class}) records no testLevel; its path names ${p}`); }
      if (e.tests != null && !count(e.tests)) fail.push(`${at}.tests must be the class's test count`);
      if (e.path != null && !str(e.path)) fail.push(`${at}.path must be a path or absent`);
      if (e.stage != null && !str(e.stage)) fail.push(`${at}.stage must be a stage id or absent`);
      if (e.rows != null) { if (!Array.isArray(e.rows)) fail.push(`${at}.rows must be a list of row ids`); else e.rows.forEach((r, j) => { if (!ids.has(r)) fail.push(`${at}.rows[${j}] "${r}" names no row of the board`); }); }
      if (e.result != null) {
        const r = e.result;
        if (typeof r !== "object" || Array.isArray(r)) fail.push(`${at}.result must be { state, passed, failed, skipped, pass, at }`);
        else {
          if (!TEST_RESULTS.includes(r.state)) fail.push(`${at}.result.state must be one of ${TEST_RESULTS.join(", ")}`);
          ["passed", "failed", "skipped"].forEach(c => { if (r[c] != null && !count(r[c])) fail.push(`${at}.result.${c} must be a count`); });
          if (r.pass != null && !(Number.isInteger(r.pass) && r.pass > 0)) fail.push(`${at}.result.pass must be a qa pass number`);
          if (r.at != null && !STAMP.test(String(r.at))) fail.push(`${at}.result.at "${r.at}" is not an ISO date-time`);
          if (r.failed > 0 && r.state !== "failed") warn.push(`${at} (${e.class}): ${r.failed} failed, but its state reads ${r.state}`);
        }
      }
      if (str(e.class)) { const key = testKey(e); if (seen.has(key)) fail.push(`${at} (${e.class}) is also in tests.${seen.get(key)}: a class is in one list only, Added before Amended before Relevant`); else seen.set(key, `${k}[${i}]`); }
    });
  });
  if (t.other != null) {
    const form = "tests.other must be { byModule: { <module>: { <test level, or \"none\">: count | { classes, tests } } } }, counts only";
    const o = t.other, m = o && typeof o === "object" && !Array.isArray(o) ? o.byModule : null;
    if (!m || typeof m !== "object" || Array.isArray(m)) fail.push(form);
    else {
      Object.keys(o).filter(k => !["byModule", "source"].includes(k)).forEach(k => fail.push(`tests.other.${k}: ${form}`));
      Object.entries(m).forEach(([md, lv]) => {
        if (!str(md) || !lv || typeof lv !== "object" || Array.isArray(lv)) { fail.push(`tests.other.byModule.${md}: ${form}`); return; }
        Object.entries(lv).forEach(([k, v]) => {
          if (![...TEST_LEVELS, "none"].includes(k)) fail.push(`tests.other.byModule.${md}.${k}: not a test level (${TEST_LEVELS.join(", ")}, or "none")`);
          else if (!count(v) && !(v && typeof v === "object" && !Array.isArray(v) && count(v.classes) && (v.tests == null || count(v.tests)) && Object.keys(v).every(x => ["classes", "tests"].includes(x)))) fail.push(`tests.other.byModule.${md}.${k} must be a count of classes, or { classes, tests }`);
        });
      });
    }
  }
  if (plan.status === "built") TEST_LISTS.slice(0, 2).forEach(k => (Array.isArray(t[k]) ? t[k] : []).forEach((e, i) => { if (e && str(e.class) && !e.result) warn.push(`tests.${k}[${i}] (${e.class}) records no result on a built board`); }));
  return { fail, warn };
}
/* A unit row's mirror (unit.tests), as check.js holds it: an object of the same form. */
function mirrorProblems(m, at) { if (m == null) return []; if (typeof m !== "object" || Array.isArray(m)) return [`${at}.unit.tests must be the mirror of the unit's board's tests (embed.js writes it)`]; const p = testsProblems({ tests: m, rows: [] }); return p.fail.filter(f => !/names no row/.test(f)).map(f => `${at}.unit.${f}`); }

module.exports = { TEST_LISTS, TEST_LEVELS, TEST_LEVEL_SEGMENTS, TEST_RESULTS, testLevelOf, levelFromPath, testKey, resultState, testsBlock, hasTests, normEntry, normOther, mergeTests, testsMirror, testsProblems, mirrorProblems };
