/**
 * `TAILWIND_LAYER_ORDER`/`tailwindLayerPreamble` (P8.15) — @layer-order-statement для
 * потребителей, соседствующих с Tailwind v4 (P-D61/P-D67, findings/P8-css-layers-cli-checks.md
 * §1.2). ЗЕРКАЛО `@themeon/css/src/layers-tailwind.css` — то же перечисление, тот же порядок.
 * Дублируется здесь (не импортируется из `@themeon/css`), потому что `@themeon/tailwind` не
 * тянет `@themeon/css` (zero-dep-дисциплина, P4 инв.8, тот же паттерн, что `THEMEON_LAYERS`
 * ↔ `layers.css` в `@themeon/css/src/contract.ts`); дрейф между копиями ловит анти-дрейф-тест
 * `layers.test.ts`.
 */
export const TAILWIND_LAYER_ORDER = [
  'theme',
  'base',
  'themeon.tokens',
  'themeon.reset',
  'themeon.base',
  'themeon.composition',
  'themeon.blueprints',
  'themeon.components',
  'themeon.utilities',
  'components',
  'utilities',
] as const

/**
 * `@layer`-statement, легальный первой строкой любого CSS-файла до всех `@import` (CSS
 * Cascade 5) — фиксирует старшинство Tailwind `base` (Preflight) < `themeon.*` < Tailwind
 * `components`/`utilities`, разблокируя коллидирующие имена (`--radius-*`/`--font-*`/
 * `--text-*`, D5) без снижения приоритета Tailwind-утилит над компонентами ThemeOn.
 */
export function tailwindLayerPreamble(): string {
  return `@layer ${TAILWIND_LAYER_ORDER.join(', ')};\n`
}
