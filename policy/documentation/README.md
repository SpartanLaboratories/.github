# Documentation levels
<!-- {"name":"Documentation levels","code":"P-D","id":11,"pointerMark":1} -->

The SpartanLaboratories standard for documentation: the four levels it sits at, and what
documentation in code carries. It covers every repository of the organization and of its
sub-organizations, including SpartanLabsGaming, and applies whenever code in them is written,
changed or reviewed.

## The four levels
<!-- {"name":"The four levels","code":"P-D-FL","id":1028} -->

Documentation sits at one of four levels by its distance from the source, as low-level and
high-level languages are spoken of. Levels 1 and 2 are closer to the core of what they document,
and less visual and interactive; levels 3 and 4 are further removed from the source, with higher
visual fidelity and interactivity.

| Level | What sits there |
|-------|-----------------|
| 1 | Inline documentation: line comments and KDoc |
| 2 | The API reference Dokka generates from the KDoc |
| 3 | Plan documents, READMEs and CHANGELOGs, and the project site's hand-written landing page |
| 4 | Boards, the repository's dashboards |

The number is also an order: a level builds on the levels below it. A review follows the same
order: the lower level is reviewed first, since the documentation derived from it can be assessed
properly only once its quality is established.

A diagram or a document takes its level from where it sits: a diagram embedded in code is at
level 1, one in a plan document at level 3, and research documents count with plan documents.
Issue and pull-request text is the tracker's record and sits at no level.

## Level 1: inline documentation
<!-- {"name":"Level 1: inline documentation","code":"P-D-IN","id":1029} -->

### In-editor navigation and maintenance
<!-- {"name":"In-editor navigation and maintenance","code":"P-D-IN-1","id":10000} -->

- Long files are grouped with `//region` / `//endregion`.
- Imports are grouped as [R-137 (Commenting)](commenting.md) sets out.
- A `// TODO:` or `// FIXME:` says what is to be done, and ideally references the issue tracker.
- Hand-aligned blocks sit between `@formatter:off` and `@formatter:on`.
- A string literal in an embedded language (SQL, GLSL, JSON, a regular expression, a shader)
  carries a language-injection hint: `//language=JSON`, `//language=GLSL`, `//language=RegExp`, and
  so on.

### API contracts and interface boundaries
<!-- {"name":"API contracts and interface boundaries","code":"P-D-IN-2","id":10001,"pointerMark":1} -->

- KDoc, rendered by Dokka, states the behavioural contract without revealing implementation detail:
  what the declaration does and what it guarantees, its pre- and postconditions, nullability,
  immutability, thread-safety and purity. It says what, never how.
- Every public or `internal` top-level class, object, interface and enum, and every public or
  `internal` function and property, carries KDoc.
- The KDoc has `@param` for every parameter, `@return` for every non-`Unit` return, and `@throws`
  for every exception a caller should handle.
- The tags are accurate: each `@param` names a current parameter, a `Unit` return has no
  `@return`, and each `@throws` matches what the body can throw.
- `@Deprecated` carries `ReplaceWith` or a concrete replacement path.

### System integration and protocols
<!-- {"name":"System integration and protocols","code":"P-D-IN-3","id":10002} -->

Anything that crosses a process, network, file or serialization boundary documents its non-obvious
side effects, its wire or serialization format and that format's quirks, its external dependencies,
its retry, timeout and ordering behaviour, and the thread its work runs on. This covers
serializable types and DTOs, socket, HTTP and file clients, protocol parsers, and functions that
perform I/O.

### System topology and lifecycle
<!-- {"name":"System topology and lifecycle","code":"P-D-IN-4","id":10003} -->

- Application entry points, modules and long-lived services carry an overview of their structural
  intent and lifecycle.
- A non-trivial async, multi-thread or coroutine flow has an embedded PlantUML or Mermaid sequence
  diagram.
- Security-sensitive code carries security and compliance annotations.

### Pre-commit line comments
<!-- {"name":"Pre-commit line comments","code":"P-D-IN-5","id":10004} -->

Active during feature development. Before a pull request opens, non-obvious algorithms, regular
expressions, magic numbers and edge-case workarounds carry an explanatory comment on the line or
lines directly above them.

## Level 2: the API reference
<!-- {"name":"Level 2: the API reference","code":"P-D-AP","id":1030} -->

Dokka generates the API reference from the KDoc of level 1. The reference follows
[R-104 (Dokka and project sites)](dokka.md).

## Level 3: the landing page
<!-- {"name":"Level 3: the landing page","code":"P-D-LP","id":1031} -->

The project site's hand-written landing page follows [R-104 (Dokka and project sites)](dokka.md).
READMEs and CHANGELOGs follow [R-135 (READMEs and CHANGELOGs)](readme-changelog.md). Plan documents
follow [R-138 (Planning documents)](planning-documents.md). A landing page, a README or a plan's
`consequences.md` can present the KDoc's prose rather than the source.

## Level 4: boards
<!-- {"name":"Level 4: boards","code":"P-D-BO","id":1032} -->

System topology is modelled as code with Structurizr (the C4 model). The role of the boards as
documentation is [R-136 (Boards as documentation)](boards.md).

## What the standard does not ask for
<!-- {"name":"What the standard does not ask for","code":"P-D-NA","id":1024,"pointerMark":1} -->

- KDoc on private helpers, local functions and obvious one-liners. A line comment may still apply
  where their logic is non-obvious.
- KDoc on an override that fully inherits its supertype's documented contract.
- More than line comments in test code, unless the code defines a reusable public helper or
  fixture.
- A line comment on self-evident code: comments never narrate the obvious.
- System-integration or topology documentation for code that touches no boundary and has no async
  topology.
