#!/usr/bin/env node
// The tracked board's follow of its view copy, in headless Chrome over file:// (plan/RULES.md §1, "The tracked board follows its view copy"; admin-team/dashboards-skill/doc-landing-and-view-follow).
// Run only when a person asks for it (GUIDANCE.md §8): node verify/browser-view-follow.js [--out <dir>] [--keep]. It opens no board of any repository: it builds its own scratch tree,
// a git repository with a tracking board, a sub-issue at document and a worktree, raises the real events through apply-event.js --view, and watches the open pages live:
//   1. a tracked sub-issue board at document, opened from the main checkout: landing, then merge, then landed, each in place, labelled; the tracked files byte for byte unchanged;
//   2. the tracked tracking board, its mirror of the unit following its own view copy;
//   3. the same board opened from a worktree, the main checkout's copy found through the worktree's marker;
//   4. a page opened once the copy is there (the marker names it): it follows, and is no "older copy";
//   5. the copy seeded in a run's main checkout and removed: the board back to its tracked data, the label gone;
//   6. the view copy page itself: its label, no second follow; 7. a board with no .live at all; 8. a published copy (http from another host name, with the copy on the server: nothing follows it), and
//   the board served from this machine (localhost: it follows); 9. a land handed back: the tracked board fresher than the copy, drawn at once, whether or not the copy has gone yet.
// It counts page exceptions and console.error calls, and apart from them the resource-load failures, each named, since a missing progress note is probed by design.
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os"), url = require("url");
const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
const args = process.argv.slice(2), oi = args.indexOf("--out"), OUT = path.resolve(oi >= 0 && args[oi + 1] ? args[oi + 1] : path.join(os.tmpdir(), "dashboards-view-follow"));
const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
const copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
const browsers = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
const browser = browsers.find(b => fs.existsSync(b)); if (!browser) { console.error("no Chrome/Edge found; set CHROME=<path to binary>"); process.exit(2); }
const PB = sk("plan/template/dashboard.html"), APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), BOARD = sk("plan/scripts/board.js");
const EX = JSON.parse(rd(sk("plan/examples/38-handshake-empty-name/plan.json"))), TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
const env = { ...process.env, DASHBOARDS_ADMIN_STATE: path.join(OUT, "no-state.json") };
const run = (f, a, cwd) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, env, cwd });
const git = (cwd, ...a) => cp.spawnSync("git", ["-c", "user.name=verify", "-c", "user.email=verify@example.invalid", ...a], { cwd, encoding: "utf8", windowsHide: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ": " + detail}`); };

/* ---------- the scratch tree ---------- */
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const main = path.join(OUT, "repo"), wt = path.join(OUT, "wt"), rel = ["docs", "plans", "55-http-client-stack"], FOLDER = "docs/plans/55-http-client-stack/47-java-23-bytecode";
const tdir = path.join(main, ...rel), sdir = path.join(tdir, "47-java-23-bytecode"), vS = path.join(main, "docs", "plans", ".live", "view", "55-http-client-stack", "47-java-23-bytecode");
git(OUT, "init", "-q", "-b", "master", main); wr(path.join(main, ".git", "info", "exclude"), "docs/plans/.live/\n");
const sub = copy(EX); Object.assign(sub, { issue: 47, slug: "47-java-23-bytecode", folder: FOLDER, parent: { issue: 55 }, status: "building", asBuilt: { ref: "master", sha: sub.baseline.sha, date: sub.baseline.date } });
delete sub.issueBoards; sub.milestones = sub.milestones.filter(m => m.column !== "built"); sub.impact = { ...(sub.impact || {}), basis: "as-built" };
const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
const six = ["documentation-review", "reconcile-documentation", "dokka-check", "reconcile-plan", "readme-changelog", "state-boards"];
sub.wip = { ...sub.wip, step: "document", since: "2026-10-26T09:00:00Z", updated: "2026-10-26T09:20:00Z", current: ["built"], questions: [], research: null, open: [], event: { name: "document", at: "2026-10-26T09:20:00Z" }, steps: STEPS,
  document: { tasks: [...six.map(id => ({ id, name: id, state: "done" })), { id: "document-landing", name: "Document-landing commit", state: "done" }] } };
const trk = copy(TRK); trk.wip.updated = "2026-10-26T09:00:00Z";
fs.readdirSync(sk("plan/examples/38-handshake-empty-name")).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk("plan/examples/38-handshake-empty-name/" + f), path.join(sdir, f), { recursive: true }));
wr(path.join(tdir, "plan.json"), js(trk) + "\n"); wr(path.join(tdir, "dashboard.html"), rd(PB)); wr(path.join(sdir, "plan.json"), js(sub) + "\n"); wr(path.join(sdir, "dashboard.html"), rd(PB));
run(EMBED, [sdir]); run(EMBED, [tdir]);
git(main, "add", "-A"); git(main, "commit", "-q", "-m", "the board at document");
const M = (git(main, "rev-parse", "HEAD").stdout || "").trim();
git(main, "worktree", "add", "-q", "-b", "feat/47", wt);
const live = run(BOARD, ["--live", "--no-gh", "--root", main], main); if (live.status !== 0) { console.error(live.stdout + live.stderr); process.exit(1); }
const TRACKED = ["plan.json", "dashboard.html", "plan.js"].flatMap(f => [path.join(sdir, f), path.join(tdir, f)]), snap = () => TRACKED.map(rd).join("\0"), tracked0 = snap();
let qn = 0;
const raise = (ev, facts, at, tree) => { const q = wr(path.join(OUT, `q-${++qn}.json`), js({ v: 1, action: "plan-board", github: sub.repo, issue: 47, event: ev, folder: FOLDER, facts: facts || {} }));
  const a = run(APPLY, ["--event", q, "--worktree", tree || main, "--main", main, "--no-gh", "--view", "--at", at, "--json"], main); let S = {}; try { S = JSON.parse(a.stdout); } catch (e) { S = { error: (a.stdout || a.stderr).slice(0, 300) }; } return { status: a.status, S }; };

/* ---------- headless Chrome over its DevTools protocol ---------- */
const prof = path.join(OUT, "profile"); fs.mkdirSync(prof, { recursive: true });
const http = require("http"), MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((q, s) => { const f = path.join(main, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": MIME[path.extname(f)] || "text/plain", "cache-control": "no-store" }); s.end(b); }); });
const chrome = cp.spawn(browser, ["--host-resolver-rules=MAP published.test 127.0.0.1", "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${prof}`, "--window-size=1400,1000", "about:blank"], { stdio: "ignore", windowsHide: true });
async function endpoint() { const f = path.join(prof, "DevToolsActivePort"); for (let i = 0; i < 100; i++) { if (fs.existsSync(f)) { const [p, wsp] = rd(f).split(/\r?\n/); if (p && wsp) return { port: p, ws: `ws://127.0.0.1:${p}${wsp}` }; } await sleep(100); } throw new Error("Chrome did not open its debugging port"); }
async function openPage(port, target, label) {
  const info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const wait = new Map(), page = { label, errors: [], resource: [], close: async () => { try { await fetch(`http://127.0.0.1:${port}/json/close/${info.id}`); } catch (e) {} } };
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); return; }
    if (d.method === "Runtime.exceptionThrown") page.errors.push("exception: " + ((d.params.exceptionDetails.exception || {}).description || d.params.exceptionDetails.text));
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") page.errors.push("console.error: " + d.params.args.map(a => a.value || a.description).join(" "));
    if (d.method === "Log.entryAdded" && d.params.entry.level === "error") { const e = d.params.entry; if (/Failed to load resource/.test(e.text)) page.resource.push(e.url || e.text); else page.errors.push("log: " + e.text); } };
  const send = (method, params) => new Promise(res => { const i = ++id; wait.set(i, res); ws.send(js({ id: i, method, params: params || {} })); });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable"); await send("Page.navigate", { url: target });
  page.eval = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  page.shot = async name => { const r = await send("Page.captureScreenshot", { format: "png" }); if (r.result && r.result.data) fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(r.result.data, "base64")); };
  return page;
}
const READ = `JSON.stringify({ step:(document.querySelector(".sp-t")||{}).textContent||"", wip:(document.querySelector(".wip")||{dataset:{}}).dataset.step||"", label:(document.getElementById("liveview")||{}).textContent||"", chip:(document.getElementById("live")||{}).textContent||"", newer:(document.getElementById("newer")||{}).textContent||"", src:(document.getElementById("source-small")||{}).textContent||"", status:(document.getElementById("h1")?1:0), body:(document.querySelector(".wip")||{}).textContent||"", mirror:[...document.querySelectorAll(".wip")].map(x=>x.textContent).join(" ") })`;
const state = async p => { try { return JSON.parse(await p.eval(READ)); } catch (e) { return {}; } };
const until = async (p, test, ms = 14000) => { const t0 = Date.now(); let s; do { s = await state(p); if (test(s)) return s; await sleep(400); } while (Date.now() - t0 < ms); return s; };
const fileUrl = f => url.pathToFileURL(f).href;

