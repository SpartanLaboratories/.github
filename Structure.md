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
<!-- {"name":"Single source","code":"S-C-SS","id":1000,"pointerMark":1} -->

Every rule, definition and fact a page of the four roots states has one home, where its owner reads
it. Every other page points at the home and never restates it, in whole or in part: inside the rule
system by an id pointer, as [R-1008 (Pointers)](#pointers "1008-T1") says; a document outside the system by
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

1. a file named as one of the four main files, `Structure.md`, `CLAUDE.md`, `POLICY.md` or
   `DESIGN.md`;
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
Each pointer at the folder is checked as at a split ([R-1002 (Sections)](#sections "1002-T1")): it still fits
the folder, or it is repointed at the first file and takes a new id.

A registered folder may be a folder of another repository, and a file of a third repository may be
a file in it: the register places each under its root. The register may also declare a level under
a root: a segment and nothing more, with no folder, no file, no JSON line and no id. A level is no
item of the rule system, and nothing points at it; what the register places under it carries its
segment in its code, and the index and the fetch script show the level only there.

## Sections
<!-- {"name":"Sections","code":"S-C-SE","id":1002} -->

A rule file is divided into sections, its `##` headings, each grouping rules of similar purpose.
Every `##` section that is not itself a pointer rule carries a 4-digit id.

- A section with no `###` rules is a one-rule section: the section is the rule, and has only its
  4-digit id. A section whose only `###` headings are its own splinters is still a one-rule
  section.
- A section with `###` rules is a section of rules; each rule carries a 5-digit id.
- A section that is wholly a pointer rule carries the pointer id alone ([R-1006 (Pointer
  rules)](#pointer-rules "1006-T1")) and no 4-digit id.

A one-rule section that becomes several rules is split: it keeps its 4-digit id, still the
section, and nothing is retired; the new rules take 5-digit ids. When a section splits, each
pointer at it is checked: it still fits the section, or it is repointed at one of the new rules
and takes a new id ([R-1006 (Pointer rules)](#pointer-rules "1006-T2")). The checker lists, on request,
every pointer at an id; the review of a split's pointers is part of the split's edit, shown in its
diff.

A section's items may become rules individually, and only where the section names them with clean
bold leads that lift out without breaking a sentence and leave none of its text in another rule's
body; otherwise, and by default, the section is one rule, and a part of it that needs pointing at
becomes a splinter ([R-1005 (Splinters)](#splinters "1005-T1")).

## A rule
<!-- {"name":"A rule","code":"S-C-AR","id":1003} -->

- **Heading.** The rule's proper name.
- **JSON line.** The line after the heading, `{"name","code","id"}` in that order, with `name` the
  heading's text exactly, followed by `splinterMark`, `pointerMark` and `quoteMark` where the
  rule has splinters or is pointed at by pointer rules.
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
- A tier that is full stops the checker, and what follows is decided then.

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

A pointer rule is a rule whose body points at one target: a rule, a splinter, a section, a file, a
folder, or a listed item (a script or a generated index). Its id is the target's and a part,
`<target>-P<n>`, e.g. `"id":"1041-P1"`, counted apart from the target's splinters. Its body is one
paragraph whose only pointer is to its target, or a quote pointer whose reference is that paragraph
and which may add to its target after it ([R-1123 (Quote pointers)](#quote-pointers "1123-T1")). A pointer
rule whose body is a quote pointer takes `<target>-Q<n>` in place of `<target>-P<n>`, e.g.
`"id":"130-Q2"`, a part of the target's quote count, which the quote pointer files' references
share.

The target's highest pointer part is its `pointerMark`, and the highest quote part a pointer rule
has taken its `quoteMark`, each written on the target's own JSON line, or, for a listed item, which
has no line, on its entry in the register; each is absent when the target has none. A quote part is
given above the target's `quoteMark` and above the highest quote part on its list
([R-1008 (Pointers)](#pointers "1008-T3")), so a pointer rule's part is never given again; a quote part below
the mark need not be in use or retired. A pointer rule that is repointed, or whose body turns from
a paragraph into a quote pointer or back, takes a new id, and the old one is retired with a pointer
to the new.

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
root's second level: `S-C-…`, `P-C-…`, `D-C-…`, `G-C-…`. No folder, file or level takes C there. A
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
`[R-1041 (Testing)](policy/testing/README.md)`; a link to a section or a rule goes to its heading's
anchor, e.g. `policy/testing/README.md#run-only-the-tests-that-exercise-the-change`. The checker
derives the anchor from the heading as GitHub does and verifies the link against the id. The
repository's `README.md` and `profile/README.md` are outside the system and link by file. Nothing
on these pages points into G.

What a pointer takes from its target follows the target: when the target moves or changes, the
checker's `--write` brings what was taken from it up to date in every file the checker reads, in
another repository as in this one, and nothing taken from a target is updated by hand.

Every pointer has an id of its own and stands on a list its target keeps, under that id and the id
of the item that holds it. A pointer rule's own id is its id
([R-1006 (Pointer rules)](#pointer-rules "1006-T3")), and nothing is written at its pointer. A pointer in the
text of a rule, a section or a file takes a part of its target's id, `<target>-T<n>`, counted apart
from the target's splinters and pointer rules, and written at the pointer: on the pages of S, P and
D as its link's title, which GitHub shows only when the link is hovered, e.g.
`[R-1041 (Testing)](policy/testing/README.md "1041-T1")`, and in G in square brackets after it, e.g.
`R-1041 (Testing) [1041-T1]`. That id names the pointer on its list and nowhere else: no pointer
points at it, and neither id list holds it ([R-1004 (`id`)](#id "1004-T1")).

The lists stand in the register that records the target's id, and only the checker's `--write`
writes them and the ids at the pointers. A pointer is correct when its own id is on its target's
list; it keeps that id wherever it moves, and `--write` writes its item on the list and its name and
link from its target. A pointer that carries no id, or an id not on the list of the target its text
names, is new: `--write` records it, writing the next part at it and listing it, when it holds its
target's name, and its link where it has one, as they are now, and otherwise it is a finding. Of two
pointers that carry one id, the one in the item the list names keeps it and the other is new; where
that does not tell them apart, both are findings. `--write` retires the id of a pointer that is
gone, on its target's list, and of a pointer repointed at another target, with its new id beside
it; a retired pointer id is never given again, and the next part given at a target is the one
above the highest on its list, retired ids included. It repoints a pointer at an id retired with a
replacement to the replacement, under a part of that id.

In a rule file the checker reports a Markdown link to a file inside the system, whether
relative or written as the full address the register gives for that file's repository, and a quoted
section reference: a heading of a rule file, quoted on a line that names that file. A link to
a file in G's public copy, under `claude/` in this repository, is a link to that file of G, whether
it is written as the file's full address or as a relative link. The checker does not report a path
in code formatting or the link that wraps a pointer on these pages. On these pages every link into
G is reported: the link goes, or the file is named in code formatting.

## Quote pointers
<!-- {"name":"Quote pointers","code":"S-C-QP","id":1123} -->

A quote pointer references its target and quotes it, for a reader who must have the target's text
where the pointer stands, such as a community health file in another organization's `.github`
repository, which GitHub reads from that repository alone. It is a file outside the rule system or
the body of a pointer rule ([R-1006 (Pointer rules)](#pointer-rules "1006-T4")), and holds, in this order:

1. its own title for the topic: a file's `#` title, or a pointer rule's heading with its JSON line;
2. the quote, between a line `<!-- quote -->` and a line `<!-- end quote -->`, which GitHub does
   not show; inside them, a line `"` before the quote and another after it, which show the reader
   where the quote begins and ends;
3. the reference, one paragraph whose only pointer or link is to its target: in a pointer rule its
   pointer ([R-1008 (Pointers)](#pointers "1008-T4")); in a file an id pointer for a target inside the system,
   or the file for a document outside it, linked by the full address of its home;
4. what it adds to its target, a deviation included, each addition with its reason, when it adds
   anything; in a pointer rule an addition is read as any rule's body is.

The quote is generated from the target: the target's text below the line that titles it, its
heading or `#` title, for a target inside the system as the fetch script prints it
([R-1011 (The fetch script)](#the-fetch-script "1011-T2")), for a document outside it as its file holds it,
and in either each relative link written as the full address it resolves to in the target's
repository. A target with no such line, such as a script, and a target that holds a line
`<!-- quote -->` or `<!-- end quote -->`, as one that holds a quote pointer does, are pointed at,
not quoted. The checker reads the target from the reference and holds the quote, with its marks,
equal to what the target generates now, line endings aside; a quote that differs is out of date,
whatever the difference, and never wrong ([R-1008 (Pointers)](#pointers "1008-T5")), and it is no second
home ([R-1000 (Single source)](#single-source "1000-T4")). A document outside the system has no id that a
move keeps: when it moves, a reference to it leads nowhere and is a finding until it is linked
again by hand. Nothing inside the quote is read: in a rule file it holds no item, pointer, link or
JSON line, and ends no body, and `--write` writes no id in it; the ids at its target's pointers are
quoted with the rest. `rule-files.json` lists each quote pointer file under its repository. A
file's id pointer takes its own id as a pointer in the text of a file does, with Q in place of T,
`<target>-Q<n>`, a part of the target's quote count ([R-1006 (Pointer rules)](#pointer-rules "1006-T5")),
apart from its T parts, written as its link's title, e.g. `130-Q1`, and stands on its target's
list under that id and that repository and the file's path. Each register lists, in a list of
their own, the rule files of its roots that hold a quote pointer.

## The indexes
<!-- {"name":"The indexes","code":"S-C-IX","id":1009} -->

Two indexes list the system, one beside each register, generated by the checker and never edited
by hand: S-I in this repository for S, P and D, regenerated in each commit that changes S, P or D,
and G-I in `~/.claude`, at `rule-index.md`, for G, which also carries the old-to-new table of the
renumbering and has a public copy under `claude/`. S-I sits beside the register at this
repository's root.

## The checker
<!-- {"name":"The checker","code":"S-C-CH","id":1010} -->

The checker, [R-100 (rule-check.js)](scripts/rule-check.js "100-T1") (S-S-C), checks the four roots: the JSON
lines in each place's form, the tiers, the two id lists as one record, the splinters and pointer
rules with their marks, the sections, the codes, the pointers with their links, ids and lists, the
quote pointers, and the indexes. It finds this repository's checkout through the variable
`SPARTAN_ORG_POLICIES` and reports a finding when it is unset, reading the variable from its
process environment first and from the stored user value second, with no path written in it. A
file in another repository is read from that repository's checkout, a sibling folder of this one
under the folder name the register gives, a variable overriding it, or from the copy of that
repository about to be committed when one is named. A missing checkout makes the file "not
checked", and S-I, when it lists that file's items, is then neither checked nor rewritten; with
`--write` in a copy of this repository about to be committed, a missing checkout is a finding.

- It exits 1 on any finding.
- On request it lists every pointer at a given id.
- With `--write` it also corrects the codes, raises the marks, rewrites the indexes, the pointer
  lists and the ids at the pointers, brings each register's list of the rule files that hold a
  quote pointer up to date, and brings up to date what pointers took from their targets
  ([R-1008 (Pointers)](#pointers "1008-T2")). Any finding leaves every file as it is. In `~/.claude` it
  writes in place; for S, P and D, and for a file in another repository, it writes in the copy of
  the file's repository about to be committed, never in a standing checkout, which is brought up
  to date after the commit.
- With `--write` and `--defer-policies`, run in `~/.claude` with no copy of this repository being
  committed, it writes G and reports as pending what S, P and D need, such as a pointer count or a
  pointer list of a target here. The commit that brings G's edit into its copy under `claude/`
  writes those pending changes in this repository and carries them.

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
It is [R-101 (rule-fetch.js)](scripts/rule-fetch.js "101-T1") (S-S-F), beside the checker in this
repository's scripts folder (S-S), and runs from a checkout of this repository; no copy is kept
elsewhere. Both scripts read the rule files through one core,
[R-103 (rule-lib.js)](scripts/rule-lib.js "103-T1") (S-S-L), so the two cannot read a file differently.
It finds the checkout as the checker does. When the variable is absent or a checkout it needs is
missing, it prints nothing it was asked for, exits 2, and says which checkout is missing.

## The placement test
<!-- {"name":"The placement test","code":"S-C-PT","id":1012} -->

A new rule for the organization's repositories is placed by one question: would a repository that
differs from it be filed as having a gap to close? If it would, the rule is Policy. If a difference
is weighed case by case, it is a Design principle.
