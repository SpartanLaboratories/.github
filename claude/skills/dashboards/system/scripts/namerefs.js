// Internal names (GUIDANCE.md §4, "No internal names"; dashboards-skill/33): a board never names the pipeline's agents, sessions or roles
// (admin team, planner, plan-writer, architect, researcher, verifier, interviewer, presenter, publisher, rookie-dev,
// version-control-manager or executor, qa as an agent, code-reviewer, documentation-reviewer, test-inspector), never refers to the
// approval flow ("the user's call", "the user chose", "user answers"), and never states a work level (levelrefs.js). The implementer
// ("the implementer", whoever builds the change), the qa step and its passes ("qa pass 2", "the QA tile"), the steps' own names
// (research, architecture, plan) and a library's name that only coincides (OkHttp's `RoutePlanner`, a Reactive Streams `Publisher`, a
// `java.util.concurrent.Executor`) are fine.
// The forms come in two strengths: the names no library uses (UNAMBIGUOUS: admin team, plan-writer, rookie-dev, …) match wherever they
// stand; the words a library may use as well (planner, architect, verifier, presenter) match only as an agent, after an article or "by"
// ("the planner", "by the verifier"), as a possessive ("the presenter's"), as a label or a subject ("planner: …", "planner reconciles")
// or before a pipeline noun ("planner re-pass"), and never inside code (backticks, <code>) or as part of a longer word (RoutePlanner); the
// two a concurrency or a reactive library uses all the time, executor and publisher, only with the pipeline's own verbs ("the executor
// commits", "the publisher released"), so "the dispatcher and the executor" on a state board is left alone. "qa" matches only as an agent ("qa found", "qa
// has approved", "by qa", "qa's"), never as the step or its passes. The version-control-manager shortened matches as "the manager's" or
// "the manager" with a pipeline verb, never "Selenium Manager"; "confirms" counts among the pipeline's verbs ("the executor confirms the
// branch"). The approval flow matches with a word between ("the user's two answers") and in the passive ("signed off by the user").
// Used by plan/scripts/check.js (every string of plan.json and board.json, warned), by check-board.js (a board's data blocks, its comments
// and its rendered text, warned) and by plan/scripts/apply-event.js, which rewords a fact text through scrubNames() before it is written,
// and leaves it out, telling the presenter (enrich), where a name would remain.
"use strict";
const UNAMBIGUOUS = ["admin[- ]teams?", "plan-writers?", "rookie-devs?", "version-control-managers?", "code-reviewers?", "documentation-reviewers?", "test-inspectors?", "interviewers?", "researchers?"];
const CONTEXTUAL = ["planners?", "architects?", "verifiers?", "presenters?"];
/* executor and publisher: the pipeline's only with its verbs */
const PIPELINE_VERBS = "commits?|committed|pushe[sd]|push|merges?|merged|lands?|landed|files?|filed|releases?|released|publishe[sd]|defers?|deferred|tags?|tagged|confirms?|confirmed";
const ROLE_NOUNS = "agent|agents|session|sessions|re-pass|re-passes|repass|step|verdict|report|reports|leg|lane|lanes|brief|fixes|pass";
const CTX = CONTEXTUAL.join("|");
const NAME_PATTERNS = [
  [`\\b(?:${UNAMBIGUOUS.join("|")})\\b`, "i"],                                                             // "the admin team", "rookie-dev's fixes"
  [`\\b(?:the|a|an|by|to|from|our|its|each|every|no)\\s+(?:${CTX})\\b(?![\`(])`, "i"],                     // "the planner", "by the executor"
  [`\\b(?:${CTX})['’]s\\b`, "i"],                                                                          // "the presenter's"
  [`\\b(?:${CTX})\\s+(?:${ROLE_NOUNS})\\b`, "i"],                                                           // "planner re-pass", "verifier report"
  [`(?:^|[.;:!?]\\s+|\\(\\s*)(?:${CTX})\\s+[a-z]+(?:s|ed)\\b`, "i"],                                             // "planner reconciles" (the role as the subject)
  [`(?:^|[;,]\\s*|\\(\\s*)(?:${CTX})\\s*:`, "i"],                                                                  // "planner: rule on the gaps" (the role as a label)
  [`\\b(?:executors?|publishers?)['’]?s?\\s+(?:${PIPELINE_VERBS})\\b`, "i"],                                         // "the executor commits", "the publisher released"
  [`\\bthe\\s+manager(?:['’]s\\b|\\s+(?:${PIPELINE_VERBS})\\b)`, "i"],                                                // "the manager's final call": the version-control-manager, shortened
  ["\\bqa\\s+(?:agent|agents|found|finds|flagged|flags|raised|raises|reported|reports|said|says|asked|asks|approved|approves|rejected|rejects|returned|returns|requested|requests|reviewer|team|has\\s+approved|had\\s+approved|has\\s+found|had\\s+found)\\b", "i"], // "qa found", "qa has approved"
  ["\\b(?:by|from)\\s+qa\\b(?!\\s+pass)", "i"],                                                             // "raised by qa", never "from qa pass 2"
  ["\\bqa['’]s\\b", "i"],                                                                                  // "qa's test-inspector"
  ["\\buser['’]s\\s+(?:[a-z]+\\s+)?(?:call|answers?|approval|decision|choice|sign-?off|go-ahead)\\b", "i"], // "the user's call", "the user's two answers"
  ["\\buser\\s+(?:chose|chooses|choose|answered|answers|approved|approves|decided|decides|signed\\s+off|confirmed|confirms|okayed)\\b", "i"], // "the user chose", "user answers"
  ["\\b(?:signed\\s+off|approved|decided|chosen|answered)\\s+by\\s+the\\s+user\\b", "i"],                  // "signed off by the user"
];
const REGEXES = NAME_PATTERNS.map(([s, f]) => new RegExp(s, f + "g"));
/* code is never prose: backtick spans and <code> elements are left out of the scan */
const prose = t => String(t).replace(/`[^`\n]*`/g, " ").replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, " ");
/* Every internal name in a text, as the matched strings. */
function nameRefs(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  const t = prose(text);
  REGEXES.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(t))) out.push(m[0]); });
  return out;
}
/* Every internal name in a text as its span, { index, end }, in the text as given (code masked to spaces of the same length, so the
   offsets hold): lib.js sectionOf() elides the clause around each from a plan excerpt, as it elides a work level. */
function nameSpans(text) {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  const t = text.replace(/`[^`\n]*`/g, m => " ".repeat(m.length)).replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, m => " ".repeat(m.length));
  REGEXES.forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(t))) out.push({ index: m.index, end: m.index + m[0].length }); });
  return out.sort((a, b) => a.index - b.index);
}
/* Every internal name in the strings of a data file: [{ at, hit }]; keys, numbers and $comment are skipped, and so are the paths skip(at)
   accepts (an issue's title, quoted verbatim: levelrefs.js titleSkip()). */
