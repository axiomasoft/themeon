import { formatDiagnostics } from '@themeon/core/compiler'
import type { CliOutputFormat } from './types'
import type { DiffPayload, DoctorPayload, MigratePayload, SemanticPayload } from './semantic-types'
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

function renderDiffPretty(payload: DiffPayload): string {
  const lines = [
    `themeon diff (${payload.oldConfig} → ${payload.newConfig})`,
    ...(payload.oldFingerprint && payload.newFingerprint
      ? [`fingerprints ${payload.oldFingerprint} → ${payload.newFingerprint}`]
      : []),
    `changes ${payload.summary.total} (breaking ${payload.summary.breaking}, unknown ${payload.summary.unknown})`,
  ]
  for (const change of payload.changes) {
    const where = change.path ? pathLabel(change.path) : '(theme)'
    const theme = change.theme ? ` [${change.theme}]` : ''
    lines.push(`  - ${change.class} (${change.safety}, ${change.confidence}) ${where}${theme}`)
  }
  if (payload.diagnostics.length > 0) lines.push('', formatDiagnostics(payload.diagnostics, 'pretty'))
  return `${lines.join('\n')}\n`
}

function renderDoctorPretty(payload: DoctorPayload): string {
  const lines = [`themeon doctor (${payload.config})`]
  if (payload.baseline) lines.push(`baseline ${payload.baseline}`)
  if (payload.fingerprint) lines.push(`fingerprint ${payload.fingerprint}`)
  for (const check of payload.checks) lines.push(`  [${check.status}] ${check.id}: ${check.message}`)
  if (payload.hints.length > 0) {
    lines.push('', 'migration hints (dry-run):')
    for (const hint of payload.hints) lines.push(`  - (${hint.confidence}) ${hint.message}`)
  }
  if (payload.diagnostics.length > 0) lines.push('', formatDiagnostics(payload.diagnostics, 'pretty'))
  return `${lines.join('\n')}\n`
}

function renderMigratePretty(payload: MigratePayload): string {
  const lines = [
    `themeon migrate (dry-run) ${payload.fromConfig} → ${payload.toConfig}`,
    `changes ${payload.summary.total} (breaking ${payload.summary.breaking})`,
  ]
  if (payload.hints.length > 0) {
    lines.push('', 'hints:')
    for (const hint of payload.hints) lines.push(`  - (${hint.confidence}) ${hint.message}`)
  } else {
    lines.push('hints: (none)')
  }
  if (payload.diagnostics.length > 0) lines.push('', formatDiagnostics(payload.diagnostics, 'pretty'))
  return `${lines.join('\n')}\n`
}

export function formatSemanticPayload(payload: SemanticPayload, format: CliOutputFormat): string {
  if (format === 'json') return stableStringify(payload)
  if (format === 'github') {
    if (payload.diagnostics.length === 0) return ''
    return `${formatDiagnostics(payload.diagnostics, 'github')}\n`
  }
  if (payload.command === 'diff') return renderDiffPretty(payload)
  if (payload.command === 'doctor') return renderDoctorPretty(payload)
  return renderMigratePretty(payload)
}

export function semanticExitCode(payload: SemanticPayload): number {
  if (!payload.ok) return 1
  if (payload.diagnostics.some((d) => d.severity === 'error')) return 1
  if (payload.command === 'diff' || payload.command === 'migrate') {
    if (payload.summary.breaking > 0) return 1
  }
  return 0
}
