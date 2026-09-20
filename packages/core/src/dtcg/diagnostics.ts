/**
 * Stable DTCG interchange diagnostics (P0.1). String `warnings[]` on import/export remain for
 * backward compatibility; every warning is also recorded here with a stable `code`.
 */

export type DTCGDiagnosticSeverity = 'error' | 'warning' | 'info'

export type DTCGDiagnosticCode =
  | 'THEMEON_DTCG_UNKNOWN_TYPE'
  | 'THEMEON_DTCG_UNSUPPORTED_REF'
  | 'THEMEON_DTCG_UNSUPPORTED_ROOT'
  | 'THEMEON_DTCG_UNSUPPORTED_EXTENDS'
  | 'THEMEON_DTCG_EXTENSIONS_NOT_CARRIED'
  | 'THEMEON_DTCG_LOSSY_IMPORT'
  | 'THEMEON_DTCG_UNRESOLVED_ALIAS'
  | 'THEMEON_DTCG_EMPTY_IMPORT'
  | 'THEMEON_DTCG_UNRECOGNIZED_VALUE'
  | 'THEMEON_DTCG_COMPOSITE_UNSUPPORTED'
  | 'THEMEON_DTCG_TYPOGRAPHY_PARTIAL'
  | 'THEMEON_DTCG_UNSAFE_KEY'
  | 'THEMEON_DTCG_UNEXPECTED_NODE'
  | 'THEMEON_DTCG_BUNDLE_RESOLVER'
  | 'THEMEON_DTCG_BUNDLE_HEURISTIC'
  | 'THEMEON_DTCG_THEME_UNKNOWN_PATH'
  | 'THEMEON_DTCG_EXPORT_UNREPRESENTABLE'
  | 'THEMEON_DTCG_EXPORT_TEXT_DEGRADED'

export interface DTCGDiagnostic {
  readonly code: DTCGDiagnosticCode
  readonly severity: DTCGDiagnosticSeverity
  readonly message: string
  readonly path?: readonly string[]
}

/** Collects parallel human messages and structured diagnostics. */
export class DTCGReportSink {
  readonly warnings: string[] = []
  readonly diagnostics: DTCGDiagnostic[] = []

  warn(code: DTCGDiagnosticCode, message: string, path?: readonly string[]): void {
    this.warnings.push(message)
    this.diagnostics.push({ code, severity: 'warning', message, path })
  }

  info(code: DTCGDiagnosticCode, message: string, path?: readonly string[]): void {
    this.warnings.push(message)
    this.diagnostics.push({ code, severity: 'info', message, path })
  }
}

const LOSSY_CODES: ReadonlySet<DTCGDiagnosticCode> = new Set([
  'THEMEON_DTCG_EXTENSIONS_NOT_CARRIED',
  'THEMEON_DTCG_LOSSY_IMPORT',
  'THEMEON_DTCG_COMPOSITE_UNSUPPORTED',
  'THEMEON_DTCG_EXPORT_UNREPRESENTABLE',
  'THEMEON_DTCG_EXPORT_TEXT_DEGRADED',
  'THEMEON_DTCG_TYPOGRAPHY_PARTIAL',
])

export function isLossyDtcgDiagnostic(code: DTCGDiagnosticCode): boolean {
  return LOSSY_CODES.has(code)
}

/** Maps legacy string warnings to stable codes (import/export v1 messages). */
export function diagnosticsFromWarnings(warnings: readonly string[]): DTCGDiagnostic[] {
  return warnings.map((message) => ({
    code: inferDtcgCode(message),
    severity: 'warning',
    message,
  }))
}

function inferDtcgCode(message: string): DTCGDiagnosticCode {
  if (message.includes('$extensions') && message.includes('not carried')) return 'THEMEON_DTCG_EXTENSIONS_NOT_CARRIED'
  if (message.includes('no resolvable $type')) return 'THEMEON_DTCG_UNKNOWN_TYPE'
  if (message.includes('unsupported $type')) return 'THEMEON_DTCG_UNKNOWN_TYPE'
  if (message.includes('unsupported $ref')) return 'THEMEON_DTCG_UNSUPPORTED_REF'
  if (message.includes('$root')) return 'THEMEON_DTCG_UNSUPPORTED_ROOT'
  if (message.includes('$extends')) return 'THEMEON_DTCG_UNSUPPORTED_EXTENDS'
  if (message.includes('unresolved alias')) return 'THEMEON_DTCG_UNRESOLVED_ALIAS'
  if (message.includes('0 tokens parsed')) return 'THEMEON_DTCG_EMPTY_IMPORT'
  if (message.includes('not supported structurally')) return 'THEMEON_DTCG_COMPOSITE_UNSUPPORTED'
  if (message.includes('typography field')) return 'THEMEON_DTCG_TYPOGRAPHY_PARTIAL'
  if (message.includes('unsafe key')) return 'THEMEON_DTCG_UNSAFE_KEY'
  if (message.includes('unexpected non-object')) return 'THEMEON_DTCG_UNEXPECTED_NODE'
  if (message.includes('resolver')) return 'THEMEON_DTCG_BUNDLE_RESOLVER'
  if (message.includes('tie for the most unique token paths')) return 'THEMEON_DTCG_BUNDLE_HEURISTIC'
  if (message.includes('patches unknown base path')) return 'THEMEON_DTCG_THEME_UNKNOWN_PATH'
  if (message.includes('bridged via $extensions')) return 'THEMEON_DTCG_EXPORT_UNREPRESENTABLE'
  if (message.includes('not DTCG "typography"')) return 'THEMEON_DTCG_EXPORT_TEXT_DEGRADED'
  if (message.includes('unrecognized $value') || message.includes('non-numeric $value')) {
    return 'THEMEON_DTCG_UNRECOGNIZED_VALUE'
  }
  return 'THEMEON_DTCG_LOSSY_IMPORT'
}
