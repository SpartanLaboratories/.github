#!/usr/bin/env node
// Tests for match.js: every matching rule of the baseline with a case of a find and one of a non-find,
// every live row found in each form the first matching rule names (built from the row as read, never
// typed in), the board-only warnings, and the shapes the board scripts read.
//   node match.test.js --dir <an empty scratch folder>
// It writes only under --dir.
"use strict";
const fs = require("fs"), path = require("path");

const i = process.argv.indexOf("--dir");
if (i < 0 || !process.argv[i + 1]) { console.error("usage: match.test.js --dir <scratch folder>"); process.exit(2); }
const dir = path.resolve(process.argv[i + 1]);
fs.mkdirSync(dir, { recursive: true });
const { load } = require(path.join(__dirname, "..", "lists.js"));
const M = require(path.join(__dirname, "..", "match.js"));
const live = path.resolve(__dirname, "..", "..", "..", "nomenclature");

let pass = 0, fail = 0;
function ok(cond, name, detail) { if (cond) { pass++; console.log(`ok   ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`); } }
const LIVE = load({ fresh: true });
const hits = (t, o) => M.finds(t, Object.assign({ loaded: LIVE }, o)).map(f => f.hit);
const found = (t, o) => hits(t, o).length > 0;
const yes = (t, name, o) => ok(found(t, o), `${name}: ${JSON.stringify(t)} found`, JSON.stringify(hits(t, o)));
const no = (t, name, o) => ok(!found(t, o), `${name}: ${JSON.stringify(t)} not found`, JSON.stringify(hits(t, o)));

const N = LIVE.internalNames;
const never = N.roles.filter(r => r.strength === "never");
const agent = N.roles.find(r => r.strength === "agent");
const one = never.find(r => r.aliases.some(a => /^[a-z]+$/.test(a)));
const single = one.aliases.find(a => /^[a-z]+$/.test(a));
const hyph = never.flatMap(r => r.aliases).find(a => /^[a-z]+-[a-z]+$/.test(a));
const cap = s => s[0].toUpperCase() + s.slice(1);
const gradeWord = N.grades.flatMap(r => r.words).find(w => /^[a-z]+$/.test(w));

/* ---- the baseline's rules, a find and a non-find each --------------------------------------------- */
yes(`${cap(single)}s`, "any case, plural");
yes(`the ${hyph}'s fix`, "the possessive");
yes(single.toUpperCase(), "capitals");
no(`Route${cap(single)}`, "a longer word that contains a term");
no(`${cap(single)}Service`, "a longer word that contains a term");
no(`${single}_id`, "an identifier that contains a term");
yes(`${single}s-guide`, "a hyphen is a word edge");
const markerRow = w => (N.markers || []).find(m => m.word.toLowerCase() === String(w).toLowerCase()) || null;
const unmarked = w => ["plain", "first", "outer"].find(c => !(markerRow(w) || { markers: [] }).markers.some(m => m.toLowerCase() === c));
yes(`${unmarked(gradeWord)}-${gradeWord}`, "a hyphen is a word edge");
yes(`a \`${single}\` here`, "code counts as text: backticks");
yes("```\nsome code\n" + `${single}\n` + "```", "code counts as text: a fenced block");
yes(`<pre><code>${single}</code></pre>`, "code counts as text: a rendered block");
yes(`${single} at the start\nand the end`, "a find at a text's start");

