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
import { DEFAULT_ATTRIBUTE, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, DEFAULT_STORAGE_KEY } from './defaults'
import { normalizeThemeName } from './theme-name'

export interface ThemeInitScriptOptions {
  /** Ключ localStorage. Default `'themeon-theme'` (тот же, что `useTheme`). */
  storageKey?: string
  /** DOM-атрибут переключения. Default `'data-theme'` (D6). */
  attribute?: string
  /** Имя тёмной темы. Default `'dark'`. */
  darkTheme?: string
  /** Имя светлой темы. Default `'light'`. */
  lightTheme?: string
  /**
   * Тема по умолчанию, если ничего не персистилось (тот же смысл, что `UseThemeOptions.default`
   * в `state.ts`, P3-P3.2-MED): без этой опции скрипт при отсутствии персиста всегда падает на
   * системную тему, а `init()` — на `options.default ?? systemMap[...]`, из-за чего каналы
   * расходятся и первая отрисовка мигает. Если задана — перебивает системную тему на этой ветке
   * ровно как в `init()`, а не подмешивается в системную ветку.
   */
  default?: string
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
 * // "(function(){try{var e=document.documentElement,s=localStorage.getItem('themeon-theme'),t=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');e.setAttribute('data-theme',t)}catch(_){}})()"
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
  const explicitDefault = normalizeThemeName(options.default)
  if (explicitDefault !== undefined) {
    const def = explicitDefault
    assertSafeScriptToken(def, 'default')
    return `(function(){try{var e=document.documentElement,s=localStorage.getItem('${k}'),t=s||'${def}';e.setAttribute('${a}',t)}catch(_){}})()`
  }
  return `(function(){try{var e=document.documentElement,s=localStorage.getItem('${k}'),t=s||(matchMedia('(prefers-color-scheme: dark)').matches?'${d}':'${l}');e.setAttribute('${a}',t)}catch(_){}})()`
}
