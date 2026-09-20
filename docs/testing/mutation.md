# Mutation testing (P2.2)

## Tool decision

| Option | Verdict |
|:--|:--|
| Infection (PHP) | N/A — compiler under test is TypeScript/Vitest. |
| Whole-repo Stryker on every PR | Rejected — ~2 min local / unbounded CI cost; violates P2.2 scope. |
| **Stryker Mutator** `10.0.0` + `@stryker-mutator/vitest-runner` + `typescript-checker` | **Adopted** — official Vitest 4 integration, JSON report, per-file thresholds. |

Mutation scope is a **narrow allowlist** (`scripts/critical-mutation-includes.mjs`): graph build, resolver, tenant patch stack, error surface, diagnostic catalog/format. It is intentionally smaller than the P0.6 coverage include set.

## Commands

| Command | Purpose |
|:--|:--|
| `pnpm test:mutation` | Self-check + Stryker run + non-regressive MSI gate |
| `pnpm test:mutation:report` | Stryker only (refreshes `mutation/mutation-report.json`) |

Vitest for Stryker uses `stryker.vitest.config.ts` (core package only, excludes `src/property/**` — property laws stay on the `pnpm test:property` lane).

## Metrics and gate

- **Covered MSI** = `(killed + timeout) / (killed + timeout + survived)` on mutants Stryker could reach with tests (matches Stryker’s “covered” column).
- Floors live in `mutation-baseline.json` (measured 2026-09-20, ~0.5% buffer below observed).
- `scripts/check-mutation-baseline.mjs` reads `mutation/mutation-report.json` after each run.
- `scripts/mutation-baseline-self-check.test.mjs` proves the gate fails when the overall floor is raised above the report (same pattern as P0.6 coverage).

Survivors are triaged in `mutation-survivors.json` (equivalent, deferred, or partially addressed). **Blocking** survivors must be killed or reclassified before lowering a floor.

## CI lane

`.github/workflows/mutation.yml` runs on **workflow_dispatch** and **weekly schedule** (not on every PR `verify` lane). Job `timeout-minutes: 15` (observed ~2 min on CI-class hardware locally). The raw JSON report is uploaded as a workflow artifact.

## Ratchet

Raise per-file or overall `coveredMsi` only after a green local run improves the score; never lower a floor without a named plan deviation. New critical decision modules must join the include list, baseline, and survivor ledger in the same change.
