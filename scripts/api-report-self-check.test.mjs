import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { apiReportPackages } from './api-report-packages.mjs'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const baselinesDir = join(root, 'etc', 'api')

test('api-report gate fails when a baseline is tampered', () => {
  const spec = apiReportPackages[0]
  const baselinePath = join(baselinesDir, `${spec.slug}.api.md`)
  const baseline = readFileSync(baselinePath, 'utf8')
  writeFileSync(baselinePath, `${baseline}\n<!-- tamper -->\n`)
  try {
    const result = spawnSync(process.execPath, [join(root, 'scripts/check-api-report.mjs')], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0, 'expected gate failure after tamper')
    assert.match(result.stderr ?? result.stdout, /check-api-report/)
  } finally {
    writeFileSync(baselinePath, baseline)
  }
})
