/** P2.1 — reproducible property budgets (see docs/architecture/property-testing-p2.1.md). */

export const PROPERTY_SEED = Number.parseInt(process.env.THEMEON_PROPERTY_SEED ?? '20260919', 10)

export const PROPERTY_RUNS = Number.parseInt(process.env.THEMEON_PROPERTY_RUNS ?? '40', 10)

export const MAX_THEME_LEAVES = 12
export const MAX_ALIAS_DEPTH = 4
