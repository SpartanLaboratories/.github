# Finding — what a scan reads and how it finds a vocabulary's words
{"name":"Finding — what a scan reads and how it finds a vocabulary's words","code":"G-N-FI","id":142}

What the commit scan reads, and how a scan reads a text for the words a vocabulary bars: when a
term counts as found, and what only resembles one. What each vocabulary bars, and what to say
instead, is at its own home: the internal names in R-126 (Internal names — what committed content
never names), and the words a term rules out in R-112 (Vocabulary — grades, levels and sets),
R-140 (Boards — the names of the dashboards and their parts) and R-139 (UI elements — one name per
element). When the commit scan runs and what a find blocks is in R-116 (Version-control manager).

These rules are the admin team's Communication Clarity Officer's, set and corrected as R-141
(Communication Clarity Officer) says, which also says how the finding tool that implements them is
kept. Every scan that finds a vocabulary's words applies them.

## What the commit scan reads
{"name":"What the commit scan reads","code":"G-N-FI-R","id":1122}

### Documents and boards
{"name":"Documents and boards","code":"G-N-FI-R-1","id":10049}
The commit scan reads the documents and boards a commit carries: everything under `docs/`,
`README.md`, the generated board files and, in `SpartanLaboratories/.github`, `Structure.md`,
`POLICY.md`, `DESIGN.md`, every file of the Policy and Design folders and every Markdown file
outside `claude/`, `scripts/INDEX.md`, `rule-index.md`, `profile/README.md` and the community
health files among them.

### The comments in source code
{"name":"The comments in source code","code":"G-N-FI-R-2","id":10050}
It reads the comments in source code (line and block comments, KDoc), the scripts in a
repository's `scripts/` and the code files of the mirror under its `claude/` among them. Code
itself, identifiers and strings, is not read.

### Every line of each file
{"name":"Every line of each file","code":"G-N-FI-R-3","id":10051}
It reads every line of each such file the commit carries, not only the changed lines.

### A mirror-sync as a commit
{"name":"A mirror-sync as a commit","code":"G-N-FI-R-4","id":10052}
It reads a `mirror-sync` that carries those files as it reads a commit.

## Matching a term
{"name":"Matching a term","code":"G-N-FI-M","id":1120}

### Any case, singular or plural, and the possessive
{"name":"Any case, singular or plural, and the possessive","code":"G-N-FI-M-1","id":10042}
A term is matched in any case, singular or plural, and in the possessive ("Planners", "the
rookie-dev's fix").

### A whole word
{"name":"A whole word","code":"G-N-FI-M-2","id":10043}
A term is matched as a whole word. A longer word that contains one, such as `RoutePlanner` or
`ExecutorService`, is not a find.

### A hyphen is a word edge
{"name":"A hyphen is a word edge","code":"G-N-FI-M-3","id":10044}
A hyphen is a word edge, so a hyphenated compound that holds a term is a find: "planners-guide",
"carrier-grade".

### Code counts as text
{"name":"Code counts as text","code":"G-N-FI-M-4","id":10045}
A term in backticks counts in a document or a comment as it does anywhere else, and so does a term
in a fenced code block, rendered on a board (`<pre><code>`) included.

### The approval flow's forms
{"name":"The approval flow's forms","code":"G-N-FI-M-5","id":10046}
A phrase of the approval flow, and each word its form takes, is matched in any case, with a straight
or a curly apostrophe, and with "user" a whole word that any word or none may stand before ("the
user", "a user", "the end user"); a word that only contains it, such as "superuser" or "username",
is not a find. A product's own user is matched as well ("the guild or user choose units").

## On a board
{"name":"On a board","code":"G-N-FI-B","id":1121}

### A shortened role name warns
{"name":"A shortened role name warns","code":"G-N-FI-B-1","id":10047}
On a board, the version-control role's name shortened to "the manager", and the vocabularies'
role's name shortened to "the officer", each with a possessive or a pipeline verb, is warned of
and blocks nothing. The commit scan does not look for either.

### A board term's ruled-out words
{"name":"A board term's ruled-out words","code":"G-N-FI-B-2","id":10048}
A word a board term rules out is matched as written and capitalised, a plural too: a term is a
proper noun, and the everyday word stays lower case. A term whose line says `"case":"any"` rules
its words out in any case, and its `"allow"`, a longer name that holds a ruled-out word and is
something else, is read the same way. In this scan backtick spans, Markdown link targets, URLs and
paths are code, never prose, and a string that is all identifier is left alone.
