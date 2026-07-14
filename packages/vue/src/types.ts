/**
 * Публичные типы `useTheme()` (P3.1). Форма return-типа заимствует VueUse `useColorMode`
 * (`{ store, system, state }` → у нас `{ theme, system, isDark, set, toggle, init }`,
 * R-13 §2.1), запись в DOM — свой applier ядра (P-D23), не VueUse.
 */
import type { ComputedRef, Ref } from 'vue'
import type { ElementLike } from '@themeon/core'

/** Минимальный интерфейс хранилища — совместим с `localStorage`, сидируется для тестов. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Разрешённое системное предпочтение цветовой схемы. */
export type SystemPreference = 'dark' | 'light'

export interface UseThemeOptions {
  /**
   * Known theme names; `toggle()` cycles the first two by default. Default `['light','dark']`.
   * `'system'` is a reserved *preference* (follow the OS), not a theme — do not list it here.
   */
  themes?: readonly string[]
  /**
   * Preference used when nothing is persisted. Either a theme name or `'system'` (follow the OS).
   * Default `'system'`.
   *
   * An empty or whitespace-only string means "not set" (same as omitting the option) and resolves
   * to `'system'`: that is how a missing value arrives over a JSON/env transport — Nitro coerces an
   * unset `runtimeConfig` value to `''` — and treating it as a theme name would kill the
   * `prefers-color-scheme` fallback.
   */
  default?: string
  /** Ключ localStorage; `null` отключает персист. Default `'themeon-theme'`. */
  storageKey?: string | null
  /** DOM-атрибут переключения. Default `'data-theme'` (D6). */
  attribute?: string
  /** Отображение системного предпочтения → имя темы. Default `{ dark:'dark', light:'light' }`. */
  system?: { dark: string; light: string }
  /** Глушить transition на кадр смены. Default `true`. */
  disableTransition?: boolean
  /** Runtime var-патчи для тем, которых НЕТ в статическом `tokens.css` (тенант/динамика, P6). */
  runtimeVars?: Readonly<Record<string, Record<string, string>>>
  /** Seam: целевой элемент. Default `() => document.documentElement`. */
  target?: () => ElementLike & {
    setAttribute(n: string, v: string): void
  }
  /** Seam: хранилище. Default `() => localStorage`. */
  storage?: () => StorageLike | null
  /** Seam: медиа-квери. Default `(q) => matchMedia(q)`. */
  media?: (query: string) => {
    matches: boolean
    addEventListener?: (t: 'change', cb: () => void) => void
  }
}

export interface UseThemeReturn {
  /**
   * The user's *intent* — `'system'` (follow the OS) or an explicit theme name. This is the value
   * that gets persisted, and the one a theme switcher should render as "selected".
   *
   * It is deliberately separate from `theme`: persisting the *resolved* theme instead of the intent
   * would silently unsubscribe the user from `prefers-color-scheme` forever (they could never get
   * back to "follow the OS"). Same split as VueUse `useColorMode` (`store`/`state`) and next-themes
   * (`theme`/`resolvedTheme`).
   */
  readonly preference: Readonly<Ref<string>>
  /** The *resolved* theme actually applied to the DOM (`'system'` already resolved via `system`). */
  readonly theme: Readonly<Ref<string>>
  /** The OS preference (`prefers-color-scheme`), tracked live. */
  readonly system: Readonly<Ref<SystemPreference>>
  /** Whether the resolved `theme` is the dark one. */
  readonly isDark: ComputedRef<boolean>
  /**
   * Sets the preference: a theme name, or `'system'` to follow the OS again. Applies the resolved
   * theme to the DOM (+ the `runtimeVars` patch, if any) and persists the *preference*.
   *
   * An empty or whitespace-only value is ignored — it warns and returns without touching the DOM or
   * storage, leaving the current theme in place (an empty string is not a theme, see
   * `UseThemeOptions.default`). An unknown theme (when `themes` is set) warns but is still applied.
   */
  set(preference: string): void
  /** Cycles between two themes (by default the first two of `themes`), based on the resolved theme. */
  toggle(a?: string, b?: string): void
  /** Client-only: reads persistence + `prefers-color-scheme`, resolves and applies the theme. */
  init(): void
}
