import { expect, test } from 'vitest'

/**
 * API-freeze (образец `packages/tailwind/src/api.test.ts`): snapshot публичной поверхности
 * пакета. Любое случайное добавление/удаление рантайм-экспорта делает diff видимым.
 */
test('публичная поверхность заморожена (рантайм-экспорты)', async () => {
  const mod = await import('./index')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "deriveInteractionStates",
      "mergeOverrides",
      "resolveResponsiveOverrides",
      "toHex",
      "toNative",
    ]
  `)
})
