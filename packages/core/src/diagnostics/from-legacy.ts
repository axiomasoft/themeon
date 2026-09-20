import { ThemeonError } from '../errors'
import { GRAPH_MAX_DEPTH } from '../graph/build'
import type { GraphIssue } from '../graph/build'
import type { DTCGDiagnostic } from '../dtcg/diagnostics'
import { aggregateDiagnostics } from './aggregate'
import {
  diagnosticCodeFromDtcg,
  diagnosticCodeFromGraphIssue,
  diagnosticCodeFromThemeonError,
} from './catalog'
import { redactDiagnostic } from './redact'
import type { Diagnostic, DiagnosticProvenance, RelatedLocation } from './types'

function pathFromCanonicalId(id: string): readonly string[] | undefined {
  try {
    const parsed: unknown = JSON.parse(id)
    if (Array.isArray(parsed) && parsed.every((segment) => typeof segment === 'string')) {
      return parsed
    }
  } catch {
    /* canonical id is JSON.stringify(path); ignore non-JSON leftovers */
  }
  return undefined
}

export function diagnosticFromThemeonError(
  error: ThemeonError,
  extras: { readonly provenance?: DiagnosticProvenance; readonly source?: Diagnostic['source'] } = {},
): Diagnostic {
  return redactDiagnostic({
    code: diagnosticCodeFromThemeonError(error.code),
    severity: 'error',
    message: error.message,
    ...(error.path !== undefined ? { path: error.path } : {}),
    ...(error.hint !== undefined ? { hint: error.hint } : {}),
    ...(extras.source !== undefined ? { source: extras.source } : {}),
    ...(extras.provenance !== undefined ? { provenance: extras.provenance } : {}),
  })
}

export function diagnosticFromDtcg(
  diagnostic: DTCGDiagnostic,
  extras: { readonly provenance?: DiagnosticProvenance; readonly source?: Diagnostic['source'] } = {},
): Diagnostic {
  return redactDiagnostic({
    code: diagnosticCodeFromDtcg(diagnostic.code),
    severity: diagnostic.severity,
    message: diagnostic.message,
    ...(diagnostic.path !== undefined ? { path: diagnostic.path } : {}),
    provenance: extras.provenance ?? { stage: 'dtcg' },
    ...(extras.source !== undefined ? { source: extras.source } : {}),
  })
}

export function diagnosticFromGraphIssue(issue: GraphIssue): Diagnostic {
  if (issue.code === 'CYCLE') {
    const related: RelatedLocation[] = issue.paths.map((path) => ({ path }))
    return redactDiagnostic({
      code: diagnosticCodeFromGraphIssue(issue.code),
      severity: 'error',
      message: `Circular token reference: ${issue.paths.map((path) => path.join('.')).join(' → ')}`,
      ...(issue.paths[0] !== undefined ? { path: issue.paths[0] } : {}),
      related,
      provenance: { stage: 'graph', producer: 'buildGraph' },
    })
  }
  if (issue.code === 'MISSING_REF') {
    const fromPath = pathFromCanonicalId(issue.from)
    return redactDiagnostic({
      code: diagnosticCodeFromGraphIssue(issue.code),
      severity: 'error',
      message: `Missing token reference: ${issue.ref.join('.')}`,
      path: issue.ref,
      related: fromPath !== undefined ? [{ path: fromPath, message: 'referrer' }] : undefined,
      provenance: { stage: 'graph', producer: 'buildGraph' },
    })
  }
  const fromPath = pathFromCanonicalId(issue.from)
  return redactDiagnostic({
    code: diagnosticCodeFromGraphIssue(issue.code),
    severity: 'error',
    message: `Token reference chain exceeded depth ${GRAPH_MAX_DEPTH} (observed ${issue.depth})`,
    ...(fromPath !== undefined ? { path: fromPath } : {}),
    provenance: { stage: 'graph', producer: 'buildGraph' },
  })
}

export function diagnosticsFromGraphIssues(issues: readonly GraphIssue[]): readonly Diagnostic[] {
  return aggregateDiagnostics(issues.map(diagnosticFromGraphIssue))
}

export function diagnosticFromUnknown(
  error: unknown,
  extras: { readonly provenance?: DiagnosticProvenance; readonly source?: Diagnostic['source'] } = {},
): Diagnostic {
  if (error instanceof ThemeonError) return diagnosticFromThemeonError(error, extras)
  const message = error instanceof Error ? error.message : String(error)
  return redactDiagnostic({
    code: 'THEMEON_INTERNAL',
    severity: 'error',
    message,
    ...(extras.source !== undefined ? { source: extras.source } : {}),
    provenance: extras.provenance ?? { stage: 'adapter' },
  })
}
