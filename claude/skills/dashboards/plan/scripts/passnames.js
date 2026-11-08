// The names a board shows for the run's steps, its Quality Reviews and what follows them (2026-11-05, 2026-11-06). Not a command.
// Each name has one home: here for the scripts, and the templates' copy of it (plan/template/dashboard.html and board.html: PASS_NAME,
// STEP_NAME, ROUTE_NAME, …), which verify/cases-board-wording.js holds equal to this one. Never free text: the fast path (apply-event.js)
// writes every name it composes from here and rewords every fact text it writes (renamePassText()); every rewrite of a board (lib.js
// resolveBoard(): apply-event.js, embed.js, fill.js, new.js) rewords what the board already holds (renamePasses()); board.js rewords the
// repository work board it generates; check.js fails a board not landed that still holds an older wording and warns on a landed one, kept
// as it landed until something rewrites it (passRefsIn()).
//   - the qa step reads "Quality Review"; a pass, "Quality Review N" ("Quality Review 1 · approved"); one not numbered, "review" ("no
//     additional review", "the next review", "the review approved"); what a pass returns, its "findings" ("Quality Review 1: 18 findings");
//   - the remediation step is named by its route: "Correction" (on-the-spot, remediation), "Resolution" (re-plan-then-remediation); the
//     first bare, a later one "Correction of Quality Review N" (the pass it answers, from 2 on); no "loop"; a halt during it names it by
//     its route alone, "Halted at Correction", "Halted at Resolution", never the pass (admin-team/dashboards/call-3; haltWords(), haltName());
//   - every other step by its reader name (STEP_NAME: "Implementation", "Document", "State boards"); the Document step's commit task,
//     "Document commit"; an open point's "raised" by the step that raised it ("raised during Implementation, stage 3", "raised at Document").
// The ids stay as they are: qa, remediation, state-boards and document-landing in the data and the events (code is not wording).
// What is reworded: "qa pass 2", "QA pass 2", "qa pass #2", "qa passes 1 and 2" (→ "Quality Reviews 1 and 2"), "the 2nd qa pass"
// (→ "Quality Review 2"); "qa pass" with no number (→ "review": "no new qa pass" → "no additional review", "the next qa pass" → "the next
// review", "qa passed" → "the review approved"); "qa next", "Halted at qa" (→ "Quality Review next", "Halted at Quality Review");
// "Remediation for Quality Review 1", "Remediation: …", "the remediation loop", "a remediation pass", "Halted at remediation" (→ the step's
// name by its route; a halt's with no article, "Halted at Correction"); "Halted at the Correction of Quality Review 2", "Held still at the
// Resolution" (→ "Halted at Correction", "Held still at Resolution": a halt names its fix step by its route alone); "Document-landing commit" (→ "Document commit");
// a findings line with its kinds before its severities, "18 findings (3 documentation, 15 code; 2 minor, 16 other)" (→ "18 findings (2 minor,
// 16 other; 3 documentation, 15 code)", admin-team/dashboards/call-5). What is not: an issue's title (quoted verbatim, levelrefs.js
// titleSkip()), code in backticks, the data keys and identifiers (qa, pass, facts.qa, the qa-pass event, the remediation route's id).
"use strict";
const path = require("path");
const { titleSkip } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));

/* ---------- the names ---------- */
const PASS_NAME = "Quality Review", REVIEW = "review";
/* a pass's name: passName(2) → "Quality Review 2"; several: passNames([1, 2]) → "Quality Reviews 1, 2" */
const passName = n => `${PASS_NAME} ${n}`;
const passNames = list => { const l = (Array.isArray(list) ? list : [list]).filter(x => x != null && x !== ""); return l.length === 1 ? passName(l[0]) : `${PASS_NAME}s ${l.join(", ")}`; };
/* every step's reader name; remediation's is its route's (stepName()) */
const STEP_NAME = { sizing: "Sizing", interview: "Interview", research: "Research", architecture: "Architecture", "sub-issues": "Sub-issues", boards: "Boards",
  plan: "Plan", branch: "Branch", implementation: "Implementation", qa: PASS_NAME, remediation: "Correction", document: "Document", landing: "Landing",
  "state-boards": "State boards", merge: "Merge", landed: "Landed", halted: "Waiting on you", escalated: "Escalated", cancelled: "Cancelled" };
