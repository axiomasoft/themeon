import { expect, test } from 'vitest'
import type { ContrastOptions, ContrastPair, ContrastReport, ContrastCheckResult, SemanticPairSpec } from './contrast'

/**
 * API-freeze (P2.7, по образцу `packages/core/src/api.test.ts` P1.8): snapshot публичной
 * поверхности пакета. Любое случайное добавление/удаление рантайм-экспорта делает diff
 * видимым — дисциплина OSS-пакета до 1.0.
 *
 * P8.6 (P-D48/P-D53): freeze усилен по образцу `packages/vue/src/api.test.ts` (P3.8) — теперь
 * заморожены и рантайм-экспорты, и ФОРМА публичных типов (компайл-тайм), чтобы новое поле в
 * публичном интерфейсе не проходило молча мимо снапшота, который видит только `Object.keys()`.
 */
test('публичная поверхность заморожена (рантайм-экспорты)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "ColorsError",
      "LC_THRESHOLDS",
      "SEMANTIC_CONTRAST_PAIRS",
      "STEP_ROLES",
      "checkContrast",
      "checkThemeContrast",
      "contrastAPCA",
      "generateScale",
      "generateScalePair",
      "scaleToTokens",
    ]
  `)
})

/**
 * Компайл-тайм freeze ФОРМЫ публичных типов: `Exact<T, Keys>` резолвится в `true`, только если
 * набор ключей `T` совпадает с `Keys` ТОЧНО — добавили поле в публичный интерфейс и не обновили
 * список здесь → `pnpm typecheck` красный.
 */
type Exact<T, Keys extends string> = [Exclude<keyof T, Keys>] extends [never]
  ? [Exclude<Keys, keyof T>] extends [never]
    ? true
    : false
  : false

const contrastOptionsFrozen: Exact<ContrastOptions, 'base'> = true
const contrastPairFrozen: Exact<ContrastPair, 'fg' | 'bg' | 'usage' | 'label' | 'base'> = true
const contrastReportFrozen: Exact<ContrastReport, 'pair' | 'lc' | 'required' | 'pass'> = true
const contrastCheckResultFrozen: Exact<ContrastCheckResult, 'pass' | 'reports'> = true
const semanticPairSpecFrozen: Exact<SemanticPairSpec, 'fg' | 'bg' | 'usage' | 'label'> = true

test('форма публичных типов заморожена (проверяется компилятором)', () => {
  expect([
    contrastOptionsFrozen,
    contrastPairFrozen,
    contrastReportFrozen,
    contrastCheckResultFrozen,
    semanticPairSpecFrozen,
  ]).toEqual([true, true, true, true, true])
})
