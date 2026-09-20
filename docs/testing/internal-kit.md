# Internal testing kit (P3.4)

ThemeOn does **not** publish `@themeon/testing`. Shared verification helpers live in-repo only
until a second external adapter and a small stable public API exist (see D8).

## Disposition (2026-09-20)

| Branch | Evidence | Outcome |
|:--|:--|:--|
| npm `@themeon/testing` | No `packages/testing`; registry slot unused | **Not created** |
| Publication criteria (P2.6) | Internal reuse ≥2 sites; no second external adapter; helpers embed core IR | **Fail** → stay internal |
| Vendor alternative | No third-party kit matches packed-tarball + adapter conformance needs | **Build in-repo** |

## Ownership map

| Surface | Path | Role |
|:--|:--|:--|
| Packed tarball install | `tests/internal/pack-harness/` | Shared `file:` install + digests for consumer/types matrices |
| External consumer matrix | `tests/consumers/src/harness/` | Cell runner + matrix manifest |
| TypeScript compatibility | `tests/types/src/harness/` | Positive/negative `tsc` cells |
| Adapter/browser conformance | `tests/integration/src/conformance/` | Canonical compiled contract + vocabulary |
| Integration fixtures | `tests/integration/src/helpers/` | Playwright, Vite/Nuxt dev, temp dirs |

Copy patterns from `docs/testing/conformance.md` and this file; do not import private paths from
published packages.

## When to promote a package

Re-open only when **all** hold:

1. Two independent reuse sites outside this monorepo (or two distinct published adapters).
2. A frozen public API with no `@themeon/core` private imports on the export surface.
3. `pnpm check:pack` green on a new `packages/testing` tree.

Until then, extend `tests/internal/` or the nearest lane harness — do not add npm surface.
