/**
 * Repo-relative sources for targeted mutation (P2.2).
 * Narrower than critical coverage: graph/resolver, tenant policy, diagnostic decisions.
 */
export const criticalMutationIncludes = [
  'packages/core/src/graph/build.ts',
  'packages/core/src/resolve.ts',
  'packages/core/src/patch.ts',
  'packages/core/src/patch-policy.ts',
  'packages/core/src/errors.ts',
  'packages/core/src/diagnostics/catalog.ts',
  'packages/core/src/diagnostics/format.ts',
]
