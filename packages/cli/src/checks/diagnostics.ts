import {
  aggregateDiagnostics,
  formatDiagnostics,
} from '@themeon/core'
import type { Diagnostic } from '@themeon/core'
import type { Finding, Rule } from './types'

function fallbackCode(rule: Rule): string {
  if (rule === 'token-coverage') return 'THEMEON_CHECK_COVERAGE'
  if (rule === 'hardcode') return 'THEMEON_CHECK_HARDCODE'
  return 'THEMEON_CHECK_CONTRAST'
}

export function diagnosticFromFinding(finding: Finding): Diagnostic {
  return {
    code: finding.code ?? fallbackCode(finding.rule),
    severity: finding.level,
    message: finding.message,
    ...(finding.file !== undefined
      ? { source: { file: finding.file, ...(finding.line !== undefined ? { line: finding.line } : {}) } }
      : {}),
    provenance: { stage: 'check', producer: finding.rule },
  }
}

export function findingsToDiagnostics(findings: readonly Finding[]): readonly Diagnostic[] {
  return aggregateDiagnostics(findings.map(diagnosticFromFinding))
}

export function formatFinding(finding: Finding, format: 'pretty' | 'plain' | 'json' = 'plain'): string {
  return formatDiagnostics(findingsToDiagnostics([finding]), format)
}
