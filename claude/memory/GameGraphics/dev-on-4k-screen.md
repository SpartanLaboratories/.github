---
name: dev-on-4k-screen
description: The user develops and tests this client on a 4K screen
metadata: 
  node_type: memory
  type: project
  originSessionId: f5d5fbb4-7a96-4091-bdeb-1f772376173c
  modified: 2026-08-30T18:50:33.879Z
---

The user develops and tests this client on a **4K (3840x2160) screen**, and the
window opens borderless-fullscreen at the primary monitor's native resolution.

**How to apply:** when eyeballing on-screen sizes/positions, assume a 4K target.

Note: UI element coordinates are now **screen-relative fractions (0..1)** (see
`Element.position` / `screenRect` in `com.spartanlabs.graphics.ui`), so the UI is
resolution-independent — this is no longer a source of "off-screen on 1080p" bugs.
[[gametools-geometry-and-root-package]]
