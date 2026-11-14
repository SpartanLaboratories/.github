// The cases of the internal-names list's one home (the user's decision of 2026-11-07): ~/.claude/nomenclature/internal-names.md holds the
// names, phrases and words committed content never contains; system/scripts/namerefs.js keeps its copy for the scan. Run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-internal-names.js [--list <file>].
// The list's §1 table (the agents, sessions and roles, reshaped by the user's decision of 2026-11-07) has four columns, Name, Aliases, What it
// is, Allowed when: the Name is the row's heading, a CamelCase proper noun (AdminTeam, PlanWriter, QA) that is not scanned, and the Aliases
// are the forms the scan bars (version-control-manager and executor for VersionControlManager), each in bold. §2 to §4 keep their Term column.
// 1. Parity, in the style of cases-board-wording.js's passnames parity: the aliases of the list's §1 table and namerefs.js's
//    barred names (BARRED, AGENT_ONLY) hold the same names, a hyphen and a space read alike; each at the strength its row allows: "never"
//    BARRED (a whole word wherever it stands, the user's decision of 2026-11-13: no word that only coincides is let through), "barred as an
//    agent's name only" AGENT_ONLY (qa). A row that allows anything else has no strength in the script (an exception is brought to the user
//    first) and is named. The §2 table (the approval flow) and APPROVAL_FLOW hold the same phrases, and each §2 row that names a form and
//    APPROVAL_FORMS, under the row's phrase, the same words, word for word, both ways (the user's decision of 2026-11-14, hook-135): a row's
//    form is read from its "What it is", the quoted words on one side of "followed by" (or "followed directly by") and, on the other, the
//    quoted "user's", "user" or "by the user" they follow or precede; the examples in parentheses are not read.
// 2. Each name and phrase found as its strength says, and §4's allowed words found nowhere: "the direction manager" with a space as well;
//    a name in backticks found, a longer word that contains one not; a name in a hyphenated compound ("planners-guide") found, a hyphen being
//    a word edge, and a fenced block counted as backticks are, in a text and rendered (<pre><code>) alike (the user's decision of 2026-11-13,
//    dashboards/scan-forms, points 1 and 3; the compound's case the user's decision of 2026-11-14, batch-8/q-51). Every word of every §2 form
//    found in its form ("the user's call", with one word between where the row allows it; "the user chose"; "approved by the user"), in
//    capitals, with a curly apostrophe and, where the words follow "user", after "the end user"; not after "superuser", nor past a word
//    between where the row allows none.
// 3. The parity fails where they differ: a row added to the list's table and an alias added to a row (each written into the list's text in
//    its four-column shape and read back), a name dropped from the script, a "never" name made contextual, a phrase added to the list, a word
//    added to a form in the list (written into its row and read back), a word dropped from the script's form and a word added to it.
// 4. namerefs.js's header points at the list and no longer repeats it.
// The list is read beside the skill (../../nomenclature/internal-names.md, as in ~/.claude and the .github mirror's claude/), else from
// ~/.claude/nomenclature/. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* A §2 row's form, from its "What it is": { words, anchor, after, between } or null for a row that names none. The examples in parentheses
   are dropped first; the quoted words on one side of "followed by" ("followed directly by") are the form's words, the one quote on the other
   side that holds "user" a whole word is its anchor ("user's", "user", "by the user"), after true where the words come first; between, whether
   the row allows one word between. */
