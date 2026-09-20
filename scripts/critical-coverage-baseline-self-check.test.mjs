import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const baselinePath = join(root, 'coverage-baseline.json')
const checkScript = join(root, 'scripts/check-critical-coverage.mjs')
const summaryPath = join(root, 'coverage', 'coverage-summary.json')

test('gate fails when a critical file floor is raised above measured report', () => {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
  const rootSlash = root.replaceAll('\\', '/') + '/'
  const samplePath = Object.keys(baseline.files)[0]
  const stats = Object.entries(summary).find(([key]) => key.replaceAll('\\', '/').endsWith(samplePath))?.[1]
  assert.ok(stats, `no coverage summary for ${samplePath}`)

  const tampered = {
    ...baseline,
    files: {
      ...baseline.files,
      [samplePath]: {
        lines: 100,
        branches: 100,
      },
    },
  }
  writeFileSync(baselinePath, `${JSON.stringify(tampered, null, 2)}\n`)
  try {
    const result = spawnSync(process.execPath, [checkScript], { cwd: root, encoding: 'utf8' })
    assert.notEqual(result.status, 0, 'expected gate failure with impossible floor')
    assert.match(result.stderr ?? result.stdout, /check-critical-coverage/)
  } finally {
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
  }
})
