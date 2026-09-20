import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runCommand } from '../../../internal/pack-harness/command.js'
import { packDigests } from '../../../internal/pack-harness/digests.js'
import { themeonInstallSpec } from '../../../internal/pack-harness/install.js'
import { loadPackManifest } from '../../../internal/pack-harness/load-manifest.js'
import type { CellRunResult, MatrixCell, PackManifest } from './types.js'
import type { TarballOverride } from '../../../internal/pack-harness/types.js'
import { FIXTURES_ROOT, TMP_CELLS_ROOT } from './paths.js'

export { loadPackManifest } from '../../../internal/pack-harness/load-manifest.js'

export interface RunCellOptions {
  cell: MatrixCell
  packManifest: PackManifest
  /** Replace tarball for a single package (gate self-test). */
  tarballOverride?: TarballOverride
}

export function runConsumerCell(options: RunCellOptions): CellRunResult {
  const { cell, packManifest } = options
  const packDir = packManifest.pack_destination
  const digests = packDigests(packManifest)

  mkdirSync(TMP_CELLS_ROOT, { recursive: true })
  const workDir = mkdtempSync(join(TMP_CELLS_ROOT, `${cell.id}-`))

  try {
    const fixtureDir = join(FIXTURES_ROOT, cell.fixture)
    cpSync(fixtureDir, workDir, { recursive: true })

    const installSpec = themeonInstallSpec(
      packDir,
      packManifest,
      cell.dependencies,
      options.tarballOverride,
    )

    const consumerPkg = {
      name: `consumer-${cell.id}`,
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
        resolver: cell.resolver,
        packDigests: digests,
        error: 'install',
        detail: install.output,
      }
    }

    for (const step of cell.steps) {
      if (step === 'install') continue

      if (step === 'typecheck') {
        const tsc = runCommand(workDir, 'npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'])
        if (!tsc.ok) {
          return {
            ok: false,
            cellId: cell.id,
            resolver: cell.resolver,
            packDigests: digests,
            error: 'typecheck',
            detail: tsc.output,
          }
        }
        continue
      }

      if (step === 'node-smoke') {
        const smoke = runCommand(workDir, 'node', ['src/smoke.mjs'])
        if (!smoke.ok) {
          return {
            ok: false,
            cellId: cell.id,
            resolver: cell.resolver,
            packDigests: digests,
            error: 'node-smoke',
            detail: smoke.output,
          }
        }
        continue
      }

      if (step === 'vite-build') {
        const build = runCommand(workDir, 'node', ['scripts/vite-build.mjs'])
        if (!build.ok) {
          return {
            ok: false,
            cellId: cell.id,
            resolver: cell.resolver,
            packDigests: digests,
            error: 'vite-build',
            detail: build.output,
          }
        }
        continue
      }

      if (step === 'vue-tsc') {
        const vtc = runCommand(workDir, 'npx', ['vue-tsc', '--noEmit', '-p', 'tsconfig.json'])
        if (!vtc.ok) {
          return {
            ok: false,
            cellId: cell.id,
            resolver: cell.resolver,
            packDigests: digests,
            error: 'vue-tsc',
            detail: vtc.output,
          }
        }
        continue
      }

      if (step === 'nuxt-build') {
        const nuxt = runCommand(workDir, 'npx', ['nuxi', 'build'], {
          NODE_OPTIONS: '--no-warnings',
        })
        if (!nuxt.ok) {
          return {
            ok: false,
            cellId: cell.id,
            resolver: cell.resolver,
            packDigests: digests,
            error: 'nuxt-build',
            detail: nuxt.output,
          }
        }
        continue
      }

      if (step === 'tailwind-compile') {
        const tw = runCommand(workDir, 'node', ['scripts/tailwind-compile.mjs'])
        if (!tw.ok) {
          return {
            ok: false,
            cellId: cell.id,
            resolver: cell.resolver,
            packDigests: digests,
            error: 'tailwind-compile',
            detail: tw.output,
          }
        }
        continue
      }

      return {
        ok: false,
        cellId: cell.id,
        resolver: cell.resolver,
        packDigests: digests,
        error: 'unknown-step',
        detail: step,
      }
    }

    return { ok: true, cellId: cell.id, resolver: cell.resolver, packDigests: digests }
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}
