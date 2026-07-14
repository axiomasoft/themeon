---
"@themeon/naive": minor
"@themeon/core": minor
---

Fix `toNative()` reading `resolved.vars` on the default resolve path (`refLayer:'referenced'`)
— that field carries `var(--ref)`-chain strings for CSS emit, not literal colours; every colour
this adapter emitted on the base/light theme was an unparsable `var(...)` string that crashed
Naive/seemly on the first non-trivial component (audit #2). Colours are now read from
`resolved.tokens[].value` (the resolver's reference-collapsed literal) instead.

`toNative()` is now fail-loud on unparsable colour roles (`var()`, `color-mix()`,
`light-dark()`, relative-color syntax, `currentColor`, `calc()`): it throws
`ThemeonError('BAD_COLOR')` (new error code on `@themeon/core`) listing every offending role,
unless `ToNativeOptions.onInvalidColor` is set to `'skip'`.

`common.baseColor` is no longer mapped from `--color-bg-subtle` (audit #3) — Naive's
`baseColor` is simultaneously the canvas extreme and the stock text colour on every solid
component, and no single ThemeOn role can stand in for both roles across arbitrary themes.
Ink is now painted per-component from `--color-on-<role>` (fallback `--color-on-primary`) and,
for canvas text (menu/anchor/tabs/ghost-buttons), from `--color-link` — both only for roles the
theme actually defines. `--color-bg-subtle` now maps to `actionColor`/`tableHeaderColor`/
`tabColor`, and `--color-bg-elevated` gained `tableColor`.

New `ToNativeOptions.appearance?: 'light' | 'dark'` selects the branch for ink tables that
differ between light/dark Naive defaults.
