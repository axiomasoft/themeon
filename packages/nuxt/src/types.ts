/**
 * Публичные опции модуля `@themeon/nuxt` (`configKey: 'themeon'`). Поля `theme`/`tokensDir`
 * запускают codegen пользовательской темы + живой dev-watcher (P8.4, дедуп по сгенерированному
 * CSS), `fouc` — анти-FOUC head-скрипт (`@themeon/vue/anti-fouc`, P3.4).
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
  /** Директория для dev-watcher (P8.4). Default — `dirname(theme)`; не может быть rootDir. */
  tokensDir?: string
}

/**
 * Публичная часть `runtimeConfig.public.themeon`, читаемая рантайм-плагином
 * (`src/runtime/plugin.ts`). `storageKey`/`themes`/`attribute`/`default` не-опциональны здесь: к
 * моменту попадания в `setup()` `defineNuxtModule` уже смержил их с `defaults` через `defu`.
 * `default: ''` (и незаданная опция) означает «не задано» — ключ обязан присутствовать ради
 * `NUXT_PUBLIC_THEMEON_DEFAULT`-override (P3.7); рантайм (`@themeon/vue`) трактует '' как
 * отсутствие явной темы, а не как литеральное имя.
 *
 * Область действия env-override: только ЭТОТ (рантайм) канал. Анти-FOUC head-скрипт запекается
 * на сборке из `nuxt.config` и env не видит — см. `internal/normalize.ts`
 * (`buildFoucScriptOptions`). Задавать тему по умолчанию ТОЛЬКО через `NUXT_PUBLIC_THEMEON_DEFAULT`,
 * не продублировав её в `nuxt.config`, значит получить вспышку темы на первой отрисовке.
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
