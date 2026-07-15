import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { TAILWIND_LAYER_ORDER, tailwindLayerPreamble } from './layers'

/**
 * Анти-дрейф-тест (P8.15) — `TAILWIND_LAYER_ORDER` обязан байт-в-байт совпадать с порядком
 * слоёв, объявленным в `@themeon/css/src/layers-tailwind.css` (тот же паттерн, что
 * `THEMEON_LAYERS` ↔ `layers.css` в `packages/css/test/dist.test.ts`). Читаем файл напрямую
 * (не импортируем `@themeon/css` — zero-dep-дисциплина, P4 инв.8): дрейф между двумя копиями
 * канона fail-closed ловится здесь, а не молча расходится в рантайме.
 */
const LAYERS_TAILWIND_CSS_PATH = fileURLToPath(
  new URL('../../css/src/layers-tailwind.css', import.meta.url),
)

/** Убирает блочные `/* … *\/`-комментарии (шапка файла содержит пример `@layer a, b, c;`,
 *  который не является каноном и обязан быть исключён до поиска реального statement'а). */
function stripBlockComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function parseLayerStatement(css: string): string[] {
  const match = /@layer\s+([^;]+);/.exec(stripBlockComments(css))
  if (!match) throw new Error('layers-tailwind.css: @layer-statement не найден')
  return match[1]!
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}

describe('TAILWIND_LAYER_ORDER — зеркало @themeon/css/src/layers-tailwind.css', () => {
  test('порядок слоёв совпадает байт-в-байт', () => {
    const css = readFileSync(LAYERS_TAILWIND_CSS_PATH, 'utf8')
    expect([...TAILWIND_LAYER_ORDER]).toEqual(parseLayerStatement(css))
  })

  test('tailwindLayerPreamble() возвращает тот же statement, что в файле', () => {
    const css = readFileSync(LAYERS_TAILWIND_CSS_PATH, 'utf8')
    const canonicalStatement = /@layer[\s\S]+?;/.exec(stripBlockComments(css))![0].replace(/\s+/g, ' ')
    expect(tailwindLayerPreamble().trim().replace(/\s+/g, ' ')).toBe(canonicalStatement)
  })
})
