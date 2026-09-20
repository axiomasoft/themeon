export type {
  PackManifest,
  PackManifestPackage,
  TarballOverride,
} from '../../../internal/pack-harness/types.js'

export interface MatrixCell {
  id: string
  title: string
  fixture: string
  resolver: string
  dependencies: Record<string, string>
  steps: string[]
  timeoutMs?: number
}

export interface MatrixManifest {
  schema_version: string
  description: string
  cells: MatrixCell[]
}

export interface CellRunResult {
  ok: boolean
  cellId: string
  resolver: string
  packDigests: Record<string, string>
  error?: string
  detail?: string
}
