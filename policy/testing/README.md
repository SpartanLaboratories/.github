# Testing — Named Test Sets
<!-- {"name":"Testing — Named Test Sets","code":"P-T","id":12} -->

Structure tests along these sets. Earlier sets run first / most often; later sets gate release.

## Run only the tests that exercise the change
<!-- {"name":"Run only the tests that exercise the change","code":"P-T-RO","id":1025} -->

Never run a test suite that belongs only to a
module the change leaves untouched — not to check a change, not to take a baseline, not in a
QA gate. A module whose code is untouched (say, only its build file moved onto shared build
logic) is proven unaffected by other means, such as identical published output; the tests of a
module that depends on the changed code do exercise it and still run.

## The seven sets
<!-- {"name":"The seven sets","code":"P-T-ST","id":1026} -->

- **gating — Local Development Gating / Pre-Commit Validation** (active until the WIP is finished)
   - Validate changes locally before integration to catch regressions.
   - Covers new and changed classes/functions in the local workspace, before committing.

- **component — Isolated Component Behaviour / Business Logic Validation**
   - Comprehensive unit tests for related classes; **mock all external calls**.
   - Functional-group and class-level testing of isolated behavior with no external side effects.

- **integration — Integration & External Interfaces Test**
   - Boundary conditions and data exchange with actual or simulated external interfaces
     (API gateways, databases, third-party services).
   - Validates data flow across system boundaries and component interfaces.

- **The project-wide sets — Comprehensive Project-Wide Testing**, three sets side by side:
   - **deterministic — Deterministic Logic / Input→Output Mapping**: verify pure, stateless
     functions where input X always yields output Y with no side effects.
   - **e2e — End-to-End System Integration**: verify full application flows and data
     integration across the complete system stack.
   - **nonfunctional — Non-Functional Validation**: scalability, robustness, security,
     accessibility (a11y), and performance — beyond functional correctness.

- **uat — User Acceptance (UAT) / Exploratory Evaluation**
   - Human or AI assessment for product fit and business-value gating.
   - Interactive testing of mock implementations and full functional environments to
     determine release readiness.

## Separate each set by folder / package
<!-- {"name":"Separate each set by folder / package","code":"P-T-SF","id":1027} -->

Keep every set in its own test source folder and package so a set can be run, skipped,
or gated independently. Under the test source root (`src/test/<lang>/`), place tests in a
`testing`-rooted package segment per set, mirroring the production package below it:

| Set             | Package segment            | Folder                          |
|-----------------|----------------------------|---------------------------------|
| gating          | `testing.gating`           | `.../testing/gating/`           |
| component       | `testing.component`        | `.../testing/component/`        |
| integration     | `testing.integration`      | `.../testing/integration/`      |
| deterministic   | `testing.deterministic`    | `.../testing/deterministic/`    |
| e2e             | `testing.e2e`              | `.../testing/e2e/`              |
| nonfunctional   | `testing.nonfunctional`    | `.../testing/nonfunctional/`    |
| uat             | `testing.uat`              | `.../testing/uat/`              |

Example: `com.acme.order.OrderCalculator` → its component tests live in
`com.acme.testing.component.order.OrderCalculatorTest`. Do not mix sets in one folder;
one test class per file still applies. Where a build tool supports it, bind each folder to
its own test task/tag (e.g. JUnit `@Tag`, a Gradle source set) so CI can run the gating and
component sets on every commit and reserve the project-wide sets and uat for release gates.
