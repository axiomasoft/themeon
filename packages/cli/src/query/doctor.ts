import { aggregateDiagnostics, diagnosticsFromGraphIssues, graphHasBlockingIssue } from '@themeon/core/compiler'
import type { DoctorCheck, DoctorPayload } from './semantic-types'
import { CLI_SEMANTIC_SCHEMA_VERSION } from './semantic-types'
import type { QueryContext } from './context'
import { buildSemanticDiff, migrationHintsFromChanges } from './semantic-diff'

export function buildDoctorPayload(ctx: QueryContext, baselineCtx?: QueryContext): DoctorPayload {
  const checks: DoctorCheck[] = []
  const graphBlocking = graphHasBlockingIssue(ctx.graph)

  if (ctx.compileError) {
    checks.push({
      id: 'compile',
      status: 'fail',
      message: ctx.compileError.message,
    })
  } else if (ctx.compile) {
    const warnCount = ctx.compile.diagnostics.filter((d) => d.severity === 'warning').length
    checks.push({
      id: 'compile',
      status: warnCount > 0 ? 'warn' : 'pass',
      message: warnCount > 0 ? `Compiled with ${warnCount} warning(s)` : 'Theme compiles',
    })
  } else {
    checks.push({ id: 'compile', status: 'fail', message: 'Theme compilation failed' })
  }

  if (graphBlocking) {
    checks.push({ id: 'graph', status: 'fail', message: 'Reference graph has blocking cycle or depth issue' })
  } else if (ctx.graph.issues.length > 0) {
    checks.push({ id: 'graph', status: 'warn', message: 'Reference graph reported non-blocking issues' })
  } else {
    checks.push({ id: 'graph', status: 'pass', message: 'Reference graph is healthy' })
  }

  let changes: DoctorPayload['changes'] = []
  let summary = { total: 0, breaking: 0, nonBreaking: 0, unknown: 0 }
  let hints: DoctorPayload['hints'] = []

  if (baselineCtx) {
    const diff = buildSemanticDiff(baselineCtx, ctx)
    changes = diff.changes
    summary = diff.summary
    hints = migrationHintsFromChanges(changes)
    const status = diff.summary.breaking > 0 ? 'fail' : diff.summary.unknown > 0 ? 'warn' : 'pass'
    checks.push({
      id: 'baseline-diff',
      status,
      message:
        status === 'pass'
          ? 'No breaking changes vs baseline'
          : status === 'warn'
            ? 'Changes vs baseline need review'
            : 'Breaking changes detected vs baseline',
    })
  }

  const diagnostics = aggregateDiagnostics([
    ...diagnosticsFromGraphIssues(ctx.graph.issues),
    ...(ctx.compileError ? [ctx.compileError] : []),
    ...(ctx.compile ? [...ctx.compile.diagnostics] : []),
  ])

  const failedCheck = checks.some((c) => c.status === 'fail')
  const ok = !failedCheck && !graphBlocking && ctx.compileError === undefined

  return {
    schemaVersion: CLI_SEMANTIC_SCHEMA_VERSION,
    command: 'doctor',
    config: ctx.configRel,
    ...(baselineCtx ? { baseline: baselineCtx.configRel } : {}),
    ...(ctx.compile?.fingerprint ? { fingerprint: ctx.compile.fingerprint } : {}),
    checks,
    hints,
    changes,
    summary,
    diagnostics,
    ok,
  }
}
