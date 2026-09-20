# Testing strategy

ThemeOn uses Vitest across workspace packages plus a separate integration workspace
(`tests/integration`). CI and release share the reusable `verify.yml` workflow.

## Everyday commands

| Command | Purpose |
|:--|:--|
| `pnpm test` | Full unit test matrix (all Vitest projects) |
| `pnpm test:coverage` | Same tests + V8 coverage on **critical** sources only, then a non-regressive gate |
| `pnpm test:int` | Built packages + fast/browser integration projects |
| `pnpm test:consumers` | Packed tarball external-consumer matrix (no workspace links) |
| `pnpm verify` | Local mirror of reusable verify (build, lint, typecheck, coverage gate, manifests, int, pack) |

## Critical coverage gate (P0.6)

Global monorepo coverage percentage is intentionally **not** gated. Instead:

1. **`scripts/critical-coverage-includes.mjs`** lists repo-relative source paths (resolver, naming,
   tenant patch stack, DTCG import, serialization, colors contrast/WCAG, CLI check presentation).
2. **`vitest.config.ts`** scopes V8 coverage to those paths and excludes tests, fixtures, `dist/`,
   and CLI temp dirs.
3. **`coverage-baseline.json`** stores measured **lines** and **branches** floors (Vitest `4.1.10`,
   provider `v8`). The `auditTargets` block records audit goal percentages for a future ratchet —
   they are **not** enforced until measured baselines catch up.
4. **`scripts/check-critical-coverage.mjs`** reads `coverage/coverage-summary.json` and fails if
   any gated file drops below its baseline.
5. **`scripts/critical-coverage-baseline-self-check.test.mjs`** (in `pnpm test:coverage` after
   Vitest) proves the gate fails when a floor is tampered above the measured report.

Ratchet policy: raise a file floor only after coverage improves locally; never lower a baseline
without a named plan deviation. New critical files must enter the include list, baseline, and
`scripts/critical-coverage-baseline.test.mjs` in the same change.

## Out of scope for this gate

- Generated `dist/`, docs, and fixture trees
- Browser E2E and slow integration lanes (still required via `pnpm test:int`)
- Property-based compiler laws (`pnpm test:property`, P2.1 — see
  `docs/architecture/property-testing-p2.1.md`)
- Mutation testing (`pnpm test:mutation`, periodic `mutation.yml` — see `docs/testing/mutation.md`, P2.2)
- Packed external consumers (`pnpm test:consumers` — see `docs/testing/consumers.md`, P2.3)
- Framework glue packages (`vue`, `vite`, `nuxt`, …) — covered by integration tests, not line gates

## Manifest hygiene

`pnpm check:manifests` lists publishable workspace packages and fails on redundant
`devDependencies` entries that duplicate an identical `dependencies` specifier (workspace packages
already resolve through runtime deps during development).
