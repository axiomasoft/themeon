import { describe, expect, test, vi } from 'vitest'
import { themeInitScript } from './anti-fouc'
import { createThemeState } from './state'
import type { UseThemeOptions } from './types'

/**
 * ПАРИТЕТ ДВУХ КАНАЛОВ — исполняемый инвариант фазы (P3.8), а не комментарий.
 *
 * Тему выставляют ДВА независимых канала: анти-FOUC IIFE (строка, исполняется до первой отрисовки)
 * и `createThemeState().init()` (рантайм, после гидрации). Если на ОДНОМ И ТОМ ЖЕ входе они
 * принимают разные решения — пользователь видит вспышку темы: скрипт красит одно, `init()`
 * перекрашивает в другое.
 *
 * Ровно этот класс дефекта дважды пробивал юнит-тесты пакета:
 *  - P3.7: `init()` резолвил `default` через `??`, скрипт — через `||` (пустая строка не nullish);
 *  - P3.7-фикс: скрипт добавил `.trim()` на чтении персиста, `asThemeName` — нет.
 * Оба раза набор был ЗЕЛЁНЫМ, потому что каналы проверялись по отдельности и строковыми ассертами
 * (`expect(script).toContain(...)`). Здесь сравнивается РЕЗУЛЬТАТ: декартово произведение входов
 * прогоняется через оба канала, `data-theme` обязан совпасть на каждом.
 */

/** Исполняет сгенерированный IIFE с подставными глобалами, возвращает выставленный `data-theme`. */
function runScript(
  script: string,
  { stored, systemDark }: { stored: string | null; systemDark: boolean },
): string | undefined {
  const attrs: Record<string, string> = {}
  const document = {
    documentElement: { setAttribute: (n: string, v: string) => void (attrs[n] = v) },
  }
  const localStorage = { getItem: () => stored }
  const matchMedia = (): { matches: boolean } => ({ matches: systemDark })
  new Function('document', 'localStorage', 'matchMedia', script)(document, localStorage, matchMedia)
  return attrs['data-theme']
}

/** Прогоняет `createThemeState().init()` на тех же фейках; возвращает `data-theme` и запись в хранилище. */
function runRuntime(
  options: UseThemeOptions,
  { stored, systemDark }: { stored: string | null; systemDark: boolean },
): { attr: string | undefined; wrote: string | null } {
  const attrs: Record<string, string> = {}
  const vars: Record<string, string> = {}
  let wrote: string | null = null
  const state = createThemeState({
    ...options,
    disableTransition: false,
    target: () => ({
      setAttribute(n: string, v: string) {
        attrs[n] = v
      },
      style: {
        setProperty(n: string, v: string) {
          vars[n] = v
        },
        removeProperty(n: string) {
          const prev = vars[n] ?? ''
          delete vars[n]
          return prev
        },
      },
    }),
    storage: () => ({
      getItem: () => stored,
      setItem(_k: string, v: string) {
        wrote = v
      },
    }),
    media: () => ({ matches: systemDark }),
  })
  state.init()
  return { attr: attrs['data-theme'], wrote }
}

// Входы подобраны так, чтобы покрыть КАЖДУЮ ветку резолва обоих каналов, включая те, на которых
// каналы исторически расходились: пустой/пробельный персист, имя с пробелами (его пакет сам
// допускает — `asThemeName` не переписывает имя), протухшее имя, sentinel `'system'`, вырожденный
// набор тем, `default` как `''`/имя/`'system'`.
const PERSISTED = [null, '', '   ', 'light', 'dark', ' dark', 'sepia', 'system', 'tenant-42']
const THEME_SETS: Array<readonly string[] | undefined> = [undefined, ['light', 'dark'], ['light', 'dark', 'sepia'], []]
const DEFAULTS = [undefined, '', '  ', 'light', 'system']
const SYSTEM_DARK = [false, true]

describe('паритет: анти-FOUC скрипт и init() решают одинаково', () => {
  const cases: Array<{
    stored: string | null
    themes: readonly string[] | undefined
    def: string | undefined
    systemDark: boolean
  }> = []
  for (const stored of PERSISTED)
    for (const themes of THEME_SETS)
      for (const def of DEFAULTS) for (const systemDark of SYSTEM_DARK) cases.push({ stored, themes, def, systemDark })

  test.each(cases)(
    'persist=$stored themes=$themes default=$def systemDark=$systemDark',
    ({ stored, themes, def, systemDark }) => {
      // `console.warn` заглушаем: неизвестное имя темы законно предупреждает, но не влияет на резолв
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const options: UseThemeOptions = { themes, default: def }
        const fromScript = runScript(themeInitScript({ themes, default: def }), { stored, systemDark })
        const fromRuntime = runRuntime(options, { stored, systemDark })

        // Анти-вхолостую: оба канала ОБЯЗАНЫ выставить непустое имя темы. Без этой проверки тест
        // зеленел бы и на `undefined === undefined` (ни один канал ничего не выставил).
        expect(fromScript).toBeTypeOf('string')
        expect(fromScript).not.toBe('')
        expect(fromScript).not.toBe('system') // sentinel обязан быть резолвнут, а не попасть в DOM

        expect(fromRuntime.attr).toBe(fromScript)

        // `init()` НИКОГДА не пишет в хранилище (P-D49): персист — след явного `set()`, а не
        // побочный эффект первого визита. Иначе системное предпочтение замерзает навсегда.
        expect(fromRuntime.wrote).toBeNull()
      } finally {
        warn.mockRestore()
      }
    },
  )

  test(`покрыто ${PERSISTED.length * THEME_SETS.length * DEFAULTS.length * SYSTEM_DARK.length} комбинаций`, () => {
    expect(cases).toHaveLength(PERSISTED.length * THEME_SETS.length * DEFAULTS.length * SYSTEM_DARK.length)
  })
})
