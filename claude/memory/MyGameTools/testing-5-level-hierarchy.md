---
name: testing-5-level-hierarchy
description: Cross-project testing standard — the 5-level test hierarchy (local gating → unit → integration → project-wide 4a/4b/4c → UAT)
metadata: 
  node_type: memory
  type: reference
  originSessionId: e61bb66c-27f1-4cd5-a18b-9266cb6a846a
  modified: 2026-09-03T00:27:35.871Z
---

Cross-project standard for **Testing**. The user supplied this as an infographic: "Project
Testing Infrastructure: 5-Level Hierarchy". Wants it applied to **all projects**, so it is
codified in the global `~/.claude/CLAUDE.md` (`C:\Users\spart\.claude\CLAUDE.md`) — that
file is the enforced version; this memory is the origin note. Pairs with the docs standard
in [[documentation-audience-reach-model]].

1. **Local Development Gating / Pre-Commit Validation** — active until the WIP is finished;
   validate new/changed classes & functions locally before committing, to prevent regression.
2. **Isolated Component Behaviour / Business Logic Validation** — class-level and
   functional-group unit tests for related classes; mock all external calls; no side effects.
3. **Integration & External Interfaces Test** — boundary conditions and data exchange with
   real or simulated external interfaces (API gateways, databases, third-party services);
   validates data flow across system/component boundaries.
4. **Comprehensive Project-Wide Testing Hierarchy**
   - **4a** Deterministic Logic / Input→Output Mapping — pure stateless functions, X → Y, no side effects.
   - **4b** End-to-End System Integration — full app flows and data integration across the whole stack.
   - **4c** Non-Functional Validation — scalability, robustness, security, accessibility (a11y), performance.
5. **User Acceptance (UAT) / Exploratory Evaluation** — human or AI assessment for product
   fit and business value; interactive testing of mocks and full environments to gate release readiness.

**Each level lives in its own folder/package** under the test source root:
`testing.gating` / `testing.component` / `testing.integration` / `testing.deterministic`
(4a) / `testing.e2e` (4b) / `testing.nonfunctional` (4c) / `testing.uat` (5), mirroring the
production package below that segment. One test class per file; bind folders to their own
test task/tag so CI can gate levels independently. Full table in `~/.claude/CLAUDE.md`.
