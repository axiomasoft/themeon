import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { MATRIX_MANIFEST_PATH, packDirFromEnv } from './harness/paths.js'
import { loadPackManifest, runTypesCell } from './harness/run-cell.js'
import type { TypesMatrixManifest } from './harness/types.js'

const matrix = JSON.parse(readFileSync(MATRIX_MANIFEST_PATH, 'utf8')) as TypesMatrixManifest

describe('packed TypeScript compatibility matrix (P2.4)', () => {
  const packManifest = () => loadPackManifest(packDirFromEnv())

  for (const cell of matrix.cells) {
    test(`${cell.id} (${cell.kind})`, () => {
      const result = runTypesCell({ cell, packManifest: packManifest() })
      if (!result.ok) {
        const digestSummary = Object.entries(result.packDigests)
          .map(([name, sha]) => `${name}@${sha.slice(0, 12)}`)
          .join(', ')
        throw new Error(
          `[${result.cellId}] ${result.error}\npack digests: ${digestSummary}\n${result.detail ?? ''}`,
        )
      }
      expect(result.ok).toBe(true)
    })
  }
})
