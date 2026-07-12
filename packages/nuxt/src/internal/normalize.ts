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
    default: options.default,
    themes: [...(options.themes ?? MODULE_DEFAULTS.themes)],
    attribute: options.attribute ?? MODULE_DEFAULTS.attribute,
  }
}
