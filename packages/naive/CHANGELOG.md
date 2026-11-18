# @themeon/naive

## 0.1.0

### Minor Changes

- 9c7e333: Fix `toNative()` reading `resolved.vars` on the default resolve path (`refLayer:'referenced'`)
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

### Patch Changes

- 01bd07d: Fix `hover`/`pressed`/`suppl` derivation (audit #21, Major): fixed deltas (`hover +0.06` /
  `pressed -0.06` / `suppl +0.10`, always applied in the same direction regardless of theme
  appearance) made `hover` and `pressed` visually indistinguishable in the default light theme
  (ΔL 0.007) and pushed `suppl` in the opposite direction from stock Naive UI's own dark-theme
  `*ColorSuppl` (which is _darker_ than primary, not lighter). Derivation now uses
  `@themeon/colors`' `STEP10_DELTA` (the scale's own step-9→step-10 lightness delta, signed per
  appearance) for `hover`, extrapolates the `base→hover` vector for `pressed` when an explicit
  hover is set (or applies the delta twice otherwise), and treats `suppl` as identity
  (`suppl = base`) — matching the lightness band stock Naive already occupies for that role. An
  explicit theme role always wins over derivation.
- af498c9: Public option interfaces (`ResolveOptions`, `SerializeCssOptions`, `CompilerOptions`,
  `UseThemeOptions`, `ThemeInitScriptOptions`, `ThemeonViteOptions`, `ModuleOptions`,
  `ContrastOptions`, `ToNativeOptions`, CLI `*Options`, …) now declare optional properties as
  `?: T | undefined`. Consumers who enable `exactOptionalPropertyTypes` can forward a possibly
  undefined value (`{ resolve: options.resolve }`) without a type error. Runtime behaviour is
  unchanged. Structured outputs (DTCG and CLI diagnostics, migration hints, build results) no
  longer carry keys explicitly set to `undefined`; their JSON is unchanged.
- Updated dependencies [01bd07d]
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
  - @themeon/colors@0.1.0
  - @themeon/core@0.1.0
