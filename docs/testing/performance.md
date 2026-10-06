# Performance benchmarks (P2.5)

## Intent

Reproducible compiler, runtime apply, DTCG interchange, and Vite plugin load timings on fixed in-repo corpora. CI compares a fixed reference commit from `performance-baseline.json` with the candidate on the same runner, using the candidate's benchmark harness for both. Absolute recorded milliseconds remain a local diagnostic.

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
| `node benchmarks/compare.mjs <built-reference-directory>` | Three interleaved runs per revision; writes candidate and reference reports |
| `node scripts/check-performance-baseline.mjs --reference .tmp-performance-reference.json` | Same-runner regression gate with pinned correctness checks |

Warm samples default to **7** iterations (`THEMEON_BENCH_WARM_ITERATIONS`). Setup (corpus build, one cold compile) is outside timed regions. Runtime apply and cached Vite loads use batches of 100 and 1000 operations to reduce timer noise.

## Gate

- **Regression:** each scenario must stay within `reference × (1 + regressionBudgetRatio)` (default **+30%**). CI uses the median of three runs per revision, interleaved on one runner. The gate rejects mismatched Node, platform, architecture or sample counts. Without `--reference`, the recorded absolute timings are used and may fail on slower machines.
- **Correctness:** `small` compile fingerprint and CSS SHA-256 must match `performance-baseline.json` (detects silent output drift).
- **Self-check:** `scripts/performance-baseline-self-check.test.mjs` proves the gate fails when a floor is tampered below measured output (same pattern as mutation/coverage baselines).

Informational fields in the report (large cold compile, heap delta, CSS byte sizes) are recorded but not gated.

## CI lane

`.github/workflows/performance.yml` runs on **workflow_dispatch** and **weekly schedule** (Tuesday 05:00 UTC), not on every PR `verify` lane. Job budget: **20 minutes**, including both builds and three interleaved benchmark runs per revision. Both JSON reports are uploaded as workflow artifacts.

## Ratchet

Advance the immutable `referenceCommit` only after reviewing an intentional change in performance. Keep the same-runner ratio budget; do not raise absolute ceilings to accommodate different hardware. Update correctness fingerprints when small-corpus CSS output changes by design.
