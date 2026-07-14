---
"@themeon/css": minor
---

Fix the Tailwind v4 co-existence recipe (README, audit #16) — the documented order put every
`themeon.*` layer below Tailwind's Preflight, breaking typography and `.btn`/component styling.
Added a new `layers-tailwind.css` entry with the verified `@layer` order statement.

`composition.css` primitives (`.container`, `.cover`, `.with-sidebar`) now declare
`box-sizing: border-box` locally, so they render correctly when imported without `reset.css`
(audit #26). `themeon.base` now sets an explicit `font-weight` on `h1..h4` (Tailwind Preflight's
`font-weight: inherit` otherwise wins regardless of layer order).

Default theme (`tokens.css`): the color scale regenerated on the fixed Radix-conformant ramp
(P8.5) changes 20 of 24 color variable values; `--color-focus-ring` and `--color-link` (dark)
gained literal overrides to clear the APCA contrast gate. Four new roles —
`--color-on-{success,warning,error,info}` — were added for UI adapters (`@themeon/naive`).
