import { createHash } from 'node:crypto'
import { expect } from 'vitest'
import { defineTheme, resolveTheme, serializeThemeCss, type ResolvedTheme } from '@themeon/core'

/**
 * Single canonical theme for adapter conformance (P2.6). Every adapter under test must derive
 * observable output from `resolveTheme(conformanceTheme)` — not a parallel fixture graph.
 */
export const conformanceTheme = defineTheme({
  base: {
    color: {
      action: { primary: 'oklch(0.55 0.15 155)' },
      bg: { page: 'oklch(0.99 0.002 260)' },
      text: 'oklch(0.31 0.009 260)',
    },
    space: { md: '16px' },
    breakpoint: { md: '48rem' },
    gradient: { brand: 'linear-gradient(90deg, oklch(0.5 0.1 200), oklch(0.6 0.1 220))' },
  },
  themes: {
    dark: {
      color: {
        action: { primary: 'oklch(0.75 0.15 155)' },
        bg: { page: 'oklch(0.18 0.001 260)' },
      },
    },
  },
})

export function resolvedConformanceContract(): ResolvedTheme {
  return resolveTheme(conformanceTheme)
}

export function canonicalThemeCss(): string {
  return serializeThemeCss(resolvedConformanceContract())
}

export function canonicalThemeCssSha256(): string {
  return createHash('sha256').update(canonicalThemeCss()).digest('hex')
}

/** Asserts adapter-emitted CSS carries the same resolved literals as the compiler contract. */
export function expectCssMatchesContract(adapterCss: string): void {
  const resolved = resolvedConformanceContract()
  for (const tok of resolved.tokens) {
    if (!adapterCss.includes(`${tok.varName}:`)) continue
    expect(adapterCss).toMatch(new RegExp(`${tok.varName}:\\s*${escapeRe(tok.value)}`))
  }
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