/* the remediation step by its route; a route not known yet reads as the default route's, a Correction */
const ROUTE_NAME = { "on-the-spot": "Correction", remediation: "Correction", "re-plan-then-remediation": "Resolution" };
const ROUTE_OLD = { "rookie-dev": "remediation", "planner-then-rookie-dev": "re-plan-then-remediation" };
const routeName = route => ROUTE_NAME[ROUTE_OLD[route] || route] || ROUTE_NAME.remediation;
/* the remediation visit that answers pass n: the first bare ("Correction"), a later one "Correction of Quality Review 2" */
const remediationName = (route, pass) => { const n = parseInt(pass, 10); return Number.isInteger(n) && n > 1 ? `${routeName(route)} of ${passName(n)}` : routeName(route); };
/* a step by its reader name; ctx {route, pass} names a remediation visit (pass omitted: the step, bare) */
const stepName = (step, ctx) => !step ? "" : step === "remediation" ? (ctx && ctx.pass != null ? remediationName(ctx.route, ctx.pass) : routeName(ctx && ctx.route)) : STEP_NAME[step] || String(step);
/* the same in the middle of a sentence: "Halted at Quality Review", "Resumed at the Correction", "Sized; the interview starts" */
const STEP_WORDS = { "sub-issues": "filing the units as sub-issues", boards: "creating the units' boards", sizing: "sizing", interview: "the interview", research: "research",
  architecture: "the architecture", plan: "the plan", branch: "the branch", implementation: "implementation", qa: PASS_NAME, document: "the Document step",
  landing: "the landing", "state-boards": "the state boards", merge: "the merge", landed: "landed" };
const stepWords = (step, ctx) => step === "remediation" ? `the ${stepName(step, ctx)}` : STEP_WORDS[step] || String(step || "");
/* the step a halt names (admin-team/dashboards/call-3, the user's decision of 2026-11-06): a fix step by its route alone, with no pass and
   no article, "Halted at Correction", "Halted at Resolution"; every other step as stepWords() (in a sentence) and stepName() (as a label)
   name it, "Halted at Quality Review", "Halted at the plan". A resume and an escalation are no halt: "Resumed at the Correction of Quality
   Review 2". The templates' haltLabel() is haltName() (verify/cases-halt-fix-step.js holds them equal). */
const haltWords = (step, ctx) => step === "remediation" ? routeName(ctx && ctx.route) : stepWords(step, ctx);
const haltName = (step, ctx) => step === "remediation" ? routeName(ctx && ctx.route) : stepName(step, ctx);
/* the Document step's own tasks a board names (lib.js DOC_TASKS holds the rest) */
const TASK_NAME = { "state-boards": "State boards", "document-landing": "Document commit" };
/* the routes, said in a sentence (a qa pass's detail) and as a label (the step panel) */
const ROUTE_WORDS = { "on-the-spot": "minor fixes on the spot, then the Document step with no additional review", remediation: "a Correction, then the next review",
  "re-plan-then-remediation": "a Resolution: a plan re-pass, then the fixes, then the next review" };
/* the line the remediation panel shows while no sub-step is recorded */
const REMEDIATION_NOTE = "Correction or Resolution after a Quality Review; each step is recorded as it runs";
/* the mark of a pass whose findings were fixed in place, with no pass after it */
const inPlaceWords = p => p && p.inPlace ? `${p.inPlace === "fixing" ? "fixing" : "fixed"} in place · no additional ${REVIEW}` : "";
/* a pass's findings line (admin-team/dashboards/call-5, the user's decision of 2026-11-06): the count, then the severities, then the kinds,
   "18 findings (2 minor, 16 other; 3 documentation, 15 code)". Severities minor, then other (a qa report's own words after them, as it
   wrote them); kinds documentation, test, code; a zero count left out of both. The count is the kinds' sum, else the severities' where no
   kind is counted. Nothing counted: "" (zero true: "0 findings" where a count is recorded, the step panel's line of a pass with none).
   The templates' findingsWords() is this one (names:begin; verify/cases-findings-line.js holds the two equal). */
const FINDING_KINDS = ["documentation", "test", "code"], FINDING_SEVERITIES = ["minor", "other"];
const findingsTotal = f => Object.values(f || {}).filter(n => Number.isInteger(n) && n >= 0).reduce((a, b) => a + b, 0);
const findingParts = (m, order) => { const r = k => order.indexOf(k) < 0 ? order.length : order.indexOf(k);
  return Object.entries(m && typeof m === "object" ? m : {}).filter(([, n]) => Number.isInteger(n) && n > 0).sort((a, b) => r(a[0]) - r(b[0])).map(([k, n]) => `${n} ${k}`); };
