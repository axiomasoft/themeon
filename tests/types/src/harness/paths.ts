import { join } from 'node:path'

export const MATRIX_MANIFEST_PATH = join(import.meta.dirname, '..', '..', 'matrix.manifest.json')
export const FIXTURES_ROOT = join(import.meta.dirname, '..', '..', 'fixtures')
export const TMP_CELLS_ROOT = join(import.meta.dirname, '..', '..', '..', '..', '.tmp-types-cells')

export function packDirFromEnv(): string {
  const dir = process.env.THEMEON_CONSUMER_PACK_DIR
  if (!dir) {
    throw new Error('THEMEON_CONSUMER_PACK_DIR is not set (vitest globalSetup should set it)')
  }
  return dir
}
