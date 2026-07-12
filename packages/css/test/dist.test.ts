import { transform } from 'lightningcss'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

import { buildCss } from '../scripts/build.mjs'
import { THEMEON_LAYERS } from '../src/contract'

const PKG_ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST_ENTRIES = [
  'index.css',
  'layers.css',
  'reset.css',
  'base.css',
  'composition.css',
  'blueprints.css',
]

// Синхронная пересборка dist перед сбором тестов (buildCss — быстрая чистая функция,
// без побочных асинхронных эффектов) — гарантирует, что dist существует и свеж на момент
// вычисления `describe`-тел ниже (они выполняются синхронно при коллекции, раньше beforeAll).
buildCss(PKG_ROOT)

/**
 * Мини-сканер `var(...)`-вызовов: находит верхнеуровневые вызовы `var(` в тексте CSS и
 * возвращает по каждому — есть ли у него верхнеуровневая запятая (т.е. литеральный/вложенный
 * fallback). Вложенные `var(--a, var(--b, literal))` обязаны иметь литерал на самом глубоком
 * уровне — рекурсивно проверяем fallback-часть, если она сама является ровно одним `var(...)`.
 */
function findVarCallsWithoutFallback(css: string): string[] {
  const bad: string[] = []
  let i = 0
  while (i < css.length) {
    const start = css.indexOf('var(', i)
    if (start === -1) break
    let depth = 1
    let j = start + 4
    let topLevelCommaIdx = -1
    while (j < css.length && depth > 0) {
      const ch = css[j]
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ',' && depth === 1 && topLevelCommaIdx === -1) topLevelCommaIdx = j
      j++
    }
    const call = css.slice(start, j)
    if (topLevelCommaIdx === -1) {
      bad.push(call)
    } else {
      const fallback = css.slice(topLevelCommaIdx + 1, j - 1).trim()
      // Если fallback сам целиком — один var(...)-вызов, рекурсия проверит его отдельно
      // (он будет найден следующей итерацией indexOf, т.к. лежит внутри исходного текста).
      if (fallback.length === 0) bad.push(call)
    }
    i = start + 4
  }
  return bad
}

describe('@themeon/css — инварианты dist', () => {
  for (const entry of DIST_ENTRIES) {
    describe(`dist/${entry}`, () => {
      const css = readFileSync(`${PKG_ROOT}/dist/${entry}`, 'utf-8')

      test('начинается с @layer themeon.tokens и содержит все 7 имён слоёв', () => {
        expect(css.startsWith('@layer themeon.tokens')).toBe(true)
        for (const layer of THEMEON_LAYERS) {
          expect(css).toContain(layer)
        }
      })

      test('валидный CSS после minify — повторный transform() без ошибок', () => {
        expect(() =>
          transform({ filename: entry, code: Buffer.from(css) }),
        ).not.toThrow()
      })

      test('не содержит !important', () => {
        expect(css).not.toContain('!important')
      })

      test('каждый var(...) имеет fallback (литерал на самом глубоком уровне)', () => {
        expect(findVarCallsWithoutFallback(css)).toEqual([])
      })
    })
  }

  // P2.4: смок, что имена параметров composition-примитивов не потерялись при minify.
  test('dist/composition.css содержит --stack-gap и --switcher-threshold', () => {
    const css = readFileSync(`${PKG_ROOT}/dist/composition.css`, 'utf-8')
    expect(css).toContain('--stack-gap')
    expect(css).toContain('--switcher-threshold')
  })

  // P-D21: голые (непрефиксованные) имена параметров Every Layout запрещены во всём dist.
  test('во всём dist отсутствуют голые var(--space,/var(--gutter, (анти-EL-паттерн, P-D21)', () => {
    for (const entry of DIST_ENTRIES) {
      const css = readFileSync(`${PKG_ROOT}/dist/${entry}`, 'utf-8')
      expect(css).not.toContain('var(--space,')
      expect(css).not.toContain('var(--gutter,')
    }
  })

  // P2.5: смок, что бургер-механики (Popover API, @container-порог, прогрессивное улучшение
  // Anchor Positioning) переживают bundle+minify под Baseline-2026 targets.
  test('dist/blueprints.css содержит :popover-open, @container page и @supports (anchor-name', () => {
    const css = readFileSync(`${PKG_ROOT}/dist/blueprints.css`, 'utf-8')
    expect(css).toContain(':popover-open')
    expect(css).toContain('@container page')
    expect(css).toContain('@supports (anchor-name')
  })
})
