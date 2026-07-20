---
"@themeon/tailwind": minor
"@themeon/cli": minor
---

`themeon build` gained an opt-in `--tailwind-layers` flag (P-D67): it prepends the
`@layer theme, base, themeon.tokens, …, components, utilities;` order-statement (the same
statement as `@themeon/css/layers-tailwind.css`, P-D61) as the first line of the emitted
`tokens.css`. Without the flag, output is byte-for-byte unchanged.

This closes a gap in the P8.7 recipe: it fixed layer ordering for consumers importing
`@themeon/css` directly, but not for the static-artifact channel (`themeon build → <link>`)
that pilots like vintera use — there, `--radius-*`/`--font-*`/`--text-*` tokens whose names
mirror Tailwind's own namespaces (by design, D5) were losing to Tailwind's defaults.

`@themeon/tailwind` exports two new symbols: `TAILWIND_LAYER_ORDER` and
`tailwindLayerPreamble()`.
