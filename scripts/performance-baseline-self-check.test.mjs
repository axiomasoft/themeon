import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { performanceBenchmarkIncludes } from './performance-benchmark-includes.mjs'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const baselinePath = join(root, 'performance-baseline.json')

test('performance includes match baseline SSOT', () => {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  assert.deepEqual([...performanceBenchmarkIncludes].sort(), Object.keys(baseline.scenarios).sort())
})

test('gate fails when a scenario floor is lowered below measured report', () => {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const key = performanceBenchmarkIncludes[0]
  const tampered = structuredClone(baseline)
  tampered.scenarios[key] = { medianMs: 0.001 }
  writeFileSync(baselinePath, `${JSON.stringify(tampered, null, 2)}\n`)
  try {
    const build = spawnSync('pnpm', ['build'], { cwd: root, encoding: 'utf8', stdio: 'pipe' })
    assert.equal(build.status, 0, build.stderr || build.stdout)
    const run = spawnSync(process.execPath, [join(root, 'benchmarks/run.mjs')], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, THEMEON_BENCH_WARM_ITERATIONS: '3' },
    })
    assert.equal(run.status, 0, run.stderr || run.stdout)
    const check = spawnSync(process.execPath, [join(root, 'scripts/check-performance-baseline.mjs')], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.notEqual(check.status, 0, 'expected gate failure with impossible floor')
    assert.match(check.stderr ?? check.stdout, /check-performance-baseline/)
  } finally {
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
  }
})
