#!/usr/bin/env node
/**
 * Non-regressive gate: measured pct in coverage/coverage-summary.json must meet
 * coverage-baseline.json floors (no timestamps; deterministic includes only).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = join(root, 'coverage-baseline.json')
const summaryPath = join(root, 'coverage', 'coverage-summary.json')

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))

const includes = baseline.includes ?? []
const files = baseline.files ?? {}

let failed = false

const rootSlash = root.replaceAll('\\', '/') + '/'

function relKey(absolutePath) {
  const normalized = absolutePath.replaceAll('\\', '/')
  if (!normalized.startsWith(rootSlash)) return null
  return normalized.slice(rootSlash.length)
}

const measured = new Map()
for (const [key, stats] of Object.entries(summary)) {
  if (key === 'total') continue
  const rel = relKey(key)
  if (rel) measured.set(rel, stats)
}

for (const includePath of includes) {
  if (!(includePath in files)) {
    console.error(`check-critical-coverage: missing baseline floor for ${includePath}`)
    failed = true
  }
}

for (const [filePath, floor] of Object.entries(files)) {
  const stats = measured.get(filePath)
  if (!stats) {
    console.error(`check-critical-coverage: no coverage entry for ${filePath}`)
    failed = true
    continue
  }
  for (const metric of ['lines', 'branches']) {
    const min = floor[metric]
    const observed = stats[metric]?.pct
    if (typeof observed !== 'number') {
      console.error(`check-critical-coverage: ${filePath} missing ${metric} pct`)
      failed = true
      continue
    }
    if (observed + 1e-9 < min) {
      console.error(
        `check-critical-coverage: ${filePath} ${metric} ${observed}% < baseline ${min}%`,
      )
      failed = true
    }
  }
}

if (failed) process.exit(1)
console.log(`check-critical-coverage: ${Object.keys(files).length} critical files meet baseline`)
