/**
 * Structured compiler diagnostic (P1.4). Serializable, framework-free.
 * Machines consume `code` and fields; formatters must not change severity or order.
 */

export const DIAGNOSTIC_SCHEMA_VERSION = 1 as const

export type DiagnosticSeverity = 'error' | 'warning' | 'info'

export type DiagnosticFormat = 'pretty' | 'plain' | 'json' | 'github'

export type DiagnosticStage =
  | 'authoring'
  | 'dtcg'
  | 'graph'
  | 'normalize'
  | 'validate'
  | 'resolve'
  | 'transform'
  | 'validate-output'
  | 'emit'
  | 'serialize'
  | 'tenant'
  | 'check'
  | 'adapter'

export interface SourceLocation {
  readonly file?: string
  readonly line?: number
  readonly column?: number
  readonly jsonPointer?: string
}

export interface RelatedLocation {
  readonly message?: string
  readonly path?: readonly string[]
  readonly source?: SourceLocation
}

export interface DiagnosticProvenance {
  readonly stage?: DiagnosticStage
  readonly producer?: string
}

export interface Diagnostic {
  readonly code: string
  readonly severity: DiagnosticSeverity
  readonly message: string
  readonly path?: readonly string[]
  readonly source?: SourceLocation
  readonly related?: readonly RelatedLocation[]
  readonly hint?: string
  readonly documentation?: string
  readonly provenance?: DiagnosticProvenance
}

export interface DiagnosticFormatter {
  readonly format: DiagnosticFormat
  render(diagnostics: readonly Diagnostic[]): string
}

export interface DiagnosticReport {
  readonly schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION
  readonly diagnostics: readonly Diagnostic[]
}
