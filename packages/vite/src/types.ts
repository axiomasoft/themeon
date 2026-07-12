/**
 * Опции `@themeon/vite` (P3.5). Пакет — Vite-канал для Laravel/plain-проектов (не-Nuxt, у
 * Nuxt свой модуль `@themeon/nuxt` P3.3/P3.4): отдаёт CSS темы через виртуальный модуль
 * `virtual:themeon.css`, переисчитывает его по HMR (`hotUpdate`) при изменении файлов токенов
 * и опционально вставляет анти-FOUC скрипт в `index.html`.
 */
import type { ResolveOptions, SerializeCssOptions, ThemeDefinition } from '@themeon/core'
import type { ThemeInitScriptOptions } from '@themeon/vue/anti-fouc'

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
  tokensFiles?: string[]
  /** Опции резолвера ядра (`resolveTheme`), проброс как есть. */
  resolve?: ResolveOptions
  /** Опции сериализатора ядра (`serializeThemeCss`), проброс как есть. */
  serialize?: SerializeCssOptions
  /** Id виртуального модуля. Default `'virtual:themeon.css'`. */
  virtualId?: string
  /**
   * Вставить анти-FOUC скрипт (`themeInitScript`, единый генератор P3.2) в `index.html` через
   * `transformIndexHtml`. `true` — с дефолтными опциями скрипта, объект — проброс опций.
   */
  injectFouc?: boolean | ThemeInitScriptOptions
}
