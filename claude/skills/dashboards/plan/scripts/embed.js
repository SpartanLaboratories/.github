#!/usr/bin/env node
// Embed a board's data file into its page, verbatim, so the page renders from one committed file (GUIDANCE.md §3).
//   node embed.js <folder>            a plan folder (plan.json → dashboard.html, block "plan")
//                                     or docs/plans itself (board.json → index.html, block "board")
//   node embed.js <folder> --check    exit 1 if the embedded copy differs from the data file
// On a tracking board it first links each unit to its sub-issue's board (unit.board) where that board's dashboard.html exists
// in this tree, and clears a link to one that does not (plan/RULES.md §1); plan.json is rewritten only when a link changed.
"use strict";
const fs = require("fs"), path = require("path");
const { readBlock, writeBlock, linkSubIssueBoards } = require("./lib.js");

function target(dir) {
  if (fs.existsSync(path.join(dir, "plan.json"))) return { json: path.join(dir, "plan.json"), html: path.join(dir, "dashboard.html"), id: "plan" };
  if (fs.existsSync(path.join(dir, "board.json"))) return { json: path.join(dir, "board.json"), html: path.join(dir, "index.html"), id: "board" };
  throw new Error(`${dir} holds neither plan.json nor board.json`);
}
function same(dir) {
  const t = target(dir), html = fs.readFileSync(t.html, "utf8"), body = readBlock(html, t.id);
  if (body == null) return { t, same: false, reason: `no ${t.id} block` };
  let embedded; try { embedded = JSON.parse(body); } catch (e) { return { t, same: false, reason: "the embedded copy does not parse: " + e.message }; }
  const file = JSON.parse(fs.readFileSync(t.json, "utf8"));
  return { t, same: JSON.stringify(embedded) === JSON.stringify(file) };
}
/* A tracking board's unit links are resolved from the folders on disk before it is embedded (lib.js linkSubIssueBoards); plan.json
   is rewritten first, keeping its line endings, so the page still embeds the committed file verbatim. */
function embed(dir) {
  const t = target(dir);
  let json = fs.readFileSync(t.json, "utf8");
  const data = JSON.parse(json); // refuse to embed a file that does not parse
  const linked = t.id === "plan" ? linkSubIssueBoards(data, dir) : [];
  if (linked.length) { const eol = /\r\n/.test(json) ? "\r\n" : "\n"; json = (JSON.stringify(data, null, 2) + "\n").replace(/\n/g, eol); fs.writeFileSync(t.json, json); }
  fs.writeFileSync(t.html, writeBlock(fs.readFileSync(t.html, "utf8"), t.id, json));
  return { ...t, bytes: Buffer.byteLength(json), linked };
}

if (require.main === module) {
  const args = process.argv.slice(2), dir = args.find(a => !a.startsWith("--"));
  if (!dir) { console.error("usage: node embed.js <folder> [--check]"); process.exit(2); }
  try {
    if (args.includes("--check")) { const r = same(dir); console.log(r.same ? `${r.t.html} embeds ${path.basename(r.t.json)} verbatim` : `${r.t.html}: embedded copy DIFFERS from ${path.basename(r.t.json)}${r.reason ? " (" + r.reason + ")" : ""}`); process.exit(r.same ? 0 : 1); }
    const r = embed(dir);
    r.linked.forEach(l => console.log(`linked ${l}`));
    console.log(`embedded ${r.json} into ${r.html} (${r.bytes} bytes)`);
  } catch (e) { console.error("embed failed: " + e.message); process.exit(1); }
}
module.exports = { embed, same, target };
