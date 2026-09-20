# Packed external-consumer matrix (P2.3)

Workspace integration tests (`tests/integration`) link `@themeon/*` through `workspace:*`.
That misses tarball export, declaration, peer-dependency, and bundler resolution failures that
real consumers hit after `npm install @themeon/...`.

## Commands

| Command | Purpose |
|:--|:--|
| `pnpm test:consumers` | `pnpm build`, pack all publishable packages to `.tmp-consumer-packs/`, run matrix |
| `node scripts/pack-consumer-tarballs.mjs` | Pack only (writes `manifest.json` with sha256 digests) |

## Matrix inventory

Source of truth: `tests/consumers/matrix.manifest.json` (eight cells):

| Cell | Scenario |
|:--|:--|
| `ts-esm-nodenext` | TypeScript `moduleResolution: NodeNext` + runtime import |
| `ts-esm-bundler` | TypeScript `moduleResolution: bundler` + subpaths |
| `node-dom-free` | Compiler + colors without DOM |
| `vite-virtual-css` | Vite + `virtual:themeon.css` from packed `@themeon/vite` |
| `vue-vite-dist` | `vue-tsc` against packed `@themeon/vue` declarations |
| `nuxt-ssr-build` | `nuxi build` with packed `@themeon/nuxt` |
| `laravel-css-import` | CSS `@import` of `@themeon/css` (channel A) |
| `tailwind-v4-bridge` | Tailwind 4 + `tailwindBridge` from packed `@themeon/tailwind` |

Each cell copies a fixture under `tests/consumers/fixtures/`, installs **only** from `file:` tarballs
(`npm overrides` for every `@themeon/*` package), then runs the declared steps. Tarball install logic
is shared with the types lane via `tests/internal/pack-harness/` (see `docs/testing/internal-kit.md`).
Failures print the cell id, resolver mode, step name, tarball digests, and command output.

## Gate self-check

`tests/consumers/src/gate-self.test.ts` patches a broken `@themeon/core` export surface and asserts
the matrix runner fails (proves the lane is not a no-op).

## CI

`verify.yml` runs `pnpm test:consumers` after integration tests and before `pnpm check:pack`.
