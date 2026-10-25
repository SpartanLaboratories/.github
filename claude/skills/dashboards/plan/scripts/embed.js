#!/usr/bin/env node
// Embed a board's data file into its page, verbatim, so the page renders from one committed file (GUIDANCE.md §3).
//   node embed.js <folder>            a plan folder (plan.json → dashboard.html, block "plan")
//                                     or docs/plans itself (board.json → index.html, block "board")
//   node embed.js <folder> --check    exit 1 if the embedded copy differs from the data file
//   node embed.js <folder> --refresh-excerpts   re-copy every statement's excerpt from the plan section it names (plan/RULES.md §2,
//                                     "Statements"), once the presenter has judged that the statement still rests on the changed section
// On a plan board it first links every issue the board names to that issue's board where its dashboard.html exists in this tree,
// and clears a link to one that does not (plan/RULES.md §1): a tracking board's units (unit.board), the parent tracking issue
// (parent.board) and every other issue (issueBoards). On a tracking board it also mirrors the live run of each unit in progress
// from that sub-issue's own plan.json (unit.live, plan/RULES.md §3). It copies the excerpt of every statement's reference (verdict
// and as-built statements: the referenced Markdown section's heading, first paragraph and hash) where none is copied yet for that
// reference, and keeps one already copied (plan/RULES.md §2, "Statements"). plan.json is rewritten only when a link, a mirror or an
// excerpt changed.
// A sub-issue's board then re-embeds its parent's tracking board (the enclosing folder, when it holds the parent's plan.json and
// dashboard.html), so every event of a unit's run reaches the tracking board, not only the first.
// Beside the page it writes the live sidecar (plan/RULES.md §1, "plan.js"): plan.json → plan.js, board.json → board.js, the data
// file verbatim as a script the page re-loads while its run is live and redraws from. --check also holds the sidecar to the file.
// For a plan board it then renders the Markdown the board links into self-contained HTML copies under the tree's git-ignored
// docs/plans/.live/docs/ (mdcopy.js), which the board opens in place of the .md when they are on disk; never where .live/ is not ignored.
"use strict";
const fs = require("fs"), path = require("path");
const { readBlock, writeBlock, resolveBoard, parentFolder, SIDECAR, sidecarText, readSidecar } = require("./lib.js");

function target(dir) {
  if (fs.existsSync(path.join(dir, "plan.json"))) return { json: path.join(dir, "plan.json"), html: path.join(dir, "dashboard.html"), js: path.join(dir, SIDECAR.plan), id: "plan" };
  if (fs.existsSync(path.join(dir, "board.json"))) return { json: path.join(dir, "board.json"), html: path.join(dir, "index.html"), js: path.join(dir, SIDECAR.board), id: "board" };
  throw new Error(`${dir} holds neither plan.json nor board.json`);
}
function same(dir) {
  const t = target(dir), html = fs.readFileSync(t.html, "utf8"), body = readBlock(html, t.id);
  if (body == null) return { t, same: false, reason: `no ${t.id} block` };
  let embedded; try { embedded = JSON.parse(body); } catch (e) { return { t, same: false, reason: "the embedded copy does not parse: " + e.message }; }
  const file = JSON.parse(fs.readFileSync(t.json, "utf8"));
  if (JSON.stringify(embedded) !== JSON.stringify(file)) return { t, same: false };
  const side = readSidecar(t.js, t.id);
  if (side.error) return { t, same: false, reason: `the sidecar ${path.basename(t.js)} is ${side.error}` };
  return { t, same: JSON.stringify(side.data) === JSON.stringify(file), reason: `the sidecar ${path.basename(t.js)} differs` };
}
/* A plan board's issue links and its units' runs are resolved from the folders on disk before it is embedded (lib.js
   linkIssueBoards); plan.json is rewritten first, keeping its line endings, so the page still embeds the committed file verbatim. */
