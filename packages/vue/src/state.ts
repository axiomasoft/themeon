/**
 * `createThemeState` (P3.1) — фабрика реактивного состояния темы, общая для `useTheme()`
 * (module-level singleton, этот файл) и Vue-плагина `themeonPlugin` (per-app provide, P3.2).
 *
 * Единый владелец записи в DOM (инвариант фазы №1, `phases/P3.md`): `applyOne` — единственный
 * путь, которым состояние трогает `<html>` — атрибут `data-theme` (статические темы, их
 * var-своп делает `[data-theme]`-блок `tokens.css`) + опциональный runtime-патч через
 * `applyTheme` ядра для тем из `runtimeVars` (тенант/динамика, задел P6).
 *
 * SSR-нейтральность (инвариант №2): фабрика ничего не читает из `document`/`localStorage`/
 * `matchMedia` на этапе создания — только внутри `set()`/`init()`, и то через seam-геттеры
 * (`target`/`storage`/`media`), которые по умолчанию лениво ссылаются на реальные глобалы.
 * Импорт и вызов `createThemeState()` безопасны на сервере; писать в DOM обязан только клиент.
 */
import { computed, readonly, ref } from 'vue'
import { applyTheme, clearTheme } from '@themeon/core'
import { DEFAULT_ATTRIBUTE, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, DEFAULT_STORAGE_KEY } from './defaults'
import { normalizeThemeName } from './theme-name'
import type { UseThemeOptions, UseThemeReturn } from './types'

// Ключ/атрибут — из общего `defaults.ts` (P3.2 Rule 3): тот же источник, что и у
// `themeInitScript` (anti-fouc.ts), иначе сгенерированный скрипт и рантайм разъедутся.
const DEFAULT_THEMES = [DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME] as const
const DEFAULT_SYSTEM = { dark: DEFAULT_DARK_THEME, light: DEFAULT_LIGHT_THEME } as const

/**
 * Глушит CSS-transition на кадр смены темы (известный приём против «протекания» transition,
 * R-13 §2.1): инжектит `<style>` с `transition:none !important`, форсит reflow, выполняет
 * `write`, затем снимает стиль на следующих двух кадрах (двойной rAF — гарантия, что браузер
 * успел применить новый стиль до восстановления transition; `setTimeout` — fallback без rAF,
 * т.е. вне браузера/в тестах). Client-only: без `document` просто выполняет `write`.
 */
function withoutTransition(enabled: boolean, write: () => void): void {
  if (!enabled || typeof document === 'undefined') {
    write()
    return
  }
  const style = document.createElement('style')
  style.textContent = '*,*::before,*::after{transition:none !important}'
  document.head.appendChild(style)
  // форс-reflow — иначе браузер может применить write() и снятие стиля одним кадром
  void document.documentElement.offsetHeight
  write()
  const remove = (): void => {
    style.remove()
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(remove))
  } else {
    setTimeout(remove, 0)
  }
}

