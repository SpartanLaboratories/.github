// The Tests tab's data rules (plan/RULES.md §2, "The Tests tab"), shared by apply-event.js, embed.js (through lib.js) and check.js. Not a
// command. A board's plan.json "tests" holds the test classes the change touches, by how: "added" (new on the branch, from the git diff
// against its base), "amended" (existing classes the branch changed), "relevant" (unchanged existing classes that exercise the new code
// anyway: what qa's test-inspector ran on the change, less Added and Amended), and "other" (every other test, counts only per module and
// test level: never run for this change). Each class { class, module, testLevel, path, tests, rows, stage, result } (result { state, passed, failed, skipped, pass, at, note }); a class is in one
// list only, Added before Amended before Relevant. A tracking board records none of its own: embed.js mirrors each unit's into the unit
// row (unit.tests, with rowNames), and the board sums them. The plan-board template's tlOf(), resOf() and testKey() are the same rules.
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
/* A run's name without its module (WebTools #65: a qa pass sent "webtools-http componentTest", a later stage "componentTest" with the
   module beside it, and the Tests tab listed the same Gradle task twice): "<module> <name>", "<module>:<name>" and ":<module>:<name>"
   read as <name> when the entry names that module. */
function bareName(cls, module) {
  const c = String(cls || "").trim(), m = String(module || "").trim(); if (!m) return c;
  for (const p of [":" + m + ":", m + ":", m + " "]) if (c.startsWith(p) && c.length > p.length) return c.slice(p.length).trim();
  /* "<name> (<module>)" (WebTools #69, a stage report's "gatingTest (webtools-feeds)") */
  const s = " (" + m + ")"; if (c.endsWith(s) && c.length > s.length) return c.slice(0, -s.length).trim();
  return c;
}
/* A module's test task, by the five-level testing hierarchy's level folders (gatingTest … uatTest), and the test level it runs. */
const TASK_LEVEL = { gatingTest: "1", componentTest: "2", integrationTest: "3", deterministicTest: "4a", e2eTest: "4b", nonfunctionalTest: "4c", uatTest: "5" };
/* A run of a module's test task that passed whole (no test failed or skipped) and counted exactly the tests of the board's own Added and
   Amended classes of that module at that level: each of those classes passed whole, so the run is their results and no class of its own
   (WebTools #69: a stage report sent "gatingTest (webtools-feeds)", "componentTest (webtools-feeds)" and "deterministicTest (webtools-feeds)"
   for a new module whose every class was Added; the fast path listed the three tasks in Relevant, as unchanged tests, and left the sixteen
   classes "not run yet"). Returns those classes, or null where the run cannot be attributed (a failure or a skip, another class in the
   count, a class with no test count): the run then stays a Relevant entry of its own, as before. */
