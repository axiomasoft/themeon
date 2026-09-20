#!/usr/bin/env node
/**
 * Workspace manifest hygiene: duplicate workspace deps and publishable package inventory.
 * Does not infer npm publication from version 0.0.0.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(root, 'packages')

let failed = false

const publishable = []

for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const manifestPath = join(packagesDir, dir.name, 'package.json')
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    continue
  }

  if (manifest.private) continue
  if (manifest.publishConfig?.access === 'public' || manifest.name?.startsWith('@themeon/')) {
    publishable.push({ path: manifestPath, name: manifest.name })
  }

  const deps = manifest.dependencies ?? {}
  const devDeps = manifest.devDependencies ?? {}
  for (const name of Object.keys(deps)) {
    if (devDeps[name] !== undefined && devDeps[name] === deps[name]) {
      console.error(
        `${manifestPath}: redundant devDependency "${name}" (same specifier as dependencies)`,
      )
      failed = true
    }
  }
}

publishable.sort((a, b) => a.name.localeCompare(b.name))
console.log('Publishable workspace packages (manifest truth, not registry):')
for (const { name, path } of publishable) {
  console.log(`  ${name} ← ${path.replace(`${root}/`, '')}`)
}

if (failed) process.exit(1)
console.log('check-package-manifests: ok')
