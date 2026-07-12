/**
 * Публичные опции модуля `@themeon/nuxt` (`configKey: 'themeon'`). Поля `theme`/`tokensDir`
 * codegen'а и dev-watcher'а (D13) объявлены здесь заранее (P3.3), но реализуются в P3.4 —
 * в P3.3 их значение читается только для проброса в рантайм-конфиг, `undefined` = выключено.
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
  /** Вставлять сгенерированный анти-FOUC head-скрипт (`@themeon/vue/anti-fouc`). Default `true`. Реализуется в P3.4. */
  fouc?: boolean
  /** Путь к модулю пользовательской темы (`defineTheme`, default-export). Codegen — P3.4. */
  theme?: string
  /** Директория для dev-watcher (хэш содержимого, D13). Default — `dirname(theme)`. Реализуется в P3.4. */
  tokensDir?: string
}

/**
 * Публичная часть `runtimeConfig.public.themeon`, читаемая рантайм-плагином
 * (`src/runtime/plugin.ts`). `storageKey`/`themes`/`attribute` не-опциональны здесь: к моменту
 * попадания в `setup()` `defineNuxtModule` уже смержил их с `defaults` через `defu` — только
 * `default` (тема по умолчанию) намеренно остаётся без дефолта.
 */
export interface ModulePublicRuntimeConfig {
  themeon: {
    storageKey: string
    default: string | undefined
    // Nuxt сериализует runtimeConfig в JSON (nitro) — массив всегда мутабелен на выходе;
    // держим mutable здесь, чтобы совпадать с генерируемым `PublicRuntimeConfig`.
    themes: string[]
    attribute: string
  }
}
