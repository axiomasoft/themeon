import type { GlobalThemeOverrides } from 'naive-ui'

export interface ToNativeOptions {
  /** Theme key in resolved.themes to overlay onto the base; omitted → base (:root) values. */
  theme?: string
  /**
   * Light/dark branch selector for the accent/ink override tables. Defaults to
   * `resolved.schemes[opts.theme]`, falling back to `'light'` when unresolved (P8.8).
   */
  appearance?: 'light' | 'dark'
  /**
   * What to do when a colour role resolves to a value `colorjs.io`/seemly cannot parse
   * (`var()`, `color-mix()`, `light-dark()`, relative-color syntax, `currentColor`,
   * `calc()`, …). `'throw'` (default) fails loud with the full list of bad roles;
   * `'skip'` drops the role (Naive keeps its stock value) — same tolerance as a partial
   * theme (D3).
   */
  onInvalidColor?: 'throw' | 'skip'
  /** Extra per-component / peers overrides, deep-merged over the generated `common`. */
  overrides?: GlobalThemeOverrides
}

/** Map of breakpoint name → overrides patch applied when that breakpoint is active. */
export type BreakpointOverrides = Readonly<Record<string, GlobalThemeOverrides>>
