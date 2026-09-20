import { aggregateDiagnostics, type Diagnostic } from '@themeon/core/compiler'
import type { MigratePayload } from './semantic-types'
import { CLI_SEMANTIC_SCHEMA_VERSION } from './semantic-types'
import type { QueryContext } from './context'
import { buildSemanticDiff, migrationHintsFromChanges } from './semantic-diff'

/** Dry-run migration hints only — never mutates sources (P3.2). */
export function buildMigratePayload(fromCtx: QueryContext, toCtx: QueryContext): MigratePayload {
  const diff = buildSemanticDiff(fromCtx, toCtx)
  const hints = migrationHintsFromChanges(diff.changes)
  const diagnostics = aggregateDiagnostics([
    ...diff.diagnostics,
    ...(hints.length === 0 && diff.changes.length > 0
      ? [
          {
            code: 'THEMEON_MIGRATE_NO_HINTS',
            severity: 'warning',
            message: 'Changes detected but no automated migration hints were derived; review diff output',
            provenance: { stage: 'validate', producer: 'migrate' },
          } satisfies Diagnostic,
        ]
      : []),
  ])

  return {
    schemaVersion: CLI_SEMANTIC_SCHEMA_VERSION,
    command: 'migrate',
    fromConfig: fromCtx.configRel,
    toConfig: toCtx.configRel,
    dryRun: true,
    hints,
    changes: diff.changes,
    summary: diff.summary,
    diagnostics,
    ok: diff.summary.breaking === 0 && !diagnostics.some((d) => d.severity === 'error'),
  }
}
