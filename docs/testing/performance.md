# Performance benchmarks (P2.5)

## Intent

Reproducible compiler, runtime apply, DTCG interchange, and Vite plugin load timings on fixed in-repo corpora. Absolute milliseconds vary by hardware; CI gates use **ratio budgets** against `performance-baseline.json`, not universal SLA numbers.

## Corpus (`benchmarks/lib/corpus.mjs`)

| Corpus | Shape |
|:--|:--|
| `small` | ~200 color leaves, 2 theme patches |
| `medium` | ~2 000 leaves, 4 themes |
| `large` | ~10 000 leaves, 20 themes |
| `wideComponent` | 5 000 sibling component color tokens |
| `tenantPatch` | ~2 000 base leaves, 4 themes × 500 overrides |

Deep linear alias chains at 1 000+ depth are exercised in graph/property unit tests (`GRAPH_MAX_DEPTH` policy); the benchmark lane focuses on scale that is stable to author via `defineTheme`.

## Commands

| Command | Purpose |
|:--|:--|
| `pnpm bench` | Run harness → `benchmarks/last-report.json` (requires `pnpm build`) |
| `pnpm test:perf` | Self-check + build + bench + regression/correctness gate |

Warm samples default to **7** iterations (`THEMEON_BENCH_WARM_ITERATIONS`). Setup (corpus build, one cold compile) is outside timed regions.

## Gate

- **Regression:** each scenario in `scripts/performance-benchmark-includes.mjs` must stay within `baseline × (1 + regressionBudgetRatio)` (default **+30%**).
- **Correctness:** `small` compile fingerprint and CSS SHA-256 must match `performance-baseline.json` (detects silent output drift).
- **Self-check:** `scripts/performance-baseline-self-check.test.mjs` proves the gate fails when a floor is tampered below measured output (same pattern as mutation/coverage baselines).

Informational fields in the report (large cold compile, heap delta, CSS byte sizes) are recorded but not gated.

## CI lane

`.github/workflows/performance.yml` runs on **workflow_dispatch** and **weekly schedule** (Tuesday 05:00 UTC), not on every PR `verify` lane. Job budget: **20 minutes** (observed ~5 s locally on CI-class Ubuntu after build). The JSON report is uploaded as a workflow artifact.

## Ratchet

Lower baselines only after a green run on the target lane proves sustained improvement. Raise baselines when intentional compiler work regresses within budget but you want tighter future gates. Always update correctness fingerprints when small-corpus CSS output changes by design.
