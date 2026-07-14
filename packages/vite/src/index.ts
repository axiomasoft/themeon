/**
 * `@themeon/vite` (P3.5, канал/HMR починены P8.2) — Vite-плагин для Laravel/plain-проектов
 * (не-Nuxt): у Nuxt свой канал `@themeon/nuxt` (P3.3/P3.4), этот пакет им не пользуется.
 *
 * Виртуальный модуль `virtual:themeon.css` — конвенция Vite: публичный id должен начинаться с
 * `virtual:`, а `resolveId` возвращает тот же id с ведущим `\0` (Rollup-конвенция «не трогать
 * другим плагинам/резолву на диске», https://vite.dev/guide/api-plugin). `load` отдаёт CSS темы
 * (`serializeThemeCss(resolveTheme(theme))`, P-D14 — naming/резолв уже сделаны ядром, этот
 * плагин ничего не именует сам). **Канонический канал — `import 'virtual:themeon.css'` из
 * JS-энтри; CSS-`@import` виртуального модуля физически невозможен** — `vite:css` резолвит
 * `@import` через postcss-import собственным fs-резолвером, плагинные `resolveId`/`load` в
 * этой ветке не вызываются (P-D55, `findings/P8-vite-channel-hmr.md` §3/§6.1).
 *
 * HMR токенов — хук `hotUpdate` (Vite Environment API). Возвращаем `[mod]` и даём Vite самому
 * сформировать и отправить payload: только эта форма устойчива к `\0`-нормализации dev-URL
 * (виртуальный `mod.url` — сырой `\0virtual:themeon.css`, а не `/@id/__x00__…`, поэтому ручной
 * `hot.send` с любым угаданным path — no-op). `tokensFiles` резолвятся в АБСОЛЮТНЫЕ пути в
 * `configResolved` (от `config.root`) — `hotUpdate({file})` всегда даёт абсолютный путь, а
 * относительные пути из README иначе никогда не матчатся. Supersedes P-D26 (`css-update`).
 * `findings/P8-vite-channel-hmr.md` §4/§6.2 (D1–D3).
 *
 * `cssImport` — ДОПОЛНИТЕЛЬНАЯ опция для CSS-first проектов без JS-энтри (Laravel Blade и
 * т.п.): плагин пишет CSS темы в реальный файл на диске и алиасит `virtualId` на этот файл
 * (`resolve.alias`) — документированный синтаксис `@import 'virtual:themeon.css'` остаётся
 * рабочим, потому что резолвится он теперь как ОБЫЧНЫЙ файл (fs), а не virtual-модуль; HMR идёт
 * штатным вотчером Vite на реальный файл (§6.3). Не замена канона, а опция.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve as resolveFromRoot } from 'node:path'
import { normalizePath } from 'vite'
import { resolveTheme, serializeThemeCss } from '@themeon/core'
import { themeInitScript } from '@themeon/vue/anti-fouc'
import type { Plugin, ResolvedConfig } from 'vite'
import type { ThemeonViteOptions } from './types'

export type { ThemeonViteOptions } from './types'

const DEFAULT_CSS_IMPORT_FILE = '.themeon/theme.css'

/** Создаёт Vite-плагин ThemeOn: виртуальный CSS темы + HMR + опц. анти-FOUC. */
export function themeon(options: ThemeonViteOptions): Plugin {
  if (!options?.theme) {
    throw new Error('[themeon] vite plugin: `theme` option is required')
  }

  const V_ID = options.virtualId ?? 'virtual:themeon.css'
  const RESOLVED = `\0${V_ID}`

  // D3 (findings §4): hotUpdate({file}) даёт АБСОЛЮТНЫЙ путь; относительные пути из README
  // (tokensFiles) иначе никогда не матчатся — резолвим один раз, когда известен config.root.
  let tokensFiles = new Set<string>()
  let cssImportFile: string | undefined

  /** Пересобирает CSS темы: тема-фабрика вызывается заново на каждый `load` — читает актуальное состояние при HMR. */
  const buildCss = async (): Promise<string> => {
    const t = typeof options.theme === 'function' ? await options.theme() : options.theme
    return serializeThemeCss(resolveTheme(t, options.resolve), options.serialize)
  }

  /** `cssImport`-канал: перезаписывает реальный файл на диске актуальным CSS темы. */
  const writeCssImportFile = async (): Promise<void> => {
    if (!cssImportFile) return
    const css = await buildCss()
    mkdirSync(dirname(cssImportFile), { recursive: true })
    writeFileSync(cssImportFile, css)
  }

  return {
    name: 'themeon',

    config(config) {
      if (!options.cssImport) return undefined
      const root = config.root ?? process.cwd()
      const rel =
        typeof options.cssImport === 'object' && options.cssImport.file
          ? options.cssImport.file
          : DEFAULT_CSS_IMPORT_FILE
      cssImportFile = resolveFromRoot(root, rel)
      // `@rollup/plugin-alias`-совместимый резолвер CSS-конвейера участвует в alias — в отличие
      // от virtual-модулей (§6.1/§6.3) — поэтому документированный `@import 'virtual:…'` здесь
      // резолвится как обычный файл на диске.
      return { resolve: { alias: [{ find: V_ID, replacement: cssImportFile }] } }
    },

    configResolved(config: ResolvedConfig) {
      tokensFiles = new Set(
        (options.tokensFiles ?? []).map((f) => normalizePath(resolveFromRoot(config.root, f))),
      )
    },

    async buildStart() {
      await writeCssImportFile()
    },

    resolveId(id) {
      if (id === V_ID) return RESOLVED
      return undefined
    },

    load(id) {
      if (id === RESOLVED) return buildCss()
      return undefined
    },

    // Без debounce (v1, ТЗ допускает): один save файла токенов = один hotUpdate-вызов Vite,
    // повторное сохранение того же файла в течение мс — редкий кейс для авторинга темы (не
    // hot-reload при печати кода); UnoCSS дебонсит ради частых событий watch-глоба множества
    // файлов, здесь `tokensFiles` — единичные файлы темы.
    async hotUpdate({ file }) {
      if (!tokensFiles.has(normalizePath(file))) return undefined
      await writeCssImportFile()
      const mod = this.environment.moduleGraph.getModuleById(RESOLVED)
      if (!mod) return undefined
      this.environment.moduleGraph.invalidateModule(mod) // не обязателен при `return [mod]`, но безвреден и явен
      // Vite сам формирует и шлёт `js-update` с нормализованным path (/@id/__x00__…) и
      // прогоняет его через self-accepting CSS-обёртку виртуального модуля
      // (__vite__updateStyle → <style data-vite-dev-id>) — без full reload.
      return [mod]
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
