// The case groups of admin-team/dashboards-skill/34, run by verify-templates.js (it passes its helpers in): the Timeline tile coloured by
// kind of work (planning, build, checking, landing; a shade per step, a mark before each step line, a legend of the families, the colours
// clear of the status hues and the accent and at least 3:1 in both themes); approximate bounds (asBuilt.approx: "≈", never read as
// recorded, clamped onto a recorded bound, summed, check.js's form); the landing in three steps (landing, state-boards, merge: lib.js,
// apply-event.js's events and its steps line brought up, the step panel, the Timeline, an old board's landing alone); the roadmap of a
// sub-issue's board (lib.js fillRoadmap() from the repository work board's data or the parent tracking board, the template's card naming
// the parent where it is unset, board.js's units without the tracker); the four columns' tab named Design (#timeline still opening it);
// the Timeline tab (the Timeline tile, the KPI tiles below it with their tracers, a board in flight its steps so far); and the feature
// probes of this run. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

module.exports = function cases34(X) {
  const { sk, out, targets, dumpDom, withData, chrome } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const tp = name => (targets.find(t => t.name === name) || {}).path;
  const PB = tp("plan/template/dashboard.html"), WB = tp("plan/template/board.html");
  if (!PB || !WB) return [["the dashboards-skill/34 cases (both plan-set templates under test)", [["both plan-set templates are under test", false, "a repository template set without them skips these groups"]]]];
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const J = n => JSON.parse(rd(sk(n))), copy = x => JSON.parse(JSON.stringify(x)), js = x => JSON.stringify(x);
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", ...(o || {}) });
  const APPLY = sk("plan/scripts/apply-event.js"), CHECK = sk("plan/scripts/check.js"), EMBED = sk("plan/scripts/embed.js"), BOARD = sk("plan/scripts/board.js");
  const sc = path.join(out, "skill-34"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const EX = J("plan/examples/38-handshake-empty-name/plan.json"), TRK = J("verify/fixtures/tracking.plan.json"), LIVE = J("verify/fixtures/live-issue.plan.json"), SUB = J("verify/fixtures/sub-issue.plan.json");
  const probeAt = (html, code) => html.replace("</body>", `<script>window.addEventListener("load",()=>setTimeout(()=>{ try{ ${code} }catch(e){ document.body.dataset.r=JSON.stringify({err:e.message}); } },700));</script></body>`);
  const got = d => { const m = (d || "").match(/<body[^>]*data-r="([^"]*)"/); if (!m) return null; try { return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")); } catch (e) { return { err: "unparsed " + m[1].slice(0, 80) }; } };
  const planPage = (name, d, code, hash) => { const dir = path.join(sc, name), html = withData(rd(PB), "plan", JSON.stringify(d, null, 2)); wr(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(d, null, 2))); const f = wr(path.join(dir, "dashboard.html"), code ? probeAt(html, code) : html); return hash ? f + "#" + hash : f; };
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };

  /* WebTools #63's landed run (as in cases-32.js), with the arrival times it was backfilled with */
  const H = (since, ended, o) => ({ since, ended, endedBy: "x", to: "y", ...(o || {}) });
  const run63 = () => { const d = copy(EX); delete d.sized;
    d.wip.steps = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"];
    d.trail = [{ date: "2026-10-25", column: "gap", label: "Run started: sized as one system" }, { date: "2026-10-25", column: "gap", label: "Research started: `wiring`" }, { date: "2026-10-25", column: "verdict", label: "Plan accepted" }, { date: "2026-10-25", column: "built", label: "Branch `feat/x` cut; implementation starts at S1" }];
    d.wip.qa = [{ pass: 1, verdict: "changes-requested", date: "2026-10-25", at: "2026-10-25T19:38:32Z", route: "re-plan-then-remediation" }, { pass: 2, verdict: "changes-requested", date: "2026-10-25", at: "2026-10-25T20:44:31Z", route: "on-the-spot" }];
    d.wip.history = { implementation: [H("2026-10-25T14:21:18Z", "2026-10-25T19:00:34Z")],
      qa: [H("2026-10-25T19:00:34Z", "2026-10-25T19:38:32Z", { qa: [d.wip.qa[0]] }), H("2026-10-25T19:58:08Z", "2026-10-25T20:44:31Z", { qa: [d.wip.qa[1]] })],
      remediation: [H("2026-10-25T19:38:32Z", "2026-10-25T19:58:08Z", { remediation: { pass: 1, route: "re-plan-then-remediation" }, qa: [d.wip.qa[0]] }), H("2026-10-25T20:44:31Z", "2026-10-25T21:38:04Z", { remediation: { pass: 2, route: "on-the-spot" }, qa: [d.wip.qa[1]] })],
      landing: [H("2026-10-25T21:38:04Z", "2026-10-25T22:03:35Z")] };
    Object.assign(d.asBuilt, { at: "2026-10-25T21:40:14Z", commits: [{ sha: "eb274e0", at: "2026-10-25T12:35:59Z", step: "research" }, { sha: "7cabe98", at: "2026-10-25T13:45:54Z", step: "research" }] });
    return d; };
  const APPROX63 = [{ step: "sizing", ended: "2026-10-25T11:54:26Z", source: "arrival" }, { step: "research", since: "2026-10-25T12:13:51Z", ended: "2026-10-25T13:46:13Z", source: "arrival" },
    { step: "plan", since: "2026-10-25T13:46:13Z", ended: "2026-10-25T14:23:05Z", source: "arrival" }, { step: "branch", since: "2026-10-25T14:23:05Z", source: "arrival" }];
  const L = T => T.visits.map(v => `${v.label}|${v.from ? ({ by: "by ", approx: "≈" }[v.from.how] || "") + v.from.t : "-"}|${v.to ? ({ approx: "≈" }[v.to.how] || "") + v.to.t + (v.to.merge ? "M" : "") : "-"}|${v.ms != null ? (v.approx ? "≈" : "") + lib.tlSpan(v.ms) : "-"}`);

  /* 1. the kinds of work */
  guard("lib.js: every step's kind of work (planning, build, checking, landing) and its shade within it (dashboards-skill/34)", c => {
    const fam = s => lib.tlFamily(s);
    c.push(["planning: sizing, interview, research, architecture, plan, and a tracking board's sub-issues and boards", ["sizing", "interview", "research", "architecture", "plan", "sub-issues", "boards"].every(s => fam(s) === "planning"), "families"]);
    c.push(["build: branch, implementation; checking: qa, remediation; landing: landing, state-boards, merge", fam("branch") === "build" && fam("implementation") === "build" && fam("qa") === "checking" && fam("remediation") === "checking" && ["landing", "state-boards", "merge"].every(s => fam(s) === "landing"), "families"]);
    c.push(["a step outside them keeps the neutral ink, as other", fam("something-else") === "other", fam("something-else")]);
    const T = lib.timelineSteps(run63());
    c.push(["#63: one shade per step over the steps with a line, first to last within its family; one step alone takes the middle", js(T.visits.map(v => [v.step, v.family, v.shade]).filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i)) === js([["sizing", "planning", 0], ["research", "planning", 50], ["plan", "planning", 100], ["branch", "build", 0], ["implementation", "build", 100], ["qa", "checking", 0], ["remediation", "checking", 100], ["landing", "landing", 50]]), js(T.visits.map(v => [v.step, v.shade]))]);
    c.push(["the families legend: each family with a line, in order, with its steps and shades", js(T.families.map(f => [f.id, f.steps.map(x => x.step)])) === js([["planning", ["sizing", "research", "plan"]], ["build", ["branch", "implementation"]], ["checking", ["qa", "remediation"]], ["landing", ["landing"]]]), js(T.families)]);
    const trk = copy(TRK); trk.status = "built"; trk.asBuilt = { ref: "master", sha: "7de8207", date: "2026-10-30", at: "2026-10-30T16:00:00Z" }; trk.wip.step = "landed"; trk.wip.current = [];
    trk.wip.steps = ["sizing", "interview", "research", "architecture", "sub-issues", "boards", "landing", "state-boards", "merge", "implementation", "landed"];
    trk.wip.history = { "sub-issues": [H("2026-10-21T10:00:00Z", "2026-10-21T10:40:00Z")], boards: [H("2026-10-21T10:40:00Z", "2026-10-21T11:05:00Z")], landing: [H("2026-10-21T11:05:00Z", "2026-10-21T11:20:00Z")], "state-boards": [H("2026-10-21T11:20:00Z", "2026-10-21T11:30:00Z")], merge: [H("2026-10-21T11:30:00Z", "2026-10-22T09:00:00Z")], implementation: [H("2026-10-22T09:00:00Z", "2026-10-30T15:00:00Z")] };
    const Tt = lib.timelineSteps(trk);
    c.push(["a tracking board: its filing and boards planning, its plan's landing in three landing steps, its units' runs build, no checking", js(Tt.families.map(f => f.id)) === js(["planning", "build", "landing"]) && js(Tt.visits.filter(v => v.family === "landing").map(v => [v.step, v.shade])) === js([["landing", 0], ["state-boards", 50], ["merge", 100]]), js(Tt.families.map(f => [f.id, f.steps]))]);
  });

  /* 2. approximate bounds */
  guard("lib.js and check.js: approximate bounds (asBuilt.approx), never read as recorded (dashboards-skill/34)", c => {
    const d = run63(); d.asBuilt.approx = copy(APPROX63); const T = lib.timelineSteps(d), got63 = L(T);
    const want = ["sizing|-|≈2026-10-25T11:54:26Z|-", "research|≈2026-10-25T12:13:51Z|≈2026-10-25T13:46:13Z|≈1 h 32 min", "plan|≈2026-10-25T13:46:13Z|2026-10-25T14:21:18Z|≈35 min", "branch|2026-10-25T14:21:18Z|2026-10-25T14:21:18Z|under 1 min"];
    c.push(["#63 backfilled: the arrivals fill the unknown bounds, marked approximate; an arrival after a recorded time lies on it (plan's end, branch's start)", js(got63.slice(0, 4)) === js(want), js(got63.slice(0, 4))]);
    c.push(["the clamped bounds say so: the recorded time, the arrival kept beside it", T.visits[2].to.how === "exact" && T.visits[2].to.clamped === "2026-10-25T14:23:05Z" && T.visits[3].from.clamped === "2026-10-25T14:23:05Z", js([T.visits[2].to, T.visits[3].from])]);
    c.push(["the figure sums the approximate visits too: 7 h 19 + 1 h 32 + 35 min = 9 h 26 min", lib.tlSpan(lib.timelineTotal(T)) === "9 h 26 min", lib.tlSpan(lib.timelineTotal(T))]);
    c.push(["the sub-line's note: the approximate visits and the recorded times kept", lib.timelineApproxNote(T) === "≈ approximate bounds: sizing, research, plan · a recorded time kept over the update's arrival: plan's end, branch's start", lib.timelineApproxNote(T)]);
    c.push(["recorded bounds are never replaced: implementation and every later visit as before", js(got63.slice(4)) === js(L(lib.timelineSteps(run63())).slice(4)), js(got63.slice(4))]);
    const early = run63(); early.asBuilt.approx = [{ step: "research", since: "2026-10-25T12:50:00Z", source: "arrival" }];
    c.push(["a step commit earlier than the arrival still gives the \"by\" start", L(lib.timelineSteps(early))[1].startsWith("research|by 2026-10-25T12:35:59Z"), L(lib.timelineSteps(early))[1]]);
    const bad = run63(); bad.asBuilt.approx = [{ step: "research", since: "2026-10-25T12:13:51Z", source: "guess" }];
    c.push(["an entry with a source not known is not applied", L(lib.timelineSteps(bad))[1] === L(lib.timelineSteps(run63()))[1], L(lib.timelineSteps(bad))[1]]);
    c.push(["check.js and timeline.js print the lines with \"≈\"", lib.timelineLines(T)[1] === "research (planning): ≈ 2026-10-25 12:13Z → ≈ 2026-10-25 13:46Z · ≈ 1 h 32 min", lib.timelineLines(T)[1]]);
    const dir = path.join(sc, "approx", "docs", "plans", "91-approx"); const ok = copy(d); Object.assign(ok, { folder: "docs/plans/91-approx", issue: 91 });
    wr(path.join(dir, "plan.json"), JSON.stringify(ok, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]);
    const k1 = run(CHECK, [dir]);
    c.push(["check.js passes the form and reports the figure \"≈ 9 h 26 min\" with the note", !/asBuilt\.approx/.test(k1.stdout) && /the figure: ≈ 9 h 26 min/.test(k1.stdout) && /≈ approximate bounds: sizing, research, plan/.test(k1.stdout), (k1.stdout || "").split(/\r?\n/).filter(l => /timeline|approx|FAIL/.test(l)).join(" | ").slice(0, 400)]);
    const b2 = copy(ok); b2.asBuilt.approx = [{ step: "nowhere", since: "x", source: "arrival" }]; wr(path.join(dir, "plan.json"), JSON.stringify(b2, null, 2) + "\n"); run(EMBED, [dir]);
    const k2 = run(CHECK, [dir]);
    c.push(["check.js fails an entry not in its form", k2.status === 1 && /asBuilt\.approx\[0\] is not \{step/.test(k2.stdout), (k2.stdout || "").split(/\r?\n/).filter(l => /approx/.test(l)).join(" | ").slice(0, 300)]);
  });

  /* 3. the board: the families on the tile */
  guard("the board: the Timeline tile's kinds of work, its marks and its legends, in light and dark; approximate bounds shown \"≈\" (dashboards-skill/34)", c => {
    if (!chrome) { c.push(["the rendered pages (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const TILE = 'const k=document.querySelector("#tl-tile>.kpi"),segs=[...k.querySelectorAll(".seg-bar i")],es=[...k.querySelectorAll(".key.tl-steps>.tl-step")],fs=[...k.querySelectorAll(".key.tl-fams>.tl-fam")];const surf=()=>getComputedStyle(k).backgroundColor;const col=()=>({segs:segs.map(i=>getComputedStyle(i).backgroundColor),marks:es.map(e=>{const i=e.querySelector("i.segk");return [i.className,getComputedStyle(i).backgroundColor,getComputedStyle(i).boxShadow,e.dataset.family]}),surf:surf()});const light=col();document.documentElement.dataset.theme="dark";const dark=col();document.body.dataset.r=JSON.stringify({light,dark,fams:fs.map(f=>[f.dataset.family,f.textContent.trim(),f.querySelector("i").style.background.length>0]),v:k.querySelector(".v").textContent,s:k.querySelector(".s").textContent,note:(k.querySelector(".tl-note")||{}).textContent||"",durs:es.map(e=>e.querySelector(".tl-dur").textContent),whens:es.map(e=>e.querySelector(".tl-when").textContent)});';
    const chans = x => { const m = String(x).match(/[\d.]+/g) || [], v = m.slice(0, 3).map(Number); return /color\(/.test(x) ? v : v.map(y => y / 255); };
    const lum = x => { const v = chans(x).map(u => u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const hsl = x => { const [r, g, b] = chans(x), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn; if (!dd) return { h: 0, s: 0 }; const s = dd / (1 - Math.abs(2 * l - 1)), h = 60 * (mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4); return { h: (h + 360) % 360, s }; };
    const d = run63(); d.asBuilt.approx = copy(APPROX63);
    const r = got(dumpDom(planPage("fam63", d, TILE), "", "1920,1080", 6000)) || {};
    const T = lib.timelineSteps(d);
    c.push(["the families legend names exactly the families drawn, each with its steps and a swatch of their shades", js((r.fams || []).map(f => [f[0], f[2]])) === js([["planning", true], ["build", true], ["checking", true], ["landing", true]]) && /planning\s*sizing · research · plan/.test(((r.fams || [])[0] || [])[1] || ""), js(r.fams || r.err)]);
    c.push(["every step line carries its mark: filled for a visit drawn, outlined for one not drawn, with its family", js(((r.light || {}).marks || []).map(m => [/\btp\b/.test(m[0]), /tl-out/.test(m[0]), m[3]])) === js(T.visits.map(v => [v.ms != null, v.ms == null, v.family])), js(((r.light || {}).marks || []).map(m => m[0] + " " + m[3]))]);
    const all = th => [...((r[th] || {}).segs || []), ...((r[th] || {}).marks || []).filter(m => /\btp\b/.test(m[0])).map(m => m[1])];
    c.push(["every shade clear of the status hues and the accent: a hue in 175°–295°, never within 12° of the accent's (≈ 255°)", ["light", "dark"].every(th => all(th).length > 0 && all(th).every(x => { const q = hsl(x); return q.h >= 175 && q.h <= 295 && Math.abs(q.h - 255) > 12; })), js(["light", "dark"].map(th => all(th).map(x => Math.round(hsl(x).h))))]);
    c.push(["every shade at least 3:1 against its theme's card surface", ["light", "dark"].every(th => all(th).every(x => cr(x, (r[th] || {}).surf) >= 3)), js(["light", "dark"].map(th => all(th).map(x => cr(x, (r[th] || {}).surf).toFixed(2))))]);
    const famOf = th => { const m = {}; ((r[th] || {}).marks || []).forEach(x => { if (/\btp\b/.test(x[0])) (m[x[3]] = m[x[3]] || new Set()).add(x[1]); }); return m; };
    c.push(["the steps of a family take distinct shades of it (build: branch and implementation; checking: qa and remediation)", ["light", "dark"].every(th => { const m = famOf(th); return m.build && m.build.size === 2 && m.checking && m.checking.size === 2; }), js(["light", "dark"].map(th => Object.fromEntries(Object.entries(famOf(th)).map(([k, v]) => [k, [...v]]))))]);
    c.push(["approximate bounds read \"≈\": the figure, the durations, the times, the sub-line and the note", /^≈\s*9 h 26 min$/.test(r.v || "") && (r.durs || [])[1] === "≈ 1 h 32 min" && /^≈/.test((r.whens || [])[1] || "") && /≈ approximate bounds/.test(r.s || "") && /≈ the time the update reached the team/.test(r.note || "") && /outlined: a visit the bar does not draw/.test(r.note || ""), js([r.v, (r.durs || [])[1], (r.whens || [])[1], r.s, r.note])]);
    const r0 = got(dumpDom(planPage("fam63-recorded", run63(), TILE), "", "1920,1080", 6000)) || {};
    c.push(["with no approximate bound nothing reads \"≈\"", !/≈/.test((r0.v || "") + (r0.s || "") + (r0.note || "") + (r0.durs || []).join("")), js([r0.v, r0.s])]);
  });

  /* 4. the landing in three steps */
  guard("the landing in three steps: landing, state-boards, merge (lib.js, apply-event.js, the step panel, the Timeline; dashboards-skill/34)", c => {
    c.push(["STEP_ORDER: …, remediation, landing, state-boards, merge, landed (lib.js and the template)", js(lib.STEP_ORDER.slice(-4)) === js(["landing", "state-boards", "merge", "landed"]) && /const STEP_ORDER=\[[^\]]*"remediation","landing","state-boards","merge","landed"\]/.test(rd(PB)), js(lib.STEP_ORDER)]);
    c.push(["landingSteps(): an older line takes state-boards and merge after its landing; a line that has them is kept", js(lib.landingSteps(["qa", "remediation", "landing", "landed"])) === js(["qa", "remediation", "landing", "state-boards", "merge", "landed"]) && js(lib.landingSteps(["boards", "landing", "implementation", "landed"])) === js(["boards", "landing", "state-boards", "merge", "implementation", "landed"]) && lib.landingSteps(lib.STEP_ORDER) === lib.STEP_ORDER, "landingSteps"]);
    /* a board in flight at an approving qa pass, its steps line written before the three steps (the example, as cases-22.js builds it) */
    const building = () => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: { ref: "master", sha: x.baseline.sha, date: x.baseline.date } }); x.rows.forEach(r => { r.asBuilt.state = "pending"; }); x.milestones = x.milestones.filter(m => m.column !== "built");
      x.wip = { ...x.wip, step: "qa", current: ["built"], questions: [], research: null, qa: [{ pass: 1, verdict: "approved", date: "2026-10-26", at: "2026-10-26T09:00:00Z", findings: {} }], event: { name: "qa-pass", at: "2026-10-26T09:00:00Z" }, steps: ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "landing", "landed"] }; return x; };
    const b = building(), root = path.join(sc, "split"), folder = b.folder, dir = path.join(root, ...folder.split("/"));
    wr(path.join(dir, "plan.json"), JSON.stringify(b, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), rd(PB)); run(EMBED, [dir]);
    const ev = (name, at, facts) => { const rq = wr(path.join(sc, `split-${name}.json`), JSON.stringify({ v: 1, action: "plan-board", github: b.repo, issue: b.issue, event: name, folder, facts: facts || {} })); const a = run(APPLY, ["--event", rq, "--worktree", root, "--no-live", "--no-gh", "--at", at, "--json"]); return { a, p: JSON.parse(rd(path.join(dir, "plan.json"))) }; };
    const e1 = ev("landing", "2026-10-26T09:05:00Z", { pr: 90 });
    c.push(["landing: the step, its since; the older steps line brought up to the three steps", e1.a.status === 0 && e1.p.wip.step === "landing" && e1.p.wip.since === "2026-10-26T09:05:00Z" && js(e1.p.wip.steps.slice(-4)) === js(["landing", "state-boards", "merge", "landed"]), js([e1.a.status, e1.p.wip.step, e1.p.wip.steps, (e1.a.stderr || "").slice(0, 200)])]);
    const e2 = ev("state-boards", "2026-10-26T09:12:00Z");
    c.push(["state-boards: the step, and the landing frozen with its end", e2.a.status === 0 && e2.p.wip.step === "state-boards" && ((e2.p.wip.history || {}).landing || []).some(v => v.since === "2026-10-26T09:05:00Z" && v.ended === "2026-10-26T09:12:00Z"), js([e2.a.status, e2.p.wip.step, (e2.p.wip.history || {}).landing])]);
    const e3 = ev("merge", "2026-10-26T09:20:00Z", { pr: 90 });
    c.push(["merge: the step, and the state boards frozen with their end; the trail names the merge", e3.a.status === 0 && e3.p.wip.step === "merge" && ((e3.p.wip.history || {})["state-boards"] || []).some(v => v.ended === "2026-10-26T09:20:00Z") && /^Merge: merging it in PR #90/.test((e3.p.trail || []).slice(-1)[0].label || ""), js([e3.a.status, e3.p.wip.step, (e3.p.trail || []).slice(-1)])]);
    const e4 = ev("landed", "2026-10-26T09:30:00Z", { pr: 90, sha: "abcdef1", merge: "abcdef1", date: "2026-10-26", mergedAt: "2026-10-26T09:22:00Z" });
    c.push(["landed follows the merge; with parts still to resolve the board stays at the merge, not the landing", e4.a.status === 0 && (e4.p.wip.step === "landed" || e4.p.wip.step === "merge"), js([e4.a.status, e4.p.wip.step])]);
    const e5 = ev("state-boards", "2026-10-26T09:40:00Z");
    c.push(["a landing step on a board that has landed is refused, if it has", e4.p.wip.step !== "landed" || e5.a.status !== 0, js([e4.p.wip.step, e5.a.status])]);
    const D = copy(e4.p); D.wip.step = "landed"; D.status = "built"; D.wip.current = [];
    const T = lib.timelineSteps(D), tl = L(T).filter(x => /^(landing|state-boards|merge)/.test(x));
    c.push(["the Timeline: landing, state boards and merge, each its visit, the merge ending at the merge's time", js(tl) === js(["landing|2026-10-26T09:05:00Z|2026-10-26T09:12:00Z|7 min", "state-boards|2026-10-26T09:12:00Z|2026-10-26T09:20:00Z|8 min", "merge|2026-10-26T09:20:00Z|2026-10-26T09:22:00ZM|2 min"]), js(tl)]);
    c.push(["an older board's landing alone still spans to the merge", L(lib.timelineSteps(run63())).slice(-1)[0] === "landing|2026-10-25T21:38:04Z|2026-10-25T21:40:14ZM|2 min", L(lib.timelineSteps(run63())).slice(-1)[0]]);
    const old = building(), root6 = path.join(sc, "split-old"), e6dir = path.join(root6, ...old.folder.split("/")); Object.assign(old.wip, { step: "halted", resume: "qa", waitingOn: "Verification case: a question." });
    wr(path.join(e6dir, "plan.json"), JSON.stringify(old, null, 2) + "\n"); wr(path.join(e6dir, "dashboard.html"), rd(PB)); run(EMBED, [e6dir]);
    const rq6 = wr(path.join(sc, "split-old.json"), JSON.stringify({ v: 1, action: "plan-board", github: old.repo, issue: old.issue, event: "resumed", folder: old.folder, facts: {} }));
    const a6 = run(APPLY, ["--event", rq6, "--worktree", root6, "--no-live", "--no-gh", "--at", "2026-10-26T10:00:00Z", "--json"]), p6 = JSON.parse(rd(path.join(e6dir, "plan.json")));
    c.push(["any event on a board in flight brings an older steps line up (the panel shows the three steps ahead)", a6.status === 0 && js(p6.wip.steps.slice(-4)) === js(["landing", "state-boards", "merge", "landed"]), js([a6.status, p6.wip.steps, (a6.stdout || "").slice(-200)])]);
    if (!chrome) { c.push(["the rendered step panel (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const SP = 'document.body.dataset.r=JSON.stringify({steps:[...document.querySelectorAll(".steps li")].map(l=>l.textContent.trim()),t:(document.querySelector(".sp-t")||{}).textContent||"",p:(document.querySelector(".sp")||{}).textContent||""});';
    const rs = got(dumpDom(planPage("split-panel", e2.p, SP), "", "1600,1000", 6000)) || {};
    c.push(["the step panel at state-boards: its title \"State boards\", the strip's three landing steps in order", rs.t === "State boards" && /pre-merge refresh/.test(rs.p || "") && /landing.*state-boards.*merge.*landed/.test((rs.steps || []).join(" ")), js([rs.t, rs.steps, (rs.p || "").slice(0, 160)])]);
  });

  /* 5. the roadmap of a sub-issue's board */
  guard("the roadmap of a sub-issue's board: filled from the repository roadmap, else the parent tracking board; the card names the parent while unset (dashboards-skill/34)", c => {
    const root = path.join(sc, "roadmap"), up = path.join(root, "docs", "plans", "55-http-client-stack"), me = path.join(up, "64-url-policy");
    const t = copy(TRK); wr(path.join(up, "plan.json"), JSON.stringify(t, null, 2) + "\n"); wr(path.join(up, "dashboard.html"), rd(PB));
    const u = copy(LIVE); Object.assign(u, { issue: 64, folder: "docs/plans/55-http-client-stack/64-url-policy", parent: { issue: 55, board: "../dashboard.html" }, roadmap: null, issueTitle: "webtools-http: outbound-URL policies" });
    wr(path.join(me, "plan.json"), JSON.stringify(u, null, 2) + "\n"); wr(path.join(me, "dashboard.html"), rd(PB));
    const r1 = lib.roadmapFor(u, me);
    c.push(["no work board's data: the parent tracking board's units in landing order, a unit's title its own board's where that board is here, else none", !!r1 && r1.from === "the parent tracking board" && r1.roadmap.issue === 55 && js(r1.roadmap.items.map(i => i.issue)) === js([61, 47, 62, 63, 64, 65, 66, 67, 68, 69, 70]) && r1.roadmap.items.find(i => i.issue === 64).title === "webtools-http: outbound-URL policies" && r1.roadmap.items.find(i => i.issue === 61).title === null, js(r1 && { from: r1.from, items: r1.roadmap.items.slice(0, 5) })]);
    const wb = { schema: "work-board/1", asOf: "2026-10-26", roadmap: [{ issue: 55, title: "HTTP client stack (verbatim)", state: "OPEN", items: [{ issue: 63, title: "Fixtures (verbatim)", state: "CLOSED", stateReason: "COMPLETED" }, { issue: 64, title: "URL policy (verbatim)", state: "OPEN" }] }] };
    wr(path.join(root, "docs", "plans", ".live", "board.json"), JSON.stringify(wb));
    const r2 = lib.roadmapFor(u, me);
    c.push(["the repository work board's data first (the live view's): the item that claims it, the tracker's titles verbatim, its date", !!r2 && r2.from === "docs/plans/.live/board.json" && js(r2.roadmap) === js({ issue: 55, title: "HTTP client stack (verbatim)", asOf: "2026-10-26", items: [{ issue: 63, title: "Fixtures (verbatim)", state: "CLOSED", stateReason: "COMPLETED" }, { issue: 64, title: "URL policy (verbatim)", state: "OPEN" }] }), js(r2)]);
    const e = run(EMBED, [me]), p = JSON.parse(rd(path.join(me, "plan.json")));
    c.push(["embed.js fills an unset roadmap (so new.js and every event do)", e.status === 0 && p.roadmap && p.roadmap.issue === 55 && /roadmap: unset → #55/.test(e.stdout), js([e.status, (e.stdout || "").split(/\r?\n/).filter(l => /roadmap/.test(l))])]);
    const kept = copy(p); kept.roadmap.items[0].title = "edited"; wr(path.join(me, "plan.json"), JSON.stringify(kept, null, 2) + "\n"); run(EMBED, [me]);
    c.push(["a roadmap already set is kept as it is", JSON.parse(rd(path.join(me, "plan.json"))).roadmap.items[0].title === "edited", "kept"]);
    c.push(["a tracking board never takes one (its roadmap is its own units)", lib.roadmapFor(copy(TRK), up) === null, "tracking"]);
    const none = copy(u); delete none.parent; c.push(["an issue with no parent takes none", lib.roadmapFor(none, me) === null, "no parent"]);
    if (!chrome) { c.push(["the rendered card (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const CX = 'const cs=[...document.querySelectorAll("#context .card")];const r=cs.find(x=>/^Roadmap/.test(x.querySelector("h3").textContent));document.body.dataset.r=JSON.stringify({t:r?r.textContent:"",a:r?[...r.querySelectorAll("a")].map(a=>a.getAttribute("href")):[]});';
    const unset = copy(u); unset.roadmap = null;
    const rc = got(dumpDom(planPage("roadmap-unset/docs/plans/55-x/64-y", unset, CX), "", "1600,1000", 6000)) || {};
    c.push(["unset, with a parent: the card names the parent tracking issue and links its board, never \"no tracking parent\"", /is a unit of the tracking issue #55/.test(rc.t || "") && !/no tracking parent/.test(rc.t || "") && (rc.a || []).includes("../dashboard.html"), js(rc)]);
    const orphan = copy(unset); delete orphan.parent;
    const ro = got(dumpDom(planPage("roadmap-orphan", orphan, CX), "", "1600,1000", 6000)) || {};
    c.push(["no parent and no roadmap: \"no tracking parent\" stays", /it has no tracking parent/.test(ro.t || ""), (ro.t || "").slice(0, 160)]);
    const notitle = copy(unset); notitle.roadmap = { issue: 55, title: null, asOf: "2026-10-26", items: [{ issue: 61, title: null }, { issue: 64, title: "URL policy" }] };
    const rn = got(dumpDom(planPage("roadmap-notitle", notitle, CX), "", "1600,1000", 6000)) || {};
    c.push(["a roadmap item with no title shows its number alone, never an empty link", /#61/.test(rn.t || "") && /#55/.test(rn.t || "") && /URL policy/.test(rn.t || ""), (rn.t || "").slice(0, 200)]);
    /* board.js without the tracker: the tracking board's units as the roadmap item's items */
    const wroot = path.join(sc, "wb"), wup = path.join(wroot, "docs", "plans", "55-http-client-stack");
    wr(path.join(wup, "plan.json"), JSON.stringify(copy(TRK), null, 2) + "\n"); wr(path.join(wup, "dashboard.html"), rd(PB)); run(EMBED, [wup]);
    const wb2 = run(BOARD, ["--root", wroot, "--no-gh"], { cwd: wroot }); let bj = null; try { bj = JSON.parse(rd(path.join(wroot, "docs", "plans", "board.json"))); } catch (e) { /* none */ }
    c.push(["board.js --no-gh: the tracking issue's roadmap item lists its units in landing order", wb2.status === 0 && bj && (bj.roadmap || []).length === 1 && js(((bj.roadmap[0] || {}).items || []).map(i => i.issue)) === js([61, 47, 62, 63, 64, 65, 66, 67, 68, 69, 70]), js([wb2.status, (wb2.stderr || "").slice(0, 200), bj && bj.roadmap])]);
  });

  /* 6. the Design tab */
  guard("the four columns' tab named Design, #timeline still opening it (dashboards-skill/34)", c => {
    if (!chrome) { c.push(["the rendered tabs (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const TB = 'const s=document.querySelector(".tab[aria-selected=\\"true\\"]");document.body.dataset.r=JSON.stringify({tabs:[...document.querySelectorAll(".tab")].map(t=>t.textContent.trim()),sel:s?s.id:"",h:(document.querySelector("#p-design h2")||{}).textContent||"",tile:[...document.querySelectorAll("#tl-tile .kpi .l, #kpis .kpi .l")].map(l=>l.textContent)});';
    const r = got(dumpDom(planPage("design", run63(), TB), "", "1600,1000", 6000)) || {};
    c.push(["the first tab reads Design, its heading \"Design: gap, considered, verdict, as built\"; the Timeline tab beside it holds the tile, which keeps its name", (r.tabs || [])[0] === "Design" && r.h === "Design: gap, considered, verdict, as built" && (r.tile || []).includes("Timeline") && (r.tabs || [])[1] === "Timeline", js(r)]);
    const r2 = got(dumpDom(planPage("design-old-anchor", run63(), TB, "timeline"), "", "1600,1000", 6000)) || {};
    c.push(["an old link, #timeline, opens the Design tab", r2.sel === "t-design", js(r2.sel)]);
    const t = got(dumpDom(planPage("design-tracking", copy(TRK), TB), "", "1600,1000", 6000)) || {};
    c.push(["a tracking board's first tab reads Design too", (t.tabs || [])[0] === "Design", js(t.tabs)]);
    c.push(["the repository work board has no such tab", !/>Timeline<|>Design</.test(rd(WB).replace(/<script[\s\S]*?<\/script>/g, "")), "work board"]);
  });

  /* 7. the Timeline tab and its tracers */
  guard("the Timeline tab: the Timeline tile, the KPI tiles below it with their tracers, on every issue board, a board in flight its steps so far (dashboards-skill/34)", c => {
    const live = () => { const d = run63(); d.status = "building"; d.wip.step = "qa"; d.wip.since = "2026-10-25T19:58:08Z"; d.wip.current = ["built"];
      d.wip.qa = [d.wip.qa[0]]; d.wip.history.qa = [d.wip.history.qa[0]]; d.wip.history.remediation = [d.wip.history.remediation[0]]; delete d.wip.history.landing; delete d.asBuilt.at; return d; };
    const T = lib.timelineSteps(live(), { now: "2026-10-25T20:30:00Z" }), ls = L(T);
    c.push(["in flight: the running step one visit open-ended, from its since to now (qa · 2nd pass, 32 min)", ls.slice(-1)[0] === "qa · 2nd pass|2026-10-25T19:58:08Z|2026-10-25T20:30:00Z|32 min" && T.visits.slice(-1)[0].open === true && T.visits.slice(-1)[0].to.how === "now", ls.slice(-1)[0]]);
    c.push(["…the steps after it left out, never named as unrecorded; the figure the time so far", !ls.some(x => /^landing/.test(x)) && !/landing/.test(lib.timelineLeftOut(T)) && lib.tlSpan(lib.timelineTotal(T)) === "6 h 9 min", js([ls, lib.timelineLeftOut(T), lib.tlSpan(lib.timelineTotal(T))])]);
    c.push(["…with no now given, the running visit has no end (a check stays deterministic)", lib.timelineSteps(live()).visits.slice(-1)[0].to === null, "no now"]);
    const d = run63(); d.asBuilt.approx = copy(APPROX63); const TR = lib.timelineTracers(lib.timelineSteps(d)), tr = k => TR.find(x => x.tile === k);
    c.push(["the tracers of #63: Rows sizing + research ≈ 1 h 32 min, Options research ≈ 1 h 32 min, Verdicts plan ≈ 35 min, As built branch + implementation 4 h 39 min, QA 2 h 38 min", lib.tlSpan(tr("rows").ms) === "1 h 32 min" && tr("rows").approx && lib.tlSpan(tr("opts").ms) === "1 h 32 min" && lib.tlSpan(tr("verdicts").ms) === "35 min" && tr("verdicts").approx && lib.tlSpan(tr("built").ms) === "4 h 39 min" && !tr("built").approx && lib.tlSpan(tr("qa").ms) === "2 h 38 min" && tr("qa").family === "checking" && tr("built").family === "build" && tr("rows").family === "planning", js(TR.map(x => [x.tile, x.ms != null ? lib.tlSpan(x.ms) : null, x.approx, x.family]))]);
    const r0 = lib.timelineTracers(lib.timelineSteps(run63())).find(x => x.tile === "rows");
    c.push(["a tile whose steps have no time recorded: no sum (the label reads \"—\")", r0.ms === null && r0.visits === 2, js(r0)]);
    const trk = copy(TRK); trk.status = "built"; trk.wip.step = "landed"; const Tk = lib.timelineTracers(lib.timelineSteps(trk));
    c.push(["a tracking board's tiles: Options research and the architecture, Verdicts the architecture, As built implementation, QA passes no tracer", js(Tk.map(x => [x.tile, x.steps])) === js([["rows", ["sizing", "research"]], ["opts", ["research", "architecture"]], ["verdicts", ["architecture"]], ["built", ["implementation"]], ["qa", []]]) && Tk.find(x => x.tile === "qa").none === true, js(Tk.map(x => [x.tile, x.steps]))]);
    if (!chrome) { c.push(["the rendered tab (no browser found: set CHROME)", false, "no Chrome or Edge"]); return; }
    const TT = 'const st=document.getElementById("t-steps");st.click();setTimeout(()=>{const g=[...document.querySelectorAll("#tracers g")];document.body.dataset.r=JSON.stringify({tabs:[...document.querySelectorAll(".tab")].map(t=>t.id),head:!!document.querySelector("#wip ~ .kpis, header .kpis, .page > .kpis"),inTab:!!document.querySelector("#p-steps #tl-tile>.kpi")&&document.querySelectorAll("#p-steps #kpis>.kpi").length,labs:[...document.querySelectorAll("#kpis .tracer-lab")].map(l=>[l.dataset.tracer,l.textContent.trim()]),g:g.map(x=>[x.dataset.tracer,x.querySelectorAll("path").length,getComputedStyle(x.querySelector("path")).stroke]),v:document.querySelector("#tl-tile .v").textContent,sw:document.documentElement.scrollWidth>document.documentElement.clientWidth,key:document.getElementById("timeline-key").textContent,insp:getComputedStyle(document.querySelector(".inspector")).display});},400);';
    const r = got(dumpDom(planPage("tab63", d, TT), "", "1600,1400", 7000)) || {};
    c.push(["the tab stands right after Design; the KPI tiles are in it, under the Timeline tile, and no longer in the board's head", (r.tabs || [])[0] === "t-design" && (r.tabs || [])[1] === "t-steps" && r.inTab === 5 && !r.head, js([r.tabs, r.inTab, r.head, r.err])]);
    c.push(["each tile's tracer label: its steps and their time, \"≈\" where approximate", js((r.labs || []).map(x => x[1])) === js(["sizing + research≈ 1 h 32 min", "research≈ 1 h 32 min", "plan≈ 35 min", "branch + implementation4 h 39 min", "qa + remediation2 h 38 min"]), js(r.labs)]);
    c.push(["from 760 px a tracer drawn per tile, its line and its bracket on the bar, in its steps' kind of work", (r.g || []).length === 5 && (r.g || []).every(x => x[1] === 2) && new Set((r.g || []).map(x => x[2])).size >= 3, js(r.g)]);
    c.push(["the tab's legend names the tracer; the inspector does not stand beside this tab", /tracer: from a tile up to the steps that made it/.test(r.key || "") && r.insp === "none", js([r.key, r.insp])]);
    const rn = got(dumpDom(planPage("tab63-narrow", d, TT), "", "520,1800", 7000)) || {};
    c.push(["under 760 px no line is drawn, the labels alone, and no sideways scroll", (rn.g || []).length === 0 && (rn.labs || []).length === 5 && !rn.sw, js([rn.g, (rn.labs || []).length, rn.sw])]);
    const rl = got(dumpDom(planPage("tab-live", live(), TT), "", "1600,1400", 7000)) || {};
    c.push(["a board in flight has the tab too: the figure \"so far\", the QA tracer open-ended", /so far/.test(rl.v || "") && /so far/.test(((rl.labs || []).find(x => x[0] === "qa") || [])[1] || ""), js([rl.v, rl.labs])]);
    const rt = got(dumpDom(planPage("tab-trk", copy(TRK), TT), "", "1600,1400", 7000)) || {};
    c.push(["a tracking board: its QA passes tile says it has no step of its own, and gets no tracer", /no step of its own/.test(((rt.labs || []).find(x => x[0] === "qa") || [])[1] || "") && !(rt.g || []).some(x => x[0] === "qa"), js([rt.labs, rt.g])]);
  });

  /* 8. the feature probes */
  guard("the feature probes of this run: the plan template carries each, one without it does not (dashboards-skill/34)", c => {
    const T = rd(PB), ids = ["timeline-families", "timeline-approx", "landing-split", "roadmap-parent", "design-tab", "timeline-tab"];
    c.push(["the plan template carries every feature of this run", !F.probe(T, "plan-board").some(m => ids.includes(m.id)), js(F.probe(T, "plan-board").map(m => m.id))]);
    const strip = { "timeline-families": T.replace("const TL_FAMILIES=", "const TL_FAMILIEZ="), "timeline-approx": T.replace("function approxBounds(", "function approxBoundz("), "landing-split": T.replace('"landing","state-boards","merge","landed"]', '"landing","landed"]'), "roadmap-parent": T.replace("else if(PLAN.parent&&", "else if(PLAN.parentz&&"), "design-tab": T.replace('id="t-design" aria-controls="p-design" aria-selected="true">Design<', 'id="t-timeline" aria-controls="p-timeline" aria-selected="true">Timeline<'), "timeline-tab": T.replace("function drawTracers(", "function drawTracerz(") };
    ids.forEach(id => c.push([`a template without it lacks ${id}`, F.probe(strip[id], "plan-board").some(m => m.id === id), id]));
    c.push(["each applies to issue boards only; the other types say why not", ids.every(id => { const f = F.FEATURES.find(x => x.id === id); return f && js(f.types) === js(["plan-board"]) && ["work-board", "system", "supersystem"].every(k => !!f.notFor[k]); }), "applicable"]);
  });
  return groups;
};
