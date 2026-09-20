#!/usr/bin/env node
/**
 * Build declaration snapshots from packed @themeon/* tarballs (P2.4).
 * Baselines live under etc/api/*.api.md for human review and CI diff.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { apiReportPackages } from './api-report-packages.mjs'
import { packConsumerTarballs, writePackManifest } from './pack-consumer-tarballs.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultBaselinesDir = join(root, 'etc', 'api')
const defaultPackDir = join(root, '.tmp-api-packs')

/** @param {string} text */
export function normalizeDts(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {import('node:module').ImportAttributes['exports']} exportsField
 * @returns {{ subpath: string, types: string }[]}
 */
export function collectTypeEntrypoints(exportsField) {
  if (!exportsField || typeof exportsField === 'string') {
    return []
  }
  const out = []
  for (const [subpath, value] of Object.entries(exportsField)) {
    if (subpath.endsWith('.css')) continue
    if (typeof value !== 'object' || value === null || !value.types) continue
    out.push({ subpath, types: value.types })
  }
  out.sort((a, b) => a.subpath.localeCompare(b.subpath))
  return out
}

function extractTarball(tarballPath, destDir) {
  mkdirSync(destDir, { recursive: true })
  const result = spawnSync('tar', ['-xzf', tarballPath, '-C', destDir], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    throw new Error(`tar extract failed for ${tarballPath}:\n${result.stderr}`)
  }
}

function packageRootFromExtract(extractDir) {
  const entries = readdirSync(extractDir, { withFileTypes: true }).filter((e) => e.isDirectory())
  if (entries.length === 1) return join(extractDir, entries[0].name)
  return extractDir
}

/**
 * @param {string} packageName
 * @param {{ subpath: string, relativeTypesPath: string, content: string }[]} sections
 */
export function renderApiReport(packageName, sections) {
  const lines = [
    `# ${packageName}`,
    '',
    '> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.',
    '',
  ]
  for (const section of sections) {
    lines.push(`## Export \`${section.subpath}\``, '')
    lines.push(`<!-- types: ${section.relativeTypesPath} -->`, '')
    lines.push('```dts')
    lines.push(section.content)
    lines.push('```', '')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

/**
 * @param {{ baselinesDir?: string, packDir?: string, write?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function generateApiReports(options = {}) {
  const baselinesDir = options.baselinesDir ?? defaultBaselinesDir
  const packDir = options.packDir ?? defaultPackDir
  const write = options.write ?? true

  mkdirSync(packDir, { recursive: true })
  const packed = packConsumerTarballs(packDir)
  writePackManifest(packDir, packed)
  const byName = new Map(packed.map((entry) => [entry.name, entry]))

  const reports = {}
  for (const spec of apiReportPackages) {
    const packEntry = byName.get(spec.name)
    if (!packEntry) {
      throw new Error(`api-report: no packed tarball for ${spec.name}`)
    }

    const extractDir = join(packDir, '_extract', spec.slug)
    rmSync(extractDir, { recursive: true, force: true })
    extractTarball(join(packDir, packEntry.tarball), extractDir)

    const pkgDir = packageRootFromExtract(extractDir)
    const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
    const entrypoints = collectTypeEntrypoints(manifest.exports)
    if (entrypoints.length === 0) {
      throw new Error(`api-report: ${spec.name} has no typed export entries`)
    }

    const sections = entrypoints.map((entry) => {
      const rel = entry.types.startsWith('./') ? entry.types.slice(2) : entry.types
      const abs = join(pkgDir, rel)
      const content = normalizeDts(readFileSync(abs, 'utf8'))
      return {
        subpath: entry.subpath,
        relativeTypesPath: entry.types,
        content,
      }
    })

    reports[spec.slug] = renderApiReport(spec.name, sections)
  }

  if (write) {
    mkdirSync(baselinesDir, { recursive: true })
    for (const spec of apiReportPackages) {
      const body = reports[spec.slug]
      writeFileSync(join(baselinesDir, `${spec.slug}.api.md`), body)
    }
  }

  return reports
}

function main() {
  const reports = generateApiReports({ write: true })
  console.log(`generate-api-report: ${Object.keys(reports).length} baselines → ${defaultBaselinesDir}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
