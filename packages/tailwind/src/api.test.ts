import { expect, test } from 'vitest'

/**
 * API-freeze (P4.1, образец `packages/core/src/api.test.ts`): snapshot публичной
 * поверхности пакета. Любое случайное добавление/удаление рантайм-экспорта делает
 * diff видимым.
 */
test('публичная поверхность заморожена (рантайм-экспорты)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "TAILWIND_NAMESPACES",
      "tailwindBridge",
    ]
  `)
})
