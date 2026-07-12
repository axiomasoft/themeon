import { expect, test } from 'vitest'

/**
 * API-freeze (P3.2, образец `packages/core/src/api.test.ts`): snapshot публичной поверхности
 * пакета `.`. Любое случайное добавление/удаление рантайм-экспорта делает diff видимым —
 * дисциплина OSS-пакета до 1.0. Типовые экспорты покрыты typecheck'ом.
 */
test('публичная поверхность заморожена (рантайм-экспорты `.`)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "THEME_INJECTION_KEY",
      "themeonPlugin",
      "useTheme",
    ]
  `)
})
