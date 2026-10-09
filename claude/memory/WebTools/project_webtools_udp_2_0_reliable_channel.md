---
name: project_webtools_udp_2_0_reliable_channel
description: "webtools-udp 2.0.0 (reliable-ordered UDP sub-channel, Issue #14) shipped 2026-09-26 — released to Maven Central, issue closed"
metadata: 
  node_type: memory
  type: project
  originSessionId: b8aaa5b6-6c9c-4a38-a3d6-0e7228176d39
  modified: 2026-09-26T12:11:50.606Z
---

**RESOLVED — 2.0.0 released 2026-09-26.** `io.github.spartanlaboratories:webtools-udp:2.0.0`
is live on Maven Central. Issue #14 is closed. Delivered as four staged PRs on
integration branch `feat/2.0-framed-transport` (merged to `master`, then deleted):
Stage 1 framing prefix (alpha1), Stage 2 internal reliable engine (alpha2), Stage 3
public `DeliveryMode`/`UdpChannel` API (alpha3), Stage 4 docs+version finalisation
(alpha5 → 2.0.0). A prerequisite fix (Issue #40 — receivers now drop non-zero
channel-byte frames) landed on the integration branch just before Stage 4, at
alpha5. New standing reference docs: `docs/webtools-udp-protocol.md` and
`docs/webtools-udp-architecture.md` (the first non-issue-numbered docs/ files in
the repo). Whole 2.0 public surface (DeliveryMode, UdpChannel, DatagramType,
TransportWireFormat, IncompatibleProtocolException, etc.) shipped as Stable Core,
not Experimental — no consumer had built against an alpha, but the 8 deprecated
1.x members already pointed here.

**Deliberately deferred, NOT part of this release** — filed as their own issues
during finalisation, explicitly scoped out so they wouldn't block the 2.0.0 cut:
- **#38** — handshake parsing accepts an empty peer name on extra whitespace.
- **#39** — client only screens datagram origin on the reliable-channel branch
  (keepalive/probe/unreliable branches accept any source).
- **#41** — per-datagram-drop WARN logs have no rate bound on either side.

The original design/decision history below is kept for context on *why* v1 is
shaped the way it is.

Issue #14 (reliable-ordered sub-channel over the UDP transport) was decided on
2026-09-09: WebTools **takes it on** as the headline feature of **`webtools-udp`
2.0.0** — not a separate `webtools-udp-reliable` artifact. Design-options doc:
`docs/issue-14-reliable-ordered-channel-design.md`. Decisions D1–D10 all resolved
to the doc's recommended option.

Scoped v1: one reliable-ordered channel via a channel handle
(`connection.channel(RELIABLE_ORDERED)`), `uint16` sequence spaces (RFC 1982),
32-bit ack bitfield, RTO reusing the Issue #13 `Rtt` pure functions (private
estimator, not the shared `LinkQualityTracker`), bounded reorder buffer, fixed
in-flight window with immediate `Result.failure` backpressure, message-size cap
(1 KB default / ~8 KB max) with a typed error **instead of fragmentation**, and
**no congestion control** in v1. The Issue #8 classifier-collision fix is folded
into the same major via a 1-byte datagram-type framing prefix on post-handshake
datagrams (handshake stays text).

Delivery: a staged `2.0.0-alphaN` series on a `2.x` integration branch. Deferred
past v1: congestion control (follow-up #1), fragmentation, multiple reliable
channels, unreliable-sequenced mode, reliable-channel session resume across a NAT
rebind (with [[project_webtools_split_into_three_artifacts]] unaffected; ties to
Issue #10 liveness work).

#14 stays OPEN as the 2.0.0 tracking issue. Next step is an implementation plan
`docs/issue-14-reliable-ordered-channel-plan.md`. Follows the
[[api-evolution-clean-break]] policy — 2.0.0 major, wire break included.
