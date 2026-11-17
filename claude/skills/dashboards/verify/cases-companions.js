// The cases of the boards' companions (GUIDANCE.md §13), run by verify-templates.js (it passes its helpers in), or on its own with no browser:
//   node verify/cases-companions.js [--out <dir>] [--fixture]
// The Whiteboards: the generated ids, the rules a text meets before it leaves a repository, the four generated parts read from git at a
// commit (never a working tree), the run in progress, the refresh's plan (only generated elements, stubs, place and size kept, if_version,
// board/meta merged, an idea harvested from a note still there not drawn), the batch check, the links list and the orphans. The ideas files:
// the writer (add, drop, harvest) and its refusals, the check, check.js on an ideas file. The Ideas Card (embed.js refreshIdeas(), check.js,
// fill.js) and the Ideas Panel (check.js on org-work-board/2). The publish step (publish.js). No Whiteboard or page is written: these
// scripts write none. With --fixture it rewrites verify/fixtures/companions/, the browser fixtures of the Ideas Card and the Ideas Panel.
// Each group returns [title, cases], a case [name, ok, detail].
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");

module.exports = function casesCompanions(X) {
  const { sk, out } = X;
  const rd = f => fs.readFileSync(f, "utf8"), wr = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; }, js = x => JSON.stringify(x, null, 2) + "\n";
  const run = (f, a, o) => cp.spawnSync(process.execPath, [f, ...a], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"], ...(o || {}) });
  const git = (dir, ...a) => cp.spawnSync("git", ["-C", dir, "-c", "user.name=verify", "-c", "user.email=verify@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...a], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const WB = sk("companions/scripts/whiteboard.js"), PUB = sk("companions/scripts/publish.js"), IDEAS = sk("plan/scripts/ideas.js"), CHECK = sk("plan/scripts/check.js");
  const W = require(sk("companions/scripts/wblib.js")), G = require(WB), I = require(IDEAS);
  const sc = path.join(out, "companions"); fs.rmSync(sc, { recursive: true, force: true }); fs.mkdirSync(sc, { recursive: true });
  const groups = [], guard = (title, fn) => { const c = []; try { fn(c); } catch (e) { c.push(["the cases run to the end", false, String(e.stack).split(/\r?\n/).slice(0, 3).join(" ")]); } groups.push([title, c]); };
  const parse = r => { try { return JSON.parse(r.stdout); } catch (e) { return { parseError: (r.stderr || r.stdout || "").slice(0, 300) }; } };

  /* GitHub stood in for: the organizations' repositories, one private */
  const ghStub = wr(path.join(sc, "gh-stub.js"), `const a=process.argv.slice(2);if(a[0]==="repo"&&a[1]==="list"){process.stdout.write(JSON.stringify([{nameWithOwner:a[2]+"/widgets",visibility:"PUBLIC"},{nameWithOwner:a[2]+"/secret-vault",visibility:"PRIVATE"}]));process.exit(0);}process.exit(1);`);
  const env = { ...process.env, DASHBOARDS_GH: ghStub, DASHBOARDS_NO_BROWSER: "1" };
  const cfgOwner = JSON.parse(rd(sk("plan/template/org-board.repositories.json"))).owner, PRIVATE = `${cfgOwner}/secret-vault`;

  /* ---------- A repository at a commit ---------- */
  const repo = path.join(sc, "widgets"); fs.mkdirSync(repo, { recursive: true });
  const reg = { repo: "acme/widgets", updated: "2026-11-17", systems: [
    { slug: "widgets", kind: "repo", parent: null, status: "built", name: "widgets", function: "A widget library.", paths: ["."], board: "index.html", dsl: "workspace.dsl" },
    { slug: "parser", kind: "system", parent: "widgets", status: "built", name: "parser", function: "Parses widget files.", paths: ["parser/"], dsl: "parser/workspace.dsl" },
    { slug: "render", kind: "supersystem", parent: "widgets", status: "built", name: "render", function: "Draws widgets.", dsl: "render/workspace.dsl" },
    { slug: "render-core", kind: "system", parent: "render", status: "built", name: "render-core", function: "Core drawing.", paths: ["render/"] },
    { slug: "render-gl", kind: "system", parent: "render", status: "planned", name: "render-gl", function: "A GPU path." },
    { slug: "legacy", kind: "system", parent: "widgets", status: "archived", name: "legacy", function: "Old code." }] };
  const dslRepo = `workspace "widgets" "The library." {
    !identifiers hierarchical
    model {
        dev = person "Developer" "Uses the library."
        hub = softwareSystem "Package hub" "Hosts releases." "External"
        repo = softwareSystem "widgets" "The library." {
            parser = container "parser" "Parses." "Kotlin"
            render = container "render" "Draws." "Kotlin"
        }
        dev -> repo.parser "Parses files with"
        repo.render -> repo.parser "Reads parsed widgets from"
        repo -> hub "Publishes to"
    }
    views {
        container repo "Containers" "The systems." {
            include *
        }
    }
}
`;
  const dslParser = `workspace "parser" "" {
    !identifiers hierarchical
    model {
        dev = person "Developer" "Uses it."
        repo = softwareSystem "widgets" "The library." {
            parser = container "parser" "Parses." "Kotlin" {
                reader = component "Reader" "Reads." "class" "Public"
                lexer = component "Lexer" "Lexes." "internal class" "Internal"
                cache = component "Cache" "A cache." "proposed" "Planned"
            }
            render = container "render" "Draws." "Kotlin"
        }
        dev -> repo.parser.reader "Calls"
        repo.parser.reader -> repo.parser.lexer "Uses"
        repo.parser.reader -> repo.parser.cache "Will use" "" "Planned"
        repo.render -> repo.parser.reader "Reads from"
        dev -> repo.render "Draws with"
    }
}
`;
  const dslRender = `workspace "render" "" {
    !identifiers hierarchical
    model {
        repo = softwareSystem "widgets" "The library." {
            render = container "render" "Draws." "Kotlin" {
                core = component "render-core" "Core." "" ""
                gl = component "render-gl" "GPU." "" "Planned"
            }
            parser = container "parser" "Parses." "Kotlin"
        }
        repo.render.core -> repo.parser "Reads parsed widgets"
        repo.render.gl -> repo.render.core "Draws through" "" "Planned"
    }
}
`;
  wr(path.join(repo, "docs/dashboards/systems.json"), js(reg));
  wr(path.join(repo, "docs/dashboards/workspace.dsl"), dslRepo);
  wr(path.join(repo, "docs/dashboards/parser/workspace.dsl"), dslParser);
  wr(path.join(repo, "docs/dashboards/render/workspace.dsl"), dslRender);
  wr(path.join(repo, "docs/plans/board.json"), js({ schema: "work-board/1", repo: "acme/widgets", rows: [{ issue: 5, title: "Parser rejects tabs", state: "OPEN", system: "parser", step: "plan" }, { issue: 3, title: "Parser cache", state: "CLOSED", system: "parser", step: "landed" }],
    unscheduled: [{ issue: 6, title: "Faster drawing", system: "render-core" }, { issue: 7, title: "A docs typo", system: null }, { issue: 8, title: `Share the lexer with ${PRIVATE}.`, system: "parser" }], roadmap: [] }));
  wr(path.join(repo, "docs/plans/3-parser-cache/plan.json"), js({ schema: "plan-board/1", repo: "acme/widgets", issue: 3, status: "built", systems: [{ slug: "parser", name: "parser" }], wip: { step: "landed" }, rows: [] }));
  wr(path.join(repo, "docs/plans/3-parser-cache/consequences.md"), [
    "# Parser cache: consequences", "", "## 5. Known gaps", "", "**Still open:**", "", "- **The cache is unbounded** in memory.", "- **An old gap**, closed by #4.", "",
    "## 6. Follow-ups", "", "**Closed, not triggered:**", "", "- **The old rule.** Not needed.", "", "**Open:**", "", "- **Tab handling.** Revisit with #5.",
    "- **A look by the code-reviewer at the lexer**, once it settles.", "- **A path at C:/Users/someone/cache**, kept for the record.", ""].join("\n"));
  wr(path.join(repo, "docs/plans/ideas.json"), js({ schema: "ideas/1", next: 3, ideas: [
    { id: 1, kind: "improvement", text: "Cache parsed widgets per file.", concerns: ["repo.parser.cache"], noted: "2026-11-17T00:00:00Z" },
    { id: 2, kind: "feature", text: "Draw with the GPU.", concerns: ["parser"], noted: "2026-11-17T00:10:00Z", source: { scope: "system:parser", element: "e7" } }] }));
  wr(path.join(repo, "parser/Reader.kt"), "class Reader\n"); wr(path.join(repo, "render/Core.kt"), "class Core\n");
  git(sc, "init", "-q", "-b", "main", repo); git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "fixture");
  const sha = (git(repo, "rev-parse", "--short=7", "HEAD").stdout || "").trim();
  /* the working tree changed after the commit: a generation at the commit never reads it */
  wr(path.join(repo, "docs/dashboards/systems.json"), js({ ...reg, systems: [...reg.systems, { slug: "ghost", kind: "system", parent: "widgets", status: "built", name: "ghost", function: "Only in the working tree." }] }));
  /* the runs in progress, each in its own folder as a worktree holds it */
  const runs = path.join(sc, "runs");
  const R9 = wr(path.join(runs, "9/plan.json"), js({ issue: 9, issueTitle: "Lexer speed", systems: [{ slug: "parser" }], status: "building", wip: { step: "implementation", updated: "2026-11-17T01:00:00Z", detail: "Stage S2 running." }, rows: [{ id: "r1", name: "Lexer loop", asBuilt: { state: "pending" } }] }));
  wr(path.join(runs, "10/plan.json"), js({ issue: 10, issueTitle: "GPU drawing", systems: [{ slug: "render-core" }], status: "planned", wip: { step: "research", updated: "2026-11-17T01:05:00Z" }, rows: [] }));
  wr(path.join(runs, "11/plan.json"), js({ issue: 11, issueTitle: "Landed", systems: [{ slug: "parser" }], status: "built", wip: { step: "landed" }, rows: [] }));
  wr(path.join(runs, "12/plan.json"), "{ not json");
  const gen = (scope, more) => { const r = run(WB, ["generate", "--root", repo, "--sha", "HEAD", "--scope", scope, "--branch", "main", ...(more || [])], { env }); return { r, g: parse(r) }; };
  const byId = (g, id) => (g.elements || []).find(e => e.id === id);
  const texts = g => (g.elements || []).map(e => e.data.text || e.data.label || "").filter(Boolean);

  guard("a generated element's id is the generator's own (GUIDANCE.md §13, \"A refresh writes only what it wrote\")", c => {
    const long = W.genId("el.repo.some.deeply.nested.container.component.name"), odd = W.genId("rel.el.a>el.b");
    c.push(["a short key is gen- and the key itself", W.genId("el.repo.parser") === "gen-el.repo.parser", W.genId("el.repo.parser")]);
    c.push(["a long or odd key keeps a head and a hash, within the type's 40 characters of its own set", long.length <= 40 && W.ID_RE.test(long) && /~[0-9a-f]{6}$/.test(long) && W.ID_RE.test(odd) && odd.length <= 40, `${long} ${odd}`]);
    c.push(["the same key gives the same id, and two keys sharing a head do not collide", W.genId("el.repo.some.deeply.nested.container.component.name") === long && W.genId("el.repo.some.deeply.nested.container.component.other") !== long, ""]);
    c.push(["isGenerated() knows a generated id from a user's", W.isGenerated("gen-x") && !W.isGenerated("e12"), ""]);
  });

  guard("what leaves a repository keeps the boards' rules (GUIDANCE.md §13, \"What leaves a repository\"; wblib.js textProblems(), cleanText())", c => {
    const P = new Set([PRIVATE]), probs = (t, ctx) => W.textProblems(t, ctx || {}).map(p => p.rule);
    c.push(["a clean text has no problem", !probs("Parses widget files and reads them in order.").length, ""]);
    c.push(["a machine-local path is found", probs("kept at C:/Users/someone/cache").includes("machine-local path") && probs("see /home/someone/x").includes("machine-local path"), ""]);
    c.push(["a credential is found, and a permission named token is not one", probs("token: abcdefghijklmnopqrstuvwx").includes("credential") && probs("ghp_abcdefghijklmnopqrstuvwxyz0123").includes("credential") && !probs("grants `pages: write` and `id-token: write`").length, ""]);
    c.push(["an address is found as personal data", probs("mail someone@example.com").some(r => /personal data/.test(r)), ""]);
    c.push(["a private claude.ai link is found", probs("see https://claude.ai/artifact/AbC123").includes("private link"), ""]);
    c.push(["a private repository is found, and cleanText() elides it", probs(`blocked by ${PRIVATE}#2`, { privates: P }).includes("private repository") && !/secret-vault/.test(W.cleanText(`blocked by ${PRIVATE}#2`, { privates: P }).text || "x secret-vault"), JSON.stringify(W.cleanText(`blocked by ${PRIVATE}#2`, { privates: P }))]);
    const n = W.cleanText("Accepted by the planner after the re-pass."); c.push(["an internal name is reworded where a safe rewording exists", !n.out && !/planner/i.test(n.text), JSON.stringify(n)]);
    const p = W.cleanText("kept at C:/Users/someone/cache"); c.push(["a text that would still break a rule is left out, its rule named", p.out && p.text === null && p.problems.some(x => x.rule === "machine-local path"), JSON.stringify(p)]);
  });

  guard("the system Whiteboard's generated part (whiteboard.js generate --scope system:<slug>)", c => {
    const { r, g } = gen("system:parser", ["--run", path.dirname(R9), "--run", path.join(runs, "10"), "--run", path.join(runs, "11"), "--run", path.join(runs, "12")]);
    c.push(["it exits 0 and writes the generated part", r.status === 0 && g.schema === "whiteboard-generated/1", `exit ${r.status} ${(r.stderr || "").slice(0, 300)} ${g.parseError || ""}`]);
    c.push(["its title is the repository and the system, its stamp as-is at the branch and the commit", g.title === "widgets · parser" && g.stamp === `as-is at main @ ${sha}` && /as-is at main @/.test((byId(g, "gen-stamp") || { data: {} }).data.text || ""), `${g.title} | ${g.stamp}`]);
    c.push(["every id is generated, unique and of the type's form", (g.elements || []).every(e => W.isGenerated(e.id) && W.ID_RE.test(e.id)) && new Set((g.elements || []).map(e => e.id)).size === (g.elements || []).length, ""]);
    const sec = byId(g, "gen-sys.parser"), reader = byId(g, "gen-el.repo.parser.reader"), cache = byId(g, "gen-el.repo.parser.cache");
    c.push(["the system is a section holding its parts from its own DSL, each blue", sec && sec.data.type === "container" && reader && reader.data.color === "blue" && reader.parent === "gen-sys.parser", JSON.stringify([sec && sec.data, reader && reader.data]).slice(0, 300)]);
    c.push(["a planned part is hollow, its text opening \"planned · \", never in a colour of its own", cache && cache.data.hollow === true && /^planned · Cache/.test(cache.data.text) && cache.data.color === "white", JSON.stringify(cache && cache.data)]);
    c.push(["its neighbours are white blocks: the person and the sibling container it works with", ["gen-el.dev", "gen-el.repo.render"].every(id => byId(g, id) && byId(g, id).data.color === "white"), ""]);
    const arrows = (g.elements || []).filter(e => e.data.type === "arrow"), pair = (a, b) => arrows.find(x => x.data.from === a && x.data.to === b);
    c.push(["the relationships that touch the system are drawn, and one that does not is not", pair("gen-el.dev", "gen-el.repo.parser.reader") && pair("gen-el.repo.parser.reader", "gen-el.repo.parser.lexer") && pair("gen-el.repo.render", "gen-el.repo.parser.reader") && !pair("gen-el.dev", "gen-el.repo.render"), arrows.map(a => `${a.data.from}>${a.data.to}`).join(" ")]);
    c.push(["a planned relationship is a dashed arrow, and only an arrow is dashed", (pair("gen-el.repo.parser.reader", "gen-el.repo.parser.cache") || { data: {} }).data.dash === true && (g.elements || []).every(e => !e.data.dash || e.data.type === "arrow"), ""]);
    c.push(["its notes: the open issue the work board gives the system, and no other system's", !!byId(g, "gen-issue-5") && !byId(g, "gen-issue-6") && !byId(g, "gen-issue-7"), (g.elements || []).filter(e => /^gen-issue/.test(e.id)).map(e => e.id).join(" ")]);
    const notes = texts(g);
    c.push(["the open follow-ups and known gaps, none under a closed label or saying it is closed", notes.some(t => /^Known gap of #3 — The cache is unbounded/.test(t)) && notes.some(t => /^Follow-up of #3 — Tab handling/.test(t)) && !notes.some(t => /old rule|old gap/i.test(t)), notes.filter(t => /#3/.test(t)).join(" | ")]);
    c.push(["a follow-up naming an internal name is reworded or left out, and a machine-local path is left out and said", !notes.some(t => /code-reviewer/i.test(t)) && !notes.some(t => /C:\/Users/.test(t)) && (g.skipped || []).some(s => /machine-local path/.test(s.why)), JSON.stringify(g.skipped)]);
    c.push(["every text it draws passes the rules of what leaves a repository", texts(g).every(t => !W.textProblems(t).length), texts(g).filter(t => W.textProblems(t).length).join(" | ")]);
    c.push(["a private repository named in an issue's title is elided, read from GitHub", /^Open issue #8 — Share the lexer with …/.test((byId(g, "gen-issue-8") || { data: {} }).data.text || "") && !texts(g).some(t => /secret-vault/.test(t)), (byId(g, "gen-issue-8") || { data: {} }).data.text]);
    c.push(["with GitHub not to be read, nothing is generated", run(WB, ["generate", "--root", repo, "--sha", "HEAD", "--scope", "system:parser"], { env: { ...env, DASHBOARDS_GH: path.join(sc, "no-such-gh.js") } }).status === 1, ""]);
    const idea1 = byId(g, "gen-idea-1"), about = arrows.find(a => a.data.from === "gen-idea-1" && a.data.to === "gen-el.repo.parser.cache");
    c.push(["an idea concerning a part is a note with an arrow to it, and its source is kept for the refresh's plan", idea1 && /^Idea 1 · improvement — /.test(idea1.data.text) && !!about && (g.sources || {})["gen-idea-2"] && g.sources["gen-idea-2"].element === "e7", JSON.stringify(g.sources)]);
    c.push(["a note is a white block outlined in terracotta, never the yellow of a person's note", idea1 && idea1.data.color === "white" && idea1.data.stroke === "terracotta" && (g.elements || []).every(e => e.data.color !== "yellow"), ""]);
    c.push(["a Legend section names each look drawn", !!byId(g, "gen-legend") && !!byId(g, "gen-legend.part") && !!byId(g, "gen-legend.planned") && !!byId(g, "gen-legend.note") && !!byId(g, "gen-legend.dashed"), ""]);
    c.push(["the generation reads git at the commit: a system only in the working tree is not drawn", !texts(g).some(t => /ghost/.test(t)) && !(g.elements || []).some(e => /ghost/.test(e.id)), ""]);
    c.push(["sections come first, back to front", (() => { const k = (g.elements || []).findIndex(e => e.data.type !== "container"); return k > 0 && (g.elements || []).slice(k).every(e => e.data.type !== "container"); })(), ""]);
    const runSec = byId(g, "gen-run-9");
    c.push(["a run whose issue names the system has its section, \"in progress as of\" its time, apart from the stamp, with its step and Rows", runSec && /^#9 Lexer speed — in progress as of 2026-11-17 01:00Z$/.test(runSec.data.text) && /^Step: /.test((byId(g, "gen-run-9.step") || { data: {} }).data.text || "") && /Lexer loop\npending/.test((byId(g, "gen-run-9.r1") || { data: {} }).data.text || ""), JSON.stringify(runSec && runSec.data)]);
    c.push(["a run of another system, a landed run and an unreadable board have none; the unreadable one is said", !byId(g, "gen-run-10") && !byId(g, "gen-run-11") && JSON.stringify(g.runs) === "[9]" && (g.skipped || []).some(s => /could not be read/.test(s.why)), JSON.stringify(g.runs)]);
    c.push(["the generated part is within the type's limits", (g.elements || []).length <= W.LIMITS.elements, String((g.elements || []).length)]);
    wr(path.join(sc, "gen-parser.json"), js(g));
  });

  guard("the supersystem, repository and org Whiteboards' generated parts", c => {
    const s = gen("supersystem:render", ["--run", path.join(runs, "10")]).g;
    c.push(["a supersystem's systems are its blocks or sections, a planned one hollow", byId(s, "gen-sys.render-core") && byId(s, "gen-sys.render-core").data.color === "blue" && byId(s, "gen-sys.render-gl") && byId(s, "gen-sys.render-gl").data.hollow === true, JSON.stringify((s.elements || []).filter(e => /gen-sys/.test(e.id)).map(e => e.id))]);
    const sa = (s.elements || []).filter(e => e.data.type === "arrow");
    c.push(["how they interact: its DSL's relationships, each end taken to its system, a planned one dashed, an outside end a neighbour", sa.some(a => a.data.from === "gen-sys.render-gl" && a.data.to === "gen-sys.render-core" && a.data.dash) && sa.some(a => a.data.from === "gen-sys.render-core" && a.data.to === "gen-el.repo.parser"), sa.map(a => `${a.data.from}>${a.data.to}`).join(" ")]);
    c.push(["its notes hold its systems' open issues, and the run of a system it holds has its section", !!byId(s, "gen-issue-6") && !byId(s, "gen-issue-5") && !!byId(s, "gen-run-10"), ""]);
    const r = gen("repository").g;
    c.push(["the repository's supersystems are sections holding their systems, its systems sections holding their parts, an archived one white and so marked", byId(r, "gen-sys.render") && byId(r, "gen-sys.render").data.type === "container" && byId(r, "gen-sys.render-core") && byId(r, "gen-sys.parser") && byId(r, "gen-sys.parser").data.type === "container" && byId(r, "gen-el.repo.parser.reader") && /^archived · legacy/.test((byId(r, "gen-sys.legacy") || { data: {} }).data.text || ""), JSON.stringify((r.elements || []).filter(e => /gen-sys/.test(e.id)).map(e => e.id + ":" + e.data.type))]);
    const ra = (r.elements || []).filter(e => e.data.type === "arrow");
    c.push(["how they interact, from the repository's DSL", ra.some(a => a.data.from === "gen-sys.render" && a.data.to === "gen-sys.parser") && ra.some(a => a.data.from === "gen-el.dev" && a.data.to === "gen-sys.parser"), ra.map(a => `${a.data.from}>${a.data.to}`).join(" ")]);
    c.push(["the repository Whiteboard's notes hold every open issue, one with no system among them", ["gen-issue-5", "gen-issue-6", "gen-issue-7"].every(id => byId(r, id)) && !byId(r, "gen-issue-3"), ""]);
    const bad = gen("supersystem:parser"); c.push(["a system named as a supersystem, and a slug not in the registry, are refused", bad.r.status === 1 && gen("system:ghost").r.status === 1, (bad.r.stderr || "").trim()]);
    /* the org Whiteboard, from OrganizationPage's org work board at its commit */
    const page = path.join(sc, "Page");
    wr(path.join(page, "docs/plans/org-work-board/board.json"), js({ schema: "org-work-board/2", organization: "acme", url: "https://github.com/acme", generated: "2026-11-17T02:00:00Z", repositories: [
      { owner: "acme", name: "widgets", url: "https://github.com/acme/widgets", defaultBranch: "main", head: "abc", board: { schema: "work-board/1", rows: [{ issue: 9, title: "Lexer speed", state: "OPEN", step: "implementation" }, { issue: 3, title: "Parser cache", state: "CLOSED", step: "landed" }], roadmap: [{ issue: 1, title: "Widgets 2", state: "OPEN", items: [{ issue: 2 }] }], unscheduled: [{ issue: 6, title: "Faster drawing" }] } },
      { owner: "acme", name: "empty-repo", url: "https://github.com/acme/empty-repo", defaultBranch: "main", head: "abc", board: null }],
      organizations: [{ owner: "acme-games", parent: "acme", url: "https://github.com/acme-games", repositories: [] }], notShown: [], ideas: [] }));
    wr(path.join(page, "docs/plans/org-work-board/ideas.json"), js({ schema: "ideas/1", next: 2, ideas: [{ id: 1, kind: "exploration", text: "One release checklist for every library.", concerns: ["acme/widgets"], noted: "2026-11-17T00:00:00Z" }] }));
    git(sc, "init", "-q", "-b", "main", page); git(page, "add", "-A"); git(page, "commit", "-q", "-m", "fixture");
    const o = run(WB, ["generate", "--root", page, "--sha", "HEAD", "--scope", "org"], { env }), og = parse(o);
    c.push(["the org Whiteboard: an organization section holding a section per repository", o.status === 0 && byId(og, "gen-org.acme") && byId(og, "gen-repo.acme.widgets") && byId(og, "gen-repo.acme.widgets").parent === "gen-org.acme" && byId(og, "gen-org.acme-games"), `exit ${o.status} ${(o.stderr || "").slice(0, 200)}`]);
    c.push(["each repository: its runs in progress, its roadmap and its unscheduled issues; one with no data says so", /^In progress\n#9 Lexer speed · implementation/.test((byId(og, "gen-repo.acme.widgets.runs") || { data: {} }).data.text || "") && /^Roadmap\n#1 Widgets 2/.test((byId(og, "gen-repo.acme.widgets.roadmap") || { data: {} }).data.text || "") && /^Unscheduled · 1/.test((byId(og, "gen-repo.acme.widgets.unscheduled") || { data: {} }).data.text || "") && !!byId(og, "gen-repo.acme.empty-repo.none"), ""]);
    c.push(["its stamp is the org work board's date, and the free area is a section of its own", /^as of 2026-11-17/.test(og.stamp || "") && byId(og, "gen-free-area") && byId(og, "gen-free-area").data.type === "container", og.stamp]);
    c.push(["the organization's ideas are notes, each with an arrow to the repository it concerns", byId(og, "gen-idea-1") && (og.elements || []).some(e => e.data.type === "arrow" && e.data.from === "gen-idea-1" && e.data.to === "gen-repo.acme.widgets"), ""]);
  });

  /* ---------- The refresh's plan and the batch check ---------- */
  const boardDir = (name, docs, meta) => { const d = path.join(sc, "boards", name); fs.rmSync(d, { recursive: true, force: true });
    Object.entries(docs).forEach(([id, v]) => wr(path.join(d, "elements", id + ".json"), js(v))); if (meta) wr(path.join(d, "board", "meta.json"), js(meta)); return d; };
  guard("a refresh writes only what it wrote (whiteboard.js plan; GUIDANCE.md §13)", c => {
    const g = JSON.parse(rd(path.join(sc, "gen-parser.json"))), genFile = path.join(sc, "gen-parser.json");
    const P0 = run(WB, ["plan", "--generated", genFile, "--board", path.join(sc, "boards", "none")]), p0 = parse(P0), w0 = (p0.batches || []).flatMap(b => b.writes);
    c.push(["on a new Whiteboard: every element created with no if_version, and board/meta set last with its title and order", P0.status === 0 && w0.filter(w => w.collection === "elements").every(w => w.op === "set" && w.if_version == null) && w0[w0.length - 1].collection === "board" && w0[w0.length - 1].op === "set" && w0[w0.length - 1].data.v === 1 && w0[w0.length - 1].data.title === "widgets · parser" && w0[w0.length - 1].data.order.length === g.elements.length, `exit ${P0.status} ${(P0.stderr || "").slice(0, 200)}`]);
    c.push(["each batch holds at most 50 writes", (p0.batches || []).every(b => b.writes.length <= 50), (p0.batches || []).map(b => b.writes.length).join(",")]);
    /* the board as it stands after that write and the user's work on it */
    const docs = {}; g.elements.forEach(e => { docs[e.id] = { version: 1, data: e.data }; });
    const reader = docs["gen-el.repo.parser.reader"]; reader.data = { ...reader.data, x: reader.data.x + 500, y: reader.data.y + 300, text: "Reader (old text)" };
    docs.e1 = { version: 2, data: { type: "shape", kind: "rounded", x: -900, y: -900, w: 200, h: 100, color: "yellow", text: "Why does the lexer exist?" } };
    docs.e2 = { version: 1, data: { type: "arrow", from: "e1", to: "gen-el.repo.parser.lexer" } };
    docs.e7 = { version: 1, data: { type: "shape", kind: "rounded", x: -900, y: -600, w: 200, h: 100, color: "yellow", text: "Draw with the GPU." } };
    docs["gen-idea-2"] = { version: 4, data: { type: "shape", kind: "rounded", x: 3000, y: 3000, w: 300, h: 60, color: "white", stroke: "terracotta", text: "Idea 2 · feature — Draw with the GPU." } };
    const order = [...g.elements.map(e => e.id), "e1", "e2", "e7", "gen-idea-2"];
    /* the next generation: the lexer and the cache gone from the model, a new note where the user has put something */
    const next = JSON.parse(JSON.stringify(g)); next.sha = "def5678";
    next.elements = next.elements.filter(e => !["gen-el.repo.parser.lexer", "gen-el.repo.parser.cache"].includes(e.id) && !(e.data.type === "arrow" && [e.data.from, e.data.to].some(x => /lexer|cache/.test(x))));
    next.elements.push({ id: "gen-issue-99", data: W.block(-850, -850, 300, "Open issue #99 — A new one", W.LOOK.note) });
    const nf = wr(path.join(sc, "gen-parser-next.json"), js(next)), bd = boardDir("refresh", docs, { version: 3, data: { v: 1, title: "widgets · parser", order } });
    const P1 = run(WB, ["plan", "--generated", nf, "--board", bd]), p1 = parse(P1), w1 = (p1.batches || []).flatMap(b => b.writes), wOf = id => w1.filter(w => w.doc_id === id);
    c.push(["it exits 0 and its plan passes the batch check", P1.status === 0 && p1.check === "pass", `exit ${P1.status} ${(P1.stderr || "").slice(0, 300)}`]);
    c.push(["no write touches a user's element", !w1.some(w => ["e1", "e2", "e7"].includes(w.doc_id)), ""]);
    const lex = wOf("gen-el.repo.parser.lexer")[0], cache = wOf("gen-el.repo.parser.cache")[0];
    c.push(["a part gone from the model that a user's arrow points at stays as a stub, \"removed at\" the commit, pinned to its version", lex && lex.op === "update" && /^Lexer — removed at def5678$/.test(lex.data.text) && lex.if_version === 1, JSON.stringify(lex)]);
    c.push(["a part gone with no user's arrow on it is removed, pinned to its version", cache && cache.op === "delete" && cache.if_version === 1, JSON.stringify(cache)]);
    const rw = wOf("gen-el.repo.parser.reader")[0];
    c.push(["a generated block the user moved keeps its place and size: only its text, colour and connections change", rw && rw.op === "update" && rw.data.text === "Reader" && !["x", "y", "w", "h"].some(k => k in rw.data) && rw.if_version === 1, JSON.stringify(rw)]);
    const nw = wOf("gen-issue-99")[0], maxY = Math.max(...Object.values(docs).map(d => d.data).filter(d => Number.isFinite(d.y)).map(d => d.y + (d.h || 40)));
    c.push(["something new that would land on a user's element goes below everything on the board", nw && nw.op === "set" && nw.data.y > maxY, JSON.stringify(nw && { x: nw.data.x, y: nw.data.y, maxY })]);
    const idea2 = wOf("gen-idea-2")[0];
    c.push(["an idea harvested from a note still on the Whiteboard is not drawn, and its old generated note is removed", idea2 && idea2.op === "delete" && (p1.summary.notDrawn || []).includes("gen-idea-2") && !w1.some(w => w.op === "set" && w.doc_id === "gen-idea-2"), JSON.stringify(p1.summary)]);
    const meta = w1.find(w => w.collection === "board");
    c.push(["board/meta is updated last under its version, the user's elements kept in its order and the removed one dropped", meta && meta === w1[w1.length - 1] && meta.op === "update" && meta.if_version === 3 && ["e1", "e2", "e7", "gen-issue-99", "gen-el.repo.parser.lexer"].every(id => meta.data.order.includes(id)) && !meta.data.order.includes("gen-el.repo.parser.cache") && !meta.data.order.includes("gen-idea-2"), JSON.stringify(meta && meta.data.order.slice(-6))]);
    const P2 = run(WB, ["plan", "--generated", genFile, "--board", boardDir("same", Object.fromEntries(g.elements.map(e => [e.id, { version: 1, data: e.data }])), { version: 1, data: { v: 1, title: "widgets · parser", order: g.elements.map(e => e.id) } })]), p2 = parse(P2);
    c.push(["a board already as generated gets no write", P2.status === 0 && (p2.batches || []).length === 0 && p2.summary.kept === g.elements.length, JSON.stringify(p2.summary)]);
  });

  guard("the batch check (whiteboard.js check; wblib.js checkBatches(); GUIDANCE.md §13, \"Before a write\")", c => {
    const board = { meta: { version: 2, data: { v: 1, title: "t", order: ["gen-a", "e1"] } }, elements: new Map([["gen-a", { version: 5, data: { type: "shape", text: "a" } }], ["e1", { version: 1, data: { type: "shape", text: "mine" } }]]) };
    const chk = (writes, b) => W.checkBatches([{ writes }], b || board, {});
    const has = (P, re) => P.some(p => re.test(p));
    c.push(["a clean batch passes", !chk([{ op: "update", collection: "elements", doc_id: "gen-a", data: { text: "b" }, if_version: 5 }, { op: "set", collection: "elements", doc_id: "gen-b", data: { type: "arrow", from: "gen-a", to: "gen-b2" } }, { op: "set", collection: "elements", doc_id: "gen-b2", data: { type: "shape", text: "c", color: "blue" } }]).length, chk([]).join("; ")]);
    c.push(["a write to a user's element is refused", has(chk([{ op: "update", collection: "elements", doc_id: "e1", data: { text: "x" }, if_version: 1 }]), /never writes a user's element/), ""]);
    c.push(["a write to an existing element without its version, or with another, is refused", has(chk([{ op: "update", collection: "elements", doc_id: "gen-a", data: { text: "x" } }]), /carries no if_version/) && has(chk([{ op: "update", collection: "elements", doc_id: "gen-a", data: { text: "x" }, if_version: 4 }]), /pinned to version 4/), ""]);
    c.push(["a creation pinned, or made with update, is refused", has(chk([{ op: "set", collection: "elements", doc_id: "gen-n", data: { type: "shape", text: "x" }, if_version: 1 }]), /created and carries an if_version/) && has(chk([{ op: "update", collection: "elements", doc_id: "gen-n", data: { text: "x" } }]), /created with set/), ""]);
    c.push(["over 50 writes a batch, and one document twice, are refused", has(chk(Array.from({ length: 51 }, (_, i) => ({ op: "set", collection: "elements", doc_id: `gen-x${i}`, data: { type: "shape", text: "x" } }))), /over the type's 50/) && has(chk([{ op: "set", collection: "elements", doc_id: "gen-n", data: { type: "shape", text: "x" } }, { op: "delete", collection: "elements", doc_id: "gen-n" }]), /written twice/), ""]);
    c.push(["an element over 200 KB, and a board over 800 elements, are refused", has(chk([{ op: "set", collection: "elements", doc_id: "gen-big", data: { type: "shape", text: "x".repeat(3000), kind: "y".repeat(210 * 1024) } }]), /over the type's 200 KB/) && has(W.checkBatches(Array.from({ length: 17 }, (_, k) => ({ writes: Array.from({ length: 48 }, (_, i) => ({ op: "set", collection: "elements", doc_id: `gen-m${k}-${i}`, data: { type: "shape", text: "m" } })) })), board, {}), /over the type's 800/), ""]);
    c.push(["a dashed block, a colour the type does not take, a note or sticker, and a stray arrow end are refused", has(chk([{ op: "set", collection: "elements", doc_id: "gen-d", data: { type: "shape", text: "x", dash: true } }]), /only an arrow/) && has(chk([{ op: "set", collection: "elements", doc_id: "gen-c", data: { type: "shape", text: "x", color: "orange" } }]), /colour/) && has(chk([{ op: "set", collection: "elements", doc_id: "gen-s", data: { type: "note", text: "x" } }]), /people's/) && has(chk([{ op: "set", collection: "elements", doc_id: "gen-r", data: { type: "arrow", from: "gen-a", to: "gen-nowhere" } }]), /not on the board/), ""]);
    c.push(["a text that may not leave a repository is refused", has(chk([{ op: "set", collection: "elements", doc_id: "gen-t", data: { type: "shape", text: "kept at C:/Users/someone/x" } }]), /machine-local path/), ""]);
    c.push(["a claim, a comment and board/meta without its version are refused", has(chk([{ op: "set", collection: "board", doc_id: "claim-abc", data: { x: 0 } }]), /not the generated part's/) && has(chk([{ op: "set", collection: "comments", doc_id: "c1", data: {} }]), /not the generated part's/) && has(chk([{ op: "update", collection: "board", doc_id: "meta", data: { order: [] } }]), /board\/meta exists and the write carries no if_version/), ""]);
  });

  guard("the links list and the orphans (whiteboard.js links, orphans)", c => {
    const L = (...a) => run(WB, ["links", "--root", repo, ...a]), f = path.join(repo, "docs/plans/.live/whiteboards.json"), read = () => JSON.parse(rd(f));
    const r1 = L("--set", "system:parser", "--title", "widgets · parser", "--link", "https://claude.ai/artifact/AbC123", "--sha", sha, "--at", "2026-11-17T01:00:00Z");
    c.push(["a Whiteboard's entry is set, with its scope, title, link and last write", r1.status === 0 && read().schema === "whiteboards/1" && read().repo === "acme/widgets" && JSON.stringify(read().whiteboards[0]) === JSON.stringify({ scope: "system:parser", title: "widgets · parser", link: "https://claude.ai/artifact/AbC123", lastWrite: { at: "2026-11-17T01:00:00Z", sha } }), (r1.stderr || "").trim()]);
    L("--set", "system:parser", "--title", "widgets · parser", "--link", "https://claude.ai/artifact/XyZ789", "--sha", sha); L("--set", "repository", "--title", "widgets", "--link", "https://claude.ai/artifact/Rep1", "--sha", sha);
    c.push(["setting a scope again replaces its entry, and another scope's entry is kept", read().whiteboards.length === 2 && read().whiteboards[0].link === "https://claude.ai/artifact/XyZ789", JSON.stringify(read())]);
    c.push(["the list is git-ignored through the checkout's .git/info/exclude", /docs\/plans\/\.live\//.test(rd(path.join(repo, ".git/info/exclude"))), ""]);
    c.push(["a link that is not a claude.ai artifact's is refused, and nothing is written", L("--set", "system:render", "--title", "x", "--link", "https://example.com/x", "--sha", sha).status === 1 && read().whiteboards.length === 2, ""]);
    L("--set", "system:ghost", "--title", "widgets · ghost", "--link", "https://claude.ai/artifact/Gh1", "--sha", sha);
    const o = parse(run(WB, ["orphans", "--root", repo, "--sha", "HEAD"]));
    c.push(["orphans lists a Whiteboard whose system left the registry at the commit, and no other", (o.orphans || []).length === 1 && o.orphans[0].scope === "system:ghost", JSON.stringify(o)]);
    L("--remove", "system:ghost");
    c.push(["--remove takes a scope's entry out", read().whiteboards.length === 2 && !read().whiteboards.some(x => x.scope === "system:ghost"), ""]);
  });

  /* ---------- The ideas files ---------- */
  guard("the ideas writer and its check (plan/scripts/ideas.js; GUIDANCE.md §13, \"The ideas files\")", c => {
    const f = path.join(sc, "ideas", "docs/plans/ideas.json"), A = (...a) => run(IDEAS, a, { env }), read = () => JSON.parse(rd(f));
    const a1 = A("add", "--file", f, "--kind", "improvement", "--text", "Cache parsed widgets per file.", "--concerns", "parser,repo.parser.cache", "--at", "2026-11-17T01:00:00Z");
    c.push(["add writes a new file in its schema, the idea's id 1 and next 2", a1.status === 0 && read().schema === "ideas/1" && read().next === 2 && JSON.stringify(read().ideas[0]) === JSON.stringify({ id: 1, kind: "improvement", text: "Cache parsed widgets per file.", concerns: ["parser", "repo.parser.cache"], noted: "2026-11-17T01:00:00Z" }), `exit ${a1.status} ${(a1.stderr || "").trim()}`]);
    const before = rd(f);
    const refused = [["an internal name", ["--kind", "fix", "--text", "Have the code-reviewer check the lexer."]], ["a grade", ["--kind", "fix", "--text", "A grade-2 fix for the lexer."]], ["a private repository", ["--kind", "feature", "--text", `Share code with ${PRIVATE}.`]],
      ["a machine-local path", ["--kind", "fix", "--text", "The cache at C:/Users/someone/x leaks."]], ["a kind not in the list", ["--kind", "urgent", "--text", "Something."]]];
    refused.forEach(([what, a]) => { const r = A("add", "--file", f, ...a); c.push([`a text with ${what} is refused with exit 3, the rule named, nothing written`, r.status === 3 && rd(f) === before, `exit ${r.status} ${(r.stderr || "").trim().slice(0, 160)}`]); });
    const d = A("drop", "--file", f, "--id", "1", "--reason", "filed as #12"), a2 = A("add", "--file", f, "--kind", "feature", "--text", "Draw with the GPU.", "--issue", "12");
    c.push(["drop takes the idea out with its reason; an id is never reused", d.status === 0 && a2.status === 0 && read().ideas.length === 1 && read().ideas[0].id === 2 && read().ideas[0].issue === 12 && read().next === 3, `${(d.stderr || "").trim()} ${(a2.stderr || "").trim()}`]);
    c.push(["a drop with no reason is refused", A("drop", "--file", f, "--id", "2").status === 2 || A("drop", "--file", f, "--id", "2", "--reason", " ").status === 3, ""]);
    const ck = (doc, org) => I.problems(doc, { org, privates: new Set([PRIVATE]) });
    const base = { schema: "ideas/1", next: 3, ideas: [{ id: 1, kind: "fix", text: "x", concerns: [], noted: "2026-11-17T01:00:00Z" }] };
    c.push(["the check: an owner, a due date, a priority or a state on an idea fails", ["owner", "due", "priority", "state"].every(k => ck({ ...base, ideas: [{ ...base.ideas[0], [k]: "x" }] }).some(p => p.includes(`"${k}"`))), ""]);
    c.push(["the check: an id used twice, or not under next, fails", ck({ ...base, ideas: [base.ideas[0], { ...base.ideas[0] }] }).some(p => /used twice/.test(p)) && ck({ ...base, next: 1 }).some(p => /not under next/.test(p)), ""]);
    c.push(["the check: a source naming a link, or of no scope, fails", ck({ ...base, ideas: [{ ...base.ideas[0], source: { scope: "system:parser", element: "e1", link: "https://claude.ai/artifact/x" } }] }).some(p => /never a link/.test(p)) && ck({ ...base, ideas: [{ ...base.ideas[0], source: { scope: "nowhere", element: "e1" } }] }).some(p => /scope/.test(p)), ""]);
    c.push(["the org file takes owner/repo#n and owner/repo:<slug>, and refuses a bare number and a private repository", !ck({ ...base, ideas: [{ ...base.ideas[0], issue: "acme/widgets#4", concerns: ["acme/widgets", "acme/widgets:parser"] }] }, true).length && ck({ ...base, ideas: [{ ...base.ideas[0], issue: 4 }] }, true).length > 0 && ck({ ...base, ideas: [{ ...base.ideas[0], concerns: [PRIVATE] }] }, true).some(p => /private/.test(p)), ""]);
    const bad = wr(path.join(sc, "ideas-bad", "docs/plans/ideas.json"), js({ ...base, ideas: [{ ...base.ideas[0], owner: "sam" }] }));
    const cj = run(CHECK, [bad]), cg = run(CHECK, [f]);
    c.push(["check.js on an ideas file runs its check: one that fails exits 1, a good one passes", cj.status === 1 && /ideas file: ideas\[0\] has the field "owner"/.test(cj.stdout) && cg.status === 0 && /ideas file: 1 idea/.test(cg.stdout), `${cj.stdout.trim().slice(0, 200)} | ${cg.stdout.trim().slice(0, 120)}`]);
    c.push(["ideas.js check reads GitHub for the private repositories, and with none to read writes nothing", A("check", "--file", f).status === 0 && run(IDEAS, ["add", "--file", f, "--kind", "fix", "--text", "Anything."], { env: { ...process.env, DASHBOARDS_GH: path.join(sc, "no-such-gh.js") } }).status !== 0 && read().ideas.length === 1, ""]);
  });

  guard("the harvest of a Whiteboard (ideas.js harvest)", c => {
    const f = wr(path.join(sc, "harvest", "docs/plans/ideas.json"), js({ schema: "ideas/1", next: 2, ideas: [{ id: 1, kind: "fix", text: "Already here.", concerns: [], noted: "2026-11-17T00:00:00Z", source: { scope: "system:parser", element: "e15" } }] }));
    const note = (x, y, text, type) => ({ version: 1, data: { type: type || "shape", kind: "rounded", x, y, w: 200, h: 80, color: "yellow", text } });
    const bd = boardDir("harvest", { "gen-el.repo.parser.reader": { version: 1, data: { type: "shape", x: 0, y: 0, w: 240, h: 64, color: "blue", text: "Reader" } }, "gen-stamp": { version: 1, data: { type: "text", x: 0, y: 0, text: "as-is at main" } },
      e10: note(0, 100, "Add a retry to the reader."), e20: { version: 1, data: { type: "arrow", from: "e10", to: "gen-el.repo.parser.reader" } },
      e11: note(0, 200, "@sam should fix the lexer"), e12: note(0, 300, "The lexer fails on tabs, due 2026-12-01"), e13: note(0, 400, "Explore streaming input", "text"),
      e14: note(0, 500, "Ask the code-reviewer about the lexer"), e15: note(0, 600, "Already here."), e16: { version: 1, data: { type: "container", x: 0, y: 700, w: 400, h: 300, text: "My section" } } });
    const r = run(IDEAS, ["harvest", "--file", f, "--scope", "system:parser", "--board", bd, "--at", "2026-11-17T02:00:00Z"], { env }), h = parse(r), d = JSON.parse(rd(f));
    const w = id => (h.written || []).find(x => x.element === id), lo = id => (h.leftOut || []).find(x => x.element === id);
    c.push(["it exits 0 and names what it wrote and what it left out", r.status === 0 && Array.isArray(h.written) && Array.isArray(h.leftOut), `exit ${r.status} ${(r.stderr || "").slice(0, 200)}`]);
    c.push(["a user's note is written verbatim with its element id as its source, the kind its words say, and the generated parts its arrows point at as its concerns", w("e10") && w("e10").kind === "feature" && JSON.stringify(w("e10").concerns) === '["repo.parser.reader"]' && d.ideas.some(i => i.text === "Add a retry to the reader." && i.source.element === "e10" && i.source.scope === "system:parser" && i.noted === "2026-11-17T02:00:00Z"), JSON.stringify(h.written)]);
    c.push(["a text element is taken too, its kind from its words", w("e13") && w("e13").kind === "exploration", ""]);
    c.push(["a note with an owner, one with a due date, one that breaks the rules and one already in the file are left out and named", /owner/.test((lo("e11") || {}).why || "") && /due date/.test((lo("e12") || {}).why || "") && /internal name/.test((lo("e14") || {}).why || "") && /already in the file/.test((lo("e15") || {}).why || ""), JSON.stringify(h.leftOut)]);
    c.push(["generated elements, arrows and a section are not taken", !(h.written || []).concat(h.leftOut || []).some(x => /^gen-|^e20$|^e16$/.test(x.element)), ""]);
    c.push(["the file still passes its check, its ids under next", !I.problems(d, { privates: new Set() }).length && d.next === 1 + Math.max(...d.ideas.map(i => i.id)), JSON.stringify(I.problems(d, {}))]);
  });

  /* ---------- The Ideas Card and the Ideas Panel ---------- */
  guard("the Ideas Card (embed.js refreshIdeas(), check.js, fill.js; plan/RULES.md §2)", c => {
    const E = require(sk("plan/scripts/embed.js")), tree = path.join(sc, "card");
    wr(path.join(tree, "docs/plans/ideas.json"), js({ schema: "ideas/1", next: 4, ideas: [{ id: 1, kind: "fix", text: "Reject tabs early.", concerns: ["parser"], issue: 5, noted: "2026-11-17T00:00:00Z" }, { id: 2, kind: "future", text: "Stream input.", concerns: [], issue: 9, noted: "2026-11-17T00:00:00Z" }, { id: 3, kind: "feature", text: "Untied.", concerns: [], noted: "2026-11-17T00:00:00Z" }] }));
    const dir = path.join(tree, "docs/plans/5-tabs"); fs.mkdirSync(dir, { recursive: true });
    const open = { issue: 5, status: "building", wip: { step: "implementation" } }, k1 = E.refreshIdeas(open, dir);
    c.push(["an open board takes the ideas that name its issue: id, kind, text and concerns", !!k1 && JSON.stringify(open.ideas) === JSON.stringify([{ id: 1, kind: "fix", text: "Reject tabs early.", concerns: ["parser"] }]), JSON.stringify(open.ideas)]);
    c.push(["nothing changes when nothing changed", E.refreshIdeas(open, dir) === null, ""]);
    const closed = { issue: 5, status: "built", wip: { step: "landed" }, ideas: [{ id: 1, kind: "fix", text: "As it closed.", concerns: [] }] };
    c.push(["a closed board keeps the Card it closed with", E.refreshIdeas(closed, dir) === null && closed.ideas[0].text === "As it closed.", ""]);
    const none = { issue: 7, status: "building", wip: {}, ideas: [{ id: 9, kind: "fix", text: "gone", concerns: [] }] };
    c.push(["with no idea naming the issue, the field is left out", !!E.refreshIdeas(none, dir) && none.ideas === undefined, JSON.stringify(none)]);
    c.push(["a fill never writes the ideas: embed.js owns them", require(sk("plan/scripts/fill.js")).OWNED.includes("ideas"), ""]);
    const tpl = rd(sk("plan/template/dashboard.html"));
    c.push(["the issue board's template draws the Card in its Context only, with the kind as a Tag and its Legend", /const ideas=Array\.isArray\(PLAN\.ideas\)/.test(tpl) && /class="card idea-card"/.test(tpl) && /an idea's kind: /.test(tpl) && /\.tag-kind\{/.test(tpl), ""]);
    /* check.js on a board whose ideas carry what an idea never has */
    const ex = JSON.parse(rd(sk("verify/fixtures/live-issue.plan.json"))), bdir = path.join(sc, "card-check", "docs/plans", ex.folder ? path.basename(ex.folder) : "x");
    wr(path.join(bdir, "plan.json"), js({ ...ex, ideas: [{ id: 1, kind: "fix", text: "Reject tabs early.", concerns: [], state: "open" }] })); wr(path.join(bdir, "dashboard.html"), require(sk("plan/scripts/lib.js")).writeBlock(tpl, "plan", rd(path.join(bdir, "plan.json"))));
    const cr = run(CHECK, [bdir]);
    c.push(["check.js fails a board whose idea carries a state", /ideas\[0\] carries state/.test(cr.stdout), (cr.stdout.match(/^FAIL.*ideas.*$/m) || ["no ideas line"])[0]]);
  });

  guard("the Ideas Panel (check.js on org-work-board/2; plan/RULES.md §10)", c => {
    const lib = require(sk("plan/scripts/lib.js")), tpl = rd(sk("plan/template/org-board.html")), fx = JSON.parse(rd(sk("verify/fixtures/org-work-board.json")));
    const put = (name, b) => { const d = path.join(sc, "panel", name, "docs/plans/org-work-board"); wr(path.join(d, "board.json"), js(b)); wr(path.join(d, "index.html"), lib.writeBlock(tpl, "board", js(b))); return d; };
    const okRun = run(CHECK, [put("ok", fx)]);
    c.push(["the fixture, org-work-board/2 with ideas, passes check.js", okRun.status === 0, okRun.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ")]);
    const v1 = run(CHECK, [put("v1", { ...fx, schema: "org-work-board/1" })]);
    c.push(["an org-work-board/1 board.json with ideas fails", /carries no ideas/.test(v1.stdout), ""]);
    const src = run(CHECK, [put("src", { ...fx, ideas: [{ ...fx.ideas[0], source: { scope: "org", element: "e1" } }] })]);
    c.push(["an idea copied with its source fails", /carries source/.test(src.stdout), ""]);
    const old = run(CHECK, [put("old", (() => { const b = { ...fx, schema: "org-work-board/1" }; delete b.ideas; return b; })())]);
    c.push(["an older org-work-board/1 board with no ideas still passes", !/schema must be|carries no ideas/.test(old.stdout), old.stdout.split(/\r?\n/).filter(l => /^FAIL/.test(l)).join(" | ")]);
    c.push(["the template draws the Ideas Panel after the organization Panels, one idea Card each, its kind as a Tag, with its Legend", /<section class="ideas-panel" id="ideas"/.test(tpl) && tpl.indexOf('id="ideas"') > tpl.indexOf('id="repos"') && /class="card idea-card"/.test(tpl) && /id="ideas-key"/.test(tpl), ""]);
    if (X.fixture) {
      const fxDir = sk("verify/fixtures/companions");
      wr(path.join(fxDir, "org-board-ideas.html"), lib.writeBlock(tpl, "board", js(fx)));
      const ex = JSON.parse(rd(sk("verify/fixtures/live-issue.plan.json")));
      const withIdeas = { ...ex, ideas: [{ id: 1, kind: "fix", text: "Reject tabs at the handshake rather than after it.", concerns: ["webtools-udp"] }, { id: 4, kind: "exploration", text: "Try a streaming reader for long names.", concerns: [] }] };
      wr(path.join(fxDir, "issue-board-ideas.html"), lib.writeBlock(rd(sk("plan/template/dashboard.html")), "plan", js(withIdeas)));
      c.push(["--fixture: the browser fixtures are written", fs.existsSync(path.join(fxDir, "org-board-ideas.html")) && fs.existsSync(path.join(fxDir, "issue-board-ideas.html")), fxDir]);
    }
  });

  /* ---------- The published copies ---------- */
  guard("the publish step (companions/scripts/publish.js; GUIDANCE.md §13, \"The published copies\")", c => {
    const K = require(PUB).kindOf;
    c.push(["what counts as a committed board, and what never does", K("docs/plans/index.html") === "work-board" && K("docs/plans/org-work-board/index.html") === "org-work-board" && K("docs/plans/5-x/dashboard.html") === "plan-board" && K("docs/dashboards/parser/index.html") === "state-board" && K("docs/plans/.live/index.html") === null && K("docs/plans/.live/view/5-x/dashboard.html") === null && K("docs/dashboards/_template/index.html") === null && K("docs/plans/5-x/plan.json") === null, ""]);
    const outDir = path.join(sc, "pub");
    const live = run(PUB, ["--root", repo, "--sha", "HEAD", "--board", "docs/plans/.live/board.json", "--out", outDir], { env });
    c.push(["a live view is refused, and so is a board not committed at the commit", live.status === 1 && /never published/.test(live.stderr) && run(PUB, ["--root", repo, "--sha", "HEAD", "--board", "docs/plans/nope/dashboard.html", "--out", outDir], { env }).status === 1, (live.stderr || "").trim()]);
    /* a committed repository work board: board.json and index.html at the commit */
    const wb = { schema: "work-board/1", repo: "acme/widgets", generated: "2026-11-17T00:00:00Z", asOf: "2026-11-17", links: {}, base: "./", systems: [], groups: [], rows: [], roadmap: [], unscheduled: [] };
    const tplB = rd(sk("plan/template/board.html")), lib = require(sk("plan/scripts/lib.js"));
    const pubRepo = path.join(sc, "pubrepo"); wr(path.join(pubRepo, "docs/plans/board.json"), js(wb)); wr(path.join(pubRepo, "docs/plans/index.html"), lib.writeBlock(tplB, "board", js(wb)));
    wr(path.join(pubRepo, "docs/dashboards/systems.json"), js({ repo: "acme/widgets", systems: [] })); wr(path.join(pubRepo, "src/A.kt"), "class A\n");
    git(sc, "init", "-q", "-b", "main", pubRepo); git(pubRepo, "add", "-A"); git(pubRepo, "commit", "-q", "-m", "fixture");
    wr(path.join(pubRepo, "docs/plans/index.html"), "<!doctype html><title>changed in the working tree</title>");
    const all = run(PUB, ["--root", pubRepo, "--sha", "HEAD", "--all", "--out", outDir], { env }), A = parse(all), b0 = (A.boards || [])[0] || {};
    c.push(["--all takes every committed board, read from git at the commit (not the working tree), with the file to publish", (A.boards || []).length === 1 && b0.board === "docs/plans/index.html" && fs.existsSync(b0.file || "") && !/changed in the working tree/.test(rd(b0.file)) && /<title>Repository work board<\/title>/.test(rd(b0.file)), `exit ${all.status} ${(all.stderr || "").slice(0, 200)} ${JSON.stringify(b0).slice(0, 300)}`]);
    c.push(["the board is checked with its --auto checker, and its own title is said to name its page", typeof b0.check !== "undefined" && b0.title && b0.title.carried === "Repository work board" && b0.title.applies === false && /names its published page/.test(A.note || ""), JSON.stringify(b0.check).slice(0, 300)]);
    c.push(["the code's other paths are laid as empty files, so a state board's check reads them as committed", fs.existsSync(path.join(A.out || "", "src/A.kt")) && rd(path.join(A.out || "", "src/A.kt")) === "", ""]);
    const head = (git(pubRepo, "rev-parse", "HEAD").stdout || "").trim();
    c.push(["--changed takes only the boards a range added or changed", parse(run(PUB, ["--root", pubRepo, "--sha", "HEAD", "--changed", `${head}..${head}`, "--out", outDir], { env })).boards.length === 0, ""]);
  });

  return groups;
};

if (require.main === module) {
  const args = process.argv.slice(2), oi = args.indexOf("--out"), out = oi >= 0 ? path.resolve(args[oi + 1]) : path.join(os.tmpdir(), "dashboards-verify");
  const SK = path.resolve(__dirname, ".."), sk = p => path.join(SK, ...p.split("/"));
  let failed = 0;
  module.exports({ sk, out, fixture: args.includes("--fixture") }).forEach(([title, cases]) => {
    const bad = cases.filter(c => !c[1]); failed += bad.length;
    console.log(`${bad.length ? "FAILED " : "checked"}  ${title}: ${cases.length - bad.length}/${cases.length} cases`);
    bad.forEach(c => console.log(`  ${c[0]}: ${c[2]}`));
  });
  process.exit(failed ? 1 : 0);
}
