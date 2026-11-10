// The cases of the event's time held to its arrival (plan/RULES.md §4, "The event's time"; the admin team's brief, Board lanes), run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-arrival.js [--out <dir>].
// The trigger: runs sent facts.at guessed or rounded, at every session start. The team passes each run's event with its arrival time,
// apply-event.js --arrived <UTC ISO>: a facts.at that is missing, or more than ARRIVAL_TOLERANCE_S (2 minutes) from the arrival, is
// replaced by the arrival time and the summary's arrival line says so; one within it is kept, with no line. Without --arrived (team-raised
// events, backfills) nothing changes; --at still wins; an --arrived that is no ISO time with its zone is a usage error. No case opens a
// browser. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesArrival(X) {
  const { sk, out, targets } = X;
  const PB = (targets.find(t => t.name === "plan/template/dashboard.html") || {}).path;
  if (!PB) return [["the event's time held to its arrival (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const sc = path.join(out, "arrival"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env });
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js");
  const EX = J("plan/examples/38-handshake-empty-name/plan.json");
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const T0 = "2026-11-03T03:28:38Z", A = "2026-11-03T05:00:00Z";
  const sec = s => new Date(Date.parse(A) + s * 1000).toISOString().replace(/\.\d+Z$/, "Z");
  const STG = (a, b) => [{ id: "S1", name: "Stage one", state: a }, { id: "S2", name: "Stage two", state: b }];
  /* a board in implementation, from the worked example: its first stage current */
  const board = () => { const x = copy(EX), ids = x.rows.map(r => r.id); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, step: "implementation", since: T0, updated: T0, current: ["built"], questions: [], research: null, open: [], qa: [], plan: null, remediation: null, history: {}, waits: [],
      stages: STG("current", "todo").map(s => ({ ...s, rows: [ids[0]] })), steps: STEPS.slice(), event: { name: "branch-cut", at: T0 } }; return x; };
  let n = 0;
  const lay = () => { const plan = board(), root = path.join(sc, `b-${++n}`), dir = path.join(root, ...plan.folder.split("/"));
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, plan }; };
  /* one implementation-stage raised on a fresh board; `at` the facts.at sent (undefined: none), `flags` the options beyond the fixed ones */
  const ev = (at, flags) => { const B = lay(), facts = { stage: "S1", stages: STG("done", "current"), ...(at === undefined ? {} : { at }) };
    const rq = wr(path.join(sc, `req-${++n}.json`), js({ v: 1, action: "plan-board", github: B.plan.repo, issue: B.plan.issue, event: "implementation-stage", folder: B.plan.folder, facts }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", ...(flags || [])]), json = (flags || []).includes("--json"), S = json ? parse(a) : null;
    let p = null; try { p = JSON.parse(rd(path.join(B.dir, "plan.json"))); } catch (e) { /* none */ }
    return { a, S, p, stamp: p && p.wip && p.wip.event && p.wip.event.name === "implementation-stage" ? p.wip.event.at : null }; };
  const arrivalLines = a => (a.stdout || "").split(/\r?\n/).filter(l => /^arrival: /.test(l));

  guard("apply-event.js --arrived: a facts.at within 2 minutes of the arrival is kept, with no arrival line", c => {
    const w = ev(sec(-90), ["--arrived", A, "--json"]);
    c.push(["90 s before the arrival: stamped at facts.at, the summary's arrival empty", w.a.status === 0 && w.stamp === sec(-90) && w.S.arrival == null, js([w.a.status, w.stamp, w.S.arrival, w.S.error])]);
    const f = ev(sec(100), ["--arrived", A, "--json"]);
    c.push(["100 s after the arrival (a run's clock ahead): kept too", f.a.status === 0 && f.stamp === sec(100) && f.S.arrival == null, js([f.stamp, f.S.arrival, f.S.error])]);
    const e = ev(sec(-120), ["--arrived", A, "--json"]);
    c.push(["exactly 120 s off: within the tolerance, kept", e.a.status === 0 && e.stamp === sec(-120) && e.S.arrival == null, js([e.stamp, e.S.arrival, e.S.error])]);
    const t = ev(sec(-60), ["--arrived", A]);
    c.push(["…and the key: value summary prints no arrival line", t.a.status === 0 && t.stamp === sec(-60) && arrivalLines(t.a).length === 0, js([t.stamp, arrivalLines(t.a)])]);
  });

  guard("apply-event.js --arrived: a facts.at more than 2 minutes off is replaced by the arrival time, and the summary says so", c => {
    const o = ev(sec(-121), ["--arrived", A, "--json"]);
    c.push(["121 s before the arrival: stamped at the arrival, the line names both times and the offset", o.a.status === 0 && o.stamp === A && o.S.arrival === `facts.at ${sec(-121)} replaced by arrival ${A} (off by 121 s, over 2 min)`, js([o.a.status, o.stamp, o.S.arrival, o.S.error])]);
    const r = ev("2026-11-03T00:00:00Z", ["--arrived", A, "--json"]);
    c.push(["a rounded facts.at (midnight, 5 hours before): replaced, off by 18000 s", r.a.status === 0 && r.stamp === A && r.S.arrival === `facts.at 2026-11-03T00:00:00Z replaced by arrival ${A} (off by 18000 s, over 2 min)`, js([r.stamp, r.S.arrival, r.S.error])]);
    const f = ev(sec(600), ["--arrived", A, "--json"]);
    c.push(["a facts.at 10 minutes ahead of the arrival: replaced too", f.a.status === 0 && f.stamp === A && /off by 600 s, over 2 min\)$/.test(f.S.arrival || ""), js([f.stamp, f.S.arrival])]);
    const m = ev("2026-11-03T00:00:00Z", ["--arrived", "2026-11-03T06:00:00.250+01:00", "--json"]);
    c.push(["an arrival with milliseconds and a zone offset: read as UTC, the event stamped in whole seconds", m.a.status === 0 && m.stamp === A && m.S.arrival === `facts.at 2026-11-03T00:00:00Z replaced by arrival ${A} (off by 18000 s, over 2 min)`, js([m.stamp, m.S.arrival, m.S.error])]);
    const t = ev("2026-11-03T00:00:00Z", ["--arrived", A]);
    c.push(["the key: value summary prints the one arrival line", t.a.status === 0 && js(arrivalLines(t.a)) === js([`arrival: facts.at 2026-11-03T00:00:00Z replaced by arrival ${A} (off by 18000 s, over 2 min)`]), js(arrivalLines(t.a))]);
    const d = ev("2026-11-03T00:00:00Z", ["--arrived", A, "--json"]);
    c.push(["the trail entry and wip.updated take the arrival time too", d.a.status === 0 && d.p.wip.updated === A && !js(d.p).includes("2026-11-03T00:00:00Z"), js([d.p.wip.updated])]);
  });

  guard("apply-event.js --arrived: a missing facts.at is stamped at the arrival time, and the summary says so", c => {
    const m = ev(undefined, ["--arrived", A, "--json"]);
    c.push(["no facts.at: stamped at the arrival, the line says it was missing", m.a.status === 0 && m.stamp === A && m.S.arrival === `facts.at missing: stamped at arrival ${A}`, js([m.a.status, m.stamp, m.S.arrival, m.S.error])]);
    const e = ev("", ["--arrived", A, "--json"]);
    c.push(["an empty facts.at is read as missing", e.a.status === 0 && e.stamp === A && /^facts\.at missing/.test(e.S.arrival || ""), js([e.stamp, e.S.arrival, e.S.error])]);
    const b = ev("not a time", ["--arrived", A, "--json"]);
    c.push(["a facts.at that is no ISO time is not replaced: the refusal names it, nothing written", b.a.status === 1 && /is not an ISO time/.test(b.S.error || "") && b.stamp === null, js([b.a.status, b.S.error, b.S.arrival])]);
  });

  guard("apply-event.js without --arrived: unchanged; --at still wins; an --arrived that is no ISO time is a usage error", c => {
    const o = ev("2026-11-03T00:00:00Z", ["--json"]);
    c.push(["no --arrived, a facts.at far from any clock: stamped at facts.at, no arrival line", o.a.status === 0 && o.stamp === "2026-11-03T00:00:00Z" && o.S.arrival == null, js([o.stamp, o.S.arrival, o.S.error])]);
    const t0 = Date.now(), m = ev(undefined, ["--json"]), t1 = Date.now();
    c.push(["no --arrived, no facts.at: stamped now, as before", m.a.status === 0 && Date.parse(m.stamp) >= Math.floor(t0 / 1000) * 1000 && Date.parse(m.stamp) <= t1 && m.S.arrival == null, js([m.stamp, m.S.arrival, m.S.error])]);
    const a = ev("2026-11-03T00:00:00Z", ["--at", "2026-11-03T04:00:00Z", "--arrived", A, "--json"]);
    c.push(["--at with --arrived: --at stamps the event, the arrival line says the time was not held", a.a.status === 0 && a.stamp === "2026-11-03T04:00:00Z" && /^not held: --at 2026-11-03T04:00:00Z given \(arrival 2026-11-03T05:00:00Z\)$/.test(a.S.arrival || ""), js([a.stamp, a.S.arrival, a.S.error])]);
    ["2026-11-03 05:00:00", "2026-11-03T05:00:00", "yesterday"].forEach(bad => {
      const u = ev(sec(-90), ["--arrived", bad, "--json"]);
      c.push([`--arrived ${JSON.stringify(bad)}: exit 2, the usage names it, nothing written`, u.a.status === 2 && /--arrived takes the request's arrival time/.test(u.a.stderr) && u.stamp === null, js([u.a.status, (u.a.stderr || "").split(/\r?\n/).slice(-1)[0]])]);
    });
    const src = rd(APPLY);
    c.push(["the tolerance is one named constant, 120 s", /^const ARRIVAL_TOLERANCE_S = 120;$/m.test(src) && (src.match(/\b120\b/g) || []).length === 1, ""]);
  });

  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
