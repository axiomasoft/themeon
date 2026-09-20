#!/usr/bin/env node
/**
 * Fail when packed declaration snapshots drift from etc/api baselines (P2.4).
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { apiReportPackages } from './api-report-packages.mjs'
import { generateApiReports } from './generate-api-report.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baselinesDir = join(root, 'etc', 'api')

function main() {
  const fresh = generateApiReports({ write: false })
  let failed = false

  for (const spec of apiReportPackages) {
    const baselinePath = join(baselinesDir, `${spec.slug}.api.md`)
    let baseline
    try {
      baseline = readFileSync(baselinePath, 'utf8')
    } catch {
      console.error(`check-api-report: missing baseline ${baselinePath}`)
      console.error(`  run: pnpm api-report:update`)
      failed = true
      continue
    }
    const current = fresh[spec.slug]
    if (baseline !== current) {
      failed = true
      console.error(`check-api-report: drift in ${spec.slug}.api.md`)
      const diff = spawnSync('diff', ['-u', baselinePath, '-'], {
        input: current,
        encoding: 'utf8',
      })
      console.error(diff.stdout || diff.stderr)
    }
  }

  if (failed) {
    console.error('\ncheck-api-report: FAILED — update baselines only when public types change intentionally:')
    console.error('  pnpm api-report:update')
    process.exit(1)
  }

  console.log(`check-api-report: ok (${apiReportPackages.length} packages)`)
}

main()
