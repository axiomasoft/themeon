import type { ThemeInitScriptOptions } from '@themeon/vue/anti-fouc'
import type { ModuleOptions, ModulePublicRuntimeConfig } from '../types'

/** Пути CSS-фундамента пакета, вставляемые первыми (порядок tokens → index, P2.7). */
export const FOUNDATION_CSS = ['@themeon/css/tokens.css', '@themeon/css/index.css'] as const

/**
 * Дефолты модуля — единственный источник, используется и в `defineNuxtModule({ defaults })`
 * (module.ts), и здесь как fallback для полей, не пришедших от `defu`-мерджа (защитный слой:
 * `toPublicRuntimeConfig` остаётся верным чистым хелпером и без реального Nuxt-контекста).
 */
export const MODULE_DEFAULTS = {
  css: true,
  storageKey: 'themeon-theme',
  themes: ['light', 'dark'] as readonly string[],
  attribute: 'data-theme',
  fouc: true,
} as const

/** `false` — единственное значение, отключающее вставку CSS-фундамента; иначе (в т.ч. `undefined`) — включено. */
export function shouldPushCss(options: ModuleOptions): boolean {
  return options.css !== false
}

/** Чистая нормализация опций модуля → публичный runtime-конфиг для клиентского плагина. */
export function toPublicRuntimeConfig(options: ModuleOptions): ModulePublicRuntimeConfig['themeon'] {
  return {
    storageKey: options.storageKey ?? MODULE_DEFAULTS.storageKey,
    // Ключ обязан присутствовать (RAG nuxt.com/docs/guide/going-further/runtime-config) — иначе
    // `NUXT_PUBLIC_THEMEON_DEFAULT` невозможен; '' — документированная конвенция «объявлено,
    // значение придёт из env». Рантайм (`@themeon/vue`) трактует '' как отсутствие темы (P3.7).
    default: options.default ?? '',
    themes: [...(options.themes ?? MODULE_DEFAULTS.themes)],
    attribute: options.attribute ?? MODULE_DEFAULTS.attribute,
  }
}

/**
 * Чистая нормализация опций модуля → опции `themeInitScript` (анти-FOUC IIFE, P3.4).
 *
 * ВНИМАНИЕ (ограничение маршрута A): источник значений здесь — `ModuleOptions` (build-time
 * `nuxt.config`), а НЕ `runtimeConfig`. Скрипт запекается в `<head>` один раз на сборке
 * (`module.ts`), поэтому `NUXT_PUBLIC_THEMEON_*`-override, применяемый Nitro в рантайме,
 * до него НЕ доезжает: рантайм-канал (`useTheme().init()`) увидит env-значение, а pre-paint
 * скрипт — то, что было в конфиге на сборке. При расхождении будет видимая перекраска после
 * гидрации. Резолв скрипта из runtimeConfig на каждый запрос — маршрут B (nitro-инъекция),
 * намеренно отложен (см. комментарий в `module.ts`).
 * `storageKey`/`attribute` — ОДИН источник с `toPublicRuntimeConfig`/`useTheme()` (D6): анти-
 * FOUC скрипт и клиентский `init()` обязаны читать/писать один и тот же ключ/атрибут, иначе
 * скрипт выставляет тему до гидрации, а `useTheme` — другую после (видимая вспышка).
 * `darkTheme`/`lightTheme` не пробрасываются намеренно — `ModuleOptions` их не различает
 * (только `themes`/`default`), `themeInitScript()` использует свои дефолты `'dark'`/`'light'`,
 * совпадающие с дефолтами `@themeon/vue`.
 */
export function buildFoucScriptOptions(options: ModuleOptions): ThemeInitScriptOptions {
  return {
    storageKey: options.storageKey ?? MODULE_DEFAULTS.storageKey,
    attribute: options.attribute ?? MODULE_DEFAULTS.attribute,
    default: options.default,
  }
}
