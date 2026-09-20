# Architecture documentation

Durable descriptions of ThemeOn's compiler, packages, and machine contracts. These pages
**outlive** execution plans under `plans/`; when behavior changes, update the doc named here
and its owning tests in the same change.

## Index

| Document | Topic | Machine owner (tests / source) |
|:--|:--|:--|
| [overview.md](./overview) | Authoring → IR → compiler → delivery → runtime | `packages/core/src/pipeline/compile.test.ts` |
| [current-compiler.md](./current-compiler) | Module seams and consumer map | `packages/core/src/characterization.test.ts` |
| [package-graph.md](./package-graph) | Workspace packages and dependencies | `pnpm-workspace.yaml`, package `package.json` |
| [compiler-compatibility.md](./compiler-compatibility) | Subpath exports and migration | `packages/core/src/public/exports.test.ts` |
| [diagnostics-and-errors.md](./diagnostics-and-errors) | Diagnostic codes and formats | `packages/core/src/diagnostics/catalog.ts`, CLI format tests |
| [machine-contracts.md](./machine-contracts) | Vite manifest, CSP artifact, CLI schemas | `packages/core/src/formats/vite-delivery.test.ts`, `packages/cli/src/schema.test.ts` |
| [security-model.md](./security-model) | Tenant patch envelope | `packages/core/src/patch-policy.test.ts` |
| [release-security.md](./release-security) | CI/release trust | `.github/workflows/verify.yml` |
| [testing-strategy.md](./testing-strategy) | Verification lanes | `vitest.config.ts`, `scripts/check-critical-coverage.mjs` |
| [property-testing-p2.1.md](./property-testing-p2.1) | Property-based laws | `packages/core/src/property/` |
| [api-reports-p2.4.md](./api-reports-p2.4) | Generated API reports | `scripts/check-api-report.mjs` |
| [tooling-outcomes-p3.md](./tooling-outcomes-p3) | Internal testing + Stylelint kits (D8/D9) | `docs/testing/internal-kit.md`, `docs/testing/stylelint-internal-kit.md` |

## ADRs

Immutable design decisions for IR live under [ADR index](/adr/).

## Plan decisions

Accepted cross-cutting decisions (D1–D9) are recorded in the
[compiler-hardening plan decisions folder](https://github.com/axioma-studio/themeon/tree/main/plans/2026.09.19-%E2%84%961-THEMEON-COMPILER-HARDENING/decisions).

## Drift check

```sh
pnpm check:docs-architecture
```

Fails when index/manifest lists diverge, `ROADMAP.md` is missing, or known stale claims reappear.
