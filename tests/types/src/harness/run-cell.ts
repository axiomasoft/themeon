import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runCommand } from '../../../internal/pack-harness/command.js'
import { packDigests } from '../../../internal/pack-harness/digests.js'
import { themeonInstallSpec } from '../../../internal/pack-harness/install.js'
import { loadPackManifest } from '../../../internal/pack-harness/load-manifest.js'
import type { PackManifest, TypesCellRunResult, TypesMatrixCell } from './types.js'
import { FIXTURES_ROOT, TMP_CELLS_ROOT } from './paths.js'

export { themeonInstallSpec } from '../../../internal/pack-harness/install.js'
export { loadPackManifest } from '../../../internal/pack-harness/load-manifest.js'

export interface RunTypesCellOptions {
  cell: TypesMatrixCell
  packManifest: PackManifest
}

export function runTypesCell(options: RunTypesCellOptions): TypesCellRunResult {
  const { cell, packManifest } = options
  const packDir = packManifest.pack_destination
  const digests = packDigests(packManifest)

  mkdirSync(TMP_CELLS_ROOT, { recursive: true })
  const workDir = mkdtempSync(join(TMP_CELLS_ROOT, `${cell.id}-`))

  try {
    const fixtureDir = join(FIXTURES_ROOT, cell.fixture)
    cpSync(fixtureDir, workDir, { recursive: true })

    const installSpec = themeonInstallSpec(packDir, packManifest, cell.dependencies)
    const consumerPkg = {
      name: `types-${cell.id}`,
      private: true,
      type: 'module',
      dependencies: installSpec.dependencies,
      ...(installSpec.overrides ? { overrides: installSpec.overrides } : {}),
    }
    writeFileSync(join(workDir, 'package.json'), `${JSON.stringify(consumerPkg, null, 2)}\n`)

    const install = runCommand(workDir, 'npm', ['install', '--no-audit', '--no-fund'])
    if (!install.ok) {
      return {
        ok: false,
        cellId: cell.id,
        kind: cell.kind,
        packDigests: digests,
        error: 'install',
        detail: install.output,
      }
    }

    const typecheck = runCommand(workDir, 'npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'])
    if (!typecheck.ok) {
      return {
        ok: false,
        cellId: cell.id,
        kind: cell.kind,
        packDigests: digests,
        error: 'typecheck',
        detail: typecheck.output,
      }
    }

    return { ok: true, cellId: cell.id, kind: cell.kind, packDigests: digests }
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}
