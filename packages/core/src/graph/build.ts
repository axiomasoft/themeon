import { canonicalId } from '../model/ir'
import type { IrDocument, IrPath, IrToken } from '../model/ir'

/** Alias depth bound: a chain longer than this is treated as a policy failure, not a hang. */
export const GRAPH_MAX_DEPTH = 256

export type GraphEdgeKind = 'alias'

export interface GraphEdge {
  readonly from: string
  readonly to: string
  readonly kind: GraphEdgeKind
}

export type GraphIssue =
  | { readonly code: 'CYCLE'; readonly nodes: readonly string[]; readonly paths: readonly IrPath[] }
  | { readonly code: 'MISSING_REF'; readonly from: string; readonly ref: IrPath }
  | { readonly code: 'DEPTH'; readonly from: string; readonly depth: number }

export interface IrGraph {
  readonly nodes: ReadonlyMap<string, IrToken>
  readonly edges: readonly GraphEdge[]
  readonly adjacency: ReadonlyMap<string, readonly string[]>
  readonly issues: readonly GraphIssue[]
  /** Canonical ids in deterministic topological order (identity tie-break). */
  readonly order: readonly string[]
}

export function compareCanonicalId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function comparePath(a: IrPath, b: IrPath): number {
  return compareCanonicalId(canonicalId(a), canonicalId(b))
}

function cyclePaths(nodes: readonly string[], map: ReadonlyMap<string, IrToken>): IrPath[] {
  return nodes.map((id) => map.get(id)?.path ?? [])
}

/**
 * Build an alias graph from IR. Composite text values are leaves, not extra nodes.
 * Topological `order` uses Kahn's algorithm with a min-heap of canonical ids so
 * insertion order never affects the result.
 */
export function buildGraph(doc: IrDocument): IrGraph {
  const nodes = new Map<string, IrToken>(doc.tokens.map((token) => [token.id, token]))
  for (const list of Object.values(doc.themes)) {
    for (const token of list) nodes.set(token.id, token)
  }

  const edges: GraphEdge[] = []
  const issues: GraphIssue[] = []
  const outgoing = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  for (const id of nodes.keys()) {
    outgoing.set(id, [])
    indegree.set(id, 0)
  }

  for (const token of nodes.values()) {
    if (token.value.kind !== 'alias') continue
    const to = canonicalId(token.value.ref)
    if (!nodes.has(to)) {
      issues.push({ code: 'MISSING_REF', from: token.id, ref: token.value.ref })
      continue
    }
    edges.push({ from: token.id, to, kind: 'alias' })
    // Dependents of `to` become ready after `to` is emitted (evaluate targets first).
    outgoing.get(to)!.push(token.id)
    indegree.set(token.id, (indegree.get(token.id) ?? 0) + 1)
  }

  for (const [id, list] of outgoing) {
    list.sort(compareCanonicalId)
    outgoing.set(id, list)
  }

  const ready = [...nodes.keys()].filter((id) => (indegree.get(id) ?? 0) === 0).sort(compareCanonicalId)
  const order: string[] = []
  const remaining = new Map(indegree)
  while (ready.length > 0) {
    const id = ready.shift()!
    order.push(id)
    for (const next of outgoing.get(id) ?? []) {
      const nextDeg = (remaining.get(next) ?? 1) - 1
      remaining.set(next, nextDeg)
      if (nextDeg === 0) {
        ready.push(next)
        ready.sort(compareCanonicalId)
      }
    }
  }

  if (order.length !== nodes.size) {
    const leftover = [...nodes.keys()].filter((id) => !order.includes(id)).sort(compareCanonicalId)
    const cycle = leftover.length > 0 ? leftover : [...nodes.keys()]
    issues.push({ code: 'CYCLE', nodes: cycle, paths: cyclePaths(cycle, nodes) })
  }

  for (const token of nodes.values()) {
    if (token.value.kind !== 'alias') continue
    let depth = 0
    let current: IrToken | undefined = token
    const seen = new Set<string>()
    while (current?.value.kind === 'alias') {
      depth += 1
      if (depth > GRAPH_MAX_DEPTH) {
        issues.push({ code: 'DEPTH', from: token.id, depth })
        break
      }
      if (seen.has(current.id)) break
      seen.add(current.id)
      current = nodes.get(canonicalId(current.value.ref))
    }
  }

  const adjacency = new Map<string, readonly string[]>()
  for (const [id, list] of outgoing) adjacency.set(id, Object.freeze([...list]))

  return Object.freeze({
    nodes,
    edges: Object.freeze(edges),
    adjacency,
    issues: Object.freeze(issues),
    order: Object.freeze(order),
  })
}

export function graphHasBlockingIssue(graph: IrGraph): boolean {
  return graph.issues.some((issue) => issue.code === 'CYCLE' || issue.code === 'DEPTH')
}
