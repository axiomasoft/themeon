---
"@themeon/tailwind": minor
---

Fix the generated bridge form: it now emits `@theme reference { ... }` with literal values from
the resolver (not `@theme inline` with self-referential `var()`-mappings). The old form had two
blocking defects proven by compiling real Tailwind 4.3.2 output in a browser: (1) `--breakpoint-*`
mapped through a variable meant Tailwind interpolated a raw `var(...)` string into `@media
(width >= ...)`, an invalid media query that silently killed every `md:`/`lg:` responsive variant
(audit #4); (2) the self-referential `--x: var(--x)` form still emits a *global* `--x` declaration
in `:root,:host`, which — depending on CSS import order — collapses into an unresolvable cycle
that zeroes out every token in the page (audit #5). `--breakpoint-*` is now always emitted as a
literal; `--shadow-*` is the one exception kept as `var(--shadow-*)` (so shadows still swap with
`[data-theme]`); every other namespace uses the resolved literal value. Runtime theme-swapping for
non-shadow tokens (colours, spacing, radii, ...) is unaffected — only breakpoints stop being
theme-swappable, which they never validly were in Tailwind anyway (documented as a limitation in
the README).
