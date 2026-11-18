# @themeon/tailwind

## 0.1.0

### Minor Changes

- de86c7b: `themeon build` gained an opt-in `--tailwind-layers` flag (P-D67): it prepends the
  `@layer theme, base, themeon.tokens, …, components, utilities;` order-statement (the same
  statement as `@themeon/css/layers-tailwind.css`, P-D61) as the first line of the emitted
  `tokens.css`. Without the flag, output is byte-for-byte unchanged.

  This closes a gap in the P8.7 recipe: it fixed layer ordering for consumers importing
  `@themeon/css` directly, but not for the static-artifact channel (`themeon build → <link>`)
  that pilots like vintera use — there, `--radius-*`/`--font-*`/`--text-*` tokens whose names
  mirror Tailwind's own namespaces (by design, D5) were losing to Tailwind's defaults.

  `@themeon/tailwind` exports two new symbols: `TAILWIND_LAYER_ORDER` and
  `tailwindLayerPreamble()`.

- 01bd07d: Fix the generated bridge form: it now emits `@theme reference { ... }` with literal values from
  the resolver (not `@theme inline` with self-referential `var()`-mappings). The old form had two
  blocking defects proven by compiling real Tailwind 4.3.2 output in a browser: (1) `--breakpoint-*`
  mapped through a variable meant Tailwind interpolated a raw `var(...)` string into `@media
(width >= ...)`, an invalid media query that silently killed every `md:`/`lg:` responsive variant
  (audit #4); (2) the self-referential `--x: var(--x)` form still emits a _global_ `--x` declaration
  in `:root,:host`, which — depending on CSS import order — collapses into an unresolvable cycle
  that zeroes out every token in the page (audit #5). `--breakpoint-*` is now always emitted as a
  literal; `--shadow-*` is the one exception kept as `var(--shadow-*)` (so shadows still swap with
  `[data-theme]`); every other namespace uses the resolved literal value. Runtime theme-swapping for
  non-shadow tokens (colours, spacing, radii, ...) is unaffected — only breakpoints stop being
  theme-swappable, which they never validly were in Tailwind anyway (documented as a limitation in
  the README).

### Patch Changes

- Updated dependencies [f2c8cb5]
- Updated dependencies [01bd07d]
- Updated dependencies [b21b39a]
- Updated dependencies [5439ec7]
- Updated dependencies [682c572]
- Updated dependencies [54ccc22]
- Updated dependencies [63ffd44]
- Updated dependencies [b80bc8a]
- Updated dependencies [1128b88]
- Updated dependencies [861286c]
- Updated dependencies [9c7e333]
- Updated dependencies [add30e0]
- Updated dependencies [af498c9]
  - @themeon/core@0.1.0
