import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { criticalCoverageIncludes } from './critical-coverage-includes.mjs'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const baseline = JSON.parse(readFileSync(join(root, 'coverage-baseline.json'), 'utf8'))

test('critical includes match baseline SSOT', () => {
  assert.deepEqual(
    [...criticalCoverageIncludes].sort(),
    [...baseline.includes].sort(),
  )
})

test('every include has a measured floor', () => {
  for (const path of criticalCoverageIncludes) {
    assert.ok(baseline.files[path], `missing floor for ${path}`)
  }
})
