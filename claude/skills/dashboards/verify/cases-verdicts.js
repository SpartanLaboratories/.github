// The cases of the verdicts at plan acceptance (plan/RULES.md §4, "The verdicts at plan acceptance"), run by verify-templates.js (it passes
// its helpers in), or on its own with no browser: node verify/cases-verdicts.js [--out <dir>].
// 1. lib.js verdictEntry(): an entry shaped as the board stores it; each way an entry cannot be written; a reference whose anchor names no heading
//    written with a note.
// 2. apply-event.js plan-accepted on a board whose Considered column is not yet written: every row's verdict and options from the facts, the
//    milestones, the summary's verdicts line with nothing left; the stage's end that follows applies at once, the board building. The same board
//    with no facts.verdicts: every row left to the fill, and the stage's end fails the check as before.
// 3. Some rows left: a row with no entry, an entry that cannot be written, an entry for no row, a reference whose anchor names no heading;
//    the rest written, no milestone, the check passing.
// 4. A sub-issue whose rows hold their options: the statements written, the options kept, an option the plan adds named for the fill.
// 5. Written once: a row holding its statements keeps them; the same event raised again is a duplicate; facts.verdicts on another event unread.
// 6. A text from the facts reworded or left out as any fact's; a signature naming a sizing fails its row.
// 7. Never a failed event: a board whose check fails whatever the verdicts gets every file back, the event applied again without them.
// 8. A tracking board's unit rows take their verdicts the same way.
// 9. fill.js: a fill that enriches leaves the statements alone; one that replaces them is named in its notes.
// Each group returns [title, cases], a case [name, ok, detail]. The boards it lays are kept under <out>/verdicts/.
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");

