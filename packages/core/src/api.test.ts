import { expect, test } from 'vitest'

/**
 * API-freeze (P1.8): snapshot публичной поверхности пакета. Любое случайное
 * добавление/удаление рантайм-экспорта делает diff видимым — дисциплина OSS-пакета до 1.0.
 * Типовые экспорты покрыты typecheck'ом (index.ts реэкспортирует их через `export type`).
 */
test('публичная поверхность заморожена (рантайм-экспорты)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "NAMESPACE_TABLE",
      "ThemeonError",
      "applyTheme",
      "clearTheme",
      "cssVar",
      "defineTheme",
      "defineTokens",
      "formatColor",
      "formatVarName",
      "fromDTCG",
      "isToken",
      "kebabSegment",
      "legacyV0Alias",
      "parseColor",
      "resolveTheme",
      "serializeThemeCss",
      "themeVars",
      "toDTCG",
    ]
  `)
})

test('stub-экспорт P0.3 снесён', async () => {
  const mod = (await import('./index')) as Record<string, unknown>
  expect('THEMEON_CORE_STUB' in mod).toBe(false)
})
