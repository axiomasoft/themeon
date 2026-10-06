/**
 * Опции `@themeon/vite` (P3.5). Пакет — Vite-канал для Laravel/plain-проектов (не-Nuxt, у
 * Nuxt свой модуль `@themeon/nuxt` P3.3/P3.4): отдаёт CSS темы через виртуальный модуль
 * `virtual:themeon.css`, переисчитывает его по HMR (`hotUpdate`) при изменении файлов токенов
 * и опционально вставляет анти-FOUC скрипт в `index.html`.
 */
import type { ThemeDefinition } from '@themeon/core/authoring'
import type { ResolveOptions, SerializeCssOptions } from '@themeon/core/compiler'
import type { ThemeInitScriptOptions } from '@themeon/vue/anti-fouc'

/** Disk artifacts for PHP/Laravel consumers (P3.3). */
export interface ThemeonArtifactsOptions {
  /** Output directory relative to Vite root. Default `.themeon`. */
  dir?: string | undefined
  /** Manifest filename inside `dir`. Default `manifest.json`. */
  manifestFile?: string | undefined
  /** CSP artifact filename inside `dir`. Default `csp.json`. */
  cspFile?: string | undefined
  /** Trailing debounce for watch/HMR artifact writes. Default `50` ms. */
  debounceMs?: number | undefined
}

export interface ThemeonViteOptions {
  /**
   * Тема (обязательна) — либо готовое определение, либо (async-)фабрика, вызываемая на каждый
   * `load()` виртуального модуля (перечитывает актуальное состояние при HMR).
   */
  theme: ThemeDefinition | (() => ThemeDefinition | Promise<ThemeDefinition>)
  /**
   * Абсолютные/нормализуемые пути файлов, изменение которых триггерит HMR виртуального модуля.
   * Без этой опции HMR не активен — тема живёт целиком в конфиге и меняется через рестарт Vite.
   */
  tokensFiles?: string[] | undefined
  /** Опции резолвера ядра (`resolveTheme`), проброс как есть. */
  resolve?: ResolveOptions | undefined
  /** Опции сериализатора ядра (`serializeThemeCss`), проброс как есть. */
  serialize?: SerializeCssOptions | undefined
  /** Id виртуального модуля. Default `'virtual:themeon.css'`. */
  virtualId?: string | undefined
  /**
   * CSS-first канал для проектов без JS-энтри (напр. Laravel Blade): плагин пишет CSS темы в
   * реальный файл на диске и алиасит `virtualId` на него (`resolve.alias`) — документированный
   * `@import 'virtual:themeon.css'` в CSS остаётся рабочим, потому что резолвится как обычный
   * файл, а не virtual-модуль (virtual-модули в CSS `@import` не резолвятся — Blocker #1,
   * `findings/P8-vite-channel-hmr.md`). ДОПОЛНИТЕЛЬНАЯ опция, канон — `import` из JS (см. выше).
   * `true` — дефолтный путь `<root>/.themeon/theme.css`; объект — кастомный относительный путь.
   */
  cssImport?: boolean | { file?: string } | undefined
  /**
   * Вставить анти-FOUC скрипт (`themeInitScript`, единый генератор P3.2) в `index.html` через
   * `transformIndexHtml`. `true` — с дефолтными опциями скрипта, объект — проброс опций.
   */
  injectFouc?: boolean | ThemeInitScriptOptions | undefined
  /**
   * Emit PHP-readable `manifest.json` (+ optional `csp.json` when `injectFouc` is set) under
   * `.themeon/`. Defaults to `true` when `cssImport` is enabled; otherwise `false`.
   */
  artifacts?: boolean | ThemeonArtifactsOptions | undefined
}
