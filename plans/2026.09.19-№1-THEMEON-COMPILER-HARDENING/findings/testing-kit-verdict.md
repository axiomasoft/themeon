# Testing-kit reuse evidence (P2.6 → P3.4)

## Internal reuse sites (2026-09-20)

| Site | Helpers / contract | Consumers |
|:--|:--|:--|
| `tests/integration/src/conformance/compiled-contract.ts` | Canonical theme + CSS SHA | Adapter matrix, browser smoke |
| `tests/integration/src/helpers/{browser,chromium,vite-build,fixture}.ts` | Playwright + Vite fixtures | `int-fast`, `int-browser`, `int-e2e` |
| `tests/consumers/src/harness/run-cell.ts` | Packed tarball matrix runner | Eight external consumer cells |
| `tests/types/src/harness/run-cell.ts` | Packed tarball type matrix | Positive/negative export guards |

**Count:** four internal surfaces; **one** framework adapter (`@themeon/naive`) exercises the full matrix.

## Publication criteria (plan P2.6 / P3.4)

| Criterion | Status (P3.4) |
|:--|:--|
| ≥2 independent reuse sites | Met **inside** monorepo only; no second external adapter |
| Small stable public API | Not defined — helpers embed core types and packed-install details |
| No private-core imports in package surface | Would fail if published verbatim today |
| Vendor `@themeon/testing` on npm | Absent by design — no `packages/testing` in workspace |

## P3.4 disposition

**Keep internal** — D8 affirmed. Consolidated duplicated pack-harness primitives under
`tests/internal/pack-harness/` (shared by `tests/consumers` and `tests/types`). No new npm package.

Promotion triggers and ownership: `docs/testing/internal-kit.md`.

## Verdict

**Defer `@themeon/testing` package** — recorded as D8 (closed in P3.4). Extract
`createThemeFixture`, `expectDiagnostic`, or browser harness to a package only when external reuse
and a frozen export surface are proved.
