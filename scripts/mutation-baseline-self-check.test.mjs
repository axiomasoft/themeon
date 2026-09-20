import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { criticalMutationIncludes } from './critical-mutation-includes.mjs'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const baselinePath = join(root, 'mutation-baseline.json')

test('mutation includes match baseline SSOT', () => {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  assert.deepEqual([...criticalMutationIncludes].sort(), [...baseline.includes].sort())
})

test('gate fails when overall covered MSI floor is raised above measured report', () => {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const tampered = {
    ...baseline,
    overall: { coveredMsi: 100 },
  }
  writeFileSync(baselinePath, `${JSON.stringify(tampered, null, 2)}\n`)
  try {
    const result = spawnSync(
      process.execPath,
      [join(root, 'scripts/check-mutation-baseline.mjs')],
      { cwd: root, encoding: 'utf8' },
    )
    assert.notEqual(result.status, 0, 'expected gate failure with impossible floor')
    assert.match(result.stderr ?? result.stdout, /check-mutation-baseline/)
  } finally {
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
  }
})
