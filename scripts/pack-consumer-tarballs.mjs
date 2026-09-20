#!/usr/bin/env node
/**
 * Pack all publishable @themeon/* workspace packages for external-consumer matrix (P2.3).
 * Rewrites workspace:* to semver in tarballs (pnpm pack). Never use workspace links in consumers.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(root, 'packages')

/** @returns {{ name: string, version: string, tarball: string, sha256: string, dir: string }[]} */
export function packConsumerTarballs(destDir) {
  mkdirSync(destDir, { recursive: true })

  const entries = []
  for (const dirent of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue
    const dir = join(packagesDir, dirent.name)
    const manifestPath = join(dir, 'package.json')
    let manifest
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch {
      continue
    }
    if (manifest.private) continue
    if (!manifest.name?.startsWith('@themeon/')) continue

    const pack = spawnSync(
      'pnpm',
      ['pack', '--pack-destination', destDir],
      { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    if (pack.status !== 0) {
      throw new Error(
        `pnpm pack failed for ${manifest.name}:\n${pack.stdout}\n${pack.stderr}`,
      )
    }

    const version = manifest.version ?? '0.0.0'
    const tarball = `${manifest.name.replace('@themeon/', 'themeon-')}-${version}.tgz`
    const tarballPath = join(destDir, tarball)
    const sha256 = createHash('sha256').update(readFileSync(tarballPath)).digest('hex')
    entries.push({ name: manifest.name, version, tarball, sha256, dir: dirent.name })
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))
  return entries
}

export function writePackManifest(destDir, packages) {
  const manifest = {
    schema_version: 'consumer-pack-manifest/v1',
    generated_at: new Date().toISOString(),
    pack_destination: destDir,
    packages,
  }
  const outPath = join(destDir, 'manifest.json')
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return outPath
}

function main() {
  const destArg = process.argv.find((a) => a.startsWith('--dest='))
  const destDir = destArg
    ? resolve(destArg.slice('--dest='.length))
    : join(root, '.tmp-consumer-packs')

  const packages = packConsumerTarballs(destDir)
  const manifestPath = writePackManifest(destDir, packages)
  console.log(`pack-consumer-tarballs: ${packages.length} packages → ${destDir}`)
  console.log(`manifest: ${manifestPath}`)
  for (const p of packages) {
    console.log(`  ${p.name}@${p.version} ${p.sha256.slice(0, 12)}… ${p.tarball}`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
