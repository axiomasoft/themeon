import { formatDiagnostics } from '@themeon/core/compiler'
import type { CliOutputFormat, ExplainPayload, GraphPayload, InspectPayload, QueryPayload } from './types'
import { pathLabel } from './token-lookup'

function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortKeys(value))}\n`
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sortKeys)
  const record = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(record).sort()) {
    const item = record[key]
    if (item === undefined) continue
    sorted[key] = sortKeys(item)
  }
  return sorted
}

function renderInspectPretty(payload: InspectPayload): string {
  const lines = [
    `themeon inspect (${payload.config})`,
    `compiler ${payload.compilerVersion}`,
    ...(payload.fingerprint ? [`fingerprint ${payload.fingerprint}`] : []),
    `sys tokens ${payload.counts.sysTokens}, theme variants ${payload.counts.themeVariantTokens}`,
    `graph ${payload.counts.graphNodes} nodes, ${payload.counts.graphEdges} edges`,
    `resolved base vars ${payload.counts.resolvedBaseVars}`,
    `themes: ${payload.themes.join(', ') || '(none)'}`,
    `ref-layer ${payload.resolve.refLayer}${payload.resolve.aliases ? `, aliases ${payload.resolve.aliases}` : ''}`,
  ]
  if (payload.diagnostics.length > 0) {
    lines.push('', formatDiagnostics(payload.diagnostics, 'pretty'))
  }
  return `${lines.join('\n')}\n`
}

function renderExplainPretty(payload: ExplainPayload): string {
  const lines = [`${pathLabel(payload.path)}`, `  config: ${payload.config}`]
  if (payload.type) lines.push(`  type: ${payload.type}`)
  if (payload.cssVariable) lines.push(`  css variable: ${payload.cssVariable}`)
  if (payload.resolvedValue !== undefined) lines.push(`  resolved: ${payload.resolvedValue}`)
  if (payload.aliasChain.length > 0) {
    lines.push('  alias chain:')
    for (const step of payload.aliasChain) {
      const ref = step.ref ? ` → ${pathLabel(step.ref)}` : ''
      lines.push(`    - ${pathLabel(step.path)}${ref}`)
    }
  }
  const overrides = Object.entries(payload.themeOverrides)
  if (overrides.length > 0) {
    lines.push('  theme overrides:')
    for (const [theme, value] of overrides) lines.push(`    - ${theme}: ${value}`)
  }
  if (payload.diagnostics.length > 0) {
    lines.push('', formatDiagnostics(payload.diagnostics, 'pretty'))
  }
  return `${lines.join('\n')}\n`
}

function renderGraphPretty(payload: GraphPayload): string {
  const lines = [
    `themeon graph (${payload.config})`,
    `nodes ${payload.nodes.length}${payload.truncated ? ' (truncated)' : ''}, edges ${payload.edges.length}, order ${payload.order.length}`,
  ]
  if (payload.diagnostics.length > 0) {
    lines.push('', formatDiagnostics(payload.diagnostics, 'pretty'))
  }
  return `${lines.join('\n')}\n`
}

export function formatQueryPayload(payload: QueryPayload, format: CliOutputFormat): string {
  if (format === 'json') return stableStringify(payload)
  if (format === 'github') {
    if (payload.diagnostics.length === 0) return ''
    return `${formatDiagnostics(payload.diagnostics, 'github')}\n`
  }
  if (payload.command === 'inspect') return renderInspectPretty(payload)
  if (payload.command === 'explain') return renderExplainPretty(payload)
  return renderGraphPretty(payload)
}

export function queryExitCode(payload: QueryPayload): number {
  if (!payload.ok) return 1
  if (payload.diagnostics.some((d) => d.severity === 'error')) return 1
  return 0
}