/** Создаёт независимый экземпляр реактивного состояния темы (per-app в P3.2, singleton в P3.1). */
export function createThemeState(options: UseThemeOptions = {}): UseThemeReturn {
  const explicitThemes = options.themes
  const cycleThemes = options.themes ?? DEFAULT_THEMES
  const storageKey = options.storageKey === undefined ? DEFAULT_STORAGE_KEY : options.storageKey
  const attribute = options.attribute ?? DEFAULT_ATTRIBUTE
  const systemMap = options.system ?? DEFAULT_SYSTEM
  const disableTransition = options.disableTransition ?? true
  const runtimeVars = options.runtimeVars ?? {}
  const getTarget = options.target ?? (() => document.documentElement)
  const getStorage =
    options.storage ??
    (() => {
      // seam-геттер оборачиваем в try/catch: Safari private mode/cookies-blocked Chrome
      // бросают SecurityError/QuotaExceededError уже на доступе к `localStorage` (анти-FOUC
      // спека требует не ронять инициализацию темы из-за этого)
      try {
        return typeof localStorage === 'undefined' ? null : localStorage
      } catch {
        return null
      }
    })
  const getMedia = options.media ?? ((query: string) => matchMedia(query))

  // Один резолв на состояние (P3.7): пустая/пробельная строка (Nuxt-коерс незаданной опции
  // runtimeConfig в '') не считается заданной темой — используется и здесь, и в `init()`.
  const explicitDefault = normalizeThemeName(options.default)

  // SSR-нейтральный дефолт: не зависит от system/stored, чтобы серверная и клиентская первая
  // отрисовка совпадали (инвариант №2) — фактическая тема резолвится позже, в `init()`.
  const theme = ref<string>(explicitDefault ?? cycleThemes[0] ?? 'light')
  const system = ref<'dark' | 'light'>('light')
  let lastRuntimeVarNames: string[] = []
  let initialized = false

  const isDark = computed(() => theme.value === systemMap.dark)

  function applyOne(name: string): void {
    const el = getTarget()
    el.setAttribute(attribute, name)
    const patch = runtimeVars[name]
    if (lastRuntimeVarNames.length > 0) {
      // прошлая тема была динамической — снять её inline-var перед применением следующей,
      // иначе var'ы, которых нет в новом патче (или его вовсе нет), протекают как inline
      // и перебивают статический `[data-theme]`-блок tokens.css (D8: inline сильнее layered)
      clearTheme(el, lastRuntimeVarNames)
      lastRuntimeVarNames = []
    }
    if (patch) {
      applyTheme(el, patch)
      lastRuntimeVarNames = Object.keys(patch)
    }
  }

  function set(name: string): void {
    if (normalizeThemeName(name) === undefined) {
      console.warn('[themeon] useTheme: set() ignored an empty theme name')
      return
    }
    if (explicitThemes && !explicitThemes.includes(name)) {
      console.warn(
        `[themeon] useTheme: unknown theme "${name}"; known themes: ${explicitThemes.join(', ')}`,
      )
    }
    theme.value = name
    withoutTransition(disableTransition, () => applyOne(name))
    if (storageKey !== null) {
      try {
        getStorage()?.setItem(storageKey, name)
      } catch {
        // localStorage недоступен (private mode/quota) — не роняем смену темы
      }
    }
  }

  function toggle(a?: string, b?: string): void {
    const first = a ?? cycleThemes[0] ?? 'light'
    const second = b ?? cycleThemes[1] ?? first
    set(theme.value === first ? second : first)
  }

  function init(): void {
    if (initialized) return
    initialized = true

    let stored: string | null = null
    if (storageKey !== null) {
      try {
        // Нормализуем ДО проверки `storedIsKnown` (P3.7): отравленный персист ('', записанный
        // дефектной сборкой до фикса) не должен проходить как валидное имя темы открытого набора.
        stored = normalizeThemeName(getStorage()?.getItem(storageKey)) ?? null
      } catch {
        // localStorage недоступен (private mode/quota) — стартуем без персиста
        stored = null
      }
    }

    const media = getMedia('(prefers-color-scheme: dark)')
    system.value = media.matches ? 'dark' : 'light'
    // подписка живёт, только если seam её предоставляет (реальный MediaQueryList — умеет)
    media.addEventListener?.('change', () => {
      system.value = media.matches ? 'dark' : 'light'
    })

    // `themes` не задан явно (open set — например, только `runtimeVars`) — доверяем
    // персисту любое сохранённое имя; если `themes` задан явно, персист валиден только
    // среди перечисленных тем (симметрично с проверкой в `set()`, см. HIGH P3.1)
    const storedIsKnown = stored !== null && (explicitThemes ? explicitThemes.includes(stored) : true)
    const active = storedIsKnown ? (stored as string) : (explicitDefault ?? systemMap[system.value])
    set(active)
  }

  return {
    theme: readonly(theme),
    system: readonly(system),
    isDark,
    set,
    toggle,
    init,
  }
}
