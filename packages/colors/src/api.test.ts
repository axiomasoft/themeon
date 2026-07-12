import { expect, test } from 'vitest'

/**
 * API-freeze (P2.7, по образцу `packages/core/src/api.test.ts` P1.8): snapshot публичной
 * поверхности пакета. Любое случайное добавление/удаление рантайм-экспорта делает diff
 * видимым — дисциплина OSS-пакета до 1.0.
 */
test('публичная поверхность заморожена (рантайм-экспорты)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "ColorsError",
      "LC_THRESHOLDS",
      "STEP_ROLES",
      "checkContrast",
      "contrastAPCA",
      "generateScale",
      "generateScalePair",
      "scaleToTokens",
    ]
  `)
})
