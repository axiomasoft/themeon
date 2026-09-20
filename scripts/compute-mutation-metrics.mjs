#!/usr/bin/env node
/**
 * Normalize Stryker JSON report → per-file and overall covered MSI.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { criticalMutationIncludes } from './critical-mutation-includes.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function loadMutationReport(reportPath = join(root, 'mutation', 'mutation-report.json')) {
  return JSON.parse(readFileSync(reportPath, 'utf8'))
}

function scoreForMutants(mutants) {
  const counts = { Killed: 0, Survived: 0, Timeout: 0, NoCoverage: 0 }
  for (const mutant of mutants) {
    counts[mutant.status] = (counts[mutant.status] ?? 0) + 1
  }
  const coveredDenominator = counts.Killed + counts.Survived + counts.Timeout
  const effectiveKills = counts.Killed + counts.Timeout
  const coveredMsi =
    coveredDenominator === 0 ? 100 : (effectiveKills / coveredDenominator) * 100
  const totalDenominator =
    counts.Killed + counts.Survived + counts.Timeout + counts.NoCoverage
  const totalMsi = totalDenominator === 0 ? 100 : (counts.Killed / totalDenominator) * 100
  return { counts, coveredMsi, totalMsi }
}

export function computeMutationMetrics(report) {
  const files = {}
  for (const includePath of criticalMutationIncludes) {
    const entry = report.files?.[includePath]
    if (!entry) {
      files[includePath] = { missing: true }
      continue
    }
    files[includePath] = scoreForMutants(entry.mutants)
  }

  let killed = 0
  let survived = 0
  let timeout = 0
  let noCoverage = 0
  for (const metrics of Object.values(files)) {
    if (metrics.missing) continue
    killed += metrics.counts.Killed
    survived += metrics.counts.Survived
    timeout += metrics.counts.Timeout
    noCoverage += metrics.counts.NoCoverage
  }
  const coveredDenominator = killed + survived + timeout
  const overall = {
    counts: { Killed: killed, Survived: survived, Timeout: timeout, NoCoverage: noCoverage },
    coveredMsi:
      coveredDenominator === 0 ? 100 : ((killed + timeout) / coveredDenominator) * 100,
    totalMsi:
      killed + survived + timeout + noCoverage === 0
        ? 100
        : (killed / (killed + survived + timeout + noCoverage)) * 100,
  }

  return { files, overall }
}
