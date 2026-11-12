# Structure
<!-- {"name":"Structure","code":"S","id":1} -->

Spartan Laboratories writes its rules in one system with four roots. Each root has a main file:

| Root | Main file | What it holds |
|------|-----------|---------------|
| S | `Structure.md`, this page | the structure itself: the single-source principle, the rule system and the pointer system |
| G | `CLAUDE.md`, in the Claude Code configuration (`~/.claude`), with a public copy under `claude/` | guidance for AI sessions |
| P | `POLICY.md` | requirements every repository of the organization meets |
| D | `DESIGN.md` | the principles the organization's code aims for |

S, P and D are the pages of this repository, and each change to them is committed straight to
`main` after the checks. G changes in
`~/.claude`.

Nothing on the pages of S, P and D points into G: this page names G and `CLAUDE.md` in code
formatting only.
`POLICY.md` states what a Policy rule is, and `DESIGN.md` what a Design principle is; this page
holds the test that places a new rule in one or the other.

## Single source
<!-- {"name":"Single source","code":"S-C-SS","id":1000} -->

Every rule, definition and fact a page of the four roots states has one home, where its owner reads
it. Every other page points at the home and never restates it, in whole or in part: inside the rule
system by an id pointer, as [R-1008 (Pointers)](#pointers) says; a document outside the system by
its file and section. A page built on another's terms states only what it adds to them, its specific
uses and its deviations. A copy a script generates from the home, or a check holds equal to it, is
no second home, and neither is a JSON term line, the machine-readable form of the prose fact it
stands for. Where one is found stated twice, the better statement stays as the home and the other
becomes a pointer.

## Files and folders
<!-- {"name":"Files and folders","code":"S-C-FF","id":1001} -->

A file of the rule system carries a JSON line after its `#` title; a file with no `#` title is a
finding. Every folder that holds rule files is counted, and its core file holds the folder's JSON
line; the folder's id addresses the folder and its core file alike, and the core file has no id of
its own. A folder's core file is the first of these it holds:

1. one of the four main files, `Structure.md`, `CLAUDE.md`, `POLICY.md` and `DESIGN.md`;
2. `README.md`;
3. `GUIDANCE.md`;
4. `RULES.md`;
5. `INDEX.md`;
6. failing all of these, its only rule file, where exactly one rule file sits directly in the
   folder. For this step a rule file is every Markdown file directly in the folder; scripts,
   templates and sub-folders do not count.

The name follows what the file is, wherever the folder is: an index file that only lists what its
folder holds is `INDEX.md`; one that serves a purpose beyond the list is `README.md`,
`GUIDANCE.md` where it is the guidance of a structure such as a team of agents, or `RULES.md` where
it is a set of rules.

The last step lets a folder that holds a single rule file go without an index file: that file is
the folder's core file, so a pointer at the folder reaches it already, and still reaches the folder
when more files join. A second rule file in such a folder is a finding until the folder has a core
file by name: the first file is renamed to one of the names above, which changes no id, or, where
its name is fixed, as a skill's `SKILL.md` is, a `GUIDANCE.md` or `README.md` is added and the
first file becomes a file of the folder. Then only what changes tier takes a new id: the first file
takes a 3-digit file id, having had none as the core file; its sections and rules keep their ids,
their codes gaining the file's own segment; the folder's 2-digit id passes to the new core file.
Each pointer at the folder is checked as at a split ([R-1002 (Sections)](#sections)): it still fits
the folder, or it is repointed at the first file and takes a new id.

## Sections
<!-- {"name":"Sections","code":"S-C-SE","id":1002} -->

A rule file is divided into sections, its `##` headings, each grouping rules of similar purpose.
Every `##` section that is not itself a pointer rule carries a 4-digit id.

- A section with no `###` rules is a one-rule section: the section is the rule, and has only its
  4-digit id. A section whose only `###` headings are its own splinters is still a one-rule
  section.
- A section with `###` rules is a section of rules; each rule carries a 5-digit id.
- A section that is wholly a pointer rule carries the pointer id alone ([R-1006 (Pointer
  rules)](#pointer-rules)) and no 4-digit id.

A one-rule section that becomes several rules is split: it keeps its 4-digit id, still the
section, and nothing is retired; the new rules take 5-digit ids. When a section splits, each
pointer at it is checked: it still fits the section, or it is repointed at one of the new rules
and takes a new id ([R-1006 (Pointer rules)](#pointer-rules)). The checker lists, on request,
every pointer at an id; the review of a split's pointers is part of the split's edit, shown in its
diff.

A file's items become rules individually where the file already names them with clean bold leads
that lift out without breaking a sentence; otherwise the file has one rule per section.

## A rule
<!-- {"name":"A rule","code":"S-C-AR","id":1003} -->

- **Heading.** The rule's proper name.
- **JSON line.** The line after the heading, `{"name","code","id"}` in that order, with `name` the
  heading's text exactly, followed by `splinterMark` and `pointerMark` where the rule has
  splinters or is pointed at by pointer rules.
- **Body.** The lines after the JSON line, running to the next heading.

The JSON line has two forms. On the pages of S, P and D it is an HTML comment, `<!-- {...} -->`,
which GitHub does not show; in G it is the visible line. A line in the other form is a finding.

```markdown
## Run only the tests that exercise the change
<!-- {"name":"Run only the tests that exercise the change","code":"P-T-R","id":1041} -->
Never run a test suite that belongs only to a module the change leaves untouched.
```

```markdown
### Ask when the intent is unclear
{"name":"Ask when the intent is unclear","code":"G-Q-2","id":10010}
When an instruction supports two readings, ask which one is meant.
```

(Both examples are made up, ids, codes and text alike.)

## `id`
<!-- {"name":"`id`","code":"S-C-ID","id":1004} -->

Every item of the rule system has an id. Its tier is its number of digits: 1 digit a main file,
2 a folder, 3 a file, 4 a section, 5 a rule. Numbers run in order within a tier. An id is
permanent within its tier and is never reused, and it survives a move. An item that changes tier
takes a new id, and its old id is retired with a pointer to the new one.

The ids are recorded in two lists, read as one record: `~/.claude` records the ids of G, beside
G's register, and this repository records the ids of S, P and D, in `rule-files.json` at its root,
the register that holds a part for each of the three roots. Each list holds its tier marks
and its retired ids, each retired id with the id that replaced it, and nothing else.

- No id is in use twice, or both in use and retired, across the two lists.
- A tier's high-water mark is the higher of the two lists' marks. A new id is above it.
- Every number from the tier's first (1, 10, 100, 1000, 10000) to its mark is in use or retired.
  In the first tier, the id of a main file not written yet is reserved and is not a gap.
- A tier that is full stops the checker, and the user decides then.

The four main files hold the 1-digit ids: `Structure.md` 1, `POLICY.md` 2, `DESIGN.md` 3,
`CLAUDE.md` 4. Every other id is given in the order its item enters the system.

## Splinters
<!-- {"name":"Splinters","code":"S-C-SP","id":1005} -->

When a part of a rule needs pointing at and the rule stays one rule, the part becomes a splinter:
a rule whose id is its parent's and a part, `<parent>-<n>`, e.g. `"id":"10026-1"`. A splinter sits
in its parent's section.

Parts are permanent and never reused, and every part from 1 to the parent's highest is in use or
retired. The parent's highest part is its `splinterMark`, written on the parent's own JSON line
and absent when it has none. A splinter whose parent changes tier takes a new id, and the old one
is retired with a pointer to the new.

## Pointer rules
<!-- {"name":"Pointer rules","code":"S-C-PR","id":1006} -->

A pointer rule is a rule whose whole body points at one target: a rule, a splinter, a section, a
file, a folder, or a listed item (a script or a generated index). Its id is the target's and a
part, `<target>-P<n>`, e.g. `"id":"1041-P1"`, counted apart from the target's splinters. Its body
is one paragraph whose only pointer is to its target.

The target's highest pointer part is its `pointerMark`, written on the target's own JSON line, or,
for a listed item, which has no line, on its entry in the register; it is absent when the target has
none. A pointer rule that is repointed takes a new id, and the old one is retired with a pointer to
the new.

## `code`
<!-- {"name":"`code`","code":"S-C-CO","id":1007} -->

`code` follows the item's place and the checker generates it, so moving an item changes its
`code` and leaves its id alone. It is hyphenated: the root's letter, then the secondary's letter,
then one segment per deeper level, each of 1 to 3 capital letters and unique among its siblings. A
folder and its core file share a code. A one-rule section's code ends in its own segment. A rule in
a section of rules takes the section's code and its position, an unpadded number, even when it is
the section's only numbered rule; a pointer rule takes no position, and the positions count the
section's other rules only. A splinter's code is its parent's plus `-<n>`. A pointer rule takes
no letter: its code is its file's code with its id, e.g. `G-1041-P1`.

The four main files put their own sections under one reserved segment, C for Core, at their
root's second level: `S-C-…`, `P-C-…`, `D-C-…`, `G-C-…`. No folder or file takes C there. A
folder's index file puts its sections beside the folder's other files, sharing their letters.

A script or a generated index has no line of its own: its register lists it with its code and a
3-digit id. This repository's three scripts sit in its scripts folder, `scripts/` (S-S), whose
index file is `scripts/INDEX.md`: the checker (S-S-C), the fetch script (S-S-F) and the core both
read the rule files through (S-S-L).

## Pointers
<!-- {"name":"Pointers","code":"S-C-PO","id":1008} -->

A pointer reads `R-<id> (Name)` whatever its target, with the target's name in full: a rule's or a
section's heading, a file's `#` title, for a folder the `#` title of its index file, and for a
script or a generated index its file name, e.g. `R-100 (rule-check.js)`. Inside the rule system an
item is reached only by an id pointer; a document outside the system is named by its file and
section. Text in code spans and fenced blocks is not read as a pointer.

On the pages of S, P and D a pointer is the text of a Markdown link to its target, e.g.
`[R-1041 (Testing)](testing/README.md)`; a link to a section or a rule goes to its heading's
anchor, e.g. `testing/README.md#run-only-the-tests-that-exercise-the-change`. The checker derives
the anchor from the heading as GitHub does and verifies the link against the id. The repository's
`README.md` and `profile/README.md` are outside the system and link by file. Nothing on these
pages points into G.

In a converted rule file the checker reports a Markdown link to a file inside the system, whether
relative or written as the full address the register gives for that file's repository, and a quoted
section reference: a heading of a converted file, quoted on a line that names that file. A link to
a file in G's public copy, under `claude/` in this repository, is a link to that file of G, whether
it is written as the file's full address or as a relative link. The checker does not report a path
in code formatting, the link that wraps a pointer on these pages, or a reference to a file not yet
converted, except on these pages, where every link into G is reported: the link goes, or the file
is named in code formatting.

## The indexes
<!-- {"name":"The indexes","code":"S-C-IX","id":1009} -->

Two indexes list the system, one beside each register, generated by the checker and never edited
by hand: S-I in this repository for S, P and D, regenerated in each commit that changes S, P or D,
and G-I in `~/.claude`, at `rule-index.md`, for G, which also carries the old-to-new table of the
renumbering and has a public copy under `claude/`. S-I sits beside the register at this
repository's root.

## The checker
<!-- {"name":"The checker","code":"S-C-CH","id":1010} -->

The checker, [R-100 (rule-check.js)](scripts/rule-check.js) (S-S-C), checks the four roots: the JSON
lines in each place's form, the tiers, the two id lists as one record, the splinters and pointer
rules with their marks, the sections, the codes, the pointers and their links, and the indexes. It
finds this repository's checkout through the variable `SPARTAN_ORG_POLICIES` and reports a finding
when it is unset, reading the variable from its process environment first and from the stored user
value second, with no path written in it. A file in another repository is read from that
repository's checkout, a sibling folder of this one under the folder name the register gives, a
variable overriding it; a missing checkout makes the file "not checked", and S-I, which lists that
file's items, is then neither checked nor rewritten.

- It exits 1 on any finding.
- On request it lists every pointer at a given id.
- With `--write` it also corrects the codes, raises the marks and rewrites the indexes. Any finding
  leaves every file as it is. In `~/.claude` it writes in place; for S, P and D it writes in the
  copy about to be committed, never in a standing checkout, which is brought up to date after the
  commit.
- With `--write` and `--defer-policies`, run in `~/.claude` with no copy of this repository being
  committed, it writes G and reports as pending what S, P and D need, such as a pointer count on a
  target here. The commit that brings G's edit into its copy under `claude/` writes those pending
  counts in this repository and carries them.

It reads two registers: G's, in `~/.claude`, and `rule-files.json` at this repository's root for
S, P and D.

## The fetch script
<!-- {"name":"The fetch script","code":"S-C-FS","id":1011} -->

The fetch script takes a pointer and prints what it points at: a rule or a section as its heading
and text without the JSON lines; a file whole, with the JSON lines stripped; a folder as its index
file. It reads all four roots, S, P and D from this repository's checkout and G from `~/.claude`,
so a reader sees only what it was pointed at.

It is also the search across the id record: for an id in use it says where it is; for a retired
id, that it is retired and what replaced it; a listing switch prints the whole record from both
places.
It is [R-101 (rule-fetch.js)](scripts/rule-fetch.js) (S-S-F), beside the checker in this
repository's scripts folder (S-S), and runs from a checkout of this repository; no copy is kept
elsewhere. Both scripts read the rule files through one core,
[R-103 (rule-lib.js)](scripts/rule-lib.js) (S-S-L), so the two cannot read a file differently.
It finds the checkout as the checker does. When the variable is absent or a checkout it needs is
missing, it prints nothing it was asked for, exits 2, and says which checkout is missing.

## The placement test
<!-- {"name":"The placement test","code":"S-C-PT","id":1012} -->

A new rule for the organization's repositories is placed by one question: would a repository that
differs from it be filed as having a gap to close? If it would, the rule is Policy. If a difference
is weighed case by case, it is a Design principle.
