/**
 * Публичные опции модуля `@themeon/nuxt` (`configKey: 'themeon'`). Поля `theme`/`tokensDir`
 * запускают codegen пользовательской темы + dev-watcher по хэшу директории (D13), `fouc` —
 * анти-FOUC head-скрипт (`@themeon/vue/anti-fouc`, P3.4).
 */
export interface ModuleOptions {
  /** Подключать статический CSS-фундамент пакета (`tokens.css`+`index.css`). Default `true`. */
  css?: boolean
  /** Ключ localStorage для персиста активной темы. Default `'themeon-theme'` (`@themeon/vue`). */
  storageKey?: string
  /** Тема по умолчанию, когда нет сохранённой и не хотим системную. */
  default?: string
  /** Известные имена тем. Default `['light', 'dark']`. */
  themes?: readonly string[]
  /** DOM-атрибут переключения. Default `'data-theme'` (D6). */
  attribute?: string
  /** Вставлять сгенерированный анти-FOUC head-скрипт (`@themeon/vue/anti-fouc`). Default `true`. */
  fouc?: boolean
  /**
   * Путь к модулю пользовательской темы (`defineTheme`, default-export ИЛИ именованный
   * `theme`/`defaultTheme`). Если задан — заменяет статический `@themeon/css/tokens.css`
   * сгенерированным (`addTemplate`, P3.4).
   */
  theme?: string
  /** Директория для dev-watcher (хэш содержимого, D13). Default — `dirname(theme)`. */
  tokensDir?: string
}

/**
 * Публичная часть `runtimeConfig.public.themeon`, читаемая рантайм-плагином
 * (`src/runtime/plugin.ts`). `storageKey`/`themes`/`attribute`/`default` не-опциональны здесь: к
 * моменту попадания в `setup()` `defineNuxtModule` уже смержил их с `defaults` через `defu`.
 * `default: ''` (и незаданная опция) означает «не задано» — ключ обязан присутствовать ради
 * `NUXT_PUBLIC_THEMEON_DEFAULT`-override (P3.7); рантайм (`@themeon/vue`) трактует '' как
 * отсутствие явной темы, а не как литеральное имя.
 */
export interface ModulePublicRuntimeConfig {
  themeon: {
    storageKey: string
    default: string
    // Nuxt сериализует runtimeConfig в JSON (nitro) — массив всегда мутабелен на выходе;
    // держим mutable здесь, чтобы совпадать с генерируемым `PublicRuntimeConfig`.
    themes: string[]
    attribute: string
  }
}
