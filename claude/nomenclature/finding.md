# Finding — what a scan reads and how it finds a vocabulary's words
{"name":"Finding — what a scan reads and how it finds a vocabulary's words","code":"G-N-FI","id":142}

What the commit scan reads, and how a scan reads a text for the words a vocabulary bars: when a
term counts as found, and what only resembles one. What each vocabulary bars, and what to say
instead, is at its own home: the internal names in R-126 (Internal names — what committed content
never names) [126-T2], and the words a term rules out in R-112 (Vocabulary — grades, levels and sets) [112-T2],
R-140 (Boards — the names of the dashboards and their parts) [140-T3] and R-139 (UI elements — one name per
element) [139-T4]. When the commit scan runs and what a find blocks is in R-116 (Version-control manager) [116-T1].

These rules are the admin team's Communication Clarity Officer's, set and corrected as R-141
(Communication Clarity Officer) [141-T1] says, which also says how the finding tool that implements them is
kept. Every scan that finds a vocabulary's words applies them. The finding tool reads this file's
tables, and the phrases R-10047 (A shortened role name warns) [10047-T1] quotes, where they stand.

## What the commit scan reads
{"name":"What the commit scan reads","code":"G-N-FI-R","id":1122}

### Documents and boards
{"name":"Documents and boards","code":"G-N-FI-R-1","id":10049}
The commit scan reads the documents and boards a commit carries as text, every line of each. The
first row of this table that holds a file, by its repository and its path, says whether it is read
whole or not read; a file no row holds is read by its kind, as R-10050 (The comments in source
code) [10050-T1] says. A path is relative to the repository's root, in any case; `*` stands for any
characters within one name and `**` for any number of folders.

| Repository | Path | Read |
|------------|------|------|
| `SpartanLaboratories/.github` | `claude/**/*.md` | not read |
| `SpartanLaboratories/.github` | `policy/**` | whole |
| `SpartanLaboratories/.github` | `design/**` | whole |
| any | `docs/**` | whole |
| any | `**/*.md` | whole |
| any | `.github/ISSUE_TEMPLATE/**` | whole |

Everything under `docs/` is read, the generated board files among it; every Markdown file, a
`README.md` at any depth, a `CHANGELOG.md` and the community health files among them; and the
issue templates. In `SpartanLaboratories/.github` every file of the Policy and Design folders is
read, and every Markdown file outside `claude/`: `Structure.md`, `POLICY.md`, `DESIGN.md`,
`scripts/INDEX.md`, `rule-index.md` and `profile/README.md` among them.

### The comments in source code
{"name":"The comments in source code","code":"G-N-FI-R-2","id":10050}
It reads the comments in source code, the scripts in a repository's `scripts/` and the code files
of the mirror under its `claude/` among them. A file is read by the first row of this table that
holds its name: a name in the Files column is a file's whole name or, when it starts with a dot,
the end of it. Code itself, identifiers and strings, is not read: a quoted string, a character, a
template and a regular expression are code, and a comment's marker inside one opens no comment.
Comments on lines one after another are read as one text, and so are the lines of one block
comment; a KDoc or Javadoc line's leading `*` is no text.

| Form | Files | Comments read |
|------|-------|---------------|
| `c-nested` | `.kt`, `.kts` | `//` to the end of the line, and `/* */` with KDoc; a block inside a block nests |
| `c` | `.java`, `.js`, `.mjs`, `.cjs`, `.ts`, `.gradle`, `.groovy`, `.dsl` | `//` to the end of the line, and `/* */` with Javadoc and JSDoc |
| `css` | `.css` | `/* */` |
| `html` | `.html`, `.htm` | `<!-- -->`; in a script element that holds JavaScript, its `//` and `/* */`; in a style element, its `/* */` |
| `markup` | `.xml`, `.svg`, `.rdf`, `.rss`, `.tree`, `.list`, `.classpath`, `.project`, `writerside.cfg` | `<!-- -->` |
| `hash` | `.py`, `.sh`, `.yml`, `.yaml`, `.toml`, `gradlew` | `#` at a line's start or after a space or a tab, outside a quoted string, to the end of the line |
| `hash-line` | `.gitignore`, `.gitattributes`, `.dockerignore`, `.graphifyignore`, `graphifyignore`, `.service`, `Dockerfile`, `CODEOWNERS` | a line whose first character after its spaces is `#` |
| `properties` | `.properties`, `.prefs` | a line whose first character after its spaces is `#` or `!` |
| `ini` | `.editorconfig` | a line whose first character after its spaces is `#` or `;` |
| `http` | `.http` | a line that starts, after its spaces, with `#` or `//` |
| `batch` | `.bat`, `.cmd` | a line that starts, after its spaces and an `@`, with `REM` or `::` |
| `dash` | `.sql`, `.lua` | `--` to the end of the line, outside a quoted string |
| `none` | `.json`, `.txt`, `.dat`, `.csv`, `.api`, `.pem`, `.nojekyll`, `.graphify_version`, `LICENSE`, `LICENSE-MIT`, `NOTICE` | nothing: data, generated text or a licence |

### Every line of each file
{"name":"Every line of each file","code":"G-N-FI-R-3","id":10051}
It reads every line of each such file the commit carries, not only the changed lines.

### A mirror-sync as a commit
{"name":"A mirror-sync as a commit","code":"G-N-FI-R-4","id":10052}
It reads a `mirror-sync` that carries those files as it reads a commit.

### A binary file is not read
{"name":"A binary file is not read","code":"G-N-FI-R-5","id":10053}
A file with a NUL byte in its first 8 KB is binary and is not read, wherever it stands.

### A file of no kind is listed
{"name":"A file of no kind is listed","code":"G-N-FI-R-6","id":10054}
A file that no row of either table holds is not read, and the scan lists it with the files it
skipped and why, so that a new kind shows at once and takes its row here.

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
is not a find. A product's own user is matched as well ("the guild or user choose units"). A word
of a form is matched as its row lists it, in no other form of its own.

### A line break is a space
{"name":"A line break is a space","code":"G-N-FI-M-6","id":10055}
A line break inside a paragraph or a comment is read as a space, so a term of more than one word
that is wrapped across two lines is found. A blank line ends a paragraph, and no term is found
across one.

### A space and a hyphen are read alike
{"name":"A space and a hyphen are read alike","code":"G-N-FI-M-7","id":10056}
A space and a hyphen between a term's words are read alike: "admin-team" and "direction manager"
are finds as "admin team" and "direction-manager" are. So are they between the words of an approval
flow's form, "user" and the word its form takes among them: "user-decided" is a find as "user
decided" is.

### A verb's forms
{"name":"A verb's forms","code":"G-N-FI-M-8","id":10057}
A word a list gives in its past form ("graded"), when the list gives the word it is formed from
too ("grade"), is matched in every form of that verb: the word, its -s, -ed and -ing forms
("grading"). A word a list gives after "re-" is matched with "re-" or "re" before it ("re-grade",
"regrade"), in each of those forms.

### A name barred as an agent's name only
{"name":"A name barred as an agent's name only","code":"G-N-FI-M-9","id":10058}
A name the list bars as an agent's name only is found where it stands as an agent: followed by a
word of what an agent does ("found", "flags", "approved", "has found") or by "agent", "agents",
"reviewer" or "team"; after "by" or "from", except before "pass"; and in the possessive. The step
of that name and its passes are not finds ("the qa step", "from qa pass 2").

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
