import { join } from 'node:path'

export const CONSUMERS_ROOT = join(import.meta.dirname, '..', '..')
export const FIXTURES_ROOT = join(CONSUMERS_ROOT, 'fixtures')
export const MATRIX_MANIFEST_PATH = join(CONSUMERS_ROOT, 'matrix.manifest.json')
export const TMP_CELLS_ROOT = join(CONSUMERS_ROOT, '.tmp-cells')

export function packDirFromEnv(): string {
  const dir = process.env.THEMEON_CONSUMER_PACK_DIR
  if (!dir) {
    throw new Error('THEMEON_CONSUMER_PACK_DIR is unset — run via vitest globalSetup or test:consumers')
  }
  return dir
}
