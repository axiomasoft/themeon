# @themeon/core

## 0.1.0

### Minor Changes

- f2c8cb5: Security: `resolveTheme` now rejects token values, variable names and theme names that could break
  out of their CSS declaration (`ThemeonError('UNSAFE_CSS_TOKEN')`, with the token path). A DTCG file
  with `$value: "red; } body { background: url(//evil) } :root {"`, a key such as `"x;}*{a"`, or a
  theme named `d"],*[y="` used to be written into `tokens.css` verbatim. The value guard is
  syntax-aware: `;` inside `url(...)`, functions or quoted strings (data URIs, font stacks) remains
  valid. Because the check sits in the resolver, every emitter is covered: the static serializer,
  the Tailwind bridge, the runtime applier and the UI-kit adapters.
- 01bd07d: Fix `toDTCG`/`fromDTCG` to emit and accept spec-conformant DTCG 2025.10 (audit #6/#7/#8/#9/#10/
  #11/#24/#25 — verdicts obtained by running the third-party `@terrazzo/parser` validator, not by
  assertion): colours are emitted as structural objects (`{colorSpace, components, alpha, hex}`)
  with a zero-dependency OKLCH→sRGB→hex fallback (no runtime dependency added — `@themeon/core`
  stays zero-dep); `dimension` is only emitted for `px`/`rem` (other units are unrepresentable in
  2025.10 and are now skipped with a warning + `$extensions` bridge instead of an invalid legacy
  string); `cubicBezier` is emitted as a 4-number array, never a named-easing string; token/group
  names containing `.`/`{`/`}` are escaped for DTCG (`space['1.5']` → `space["1-5"]`) with a bridge
  back to the original path; `$type` declared on the document root now inherits down instead of
  being silently ignored.

  `toDTCG` returns `{ files, warnings }` — no representable value is ever silently dropped; a new
  `ThemeonError('DTCG_NAME_COLLISION')` guards against two token paths escaping to the same DTCG
  name.

  `fromDTCG(files, opts?)` gains `FromDTCGOptions` (`base?`, `themes?`, `onEmpty?: 'warn' | 'error'`)
  so a caller can name which file is the base theme instead of relying on ThemeOn's own file-naming
  convention — third-party DTCG bundles (e.g. Tokens Studio exports) that don't follow it used to
  import as an empty theme with no warning at all. An import that yields zero tokens is now always
  either a `warning` (default) or a thrown `ThemeonError('DTCG_PARSE', ...)` (`onEmpty: 'error'`).

- 5439ec7: Precise token types. `defineTokens('color', …)` now returns `Token<'color'>` leaves (not the
  wide `Token`), and every well-known group maps to its `TokenType` (`space` → `dimension`,
  `text` → `text`, …). In other groups a reference keeps its target's type and numbers/text styles
  are inferred, which matches the runtime. `defineTheme(...).sys` is typed per group
  (`TokenizedSys`). New public types: `WellKnownGroupTypes`, `GroupTokenType`,
  `InferLeafTokenType`, `TokenizedSys`. This is source compatible: `Token<'color'>` is assignable to
  `Token`, `Tokenized<T>` keeps its old shape by default, and a precise `ThemeDefinition` is still
  accepted wherever a `ThemeDefinition` is expected.
- 54ccc22: New `applyThemePatch(base, patch, opts?)` / `serializeThemePatch(base, patch, opts?)` — validate
  a multi-tenant sys-patch against a strict per-`TokenType` positive allowlist grammar
  (`color`/`dimension`/`number`/`duration`/`fontFamily`/`fontWeight`/`text`, exported as
  `ALLOWED_TENANT_TYPES`) and turn it into a variable dictionary plus ready-to-inject CSS
  declarations (`:root { --token: value; }`, never a `<style>` tag). Fixes the confirmed
  stored-XSS/CSS-injection design hole (final-audit H3, И1): a tenant-supplied value like
  `red}</style><script>…` or `#fff;}` is now rejected loudly (`ThemeonError` with
  `UNSAFE_CSS_TOKEN`/`BAD_VALUE`/`UNKNOWN_PATH`/`UNSAFE_PATH`/`UNSUPPORTED_TENANT_TYPE`) instead of
  being escaped or silently dropped — `shadow`/`gradient`/`cubicBezier` stay operator-controlled in
  v1 and are explicitly rejected, not silently skipped. Output order always follows the base
  theme's token order (never the patch's own key order), so the same `(base, patch)` pair
  serializes byte-for-byte identically.