function taskClasses(T, e) {
  const lv = TASK_LEVEL[e && e.class]; if (!lv || !e.module || !e.result) return null;
  const r = e.result; if (r.state !== "passed" || !count(r.passed) || (r.failed || 0) !== 0 || (r.skipped || 0) !== 0) return null;
  const mine = ["added", "amended"].flatMap(k => (T[k] || []).filter(x => x && x.module === e.module && testLevelOf(x) === lv));
  if (!mine.length || mine.some(x => !count(x.tests)) || mine.reduce((n, x) => n + x.tests, 0) !== r.passed) return null;
  return mine;
}
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
  const e = { class: str(x.module) ? bareName(cls, x.module) : cls };
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
    /* the run's note (WebTools #65, qa pass 2: a failure the change did not cause, an untouched class of another issue timing out under
       parallel task runs and green in isolation): what the result means, kept with that result and gone with it at the next run. A text
       from the facts goes through apply-event.js's rewording (o.txt) where one is given */
    const nt = str(R.note) ? (typeof o.txt === "function" ? o.txt(R.note) : R.note.replace(/\s+/g, " ").trim()) : null;
    e.result = { state: r.state, ...["passed", "failed", "skipped"].reduce((a, k) => (r[k] != null ? { ...a, [k]: r[k] } : a), {}), ...(r.pass ? { pass: r.pass } : {}), at: r.at, ...(nt ? { note: nt } : {}) };
  }
  return { entry: e, notes };
}
/* The other tests' counts: { byModule: { <module>: { <level or "none">: n | { classes, tests } } } }; { byModule: {} } when the facts' report nothing (an empty byModule, or modules with no count: PROTOCOL.md allows it); null when they are not that shape. */
function normOther(x) {
  const m = x && typeof x === "object" && x.byModule && typeof x.byModule === "object" && !Array.isArray(x.byModule) ? x.byModule : null;
  if (!m) return null;
  /* wrong in shape: a module that is not an object, or one naming something that is no count */
  if (Object.values(m).some(lv => !lv || typeof lv !== "object" || Array.isArray(lv))) return null;
  const out = {};
  Object.keys(m).sort().forEach(md => { const lv = m[md]; if (!lv || typeof lv !== "object" || Array.isArray(lv)) return; const row = {};
    [...TEST_LEVELS, "none"].forEach(k => { const v = lv[k]; if (count(v)) row[k] = v; else if (v && typeof v === "object" && count(v.classes)) row[k] = { classes: v.classes, ...(count(v.tests) ? { tests: v.tests } : {}) }; });
    if (Object.keys(row).length) out[md] = row; });
  if (!Object.keys(out).length) return Object.values(m).every(lv => !Object.keys(lv).length) ? { byModule: {} } : null;
  return { byModule: out, ...(str(x.source) ? { source: x.source.trim() } : {}) };
}
/* Apply an event's facts.tests to a board (plan/RULES.md §4): each class of "added", "amended" and "relevant" upserted, a class kept in the
   highest list it has reached (Added, then Amended, then Relevant: a class added on the branch and changed later stays Added); "ran", the
   classes qa's test-inspector ran with their results, sets each one's latest result and its count (the tests the run counted) and puts a class in no list into Relevant, a module's test task that passed whole
   over the board's own classes being those classes' results (taskClasses()); "other"
   replaces the counts (an empty one reports nothing new, so any earlier counts stay); "drop" removes classes from every list (a change reverted; one on no list is named in the summary, never passed over); "base" names the ref the diff is against. The same
   facts twice change nothing. Returns { changed, applied, notes }. o: { now, pass, stage, ids }. */
