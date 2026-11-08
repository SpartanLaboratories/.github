// The cases of the progress notes' index (admin-team/board/progress-index; plan/RULES.md §3, "Progress notes"), run by verify-templates.js (it
// passes its helpers in). The defect (WebTools #66, Document step): a note named planner-reconcile.js was on disk for over 20 minutes and no board
// drew it, as the template probed fixed names only and a board from disk cannot list a folder, while the agents' briefs let a name carry a slug
// of its writer's own. The folder's names now stand in an index a watcher keeps with no event. No case opens a browser.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), vm = require("vm");

module.exports = function casesProgressIndex(X) {
  const { sk, out, targets } = X;
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html");
  if (!PB) return [["the progress notes' index (the plan-board template under test)", [["the plan-board template is under test", false, "a repository template set without it skips these groups"]]]];
  const SCRIPT = sk("plan/scripts/progress-index.js"), L = require(SCRIPT);
  const sc = path.join(out, "progress-index"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const NOTE = n => `(window.PROGRESS=window.PROGRESS||{})[${JSON.stringify(n)}]={"agent":${JSON.stringify(n)},"issue":66};\n`;
  const prog = (root, issue) => path.join(root, "docs", "plans", ".live", "progress", String(issue));
  const readNames = (root, issue) => { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(prog(root, issue), "index.js"), "utf8"), { window: w }); return w.PROGRESS_NAMES[String(issue)]; };
  const sleepUntil = (test, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (test()) return true; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); } return test(); };

  guard("the progress notes' index: the names a folder holds", c => {
    const root = path.join(sc, "once"), d = prog(root, 66); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "planner-reconcile.js"), NOTE("planner-reconcile")); fs.writeFileSync(path.join(d, "qa.js"), NOTE("qa")); fs.writeFileSync(path.join(d, "Not_A_Note.js"), "x"); fs.writeFileSync(path.join(d, "x.tmp"), "x");
    c.push(["a slug no one knew is listed, and a file that cannot be a note is not", L.writeIndexes(root).join() === "66" && readNames(root, 66).join() === "planner-reconcile,qa", JSON.stringify(readNames(root, 66))]);
    c.push(["the index never lists itself, and an unchanged folder writes nothing", L.writeIndexes(root).length === 0 && !readNames(root, 66).includes("index"), ""]);
    fs.rmSync(path.join(d, "planner-reconcile.js")); L.writeIndexes(root);
    c.push(["a note its writer deleted leaves the index", readNames(root, 66).join() === "qa", JSON.stringify(readNames(root, 66))]);
    fs.writeFileSync(path.join(prog(root, 66), "..", "notes.txt"), "x");
    c.push(["a stray file beside the issues' folders is passed over", Array.isArray(L.writeIndexes(root)), ""]);
  });

  guard("the progress notes' index: the template reads it", c => {
    const t = fs.readFileSync(PB, "utf8");
    const m = /function progNames\(listed\)\{[^\n]*\}\n/.exec(t);
    c.push(["progNames takes the listed names", !!m, ""]);
    if (m) { const f = vm.runInNewContext(`${m[0]};progNames`, {});
      const n = f(["planner-reconcile", "qa", "qa", "bad name", 3, "<x>"]);
      c.push(["each listed name is probed once, and a name unfit for a URL is not", n.join() === "planner-reconcile,qa", n.join()]);
      c.push(["no index: no names to probe, the template holding none of its own", f(undefined).length === 0 && !/const AGENTS=/.test(t), ""]); }
    c.push(["each poll loads the issue's index, no cached copy", /progress\/\$\{issue\}\/index\.js\?t=\$\{Date\.now\(\)\}/.test(t) && /progNames\(await loadNoteNames\(n\)\)/.test(t), ""]);
    /* NOTE_WORK stands in the template's names block (dashboards-skill/41), noteLabel() beside the progress notes */
    const nw = /const NOTE_WORK=[^\n]*\n/.exec(t), nl = /const noteLabel=[^\n]*\n/.exec(t), label = nw && nl && vm.runInNewContext(`${nw[0]}${nl[0]};noteLabel`, { PASS_NAME: "Quality Review" });
    c.push(["a slugged note is labelled by its work, never its file name", !!label && label("planner-reconcile") === "planning · reconcile" && label("researcher-blast-radius") === "research · blast-radius" && label("rookie-dev-s2") === "implementation · s2" && label("nobody-knows") === "progress", label ? label("planner-reconcile") : ""]);
  });

  guard("the progress notes' index: the watcher", c => {
    const envOn = { ...process.env }; delete envOn.DASHBOARDS_NO_WATCHER;
    const ensure = (root, env) => cp.spawnSync(process.execPath, [SCRIPT, "--ensure", root], { encoding: "utf8", env, windowsHide: true }).stdout.trim();
    const plain = path.join(sc, "plain"); fs.mkdirSync(prog(plain, 66), { recursive: true });
    c.push(["no watcher where .live may reach a commit: no git work tree says nothing is ignored", ensure(plain, envOn) === "no watcher here", ""]);
    const root = path.join(sc, "tree"), d = prog(root, 66); fs.mkdirSync(d, { recursive: true });
    const git = (...a) => cp.spawnSync("git", ["-C", root, ...a], { encoding: "utf8", windowsHide: true });
    git("init", "-q");
    c.push(["no watcher in a git tree whose .live is not ignored", ensure(root, envOn) === "no watcher here", ""]);
    fs.appendFileSync(path.join(root, ".git", "info", "exclude"), "\ndocs/plans/.live/\n");
    c.push(["DASHBOARDS_NO_WATCHER starts none", ensure(root, { ...envOn, DASHBOARDS_NO_WATCHER: "1" }) === "no watcher here", ""]);
    const env = { ...envOn, DASHBOARDS_WATCHER_TICK_MS: "100", DASHBOARDS_WATCHER_IDLE_MS: "2500" };
    c.push(["it starts where .live is ignored", ensure(root, env) === "started", ""]);
    const stamp = path.join(root, "docs", "plans", ".live", "progress", ".watcher.json");
    c.push(["it stamps itself", sleepUntil(() => fs.existsSync(stamp), 5000), ""]);
    c.push(["a second ensure finds it alive and starts no other", ensure(root, env) === "alive", ""]);
    fs.writeFileSync(path.join(d, "planner-reconcile.js"), NOTE("planner-reconcile"));
    c.push(["a note written with no event is listed", sleepUntil(() => { try { return readNames(root, 66).includes("planner-reconcile"); } catch (e) { return false; } }, 3000), ""]);
    fs.rmSync(path.join(d, "planner-reconcile.js"));
    c.push(["a note deleted with no event leaves the index", sleepUntil(() => { try { return readNames(root, 66).length === 0; } catch (e) { return false; } }, 3000), ""]);
    c.push(["with no note for its idle span it stops by itself, and clears its stamp", sleepUntil(() => !fs.existsSync(stamp), 8000), ""]);
    c.push(["nothing it wrote shows in git status", git("status", "--porcelain").stdout.trim() === "", git("status", "--porcelain").stdout.trim()]);
    const gone = path.join(sc, "gone"), gd = prog(gone, 1); fs.mkdirSync(gd, { recursive: true }); cp.spawnSync("git", ["-C", gone, "init", "-q"], { windowsHide: true });
    fs.appendFileSync(path.join(gone, ".git", "info", "exclude"), "\ndocs/plans/.live/\n"); ensure(gone, env);
    const gs = path.join(gone, "docs", "plans", ".live", "progress", ".watcher.json"); sleepUntil(() => fs.existsSync(gs), 5000);
    const pid = JSON.parse(fs.readFileSync(gs, "utf8")).pid, isUp = () => { try { process.kill(pid, 0); return true; } catch (e) { return false; } };
    fs.rmSync(path.join(gone, "docs"), { recursive: true, force: true });
    c.push(["it stops when the checkout's progress folder is gone", sleepUntil(() => !isUp(), 5000), ""]);
  });
  return groups;
};