/* ---- a technical sense by its marker, on a fixture list whose markers are known ------------------- */
{
  const d = path.join(dir, "markers"); fs.mkdirSync(d, { recursive: true });
  const base = fs.readFileSync(path.join(live, "internal-names.md"), "utf8").replace(/\r\n/g, "\n");
  const cut = base.indexOf("\n### Markers");
  const text = (cut < 0 ? base : base.slice(0, cut)).replace(/\s*$/, "\n") + ["", "### Markers", "",
    "| Word | Markers | Markers after | In code form |", "|---|---|---|---|",
    `| **${single}** | \`route\`, \`multi-step\` | \`token\` | no find |`,
    `| **${gradeWord}** | \`shoe\` | none | a find |`, ""].join("\n");
  fs.writeFileSync(path.join(d, "internal-names.md"), text);
  fs.writeFileSync(path.join(d, "finding.md"), fs.readFileSync(path.join(live, "finding.md"), "utf8"));
  const F = load({ dirs: { nomenclature: d, glossary: d }, env: {}, readStored: () => null, home: path.join(dir, "nohome") });
  const fh = t => M.finds(t, { loaded: F }).map(f => f.hit);
  const fy = (t, name) => ok(fh(t).length > 0, `marker rule, ${name}: ${JSON.stringify(t)} found`, JSON.stringify(fh(t)));
  const fn = (t, name) => ok(fh(t).length === 0, `marker rule, ${name}: ${JSON.stringify(t)} not found`, JSON.stringify(fh(t)));
  fn(`the route ${single}`, "a marker directly before");
  fy(`the ${single}`, "no marker");
  fn(`the route-${single}`, "a marker joined before by a hyphen");
  fn(`the ${single}-route`, "a marker joined after by a hyphen");
  fy(`the ${single} route`, "a marker after with a space");
  fn(`the ${single} token`, "a marker after, with a space");
  fn(`the ${single}\ntoken`, "a marker after, a line break between");
  fn(`the ${single}-token`, "a marker after, joined by a hyphen");
  fn(`the ${cap(single)} TOKEN's scope`, "a marker after, any case, its possessive");
  fn(`the **${single}** token`, "a marker after, a mark of emphasis at the join");
  fy(`the token ${single}`, "a marker after, standing before the word");
  fy(`the ${single} tokens`, "a marker after, a word that only contains it");
  fy(`the ${single} and token`, "a marker after, another word between");
  fy(`the ${single}\n\ntoken`, "a marker after, a blank line between");
  fy(`the ${gradeWord} token`, "a marker after of another word clears nothing");
  fn(`the route\n${single}`, "a line break between");
  fy(`the route\n\n${single}`, "a blank line between");
  fn(`the multi step ${single}`, "a marker of two words, a space for its hyphen");
  fn(`ROUTE ${single.toUpperCase()}S`, "any case, the plural");
  fn(`the route's ${single}`, "a marker in its possessive");
  fn(`the route’s ${single}`, "a marker in its possessive, a curly apostrophe");
  fn(`the **route ${single}**`, "a mark of emphasis around both");
  fn(`the route **${single}**`, "a mark of emphasis at the join");
  fn(`the \`x-route\` ${single}`, "a mark of code at the join");
  fy(`the route loop's ${single}`, "another word between");
  fy(`the route, then the ${single}`, "a marker elsewhere on the line");
  fy(`the reroute ${single}`, "a word that only contains a marker");
  fy(`the ${single}-router`, "a compound part that only contains a marker");
  fn(`a shoe-${gradeWord} link`, "a marker of a third-section word");
  fn(`shoe ${gradeWord}s`, "a marker before a third-section word's form");
  fy(`a ${gradeWord}-4 issue`, "a third-section word with no marker");
  /* the word itself in code form */
  fn(`a \`${single}\` here`, "code form: a backtick span");
  fn(`a \`\`x ${single}\`\` here`, "code form: a span of two backticks");
  fn("```\nsome code\n" + `${single}\n` + "```", "code form: a fenced block");
  fn("  ~~~\n" + `${single}\n` + "  ~~~", "code form: an indented fence of tildes");
  fn("```\n" + `${single} with no closing fence`, "code form: a fence never closed runs to the end");
  fn(`<pre><code>${single}</code></pre>`, "code form: a rendered block");
  fn(`a <code>${single}</code> here`, "code form: a code element");
  fy(`a \`x\` ${single} here`, "code form: the word in prose beside code");
  fy("```\ncode\n```\n" + `the ${single} after`, "code form: prose after a closed fence");
  fy(`a \`x\n\n${single}\` here`, "code form: no span across a blank line");
  fy(`a \`\`x ${single}\` here`, "code form: no span between runs of unlike length");
  ok(M.finds(`a \`${gradeWord}\` here`, { loaded: F }).length === 1, "code form: a word whose row says \"a find\" is found in code");
  ok(M.codeRanges("a `b` c").length === 1 && M.codeRanges("a `b` c")[0].index === 2 && M.codeRanges("a `b` c")[0].end === 5, "codeRanges: a span's index and end");
  const pf = M.patterns({ loaded: F }), mine = pf.filter(p => new RegExp(p.source, p.flags).test(single));
  ok(mine.length > 0 && mine.every(p => p.codeForm === true) && pf.filter(p => p.list === "internal-names §3").every(p => p.codeForm === false), "patterns: codeForm as the row says");
  ok(mine.every(p => !new RegExp(p.source, p.flags).test(`route ${single}`)), "patterns: a source carries its markers");
}

