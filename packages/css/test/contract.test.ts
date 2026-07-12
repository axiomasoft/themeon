import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, test } from 'vitest'

import { buildCss } from '../scripts/build.mjs'
import { genTokens } from '../scripts/gen-tokens.mjs'
import { CSS_CONTRACT } from '../src/contract'
import { defaultTheme } from '../src/theme/default'

const PKG_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST_ENTRIES = [
  'index.css',
  'layers.css',
  'reset.css',
  'base.css',
  'composition.css',
  'blueprints.css',
  'components.css',
  'utilities.css',
]

// usedBy-имя слоя → неминифицированные исходники (P2.3/P2.4 файловая структура; список,
// т.к. composition собирается из восьми отдельных примитив-файлов). Fallback-сверка
// (P-D19) идёт по исходнику, а не по dist: lightningcss минифицирует литералы синтаксически
// (`oklch(0.25 0.01 260)` → `oklch(25% .01 260)`), что ломало бы сравнение с CSS_CONTRACT
// при каждом апдейте минификатора, а не при реальном дрейфе контракта.
const LAYER_SOURCE_FILES: Record<string, string[]> = {
  reset: ['_reset-body.css'],
  base: ['_base-body.css'],
  composition: [
    'composition/container.css',
    'composition/stack.css',
    'composition/cluster.css',
    'composition/sidebar.css',
    'composition/center.css',
    'composition/cover.css',
    'composition/switcher.css',
    'composition/grid.css',
  ],
  blueprints: [
    'blueprints/page-shell.css',
    'blueprints/header.css',
    'blueprints/hero.css',
    'blueprints/section.css',
    'blueprints/footer.css',
  ],
  components: [
    'components/btn.css',
    'components/badge.css',
    'components/card.css',
    'components/gradient.css',
  ],
  utilities: ['_utilities-body.css'],
}

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

/**
 * Для каждого верхнеуровневого `var(--name, fallback)` в CSS — литеральный fallback-текст
 * (как он записан после запятой, без учёта вложенных var()-вызовов). Используется для сверки
 * с `CSS_CONTRACT[].fallback` (P-D19) — ловит дрейф между дизайн-контрактом и реальным CSS.
 */
function extractFallbacks(css: string): Map<string, string> {
  const fallbacks = new Map<string, string>()
  const re = /var\(\s*(--[a-zA-Z0-9-]+)\s*,\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    const name = m[1]!
    if (!CONTRACT_NAMESPACE_RE.test(name)) continue
    let depth = 1
    let j = re.lastIndex
    while (j < css.length && depth > 0) {
      if (css[j] === '(') depth++
      else if (css[j] === ')') depth--
      j++
    }
    const fallback = css.slice(re.lastIndex, j - 1).trim()
    if (!fallbacks.has(name)) fallbacks.set(name, fallback)
  }
  return fallbacks
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

  test('CSS_CONTRACT.fallback и usedBy соответствуют фактическому CSS (P-D19)', () => {
    // index.css/layers.css — агрегаты (@import всего пакета), в сверку слоя не участвуют:
    // usedBy указывает на конкретный per-layer entry (reset.css/base.css).
    const LAYER_ENTRIES = DIST_ENTRIES.filter((e) => e !== 'index.css' && e !== 'layers.css')
    const perEntry = new Map<string, { names: Set<string>; fallbacks: Map<string, string> }>()
    for (const entry of LAYER_ENTRIES) {
      const layer = entry.replace(/\.css$/, '')
      const distCss = readFileSync(`${PKG_ROOT}/dist/${entry}`, 'utf-8')
      const srcCss = LAYER_SOURCE_FILES[layer]!
        .map((file) => readFileSync(`${PKG_ROOT}/src/${file}`, 'utf-8'))
        .join('\n')
      perEntry.set(layer, {
        names: extractSysVarNames(distCss),
        fallbacks: extractFallbacks(srcCss),
      })
    }

    for (const { varName, fallback, usedBy } of CSS_CONTRACT) {
      const actualUsers = LAYER_ENTRIES.map((e) => e.replace(/\.css$/, '')).filter((layer) =>
        perEntry.get(layer)!.names.has(varName),
      )
      expect(actualUsers.sort(), `usedBy для ${varName} разошёлся с фактическим CSS`).toEqual(
        [...usedBy].sort(),
      )

      for (const layer of usedBy) {
        const actualFallback = perEntry.get(layer)?.fallbacks.get(varName)
        expect(
          actualFallback,
          `fallback для ${varName} в src/${LAYER_SOURCE_FILES[layer]!.join(', src/')} разошёлся с CSS_CONTRACT`,
        ).toBe(fallback)
      }
    }
  })
})

// P2.7 — дефолт-тема tokens.css: APCA-гейт (fail-closed) + контракт ⊆ tokens.css.
describe('@themeon/css — дефолт-тема dist/tokens.css', () => {
  test('genTokens: APCA-гейт проходит на дефолт-теме, файл записывается', () => {
    const result = genTokens(defaultTheme, PKG_ROOT)
    expect(result.ok, JSON.stringify(result.reports?.filter((r) => !r.pass))).toBe(true)
    // 5 пар × (база + dark) = 10 отчётов, все прошли.
    expect(result.reports).toHaveLength(10)
    expect(result.reports.every((r) => r.pass)).toBe(true)
  })

  test('dist/tokens.css начинается с @layer themeon.tokens', () => {
    const css = readFileSync(`${PKG_ROOT}/dist/tokens.css`, 'utf-8')
    expect(css.startsWith('@layer themeon.tokens')).toBe(true)
  })

  test('dist/tokens.css содержит [data-theme="dark"] и color-scheme: dark', () => {
    const css = readFileSync(`${PKG_ROOT}/dist/tokens.css`, 'utf-8')
    expect(css).toContain('[data-theme="dark"]')
    expect(css).toContain('color-scheme: dark')
  })

  test('каждый CSS_CONTRACT[].varName объявлен в dist/tokens.css', () => {
    const css = readFileSync(`${PKG_ROOT}/dist/tokens.css`, 'utf-8')
    for (const { varName } of CSS_CONTRACT) {
      expect(css, `${varName} из CSS_CONTRACT не объявлен в dist/tokens.css`).toMatch(
        new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`),
      )
    }
  })
})
