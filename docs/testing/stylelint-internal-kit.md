# Internal Stylelint kit (P3.5)

ThemeOn does **not** publish `@themeon/stylelint-plugin`. Manifest-backed lint rules live in-repo
only until an external consumer adopts them and a small stable public API exists (see D9).

## Disposition (2026-09-20)

| Branch | Evidence | Outcome |
|:--|:--|:--|
| npm `@themeon/stylelint-plugin` | No `packages/stylelint-plugin`; registry slot unused | **Not created** |
| Publication criteria | Manifest stable; no external Stylelint consumer | **Fail** → stay internal |
| Skip entirely | Manifest + rules implementable | **Rejected** — internal kit delivers value without npm surface |

## Manifest contract

`@themeon/vite` writes `.themeon/manifest.json` (schema v1). Lint rules read:

- `cssVariables` — allowlist for emitted custom properties
- `deprecatedCssVariables` — optional `{ name, message? }[]` from DTCG `$deprecated`

Unsupported `schemaVersion` → rules report `THEMEON_MANIFEST_UNAVAILABLE` (no silent ignore).

## Usage (monorepo)

```js
// stylelint.config.js
import themeonRules from '../tests/stylelint-internal/src/index.ts'

export default {
  plugins: themeonRules,
  rules: {
    'themeon/unknown-custom-property': [true, { manifestPath: '.themeon/manifest.json' }],
    'themeon/deprecated-custom-property': [true, { manifestPath: '.themeon/manifest.json' }],
  },
}
```

Run tests: `pnpm test:stylelint` from the repository root (builds `@themeon/core` first).

## When to promote a package

Re-open only when **all** hold:

1. At least one external repo runs Stylelint against ThemeOn manifest artifacts.
2. A frozen public API with no private `@themeon/core` imports on the export surface.
3. `pnpm check:pack` green on a new `packages/stylelint-plugin` tree.

Until then, extend `tests/stylelint-internal/` — do not add npm surface.
