// The cases of the questions a halt puts to the user in any step (admin-team/dashboards/halt-questions, the user's decision of 2026-11-07,
// dated 45; plan/RULES.md §3, wip.asked, §4, the halted / resumed row), run by verify-templates.js (it passes its helpers in), or on its own with
// no browser: node verify/cases-halt-questions.js [--out <dir>]. The trigger: WebTools #69 halted in research with three questions and their
// options, and its board showed what it waited on and three open points, not the questions.
// 1. apply-event.js: a halt in research with facts.questions records each, with its options, into wip.asked (the step it halted in, asked at
//    the halt, waiting); the visit the halt ended holds them (lib.js syncAsked()); the same halt again is a duplicate; a second halt while it
//    waits adds its own to the same visit; a resumed (here at plan, as #69's) marks every one answered at its time, on the snapshot too; a
//    question put in another step's halt rides on that step's visit.
// 2. The interview keeps its own field: a halt there writes wip.interview as before, and its resumed now marks them answered too (the
//    snapshot with them); the answers' gist stays the presenter's (enrich).
// 3. Any other event that takes the board out of the stop answers them; cancelled does not.
// 4. The template's helpers outside a browser: the shared question list (the interview's and a halt's alike: the options under each text,
//    answered or waiting, the count, the legend), the live panel's choice (waiting, or answered at the answer that began the visit), the
//    waiting card's questions; a tracking board's unit mirror carries wip.asked (lib.js panelFacts()).
// 5. check.js holds wip.asked and a snapshot's asked to their form, warns on a question still waiting on a board not stopped; fill.js writes
//    an answer's gist, on the snapshot too.
// 6. The feature probe (halt-questions): found on the issue-board template, missed on one without it, for issue and tracking boards only;
//    check.js --auto passes a board in flight made from the template and fails one made from a template without it.
// Each group returns [title, cases], a case [name, ok, detail]. The boards it lays are kept under <out>/halt-questions/ (the fixtures the
// report names for a browser check).
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm"), cp = require("child_process");

