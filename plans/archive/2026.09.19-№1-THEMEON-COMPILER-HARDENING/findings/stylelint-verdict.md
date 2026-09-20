# Stylelint reuse evidence (P3.3 manifest → P3.5)

## Stable artifact (2026-09-20)

| Signal | Status |
|:--|:--|
| `.themeon/manifest.json` schema v1 (`cssVariables`, fingerprint) | **Green** — shipped in P3.3, consumer fixture reads without TS resolver |
| IR `$deprecated` → manifest `deprecatedCssVariables` | **Green** — additive manifest field emitted from `compileTheme` document |
| In-repo Stylelint consumers | **None** — no `stylelint` config in monorepo apps yet |
| External `@themeon/stylelint-plugin` on npm | **Absent** — audit recommendation only (D4) |

## Publication criteria (plan P3.5 / D4)

| Criterion | Status (P3.5) |
|:--|:--|
| Stable versioned artifact for resolver | **Met** — manifest v1 |
| ≥2 independent reuse sites outside monorepo | **Fail** — no Laravel/Vite consumer running Stylelint yet |
| Small stable public API | **Not defined** — rules co-evolve with manifest |
| Vendor alternative | No third-party plugin reads ThemeOn manifest | **Build in-repo** |

## P3.5 disposition

**Internal plugin** under `tests/stylelint-internal/` (not published). Rules:

- `themeon/unknown-custom-property` — theme-shaped `var(--*)` not listed in manifest `cssVariables`
- `themeon/deprecated-custom-property` — uses manifest `deprecatedCssVariables`

Explicit `manifestPath` option; **schema mismatch** reports `THEMEON_MANIFEST_UNAVAILABLE` (no silent fallback).

## Verdict

**Defer `@themeon/stylelint-plugin` package** — record as D9 (closed in P3.5). Promote only when an
external consumer adopts Stylelint with the manifest and a frozen export surface is proved.
