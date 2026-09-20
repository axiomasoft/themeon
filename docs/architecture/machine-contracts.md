# Machine contracts

Versioned artifacts consumers may read without importing TypeScript sources.

## Vite delivery manifest (schema v1)

- **Builder:** `buildViteManifest` / `serializeViteManifest` (`@themeon/core/compiler`)
- **Writer:** `@themeon/vite` → `.themeon/manifest.json` (atomic temp + rename)
- **Fields:** `schemaVersion`, `owner`, `fingerprint`, `css` (delivery + integrity), `themes`, `cssVariables`, optional `deprecatedCssVariables`
- **Tests:** `packages/core/src/formats/vite-delivery.test.ts`, `packages/vite/src/manifest.test.ts`, consumer fixture `tests/consumers/fixtures/vite-virtual-css`

Unsupported `schemaVersion` → consumers and internal Stylelint rules report unavailable manifest (no silent ignore).

## Anti-FOUC CSP artifact (schema v1)

- **Builder:** `buildCspArtifact` — CSP `sha256-…` over exact script bytes
- **Writer:** `.themeon/csp.json` when Vite `injectFouc` is enabled
- **Script source:** `@themeon/vue/anti-fouc` (`themeInitScript`)

## CLI semantic diff (v1)

- **Module:** `packages/cli/src/semantic.test.ts`, classification fixtures
- **Commands:** `themeon diff`, `doctor`, `migrate` (dry-run only)

## Generated API reports

Not duplicated here — see `docs/architecture/api-reports-p2.4.md` and `pnpm check:api`.