/* the approval flow: every word of every form, in its form, built from the list */
N.approval.forEach(r => {
  if (!r.form) { yes(r.phrase, `a phrase with no form (${r.phrase})`); return; }
  const f = r.form;
  f.words.forEach(w => {
    const t = f.after ? `${w} ${f.anchor}` : `the ${f.anchor} ${w}`;
    yes(t, `form "${r.phrase}"`);
    yes(t.toUpperCase(), `form "${r.phrase}", capitals`);
    if (/'/.test(t)) yes(t.replace(/'/g, "’"), `form "${r.phrase}", a curly apostrophe`);
    if (!f.after) {
      yes(`the end ${f.anchor} ${w}`, `form "${r.phrase}", any word before "user"`);
      no(`the super${f.anchor} ${w}`, `form "${r.phrase}", a word that only contains "user"`);
      if (f.between) yes(`the ${f.anchor} final ${w}`, `form "${r.phrase}", one word between`);
      else no(`the ${f.anchor} really ${w}`, `form "${r.phrase}", no word between`);
    }
    /* a space and a hyphen read alike between a form's words, "user" and the word it takes among them */
    const hy = s => s.replace(/ /g, "-");
    yes(f.after ? hy(`${w} ${f.anchor}`) : `the ${hy(`${f.anchor} ${w}`)}`, `form "${r.phrase}", a hyphen between its words`);
    no(f.after ? `${w.replace(/ /g, "_")}_${f.anchor.replace(/ /g, "_")}` : `the ${f.anchor}_${w.replace(/ /g, "_")}`, `form "${r.phrase}", an identifier that joins its words`);
    if (!f.after && f.between) yes(`the ${f.anchor}-final-${hy(w)}`, `form "${r.phrase}", one word between, hyphens`);
    if (!f.after && !f.between) no(`the ${f.anchor}-really-${hy(w)}`, `form "${r.phrase}", no word between, hyphens`);
  });
});
yes("the guild or user choose units", "a product's own user");
no("the username field", "a word that only contains user");

/* a line break is a space; a blank line is not */
const multi = never.flatMap(r => r.aliases).find(a => / /.test(a));
yes(multi.replace(" ", "\n"), "a line break inside a paragraph is a space");
yes(multi.replace(" ", "\r\n   "), "a line break with its indent");
no(multi.replace(" ", "\n\n"), "a blank line ends the paragraph");

/* a space and a hyphen read alike, for every alias of more than one word */
never.flatMap(r => r.aliases).filter(a => /[ -]/.test(a)).forEach(a => {
  yes(a.replace(/ /g, "-"), "a space and a hyphen read alike (hyphens)");
  yes(a.replace(/-/g, " "), "a space and a hyphen read alike (spaces)");
});

/* a verb's forms */
{
  const words = N.grades.flatMap(r => r.words).map(w => w.toLowerCase());
  const past = words.find(w => /ed$/.test(w) && (words.includes(w.slice(0, -1)) || words.includes(w.slice(0, -2))));
  const base = words.includes(past.slice(0, -1)) ? past.slice(0, -1) : past.slice(0, -2), stem = base.replace(/e$/, "");
  yes(`${stem}ing`, "a verb's forms: -ing");
  yes(`${base}s`, "a verb's forms: -s");
  if (words.includes(`re-${base}`)) { yes(`re${base}`, "a verb's forms: re without the hyphen"); yes(`re-${stem}ing`, "a verb's forms: re- and -ing"); yes(`re${past}`, "a verb's forms: re and -ed"); }
  no(`up${base}`, "a longer word that holds the letters");
  no(`de${base}`, "a longer word that holds the letters");
  no(`proposed${cap(base)}`, "an identifier that holds the word");
  no(`${cap(stem)}le`, "a longer word that holds the letters");
  no(`${stem}ient`, "a longer word that holds the letters");
}

/* a name barred as an agent's name only */
{
  const a = agent.aliases[0];
  yes(`${a} found two gaps`, "an agent's name only: with what an agent does");
  yes(`${a} has approved it`, "an agent's name only: has and what an agent does");
  yes(`raised by ${a}`, "an agent's name only: after by");
  yes(`${a}'s note`, "an agent's name only: the possessive");
  no(`the ${a} step`, "an agent's name only: its step");
  no(`from ${a} pass 2`, "an agent's name only: from, before pass");
  no("Quality Review 2 · approved", "an agent's name only: a pass by its name");
}

