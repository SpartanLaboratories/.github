# Vocabulary — grades, levels and sets
{"name":"Vocabulary — grades, levels and sets","code":"G-N-VO","id":112}

The words for three scales: how much work an issue is, where a piece of documentation sits, and
which group a test belongs to. Each word names one thing and means what this file says wherever it
is used. The rules that use a word are at the home its entry names; this file says what the word
means and holds none of those rules (R-1000 (Single source)).

## The three words
{"name":"The three words","code":"G-N-VO-W","id":1060}

### grade
{"name":"grade","code":"G-N-VO-W-1","id":10023}
The size of an issue's work: one of four, numbered 1 to 4 from the smallest to the largest. An
issue is graded when it is given its grade, and re-graded when that grade changes. A grade is
always written out, as in "grade 3". What each grade is, what it decides, and who records it where
are in [`CLAUDE.md`](../CLAUDE.md), "Work grades"; the forms committed content never carries are in
[`internal-names.md`](internal-names.md), section 3.

```jsonl
{"term":"grade","not":["work level"],"case":"any"}
```

### level
{"name":"level","code":"G-N-VO-W-2","id":10024}
"Level" is the word used for documentation: where a piece of documentation sits, one of the four
documentation levels. The levels and their definition are on the organization's documentation
page, R-1028 (The four levels). Neither the size of work nor a group of tests is called a level;
"level" in its everyday senses ("top-level", a log level) names none of these scales.

```jsonl
{"term":"level","not":["maturity level","documentation ring"],"case":"any"}
```

### set
{"name":"set","code":"G-N-VO-W-3","id":10025}
A named group of tests of one kind. A set is called by its name, never by a number. The sets and
their folders are on the organization's testing page, R-1026 (The seven sets) and R-1027 (Separate
each set by folder / package), and in [`CLAUDE.md`](../CLAUDE.md), "Testing — Named Test Sets".
"Set" in its everyday sense (a set of files) names no group of tests.

```jsonl
{"term":"set","not":["test level"],"case":"any"}
```