- 63ffd44: New `tenantThemeSchema(base, opts?)` in `@themeon/core` — builds a JSON Schema (draft 2020-12)
  describing the legal multi-tenant sys-patch shape for a given resolved theme: only
  `ALLOWED_TENANT_TYPES` paths are included, every leaf's `pattern` is drawn from the exact same
  grammar constants that `applyThemePatch`/`serializeThemePatch` validate against
  (`patch-grammar.ts`, single source of truth — no second copy of the regexes), and
  `additionalProperties: false` rejects tenant-added keys at every level. This is the external
  contract a PHP/Flex\* server validates tenant input against before ever calling into
  `@themeon/core` (defense-in-depth — the core still re-validates independently). New CLI command
  `themeon schema [--out <file.json>]` (`themeon` package) emits it from a `theme.config.ts`.
- b80bc8a: Typed theme names end to end. `defineTheme` infers the literal theme names from `themes`
  (`ThemeDefinition<TSys, 'dark' | 'hc'>`). `resolveTheme` carries them into
  `ResolvedTheme<'dark' | 'hc'>`, and `themeVars(resolved, 'drak')` becomes a compile-time error.
  `schemes` keys are checked against the declared themes plus the reserved `base`. All new
  model type parameters default to `string`, so explicitly wide types (`ThemeDefinition`, `ResolvedTheme`) and
  adapters behave as before. To pass a runtime-chosen name, widen the resolved theme
  (`const r: ResolvedTheme = resolveTheme(def)`); the runtime `UNKNOWN_PATH` guard still applies.
  Requires TypeScript ≥ 5.4 (`NoInfer`).
- 1128b88: The Vite delivery manifest's `css` block is now a discriminated union on `delivery`
  (`ThemeonViteManifestVirtualCssV1 | ThemeonViteManifestFileCssV1`). `relativePath` is guaranteed
  for `'file'` and `virtualModuleId` for `'virtual'`; previously both were optional, and a file
  delivery without a path produced a manifest a PHP reader could not use.
  `buildViteManifest({ delivery: 'file' })` now requires `cssRelativePath` (type error, plus a
  runtime `BAD_VALUE` for JS callers). `@themeon/vite` writes `relativePath` with POSIX separators
  on every OS. The JSON shape and field order of valid manifests are unchanged.
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

- add30e0: Reject malformed unquoted CSS URL tokens, including escaped `url` names, that could bypass
  the declaration guard through CSS error recovery. Validate resolved data at CSS serialization
  so compiler transforms and structural resolved objects cannot bypass the guard. Reject invalid
  color schemes and non-finite or non-string text line heights.

  Fix whole-literal color inference and keep dynamic token-group names conservatively typed.
  Constrain Vue's initial preference to registered theme names. Document TypeScript 5.4 as the
  minimum and test packed types on 5.4.5 with library checking enabled.

  Preserve the pre-existing single explicit tree/sys generic in `defineTokens<MyTree>()` and
  `defineTheme<MySys>()`; calls with inferred types keep the precise group and theme-name types.

### Patch Changes

- b21b39a: Fix the token-type heuristic for groups outside the well-known table: a dimension or duration is
  now inferred only from a whole numeric literal with a unit (`'16px'`, `'-0.5rem'`, `'200ms'`).
  The previous suffix match classified `'Helvetica, Arial, sans'` as `duration` and `'system'` as
  `dimension`, silently. Colour detection now requires a real hex literal (3/4/6/8 digits) or a CSS
  Color 4/5 function (`hwb()`, `lab()`, `lch()`, `color-mix()`, `light-dark()` are recognised too);
  `'#hashtag'` is no longer a colour. Well-known groups are unaffected.
- 682c572: `defineTokens` / `defineTheme` now fail loud with `ThemeonError('BAD_VALUE')` on a token leaf or
  theme-patch value that is not a string, a finite number, a text style or a Token reference.
  Previously `undefined` (most often a reference to a palette step that does not exist, e.g.
  `palette.forest[650]`), `null`, booleans and `NaN`/`Infinity` were accepted and serialized as
  literal `--color-a: undefined;` / `--x: NaN;` declarations. The error names the token path and,
  for `undefined`, hints at a missing reference.
- 861286c: Escape percent signs and line breaks in GitHub Actions diagnostic messages, and also colons
  and commas in file properties. Hostile token paths, messages or source filenames cannot create
  additional workflow commands or annotation properties.
- af498c9: Public option interfaces (`ResolveOptions`, `SerializeCssOptions`, `CompilerOptions`,
  `UseThemeOptions`, `ThemeInitScriptOptions`, `ThemeonViteOptions`, `ModuleOptions`,
  `ContrastOptions`, `ToNativeOptions`, CLI `*Options`, …) now declare optional properties as
  `?: T | undefined`. Consumers who enable `exactOptionalPropertyTypes` can forward a possibly
  undefined value (`{ resolve: options.resolve }`) without a type error. Runtime behaviour is
  unchanged. Structured outputs (DTCG and CLI diagnostics, migration hints, build results) no
  longer carry keys explicitly set to `undefined`; their JSON is unchanged.
