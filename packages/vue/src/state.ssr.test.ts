/**
 * T5 (findings/P8-nuxt-vue-runtime.md §5) — SSR/node-env: `environment: node` (дефолт пакета,
 * НЕТ `document`/`window`/`matchMedia`, ровно как в реальном SSR-рендере). `init()`/`set()` —
 * тихий no-op, `system` остаётся `'light'`; компонент, зовущий `init()` в `setup`, не падает
 * при `renderToString`.
 */
import { createSSRApp, defineComponent, h, onMounted } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, test } from 'vitest'
import { createThemeState } from './state'

describe('createThemeState — SSR (node-env, без document/window/matchMedia)', () => {
  test('init() — тихий no-op, не бросает, system остаётся light', () => {
    expect(typeof document).toBe('undefined')
    expect(typeof window).toBe('undefined')
    const state = createThemeState({ themes: ['light', 'dark'] })
    expect(() => state.init()).not.toThrow()
    expect(state.system.value).toBe('light')
  })

  test('set() — тихий no-op, не бросает', () => {
    const state = createThemeState({ themes: ['light', 'dark'], storageKey: null })
    expect(() => state.set('dark')).not.toThrow()
    expect(state.theme.value).toBe('dark')
  })

  test('renderToString компонента, зовущего init() в setup, не падает', async () => {
    const state = createThemeState({ themes: ['light', 'dark'] })
    const App = defineComponent({
      setup() {
        onMounted(() => state.init())
        state.init()
        return () => h('div', state.theme.value)
      },
    })
    await expect(renderToString(createSSRApp(App))).resolves.toBe('<div>light</div>')
  })
})
