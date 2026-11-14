# Stability tiers
<!-- {"name":"Stability tiers","code":"P-V-ST","id":131} -->

## Three tiers
<!-- {"name":"Three tiers","code":"P-V-ST-TT","id":1073} -->

More extension surface means more that cannot change without a major bump, so public surface is
sorted into three named tiers:

### Stable Core
<!-- {"name":"Stable Core","code":"P-V-ST-TT-1","id":10026} -->

The core functionality the library exists to provide. Full semver guarantee; changes only in a
major.

### Supported Extension
<!-- {"name":"Supported Extension","code":"P-V-ST-TT-2","id":10027} -->

A seam for a **likely but non-core** need: something a fair number of consumers will want, that
is not what the library is fundamentally for. Marked `@SupportedExtension`. It carries the **same
semver guarantee as Stable Core** — the tier marks *purpose*, not a weaker promise. Its shipped
implementations double as the **worked examples** of how to extend that seam, so write them to be
read as examples.

### Experimental
<!-- {"name":"Experimental","code":"P-V-ST-TT-3","id":10028} -->

A seam whose shape has not been proven by a real consumer yet. Gate it behind a Kotlin
`@RequiresOptIn` marker so use is a deliberate opt-in, and say in its KDoc that it may change in a
minor. Graduate it once a consumer has actually built against it, and record the promotion in the
CHANGELOG.

### Placing a seam
<!-- {"name":"Placing a seam","code":"P-V-ST-TT-4","id":10029} -->

A seam's tier is chosen deliberately and never defaulted.

## Retroactive changes to already-closed surfaces
<!-- {"name":"Retroactive changes to already-closed surfaces","code":"P-V-ST-RC","id":1074} -->

When an existing `sealed`/`final` surface would serve consumers better open, do **not** open it
opportunistically mid-phase. Weigh, per surface, how much a consumer actually gains against the
stability and invariant-safety of leaving it shut; record the decision with its reasoning; and
batch the ones decided "open" into the next major release, where breaking changes already ride.
