import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import { MATRIX_MANIFEST_PATH, packDirFromEnv } from './harness/paths.js'
import { loadPackManifest, runConsumerCell } from './harness/run-cell.js'
import type { MatrixManifest } from './harness/types.js'

const matrix = JSON.parse(readFileSync(MATRIX_MANIFEST_PATH, 'utf8')) as MatrixManifest
const nodenextCell = matrix.cells.find((c) => c.id === 'ts-esm-nodenext')
if (!nodenextCell) throw new Error('ts-esm-nodenext cell missing from matrix.manifest.json')

/**
 * Proves the consumer gate fails when a packed export surface is broken (P2.3 Validation).
 */
describe('consumer matrix gate self-check', () => {
  test('broken @themeon/core export fails install or smoke', () => {
    const packManifest = loadPackManifest(packDirFromEnv())
    const core = packManifest.packages.find((p) => p.name === '@themeon/core')
    if (!core) throw new Error('core pack missing')

    const tmp = mkdtempSync(join(packDirFromEnv(), 'gate-broken-'))
    try {
      const sourceTarball = join(packManifest.pack_destination, core.tarball)
      const brokenDir = join(tmp, 'broken-core')
      mkdirSync(brokenDir, { recursive: true })
      spawnSync('tar', ['-xzf', sourceTarball, '-C', brokenDir], { stdio: 'ignore' })
      const pkgDir = join(brokenDir, 'package')
      const pkgJsonPath = join(pkgDir, 'package.json')
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
      pkg.exports = {
        '.': { types: './dist/missing-entry.d.ts', import: './dist/missing-entry.js' },
      }
      writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)

      const brokenTarball = join(tmp, 'themeon-core-broken.tgz')
      const pack = spawnSync('tar', ['-czf', brokenTarball, '-C', brokenDir, 'package'], {
        encoding: 'utf8',
      })
      expect(pack.status).toBe(0)

      const result = runConsumerCell({
        cell: nodenextCell,
        packManifest,
        tarballOverride: { packageName: '@themeon/core', tarballPath: brokenTarball },
      })
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/node-smoke|typecheck|install/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('pack manifest includes sha256 for every tarball', () => {
    const packManifest = loadPackManifest(packDirFromEnv())
    for (const pkg of packManifest.packages) {
      const bytes = readFileSync(join(packManifest.pack_destination, pkg.tarball))
      const sha = createHash('sha256').update(bytes).digest('hex')
      expect(sha).toBe(pkg.sha256)
    }
  })
})
