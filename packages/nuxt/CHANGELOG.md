# @themeon/nuxt

## 0.1.0

### Minor Changes

- 01bd07d: Fix `themeon.theme` never loading, at all — this is the module's core feature and it never
  worked on a live `nuxt dev` run (audit-adjacent finding, not in the original audit list). `@nuxt/
kit`'s `importModule` runs every loaded namespace through mlly's `interopDefault`, which tries to
  attach a synthetic `default` via `Object.defineProperty` inside a swallowed `try/catch` — but
  `defineTheme()` returns a frozen object, so the assignment throws, the catch swallows it, and
  `.default` comes back `undefined`. Every real project (including the one `themeon init`
  scaffolds) hit this on the very first `nuxt dev`. Theme loading is now done with a dedicated
  `jiti` loader (`interopDefault: false`) that accepts both `export default defineTheme(...)` and
  `export const theme = defineTheme(...)`, and throws a clear error naming the file if neither
  export is found (rather than the previous silent misload).

  Fix the dev-watcher regenerating byte-identical CSS on every save regardless of whether the
  theme actually changed (audit #20, Major): dedup now compares the _generated CSS output_, not a
  hash of the whole tokens directory — the `hashDir` mechanism (181ms on the playground, ~3.6s on
  the monorepo root, run synchronously on every filesystem save) is removed entirely. The watch
  scope is now always the theme's own directory (or the theme file itself, if it lives at the
  project/src root) — never the whole `rootDir`/`srcDir`.

### Patch Changes

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
- Updated dependencies [01757a8]
- Updated dependencies [861286c]
- Updated dependencies [9c7e333]
- Updated dependencies [add30e0]
- Updated dependencies [af498c9]
- Updated dependencies [01bd07d]
- Updated dependencies [db99ce1]
  - @themeon/core@0.1.0
  - @themeon/css@0.1.0
  - @themeon/vue@0.1.0
