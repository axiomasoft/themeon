import type { GlobalThemeOverrides } from 'naive-ui'

export interface ToNativeOptions {
  /** Theme key in resolved.themes to overlay onto the base; omitted → base (:root) values. */
  theme?: string
  /** Extra per-component / peers overrides, deep-merged over the generated `common`. */
  overrides?: GlobalThemeOverrides
}

/** Map of breakpoint name → overrides patch applied when that breakpoint is active. */
export type BreakpointOverrides = Readonly<Record<string, GlobalThemeOverrides>>
