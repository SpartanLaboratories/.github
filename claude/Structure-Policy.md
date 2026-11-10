# Structure policy: single source and the rule-file format

This file holds R-17 (Single source), which every direction document follows,
and the format of a rule file, which serves it. A rule file is a direction
document written as named, addressable rules. The rule files are the ones
`admin-team/rule-files.json` lists under `files`. Paths here are relative to
`~/.claude/`.

## Single source
{"name":"Single source","code":"G-SP-S","id":17}
Every rule, definition and fact a direction document states has one home, where
its owner reads it. Every other document points at the home and never restates
it, in whole or in part: a rule as R-58 (Pointers) says, anything else by its
file and section. A document built on another's terms states only what it adds
to them, its specific uses and its deviations. A copy a script generates from
the home, or a check holds equal to it, is no second home, and neither is a
JSON term line, the machine-readable form of the prose fact it stands for.
Where one is found stated twice, the better statement stays as the home and the
other becomes a pointer.

## Sections
{"name":"Sections","code":"G-SP-E","id":53}
A rule file is divided into sections, its `##` headings, each grouping rules of
similar purpose. A section that is a single rule carries that rule's JSON line
under its own heading.

A file's items become rules individually where the file already names them with
clean bold leads that lift out without breaking a sentence; otherwise the file
has one rule per section. A section is split only when a part of it needs
pointing at (see Splinters).

## A rule
{"name":"A rule","code":"G-SP-A","id":54}
- **Heading.** The rule's proper name.
- **JSON line.** The line after the heading, `{"name","code","id"}` in that
  order, with `name` the heading's text exactly.
- **Body.** The lines after the JSON line, running to the next heading.

```markdown
### Say what is true at the moment of reading
{"name":"Say what is true at the moment of reading","code":"A-DM-H-1","id":16}
A direction document states the
rule, not its history.
```

## `id`
{"name":"`id`","code":"G-SP-I","id":55}
`id` is a permanent plain whole number. A new rule's `id` is above the
high-water mark (`highWaterMark` in `admin-team/rule-files.json`). A rule that
is removed leaves its `id` on the retired list (`retiredIds`, in the same
file), and a retired `id` is never reused. Every number from 1 to the highest in
use is either in use or retired.

A pointer rule, a rule whose whole body points at one other rule, its target,
takes instead the `id` `<target>-<n>`, a string of the target's `id` and a part,
`"id":"28-1"`, numbered in registration order among the target's parts (see
Splinters). Its body is one paragraph whose only pointer is to its target, and
the target is a rule.

## Splinters
{"name":"Splinters","code":"G-SP-L","id":56}
A rule that is a whole section keeps its `id` on the section header. When a part
of it needs pointing at, the parts become splinters: rules with an `id` that is
a string of parent and part, `"id":"26-1"`, and a parent that is a rule.

Parts are permanent and never reused. A retired splinter goes on `retiredIds` as
`"26-1"`, and every part from 1 to a parent's highest is in use or retired. Each
parent's highest part is kept in `splinterMarks`, in the same file, and a new
part is above it.

A splinter sits in its parent's section; a rule with a string `id` anywhere
else is a pointer rule (see `id`). A rule's parts are shared by its splinters
and the pointer rules that point at it: each part is one or the other, never
both, and `retiredIds` and `splinterMarks` hold both kinds.

## `code`
{"name":"`code`","code":"G-SP-C","id":57}
`code` follows the rule's location and the checker generates it, so moving a
rule changes its `code` and leaves its `id` alone. It reads, in order:

1. The leading letter, from where the file lives: `A` agent, `S` skill, `N`
   nomenclature, `G` global, `O` organization, `R` repo. A file that is none of
   these is put to the user.
2. The file's acronym.
3. The section's letter.
4. The rule's position in its section, an unpadded number, left out where a
   section holds one rule.

So `A-DM-H-1` is the first rule of section H of the agent file DM, and `A-DM-R`
the one rule of its section R. Each file's acronym and section letters are in
the `codes` table of `admin-team/rule-files.json`. A brief's report section
takes section letter `R`.

A splinter's `code` is its parent's plus `-<n>`, its position among the parent's
splinters, so `A-VF-B-1` is the first splinter of the rule `A-VF-B`. A pointer
rule's `code` follows its own location, as any other rule's does.

## Pointers
{"name":"Pointers","code":"G-SP-P","id":58}
A pointer to a rule reads `R-<id> (Name)`, with the rule's name in full, and a
pointer to a splinter or a pointer rule `R-26-1 (Name)`. Text inside code spans
and fenced blocks is not read as a pointer.

## The index
{"name":"The index","code":"G-SP-X","id":59}
`nomenclature/rule-index.md` lists every rule by file and section, each `id`
linking to its heading. The checker generates it; it is not edited by hand.

## The checker
{"name":"The checker","code":"G-SP-H","id":60}
`admin-team/rule-check.js` checks every listed rule file: the JSON lines, the
ids, the splinters, the pointer rules, the codes, the pointers, the high-water
marks and the index.

- `node ~/.claude/admin-team/rule-check.js` exits 1 on any finding, a stale
  code, a stale high-water mark and a stale index included.
- With `--write` it also corrects the codes, raises the high-water marks and
  rewrites the index. Any finding leaves every file as it is.

The direction manager runs it after every edit to a rule file. `mirror-sync`
refuses a rule file that fails it.
