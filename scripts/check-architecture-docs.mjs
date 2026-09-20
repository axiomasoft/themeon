#!/usr/bin/env node
/**
 * P3.6 documentation drift gate: index completeness, required root files, stale claims.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  adrDocs,
  architectureDocs,
  forbiddenStalePhrases,
} from './architecture-docs-manifest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const archDir = join(root, 'docs/architecture')
const adrDir = join(root, 'docs/adr')

let failed = false

function fail(msg) {
  console.error(`check-architecture-docs: ${msg}`)
  failed = true
}

if (!existsSync(join(root, 'ROADMAP.md'))) {
  fail('missing ROADMAP.md at repository root')
}

const archIndex = join(archDir, 'index.md')
const adrIndex = join(adrDir, 'index.md')
if (!existsSync(archIndex)) fail('missing docs/architecture/index.md')
if (!existsSync(adrIndex)) fail('missing docs/adr/index.md')

const archIndexText = readFileSync(archIndex, 'utf8')
const adrIndexText = readFileSync(adrIndex, 'utf8')

for (const name of architectureDocs) {
  const path = join(archDir, name)
  if (!existsSync(path)) {
    fail(`missing architecture doc ${name}`)
    continue
  }
  if (!archIndexText.includes(name)) {
    fail(`docs/architecture/index.md does not link or mention ${name}`)
  }
}

for (const name of adrDocs) {
  const path = join(adrDir, name)
  if (!existsSync(path)) {
    fail(`missing ADR ${name}`)
    continue
  }
  if (!adrIndexText.includes(name)) {
    fail(`docs/adr/index.md does not mention ${name}`)
  }
}

const onDiskArch = readdirSync(archDir).filter((f) => f.endsWith('.md') && f !== 'index.md')
for (const file of onDiskArch) {
  if (!architectureDocs.includes(file)) {
    fail(`docs/architecture/${file} is not listed in architecture-docs-manifest.mjs`)
  }
}

const onDiskAdr = readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'index.md')
for (const file of onDiskAdr) {
  if (!adrDocs.includes(file)) {
    fail(`docs/adr/${file} is not listed in architecture-docs-manifest.mjs`)
  }
}

for (const phrase of forbiddenStalePhrases) {
  for (const name of architectureDocs) {
    const text = readFileSync(join(archDir, name), 'utf8')
    if (text.includes(phrase)) {
      fail(`stale phrase in docs/architecture/${name}: "${phrase}"`)
    }
  }
}

const readme = readFileSync(join(root, 'README.md'), 'utf8')
if (!readme.includes('docs/architecture/index.md') && !readme.includes('docs/architecture/')) {
  fail('README.md must link to docs/architecture/')
}

if (failed) process.exit(1)
console.log(
  `check-architecture-docs: ok (${architectureDocs.length} architecture, ${adrDocs.length} ADR)`,
)
