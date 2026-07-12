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
  'components.css',
  'utilities.css',
]

// Синхронная пересборка dist перед сбором тестов (buildCss — быстрая чистая функция,
// без побочных асинхронных эффектов) — гарантирует, что dist существует и свеж на момент
// вычисления `describe`-тел ниже (они выполняются синхронно при коллекции, раньше beforeAll).
buildCss(PKG_ROOT)

/**
 * Имена custom properties, ОБЪЯВЛЕННЫХ (не только использованных) где-либо в CSS — т.е.
 * встречающихся в позиции декларации `--name: ...;`. Локальный block-параметр компонента
 * (P2.6, `:where(.btn) { --btn-bg: var(--color-action-primary, …); background: var(--btn-bg);
 * }`) гарантированно установлен тем же правилом, что его использует — второй `var()`-вызов
 * без fallback безопасен (в отличие от sys-var, у которого декларации в пакете нет вовсе).
 */
function findDeclaredCustomProperties(css: string): Set<string> {
  const declared = new Set<string>()
  const re = /(--[a-zA-Z0-9-]+)\s*:/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) declared.add(m[1]!)
  return declared
}

/**
 * Мини-сканер `var(...)`-вызовов: находит верхнеуровневые вызовы `var(` в тексте CSS и
 * возвращает по каждому — есть ли у него верхнеуровневая запятая (т.е. литеральный/вложенный
 * fallback). Вложенные `var(--a, var(--b, literal))` обязаны иметь литерал на самом глубоком
 * уровне — рекурсивно проверяем fallback-часть, если она сама является ровно одним `var(...)`.
 * Исключение (P2.6): вызов без fallback безопасен, если референс — локально объявленный
 * custom property (см. {@link findDeclaredCustomProperties}), а не sys-var контракта.
 */
function findVarCallsWithoutFallback(css: string): string[] {
  const declared = findDeclaredCustomProperties(css)
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
    const nameMatch = /^var\(\s*(--[a-zA-Z0-9-]+)/.exec(call)
    const refName = nameMatch?.[1]
    const isLocalDeclared = refName !== undefined && declared.has(refName)
    if (topLevelCommaIdx === -1) {
      if (!isLocalDeclared) bad.push(call)
    } else {
      const fallback = css.slice(topLevelCommaIdx + 1, j - 1).trim()
      // Если fallback сам целиком — один var(...)-вызов, рекурсия проверит его отдельно
      // (он будет найден следующей итерацией indexOf, т.к. лежит внутри исходного текста).
      if (fallback.length === 0 && !isLocalDeclared) bad.push(call)
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

  // P2.6: смок паттерна нулевой специфичности — компонентные селекторы обёрнуты в :where(.
  test('dist/components.css селекторы компонентов обёрнуты в :where(', () => {
    const css = readFileSync(`${PKG_ROOT}/dist/components.css`, 'utf-8')
    expect(css).toContain(':where(.btn')
    expect(css).toContain(':where(.badge')
    expect(css).toContain(':where(.card')
  })
})
