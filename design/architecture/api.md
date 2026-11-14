# Library Design — Open-Ended by Default
<!-- {"name":"Library Design — Open-Ended by Default","code":"D-A-API","id":132} -->

## Scope
<!-- {"name":"Scope","code":"D-A-API-SC","id":1076} -->

Every Spartan Labs repo is in scope. `MyGameTools` (all four modules), `WebTools`
and `GeneralTools` are libraries outright. `MyGameServer` and `MyGameClient` currently hold
concrete implementation so they can act as real tests of `MyGameTools`, but they are growing
toward serving as libraries for game implementations — so design their public shape that way
too, and weigh the rule proportionally to how much of a given file is genuinely consumable
surface versus test-bed concretion. A true application may be as closed as it likes.

## Principle
<!-- {"name":"Principle","code":"D-A-API-PR","id":1077} -->

Ship the *core mechanism*, and leave the *policy* to the consumer. A library
should give a downstream project everything it needs to do the common thing out of the box,
and a seam to do the uncommon thing without forking, patching, or copying internals.

## Mechanism — split by layer
<!-- {"name":"Mechanism — split by layer","code":"D-A-API-ME","id":1078} -->

Which code is shaped as objects and which as functions is
[R-27 (Patterns)](../patterns/README.md); this section says how each kind of type is opened.

Kotlin is final-by-default, so "open to expansion" has to be chosen deliberately. Which tool
depends on what kind of type it is:

- **Domain / entity types** (`GameObject`, `Actor`, `Alive`, `Buff`, `Projectile`, `Player`
  and their peers) — **inheritance**. Mark them `open`/`abstract` and let consumers subclass
  and override. This is the established idiom in these repos and what a game author expects;
  a game defines its units by extending them. Keep the class's own invariants safe by leaving
  the methods that maintain them `final` or `internal`.
- **Systems & infrastructure** (movement strategies, spatial indexes, physics, event bus,
  loaders, transports) — **interface + supplied default implementation**. Publish the
  abstraction, ship a good concrete impl, let a consumer substitute. Evolves without the
  fragile-base-class problem, and substitution is a much narrower contract than "every
  overridable method."

## In practice
<!-- {"name":"In practice","code":"D-A-API-IP","id":1079} -->

- **Prefer open hierarchies to closed ones** at a genuine extension point. Reach for `sealed`
  / `final` only where the closed set is part of the contract (a protocol's message kinds, an
  exhaustive result type) — not merely because today there are only two cases.
- **Parameterise policy, don't hardcode it.** Numbers, rules, strategies and behaviours a
  consumer might reasonably disagree with belong behind a constructor parameter, a strategy
  object, or a registry — with the current behaviour as the default.
- **Expose hooks.** Events, callbacks and overridable steps let a consumer observe or splice
  into a flow that it cannot otherwise reach.
- **Additive and opt-in.** A new capability must leave an existing consumer that ignores it
  behaving exactly as before. Extension is something a consumer opts into.
- **Keep extension points supported.** Anything reachable by a consumer is public API: it gets
  level-1 KDoc contracts
  ([R-10001 (API contracts and interface boundaries)](../../policy/documentation/README.md#api-contracts-and-interface-boundaries))
  and is governed by the repo's versioning rules
  ([R-25 (Versioning)](../../policy/version/README.md)).
