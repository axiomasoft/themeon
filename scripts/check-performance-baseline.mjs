#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performanceBenchmarkIncludes } from './performance-benchmark-includes.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = join(root, 'performance-baseline.json')
const reportPath = join(root, 'benchmarks', 'last-report.json')

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const report = JSON.parse(readFileSync(reportPath, 'utf8'))

const budget = baseline.regressionBudgetRatio ?? 0.3
let failed = false

function fail(msg) {
  console.error(`check-performance-baseline: ${msg}`)
  failed = true
}

for (const key of performanceBenchmarkIncludes) {
  const floor = baseline.scenarios[key]?.medianMs
  if (typeof floor !== 'number') {
    fail(`missing baseline floor for ${key}`)
    continue
  }
  const observed = report.scenarios[key]?.medianMs
  if (typeof observed !== 'number') {
    fail(`missing observed ${key} in report`)
    continue
  }
  const ceiling = floor * (1 + budget)
  if (observed - 1e-9 > ceiling) {
    fail(`${key} median ${observed.toFixed(3)}ms > budget ceiling ${ceiling.toFixed(3)}ms (baseline ${floor}ms + ${budget * 100}%)`)
  }
}

for (const [corpus, expected] of Object.entries(baseline.correctness ?? {})) {
  const observed = report.correctness?.[corpus]
  if (!observed) {
    fail(`missing correctness block for ${corpus}`)
    continue
  }
  if (observed.fingerprint !== expected.fingerprint) {
    fail(`${corpus} fingerprint mismatch (output correctness)`)
  }
  if (expected.cssSha256 && observed.cssSha256 !== expected.cssSha256) {
    fail(`${corpus} cssSha256 mismatch (output correctness)`)
  }
}

if (failed) process.exit(1)

console.log(
  `check-performance-baseline: ${performanceBenchmarkIncludes.length} scenarios within +${budget * 100}% budget; correctness fingerprints match`,
)
