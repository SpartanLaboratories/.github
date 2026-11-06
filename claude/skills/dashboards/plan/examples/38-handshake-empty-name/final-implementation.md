# Issue #38 — as built

- **Covers:** `SpartanLaboratories/WebTools#38`, *"Handshake parsing accepts an empty peer
  name on extra whitespace"*.
- **Plan:** [`plan.md`](plan.md), unit `malformed-iam-refusal`, Stages A–D.
  **Architecture:** [`architecture.md`](architecture.md). **Impact:** [`impact.md`](impact.md).
  **Research:** [`research/README.md`](research/README.md).
- **Branch:** `fix/issue-38-handshake-empty-name`, from `master` `85cfbbe`.
- **Release:** `webtools-udp` `2.0.0a`, the bugfix after `2.0.0`, set in its own `build:`
  commit after the commits below.

## 1. Commits

| # | SHA | Contents |
|---|---|---|
| research | `77b3786`, `7b58916`, `fbf9dc9`, `b6446de`, `31aab26`, `e8c2929`, `9b1fff7` | the research questions, three findings files, verification, summary |
| 1 | `56a2121` | A-1, A-2: test housekeeping (the NUL/SOH escapes in `HandshakeCoordinatorTest.kt`, the comment range in `ChannelByteGuardIntegrationTest.kt`), with `plan.md`, `architecture.md`, `impact.md` |
| 2 | `1605bdd` | A-3..A-7: the parse outcome, the routing, KDoc, tests |
| 3 | `d3807b0` | C-1..C-4, D-1..D-3: production KDoc contracts, the `#49` marker, `//region`s, with the updated plan documents |
| 4 | `c6be0f2` | C-T1..C-T8, D-4: tests at levels 1, 2, 3, 4a, 4b and 4c |
| 5 | `16d6849` | Stage B with C-D, C-B, D-5, D-6: the protocol doc, the architecture doc, the README |

The source commits (2 to 4) come before the documents (5), so every document line reference
is computed from the final sources.

## 2. What was built

### Behaviour

**What counts as malformed.** The server trims an unframed datagram's text and splits it on
a single U+0020. A line whose first token is exactly `Iam` is a handshake. It is malformed
when:
- its name slot is missing (a bare `Iam`), or
- its name slot is empty (`Iam  x`), or
- its credential slot is present but empty (`Iam bob  tok`).

An absent credential (`Iam bob`) is not malformed.

**Every malformed line, from any origin, is answered `REFUSED malformed`** (17 bytes). The
reason is informative wire text, not a contract. A malformed line:
- never reaches `admit`;
- never supersedes a same-name registration;
- registers nothing;
- fires no `onClientConnect`.

**From an origin that already holds a registration,** that registration is not torn down,
superseded or re-screened, and no `onClientDisconnect` fires. Like every inbound datagram
from a registered origin, the line still refreshes the registration's idle-detection stamp
when `idleTimeoutMillis` is positive. A peer that is mid-session can therefore receive the
unframed `REFUSED`:
- a library client's session listener drops it with a WARN;
- a third-party client may read it as a disconnect.

The protocol doc states this trade-off.

**Well-formed lines behave as before.** A registered origin gets `REGISTERED 2` again, with
no re-screening. An unknown origin goes through `admit`, supersede, register, `REGISTERED 2`
and `onClientConnect`, including the register-before-send ordering that #49 concerns.

**Every other unframed datagram stays as silent as before,** `Iam<TAB>bob` included: a WARN
("sender may be pre-2.0"), and no reply.

**Logging.** Each refused malformed line logs one WARN with a fixed template:
`Refusing malformed handshake from {} ({}); origin registered: {}`. It carries the origin,
the defect label and the registered flag. It never carries the line, its tokens, the name or
the credential, and no exception object is attached. The listener's stack-trace WARN that a
bare `Iam` drew before is gone.

**No new throw path.** The parse is total, and the routing is an exhaustive `when`.

### Code

**`HandshakeProtocol.kt`:**
- a sealed `HandshakeParse` (`NotAHandshake`, `Malformed(defect)`, `Valid(handshake)`);
- a `HandshakeDefect` enum with three fixed, log-safe labels;
- a total `parseHandshake` that checks the verb through `isHandshake`, then the name, then
  the credential, which it reads with `getOrNull`;
- `MALFORMED_REFUSAL_DATAGRAM`, built once from `HandshakeWireFormat.refusedMessage("malformed")`;
  why it is built from `refusedMessage` is a `//` comment beside it, not part of its KDoc;
- the KDoc calls its two replies fixed-text replies, whose bytes never come from the
  application.

`Handshake`, `isHandshake` and `extraTokenCount` are unchanged.

