import { expect, test } from 'vitest'

/**
 * API-freeze (P3.6, образец `packages/core/src/api.test.ts`): публичная поверхность модуля
 * Nuxt — единственный default-export (сам `defineNuxtModule(...)`) + типы `ModuleOptions`/
 * `ModulePublicRuntimeConfig` (покрыты typecheck'ом, рантайм-снапшот для типов не имеет
 * смысла — на выходе только значения). Снапшотим форму default-экспорта: он должен остаться
 * функцией (Nuxt module factory) и нести ожидаемые `meta` (имя/configKey/совместимость),
 * которые составляют публичный контракт для потребителя (`modules: ['@themeon/nuxt']`).
 */
test('публичная поверхность заморожена (default export — функция Nuxt-модуля)', async () => {
  const mod = await import('./module')
  expect(Object.keys(mod).sort()).toMatchInlineSnapshot(`
    [
      "default",
    ]
  `)
  expect(typeof mod.default).toBe('function')
})

test('meta модуля (name/configKey/compatibility) заморожена', async () => {
  const mod = await import('./module')
  // Nuxt kit хранит объявленный конфиг модуля в `__getMeta` / статическом поле — сам объект
  // `defineNuxtModule(config)` возвращает функцию с побочно навешанным `getMeta`.
  const meta = await (mod.default as unknown as { getMeta: () => Promise<unknown> }).getMeta()
  expect(meta).toMatchInlineSnapshot(`
    {
      "compatibility": {
        "nuxt": ">=4.0.0",
      },
      "configKey": "themeon",
      "name": "@themeon/nuxt",
    }
  `)
})
