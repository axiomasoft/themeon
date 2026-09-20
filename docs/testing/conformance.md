# Browser and adapter conformance (P2.6)

Integration tests prove framework adapters consume the **same compiled contract** the core
compiler emits (`resolveTheme` → `serializeThemeCss` / `ResolvedTheme` literals). Adapters must not
re-run naming or resolution with a parallel fixture graph.

## Vocabulary

| Class | Meaning |
|:--|:--|
| `consumed` | Adapter output includes compiler-resolved literals or the shared anti-FOUC generator |
| `ignored` | Token present in compiled CSS but intentionally absent from adapter-specific output |
| `diagnostic` | Invalid compiled input surfaces structured `[themeon]` / `BAD_COLOR` failures |

Case inventory: `tests/integration/src/conformance/matrix.manifest.json`.

## Shared fixture

| Artifact | Role |
|:--|:--|
| `tests/integration/src/conformance/compiled-contract.ts` | Canonical `conformanceTheme` + `canonicalThemeCss()` |
| `tests/integration/src/conformance/vocabulary.ts` | Shared `ConformanceClass` types |
| `tests/integration/src/helpers/browser.ts` | Playwright launcher (Chromium PR + periodic Firefox/WebKit) |

## Commands

| Command | Lane |
|:--|:--|
| `pnpm test:int` | `int-fast` + `int-browser` (Chromium only on PR `verify`) |
| `pnpm test:int:cross-browser` | Firefox/WebKit smoke (`THEMEON_CROSS_BROWSER` matrix) |

Adapter matrix tests live in `tests/integration/src/fast/adapter-conformance.test.ts`.
Anti-FOUC parity (Vite `transformIndexHtml` vs `@themeon/vue/anti-fouc`): covered in `adapter-conformance.test.ts`.

## Gate self-check

`tests/integration/src/fast/conformance-gate-self.test.ts` proves tampering adapter literals
without updating the compiler contract is detectable.

## `@themeon/testing` disposition (P3.4)

See `plans/2026.09.19-№1-THEMEON-COMPILER-HARDENING/decisions/D8-testing-kit-internal.md` and
`docs/testing/internal-kit.md`. Publication **deferred** — shared pack helpers live under
`tests/internal/pack-harness/`; conformance fixtures under `tests/integration/src/conformance/`.

## CI

| Workflow | When |
|:--|:--|
| `verify.yml` → `pnpm test:int` | Every PR (Chromium) |
| `.github/workflows/browser.yml` | Weekly + manual (Firefox/WebKit smoke) |