(async () => {
  const { port } = await endpoint(), pages = [];
  const open = async (f, label) => { const p = await openPage(port, f, label); pages.push(p); return p; };
  const SB = fileUrl(path.join(sdir, "dashboard.html")), TB = fileUrl(path.join(tdir, "dashboard.html")), WB = fileUrl(path.join(wt, ...FOLDER.split("/"), "dashboard.html"));

  /* 1-3: the pages open at document, no view copy yet */
  const pS = await open(SB, "tracked sub-issue, main"), pT = await open(TB, "tracked tracking board, main"), pW = await open(WB, "tracked sub-issue, worktree");
  let s = await until(pS, x => x.step === "Document"); check("1. the tracked board opens at Document, no label, the Source tab's words as committed", s.step === "Document" && !s.label && /committed file/.test(s.src) && /^.?LIVE/.test(s.chip), js(s));
  await pS.shot("1-document");
  s = await until(pW, x => x.step === "Document"); check("3. the worktree's board opens at Document", s.step === "Document" && !s.label, js(s));

  const r1 = raise("landing", { pr: 90 }, "2026-10-26T09:30:00Z", wt); check("landing raised with --view from the worktree", r1.status === 0, js(r1.S));
  s = await until(pS, x => x.step === "Landing");
  check("1. a view copy at landing: the same page shows Landing, labelled the live view", s.step === "Landing" && /^Live view\./.test(s.label) && /Document/.test(s.label) && /live view/.test(s.chip) && /live view's copy/.test(s.src) && !s.newer, js(s));
  await pS.shot("2-landing");
  s = await until(pW, x => x.step === "Landing"); check("3. the worktree's board finds the main checkout's copy through its marker", s.step === "Landing" && /^Live view\./.test(s.label), js(s));
  s = await until(pT, x => /live view/.test(x.chip)); check("2. the tracking board follows its own copy, the unit's mirror at its landing", /^Live view\./.test(s.label) && /live view/.test(s.chip), js(s));
  await pT.shot("3-tracking-landing");
  const unitStep = expr => pT.eval(`JSON.stringify((PLAN.rows||[]).filter(r=>r.unit&&r.unit.issue===47).map(r=>[(r.unit.live||{}).step,(r.asBuilt||{}).state]))`);
  check("2. the unit's mirror reads landing", /"landing"/.test(await unitStep()), await unitStep());

  /* 4: a page opened now: the marker names the copy, and it is no older copy */
  const pN = await open(SB, "tracked sub-issue, opened with the copy there"); s = await until(pN, x => x.step === "Landing");
  check("4. opened with the copy there: it follows at once, and says no \"older copy\"", s.step === "Landing" && /^Live view\./.test(s.label) && !s.newer && !/newer copy/.test(s.chip), js(s));

  const r2 = raise("merge", { pr: 90 }, "2026-10-26T09:40:00Z", wt); check("merge raised with --view", r2.status === 0, js(r2.S));
  s = await until(pS, x => x.step === "Merge"); check("1. merge: Merge, still labelled", s.step === "Merge" && /^Live view\./.test(s.label), js(s));
  const r3 = raise("landed", { pr: 90, sha: M, merge: M, date: "2026-10-26", mergedAt: "2026-10-26T09:42:00Z" }, "2026-10-26T09:50:00Z", main); check("landed raised with --view from the main checkout", r3.status === 0 && r3.S.result === "ok", js(r3.S));
  s = await until(pS, x => /not live/.test(x.chip));
  const st = await pS.eval(`JSON.stringify([PLAN.status,WIP.step,LIVE.timer===null])`);
  check("1. landed: the board shows it landed, labelled, and stops polling", /"built","landed",true/.test(st) && /^Live view\./.test(s.label) && /live view/.test(s.chip), js([st, s]));
  await pS.shot("4-landed");
  s = await until(pT, x => pT && /live view/.test(x.chip)); await sleep(6000);
  check("2. the tracking board: its unit landed, in the copy", /"landed"\]/.test(await unitStep()), await unitStep());
  await pT.shot("5-tracking-landed");
  check("nothing committed changed: the tracked boards byte for byte", snap() === tracked0, "the tracked files differ");
  check("git sees the main checkout clean", !(git(main, "status", "--porcelain").stdout || "").trim(), git(main, "status", "--porcelain").stdout);

  /* 6: the view copy page itself */
  const pV = await open(fileUrl(path.join(vS, "dashboard.html")), "the view copy itself"); s = await until(pV, x => /Live view/.test(x.label));
  check("6. the view copy itself: labelled, its own data, no follow", /^Live view\./.test(s.label) && (await pV.eval("FOLLOW.url")) === null && (await pV.eval("WIP.step")) === "landed", js(s));

  /* 5: a run in the main checkout seeds it, and the copy goes: a page still polling goes back to its tracked data */
  const pB = await open(SB, "tracked sub-issue, to go back"); await until(pB, x => /^Live view\./.test(x.label));
  await pB.eval("LIVE.timer=LIVE.timer||setInterval(poll,2000);1");
  fs.rmSync(vS, { recursive: true, force: true }); const bb = run(BOARD, ["--live", "--no-gh", "--root", main], main);
  s = await until(pB, x => !x.label);
  check("5. the copy gone: the board back to its tracked data, the label off", !s.label && s.step === "Document" && !/live view/.test(s.chip) && /committed file/.test(s.src), js([s, bb.status]));

  /* 7: no .live at all */
  const bare = path.join(OUT, "bare"); const bd = path.join(bare, ...FOLDER.split("/")); fs.mkdirSync(path.dirname(bd), { recursive: true }); fs.cpSync(sdir, bd, { recursive: true });
  const pNo = await open(fileUrl(path.join(bd, "dashboard.html")), "no .live"); await sleep(7000); s = await state(pNo);
  check("7. a tracked board with no .live: Document, no label, still live on its own plan.js", s.step === "Document" && !s.label && /^.?LIVE/.test(s.chip) && !/unavailable/.test(s.chip), js(s));
  const res = pNo.resource.filter(u => /\.live\/view\//.test(u)); check("7. …and it probes no view copy", !res.length, js(res));

  /* 9 and 8: a view copy again, at a land handed back */
  const pH = await open(SB, "tracked sub-issue, a land handed back"), r4 = raise("landing", { pr: 91 }, "2026-10-26T10:00:00Z", main); check("landing raised anew with --view", r4.status === 0, js(r4.S));
  s = await until(pH, x => x.step === "Landing"); check("9. the copy again: Landing, labelled", s.step === "Landing" && /^Live view\./.test(s.label), js(s));
  await new Promise(res => server.listen(0, "127.0.0.1", res)); const sp = server.address().port, servedPath = FOLDER + "/dashboard.html";
  const pP = await open(`http://published.test:${sp}/${servedPath}`, "a published copy, another host"), pL = await open(`http://localhost:${sp}/${servedPath}`, "served from this machine");
  await sleep(7000); s = await state(pP);
  check("8. a published copy, the copy on its server: Document, no label, not live", s.step === "Document" && !s.label && /^not live/.test(s.chip) && (await pP.eval("FOLLOW.url")) === null, js(s));
  check("8. …and it loads nothing under .live/view/", !pP.resource.some(u => /\.live\/view/.test(u)), js(pP.resource.slice(0, 4)));
  s = await until(pL, x => x.step === "Landing"); check("8. served from this machine: it follows", s.step === "Landing" && /^Live view\./.test(s.label), js(s));
  await pP.shot("6-published");
  const later = "2026-10-26T10:30:00Z", tf = path.join(sdir, "plan.json"), tp = JSON.parse(rd(tf)); tp.wip.updated = later; tp.wip.detail = "Verification case: the run went on after the land was handed back."; wr(tf, js(tp) + "\n"); run(EMBED, [sdir]);
  s = await until(pH, x => !x.label);
  const dt = await pH.eval("WIP.detail");
  check("9. the tracked board fresher, the copy still on disk: the tracked data at once, the label off", !s.label && s.step === "Document" && /went on after/.test(dt || "") && fs.existsSync(path.join(vS, "plan.json")), js([s, dt]));
  const tp2 = JSON.parse(rd(tf)); tp2.wip.updated = "2026-10-26T10:31:00Z"; tp2.wip.detail = "Verification case: a second tracked update."; wr(tf, js(tp2) + "\n"); run(EMBED, [sdir]);
  await sleep(6500); check("9. …and a later tracked update is drawn too, while the copy is still read", /second tracked update/.test((await pH.eval("WIP.detail")) || ""), await pH.eval("WIP.detail"));
  const b9 = run(BOARD, ["--live", "--no-gh", "--root", main], main); await sleep(6000); s = await state(pH);
  check("9. board.js --live removes the stale copy (it never merged); the page unchanged, no failed load of it", !fs.existsSync(path.join(vS, "plan.json")) && s.step === "Document" && !s.label, js([s, b9.stdout.slice(0, 300)]));

  /* errors, page by page */
  for (const p of pages) { check(`0 page exceptions and console errors: ${p.label}`, !p.errors.length, js(p.errors.slice(0, 5)));
    const unk = [...new Set(p.resource)].filter(u => !/\.live\/(progress|open|docs|index\.js|boards\.js)/.test(u) && !/\/\.live\/$/.test(u) && !/favicon\.ico/.test(u)); console.log(`     resource-load failures (a missing progress note or marker is probed by design): ${p.resource.length}${unk.length ? ", others: " + js(unk.slice(0, 5)) : ", none other"}`); check(`no failed load outside the .live probes: ${p.label}`, !unk.length, js(unk.slice(0, 5))); }
  await Promise.all(pages.map(p => p.close()));
  const bad = results.filter(x => !x.ok); console.log(`\n${results.length - bad.length}/${results.length} checks passed; screenshots in ${OUT}`);
  chrome.kill(); server.close(); await sleep(300); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
