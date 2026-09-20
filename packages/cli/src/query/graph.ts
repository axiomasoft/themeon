import { aggregateDiagnostics, diagnosticsFromGraphIssues } from '@themeon/core/compiler'
import type { GraphEdgePayload, GraphNodePayload, GraphPayload } from './types'
import { CLI_QUERY_SCHEMA_VERSION } from './types'
import type { QueryContext } from './context'

export const GRAPH_OUTPUT_MAX_NODES = 4096
export const GRAPH_OUTPUT_MAX_EDGES = 8192

function capGraphPayload(
  ctx: QueryContext,
  nodes: GraphNodePayload[],
  edges: GraphEdgePayload[],
  order: string[],
): { truncated: boolean; diagnostics: ReturnType<typeof aggregateDiagnostics> } {
  let truncated = false
  const extra: import('@themeon/core/compiler').Diagnostic[] = []

  if (nodes.length > GRAPH_OUTPUT_MAX_NODES) {
    truncated = true
    nodes.length = GRAPH_OUTPUT_MAX_NODES
  }
  if (edges.length > GRAPH_OUTPUT_MAX_EDGES) {
    truncated = true
    edges.length = GRAPH_OUTPUT_MAX_EDGES
  }

  if (truncated) {
    extra.push({
      code: 'THEMEON_QUERY_GRAPH_TRUNCATED',
      severity: 'warning',
      message: `Graph output capped at ${GRAPH_OUTPUT_MAX_NODES} nodes and ${GRAPH_OUTPUT_MAX_EDGES} edges`,
      provenance: { stage: 'graph', producer: 'graph' },
    })
  }

  const diagnostics = aggregateDiagnostics([
    ...diagnosticsFromGraphIssues(ctx.graph.issues),
    ...(ctx.compileError ? [ctx.compileError] : []),
    ...extra,
  ])

  return { truncated, diagnostics }
}

export function buildGraphPayload(ctx: QueryContext): GraphPayload {
  const nodes: GraphNodePayload[] = [...ctx.graph.nodes.values()]
    .map((token) => ({
      id: token.id,
      path: token.path,
      type: token.type,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const edges: GraphEdgePayload[] = ctx.graph.edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
  }))

  const order = [...ctx.graph.order]
  const { truncated, diagnostics } = capGraphPayload(ctx, nodes, edges, order)

  const blocking = ctx.graph.issues.some((issue) => issue.code === 'CYCLE' || issue.code === 'DEPTH')

  return {
    schemaVersion: CLI_QUERY_SCHEMA_VERSION,
    command: 'graph',
    config: ctx.configRel,
    nodes,
    edges,
    order,
    truncated,
    diagnostics,
    ok: !blocking && !diagnostics.some((d) => d.severity === 'error'),
  }
}