module.exports = function casesVerdicts(X) {
  const { sk, out, targets } = X;
  const lib = require(sk("plan/scripts/lib.js"));
  const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"), js = x => JSON.stringify(x), copy = x => JSON.parse(JSON.stringify(x));
  const wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
  const tp = name => ((targets || []).find(t => t.name === name) || {}).path || sk(name);
  const PB = rd(tp("plan/template/dashboard.html"));
  const APPLY = sk("plan/scripts/apply-event.js"), EMBED = sk("plan/scripts/embed.js"), CHECK = sk("plan/scripts/check.js"), FILL = sk("plan/scripts/fill.js");
  const sc = path.join(out, "verdicts"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const env = { ...process.env, DASHBOARDS_NO_BROWSER: "1", DASHBOARDS_NO_WATCHER: "1", DASHBOARDS_ADMIN_STATE: path.join(sc, "no-state.json") };
  const run = (f, a) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", env });
  const parse = a => { try { return JSON.parse(a.stdout); } catch (e) { return { parseError: (a.stdout || a.stderr || "").slice(0, 300) }; } };
  const EXD = "plan/examples/38-handshake-empty-name", EX = JSON.parse(rd(sk(EXD + "/plan.json"))), TRK = JSON.parse(rd(sk("verify/fixtures/tracking.plan.json")));
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const STEPS = ["sizing", "research", "plan", "branch", "implementation", "qa", "remediation", "document", "landing", "merge", "landed"];
  const T0 = "2026-11-15T10:00:00Z", T1 = "2026-11-15T10:10:00Z", T2 = "2026-11-15T10:20:00Z", T3 = "2026-11-15T10:30:00Z", T4 = "2026-11-15T10:40:00Z", T5 = "2026-11-15T10:50:00Z";
  /* a board in flight from the example, at sizing: its rows hold their gap, no verdict; their options kept where o.options (a sub-issue's,
     from its parent's documents), else none (a board whose Considered column is written at the plan's acceptance) */
  const flight = o => { o = o || {}; const x = copy(EX); Object.assign(x, { status: "planned", asBuilt: null });
    x.rows.forEach(r => { r.asBuilt = { state: "pending" }; delete r.verdict; if (!o.options) r.options = []; });
    x.milestones = x.milestones.filter(m => m.column === "gap" || (o.options && m.column === "considered")); if (x.impact) x.impact.basis = "plan";
    if (o.sub) x.parent = { issue: 36 }; else delete x.parent;
    x.wip = { questions: [], research: null, open: [], qa: [], plan: null, waitingOn: null, resume: null, steps: STEPS.slice(), step: "sizing", since: null, updated: "2026-11-15T09:00:00Z", current: [], detail: "", event: null };
    if (o.foundation) x.foundation = { at: T0, function: x.function };
    return x; };
  const lay = (name, plan) => { const root = path.join(sc, name), dir = path.join(root, ...plan.folder.split("/"));
    fs.readdirSync(sk(EXD)).filter(f => /\.md$/.test(f) || f === "research").forEach(f => fs.cpSync(sk(EXD + "/" + f), path.join(dir, f), { recursive: true }));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true }); wr(path.join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB);
    const e = run(EMBED, [dir]); if (e.status !== 0) throw new Error("embed: " + (e.stdout + e.stderr).slice(-300)); return { root, dir, plan }; };
  let nreq = 0;
  const req = (B, ev, facts) => wr(path.join(sc, `req-${++nreq}.json`), js({ v: 1, action: "plan-board", github: B.plan.repo, issue: B.plan.issue, event: ev, folder: B.plan.folder, facts: facts || {} }));
  const board = B => JSON.parse(rd(path.join(B.dir, "plan.json")));
  const apply = (B, ev, facts, at) => { const a = run(APPLY, ["--event", req(B, ev, facts), "--worktree", B.root, "--no-gh", "--no-live", "--at", at, "--json"]); return { a, S: parse(a), p: board(B) }; };
  const text = (B, ev, facts, at) => run(APPLY, ["--event", req(B, ev, facts), "--worktree", B.root, "--no-gh", "--no-live", "--at", at]).stdout || "";
  const checkOk = B => { const k = run(CHECK, [B.dir]); return { ok: k.status === 0, out: (k.stdout + k.stderr).split(/\r?\n/).filter(l => /^(FAIL|warn)/.test(l)).slice(0, 6).join(" | ") }; };
  /* the run's verdicts, as the example's rows hold them: statements without their excerpts, options in the facts' fields */
  const OPT_KEYS = ["id", "name", "verdict", "why", "chosen", "summary", "wins", "signature", "link"];
  const entryOf = (r, withOptions) => ({ row: r.id, kind: r.verdict.kind, ...(r.verdict.list ? { list: r.verdict.list } : {}),
    statements: r.verdict.statements.map(s => ({ text: s.text, ref: s.ref })),
    ...(withOptions ? { options: r.options.map(o => Object.fromEntries(Object.entries(o).filter(([k]) => OPT_KEYS.includes(k)))) } : {}) });
  const ALL = withOptions => EX.rows.map(r => entryOf(r, withOptions));
  /* the board to the plan's acceptance: sized at research, the research verified */
  const toPlan = B => { apply(B, "sized", { step: "research" }, T0); apply(B, "researched", {}, T1); };
  const stages = { branch: "fix/handshake", stages: [{ id: "A", name: "The parse" }, { id: "B", name: "The routing" }] };
  const stageEnd = { stage: "A", detail: "The parse is in.", stages: [{ id: "A", name: "The parse", state: "done", rows: ["validity-rule"] }, { id: "B", name: "The routing", state: "current", rows: ["routing"] }] };
  const row = (p, id) => (p.rows || []).find(r => r.id === id) || {};
  const pairs = ss => js((ss || []).map(s => [s.text, s.ref]));

  /* ---------- 1. lib.js ---------- */
  guard("lib.js verdictEntry(): an entry held to what the check asks and shaped as the board stores it (plan/RULES.md §4, \"The verdicts at plan acceptance\")", c => {
    const dir = sk(EXD), keep = t => t.replace(/\s+/g, " ").trim(), r0 = EX.rows[0];
    const E = lib.verdictEntry(entryOf(r0, true), dir, keep);
    c.push(["a whole entry: its kind, statements and options as the board stores them", !E.why && E.verdict.kind === r0.verdict.kind && pairs(E.verdict.statements) === pairs(r0.verdict.statements) && E.options.length === r0.options.length && E.options.every((o, i) => o.id === r0.options[i].id && o.verdict === r0.options[i].verdict), js(E.why || E.verdict)]);
    c.push(["statements only: options null", lib.verdictEntry(entryOf(r0, false), dir, keep).options === null, ""]);
    const base = { row: "x", kind: "build", statements: [{ text: "One decision.", ref: "plan.md#5-design" }] };
    const opts = [{ name: "The `sealed` outcome", verdict: "accepted" }, { name: "Keep it", verdict: "declined", why: "It throws." }];
    const D = lib.verdictEntry({ ...base, options: opts }, dir, keep);
    c.push(["an option's id is derived from its name where it is left out", !D.why && js(D.options.map(o => o.id)) === js(["the-sealed-outcome", "keep-it"]), js(D.why || D.options)]);
    const bad = [
      ["a kind that is neither build nor leave", { ...base, kind: "maybe" }, /kind is build or leave/],
      ["no statement", { ...base, statements: [] }, /no statement/],
      ["a statement with no text", { ...base, statements: [{ text: " ", ref: "plan.md#5-design" }] }, /has no text/],
      ["a reference that is no Markdown section", { ...base, statements: [{ text: "A.", ref: "plan.md" }] }, /not a relative link/],
      ["a reference to a file that is not there", { ...base, statements: [{ text: "A.", ref: "plan-gone.md#x" }] }, /not there/],
      ["a list that is neither bullets nor numbered", { ...base, list: "ordered" }, /list is numbered/],
      ["no option accepted", { ...base, options: [{ name: "A", verdict: "declined", why: "No." }] }, /exactly one option/],
      ["two options accepted", { ...base, options: [{ name: "A", verdict: "accepted" }, { name: "B", verdict: "accepted" }] }, /exactly one option/],
      ["a declined option with no why", { ...base, options: [{ name: "A", verdict: "accepted" }, { name: "B", verdict: "declined" }] }, /needs why/],
      ["an option verdict not in the four", { ...base, options: [{ name: "A", verdict: "chosen" }] }, /verdict is one of/],
      ["an id given twice", { ...base, options: [{ id: "a", name: "A", verdict: "accepted" }, { id: "a", name: "B", verdict: "declined", why: "No." }] }, /given twice/],
      ["an id that is not kebab-case", { ...base, options: [{ id: "A_b", name: "A", verdict: "accepted" }] }, /not kebab-case/]];
    bad.forEach(([w, e, re]) => { const x = lib.verdictEntry(e, dir, keep); c.push([`cannot be written: ${w}`, !!x.why && re.test(x.why), js(x)]); });
    const Z = lib.verdictEntry(base, dir, () => null);
    c.push(["a text the rewording cannot write fails the entry", !!Z.why && /cannot be written/.test(Z.why), js(Z)]);
    const S = lib.verdictEntry({ ...base, options: [{ name: "A", verdict: "accepted", signature: "fun grade(): Grade" }] }, dir, keep, s => /grade/i.test(s) ? "names a sizing" : null);
    c.push(["a signature the caller refuses fails the entry", !!S.why && /signature names a sizing/.test(S.why), js(S)]);
    const N = lib.verdictEntry({ ...base, statements: [{ text: "A.", ref: "plan.md#no-such-heading" }] }, dir, keep);
    c.push(["a reference whose anchor names no heading is written, with a note", !N.why && N.notes.some(n => /no heading #no-such-heading/.test(n)), js(N)]);
  });

  /* ---------- 2. the whole column from the facts ---------- */
  guard("apply-event.js plan-accepted: every row's verdict and options from facts.verdicts, and the stage's end after it applying at once (p58)", c => {
    const B = lay("whole", flight()); toPlan(B);
    const pa = apply(B, "plan-accepted", { detail: "Accepted.", verdicts: ALL(true) }, T2), p = pa.p, V = pa.S.verdicts || {};
    c.push(["it applies, the board at its branch step", pa.a.status === 0 && p.wip.step === "branch", js([pa.S.error, pa.S.check, p.wip.step])]);
    c.push(["every row holds the statements the facts gave, in order", EX.rows.every(r => pairs(row(p, r.id).verdict && row(p, r.id).verdict.statements) === pairs(r.verdict.statements) && row(p, r.id).verdict.kind === r.verdict.kind), js(p.rows.map(r => [r.id, (r.verdict || {}).kind]))]);
    c.push(["every row holds its options", EX.rows.every(r => js(row(p, r.id).options.map(o => [o.id, o.verdict])) === js(r.options.map(o => [o.id, o.verdict]))), ""]);
    c.push(["the excerpts are copied at the same event", p.rows.every(r => r.verdict.statements.every(s => s.excerpt && s.excerpt.heading)), ""]);
    const ms = p.milestones.filter(m => ["considered", "verdict"].includes(m.column));
    c.push(["the considered and verdict milestones, dated by the event, referring to the plan", js(ms.map(m => [m.column, m.label, m.date, m.ref])) === js([["considered", "Options weighed", "2026-11-15", "plan.md"], ["verdict", "Plan accepted", "2026-11-15", "plan.md"]]), js(ms)]);
    c.push(["the summary: every row written, options on every row, nothing left", V.sent === true && V.written.length === EX.rows.length && V.options.length === EX.rows.length && V.left.length === 0 && V.extra.length === 0, js(V)]);
    c.push(["facts.verdicts is read: not on the unread line", !(pa.S.unread || []).includes("verdicts"), js(pa.S.unread)]);
    c.push(["the fill is still asked for, for the rest of the columns and the consequences", pa.S.enrich === "yes" && /the rest of the Considered and Verdict columns/.test(js(pa.S.why)) && !/rows left to the fill/.test(js(pa.S.why)), js(pa.S.why)]);
    const bc = apply(B, "branch-cut", stages, T3), ie = apply(B, "implementation-stage", stageEnd, T4);
    c.push(["the stage's end after it applies at once, the board building, with no fill between", bc.a.status === 0 && ie.a.status === 0 && ie.p.status === "building", js([bc.S.error, ie.S.error, ie.S.check, ie.p.status])]);
    const B2 = lay("whole-text", flight()); toPlan(B2);
    const line = (text(B2, "plan-accepted", { detail: "Accepted.", verdicts: ALL(true) }, T2).match(/^verdicts: .*$/m) || [""])[0];
    c.push(["the summary's verdicts line in text", line === `verdicts: ${EX.rows.length} of ${EX.rows.length} rows written from the facts (options on ${EX.rows.length}); none left to the fill`, line]);
    const B3 = lay("none-sent", flight()); toPlan(B3);
    const pn = apply(B3, "plan-accepted", { detail: "Accepted." }, T2), Vn = pn.S.verdicts || {};
    c.push(["with no facts.verdicts: applied as before, every row left to the fill, no milestone", pn.a.status === 0 && Vn.sent === false && Vn.left.length === EX.rows.length && Vn.left.every(x => x.why === "no facts.verdicts") && !pn.p.milestones.some(m => m.column === "verdict") && /the Considered and Verdict columns, the verdict milestone/.test(js(pn.S.why)), js([pn.S.error, Vn])]);
    apply(B3, "branch-cut", stages, T3); const ie3 = apply(B3, "implementation-stage", stageEnd, T4);
    c.push(["and the stage's end still fails the check until a fill writes them, as before", ie3.a.status === 1 && /the verdict is required|options is empty/.test(ie3.S.check || ""), js([ie3.a.status, ie3.S.check])]);
  });

  /* ---------- 3. some rows left ---------- */
  guard("apply-event.js plan-accepted: a row's entry written whole or not at all, the rest left to the fill and named", c => {
    const B = lay("some-left", flight()); toPlan(B);
    const v = ALL(true), first = EX.rows[0].id, second = EX.rows[1].id, third = EX.rows[2].id;
    const facts = v.filter(e => e.row !== first).map(e => e.row === second ? { ...e, options: e.options.map(o => ({ ...o, verdict: o.verdict === "accepted" ? "declined" : o.verdict, why: o.why || "Not taken." })) } : e.row === third ? { ...e, statements: [{ text: "One decision on a heading that is not there.", ref: "plan.md#no-such-heading" }] } : e);
    facts.push({ row: "no-such-row", kind: "build", statements: [{ text: "A.", ref: "plan.md#5-design" }] });
    const pa = apply(B, "plan-accepted", { detail: "Accepted.", verdicts: facts }, T2), p = pa.p, V = pa.S.verdicts || {};
    c.push(["it applies", pa.a.status === 0, js([pa.S.error, pa.S.check])]);
    c.push(["a row with no entry is left, holding nothing", V.left.some(x => x.row === first && x.why === "no entry") && !lib.verdictWritten(row(p, first).verdict) && !row(p, first).options.length, js(V.left)]);
    c.push(["an entry that cannot be written is left whole, its reason named", V.left.some(x => x.row === second && /exactly one option/.test(x.why)) && !lib.verdictWritten(row(p, second).verdict) && !row(p, second).options.length, js(V.left)]);
    c.push(["an entry for no row is not written and is named", V.extra.some(x => x.row === "no-such-row") && !p.rows.some(r => r.id === "no-such-row"), js(V.extra)]);
    c.push(["a reference whose anchor names no heading is written, named for the fill", lib.verdictWritten(row(p, third).verdict) && /no heading #no-such-heading/.test(js(pa.S.why)), js(row(p, third).verdict)]);
    c.push(["the other rows are written", V.written.length === EX.rows.length - 2, js(V.written)]);
    c.push(["no verdict or considered milestone while a row lacks its verdict", !p.milestones.some(m => ["verdict", "considered"].includes(m.column)), js(p.milestones)]);
    c.push(["the fill is asked for the rows left, whole", /the rows left to the fill, whole: .*\b/.test(js(pa.S.why)) && js(pa.S.why).includes(first) && js(pa.S.why).includes(second), js(pa.S.why)]);
    c.push(["the board passes its check", checkOk(B).ok, checkOk(B).out]);
  });

  /* ---------- 4. a sub-issue whose rows hold their options ---------- */
  guard("apply-event.js plan-accepted on a sub-issue: the statements written, the options its parent's documents wrote kept", c => {
    const B = lay("sub", flight({ sub: true, options: true })); toPlan(B);
    const v = ALL(false), r0 = EX.rows[0];
    v[0] = { ...v[0], options: [...r0.options.map(o => ({ id: o.id, name: o.name, verdict: o.verdict, ...(o.why ? { why: o.why } : {}) })), { id: "added-option", name: "An option the plan adds", verdict: "declined", why: "Not needed." }] };
    const pa = apply(B, "plan-accepted", { detail: "Accepted.", verdicts: v }, T2), p = pa.p, V = pa.S.verdicts || {};
    c.push(["it applies, every row written", pa.a.status === 0 && V.written.length === EX.rows.length && V.left.length === 0, js([pa.S.error, V])]);
    c.push(["the options are kept as the parent's documents wrote them", js(row(p, r0.id).options.map(o => o.id)) === js(r0.options.map(o => o.id)) && V.options.length === 0, js(row(p, r0.id).options.map(o => o.id))]);
    c.push(["an option the plan adds is named for the fill", V.extra.some(x => x.row === r0.id && /added-option for the fill/.test(x.why)), js(V.extra)]);
    c.push(["the verdict milestone, and no considered one of its own", p.milestones.filter(m => m.column === "verdict").length === 1 && p.milestones.filter(m => m.column === "considered").length === 1 && p.milestones.find(m => m.column === "considered").label === EX.milestones.find(m => m.column === "considered").label, js(p.milestones)]);
  });

  /* ---------- 5. written once ---------- */
  guard("apply-event.js plan-accepted: written once; the same event again a duplicate; read at plan-accepted alone", c => {
    const B = lay("once", flight()); toPlan(B);
    const pa = apply(B, "plan-accepted", { detail: "Accepted.", verdicts: ALL(true) }, T2);
    const again = apply(B, "plan-accepted", { detail: "Accepted.", verdicts: ALL(true) }, T2);
    c.push(["the same event raised again is a duplicate", pa.a.status === 0 && again.S.result === "duplicate", js([again.S.result, again.S.error])]);
    const B2 = lay("once-held", flight()); toPlan(B2);
    const p0 = board(B2), r0 = p0.rows[0]; r0.verdict = { kind: "build", statements: [{ text: "A decision written before.", ref: "plan.md#5-design" }] }; r0.options = copy(EX.rows[0].options);
    wr(path.join(B2.dir, "plan.json"), JSON.stringify(p0, null, 2) + "\n"); run(EMBED, [B2.dir]);
    const pb = apply(B2, "plan-accepted", { detail: "Accepted.", verdicts: ALL(true) }, T2), V = pb.S.verdicts || {};
    c.push(["a row holding its statements keeps them; the entry that differs is named", pb.a.status === 0 && row(pb.p, r0.id).verdict.statements[0].text === "A decision written before." && V.kept.includes(r0.id) && V.extra.some(x => x.row === r0.id && /written already and the entry differs/.test(x.why)), js([pb.S.error, V.kept, V.extra])]);
    const B3 = lay("once-other", flight()); apply(B3, "sized", { step: "research" }, T0);
    const rs = apply(B3, "researched", { verdicts: ALL(true) }, T1);
    c.push(["facts.verdicts on another event is unread, nothing written from it", rs.a.status === 0 && (rs.S.unread || []).includes("verdicts") && !rs.p.rows.some(r => lib.verdictWritten(r.verdict)) && rs.S.verdicts == null, js([rs.S.unread, rs.S.verdicts])]);
  });

  /* ---------- 6. the rewording ---------- */
  guard("apply-event.js plan-accepted: a text from the facts reworded or left out as any fact's; a signature naming a sizing fails its row", c => {
    const B = lay("words", flight()); toPlan(B);
    const v = ALL(true), a = EX.rows[0].id, b = EX.rows[1].id;
    v[0] = { ...v[0], statements: [{ text: "A grade-3 change keeps the parse total, as qa pass 1 asked.", ref: "plan.md#5-design" }] };
    v[1] = { ...v[1], options: v[1].options.map((o, i) => i === 0 ? { ...o, signature: "fun grade(n: Int): Grade" } : o) };
    const pa = apply(B, "plan-accepted", { detail: "Accepted.", verdicts: v }, T2), V = pa.S.verdicts || {}, t = ((row(pa.p, a).verdict || {}).statements || [{}])[0].text || "";
    c.push(["it applies", pa.a.status === 0, js([pa.S.error, pa.S.check])]);
    c.push(["a sizing in a statement is reworded away, a qa pass named by its Quality Review", lib.verdictWritten(row(pa.p, a).verdict) && !/grade/i.test(t) && /Quality Review 1/.test(t), t]);
    c.push(["a signature naming a sizing fails its row, never written", V.left.some(x => x.row === b && /signature/.test(x.why)) && !lib.verdictWritten(row(pa.p, b).verdict), js(V.left)]);
  });

  /* ---------- 7. never a failed event ---------- */
  guard("apply-event.js plan-accepted: the verdicts never fail the event; a board failing whatever they say gets every file back", c => {
    const B = lay("fallback", flight({ foundation: true })); toPlan(B);
    const before = rd(path.join(B.dir, "plan.json")), html = rd(path.join(B.dir, "dashboard.html"));
    const pa = apply(B, "plan-accepted", { detail: "Accepted.", verdicts: ALL(true) }, T2);
    c.push(["the board fails its check whatever the verdicts: the event fails, applied again without them first", pa.a.status === 1 && /VERDICTS NOT WRITTEN/.test(js(pa.S.warnings)) && (pa.S.verdicts || {}).dropped && /FOUNDATION NOT FILLED/.test(pa.S.check || ""), js([pa.a.status, pa.S.check, pa.S.verdicts, pa.S.warnings])]);
    c.push(["every file is as it was", rd(path.join(B.dir, "plan.json")) === before && rd(path.join(B.dir, "dashboard.html")) === html, ""]);
  });

  /* ---------- 8. a tracking board ---------- */
  guard("apply-event.js plan-accepted on a tracking board: the unit rows take their verdicts the same way", c => {
    const T = copy(TRK), units = (T.rows || []).filter(r => r.unit);
    if (!units.length) { c.push(["the tracking fixture has unit rows", false, ""]); return; }
    Object.assign(T, { status: "planned", asBuilt: null }); T.milestones = (T.milestones || []).filter(m => ["gap", "considered"].includes(m.column));
    T.rows.forEach(r => { delete r.verdict; r.asBuilt = { state: "pending" }; if (r.unit) { delete r.unit.issue; delete r.unit.board; delete r.unit.live; delete r.unit.landing; } });
    T.wip = { questions: [], research: null, open: [], qa: [], plan: null, waitingOn: null, resume: null, steps: (T.wip && T.wip.steps) || ["sizing", "research", "architecture", "document", "landing", "merge", "sub-issues", "implementation", "landed"], step: "architecture", since: T0, updated: T0, current: ["considered"], detail: "", event: { name: "architecture-signed-off", at: T0 } };
    const root = path.join(sc, "tracking"), dir = path.join(root, ...T.folder.split("/"));
    fs.mkdirSync(path.join(root, ".git"), { recursive: true }); wr(path.join(dir, "architecture.md"), "# Architecture\n\n## 1. Units\n\nThe units, in landing order.\n"); wr(path.join(dir, "plan.json"), JSON.stringify(T, null, 2) + "\n"); wr(path.join(dir, "dashboard.html"), PB);
    const e = run(EMBED, [dir]); if (e.status !== 0) { c.push(["the tracking board is laid", false, (e.stdout + e.stderr).slice(-300)]); return; }
    const BT = { root, dir, plan: T }, v = T.rows.map(r => ({ row: r.id, kind: "build", statements: [{ text: `The unit ${r.name} is built in its own run.`, ref: "architecture.md#1-units" }] }));
    const pa = apply(BT, "plan-accepted", { detail: "Architecture final.", verdicts: v }, T2), V = pa.S.verdicts || {};
    const allOpts = T.rows.every(r => Array.isArray(r.options) && r.options.length);
    c.push(["it applies, every unit row's statements written from the facts", pa.a.status === 0 && V.written.length === T.rows.length && pa.p.rows.every(r => lib.verdictWritten(r.verdict)), js([pa.S.error, pa.S.check, V])]);
    c.push(["the verdict milestone \"Architecture final\" once every unit row holds options and a verdict", allOpts ? (pa.p.milestones.find(m => m.column === "verdict") || {}).label === "Architecture final" : !pa.p.milestones.some(m => m.column === "verdict"), js(pa.p.milestones)]);
  });

  /* ---------- 9. fill.js ---------- */
  guard("fill.js after plan-accepted: an enriching fill leaves the statements alone; one that replaces them is named", c => {
    const B = lay("fill", flight()); toPlan(B); apply(B, "plan-accepted", { detail: "Accepted.", verdicts: ALL(true) }, T2);
    const r0 = EX.rows[0], f1 = wr(path.join(sc, "fill-1.json"), js({ rows: [{ id: r0.id, verdict: { defense: r0.verdict.defense, steps: r0.verdict.steps, tests: r0.verdict.tests, risks: r0.verdict.risks } }] }));
    const a = run(FILL, [B.dir, "--fields", f1, "--json"]), p = board(B), S1 = parse(a);
    c.push(["the fill merges the defence and steps, the statements as the facts wrote them", a.status === 0 && row(p, r0.id).verdict.defense === r0.verdict.defense && pairs(row(p, r0.id).verdict.statements) === pairs(r0.verdict.statements) && !/verdict\.statements replaced/.test(js(S1)), js([a.status, (a.stdout || a.stderr).slice(0, 300)])]);
    const f2 = wr(path.join(sc, "fill-2.json"), js({ rows: [{ id: r0.id, verdict: { statements: [{ text: "Another reading of the plan.", ref: "plan.md#5-design" }] } }] }));
    const b = run(FILL, [B.dir, "--fields", f2, "--json"]);
    c.push(["a fill that replaces the statements is named in its notes", b.status === 0 && /verdict\.statements replaced/.test(b.stdout || ""), js([b.status, (b.stdout || b.stderr).slice(0, 400)])]);
  });
  return groups;
};

if (require.main === module) {
  const SKILL = path.resolve(__dirname, ".."), sk = p => path.join(SKILL, ...p.split("/"));
  const args = process.argv.slice(2), i = args.indexOf("--out"), out = path.resolve(i >= 0 && args[i + 1] ? args[i + 1] : path.join(os.tmpdir(), "dashboards-verify"));
  const targets = ["plan/template/dashboard.html", "plan/template/board.html"].map(name => ({ name, path: sk(name) }));
  /* run alone, the templates under test count as verified for the scripts the cases run, as verify-templates.js names them (deviation.js verified()) */
  const DV = require(sk("system/scripts/deviation.js"));
  process.env.DASHBOARDS_TEMPLATES_UNDER_TEST = JSON.stringify(["plan/template/dashboard.html", "plan/template/board.html", "plan/template/org-board.html"].map(t => DV.verified(sk(t)).hash));
  let bad = 0;
  module.exports({ sk, out, targets }).forEach(([what, cases]) => { const b = cases.filter(x => !x[1]); bad += b.length;
    console.log(`${b.length ? "FAILED " : "checked"}  ${what}: ${cases.length - b.length}/${cases.length} cases`); b.forEach(x => console.log(`  ${x[0]}: ${x[2]}`)); });
  process.exit(bad ? 1 : 0);
}
