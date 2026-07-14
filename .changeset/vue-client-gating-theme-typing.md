---
"@themeon/vue": patch
---

Fix `init()`/`set()` crashing outside a real browser (jsdom, SSR) — audit #17. Only
`localStorage` was guarded; `matchMedia` and `document` were accessed unconditionally, and the
`initialized` flag was set to `true` **before** the throwing call, so even a retry with a proper
shim was a silent no-op forever. Both globals are now gated on the actual presence of the
function/object, not just on `typeof window`, and `initialized` is only set after a successful
`apply()`.

Augment `ComponentCustomProperties` so `$theme` (registered on `app.config.globalProperties`) is
now typed for consumers — `vue-tsc` previously raised `TS2339` on any templated use of
`$theme` (audit #27, Minor).
