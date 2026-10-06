/**
 * Consumer contract for typed theme contracts, compiled against the packed tarballs with the
 * strictest consumer settings (exactOptionalPropertyTypes + noUncheckedIndexedAccess).
 * Every `@ts-expect-error` below must stay an error — an unused directive fails `tsc`.
 */
import { defineTheme, defineTokens, resolveTheme, themeVars } from '@themeon/core'
import type { ResolveOptions, Token } from '@themeon/core'
import { useTheme } from '@themeon/vue'

const palette = defineTokens('color', { brand: { 600: 'oklch(0.55 0.13 155)' } })
export const brand: Token<'color'> = palette.brand[600]

export const theme = defineTheme({
  base: { color: { action: palette.brand[600], bg: '#fff' }, space: { 4: '1rem' } },
  themes: { dark: { color: { bg: '#000' } }, sepia: { color: { bg: '#f4ecd8' } } },
  schemes: { base: 'light', sepia: 'light' },
})

export const space4: Token<'dimension'> = theme.sys.space[4]

const resolved = resolveTheme(theme)
export const darkVars = themeVars(resolved, 'dark')
// @ts-expect-error — 'drak' is not a declared theme
themeVars(resolved, 'drak')

defineTheme({
  base: { color: { bg: '#fff' } },
  themes: { dark: {} },
  // @ts-expect-error — schemes keys must be declared themes or 'base'
  schemes: { drak: 'dark' },
})

// exactOptionalPropertyTypes: forwarding a possibly-undefined option is allowed.
export function forward(refLayer: ResolveOptions['refLayer']): ResolveOptions {
  return { refLayer }
}

declare module '@themeon/vue' {
  interface ThemeonRegister {
    theme: 'light' | keyof (typeof theme)['themes']
  }
}

export function switcher(): void {
  const state = useTheme({ themes: ['light', 'dark', 'sepia'] })
  useTheme({ default: 'sepia' })
  useTheme({ default: '' })
  // @ts-expect-error — the initial preference must also belong to the registered names
  useTheme({ default: 'blue' })
  state.set('sepia')
  state.set('system')
  // @ts-expect-error — 'blue' is not a registered theme
  state.set('blue')
}
