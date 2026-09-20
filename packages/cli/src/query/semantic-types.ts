import type { Diagnostic } from '@themeon/core/compiler'

/** Versioned machine contract for diff/doctor/migrate JSON output (P3.2). */
export const CLI_SEMANTIC_SCHEMA_VERSION = 1 as const

export const SEMANTIC_CHANGE_CLASSES = [
  'token.added',
  'token.removed',
  'token.renamed.candidate',
  'value.changed',
  'type.changed',
  'alias.target.changed',
  'metadata.changed',
  'theme.override.changed',
  'css.variable.changed',
  'fingerprint.changed',
  'breaking.potential',
  'unknown',
] as const

export type SemanticChangeClass = (typeof SEMANTIC_CHANGE_CLASSES)[number]

export type ChangeConfidence = 'high' | 'medium' | 'low'
export type ChangeSafety = 'breaking' | 'non-breaking' | 'unknown'

export interface ChangeEvidence {
  readonly kind: string
  readonly detail?: string
}

export interface SemanticChange {
  readonly id: string
  readonly class: SemanticChangeClass
  readonly confidence: ChangeConfidence
  readonly safety: ChangeSafety
  readonly path?: readonly string[]
  readonly theme?: string
  readonly before?: unknown
  readonly after?: unknown
  readonly evidence: readonly ChangeEvidence[]
  readonly provenance: {
    readonly oldConfig: string
    readonly newConfig: string
  }
}

export interface MigrationHint {
  readonly confidence: ChangeConfidence
  readonly action: 'review' | 'replace-reference' | 'update-consumer' | 'no-op'
  readonly message: string
  readonly evidence: readonly ChangeEvidence[]
  readonly fromPath?: readonly string[]
  readonly toPath?: readonly string[]
}

export interface DiffSummary {
  readonly total: number
  readonly breaking: number
  readonly nonBreaking: number
  readonly unknown: number
}

export interface DiffPayload {
  readonly schemaVersion: typeof CLI_SEMANTIC_SCHEMA_VERSION
  readonly command: 'diff'
  readonly oldConfig: string
  readonly newConfig: string
  readonly oldFingerprint?: string
  readonly newFingerprint?: string
  readonly changes: readonly SemanticChange[]
  readonly summary: DiffSummary
  readonly diagnostics: readonly Diagnostic[]
  readonly ok: boolean
}

export interface DoctorCheck {
  readonly id: 'compile' | 'graph' | 'baseline-diff'
  readonly status: 'pass' | 'warn' | 'fail'
  readonly message: string
}

export interface DoctorPayload {
  readonly schemaVersion: typeof CLI_SEMANTIC_SCHEMA_VERSION
  readonly command: 'doctor'
  readonly config: string
  readonly baseline?: string
  readonly fingerprint?: string
  readonly checks: readonly DoctorCheck[]
  readonly hints: readonly MigrationHint[]
  readonly changes: readonly SemanticChange[]
  readonly summary: DiffSummary
  readonly diagnostics: readonly Diagnostic[]
  readonly ok: boolean
}

export interface MigratePayload {
  readonly schemaVersion: typeof CLI_SEMANTIC_SCHEMA_VERSION
  readonly command: 'migrate'
  readonly fromConfig: string
  readonly toConfig: string
  readonly dryRun: true
  readonly hints: readonly MigrationHint[]
  readonly changes: readonly SemanticChange[]
  readonly summary: DiffSummary
  readonly diagnostics: readonly Diagnostic[]
  readonly ok: boolean
}

export type SemanticPayload = DiffPayload | DoctorPayload | MigratePayload
