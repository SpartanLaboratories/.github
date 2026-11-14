# Design Manifesto
<!-- {"name":"Design Manifesto","code":"D","id":3} -->

What Spartan Labs code aims to be. A principle here is followed unless there is a reason not to.
A departure is stated, with its reason, where the work is recorded: it is a recorded choice, not
a defect. What every repository must meet is Policy: [R-2 (Policy)](POLICY.md).

## Principles
<!-- {"name":"Principles","code":"D-C-PR","id":1075} -->

### Ship the mechanism, leave the policy to the consumer
<!-- {"name":"Ship the mechanism, leave the policy to the consumer","code":"D-C-PR-1","id":10030} -->
A library gives a consumer what it needs for the common case and a seam for the uncommon one:
[R-132 (Library Design — Open-Ended by Default)](design/architecture/api.md).

### Open by choice
<!-- {"name":"Open by choice","code":"D-C-PR-2","id":10031} -->
A type a consumer may extend is opened deliberately, and closed only where the closed set is the
contract: [R-132 (Library Design — Open-Ended by Default)](design/architecture/api.md).

### Additive and opt-in
<!-- {"name":"Additive and opt-in","code":"D-C-PR-3","id":10032} -->
A new capability leaves a consumer that ignores it behaving as before:
[R-132 (Library Design — Open-Ended by Default)](design/architecture/api.md).

### Objects for the domain, functions for data
<!-- {"name":"Objects for the domain, functions for data","code":"D-C-PR-4","id":10033} -->
Classes model the domain; data is transformed by functions:
[R-27 (Patterns)](design/patterns/README.md).

### Immutable and pure by default
<!-- {"name":"Immutable and pure by default","code":"D-C-PR-5","id":10034} -->
A value does not change and a function has no side effect unless there is a reason:
[R-27 (Patterns)](design/patterns/README.md).

### Idiomatic Kotlin
<!-- {"name":"Idiomatic Kotlin","code":"D-C-PR-6","id":10035} -->
The language's idioms and modern features are preferred to the generic way of writing the same
thing: [R-28 (Conventions)](design/conventions/README.md).

### Failures are designed, not discovered
<!-- {"name":"Failures are designed, not discovered","code":"D-C-PR-7","id":10036} -->
An expected failure is part of a function's contract:
[R-29 (Error handling)](design/error-handling/README.md).
