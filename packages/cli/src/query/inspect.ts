import { aggregateDiagnostics, diagnosticsFromGraphIssues } from '@themeon/core/compiler'
import type { InspectPayload } from './types'
import { CLI_QUERY_SCHEMA_VERSION } from './types'
import type { QueryContext } from './context'

function themeVariantTokenCount(document: QueryContext['document']): number {
  let count = 0
  for (const list of Object.values(document.themes)) count += list.length
  return count
}

export function buildInspectPayload(ctx: QueryContext): InspectPayload {
  const compile = ctx.compile
  const graphDiagnostics = diagnosticsFromGraphIssues(ctx.graph.issues)
  const diagnostics = aggregateDiagnostics([
    ...graphDiagnostics,
    ...(ctx.compileError ? [ctx.compileError] : []),
    ...(compile ? [...compile.diagnostics] : []),
  ])

  const hasError =
    diagnostics.some((d) => d.severity === 'error') ||
    ctx.graph.issues.some((issue) => issue.code === 'CYCLE' || issue.code === 'DEPTH')

  return {
    schemaVersion: CLI_QUERY_SCHEMA_VERSION,
    command: 'inspect',
    compilerVersion: compile?.context.compilerVersion ?? '0.0.0',
    ...(compile ? { fingerprint: compile.fingerprint } : {}),
    config: ctx.configRel,
    counts: {
      sysTokens: ctx.document.tokens.length,
      themeVariantTokens: themeVariantTokenCount(ctx.document),
      resolvedBaseVars: compile?.resolved.vars ? Object.keys(compile.resolved.vars).length : 0,
      graphNodes: ctx.graph.nodes.size,
      graphEdges: ctx.graph.edges.length,
    },
    themes: Object.keys(ctx.document.themes).sort(),
    resolve: {
      refLayer: compile?.context.resolve.refLayer ?? 'referenced',
      ...(compile?.context.resolve.aliases ? { aliases: compile.context.resolve.aliases } : {}),
    },
    diagnostics,
    ok: !hasError && ctx.compileError === undefined,
  }
}
