import { redactDiagnostic } from './redact'
import type { Diagnostic } from './types'

/**
 * Canonicalize a list for consumers. Input order is preserved: formatters must not
 * re-sort. Each item is redacted/frozen so a later pretty/json pass cannot leak payload
 * or mutate severity.
 */
export function aggregateDiagnostics(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  return Object.freeze(diagnostics.map(redactDiagnostic))
}
