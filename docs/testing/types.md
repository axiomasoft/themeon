# TypeScript compatibility fixtures (P2.4)

Packed tarballs (never `workspace:*`) prove supported call sites and guard against silent type narrowing.

## Commands

| Command | Purpose |
|:--|:--|
| `pnpm test:types` | `pnpm build`, pack to `.tmp-consumer-packs/`, run matrix |
| `pnpm test:types` only | Assumes packs exist or uses vitest global setup to pack |

The types lane reuses `.tmp-consumer-packs/` when `THEMEON_CONSUMER_PACK_DIR` is set (same directory as `pnpm test:consumers`). Pack install helpers: `tests/internal/pack-harness/` (`docs/testing/internal-kit.md`).

## Matrix

Source of truth: `tests/types/matrix.manifest.json`

| Cell | Role |
|:--|:--|
| `positive-core-subpaths` | Root + `@themeon/core/*` subpaths typecheck together |
| `positive-colors` | `@themeon/colors` public API |
| `positive-vue-subpaths` | `@themeon/vue` and `./anti-fouc` |
| `positive-vite` | `@themeon/vite` plugin factory + options type |
| `negative-unexported-subpath` | `@ts-expect-error` on a path outside `exports` |

## Gate self-check

`tests/types/src/gate-self.test.ts` removes an expected error suppression and asserts `tsc` fails.