function nameRefsIn(v, at, found, skip) {
  found = found || [];
  if (typeof v === "string") { if (!(skip && skip(at || ""))) nameRefs(v).forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => nameRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") nameRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}
/* The comments of a board's HTML (<!-- … -->, and // or /* … *\/ in its scripts are code, not shown, and left alone): the template's
   placeholders once carried a "presenter:" mark, and a hand-written comment is committed with the board. */
function commentRefs(html) {
  const out = [];
  String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, (m, c) => { nameRefs(c).forEach(h => out.push(h)); if (/^\s*presenter:/i.test(c)) out.push("presenter:"); return ""; });
  /* the placeholder mark on a board-filled line of the script before MODEL ("// presenter:"), committed with every state board */
  (String(html || "").match(/\/\/\s*presenter:/g) || []).forEach(() => out.push("// presenter:"));
  return out;
}
/* A fact text reworded so that it names no internal name, where a safe rewrite exists (plan/RULES.md §4, "The fast path"): the agent
   phrase is dropped ("accepted by the admin team" → "accepted"), a possessive becomes the article ("the planner's re-pass" → "the
   re-pass"), a role before its work becomes the work ("a planner re-pass" → "a plan re-pass", "rookie-dev's fixes" → "the fixes",
   "code-reviewer" → "code review"), and an aside on the approval flow is dropped ("(the user's call)", "at the user's call"). Returns
   { text, left }: the reworded text, and the names still in it (none when it names none). The caller writes text when left is empty,
   leaves it out where an unambiguous name remains, and asks the presenter to look (enrich) either way. */
function scrubNames(text) {
  if (typeof text !== "string" || !nameRefs(text).length) return { text, left: [] };
  const cap = /^[A-Z]/.test(text.trim());
  const ROLE = `(?:admin[- ]team|plan-writer|rookie-dev|version-control-manager|code-reviewer|documentation-reviewer|test-inspector|interviewer|researchers?|${CTX}|executors?|publishers?|qa)`;
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
    .replace(/\bqa['’]s\s+test-inspector\b/gi, "the qa pass's test inspection").replace(/\btest-inspector\b/gi, "test inspection")
    .replace(/\bcode-reviewer\b/gi, "code review").replace(/\bdocumentation-reviewer\b/gi, "documentation review")
    .replace(/\bqa\s+(has|had)\s+approved\b/gi, "the qa pass $1 approved").replace(/\bqa\s+approved\b/gi, "the qa pass approved");
  /* a possessive: "the planner's re-pass" → "the re-pass", "rookie-dev's fixes" → "the fixes" */
  s = s.replace(new RegExp(`\\b(?:the\\s+)?${ROLE}['’]s\\s+`, "gi"), "the ");
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([,;:.)])/g, "$1").replace(/\(\s*\)/g, "").trim();
  if (cap && /^[a-z]/.test(s)) s = s[0].toUpperCase() + s.slice(1);
  return { text: s, left: nameRefs(s) };
}
/* a hit no library would use: the text is left out rather than written with it */
const unambiguous = hit => new RegExp(`\\b(?:${UNAMBIGUOUS.join("|")})\\b`, "i").test(hit) || /\buser\b/i.test(hit) || /\bqa\b/i.test(hit);
/* the warning's line */
const nameWarning = (where, hits) => `INTERNAL NAME: ${where} names ${[...new Set(hits)].slice(0, 6).map(h => JSON.stringify(h)).join(", ")}: a board never names the pipeline's agents, sessions or roles, nor the approval flow (GUIDANCE.md §4); reword it at the board's next refresh`;
module.exports = { NAME_PATTERNS, UNAMBIGUOUS, CONTEXTUAL, nameRefs, nameSpans, nameRefsIn, commentRefs, scrubNames, unambiguous, nameWarning };
