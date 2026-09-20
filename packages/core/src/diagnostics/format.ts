import { DIAGNOSTIC_SCHEMA_VERSION } from './types'
import type { Diagnostic, DiagnosticFormat, DiagnosticFormatter, DiagnosticReport } from './types'

const FORMATTERS: Record<DiagnosticFormat, DiagnosticFormatter> = {
  json: { format: 'json', render: renderJson },
  plain: { format: 'plain', render: renderPlain },
  pretty: { format: 'pretty', render: renderPretty },
  github: { format: 'github', render: renderGithub },
}

export function createFormatter(format: DiagnosticFormat): DiagnosticFormatter {
  return FORMATTERS[format]
}

/** Render diagnostics. Never changes severity or ordering of the input list. */
export function formatDiagnostics(
  diagnostics: readonly Diagnostic[],
  format: DiagnosticFormat = 'pretty',
): string {
  return FORMATTERS[format].render(diagnostics)
}

function pathLabel(path: readonly string[] | undefined): string {
  return path && path.length > 0 ? path.join('.') : ''
}

function renderPlain(diagnostics: readonly Diagnostic[]): string {
  return diagnostics
    .map((d) => {
      const location = pathLabel(d.path)
      const file = d.source?.file
        ? `${d.source.file}${d.source.line !== undefined ? `:${d.source.line}` : ''}`
        : ''
      return [d.severity, d.code, location, file, d.message].filter((part) => part !== '').join(' ')
    })
    .join('\n')
}

function renderPretty(diagnostics: readonly Diagnostic[]): string {
  return diagnostics
    .map((d) => {
      const location = pathLabel(d.path)
      const at = location ? ` at ${location}` : ''
      const file = d.source?.file
        ? ` (${d.source.file}${d.source.line !== undefined ? `:${d.source.line}` : ''})`
        : ''
      const lines = [`${d.severity} ${d.code}${at}${file}`, `  ${d.message}`]
      if (d.hint) lines.push(`  hint: ${d.hint}`)
      if (d.related && d.related.length > 0) {
        for (const item of d.related) {
          const relPath = pathLabel(item.path)
          lines.push(`  related${relPath ? ` ${relPath}` : ''}${item.message ? `: ${item.message}` : ''}`)
        }
      }
      return lines.join('\n')
    })
    .join('\n')
}

function githubAnnotationLevel(severity: Diagnostic['severity']): 'error' | 'warning' | 'notice' {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'notice'
}

/** GitHub Actions workflow command format (file/line annotations). */
function renderGithub(diagnostics: readonly Diagnostic[]): string {
  return diagnostics
    .map((d) => {
      const parts: string[] = []
      if (d.source?.file) parts.push(`file=${d.source.file}`)
      if (d.source?.line !== undefined) parts.push(`line=${d.source.line}`)
      if (d.source?.column !== undefined) parts.push(`col=${d.source.column}`)
      const title = `${d.code}: ${d.message}`
      const suffix = parts.length > 0 ? ` ${parts.join(',')}` : ''
      return `::${githubAnnotationLevel(d.severity)}${suffix}::${title}`
    })
    .join('\n')
}

function renderJson(diagnostics: readonly Diagnostic[]): string {
  const report: DiagnosticReport = {
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    diagnostics,
  }
  return `${stableStringify(report)}\n`
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value))
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
