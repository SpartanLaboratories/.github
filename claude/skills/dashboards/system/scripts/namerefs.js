// Internal names (GUIDANCE.md §4, "No internal names"; dashboards-skill/33): a board never names the pipeline's agents, sessions or roles,
// never refers to the approval flow, and never states a work level (levelrefs.js). The terms and what is fine beside them have one home,
// ~/.claude/nomenclature/internal-names.md (§1 the agents, sessions and roles; §2 the approval flow; §4 what is allowed); the lists below
// are its copy for the scan, held equal to its §1 and §2 tables by verify/cases-internal-names.js. Fine as well are the steps' own names
// (research, architecture, plan) and the qa step's passes by their names (passnames.js).
// Every name the list's §1 bars "never" (BARRED) matches as a whole word wherever it stands (the user's decision of 2026-11-13): no
// surrounding word lets one through, "the dispatcher and the executor" is a find as "the planner" is, and "admin team" and "direction
// manager" match with a space as well as a hyphen. A name in backticks or an inline <code> element counts as it does anywhere else; a
// longer word that contains one is not a find (RoutePlanner, ExecutorService, a `DirectionManager`), as the list says. A fenced block keeps
// its reading from before: in a text its lines are scanned as any other, rendered (<pre><code>) it is left out. "qa" matches only as an
// agent ("qa found", "qa has approved", "by qa", "qa's"), never as the step or its passes. The version-control-manager shortened matches as
// "the manager's" or "the manager" with a pipeline verb, never "Selenium Manager". The approval flow matches with a word between ("the
// user's two answers") and in the passive ("signed off by the user").
// A wait on the user, in a fact or a comment, reads "waiting on you" (§4's wording for a halt): waitRefs() finds "waiting on the user", "waits on
// the user" and "wait on the user" in a board's data and comments and scrubWaits() rewords a fact; nameRefs() leaves it alone, as it is the
// fixed text of the templates' status labels (plan/RULES.md §2, §3).
// Used by plan/scripts/check.js (every string of plan.json and board.json, warned), by check-board.js (a board's data blocks, its comments
// and its rendered text, warned) and by plan/scripts/apply-event.js, which rewords a fact text through scrubNames() before it is written,
// and leaves it out, telling the presenter (enrich), where a name would remain.
// Every other writer goes through the same rule: fill.js (cleanWritten(), a name no rewording removes refused) and board.js and org-board.js
// (cleanWorkBoard(), the text a work board copies from a board's data).
"use strict";
/* internal-names.md §1: a name its "Allowed when" reads "never" for is BARRED, a whole word wherever it stands (singular and plural, any
   case, a possessive by its name); qa is barred as an agent's name only (AGENT_ONLY) */
const BARRED = ["admin[- ]teams?", "planners?", "plan-writers?", "architects?", "researchers?", "verifiers?", "interviewers?", "presenters?", "publishers?", "rookie-devs?",
  "version-control-managers?", "executors?", "direction[- ]managers?", "archivists?", "code-reviewers?", "documentation-reviewers?", "test-inspectors?"];
const AGENT_ONLY = ["qa"];
/* internal-names.md §2: the approval flow's phrases, each matched by the forms below (a word between, the passive) */
const APPROVAL_FLOW = ["the user's call", "the user chose", "user answers"];
const PIPELINE_VERBS = "commits?|committed|pushe[sd]|push|merges?|merged|lands?|landed|files?|filed|releases?|released|publishe[sd]|defers?|deferred|tags?|tagged|confirms?|confirmed";
const NAME_PATTERNS = [
  [`\\b(?:${BARRED.join("|")})\\b`, "i"],                                                                  // "the admin team", "rookie-dev's fixes", "the planner", "an `Executor`"
  [`\\bthe\\s+manager(?:['’]s\\b|\\s+(?:${PIPELINE_VERBS})\\b)`, "i"],                                                // "the manager's final call": the version-control-manager, shortened
  ["\\bqa\\s+(?:agent|agents|found|finds|flagged|flags|raised|raises|reported|reports|said|says|asked|asks|approved|approves|rejected|rejects|returned|returns|requested|requests|reviewer|team|has\\s+approved|had\\s+approved|has\\s+found|had\\s+found)\\b", "i"], // "qa found", "qa has approved"
  ["\\b(?:by|from)\\s+qa\\b(?!\\s+pass)", "i"],                                                             // "raised by qa", never "from qa pass 2"
  ["\\bqa['’]s\\b", "i"],                                                                                  // "qa's test-inspector"
  ["\\buser['’]s\\s+(?:[a-z]+\\s+)?(?:call|answers?|approval|decision|choice|sign-?off|go-ahead)\\b", "i"], // "the user's call", "the user's two answers"
  ["\\buser\\s+(?:chose|chooses|choose|answered|answers|approved|approves|decided|decides|signed\\s+off|confirmed|confirms|okayed)\\b", "i"], // "the user chose", "user answers"
  ["\\b(?:signed\\s+off|approved|decided|chosen|answered)\\s+by\\s+the\\s+user\\b", "i"],                  // "signed off by the user"
];
const REGEXES = NAME_PATTERNS.map(([s, f]) => new RegExp(s, f + "g"));
/* a backtick span and an inline <code> element are scanned as the rest (internal-names.md); a rendered fenced block, <pre><code>, is left
   out as before, and a fenced block in a text is scanned line by line as before (whether a fence counts is not decided) */
