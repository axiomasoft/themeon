import type { Diagnostic } from '@themeon/core/compiler'

/** Versioned machine contract for inspect/explain/graph JSON output (P3.1). */
export const CLI_QUERY_SCHEMA_VERSION = 1 as const

export type CliOutputFormat = 'pretty' | 'json' | 'github'

export interface InspectCounts {
  readonly sysTokens: number
  readonly themeVariantTokens: number
  readonly resolvedBaseVars: number
  readonly graphNodes: number
  readonly graphEdges: number
}

export interface InspectPayload {
  readonly schemaVersion: typeof CLI_QUERY_SCHEMA_VERSION
  readonly command: 'inspect'
  readonly compilerVersion: string
  readonly fingerprint?: string
  readonly config: string
  readonly counts: InspectCounts
  readonly themes: readonly string[]
  readonly resolve: {
    readonly refLayer: string
    readonly aliases?: string
  }
  readonly diagnostics: readonly Diagnostic[]
  readonly ok: boolean
}

export interface ExplainAliasStep {
  readonly path: readonly string[]
  readonly ref?: readonly string[]
}

export interface ExplainPayload {
  readonly schemaVersion: typeof CLI_QUERY_SCHEMA_VERSION
  readonly command: 'explain'
  readonly config: string
  readonly path: readonly string[]
  readonly type?: string
  readonly cssVariable?: string
  readonly resolvedValue?: string
  readonly aliasChain: readonly ExplainAliasStep[]
  readonly themeOverrides: Readonly<Record<string, string | undefined>>
  readonly diagnostics: readonly Diagnostic[]
  readonly ok: boolean
}

export interface GraphNodePayload {
  readonly id: string
  readonly path: readonly string[]
  readonly type: string
}

export interface GraphEdgePayload {
  readonly from: string
  readonly to: string
  readonly kind: 'alias'
}

export interface GraphPayload {
  readonly schemaVersion: typeof CLI_QUERY_SCHEMA_VERSION
  readonly command: 'graph'
  readonly config: string
  readonly nodes: readonly GraphNodePayload[]
  readonly edges: readonly GraphEdgePayload[]
  readonly order: readonly string[]
  readonly truncated: boolean
  readonly diagnostics: readonly Diagnostic[]
  readonly ok: boolean
}

export type QueryPayload = InspectPayload | ExplainPayload | GraphPayload
