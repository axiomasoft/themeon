#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performanceBenchmarkIncludes } from '../scripts/performance-benchmark-includes.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const referenceRoot = resolve(process.argv[2])
const reports = { reference: [], candidate: [] }

// Interleave processes so warmup, GC and gradual runner load changes affect both revisions.
for (let round = 0; round < 3; round++) {
  const order = round % 2 === 0 ? ['reference', 'candidate'] : ['candidate', 'reference']
  for (const kind of order) {
    const cwd = kind === 'reference' ? referenceRoot : root
    const run = spawnSync(process.execPath, [join(cwd, 'benchmarks/run.mjs')], { cwd, stdio: 'inherit' })
    if (run.status !== 0) throw new Error(`${kind} benchmark failed: ${run.status ?? run.error}`)
    reports[kind].push(JSON.parse(readFileSync(join(cwd, 'benchmarks/last-report.json'), 'utf8')))
  }
}

function aggregate(samples) {
  const result = structuredClone(samples[0])
  for (const sample of samples) {
    if (JSON.stringify(sample.correctness) !== JSON.stringify(result.correctness)) {
      throw new Error('Benchmark correctness changed between runs')
    }
  }
  for (const key of performanceBenchmarkIncludes) {
    const medians = samples.map((sample) => sample.scenarios[key].medianMs).sort((a, b) => a - b)
    result.scenarios[key].medianMs = medians[1]
  }
  return result
}

writeFileSync(join(root, '.tmp-performance-reference.json'), `${JSON.stringify(aggregate(reports.reference), null, 2)}\n`)
writeFileSync(join(root, 'benchmarks/last-report.json'), `${JSON.stringify(aggregate(reports.candidate), null, 2)}\n`)
