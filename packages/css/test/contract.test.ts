import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, test } from 'vitest'

import { buildCss } from '../scripts/build.mjs'
import { CSS_CONTRACT } from '../src/contract'

const PKG_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST_ENTRIES = ['index.css', 'layers.css', 'reset.css', 'base.css']

// Namespace-фильтр sys-переменных контракта (P2.3 таблица «CSS-var контракт»). Локальные
// параметры блоков (--stack-gap, --btn-bg…) под фильтр не попадают.
const CONTRACT_NAMESPACE_RE =
  /^--(color|spacing|radius|text|font|shadow|ease|duration|gradient)-/

function extractSysVarNames(css: string): Set<string> {
  const names = new Set<string>()
  const re = /var\(\s*(--[a-zA-Z0-9-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    const name = m[1]!
    if (CONTRACT_NAMESPACE_RE.test(name)) names.add(name)
  }
  return names
}

describe('@themeon/css — контракт ↔ CSS ↔ CSS_CONTRACT', () => {
  beforeAll(() => {
    buildCss(PKG_ROOT)
  })

  test('каждый sys-var из dist присутствует в CSS_CONTRACT (и наоборот)', () => {
    const usedInDist = new Set<string>()
    for (const entry of DIST_ENTRIES) {
      const css = readFileSync(`${PKG_ROOT}/dist/${entry}`, 'utf-8')
      for (const name of extractSysVarNames(css)) usedInDist.add(name)
    }
    const contractNames = new Set<string>(CSS_CONTRACT.map((e) => e.varName))

    for (const name of usedInDist) {
      expect(contractNames.has(name), `${name} используется в dist, но нет в CSS_CONTRACT`).toBe(
        true,
      )
    }
    for (const name of contractNames) {
      expect(usedInDist.has(name), `${name} в CSS_CONTRACT, но не используется в dist`).toBe(true)
    }
  })
})
