// The cases of a board file's atomic write while a reader holds it (plan/scripts/lib.js renameInto(), atomicWrite(); system/scripts/apply-state.js;
// KotlinBottools #24, p25), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-atomic-write.js [--out <dir>].
// The defect: on Windows a rename over a file another process holds open is refused (EPERM, EBUSY or EACCES), and the write gave up after 3 s
// (apply-state.js's after half a second), so an event applied while a fill read the same board could fail and was then not applied; the case
// "event and fill at the same time" met it about once in five runs. The rename is now retried with a growing, jittered pause for up to 15 s,
// the write still atomic (the file is always there, the old one or the new one), and fails as before once that is spent. A reader that reopens
// the file every few milliseconds still held off about one replace in twenty-five past the budget (p25; dashboards verify-flake): on Windows the
// writer's pauses and the reader's wake on the same timer tick (about 15.6 ms), so every retry met the reader. After each pause the rename is
// now tried for a few milliseconds without sleeping, off the tick; the group "a reader polling the file" holds 60 writes against such a reader.
// The cases hold the file open on purpose, from another process, for longer than the old budget, and show the retry carrying the write through;
// a hold longer than the budget still fails as before, nothing written. Where the platform never refuses such a rename, the write goes through at
// once and the retries are not exercised: the cases say so. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesAtomicWrite(X) {
  const { sk, out } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const sc = path.join(out, "atomic-write"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [], js = x => JSON.stringify(x);
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const wait = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  let n = 0;
  /* another process opens the file and holds it for ms; returns once it holds it (its marker written) */
  const hold = (file, ms) => { const mark = path.join(sc, `held-${++n}`);
    const ch = cp.spawn(process.execPath, ["-e", `const fs=require("fs");const fd=fs.openSync(${js(file)},"r");fs.writeFileSync(${js(mark)},"1");setTimeout(()=>{fs.closeSync(fd);process.exit(0)},${ms})`], { stdio: "ignore", windowsHide: true });
    const t0 = Date.now(); while (!fs.existsSync(mark)) { if (Date.now() - t0 > 10000) throw new Error("the holder never opened the file"); wait(10); }
    return ch; };
  /* does this platform refuse a rename over a held file at all? */
  const refuses = (() => { const f = path.join(sc, "probe.json"); fs.writeFileSync(f, "old"); hold(f, 600); fs.writeFileSync(f + ".tmp", "new");
    let r = false; try { fs.renameSync(f + ".tmp", f); } catch (e) { r = ["EPERM", "EBUSY", "EACCES"].includes(e.code); try { fs.unlinkSync(f + ".tmp"); } catch (x) { /* gone */ } }
    wait(800); return r; })();
  const leftovers = dir => fs.readdirSync(dir).filter(f => /\.tmp$/.test(f));

  guard("lib.js atomicWrite(): a rename refused while a reader holds the board file is retried until it goes through (KotlinBottools #24, p25)", c => {
    c.push(["the platform refuses a rename over a held file (else the retries are not exercised here)", true, refuses ? "refused: EPERM, EBUSY or EACCES" : "never refused on this platform"]);
    const dir = path.join(sc, "plan"); fs.mkdirSync(dir, { recursive: true }); const f = path.join(dir, "plan.json"); fs.writeFileSync(f, '{"v":"old"}');
    /* held for 4 s, past the old 3 s budget */
    hold(f, 4000); const t0 = Date.now(); let err = null, tries = null;
    try { tries = lib.atomicWrite(f, '{"v":"new"}'); } catch (e) { err = e; }
    const took = Date.now() - t0;
    c.push(["held for 4 s: the write goes through, the new content whole", !err && fs.readFileSync(f, "utf8") === '{"v":"new"}', js([err && err.code, took])]);
    c.push(["…after retrying while the reader held it", !refuses || (tries > 0 && took >= 3000), js({ tries, took })]);
    c.push(["…no temporary file left", !leftovers(dir).length, js(leftovers(dir))]);
    /* the budget spent: fails as before, nothing written */
    const g = path.join(dir, "board.json"); fs.writeFileSync(g, '{"v":"old"}'); hold(g, 2500);
    const prev = process.env.DASHBOARDS_RENAME_BUDGET_MS; process.env.DASHBOARDS_RENAME_BUDGET_MS = "600"; let e2 = null;
    try { lib.atomicWrite(g, '{"v":"new"}'); } catch (e) { e2 = e; } finally { if (prev === undefined) delete process.env.DASHBOARDS_RENAME_BUDGET_MS; else process.env.DASHBOARDS_RENAME_BUDGET_MS = prev; }
    c.push(["a hold longer than the budget: the error thrown as before, the old file intact, no temporary file left", refuses ? (!!e2 && ["EPERM", "EBUSY", "EACCES"].includes(e2.code) && fs.readFileSync(g, "utf8") === '{"v":"old"}' && !leftovers(dir).length) : !e2, js([e2 && e2.code, fs.readFileSync(g, "utf8"), leftovers(dir)])]);
    wait(2200);
    c.push(["another error is not retried: a missing folder throws at once", (() => { const t = Date.now(); try { lib.atomicWrite(path.join(dir, "no-such", "x.json"), "x"); return false; } catch (e) { return e.code === "ENOENT" && Date.now() - t < 1000; } })(), "ENOENT"]);
  });

  /* the reader on the timer's tick (dashboards verify-flake): another process reading the file every 2 ms, as the "event and fill at the same
     time" case's reader does. Before the probe about one write in twenty-five was starved for the whole 15 s budget, its retries waking on the
     reader's own tick; 60 writes met at least one such starvation in most runs. Each write here has a 3 s budget, far past what the probe needs */
  guard("lib.js atomicWrite(): a reader polling the file every few milliseconds never starves a write (the retry probes off the timer's tick)", c => {
    const dir = path.join(sc, "tick"); fs.mkdirSync(dir, { recursive: true }); const f = path.join(dir, "plan.json"), stop = path.join(dir, "stop"), ready = path.join(dir, "ready");
    fs.writeFileSync(f, JSON.stringify({ i: -1, x: "a".repeat(90000) }));
    const rd = cp.spawn(process.execPath, ["-e", `const fs=require("fs");let n=0;(async()=>{while(!fs.existsSync(${js(stop)})){try{JSON.parse(fs.readFileSync(${js(f)},"utf8"));if(++n===20)fs.writeFileSync(${js(ready)},"1")}catch(e){}await new Promise(r=>setTimeout(r,2))}})()`], { stdio: "ignore", windowsHide: true });
    const t0 = Date.now(); while (!fs.existsSync(ready) && Date.now() - t0 < 10000) wait(10);
    const prev = process.env.DASHBOARDS_RENAME_BUDGET_MS; process.env.DASHBOARDS_RENAME_BUDGET_MS = "3000";
    const N = 60, res = [];
    try { for (let i = 0; i < N; i++) { const t = Date.now(); let err = null; try { lib.atomicWrite(f, JSON.stringify({ i, x: "c".repeat(90000) })); } catch (e) { err = e.code; } res.push({ ms: Date.now() - t, err }); wait(40); } }
    finally { if (prev === undefined) delete process.env.DASHBOARDS_RENAME_BUDGET_MS; else process.env.DASHBOARDS_RENAME_BUDGET_MS = prev; fs.writeFileSync(stop, "1"); }
    const failed = res.filter(r => r.err), slow = Math.max(...res.map(r => r.ms));
    c.push(["the reader was reading throughout", fs.existsSync(ready), "ready"]);
    c.push([`${N} writes against it: every one goes through, none near the budget`, !failed.length && slow < 1000 && JSON.parse(fs.readFileSync(f, "utf8")).i === N - 1, js({ failed: failed.length, codes: [...new Set(failed.map(r => r.err))], slowestMs: slow })]);
    c.push(["…no temporary file left", !leftovers(dir).length, js(leftovers(dir))]);
    const t1 = Date.now(); while (rd.exitCode === null && Date.now() - t1 < 5000) wait(20);
  });

  guard("apply-state.js: a state board's write takes the same retried rename", c => {
    const src = fs.readFileSync(sk("system/scripts/apply-state.js"), "utf8");
    c.push(["its atomic write renames through lib.js renameInto(), not a loop of its own", /renameInto\(tmp, file\)/.test(src) && !/for \(let i = 0; ; i\+\+\) \{ try \{ fs\.renameSync\(tmp, file\)/.test(src), "apply-state.js"]);
  });
  return groups;
};

if (require.main === module) {
  /* a private scratch of its own (verify/scratch.js): out/, the temp root and the stand-in team state, removed at exit unless kept */
  const SCR = require("./scratch.js").open("cases-atomic-write");
  /* no live GitHub, no machine cache: the private repositories from the fixture list (system/scripts/privaterefs.js) */
  process.env.DASHBOARDS_VERIFY = "1"; process.env.DASHBOARDS_PRIVATES = process.env.DASHBOARDS_PRIVATES || path.join(__dirname, "fixtures", "private-repositories.json");
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : SCR.out);
  let bad = 0;
  module.exports({ sk, out }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
