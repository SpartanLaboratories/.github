// The case groups of admin-team/dashboards-skill/32, run by verify-templates.js (it passes its helpers in): the Timeline tile of a landed
// board as one legend entry per visit of a run step (the step panel's vocabulary, repeats as "qa · 1st pass", "remediation · loop 1"),
// each with its start → end and its duration, in place of dashboards-skill/23's four phases in calendar days ("same day"); the bounds from
// the record only (the snapshots' since and ended, plan.sized, a qa pass's at, the merge's time and the branch's step commits from git, a
// neighbour's bound where no step of the line lies between), "—" where none; spans in minutes, hours and minutes, or days and hours; the
// bar one segment per timed visit in a neutral ramp; the figure the sum of the visits drawn; a landed board's Timeline across the KPI row;
// lib.js gitTimes(), timeline.js --from-git and apply-event.js's landed recording the merge's time; check.js reporting the entries and
// refusing a bad asBuilt.at or commit; and the feature probe of this run. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases32(X) {
  const { sk, out, targets, dumpDom, embedJs, node, withData, chrome } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  if (!PB || !WB) return [["the dashboards-skill/32 cases (both plan-set templates under test)", [["both plan-set templates are under test", false, "a repository template set without them skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const git = (dir, a) => cp.execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_AUTHOR_NAME: "v", GIT_AUTHOR_EMAIL: "v@example.invalid", GIT_COMMITTER_NAME: "v", GIT_COMMITTER_EMAIL: "v@example.invalid" } }).trim();
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), TIMELINE = sk("plan/scripts/timeline.js");
  const sc = path.join(out, "skill-32"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json");
  const probeAt = (html, code) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${code} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  const planPage = (name, d, code) => { const dir = path.join(sc, name), html = withData(rd(PB), "plan", JSON.stringify(d, null, 2)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); return wr(path.join(dir, "dashboard.html"), code ? probeAt(html, code) : html); };
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  /* A landed run shaped as WebTools #63's: sizing, research, plan and branch ended before the snapshots (the trail names them), the
     interview never recorded; implementation, two qa passes, two remediation loops and the landing frozen in wip.history; the merge's time
     and the research commits from git. */
  const H = (since, ended, o) => ({ since, ended, endedBy: "x", to: "y", ...(o || {}) });
  const run63 = () => { const d = copy(EX);
    d.sized = null; delete d.sized;
    d.wip.steps = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"];
    d.trail = [{ date: "2026-10-22", column: "gap", label: "Issue #63 opened" }, { date: "2026-10-25", column: "gap", label: "Run started: sized as one system" },
      { date: "2026-10-25", column: "gap", label: "Research started: `wiring`" }, { date: "2026-10-25", column: "gap", label: "Research verified; the plan next" },
      { date: "2026-10-25", column: "verdict", label: "Plan accepted" }, { date: "2026-10-25", column: "built", label: "Branch `feat/x` cut; implementation starts at S1" }];
    d.wip.qa = [{ pass: 1, verdict: "changes-requested", date: "2026-10-25", at: "2026-10-25T19:38:32Z", route: "planner-then-rookie-dev" }, { pass: 2, verdict: "changes-requested", date: "2026-10-25", at: "2026-10-25T20:44:31Z", route: "on-the-spot" }];
    d.wip.history = {
      implementation: [H("2026-10-25T14:21:18Z", "2026-10-25T19:00:34Z")],
      qa: [H("2026-10-25T19:00:34Z", "2026-10-25T19:38:32Z", { qa: [d.wip.qa[0]] }), H("2026-10-25T19:58:08Z", "2026-10-25T20:44:31Z", { qa: [d.wip.qa[1]] })],
      remediation: [H("2026-10-25T19:38:32Z", "2026-10-25T19:58:08Z", { remediation: { pass: 1, route: "planner-then-rookie-dev" }, qa: [d.wip.qa[0]] }), H("2026-10-25T20:44:31Z", "2026-10-25T21:38:04Z", { remediation: { pass: 2, route: "on-the-spot" }, qa: [d.wip.qa[1]] })],
      landing: [H("2026-10-25T21:38:04Z", "2026-10-25T22:03:35Z")] };
    Object.assign(d.asBuilt, { at: "2026-10-25T21:40:14Z", commits: [{ sha: "eb274e0", at: "2026-10-25T12:35:59Z", step: "research" }, { sha: "7cabe98", at: "2026-10-25T13:45:54Z", step: "research" }] });
    return d; };
  const L = T => T.visits.map(v => `${v.label}|${v.from ? (v.from.how === "by" ? "by " : "") + v.from.t : "-"}|${v.to ? v.to.t + (v.to.merge ? "M" : "") : "-"}|${v.ms != null ? lib.tlSpan(v.ms) : "-"}`);

  /* 1. the rule in lib.js */
  guard("lib.js timelineSteps(): one entry per visit of a run step, its bounds from the record only, \"—\" where none (dashboards-skill/32)", c => {
    const T = lib.timelineSteps(run63()), got63 = L(T);
    const want63 = ["sizing|-|-|-", "research|by 2026-10-25T12:35:59Z|-|-", "plan|-|-|-", "branch|-|2026-10-25T14:21:18Z|-",
      "implementation|2026-10-25T14:21:18Z|2026-10-25T19:00:34Z|4 h 39 min", "qa · 1st pass|2026-10-25T19:00:34Z|2026-10-25T19:38:32Z|38 min",
      "remediation · loop 1|2026-10-25T19:38:32Z|2026-10-25T19:58:08Z|20 min", "qa · 2nd pass|2026-10-25T19:58:08Z|2026-10-25T20:44:31Z|46 min",
      "remediation · loop 2|2026-10-25T20:44:31Z|2026-10-25T21:38:04Z|54 min", "landing|2026-10-25T21:38:04Z|2026-10-25T21:40:14ZM|2 min"];
    c.push(["#63's run: the steps in the order visited, repeats named by pass and loop, each with its bounds and its duration", js(got63) === js(want63), js(got63)]);
    c.push(["the steps the record says nothing of are no entry, named apart (the interview)", js(T.left) === js(["interview"]) && lib.timelineLeftOut(T) === "not summed: sizing, research, plan, branch (a bound not recorded) · no record of: interview", lib.timelineLeftOut(T)]);
    c.push(["the figure: the sum of the visits drawn, in hours and minutes (4 h 39 + 38 + 20 + 46 + 54 + 2 min)", lib.tlSpan(lib.timelineTotal(T)) === "7 h 19 min", lib.tlSpan(lib.timelineTotal(T))]);
    c.push(["the last visit ends at the merge (asBuilt.at), not at the pre-merge refresh's landed event", T.visits[9].to.t === "2026-10-25T21:40:14Z" && T.visits[9].to.merge === true, js(T.visits[9])]);
    c.push(["a neighbour's bound across the next step of the line: the branch ends when implementation began", T.visits[3].to && T.visits[3].to.t === "2026-10-25T14:21:18Z", js(T.visits[3])]);
    const nm = run63(); delete nm.asBuilt.at; const Tn = lib.timelineSteps(nm);
    c.push(["no merge time recorded: the landing ends at its snapshot's end (the record's), 26 min", L(Tn)[9] === "landing|2026-10-25T21:38:04Z|2026-10-25T22:03:35Z|26 min", L(Tn)[9]]);
    const sz = run63(); sz.sized = "2026-10-25T11:54:26Z"; const Ts = lib.timelineSteps(sz);
    c.push(["plan.sized ends the sizing; never across the interview to the research's start (a step between may hold an unrecorded visit)", L(Ts)[0] === "sizing|-|2026-10-25T11:54:26Z|-" && L(Ts)[1] === "research|by 2026-10-25T12:35:59Z|-|-", js(L(Ts).slice(0, 2))]);
    const nointv = run63(); nointv.sized = "2026-10-25T11:54:26Z"; nointv.wip.steps = nointv.wip.steps.filter(s => s !== "interview"); const Ti = lib.timelineSteps(nointv);
    c.push(["…with no interview in the steps line, the research starts when the sizing ended (the next step of the line)", L(Ti)[1] === "research|2026-10-25T11:54:26Z|-|-", L(Ti)[1]]);
    const nc = run63(); delete nc.asBuilt.commits;
    c.push(["no step commit recorded: the research's start is \"—\", never guessed", L(lib.timelineSteps(nc))[1] === "research|-|-|-", L(lib.timelineSteps(nc))[1]]);
    const dated = copy(EX), Td = lib.timelineSteps(dated);
    c.push(["a board with dates only (the example): every visit \"—\", no figure, nothing drawn (a date alone is no time)", Td.visits.length > 0 && Td.visits.every(v => !v.from && !v.to && v.ms == null) && lib.timelineTotal(Td) === null, js(L(Td))]);
    const noHist = copy(EX); noHist.wip.qa = [{ pass: 1, verdict: "changes-requested", at: "2026-10-20T09:00:00Z" }, { pass: 2, verdict: "approved", at: "2026-10-20T11:30:00Z" }];
    const Tq = lib.timelineSteps(noHist), qq = L(Tq).filter(x => /^(qa|remediation)/.test(x));
    c.push(["no snapshot at qa: a visit per qa pass ending at its at, a remediation loop per pass that requested changes, interleaved, the loop starting where its pass ended",js(qq) === js(["qa · 1st pass|-|2026-10-20T09:00:00Z|-", "remediation · loop 1|2026-10-20T09:00:00Z|-|-", "qa · 2nd pass|-|2026-10-20T11:30:00Z|-"]), js(qq)]);
    const order = run63(); order.wip.history.qa[0].ended = "2026-10-25T18:00:00Z"; const To = lib.timelineSteps(order);
    c.push(["bounds out of order: no duration, not drawn, named with that reason", To.visits.some(v => v.order && v.label === "qa · 1st pass") && /not summed: qa · 1st pass \(bounds out of order\)/.test(lib.timelineLeftOut(To)), lib.timelineLeftOut(To)]);
    /* the shades: since dashboards-skill/34 one per step within its kind of work (verify/cases-34.js), in place of the neutral ramp */
    const sh = T.visits.filter(v => v.ms != null).map(v => [v.step, v.family, v.shade]);
    c.push(["one shade per step within its kind of work, a step's repeats sharing it (dashboards-skill/34)", js(sh) === js([["implementation", "build", 100], ["qa", "checking", 0], ["remediation", "checking", 100], ["qa", "checking", 0], ["remediation", "checking", 100], ["landing", "landing", 50]]), js(sh)]);
    const trk = copy(TRK); Object.assign(trk, { status: "built" }); trk.asBuilt = { ref: "master", sha: "7de8207", date: "2026-10-30", at: "2026-10-30T16:00:00Z" }; trk.wip.step = "landed"; trk.wip.current = [];
    trk.wip.steps = ["sizing", "interview", "research", "architecture", "sub-issues", "boards", "landing", "implementation", "landed"];
    trk.wip.history = { "sub-issues": [H("2026-10-21T10:00:00Z", "2026-10-21T10:40:00Z")], boards: [H("2026-10-21T10:40:00Z", "2026-10-21T11:05:00Z")], landing: [H("2026-10-21T11:05:00Z", "2026-10-22T09:00:00Z")], implementation: [H("2026-10-22T09:00:00Z", "2026-10-30T15:00:00Z")] };
    const Tt = lib.timelineSteps(trk), tl = L(Tt).filter(x => /^(sub-issues|boards|landing|implementation)/.test(x));
    c.push(["a tracking board's own steps: filing, its boards, its plan's landing, then its units' runs ending at the last unit's merge, in days and hours", js(tl) === js(["sub-issues|2026-10-21T10:00:00Z|2026-10-21T10:40:00Z|40 min", "boards|2026-10-21T10:40:00Z|2026-10-21T11:05:00Z|25 min", "landing|2026-10-21T11:05:00Z|2026-10-22T09:00:00Z|21 h 55 min", "implementation|2026-10-22T09:00:00Z|2026-10-30T16:00:00ZM|8 days 7 h"]), js(tl)]);
  });

  /* 2. the spans */
  guard("lib.js tlSpan(): minutes under an hour, hours and minutes under a day, days and hours beyond, never \"same day\" (dashboards-skill/32)", c => {
    const m = n => n * 6e4, cases = [[m(0.4), "under 1 min"], [m(40), "40 min"], [m(59.6), "1 h"], [m(155), "2 h 35 min"], [m(120), "2 h"], [m(1439), "23 h 59 min"], [m(1440), "1 day"], [m(1440 * 3 + 250), "3 days 4 h"], [m(1440 + 23 * 60 + 50), "2 days"], [null, "—"]];
    cases.forEach(([ms, want]) => c.push([`${ms == null ? "no span" : Math.round(ms / 6e4) + " min"} reads "${want}"`, lib.tlSpan(ms) === want, lib.tlSpan(ms)]));
  });

  /* 3. the board */
  guard("the board: the Timeline tile's figure, sub-line, bar and legend of step visits, across a landed board's KPI row (dashboards-skill/32)", c => {
    if (!chrome) { c.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const TILE = 'const st=document.getElementById("t-steps");if(st)st.click();const ks=[...document.querySelectorAll("#kpis>.kpi")],k=document.querySelector("#tl-tile>.kpi"),K=document.getElementById("kpis"),segs=[...k.querySelectorAll(".seg-bar i")],es=[...k.querySelectorAll(".key.tl-steps>.tl-step")];const col=()=>segs.map(i=>getComputedStyle(i).backgroundColor);const light=col();document.documentElement.dataset.theme="dark";const dark=col();const r=x=>x.getBoundingClientRect();document.body.dataset.r=JSON.stringify({l:k.querySelector(".l").textContent,v:k.querySelector(".v").textContent,s:k.querySelector(".s").textContent,segs:segs.map(i=>[Math.round(r(i).width),i.title]),light,dark,es:es.map(e=>[e.querySelector("b").textContent,e.querySelector(".tl-dur").textContent,!!e.querySelector("i.segk.tp"),[...e.querySelectorAll("time")].map(t=>[t.getAttribute("datetime"),t.dataset.local||""]),e.querySelector(".tl-when").textContent]),note:(k.querySelector(".tl-note")||{}).textContent||"",w:Math.round(r(K).width),tw:Math.round(r(k).width),tt:Math.round(r(k).top),ot:ks.map(x=>[Math.round(r(x).width),Math.round(r(x).top)]),txt:k.textContent,sw:document.documentElement.scrollWidth>document.documentElement.clientWidth});';
    const d = run63(), T = lib.timelineSteps(d);
    const r1 = got(dumpDom(planPage("tl63", d, TILE), "", "1920,1080", 6000)) || {};
    c.push(["the figure, the sum of the visits drawn: \"7 h 19 min\"", r1.l === "Timeline" && r1.v === "7 h 19 min", js([r1.l, r1.v, r1.err])]);
    c.push(["the sub-line: the run's date, the zone of its times, the visits not summed and the step never recorded", /2026/.test(r1.s || "") && /times \S+/.test(r1.s || "") && /not summed: sizing, research, plan, branch \(a bound not recorded\)/.test(r1.s || "") && /no record of: interview/.test(r1.s || ""), r1.s]);
    c.push(["the legend: one entry per visit, in order, each with its step and duration as lib.js gives them", js((r1.es || []).map(e => [e[0], e[1]])) === js(T.visits.map(v => [v.label, v.ms != null ? lib.tlSpan(v.ms) : "—"])), js((r1.es || []).map(e => [e[0], e[1]]))]);
    c.push(["each timed entry carries its segment's swatch, an untimed one none; one segment per timed visit, each at least 4 px", js((r1.es || []).map(e => e[2])) === js(T.visits.map(v => v.ms != null)) && (r1.segs || []).length === 6 && (r1.segs || []).every(s => s[0] >= 4), js([(r1.es || []).map(e => e[2]), r1.segs])]);
    c.push(["every time is a <time> holding the UTC stamp, shown in the viewer's zone (data-local); a bound not recorded is \"—\"; a \"by\" start and the merge are said", js((r1.es || []).map(e => e[3].map(t => t[0]))) === js(T.visits.map(v => [v.from, v.to].filter(Boolean).map(b => b.t))) && (r1.es || []).every(e => e[3].every(t => t[1] === "1")) && /^— → —$/.test((r1.es || [[]])[0][4] || "") && /^by /.test((r1.es || [[], []])[1][4] || "") && / merged$/.test((r1.es || []).slice(-1)[0] && (r1.es || []).slice(-1)[0][4] || ""), js((r1.es || []).map(e => e[4]))]);
    c.push(["the note names the marks drawn: \"—\", \"by\", \"merged\"", /— not recorded/.test(r1.note || "") && /by: the step under way at its first commit/.test(r1.note || "") && /merged: the run's end, the merge/.test(r1.note || ""), r1.note]);
    c.push(["no \"same day\" and no phase in the tile", !/same day|left out:/.test(r1.txt || ""), (r1.txt || "").slice(0, 200)]);
    const chans = x => { const m = String(x).match(/[\d.]+/g) || [], v = m.slice(0, 3).map(Number); return /color\(/.test(x) ? v : v.map(y => y / 255); };
    const lum = x => { const v = chans(x); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const hsl = x => { const [r, g, b] = chans(x), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn; if (!dd) return { h: 0, s: 0 }; const s = dd / (1 - Math.abs(2 * l - 1)), h = 60 * (mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4); return { h: (h + 360) % 360, s }; };
    /* since dashboards-skill/34 the shades are the kinds of work's (verify/cases-34.js): within checking, qa then remediation run darker in
       light and lighter in dark; a repeat takes its step's shade */
    const ll = [1, 2].map(i => lum((r1.light || [])[i])), dl = [1, 2].map(i => lum((r1.dark || [])[i]));
    c.push(["within a kind of work the shades run darker in light and lighter in dark; a repeat takes its step's shade", ll[1] < ll[0] && dl[1] > dl[0] && (r1.light || [])[1] === (r1.light || [])[3] && (r1.dark || [])[2] === (r1.dark || [])[4], js([r1.light, r1.dark])]);
    c.push(["the shades take no status colour (the status-hue rule: saturation under 0.15, or a hue in 175°–295°)", [...(r1.light || []), ...(r1.dark || [])].length === 12 && [...(r1.light || []), ...(r1.dark || [])].every(x => { const q = hsl(x); return q.s < 0.15 || (q.h >= 175 && q.h <= 295); }), js([r1.light, r1.dark])]);
    /* since dashboards-skill/34 the Timeline tile stands across the Timeline tab, the five KPI tiles in one row below it */
    c.push(["the Timeline tab: the Timeline tile across it, the five KPI tiles in one row below (1920 px)", (r1.ot || []).length === 5 && (r1.ot || []).every(x => x[1] === r1.ot[0][1] && x[0] >= r1.w * 0.18) && r1.tw >= r1.w * 0.98 && r1.tt < (r1.ot || [[0, 0]])[0][1], js([r1.w, r1.tw, r1.tt, r1.ot])]);
    const r2 = got(dumpDom(planPage("tl63-narrow", d, TILE), "", "520,1600", 6000)) || {};
    c.push(["at 520 px the tiles stack two by two, under the Timeline across the tab, with no sideways scroll (dashboards-skill/34)", !r2.sw && r2.tw >= r2.w * 0.98 && (r2.ot || []).length === 5 && r2.tt < (r2.ot || [[0, 0]])[0][1] && (r2.ot || [])[0][1] === (r2.ot || [])[1][1] && (r2.ot || [])[2][1] > (r2.ot || [])[0][1], js([r2.w, r2.tw, r2.ot, r2.sw])]);
    const r3 = got(dumpDom(planPage("tl-example", copy(EX), TILE), "", "1920,1080", 6000)) || {};
    c.push(["a board with dates only: \"—\" for the figure, no bar, every entry \"—\", the run's dates in the sub-line", r3.v === "—" && !(r3.segs || []).length && (r3.es || []).length > 0 && (r3.es || []).every(e => e[1] === "—" && !e[2]) && /2026/.test(r3.s || ""), js([r3.v, r3.s, (r3.es || []).length])]);
    const multi = run63(); multi.wip.history.implementation[0].ended = "2026-10-27T19:00:34Z"; ["qa", "remediation"].forEach(s => multi.wip.history[s].forEach(v => { v.since = v.since.replace("10-25", "10-27"); v.ended = v.ended.replace("10-25", "10-27"); }));
    multi.wip.history.landing[0].since = "2026-10-27T21:38:04Z"; multi.wip.history.landing[0].ended = "2026-10-27T22:03:35Z"; multi.asBuilt.at = "2026-10-27T21:40:14Z";
    const r4 = got(dumpDom(planPage("tl-multi", multi, TILE), "", "1920,1080", 6000)) || {};
    c.push(["a run over days: the span in days and hours (implementation 2 days 5 h), a later day's times with their day, the dates a range", (r4.es || []).some(e => e[0] === "implementation" && e[1] === "2 days 5 h") && /\d+\D+\d+:\d+/.test(String(((r4.es || []).find(e => e[0] === "landing") || [])[4] || "").split("→")[0]) && !/\d+\D+\d+:\d+/.test(String(((r4.es || []).find(e => e[0] === "implementation") || [])[4] || "").split("→")[0]) && /–/.test(r4.s || ""), js([(r4.es || []).map(e => [e[0], e[1], e[4]]), r4.s])]);
  });

  /* 4. git: gitTimes(), timeline.js --from-git, apply-event.js at landed; check.js */
  guard("the merge's time and the branch's step commits from git: lib.js gitTimes(), timeline.js --from-git, apply-event.js at landed; check.js (dashboards-skill/32)", c => {
    let haveGit = true; try { cp.execFileSync("git", ["--version"], { stdio: "ignore" }); } catch (e) { haveGit = false; }
    if (!haveGit) { c.push(["git is on the path", false, "no git"]); return; }
    const repo = path.join(sc, "repo"), folder = "docs/plans/91-verification-case", fdir = path.join(repo, ...folder.split("/"));
    fs.mkdirSync(fdir, { recursive: true }); git(repo, ["init", "-q", "-b", "main"]);
    const commit = (files, msg, when) => { files.forEach(([f, t]) => wr(path.join(repo, f), t)); git(repo, ["add", "-A"]); cp.execFileSync("git", ["-C", repo, "commit", "-q", "-m", msg], { env: { ...process.env, GIT_AUTHOR_NAME: "v", GIT_AUTHOR_EMAIL: "v@example.invalid", GIT_COMMITTER_NAME: "v", GIT_COMMITTER_EMAIL: "v@example.invalid", GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when } }); return git(repo, ["rev-parse", "HEAD"]); };
    commit([["README.md", "x\n"]], "base", "2026-10-25T10:00:00Z");
    git(repo, ["checkout", "-q", "-b", "feat"]);
    commit([[folder + "/research/README.md", "q\n"]], "docs: research questions", "2026-10-25T12:35:59Z");
    commit([[folder + "/plan.md", "p\n"]], "docs: plan", "2026-10-25T14:00:00Z");
    commit([["src/a.kt", "a\n"], [folder + "/plan.md", "p2\n"]], "feat: the change", "2026-10-25T21:39:35Z");
    git(repo, ["checkout", "-q", "main"]);
    cp.execFileSync("git", ["-C", repo, "merge", "-q", "--no-ff", "-m", "Merge feat", "feat"], { env: { ...process.env, GIT_AUTHOR_NAME: "v", GIT_AUTHOR_EMAIL: "v@example.invalid", GIT_COMMITTER_NAME: "v", GIT_COMMITTER_EMAIL: "v@example.invalid", GIT_AUTHOR_DATE: "2026-10-25T21:40:14Z", GIT_COMMITTER_DATE: "2026-10-25T21:40:14Z" } });
    const merge = git(repo, ["rev-parse", "HEAD"]);
    const g = lib.gitTimes(repo, folder, merge.slice(0, 7));
    c.push(["gitTimes(): the merge commit's time, and only the commits that change one step's documents alone, with their steps", g.at === "2026-10-25T21:40:14Z" && js((g.commits || []).map(x => [x.step, x.at])) === js([["research", "2026-10-25T12:35:59Z"], ["plan", "2026-10-25T14:00:00Z"]]), js(g)]);
    c.push(["gitTimes() where git cannot tell (a sha not in the clone, no repository): nothing, never a guess", js(lib.gitTimes(repo, folder, "abcdef1")) === "{}" && js(lib.gitTimes(path.join(sc, "nowhere"), folder, merge)) === "{}", js([lib.gitTimes(repo, folder, "abcdef1")])]);
    /* timeline.js --from-git on a landed board in that repository */
    const d = copy(EX); Object.assign(d, { folder, issue: 91, slug: "91-verification-case" }); d.asBuilt = { ref: "main", sha: merge.slice(0, 7), merge: merge.slice(0, 7), date: "2026-10-25" };
    wr(path.join(fdir, "plan.json"), JSON.stringify(d, null, 2) + "\n");
    const t1 = run(TIMELINE, [fdir, "--from-git"]), p1 = JSON.parse(rd(path.join(fdir, "plan.json")));
    c.push(["timeline.js --from-git records asBuilt.at and the step commits in plan.json and prints the entries", t1.status === 0 && p1.asBuilt.at === "2026-10-25T21:40:14Z" && (p1.asBuilt.commits || []).length === 2 && /recorded asBuilt\.at 2026-10-25T21:40:14Z/.test(t1.stdout) && /figure: /.test(t1.stdout), (t1.stdout + t1.stderr).slice(0, 400)]);
    const t2 = run(TIMELINE, [fdir, "--from-git"]);
    c.push(["…a second run changes nothing", t2.status === 0 && /plan\.json unchanged/.test(t2.stdout), t2.stdout.slice(0, 200)]);
    const nomerge = copy(d); nomerge.asBuilt = { ref: "main", sha: "abcdef1", merge: "abcdef1", date: "2026-10-25" }; const nd = path.join(repo, "docs", "plans", "92-other"); wr(path.join(nd, "plan.json"), JSON.stringify({ ...nomerge, folder: "docs/plans/92-other", issue: 92 }, null, 2) + "\n");
    const t3 = run(TIMELINE, [nd, "--from-git"]);
    c.push(["…a merge git cannot find: exit 1, nothing recorded", t3.status === 1 && !JSON.parse(rd(path.join(nd, "plan.json"))).asBuilt.at, (t3.stderr || "").slice(0, 200)]);
    /* apply-event.js landed, in that repository as the worktree */
    const lv = copy(EX); Object.assign(lv, { folder, issue: 91, slug: "91-verification-case", status: "building" }); lv.asBuilt = { ref: "main", sha: lv.baseline.sha, date: lv.baseline.date }; lv.wip.step = "landing"; lv.wip.current = [];
    ["plan.md", "architecture.md", "impact.md", "final-implementation.md"].forEach(x => wr(path.join(fdir, x), rd(sk("plan/examples/38-handshake-empty-name/" + x))));
    fs.readdirSync(sk("plan/examples/38-handshake-empty-name/research")).forEach(x => wr(path.join(fdir, "research", x), rd(sk("plan/examples/38-handshake-empty-name/research/" + x))));
    wr(path.join(fdir, "plan.json"), JSON.stringify(lv, null, 2) + "\n"); fs.writeFileSync(path.join(fdir, "dashboard.html"), rd(PB)); node(embedJs, fdir);
    const rq = wr(path.join(sc, "landed.json"), JSON.stringify({ v: 1, action: "plan-board", github: lv.repo, issue: 91, event: "landed", folder, facts: { pr: 9, merge: merge.slice(0, 7), sha: merge.slice(0, 7), date: "2026-10-25" } }));
    const a = run(APPLY, ["--event", rq, "--worktree", repo, "--no-live", "--no-gh", "--at", "2026-10-25T22:03:35Z", "--json"]), pa = JSON.parse(rd(path.join(fdir, "plan.json")));
    c.push(["apply-event.js at landed records the merge's time and the step commits from the worktree's git", a.status === 0 && pa.asBuilt.at === "2026-10-25T21:40:14Z" && (pa.asBuilt.commits || []).length === 2, js([a.status, pa.asBuilt, (a.stdout || "").slice(-300)])]);
    const rq2 = wr(path.join(sc, "landed2.json"), JSON.stringify({ v: 1, action: "plan-board", github: lv.repo, issue: 91, event: "landed", folder, facts: { pr: 9, merge: merge.slice(0, 7), sha: merge.slice(0, 7), date: "2026-10-25", mergedAt: "2026-10-25T21:41:00Z" } }));
    const a2 = run(APPLY, ["--event", rq2, "--worktree", repo, "--no-live", "--no-gh", "--at", "2026-10-25T22:05:00Z", "--json"]), pb = JSON.parse(rd(path.join(fdir, "plan.json")));
    c.push(["…facts.mergedAt, when the team sends it, is taken as the merge's time", a2.status === 0 && pb.asBuilt.at === "2026-10-25T21:41:00Z", js([a2.status, pb.asBuilt.at])]);
    /* check.js */
    const k1 = run(CHECK, [fdir]);
    c.push(["check.js reports a landed board's entries with the figure", /ok\s+timeline: [^\n]*landing: [^\n]*the figure: /.test(k1.stdout), (k1.stdout || "").split(/\r?\n/).filter(l => /timeline/.test(l)).join(" | ").slice(0, 400)]);
    const bad = JSON.parse(rd(path.join(fdir, "plan.json"))); bad.status = "built"; bad.asBuilt.at = "evening"; bad.asBuilt.commits = [{ sha: "zz", at: "x", step: "qa" }];
    wr(path.join(fdir, "plan.json"), JSON.stringify(bad, null, 2) + "\n"); node(embedJs, fdir);
    const k2 = run(CHECK, [fdir]);
    c.push(["check.js fails an asBuilt.at that is no time and a step commit not in its form", k2.status === 1 && /asBuilt\.at "evening" is not an ISO date-time/.test(k2.stdout) && /asBuilt\.commits\[0\] is not \{sha, at/.test(k2.stdout), (k2.stdout || "").split(/\r?\n/).filter(l => /^FAIL|asBuilt/.test(l)).join(" | ").slice(0, 300)]);
    const ord = run63(); Object.assign(ord, { folder, issue: 91, slug: "91-verification-case" }); ord.wip.history.qa[0].ended = "2026-10-25T18:00:00Z"; wr(path.join(fdir, "plan.json"), JSON.stringify(ord, null, 2) + "\n"); node(embedJs, fdir);
    const k3 = run(CHECK, [fdir]);
    c.push(["check.js warns on a visit whose bounds are out of order", /warn\s+the Timeline tile leaves out qa · 1st pass: its bounds are out of order/.test(k3.stdout), (k3.stdout || "").split(/\r?\n/).filter(l => /Timeline/.test(l)).join(" | ").slice(0, 300)]);
  });

  /* 5. the feature probe */
  guard("the feature probe of this run: the plan template carries timeline-steps, one without it does not (dashboards-skill/32)", c => {
    const T = rd(PB);
    c.push(["the plan template carries timeline-steps, and timeline-phases and timeline-sum still hold", !F.probe(T, "plan-board").some(m => ["timeline-steps", "timeline-phases", "timeline-sum"].includes(m.id)), js(F.probe(T, "plan-board").map(m => m.id))]);
    c.push(["timeline-steps applies to issue boards only; the repository work board and the state boards say why not", js(F.applicable("plan-board").filter(f => f.id === "timeline-steps").map(f => f.id)) === js(["timeline-steps"]) && ["work-board", "system", "supersystem"].every(k => !F.applicable(k).some(f => f.id === "timeline-steps")) && !!(F.FEATURES.find(f => f.id === "timeline-steps") || {}).notFor["work-board"], "applicable"]);
    c.push(["a plan template whose Timeline is the four phases (no timelineSteps()) lacks timeline-steps", F.probe(T.split("function timelineSteps(").join("function timelineStepz(").split("function timelineTile(").join("function timelineTilez("), "plan-board").some(m => m.id === "timeline-steps"), "probe"]);
    c.push(["the work-board template is untouched by it: no Timeline tile, its Landed tile counts runs", !/timelineSteps|tlSpan/.test(rd(WB)), "work board"]);
  });
  return groups;
};