function mergeTests(plan, ft, o) {
  const applied = [], notes = [];
  if (!ft || typeof ft !== "object" || Array.isArray(ft)) return { changed: false, applied, notes: ["facts.tests is not an object: not applied"] };
  const before = JSON.stringify(testsBlock(plan));
  const T = testsBlock(plan) ? JSON.parse(before) : {};
  TEST_LISTS.forEach(k => { T[k] = Array.isArray(T[k]) ? T[k] : []; });
  if (str(ft.base) && T.base !== ft.base.trim()) T.base = ft.base.trim();
  const rank = { added: 3, amended: 2, relevant: 1 };
  /* a class matches by its module and name; failing that, uniquely, by its name with no module given, or by its simple name where one side
     names the class without its package (a stage's facts may give "FooTest" for a class recorded as "com.acme.testing.component.FooTest") */
  const simple = c => String(c || "").split(".").pop();
  const sameModule = (x, e) => !e.module || !x.module || x.module === e.module;
  const loose = (x, e) => !!x && sameModule(x, e) && (x.class === e.class || bareName(x.class, x.module || e.module) === bareName(e.class, e.module || x.module) || ((!String(x.class).includes(".") || !String(e.class).includes(".")) && simple(x.class) === simple(e.class)));
  const find = e => { for (const k of TEST_LISTS) { let i = T[k].findIndex(x => x && testKey(x) === testKey(e)); if (i < 0) { const hits = T[k].map((x, j) => loose(x, e) ? j : -1).filter(j => j >= 0); if (hits.length === 1) i = hits[0]; } if (i >= 0) return { k, i }; } return null; };
  /* the merged class keeps its qualified name, whichever side gave it */
  const merge = (old, e) => { const m = { ...old, ...e }; if (old.rows || e.rows) m.rows = [...new Set([...(old.rows || []), ...(e.rows || [])])]; if (old.module && !e.module) m.module = old.module; if (String(old.class).includes(".") && !String(e.class).includes(".")) m.class = old.class; return m; };
  const put = (k, e, resultOnly) => { const w = find(e);
    if (!w) { T[k].push(e); applied.push(`tests.${k} + ${e.class}`); return; }
    const old = T[w.k][w.i], merged = resultOnly ? { ...old, ...(e.result ? { result: e.result } : {}), ...(old.testLevel || !e.testLevel ? {} : { testLevel: e.testLevel }), ...(e.tests == null || old.tests === e.tests ? {} : { tests: e.tests }), ...(old.path || !e.path ? {} : { path: e.path }) } : merge(old, e);
    if (rank[k] > rank[w.k]) { T[w.k].splice(w.i, 1); T[k].push(merged); applied.push(`tests: ${e.class} ${w.k} → ${k}`); }
    else if (JSON.stringify(merged) !== JSON.stringify(old)) { T[w.k][w.i] = merged; applied.push(`tests.${w.k} ${e.class}${resultOnly && e.result ? " " + e.result.state : ""}`); } };
  TEST_LISTS.forEach(k => { if (ft[k] != null && !Array.isArray(ft[k])) { notes.push(`facts.tests.${k} is not a list: not applied`); return; }
    (ft[k] || []).forEach((x, i) => { const n = normEntry(x, o, false); if (!n.entry) { notes.push(`facts.tests.${k}[${i}]: ${n.why}: not applied`); return; } notes.push(...n.notes); put(k, n.entry, false); }); });
  if (ft.ran != null && !Array.isArray(ft.ran)) notes.push("facts.tests.ran is not a list: not applied");
  (Array.isArray(ft.ran) ? ft.ran : []).forEach((x, i) => { const n = normEntry(x, o, true); if (!n.entry) { notes.push(`facts.tests.ran[${i}]: ${n.why}: not applied`); return; } notes.push(...n.notes);
    const own = taskClasses(T, n.entry);
    if (own) { const R = n.entry.result;
      own.forEach(cl => { const res = { state: "passed", passed: cl.tests, failed: 0, skipped: 0, ...(R.pass ? { pass: R.pass } : {}), at: R.at, ...(R.note ? { note: R.note } : {}) };
        if (JSON.stringify(cl.result || null) !== JSON.stringify(res)) { cl.result = res; applied.push(`tests ${cl.class} passed (${n.entry.class})`); } });
      /* the same run, left as a class of its own by an earlier event, goes: its classes carry it now */
      const before = T.relevant.length; T.relevant = T.relevant.filter(y => !(y && sameModule(y, n.entry) && bareName(y.class, y.module || n.entry.module) === n.entry.class));
      if (before > T.relevant.length) applied.push(`tests.relevant − ${n.entry.class} (${n.entry.module}): its classes carry the run`);
      return; }
    put("relevant", n.entry, true); });
  if (ft.other != null) { const ot = normOther(ft.other); if (!ot) notes.push("facts.tests.other is not { byModule: { <module>: { <test level>: count } } }: not applied"); else if (Object.keys(ot.byModule).length && JSON.stringify(T.other || null) !== JSON.stringify(ot)) { T.other = ot; applied.push("tests.other"); } }
  (Array.isArray(ft.drop) ? ft.drop : []).forEach(x => { const e = typeof x === "string" ? { class: x } : x && typeof x === "object" && str(x.class) ? { class: x.class, ...(str(x.module) ? { module: x.module } : {}) } : null; if (!e) return; const w = find(e); if (w) { T[w.k].splice(w.i, 1); applied.push(`tests.${w.k} − ${e.class}`); } else applied.push(`tests.drop ${e.class}: on no list of the board, nothing to remove`); });
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
        if (typeof r !== "object" || Array.isArray(r)) fail.push(`${at}.result must be { state, passed, failed, skipped, pass, at, note }`);
        else {
          if (!TEST_RESULTS.includes(r.state)) fail.push(`${at}.result.state must be one of ${TEST_RESULTS.join(", ")}`);
          ["passed", "failed", "skipped"].forEach(c => { if (r[c] != null && !count(r[c])) fail.push(`${at}.result.${c} must be a count`); });
          if (r.pass != null && !(Number.isInteger(r.pass) && r.pass > 0)) fail.push(`${at}.result.pass must be a qa pass number`);
          if (r.at != null && !STAMP.test(String(r.at))) fail.push(`${at}.result.at "${r.at}" is not an ISO date-time`);
          if (r.note != null && !str(r.note)) fail.push(`${at}.result.note must be a text (what the result means: a failure the change did not cause) or absent`);
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

module.exports = { TEST_LISTS, TEST_LEVELS, TEST_LEVEL_SEGMENTS, TEST_RESULTS, bareName, testLevelOf, levelFromPath, testKey, resultState, testsBlock, hasTests, normEntry, normOther, mergeTests, testsMirror, testsProblems, mirrorProblems };