module.exports = function casesHaltQuestions(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js")), F = require(sk("system/scripts/features.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => (targets.find(t => t.name === name) || {}).path || sk(name);
  const PBF = tp("plan/template/dashboard.html"), PB = rd(PBF);
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), FILL = sk("plan/scripts/fill.js");
  const sc = path.join(out, "halt-questions"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json"))), TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const STEPS = ["sizing", "interview", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  /* a board in flight, from the example: its rows pending, no as-built, the wip given */
  const flight = wip => { const x = copy(EX); Object.assign(x, { status: "building", asBuilt: null }); x.rows.forEach(r => { r.asBuilt.state = "pending"; delete r.asBuilt.statements; });
    x.milestones = x.milestones.filter(m => m.column !== "built"); if (x.impact) x.impact.basis = "plan";
    x.wip = { ...x.wip, questions: [], research: null, open: [], qa: [], plan: null, waitingOn: null, resume: null, steps: STEPS.slice(), ...wip }; return x; };
  const docsInto = dir => fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
  const lay = (name, plan, tpl) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/")); docsInto(dir); fs.mkdirSync(path.join(root, ".git"), { recursive: true });
    wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), tpl || PB); const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir }; };
  let nreq = 0;
  const apply = (B, plan, ev, facts, at) => { const rq = wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: plan.repo, issue: plan.issue, event: ev, folder: plan.folder, facts: facts || {} }));
    const a = run(APPLY, ["--event", rq, "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]), S = parse(a);
    return { a, S, p: JSON.parse(rd(path.join(B.dir, "plan.json"))) }; };
  const H = (p, s) => (p.wip.history || {})[s] || [];
  /* WebTools #69's three questions at its research halt (2026-11-06T20:57:36Z), as the run sent them */
  const Q69 = [
    { text: "Which successful statuses are parsed? The architecture parses any 2xx; 204, 205, 206 and 226 would be misread as feeds or as documents that are not feeds.", options: ["Parse 200 and 203; every other 2xx is UpstreamError", "Parse any 2xx, as the architecture says", "Parse 200 only"] },
    { text: "Structural limits inside the supplied parser (depth 256, 100 attributes per element, 100,000 elements, 64 namespace URIs): a fourth hardening layer, and where is it configured?", options: ["Four tightening-only members of FeedLimits, enforced by RomeFeedParser and asserted by the hardening contract", "The same four as fixed constants inside RomeFeedParser", "No new limits, as the architecture stands"] },
    { text: "How does the supplied parser drive Rome?", options: ["A private WireFeedInput subclass with its own SAX parser per parse and its own encoding and exception handling", "SyndFeedInput as the architecture sketches"] }];
  const T0 = "2026-11-06T20:13:25Z", TH = "2026-11-06T20:57:36Z", TR = "2026-11-06T22:05:35Z";
  const atResearch = () => flight({ step: "research", since: T0, updated: "2026-11-06T20:48:42Z", current: ["validity-rule.considered"],
    questions: [{ question: "conditional-get-and-redirects", rows: ["validity-rule"], findings: "research/README.md", state: "verifying", started: T0, returned: "2026-11-06T20:15:21Z" }],
    research: { phase: "verification", drafted: 1, since: { research: T0, verification: "2026-11-06T20:48:42Z" } },
    event: { name: "verification-started", at: "2026-11-06T20:48:42Z" }, history: { sizing: [{ since: null, ended: "2026-11-06T04:27:23Z", endedBy: "sized", to: "research" }] } });
  const HALT = { step: "plan", detail: "Research is verified. Three findings depart from the architecture's feeds section and are open before the plan is written.", waitingOn: "Answers to three research questions that would amend the architecture", questions: Q69 };
  const keep = {};

  guard("apply-event.js: a halt in research records its questions with their options; the visit it ended holds them; the resumed marks them answered", c => {
    const plan = atResearch(), B = lay("research-halt", plan);
    const h = apply(B, plan, "halted", HALT, TH), A = h.p.wip.asked || [];
    c.push(["halted: applied, the board halted at research", h.a.status === 0 && h.p.wip.step === "halted" && h.p.wip.resume === "research", js([h.a.status, h.p.wip.step, h.p.wip.resume, h.S.error])]);
    c.push(["wip.asked: the three questions, each with the step it halted in, its options, no answer, asked at the halt", A.length === 3 && A.every((q, i) => q.step === "research" && q.text === Q69[i].text && js(q.options) === js(Q69[i].options) && q.answer === null && q.asked === TH && q.answered === undefined), js(A.map(q => [q.step, q.text.slice(0, 20), (q.options || []).length, q.answer, q.asked]))]);
    c.push(["…never wip.interview (the halt was not in the interview)", !(h.p.wip.interview || []).length, js(h.p.wip.interview || null)]);
    const V = H(h.p, "research").slice(-1)[0] || {};
    c.push(["the research visit the halt ended (held) holds the three, as the live list, without the step", V.held === true && V.ended === TH && Array.isArray(V.asked) && V.asked.length === 3 && V.asked.every((q, i) => q.text === Q69[i].text && js(q.options) === js(Q69[i].options) && !("step" in q) && q.answer === null), js(V)]);
    c.push(["the halt says nothing for the presenter to write of them (enrich names none)", !(h.S.why || []).some(x => /question/i.test(x)), js(h.S.why)]);
    const again = apply(B, h.p, "halted", HALT, TH);
    c.push(["the same halt again: a duplicate, nothing written", again.a.status === 0 && again.S.result === "duplicate" && js(again.p.wip.asked) === js(h.p.wip.asked), js([again.S.result, (again.p.wip.asked || []).length])]);
    const more = { ...HALT, questions: [...Q69, { text: "Is the cap on redirects five?", options: ["Five", "Ten"] }] };
    const h2 = apply(B, h.p, "halted", more, "2026-11-06T21:10:00Z"), V2 = H(h2.p, "research").slice(-1)[0] || {};
    c.push(["a second halt while it waits: only the new question added (asked at its own time), on the same visit; no second visit", h2.a.status === 0 && (h2.p.wip.asked || []).length === 4 && h2.p.wip.asked[3].asked === "2026-11-06T21:10:00Z" && H(h2.p, "research").length === H(h.p, "research").length && (V2.asked || []).length === 4, js([(h2.p.wip.asked || []).map(q => q.asked), H(h2.p, "research").length, (V2.asked || []).length])]);
    keep.halted = h2;
    const r = apply(B, h2.p, "resumed", { step: "plan", detail: "Answers: a 200 or 203 is parsed. The implementation plan is written next." }, TR);
    const RA = r.p.wip.asked || [], RV = H(r.p, "research").slice(-1)[0] || {};
    c.push(["resumed (at plan, as #69's): every question answered at the resume, the gist left null", r.a.status === 0 && r.p.wip.step === "plan" && RA.length === 4 && RA.every(q => q.answered === TR && q.answer === null), js(RA.map(q => [q.answered, q.answer]))]);
    c.push(["…and on the visit the halt ended: the snapshot's questions answered too", (RV.asked || []).length === 4 && RV.asked.every(q => q.answered === TR), js((RV.asked || []).map(q => q.answered))]);
    c.push(["…research is a finished step whose snapshot carries them, for its panel", lib.finishedSteps(r.p.wip, r.p.status).includes("research") && H(r.p, "research").some(v => (v.asked || []).length === 4), js(lib.finishedSteps(r.p.wip, r.p.status))]);
    const again2 = apply(B, r.p, "resumed", { step: "plan", detail: "Answers: a 200 or 203 is parsed. The implementation plan is written next." }, TR);
    c.push(["the same resumed again: a duplicate", again2.a.status === 0 && again2.S.result === "duplicate", js(again2.S.result)]);
    const ck = run(CHECK, [B.dir, "--auto"]);
    c.push(["check.js --auto passes the board after the resume", ck.status === 0, (ck.stdout + ck.stderr).split(/\r?\n/).filter(l => /FAIL|WARN/.test(l)).slice(0, 6).join(" | ")]);
    keep.resumed = { B, r };
    /* the board left halted, for a browser check of the live panel: a copy laid at the halt */
    const B2 = lay("research-halt-waiting", plan); apply(B2, plan, "halted", HALT, TH); keep.waiting = B2;
  });

  guard("apply-event.js: a halt in another step rides on that step's visit; the plan step's halt (#69's first run) records its questions too", c => {
    const plan = flight({ step: "plan", since: "2026-11-06T04:27:23Z", updated: "2026-11-06T04:27:23Z", current: ["considered", "verdict"], plan: { state: "re-pass", from: "parent", since: "2026-11-06T04:27:23Z" },
      event: { name: "sized", at: "2026-11-06T04:27:23Z" }, history: { sizing: [{ since: null, ended: "2026-11-06T04:27:23Z", endedBy: "sized", to: "plan" }] } });
    const B = lay("plan-halt", plan);
    const h = apply(B, plan, "halted", { step: "plan", waitingOn: "Answers to two questions", questions: [{ text: "Which fixture runs the Level 3 tests?", options: ["LoopbackFetchers.untrusted", "LoopbackTransports.untrusted"] }, "What may the log lines print of a feed URL?"] }, "2026-11-06T04:51:06Z");
    const A = h.p.wip.asked || [], V = H(h.p, "plan").slice(-1)[0] || {};
    c.push(["the questions recorded at plan, the one given as a bare string with no options", h.a.status === 0 && A.length === 2 && A.every(q => q.step === "plan") && (A[0].options || []).length === 2 && !("options" in A[1]), js(A)]);
    c.push(["the plan's held visit holds them, none on another step's", (V.asked || []).length === 2 && V.held === true && !H(h.p, "research").length, js(V)]);
    const r = apply(B, h.p, "resumed", { step: "plan" }, "2026-11-06T04:52:40Z");
    c.push(["resumed at plan: both answered; the live panel's visit began at that answer", (r.p.wip.asked || []).every(q => q.answered === "2026-11-06T04:52:40Z") && r.p.wip.since === "2026-11-06T04:52:40Z", js([(r.p.wip.asked || []).map(q => q.answered), r.p.wip.since])]);
    const h2 = apply(B, r.p, "halted", { waitingOn: "One more answer", questions: ["What may the log lines print of a feed URL?"] }, "2026-11-06T05:16:54Z");
    c.push(["the same text put at a later halt is a new question (the earlier one was answered), on the later visit", (h2.p.wip.asked || []).length === 3 && (H(h2.p, "plan").slice(-1)[0].asked || []).length === 1 && (H(h2.p, "plan")[0].asked || []).length === 2, js([(h2.p.wip.asked || []).length, H(h2.p, "plan").map(v => (v.asked || []).length)])]);
    const k = run(CHECK, [B.dir, "--auto"]);
    c.push(["check.js --auto passes it while halted", k.status === 0, (k.stdout + k.stderr).split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 4).join(" | ")]);
  });

  guard("apply-event.js: the interview keeps its own field; its resumed marks them answered too, and any event out of the stop but cancelled", c => {
    const plan = flight({ step: "interview", since: "2026-11-01T10:00:00Z", updated: "2026-11-01T10:00:00Z", current: [], event: { name: "sized", at: "2026-11-01T10:00:00Z" }, history: { sizing: [{ since: null, ended: "2026-11-01T10:00:00Z", endedBy: "sized", to: "interview" }] } });
    const B = lay("interview-halt", plan);
    const h = apply(B, plan, "halted", { waitingOn: "Answers to the interview", questions: [{ text: "Which reply?", options: ["A", "B"] }] }, "2026-11-01T10:05:00Z");
    c.push(["an interview halt writes wip.interview as before, nothing into wip.asked", h.a.status === 0 && (h.p.wip.interview || []).length === 1 && js(h.p.wip.interview[0].options) === js(["A", "B"]) && !(h.p.wip.asked || []).length, js([h.p.wip.interview, h.p.wip.asked])]);
    const r = apply(B, h.p, "resumed", { step: "interview" }, "2026-11-01T10:20:00Z");
    c.push(["resumed: the interview's question answered at its time, the gist still the presenter's (enrich)", r.p.wip.interview[0].answered === "2026-11-01T10:20:00Z" && r.p.wip.interview[0].answer === null && (r.S.why || []).some(x => /interview's answers/.test(x)), js([r.p.wip.interview, r.S.why])]);
    c.push(["…the interview's held visit marked with it", (H(r.p, "interview")[0].interview || [])[0].answered === "2026-11-01T10:20:00Z", js(H(r.p, "interview"))]);
    /* any other event that takes the board out of the stop answers them; cancelled does not */
    const plan2 = atResearch(), B2 = lay("halt-then-plan", plan2), h2 = apply(B2, plan2, "halted", { waitingOn: "One answer", questions: ["Parse 203 too?"] }, TH);
    const n = apply(B2, h2.p, "researched", { step: "plan" }, "2026-11-06T21:30:00Z");
    c.push(["a researched that takes the board out of the halt answers its questions at its time", n.a.status === 0 && n.p.wip.asked[0].answered === "2026-11-06T21:30:00Z", js([n.a.status, n.p.wip.asked, n.S.error])]);
    const B3 = lay("halt-then-cancel", plan2), h3 = apply(B3, plan2, "halted", { waitingOn: "One answer", questions: ["Parse 203 too?"] }, TH);
    const x = apply(B3, h3.p, "cancelled", { reason: "dropped" }, "2026-11-06T21:30:00Z");
    c.push(["a cancelled one leaves them unanswered", x.a.status === 0 && x.p.wip.asked[0].answered === undefined, js([x.a.status, x.p.wip.asked, x.S.error])]);
  });

  /* the template's helpers, run in a context outside a browser */
  const line = re => { const m = re.exec(PB); if (!m) throw new Error("not in the template: " + re); return m[0]; };
  const ctx = { when: t => `<t>${t}</t>` }; vm.createContext(ctx);
  [/^const esc=.*$/m, /^const pill=.*$/m, /^const IV=.*$/m, /^function spList\(items\).*$/m, /^const spItem=.*$/m, /^const okStamp=.*$/m, /^const qAnsweredOf=.*$/m, /^const KEY_Q=.*$/m,
    /^function questionsHtml\(list,keys,kind,lead\)\{[\s\S]*?\}\)\); \}$/m, /^const askedShown=.*$/m, /^const askedBlock=.*$/m, /^const waitingQs=.*$/m].forEach(re => vm.runInContext(line(re).replace(/^const /, "var "), ctx));
  ctx.rich = ctx.esc;
  guard("the template: one question list for the interview's and a halt's, the live panel's choice, the waiting card's questions, the unit's mirror", c => {
    const keys = new Set(), list = [{ text: "Which?", options: ["A", "B"], answer: null, asked: TH }, { text: "Cap?", answer: null, asked: TH, answered: TR }, { text: "Gist?", answer: "five", asked: TH, answered: TR }];
    const h = ctx.questionsHtml(list, keys, "asked", "Asked at the halt");
    c.push(["the count with its lead: \"Asked at the halt: 2 of 3 questions answered · 1 waiting\"", h.includes('<p class="sp-sum">Asked at the halt: 2 of 3 questions answered · 1 waiting</p>'), h.slice(0, 200)]);
    c.push(["each question with its options under its text", h.includes('Which?<ul class="sp-opts"><li>A</li><li>B</li></ul>'), h]);
    c.push(["waiting on you, asked at; answered with its time; the gist where written", /waiting on you<\/span><span class="q">Which\?.*<small>asked <t>2026-11-06T20:57:36Z<\/t><\/small>/.test(h) && h.includes("<small>answered <t>2026-11-06T22:05:35Z</t></small>") && h.includes("<small>answer: five · <t>2026-11-06T22:05:35Z</t></small>"), h]);
    c.push(["the legend: answered and waiting, named for a halt", [...keys].some(k => /a question a halt put to you, answered or waiting/.test(k)), js([...keys])]);
    const k2 = new Set(); ctx.questionsHtml([{ text: "Q", answer: null }], k2, "interview");
    c.push(["the interview's list is the same renderer, its legend the interview's", [...k2].some(k => /an interview question, answered or waiting/.test(k)) && /interview:\(R,o,keys\)=>\{[^\n]*\n[^\n]*\n\s*return questionsHtml\(iv,keys,"interview"\); \},/.test(PB), js([...k2])]);
    const A = [{ step: "research", text: "Old", answer: null, asked: "2026-11-06T10:00:00Z", answered: "2026-11-06T11:00:00Z" }, { step: "research", text: "Now", answer: null, asked: TH, answered: TR }, { step: "research", text: "Waits", answer: null, asked: "2026-11-06T23:00:00Z" }, { step: "plan", text: "Other step", answer: null, asked: TH }];
    const shown = ctx.askedShown({ asked: A, since: TR }, "research").map(q => q.text);
    c.push(["the live panel of the step: the questions still waiting, and those the answer that began the visit answered; an earlier visit's and another step's not", js(shown) === js(["Now", "Waits"]), js(shown)]);
    c.push(["the waiting card: the halted run's waiting questions, for its resume step", js(ctx.waitingQs({ step: "halted", resume: "research", since: TH, asked: A }).map(q => q.text)) === js(["Waits"]) && ctx.waitingQs({ step: "research", asked: A }).length === 0, js(ctx.waitingQs({ step: "halted", resume: "research", since: TH, asked: A }))]);
    c.push(["…an interview halt's from wip.interview", js(ctx.waitingQs({ step: "halted", resume: "interview", interview: [{ text: "I1", answer: null }, { text: "I2", answer: "x" }] }).map(q => q.text)) === js(["I1"]), "interview"]);
    c.push(["the step panel draws them after its wait line, the visit's snapshot and the reconstruction too, the tracking card from waitingQs()", /if\(S!=="interview"\) h\+=askedBlock\(askedShown\(R,S\)\.filter\(q=>!qAnsweredOf\(q\)\),keys\);\n  h\+=\(PANEL\[S\]\|\|PANEL\._\)\(R,opts,keys\);/.test(PB) && /if\(Array\.isArray\(V\.asked\)\) h\+=askedBlock\(/.test(PB) && /if\(Array\.isArray\(rc\.asked\)&&rc\.asked\.length\) h\+=askedBlock\(rc\.asked,keys\);/.test(PB) && /qs=waitingQs\(L\)/.test(PB) && /ownQs=waitingQs\(WIP\)/.test(PB), "stepPanel, visitHtml, reconHtml, the waiting card"]);
    const sub = { wip: { step: "halted", resume: "research", since: TH, asked: [{ step: "research", text: "Q", answer: null, asked: TH }] } };
    c.push(["a unit's mirror carries wip.asked (lib.js panelFacts()), so its panel and the waiting card draw them", js(lib.panelFacts(sub).asked) === js(sub.wip.asked) && lib.PANEL_FIELDS.includes("asked"), js(lib.panelFacts(sub))]);
    const rc = lib.reconstructStep({ wip: { asked: [{ step: "research", text: "Q", answer: null, asked: TH }] }, trail: [], milestones: [] }, "research");
    c.push(["a finished step with no snapshot reconstructs its halt's questions", js(rc.asked) === js([{ text: "Q", answer: null, asked: TH }]), js(rc)]);
  });

  guard("check.js and fill.js: wip.asked and a snapshot's asked held to their form; a gist written by a fill, on the snapshot too", c => {
    const S = keep.resumed; if (!S) throw new Error("the first group did not run");
    const bad = copy(S.r.p); bad.wip.asked[0].step = "halted"; bad.wip.asked[1].options = ["", 3]; delete bad.wip.asked[2].asked;
    const Bb = lay("check-bad", bad), k = run(CHECK, [Bb.dir, "--auto"]), o = k.stdout + k.stderr;
    c.push(["a question's step that is no step it halted in, an option not a string, no asked time: each fails", k.status !== 0 && /wip\.asked\[0\]\.step is the step the run halted in/.test(o) && /wip\.asked\[1\]\.options must be an array/.test(o) && /wip\.asked\[2\]\.asked is when the question was put/.test(o), o.split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 5).join(" | ")]);
    const wt = copy(S.r.p); delete wt.wip.asked[0].answered; const Bw = lay("check-waiting", wt), kw = run(CHECK, [Bw.dir, "--auto"]), ow = kw.stdout + kw.stderr;
    c.push(["one still waiting on a board not stopped: a warning, never a failure", kw.status === 0 && /wip\.asked\[0\] still waits while the run is not stopped/.test(ow), ow.split(/\r?\n/).filter(l => /WARN|FAIL/.test(l)).slice(0, 5).join(" | ")]);
    const bv = copy(S.r.p); const V = bv.wip.history.research.find(v => v.asked); V.asked.push({ text: "" }); const Bv = lay("check-visit", bv), kv = run(CHECK, [Bv.dir, "--auto"]);
    c.push(["a snapshot's asked not in its form fails", kv.status !== 0 && /\.asked is the questions the halt that ended the visit put to the user/.test(kv.stdout + kv.stderr), (kv.stdout + kv.stderr).split(/\r?\n/).filter(l => /FAIL/.test(l)).slice(0, 3).join(" | ")]);
    const ff = wr(path.join(sc, "fill-asked.json"), js({ wip: { asked: [{ text: Q69[0].text, answer: "200 and 203; every other 2xx is UpstreamError" }] } }));
    const f = run(FILL, [S.B.dir, "--fields", ff, "--root", S.B.root, "--json"]), p = JSON.parse(rd(path.join(S.B.dir, "plan.json")));
    const snap = p.wip.history.research.find(v => v.asked).asked[0];
    c.push(["fill.js writes a halt question's gist (wip.asked by its text), the snapshot with it", f.status === 0 && p.wip.asked[0].answer === "200 and 203; every other 2xx is UpstreamError" && snap.answer === p.wip.asked[0].answer, js([f.status, (f.stdout || f.stderr).slice(0, 300), p.wip.asked[0].answer, snap.answer])]);
  });

  guard("the feature probe (halt-questions) and check.js on boards made from the template", c => {
    const miss = F.probe(PB, "plan-board").filter(m => m.id === "halt-questions");
    c.push(["the probe finds it on the issue-board template", !miss.length, js(miss)]);
    const old = PB.replace(line(/^  if\(S!=="interview"\) h\+=askedBlock\(askedShown\(R,S\)\.filter\(q=>!qAnsweredOf\(q\)\),keys\);\n/m), "");
    const m = F.probe(old, "plan-board").find(x => x.id === "halt-questions");
    c.push(["the probe misses it on a template whose step panel draws no halt's questions (FEATURE MISSING, since dashboards-skill/45)", old !== PB && !!m && /FEATURE MISSING: the questions a halt puts to you/.test(F.line(m)) && /dashboards-skill\/45/.test(F.line(m)), m ? F.line(m) : "not missed"]);
    const f = F.FEATURES.find(x => x.id === "halt-questions") || {};
    c.push(["it applies to issue and tracking boards only, each other type with its reason", js(f.types) === js(["plan-board"]) && ["system", "supersystem", "work-board"].every(k => f.notFor && f.notFor[k] && F.applicable(k).every(x => x.id !== "halt-questions")), js(f.notFor || null)]);
    const plan = atResearch(), ok = run(CHECK, [lay("probe-ok", plan).dir, "--auto"]);
    c.push(["check.js --auto passes a board in flight made from the template", ok.status === 0 && !/FEATURE MISSING[^\n]*halt puts/.test(ok.stdout + ok.stderr), (ok.stdout + ok.stderr).slice(-300)]);
    const bad = run(CHECK, [lay("probe-old", atResearch(), old).dir, "--auto"]);
    c.push(["…and fails one made from a template without it (FEATURE MISSING)", bad.status !== 0 && /FEATURE MISSING: the questions a halt puts to you/.test(bad.stdout + bad.stderr), (bad.stdout + bad.stderr).slice(-300)]);
  });

  /* the fixture boards for a browser check: the board waiting on the three questions, the board resumed at plan (research's snapshot), and
     the tracking board with its halted unit's run waiting on two of them */
  guard("the fixture boards for a browser check", c => {
    const T = copy(TRK), u = T.rows.find(r => r.unit && r.unit.live && r.unit.live.step === "halted");
    if (u) { const L = u.unit.live; L.waitingOn = "Answers to two questions before the landing"; L.asked = Q69.slice(0, 2).map(q => ({ step: L.resume, text: q.text, options: q.options, answer: null, asked: L.since })); }
    const root = path.join(sc, "tracking-unit-halt"), dir = path.join(root, ...T.folder.split("/")); fs.mkdirSync(dir, { recursive: true });
    const tpl = fs.readFileSync(PBF, "utf8"), m = /<script type="application\/json" id="plan">[\s\S]*?<\/script>/.exec(tpl);
    fs.writeFileSync(path.join(dir, "dashboard.html"), m ? tpl.replace(m[0], `<script type="application/json" id="plan">${JSON.stringify(T, null, 2).replace(/<\//g, "<\\/")}</script>`) : tpl);
    fs.writeFileSync(path.join(dir, "plan.js"), lib.sidecarText("plan", JSON.stringify(T)));
    c.push(["the tracking board's halted unit mirrors two questions", !!u && (u.unit.live.asked || []).length === 2 && !!m, u ? u.id : "no halted unit in the tracking fixture"]);
    c.push(["the board waiting at research and the board resumed at plan are laid", !!keep.waiting && !!keep.resumed && fs.existsSync(path.join(keep.waiting.dir, "dashboard.html")) && fs.existsSync(path.join(keep.resumed.B.dir, "dashboard.html")), sc]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), oi = a.indexOf("--out"), out = path.resolve(oi >= 0 ? a[oi + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  let fails = 0;
  /* on its own, the issue-board template counts as under test, as verify-templates.js counts it (deviation.js verified()) */
  if (!process.env.DASHBOARDS_TEMPLATES_UNDER_TEST) { const { sha } = require(sk("system/scripts/deviation.js")); process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify([sha(fs.readFileSync(sk("plan/template/dashboard.html"), "utf8"))]); }
  module.exports({ sk, out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length; console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
