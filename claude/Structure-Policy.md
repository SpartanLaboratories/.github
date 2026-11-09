# Structure policy: the rule-file format

A rule file is a direction document written as named, addressable rules. The
rule files are the ones `admin-team/rule-files.json` lists under `files`. Paths
here are relative to `~/.claude/`.

## Sections

A rule file is divided into sections, its `##` headings, each grouping rules of
similar purpose. A section that is a single rule carries that rule's JSON line
under its own heading.

## A rule

- **Heading.** The rule's proper name.
- **JSON line.** The line after the heading, `{"name","code","id"}` in that
  order, with `name` the heading's text exactly.
- **Body.** The lines after the JSON line, running to the next heading.

```markdown
### One home per rule
{"name":"One home per rule","code":"A-DM-H-2","id":17}
State a rule once, where its owner reads it, and point
at it from everywhere else.
```

## `id`

`id` is a permanent plain whole number. A new rule's `id` is above the
high-water mark (`highWaterMark` in `admin-team/rule-files.json`). A rule that
is removed leaves its `id` on the retired list (`retiredIds`, in the same
file), and a retired `id` is never reused. Every number from 1 to the highest in
use is either in use or retired.

## `code`

`code` follows the rule's location and the checker generates it, so moving a
rule changes its `code` and leaves its `id` alone. It reads, in order:

1. The leading letter, from where the file lives: `A` agent, `S` skill, `N`
   nomenclature, `G` global, `O` organization, `R` repo. A file that is none of
   these is put to the user.
2. The file's acronym.
3. The section's letter.
4. The rule's position in its section, an unpadded number, left out where a
   section holds one rule.

So `A-DM-H-2` is the second rule of section H of the agent file DM, and `A-DM-R`
the one rule of its section R. Each file's acronym and section letters are in
the `codes` table of `admin-team/rule-files.json`.

## Pointers

A pointer to a rule reads `R-<id> (Name)`, with the rule's name in full. Text
inside code spans and fenced blocks is not read as a pointer.

## The index

`nomenclature/rule-index.md` lists every rule by file and section, each `id`
linking to its heading. The checker generates it; it is not edited by hand.

## The checker

`admin-team/rule-check.js` checks every listed rule file: the JSON lines, the
ids, the codes, the pointers, the high-water mark and the index.

- `node ~/.claude/admin-team/rule-check.js` exits 1 on any finding, a stale
  code, a stale high-water mark and a stale index included.
- With `--write` it also corrects the codes, raises the high-water mark and
  rewrites the index. Any finding leaves every file as it is.

The direction manager runs it after every edit to a rule file. `mirror-sync`
refuses a rule file that fails it.
