/**
 * Runtime applier (P1.6): runtime-выход №2 транспорта D4 — смена темы / tenant-патч без
 * ребилда. `themeVars` достаёт готовый словарь из `ResolvedTheme` (P1.4), `applyTheme`
 * пишет его inline через `setProperty`, `clearTheme` снимает переменные через
 * `removeProperty` (канонический reset до каскада/initial-value — R-11 §5).
 *
 * Имена переменных берутся ТОЛЬКО из `ResolvedTheme` — модуль ничего не именует сам
 * (паритет build/runtime по построению, P-D14). `CSS.registerProperty` НЕ используется:
 * регистрация типов живёт в статическом `@property` из P1.5, а JS-регистрация побеждает
 * CSS и создаёт второй источник истины (R-11 §5). Модуль SSR-нейтрален: DOM трогается
 * только при вызове, импортировать его на сервере безопасно.
 */

import { ThemeonError } from './errors'
import type { ResolvedTheme } from './types'

/**
 * Structural minimum of a DOM element the applier writes to. A real `HTMLElement`
 * satisfies it automatically, so tests can pass a plain fake without jsdom/happy-dom.
 */
export interface ElementLike {
  style: {
    setProperty(name: string, value: string): void
    removeProperty(name: string): string
  }
}

/**
 * Dev-guard: считаем окружение «не production», если `process.env.NODE_ENV` не равен
 * `'production'`. Читаем структурно, без импорта node-типов, чтобы модуль оставался
 * SSR-нейтральным и не тянул зависимостей (L0).
 */
function isDev(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env
  return env?.NODE_ENV !== 'production'
}

/**
 * Собирает alias-пары, чья цель попала в набор патченных переменных, — как в блоке темы
 * сериализатора (P1.5): под subtree-scoped `[data-theme]` легаси-алиас обязан ссылаться на
 * переобъявленную цель. Для темы `themeVars` возвращает и эти пары.
 */
function patchedAliasEntries(
  resolved: ResolvedTheme,
  patchedVarNames: ReadonlySet<string>,
): [string, string][] {
  const out: [string, string][] = []
  for (const { alias, target } of resolved.aliases) {
    if (patchedVarNames.has(target)) out.push([alias, `var(${target})`])
  }
  return out
}

/**
 * Returns the variable dictionary to apply. Without `theme` it is the base dictionary
 * (`resolved.vars`, alias pairs included). With `theme` it is only that theme's patched
 * variables plus the alias pairs whose target is patched (mirrors the serializer's
 * `[data-theme]` block). The returned object is a fresh copy safe to mutate.
 *
 * @throws {ThemeonError} `UNKNOWN_PATH` if `theme` is not present in `resolved`.
 */
export function themeVars(resolved: ResolvedTheme, theme?: string): Record<string, string> {
  if (theme === undefined) return { ...resolved.vars }

  if (!Object.hasOwn(resolved.themes, theme)) {
    const known = Object.keys(resolved.themes)
    throw new ThemeonError(
      'UNKNOWN_PATH',
      `Unknown theme "${theme}"; known themes: ${known.length > 0 ? known.join(', ') : '(none)'}`,
    )
  }
  // Object.hasOwn выше гарантирует наличие ключа; index signature TS не сужает через hasOwn.
  const patch = resolved.themes[theme]!

  const out: Record<string, string> = {}
  for (const token of patch) out[token.varName] = token.value
  const patchedVarNames = new Set(patch.map((t) => t.varName))
  for (const [alias, value] of patchedAliasEntries(resolved, patchedVarNames)) out[alias] = value
  return out
}

/**
 * Validates one `--var: value` pair for the applier. Dev-only diagnostic: a registered
 * custom property silently falls back to its `initial-value` on an invalid `setProperty`
 * (R-11 §5), so we warn the developer instead of letting the swap fail invisibly. Returns
 * nothing — a violation is reported via `console.warn`, never thrown (runtime path).
 */
function warnIfInvalid(name: string, value: string): void {
  if (!name.startsWith('--')) {
    console.warn(`[themeon] applyTheme: custom property name must start with "--", got "${name}"`)
  }
  if (value === '' || /[;}]/.test(value)) {
    console.warn(
      `[themeon] applyTheme: value for "${name}" must be a non-empty string without ";" or "}", got ${JSON.stringify(value)}`,
    )
  }
}

/**
 * Writes the variables inline on `el` via `setProperty`, in key order. In development it
 * validates each pair before writing (see R-11 §5) and warns on violations, but always
 * writes every pair — the warning is diagnostic, not a gate.
 *
 * Known limitation: inline styles lose to `!important` in consumer CSS. Paired with
 * ThemeOn's `@layer` scaffold `!important` is unnecessary (D8, R-11 §5).
 */
export function applyTheme(el: ElementLike, vars: Record<string, string>): void {
  const dev = isDev()
  for (const [name, value] of Object.entries(vars)) {
    if (dev) warnIfInvalid(name, value)
    el.style.setProperty(name, value)
  }
}

/**
 * Removes custom properties from `el` (`removeProperty` = the canonical reset to the
 * cascade / `initial-value`, R-11 §5). Pass an explicit list of names, or a `ResolvedTheme`
 * to remove every name it produced — base tokens, all theme patches and all aliases.
 */
export function clearTheme(el: ElementLike, names: readonly string[]): void
export function clearTheme(el: ElementLike, resolved: ResolvedTheme): void
export function clearTheme(el: ElementLike, arg: readonly string[] | ResolvedTheme): void {
  const names = Array.isArray(arg) ? arg : allVarNames(arg as ResolvedTheme)
  for (const name of names) el.style.removeProperty(name)
}

/**
 * Все имена переменных `ResolvedTheme` в детерминированном порядке (база → алиасы → патчи
 * тем), без повторов: то, что `clearTheme(el, resolved)` обязан снять целиком.
 */
function allVarNames(resolved: ResolvedTheme): string[] {
  const seen = new Set<string>()
  const push = (name: string): void => {
    seen.add(name)
  }
  for (const token of resolved.tokens) push(token.varName)
  for (const { alias } of resolved.aliases) push(alias)
  for (const tokens of Object.values(resolved.themes)) {
    for (const token of tokens) push(token.varName)
  }
  return [...seen]
}
