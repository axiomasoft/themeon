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
  /** Известные имена тем; `toggle()` по умолчанию циклит первые две. Default `['light','dark']`. */
  themes?: readonly string[]
  /**
   * Тема, когда нет сохранённой И не хотим системную. Если не задан — берётся системная.
   * Пустая/пробельная строка = «не задано» (то же, что отсутствие опции): так отсутствующее
   * значение приезжает по JSON/env-транспорту (Nitro нормализует незаданный `runtimeConfig`
   * в `''`), и трактовать его как имя темы значит убить `prefers-color-scheme`-фолбэк.
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
  /** Активная тема. */
  readonly theme: Readonly<Ref<string>>
  /** Системное предпочтение (`prefers-color-scheme`). */
  readonly system: Readonly<Ref<SystemPreference>>
  /** `theme === system.dark`-имя. */
  readonly isDark: ComputedRef<boolean>
  /**
   * Применяет тему: атрибут + персист (+ runtime-var-патч для тем из `runtimeVars`).
   * Пустое/пробельное имя игнорируется — `console.warn` и выход БЕЗ записи в DOM/хранилище,
   * текущая тема остаётся на месте (пустая строка — не тема, см. `UseThemeOptions.default`).
   * Неизвестная тема при заданном `themes` — предупреждение, но тема применяется.
   */
  set(theme: string): void
  toggle(a?: string, b?: string): void
  init(): void
}
