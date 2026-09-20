import { SENSITIVE_DIAGNOSTIC_CODES } from './catalog'
import type { Diagnostic, RelatedLocation, SourceLocation } from './types'

const REDACTED = '[redacted]'

/** Quoted strings, CSS url(), and scheme payloads are the usual tenant-value leak vectors. */
const QUOTED = /(['"])(?:\\.|(?!\1).)*\1/g
const URL_FN = /url\s*\([^)]*\)/gi
const SCHEME = /\b(?:javascript|data|vbscript):[^\s)'"]*/gi

export function isSensitiveDiagnosticCode(code: string): boolean {
  return SENSITIVE_DIAGNOSTIC_CODES.has(code)
}

export function redactUnsafeText(text: string): string {
  return text.replace(URL_FN, `url(${REDACTED})`).replace(SCHEME, REDACTED).replace(QUOTED, REDACTED)
}

function freezePath(path: readonly string[] | undefined): readonly string[] | undefined {
  if (path === undefined) return undefined
  return Object.freeze(path.map((segment) => String(segment)))
}

function freezeSource(source: SourceLocation | undefined): SourceLocation | undefined {
  if (source === undefined) return undefined
  const next: SourceLocation = {
    ...(source.file !== undefined ? { file: source.file } : {}),
    ...(source.line !== undefined ? { line: source.line } : {}),
    ...(source.column !== undefined ? { column: source.column } : {}),
    ...(source.jsonPointer !== undefined ? { jsonPointer: source.jsonPointer } : {}),
  }
  return Object.freeze(next)
}

function freezeRelated(
  related: readonly RelatedLocation[] | undefined,
  sensitive: boolean,
): readonly RelatedLocation[] | undefined {
  if (related === undefined) return undefined
  return Object.freeze(
    related.map((item) =>
      Object.freeze({
        ...(item.message !== undefined
          ? { message: sensitive ? redactUnsafeText(item.message) : item.message }
          : {}),
        ...(item.path !== undefined ? { path: freezePath(item.path) } : {}),
        ...(item.source !== undefined ? { source: freezeSource(item.source) } : {}),
      }),
    ),
  )
}

/**
 * Freeze a diagnostic and, for tenant/untrusted codes, strip values from text fields.
 * Path tuples stay: they are token identity, not payload.
 */
export function redactDiagnostic(diagnostic: Diagnostic): Diagnostic {
  const sensitive = isSensitiveDiagnosticCode(diagnostic.code)
  const next: Diagnostic = {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: sensitive ? redactUnsafeText(diagnostic.message) : diagnostic.message,
    ...(diagnostic.path !== undefined ? { path: freezePath(diagnostic.path) } : {}),
    ...(diagnostic.source !== undefined ? { source: freezeSource(diagnostic.source) } : {}),
    ...(diagnostic.related !== undefined
      ? { related: freezeRelated(diagnostic.related, sensitive) }
      : {}),
    ...(diagnostic.hint !== undefined
      ? { hint: sensitive ? redactUnsafeText(diagnostic.hint) : diagnostic.hint }
      : {}),
    ...(diagnostic.documentation !== undefined ? { documentation: diagnostic.documentation } : {}),
    ...(diagnostic.provenance !== undefined ? { provenance: Object.freeze({ ...diagnostic.provenance }) } : {}),
  }
  return Object.freeze(next)
}
