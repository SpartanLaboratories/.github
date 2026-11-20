// The sweep of a rule that can fail boards, and its warning stage (GUIDANCE.md §11, "A rule that can fail boards: the sweep and its warning
// stage"; the user's decision q-411). Not a command: sweep.js runs a sweep and ends a repository's warning stage; every writer and both checkers
// of a rule that has a finder here ask split() which of the texts the rule finds are already on a board under a sweep still in its warning stage.
//   RULES                the rules a sweep can run, each by its id: { cite, code, module }; the module exports sweepFind(data, kind) →
//                        [{ at, keys, h, quoted }] (a quoted text is one the board's own writers fix in place), sweepFix(data, kind) → n (the fixes
//                        the board's own writers make, in place), sweepPage(text) → [{ line, keys, h }] (the page's text outside its data blocks)
//   rule(id)             the rule's entry and its module, or throws naming the rule and that it has no finder
//   textHash(s)          the mark a text leaves in the record: a hash, never the text itself, so the record holds no name a rule bars
//   lineHash(line)       the mark of one line of a page's text outside its data blocks
//   recordFile()         the record's file: DASHBOARDS_SWEEPS, else this machine's, ~/.claude/cache/dashboards/sweeps.json, outside every mirrored
//                        path; under the verification (DASHBOARDS_VERIFY=1) only the one a case names, and with none no sweep stands
//   readRecord()         the record ({ schema, sweeps: [...] }), read once per process; a record that cannot be read stands for none
//   writeRecord(rec)     the record written whole (beside it, then renamed)
//   kept(rule, h)        the sweep whose warning stage keeps this text: { rule, swept, repo, cite } or null. A repository's stage stands from its
//                        sweep until its entry records the fixes landed (sweep.js landed)
//   split(rule, list)    the finds of a rule ({ h, … }) split into { kept, fresh }: kept carries .sweep, each the text already on a board
//   keptWords(sweep)     the words a warning adds, naming the sweep
//   stripBlocks(html)    a page with its data blocks (plan, board, state) emptied, for the page's own text
//   forget()             for the verification: the record read again
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");
const SCHEMA = "dashboards-sweeps/1";
const DEFAULT_RECORD = path.join(os.homedir(), ".claude", "cache", "dashboards", "sweeps.json");
const verifying = () => process.env.DASHBOARDS_VERIFY === "1";
const recordFile = () => process.env.DASHBOARDS_SWEEPS ? path.resolve(process.env.DASHBOARDS_SWEEPS) : verifying() ? null : DEFAULT_RECORD;

/* ---------- The rules a sweep can run ----------
   A rule that can fail boards gives its finder here when it is placed (GUIDANCE.md §11). An entry is a finder, not a sweep: a sweep stands
   only once sweep.js has run it and recorded it. */
const RULES = {
  "private-repositories": { cite: 'plan/RULES.md §1, "Private repositories"', code: "PRIVATE REPOSITORY", module: "./privaterefs.js" }
};
function rule(id) {
  const r = RULES[id];
  if (!r) throw new Error(`no rule "${id}" has a finder a sweep can run (system/scripts/sweeplib.js RULES: ${Object.keys(RULES).join(", ")}): a rule that can fail boards gives its finder when it is placed (GUIDANCE.md §11)`);
  return { id, ...r, mod: require(r.module) };
}

/* ---------- A text's mark ---------- */
const textHash = s => crypto.createHash("sha256").update(String(s), "utf8").digest("hex").slice(0, 24);
const lineHash = line => textHash("line:" + String(line).trim());

/* ---------- The record ---------- */
let memo;
function readRecord() {
  if (memo !== undefined) return memo;
  const file = recordFile();
  memo = { schema: SCHEMA, sweeps: [] };
  if (!file) return memo;
  try { const d = JSON.parse(fs.readFileSync(file, "utf8")); if (d && d.schema === SCHEMA && Array.isArray(d.sweeps)) memo = d; } catch (e) { /* none, or unreadable: no sweep stands */ }
  return memo;
}
function writeRecord(rec) {
  const file = recordFile();
  if (!file) throw new Error("the sweeps' record has no file: under the verification set DASHBOARDS_SWEEPS to the case's own");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2) + "\n");
  fs.renameSync(tmp, file);
  memo = rec;
  return file;
}
const forget = () => { memo = undefined; };

/* ---------- The warning stage ---------- */
function kept(ruleId, h) {
  if (!h) return null;
  for (const s of readRecord().sweeps) {
    if (!s || s.rule !== ruleId) continue;
    for (const r of s.repositories || []) {
      if (r && !r.landed && Array.isArray(r.texts) && r.texts.includes(h)) return { rule: s.rule, swept: s.swept, repo: r.repo, cite: s.cite };
    }
  }
  return null;
}
function split(ruleId, list) {
  const out = { kept: [], fresh: [] };
  (list || []).forEach(x => { const s = kept(ruleId, x && x.h); if (s) out.kept.push({ ...x, sweep: s }); else out.fresh.push(x); });
  return out;
}
const keptWords = s => `already on a board when the rule was placed: the sweep of ${String(s.swept || "").slice(0, 10)} (${s.rule}) lists it in ${s.repo}, whose fixes have not landed; until they do it is warned, and only a text newly written is refused (GUIDANCE.md §11, "A rule that can fail boards")`;

/* ---------- A page's own text ---------- */
const BLOCK = id => new RegExp(`(<script type="[^"]+" id="${id}">)([\\s\\S]*?)(</script>)`);
const stripBlocks = (html, ids) => (ids || ["plan", "board", "state"]).reduce((h, id) => String(h).replace(BLOCK(id), (_, a, __, z) => a + z), String(html));

module.exports = { SCHEMA, DEFAULT_RECORD, RULES, rule, textHash, lineHash, recordFile, readRecord, writeRecord, kept, split, keptWords, stripBlocks, forget };
