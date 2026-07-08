/**
 * Легаси-мост v0 (P1.3): rule-based соответствие «канонический путь токена → донорское имя
 * CSS-переменной» (dterema/vintera). Не статичная простыня — набор правил по R-01 §Naming.
 *
 * Нужен на время миграции пилотов (P5): пакет эмитит канонические переменные + алиасы к
 * старым именам, на которые ещё ссылаются донорские стили. После снятия алиасов в P5 весь
 * этот модуль удаляется.
 */

import { kebabSegment } from '../naming'
import type { CssVarName } from '../types'

/**
 * Донорский kebab: дефис на ЛЮБОЙ границе буква↔цифра (обе стороны), из-за чего в доноре
 * '2xl' превращалось в '2-xl' и стили ссылались на '--size-2-xl' (R-01 §3).
 *
 * Живёт ТОЛЬКО здесь — это эмуляция ссылочной формы доноров, а не канон ThemeOn
 * (канон — kebabSegment в naming.ts, где цифра→буква дефиса не даёт). Снос после P5.
 */
function legacySizeSegment(segment: string): string {
  const separated = segment.replace(/[._\s]+/g, '-')
  let out = ''
  for (let i = 0; i < separated.length; i++) {
    const ch = separated[i]!
    const prev = i > 0 ? separated[i - 1]! : ''
    if (prev) {
      const camel = /[a-z0-9]/.test(prev) && /[A-Z]/.test(ch)
      // обе стороны границы буква↔цифра — в этом и был донорский дрейф.
      const letterDigit =
        (/[A-Za-z]/.test(prev) && /[0-9]/.test(ch)) || (/[0-9]/.test(prev) && /[A-Za-z]/.test(ch))
      if (camel || letterDigit) out += '-'
    }
    out += ch
  }
  return out
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Возвращает легаси-имя переменной для канонического пути или null (алиас не нужен).
 *
 * Правила v0 (R-01 §Naming):
 *  - `color.<роль…>` → семантика без префикса 'color-': `['color','bg','page']` → `--bg-page`,
 *    `['color','primary']` → `--primary`;
 *  - `text.<s>` → `--size-<донорский kebab>`: `['text','2xl']` → `--size-2-xl` (донорские стили
 *    ссылаются на `--size-2-xl`; финальная сверка формы — P5 по diff переменных);
 *  - `space.*` / `radius.*` / `z.*` → null: донорское имя (`--spacing-*`/`--radius-*`/`--z-*`)
 *    уже совпадает с каноническим, отдельный алиас не нужен;
 *  - остальные группы → null.
 */
export function legacyV0Alias(path: readonly string[]): CssVarName | null {
  const [group, ...rest] = path
  if (rest.length === 0) return null
  switch (group) {
    case 'color':
      return `--${rest.map(kebabSegment).join('-')}` as CssVarName
    case 'text':
      return `--size-${rest.map(legacySizeSegment).join('-')}` as CssVarName
    default:
      return null
  }
}

/** Функция-правило легаси-моста: путь → имя переменной или null. */
export type AliasRule = (path: readonly string[]) => CssVarName | null

/** Опция алиасов резолвера (P1.4): встроенный пресет 'legacy-v0' или своя функция-правило. */
export type AliasesOption = 'legacy-v0' | AliasRule
