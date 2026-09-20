#!/usr/bin/env node
/**
 * Portable compiler/runtime/Vite performance corpus (P2.5).
 * Writes `benchmarks/last-report.json` for the regression gate.
 */
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { compileTheme } from '@themeon/core/compiler'
import { fromDTCG, toDTCG } from '@themeon/core/dtcg'
import { applyTheme, themeVars } from '@themeon/core/runtime'
import { themeon } from '@themeon/vite'
import { corpusCatalog } from './lib/corpus.mjs'
import { warmMedianSync, timeSync } from './lib/measure.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const warmIterations = Number(process.env.THEMEON_BENCH_WARM_ITERATIONS ?? '7')

const LEGACY = Object.freeze({ aliases: 'legacy-v0' })

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function compileOnce(theme) {
  return compileTheme(theme, { resolve: LEGACY })
}

function measureCompileWarm(theme) {
  compileOnce(theme)
  return warmMedianSync(() => {
    compileOnce(theme)
  }, warmIterations)
}

function measureApplyRuntime(theme) {
  const resolved = compileOnce(theme).resolved
  const el = {
    style: {
      setProperty() {},
      removeProperty() {
        return ''
      },
    },
  }
  const vars = themeVars(resolved)
  return warmMedianSync(() => {
    applyTheme(el, vars)
  }, warmIterations)
}

function measureDtcgRoundTrip(theme) {
  return warmMedianSync(() => {
    const exported = toDTCG(theme, { splitThemes: true, resolverFile: true })
    fromDTCG(exported.files, { allowLossy: true })
  }, warmIterations)
}

async function measureVitePluginLoad(theme) {
  const plugin = themeon({ theme })
  const load = plugin.load
  if (typeof load !== 'function') throw new Error('themeon plugin missing load hook')
  const id = '\0virtual:themeon.css'
  await load.call({ error() {} }, id)
  return warmMedianSync(() => {
    load.call({ error() {} }, id)
  }, warmIterations)
}

function memoryDeltaMb(fn) {
  if (typeof globalThis.gc === 'function') globalThis.gc()
  const before = process.memoryUsage().heapUsed
  fn()
  if (typeof globalThis.gc === 'function') globalThis.gc()
  const after = process.memoryUsage().heapUsed
  return (after - before) / (1024 * 1024)
}

async function main() {
  const scenarios = {}
  const correctness = {}
  const informational = {}

  for (const [name, factory] of Object.entries(corpusCatalog)) {
    const theme = factory()
    const cold = timeSync(() => compileOnce(theme))
    const warmKey = `${name}.compileWarmMs`
    if (['small', 'medium', 'large', 'wideComponent', 'tenantPatch'].includes(name)) {
      scenarios[warmKey] = { medianMs: measureCompileWarm(theme) }
    }

    if (name === 'small') {
      scenarios['small.applyRuntimeMs'] = { medianMs: measureApplyRuntime(theme) }
      scenarios['small.dtcgRoundTripMs'] = { medianMs: measureDtcgRoundTrip(theme) }
      correctness.small = {
        fingerprint: cold.result.fingerprint,
        cssSha256: sha256(cold.result.css),
        cssBytes: cold.result.css.length,
        cssGzipBytes: gzipSync(cold.result.css).length,
      }
    }

    if (name === 'large') {
      informational.largeCompileColdMs = cold.ms
      informational.largeHeapDeltaMb = memoryDeltaMb(() => compileOnce(theme))
    }
  }

  const smallTheme = corpusCatalog.small()
  scenarios['vitePlugin.loadWarmMs'] = {
    medianMs: await measureVitePluginLoad(smallTheme),
  }

  const report = {
    schema_version: 'themeon/benchmark-report/v1',
    recordedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    warmIterations,
    scenarios,
    correctness,
    informational,
    timingOrigin: performance.timeOrigin,
  }

  const outPath = join(root, 'benchmarks', 'last-report.json')
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`benchmarks/run: wrote ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
