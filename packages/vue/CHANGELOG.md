# @themeon/vue

## 0.1.0

### Minor Changes

- add30e0: Reject malformed unquoted CSS URL tokens, including escaped `url` names, that could bypass
  the declaration guard through CSS error recovery. Validate resolved data at CSS serialization
  so compiler transforms and structural resolved objects cannot bypass the guard. Reject invalid
  color schemes and non-finite or non-string text line heights.

  Fix whole-literal color inference and keep dynamic token-group names conservatively typed.
  Constrain Vue's initial preference to registered theme names. Document TypeScript 5.4 as the
  minimum and test packed types on 5.4.5 with library checking enabled.

  Preserve the pre-existing single explicit tree/sys generic in `defineTokens<MyTree>()` and
  `defineTheme<MySys>()`; calls with inferred types keep the precise group and theme-name types.

- db99ce1: Opt-in typed theme names for `useTheme()` / `$theme`: augment the new `ThemeonRegister` interface
  (`declare module '@themeon/vue' { interface ThemeonRegister { theme: 'light' | 'dark' } }`).
  After that, `set()`, `toggle()`, `theme`, `preference`, `themes` and `system` use the registered
  union, with `'system'` always allowed as a preference. The union can be derived from a
  `@themeon/core` definition: `'light' | keyof (typeof theme)['themes']`. Without augmentation
  everything stays `string`. New types: `ThemeonRegister`, `ThemeName`, `ThemeNameOf`,
  `ThemePreference`.

### Patch Changes

- af498c9: Public option interfaces (`ResolveOptions`, `SerializeCssOptions`, `CompilerOptions`,
  `UseThemeOptions`, `ThemeInitScriptOptions`, `ThemeonViteOptions`, `ModuleOptions`,
  `ContrastOptions`, `ToNativeOptions`, CLI `*Options`, …) now declare optional properties as
  `?: T | undefined`. Consumers who enable `exactOptionalPropertyTypes` can forward a possibly
  undefined value (`{ resolve: options.resolve }`) without a type error. Runtime behaviour is
  unchanged. Structured outputs (DTCG and CLI diagnostics, migration hints, build results) no
  longer carry keys explicitly set to `undefined`; their JSON is unchanged.
- 01bd07d: Fix `init()`/`set()` crashing outside a real browser (jsdom, SSR) — audit #17. Only
  `localStorage` was guarded; `matchMedia` and `document` were accessed unconditionally, and the
  `initialized` flag was set to `true` **before** the throwing call, so even a retry with a proper
  shim was a silent no-op forever. Both globals are now gated on the actual presence of the
  function/object, not just on `typeof window`, and `initialized` is only set after a successful
  `apply()`.

  Augment `ComponentCustomProperties` so `$theme` (registered on `app.config.globalProperties`) is
  now typed for consumers — `vue-tsc` previously raised `TS2339` on any templated use of
  `$theme` (audit #27, Minor).

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
