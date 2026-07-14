/**
 * `themeInitScript` (P3.2) — единый генератор анти-FOUC IIFE (D6): реализация вместо
 * рукописных строк-констант, скопипасченных в dterema/vintera/octoclick (донор
 * `theme-fouc.ts`, `00_MASTER_PLAN.md` §4.5). Nuxt (P3.4) и Vite (P3.5) переиспользуют эту
 * ЖЕ строку — pure-модуль, НИ ОДНОГО импорта из `vue`/`@themeon/core` (P-D24): подпуть
 * `@themeon/vue/anti-fouc` обязан быть импортируемым без vue в графе зависимостей.
 *
 * Скрипт читает `localStorage[storageKey]`, иначе `matchMedia('(prefers-color-scheme: dark)')`
 * → тёмное/светлое имя темы, выставляет `document.documentElement.setAttribute(attribute, t)`.
 * `color-scheme` не трогает — его выставляет `[data-theme]`-блок `tokens.css` (P1.5
 * `emitColorScheme`, дефолт `true`). Всё в `try/catch{}` — `localStorage` может кинуть
 * (Safari private mode/cookies-blocked Chrome).
 */
import {
  DEFAULT_ATTRIBUTE,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  DEFAULT_STORAGE_KEY,
  SYSTEM_PREFERENCE,
} from './defaults'
import { asThemeName } from './theme-name'

export interface ThemeInitScriptOptions {
  /** `localStorage` key. Default `'themeon-theme'` — must match `useTheme()`. */
  storageKey?: string
  /** DOM attribute driving the switch. Default `'data-theme'` (D6) — must match `useTheme()`. */
  attribute?: string
  /** Theme name used when the OS prefers dark. Default `'dark'`. */
  darkTheme?: string
  /** Theme name used when the OS prefers light. Default `'light'`. */
  lightTheme?: string
  /**
   * Preference used when nothing is persisted — a theme name, or `'system'` to follow the OS.
   * Default `'system'`. Empty/whitespace-only means "not set" (P3.7). Same meaning as
   * `UseThemeOptions.default`: both channels must resolve it identically or the first paint flashes.
   */
  default?: string
  /**
   * Known theme names — same meaning as `UseThemeOptions.themes`. When set, a persisted theme
   * outside the set is rejected and the fallback applies, exactly like `init()`. When unset the set
   * is open and any non-blank persisted name is trusted — also exactly like `init()`. Both channels
   * must validate persistence by the SAME rules, otherwise a stale theme name (`'sepia'` after it
   * was removed) gets painted by the script and repainted by `init()` — a visible flash.
   */
  themes?: readonly string[]
}

/**
 * CSS/script-инъекция guard (P3.2 Implementation Rule 2; урок final-audit H3 — theme-name
 * канал на пути к tenant-вводу P6): значение, подставляемое в сгенерированную строку, не
 * должно содержать кавычек/угловых скобок/бэкслеша/переводов строки — иначе можно вырваться
 * из строкового литерала JS или закрыть `<script>` изнутри `innerHTML`.
 */
function assertSafeScriptToken(value: string, label: string): void {
  if (/['"`<>\\\n\r]/.test(value)) {
    throw new Error(
      `[themeon] themeInitScript: ${label} must not contain quotes, angle brackets, backslash or newlines: ${JSON.stringify(value)}`,
    )
  }
}

/**
 * Генерирует тело анти-FOUC IIFE (без `<script>`-тегов — обёртку ставит потребитель:
 * `app.head.script` в Nuxt P3.4, `transformIndexHtml` в Vite P3.5). Детерминирован (снапшот-
 * тест) — одна минифицированная строка, без лишних пробелов.
 *
 * @example
 * ```ts
 * themeInitScript()
 * // "(function(){try{var e=document.documentElement,r=localStorage.getItem('themeon-theme')||'',s=r.trim()?r:'',p=s?s:'system',t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;e.setAttribute('data-theme',t)}catch(_){}})()"
 * ```
 */
export function themeInitScript(options: ThemeInitScriptOptions = {}): string {
  const k = options.storageKey ?? DEFAULT_STORAGE_KEY
  const a = options.attribute ?? DEFAULT_ATTRIBUTE
  const d = options.darkTheme ?? DEFAULT_DARK_THEME
  const l = options.lightTheme ?? DEFAULT_LIGHT_THEME
  assertSafeScriptToken(k, 'storageKey')
  assertSafeScriptToken(a, 'attribute')
  assertSafeScriptToken(d, 'darkTheme')
  assertSafeScriptToken(l, 'lightTheme')

  // Дефолтное ПРЕДПОЧТЕНИЕ — ровно как в `state.ts`: `asThemeName(default) ?? 'system'` (P-D49).
  const defaultPreference = asThemeName(options.default) ?? SYSTEM_PREFERENCE
  assertSafeScriptToken(defaultPreference, 'default')

  // Чтение персиста — ТЕ ЖЕ правила, что у `asThemeName`/`init()` (P3.8, исполняемый инвариант
  // `parity.test.ts`): пустое/пробельное значение не считается заданным, но значение НЕ
  // переписывается — `.trim()` здесь работает исключительно как предикат пустоты (`r.trim()?r:''`),
  // а в сравнение и в DOM уходит СЫРОЕ `r`. Обрезать его (как делал P3.7-фикс) значит завести
  // второй, невидимый источник истины: скрипт красил бы `'dark'`, а `init()` — `' dark'`.
  //
  // Закрытый набор определяется тем, ЗАДАН ли `themes` (а не тем, остались ли в нём валидные
  // имена): `themes: []` для `init()` — набор, в котором нет ничего валидного, значит и скрипт
  // обязан отвергать любой персист, а не проваливаться в открытый набор (fail-open).
  // `'system'` — валидное ПРЕДПОЧТЕНИЕ при любом наборе тем (это не имя темы).
  let storedCheckExpr: string
  if (options.themes !== undefined) {
    const known = options.themes.filter((t) => asThemeName(t) !== undefined)
    for (const t of known) assertSafeScriptToken(t, 'themes')
    // `s&&` — страховка от `themes: ['']`: пустое значение не должно проходить проверку набора
    storedCheckExpr = `s&&(s==='${SYSTEM_PREFERENCE}'||[${known.map((t) => `'${t}'`).join(',')}].indexOf(s)!==-1)`
  } else {
    storedCheckExpr = 's'
  }

  // Резолв предпочтения в тему — ровно `resolvePreference()` из `state.ts`.
  const resolve = `p==='${SYSTEM_PREFERENCE}'?(matchMedia('(prefers-color-scheme: dark)').matches?'${d}':'${l}'):p`

  return `(function(){try{var e=document.documentElement,r=localStorage.getItem('${k}')||'',s=r.trim()?r:'',p=${storedCheckExpr}?s:'${defaultPreference}',t=${resolve};e.setAttribute('${a}',t)}catch(_){}})()`
}
