/**
 * `useTheme()` (P3.1, дополнено P3.2) — публичный composable. Сначала пробует
 * `inject(THEME_INJECTION_KEY)` — per-app состояние, положенное `themeonPlugin` (P3.2,
 * SSR-безопасно: отдельный экземпляр на приложение/запрос). Если провайдера нет — module-level
 * singleton-fallback для plain-SPA без плагина: первый вызов создаёт состояние, все
 * последующие возвращают тот же экземпляр (опции, переданные не первым вызовом, игнорируются
 * — задокументированное ограничение singleton-режима). Singleton-режим НЕ SSR-safe (состояние
 * переживает между запросами на сервере) — в dev печатает предупреждение вне client-only
 * контекста, рекомендуя `app.use(themeonPlugin)`.
 */
import { hasInjectionContext, inject } from 'vue'
import { THEME_INJECTION_KEY } from './plugin'
import { createThemeState } from './state'
import type { UseThemeOptions, UseThemeReturn } from './types'

let singleton: UseThemeReturn | undefined

/**
 * Dev-guard в стиле `packages/core/src/apply.ts` (`isDev`): считаем окружение
 * «не production», если `process.env.NODE_ENV` не равен `'production'`. Читаем структурно,
 * без импорта node-типов — модуль остаётся SSR-нейтральным.
 */
function isDev(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env
  return env?.NODE_ENV !== 'production'
}

/**
 * @example
 * ```ts
 * const { theme, isDark, set, toggle, init } = useTheme({ themes: ['light', 'dark'] })
 * onMounted(() => init())
 * ```
 */
export function useTheme(options?: UseThemeOptions): UseThemeReturn {
  // `inject` бросает вне setup/lifecycle-хука — гейтим `hasInjectionContext()` (Vue 3.3+),
  // чтобы module-level вызовы (тесты, plain-скрипты) не падали и уходили в singleton-fallback
  if (hasInjectionContext()) {
    const provided = inject(THEME_INJECTION_KEY, undefined)
    if (provided) return provided
  }
  if (!singleton && isDev()) {
    // нет провайдера — singleton-fallback не SSR-safe (состояние переживает между запросами
    // на сервере); предупреждаем один раз, при создании singleton, а не на каждый вызов
    console.warn(
      '[themeon] useTheme: no themeonPlugin provider found, falling back to a module-level ' +
        'singleton. This is fine for plain SPA, but is NOT safe for SSR — register ' +
        '`app.use(themeonPlugin)` instead.',
    )
  }
  singleton ??= createThemeState(options)
  return singleton
}

export type { StorageLike, SystemPreference, UseThemeOptions, UseThemeReturn } from './types'
