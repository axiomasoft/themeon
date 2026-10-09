# @themeon/vite

## 0.1.0

### Minor Changes

- 01bd07d: Fix the plugin's only documented connection method (audit #1, Blocker): `@import
'virtual:themeon.css'` inside a CSS file can never work — Vite's CSS pipeline resolves `@import`
  through `postcss-import`'s filesystem-only resolver, which never consults plugin `resolveId`/
  `load` hooks. The canonical channel is now a **JS-entry import** (`import
'virtual:themeon.css'` from a `.ts`/`.js` file); the README no longer shows the broken CSS-only
  recipe as the primary path.

  Fix HMR (audit #18, Major): the plugin's `hotUpdate` hook now returns `[mod]` instead of manually
  calling `hot.send({type: 'css-update', ...})` — the virtual module's internal `\0`-prefixed id
  never matches the client's HMR module map, so the hand-rolled payload was a silent no-op. Letting
  Vite build and send its own update payload is the only form that's robust to the id normalization.
  `tokensFiles` entries are now resolved to absolute paths once, in `configResolved`, fixing HMR for
  projects that (per the README's own example) pass relative paths.

  New `cssImport?: boolean | { file?: string }` option for CSS-only setups with no JS entry point
  (e.g. a plain Blade layout): the plugin writes the theme CSS to a real file on disk and aliases
  `virtualId` to it, so `@import 'virtual:themeon.css'` resolves as an ordinary file import — this
  is an additional channel, not a replacement for the canonical JS-import one.

### Patch Changes

- 1128b88: The Vite delivery manifest's `css` block is now a discriminated union on `delivery`
  (`ThemeonViteManifestVirtualCssV1 | ThemeonViteManifestFileCssV1`). `relativePath` is guaranteed
  for `'file'` and `virtualModuleId` for `'virtual'`; previously both were optional, and a file
  delivery without a path produced a manifest a PHP reader could not use.
  `buildViteManifest({ delivery: 'file' })` now requires `cssRelativePath` (type error, plus a
  runtime `BAD_VALUE` for JS callers). `@themeon/vite` writes `relativePath` with POSIX separators
  on every OS. The JSON shape and field order of valid manifests are unchanged.
- 8b4b4d7: Docs-only: added `docs/laravel.md` at the repo root, giving Laravel projects a single page that
  distinguishes the three Laravel-facing channels — the shipped-default-theme static `@import`
  (`@themeon/css/tokens.css`), this plugin's own custom-theme JS-import channel
  (`virtual:themeon.css`), and the `cssImport` pure-Blade channel — plus the Blade anti-FOUC
  snippet using `@themeon/vue/anti-fouc`. `packages/vite/README.md` gained one cross-link to it.
  No public API changed in any package.

  A new integration test (`tests/integration/src/browser/laravel-css-import.test.ts`) proves the
  static `@import` recipe resolves on a real `vite build` (not a mocked resolver), and that the
  opposite recipe — `@import "virtual:themeon.css"` with no plugin in the graph — fails the build,
  guarding that the two channels are not interchangeable.

- af498c9: Public option interfaces (`ResolveOptions`, `SerializeCssOptions`, `CompilerOptions`,
  `UseThemeOptions`, `ThemeInitScriptOptions`, `ThemeonViteOptions`, `ModuleOptions`,
  `ContrastOptions`, `ToNativeOptions`, CLI `*Options`, …) now declare optional properties as
  `?: T | undefined`. Consumers who enable `exactOptionalPropertyTypes` can forward a possibly
  undefined value (`{ resolve: options.resolve }`) without a type error. Runtime behaviour is
  unchanged. Structured outputs (DTCG and CLI diagnostics, migration hints, build results) no
  longer carry keys explicitly set to `undefined`; their JSON is unchanged.
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
- Updated dependencies [01bd07d]
- Updated dependencies [db99ce1]
  - @themeon/core@0.1.0
  - @themeon/vue@0.1.0
