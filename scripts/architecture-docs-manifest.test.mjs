import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { adrDocs, architectureDocs } from './architecture-docs-manifest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('architecture-docs-manifest', () => {
  it('lists every markdown file under docs/architecture and docs/adr', () => {
    const archDir = join(root, 'docs/architecture')
    const adrDir = join(root, 'docs/adr')
    const arch = readdirSync(archDir).filter((f) => f.endsWith('.md') && f !== 'index.md').sort()
    const adr = readdirSync(adrDir).filter((f) => f.endsWith('.md') && f !== 'index.md').sort()
    assert.deepEqual([...architectureDocs].sort(), arch)
    assert.deepEqual([...adrDocs].sort(), adr)
  })

  it('manifest module is importable from check script path', () => {
    const text = readFileSync(join(root, 'scripts/check-architecture-docs.mjs'), 'utf8')
    assert.match(text, /architecture-docs-manifest\.mjs/)
  })
})