const FENCED = /(<pre\b[^>]*>\s*)<code\b[^>]*>[\s\S]*?<\/code>/gi;
const prose = t => String(t).replace(FENCED, "$1 ");
/* Every internal name in a text, as the matched strings. */
function nameRefs(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  const t = prose(text);
  REGEXES.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(t))) out.push(m[0]); });
  return out;
}
/* Every internal name in a text as its span, { index, end }, in the text as given (a rendered fenced block masked to spaces of the same
   length, so the offsets hold): lib.js sectionOf() elides the clause around each from a plan excerpt, as it elides a work level. */
function nameSpans(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  const t = text.replace(FENCED, (m, pre) => pre + " ".repeat(m.length - pre.length));
  REGEXES.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(t))) out.push({ index: m.index, end: m.index + m[0].length }); });
  return out.sort((a, b) => a.index - b.index);
}
/* A wait on the user in a fact or a comment: its wording is "waiting on you" (GUIDANCE.md §4). */
const WAIT_ON_USER = /\b(wait(?:s|ing)?)(\s+on\s+)the\s+user\b(?!['’])/gi;
function waitRefs(text) { return typeof text === "string" && text ? (prose(text).match(WAIT_ON_USER) || []) : []; }
function scrubWaits(text) { return typeof text === "string" ? text.replace(WAIT_ON_USER, "$1$2you") : text; }
/* Every internal name in the strings of a data file: [{ at, hit }]; keys, numbers and $comment are skipped, and so are the paths skip(at)
   accepts (an issue's title, quoted verbatim: levelrefs.js titleSkip()). */
function nameRefsIn(v, at, found, skip) {
  found = found || [];
  if (typeof v === "string") { if (!(skip && skip(at || ""))) [...nameRefs(v), ...waitRefs(v)].forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => nameRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") nameRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}
/* The comments of a board's HTML: <!-- … -->, and the /* … *\/ blocks of its styles and scripts, which are committed with the board as well
   (a script's code, its // lines and its data blocks are left alone): the template's placeholders once carried a "presenter:" mark, and a
   hand-written comment is committed with the board. */
function commentRefs(html) {
  const out = [], one = c => { nameRefs(c).forEach(h => out.push(h)); waitRefs(c).forEach(h => out.push(h)); };
  String(html || "").replace(/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, body) => {
    if (!/^script$/i.test(tag) || !/\btype\s*=\s*["'](?!text\/javascript|module)/i.test(attrs)) (body.match(/\/\*[\s\S]*?\*\//g) || []).forEach(one);
    return " ";
  }).replace(/<!--([\s\S]*?)-->/g, (m, c) => { if (/^\s*presenter:/i.test(c)) { out.push("presenter:"); one(c.replace(/^\s*presenter:/i, " ")); } else one(c); return ""; });
  /* the placeholder mark on a board-filled line of the script before MODEL ("// presenter:"), committed with every state board */
  (String(html || "").match(/\/\/\s*presenter:/g) || []).forEach(() => out.push("// presenter:"));
  return out;
}
/* A fact text reworded so that it names no internal name, where a safe rewrite exists (plan/RULES.md §4, "The fast path"): the agent
   phrase is dropped ("accepted by the admin team" → "accepted"), a possessive becomes the article ("the planner's re-pass" → "the
   re-pass"), a role before its work becomes the work ("a planner re-pass" → "a plan re-pass", "rookie-dev's fixes" → "the fixes",
   "code-reviewer" → "code check", "documentation-reviewer" → "documentation check", "qa's test-inspector" → "the review's test check":
   a Quality Review's checks by their progress notes' labels, plan/scripts/passnames.js NOTE_WORK, dashboards-skill/52), and an aside on the approval flow is dropped
   ("(the user's call)", "at the user's call"). Returns { text, left }: the reworded text, and the names still in it (none when it names none). The caller writes text when left is empty,
   leaves it out where a barred name remains, and asks the presenter to look (enrich) either way. */
function scrubNames(text) {
  if (typeof text === "string") text = scrubWaits(text);
  if (typeof text !== "string" || !nameRefs(text).length) return { text, left: [] };
  const cap = /^[A-Z]/.test(text.trim());
  const ROLE = `(?:${BARRED.join("|")}|qa)`;
  let s = text;
  /* an aside on the approval flow */
  s = s.replace(/\s*\(\s*(?:the\s+)?user['’]s\s+(?:call|choice|decision|approval|sign-?off|go-ahead)\s*\)/gi, "");
  s = s.replace(/\s*[,;]?\s*\b(?:at|on|per|by|after)\s+the\s+user['’]s\s+(?:call|choice|decision|approval|sign-?off|go-ahead)\b/gi, "");
  /* the role as a label ("rookie-dev: the fixes" → "the fixes") */
  s = s.replace(new RegExp(`(^|[;,(]\\s*)${ROLE}\\s*:\\s*`, "gi"), "$1");
  /* the agent phrase */
  s = s.replace(new RegExp(`\\s+by\\s+(?:the\\s+)?${ROLE}\\b(?!['’]s)`, "gi"), "");
  /* a role's work */
  s = s.replace(/\bplanner\s+(re-?pass(?:es)?|leg)\b/gi, "plan $1").replace(/\brookie-dev\s+(fix(?:es)?|pass(?:es)?|stage|stages)\b/gi, "$1")
    .replace(/\bqa['’]s\s+test-inspector\b/gi, "the review's test check").replace(/\btest-inspector\b/gi, "test check")
    .replace(/\bcode-reviewer\b/gi, "code check").replace(/\bdocumentation-reviewer\b/gi, "documentation check")
    .replace(/\bqa\s+(has|had)\s+approved\b/gi, "the review $1 approved").replace(/\bqa\s+approved\b/gi, "the review approved");
  /* a possessive: "the planner's re-pass" → "the re-pass", "rookie-dev's fixes" → "the fixes" */
  s = s.replace(new RegExp(`\\b(?:the\\s+)?${ROLE}['’]s\\s+`, "gi"), "the ");
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([,;:.)])/g, "$1").replace(/\(\s*\)/g, "").trim();
  if (cap && /^[a-z]/.test(s)) s = s[0].toUpperCase() + s.slice(1);
  return { text: s, left: nameRefs(s) };
}
/* a hit no rewording lets through, a barred name, the approval flow or qa as an agent: the text is left out rather than written with it */
const unambiguous = hit => new RegExp(`\\b(?:${BARRED.join("|")})\\b`, "i").test(hit) || /\buser\b/i.test(hit) || /\bqa\b/i.test(hit);
/* The one rule of a writer (plan/RULES.md §4; GUIDANCE.md §4): a text a board will show, reworded where a safe rewording exists, a wait on
   the user written "waiting on you", left out where a barred name would remain. Returns { text, left, out }: text is what to write
   (null when out), left the names still in it, out true where it must not be written. apply-event.js's txt() and cleanText() are this rule. */
function cleanWritten(text) {
  if (typeof text !== "string" || !text.trim()) return { text, left: [], out: false };
  const n = scrubNames(text), out = n.left.some(unambiguous);
  return { text: out ? null : n.text, left: n.left, out };
}
/* The repository work board's own text (GUIDANCE.md §4): every row's detail, each pass's note and each chain unit's name, the prose board.js and
   org-board.js copy from a board's data, whatever wrote it and however long ago: a text written before the names were kept out, or by a writer that
   let one through, is reworded here and never reaches a work board. A title is an issue's own, quoted verbatim, and no path, branch or id is prose.
   A text that cannot be reworded gives way: "Waiting on you." on a halted row, nothing elsewhere. Returns what it reworded or left out: [{ at, was, now }]. */
function cleanWorkBoard(board) {
  const changed = [], one = (holder, key, at) => {
    const v = holder[key]; if (typeof v !== "string" || !v) return;
    const r = cleanWritten(v); let now = r.out ? (/^waiting on you\b/i.test(scrubWaits(v)) ? "Waiting on you." : "") : r.text;
    if (now !== v) { holder[key] = now; changed.push({ at, was: v, now }); } };
  (Array.isArray(board && board.rows) ? board.rows : []).forEach((r, i) => { if (!r || typeof r !== "object") return;
    one(r, "detail", `rows[${i}].detail`);
    (Array.isArray(r.qa) ? r.qa : []).forEach((p, j) => { if (p && typeof p === "object") one(p, "note", `rows[${i}].qa[${j}].note`); });
    const units = r.chain && Array.isArray(r.chain.units) ? r.chain.units : [];
    units.forEach((u, j) => { if (u && typeof u === "object") one(u, "name", `rows[${i}].chain.units[${j}].name`); }); });
  return changed;
}
/* the warning's line */
const nameWarning = (where, hits) => `INTERNAL NAME: ${where} names ${[...new Set(hits)].slice(0, 6).map(h => JSON.stringify(h)).join(", ")}: a board never names the pipeline's agents, sessions or roles, nor the approval flow (GUIDANCE.md §4); correct the text where the board stores it, an issue or tracking board's through fill.js`;
module.exports = { NAME_PATTERNS, BARRED, AGENT_ONLY, APPROVAL_FLOW, nameRefs, nameSpans, nameRefsIn, commentRefs, scrubNames, waitRefs, scrubWaits, unambiguous, nameWarning, cleanWritten, cleanWorkBoard };
