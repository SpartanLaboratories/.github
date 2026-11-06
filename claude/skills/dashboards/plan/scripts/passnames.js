// The qa step's passes by name (2026-11-05): a board names a pass "Quality Review N" ("Quality Review 1's fixes", "Remediation for
// Quality Review 1"), never "qa pass N". Not a command. The name comes from here and from the templates' PASS_NAME, never from free text:
// the fast path (apply-event.js) writes every pass name it composes with passName(), rewords every fact text it writes (renamePassText()),
// and every rewrite of a board (lib.js resolveBoard(): apply-event.js, embed.js, fill.js, new.js) rewords what the board already holds
// (renamePasses()); board.js rewords the repository work board it generates; check.js fails a board not landed that still says "qa pass N"
// and warns on a landed one, kept as it landed until something rewrites it (passRefsIn()).
// What is reworded: "qa pass 2", "QA pass 2", "qa pass #2", "qa passes 1 and 2" (→ "Quality Reviews 1 and 2"), and the ordinal in prose,
// "the 2nd qa pass" (→ "Quality Review 2"). What is not: an issue's title (quoted verbatim, levelrefs.js titleSkip()), code in backticks,
// the data keys and identifiers (qa, pass, facts.qa, the qa-pass event: code is not wording), the qa pass named without a number ("the qa
// pass", "no new qa pass") and the ordinal pills the templates draw ("1st pass · approved", "qa · 1st pass"): each a wording of its own.
"use strict";
const path = require("path");
const { titleSkip } = require(path.resolve(__dirname, "..", "..", "system", "scripts", "levelrefs.js"));

const PASS_NAME = "Quality Review";
/* a pass's name: passName(2) → "Quality Review 2"; several: passNames([1, 2]) → "Quality Reviews 1, 2" */
const passName = n => `${PASS_NAME} ${n}`;
const passNames = list => { const l = (Array.isArray(list) ? list : [list]).filter(x => x != null && x !== ""); return l.length === 1 ? passName(l[0]) : `${PASS_NAME}s ${l.join(", ")}`; };
/* the older wording, as a pipeline fact or an older board writes it */
const NUMS = String.raw`\d+(?:(?:\s*,\s*|\s*,?\s+(?:and|or)\s+|\s*[-–]\s*)\d+)*`;
/* a list of numbers only after the plural ("qa passes 1 and 2"): "qa pass 1, 3 findings" names one pass */
const CARDINAL = new RegExp(String.raw`\bqa\s+pass(?:es\s+#?(${NUMS})|\s+#?(\d+))\b`, "gi");
const ORDINAL = /\b(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+qa\s+pass\b(?!es)/gi;
/* a pass number a text names in either wording, old or new (the remediation sub-step that is the next pass, "Quality Review 2" or
   "qa pass 2": lib.js qaShown() and the templates' copy of it) */
const PASS_RE = /\b(?:qa\s+pass|quality\s+review)\s+#?(\d+)\b/i;
/* the parts of a text outside code spans (`…`, <code>…</code>): code is not wording */
const CODE = /(`[^`\n]*`|<code\b[^>]*>[\s\S]*?<\/code>)/gi;
function outsideCode(text, fn) { return String(text).split(CODE).map((part, i) => (i % 2 ? part : fn(part))).join(""); }
/* the text with every pass named "Quality Review N" */
function renamePassText(text) {
  if (typeof text !== "string" || !text) return text;
  return outsideCode(text, s => s
    .replace(CARDINAL, (m, list, one) => list != null ? `${PASS_NAME}s ${list.replace(/\s+/g, " ")}` : passName(one))
    .replace(ORDINAL, (m, n) => passName(n)));
}
/* every older pass name in a text, as written */
function passRefs(text) {
  if (typeof text !== "string" || !text) return [];
  const out = []; outsideCode(text, s => { [CARDINAL, ORDINAL].forEach(re => { re.lastIndex = 0; let m; while ((m = re.exec(s))) out.push(m[0]); }); return s; });
  return out;
}
/* every older pass name in the strings of a data file: [{ at, hit }]; keys and $comment skipped, and the paths skip(at) names */
function passRefsIn(v, at, found, skip) {
  found = found || []; at = at || "";
  if (typeof v === "string") { if (!(skip && skip(at))) passRefs(v).forEach(hit => found.push({ at: at || "(root)", hit })); }
  else if (Array.isArray(v)) v.forEach((x, i) => passRefsIn(x, `${at}[${i}]`, found, skip));
  else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") passRefsIn(v[k], at ? `${at}.${k}` : k, found, skip); });
  return found;
}
/* Reword every older pass name in a data file, in place (a board's plan.json, the repository work board's board.json): its issue titles
   left as quoted. Returns the paths it changed. */
function renamePassesIn(data, skip) {
  const changed = [];
  const walk = (holder, key, at) => { const v = holder[key];
    if (typeof v === "string") { if (!(skip && skip(at))) { const t = renamePassText(v); if (t !== v) { holder[key] = t; changed.push(at); } } }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(v, i, `${at}[${i}]`));
    else if (v && typeof v === "object") Object.keys(v).forEach(k => { if (k !== "$comment") walk(v, k, at ? `${at}.${k}` : k); }); };
  if (data && typeof data === "object") Object.keys(data).forEach(k => { if (k !== "$comment") walk(data, k, k); });
  return changed;
}
/* A board's rewrite (lib.js resolveBoard()): one line when it reworded the board. Any board a script rewrites, landed or not: a landed
   board nothing rewrites keeps its wording, and check.js only warns on it. */
function renamePasses(plan) {
  if (!plan || typeof plan !== "object") return [];
  const ch = renamePassesIn(plan, titleSkip(plan));
  return ch.length ? [`the qa passes named "${PASS_NAME} N" (${ch.slice(0, 4).join(", ")}${ch.length > 4 ? `, and ${ch.length - 4} more` : ""})`] : [];
}

module.exports = { PASS_NAME, passName, passNames, PASS_RE, renamePassText, passRefs, passRefsIn, renamePassesIn, renamePasses };
