# @themeon/tailwind

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/index.d.ts -->

```dts
import { ResolvedTheme } from "@themeon/core";

//#region src/bridge.d.ts
interface TailwindBridgeOptions {
  /** 'all' = base tokens ∪ all theme patches (union of names); 'base' = only base. Default 'all'. */
  include?: 'all' | 'base';
  /** Restrict emitted namespaces (subset of TAILWIND_NAMESPACES). Default: all of them. */
  namespaces?: readonly string[];
  /** Emit leading "generated" banner comment. Default true. */
  banner?: boolean;
}
/**
 * Generate a Tailwind v4 `@theme reference` bridge from a resolved ThemeOn theme.
 * Every ThemeOn var whose namespace is Tailwind-recognised gets a literal value (except
 * `shadow-*`, kept as a `var()` reference, and `breakpoint-*`, always literal) — `reference`
 * never emits the variable into `:root, :host`, so runtime `[data-theme]` swaps from
 * `tokens.css` reach the generated utilities via their `var(--x, <literal>)` fallback slot,
 * with no dependency on CSS import order (P-D54, supersedes P-D31).
 */
declare function tailwindBridge(resolved: ResolvedTheme, opts?: TailwindBridgeOptions): string;
//#endregion
//#region src/namespaces.d.ts
/**
 * Tailwind v4 namespaces that ThemeOn emits AND Tailwind recognises for utility generation.
 * ThemeOn extensions (gradient/z/duration) are intentionally excluded — Tailwind ignores them
 * and including them would only produce dead `@theme inline` declarations (P4.1 Scope Excluded).
 *
 * Единственный источник списка namespace'ов бриджа — второго такого списка или второго
 * naming-движка в пакете быть не должно (инвариант фазы 2, `phases/P4.md`).
 */
declare const TAILWIND_NAMESPACES: readonly ["color", "font-weight", "font", "text", "tracking", "leading", "breakpoint", "spacing", "radius", "shadow", "ease"];
//#endregion
//#region src/layers.d.ts
/**
 * `TAILWIND_LAYER_ORDER`/`tailwindLayerPreamble` (P8.15) — @layer-order-statement для
 * потребителей, соседствующих с Tailwind v4 (P-D61/P-D67, findings/P8-css-layers-cli-checks.md
 * §1.2). ЗЕРКАЛО `@themeon/css/src/layers-tailwind.css` — то же перечисление, тот же порядок.
 * Дублируется здесь (не импортируется из `@themeon/css`), потому что `@themeon/tailwind` не
 * тянет `@themeon/css` (zero-dep-дисциплина, P4 инв.8, тот же паттерн, что `THEMEON_LAYERS`
 * ↔ `layers.css` в `@themeon/css/src/contract.ts`); дрейф между копиями ловит анти-дрейф-тест
 * `layers.test.ts`.
 */
declare const TAILWIND_LAYER_ORDER: readonly ["theme", "base", "themeon.tokens", "themeon.reset", "themeon.base", "themeon.composition", "themeon.blueprints", "themeon.components", "themeon.utilities", "components", "utilities"];
/**
 * `@layer`-statement, легальный первой строкой любого CSS-файла до всех `@import` (CSS
 * Cascade 5) — фиксирует старшинство Tailwind `base` (Preflight) < `themeon.*` < Tailwind
 * `components`/`utilities`, разблокируя коллидирующие имена (`--radius-*`/`--font-*`/
 * `--text-*`, D5) без снижения приоритета Tailwind-утилит над компонентами ThemeOn.
 */
declare function tailwindLayerPreamble(): string;
//#endregion
export { TAILWIND_LAYER_ORDER, TAILWIND_NAMESPACES, type TailwindBridgeOptions, tailwindBridge, tailwindLayerPreamble };
```
