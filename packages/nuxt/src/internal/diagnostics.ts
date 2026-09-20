import { diagnosticFromUnknown, formatDiagnostics } from '@themeon/core'
import type { DiagnosticFormat } from '@themeon/core'

/** Adapter-side rendering of a thrown theme/compiler failure. Core stays presentation-free. */
export function formatThemeFailure(
  err: unknown,
  format: DiagnosticFormat = 'pretty',
  producer = '@themeon/nuxt',
): string {
  return formatDiagnostics(
    [diagnosticFromUnknown(err, { provenance: { stage: 'adapter', producer } })],
    format,
  )
}
