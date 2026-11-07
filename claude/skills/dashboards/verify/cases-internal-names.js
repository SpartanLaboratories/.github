// The cases of the internal-names list's one home (the user's decision of 2026-11-07): ~/.claude/nomenclature/internal-names.md holds the
// names, phrases and words committed content never contains; system/scripts/namerefs.js keeps its copy for the scan. Run by
// verify-templates.js (it passes its helpers in), or on its own with no browser: node verify/cases-internal-names.js [--list <file>].
// The list's §1 table (the agents, sessions and roles, reshaped by the user's decision of 2026-11-07) has four columns, Name, Aliases, What it
// is, Allowed when: the Name is the row's heading, a CamelCase proper noun (AdminTeam, PlanWriter, QA) that is not scanned, and the Aliases
// are the forms the scan bars (version-control-manager and executor for VersionControlManager), each in bold. §2 to §4 keep their Term column.
// 1. Parity, in the style of cases-board-wording.js's passnames parity: the aliases of the list's §1 table and namerefs.js's
//    barred names (UNAMBIGUOUS, CONTEXTUAL, VERB_ONLY, AGENT_ONLY) hold the same names, a hyphen and a space read alike; each at the strength
//    its row allows: "never" a name no library uses (UNAMBIGUOUS, matched wherever it stands), a library's name that only coincides any
//    strength (CONTEXTUAL or VERB_ONLY where a library uses the word; UNAMBIGUOUS where the form is the pipeline's alone, as
//    version-control-manager), "barred as an agent's name only" AGENT_ONLY (qa). The §2 table (the approval flow) and APPROVAL_FLOW hold
//    the same phrases.
// 2. Each name and phrase found as its strength says, and §4's allowed words found nowhere: "the direction manager" with a space as well.
// 3. The parity fails where they differ: a row added to the list's table and an alias added to a row (each written into the list's text in
//    its four-column shape and read back), a name dropped from the script, a "never" name made contextual, a phrase added to the list.
// 4. namerefs.js's header points at the list and no longer repeats it.
// The list is read beside the skill (../../nomenclature/internal-names.md, as in ~/.claude and the .github mirror's claude/), else from
// ~/.claude/nomenclature/. Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* The list's sections: §1's rows ({ name, names, what, allowed }: the heading Name, not scanned, and its Aliases, the barred forms), §2's
   phrases, §4's rows (the text of each). A table's header row (Name in §1, Term in §2 to §4) is skipped. */
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
    allowed: rows(section(4)).map(cells => cells.join(" · "))
  };
}
/* a name's key: lower case, a hyphen and a space alike; a script entry's regex form ("admin[- ]teams?") read as the name */
const key = s => String(s).toLowerCase().replace(/\[- \]/g, "-").replace(/s\?$/, "").replace(/[\s-]+/g, "-").replace(/['’]/g, "'");
/* the script's barred names by strength */
function scriptNames(N) {
  const out = [];
  [["unambiguous", N.UNAMBIGUOUS], ["contextual", N.CONTEXTUAL], ["verb-only", N.VERB_ONLY], ["agent-only", N.AGENT_ONLY]].forEach(([strength, list]) =>
    (list || []).forEach(src => out.push({ key: key(src), src, strength })));
  return out;
}
/* the strengths a row of §1 allows */
const strengthsFor = row => /agent's name only/i.test(`${row.what} ${row.allowed}`) ? ["agent-only"]
  : /^never\.?$/i.test(row.allowed.trim()) ? ["unambiguous"] : ["unambiguous", "contextual", "verb-only"];
/* Every difference between the list and the script: [] when they agree. */
function parity(list, N) {
  const diffs = [], S = scriptNames(N), seen = new Map();
  S.forEach(s => { if (seen.has(s.key)) diffs.push(`namerefs.js holds ${s.src} twice (${seen.get(s.key).strength}, ${s.strength})`); seen.set(s.key, s); });
  const listed = new Map();
  list.roles.forEach(row => row.names.forEach(n => listed.set(key(n), { name: n, row })));
  listed.forEach(({ name, row }, k) => {
    const s = seen.get(k);
    if (!s) diffs.push(`the list's §1 names "${name}", namerefs.js does not bar it`);
    else if (!strengthsFor(row).includes(s.strength)) diffs.push(`"${name}" is ${s.strength} in namerefs.js, its row allows ${strengthsFor(row).join(" or ")} ("${row.allowed}")`);
  });
  S.forEach(s => { if (!listed.has(s.key)) diffs.push(`namerefs.js bars ${s.src}, the list's §1 does not name it`); });
  const a = new Map(list.approval.map(p => [key(p), p])), b = new Map((N.APPROVAL_FLOW || []).map(p => [key(p), p]));
  a.forEach((p, k) => { if (!b.has(k)) diffs.push(`the list's §2 names "${p}", namerefs.js APPROVAL_FLOW does not`); });
  b.forEach((p, k) => { if (!a.has(k)) diffs.push(`namerefs.js APPROVAL_FLOW holds "${p}", the list's §2 does not`); });
  return diffs;
}
/* Every name found as its strength says: [] when each is. */
function behaviour(list, N) {
  const bad = [], S = new Map(scriptNames(N).map(s => [s.key, s]));
  const hit = t => N.nameRefs(t).length > 0;
  list.roles.forEach(row => row.names.forEach(name => {
    const s = S.get(key(name)); if (!s) return;
    const spaced = name.replace(/-/g, " "), Cap = name[0].toUpperCase() + name.slice(1).replace(/-(\w)/g, (m, x) => x.toUpperCase());
    const probes = s.strength === "unambiguous" ? [[`the ${name} confirmed it`, true], [name, true], [`by the ${name}`, true], [`\`${Cap}\``, false]]
      : s.strength === "contextual" ? [[`the ${name}`, true], [`by the ${name}`, true], [`the ${name}'s re-pass`, true], [`\`${Cap}\``, false], [`Route${Cap}`, false]]
      : s.strength === "verb-only" ? [[`the ${name} committed`, true], [`the dispatcher and the ${name}`, false], [`a \`${Cap}\``, false]]
      : [[`${name} found two gaps`, true], [`raised by ${name}`, true], [`the ${name} step`, false], ["Quality Review 2 · approved", false], [`from ${name} pass 2`, false]];
    if (s.strength === "unambiguous" && spaced !== name) probes.push([`the ${spaced} confirmed it`, /^(admin|direction)-/.test(name)]);
    probes.forEach(([t, want]) => { if (hit(t) !== want) bad.push(`${s.strength} "${name}": "${t}" ${want ? "not found" : "found"} (${JSON.stringify(N.nameRefs(t))})`); });
    if (s.strength === "unambiguous" && !N.nameRefs(`the ${name} confirmed it`).every(h => N.unambiguous(h))) bad.push(`"${name}" found, but not as a name no library uses (unambiguous())`);
  }));
  list.approval.forEach(p => { const h = N.nameRefs(p); if (!h.length || !h.every(x => N.unambiguous(x))) bad.push(`the approval flow's "${p}" ${h.length ? "not unambiguous()" : "not found"} (${JSON.stringify(h)})`); });
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
    const camel = L.roles.filter(r => !/^[A-Z][A-Za-z]*$/.test(r.name) || r.names.some(n => n === r.name && /[A-Z]/.test(n)));
    c.push(["§1's Name is the row's CamelCase heading and never read as a barred name; the aliases are", !camel.length && !L.roles.some(r => /^name$/i.test(r.name)), js(camel)]);
    const vcm = L.roles.find(r => r.name === "VersionControlManager");
    c.push(["VersionControlManager's two aliases read: version-control-manager and executor", !!vcm && js(vcm.names) === js(["version-control-manager", "executor"]), js(vcm)]);
    const d = parity(L, N);
    c.push(["§1's names are namerefs.js's barred names, each at the strength its row allows; §2's phrases its APPROVAL_FLOW", !d.length, js(d)]);
    const qa = scriptNames(N).find(s => s.key === "qa"), dm = scriptNames(N).find(s => s.key === "direction-manager");
    c.push(["qa barred as an agent's name only; direction-manager a name no library uses", !!qa && qa.strength === "agent-only" && !!dm && dm.strength === "unambiguous", js([qa, dm])]);
  });

  guard("each name found as its strength says, the approval flow's phrases found, §4's allowed words found nowhere", c => {
    if (!L) { c.push(["the list is read", false, `not found: ${js(candidates)}`]); return; }
    const b = behaviour(L, N);
    c.push(["every §1 name and §2 phrase found as its strength says; every §4 row names nothing", !b.length, js(b)]);
    const dm = [["the direction manager confirmed it", true], ["the direction-manager reported", true], ["direction managers", true], ["the `DirectionManager` turns", false], ["a DirectionManager", false]].filter(([t, w]) => (N.nameRefs(t).length > 0) !== w);
    c.push(["\"the direction manager\" with a space found as well as the hyphen; `DirectionManager` in code and as one word left alone", !dm.length, js(dm)]);
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
    const less = Object.assign({}, N, { UNAMBIGUOUS: N.UNAMBIGUOUS.filter(s => key(s) !== "direction-manager") });
    const ctx = Object.assign({}, N, { UNAMBIGUOUS: N.UNAMBIGUOUS.filter(s => key(s) !== "rookie-dev"), CONTEXTUAL: [...N.CONTEXTUAL, "rookie-devs?"] });
    const qa = Object.assign({}, N, { AGENT_ONLY: [], UNAMBIGUOUS: [...N.UNAMBIGUOUS, "qa"] });
    const phrase = copy(L); phrase.approval.push("the user signed off");
    const addedD = parity(added, N);
    c.push(["a row added in the four-column shape is read by its alias, its Name not scanned", addedD.some(x => /"release-captain"/.test(x)) && !addedD.some(x => /ReleaseCaptain/.test(x)), js(addedD)]);
    const probes = [["a row added to the list", addedD, /release-captain/], ["an alias added to a row", parity(alias, N), /"vc-manager"/], ["direction-manager dropped from the script", parity(L, less), /direction-manager/],
      ["a \"never\" name made contextual", parity(L, ctx), /rookie-dev.*contextual/], ["qa barred wherever it stands", parity(L, qa), /qa.*unambiguous/], ["a phrase added to the list", parity(phrase, N), /signed off/]];
    const wrong = probes.filter(([, d, re]) => !d.some(x => re.test(x)));
    c.push(["each difference named: a row added, an alias added, a name dropped, a strength changed, qa beyond an agent's name, a phrase added", !wrong.length, js(wrong.map(([w, d]) => [w, d]))]);
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
