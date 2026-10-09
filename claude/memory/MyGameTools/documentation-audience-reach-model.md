---
name: documentation-audience-reach-model
description: "Cross-project commenting & documentation standard — the \"Architectural Radar\" audience-reach model (4 rings + 2 maturity levels)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e61bb66c-27f1-4cd5-a18b-9266cb6a846a
  modified: 2026-09-02T22:17:10.315Z
---

Cross-project standard for **Commenting & Documentation**. The user supplied this as an
infographic: "Architectural Radar: Intent & Audience Reach Model". Pick the documentation
form by **how far the reader is from the code** — each concentric ring widens the audience.

The user wants **all projects** to follow this, so it is codified in the global
`~/.claude/CLAUDE.md` (`C:\Users\spart\.claude\CLAUDE.md`) — that file is the enforced
version; this memory is the origin note. Complements [[project-guidance-in-aiassistant-rules]]
§5 (Documentation Comments) and §6 (Import Grouping Comments).

## The four rings (by audience reach)

1. **Inner Core — In-Editor Navigation & Maintenance**
   - Audience: the active developer + IDE / static-analysis tools.
   - Purpose: local code clarity and navigation.
   - Tooling: `//region` / `//endregion` blocks, `// TODO:` / `// FIXME:`,
     `@formatter:off` blocks, `//language=JSON` (and other language-injection hints).

2. **Component Ring — API Contracts & Interface Boundaries** (module / domain)
   - Audience: internal consumers and peer developers integrating with the component.
   - Purpose: state explicit behavioral contracts *without* revealing implementation details.
   - Tooling: Dokka / KDoc (`@param`, `@return`, `@throws`), `@Deprecated` with
     `ReplaceWith` / replacement paths, documented pure-function & immutability guarantees.

3. **Boundary Ring — System Integration & Protocols** (cross-service / network)
   - Audience: infrastructure teams, API-gateway maintainers, integration developers.
   - Purpose: document non-obvious side effects, serialization behavior, and external
     dependencies.

4. **Architectural Outer Layer — System Topology & Lifecycle** (organization-wide)
   - Audience: system architects, security reviewers, AI agents, new-engineer onboarding.
   - Purpose: long-term system health, structural intent, security/compliance.
   - Tooling: Structurizr (C4 model as code), embedded PlantUML / Mermaid sequence
     diagrams for coroutine flows, security/compliance annotations.

## Two maturity levels (when each applies)

- **Level 1 — Local Development Gating / Pre-Commit Line Comments** (active during feature dev)
  - Inline comments for local clarity: explain non-obvious algorithms, regexes, and
    edge-case workarounds *on the lines above* the relevant Kotlin before opening a PR.

- **Level 2 — Isolated Component & Public API KDoc Standard**
  - Standardized KDoc block comments on every top-level class, public method, and
    interface — `@param` for key parameters, `@return` for expected returns, `@throws`
    for potential exceptions.
