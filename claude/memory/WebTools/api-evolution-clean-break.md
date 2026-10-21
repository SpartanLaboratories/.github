---
name: api-evolution-clean-break
description: "For WebTools' public API, Spartak now allows @Deprecated migration paths for major reworks instead of forcing a clean signature break; superseded the earlier clean-break-only rule on 2026-09-18. Since 2026-10-20 the legacy modules webtools-scraping and webtools-browser are exempt: break them freely, no shims."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 16d0988e-7eea-4073-83ff-a0cebcbfeb5a
  modified: 2026-10-21T02:38:29.161Z
---

**Current rule (2026-09-18):** Do **not** force a breaking change when reworking
WebTools' public API. `@Deprecated` is allowed as a migration path for major
reworks — keep the old surface working alongside the new one, mark it
`@Deprecated`, and plan to demote it to `internal` in a later major rather than
deleting it outright.

**Why:** Spartak set this when deciding Issue #14 OD-4 (whether `push`/`actuate`
survive alongside the new `channel(mode)` API in `webtools-udp` 2.0.0). The
deprecation ladder — ship both, warn, then make the old API `internal` in a
later major — gives consumers a migration window that a hard break does not, and
costs nothing while the new surface is still proving itself. Note the new
`UdpChannel` is *implemented on top of* `push`/`actuateBytes`, so demoting them
to `internal` keeps the delegation and only removes them from the public
surface; it is not a deletion.

**How to apply:** Default to keeping both surfaces + `@Deprecated` with
`ReplaceWith` on the old one, and record when it becomes `internal`. Still bump
the major coordinate for the rework itself. This also resolves the tension with
the global CLAUDE.md Component Ring, which lists `@Deprecated` + `ReplaceWith`
as a documentation tool — that guidance now applies without exception.

**Legacy-module exception (2026-10-20):** `webtools-scraping` (`Connector`) and
`webtools-browser` (`WebViewer`) are legacy code. Work that touches them may
break their public API outright, with no `@Deprecated` shims and no deprecation
ladder. `webtools-udp`, and any module not named here, keeps the rule above.

**Why:** the user, answering Issue #55's planning interview: "Dont worry about
breaking legacy code such as connector/scraping". Asked how far that reaches,
they chose a standing exception covering both scraping and browser. In #55
itself they still chose to leave `Connector` and `webtools-scraping` alone:
the exception permits breaking them, it does not ask for a rework.

**How to apply:** when a change forces an edit to either legacy module (for
example a repo-wide build or toolchain change), make the break directly and do
not propose a migration path or shims for it. Versioning is unchanged; see
[[feedback_versioning_convention]].

**Superseded (was true until 2026-09-18):** the earlier rule was to change
signatures in place, bump major, and never add `@Deprecated` shims — chosen for
the 1.0.3 → 2.0.0 `Result` migration. Do not apply that rule any more; it is
kept here only so an older plan document that cites it can be recognised as
out of date. See [[feedback_versioning_convention]].

**Note (2026-09-05):** WebTools is no longer one artifact — see
[[project_webtools_split_into_three_artifacts]]. Each of the three modules
versions independently now; the combined `WebTools` coordinate is retired at
`2.0.1a`.