function embedOne(dir, opts) {
  const t = target(dir);
  let json = fs.readFileSync(t.json, "utf8");
  const data = JSON.parse(json); // refuse to embed a file that does not parse
  const linked = t.id === "plan" ? resolveBoard(data, dir, { refresh: !!(opts && opts.refresh) }) : [];
  if (linked.length) { const eol = /\r\n/.test(json) ? "\r\n" : "\n"; json = (JSON.stringify(data, null, 2) + "\n").replace(/\n/g, eol); fs.writeFileSync(t.json, json); }
  fs.writeFileSync(t.html, writeBlock(fs.readFileSync(t.html, "utf8"), t.id, json));
  fs.writeFileSync(t.js, sidecarText(t.id, json));
  /* the rendered copies of the Markdown the board links, in the tree's git-ignored docs/plans/.live/docs/ (mdcopy.js; plan/RULES.md §1):
     a cache of this machine, so a failure here never fails the embed */
  let copies = null;
  if (t.id === "plan" && !(opts && opts.copies === false)) { try { copies = require("./mdcopy.js").copyBoardDocs(data, dir); } catch (e) { copies = { wrote: [], skipped: "the copies failed: " + e.message }; } }
  return { ...t, bytes: Buffer.byteLength(json), linked, data, copies };
}
/* Embed a folder; for a sub-issue's board, then re-embed its parent's tracking board, which mirrors this unit's run from the
   plan.json just written (plan/RULES.md §3-§4). opts.parent === false embeds the folder alone. The result carries parent:
   { dir, linked } when a parent was re-embedded, or { dir, error } when it could not be. */
function embed(dir, opts) {
  const r = embedOne(dir, opts);
  const up = r.id === "plan" && !(opts && opts.parent === false) ? parentFolder(dir, r.data) : null;
  if (up && fs.existsSync(path.join(up, "dashboard.html"))) {
    try { const p = embedOne(up); r.parent = { dir: up, linked: p.linked }; }
    catch (e) { r.parent = { dir: up, error: e.message }; }
  }
  delete r.data;
  return r;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  require("../../system/scripts/cliargs.js").strict(args, { usage: "usage: node embed.js <folder> [--check | --refresh-excerpts]", flags: ["check", "refresh-excerpts"], min: 1, max: 1 });
  const dir = args.find(a => !a.startsWith("--"));
  if (!dir) { console.error("usage: node embed.js <folder> [--check]"); process.exit(2); }
  try {
    if (args.includes("--check")) { const r = same(dir); console.log(r.same ? `${r.t.html} embeds ${path.basename(r.t.json)} verbatim, and ${path.basename(r.t.js)} carries it` : `${r.t.html}: embedded copy DIFFERS from ${path.basename(r.t.json)}${r.reason ? " (" + r.reason + ")" : ""}`); process.exit(r.same ? 0 : 1); }
    const r = embed(dir, { refresh: args.includes("--refresh-excerpts") });
    r.linked.forEach(l => console.log(`${/: excerpt of /.test(l) ? "" : "linked "}${l}`));
    console.log(`embedded ${r.json} into ${r.html} (${r.bytes} bytes) and wrote ${path.basename(r.js)} beside it`);
    if (r.copies) console.log(r.copies.skipped ? `rendered copies: ${r.copies.skipped}` : `rendered copies: ${r.copies.wrote.length ? r.copies.wrote.length + " written (docs/plans/.live/docs/)" : "current"}`);
    if (r.parent && r.parent.error) { console.error(`could not re-embed the parent's tracking board in ${r.parent.dir}: ${r.parent.error}`); process.exit(1); }
    if (r.parent) { r.parent.linked.forEach(l => console.log(`tracking board ${r.parent.dir}: ${l}`)); console.log(`re-embedded the parent's tracking board in ${r.parent.dir}${r.parent.linked.length ? "" : " (unchanged)"}`); }
  } catch (e) { console.error("embed failed: " + e.message); process.exit(1); }
}
module.exports = { embed, embedOne, same, target };
