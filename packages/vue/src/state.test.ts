/** @vitest-environment jsdom */
/**
 * T4 (findings/P8-nuxt-vue-runtime.md §5) — весь остальной `packages/vue/src/*.test.ts` suite
 * идёт в `environment: node` и ВСЕГДА подаёт seam'ы (`target`/`storage`/`media`), поэтому
 * дефолтные ветки `getTarget`/`getMedia` не исполнялись НИ РАЗУ (аудит #17). Этот файл — jsdom
 * БЕЗ шима `matchMedia` (jsdom по сей день его не реализует): регресс-гейт для `isClient()` +
 * гейта на наличие ФУНКЦИИ `matchMedia`, не только `window`.
 *
 * `storageKey: null` в тестах, которым персист не нужен — реальный jsdom `localStorage`
 * переживает между тестами файла, дефолтный ключ писал бы одну тему поверх другой.
 */
import { createApp, defineComponent, h, onMounted } from 'vue'
import { afterEach, describe, expect, test } from 'vitest'
import { createThemeState } from './state'
import { themeonPlugin } from './plugin'
import { useTheme } from './use-theme'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

describe('createThemeState — client-гейтинг в jsdom БЕЗ matchMedia-шима', () => {
  test('init() НЕ бросает и выставляет data-theme (фолбэк light)', () => {
    expect(window.matchMedia).toBeUndefined()
    const state = createThemeState({ themes: ['light', 'dark'], storageKey: null })
    expect(() => state.init()).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(state.system.value).toBe('light')
  })

  test('app.use(themeonPlugin) + onMounted(init) монтируется чисто', () => {
    // дословный сниппет из JSDoc `use-theme.ts:32-33`
    const App = defineComponent({
      setup() {
        const { init } = useTheme()
        onMounted(() => init())
        return () => h('div', 'ok')
      },
    })
    const app = createApp(App)
    app.use(themeonPlugin, { themes: ['light', 'dark'], storageKey: null })
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(() => app.mount(el)).not.toThrow()
    expect(el.textContent).toBe('ok')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    app.unmount()
    el.remove()
  })

  test('второй init() — no-op, не сбрасывает применённую тему', () => {
    const state = createThemeState({ themes: ['light', 'dark'], storageKey: null })
    state.init()
    state.set('dark')
    state.init()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('бросающий seam НЕ отравляет `initialized` — повтор инициализирует', () => {
    let calls = 0
    const state = createThemeState({
      themes: ['light', 'dark'],
      storageKey: null,
      media: () => {
        calls += 1
        if (calls === 1) throw new Error('broken seam')
        return { matches: false }
      },
    })
    expect(() => state.init()).toThrow('broken seam')
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    expect(() => state.init()).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

describe('createThemeState — с matchMedia-шимом (P-D49 живое следование за ОС)', () => {
  test("preference==='system' резолвится в dark, событие change перекрашивает", () => {
    let changeHandler: (() => void) | undefined
    let matches = true
    const media = {
      get matches() {
        return matches
      },
      addEventListener: (_type: 'change', cb: () => void) => {
        changeHandler = cb
      },
    }
    // jsdom не реализует matchMedia — определяем её только на время теста
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => media,
    })
    try {
      const state = createThemeState({ themes: ['light', 'dark'], default: 'system', storageKey: null })
      state.init()
      expect(state.theme.value).toBe('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

      matches = false
      changeHandler?.()
      expect(state.theme.value).toBe('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    } finally {
      // @ts-expect-error — снимаем определение, восстанавливая «matchMedia отсутствует»
      delete window.matchMedia
    }
  })
})
