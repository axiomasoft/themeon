#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeMutationMetrics, loadMutationReport } from './compute-mutation-metrics.mjs'
import { criticalMutationIncludes } from './critical-mutation-includes.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = join(root, 'mutation-baseline.json')

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const report = loadMutationReport()
const metrics = computeMutationMetrics(report)

let failed = false

function checkFloor(label, observed, floor) {
  if (typeof observed !== 'number') {
    console.error(`check-mutation-baseline: missing observed ${label}`)
    failed = true
    return
  }
  if (observed + 1e-9 < floor) {
    console.error(
      `check-mutation-baseline: ${label} covered MSI ${observed.toFixed(2)}% < baseline ${floor}%`,
    )
    failed = true
  }
}

checkFloor('overall', metrics.overall.coveredMsi, baseline.overall.coveredMsi)

for (const includePath of criticalMutationIncludes) {
  const floor = baseline.files[includePath]?.coveredMsi
  if (floor === undefined) {
    console.error(`check-mutation-baseline: missing floor for ${includePath}`)
    failed = true
    continue
  }
  const observed = metrics.files[includePath]
  if (observed?.missing) {
    console.error(`check-mutation-baseline: report missing ${includePath}`)
    failed = true
    continue
  }
  checkFloor(includePath, observed.coveredMsi, floor)
}

if (failed) process.exit(1)
console.log(
  `check-mutation-baseline: overall covered MSI ${metrics.overall.coveredMsi.toFixed(2)}% meets baseline ${baseline.overall.coveredMsi}%`,
)
