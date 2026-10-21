#!/usr/bin/env node
// Embeds a file verbatim into a dashboard page's <script type="..." id="<block>"> block, so the page
// carries exactly the committed copy (the Structurizr workspace.dsl, the systems.json registry). Idempotent.
//
//   node embed.js <file> <index.html> [block-id]            # embed; block-id defaults to "dsl"
//   node embed.js <file> <index.html> [block-id] --check    # exit 1 if the embedded copy differs
//
// Blocks: id="dsl" holds workspace.dsl (type text/plain); id="systems" holds systems.json (type application/json).
const fs = require("fs");
const args = process.argv.slice(2), check = args.includes("--check"), [file, page, blockArg] = args.filter(a => a !== "--check");
const block = blockArg || "dsl";
if (!file || !page) { console.error("usage: node embed.js <file> <index.html> [block-id] [--check]"); process.exit(2); }
const content = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim();
if (content.includes("</script>")) { console.error("the embedded file must not contain '</script>'"); process.exit(2); }
const html = fs.readFileSync(page, "utf8");
const re = new RegExp(`(<script type="[^"]+" id="${block}">\\n)([\\s\\S]*?)(</script>)`);
const m = html.match(re);
if (!m) { console.error(`${page}: no <script ... id="${block}"> block`); process.exit(2); }
const same = m[2].trim() === content;
if (check) { console.log(same ? `embedded ${block} matches ${file}` : `embedded ${block} DIFFERS from ${file}`); process.exit(same ? 0 : 1); }
if (same) { console.log(`${block}: already embedded, unchanged`); process.exit(0); }
fs.writeFileSync(page, html.replace(re, (_, a, __, c) => a + content + "\n" + c));
console.log(`embedded ${file} into ${page} as ${block} (${content.split("\n").length} lines)`);
