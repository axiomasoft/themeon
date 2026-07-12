import { describe, expect, test } from 'vitest'
import { createApp } from 'vue'
import { THEME_INJECTION_KEY, themeonPlugin } from './plugin'

// Файл не входит в Files P3.2 буквального ТЗ, но обязателен для Validation (Code Guidance
// «Обязательные тесты» #5) — идемпотентность install не покрыта ни api.test.ts, ни
// anti-fouc.test.ts. См. Known Deviations phases/P3.md §P3.2.
describe('themeonPlugin', () => {
  test('install кладёт состояние в provide под THEME_INJECTION_KEY', () => {
    const app = createApp({})
    app.use(themeonPlugin, { storageKey: null })
    expect(app._context.provides[THEME_INJECTION_KEY as unknown as string]).toBeDefined()
  })

  test('повторный install идемпотентен — состояние не пересоздаётся', () => {
    const app = createApp({})
    app.use(themeonPlugin, { storageKey: null })
    const first = app._context.provides[THEME_INJECTION_KEY as unknown as string]
    app.use(themeonPlugin, { storageKey: null })
    const second = app._context.provides[THEME_INJECTION_KEY as unknown as string]
    expect(second).toBe(first)
  })

  test('устанавливает $theme в globalProperties', () => {
    const app = createApp({})
    app.use(themeonPlugin, { storageKey: null })
    expect(app.config.globalProperties.$theme).toBeDefined()
  })
})
