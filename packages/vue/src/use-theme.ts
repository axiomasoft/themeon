/**
 * `useTheme()` (P3.1) — публичный composable. В P3.1 существует только module-level
 * singleton-fallback для plain-SPA без плагина: первый вызов создаёт состояние, все
 * последующие возвращают тот же экземпляр (опции, переданные не первым вызовом, игнорируются
 * — задокументированное ограничение singleton-режима). Не SSR-safe (состояние переживает между
 * запросами на сервере) — per-app инъекция через `themeonPlugin`/`inject` добавляется в P3.2 и
 * становится рекомендованным путём для SSR.
 */
import { createThemeState } from './state'
import type { UseThemeOptions, UseThemeReturn } from './types'

let singleton: UseThemeReturn | undefined

/**
 * @example
 * ```ts
 * const { theme, isDark, set, toggle, init } = useTheme({ themes: ['light', 'dark'] })
 * onMounted(() => init())
 * ```
 */
export function useTheme(options?: UseThemeOptions): UseThemeReturn {
  singleton ??= createThemeState(options)
  return singleton
}

export type { StorageLike, SystemPreference, UseThemeOptions, UseThemeReturn } from './types'
