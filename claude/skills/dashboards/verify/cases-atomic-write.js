// The cases of a board file's atomic write while a reader holds it (plan/scripts/lib.js renameInto(), atomicWrite(); system/scripts/apply-state.js;
// KotlinBottools #24, p25), run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-atomic-write.js [--out <dir>].
// The defect: on Windows a rename over a file another process holds open is refused (EPERM, EBUSY or EACCES), and the write gave up after 3 s
// (apply-state.js's after half a second), so an event applied while a fill read the same board could fail and was then not applied; the case
// "event and fill at the same time" met it about once in five runs. The rename is now retried with a growing, jittered pause for up to 15 s,
// the write still atomic (the file is always there, the old one or the new one), and fails as before once that is spent. A reader that reopens
// the file every few milliseconds can still hold off a replace past the budget, so that case may still fail now and then (p25): these cases
// show the retry, not the end of that race.
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

  guard("apply-state.js: a state board's write takes the same retried rename", c => {
    const src = fs.readFileSync(sk("system/scripts/apply-state.js"), "utf8");
    c.push(["its atomic write renames through lib.js renameInto(), not a loop of its own", /renameInto\(tmp, file\)/.test(src) && !/for \(let i = 0; ; i\+\+\) \{ try \{ fs\.renameSync\(tmp, file\)/.test(src), "apply-state.js"]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let bad = 0;
  module.exports({ sk, out }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
