import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { MATRIX_MANIFEST_PATH, packDirFromEnv } from './harness/paths.js'
import { loadPackManifest, runConsumerCell } from './harness/run-cell.js'
import type { MatrixManifest } from './harness/types.js'

const matrix = JSON.parse(readFileSync(MATRIX_MANIFEST_PATH, 'utf8')) as MatrixManifest

describe('packed external-consumer matrix (P2.3)', () => {
  const packManifest = () => loadPackManifest(packDirFromEnv())

  for (const cell of matrix.cells) {
    test(
      cell.id,
      () => {
        const result = runConsumerCell({ cell, packManifest: packManifest() })
        if (!result.ok) {
          const digestHint = Object.entries(result.packDigests)
            .slice(0, 3)
            .map(([name, sha]) => `${name}=${sha.slice(0, 12)}`)
            .join(' ')
          throw new Error(
            [
              `cell=${result.cellId} resolver=${result.resolver} step=${result.error ?? 'unknown'}`,
              `packs: ${digestHint}`,
              result.detail ?? '',
            ].join('\n'),
          )
        }
        expect(result.ok).toBe(true)
      },
      cell.timeoutMs ?? 120_000,
    )
  }
})
