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
import {
  DEFAULT_ATTRIBUTE,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  DEFAULT_STORAGE_KEY,
  SYSTEM_PREFERENCE,
} from './defaults'
import { asThemeName } from './theme-name'
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

/**
 * Один гейт на весь модуль — канон VueUse (`isClient` = `typeof window !== 'undefined' &&
 * typeof document !== 'undefined'`, `packages/shared/utils/is.ts`).
 */
function isClient(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
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
  const getTarget = options.target ?? (() => (isClient() ? document.documentElement : null))
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
  // Симметрично `getStorage`: НЕТ окружения — НЕТ броска. jsdom имеет `document`, но НЕ имеет
  // `matchMedia`, поэтому гейт обязан проверять наличие ФУНКЦИИ, а не только `window`.
  const getMedia: NonNullable<UseThemeOptions['media']> =
    options.media ??
    ((query: string) =>
      isClient() && typeof window.matchMedia === 'function'
        ? window.matchMedia(query)
        : { matches: false })

  // Предпочтение по умолчанию (P-D49): `'system'` — следовать за ОС. Пустая/пробельная строка
  // (Nuxt-коерс незаданной опции runtimeConfig в '') = «не задано» = та же системная ветка (P3.7).
  const defaultPreference = asThemeName(options.default) ?? SYSTEM_PREFERENCE

  if (explicitThemes?.includes(SYSTEM_PREFERENCE)) {
    console.warn(
      `[themeon] useTheme: "${SYSTEM_PREFERENCE}" is a reserved preference meaning "follow the OS", ` +
        `not a theme name — remove it from \`themes\`, or the persisted preference becomes ambiguous.`,
    )
  }

  // ПРЕДПОЧТЕНИЕ (намерение пользователя) и ТЕМА (резолв) — два разных состояния (P-D49, канон
  // VueUse `store`/`state`, research R-13 §2.1). Персистится ТОЛЬКО предпочтение: сохранив вместо
  // него резолвнутую системную тему, мы бы навсегда отписали пользователя от `prefers-color-scheme`.
  const preference = ref<string>(defaultPreference)
  const system = ref<'dark' | 'light'>('light')
  // SSR-нейтральная тема: на сервере `system` всегда 'light' (читать `matchMedia` там нечем),
  // поэтому серверная и клиентская первая отрисовка совпадают (инвариант №2) — фактический
  // резолв случится в `init()` на клиенте.
  const theme = ref<string>(resolvePreference(defaultPreference))
  let lastRuntimeVarNames: string[] = []
  let initialized = false

  const isDark = computed(() => theme.value === systemMap.dark)

  /** Предпочтение → тема: `'system'` резолвится по текущему `system`, имя темы — само собой. */
  function resolvePreference(pref: string): string {
    return pref === SYSTEM_PREFERENCE ? systemMap[system.value] : pref
  }

  function applyOne(name: string): void {
    const el = getTarget()
    // Нет DOM (SSR/node-тест) — тихий no-op: состояние уже обновлено в `apply()`, писать некуда.
    if (!el) return
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

  /**
   * Применяет ПРЕДПОЧТЕНИЕ: обновляет `preference`, резолвит его в тему и пишет её в DOM.
   * Хранилище НЕ трогает — персист происходит только в `set()` (явный выбор пользователя).
   */
  function apply(pref: string): void {
    preference.value = pref
    const resolved = resolvePreference(pref)
    theme.value = resolved
    withoutTransition(disableTransition, () => applyOne(resolved))
  }

  function set(pref: string): void {
    if (asThemeName(pref) === undefined) {
      console.warn(
        `[themeon] useTheme: set() ignored an empty preference (${JSON.stringify(pref)}); ` +
          `an empty or whitespace-only string is not a theme. Pass a theme name or ` +
          `"${SYSTEM_PREFERENCE}" to follow the OS preference.`,
      )
      return
    }
    if (pref !== SYSTEM_PREFERENCE && explicitThemes && !explicitThemes.includes(pref)) {
      console.warn(
        `[themeon] useTheme: unknown theme "${pref}"; known themes: ${explicitThemes.join(', ')}` +
          ` (or "${SYSTEM_PREFERENCE}" to follow the OS preference)`,
      )
    }
    // `set()` — ЕДИНСТВЕННЫЙ путь, которым что-либо попадает в хранилище: персист означает
    // «пользователь выбрал ЭТО явно» (P-D49). Персистится намерение (`'system'` — тоже намерение),
    // а не резолвнутая тема, иначе возврат к «как в системе» становится невозможен.
    apply(pref)
    if (storageKey !== null) {
      try {
        getStorage()?.setItem(storageKey, pref)
      } catch {
        // localStorage недоступен (private mode/quota) — не роняем смену темы
      }
    }
  }

  function toggle(a?: string, b?: string): void {
    const first = a ?? cycleThemes[0] ?? 'light'
    const second = b ?? cycleThemes[1] ?? first
    // Циклим по РЕЗОЛВНУТОЙ теме (то, что пользователь видит), а не по предпочтению: при
    // `preference==='system'` и тёмной ОС тумблер обязан увести в светлую, а не в `cycleThemes[1]`.
    set(theme.value === first ? second : first)
  }

  function init(): void {
    if (initialized) return

    let stored: string | null = null
    if (storageKey !== null) {
      try {
        // Классифицируем ДО проверки валидности (P3.7): отравленный персист ('', записанный
        // дефектной сборкой) не должен проходить как валидное значение открытого набора.
        // `asThemeName` НЕ переписывает значение — ровно те же правила исполняет анти-FOUC
        // скрипт (P3.8, исполняемый инвариант `parity.test.ts`).
        stored = asThemeName(getStorage()?.getItem(storageKey)) ?? null
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
      // Предпочтение «следовать за системой» — ЖИВОЕ: смена темы ОС при открытой вкладке
      // перекрашивает страницу (P-D49). Явно выбранная тема системную ветку перебивает.
      if (preference.value === SYSTEM_PREFERENCE) apply(SYSTEM_PREFERENCE)
    })

    // Персист валиден, если это `'system'` (намерение следовать за ОС) либо известная тема.
    // `themes` не задан явно (open set — например, только `runtimeVars`) — доверяем персисту
    // любое непустое имя; задан — только имя из набора (симметрично с `set()`, см. HIGH P3.1).
    const storedIsUsable =
      stored !== null &&
      (stored === SYSTEM_PREFERENCE || (explicitThemes ? explicitThemes.includes(stored) : true))

    // `init()` НЕ пишет в хранилище (P-D49): персист — след ЯВНОГО выбора (`set()`), а не
    // побочный эффект первого визита. Отравленный/протухший персист не «лечится» перезаписью —
    // оба канала игнорируют его одинаково.
    apply(storedIsUsable ? (stored as string) : defaultPreference)

    // Флаг ТОЛЬКО после успешного прохода: брось что-нибудь выше (сломанный seam, экзотический
    // SecurityError) — и повторный `init()` обязан отработать, а не молча выйти по `if (initialized)`.
    initialized = true
  }

  return {
    preference: readonly(preference),
    theme: readonly(theme),
    system: readonly(system),
    isDark,
    set,
    toggle,
    init,
  }
}
