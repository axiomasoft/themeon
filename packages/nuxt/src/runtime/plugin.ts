import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { themeonPlugin, useTheme } from '@themeon/vue'
import type { UseThemeOptions } from '@themeon/vue'

/**
 * Рантайм-bootstrap модуля: ставит per-app (= per-request в SSR) `themeonPlugin` ДО
 * любого `useTheme()` в компонентах — так `useTheme()` инжектит именно это состояние,
 * а не module-level singleton-fallback `@themeon/vue` (который течёт между запросами
 * на сервере). `enforce:'pre'` гарантирует порядок относительно других плагинов.
 */
export default defineNuxtPlugin({
  name: 'themeon',
  enforce: 'pre',
  setup(nuxtApp) {
    const cfg = useRuntimeConfig().public.themeon as UseThemeOptions

    nuxtApp.vueApp.use(themeonPlugin, cfg)

    // `init()` читает localStorage/matchMedia — только на клиенте (SSR-разметка не
    // зависит от темы, инвариант фазы №2).
    if (import.meta.client) useTheme(cfg).init()
  },
})
