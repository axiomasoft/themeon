# @themeon/naive

> Packed `.d.ts` snapshot for public export map entries. Update with `pnpm api-report:update`.

## Export `.`

<!-- types: ./dist/index.d.ts -->

```dts
import { ResolvedTheme } from "@themeon/core";
import { GlobalThemeOverrides } from "naive-ui";

//#region src/color.d.ts
/**
 * Парсит любой CSS-цвет (hex/rgb/oklch/hsl/…) через colorjs.io и возвращает hex (или hex8 при
 * альфе < 1) — единственный формат, в котором цвета попадают в Naive `common` (инвариант 3,
 * P-D29: не полагаемся на seemly-поддержку oklch). Непарсибельное значение возвращается как
 * есть — адаптер не логирует (нет consola-зависимости), невалидный цвет ловит `themeon check`
 * (P4.5), не рантайм адаптера.
 */
declare function toHex(value: string): string;
interface DeriveInput {
  /** Базовая заливка (solid), hex — источник, от которого деривятся отсутствующие состояния. */
  base: string;
  /** Направление шкалы темы: light → hover темнее base (Radix step 10), dark → светлее. */
  appearance: 'light' | 'dark';
  /** Явная роль `<base>-hover` темы, если задана — побеждает деривацию (Rule 4). */
  hover?: string;
  /** Явная роль `<base>-pressed` темы, если задана — побеждает деривацию (Rule 4). */
  pressed?: string;
  /** Явная роль `<base>-suppl` темы, если задана — побеждает деривацию (Rule 4). */
  suppl?: string;
}
/**
 * Деривит hover/pressed/suppl согласованно со шкалой темы (P8.9, findings/
 * P8-naive-color-canon.md §3.3, суперседит P-D29 фиксированные ±L-дельты):
 *
 *   hover   = явная роль темы, иначе `base + Δ(appearance)` (Δ = `STEP10_DELTA`, шаг 9→10 шкалы)
 *   pressed = явная роль темы, иначе — при явном hover: экстраполяция вектора `base→hover`
 *             (k=2); иначе `base + 2·Δ(appearance)`
 *   suppl   = явная роль темы, иначе `base` (identity — наш solid уже живёт в наивовской
 *             полосе `*ColorSuppl`, §3.2)
 *
 * Приоритет «явная роль темы > деривация» — Rule 4 (P-D14/P4.2), не переоткрывается здесь.
 */
declare function deriveInteractionStates(i: DeriveInput): {
  hover: string;
  pressed: string;
  suppl: string;
};
//#endregion
//#region src/merge.d.ts
/**
 * Рекурсивный deep-merge слоёв `GlobalThemeOverrides` (P-D30): вложенные объекты (`peers`,
 * per-component-ключи) мёржатся рекурсивно, массивы и примитивы — правый слой побеждает целиком.
 * Не мутирует входы, `undefined`-слои пропускаются. `Object.assign`/spread не годятся — они
 * затирают `peers`/вложенные per-component объекты целиком вместо мёржа (R-14 §1.4).
 */
declare function mergeOverrides(...layers: (GlobalThemeOverrides | undefined)[]): GlobalThemeOverrides;
//#endregion
//#region src/types.d.ts
interface ToNativeOptions {
  /** Theme key in resolved.themes to overlay onto the base; omitted → base (:root) values. */
  theme?: string;
  /**
   * Light/dark branch selector for the accent/ink override tables. Defaults to
   * `resolved.schemes[opts.theme]`, falling back to `'light'` when unresolved (P8.8).
   */
  appearance?: 'light' | 'dark';
  /**
   * What to do when a colour role resolves to a value `colorjs.io`/seemly cannot parse
   * (`var()`, `color-mix()`, `light-dark()`, relative-color syntax, `currentColor`,
   * `calc()`, …). `'throw'` (default) fails loud with the full list of bad roles;
   * `'skip'` drops the role (Naive keeps its stock value) — same tolerance as a partial
   * theme (D3).
   */
  onInvalidColor?: 'throw' | 'skip';
  /** Extra per-component / peers overrides, deep-merged over the generated `common`. */
  overrides?: GlobalThemeOverrides;
}
/** Map of breakpoint name → overrides patch applied when that breakpoint is active. */
type BreakpointOverrides = Readonly<Record<string, GlobalThemeOverrides>>;
//#endregion
//#region src/to-native.d.ts
/**
 * Build Naive UI `GlobalThemeOverrides` from a resolved ThemeOn theme.
 * All colours are emitted as hex/rgba; missing `*Hover/*Pressed/*Suppl` are derived by this
 * adapter (not delegated to Naive/seemly — P-D29). Feed the result straight into
 * `<NConfigProvider :theme-overrides="…">`.
 *
 * Fail-loud (P8.8): a colour role that resolves to a value `colorjs.io`/seemly cannot parse
 * (`var()`, `color-mix()`, `light-dark()`, relative-color syntax, `currentColor`, `calc()`, …)
 * makes `toNative()` throw `ThemeonError('BAD_COLOR')` listing every offending role, unless
 * `opts.onInvalidColor === 'skip'` (then the role is simply omitted — Naive keeps its stock
 * value, same tolerance as a partial theme, D3).
 */
declare function toNative(resolved: ResolvedTheme, opts?: ToNativeOptions): GlobalThemeOverrides;
//#endregion
//#region src/responsive.d.ts
/**
 * Сводит `base` overrides с патчами активных брейкпоинтов, в порядке `activeBreakpoints`
 * (от узкого к широкому — источник списка активных имён внешний, vueuse/JS-экспорт D14, НЕ
 * Naive-медиазапросы). Каждый следующий патч мёржится поверх предыдущего результата, поэтому
 * более широкий (более поздний в массиве) брейкпоинт побеждает при конфликте ключей.
 * Реактивность — забота потребителя (обернуть вызов в `computed()`).
 */
declare function resolveResponsiveOverrides(base: GlobalThemeOverrides, breakpointOverrides: BreakpointOverrides, activeBreakpoints: readonly string[]): GlobalThemeOverrides;
//#endregion
export { type BreakpointOverrides, type DeriveInput, type ToNativeOptions, deriveInteractionStates, mergeOverrides, resolveResponsiveOverrides, toHex, toNative };
```
