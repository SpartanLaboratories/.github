# graphify — the code knowledge graph
{"name":"graphify — the code knowledge graph","code":"G-G-GR","id":144,"pointerMark":1}

A repository with a `graphify-out/graph.json` has a local knowledge graph of its code: god nodes,
community structure and cross-file relationships. This page applies only there; in a
repository without one it asks nothing.

## Using the graph
{"name":"Using the graph","code":"G-G-GR-UG","id":1134}

- For a codebase question, first run `graphify query "<question>"`; `graphify path "<A>" "<B>"`
  answers a relationship and `graphify explain "<concept>"` a focused concept. Each returns a
  scoped subgraph, usually much smaller than `graphify-out/GRAPH_REPORT.md` or raw grep output.
- When `graphify-out/wiki/index.md` exists, use it for broad navigation instead of browsing the
  sources. Read `GRAPH_REPORT.md` only for a broad architecture review, or when query, path and
  explain do not surface enough.
- After changing code in that checkout, run `graphify update .` to keep the graph current (code
  only, no API cost). It writes only under the local `graphify-out/`, so it is no
  version-control action.
- The graph orients; it does not verify. A fact still rests on the code read or the command run
  (R-1125 (Never Guess Intent — Ask) [1125-T1]).

## Temporary: the graphify tracker
{"name":"Temporary: the graphify tracker","code":"G-G-GR-TR","id":1135}

While the admin team tracks what the graph costs and saves, every agent of a `/resolve-issue` run
in such a repository ends its report with one line:
`graphify: <q> queries; replaced <s> searches, <r> file reads`. `<q>` counts the graph queries it
ran (`graphify query`, `path` or `explain`), a query that spared nothing included; `<s>` and `<r>`
the searches and file reads they spared it. The line stays in the report, out of every committed
document and board.
