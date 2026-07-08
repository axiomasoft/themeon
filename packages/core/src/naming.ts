/**
 * Naming engine (P1.3): единственный трансформер «путь токена → имя CSS-переменной».
 *
 * Здесь живёт ВСЯ логика превращения пути `['color','forest','600']` в `--color-forest-600`.
 * Второй реализации kebab/namespace-маппинга в пакете быть не должно (класс багов R-01 §1–2:
 * дубль `kebab()` в runtime и codegen разошёлся, `size2xl` дал `--size2xl` вместо `--size-2xl`,
 * заголовки молча жили на CSS-fallback'ах). Резолвер (P1.4) и адаптеры (P4) зовут ровно эти
 * функции — сами ничего не именуют (P-D14: naming применяется один раз).
 */

import type { CssVarName, CssVarRef, Token } from './types'

/** Опции именования переменных. */
export interface NamingOptions {
  /** Префикс после '--': prefix 'to' → '--to-color-primary'. Деф. ''. */
  prefix?: string
}

/**
 * Namespace-таблица: группа модели ThemeOn → CSS-namespace (канон Tailwind v4 + расширения).
 * Данные, не if-каскад — единственный источник соответствия. Проверено по
 * https://tailwindcss.com/docs/theme (namespaces `--color-*`/`--spacing-*`/`--text-*`/
 * `--font-weight-*`/`--tracking-*`/`--leading-*`/`--radius-*`/`--shadow-*`/`--ease-*`/
 * `--breakpoint-*`, 2026-07-08). `gradient`/`z`/`duration` — расширения ThemeOn (в Tailwind
 * отдельного namespace нет).
 */
export const NAMESPACE_TABLE: Readonly<Record<string, string>> = {
  color: 'color',
  space: 'spacing',
  radius: 'radius',
  text: 'text',
  font: 'font',
  fontWeight: 'font-weight',
  tracking: 'tracking',
  leading: 'leading',
  shadow: 'shadow',
  gradient: 'gradient', // расширение ThemeOn
  z: 'z', // расширение ThemeOn
  ease: 'ease',
  duration: 'duration', // расширение ThemeOn
  breakpoint: 'breakpoint',
}

/**
 * Канонический сегмент-трансформер. Правила (Code Guidance P1.3):
 *  1. camelCase → kebab: 'bgBase' → 'bg-base' (граница строчная/цифра → Прописная);
 *  2. буква→цифра — дефис ('size2xl' → 'size-2xl'); цифра→буква — БЕЗ дефиса ('2xl' → '2xl');
 *  3. разделители '.', '_', пробел → '-' ('1.5' → '1-5', дробные spacing-шаги);
 *  4. результат — lowercase; повторные дефисы схлопнуть; ведущие/хвостовые убрать.
 *
 * Форма '2xl' (цифра→буква без дефиса) — прямой канон Tailwind (`--text-2xl`,
 * `--breakpoint-2xl`), а не донорский баг '2-xl' (R-01 §2–3). Донорская форма живёт
 * изолированно в aliases/legacy-v0.ts.
 */
export function kebabSegment(segment: string): string {
  // шаг 3 (разделители) выполняем первым — дальше в цикле границы считаются по чистой строке.
  const separated = segment.replace(/[._\s]+/g, '-')
  let out = ''
  for (let i = 0; i < separated.length; i++) {
    const ch = separated[i]!
    const prev = i > 0 ? separated[i - 1]! : ''
    if (prev) {
      // camelCase: строчная/цифра, за которой Прописная.
      const camel = /[a-z0-9]/.test(prev) && /[A-Z]/.test(ch)
      // буква→цифра (только это направление; цифра→буква дефиса не даёт — канон Tailwind).
      const letterToDigit = /[A-Za-z]/.test(prev) && /[0-9]/.test(ch)
      if (camel || letterToDigit) out += '-'
    }
    out += ch
  }
  return out
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** CSS-namespace группы: из таблицы, иначе — kebab самой группы (произвольные группы разрешены). */
function namespaceFor(group: string): string {
  // Object.hasOwn (не индексация) — группа с именем прототип-члена (`toString`) не должна
  // случайно резолвиться на функцию из Object.prototype.
  return Object.hasOwn(NAMESPACE_TABLE, group) ? NAMESPACE_TABLE[group]! : kebabSegment(group)
}

/**
 * Builds the CSS custom-property name for a token path.
 *
 * The first segment is the group name (mapped through {@link NAMESPACE_TABLE}); the rest are
 * kebab-cased and joined. For a `text` composite token this returns the base (font-size) name;
 * use {@link formatTextVarNames} to also get the double-dash line-height companion.
 *
 * @param path full token path `[group, ...keys]`
 * @param opts optional prefix
 */
export function formatVarName(path: readonly string[], opts: NamingOptions = {}): CssVarName {
  const [group = '', ...rest] = path
  const namespace = namespaceFor(group)
  const segments = rest.map(kebabSegment).filter((s) => s.length > 0)
  const prefix = opts.prefix ? `${kebabSegment(opts.prefix)}-` : ''
  const name = `--${prefix}${[namespace, ...segments].join('-')}`
  return name as CssVarName
}

/**
 * Builds both variable names for a composite `text` token: the base font-size name and its
 * `--…--line-height` companion (Tailwind double-dash convention, R-11 §3 — without it the
 * Tailwind bridge in P4 loses leading).
 *
 * @param path full token path `['text', <size>]`
 * @param opts optional prefix
 */
export function formatTextVarNames(
  path: readonly string[],
  opts: NamingOptions = {},
): { size: CssVarName; lineHeight: CssVarName } {
  const size = formatVarName(path, opts)
  return { size, lineHeight: `${size}--line-height` as CssVarName }
}

/**
 * Returns a typed `var(--…)` reference for a token — for use in component CSS (P2) and adapters
 * (P4). References the token's base (size) name.
 *
 * @param token the token to reference
 * @param opts optional prefix (must match the prefix used when the theme was resolved)
 */
export function cssVar(token: Token, opts: NamingOptions = {}): CssVarRef {
  return `var(${formatVarName(token.path, opts)})` as CssVarRef
}