**`HandshakeCoordinator.kt`:**
- `classify` splits the text once and calls `routeUnframed`, which hands a malformed line to
  `refuseMalformed` and a valid one to `handleHandshake`;
- `admitAndRegister` is the previous body, moved unchanged, with a
  `FIXME(#49): registers before the REGISTERED 2 send; a failed send orphans the
  registration` at the registration line; its KDoc names #49 as a known defect;
- six `//region`s: Inbound routing, Handshake state machine, Delivery to bound handlers,
  ClientChannel and scheduler shutdown, Liveness, Server-wide fan-out;
- the KDoc states:
  - the registration guarantee above, liveness refresh included;
  - `accept`'s three failure sources in its `@return`: an undeliverable reply, a throwing
    `admit`, and a handler that cannot be handed to `dispatch`;
  - the two-argument `accept`'s trimmed-text precondition, with its `@param` and `@return`.

**`MultiConnectionUDPServer.kt` and `HandshakeWireFormat.kt`:** KDoc only, with no
signature changes. A malformed `Iam` is refused before `admit`. Refusal by `admit` is from
`webtools-udp` `1.4.0`, and the malformed refusal is from `webtools-udp` `2.0.0a`: the first
mention in each KDoc block names the artifact. Any datagram from a registered client
refreshes its liveness stamp.

### Tests

| Level | `85cfbbe` | Final | Added or changed |
|---|---|---|---|
| 1 gating | 77 | 83 | every parse outcome (valid, each defect, not a handshake); the unknown- and registered-origin malformed cases; the non-`Iam` drop sends nothing |
| 2 component | 223 | 235 | the three shapes from unknown and registered origins; extra tokens; the send failure; the WARN content; the extra-token DEBUG; `Iam<TAB>bob` stays unframed; a test named for `deliverData` that never reached it renamed after what it does, plus a real `deliverData` no-handler test |
| 3 integration | 110 | 115 | a bare `Iam` gets `REFUSED malformed`; all three shapes over a real socket; a registered socket's malformed lines, an empty credential among them; a trailing space trimmed; an empty extra token; a retry on the same socket after a malformed refusal |
| 4a deterministic | 89 | 96 | the parse truth table, totality, the verb check before any slot check, the reply bytes, the #53 gap pinned |
| 4b e2e | 33 | 34 | a library client with an empty name gets a typed `malformed` refusal, pinned until #52 |
| 4c nonfunctional | 62 | 65 | a malformed burst; a burst that includes a registered socket (one reply per datagram; the peer probed through the registry with `pushToAll`, no `onClientDisconnect`, only the registering line reaching `admit`); a hostile CR/LF line stays out of the log |
| 5 uat | 13 | 13 | unchanged; skipped, as before: the wire reply and the server log are exercised end to end at levels 3, 4b and 4c |

A 4c test waits on a named constant, not a bare `Thread.sleep`. All runs pass.

### Documents

**Protocol doc:**
- §3 states:
  - the rule and the registered-origin trade-off;
  - the informative reason;
  - the #53 gap;
  - the replies an unverified source can draw: the handshake replies, plus the transport's
    `0x82` and `0xA1`;
  - when a library client sends a malformed line: the rule, with examples.
- §8 has the malformed rows.
- §9 has a row for servers before `2.0.0a`, each row with its source cited.
- The scope line names `2.0.0a`.
- Every source line reference into an edited file is computed from the final sources.

**Architecture doc:** the `:52` reference and the handshake node.

**README:** the handshake sections. The install snippet moves to `2.0.0a` with the version
bump.

## 3. Deviations from the plan

**None.** The plan's Stages A–D (`plan.md` §7–§10, §17, §18) were built as written.

## 4. Verification

- **Tests:** the counts in §2, with every automated level passing.
- **Line references.** The C-7 reference check and D-7's checks were run on the final tree:
  - every `File.kt:N` reference into an edited file prints the first and last lines its
    prose describes;
  - the shorthand references were read by hand: `HandshakeWireFormat.kt` `:110-118` and
    `:41-44`, and `ReliableChannelEngine.kt` `:104-118`;
  - the architecture doc's `MultiConnectionUDPServer.kt:277` is the `coordinator` field.
- **One check reads lower than it should.** D-7 expects
  ``grep -c 'webtools-udp` `2.0.0a`' HandshakeWireFormat.kt`` to return 2; it returns 1,
  because D-2a's text wraps that label across `HandshakeWireFormat.kt:21-22`, where a
  line-based grep cannot see it. The text is as planned.
- **Wording:** the release labels, the registration guarantee and the liveness text read the
  same in the sources and the protocol doc.
- **Line endings:** the three living documents keep CRLF line endings in the working tree.
