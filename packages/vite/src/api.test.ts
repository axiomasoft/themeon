import { expect, test } from 'vitest'

/**
 * API-freeze (P3.6, образец `packages/core/src/api.test.ts` и `packages/vue/src/api.test.ts`):
 * snapshot публичной поверхности пакета `.`. Единственный рантайм-экспорт — фабрика `themeon`;
 * тип `ThemeonViteOptions` покрыт typecheck'ом (index.ts реэкспортирует его через `export type`).
 */
test('публичная поверхность заморожена (рантайм-экспорты `.`)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "themeon",
    ]
  `)
  expect(typeof mod.themeon).toBe('function')
})
