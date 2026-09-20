export type { PackManifest, PackManifestPackage } from '../../../internal/pack-harness/types.js'

export interface TypesMatrixCell {
  id: string
  kind: 'positive' | 'negative'
  fixture: string
  dependencies: Record<string, string>
}

export interface TypesMatrixManifest {
  schema_version: string
  cells: TypesMatrixCell[]
}

export interface TypesCellRunResult {
  ok: boolean
  cellId: string
  kind: TypesMatrixCell['kind']
  packDigests: Record<string, string>
  error?: string
  detail?: string
}
