// The cases of the internal names on a board: the list's one home, ~/.claude/nomenclature/internal-names.md, read by the finding tool
// (../../../tools/finding/lists.js, beside the skill as in ~/.claude and the .github mirror's claude/), which finds its words as the
// baseline, ~/.claude/nomenclature/finding.md, says; system/scripts/namerefs.js keeps the board's part on the tool's finds and holds no
// copy of the list. Run by verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-internal-names.js.
// 1. The list as the tool reads it: §1 (its Name the row's CamelCase heading, never scanned; its Aliases the forms barred, each in bold),
//    §2 with the form each row names, §3 and §4; each row at its strength (barred wherever it stands, or as an agent's name only); and
//    namerefs.js exporting no copy of any of it.
// 2. namerefs.js's finds, the tool's with a board's warnings: each name and phrase found as its strength says, and §4's allowed words found
//    nowhere; a name's words with a space as well as a hyphen; a name in backticks found, a longer word that contains one not; a name in
//    a hyphenated compound found, a hyphen being a word edge; a fenced block counted as backticks are, in a text and rendered
//    (<pre><code>) alike. Every word of every §2 form found in its form, with a hyphen between its words as well as a space, in
//    capitals, with a curly apostrophe and, where the words follow "user", after "the end user"; not after "superuser", nor past a word
//    between where the row allows none. The wider spans a plan excerpt now loses to "…" (a name with a space, over a line break, a
//    form with a hyphen), and a find that carries a wording to say instead written as that wording by the board's rewording.
//    A word the list's markers table names is no find in its technical sense (a marker directly before it or joined to it, or in code where
//    the table reads it so; finding.md, "A technical sense by its marker"), and a find beside it.
// 3. Every form of the size word §3 names found by the boards' scrub (levelrefs.js).
// 3a. §4's markers, row by row of the live table: no find before, joined or (a marker after) directly after, a find elsewhere, the code-form cell held; the boards' scripts
//    (nameRefs(), nameSpans(), levelRefs()) as the tool. A marker that stands only after its word ("Publisher Pro") is checked on its own probes: no
//    find directly after, a find before it, joined before it, or a word away; scrubNames() leaves a word in its technical sense as written.
// 4. namerefs.js's header points at the list, the baseline and the tool.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* the tool's lists module, beside the skill */
const toolOf = sk => path.resolve(sk("system/scripts"), "..", "..", "..", "..", "tools", "finding");
/* Every name found as its strength says: [] when each is. L: the internal names as the tool reads them; N: namerefs.js. */
function behaviour(L, N) {
  const bad = [], hit = t => N.nameRefs(t).length > 0;
  L.roles.forEach(row => row.aliases.forEach(name => {
    if (row.strength !== "never" && row.strength !== "agent") return;
    /* Cap: the name as one word, a hyphen or a space joining its words (AdminTeam, RookieDev), so Route<Cap> and <Cap>Service are
       longer words that contain it */
    const spaced = name.replace(/-/g, " "), hyphened = name.replace(/ /g, "-"), Cap = name[0].toUpperCase() + name.slice(1).replace(/[- ](\w)/g, (m, x) => x.toUpperCase());
    /* barred: a whole word wherever it stands, with or without an article or a verb, plural, possessive, any case, in backticks save a
       word the list's markers table reads in code form (finding.md, "A technical sense by its marker"); never inside a longer word
       (RoutePlanner, ExecutorService) */
    const codeForm = !!(L.markers || []).find(m => m.word.toLowerCase() === name.toLowerCase() && m.codeForm);
    const probes = row.strength === "never" ? [[`the ${name} confirmed it`, true], [name, true], [`by the ${name}`, true], [`the dispatcher and the ${name}`, true], [`two ${name}s`, true],
        [`the ${name}'s note`, true], [name.toUpperCase(), true], [`a \`${name}\``, !codeForm], [`a \`${Cap}\``, !/[- ]/.test(name) && !codeForm], [`Route${Cap}`, false], [`${Cap}Service`, false]]
      : [[`${name} found two gaps`, true], [`raised by ${name}`, true], [`the ${name} step`, false], ["Quality Review 2 · approved", false], [`from ${name} pass 2`, false]];
    /* a name of more than one word: a space and a hyphen between its words read alike */
    if (row.strength === "never" && spaced !== name) probes.push([`the ${spaced} confirmed it`, true]);
    if (row.strength === "never" && hyphened !== name) probes.push([`the ${hyphened} confirmed it`, true]);
    probes.forEach(([t, want]) => { if (hit(t) !== want) bad.push(`${row.strength} "${name}": "${t}" ${want ? "not found" : "found"} (${JSON.stringify(N.nameRefs(t))})`); });
    if (row.strength === "never" && !N.nameRefs(`the ${name} confirmed it`).every(h => N.unambiguous(h))) bad.push(`"${name}" found, but not as a name no rewording lets through (unambiguous())`);
  }));
  L.approval.filter(r => r.strength === "never").forEach(r => { const h = N.nameRefs(r.phrase); if (!h.length || !h.every(x => N.unambiguous(x))) bad.push(`the approval flow's "${r.phrase}" ${h.length ? "not unambiguous()" : "not found"} (${JSON.stringify(h)})`); });
  /* every word of every §2 form in its form, found and left out by no rewording; with a hyphen between its words as well as a space; in
     capitals, with a curly apostrophe and, where the words follow "user", after "the end user"; with one word between where the row
     allows it; not after "superuser", nor past a word between where the row allows none */
  L.approval.filter(r => r.strength === "never" && r.form).forEach(r => { const f = r.form; f.words.forEach(w => {
    const core = (anchor, mid) => f.after ? `${w}${mid ? ` ${mid}` : ""} ${anchor}` : `${anchor}${mid ? ` ${mid}` : ""} ${w}`;
    const put = (anchor, mid) => f.after ? `it was ${core(anchor, mid)}` : `the ${core(anchor, mid)} it`;
    const probes = [[put(f.anchor), true], [put(f.anchor).toUpperCase(), true], [put(f.anchor.replace(/'/g, "’")), true],
      [f.after ? `it was ${core(f.anchor).replace(/ /g, "-")}` : `the ${core(f.anchor).replace(/ /g, "-")} it`, true],
      [put(f.anchor.replace(/\buser\b/i, "superuser")), false], [put(f.anchor, "final"), f.between]];
    if (!f.after) probes.push([put(`end ${f.anchor}`), true]);
    probes.forEach(([t, want]) => { const h = N.nameRefs(t); if ((h.length > 0) !== want) bad.push(`§2's form "${r.phrase}", word "${w}": "${t}" ${want ? "not found" : "found"} (${JSON.stringify(h)})`);
      else if (want && !h.every(x => N.unambiguous(x))) bad.push(`§2's form "${r.phrase}", word "${w}": "${t}" found, not unambiguous() (${JSON.stringify(h)})`); });
  }); });
  L.allowed.forEach(t => { const h = N.nameRefs(t); if (h.length) bad.push(`§4's allowed "${t}" found: ${JSON.stringify(h)}`); });
  return bad;
}
/* The list with a Say instead column on its first three tables, the wordings given by a row's bold first cell (the rest empty): the
   list's own text, so every word reads as the live list's */
function withColumn(md, wordings) {
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  let section = 0;
  return lines.map((l, i) => {
    const h = /^## (\d+)\./.exec(l); if (h) section = Number(h[1]);
    if (section < 1 || section > 3 || !/^\s*\|/.test(l)) return l;
    const t = l.replace(/\s*$/, "");
    if (/^\s*\|[\s:|-]*-[\s:|-]*\|?$/.test(t)) return `${t}---|`;
    if (/^\s*\|/.test(lines[i + 1] || "") && /^\s*\|[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1] || "")) return `${t} Say instead |`;
    const first = (/^\s*\|\s*\*\*(.+?)\*\*/.exec(t) || [])[1];
    return `${t} ${first && wordings[first.replace(/^["“]|["”]$/g, "")] || ""} |`;
  }).join("\n");
}

module.exports = function casesInternalNames(X) {
  const { sk } = X, js = x => JSON.stringify(x);
  const groups = [];
  const guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const NR = sk("system/scripts/namerefs.js"), N = require(NR), T = toolOf(sk);
  let lists = null, L = null, readError = null;
  try { lists = require(path.join(T, "lists.js")); L = lists.load().internalNames; } catch (e) { readError = String(e.message || e); }

  guard("the internal-names list as the finding tool reads it: §1 to §4, each row at its strength; namerefs.js holds no copy", c => {
    c.push(["the list is read: §1, §2 and §4, every §1 row with its Name and at least one alias", !!L && L.roles.length > 0 && L.roles.every(r => r.name && r.aliases.length) && L.approval.length > 0 && L.allowed.length > 0, L ? js({ file: L.file, roles: L.roles.map(r => [r.name, r.aliases, r.strength]), approval: L.approval.map(r => r.phrase) }) : readError]);
    if (!L) return;
    const forms = L.approval.filter(r => r.form), badForm = forms.filter(r => !r.form.words.length || !/\buser\b/i.test(r.form.anchor) || r.form.words.some(w => /\buser\b|["“”()]/i.test(w)));
    c.push(["§2's forms read: each row that names one with its words and its anchor (\"user's\", \"user\", \"by the user\"), the examples in parentheses not read", forms.length > 0 && !badForm.length, js({ forms: forms.map(r => [r.phrase, r.form]), bad: badForm.map(r => r.phrase) })]);
    const camel = L.roles.filter(r => !/^[A-Z][A-Za-z]*$/.test(r.name) || r.aliases.some(n => n === r.name && /[A-Z]/.test(n)));
    c.push(["§1's Name is the row's CamelCase heading and never read as a barred name; the aliases are", !camel.length && !L.roles.some(r => /^name$/i.test(r.name)), js(camel.map(r => r.name))]);
    const vcm = L.roles.find(r => r.name === "VersionControlManager");
    c.push(["VersionControlManager's two aliases read: version-control-manager and executor", !!vcm && js(vcm.aliases) === js(["version-control-manager", "executor"]), js(vcm)]);
    const qa = L.roles.find(r => r.aliases.includes("qa")), dm = L.roles.find(r => r.aliases.includes("direction-manager"));
    c.push(["qa barred as an agent's name only; direction-manager barred wherever it stands", !!qa && qa.strength === "agent" && !!dm && dm.strength === "never", js([qa && qa.strength, dm && dm.strength])]);
    const six = ["planner", "architect", "verifier", "presenter", "publisher", "executor", "archivist"].map(n => [n, (L.roles.find(r => r.aliases.includes(n)) || {}).strength]);
    c.push(["planner, architect, verifier, presenter, publisher and executor barred as the others are, and the archivist with them (the user's decision of 2026-11-13)", six.every(([, s]) => s === "never"), js(six)]);
    const grades = L.grades.filter(r => r.strength === "never");
    c.push(["§3 read: every row barred wherever it stands, its words its term and the forms quoted beside it", grades.length > 0 && grades.every(r => r.words.length && r.words.includes(r.term)), js(grades.map(r => [r.term, r.words]))]);
    const copies = ["BARRED", "AGENT_ONLY", "APPROVAL_FLOW", "APPROVAL_FORMS", "NAME_PATTERNS"].filter(k => k in N);
    c.push(["namerefs.js exports no copy of the list (BARRED, AGENT_ONLY, APPROVAL_FLOW, APPROVAL_FORMS, NAME_PATTERNS are gone)", !copies.length, js(copies)]);
  });

  guard("namerefs.js's finds: each name found as its strength says, the approval flow's forms found, §4's allowed words found nowhere", c => {
    if (!L) { c.push(["the list is read", false, readError]); return; }
    const b = behaviour(L, N);
    c.push(["every §1 name and §2 phrase found as its strength says, a space and a hyphen alike; every §2 form's word found, a hyphen between its words too; every §4 row names nothing", !b.length, js(b)]);
    const dm = [["the direction manager confirmed it", true], ["the direction-manager reported", true], ["direction managers", true], ["the `DirectionManager` turns", false], ["a DirectionManager", false], ["the `direction-manager` turns", true]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["\"the direction manager\" with a space found as well as the hyphen, in backticks too; `DirectionManager` as one word left alone", !dm.length, js(dm)]);
    /* a shortened role name, "the manager" or "the officer" with a possessive or a pipeline verb, is warned of and blocks nothing: no writer
       leaves the text out for it */
    const short = [["the officer's final call", true], ["the officer commits it", true], ["the manager's final call", true], ["an officer of the guild", false], ["the officer", false],
      ["the officer rank", false]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    const leftOut = ["the officer's final call", "the officer commits it"].filter(t => N.cleanWritten(t).out || N.nameRefs(t).some(h => N.unambiguous(h)));
    c.push(["\"the officer\" shortened, with a possessive or a pipeline verb, found as \"the manager\" is; warned of, never left out by a writer", !short.length && !leftOut.length, js({ short, leftOut })]);
    /* a name in backticks counts, a longer word that contains one does not; no surrounding word lets one through but a marker of the
       list's directly before it, right after it or joined to it, and a word the list reads in code form is no find in code (finding.md, "A
       technical sense by its marker"): "a single-thread executor", "runs on an `Executor`", "publisher key" are none, "the executor stops",
       "the publisher and the key" and "publisher keys" are */
    const strict = [["the planner reconciled it", true], ["a single-thread executor drains the queue", false], ["the event publisher emits", true], ["the bytecode verifier rejects it", true], ["runs on an `Executor`", false],
      ["the executor stops", true], ["the executor drains the queue", true], ["runs on the executor beside `pool()`", true], ["publisher key", false], ["the Publisher API", false], ["the publisher and the key", true], ["publisher keys", true], ["the dispatch loop's executor", true],
      ["the build planner", false], ["the Build Planner", false], ["the planner build", true], ["the build, then the planner", true], ["Publisher Pro", false], ["the publisher and Pro", true], ["the Pro publisher", true],
      ["the `Planner` type", true], ["the archivist's hook", true], ["two archivists", true], ["the solution architect", true], ["Presenters", true],
      ["uses OkHttp's `RoutePlanner`", false], ["an `ExecutorService`", false], ["RoutePlanner picks a route", false], ["plannerConfig", false], ["planner_id", false]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["every name a whole word wherever it stands, in backticks too, save a word in its technical sense (a marker before it, or in code where the list reads it so); a longer word that contains one is not a find", !strict.length, js(strict.map(([t, w]) => [t, w, N.nameRefs(t)]))]);
    /* a hyphen is a word edge, so a name in a hyphenated compound is a find, on either side of the hyphen, in backticks and in a path
       too; a longer word that contains one stays no find beside a hyphen */
    const compound = [["the planners-guide page", true], ["`planners-guide`", true], ["docs/planners-guide.md", true], ["a planner-guide", true], ["guide-planners", true],
      ["the executor-pool drains it", true], ["rookie-dev-notes", true], ["see the RoutePlanner-guide", false], ["plannerConfig-guide", false]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["a name in a hyphenated compound (\"planners-guide\") is a find: a hyphen is a word edge; a longer word beside a hyphen is not", !compound.length, js(compound.map(([t, w]) => [t, w, N.nameRefs(t)]))]);
    /* a fenced block counts as backticks do, in a text and rendered (<pre><code>) alike, so the board scripts and the commit scan agree */
    const fence = [["```kotlin\nval planner = RoutePlanner()\n```", true], ["<pre><code>the planner reruns it</code></pre>", true], ["<pre><code class=\"lang-kotlin\">val planner = pool()</code></pre>", true],
      ["<pre><code>val p = RoutePlanner()</code></pre>", false], ["<code>planner</code>", true],
      /* a word the list reads in code form: no find in a fenced block, a rendered <pre> or an inline <code>; a find in prose beside it */
      ["<pre><code class=\"lang-kotlin\">val executor = pool()</code></pre>", false], ["```kotlin\nval executor = pool()\n```", false], ["<code>executor</code>", false],
      ["the executor runs <code>pool()</code>", true], ["```\npool()\n```\nthe executor runs it", true]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["a fenced block counts as backticks do: its lines in a text and a rendered <pre><code> scanned, a longer word in it no find; an inline <code> counts as well; a word read in code form is no find in any of them, and a find in prose beside them", !fence.length, js(fence.map(([t, w]) => [t, w, N.nameRefs(t)]))]);
    const span = "<pre><code>the planner reruns it</code></pre>", sp = N.nameSpans(span);
    c.push(["nameSpans() finds what nameRefs() finds, a rendered fenced block included", sp.length === N.nameRefs(span).length && sp.length === 1 && span.slice(sp[0].index, sp[0].end) === "planner", js(sp)]);
    /* the wider spans: a name's words with a space, over one line break, and a form's words with a hyphen are finds now, and a plan
       excerpt (lib.js sectionOf()) loses the clause around each to "…"; a blank line between two words is no name */
    const wrap = "the direction\nmanager confirmed it", ws = N.nameSpans(wrap);
    c.push(["nameSpans(): a name wrapped over one line break is one span; over a blank line it is none", ws.length === 1 && wrap.slice(ws[0].index, ws[0].end) === "direction\nmanager" && !N.nameSpans("the direction\n\nmanager confirmed it").length, js(ws)]);
    const lib = require(sk("plan/scripts/lib.js"));
    const md = "# Plan\n\n## 1. Notes\n\nThe build is green. The code reviewer\nchecked it; the order was user-decided. It ships.\n";
    const ex = lib.sectionOf(md, "1-notes"), wantEx = "The build is green. …; … It ships.";
    c.push(["sectionOf(): the wider spans elided from an excerpt, the clause around each cut to \"…\" (a name with a space over a line break, a form with a hyphen)", !!ex && ex.paragraph === wantEx, js(ex && ex.paragraph)]);
    c.push(["a wait on the user, no name of the list, keeps its reading: a rendered fenced block left out of it, a text's found", !N.waitRefs("<pre><code>waiting on the user</code></pre>").length && N.waitRefs("waiting on the user").length === 1, js(N.waitRefs("<pre><code>waiting on the user</code></pre>"))]);
    const sc = [["accepted by the direction manager", "accepted"], ["The direction manager's hook stands.", "The hook stands."], ["a code reviewer pass", "a code check pass"]].filter(([s, w]) => { const r = N.scrubNames(s); return r.text !== w || r.left.length; });
    c.push(["scrubNames(): the direction manager's agent phrase dropped, its possessive the article; a role's work with a space reworded as with a hyphen", !sc.length, js(sc.map(([s, w]) => [s, N.scrubNames(s), w]))]);
    /* a wording to say instead: the live list carries none yet, so every find is reworded by the board's own wordings; a list that
       carries the column has a find written as its wording first */
    const none = require(path.join(T, "match.js")).finds("the archivist kept the recorded grade").filter(f => f.sayInstead !== null);
    c.push(["the live list carries no wording to say instead: every find's sayInstead is null, and the board's own wordings serve", !none.length, js(none)]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "internal-names-say-")), live = path.dirname(L.file);
    try {
      fs.writeFileSync(path.join(dir, "internal-names.md"), withColumn(fs.readFileSync(L.file, "utf8"), { Archivist: "record keeper", "the recorded grade": "the sizing on record" }));
      fs.copyFileSync(path.join(live, "finding.md"), path.join(dir, "finding.md"));
      const Lx = lists.load({ dirs: { nomenclature: dir } }), LR = require(sk("system/scripts/levelrefs.js"));
      const arch = Lx.internalNames.roles.find(r => r.name === "Archivist"), rec = Lx.internalNames.grades.find(r => r.term === "the recorded grade");
      c.push(["a list with the column is read: the wording on its row, null on the rest", !!arch && arch.sayInstead === "record keeper" && !!rec && rec.sayInstead === "the sizing on record" && Lx.internalNames.roles.filter(r => r.sayInstead).length === 1, js([arch, rec])]);
      const n = N.scrubNames("The archivist kept it.", { loaded: Lx }), g = LR.scrubLevels("Keep the recorded grade as it is.", { loaded: Lx });
      c.push(["scrubNames() and scrubLevels() write a find's wording to say instead first, the case of its first letter kept", n.text === "The record keeper kept it." && !n.left.length && g === "Keep the sizing on record as it is.", js([n, g])]);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  /* every form of the size word is barred, as the list's §3 lists it; the boards' scrub (levelrefs.js) finds each form the list names,
     its terms and the forms quoted beside them, as the tool reads them */
  guard("§3's grades: every form of a grade the list names is found by the boards' scrub (levelrefs.js)", c => {
    if (!L) { c.push(["the list is read", false, readError]); return; }
    const forms = [...new Set(L.grades.filter(r => r.strength === "never").flatMap(r => r.words))];
    const LR = require(sk("system/scripts/levelrefs.js")), missed = forms.filter(f => !LR.levelRefs(f).length);
    c.push([forms.length ? `every form of a grade §3 names is found (${forms.length}: ${forms.join(", ")})` : "§3 names no grade yet: nothing to hold", !missed.length, js(missed)]);
  });

  /* §4's markers (finding.md, "A technical sense by its marker"): a word the table names is no find with one of its markers directly before
     it (a space or a hyphen between, any case, its possessive, a code mark at the join), joined to it after by a hyphen, or, for a marker
     after, directly after it with a space or a line break; it is one with the marker elsewhere (after it with a space where it is no marker
     after, or a clause away); a word the table reads in code form is no find in code, and one in prose beside code. The boards' scripts (namerefs.js, levelrefs.js) find as the tool finds, row by row of the live table. */
  guard("§4's markers: a word in its technical sense no find, the same word elsewhere a find; the boards' scripts as the tool", c => {
    if (!L) { c.push(["the list is read", false, readError]); return; }
    const ms = L.markers || [], LR = require(sk("system/scripts/levelrefs.js")), F = require(path.join(T, "match.js"));
    c.push(["the markers' table is read: each row a word with its markers (before, after or both) and its code-form cell", ms.length > 0 && ms.every(m => m.word && (m.markers.length || (m.after || []).length) && Array.isArray(m.after) && typeof m.codeForm === "boolean"), js(ms.map(m => [m.word, m.markers, m.after, m.codeForm]))]);
    const isGrade = w => L.grades.some(r => r.words.some(x => x.toLowerCase() === w.toLowerCase())), bad = [];
    /* a marker that stands only after its word: those of the live table */
    const afterOnly = m => (m.after || []).filter(a => !m.markers.some(k => k.toLowerCase() === a.toLowerCase()));
    ms.forEach(m => {
      const w = m.word, g = isGrade(w), tool = t => (g ? F.gradeRefs(t) : F.nameRefs(t)).length > 0;
      /* the board's finds: levelRefs() for a grade's word; nameRefs() and nameSpans() for a name, which must agree */
      const board = t => g ? LR.levelRefs(t).length > 0 : (N.nameRefs(t).length > 0 && N.nameSpans(t).length > 0 ? true : N.nameRefs(t).length || N.nameSpans(t).length ? "disagree" : false);
      const probes = [[`runs on a \`${w}\``, !m.codeForm], ["```\nval " + w + " = x()\n```", !m.codeForm], [`the ${w} beside \`x()\``, true], [`the ${w} stops`, true]];
      /* a marker after (the row's "after" cell) clears the word directly after it too, with a space or a line break between, any case; no
         marker clears it with another word between, and a longer word is no marker ("publisher keys") */
      m.markers.forEach(k => { const after = (m.after || []).some(a => a.toLowerCase() === k.toLowerCase());
        probes.push([`the ${k} ${w}`, false], [`the ${k}-${w}`, false], [`the ${k.toUpperCase()} ${w}`, false], [`the ${k}'s ${w}`, false], [`the \`${k}\` ${w}`, false],
          [`the ${w}-${k}`, false], [`the ${k}, then the ${w}`, true], [`the ${w} ${k}`, !after], [`the ${w} and the ${k}`, true]);
        if (after) probes.push([`the ${w}\n${k}`, false], [`the ${w} ${k.toUpperCase()}`, false], [`the ${w} ${k}s`, true]); });
      /* a marker after only (no marker before): no find directly after the word, with a space, a line break or a hyphen between, any case,
         its possessive; a find where it stands before the word, joined before it by a hyphen, a word away, or as a longer word */
      afterOnly(m).forEach(k => probes.push([`the ${w} ${k}`, false], [`the ${w}\n${k}`, false], [`the ${w}-${k}`, false], [`the ${w} ${k.toUpperCase()}`, false],
        [`the ${w} ${k}'s plan`, false], [`the ${k} ${w}`, true], [`the ${k}-${w}`, true], [`the ${w} and ${k}`, true], [`the ${w} ${k}s`, true], [`the ${k}, then the ${w}`, true]));
      probes.forEach(([t, want]) => { const b = board(t), o = tool(t); if (b !== want || o !== want) bad.push(`"${t}": want ${want ? "a find" : "none"}, board ${b}, tool ${o}`); });
    });
    const nAfter = ms.reduce((n, m) => n + afterOnly(m).length, 0);
    c.push([`every marker of every row (${ms.reduce((n, m) => n + m.markers.length, 0)} before, ${nAfter} after only): no find before, joined or after as the row says, a find elsewhere; the code-form cell held in a backtick span and a fenced block; the boards' scripts and the tool agree`, !bad.length, js(bad.slice(0, 8))]);
    /* the rewording (scrubNames()) leaves a word in its technical sense as written, and rewords the same word where it is a find */
    const names = ms.filter(m => !isGrade(m.word)), keep = [];
    names.forEach(m => [...m.markers.map(k => `the ${k} ${m.word}`), ...(m.after || []).map(k => `the ${m.word} ${k}`)].forEach(t => { const r = N.scrubNames(t); if (r.text !== t || r.left.length) keep.push([t, r]); }));
    const pr = N.scrubNames("the planner re-pass"), bpr = N.scrubNames("the build planner re-pass");
    c.push(["scrubNames(): every marked name of the table left as written; \"the planner re-pass\" reworded, \"the build planner re-pass\" left", !keep.length && pr.text === "the plan re-pass" && bpr.text === "the build planner re-pass" && !bpr.left.length, js({ keep, pr, bpr })]);
    /* a quote elides a find where it stands (levelrefs.js levelSpans(), elideSpans(); namerefs.js nameSpans()), never the same letters
       elsewhere in their technical sense */
    const nt = "the executor stops; the dispatch executor drains it", gt = "grade 3 work over the carrier-grade link";
    const ne = LR.elideSpans(nt, N.nameSpans(nt)), ge = LR.elideSpans(gt, LR.levelSpans(gt));
    c.push(["a quote's elision cuts each find where it stands, and leaves the same word in its technical sense", ne === "the … stops; the dispatch executor drains it" && ge === "… work over the carrier-grade link", js([ne, ge])]);
  });

  guard("namerefs.js's header points at the list, the baseline and the finding tool", c => {
    const head = fs.readFileSync(NR, "utf8").split(/"use strict";/)[0];
    c.push(["the header names nomenclature/internal-names.md, nomenclature/finding.md and the tool's folder, tools/finding/", /nomenclature\/internal-names\.md/.test(head) && /nomenclature\/finding\.md/.test(head) && /tools\/finding\//.test(head), head.slice(0, 400)]);
  });
  return groups;
};

if (require.main === module) {
  /* a private scratch of its own (verify/scratch.js): out/, the temp root and the stand-in team state, removed at exit unless kept */
  const SCR = require("./scratch.js").open("cases-internal-names");
  /* no live GitHub, no machine cache: the private repositories from the fixture list (system/scripts/privaterefs.js) */
  process.env.DASHBOARDS_VERIFY = "1"; process.env.DASHBOARDS_PRIVATES = process.env.DASHBOARDS_PRIVATES || path.join(__dirname, "fixtures", "private-repositories.json");
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  let fails = 0;
  module.exports({ sk, out: SCR.out, targets: [] }).forEach(([title, cases]) => { const bad = cases.filter(x => !x[1]); fails += bad.length;
    console.log(`${bad.length ? "FAILED  " : "checked "} ${title}: ${cases.length - bad.length}/${cases.length} cases`); bad.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(fails ? 1 : 0);
}
