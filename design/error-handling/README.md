# Error handling
<!-- {"name":"Error handling","code":"D-E","id":29} -->

How Spartan Labs code handles failure. These are Design principles:
[R-3 (Design Manifesto)](../../DESIGN.md) says what force they have.

## Expected failures return a Result
<!-- {"name":"Expected failures return a Result","code":"D-E-ER","id":1082} -->

Never throw a raw exception for an expected failure. An operational failure is encapsulated in
the native `Result` type, `Result.success(value)` or `Result.failure(exception)`. An expected
failure returns a `Result`; a programmer error throws.

## Functional recovery
<!-- {"name":"Functional recovery","code":"D-E-FR","id":1083} -->

Prefer functional recovery (`fold`, `recover`, `getOrElse`) over `try-catch`.

## Prevention comes before handling
<!-- {"name":"Prevention comes before handling","code":"D-E-1081-P1","id":"1081-P1"} -->

Code that cannot fail needs no handling:
[R-1081 (Immutable and pure by default)](../patterns/README.md#immutable-and-pure-by-default).
