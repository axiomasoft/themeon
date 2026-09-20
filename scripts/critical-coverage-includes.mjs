/** Repo-relative paths gated by `pnpm test:coverage` (see coverage-baseline.json). */
export const criticalCoverageIncludes = [
  'packages/core/src/resolve.ts',
  'packages/core/src/naming.ts',
  'packages/core/src/patch.ts',
  'packages/core/src/patch-grammar.ts',
  'packages/core/src/patch-policy.ts',
  'packages/core/src/serialize.ts',
  'packages/core/src/dtcg/from-dtcg.ts',
  'packages/colors/src/contrast.ts',
  'packages/colors/src/wcag22.ts',
  'packages/cli/src/commands/check.ts',
  'packages/cli/src/checks/contrast.ts',
  'packages/cli/src/checks/coverage.ts',
]