function formOf(what) {
  const t = String(what || "").replace(/\([^()]*\)/g, " "), quoted = s => [...s.matchAll(/["“]([^"”]+)["”]/g)].map(m => m[1].trim());
  const m = /^([\s\S]*?)\bfollowed\s+(?:directly\s+)?by\b([\s\S]*)$/i.exec(t); if (!m) return null;
  const pre = quoted(m[1]), post = quoted(m[2]), isAnchor = side => side.length === 1 && /\buser\b/i.test(side[0]);
  const after = isAnchor(post) && !isAnchor(pre), words = after ? pre : post, anchor = (after ? post : pre)[0];
  if (!words.length || !anchor || !/\buser\b/i.test(anchor)) return null;
  return { words, anchor, after, between: !after && /\bone word\b[^.]*\bbetween\b/i.test(t) };
}
/* The list's sections: §1's rows ({ name, names, what, allowed }: the heading Name, not scanned, and its Aliases, the barred forms), §2's
   phrases and its forms ({ phrase, words, anchor, after, between }, one per row that names a form: formOf()), §4's rows (the text of each).
   A table's header row (Name in §1, Term in §2 to §4) is skipped. */
function parseList(md) {
  const text = String(md).replace(/\r\n/g, "\n");
  const section = n => { const m = new RegExp(`^## ${n}\\.[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(text); return m ? m[1] : null; };
  const rows = s => (s || "").split("\n").filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l)).map(l => l.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map(x => x.trim()))
    .filter(cells => !/^(?:term|name)$/i.test(cells[0]));
  const bold = cell => [...cell.matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1].replace(/^["“]|["”]$/g, "").trim());
  return {
    found: [1, 2, 4].filter(n => section(n) != null),
    roles: rows(section(1)).map(([name, aliases, what, allowed]) => ({ name: bold(name || "")[0], names: bold(aliases || ""), what: what || "", allowed: allowed || "" })),
    approval: rows(section(2)).flatMap(([term]) => bold(term)),
    forms: rows(section(2)).map(([term, what]) => { const f = formOf(what); return f && bold(term || "")[0] ? Object.assign({ phrase: bold(term)[0] }, f) : null; }).filter(Boolean),
    allowed: rows(section(4)).map(cells => cells.join(" · "))
  };
}
/* a name's key: lower case, a hyphen and a space alike; a script entry's regex form ("admin[- ]teams?") read as the name */
const key = s => String(s).toLowerCase().replace(/\[- \]/g, "-").replace(/s\?$/, "").replace(/[\s-]+/g, "-").replace(/['’]/g, "'");
/* the script's barred names by strength */
function scriptNames(N) {
  const out = [];
  [["barred", N.BARRED], ["contextual", N.CONTEXTUAL], ["verb-only", N.VERB_ONLY], ["agent-only", N.AGENT_ONLY]].forEach(([strength, list]) =>
    (list || []).forEach(src => out.push({ key: key(src), src, strength })));
  return out;
}
/* the strengths a row of §1 allows: none for a row whose "Allowed when" is anything else (the script has no strength for an exception) */
const strengthsFor = row => /agent's name only/i.test(`${row.what} ${row.allowed}`) ? ["agent-only"]
  : /^never\.?$/i.test(row.allowed.trim()) ? ["barred"] : [];
/* Every difference between the list and the script: [] when they agree. */
function parity(list, N) {
  const diffs = [], S = scriptNames(N), seen = new Map();
  S.forEach(s => { if (seen.has(s.key)) diffs.push(`namerefs.js holds ${s.src} twice (${seen.get(s.key).strength}, ${s.strength})`); seen.set(s.key, s); });
  const listed = new Map();
  list.roles.forEach(row => row.names.forEach(n => listed.set(key(n), { name: n, row })));
  listed.forEach(({ name, row }, k) => {
    const s = seen.get(k);
    if (!s) diffs.push(`the list's §1 names "${name}", namerefs.js does not bar it`);
    else if (!strengthsFor(row).includes(s.strength)) diffs.push(`"${name}" is ${s.strength} in namerefs.js, its row allows ${strengthsFor(row).join(" or ") || "no strength the script has"} ("${row.allowed}")`);
  });
  S.forEach(s => { if (!listed.has(s.key)) diffs.push(`namerefs.js bars ${s.src}, the list's §1 does not name it`); });
  const a = new Map(list.approval.map(p => [key(p), p])), b = new Map((N.APPROVAL_FLOW || []).map(p => [key(p), p]));
  a.forEach((p, k) => { if (!b.has(k)) diffs.push(`the list's §2 names "${p}", namerefs.js APPROVAL_FLOW does not`); });
  b.forEach((p, k) => { if (!a.has(k)) diffs.push(`namerefs.js APPROVAL_FLOW holds "${p}", the list's §2 does not`); });
  /* the forms, word for word both ways: a word's key is its lower case with its spaces one, a hyphen kept ("sign-off" and "signoff" two words) */
  const wk = w => String(w).toLowerCase().replace(/\s+/g, " ").replace(/’/g, "'").trim(), F = N.APPROVAL_FORMS || {};
  const scriptForms = new Map(Object.keys(F).map(p => [key(p), { p, words: F[p] || [] }]));
  const listForms = new Map((list.forms || []).map(f => [key(f.phrase), f]));
  listForms.forEach((f, k) => {
    const s = scriptForms.get(k);
    if (!s) { diffs.push(`the list's §2 row "${f.phrase}" names a form, namerefs.js APPROVAL_FORMS holds none for it`); return; }
    const lw = new Set(f.words.map(wk)), sw = new Set(s.words.map(wk));
    if (sw.size !== s.words.length) diffs.push(`namerefs.js's form "${s.p}" holds a word twice (${JSON.stringify(s.words)})`);
    f.words.forEach(w => { if (!sw.has(wk(w))) diffs.push(`the list's §2 form "${f.phrase}" takes "${w}", namerefs.js's does not`); });
    s.words.forEach(w => { if (!lw.has(wk(w))) diffs.push(`namerefs.js's form "${s.p}" takes "${w}", the list's §2 does not`); });
  });
  scriptForms.forEach((s, k) => { if (!listForms.has(k)) diffs.push(`namerefs.js APPROVAL_FORMS holds a form for "${s.p}", the list's §2 row names none`); });
  return diffs;
}
/* Every name found as its strength says: [] when each is. */
function behaviour(list, N) {
  const bad = [], S = new Map(scriptNames(N).map(s => [s.key, s]));
  const hit = t => N.nameRefs(t).length > 0;
  list.roles.forEach(row => row.names.forEach(name => {
    const s = S.get(key(name)); if (!s) return;
    const spaced = name.replace(/-/g, " "), Cap = name[0].toUpperCase() + name.slice(1).replace(/-(\w)/g, (m, x) => x.toUpperCase());
    /* barred: a whole word wherever it stands, with or without an article or a verb, plural, possessive, any case, in backticks; never
       inside a longer word (RoutePlanner, ExecutorService) */
    const probes = s.strength === "barred" ? [[`the ${name} confirmed it`, true], [name, true], [`by the ${name}`, true], [`the dispatcher and the ${name}`, true], [`two ${name}s`, true],
        [`the ${name}'s note`, true], [name.toUpperCase(), true], [`a \`${name}\``, true], [`a \`${Cap}\``, !/-/.test(name)], [`Route${Cap}`, false], [`${Cap}Service`, false]]
      : [[`${name} found two gaps`, true], [`raised by ${name}`, true], [`the ${name} step`, false], ["Quality Review 2 · approved", false], [`from ${name} pass 2`, false]];
    if (s.strength === "barred" && spaced !== name) probes.push([`the ${spaced} confirmed it`, /^(admin|direction)-/.test(name)]);
    probes.forEach(([t, want]) => { if (hit(t) !== want) bad.push(`${s.strength} "${name}": "${t}" ${want ? "not found" : "found"} (${JSON.stringify(N.nameRefs(t))})`); });
    if (s.strength === "barred" && !N.nameRefs(`the ${name} confirmed it`).every(h => N.unambiguous(h))) bad.push(`"${name}" found, but not as a name no rewording lets through (unambiguous())`);
  }));
  list.approval.forEach(p => { const h = N.nameRefs(p); if (!h.length || !h.every(x => N.unambiguous(x))) bad.push(`the approval flow's "${p}" ${h.length ? "not unambiguous()" : "not found"} (${JSON.stringify(h)})`); });
  /* every word of every §2 form in its form, found and left out by no rewording; in capitals, with a curly apostrophe and, where the words
     follow "user", after "the end user"; with one word between where the row allows it; not after "superuser", nor past a word between where the row allows none */
  (list.forms || []).forEach(f => f.words.forEach(w => {
    const put = (anchor, mid) => f.after ? `it was ${w}${mid ? ` ${mid}` : ""} ${anchor}` : `the ${anchor}${mid ? ` ${mid}` : ""} ${w} it`;
    const probes = [[put(f.anchor), true], [put(f.anchor).toUpperCase(), true], [put(f.anchor.replace(/'/g, "’")), true],
      [put(f.anchor.replace(/\buser\b/i, "superuser")), false], [put(f.anchor, "final"), f.between]];
    if (!f.after) probes.push([put(`end ${f.anchor}`), true]);
    probes.forEach(([t, want]) => { const h = N.nameRefs(t); if ((h.length > 0) !== want) bad.push(`§2's form "${f.phrase}", word "${w}": "${t}" ${want ? "not found" : "found"} (${JSON.stringify(h)})`);
      else if (want && !h.every(x => N.unambiguous(x))) bad.push(`§2's form "${f.phrase}", word "${w}": "${t}" found, not unambiguous() (${JSON.stringify(h)})`); });
  }));
  list.allowed.forEach(t => { const h = N.nameRefs(t); if (h.length) bad.push(`§4's allowed "${t}" found: ${JSON.stringify(h)}`); });
  return bad;
}

module.exports = function casesInternalNames(X) {
  const { sk } = X, js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const NR = sk("system/scripts/namerefs.js"), N = require(NR);
  const candidates = [X.internalNames, path.resolve(sk("verify"), "..", "..", "..", "nomenclature", "internal-names.md"), path.join(os.homedir(), ".claude", "nomenclature", "internal-names.md")].filter(Boolean);
  const file = candidates.find(f => fs.existsSync(f));
  const L = file ? parseList(fs.readFileSync(file, "utf8")) : null;

  guard("the internal-names list's one home: nomenclature/internal-names.md §1 and §2 and namerefs.js's barred names agree", c => {
    c.push(["the list is found and read: §1, §2 and §4, every §1 row with its Name and at least one alias", !!L && js(L.found) === "[1,2,4]" && L.roles.length > 0 && L.roles.every(r => r.name && r.names.length) && L.approval.length > 0, file ? js(L && { found: L.found, roles: L.roles.map(r => [r.name, r.names]), approval: L.approval }) : `not found: ${js(candidates)}`]);
    if (!L) return;
    const badForm = L.forms.filter(f => !L.approval.includes(f.phrase) || !f.words.length || !/\buser\b/i.test(f.anchor) || f.words.some(w => /\buser\b|["“”()]/i.test(w)));
    c.push(["§2's forms read: each row that names one with its words and its anchor (\"user's\", \"user\", \"by the user\"), the examples in parentheses not read", L.forms.length > 0 && !badForm.length, js({ forms: L.forms, bad: badForm })]);
    const camel = L.roles.filter(r => !/^[A-Z][A-Za-z]*$/.test(r.name) || r.names.some(n => n === r.name && /[A-Z]/.test(n)));
    c.push(["§1's Name is the row's CamelCase heading and never read as a barred name; the aliases are", !camel.length && !L.roles.some(r => /^name$/i.test(r.name)), js(camel)]);
    const vcm = L.roles.find(r => r.name === "VersionControlManager");
    c.push(["VersionControlManager's two aliases read: version-control-manager and executor", !!vcm && js(vcm.names) === js(["version-control-manager", "executor"]), js(vcm)]);
    const d = parity(L, N);
    c.push(["§1's names are namerefs.js's barred names, each at the strength its row allows; §2's phrases its APPROVAL_FLOW and each §2 form's words its APPROVAL_FORMS, word for word", !d.length, js(d)]);
    const qa = scriptNames(N).find(s => s.key === "qa"), dm = scriptNames(N).find(s => s.key === "direction-manager");
    c.push(["qa barred as an agent's name only; direction-manager barred wherever it stands", !!qa && qa.strength === "agent-only" && !!dm && dm.strength === "barred", js([qa, dm])]);
    const six = ["planner", "architect", "verifier", "presenter", "publisher", "executor", "archivist"].map(n => scriptNames(N).find(s => s.key === n));
    c.push(["planner, architect, verifier, presenter, publisher and executor barred as the others are, and the archivist with them (the user's decision of 2026-11-13)", six.every(s => s && s.strength === "barred") && !(N.CONTEXTUAL || []).length && !(N.VERB_ONLY || []).length, js(six)]);
  });

  guard("each name found as its strength says, the approval flow's phrases found, §4's allowed words found nowhere", c => {
    if (!L) { c.push(["the list is read", false, `not found: ${js(candidates)}`]); return; }
    const b = behaviour(L, N);
    c.push(["every §1 name and §2 phrase found as its strength says; every §4 row names nothing", !b.length, js(b)]);
    const dm = [["the direction manager confirmed it", true], ["the direction-manager reported", true], ["direction managers", true], ["the `DirectionManager` turns", false], ["a DirectionManager", false], ["the `direction-manager` turns", true]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["\"the direction manager\" with a space found as well as the hyphen, in backticks too; `DirectionManager` as one word left alone", !dm.length, js(dm)]);
    /* the user's decision of 2026-11-13: a name in backticks counts, a longer word that contains one does not; no surrounding word lets one through */
    const strict = [["the planner reconciled it", true], ["a single-thread executor drains the queue", true], ["the event publisher emits", true], ["the bytecode verifier rejects it", true], ["runs on an `Executor`", true],
      ["the `Planner` type", true], ["the archivist's hook", true], ["two archivists", true], ["the solution architect", true], ["Presenters", true],
      ["uses OkHttp's `RoutePlanner`", false], ["an `ExecutorService`", false], ["RoutePlanner picks a route", false], ["plannerConfig", false], ["planner_id", false]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["every name a whole word wherever it stands, in backticks too; a longer word that contains one is not a find", !strict.length, js(strict.map(([t, w]) => [t, w, N.nameRefs(t)]))]);
    /* the user's decision of 2026-11-13, dashboards/scan-forms (1), pinned by the user's decision of 2026-11-14, batch-8/q-51 (a): a hyphen is a
       word edge, so a name in a hyphenated compound is a find, on either side of the hyphen, in backticks and in a path too; a longer word that
       contains one stays no find beside a hyphen */
    const compound = [["the planners-guide page", true], ["`planners-guide`", true], ["docs/planners-guide.md", true], ["a planner-guide", true], ["guide-planners", true],
      ["the executor-pool drains it", true], ["rookie-dev-notes", true], ["see the RoutePlanner-guide", false], ["plannerConfig-guide", false]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["a name in a hyphenated compound (\"planners-guide\") is a find: a hyphen is a word edge; a longer word beside a hyphen is not", !compound.length, js(compound.map(([t, w]) => [t, w, N.nameRefs(t)]))]);
    /* the user's decision of 2026-11-13, dashboards/scan-forms: a fenced block counts as backticks do, in a text and rendered (<pre><code>) alike, so the board scripts and the commit scan agree */
    const fence = [["```kotlin\nval planner = RoutePlanner()\n```", true], ["<pre><code>the planner reruns it</code></pre>", true], ["<pre><code class=\"lang-kotlin\">val executor = pool()</code></pre>", true],
      ["<pre><code>val p = RoutePlanner()</code></pre>", false], ["<code>planner</code>", true]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["a fenced block counts as backticks do: its lines in a text and a rendered <pre><code> scanned, a longer word in it no find; an inline <code> counts as well", !fence.length, js(fence.map(([t, w]) => [t, w, N.nameRefs(t)]))]);
    const span = "<pre><code>the planner reruns it</code></pre>", sp = N.nameSpans(span);
    c.push(["nameSpans() finds what nameRefs() finds, a rendered fenced block included", sp.length === N.nameRefs(span).length && sp.length === 1 && span.slice(sp[0].index, sp[0].end) === "planner", js(sp)]);
    c.push(["a wait on the user, no name of the list, keeps its reading: a rendered fenced block left out of it, a text's found", !N.waitRefs("<pre><code>waiting on the user</code></pre>").length && N.waitRefs("waiting on the user").length === 1, js(N.waitRefs("<pre><code>waiting on the user</code></pre>"))]);
    const sc = [["accepted by the direction manager", "accepted"], ["The direction manager's hook stands.", "The hook stands."]].filter(([s, w]) => { const r = N.scrubNames(s); return r.text !== w || r.left.length; });
    c.push(["scrubNames(): the direction manager's agent phrase dropped, its possessive the article", !sc.length, js(sc.map(([s, w]) => [s, N.scrubNames(s), w]))]);
  });

  guard("the parity fails where the list and namerefs.js differ", c => {
    if (!L) { c.push(["the list is read", false, `not found: ${js(candidates)}`]); return; }
    const md = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"), lines = md.split("\n");
    const row1 = lines.find(l => /^\|\s*\*\*TestInspector\*\*/.test(l)), vcmRow = lines.find(l => /^\|\s*\*\*VersionControlManager\*\*/.test(l));
    if (!row1 || !vcmRow) { c.push(["the list's TestInspector and VersionControlManager rows found to alter", false, js([row1, vcmRow])]); return; }
    /* a row added in the four-column shape: its Name a heading, its alias the barred form */
    const added = parseList(md.replace(row1, `${row1}\n| **ReleaseCaptain** | **release-captain** | The agent that cuts a release. | never |`));
    /* an alias added to a row */
    const alias = parseList(md.replace(vcmRow, vcmRow.replace("**executor**", "**executor**, **vc-manager**")));
    const less = Object.assign({}, N, { BARRED: N.BARRED.filter(s => key(s) !== "direction-manager") });
    const ctx = Object.assign({}, N, { BARRED: N.BARRED.filter(s => key(s) !== "rookie-dev"), CONTEXTUAL: [...(N.CONTEXTUAL || []), "rookie-devs?"] });
    const qa = Object.assign({}, N, { AGENT_ONLY: [], BARRED: [...N.BARRED, "qa"] });
    const phrase = copy(L); phrase.approval.push("the user signed off");
    /* a word added to a form in the list: written into the verb form's row and read back; a word dropped from the script's form, one added */
    const verbRow = lines.find(l => /^\|\s*\*\*["“]the user chose["”]\*\*/.test(l));
    const wordAdded = verbRow ? parseList(md.replace(verbRow, verbRow.replace(/["“]okayed["”],/, "\"okayed\", \"overruled\","))) : null;
    const F = N.APPROVAL_FORMS || {}, possessive = Object.keys(F).find(p => (F[p] || []).includes("go-ahead"));
    const dropped = Object.assign({}, N, { APPROVAL_FORMS: Object.assign({}, F, possessive ? { [possessive]: F[possessive].filter(w => w !== "go-ahead") } : {}) });
    const extra = Object.assign({}, N, { APPROVAL_FORMS: Object.assign({}, F, possessive ? { [possessive]: [...F[possessive], "nod"] } : {}) });
    c.push(["the list's verb form row found to alter, its form read, and the script's form holding \"go-ahead\" found", !!wordAdded && wordAdded.forms.some(f => f.words.includes("overruled")) && !!possessive, js([verbRow, possessive])]);
    const addedD = parity(added, N);
    c.push(["a row added in the four-column shape is read by its alias, its Name not scanned", addedD.some(x => /"release-captain"/.test(x)) && !addedD.some(x => /ReleaseCaptain/.test(x)), js(addedD)]);
    const probes = [["a row added to the list", addedD, /release-captain/], ["an alias added to a row", parity(alias, N), /"vc-manager"/], ["direction-manager dropped from the script", parity(L, less), /direction-manager/],
      ["a \"never\" name made contextual", parity(L, ctx), /rookie-dev.*contextual/], ["qa barred wherever it stands", parity(L, qa), /qa.*barred/], ["a phrase added to the list", parity(phrase, N), /"the user signed off"/],
      ["a word added to a form in the list", wordAdded ? parity(wordAdded, N) : [], /the list's §2 form "the user chose" takes "overruled"/],
      ["a word dropped from the script's form", parity(L, dropped), /the list's §2 form .* takes "go-ahead", namerefs\.js's does not/],
      ["a word added to the script's form", parity(L, extra), /namerefs\.js's form .* takes "nod", the list's §2 does not/]];
    const wrong = probes.filter(([, d, re]) => !d.some(x => re.test(x)));
    c.push(["each difference named: a row added, an alias added, a name dropped, a strength changed, qa beyond an agent's name, a phrase added, a word added to a form in the list, a word dropped from the script's form and one added to it", !wrong.length, js(wrong.map(([w, d]) => [w, d]))]);
  });

  /* the user's decision of 2026-11-13 (vocabulary/choice-2-grade-reach (a)): every form of "grade" is barred, as the list's §3 lists it; the
     boards' scrub (levelrefs.js) finds each form the list names, its terms and the forms quoted beside them. A list before that edit names none. */
  guard("§3's grades: every form of a grade the list names is found by the boards' scrub (levelrefs.js)", c => {
    if (!file) { c.push(["the list is read", false, `not found: ${js(candidates)}`]); return; }
    const m = /^## 3\.[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
    c.push(["§3 is found", !!m, file]); if (!m) return;
    const rows = m[1].split("\n").filter(l => /^\|/.test(l) && !/^\|\s*-/.test(l)).map(l => l.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map(x => x.trim())).filter(cells => !/^term$/i.test(cells[0]));
    const forms = [];
    rows.forEach(([term, what]) => { const bold = [...String(term).matchAll(/\*\*(.+?)\*\*/g)].map(x => x[1].replace(/^["“]|["”]$/g, "").trim());
      if (!bold.some(b => /grad/i.test(b))) return;
      forms.push(...bold, ...[...String(what || "").matchAll(/["“]([^"”]+)["”]/g)].map(x => x[1]).filter(q => /grad/i.test(q))); });
    const LR = require(sk("system/scripts/levelrefs.js")), missed = forms.filter(f => !LR.levelRefs(f).length);
    c.push([forms.length ? `every form of a grade §3 names is found (${forms.length}: ${forms.join(", ")})` : "§3 names no grade yet: nothing to hold", !missed.length, js(missed)]);
  });

  guard("namerefs.js's header points at the list and no longer repeats it", c => {
    const head = fs.readFileSync(NR, "utf8").split(/"use strict";/)[0];
    c.push(["the header names nomenclature/internal-names.md as the list's one home", /nomenclature\/internal-names\.md/.test(head) && /one home/.test(head), head.slice(0, 200)]);
    c.push(["…and repeats neither §1's list nor §2's phrases", !/admin team, planner, plan-writer/.test(head) && !/code-reviewer, documentation-reviewer, test-inspector/.test(head) && !/"the user's call", "the user chose"/.test(head), head.slice(0, 400)]);
  });
  return groups;
};
module.exports.parseList = parseList;
module.exports.parity = parity;

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const a = process.argv.slice(2), li = a.indexOf("--list");
  let fails = 0;
  module.exports({ sk, out: os.tmpdir(), targets: [], internalNames: li >= 0 ? path.resolve(a[li + 1]) : undefined }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length;
    console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
