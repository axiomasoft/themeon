import { expect, test } from 'vitest'

/**
 * API-freeze (P4.6, образец `packages/tailwind/src/api.test.ts`/`packages/naive/src/api.test.ts`):
 * snapshot публичной поверхности пакета. Любое случайное добавление/удаление рантайм-экспорта
 * делает diff видимым.
 */
test('публичная поверхность заморожена (рантайм-экспорты)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "checkContrastPairs",
      "checkCoverage",
      "checkHardcode",
      "loadThemeConfig",
      "runBuild",
      "runCheck",
      "runInit",
      "scanSources",
    ]
  `)
})
