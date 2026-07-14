import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useHead } from '#imports'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import type { ModulePublicRuntimeConfig } from '../types'

/**
 * Анти-FOUC head-скрипт, маршрут B (P3.8, P-D50) — генерируется НА КАЖДЫЙ SSR-ЗАПРОС из
 * `runtimeConfig`, а не запекается в `nuxt.config` на сборке.
 *
 * Почему не `app.head.script` (маршрут A, как было в P3.4): тег из `nuxt.config` фиксируется на
 * сборке, поэтому `NUXT_PUBLIC_THEMEON_DEFAULT` (ради которого модуль и обязан эмитить ключ
 * `default`, P3.7 Rule 6) доезжал только до рантайма — pre-paint скрипт красил тему по СТАРОМУ
 * значению, а `init()` после гидрации перекрашивал по новому. Видимая вспышка ровно там, где
 * анти-FOUC обязан её устранять. Теперь оба канала читают ОДИН источник — `runtimeConfig.public`.
 *
 * `tagPriority: 'critical'` — тег уезжает в начало `<head>`, до стилей; `key` — дедуп Unhead.
 * Генератор — ОДИН (`themeInitScript` из `@themeon/vue/anti-fouc`, D6, инвариант фазы 4):
 * второй реализации скрипта здесь не появляется.
 *
 * SPA (`ssr: false`) сюда не попадает — там сервера нет, и `runtimeConfig` всё равно запекается на
 * сборке (env-override невозможен в принципе), поэтому модуль оставляет статический тег.
 */
export default defineNuxtPlugin({
  name: 'themeon:fouc',
  enforce: 'pre',
  setup() {
    const cfg = useRuntimeConfig().public.themeon as ModulePublicRuntimeConfig['themeon']

    useHead({
      script: [
        {
          key: 'themeon-fouc',
          innerHTML: themeInitScript({
            storageKey: cfg.storageKey,
            attribute: cfg.attribute,
            default: cfg.default,
            themes: cfg.themes,
          }),
          tagPosition: 'head',
          tagPriority: 'critical',
        },
      ],
    })
  },
})
