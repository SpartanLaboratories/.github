---
name: spartan-brand-style
description: "Spartan visual brand (crimson/bronze on ink/parchment, calm per-surface backgrounds) to apply to docs, websites, READMEs and wikis in both Spartan Labs orgs"
metadata:
  node_type: memory
  type: user
  originSessionId: a87dc2f4-8016-47c3-bb75-6e629e42287e
  modified: 2026-09-24T14:53:52.742Z
---

The user's chosen visual style for **both orgs** (SpartanLabsGaming and SpartanLaboratories — see [[project-repos-and-orgs]]). Established 2026-09-24 on the MyGameTools Dokka theme; the reference implementation is `docs/dokka/styles/dokka-styles.css` in MyGameTools.

**Logos differ per org.** SpartanLabsGaming uses the Spartan Gaming logo (square PNG with transparent background, a Spartan warrior with a keyboard shield and a pixel sword, and "SPARTAN GAMING" underneath). In MyGameTools it lives in a shared brand folder, `docs/brand/spartan-gaming-logo.png`, that every surface references. SpartanLaboratories has a **different** logo: `docs/brand/spartan-laboratories-logo.png` in MyGameTools (transparent PNG, 566×559). It shows a Spartan with a science shield (DNA, atom, flask) and a test-tube spear, with navy "SPARTAN" over bronze "LABORATORIES". Use it for SpartanLaboratories repos, never the gaming one. Its navy lettering has low contrast on the dark ink header, so give it the bronze glow, or a lighter backdrop, when it sits on dark.

**Palette**
- crimson `#a3182a` (hover `#bd2436`); bronze `#b87333`, soft bronze `#d4a15c`
- ink (dark chrome) `#140b0d`, raised `#1f1416`
- light page: parchment `#fbf7f0`, footer `#efe5d4`, text `#1d1416`
- dark page: `#161113`, text `#efe6e2`; dark links `#ec8a96`, dark headings soft bronze
- code tokens: keyword crimson, function bronze-brown, builtin green, number purple

**Treatments**
- The header is always ink, with a 2px bronze rule under it. The footer has a 2px bronze rule on top.
- Headings are crimson in light mode and soft bronze in dark mode. Links are crimson. Active items and focus rings are crimson with a bronze accent stripe.
- Each surface gets its own **calm** background, distinct but compatible, and always low-contrast:
  - header: horizontal ink → deep crimson wash
  - behind the logo: soft radial bronze glow. Never clip the logo with a rounded box: the user objected when its corners were cut off.
  - sidebar: faint Greek-key (meander) SVG texture
  - content: gentle vertical parchment gradient, fixed while scrolling
- The logo is shown large, about 56px in a ~64px header.
- Every surface gets both light and dark variants.

**Why:** the user explicitly asked for this style to be remembered and applied across the project's docs, Pages website, README and wiki.

**How to apply:** use this style when creating or restyling any user-facing surface in these repos. Where markdown can't carry CSS (README, wiki), carry the style through the logo and badge colours (crimson `a3182a` / bronze `b87333`). Writerside was judged not worth adding on top of Dokka + Pages + README + wiki.
