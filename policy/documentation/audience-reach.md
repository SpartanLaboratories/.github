# Audience-reach documentation
<!-- {"name":"Audience-reach documentation","code":"P-D-AR","id":105} -->

The SpartanLaboratories standard for comments and documentation in code. It covers every
repository of the organization and of its sub-organizations, including SpartanLabsGaming, and
applies whenever code in them is written, changed or reviewed.

Documentation takes its form from how far its reader is from the code. Four concentric rings, each
widening the audience, say which form serves which reader. Two maturity levels say what code
carries before its pull request opens, and what KDoc contracts it carries.

## The four rings
<!-- {"name":"The four rings","code":"P-D-AR-FR","id":1022} -->

### Ring 1: Inner Core, in-editor navigation and maintenance
<!-- {"name":"Ring 1: Inner Core, in-editor navigation and maintenance","code":"P-D-AR-FR-1","id":10000} -->

For the developer in the editor, and for IDE and static-analysis tools.

- Long files are grouped with `//region` / `//endregion`.
- A `// TODO:` or `// FIXME:` says what is to be done, and ideally references the issue tracker.
- Hand-aligned blocks sit between `@formatter:off` and `@formatter:on`.
- A string literal in an embedded language (SQL, GLSL, JSON, a regular expression, a shader)
  carries a language-injection hint: `//language=JSON`, `//language=GLSL`, `//language=RegExp`, and
  so on.

### Ring 2: Component Ring, API contracts and interface boundaries
<!-- {"name":"Ring 2: Component Ring, API contracts and interface boundaries","code":"P-D-AR-FR-2","id":10001,"pointerMark":1} -->

Module or domain level, for internal consumers and peer developers integrating with the component.

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

### Ring 3: Boundary Ring, system integration and protocols
<!-- {"name":"Ring 3: Boundary Ring, system integration and protocols","code":"P-D-AR-FR-3","id":10002} -->

Cross-service and network level, for infrastructure teams, API-gateway maintainers and integration
developers.

Anything that crosses a process, network, file or serialization boundary documents its non-obvious
side effects, its wire or serialization format and that format's quirks, its external dependencies,
its retry, timeout and ordering behaviour, and the thread its work runs on. This covers
serializable types and DTOs, socket, HTTP and file clients, protocol parsers, and functions that
perform I/O.

### Ring 4: Architectural Outer Layer, system topology and lifecycle
<!-- {"name":"Ring 4: Architectural Outer Layer, system topology and lifecycle","code":"P-D-AR-FR-4","id":10003} -->

Organization-wide, for those responsible for the system's architecture, security reviewers and
engineers new to the system. It serves long-term system health, structural intent, and security and
compliance.

- Application entry points, modules and long-lived services carry an overview of their structural
  intent and lifecycle.
- System topology is modelled as code with Structurizr (the C4 model).
- A non-trivial async, multi-thread or coroutine flow has an embedded PlantUML or Mermaid sequence
  diagram.
- Security-sensitive code carries security and compliance annotations.

## The two maturity levels
<!-- {"name":"The two maturity levels","code":"P-D-AR-ML","id":1023} -->

### Level 1: pre-commit line comments
<!-- {"name":"Level 1: pre-commit line comments","code":"P-D-AR-ML-1","id":10004} -->

Active during feature development. Before a pull request opens, non-obvious algorithms, regular
expressions, magic numbers and edge-case workarounds carry an explanatory comment on the line or
lines directly above them.

### Level 2: KDoc contracts
<!-- {"name":"Level 2: KDoc contracts","code":"P-D-AR-10001-P1","id":"10001-P1"} -->

Every declaration that
[R-10001 (Ring 2: Component Ring, API contracts and interface boundaries)](#ring-2-component-ring-api-contracts-and-interface-boundaries)
names carries the KDoc block it requires, with its tags; this level adds no scope, contract or tag
of its own.

## What the standard does not ask for
<!-- {"name":"What the standard does not ask for","code":"P-D-AR-NA","id":1024} -->

- KDoc on private helpers, local functions and obvious one-liners. A Level 1 line comment may still
  apply where their logic is non-obvious.
- KDoc on an override that fully inherits its supertype's documented contract.
- More than Level 1 in test code, unless the code defines a reusable public helper or fixture.
- A line comment on self-evident code: comments never narrate the obvious.
- Ring 3 or Ring 4 documentation for code that touches no boundary and has no async topology.
