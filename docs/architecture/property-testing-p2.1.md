# Property-based verification (P2.1)

## Tool decision

| Option | Verdict |
|:--|:--|
| Hand-written seeded loops only | Rejected for shrink/replay — maintenance cost grows with every new law. |
| **fast-check** `4.10.2` (devDependency on `@themeon/core` only) | **Adopted** — ecosystem fit for Vitest/Node, deterministic `seed`/`numRuns`, built-in shrinking. |
| @effect/schema / other generators | Out of scope — laws target frozen P1 compiler contracts, not new schemas. |

Domain **generators stay hand-written** (`packages/core/src/property/generators.ts`); fast-check wraps them as arbitraries. **Laws** live in `laws.ts`, separate from generators (P2.1 code guidance).

## Seeds and budgets

| Variable | Default | Role |
|:--|:--|:--|
| `THEMEON_PROPERTY_SEED` | `20260919` | PR/CI reproducibility |
| `THEMEON_PROPERTY_RUNS` | `40` | `numRuns` per law (keeps core suite under ~few seconds on CI) |

Run twice with the same seed — bit-identical counterexample streams (see `properties.test.ts`).

## Replay corpus

On failure, `harness.ts` writes `tests/fixtures/generated/replay/<law>-<timestamp>.json` with seed, law id, and JSON counterexample. Committed **regression replays** under `tests/fixtures/generated/replay/*.json` are replayed by `replay-corpus.test.ts` (no fast-check randomness).

## Commands

| Command | Purpose |
|:--|:--|
| `pnpm test:property` | Core property lane only (same seed defaults as CI) |
| `pnpm test` / `pnpm test:coverage` | Includes property tests via `@themeon/core` project |

Forced-bug harness demo: `THEMEON_PROPERTY_SELF_CHECK=1 pnpm test:property` (optional shrinking smoke; off in CI).
