/**
 * Tailwind v4 namespaces that ThemeOn emits AND Tailwind recognises for utility generation.
 * ThemeOn extensions (gradient/z/duration) are intentionally excluded — Tailwind ignores them
 * and including them would only produce dead `@theme inline` declarations (P4.1 Scope Excluded).
 *
 * Единственный источник списка namespace'ов бриджа — второго такого списка или второго
 * naming-движка в пакете быть не должно (инвариант фазы 2, `phases/P4.md`).
 */
export const TAILWIND_NAMESPACES = [
  'color',
  'font-weight',
  'font',
  'text',
  'tracking',
  'leading',
  'breakpoint',
  'spacing',
  'radius',
  'shadow',
  'ease',
] as const