const findingsWords = (f, sev, zero) => { const sv = findingParts(sev, FINDING_SEVERITIES), kinds = findingParts(f, FINDING_KINDS), t = findingsTotal(f) || findingsTotal(sev);
  const counted = [f, sev].some(m => m && typeof m === "object" && Object.values(m).some(n => Number.isInteger(n) && n >= 0));
  return t || sv.length || (zero && counted) ? `${t} finding${t === 1 ? "" : "s"}${sv.length || kinds.length ? ` (${[sv.join(", "), kinds.join(", ")].filter(Boolean).join("; ")})` : ""}` : ""; };
/* the findings line in the order before call-5, the kinds before the severities ("18 findings (3 documentation, 15 code; 2 minor, 16
   other)"), as the scripts wrote it into a detail or a trail entry: reworded by every rewrite into the order above (OLDER, below) */
const FINDINGS_OLD = /\b(\d+)\s+(findings?)\s+\(((?:\d+\s+(?:documentation|test|code))(?:,\s*\d+\s+(?:documentation|test|code))*);\s*(\d+\s+(?!(?:documentation|test|code)\b)[a-z][a-z-]*(?:,\s*\d+\s+(?!(?:documentation|test|code)\b)[a-z][a-z-]*)*)\)/g;
const countsOf = s => { const m = {}; s.split(/\s*,\s*/).forEach(x => { const r = /^(\d+)\s+([a-z][a-z-]*)$/.exec(x.trim()); if (r) m[r[2]] = (m[r[2]] || 0) + +r[1]; }); return m; };
const findingsReordered = (n, noun, kinds, sevs) => { const sv = findingParts(countsOf(sevs), FINDING_SEVERITIES), kd = findingParts(countsOf(kinds), FINDING_KINDS);
  return `${n} ${noun}${sv.length || kd.length ? ` (${[sv.join(", "), kd.join(", ")].filter(Boolean).join("; ")})` : ""}`; };
/* the progress notes, by the work they report (a note's file name is its writer's; the board shows the work) */
const NOTE_WORK = { planner: "planning", interviewer: "interview", researcher: "research", verifier: "verification", architect: "architecture", "plan-writer": "plan writing",
  "rookie-dev": "implementation", "test-inspector": "test check", qa: PASS_NAME, "code-reviewer": "code check", "documentation-reviewer": "documentation review" };
const PROGRESS_NOTE = "a progress note: a report of the work as it happens";
/* an open point's "raised": the step that raised it by its reader name. A board records the event's id ("document", "qa-pass"), an
   implementation stage ("implementation-stage S3") or a pass ("Quality Review 1"); a text of the run's own is shown as it is */
const EVENT_STEP = { sized: "sizing", "research-planning": "research", "research-started": "research", "research-returned": "research", "research-verifying": "research",
  "research-complete": "research", "interview": "interview", "architecture-signed-off": "architecture", "sub-issues-filed": "sub-issues", "boards-created": "boards",
  "plan-accepted": "plan", "branch-cut": "branch", "implementation-stage": "implementation", "qa-pass": "qa", document: "document", landing: "landing",
  "state-boards": "state-boards", merge: "merge", landed: "landed" };
function raisedWords(raised) {
  const s = String(raised == null ? "" : raised).trim(); if (!s) return "";
  let m = /^implementation-stage(?:\s+(\S+))?$/i.exec(s);
  if (m) return `raised during ${STEP_NAME.implementation}${m[1] ? `, stage ${/^S\d+$/i.test(m[1]) ? m[1].slice(1) : m[1]}` : ""}`;
  m = /^(?:quality\s+review|qa\s+pass)\s+#?(\d+)$/i.exec(s); if (m) return `raised during ${passName(m[1])}`;
  const st = EVENT_STEP[s] || (STEP_NAME[s] ? s : null);
  return st ? `raised at ${stepName(st)}` : `raised at ${s}`;
}

