# Patterns
<!-- {"name":"Patterns","code":"D-P","id":27} -->

How Spartan Labs code is shaped. These are Design principles:
[R-3 (Design Manifesto)](../../DESIGN.md) says what force they have.

## Objects for the domain, functions for data
<!-- {"name":"Objects for the domain, functions for data","code":"D-P-OF","id":1080} -->

Code blends object-oriented and functional programming. Classes model the domain and
encapsulate it. Data is manipulated with pure functions, immutable values (`val`) and
transformation functions (`map`, `flatMap`, `filter`).

## Immutable and pure by default
<!-- {"name":"Immutable and pure by default","code":"D-P-IP","id":1081,"pointerMark":1} -->

A value is immutable and a function is pure unless there is a reason for it not to be. The
preference is error handling done ahead of time, for two reasons.

### Error prevention
<!-- {"name":"Error prevention","code":"D-P-IP-1","id":10037} -->
State that cannot change cannot be changed wrongly, and a function with no side effect can fail
only through what it returns. A failure that cannot happen needs no handling.

### Thread safety
<!-- {"name":"Thread safety","code":"D-P-IP-2","id":10038} -->
An immutable value is shared between threads as it is, and a pure function is called from any
thread, with no lock. It matters most in code built to run on several threads.
