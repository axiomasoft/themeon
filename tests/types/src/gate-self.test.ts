import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import { FIXTURES_ROOT, MATRIX_MANIFEST_PATH, packDirFromEnv } from './harness/paths.js'
import { loadPackManifest, themeonInstallSpec } from './harness/run-cell.js'
import type { TypesMatrixManifest } from './harness/types.js'

const matrix = JSON.parse(readFileSync(MATRIX_MANIFEST_PATH, 'utf8')) as TypesMatrixManifest
const negativeCell = matrix.cells.find((c) => c.id === 'negative-unexported-subpath')
if (!negativeCell) throw new Error('negative-unexported-subpath missing from matrix.manifest.json')

describe('types matrix gate self-check', () => {
  test('removing @ts-expect-error fails typecheck', () => {
    const packManifest = loadPackManifest(packDirFromEnv())
    const tmp = mkdtempSync(join(packDirFromEnv(), 'types-gate-'))
    try {
      cpSync(join(FIXTURES_ROOT, negativeCell.fixture), tmp, { recursive: true })
      const srcPath = join(tmp, 'src', 'forbidden.ts')
      writeFileSync(
        srcPath,
        readFileSync(srcPath, 'utf8').replace(/^\/\/ @ts-expect-error.*\n/m, ''),
      )

      const installSpec = themeonInstallSpec(
        packManifest.pack_destination,
        packManifest,
        negativeCell.dependencies,
      )
      writeFileSync(
        join(tmp, 'package.json'),
        `${JSON.stringify(
          {
            name: 'types-gate-negative',
            private: true,
            type: 'module',
            dependencies: installSpec.dependencies,
            ...(installSpec.overrides ? { overrides: installSpec.overrides } : {}),
          },
          null,
          2,
        )}\n`,
      )

      const install = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
        cwd: tmp,
        encoding: 'utf8',
      })
      expect(install.status).toBe(0)

      const typecheck = spawnSync('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], {
        cwd: tmp,
        encoding: 'utf8',
      })
      expect(typecheck.status).not.toBe(0)
      expect(`${typecheck.stdout}${typecheck.stderr}`).toMatch(/forbidden\.ts/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