/* on a board: the shortened names warn, and only on a board */
LIVE.finding.shortened.forEach(p => {
  ok(M.finds(`${p}'s final word`, { loaded: LIVE }).length === 0, `a shortened name is no find of the commit scan: ${JSON.stringify(p)}`);
  const b = M.finds(`${p}'s final word`, { loaded: LIVE, board: true });
  ok(b.length === 1 && b[0].warn === true, `on a board, a shortened name with a possessive warns: ${JSON.stringify(p)}`, JSON.stringify(b));
  ok(M.finds(`${p} merged it`, { loaded: LIVE, board: true }).some(f => f.warn), `on a board, a shortened name with a pipeline verb warns: ${JSON.stringify(p)}`);
  ok(!M.finds(`${p} likes tea`, { loaded: LIVE, board: true }).length, `on a board, a shortened name alone is no warning: ${JSON.stringify(p)}`);
});
ok(!M.finds("Selenium Manager", { loaded: LIVE, board: true }).length, "on a board, a product's manager is no warning");

/* ---- every live row in each form ----------------------------------------------------------------- */
never.forEach(r => r.aliases.forEach(a => {
  const coded = (markerRow(a) || {}).codeForm === true;
  [a, cap(a), a.toUpperCase(), `${a}s`, `the ${a}'s`, ...(coded ? [] : [`\`${a}\``]), `(${a})`].forEach(t => {
    const f = M.finds(t, { loaded: LIVE });
    ok(f.length === 1 && f[0].entry === r.name && f[0].list === "internal-names §1", `live row ${r.name}: ${JSON.stringify(t)} found once, as its row`, JSON.stringify(f));
  });
  if (coded) ok(M.finds(`a \`${a}\` here`, { loaded: LIVE }).length === 0, `live row ${r.name}: "\`${a}\`" in code form not found, as its markers' row says`);
}));
N.grades.forEach(r => r.words.forEach(w => {
  const f = M.finds(`it reads ${w} here`, { loaded: LIVE });
  ok(f.length >= 1 && f.every(x => x.list === "internal-names §3"), `live row ${r.term}: ${JSON.stringify(w)} found`, JSON.stringify(f));
}));
/* every live marker: a find of its word beside it and none where the marker stands apart */
(N.markers || []).forEach(m => m.markers.forEach(k => {
  const w = m.word, at = t => M.finds(t, { loaded: LIVE }).filter(f => f.hit.toLowerCase().replace(/['’]s$/, "").replace(/s$/, "") === w.toLowerCase());
  ok(at(`the ${k} ${w} runs`).length === 0, `live marker ${JSON.stringify(k)} of ${JSON.stringify(w)}: "the ${k} ${w}" not found`, JSON.stringify(at(`the ${k} ${w} runs`)));
  ok(at(`the ${w}-${k} runs`).length === 0, `live marker ${JSON.stringify(k)} of ${JSON.stringify(w)}: "${w}-${k}" not found`);
  ok(at(`the ${k}, then the ${w} runs`).length === 1, `live marker ${JSON.stringify(k)} of ${JSON.stringify(w)}: "the ${k}, then the ${w}" found`, JSON.stringify(at(`the ${k}, then the ${w} runs`)));
  if (!(m.after || []).some(a => a.toLowerCase() === k.toLowerCase())) ok(at(`the ${w} ${k} runs`).length === 1, `live marker ${JSON.stringify(k)} of ${JSON.stringify(w)}: "the ${w} ${k}" found`);
}));
/* every live marker after: no find of its word where it follows, a find where another word stands between */
(N.markers || []).forEach(m => (m.after || []).forEach(k => {
  const w = m.word, at = t => M.finds(t, { loaded: LIVE }).filter(f => f.hit.toLowerCase().replace(/['’]s$/, "").replace(/s$/, "") === w.toLowerCase());
  ok(at(`the ${w} ${k} runs`).length === 0, `live marker after ${JSON.stringify(k)} of ${JSON.stringify(w)}: "the ${w} ${k}" not found`, JSON.stringify(at(`the ${w} ${k} runs`)));
  ok(at(`the ${w}\n${k} runs`).length === 0, `live marker after ${JSON.stringify(k)} of ${JSON.stringify(w)}: a line break between, not found`);
  ok(at(`the ${w} and the ${k} run`).length === 1, `live marker after ${JSON.stringify(k)} of ${JSON.stringify(w)}: "the ${w} and the ${k}" found`, JSON.stringify(at(`the ${w} and the ${k} run`)));
}));

/* ---- the shapes the board scripts read ----------------------------------------------------------- */
{
  const t = `the ${single} and the ${hyph} met`;
  const r = M.nameRefs(t, { loaded: LIVE }), s = M.nameSpans(t, { loaded: LIVE });
  ok(Array.isArray(r) && r.length === 2 && r.every(x => typeof x === "string"), "nameRefs: the matched strings", JSON.stringify(r));
  ok(s.length === 2 && t.slice(s[0].index, s[0].end) === r[0] && s[0].index < s[1].index, "nameSpans: the spans, sorted", JSON.stringify(s));
  ok(M.nameRefs(`a ${gradeWord} 3 issue`, { loaded: LIVE }).length === 0 && M.gradeRefs(`a ${gradeWord} 3 issue`, { loaded: LIVE }).length === 1, "the names and the third section apart");
  const f = M.finds(t, { loaded: LIVE })[0];
  ok(["index", "end", "hit", "list", "entry", "sayInstead", "warn"].every(k => k in f) && f.sayInstead === null, "a find's shape, and no wording without the list's column");
  const p = M.patterns({ loaded: LIVE });
  ok(p.length > 0 && p.every(x => new RegExp(x.source, x.flags)), "patterns: every source compiles");
  ok(M.patterns({ loaded: LIVE, lists: ["internal-names §3"] }).every(x => x.list === "internal-names §3"), "patterns: one section asked for");
}

/* ---- a vocabulary's term lines, and a wording from the list's column ------------------------------- */
{
  const d = path.join(dir, "vocab"); fs.mkdirSync(d, { recursive: true });
  const say = fs.readFileSync(path.join(live, "internal-names.md"), "utf8").replace(/\r\n/g, "\n")
    .replace("| Name | Aliases | What it is | Allowed when |\n|------|---------|------------|--------------|", "| Name | Aliases | What it is | Allowed when | Say instead |\n|---|---|---|---|---|")
    .replace(new RegExp(`(\\| \\*\\*${one.name}\\*\\* \\|[^\\n]*\\| (?:never|as section 4's markers say) \\|)`), "$1 the fixture wording |");
  fs.writeFileSync(path.join(d, "internal-names.md"), say);
  fs.writeFileSync(path.join(d, "finding.md"), fs.readFileSync(path.join(live, "finding.md"), "utf8"));
  fs.writeFileSync(path.join(d, "vocabulary.md"), ["| Term | X |", "|---|---|", "| **Card** | c |", "", "```",
    '{"term":"Card","not":["Bubble"],"allow":["Bubble Chart"]}', '{"term":"Tile","not":["Box"],"case":"any"}', "```", ""].join("\n"));
  const V = load({ dirs: { nomenclature: d, glossary: d }, env: {}, readStored: () => null, home: path.join(dir, "nohome") });
  const w = M.finds(single, { loaded: V });
  ok(w.length === 1 && w[0].sayInstead === "the fixture wording", "a find carries its row's wording", JSON.stringify(w));
  const T = (t, o) => M.termRefs(t, Object.assign({ loaded: V, lists: ["vocabulary"] }, o));
  ok(T("a Bubble here").length === 1 && T("a Bubble here")[0].sayInstead === "Card", "a ruled-out word as capitalised found, its term the wording");
  ok(T("Bubbles everywhere").length === 1, "a ruled-out word's plural found");
  ok(T('"Bubble" is retired: what it named is a Card.').length === 0 && T("“Bubble” is\nretired, and so is it").length === 0, "a ruled-out word quoted and directly followed by \"is retired\" not found");
  ok(T('open the "Bubble" now').length === 1 && T("the Bubble is retired").length === 1 && T('"Bubble" was retired').length === 1, "a ruled-out word quoted elsewhere, or followed by \"is retired\" unquoted, found");
  ok(T("a bubble here").length === 0, "the everyday word in lower case not found");
  ok(T("a box and a BOX").length === 2, "case any: found in any case");
  ok(T("the Bubble Chart").length === 0, "an allowed longer name not found");
  ok(T("a `Bubble` span").length === 0, "a backtick span is code");
  ok(T("see [the page](Bubble.md)").length === 0, "a link target is code");
  ok(T("at https://x.example/Bubble now").length === 0, "a URL is code");
  ok(T("in src/Bubble/a.js").length === 0, "a path is code");
  ok(T("Bubble_id").length === 0 && T("bubble-id").length === 0, "a string that is all identifier is left alone");
  ok(M.finds("a Box", { loaded: V, lists: ["vocabulary"] }).length === 1 && M.finds("a Box", { loaded: V }).length === 0, "finds(): the vocabularies only when asked for");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