/* ---------- the older wording, and its rewording ---------- */
const NUMS = String.raw`\d+(?:(?:\s*,\s*|\s*,?\s+(?:and|or)\s+|\s*[-–]\s*)\d+)*`;
/* a list of numbers only after the plural ("qa passes 1 and 2"): "qa pass 1, 3 findings" names one pass */
const CARDINAL = new RegExp(String.raw`\bqa\s+pass(?:es\s+#?(${NUMS})|\s+#?(\d+))\b`, "gi");
const ORDINAL = /\b(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+qa\s+pass\b(?!es)/gi;
/* a pass number a text names in either wording, old or new (the remediation sub-step that is the next pass, "Quality Review 2" or
   "qa pass 2": lib.js qaShown() and the templates' copy of it) */
const PASS_RE = /\b(?:qa\s+pass|quality\s+review)\s+#?(\d+)\b/i;
/* the unnumbered and step wordings, in the order they are reworded (each after the numbered passes are named); r(ctx) gives the
   replacement. ctx.routeOf(n) is the route of pass n where the board records it, ctx.route the remediation's route now */
const cap = (s, like) => /^[A-Z]/.test(like) ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const OLDER = [
  [/\bno\s+(?:new|further|more|other|additional|second|2nd|3rd|third)\s+qa\s+pass(?:es)?\b/gi, m => cap("no additional review", m)],
  [/\bthe\s+next\s+qa\s+pass\b/gi, m => cap("the next review", m)],
  [/\b(?:the\s+)?qa\s+passed\b/gi, m => cap("the review approved", m)],
  [/(['’]s\s+run)\s+passed\s+qa\b/gi, (m, a) => `${a}: the review approved`],
  [/\bpassed\s+qa\b/gi, () => "passed the review"],
  [/\bqa\s+pass(es)?\b(?!\s*#?\d)/gi, (m, pl) => cap(pl ? "reviews" : "review", m)],
  [/\b(halted|resumed|escalated|held still)\s+(at|from|during|in)\s+qa\b(?![-\w])/gi, (m, a, b) => `${a} ${b} ${PASS_NAME}`],
  [/\bqa\s+next\b/gi, () => `${PASS_NAME} next`],
  [/\bqa\s+starts\b/gi, () => `${PASS_NAME} starts`],
  [/\bRemediation\s+for\s+Quality\s+Review\s+(\d+)\b/gi, (m, n, ctx) => remediationName(ctx.routeOf(+n), +n)],
  [/^Remediation:\s*([\s\S]*)$/i, (m, rest, ctx) => { const n = (PASS_RE.exec(rest) || [])[1]; return `${n ? remediationName(ctx.routeOf(+n), +n) : remediationName(ctx.route, ctx.pass)}: ${rest}`; }],
  [/\b(halted|resumed|escalated|held still)\s+(at|from|during|in)\s+remediation\b(?![-\w])/gi, (m, a, b, ctx) => `${a} ${b} ${/^(?:halted|held still)$/i.test(a) ? "" : "the "}${routeName(ctx.route)}`],
  /* a halt names its fix step by its route alone (admin-team/dashboards/call-3): "Halted at the Correction of Quality Review 2" → "Halted at
     Correction", "Held still at the Resolution" → "Held still at Resolution"; the step's names as the scripts write them (capitalised), so a
     text's own "halted at the resolution of the conflict" is not one; a resume and an escalation keep the visit's name */
  [/\b([Hh]alted|[Hh]eld\s+still)\s+(at|from|during|in)\s+the\s+(Correction|Resolution)(?:\s+of\s+Quality\s+Review\s+#?\d+)?(?![-\w])(?!\s+of\b)/g, (m, a, b, r) => `${a} ${b} ${r}`],
  [/\b(?:(the|a|an|each|every|this)\s+)?(?:remediation\s+(?:loop|pass)|loop\s+of\s+remediation)(s?)\b/gi, (m, art, pl, ctx) => `${art ? art.replace(/^an$/i, "a") + " " : ""}${routeName(ctx.route)}${pl}`],
  [/\bdocument-landing\s+commit\b/gi, m => cap("Document commit", m).replace(/^document/, "Document")],
  /* a findings line with its kinds before its severities (admin-team/dashboards/call-5): the severities first */
  [FINDINGS_OLD, (m, n, noun, kinds, sevs) => findingsReordered(n, noun, kinds, sevs)],
];
/* the parts of a text outside code spans (`…`, <code>…</code>): code is not wording */
const CODE = /(`[^`\n]*`|<code\b[^>]*>[\s\S]*?<\/code>)/gi;
function outsideCode(text, fn) { return String(text).split(CODE).map((part, i) => (i % 2 ? part : fn(part))).join(""); }
const NO_CTX = { routeOf: () => null, route: null, pass: null };
/* the text in the current wording: every pass named "Quality Review N", every older wording reworded; ctx (ctxOf()) names the routes */
function renamePassText(text, ctx) {
  if (typeof text !== "string" || !text) return text;
  const C = ctx || NO_CTX;
  return outsideCode(text, s => {
    let t = s.replace(CARDINAL, (m, list, one) => list != null ? `${PASS_NAME}s ${list.replace(/\s+/g, " ")}` : passName(one)).replace(ORDINAL, (m, n) => passName(n));
    OLDER.forEach(([re, to]) => { re.lastIndex = 0; t = t.replace(re, (...a) => { const g = a.slice(1, a.findIndex(x => typeof x === "number")); return to(a[0], ...g, C); }); });
    return t;
  });
}
/* every older wording in a text, as written: a match inside a longer one ("qa pass" in "the 2nd qa pass") is the longer one's */
function passRefs(text) {
  if (typeof text !== "string" || !text) return [];
  const out = []; outsideCode(text, s => { const hits = [];
    [CARDINAL, ORDINAL, ...OLDER.map(x => x[0])].forEach(re => { const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"); let m;
      while ((m = g.exec(s))) { if (m[0].trim()) hits.push([m.index, m.index + m[0].length, m[0].trim()]); if (!m[0]) g.lastIndex++; } });
    hits.filter(h => !hits.some(o => o !== h && o[0] <= h[0] && o[1] >= h[1] && o[1] - o[0] > h[1] - h[0])).forEach(h => out.push(h[2])); return s; });
  return [...new Set(out)];
}
/* the routes a run (a board's wip, or a unit's mirror) records: by pass, and its remediation's now */
function ctxOf(w) {
  if (!w || typeof w !== "object") return NO_CTX;
  const by = {}, R = w.remediation && typeof w.remediation === "object" ? w.remediation : null, H = w.history && typeof w.history === "object" ? w.history : {};
  (Array.isArray(w.qa) ? w.qa : []).forEach(p => { if (p && p.route && Number.isInteger(p.pass)) by[p.pass] = p.route; });
  (Array.isArray(H.remediation) ? H.remediation : []).forEach(v => { const M = v && v.remediation; if (M && M.route && Number.isInteger(M.pass) && !by[M.pass]) by[M.pass] = M.route; });
  if (R && R.route && Number.isInteger(R.pass)) by[R.pass] = R.route;
  const last = Object.keys(by).map(Number).sort((a, b) => b - a)[0];
  return { routeOf: n => by[n] || null, route: (R && R.route) || (last != null ? by[last] : null), pass: R && Number.isInteger(R.pass) ? R.pass : null };
}
const runLike = v => v && typeof v === "object" && !Array.isArray(v) && (Array.isArray(v.qa) || (v.remediation && typeof v.remediation === "object"));
/* every older wording in the strings of a data file: [{ at, hit }]; keys and $comment skipped, and the paths skip(at) names */
function passRefsIn(v, at, found, skip) {
  found = found || []; at = at || "";
  if (typeof v === "string") { if (!(skip && skip(at))) passRefs(v).forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => passRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") passRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}
/* Reword every older wording in a data file, in place (a board's plan.json, the repository work board's board.json): its issue titles
   left as quoted. A run's own object (a board's wip, a unit's mirror) names the routes its text is reworded with. Returns the paths it changed. */
function renamePassesIn(data, skip) {
  const changed = [];
  const top = data && typeof data === "object" ? ctxOf(data.wip && typeof data.wip === "object" ? data.wip : data) : NO_CTX;
  const walk = (holder, key, at, ctx) => { const v = holder[key];
    if (typeof v === "string") { if (!(skip && skip(at))) { const t = renamePassText(v, ctx); if (t !== v) { holder[key] = t; changed.push(at); } } }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(v, i, `${at}[${i}]`, ctx));
    else if (v && typeof v === "object") { const c = runLike(v) ? ctxOf(v) : ctx; Object.keys(v).forEach(k => { if (k !== "$comment") walk(v, k, at ? `${at}.${k}` : k, c); }); } };
  if (data && typeof data === "object") Object.keys(data).forEach(k => { if (k !== "$comment") walk(data, k, k, top); });
  return changed;
}
/* A board's rewrite (lib.js resolveBoard()): one line when it reworded the board. Any board a script rewrites, landed or not: a landed
   board nothing rewrites keeps its wording, and check.js only warns on it. */
function renamePasses(plan) {
  if (!plan || typeof plan !== "object") return [];
  const ch = renamePassesIn(plan, titleSkip(plan));
  return ch.length ? [`the older wording reworded: the passes named "${PASS_NAME} N", the steps by their names (${ch.slice(0, 4).join(", ")}${ch.length > 4 ? `, and ${ch.length - 4} more` : ""})`] : [];
}

module.exports = { PASS_NAME, REVIEW, passName, passNames, STEP_NAME, ROUTE_NAME, routeName, remediationName, stepName, STEP_WORDS, stepWords, haltWords, haltName, TASK_NAME, ROUTE_WORDS,
  REMEDIATION_NOTE, inPlaceWords, FINDING_KINDS, FINDING_SEVERITIES, findingsTotal, findingsWords, NOTE_WORK, PROGRESS_NOTE, EVENT_STEP, raisedWords, PASS_RE,
  renamePassText, passRefs, passRefsIn, renamePassesIn, renamePasses, ctxOf };
