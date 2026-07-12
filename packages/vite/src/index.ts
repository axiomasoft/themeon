/**
 * `@themeon/vite` (P3.5) — Vite-плагин для Laravel/plain-проектов (не-Nuxt): у Nuxt свой
 * канал `@themeon/nuxt` (P3.3/P3.4), этот пакет им не пользуется.
 *
 * Виртуальный модуль `virtual:themeon.css` — конвенция Vite (R-13 §4.1): публичный id должен
 * начинаться с `virtual:`, а `resolveId` возвращает тот же id с ведущим `\0` (Rollup-конвенция
 * «не трогать другим плагинам/резолву на диске», https://vite.dev/guide/api-plugin). `load`
 * отдаёт CSS темы (`serializeThemeCss(resolveTheme(theme))`, P-D14 — naming/резолв уже сделаны
 * ядром, этот плагин ничего не именует сам).
 *
 * HMR токенов — хук `hotUpdate` (Vite Environment API, P-D26), НЕ deprecated `handleHotUpdate`
 * и НЕ старые `server.moduleGraph`/`server.ws` (заменены `this.environment.*`): при изменении
 * файла из `tokensFiles` инвалидируем модуль в графе окружения и шлём клиенту `css-update`
 * (паттерн UnoCSS `dev.ts` — R-13 §4.3). `hotUpdate` возвращает `[]`, чтобы Vite не делал
 * full-reload по умолчанию — мы обработали апдейт сами.
 */
import { normalizePath } from 'vite'
import { resolveTheme, serializeThemeCss } from '@themeon/core'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import type { Plugin } from 'vite'
import type { ThemeonViteOptions } from './types'

export type { ThemeonViteOptions } from './types'

/** Создаёт Vite-плагин ThemeOn: виртуальный CSS темы + HMR + опц. анти-FOUC. */
export function themeon(options: ThemeonViteOptions): Plugin {
  if (!options?.theme) {
    throw new Error('[themeon] vite plugin: `theme` option is required')
  }

  const V_ID = options.virtualId ?? 'virtual:themeon.css'
  const RESOLVED = `\0${V_ID}`
  const tokensFiles = new Set((options.tokensFiles ?? []).map((f) => normalizePath(f)))

  /** Пересобирает CSS темы: тема-фабрика вызывается заново на каждый `load` — читает актуальное состояние при HMR. */
  const buildCss = async (): Promise<string> => {
    const t = typeof options.theme === 'function' ? await options.theme() : options.theme
    return serializeThemeCss(resolveTheme(t, options.resolve), options.serialize)
  }

  return {
    name: 'themeon',

    resolveId(id) {
      if (id === V_ID) return RESOLVED
      return undefined
    },

    load(id) {
      if (id === RESOLVED) return buildCss()
      return undefined
    },

    hotUpdate({ file }) {
      if (!tokensFiles.has(normalizePath(file))) return undefined
      const mod = this.environment.moduleGraph.getModuleById(RESOLVED)
      if (!mod) return undefined
      this.environment.moduleGraph.invalidateModule(mod)
      this.environment.hot.send({
        type: 'update',
        updates: [
          {
            type: 'css-update',
            path: mod.url,
            acceptedPath: mod.url,
            timestamp: Date.now(),
          },
        ],
      })
      return []
    },

    transformIndexHtml() {
      if (!options.injectFouc) return undefined
      const foucOpts = options.injectFouc === true ? {} : options.injectFouc
      return [
        {
          tag: 'script',
          children: themeInitScript(foucOpts),
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}
